import type { Line } from '../build/line.js'
import type { Rounds } from '../build/round.js'
import type { Conversation, Store } from '../store/db.js'
import { publishState, type Hub } from './events.js'

/** A round that may still be running: Stop reaches it while it works (F3 Task 9). */
const RUNNING = new Set(['building', 'paused'])
/** A change not yet under way: Stop sets it aside (*Not now*, *Leave the line*). */
const NOT_STARTED = new Set(['waiting', 'planning', 'plan-ready'])

/**
 * STOP'S BODY (F3 Task 9, F4 Decision 5), shared by Stop, an owner's Stop on another's
 * conversation (F6b D3) and a member taken off the app (F6b Decision 5). Whatever the draft
 * address has, it keeps; the app is freed, and the next in line starts by itself.
 * - **A round** is stopped, recorded `stopped` (who, and why), and frees the app when what it had
 *   in flight returns (M7-1).
 * - **Waiting in the line:** a stopped round goes back to its Stop; a change is set aside.
 * - **Planned, or planning:** set aside, and the app freed. The first plan's *Not now* is refused
 *   by the route before this: it has nothing to go back to.
 * Anything else has no work to end: nothing happens. `true` when it ended something.
 */
export function endWork(
  deps: { store: Store; hub: Hub; rounds: Rounds; line: Line },
  conversation: Conversation,
  stopped: { by: string; why: 'stopped' | 'removed' },
): boolean {
  const { store, hub, rounds, line } = deps
  if (RUNNING.has(conversation.state)) {
    rounds.stop(conversation, stopped)
    line.released(conversation.projectId)
    return true
  }
  if (!NOT_STARTED.has(conversation.state)) return false
  if (conversation.state === 'waiting') {
    const roundStopped = store.latestRun(conversation.id)?.status === 'stopped'
    publishState(
      hub,
      store,
      store.setState(conversation.id, roundStopped ? 'building' : 'set-aside'),
    )
    return true
  }
  publishState(hub, store, store.setState(conversation.id, 'set-aside'))
  line.released(conversation.projectId)
  return true
}
