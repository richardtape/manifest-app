import { randomUUID } from 'node:crypto'
import { cwl } from '../agents/cwl.js'
import { explaining } from '../agents/explaining.js'
import { CAPABLE_VIEW_CAP, lead, VIEW_CAP, type LeadView } from '../agents/lead.js'
import { dayOf } from '../agents/change.js'
import { HEADINGS, planMarkdown, readPlanMarkdown, type Plan } from '../agents/plan.js'
import { publishRefusal, publishState, type Hub } from '../api/events.js'
import { intakeOf, planOf } from '../api/intake-state.js'
import { pieceOf } from '../api/piece-state.js'
import { problem } from '../api/problems.js'
import { unionOf } from '../api/sensitive.js'
import type { BuildStep, ConversationState, Needs } from '../api/progress.js'
import { heardIn, NO_DETAIL, type RoundSaid } from '../api/round-state.js'
import { Refused, type Work } from '../api/work.js'
import {
  ModelError,
  modelFor as mostCapable,
  type Answered,
  type Model,
} from '../model/client.js'
import type { AgentSessions } from '../platform/agent-sessions.js'
import type { Builds } from '../platform/builds.js'
import type { Details } from '../platform/details.js'
import type { Instances } from '../platform/instances.js'
import type { Members } from '../platform/members.js'
import type { ConversationTokens, Projects } from '../platform/project.js'
import { PLATFORM_TIMEOUT_MS, PlatformRefusal } from '../platform/refusal.js'
import type { Releases, Sandbox } from '../platform/releases.js'
import type { SignIn } from '../platform/sign-in.js'
import type { Secrets } from '../platform/secrets.js'
import type { Change, Sent, Source } from '../platform/source.js'
import type { ProjectStream, Watch } from '../platform/stream.js'
import { askAgent } from '../runtime/agent.js'
import { run as runMoves, type Stop } from '../runtime/run.js'
import type { ToolDef } from '../runtime/tool.js'
import type { Trace } from '../runtime/trace.js'
import type { Conversation, Run, RunDetail, Store } from '../store/db.js'
import { guards } from './guards.js'
import { importsHold } from './imports.js'
import { leadMoves, type RoundContext } from './moves.js'

/**
 * THE ROUND OF WORK (F3 Task 8): moment 6's five steps in a fixed order, each ticking only on
 * its own platform signal (Decision 5). The lead writes the pages, one move a turn, through our
 * runtime; the round holds the signals, the three tries, the checkpoint and the clock, Stop,
 * their messages and questions. It runs inside `work.run`, one piece of work per conversation,
 * and says where it is by saving its run: the page's `RoundView` is folded from the store.
 */
export interface Rounds {
  /** Decision 11: after the plan's commit, round 1 starts by itself. */
  start(conversation: Conversation, token: string): void
  /** Carry on, Try a different way, Try again: from needs you, a Stop, or a restart. */
  carryOn(conversation: Conversation, token: string, way?: 'different'): void
  /** Read by the lead at its next move; after the step when it is building (Got it, after this step). */
  message(conversation: Conversation, words: string): void
  /**
   * Their answer: `taken`, or why not. A secret's goes to the sandbox and nowhere else, and is
   * never stored; one under 6 characters is `invalid` before anything is sent (M1).
   */
  answer(
    conversation: Conversation,
    questionId: string,
    words: string,
  ): 'taken' | 'unknown' | 'invalid' | 'token'
  /**
   * Idempotent. Stop wins over anything in flight (Review Focus 4). `stopped` says who and why
   * (F6b Decision 6): the first stop's is kept.
   */
  stop(
    conversation: Conversation,
    stopped?: { by: string; why: 'stopped' | 'removed' },
  ): void
  /** A restart: a working or paused run is interrupted (Review Focus 3). */
  interruptedOnBoot(): void
  /**
   * F4 Decision 5: it reached the front of the app's line with no token held (a restart forgot
   * it). Its stopped round, or a fix's first, is saved interrupted, so the page hands one over
   * and carries on, as after any restart. Nothing is started without one.
   */
  withoutToken(conversation: Conversation): void
}

export interface RoundDeps {
  store: Store
  hub: Hub
  work: Work
  /** The conversations' tokens: a refused one is dropped, and the page mints another. */
  tokens: ConversationTokens
  sessions: AgentSessions
  source: Source
  builds: Builds
  releases: Releases
  instances: Instances
  secrets: Secrets
  members: Members
  /** F6b Task 9: what the manifest asks of the people who sign in, and production's registered. */
  details: Details
  stream: ProjectStream
  /** The model on a session's key, which calls `onAnswer` with each answer paid for. */
  modelFor: (
    session: { key: string; baseUrl: string; model: string },
    onAnswer: (answered: Answered) => void,
  ) => Model
  projects: Projects
  trace: Trace
  now: () => Date
  /** Whether the draft's sign-in starts (FE-37): the IdP took the app's request. */
  signIn: SignIn
  /** The build's and the instance's waits (`WAITS`); a test shortens them. */
  waits?: { pollMs: number; buildMs: number; draftMs: number }
}

/** Decision 9: 40 moves a step. */
const MAX_MOVES = 40
/** Decision 7: the third failure of a kind asks. */
const TRIES = 3
/** F6b Decision 9: `build.failed`'s `machineDetail.code` for a detail UBC has not registered (S1: M1). */
const NOT_REGISTERED = 'SPEC_ATTRIBUTE_NOT_REGISTERED'
/** Rich's $2 a piece of work, on a clock of 240 minutes (Decision 9; M1 took both). */
const SESSION = { capUsd: 2, durationMinutes: 240 }
/** Decision 8: a failed build's telling lines are about 50 from the end (M4). */
const LOG_TAIL = 200
const OUTPUT_LINES = 50
/** Decision 14: spend lands a few seconds after a call. */
const COST_EVERY_MS = 5_000
/**
 * REVIEW FOCUS 5, ON A TIMER TOO (the whole-branch review's I3): a stream open but silent, a
 * socket that died without closing, would leave a step waiting on an event that never comes. So
 * while it waits, the build or the instance is read every 30 s, and a wait longer than any the
 * platform takes (M4: a build of 18 s; a deploy that cannot start answers in 91 s) is needs you,
 * waiting on Manifest.
 */
const WAITS = { pollMs: 30_000, buildMs: 15 * 60_000, draftMs: 5 * 60_000 }

const NOTHING_COMMITTED =
  'Nothing is committed yet in this round: write the pages as commits first, then answer done.'
const CONFLICT =
  'Someone else changed the app while we worked, and nothing of that commit was written. The files are as they are now: read what you need, and commit again on them.'
const STEP_WORDS = { build: 'Building it', draft: 'Putting it on the draft address' }
/** The agreement, as the app holds it (D6). */
const PLAN_FILE = 'docs/plan.md'

type Ending =
  | { kind: 'done' }
  | { kind: 'paused' }
  | { kind: 'stopped' }
  /** `code` names the problem behind it, for its support reference; null when it is none. */
  | {
      kind: 'needs'
      needs: Needs
      code: string | null
      /** FE-30: the platform's id for the request it refused, kept beside the reference. */
      requestId: string | null
    }
type Outcome = Ending | { kind: 'next' }

const STOPPED: Ending = { kind: 'stopped' }
const NEXT: Outcome = { kind: 'next' }
const needs = (
  what: Needs,
  code: string | null = null,
  requestId: string | null = null,
): Ending => ({
  kind: 'needs',
  needs: what,
  code,
  requestId,
})

