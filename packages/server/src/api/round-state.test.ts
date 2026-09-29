import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openStore, type Run } from '../store/db.js'
import { scratchDir } from '../store/testing.js'
import { stateFrame } from './events.js'
import { ALICE } from './testing.js'
import { NO_DETAIL, roundOf, type RoundSaid } from './round-state.js'

/**
 * WHAT THE ROUNDS SAID, ON THE PAGE (F3 Task 11). Sitting 5 kept each round's words as the
 * conversation's messages; the building screen's conversation is drawn from them. So every
 * state frame carries them, folded from the store as the round is, and a reconnect loses none.
 */
const cleanups: (() => void)[] = []
afterEach(() => cleanups.splice(0).forEach((clean) => clean()))

function store() {
  const { dir, remove } = scratchDir()
  const opened = openStore(join(dir, 'app.sqlite'))
  opened.rememberPerson(ALICE)
  cleanups.push(() => {
    opened.close()
    remove()
  })
  return opened
}

const run = (conversationId: string, round: number, patch: Partial<Run> = {}): Run => ({
  id: `run-${round}`,
  conversationId,
  round,
  step: 'answers',
  moves: 0,
  tries: {},
  status: 'done',
  sessionIds: [],
  model: null,
  last: null,
  sameRefusal: null,
  detail: NO_DETAIL,
  ...patch,
})

describe('the state frame carries what the rounds said', () => {
  it('theirs and ours, oldest first, each with its time; an answer with its question; a round folded with what changed', () => {
    const s = store()
    const conversation = s.createConversation(
      ALICE.id,
      "A page where students post a response to the week's reading.",
    )
    const id = conversation.id
    // Moments 3–5 said things too: none of them is a round's.
    s.addMessage(id, 'we', { kind: 'skip' })
    s.saveRun(
      run(id, 1, {
        detail: {
          ...NO_DETAIL,
          steps: {
            pages: {
              note: null,
              changed: 'One page listing the weeks. The rule about who sees what',
              exact: ['public/weeks.html', 'server.js'],
            },
          },
        },
      }),
    )
    s.addQuestion({
      id: 'q-1',
      runId: 'run-1',
      conversationId: id,
      ask: 'Should a TA see everything you see?',
      fallback: null,
      secret: null,
    })
    s.addQuestion({
      id: 'q-2',
      runId: 'run-1',
      conversationId: id,
      ask: 'The key the app uses to reach the library catalogue',
      fallback: null,
      secret: 'CATALOGUE_KEY',
    })
    const said: [from: 'person' | 'we', RoundSaid][] = [
      ['person', { kind: 'message', round: 1, text: 'Make the title bigger.' }],
      [
        'person',
        { kind: 'answer', round: 1, questionId: 'q-1', text: 'Yes, the TA too.' },
      ],
      ['person', { kind: 'answer', round: 1, questionId: 'q-2', text: null }],
      [
        'we',
        {
          kind: 'explained',
          round: 1,
          step: 'build',
          note: 'A piece it depends on was missing',
          sentence:
            "The first build didn't take. We fixed a missing piece and built it again.",
        },
      ],
      ['we', { kind: 'fallback', round: 1 }],
      ['we', { kind: 'campus', round: 1 }],
      [
        'we',
        {
          kind: 'built',
          round: 1,
          line: 'It started and answered.',
          cannot: 'send marks to Canvas',
        },
      ],
      ['person', { kind: 'message', round: 2, text: 'Also add a word count.' }],
    ]
    s.saveRun(run(id, 2, { status: 'working', step: 'pages' }))
    for (const [from, body] of said) s.addMessage(id, from, body)

    const frame = stateFrame(s, s.getConversation(id, ALICE.id)!)
    expect(frame.kind).toBe('state')
    const thread = frame.kind === 'state' ? frame.thread : undefined
    const at = expect.stringMatching(/^\d{4}-\d\d-\d\dT/) as unknown as string
    expect(thread).toEqual([
      { kind: 'message', round: 1, text: 'Make the title bigger.', at },
      {
        kind: 'answer',
        round: 1,
        ask: 'Should a TA see everything you see?',
        text: 'Yes, the TA too.',
        at,
      },
      {
        kind: 'answer',
        round: 1,
        ask: 'The key the app uses to reach the library catalogue',
        text: null,
        at,
      },
      {
        kind: 'explained',
        round: 1,
        step: 'build',
        sentence:
          "The first build didn't take. We fixed a missing piece and built it again.",
        at,
      },
      { kind: 'fallback', round: 1, at },
      { kind: 'campus', round: 1, at },
      {
        kind: 'built',
        round: 1,
        changed: 'One page listing the weeks. The rule about who sees what',
        cannot: 'send marks to Canvas',
        at,
      },
      { kind: 'message', round: 2, text: 'Also add a word count.', at },
    ])
  })

  it('a round whose run kept no detail folds with nothing changed; before any round, nothing', () => {
    const s = store()
    const conversation = s.createConversation(ALICE.id, 'Words.')
    const before = stateFrame(s, conversation)
    expect(before.kind === 'state' && before.thread).toEqual([])
    s.saveRun(run(conversation.id, 1, { detail: null }))
    s.addMessage(conversation.id, 'we', {
      kind: 'built',
      round: 1,
      line: null,
      cannot: null,
    } satisfies RoundSaid)
    const after = stateFrame(s, conversation)
    expect(after.kind === 'state' && after.thread).toMatchObject([
      { kind: 'built', round: 1, changed: null, cannot: null },
    ])
  })
})

