// @vitest-environment jsdom
import { ManifestApiError, type Schemas } from '@manifest/contract'
import { fixtures } from '@manifest/mock'
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
import { App } from '../../app.js'
import { OurRefusal, type Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { words } from '../../words.js'
import { LIMITS } from '../limits.js'
import { machineryIn } from '../machinery.js'
import { CAPABILITIES } from '../making/token.js'
import { signOffRow, talkWords } from './sign-off.js'

/**
 * THE SIGN-OFF, MOMENT 13 (F5 Task 8, Decision 9), as it stands: read from `getApproval` for the
 * version on trying-out. Undecided, it waits on a Manifest administrator, who is not told, with no
 * date (nothing records when it was asked: FE-25). Decided, it says who and when, or their reason
 * and **[Talk it through]**: a rejection is final for its version, so what follows is a change.
 */
const g = words.goingLive
const a = g.rows.approval
const TZ = 'America/Vancouver'
const NOW = new Date('2026-09-30T19:00:00.000Z')
const SLUG = 'reading-responses'
const PROJECT: Schemas['Project'] = {
  ...fixtures.PROJECT,
  name: 'Reading responses',
  slug: SLUG,
  launchedAt: null,
}
const REASON = 'It keeps each student’s email, which the plan never said it would.'
/** 8pm on 23 September in Vancouver: 3am on the 24th by the clock in Greenwich. */
const DECIDED = '2026-09-24T03:00:00.000Z'
const approval = (
  decision: 'approved' | 'rejected',
  releaseId: string = fixtures.RELEASE_ID,
): Schemas['Approval'] => ({
  ...fixtures.APPROVAL,
  releaseId,
  decision,
  decidedByName: 'Ada Admin',
  decidedAt: DECIDED,
  reason: decision === 'rejected' ? REASON : null,
})
const item = (
  state: Schemas['LaunchReadinessItem']['state'],
): Schemas['LaunchReadinessItem'] => ({
  id: 'admin-approval',
  title: 'Release approved by a platform administrator',
  owner: 'platform admin',
  blocking: true,
  state,
  why: 'An administrator approves the exact image digest, with step-up re-authentication (§13, §20).',
})

describe('the sign-off’s row, from the checklist item and the approval (Decision 9)', () => {
  it('undecided: waiting on a Manifest administrator, why it exists, and that nobody tells them', () =>
    expect(signOffRow(item('unmet'), true, null, TZ)).toMatchObject({
      id: 'admin-approval',
      state: 'waiting',
      name: 'A Manifest administrator’s sign-off',
      words:
        'A Manifest administrator looks at what it keeps, who it lets in and what it can reach, then signs it off, so nobody’s app reaches students with something it shouldn’t have. Manifest doesn’t tell them yet that it’s waiting.',
      owner: 'a Manifest administrator',
      action: null,
    }))

  it('undecided has no date: nothing records when it was asked (FE-25)', () => {
    const said = signOffRow(item('unmet'), true, null, TZ).words
    expect(said).not.toMatch(/\d/)
    expect(said).not.toMatch(
      /January|February|March|April|May|June|July|August|September|October|November|December|since|asked/,
    )
  })

  it('signed off: who decided, and the day, in their own time zone', () =>
    expect(signOffRow(item('met'), true, approval('approved'), TZ)).toMatchObject({
      state: 'steady',
      words: 'Signed off by Ada Admin, 23 September.',
      owner: 'a Manifest administrator',
      action: null,
    }))

  it('met with no decision: nothing in this version needs a sign-off', () =>
    expect(signOffRow(item('met'), true, null, TZ)).toMatchObject({
      state: 'steady',
      words: 'Nothing in this version needs a sign-off.',
      action: null,
    }))

  it('not signed off: needs you, their reason in their words, a new version needed, and Talk it through', () =>
    expect(signOffRow(item('unmet'), true, approval('rejected'), TZ)).toMatchObject({
      state: 'attention',
      words: `Not signed off: ‘${REASON}’ A new version is needed, and it’s looked at afresh.`,
      owner: 'you',
      action: 'talk-it-through',
    }))

  it('not signed off, and no reason kept: still needs you, still Talk it through', () =>
    expect(
      signOffRow(item('unmet'), true, { ...approval('rejected'), reason: null }, TZ),
    ).toMatchObject({
      state: 'attention',
      words: 'Not signed off. A new version is needed, and it’s looked at afresh.',
      action: 'talk-it-through',
    }))

  it('signed off, then rebuilt: the checklist counts it unmet, so it is looked at afresh, never done', () => {
    const row = signOffRow(item('unmet'), true, approval('approved'), TZ)
    expect(row).toMatchObject({ state: 'waiting', owner: 'a Manifest administrator' })
    expect(row.words).toBe(a.again)
    expect(row.words).not.toMatch(/^Signed off/)
  })

  it('an approval that could not be read: says we cannot tell, never a decision', () => {
    expect(signOffRow(item('unmet'), true, 'unread', TZ)).toMatchObject({
      state: 'notyet',
      words: a.cantTell,
      action: null,
    })
    expect(signOffRow(item('met'), true, 'unread', TZ)).toMatchObject({
      state: 'steady',
      words: 'Signed off by a Manifest administrator.',
    })
  })

  it('nothing on trying-out: not yet, once a version is there; not tracked: not yet', () => {
    expect(signOffRow(item('unmet'), false, null, TZ)).toMatchObject({
      state: 'notyet',
      words: 'Once a version is on your trying-out address.',
    })
    expect(signOffRow(item('not_built'), true, null, TZ)).toMatchObject({
      state: 'notyet',
      words: 'Manifest doesn’t check this one yet.',
      owner: 'nobody yet',
    })
  })

  it('an undated decision is said without its day', () =>
    expect(
      signOffRow(item('met'), true, { ...approval('approved'), decidedAt: 'soon' }, TZ)
        .words,
    ).toBe('Signed off by Ada Admin.'))

  it('none of the platform’s words, and never its why (C3, FE-9)', () => {
    for (const state of ['met', 'unmet', 'not_built'] as const)
      for (const decided of [
        null,
        'unread' as const,
        approval('approved'),
        approval('rejected'),
      ]) {
        const row = signOffRow(item(state), true, decided, TZ)
        const said = [row.name, row.words, row.owner].join(' ')
        expect(machineryIn(said), `${state}`).toEqual([])
        expect(said, `${state}`).not.toMatch(/§|digest|step-up|release/i)
      }
  })
})

describe('talking a refusal through: the change’s words (Words proposed for Rich)', () => {
  it('ours, then their reason as they wrote it', () =>
    expect(talkWords(REASON)).toBe(
      `A Manifest administrator didn’t sign it off, and said: ‘${REASON}’`,
    ))

  it('no reason kept: ours alone', () =>
    expect(talkWords(null)).toBe('A Manifest administrator didn’t sign it off.'))

  it('a reason longer than a change may be is cut at a word, to the change’s limit', () => {
    const long = 'accessible '.repeat(500).trim()
    const said = talkWords(long)
    expect(said.length).toBeLessThanOrEqual(LIMITS.description)
    expect(said).toMatch(/ accessible…’$/)
    expect(
      said.startsWith('A Manifest administrator didn’t sign it off, and said: ‘'),
    ).toBe(true)
  })

  it('a reason exactly at the limit is kept whole', () => {
    const room = LIMITS.description - talkWords('').length
    const exact = 'x'.repeat(room)
    expect(talkWords(exact)).toHaveLength(LIMITS.description)
    expect(talkWords(exact)).not.toMatch(/…/)
  })
})

// ---------------------------------------------------------------------------------------------
// THE PAGE: through the whole App, every read the person's own session.

const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'test')
const never = () => new Promise<never>(() => undefined)
const TOKEN = 'mft_test_x_talk_it_through'
const B = '66666666-6666-4666-8666-666666666666'

