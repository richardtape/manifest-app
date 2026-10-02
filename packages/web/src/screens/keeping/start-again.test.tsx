// @vitest-environment jsdom
import { ManifestApiError, type Schemas } from '@manifest/contract'
import type { Conversation } from '@manifest-app/server/progress'
import { fixtures } from '@manifest/mock'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stepUpHref } from '../../auth.js'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { mintRequest } from '../making/token.js'
import { StartItAgain, WhatHappened } from './start-again.js'

/**
 * F6 TASK 10: *START IT AGAIN* AND *WHAT HAPPENED?* (moment 19, design §4), against a recording
 * `Platform` and `Ours`, `setInterval` faked. **Everything that reaches the students' address is
 * the person's own session, in the browser**: the version their address was serving, read at the
 * press, deployed again; trying-out first when it has moved on and they choose so. Our server is
 * asked only for the outage's fix.
 */
const s = words.keeping.startAgain
const b = words.keeping.band
const t = words.tryingOut
const TZ = 'America/Vancouver'
/** Noon on 1 October in Vancouver. */
const NOW = new Date('2026-10-01T19:00:00.000Z')
const SLUG = 'reading-responses'
const PROJECT: Schemas['Project'] = {
  ...fixtures.PROJECT,
  name: 'Reading responses',
  slug: SLUG,
  launchedAt: '2026-09-20T17:00:00.000Z',
}
const ID = {
  sandbox: '33333333-3333-4333-8333-333333333331',
  staging: '33333333-3333-4333-8333-333333333332',
  production: '33333333-3333-4333-8333-333333333333',
} as const
type Kind = keyof typeof ID
const release = (id: string, createdAt: string): Schemas['Release'] => ({
  ...fixtures.RELEASE,
  id,
  createdAt,
})
/** What the students' address was serving: 18 September, 3:12pm. */
const THEIRS = release('55555555-5555-4555-8555-555555555551', '2026-09-18T22:12:00.000Z')
/** Put on trying-out since: 30 September, 10:40am. */
const NEWER = release('55555555-5555-4555-8555-555555555552', '2026-09-30T17:40:00.000Z')
/** Read at the press, never at the page's load: put live by someone else meanwhile. */
const SINCE = release('55555555-5555-4555-8555-555555555553', '2026-10-01T16:00:00.000Z')
const RELEASES = [THEIRS, NEWER, SINCE]
const instance = (
  kind: Kind,
  releaseId: string,
  id = `i-${kind}`,
  state: Schemas['Instance']['state'] = 'healthy',
): Schemas['Instance'] => ({
  id,
  environmentId: ID[kind],
  releaseId,
  kind: 'web',
  state,
  lastSeenAt: '2026-10-01T18:00:00.000Z',
  createdAt: '2026-10-01T18:00:00.000Z',
})
const environment = (
  kind: Kind,
  serving: Schemas['Instance'] | null,
): Schemas['Environment'] => ({
  id: ID[kind],
  projectId: PROJECT.id,
  kind,
  hostname:
    kind === 'production'
      ? `${SLUG}.manifest.internal`
      : `${SLUG}.${kind}.manifest.internal`,
  url: `https://${kind === 'production' ? `${SLUG}.manifest.internal` : `${SLUG}.${kind}.manifest.internal`}`,
  instance: serving,
})
const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'test')
const never = () => new Promise<never>(() => undefined)

/** How a deploy answers: its instance's end, a refusal, or nothing yet. */
type Answer = 'healthy' | 'failed' | 'never' | { code: string; status: number }

type World = {
  production: string
  staging: string
  /** Each deploy's answer, in turn; the last one stands for any after it. */
  deploys: Answer[]
  /** This attempt's incident, by its instance (listIncidents). */
  incident: Schemas['Incident'] | null
}

