import type { FastifyInstance, FastifyReply } from 'fastify'
import { changedPlanMarkdown, dayOf, settledOf, writeChange } from '../agents/change.js'
import { planMarkdown, readPlanMarkdown, writePlan } from '../agents/plan.js'
import type { Rounds } from '../build/round.js'
import type { Config } from '../config.js'
import { ModelError, type Model } from '../model/client.js'
import type { AgentSessions } from '../platform/agent-sessions.js'
import type { Authoring } from '../platform/authoring.js'
import type { ConversationTokens, Projects } from '../platform/project.js'
import { PlatformRefusal } from '../platform/refusal.js'
import type { Conversation, Store } from '../store/db.js'
import { guard } from './guard.js'
import { intakeOf, pendingCorrection, planOf, type Said } from './intake-state.js'
import { pieceOf } from './piece-state.js'
import { LIMITS, type PlanView, type StepKey } from './progress.js'
import { Refused, type Work } from './work.js'

/**
 * F4: WHAT THE LINE'S `begin` CALLS FOR A CHANGE (Decision 5), and what `/plan` runs on a press:
 * the same work. To `planning`; the planner runs if the conversation's token is held.
 */
export interface Planning {
  begin(conversation: Conversation): void
}

/**
 * MOMENT 5 ON OUR SERVER (F2 Task 9): the plan, written on the person's agent session with
 * the conversation's token; corrected in a sentence; agreed, and committed into the app as
 * `docs/plan.md` (D6).
 * - **A session never outlives its step**: started, used, and ended, whatever happened.
 * - **The one model Config names**, and only if the session offers it; and only on our own
 *   gateway, as the intake's key is.
 * - **A spent allowance says whose, and when it resets** (Rich), from the budget read.
 * - **Without the token** (a restart forgot it: Decision 1), `409 TOKEN_MISSING`, and the page
 *   mints another and carries on (Review Focus 5).
 * - **A change (F4 Decision 7) takes the same routes**, dispatched on the conversation's piece:
 *   written from `docs/plan.md` as the tree holds it, agreed, and committed with its Changes.
 */
const refuse = (reply: FastifyReply, status: number, code: string) =>
  reply.code(status).send({ error: { code } })

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const trimmed = (url: string) => url.replace(/\/+$/, '')

/** `{ correction }`, one sentence of their words, or undefined. */
function correctionOf(body: unknown): string | undefined {
  if (!isObject(body) || Object.keys(body).length !== 1) return undefined
  const { correction } = body
  if (typeof correction !== 'string' || correction.length > LIMITS.sentence)
    return undefined
  return correction.trim() === '' ? undefined : correction.trim()
}

/** `{ answers }`, each a short answer to a question the plan asked, or undefined. */
/**
 * YES TO THE PLAN THE WINDOW SHOWS: `{ version, answers }` and nothing else. The version is
 * the one on screen, so a window behind never agrees to a plan it has not shown (a deferred
 * Minor, Rich's word).
 */
function agreementOf(
  body: unknown,
  latest: { version: number; plan: PlanView },
): { answers: Record<string, string> } | 'changed' | undefined {
  if (!isObject(body) || Object.keys(body).length !== 2 || !isObject(body['answers']))
    return undefined
  const version = body['version']
  if (typeof version !== 'number' || !Number.isInteger(version)) return undefined
  // Before the answers: a window behind answers questions the latest may no longer ask.
  if (version !== latest.version) return 'changed'
  const asked = latest.plan.onlyYouKnow.map((q) => q.id)
  const answers: Record<string, string> = {}
  for (const [id, answer] of Object.entries(body['answers'])) {
    if (
      !asked.includes(id) ||
      typeof answer !== 'string' ||
      answer.length > LIMITS.sentence
    )
      return undefined
    answers[id] = answer
  }
  return { answers }
}

const empty = (body: unknown) =>
  body === undefined ||
  body === null ||
  (isObject(body) && Object.keys(body).length === 0)

