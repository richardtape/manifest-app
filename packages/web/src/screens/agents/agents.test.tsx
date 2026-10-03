// @vitest-environment jsdom
import { ManifestApiError, type Schemas } from '@manifest/contract'
import { fixtures } from '@manifest/mock'
import type { KeptTokens } from '@manifest-app/server/progress'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import type { Then } from '../../router.js'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { Agents } from './agents.js'
import { askedKey } from './question.js'
import { MINTABLE } from './model.js'

/**
 * F6b TASK 11: *AGENTS* (design §4, D4, D5; *Throughout*'s *An agent of their own*), against a
 * recording `Platform` and `Ours`. Every agent with access: ours told from theirs by the ids our
 * server keeps, never revocable here; theirs revoked by whoever made it (`Token.mintedBy`, FE-49),
 * the platform ending what it still waits on in the same act (FE-52: nothing answered here); one of
 * their own let in, its key shown once and sent nowhere (Review Focus 4). Asserted by what was
 * sent, never by what a fake answered.
 */
const a = words.agents
const SLUG = 'reading-responses'
const PROJECT: Schemas['Project'] = {
  ...fixtures.PROJECT,
  name: 'Reading responses',
  slug: SLUG,
}
const ME: Schemas['Me'] = { ...fixtures.ME, displayName: 'Alex Owner' }
const SAM = { id: 'c0000000-0000-4000-8000-000000000001', name: 'Sam Helper' }
/** Someone who made a token and is not on the members' list as read (taken off meanwhile). */
const GONE_ID = 'c0000000-0000-4000-8000-000000000009'
const member = (
  userId: string,
  displayName: string,
  role: Schemas['Member']['role'],
): Schemas['Member'] => ({
  userId,
  puid: `puid-${userId.slice(-4)}`,
  cwlLogin: displayName.split(' ')[0]!.toLowerCase(),
  displayName,
  email: `${displayName.split(' ')[0]!.toLowerCase()}@example.ubc.ca`,
  role,
})
const MEMBERS = [
  member(ME.id, ME.displayName, 'owner'),
  member(SAM.id, SAM.name, 'collaborator'),
]
const TZ = 'America/Vancouver'
/** Noon in Vancouver, 3 October. */
const NOW = new Date('2026-10-03T19:00:00Z')

const token = (id: string, over: Partial<Schemas['Token']> = {}): Schemas['Token'] => ({
  id,
  projectId: PROJECT.id,
  name: `token ${id}`,
  // Made by the reader, unless its story says someone else (minors m127).
  mintedBy: ME.id,
  capabilities: ['project:read'],
  rateLimit: 600,
  expiresAt: '2026-11-01T19:00:00Z',
  expired: false,
  revokedAt: null,
  lastUsedAt: null,
  createdAt: '2026-10-01T00:00:00Z',
  ...over,
})
const WATCH = token('10000000-0000-4000-8000-000000000001', { name: 'keeping watch' })
const CONV = token('10000000-0000-4000-8000-000000000002', { name: 'conversation' })
const PRIV = token('10000000-0000-4000-8000-000000000003', { name: 'privacy answers' })
const MINE = token('20000000-0000-4000-8000-000000000001', {
  name: 'Claude Code',
  capabilities: ['project:read', 'source:write', 'build:create'],
  // 9:00am in Vancouver, the same day.
  lastUsedAt: '2026-10-03T16:00:00Z',
})
const SAMS = token('20000000-0000-4000-8000-000000000002', {
  name: 'Sam’s builder',
  mintedBy: SAM.id,
})
/** The reader's own, made elsewhere (the console): our server never kept its id. */
const ELSE = token('20000000-0000-4000-8000-000000000003', {
  name: 'from the console',
  capabilities: ['project:read', 'quota:peek'],
})
const REVOKED = token('30000000-0000-4000-8000-000000000001', {
  name: 'an old one',
  revokedAt: '2026-10-02T00:00:00Z',
})
const EXPIRED = token('30000000-0000-4000-8000-000000000002', {
  name: 'a lapsed one',
  expired: true,
  expiresAt: '2026-10-02T00:00:00Z',
})
const TOKENS = [MINE, SAMS, ELSE, WATCH, CONV, PRIV, REVOKED, EXPIRED]
const KEPT: KeptTokens = {
  ours: [
    { tokenId: WATCH.id, purpose: 'watch', conversationId: null, title: null },
    {
      tokenId: CONV.id,
      purpose: 'conversation',
      conversationId: 'conv-1',
      title: 'Add a word count',
    },
    { tokenId: PRIV.id, purpose: 'privacy', conversationId: null, title: null },
  ],
  agents: [{ tokenId: MINE.id }, { tokenId: SAMS.id }],
}
const question = (
  id: string,
  tokenId: string,
  state: Schemas['PendingAction']['state'] = 'pending',
): Schemas['PendingAction'] => ({
  id,
  projectId: PROJECT.id,
  tokenId,
  action: 'members:manage',
  state,
  method: 'POST',
  path: `/v1/projects/${PROJECT.id}/members`,
  bodySha256: 'x',
  summary: 'Add a member to a project',
  expiresAt: '2026-10-04T18:00:00Z',
  createdAt: '2026-10-03T18:00:00Z',
  resolvedAt: null,
  waitingSeconds: 3600,
  reason: null,
  consumedAt: null,
})
const QUESTIONS = [
  question('40000000-0000-4000-8000-000000000001', MINE.id),
  question('40000000-0000-4000-8000-000000000002', MINE.id, 'confirmed'),
  question('40000000-0000-4000-8000-000000000003', ELSE.id),
]
const SECRET = 'mft_50000000-0000-4000-8000-000000000001_c2VjcmV0LW9ubHktb25jZQ'

