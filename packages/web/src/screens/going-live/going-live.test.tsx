// @vitest-environment jsdom
import { ManifestApiError, type Schemas } from '@manifest/contract'
import { fixtures } from '@manifest/mock'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../app.js'
import type { Platform } from '../../platform/api.js'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'

/**
 * GOING LIVE, MOMENTS 10 AND 11 (F5 Task 6): what stands between the app and its students, and
 * who has each piece. Through the whole App against a recording `Platform`, every read the
 * person's own session. A map: nothing on it is theirs to press yet.
 */
const g = words.goingLive
const TZ = 'America/Vancouver'
const NOW = new Date('2026-09-30T19:00:00.000Z')
const SLUG = 'reading-responses'
const PROJECT: Schemas['Project'] = {
  ...fixtures.PROJECT,
  name: 'Reading responses',
  slug: SLUG,
  launchedAt: null,
}
/** 3:12pm on 18 September in Vancouver. */
const CANDIDATE: Schemas['Release'] = {
  ...fixtures.RELEASE,
  createdAt: '2026-09-18T22:12:00.000Z',
}
const NOTHING_RECORDED: Schemas['LaunchRecords'] = {
  projectId: PROJECT.id,
  iamRegistration: null,
  privacyAssessment: null,
  stagingRegistration: null,
}
/** The checklist that goes with nothing recorded: the assessment and production's registration unmet. */
const CLOCKS_UNMET: Schemas['LaunchReadiness'] = {
  ...fixtures.LAUNCH_READINESS,
  items: fixtures.LAUNCH_READINESS.items.map((i) =>
    i.id === 'iam-registration' || i.id === 'privacy-assessment'
      ? { ...i, state: 'unmet' as const }
      : i,
  ),
}

const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'test')
const never = () => new Promise<never>(() => undefined)

type World = {
  launchedAt: string | null
  readiness: Schemas['LaunchReadiness']
  records: Schemas['LaunchRecords']
  /** The candidate's newest decision; null when nobody has decided (Task 8). */
  approval: Schemas['Approval'] | null
}

function stage(
  world: Partial<World> = {},
  refuse: Partial<Record<string, () => unknown>> = {},
) {
  const w: World = {
    launchedAt: null,
    readiness: fixtures.LAUNCH_READINESS,
    records: fixtures.LAUNCH_RECORDS,
    approval: fixtures.APPROVAL,
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
  const environments = fixtures.ENVIRONMENTS.map((e) => ({
    ...e,
    hostname: e.hostname.replace('mock-app', SLUG),
  }))
  const platform: Platform = {
    getMe: () => Promise.resolve(fixtures.ME),
    listProjects: answer('listProjects', () => [
      { ...PROJECT, launchedAt: w.launchedAt },
    ]),
    getProject: never,
    getRelease: answer('getRelease', () => CANDIDATE),
    listEnvironments: answer('listEnvironments', () => environments),
    listInstances: never,
    listIncidents: never,
    runRehearsal: () => new Promise<never>(() => undefined),
    getLaunchReadiness: answer('getLaunchReadiness', () => w.readiness),
    getLaunchRecords: answer('getLaunchRecords', () => w.records),
    getApproval: answer('getApproval', () => w.approval),
    requestApproval: never,
    getEnvironment: answer('getEnvironment', (id: string) =>
      environments.find((e) => e.id === id)!,
    ),
    startIntakeSession: never,
    endIntakeSession: never,
    checkSlug: never,
    listBlueprints: never,
    createProject: never,
    mintToken: never,
    deploy: never,
    listAppSecrets: never,
    setAppSecret: never,
    listMembers: never,
    revokeToken: never,
    addMember: never,
    removeMember: never,
    listTokens: never,
    listPendingActions: never,
    confirmPendingAction: never,
    rejectPendingAction: never,
    archiveProject: never,
    restoreProject: never,
    deleteProject: never,
    watchProject: () => ({ ready: never(), close: () => undefined }),
  }
  const called = (name: string) =>
    calls.filter((c) => c[0] === name).map((c) => c.slice(1))
  return { platform, called, world: w }
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
})
/** A test that set the page's visibility gives jsdom's own back (minors m48). */
const restoreVisibility = () => Reflect.deleteProperty(document, 'visibilityState')
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  restoreVisibility()
})

