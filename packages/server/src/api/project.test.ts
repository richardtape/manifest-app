import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../app.js'
import type { Config } from '../config.js'
import { createIntakeKeys } from '../platform/intake.js'
import { createConversationTokens } from '../platform/project.js'
import { openStore } from '../store/db.js'
import { dumpAll, scratchDir } from '../store/testing.js'
import { createHub } from './events.js'
import type { Progress } from './progress.js'
import { ALICE, AS_ALICE, AS_BOB, BOB, fakeControlPlane, type Seen } from './testing.js'

/**
 * THE END OF MOMENT 4, ON OUR SERVER (F2 Task 8): the browser made the project and minted
 * the conversation's token in the person's session, and hands us both. We keep the token in
 * memory only (Decision 1), and only once the platform has shown it sees that project: a
 * token sees exactly one.
 */
const ORIGIN = 'https://app.manifest.internal'
const PROJECT = '22222222-2222-4222-8222-222222222222'
const ANOTHER = '99999999-9999-4999-8999-999999999999'
/** The token of PROJECT; one of another project; one the platform answers another project to. */
const GOOD = 'mft_test_x_the_conversations_token'
const STRANGER = 'mft_test_x_another_projects_token'
const LIAR = 'mft_test_x_answers_another_project'
const DOWN = 'mft_test_x_the_platform_is_down'
/** The platform's own failure, with its request id (FE-30). */
const FAILED = 'mft_test_x_the_platform_failed'
const REQUEST_ID = '1f758a00-2575-409b-bf48-dfbc4218b118'
/** The token of ANOTHER: a second window's project, made at the same time. */
const SECOND = 'mft_test_x_the_second_windows_token'

const project = (id: string) => ({
  id,
  slug: 'reading-responses',
  name: 'Reading responses',
  blueprint: 'node-ts-mongo@1',
  starter: null,
})

let platform: Awaited<ReturnType<typeof fakeControlPlane>>
beforeAll(async () => {
  platform = await fakeControlPlane((seen: Seen) => {
    const bearer = /^Bearer (.+)$/.exec(seen.headers.authorization ?? '')?.[1]
    if (seen.url === `/v1/projects/${PROJECT}`) {
      if (bearer === GOOD) return { status: 200, body: project(PROJECT) }
      if (bearer === LIAR) return { status: 200, body: project(ANOTHER) }
      if (bearer === DOWN) return { status: 502, body: undefined }
      if (bearer === FAILED)
        return {
          status: 500,
          body: { error: { code: 'INTERNAL', message: 'm', requestId: REQUEST_ID } },
        }
      return {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'no such project' } },
      }
    }
    if (seen.url === `/v1/projects/${ANOTHER}` && bearer === SECOND)
      return { status: 200, body: project(ANOTHER) }
    return undefined
  })
})
afterAll(() => platform.close())

const cleanups: (() => Promise<unknown> | void)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

async function setUp() {
  const { dir, remove } = scratchDir()
  const file = join(dir, 'app.sqlite')
  const store = openStore(file)
  const hub = createHub()
  const tokens = createConversationTokens()
  const intakeKeys = createIntakeKeys()
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
  const app = buildServer(config, () => undefined, { store, hub, tokens, intakeKeys })
  cleanups.push(
    () => app.close(),
    () => store.close(),
    remove,
  )
  store.rememberPerson(ALICE)
  const conversation = store.createConversation(ALICE.id, 'A page where students post.')
  store.setState(conversation.id, 'naming')
  intakeKeys.put(conversation.id, {
    key: 'sk-test-y',
    baseUrl: 'http://127.0.0.1:7106/v1',
    model: 'default-chat',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  })
  const frames: Progress[] = []
  hub.subscribe(conversation.id, (frame) => frames.push(frame))
  const hand = (body: unknown, headers: Record<string, string> = {}) =>
    app.inject({
      method: 'POST',
      url: `/api/conversations/${conversation.id}/project`,
      headers: {
        cookie: AS_ALICE,
        origin: ORIGIN,
        'content-type': 'application/json',
        ...headers,
      },
      payload: JSON.stringify(body),
    })
  const now = () => store.getConversation(conversation.id, ALICE.id)!
  return { store, file, conversation, tokens, intakeKeys, frames, hand, now }
}

const asked = () => platform.seen.filter((s) => s.url?.startsWith('/v1/projects/'))

