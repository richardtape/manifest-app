import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import proxy from '@fastify/http-proxy'
import Fastify, { type FastifyInstance } from 'fastify'
import { registerBuild } from './api/build.js'
import { registerConversations } from './api/conversations.js'
import { createHub, registerEvents, type Hub } from './api/events.js'
import { registerIntake } from './api/intake.js'
import { registerPlan } from './api/plan.js'
import { registerProblems } from './api/problems.js'
import { registerProject } from './api/project.js'
import { createWork, Refused } from './api/work.js'
import { createRounds, type RoundDeps, type Rounds } from './build/round.js'
import type { Config } from './config.js'
import { whoIs } from './identity.js'
import {
  notAvailable,
  openAiCompatible,
  type Answered,
  type Model,
} from './model/client.js'
import { platformSignIn, type SignIn } from './platform/sign-in.js'
import { walkthroughModel } from './model/walkthrough.js'
import { platformAgentSessions, type AgentSessions } from './platform/agent-sessions.js'
import { platformAuthoring, type Authoring } from './platform/authoring.js'
import { platformBuilds } from './platform/builds.js'
import { platformInstances } from './platform/instances.js'
import { platformMembers } from './platform/members.js'
import { createIntakeKeys, type IntakeKeys } from './platform/intake.js'
import {
  createConversationTokens,
  platformProjects,
  type ConversationTokens,
  type Projects,
} from './platform/project.js'
import { platformReleases } from './platform/releases.js'
import { platformSecrets } from './platform/secrets.js'
import { platformSource } from './platform/source.js'
import { platformStream } from './platform/stream.js'
import { storeTrace } from './runtime/trace.js'
import type { Conversation, Store } from './store/db.js'

/** The rounds of work over this server's own store, hub, work and tokens (F3 Task 9). */
export type RoundsOf = (
  base: Pick<RoundDeps, 'store' | 'hub' | 'work' | 'tokens'>,
) => Rounds

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
    intakeKeys = createIntakeKeys(),
    tokens = createConversationTokens(),
    projects = platformProjects(config.platformOrigin),
    sessions = platformAgentSessions(config.platformOrigin),
    authoring = platformAuthoring(config.platformOrigin),
    planModel = planModelFor(config),
    rounds: roundsOf,
  }: {
    store: Store
    hub?: Hub
    heartbeatMs?: number
    /** The platform's intake key for this conversation, once the browser hands it over (Task 6). */
    intakeModel?: (conversation: Conversation) => Model
    /** Where the handed-over intake keys are held, in memory only (Decision 1). */
    intakeKeys?: IntakeKeys
    /** Each conversation's token, handed over at Make it: in memory only (Decision 1). */
    tokens?: ConversationTokens
    /** `getProject` and `getKnowledgePack` with a conversation's token (Tasks 8 and 9). */
    projects?: Projects
    /** The person's agent sessions, with a conversation's token (Task 9). */
    sessions?: AgentSessions
    /** The tree and the plan's commit, with a conversation's token (Task 9). */
    authoring?: Authoring
    /** The plan's model, on an agent session's key (Task 9). */
    planModel?: (key: string) => Model
    /** F3: the rounds of work; by default over the platform, on each mode's model. */
    rounds?: RoundsOf
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

  // THE PLATFORM'S `make doctor` ASKS WHO HOLDS 7105 (its F12), as it asks the mock on 7102
  // for `/v1/__doctor`: our name, and only that. No session, no call to the platform, so it
  // answers with the platform down, and a stray process on 7105 stays foreign.
  app.get('/api/__doctor', async () => ({ name: 'manifest-app' }))

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
  // One piece of work per conversation at a time, whichever route began it.
  const work = createWork(hub, store)
  const rounds = (
    roundsOf ??
    ((base) =>
      createRounds({
        ...base,
        sessions,
        projects,
        source: platformSource(config.platformOrigin),
        builds: platformBuilds(config.platformOrigin),
        releases: platformReleases(config.platformOrigin),
        instances: platformInstances(config.platformOrigin),
        secrets: platformSecrets(config.platformOrigin),
        members: platformMembers(config.platformOrigin),
        stream: platformStream(config.platformOrigin),
        trace: storeTrace(store),
        now: () => new Date(),
        modelFor: roundModelFor(config),
        signIn: roundSignInFor(config),
      }))
  )({ store, hub, work, tokens })
  // A RESTART (Review Focus 3): a round that was working, or waiting on a question, lost its
  // key and its token with the last process. Marked before this server can listen.
  rounds.interruptedOnBoot()
  registerIntake(app, { config, store, work, intakeModel, intakeKeys })
  registerProject(app, { config, store, hub, projects, tokens, intakeKeys })
  registerPlan(app, {
    config,
    store,
    work,
    tokens,
    sessions,
    projects,
    authoring,
    planModel,
    rounds,
  })
  registerBuild(app, { config, store, work, tokens, rounds })

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

/**
 * EACH MODE'S MODEL FOR A ROUND (F3 Task 8): the one a session lists, on our own gateway alone
 * (F2 Task 6: a key is never sent to a URL the platform did not give us, nor to one it did that
 * is not ours), hearing each answer. Against the mock, which has no model, the walk-through's
 * answers, heard as answered by what was asked.
 */
export function roundModelFor(config: Config): RoundDeps['modelFor'] {
  const trimmed = (url: string) => url.replace(/\/+$/, '')
  if (config.mode === 'mock') {
    const walkthrough = walkthroughModel()
    return (session, onAnswer) => ({
      async complete(agent, schema, messages, check) {
        const answer = await walkthrough.complete(agent, schema, messages, check)
        onAnswer({
          model: session.model,
          fallback: false,
          usage: null,
        } satisfies Answered)
        return answer
      },
    })
  }
  return (session, onAnswer) => {
    if (trimmed(session.baseUrl) !== trimmed(config.modelGateway))
      throw new Refused('MODEL_GATEWAY_REFUSED')
    return openAiCompatible({
      baseUrl: config.modelGateway,
      key: session.key,
      model: session.model,
      onAnswer,
    })
  }
}

/**
 * EACH MODE'S SIGN-IN CHECK (FE-37). Through the edge, the draft's own `/login` followed to the
 * IdP. Against the mock, which has no IdP and whose drafts answer nothing, it starts.
 */
export function roundSignInFor(config: Config): SignIn {
  return config.mode === 'mock' ? { starts: async () => 'ok' } : platformSignIn()
}

/**
 * EACH MODE'S PLAN MODEL (F2 Task 9). Through the edge, Config's plan model on our own
 * gateway, with the agent session's key. Against the mock, which has no model, the
 * walk-through's plan (Decision 7): the mock's session and its key are still asked for.
 */
export function planModelFor(config: Config): (key: string) => Model {
  if (config.mode === 'mock') {
    const walkthrough = walkthroughModel()
    return () => walkthrough
  }
  return (key) =>
    openAiCompatible({ baseUrl: config.modelGateway, key, model: config.planModel })
}
