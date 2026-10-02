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
import { PRETEND_PEOPLE } from '../../ours/pretend-people.js'
import type { Platform } from '../../platform/api.js'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'

/**
 * MOMENT 7, SEEING IT (F4 Task 5), through the whole App against a recording `Platform`: the
 * app's own pages, the rail's project section, the Preview's three tabs, the pretend people on
 * the draft only, UBC's words on trying out, and the two facts. Every read is the person's own
 * session, in the browser (Decision 2).
 */
const w = words.preview
const TZ = 'America/Vancouver'
const NOW = new Date('2026-09-28T23:14:00.000Z')
const SLUG = 'reading-responses'
const PROJECT: Schemas['Project'] = {
  ...fixtures.PROJECT,
  name: 'Reading responses',
  slug: SLUG,
}
const ID = {
  sandbox: '33333333-3333-4333-8333-333333333331',
  staging: '33333333-3333-4333-8333-333333333332',
  production: '33333333-3333-4333-8333-333333333333',
} as const
const OLD: Schemas['Release'] = {
  ...fixtures.RELEASE,
  id: 'r-old',
  createdAt: '2026-09-28T22:12:00.000Z', // 3:12pm in Vancouver
}
const NEW: Schemas['Release'] = {
  ...fixtures.RELEASE,
  id: 'r-new',
  createdAt: '2026-09-28T23:00:00.000Z',
}
const RELEASES = [OLD, NEW]

type Kind = keyof typeof ID
const summary = (
  id: string,
  kind: Kind,
  releaseId: string,
  state: Schemas['Instance']['state'],
  serving = false,
): Schemas['InstanceSummary'] => ({
  id,
  environmentId: ID[kind],
  releaseId,
  kind: 'web',
  state,
  lastSeenAt: state === 'healthy' ? '2026-09-28T23:13:00.000Z' : null,
  // Made when its version was, the order F4's flows produce (FE-38: contract 1.5.0).
  createdAt: RELEASES.find((r) => r.id === releaseId)!.createdAt,
  serving,
})
const environment = (
  kind: Kind,
  serving: Schemas['InstanceSummary'] | undefined,
): Schemas['Environment'] => ({
  id: ID[kind],
  projectId: PROJECT.id,
  kind,
  hostname: `${SLUG}.${kind}.manifest.internal`,
  url: `https://${SLUG}.${kind}.manifest.internal`,
  instance:
    serving === undefined
      ? null
      : {
          id: serving.id,
          environmentId: serving.environmentId,
          releaseId: serving.releaseId,
          kind: serving.kind,
          state: serving.state,
          lastSeenAt: serving.lastSeenAt,
          createdAt: serving.createdAt,
        },
})

const SERVING = summary('i-1', 'sandbox', OLD.id, 'healthy', true)
/** A newer version that failed, listed FIRST: the facts must never read the list's order. */
const FAILED = summary('i-2', 'sandbox', NEW.id, 'failed')
const INCIDENT: Schemas['Incident'] = {
  ...fixtures.INCIDENTS.incidents[0]!,
  id: 'incident-2',
  instanceId: 'i-2',
  releaseId: NEW.id,
  createdAt: '2026-09-28T23:10:00.000Z',
}

type World = {
  instances: Record<Kind, Schemas['InstanceSummary'][]>
  incidents: Record<Kind, Schemas['Incident'][]>
  /**
   * The instance an address names when none serves: the platform falls back to the newest (its
   * `servingInstanceOf`), as a dry run taken down again leaves the live address (the platform's 5b).
   */
  named?: Partial<Record<Kind, Schemas['InstanceSummary']>>
  /** F5b: the three records, for trying-out's registration (the mock's own when not given). */
  records?: Schemas['LaunchRecords']
  /** F5b: the checklist, for an app that signs nobody in (the mock's own when not given). */
  readiness?: Schemas['LaunchReadiness'] | 'never'
}
const A_FAILED_ATTEMPT: World = {
  instances: { sandbox: [FAILED, SERVING], staging: [], production: [] },
  incidents: { sandbox: [INCIDENT], staging: [], production: [] },
}

