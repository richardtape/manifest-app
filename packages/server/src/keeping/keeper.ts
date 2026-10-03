import { PlatformRefusal } from '../platform/refusal.js'
import type { ProjectEvent, ProjectStream, Replay, Watch } from '../platform/stream.js'
import type { Watching } from '../platform/watching.js'
import { chipOf } from '../api/apps.js'
import type { Hub } from '../api/events.js'
import type { Chip, Conversation, Happening } from '../api/progress.js'
import type { Store } from '../store/db.js'
import type { HistoryEntry, KeptApp, KeptMember } from '../store/keeping.js'
import { emailsFor, questionEmails, waitingEmail } from './emails.js'
import { happeningOf, questionsOf } from './happenings.js'
import { deliver, deliverUnfinished, type Mailer } from './mail.js'
import {
  answerOf,
  observe,
  outageFrom,
  type Change,
  type Outage,
  type Probed,
} from './outage.js'
import { seal, unseal } from './seal.js'

/**
 * THE KEEPER (F6 D4: inside our server, in both modes). One *Keeping watch* token per app, handed
 * over by a member's page and kept sealed (D2); one event stream per token, through F3's
 * `platformStream`, which sees each event once, reconnects after a drop, and stops for good on a
 * refusal (`4401` included). Every event is written once to `history`, as the platform sent it
 * (Decision 1); later tasks read it into lines and *needs you*. **Each new happening is emailed
 * once** (Task 5: D3), as is **work waiting on its person** (Decision 14): a piece of work that ends
 * with no page watching, and a conversation waiting a day (looked for once an hour). **Once a
 * minute it looks at each live app's students' address** (Task 6: D6, Decision 8), and writes and
 * tells each outage itself.
 *
 * **It only reads** (`launch-actions.test.ts`): the stream, the app and its members. In memory it
 * holds the open streams and nothing else: a restart opens them again from the sealed rows.
 */
export interface KeeperDeps {
  store: Store
  key: Buffer
  stream: ProjectStream
  watching: Watching
  now: () => Date
  mailer: Mailer
  /** Where an email's link points: `config.origin`, so the laptop's links work in either mode. */
  origin: string
  /** Whether a page holds a conversation's stream, and whether work holds it (Decision 14). */
  hub: Pick<Hub, 'watched' | 'busy'>
  /** A retry's wait (`deliver`'s); setTimeout's by default. */
  wait?: (ms: number) => Promise<void>
  /** Task 6: one look at a students' address (`probeAddress`, through the edge). */
  probe: (url: string) => Promise<Probed>
  /** Decision 12: false in mock mode, where the mock's app has no live address on the laptop. */
  probing: boolean
  /**
   * How often each live address is looked at: a minute (D6) unless the keeper's caller says
   * otherwise (Task 12's harness). Read from nothing else: never a setting of our server.
   */
  lookEveryMs?: number
}

export type Handed = { token: string; tokenId: string; expiresAt: string }

export interface Keeper {
  /** Every kept token's stream opened. */
  start(): void
  stop(): void
  /**
   * Decision 5. Throws PlatformRefusal when the token cannot read the project; `stranger` when the
   * person handing it is not among the members it reads (nothing kept: the whole-branch review's I2).
   */
  hand(
    projectId: string,
    handed: Handed,
    personId: string,
  ): Promise<'kept' | 'current' | 'stranger'>
  status(projectId: string): {
    watching: boolean
    until: string | null
    tokenId: string | null
    mintedBy: string | null
  }
  /** Decision 11: its stream closed, and every row forgotten. */
  forget(projectId: string): void
  /** Decision 14: a piece of work ended (`createWork`'s `ended`), the conversation as it is now. */
  workEnded(conversation: Conversation): void
  /** Task 6: the live address's watch, as it stands (Task 7's needs); from history before a look. */
  outage(projectId: string): Outage
  /**
   * F6b DECISION 5: WHO TO TELL that someone was taken off an app, once each: on `member.removed`,
   * or when the members read again no longer list someone we kept (FE-48: removing the one whose
   * token we watch with closes our stream before the event). The kept members are without them
   * first. `buildServer` ends their work here with it.
   */
  onRemoved(listener: (projectId: string, personId: string) => void): void
}

