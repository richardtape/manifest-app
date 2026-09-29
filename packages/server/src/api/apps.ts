import type { FastifyInstance, FastifyReply } from 'fastify'
import type { Line } from '../build/line.js'
import type { Config } from '../config.js'
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
/** The change planner's own title is at most this long (Task 7); theirs is cut to fit. */
const TITLE = 60
/** A fix conversation's title and words (Words proposed for Rich). */
export const FIX_WORDS = "It didn't start on the trying-out address"

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** `{ words, token }` or `{ fix: { incidentId }, token }`, and nothing else. */
function changeOf(
  body: unknown,
): { words: string; token: string } | { incidentId: string; token: string } | undefined {
  if (!isObject(body) || Object.keys(body).length !== 2) return undefined
  const { token } = body
  if (typeof token !== 'string' || !TOKEN.test(token)) return undefined
  if ('words' in body) {
    const { words } = body
    if (typeof words !== 'string' || words.length > LIMITS.description) return undefined
    return words.trim() === '' ? undefined : { words: words.trim(), token }
  }
  const { fix } = body
  if (!isObject(fix) || Object.keys(fix).length !== 1) return undefined
  const { incidentId } = fix
  if (typeof incidentId !== 'string' || !ID.test(incidentId)) return undefined
  return { incidentId, token }
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
      const words = 'words' in asked ? asked.words : FIX_WORDS
      const change = store.createChange(who.person.id, projectId, titleOf(words), words)
      store.addMessage(change.id, 'we', { kind: 'project', project: made })
      store.addMessage(change.id, 'words' in asked ? 'person' : 'we', {
        kind: 'asked',
        change: 1,
        words,
        fix: 'words' in asked ? null : { incidentId: asked.incidentId },
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