const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'test')
const never = () => new Promise<never>(() => undefined)

/** A platform that answers the world given, and records every read. */
function stage(
  world: World = A_FAILED_ATTEMPT,
  refuse: Partial<Record<string, () => unknown>> = {},
) {
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
  const serving = (kind: Kind) => world.instances[kind].find((i) => i.serving)
  const platform: Platform = {
    getMe: () => Promise.resolve(fixtures.ME),
    listProjects: answer('listProjects', () => [fixtures.PROJECT, PROJECT]),
    getProject: never,
    getRelease: answer('getRelease', (id: string) => RELEASES.find((r) => r.id === id)!),
    listEnvironments: answer('listEnvironments', () =>
      (['sandbox', 'staging', 'production'] as const).map((kind) =>
        environment(kind, serving(kind) ?? world.named?.[kind]),
      ),
    ),
    listInstances: answer('listInstances', (environmentId: string) => {
      const kind = (Object.keys(ID) as Kind[]).find((k) => ID[k] === environmentId)!
      return { environmentId, instances: world.instances[kind], truncated: false }
    }),
    listIncidents: answer('listIncidents', (environmentId: string) => {
      const kind = (Object.keys(ID) as Kind[]).find((k) => ID[k] === environmentId)!
      return { environmentId, incidents: world.incidents[kind] }
    }),
    startIntakeSession: never,
    endIntakeSession: never,
    checkSlug: never,
    listBlueprints: never,
    createProject: never,
    mintToken: never,
    deploy: never,
    listAppSecrets: never,
    setAppSecret: never,
    runRehearsal: () => new Promise<never>(() => undefined),
    getLaunchReadiness:
      world.readiness === 'never'
        ? never
        : answer('getLaunchReadiness', () =>
            world.readiness === undefined || world.readiness === 'never'
              ? fixtures.LAUNCH_READINESS
              : world.readiness,
          ),
    getLaunchRecords: answer(
      'getLaunchRecords',
      () => world.records ?? fixtures.LAUNCH_RECORDS,
    ),
    getApproval: never,
    requestApproval: never,
    getEnvironment: never,
    listMembers: never,
    revokeToken: never,
    archiveProject: never,
    restoreProject: never,
    deleteProject: never,
    watchProject: () => ({ ready: never(), close: () => undefined }),
  }
  const called = (name: string) =>
    calls.filter((c) => c[0] === name).map((c) => c.slice(1))
  return { platform, calls, called }
}

const reports: Record<string, unknown>[] = []
const copied: string[] = []
beforeEach(() => {
  reports.length = 0
  copied.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/problems')
        reports.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return new Response(null, { status: 204 })
    }),
  )
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (text: string) => (copied.push(text), Promise.resolve()) },
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function open(path: string, s = stage()) {
  window.history.pushState({}, '', path)
  render(<App platform={s.platform} timeZone={TZ} now={() => NOW} />)
  return s
}
/** The page has read its app and its addresses: the heading, then the switcher. */
const ready = async () => {
  await screen.findByRole('heading', { level: 1, name: PROJECT.name })
  await screen.findByRole('tablist')
}
const rail = () => screen.getByRole('navigation', { name: 'Manifest' })
const panel = () => screen.getByRole('tabpanel')
const tab = (name: string) => screen.getByRole('tab', { name })
/**
 * The page's words, without hostnames (mono, allowed on screen: C3), and without Rich's own
 * sentence for trying out: "UBC's real staging sign-in" is UBC's name for its sign-in, his words
 * (2026-09-28), and the one place "staging" may be said.
 */
function wordsOn(element: HTMLElement = document.body): string {
  const copy = element.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.mono').forEach((mono) => mono.remove())
  return (copy.textContent ?? '').replace(w.tryingOut, '')
}
const press = (element: HTMLElement) =>
  act(async () => {
    fireEvent.click(element)
  })
const key = (element: HTMLElement, name: string) =>
  act(async () => {
    fireEvent.keyDown(element, { key: name })
  })

