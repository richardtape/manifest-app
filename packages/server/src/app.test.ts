import type { Server } from 'node:http'
import { sessionCookieFor } from '@manifest/contract'
import { createMockServer, fixtures } from '@manifest/mock'
import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { buildServer, type WebHandler } from './app.js'
import { readConfig, type Config } from './config.js'
import { idleKeeper, type Keeper } from './keeping/keeper.js'
import { openStore } from './store/db.js'

/**
 * OUR SERVER, DRIVEN OVER REAL HTTP. Not Fastify's `inject`: it enters Fastify's router
 * directly and skips the `serverFactory`, and the factory's routing rule (M4) is the thing
 * under test: `/api`, `/v1` and `/auth` belong to Fastify, everything else to the app.
 */
const closers: (() => Promise<unknown>)[] = []
afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()))
})

async function mockPlatform(): Promise<string> {
  const server: Server = createMockServer({ scanSilenceMs: 50 })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  closers.push(() => new Promise((resolve) => server.close(resolve)))
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`
}

/** Our server with a stand-in for the app, which records every path it is asked for. */
async function serve(config: Config): Promise<{ base: string; webSaw: string[] }> {
  const webSaw: string[] = []
  const web: WebHandler = (request, response) => {
    webSaw.push(request.url ?? '')
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end('<div id="root"></div>')
  }
  const store = openStore(':memory:')
  const app: FastifyInstance = buildServer(config, web, { store })
  await app.listen({ host: '127.0.0.1', port: 0 })
  closers.push(async () => {
    await app.close()
    store.close()
  })
  return {
    base: `http://127.0.0.1:${(app.server.address() as { port: number }).port}`,
    webSaw,
  }
}

const mock = (platformOrigin: string): Config => ({
  mode: 'mock',
  port: 7105,
  origin: 'http://127.0.0.1:7105',
  platformOrigin,
  sessionOrigin: platformOrigin,
  modelGateway: 'http://127.0.0.1:7106/v1',
  planModel: 'default-chat',
  smtpUrl: 'smtp://127.0.0.1:7111',
  mailFrom: 'Manifest <manifest@app.manifest.internal>',
})
const edge = (platformOrigin: string): Config => ({
  mode: 'edge',
  port: 7105,
  origin: 'https://app.manifest.internal',
  platformOrigin,
  sessionOrigin: platformOrigin,
  modelGateway: 'http://127.0.0.1:7106/v1',
  planModel: 'default-chat',
  smtpUrl: 'smtp://127.0.0.1:7111',
  mailFrom: 'Manifest <manifest@app.manifest.internal>',
})
const SESSION = { cookie: 'theme=dark; manifest_session=mock-session' }
const json = async (response: Response) =>
  [response.status, await response.json()] as const

describe('readConfig', () => {
  it('is edge by default, served at the app origin, asking the control plane on the host', () => {
    expect(readConfig({})).toEqual({
      mode: 'edge',
      port: 7105,
      origin: 'https://app.manifest.internal',
      platformOrigin: 'http://127.0.0.1:7100',
      sessionOrigin: 'https://app.manifest.internal',
      modelGateway: 'http://127.0.0.1:7106/v1',
      planModel: 'default-chat',
      smtpUrl: 'smtp://127.0.0.1:7111',
      mailFrom: 'Manifest <manifest@app.manifest.internal>',
    })
  })
  it('is mock when asked, served on 7105 itself, asking manifest-mock', () => {
    expect(readConfig({ MANIFEST_APP_MODE: 'mock' })).toEqual({
      mode: 'mock',
      port: 7105,
      origin: 'http://127.0.0.1:7105',
      platformOrigin: 'http://127.0.0.1:7102',
      sessionOrigin: 'http://127.0.0.1:7102',
      modelGateway: 'http://127.0.0.1:7106/v1',
      planModel: 'default-chat',
      smtpUrl: 'smtp://127.0.0.1:7111',
      mailFrom: 'Manifest <manifest@app.manifest.internal>',
    })
  })
  it('asks who someone is through the edge in edge mode, never 7100 itself (FE-28; the platform’s d4291dd)', () => {
    expect(readConfig({}).sessionOrigin).toBe('https://app.manifest.internal')
    expect(readConfig({ MANIFEST_APP_MODE: 'mock' }).sessionOrigin).toBe(
      'http://127.0.0.1:7102',
    )
  })
  it('in each mode, the session cookie we read is the one we forward: the browser’s origin and the one we ask name it alike', () => {
    for (const mode of ['edge', 'mock']) {
      const config = readConfig({ MANIFEST_APP_MODE: mode })
      expect(sessionCookieFor(config.sessionOrigin)).toBe(sessionCookieFor(config.origin))
    }
    expect(sessionCookieFor(readConfig({}).origin)).toBe('__Host-manifest_session')
    expect(sessionCookieFor(readConfig({ MANIFEST_APP_MODE: 'mock' }).origin)).toBe(
      'manifest_session',
    )
  })
  it('sends email to Mailpit on the laptop from us, unless told otherwise (F6 D5)', () => {
    expect(readConfig({})).toMatchObject({
      smtpUrl: 'smtp://127.0.0.1:7111',
      mailFrom: 'Manifest <manifest@app.manifest.internal>',
    })
    expect(
      readConfig({
        MANIFEST_APP_SMTP_URL: 'smtps://mail.example.test:465',
        MANIFEST_APP_MAIL_FROM: 'Manifest <noreply@example.test>',
      }),
    ).toMatchObject({
      smtpUrl: 'smtps://mail.example.test:465',
      mailFrom: 'Manifest <noreply@example.test>',
    })
  })
  it('writes plans on the model it is told, default-chat unless told otherwise (Task 9)', () => {
    expect(readConfig({ MANIFEST_APP_PLAN_MODEL: 'capable-chat' }).planModel).toBe(
      'capable-chat',
    )
  })
  it('refuses a mode it does not know, loudly', () => {
    expect(() => readConfig({ MANIFEST_APP_MODE: 'production' })).toThrow(
      /MANIFEST_APP_MODE/,
    )
  })
})

