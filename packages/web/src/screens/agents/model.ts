import type { Schemas } from '@manifest/contract'
import type { KeptTokens } from '@manifest-app/server/progress'
import { words } from '../../words.js'

/**
 * F6b TASK 11: *AGENTS*, PURE (design §4, D5). What a token may do, in words: the eleven a person
 * may mint (`mintToken` refuses the rest, `TOKEN_CAPABILITY_FORBIDDEN`), and an unknown one by its
 * name, never dropped. Which tokens are listed: the active alone, ours told from theirs by the ids
 * our server keeps, an agent's minter where our page made it (FE-49: the platform names none).
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
  /** Who made an agent, when our page minted it (Decision 4); otherwise nobody we know. */
  minter: { id: string; name: string } | null
}

/** The active tokens, in the platform's order (newest first), each told as ours or theirs. */
export function rowsOf(tokens: Schemas['Token'][], kept: KeptTokens, now: Date): Row[] {
  const ours = new Map(kept.ours.map((one) => [one.tokenId, one]))
  const agents = new Map(kept.agents.map((one) => [one.tokenId, one.by]))
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
        minter: agents.get(token.id) ?? null,
      }
    })
}

/** A sentence's words around one place, so a name can sit in it in mono (`words.ts` keeps it whole). */
export function around(sentence: (said: string) => string): [string, string] {
  const [before = '', after = ''] = sentence('\u0000').split('\u0000')
  return [before, after]
}

/** A question to put to the person, and its agent's name (the list's). */
export interface Asking {
  action: Schemas['PendingAction']
  tokenName: string
}

/**
 * F6b TASK 12: THE QUESTIONS ASKED, in the platform's order (newest first): still `pending`, not
 * past its day, and **its agent still able to act** (Decision 16, FE-52: a revoked or expired
 * token's question stays `pending` on the platform, and a yes to it does nothing). `listPendingActions`
 * takes no `?state=` ((S1: M4)): filtered here.
 */
export function askingOf(
  actions: Schemas['PendingAction'][],
  tokens: Schemas['Token'][],
  now: Date,
): Asking[] {
  const active = new Map(
    tokens.filter((token) => activeOf(token, now)).map((token) => [token.id, token.name]),
  )
  return actions.flatMap((action) => {
    const tokenName = active.get(action.tokenId)
    return action.state === 'pending' &&
      Date.parse(action.expiresAt) > now.getTime() &&
      tokenName !== undefined
      ? [{ action, tokenName }]
      : []
  })
}