describe("an app's own pages", () => {
  it("the rail's project section: the app's name, Preview current, and Conversations", async () => {
    await open(`/apps/${SLUG}/preview`)
    await ready()
    expect(rail().querySelector('.mf-rail__over')?.textContent).toBe(PROJECT.name)
    const current = rail().querySelector('[aria-current="page"]')
    expect(current?.textContent).toBe(w.rail.preview)
    expect(current?.getAttribute('href')).toBe(`/apps/${SLUG}/preview`)
    expect(
      within(rail())
        .getByRole('link', { name: w.rail.conversations })
        .getAttribute('href'),
    ).toBe(`/apps/${SLUG}/conversations`)
    await waitFor(() => expect(document.title).toBe(PROJECT.name))
  })

  it('its conversations: Conversations current, and the page is the app’s conversations (F4 Task 9)', async () => {
    await open(`/apps/${SLUG}/conversations`)
    expect(await screen.findByRole('heading', { name: 'Conversations' })).toBeTruthy()
    await waitFor(() =>
      expect(rail().querySelector('[aria-current="page"]')?.textContent).toBe(
        w.rail.conversations,
      ),
    )
    expect(rail().querySelector('.mf-rail__over')?.textContent).toBe(PROJECT.name)
  })

  it('Ask for a change goes to the app’s change page (F4 Task 9)', async () => {
    await open(`/apps/${SLUG}/preview`)
    await ready()
    expect(screen.getByText(w.notRight)).toBeTruthy()
    const ask = screen.getByRole('link', { name: w.askForChange })
    expect(ask.getAttribute('href')).toBe(`/apps/${SLUG}/change`)
    await press(ask)
    expect(
      await screen.findByRole('heading', { name: 'What should change?' }),
    ).toBeTruthy()
    expect(window.location.pathname).toBe(`/apps/${SLUG}/change`)
  })

  it('an app that is not theirs, or not there, is a page we do not have', async () => {
    await open('/apps/no-such-app')
    expect(await screen.findByText(words.notFound.body)).toBeTruthy()
    expect(rail().querySelector('.mf-rail__over')).toBeNull()
  })

  it('a session that ends while it reads is the shell’s to say', async () => {
    await open(
      `/apps/${SLUG}/preview`,
      stage(A_FAILED_ATTEMPT, { listProjects: () => refused(401, 'UNAUTHENTICATED') }),
    )
    expect(await screen.findByText(words.expired.body)).toBeTruthy()
  })

  it('a refused read shows our words with a reference, reported once, and Try again reads again', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    let refusing = true
    const s = await open(
      `/apps/${SLUG}/preview`,
      stage(A_FAILED_ATTEMPT, {
        listEnvironments: () => (refusing ? refused(500, 'INTERNAL') : undefined),
      }),
    )
    expect(await screen.findByText(words.refused.body)).toBeTruthy()
    const reference = /quote ([0-9A-F]{4}-[0-9A-F]{4})\./.exec(
      document.body.textContent ?? '',
    )?.[1]
    await waitFor(() =>
      expect(reports).toEqual([expect.objectContaining({ reference, code: 'INTERNAL' })]),
    )
    refusing = false
    await press(screen.getByRole('button', { name: words.refused.button }))
    expect(await screen.findByRole('tablist')).toBeTruthy()
    expect(s.called('listEnvironments')).toHaveLength(2)
    vi.restoreAllMocks()
  })
})