async function open(s = stage()) {
  window.history.pushState({}, '', `/apps/${SLUG}/going-live`)
  render(<App platform={s.platform} timeZone={TZ} now={() => NOW} />)
  await screen.findByRole('heading', { level: 1, name: g.title })
  return s
}
/** The page has read its checklist: the short jobs are drawn. */
const jobs = () => screen.findByRole('region', { name: g.shortJobs.title })
const clocks = () => [...document.querySelectorAll<HTMLElement>('.mf-clockitem')]
/** The page's words, without hostnames (mono, allowed: C3). */
function wordsOn(element: HTMLElement = document.body): string {
  const copy = element.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.mono, .mock-banner').forEach((mono) => mono.remove())
  return copy.textContent ?? ''
}

describe('the page: letting your students in (moment 11)', () => {
  it('its heading and lead, in Rich’s words, once it has read what stands (it may turn out launched)', async () => {
    await open()
    expect(await screen.findByText(g.lead)).toBeTruthy()
    expect(g.lead).toBe(
      'Going live isn’t a button. Most of it takes minutes, but three things are answered by other people, one after another, and each may take several days. That’s why this page exists from day one.',
    )
  })

  it('m3: its headings go down one level at a time: the h1, then the clocks and the short jobs at h2', async () => {
    await open()
    await jobs()
    const levels = [
      ...document.querySelectorAll('main h1, main h2, main h3, main h4'),
    ].map((h) => Number(h.tagName[1]))
    expect(levels[0]).toBe(1)
    levels.forEach((level, i) => {
      if (i > 0)
        expect(level, `heading ${i}: ${levels.join(',')}`).toBeLessThanOrEqual(
          levels[i - 1]! + 1,
        )
    })
    for (const clock of clocks())
      expect(clock.querySelector('.mf-clockitem__title')?.tagName).toBe('H2')
  })

  it('the version that would go live: the one on the trying-out address, by its date', async () => {
    const s = await open()
    await jobs()
    expect(
      screen.getByText(
        'What goes live is the version on your trying-out address: the one from 18 September, 3:12pm.',
      ),
    ).toBeTruthy()
    expect(s.called('getRelease')).toEqual([
      [fixtures.LAUNCH_READINESS.candidateReleaseId],
    ])
  })

  it('nothing on trying-out yet: says so, with a way to it', async () => {
    const s = await open(
      stage({ readiness: { ...fixtures.LAUNCH_READINESS, candidateReleaseId: null } }),
    )
    await jobs()
    expect(screen.getByText(g.noVersion)).toBeTruthy()
    expect(screen.getByRole('link', { name: g.toTryingOut }).getAttribute('href')).toBe(
      `/apps/${SLUG}/preview?tab=trying-out`,
    )
    expect(s.called('getRelease')).toEqual([])
  })

  it('one numbered list of three steps in UBC’s order, one card (the assessment’s), and F5’s staging line gone (D2)', async () => {
    await open()
    await jobs()
    const steps = screen.getByRole('list', { name: g.steps.label })
    expect(steps.tagName).toBe('OL')
    // The card's title read by its class, not its tag: its level is the page's (m3).
    expect(
      within(steps)
        .getAllByRole('listitem')
        .map(
          (li) =>
            li.querySelector('.mf-clockitem__title, .going-live__name')?.textContent,
        ),
    ).toEqual([g.steps.assessment.title, g.steps.staging.title, g.steps.production.title])
    expect(clocks()).toHaveLength(1)
    expect(clocks()[0]!.querySelector('.mf-clockitem__title')?.textContent).toBe(
      g.steps.assessment.title,
    )
    expect(document.body.textContent).not.toContain('a registration of its own')
  })

  it('each step says what its record says: the assessment with the Privacy Office since the day it was sent, both registrations registered', async () => {
    await open()
    await jobs()
    const [assessment] = clocks()
    expect(assessment!.querySelector('.mf-chip')?.textContent).toBe(
      g.steps.assessment.with,
    )
    expect(assessment!.textContent).toContain('since 18 September')
    expect(assessment!.textContent).toContain('waiting 12 days')
    const steps = screen.getByRole('list', { name: g.steps.label })
    expect(steps.textContent).toContain('Registered 8 September')
    expect(steps.textContent).toContain('Registered 14 September')
  })

  it('a registration the checklist counts unmet never says done: it is with the Manifest team (Rich, 2026-09-30)', async () => {
    await open(
      stage({
        readiness: {
          ...fixtures.LAUNCH_READINESS,
          items: fixtures.LAUNCH_READINESS.items.map((i) =>
            i.id === 'iam-registration' ? { ...i, state: 'unmet' as const } : i,
          ),
        },
      }),
    )
    await jobs()
    const third = within(screen.getByRole('list', { name: g.steps.label })).getAllByRole(
      'listitem',
    )[2]!
    expect(third.querySelector('.mf-chip')?.textContent).toBe(g.steps.withTeam)
    expect(third.textContent).toContain(g.steps.needsChange)
  })

  it('every step done: three steady lines, and no card', async () => {
    await open(
      stage({
        records: {
          ...fixtures.LAUNCH_RECORDS,
          privacyAssessment: {
            ...fixtures.PRIVACY_ASSESSMENT,
            state: 'approved',
            approvedAt: '2026-09-21T19:00:00.000Z',
          },
        },
        readiness: {
          ...fixtures.LAUNCH_READINESS,
          items: fixtures.LAUNCH_READINESS.items.map((i) => ({
            ...i,
            state: 'met' as const,
          })),
        },
      }),
    )
    await jobs()
    expect(clocks()).toHaveLength(0)
    const steps = screen.getByRole('list', { name: g.steps.label })
    expect(steps.querySelectorAll('.mf-is-steady')).toHaveLength(3)
  })

  it('nothing recorded: step 1 not started, still, with the honest admission (part one); the others say what they wait for', async () => {
    await open(stage({ records: NOTHING_RECORDED, readiness: CLOCKS_UNMET }))
    await jobs()
    expect(clocks()).toHaveLength(1)
    const [c] = clocks()
    expect(c!.querySelector('.mf-chip')?.textContent).toBe(g.steps.notStarted)
    expect(c!.textContent).toContain(g.steps.duration)
    expect(c!.textContent).toContain(g.steps.admission.title)
    expect(c!.textContent).toContain(g.steps.admission.body)
    expect(c!.querySelector('.mf-pulse, .mf-bar__fill--working')).toBeNull()
    const steps = screen.getByRole('list', { name: g.steps.label })
    expect(steps.textContent).toContain(g.steps.waitsFor.assessment)
    expect(steps.textContent).toContain(g.steps.waitsFor.staging)
  })

  it('no stopgap: no mailto anywhere, nothing to press on a step, and no step needs you (part one)', async () => {
    await open(stage({ records: NOTHING_RECORDED, readiness: CLOCKS_UNMET }))
    await jobs()
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
    const steps = screen.getByRole('list', { name: g.steps.label })
    expect(steps.querySelector('a, button')).toBeNull()
    expect(steps.querySelector('.mf-is-attention')).toBeNull()
  })

  it('switched off (Decision 16): every step and row says where it stands, and none has a button', async () => {
    const s = stage({
      readiness: {
        ...fixtures.LAUNCH_READINESS,
        // A dry run theirs to run, and a sign-off refused: each would draw its button.
        items: fixtures.LAUNCH_READINESS.items.map((i) =>
          i.id === 'rehearsal' || i.id === 'admin-approval'
            ? { ...i, state: 'unmet' as const }
            : i,
        ),
      },
      approval: { ...fixtures.APPROVAL, decision: 'rejected', reason: 'Not this one.' },
    })
    s.platform.listProjects = () =>
      Promise.resolve([
        {
          ...PROJECT,
          state: 'archived',
          archivedAt: '2026-09-29T17:00:00.000Z',
        },
      ])
    await open(s)
    const region = await jobs()
    expect(within(region).getByText(g.rows.rehearsal.name)).toBeTruthy()
    expect(within(region).getByText(g.rows.approval.name)).toBeTruthy()
    expect(region.querySelector('button, a.mf-btn')).toBeNull()
    expect(
      screen.getByRole('list', { name: g.steps.label }).querySelector('button'),
    ).toBeNull()
    expect(clocks()).toHaveLength(1)
  })

  it('the same app switched on: the dry run and Talk it through are there (the control for the test above)', async () => {
    await open(
      stage({
        readiness: {
          ...fixtures.LAUNCH_READINESS,
          items: fixtures.LAUNCH_READINESS.items.map((i) =>
            i.id === 'rehearsal' || i.id === 'admin-approval'
              ? { ...i, state: 'unmet' as const }
              : i,
          ),
        },
        approval: { ...fixtures.APPROVAL, decision: 'rejected', reason: 'Not this one.' },
      }),
    )
    const region = await jobs()
    expect(within(region).getByRole('button', { name: g.dryRun.button })).toBeTruthy()
    expect(
      within(region).getByRole('button', { name: g.rows.approval.talk }),
    ).toBeTruthy()
  })

  it('the short jobs, for the end: the rows, and code review last, set apart', async () => {
    await open()
    const region = await jobs()
    expect(region.textContent).toContain(g.shortJobs.lead)
    const rows = within(region).getAllByRole('listitem')
    // The mock's checklist less its two clocks: domain, rehearsal, scans, sign-off, code review.
    expect(rows).toHaveLength(5)
    const last = rows[rows.length - 1]!
    expect(last.classList.contains('going-live__row--apart')).toBe(true)
    expect(
      rows.filter((r) => r.classList.contains('going-live__row--apart')),
    ).toHaveLength(1)
    expect(last.textContent).toContain(g.rows.codeReview.name)
    // Its address in mono (a hostname is allowed on screen, and is not a word).
    const address = within(region).getByText(`${SLUG}.manifest.internal`, {
      exact: false,
    })
    expect(address.closest('.mono')).not.toBeNull()
  })

  it('m2: the short jobs are one list, named by their heading, so no list goes unnamed', async () => {
    await open()
    const region = await jobs()
    const lists = within(region).getAllByRole('list')
    expect(lists).toHaveLength(1)
    expect(within(region).getByRole('list', { name: g.shortJobs.title })).toBe(lists[0])
  })

  it.each([
    ['without code review', (id: string) => id !== 'code-review'],
    ['with code review alone', (id: string) => id === 'code-review'],
  ])('m2: a checklist %s draws no empty list', async (_, keep) => {
    const readiness: Schemas['LaunchReadiness'] = {
      ...fixtures.LAUNCH_READINESS,
      items: fixtures.LAUNCH_READINESS.items.filter(
        (i) => keep(i.id) || i.id === 'iam-registration' || i.id === 'privacy-assessment',
      ),
    }
    await open(stage({ readiness }))
    const region = await jobs()
    for (const list of within(region).getAllByRole('list'))
      expect(within(list).queryAllByRole('listitem').length).toBeGreaterThan(0)
  })

  it('each row says its state in a word, its owner, and one sentence', async () => {
    await open()
    const region = await jobs()
    const scans = within(region).getByText(g.rows.scans.name).closest('li') as HTMLElement
    expect(scans.querySelector('.mf-chip')?.textContent).toBe(g.state.steady)
    expect(scans.textContent).toContain(g.rows.scans.met)
    expect(scans.textContent).toContain(g.owners.forYou)
  })

  it('never offers to let their students in while the checklist is not ready (Task 10 draws it)', async () => {
    await open()
    await jobs()
    expect(screen.queryByRole('button', { name: /let your students in/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /let your students in/i })).toBeNull()
  })

  it('says several days, never weeks, and none of the platform’s words (C3)', async () => {
    await open(stage({ records: NOTHING_RECORDED, readiness: CLOCKS_UNMET }))
    await jobs()
    // No word boundary: textContent runs one element's words into the next ("weeksManifest").
    expect(document.body.textContent).not.toMatch(/week/i)
    expect(machineryIn(wordsOn())).toEqual([])
  })

  it('reads again when the page is shown again', async () => {
    const s = await open()
    await jobs()
    expect(s.called('getLaunchReadiness')).toHaveLength(1)
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => expect(s.called('getLaunchReadiness')).toHaveLength(2))
    expect(s.called('getLaunchRecords')).toHaveLength(2)
  })

  it('m17: shown again and the read refused: the good page stays, nothing is reported, and the next showing reads again', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    let failing = false
    const s = await open(
      stage(
        {},
        { getLaunchReadiness: () => (failing ? refused(500, 'INTERNAL') : undefined) },
      ),
    )
    await jobs()
    const rowsBefore = screen.getAllByRole('listitem').length
    failing = true
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    for (let showing = 0; showing < 2; showing++) {
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await act(async () => undefined)
    }
    await waitFor(() => expect(s.called('getLaunchReadiness')).toHaveLength(3))
    await act(async () => undefined)
    expect(screen.queryByText(words.refused.body)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(rowsBefore)
    expect(reports).toEqual([])
    vi.restoreAllMocks()
  })

  it('hidden again, it reads nothing (minors m48)', async () => {
    const s = await open()
    await jobs()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await act(async () => undefined)
    expect(s.called('getLaunchReadiness')).toHaveLength(1)
    expect(s.called('getLaunchRecords')).toHaveLength(1)
    // What afterEach does gives jsdom's own back (asserted here, never by the order of tests).
    restoreVisibility()
    expect(Object.getOwnPropertyDescriptor(document, 'visibilityState')).toBeUndefined()
    expect(document.visibilityState).toBe('visible')
  })

  it('a read refused says what is still true, with a reference, reported once; Try again reads again', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    let refusing = true
    const s = await open(
      stage(
        {},
        { getLaunchRecords: () => (refusing ? refused(500, 'INTERNAL') : undefined) },
      ),
    )
    expect(await screen.findByText(words.refused.body)).toBeTruthy()
    const reference = /quote ([0-9A-F]{4}-[0-9A-F]{4})\./.exec(
      document.body.textContent ?? '',
    )?.[1]
    await waitFor(() =>
      expect(reports).toEqual([expect.objectContaining({ reference, code: 'INTERNAL' })]),
    )
    refusing = false
    await act(async () => {
      screen.getByRole('button', { name: words.refused.button }).click()
    })
    await jobs()
    expect(s.called('getLaunchRecords')).toHaveLength(2)
    vi.restoreAllMocks()
  })

  it('a version whose date cannot be read goes undated, and the page stands', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await open(stage({}, { getRelease: () => refused(500, 'INTERNAL') }))
    await jobs()
    expect(screen.getByText(g.version(null))).toBeTruthy()
    vi.restoreAllMocks()
  })

  it('a session that ends while it reads is the shell’s to say', async () => {
    window.history.pushState({}, '', `/apps/${SLUG}/going-live`)
    render(
      <App
        platform={
          stage({}, { getLaunchReadiness: () => refused(401, 'UNAUTHENTICATED') })
            .platform
        }
        timeZone={TZ}
        now={() => NOW}
      />,
    )
    expect(await screen.findByText(words.expired.body)).toBeTruthy()
  })
})