/**
 * RICH'S F3 DECISIONS, FOLDED (F4 Task 3, 2026-09-28): What changed is one account a round, from
 * the lead's done; each commit's own account sits with its files; a Stop he chose is still; a
 * conflict is no try on the pages.
 */
describe("Rich's F3 decisions, as the round is folded", () => {
  const ACCOUNT = 'Word counts appear as students write, and beside each response.'
  const EXACT = [
    'One page listing the weeks',
    'public/weeks.html',
    'The rule about who sees what',
    'config/staff.json',
  ]
  const stepOf = (s: ReturnType<typeof store>, id: string, key: string) =>
    roundOf(s, id)?.steps.find((step) => step.key === key)

  it("What changed is done's one account, and the exact changes are each commit's account with its files", () => {
    const s = store()
    const id = s.createConversation(ALICE.id, 'Words.').id
    s.saveRun(
      run(id, 1, {
        detail: {
          ...NO_DETAIL,
          account: ACCOUNT,
          steps: { pages: { note: null, changed: null, exact: EXACT } },
        },
      }),
    )
    s.addMessage(id, 'we', {
      kind: 'built',
      round: 1,
      line: 'The pages are written.',
      cannot: null,
    } satisfies RoundSaid)
    expect(stepOf(s, id, 'pages')).toMatchObject({ changed: ACCOUNT, exact: EXACT })
    const frame = stateFrame(s, s.getConversation(id, ALICE.id)!)
    expect(frame.kind === 'state' && frame.thread).toMatchObject([
      { kind: 'built', round: 1, changed: ACCOUNT },
    ])
  })

  it('a round from before F4, with no account, still folds the accounts it kept', () => {
    const s = store()
    const id = s.createConversation(ALICE.id, 'Words.').id
    // As F3 saved it: a detail with no `account` key at all.
    const before = Object.fromEntries(
      Object.entries(NO_DETAIL).filter(([key]) => key !== 'account'),
    ) as unknown as typeof NO_DETAIL
    s.saveRun(
      run(id, 1, {
        detail: {
          ...before,
          steps: {
            pages: { note: null, changed: 'One page. The rule', exact: ['a.html'] },
          },
        },
      }),
    )
    expect(stepOf(s, id, 'pages')?.changed).toBe('One page. The rule')
  })

  it("a stopped round's step goes back to not started, still; interrupted and needs-you stay halted", () => {
    const s = store()
    const id = s.createConversation(ALICE.id, 'Words.').id
    s.saveRun(run(id, 1, { status: 'stopped', step: 'build' }))
    expect(roundOf(s, id)?.steps.map((step) => step.state)).toEqual([
      'done',
      'done',
      'next',
      'next',
      'next',
    ])
    for (const status of ['interrupted', 'needs-you'] as const) {
      s.saveRun(run(id, 1, { status, step: 'build' }))
      expect(stepOf(s, id, 'build')?.state).toBe('halted')
    }
  })

  it('a conflict is no try on the pages: two leave its tries at 0, and a build still counts its own', () => {
    const s = store()
    const id = s.createConversation(ALICE.id, 'Words.').id
    s.saveRun(
      run(id, 1, {
        status: 'working',
        step: 'pages',
        tries: { conflict: 2, build: 1, draft: 0 },
      }),
    )
    expect(stepOf(s, id, 'pages')?.tries).toBe(0)
    expect(stepOf(s, id, 'build')?.tries).toBe(1)
  })
})
