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
import { NOTE_LIMIT, signOffRow, talkWords } from './sign-off.js'

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
  since: string | null = null,
): Schemas['LaunchReadinessItem'] => ({
  id: 'admin-approval',
  title: 'Release approved by a platform administrator',
  owner: 'platform admin',
  blocking: true,
  state,
  why: 'An administrator approves the exact image digest, with step-up re-authentication (§13, §20).',
  since,
})
/** Asked at noon on 28 September in Vancouver: two days before NOW. */
const ASKED = '2026-09-28T19:00:00.000Z'

describe('the sign-off’s row, from the checklist item and the approval (Decision 9)', () => {
  it('undecided and nobody has asked (F5b, D7): needs you, why it exists, and Ask', () =>
    expect(signOffRow(item('unmet'), true, null, TZ, NOW)).toEqual({
      id: 'admin-approval',
      state: 'attention',
      name: 'A Manifest administrator’s sign-off',
      words:
        'A Manifest administrator looks at what it keeps, who it lets in and what it can reach, then signs it off, so nobody’s app reaches students with something it shouldn’t have.',
      owner: 'you',
      address: null,
      action: 'ask',
      when: null,
      apart: false,
    }))

  it('asked (F5b): waiting on a Manifest administrator, who looks at it next, asked on its day and waiting in Vancouver days', () =>
    expect(signOffRow(item('unmet', ASKED), true, null, TZ, NOW)).toMatchObject({
      state: 'waiting',
      words: 'A Manifest administrator looks at this next.',
      owner: 'a Manifest administrator',
      action: null,
      when: 'asked 28 September · waiting 2 days',
    }))

  it('asked, read with no clock (F6’s band reads the state alone): the day, and no count', () =>
    expect(signOffRow(item('unmet', ASKED), true, null, TZ).when).toBe(
      'asked 28 September',
    ))

  it('asked on a day that cannot be read: waiting, undated, never “NaN”', () =>
    expect(signOffRow(item('unmet', 'soon'), true, null, TZ, NOW)).toMatchObject({
      state: 'waiting',
      when: null,
    }))

  it('Manifest no longer says it does not tell them: the request is in their queue, and they are emailed (D5)', () => {
    for (const since of [null, ASKED])
      for (const decided of [null, approval('approved')])
        expect(
          signOffRow(item('unmet', since), true, decided, TZ, NOW).words,
        ).not.toMatch(/doesn’t tell them/)
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

  it('signed off, then rebuilt: the checklist counts it unmet, so it is looked at afresh, never done; Ask, until someone has', () => {
    const row = signOffRow(item('unmet'), true, approval('approved'), TZ, NOW)
    expect(row).toMatchObject({ state: 'attention', owner: 'you', action: 'ask' })
    expect(row.words).toBe(a.again)
    expect(a.again).toBe(
      'It has changed since it was signed off, so a Manifest administrator looks at it afresh.',
    )
    expect(row.words).not.toMatch(/^Signed off/)
    expect(
      signOffRow(item('unmet', ASKED), true, approval('approved'), TZ, NOW),
    ).toMatchObject({
      state: 'waiting',
      owner: 'a Manifest administrator',
      words: a.again,
      action: null,
      when: 'asked 28 September · waiting 2 days',
    })
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
        const row = signOffRow(item(state, ASKED), true, decided, TZ, NOW)
        const said = [row.name, row.words, row.owner, row.when ?? ''].join(' ')
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
  since: string | null = null,
): Schemas['LaunchReadiness'] => ({
  ...fixtures.LAUNCH_READINESS,
  candidateReleaseId: candidate,
  items: fixtures.LAUNCH_READINESS.items.map((i) =>
    i.id === 'admin-approval' ? { ...i, state, since } : i,
  ),
})
/** The platform's answer to an ask: the open request for that release. */
const request = (releaseId: string): Schemas['ApprovalRequest'] =>
  ({
    id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    releaseId,
    projectId: PROJECT.id,
    requestedBy: { id: fixtures.ME.id, displayName: 'Instructor One' },
    viaToken: null,
    createdAt: NOW.toISOString(),
    open: true,
  }) as Schemas['ApprovalRequest']

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
    requestApproval: answer('requestApproval', (releaseId: string) => request(releaseId)),
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
    listMembers: never,
    revokeToken: never,
    archiveProject: never,
    restoreProject: never,
    deleteProject: never,
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

  it('m4: after a failed press the focus is on the button again, and the alert still says why', async () => {
    await open(stage({}, { mintToken: () => refused(503, 'PLATFORM_UNAVAILABLE') }))
    const talk = within(await signOff()).getByRole('button', { name: 'Talk it through' })
    talk.focus()
    fireEvent.click(talk)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(a.couldntTalk)
    const back = within(await signOff()).getByRole('button', { name: 'Talk it through' })
    await waitFor(() => expect(document.activeElement).toBe(back))
  })

  it('undecided and nobody has asked: needs you, and the one thing to press is Ask (F5b)', async () => {
    await open(stage({ approval: null }))
    const row = await signOff()
    expect(within(row).getByText('Needs you')).toBeTruthy()
    expect(wordsOf(row)).not.toMatch(/doesn’t tell them/)
    expect(
      within(row)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([a.ask])
  })

  it('asked: waiting on an administrator, asked on its day, waiting in Vancouver days, nothing to press', async () => {
    await open(
      stage({
        approval: null,
        readiness: withSignOff('unmet', fixtures.RELEASE_ID, ASKED),
      }),
    )
    const row = await signOff()
    expect(within(row).getByText('Waiting on someone')).toBeTruthy()
    expect(wordsOf(row)).toContain(a.asked)
    expect(wordsOf(row)).toContain('asked 28 September · waiting 2 days')
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
      expect(
        within(await signOff()).queryByRole('button', { name: 'Talk it through' }),
      ).toBeNull(),
    )
    expect(s.called('getApproval')).toEqual([[fixtures.RELEASE_ID], [B]])
    // Nobody has decided or asked about the new one: Ask, never the old refusal's change.
    expect(
      within(await signOff())
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([a.ask])
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

/**
 * ASKING FOR THE SIGN-OFF (F5b Task 4, D7; the design's §3): a press, in their session, with an
 * optional note in place. One `Idempotency-Key` per press. The note goes to the administrators'
 * queue and is never drawn back. Each refusal by its code; the page reads again after each.
 */
describe('asking a Manifest administrator to sign it off (F5b Task 4)', () => {
  const unasked = () => stage({ approval: null })
  const press = (element: HTMLElement) =>
    act(async () => {
      fireEvent.click(element)
    })
  const askButton = async () =>
    within(await signOff()).findByRole('button', { name: a.ask })
  const noteField = () =>
    within(document.body).getByLabelText(a.note) as HTMLTextAreaElement
  const type = (text: string) =>
    act(async () => {
      fireEvent.change(noteField(), { target: { value: text } })
    })

  it('the press opens one optional note in place, with its hint, and Ask them · Not now; nothing sent yet', async () => {
    const s = await open(unasked())
    await press(await askButton())
    const row = await signOff()
    expect(noteField().tagName).toBe('TEXTAREA')
    expect(noteField().closest('li')).toBe(row)
    expect(wordsOf(row)).toContain(a.noteHint)
    expect(a.noteHint).toBe(
      'For example, the day your students need it. Only Manifest administrators see it.',
    )
    expect(within(row).getByRole('button', { name: a.askThem })).toBeTruthy()
    expect(within(row).getByRole('button', { name: a.notNow })).toBeTruthy()
    expect(s.called('requestApproval')).toEqual([])
  })

  it('never cuts a paste off: no maxLength on the note (ORIENTATION §7)', async () => {
    await open(unasked())
    await press(await askButton())
    expect(noteField().hasAttribute('maxlength')).toBe(false)
  })

  it('Ask them asks for the version on trying-out, in their session, with their note and a key of its own', async () => {
    const s = await open(unasked())
    await press(await askButton())
    await type('  Needed by 2 November, for the midterm.  ')
    await press(within(await signOff()).getByRole('button', { name: a.askThem }))
    await waitFor(() => expect(s.called('requestApproval')).toHaveLength(1))
    const [[releaseId, body, key]] = s.called('requestApproval') as [
      [string, unknown, string],
    ]
    expect(releaseId).toBe(fixtures.RELEASE_ID)
    expect(body).toEqual({ note: 'Needed by 2 November, for the midterm.' })
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('an empty or blank note is not sent at all', async () => {
    const s = await open(unasked())
    await press(await askButton())
    await type('   ')
    await press(within(await signOff()).getByRole('button', { name: a.askThem }))
    await waitFor(() => expect(s.called('requestApproval')).toHaveLength(1))
    expect(s.called('requestApproval')[0]![1]).toEqual({})
  })

  it('two presses, two keys: each press its own Idempotency-Key', async () => {
    const s = await open(unasked())
    for (let pressed = 0; pressed < 2; pressed++) {
      await press(await askButton())
      await press(within(await signOff()).getByRole('button', { name: a.askThem }))
      await waitFor(() =>
        expect(s.called('getLaunchReadiness').length).toBeGreaterThan(1),
      )
    }
    await waitFor(() => expect(s.called('requestApproval')).toHaveLength(2))
    const keys = s.called('requestApproval').map((c) => c[2])
    expect(new Set(keys).size).toBe(2)
  })

  it('asked: the page reads again, and the note is never drawn back', async () => {
    const s = await open(unasked())
    await press(await askButton())
    await type('Only Manifest administrators see this.')
    s.world.readiness = withSignOff('unmet', fixtures.RELEASE_ID, NOW.toISOString())
    await press(within(await signOff()).getByRole('button', { name: a.askThem }))
    await waitFor(async () => expect(wordsOf(await signOff())).toContain(a.asked))
    expect(s.called('getLaunchReadiness')).toHaveLength(2)
    expect(wordsOf(await signOff())).toContain('asked 30 September · waiting since today')
    expect(document.body.textContent).not.toContain(
      'Only Manifest administrators see this.',
    )
    expect(screen.queryByLabelText(a.note)).toBeNull()
  })

  it('asked, and the platform’s reading not moved yet: the note closed, its words gone, never shown back', async () => {
    const s = await open(unasked())
    await press(await askButton())
    await type('For the administrators alone.')
    await press(within(await signOff()).getByRole('button', { name: a.askThem }))
    await waitFor(() => expect(s.called('getLaunchReadiness')).toHaveLength(2))
    expect(screen.queryByLabelText(a.note)).toBeNull()
    expect(document.body.textContent).not.toContain('For the administrators alone.')
  })

  it('while it asks: Asking, still, and no second press', async () => {
    const s = unasked()
    s.platform.requestApproval = () => new Promise(() => undefined)
    await open(s)
    await press(await askButton())
    await press(within(await signOff()).getByRole('button', { name: a.askThem }))
    const row = await signOff()
    expect(within(row).getByText(a.asking)).toBeTruthy()
    expect(within(row).queryByRole('button', { name: a.askThem })).toBeNull()
  })

  it('the focus follows the note: into it as it opens, back to Ask as Not now closes it (the review’s I3)', async () => {
    await open(unasked())
    await press(await askButton())
    expect(document.activeElement).toBe(noteField())
    await press(within(await signOff()).getByRole('button', { name: a.notNow }))
    expect(document.activeElement).toBe(await askButton())
  })

  it('while it asks, the focus is on Asking; a press that did not go through gives it back to Ask them (the review’s I3)', async () => {
    const s = unasked()
    let fail: (reason: unknown) => void = () => undefined
    s.platform.requestApproval = () =>
      new Promise((_, reject) => {
        fail = reject
      })
    await open(s)
    await press(await askButton())
    await press(within(await signOff()).getByRole('button', { name: a.askThem }))
    expect(document.activeElement?.textContent).toBe(a.asking)
    await act(async () => fail(refused(500, 'INTERNAL')))
    expect(document.activeElement).toBe(
      within(await signOff()).getByRole('button', { name: a.askThem }),
    )
  })

  it('asked: the focus goes back to the row’s button while the page reads again, never to the page (the review’s I3)', async () => {
    const s = unasked()
    let answer: () => void = () => undefined
    s.platform.requestApproval = (releaseId) =>
      new Promise((resolve) => {
        answer = () => resolve(request(releaseId))
      })
    await open(s)
    await press(await askButton())
    await press(within(await signOff()).getByRole('button', { name: a.askThem }))
    await act(async () => answer())
    expect(document.activeElement).not.toBe(document.body)
  })

  it('Not now closes the note and sends nothing', async () => {
    const s = await open(unasked())
    await press(await askButton())
    await type('Something')
    await press(within(await signOff()).getByRole('button', { name: a.notNow }))
    expect(screen.queryByLabelText(a.note)).toBeNull()
    expect(await askButton()).toBeTruthy()
    expect(s.called('requestApproval')).toEqual([])
  })

  it(`a note over ${NOTE_LIMIT} characters holds the press, says so, and keeps their text`, async () => {
    const s = await open(unasked())
    await press(await askButton())
    const long = 'x'.repeat(NOTE_LIMIT + 1)
    await type(long)
    const askThem = within(await signOff()).getByRole('button', { name: a.askThem })
    expect((askThem as HTMLButtonElement).disabled).toBe(true)
    expect(noteField().value).toBe(long)
    expect(wordsOf(await signOff())).toMatch(/Could you shorten it a little\?/)
    await press(askThem)
    expect(s.called('requestApproval')).toEqual([])
  })

  it('RELEASE_NOT_STAGED: the version changed a moment ago, said in our words; the page reads again, and the next press names the new one, never the old (Review Focus 2)', async () => {
    let first = true
    const s = stage(
      { approval: null },
      {
        requestApproval: () => {
          if (!first) return undefined
          first = false
          return refused(409, 'RELEASE_NOT_STAGED')
        },
      },
    )
    await open(s)
    s.world.readiness = withSignOff('unmet', B)
    await press(await askButton())
    await press(within(await signOff()).getByRole('button', { name: a.askThem }))
    expect(await screen.findByText(a.changed)).toBeTruthy()
    expect(a.changed).toBe(
      'The version on your trying-out address changed a moment ago. Ask about the new one?',
    )
    await waitFor(() =>
      expect(s.called('getApproval')).toEqual([[fixtures.RELEASE_ID], [B]]),
    )
    await press(await askButton())
    await press(within(await signOff()).getByRole('button', { name: a.askThem }))
    await waitFor(() => expect(s.called('requestApproval')).toHaveLength(2))
    expect(s.called('requestApproval').map((c) => c[0])).toEqual([fixtures.RELEASE_ID, B])
    expect(reports).toEqual([])
  })

  it.each(['APPROVAL_NOT_NEEDED', 'RELEASE_REJECTED'])(
    '%s: the page reads again, and the reading says it (no words of its own, no reference)',
    async (code) => {
      const s = stage({ approval: null }, { requestApproval: () => refused(409, code) })
      await open(s)
      await press(await askButton())
      await press(within(await signOff()).getByRole('button', { name: a.askThem }))
      await waitFor(() => expect(s.called('getLaunchReadiness')).toHaveLength(2))
      expect(screen.queryByText(a.couldntAsk)).toBeNull()
      expect(screen.queryByText(a.changed)).toBeNull()
      expect(reports).toEqual([])
    },
  )

  it('anything else: we couldn’t ask, nothing lost, with a reference, reported once; the note kept to try again', async () => {
    const s = stage(
      { approval: null },
      { requestApproval: () => refused(500, 'INTERNAL') },
    )
    await open(s)
    await press(await askButton())
    await type('Keep me')
    await press(within(await signOff()).getByRole('button', { name: a.askThem }))
    const row = await signOff()
    expect(await within(row).findByText(a.couldntAsk)).toBeTruthy()
    expect(a.couldntAsk).toBe('We couldn’t ask just now. Nothing is lost.')
    const reference = /quote ([0-9A-F]{4}-[0-9A-F]{4})\./.exec(wordsOf(row))?.[1]
    expect(reference).toBeDefined()
    await waitFor(() =>
      expect(reports).toEqual([
        expect.objectContaining({
          reference,
          code: 'INTERNAL',
          operation: 'requestApproval',
        }),
      ]),
    )
    expect(noteField().value).toBe('Keep me')
    expect(within(row).getByRole('button', { name: a.askThem })).toBeTruthy()
  })

  it('switched off since (PROJECT_ARCHIVED): said as F6 says it everywhere, never a reference (Decision 16)', async () => {
    const s = stage(
      { approval: null },
      { requestApproval: () => refused(409, 'PROJECT_ARCHIVED') },
    )
    await open(s)
    await press(await askButton())
    await press(within(await signOff()).getByRole('button', { name: a.askThem }))
    const row = await signOff()
    expect(
      await within(row).findByText(words.refused.archived(PROJECT.name)),
    ).toBeTruthy()
    expect(wordsOf(row)).not.toMatch(/quote [0-9A-F]{4}-[0-9A-F]{4}/)
    expect(reports).toEqual([])
  })

  it('a session that ends at the press is the shell’s to say', async () => {
    const s = stage(
      { approval: null },
      { requestApproval: () => refused(401, 'UNAUTHENTICATED') },
    )
    await open(s)
    await press(await askButton())
    await press(within(await signOff()).getByRole('button', { name: a.askThem }))
    expect(await screen.findByText(words.expired.body)).toBeTruthy()
  })

  it('none of the platform’s words, never weeks, and no mailto, open or asked', async () => {
    await open(unasked())
    await press(await askButton())
    expect(machineryIn(wordsOf(document.body))).toEqual([])
    expect(document.body.textContent).not.toMatch(/week/i)
    expect(document.body.innerHTML).not.toMatch(/mailto:/i)
  })
})