const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'test')
const never = () => new Promise<never>(() => undefined)
type Answer = 'ok' | 'never' | { status: number; code: string }

function stage(
  options: {
    tokens?: Schemas['Token'][]
    kept?: KeptTokens
    questions?: Schemas['PendingAction'][]
    members?: Schemas['Member'][]
    revoke?: Answer[]
    reject?: Answer[]
    confirm?: Answer[]
    mint?: Answer[]
    keepAgent?: Answer[]
    listTokens?: Answer | Answer[]
    /** The revoke refused, though the platform revoked it (`revokeToken`'s 503 after revoking). */
    revokedAnyway?: boolean
  } = {},
) {
  const calls: [string, ...unknown[]][] = []
  let tokens = options.tokens ?? TOKENS
  let questions = options.questions ?? QUESTIONS
  const turns: Record<string, number> = {}
  const next = (name: 'revoke' | 'reject' | 'confirm' | 'mint' | 'keepAgent'): Answer => {
    const list = options[name] ?? ['ok']
    const turn = turns[name] ?? 0
    turns[name] = turn + 1
    return list[Math.min(turn, list.length - 1)]!
  }
  const answered = <T,>(said: Answer, value: () => T): Promise<T> =>
    said === 'never'
      ? never()
      : typeof said === 'object'
        ? Promise.reject(refused(said.status, said.code))
        : Promise.resolve(value())
  const platform = {
    listTokens: (projectId: string) => {
      calls.push(['listTokens', projectId])
      const list = Array.isArray(options.listTokens)
        ? options.listTokens
        : [options.listTokens ?? 'ok']
      const turn = turns['listTokens'] ?? 0
      turns['listTokens'] = turn + 1
      return answered(list[Math.min(turn, list.length - 1)]!, () => tokens)
    },
    listPendingActions: (projectId: string) => {
      calls.push(['listPendingActions', projectId])
      return Promise.resolve(questions)
    },
    listMembers: (projectId: string) => {
      calls.push(['listMembers', projectId])
      return Promise.resolve(options.members ?? MEMBERS)
    },
    rejectPendingAction: (id: string, reason: string, key: string) => {
      calls.push(['rejectPendingAction', id, reason, key])
      return answered(next('reject'), () => {
        questions = questions.map((one) =>
          one.id === id ? { ...one, state: 'rejected' as const } : one,
        )
        return { ...question(id, ''), state: 'rejected' }
      })
    },
    confirmPendingAction: (id: string, key: string) => {
      calls.push(['confirmPendingAction', id, key])
      return answered(next('confirm'), () => {
        questions = questions.map((one) =>
          one.id === id ? { ...one, state: 'confirmed' as const } : one,
        )
        return { ...question(id, ''), state: 'confirmed' }
      })
    },
    revokeToken: (tokenId: string, key: string) => {
      calls.push(['revokeToken', tokenId, key])
      // As the platform does since its faculty-ready Task 13 (FE-52): revoked, and its waiting
      // questions ended in the same act.
      const revoke = () => {
        tokens = tokens.map((t) =>
          t.id === tokenId ? { ...t, revokedAt: NOW.toISOString() } : t,
        )
        questions = questions.map((one) =>
          one.tokenId === tokenId && one.state === 'pending'
            ? { ...one, state: 'expired' as const }
            : one,
        )
      }
      if (options.revokedAnyway) revoke()
      return answered(next('revoke'), () => {
        revoke()
        return tokens.find((t) => t.id === tokenId)!
      })
    },
    mintToken: (projectId: string, body: Schemas['MintTokenRequest'], key: string) => {
      calls.push(['mintToken', projectId, body, key])
      return answered(next('mint'), () => {
        const made = token('50000000-0000-4000-8000-000000000001', {
          name: body.name,
          capabilities: body.capabilities,
          expiresAt: '2026-11-02T19:00:00Z',
          createdAt: NOW.toISOString(),
        })
        tokens = [made, ...tokens]
        return { token: made, secret: SECRET }
      })
    },
  } as unknown as Platform
  // As our server does: an agent's id kept, listed at the next read (its maker is the token's).
  let kept = options.kept ?? KEPT
  const ours = {
    minted: (projectId: string) => {
      calls.push(['minted', projectId])
      return Promise.resolve(kept)
    },
    keeping: (projectId: string) => {
      calls.push(['keeping', projectId])
      return new Promise(() => undefined)
    },
    keepAgent: (
      projectId: string,
      made: { tokenId: string; name: string; expiresAt: string },
    ) => {
      calls.push(['keepAgent', projectId, made])
      return answered(next('keepAgent'), () => {
        kept = { ...kept, agents: [...kept.agents, { tokenId: made.tokenId }] }
      })
    },
  } as unknown as Ours
  const expire = vi.fn()
  return {
    platform,
    ours,
    expire,
    calls,
    called: (name: string) => calls.filter((c) => c[0] === name).map((c) => c.slice(1)),
  }
}