describe('the keeper: started only by a server that holds its port (minors m70)', () => {
  it('not when built, nor when ready; once it listens, once; stopped when it closes', async () => {
    const said: string[] = []
    const keeper: Keeper = {
      ...idleKeeper,
      start: () => void said.push('start'),
      stop: () => void said.push('stop'),
    }
    const store = openStore(':memory:')
    const app = buildServer(mock('http://127.0.0.1:9'), () => undefined, {
      store,
      keeper,
    })
    await app.ready()
    expect(said).toEqual([])
    await app.listen({ host: '127.0.0.1', port: 0 })
    expect(said).toEqual(['start'])
    await app.close()
    store.close()
    expect(said).toEqual(['start', 'stop'])
  })

  it('a keeper that fails to start is said on the console, and the server still serves (the review)', async () => {
    const failed = new Error('the keeper could not start')
    const keeper: Keeper = {
      ...idleKeeper,
      start: () => {
        throw failed
      },
    }
    const said: unknown[] = []
    const error = console.error
    console.error = (...args: unknown[]) => void said.push(...args)
    const store = openStore(':memory:')
    const app = buildServer(mock('http://127.0.0.1:9'), () => undefined, {
      store,
      keeper,
    })
    closers.push(async () => {
      await app.close()
      store.close()
    })
    try {
      await app.listen({ host: '127.0.0.1', port: 0 })
    } finally {
      console.error = error
    }
    expect(said).toContain(failed)
    expect(app.server.listening).toBe(true)
  })

  it('a second server refused its port (an idle watcher of §7) never starts one', async () => {
    const first = await serve(mock('http://127.0.0.1:9'))
    const said: string[] = []
    const keeper: Keeper = { ...idleKeeper, start: () => void said.push('start') }
    const store = openStore(':memory:')
    const app = buildServer(mock('http://127.0.0.1:9'), () => undefined, {
      store,
      keeper,
    })
    closers.push(async () => {
      await app.close()
      store.close()
    })
    const port = Number(new URL(first.base).port)
    await expect(app.listen({ host: '127.0.0.1', port })).rejects.toThrow(/EADDRINUSE/)
    expect(said).toEqual([])
  })
})

describe('/api/me: who we serve (FE-2)', () => {
  it('answers the person the session belongs to', async () => {
    const { base } = await serve(mock(await mockPlatform()))
    expect(await json(await fetch(`${base}/api/me`, { headers: SESSION }))).toEqual([
      200,
      {
        id: '11111111-1111-4111-8111-111111111111',
        displayName: 'Instructor One',
        // F6: their own address, to their own session (design §3).
        email: 'instructor@example.test',
        mayBuild: true,
      },
    ])
  })

  it('without a session, is 401 UNAUTHENTICATED, in our own words', async () => {
    const { base } = await serve(mock(await mockPlatform()))
    expect(await json(await fetch(`${base}/api/me`))).toEqual([
      401,
      { error: { code: 'UNAUTHENTICATED' } },
    ])
  })

  it('with the platform unreachable, is 502 PLATFORM_UNAVAILABLE, and carries nothing of it', async () => {
    const { base } = await serve(mock('http://127.0.0.1:1'))
    expect(await json(await fetch(`${base}/api/me`, { headers: SESSION }))).toEqual([
      502,
      { error: { code: 'PLATFORM_UNAVAILABLE' } },
    ])
  })

  it('an /api path we do not have is 404', async () => {
    const { base, webSaw } = await serve(mock(await mockPlatform()))
    expect((await fetch(`${base}/api/nope`)).status).toBe(404)
    expect(webSaw).toEqual([])
  })
})

