import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod/v4'
import type { Config } from '../config.js'
import type { Store } from '../store/db.js'
import { CREDENTIAL } from '../store/runs.js'
import { guard } from './guard.js'
import type { KeptTokens } from './progress.js'

/**
 * F6b D5: THE IDS OF THE TOKENS OUR PAGE MINTS, kept so *Agents* tells ours from theirs, and says
 * who made an agent's (FE-49). Every token is the person's own mint, in the browser (D5); our
 * server is handed the id beside a conversation's secret (F2's hand-over, F4's change), or the id
 * alone for an agent of their own. **Never a secret** (Review Focus 4): `POST …/agents` takes
 * exactly its three fields. Both routes answer the app's kept members alone (F6), else `404`.
 */
const refuse = (reply: FastifyReply, status: number, code: string) =>
  reply.code(status).send({ error: { code } })

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** A moment in UTC, as the platform writes `Token.expiresAt`. */
const MOMENT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/

/** A token id handed over beside a secret: absent, or an id. Undefined when it is neither. */
export function tokenIdOf(value: unknown): string | null | undefined {
  if (value === undefined) return null
  return typeof value === 'string' && ID.test(value) ? value : undefined
}

/** A conversation's token, its id kept beside nothing secret (F2's and F4's hand-overs). */
export function keepConversationToken(
  store: Store,
  handed: {
    tokenId: string
    projectId: string
    personId: string
    conversationId: string
  },
): void {
  store.keepMinted({
    ...handed,
    purpose: 'conversation',
    name: null,
    expiresAt: null,
    mintedAt: new Date().toISOString(),
  })
}

/**
 * AN AGENT OF THEIR OWN, AS THE PAGE MINTED IT: exactly these three, and nothing shaped like a
 * credential (its name is theirs, free text: Review Focus 4).
 */
const AGENT = z
  .object({
    tokenId: z.string().regex(ID),
    name: z
      .string()
      .min(1)
      .max(64)
      .refine((name) => !CREDENTIAL.test(name)),
    expiresAt: z.string().regex(MOMENT),
  })
  .strict()

export function registerMinted(
  app: FastifyInstance,
  { config, store }: { config: Config; store: Store },
): void {
  const check = guard(config)
  const kept = (projectId: string, personId: string) =>
    store.members(projectId).some((member) => member.userId === personId)

  app.get<{ Params: { projectId: string } }>(
    '/api/apps/:projectId/minted',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const { projectId } = request.params
      if (!kept(projectId, who.person.id)) return refuse(reply, 404, 'NOT_FOUND')
      const watch = store.watchOf(projectId)
      const minted = store.mintedOn(projectId)
      const answer: KeptTokens = {
        ours: [
          ...(watch === undefined
            ? []
            : [
                {
                  tokenId: watch.tokenId,
                  purpose: 'watch' as const,
                  conversationId: null,
                  title: null,
                },
              ]),
          ...minted.flatMap((row) =>
            row.purpose === 'agent'
              ? []
              : [
                  {
                    tokenId: row.tokenId,
                    purpose: row.purpose,
                    conversationId: row.conversationId,
                    title:
                      row.conversationId === null
                        ? null
                        : (store.conversationById(row.conversationId)?.title ?? null),
                  },
                ],
          ),
        ],
        agents: minted
          .filter((row) => row.purpose === 'agent')
          .map((row) => ({
            tokenId: row.tokenId,
            by: { id: row.personId, name: store.personName(row.personId) },
          })),
      }
      return answer
    },
  )

  app.post<{ Params: { projectId: string } }>(
    '/api/apps/:projectId/agents',
    { errorHandler: (_error, _request, reply) => refuse(reply, 400, 'AGENT_INVALID') },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const { projectId } = request.params
      if (!kept(projectId, who.person.id)) return refuse(reply, 404, 'NOT_FOUND')
      const agent = AGENT.safeParse(request.body)
      if (!agent.success) return refuse(reply, 400, 'AGENT_INVALID')
      store.rememberPerson(who.person)
      store.keepMinted({
        tokenId: agent.data.tokenId,
        projectId,
        personId: who.person.id,
        purpose: 'agent',
        conversationId: null,
        name: agent.data.name,
        expiresAt: agent.data.expiresAt,
        mintedAt: new Date().toISOString(),
      })
      return reply.code(201).send()
    },
  )
}
