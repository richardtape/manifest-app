import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../app.js'
import type { Rounds } from '../build/round.js'
import type { Config } from '../config.js'
import type { Handed, Keeper } from '../keeping/keeper.js'
import type { Outage } from '../keeping/outage.js'
import { PlatformRefusal } from '../platform/refusal.js'
import { openStore, type Store } from '../store/db.js'
import type { KeptApp, KeptMember } from '../store/keeping.js'
import { ALICE, AS_ALICE, AS_BOB, AS_CAROL, BOB, fakeControlPlane } from './testing.js'

/**
 * F6 TASK 3: THE WATCH TOKEN HANDED OVER (design §1). The page mints a *Keeping watch* token in
 * the person's session (no step-up) and hands it here; our server asks the keeper to keep it.
 * Guarded as every change is (`Origin`, the person), and an app's keeping is its members' alone:
 * anyone else is `404`, as the platform answers a stranger (Review Focus 5).
 */
const ORIGIN = 'https://app.manifest.internal'
const PROJECT = '22222222-2222-4222-8222-222222222222'
const TOKEN_ID = 'a0000000-0000-4000-8000-000000000001'
const UNTIL = '2027-10-01T18:00:00.000Z'

let platform: Awaited<ReturnType<typeof fakeControlPlane>>
beforeAll(async () => {
  platform = await fakeControlPlane()
})
afterAll(() => platform.close())

const cleanups: (() => Promise<unknown> | void)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

/** A keeper that records what it was handed and forgot, and answers as told. */
function fakeKeeper(did: string[]) {
  const hands: { projectId: string; handed: Handed; personId: string }[] = []
  let answer: () => Promise<'kept' | 'current' | 'stranger'> = async () => 'kept'
  let watching = false
  let mintedBy: string | null = null
  /** Task 6's watch, as each app's outage reads. */
  const outages = new Map<string, Outage>()
  const keeper: Keeper = {
    start: () => undefined,
    stop: () => undefined,
    forget: (projectId) => void did.push(`forget ${projectId}`),
    workEnded: () => undefined,
    outage: (projectId) =>
      outages.get(projectId) ?? { state: 'answering', recovered: null },
    async hand(projectId, handed, personId) {
      hands.push({ projectId, handed, personId })
      return answer()
    },
    status: () =>
      watching
        ? { watching: true, until: UNTIL, tokenId: TOKEN_ID, mintedBy }
        : { watching: false, until: null, tokenId: null, mintedBy: null },
  }
  return {
    keeper,
    hands,
    outages,
    answers: (next: () => Promise<'kept' | 'current' | 'stranger'>) =>
      void (answer = next),
    watches: (by: string) => {
      watching = true
      mintedBy = by
    },
  }
}

/** Rounds that only record a Stop (Decision 11: a round working on a forgotten app stops first). */
function stoppingRounds(did: string[]): Rounds {
  return {
    start: () => undefined,
    carryOn: () => undefined,
    withoutToken: () => undefined,
    message: () => undefined,
    answer: () => 'unknown',
    stop: (conversation) => void did.push(`stop ${conversation.id}`),
    interruptedOnBoot: () => undefined,
  }
}

function setUp() {
  const store: Store = openStore(':memory:')
  const did: string[] = []
  const k = fakeKeeper(did)
  const config: Config = {
    mode: 'edge',
    port: 7105,
    origin: ORIGIN,
    platformOrigin: platform.origin,
    modelGateway: 'http://127.0.0.1:7106/v1',
    planModel: 'default-chat',
    smtpUrl: 'smtp://127.0.0.1:7111',
    mailFrom: 'Manifest <manifest@app.manifest.internal>',
  }
  const app = buildServer(config, () => undefined, {
    store,
    keeper: k.keeper,
    rounds: () => stoppingRounds(did),
  })
  cleanups.push(
    () => app.close(),
    () => store.close(),
  )
  const keepMembers = (...userIds: string[]) =>
    store.putMembers(
      PROJECT,
      userIds.map((userId) => ({
        userId,
        role: 'owner' as const,
        displayName: 'Someone',
        email: 'someone@example.test',
      })),
    )
  const get = (cookie?: string, projectId = PROJECT) =>
    app.inject({
      method: 'GET',
      url: `/api/apps/${projectId}/keeping`,
      headers: cookie === undefined ? {} : { cookie },
    })
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    app.inject({
      method: 'POST',
      url: `/api/apps/${PROJECT}/keeping`,
      headers: {
        cookie: AS_ALICE,
        origin: ORIGIN,
        'content-type': 'application/json',
        ...headers,
      },
      payload: typeof body === 'string' ? body : JSON.stringify(body),
    })
  /** Any request of ours, as the page sends it: the person's cookie, and our Origin for a change. */
  const ask = (
    method: 'GET' | 'DELETE',
    url: string,
    cookie: string | null = AS_ALICE,
    headers: Record<string, string> = {},
  ) =>
    app.inject({
      method,
      url,
      headers: {
        ...(cookie === null ? {} : { cookie }),
        ...(method === 'GET' ? {} : { origin: ORIGIN }),
        ...headers,
      },
    })
  return { store, did, ...k, keepMembers, get, post, ask }
}

