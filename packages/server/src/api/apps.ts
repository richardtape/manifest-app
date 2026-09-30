import type { FastifyInstance, FastifyReply } from 'fastify'
import type { Line } from '../build/line.js'
import type { Config } from '../config.js'
import type { FixEnvironment } from '../platform/instances.js'
import type { ConversationTokens, Made, Projects } from '../platform/project.js'
import { PlatformRefusal } from '../platform/refusal.js'
import type { Conversation, Run, Store } from '../store/db.js'
import type { Hub } from './events.js'
import { guard } from './guard.js'
import { lineOf, waitsOnPerson } from './line-state.js'
import type { Asked } from './piece-state.js'
import { LIMITS, type AppConversation, type Chip } from './progress.js'

/**
 * AN APP'S CONVERSATIONS ON OUR SERVER (F4 Task 6). Every route is guarded by the person, and a
 * change by `Origin` too (F2 Decision 3).
 * - **Ask for a change** posts their words with a token the browser has just minted for it, in
 *   one request. The token is checked as F2 checks it (`getProject` must answer that project)
 *   before anything is stored, and is kept in memory only (Decision 1). The line then says
 *   whether it starts now or waits (Decision 5).
 * - **A fix** is ours: its words are ours, and it carries the incident it answers (Decision 6).
 */
const refuse = (reply: FastifyReply, status: number, code: string) =>
  reply.code(status).send({ error: { code } })

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN = /^\S{1,512}$/
/** A moment in UTC, as the platform and `toISOString` write one (the plan's `before`). */
const MOMENT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/
/** The change planner's own title is at most this long (Task 7); theirs is cut to fit. */
const TITLE = 60
/** A fix conversation's title and words (Words proposed for Rich). */
export const FIX_WORDS = "It didn't start on the trying-out address"
/** A fix for a start on the live address (F5 Decision 13; Words proposed for Rich). */
export const LIVE_FIX_WORDS = "It didn't start on the live address"

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * `{ words, token }`, `{ words, token, refusal: { approvalId } }` (*[Talk it through]*: F5 Task 8)
 * or `{ fix: { incidentId, environment? }, token }` (`staging` when absent, as F4's; `production`
 * for the live address: F5 Decision 13), and nothing else.
 */
function changeOf(
  body: unknown,
):
  | { words: string; token: string; refusal: { approvalId: string } | null }
  | { incidentId: string; environment: FixEnvironment; token: string }
  | undefined {
  if (!isObject(body)) return undefined
  const keys = Object.keys(body).length
  const { token } = body
  if (typeof token !== 'string' || !TOKEN.test(token)) return undefined
  if ('words' in body) {
    if (keys !== ('refusal' in body ? 3 : 2)) return undefined
    const { words } = body
    if (typeof words !== 'string' || words.length > LIMITS.description) return undefined
    let refusal: { approvalId: string } | null = null
    if ('refusal' in body) {
      const asked = body['refusal']
      if (!isObject(asked) || Object.keys(asked).length !== 1) return undefined
      const { approvalId } = asked
      if (typeof approvalId !== 'string' || !ID.test(approvalId)) return undefined
      refusal = { approvalId }
    }
    return words.trim() === '' ? undefined : { words: words.trim(), token, refusal }
  }
  if (keys !== 2) return undefined
  const { fix } = body
  if (!isObject(fix)) return undefined
  const { incidentId, environment = 'staging' } = fix
  if (Object.keys(fix).length !== ('environment' in fix ? 2 : 1)) return undefined
  if (typeof incidentId !== 'string' || !ID.test(incidentId)) return undefined
  if (environment !== 'staging' && environment !== 'production') return undefined
  return { incidentId, environment, token }
}

/** Their words, as a title: the first line, cut at a word, until the plan names it (Decision 6). */
export function titleOf(words: string): string {
  const line = (words.split('\n')[0] ?? words).replace(/\s+/g, ' ').trim()
  const plain = line.replace(/[.!]+$/, '')
  if (plain.length <= TITLE) return plain
  const cut = plain.slice(0, TITLE)
  const space = cut.lastIndexOf(' ')
  return `${(space > 0 ? cut.slice(0, space) : cut.slice(0, TITLE - 1)).replace(/[,;:]$/, '')}…`
}

/** What the platform refused, as the page is told: the token's, or the platform's absence. */
const NOT_THE_TOKENS = new Set([401, 403, 404])

/** The five states, for a row of the app's conversations (`20-states.md`). */
export function chipOf(
  conversation: Conversation,
  run: Run | undefined,
  busy: boolean,
): Chip {
  switch (conversation.state) {
    case 'waiting':
      return 'waiting'
    case 'built':
      return 'steady'
    case 'set-aside':
      return 'notyet'
    case 'making':
    case 'agreed':
      return 'working'
    case 'building':
      if (run?.status === 'stopped') return 'notyet'
      return waitsOnPerson(conversation, run, busy) ? 'attention' : 'working'
    case 'planning':
      return busy ? 'working' : 'attention'
    default:
      return 'attention'
  }
}

