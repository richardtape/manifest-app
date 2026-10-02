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
 */
export type Standing = 'own' | 'owner' | 'member' | 'stranger'

export function standingOf(
  conversation: Pick<Conversation, 'personId' | 'projectId'>,
  personId: string,
  members: KeptMember[],
): Standing {
  if (conversation.personId === personId) return 'own'
  if (conversation.projectId === null) return 'stranger'
  const member = members.find((m) => m.userId === personId)
  if (member === undefined) return 'stranger'
  return member.role === 'owner' ? 'owner' : 'member'
}

export const mayRead = (standing: Standing): boolean => standing !== 'stranger'
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