describe('the switcher: Your draft · Trying out · For your students', () => {
  it('is a tablist of three, named, each tab controlling its panel', async () => {
    await open(`/apps/${SLUG}/preview`)
    await ready()
    const list = screen.getByRole('tablist')
    expect(list.getAttribute('aria-label')).toBe(w.switcherLabel)
    const tabs = within(list).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual([
      w.tabs.draft,
      w.tabs['trying-out'],
      w.tabs.students,
    ])
    for (const t of tabs)
      expect(document.getElementById(t.getAttribute('aria-controls')!)).not.toBeNull()
    expect(panel().id).toBe(tabs[0]!.getAttribute('aria-controls'))
  })

  it('arrow keys move to the next address, its panel shows, the address is kept, and focus stays on the tab', async () => {
    await open(`/apps/${SLUG}/preview`)
    await ready()
    const draft = tab(w.tabs.draft)
    act(() => draft.focus())
    await key(draft, 'ArrowRight')
    const trying = tab(w.tabs['trying-out'])
    expect(trying.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(trying)
    expect(panel().id).toBe(trying.getAttribute('aria-controls'))
    expect(window.location.pathname + window.location.search).toBe(
      `/apps/${SLUG}/preview?tab=trying-out`,
    )
  })

  it('opens on the tab its address names', async () => {
    await open(`/apps/${SLUG}/preview?tab=students`)
    await ready()
    expect(tab(w.tabs.students).getAttribute('aria-selected')).toBe('true')
    expect(within(panel()).getByText(w.students)).toBeTruthy()
  })

  it('each shows its address in mono; the draft and trying-out (registered, the mock’s), with something on them, open in a new tab, never a frame', async () => {
    const world: World = {
      instances: {
        sandbox: [SERVING],
        staging: [summary('i-s', 'staging', OLD.id, 'healthy', true)],
        production: [],
      },
      incidents: { sandbox: [], staging: [], production: [] },
    }
    await open(`/apps/${SLUG}/preview`, stage(world))
    await ready()
    for (const kind of ['draft', 'trying-out', 'students'] as const) {
      await press(tab(w.tabs[kind]))
      const host = { draft: 'sandbox', 'trying-out': 'staging', students: 'production' }[
        kind
      ]
      expect(
        within(panel())
          .getByText(`${SLUG}.${host}.manifest.internal`, { exact: false })
          .closest('.mono'),
      ).not.toBeNull()
      // Trying out's shows once its registration is active (Rich: "Hide until registered"), as the
      // mock's is (F5b reads it, on its own: found, not got).
      const link =
        kind === 'trying-out'
          ? await within(panel()).findByRole('link', { name: w.open })
          : within(panel()).queryByRole('link', { name: w.open })
      if (kind === 'students') expect(link).toBeNull()
      else {
        expect(link?.getAttribute('href')).toBe(
          `https://${SLUG}.${host}.manifest.internal`,
        )
        expect(link?.getAttribute('target')).toBe('_blank')
        expect(link?.getAttribute('rel')).toBe('noopener')
      }
    }
    expect(document.querySelector('iframe')).toBeNull()
  })
})

describe('the two facts', () => {
  it("serving right now is the address's own, with its version's date, though a newer failure is listed first", async () => {
    const s = await open(`/apps/${SLUG}/preview`)
    await ready()
    const facts = within(panel())
    expect(await facts.findByText('The version from 28 September, 3:12pm')).toBeTruthy()
    expect(facts.getByText(w.facts.serving)).toBeTruthy()
    expect(facts.getByText(w.facts.attempt)).toBeTruthy()
    expect(
      facts.getByText("Didn't start, 4 minutes ago. Nobody lost anything."),
    ).toBeTruthy()
    expect(s.called('listIncidents')).toEqual([[ID.sandbox]])
  })

  /** Our server answers which conversation's round deployed an instance, or 404. */
  const answering = (id: string | null) => {
    const fetched = vi.fn(async (url: string) =>
      url === `/api/apps/${PROJECT.id}/instances/i-2/conversation`
        ? id === null
          ? new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), {
              status: 404,
            })
          : new Response(JSON.stringify({ id }), { status: 200 })
        : new Response(null, { status: 204 }),
    )
    vi.stubGlobal('fetch', fetched)
    return fetched
  }

  it('[What went wrong] on the failed draft attempt opens the conversation whose round deployed it (F4 Task 9)', async () => {
    answering('c-7')
    await open(`/apps/${SLUG}/preview`)
    await ready()
    const link = await within(panel()).findByRole('link', { name: 'What went wrong' })
    expect(link.getAttribute('href')).toBe(`/apps/${SLUG}/conversations/c-7`)
  })

  it('when none of ours deployed it, there is no [What went wrong]', async () => {
    const fetched = answering(null)
    await open(`/apps/${SLUG}/preview`)
    await ready()
    await waitFor(() =>
      expect(fetched.mock.calls.map((c) => c[0])).toContain(
        `/api/apps/${PROJECT.id}/instances/i-2/conversation`,
      ),
    )
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(within(panel()).queryByRole('link', { name: 'What went wrong' })).toBeNull()
  })

  it('the same version, when the one serving was the last to go there', async () => {
    const world: World = {
      instances: { sandbox: [SERVING], staging: [], production: [] },
      incidents: { sandbox: [], staging: [], production: [] },
    }
    const s = await open(`/apps/${SLUG}/preview`, stage(world))
    await ready()
    expect(await within(panel()).findByText(w.facts.same)).toBeTruthy()
    // Nothing failed: no incident is read.
    expect(s.called('listIncidents')).toEqual([])
  })

  it('nothing on the draft yet: it says when it appears, and there is no one to try it as', async () => {
    const world: World = {
      instances: { sandbox: [], staging: [], production: [] },
      incidents: { sandbox: [], staging: [], production: [] },
    }
    await open(`/apps/${SLUG}/preview`, stage(world))
    await ready()
    expect(await within(panel()).findByText(w.facts.nothingDraft)).toBeTruthy()
    expect(within(panel()).queryByText(w.tryItAs)).toBeNull()
    expect(within(panel()).queryByRole('link', { name: w.open })).toBeNull()
  })
})

