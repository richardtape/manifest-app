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
import { Band } from './band.js'
import type { Platform } from '../../platform/api.js'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'

/**
 * THE APP'S OVERVIEW, ITS LANDING PAGE (F5 Task 5, Decisions 1–3), and the rail that reaches its
 * four pages, through the whole App against a recording `Platform`. Every read is the person's
 * own session, in the browser.
 */
const w = words.overview
const rail_ = words.preview.rail
const TZ = 'America/Vancouver'
const SLUG = 'reading-responses'
const PROJECT: Schemas['Project'] = {
  ...fixtures.PROJECT,
  name: 'Reading responses',
  slug: SLUG,
  launchedAt: null,
}
const LAUNCHED = '2026-10-03T17:00:00.000Z'
const BOTH_MET: Schemas['LaunchReadiness'] = {
  ...fixtures.LAUNCH_READINESS,
  items: fixtures.LAUNCH_READINESS.items.map((i) => ({ ...i, state: 'met' as const })),
}
/** Every step done: the assessment approved, both registrations active (the mock's `approved`). */
const ALL_DONE: Schemas['LaunchRecords'] = {
  ...fixtures.LAUNCH_RECORDS,
  privacyAssessment: {
    ...fixtures.PRIVACY_ASSESSMENT,
    state: 'approved',
    approvedAt: '2026-09-21T19:00:00.000Z',
  },
}

const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'test')
const never = () => new Promise<never>(() => undefined)

type World = {
  /** The sandbox has served an instance: a draft has been built. */
  built: boolean
  launchedAt: string | null
  readiness: Schemas['LaunchReadiness']
  /** F5b: the three records the steps are read from. */
  records: Schemas['LaunchRecords']
  /** The live address's instance, when not the fixture's (none). */
  production?: Schemas['Instance']
  /** The environments listed, when not all three (m1). */
  kinds?: Schemas['Environment']['kind'][]
  /** F5b Decision 16: switched off. */
  archived?: boolean
}
const BEFORE_LAUNCH: World = {
  built: true,
  launchedAt: null,
  readiness: fixtures.LAUNCH_READINESS,
  records: fixtures.LAUNCH_RECORDS,
}

