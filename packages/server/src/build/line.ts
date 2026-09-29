import { publishLine, publishState, type Hub } from '../api/events.js'
import { holderOf, holds, lineOf } from '../api/line-state.js'
import { pieceOf } from '../api/piece-state.js'
import type { LineView } from '../api/progress.js'
import type { ConversationTokens } from '../platform/project.js'
import type { Conversation, Run, Store } from '../store/db.js'
import type { Rounds } from './round.js'

/**
 * THE LINE: ONE CONVERSATION WORKS ON AN APP AT A TIME (Rich; F4 Decision 5). The others wait,
 * oldest first, and the next starts by itself when the app is freed: built, stopped, or set
 * aside. The holder is derived (`holds`, in `api/line-state.ts`, with work still in flight);
 * only the waiting order is kept, in the store, so it outlives a restart.
 */
export interface Line {
  /** Does this conversation hold its app now? Decision 5's rule, in one place. */
  holds(conversation: Conversation, run: Run | undefined): boolean
  holder(projectId: string): Conversation | undefined
  /** It wants the app: it holds it if it is free, else it waits. */
  join(conversation: Conversation): 'holding' | 'waiting'
  /** Its piece ended (built, stopped, set aside): the next waiting one starts by itself. */
  released(projectId: string | null): void
  /** At boot: every app with a waiting conversation and no holder starts its next. */
  onBoot(): void
  /** Its place, and who holds the app: null unless it waits. */
  position(conversation: Conversation): LineView | null
}

export function createLine(deps: {
  store: Store
  hub: Hub
  /** Starts a conversation that reached the front: its change planned, its fix built, its round carried on. */
  begin: (conversation: Conversation) => void
  now: () => Date
}): Line {
  const { store, hub } = deps
  const holder = (projectId: string) => holderOf(store, projectId, hub.busy)

  /** Each wait's time, never the same as the last: two joins in one millisecond keep their order. */
  let last = 0
  const stamp = () => {
    last = Math.max(deps.now().getTime(), last + 1)
    return new Date(last).toISOString()
  }

  /**
   * THE FRONT OF THE LINE, IF THE APP IS FREE: its oldest wait begins, and the rest are told
   * their new places. Synchronous from the holder check to the begin, so nothing comes between.
   */
  function advance(projectId: string) {
    if (holder(projectId) !== undefined) return
    const next = store.waitingOn(projectId)[0]
    if (next === undefined) return
    deps.begin(next)
    publishLine(hub, store, projectId)
  }

  return {
    holds,
    holder,
    join(conversation) {
      const projectId = conversation.projectId
      if (projectId === null) throw new Error('a conversation with no app joins no line')
      const waiting = store.setState(conversation.id, 'waiting', {
        waitingSince: stamp(),
      })
      advance(projectId)
      const now = store.getConversation(waiting.id, waiting.personId) ?? waiting
      if (now.state !== 'waiting') return 'holding'
      publishState(hub, store, now)
      return 'waiting'
    },
    released(projectId) {
      if (projectId !== null) advance(projectId)
    },
    onBoot() {
      for (const projectId of store.waitingProjects()) advance(projectId)
    },
    position: (conversation) => lineOf(store, conversation, hub.busy),
  }
}

/**
 * WHAT A CONVERSATION DOES AT THE FRONT OF THE LINE (Decision 5): a stopped round that joined it
 * with *Carry on* carries on, the same round; a fix is built, with no plan to agree; a change is
 * planned. With no token held (a restart forgot it), nothing starts: the page hands one over.
 */
export function beginPiece(deps: {
  store: Store
  tokens: ConversationTokens
  rounds: Pick<Rounds, 'start' | 'carryOn' | 'withoutToken'>
  planning: { begin(conversation: Conversation): void }
}): (conversation: Conversation) => void {
  const { store, tokens, rounds, planning } = deps
  return (conversation) => {
    const token = tokens.get(conversation.id)
    const stopped = store.latestRun(conversation.id)?.status === 'stopped'
    if (stopped || pieceOf(store, conversation.id).kind === 'fix') {
      if (token === undefined) rounds.withoutToken(conversation)
      else if (stopped) rounds.carryOn(conversation, token)
      else rounds.start(conversation, token)
      return
    }
    planning.begin(conversation)
  }
}