describe('Your draft: the pretend people (FE-3, ours)', () => {
  it('says what the draft is, and one row per pretend person, each value in mono with a copy button', async () => {
    await open(`/apps/${SLUG}/preview`)
    await ready()
    const draft = within(panel())
    expect(draft.getByText(w.draftIs)).toBeTruthy()
    expect(w.draftIs).toBe(
      'Your draft is a practice copy. Everyone in it is pretend, and so is anything they post.',
    )
    expect(draft.getByText(w.tryItAs)).toBeTruthy()
    for (const person of PRETEND_PEOPLE) {
      const row = draft.getByText(w.who[person.who]).closest('li')!
      const monos = [...row.querySelectorAll('.mono')].map((m) => m.textContent)
      expect(monos).toEqual([person.login, person.password])
      for (const button of within(row).getAllByRole('button')) await press(button)
    }
    expect(copied).toEqual(PRETEND_PEOPLE.flatMap((p) => [p.login, p.password]))
  })

  it('says, on the laptop, how to try it as someone else (Rich approved it, sitting 2)', async () => {
    await open(`/apps/${SLUG}/preview`)
    await ready()
    expect(within(panel()).getByText(w.laptop)).toBeTruthy()
    expect(w.laptop).toBe(
      'On this laptop, Sign in takes you straight in as yourself. To try it as a student, use Sign out inside the app first, then sign in as the student.',
    )
  })

  it('never on Trying out or For your students (Rich)', async () => {
    await open(`/apps/${SLUG}/preview`)
    await ready()
    for (const kind of ['trying-out', 'students'] as const) {
      await press(tab(w.tabs[kind]))
      const here = panel()
      expect(within(here).queryByText(w.tryItAs)).toBeNull()
      expect(here.textContent).not.toMatch(/password/i)
      expect(here.textContent).not.toMatch(/sign in as/i)
      const monos = [...here.querySelectorAll('.mono')].map((m) => m.textContent)
      for (const person of PRETEND_PEOPLE) {
        expect(monos).not.toContain(person.login)
        expect(monos).not.toContain(person.password)
      }
    }
  })
})

/** Trying-out's registration with UBC's identity team since 24 September (4 days before NOW). */
const WITH_UBC: Schemas['LaunchRecords'] = {
  ...fixtures.LAUNCH_RECORDS,
  stagingRegistration: {
    ...fixtures.STAGING_REGISTRATION,
    state: 'submitted',
    registeredAt: null,
    submittedAt: '2026-09-24T19:00:00.000Z',
  },
}
const ON_TRYING_OUT: World = {
  instances: {
    sandbox: [SERVING],
    staging: [summary('i-s', 'staging', OLD.id, 'healthy', true)],
    production: [],
  },
  incidents: { sandbox: [], staging: [], production: [] },
}

