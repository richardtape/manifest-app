import type { FastifyReply } from 'fastify'
import { ModelError } from '../model/client.js'
import { PlatformRefusal } from '../platform/refusal.js'
import type { Conversation, ConversationState, Store } from '../store/db.js'
import { publishRefusal, publishState, type Hub } from './events.js'
import type { Allowance, StepKey } from './progress.js'
import { mayAct, reachable } from './sharing.js'

/**
 * A STEP'S OWN REFUSAL, by our code: what the step itself decided, with what the person must
 * be told (a spent allowance says whose it is and when it resets).
 */
export class Refused extends Error {
  constructor(
    readonly code: string,
    readonly allowance?: Allowance,
  ) {
    super(code)
    this.name = 'Refused'
  }
}

/**
 * ONE PIECE OF WORK PER CONVERSATION, IN THE BACKGROUND (F2 Tasks 5 and 9), shared by every
 * route that works on one, so no two run at once.
 */
export interface Work {
  /**
   * The person's conversation in one of `states`, not already working; else it has replied.
   * Synchronous on purpose: nothing may run between its busy check and `run`'s claim, or two
   * presses at once would both pass.
   */
  mine(
    request: { params: { id: string } },
    reply: FastifyReply,
    who: { person: { id: string } },
    states: ConversationState[],
  ): Conversation | undefined
  /**
   * The work, from its first step: `next` ends one step and begins another. Its answer is the
   * state to move to, or none; a refusal halts the step it met, and is published with its
   * reference. Anything unexpected is ours, said as INTERNAL, with its stack to the output.
   * The conversation stays where it was, so the person can carry on. A round of work (F3)
   * passes no first step: its steps travel whole in its `RoundView`, never as step frames.
   */
  run(
    conversation: Conversation,
    first: StepKey | null,
    work: (next: (key: StepKey) => void) => Promise<ConversationState | undefined>,
  ): void
  moveTo(conversation: Conversation, state: ConversationState): Conversation
}

const refuse = (reply: FastifyReply, status: number, code: string) =>
  reply.code(status).send({ error: { code } })

/**
 * `ended` is told each time a piece of work ends, after its claim is released: the app's line
 * starts its next conversation if nothing holds the app now (F4 M7-1: a stopped round frees it
 * when what it had in flight has returned, never at the press).
 */
export function createWork(
  hub: Hub,
  store: Store,
  ended: (conversation: Conversation) => void = () => undefined,
): Work {
  /**
   * EACH RUN'S OWN CLAIM, released by that run alone (F3 Task 9): agree's run starts round 1
   * from inside itself (Decision 11), and its end must never free the round's claim. The hub
   * keeps them, so the line and the state frame see work in flight (F4).
   */
  const step = (id: string, key: StepKey | null, state: 'now' | 'done' | 'halted') => {
    if (key !== null) hub.publish(id, { kind: 'step', step: key, state })
  }
  const moveTo = (conversation: Conversation, state: ConversationState) => {
    const moved = store.setState(conversation.id, state)
    publishState(hub, store, moved)
    return moved
  }
  /** The conversation as it is now, whoever last changed it. */
  const now = (conversation: Conversation) =>
    store.getConversation(conversation.id, conversation.personId) ?? conversation

  return {
    moveTo,
    mine(request, reply, who, states) {
      // Its own person's alone (D3); someone taken off the app no longer (F6b Decision 5).
      const conversation = reachable(store, request.params.id, who.person.id, mayAct)
      if (conversation === undefined) return void refuse(reply, 404, 'NOT_FOUND')
      if (hub.busy(conversation.id)) return void refuse(reply, 409, 'CONVERSATION_BUSY')
      if (!states.includes(conversation.state))
        return void refuse(reply, 409, 'CONVERSATION_STATE')
      return conversation
    },
    run(conversation, first, work) {
      const claim = hub.claim(conversation.id)
      let current = first
      step(conversation.id, current, 'now')
      const next = (key: StepKey) => {
        step(conversation.id, current, 'done')
        current = key
        step(conversation.id, current, 'now')
      }
      void work(next)
        .then(
          (state) => {
            step(conversation.id, current, 'done')
            if (state === undefined) publishState(hub, store, now(conversation))
            else moveTo(conversation, state)
          },
          (error: unknown) => {
            step(conversation.id, current, 'halted')
            const known =
              error instanceof ModelError ||
              error instanceof PlatformRefusal ||
              error instanceof Refused
            if (!known) console.error(error)
            publishRefusal(hub, store, {
              conversation,
              code: known ? error.code : 'INTERNAL',
              operation: `conversation ${current ?? 'round'}`,
              allowance: error instanceof Refused ? error.allowance : undefined,
              requestId:
                error instanceof PlatformRefusal || error instanceof ModelError
                  ? error.requestId
                  : null,
            })
          },
        )
        .finally(() => {
          if (hub.unclaim(conversation.id, claim)) ended(now(conversation))
        })
    },
  }
}
