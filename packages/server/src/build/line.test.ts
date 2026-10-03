import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createHub, publishState, type Hub } from '../api/events.js'
import { holds } from '../api/line-state.js'
import type { ConversationState, Progress } from '../api/progress.js'
import {
  openStore,
  type Conversation,
  type Run,
  type RunStatus,
  type Store,
} from '../store/db.js'
import { scratchDir } from '../store/testing.js'
import { createLine, type Line } from './line.js'

/**
 * F4 DECISION 5: ONE CONVERSATION HOLDS AN APP AT A TIME (Rich). The others wait in line, oldest
 * first, and the next starts by itself when the app is freed. The holder is derived from the
 * store (and from work still in flight, M7-1); only the waiting order is kept.
 */
const ALICE = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  displayName: 'Alice',
  email: 'alice@example.test',
}
const BOB = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  displayName: 'Bob',
  email: 'bob@example.test',
}
const PROJECT = '22222222-2222-4222-8222-222222222222'
const OTHER = '99999999-9999-4999-8999-999999999999'

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

function setUp() {
  const { dir, remove } = scratchDir()
  const store: Store = openStore(join(dir, 'app.sqlite'))
  cleanups.push(() => {
    store.close()
    remove()
  })
  store.rememberPerson(ALICE)
  store.rememberPerson(BOB)
  const hub: Hub = createHub()
  const begun: string[] = []
  let clock = Date.parse('2026-09-28T10:00:00.000Z')
  // A begin that takes the app as a change does: to `planning`, its planner at work.
  const line: Line = createLine({
    store,
    hub,
    now: () => new Date(clock),
    begin: (conversation) => {
      begun.push(conversation.title)
      store.setState(conversation.id, 'planning')
      hub.claim(conversation.id)
    },
  })
  const frames = (conversation: Conversation) => {
    const seen: Progress[] = []
    hub.subscribe(conversation.id, (frame) => seen.push(frame))
    return seen
  }
  return {
    store,
    hub,
    line,
    begun,
    frames,
    tick: (ms = 0) => void (clock += ms),
  }
}

type Setup = ReturnType<typeof setUp>

/** A conversation on the app in `state`, its latest run in `status` when given. */
function on(
  s: Setup,
  title: string,
  state: ConversationState,
  status?: RunStatus,
  { person = ALICE.id, project = PROJECT }: { person?: string; project?: string } = {},
): Conversation {
  const made = s.store.createChange(person, project, title, `${title}, please`)
  const moved = s.store.setState(made.id, state)
  if (status !== undefined) s.store.saveRun(run(moved.id, status))
  return moved
}

function run(conversationId: string, status: RunStatus): Run {
  return {
    id: `run-${conversationId}`,
    conversationId,
    round: 1,
    step: 'pages',
    moves: 0,
    tries: {},
    status,
    sessionIds: [],
    model: null,
    last: null,
    sameRefusal: null,
    detail: null,
  }
}

const conversation = (overrides: Partial<Conversation>): Conversation => ({
  id: 'c-1',
  personId: ALICE.id,
  projectId: PROJECT,
  title: 'Word count',
  state: 'planning',
  description: 'Also show a word count',
  createdAt: '2026-09-28T10:00:00.000Z',
  updatedAt: '2026-09-28T10:00:00.000Z',
  ...overrides,
})

