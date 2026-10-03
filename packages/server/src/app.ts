import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import proxy from '@fastify/http-proxy'
import Fastify, { type FastifyInstance } from 'fastify'
import { registerApps } from './api/apps.js'
import { registerBuild } from './api/build.js'
import { registerConversations } from './api/conversations.js'
import { createHub, registerEvents, type Hub } from './api/events.js'
import { registerIntake } from './api/intake.js'
import { registerKeeping } from './api/keeping.js'
import { registerMinted } from './api/minted.js'
import { registerPlan } from './api/plan.js'
import { registerProblems } from './api/problems.js'
import { registerProject } from './api/project.js'
import { endWork } from './api/work-end.js'
import { createWork, Refused } from './api/work.js'
import { beginPiece, createLine, type Line } from './build/line.js'
import { createRounds, type RoundDeps, type Rounds } from './build/round.js'
import type { Config } from './config.js'
import { whoIs } from './identity.js'
import { idleKeeper, type Keeper } from './keeping/keeper.js'
import {
  notAvailable,
  ASKING_DEADLINES,
  openAiCompatible,
  ROUND_DEADLINES,
  type Answered,
  type Model,
} from './model/client.js'
import { platformSignIn, type SignIn } from './platform/sign-in.js'
import { walkthroughModel } from './model/walkthrough.js'
import { platformAgentSessions, type AgentSessions } from './platform/agent-sessions.js'
import { platformAuthoring, type Authoring } from './platform/authoring.js'
import { platformBuilds } from './platform/builds.js'
import { platformDetails } from './platform/details.js'
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
    keeper = idleKeeper,
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
    /** F6: the keeper (D4); by default one that keeps nothing. Started once the line is. */
    keeper?: Keeper
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
      person = await whoIs(request.headers.cookie, config)
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
  // One piece of work per conversation at a time, whichever route began it. When one ends, the
  // app's line starts its next conversation if nothing holds the app now (F4 Decision 5).
  // (`line` is made below, from the rounds; work only ever ends after it exists.)
  // F6 Decision 14: and the keeper tells the person, if no page is watching.
  const work = createWork(hub, store, (conversation) => {
    line.released(conversation.projectId)
    keeper.workEnded(conversation)
  })
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
        details: platformDetails(config.platformOrigin),
        stream: platformStream(config.platformOrigin),
        trace: storeTrace(store),
        now: () => new Date(),
        modelFor: roundModelFor(config),
        signIn: roundSignInFor(config),
      }))
  )({ store, hub, work, tokens })
  // Moment 5, and a change's plan (F4 Decision 7): the same routes, and the same work.
  const planning = registerPlan(app, {
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
  // THE LINE (F4 Decision 5): at the front, a stopped round carries on, a fix is built, and a
  // change is planned.
  const line: Line = createLine({
    store,
    hub,
    now: () => new Date(),
    begin: beginPiece({ store, tokens, rounds, planning }),
  })
  // A RESTART (Review Focus 3): a round that was working, or waiting on a question, lost its
  // key and its token with the last process. Marked before this server can listen. Then every
  // app with a conversation waiting, and none holding it, starts its next (Review Focus 5).
  rounds.interruptedOnBoot()
  line.onBoot()
  // F6b DECISION 5: SOMEONE TAKEN OFF AN APP has their work here ended, as Stop ends it, recorded
  // `removed`: theirs waiting first, so a round's stop never lets one of theirs start; their
  // conversations' tokens dropped and their token ids forgotten.
  keeper.onRemoved((projectId, personId) => {
    const theirs = store.listConversationsOn(projectId, personId)
    const waitingFirst = [
      ...theirs.filter((conversation) => conversation.state === 'waiting'),
      ...theirs.filter((conversation) => conversation.state !== 'waiting'),
    ]
    for (const conversation of waitingFirst) {
      endWork({ store, hub, rounds, line }, conversation, {
        by: personId,
        why: 'removed',
      })
      tokens.drop(conversation.id)
    }
    store.forgetMintedOf(projectId, personId)
  })
  // F6 (D4): every kept watch token's stream opened; closed with the server.
  keeper.start()
  app.addHook('onClose', async () => keeper.stop())
  registerKeeping(app, { config, store, keeper, hub, rounds })
  registerIntake(app, { config, store, work, intakeModel, intakeKeys })
  registerProject(app, { config, store, hub, projects, tokens, intakeKeys })
  registerBuild(app, { config, store, hub, work, tokens, rounds, line })
  registerApps(app, { config, store, hub, projects, tokens, line })
  registerMinted(app, { config, store })

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
        // The walk-through answers at once, and whole: counted as the gateway's would be.
        onAnswer({
          model: session.model,
          fallback: false,
          usage: null,
          received: { chars: JSON.stringify(answer).length, firstWordMs: 0, ms: 0 },
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
      deadlines: ROUND_DEADLINES,
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
    openAiCompatible({
      baseUrl: config.modelGateway,
      key,
      model: config.planModel,
      deadlines: ASKING_DEADLINES,
    })
}
