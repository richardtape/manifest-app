import type { FastifyInstance, FastifyReply } from 'fastify'
import type { Config } from '../config.js'
import type { Handed, Keeper } from '../keeping/keeper.js'
import { PlatformRefusal } from '../platform/refusal.js'
import type { Store } from '../store/db.js'
import { guard } from './guard.js'

/**
 * THE KEEPING WATCH TOKEN, HANDED OVER (F6 design §1). The page mints it in the person's session
 * (no step-up; any member may) and hands it here whenever we are not watching the app, or our
 * token has under 30 days left. Guarded as every change is (`Origin`, the person). **An app's
 * keeping is its members' alone**, by the members the keeper keeps: anyone else is `404`, as the
 * platform answers a stranger (Review Focus 5). An app we keep nothing for answers *not watching*,
 * so its page mints; the token it hands proves it can read the project, or nothing is kept.
 */
const refuse = (reply: FastifyReply, status: number, code: string) =>
  reply.code(status).send({ error: { code } })

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN = /^\S{1,512}$/
const KEYS = ['expiresAt', 'token', 'tokenId']

function handedOf(body: unknown): Handed | undefined {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined
  const b = body as Record<string, unknown>
  if (Object.keys(b).sort().join() !== KEYS.join()) return undefined
  const { token, tokenId, expiresAt } = b
  if (typeof token !== 'string' || !TOKEN.test(token)) return undefined
  if (typeof tokenId !== 'string' || !ID.test(tokenId)) return undefined
  if (typeof expiresAt !== 'string' || Number.isNaN(Date.parse(expiresAt)))
    return undefined
  return { token, tokenId, expiresAt }
}

/** What the platform refused, as the page is told: the token's, or the platform's absence. */
const NOT_THE_TOKENS = new Set([401, 403, 404])

export function registerKeeping(
  app: FastifyInstance,
  { config, store, keeper }: { config: Config; store: Store; keeper: Keeper },
): void {
  const check = guard(config)
  /** A stranger to an app we keep members for; an app we keep none for is anyone's to mint. */
  const stranger = (projectId: string, personId: string) => {
    const members = store.members(projectId)
    return members.length > 0 && !members.some((member) => member.userId === personId)
  }

  app.get<{ Params: { projectId: string } }>(
    '/api/apps/:projectId/keeping',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const { projectId } = request.params
      if (!ID.test(projectId) || stranger(projectId, who.person.id))
        return refuse(reply, 404, 'NOT_FOUND')
      const status = keeper.status(projectId)
      return {
        watching: status.watching,
        until: status.until,
        tokenId: status.tokenId,
        mine: status.mintedBy === who.person.id,
      }
    },
  )

  app.post<{ Params: { projectId: string } }>(
    '/api/apps/:projectId/keeping',
    { errorHandler: (_error, _request, reply) => refuse(reply, 400, 'KEEPING_INVALID') },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const { projectId } = request.params
      if (!ID.test(projectId) || stranger(projectId, who.person.id))
        return refuse(reply, 404, 'NOT_FOUND')
      const handed = handedOf(request.body)
      if (handed === undefined) return refuse(reply, 400, 'KEEPING_INVALID')
      let kept: 'kept' | 'current'
      try {
        kept = await keeper.hand(projectId, handed, who.person.id)
      } catch (error) {
        const refusal =
          error instanceof PlatformRefusal ? error : new PlatformRefusal('INTERNAL', null)
        if (
          refusal.code === 'TOKEN_NOT_FOR_PROJECT' ||
          (refusal.status !== null && NOT_THE_TOKENS.has(refusal.status))
        )
          return refuse(reply, 400, 'TOKEN_NOT_FOR_PROJECT')
        return refuse(reply, 502, 'PLATFORM_UNAVAILABLE')
      }
      const { until } = keeper.status(projectId)
      return kept === 'kept'
        ? reply.code(201).send({ watching: true, until })
        : reply.code(200).send({ kept: 'current', until })
    },
  )
}