describe('holds: Decision 5, in one place', () => {
  it.each(['making', 'planning', 'plan-ready', 'agreed', 'paused'] as const)(
    'a conversation %s holds its app',
    (state) => {
      expect(holds(conversation({ state }), undefined)).toBe(true)
    },
  )

  it.each(['working', 'paused', 'needs-you', 'interrupted'] as const)(
    'building, with a run %s, holds its app',
    (status) => {
      expect(holds(conversation({ state: 'building' }), run('c-1', status))).toBe(true)
    },
  )

  it('building with its round just starting (no run saved yet) holds its app', () => {
    expect(holds(conversation({ state: 'building' }), undefined)).toBe(true)
  })

  it.each(['built', 'set-aside', 'waiting'] as const)(
    'a conversation %s holds nothing',
    (state) => {
      expect(holds(conversation({ state }), run('c-1', 'done'))).toBe(false)
    },
  )

  it('building with a stopped run holds nothing: Stop frees the app', () => {
    expect(holds(conversation({ state: 'building' }), run('c-1', 'stopped'))).toBe(false)
  })

  it('building with a run done holds nothing', () => {
    expect(holds(conversation({ state: 'building' }), run('c-1', 'done'))).toBe(false)
  })

  it.each(['describing', 'questions', 'naming'] as const)(
    'a conversation still in its intake (%s, no project) holds nothing',
    (state) => {
      expect(holds(conversation({ state, projectId: null }), undefined)).toBe(false)
    },
  )
})

