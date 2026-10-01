import { PlatformRefusal } from '../platform/refusal.js'
import type { ProjectEvent, ProjectStream, Replay, Watch } from '../platform/stream.js'
import type { Watching } from '../platform/watching.js'
import type { Store } from '../store/db.js'
import { seal, unseal } from './seal.js'

/**
 * THE KEEPER (F6 D4: inside our server, in both modes). One *Keeping watch* token per app, handed
 * over by a member's page and kept sealed (D2); one event stream per token, through F3's
 * `platformStream`, which sees each event once, reconnects after a drop, and stops for good on a
 * refusal (`4401` included). Every event is written once to `history`, as the platform sent it
 * (Decision 1); later tasks read it into lines, emails and *needs you*.
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
}

export type Handed = { token: string; tokenId: string; expiresAt: string }

export interface Keeper {
  /** Every kept token's stream opened. */
  start(): void
  stop(): void
  /** Decision 5. Throws PlatformRefusal when the token cannot read the project. */
  hand(projectId: string, handed: Handed, personId: string): Promise<'kept' | 'current'>
  status(projectId: string): {
    watching: boolean
    until: string | null
    tokenId: string | null
    mintedBy: string | null
  }
  /** Decision 11: its stream closed, and every row forgotten. */
  forget(projectId: string): void
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

/** One open stream, and its token, in memory only. */
interface Open {
  tokenId: string
  token: string
  watch: Watch | undefined
  /** Events handed over since the last replay's report that we already held (a restart's). */
  held: Set<string>
}

const NOT_WATCHING = { watching: false, until: null, tokenId: null, mintedBy: null }

export function createKeeper({ store, key, stream, watching, now }: KeeperDeps): Keeper {
  const open = new Map<string, Open>()
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
    const one: Open = { tokenId, token, watch: undefined, held: new Set() }
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
    const written = store.addHistory({
      id: event.id,
      projectId,
      at: event.at,
      type: event.type,
      detail: event.detail,
    })
    // Held already: a replay after a restart. Its rules ran when it was first written.
    if (!written) {
      one.held.add(event.id)
      return
    }
    if (event.type === 'project.deleted') return forget(projectId)
    if (READS_APP.has(event.type)) void refresh(projectId, one, 'app')
    if (READS_MEMBERS.has(event.type)) void refresh(projectId, one, 'members')
  }

  /**
   * A GAP (Decision 1, FE-7: the replay is the newest 50, with no cursor). When a replay held
   * nothing we already had, and we had something older, we were not watching between the newest
   * event we held and the oldest it replayed: said once, by the oldest replayed event's id.
   */
  function onReplayed(projectId: string, one: Open, replay: Replay): void {
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
        if (isCurrent(projectId, one)) store.putMembers(projectId, members)
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
      for (const one of open.values()) one.watch?.close()
      open.clear()
    },

    async hand(projectId, handed, personId) {
      if (good(projectId)) return 'current'
      const app = await watching.app(handed.token, projectId)
      if (app.projectId !== projectId)
        throw new PlatformRefusal('TOKEN_NOT_FOR_PROJECT', null)
      const members = await watching.members(handed.token, projectId)
      // Review Focus 2: another page's hand may have kept a good one while we read.
      if (good(projectId)) return 'current'
      store.putApp(app)
      store.putMembers(projectId, members)
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
  }
}

/** A keeper that keeps nothing: buildServer's default, for tests that do not need one. */
export const idleKeeper: Keeper = {
  start: () => undefined,
  stop: () => undefined,
  hand: () => Promise.reject(new PlatformRefusal('PLATFORM_UNAVAILABLE', null)),
  status: () => NOT_WATCHING,
  forget: () => undefined,
}