describe('POST /api/conversations/:id/project: the handover (moment 4’s end)', () => {
  it('checks the token sees that project, keeps it in memory, and ties the conversation to it: making', async () => {
    const s = await setUp()
    const before = asked().length
    const answer = await s.hand({ projectId: PROJECT, token: GOOD })
    expect(answer.statusCode).toBe(204)
    expect(s.tokens.get(s.conversation.id)).toBe(GOOD)
    expect(s.now()).toMatchObject({ state: 'making', projectId: PROJECT })
    // The platform was asked once, with the token and never the person's session (FE-2).
    const [check] = asked().slice(before)
    expect(check?.method).toBe('GET')
    expect(check?.headers.authorization).toBe(`Bearer ${GOOD}`)
    expect(check?.headers.cookie).toBeUndefined()
    // The whole state, with what was made: its name, address and blueprint.
    expect(s.frames.at(-1)).toMatchObject({
      kind: 'state',
      conversation: { state: 'making', projectId: PROJECT },
      intake: {
        project: {
          id: PROJECT,
          name: 'Reading responses',
          slug: 'reading-responses',
          blueprint: 'node-ts-mongo@1',
        },
      },
    })
  })

  it('the intake is over: its key is dropped', async () => {
    const s = await setUp()
    await s.hand({ projectId: PROJECT, token: GOOD })
    expect(s.intakeKeys.get(s.conversation.id)).toBeUndefined()
  })

  it('no table holds the token (Decision 1)', async () => {
    const s = await setUp()
    await s.hand({ projectId: PROJECT, token: GOOD })
    expect(Object.values(dumpAll(s.file)).join('\n')).not.toMatch(/mft_/)
  })

  it.each([
    ['another project’s token', STRANGER],
    ['a token the platform answers another project to', LIAR],
  ])('%s is 400 TOKEN_NOT_FOR_PROJECT, dropped, and nothing moves', async (_, token) => {
    const s = await setUp()
    const answer = await s.hand({ projectId: PROJECT, token })
    expect(answer.statusCode).toBe(400)
    expect(answer.json()).toEqual({ error: { code: 'TOKEN_NOT_FOR_PROJECT' } })
    expect(s.tokens.get(s.conversation.id)).toBeUndefined()
    expect(s.now()).toMatchObject({ state: 'naming', projectId: null })
    expect(s.intakeKeys.get(s.conversation.id)).toBeDefined()
  })

  it('a platform that cannot say is 502 PLATFORM_UNAVAILABLE, and nothing is kept', async () => {
    const s = await setUp()
    const answer = await s.hand({ projectId: PROJECT, token: DOWN })
    expect(answer.statusCode).toBe(502)
    expect(answer.json()).toEqual({ error: { code: 'PLATFORM_UNAVAILABLE' } })
    expect(s.tokens.get(s.conversation.id)).toBeUndefined()
    expect(s.now().state).toBe('naming')
  })

  it("m124: a platform that failed is 502 PLATFORM_UNAVAILABLE, carrying the platform's request id", async () => {
    const s = await setUp()
    const answer = await s.hand({ projectId: PROJECT, token: FAILED })
    expect([answer.statusCode, answer.json()]).toEqual([
      502,
      { error: { code: 'PLATFORM_UNAVAILABLE', platformRequestId: REQUEST_ID } },
    ])
    expect(s.tokens.get(s.conversation.id)).toBeUndefined()
  })

  it('from a student app is 403 ORIGIN_REFUSED, and the platform is never asked', async () => {
    const s = await setUp()
    const before = asked().length
    const answer = await s.hand(
      { projectId: PROJECT, token: GOOD },
      { origin: 'https://evil.staging.manifest.internal' },
    )
    expect(answer.statusCode).toBe(403)
    expect(asked()).toHaveLength(before)
    expect(s.tokens.get(s.conversation.id)).toBeUndefined()
  })

  it('another person’s conversation is 404, and nothing is kept', async () => {
    const s = await setUp()
    s.store.rememberPerson(BOB)
    const answer = await s.hand({ projectId: PROJECT, token: GOOD }, { cookie: AS_BOB })
    expect(answer.statusCode).toBe(404)
    expect(s.tokens.get(s.conversation.id)).toBeUndefined()
  })

  it.each([
    ['a missing token', { projectId: PROJECT }],
    ['an extra key', { projectId: PROJECT, token: GOOD, name: 'x' }],
    ['a project that is not an id', { projectId: '../me', token: GOOD }],
    ['a token that is not one', { projectId: PROJECT, token: 'two words' }],
  ])('%s is 400 PROJECT_INVALID', async (_, body) => {
    const s = await setUp()
    const answer = await s.hand(body)
    expect(answer.statusCode).toBe(400)
    expect(answer.json()).toEqual({ error: { code: 'PROJECT_INVALID' } })
  })

  it('before naming, there is no project to hand over: 409 CONVERSATION_STATE', async () => {
    const s = await setUp()
    s.store.setState(s.conversation.id, 'describing')
    expect((await s.hand({ projectId: PROJECT, token: GOOD })).statusCode).toBe(409)
  })

  it('AGAIN, after a restart (Review Focus 5): a new token for the same project is kept, and nothing else moves', async () => {
    const s = await setUp()
    await s.hand({ projectId: PROJECT, token: GOOD })
    s.tokens.drop(s.conversation.id)
    s.store.setState(s.conversation.id, 'planning')
    const again = await s.hand({ projectId: PROJECT, token: GOOD })
    expect(again.statusCode).toBe(204)
    expect(s.tokens.get(s.conversation.id)).toBe(GOOD)
    expect(s.now()).toMatchObject({ state: 'planning', projectId: PROJECT })
  })

  it('a token for another project, once one is tied, is 409 PROJECT_MISMATCH, and the platform is never asked', async () => {
    const s = await setUp()
    await s.hand({ projectId: PROJECT, token: GOOD })
    const before = asked().length
    const answer = await s.hand({ projectId: ANOTHER, token: STRANGER })
    expect(answer.statusCode).toBe(409)
    expect(answer.json()).toEqual({ error: { code: 'PROJECT_MISMATCH' } })
    expect(asked()).toHaveLength(before)
    expect(s.tokens.get(s.conversation.id)).toBe(GOOD)
  })
})