type World = {
  readiness: Schemas['LaunchReadiness']
  approval: Schemas['Approval'] | null
  /** The change already under way for the refusal, if any (the final review's I1). */
  talking: string | null
}
const withSignOff = (
  state: Schemas['LaunchReadinessItem']['state'],
  candidate: string | null = fixtures.RELEASE_ID,
): Schemas['LaunchReadiness'] => ({
  ...fixtures.LAUNCH_READINESS,
  candidateReleaseId: candidate,
  items: fixtures.LAUNCH_READINESS.items.map((i) =>
    i.id === 'admin-approval' ? { ...i, state } : i,
  ),
})

function stage(
  world: Partial<World> = {},
  refuse: Partial<Record<string, () => unknown>> = {},
) {
  const w: World = {
    readiness: withSignOff('unmet'),
    approval: approval('rejected'),
    talking: null,
    ...world,
  }
  const calls: [string, ...unknown[]][] = []
  const answer =
    <T,>(name: string, value: (...args: never[]) => T) =>
    (...args: never[]) => {
      calls.push([name, ...args])
      const refusal = refuse[name]?.()
      return refusal === undefined
        ? Promise.resolve(value(...args))
        : Promise.reject(refusal)
    }
  const platform: Platform = {
    getMe: () => Promise.resolve(fixtures.ME),
    listProjects: answer('listProjects', () => [PROJECT]),
    getProject: never,
    getRelease: answer('getRelease', (id: string) => ({ ...fixtures.RELEASE, id })),
    listEnvironments: answer('listEnvironments', () => fixtures.ENVIRONMENTS),
    listInstances: never,
    listIncidents: never,
    runRehearsal: () => new Promise<never>(() => undefined),
    getLaunchReadiness: answer('getLaunchReadiness', () => w.readiness),
    getLaunchRecords: answer('getLaunchRecords', () => fixtures.LAUNCH_RECORDS),
    getEnvironment: never,
    getApproval: answer('getApproval', () => w.approval),
    startIntakeSession: never,
    endIntakeSession: never,
    checkSlug: never,
    listBlueprints: never,
    createProject: never,
    mintToken: answer(
      'mintToken',
      () => ({ ...fixtures.MINTED_TOKEN, secret: TOKEN }) as Schemas['MintedToken'],
    ),
    deploy: never,
    listAppSecrets: never,
    setAppSecret: never,
    watchProject: () => ({ ready: never(), close: () => undefined }),
  }
  const theirs = {
    startChange: answer('startChange', () => ({ id: 'conv-talk' })),
    fixForDryRun: () => Promise.resolve(null),
    changeForRefusal: answer('changeForRefusal', () =>
      w.talking === null ? null : { id: w.talking },
    ),
  } as Record<string, unknown>
  // Every other call of ours stays quiet: the conversation page opened after the press reads.
  const ours = new Proxy(theirs, {
    get: (target, name: string) =>
      name in target
        ? target[name]
        : name === 'events'
          ? () => ({
              readyState: 0,
              onmessage: null,
              onerror: null,
              close: () => undefined,
            })
          : never,
  }) as unknown as Ours
  const called = (name: string) =>
    calls.filter((c) => c[0] === name).map((c) => c.slice(1))
  return { platform, ours, called, world: w }
}

