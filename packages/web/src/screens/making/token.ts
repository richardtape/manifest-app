import type { Schemas } from '@manifest/contract'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'

/**
 * THE CONVERSATION'S TOKEN (walk-through moment 4; sitting 1's M1): everything building
 * needs, and nothing a delegated token may never hold. Seven days, named after the
 * conversation, so `AgentSession.via` names the thread.
 */
export const CAPABILITIES: Schemas['MintTokenRequest']['capabilities'] = [
  'project:read',
  'source:write',
  'secret:write',
  'build:create',
  'release:create',
  'release:deploy',
  'output:read',
  'agent:session',
]

export function mintRequest(title: string): Schemas['MintTokenRequest'] {
  return {
    name: `Building — ${title}`.slice(0, 64),
    capabilities: CAPABILITIES,
    expiresInDays: 7,
  }
}

/**
 * A NEW TOKEN, MINTED AND HANDED OVER: after a restart our server has none (Decision 1), or
 * the platform refused the one it had. Its own Idempotency-Key: a repeat is
 * TOKEN_ALREADY_MINTED, and the secret is never answered again. Throws what it met.
 */
export async function handOverToken(
  platform: Platform,
  ours: Ours,
  conversation: { id: string; title: string },
  projectId: string,
): Promise<void> {
  const minted = await platform.mintToken(
    projectId,
    mintRequest(conversation.title),
    crypto.randomUUID(),
  )
  await ours.handProject(conversation.id, { projectId, token: minted.secret })
}
