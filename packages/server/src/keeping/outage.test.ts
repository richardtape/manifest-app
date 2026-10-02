import { describe, expect, it } from 'vitest'
import type { HistoryEntry } from '../store/keeping.js'
import {
  answerOf,
  observe,
  outageFrom,
  type Answer,
  type Change,
  type Outage,
} from './outage.js'

/**
 * F6 TASK 6: THE LIVE-ADDRESS WATCH'S STATE MACHINE (Decision 8, design §4), pure. What one probe's
 * answer is (S1: M3, M6), and what a run of them means: down after two misses in a row, answering
 * again after three answers in a row, a fall within 30 minutes of a recovery the same outage again,
 * and switched off never down.
 */
const P = '11111111-1111-4111-8111-111111111111'
const T0 = Date.UTC(2026, 9, 1, 17, 0)
/** The probe's minute n, from 10:00am Vancouver's. */
const at = (n: number) => new Date(T0 + n * 60_000).toISOString()
const ANSWERING: Outage = { state: 'answering', recovered: null }

describe('answerOf (S1: an answer counts only when routed)', () => {
  it.each([
    [200, true, 'answer'],
    [302, true, 'answer'],
    [404, true, 'answer'],
    [500, true, 'answer'],
    [200, false, 'miss'],
    [302, false, 'miss'],
    [410, true, 'off'],
    [410, false, 'off'],
    [502, true, 'miss'],
    [503, false, 'miss'],
    [504, true, 'miss'],
    [null, false, 'miss'],
  ] as const)('%s, routed %s, is %s', (status, routed, answer) => {
    expect(answerOf(status, routed)).toBe(answer)
  })
})

/** Each answer in turn, a minute apart from minute 0: every change, and the outage at the end. */
function run(answers: Answer[], from: Outage = ANSWERING, start = 0) {
  let outage = from
  const changes: Change[] = []
  answers.forEach((answer, i) => {
    const next = observe(outage, answer, at(start + i))
    outage = next.outage
    if (next.change !== null) changes.push(next.change)
  })
  return { outage, changes }
}

describe('observe (Decision 8)', () => {
  it('answer, miss, answer: never down', () => {
    const { outage, changes } = run(['answer', 'miss', 'answer'])
    expect(changes).toEqual([])
    expect(outage.state).toBe('answering')
  })

  it('miss, miss: fell, from the first miss', () => {
    const { outage, changes } = run(['answer', 'miss', 'miss'])
    expect(changes).toEqual([{ kind: 'fell', from: at(1), again: false }])
    expect(outage).toMatchObject({ state: 'down', from: at(1) })
  })

  it('down, then two answers: still down; the third in a row: recovered, from the fall to the first answer', () => {
    const fell = run(['miss', 'miss', 'answer', 'answer'])
    expect(fell.changes).toEqual([{ kind: 'fell', from: at(0), again: false }])
    expect(fell.outage.state).toBe('down')
    const { outage, changes } = run(['answer'], fell.outage, 4)
    expect(changes).toEqual([{ kind: 'recovered', from: at(0), to: at(2), again: false }])
    expect(outage).toEqual({
      state: 'answering',
      recovered: { from: at(0), to: at(2) },
    })
  })

  it('a miss between answers starts the count again, and the recovery is from the next run of three', () => {
    const { changes } = run([
      'miss',
      'miss',
      'answer',
      'answer',
      'miss',
      'answer',
      'answer',
    ])
    expect(changes).toEqual([{ kind: 'fell', from: at(0), again: false }])
    const after = run([
      'miss',
      'miss',
      'answer',
      'answer',
      'miss',
      'answer',
      'answer',
      'answer',
    ])
    expect(after.changes.at(-1)).toEqual({
      kind: 'recovered',
      from: at(0),
      to: at(5),
      again: false,
    })
  })

  it('down, and more misses: nothing more', () => {
    const { changes } = run(['miss', 'miss', 'miss', 'miss', 'miss'])
    expect(changes).toHaveLength(1)
  })

  it('a fall 10 minutes after a recovery is the same outage again (Review Focus 3), and so is its recovery', () => {
    const recovered: Outage = {
      state: 'answering',
      recovered: { from: at(0), to: at(5) },
    }
    const { changes } = run(['miss', 'miss', 'answer', 'answer', 'answer'], recovered, 15)
    expect(changes).toEqual([
      { kind: 'fell', from: at(15), again: true },
      { kind: 'recovered', from: at(15), to: at(17), again: true },
    ])
  })

  it('a fall 40 minutes after a recovery is a new one', () => {
    const recovered: Outage = {
      state: 'answering',
      recovered: { from: at(0), to: at(5) },
    }
    const { changes } = run(['miss', 'miss'], recovered, 45)
    expect(changes).toEqual([{ kind: 'fell', from: at(45), again: false }])
  })

  it.each<[string, Outage]>([
    ['answering', ANSWERING],
    ['missed', { state: 'missed', at: at(0), recovered: null }],
    ['down', { state: 'down', from: at(0), answers: 2, answered: at(1), again: false }],
    ['off', { state: 'off' }],
  ])('switched off (410) from %s is off, never a change', (_name, from) => {
    expect(observe(from, 'off', at(9))).toEqual({
      outage: { state: 'off' },
      change: null,
    })
  })

  it('after off, misses stay off (switched back on, not yet started), and an answer is answering with no change', () => {
    const { outage, changes } = run(['miss', 'miss', 'miss', 'answer'], { state: 'off' })
    expect(changes).toEqual([])
    expect(outage).toEqual({ state: 'answering', recovered: null })
  })
})

let counter = 0
const entry = (type: string, detail: unknown, when: string): HistoryEntry => ({
  id: `h${++counter}`,
  projectId: P,
  at: when,
  type,
  detail,
})

describe('outageFrom (Decision 8, Review Focus 1: an open outage survives a restart)', () => {
  it('nothing held: answering, with no recovery', () => {
    expect(outageFrom([])).toEqual(ANSWERING)
    expect(outageFrom([entry('build.started', {}, at(0))])).toEqual(ANSWERING)
  })

  it('an unreachable row with no answering after it: down from its from', () => {
    const outage = outageFrom([
      entry('instance.healthy', { environment: 'production' }, at(0)),
      entry('keeping.unreachable', { from: at(3) }, at(3)),
      entry('build.started', {}, at(4)),
    ])
    expect(outage).toEqual({
      state: 'down',
      from: at(3),
      answers: 0,
      answered: null,
      again: false,
    })
  })

  it('a fall told to nobody (again) is still again after a restart', () => {
    const outage = outageFrom([
      entry('keeping.unreachable', { from: at(3), again: true }, at(3)),
    ])
    expect(outage).toMatchObject({ state: 'down', again: true })
  })

  it('with an answering row after it: answering, with that recovery', () => {
    expect(
      outageFrom([
        entry('keeping.unreachable', { from: at(3) }, at(3)),
        entry('keeping.answering', { from: at(3), to: at(7) }, at(7)),
      ]),
    ).toEqual({ state: 'answering', recovered: { from: at(3), to: at(7) } })
  })

  it('switched off after it: off, and a restore does not end that (it starts for its students first)', () => {
    expect(
      outageFrom([
        entry('keeping.unreachable', { from: at(3) }, at(3)),
        entry('project.archived', {}, at(10)),
        entry('project.restored', {}, at(20)),
      ]),
    ).toEqual({ state: 'off' })
  })

  it('a row missing its times is no outage', () => {
    expect(outageFrom([entry('keeping.unreachable', {}, at(3))])).toEqual(ANSWERING)
  })
})