const GOOD = { token: 'mft_test_r_a_watch_token', tokenId: TOKEN_ID, expiresAt: UNTIL }

describe('GET /api/apps/:projectId/keeping', () => {
  it('without a person is 401', async () => {
    const t = setUp()
    expect((await t.get()).statusCode).toBe(401)
  })

  it('an app we keep nothing for: not watching, so the page mints', async () => {
    const t = setUp()
    const response = await t.get(AS_ALICE)
    expect([response.statusCode, response.json()]).toEqual([
      200,
      { watching: false, until: null, tokenId: null, mine: false },
    ])
  })

  it('a member: whether we watch, until when, and whether they minted it', async () => {
    const t = setUp()
    t.keepMembers(ALICE.id, BOB.id)
    t.watches(ALICE.id)
    expect((await t.get(AS_ALICE)).json()).toEqual({
      watching: true,
      until: UNTIL,
      tokenId: TOKEN_ID,
      mine: true,
    })
    expect((await t.get(AS_BOB)).json()).toMatchObject({ watching: true, mine: false })
  })

  it('someone whose app it is not (its kept members exclude them) is 404 (Review Focus 5)', async () => {
    const t = setUp()
    t.keepMembers(BOB.id)
    t.watches(BOB.id)
    const response = await t.get(AS_ALICE)
    expect([response.statusCode, response.json()]).toEqual([
      404,
      { error: { code: 'NOT_FOUND' } },
    ])
  })

  it('not watching, its kept members gone stale (the watch closed 4401 with the members changed since): not watching, so their page mints (the whole-branch review’s I2)', async () => {
    const t = setUp()
    t.keepMembers(BOB.id)
    const response = await t.get(AS_ALICE)
    expect([response.statusCode, response.json()]).toEqual([
      200,
      { watching: false, until: null, tokenId: null, mine: false },
    ])
  })

  it('an id that is not one is 404', async () => {
    const t = setUp()
    expect((await t.get(AS_ALICE, 'not-a-project')).statusCode).toBe(404)
  })
})

