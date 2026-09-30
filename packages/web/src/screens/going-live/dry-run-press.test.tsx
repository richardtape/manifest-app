// @vitest-environment jsdom
import { ManifestApiError, type Schemas } from '@manifest/contract'
import type { Conversation } from '@manifest-app/server/progress'
import { fixtures } from '@manifest/mock'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Ours, StreamSource } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import type { Then } from '../../router.js'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { mintRequest } from '../making/token.js'
import { DRY_RUN_POLL_MS, DRY_RUN_READS } from './dry-run.js'
import { GoingLive } from './going-live.js'

/**
 * MOMENT 12, THE DRY RUN, PRESSED (F5 Task 7, as Rich brought it back on 2026-09-30: *"Build it
 * now"*, after the platform's 4a let the owner run it and Spec action 8 gave it a second sign-in and
 * a take-down). *Going live* against a recording `Platform` and `Ours`: the person's own session
 * runs it, in the browser, and our server is only ever handed what it saw, for a fix.
 */
const g = words.goingLive
const TZ = 'America/Vancouver'
const NOW = new Date('2026-09-30T19:00:00.000Z')
const SLUG = 'reading-responses'
const PROJECT: Schemas['Project'] = {
  ...fixtures.PROJECT,
  name: 'Reading responses',
  slug: SLUG,
  launchedAt: null,
}
const CANDIDATE = fixtures.RELEASE
const withRehearsal = (
  state: Schemas['LaunchReadinessItem']['state'],
  more: Partial<Schemas['LaunchReadiness']> = {},
): Schemas['LaunchReadiness'] => ({
  ...fixtures.LAUNCH_READINESS,
  ready: false,
  candidateReleaseId: CANDIDATE.id,
  items: fixtures.LAUNCH_READINESS.items.map((i) =>
    i.id === 'rehearsal' ? { ...i, state } : i,
  ),
  ...more,
})
/** A version on trying-out, and the dry run not yet run: theirs to start. */
const UNMET = withRehearsal('unmet')
const MET = withRehearsal('met')
const PASSED: Schemas['Rehearsal'] = { ...fixtures.REHEARSAL, releaseId: CANDIDATE.id }
/** Never on screen, never sent: the platform's own words for why. */
const SENTINEL = 'SENTINEL-the-idp-released-1-of-2'
const FAILED: Schemas['Rehearsal'] = {
  ...PASSED,
  id: '66666666-6666-4666-8666-666666666666',
  passed: false,
  attributes: ['ubcEduCwlPuid', 'mail'],
  evidence: {
    ...PASSED.evidence,
    signInStatus: null,
    attributesReleased: ['mail'],
    reason: SENTINEL,
  },
}
const summary = (
  id: string,
  state: Schemas['Instance']['state'],
): Schemas['InstanceSummary'] => ({
  id,
  environmentId: fixtures.PRODUCTION_ID,
  releaseId: CANDIDATE.id,
  kind: 'web',
  state,
  lastSeenAt: null,
  createdAt: '2026-09-30T18:59:00.000Z',
  serving: false,
})
/** An earlier start on the live setup, failed, listed before the press. */
const OLD = summary('i-old', 'failed')
/** This dry run's own start, which failed. */
const NEW = summary('i-new', 'failed')
const INCIDENT: Schemas['Incident'] = {
  ...fixtures.INCIDENTS.incidents[0]!,
  id: '44444444-4444-4444-8444-444444444441',
  instanceId: NEW.id,
  createdAt: '2026-09-30T18:59:40.000Z',
}
const OLDER_INCIDENT: Schemas['Incident'] = {
  ...INCIDENT,
  id: '44444444-4444-4444-8444-444444444442',
  instanceId: OLD.id,
  createdAt: '2026-09-29T18:00:00.000Z',
}

const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'runRehearsal')
/** Our own deadline, as `AbortSignal.timeout` rejects `fetch` with it (platform/api.ts). */
const ourDeadline = () => new DOMException('The operation timed out.', 'TimeoutError')
const never = () => new Promise<never>(() => undefined)

