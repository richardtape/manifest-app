import { PlatformRefusal } from '../platform/refusal.js'
import type { ProjectEvent, ProjectStream, Replay, Watch } from '../platform/stream.js'
import type { Watching } from '../platform/watching.js'
import { chipOf } from '../api/apps.js'
import type { Hub } from '../api/events.js'
import { pieceOf } from '../api/piece-state.js'
import type { Chip, Conversation, Happening } from '../api/progress.js'
import type { Store } from '../store/db.js'
import type { HistoryEntry, KeptApp, KeptMember } from '../store/keeping.js'
import {
  emailsFor,
  questionEmails,
  stoppedEmail,
  waitingEmail,
  type StoppedWhy,
} from './emails.js'
import { administratorOf, happeningOf, questionsOf, tokenEndsOf } from './happenings.js'
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
  /** Decision 11: its stream closed, and every row forgotten (after `deleting`'s emails). */
  forget(projectId: string): void
  /**
   * MINORS m69: the app is being deleted: whoever's round it stops is told now, while its rows
   * still say whose (our route calls this before it stops them; `forget` calls it too).
   */
  deleting(projectId: string): void
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
  /**
   * THE WHOLE-BRANCH REVIEW'S I1: someone who took themselves off, by their own word (People, after
   * the platform's `removeMember`): kept no more, and their work here ended, as a removal's is. It
   * lowers only their own standing: the next members read keeps them again if they are still on
   * it. `false` when we kept no such member.
   */
  left(projectId: string, personId: string): boolean
  /**
   * MINORS m82 (Rich, "Re-read on a stranger"): someone our kept members do not name has asked a
   * change, its token having read the project. The members read with that token, and kept as our
   * own read is: someone no longer listed taken off (F6b Decision 5), a list of nobody not believed
   * (m80), a read answered after a newer one of our stream's not kept (m81). Rejects when it
   * cannot read; the members stay as they were.
   */
  readMembers(projectId: string, token: string): Promise<void>
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
/**
 * MINORS m76: how long a *we need you* waits before it goes, so that a switch-off, a deletion or a
 * removal heard meanwhile says why the work stopped instead (m69). The platform revokes the
 * round's token before it tells our stream, so the round usually ends first.
 */
const HOLD_MS = 60_000

/** A *we need you* held (m76): all its email needs, kept now, for a deletion forgets the rows. */
interface Held {
  conversation: Conversation
  runId: string
  app: KeptApp
  to: string
  /** The app's first build (`PieceView.kind`): *"Building …"*. */
  first: boolean
  /** When it was held, in the keeper's clock. */
  since: number
  timer: ReturnType<typeof setTimeout>
}

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
  /**
   * Questions a replay carried, emailed at its report if still waiting (minors m108): the same
   * replay can hold the answer too.
   */
  asking: HistoryEntry[]
  /** Members reads begun, counted (minors m81). */
  membersAsked: number
  /**
   * A members read numbered this or lower is not believed (minors m81): it began before a member
   * event we heard since, or before a read already kept, so it may put back someone taken off.
   */
  membersBelieved: number
}

const NOT_WATCHING = { watching: false, until: null, tokenId: null, mintedBy: null }

