import { randomBytes } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NO_DETAIL } from '../api/round-state.js'
import { PlatformRefusal } from '../platform/refusal.js'
import type { ProjectEvent, ProjectStream, Replay } from '../platform/stream.js'
import type { Watching } from '../platform/watching.js'
import { openStore, type Store } from '../store/db.js'
import type { KeptApp, KeptMember } from '../store/keeping.js'
import type { Run } from '../store/runs.js'
import { createKeeper, type Keeper } from './keeper.js'
import { KEY_BYTES, seal, unseal } from './seal.js'
import { clockOf, dayOf } from './words.js'

/**
 * F6 TASK 3: THE KEEPER (D4): one Keeping watch token per app, handed over by a member's page and
 * kept sealed (D2); one event stream per token; every event written once to `history` (Decision
 * 1); a gap said where the replay cannot reach back (FE-7). It only reads.
 *
 * A recording fake stream the test drives by hand (events, a replay's report, a reconnect, a
 * refusal); a fake `Watching`; the real store, in memory.
 */
const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'
const ALICE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const BOB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const DAY = 86_400_000
const HOUR = 3_600_000
const ORIGIN = 'http://127.0.0.1:7105'
const NOW = new Date('2026-10-01T18:00:00.000Z')
const inDays = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString()

const TOKEN_A = 'mft_test_k_watch_token_a'
const TOKEN_B = 'mft_test_k_watch_token_b'
const ID_A = 'a0000000-0000-4000-8000-000000000001'
const ID_B = 'b0000000-0000-4000-8000-000000000002'

