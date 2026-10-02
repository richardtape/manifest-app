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
import { App } from '../app.js'
import { signInHref } from '../auth.js'
import { notOpen } from '../not-open.js'
import { machineryIn } from './machinery.js'
import { createOurs, type Ours } from '../ours/api.js'
import type { Platform } from '../platform/api.js'
import { WATCH_NAME } from './keeping/watch.js'
import { words } from '../words.js'

/**
 * EVERY SCREEN, RENDERED IN A DOM against a stand-in `Platform`. jsdom is this file's alone:
 * the contract sends no session header when it sees a `document`, so the platform's own
 * tests stay in node.
 */
const ME: Schemas['Me'] = {
  id: '11111111-1111-4111-8111-111111111111',
  puid: 'ins000001',
  displayName: 'Instructor One',
  email: 'instructor@example.test',
  role: 'member',
  mayBuild: true,
}

const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'test')

/** A platform whose reads answer as told; anything not told never settles. */
function platform(
  answers: Partial<{ [K in keyof Platform]: (...args: never[]) => Promise<unknown> }>,
): Platform {
  const never = () => new Promise<never>(() => undefined)
  return {
    getMe: (answers.getMe ?? never) as Platform['getMe'],
    listProjects: (answers.listProjects ?? never) as Platform['listProjects'],
    getProject: (answers.getProject ?? never) as Platform['getProject'],
    getRelease: (answers.getRelease ?? never) as Platform['getRelease'],
    listEnvironments: (answers.listEnvironments ?? never) as Platform['listEnvironments'],
    listInstances: (answers.listInstances ?? never) as Platform['listInstances'],
    listIncidents: (answers.listIncidents ?? never) as Platform['listIncidents'],
    startIntakeSession: (answers.startIntakeSession ??
      never) as Platform['startIntakeSession'],
    endIntakeSession: (answers.endIntakeSession ?? never) as Platform['endIntakeSession'],
    checkSlug: (answers.checkSlug ?? never) as Platform['checkSlug'],
    listBlueprints: (answers.listBlueprints ?? never) as Platform['listBlueprints'],
    createProject: (answers.createProject ?? never) as Platform['createProject'],
    mintToken: (answers.mintToken ?? never) as Platform['mintToken'],
    deploy: never,
    listAppSecrets: never,
    setAppSecret: never,
    runRehearsal: never,
    getLaunchReadiness: (answers.getLaunchReadiness ??
      never) as Platform['getLaunchReadiness'],
    // F5b: the mock's records, so no page that reads the steps waits on them (ORIENTATION §7).
    getLaunchRecords: (answers.getLaunchRecords ??
      (() => Promise.resolve(fixtures.LAUNCH_RECORDS))) as Platform['getLaunchRecords'],
    // Nobody has decided: the shared fake answers it, so no page waits on it (sitting 3's trap).
    getApproval: (answers.getApproval ??
      (() => Promise.resolve(null))) as Platform['getApproval'],
    getEnvironment: (answers.getEnvironment ?? never) as Platform['getEnvironment'],
    listMembers: (answers.listMembers ?? never) as Platform['listMembers'],
    revokeToken: (answers.revokeToken ?? never) as Platform['revokeToken'],
    archiveProject: (answers.archiveProject ?? never) as Platform['archiveProject'],
    restoreProject: (answers.restoreProject ?? never) as Platform['restoreProject'],
    deleteProject: (answers.deleteProject ?? never) as Platform['deleteProject'],
    watchProject: () => ({ ready: never(), close: () => undefined }),
  }
}

beforeEach(() => window.history.pushState({}, '', '/'))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('signed out (moment 1)', () => {
  it('shows the sign-in words, and Continue with CWL goes to UBC and back to this page', async () => {
    window.history.pushState({}, '', '/apps?tab=people')
    render(
      <App
        platform={platform({
          getMe: () => Promise.reject(refused(401, 'UNAUTHENTICATED')),
        })}
      />,
    )

    expect(await screen.findByRole('heading', { name: words.signIn.hero })).toBeTruthy()
    for (const text of [
      words.signIn.lead,
      ...words.signIn.ticks,
      words.signIn.title,
      words.signIn.body,
      words.signIn.note,
    ])
      expect(screen.getByText(text)).toBeTruthy()

    const cwl = screen.getByRole('link', { name: words.signIn.button })
    expect(cwl.getAttribute('href')).toBe(signInHref('/apps?tab=people'))
    expect(cwl.getAttribute('href')).toBe('/auth/login?returnTo=%2Fapps%3Ftab%3Dpeople')
    // The one screen with no rail.
    expect(screen.queryByRole('navigation')).toBeNull()
    await waitFor(() => expect(document.title).toBe(words.signIn.tab))
  })
})

describe('signed in: the shell', () => {
  it('has the rail, Your apps current, no project section, and the person with Sign out', async () => {
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(ME),
          listProjects: () => Promise.resolve([]),
        })}
      />,
    )
    const rail = await screen.findByRole('navigation', { name: 'Manifest' })
    const current = rail.querySelector('[aria-current="page"]')
    expect(current?.textContent).toBe(words.shell.yourApps)
    expect(rail.querySelector('.mf-rail__over')).toBeNull()
    expect(rail.querySelector('.mf-rail__who')?.textContent).toBe('Instructor One')
    expect(rail.querySelector('.mf-rail__out')?.textContent).toBe('Sign out')
    await waitFor(() => expect(document.title).toBe(words.shell.yourApps))
  })

  it('a role from a newer contract is not an error (Review Focus 4)', async () => {
    const me = { ...ME, role: 'no-such-role' } as unknown as Schemas['Me']
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(me),
          listProjects: () => Promise.resolve([]),
        })}
      />,
    )
    expect(await screen.findByRole('navigation', { name: 'Manifest' })).toBeTruthy()
  })

  it('a path we do not have says so, and offers Your apps', async () => {
    window.history.pushState({}, '', '/nowhere')
    render(<App platform={platform({ getMe: () => Promise.resolve(ME) })} />)
    expect(await screen.findByText(words.notFound.body)).toBeTruthy()
    const home = within(screen.getByRole('main')).getByRole('link', {
      name: words.notFound.link,
    })
    expect(home.getAttribute('href')).toBe('/')
    await waitFor(() => expect(document.title).toBe(words.shell.manifest))
  })
})

describe('signing out', () => {
  it('the rail’s Sign out POSTs, and a refusal says so and leaves them where they were', async () => {
    const posts: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      posts.push(url)
      return new Response('', { status: 500 })
    })
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(ME),
          listProjects: () => Promise.resolve([]),
        })}
      />,
    )
    const rail = await screen.findByRole('navigation', { name: 'Manifest' })
    await act(async () => {
      fireEvent.click(within(rail).getByText('Sign out'))
    })
    expect(await screen.findByText(words.signOut.failed)).toBeTruthy()
    // The only POST is the sign-out's (F6: Your apps also reads our server's needs and lines).
    expect(posts.filter((url) => !url.startsWith('/api/'))).toEqual(['/auth/logout'])
    expect(window.location.pathname).toBe('/')
  })
})