describe("Trying out: UBC's words, everywhere (Rich)", () => {
  it("his sentence, exactly; waiting on UBC's identity team, still, with no number, while it is not registered", async () => {
    await open(
      `/apps/${SLUG}/preview?tab=trying-out`,
      stage({ ...A_FAILED_ATTEMPT, records: WITH_UBC }),
    )
    await ready()
    const here = within(panel())
    expect(here.getByText(w.tryingOut)).toBeTruthy()
    expect(w.tryingOut).toBe(
      "Trying out uses UBC's real staging sign-in, so UBC's identity team registers it first. That takes some time, as several teams at UBC help make sure the app and its data are kept safe and secure. Meanwhile, your draft is ready to try now.",
    )
    const chip = here.getByText(w.waitingOn)
    expect(chip.className).toContain('mf-is-waiting')
    expect(chip.querySelector('.mf-pulse')).toBeNull()
    expect(chip.textContent).not.toMatch(/\d/)
  })

  it('has no Open it in a new tab, even with something on it, until its registration is active (Rich: "Hide until registered")', async () => {
    await open(
      `/apps/${SLUG}/preview?tab=trying-out`,
      stage({ ...ON_TRYING_OUT, records: WITH_UBC }),
    )
    await ready()
    await within(panel()).findByText(w.facts.serving)
    await within(panel()).findByText(/second of three steps on Going live/)
    expect(within(panel()).queryByRole('link', { name: w.open })).toBeNull()
    expect(panel().querySelector('a[target="_blank"]')).toBeNull()
    expect(within(panel()).getByText(w.tryingOut)).toBeTruthy()
  })

  it('its other half (F5b): registered, and something on it: Open it in a new tab returns, and the line goes', async () => {
    await open(`/apps/${SLUG}/preview?tab=trying-out`, stage(ON_TRYING_OUT))
    await ready()
    const link = await within(panel()).findByRole('link', { name: w.open })
    expect(link.getAttribute('href')).toBe(`https://${SLUG}.staging.manifest.internal`)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener')
    expect(within(panel()).queryByText(/second of three steps on Going live/)).toBeNull()
    // Registered: nothing waits on UBC's identity team, so the card no longer says so.
    expect(within(panel()).queryByText(w.waitingOn)).toBeNull()
    expect(within(panel()).getByText(w.tryingOut)).toBeTruthy()
  })

  it('registered, and nothing on it: nothing to open, and no line', async () => {
    const s = stage({ ...A_FAILED_ATTEMPT })
    await open(`/apps/${SLUG}/preview?tab=trying-out`, s)
    await ready()
    await waitFor(() => expect(s.called('getLaunchRecords')).toHaveLength(1))
    await act(async () => undefined)
    expect(within(panel()).queryByRole('link', { name: w.open })).toBeNull()
    expect(within(panel()).queryByText(/second of three steps on Going live/)).toBeNull()
  })

  it('not registered: the second of three steps on Going live, its state from the steps, and Going live', async () => {
    await open(
      `/apps/${SLUG}/preview?tab=trying-out`,
      stage({ ...ON_TRYING_OUT, records: WITH_UBC }),
    )
    await ready()
    const line = await within(panel()).findByText(
      w.step('with UBC’s identity team, waiting 4 days'),
    )
    const going = within(line.closest('p')!).getByRole('link', { name: w.toGoingLive })
    expect(going.getAttribute('href')).toBe(`/apps/${SLUG}/going-live`)
  })

  it('an app that signs nobody in (the review’s I4): nothing to register, so Open it, no line, nothing waiting on UBC', async () => {
    const records: Schemas['LaunchRecords'] = {
      ...fixtures.LAUNCH_RECORDS,
      stagingRegistration: null,
      iamRegistration: null,
    }
    const readiness: Schemas['LaunchReadiness'] = {
      ...fixtures.LAUNCH_READINESS,
      items: fixtures.LAUNCH_READINESS.items.map((i) =>
        i.id === 'iam-registration'
          ? {
              ...i,
              owner: 'UBC IAM',
              state: 'met' as const,
              why: 'This app does not sign people in with CWL, so it needs no IAM registration.',
              since: null,
            }
          : i,
      ),
    }
    await open(
      `/apps/${SLUG}/preview?tab=trying-out`,
      stage({ ...ON_TRYING_OUT, records, readiness }),
    )
    await ready()
    expect(await within(panel()).findByRole('link', { name: w.open })).toBeTruthy()
    expect(within(panel()).queryByText(/second of three steps on Going live/)).toBeNull()
    expect(within(panel()).queryByText(w.waitingOn)).toBeNull()
  })

  it('a checklist that never answers holds nothing: the line says where the registration is from the records alone', async () => {
    await open(
      `/apps/${SLUG}/preview?tab=trying-out`,
      stage({ ...ON_TRYING_OUT, records: WITH_UBC, readiness: 'never' }),
    )
    await ready()
    expect(
      await within(panel()).findByText(
        w.step('with UBC’s identity team, waiting 4 days'),
      ),
    ).toBeTruthy()
  })

  it('records that cannot be read: not registered: no Open it, and the line without a state', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await open(
      `/apps/${SLUG}/preview?tab=trying-out`,
      stage(ON_TRYING_OUT, { getLaunchRecords: () => refused(500, 'INTERNAL') }),
    )
    await ready()
    expect(await within(panel()).findByText(w.step(null))).toBeTruthy()
    expect(within(panel()).queryByRole('link', { name: w.open })).toBeNull()
    expect(screen.queryByText(words.refused.body)).toBeNull()
    vi.restoreAllMocks()
  })

  it('never "We asked", never "weeks", and the wait in the card carries no date', async () => {
    await open(
      `/apps/${SLUG}/preview?tab=trying-out`,
      stage({ ...A_FAILED_ATTEMPT, records: WITH_UBC }),
    )
    await ready()
    await within(panel()).findByText(w.step('with UBC’s identity team, waiting 4 days'))
    const here = panel()
    expect(here.textContent).not.toMatch(/we asked/i)
    // No word boundary: textContent runs one element's words into the next (F5 Task 6).
    expect(here.textContent).not.toMatch(/week/i)
    const wait = here.querySelector('.preview__wait') as HTMLElement
    expect(wait).not.toBeNull()
    expect(wait.textContent).not.toMatch(
      /\d|January|February|March|April|May|June|July|August|September|October|November|December|today|yesterday/i,
    )
    const copy = here.cloneNode(true) as HTMLElement
    copy.querySelectorAll('.mono').forEach((mono) => mono.remove())
    expect(machineryIn((copy.textContent ?? '').replace(w.tryingOut, ''))).toEqual([])
  })
})

