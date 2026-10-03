import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Config } from './config.js'
import { whoIs } from './identity.js'

/**
 * FE-2, DECIDED BY RICH: our server may replay the session cookie to `GET /v1/me`, and for
 * nothing else. So `whoIs` is proved against a fake control plane that records every request
 * it receives: what reaches it, and what never does.
 *
 * FE-28 (the platform's `7b85326`, contract 1.6.0): on an https origin the cookie is
 * `__Host-manifest_session`, and the plain name is not read at all. Edge mode asks THROUGH THE
 * EDGE, at our own origin, where the scheme and the Host agree (the platform's `d4291dd`: a
 * request straight to 7100 is judged as the console's https origin while the contract's client,
 * reading `http:`, sends the plain name, so everyone would be nobody). The edge is not here, so
 * edge mode's request is routed to the fake by the client's own `fetch`, and the fake records
 * the address it was ASKED, as the client wrote it.
 */
interface Seen {
  method: string | undefined
  url: string | undefined
  headers: IncomingHttpHeaders
  /** The address the client asked: the edge's in edge mode, the fake's own in mock mode. */
  asked: string
}

const ME = {
  id: '11111111-1111-4111-8111-111111111111',
  puid: 'ins000001',
  displayName: 'Instructor One',
  email: 'instructor@example.test',
  role: 'member',
  mayBuild: true,
}

const APP = 'https://app.manifest.internal'

interface Fake {
  origin: string
  seen: Seen[]
  /** The client's fetch: any address it asks is answered here, and recorded as asked. */
  fetch: typeof globalThis.fetch
}

async function fakeControlPlane(status: number, me: typeof ME = ME): Promise<Fake> {
  const seen: Seen[] = []
  let asked = ''
  const server = createServer((request, response) => {
    seen.push({
      method: request.method,
      url: request.url,
      headers: request.headers,
      asked: asked || `${origin}${request.url ?? ''}`,
    })
    asked = ''
    response.writeHead(status, { 'content-type': 'application/json' })
    // A 500 that ECHOES the cookie it received, so a rethrow that carries the platform's
    // message would carry the session with it.
    response.end(
      JSON.stringify(
        status === 200
          ? me
          : {
              error: {
                code: status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL',
                message: `failed for ${request.headers.cookie ?? 'nobody'}`,
              },
            },
      ),
    )
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const routed: typeof globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    asked = request.url
    return globalThis.fetch(new Request(`${origin}${url.pathname}${url.search}`, request))
  }
  return { origin, seen, fetch: routed }
}

const servers: Server[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((r) => s.close(r))))
  vi.restoreAllMocks()
})

type Mode = Config['mode']
type At = Pick<Config, 'mode' | 'origin' | 'sessionOrigin' | 'platformOrigin'>

/**
 * A mode's addresses, with `platformOrigin` a SECOND fake that must never be asked: `whoIs`
 * asking the control plane's own port again is the defect this adoption removes.
 */
async function at(mode: Mode, platform: Fake): Promise<{ at: At; port: Fake }> {
  const port = await fakeControlPlane(200)
  return {
    port,
    at:
      mode === 'edge'
        ? { mode, origin: APP, sessionOrigin: APP, platformOrigin: port.origin }
        : {
            mode,
            origin: 'http://127.0.0.1:7105',
            sessionOrigin: platform.origin,
            platformOrigin: port.origin,
          },
  }
}

/** What the browser sends us in each mode: the name its origin reads. */
const NAME = { edge: '__Host-manifest_session', mock: 'manifest_session' } as const
/** The other mode's name, which is no session here. */
const OTHER = { edge: 'manifest_session', mock: '__Host-manifest_session' } as const
/** Where the request goes: through the edge in edge mode, the mock in mock mode. */
const ASKED = (mode: Mode, platform: Fake) =>
  mode === 'edge' ? `${APP}/v1/me` : `${platform.origin}/v1/me`

/** Every case, with a given session value. */
async function everyCase(mode: Mode, session: string, me: typeof ME = ME) {
  const around = `theme=dark; ${NAME[mode]}=${session}; other=1`

  const ok = await fakeControlPlane(200, me)
  const okAt = await at(mode, ok)
  const person = await whoIs(around, okAt.at, ok.fetch)

  const none = await fakeControlPlane(200)
  const nobody = await whoIs(undefined, (await at(mode, none)).at, none.fetch)

  const refused = await fakeControlPlane(401)
  const signedOut = await whoIs(around, (await at(mode, refused)).at, refused.fetch)

  const broken = await fakeControlPlane(500)
  const failure = await whoIs(around, (await at(mode, broken)).at, broken.fetch).then(
    () => undefined,
    (error: unknown) => error,
  )

  return {
    ok,
    port: okAt.port,
    person,
    none,
    nobody,
    refused,
    signedOut,
    broken,
    failure,
  }
}

