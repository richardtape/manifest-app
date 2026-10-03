// @vitest-environment jsdom
import { ManifestApiError, type Schemas } from '@manifest/contract'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stepUpHref } from '../../auth.js'
import type { Platform } from '../../platform/api.js'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { ACTION_WORDS, askedKey, Question } from './question.js'

/**
 * F6b TASK 12: THEIR AGENT'S QUESTION, the card at the top of *Agents* (design §4, D4; Decisions 13,
 * 16; (S1: M4)). What the platform lets it say, the honest line until FE-5 (a), when it stops
 * waiting; **[Yes, once]** behind the second sign-in, **[No]** with their words or *"No reason
 * given."*; an owner's to answer (FE-50: the code's rule). Asserted by what was sent.
 */
const q = words.agents.question
const PROJECT = { name: 'Reading responses', slug: 'reading-responses' }
const TZ = 'America/Vancouver'
/** Noon in Vancouver, 3 October. */
const NOW = new Date('2026-10-03T19:00:00Z')
const ID = '40000000-0000-4000-8000-000000000001'
const asking = (
  over: Partial<Schemas['PendingAction']> = {},
): Schemas['PendingAction'] => ({
  id: ID,
  projectId: 'p0000000-0000-4000-8000-000000000000',
  tokenId: '20000000-0000-4000-8000-000000000001',
  action: 'members:manage',
  state: 'pending',
  method: 'POST',
  path: '/v1/projects/p/members',
  bodySha256: 'x',
  summary: 'Add a member to a project',
  // 4:12pm in Vancouver, the same day.
  expiresAt: '2026-10-03T23:12:00Z',
  createdAt: '2026-10-02T23:12:00Z',
  resolvedAt: null,
  waitingSeconds: 72_000,
  reason: null,
  consumedAt: null,
  ...over,
})
const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'test')
type Answer = 'ok' | 'never' | { status: number; code: string }

function stage(options: { confirm?: Answer; reject?: Answer } = {}) {
  const calls: [string, ...unknown[]][] = []
  const answered = (said: Answer | undefined, value: () => unknown) =>
    said === 'never'
      ? new Promise(() => undefined)
      : typeof said === 'object'
        ? Promise.reject(refused(said.status, said.code))
        : Promise.resolve(value())
  const platform = {
    confirmPendingAction: (id: string, key: string) => {
      calls.push(['confirmPendingAction', id, key])
      return answered(options.confirm, () => asking({ state: 'confirmed' }))
    },
    rejectPendingAction: (id: string, reason: string, key: string) => {
      calls.push(['rejectPendingAction', id, reason, key])
      return answered(options.reject, () => asking({ state: 'rejected', reason }))
    },
  } as unknown as Platform
  return {
    platform,
    calls,
    expire: vi.fn(),
    onAnswered: vi.fn(),
    called: (name: string) => calls.filter((c) => c[0] === name).map((c) => c.slice(1)),
  }
}

