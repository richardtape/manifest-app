// @vitest-environment jsdom
import type { Schemas } from '@manifest/contract'
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
import { machineryIn } from '../machinery.js'

/**
 * HANDING OVER THE ADDRESS, MOMENT 15 (F5 Task 9, Decision 12): once the app has launched, the
 * Overview leads with *For your students*: the address large in mono with *[Copy]*, how students
 * sign in, a message to paste (Rich's words, then the agreed plan's *What students see*, in a
 * field they can change and that is never saved), the honest line (then the plan's *Who gets
 * in*), and production's two facts. No model.
 */
const s_ = words.overview.students
const TZ = 'America/Vancouver'
const NOW = new Date('2026-10-03T19:00:00.000Z')
const SLUG = 'reading-responses'
const URL_ = 'https://reading-responses.manifest.internal'
const PROJECT: Schemas['Project'] = {
  ...fixtures.PROJECT,
  name: 'Reading responses',
  slug: SLUG,
  launchedAt: '2026-10-03T17:00:00.000Z',
}
const ROWS = {
  studentsSee: 'You’ll see everyone else’s once you’ve posted your own.',
  whoGetsIn: 'It only shows each student their own work until they post.',
}
/** Answering on production, the version from 18 September at 3:12pm in Vancouver. */
const RELEASE: Schemas['Release'] = {
  ...fixtures.RELEASE,
  createdAt: '2026-09-18T22:12:00.000Z',
}
const LIVE: Schemas['Instance'] = {
  ...fixtures.INSTANCE,
  id: '88888888-8888-4888-8888-888888888888',
  environmentId: '33333333-3333-4333-8333-333333333333',
  releaseId: RELEASE.id,
  state: 'healthy',
}
const never = () => new Promise<never>(() => undefined)

type World = {
  launchedAt: string | null
  /** The checklist's own word on it (the carry note: the App's lookup is read once per slug). */
  launched: boolean
  rows: typeof ROWS | null | 'refused'
}

function stage(world: Partial<World> = {}) {
  const w: World = {
    launchedAt: PROJECT.launchedAt ?? null,
    launched: true,
    rows: ROWS,
    ...world,
  }
  const calls: [string, ...unknown[]][] = []
  const answer =
    <T,>(name: string, value: (...args: never[]) => T) =>
    (...args: never[]) => {
      calls.push([name, ...args])
      return Promise.resolve(value(...args))
    }
  const environments = fixtures.ENVIRONMENTS.map((e) => ({
    ...e,
    hostname: e.hostname.replace('mock-app', SLUG),
    url: e.url.replace('mock-app', SLUG),
    instance: e.kind === 'production' ? LIVE : e.instance,
  }))
  const platform: Platform = {
    getMe: () => Promise.resolve(fixtures.ME),
    listProjects: answer('listProjects', () => [
      { ...PROJECT, launchedAt: w.launchedAt },
    ]),
    getProject: never,
    getRelease: answer('getRelease', () => RELEASE),
    listEnvironments: answer('listEnvironments', () => environments),
    listInstances: answer('listInstances', (environmentId: string) => ({
      environmentId,
      instances:
        environmentId === LIVE.environmentId
          ? [
              {
                id: LIVE.id,
                environmentId: LIVE.environmentId,
                releaseId: LIVE.releaseId,
                kind: LIVE.kind,
                state: LIVE.state,
                lastSeenAt: LIVE.lastSeenAt,
                createdAt: LIVE.createdAt,
                serving: true,
              },
            ]
          : [],
      truncated: false,
    })),
    listIncidents: answer('listIncidents', (environmentId: string) => ({
      environmentId,
      incidents: [],
    })),
    getLaunchReadiness: answer('getLaunchReadiness', () => ({
      ...fixtures.LAUNCH_READINESS,
      launched: w.launched,
    })),
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
    watchProject: () => ({ ready: never(), close: () => undefined }),
  }
  const theirs = {
    agreedRows: (projectId: string) => {
      calls.push(['agreedRows', projectId])
      return w.rows === 'refused'
        ? Promise.reject(new OurRefusal('PLATFORM_UNAVAILABLE', 502))
        : Promise.resolve(w.rows)
    },
  } as Record<string, unknown>
  const ours = new Proxy(theirs, {
    get: (target, name: string) => (name in target ? target[name] : never),
  }) as unknown as Ours
  const called = (name: string) =>
    calls.filter((c) => c[0] === name).map((c) => c.slice(1))
  return { platform, ours, called }
}

const copied: string[] = []
const fetched: string[] = []
beforeEach(() => {
  copied.length = 0
  fetched.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      fetched.push(url)
      return new Response(null, { status: 204 })
    }),
  )
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (text: string) => (copied.push(text), Promise.resolve()) },
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function open(s = stage()) {
  window.history.pushState({}, '', `/apps/${SLUG}`)
  render(<App platform={s.platform} ours={s.ours} timeZone={TZ} now={() => NOW} />)
  await screen.findByRole('heading', { level: 1, name: PROJECT.name })
  return s
}
/** The hand-over, once it has read what it needs: its message field is there. */
const handOver = async () => {
  const region = await screen.findByRole('region', { name: words.preview.tabs.students })
  await within(region).findByRole('textbox', { name: s_.messageLabel })
  return region
}
const message = (region: HTMLElement) =>
  within(region).getByRole('textbox', { name: s_.messageLabel }) as HTMLTextAreaElement
