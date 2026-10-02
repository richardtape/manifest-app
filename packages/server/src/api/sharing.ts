import type { Conversation, Store } from '../store/db.js'
import type { KeptMember } from '../store/keeping.js'

/**
 * F6b D3, SEE ALL, ACT ON YOUR OWN (Decision 1): who someone is to a conversation, from F6's kept
 * members alone. Our server has no person's session to ask the platform with (FE-2), so the kept
 * members are the rule's only reader; the platform still decides everything that reaches it.
 * - **Reads** widen to every member of the conversation's app; **every change stays its own
 *   person's**, and **Stop** is also an owner's, to free the app.
 * - **An intake conversation** (no app yet) is its own person's alone.
 * - **No kept members** (an app the keeper does not keep): its own person only, as before F6b.
 * - **Someone taken off the app** (kept members that no longer list them: Decision 5) is a stranger
 *   to their own conversations on it, which its members still read.
 */
export type Standing = 'own' | 'owner' | 'member' | 'stranger'

export function standingOf(
  conversation: Pick<Conversation, 'personId' | 'projectId'>,
  personId: string,
  members: KeptMember[],
): Standing {
  const member = members.find((m) => m.userId === personId)
  if (conversation.personId === personId)
    // F6b Decision 5: someone taken off the app is no longer its own person here.
    return conversation.projectId === null || members.length === 0 || member !== undefined
      ? 'own'
      : 'stranger'
  if (conversation.projectId === null || member === undefined) return 'stranger'
  return member.role === 'owner' ? 'owner' : 'member'
}

export const mayRead = (standing: Standing): boolean => standing !== 'stranger'
/** Every change to a conversation: its own person's alone (D3). */
export const mayAct = (standing: Standing): boolean => standing === 'own'
export const mayStop = (standing: Standing): boolean =>
  standing === 'own' || standing === 'owner'

/**
 * THE CONVERSATION, WHEN THIS PERSON'S STANDING MAY (`mayRead` or `mayStop`); else undefined, which
 * a route answers `404`, exactly as one that does not exist (Decision 2).
 */
export function reachable(
  store: Pick<Store, 'conversationById' | 'members'>,
  id: string,
  personId: string,
  may: (standing: Standing) => boolean,
): Conversation | undefined {
  const conversation = store.conversationById(id)
  if (conversation === undefined) return undefined
  const members =
    conversation.projectId === null ? [] : store.members(conversation.projectId)
  return may(standingOf(conversation, personId, members)) ? conversation : undefined
}