const appOf = (projectId: string, patch: Partial<KeptApp> = {}): KeptApp => ({
  projectId,
  name: 'Reading responses',
  slug: 'reading-responses',
  state: 'active',
  launchedAt: null,
  studentsUrl: 'https://reading-responses.manifest.internal',
  ...patch,
})
const member = (userId: string, role: KeptMember['role'] = 'owner'): KeptMember => ({
  userId,
  role,
  displayName: userId === ALICE ? 'Alice Instructor' : 'Bob Helper',
  email: userId === ALICE ? 'alice@example.test' : 'bob@example.test',
})
const event = (
  n: number,
  type = 'build.started',
  detail: unknown = {},
): ProjectEvent => ({
  id: `e0000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  type,
  subject: 'project:x',
  detail,
  at: new Date(Date.UTC(2026, 9, 1, 9, 0) + n * 60_000).toISOString(),
})

type Handlers = Parameters<ProjectStream['watch']>[2]
interface Opened {
  token: string
  projectId: string
  handlers: Handlers
  closed: boolean
}

function fakeStream() {
  const opened: Opened[] = []
  const stream: ProjectStream = {
    watch(token, projectId, handlers) {
      const one = { token, projectId, handlers, closed: false }
      opened.push(one)
      return { ready: Promise.resolve(), close: () => void (one.closed = true) }
    },
  }
  return {
    stream,
    opened,
    open: () => opened.filter((one) => !one.closed),
    /** Refused, as platformStream refuses: once, and the stream is over. */
    refuse: (one: Opened) => {
      one.closed = true
      one.handlers.refused()
    },
  }
}

function fakeWatching() {
  const calls: string[] = []
  /** What each token reads: the app it answers, or a refusal's status. */
  const reads = new Map<string, KeptApp | number>()
  const members = new Map<string, KeptMember[]>()
  /** Holds every read until released, to race two hands. */
  let gate: Promise<void> | undefined
  const watching: Watching = {
    async app(token, projectId) {
      calls.push(`app ${token} ${projectId}`)
      if (gate !== undefined) await gate
      const read = reads.get(token)
      if (read === undefined) throw new PlatformRefusal('NOT_FOUND', 404)
      if (typeof read === 'number') throw new PlatformRefusal('REFUSED', read)
      return read
    },
    async members(token, projectId) {
      calls.push(`members ${token} ${projectId}`)
      if (gate !== undefined) await gate
      return members.get(projectId) ?? []
    },
  }
  return {
    watching,
    calls,
    reads,
    members,
    hold() {
      let release: () => void = () => undefined
      gate = new Promise((resolve) => (release = resolve))
      return () => {
        gate = undefined
        release()
      }
    },
  }
}

const settle = () => new Promise((resolve) => setImmediate(resolve))

type Probed = { status: number | null; routed: boolean }
const UP: Probed = { status: 200, routed: true }
const DOWN: Probed = { status: 502, routed: true }
const OFF: Probed = { status: 410, routed: false }

/** The live-address watch's one look (Task 6): what each address was asked, and what it answers. */
function fakeProbe() {
  const asked: string[] = []
  let answer = UP
  return {
    probe: async (url: string) => {
      asked.push(url)
      return answer
    },
    asked,
    answer: (next: Probed) => void (answer = next),
  }
}

const keepers: Keeper[] = []
const stores: Store[] = []
afterEach(() => {
  for (const keeper of keepers.splice(0)) keeper.stop()
  for (const store of stores.splice(0)) store.close()
})

function setUp(
  options: { store?: Store; key?: Buffer; probing?: boolean; lookEveryMs?: number } = {},
) {
  const store = options.store ?? openStore(':memory:')
  if (options.store === undefined) stores.push(store)
  const key = options.key ?? randomBytes(KEY_BYTES)
  const s = fakeStream()
  const w = fakeWatching()
  const p = fakeProbe()
  w.reads.set(TOKEN_A, appOf(P1))
  w.reads.set(TOKEN_B, appOf(P1))
  w.members.set(P1, [member(ALICE), member(BOB, 'collaborator')])
  let clock = NOW
  const sent: { to: string; subject: string; text: string }[] = []
  /** Conversations a page holds the stream of, and those with work in flight. */
  const pages = new Set<string>()
  const keeper = createKeeper({
    store,
    key,
    stream: s.stream,
    watching: w.watching,
    now: () => clock,
    mailer: { send: async (message) => void sent.push(message) },
    origin: ORIGIN,
    hub: { watched: (id, personId) => pages.has(`${id} ${personId}`), busy: () => false },
    wait: async () => undefined,
    probe: p.probe,
    probing: options.probing ?? true,
    ...(options.lookEveryMs === undefined ? {} : { lookEveryMs: options.lookEveryMs }),
  })
  keepers.push(keeper)
  return {
    store,
    key,
    keeper,
    ...s,
    w,
    p,
    sent,
    pages,
    later: (ms: number) => (clock = new Date(clock.getTime() + ms)),
    now: () => clock,
  }
}

const handed = (token: string, tokenId: string, days = 365) => ({
  token,
  tokenId,
  expiresAt: inDays(days),
})

describe('hand: the watch token handed over (Decision 5)', () => {
  it('a token that reads another project is refused, and nothing is kept', async () => {
    const t = setUp()
    t.w.reads.set(TOKEN_A, appOf(P2))
    await expect(t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)).rejects.toBeInstanceOf(
      PlatformRefusal,
    )
    expect(t.store.watchOf(P1)).toBeUndefined()
    expect(t.store.app(P1)).toBeUndefined()
    expect(t.store.members(P1)).toEqual([])
    expect(t.opened).toEqual([])
  })

  it.each([401, 403, 404])(
    'a token the platform refuses (%i) is a PlatformRefusal with its status, and nothing is kept',
    async (status) => {
      const t = setUp()
      t.w.reads.set(TOKEN_A, status)
      const refused = await t.keeper
        .hand(P1, handed(TOKEN_A, ID_A), ALICE)
        .catch((error: unknown) => error)
      expect(refused).toBeInstanceOf(PlatformRefusal)
      expect((refused as PlatformRefusal).status).toBe(status)
      expect(t.store.watchOf(P1)).toBeUndefined()
      expect(t.opened).toEqual([])
    },
  )

  it('handed by someone its own members do not include: a stranger, and nothing is kept (the whole-branch review’s I2)', async () => {
    const t = setUp()
    t.w.members.set(P1, [member(BOB)])
    expect(await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)).toBe('stranger')
    expect(t.store.watchOf(P1)).toBeUndefined()
    expect(t.store.app(P1)).toBeUndefined()
    expect(t.store.members(P1)).toEqual([])
    expect(t.opened).toEqual([])
  })

  it('members kept from before, gone stale while we were not watching: the token’s own members are kept (I2)', async () => {
    const t = setUp()
    t.store.putMembers(P1, [member(ALICE)])
    t.w.members.set(P1, [member(BOB)])
    expect(await t.keeper.hand(P1, handed(TOKEN_A, ID_A), BOB)).toBe('kept')
    expect(t.store.members(P1)).toEqual([member(BOB)])
  })

  it('a good one is sealed, its app and members kept, and its stream opened', async () => {
    const t = setUp()
    expect(await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)).toBe('kept')
    const kept = t.store.watchOf(P1)!
    expect(kept).toMatchObject({
      projectId: P1,
      tokenId: ID_A,
      expiresAt: inDays(365),
      mintedBy: ALICE,
      mintedAt: NOW.toISOString(),
    })
    expect(kept.sealed).not.toContain(TOKEN_A)
    expect(unseal(t.key, kept.sealed)).toBe(TOKEN_A)
    expect(t.store.app(P1)).toEqual(appOf(P1))
    expect(t.store.members(P1)).toEqual([member(ALICE), member(BOB, 'collaborator')])
    expect(t.open().map((one) => [one.token, one.projectId])).toEqual([[TOKEN_A, P1]])
    expect(t.keeper.status(P1)).toEqual({
      watching: true,
      until: inDays(365),
      tokenId: ID_A,
      mintedBy: ALICE,
    })
  })

  it('a second hand while the first is good is current: nothing changes, and the second is never tried', async () => {
    const t = setUp()
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
    expect(await t.keeper.hand(P1, handed(TOKEN_B, ID_B), BOB)).toBe('current')
    expect(t.store.watchOf(P1)?.tokenId).toBe(ID_A)
    expect(t.opened).toHaveLength(1)
    expect(t.w.calls.filter((call) => call.includes(TOKEN_B))).toEqual([])
  })

  it('a token kept, or found current after its own token read the project, is noted as ours by its id (the review’s I2); never one we did not check', async () => {
    const t = setUp()
    const release = t.w.hold()
    const both = Promise.all([
      t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE),
      t.keeper.hand(P1, handed(TOKEN_B, ID_B), BOB),
    ])
    await settle()
    release()
    expect((await both).sort()).toEqual(['current', 'kept'])
    expect(
      t.store
        .watchedOn(P1)
        .map((one) => one.tokenId)
        .sort(),
    ).toEqual([ID_A, ID_B].sort())
    // Handed while ours is good, it is never read: an id it names is not taken as ours (m83's kind).
    const UNCHECKED = 'c0000000-0000-4000-8000-0000000000cc'
    expect(await t.keeper.hand(P1, handed('mft_anything', UNCHECKED), ALICE)).toBe(
      'current',
    )
    expect(t.store.watchedOn(P1).map((one) => one.tokenId)).not.toContain(UNCHECKED)
    expect(JSON.stringify(t.store.watchedOn(P1))).not.toContain('mft_')
  })

  it('with 30 days left the first is still good; with 29, a new one replaces it and its stream', async () => {
    const t = setUp()
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A, 30), ALICE)
    expect(await t.keeper.hand(P1, handed(TOKEN_B, ID_B), BOB)).toBe('current')
    t.later(DAY)
    expect(await t.keeper.hand(P1, handed(TOKEN_B, ID_B), BOB)).toBe('kept')
    expect(t.store.watchOf(P1)).toMatchObject({ tokenId: ID_B, mintedBy: BOB })
    expect(t.opened.map((one) => [one.token, one.closed])).toEqual([
      [TOKEN_A, true],
      [TOKEN_B, false],
    ])
  })

  it('after the first was refused, a new one replaces it', async () => {
    const t = setUp()
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
    t.refuse(t.open()[0]!)
    expect(await t.keeper.hand(P1, handed(TOKEN_B, ID_B), BOB)).toBe('kept')
    expect(t.store.watchOf(P1)?.tokenId).toBe(ID_B)
    expect(t.open().map((one) => one.token)).toEqual([TOKEN_B])
  })

  it('two hands at once (Review Focus 2): one is kept, the other is current, and one stream is open', async () => {
    const t = setUp()
    const release = t.w.hold()
    const both = Promise.all([
      t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE),
      t.keeper.hand(P1, handed(TOKEN_B, ID_B), BOB),
    ])
    await settle()
    release()
    expect((await both).sort()).toEqual(['current', 'kept'])
    expect(t.open()).toHaveLength(1)
    expect(t.open()[0]!.token).toBe(unseal(t.key, t.store.watchOf(P1)!.sealed))
  })
})

describe('boot (start)', () => {
  it('every kept token opens its stream', async () => {
    const store = openStore(':memory:')
    stores.push(store)
    const key = randomBytes(KEY_BYTES)
    for (const [projectId, token, tokenId] of [
      [P1, TOKEN_A, ID_A],
      [P2, TOKEN_B, ID_B],
    ] as const)
      store.putWatch({
        projectId,
        tokenId,
        sealed: seal(key, token),
        expiresAt: inDays(300),
        mintedBy: ALICE,
        mintedAt: NOW.toISOString(),
      })
    const t = setUp({ store, key })
    t.keeper.start()
    expect(
      t
        .open()
        .map((one) => [one.projectId, one.token])
        .sort(),
    ).toEqual(
      [
        [P1, TOKEN_A],
        [P2, TOKEN_B],
      ].sort(),
    )
    expect(t.keeper.status(P1).watching).toBe(true)
    // What changed while we were stopped may be outside the replay (FE-7): each app read again.
    await settle()
    expect(t.w.calls.sort()).toEqual(
      [
        `app ${TOKEN_A} ${P1}`,
        `members ${TOKEN_A} ${P1}`,
        `app ${TOKEN_B} ${P2}`,
        `members ${TOKEN_B} ${P2}`,
      ].sort(),
    )
  })

  it('a row another key sealed (Review Focus 4) is dropped, opens nothing, and is not watching', async () => {
    const store = openStore(':memory:')
    stores.push(store)
    store.putWatch({
      projectId: P1,
      tokenId: ID_A,
      sealed: seal(randomBytes(KEY_BYTES), TOKEN_A),
      expiresAt: inDays(300),
      mintedBy: ALICE,
      mintedAt: NOW.toISOString(),
    })
    const t = setUp({ store })
    t.keeper.start()
    expect(t.opened).toEqual([])
    expect(store.watchOf(P1)).toBeUndefined()
    expect(t.keeper.status(P1)).toEqual({
      watching: false,
      until: null,
      tokenId: null,
      mintedBy: null,
    })
  })
})

describe('events: written once, as the platform sent them (Decision 1)', () => {
  async function watched() {
    const t = setUp()
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
    const handlers = t.open()[0]!.handlers
    return { ...t, handlers }
  }

  it('each is one history row, at its own time; the same id again is still one', async () => {
    const t = await watched()
    t.handlers.event(event(1, 'project.launched', { releaseId: 'r-1' }))
    t.handlers.event(event(1, 'project.launched', { releaseId: 'r-1' }))
    expect(t.store.historyOf(P1)).toEqual([
      {
        id: event(1).id,
        projectId: P1,
        at: event(1).at,
        type: 'project.launched',
        detail: { releaseId: 'r-1' },
      },
    ])
  })

  it.each(['member.added', 'member.removed'])('%s re-reads the members', async (type) => {
    const t = await watched()
    t.w.members.set(P1, [member(ALICE)])
    t.handlers.event(event(2, type, { userId: BOB }))
    await settle()
    expect(t.store.members(P1)).toEqual([member(ALICE)])
  })

  it.each([
    'project.archived',
    'project.restored',
    'project.renamed',
    'project.launched',
  ])('%s re-reads the app', async (type) => {
    const t = await watched()
    const changed = appOf(P1, {
      name: 'Weekly responses',
      state: type === 'project.archived' ? 'archived' : 'active',
      launchedAt: '2026-10-01T17:05:13.000Z',
    })
    t.w.reads.set(TOKEN_A, changed)
    t.handlers.event(event(3, type))
    await settle()
    expect(t.store.app(P1)).toEqual(changed)
  })

  it('another event re-reads nothing', async () => {
    const t = await watched()
    const before = t.w.calls.length
    t.handlers.event(event(4, 'instance.healthy'))
    await settle()
    expect(t.w.calls).toHaveLength(before)
  })

  it('project.deleted forgets the app: its stream closed, and every row', async () => {
    const t = await watched()
    t.handlers.event(event(1, 'project.launched'))
    t.handlers.event(event(5, 'project.deleted'))
    expect(t.open()).toEqual([])
    expect(t.store.watchOf(P1)).toBeUndefined()
    expect(t.store.app(P1)).toBeUndefined()
    expect(t.store.members(P1)).toEqual([])
    expect(t.store.historyOf(P1)).toEqual([])
  })

  it('a reconnect re-reads the app and its members: the replay can miss what changed them (FE-7)', async () => {
    const t = await watched()
    t.w.reads.set(TOKEN_A, appOf(P1, { name: 'Weekly responses' }))
    t.w.members.set(P1, [member(ALICE)])
    t.handlers.reconnected()
    await settle()
    expect(t.store.app(P1)?.name).toBe('Weekly responses')
    expect(t.store.members(P1)).toEqual([member(ALICE)])
  })
})

describe('refused (FE-33: 4401, a switch-off or a delete included; S1)', () => {
  it('the row is dropped, a keeping.stopped row says when, and it is not watching', async () => {
    const t = setUp()
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
    t.later(60_000)
    t.refuse(t.open()[0]!)
    expect(t.store.watchOf(P1)).toBeUndefined()
    expect(t.store.historyOf(P1)).toEqual([
      {
        id: `keeping.stopped:${ID_A}`,
        projectId: P1,
        at: new Date(NOW.getTime() + 60_000).toISOString(),
        type: 'keeping.stopped',
        detail: {},
      },
    ])
    expect(t.keeper.status(P1).watching).toBe(false)
    // Its app and members stay: the history still answers its members.
    expect(t.store.app(P1)).toBeDefined()
    expect(t.store.members(P1)).toHaveLength(2)
  })

  it('a stream already replaced says nothing that touches the newer token', async () => {
    const t = setUp()
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A, 10), ALICE)
    const old = t.opened[0]!
    await t.keeper.hand(P1, handed(TOKEN_B, ID_B), BOB)
    old.handlers.refused()
    old.handlers.event(event(9, 'project.launched'))
    expect(t.store.watchOf(P1)?.tokenId).toBe(ID_B)
    expect(t.store.historyOf(P1)).toEqual([])
    expect(t.keeper.status(P1).watching).toBe(true)
  })
})

describe('a gap (Decision 1, FE-7: the replay is the newest 50)', () => {
  const report = (handlers: Handlers, replay: Replay) => handlers.replayed?.(replay)
  const ids = (...ns: number[]) => ns.map((n) => event(n).id)

  /** An app whose history already holds events 1 and 2, watched again from a kept token. */
  function booted() {
    const store = openStore(':memory:')
    stores.push(store)
    const key = randomBytes(KEY_BYTES)
    for (const n of [1, 2])
      store.addHistory({
        id: event(n).id,
        projectId: P1,
        at: event(n).at,
        type: 'build.started',
        detail: {},
      })
    store.putWatch({
      projectId: P1,
      tokenId: ID_A,
      sealed: seal(key, TOKEN_A),
      expiresAt: inDays(300),
      mintedBy: ALICE,
      mintedAt: NOW.toISOString(),
    })
    const t = setUp({ store, key })
    t.keeper.start()
    return { ...t, handlers: t.open()[0]!.handlers }
  }
  const gaps = (store: Store) =>
    store.historyOf(P1).filter((entry) => entry.type === 'keeping.gap')

  it('at boot, a replay holding nothing we held: one gap, from the newest we held to the oldest replayed', () => {
    const t = booted()
    t.handlers.event(event(60))
    t.handlers.event(event(61))
    report(t.handlers, { ids: ids(60, 61), overlapped: false })
    expect(gaps(t.store)).toEqual([
      {
        id: `keeping.gap:${event(60).id}`,
        projectId: P1,
        at: event(2).at,
        type: 'keeping.gap',
        detail: { from: event(2).at, to: event(60).at },
      },
    ])
  })

  it('at boot, a replay holding one event we held: no gap', () => {
    const t = booted()
    t.handlers.event(event(2))
    t.handlers.event(event(60))
    report(t.handlers, { ids: ids(2, 60), overlapped: false })
    expect(gaps(t.store)).toEqual([])
  })

  it('on a reconnect, a replay that reached back to what this stream saw: no gap; one that did not: a gap', () => {
    const t = booted()
    t.handlers.event(event(2))
    t.handlers.event(event(3))
    report(t.handlers, { ids: ids(2, 3), overlapped: false })
    // The stream hands over only what it had not: 4, with 3 in the replay too.
    t.handlers.event(event(4))
    report(t.handlers, { ids: ids(3, 4), overlapped: true })
    t.handlers.reconnected()
    expect(gaps(t.store)).toEqual([])
    t.handlers.event(event(70))
    t.handlers.event(event(71))
    report(t.handlers, { ids: ids(70, 71), overlapped: false })
    t.handlers.reconnected()
    expect(gaps(t.store).map((gap) => gap.detail)).toEqual([
      { from: event(4).at, to: event(70).at },
    ])
  })

  it('an app with no history yet records none: it is "From …"', async () => {
    const t = setUp()
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
    const handlers = t.open()[0]!.handlers
    handlers.event(event(1))
    handlers.event(event(2))
    report(handlers, { ids: ids(1, 2), overlapped: false })
    expect(gaps(t.store)).toEqual([])
  })

  it('an empty replay is no gap', () => {
    const t = booted()
    report(t.handlers, { ids: [], overlapped: false })
    expect(gaps(t.store)).toEqual([])
  })

  it('a restore’s replay (Review Focus 4): held events, then project.archived and project.restored, written once, and no gap', async () => {
    const t = setUp()
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
    const first = t.open()[0]!
    for (const n of [1, 2, 3]) first.handlers.event(event(n))
    report(first.handlers, { ids: ids(1, 2, 3), overlapped: false })
    // Switched off: the stream closes 4401 before project.archived reaches it (S1, M4).
    t.refuse(first)
    // Switched back on, and a new token handed: its replay carries both.
    await t.keeper.hand(P1, handed(TOKEN_B, ID_B), ALICE)
    const second = t.open()[0]!.handlers
    for (const n of [1, 2, 3]) second.event(event(n))
    second.event(event(10, 'project.archived'))
    second.event(event(11, 'project.restored'))
    report(second, { ids: ids(1, 2, 3, 10, 11), overlapped: false })
    const history = t.store.historyOf(P1)
    expect(history.filter((entry) => entry.type === 'project.archived')).toHaveLength(1)
    expect(history.filter((entry) => entry.type === 'project.restored')).toHaveLength(1)
    expect(gaps(t.store)).toEqual([])
    expect(history.map((entry) => entry.type)).toEqual([
      'build.started',
      'build.started',
      'build.started',
      'project.archived',
      'project.restored',
      'keeping.stopped',
    ])
  })
})

describe('forget (Decision 11)', () => {
  it('its stream closed, and every row of ours for the app forgotten', async () => {
    const t = setUp()
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
    t.open()[0]!.handlers.event(event(1))
    t.keeper.forget(P1)
    expect(t.open()).toEqual([])
    expect(t.store.watchOf(P1)).toBeUndefined()
    expect(t.store.app(P1)).toBeUndefined()
    expect(t.store.historyOf(P1)).toEqual([])
    expect(t.keeper.status(P1).watching).toBe(false)
  })
})

describe('the emails (Task 5: D3, once each)', () => {
  const CAROL = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  const DAN = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  const carol: KeptMember = {
    userId: CAROL,
    role: 'owner',
    displayName: 'Carol Owner',
    email: 'carol@example.test',
  }
  const approved = (n: number) =>
    event(n, 'release.approved', { decision: 'approved', releaseId: 'r-1' })

  /** Handed, and its first replay over: what follows is news. */
  async function live(
    members: KeptMember[] = [member(ALICE), member(BOB, 'collaborator')],
  ) {
    const t = setUp()
    t.w.members.set(P1, members)
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
    const handlers = t.open()[0]!.handlers
    handlers.replayed!({ ids: [], overlapped: false })
    return { ...t, handlers }
  }

  it('each new happening is emailed to the owners, through its words', async () => {
    const t = await live()
    t.handlers.event(approved(1))
    await settle()
    expect(t.sent.map(({ to, subject }) => ({ to, subject }))).toEqual([
      { to: 'alice@example.test', subject: 'Reading responses: signed off' },
    ])
    expect(t.sent[0]!.text).toContain(`${ORIGIN}/apps/reading-responses/going-live`)
  })

  it('a happening held already (a replay) sends nothing more', async () => {
    const t = await live()
    t.handlers.event(approved(1))
    t.handlers.event(approved(1))
    await settle()
    expect(t.sent).toHaveLength(1)
  })

  it('what is no email (machinery, a line that emails nobody) sends nothing', async () => {
    const t = await live()
    t.handlers.event(event(2, 'build.succeeded'))
    t.handlers.event(event(3, 'iam_registration.submitted', { environment: 'staging' }))
    await settle()
    expect(t.sent).toEqual([])
  })

  it('the first replay of an app we never watched is its past: written, and no email', async () => {
    const t = setUp()
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
    const handlers = t.open()[0]!.handlers
    handlers.event(approved(1))
    handlers.event(event(2, 'rehearsal.completed', { passed: true, releaseId: 'r-1' }))
    handlers.replayed!({ ids: [approved(1).id, event(2).id], overlapped: false })
    await settle()
    expect(t.store.historyOf(P1)).toHaveLength(2)
    expect(t.sent).toEqual([])
    handlers.event(event(3, 'rehearsal.completed', { passed: false, releaseId: 'r-1' }))
    await settle()
    expect(t.sent.map(({ subject }) => subject)).toEqual([
      "Reading responses: the dry run didn't sign anyone in",
    ])
  })

  it('after a restart, what happened while we were stopped is news; what we held is not', async () => {
    const first = await live()
    first.handlers.event(approved(1))
    await settle()
    first.keeper.stop()
    const t = setUp({ store: first.store, key: first.key })
    t.keeper.start()
    const handlers = t.open()[0]!.handlers
    handlers.event(approved(1))
    handlers.event(event(2, 'rehearsal.completed', { passed: true, releaseId: 'r-1' }))
    handlers.replayed!({ ids: [approved(1).id, event(2).id], overlapped: true })
    await settle()
    expect(first.sent).toHaveLength(1)
    expect(t.sent.map(({ subject }) => subject)).toEqual([
      'Reading responses: the dry run worked',
    ])
  })

  it('member.added is emailed once the members are read again, naming the one added', async () => {
    const t = await live([member(ALICE), member(BOB, 'collaborator'), carol])
    const dan: KeptMember = {
      userId: DAN,
      role: 'collaborator',
      displayName: 'Dan New',
      email: 'dan@example.test',
    }
    t.w.members.set(P1, [member(ALICE), member(BOB, 'collaborator'), carol, dan])
    t.handlers.event(
      event(4, 'member.added', {
        memberId: DAN,
        role: 'collaborator',
        previousRole: null,
        userId: ALICE,
      }),
    )
    await settle()
    expect(t.sent.map(({ to, subject }) => ({ to, subject }))).toEqual([
      { to: 'carol@example.test', subject: 'Reading responses: Dan New was added' },
    ])
  })

  it('member.removed is emailed with the members as they were, naming the one removed', async () => {
    const t = await live([member(ALICE), member(BOB, 'collaborator'), carol])
    t.w.members.set(P1, [member(ALICE), carol])
    t.handlers.event(event(5, 'member.removed', { memberId: BOB, userId: ALICE }))
    await settle()
    expect(t.sent.map(({ to, subject }) => ({ to, subject }))).toEqual([
      {
        to: 'carol@example.test',
        subject: 'Reading responses: Bob Helper was taken off it',
      },
    ])
    expect(t.store.members(P1)).toEqual([member(ALICE), carol])
  })

  describe('their agent’s question (F6b Task 12, Decision 14)', () => {
    const Q = 'q1000000-0000-4000-8000-000000000001'
    const T = 't1000000-0000-4000-8000-000000000001'
    const created = (n: number, id = Q) =>
      event(n, 'pending_action.created', {
        pendingActionId: id,
        tokenId: T,
        action: 'members:manage',
      })

    it('pending_action.created: each owner emailed once, its agent named as our page kept it; never a helper', async () => {
      const t = await live([member(ALICE), member(BOB, 'collaborator'), carol])
      t.store.rememberPerson({
        id: ALICE,
        displayName: 'Alice Instructor',
        email: 'alice@example.test',
      })
      t.store.keepMinted({
        tokenId: T,
        projectId: P1,
        personId: ALICE,
        purpose: 'agent',
        conversationId: null,
        name: 'Claude Code',
        expiresAt: inDays(30),
        mintedAt: NOW.toISOString(),
      })
      t.handlers.event(created(6))
      await settle()
      expect(t.sent.map(({ to, subject }) => ({ to, subject }))).toEqual([
        {
          to: 'alice@example.test',
          subject: 'Reading responses: your agent is asking something',
        },
        {
          to: 'carol@example.test',
          subject: 'Reading responses: your agent is asking something',
        },
      ])
      expect(t.sent[0]!.text).toContain(
        "Your agent 'Claude Code' asked to change who's on",
      )
      expect(t.sent[0]!.text).toContain(`${ORIGIN}/apps/reading-responses/agents`)
      // Written to history as every event is (the band reads it there).
      expect(t.store.historyOf(P1).map((entry) => entry.type)).toContain(
        'pending_action.created',
      )
    })

    it('its agent stopping sooner than the day: the email says when its token ends (the platform’s cap, its faculty-ready Task 13)', async () => {
      const t = await live()
      const ends = '2026-10-01T20:00:00.000Z'
      t.store.rememberPerson({
        id: ALICE,
        displayName: 'Alice Instructor',
        email: 'alice@example.test',
      })
      t.store.keepMinted({
        tokenId: T,
        projectId: P1,
        personId: ALICE,
        purpose: 'agent',
        conversationId: null,
        name: 'Claude Code',
        expiresAt: ends,
        mintedAt: NOW.toISOString(),
      })
      t.handlers.event(created(6))
      await settle()
      const day = new Date(Date.parse(created(6).at) + DAY).toISOString()
      expect(t.sent[0]!.text).toContain(
        `It stops waiting at ${clockOf(ends)} on ${dayOf(ends)}.`,
      )
      expect(t.sent[0]!.text).not.toContain(clockOf(day))
    })

    it('an agent our page did not make is "An agent"', async () => {
      const t = await live()
      t.handlers.event(created(6))
      await settle()
      expect(t.sent[0]!.text).toMatch(/^An agent asked to /)
    })

    it('heard again (a replay, a reconnect) sends nothing more; another question is its own email', async () => {
      const t = await live()
      t.handlers.event(created(6))
      t.handlers.event(created(6))
      t.handlers.event(created(7, 'q2000000-0000-4000-8000-000000000002'))
      await settle()
      expect(t.sent).toHaveLength(2)
    })

    it('in the first replay of an app we never watched: its past, written and emailed to nobody', async () => {
      const t = setUp()
      await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
      const handlers = t.open()[0]!.handlers
      handlers.event(created(6))
      handlers.replayed!({ ids: [created(6).id], overlapped: false })
      await settle()
      expect(t.store.historyOf(P1)).toHaveLength(1)
      expect(t.sent).toEqual([])
    })

    it('its answer, and anything else of its kind, emails nobody', async () => {
      const t = await live()
      for (const [n, type] of [
        [8, 'pending_action.confirmed'],
        [9, 'pending_action.rejected'],
      ] as const)
        t.handlers.event(
          event(n, type, { pendingActionId: Q, tokenId: T, action: 'members:manage' }),
        )
      await settle()
      expect(t.sent).toEqual([])
    })
  })

  it('at boot, an email claimed and never finished is sent (Review Focus 1)', async () => {
    const t = setUp()
    t.store.claimEmail({
      key: { kind: 'over', happening: `${P1}:e1`, recipient: 'alice@example.test' },
      subject: 'Reading responses: signed off',
      text: 'words',
    })
    t.keeper.start()
    await settle()
    expect(t.sent).toEqual([
      {
        to: 'alice@example.test',
        subject: 'Reading responses: signed off',
        text: 'words',
      },
    ])
    expect(t.store.emailsUnfinished()).toEqual([])
  })
})

describe('someone taken off the app: their work here ends, once (F6b Task 4, Decision 5)', () => {
  const carol: KeptMember = {
    userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    role: 'owner',
    displayName: 'Carol Owner',
    email: 'carol@example.test',
  }

  /** Handed, its first replay over, and who the keeper says was taken off. */
  async function live(
    members: KeptMember[] = [member(ALICE), member(BOB, 'collaborator')],
  ) {
    const t = setUp()
    const removed: [string, string][] = []
    t.keeper.onRemoved((projectId, personId) => removed.push([projectId, personId]))
    t.w.members.set(P1, members)
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
    const handlers = t.open()[0]!.handlers
    handlers.replayed!({ ids: [], overlapped: false })
    return { ...t, handlers, removed }
  }

  it('member.removed: their work ended once, the members kept without them, and the other owners told once', async () => {
    const t = await live([member(ALICE), member(BOB, 'collaborator'), carol])
    t.w.members.set(P1, [member(ALICE), carol])
    t.handlers.event(event(5, 'member.removed', { memberId: BOB, userId: ALICE }))
    await settle()
    expect(t.removed).toEqual([[P1, BOB]])
    expect(t.store.members(P1)).toEqual([member(ALICE), carol])
    expect(t.sent.map(({ to, subject }) => ({ to, subject }))).toEqual([
      {
        to: 'carol@example.test',
        subject: 'Reading responses: Bob Helper was taken off it',
      },
    ])
  })

  it('member.removed whose members cannot be read again: the event alone ends their work', async () => {
    const t = await live()
    t.w.watching.members = async () => {
      throw new PlatformRefusal('PLATFORM_UNAVAILABLE', 502)
    }
    t.handlers.event(event(5, 'member.removed', { memberId: BOB, userId: ALICE }))
    await settle()
    expect(t.removed).toEqual([[P1, BOB]])
    expect(t.store.members(P1)).toEqual([member(ALICE)])
  })

  it('no event, and the members read again without someone we kept (FE-48: the hand-over after a 4401): their work ended, once', async () => {
    const t = await live()
    // Removing the one whose token we watch with closes our stream before the event (FE-48).
    t.refuse(t.open()[0]!)
    t.w.members.set(P1, [member(ALICE)])
    expect(await t.keeper.hand(P1, handed(TOKEN_B, ID_B), ALICE)).toBe('kept')
    await settle()
    expect(t.removed).toEqual([[P1, BOB]])
    // Read again, and again: they were ended once.
    t.open()[0]!.handlers.reconnected()
    await settle()
    expect(t.removed).toEqual([[P1, BOB]])
  })

  it('a reconnect’s re-read that no longer lists someone: their work ended', async () => {
    const t = await live()
    t.w.members.set(P1, [member(ALICE)])
    t.handlers.reconnected()
    await settle()
    expect(t.removed).toEqual([[P1, BOB]])
  })

  it('left (the whole-branch review’s I1): someone who took themselves off, by their own word: kept no more, their work ended once, nobody emailed', async () => {
    const t = await live([member(ALICE), member(BOB, 'collaborator'), carol])
    expect(t.keeper.left(P1, BOB)).toBe(true)
    await settle()
    expect(t.removed).toEqual([[P1, BOB]])
    expect(t.store.members(P1)).toEqual([member(ALICE), carol])
    expect(t.sent).toEqual([])
    // Twice is once; someone we never kept, or an app we keep nobody for: nothing.
    expect(t.keeper.left(P1, BOB)).toBe(false)
    expect(t.keeper.left(P1, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')).toBe(false)
    expect(t.keeper.left(P2, ALICE)).toBe(false)
    expect(t.removed).toEqual([[P1, BOB]])
  })

  it('left, by someone still on it: the next members read keeps them again (only their own standing was lowered)', async () => {
    const t = await live()
    expect(t.keeper.left(P1, BOB)).toBe(true)
    t.handlers.reconnected()
    await settle()
    expect(t.store.members(P1)).toEqual([member(ALICE), member(BOB, 'collaborator')])
    expect(t.removed).toEqual([[P1, BOB]])
  })

  it('ending one person’s work throws (minors m79): the others are still ended, that one is no member meanwhile, and is ended at the next read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const t = await live([member(ALICE), member(BOB, 'collaborator'), carol])
    let failing = true
    t.keeper.onRemoved((projectId, personId) => {
      if (failing && personId === BOB) throw new Error('database is locked')
      t.removed.push([projectId, personId])
    })
    t.w.members.set(P1, [member(ALICE)])
    t.handlers.reconnected()
    await settle()
    expect(t.removed).toEqual([[P1, carol.userId]])
    expect(error).toHaveBeenCalledTimes(1)
    // Taken off is taken off: no standing here while their ending waits (the review of m79).
    expect(t.store.members(P1)).toEqual([member(ALICE)])
    failing = false
    t.handlers.reconnected()
    await settle()
    expect(t.removed).toEqual([
      [P1, carol.userId],
      [P1, BOB],
    ])
    expect(t.store.members(P1)).toEqual([member(ALICE)])
    // Ended once: a read after it ends nobody again.
    t.handlers.reconnected()
    await settle()
    expect(t.removed).toHaveLength(2)
    error.mockRestore()
  })

  it('a re-read that lists nobody (minors m80): ignored, every app has an owner; nobody ended, the members kept', async () => {
    const t = await live()
    t.w.members.set(P1, [])
    t.handlers.reconnected()
    await settle()
    expect(t.removed).toEqual([])
    expect(t.store.members(P1)).toEqual([member(ALICE), member(BOB, 'collaborator')])
  })

  it('a re-read that still lists everyone: nothing ended', async () => {
    const t = await live()
    t.handlers.reconnected()
    t.handlers.event(event(6, 'member.added', { memberId: BOB, role: 'owner' }))
    await settle()
    expect(t.removed).toEqual([])
  })

  it('member.removed in the first replay of an app we never watched is its past: nothing ended by it', async () => {
    const t = setUp()
    const removed: [string, string][] = []
    t.keeper.onRemoved((projectId, personId) => removed.push([projectId, personId]))
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
    t.open()[0]!.handlers.event(
      event(1, 'member.removed', { memberId: BOB, userId: ALICE }),
    )
    await settle()
    // Taken off once, and on it again now (the members still list them).
    expect(removed).toEqual([])
  })
})

describe('your work is waiting (Decision 14)', () => {
  const runOf = (conversationId: string, status: Run['status']): Run => ({
    id: `run-${conversationId}-1`,
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
  })

  /** Alice's conversation on the kept app, in this state, its run in this status. */
  async function waiting(
    state: 'built' | 'building',
    status: Run['status'],
    options: { kept?: boolean } = {},
  ) {
    const t = setUp()
    t.store.rememberPerson({
      id: ALICE,
      displayName: 'Alice Instructor',
      email: 'alice@example.test',
    })
    if (options.kept !== false) await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
    const made = t.store.createConversation(ALICE, 'Add a word count.')
    const conversation = t.store.setState(made.id, state, { projectId: P1 })
    t.store.saveRun(runOf(conversation.id, status))
    return { ...t, conversation }
  }

  it('built, with no page holding it: we have finished, to the person, once per run', async () => {
    const t = await waiting('built', 'done')
    t.keeper.workEnded(t.conversation)
    t.keeper.workEnded(t.conversation)
    await settle()
    expect(t.sent.map(({ to, subject }) => ({ to, subject }))).toEqual([
      { to: 'alice@example.test', subject: "Reading responses: we've finished" },
    ])
    expect(t.sent[0]!.text).toContain(
      `${ORIGIN}/apps/reading-responses/conversations/${t.conversation.id}`,
    )
  })

  it('waiting on them: we need you', async () => {
    const t = await waiting('building', 'needs-you')
    t.keeper.workEnded(t.conversation)
    await settle()
    expect(t.sent.map(({ subject }) => subject)).toEqual([
      'Reading responses: we need you',
    ])
  })

  it('a round stopped because its person was taken off the app: nothing (F6b Review Focus 1)', async () => {
    const t = await waiting('building', 'stopped')
    t.store.saveRun({
      ...runOf(t.conversation.id, 'stopped'),
      detail: {
        ...NO_DETAIL,
        stopped: { by: ALICE, why: 'removed' },
      },
    })
    t.keeper.workEnded(t.conversation)
    await settle()
    expect(t.sent).toEqual([])
  })

  it('a colleague’s page holding its stream: its own person is still told, and only they (F6b D3, the review’s I1)', async () => {
    const t = await waiting('building', 'needs-you')
    t.pages.add(`${t.conversation.id} ${BOB}`)
    t.keeper.workEnded(t.conversation)
    await settle()
    expect(t.sent.map(({ to, subject }) => ({ to, subject }))).toEqual([
      { to: 'alice@example.test', subject: 'Reading responses: we need you' },
    ])
  })

  it('a page holding its stream: nothing (they are watching)', async () => {
    const t = await waiting('built', 'done')
    t.pages.add(`${t.conversation.id} ${ALICE}`)
    t.keeper.workEnded(t.conversation)
    await settle()
    expect(t.sent).toEqual([])
  })

  it('still working, or an app we do not keep: nothing', async () => {
    const working = await waiting('building', 'working')
    working.keeper.workEnded(working.conversation)
    const unkept = await waiting('built', 'done', { kept: false })
    unkept.keeper.workEnded(unkept.conversation)
    await settle()
    expect([...working.sent, ...unkept.sent]).toEqual([])
  })

  it('once an hour: waiting on its person, untouched for a day, is still waiting for you, once', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date', 'setInterval', 'clearInterval'] })
    try {
      const t = await waiting('building', 'needs-you')
      t.keeper.start()
      for (let hour = 1; hour <= 23; hour++) {
        t.later(HOUR)
        vi.advanceTimersByTime(HOUR)
      }
      await settle()
      expect(t.sent).toEqual([])
      for (let hour = 24; hour <= 27; hour++) {
        t.later(HOUR)
        vi.advanceTimersByTime(HOUR)
      }
      await settle()
      expect(t.sent.map(({ to, subject }) => ({ to, subject }))).toEqual([
        { to: 'alice@example.test', subject: 'Reading responses: still waiting for you' },
      ])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('the live-address watch (Task 6: Decision 8, design §4)', () => {
  const LAUNCHED = '2026-09-30T17:00:00.000Z'
  const URL_A = 'https://reading-responses.manifest.internal'
  const MINUTE = 60_000

  // Only the minute's timer is faked: the keeper's own waits and `settle` stay real.
  beforeEach(() => void vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }))
  afterEach(() => void vi.useRealTimers())

  /** A launched, switched-on app, its token kept and its first replay over. */
  async function watchedLive(
    options: Parameters<typeof setUp>[0] = {},
    patch: Partial<KeptApp> = {},
  ) {
    const t = setUp(options)
    t.w.reads.set(TOKEN_A, appOf(P1, { launchedAt: LAUNCHED, ...patch }))
    t.keeper.start()
    await t.keeper.hand(P1, handed(TOKEN_A, ID_A), ALICE)
    t.open()[0]!.handlers.replayed!({ ids: [], overlapped: false })
    return t
  }

  /** n minutes pass, one probe each; what each probe was asked at, oldest first. */
  async function minutes(t: ReturnType<typeof setUp>, n: number) {
    const ats: string[] = []
    for (let i = 0; i < n; i++) {
      t.later(MINUTE)
      ats.push(t.now().toISOString())
      await vi.advanceTimersByTimeAsync(MINUTE)
      await settle()
    }
    return ats
  }

  const ours = (t: ReturnType<typeof setUp>) =>
    t.store
      .historyOf(P1)
      .filter((entry) => entry.type.startsWith('keeping.'))
      .map(({ type, detail }) => ({ type, detail }))
  const subjects = (t: ReturnType<typeof setUp>) => t.sent.map(({ subject }) => subject)
  const CANT_REACH = "Reading responses: your students can't reach it"
  const ANSWERING_AGAIN = 'Reading responses is answering again'

  it('once a minute, one look at a launched, switched-on, kept app’s students’ address', async () => {
    const t = await watchedLive()
    await minutes(t, 3)
    expect(t.p.asked).toEqual([URL_A, URL_A, URL_A])
  })

  it.each<[string, Partial<KeptApp>]>([
    ['never launched', { launchedAt: null }],
    ['switched off', { state: 'archived' }],
    ['with no students’ address', { studentsUrl: null }],
  ])('an app %s is not looked at', async (_name, patch) => {
    const t = await watchedLive({}, patch)
    await minutes(t, 2)
    expect(t.p.asked).toEqual([])
  })

  it('the look is every 60 s by default', async () => {
    const t = await watchedLive()
    await vi.advanceTimersByTimeAsync(MINUTE - 1)
    expect(t.p.asked).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(t.p.asked).toEqual([URL_A])
  })

  it('a look interval its caller gives is honoured (a dependency of the keeper, never a setting)', async () => {
    const t = await watchedLive({ lookEveryMs: 5_000 })
    await vi.advanceTimersByTimeAsync(4_999)
    expect(t.p.asked).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(t.p.asked).toEqual([URL_A])
    await vi.advanceTimersByTimeAsync(10_000)
    expect(t.p.asked).toEqual([URL_A, URL_A, URL_A])
  })

  it('an app we keep with no token (refused) is not looked at', async () => {
    const t = await watchedLive()
    t.refuse(t.open()[0]!)
    await minutes(t, 2)
    expect(t.p.asked).toEqual([])
  })

  it('mock mode (probing false): nothing is looked at (Decision 12)', async () => {
    const t = await watchedLive({ probing: false })
    await minutes(t, 3)
    expect(t.p.asked).toEqual([])
  })

  it('one miss is nothing; the second: a keeping.unreachable row from the first, and every owner told once', async () => {
    const t = await watchedLive()
    t.p.answer(DOWN)
    const [first] = await minutes(t, 1)
    expect(ours(t)).toEqual([])
    expect(t.sent).toEqual([])
    await minutes(t, 3)
    expect(ours(t)).toEqual([{ type: 'keeping.unreachable', detail: { from: first } }])
    expect(t.sent.map(({ to, subject }) => ({ to, subject }))).toEqual([
      { to: 'alice@example.test', subject: CANT_REACH },
    ])
    expect(t.keeper.outage(P1)).toMatchObject({ state: 'down', from: first })
  })

  it('three answers in a row after: a keeping.answering row from the fall to the first answer, and every owner told', async () => {
    const t = await watchedLive()
    t.p.answer(DOWN)
    const [from] = await minutes(t, 2)
    t.p.answer(UP)
    const [to] = await minutes(t, 3)
    expect(ours(t)).toEqual([
      { type: 'keeping.unreachable', detail: { from } },
      { type: 'keeping.answering', detail: { from, to } },
    ])
    expect(subjects(t)).toEqual([CANT_REACH, ANSWERING_AGAIN])
    expect(t.keeper.outage(P1)).toEqual({
      state: 'answering',
      recovered: { from, to },
    })
  })

  it('a restart in the middle of an outage starts down (Review Focus 1): no second email, and its recovery is from the first fall', async () => {
    const first = await watchedLive()
    first.p.answer(DOWN)
    const [from] = await minutes(first, 2)
    expect(subjects(first)).toEqual([CANT_REACH])
    first.keeper.stop()

    const t = setUp({ store: first.store, key: first.key })
    t.w.reads.set(TOKEN_A, appOf(P1, { launchedAt: LAUNCHED }))
    t.later(5 * MINUTE)
    t.keeper.start()
    expect(t.keeper.outage(P1)).toMatchObject({ state: 'down', from })
    t.p.answer(DOWN)
    await minutes(t, 3)
    expect(t.sent).toEqual([])
    t.p.answer(UP)
    const [to] = await minutes(t, 3)
    expect(subjects(t)).toEqual([ANSWERING_AGAIN])
    expect(ours(t).at(-1)).toEqual({ type: 'keeping.answering', detail: { from, to } })
  })

  it('a flapping app, down, up, down, up within 20 minutes, sends two emails in all (Review Focus 3)', async () => {
    const t = await watchedLive()
    for (const [answer, n] of [
      [DOWN, 2],
      [UP, 3],
      [DOWN, 2],
      [UP, 3],
    ] as const) {
      t.p.answer(answer)
      await minutes(t, n)
    }
    expect(subjects(t)).toEqual([CANT_REACH, ANSWERING_AGAIN])
    // The history still says each fall: the second told to nobody.
    expect(
      ours(t).map(({ type, detail }) => [type, (detail as { again?: boolean }).again]),
    ).toEqual([
      ['keeping.unreachable', undefined],
      ['keeping.answering', undefined],
      ['keeping.unreachable', true],
      ['keeping.answering', true],
    ])
  })

  it('switched off (410) is never down: no row, no email', async () => {
    const t = await watchedLive()
    t.p.answer(OFF)
    await minutes(t, 5)
    expect(ours(t)).toEqual([])
    expect(t.sent).toEqual([])
    expect(t.keeper.outage(P1)).toEqual({ state: 'off' })
  })

  it('outage: answering for an app never looked at, and read from history in mock mode', async () => {
    const t = await watchedLive({ probing: false })
    expect(t.keeper.outage(P1)).toEqual({ state: 'answering', recovered: null })
    t.store.addHistory({
      id: `keeping.unreachable:${P1}:x`,
      projectId: P1,
      at: '2026-10-01T17:00:00.000Z',
      type: 'keeping.unreachable',
      detail: { from: '2026-10-01T17:00:00.000Z' },
    })
    expect(t.keeper.outage(P1)).toMatchObject({
      state: 'down',
      from: '2026-10-01T17:00:00.000Z',
    })
  })
})