describe('a session that ends while the page is open (Review Focus 1)', () => {
  it('says so, offers Sign in again back to this page, and does not blank the page behind', async () => {
    window.history.pushState({}, '', '/?since=monday')
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(ME),
          listProjects: () => Promise.reject(refused(401, 'UNAUTHENTICATED')),
        })}
      />,
    )
    expect(await screen.findByText(words.expired.body)).toBeTruthy()
    const again = screen.getByRole('link', { name: words.expired.button })
    expect(again.getAttribute('href')).toBe(signInHref('/?since=monday'))
    // The page behind it: the rail, with the person still named, and the page's heading.
    expect(screen.getByRole('navigation', { name: 'Manifest' }).textContent).toContain(
      'Instructor One',
    )
    expect(screen.getByRole('heading', { name: words.shell.yourApps })).toBeTruthy()
  })
})

describe('the platform refuses who we are, for a reason we do not name (Review Focus 5)', () => {
  it('says something went wrong on our side, not that it cannot be reached', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <App
        platform={platform({ getMe: () => Promise.reject(refused(500, 'INTERNAL')) })}
      />,
    )
    expect(await screen.findByText(words.refused.body)).toBeTruthy()
    expect(screen.queryByText(words.unreachable.body)).toBeNull()
    vi.restoreAllMocks()
  })
})

describe('the platform cannot be reached (Review Focus 2)', () => {
  it('says so, and Try again asks again', async () => {
    let calls = 0
    render(
      <App
        platform={platform({
          getMe: () => {
            calls += 1
            return calls === 1
              ? Promise.reject(new TypeError('fetch failed'))
              : Promise.resolve(ME)
          },
          listProjects: () => Promise.resolve([]),
        })}
      />,
    )
    expect(await screen.findByText(words.unreachable.body)).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: words.unreachable.button }))
    })
    expect(await screen.findByRole('navigation', { name: 'Manifest' })).toBeTruthy()
    expect(calls).toBe(2)
  })
})

/**
 * The page's words, with hostnames (mono) removed: hostnames are allowed, and not words.
 * Text nodes are joined with a space: `textContent` runs neighbours together, so a label
 * beside a chip read "outhealthy", and a whole-word check missed "healthy" (sitting 4, the
 * plan's negative control).
 */
function wordsOnScreen(): string {
  const copy = document.body.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.mono').forEach((mono) => mono.remove())
  const texts: string[] = []
  const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode())
    // Rich's own sentence for trying out names UBC's "staging sign-in" (F4 Task 5's ruling):
    // the one place the word may be said, and only in his words.
    texts.push(node.nodeValue === words.preview.tryingOut ? '' : (node.nodeValue ?? ''))
  return texts.join(' ')
}

/** The mock's own fixtures, never hand-typed (Decision 9): mock-app, as getProject expands it. */
function mockPlatform(overrides: Partial<Schemas['Project']> = {}, me = fixtures.ME) {
  const project = { ...fixtures.PROJECT_EXPANDED, ...overrides }
  return platform({
    getMe: () => Promise.resolve(me),
    listProjects: () => Promise.resolve([{ ...fixtures.PROJECT, ...overrides }]),
    getProject: () => Promise.resolve(project),
    getRelease: () => Promise.resolve(fixtures.RELEASE),
    listEnvironments: () => Promise.resolve(fixtures.ENVIRONMENTS),
    listInstances: (id: string) => Promise.resolve(fixtures.INSTANCE_LISTS[id]!),
    listIncidents: (id: string) =>
      Promise.resolve({ environmentId: id, incidents: [] as Schemas['Incident'][] }),
    getLaunchReadiness: () => Promise.resolve(fixtures.LAUNCH_READINESS),
    // F5b: the steps are read beside the checklist (ORIENTATION §7: a new read answered here).
    getLaunchRecords: () => Promise.resolve(fixtures.LAUNCH_RECORDS),
  })
}

describe('Your apps, empty (moment 2)', () => {
  it('invites them to describe what they need, and says what comes after', async () => {
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(ME),
          listProjects: () => Promise.resolve([]),
        })}
      />,
    )
    expect(await screen.findByText(words.yourApps.empty)).toBeTruthy()
    const describe = screen.getByRole('link', { name: words.yourApps.describe })
    expect(describe.getAttribute('href')).toBe('/new')
    // The lead time is anchored to the invitation, in a note of its own, not a caption left
    // floating below it (Rich, sitting 5: "really small and kinda just... floating there").
    const leadTime = screen.getByText(words.yourApps.leadTime)
    expect(leadTime.closest('.mf-card')).toBe(describe.closest('.mf-card'))
    expect(leadTime.closest('.your-apps__lead-time')).not.toBeNull()
    expect(leadTime.className).not.toContain('caption')
    expect(machineryIn(wordsOnScreen())).toEqual([])

    await act(async () => {
      fireEvent.click(describe)
    })
    expect(
      await screen.findByRole('heading', { name: words.describe.title }),
    ).toBeTruthy()
  })
})

