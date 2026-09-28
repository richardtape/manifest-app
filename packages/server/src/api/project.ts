import type { FastifyInstance, FastifyReply } from 'fastify'
import type { Config } from '../config.js'
import type { IntakeKeys } from '../platform/intake.js'
import type { ConversationTokens, Made, Projects } from '../platform/project.js'
import { PlatformRefusal } from '../platform/refusal.js'
import type { Store } from '../store/db.js'
import { publishState, type Hub } from './events.js'
import { guard } from './guard.js'

/**
 * THE END OF MOMENT 4 ON OUR SERVER (F2 Task 8): the project the browser made, and the
 * conversation's token it minted, both in the person's session (FE-2 keeps us out of it).
 * - **The token is checked before it is trusted**: `getProject` with it must answer that
 *   project, and a token sees exactly one. Otherwise it is never kept.
 * - **Kept in memory only** (Decision 1). After a restart the page hands over another, for the
 *   same project: the conversation is tied to one project for good.
 * - **The intake is over**: its key is dropped.
 */
const refuse = (reply: FastifyReply, status: number, code: string) =>
  reply.code(status).send({ error: { code } })

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN = /^\S{1,512}$/

function handedOf(body: unknown): { projectId: string; token: string } | undefined {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined
  const b = body as Record<string, unknown>
  const keys = Object.keys(b)
  if (keys.length !== 2 || !('projectId' in b) || !('token' in b)) return undefined
  const { projectId, token } = b
  if (typeof projectId !== 'string' || !ID.test(projectId)) return undefined
  if (typeof token !== 'string' || !TOKEN.test(token)) return undefined
  return { projectId, token }
}

/** What the platform refused, as the page is told: the token's, or the platform's absence. */
const NOT_THE_TOKENS = new Set([401, 403, 404])

export function registerProject(
  app: FastifyInstance,
  {
    config,
    store,
    hub,
    projects,
    tokens,
    intakeKeys,
  }: {
    config: Config
    store: Store
    hub: Hub
    projects: Projects
    tokens: ConversationTokens
    intakeKeys: IntakeKeys
  },
): void {
  const check = guard(config)

  app.post<{ Params: { id: string } }>(
    '/api/conversations/:id/project',
    { errorHandler: (_error, _request, reply) => refuse(reply, 400, 'PROJECT_INVALID') },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const handed = handedOf(request.body)
      if (handed === undefined) return refuse(reply, 400, 'PROJECT_INVALID')
      const conversation = store.getConversation(request.params.id, who.person.id)
      if (conversation === undefined) return refuse(reply, 404, 'NOT_FOUND')
      // Tied once, for good: after that, only a token of the same project.
      if (conversation.projectId !== null && conversation.projectId !== handed.projectId)
        return refuse(reply, 409, 'PROJECT_MISMATCH')
      if (conversation.projectId === null && conversation.state !== 'naming')
        return refuse(reply, 409, 'CONVERSATION_STATE')

      let made: Made
      try {
        made = await projects.read(handed.token, handed.projectId)
      } catch (error) {
        const refusal =
          error instanceof PlatformRefusal ? error : new PlatformRefusal('INTERNAL', null)
        if (refusal.status !== null && NOT_THE_TOKENS.has(refusal.status))
          return refuse(reply, 400, 'TOKEN_NOT_FOR_PROJECT')
        return refuse(reply, 502, 'PLATFORM_UNAVAILABLE')
      }
      if (made.id !== handed.projectId) return refuse(reply, 400, 'TOKEN_NOT_FOR_PROJECT')

      // THE FIRST WINS (a deferred Minor, Rich's word). Read again after the await: another
      // window's handover may have tied it meanwhile. No await from here to the tie, so no
      // second handover can come between.
      const now = store.getConversation(conversation.id, who.person.id) ?? conversation
      if (now.projectId !== null && now.projectId !== handed.projectId)
        return refuse(reply, 409, 'PROJECT_MISMATCH')
      tokens.put(conversation.id, handed.token)
      if (now.projectId === null) {
        store.addMessage(conversation.id, 'we', { kind: 'project', project: made })
        intakeKeys.drop(conversation.id)
        publishState(
          hub,
          store,
          store.setState(conversation.id, 'making', { projectId: made.id }),
        )
      }
      return reply.code(204).send()
    },
  )
}
