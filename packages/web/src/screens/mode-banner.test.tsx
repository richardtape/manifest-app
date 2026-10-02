// @vitest-environment jsdom
import { ManifestApiError, type Schemas } from '@manifest/contract'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app.js'
import type { Mode } from '../mode.js'
import type { Ours, StreamSource } from '../ours/api.js'
import type { Platform } from '../platform/api.js'
import { words } from '../words.js'

/**
 * MOCK MODE SAYS SO, ON EVERY PAGE (F5 Task 3; Rich, 2026-09-29: "make it more obvious when
 * we are in mock mode"). On 2026-09-29 Rich signed in on the real platform through
 * app.manifest.internal and met our server in mock mode, and nothing on the page said so. The
 * banner is first on the page, in words (a note, not a colour), signed in or not; in edge
 * mode it is nowhere.
 */
const ME: Schemas['Me'] = {
  id: '11111111-1111-4111-8111-111111111111',
  puid: 'ins000001',
  displayName: 'Instructor One',
  email: 'instructor@example.test',
  role: 'member',
  mayBuild: true,
}

const never = () => new Promise<never>(() => undefined)

function platform(getMe: Platform['getMe']): Platform {
  return {
    getMe,
    listProjects: () => Promise.resolve([]),
    getProject: never,
    getRelease: never,
    listEnvironments: never,
    listInstances: never,
    listIncidents: never,
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
    getLaunchReadiness: never,
    getLaunchRecords: never,
    getApproval: never,
    getEnvironment: never,
    listMembers: never,
    revokeToken: never,
    archiveProject: never,
    restoreProject: never,
    deleteProject: never,
    watchProject: () => ({ ready: never(), close: () => undefined }),
  }
}

/** Our API, asked nothing it answers: a conversation's page stays as it first draws. */
const OURS = new Proxy({} as Ours, {
  get: (_, key) =>
    key === 'then'
      ? undefined
      : key === 'events'
        ? (): StreamSource => ({
            readyState: 0,
            onmessage: null,
            onerror: null,
            close: () => undefined,
          })
        : never,
})

const SITUATIONS: {
  name: string
  path: string
  getMe: Platform['getMe']
  /** What says the page has drawn; none while we ask who is here. */
  drawn?: () => Promise<unknown>
}[] = [
  { name: 'while we ask who is here', path: '/', getMe: never },
  {
    name: 'signed out, the sign-in page',
    path: '/',
    getMe: () =>
      Promise.reject(
        new ManifestApiError(
          401,
          { error: { code: 'UNAUTHENTICATED', message: 'x' } } as never,
          'test',
        ),
      ),
    drawn: () => screen.findByRole('heading', { name: words.signIn.hero }),
  },
  {
    name: 'Manifest out of reach',
    path: '/',
    getMe: () => Promise.reject(new TypeError('fetch failed')),
    drawn: () => screen.findByText(words.unreachable.body),
  },
  {
    name: 'signed in, Your apps',
    path: '/',
    getMe: () => Promise.resolve(ME),
    drawn: () => screen.findByRole('navigation', { name: 'Manifest' }),
  },
  {
    name: 'signed in, a conversation',
    path: '/new/conversation-1',
    getMe: () => Promise.resolve(ME),
    drawn: () => screen.findByRole('navigation', { name: 'Manifest' }),
  },
]

function show(situation: (typeof SITUATIONS)[number], mode?: Mode) {
  window.history.pushState({}, '', situation.path)
  return render(
    <App
      platform={platform(situation.getMe)}
      ours={OURS}
      {...(mode === undefined ? {} : { mode })}
    />,
  )
}

beforeEach(() => window.history.pushState({}, '', '/'))
afterEach(cleanup)

describe('in mock mode', () => {
  it.each(SITUATIONS)('$name: the banner is first on the page, in words', async (s) => {
    const { container } = show(s, 'mock')
    await s.drawn?.()

    const note = screen.getByRole('note')
    expect(note.textContent).toBe(words.mockMode.banner)
    // First: the page's words begin with it, above the skip link and everything else.
    expect(container.textContent?.startsWith(words.mockMode.banner)).toBe(true)
  })
})

describe('in edge mode', () => {
  it.each(SITUATIONS)('$name: there is no banner', async (s) => {
    show(s, 'edge')
    await s.drawn?.()

    expect(screen.queryByRole('note')).toBeNull()
    expect(screen.queryByText(words.mockMode.banner)).toBeNull()
  })

  it('is the mode when nothing says otherwise (Vitest defines none)', async () => {
    show(SITUATIONS[3]!)
    await SITUATIONS[3]!.drawn?.()

    expect(screen.queryByText(words.mockMode.banner)).toBeNull()
  })
})
