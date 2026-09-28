import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import proxy from '@fastify/http-proxy'
import Fastify, { type FastifyInstance } from 'fastify'
import { registerConversations } from './api/conversations.js'
import { createHub, registerEvents, type Hub } from './api/events.js'
import { registerIntake } from './api/intake.js'
import { registerProblems } from './api/problems.js'
import type { Config } from './config.js'
import { whoIs } from './identity.js'
import { notAvailable, type Model } from './model/client.js'
import type { Conversation, Store } from './store/db.js'

/** Whatever serves the app: Vite's middlewares while we develop (main.ts). */
export type WebHandler = (request: IncomingMessage, response: ServerResponse) => void

/**
 * THE PATHS FASTIFY OWNS, in both modes (M4). `/api` is ours. `/v1` and `/auth` belong to
 * the platform: in mock mode we proxy them, and in edge mode the edge never sends them here,
 * so they are Fastify's 404, and never the app's `index.html`.
 */
const FASTIFY = ['/api', '/v1', '/auth']

function fastifyOwns(url: string | undefined): boolean {
  const path = (url ?? '/').split('?', 1)[0] ?? '/'
  return FASTIFY.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

function decodable(url: string | undefined): boolean {
  try {
    decodeURI(url ?? '/')
    return true
  } catch {
    return false
  }
}

/**
 * ONE PROCESS ON 7105 (Decision 4; M4 chose Fastify's `serverFactory`). The factory's
 * handler is the front door: Fastify's paths to Fastify, everything else to the app. It is
 * why Vite's SPA fallback can never answer an `/api` path with `index.html`.
 */
export function buildServer(
  config: Config,
  web: WebHandler,
  {
    store,
    hub = createHub(),
    heartbeatMs = 25_000,
    intakeModel = () => notAvailable,
  }: {
    store: Store
    hub?: Hub
    heartbeatMs?: number
    /** The platform's intake key for this conversation, once the browser hands it over (Task 6). */
    intakeModel?: (conversation: Conversation) => Model
  },
): FastifyInstance {
  const app = Fastify({
    serverFactory: (handler) =>
      createServer((request, response) => {
        if (fastifyOwns(request.url)) return handler(request, response)
        // A path that cannot be decoded reaches the app as its home page, whose own router
        // reads the address and says there is nothing here. Vite would answer it an empty
        // 404: a blank page (the final review).
        if (!decodable(request.url)) request.url = '/'
        web(request, response)
      }),
  })

  app.get('/api/me', async (request, reply) => {
    let person
    try {
      person = await whoIs(request.headers.cookie, config.platformOrigin)
    } catch {
      return reply.code(502).send({ error: { code: 'PLATFORM_UNAVAILABLE' } })
    }
    if (person === undefined)
      return reply.code(401).send({ error: { code: 'UNAUTHENTICATED' } })
    return person
  })

  // Our own API (F2): every route guarded by the person and, for a change, by Origin.
  registerConversations(app, { config, store })
  registerProblems(app, { config, store })
  registerEvents(app, { config, store, hub, heartbeatMs })
  registerIntake(app, { config, store, hub, intakeModel })

  // MOCK MODE ONLY: the browser reaches only us, so we carry `/v1` (and its event stream's
  // WebSocket, which Vite's own proxy cannot carry in middleware mode: M4) and `/auth` to
  // manifest-mock, untouched.
  if (config.mode === 'mock') {
    // With the mock down, answer as the edge does with the control plane down: an EMPTY 502,
    // which the page reads as "can't reach" (M7). Left to itself, the proxy answered 500 with
    // its own message, `connect ECONNREFUSED …`, which the page read as a refusal (review #2).
    const replyOptions = {
      onError: (reply: { code(status: number): { send(): unknown } }) => {
        void reply.code(502).send()
      },
    }
    app.register(proxy, {
      upstream: config.platformOrigin,
      prefix: '/v1',
      rewritePrefix: '/v1',
      websocket: true,
      replyOptions,
    })
    app.register(proxy, {
      upstream: config.platformOrigin,
      prefix: '/auth',
      rewritePrefix: '/auth',
      replyOptions,
    })
  }

  return app
}
