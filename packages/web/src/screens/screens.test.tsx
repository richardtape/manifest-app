// @vitest-environment jsdom
import { ManifestApiError, type Schemas } from '@manifest/contract'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app.js'
import { signInHref } from '../auth.js'
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
  answers: Partial<{ [K in keyof Platform]: () => Promise<unknown> }>,
): Platform {
  const never = () => new Promise<never>(() => undefined)
  return {
    getMe: (answers.getMe ?? never) as Platform['getMe'],
    listProjects: (answers.listProjects ?? never) as Platform['listProjects'],
    getProject: (answers.getProject ?? never) as Platform['getProject'],
    listInstances: (answers.listInstances ?? never) as Platform['listInstances'],
    getRelease: (answers.getRelease ?? never) as Platform['getRelease'],
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
    expect(document.title).toBe(words.signIn.tab)
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
    expect(document.title).toBe(words.shell.yourApps)
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
    expect(document.title).toBe(words.shell.manifest)
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
