import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { planMarkdown } from '../agents/plan.js'
import { roundOf } from '../api/round-state.js'
import { createHub, type Hub } from '../api/events.js'
import type { Progress, RoundView } from '../api/progress.js'
import { createWork } from '../api/work.js'
import {
  answered,
  ModelError,
  openAiCompatible,
  type Answered,
  type Message,
  type Model,
  type Received,
} from '../model/client.js'
import type { AgentSessions } from '../platform/agent-sessions.js'
import type { Build, Builds } from '../platform/builds.js'
import type { Incident, Instances } from '../platform/instances.js'
import type { Members } from '../platform/members.js'
import { createConversationTokens, type Projects } from '../platform/project.js'
import { PlatformRefusal } from '../platform/refusal.js'
import type { Instance, Releases } from '../platform/releases.js'
import type { Secrets } from '../platform/secrets.js'
import type { Change, Source } from '../platform/source.js'
import type { ProjectStream } from '../platform/stream.js'
import { storeTrace } from '../runtime/trace.js'
import { openStore, type Conversation, type Store } from '../store/db.js'
import { dumpAll, scratchDir } from '../store/testing.js'
import { createLine, type Line } from './line.js'
import { createRounds, type RoundDeps, type Rounds } from './round.js'

/**
 * F3 TASK 8: THE ROUND OF WORK. Moment 6's five steps, each ticking on its own platform signal;
 * three tries; the checkpoint and the session's clock; Stop; messages; questions; a restart
 * resumed. Every dependency is a recording fake, the platform's events are driven by hand, and
 * the lead is scripted.
 */
const TOKEN = 'mft_test_x_the_conversations_token'
const NEW_TOKEN = 'mft_test_z_a_token_handed_over_again'
const GATEWAY = 'http://127.0.0.1:7106/v1'
const ALICE = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  displayName: 'Alice Instructor',
}
const PROJECT = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Reading responses',
  slug: 'reading-responses',
  blueprint: 'node-ts-mongo@1',
}
const ENV = '33333333-3333-4333-8333-333333333333'
const SANDBOX = {
  environmentId: ENV,
  hostname: 'reading-responses.sandbox.manifest.internal',
  url: 'https://reading-responses.sandbox.manifest.internal',
}
const BASE = 'c2ac2119'.padEnd(40, '0')
const WORDS =
  "A page where students post a response to the week's reading. My TA, sam.lee@ubc.ca, sees everything."
const PLAN = {
  studentsSee: 'One page listing the weeks.',
  youSee: 'Every response for a week on one page.',
  itKeeps: 'The text students write, their name, and when they posted it.',
  whoGetsIn: 'Anyone with a CWL can sign in.',
  ai: 'None.',
  assumed: ['Twelve weeks, matching a standard term'],
  onlyYouKnow: [{ id: 'late', ask: 'Is a late post still a post?' }],
  changed: [],
}
const PACKAGE = JSON.stringify({
  name: 'app',
  type: 'module',
  dependencies: { express: '4.22.2' },
})
const FILES: Record<string, string> = {
  'server.js':
    "import express from 'express'\nimport { weeks } from './routes/weeks.js'\nconst app = express()\n",
  'routes/weeks.js': 'export const weeks = []\n',
  'package.json': PACKAGE,
  'package-lock.json': '{}',
  'manifest.yaml': 'manifest: 1\n',
}
const PAGE = '<!doctype html>\n<h1>This week’s reading</h1>\n'
const LOG = [
  'npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.',
  'npm error Missing: marked@14.1.0 from lock file',
]
const EXPLAINED = {
  note: 'A piece it depends on was missing',
  sentence:
    'We asked for a piece the app does not have yet, so it could not be put together.',
}

const write = (path: string, content: string): Change => ({ op: 'write', path, content })
const read = (...paths: string[]) => ({ move: { kind: 'read', paths } })
const commit = (changes: Change[] = [write('public/weeks.html', PAGE)], over = {}) => ({
  move: {
    kind: 'commit',
    message: 'The page students post on',
    changes,
    line: 'Writing the page students post on.',
    account: 'One page listing the weeks',
    ...over,
  },
})
/** The round's one sentence (Rich): What changed. */
const ACCOUNT = 'One page listing the weeks, where students post.'
const done = (
  line = 'The pages are written.',
  cannot: string | null = null,
  account = ACCOUNT,
) => ({
  move: { kind: 'done', line, cannot, account },
})
const ask = (
  question: string,
  fallback: string | null,
  secret: string | null = null,
) => ({
  move: { kind: 'ask_person', ask: question, default: fallback, secret },
})

const cleanups: (() => unknown)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

/** A deferred: a platform call held open until the test says. */
function held<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

/** Waits for a condition the round reaches on its own time, or fails with what it saw. */
async function until(check: () => boolean, what: () => unknown, ms = 1500) {
  const deadline = Date.now() + ms
  while (!check()) {
    if (Date.now() > deadline)
      throw new Error(`never reached; saw ${JSON.stringify(what(), null, 1)}`)
    await new Promise((resolve) => setTimeout(resolve, 2))
  }
}

type Script = Record<string, unknown[]>

/**
 * THE MODEL, SCRIPTED, over every session: an answer that is an Error is thrown (the gateway's
 * refusal), anything else goes through the same parse, check and retry as a real answer. Each
 * answer is heard by the session's `onAnswer`, as the gateway's would be.
 */
function scriptedModel(script: Script, fallback: (agent: string, n: number) => boolean) {
  const next = new Map<string, number>()
  const calls: { agent: string; messages: Message[] }[] = []
  const bound = (onAnswer: (a: Answered) => void): Model => ({
    complete(agent, schema, messages, check) {
      calls.push({ agent, messages })
      return answered(
        async () => {
          const index = next.get(agent) ?? 0
          next.set(agent, index + 1)
          const scriptedAnswer = (script[agent] ?? [])[index]
          if (scriptedAnswer === undefined) return new Promise(() => undefined)
          // A function is an answer the test holds until it says.
          const answer =
            typeof scriptedAnswer === 'function'
              ? await (scriptedAnswer as () => Promise<unknown>)()
              : scriptedAnswer
          if (answer instanceof Error) throw answer
          onAnswer({
            model: fallback(agent, index)
              ? 'ollama_chat/qwen3.5:4b'
              : 'default-chat-large',
            fallback: fallback(agent, index),
            usage: { in: 100, out: 10 },
            received: { chars: JSON.stringify(answer).length, firstWordMs: 5, ms: 10 },
          })
          return answer
        },
        schema,
        check,
      )
    },
  })
  return { calls, bound }
}

interface Options {
  script: Script
  fallback?: (agent: string, n: number) => boolean
  remainingUsd?: number | null
  spent?: (number | null)[]
  deploy?: (releaseId: string, n: number) => Promise<Instance> | Instance
  commit?: (n: number, body: { baseCommit: string; changes: Change[] }) => void
  tree?: (n: number) => Promise<{ commitSha: string }> | { commitSha: string }
  listInstances?: () => (Instance & { serving: boolean })[]
  /** Each build succeeds on the stream by itself, for a test that does not drive them. */
  autoBuild?: boolean
  /** What this server's sessions are called: a restarted server's are its own. */
  sessionIds?: string
  /** The round's waits, shortened: a test cannot wait 30 s for a poll. */
  waits?: { pollMs: number; buildMs: number; draftMs: number }
  /** What each session lists: a confidential project's lists only the on-campus model. */
  models?: string[]
  /** What each session lists, by its index, when they differ (FE-36: a setting that withdraws a model). */
  modelsOf?: (n: number) => string[]
  /** Whether the draft's sign-in starts, each time it is checked (FE-37). */
  signIn?: (n: number) => 'ok' | 'refused' | 'unknown'
  /** Told when a piece of work ends (F4: the app's line starts its next). */
  ended?: (conversation: Conversation) => void
  /** Files of the tree's own beside FILES: docs/plan.md, as committed (F4 Task 8). */
  files?: Record<string, string>
  /** The incident a fix names, where it happened, as our token reads it (F4 Task 8; F5 Decision 13). */
  incident?: (
    environment: 'staging' | 'production',
    incidentId: string,
  ) => Incident | 'confidential' | undefined
  /** Why the platform ended each session (its index), when it did: models_withdrawn (FE-36). */
  endReason?: (n: number) => string | null
  /**
   * What each session's key holds now, when the platform narrowed it in place (its sitting 5,
   * `d061ad7`): undefined is what it started with.
   */
  narrowed?: (n: number) => string[] | undefined
  /** The round's model itself, in place of the script: the real client over a fake gateway (F5 Task 2). */
  modelFor?: RoundDeps['modelFor']
}

