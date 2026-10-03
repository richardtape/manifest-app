import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import { sessionCookieFor } from '@manifest/contract'

/**
 * FOR TESTS ONLY: nothing outside a test file imports this. A control plane that knows two
 * people by their session, and records every request it is sent, so a test can say what
 * reached the platform, and what never did (FE-2).
 */
export const ALICE = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  displayName: 'Alice Instructor',
  email: 'alice@example.test',
}
export const BOB = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  displayName: 'Bob Instructor',
  email: 'bob@example.test',
}
/** Someone who may not build (D7, FE-39): the platform's decision, as `getMe` answers it. */
export const CAROL = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  displayName: 'Carol Student',
  email: 'carol@example.test',
}
/** Answered as a platform from before FE-39 answers: no `mayBuild` at all. */
export const DANA = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  displayName: 'Dana Before',
  email: 'dana@example.test',
}
const SESSIONS: Record<string, typeof ALICE> = {
  'alice-session': ALICE,
  'bob-session': BOB,
  'carol-session': CAROL,
  'dana-session': DANA,
}
/**
 * WHAT A BROWSER SENDS US THROUGH THE EDGE: the session under the https origin's name (FE-28,
 * contract 1.6.0). Every API test runs in edge mode at `https://app.manifest.internal`, where
 * a plain `manifest_session` is no session at all.
 */
export const AS_ALICE = '__Host-manifest_session=alice-session'
export const AS_BOB = '__Host-manifest_session=bob-session'
export const AS_CAROL = '__Host-manifest_session=carol-session'
export const AS_DANA = '__Host-manifest_session=dana-session'

/**
 * The one cookie a Cookie header holds under EXACTLY `name`, as a server's parser reads it:
 * `__Host-manifest_session=` is not `manifest_session=`, and two of a name are none.
 */
export function cookieNamed(
  header: string | undefined,
  name: string,
): string | undefined {
  const values = (header ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.slice(0, part.indexOf('=')) === name)
    .map((part) => part.slice(part.indexOf('=') + 1))
  return values.length === 1 ? values[0] : undefined
}

export interface Seen {
  method: string | undefined
  url: string | undefined
  headers: IncomingHttpHeaders
}

/** What a test's control plane answers a path other than `/v1/me`: a status and a body. */
export type Answer = (seen: Seen) => { status: number; body: unknown } | undefined

export async function fakeControlPlane(answer?: Answer): Promise<{
  origin: string
  seen: Seen[]
  close: () => Promise<void>
}> {
  const seen: Seen[] = []
  let origin = ''
  const server: Server = createServer((request, response) => {
    seen.push({ method: request.method, url: request.url, headers: request.headers })
    // AN HTTP ORIGIN, SO THE PLAIN NAME, EXACTLY (`sessionCookieFor`): a test's server asks
    // it as `sessionOrigin`, and the contract's client sends the session under this name.
    const session = cookieNamed(request.headers.cookie, sessionCookieFor(origin))
    const person = session === undefined ? undefined : SESSIONS[session]
    response.setHeader('content-type', 'application/json')
    const answered =
      request.url === '/v1/me' ? undefined : answer?.(seen[seen.length - 1]!)
    if (answered !== undefined) {
      response.writeHead(answered.status)
      response.end(answered.body === undefined ? '' : JSON.stringify(answered.body))
      return
    }
    if (request.url === '/v1/me' && person !== undefined) {
      response.writeHead(200)
      response.end(
        JSON.stringify({
          ...person,
          puid: 'x',
          role: 'member',
          ...(person === DANA ? {} : { mayBuild: person !== CAROL }),
        }),
      )
      return
    }
    response.writeHead(request.url === '/v1/me' ? 401 : 404)
    response.end(
      JSON.stringify({
        error: {
          code: request.url === '/v1/me' ? 'UNAUTHENTICATED' : 'NOT_FOUND',
          message: 'no',
        },
      }),
    )
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  return {
    origin,
    seen,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}