describe.each(['edge', 'mock'] as const)(
  'whoIs in %s mode: the only reader of the session (FE-2)',
  (mode) => {
    it(`replays ${NAME[mode]}, and nothing else from the header, to GET /v1/me ${mode === 'edge' ? 'THROUGH THE EDGE, never 7100' : 'at the mock'}`, async () => {
      const { ok, port, person } = await everyCase(mode, 'S')
      expect(ok.seen).toHaveLength(1)
      expect(ok.seen[0]?.method).toBe('GET')
      expect(ok.seen[0]?.asked).toBe(ASKED(mode, ok))
      expect(ok.seen[0]?.headers.cookie).toBe(`${NAME[mode]}=S`)
      expect(port.seen).toEqual([])
      expect(person).toEqual({
        id: ME.id,
        displayName: ME.displayName,
        email: ME.email,
        mayBuild: true,
      })
    })

    it(`a header holding only ${OTHER[mode]} is nobody, and asks nobody${mode === 'edge' ? ' (FE-28: a sibling app can set the plain name; only __Host- is ours)' : ''}`, async () => {
      const f = await fakeControlPlane(200)
      const { at: here, port } = await at(mode, f)
      expect(await whoIs(`theme=dark; ${OTHER[mode]}=S`, here, f.fetch)).toBeUndefined()
      expect(f.seen).toEqual([])
      expect(port.seen).toEqual([])
    })

    it(`${OTHER[mode]} beside ${NAME[mode]} is ignored: the person is ${NAME[mode]}'s, and only it is sent (the platform's Decision 8)`, async () => {
      const f = await fakeControlPlane(200)
      const { at: here } = await at(mode, f)
      expect(
        await whoIs(`${OTHER[mode]}=T; ${NAME[mode]}=S; theme=dark`, here, f.fetch),
      ).toMatchObject({ id: ME.id })
      expect(f.seen.map((s) => s.headers.cookie)).toEqual([`${NAME[mode]}=S`])
    })

    it('only id, displayName, their address and the decision leave it: never puid or role (F6: an address is not a credential)', async () => {
      const { person } = await everyCase(mode, 'S')
      expect(Object.keys(person ?? {}).sort()).toEqual([
        'displayName',
        'email',
        'id',
        'mayBuild',
      ])
    })

    it('a getMe from before FE-39, with no decision in it, builds as today', async () => {
      const before = Object.fromEntries(
        Object.entries(ME).filter(([key]) => key !== 'mayBuild'),
      )
      const { person } = await everyCase(mode, 'S', before as typeof ME)
      expect(person?.mayBuild).toBe(true)
    })

    it('the decision is the platform’s, as it answered it (FE-39)', async () => {
      const { person } = await everyCase(mode, 'S', { ...ME, mayBuild: false })
      expect(person?.mayBuild).toBe(false)
    })

    it('with no header it answers undefined, and asks nobody', async () => {
      const { none, nobody } = await everyCase(mode, 'S')
      expect(nobody).toBeUndefined()
      expect(none.seen).toEqual([])
    })

    it('with a header that holds no session it answers undefined, and asks nobody', async () => {
      const f = await fakeControlPlane(200)
      const { at: here } = await at(mode, f)
      expect(
        await whoIs(`theme=dark; ${NAME[mode]}=; other=1`, here, f.fetch),
      ).toBeUndefined()
      expect(await whoIs('theme=dark', here, f.fetch)).toBeUndefined()
      expect(f.seen).toEqual([])
    })

    it(`two ${NAME[mode]} in one header are none, and it asks nobody (FE-28 (b), Rich's word: choosing either could file one person's work under another)`, async () => {
      const f = await fakeControlPlane(200)
      const { at: here } = await at(mode, f)
      expect(
        await whoIs(`${NAME[mode]}=A; theme=dark; ${NAME[mode]}=B`, here, f.fetch),
      ).toBeUndefined()
      expect(
        await whoIs(`${NAME[mode]}=A; ${NAME[mode]}=A`, here, f.fetch),
      ).toBeUndefined()
      expect(f.seen).toEqual([])
    })

    it('a 401 is undefined', async () => {
      const { signedOut, refused } = await everyCase(mode, 'S')
      expect(signedOut).toBeUndefined()
      expect(refused.seen).toHaveLength(1)
    })

    it('a 500 rejects, and the error does not carry the session', async () => {
      const { failure } = await everyCase(mode, 'S-9c1e')
      expect(failure).toBeInstanceOf(Error)
      expect(String((failure as Error).message)).not.toContain('S-9c1e')
      expect(JSON.stringify(failure)).not.toContain('S-9c1e')
      expect(String((failure as Error).stack)).not.toContain('S-9c1e')
    })

    it('never writes the session anywhere: log, error, stdout or stderr', async () => {
      const written: string[] = []
      const capture = (...args: unknown[]) => {
        written.push(args.map(String).join(' '))
        return true
      }
      vi.spyOn(console, 'log').mockImplementation(capture)
      vi.spyOn(console, 'error').mockImplementation(capture)
      vi.spyOn(console, 'warn').mockImplementation(capture)
      vi.spyOn(process.stdout, 'write').mockImplementation(capture)
      vi.spyOn(process.stderr, 'write').mockImplementation(capture)
      const { failure } = await everyCase(mode, 'SECRET-7f3a')
      vi.restoreAllMocks()
      expect(failure).toBeInstanceOf(Error)
      expect(written.filter((line) => line.includes('SECRET-7f3a'))).toEqual([])
    })
  },
)

describe('whoIs with no fetch given: the global one, at the address it is told', () => {
  it('mock mode asks the mock itself, by its own address', async () => {
    const f = await fakeControlPlane(200)
    const { at: here } = await at('mock', f)
    expect(await whoIs('manifest_session=S', here)).toMatchObject({ id: ME.id })
    expect(f.seen.map((s) => [s.url, s.headers.cookie])).toEqual([
      ['/v1/me', 'manifest_session=S'],
    ])
  })
})