describe('Your apps, with an app (moment 16’s card)', () => {
  it('leads with what its students get, then the draft and trying-out addresses', async () => {
    render(<App platform={mockPlatform()} />)
    const card = (
      await screen.findByRole('heading', { name: 'Mock course app' })
    ).closest('.mf-card')
    expect(card).not.toBeNull()
    const text = card!.textContent ?? ''
    expect(text).toContain('one class, all arriving at once')

    const students = card!.querySelector('.app-card__students')
    expect(students?.textContent).toContain(words.yourApps.forStudents)
    expect(students?.querySelector('.mf-chip')?.className).toContain('mf-is-notyet')
    expect(students?.textContent).toContain(words.facts.notLive)

    const [draft, tryingOut] = [...card!.querySelectorAll('.app-card__address')]
    expect(draft?.textContent).toContain(words.yourApps.draft)
    expect(draft?.querySelector('.mono')?.textContent).toBe(
      'mock-app.sandbox.manifest.internal',
    )
    // Since the platform's sitting 10 (manifest 18f3214, FE-27), the mock's sandbox runs too.
    expect(draft?.querySelector('.mf-chip')?.className).toContain('mf-is-steady')
    expect(draft?.textContent).toMatch(
      /Answering · the version from 18 September, \d{1,2}:\d{2}(am|pm)/,
    )
    expect(tryingOut?.textContent).toContain(words.yourApps.tryingOut)
    expect(tryingOut?.querySelector('.mono')?.textContent).toBe(
      'mock-app.staging.manifest.internal',
    )
    expect(tryingOut?.querySelector('.mf-chip')?.className).toContain('mf-is-steady')
    expect(tryingOut?.textContent).toMatch(
      /Answering · the version from 18 September, \d{1,2}:\d{2}(am|pm)/,
    )
    // The students' fact comes first.
    expect(text.indexOf(words.yourApps.forStudents)).toBeLessThan(
      text.indexOf(words.yourApps.draft),
    )
  })

  it('a project with no name yet is called by its slug', async () => {
    render(<App platform={mockPlatform({ name: null } as never)} />)
    expect(await screen.findByRole('heading', { name: 'mock-app' })).toBeTruthy()
  })

  it('an administrator sees only the apps they own (Review Focus 3, FE-10)', async () => {
    const theirs = fixtures.PROJECT
    const someoneElses = {
      ...fixtures.PROJECT,
      id: '22222222-2222-4222-8222-999999999999',
      slug: 'not-theirs',
      name: 'Not theirs',
      owner: { id: '11111111-1111-4111-8111-999999999999', displayName: 'Someone Else' },
    }
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(fixtures.ADMIN_ME),
          listProjects: () => Promise.resolve([theirs, someoneElses]),
          getProject: (() => Promise.resolve(fixtures.PROJECT_EXPANDED)) as never,
          getRelease: () => Promise.resolve(fixtures.RELEASE),
          getLaunchReadiness: () => Promise.resolve(fixtures.LAUNCH_READINESS),
        })}
      />,
    )
    expect(await screen.findByRole('heading', { name: 'Mock course app' })).toBeTruthy()
    expect(screen.queryByText('Not theirs')).toBeNull()
  })

  it('an address that never answered needs them, in words, once students can reach it (Review Focus 4)', async () => {
    const environments = fixtures.PROJECT_EXPANDED.environments!.map((e) =>
      e.kind === 'production' ? { ...e, instance: fixtures.FAILED_INSTANCE } : e,
    )
    // Launched: before a launch the live address is nobody's yet, and a failed instance there is a
    // dry run's or a launch's attempt, said on Going live (the platform's 5b; asServed).
    render(
      <App
        platform={mockPlatform({ environments, launchedAt: '2026-10-03T17:00:00.000Z' })}
      />,
    )
    const students = (await screen.findByText(words.facts.neverAnswered)).closest(
      '.app-card__students',
    )
    expect(students?.querySelector('.mf-chip')?.className).toContain('mf-is-attention')
    expect(machineryIn(wordsOnScreen())).toEqual([])
  })
})

describe('Your apps cannot be read (Review Focus 2)', () => {
  it('says so, keeps the rail, and Try again reads again', async () => {
    let reads = 0
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(ME),
          listProjects: () => {
            reads += 1
            return reads === 1
              ? Promise.reject(new TypeError('fetch failed'))
              : Promise.resolve([])
          },
        })}
      />,
    )
    expect(await screen.findByText(words.unreachable.body)).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Manifest' })).toBeTruthy()
    expect(machineryIn(wordsOnScreen())).toEqual([])
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: words.unreachable.button }))
    })
    expect(await screen.findByText(words.yourApps.empty)).toBeTruthy()
    expect(reads).toBe(2)
  })

  it('a refusal it does not know is our generic words, with its code in the console and never on the page (Review Focus 5)', async () => {
    const warned: unknown[][] = []
    vi.spyOn(console, 'warn').mockImplementation((...args) => void warned.push(args))
    render(
      <App
        platform={{
          ...mockPlatform(),
          getProject: () => Promise.reject(refused(500, 'INTERNAL')),
        }}
      />,
    )
    expect(await screen.findByText(words.refused.body)).toBeTruthy()
    expect(screen.queryByText(words.unreachable.body)).toBeNull()
    expect(screen.getByRole('button', { name: words.refused.button })).toBeTruthy()
    expect(document.body.textContent).not.toContain('INTERNAL')
    // Said in the notice's effect, which may run after its words are on the page.
    await waitFor(() =>
      expect(warned.flat().join(' ')).toMatch(/INTERNAL.*500|500.*INTERNAL/),
    )
    vi.restoreAllMocks()
  })
})

/**
 * BEFORE YOUR STUDENTS CAN USE IT (F5 Task 5, Decision 3): a built app, not launched, with a
 * production clock unmet, carries one line and Going live. One checklist read per such app, and
 * none for any other (FE-10's cost).
 */
