import { createManifestClient, unwrap, type Schemas } from '@manifest/contract'

/**
 * THE ONE PLACE THE FRONT-END CALLS THE PLATFORM (Decision 3; the console's api.ts is the
 * pattern). Screens call these functions and never hold the client. `origin` is a
 * parameter, so the browser passes its own and a test passes the mock's. A browser sends
 * its own cookie and Origin, and `session` is for a Node caller only.
 *
 * `unwrap` throws a `ManifestApiError` carrying D23.7's envelope. `refusalOf` is the one
 * thing that reads it.
 */
export interface Platform {
  getMe(): Promise<Schemas['Me']>
  listProjects(): Promise<Schemas['ProjectList']>
  /**
   * Always `?expand=environments` (D23.1's one expansion): a card needs its three, and each
   * one's `instance`, *"the instance the hostname reaches"*. No `listInstances` in F1: its
   * value is the last attempt (FE-13), which F1 does not show (FE-27).
   */
  getProject(projectId: string): Promise<Schemas['Project']>
  getRelease(releaseId: string): Promise<Schemas['Release']>
}

/** A read that has not answered by now is unreachable: never a page left blank (review #3). */
export const READ_TIMEOUT_MS = 15_000

export function createPlatform(options: {
  origin: string
  session?: string
  timeoutMs?: number
}): Platform {
  const timeoutMs = options.timeoutMs ?? READ_TIMEOUT_MS
  const client = createManifestClient({
    origin: options.origin,
    ...(options.session === undefined ? {} : { session: options.session }),
    // Every call has a deadline. A platform that takes the connection and never answers
    // (the edge has no response timeout of its own) becomes a TimeoutError, which
    // refusalOf reads as unreachable.
    fetch: (request) =>
      globalThis.fetch(request, { signal: AbortSignal.timeout(timeoutMs) }),
  })
  return {
    async getMe() {
      return unwrap(await client.GET('/v1/me'), 'getMe')
    },
    async listProjects() {
      return unwrap(await client.GET('/v1/projects'), 'listProjects')
    },
    async getProject(projectId) {
      return unwrap(
        await client.GET('/v1/projects/{projectId}', {
          params: { path: { projectId }, query: { expand: 'environments' } },
        }),
        'getProject',
      )
    },
    async getRelease(releaseId) {
      return unwrap(
        await client.GET('/v1/releases/{releaseId}', { params: { path: { releaseId } } }),
        'getRelease',
      )
    },
  }
}