describe('two windows made a project each, at once (deferred Minor, Rich: the first wins)', () => {
  it('the first handover ties the conversation; the second is 409 PROJECT_MISMATCH, and its token is never kept', async () => {
    const s = await setUp()
    const [first, second] = await Promise.all([
      s.hand({ projectId: PROJECT, token: GOOD }),
      s.hand({ projectId: ANOTHER, token: SECOND }),
    ])
    const answers = [first, second].map((a) => a.statusCode)
    expect(answers.sort()).toEqual([204, 409])
    const [won, lost] = first.statusCode === 204 ? [first, second] : [second, first]
    expect(lost.json()).toEqual({ error: { code: 'PROJECT_MISMATCH' } })
    const winner =
      won === first ? { id: PROJECT, token: GOOD } : { id: ANOTHER, token: SECOND }
    expect(s.now()).toMatchObject({ state: 'making', projectId: winner.id })
    expect(s.tokens.get(s.conversation.id)).toBe(winner.token)
    // One project said in the conversation, the one it is tied to.
    const said = s.store
      .listMessages(s.conversation.id)
      .filter((m) => (m.body as { kind?: string }).kind === 'project')
    expect(said).toHaveLength(1)
  })
})

describe('FE-2: what the platform saw from us in this file', () => {
  it('a Cookie only on /v1/me; the project read only with the token', () => {
    const withCookie = platform.seen.filter((s) => s.headers.cookie !== undefined)
    expect(new Set(withCookie.map((s) => s.url))).toEqual(new Set(['/v1/me']))
    const reads = asked()
    expect(reads.length).toBeGreaterThan(0)
    expect(reads.every((s) => s.headers.authorization?.startsWith('Bearer mft_'))).toBe(
      true,
    )
  })
})

describe('the token’s id, kept beside nothing secret (F6b D5, Task 3)', () => {
  const TOKEN_ID = '0f000000-0000-4000-8000-000000000001'

  it('a hand-over naming its token’s id keeps it: the conversation’s, on its app, by its person', async () => {
    const s = await setUp()
    const answer = await s.hand({ projectId: PROJECT, token: GOOD, tokenId: TOKEN_ID })
    expect(answer.statusCode).toBe(204)
    expect(s.store.mintedOn(PROJECT)).toEqual([
      expect.objectContaining({
        tokenId: TOKEN_ID,
        projectId: PROJECT,
        personId: ALICE.id,
        purpose: 'conversation',
        conversationId: s.conversation.id,
      }),
    ])
    expect(JSON.stringify(dumpAll(s.file))).not.toContain('mft_')
  })

  it('a hand-over without one keeps nothing, and still works', async () => {
    const s = await setUp()
    expect((await s.hand({ projectId: PROJECT, token: GOOD })).statusCode).toBe(204)
    expect(s.store.mintedOn(PROJECT)).toEqual([])
  })

  it('an id that is not one is 400 PROJECT_INVALID, and nothing is kept', async () => {
    const s = await setUp()
    const answer = await s.hand({ projectId: PROJECT, token: GOOD, tokenId: 'mft_x' })
    expect(answer.statusCode).toBe(400)
    expect(answer.json()).toEqual({ error: { code: 'PROJECT_INVALID' } })
    expect(s.tokens.get(s.conversation.id)).toBeUndefined()
  })
})
