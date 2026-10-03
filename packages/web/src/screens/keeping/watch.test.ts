// @vitest-environment jsdom
import type { Schemas } from '@manifest/contract'
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { ensureWatch, useWatch, WATCH_NAME } from './watch.js'

/**
 * F6 TASK 8: THE KEEPING WATCH TOKEN, MINTED WHEN AN APP HAS NONE (design §1, Decision 5). In the
 * person's session, no step-up: one token per app, *Keeping watch*, `project:read` and
 * `output:read`, a year. Our server keeps the first good one; a page that minted a second revokes
 * its own (Review Focus 2). Nothing for an app switched off (Review Focus 4). It never throws: a
 * failure waits for the next visit. A recording Platform and Ours; what was SENT is asserted (S1:
 * M8: the mock answers its example whatever is asked).
 */
const P = '11111111-1111-4111-8111-111111111111'
const NOW = new Date('2026-10-01T18:00:00.000Z')
const DAY = 86_400_000
const inDays = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString()
const OLD = 'a0000000-0000-4000-8000-0000000000aa'
const NEW = 'b0000000-0000-4000-8000-0000000000bb'

type Status = Awaited<ReturnType<Ours['keeping']>>

function fakes(
  options: {
    status?: Status | (() => Promise<Status>)
    kept?: 'new' | 'current'
    mint?: () => Promise<Schemas['MintedToken']>
    hand?: () => Promise<never>
  } = {},
) {
  const did: string[] = []
  const minted: Schemas['MintTokenRequest'][] = []
  const handed: {
    projectId: string
    token: string
    tokenId: string
    expiresAt: string
  }[] = []
  const status = options.status ?? {
    watching: false,
    until: null,
    tokenId: null,
    mine: false,
  }
  const platform = {
    mintToken: async (projectId: string, body: Schemas['MintTokenRequest']) => {
      did.push(`mint ${projectId}`)
      minted.push(body)
      if (options.mint) return options.mint()
      return {
        token: { id: NEW, expiresAt: inDays(365) },
        secret: `mft_${NEW}_s`,
      } as unknown as Schemas['MintedToken']
    },
    revokeToken: async (tokenId: string) => {
      did.push(`revoke ${tokenId}`)
      return {} as Schemas['Token']
    },
  } as unknown as Platform
  const ours = {
    keeping: async (projectId: string) => {
      did.push(`keeping ${projectId}`)
      return typeof status === 'function' ? status() : status
    },
    handWatch: async (
      projectId: string,
      h: { token: string; tokenId: string; expiresAt: string },
    ) => {
      did.push(`hand ${projectId}`)
      handed.push({ projectId, ...h })
      if (options.hand) return options.hand()
      return { kept: options.kept ?? 'new' }
    },
  } as unknown as Ours
  return { platform, ours, did, minted, handed }
}

const active = { id: P, state: 'active' as const }