describe('POST /api/apps/:projectId/keeping: the token handed over', () => {
  it('kept: 201, watching until when; the keeper was handed it, by this person', async () => {
    const t = setUp()
    t.answers(async () => {
      t.watches(ALICE.id)
      return 'kept'
    })
    const response = await t.post(GOOD)
    expect([response.statusCode, response.json()]).toEqual([
      201,
      { watching: true, until: UNTIL },
    ])
    expect(t.hands).toEqual([{ projectId: PROJECT, handed: GOOD, personId: ALICE.id }])
  })

  it('the app already has a good one (Decision 5): 200, current, so the page revokes its own', async () => {
    const t = setUp()
    t.keepMembers(ALICE.id)
    t.watches(BOB.id)
    t.answers(async () => 'current')
    const response = await t.post(GOOD)
    expect([response.statusCode, response.json()]).toEqual([
      200,
      { kept: 'current', until: UNTIL },
    ])
  })

  it('from a student app is 403 ORIGIN_REFUSED, and the keeper is never handed it', async () => {
    const t = setUp()
    const response = await t.post(GOOD, {
      origin: 'https://reading-responses.manifest.internal',
    })
    expect([response.statusCode, response.json()]).toEqual([
      403,
      { error: { code: 'ORIGIN_REFUSED' } },
    ])
    expect(t.hands).toEqual([])
  })

  it('someone whose app it is not, while we watch it, is 404, and the keeper is never handed it', async () => {
    const t = setUp()
    t.keepMembers(BOB.id)
    t.watches(BOB.id)
    const response = await t.post(GOOD)
    expect(response.statusCode).toBe(404)
    expect(t.hands).toEqual([])
  })

  it('not watching, its kept members gone stale: the token decides, read by the keeper (the whole-branch review’s I2)', async () => {
    const t = setUp()
    t.keepMembers(BOB.id)
    t.answers(async () => {
      t.watches(ALICE.id)
      return 'kept'
    })
    const kept = await t.post(GOOD)
    expect([kept.statusCode, kept.json()]).toEqual([
      201,
      { watching: true, until: UNTIL },
    ])
    expect(t.hands).toEqual([{ projectId: PROJECT, handed: GOOD, personId: ALICE.id }])
  })

  it('the keeper finds them a stranger by the token’s own members: 404, as a stranger is', async () => {
    const t = setUp()
    t.answers(async () => 'stranger')
    const response = await t.post(GOOD)
    expect([response.statusCode, response.json()]).toEqual([
      404,
      { error: { code: 'NOT_FOUND' } },
    ])
  })

  it.each([
    ['another key', { ...GOOD, extra: 1 }],
    ['a key missing', { token: GOOD.token, tokenId: GOOD.tokenId }],
    ['a token over 512 characters', { ...GOOD, token: `mft_${'x'.repeat(509)}` }],
    ['a token with a space', { ...GOOD, token: 'mft_ x' }],
    ['an empty token', { ...GOOD, token: '' }],
    ['a token id that is not one', { ...GOOD, tokenId: 'token-1' }],
    ['an expiry that is not a time', { ...GOOD, expiresAt: 'next year' }],
    ['an array', [GOOD]],
    ['no JSON', '{not json'],
  ])(
    '%s is 400 KEEPING_INVALID, and the keeper is never handed it',
    async (_name, body) => {
      const t = setUp()
      const response = await t.post(body)
      expect([response.statusCode, response.json()]).toEqual([
        400,
        { error: { code: 'KEEPING_INVALID' } },
      ])
      expect(t.hands).toEqual([])
    },
  )

  it.each([
    ['refused 404', new PlatformRefusal('NOT_FOUND', 404)],
    ['refused 401', new PlatformRefusal('UNAUTHENTICATED', 401)],
    ['refused 403', new PlatformRefusal('FORBIDDEN', 403)],
    ['for another project', new PlatformRefusal('TOKEN_NOT_FOR_PROJECT', null)],
  ])(
    'a token the keeper cannot keep (%s) is 400 TOKEN_NOT_FOR_PROJECT',
    async (_name, refusal) => {
      const t = setUp()
      t.answers(() => Promise.reject(refusal))
      const response = await t.post(GOOD)
      expect([response.statusCode, response.json()]).toEqual([
        400,
        { error: { code: 'TOKEN_NOT_FOR_PROJECT' } },
      ])
    },
  )

  it('the platform unreachable is 502 PLATFORM_UNAVAILABLE', async () => {
    const t = setUp()
    t.answers(() => Promise.reject(new PlatformRefusal('PLATFORM_UNAVAILABLE', null)))
    const response = await t.post(GOOD)
    expect([response.statusCode, response.json()]).toEqual([
      502,
      { error: { code: 'PLATFORM_UNAVAILABLE' } },
    ])
  })

  it('the token never reaches the store, nor any answer', async () => {
    const t = setUp()
    t.answers(async () => {
      t.watches(ALICE.id)
      return 'kept'
    })
    const response = await t.post(GOOD)
    expect(response.body).not.toContain('mft_')
    expect(t.store.watches()).toEqual([])
  })
})

