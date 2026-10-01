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
/** Someone who may not build (D7, FE-39): the platform's decision, as `getMe` answers it. */
export const CAROL = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  displayName: 'Carol Student',
}
/** Answered as a platform from before FE-39 answers: no `mayBuild` at all. */
export const DANA = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  displayName: 'Dana Before',
}
const SESSIONS: Record<string, typeof ALICE> = {
  'alice-session': ALICE,
  'bob-session': BOB,
  'carol-session': CAROL,
  'dana-session': DANA,
}
export const AS_ALICE = 'manifest_session=alice-session'
export const AS_BOB = 'manifest_session=bob-session'
export const AS_CAROL = 'manifest_session=carol-session'
export const AS_DANA = 'manifest_session=dana-session'

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
  const server: Server = createServer((request, response) => {
    seen.push({ method: request.method, url: request.url, headers: request.headers })
    const session = /manifest_session=([^;]+)/.exec(request.headers.cookie ?? '')?.[1]
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
          email: 'x@example.test',
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
  return {
    origin: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    seen,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}
