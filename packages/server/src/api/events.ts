import type { ServerResponse } from 'node:http'
import type { FastifyInstance } from 'fastify'
import type { Config } from '../config.js'
import type { Conversation, Store } from '../store/db.js'
import { guard } from './guard.js'
import { intakeOf, planOf } from './intake-state.js'
import { lineOf } from './line-state.js'
import { pieceOf } from './piece-state.js'
import { problem } from './problems.js'
import type { Allowance, Progress } from './progress.js'
import { roundOf, threadOf } from './round-state.js'
import { mayRead, reachable } from './sharing.js'

/**
 * ONE PROGRESS STREAM PER CONVERSATION (F2 Decision 4): Server-Sent Events, the whole state
 * first, then each change. Nothing buffers it, through our assembly or the edge (F2 M5).
 */

/** Who is listening to which conversation. One per server: never a module global. */
export interface Hub {
  publish(conversationId: string, frame: Progress): void
  subscribe(conversationId: string, listener: (frame: Progress) => void): () => void
  /**
   * The steps at work now, each as its `now` frame (Review Focus 5): a connection made after a
   * step began hears it, so a reconnect mid-step shows it working. After a restart there are
   * none, and the page offers Carry on.
   */
  working(conversationId: string): Progress[]
  /**
   * WORK IN FLIGHT, by conversation (work.ts claims it): one piece at a time, and a stopped
   * round still finishing what it had in flight holds its app until it ends (F4 M7-1). Each
   * claim is released by its own holder alone.
   */
  claim(conversationId: string): symbol
  /** True when this claim was the conversation's, and is now released. */
  unclaim(conversationId: string, claim: symbol): boolean
  busy(conversationId: string): boolean
  /** F6 Decision 14: a page holds this conversation's stream. */
  watched(conversationId: string): boolean
}

export function createHub(): Hub {
  const listeners = new Map<string, Set<(frame: Progress) => void>>()
  const working = new Map<string, Map<string, Progress>>()
  const claims = new Map<string, symbol>()
  return {
    claim(conversationId) {
      const claim = Symbol(conversationId)
      claims.set(conversationId, claim)
      return claim
    },
    unclaim(conversationId, claim) {
      if (claims.get(conversationId) !== claim) return false
      claims.delete(conversationId)
      return true
    },
    busy: (conversationId) => claims.has(conversationId),
    watched: (conversationId) => listeners.has(conversationId),
    publish(conversationId, frame) {
      if (frame.kind === 'step') {
        const now = working.get(conversationId) ?? new Map<string, Progress>()
        if (frame.state === 'now') now.set(frame.step, frame)
        else now.delete(frame.step)
        if (now.size === 0) working.delete(conversationId)
        else working.set(conversationId, now)
      }
      for (const listener of [...(listeners.get(conversationId) ?? [])]) listener(frame)
    },
    working: (conversationId) => [...(working.get(conversationId)?.values() ?? [])],
    subscribe(conversationId, listener) {
      const set = listeners.get(conversationId) ?? new Set()
      listeners.set(conversationId, set.add(listener))
      return () => {
        set.delete(listener)
        if (set.size === 0) listeners.delete(conversationId)
      }
    },
  }
}

/**
 * The whole state: the conversation, its intake so far, its latest plan, its latest round, what
 * the rounds said, its piece of work and its place in the app's line (F4).
 */
export function stateFrame(
  store: Store,
  conversation: Conversation,
  busy: (conversationId: string) => boolean,
): Progress {
  const piece = pieceOf(store, conversation.id)
  return {
    kind: 'state',
    conversation: { ...conversation, byName: store.personName(conversation.personId) },
    intake: intakeOf(store, conversation.id),
    plan: planOf(store, conversation.id),
    round: roundOf(store, conversation.id),
    thread: threadOf(store, conversation.id),
    piece:
      conversation.projectId === null
        ? null
        : { kind: piece.kind, change: piece.change, asked: piece.asked },
    line: lineOf(store, conversation, busy),
  }
}

