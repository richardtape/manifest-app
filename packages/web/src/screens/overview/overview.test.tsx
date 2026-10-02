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

const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'test')
const never = () => new Promise<never>(() => undefined)

type World = {
  /** The sandbox has served an instance: a draft has been built. */
  built: boolean
  launchedAt: string | null
  readiness: Schemas['LaunchReadiness']
  /** The live address's instance, when not the fixture's (none). */
  production?: Schemas['Instance']
}
const BEFORE_LAUNCH: World = {
  built: true,
  launchedAt: null,
  readiness: fixtures.LAUNCH_READINESS,
}

/** A platform that answers the world given, and records every read. */
function stage(
  world: Partial<World> = {},
  refuse: Partial<Record<string, () => unknown>> = {},
) {
  const { built, launchedAt, readiness, production } = { ...BEFORE_LAUNCH, ...world }
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
      { ...PROJECT, launchedAt },
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
    getLaunchRecords: answer('getLaunchRecords', () => fixtures.LAUNCH_RECORDS),
    getApproval: answer('getApproval', () => null),
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

describe('the band: before your students can use it (Decision 3, moment 10)', () => {
  it('a built app, not launched, with a production clock unmet: the band, and Going live', async () => {
    const s = await open(`/apps/${SLUG}`)
    await ready()
    const region = await screen.findByRole('region', { name: w.band.title })
    expect(region.textContent).toContain(w.band.body)
    const going = within(region).getByRole('link', { name: w.band.button })
    expect(going.getAttribute('href')).toBe(`/apps/${SLUG}/going-live`)
    expect(s.called('getLaunchReadiness')).toEqual([[PROJECT.id]])
  })

  it('says the clocks may take several days, never weeks (Rich)', async () => {
    await open(`/apps/${SLUG}`)
    const region = await screen.findByRole('region', { name: w.band.title })
    expect(region.textContent).toMatch(/may take several days/)
    expect(document.body.textContent).not.toMatch(/weeks/i)
  })

  it('no draft built yet: no band, and the checklist is not read', async () => {
    const s = await open(`/apps/${SLUG}`, stage({ built: false }))
    await ready()
    expect(band()).toBeNull()
    expect(s.called('getLaunchReadiness')).toEqual([])
  })

  it('launched: no band, the checklist is not read, and For your students leads', async () => {
    const s = await open(`/apps/${SLUG}`, stage({ launchedAt: LAUNCHED }))
    const list = await ready()
    expect(band()).toBeNull()
    expect(s.called('getLaunchReadiness')).toEqual([])
    const students = screen.getByRole('region', { name: words.preview.tabs.students })
    // It leads: before the addresses.
    expect(
      students.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('both production clocks met: no band', async () => {
    const s = await open(`/apps/${SLUG}`, stage({ readiness: BOTH_MET }))
    await ready()
    await waitFor(() => expect(s.called('getLaunchReadiness')).toHaveLength(1))
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

  it('a session that ends while it reads the checklist is the shell’s to say', async () => {
    await open(
      `/apps/${SLUG}`,
      stage({}, { getLaunchReadiness: () => refused(401, 'UNAUTHENTICATED') }),
    )
    expect(await screen.findByText(words.expired.body)).toBeTruthy()
  })
})

describe('the rail: Overview · Preview · Conversations · Going live (Decision 2)', () => {
  it('names the app, and its four pages', async () => {
    await open(`/apps/${SLUG}`)
    await ready()
    expect(rail().querySelector('.mf-rail__over')?.textContent).toBe(PROJECT.name)
    const links = [
      [rail_.overview, `/apps/${SLUG}`],
      [rail_.preview, `/apps/${SLUG}/preview`],
      [rail_.conversations, `/apps/${SLUG}/conversations`],
      [rail_.goingLive, `/apps/${SLUG}/going-live`],
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