function open(
  s: ReturnType<typeof stage>,
  role: 'owner' | 'helper' | 'unknown' = 'owner',
  then: Then = null,
) {
  return render(
    <Agents
      platform={s.platform}
      ours={s.ours}
      project={PROJECT}
      me={ME}
      role={role}
      then={then}
      expire={s.expire}
      now={() => NOW}
      timeZone={TZ}
    />,
  )
}

const press = async (element: HTMLElement) => {
  await act(async () => {
    fireEvent.click(element)
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
const button = (name: string | RegExp) => screen.getByRole('button', { name })
/** A row by the token's own name (in mono). */
const rowOf = async (name: string) =>
  (await screen.findAllByText(name))
    .map((found) => found.closest('li.agents__agent'))
    .find((row) => row !== null) as HTMLElement
/** The row of a token's name, if the list has one (its question's card names it too). */
const listed = (name: string) =>
  screen.queryAllByText(name).some((found) => found.closest('li.agents__agent') !== null)
/** The questions' section, if any card is drawn. */
const cardsOf = () =>
  screen.queryByRole('heading', { name: a.question.title })?.closest('section') ?? null
/** The page's words, without what is in mono (a token's own name, its key, an address). */
const prose = () => {
  const copy = document.body.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.mono').forEach((mono) => mono.remove())
  return copy.textContent ?? ''
}
const stored = () =>
  [localStorage, sessionStorage].flatMap((storage) =>
    Array.from({ length: storage.length }, (_, i) => {
      const key = storage.key(i)!
      return `${key}=${storage.getItem(key)}`
    }),
  )

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
afterEach(() => cleanup())

describe('the list (design §4)', () => {
  it('reads the platform’s tokens and our kept ids, in the person’s session, and says whose app', async () => {
    const s = stage()
    open(s)
    expect(
      await screen.findByRole('heading', { level: 1, name: a.title(PROJECT.name) }),
    ).toBeTruthy()
    await rowOf('Claude Code')
    expect(s.called('listTokens')).toEqual([[PROJECT.id]])
    expect(s.called('minted')).toEqual([[PROJECT.id]])
    // Who made each, by name: FE-49's mintedBy is an id.
    expect(s.called('listMembers')).toEqual([[PROJECT.id]])
  })

  it('never lists a revoked or an expired token', async () => {
    open(stage())
    await rowOf('Claude Code')
    expect(screen.queryByText(REVOKED.name)).toBeNull()
    expect(screen.queryByText(EXPIRED.name)).toBeNull()
  })

  it('ours: named for what they do, a conversation’s a link to it, said once to be ours, and never revocable', async () => {
    open(stage())
    const section = (await screen.findByRole('heading', { name: a.ours.title })).closest(
      'section',
    ) as HTMLElement
    const ours = within(section)
    const link = ours.getByRole('link', { name: a.ours.conversation('Add a word count') })
    expect(link.getAttribute('href')).toBe(`/apps/${SLUG}/conversations/conv-1`)
    expect(ours.getByText(a.ours.watch)).toBeTruthy()
    expect(ours.getByText(a.ours.privacy)).toBeTruthy()
    expect(ours.getByText(a.ours.end)).toBeTruthy()
    expect(ours.queryByRole('button')).toBeNull()
    // Their own names are never shown: ours are named in our words.
    expect(section.textContent).not.toContain(WATCH.name)
  })

  it('theirs: the name, what it may do in words (an unknown one by its name), when last used and when it stops', async () => {
    open(stage())
    const mine = await rowOf('Claude Code')
    expect(mine.querySelector('.mono')?.textContent).toBe('Claude Code')
    expect(mine.textContent).toContain(
      a.theirs.may('read the app, change its code and build it'),
    )
    expect(mine.textContent).toContain(a.theirs.lastUsed('today, 9:00am'))
    expect(mine.textContent).toContain(a.theirs.stops('1 November'))
    const other = await rowOf('from the console')
    expect(other.textContent).toContain(a.theirs.neverUsed)
    expect(other.textContent).toContain(a.theirs.may('read the app and quota:peek'))
    // The unknown one is kept, in mono: its name, never dropped and never dressed as words.
    expect(within(other).getByText('quota:peek').className).toContain('mono')
  })

  it('a reading that fails: what went wrong, and Try again', async () => {
    const s = stage({ listTokens: { status: 503, code: 'UNAVAILABLE' } })
    open(s)
    expect(await screen.findByRole('button', { name: words.refused.button })).toBeTruthy()
    expect(listed('Claude Code')).toBe(false)
  })

  it('a session that ended: the shell’s to say', async () => {
    const s = stage({ listTokens: { status: 401, code: 'UNAUTHENTICATED' } })
    open(s)
    await waitFor(() => expect(s.expire).toHaveBeenCalled())
  })

  it('says no machinery, every capability and an unknown one in it', async () => {
    const every = token('20000000-0000-4000-8000-000000000009', {
      name: 'production staging sandbox bot',
      capabilities: [...MINTABLE, 'environment:peek'],
      lastUsedAt: '2026-10-01T16:00:00Z',
    })
    open(stage({ tokens: [every, ...TOKENS] }))
    await rowOf('production staging sandbox bot')
    expect(machineryIn(prose())).toEqual([])
  })
})

describe('[Revoke] (Decision 4; FE-49, Token.mintedBy; (S1: M5))', () => {
  it('on an agent the reader made: (yours), and Revoke', async () => {
    open(stage())
    const mine = within(await rowOf('Claude Code'))
    expect(mine.getByText(a.theirs.yours)).toBeTruthy()
    expect(mine.getByRole('button', { name: a.theirs.revoke })).toBeTruthy()
  })

  it('on an agent someone else made: who made it, and only they can revoke it', async () => {
    open(stage())
    const sams = await rowOf('Sam’s builder')
    expect(sams.textContent).toContain(a.theirs.madeBy(SAM.name))
    expect(sams.textContent).toContain(a.theirs.onlyMinter)
    expect(sams.textContent).not.toContain(a.theirs.yours)
    expect(within(sams).queryByRole('button')).toBeNull()
  })

  it('by its maker, never by our kept ids: one the reader made elsewhere is (yours), with Revoke; one our server kept for someone else is theirs', async () => {
    // Our server kept MINE as the reader's and SAMS as Sam's; the platform says otherwise.
    open(
      stage({
        tokens: [
          { ...MINE, mintedBy: SAM.id },
          { ...SAMS, mintedBy: ME.id },
          ELSE,
          WATCH,
          CONV,
          PRIV,
        ],
      }),
    )
    const other = within(await rowOf('from the console'))
    expect(other.getByText(a.theirs.yours)).toBeTruthy()
    expect(other.getByRole('button', { name: a.theirs.revoke })).toBeTruthy()
    const mine = await rowOf('Claude Code')
    expect(mine.textContent).toContain(a.theirs.madeBy(SAM.name))
    expect(within(mine).queryByRole('button')).toBeNull()
    expect(within(await rowOf('Sam’s builder')).getByText(a.theirs.yours)).toBeTruthy()
  })

  it('someone else’s, its maker not on the members’ list: no name and no press, only they can revoke it', async () => {
    open(stage({ tokens: [{ ...SAMS, mintedBy: GONE_ID }] }))
    const sams = await rowOf('Sam’s builder')
    expect(sams.textContent).toContain(a.theirs.onlyMinter)
    expect(sams.textContent).not.toContain('Made by')
    expect(within(sams).queryByRole('button')).toBeNull()
  })

  it('asked in place first; Keep it sends nothing', async () => {
    const s = stage()
    open(s)
    const mine = within(await rowOf('Claude Code'))
    await press(mine.getByRole('button', { name: a.theirs.revoke }))
    expect(mine.getByText(a.theirs.confirm)).toBeTruthy()
    await press(mine.getByRole('button', { name: a.theirs.keep }))
    expect(s.called('revokeToken')).toEqual([])
    expect(s.called('rejectPendingAction')).toEqual([])
    expect(document.activeElement).toBe(
      mine.getByRole('button', { name: a.theirs.revoke }),
    )
  })

  it('revokes it and answers nothing: the platform ended what it waited on in the same act (FE-52); the list read again, its question gone', async () => {
    const s = stage()
    open(s)
    const mine = within(await rowOf('Claude Code'))
    expect(cardsOf()?.querySelectorAll('.agents__question')).toHaveLength(2)
    await press(mine.getByRole('button', { name: a.theirs.revoke }))
    await press(mine.getByRole('button', { name: a.theirs.revokeConfirm }))
    expect(s.called('revokeToken').map(([id]) => id)).toEqual([MINE.id])
    await waitFor(() => expect(listed('Claude Code')).toBe(false))
    expect(screen.getByRole('status').textContent).toBe(a.theirs.revoked(PROJECT.name))
    // Read again once, after the revoke: no answer of ours (each would be 409 PENDING_ACTION_RESOLVED).
    expect(s.called('listTokens').length).toBe(2)
    expect(s.called('listPendingActions').length).toBe(2)
    expect(s.called('rejectPendingAction')).toEqual([])
    // Its question is gone with it; another agent's still asks.
    await waitFor(() =>
      expect(cardsOf()?.querySelectorAll('.agents__question')).toHaveLength(1),
    )
    expect(cardsOf()?.textContent).toContain(ELSE.name)
  })

  it('a helper revoking their own: revoked the same, nothing answered', async () => {
    const s = stage()
    open(s, 'helper')
    const mine = within(await rowOf('Claude Code'))
    await press(mine.getByRole('button', { name: a.theirs.revoke }))
    await press(mine.getByRole('button', { name: a.theirs.revokeConfirm }))
    expect(s.called('revokeToken').map(([id]) => id)).toEqual([MINE.id])
    await waitFor(() => expect(listed('Claude Code')).toBe(false))
    expect(screen.getByRole('status').textContent).toBe(a.theirs.revoked(PROJECT.name))
    expect(s.called('rejectPendingAction')).toEqual([])
  })

  it('refused 404 at the press: only the person who made it can revoke it; no question answered for it; the list read again (the review’s I1)', async () => {
    const s = stage({ revoke: [{ status: 404, code: 'NOT_FOUND' }] })
    open(s)
    const other = within(await rowOf('from the console'))
    await press(other.getByRole('button', { name: a.theirs.revoke }))
    await press(other.getByRole('button', { name: a.theirs.revokeConfirm }))
    expect((await screen.findByRole('alert')).textContent).toContain(a.theirs.onlyMinter)
    expect(s.called('rejectPendingAction')).toEqual([])
    await waitFor(() => expect(s.called('listTokens').length).toBe(2))
    expect(listed('from the console')).toBe(true)
  })

  it('anything else, and the list read again says it still works: we couldn’t, it still works, a support reference; nothing answered', async () => {
    const s = stage({ revoke: [{ status: 503, code: 'AI_CATALOGUE_DISABLED' }] })
    open(s)
    const mine = within(await rowOf('Claude Code'))
    await press(mine.getByRole('button', { name: a.theirs.revoke }))
    await press(mine.getByRole('button', { name: a.theirs.revokeConfirm }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(a.theirs.couldnt)
    expect(alert.textContent).toMatch(/[0-9A-F]{4}-[0-9A-F]{4}/)
    expect(s.called('rejectPendingAction')).toEqual([])
    expect(listed('Claude Code')).toBe(true)
  })

  it('refused, but the list read again says it is revoked (the platform’s 503 after revoking): said revoked, nothing answered (the review’s minor 1; FE-52)', async () => {
    const s = stage({
      revoke: [{ status: 503, code: 'AI_CATALOGUE_DISABLED' }],
      revokedAnyway: true,
    })
    open(s)
    const mine = within(await rowOf('Claude Code'))
    await press(mine.getByRole('button', { name: a.theirs.revoke }))
    await press(mine.getByRole('button', { name: a.theirs.revokeConfirm }))
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(a.theirs.revoked(PROJECT.name)),
    )
    expect(screen.queryByRole('alert')).toBeNull()
    await waitFor(() => expect(listed('Claude Code')).toBe(false))
    expect(s.called('rejectPendingAction')).toEqual([])
  })

  it('refused, and the list cannot be read again: we can’t tell, said so, never "it still works"', async () => {
    const s = stage({
      revoke: [{ status: 503, code: 'AI_CATALOGUE_DISABLED' }],
      listTokens: ['ok', { status: 503, code: 'UNAVAILABLE' }],
    })
    open(s)
    const mine = within(await rowOf('Claude Code'))
    await press(mine.getByRole('button', { name: a.theirs.revoke }))
    await press(mine.getByRole('button', { name: a.theirs.revokeConfirm }))
    const alert = (await screen.findAllByRole('alert')).find((one) =>
      one.textContent?.includes(a.theirs.unsure),
    )
    expect(alert).toBeTruthy()
    expect(document.body.textContent).not.toContain(a.theirs.couldnt)
  })
})

describe('Let an agent of your own in (Review Focus 4)', () => {
  const m = a.make
  const fill = (name: string, capabilities: string[], days?: number) => {
    fireEvent.change(screen.getByLabelText(m.name), { target: { value: name } })
    for (const capability of capabilities)
      fireEvent.click(screen.getByRole('checkbox', { name: a.capabilities[capability]! }))
    if (days !== undefined)
      fireEvent.click(screen.getByRole('radio', { name: m.days(days) }))
  }

  it('a name, each capability a box in words, and 7, 30 or 90 days', async () => {
    open(stage())
    await screen.findByRole('heading', { name: m.title })
    const boxes = screen
      .getAllByRole('checkbox')
      .map((box) => box.closest('label')?.textContent)
    expect(boxes).toEqual(MINTABLE.map((capability) => a.capabilities[capability]))
    expect(
      screen.getAllByRole('radio').map((r) => r.closest('label')?.textContent),
    ).toEqual([m.days(7), m.days(30), m.days(90)])
  })

  it('each group is named by its visible label, never a second copy of it (minors m116)', async () => {
    open(stage())
    await screen.findByRole('heading', { name: m.title })
    for (const [role, said] of [
      ['group', m.may],
      ['radiogroup', m.long],
    ] as const) {
      const group = screen.getByRole(role, { name: said })
      expect(group.hasAttribute('aria-label')).toBe(false)
      const label = document.getElementById(group.getAttribute('aria-labelledby') ?? '')
      expect(label?.textContent).toBe(said)
    }
  })

  it('Make it waits for a name and something it may do', async () => {
    open(stage())
    await screen.findByRole('heading', { name: m.title })
    expect((button(m.button) as HTMLButtonElement).disabled).toBe(true)
    fill('Claude Code', [])
    expect((button(m.button) as HTMLButtonElement).disabled).toBe(true)
    fill('', ['project:read'])
    expect((button(m.button) as HTMLButtonElement).disabled).toBe(true)
    fill('Claude Code', [])
    expect((button(m.button) as HTMLButtonElement).disabled).toBe(false)
  })

  it('a name past 64 is kept, said, and waits (never cut)', async () => {
    open(stage())
    await screen.findByRole('heading', { name: m.title })
    const long = 'x'.repeat(70)
    fill(long, ['project:read'])
    expect((screen.getByLabelText(m.name) as HTMLInputElement).value).toBe(long)
    expect((screen.getByLabelText(m.name) as HTMLInputElement).maxLength).toBe(-1)
    expect(document.body.textContent).toContain(words.limits.over('70', '64'))
    expect((button(m.button) as HTMLButtonElement).disabled).toBe(true)
  })

  it('mints exactly what was chosen, then hands our server its id, name and expiry, never its key', async () => {
    const s = stage()
    open(s)
    await screen.findByRole('heading', { name: m.title })
    fill('  My agent  ', ['build:create', 'project:read', 'source:write'], 90)
    await press(button(m.button))
    const [[projectId, body, key]] = s.called('mintToken') as [
      [string, Schemas['MintTokenRequest'], string],
    ]
    expect(projectId).toBe(PROJECT.id)
    expect(body).toEqual({
      name: 'My agent',
      capabilities: ['project:read', 'source:write', 'build:create'],
      expiresInDays: 90,
    })
    expect(typeof key).toBe('string')
    await waitFor(() => expect(s.called('keepAgent').length).toBe(1))
    const [[keptOn, made]] = s.called('keepAgent') as [[string, Record<string, unknown>]]
    expect(keptOn).toBe(PROJECT.id)
    expect(made).toEqual({
      tokenId: '50000000-0000-4000-8000-000000000001',
      name: 'My agent',
      expiresAt: '2026-11-02T19:00:00Z',
    })
    expect(JSON.stringify(s.calls.filter((c) => c[0] !== 'mintToken'))).not.toContain(
      'mft_',
    )
  })

  it('30 days unless they choose', async () => {
    const s = stage()
    open(s)
    await screen.findByRole('heading', { name: m.title })
    fill('My agent', ['project:read'])
    await press(button(m.button))
    expect(
      (s.called('mintToken')[0]![1] as Schemas['MintTokenRequest']).expiresInDays,
    ).toBe(30)
  })

  it('shows its key once, in mono, with Copy and how an agent uses it; kept nowhere; gone at a reload', async () => {
    const s = stage()
    const { unmount } = open(s)
    await screen.findByRole('heading', { name: m.title })
    fill('My agent', ['project:read'])
    await press(button(m.button))
    const key = await screen.findByText(SECRET)
    expect(key.className).toContain('mono')
    expect(screen.getByText(m.once)).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Copy\s*its key$/ })).toBeTruthy()
    expect(screen.getByText(m.how)).toBeTruthy()
    expect(screen.getByText(`${location.origin}/v1`)).toBeTruthy()
    expect(screen.getByText(`${location.origin}/v1/docs/agents`)).toBeTruthy()
    // The new one is listed, as theirs, (yours) once our server keeps its id (minors m115).
    await waitFor(async () =>
      expect(within(await rowOf('My agent')).getByText(a.theirs.yours)).toBeTruthy(),
    )
    expect(stored().join('\n')).not.toContain('mft_')
    unmount()
    open(s)
    await rowOf('My agent')
    expect(screen.queryByText(SECRET)).toBeNull()
  })

  it('the list read again after it fails: the key stays, beside what went wrong (the review’s minor 2)', async () => {
    const s = stage({ listTokens: ['ok', { status: 503, code: 'UNAVAILABLE' }] })
    open(s)
    await screen.findByRole('heading', { name: m.title })
    fill('My agent', ['project:read'])
    await press(button(m.button))
    expect(await screen.findByText(SECRET)).toBeTruthy()
    expect(await screen.findByText(words.refused.body)).toBeTruthy()
    expect(screen.getByText(SECRET)).toBeTruthy()
    // What it read before is still drawn, and Try again keeps the key too.
    expect(listed('Claude Code')).toBe(true)
    await press(button(words.refused.button))
    expect(screen.getByText(SECRET)).toBeTruthy()
  })

  it('Done puts the key away', async () => {
    open(stage())
    await screen.findByRole('heading', { name: m.title })
    fill('My agent', ['project:read'])
    await press(button(m.button))
    await screen.findByText(SECRET)
    await press(button(m.done))
    expect(screen.queryByText(SECRET)).toBeNull()
  })

  it('Done: the focus goes to where the key was, the section’s heading, never an empty status (minors m110)', async () => {
    open(stage())
    await screen.findByRole('heading', { name: m.title })
    fill('My agent', ['project:read'])
    await press(button(m.button))
    await screen.findByText(SECRET)
    await press(button(m.done))
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: m.title }))
  })

  it('our server not keeping its id: the key is still shown (it is the only time), and it is still theirs, by its maker', async () => {
    const s = stage({ keepAgent: [{ status: 503, code: 'UNAVAILABLE' }] })
    open(s)
    await screen.findByRole('heading', { name: m.title })
    fill('My agent', ['project:read'])
    await press(button(m.button))
    expect(await screen.findByText(SECRET)).toBeTruthy()
    await waitFor(async () =>
      expect(within(await rowOf('My agent')).getByText(a.theirs.yours)).toBeTruthy(),
    )
  })

  it('refused: we couldn’t, nothing has changed, a support reference; nothing kept, their choices as left', async () => {
    const s = stage({ mint: [{ status: 403, code: 'FORBIDDEN' }] })
    open(s)
    await screen.findByRole('heading', { name: m.title })
    fill('My agent', ['project:read'])
    await press(button(m.button))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(m.couldnt)
    expect(alert.textContent).toMatch(/[0-9A-F]{4}-[0-9A-F]{4}/)
    expect(s.called('keepAgent')).toEqual([])
    expect((screen.getByLabelText(m.name) as HTMLInputElement).value).toBe('My agent')
    await waitFor(() => expect(document.activeElement).toBe(button(m.button)))
  })

  it('says no machinery, its key and the addresses aside', async () => {
    open(stage())
    await screen.findByRole('heading', { name: m.title })
    fill('My agent', ['project:read'])
    await press(button(m.button))
    await screen.findByText(SECRET)
    expect(machineryIn(prose())).toEqual([])
  })
})