/**
 * EVERY CHANGE OF STATE IS PUBLISHED WHOLE, and with it each waiting conversation of the same
 * app: their frames say who holds it, and whether it waits for them (F4 Decision 5).
 */
export function publishState(hub: Hub, store: Store, conversation: Conversation): void {
  hub.publish(conversation.id, stateFrame(store, conversation, hub.busy))
  publishLine(hub, store, conversation.projectId, conversation.id)
}

/** Each waiting conversation of an app, told its place and its holder afresh. */
export function publishLine(
  hub: Hub,
  store: Store,
  projectId: string | null,
  except?: string,
): void {
  if (projectId === null) return
  for (const waiting of store.waitingOn(projectId))
    if (waiting.id !== except)
      hub.publish(waiting.id, stateFrame(store, waiting, hub.busy))
}

/**
 * A REFUSAL, WITH ITS SUPPORT REFERENCE (Decision 11). The row is written before the frame
 * is sent, so a person who quotes the reference the moment they see it can be found.
 */
export function publishRefusal(
  hub: Hub,
  store: Store,
  {
    conversation,
    code,
    operation,
    allowance,
  }: {
    conversation: Conversation
    code: string
    operation: string
    allowance?: Allowance | undefined
  },
  write?: (line: string) => void,
): string {
  const reference = problem(
    store,
    {
      code,
      operation,
      status: null,
      personId: conversation.personId,
      conversationId: conversation.id,
      platformRequestId: null,
    },
    write,
  )
  hub.publish(conversation.id, {
    kind: 'refusal',
    code,
    reference,
    ...(allowance === undefined ? {} : { allowance }),
  })
  return reference
}

const NOT_FOUND = { error: { code: 'NOT_FOUND' } }
const data = (frame: Progress) => `data: ${JSON.stringify(frame)}\n\n`

/**
 * `GET /api/conversations/:id/events`.
 * - **Never ended while the server runs** (F2 M5): an ended stream makes the browser come
 *   back every 3 seconds. A comment line on the heartbeat keeps an idle one from looking
 *   dead to anything between us and the page.
 * - **Ended when the server closes**, which Fastify's close would otherwise wait on for
 *   ever. Through the edge the browser then meets a `502` and gives up for good, which is
 *   why the page reopens a closed stream itself (Task 3, amended by sitting 1).
 * - No `id:` lines: the first frame is the whole state, so `Last-Event-ID` has nothing to add.
 */
export function registerEvents(
  app: FastifyInstance,
  {
    config,
    store,
    hub,
    heartbeatMs,
  }: { config: Config; store: Store; hub: Hub; heartbeatMs: number },
): void {
  const check = guard(config)
  const open = new Set<ServerResponse>()
  app.addHook('preClose', async () => {
    for (const response of open) response.end()
  })

  app.get<{ Params: { id: string } }>(
    '/api/conversations/:id/events',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      // F6b D3: every member of its app watches it; one frame serves them all.
      const conversation = reachable(store, request.params.id, who.person.id, mayRead)
      if (conversation === undefined) return reply.code(404).send(NOT_FOUND)

      reply.hijack()
      const response = reply.raw
      response.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      })
      // THE STATE FIRST, then each change: nothing can be published between the two lines,
      // which run without a pause between them.
      response.write(data(stateFrame(store, conversation, hub.busy)))
      for (const frame of hub.working(conversation.id)) response.write(data(frame))
      const unsubscribe = hub.subscribe(conversation.id, (frame) => {
        response.write(data(frame))
      })
      const heartbeat = setInterval(() => response.write(': keep-alive\n\n'), heartbeatMs)
      open.add(response)
      // The connection going. (The request's `close` fires at the same moment, measured on
      // Node 24.12, when a client aborts a stream.)
      response.on('close', () => {
        unsubscribe()
        clearInterval(heartbeat)
        open.delete(response)
      })
    },
  )
}