/** Decision 5: a token with less than this left is replaced by the next one a page hands over. */
const RENEW_MS = 30 * 86_400_000

/** The events after which the app, or who is on it, is read again (the rest are history only). */
const READS_APP = new Set([
  'project.launched',
  'project.archived',
  'project.restored',
  'project.renamed',
])
const READS_MEMBERS = new Set(['member.added', 'member.removed'])

/** Decision 14: how long a conversation waits on its person before we say so again. */
const A_DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
/** D6: how often each live address is looked at. */
const MINUTE_MS = 60_000

/** One open stream, and its token, in memory only. */
interface Open {
  tokenId: string
  token: string
  watch: Watch | undefined
  /** Events handed over since the last replay's report that we already held (a restart's). */
  held: Set<string>
  /**
   * The first replay of an app we never watched (no platform event held): it is the app's past,
   * written to history and emailed to nobody. Over at the replay's report.
   */
  first: boolean
}

const NOT_WATCHING = { watching: false, until: null, tokenId: null, mintedBy: null }

export function createKeeper({
  store,
  key,
  stream,
  watching,
  now,
  mailer,
  origin,
  hub,
  wait,
  probe,
  probing,
  lookEveryMs = MINUTE_MS,
}: KeeperDeps): Keeper {
  const open = new Map<string, Open>()
  let scanning: ReturnType<typeof setInterval> | undefined
  let looking: ReturnType<typeof setInterval> | undefined
  /** Task 6: each watched app's outage, once looked at; before that, our history says it. */
  const outages = new Map<string, Outage>()
  /** A look still waiting for its answer is not sent again. */
  const inFlight = new Set<string>()
  /** F6b Decision 5: who ends a removed member's work (`buildServer`'s). */
  let removed: (projectId: string, personId: string) => void = () => undefined
  /** A stream replaced or closed says nothing more: only the current one is heard. */
  const isCurrent = (projectId: string, one: Open) => open.get(projectId) === one

  function good(projectId: string): boolean {
    const kept = store.watchOf(projectId)
    const one = open.get(projectId)
    if (kept === undefined || one?.tokenId !== kept.tokenId) return false
    return Date.parse(kept.expiresAt) - now().getTime() >= RENEW_MS
  }

  function watchWith(projectId: string, tokenId: string, token: string): void {
    open.get(projectId)?.watch?.close()
    const first = !store
      .historyOf(projectId)
      .some((entry) => !entry.type.startsWith('keeping.'))
    const one: Open = { tokenId, token, watch: undefined, held: new Set(), first }
    open.set(projectId, one)
    one.watch = stream.watch(token, projectId, {
      event: (event) => isCurrent(projectId, one) && onEvent(projectId, one, event),
      replayed: (replay) =>
        isCurrent(projectId, one) && onReplayed(projectId, one, replay),
      reconnected: () =>
        isCurrent(projectId, one) && void refresh(projectId, one, 'both'),
      refused: () => isCurrent(projectId, one) && onRefused(projectId, one),
    })
  }

  function onEvent(projectId: string, one: Open, event: ProjectEvent): void {
    const entry: HistoryEntry = {
      id: event.id,
      projectId,
      at: event.at,
      type: event.type,
      detail: event.detail,
    }
    // Held already: a replay after a restart. Its rules ran when it was first written.
    if (!store.addHistory(entry)) {
      one.held.add(event.id)
      return
    }
    if (event.type === 'project.deleted') return forget(projectId)
    if (READS_APP.has(event.type)) void refresh(projectId, one, 'app')
    if (event.type === 'pending_action.created' && !one.first) asked(entry)
    const happening = one.first ? null : happeningOf(entry)
    // Someone added is named once the members are read again; someone removed, before.
    if (happening?.kind === 'member-added')
      return void refresh(projectId, one, 'members').then(() => tell(entry, happening))
    if (happening !== null) tell(entry, happening)
    // F6b Decision 5: told with the members as they were (above), then ended without them.
    if (happening?.kind === 'member-removed')
      keepMembers(
        projectId,
        store.members(projectId).filter((member) => member.userId !== happening.userId),
      )
    if (READS_MEMBERS.has(event.type)) void refresh(projectId, one, 'members')
  }

  /**
   * THE MEMBERS, KEPT WHOLE (F6 Decision 3), and anyone kept before and not now taken off here,
   * once (F6b Decision 5): only someone we kept is ended, so a second read ends nobody again.
   */
  function keepMembers(projectId: string, members: KeptMember[]): void {
    const gone = store
      .members(projectId)
      .filter((kept) => !members.some((member) => member.userId === kept.userId))
    store.putMembers(projectId, members)
    for (const member of gone) removed(projectId, member.userId)
  }

  /** D3: each owner told once, by the kept app and members. */
  function tell(entry: HistoryEntry, happening: Happening): void {
    const app = store.app(entry.projectId)
    if (app === undefined) return
    const members = store.members(entry.projectId)
    const context = { app, members, origin, at: entry.at, id: entry.id }
    for (const outgoing of emailsFor(happening, context))
      void deliver(store, mailer, outgoing, wait)
  }

  /**
   * F6b TASK 12 (Decision 14): their agent's question, once to each owner, its agent named as our
   * page kept it (`minted`), else none. A question already answered or a day old is not one.
   */
  function asked(entry: HistoryEntry): void {
    const app = store.app(entry.projectId)
    const [question] = questionsOf([entry], now().getTime())
    if (app === undefined || question === undefined) return
    const tokenName =
      store
        .mintedOn(entry.projectId)
        .find((row) => row.tokenId === question.tokenId && row.purpose === 'agent')
        ?.name ?? null
    const members = store.members(entry.projectId)
    for (const outgoing of questionEmails(question, { app, members, origin, tokenName }))
      void deliver(store, mailer, outgoing, wait)
  }

  /**
   * Decision 14: the person whose work it is, when it now waits on them or is built, and no page
   * holds its stream. An app we do not keep is no email: we cannot name it (from F6 Task 8, Make it
   * hands its watch token over, so every app is kept from its first build).
   */
  function waitingOn(
    conversation: Conversation,
    why: (chip: Chip) => 'finished' | 'needs-you' | 'a-day' | null,
    keyOf: (why: string) => string,
  ): void {
    if (conversation.projectId === null) return
    const app = store.app(conversation.projectId)
    const to = store.personEmail(conversation.personId)
    if (app === undefined || to === undefined) return
    const run = store.latestRun(conversation.id)
    const which = why(chipOf(conversation, run, hub.busy(conversation.id)))
    if (which === null) return
    const key = `${app.projectId}:${keyOf(which)}`
    void deliver(
      store,
      mailer,
      waitingEmail(which, { app, conversation, to, origin, key }),
      wait,
    )
  }

  /** Decision 8: launched, switched on, with an address, and its token kept. */
  const watched = (app: KeptApp | undefined): app is KeptApp & { studentsUrl: string } =>
    app !== undefined &&
    app.launchedAt !== null &&
    app.state === 'active' &&
    app.studentsUrl !== null &&
    open.has(app.projectId)

  const outageOf = (projectId: string): Outage =>
    outages.get(projectId) ?? outageFrom(store.historyOf(projectId))

  /** Once a minute: one look at each watched app's students' address. */
  function look(): void {
    // An app no longer watched (switched off, refused, forgotten) starts again from its history.
    for (const projectId of outages.keys())
      if (!watched(store.app(projectId))) outages.delete(projectId)
    for (const projectId of open.keys()) {
      const app = store.app(projectId)
      if (watched(app) && !inFlight.has(projectId)) void lookAt(app)
    }
  }

  async function lookAt(app: KeptApp & { studentsUrl: string }): Promise<void> {
    const { projectId } = app
    const at = now().toISOString()
    inFlight.add(projectId)
    try {
      const { status, routed } = await probe(app.studentsUrl)
      if (!watched(store.app(projectId))) return
      const { outage, change } = observe(
        outageOf(projectId),
        answerOf(status, routed),
        at,
      )
      outages.set(projectId, outage)
      if (change !== null) changed(projectId, change)
    } catch {
      // A look that failed is no answer at all: the next minute looks again.
    } finally {
      inFlight.delete(projectId)
    }
  }

  /**
   * An outage's start or end: written to history once, and told to every owner (D3), but never a
   * fall within 30 minutes of a recovery, nor its recovery (Review Focus 3): those rows say
   * `again`, and are told to nobody.
   */
  function changed(projectId: string, change: Change): void {
    const { from, again } = change
    const entry: HistoryEntry =
      change.kind === 'fell'
        ? {
            id: `keeping.unreachable:${projectId}:${from}`,
            projectId,
            at: from,
            type: 'keeping.unreachable',
            detail: again ? { from, again } : { from },
          }
        : {
            id: `keeping.answering:${projectId}:${from}`,
            projectId,
            at: change.to,
            type: 'keeping.answering',
            detail: again ? { from, to: change.to, again } : { from, to: change.to },
          }
    if (!store.addHistory(entry) || again) return
    tell(
      entry,
      change.kind === 'fell'
        ? { kind: 'unreachable', from }
        : { kind: 'answering-again', from, to: change.to },
    )
  }

  /** Once an hour: each conversation waiting on its person for a day, said once per wait. */
  function scan(): void {
    const before = new Date(now().getTime() - A_DAY_MS).toISOString()
    for (const conversation of store.idleConversations(before))
      waitingOn(
        conversation,
        (chip) => (chip === 'attention' ? 'a-day' : null),
        () => `a-day:${conversation.id}:${conversation.updatedAt}`,
      )
  }

  /**
   * A GAP (Decision 1, FE-7: the replay is the newest 50, with no cursor). When a replay held
   * nothing we already had, and we had something older, we were not watching between the newest
   * event we held and the oldest it replayed: said once, by the oldest replayed event's id.
   */
  function onReplayed(projectId: string, one: Open, replay: Replay): void {
    one.first = false
    const heldBefore = replay.overlapped || replay.ids.some((id) => one.held.has(id))
    one.held.clear()
    if (replay.ids.length === 0 || heldBefore) return
    const replayed = new Set(replay.ids)
    const history = store.historyOf(projectId)
    const oldest = history.find((entry) => replayed.has(entry.id))
    if (oldest === undefined) return
    const newest = history
      .filter(
        (entry) =>
          !replayed.has(entry.id) &&
          !entry.type.startsWith('keeping.') &&
          Date.parse(entry.at) <= Date.parse(oldest.at),
      )
      .at(-1)
    // An app with no history before this replay has none missing: it is "From …" (Task 4).
    if (newest === undefined) return
    store.addHistory({
      id: `keeping.gap:${oldest.id}`,
      projectId,
      at: newest.at,
      type: 'keeping.gap',
      detail: { from: newest.at, to: oldest.at },
    })
  }

  /** Refused (FE-33's `4401`: revoked, expired, switched off or deleted): forgotten, and said when. */
  function onRefused(projectId: string, one: Open): void {
    open.delete(projectId)
    store.dropWatch(projectId, one.tokenId)
    store.addHistory({
      id: `keeping.stopped:${one.tokenId}`,
      projectId,
      at: now().toISOString(),
      type: 'keeping.stopped',
      detail: {},
    })
  }

  async function refresh(
    projectId: string,
    one: Open,
    what: 'app' | 'members' | 'both',
  ): Promise<void> {
    try {
      if (what !== 'members') {
        const app = await watching.app(one.token, projectId)
        if (isCurrent(projectId, one) && app.projectId === projectId) store.putApp(app)
      }
      if (what !== 'app') {
        const members = await watching.members(one.token, projectId)
        if (isCurrent(projectId, one)) keepMembers(projectId, members)
      }
    } catch {
      // A refused token's stream says so itself; anything else is read again at the next event
      // or reconnect. Never logged: nothing here may carry the token.
    }
  }

  function forget(projectId: string): void {
    open.get(projectId)?.watch?.close()
    open.delete(projectId)
    store.forgetApp(projectId)
  }

  return {
    start() {
      // Review Focus 1: what a stop left claimed and unsent goes now, and never twice.
      void deliverUnfinished(store, mailer, wait)
      scanning ??= setInterval(scan, HOUR_MS)
      scanning.unref?.()
      if (probing) {
        looking ??= setInterval(look, lookEveryMs)
        looking.unref?.()
      }
      for (const kept of store.watches()) {
        if (open.has(kept.projectId)) continue
        const token = unseal(key, kept.sealed)
        // Review Focus 4: another key, or a row tampered with, is no token. The next visit mints.
        if (token === undefined) {
          store.dropWatch(kept.projectId, kept.tokenId)
          continue
        }
        watchWith(kept.projectId, kept.tokenId, token)
        // What changed while we were stopped may be outside the replay (FE-7).
        void refresh(kept.projectId, open.get(kept.projectId)!, 'both')
      }
    },

    stop() {
      clearInterval(scanning)
      scanning = undefined
      clearInterval(looking)
      looking = undefined
      for (const one of open.values()) one.watch?.close()
      open.clear()
    },

    async hand(projectId, handed, personId) {
      if (good(projectId)) return 'current'
      const app = await watching.app(handed.token, projectId)
      if (app.projectId !== projectId)
        throw new PlatformRefusal('TOKEN_NOT_FOR_PROJECT', null)
      const members = await watching.members(handed.token, projectId)
      // The token's own members say who is on it now; ours may be stale (a watch that closed
      // `4401` hears no `member.*` after it). Someone not among them keeps nothing here (I2).
      if (!members.some((member) => member.userId === personId)) return 'stranger'
      // Review Focus 2: another page's hand may have kept a good one while we read.
      if (good(projectId)) return 'current'
      store.putApp(app)
      keepMembers(projectId, members)
      store.putWatch({
        projectId,
        tokenId: handed.tokenId,
        sealed: seal(key, handed.token),
        expiresAt: handed.expiresAt,
        mintedBy: personId,
        mintedAt: now().toISOString(),
      })
      watchWith(projectId, handed.tokenId, handed.token)
      return 'kept'
    },

    status(projectId) {
      const kept = store.watchOf(projectId)
      if (kept === undefined || open.get(projectId)?.tokenId !== kept.tokenId)
        return NOT_WATCHING
      return {
        watching: true,
        until: kept.expiresAt,
        tokenId: kept.tokenId,
        mintedBy: kept.mintedBy,
      }
    },

    forget,

    workEnded(conversation) {
      // Its own person's page (F6b D3: a colleague reading it is not them).
      if (hub.watched(conversation.id, conversation.personId)) return
      const run = store.latestRun(conversation.id)
      // A round of work (F3's "You can leave"); the intake's and the plan's are watched as they go.
      if (run === undefined) return
      waitingOn(
        conversation,
        (chip) =>
          conversation.state === 'built'
            ? 'finished'
            : chip === 'attention'
              ? 'needs-you'
              : null,
        (why) => `${why}:${run.id}`,
      )
    },

    outage: outageOf,

    onRemoved(listener) {
      removed = listener
    },
  }
}

/** A keeper that keeps nothing: buildServer's default, for tests that do not need one. */
export const idleKeeper: Keeper = {
  start: () => undefined,
  stop: () => undefined,
  hand: () => Promise.reject(new PlatformRefusal('PLATFORM_UNAVAILABLE', null)),
  status: () => NOT_WATCHING,
  forget: () => undefined,
  workEnded: () => undefined,
  outage: () => ({ state: 'answering', recovered: null }),
  onRemoved: () => undefined,
}