const reports: Record<string, unknown>[] = []
beforeEach(() => {
  reports.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/problems')
        reports.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return new Response(null, { status: 204 })
    }),
  )
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function open(s = stage()) {
  window.history.pushState({}, '', `/apps/${SLUG}/going-live`)
  render(<App platform={s.platform} ours={s.ours} timeZone={TZ} now={() => NOW} />)
  await screen.findByRole('region', { name: g.shortJobs.title })
  return s
}
/** The sign-off's row, found by its name. */
const signOff = async () => (await screen.findByText(a.name)).closest('li') as HTMLElement
function wordsOf(element: HTMLElement): string {
  const copy = element.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.mono, .mock-banner').forEach((mono) => mono.remove())
  return copy.textContent ?? ''
}

describe('the sign-off on Going live (moment 13)', () => {
  it('not signed off: needs you, their reason, and one thing to press', async () => {
    await open()
    const row = await signOff()
    expect(within(row).getByText('Needs you')).toBeTruthy()
    expect(within(row).getByText(new RegExp(`Not signed off: ‘${REASON}’`))).toBeTruthy()
    expect(within(row).getByText('you')).toBeTruthy()
    expect(
      within(row)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Talk it through'])
  })

  it('reads the approval of the version on trying-out, and no other', async () => {
    const s = await open()
    await signOff()
    expect(s.called('getApproval')).toEqual([[fixtures.RELEASE_ID]])
  })

  it('Talk it through mints a token in their session and starts a change of our words and their reason, then opens it', async () => {
    const s = await open()
    fireEvent.click(
      within(await signOff()).getByRole('button', { name: 'Talk it through' }),
    )
    await waitFor(() =>
      expect(window.location.pathname).toBe(`/apps/${SLUG}/conversations/conv-talk`),
    )
    const [[projectId, request, key]] = s.called('mintToken') as [
      [string, Schemas['MintTokenRequest'], string],
    ]
    expect(projectId).toBe(PROJECT.id)
    expect(request).toEqual({
      name: `Changing — ${talkWords(REASON)}`.slice(0, 64),
      capabilities: CAPABILITIES,
      expiresInDays: 7,
    })
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
    expect(s.called('changeForRefusal')).toEqual([[PROJECT.id, fixtures.APPROVAL.id]])
    expect(s.called('startChange')).toEqual([
      [
        PROJECT.id,
        {
          words: talkWords(REASON),
          token: TOKEN,
          refusal: { approvalId: fixtures.APPROVAL.id },
        },
      ],
    ])
  })

  it('pressed again, it opens the change already under way for that refusal: nothing minted, nothing started (the final review’s I1)', async () => {
    const s = await open(stage({ talking: 'conv-earlier' }))
    fireEvent.click(
      within(await signOff()).getByRole('button', { name: 'Talk it through' }),
    )
    await waitFor(() =>
      expect(window.location.pathname).toBe(`/apps/${SLUG}/conversations/conv-earlier`),
    )
    expect(s.called('mintToken')).toEqual([])
    expect(s.called('startChange')).toEqual([])
  })

  it('our server not saying whether one is under way: says so, with a reference, and starts nothing', async () => {
    const s = await open(
      stage({}, { changeForRefusal: () => new OurRefusal('UNREACHABLE', null) }),
    )
    fireEvent.click(
      within(await signOff()).getByRole('button', { name: 'Talk it through' }),
    )
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(a.couldntTalk)
    expect(reports[0]).toMatchObject({
      code: 'UNREACHABLE',
      operation: 'changeForRefusal',
    })
    expect(s.called('mintToken')).toEqual([])
    expect(s.called('startChange')).toEqual([])
  })

  it('a press our server refuses says so with a reference, reported once, and the button is back', async () => {
    await open(
      stage({}, { startChange: () => new OurRefusal('PLATFORM_UNAVAILABLE', 502) }),
    )
    fireEvent.click(
      within(await signOff()).getByRole('button', { name: 'Talk it through' }),
    )
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(a.couldntTalk)
    expect(alert.textContent).toMatch(/[0-9A-F]{4}-[0-9A-F]{4}/)
    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({
      code: 'PLATFORM_UNAVAILABLE',
      operation: 'startChange',
    })
    expect(
      within(await signOff()).getByRole('button', { name: 'Talk it through' }),
    ).toBeTruthy()
    expect(window.location.pathname).toBe(`/apps/${SLUG}/going-live`)
  })

  it('undecided: waiting on an administrator, no date, nobody told, nothing to press', async () => {
    await open(stage({ approval: null }))
    const row = await signOff()
    expect(within(row).getByText('Waiting on someone')).toBeTruthy()
    expect(wordsOf(row)).toContain('Manifest doesn’t tell them yet that it’s waiting.')
    expect(wordsOf(row)).not.toMatch(/\d/)
    expect(within(row).queryAllByRole('button')).toEqual([])
  })

  it('signed off: who, and the day, in their time zone', async () => {
    await open(stage({ readiness: withSignOff('met'), approval: approval('approved') }))
    expect(wordsOf(await signOff())).toContain('Signed off by Ada Admin, 23 September.')
  })

  it('a version that changes on trying-out reads its own approval: a refusal of the old one is not this one’s', async () => {
    const s = await open()
    expect(within(await signOff()).getByText('Needs you')).toBeTruthy()
    s.world.readiness = withSignOff('unmet', B)
    s.world.approval = null
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(async () =>
      expect(within(await signOff()).getByText('Waiting on someone')).toBeTruthy(),
    )
    expect(s.called('getApproval')).toEqual([[fixtures.RELEASE_ID], [B]])
    expect(within(await signOff()).queryAllByRole('button')).toEqual([])
  })

  it('nothing on trying-out: no approval is asked for, and the row is not yet', async () => {
    const s = await open(stage({ readiness: withSignOff('unmet', null), approval: null }))
    expect(within(await signOff()).getByText('Not yet')).toBeTruthy()
    expect(s.called('getApproval')).toEqual([])
  })

  it('an approval that cannot be read: the row says we cannot tell, and the page stands', async () => {
    await open(stage({}, { getApproval: () => refused(500, 'INTERNAL') }))
    const row = await signOff()
    expect(wordsOf(row)).toContain(a.cantTell)
    expect(within(row).queryAllByRole('button')).toEqual([])
    expect(screen.getByText(g.rows.rehearsal.name)).toBeTruthy()
  })

  it('no mailto, and none of the platform’s words, whatever was decided', async () => {
    for (const world of [
      { approval: null },
      { approval: approval('rejected') },
      { readiness: withSignOff('met'), approval: approval('approved') },
    ]) {
      await open(stage(world))
      await signOff()
      expect(document.body.innerHTML).not.toMatch(/mailto:/i)
      expect(machineryIn(wordsOf(document.body))).toEqual([])
      cleanup()
    }
  })
})
