import type { Conversation, Run, Store } from '../store/db.js'
import type { LineView } from './progress.js'

/**
 * THE LINE, FROM THE STORE (F4 Decision 5): which conversation holds an app, and where each
 * waiting one is. Pure folds, beside the intake's and the round's, so the state frame and the
 * line (`build/line.ts`) read the same rule. Only the waiting order is kept; the holder is
 * derived.
 */

/** Its latest round: a building conversation holds its app unless that round was stopped. */
const LET_GO = new Set(['stopped', 'done'])

/**
 * DOES THIS CONVERSATION HOLD ITS APP NOW? From the moment it reaches the front until its latest
 * piece of work is built, stopped or set aside: planning, waiting for Yes, a round's question, a
 * checkpoint and an interruption all hold it (Rich's rule). The first conversation holds it from
 * Make it. A conversation still in its intake has no app to hold.
 */
export function holds(conversation: Conversation, run: Run | undefined): boolean {
  if (conversation.projectId === null) return false
  switch (conversation.state) {
    case 'making':
    case 'planning':
    case 'plan-ready':
    case 'agreed':
    case 'paused':
      return true
    case 'building':
      return run === undefined || !LET_GO.has(run.status)
    default:
      return false
  }
}

/**
 * THE HOLDER: the conversation the rule says holds the app, or one whose work is still in flight
 * (M7-1: a stopped round holds it until what it had in flight returns; never freed at the press).
 */
export function holderOf(
  store: Store,
  projectId: string,
  busy: (conversationId: string) => boolean,
): Conversation | undefined {
  const on = store.conversationsOn(projectId).filter((c) => c.state !== 'waiting')
  return on.find((c) => holds(c, store.latestRun(c.id))) ?? on.find((c) => busy(c.id))
}

/** The holder waits on the person: its plan wants their Yes, its round a question or a Carry on. */
export function waitsOnPerson(
  conversation: Conversation,
  run: Run | undefined,
  busy: boolean,
): boolean {
  switch (conversation.state) {
    case 'plan-ready':
    case 'paused':
      return true
    case 'planning':
      // No planner at work: a restart forgot it, and the page offers Carry on.
      return !busy
    case 'building':
      return (
        run !== undefined &&
        (run.status === 'paused' ||
          run.status === 'needs-you' ||
          run.status === 'interrupted')
      )
    default:
      return false
  }
}

/** Where a waiting conversation is: its place, and who holds the app. Null unless it waits. */
export function lineOf(
  store: Store,
  conversation: Conversation,
  busy: (conversationId: string) => boolean,
): LineView | null {
  if (conversation.state !== 'waiting' || conversation.projectId === null) return null
  const waiting = store.waitingOn(conversation.projectId)
  const place = waiting.findIndex((c) => c.id === conversation.id) + 1
  const holder = holderOf(store, conversation.projectId, busy)
  return {
    place: place === 0 ? waiting.length + 1 : place,
    holder:
      holder === undefined
        ? null
        : {
            id: holder.id,
            title: holder.title,
            by: store.personName(holder.personId),
            waitingForYou: waitsOnPerson(
              holder,
              store.latestRun(holder.id),
              busy(holder.id),
            ),
          },
  }
}