describe('Your apps: before your students can use it (Decision 3, moment 10)', () => {
  const launched = {
    ...fixtures.PROJECT,
    id: '22222222-2222-4222-8222-000000000003',
    slug: 'launched-app',
    name: 'Launched app',
    launchedAt: '2026-10-03T17:00:00.000Z',
  }
  const unbuilt = {
    ...fixtures.PROJECT,
    id: '22222222-2222-4222-8222-000000000004',
    slug: 'unbuilt-app',
    name: 'Unbuilt app',
  }
  const expanded = (p: Schemas['Project']): Schemas['Project'] => ({
    ...fixtures.PROJECT_EXPANDED,
    ...p,
    environments: fixtures.PROJECT_EXPANDED.environments!.map((e) =>
      p.id === unbuilt.id && e.kind === 'sandbox' ? { ...e, instance: null } : e,
    ),
  })

  it('a built app, not launched, with a step not done: the line, one after another, and Going live', async () => {
    const asked: string[] = []
    const records: string[] = []
    render(
      <App
        platform={{
          ...mockPlatform(),
          getLaunchReadiness: (id: string) => (
            asked.push(id),
            Promise.resolve(fixtures.LAUNCH_READINESS)
          ),
          getLaunchRecords: (id: string) => (
            records.push(id),
            Promise.resolve(fixtures.LAUNCH_RECORDS)
          ),
        }}
      />,
    )
    const card = (
      await screen.findByRole('heading', { name: 'Mock course app' })
    ).closest('.mf-card') as HTMLElement
    expect(await within(card).findByText(words.yourApps.beforeStudents)).toBeTruthy()
    expect(words.yourApps.beforeStudents).toBe(
      'Before your students can use it: three things other people answer, one after another, and each may take several days.',
    )
    expect(card.textContent).not.toMatch(/weeks/i)
    const going = within(card).getByRole('link', { name: words.yourApps.goingLive })
    expect(going.getAttribute('href')).toBe('/apps/mock-app/going-live')
    expect(asked).toEqual([fixtures.PROJECT_ID])
    expect(records).toEqual([fixtures.PROJECT_ID])
    expect(machineryIn(wordsOnScreen())).toEqual([])
  })

  it('every asking app’s records are asked at once, beside its checklist, not one after another (S0)', async () => {
    const records: string[] = []
    const other = {
      ...fixtures.PROJECT,
      id: '22222222-2222-4222-8222-000000000005',
      slug: 'other-app',
      name: 'Other app',
    }
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(ME),
          listProjects: () => Promise.resolve([fixtures.PROJECT, other]),
          getProject: (id: string) =>
            Promise.resolve(expanded(id === other.id ? other : fixtures.PROJECT)),
          getRelease: () => Promise.resolve(fixtures.RELEASE),
          // Neither answers: both are asked all the same.
          getLaunchReadiness: () => new Promise(() => undefined),
          getLaunchRecords: (id: string) => (
            records.push(id),
            new Promise(() => undefined)
          ),
        })}
      />,
    )
    await waitFor(() => expect(records).toHaveLength(2))
    expect([...records].sort()).toEqual([fixtures.PROJECT_ID, other.id].sort())
  })

  it('launched, or not built: no line, and neither the checklist nor the records read', async () => {
    const asked: string[] = []
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(ME),
          listProjects: () => Promise.resolve([launched, unbuilt]),
          getProject: (id: string) =>
            Promise.resolve(expanded(id === launched.id ? launched : unbuilt)),
          getRelease: () => Promise.resolve(fixtures.RELEASE),
          getLaunchReadiness: (id: string) => (
            asked.push(id),
            Promise.resolve(fixtures.LAUNCH_READINESS)
          ),
          getLaunchRecords: (id: string) => (
            asked.push(id),
            Promise.resolve(fixtures.LAUNCH_RECORDS)
          ),
        })}
      />,
    )
    await screen.findByRole('heading', { name: 'Launched app' })
    await screen.findByRole('heading', { name: 'Unbuilt app' })
    expect(screen.queryByText(words.yourApps.beforeStudents)).toBeNull()
    expect(asked).toEqual([])
  })

  it('every step done: no line', async () => {
    render(
      <App
        platform={{
          ...mockPlatform(),
          getLaunchReadiness: () =>
            Promise.resolve({
              ...fixtures.LAUNCH_READINESS,
              items: fixtures.LAUNCH_READINESS.items.map((i) => ({
                ...i,
                state: 'met' as const,
              })),
            }),
          getLaunchRecords: () =>
            Promise.resolve({
              ...fixtures.LAUNCH_RECORDS,
              privacyAssessment: {
                ...fixtures.PRIVACY_ASSESSMENT,
                state: 'approved' as const,
                approvedAt: '2026-09-21T19:00:00.000Z',
              },
            }),
        }}
      />,
    )
    await screen.findByRole('heading', { name: 'Mock course app' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText(words.yourApps.beforeStudents)).toBeNull()
  })

  it('a checklist that cannot be read: the card as it is, without the line', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <App
        platform={{
          ...mockPlatform(),
          getLaunchReadiness: () => Promise.reject(refused(500, 'INTERNAL')),
        }}
      />,
    )
    await screen.findByRole('heading', { name: 'Mock course app' })
    await waitFor(() => expect(warn).toHaveBeenCalled())
    expect(screen.queryByText(words.yourApps.beforeStudents)).toBeNull()
    expect(screen.queryByText(words.refused.body)).toBeNull()
    vi.restoreAllMocks()
  })

  it('records that cannot be read: the card as it is, without the line, never the card lost', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <App
        platform={{
          ...mockPlatform(),
          getLaunchRecords: () => Promise.reject(refused(500, 'INTERNAL')),
        }}
      />,
    )
    const card = (
      await screen.findByRole('heading', { name: 'Mock course app' })
    ).closest('.mf-card') as HTMLElement
    await waitFor(() => expect(warn).toHaveBeenCalled())
    expect(within(card).queryByText(words.yourApps.beforeStudents)).toBeNull()
    expect(screen.queryByText(words.refused.body)).toBeNull()
    vi.restoreAllMocks()
  })
})

describe('no machinery on any screen (C3, Decision 9)', () => {
  it('Your apps, fed by the mock’s own fixtures, shows none of the platform’s words', async () => {
    render(<App platform={mockPlatform()} />)
    await screen.findByRole('heading', { name: 'Mock course app' })
    expect(machineryIn(wordsOnScreen())).toEqual([])
  })
  it('nor does sign-in', async () => {
    render(
      <App
        platform={platform({
          getMe: () => Promise.reject(refused(401, 'UNAUTHENTICATED')),
        })}
      />,
    )
    await screen.findByRole('heading', { name: words.signIn.hero })
    expect(machineryIn(wordsOnScreen())).toEqual([])
  })
})

describe('the keyboard reaches the page, not only the rail (Rich’s click-through)', () => {
  it('the first stop is Skip to content, and the page itself can take focus', async () => {
    render(<App platform={mockPlatform()} />)
    await screen.findByRole('heading', { name: 'Mock course app' })
    const first = document.querySelector('a[href], button')
    expect(first?.textContent).toBe(words.shell.skipToContent)
    expect(first?.getAttribute('href')).toBe('#main')
    const main = document.getElementById('main')
    expect(main?.tagName).toBe('MAIN')
    expect(main?.getAttribute('tabindex')).toBe('-1')
  })

  it('an app’s name is a link, to its own page (F5 Task 5: the Overview, its landing page)', async () => {
    render(<App platform={mockPlatform()} />)
    const name = await screen.findByRole('link', { name: 'Mock course app' })
    expect(name.getAttribute('href')).toBe('/apps/mock-app')
    await act(async () => {
      fireEvent.click(name)
    })
    expect(
      await screen.findByRole('list', { name: words.overview.addresses }),
    ).toBeTruthy()
    expect(window.location.pathname).toBe('/apps/mock-app')
  })
})

describe('the person’s profile (Rich’s click-through)', () => {
  it('the rail names the person as a link to their profile, which shows who UBC says they are', async () => {
    render(<App platform={mockPlatform()} />)
    const rail = await screen.findByRole('navigation', { name: 'Manifest' })
    const who = within(rail).getByRole('link', { name: 'Instructor One' })
    expect(who.getAttribute('href')).toBe('/profile')
    await act(async () => {
      fireEvent.click(who)
    })
    expect(await screen.findByRole('heading', { name: words.profile.title })).toBeTruthy()
    const main = screen.getByRole('main')
    expect(within(main).getByText(fixtures.ME.displayName)).toBeTruthy()
    expect(within(main).getByText(fixtures.ME.email)).toBeTruthy()
    expect(within(main).getByRole('button', { name: words.signOut.button })).toBeTruthy()
    await waitFor(() => expect(document.title).toBe(words.profile.title))
    expect(machineryIn(wordsOnScreen())).toEqual([])
  })
})

describe('focus follows an in-app navigation to the page (review, accessibility)', () => {
  it('lands on the page after a link, and is left alone on first load', async () => {
    render(<App platform={mockPlatform()} />)
    const name = await screen.findByRole('link', { name: 'Mock course app' })
    expect(document.activeElement).toBe(document.body)
    await act(async () => {
      fireEvent.click(name)
    })
    await screen.findByRole('list', { name: words.overview.addresses })
    expect(document.activeElement).toBe(document.getElementById('main'))
  })
})

