import type { Schemas } from '@manifest/contract'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { chooseBlueprint } from '../agents/blueprint.js'
import { suggestNames } from '../agents/naming.js'
import { understand } from '../agents/understanding.js'
import type { Config } from '../config.js'
import { ModelError, type Model } from '../model/client.js'
import type { Conversation, ConversationState, Store } from '../store/db.js'
import { publishRefusal, publishState, type Hub } from './events.js'
import { intakeKeyFrom, type IntakeKeys } from '../platform/intake.js'
import { guard } from './guard.js'
import { intakeOf, type Said } from './intake-state.js'
import type { StepKey } from './progress.js'

/**
 * MOMENTS 3 AND 4 ON OUR SERVER (F2 Task 5): the three intake agents, wired to a
 * conversation. Each route answers `202` and works in the background, and what it did
 * reaches the page on the conversation's stream (Decision 4): a step, then the whole state,
 * or a refusal with its support reference (Decision 11). One piece of work per conversation
 * at a time, and each route only in its state.
 */

const refuse = (reply: FastifyReply, status: number, code: string) =>
  reply.code(status).send({ error: { code } })

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const MAX_ANSWER = 500
const TAKEN = /^[a-z0-9][a-z0-9-]{0,62}$/

type IntakeBody =
  | { kind: 'read' }
  | { kind: 'skip' }
  | { kind: 'answers'; answers: Record<string, string> }

function intakeBodyOf(body: unknown): IntakeBody | undefined {
  if (body === undefined || body === null) return { kind: 'read' }
  if (!isObject(body)) return undefined
  const keys = Object.keys(body)
  if (keys.length === 0) return { kind: 'read' }
  if (keys.length !== 1) return undefined
  if (keys[0] === 'skip') return body['skip'] === true ? { kind: 'skip' } : undefined
  if (keys[0] !== 'answers' || !isObject(body['answers'])) return undefined
  const answers: Record<string, string> = {}
  for (const [id, answer] of Object.entries(body['answers'])) {
    if (typeof answer !== 'string' || answer.length > MAX_ANSWER) return undefined
    answers[id] = answer
  }
  return { kind: 'answers', answers }
}

/** The blueprints the browser read, as much of each as the choice needs, or undefined. */
function blueprintsOf(body: unknown): Schemas['BlueprintList'] | undefined {
  if (!isObject(body) || Object.keys(body).length !== 1) return undefined
  const list = body['blueprints']
  if (!Array.isArray(list) || list.length === 0 || list.length > 20) return undefined
  const fine = list.every(
    (b) =>
      isObject(b) &&
      typeof b['ref'] === 'string' &&
      b['ref'] !== '' &&
      Array.isArray(b['starters']) &&
      b['starters'].every((s) => isObject(s) && typeof s['name'] === 'string'),
  )
  return fine ? (list as Schemas['BlueprintList']) : undefined
}