/**
 * A Copy button, by its name. jsdom drops the leading space of the visually hidden part
 * ("Copythe address"); Chrome names it "Copy the address" (its accessibility tree, walk9).
 */
const copyOf = (whose: string) => new RegExp(`^${words.preview.copy}\\s*${whose}$`)
function wordsOf(element: HTMLElement): string {
  const copy = element.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.mono, .mock-banner, textarea').forEach((mono) => mono.remove())
  return copy.textContent ?? ''
}

describe('for your students: the address handed over (moment 15)', () => {
  it('leads the Overview, before the addresses, with the address large in mono and Copy', async () => {
    await open()
    const region = await handOver()
    const list = screen.getByRole('list', { name: words.overview.addresses })
    expect(
      region.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    const address = region.querySelector('.overview__students-address')!
    expect(address.classList.contains('mono')).toBe(true)
    expect(address.textContent).toBe(URL_)
    fireEvent.click(within(region).getByRole('button', { name: copyOf(s_.copyAddress) }))
    await waitFor(() => expect(copied).toEqual([URL_]))
    expect(
      within(region)
        .getAllByRole('status')
        .map((n) => n.textContent),
    ).toContain(words.preview.copied)
  })

  it('says students sign in with their CWL', async () => {
    await open()
    expect(
      within(await handOver()).getByText('Students sign in with their CWL.'),
    ).toBeTruthy()
  })

  it('the message: Rich’s words, then the plan’s What students see, as written', async () => {
    await open()
    expect(message(await handOver()).value).toBe(
      `Reading responses is here: ${URL_}. Sign in with your CWL. ${ROWS.studentsSee}`,
    )
  })

  it('the message is theirs to change, and Copy copies what they wrote; nothing is saved', async () => {
    await open()
    const region = await handOver()
    fireEvent.change(message(region), { target: { value: 'Post by Friday: ' + URL_ } })
    fireEvent.click(within(region).getByRole('button', { name: copyOf(s_.copyMessage) }))
    await waitFor(() => expect(copied).toEqual([`Post by Friday: ${URL_}`]))
    // Nothing sent anywhere, nothing kept in the browser.
    expect(fetched).toEqual([])
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  it('the honest line: anyone with a CWL, then the plan’s Who gets in', async () => {
    await open()
    expect(wordsOf(await handOver())).toContain(
      `Anyone with a CWL can sign in, not only your class. ${ROWS.whoGetsIn}`,
    )
  })

  it('a plan whose Who gets in already says anyone with a CWL is the honest line itself: said once, never twice', async () => {
    // The plan's prompt tells it so (FE-20), and the dev database's plans read like this one.
    const honest =
      "Anyone with a CWL can sign in. We can't limit it to your class yet, so it only shows each student their own work until they post."
    await open(stage({ rows: { ...ROWS, whoGetsIn: honest } }))
    const said = wordsOf(await handOver())
    expect(said).toContain(honest)
    expect(said.match(/anyone with a CWL/gi)).toHaveLength(1)
  })

  it('production’s two facts: serving the version from its day, and the last attempt the same', async () => {
    await open()
    const region = await handOver()
    const said = wordsOf(region)
    expect(said).toContain(words.preview.facts.serving)
    expect(said).toContain('The version from 18 September, 3:12pm')
    expect(said).toContain(words.preview.facts.attempt)
    expect(said).toContain(words.preview.facts.same)
  })

  it('asks our server for this app’s agreed plan, once, and no model', async () => {
    const s = await open()
    await handOver()
    expect(s.called('agreedRows')).toEqual([[PROJECT.id]])
  })

  it('no plan agreed (an app made elsewhere): the message and the line without their second parts', async () => {
    await open(stage({ rows: null }))
    const region = await handOver()
    expect(message(region).value).toBe(
      `Reading responses is here: ${URL_}. Sign in with your CWL.`,
    )
    expect(wordsOf(region)).toContain(
      'Anyone with a CWL can sign in, not only your class.',
    )
    expect(wordsOf(region)).not.toContain(ROWS.whoGetsIn)
  })

  it('our server not answering for the plan: the same, and the page stands', async () => {
    await open(stage({ rows: 'refused' }))
    const region = await handOver()
    expect(message(region).value).toBe(
      `Reading responses is here: ${URL_}. Sign in with your CWL.`,
    )
    expect(screen.getByRole('list', { name: words.overview.addresses })).toBeTruthy()
  })

  it('none of the platform’s words (C3)', async () => {
    await open()
    await handOver()
    expect(machineryIn(wordsOf(document.body))).toEqual([])
  })
})

describe('launched while this page’s lookup still says not (sitting 3’s carried minor)', () => {
  it('the checklist says launched: For your students leads, and no band', async () => {
    await open(stage({ launchedAt: null, launched: true }))
    await handOver()
    expect(screen.queryByRole('region', { name: words.overview.band.title })).toBeNull()
  })

  it('not launched anywhere: no hand-over, and our server is not asked for the plan', async () => {
    const s = await open(stage({ launchedAt: null, launched: false }))
    await screen.findByRole('list', { name: words.overview.addresses })
    await act(async () => undefined)
    expect(screen.queryByRole('region', { name: words.preview.tabs.students })).toBeNull()
    expect(s.called('agreedRows')).toEqual([])
  })
})