describe('one app that cannot be read does not hide the others (review, deferred minor)', () => {
  const second = {
    ...fixtures.PROJECT,
    id: '22222222-2222-4222-8222-000000000002',
    slug: 'second-app',
    name: 'Second app',
  }
  const two = (getProject: Platform['getProject'], getRelease?: Platform['getRelease']) =>
    platform({
      getMe: () => Promise.resolve(ME),
      listProjects: () => Promise.resolve([fixtures.PROJECT, second]),
      getProject,
      getRelease: getRelease ?? (() => Promise.resolve(fixtures.RELEASE)),
      getLaunchReadiness: () => Promise.resolve(fixtures.LAUNCH_READINESS),
      getLaunchRecords: () => Promise.resolve(fixtures.LAUNCH_RECORDS),
    })

  it('the one that failed says it cannot tell; the other is drawn in full', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <App
        platform={two((id) =>
          id === second.id
            ? Promise.reject(refused(500, 'INTERNAL'))
            : Promise.resolve(fixtures.PROJECT_EXPANDED),
        )}
      />,
    )
    const failed = (await screen.findByRole('link', { name: 'Second app' })).closest(
      '.mf-card',
    )
    expect(failed?.querySelector('.app-card__students')?.textContent).toContain(
      words.facts.cantTell,
    )
    const whole = screen
      .getByRole('link', { name: 'Mock course app' })
      .closest('.mf-card')
    expect(whole?.textContent).toContain('mock-app.staging.manifest.internal')
    expect(screen.queryByText(words.refused.body)).toBeNull()
    vi.restoreAllMocks()
  })

  it('a release that cannot be read is Answering, without its date', async () => {
    render(
      <App
        platform={two(
          () => Promise.resolve(fixtures.PROJECT_EXPANDED),
          () => Promise.reject(refused(500, 'INTERNAL')),
        )}
      />,
    )
    const card = (
      await screen.findAllByRole('link', { name: 'Mock course app' })
    )[0]!.closest('.mf-card')
    const tryingOut = [...card!.querySelectorAll('.app-card__address')][1]
    expect(tryingOut?.querySelector('.mf-chip')?.textContent).toBe(words.facts.answering)
  })

  it('a 401 on any one of them is the session ending', async () => {
    render(
      <App
        platform={two((id) =>
          id === second.id
            ? Promise.reject(refused(401, 'UNAUTHENTICATED'))
            : Promise.resolve(fixtures.PROJECT_EXPANDED),
        )}
      />,
    )
    expect(await screen.findByText(words.expired.body)).toBeTruthy()
  })

  it('when every one fails to be reached, it is the page’s own notice', async () => {
    render(<App platform={two(() => Promise.reject(new TypeError('fetch failed')))} />)
    expect(await screen.findByText(words.unreachable.body)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Second app' })).toBeNull()
  })
})

describe('no machinery on EVERY screen and state (Decision 9; the final review)', () => {
  const signedIn = {
    getMe: () => Promise.resolve(ME),
    listProjects: () => Promise.resolve([]),
  }
  const cases: [string, string, Parameters<typeof platform>[0], string][] = [
    [
      'sign-in',
      '/',
      { getMe: () => Promise.reject(refused(401, 'UNAUTHENTICATED')) },
      words.signIn.title,
    ],
    [
      'the session cannot be reached',
      '/',
      { getMe: () => Promise.reject(new TypeError('x')) },
      words.unreachable.body,
    ],
    [
      'the session is refused',
      '/',
      { getMe: () => Promise.reject(refused(500, 'INTERNAL')) },
      words.refused.body,
    ],
    [
      'a session that ends',
      '/',
      {
        getMe: () => Promise.resolve(ME),
        listProjects: () => Promise.reject(refused(401, 'UNAUTHENTICATED')),
      },
      words.expired.body,
    ],
    ['Your apps, empty', '/', signedIn, words.yourApps.empty],
    [
      'Your apps cannot be read',
      '/',
      {
        getMe: () => Promise.resolve(ME),
        listProjects: () => Promise.reject(new TypeError('x')),
      },
      words.unreachable.body,
    ],
    ['not found', '/nowhere', signedIn, words.notFound.body],
    ['Describe it (moment 3)', '/new', signedIn, words.describe.title],
    ['an app that is not theirs', '/apps/mock-app', signedIn, words.notFound.body],
    [
      'an app’s own page: the Overview, with its band (F5 Task 5)',
      '/apps/mock-app',
      {
        getMe: () => Promise.resolve(ME),
        listProjects: () => Promise.resolve([fixtures.PROJECT]),
        listEnvironments: () => Promise.resolve(fixtures.ENVIRONMENTS),
        getRelease: () => Promise.resolve(fixtures.RELEASE),
        getLaunchReadiness: () => Promise.resolve(fixtures.LAUNCH_READINESS),
      },
      words.overview.band.title,
    ],
    [
      'an app’s own page: the Preview (F4 Task 5)',
      '/apps/mock-app/preview',
      {
        getMe: () => Promise.resolve(ME),
        listProjects: () => Promise.resolve([fixtures.PROJECT]),
        listEnvironments: () => Promise.resolve(fixtures.ENVIRONMENTS),
        listInstances: (id: string) => Promise.resolve(fixtures.INSTANCE_LISTS[id]!),
        listIncidents: () => new Promise(() => undefined),
        getRelease: () => Promise.resolve(fixtures.RELEASE),
      },
      words.preview.facts.serving,
    ],
    ['signed out, the fallback page', '/signed-out', signedIn, words.signOut.title],
    ['the profile', '/profile', signedIn, words.profile.title],
  ]
  it.each(cases)('%s', async (_, path, answers, anchor) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    window.history.pushState({}, '', path)
    render(<App platform={platform(answers)} />)
    expect((await screen.findAllByText(anchor)).length).toBeGreaterThan(0)
    expect(machineryIn(wordsOnScreen())).toEqual([])
    vi.restoreAllMocks()
  })
})

describe('a failed sign-out’s notice does not follow them round (the final review)', () => {
  it('is cleared when they move to another page', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 500 }))
    render(<App platform={mockPlatform()} />)
    const rail = await screen.findByRole('navigation', { name: 'Manifest' })
    await act(async () => {
      fireEvent.click(within(rail).getByText('Sign out'))
    })
    expect(await screen.findByText(words.signOut.failed)).toBeTruthy()
    await act(async () => {
      fireEvent.click(within(rail).getByRole('link', { name: 'Instructor One' }))
    })
    await screen.findByRole('heading', { name: words.profile.title })
    expect(screen.queryByText(words.signOut.failed)).toBeNull()
  })
})