describe("/api/__doctor: the platform's make doctor asking who holds 7105 (its F12)", () => {
  it.each(['mock', 'edge'] as const)(
    'in %s mode, answers our name with no session and the platform down, and never reaches the app',
    async (mode) => {
      const { base, webSaw } = await serve(
        mode === 'mock' ? mock('http://127.0.0.1:1') : edge('http://127.0.0.1:1'),
      )
      expect(await json(await fetch(`${base}/api/__doctor`))).toEqual([
        200,
        { name: 'manifest-app' },
      ])
      expect(webSaw).toEqual([])
    },
  )
})

describe('everything else is the app', () => {
  it.each(['mock', 'edge'] as const)(
    'in %s mode, / and a deep path reach the app',
    async (mode) => {
      const origin = await mockPlatform()
      const { base, webSaw } = await serve(mode === 'mock' ? mock(origin) : edge(origin))
      for (const path of ['/', '/apps/mock-app?tab=people']) {
        const response = await fetch(`${base}${path}`)
        expect(await response.text()).toBe('<div id="root"></div>')
      }
      expect(webSaw).toEqual(['/', '/apps/mock-app?tab=people'])
    },
  )
})

describe('a malformed address (the final review)', () => {
  it('reaches the app as its home page, whose router says there is nothing here; never an empty 404', async () => {
    const { base, webSaw } = await serve(mock(await mockPlatform()))
    const response = await fetch(`${base}/apps/%E0`)
    expect(response.status).toBe(200)
    expect(webSaw).toEqual(['/'])
  })
})

describe('/v1 and /auth are never ours to answer', () => {
  it('in mock mode they reach manifest-mock, untouched', async () => {
    const { base, webSaw } = await serve(mock(await mockPlatform()))

    // The MOCK's envelope, with its message and hint: ours says only the code.
    const [status, body] = await json(await fetch(`${base}/v1/me`))
    expect(status).toBe(401)
    expect(body).toMatchObject({
      error: { code: 'UNAUTHENTICATED', hint: expect.any(String) },
    })

    const login = await fetch(`${base}/auth/login?returnTo=/apps`, { redirect: 'manual' })
    expect(login.status).toBe(302)
    expect(login.headers.get('location')).toBe('/apps')
    expect(login.headers.get('set-cookie')).toMatch(
      /^manifest_session=mock-session; Path=\//,
    )

    expect(await json(await fetch(`${base}/v1/me`, { headers: SESSION }))).toMatchObject([
      200,
      { displayName: 'Instructor One' },
    ])
    expect(webSaw).toEqual([])
  })

  it('in mock mode the event stream is proxied, and a frame arrives', async () => {
    const { base } = await serve(mock(await mockPlatform()))
    const url = `${base.replace('http', 'ws')}/v1/projects/${fixtures.PROJECT_ID}/events`
    const first = await new Promise<string>((resolve, reject) => {
      const socket = new WebSocket(url, { headers: SESSION } as unknown as string[])
      socket.onmessage = (event) => {
        resolve(String(event.data))
        socket.close()
      }
      socket.onerror = () =>
        reject(new Error('the stream did not open through our server'))
    })
    expect(JSON.parse(first)).toMatchObject({ type: 'project.created' })
  })

  it('in mock mode, with the mock down, /v1 is an empty 502, as the edge answers (review #2)', async () => {
    const { base, webSaw } = await serve(mock('http://127.0.0.1:1'))
    const response = await fetch(`${base}/v1/me`, { headers: SESSION })
    expect(response.status).toBe(502)
    expect(await response.text()).toBe('')
    expect(webSaw).toEqual([])
  })

  it('in edge mode they are 404, and never reach the app', async () => {
    const { base, webSaw } = await serve(edge(await mockPlatform()))
    expect((await fetch(`${base}/v1/me`)).status).toBe(404)
    expect(
      (await fetch(`${base}/auth/login?returnTo=/`, { redirect: 'manual' })).status,
    ).toBe(404)
    expect(webSaw).toEqual([])
  })
})
