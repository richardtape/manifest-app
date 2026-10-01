import {
  createManifestClient,
  ManifestApiError,
  SESSION_COOKIE,
  unwrap,
} from '@manifest/contract'

/**
 * THE ONLY READER OF THE SESSION (FE-2, decided by Rich). Every page request on the app's
 * origin carries the person's `manifest_session` to us whether we want it or not, and the
 * one use we may make of it is to replay it to `GET /v1/me` to learn who we serve. It is
 * never logged, stored, or sent anywhere else, and it never rides out of here on an error.
 * Who we serve, and whether they may build: `mayBuild` is the platform's decision (FE-39), never ours.
 */
export type Person = { id: string; displayName: string; mayBuild: boolean }

/**
 * The value of `manifest_session` in a Cookie header, and nothing else from it. **Two are
 * none** (FE-28): the cookie is not `__Host-`, so a sibling host, a faculty app among them, can
 * plant one for the whole zone, and choosing either could file one person's conversations
 * under another. Until the platform renames it, a planted cookie signs the person out here,
 * visibly, rather than in as someone else.
 */
function sessionIn(cookieHeader: string | undefined): string | undefined {
  const values = (cookieHeader ?? '')
    .split(';')
    .map((part) => [part.slice(0, part.indexOf('=')).trim(), part] as const)
    .filter(([name, part]) => part.includes('=') && name === SESSION_COOKIE)
    .map(([, part]) => part.slice(part.indexOf('=') + 1).trim())
  if (values.length !== 1) return undefined
  return values[0] === '' ? undefined : values[0]
}

/** Who the session belongs to; `undefined` when there is none, or the platform refuses it. */
export async function whoIs(
  cookieHeader: string | undefined,
  platformOrigin: string,
): Promise<Person | undefined> {
  const session = sessionIn(cookieHeader)
  if (session === undefined) return undefined
  try {
    const me = unwrap(
      await createManifestClient({ origin: platformOrigin, session }).GET('/v1/me'),
      'getMe',
    )
    return { id: me.id, displayName: me.displayName, mayBuild: me.mayBuild }
  } catch (error) {
    if (error instanceof ManifestApiError && error.status === 401) return undefined
    // A NEW error, carrying the status and code alone: the platform's message, or a cause,
    // could hold the session (the identity test's fake echoes it).
    throw new Error(
      error instanceof ManifestApiError
        ? `getMe answered ${error.status} ${error.code}`
        : 'getMe could not reach the platform',
    )
  }
}
