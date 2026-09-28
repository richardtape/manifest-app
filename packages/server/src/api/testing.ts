import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'

/**
 * FOR TESTS ONLY: nothing outside a test file imports this. A control plane that knows two
 * people by their session, and records every request it is sent, so a test can say what
 * reached the platform, and what never did (FE-2).
 */
export const ALICE = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  displayName: 'Alice Instructor',
}
export const BOB = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  displayName: 'Bob Instructor',
}
const SESSIONS: Record<string, typeof ALICE> = {
  'alice-session': ALICE,
  'bob-session': BOB,
}
export const AS_ALICE = 'manifest_session=alice-session'
export const AS_BOB = 'manifest_session=bob-session'

export interface Seen {
  method: string | undefined
  url: string | undefined
  headers: IncomingHttpHeaders
}

export async function fakeControlPlane(): Promise<{
  origin: string
  seen: Seen[]
  close: () => Promise<void>
}> {
  const seen: Seen[] = []
  const server: Server = createServer((request, response) => {
    seen.push({ method: request.method, url: request.url, headers: request.headers })
    const session = /manifest_session=([^;]+)/.exec(request.headers.cookie ?? '')?.[1]
    const person = session === undefined ? undefined : SESSIONS[session]
    response.setHeader('content-type', 'application/json')
    if (request.url === '/v1/me' && person !== undefined) {
      response.writeHead(200)
      response.end(
        JSON.stringify({ ...person, puid: 'x', email: 'x@example.test', role: 'member' }),
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
  return {
    origin: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    seen,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}
