import type { FastifyInstance, FastifyReply } from 'fastify'
import type { Rounds } from '../build/round.js'
import type { Config } from '../config.js'
import type { ConversationTokens } from '../platform/project.js'
import type { Store } from '../store/db.js'
import { guard } from './guard.js'
import { LIMITS } from './progress.js'
import type { Work } from './work.js'

/**
 * MOMENT 6 ON OUR SERVER (F3 Task 9): Carry on, a message, an answer, Stop. Every route is
 * guarded by the person and by `Origin` (F2 Decision 3).
 * - **`/build` keeps F2's busy check**: one piece of work per conversation. It carries on a
 *   round that was interrupted, stopped, or needs them.
 * - **`/messages`, `/answers` and `/stop` never take it**: they exist to reach a round WHILE
 *   it works, which is minutes (read in sitting 1). They hand their words to the round.
 * - **Without the token** (a restart forgot it: F2 Decision 1), `409 TOKEN_MISSING`, and the
 *   page mints another and carries on.
 */
const refuse = (reply: FastifyReply, status: number, code: string) =>
  reply.code(status).send({ error: { code } })

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const empty = (body: unknown) =>
  body === undefined ||
  body === null ||
  (isObject(body) && Object.keys(body).length === 0)

/** `{}`, or `{ way: 'different' }`; else undefined. */
function wayOf(body: unknown): { way?: 'different' } | undefined {
  if (empty(body)) return {}
  if (!isObject(body) || Object.keys(body).length !== 1) return undefined
  return body['way'] === 'different' ? { way: 'different' } : undefined
}

/** One sentence of theirs, at most LIMITS.sentence, never blank. */
const sentence = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length <= LIMITS.sentence && value.trim() !== ''
    ? value
    : undefined

function messageOf(body: unknown): string | undefined {
  if (!isObject(body) || Object.keys(body).length !== 1) return undefined
  return sentence(body['words'])?.trim()
}

/** An answer is kept as they typed it: a secret's value is never trimmed. */
function answerOf(body: unknown): { questionId: string; words: string } | undefined {
  if (!isObject(body) || Object.keys(body).length !== 2) return undefined
  const { questionId } = body
  const words = sentence(body['words'])
  if (typeof questionId !== 'string' || questionId.length > 64 || words === undefined)
    return undefined
  return { questionId, words }
}

/** What a round that is not working may be carried on from (Task 8's statuses). */
const CARRIED_ON = new Set(['interrupted', 'stopped', 'needs-you'])

export function registerBuild(
  app: FastifyInstance,
  {
    config,
    store,
    work,
    tokens,
    rounds,
  }: {
    config: Config
    store: Store
    work: Work
    tokens: ConversationTokens
    rounds: Rounds
  },
): void {
  const check = guard(config)

  /** The person's conversation in one of `states`, whether or not work runs; else it has replied. */
  const reached = (
    id: string,
    personId: string,
    reply: FastifyReply,
    states: string[],
  ) => {
    const conversation = store.getConversation(id, personId)
    if (conversation === undefined) return void refuse(reply, 404, 'NOT_FOUND')
    if (!states.includes(conversation.state))
      return void refuse(reply, 409, 'CONVERSATION_STATE')
    return conversation
  }

  /** Carry on, Try a different way, Try again. */
  app.post<{ Params: { id: string } }>(
    '/api/conversations/:id/build',
    { errorHandler: (_error, _request, reply) => refuse(reply, 400, 'BUILD_INVALID') },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const asked = wayOf(request.body)
      if (asked === undefined) return refuse(reply, 400, 'BUILD_INVALID')
      const conversation = work.mine(request, reply, who, ['building'])
      if (conversation === undefined) return reply
      const run = store.latestRun(conversation.id)
      if (run === undefined || !CARRIED_ON.has(run.status))
        return refuse(reply, 409, 'CONVERSATION_STATE')
      const token = tokens.get(conversation.id)
      if (token === undefined) return refuse(reply, 409, 'TOKEN_MISSING')
      rounds.carryOn(conversation, token, asked.way)
      return reply.code(202).send()
    },
  )

  /** Their words while it works: read at the next move. */
  app.post<{ Params: { id: string } }>(
    '/api/conversations/:id/messages',
    { errorHandler: (_error, _request, reply) => refuse(reply, 400, 'MESSAGE_INVALID') },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const words = messageOf(request.body)
      if (words === undefined) return refuse(reply, 400, 'MESSAGE_INVALID')
      const conversation = reached(request.params.id, who.person.id, reply, [
        'building',
        'paused',
      ])
      if (conversation === undefined) return reply
      rounds.message(conversation, words)
      return reply.code(202).send()
    },
  )

  /** An answer to a question the round asked; a secret's goes to the sandbox alone. */
  app.post<{ Params: { id: string } }>(
    '/api/conversations/:id/answers',
    { errorHandler: (_error, _request, reply) => refuse(reply, 400, 'ANSWER_INVALID') },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const answer = answerOf(request.body)
      if (answer === undefined) return refuse(reply, 400, 'ANSWER_INVALID')
      const conversation = reached(request.params.id, who.person.id, reply, [
        'building',
        'paused',
      ])
      if (conversation === undefined) return reply
      switch (rounds.answer(conversation, answer.questionId, answer.words)) {
        case 'unknown':
          return refuse(reply, 404, 'QUESTION_NOT_FOUND')
        case 'invalid':
          return refuse(reply, 400, 'ANSWER_INVALID')
        case 'token':
          return refuse(reply, 409, 'TOKEN_MISSING')
        case 'taken':
          return reply.code(202).send()
      }
    },
  )

  /** Stop: whatever the draft address has, it keeps. Twice is once. */
  app.post<{ Params: { id: string } }>(
    '/api/conversations/:id/stop',
    { errorHandler: (_error, _request, reply) => refuse(reply, 400, 'STOP_INVALID') },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      if (!empty(request.body)) return refuse(reply, 400, 'STOP_INVALID')
      const conversation = reached(request.params.id, who.person.id, reply, [
        'building',
        'paused',
      ])
      if (conversation === undefined) return reply
      rounds.stop(conversation)
      return reply.code(202).send()
    },
  )
}