export function registerIntake(
  app: FastifyInstance,
  {
    config,
    store,
    hub,
    intakeModel,
    intakeKeys,
  }: {
    config: Config
    store: Store
    hub: Hub
    intakeModel: (conversation: Conversation) => Model
    intakeKeys: IntakeKeys
  },
): void {
  const check = guard(config)
  const working = new Set<string>()

  const step = (
    conversation: Conversation,
    key: StepKey,
    state: 'now' | 'done' | 'halted',
  ) => hub.publish(conversation.id, { kind: 'step', step: key, state })

  const moveTo = (conversation: Conversation, state: ConversationState) =>
    publishState(hub, store, store.setState(conversation.id, state))

  /** The conversation as it is now, whoever last changed it. */
  const now = (conversation: Conversation) =>
    store.getConversation(conversation.id, conversation.personId) ?? conversation

  /**
   * ONE PIECE OF WORK, IN THE BACKGROUND. A model's refusal halts the step and is published
   * with its reference; anything else unexpected is ours, said as INTERNAL, with its stack
   * to the output for whoever is looking. The conversation stays where it was, so the
   * person can try again, or name it themselves.
   */
  function run(
    conversation: Conversation,
    key: StepKey,
    work: () => Promise<ConversationState | undefined>,
  ) {
    working.add(conversation.id)
    step(conversation, key, 'now')
    void work()
      .then(
        (next) => {
          step(conversation, key, 'done')
          if (next === undefined) publishState(hub, store, now(conversation))
          else moveTo(conversation, next)
        },
        (error: unknown) => {
          step(conversation, key, 'halted')
          if (!(error instanceof ModelError)) console.error(error)
          publishRefusal(hub, store, {
            conversation,
            code: error instanceof ModelError ? error.code : 'INTERNAL',
            operation: `conversation ${key}`,
          })
        },
      )
      .finally(() => working.delete(conversation.id))
  }

  /**
   * The person's conversation in one of `states`, not already working; else it has replied.
   * Synchronous on purpose: nothing may run between its busy check and `run`'s claim, or two
   * presses at once would both pass.
   */
  function mine(
    request: { params: { id: string } },
    reply: FastifyReply,
    who: { person: { id: string } },
    states: ConversationState[],
  ): Conversation | undefined {
    const conversation = store.getConversation(request.params.id, who.person.id)
    if (conversation === undefined) return void refuse(reply, 404, 'NOT_FOUND')
    if (working.has(conversation.id)) return void refuse(reply, 409, 'CONVERSATION_BUSY')
    if (!states.includes(conversation.state))
      return void refuse(reply, 409, 'CONVERSATION_STATE')
    return conversation
  }

  const say = (conversation: Conversation, from: 'person' | 'we', said: Said) =>
    store.addMessage(conversation.id, from, said)

  const invalid = (code: string) => ({
    errorHandler: (_error: unknown, _request: unknown, reply: FastifyReply) =>
      refuse(reply, 400, code),
  })

  /**
   * THE HANDOVER (F2 Task 6): the intake key the browser was answered, kept in memory only
   * (Decision 1), and only with our own gateway's base URL. While the intake lasts.
   */
  app.post<{ Params: { id: string } }>(
    '/api/conversations/:id/intake-key',
    invalid('INTAKE_KEY_INVALID'),
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const conversation = mine(request, reply, who, [
        'describing',
        'questions',
        'naming',
      ])
      if (conversation === undefined) return reply
      const key = intakeKeyFrom(request.body, config)
      if ('refused' in key) return refuse(reply, 400, key.refused)
      intakeKeys.put(conversation.id, key)
      return reply.code(204).send()
    },
  )

  /** Round 1, round 2 with answers, or skipped: never a round 3 (moment 3). */
  app.post<{ Params: { id: string } }>(
    '/api/conversations/:id/intake',
    invalid('INTAKE_INVALID'),
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const body = intakeBodyOf(request.body)
      if (body === undefined) return refuse(reply, 400, 'INTAKE_INVALID')
      const allowed: ConversationState[] =
        body.kind === 'read'
          ? ['describing']
          : body.kind === 'answers'
            ? ['questions']
            : ['describing', 'questions']
      const conversation = mine(request, reply, who, allowed)
      if (conversation === undefined) return reply

      const intake = intakeOf(store, conversation.id)
      const open = intake.understood?.questions ?? []
      if (
        body.kind === 'answers' &&
        !Object.keys(body.answers).every((id) => open.some((q) => q.id === id))
      )
        return refuse(reply, 400, 'INTAKE_INVALID')
      reply.code(202).send()

      if (body.kind === 'read') {
        run(conversation, 'understanding', async () => {
          const understood = await understand(
            intakeModel(conversation),
            conversation.description,
            {},
            1,
          )
          say(conversation, 'we', { kind: 'understood', round: 1, understood })
          return understood.questions.length > 0 ? 'questions' : 'naming'
        })
        return reply
      }

      const round = intake.round ?? 1
      const answered: Record<string, string> = {}
      const skipped: string[] = []
      for (const question of open) {
        const answer =
          body.kind === 'answers' ? body.answers[question.id]?.trim() : undefined
        if (answer === undefined || answer === '') skipped.push(question.ask)
        else answered[question.ask] = answer
      }
      say(
        conversation,
        'person',
        open.length === 0
          ? { kind: 'skip' }
          : { kind: 'answers', round, answers: answered, skipped },
      )

      // Round 2 only when round 1 had answers; after round 2, there is no round 3.
      if (body.kind === 'skip' || round === 2 || Object.keys(answered).length === 0) {
        moveTo(conversation, 'naming')
        return reply
      }
      run(conversation, 'understanding', async () => {
        const all = { ...intake.answers, ...answered }
        const understood = await understand(
          intakeModel(conversation),
          conversation.description,
          all,
          2,
        )
        say(conversation, 'we', { kind: 'understood', round: 2, understood })
        return understood.questions.length > 0 ? 'questions' : 'naming'
      })
      return reply
    },
  )

  /** Names, with the addresses the browser found taken; at most two rounds (Review Focus 3). */
  app.post<{ Params: { id: string } }>(
    '/api/conversations/:id/names',
    invalid('NAMES_INVALID'),
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const body = request.body
      if (
        !isObject(body) ||
        Object.keys(body).length !== 1 ||
        !Array.isArray(body['taken']) ||
        body['taken'].length > 30 ||
        !body['taken'].every((slug) => typeof slug === 'string' && TAKEN.test(slug))
      )
        return refuse(reply, 400, 'NAMES_INVALID')
      const taken = body['taken'] as string[]
      const conversation = mine(request, reply, who, ['naming'])
      if (conversation === undefined) return reply
      const intake = intakeOf(store, conversation.id)
      if (intake.namesAsked >= 2) return refuse(reply, 409, 'NAMES_EXHAUSTED')
      reply.code(202).send()

      run(conversation, 'naming', async () => {
        const about = intake.understood?.restatement ?? conversation.description
        const { names } = await suggestNames(intakeModel(conversation), about, taken)
        say(conversation, 'we', { kind: 'names', names, taken })
        return undefined
      })
      return reply
    },
  )

  /** The blueprint and any starter, from the list the browser read (D3). */
  app.post<{ Params: { id: string } }>(
    '/api/conversations/:id/blueprint',
    invalid('BLUEPRINTS_INVALID'),
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const blueprints = blueprintsOf(request.body)
      if (blueprints === undefined) return refuse(reply, 400, 'BLUEPRINTS_INVALID')
      const conversation = mine(request, reply, who, ['naming'])
      if (conversation === undefined) return reply
      const intake = intakeOf(store, conversation.id)
      reply.code(202).send()

      run(conversation, 'blueprint', async () => {
        const about = intake.understood?.restatement ?? conversation.description
        const chosen = await chooseBlueprint(intakeModel(conversation), about, blueprints)
        say(conversation, 'we', { kind: 'blueprint', chosen })
        return undefined
      })
      return reply
    },
  )
}
