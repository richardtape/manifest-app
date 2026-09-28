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
import { machineryIn } from './machinery.js'
import type { Platform } from '../platform/api.js'
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
    startIntakeSession: (answers.startIntakeSession ??
      never) as Platform['startIntakeSession'],
    endIntakeSession: (answers.endIntakeSession ?? never) as Platform['endIntakeSession'],
    checkSlug: (answers.checkSlug ?? never) as Platform['checkSlug'],
    listBlueprints: (answers.listBlueprints ?? never) as Platform['listBlueprints'],
    createProject: (answers.createProject ?? never) as Platform['createProject'],
    mintToken: (answers.mintToken ?? never) as Platform['mintToken'],
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
    expect(posts).toEqual(['/auth/logout'])
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
    texts.push(node.nodeValue ?? '')
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
        })}
      />,
    )
    expect(await screen.findByRole('heading', { name: 'Mock course app' })).toBeTruthy()
    expect(screen.queryByText('Not theirs')).toBeNull()
  })

  it('an address that never answered needs them, in words (Review Focus 4)', async () => {
    const environments = fixtures.PROJECT_EXPANDED.environments!.map((e) =>
      e.kind === 'production' ? { ...e, instance: fixtures.FAILED_INSTANCE } : e,
    )
    render(<App platform={mockPlatform({ environments })} />)
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
    expect(warned.flat().join(' ')).toMatch(/INTERNAL.*500|500.*INTERNAL/)
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

  it('an app’s name is a link, to a page that says it arrives next', async () => {
    render(<App platform={mockPlatform()} />)
    const name = await screen.findByRole('link', { name: 'Mock course app' })
    expect(name.getAttribute('href')).toBe('/apps/mock-app')
    await act(async () => {
      fireEvent.click(name)
    })
    expect(await screen.findByText(words.notFound.appPageNext)).toBeTruthy()
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
    await screen.findByText(words.notFound.appPageNext)
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
    [
      'an app’s page, not built yet',
      '/apps/mock-app',
      signedIn,
      words.notFound.appPageNext,
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