/** A platform that answers the world given, and records every read. */
function stage(
  world: Partial<World> = {},
  refuse: Partial<Record<string, () => unknown>> = {},
) {
  const { built, launchedAt, readiness, records, production, kinds, archived } = {
    ...BEFORE_LAUNCH,
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
  const listed = fixtures.ENVIRONMENTS.filter((e) => kinds?.includes(e.kind) ?? true)
  const environments = listed.map((e) => ({
    ...e,
    hostname: e.hostname.replace('mock-app', SLUG),
    instance:
      e.kind === 'sandbox' && !built
        ? null
        : e.kind === 'production' && production !== undefined
          ? production
          : e.instance,
  }))
  const platform: Platform = {
    getMe: () => Promise.resolve(fixtures.ME),
    listProjects: answer('listProjects', () => [
      fixtures.PROJECT,
      {
        ...PROJECT,
        launchedAt,
        ...(archived === true
          ? { state: 'archived' as const, archivedAt: '2026-09-29T17:00:00.000Z' }
          : {}),
      },
    ]),
    getProject: never,
    getRelease: answer('getRelease', () => fixtures.RELEASE),
    listEnvironments: answer('listEnvironments', () => environments),
    listInstances: answer('listInstances', (environmentId: string) => ({
      environmentId,
      instances: [],
      truncated: false,
    })),
    listIncidents: answer('listIncidents', (environmentId: string) => ({
      environmentId,
      incidents: [],
    })),
    runRehearsal: () => new Promise<never>(() => undefined),
    getLaunchReadiness: answer('getLaunchReadiness', () => readiness),
    getLaunchRecords: answer('getLaunchRecords', () => records),
    getApproval: answer('getApproval', () => null),
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
  return { platform, called }
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    // Our own API: no plan agreed on the app (Task 9's hand-over reads it once launched).
    vi.fn(async (url: string) =>
      /^\/api\/apps\/[^/]+\/plan$/.test(url)
        ? new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404 })
        : new Response(null, { status: 204 }),
    ),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function open(path: string, s = stage()) {
  window.history.pushState({}, '', path)
  render(<App platform={s.platform} timeZone={TZ} />)
  return s
}
/** The Overview has read its addresses. */
const ready = async () => {
  await screen.findByRole('heading', { level: 1, name: PROJECT.name })
  return screen.findByRole('list', { name: w.addresses })
}
const rail = () => screen.getByRole('navigation', { name: 'Manifest' })
const band = () => screen.queryByRole('region', { name: w.band.title })
const press = (element: HTMLElement) =>
  act(async () => {
    fireEvent.click(element)
  })

describe('the Overview: the app’s landing page (Decision 1)', () => {
  it('names the app and who it is for, and each address in a row that opens its tab', async () => {
    await open(`/apps/${SLUG}`)
    const list = await ready()
    expect(screen.getByText('one class, all arriving at once')).toBeTruthy()
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    const tabs = [
      ['draft', words.preview.tabs.draft],
      ['trying-out', words.preview.tabs['trying-out']],
      ['students', words.preview.tabs.students],
    ] as const
    tabs.forEach(([tab, name], i) => {
      const link = within(rows[i]!).getByRole('link', { name })
      expect(link.getAttribute('href')).toBe(`/apps/${SLUG}/preview?tab=${tab}`)
    })
    // F4's serving facts: a version where something answers, and nothing yet for students.
    expect(rows[0]!.textContent).toMatch(/The version from \d+ September, \d+:\d\d[ap]m/)
    expect(rows[1]!.textContent).toMatch(/The version from \d+ September, \d+:\d\d[ap]m/)
    expect(rows[2]!.textContent).toContain(words.preview.facts.nothing)
  })

  it('m1: the address list’s name claims no count, so two addresses are not called three', async () => {
    await open(`/apps/${SLUG}`, stage({ kinds: ['sandbox', 'staging'] }))
    const list = await ready()
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(list.getAttribute('aria-label')).not.toMatch(/\b(one|two|three)\b/i)
  })

  it('m1: with no address listed, no empty list is drawn', async () => {
    await open(`/apps/${SLUG}`, stage({ kinds: [] }))
    await screen.findByRole('link', { name: words.preview.askForChange })
    expect(screen.queryByRole('list', { name: w.addresses })).toBeNull()
  })

  it('a dry run taken down again (the platform’s 5b) leaves the live address with nothing there before a launch, never switched off', async () => {
    const gone: Schemas['Instance'] = {
      ...fixtures.INSTANCE,
      environmentId: fixtures.PRODUCTION_ID,
      state: 'gone',
    }
    await open(`/apps/${SLUG}`, stage({ production: gone }))
    const rows = within(await ready()).getAllByRole('listitem')
    expect(rows[2]!.textContent).toContain(words.preview.facts.nothing)
    expect(rows[2]!.textContent).not.toContain('Switched off')
  })

  it('a row opens the Preview on its tab', async () => {
    await open(`/apps/${SLUG}`)
    const list = await ready()
    await press(
      within(list).getByRole('link', { name: words.preview.tabs['trying-out'] }),
    )
    const tab = await screen.findByRole('tab', { name: words.preview.tabs['trying-out'] })
    expect(tab.getAttribute('aria-selected')).toBe('true')
    expect(window.location.pathname + window.location.search).toBe(
      `/apps/${SLUG}/preview?tab=trying-out`,
    )
  })

  it('Ask for a change goes to the app’s change page', async () => {
    await open(`/apps/${SLUG}`)
    await ready()
    const ask = screen.getByRole('link', { name: words.preview.askForChange })
    expect(ask.getAttribute('href')).toBe(`/apps/${SLUG}/change`)
  })

  it('shows none of the platform’s words (C3)', async () => {
    await open(`/apps/${SLUG}`)
    await ready()
    await screen.findByRole('region', { name: w.band.title })
    const copy = document.body.cloneNode(true) as HTMLElement
    copy.querySelectorAll('.mono').forEach((mono) => mono.remove())
    expect(machineryIn(copy.textContent ?? '')).toEqual([])
  })
})

describe('the band: before your students can use it (Decision 3, moment 10; F5b’s steps)', () => {
  it('a built app, not launched, with a step not done: the band, one after another, and Going live (part one)', async () => {
    const s = await open(`/apps/${SLUG}`)
    await ready()
    const region = await screen.findByRole('region', { name: w.band.title })
    expect(region.textContent).toContain(w.band.body)
    expect(w.band.body).toBe(
      'Three things other people answer, one after another, and each may take several days. Going live shows where each one is.',
    )
    const going = within(region).getByRole('link', { name: w.band.button })
    expect(going.getAttribute('href')).toBe(`/apps/${SLUG}/going-live`)
    // Part one: nothing can be sent, so never Start them, and never needs you.
    expect(within(region).queryByRole('link', { name: w.band.start })).toBeNull()
    expect(region.querySelector('.mf-is-attention')).toBeNull()
    // The records beside the checklist, under the same gate (Decision 4).
    expect(s.called('getLaunchReadiness')).toEqual([[PROJECT.id]])
    expect(s.called('getLaunchRecords')).toEqual([[PROJECT.id]])
  })

  it('says the steps may take several days, never weeks (Rich)', async () => {
    await open(`/apps/${SLUG}`)
    const region = await screen.findByRole('region', { name: w.band.title })
    expect(region.textContent).toMatch(/may take several days/)
    expect(document.body.textContent).not.toMatch(/weeks/i)
  })

  it('no draft built yet: no band, and neither the checklist nor the records is read', async () => {
    const s = await open(`/apps/${SLUG}`, stage({ built: false }))
    await ready()
    expect(band()).toBeNull()
    expect(s.called('getLaunchReadiness')).toEqual([])
    expect(s.called('getLaunchRecords')).toEqual([])
  })

  it('launched: no band, no records read, and For your students leads', async () => {
    const s = await open(`/apps/${SLUG}`, stage({ launchedAt: LAUNCHED }))
    const list = await ready()
    expect(band()).toBeNull()
    // The checklist is read once, by Waiting to reach your students alone (F6b Task 10).
    await waitFor(() => expect(s.called('getLaunchReadiness')).toHaveLength(1))
    expect(s.called('getLaunchRecords')).toEqual([])
    const students = screen.getByRole('region', { name: words.preview.tabs.students })
    // It leads: before the addresses.
    expect(
      students.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('every step done: no band', async () => {
    const s = await open(
      `/apps/${SLUG}`,
      stage({ readiness: BOTH_MET, records: ALL_DONE }),
    )
    await ready()
    await waitFor(() => expect(s.called('getLaunchRecords')).toHaveLength(1))
    expect(band()).toBeNull()
  })

  it('both checklist items met while the assessment is still with the Privacy Office: the band stays (the steps read the records)', async () => {
    await open(`/apps/${SLUG}`, stage({ readiness: BOTH_MET }))
    await ready()
    expect(await screen.findByRole('region', { name: w.band.title })).toBeTruthy()
  })

  it('switched off (Decision 16): no band', async () => {
    const s = await open(`/apps/${SLUG}`, stage({ archived: true }))
    await ready()
    await waitFor(() => expect(s.called('getLaunchRecords')).toHaveLength(1))
    expect(band()).toBeNull()
  })

  it('a checklist that cannot be read: no band, the rest of the page as it is', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await open(
      `/apps/${SLUG}`,
      stage({}, { getLaunchReadiness: () => refused(500, 'INTERNAL') }),
    )
    const list = await ready()
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    await waitFor(() => expect(warn).toHaveBeenCalled())
    expect(band()).toBeNull()
    expect(screen.queryByText(words.refused.body)).toBeNull()
    vi.restoreAllMocks()
  })

  it('records that cannot be read: no band, the rest of the page as it is', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await open(
      `/apps/${SLUG}`,
      stage({}, { getLaunchRecords: () => refused(500, 'INTERNAL') }),
    )
    const list = await ready()
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    await waitFor(() => expect(warn).toHaveBeenCalled())
    expect(band()).toBeNull()
    expect(screen.queryByText(words.refused.body)).toBeNull()
    vi.restoreAllMocks()
  })

  it('a session that ends while it reads the checklist is the shell’s to say', async () => {
    await open(
      `/apps/${SLUG}`,
      stage({}, { getLaunchReadiness: () => refused(401, 'UNAUTHENTICATED') }),
    )
    expect(await screen.findByText(words.expired.body)).toBeTruthy()
  })

  it('the band’s button: Start them, to Going live, only when the steps say so (part two); its state drawn when it needs you', () => {
    render(<Band slug={SLUG} band={{ button: 'start', state: 'attention' }} />)
    const region = screen.getByRole('region', { name: w.band.title })
    const start = within(region).getByRole('link', { name: w.band.start })
    expect(start.getAttribute('href')).toBe(`/apps/${SLUG}/going-live`)
    expect(within(region).queryByRole('link', { name: w.band.button })).toBeNull()
    cleanup()
    render(<Band slug={SLUG} band={{ button: 'going-live', state: 'waiting' }} />)
    expect(screen.getByRole('link', { name: w.band.button })).toBeTruthy()
    expect(screen.queryByRole('link', { name: w.band.start })).toBeNull()
  })
})

describe('the rail: Overview · Preview · Conversations · Going live · People (Decision 2; F6b Task 5)', () => {
  it('names the app, and its five pages: People after Going live (Agents comes with its page, F6b sitting 5)', async () => {
    await open(`/apps/${SLUG}`)
    await ready()
    expect(rail().querySelector('.mf-rail__over')?.textContent).toBe(PROJECT.name)
    const links = [
      [rail_.overview, `/apps/${SLUG}`],
      [rail_.preview, `/apps/${SLUG}/preview`],
      [rail_.conversations, `/apps/${SLUG}/conversations`],
      [rail_.goingLive, `/apps/${SLUG}/going-live`],
      [rail_.people, `/apps/${SLUG}/people`],
    ] as const
    // The project's items follow the rail's own two (Your apps, Start something new).
    const items = [...rail().querySelectorAll('a.mf-rail__item')]
      .slice(2)
      .map((a) => [a.textContent, a.getAttribute('href')])
    expect(items).toEqual(links)
  })

  it.each([
    [`/apps/${SLUG}`, rail_.overview],
    [`/apps/${SLUG}/preview`, rail_.preview],
    [`/apps/${SLUG}/preview?tab=students`, rail_.preview],
    [`/apps/${SLUG}/conversations`, rail_.conversations],
    [`/apps/${SLUG}/change`, rail_.conversations],
    [`/apps/${SLUG}/going-live`, rail_.goingLive],
    [`/apps/${SLUG}/people`, rail_.people],
  ])('%s: %s is current', async (path, current) => {
    await open(path)
    await waitFor(() =>
      expect(rail().querySelector('[aria-current="page"]')?.textContent).toBe(current),
    )
  })
})

describe('F4’s addresses still work (Review Focus 5)', () => {
  it('/apps/x?tab=trying-out opens the Preview’s tab, and the bar says the new address, with no navigation', async () => {
    window.history.pushState({}, '', `/apps/${SLUG}?tab=trying-out`)
    const before = window.history.length
    render(<App platform={stage().platform} timeZone={TZ} />)
    const tab = await screen.findByRole('tab', { name: words.preview.tabs['trying-out'] })
    expect(tab.getAttribute('aria-selected')).toBe('true')
    expect(window.location.pathname + window.location.search).toBe(
      `/apps/${SLUG}/preview?tab=trying-out`,
    )
    expect(window.history.length).toBe(before)
    expect(rail().querySelector('[aria-current="page"]')?.textContent).toBe(rail_.preview)
  })
})

describe('F6 Task 9: coming back to the Overview (moment 16, design §2 and §4)', () => {
  const k = words.keeping
  const app = { projectId: fixtures.PROJECT_ID, name: PROJECT.name, slug: SLUG }
  const AT = '2026-10-01T17:03:00.000Z'
  /** Our own API answers as told: needs, since; the plan as before (none agreed). */
  function ours(answers: { needs?: unknown; since?: unknown; fail?: boolean }) {
    const asked: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        asked.push(url)
        const json = (status: number, body: unknown) =>
          new Response(JSON.stringify(body), { status })
        if (answers.fail && /^\/api\/(needs|since)/.test(url))
          return json(500, { error: { code: 'INTERNAL' } })
        if (url.startsWith('/api/needs')) return json(200, { needs: answers.needs ?? [] })
        if (url.startsWith('/api/since'))
          return json(200, answers.since ?? { lastHere: null, lines: [] })
        if (/^\/api\/apps\/[^/]+\/plan$/.test(url))
          return json(404, { error: { code: 'NOT_FOUND' } })
        return new Response(null, { status: 204 })
      }),
    )
    return asked
  }

  /** The sign-off unmet with a version on trying-out, nobody decided, asked or not (F5b Decision 15). */
  const signOff = (since: string | null): Schemas['LaunchReadiness'] => ({
    ...fixtures.LAUNCH_READINESS,
    items: fixtures.LAUNCH_READINESS.items.map((i) =>
      i.id === 'admin-approval' ? { ...i, state: 'unmet' as const, since } : i,
    ),
  })

  it('F5b: the sign-off unasked raises “something on its way to your students needs you”, with Going live (Decision 15)', async () => {
    ours({})
    await open(`/apps/${SLUG}`, stage({ readiness: signOff(null) }))
    const band = await screen.findByRole('region', { name: k.band.label })
    expect(band.textContent).toContain(k.band.goingLive(PROJECT.name))
    expect(
      within(band)
        .getByRole('link', { name: k.band.goingLiveButton })
        .getAttribute('href'),
    ).toBe(`/apps/${SLUG}/going-live`)
  })

  it('F5b: asked, and waiting on an administrator: nothing on its way needs them', async () => {
    ours({})
    const s = await open(
      `/apps/${SLUG}`,
      stage({ readiness: signOff('2026-09-28T19:00:00.000Z') }),
    )
    await ready()
    await waitFor(() => expect(s.called('getLaunchReadiness')).toHaveLength(1))
    await screen.findByRole('region', { name: w.band.title })
    expect(screen.queryByText(k.band.goingLive(PROJECT.name))).toBeNull()
  })

  it('F5b: switched off, an unasked sign-off raises no need (Decision 16; the sitting 2 review’s M9)', async () => {
    ours({})
    const s = await open(
      `/apps/${SLUG}`,
      stage({ readiness: signOff(null), archived: true }),
    )
    await ready()
    await waitFor(() => expect(s.called('getLaunchReadiness')).toHaveLength(1))
    await screen.findByText(k.card.switchedOff('29 September'))
    expect(screen.queryByText(k.band.goingLive(PROJECT.name))).toBeNull()
    expect(screen.queryByRole('region', { name: k.band.label })).toBeNull()
  })

  it('asks our server for this app’s needs and lines alone', async () => {
    const asked = ours({})
    await open(`/apps/${SLUG}`)
    await ready()
    await waitFor(() =>
      expect(asked).toEqual(
        expect.arrayContaining([
          `/api/needs?projectId=${fixtures.PROJECT_ID}`,
          `/api/since?projectId=${fixtures.PROJECT_ID}`,
        ]),
      ),
    )
  })

  it('the band, when our server says the live address is down: its words and Start it again, a press here (Task 10)', async () => {
    ours({ needs: [{ kind: 'down', app, from: AT, owner: true }] })
    await open(`/apps/${SLUG}`)
    const band = await screen.findByRole('region', { name: k.band.label })
    expect(band.textContent).toContain(k.band.down(PROJECT.name, '10:03am'))
    expect(within(band).getByRole('button', { name: k.band.startAgain })).toBeTruthy()
    expect(within(band).queryByRole('link', { name: k.band.startAgain })).toBeNull()
    expect(machineryIn(document.body.textContent ?? '')).toEqual([])
  })

  it('a helper: the same words, who can start it again, and no press (Review Focus 5)', async () => {
    ours({ needs: [{ kind: 'down', app, from: AT, owner: false }] })
    await open(`/apps/${SLUG}`)
    const band = await screen.findByRole('region', { name: k.band.label })
    expect(band.textContent).toContain(k.band.downHelper)
    expect(within(band).queryByRole('button')).toBeNull()
    expect(within(band).queryByRole('link')).toBeNull()
  })

  it('answering again: What happened? is a press here (Task 10)', async () => {
    ours({
      needs: [{ kind: 'answering-again', app, from: AT, to: '2026-10-01T17:07:00.000Z' }],
    })
    await open(`/apps/${SLUG}`)
    const band = await screen.findByRole('region', { name: k.band.label })
    expect(within(band).getByRole('button', { name: k.band.whatHappened })).toBeTruthy()
    expect(within(band).queryByRole('link', { name: k.band.whatHappened })).toBeNull()
  })

  it('back from signing in again (then=start-again): said, the same button, never pressed by itself, and the address without it (Decision 10)', async () => {
    ours({ needs: [{ kind: 'down', app, from: AT, owner: true }] })
    const s = await open(`/apps/${SLUG}?then=start-again`)
    const band = await screen.findByRole('region', { name: k.band.label })
    expect(band.textContent).toContain(words.goingLive.letIn.again)
    expect(within(band).getByRole('button', { name: k.band.startAgain })).toBeTruthy()
    expect(s.called('deploy')).toEqual([])
    expect(window.location.pathname + window.location.search).toBe(`/apps/${SLUG}`)
  })

  it('an address with then=start-again and nothing down: the page as ever, the address without it', async () => {
    ours({})
    await open(`/apps/${SLUG}?then=start-again`)
    await ready()
    expect(window.location.pathname + window.location.search).toBe(`/apps/${SLUG}`)
    expect(document.body.textContent).not.toContain(words.goingLive.letIn.again)
  })

  it('nothing needs them: no band', async () => {
    ours({})
    await open(`/apps/${SLUG}`)
    await ready()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByRole('region', { name: k.band.label })).toBeNull()
  })

  it('Since you were last here: its own lines and [Everything]; never there before, nothing', async () => {
    ours({
      since: {
        lastHere: '2026-09-30T17:00:00.000Z',
        lines: [
          {
            id: 'e1',
            at: AT,
            happening: { kind: 'signed-off', releaseId: 'r' },
            who: null,
            whom: null,
            app,
          },
        ],
      },
    })
    await open(`/apps/${SLUG}`)
    const since = await screen.findByRole('region', { name: k.since.title })
    expect(since.textContent).toContain(k.lines.signedOff)
    expect(
      within(since).getByRole('link', { name: k.since.everything }).getAttribute('href'),
    ).toBe(`/apps/${SLUG}/history`)
    cleanup()
    ours({ since: { lastHere: null, lines: [] } })
    await open(`/apps/${SLUG}`)
    await ready()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByRole('region', { name: k.since.title })).toBeNull()
  })

  it('a failure of ours loses the band and the lines, never the page', async () => {
    ours({ fail: true })
    await open(`/apps/${SLUG}`)
    expect(await ready()).toBeTruthy()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByRole('region', { name: k.band.label })).toBeNull()
  })

  it('How we keep watch: closed, on a launched app; never before it launched', async () => {
    ours({})
    await open(`/apps/${SLUG}`, stage({ launchedAt: LAUNCHED, readiness: BOTH_MET }))
    await ready()
    const summary = await screen.findByText(k.how.title)
    expect((summary.closest('details') as HTMLDetailsElement).open).toBe(false)
    cleanup()
    ours({})
    await open(`/apps/${SLUG}`)
    await ready()
    expect(screen.queryByText(k.how.title)).toBeNull()
  })
})