class FakeSource implements StreamSource {
  readyState = 0
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  close() {
    this.readyState = 2
  }
}

type World = {
  readiness: Schemas['LaunchReadiness']
  production: Schemas['InstanceSummary'][]
  incidents: Schemas['Incident'][]
  /** The dry run's fix already under way, by its conversation's id. */
  fix: string | null
}

function stage(start: Partial<World> = {}) {
  const world: World = {
    readiness: UNMET,
    production: [OLD],
    incidents: [OLDER_INCIDENT],
    fix: null,
    ...start,
  }
  const calls: [string, ...unknown[]][] = []
  const ours: [string, ...unknown[]][] = []
  const runs: {
    resolve: (r: Schemas['Rehearsal']) => void
    reject: (e: unknown) => void
  }[] = []
  const record =
    <T,>(name: string, value: (...args: never[]) => T) =>
    (...args: never[]) => {
      calls.push([name, ...args])
      return Promise.resolve(value(...args))
    }
  const platform: Platform = {
    getMe: () => Promise.resolve(fixtures.ME),
    listProjects: never,
    getProject: never,
    getRelease: record('getRelease', () => CANDIDATE),
    listEnvironments: record('listEnvironments', () => fixtures.ENVIRONMENTS),
    listInstances: record('listInstances', (environmentId: string) => ({
      environmentId,
      instances: environmentId === fixtures.PRODUCTION_ID ? world.production : [],
      truncated: false,
    })),
    listIncidents: record('listIncidents', (environmentId: string) => ({
      environmentId,
      incidents: environmentId === fixtures.PRODUCTION_ID ? world.incidents : [],
    })),
    getLaunchReadiness: record('getLaunchReadiness', () => world.readiness),
    getLaunchRecords: record('getLaunchRecords', () => fixtures.LAUNCH_RECORDS),
    getApproval: record('getApproval', () => fixtures.APPROVAL),
    getEnvironment: never,
    startIntakeSession: never,
    endIntakeSession: never,
    checkSlug: never,
    listBlueprints: never,
    createProject: never,
    mintToken: record(
      'mintToken',
      () =>
        ({ token: { id: 't-fix' }, secret: 'mft_test_fix' }) as Schemas['MintedToken'],
    ),
    watchProject: () => ({ ready: never(), close: () => undefined }),
    deploy: never,
    runRehearsal: (projectId, key) => {
      calls.push(['runRehearsal', projectId, key])
      return new Promise((resolve, reject) => runs.push({ resolve, reject }))
    },
    listAppSecrets: never,
    setAppSecret: never,
  }
  const theirs: Ours = {
    startConversation: never,
    readConversation: never,
    handIntakeKey: never,
    intake: never,
    names: never,
    blueprint: never,
    handProject: never,
    plan: never,
    correct: never,
    agree: never,
    build: never,
    message: never,
    answer: never,
    stop: never,
    startChange: (...args) => {
      ours.push(['startChange', ...args])
      return Promise.resolve({ id: 'c-fix' } as Conversation)
    },
    conversationsOn: () => Promise.resolve([]),
    conversationFor: () => Promise.resolve(null),
    askedSecrets: () => Promise.resolve([]),
    fixFor: (...args) => {
      ours.push(['fixFor', ...args])
      return Promise.resolve(null)
    },
    fixForDryRun: (...args) => {
      ours.push(['fixForDryRun', ...args])
      return Promise.resolve(world.fix === null ? null : { id: world.fix })
    },
    agreedRows: () => Promise.resolve(null),
    changeForRefusal: () => Promise.resolve(null),
    events: () => new FakeSource(),
  }
  const called = (name: string) =>
    calls.filter((c) => c[0] === name).map((c) => c.slice(1))
  /** The dry run's own answer, to the press waiting on it. */
  const answer = (rehearsal: Schemas['Rehearsal']) =>
    act(async () => {
      runs.at(-1)!.resolve(rehearsal)
    })
  const refuse = (error: unknown) =>
    act(async () => {
      runs.at(-1)!.reject(error)
    })
  return { world, platform, ours: theirs, oursCalls: ours, called, answer, refuse }
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
})