function harness(options: Options, file?: string, store0?: Store) {
  let where = file
  if (where === undefined) {
    const { dir, remove } = scratchDir()
    cleanups.push(remove)
    where = join(dir, 'app.sqlite')
  }
  const store = store0 ?? openStore(where)
  if (store0 === undefined) cleanups.push(() => store.close())
  const hub: Hub = createHub()
  const work = createWork(hub, store, (conversation) => options.ended?.(conversation))
  const tokens = createConversationTokens()
  const did: string[] = []
  const frames: Progress[] = []
  const model = scriptedModel(options.script, options.fallback ?? (() => false))

  // THE PLATFORM, as recording fakes.
  let sessionsStarted = 0
  const sessionStarts: { token: string; options: unknown }[] = []
  const ended: string[] = []
  const models: { key: string; baseUrl: string; model: string }[] = []
  const sessions: AgentSessions = {
    budget: async (token) => {
      did.push(`budget ${token.slice(0, 10)}`)
      return {
        monthlyUsd: 10,
        remainingUsd: options.remainingUsd === undefined ? 9.6 : options.remainingUsd,
        resetsAt: '2026-10-01T07:00:00.000Z',
      }
    },
    start: async (token, projectId, name, opts) => {
      sessionsStarted++
      sessionStarts.push({ token, options: opts })
      did.push(`startAgentSession ${projectId.slice(0, 4)} ${name}`)
      return {
        sessionId: `${options.sessionIds ?? 'session'}-${sessionsStarted}`,
        key: `sk-test-key-${sessionsStarted}`,
        baseUrl: GATEWAY,
        models: options.modelsOf?.(sessionsStarted - 1) ??
          options.models ?? ['default-chat', 'default-chat-large', 'default-embed'],
        expiresAt: '2026-09-28T23:00:00.000Z',
        capUsd: 2,
      }
    },
    end: async (_token, sessionId) => {
      ended.push(sessionId)
      did.push(`endAgentSession ${sessionId}`)
    },
    list: async () =>
      Array.from({ length: sessionsStarted }, (_, i) => ({
        id: `${options.sessionIds ?? 'session'}-${i + 1}`,
        spentUsd: options.spent?.[i] === undefined ? 0.1 : options.spent[i]!,
        endReason: options.endReason?.(i) ?? null,
        models: options.narrowed?.(i) ??
          options.modelsOf?.(i) ??
          options.models ?? ['default-chat', 'default-chat-large', 'default-embed'],
      })),
  }

  const attempts: { baseCommit: string; message: string; changes: Change[] }[] = []
  const commits: { baseCommit: string; message: string; changes: Change[] }[] = []
  let trees = 0
  const source: Source = {
    tree: async (token) => {
      trees++
      did.push(`getTree ${token.slice(0, 10)}`)
      const sha = (await options.tree?.(trees))?.commitSha ?? BASE
      return {
        commitSha: sha,
        paths: Object.keys({ ...FILES, ...options.files }).map((path) => ({
          path,
          size: 1,
          binary: false,
        })),
        truncated: false,
      }
    },
    file: async (_token, _project, path) => {
      const landed = commits
        .flatMap((c) => c.changes)
        .filter((c) => c.path === path)
        .at(-1)
      if (landed?.op === 'write') return { content: landed.content }
      const content = { ...FILES, ...options.files }[path]
      return content === undefined ? { unreadable: 'not-found' } : { content }
    },
    commit: async (_token, _project, body, sent = []) => {
      attempts.push(body)
      // As the real one records them: the dry run, then the commit.
      const paths = body.changes.map((c) => c.path)
      sent.push({ dryRun: true, baseCommit: body.baseCommit, paths })
      options.commit?.(attempts.length, body)
      sent.push({ dryRun: false, baseCommit: body.baseCommit, paths })
      commits.push(body)
      did.push(`createCommit ${body.baseCommit.slice(0, 7)}`)
      return {
        commitSha: `c${commits.length}`.padEnd(40, '0'),
        changed: body.changes.map((c) => ({ path: c.path, status: 'added' as const })),
        warnings: [],
      }
    },
  }

  const started: Build[] = []
  const buildStatus = new Map<string, Build['status']>()
  const builds: Builds = {
    start: async (_token, _project, commitSha) => {
      const build = {
        id: `build-${started.length + 1}`,
        commitSha,
        status: 'pending' as const,
        error: null,
      }
      started.push(build)
      did.push(`startBuild ${commitSha.slice(0, 7)}`)
      if (options.autoBuild === true)
        setTimeout(() => emit('build.succeeded', { buildId: build.id }), 1)
      return build
    },
    get: async (_token, buildId) => {
      did.push(`getBuild ${buildId}`)
      const build = started.find((b) => b.id === buildId)!
      return {
        ...build,
        status: buildStatus.get(buildId) ?? 'running',
        error:
          buildStatus.get(buildId) === 'failed'
            ? 'BUILD_FAILED: build failed (exit 1)'
            : null,
      }
    },
    log: async (_token, buildId) => {
      did.push(`getBuildLog ${buildId}`)
      return LOG
    },
  }

  const deployed: Instance[] = []
  const releasesMade: { buildId: string; summary: string }[] = []
  const releases: Releases = {
    create: async (_token, _project, buildId, summary) => {
      releasesMade.push({ buildId, summary })
      did.push(`createRelease ${buildId}`)
      return { id: `release-${releasesMade.length}` }
    },
    sandbox: async () => SANDBOX,
    deploy: async (_token, projectId, releaseId) => {
      did.push(`deploy ${projectId.slice(0, 4)} ${releaseId}`)
      const n = deployed.length + 1
      const instance = (await options.deploy?.(releaseId, n)) ?? {
        id: `instance-${n}`,
        releaseId,
        state: 'healthy' as const,
      }
      deployed.push(instance)
      return instance
    },
  }

  const outputs: string[] = []
  const INCIDENT: Omit<Incident, 'id' | 'instanceId' | 'releaseId'> = {
    exitReason: 'the process exited with code 1',
    failedCheck: 'readiness: GET /healthz … the edge last answered 0 after 87 attempt(s)',
    logTail:
      "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/missing.js' imported from /app/server.js",
    diffSinceHealthy: '+ import ./missing.js',
    prompt: 'The app could not start: a module it imports is missing.',
  }
  const instances: Instances = {
    list: async (_token, environmentId) => {
      did.push(`listInstances ${environmentId === ENV ? 'sandbox' : environmentId}`)
      return (
        options.listInstances?.() ??
        deployed.map((i) => ({ ...i, serving: i.state === 'healthy' }))
      )
    },
    output: async (_token, _project, instanceId) => {
      outputs.push(instanceId)
      did.push(`getInstanceOutput ${instanceId}`)
      return { lines: ['proof app listening'], failure: null }
    },
    incidents: async () =>
      deployed
        .filter((i) => i.state === 'failed')
        .map((i, n) => ({
          ...INCIDENT,
          id: `incident-${n + 1}`,
          instanceId: i.id,
          releaseId: i.releaseId,
        })),
    incident: async (_token, _project, environment, incidentId) => {
      did.push(`listIncidents ${environment} ${incidentId}`)
      return options.incident?.(environment, incidentId)
    },
  }

  const secretsSet: { token: string; projectId: string; name: string; value: string }[] =
    []
  const secrets: Secrets = {
    setInSandbox: async (token, projectId, name, value) => {
      secretsSet.push({ token, projectId, name, value })
      did.push(`setAppSecret ${name}`)
    },
  }
  const members: Members = {
    instructor: async () => ({ puid: 'ins000001', email: 'alice@ubc.ca' }),
  }
  const projects: Projects = {
    read: async () => PROJECT,
    knowledgePack: async () => '## AGENTS.md\n\nThe stack is fixed.',
  }

  const watches: {
    token: string
    handlers: Parameters<ProjectStream['watch']>[2]
    closed: boolean
  }[] = []
  const stream: ProjectStream = {
    watch(token, _project, handlers) {
      const watch = { token, handlers, closed: false }
      watches.push(watch)
      return { ready: Promise.resolve(), close: () => void (watch.closed = true) }
    },
  }
  let signInChecks = 0
  let events = 0
  /** A platform event on the round's open stream. */
  const emit = (type: string, detail: Record<string, unknown>) => {
    const open = watches.filter((w) => !w.closed).at(-1)
    open?.handlers.event({ id: `event-${++events}`, type, subject: 'project:x', detail })
  }

  const rounds: Rounds = createRounds({
    store,
    hub,
    work,
    tokens,
    sessions,
    source,
    builds,
    releases,
    instances,
    secrets,
    members,
    stream,
    projects,
    signIn: {
      starts: async (url) => {
        signInChecks++
        did.push(`signIn ${url}`)
        return options.signIn?.(signInChecks) ?? 'ok'
      },
    },
    trace: storeTrace(store),
    now: () => new Date(),
    ...(options.waits === undefined ? {} : { waits: options.waits }),
    modelFor: (session, onAnswer) => {
      models.push(session)
      return options.modelFor?.(session, onAnswer) ?? model.bound(onAnswer)
    },
  })

  return {
    store,
    hub,
    tokens,
    rounds,
    file: where,
    did,
    frames,
    model,
    sessionStarts,
    ended,
    models,
    attempts,
    commits,
    started,
    buildStatus,
    deployed,
    releasesMade,
    outputs,
    secretsSet,
    watches,
    emit,
    trees: () => trees,
  }
}

type H = ReturnType<typeof harness>

/** A conversation whose plan is agreed and committed: moment 5 is over. */
function agreed(h: H) {
  h.store.rememberPerson(ALICE)
  const conversation = h.store.createConversation(ALICE.id, WORDS)
  h.store.addMessage(conversation.id, 'we', { kind: 'project', project: PROJECT })
  h.store.savePlan(conversation.id, PLAN)
  h.store.addMessage(conversation.id, 'person', {
    kind: 'agreed',
    version: 1,
    answers: { late: 'It closes at the deadline.' },
    commitSha: BASE,
    sent: [],
  })
  const made = h.store.setState(conversation.id, 'agreed', { projectId: PROJECT.id })
  h.hub.subscribe(made.id, (frame) => h.frames.push(frame))
  return made
}

const viewOf = (h: H, id: string): RoundView | null => roundOf(h.store, id)
const stepOf = (h: H, id: string, key: string) =>
  viewOf(h, id)?.steps.find((s) => s.key === key)
const stateOf = (h: H, id: string) => h.store.getConversation(id, ALICE.id)?.state
const said = (h: H, id: string) =>
  h.store.listMessages(id).map((m) => ({ from: m.from, ...(m.body as object) })) as {
    from: string
    kind: string
    [key: string]: unknown
  }[]
/** Every user message the lead was sent, one string per call. */
const leadPrompts = (h: H) =>
  h.model.calls
    .filter((c) => c.agent === 'lead')
    .map((c) => c.messages.map((m) => m.content).join('\n'))

async function startedRound(options: Options) {
  const h = harness(options)
  const conversation = agreed(h)
  h.tokens.put(conversation.id, TOKEN)
  h.rounds.start(conversation, TOKEN)
  return { h, id: conversation.id, conversation }
}

async function untilStatus(h: H, id: string, status: RoundView['status']) {
  await until(
    () => viewOf(h, id)?.status === status,
    () => ({ view: viewOf(h, id), did: h.did }),
  )
}

/** A whole round, straight through: read, commit, done; built, deployed healthy, answered. */
const STRAIGHT: Script = { lead: [read('server.js'), commit(), done()] }