export function registerApps(
  app: FastifyInstance,
  {
    config,
    store,
    hub,
    projects,
    tokens,
    line,
  }: {
    config: Config
    store: Store
    hub: Hub
    projects: Projects
    tokens: ConversationTokens
    line: Line
  },
): void {
  const check = guard(config)

  app.post<{ Params: { projectId: string } }>(
    '/api/apps/:projectId/conversations',
    { errorHandler: (_error, _request, reply) => refuse(reply, 400, 'CHANGE_INVALID') },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const { projectId } = request.params
      if (!ID.test(projectId)) return refuse(reply, 404, 'NOT_FOUND')
      const asked = changeOf(request.body)
      if (asked === undefined) return refuse(reply, 400, 'CHANGE_INVALID')

      let made: Made
      try {
        made = await projects.read(asked.token, projectId)
      } catch (error) {
        const refusal =
          error instanceof PlatformRefusal ? error : new PlatformRefusal('INTERNAL', null)
        if (refusal.status !== null && NOT_THE_TOKENS.has(refusal.status))
          return refuse(reply, 400, 'TOKEN_NOT_FOR_PROJECT')
        return refuse(reply, 502, 'PLATFORM_UNAVAILABLE')
      }
      if (made.id !== projectId) return refuse(reply, 400, 'TOKEN_NOT_FOR_PROJECT')

      // No await from here to the line's answer: two asked in one tick are one and the next.
      store.rememberPerson(who.person)
      const words =
        'words' in asked
          ? asked.words
          : asked.environment === 'production'
            ? LIVE_FIX_WORDS
            : FIX_WORDS
      const change = store.createChange(who.person.id, projectId, titleOf(words), words)
      store.addMessage(change.id, 'we', { kind: 'project', project: made })
      store.addMessage(change.id, 'words' in asked ? 'person' : 'we', {
        kind: 'asked',
        change: 1,
        words,
        // A trying-out fix is stored as F4 stored it; the live address's says so.
        fix:
          'words' in asked
            ? null
            : asked.environment === 'production'
              ? { incidentId: asked.incidentId, environment: 'production' }
              : { incidentId: asked.incidentId },
        ...('words' in asked && asked.refusal !== null ? { refusal: asked.refusal } : {}),
      } satisfies Asked)
      tokens.put(change.id, asked.token)
      line.join(change)
      return reply
        .code(201)
        .send(store.getConversation(change.id, who.person.id) ?? change)
    },
  )

  app.get<{ Params: { projectId: string } }>(
    '/api/apps/:projectId/conversations',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      return store
        .listConversationsOn(request.params.projectId, who.person.id)
        .map((conversation): AppConversation => {
          const busy = hub.busy(conversation.id)
          return {
            id: conversation.id,
            title: conversation.title,
            state: conversation.state,
            chip: chipOf(conversation, store.latestRun(conversation.id), busy),
            updatedAt: conversation.updatedAt,
            line: lineOf(store, conversation, hub.busy),
          }
        })
    },
  )

  // TRYING-OUT'S SECRETS (F4 Task 10, Decision 15): which names we asked for, and the question we
  // asked for each, so the page can name one staging lacks. Never a value: none is ever here.
  app.get<{ Params: { projectId: string } }>(
    '/api/apps/:projectId/secrets',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      return { secrets: store.secretsAskedOn(request.params.projectId, who.person.id) }
    },
  )

  // [WHAT WENT WRONG] AGAIN (the whole-branch review's I2): the fix we are already making for this
  // incident, so the page opens it rather than starting a second. One set aside is not under way.
  app.get<{ Params: { projectId: string; incidentId: string } }>(
    '/api/apps/:projectId/incidents/:incidentId/conversation',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const { projectId, incidentId } = request.params
      const id = store.fixFor(projectId, incidentId, who.person.id)
      if (id === undefined) return refuse(reply, 404, 'NOT_FOUND')
      return { id }
    },
  )

  // THE HAND-OVER (F5 Task 9, Decision 12): two rows of the plan the person last agreed on the app,
  // *What students see* and *Who gets in*, as written, for the message and the honest line. Never
  // another row; nobody else's (their conversations are theirs); no model. **`?before=<moment>`**
  // (the final review's I2): the page names when the version live was made, so a change agreed
  // since, on the draft and not live, never reaches the message to students.
  app.get<{ Params: { projectId: string }; Querystring: { before?: unknown } }>(
    '/api/apps/:projectId/plan',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const { projectId } = request.params
      if (!ID.test(projectId)) return refuse(reply, 404, 'NOT_FOUND')
      const { before } = request.query
      let by: string | undefined
      if (before !== undefined) {
        if (typeof before !== 'string' || !MOMENT.test(before))
          return refuse(reply, 400, 'PLAN_QUERY_INVALID')
        const at = new Date(before)
        if (Number.isNaN(at.getTime())) return refuse(reply, 400, 'PLAN_QUERY_INVALID')
        // As the store writes a moment, so the two compare as text.
        by = at.toISOString()
      }
      const agreed = store.agreedPlanOn(projectId, who.person.id, by) as
        Partial<Record<'studentsSee' | 'whoGetsIn', unknown>> | undefined
      const { studentsSee, whoGetsIn } = agreed ?? {}
      if (typeof studentsSee !== 'string' || typeof whoGetsIn !== 'string')
        return refuse(reply, 404, 'NOT_FOUND')
      return { studentsSee, whoGetsIn }
    },
  )

  // [TALK IT THROUGH] AGAIN (F5 Task 8, the final review's I1): the change we are already making
  // for this refusal, so the press opens it rather than starting a second. One set aside is not
  // under way, and pressing again then starts a new one.
  app.get<{ Params: { projectId: string; approvalId: string } }>(
    '/api/apps/:projectId/refusals/:approvalId/conversation',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const { projectId, approvalId } = request.params
      const id = store.changeForRefusal(projectId, approvalId, who.person.id)
      if (id === undefined) return refuse(reply, 404, 'NOT_FOUND')
      return { id }
    },
  )

  app.get<{ Params: { projectId: string; instanceId: string } }>(
    '/api/apps/:projectId/instances/:instanceId/conversation',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const { projectId, instanceId } = request.params
      const id = store.conversationForInstance(projectId, instanceId, who.person.id)
      if (id === undefined) return refuse(reply, 404, 'NOT_FOUND')
      return { id }
    },
  )
}