/** What the round holds in memory for one conversation: its key and token never leave here. */
interface Live {
  conversation: Conversation
  projectId: string
  token: string
  run: Run
  session: { id: string; model: Model } | null
  /** Sessions ended from here: a restart's are ended again, by id, at the next Carry on. */
  ended: Set<string>
  stopped: boolean
  running: boolean
  watch: Watch | null
  refused: boolean
  /** Each build's and instance's outcome, as the stream or a re-read said it. */
  /** Each build's end, as the stream or a read said it; `code` the stream's alone (`machineDetail.code`). */
  builds: Map<string, { ok: boolean; reason: string | null; code: string | null }>
  instances: Map<string, boolean>
  wakers: Set<() => void>
  base: string
  paths: string[]
  packageJson: unknown
  files: { path: string; content: string }[]
  /** The sign-in specialist's proposal, until each of its paths is committed (the lead's view). */
  proposal: { changes: Change[]; summary: string } | null
  /** Every path of the specialist's last proposal is committed, or was already so. */
  settled: boolean
  plan: string
  pack: string | null
  sandbox: Sandbox | null
  /** The agent whose answer the gateway is sending: the trace's. */
  agent: string
  costAt: number
  /** How many of their words the view being answered showed. */
  shown: number
  /** The changes the commit in flight landed, if it did. */
  landed: Change[] | null
  /**
   * F4 Decision 9: the paths the lead knows as they are now: read at the current tree, or written
   * this round. Someone else's commit (the tree moved under us) forgets them all.
   */
  known: Set<string>
  /** F4: the agreed change, or the fix, as the lead's view carries it; read once a leg. */
  change: LeadView['change']
  fix: LeadView['fix']
  /**
   * FE-36: the model we were using when the platform withdrew the session. The next session
   * carries on by itself if it still lists that model, and asks them first if not (Rich).
   */
  renewing: string | null
}

const detail = (live: Live): RunDetail => live.run.detail as RunDetail

const codeOf = (error: unknown): string =>
  error instanceof PlatformRefusal ||
  error instanceof ModelError ||
  error instanceof Refused
    ? error.code
    : 'INTERNAL'

/**
 * THE PLATFORM'S PASSING GIT FAILURE, ON A READ (m19): `SOURCE_GIT_FAILED`'s remedy is the
 * platform's own, *"Retry once"*. The tree and a file are asked once more; a commit never (it has
 * its own dry run and Idempotency-Key). Failing again is the round's refusal, as before.
 */
function gitRetried(source: Source): Source {
  const once = async <T>(read: () => Promise<T>): Promise<T> => {
    try {
      return await read()
    } catch (error) {
      if (codeOf(error) !== 'SOURCE_GIT_FAILED') throw error
      return read()
    }
  }
  return {
    ...source,
    tree: (token, projectId) => once(() => source.tree(token, projectId)),
    file: (token, projectId, path, ref) =>
      once(() => source.file(token, projectId, path, ref)),
  }
}

