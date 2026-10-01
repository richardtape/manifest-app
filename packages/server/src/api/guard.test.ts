import Fastify, { type FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Config } from '../config.js'
import { guard } from './guard.js'
import { ALICE, AS_ALICE, fakeControlPlane } from './testing.js'

/**
 * DECISION 3: EVERY REQUEST TO OUR API IS JUDGED TWICE, who and from where. The second is
 * Review Focus 1: a student app on a sibling host is same-SITE, so the browser sends the
 * person's cookie with its POST, and only `Origin` tells it apart. Fastify's `inject` is
 * right here: the routing rule is not under test, the guard is.
 */
let platform: Awaited<ReturnType<typeof fakeControlPlane>>
beforeAll(async () => {
  platform = await fakeControlPlane()
})
afterAll(() => platform.close())

const EDGE_ORIGIN = 'https://app.manifest.internal'
const config = (mode: Config['mode'] = 'edge'): Config => ({
  mode,
  port: 7105,
  origin: mode === 'edge' ? EDGE_ORIGIN : 'http://127.0.0.1:7105',
  platformOrigin: platform.origin,
  modelGateway: 'http://127.0.0.1:7106/v1',
  planModel: 'default-chat',
})

/** An app with a guarded read and write, and a count of the times each handler went past its guard. */
function appWith(c: Config, person: 'required' | 'optional' = 'required') {
  const ran = { read: 0, write: 0 }
  const app: FastifyInstance = Fastify()
  const check = person === 'optional' ? guard(c, { person: 'optional' }) : guard(c)
  app.get('/api/thing', async (request, reply) => {
    const who = await check(request, reply)
    if (who === undefined) return reply
    ran.read++
    return { person: who.person ?? null }
  })
  app.post('/api/thing', async (request, reply) => {
    const who = await check(request, reply)
    if (who === undefined) return reply
    ran.write++
    return { person: who.person ?? null }
  })
  return { app, ran }
}

const refusal = (code: string) => ({ error: { code } })

describe('who (FE-2)', () => {
  it('no cookie is 401 UNAUTHENTICATED, and the handler never runs', async () => {
    const { app, ran } = appWith(config())
    const response = await app.inject({ method: 'GET', url: '/api/thing' })
    expect([response.statusCode, response.json()]).toEqual([
      401,
      refusal('UNAUTHENTICATED'),
    ])
    expect(ran.read).toBe(0)
  })

  it('a session the platform does not know is 401 too', async () => {
    const { app } = appWith(config())
    const response = await app.inject({
      method: 'GET',
      url: '/api/thing',
      headers: { cookie: 'manifest_session=nonsense' },
    })
    expect(response.statusCode).toBe(401)
  })

  it('the platform unreachable is 502 PLATFORM_UNAVAILABLE', async () => {
    const { app, ran } = appWith({ ...config(), platformOrigin: 'http://127.0.0.1:1' })
    const response = await app.inject({
      method: 'GET',
      url: '/api/thing',
      headers: { cookie: AS_ALICE },
    })
    expect([response.statusCode, response.json()]).toEqual([
      502,
      refusal('PLATFORM_UNAVAILABLE'),
    ])
    expect(ran.read).toBe(0)
  })

  it('a good session passes, and the handler knows the person', async () => {
    const { app } = appWith(config())
    const response = await app.inject({
      method: 'GET',
      url: '/api/thing',
      headers: { cookie: AS_ALICE },
    })
    expect([response.statusCode, response.json()]).toEqual([
      200,
      { person: { ...ALICE, mayBuild: true } },
    ])
  })
})

describe('from where (Review Focus 1)', () => {
  it('a POST from a student app, with a good cookie, is 403 ORIGIN_REFUSED, and the handler never runs', async () => {
    const { app, ran } = appWith(config())
    const response = await app.inject({
      method: 'POST',
      url: '/api/thing',
      headers: {
        cookie: AS_ALICE,
        origin: 'https://evil.staging.manifest.internal',
        'content-type': 'application/json',
      },
      payload: {},
    })
    expect([response.statusCode, response.json()]).toEqual([
      403,
      refusal('ORIGIN_REFUSED'),
    ])
    expect(ran.write).toBe(0)
  })

  it('a POST with no Origin is refused too: a browser sends one on every POST', async () => {
    const { app, ran } = appWith(config())
    const response = await app.inject({
      method: 'POST',
      url: '/api/thing',
      headers: { cookie: AS_ALICE, 'content-type': 'application/json' },
      payload: {},
    })
    expect(response.statusCode).toBe(403)
    expect(ran.write).toBe(0)
  })

  it('an Origin of "null" is refused', async () => {
    const { app } = appWith(config())
    const response = await app.inject({
      method: 'POST',
      url: '/api/thing',
      headers: { cookie: AS_ALICE, origin: 'null', 'content-type': 'application/json' },
      payload: {},
    })
    expect(response.statusCode).toBe(403)
  })

  it('a forged POST never costs a question to the platform', async () => {
    const { app } = appWith(config())
    const before = platform.seen.length
    await app.inject({
      method: 'POST',
      url: '/api/thing',
      headers: {
        cookie: AS_ALICE,
        origin: 'https://evil.example',
        'content-type': 'application/json',
      },
      payload: {},
    })
    expect(platform.seen.length).toBe(before)
  })

  it.each([
    ['edge', EDGE_ORIGIN, 'http://127.0.0.1:7105'],
    ['mock', 'http://127.0.0.1:7105', EDGE_ORIGIN],
  ] as const)(
    'in %s mode, a POST from our own origin passes, and from the other mode’s is refused',
    async (mode, ours, theirs) => {
      const { app, ran } = appWith(config(mode))
      const post = (origin: string) =>
        app.inject({
          method: 'POST',
          url: '/api/thing',
          headers: { cookie: AS_ALICE, origin, 'content-type': 'application/json' },
          payload: {},
        })
      expect((await post(ours)).statusCode).toBe(200)
      expect((await post(theirs)).statusCode).toBe(403)
      expect(ran.write).toBe(1)
    },
  )

  it('a GET from anywhere, with a good cookie, passes: our reads have no side effects', async () => {
    const { app, ran } = appWith(config())
    const response = await app.inject({
      method: 'GET',
      url: '/api/thing',
      headers: { cookie: AS_ALICE, origin: 'https://evil.staging.manifest.internal' },
    })
    expect(response.statusCode).toBe(200)
    expect(ran.read).toBe(1)
  })
})

describe('person optional (a problem report, Decision 11)', () => {
  it('passes with no person, and with the platform unreachable, but never from another origin', async () => {
    const { app, ran } = appWith(
      { ...config(), platformOrigin: 'http://127.0.0.1:1' },
      'optional',
    )
    const post = (origin: string) =>
      app.inject({
        method: 'POST',
        url: '/api/thing',
        headers: { cookie: AS_ALICE, origin, 'content-type': 'application/json' },
        payload: {},
      })
    const ok = await post(EDGE_ORIGIN)
    expect([ok.statusCode, ok.json()]).toEqual([200, { person: null }])
    expect((await post('https://evil.staging.manifest.internal')).statusCode).toBe(403)
    expect(ran.write).toBe(1)
  })

  it('knows the person when there is one', async () => {
    const { app } = appWith(config(), 'optional')
    const response = await app.inject({
      method: 'GET',
      url: '/api/thing',
      headers: { cookie: AS_ALICE },
    })
    expect(response.json()).toEqual({ person: { ...ALICE, mayBuild: true } })
  })
})