// F6 TASK 7: WHAT THE PAGE READS (Decisions 7 and 11; design §2, §4, §5). Every route is the
// person's: an app's needs, lines and history answer its kept members alone (Review Focus 5).
const OTHER = '33333333-3333-4333-8333-333333333333'
const HOUR = 3_600_000
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
const LAUNCHED = ago(30 * 24 * HOUR)
const appOf = (projectId = PROJECT, patch: Partial<KeptApp> = {}): KeptApp => ({
  projectId,
  name: projectId === PROJECT ? 'Reading responses' : 'Class check-ins',
  slug: projectId === PROJECT ? 'reading-responses' : 'class-check-ins',
  state: 'active',
  launchedAt: LAUNCHED,
  studentsUrl: 'https://reading-responses.manifest.internal',
  ...patch,
})
const refOf = (projectId = PROJECT) => {
  const { name, slug } = appOf(projectId)
  return { projectId, name, slug }
}
const memberOf = (
  person: { id: string; displayName: string; email: string },
  role: KeptMember['role'] = 'owner',
): KeptMember => ({
  userId: person.id,
  role,
  displayName: person.displayName,
  email: person.email,
})

type T = ReturnType<typeof setUp>
/** An app the keeper keeps, and who is on it. */
function keep(
  t: T,
  projectId: string,
  members: KeptMember[],
  patch: Partial<KeptApp> = {},
) {
  t.store.putApp(appOf(projectId, patch))
  t.store.putMembers(projectId, members)
}
let n = 0
function happened(t: T, projectId: string, type: string, detail: unknown, at: string) {
  const id = `h${String(++n).padStart(4, '0')}`
  t.store.addHistory({ id, projectId, at, type, detail })
  return id
}
const signedOff = (t: T, projectId: string, at: string) =>
  happened(t, projectId, 'release.approved', { releaseId: 'r-1' }, at)
/** A conversation is someone's: they are remembered first (persons is its key's table). */
function changeBy(t: T, personId: string, projectId: string, title: string) {
  t.store.rememberPerson(personId === ALICE.id ? ALICE : BOB)
  return t.store.createChange(personId, projectId, title, 'words')
}
/** Their conversation on the app, waiting on them (its chip `attention`). */
function waitingOnThem(t: T, personId: string, projectId: string, title = 'Word count') {
  const change = changeBy(t, personId, projectId, title)
  return t.store.setState(change.id, 'plan-ready')
}
/** Their previous visit ended this long ago (Decision 7): when. */
function lastHere(t: T, person: typeof ALICE, msAgo: number) {
  const at = ago(msAgo)
  t.store.rememberPerson(person)
  t.store.visit(person.id, at)
  return at
}