export function createRounds(deps: RoundDeps): Rounds {
  const { store, hub, work, sessions, builds, releases, instances } = deps
  const source = gitRetried(deps.source)
  const waits = deps.waits ?? WAITS
  const lives = new Map<string, Live>()

  const current = (live: Live) =>
    store.getConversation(live.conversation.id, live.conversation.personId) ??
    live.conversation
  const publish = (live: Live) => publishState(hub, store, current(live))
  const save = (live: Live) => {
    store.saveRun(live.run)
    publish(live)
  }
  const say = (live: Live, from: 'person' | 'we', said: RoundSaid) =>
    store.addMessage(live.conversation.id, from, said)
  const record = (
    live: Live,
    operation: string,
    named: string | null,
    code: string | null,
  ) => deps.trace.record(live.run.id, { kind: 'platform', operation, code, named })

  /** A platform call, traced by what it named, and its refusal's code. */
  async function call<T>(
    live: Live,
    operation: string,
    named: string | null,
    made: () => Promise<T>,
  ): Promise<T> {
    try {
      const value = await made()
      record(live, operation, named, null)
      return value
    } catch (error) {
      record(live, operation, named, codeOf(error))
      throw error
    }
  }

  const wake = (live: Live) => {
    for (const waker of [...live.wakers]) waker()
  }

  /**
   * Until the round's signal, a Stop, or the token refused; and, given a ceiling, the build or
   * the instance read again on a timer, and `late` once the ceiling passes (`WAITS`).
   */
  function waitFor<T>(live: Live, check: () => T | undefined, ceilingMs?: number) {
    return new Promise<T | 'stopped' | 'refused' | 'late'>((resolve) => {
      let late = false
      let poll: ReturnType<typeof setInterval> | undefined
      let ceiling: ReturnType<typeof setTimeout> | undefined
      const waker = () => {
        const value = live.stopped
          ? 'stopped'
          : live.refused
            ? 'refused'
            : (check() ?? (late ? 'late' : undefined))
        if (value === undefined) return
        live.wakers.delete(waker)
        clearInterval(poll)
        clearTimeout(ceiling)
        resolve(value)
      }
      live.wakers.add(waker)
      if (ceilingMs !== undefined) {
        poll = setInterval(() => void reread(live).catch(() => undefined), waits.pollMs)
        ceiling = setTimeout(() => {
          late = true
          waker()
        }, ceilingMs)
      }
      waker()
    })
  }

  /** Decision 15: the project's stream, on our server, while a round works. */
  function openWatch(live: Live) {
    if (live.watch !== null) return
    live.refused = false
    live.watch = deps.stream.watch(live.token, live.projectId, {
      event(event) {
        const said = (event.detail ?? {}) as Record<string, unknown>
        if (
          (event.type === 'build.succeeded' || event.type === 'build.failed') &&
          typeof said['buildId'] === 'string'
        )
          live.builds.set(said['buildId'], {
            ok: event.type === 'build.succeeded',
            reason: typeof said['reason'] === 'string' ? said['reason'] : null,
            code: typeof said['code'] === 'string' ? said['code'] : null,
          })
        if (
          (event.type === 'instance.healthy' || event.type === 'instance.failed') &&
          typeof said['instanceId'] === 'string'
        )
          live.instances.set(said['instanceId'], event.type === 'instance.healthy')
        wake(live)
      },
      // FE-7: the replay is only 50. Read again what it may have missed.
      reconnected: () => void reread(live).catch(() => undefined),
      refused() {
        live.refused = true
        wake(live)
      },
    })
  }

  function closeWatch(live: Live) {
    live.watch?.close()
    live.watch = null
  }

  /** The stream's first replay, before a build is paid for: its events come after. */
  async function streamReady(live: Live): Promise<'ok' | 'refused' | 'silent'> {
    const watch = live.watch
    if (watch === null) return 'silent'
    let timer: ReturnType<typeof setTimeout> | undefined
    const silent = new Promise<'silent'>((resolve) => {
      timer = setTimeout(() => resolve('silent'), PLATFORM_TIMEOUT_MS)
    })
    try {
      return await Promise.race([
        watch.ready.then(
          () => 'ok' as const,
          () => 'refused' as const,
        ),
        silent,
      ])
    } finally {
      clearTimeout(timer)
    }
  }

  /** Review Focus 3 and 5: the build and the instance, as the platform says they are now. */
  async function reread(live: Live) {
    const d = detail(live)
    const buildId = d.buildId
    if (live.run.step === 'build' && buildId !== null) {
      const build = await call(live, 'getBuild', buildId, () =>
        builds.get(live.token, buildId),
      )
      // Never over the stream's own answer, which alone carries a code (the review's M1).
      if (
        (build.status === 'succeeded' || build.status === 'failed') &&
        !live.builds.has(buildId)
      )
        live.builds.set(buildId, {
          ok: build.status === 'succeeded',
          reason: null,
          code: null,
        })
    }
    const instanceId = d.instanceId
    if (live.run.step === 'draft' && instanceId !== null && live.sandbox !== null) {
      const environmentId = live.sandbox.environmentId
      const listed = await call(live, 'listInstances', 'sandbox', () =>
        instances.list(live.token, environmentId),
      )
      const mine = listed.find((instance) => instance.id === instanceId)
      if (mine?.state === 'healthy' || mine?.state === 'failed')
        live.instances.set(instanceId, mine.state === 'healthy')
    }
    wake(live)
  }

  async function servingNow(live: Live): Promise<boolean> {
    if (live.sandbox === null) return false
    const environmentId = live.sandbox.environmentId
    const listed = await call(live, 'listInstances', 'sandbox', () =>
      instances.list(live.token, environmentId),
    )
    return listed.some((instance) => instance.serving)
  }

  function reference(live: Live, code: string, requestId: string | null = null): string {
    return problem(store, {
      code,
      operation: 'conversation round',
      status: null,
      personId: live.conversation.personId,
      conversationId: live.conversation.id,
      platformRequestId: requestId,
    })
  }

  /** Decision 14: the conversation's spend and the month's, at most every 5 seconds. */
  async function refreshCost(live: Live, force = false) {
    const at = deps.now().getTime()
    if (!force && at - live.costAt < COST_EVERY_MS) return
    live.costAt = at
    try {
      const [listed, budget] = await Promise.all([
        sessions.list(live.token, live.projectId),
        sessions.budget(live.token),
      ])
      const ours = new Set(
        store.listRuns(live.conversation.id).flatMap((r) => r.sessionIds),
      )
      const spent = listed.filter((session) => ours.has(session.id))
      detail(live).cost = {
        conversationUsd: spent.some((session) => session.spentUsd === null)
          ? null
          : spent.reduce((sum, session) => sum + (session.spentUsd ?? 0), 0),
        monthLeftUsd: budget.remainingUsd,
        resetsAt: budget.resetsAt,
      }
      save(live)
    } catch {
      // The cost line keeps what it last knew.
    }
  }

  /** Each answer paid for: the trace's, Decision 4's one line, and the cost. */
  function heard(live: Live, answer: Answered) {
    deps.trace.record(live.run.id, {
      kind: 'model',
      agent: live.agent,
      asked: live.run.model ?? '',
      answered: answer.model,
      fallback: answer.fallback,
      usage: answer.usage,
      received: answer.received,
    })
    const d = detail(live)
    if (answer.fallback && !d.fallbackSaid) {
      d.fallbackSaid = true
      say(live, 'we', { kind: 'fallback', round: live.run.round })
      save(live)
    }
    void refreshCost(live)
  }

  /**
   * AN ANSWER CUT SHORT (F5 Decision 14): the trace says how much came and why it ended, never
   * what; the gateway bills what it streamed (S1: M2), so the cost is read again.
   */
  function stalled(live: Live, error: ModelError) {
    if (error.received === null) return
    deps.trace.record(live.run.id, {
      kind: 'model',
      agent: live.agent,
      asked: live.run.model ?? '',
      answered: null,
      fallback: null,
      usage: null,
      received: error.received,
      stalled: error.code === 'MODEL_TOO_LONG' ? 'ceiling' : 'quiet',
    })
    void refreshCost(live, true)
  }

  async function endSession(live: Live) {
    const session = live.session
    if (session === null) return
    live.session = null
    live.ended.add(session.id)
    await call(live, 'endAgentSession', session.id, () =>
      sessions.end(live.token, session.id),
    ).catch(() => undefined)
  }

  /** The files at main, `package.json` as it is there, and the next commit's base. */
  async function readTree(live: Live) {
    const tree = await source.tree(live.token, live.projectId)
    record(live, 'getTree', tree.commitSha, null)
    // Someone else's commit since: nothing the lead read is as it is now (F4 Decision 9).
    if (tree.commitSha !== live.base) live.known.clear()
    live.base = tree.commitSha
    live.paths = tree.paths.map((entry) => entry.path)
    const packageJson = await source.file(
      live.token,
      live.projectId,
      'package.json',
      live.base,
    )
    live.packageJson = 'content' in packageJson ? parsed(packageJson.content) : null
  }

  /** A session, the tree, the pack, the sandbox and the stream: what every leg starts from. */
  async function prepare(live: Live): Promise<Ending | null> {
    const d = detail(live)
    const project = intakeOf(store, live.conversation.id).project
    if (project === null)
      return needs({ kind: 'refused', code: 'PROJECT_MISSING' }, 'PROJECT_MISSING')
    if (live.session === null) {
      // A restart's sessions, or the checkpoint's spent one: their keys are gone. Ended by id.
      for (const id of live.run.sessionIds)
        if (!live.ended.has(id)) {
          live.ended.add(id)
          await call(live, 'endAgentSession', id, () =>
            sessions.end(live.token, id),
          ).catch(() => undefined)
        }
      const budget = await sessions.budget(live.token)
      if (budget.remainingUsd !== null && budget.remainingUsd <= 0)
        return needs(
          { kind: 'month', resetsAt: budget.resetsAt },
          'MODEL_BUDGET_EXHAUSTED',
        )
      const started = await sessions.start(
        live.token,
        live.projectId,
        current(live).title.slice(0, 64),
        SESSION,
      )
      record(live, 'startAgentSession', started.sessionId, null)
      live.run.sessionIds = [...live.run.sessionIds, started.sessionId]
      const name = mostCapable(started.models)
      if (name === undefined) {
        live.ended.add(started.sessionId)
        await call(live, 'endAgentSession', started.sessionId, () =>
          sessions.end(live.token, started.sessionId),
        ).catch(() => undefined)
        return needs(
          { kind: 'refused', code: 'MODEL_NOT_AVAILABLE' },
          'MODEL_NOT_AVAILABLE',
        )
      }
      if (live.renewing !== null) {
        if (name !== live.renewing) {
          // The model we were using is gone (Rich: stop and ask first). Nothing was spent on it.
          live.ended.add(started.sessionId)
          await call(live, 'endAgentSession', started.sessionId, () =>
            sessions.end(live.token, started.sessionId),
          ).catch(() => undefined)
          return needs({ kind: 'withdrawn' })
        }
        say(live, 'we', { kind: 'carried', round: live.run.round })
      }
      live.run.model = name
      // RICH, 2026-09-28: a confidential app's sessions list only the on-campus model (the
      // platform's classification floor). We carry on with it, and say so once in the conversation.
      if (
        name === 'default-chat-onprem' &&
        !store
          .listMessages(live.conversation.id)
          .some((m) => (m.body as { kind?: string }).kind === 'campus')
      )
        say(live, 'we', { kind: 'campus', round: live.run.round })
      const model = deps.modelFor(
        { key: started.key, baseUrl: started.baseUrl, model: name },
        (answer) => heard(live, answer),
      )
      live.session = {
        id: started.sessionId,
        model: {
          complete(agent, schema, messages, check) {
            live.agent = agent
            return model
              .complete(agent, schema, messages, check)
              .catch((error: unknown) => {
                if (
                  error instanceof ModelError &&
                  (error.code === 'MODEL_STALLED' || error.code === 'MODEL_TOO_LONG')
                )
                  stalled(live, error)
                throw error
              })
          },
        },
      }
      save(live)
    }
    // F6b (the review's I1): whether this run began after the app first reached its students, read
    // once a run. Unread, nothing is said of the kind of change.
    if (d.launched === undefined) {
      const launched = await call(live, 'getProject', null, () =>
        deps.projects.launched(live.token, live.projectId),
      ).then(
        (yes) => yes,
        () => undefined,
      )
      if (launched !== undefined) d.launched = launched
    }
    await readTree(live)
    if (live.pack === null)
      live.pack = await deps.projects.knowledgePack(live.token, project.blueprint)
    // F4 Decision 8: the agreement as the tree holds it, for every round; the store's plan
    // only when the file cannot be read.
    const latest = planOf(store, live.conversation.id)
    const committed = await source.file(live.token, live.projectId, PLAN_FILE, live.base)
    live.plan =
      'content' in committed
        ? committed.content
        : latest === null
          ? ''
          : planMarkdown(project.name, latest.plan as Plan, agreedAnswers(live))
    await pieceFor(live, latest?.plan as Plan | undefined)
    if (live.sandbox === null)
      live.sandbox = await releases.sandbox(live.token, live.projectId)
    d.draft ??= {
      address: live.sandbox.url,
      serving: await servingNow(live),
      lastAttempt: null,
    }
    openWatch(live)
    void refreshCost(live, true)
    save(live)
    return null
  }

  /**
   * F4 DECISION 9: WHAT THIS ROUND IS FOR, IN THE LEAD'S VIEW: the agreed change (their words, and
   * the plan's parts it changed, as they now read), or the fix (the incident where it happened,
   * trying-out's or the live address's, as our token may read it). A confidential app's incident refused to our token is said as that, and never
   * read another way: the person's own reading of it never reaches us (S1).
   */
  async function pieceFor(live: Live, plan: Plan | undefined) {
    const piece = pieceOf(store, live.conversation.id)
    if (piece.kind === 'change')
      live.change = {
        asked: piece.asked,
        parts: (plan?.changed ?? []).map((row) => `${HEADINGS[row]}: ${plan![row]}`),
      }
    // F5 Task 7: a dry run's fix carries what it saw, and left no incident to read.
    if (piece.kind === 'fix' && piece.dryRun !== null && live.fix === null) {
      const { signInStatus, attributesReleased, attributesAsked } = piece.dryRun
      live.fix = {
        environment: 'production',
        incident: null,
        unread: null,
        dryRun: { signInStatus, attributesReleased, attributesAsked },
        outage: null,
      }
    }
    // F6 Decision 9: the live address stopped answering. Nothing recorded why (FE-4), and its
    // output is never ours to read (§14): the lead looks in the code.
    if (piece.kind === 'fix' && piece.outage !== null && live.fix === null)
      live.fix = {
        environment: 'production',
        incident: null,
        unread: null,
        dryRun: null,
        outage: piece.outage,
      }
    if (piece.kind === 'fix' && piece.incidentId !== null && live.fix === null) {
      const incidentId = piece.incidentId
      // Where it did not start: F4's fixes were all the trying-out address's (F5 Decision 13).
      const environment = piece.environment ?? 'staging'
      const read = await call(live, 'listIncidents', environment, () =>
        instances.incident(live.token, live.projectId, environment, incidentId),
      )
      live.fix =
        read === 'confidential'
          ? {
              environment,
              incident: null,
              unread: 'confidential',
              dryRun: null,
              outage: null,
            }
          : read === undefined
            ? {
                environment,
                incident: null,
                unread: 'missing',
                dryRun: null,
                outage: null,
              }
            : {
                dryRun: null,
                outage: null,
                environment,
                incident: {
                  exitReason: read.exitReason,
                  failedCheck: read.failedCheck,
                  logTail: read.logTail,
                  prompt: read.prompt,
                  diffSinceHealthy: read.diffSinceHealthy,
                },
                unread: null,
              }
    }
  }

  function agreedAnswers(live: Live): Record<string, string> {
    let answers: Record<string, string> = {}
    for (const { body } of store.listMessages(live.conversation.id)) {
      const said = body as { kind: string; answers?: Record<string, string> }
      if (said.kind === 'agreed' && said.answers !== undefined) answers = said.answers
    }
    return answers
  }

  /** Decision 13: whose emails may be staff. Their description, answers, messages. */
  function theirWords(live: Live): string[] {
    const words = [
      current(live).description,
      ...Object.values(intakeOf(store, live.conversation.id).answers),
    ]
    for (const { from, body } of store.listMessages(live.conversation.id)) {
      if (from !== 'person') continue
      const said = body as {
        kind: string
        text?: unknown
        answers?: Record<string, string>
      }
      if (typeof said.text === 'string') words.push(said.text)
      if (said.kind === 'agreed' && said.answers !== undefined)
        words.push(...Object.values(said.answers))
    }
    return words
  }

  /** The source the lead commits through: each createCommit traced by what it was made on. */
  function tracedSource(live: Live): Source {
    return {
      ...source,
      // Each file a read asks for, by its path and never its content (sitting 6: a lead that read in a
      // loop until the move limit, and the trace could not say what it read).
      async file(token, projectId, path, ref) {
        let code: string | null = null
        try {
          return await source.file(token, projectId, path, ref)
        } catch (error) {
          code = codeOf(error)
          throw error
        } finally {
          record(live, 'getFile', path, code)
        }
      },
      async commit(token, projectId, body, sent = []) {
        const calls: Sent[] = []
        let code: string | null = null
        try {
          const made = await source.commit(token, projectId, body, calls)
          // F6b Decision 8: the round's union, said with the move's own save.
          const d = detail(live)
          d.sensitive = unionOf(d.sensitive ?? [], made.sensitive)
          return made
        } catch (error) {
          code = codeOf(error)
          throw error
        } finally {
          calls.forEach((made, i) =>
            record(
              live,
              'createCommit',
              `${made.dryRun ? 'dry run on' : 'on'} ${made.baseCommit}`,
              i === calls.length - 1 ? code : null,
            ),
          )
          sent.push(...calls)
        }
      },
    }
  }

  function roundContext(live: Live): RoundContext {
    const d = detail(live)
    return {
      token: live.token,
      projectId: live.projectId,
      personId: live.conversation.personId,
      source: tracedSource(live),
      members: deps.members,
      guards: guards(),
      base: { get: () => live.base, set: (sha) => void (live.base = sha) },
      paths: () => live.paths,
      packageJson: () => live.packageJson,
      wrote(changes) {
        settle(live, changes)
        for (const change of changes) {
          live.files = live.files.filter((file) => file.path !== change.path)
          if (change.op === 'delete') {
            live.paths = live.paths.filter((path) => path !== change.path)
            continue
          }
          if (!live.paths.includes(change.path)) live.paths = [...live.paths, change.path]
          if (change.path === 'package.json') live.packageJson = parsed(change.content)
        }
        for (const change of changes) live.known.add(change.path)
        d.landed = true
        live.landed = changes
      },
      keep(files) {
        const paths = new Set(files.map((file) => file.path))
        live.files = [...files, ...live.files.filter((file) => !paths.has(file.path))]
        for (const path of paths) live.known.add(path)
      },
      known(change) {
        if (live.known.has(change.path)) return true
        // The specialist read the file for its proposal: committed exactly as proposed, it is known.
        return (live.proposal?.changes ?? []).some(
          (proposed) =>
            proposed.path === change.path &&
            proposed.op === change.op &&
            (proposed.op === 'delete' ||
              (change.op === 'write' && proposed.content === change.content)),
        )
      },
      question(ask, fallback, secret) {
        const id = randomUUID()
        store.addQuestion({
          id,
          runId: live.run.id,
          conversationId: live.conversation.id,
          ask,
          fallback: secret === null ? fallback : null,
          secret,
        })
        publish(live)
        return { id, answeredWith: secret === null ? fallback : null }
      },
      askCwl: (brief) => askAgent(cwl, live.session!.model, brief),
      propose(proposal) {
        live.proposal = proposal
        live.settled = false
      },
      unchanged(changes) {
        settle(live, changes)
      },
      theirWords: () => theirWords(live),
      cannot(what) {
        d.cannot = what
      },
      account(sentence) {
        d.account = sentence
      },
    }
  }

  /**
   * THE LEAD'S MOVES, AS THIS ROUND HOLDS THEM: `done` is sent back until a commit has landed
   * (Decision 5), and each landed commit's account goes with its files into the exact changes.
   * What changed is `done`'s one account (Rich).
   */
  /** The proposal's paths a commit wrote, or found already so, leave it; none left is settled. */
  function settle(live: Live, changes: Change[]) {
    if (live.proposal === null) return
    const done = new Set(changes.map((change) => change.path))
    const left = live.proposal.changes.filter((change) => !done.has(change.path))
    live.proposal = left.length === 0 ? null : { ...live.proposal, changes: left }
    if (live.proposal === null) live.settled = true
  }

  function movesFor(live: Live): ToolDef<RoundContext, never>[] {
    const d = detail(live)
    return leadMoves.map((tool) => {
      if (tool.kind === 'done')
        return {
          ...tool,
          guard: (input: never, context: RoundContext) =>
            d.landed ? (tool.guard?.(input, context) ?? null) : NOTHING_COMMITTED,
        }
      if (tool.kind === 'commit')
        return {
          ...tool,
          async run(input: never, context: RoundContext) {
            // MOMENT 6'S LINE NOW (the whole-branch review's I1): the lead's own, for the commit
            // it is making, guarded with it; done's replaces it.
            d.line = (input as { line: string }).line
            save(live)
            live.landed = null
            const result = await tool.run(input, context)
            const changes = live.landed as Change[] | null
            if (changes !== null) {
              // Each commit's own account, then its files, in order (Rich: behind the
              // disclosure, next to the files).
              const account = (input as { account: string }).account.trim()
              d.steps.pages = {
                note: null,
                changed: null,
                exact: [
                  ...(d.steps.pages?.exact ?? []),
                  account,
                  ...changes.map((c) => c.path),
                ],
              }
            }
            return result
          },
        }
      return tool
    })
  }

  function view(live: Live, state: { last: Run['last'] }): LeadView {
    const d = detail(live)
    const words = heardIn(store, live.conversation.id, live.run.round)
    live.shown = words.length
    return {
      plan: live.plan,
      pack: live.pack ?? '',
      paths: live.paths,
      files: live.files,
      // The capable model sees more at once (Rich, sitting 6); any other keeps Decision 3's cap.
      cap: live.run.model === 'default-chat-large' ? CAPABLE_VIEW_CAP : VIEW_CAP,
      step: 'pages',
      tries: {
        build: live.run.tries['build'] ?? 0,
        draft: live.run.tries['draft'] ?? 0,
        conflict: live.run.tries['conflict'] ?? 0,
      },
      last: state.last,
      messages: words.slice(d.heard).map((word) => word.text),
      failures: d.failures,
      proposal: live.proposal,
      settled: live.settled,
      change: live.change,
      fix: live.fix,
      asked: store.listQuestions(live.run.id).map((q) => ({
        ask: q.ask,
        wentWith:
          q.secret !== null
            ? q.answered
              ? 'set where the app reads it'
              : null
            : q.answer,
      })),
    }
  }

  /** WRITING THE PAGES: the lead's moves, until done after a landed commit. */
  async function pages(live: Live): Promise<Outcome> {
    const d = detail(live)
    const tools = movesFor(live)
    for (;;) {
      let stop: Stop
      try {
        stop = await runMoves({
          agent: lead,
          tools,
          context: roundContext(live),
          view: (state) => view(live, state),
          state: {
            runId: live.run.id,
            step: 'pages',
            moves: live.run.moves,
            last: live.run.last,
            sameRefusal: live.run.sameRefusal,
          },
          model: live.session!.model,
          maxMoves: MAX_MOVES,
          stopped: () => live.stopped,
          save(state) {
            live.run.moves = state.moves
            live.run.last = state.last
            live.run.sameRefusal = state.sameRefusal
            d.heard = live.shown
            save(live)
          },
          trace: deps.trace,
          stopWhen: (state) =>
            (state.sameRefusal?.count ?? 0) >= TRIES
              ? { kind: 'limit', limit: 'refusals' }
              : null,
        })
      } catch (error) {
        if (!(error instanceof PlatformRefusal) || error.code !== 'SOURCE_CONFLICT')
          throw error
        // Decision 7: someone else committed. Read the tree again, and the lead commits on it.
        live.run.tries['conflict'] = (live.run.tries['conflict'] ?? 0) + 1
        if (live.run.tries['conflict'] >= TRIES)
          return needs({ kind: 'conflict' }, 'SOURCE_CONFLICT')
        await readTree(live)
        live.run.last = { kind: 'commit', report: CONFLICT }
        live.run.sameRefusal = null
        save(live)
        continue
      }
      switch (stop.kind) {
        case 'done':
          d.line = stop.line
          d.failures = []
          await noteTheirWords(live)
          return next(live, 'holds')
        case 'paused':
          return { kind: 'paused' }
        case 'stopped':
          return STOPPED
        case 'limit':
          return needs({ kind: 'moves' }, 'ROUND_MOVES')
        case 'refused':
          // FE-34: a request the provider refused (422) would be refused again: the round's refusal.
          if (
            stop.error instanceof ModelError &&
            stop.error.code === 'MODEL_ANSWER_INVALID' &&
            stop.error.status !== 422
          ) {
            // Not one move of the five, twice: it costs a move, and it is told.
            live.run.moves += 1
            live.run.last = {
              kind: 'answer',
              report:
                'Your answer was not one of the moves. Answer with exactly one move.',
            }
            save(live)
            if (live.run.moves >= MAX_MOVES)
              return needs({ kind: 'moves' }, 'ROUND_MOVES')
            continue
          }
          throw stop.error
      }
    }
  }

  /**
   * F4 DECISION 10: THEIR WORDS WHILE IT WORKED JOIN THE AGREEMENT. After the lead's done, each
   * message of theirs it read this round, and not yet noted, is added to docs/plan.md's Changes in
   * their own words, in one commit of ours (its dry run first) with no model, before the build: so
   * the file stays the agreement, and the build holds it. A file that no longer reads back as ours
   * is left as it is.
   */
  async function noteTheirWords(live: Live) {
    const d = detail(live)
    const read = heardIn(store, live.conversation.id, live.run.round)
      .slice(0, d.heard)
      .filter((word) => word.kind === 'message')
    const noted = d.noted ?? 0
    const fresh = read.slice(noted).map((word) => word.text)
    if (fresh.length === 0) return
    const project = intakeOf(store, live.conversation.id).project
    for (let attempt = 1; ; attempt++) {
      const file = await source.file(live.token, live.projectId, PLAN_FILE, live.base)
      const plan = 'content' in file ? readPlanMarkdown(file.content) : null
      if (plan === null) break
      const at = dayOf(deps.now())
      const markdown = planMarkdown(
        project?.name ?? plan.title,
        plan.plan,
        plan.answers,
        [...plan.changes, ...fresh.map((words) => ({ at, words }))],
      )
      try {
        const made = await tracedSource(live).commit(live.token, live.projectId, {
          baseCommit: live.base,
          message: 'What they asked for while we worked',
          changes: [{ op: 'write', path: PLAN_FILE, content: markdown }],
        })
        live.base = made.commitSha
        live.plan = markdown
        live.known.delete(PLAN_FILE)
        break
      } catch (error) {
        // Someone moved main: read it again, and add their words once more on it.
        if (
          !(error instanceof PlatformRefusal) ||
          error.code !== 'SOURCE_CONFLICT' ||
          attempt > 1
        )
          throw error
        await readTree(live)
      }
    }
    d.noted = read.length
    save(live)
  }

  function next(live: Live, step: BuildStep): Outcome {
    live.run.step = step
    save(live)
    return NEXT
  }

  /**
   * Back to the pages: a failure to fix (`fix`), or their words to act on. A new try, or their
   * words, starts the step's 40 moves again; a bounce off our own check (`keepMoves`) does not,
   * so a lead that keeps failing it is bounded (Review Focus 2).
   */
  function backToPages(
    live: Live,
    last: Run['last'],
    fix: boolean,
    keepMoves = false,
  ): Outcome {
    const d = detail(live)
    live.run.step = 'pages'
    if (!keepMoves) live.run.moves = 0
    live.run.sameRefusal = null
    live.run.last = last
    if (fix) d.landed = false
    d.buildId = null
    d.releaseId = null
    d.instanceId = null
    save(live)
    return NEXT
  }

  /** CHECKING IT HOLDS TOGETHER: every import the server code makes exists (Decision 6). */
  async function holds(live: Live): Promise<Outcome> {
    const d = detail(live)
    const code = live.paths.filter(
      (path) =>
        /\.(m|c)?js$/.test(path) &&
        !path.startsWith('public/') &&
        !path.startsWith('node_modules/'),
    )
    const files: { path: string; content: string }[] = []
    for (const path of code) {
      const file = await source.file(live.token, live.projectId, path, live.base)
      if ('content' in file) files.push({ path, content: file.content })
    }
    if (live.stopped) return STOPPED
    const missing = importsHold(files, live.paths, live.packageJson)
    d.steps.holds = {
      note: null,
      changed: null,
      exact: missing.map((m) => `${m.path}: ${m.missing}`),
    }
    if (missing.length === 0) {
      d.buildId = null
      return next(live, 'build')
    }
    const report = [
      'Before we build, everything the server code loads must exist. These do not:',
      ...missing.map((m) => `- ${m.path} loads ${m.missing}`),
      "A relative import names its file exactly, with its extension; a package must be one package.json's dependencies already has.",
    ].join('\n')
    return backToPages(live, { kind: 'holds', report }, true, true)
  }

  /** What went wrong, in one sentence, from the platform's own words (Decision 8). */
  async function explain(live: Live, what: 'build' | 'draft', words: string[]) {
    try {
      return await askAgent(explaining, live.session!.model, { what, words })
    } catch (error) {
      if (error instanceof ModelError) return null
      throw error
    }
  }

  /** A failed build or draft: explained, counted, and either tried again or asked about. */
  async function failed(
    live: Live,
    what: 'build' | 'draft',
    words: string[],
    forLead: string[],
  ): Promise<Outcome> {
    const d = detail(live)
    live.run.tries[what] = (live.run.tries[what] ?? 0) + 1
    const explained = await explain(live, what, words)
    d.steps[what] = { note: explained?.note ?? null, changed: null, exact: words }
    if (explained !== null)
      say(live, 'we', {
        kind: 'explained',
        round: live.run.round,
        step: what,
        ...explained,
      })
    const told = explained === null ? '' : ` We told them: ${explained.sentence}`
    d.tried = [
      ...d.tried,
      {
        what,
        text: `${STEP_WORDS[what]} failed.${told} The platform said: ${words.slice(-5).join(' / ')}`,
      },
    ]
    save(live)
    if (live.stopped) return STOPPED
    if ((live.run.tries[what] ?? 0) >= TRIES)
      return needs(
        { kind: 'tries', step: what, servingBefore: await servingNow(live) },
        what === 'build' ? 'BUILD_FAILED' : 'DRAFT_FAILED',
      )
    const report = [
      `${STEP_WORDS[what]} failed. Fix it with a commit, then answer done.`,
      ...(explained === null ? [] : [`What we told the person: ${explained.sentence}`]),
      ...forLead,
      "The platform's own words:",
      ...words,
    ].join('\n')
    return backToPages(live, { kind: what, report }, true)
  }

  /**
   * F6b DECISION 9: WHAT THE BUILT MANIFEST ASKS THAT PRODUCTION HAS NOT REGISTERED, from the
   * platform's parse of it (`getSpec`) and the registration (`getLaunchRecords`), never from the
   * failure's free-text reason. `[]` when the manifest read is not the one built (the build's own
   * commit, never the round's base, which a resume reads from the tree: the review's M3), or a read
   * fails: the page says a new detail generically.
   */
  async function missingDetails(live: Live, buildId: string): Promise<string[]> {
    try {
      const [built, asked, registered] = await Promise.all([
        call(live, 'getBuild', buildId, () => builds.get(live.token, buildId)),
        call(live, 'getSpec', null, () => deps.details.asked(live.token, live.projectId)),
        call(live, 'getLaunchRecords', 'production', () =>
          deps.details.registered(live.token, live.projectId),
        ),
      ])
      if (asked.commitSha !== built.commitSha || registered === null) return []
      return asked.attributes.filter((attribute) => !registered.includes(attribute))
    } catch {
      return []
    }
  }

  /** BUILDING IT: build.succeeded for the build startBuild answered, by its id (Decision 5). */
  async function build(live: Live): Promise<Outcome> {
    const d = detail(live)
    if (d.buildId === null) {
      const ready = await streamReady(live)
      if (ready === 'refused') return needs({ kind: 'token' })
      if (ready === 'silent')
        return needs({ kind: 'unreachable', what: 'platform' }, 'PLATFORM_UNAVAILABLE')
      const base = live.base
      const started = await call(live, 'startBuild', base, () =>
        builds.start(live.token, live.projectId, base),
      )
      d.buildId = started.id
      save(live)
    } else {
      // Resumed: read the build it started, and never build that commit twice (Review Focus 3).
      await reread(live)
    }
    if (live.stopped) return STOPPED
    const buildId = d.buildId
    const outcome = await waitFor(live, () => live.builds.get(buildId), waits.buildMs)
    if (outcome === 'stopped') return STOPPED
    if (outcome === 'refused') return needs({ kind: 'token' })
    if (outcome === 'late')
      return needs({ kind: 'unreachable', what: 'platform' }, 'ROUND_BUILD_WAIT')
    if (outcome.ok) {
      d.steps.build = { note: null, changed: null, exact: null }
      d.releaseId = null
      d.instanceId = null
      return next(live, 'draft')
    }
    // F6b Decision 9: a detail UBC has not registered fails every build: stop, and never retry.
    // The failed build is forgotten (the review's M2): carried on, or carried on after a Stop, the
    // round builds anew (UBC may have agreed meanwhile), never reads this one again as a try.
    // A failure only read, never heard (no code: the review's M1), is the new detail too when the
    // built manifest asks one production has not registered: the platform fails every such build.
    const details =
      outcome.code === NOT_REGISTERED || outcome.code === null
        ? await missingDetails(live, buildId)
        : []
    if (outcome.code === NOT_REGISTERED || details.length > 0) {
      d.buildId = null
      // An earlier try's note is not this stop's (minors m100): the card says what this is.
      d.steps.build = { note: null, changed: null, exact: null }
      return needs({ kind: 'detail', details })
    }
    const log = await call(live, 'getBuildLog', buildId, () =>
      builds.log(live.token, buildId, LOG_TAIL),
    )
    const read = await call(live, 'getBuild', buildId, () =>
      builds.get(live.token, buildId),
    )
    const words = [
      ...log,
      ...(read.error === null ? [] : [read.error]),
      ...(outcome.reason === null ? [] : [outcome.reason]),
    ]
    return failed(live, 'build', words, [])
  }

  /** PUTTING IT ON THE DRAFT ADDRESS: the sandbox's instance, healthy (Decision 5). */
  async function draft(live: Live): Promise<Outcome> {
    const d = detail(live)
    const sandbox = live.sandbox!
    const buildId = d.buildId!
    if (d.releaseId === null) {
      const summary = (d.account ?? d.line ?? 'The pages we wrote').slice(0, 500)
      const release = await call(live, 'createRelease', buildId, () =>
        releases.create(live.token, live.projectId, buildId, summary),
      )
      d.releaseId = release.id
      save(live)
      if (live.stopped) return STOPPED
    }
    const releaseId = d.releaseId
    if (d.instanceId === null) {
      const instance = await call(live, 'deploy', 'sandbox', () =>
        releases.deploy(live.token, live.projectId, releaseId),
      )
      d.instanceId = instance.id
      if (instance.state === 'healthy' || instance.state === 'failed')
        live.instances.set(instance.id, instance.state === 'healthy')
      save(live)
      // Review Focus 4: a Stop pressed while the deploy was in flight wins when it answers.
      if (live.stopped) return STOPPED
    } else await reread(live)
    const instanceId = d.instanceId
    const outcome = await waitFor(
      live,
      () => live.instances.get(instanceId),
      waits.draftMs,
    )
    if (outcome === 'stopped') return STOPPED
    if (outcome === 'refused') return needs({ kind: 'token' })
    if (outcome === 'late')
      return needs({ kind: 'unreachable', what: 'platform' }, 'ROUND_DRAFT_WAIT')
    if (outcome) {
      d.draft = { address: sandbox.url, serving: true, lastAttempt: 'healthy' }
      d.steps.draft = { note: null, changed: null, exact: null }
      return next(live, 'answers')
    }
    return draftFailed(live)
  }

  async function draftFailed(live: Live): Promise<Outcome> {
    const d = detail(live)
    const sandbox = live.sandbox!
    const incidents = await call(live, 'listIncidents', 'sandbox', () =>
      instances.incidents(live.token, sandbox.environmentId),
    )
    const incident = incidents.find((i) => i.instanceId === d.instanceId)
    const words =
      incident === undefined
        ? ['The app was put on the draft address, and did not start serving.']
        : [incident.exitReason, incident.failedCheck, incident.logTail]
    d.draft = {
      address: sandbox.url,
      serving: await servingNow(live),
      lastAttempt: 'failed',
    }
    const forLead =
      incident === undefined
        ? []
        : [
            `What the platform wrote for an agent to work from: ${incident.prompt}`,
            `What changed since it last started: ${incident.diffSinceHealthy}`,
          ]
    return failed(live, 'draft', words, forLead)
  }

  /** CHECKING IT ANSWERS: the sandbox's instance serving, and what it printed read (FE-24). */
  async function answers(live: Live): Promise<Outcome> {
    const d = detail(live)
    const sandbox = live.sandbox!
    const instanceId = d.instanceId!
    const listed = await call(live, 'listInstances', 'sandbox', () =>
      instances.list(live.token, sandbox.environmentId),
    )
    if (live.stopped) return STOPPED
    const mine = listed.find((instance) => instance.id === instanceId)
    if (mine === undefined || !mine.serving || mine.state !== 'healthy')
      return draftFailed(live)
    const output = await call(live, 'getInstanceOutput', instanceId, () =>
      instances.output(live.token, live.projectId, instanceId, OUTPUT_LINES),
    )
    if (live.stopped) return STOPPED
    if ('unavailable' in output) return draftFailed(live)
    d.steps.answers = { note: null, changed: null, exact: output.lines }
    d.draft = { address: sandbox.url, serving: true, lastAttempt: 'healthy' }
    // Their words while it built: acted on now, in the same session.
    if (heardIn(store, live.conversation.id, live.run.round).length > d.heard)
      return backToPages(live, live.run.last, false)
    // FE-37: "It started and answered" only if signing in to it starts too. A refusal is the
    // platform's to put right (the IdP refused the app's request), never the lead's.
    const signIn = await deps.signIn.starts(sandbox.url)
    record(
      live,
      'signIn',
      'sandbox',
      signIn === 'ok'
        ? null
        : signIn === 'refused'
          ? 'SIGN_IN_REFUSED'
          : 'SIGN_IN_UNKNOWN',
    )
    if (live.stopped) return STOPPED
    if (signIn === 'refused')
      return needs({ kind: 'refused', code: 'SIGN_IN_REFUSED' }, 'SIGN_IN_REFUSED')
    return { kind: 'done' }
  }

  const STEP: Record<BuildStep, (live: Live) => Promise<Outcome>> = {
    pages,
    holds,
    build,
    draft,
    answers,
  }

  async function steps(live: Live): Promise<Ending> {
    const early = await prepare(live)
    if (early !== null) return early
    for (;;) {
      if (live.stopped) return STOPPED
      const outcome = await STEP[live.run.step as BuildStep](live)
      if (outcome.kind !== 'next') return outcome
    }
  }

  /**
   * Why the platform ended this leg's session, if it did: `models_withdrawn` (FE-36: its key is refused
   * for every model), or `member_removed` (the platform's sitting 5: their person was removed from the
   * app, and their tokens on it revoked with it).
   */
  async function endedBecause(live: Live): Promise<string | null> {
    const id = live.session?.id ?? live.run.sessionIds.at(-1)
    if (id === undefined) return null
    const listed = await sessions.list(live.token, live.projectId).catch(() => [])
    return listed.find((s) => s.id === id)?.endReason ?? null
  }

  /**
   * Whether our model was narrowed away from this leg's live session (the platform's sitting 5,
   * `d061ad7`): the key lives on and refuses it alone, with the gateway's `403`. That is a
   * withdrawal as FE-36's was, never an administrator's wait.
   */
  async function narrowedAway(live: Live): Promise<boolean> {
    const id = live.session?.id ?? live.run.sessionIds.at(-1)
    const model = live.run.model
    if (id === undefined || model === null) return false
    const listed = await sessions.list(live.token, live.projectId).catch(() => [])
    const mine = listed.find((s) => s.id === id)
    return mine !== undefined && !mine.models.includes(model)
  }

  /** What a refusal nobody in the round answered means for the person. */
  async function fromError(live: Live, error: unknown): Promise<Ending> {
    if (error instanceof ModelError) {
      const why = error.code === 'MODEL_KEY_REFUSED' ? await endedBecause(live) : null
      if (why === 'models_withdrawn')
        // FE-36: the platform ended it (the app's data is now confidential). Rich: stop and ask
        // first; Carry on starts a new session, on what the app now allows.
        return needs({ kind: 'withdrawn' })
      // The platform's sitting 5: their person was removed from the app, and the token went with it.
      if (why === 'member_removed') return needs({ kind: 'token' })
      // The platform's sitting 5: it narrows the key instead, and our model alone is refused. The
      // same withdrawal, renewed once like it (a new session that still lists it carries on).
      if (error.code === 'MODEL_NOT_AVAILABLE' && (await narrowedAway(live)))
        return needs({ kind: 'withdrawn' })
      // m126: a start the platform refused for the month states its limit, read fresh: the month,
      // never the checkpoint a cached budget read would make of it.
      if (error.code === 'MODEL_BUDGET_EXHAUSTED' && error.limit !== null)
        return needs(
          { kind: 'month', resetsAt: error.limit.resetsAt },
          'MODEL_BUDGET_EXHAUSTED',
          error.requestId,
        )
      if (error.code === 'MODEL_BUDGET_EXHAUSTED' || error.code === 'MODEL_KEY_REFUSED') {
        // The gateway's 429 is the session's cap or the month alike; an expired key is the
        // session's clock. The budget says which (Decision 9).
        const budget = await sessions.budget(live.token).catch(() => undefined)
        if (
          budget?.remainingUsd !== null &&
          budget !== undefined &&
          budget.remainingUsd <= 0
        )
          return needs(
            { kind: 'month', resetsAt: budget.resetsAt },
            'MODEL_BUDGET_EXHAUSTED',
            error.requestId,
          )
        return needs({
          kind: 'checkpoint',
          capUsd: SESSION.capUsd,
          monthLeftUsd: budget?.remainingUsd ?? null,
        })
      }
      if (error.code === 'MODEL_UNREACHABLE')
        return needs({ kind: 'unreachable', what: 'model' }, error.code, error.requestId)
      // Carry on re-asks, as from unreachable: a stall is never asked again by itself.
      if (error.code === 'MODEL_STALLED')
        return needs({ kind: 'stalled', why: 'quiet' }, error.code)
      if (error.code === 'MODEL_TOO_LONG')
        return needs({ kind: 'stalled', why: 'ceiling' }, error.code)
      return needs({ kind: 'refused', code: error.code }, error.code, error.requestId)
    }
    if (error instanceof PlatformRefusal) {
      if (error.status === 401) return needs({ kind: 'token' })
      if (error.code === 'PLATFORM_UNAVAILABLE')
        return needs(
          { kind: 'unreachable', what: 'platform' },
          error.code,
          error.requestId,
        )
      return needs({ kind: 'refused', code: error.code }, error.code, error.requestId)
    }
    if (error instanceof Refused)
      return needs({ kind: 'refused', code: error.code }, error.code)
    console.error(error)
    return needs({ kind: 'refused', code: 'INTERNAL' }, 'INTERNAL')
  }

  /** How a leg ends: saved, said, and the conversation moved, all at once. */
  async function end(live: Live, ending: Ending) {
    const d = detail(live)
    closeWatch(live)
    // Stop wins over anything but a round already built (Review Focus 4).
    const final = live.stopped && ending.kind !== 'done' ? STOPPED : ending
    if (final.kind === 'done' || final.kind === 'stopped') await endSession(live)
    // m18: built, the cost is read once more: the last answers can fall inside the 5 s between
    // reads, and nothing reads it after the round.
    if (final.kind === 'done') await refreshCost(live, true)
    let state: ConversationState = 'building'
    switch (final.kind) {
      case 'done':
        live.run.status = 'done'
        if (d.cannot !== null) {
          d.needs = { kind: 'cannot', what: d.cannot }
          d.reference = reference(live, 'DEPENDENCY_NOT_INSTALLABLE')
        }
        say(live, 'we', {
          kind: 'built',
          round: live.run.round,
          line: d.line,
          cannot: d.cannot,
        })
        state = 'built'
        break
      case 'paused':
        live.run.status = 'paused'
        state = 'paused'
        break
      case 'stopped':
        live.run.status = 'stopped'
        break
      case 'needs':
        live.run.status = 'needs-you'
        d.needs = final.needs
        d.reference =
          final.code === null ? null : reference(live, final.code, final.requestId)
        if (final.needs.kind === 'token') deps.tokens.drop(live.conversation.id)
        break
    }
    store.saveRun(live.run)
    live.running = false
    publishState(hub, store, store.setState(live.conversation.id, state))
  }

  /** One leg of a round, as one piece of work: from a start, a Carry on, or an answer. */
  function begin(live: Live) {
    live.running = true
    live.run.status = 'working'
    store.saveRun(live.run)
    publishState(hub, store, store.setState(live.conversation.id, 'building'))
    work.run(live.conversation, null, async () => {
      try {
        let ending: Ending
        try {
          ending = await steps(live)
        } catch (error) {
          ending = await fromError(live, error)
        }
        // RICH, 2026-09-29 (at his click): the platform withdrew the session because the app's
        // data is now confidential. When a new session still lists the model we were using, we
        // carry on by ourselves and say so; only a model that is gone stops and asks (once a leg).
        if (
          ending.kind === 'needs' &&
          ending.needs.kind === 'withdrawn' &&
          !live.stopped
        ) {
          live.renewing = live.run.model
          await endSession(live)
          try {
            ending = await steps(live)
          } catch (error) {
            ending = await fromError(live, error)
          } finally {
            live.renewing = null
          }
        }
        await end(live, ending)
      } finally {
        live.running = false
      }
      return undefined
    })
  }

  function liveOf(run: Run, conversation: Conversation, token: string): Live {
    return {
      conversation,
      projectId: conversation.projectId ?? '',
      token,
      run: { ...run, detail: run.detail ?? structuredClone(NO_DETAIL) },
      session: null,
      ended: new Set(),
      stopped: false,
      running: false,
      watch: null,
      refused: false,
      builds: new Map(),
      instances: new Map(),
      wakers: new Set(),
      base: '',
      paths: [],
      packageJson: null,
      files: [],
      proposal: null,
      settled: false,
      plan: '',
      pack: null,
      sandbox: null,
      agent: 'lead',
      costAt: 0,
      shown: 0,
      landed: null,
      known: new Set(),
      change: null,
      fix: null,
      renewing: null,
    }
  }

  function resumeIfAnswered(live: Live) {
    if (live.running || live.run.status !== 'paused' || live.stopped) return
    const waiting = store
      .listQuestions(live.run.id)
      .some((q) => !q.answered && (q.fallback === null || q.secret !== null))
    if (!waiting) begin(live)
  }

  /** The conversation's next round, from its first step. */
  function newRun(conversation: Conversation, status: Run['status']): Run {
    const previous = store.latestRun(conversation.id)
    return {
      id: randomUUID(),
      conversationId: conversation.id,
      round: (previous?.round ?? 0) + 1,
      step: 'pages',
      moves: 0,
      tries: { build: 0, draft: 0, conflict: 0 },
      status,
      sessionIds: [],
      model: null,
      last: null,
      sameRefusal: null,
      detail: structuredClone(NO_DETAIL),
    }
  }

  return {
    start(conversation, token) {
      const run = newRun(conversation, 'working')
      store.saveRun(run)
      const live = liveOf(run, conversation, token)
      lives.set(conversation.id, live)
      begin(live)
    },

    carryOn(conversation, token, way) {
      const saved = store.latestRun(conversation.id)
      if (saved === undefined) return
      let live = lives.get(conversation.id)
      if (live === undefined || live.run.id !== saved.id) {
        live = liveOf(saved, conversation, token)
        lives.set(conversation.id, live)
      }
      if (live.running) return
      const d = detail(live)
      closeWatch(live)
      live.token = token
      live.stopped = false
      live.refused = false
      switch (d.needs?.kind) {
        case 'tries': {
          const step = d.needs.step
          live.run.tries[step] = 0
          if (way === 'different')
            d.failures = d.tried.filter((t) => t.what === step).map((t) => t.text)
          live.run.step = 'pages'
          live.run.moves = 0
          live.run.sameRefusal = null
          live.run.last = null
          d.landed = false
          d.buildId = null
          d.releaseId = null
          d.instanceId = null
          break
        }
        case 'conflict':
          live.run.tries['conflict'] = 0
          live.run.sameRefusal = null
          break
        case 'moves':
          live.run.moves = 0
          live.run.sameRefusal = null
          break
        case 'checkpoint':
        case 'withdrawn':
          // Its $2 is used, or the platform ended it: the next is started because they said so.
          void endSession(live)
          break
      }
      d.needs = null
      d.reference = null
      begin(live)
    },

    message(conversation, words) {
      const run = store.latestRun(conversation.id)
      if (run === undefined) return
      store.addMessage(conversation.id, 'person', {
        kind: 'message',
        round: run.round,
        text: words,
      } satisfies RoundSaid)
      publishState(
        hub,
        store,
        store.getConversation(conversation.id, conversation.personId) ?? conversation,
      )
    },

    answer(conversation, questionId, words) {
      const question = store.getQuestion(questionId)
      if (question === undefined || question.conversationId !== conversation.id)
        return 'unknown'
      const run = store.getRun(question.runId)
      if (run === undefined) return 'unknown'
      const live = lives.get(conversation.id)
      const now = () =>
        store.getConversation(conversation.id, conversation.personId) ?? conversation
      const heardAnswer = (text: string | null) => {
        store.addMessage(conversation.id, 'person', {
          kind: 'answer',
          round: run.round,
          questionId,
          text,
        } satisfies RoundSaid)
        publishState(hub, store, now())
        if (live !== undefined && live.run.id === run.id) resumeIfAnswered(live)
      }
      if (question.secret === null) {
        store.answerQuestion(questionId, words)
        heardAnswer(words)
        return 'taken'
      }
      // A SECRET: to the sandbox, and nowhere else (Decision 10). Never a row, never a frame.
      if (words.length < 6 || Buffer.byteLength(words, 'utf8') > 16 * 1024)
        return 'invalid'
      // The store's token alone (m14): it holds the newest handed over, and a refused one is
      // dropped from it, while the round's own may be that refused one until Carry on.
      const token = deps.tokens.get(conversation.id)
      if (token === undefined) return 'token'
      const name = question.secret
      void (async () => {
        try {
          await deps.secrets.setInSandbox(
            token,
            conversation.projectId ?? '',
            name,
            words,
          )
          deps.trace.record(run.id, {
            kind: 'platform',
            operation: 'setAppSecret',
            code: null,
            named: 'sandbox',
          })
        } catch (error) {
          publishRefusal(hub, store, {
            conversation: now(),
            code: codeOf(error),
            operation: 'setAppSecret',
            requestId: error instanceof PlatformRefusal ? error.requestId : null,
          })
          return
        }
        store.answerQuestion(questionId, null)
        heardAnswer(null)
      })()
      return 'taken'
    },

    stop(conversation, stopped) {
      const live = lives.get(conversation.id)
      if (live?.running) {
        // AT ONCE (Review Focus 4): the person sees it stopped, and its session spends no
        // more. Whatever is in flight finishes, and is never acted on: the runner and every
        // step check Stop after each answer and each platform call.
        if (live.stopped) return
        live.stopped = true
        live.run.status = 'stopped'
        detail(live).stopped = stopped ?? null
        store.saveRun(live.run)
        publish(live)
        void endSession(live)
        wake(live)
        return
      }
      const run = live?.run ?? store.latestRun(conversation.id)
      if (run === undefined || run.status === 'stopped' || run.status === 'done') return
      if (live !== undefined) {
        live.stopped = true
        void endSession(live)
      }
      run.status = 'stopped'
      run.detail = {
        ...(run.detail ?? structuredClone(NO_DETAIL)),
        stopped: stopped ?? null,
      }
      store.saveRun(run)
      publishState(hub, store, store.setState(conversation.id, 'building'))
    },

    interruptedOnBoot() {
      for (const run of store.runsIn(['working', 'paused'])) {
        store.saveRun({ ...run, status: 'interrupted' })
        store.setState(run.conversationId, 'building')
      }
    },

    withoutToken(conversation) {
      const saved = store.latestRun(conversation.id)
      const run =
        saved?.status === 'stopped' ? saved : newRun(conversation, 'interrupted')
      store.saveRun({ ...run, status: 'interrupted' })
      publishState(hub, store, store.setState(conversation.id, 'building'))
    },
  }
}

function parsed(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
