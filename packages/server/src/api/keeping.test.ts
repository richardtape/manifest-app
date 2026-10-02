import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../app.js'
import type { Config } from '../config.js'
import type { Handed, Keeper } from '../keeping/keeper.js'
import { PlatformRefusal } from '../platform/refusal.js'
import { openStore, type Store } from '../store/db.js'
import { ALICE, AS_ALICE, AS_BOB, BOB, fakeControlPlane } from './testing.js'

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

/** A keeper that records what it was handed, and answers as told. */
function fakeKeeper() {
  const hands: { projectId: string; handed: Handed; personId: string }[] = []
  let answer: () => Promise<'kept' | 'current'> = async () => 'kept'
  let watching = false
  let mintedBy: string | null = null
  const keeper: Keeper = {
    start: () => undefined,
    stop: () => undefined,
    forget: () => undefined,
    workEnded: () => undefined,
    outage: () => ({ state: 'answering', recovered: null }),
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
    answers: (next: () => Promise<'kept' | 'current'>) => void (answer = next),
    watches: (by: string) => {
      watching = true
      mintedBy = by
    },
  }
}

function setUp() {
  const store: Store = openStore(':memory:')
  const k = fakeKeeper()
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
  const app = buildServer(config, () => undefined, { store, keeper: k.keeper })
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
  return { store, ...k, keepMembers, get, post }
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

  it('someone whose app it is not is 404, and the keeper is never handed it', async () => {
    const t = setUp()
    t.keepMembers(BOB.id)
    const response = await t.post(GOOD)
    expect(response.statusCode).toBe(404)
    expect(t.hands).toEqual([])
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