const STUDENT: Schemas['Me'] = {
  id: '22222222-2222-4222-8222-222222222222',
  puid: 'stu000001',
  displayName: 'Student One',
  email: 'student@example.test',
  role: 'member',
  mayBuild: false,
}
/** Someone who stopped being faculty, and owns an app (Rich: they keep it, and start nothing new). */
const LAPSED: Schemas['Me'] = { ...ME, mayBuild: false }

describe('someone who may not build, with no apps (D7, FE-39)', () => {
  it.each(['/', '/new', '/apps/x', '/apps/x/conversations/y', '/profile', '/nowhere'])(
    'at %s: the screen, their name, Sign out, no rail, the address kept',
    async (path) => {
      window.history.pushState({}, '', path)
      const listProjects = vi.fn(() => Promise.resolve([]))
      const getProject = vi.fn(() => new Promise<never>(() => undefined))
      render(
        <App
          platform={platform({
            getMe: () => Promise.resolve(STUDENT),
            listProjects,
            getProject,
          })}
        />,
      )
      expect(
        await screen.findByRole('heading', { level: 1, name: words.notOpen.title }),
      ).toBeTruthy()
      expect(screen.getByText(words.notOpen.body)).toBeTruthy()
      expect(screen.getByText(words.notOpen.who('Student One'))).toBeTruthy()
      expect(screen.getByRole('button', { name: words.signOut.button })).toBeTruthy()
      expect(screen.queryByRole('navigation', { name: 'Manifest' })).toBeNull()
      expect(listProjects).toHaveBeenCalledTimes(1)
      expect(getProject).not.toHaveBeenCalled()
      expect(window.location.pathname).toBe(path)
      expect(machineryIn(document.body.textContent ?? '')).toEqual([])
      await waitFor(() => expect(document.title).toBe(words.shell.manifest))
      cleanup()
    },
  )

  it('Sign out POSTs, and a refusal says so on the same screen', async () => {
    const posts: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      posts.push(url)
      return new Response('', { status: 500 })
    })
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(STUDENT),
          listProjects: () => Promise.resolve([]),
        })}
      />,
    )
    // Found before the click's act: inside it, React holds the screen's arrival until it ends.
    const button = await screen.findByRole('button', { name: words.signOut.button })
    await act(async () => {
      fireEvent.click(button)
    })
    expect(await screen.findByText(words.signOut.failed)).toBeTruthy()
    // The only POST is the sign-out's (F6: Your apps also reads our server's needs and lines).
    expect(posts.filter((url) => !url.startsWith('/api/'))).toEqual(['/auth/logout'])
    expect(screen.getByText(words.notOpen.title)).toBeTruthy()
  })

  it('their session ends while we look (401): sign in again, never a blank page', async () => {
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(STUDENT),
          listProjects: () => Promise.reject(refused(401, 'UNAUTHENTICATED')),
        })}
      />,
    )
    expect(await screen.findByText(words.expired.body)).toBeTruthy()
    expect(
      screen.getByRole('link', { name: words.expired.button }).getAttribute('href'),
    ).toBe(signInHref('/'))
    expect(screen.queryByRole('navigation', { name: 'Manifest' })).toBeNull()
    expect(screen.queryByText(words.notOpen.title)).toBeNull()
  })

  it('listProjects fails: moment 2’s words and Try again, never the screen by guess', async () => {
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(STUDENT),
          listProjects: () => Promise.reject(new TypeError('no network')),
        })}
      />,
    )
    expect(await screen.findByText(words.unreachable.body)).toBeTruthy()
    expect(screen.getByRole('button', { name: words.unreachable.button })).toBeTruthy()
    expect(screen.queryByText(words.notOpen.title)).toBeNull()
  })
})

describe('someone who stopped being faculty, and keeps apps (D7: they start nothing new)', () => {
  it('Your apps, with their app, and no Start something new', async () => {
    const mineToo = {
      ...fixtures.PROJECT,
      owner: { id: LAPSED.id, displayName: LAPSED.displayName },
    }
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(LAPSED),
          listProjects: () => Promise.resolve([mineToo]),
        })}
      />,
    )
    const rail = await screen.findByRole('navigation', { name: 'Manifest' })
    expect(within(rail).queryByText(words.shell.startNew)).toBeNull()
    expect(screen.queryByText(words.notOpen.title)).toBeNull()
  })

  it('their app on Your apps, and its own page as before (Review Focus 2)', async () => {
    const keeps = { ...fixtures.ME, mayBuild: false }
    render(<App platform={mockPlatform({}, keeps)} />)
    expect(await screen.findByText(fixtures.PROJECT.name)).toBeTruthy()
    cleanup()
    window.history.pushState({}, '', '/apps/mock-app')
    render(<App platform={mockPlatform({}, keeps)} />)
    expect(
      await screen.findByRole('heading', { level: 1, name: fixtures.PROJECT.name }),
    ).toBeTruthy()
    expect(screen.queryByText(words.notOpen.title)).toBeNull()
  })

  it('/new: the tab says Manifest, not Describe what you need (a screen reader hears it first)', async () => {
    window.history.pushState({}, '', '/new')
    const mineToo = {
      ...fixtures.PROJECT,
      owner: { id: LAPSED.id, displayName: LAPSED.displayName },
    }
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(LAPSED),
          listProjects: () => Promise.resolve([mineToo]),
        })}
      />,
    )
    await screen.findByRole('heading', { level: 1, name: words.notOpen.title })
    await waitFor(() => expect(document.title).toBe(words.shell.manifest))
  })

  it('/new says the two sentences, in the page, beside the rail', async () => {
    window.history.pushState({}, '', '/new')
    const mineToo = {
      ...fixtures.PROJECT,
      owner: { id: LAPSED.id, displayName: LAPSED.displayName },
    }
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(LAPSED),
          listProjects: () => Promise.resolve([mineToo]),
        })}
      />,
    )
    const main = await screen.findByRole('main')
    expect(
      await within(main).findByRole('heading', { level: 1, name: words.notOpen.title }),
    ).toBeTruthy()
    expect(within(main).getByText(words.notOpen.body)).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Manifest' })).toBeTruthy()
    expect(document.querySelector('#describe-words')).toBeNull()
  })
})

describe('the decision, as it arrives (FE-39)', () => {
  it('a getMe from before FE-39, with no mayBuild in it, builds as today', async () => {
    const before = Object.fromEntries(
      Object.entries(ME).filter(([key]) => key !== 'mayBuild'),
    )
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(before as Schemas['Me']),
          listProjects: () => Promise.resolve([]),
        })}
      />,
    )
    const rail = await screen.findByRole('navigation', { name: 'Manifest' })
    expect(within(rail).getByText(words.shell.startNew)).toBeTruthy()
    expect(screen.queryByText(words.notOpen.title)).toBeNull()
  })

  it('refused part-way: the signal reads getMe again, and the screen follows, never an error', async () => {
    let asked = 0
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(++asked === 1 ? ME : STUDENT),
          listProjects: () => Promise.resolve([]),
        })}
      />,
    )
    await screen.findByRole('navigation', { name: 'Manifest' })
    await act(async () => {
      notOpen.dispatchEvent(new Event('refused'))
    })
    expect(await screen.findByText(words.notOpen.title)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(asked).toBe(2)
  })
})

