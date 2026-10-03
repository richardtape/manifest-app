import type { Schemas } from '@manifest/contract'
import type { KeptTokens, Whose } from '@manifest-app/server/progress'
import { words } from '../../words.js'

/**
 * F6b TASK 11: *AGENTS*, PURE (design §4, D5). What a token may do, in words: the eleven a person
 * may mint (`mintToken` refuses the rest, `TOKEN_CAPABILITY_FORBIDDEN`), and an unknown one by its
 * name, never dropped. Which tokens are listed: the active alone, ours told from theirs by the ids
 * our server keeps, and each one's maker as the platform names it (`Token.mintedBy`, FE-49).
 */
export const CAPABILITY_WORDS: Record<string, string> = words.agents.capabilities

type Capability = Schemas['MintTokenRequest']['capabilities'][number]

/** The eleven a person may mint, in the platform's order: *Let an agent of your own in*'s boxes. */
export const MINTABLE: readonly Capability[] = [
  'project:read',
  'project:write',
  'source:write',
  'secret:write',
  'output:read',
  'agent:session',
  'build:create',
  'release:create',
  'release:deploy',
  'launch:draft',
  'approval:request',
]

/** Each in our words, in the order given; an unknown one by its name. */
export function capabilityWords(capabilities: string[]): string[] {
  return capabilities.map((capability) =>
    Object.hasOwn(CAPABILITY_WORDS, capability)
      ? CAPABILITY_WORDS[capability]!
      : capability,
  )
}

/** Not revoked, not expired, and not past its own expiry (the platform computes `expired` when read). */
export function activeOf(token: Schemas['Token'], now: Date): boolean {
  return (
    token.revokedAt === null &&
    !token.expired &&
    Date.parse(token.expiresAt) > now.getTime()
  )
}

export interface Row {
  token: Schemas['Token']
  /** One of ours (D5): what it is for, and a conversation's title and id. */
  ours: {
    what: 'conversation' | 'watch' | 'privacy'
    title: string | null
    conversationId: string | null
  } | null
  /**
   * Who made it, the only person who may revoke it: the platform's `Token.mintedBy` (FE-49, its
   * faculty-ready Task 13), named as `listMembers` names them, `null` when the list does not.
   */
  minter: { id: string; name: string | null }
}

/** The active tokens, in the platform's order (newest first), each told as ours or theirs. */
export function rowsOf(
  tokens: Schemas['Token'][],
  kept: KeptTokens,
  members: Pick<Schemas['Member'], 'userId' | 'displayName'>[],
  now: Date,
): Row[] {
  const ours = new Map(kept.ours.map((one) => [one.tokenId, one]))
  const names = new Map(members.map((member) => [member.userId, member.displayName]))
  return tokens
    .filter((token) => activeOf(token, now))
    .map((token) => {
      const one = ours.get(token.id)
      return {
        token,
        ours:
          one === undefined
            ? null
            : { what: one.purpose, title: one.title, conversationId: one.conversationId },
        minter: { id: token.mintedBy, name: names.get(token.mintedBy) ?? null },
      }
    })
}

/** A sentence's words around one place, so a name can sit in it in mono (`words.ts` keeps it whole). */
export function around(sentence: (said: string) => string): [string, string] {
  const [before = '', after = ''] = sentence('\u0000').split('\u0000')
  return [before, after]
}

/**
 * m129 (Rich's words, 2026-10-03): whose agent asks, by `Token.mintedBy` (FE-49) against the reader:
 * their own, or another's by the members' name for its maker (null: the list does not name them).
 */
export type { Whose }

/** A question to put to the person, its agent's name (the list's), and whose agent it is. */
export interface Asking {
  action: Schemas['PendingAction']
  tokenName: string
  whose: Whose
}

/**
 * F6b TASK 12: THE QUESTIONS ASKED, in the platform's order (newest first): still `pending`, not
 * past its own expiry, and **its agent still able to act** (Decision 16). Since the platform's
 * faculty-ready Task 13 (FE-52) a revoke, a removal or a switch-off ends the token's questions at
 * once (`expired`), and a question never outlives its token; the token's check stays, as a
 * question's own state does, for whatever is read between the two. `listPendingActions` takes no
 * `?state=` ((S1: M4)): filtered here.
 */
export function askingOf(
  actions: Schemas['PendingAction'][],
  tokens: Schemas['Token'][],
  members: Pick<Schemas['Member'], 'userId' | 'displayName'>[],
  readerId: string,
  now: Date,
): Asking[] {
  const active = new Map(
    tokens.filter((token) => activeOf(token, now)).map((token) => [token.id, token]),
  )
  const names = new Map(members.map((member) => [member.userId, member.displayName]))
  return actions.flatMap((action): Asking[] => {
    const token = active.get(action.tokenId)
    if (
      action.state !== 'pending' ||
      Date.parse(action.expiresAt) <= now.getTime() ||
      token === undefined
    )
      return []
    const whose: Whose =
      token.mintedBy === readerId ? 'yours' : { name: names.get(token.mintedBy) ?? null }
    return [{ action, tokenName: token.name, whose }]
  })
}
