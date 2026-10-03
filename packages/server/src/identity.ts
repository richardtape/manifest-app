import {
  createManifestClient,
  ManifestApiError,
  sessionCookieFor,
  unwrap,
} from '@manifest/contract'
import type { Config } from './config.js'

/**
 * THE ONLY READER OF THE SESSION (FE-2, decided by Rich). Every page request on the app's
 * origin carries the person's session cookie to us whether we want it or not, and the one use
 * we may make of it is to replay it to `GET /v1/me` to learn who we serve. It is never logged,
 * stored, or sent anywhere else, and it never rides out of here on an error.
 * Who we serve, and whether they may build: `mayBuild` is the platform's decision (FE-39), never ours.
 * Their address (F6, design §3) is where *your work is waiting* goes: an address is not a credential.
 */
export type Person = { id: string; displayName: string; email: string; mayBuild: boolean }

/**
 * The value of THE session cookie our origin reads, and nothing else from the header
 * (FE-28, the platform's `7b85326`, contract 1.6.0): `__Host-manifest_session` where the
 * browser reaches us on https (through the edge), `manifest_session` on loopback http (mock
 * mode), as the contract's `sessionCookieFor` names it. **The other name is not read at all**:
 * a plain `manifest_session` beside `__Host-` is ignored, as the platform ignores it on https
 * (its Decision 8), so a sibling app that sets the plain name for the whole zone neither signs
 * anyone in here nor out. **Two of the name read are none** (FE-28 (b), Rich's word): choosing
 * either could file one person's conversations under another.
 */
function sessionIn(cookieHeader: string | undefined, name: string): string | undefined {
  const values = (cookieHeader ?? '')
    .split(';')
    .map((part) => [part.slice(0, part.indexOf('=')).trim(), part] as const)
    .filter(([found, part]) => part.includes('=') && found === name)
    .map(([, part]) => part.slice(part.indexOf('=') + 1).trim())
  if (values.length !== 1) return undefined
  return values[0] === '' ? undefined : values[0]
}

/**
 * Who the session belongs to; `undefined` when there is none, or the platform refuses it.
 *
 * The name READ is our origin's (`config.origin`: where the browser reached us). The question
 * is asked at `config.sessionOrigin`, an origin Manifest serves, and the contract's client
 * sends the session under the name THAT origin reads: in edge mode both are
 * `https://app.manifest.internal`, so the browser's `__Host-manifest_session` is forwarded
 * under its own name, through the edge, where the control plane reads it. Never at
 * `platformOrigin` (7100 itself): the control plane judges a request to its bare port as the
 * console's https origin and reads only `__Host-`, while the client, reading `http:`, would
 * send the plain name, and everyone would be nobody (the platform's `d4291dd`).
 *
 * `fetch` is the client's: a test routes edge mode's https request to its fake with it.
 */
export async function whoIs(
  cookieHeader: string | undefined,
  config: Pick<Config, 'origin' | 'sessionOrigin'>,
  fetch?: typeof globalThis.fetch,
): Promise<Person | undefined> {
  const session = sessionIn(cookieHeader, sessionCookieFor(config.origin))
  if (session === undefined) return undefined
  try {
    const me = unwrap(
      await createManifestClient({
        origin: config.sessionOrigin,
        session,
        ...(fetch === undefined ? {} : { fetch }),
      }).GET('/v1/me'),
      'getMe',
    )
    // A platform from before FE-39 sends no decision: they build as today, as the page reads it.
    return {
      id: me.id,
      displayName: me.displayName,
      email: me.email,
      mayBuild: me.mayBuild !== false,
    }
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