describe('For your students', () => {
  it('not live yet, and the address they will use', async () => {
    await open(`/apps/${SLUG}/preview?tab=students`)
    await ready()
    expect(within(panel()).getByText(w.students)).toBeTruthy()
    expect(w.students).toBe('Not live yet. This is the address your students will use.')
  })

  it('before a launch, a dry run taken down again (the platform’s 5b) is nothing there: not live yet, never switched off, never the last to go there, nothing to open', async () => {
    const dryRun = summary('i-dry', 'production', NEW.id, 'gone')
    await open(
      `/apps/${SLUG}/preview?tab=students`,
      stage({
        instances: { sandbox: [SERVING], staging: [], production: [dryRun] },
        incidents: { sandbox: [], staging: [], production: [] },
        named: { production: dryRun },
      }),
    )
    await ready()
    expect(await within(panel()).findByText(w.students)).toBeTruthy()
    expect(panel().textContent).not.toContain('Switched off')
    expect(panel().textContent).not.toContain(w.facts.same)
    // Nothing is there to open: nobody was ever given the address.
    expect(within(panel()).queryByRole('link', { name: w.open })).toBeNull()
  })
})

describe('no machinery, and never "It works" (C3)', () => {
  it.each(['draft', 'trying-out', 'students'] as const)('on %s', async (kind) => {
    await open(`/apps/${SLUG}/preview?tab=${kind}`)
    await ready()
    await within(panel())
      .findByText(w.facts.serving)
      .catch(() => undefined)
    expect(machineryIn(wordsOn())).toEqual([])
    expect(document.body.textContent).not.toMatch(/it works/i)
  })
})
