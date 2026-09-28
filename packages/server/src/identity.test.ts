import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { whoIs } from './identity.js'

/**
 * FE-2, DECIDED BY RICH: our server may replay the session cookie to `GET /v1/me`, and for
 * nothing else. So `whoIs` is proved against a fake control plane that records every request
 * it receives: what reaches it, and what never does.
 */
interface Seen {
  method: string | undefined
  url: string | undefined
  headers: IncomingHttpHeaders
}

const ME = {
  id: '11111111-1111-4111-8111-111111111111',
  puid: 'ins000001',
  displayName: 'Instructor One',
  email: 'instructor@example.test',
  role: 'member',
}

async function fakeControlPlane(
  status: number,
): Promise<{ origin: string; seen: Seen[]; server: Server }> {
  const seen: Seen[] = []
  const server = createServer((request, response) => {
    seen.push({ method: request.method, url: request.url, headers: request.headers })
    response.writeHead(status, { 'content-type': 'application/json' })
    // A 500 that ECHOES the cookie it received, so a rethrow that carries the platform's
    // message would carry the session with it.
    response.end(
      JSON.stringify(
        status === 200
          ? ME
          : {
              error: {
                code: status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL',
                message: `failed for ${request.headers.cookie ?? 'nobody'}`,
              },
            },
      ),
    )
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as { port: number }
  return { origin: `http://127.0.0.1:${port}`, seen, server }
}

const servers: Server[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((r) => s.close(r))))
  vi.restoreAllMocks()
})
async function fake(status: number) {
  const f = await fakeControlPlane(status)
  servers.push(f.server)
  return f
}

/** Every case, with a given session value. */
async function everyCase(session: string) {
  const around = `theme=dark; manifest_session=${session}; other=1`

  const ok = await fake(200)
  const person = await whoIs(around, ok.origin)

  const none = await fake(200)
  const nobody = await whoIs(undefined, none.origin)

  const refused = await fake(401)
  const signedOut = await whoIs(around, refused.origin)

  const broken = await fake(500)
  const failure = await whoIs(around, broken.origin).then(
    () => undefined,
    (error: unknown) => error,
  )

  return { ok, person, none, nobody, refused, signedOut, broken, failure }
}

describe('whoIs: the only reader of the session (FE-2)', () => {
  it('replays manifest_session, and nothing else from the header, to GET /v1/me', async () => {
    const { ok, person } = await everyCase('S')
    expect(ok.seen).toHaveLength(1)
    expect(ok.seen[0]?.method).toBe('GET')
    expect(ok.seen[0]?.url).toBe('/v1/me')
    expect(ok.seen[0]?.headers.cookie).toBe('manifest_session=S')
    expect(person).toEqual({ id: ME.id, displayName: ME.displayName })
  })

  it('only id and displayName leave it: never email or puid', async () => {
    const { person } = await everyCase('S')
    expect(Object.keys(person ?? {}).sort()).toEqual(['displayName', 'id'])
  })

  it('with no header it answers undefined, and asks nobody', async () => {
    const { none, nobody } = await everyCase('S')
    expect(nobody).toBeUndefined()
    expect(none.seen).toEqual([])
  })

  it('with a header that holds no session it answers undefined, and asks nobody', async () => {
    const f = await fake(200)
    expect(
      await whoIs('theme=dark; manifest_session=; other=1', f.origin),
    ).toBeUndefined()
    expect(await whoIs('theme=dark', f.origin)).toBeUndefined()
    expect(f.seen).toEqual([])
  })

  it('two sessions in one header are none, and it asks nobody (FE-28: a sibling host can plant one)', async () => {
    const f = await fake(200)
    expect(
      await whoIs('manifest_session=A; theme=dark; manifest_session=B', f.origin),
    ).toBeUndefined()
    expect(
      await whoIs('manifest_session=A; manifest_session=A', f.origin),
    ).toBeUndefined()
    expect(f.seen).toEqual([])
  })

  it('a 401 is undefined', async () => {
    const { signedOut } = await everyCase('S')
    expect(signedOut).toBeUndefined()
  })

  it('a 500 rejects, and the error does not carry the session', async () => {
    const { failure } = await everyCase('S-9c1e')
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
    const { failure } = await everyCase('SECRET-7f3a')
    vi.restoreAllMocks()
    expect(failure).toBeInstanceOf(Error)
    expect(written.filter((line) => line.includes('SECRET-7f3a'))).toEqual([])
  })
})