function stage(world: Partial<World> = {}) {
  const w: World = {
    production: THEIRS.id,
    staging: THEIRS.id,
    deploys: ['healthy'],
    incident: null,
    ...world,
  }
  const calls: [string, ...unknown[]][] = []
  const record =
    <A extends unknown[], T>(name: string, value: (...args: A) => T | Promise<T>) =>
    (...args: A): Promise<T> => {
      calls.push([name, ...args])
      return Promise.resolve(value(...args))
    }
  const environments = () => [
    environment('sandbox', null),
    environment('staging', instance('staging', w.staging)),
    environment('production', instance('production', w.production)),
  ]
  let deployed = 0
  const platform: Platform = {
    getMe: () => Promise.resolve(fixtures.ME),
    listProjects: never,
    getProject: never,
    getRelease: record('getRelease', (id: string) => {
      const found = RELEASES.find((r) => r.id === id)
      if (found === undefined) throw refused(404, 'NOT_FOUND')
      return found
    }),
    listEnvironments: record('listEnvironments', () => environments()),
    getEnvironment: record('getEnvironment', (id: string) =>
      environments().find((e) => e.id === id)!,
    ),
    listInstances: record('listInstances', (environmentId: string) => ({
      environmentId,
      instances: [],
      truncated: false,
    })),
    listIncidents: record('listIncidents', (environmentId: string) => ({
      environmentId,
      incidents: w.incident === null ? [] : [w.incident],
    })),
    deploy: (environmentId: string, releaseId: string, key: string) => {
      calls.push(['deploy', environmentId, releaseId, key])
      const answer = w.deploys[Math.min(deployed, w.deploys.length - 1)]!
      deployed += 1
      if (answer === 'never') return never()
      if (typeof answer === 'object')
        return Promise.reject(refused(answer.status, answer.code))
      return Promise.resolve(
        instance(
          environmentId === ID.production ? 'production' : 'staging',
          releaseId,
          `i-new-${deployed}`,
          answer,
        ),
      )
    },
    mintToken: record('mintToken', () => ({
      ...fixtures.MINTED_TOKEN,
      secret: 'mft_test_x_the_outage_fix',
    })),
    runRehearsal: never,
    getLaunchReadiness: never,
    getLaunchRecords: never,
    getApproval: never,
    startIntakeSession: never,
    endIntakeSession: never,
    checkSlug: never,
    listBlueprints: never,
    createProject: never,
    listAppSecrets: never,
    setAppSecret: never,
    listMembers: never,
    revokeToken: never,
    archiveProject: never,
    restoreProject: never,
    deleteProject: never,
    watchProject: () => ({ ready: never(), close: () => undefined }),
  }
  const oursCalls: [string, ...unknown[]][] = []
  let under: string | null = null
  const ours = {
    fixForOutage: (...args: unknown[]) => {
      oursCalls.push(['fixForOutage', ...args])
      return Promise.resolve(under === null ? null : { id: under })
    },
    startChange: (...args: unknown[]) => {
      oursCalls.push(['startChange', ...args])
      return Promise.resolve({ id: 'c-outage' } as Conversation)
    },
  } as unknown as Ours
  const called = (name: string) =>
    calls.filter((c) => c[0] === name).map((c) => c.slice(1))
  return {
    world: w,
    platform,
    ours,
    oursCalls,
    called,
    calls,
    underWay: (id: string) => {
      under = id
    },
  }
}
type Stage = ReturnType<typeof stage>

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 204 })),
  )
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.history.pushState({}, '', '/')
})

/** Every promise queued so far, settled (`waitFor` polls with the `setInterval` faked here). */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
function draw(st: Stage, arrived = false, onDone = () => undefined) {
  render(
    <StartItAgain
      platform={st.platform}
      ours={st.ours}
      project={PROJECT}
      arrived={arrived}
      onDone={onDone}
      expire={() => undefined}
      now={() => NOW}
      timeZone={TZ}
    />,
  )
}
const button = (name: string | RegExp) => screen.getByRole('button', { name })
const press = async (name: string | RegExp = b.startAgain) => {
  fireEvent.click(button(name))
  await settle()
}
const text = () => document.body.textContent ?? ''