describe('GET /api/needs (design §2: the band)', () => {
  it('without a person is 401', async () => {
    const t = setUp()
    expect((await t.ask('GET', '/api/needs', null)).statusCode).toBe(401)
  })

  it('nothing needs them: no needs', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE)])
    const response = await t.ask('GET', '/api/needs')
    expect([response.statusCode, response.json()]).toEqual([200, { needs: [] }])
  })

  it('a conversation of theirs on an app waiting on them is a question, with its app', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE)])
    const waiting = waitingOnThem(t, ALICE.id, PROJECT)
    // Working on, or waiting its turn: not theirs to answer.
    changeBy(t, ALICE.id, PROJECT, 'In the line')
    expect((await t.ask('GET', '/api/needs')).json()).toEqual({
      needs: [
        {
          kind: 'question',
          app: refOf(),
          conversationId: waiting.id,
          title: 'Word count',
          since: waiting.updatedAt,
        },
      ],
    })
  })

  it('the live address down: with whether they may start it again (an owner)', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE), memberOf(BOB, 'collaborator')])
    const from = ago(5 * 60_000)
    t.outages.set(PROJECT, {
      state: 'down',
      from,
      answers: 0,
      answered: null,
      again: false,
    })
    expect((await t.ask('GET', '/api/needs')).json()).toEqual({
      needs: [{ kind: 'down', app: refOf(), from, owner: true }],
    })
    expect((await t.ask('GET', '/api/needs', AS_BOB)).json()).toEqual({
      needs: [{ kind: 'down', app: refOf(), from, owner: false }],
    })
  })

  it('answering again: for a day after the recovery, then not', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE)])
    const from = ago(3 * HOUR)
    const to = ago(2 * HOUR)
    t.outages.set(PROJECT, { state: 'answering', recovered: { from, to } })
    expect((await t.ask('GET', '/api/needs')).json()).toEqual({
      needs: [{ kind: 'answering-again', app: refOf(), from, to }],
    })
    t.outages.set(PROJECT, {
      state: 'answering',
      recovered: { from: ago(26 * HOUR), to: ago(25 * HOUR) },
    })
    expect((await t.ask('GET', '/api/needs')).json()).toEqual({ needs: [] })
  })

  describe('a change that didn’t go live', () => {
    const INCIDENT = 'n1000000-0000-4000-8000-000000000001'
    const opened = (t: T, at: string, incidentId = INCIDENT) =>
      happened(
        t,
        PROJECT,
        'incident.opened',
        { environment: 'production', incidentId, releaseId: 'r-2' },
        at,
      )

    it('a production incident with no fix under way, since the last version that reached the students', async () => {
      const t = setUp()
      keep(t, PROJECT, [memberOf(ALICE), memberOf(BOB, 'collaborator')])
      const at = ago(HOUR)
      opened(t, at)
      expect((await t.ask('GET', '/api/needs')).json()).toEqual({
        needs: [
          { kind: 'change-failed', app: refOf(), incidentId: INCIDENT, at, owner: true },
        ],
      })
      expect((await t.ask('GET', '/api/needs', AS_BOB)).json()).toEqual({
        needs: [
          { kind: 'change-failed', app: refOf(), incidentId: INCIDENT, at, owner: false },
        ],
      })
    })

    it('anyone’s fix under way for it: not a need', async () => {
      const t = setUp()
      keep(t, PROJECT, [memberOf(ALICE), memberOf(BOB)])
      opened(t, ago(HOUR))
      const fix = changeBy(t, BOB.id, PROJECT, 'Fix')
      t.store.addMessage(fix.id, 'we', {
        kind: 'asked',
        change: 1,
        words: 'Fix',
        fix: { incidentId: INCIDENT, environment: 'production' },
      })
      expect((await t.ask('GET', '/api/needs')).json()).toEqual({ needs: [] })
    })

    it('a newer version reached the students since: not a need', async () => {
      const t = setUp()
      keep(t, PROJECT, [memberOf(ALICE)])
      const healthy = (instanceId: string, releaseId: string, at: string) =>
        happened(
          t,
          PROJECT,
          'instance.healthy',
          { environment: 'production', instanceId, releaseId, state: 'healthy' },
          at,
        )
      healthy('i-1', 'r-1', ago(3 * HOUR))
      opened(t, ago(2 * HOUR))
      healthy('i-3', 'r-3', ago(HOUR))
      expect((await t.ask('GET', '/api/needs')).json()).toEqual({ needs: [] })
    })

    it('before the app went live: not a need (F5’s Going live shows a first launch)', async () => {
      const t = setUp()
      keep(t, PROJECT, [memberOf(ALICE)], { launchedAt: null })
      opened(t, ago(HOUR))
      expect((await t.ask('GET', '/api/needs')).json()).toEqual({ needs: [] })
    })
  })

  it('a switched-off app: no down, no change (nothing is live); its questions still', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE)], { state: 'archived' })
    t.outages.set(PROJECT, {
      state: 'down',
      from: ago(HOUR),
      answers: 0,
      answered: null,
      again: false,
    })
    happened(
      t,
      PROJECT,
      'incident.opened',
      { environment: 'production', incidentId: 'n-1', releaseId: 'r-2' },
      ago(HOUR),
    )
    const waiting = waitingOnThem(t, ALICE.id, PROJECT)
    expect((await t.ask('GET', '/api/needs')).json()).toEqual({
      needs: [expect.objectContaining({ kind: 'question', conversationId: waiting.id })],
    })
  })

  it('another person’s app is not in it (Review Focus 5); ?projectId= keeps to one app, and a stranger’s is 404', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE)])
    keep(t, OTHER, [memberOf(BOB)])
    waitingOnThem(t, ALICE.id, PROJECT, 'Mine')
    waitingOnThem(t, BOB.id, OTHER, 'Bob’s')
    t.outages.set(OTHER, {
      state: 'down',
      from: ago(HOUR),
      answers: 0,
      answered: null,
      again: false,
    })
    const mine = (await t.ask('GET', '/api/needs')).json() as {
      needs: { title?: string }[]
    }
    expect(mine.needs.map((need) => need.title)).toEqual(['Mine'])
    expect(
      (await t.ask('GET', `/api/needs?projectId=${PROJECT}`)).json().needs,
    ).toHaveLength(1)
    const stranger = await t.ask('GET', `/api/needs?projectId=${OTHER}`)
    expect([stranger.statusCode, stranger.json()]).toEqual([
      404,
      { error: { code: 'NOT_FOUND' } },
    ])
    expect((await t.ask('GET', '/api/needs?projectId=nope')).statusCode).toBe(404)
  })

  it('records the visit (Decision 7), remembering the person first (S2)', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE)])
    expect(t.store.personEmail(ALICE.id)).toBeUndefined()
    const before = Date.now()
    await t.ask('GET', '/api/needs')
    expect(t.store.personEmail(ALICE.id)).toBe(ALICE.email)
    // Two hours on, the visit that call began has ended: it is when they were last here.
    const { lastHere: was } = t.store.visit(ALICE.id, ago(-2 * HOUR))
    expect(Date.parse(was!)).toBeGreaterThanOrEqual(before)
  })
})

