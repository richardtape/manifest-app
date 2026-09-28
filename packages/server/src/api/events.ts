import type { ServerResponse } from 'node:http'
import type { FastifyInstance } from 'fastify'
import type { Config } from '../config.js'
import type { Conversation, Store } from '../store/db.js'
import { guard } from './guard.js'
import { problem } from './problems.js'
import type { Progress } from './progress.js'

/**
 * ONE PROGRESS STREAM PER CONVERSATION (F2 Decision 4): Server-Sent Events, the whole state
 * first, then each change. Nothing buffers it, through our assembly or the edge (F2 M5).
 */

/** Who is listening to which conversation. One per server: never a module global. */
export interface Hub {
  publish(conversationId: string, frame: Progress): void
  subscribe(conversationId: string, listener: (frame: Progress) => void): () => void
}

export function createHub(): Hub {
  const listeners = new Map<string, Set<(frame: Progress) => void>>()
  return {
    publish(conversationId, frame) {
      for (const listener of [...(listeners.get(conversationId) ?? [])]) listener(frame)
    },
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

/** Every change of state is published whole. */
export function publishState(hub: Hub, conversation: Conversation): void {
  hub.publish(conversation.id, { kind: 'state', conversation })
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
  }: { conversation: Conversation; code: string; operation: string },
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
  hub.publish(conversation.id, { kind: 'refusal', code, reference })
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
      const conversation = store.getConversation(request.params.id, who.person.id)
      if (conversation === undefined) return reply.code(404).send(NOT_FOUND)

      reply.hijack()
      const response = reply.raw
      response.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      })
      // THE STATE FIRST, then each change: nothing can be published between the two lines,
      // which run without a pause between them.
      response.write(data({ kind: 'state', conversation }))
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