describe('the line (Review Focus 1)', () => {
  it('a change on a free app holds it at once: begun once, never waiting', () => {
    const s = setUp()
    on(s, 'First build', 'built', 'done')
    const change = on(s, 'Word count', 'waiting')
    expect(s.line.join(change)).toBe('holding')
    expect(s.begun).toEqual(['Word count'])
    expect(s.line.holder(PROJECT)?.id).toBe(change.id)
  })

  it('two changes joining in the same tick: one holds, the other waits at place 1', () => {
    const s = setUp()
    const a = on(s, 'Word count', 'waiting')
    const b = on(s, 'Bigger title', 'waiting')
    expect([s.line.join(a), s.line.join(b)]).toEqual(['holding', 'waiting'])
    expect(s.begun).toEqual(['Word count'])
    expect(s.line.position(s.store.getConversation(b.id, ALICE.id)!)).toEqual({
      place: 1,
      holder: {
        id: a.id,
        title: 'Word count',
        waitingForYou: false,
        by: { id: ALICE.id, name: ALICE.displayName },
      },
    })
  })

  it('a change asked while the first build is still being made waits for it', () => {
    const s = setUp()
    const first = on(s, 'First build', 'making')
    const change = on(s, 'Word count', 'waiting')
    expect(s.line.join(change)).toBe('waiting')
    expect(s.line.holder(PROJECT)?.id).toBe(first.id)
    expect(s.begun).toEqual([])
  })

  it('waits in order: the oldest wait first, whoever waits, and each place follows', () => {
    const s = setUp()
    on(s, 'Holder', 'building', 'working')
    const a = on(s, 'A', 'waiting')
    const b = on(s, 'B', 'waiting', undefined, { person: BOB.id })
    const c = on(s, 'C', 'waiting')
    s.line.join(b)
    s.line.join(a)
    s.line.join(c)
    const place = (x: Conversation) =>
      s.line.position(s.store.getConversation(x.id, x.personId)!)?.place
    expect([place(b), place(a), place(c)]).toEqual([1, 2, 3])
  })

  it('the holder built: the next starts by itself, once, with no request; the rest move up', () => {
    const s = setUp()
    const holder = on(s, 'Holder', 'building', 'working')
    const a = on(s, 'A', 'waiting')
    const b = on(s, 'B', 'waiting')
    s.line.join(a)
    s.line.join(b)
    const bFrames = s.frames(b)
    s.store.saveRun(run(holder.id, 'done'))
    s.store.setState(holder.id, 'built')
    s.line.released(PROJECT)
    expect(s.begun).toEqual(['A'])
    expect(s.line.holder(PROJECT)?.id).toBe(a.id)
    expect(s.line.position(s.store.getConversation(b.id, ALICE.id)!)?.place).toBe(1)
    // B is told its new place, and its new holder, without asking.
    const last = bFrames.at(-1)
    expect(last).toMatchObject({
      kind: 'state',
      line: { place: 1, holder: { id: a.id, title: 'A' } },
    })
    // Released again with A holding: nothing more starts.
    s.line.released(PROJECT)
    expect(s.begun).toEqual(['A'])
  })

  it('released with nobody waiting starts nothing', () => {
    const s = setUp()
    on(s, 'Built', 'built', 'done')
    s.line.released(PROJECT)
    s.line.released(null)
    expect(s.begun).toEqual([])
  })

  it('a stopped round still finishing what was in flight holds its app until its work ends (M7-1)', () => {
    const s = setUp()
    const stopped = on(s, 'Stopped', 'building', 'stopped')
    const claim = s.hub.claim(stopped.id)
    const change = on(s, 'Word count', 'waiting')
    expect(s.line.join(change)).toBe('waiting')
    expect(s.line.holder(PROJECT)?.id).toBe(stopped.id)
    s.hub.unclaim(stopped.id, claim)
    s.line.released(PROJECT)
    expect(s.begun).toEqual(['Word count'])
  })

  it('never two holders: the line begins one conversation per app, and other apps are their own', () => {
    const s = setUp()
    const a = on(s, 'A', 'waiting')
    const b = on(s, 'B', 'waiting')
    const elsewhere = on(s, 'Elsewhere', 'waiting', undefined, { project: OTHER })
    s.line.join(a)
    s.line.join(b)
    s.line.join(elsewhere)
    s.line.released(PROJECT)
    s.line.released(PROJECT)
    expect(s.begun).toEqual(['A', 'Elsewhere'])
    const holding = s.store
      .conversationsOn(PROJECT)
      .filter((c) => holds(c, s.store.latestRun(c.id)))
    expect(holding.map((c) => c.title)).toEqual(['A'])
  })

  it("the holder's place in the frame says it is waiting for them only when it needs them", () => {
    const s = setUp()
    const holder = on(s, 'Holder', 'building', 'working')
    const waiting = on(s, 'Waiting', 'waiting')
    s.line.join(waiting)
    const forYou = () =>
      s.line.position(s.store.getConversation(waiting.id, ALICE.id)!)?.holder
        ?.waitingForYou
    expect(forYou()).toBe(false)
    for (const status of ['needs-you', 'paused', 'interrupted'] as const) {
      s.store.saveRun(run(holder.id, status))
      expect(forYou()).toBe(true)
    }
    s.store.saveRun(run(holder.id, 'working'))
    s.store.setState(holder.id, 'plan-ready')
    expect(forYou()).toBe(true)
  })

  it("a waiting conversation's frame follows its holder: its plan ready, the line says it waits for them", () => {
    const s = setUp()
    const holder = on(s, 'Holder', 'planning')
    const waiting = on(s, 'Waiting', 'waiting')
    s.line.join(waiting)
    const seen = s.frames(waiting)
    // Whatever publishes the holder's state publishes each waiting frame of its app too.
    publishState(s.hub, s.store, s.store.setState(holder.id, 'plan-ready'))
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({
      kind: 'state',
      conversation: { id: waiting.id, state: 'waiting' },
      line: { place: 1, holder: { id: holder.id, waitingForYou: true } },
    })
  })

  it('a conversation not waiting has no place', () => {
    const s = setUp()
    const holder = on(s, 'Holder', 'planning')
    expect(s.line.position(holder)).toBeNull()
  })
})

describe('a restart (Review Focus 5)', () => {
  it('onBoot begins the oldest waiting conversation of an app with no holder', () => {
    const s = setUp()
    on(s, 'Built', 'built', 'done')
    const a = on(s, 'A', 'waiting')
    const b = on(s, 'B', 'waiting')
    s.store.setState(a.id, 'waiting', { waitingSince: '2026-09-28T09:00:00.000Z' })
    s.store.setState(b.id, 'waiting', { waitingSince: '2026-09-28T09:00:01.000Z' })
    s.line.onBoot()
    expect(s.begun).toEqual(['A'])
  })

  it('onBoot with a holder begins nothing', () => {
    const s = setUp()
    on(s, 'Holder', 'building', 'interrupted')
    on(s, 'A', 'waiting')
    s.line.onBoot()
    expect(s.begun).toEqual([])
  })
})