describe('GET /api/since (design §2: Since you were last here)', () => {
  it('never here before: no lines, though things happened', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE)])
    signedOff(t, PROJECT, ago(HOUR))
    const response = await t.ask('GET', '/api/since')
    expect([response.statusCode, response.json()]).toEqual([
      200,
      { lastHere: null, lines: [] },
    ])
  })

  it('the lines since they were last here, across their apps, newest first, at most five, each naming its app', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE)])
    keep(t, OTHER, [memberOf(ALICE)])
    keep(t, '44444444-4444-4444-8444-444444444444', [memberOf(BOB)])
    const was = lastHere(t, ALICE, 10 * HOUR)
    signedOff(t, PROJECT, ago(11 * HOUR)) // before they left
    const ids = [9, 8, 7, 6, 5, 4].map((h, i) =>
      signedOff(t, i % 2 === 0 ? PROJECT : OTHER, ago(h * HOUR)),
    )
    signedOff(t, '44444444-4444-4444-8444-444444444444', ago(HOUR)) // Bob's
    const body = (await t.ask('GET', '/api/since')).json() as {
      lastHere: string
      lines: { id: string; app: { projectId: string } }[]
    }
    expect(body.lastHere).toBe(was)
    expect(body.lines.map((line) => line.id)).toEqual(ids.slice(1).reverse())
    expect(body.lines[0]).toMatchObject({
      app: refOf(OTHER),
      happening: { kind: 'signed-off', releaseId: 'r-1' },
      who: null,
      whom: null,
    })
  })

  it('a second load within the hour answers the same lastHere', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE)])
    lastHere(t, ALICE, 10 * HOUR)
    const first = (await t.ask('GET', '/api/since')).json()
    const second = (await t.ask('GET', '/api/since')).json()
    expect(second.lastHere).toBe(first.lastHere)
  })

  it('?projectId= keeps to one app; a stranger’s is 404', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE)])
    keep(t, OTHER, [memberOf(ALICE)])
    lastHere(t, ALICE, 10 * HOUR)
    const mine = signedOff(t, PROJECT, ago(HOUR))
    signedOff(t, OTHER, ago(HOUR))
    const body = (await t.ask('GET', `/api/since?projectId=${PROJECT}`)).json()
    expect(body.lines.map((line: { id: string }) => line.id)).toEqual([mine])
    expect((await t.ask('GET', `/api/since?projectId=${OTHER}`, AS_BOB)).statusCode).toBe(
      404,
    )
  })
})

