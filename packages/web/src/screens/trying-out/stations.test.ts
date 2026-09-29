import type { Schemas } from '@manifest/contract'
import { describe, expect, it } from 'vitest'
import { newestAttempt, stationsOf, versionAsked } from './stations.js'

/**
 * THE FOUR STATIONS (walk-through moment 9, `Timeline`), each ticking on the new instance's own
 * state, never a timer; and which instance is the new one (F4 S1: M3).
 */
type State = Schemas['Instance']['state']
const summary = (
  id: string,
  state: State,
  serving = false,
): Schemas['InstanceSummary'] => ({
  id,
  environmentId: 'staging',
  releaseId: 'r-1',
  kind: 'web',
  state,
  lastSeenAt: null,
  serving,
})
const states = (instance: { state: State } | null) =>
  stationsOf(instance).map((s) => `${s.key}:${s.state}`)

describe('stationsOf: where the new instance is, as four stations', () => {
  it.each<[State | null, string[]]>([
    [null, ['turn:now', 'room:next', 'starting:next', 'answering:next']],
    ['pending', ['turn:now', 'room:next', 'starting:next', 'answering:next']],
    ['building', ['turn:done', 'room:now', 'starting:next', 'answering:next']],
    ['provisioning', ['turn:done', 'room:now', 'starting:next', 'answering:next']],
    ['starting', ['turn:done', 'room:done', 'starting:now', 'answering:next']],
    ['waking', ['turn:done', 'room:done', 'starting:now', 'answering:next']],
    ['healthy', ['turn:done', 'room:done', 'starting:done', 'answering:done']],
    ['failed', ['turn:done', 'room:done', 'starting:done', 'answering:halted']],
    // Asleep after it answered; replaced before it ever did.
    ['hibernated', ['turn:done', 'room:done', 'starting:done', 'answering:done']],
    ['destroying', ['turn:done', 'room:done', 'starting:done', 'answering:halted']],
    ['gone', ['turn:done', 'room:done', 'starting:done', 'answering:halted']],
  ])('%s', (state, expected) => {
    expect(states(state === null ? null : { state })).toEqual(expected)
  })

  it('only one station is ever now, and a failure halts the last, with no rail after it', () => {
    for (const state of [
      'pending',
      'building',
      'provisioning',
      'starting',
      'waking',
    ] as State[])
      expect(stationsOf({ state }).filter((s) => s.state === 'now')).toHaveLength(1)
    expect(stationsOf({ state: 'failed' }).at(-1)).toEqual({
      key: 'answering',
      state: 'halted',
    })
  })
})

describe('newestAttempt: the instance whose id was not listed at the press (S1: M3)', () => {
  const OLD = summary('i-old', 'healthy', true)
  const EARLIER_FAILURE = summary('i-failed', 'failed')
  const listed = new Set([OLD.id, EARLIER_FAILURE.id])

  it('none new yet: null, though the one serving is first and healthy', () => {
    expect(newestAttempt([OLD, EARLIER_FAILURE], listed)).toBeNull()
  })

  it('the new one listed SECOND while it starts ("seen most recently" first) is still found', () => {
    const rising = summary('i-new', 'starting')
    expect(newestAttempt([OLD, rising, EARLIER_FAILURE], listed)).toBe(rising)
  })

  it('and listed first once it serves', () => {
    const serving = summary('i-new', 'healthy', true)
    expect(
      newestAttempt([serving, { ...OLD, serving: false }, EARLIER_FAILURE], listed),
    ).toBe(serving)
  })

  it('an earlier failure, listed first, is never taken for the new one', () => {
    expect(newestAttempt([EARLIER_FAILURE, OLD], listed)).toBeNull()
  })

  it('with nothing listed at the press, the first instance listed is the new one', () => {
    const rising = summary('i-new', 'provisioning')
    expect(newestAttempt([rising], new Set())).toBe(rising)
  })
})

describe('versionAsked: the version the question names (walk-through)', () => {
  const TZ = 'America/Vancouver'
  // 28 September, 10pm in Vancouver; 29 September in UTC.
  const NOW = new Date('2026-09-29T05:00:00.000Z')

  it('made today, in their own time zone: "the version from today, 3:12pm"', () => {
    expect(versionAsked('2026-09-28T22:12:00.000Z', NOW, TZ)).toBe(
      'the version from today, 3:12pm',
    )
  })

  it('made another day: its date, as every version is named', () => {
    expect(versionAsked('2026-09-18T16:00:00.000Z', NOW, TZ)).toBe(
      'the version from 18 September, 9:00am',
    )
  })

  it('a date that cannot be read: "this version", never a date we don\'t know', () => {
    expect(versionAsked('not a date', NOW, TZ)).toBe('this version')
  })
})
