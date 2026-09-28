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
 */
export type Person = { id: string; displayName: string }

/** The value of `manifest_session` in a Cookie header, and nothing else from it. */
function sessionIn(cookieHeader: string | undefined): string | undefined {
  for (const part of (cookieHeader ?? '').split(';')) {
    const at = part.indexOf('=')
    if (at !== -1 && part.slice(0, at).trim() === SESSION_COOKIE) {
      const value = part.slice(at + 1).trim()
      return value === '' ? undefined : value
    }
  }
  return undefined
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
    return { id: me.id, displayName: me.displayName }
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