describe('GET /api/apps/:projectId/history (design §2: Everything)', () => {
  const url = (projectId = PROJECT) => `/api/apps/${projectId}/history`

  it('a member: from the first event held, each gap, and every line, newest first', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE), memberOf(BOB, 'collaborator')])
    const first = signedOff(t, PROJECT, '2026-09-18T16:00:00.000Z')
    happened(
      t,
      PROJECT,
      'keeping.gap',
      { from: '2026-09-18T16:00:00.000Z', to: '2026-09-21T16:00:00.000Z' },
      '2026-09-18T16:00:00.000Z',
    )
    happened(t, PROJECT, 'build.started', {}, '2026-09-21T16:00:00.000Z')
    const second = signedOff(t, PROJECT, '2026-09-22T16:00:00.000Z')
    const response = await t.ask('GET', url(), AS_BOB)
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      from: '2026-09-18T16:00:00.000Z',
      gaps: [{ from: '2026-09-18T16:00:00.000Z', to: '2026-09-21T16:00:00.000Z' }],
      lines: [
        expect.objectContaining({ id: second }),
        expect.objectContaining({ id: first }),
      ],
    })
  })

  it('the lines read the kept app’s launch (S3): a healthy after it is a new version', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE)])
    const healthy = (instanceId: string, releaseId: string, at: string) =>
      happened(
        t,
        PROJECT,
        'instance.healthy',
        { environment: 'production', instanceId, releaseId, state: 'healthy' },
        at,
      )
    healthy('i-1', 'r-1', ago(3 * HOUR))
    const newer = healthy('i-2', 'r-2', ago(2 * HOUR))
    const { lines } = (await t.ask('GET', url())).json()
    expect(lines.map((line: { id: string }) => line.id)).toEqual([newer])
  })

  it('a switched-off app’s members still read it (kept members, no token)', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE)], { state: 'archived' })
    signedOff(t, PROJECT, ago(HOUR))
    expect((await t.ask('GET', url())).json().lines).toHaveLength(1)
  })

  it.each([
    ['someone not on it', () => [memberOf(BOB)], PROJECT],
    ['an app we keep nobody for', () => [], PROJECT],
    ['an id that is not one', () => [memberOf(ALICE)], 'not-a-project'],
  ])('%s is 404 (Review Focus 5)', async (_name, members, projectId) => {
    const t = setUp()
    keep(t, PROJECT, members())
    signedOff(t, PROJECT, ago(HOUR))
    const response = await t.ask('GET', url(projectId))
    expect([response.statusCode, response.json()]).toEqual([
      404,
      { error: { code: 'NOT_FOUND' } },
    ])
  })

  it('without a person is 401', async () => {
    const t = setUp()
    expect((await t.ask('GET', url(), null)).statusCode).toBe(401)
  })
})

describe('DELETE /api/apps/:projectId (Decision 11: a deleted draft forgotten)', () => {
  const url = (projectId = PROJECT) => `/api/apps/${projectId}`

  it('an owner: 204; a round working on any of its conversations stopped first, then the keeper forgets it', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE), memberOf(BOB)])
    const working = t.store.setState(changeBy(t, BOB.id, PROJECT, 'Bob’s').id, 'building')
    const paused = t.store.setState(changeBy(t, ALICE.id, PROJECT, 'Paused').id, 'paused')
    changeBy(t, ALICE.id, PROJECT, 'In the line')
    const elsewhere = t.store.setState(
      changeBy(t, ALICE.id, OTHER, 'Elsewhere').id,
      'building',
    )
    const response = await t.ask('DELETE', url())
    expect(response.statusCode).toBe(204)
    expect(t.did.slice(-1)).toEqual([`forget ${PROJECT}`])
    expect(t.did.slice(0, -1).sort()).toEqual(
      [`stop ${paused.id}`, `stop ${working.id}`].sort(),
    )
    expect(t.did).not.toContain(`stop ${elsewhere.id}`)
  })

  it('from another Origin is 403 ORIGIN_REFUSED, and nothing is forgotten', async () => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE)])
    const response = await t.ask('DELETE', url(), AS_ALICE, {
      origin: 'https://reading-responses.manifest.internal',
    })
    expect([response.statusCode, response.json()]).toEqual([
      403,
      { error: { code: 'ORIGIN_REFUSED' } },
    ])
    expect(t.did).toEqual([])
  })

  it.each([
    ['a helper', AS_BOB],
    ['a stranger', AS_CAROL],
  ])('%s is 404, and nothing is forgotten (Review Focus 5)', async (_name, cookie) => {
    const t = setUp()
    keep(t, PROJECT, [memberOf(ALICE), memberOf(BOB, 'collaborator')])
    const response = await t.ask('DELETE', url(), cookie)
    expect([response.statusCode, response.json()]).toEqual([
      404,
      { error: { code: 'NOT_FOUND' } },
    ])
    expect(t.did).toEqual([])
  })

  it('an app we keep nobody for, or an id that is not one, is 404', async () => {
    const t = setUp()
    expect((await t.ask('DELETE', url())).statusCode).toBe(404)
    expect((await t.ask('DELETE', url('not-a-project'))).statusCode).toBe(404)
    expect(t.did).toEqual([])
  })
})