describe('the Keeping watch, minted where it runs (F6 Task 8, design §1)', () => {
  const NOT_WATCHING = { watching: false, until: null, tokenId: null, mine: false }
  /** Ours as the page has it, but the watch's two routes recorded and answered as told. */
  function watched(
    keeping: (projectId: string) => Promise<Awaited<ReturnType<Ours['keeping']>>>,
  ) {
    const asked: string[] = []
    const handed: string[] = []
    const ours: Ours = {
      ...createOurs(),
      keeping: (projectId) => {
        asked.push(projectId)
        return keeping(projectId)
      },
      handWatch: async (projectId) => {
        handed.push(projectId)
        return { kept: 'new' }
      },
    }
    return { ours, asked, handed }
  }
  const minting = (p: Platform) => {
    const mints: [string, Schemas['MintTokenRequest']][] = []
    p.mintToken = (projectId, body) => {
      mints.push([projectId, body])
      return Promise.resolve({
        token: { id: `t-${mints.length}`, expiresAt: '2027-10-01T00:00:00.000Z' },
        secret: `mft_t_${mints.length}`,
      } as unknown as Schemas['MintedToken'])
    }
    return mints
  }

  it('an app’s own page asks once whether we watch it, and mints the watch when we do not', async () => {
    window.history.pushState({}, '', '/apps/mock-app')
    const p = mockPlatform()
    const mints = minting(p)
    const w = watched(async () => NOT_WATCHING)
    render(<App platform={p} ours={w.ours} />)
    await screen.findByRole('heading', { level: 1, name: fixtures.PROJECT.name })
    await waitFor(() => expect(w.handed).toEqual([fixtures.PROJECT_ID]))
    expect(w.asked).toEqual([fixtures.PROJECT_ID])
    expect(mints.map(([id, body]) => [id, body.name])).toEqual([
      [fixtures.PROJECT_ID, WATCH_NAME],
    ])
  })

  it('Your apps asks for each app after its reads, one at a time', async () => {
    const SECOND = '33333333-3333-4333-8333-333333333333'
    const p = mockPlatform()
    const second = {
      ...fixtures.PROJECT,
      id: SECOND,
      slug: 'second-app',
      name: 'Second app',
    }
    p.listProjects = () => Promise.resolve([fixtures.PROJECT, second])
    p.getProject = (id) =>
      Promise.resolve(
        id === SECOND
          ? {
              ...fixtures.PROJECT_EXPANDED,
              id: SECOND,
              slug: 'second-app',
              name: 'Second app',
            }
          : fixtures.PROJECT_EXPANDED,
      )
    const mints = minting(p)
    let release: () => void = () => undefined
    const first = new Promise<void>((resolve) => (release = resolve))
    const w = watched(async (projectId) => {
      if (projectId === fixtures.PROJECT_ID) await first
      return NOT_WATCHING
    })
    render(<App platform={p} ours={w.ours} />)
    await screen.findByRole('heading', { name: 'Second app' })
    await waitFor(() => expect(w.asked).toEqual([fixtures.PROJECT_ID]))
    // The second waits for the first.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(w.asked).toEqual([fixtures.PROJECT_ID])
    release()
    await waitFor(() => expect(w.handed).toEqual([fixtures.PROJECT_ID, SECOND]))
    expect(w.asked).toEqual([fixtures.PROJECT_ID, SECOND])
    expect(mints.map(([id]) => id)).toEqual([fixtures.PROJECT_ID, SECOND])
  })

  it('a switched-off app is never minted for, on its page or on Your apps (Review Focus 4)', async () => {
    const p = mockPlatform({ state: 'archived', archivedAt: '2026-09-30T17:00:00.000Z' })
    const mints = minting(p)
    const w = watched(async () => NOT_WATCHING)
    render(<App platform={p} ours={w.ours} />)
    await screen.findByRole('heading', { name: fixtures.PROJECT.name })
    await new Promise((resolve) => setTimeout(resolve, 0))
    cleanup()
    window.history.pushState({}, '', '/apps/mock-app')
    render(<App platform={p} ours={w.ours} />)
    await screen.findByRole('heading', { level: 1, name: fixtures.PROJECT.name })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect([w.asked, mints]).toEqual([[], []])
  })
})