/** Whether the history says this person took themselves off (`member.removed`, by themselves). */
function leftOf(history: HistoryEntry[], personId: string): boolean {
  return history.some((entry) => {
    const { memberId, userId } = (entry.detail ?? {}) as Record<string, unknown>
    return entry.type === 'member.removed' && memberId === personId && userId === personId
  })
}

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
  let firstScan: ReturnType<typeof setTimeout> | undefined
  let scanning: ReturnType<typeof setInterval> | undefined
  let looking: ReturnType<typeof setInterval> | undefined
  /** Task 6: each watched app's outage, once looked at; before that, our history says it. */
  const outages = new Map<string, Outage>()
  /** A look still waiting for its answer is not sent again. */
  const inFlight = new Set<string>()
  /** F6b Decision 5: who ends a removed member's work (`buildServer`'s). */
  let removed: (projectId: string, personId: string) => void = () => undefined
  /** Someone taken off whose ending threw, by app: tried again at its next members read (m79). */
  const unended = new Map<string, Set<string>>()
  /** Each *we need you* held a minute, by its run (m76). */
  const held = new Map<string, Held>()
  /** Between `stop` and the next `start`, nothing is held (the review: no timer outlives a stop). */
  let stopped = false
  /**
   * Who took themselves off (People), by app and person: told nothing of the work it stopped
   * (Decision 13: nobody is told what they did). Forgotten once a members read lists them again.
   */
  const leftBy = new Set<string>()
  /** A stream replaced or closed says nothing more: only the current one is heard. */
  const isCurrent = (projectId: string, one: Open) => open.get(projectId) === one

  function good(projectId: string): boolean {
    const kept = store.watchOf(projectId)
    const one = open.get(projectId)
    if (kept === undefined || one?.tokenId !== kept.tokenId) return false
    return Date.parse(kept.expiresAt) - now().getTime() >= RENEW_MS
  }

  function watchWith(projectId: string, tokenId: string, token: string): void {
    const before = open.get(projectId)
    before?.watch?.close()
    const first = !store
      .historyOf(projectId)
      .some((entry) => !entry.type.startsWith('keeping.'))
    const one: Open = {
      tokenId,
      token,
      watch: undefined,
      held: new Set(),
      first,
      // A replay's questions, its stream replaced before its report: the new one's (the review of m108).
      asking: before?.asking.splice(0) ?? [],
      membersAsked: 0,
      membersBelieved: 0,
    }
    open.set(projectId, one)
    one.watch = stream.watch(token, projectId, {
      event: (event, replayed) =>
        isCurrent(projectId, one) && onEvent(projectId, one, event, replayed),
      replayed: (replay) =>
        isCurrent(projectId, one) && onReplayed(projectId, one, replay),
      reconnected: () =>
        isCurrent(projectId, one) && void refresh(projectId, one, 'both'),
      refused: () => isCurrent(projectId, one) && onRefused(projectId, one),
    })
  }

  function onEvent(
    projectId: string,
    one: Open,
    event: ProjectEvent,
    replayed = false,
  ): void {
    const entry: HistoryEntry = {
      id: event.id,
      projectId,
      at: event.at,
      type: event.type,
      detail: event.detail,
      actor: event.actor,
    }
    // Held already: a replay after a restart. Its rules ran when it was first written.
    if (!store.addHistory(entry)) {
      one.held.add(event.id)
      return
    }
    if (event.type === 'project.deleted') return forget(projectId)
    // The switch, kept from the event at once (m69): a refused token's read cannot follow it, and a
    // later read of the app (a hand-over, a reconnect) says it afresh.
    if (event.type === 'project.archived' || event.type === 'project.restored') {
      const app = store.app(projectId)
      const state = event.type === 'project.archived' ? 'archived' : 'active'
      if (app !== undefined) store.putApp({ ...app, state })
    }
    // A members read begun before this event may not know it (minors m81).
    if (READS_MEMBERS.has(event.type)) one.membersBelieved = one.membersAsked
    if (READS_APP.has(event.type)) void refresh(projectId, one, 'app')
    if (event.type === 'pending_action.created' && !one.first) {
      if (replayed) one.asking.push(entry)
      else asked(entry)
    }
    const happening = one.first ? null : happeningOf(entry)
    // Someone added is named once the members are read again; someone removed, before.
    if (happening?.kind === 'member-added')
      return void refresh(projectId, one, 'members').then((read) =>
        tell(entry, happening, read),
      )
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
   * Each ending is its own (minors m79): one that throws is said on the operator's log, never stops
   * the others, and is tried again at the app's next members read. They are no member meanwhile:
   * a removal is never undone by a retry (the review of m79).
   */
  function keepMembers(projectId: string, members: KeptMember[]): void {
    const on = (userId: string) => members.some((member) => member.userId === userId)
    const gone = store
      .members(projectId)
      .filter((kept) => !on(kept.userId))
      .map((kept) => kept.userId)
    store.putMembers(projectId, members)
    for (const member of members) leftBy.delete(`${projectId} ${member.userId}`)
    const again = [...(unended.get(projectId) ?? [])].filter(
      (userId) => !on(userId) && !gone.includes(userId),
    )
    const still = new Set<string>()
    for (const userId of [...gone, ...again]) {
      try {
        removed(projectId, userId)
      } catch (error) {
        console.error(error)
        still.add(userId)
      }
    }
    if (still.size > 0) unended.set(projectId, still)
    else unended.delete(projectId)
  }

  /**
   * D3: each owner told once, by the kept app and members; or by the members read its own event
   * began, when a newer read is kept instead (the review of m81: it still names the one added).
   */
  function tell(
    entry: HistoryEntry,
    happening: Happening,
    read: KeptMember[] | undefined = undefined,
  ): void {
    const app = store.app(entry.projectId)
    if (app === undefined) return
    const members = read ?? store.members(entry.projectId)
    const administrator = administratorOf(entry)
    const context = { app, members, origin, at: entry.at, id: entry.id, administrator }
    for (const outgoing of emailsFor(happening, context))
      void deliver(store, mailer, outgoing, wait)
  }

  /**
   * F6b TASK 12 (Decision 14): their agent's question, once to each owner, its agent named as our
   * page kept it (`minted`), else none, and when it stops waiting: its day, or its token's end if
   * we know it and it is sooner (the platform's cap, its faculty-ready Task 13). A question already
   * answered, a day old, or its token ended, is not one.
   */
  function asked(entry: HistoryEntry): void {
    const app = store.app(entry.projectId)
    const kept = store.mintedOn(entry.projectId)
    const [question] = questionsOf([entry], now().getTime(), tokenEndsOf(kept))
    if (app === undefined || question === undefined) return
    // Its name and who let it in, where our page did (m129: whose agent, to each owner).
    const row = kept.find(
      (one) => one.tokenId === question.tokenId && one.purpose === 'agent',
    )
    const tokenName = row?.name ?? null
    const maker = row?.personId ?? null
    const members = store.members(entry.projectId)
    for (const outgoing of questionEmails(question, {
      app,
      members,
      origin,
      tokenName,
      maker,
    }))
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

  /**
   * MINORS m76: a *we need you* held a minute, with what it needs to say why instead: the app and
   * the address kept now, for a deletion forgets them. Held once per run.
   */
  function hold(conversation: Conversation, runId: string): void {
    if (stopped || conversation.projectId === null || held.has(runId)) return
    const app = store.app(conversation.projectId)
    const to = store.personEmail(conversation.personId)
    if (app === undefined || to === undefined) return
    const first = pieceOf(store, conversation.id).kind === 'first'
    const timer = setTimeout(() => release(runId), HOLD_MS)
    timer.unref?.()
    held.set(runId, {
      conversation,
      runId,
      app,
      to,
      first,
      since: now().getTime(),
      timer,
    })
  }

  /**
   * The minute is up (or the keeper stops: decided then, never lost). Why it stopped, if the app or
   * its people say so (m69); else *we need you*, if it still does and no page of theirs holds it.
   */
  function release(runId: string): void {
    const one = held.get(runId)
    if (one === undefined) return
    held.delete(runId)
    clearTimeout(one.timer)
    try {
      tellHeld(one)
    } catch (error) {
      // The store closing under a stop: nothing more to say, and never a throw from a timer.
      console.error(error)
    }
  }

  function tellHeld(one: Held): void {
    const { conversation, runId, app, to, first } = one
    if (hub.watched(conversation.id, conversation.personId)) return
    // Carried on since, and working or built: it is not stopped (the review).
    const latest = store.latestRun(conversation.id)
    if (latest !== undefined && latest.id !== runId) return
    if (latest?.status === 'working' || latest?.status === 'done') return
    const why = stoppedBecause(one)
    if (why === 'nobody') return
    if (why !== null)
      return void deliver(
        store,
        mailer,
        stoppedEmail(why, {
          app,
          conversation,
          first,
          to,
          origin,
          key: `${app.projectId}:${why}:${runId}`,
        }),
        wait,
      )
    const current = store.getConversation(conversation.id, conversation.personId)
    const run = store.latestRun(conversation.id)
    if (current === undefined || run?.id !== runId) return
    if (chipOf(current, run, hub.busy(current.id)) !== 'attention') return
    void deliver(
      store,
      mailer,
      waitingEmail('needs-you', {
        app,
        conversation: current,
        to,
        origin,
        key: `${app.projectId}:needs-you:${runId}`,
      }),
      wait,
    )
  }

  /**
   * MINORS m69, m76: why a held piece of work stopped, by what we keep now. The app forgotten is a
   * deletion; its person no longer among the members, taken off (or gone by their own word, ours
   * or the platform's event saying they removed themselves: `nobody`); the app's kept state, off.
   * Our own watch stopped in that minute with nothing else heard (FE-48: we cannot tell why) is
   * `nobody` too, never a wrong *we need you*.
   */
  function stoppedBecause({ conversation, since }: Held): StoppedWhy | 'nobody' | null {
    const projectId = conversation.projectId!
    const app = store.app(projectId)
    if (app === undefined) return 'deleted'
    const { personId } = conversation
    const members = store.members(projectId)
    const history = store.historyOf(projectId)
    if (members.length > 0 && !members.some((member) => member.userId === personId))
      return leftBy.has(`${projectId} ${personId}`) || leftOf(history, personId)
        ? 'nobody'
        : 'taken-off'
    if (app.state === 'archived') return 'switched-off'
    const watchStopped = history.some(
      (entry) =>
        entry.type === 'keeping.stopped' && Date.parse(entry.at) >= since - HOLD_MS,
    )
    return watchStopped ? 'nobody' : null
  }

  /**
   * MINORS m69: a deletion: whoever's round it stops is told now, while the rows still say whose
   * (a round under way ends after, on rows already gone). A *we need you* held on the app is
   * decided here too, as a deletion, and never again after the rows go (the review).
   */
  function deleting(projectId: string): void {
    const app = store.app(projectId)
    if (app === undefined) return
    const told = new Set<string>()
    const tell = (conversation: Conversation, runId: string, first: boolean) => {
      if (told.has(runId) || hub.watched(conversation.id, conversation.personId)) return
      const to = store.personEmail(conversation.personId)
      if (to === undefined) return
      told.add(runId)
      void deliver(
        store,
        mailer,
        stoppedEmail('deleted', {
          app,
          conversation,
          first,
          to,
          origin,
          key: `${projectId}:deleted:${runId}`,
        }),
        wait,
      )
    }
    for (const [runId, one] of held)
      if (one.conversation.projectId === projectId) {
        held.delete(runId)
        clearTimeout(one.timer)
        tell(one.conversation, runId, one.first)
      }
    for (const conversation of store.conversationsOn(projectId)) {
      const run = store.latestRun(conversation.id)
      const going = run?.status === 'working' || run?.status === 'paused'
      if (run === undefined || !going || !hub.busy(conversation.id)) continue
      tell(conversation, run.id, pieceOf(store, conversation.id).kind === 'first')
    }
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

  /**
   * Once an hour, the first a minute after a start (m67): each conversation waiting on its person
   * for a day, said once per wait.
   */
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
    // A replay's questions, once it is over: only those its own answers left waiting (m108).
    const carried = one.asking.splice(0)
    if (carried.length > 0) {
      const ends = tokenEndsOf(store.mintedOn(projectId))
      const waiting = new Set(
        questionsOf(store.historyOf(projectId), now().getTime(), ends).map(
          (question) => question.pendingActionId,
        ),
      )
      for (const entry of carried) {
        const { pendingActionId } = (entry.detail ?? {}) as { pendingActionId?: unknown }
        if (typeof pendingActionId === 'string' && waiting.has(pendingActionId))
          asked(entry)
      }
    }
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

  /** Reads the app, its members or both again; answers the members read, kept or not. */
  async function refresh(
    projectId: string,
    one: Open,
    what: 'app' | 'members' | 'both',
  ): Promise<KeptMember[] | undefined> {
    try {
      if (what !== 'members') {
        const app = await watching.app(one.token, projectId)
        if (isCurrent(projectId, one) && app.projectId === projectId) store.putApp(app)
      }
      if (what !== 'app') {
        const asked = ++one.membersAsked
        const members = await watching.members(one.token, projectId)
        // Every app has an owner, so a read that lists nobody is not believed: it would end
        // everyone's work (minors m80). The next read says again; it moves nothing believed.
        if (members.length === 0) return undefined
        // Answered after a newer one, or after a member event it began before: not kept (m81).
        if (asked > one.membersBelieved && isCurrent(projectId, one)) {
          one.membersBelieved = asked
          keepMembers(projectId, members)
        }
        return members
      }
    } catch {
      // A refused token's stream says so itself; anything else is read again at the next event
      // or reconnect. Never logged: nothing here may carry the token.
    }
    return undefined
  }

  function forget(projectId: string): void {
    deleting(projectId)
    for (const key of leftBy) if (key.startsWith(`${projectId} `)) leftBy.delete(key)
    open.get(projectId)?.watch?.close()
    open.delete(projectId)
    unended.delete(projectId)
    store.forgetApp(projectId)
  }

  return {
    start() {
      stopped = false
      // Review Focus 1: what a stop left claimed and unsent goes now, and never twice.
      void deliverUnfinished(store, mailer, wait)
      // Minors m67 (Rich, "A minute after start"): the first a minute after a start, then hourly,
      // so a server restarted more often than hourly still scans (each wait is said once: its key).
      if (firstScan === undefined && scanning === undefined) {
        firstScan = setTimeout(() => {
          firstScan = undefined
          scan()
          scanning = setInterval(scan, HOUR_MS)
          scanning.unref?.()
        }, MINUTE_MS)
        firstScan.unref?.()
      }
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
      // m76: a held *we need you* is decided now, never lost to a stop (F6 Review Focus 1).
      for (const runId of [...held.keys()]) release(runId)
      stopped = true
      clearTimeout(firstScan)
      firstScan = undefined
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
      // Review Focus 2: another page's hand may have kept a good one while we read. The review's
      // I2: this one read the project, so it is ours (its page revokes it, and that can fail).
      if (good(projectId)) {
        store.noteWatch(projectId, handed.tokenId, handed.expiresAt, now().toISOString())
        return 'current'
      }
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

    deleting,

    workEnded(conversation) {
      // Its own person's page (F6b D3: a colleague reading it is not them).
      if (hub.watched(conversation.id, conversation.personId)) return
      const run = store.latestRun(conversation.id)
      // A round of work (F3's "You can leave"); the intake's and the plan's are watched as they go.
      if (run === undefined) return
      if (conversation.state === 'built')
        return waitingOn(
          conversation,
          () => 'finished',
          (why) => `${why}:${run.id}`,
        )
      // Waiting on them, or stopped by their removal (F6b Decision 5): held a minute (m76).
      const removed = run.status === 'stopped' && run.detail?.stopped?.why === 'removed'
      if (removed || chipOf(conversation, run, hub.busy(conversation.id)) === 'attention')
        hold(conversation, run.id)
    },

    outage: outageOf,

    onRemoved(listener) {
      removed = listener
    },

    left(projectId, personId) {
      // Their own word, whichever arrives first: ours, or the platform's event (the review).
      leftBy.add(`${projectId} ${personId}`)
      const kept = store.members(projectId)
      if (!kept.some((member) => member.userId === personId)) return false
      keepMembers(
        projectId,
        kept.filter((member) => member.userId !== personId),
      )
      return true
    },

    async readMembers(projectId, token) {
      const one = open.get(projectId)
      const asked = one === undefined ? 0 : ++one.membersAsked
      const members = await watching.members(token, projectId)
      if (members.length === 0) return
      if (one !== undefined) {
        if (asked <= one.membersBelieved || !isCurrent(projectId, one)) return
        one.membersBelieved = asked
      }
      keepMembers(projectId, members)
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
  deleting: () => undefined,
  workEnded: () => undefined,
  outage: () => ({ state: 'answering', recovered: null }),
  onRemoved: () => undefined,
  left: () => false,
  readMembers: () => Promise.resolve(),
}