async function open(s: Stage, then: Then = null) {
  window.history.pushState(
    {},
    '',
    `/apps/${SLUG}/going-live${then === null ? '' : `?then=${then}`}`,
  )
  render(
    <GoingLive
      platform={s.platform}
      ours={s.ours}
      project={PROJECT}
      expire={() => undefined}
      now={() => NOW}
      timeZone={TZ}
      then={then}
    />,
  )
  return row()
}
/** The dry run's row, once the page has read its checklist. */
const row = async () =>
  (await screen.findByText('A dry run on the live setup')).closest('li')!
/**
 * Every promise queued so far, settled: `waitFor` polls with `setInterval`, which these tests fake,
 * so it re-checks only when the page changes, and a call made after an async read changes nothing.
 */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
const runButton = (li: HTMLElement) =>
  within(li).getByRole('button', { name: 'Run the dry run' })
const press = async (s: Stage, then: Then = null) => {
  const li = await open(s, then)
  fireEvent.click(runButton(li))
  await settle()
  expect(s.called('runRehearsal')).toHaveLength(1)
  return li
}

describe('the dry run, yours to start (F5 Task 7, FE-42 (a))', () => {
  it('a version on trying-out, not yet run: needs you, its sentence, whose it is, and [Run the dry run]', async () => {
    const li = await open(stage())
    expect(within(li).getByText('Needs you')).toBeTruthy()
    expect(
      within(li).getByText(
        'We put it up with nobody watching, check it answers and signs someone in, then take it down.',
      ),
    ).toBeTruthy()
    expect(within(li).getByText('you start it; minutes')).toBeTruthy()
    expect(runButton(li)).toBeTruthy()
  })

  it('the press sends one runRehearsal for this project with its own Idempotency-Key; while it runs: working, its words, you can leave, and nothing to press', async () => {
    const s = stage()
    const li = await press(s)
    const [[projectId, key]] = s.called('runRehearsal') as [[string, string]]
    expect(projectId).toBe(PROJECT.id)
    expect(key.length).toBeGreaterThanOrEqual(8)
    expect(within(li).getByText('Working')).toBeTruthy()
    expect(
      within(li).getByText(
        'Putting it up with nobody watching, signing someone in, taking it down.',
      ),
    ).toBeTruthy()
    expect(within(li).getByText('You can leave: it carries on.')).toBeTruthy()
    expect(within(li).queryAllByRole('button')).toEqual([])
    expect(within(li).queryByRole('list')).toBeNull()
  })

  it('passed: done, in the walk-through’s words, and the page reads the checklist again', async () => {
    const s = stage()
    const li = await press(s)
    const before = s.called('getLaunchReadiness').length
    s.world.readiness = MET
    await s.answer(PASSED)
    expect(
      within(li).getByText('Done. It answered and signed someone in on the live setup.'),
    ).toBeTruthy()
    await settle()
    expect(s.called('getLaunchReadiness').length).toBeGreaterThan(before)
    expect(within(await row()).queryAllByRole('button')).toEqual([])
  })

  it('it signed nobody in: needs you, in one sentence, and [Fix it]; the platform’s reason is never shown', async () => {
    const s = stage()
    const li = await press(s)
    await s.answer(FAILED)
    expect(within(li).getByText('Needs you')).toBeTruthy()
    expect(
      within(li).getByText('It didn’t sign anyone in on the live setup.'),
    ).toBeTruthy()
    expect(within(li).getByRole('button', { name: 'Fix it' })).toBeTruthy()
    expect(document.body.textContent).not.toContain(SENTINEL)
  })

  it('[Fix it] mints a token named for the fix, starts it with what the dry run saw and never its reason, then opens it', async () => {
    const s = stage()
    const li = await press(s)
    await s.answer(FAILED)
    fireEvent.click(within(li).getByRole('button', { name: 'Fix it' }))
    await settle()
    expect(s.oursCalls[0]).toEqual(['fixForDryRun', PROJECT.id, FAILED.id])
    expect(s.called('mintToken')).toEqual([
      [
        PROJECT.id,
        mintRequest("The dry run didn't sign anyone in", 'changing'),
        expect.any(String),
      ],
    ])
    expect(s.oursCalls[1]).toEqual([
      'startChange',
      PROJECT.id,
      {
        fix: {
          dryRun: {
            rehearsalId: FAILED.id,
            signInStatus: null,
            attributesReleased: ['mail'],
            attributesAsked: ['ubcEduCwlPuid', 'mail'],
          },
        },
        token: 'mft_test_fix',
      },
    ])
    expect(JSON.stringify(s.oursCalls)).not.toContain(SENTINEL)
    expect(window.location.pathname).toBe(`/apps/${SLUG}/conversations/c-fix`)
  })

  it('[Fix it] with one already under way: opens it, and mints nothing', async () => {
    const s = stage({ fix: 'c-under' })
    const li = await press(s)
    await s.answer(FAILED)
    fireEvent.click(within(li).getByRole('button', { name: 'Fix it' }))
    await settle()
    expect(window.location.pathname).toBe(`/apps/${SLUG}/conversations/c-under`)
    expect(s.called('mintToken')).toEqual([])
    expect(s.oursCalls.filter((c) => c[0] === 'startChange')).toEqual([])
  })

  it('a second sign-in asked (Spec action 8 (b)): the card in place, back to this page to run it, and nothing else to press', async () => {
    const s = stage()
    const li = await press(s)
    await s.refuse(refused(403, 'STEP_UP_REQUIRED'))
    const card = within(li).getByRole('alert')
    expect(within(card).getByText('Sign in once more')).toBeTruthy()
    const again = within(card).getByRole('link', { name: 'Sign in again' })
    expect(decodeURIComponent(again.getAttribute('href')!)).toContain(
      `returnTo=/apps/${SLUG}/going-live?then=dry-run`,
    )
    expect(within(li).queryByRole('button', { name: 'Run the dry run' })).toBeNull()
  })

  it('back from signing in again: said once, beside the same button, and the address loses its ?then', async () => {
    const s = stage()
    const li = await open(s, 'dry-run')
    expect(within(li).getByText('You’re signed in again.')).toBeTruthy()
    await settle()
    expect(window.location.search).toBe('')
    fireEvent.click(runButton(li))
    await settle()
    expect(s.called('runRehearsal')).toHaveLength(1)
    expect(within(li).queryByText('You’re signed in again.')).toBeNull()
  })

  it('back from signing in to let students in is not the dry run’s: nothing said on its row', async () => {
    const li = await open(stage(), 'live')
    expect(within(li).queryByText('You’re signed in again.')).toBeNull()
  })

  it('nothing on trying-out by the press (REHEARSAL_NO_CANDIDATE): the page reads again, and the row says so', async () => {
    const s = stage()
    await press(s)
    s.world.readiness = withRehearsal('unmet', { candidateReleaseId: null })
    await s.refuse(refused(409, 'REHEARSAL_NO_CANDIDATE'))
    expect(
      await within(await row()).findByText(
        'Once a version is on your trying-out address.',
      ),
    ).toBeTruthy()
  })

  it('launched meanwhile (REHEARSAL_LAUNCHED): the page reads again, and hears it', async () => {
    const s = stage()
    await press(s)
    s.world.readiness = withRehearsal('unmet', { launched: true })
    await s.refuse(refused(409, 'REHEARSAL_LAUNCHED'))
    expect(await screen.findByText(g.live)).toBeTruthy()
  })

  it('it did not start on the live setup (REHEARSAL_DEPLOY_FAILED): needs you, and [What went wrong] fed by this attempt’s incident, never an older one (Review Focus 4)', async () => {
    const s = stage()
    const li = await press(s)
    s.world.production = [OLD, NEW]
    s.world.incidents = [OLDER_INCIDENT, INCIDENT]
    await s.refuse(refused(409, 'REHEARSAL_DEPLOY_FAILED'))
    expect(await within(li).findByText('It didn’t start on the live setup.')).toBeTruthy()
    fireEvent.click(await within(li).findByRole('button', { name: 'What went wrong' }))
    await settle()
    expect(s.oursCalls.find((c) => c[0] === 'startChange')).toEqual([
      'startChange',
      PROJECT.id,
      {
        fix: { incidentId: INCIDENT.id, environment: 'production' },
        token: 'mft_test_fix',
      },
    ])
  })

  it('our deadline cut the wait, not the dry run (Review Focus 3): said so, never that it failed, and the checklist read until the item moves', async () => {
    const s = stage()
    const li = await press(s)
    await s.refuse(ourDeadline())
    const said = within(li).getByRole('status')
    expect(said.textContent).toBe(
      'We stopped waiting, but it may still finish. This row updates when it does.',
    )
    expect(li.textContent).not.toMatch(/didn’t|nothing happened/i)
    const reads = s.called('getLaunchReadiness').length
    await act(async () => {
      vi.advanceTimersByTime(DRY_RUN_POLL_MS)
    })
    await settle()
    expect(s.called('getLaunchReadiness').length).toBe(reads + 1)
    expect(within(li).getByRole('status')).toBeTruthy()
    s.world.readiness = MET
    await act(async () => {
      vi.advanceTimersByTime(DRY_RUN_POLL_MS)
    })
    expect(
      await within(await row()).findByText(
        'Done. It answered and signed someone in on the live setup.',
      ),
    ).toBeTruthy()
  })

  it('our deadline, and the item never moves: after its reads, said, and the button again', async () => {
    const s = stage()
    const li = await press(s)
    await s.refuse(ourDeadline())
    for (let i = 0; i < DRY_RUN_READS; i += 1)
      await act(async () => {
        vi.advanceTimersByTime(DRY_RUN_POLL_MS)
      })
    expect(
      await within(li).findByText('We couldn’t see how it ended. You can run it again.'),
    ).toBeTruthy()
    expect(runButton(li)).toBeTruthy()
  })

  it('it ran, and was not taken down again (the platform’s 5b): run it again', async () => {
    const s = stage()
    const li = await press(s)
    await s.refuse(refused(409, 'REHEARSAL_TEARDOWN_FAILED'))
    expect(
      await within(li).findByText(
        'It ran, but didn’t finish taking itself down. Run it again.',
      ),
    ).toBeTruthy()
    expect(runButton(li)).toBeTruthy()
  })

  it('a refusal we did not foresee: we couldn’t, with a reference, and the button again', async () => {
    const s = stage()
    const li = await press(s)
    await s.refuse(refused(500, 'INTERNAL'))
    const alert = await within(li).findByRole('alert')
    expect(alert.textContent).toContain("We couldn't do that just now. Nothing is lost.")
    expect(runButton(li)).toBeTruthy()
  })

  it('no word of machinery, and never the platform’s name for it, in any of its states (C3)', async () => {
    const seen: string[] = []
    const through = async (end: (s: Stage) => Promise<unknown>) => {
      const s = stage()
      const li = await press(s)
      seen.push(li.textContent ?? '')
      await end(s)
      seen.push((await row()).textContent ?? '')
      cleanup()
    }
    await through((s) => s.answer(PASSED))
    await through((s) => s.answer(FAILED))
    await through((s) => s.refuse(ourDeadline()))
    await through((s) => s.refuse(refused(409, 'REHEARSAL_DEPLOY_FAILED')))
    await through((s) => s.refuse(refused(409, 'REHEARSAL_TEARDOWN_FAILED')))
    for (const said of seen) {
      expect(machineryIn(said), said).toEqual([])
      expect(said, said).not.toMatch(/rehears|staging|production|release|SENTINEL/i)
    }
  })
})