describe('F6 Task 9: coming back to Your apps (moment 16, design §2)', () => {
  const k = words.keeping
  const app = {
    projectId: fixtures.PROJECT_ID,
    name: fixtures.PROJECT.name,
    slug: 'mock-app',
  }
  const AT = '2026-10-01T17:03:00.000Z'
  const oursWith = (patch: Partial<Ours>): Ours => ({
    ...createOurs(),
    keeping: () => new Promise(() => undefined),
    ...patch,
  })

  it('the band across their apps, Since naming each app, and the card’s students’ fact turned attention', async () => {
    const ours = oursWith({
      needs: async () => [{ kind: 'down', app, from: AT, owner: true }],
      since: async () => ({
        lastHere: '2026-09-30T17:00:00.000Z',
        lines: [
          {
            id: 'e1',
            at: AT,
            happening: { kind: 'went-live', instanceId: 'i' },
            who: null,
            whom: null,
            app,
          },
        ],
      }),
    })
    render(<App platform={mockPlatform()} ours={ours} />)
    const band = await screen.findByRole('region', { name: k.band.label })
    expect(band.textContent).toContain(fixtures.PROJECT.name)
    const since = await screen.findByRole('region', { name: k.since.title })
    expect(
      within(since)
        .getByRole('link', { name: fixtures.PROJECT.name })
        .getAttribute('href'),
    ).toBe('/apps/mock-app/history')
    const card = screen
      .getByRole('heading', { name: fixtures.PROJECT.name })
      .closest('.mf-card')!
    const students = card.querySelector('.app-card__students')!
    await waitFor(() =>
      expect(students.textContent).toContain(k.card.unreachable('').trim()),
    )
    expect(students.querySelector('.mf-chip')?.className).toContain('mf-is-attention')
    expect(machineryIn(wordsOnScreen())).toEqual([])
  })

  it('a switched-off app’s card says so, and when', async () => {
    const ours = oursWith({
      needs: async () => [],
      since: async () => ({ lastHere: null, lines: [] }),
    })
    render(
      <App
        platform={mockPlatform({
          state: 'archived',
          archivedAt: '2026-12-12T20:00:00.000Z',
        })}
        ours={ours}
      />,
    )
    const card = (
      await screen.findByRole('heading', { name: fixtures.PROJECT.name })
    ).closest('.mf-card')!
    expect(card.textContent).toContain(k.card.switchedOff('12 December'))
  })

  it('a switched-off app in the band: its questions alone, never a fall or a change that didn’t go live (the whole-branch review’s I1)', async () => {
    // Our server cannot see a switch-off (the watch closes 4401 first: S1, M4); the page can.
    const ours = oursWith({
      needs: async () => [
        { kind: 'down', app, from: AT, owner: true },
        { kind: 'change-failed', app, incidentId: 'inc-1', at: AT, owner: true },
        { kind: 'question', app, conversationId: 'c-1', title: 'Word count', since: AT },
      ],
      since: async () => ({ lastHere: null, lines: [] }),
    })
    render(
      <App
        platform={mockPlatform({
          state: 'archived',
          archivedAt: '2026-12-12T20:00:00.000Z',
        })}
        ours={ours}
      />,
    )
    const band = await screen.findByRole('region', { name: k.band.label })
    expect(band.textContent).toContain(k.band.question(fixtures.PROJECT.name))
    expect(band.textContent).not.toContain('can’t reach it')
    expect(band.textContent).not.toContain("can't reach it")
    expect(band.textContent).not.toContain(k.band.changeFailed(fixtures.PROJECT.name))
  })

  describe('F6 Task 11: switched off, on its card (moment 20)', () => {
    const s = k.switching
    const OFF = { state: 'archived' as const, archivedAt: '2026-12-12T20:00:00.000Z' }
    /** The app, switched off, and the person on it as `role`; what was asked, recorded. */
    function off(role: 'owner' | 'collaborator', launchedAt: string | null) {
      const asked: string[] = []
      const base = mockPlatform({ ...OFF, launchedAt })
      const platform: Platform = {
        ...base,
        listMembers: () =>
          Promise.resolve([{ ...fixtures.MEMBERS[0]!, userId: fixtures.ME.id, role }]),
        restoreProject: () => {
          asked.push('restoreProject')
          return Promise.resolve({ ...fixtures.PROJECT, launchedAt, state: 'active' })
        },
        mintToken: () => {
          asked.push('mintToken')
          return Promise.resolve(fixtures.MINTED_TOKEN)
        },
      }
      const ours = oursWith({
        needs: async () => [],
        since: async () => ({ lastHere: null, lines: [] }),
        keeping: async () => ({
          watching: false,
          until: null,
          tokenId: null,
          mine: false,
        }),
        handWatch: async () => ({ kept: 'new' as const }),
      })
      return { platform, ours, asked }
    }
    const card = async () =>
      (await screen.findByRole('heading', { name: fixtures.PROJECT.name })).closest(
        '.mf-card',
      ) as HTMLElement

    it('an owner: Switch it back on, no second sign-in, the watch minted; back, and Start it for your students on its Overview', async () => {
      const st = off('owner', '2026-09-20T17:00:00.000Z')
      render(<App platform={st.platform} ours={st.ours} />)
      const it_ = await card()
      const button = await within(it_).findByRole('button', { name: s.backOn })
      await act(async () => {
        fireEvent.click(button)
      })
      await waitFor(() => expect(st.asked).toEqual(['restoreProject', 'mintToken']))
      expect(it_.textContent).toContain(s.back)
      expect(it_.textContent).not.toContain(k.card.switchedOff('12 December'))
      expect(
        within(it_).getByRole('link', { name: s.students }).getAttribute('href'),
      ).toBe('/apps/mock-app')
      expect(machineryIn(wordsOnScreen())).toEqual([])
    })

    it('an owner, never live: It’s back. Your draft starts again…', async () => {
      const st = off('owner', null)
      render(<App platform={st.platform} ours={st.ours} />)
      const it_ = await card()
      await act(async () => {
        fireEvent.click(await within(it_).findByRole('button', { name: s.backOn }))
      })
      expect(await within(it_).findByText(s.backDraft)).toBeTruthy()
    })

    it('a helper: the date, and no button (Review Focus 5)', async () => {
      const st = off('collaborator', null)
      render(<App platform={st.platform} ours={st.ours} />)
      const it_ = await card()
      expect(it_.textContent).toContain(k.card.switchedOff('12 December'))
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(within(it_).queryByRole('button', { name: s.backOn })).toBeNull()
    })
  })

  it('an app no longer theirs on the platform (taken off it, our kept members stale): none of its needs or lines (the whole-branch review’s I2)', async () => {
    const gone = {
      projectId: '99999999-9999-4999-8999-999999999999',
      name: 'Old course app',
      slug: 'old-course-app',
    }
    const ours = oursWith({
      needs: async () => [
        { kind: 'down', app: gone, from: AT, owner: true },
        { kind: 'down', app, from: AT, owner: true },
      ],
      since: async () => ({
        lastHere: '2026-09-30T17:00:00.000Z',
        lines: [
          {
            id: 'e-gone',
            at: AT,
            happening: { kind: 'went-live', instanceId: 'i' },
            who: null,
            whom: null,
            app: gone,
          },
          {
            id: 'e1',
            at: AT,
            happening: { kind: 'went-live', instanceId: 'i' },
            who: null,
            whom: null,
            app,
          },
        ],
      }),
    })
    render(<App platform={mockPlatform()} ours={ours} />)
    const band = await screen.findByRole('region', { name: k.band.label })
    expect(band.textContent).toContain(fixtures.PROJECT.name)
    expect(band.textContent).not.toContain(gone.name)
    const since = await screen.findByRole('region', { name: k.since.title })
    expect(since.textContent).toContain(fixtures.PROJECT.name)
    expect(since.textContent).not.toContain(gone.name)
  })

  it('a failure of ours loses the band and the lines, never the page', async () => {
    const ours = oursWith({
      needs: () => Promise.reject(new Error('UNREACHABLE')),
      since: () => Promise.reject(new Error('UNREACHABLE')),
    })
    render(<App platform={mockPlatform()} ours={ours} />)
    expect(
      await screen.findByRole('heading', { name: fixtures.PROJECT.name }),
    ).toBeTruthy()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByRole('region', { name: k.band.label })).toBeNull()
    expect(screen.queryByRole('region', { name: k.since.title })).toBeNull()
  })

  it('/apps/:slug/history opens the app’s history', async () => {
    window.history.pushState({}, '', '/apps/mock-app/history')
    const ours = oursWith({
      history: async () => ({ from: '2026-09-18T16:00:00.000Z', gaps: [], lines: [] }),
    })
    render(<App platform={mockPlatform()} ours={ours} />)
    expect(
      await screen.findByRole('heading', { level: 1, name: k.history.title }),
    ).toBeTruthy()
    // The heading draws at once; the lines once our server answers.
    expect(await screen.findByText(k.history.from('18 September'))).toBeTruthy()
  })
})