describe('F6 Task 11: end of term on the Overview (moment 20, design §5)', () => {
  const k = words.keeping
  const s = k.switching
  /**
   * Our own API answers nothing needing them; the plan as before (none agreed). `watching`: our
   * server already keeps the app's watch, so the shell mints nothing on its own (Task 8).
   */
  function quiet(watching = false, needs: unknown[] = []) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const json = (status: number, body: unknown) =>
          new Response(JSON.stringify(body), { status })
        if (url.startsWith('/api/needs')) return json(200, { needs })
        if (url.startsWith('/api/since')) return json(200, { lastHere: null, lines: [] })
        if (url.includes('/keeping'))
          return json(200, {
            watching,
            until: watching ? '2027-10-01T00:00:00.000Z' : null,
            tokenId: null,
            mine: false,
          })
        if (/^\/api\/apps\/[^/]+\/plan$/.test(url))
          return json(404, { error: { code: 'NOT_FOUND' } })
        return new Response(null, { status: 204 })
      }),
    )
  }
  /**
   * The world as `stage`, with the person's role on the app, and the app itself as the platform
   * holds it: switched off and back on in place, so the shell's second reading sees it.
   */
  function owned(
    project: Partial<Schemas['Project']>,
    role: 'owner' | 'collaborator' = 'owner',
    world: Partial<World> = {},
  ) {
    const st = stage(world)
    let held: Schemas['Project'] = { ...PROJECT, ...project }
    const calls: string[] = []
    const platform: Platform = {
      ...st.platform,
      listProjects: () => Promise.resolve([fixtures.PROJECT, held]),
      listMembers: () =>
        Promise.resolve([{ ...fixtures.MEMBERS[0]!, userId: fixtures.ME.id, role }]),
      archiveProject: () => {
        calls.push('archiveProject')
        held = { ...held, state: 'archived', archivedAt: '2026-12-12T20:00:00.000Z' }
        return Promise.resolve(held)
      },
      restoreProject: () => {
        calls.push('restoreProject')
        held = { ...held, state: 'active' }
        return Promise.resolve(held)
      },
      mintToken: () => {
        calls.push('mintToken')
        return Promise.resolve(fixtures.MINTED_TOKEN)
      },
    }
    return { ...st, platform, calls }
  }
  const ARCHIVED = { state: 'archived' as const, archivedAt: '2026-12-12T20:00:00.000Z' }
  /** The students' address after a switch-off: still naming the version it served, gone (M4). */
  const GONE: Schemas['Instance'] = {
    id: 'i-gone',
    environmentId: '33333333-3333-4333-8333-333333333333',
    releaseId: fixtures.RELEASE.id,
    kind: 'web',
    state: 'gone',
    lastSeenAt: null,
    createdAt: '2026-09-20T17:00:00.000Z',
  }
  const section = () => screen.queryByRole('region', { name: s.title })

  it('an owner: Switching it off at the foot of the page', async () => {
    quiet()
    await open(`/apps/${SLUG}`, owned({}))
    await ready()
    expect(await screen.findByRole('region', { name: s.title })).toBeTruthy()
    expect(within(section()!).getByRole('button', { name: s.off })).toBeTruthy()
    // Never live: Delete it beside it.
    expect(within(section()!).getByRole('button', { name: s.delete })).toBeTruthy()
  })

  it('a helper: none of it (Review Focus 5)', async () => {
    quiet()
    await open(`/apps/${SLUG}`, owned({}, 'collaborator'))
    await ready()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(section()).toBeNull()
  })

  it('switched off from here: the shell reads the app again, the page standing, and says so with Switch it back on', async () => {
    quiet(true)
    const st = owned({})
    await open(`/apps/${SLUG}`, st)
    await ready()
    const area = await screen.findByRole('region', { name: s.title })
    await press(within(area).getByRole('button', { name: s.off }))
    await press(within(area).getByRole('button', { name: s.off }))
    expect(st.calls).toEqual(['archiveProject'])
    expect(await screen.findByText(k.card.switchedOff('12 December'))).toBeTruthy()
    expect(screen.getByRole('button', { name: s.backOn })).toBeTruthy()
    expect(section()).toBeNull()
  })

  it('switched off from here: our server’s needs and lines read again for the switched-off app (the review’s M1)', async () => {
    quiet(true)
    const st = owned({})
    await open(`/apps/${SLUG}`, st)
    await ready()
    const asked = () =>
      vi.mocked(fetch).mock.calls.filter(([url]) => String(url).startsWith('/api/needs'))
        .length
    await waitFor(() => expect(asked()).toBe(1))
    const area = await screen.findByRole('region', { name: s.title })
    await press(within(area).getByRole('button', { name: s.off }))
    await press(within(area).getByRole('button', { name: s.off }))
    await screen.findByText(k.card.switchedOff('12 December'))
    await waitFor(() => expect(asked()).toBe(2))
  })

  it('switched off: the band keeps its questions alone, never a fall, answering again or a change that didn’t go live (the whole-branch review’s I1)', async () => {
    // Our server cannot see a switch-off (the watch closes 4401 before project.archived: S1, M4),
    // so it still says what it last knew; the page has the platform's state.
    const app = { projectId: fixtures.PROJECT_ID, name: PROJECT.name, slug: SLUG }
    const AT = '2026-10-01T17:03:00.000Z'
    quiet(false, [
      { kind: 'down', app, from: AT, owner: true },
      { kind: 'answering-again', app, from: AT, to: '2026-10-01T17:07:00.000Z' },
      { kind: 'change-failed', app, incidentId: 'inc-1', at: AT, owner: true },
      { kind: 'question', app, conversationId: 'c-1', title: 'Word count', since: AT },
    ])
    await open(`/apps/${SLUG}`, owned(ARCHIVED))
    const band = await screen.findByRole('region', { name: k.band.label })
    expect(band.textContent).toContain(k.band.question(PROJECT.name))
    expect(band.textContent).not.toContain(k.band.down(PROJECT.name, '10:03am'))
    expect(band.textContent).not.toContain('answering again')
    expect(band.textContent).not.toContain(k.band.changeFailed(PROJECT.name))
    expect(within(band).queryByRole('button', { name: k.band.startAgain })).toBeNull()
    expect(within(band).queryByRole('button', { name: k.band.whatHappened })).toBeNull()
  })

  it('a draft switched off: its owner may still delete it (the review’s I2)', async () => {
    quiet()
    await open(`/apps/${SLUG}`, owned(ARCHIVED))
    expect(await screen.findByRole('button', { name: s.backOn })).toBeTruthy()
    expect(await screen.findByRole('button', { name: s.delete })).toBeTruthy()
    expect(screen.queryByRole('button', { name: s.off })).toBeNull()
  })

  it('switched off: said to everyone; Switch it back on for an owner alone', async () => {
    quiet()
    await open(`/apps/${SLUG}`, owned(ARCHIVED, 'collaborator'))
    expect(await screen.findByText(k.card.switchedOff('12 December'))).toBeTruthy()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByRole('button', { name: s.backOn })).toBeNull()
  })

  it('switched back on, never live: no second sign-in; It’s back, and the watch minted once (by the shell)', async () => {
    quiet()
    const st = owned(ARCHIVED)
    await open(`/apps/${SLUG}`, st)
    await press(await screen.findByRole('button', { name: s.backOn }))
    expect(await screen.findByText(s.backDraft)).toBeTruthy()
    await waitFor(() => expect(st.calls).toEqual(['restoreProject', 'mintToken']))
    expect(screen.queryByText(k.card.switchedOff('12 December'))).toBeNull()
  })

  it('back on after it was live: It’s back, but not running yet, and Start it for your students', async () => {
    quiet()
    await open(
      `/apps/${SLUG}`,
      owned({ launchedAt: LAUNCHED }, 'owner', {
        launchedAt: LAUNCHED,
        readiness: BOTH_MET,
        production: GONE,
      }),
    )
    const back = await screen.findByRole('region', { name: s.students })
    expect(back.textContent).toContain(s.back)
    expect(back.textContent).toContain(s.studentsWhat(s.students))
    expect(within(back).getByRole('button', { name: s.students })).toBeTruthy()
    expect(machineryIn(document.body.textContent ?? '')).toEqual([])
  })

  it('not running for its students (switched off, or back and not started): no message to send them (found by the walk)', async () => {
    quiet(true)
    await open(
      `/apps/${SLUG}`,
      owned({ launchedAt: LAUNCHED }, 'owner', {
        launchedAt: LAUNCHED,
        readiness: BOTH_MET,
        production: GONE,
      }),
    )
    await screen.findByRole('region', { name: s.students })
    expect(screen.queryByText(w.students.messageLabel)).toBeNull()
    cleanup()
    quiet(true)
    await open(
      `/apps/${SLUG}`,
      owned({ ...ARCHIVED, launchedAt: LAUNCHED }, 'owner', {
        launchedAt: LAUNCHED,
        readiness: BOTH_MET,
        production: GONE,
      }),
    )
    await ready()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText(w.students.messageLabel)).toBeNull()
    // Running, it is handed over as ever.
    cleanup()
    quiet(true)
    await open(
      `/apps/${SLUG}`,
      owned({ launchedAt: LAUNCHED }, 'owner', {
        launchedAt: LAUNCHED,
        readiness: BOTH_MET,
      }),
    )
    expect(await screen.findByText(w.students.messageLabel)).toBeTruthy()
  })

  it('a live app’s owner: FE-45’s sentence where Delete it would be', async () => {
    quiet()
    await open(
      `/apps/${SLUG}`,
      owned({ launchedAt: LAUNCHED }, 'owner', {
        launchedAt: LAUNCHED,
        readiness: BOTH_MET,
      }),
    )
    const area = await screen.findByRole('region', { name: s.title })
    expect(within(area).queryByRole('button', { name: s.delete })).toBeNull()
    expect(area.textContent).toContain(s.liveKeptMore)
  })

  it('back from signing in again (then=switch-off): the confirming step, said, and the address without it', async () => {
    quiet(true)
    const st = owned({})
    await open(`/apps/${SLUG}?then=switch-off`, st)
    const area = await screen.findByRole('region', { name: s.title })
    expect(area.textContent).toContain(words.goingLive.letIn.again)
    expect(area.textContent).toContain(s.confirmOff)
    expect(st.calls).toEqual([])
    expect(window.location.pathname + window.location.search).toBe(`/apps/${SLUG}`)
  })
})
