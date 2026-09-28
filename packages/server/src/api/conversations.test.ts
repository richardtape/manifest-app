import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../app.js'
import type { Config } from '../config.js'
import { openStore, type Store } from '../store/db.js'
import { dumpAll, scratchDir } from '../store/testing.js'
import { ALICE, AS_ALICE, AS_BOB, fakeControlPlane } from './testing.js'

/**
 * A CONVERSATION BELONGS TO THE PERSON WHO STARTED IT (Decision 3). Driven over real HTTP,
 * through the factory's front door, as the browser reaches it. The whole file shares one
 * fake control plane, and its last case says what that control plane ever saw.
 */
let platform: Awaited<ReturnType<typeof fakeControlPlane>>
beforeAll(async () => {
  platform = await fakeControlPlane()
})
afterAll(() => platform.close())

const ORIGIN = 'https://app.manifest.internal'
const closers: (() => Promise<unknown> | void)[] = []
afterEach(async () => {
  for (const close of closers.splice(0)) await close()
})

async function serve(): Promise<{ base: string; store: Store; file: string }> {
  const { dir, remove } = scratchDir()
  const file = join(dir, 'app.sqlite')
  const store = openStore(file)
  const config: Config = {
    mode: 'edge',
    port: 7105,
    origin: ORIGIN,
    platformOrigin: platform.origin,
  }
  const app: FastifyInstance = buildServer(config, (_, response) => response.end(), {
    store,
  })
  await app.listen({ host: '127.0.0.1', port: 0 })
  closers.push(
    () => app.close(),
    () => {
      store.close()
      remove()
    },
  )
  return {
    base: `http://127.0.0.1:${(app.server.address() as { port: number }).port}`,
    store,
    file,
  }
}

const WORDS =
  "A page where students post a response to the week's reading. They shouldn't see anyone else's until they've posted their own."

function start(base: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${base}/api/conversations`, {
    method: 'POST',
    headers: {
      cookie: AS_ALICE,
      origin: ORIGIN,
      'content-type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}
const count = (file: string) =>
  (JSON.parse(dumpAll(file)['conversations'] ?? '[]') as unknown[]).length

describe('POST /api/conversations', () => {
  it('is 201, a conversation in describing, the person’s, with their words verbatim', async () => {
    const { base } = await serve()
    const response = await start(base, { description: WORDS })
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({
      personId: ALICE.id,
      projectId: null,
      title: 'First build',
      state: 'describing',
      description: WORDS,
    })
  })

  it('without a person is 401, and from another origin is 403; neither makes a conversation', async () => {
    const { base, file } = await serve()
    expect((await start(base, { description: WORDS }, { cookie: '' })).status).toBe(401)
    expect(
      (
        await start(
          base,
          { description: WORDS },
          { origin: 'https://evil.staging.manifest.internal' },
        )
      ).status,
    ).toBe(403)
    expect(count(file)).toBe(0)
  })

  it.each([
    ['empty words', { description: '' }],
    ['only spaces', { description: '   \n ' }],
    ['more than 4,000 characters', { description: 'x'.repeat(4001) }],
    ['words that are not a string', { description: 42 }],
    ['a key we do not know', { description: WORDS, projectId: 'x' }],
    ['not JSON', '{"description":'],
  ])('%s is 400 DESCRIPTION_INVALID, and makes nothing', async (_, body) => {
    const { base, file } = await serve()
    const response = await start(base, body)
    expect([response.status, await response.json()]).toEqual([
      400,
      { error: { code: 'DESCRIPTION_INVALID' } },
    ])
    expect(count(file)).toBe(0)
  })
})

describe('GET /api/conversations/:id', () => {
  it('is 200 for its person, and 404 for another, exactly as for one that does not exist', async () => {
    const { base } = await serve()
    const made = (await (await start(base, { description: WORDS })).json()) as {
      id: string
    }
    const as = (cookie: string, id: string) =>
      fetch(`${base}/api/conversations/${id}`, { headers: { cookie } })

    const mine = await as(AS_ALICE, made.id)
    expect([mine.status, await mine.json()]).toEqual([
      200,
      expect.objectContaining({ id: made.id }),
    ])

    const theirs = await as(AS_BOB, made.id)
    const none = await as(AS_ALICE, '00000000-0000-4000-8000-000000000000')
    expect([theirs.status, await theirs.json()]).toEqual([
      404,
      { error: { code: 'NOT_FOUND' } },
    ])
    expect([none.status, await none.json()]).toEqual([
      404,
      { error: { code: 'NOT_FOUND' } },
    ])
  })
})

describe('Decision 1: no credential is kept', () => {
  it('after requests that carry a session, a token and a key, no table holds any of them', async () => {
    const { base, file } = await serve()
    const carrying = { authorization: 'Bearer mft_test_x', 'x-model-key': 'sk-test-y' }
    const made = (await (await start(base, { description: WORDS }, carrying)).json()) as {
      id: string
    }
    await fetch(`${base}/api/conversations/${made.id}`, {
      headers: { cookie: AS_ALICE, ...carrying },
    })
    await fetch(`${base}/api/problems`, {
      method: 'POST',
      headers: {
        cookie: AS_ALICE,
        origin: ORIGIN,
        'content-type': 'application/json',
        ...carrying,
      },
      body: JSON.stringify({
        reference: 'ABCD-0123',
        code: 'UNREACHABLE',
        at: new Date().toISOString(),
      }),
    })

    const everything = Object.values(dumpAll(file)).join('\n')
    expect(everything).toContain(WORDS.slice(0, 20))
    expect(everything).not.toMatch(/mft_|sk-|alice-session/)
  })
})

describe('FE-2: what the platform ever saw from us', () => {
  it('the only path it was ever sent a Cookie on, in this whole file, is /v1/me', () => {
    const withCookie = platform.seen.filter(
      (request) => request.headers.cookie !== undefined,
    )
    expect(withCookie.length).toBeGreaterThan(0)
    expect(new Set(withCookie.map((request) => request.url))).toEqual(new Set(['/v1/me']))
    expect(
      platform.seen.every((request) => request.headers.authorization === undefined),
    ).toBe(true)
  })
})