describe('their agent’s questions, at the top (F6b Task 12; Decision 16; (S1: M4))', () => {
  const q = a.question
  const cards = () =>
    screen.queryByRole('heading', { name: q.title })?.closest('section') ?? null
  const firstCard = () =>
    waitFor(() => {
      const found = cards()?.querySelector('.agents__question')
      expect(found).toBeTruthy()
      return found as HTMLElement
    })

  it('a question from another member’s agent says whose (m129, Rich’s words): by the members’ name for its maker', async () => {
    const s = stage({
      questions: [question('40000000-0000-4000-8000-000000000006', SAMS.id)],
    })
    open(s)
    await firstCard()
    const said = [...cards()!.querySelectorAll('.agents__question .body-lead')].map(
      (p) => p.textContent,
    )
    expect(said).toEqual([
      "Sam Helper's agent 'Sam’s builder' asked to change who's on Reading responses.",
    ])
  })

  it('each question still waiting from an agent that can still act, its name joined from the list', async () => {
    const s = stage({
      questions: [
        ...QUESTIONS,
        // Its agent revoked, the question read still pending (before FE-52, or read between the
        // two): not asked (Decision 16).
        question('40000000-0000-4000-8000-000000000004', REVOKED.id),
        // Past its day, the platform not yet saying so.
        {
          ...question('40000000-0000-4000-8000-000000000005', MINE.id),
          expiresAt: '2026-10-03T18:59:00Z',
        },
      ],
    })
    open(s)
    await firstCard()
    const said = [...cards()!.querySelectorAll('.agents__question .body-lead')].map(
      (p) => p.textContent,
    )
    expect(said).toEqual([
      "Your agent 'Claude Code' asked to change who's on Reading responses.",
      "Your agent 'from the console' asked to change who's on Reading responses.",
    ])
    expect(s.called('listPendingActions')).toEqual([[PROJECT.id]])
  })

  it('nothing waiting: no cards, and no heading', async () => {
    open(stage({ questions: [QUESTIONS[1]!] }))
    await rowOf('Claude Code')
    expect(cards()).toBeNull()
  })

  it('Yes, once: said in the page, and the list read again; that card gone', async () => {
    const s = stage()
    open(s)
    await press(within(await firstCard()).getByRole('button', { name: q.yes }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(q.saidYes))
    expect(s.called('confirmPendingAction').map(([id]) => id)).toEqual([QUESTIONS[0]!.id])
    await waitFor(() =>
      expect(cards()?.querySelectorAll('.agents__question')).toHaveLength(1),
    )
    expect(s.called('listPendingActions').length).toBe(2)
  })

  it('No: said in the page, and that card gone', async () => {
    const s = stage()
    open(s)
    await press(within(await firstCard()).getByRole('button', { name: q.no }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(q.saidNo))
    await waitFor(() =>
      expect(cards()?.querySelectorAll('.agents__question')).toHaveLength(1),
    )
  })

  it('answered elsewhere meanwhile (PENDING_ACTION_RESOLVED): it has stopped waiting, read again', async () => {
    const s = stage({ confirm: [{ status: 409, code: 'PENDING_ACTION_RESOLVED' }] })
    open(s)
    await press(within(await firstCard()).getByRole('button', { name: q.yes }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(q.stopped))
    expect(s.called('listPendingActions').length).toBe(2)
  })

  it('back from the second sign-in: the address loses then=agents without a navigation, so a reload is not back again (minors m113)', async () => {
    window.history.replaceState({}, '', `/apps/${SLUG}/agents?then=agents`)
    open(stage(), 'owner', 'agents')
    await firstCard()
    expect(window.location.pathname + window.location.search).toBe(`/apps/${SLUG}/agents`)
    expect(screen.getAllByText(words.goingLive.letIn.again)).toHaveLength(1)
  })

  it('back from the second sign-in: said once, the same cards, nothing pressed by itself', async () => {
    const s = stage()
    open(s, 'owner', 'agents')
    await firstCard()
    expect(screen.getAllByText(words.goingLive.letIn.again)).toHaveLength(1)
    expect(s.called('confirmPendingAction')).toEqual([])
    expect(s.called('rejectPendingAction')).toEqual([])
  })

  it('back from the second sign-in, that question no longer waiting (the whole-branch review’s I2): it has stopped waiting, said once, nothing pressed', async () => {
    sessionStorage.setItem(askedKey(PROJECT.slug), QUESTIONS[1]!.id)
    const s = stage()
    open(s, 'owner', 'agents')
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(q.stopped))
    expect(screen.getAllByText(words.goingLive.letIn.again)).toHaveLength(1)
    expect(sessionStorage.getItem(askedKey(PROJECT.slug))).toBeNull()
    expect(s.called('confirmPendingAction')).toEqual([])
  })

  it('back from the second sign-in with no question left at all: signed in again, and it has stopped waiting', async () => {
    sessionStorage.setItem(askedKey(PROJECT.slug), QUESTIONS[0]!.id)
    open(stage({ questions: [QUESTIONS[1]!] }), 'owner', 'agents')
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(q.stopped))
    expect(screen.getAllByText(words.goingLive.letIn.again)).toHaveLength(1)
    expect(cards()).toBeNull()
  })

  it('back from the second sign-in, that question still waiting: its card, nothing said of it', async () => {
    sessionStorage.setItem(askedKey(PROJECT.slug), QUESTIONS[0]!.id)
    open(stage(), 'owner', 'agents')
    await firstCard()
    expect(screen.getByRole('status').textContent).toBe('')
    expect(sessionStorage.getItem(askedKey(PROJECT.slug))).toBeNull()
  })

  it('Yes, once to an agent’s members question: our watch looked at again (the whole-branch review’s I1: it may have taken our watch’s maker off)', async () => {
    const s = stage()
    open(s)
    await press(within(await firstCard()).getByRole('button', { name: q.yes }))
    await waitFor(() => expect(s.called('keeping')).toEqual([[PROJECT.id]]))
  })

  it('No to it: our watch left alone', async () => {
    const s = stage()
    open(s)
    await press(within(await firstCard()).getByRole('button', { name: q.no }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(q.saidNo))
    expect(s.called('keeping')).toEqual([])
  })

  it('a helper: an owner answers each, and nothing to press on them', async () => {
    open(stage(), 'helper')
    await firstCard()
    const section = cards() as HTMLElement
    expect(within(section).getAllByText(a.question.ownerAnswers)).toHaveLength(2)
    expect(within(section).queryByRole('button')).toBeNull()
  })
})