describe('an app already launched (Decision 2, Review Focus 5)', () => {
  it('says it is live, links to the Overview, and draws no clocks and no rows', async () => {
    await open(stage({ launchedAt: '2026-10-03T17:00:00.000Z' }))
    expect(await screen.findByText(g.live)).toBeTruthy()
    // Live is a fact; that it works is not ours to say without reading it (never "It works").
    expect(g.live).toBe('It’s live.')
    expect(document.body.textContent).not.toMatch(/can use it|works/i)
    expect(screen.getByRole('link', { name: g.toOverview }).getAttribute('href')).toBe(
      `/apps/${SLUG}`,
    )
    expect(clocks()).toHaveLength(0)
    expect(screen.queryByRole('region', { name: g.shortJobs.title })).toBeNull()
  })

  it('launched since the App read the project (sitting 3’s carried minor): the checklist says so, and so does the page', async () => {
    await open(
      stage({
        launchedAt: null,
        readiness: { ...fixtures.LAUNCH_READINESS, launched: true },
      }),
    )
    expect(await screen.findByText(g.live)).toBeTruthy()
    expect(screen.getByRole('link', { name: g.toOverview })).toBeTruthy()
    expect(clocks()).toHaveLength(0)
    expect(screen.queryByRole('region', { name: g.shortJobs.title })).toBeNull()
    expect(screen.queryByText(g.lead)).toBeNull()
  })

  it('launched since: once the checklist has said so, it stays said: a later read that fails never turns it back', async () => {
    let failing = false
    const s = await open(
      stage(
        { launchedAt: null, readiness: { ...fixtures.LAUNCH_READINESS, launched: true } },
        { getLaunchReadiness: () => (failing ? refused(500, 'INTERNAL') : undefined) },
      ),
    )
    expect(await screen.findByText(g.live)).toBeTruthy()
    failing = true
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await act(async () => undefined)
    expect(screen.getByText(g.live)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(g.lead)).toBeNull()
    expect(s.called('getLaunchReadiness')).toHaveLength(1)
  })

  it('launched since: the first launch’s lead is never shown while the checklist is read', async () => {
    const s = stage({
      launchedAt: null,
      readiness: { ...fixtures.LAUNCH_READINESS, launched: true },
    })
    let answer: ((value: Schemas['LaunchReadiness']) => void) | undefined
    s.platform.getLaunchReadiness = () =>
      new Promise((resolve) => {
        answer = resolve
      })
    await open(s)
    expect(screen.queryByText(g.lead)).toBeNull()
    // Answered only once the page has asked: under the whole suite's load it may not have yet
    // (F6 sitting 6's closing run: an answer given to nobody, and the wait timed out).
    await waitFor(() => expect(answer).toBeDefined())
    await act(async () => answer!({ ...fixtures.LAUNCH_READINESS, launched: true }))
    expect(await screen.findByText(g.live)).toBeTruthy()
    expect(screen.queryByText(g.lead)).toBeNull()
  })
})
