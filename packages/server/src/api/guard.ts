import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Config } from '../config.js'
import { whoIs, type Person } from '../identity.js'

/**
 * EVERY REQUEST TO OUR API IS JUDGED TWICE (F2 Decision 3).
 * - **From where**, first: a change (anything but GET, HEAD, OPTIONS) must carry our own
 *   `Origin`. `SameSite=Lax` sends the person's cookie on a same-SITE post, and every
 *   student app is same-site with us (`<slug>.staging.manifest.internal`), so the cookie
 *   alone proves nothing: this is the platform's own reason (spec §20). A browser sends
 *   `Origin` on every POST, so none at all is refused too. It comes first, so a forged
 *   request never costs a question to the platform.
 * - **Who**: `whoIs`, FE-2's one use of the session.
 *
 * Called first in each handler; when it answers `undefined` it has already replied.
 */
export type Guarded<P> = { person: P }
export type Check<P> = (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<Guarded<P> | undefined>

const READS = new Set(['GET', 'HEAD', 'OPTIONS'])

function refuse(reply: FastifyReply, status: number, code: string): undefined {
  void reply.code(status).send({ error: { code } })
  return undefined
}

/** 401 without a person; 502 when the platform cannot say; 403 for a change not from us. */
export function guard(config: Config): Check<Person>
/**
 * A person when there is one, and nobody otherwise: a problem report (Decision 11) must
 * be kept from someone who cannot sign in, or when the platform is the problem.
 */
export function guard(
  config: Config,
  options: { person: 'optional' },
): Check<Person | undefined>
export function guard(
  config: Config,
  options: { person: 'required' | 'optional' } = { person: 'required' },
): Check<Person> | Check<Person | undefined> {
  return async (request, reply) => {
    if (!READS.has(request.method) && request.headers.origin !== config.origin)
      return refuse(reply, 403, 'ORIGIN_REFUSED')

    let person: Person | undefined
    try {
      person = await whoIs(request.headers.cookie, config.platformOrigin)
    } catch {
      if (options.person === 'optional') return { person: undefined }
      return refuse(reply, 502, 'PLATFORM_UNAVAILABLE')
    }
    if (person === undefined && options.person === 'required')
      return refuse(reply, 401, 'UNAUTHENTICATED')
    return { person }
  }
}