function open(
  s: ReturnType<typeof stage>,
  options: {
    action?: Schemas['PendingAction']
    tokenName?: string | null
    role?: 'owner' | 'helper' | 'unknown'
  } = {},
) {
  return render(
    <Question
      platform={s.platform}
      project={PROJECT}
      action={options.action ?? asking()}
      tokenName={options.tokenName === undefined ? 'Claude Code' : options.tokenName}
      role={options.role ?? 'owner'}
      now={() => NOW}
      timeZone={TZ}
      expire={s.expire}
      onAnswered={s.onAnswered}
    />,
  )
}
const press = async (element: HTMLElement) => {
  await act(async () => {
    fireEvent.click(element)
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
const button = (name: string) => screen.getByRole('button', { name })
const text = () => document.body.textContent ?? ''
/** The card's words, without what is in mono (its agent's own name, the platform's summary). */
const prose = () => {
  const copy = document.body.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.mono').forEach((mono) => mono.remove())
  return copy.textContent ?? ''
}

afterEach(() => cleanup())

describe('what it says (design §4; FE-5 (a) honest)', () => {
  it('its agent by name, the action in words, the honest line, what yes does, and when it stops waiting', () => {
    open(stage())
    expect(text()).toContain(
      "Your agent 'Claude Code' asked to change who's on Reading responses.",
    )
    expect(screen.getByText('Claude Code').className).toContain('mono')
    expect(text()).toContain("It didn't say who. If you're not sure, say no.")
    expect(text()).toContain('Yes lets it try that one request once.')
    expect(text()).toContain('It stops waiting at 4:12pm.')
  })

  it('a day it is not today is said', () => {
    open(stage(), { action: asking({ expiresAt: '2026-10-04T18:00:00Z' }) })
    expect(text()).toContain('It stops waiting at 11:00am on 4 October.')
  })

  it('an agent we cannot name: An agent', () => {
    open(stage(), { tokenName: null })
    expect(text()).toContain("An agent asked to change who's on Reading responses.")
  })

  it.each([
    ['members:manage', "change who's on Reading responses", "It didn't say who."],
    [
      'release:promote',
      'let your students have a new version',
      "It didn't say which version.",
    ],
    ['secret:read', 'read one of its secrets', "It didn't say which."],
    ['quota:set', 'change how much it may use', "It didn't say how much."],
  ])('%s: in words, and what it did not say', (action, said, didnt) => {
    open(stage(), { action: asking({ action }) })
    expect(ACTION_WORDS[action]!(PROJECT.name)).toBe(said)
    expect(text()).toContain(`asked to ${said}.`)
    expect(text()).toContain(didnt)
    expect(text()).not.toContain(action)
    expect(machineryIn(prose())).toEqual([])
  })

  it('an action we do not know: the platform’s own summary, in mono, as it says it; never dropped', () => {
    open(stage(), {
      action: asking({
        action: 'payments:spend',
        summary: 'Spend from the production budget',
      }),
    })
    expect(text()).toContain(
      "Your agent 'Claude Code' asked: Spend from the production budget",
    )
    expect(screen.getByText('Spend from the production budget').className).toContain(
      'mono',
    )
    expect(text()).toContain("If you're not sure, say no.")
    expect(machineryIn(prose())).toEqual([])
  })

  it('a helper: an owner answers this, and nothing to press or type (FE-50; (S1: M4))', () => {
    open(stage(), { role: 'helper' })
    expect(text()).toContain(q.ownerAnswers)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('a role not known yet: what it asked, and nothing to press', () => {
    open(stage(), { role: 'unknown' })
    expect(text()).toContain('asked to')
    expect(screen.queryByRole('button')).toBeNull()
    expect(text()).not.toContain(q.ownerAnswers)
  })
})

describe('[Yes, once] and [No] (Decision 13)', () => {
  it('Yes, once: confirmed, and the page told', async () => {
    const s = stage()
    open(s)
    await press(button(q.yes))
    expect(s.called('confirmPendingAction').map(([id]) => id)).toEqual([ID])
    expect(s.onAnswered).toHaveBeenCalledWith('yes')
  })

  it('Yes, once asks the second sign-in: the platform’s page, back at Agents, nothing pressed by itself', async () => {
    const s = stage({ confirm: { status: 403, code: 'STEP_UP_REQUIRED' } })
    open(s)
    await press(button(q.yes))
    const again = await screen.findByRole('link', {
      name: words.tryingOut.stepUp.again,
    })
    expect(again.getAttribute('href')).toBe(
      stepUpHref('/apps/reading-responses/agents?then=agents'),
    )
    expect(s.onAnswered).not.toHaveBeenCalled()
    expect(s.called('confirmPendingAction')).toHaveLength(1)
  })

  it('Yes, once asks the second sign-in: which question, kept for the way back (the whole-branch review’s I2)', async () => {
    sessionStorage.clear()
    const s = stage({ confirm: { status: 403, code: 'STEP_UP_REQUIRED' } })
    open(s)
    await press(button(q.yes))
    await screen.findByRole('link', { name: words.tryingOut.stepUp.again })
    expect(sessionStorage.getItem(askedKey(PROJECT.slug))).toBe(ID)
    sessionStorage.clear()
  })

  it('No, with their words: rejected with exactly them (trimmed)', async () => {
    const s = stage()
    open(s)
    fireEvent.change(screen.getByLabelText(q.why), {
      target: { value: '  that student is not on this course  ' },
    })
    await press(button(q.no))
    expect(s.called('rejectPendingAction').map(([id, reason]) => [id, reason])).toEqual([
      [ID, 'that student is not on this course'],
    ])
    expect(s.onAnswered).toHaveBeenCalledWith('no')
  })

  it('No, with Tell it why left empty: "No reason given." (the platform asks for one)', async () => {
    const s = stage()
    open(s)
    fireEvent.change(screen.getByLabelText(q.why), { target: { value: '   ' } })
    await press(button(q.no))
    expect(s.called('rejectPendingAction').map(([, reason]) => reason)).toEqual([
      q.noReason,
    ])
  })

  it('Tell it why past 500: kept, said, and No waits (never cut)', () => {
    open(stage())
    const long = 'x'.repeat(520)
    fireEvent.change(screen.getByLabelText(q.why), { target: { value: long } })
    expect((screen.getByLabelText(q.why) as HTMLTextAreaElement).value).toBe(long)
    expect((screen.getByLabelText(q.why) as HTMLTextAreaElement).maxLength).toBe(-1)
    expect(text()).toContain(words.limits.over('520', '500'))
    expect((button(q.no) as HTMLButtonElement).disabled).toBe(true)
  })

  it('answered already, or past its day (PENDING_ACTION_RESOLVED): it has stopped waiting, and the page reads again', async () => {
    const s = stage({ confirm: { status: 409, code: 'PENDING_ACTION_RESOLVED' } })
    open(s)
    await press(button(q.yes))
    expect(s.onAnswered).toHaveBeenCalledWith('gone')
  })

  it('anything else: we couldn’t, it is still waiting, a support reference; the focus back on the button', async () => {
    const s = stage({ reject: { status: 503, code: 'UNAVAILABLE' } })
    open(s)
    await press(button(q.no))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(q.couldnt)
    expect(alert.textContent).toMatch(/[0-9A-F]{4}-[0-9A-F]{4}/)
    expect(s.onAnswered).not.toHaveBeenCalled()
    await waitFor(() => expect(document.activeElement).toBe(button(q.no)))
  })

  it('the session over: the shell’s to say', async () => {
    const s = stage({ confirm: { status: 401, code: 'UNAUTHENTICATED' } })
    open(s)
    await press(button(q.yes))
    expect(s.expire).toHaveBeenCalled()
  })

  it('one press at a time', async () => {
    const s = stage({ confirm: 'never' })
    open(s)
    await press(button(q.yes))
    expect((button(q.no) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('button', { name: q.answering })).toBeTruthy()
  })
})
