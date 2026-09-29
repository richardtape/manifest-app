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
        environment(kind, serving(kind)),
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
    await open(`/apps/${SLUG}`)
    await ready()
    expect(rail().querySelector('.mf-rail__over')?.textContent).toBe(PROJECT.name)
    const current = rail().querySelector('[aria-current="page"]')
    expect(current?.textContent).toBe(w.rail.preview)
    expect(current?.getAttribute('href')).toBe(`/apps/${SLUG}`)
    expect(
      within(rail())
        .getByRole('link', { name: w.rail.conversations })
        .getAttribute('href'),
    ).toBe(`/apps/${SLUG}/conversations`)
    await waitFor(() => expect(document.title).toBe(PROJECT.name))
  })

  it('its conversations: Conversations current, and the page says it arrives next', async () => {
    await open(`/apps/${SLUG}/conversations`)
    expect(await screen.findByText(w.conversationsNext)).toBeTruthy()
    await waitFor(() =>
      expect(rail().querySelector('[aria-current="page"]')?.textContent).toBe(
        w.rail.conversations,
      ),
    )
    expect(rail().querySelector('.mf-rail__over')?.textContent).toBe(PROJECT.name)
  })

  it('Ask for a change goes to the app’s change page, which says it arrives next', async () => {
    await open(`/apps/${SLUG}`)
    await ready()
    expect(screen.getByText(w.notRight)).toBeTruthy()
    const ask = screen.getByRole('link', { name: w.askForChange })
    expect(ask.getAttribute('href')).toBe(`/apps/${SLUG}/change`)
    await press(ask)
    expect(await screen.findByText(w.changeNext)).toBeTruthy()
    expect(window.location.pathname).toBe(`/apps/${SLUG}/change`)
  })

  it('an app that is not theirs, or not there, is a page we do not have', async () => {
    await open('/apps/no-such-app')
    expect(await screen.findByText(words.notFound.body)).toBeTruthy()
    expect(rail().querySelector('.mf-rail__over')).toBeNull()
  })

  it('a session that ends while it reads is the shell’s to say', async () => {
    await open(
      `/apps/${SLUG}`,
      stage(A_FAILED_ATTEMPT, { listProjects: () => refused(401, 'UNAUTHENTICATED') }),
    )
    expect(await screen.findByText(words.expired.body)).toBeTruthy()
  })

  it('a refused read shows our words with a reference, reported once, and Try again reads again', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    let refusing = true
    const s = await open(
      `/apps/${SLUG}`,
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
    await open(`/apps/${SLUG}`)
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
    await open(`/apps/${SLUG}`)
    await ready()
    const draft = tab(w.tabs.draft)
    act(() => draft.focus())
    await key(draft, 'ArrowRight')
    const trying = tab(w.tabs['trying-out'])
    expect(trying.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(trying)
    expect(panel().id).toBe(trying.getAttribute('aria-controls'))
    expect(window.location.search).toBe('?tab=trying-out')
  })

  it('opens on the tab its address names', async () => {
    await open(`/apps/${SLUG}?tab=students`)
    await ready()
    expect(tab(w.tabs.students).getAttribute('aria-selected')).toBe('true')
    expect(within(panel()).getByText(w.students)).toBeTruthy()
  })

  it('each shows its address in mono; one with something on it opens in a new tab, never a frame', async () => {
    const world: World = {
      instances: {
        sandbox: [SERVING],
        staging: [summary('i-s', 'staging', OLD.id, 'healthy', true)],
        production: [],
      },
      incidents: { sandbox: [], staging: [], production: [] },
    }
    await open(`/apps/${SLUG}`, stage(world))
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
      const link = within(panel()).queryByRole('link', { name: w.open })
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
    const s = await open(`/apps/${SLUG}`)
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

  it('the same version, when the one serving was the last to go there', async () => {
    const world: World = {
      instances: { sandbox: [SERVING], staging: [], production: [] },
      incidents: { sandbox: [], staging: [], production: [] },
    }
    const s = await open(`/apps/${SLUG}`, stage(world))
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
    await open(`/apps/${SLUG}`, stage(world))
    await ready()
    expect(await within(panel()).findByText(w.facts.nothingDraft)).toBeTruthy()
    expect(within(panel()).queryByText(w.tryItAs)).toBeNull()
    expect(within(panel()).queryByRole('link', { name: w.open })).toBeNull()
  })
})

describe('Your draft: the pretend people (FE-3, ours)', () => {
  it('says what the draft is, and one row per pretend person, each value in mono with a copy button', async () => {
    await open(`/apps/${SLUG}`)
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
    await open(`/apps/${SLUG}`)
    await ready()
    expect(within(panel()).getByText(w.laptop)).toBeTruthy()
    expect(w.laptop).toBe(
      'On this laptop, Sign in takes you straight in as yourself. To try it as a student, use Sign out inside the app first, then sign in as the student.',
    )
  })

  it('never on Trying out or For your students (Rich)', async () => {
    await open(`/apps/${SLUG}`)
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

describe("Trying out: UBC's words, everywhere (Rich)", () => {
  it("his sentence, exactly; waiting on UBC's identity team, still, with no number", async () => {
    await open(`/apps/${SLUG}?tab=trying-out`)
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

  it('never "We asked", never "weeks", and the wait carries no date', async () => {
    await open(`/apps/${SLUG}?tab=trying-out`)
    await ready()
    const here = panel()
    expect(here.textContent).not.toMatch(/we asked/i)
    expect(here.textContent).not.toMatch(/weeks?\b/i)
    const wait = here.querySelector('.preview__wait') as HTMLElement
    expect(wait).not.toBeNull()
    expect(wait.textContent).not.toMatch(
      /\d|January|February|March|April|May|June|July|August|September|October|November|December|today|yesterday/i,
    )
  })
})

describe('For your students', () => {
  it('not live yet, and the address they will use', async () => {
    await open(`/apps/${SLUG}?tab=students`)
    await ready()
    expect(within(panel()).getByText(w.students)).toBeTruthy()
    expect(w.students).toBe('Not live yet. This is the address your students will use.')
  })
})

describe('no machinery, and never "It works" (C3)', () => {
  it.each(['draft', 'trying-out', 'students'] as const)('on %s', async (kind) => {
    await open(`/apps/${SLUG}?tab=${kind}`)
    await ready()
    await within(panel())
      .findByText(w.facts.serving)
      .catch(() => undefined)
    expect(machineryIn(wordsOn())).toEqual([])
    expect(document.body.textContent).not.toMatch(/it works/i)
  })
})
