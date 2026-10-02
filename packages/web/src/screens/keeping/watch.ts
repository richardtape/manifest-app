import type { Schemas } from '@manifest/contract'
import { useEffect } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'

/**
 * F6 TASK 8: THE KEEPING WATCH TOKEN (design §1, Decision 5), minted in the person's session, no
 * second sign-in, any member: one per app, read-only, a year. Our server keeps the first good one
 * and watches the app with it while nobody is looking. Minted at *Make it*, and whenever a member
 * opens *Your apps* or one of the app's pages and our server has no token that works, or one
 * with under 30 days left: every way of losing it mends itself at the next visit.
 */
export const WATCH_NAME = 'Keeping watch'

/** What the watch may do: read the project, and its events. Never more (design §1). */
const WATCH: Schemas['MintTokenRequest'] = {
  name: WATCH_NAME,
  capabilities: ['project:read', 'output:read'],
  expiresInDays: 365,
}

/** Decision 5: a token with less than this left is replaced (our server's own rule). */
const RENEW_MS = 30 * 86_400_000

type Status = Awaited<ReturnType<Ours['keeping']>>

/** Our server's answer, as it must be: anything else is no answer, and nothing is minted. */
const isStatus = (value: unknown): value is Status =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Status).watching === 'boolean' &&
  typeof (value as Status).mine === 'boolean'

const good = (status: Status, now: Date) =>
  status.watching &&
  status.until !== null &&
  Date.parse(status.until) - now.getTime() >= RENEW_MS

/**
 * Mints and hands over when no token works, or under 30 days are left; **never for an app switched
 * off** (Review Focus 4: `mintToken` would be `409 PROJECT_ARCHIVED`). When our server already had
 * a good one, the token just minted is revoked (Review Focus 2); when a new one replaces the
 * person's own, theirs is revoked (only its minter may: another's is left to expire). **Never
 * throws**: a failure waits for the next visit, and says nothing.
 */
export async function ensureWatch(
  platform: Platform,
  ours: Ours,
  project: Pick<Schemas['Project'], 'id' | 'state'>,
  now: Date,
): Promise<void> {
  try {
    if (project.state === 'archived') return
    const status: unknown = await ours.keeping(project.id)
    if (!isStatus(status) || good(status, now)) return
    const minted = await platform.mintToken(project.id, WATCH, crypto.randomUUID())
    const { kept } = await ours.handWatch(project.id, {
      token: minted.secret,
      tokenId: minted.token.id,
      expiresAt: minted.token.expiresAt,
    })
    const revoke = (tokenId: string) =>
      platform.revokeToken(tokenId, crypto.randomUUID()).catch(() => undefined)
    if (kept === 'current') await revoke(minted.token.id)
    else if (status.watching && status.mine && status.tokenId !== null)
      await revoke(status.tokenId)
  } catch {
    // Refused, unreachable, or the app switched off meanwhile: the next visit tries again.
  }
}

/**
 * On every app page, once per project (and again when it is switched back on): the shell's, so
 * each page need not ask.
 */
export function useWatch(
  platform: Platform,
  ours: Ours,
  project: Pick<Schemas['Project'], 'id' | 'state'> | undefined,
): void {
  const id = project?.id
  const state = project?.state
  useEffect(() => {
    if (id === undefined || state === undefined) return
    void ensureWatch(platform, ours, { id, state }, new Date())
  }, [platform, ours, id, state])
}

/**
 * *Your apps*: each app after the page's own reads, **one at a time**, so a person with many apps
 * never sends a burst of mints. Stops when the page goes.
 */
export async function ensureEach(
  platform: Platform,
  ours: Ours,
  projects: Pick<Schemas['Project'], 'id' | 'state'>[],
  live: () => boolean,
): Promise<void> {
  for (const project of projects) {
    if (!live()) return
    await ensureWatch(platform, ours, project, new Date())
  }
}