export function registerPlan(
  app: FastifyInstance,
  {
    config,
    store,
    work,
    tokens,
    sessions,
    projects,
    authoring,
    planModel,
    rounds,
    now = () => new Date(),
  }: {
    config: Config
    store: Store
    work: Work
    tokens: ConversationTokens
    sessions: AgentSessions
    projects: Projects
    authoring: Authoring
    /** The plan's model, on an agent session's key and our own gateway. */
    planModel: (key: string) => Model
    /** F3 Decision 11: the round starts itself once the plan is committed. */
    rounds: Rounds
    /** The day a change is dated by, in docs/plan.md's Changes. */
    now?: () => Date
  },
): Planning {
  const check = guard(config)
  const say = (conversation: Conversation, from: 'person' | 'we', said: Said) =>
    store.addMessage(conversation.id, from, said)

  /** The conversation's token, or it has replied: a restart forgot it (Decision 1). */
  const tokenFor = (conversation: Conversation, reply: FastifyReply) => {
    const token = tokens.get(conversation.id)
    if (token === undefined) void refuse(reply, 409, 'TOKEN_MISSING')
    return token
  }

  /** A call the token itself was refused on: the token is dropped, and the page mints another. */
  async function asked<T>(
    conversation: Conversation,
    call: () => Promise<T>,
  ): Promise<T> {
    try {
      return await call()
    } catch (error) {
      if (error instanceof PlatformRefusal && error.status === 401) {
        tokens.drop(conversation.id)
        throw new Refused('TOKEN_REFUSED')
      }
      throw error
    }
  }

  /** THE PLAN STEP: read how it is built, then write the plan, on a session of its own. */
  async function write(
    conversation: Conversation,
    token: string,
    next: (key: StepKey) => void,
  ) {
    const intake = intakeOf(store, conversation.id)
    const project = intake.project
    if (project === null) throw new Refused('PROJECT_MISSING')
    const budget = await asked(conversation, () => sessions.budget(token))
    const allowance = { monthlyUsd: budget.monthlyUsd, resetsAt: budget.resetsAt }
    // A budget the gateway could not read (null) starts anyway: the platform refuses a spent
    // month itself (the walk-through).
    if (budget.remainingUsd !== null && budget.remainingUsd <= 0)
      throw new Refused('MODEL_BUDGET_EXHAUSTED', allowance)
    let session: Awaited<ReturnType<AgentSessions['start']>>
    try {
      session = await asked(conversation, () =>
        sessions.start(token, project.id, conversation.title.slice(0, 64)),
      )
    } catch (error) {
      // A budget read can be seconds stale ("spend lands a few seconds after a call").
      if (error instanceof ModelError && error.code === 'MODEL_BUDGET_EXHAUSTED')
        throw new Refused('MODEL_BUDGET_EXHAUSTED', allowance)
      throw error
    }
    try {
      if (trimmed(session.baseUrl) !== trimmed(config.modelGateway))
        throw new Refused('MODEL_GATEWAY_REFUSED')
      if (!session.models.includes(config.planModel))
        throw new ModelError('MODEL_NOT_AVAILABLE')
      const knowledgePack = await asked(conversation, () =>
        projects.knowledgePack(token, project.blueprint),
      )
      const { commitSha, paths } = await asked(conversation, () =>
        authoring.tree(token, project.id),
      )
      const previous = planOf(store, conversation.id)
      const correction = pendingCorrection(store, conversation.id)
      const piece = pieceOf(store, conversation.id)
      if (piece.kind !== 'first') {
        // F4 Decision 7: the agreement as it stands is the file in the tree, read back.
        const text = await asked(conversation, () =>
          authoring.readPlan(token, project.id, commitSha),
        )
        next('writing')
        const read = text === null ? null : readPlanMarkdown(text)
        const change = await spending(token, () =>
          writeChange(planModel(session.key), {
            current: read?.plan ?? null,
            currentText: text ?? '',
            settled: settledOf(read),
            asked: piece.asked,
            knowledge: knowledgePack,
            ...(previous !== null && correction !== undefined
              ? { previous: { ...previous.plan, title: conversation.title }, correction }
              : {}),
          }),
        )
        // Not now while it wrote: set aside, and what it wrote is dropped.
        const now = store.getConversation(conversation.id, conversation.personId)
        if (now?.state !== 'planning') return undefined
        const { title, ...plan } = change
        store.savePlan(conversation.id, plan)
        store.setState(conversation.id, 'planning', { title })
        return 'plan-ready' as const
      }
      next('writing')
      const plan = await spending(token, () =>
        writePlan(planModel(session.key), {
          description: conversation.description,
          restatement: intake.understood?.restatement ?? conversation.description,
          answers: intake.answers,
          skipped: intake.skipped,
          knowledgePack,
          tree: paths,
          ...(previous !== null && correction !== undefined
            ? { previous: previous.plan, correction }
            : {}),
        }),
      )
      store.savePlan(conversation.id, plan)
      return 'plan-ready' as const
    } finally {
      await sessions.end(token, session.sessionId).catch(() => undefined)
    }
  }

  /** A model's answer; the gateway's 429 is a session's cap or a spent month alike: the budget says which. */
  async function spending<T>(token: string, call: () => Promise<T>): Promise<T> {
    try {
      return await call()
    } catch (error) {
      if (error instanceof ModelError && error.code === 'MODEL_BUDGET_EXHAUSTED') {
        const again = await sessions.budget(token).catch(() => undefined)
        if (again !== undefined && again.remainingUsd !== null && again.remainingUsd <= 0)
          throw new Refused('MODEL_BUDGET_EXHAUSTED', {
            monthlyUsd: again.monthlyUsd,
            resetsAt: again.resetsAt,
          })
      }
      throw error
    }
  }

  /** The plan step, begun: its planner runs now if the token is ours, else Carry on hands one over. */
  const planning: Planning = {
    begin(conversation) {
      const moved = work.moveTo(conversation, 'planning')
      const token = tokens.get(conversation.id)
      if (token !== undefined)
        work.run(moved, 'reading', (next) => write(moved, token, next))
    },
  }

  /** Write the plan: after Make it, or Carry on after a restart or a refusal. */
  app.post<{ Params: { id: string } }>(
    '/api/conversations/:id/plan',
    { errorHandler: (_error, _request, reply) => refuse(reply, 400, 'PLAN_INVALID') },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      if (!empty(request.body)) return refuse(reply, 400, 'PLAN_INVALID')
      const conversation = work.mine(request, reply, who, ['making', 'planning'])
      if (conversation === undefined) return reply
      const token = tokenFor(conversation, reply)
      if (token === undefined) return reply
      const planning = work.moveTo(conversation, 'planning')
      work.run(planning, 'reading', (next) => write(planning, token, next))
      return reply.code(202).send()
    },
  )

  /** Not quite: one sentence, and the plan comes back with the rows it changed marked. */
  app.post<{ Params: { id: string } }>(
    '/api/conversations/:id/plan/correction',
    {
      errorHandler: (_error, _request, reply) => refuse(reply, 400, 'CORRECTION_INVALID'),
    },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const correction = correctionOf(request.body)
      if (correction === undefined) return refuse(reply, 400, 'CORRECTION_INVALID')
      const conversation = work.mine(request, reply, who, ['plan-ready'])
      if (conversation === undefined) return reply
      const latest = planOf(store, conversation.id)
      if (latest === null) return refuse(reply, 409, 'PLAN_MISSING')
      const token = tokenFor(conversation, reply)
      if (token === undefined) return reply
      say(conversation, 'person', {
        kind: 'correction',
        text: correction,
        after: latest.version,
      })
      const planning = work.moveTo(conversation, 'planning')
      work.run(planning, 'reading', (next) => write(planning, token, next))
      return reply.code(202).send()
    },
  )

  /** Yes, build that: docs/plan.md, with their answers, committed into the app (D6). */
  app.post<{ Params: { id: string } }>(
    '/api/conversations/:id/plan/agree',
    { errorHandler: (_error, _request, reply) => refuse(reply, 400, 'AGREE_INVALID') },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const conversation = work.mine(request, reply, who, ['plan-ready'])
      if (conversation === undefined) return reply
      const latest = planOf(store, conversation.id)
      const project = intakeOf(store, conversation.id).project
      if (latest === null || project === null) return refuse(reply, 409, 'PLAN_MISSING')
      const agreement = agreementOf(request.body, latest)
      if (agreement === undefined) return refuse(reply, 400, 'AGREE_INVALID')
      if (agreement === 'changed') return refuse(reply, 409, 'PLAN_CHANGED')
      const { answers } = agreement
      const token = tokenFor(conversation, reply)
      if (token === undefined) return reply
      const piece = pieceOf(store, conversation.id)
      work.run(conversation, 'agreeing', async () => {
        const { commitSha } = await asked(conversation, () =>
          authoring.tree(token, project.id),
        )
        let markdown = planMarkdown(project.name, latest.plan, answers)
        let message: string | undefined
        if (piece.kind !== 'first') {
          // F4 Decision 7: the agreement as it now stands, and its Changes, before the round.
          const text = await asked(conversation, () =>
            authoring.readPlan(token, project.id, commitSha),
          )
          markdown = changedPlanMarkdown(
            project.name,
            text === null ? null : readPlanMarkdown(text),
            latest.plan,
            answers,
            { at: dayOf(now()), words: piece.asked.join(' ') },
          )
          message = `The change we agreed: ${conversation.title}`
        }
        const committed = await asked(conversation, () =>
          authoring.commitPlan(token, project.id, commitSha, markdown, message),
        )
        say(conversation, 'person', {
          kind: 'agreed',
          version: latest.version,
          answers,
          commitSha: committed.commitSha,
          sent: committed.sent,
        })
        // F3 Decision 11: agreed, and round 1 starts at once, on our server. A page closed
        // right after Yes still gets its build. The round holds its own claim (Task 9).
        rounds.start(work.moveTo(conversation, 'agreed'), token)
        return undefined
      })
      return reply.code(202).send()
    },
  )

  return planning
}
