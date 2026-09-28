import type { FastifyInstance } from 'fastify'
import type { Config } from '../config.js'
import type { Store } from '../store/db.js'
import { guard } from './guard.js'
import { LIMITS } from './progress.js'

/**
 * `/api/conversations`: a person's words, and what we make of them (moments 3–5). A
 * conversation belongs to the person who started it: another person's is `404`, exactly
 * as one that does not exist, never `403`, as the platform answers a stranger (Decision 3).
 */
const INVALID = { error: { code: 'DESCRIPTION_INVALID' } }
const NOT_FOUND = { error: { code: 'NOT_FOUND' } }

/** The person's words, verbatim, if they are words: `{ description }` and nothing else. */
function descriptionOf(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined
  const keys = Object.keys(body)
  if (keys.length !== 1 || keys[0] !== 'description') return undefined
  const { description } = body as { description: unknown }
  if (typeof description !== 'string') return undefined
  if (description.trim() === '' || description.length > LIMITS.description)
    return undefined
  return description
}

export function registerConversations(
  app: FastifyInstance,
  { config, store }: { config: Config; store: Store },
): void {
  const check = guard(config)

  app.post(
    '/api/conversations',
    { errorHandler: (_error, _request, reply) => reply.code(400).send(INVALID) },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const description = descriptionOf(request.body)
      if (description === undefined) return reply.code(400).send(INVALID)
      store.rememberPerson(who.person)
      return reply.code(201).send(store.createConversation(who.person.id, description))
    },
  )

  app.get<{ Params: { id: string } }>(
    '/api/conversations/:id',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const conversation = store.getConversation(request.params.id, who.person.id)
      if (conversation === undefined) return reply.code(404).send(NOT_FOUND)
      return conversation
    },
  )
}