describe('[Start it again] (F6 Task 10, design §4)', () => {
  it('reads the live address AT THE PRESS and deploys exactly the version it was serving there, with an Idempotency-Key', async () => {
    const st = stage({ deploys: ['never'] })
    draw(st)
    await settle()
    // Nothing is read or sent before the press.
    expect(st.calls).toEqual([])
    // Someone put another version live after the page was drawn: that one is what goes back up.
    st.world.production = SINCE.id
    await press()
    const deploys = st.called('deploy')
    expect(deploys).toHaveLength(1)
    const [environmentId, releaseId, key] = deploys[0] as [string, string, string]
    expect([environmentId, releaseId]).toEqual([ID.production, SINCE.id])
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('while it starts: the stations, named, and nobody has lost anything', async () => {
    const st = stage({ deploys: ['never'] })
    draw(st)
    await press()
    expect(screen.getByRole('region', { name: s.stationsLabel })).toBeTruthy()
    expect(text()).toContain(s.nobodyLost)
    expect(screen.queryByRole('button', { name: b.startAgain })).toBeNull()
    expect(machineryIn(text())).toEqual([])
  })

  it('it answers: It’s answering again, and the page is told', async () => {
    const st = stage()
    const onDone = vi.fn()
    draw(st, false, onDone)
    await press()
    expect(text()).toContain(s.landed)
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(machineryIn(text())).toEqual([])
  })

  it('it never answered: F5’s words, and [What went wrong] with this attempt’s incident', async () => {
    const st = stage({
      deploys: ['failed'],
      incident: {
        ...fixtures.INCIDENTS.incidents[0]!,
        id: '44444444-4444-4444-8444-444444444441',
        instanceId: 'i-new-1',
        createdAt: '2026-10-01T18:56:00.000Z',
      },
    })
    draw(st)
    await press()
    expect(text()).toContain(words.preview.facts.failed('4 minutes ago'))
    expect(button(t.whatWentWrong)).toBeTruthy()
    expect(text()).not.toContain(s.landed)
    expect(machineryIn(text())).toEqual([])
  })

  it('a second sign-in asked: F5’s card, back to the Overview with then=start-again; nothing pressed by itself', async () => {
    const st = stage({ deploys: [{ status: 403, code: 'STEP_UP_REQUIRED' }] })
    draw(st)
    await press()
    const card = screen.getByRole('alert')
    expect(card.textContent).toContain(t.stepUp.title)
    expect(card.textContent).toContain(words.goingLive.letIn.stepUpRule)
    expect(
      within(card).getByRole('link', { name: t.stepUp.again }).getAttribute('href'),
    ).toBe(stepUpHref(`/apps/${SLUG}?then=start-again`))
  })

  it('back from signing in again: You’re signed in again, and the same button; nothing sent until it is pressed', async () => {
    const st = stage()
    draw(st, true)
    await settle()
    expect(text()).toContain(words.goingLive.letIn.again)
    expect(button(b.startAgain)).toBeTruthy()
    expect(st.called('deploy')).toEqual([])
    await press()
    expect(st.called('deploy')).toHaveLength(1)
    expect(text()).not.toContain(words.goingLive.letIn.again)
  })

  it('any other refusal: F5’s words, with a reference, and the button again', async () => {
    const st = stage({ deploys: [{ status: 500, code: 'INTERNAL' }] })
    draw(st)
    await press()
    expect(screen.getByRole('alert').textContent).toContain(t.couldnt)
    expect(button(b.startAgain)).toBeTruthy()
  })

  it('switched off meanwhile (PROJECT_ARCHIVED, Task 11): said the same way as everywhere, no reference', async () => {
    const st = stage({ deploys: [{ status: 409, code: 'PROJECT_ARCHIVED' }] })
    draw(st)
    await press()
    expect(screen.getByRole('alert').textContent).toBe(
      words.refused.archived(PROJECT.name),
    )
  })

  it('the gate refused it (a sign-off or a checklist item): said, with Going live', async () => {
    const st = stage({ deploys: [{ status: 409, code: 'RELEASE_DIGEST_NOT_APPROVED' }] })
    draw(st)
    await press()
    expect(text()).toContain(s.gate)
    expect(
      screen.getByRole('link', { name: b.goingLiveButton }).getAttribute('href'),
    ).toBe(`/apps/${SLUG}/going-live`)
  })
})

describe('trying-out has moved on: RELEASE_NOT_STAGED (design §4)', () => {
  const NOT_STAGED = { status: 409, code: 'RELEASE_NOT_STAGED' }

  it('asks, naming both versions by their day', async () => {
    const st = stage({ staging: NEWER.id, deploys: [NOT_STAGED] })
    draw(st)
    await press()
    expect(text()).toContain(s.newer('30 September, 10:40am', '18 September, 3:12pm'))
    expect(button(s.startNewer)).toBeTruthy()
    expect(button(s.putBack('18 September'))).toBeTruthy()
    expect(machineryIn(text())).toEqual([])
  })

  it('[Start the newer one] sends trying-out’s version to the students’ address', async () => {
    const st = stage({ staging: NEWER.id, deploys: [NOT_STAGED, 'healthy'] })
    draw(st)
    await press()
    await press(s.startNewer)
    expect(st.called('deploy').map(([env, rel]) => [env, rel])).toEqual([
      [ID.production, THEIRS.id],
      [ID.production, NEWER.id],
    ])
    expect(text()).toContain(s.landed)
  })

  it('[Put <day>’s back first] puts theirs on trying-out, waits for its end, then on the students’ address', async () => {
    const st = stage({ staging: NEWER.id, deploys: [NOT_STAGED, 'never'] })
    draw(st)
    await press()
    await press(s.putBack('18 September'))
    // Trying-out first; the students' address waits for its end.
    expect(st.called('deploy').map(([env, rel]) => [env, rel])).toEqual([
      [ID.production, THEIRS.id],
      [ID.staging, THEIRS.id],
    ])
    expect(screen.getByRole('region', { name: t.stationsLabel })).toBeTruthy()
    expect(text()).toContain(s.nobodyLost)
  })

  it('…and once trying-out answers, the students’ address, with the second sign-in if asked', async () => {
    const st = stage({
      staging: NEWER.id,
      deploys: [NOT_STAGED, 'healthy', { status: 403, code: 'STEP_UP_REQUIRED' }],
    })
    draw(st)
    await press()
    await press(s.putBack('18 September'))
    expect(st.called('deploy').map(([env, rel]) => [env, rel])).toEqual([
      [ID.production, THEIRS.id],
      [ID.staging, THEIRS.id],
      [ID.production, THEIRS.id],
    ])
    expect(
      within(screen.getByRole('alert'))
        .getByRole('link', { name: t.stepUp.again })
        .getAttribute('href'),
    ).toBe(stepUpHref(`/apps/${SLUG}?then=start-again`))
  })
})

describe('[What happened?] (design §4: an outage’s own fix)', () => {
  const FROM = '2026-10-01T17:03:00.000Z'
  const TO = '2026-10-01T17:07:00.000Z'
  function drawIt(st: Stage) {
    render(
      <WhatHappened
        platform={st.platform}
        ours={st.ours}
        project={PROJECT}
        from={FROM}
        to={TO}
        expire={() => undefined}
      />,
    )
  }

  it('mints a conversation’s token, starts the outage’s fix with its two moments, and opens it', async () => {
    const st = stage()
    drawIt(st)
    await press(b.whatHappened)
    expect(st.called('mintToken')).toEqual([
      [
        PROJECT.id,
        mintRequest(words.keeping.whatHappened.fixTitle, 'changing'),
        expect.any(String),
      ],
    ])
    expect(st.oursCalls).toEqual([
      ['fixForOutage', PROJECT.id, FROM],
      [
        'startChange',
        PROJECT.id,
        { fix: { outage: { from: FROM, to: TO } }, token: 'mft_test_x_the_outage_fix' },
      ],
    ])
    expect(window.location.pathname).toBe(`/apps/${SLUG}/conversations/c-outage`)
  })

  it('pressed again, the fix already under way is opened: nothing minted, nothing started', async () => {
    const st = stage()
    st.underWay('c-earlier')
    drawIt(st)
    await press(b.whatHappened)
    expect(st.called('mintToken')).toEqual([])
    expect(st.oursCalls).toEqual([['fixForOutage', PROJECT.id, FROM]])
    expect(window.location.pathname).toBe(`/apps/${SLUG}/conversations/c-earlier`)
  })
})