describe('ensureWatch (design §1, Decision 5)', () => {
  it('not watching: mints exactly a Keeping watch token, and hands over its secret, its id and when it expires', async () => {
    const f = fakes()
    await ensureWatch(f.platform, f.ours, active, NOW)
    expect(f.minted).toEqual([
      {
        name: 'Keeping watch',
        capabilities: ['project:read', 'output:read'],
        expiresInDays: 365,
      },
    ])
    expect(WATCH_NAME).toBe('Keeping watch')
    expect(f.handed).toEqual([
      { projectId: P, token: `mft_${NEW}_s`, tokenId: NEW, expiresAt: inDays(365) },
    ])
    expect(f.did).toEqual([`keeping ${P}`, `mint ${P}`, `hand ${P}`])
  })

  it('watching, with 200 days left: nothing more', async () => {
    const f = fakes({
      status: { watching: true, until: inDays(200), tokenId: OLD, mine: true },
    })
    await ensureWatch(f.platform, f.ours, active, NOW)
    expect(f.did).toEqual([`keeping ${P}`])
  })

  it('watching with 20 days left: a new one, and the old one revoked because they minted it', async () => {
    const f = fakes({
      status: { watching: true, until: inDays(20), tokenId: OLD, mine: true },
    })
    await ensureWatch(f.platform, f.ours, active, NOW)
    expect(f.did).toEqual([`keeping ${P}`, `mint ${P}`, `hand ${P}`, `revoke ${OLD}`])
  })

  it('watching with 20 days left on someone else’s token: a new one, and theirs left to expire (only its minter may revoke)', async () => {
    const f = fakes({
      status: { watching: true, until: inDays(20), tokenId: OLD, mine: false },
    })
    await ensureWatch(f.platform, f.ours, active, NOW)
    expect(f.did).toEqual([`keeping ${P}`, `mint ${P}`, `hand ${P}`])
  })

  it('our server already has a good one (current, Review Focus 2): the one just minted is revoked', async () => {
    const f = fakes({ kept: 'current' })
    await ensureWatch(f.platform, f.ours, active, NOW)
    expect(f.did).toEqual([`keeping ${P}`, `mint ${P}`, `hand ${P}`, `revoke ${NEW}`])
  })

  it('switched off (Review Focus 4): nothing at all, not even asked', async () => {
    const f = fakes()
    await ensureWatch(f.platform, f.ours, { id: P, state: 'archived' }, NOW)
    expect(f.did).toEqual([])
  })

  it('our server’s hand-over fails after the mint (minors m66): the token just minted is revoked, nothing thrown', async () => {
    const f = fakes({ hand: () => Promise.reject(new Error('UNREACHABLE')) })
    await expect(ensureWatch(f.platform, f.ours, active, NOW)).resolves.toBeUndefined()
    expect(f.did).toEqual([`keeping ${P}`, `mint ${P}`, `hand ${P}`, `revoke ${NEW}`])
  })

  it('the hand-over fails on someone’s own old token: only the new one is revoked, theirs is still our server’s', async () => {
    const f = fakes({
      status: { watching: true, until: inDays(20), tokenId: OLD, mine: true },
      hand: () => Promise.reject(new Error('UNREACHABLE')),
    })
    await ensureWatch(f.platform, f.ours, active, NOW)
    expect(f.did).toEqual([`keeping ${P}`, `mint ${P}`, `hand ${P}`, `revoke ${NEW}`])
  })

  it.each([
    ['our server refuses', { status: () => Promise.reject(new Error('NOT_FOUND')) }],
    [
      'the platform refuses the mint',
      { mint: () => Promise.reject(new Error('PROJECT_ARCHIVED')) },
    ],
    [
      'our server answers something else',
      { status: { nothing: 'here' } as unknown as Status },
    ],
  ])('%s: nothing thrown, nothing more', async (_name, options) => {
    const f = fakes(options)
    await expect(ensureWatch(f.platform, f.ours, active, NOW)).resolves.toBeUndefined()
    expect(f.did.filter((d) => d.startsWith('hand') || d.startsWith('revoke'))).toEqual(
      [],
    )
  })
})

describe('useWatch: once per project, on every app page', () => {
  afterEach(() => undefined)
  const project = (id: string, state: 'active' | 'archived' = 'active') =>
    ({ id, state }) as Schemas['Project']

  it('asks once for a project, not again when the page draws again, and again for another', async () => {
    const f = fakes({
      status: { watching: true, until: inDays(200), tokenId: OLD, mine: true },
    })
    const { rerender } = renderHook(
      ({ p }: { p: Schemas['Project'] | undefined }) => useWatch(f.platform, f.ours, p),
      { initialProps: { p: undefined as Schemas['Project'] | undefined } },
    )
    expect(f.did).toEqual([])
    rerender({ p: project(P) })
    rerender({ p: { ...project(P) } })
    await Promise.resolve()
    rerender({ p: project('22222222-2222-4222-8222-222222222222') })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(f.did).toEqual([
      `keeping ${P}`,
      'keeping 22222222-2222-4222-8222-222222222222',
    ])
  })
})