describe('the five steps, each on its own signal (Decision 5)', () => {
  it('ticks each step on its signal, never before, and ends built with the session ended', async () => {
    const deploy = held<Instance>()
    const { h, id } = await startedRound({
      script: STRAIGHT,
      deploy: () => deploy.promise,
    })

    await until(
      () => h.started.length === 1,
      () => h.did,
    )
    // Writing the pages ticked on done after a landed commit; holds on its own check.
    expect(stepOf(h, id, 'pages')?.state).toBe('done')
    expect(stepOf(h, id, 'holds')?.state).toBe('done')
    expect(stepOf(h, id, 'build')?.state).toBe('now')
    expect(h.started[0]?.commitSha).toBe('c1'.padEnd(40, '0'))

    // Another build's success is not this build's.
    h.emit('build.succeeded', { buildId: 'build-99' })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(stepOf(h, id, 'build')?.state).toBe('now')
    expect(h.releasesMade).toEqual([])

    h.emit('build.succeeded', { buildId: 'build-1' })
    await until(
      () => stepOf(h, id, 'draft')?.state === 'now',
      () => viewOf(h, id),
    )
    expect(stepOf(h, id, 'build')?.state).toBe('done')
    // The version's summary is the round's one account.
    expect(h.releasesMade).toEqual([{ buildId: 'build-1', summary: ACCOUNT }])

    // The deploy answered before the instance was healthy: draft waits for ITS instance.
    deploy.resolve({ id: 'instance-1', releaseId: 'release-1', state: 'starting' })
    await until(
      () => h.deployed.length === 1,
      () => h.did,
    )
    h.emit('instance.healthy', { instanceId: 'instance-66' })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(stepOf(h, id, 'draft')?.state).toBe('now')
    expect(h.outputs).toEqual([])

    h.deployed[0]!.state = 'healthy'
    h.emit('instance.healthy', { instanceId: 'instance-1' })
    await untilStatus(h, id, 'done')

    const view = viewOf(h, id)!
    expect(view.steps.map((s) => s.state)).toEqual([
      'done',
      'done',
      'done',
      'done',
      'done',
    ])
    expect(view.line).toBe('The pages are written.')
    expect(view.draft).toEqual({
      address: SANDBOX.url,
      serving: true,
      lastAttempt: 'healthy',
    })
    expect(h.outputs).toEqual(['instance-1'])
    expect(stateOf(h, id)).toBe('built')
    expect(h.ended).toEqual(['session-1'])
    expect(h.watches.every((w) => w.closed)).toBe(true)
    // The round folds into the conversation as one line (Decision 16).
    expect(said(h, id).at(-1)).toMatchObject({
      from: 'we',
      kind: 'built',
      round: 1,
      line: 'The pages are written.',
    })
    // Its steps travel whole in RoundView: never as F2's step frames.
    expect(h.frames.filter((f) => f.kind === 'step')).toEqual([])
    const last = h.frames.filter((f) => f.kind === 'state').at(-1)
    expect(last?.kind === 'state' && last.round?.status).toBe('done')
  })

  it("the line under Writing the pages is each commit's, while the lead works; done's replaces it (moment 6: a line now)", async () => {
    const next = held<unknown>()
    const last = held<unknown>()
    const { h, id } = await startedRound({
      script: {
        lead: [
          commit(),
          () => next.promise,
          commit([write('public/post.html', PAGE)], {
            line: 'Writing the page they post on.',
          }),
          () => last.promise,
        ],
      },
      autoBuild: true,
    })
    await until(
      () => h.commits.length === 1,
      () => h.did,
    )
    await until(
      () => viewOf(h, id)?.line === 'Writing the page students post on.',
      () => viewOf(h, id),
    )
    expect(stepOf(h, id, 'pages')?.state).toBe('now')

    next.resolve(read('server.js'))
    await until(
      () => h.commits.length === 2,
      () => h.did,
    )
    await until(
      () => viewOf(h, id)?.line === 'Writing the page they post on.',
      () => viewOf(h, id),
    )
    expect(stepOf(h, id, 'pages')?.state).toBe('now')

    last.resolve(done())
    await untilStatus(h, id, 'done')
    expect(viewOf(h, id)?.line).toBe('The pages are written.')
  })

  it('each file a read asks for is traced by its path, never its content: a loop of reads can be seen (sitting 6, the real walk)', async () => {
    const { h, id } = await startedRound({
      script: {
        lead: [
          read('server.js', 'public/weeks.html'),
          read('server.js'),
          commit(),
          done(),
        ],
      },
      autoBuild: true,
    })
    await untilStatus(h, id, 'done')
    const entries = h.store.listTrace(h.store.latestRun(id)!.id).map((t) => t.entry)
    const reads = entries
      .map((e) => e as { kind: string; operation?: string; named?: string | null })
      .filter((e) => e.kind === 'platform' && e.operation === 'getFile')
      .map((e) => e.named)
    expect(reads).toEqual(['server.js', 'public/weeks.html', 'server.js'])
    expect(JSON.stringify(entries)).not.toContain('express')
  })

  it('an answer that was not one of the moves costs a move and is told, and the round goes on', async () => {
    const { h, id } = await startedRound({
      script: {
        lead: [
          new ModelError('MODEL_ANSWER_INVALID'),
          read('server.js'),
          commit(),
          done(),
        ],
      },
      autoBuild: true,
    })
    await untilStatus(h, id, 'done')
    expect(leadPrompts(h)[1]).toMatch(/Your answer was not one of the moves/)
  })

  it('a request the provider refused (FE-34, a 422) is the round’s refusal at once: one call, never re-asked to the move limit', async () => {
    const { h, id } = await startedRound({
      script: {
        lead: [
          new ModelError('MODEL_ANSWER_INVALID', 422),
          read('server.js'),
          commit(),
          done(),
        ],
      },
      autoBuild: true,
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toMatchObject({
      kind: 'refused',
      code: 'MODEL_ANSWER_INVALID',
    })
    expect(leadPrompts(h)).toHaveLength(1)
  })

  it('the sign-in specialist’s request refused (FE-34, a 422): the round’s refusal, never "ask it again"', async () => {
    const { h, id } = await startedRound({
      script: {
        lead: [
          {
            move: {
              kind: 'ask_cwl',
              brief: {
                whoGetsIn: 'Anyone with a CWL.',
                youSee: 'Every response.',
                studentsSee: 'Their own.',
                namedEmails: [],
              },
            },
          },
          read('server.js'),
          done(),
        ],
        cwl: [new ModelError('MODEL_ANSWER_INVALID', 422)],
      },
      autoBuild: true,
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toMatchObject({
      kind: 'refused',
      code: 'MODEL_ANSWER_INVALID',
    })
    expect(leadPrompts(h)).toHaveLength(1)
  })

  it("the specialist's proposal stays in the lead's view across a read, and leaves once committed (the real platform's ping-pong)", async () => {
    const STAFF = write(
      'config/staff.json',
      JSON.stringify({ puids: ['ins000001'], emails: [] }),
    )
    const { h, id } = await startedRound({
      script: {
        lead: [
          {
            move: {
              kind: 'ask_cwl',
              brief: {
                whoGetsIn: 'Anyone with a CWL.',
                youSee: 'Every response.',
                studentsSee: 'Their own.',
                namedEmails: [],
              },
            },
          },
          read('server.js'),
          commit([STAFF], {
            line: 'Setting who is staff.',
            account: 'Only you see every response',
          }),
          done(),
        ],
        cwl: [{ changes: [STAFF], summary: 'Only you see every response.' }],
      },
      autoBuild: true,
    })
    await untilStatus(h, id, 'done')
    const prompts = leadPrompts(h)
    expect(prompts).toHaveLength(4)
    // After the read, the proposal is still there to commit.
    expect(prompts[2]).toMatch(/proposal, not yet committed/i)
    expect(prompts[2]).toContain('{"puids":["ins000001"],"emails":[]}')
    // Committed: it leaves.
    expect(prompts[3]).not.toMatch(/not yet committed/i)
  })

  it("a proposed file already as it is leaves the proposal, and once all of it is in place the lead is told it is settled (the real platform's recommits)", async () => {
    const STAFF = write(
      'config/staff.json',
      JSON.stringify({ puids: ['ins000001'], emails: [] }),
    )
    const ASK_CWL = {
      move: {
        kind: 'ask_cwl',
        brief: {
          whoGetsIn: 'Anyone with a CWL.',
          youSee: 'Every response.',
          studentsSee: 'Their own.',
          namedEmails: [],
        },
      },
    }
    const { h, id } = await startedRound({
      script: {
        lead: [ASK_CWL, commit([STAFF]), read('server.js'), commit(), done()],
        cwl: [{ changes: [STAFF], summary: 'Only you see every response.' }],
      },
      commit: (n) => {
        if (n === 1) throw new PlatformRefusal('SOURCE_NOTHING_TO_COMMIT', 409)
      },
      autoBuild: true,
    })
    await untilStatus(h, id, 'done')
    const prompts = leadPrompts(h)
    expect(prompts[1]).toMatch(/proposal, not yet committed/i)
    expect(prompts[2]).not.toMatch(/proposal, not yet committed/i)
    expect(prompts[2]).toMatch(/specialist's proposal is committed/i)
    expect(prompts[3]).toMatch(/specialist's proposal is committed/i)
  })

  it('the questions it asked this round stay in its view, with what we went on with, so it never asks them again', async () => {
    const { h, id } = await startedRound({
      script: {
        lead: [
          ask('When do posts close?', 'No deadline until you give one.'),
          read('server.js'),
          commit(),
          done(),
        ],
      },
      autoBuild: true,
    })
    await untilStatus(h, id, 'done')
    const prompts = leadPrompts(h)
    for (const prompt of prompts.slice(2)) {
      expect(prompt).toMatch(/What you have asked this round/)
      expect(prompt).toContain('When do posts close?')
      expect(prompt).toContain('No deadline until you give one.')
    }
    expect(prompts[0]).not.toMatch(/What you have asked this round/)
  })

  it("What changed is done's one account (Rich); the exact changes are each commit's account, then its files, in order", async () => {
    const thinking = held<unknown>()
    const { h, id } = await startedRound({
      script: {
        lead: [
          commit([write('public/weeks.html', PAGE)], {
            account: 'One page listing the weeks.',
          }),
          // F4's `unread`: server.js is already in the app, so it is read before it is rewritten.
          read('server.js'),
          commit(
            [
              write('config/staff.json', '{"puids":["ins000001"],"emails":[]}'),
              write('server.js', FILES['server.js']! + '// staff\n'),
            ],
            { account: 'The rule about who sees what.' },
          ),
          () => thinking.promise,
        ],
      },
      autoBuild: true,
    })
    // While it writes, nothing is said to have changed yet: the exact changes grow commit by commit.
    await until(
      () => (stepOf(h, id, 'pages')?.exact?.length ?? 0) === 5,
      () => viewOf(h, id),
    )
    expect(stepOf(h, id, 'pages')?.changed).toBeNull()
    thinking.resolve(
      done('The pages are written.', null, 'Students post on a weekly page.'),
    )
    await untilStatus(h, id, 'done')
    expect(stepOf(h, id, 'pages')?.changed).toBe('Students post on a weekly page.')
    expect(stepOf(h, id, 'pages')?.exact).toEqual([
      'One page listing the weeks.',
      'public/weeks.html',
      'The rule about who sees what.',
      'config/staff.json',
      'server.js',
    ])
  })

  it('Writing the pages stays now on a done with nothing committed: the lead is told, and ticks after a commit lands', async () => {
    const { h, id } = await startedRound({
      script: { lead: [done(), commit(), done()] },
      autoBuild: true,
    })
    await untilStatus(h, id, 'done')
    const prompts = leadPrompts(h)
    expect(prompts).toHaveLength(3)
    expect(prompts[1]).toMatch(/nothing (is|has been) committed/i)
    expect(h.started).toHaveLength(1)
  })

  it('Checking it holds together: an import that names no file sends the lead back, before any build', async () => {
    const { h, id } = await startedRound({
      script: {
        lead: [
          commit([write('routes/posts.js', "import { x } from './missing.js'\n")]),
          done(),
          commit([write('routes/posts.js', 'export const posts = []\n')]),
          done(),
        ],
      },
      autoBuild: true,
    })
    await untilStatus(h, id, 'done')
    const prompts = leadPrompts(h)
    expect(prompts[2]).toContain('./missing.js')
    expect(h.started).toHaveLength(1)
    expect(h.started[0]?.commitSha).toBe('c2'.padEnd(40, '0'))
  })

  it('a lead that keeps writing an import that holds nothing is bounded by its 40 moves, never sent back for ever (Review Focus 2)', async () => {
    const broken = commit([
      write('routes/posts.js', "import { x } from './missing.js'\n"),
    ])
    const { h, id } = await startedRound({
      script: { lead: Array.from({ length: 30 }, () => [broken, done()]).flat() },
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({ kind: 'moves' })
    expect(leadPrompts(h)).toHaveLength(40)
    expect(h.started).toEqual([])
  })

  it('starts by itself on a session of $2 and 240 minutes, with the most capable model it lists', async () => {
    const { h, id } = await startedRound({ script: STRAIGHT })
    await until(
      () => h.started.length === 1,
      () => h.did,
    )
    expect(h.sessionStarts).toEqual([
      { token: TOKEN, options: { capUsd: 2, durationMinutes: 240 } },
    ])
    expect(h.models).toEqual([
      { key: 'sk-test-key-1', baseUrl: GATEWAY, model: 'default-chat-large' },
    ])
    expect(h.store.latestRun(id)).toMatchObject({
      round: 1,
      sessionIds: ['session-1'],
      model: 'default-chat-large',
    })
    expect(stateOf(h, id)).toBe('building')
  })
})

describe('three tries, then ask (Decision 7)', () => {
  const failing: Script = {
    lead: [commit(), done(), commit(), done(), commit(), done(), commit(), done()],
    explaining: [EXPLAINED, EXPLAINED, EXPLAINED],
  }

  async function failBuild(h: H, n: number) {
    await until(
      () => h.started.length === n,
      () => h.did,
    )
    h.buildStatus.set(`build-${n}`, 'failed')
    h.emit('build.failed', { buildId: `build-${n}`, reason: 'npm ci failed' })
  }

  it('three failed builds: needs you, with the note, the tries, the exact words, and whether anything is serving', async () => {
    const { h, id } = await startedRound({ script: failing })
    await failBuild(h, 1)
    await until(
      () => h.started.length === 2,
      () => viewOf(h, id),
    )
    // The explaining agent's sentence is the one line in the conversation.
    expect(said(h, id).filter((m) => m.kind === 'explained')).toEqual([
      { from: 'we', kind: 'explained', round: 1, step: 'build', ...EXPLAINED },
    ])
    expect(stepOf(h, id, 'build')).toMatchObject({ tries: 1, note: EXPLAINED.note })
    // The lead was given the platform's words and the explanation.
    expect(leadPrompts(h)[2]).toContain('npm error Missing: marked@14.1.0 from lock file')
    expect(leadPrompts(h)[2]).toContain(EXPLAINED.sentence)

    await failBuild(h, 2)
    await failBuild(h, 3)
    await untilStatus(h, id, 'needs-you')
    const view = viewOf(h, id)!
    expect(view.needs).toEqual({ kind: 'tries', step: 'build', servingBefore: false })
    expect(view.reference).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    expect(stepOf(h, id, 'build')).toMatchObject({
      state: 'halted',
      tries: 3,
      note: EXPLAINED.note,
      exact: expect.arrayContaining([LOG[1]]),
    })
    expect(stateOf(h, id)).toBe('building')
    // The session is kept for Try a different way: never a new one without asking.
    expect(h.ended).toEqual([])

    // Try a different way: the count starts again, and the lead is told what failed.
    h.rounds.carryOn(h.store.getConversation(id, ALICE.id)!, TOKEN, 'different')
    await until(
      () => h.started.length === 4,
      () => viewOf(h, id),
    )
    expect(stepOf(h, id, 'build')?.tries).toBe(0)
    const after = leadPrompts(h)[6]!
    expect(after).toMatch(/trying a different way/i)
    expect(after.match(/could not be put together/g)?.length).toBeGreaterThanOrEqual(3)
    expect(h.sessionStarts).toHaveLength(1)
  })

  it('a failed draft: the incident is read, the lead is given its words and its prompt, and the step says it failed', async () => {
    let failures = 1
    const { h, id } = await startedRound({
      script: { lead: [commit(), done(), commit(), done()], explaining: [EXPLAINED] },
      deploy: (releaseId, n) => ({
        id: `instance-${n}`,
        releaseId,
        state: failures-- > 0 ? 'failed' : 'healthy',
      }),
    })
    await until(
      () => h.started.length === 1,
      () => h.did,
    )
    h.emit('build.succeeded', { buildId: 'build-1' })
    await until(
      () => h.started.length === 2,
      () => viewOf(h, id),
    )
    expect(stepOf(h, id, 'draft')).toMatchObject({ tries: 1, note: EXPLAINED.note })
    const prompt = leadPrompts(h)[2]!
    expect(prompt).toContain('ERR_MODULE_NOT_FOUND')
    expect(prompt).toContain('The app could not start: a module it imports is missing.')
    expect(viewOf(h, id)?.draft).toMatchObject({ lastAttempt: 'failed', serving: false })
    h.emit('build.succeeded', { buildId: 'build-2' })
    await untilStatus(h, id, 'done')
    expect(viewOf(h, id)?.draft).toMatchObject({ lastAttempt: 'healthy', serving: true })
  })
})

describe('someone else changed the app (SOURCE_CONFLICT)', () => {
  it('the tree is read again, and the lead redoes its commit on the new base; three is needs you', async () => {
    const { h, id } = await startedRound({
      script: { lead: [commit(), commit(), commit()] },
      tree: (n) => ({ commitSha: `${n}`.repeat(40) }),
      commit: () => {
        throw new PlatformRefusal('SOURCE_CONFLICT', 409)
      },
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({ kind: 'conflict' })
    // Rich: a conflict is no try on the pages; the person sees nothing unless it is three.
    expect(stepOf(h, id, 'pages')?.tries).toBe(0)
    expect(viewOf(h, id)?.reference).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    expect(h.trees()).toBe(3)
    expect(h.attempts.map((c) => c.baseCommit)).toEqual([
      '1'.repeat(40),
      '2'.repeat(40),
      '3'.repeat(40),
    ])
    expect(leadPrompts(h)[1]).toMatch(/someone else changed/i)
  })
})

describe('the money and the clock (Decision 9)', () => {
  it("the session's cap: needs the checkpoint, and no new session until Carry on; then one, and it resumes at its step", async () => {
    const { h, id } = await startedRound({
      script: {
        lead: [
          read('server.js'),
          new ModelError('MODEL_BUDGET_EXHAUSTED', 429),
          commit(),
          done(),
        ],
      },
      remainingUsd: 4,
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({
      kind: 'checkpoint',
      capUsd: 2,
      monthLeftUsd: 4,
    })
    expect(viewOf(h, id)?.reference).toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(h.sessionStarts).toHaveLength(1)

    h.rounds.carryOn(h.store.getConversation(id, ALICE.id)!, TOKEN)
    await until(
      () => h.started.length === 1,
      () => viewOf(h, id),
    )
    expect(h.sessionStarts).toHaveLength(2)
    expect(h.store.latestRun(id)?.sessionIds).toEqual(['session-1', 'session-2'])
    // It carried on writing the pages: the read before the checkpoint is still its last move.
    expect(leadPrompts(h)[2]).toContain('Your last move (read)')
  })

  it('the month spent: needs the month, with when it comes back', async () => {
    const { h, id } = await startedRound({
      script: { lead: [new ModelError('MODEL_BUDGET_EXHAUSTED', 429)] },
      remainingUsd: 0,
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({
      kind: 'month',
      resetsAt: '2026-10-01T07:00:00.000Z',
    })
  })

  it("the session's clock: an expired key mid-round is the same checkpoint", async () => {
    const { h, id } = await startedRound({
      script: { lead: [read('server.js'), new ModelError('MODEL_KEY_REFUSED', 401)] },
      remainingUsd: 4,
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({
      kind: 'checkpoint',
      capUsd: 2,
      monthLeftUsd: 4,
    })
  })

  it('40 moves in one step: needs you, never more (Review Focus 2)', async () => {
    const { h, id } = await startedRound({
      script: { lead: Array.from({ length: 45 }, () => read('server.js')) },
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({ kind: 'moves' })
    expect(leadPrompts(h)).toHaveLength(40)
    expect(h.sessionStarts).toHaveLength(1)
  })

  it('the same refusal three times in a row: needs you as moves', async () => {
    const docker = commit([write('Dockerfile', 'FROM node')])
    const { h, id } = await startedRound({
      script: { lead: [docker, docker, docker, done()] },
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({ kind: 'moves' })
    expect(leadPrompts(h)).toHaveLength(3)
  })
})

describe('Stop (Review Focus 4)', () => {
  it('mid-build: the session is ended, the run is stopped, and nothing is deployed after it', async () => {
    const { h, id, conversation } = await startedRound({ script: STRAIGHT })
    await until(
      () => h.started.length === 1,
      () => h.did,
    )
    h.rounds.stop(conversation)
    await untilStatus(h, id, 'stopped')
    h.emit('build.succeeded', { buildId: 'build-1' })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(h.ended).toEqual(['session-1'])
    expect(h.releasesMade).toEqual([])
    expect(h.deployed).toEqual([])
    expect(stateOf(h, id)).toBe('building')
    // Twice is once.
    h.rounds.stop(conversation)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(h.ended).toEqual(['session-1'])
  })

  it('pressed while the lead thinks: stopped at once, its session ended at once, and the move it then answers never runs', async () => {
    const thinking = held<unknown>()
    const { h, id, conversation } = await startedRound({
      script: { lead: [read('server.js'), () => thinking.promise] },
    })
    await until(
      () => h.model.calls.filter((c) => c.agent === 'lead').length === 2,
      () => h.did,
    )
    h.rounds.stop(conversation)
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(viewOf(h, id)?.status).toBe('stopped')
    expect(h.ended).toEqual(['session-1'])
    thinking.resolve(commit())
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(h.attempts).toEqual([])
    expect(viewOf(h, id)?.status).toBe('stopped')
    expect(stateOf(h, id)).toBe('building')
  })

  it('pressed while deploy is in flight: the run is still stopped when deploy answers, and nothing after it runs', async () => {
    const deploy = held<Instance>()
    const { h, id, conversation } = await startedRound({
      script: STRAIGHT,
      deploy: () => deploy.promise,
    })
    await until(
      () => h.started.length === 1,
      () => h.did,
    )
    h.emit('build.succeeded', { buildId: 'build-1' })
    await until(
      () => h.did.some((d) => d.startsWith('deploy')),
      () => h.did,
    )
    h.rounds.stop(conversation)
    deploy.resolve({ id: 'instance-1', releaseId: 'release-1', state: 'healthy' })
    await untilStatus(h, id, 'stopped')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(viewOf(h, id)?.status).toBe('stopped')
    expect(h.outputs).toEqual([])
    expect(h.ended).toEqual(['session-1'])
  })
})

describe('their words while it works', () => {
  it('a message mid-build is waiting at once, and after the answers step the round goes back to the pages, in the same session', async () => {
    const { h, id, conversation } = await startedRound({
      script: { lead: [commit(), done(), commit(), done()] },
    })
    await until(
      () => h.started.length === 1,
      () => h.did,
    )
    h.rounds.message(conversation, 'Make the title bigger, please.')
    expect(viewOf(h, id)?.messageWaiting).toBe(true)
    expect(said(h, id).at(-1)).toMatchObject({
      from: 'person',
      kind: 'message',
      round: 1,
      text: 'Make the title bigger, please.',
    })
    h.emit('build.succeeded', { buildId: 'build-1' })
    await until(
      () => h.started.length === 2,
      () => viewOf(h, id),
    )
    expect(h.outputs).toEqual(['instance-1'])
    expect(leadPrompts(h)[2]).toContain('- "Make the title bigger, please."')
    expect(viewOf(h, id)?.messageWaiting).toBe(false)
    expect(h.sessionStarts).toHaveLength(1)
    h.emit('build.succeeded', { buildId: 'build-2' })
    await untilStatus(h, id, 'done')
    // Read once: never again.
    expect(leadPrompts(h)[3]).not.toContain('Make the title bigger')
  })

  it('a message while the pages are written is read at the next move', async () => {
    const reading = held<void>()
    const { h, id, conversation } = await startedRound({
      script: { lead: [read('server.js'), commit(), done()] },
      tree: async () => {
        await reading.promise
        return { commitSha: BASE }
      },
      autoBuild: true,
    })
    h.rounds.message(conversation, 'Call them units, not weeks.')
    reading.resolve()
    await untilStatus(h, id, 'done')
    expect(leadPrompts(h)[0]).toContain('- "Call them units, not weeks."')
    expect(leadPrompts(h)[1]).not.toContain('Call them units')
  })
})

describe('questions', () => {
  it('one with a default carries on with it; one without pauses, and its answer resumes', async () => {
    const { h, id, conversation } = await startedRound({
      script: {
        lead: [
          ask('Should a TA see everything you see?', "We've built it so only you can."),
          ask('Is a late post still a post?', null),
          commit(),
          done(),
        ],
      },
      autoBuild: true,
    })
    await untilStatus(h, id, 'paused')
    expect(stateOf(h, id)).toBe('paused')
    const questions = viewOf(h, id)!.questions
    expect(questions).toEqual([
      {
        id: expect.any(String),
        ask: 'Should a TA see everything you see?',
        default: "We've built it so only you can.",
        answer: "We've built it so only you can.",
        answered: false,
        secret: false,
      },
      {
        id: expect.any(String),
        ask: 'Is a late post still a post?',
        default: null,
        answer: null,
        answered: false,
        secret: false,
      },
    ])
    expect(h.rounds.answer(conversation, 'no-such-question', 'x')).toBe('unknown')
    expect(
      h.rounds.answer(conversation, questions[1]!.id, 'It closes at the deadline.'),
    ).toBe('taken')
    await untilStatus(h, id, 'done')
    expect(viewOf(h, id)?.questions[1]).toMatchObject({
      answer: 'It closes at the deadline.',
      answered: true,
    })
    expect(leadPrompts(h)[2]).toContain('It closes at the deadline.')
    expect(h.sessionStarts).toHaveLength(1)
  })

  it("a secret's answer goes to the sandbox and nowhere else: no table, no prompt, no trace holds it", async () => {
    const VALUE = 'the-secret-value-9f8e7d'
    const { h, id, conversation } = await startedRound({
      script: { lead: [ask('What is the SIS key?', null, 'SIS_KEY'), commit(), done()] },
      autoBuild: true,
    })
    await untilStatus(h, id, 'paused')
    const question = viewOf(h, id)!.questions[0]!
    expect(question).toMatchObject({ secret: true, answered: false })
    expect(h.rounds.answer(conversation, question.id, 'short')).toBe('invalid')
    expect(h.secretsSet).toEqual([])
    expect(h.rounds.answer(conversation, question.id, VALUE)).toBe('taken')
    await untilStatus(h, id, 'done')
    expect(h.secretsSet).toEqual([
      { token: TOKEN, projectId: PROJECT.id, name: 'SIS_KEY', value: VALUE },
    ])
    expect(viewOf(h, id)?.questions[0]).toMatchObject({ answered: true, answer: null })
    expect(JSON.stringify(dumpAll(h.file))).not.toContain(VALUE)
    expect(JSON.stringify(h.model.calls)).not.toContain(VALUE)
    expect(JSON.stringify(h.frames)).not.toContain(VALUE)
  })
})

describe('FE-32: a piece we cannot install', () => {
  it('a commit guarded for a dependency, then done with what cannot be added: the rest is built, and needs says what', async () => {
    const adds = JSON.stringify({
      name: 'app',
      type: 'module',
      dependencies: { express: '4.22.2', marked: '14.1.0' },
    })
    const { h, id } = await startedRound({
      script: {
        lead: [
          commit([write('package.json', adds)]),
          commit(),
          done('The rest is built.', 'the formatted text box'),
        ],
      },
      autoBuild: true,
    })
    await untilStatus(h, id, 'done')
    expect(h.commits).toHaveLength(1)
    expect(leadPrompts(h)[1]).toMatch(/cannot add a package/i)
    expect(viewOf(h, id)?.needs).toEqual({
      kind: 'cannot',
      what: 'the formatted text box',
    })
    expect(stateOf(h, id)).toBe('built')
    expect(said(h, id).at(-1)).toMatchObject({
      kind: 'built',
      cannot: 'the formatted text box',
    })
  })
})

describe('a restart (Review Focus 3)', () => {
  it('a working run is interrupted at boot; Carry on with a new token re-reads the build it started, and never builds that commit again', async () => {
    const first = await startedRound({ script: STRAIGHT })
    await until(
      () => first.h.started.length === 1,
      () => first.h.did,
    )
    // The process ends: a new server over the same file, with the same platform.
    const second = harness(
      { script: { lead: [] }, sessionIds: 'after' },
      first.h.file,
      first.h.store,
    )
    second.started.push(...first.h.started)
    second.rounds.interruptedOnBoot()
    expect(viewOf(second, first.id)?.status).toBe('interrupted')
    expect(second.store.getConversation(first.id, ALICE.id)?.state).toBe('building')

    second.buildStatus.set('build-1', 'succeeded')
    second.rounds.carryOn(second.store.getConversation(first.id, ALICE.id)!, NEW_TOKEN)
    await untilStatus(second, first.id, 'done')
    expect(second.did).toContain('getBuild build-1')
    expect(second.did.filter((d) => d.startsWith('startBuild'))).toEqual([])
    expect(second.releasesMade).toEqual([
      { buildId: 'build-1', summary: expect.any(String) },
    ])
    // The session before the restart is ended by its id, before a new one is started with the
    // new token; that one is ended when the round is built.
    expect(second.ended).toEqual(['session-1', 'after-1'])
    const did = second.did
    expect(did.indexOf('endAgentSession session-1')).toBeLessThan(
      did.findIndex((d) => d.startsWith('startAgentSession')),
    )
    expect(second.sessionStarts[0]?.token).toBe(NEW_TOKEN)
    expect(second.store.latestRun(first.id)?.sessionIds).toEqual(['session-1', 'after-1'])
  })

  it('a paused run is interrupted at boot too, and its conversation is building again', async () => {
    const first = await startedRound({
      script: { lead: [ask('Is a late post still a post?', null)] },
    })
    await untilStatus(first.h, first.id, 'paused')
    const second = harness({ script: { lead: [] } }, first.h.file, first.h.store)
    second.rounds.interruptedOnBoot()
    expect(viewOf(second, first.id)?.status).toBe('interrupted')
    expect(second.store.getConversation(first.id, ALICE.id)?.state).toBe('building')
  })
})

describe('the stream (Decision 15; Review Focus 5)', () => {
  it('reconnected during a build whose success fell outside the replay: the build is read again, and ticks from what it reads', async () => {
    const { h, id } = await startedRound({ script: STRAIGHT })
    await until(
      () => h.started.length === 1,
      () => h.did,
    )
    h.buildStatus.set('build-1', 'succeeded')
    h.watches.at(-1)!.handlers.reconnected()
    await untilStatus(h, id, 'done')
    expect(h.did).toContain('getBuild build-1')
  })

  it('a stream open but silent through a build: the build is read on a timer, and ticks from what it reads', async () => {
    const { h, id } = await startedRound({
      script: STRAIGHT,
      waits: { pollMs: 20, buildMs: 60_000, draftMs: 60_000 },
    })
    await until(
      () => h.started.length === 1,
      () => h.did,
    )
    await until(
      () => h.did.includes('getBuild build-1'),
      () => h.did,
    )
    expect(stepOf(h, id, 'build')?.state).toBe('now')
    h.buildStatus.set('build-1', 'succeeded')
    await untilStatus(h, id, 'done')
    expect(h.did.filter((d) => d.startsWith('startBuild'))).toHaveLength(1)
  })

  it('a stream open but silent while the draft starts: the instance is read on a timer, and ticks from what it reads', async () => {
    const { h, id } = await startedRound({
      script: STRAIGHT,
      autoBuild: true,
      deploy: (releaseId) => ({ id: 'instance-1', releaseId, state: 'starting' }),
      waits: { pollMs: 20, buildMs: 60_000, draftMs: 60_000 },
    })
    await until(
      () => h.deployed.length === 1,
      () => h.did,
    )
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(stepOf(h, id, 'draft')?.state).toBe('now')
    h.deployed[0]!.state = 'healthy'
    await untilStatus(h, id, 'done')
    expect(h.outputs).toEqual(['instance-1'])
  })

  it('a build the platform never finishes: needs you, waiting on Manifest, with a reference, and its session kept', async () => {
    const { h, id } = await startedRound({
      script: STRAIGHT,
      waits: { pollMs: 20, buildMs: 150, draftMs: 60_000 },
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({ kind: 'unreachable', what: 'platform' })
    expect(viewOf(h, id)?.reference).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    expect(stepOf(h, id, 'build')?.state).toBe('halted')
    expect(h.releasesMade).toEqual([])
    expect(h.ended).toEqual([])

    // Carry on reads the build it started again, and never builds that commit twice.
    h.buildStatus.set('build-1', 'succeeded')
    h.rounds.carryOn(h.store.getConversation(id, ALICE.id)!, TOKEN)
    await untilStatus(h, id, 'done')
    expect(h.did.filter((d) => d.startsWith('startBuild'))).toHaveLength(1)
  })

  it('an instance that never becomes healthy or failed: needs you, waiting on Manifest, with a reference', async () => {
    const { h, id } = await startedRound({
      script: STRAIGHT,
      autoBuild: true,
      deploy: (releaseId) => ({ id: 'instance-1', releaseId, state: 'starting' }),
      waits: { pollMs: 20, buildMs: 60_000, draftMs: 150 },
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({ kind: 'unreachable', what: 'platform' })
    expect(viewOf(h, id)?.reference).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    expect(stepOf(h, id, 'draft')?.state).toBe('halted')
    expect(h.outputs).toEqual([])
  })

  it('the token refused on the stream: needs a token; Carry on with a new one resumes', async () => {
    const { h, id } = await startedRound({ script: STRAIGHT })
    await until(
      () => h.started.length === 1,
      () => h.did,
    )
    h.watches.at(-1)!.handlers.refused()
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({ kind: 'token' })
    expect(viewOf(h, id)?.reference).toBeNull()
    expect(h.tokens.get(id)).toBeUndefined()

    h.buildStatus.set('build-1', 'succeeded')
    h.rounds.carryOn(h.store.getConversation(id, ALICE.id)!, NEW_TOKEN)
    await untilStatus(h, id, 'done')
    expect(h.watches.at(-1)?.token).toBe(NEW_TOKEN)
    expect(h.did.filter((d) => d.startsWith('startBuild'))).toHaveLength(1)
  })

  it('any call refused 401: needs a token', async () => {
    const { h, id } = await startedRound({
      script: STRAIGHT,
      tree: () => {
        throw new PlatformRefusal('UNAUTHENTICATED', 401)
      },
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({ kind: 'token' })
  })

  it('the platform unreachable: needs you, waiting on someone, with a reference', async () => {
    const { h, id } = await startedRound({
      script: STRAIGHT,
      tree: () => {
        throw new PlatformRefusal('PLATFORM_UNAVAILABLE', null)
      },
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({ kind: 'unreachable', what: 'platform' })
    expect(viewOf(h, id)?.reference).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
  })
})

describe("the draft's sign-in starts (FE-37, found by Rich's click)", () => {
  it('Checking it answers also sees sign-in start: refused is needs you, waiting on Manifest, with a reference, never built; Carry on checks again', async () => {
    const { h, id } = await startedRound({
      script: STRAIGHT,
      autoBuild: true,
      signIn: (n) => (n === 1 ? 'refused' : 'ok'),
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({ kind: 'refused', code: 'SIGN_IN_REFUSED' })
    expect(viewOf(h, id)?.reference).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    expect(h.did).toContain(`signIn ${SANDBOX.url}`)
    expect(stateOf(h, id)).not.toBe('built')
    expect(h.ended).toEqual([])

    h.rounds.carryOn(h.store.getConversation(id, ALICE.id)!, TOKEN)
    await untilStatus(h, id, 'done')
    expect(stateOf(h, id)).toBe('built')
    expect(h.did.filter((d) => d.startsWith('signIn'))).toHaveLength(2)
    expect(h.did.filter((d) => d.startsWith('startBuild'))).toHaveLength(1)
  })

  it('a sign-in it cannot judge (no redirect to the IdP, or our own fetch failing) never holds the round', async () => {
    const { h, id } = await startedRound({
      script: STRAIGHT,
      autoBuild: true,
      signIn: () => 'unknown',
    })
    await untilStatus(h, id, 'done')
    expect(stateOf(h, id)).toBe('built')
    // Said in the trace, so a check that can never reach the draft is seen, not silent.
    const traced = h.store
      .listTrace(h.store.latestRun(id)!.id)
      .map((t) => t.entry as { operation?: string; code?: string | null })
      .filter((e) => e.operation === 'signIn')
    expect(traced).toEqual([expect.objectContaining({ code: 'SIGN_IN_UNKNOWN' })])
  })
})

describe('a confidential project: only the on-campus model (Rich, 2026-09-28: carry on, and say so)', () => {
  it('carries on with it, and says so once in the conversation, never as the fallback, whatever the legs', async () => {
    const deploy = held<Instance>()
    const { h, id } = await startedRound({
      script: { lead: [read('server.js'), commit(), done(), done()] },
      autoBuild: true,
      deploy: () => deploy.promise,
      models: ['default-chat-onprem', 'default-chat-onprem-reasoning', 'default-embed'],
    })
    await until(
      () => h.deployed.length === 0 && h.releasesMade.length === 1,
      () => h.did,
    )
    expect(h.models.map((m) => m.model)).toEqual(['default-chat-onprem'])
    // A second leg, on a second session: Stop, then Carry on.
    h.rounds.stop(h.store.getConversation(id, ALICE.id)!)
    await untilStatus(h, id, 'stopped')
    deploy.resolve({ id: 'instance-1', releaseId: 'release-1', state: 'healthy' })
    // The stopped leg's deploy returns, and is discarded; then its leg is over.
    await new Promise((resolve) => setTimeout(resolve, 50))
    h.rounds.carryOn(h.store.getConversation(id, ALICE.id)!, TOKEN)
    await untilStatus(h, id, 'done')
    expect(h.models.map((m) => m.model)).toEqual([
      'default-chat-onprem',
      'default-chat-onprem',
    ])
    expect(said(h, id).filter((m) => m.kind === 'campus')).toEqual([
      { from: 'we', kind: 'campus', round: 1 },
    ])
    expect(said(h, id).filter((m) => m.kind === 'fallback')).toEqual([])
  })
})

describe('the fallback (Rich: carry on, and say so; Decision 4)', () => {
  it("the round's first fallback answer adds our one line, and carries on; a second adds nothing", async () => {
    const { h, id } = await startedRound({
      script: STRAIGHT,
      fallback: (agent, n) => agent === 'lead' && n <= 1,
    })
    await until(
      () => h.started.length === 1,
      () => h.did,
    )
    expect(said(h, id).filter((m) => m.kind === 'fallback')).toEqual([
      { from: 'we', kind: 'fallback', round: 1 },
    ])
    const models = h.store
      .listTrace(h.store.latestRun(id)!.id)
      .map((t) => t.entry as { kind: string; answered?: string; fallback?: boolean })
      .filter((e) => e.kind === 'model')
    expect(models.map((m) => m.fallback)).toEqual([true, true, false])
    expect(models[0]).toMatchObject({
      agent: 'lead',
      asked: 'default-chat-large',
      answered: 'ollama_chat/qwen3.5:4b',
    })
  })
})

describe('a stall (F5 Decision 14, Review Focus 2)', () => {
  const RECEIVED: Received = { chars: 2_354, firstWordMs: 13_600, ms: 43_600 }
  const stall = (why: 'quiet' | 'ceiling') =>
    new ModelError(why === 'quiet' ? 'MODEL_STALLED' : 'MODEL_TOO_LONG', null, RECEIVED)
  const models = (h: H, id: string) =>
    h.store
      .listTrace(h.store.latestRun(id)!.id)
      .map((t) => t.entry as { kind: string })
      .filter((e) => e.kind === 'model')

  it.each(['quiet', 'ceiling'] as const)(
    'the model %s: needs you, a stall, with a reference; the trace says how much came; Carry on resumes in the same session, where it was',
    async (why) => {
      const { h, id } = await startedRound({
        script: { lead: [read('server.js'), stall(why), commit(), done()] },
        autoBuild: true,
      })
      await untilStatus(h, id, 'needs-you')
      expect(viewOf(h, id)?.needs).toEqual({ kind: 'stalled', why })
      expect(viewOf(h, id)?.reference).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
      expect(models(h, id).at(-1)).toEqual({
        kind: 'model',
        agent: 'lead',
        asked: 'default-chat-large',
        answered: null,
        fallback: null,
        usage: null,
        received: RECEIVED,
        stalled: why,
      })

      h.rounds.carryOn(h.store.getConversation(id, ALICE.id)!, TOKEN)
      await untilStatus(h, id, 'done')
      expect(h.sessionStarts).toHaveLength(1)
      // It carried on where it was: the read before the stall is still its last move.
      expect(leadPrompts(h)[2]).toContain('Your last move (read)')
    },
  )

  it('a stall is billed for what streamed (S1: M2): the cost line is read again', async () => {
    const spent = [0.1]
    let release = () => undefined as void
    const held = new Promise<void>((resolve) => (release = resolve))
    const { h, id } = await startedRound({
      script: { lead: [async () => (await held, stall('quiet'))] },
      spent,
    })
    await until(
      () => viewOf(h, id)?.cost.conversationUsd === 0.1,
      () => viewOf(h, id),
    )
    spent[0] = 0.25
    release()
    await untilStatus(h, id, 'needs-you')
    await until(
      () => viewOf(h, id)?.cost.conversationUsd === 0.25,
      () => viewOf(h, id)?.cost,
    )
  })

  it('every answer is traced with how much came, never what (Global Constraints): the real client over a gateway that streams a sentinel', async () => {
    const SENTINEL = 'SENTINEL-7c1e-never-kept'
    const whole = `{"move":"${SENTINEL}"}`
    const partial = `{"move":{"kind":"read","paths":["${SENTINEL}`
    let n = 0
    const gateway = (async (_url: string, init: RequestInit) => {
      const cut = n++ >= 2
      const encoder = new TextEncoder()
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          const event = (payload: unknown) =>
            c.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
          init.signal?.addEventListener('abort', () => {
            try {
              c.error(init.signal!.reason)
            } catch {
              // Already closed: nothing to cut.
            }
          })
          event({
            model: 'default-chat-large',
            choices: [{ delta: { content: cut ? partial : whole } }],
          })
          if (cut) return
          event({
            model: 'default-chat-large',
            choices: [],
            usage: { prompt_tokens: 4300, completion_tokens: 21 },
          })
          c.enqueue(encoder.encode('data: [DONE]\n\n'))
          c.close()
        },
      })
      return new Response(body, {
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'x-litellm-attempted-fallbacks': '0',
        },
      })
    }) as unknown as typeof fetch
    const { h, id } = await startedRound({
      script: {},
      modelFor: (session, onAnswer) =>
        openAiCompatible({
          baseUrl: session.baseUrl,
          key: session.key,
          model: session.model,
          fetch: gateway,
          deadlines: { firstWordMs: 500, quietMs: 50, ceilingMs: 5_000 },
          onAnswer,
        }),
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toEqual({ kind: 'stalled', why: 'quiet' })
    expect(JSON.stringify(dumpAll(h.file))).not.toContain(SENTINEL)
    expect(JSON.stringify(h.frames)).not.toContain(SENTINEL)
    // Two whole answers that were not moves (one asked twice), then one cut short.
    expect(models(h, id)).toEqual([
      ...[0, 1].map(() => ({
        kind: 'model',
        agent: 'lead',
        asked: 'default-chat-large',
        answered: 'default-chat-large',
        fallback: false,
        usage: { in: 4300, out: 21 },
        received: {
          chars: whole.length,
          firstWordMs: expect.any(Number),
          ms: expect.any(Number),
        },
      })),
      {
        kind: 'model',
        agent: 'lead',
        asked: 'default-chat-large',
        answered: null,
        fallback: null,
        usage: null,
        received: {
          chars: partial.length,
          firstWordMs: expect.any(Number),
          ms: expect.any(Number),
        },
        stalled: 'quiet',
      },
    ])
  })
})

describe('the cost (Decision 14)', () => {
  it("after a model call, the conversation's figure is its sessions' spend, and the month's is the budget's", async () => {
    const { h, id } = await startedRound({ script: STRAIGHT, spent: [0.4] })
    await until(
      () => viewOf(h, id)?.cost.conversationUsd === 0.4,
      () => viewOf(h, id),
    )
    expect(viewOf(h, id)?.cost).toEqual({
      conversationUsd: 0.4,
      monthLeftUsd: 9.6,
      resetsAt: '2026-10-01T07:00:00.000Z',
    })
  })

  it('a spend the gateway did not say leaves the figure unknown', async () => {
    const { h, id } = await startedRound({ script: STRAIGHT, spent: [null] })
    await until(
      () => viewOf(h, id)?.cost.monthLeftUsd === 9.6,
      () => viewOf(h, id),
    )
    expect(viewOf(h, id)?.cost.conversationUsd).toBeNull()
  })
})

describe('no credential anywhere (Global Constraints)', () => {
  it('after a whole round: no mft_ and no sk- in any prompt, any table, or any frame', async () => {
    const { h, id } = await startedRound({ script: STRAIGHT })
    await until(
      () => h.started.length === 1,
      () => h.did,
    )
    h.emit('build.succeeded', { buildId: 'build-1' })
    await untilStatus(h, id, 'done')
    expect(JSON.stringify(h.model.calls)).not.toMatch(/mft_|sk-/)
    expect(JSON.stringify(dumpAll(h.file))).not.toMatch(/mft_|sk-/)
    expect(JSON.stringify(h.frames)).not.toMatch(/mft_|sk-/)
  })

  it('the trace says what each platform call named: the commits, the build, the release, the sandbox and its instance', async () => {
    const { h, id } = await startedRound({ script: STRAIGHT })
    await until(
      () => h.started.length === 1,
      () => h.did,
    )
    h.emit('build.succeeded', { buildId: 'build-1' })
    await untilStatus(h, id, 'done')
    const platform = h.store
      .listTrace(h.store.latestRun(id)!.id)
      .map((t) => t.entry as { kind: string; operation?: string; named?: string | null })
      .filter((e) => e.kind === 'platform')
      .map((e) => `${e.operation} ${e.named}`)
    expect(platform).toEqual(
      expect.arrayContaining([
        'startAgentSession session-1',
        `createCommit dry run on ${BASE}`,
        `createCommit on ${BASE}`,
        `startBuild ${'c1'.padEnd(40, '0')}`,
        'createRelease build-1',
        'deploy sandbox',
        'getInstanceOutput instance-1',
        'endAgentSession session-1',
      ]),
    )
  })
})

describe('the store is enough (a reconnect, or a restart)', () => {
  it("the round's view is folded from the store alone, and says nothing before a round", async () => {
    const h = harness({ script: STRAIGHT })
    const conversation = agreed(h)
    expect(viewOf(h, conversation.id)).toBeNull()
  })
})

describe('the round frees its app (F4 Task 6, Decision 5)', () => {
  it('built: once its work has ended, the line starts the next change, with no request', async () => {
    const begun: string[] = []
    const h = harness({
      script: STRAIGHT,
      autoBuild: true,
      ended: (conversation) => line.released(conversation.projectId),
    })
    const conversation = agreed(h)
    h.tokens.put(conversation.id, TOKEN)
    const line: Line = createLine({
      store: h.store,
      hub: h.hub,
      now: () => new Date(),
      begin: (next) => {
        begun.push(next.id)
        h.store.setState(next.id, 'planning')
      },
    })
    const next = h.store.createChange(
      ALICE.id,
      PROJECT.id,
      'Word count',
      'Also a word count.',
    )
    expect(line.join(next)).toBe('waiting')
    h.rounds.start(conversation, TOKEN)
    await untilStatus(h, conversation.id, 'done')
    await until(
      () => begun.length > 0,
      () => begun,
    )
    expect(stateOf(h, conversation.id)).toBe('built')
    expect(begun).toEqual([next.id])
  })
})

describe('the lead on an app that exists (F4 Task 8)', () => {
  /** docs/plan.md as F2 committed it: what round 1 reads from the tree. */
  const TREE_PLAN = planMarkdown(PROJECT.name, PLAN, {
    late: 'It closes at the deadline.',
  })
  const WORD_COUNT = 'Also show a word count on each response.'
  const STAGING: Incident = {
    id: 'incident-9',
    instanceId: 'instance-staging-2',
    releaseId: 'release-1',
    exitReason: 'the process exited with code 1',
    failedCheck: 'readiness: GET /healthz, no answer after 87 attempts',
    logTail: "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/count.js'",
    diffSinceHealthy: '+ import ./count.js',
    prompt: 'The app could not start on staging: a module it imports is missing.',
  }

  /** A change on the app, agreed and committed: its round is next. */
  function agreedChange(h: H) {
    h.store.rememberPerson(ALICE)
    const change = h.store.createChange(ALICE.id, PROJECT.id, 'Word count', WORD_COUNT)
    h.store.addMessage(change.id, 'we', { kind: 'project', project: PROJECT })
    h.store.addMessage(change.id, 'person', {
      kind: 'asked',
      change: 1,
      words: WORD_COUNT,
      fix: null,
    })
    h.store.savePlan(change.id, {
      ...PLAN,
      youSee: `${PLAN.youSee} Each response shows its word count.`,
      onlyYouKnow: [],
      changed: ['youSee'],
    })
    h.store.addMessage(change.id, 'person', {
      kind: 'agreed',
      version: 1,
      answers: {},
      commitSha: BASE,
      sent: [],
    })
    const made = h.store.setState(change.id, 'agreed')
    h.hub.subscribe(made.id, (frame) => h.frames.push(frame))
    return made
  }

  /** A fix of ours, carrying staging's incident: no plan to agree. */
  function fixing(h: H) {
    h.store.rememberPerson(ALICE)
    const fix = h.store.createChange(
      ALICE.id,
      PROJECT.id,
      "It didn't start on the trying-out address",
      "It didn't start on the trying-out address",
    )
    h.store.addMessage(fix.id, 'we', { kind: 'project', project: PROJECT })
    h.store.addMessage(fix.id, 'we', {
      kind: 'asked',
      change: 1,
      words: "It didn't start on the trying-out address",
      fix: { incidentId: STAGING.id },
    })
    return fix
  }

  /** The live address's incident: a first launch that did not start (F5 Decision 13). */
  const LIVE: Incident = {
    ...STAGING,
    id: 'incident-live',
    exitReason: 'the live start exited with code 1',
    logTail: 'Error: MONGODB_URI is required (on the live address)',
    prompt: 'The application failed to start in its production environment.',
  }

  /** A fix of ours for a start on the live address, as the page asks it. */
  function fixingLive(h: H) {
    h.store.rememberPerson(ALICE)
    const fix = h.store.createChange(
      ALICE.id,
      PROJECT.id,
      "It didn't start on the live address",
      "It didn't start on the live address",
    )
    h.store.addMessage(fix.id, 'we', { kind: 'project', project: PROJECT })
    h.store.addMessage(fix.id, 'we', {
      kind: 'asked',
      change: 1,
      words: "It didn't start on the live address",
      fix: { incidentId: LIVE.id, environment: 'production' },
    })
    return fix
  }

  /** A dry run that signed nobody in (F5 Decision 8, M4's shape), as the page hands it over. */
  const DRY_RUN = {
    rehearsalId: '55555555-5555-4555-8555-555555555555',
    signInStatus: null,
    attributesReleased: ['mail'],
    attributesAsked: ['ubcEduCwlPuid', 'mail'],
  }

  /** A fix of ours for a dry run on the live setup that signed nobody in. */
  function fixingDryRun(h: H) {
    h.store.rememberPerson(ALICE)
    const words = "The dry run didn't sign anyone in"
    const fix = h.store.createChange(ALICE.id, PROJECT.id, words, words)
    h.store.addMessage(fix.id, 'we', { kind: 'project', project: PROJECT })
    h.store.addMessage(fix.id, 'we', {
      kind: 'asked',
      change: 1,
      words,
      fix: { dryRun: DRY_RUN },
    })
    return fix
  }

  function started(options: Options, make: (h: H) => Conversation = agreed) {
    const h = harness(options)
    const conversation = make(h)
    h.tokens.put(conversation.id, TOKEN)
    h.rounds.start(conversation, TOKEN)
    return { h, id: conversation.id, conversation }
  }

  const firstPrompt = async (h: H) => {
    await until(
      () => leadPrompts(h).length > 0,
      () => h.did,
    )
    return leadPrompts(h)[0]!
  }

  it('reads docs/plan.md from the tree for its round, never the store’s', async () => {
    const { h } = started({
      script: STRAIGHT,
      files: { 'docs/plan.md': `${TREE_PLAN}\nEdited in the tree since.\n` },
    })
    expect(await firstPrompt(h)).toContain('Edited in the tree since.')
  })

  it("round 1 of a first conversation reads the very text the store's plan makes: F2 committed it", async () => {
    const { h } = started({ script: STRAIGHT, files: { 'docs/plan.md': TREE_PLAN } })
    const prompt = await firstPrompt(h)
    expect(prompt).toContain(
      `The plan we agreed (docs/plan.md, committed):\n${TREE_PLAN}`,
    )
    // The same text it read before F4, from the store.
    const { h: before } = started({ script: STRAIGHT })
    expect(await firstPrompt(before)).toContain(TREE_PLAN)
  })

  it("a docs/plan.md it cannot read falls back to the store's plan", async () => {
    const { h } = started({ script: STRAIGHT })
    expect(await firstPrompt(h)).toContain(TREE_PLAN)
  })

  it('a change’s round carries what they asked and the parts that changed, as they now read; a first round neither', async () => {
    const { h } = started(
      { script: STRAIGHT, files: { 'docs/plan.md': TREE_PLAN } },
      agreedChange,
    )
    const prompt = await firstPrompt(h)
    expect(prompt).toContain(`- "${WORD_COUNT}"`)
    expect(prompt).toContain(
      `- What you see: ${PLAN.youSee} Each response shows its word count.`,
    )
    expect(prompt).not.toContain('- What students see:')
    expect(prompt).toMatch(/already works/)
    const { h: first } = started({ script: STRAIGHT })
    expect(await firstPrompt(first)).not.toMatch(
      /The change we agreed|trying-out address/,
    )
  })

  it("a fix's round starts at the pages, no plan agreed, with staging's incident in its view", async () => {
    const { h, id } = started(
      {
        script: { lead: [] },
        incident: (environment, incidentId) =>
          environment === 'staging' && incidentId === STAGING.id ? STAGING : undefined,
      },
      fixing,
    )
    const prompt = await firstPrompt(h)
    expect(viewOf(h, id)?.steps[0]).toMatchObject({ key: 'pages', state: 'now' })
    expect(h.did).toContain(`listIncidents staging ${STAGING.id}`)
    for (const said of [
      STAGING.exitReason,
      STAGING.failedCheck,
      STAGING.logTail,
      STAGING.prompt,
      STAGING.diffSinceHealthy,
    ])
      expect(prompt).toContain(said)
    expect(h.store.latestPlan(id)).toBeUndefined()
  })

  it("a staging incident refused to our token (a confidential app's): only that it did not start, and why we cannot read it; nothing shown as a problem", async () => {
    const { h, id } = started(
      { script: { lead: [] }, incident: () => 'confidential' },
      fixing,
    )
    const prompt = await firstPrompt(h)
    expect(prompt).toMatch(/did not start on the trying-out address/)
    expect(prompt).toMatch(/cannot read why/i)
    expect(prompt).not.toContain(STAGING.logTail)
    expect(viewOf(h, id)).toMatchObject({
      status: 'working',
      needs: null,
      reference: null,
    })
    expect(JSON.parse(dumpAll(h.file)['problems']!)).toEqual([])
  })

  it("a fix of a start on the live address reads production's incident, and its view says the live address (F5 Decision 13)", async () => {
    const { h, id } = started(
      {
        script: { lead: [] },
        incident: (environment, incidentId) =>
          environment === 'production' && incidentId === LIVE.id ? LIVE : undefined,
      },
      fixingLive,
    )
    const prompt = await firstPrompt(h)
    expect(h.did).toContain(`listIncidents production ${LIVE.id}`)
    expect(h.did).not.toContain(`listIncidents staging ${LIVE.id}`)
    expect(prompt).toMatch(/did not start on the live address/)
    expect(prompt).not.toMatch(/trying-out address/)
    for (const said of [LIVE.exitReason, LIVE.logTail, LIVE.prompt])
      expect(prompt).toContain(said)
    expect(viewOf(h, id)?.steps[0]).toMatchObject({ key: 'pages', state: 'now' })
  })

  it("a confidential app's live incident refused to our token: only that it did not start there, and why we cannot read it", async () => {
    const { h, id } = started(
      { script: { lead: [] }, incident: () => 'confidential' },
      fixingLive,
    )
    const prompt = await firstPrompt(h)
    expect(h.did).toContain(`listIncidents production ${LIVE.id}`)
    expect(prompt).toMatch(/did not start on the live address/)
    expect(prompt).toMatch(/cannot read why/i)
    expect(prompt).not.toContain(LIVE.logTail)
    expect(viewOf(h, id)).toMatchObject({
      status: 'working',
      needs: null,
      reference: null,
    })
    expect(JSON.parse(dumpAll(h.file)['problems']!)).toEqual([])
  })

  it("a dry run's fix reads no incident: its view says the dry run signed nobody in, what the sign-in answered, and which details it asked for and never got (F5 Decision 8)", async () => {
    const { h, id } = started(
      { script: { lead: [] }, incident: () => LIVE },
      fixingDryRun,
    )
    const prompt = await firstPrompt(h)
    expect(h.did.filter((d) => d.startsWith('listIncidents'))).toEqual([])
    expect(prompt).toMatch(/dry run on the live setup did not sign anyone in/)
    expect(prompt).toMatch(/no sign-in was completed/i)
    expect(prompt).toContain('The details its registration asks for: ubcEduCwlPuid, mail')
    expect(prompt).toContain('The details the sign-in carried: mail')
    expect(prompt).toContain('Asked for and never carried: ubcEduCwlPuid')
    expect(prompt).not.toMatch(/did not start/)
    expect(prompt).not.toContain(LIVE.logTail)
    expect(viewOf(h, id)?.steps[0]).toMatchObject({ key: 'pages', state: 'now' })
    expect(h.store.latestPlan(id)).toBeUndefined()
  })

  it("a dry run's fix whose sign-in answered says what the app answered at its sign-in address", async () => {
    const answered = (h: H) => {
      const fix = fixingDryRun(h)
      h.store.addMessage(fix.id, 'we', {
        kind: 'asked',
        change: 2,
        words: "The dry run didn't sign anyone in",
        fix: {
          dryRun: {
            ...DRY_RUN,
            signInStatus: 500,
            attributesReleased: ['ubcEduCwlPuid', 'mail'],
          },
        },
      })
      return fix
    }
    const { h } = started({ script: { lead: [] } }, answered)
    const prompt = await firstPrompt(h)
    expect(prompt).toContain('What the app answered at its sign-in address: 500')
    expect(prompt).not.toMatch(/Asked for and never carried/)
  })

  it('unread (Review Focus 3): a first move that writes server.js whole is sent back, read it first; read, the same commit is taken', async () => {
    const WHOLE = [
      write('server.js', "import express from 'express'\n// with a word count\n"),
    ]
    const { h, id } = started({
      script: { lead: [commit(WHOLE), read('server.js'), commit(WHOLE), done()] },
      autoBuild: true,
    })
    await untilStatus(h, id, 'done')
    expect(h.attempts).toHaveLength(1)
    expect(h.attempts[0]!.changes).toEqual(WHOLE)
    expect(leadPrompts(h)[1]).toMatch(
      /server\.js is already in the app[^\n]*read it first/,
    )
  })

  it('a read at an older tree does not count: after someone else’s commit, the write is sent back until it reads again', async () => {
    const WHOLE = [write('server.js', "import express from 'express'\n// ours\n")]
    const { h, id } = started({
      script: {
        lead: [
          read('server.js'),
          commit(WHOLE),
          commit(WHOLE),
          read('server.js'),
          commit(WHOLE),
          done(),
        ],
      },
      commit: (n) => {
        if (n === 1) throw new PlatformRefusal('SOURCE_CONFLICT', 409)
      },
      tree: (n) => ({ commitSha: n === 1 ? BASE : 'e'.repeat(40) }),
      autoBuild: true,
    })
    await untilStatus(h, id, 'done')
    // The conflict's attempt, then only the one after the second read.
    expect(h.attempts).toHaveLength(2)
    expect(leadPrompts(h)[3]).toMatch(/read it first/)
  })

  it("the specialist's proposal committed as proposed is taken unread; changed by the lead, it is sent back", async () => {
    const STAFF = write(
      'config/staff.json',
      JSON.stringify({ puids: ['ins000001'], emails: [] }),
    )
    const WIRED = write('server.js', "import express from 'express'\n// staff only\n")
    const ASK_CWL = {
      move: {
        kind: 'ask_cwl',
        brief: {
          whoGetsIn: 'Anyone with a CWL.',
          youSee: 'Every response.',
          studentsSee: 'Their own.',
          namedEmails: [],
        },
      },
    }
    const { h, id } = started({
      script: {
        lead: [
          ASK_CWL,
          commit([STAFF, write('server.js', 'our own guess\n')]),
          commit([STAFF, WIRED]),
          done(),
        ],
        cwl: [{ changes: [STAFF, WIRED], summary: 'Only you see every response.' }],
      },
      autoBuild: true,
    })
    await untilStatus(h, id, 'done')
    expect(h.attempts.map((a) => a.changes)).toEqual([[STAFF, WIRED]])
    expect(leadPrompts(h)[2]).toMatch(/read it first/)
  })

  it('a message the lead read during the round joins docs/plan.md’s Changes after done, in one commit of ours, dry run first, before the build', async () => {
    const heldCommit = held<unknown>()
    const { h, id, conversation } = started({
      script: { lead: [read('server.js'), () => heldCommit.promise, done()] },
      files: { 'docs/plan.md': TREE_PLAN },
      autoBuild: true,
    })
    await until(
      () => leadPrompts(h).length === 2,
      () => h.did,
    )
    h.rounds.message(conversation, 'Show the count beside each name, please.')
    heldCommit.resolve(commit())
    await untilStatus(h, id, 'done')
    expect(h.commits).toHaveLength(2)
    const ours = h.commits[1]!
    expect(ours.baseCommit).toBe('c1'.padEnd(40, '0'))
    expect(ours.changes).toHaveLength(1)
    const [plan] = ours.changes as [{ op: 'write'; path: string; content: string }]
    expect(plan.path).toBe('docs/plan.md')
    expect(plan.content.startsWith(TREE_PLAN)).toBe(true)
    expect(plan.content).toMatch(
      /## Changes since we first agreed\n\n- \d{1,2} [A-Z][a-z]+ \d{4}: Show the count beside each name, please\.\n$/,
    )
    // Ours, then the build: the build holds the agreement as it now stands.
    const order = h.did.filter(
      (d) => d.startsWith('createCommit') || d.startsWith('startBuild'),
    )
    expect(order).toEqual([
      'createCommit c2ac211',
      'createCommit c100000',
      'startBuild c200000',
    ])
  })

  it('no message read, no commit of ours', async () => {
    const { h, id } = started({
      script: STRAIGHT,
      files: { 'docs/plan.md': TREE_PLAN },
      autoBuild: true,
    })
    await untilStatus(h, id, 'done')
    expect(h.commits).toHaveLength(1)
  })

  it.each([
    ['paused on a question', [ask('When do posts close?', null)], 'paused'],
    ['needing them', [new ModelError('MODEL_UNREACHABLE')], 'needs-you'],
  ] as const)(
    'a round %s keeps its app: the line starts nothing',
    async (_, lead, status) => {
      const begun: string[] = []
      const h = harness({
        script: { lead: [...lead] },
        ended: (conversation) => line.released(conversation.projectId),
      })
      const conversation = agreed(h)
      h.tokens.put(conversation.id, TOKEN)
      const line: Line = createLine({
        store: h.store,
        hub: h.hub,
        now: () => new Date(),
        begin: (next) => void begun.push(next.id),
      })
      line.join(h.store.createChange(ALICE.id, PROJECT.id, 'Next', 'Next.'))
      h.rounds.start(conversation, TOKEN)
      await untilStatus(h, conversation.id, status)
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(begun).toEqual([])
      expect(line.holder(PROJECT.id)?.id).toBe(conversation.id)
    },
  )

  it("models_withdrawn (FE-36) with the model we were using still listed: we carry on by ourselves in a new session, and say so once, never the card (Rich, 2026-09-29, at his click: the lead's own commit made the app confidential, and the capable model stays allowed)", async () => {
    const { h, id } = started({
      script: {
        lead: [
          new ModelError('MODEL_KEY_REFUSED', 401),
          read('server.js'),
          commit(),
          done(),
        ],
      },
      endReason: (n) => (n === 0 ? 'models_withdrawn' : null),
      autoBuild: true,
    })
    await untilStatus(h, id, 'done')
    expect(h.sessionStarts).toHaveLength(2)
    expect(h.models.map((m) => m.model)).toEqual([
      'default-chat-large',
      'default-chat-large',
    ])
    expect(said(h, id).filter((m) => m.kind === 'carried')).toEqual([
      { from: 'we', kind: 'carried', round: 1 },
    ])
    expect(viewOf(h, id)?.needs ?? null).toBeNull()
  })

  it('models_withdrawn with the model we were using gone (an on-campus-only setting): stop and ask first — the new session ended unused, the card; Carry on continues on what the app now allows (Rich: stop and ask first)', async () => {
    const { h, id, conversation } = started({
      script: {
        lead: [
          new ModelError('MODEL_KEY_REFUSED', 401),
          read('server.js'),
          commit(),
          done(),
        ],
      },
      endReason: (n) => (n === 0 ? 'models_withdrawn' : null),
      modelsOf: (n) =>
        n === 0
          ? ['default-chat', 'default-chat-large', 'default-embed']
          : ['default-chat-onprem', 'default-chat-onprem-reasoning', 'default-embed'],
      autoBuild: true,
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)).toMatchObject({ needs: { kind: 'withdrawn' }, reference: null })
    expect(h.sessionStarts).toHaveLength(2)
    expect(h.ended).toContain('session-2')
    expect(said(h, id).filter((m) => m.kind === 'carried')).toEqual([])
    h.rounds.carryOn(h.store.getConversation(conversation.id, ALICE.id)!, TOKEN)
    await untilStatus(h, id, 'done')
    expect(h.sessionStarts).toHaveLength(3)
    expect(h.models.at(-1)?.model).toBe('default-chat-onprem')
  })

  it('a model narrowed away from the live session (the platform’s sitting 5): never "waiting on an administrator"; renewed once, and with it gone, stop and ask first (Rich), then on what the app allows', async () => {
    const ONPREM = [
      'default-chat-onprem',
      'default-chat-onprem-reasoning',
      'default-embed',
    ]
    const { h, id, conversation } = started({
      script: {
        lead: [
          new ModelError('MODEL_NOT_AVAILABLE', 403),
          read('server.js'),
          commit(),
          done(),
        ],
      },
      narrowed: (n) => (n === 0 ? ONPREM : undefined),
      modelsOf: (n) =>
        n === 0 ? ['default-chat', 'default-chat-large', 'default-embed'] : ONPREM,
      autoBuild: true,
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)).toMatchObject({ needs: { kind: 'withdrawn' }, reference: null })
    expect(h.sessionStarts).toHaveLength(2)
    h.rounds.carryOn(h.store.getConversation(conversation.id, ALICE.id)!, TOKEN)
    await untilStatus(h, id, 'done')
    expect(h.models.at(-1)?.model).toBe('default-chat-onprem')
  })

  it('a model refused while the key still holds it is not a narrowing: the refusal stands', async () => {
    const { h, id } = started({
      script: { lead: [new ModelError('MODEL_NOT_AVAILABLE', 403)] },
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toMatchObject({
      kind: 'refused',
      code: 'MODEL_NOT_AVAILABLE',
    })
    expect(h.sessionStarts).toHaveLength(1)
  })

  it('a key refused because its person was removed from the app (member_removed, the platform’s sitting 5): the token’s, never the checkpoint', async () => {
    const { h, id } = started({
      script: { lead: [new ModelError('MODEL_KEY_REFUSED', 401)] },
      endReason: (n) => (n === 0 ? 'member_removed' : null),
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toMatchObject({ kind: 'token' })
    expect(h.sessionStarts).toHaveLength(1)
  })

  it('a key refused with no such reason (its clock ran out) is still the checkpoint', async () => {
    const { h, id } = started({
      script: { lead: [new ModelError('MODEL_KEY_REFUSED', 401)] },
      endReason: () => null,
    })
    await untilStatus(h, id, 'needs-you')
    expect(viewOf(h, id)?.needs).toMatchObject({ kind: 'checkpoint' })
  })
})
