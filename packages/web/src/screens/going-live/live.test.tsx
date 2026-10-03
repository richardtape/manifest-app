// @vitest-environment jsdom
import { ManifestApiError, type Schemas } from '@manifest/contract'
import type { Conversation } from '@manifest-app/server/progress'
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
import type { Ours, StreamSource } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { mintRequest } from '../making/token.js'

/**
 * MOMENT 14, PUTTING IT LIVE (F5 Task 10, Decision 10), through the whole App against a recording
 * `Platform` and `Ours`, `setInterval` faked: the person's own session deploys, in the browser,
 * exactly the candidate read at the press to production, signs in again when asked, and watches
 * the new instance every second. Our server is never asked to deploy.
 */
const g = words.goingLive
const l = g.letIn
const t = words.tryingOut
const TZ = 'America/Vancouver'
/** Noon on 30 September in Vancouver. */
const NOW = new Date('2026-09-30T19:00:00.000Z')
const SLUG = 'reading-responses'
const PROJECT: Schemas['Project'] = {
  ...fixtures.PROJECT,
  name: 'Reading responses',
  slug: SLUG,
  launchedAt: null,
}
const ID = {
  sandbox: '33333333-3333-4333-8333-333333333331',
  staging: '33333333-3333-4333-8333-333333333332',
  production: '33333333-3333-4333-8333-333333333333',
} as const
type Kind = keyof typeof ID
const HOST = `${SLUG}.manifest.internal`
/** The draft, built: a launch needs one (and the Overview reads the checklist only then). */
const DRAFT: Schemas['Instance'] = {
  id: 'i-draft',
  environmentId: '33333333-3333-4333-8333-333333333331',
  releaseId: '55555555-5555-4555-8555-555555555555',
  kind: 'web',
  state: 'healthy',
  lastSeenAt: '2026-09-30T18:59:00.000Z',
  createdAt: '2026-09-18T22:12:00.000Z',
}
const environment = (kind: Kind): Schemas['Environment'] => ({
  id: ID[kind],
  projectId: PROJECT.id,
  kind,
  hostname: kind === 'production' ? HOST : `${SLUG}.${kind}.manifest.internal`,
  url: `https://${kind === 'production' ? HOST : `${SLUG}.${kind}.manifest.internal`}`,
  instance: kind === 'sandbox' ? DRAFT : null,
})
const release = (id: string, createdAt: string): Schemas['Release'] => ({
  ...fixtures.RELEASE,
  id,
  createdAt,
})
/** On trying-out when the page read it: 18 September, 3:12pm. */
const CANDIDATE = release(
  '55555555-5555-4555-8555-555555555555',
  '2026-09-18T22:12:00.000Z',
)
/** Put on trying-out since: today, 10:40am. */
const NEWER = release('55555555-5555-4555-8555-555555555556', '2026-09-30T17:40:00.000Z')
const RELEASES = [CANDIDATE, NEWER]
const met = (i: Schemas['LaunchReadinessItem']) => ({ ...i, state: 'met' as const })
/** Every blocking item met: the button. */
const READY: Schemas['LaunchReadiness'] = {
  ...fixtures.LAUNCH_READINESS,
  ready: true,
  candidateReleaseId: CANDIDATE.id,
  items: fixtures.LAUNCH_READINESS.items.map(met),
}
/** The sign-off refused since the page read it: the gate's race. */
const REFUSED: Schemas['LaunchReadiness'] = {
  ...READY,
  ready: false,
  items: READY.items.map((i) =>
    i.id === 'admin-approval' ? { ...i, state: 'unmet' as const } : i,
  ),
}
const summary = (
  id: string,
  releaseId: string,
  state: Schemas['Instance']['state'],
  serving = false,
): Schemas['InstanceSummary'] => ({
  id,
  environmentId: ID.production,
  releaseId,
  kind: 'web',
  state,
  lastSeenAt: state === 'healthy' ? '2026-09-30T18:59:00.000Z' : null,
  createdAt: '2026-09-30T18:59:00.000Z',
  serving,
})
const bare = (i: Schemas['InstanceSummary']): Schemas['Instance'] => ({
  id: i.id,
  environmentId: i.environmentId,
  releaseId: i.releaseId,
  kind: i.kind,
  state: i.state,
  lastSeenAt: i.lastSeenAt,
  createdAt: i.createdAt,
})
/** An attempt of long ago, failed, still listed first at the press. */
const OLD = summary('i-old', CANDIDATE.id, 'failed')
/** The new instance on production, in each state it passes through. */
const fresh = (state: Schemas['Instance']['state'], releaseId = CANDIDATE.id) =>
  summary('i-live', releaseId, state, state === 'healthy')
const INCIDENT: Schemas['Incident'] = {
  ...fixtures.INCIDENTS.incidents[0]!,
  id: '44444444-4444-4444-8444-444444444441',
  instanceId: 'i-live',
  releaseId: CANDIDATE.id,
  createdAt: '2026-09-30T18:59:40.000Z',
}
const OLDER_INCIDENT: Schemas['Incident'] = {
  ...INCIDENT,
  id: '44444444-4444-4444-8444-444444444442',
  instanceId: OLD.id,
  createdAt: '2026-09-29T18:00:00.000Z',
}
const ASKED = { name: 'SIS_KEY', ask: 'What is the key for your class list?' }
const VALUE = 'the-class-list-key'

type World = {
  launchedAt: string | null
  readiness: Schemas['LaunchReadiness']
  production: Schemas['InstanceSummary'][]
  incidents: Schemas['Incident'][]
  secrets: Schemas['AppSecretStatus'][]
  fix: string | null
  /** Reads that fail (500) while named here: a page read again while the platform struggles. */
  failing: string[]
  /**
   * The instance the live address names (`Environment.instance`). With no route the platform
   * falls back to the newest (its `servingInstanceOf`): a dry run taken down again, `gone` (the
   * platform's 5b), or an attempt that never answered.
   */
  named: Schemas['Instance'] | null
}

const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'deploy')
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

function stage(start: Partial<World> = {}) {
  const world: World = {
    launchedAt: null,
    readiness: READY,
    production: [OLD],
    incidents: [],
    secrets: [],
    fix: null,
    failing: [],
    named: null,
    ...start,
  }
  const calls: [string, ...unknown[]][] = []
  const ours: [string, ...unknown[]][] = []
  const deploys: {
    resolve: (i: Schemas['Instance']) => void
    reject: (e: unknown) => void
  }[] = []
  const secretRefusals: unknown[] = []
  const record =
    <T,>(name: string, value: (...args: never[]) => T) =>
    (...args: never[]) => {
      calls.push([name, ...args])
      return world.failing.includes(name)
        ? Promise.reject(refused(500, 'INTERNAL'))
        : Promise.resolve(value(...args))
    }
  const platform: Platform = {
    getMe: () => Promise.resolve(fixtures.ME),
    listProjects: record('listProjects', () => [
      { ...PROJECT, launchedAt: world.launchedAt },
    ]),
    getProject: never,
    getRelease: record('getRelease', (id: string) => RELEASES.find((r) => r.id === id)!),
    listEnvironments: record('listEnvironments', () =>
      (Object.keys(ID) as Kind[]).map((kind) =>
        kind === 'production'
          ? { ...environment(kind), instance: world.named }
          : environment(kind),
      ),
    ),
    listInstances: record('listInstances', (environmentId: string) => ({
      environmentId,
      instances: environmentId === ID.production ? world.production : [],
      truncated: false,
    })),
    listIncidents: record('listIncidents', (environmentId: string) => ({
      environmentId,
      incidents: environmentId === ID.production ? world.incidents : [],
    })),
    runRehearsal: () => new Promise<never>(() => undefined),
    getLaunchReadiness: record('getLaunchReadiness', () => world.readiness),
    getLaunchRecords: record('getLaunchRecords', () => ({
      projectId: PROJECT.id,
      iamRegistration: fixtures.IAM_REGISTRATION,
      privacyAssessment: { ...fixtures.PRIVACY_ASSESSMENT, state: 'approved' as const },
      stagingRegistration: null,
    })),
    getApproval: record('getApproval', () => fixtures.APPROVAL),
    requestApproval: never,
    getEnvironment: record('getEnvironment', (id: string) =>
      environment((Object.keys(ID) as Kind[]).find((k) => ID[k] === id)!),
    ),
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
    listMembers: never,
    revokeToken: never,
    addMember: never,
    removeMember: never,
    listTokens: never,
    listPendingActions: never,
    confirmPendingAction: never,
    rejectPendingAction: never,
    archiveProject: never,
    restoreProject: never,
    deleteProject: never,
    watchProject: () => ({ ready: never(), close: () => undefined }),
    deploy: (environmentId, releaseId, key) => {
      calls.push(['deploy', environmentId, releaseId, key])
      return new Promise((resolve, reject) => deploys.push({ resolve, reject }))
    },
    listAppSecrets: record('listAppSecrets', (environmentId: string) => ({
      environmentId,
      environmentKind: 'production' as const,
      secrets: world.secrets,
    })),
    setAppSecret: (...args) => {
      calls.push(['setAppSecret', ...args])
      const refusal = secretRefusals.shift()
      return refusal === undefined ? Promise.resolve() : Promise.reject(refusal)
    },
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
    askedSecrets: (...args) => {
      ours.push(['askedSecrets', ...args])
      return Promise.resolve([ASKED])
    },
    fixFor: (...args) => {
      ours.push(['fixFor', ...args])
      return Promise.resolve(world.fix === null ? null : { id: world.fix })
    },
    agreedRows: () => Promise.resolve(null),
    fixForDryRun: () => Promise.resolve(null),
    fixForOutage: () => Promise.resolve(null),
    changeForRefusal: () => Promise.resolve(null),
    keeping: never,
    handWatch: never,
    minted: never,
    keepAgent: never,
    leave: never,
    needs: never,
    since: never,
    history: never,
    forget: never,
    events: () => new FakeSource(),
  }
  const called = (name: string) =>
    calls.filter((c) => c[0] === name).map((c) => c.slice(1))
  /** deploy's own answer, to the press waiting on it. */
  const answer = (instance: Schemas['Instance']) =>
    act(async () => {
      deploys.at(-1)!.resolve(instance)
    })
  const refuse = (error: unknown) =>
    act(async () => {
      deploys.at(-1)!.reject(error)
    })
  return {
    world,
    platform,
    ours: theirs,
    oursCalls: ours,
    called,
    answer,
    refuse,
    secretRefusals,
  }
}
type Stage = ReturnType<typeof stage>

const fetched: { url: string; body: string }[] = []
beforeEach(() => {
  fetched.length = 0
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      fetched.push({ url, body: String(init?.body ?? '') })
      return new Response(null, { status: 204 })
    }),
  )
  try {
    sessionStorage.clear()
    localStorage.clear()
  } catch {
    // none
  }
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete (document as { visibilityState?: unknown }).visibilityState
})

async function open(s: Stage, path = `/apps/${SLUG}/going-live`) {
  window.history.pushState({}, '', path)
  render(<App platform={s.platform} ours={s.ours} timeZone={TZ} now={() => NOW} />)
  await screen.findByRole('heading', { level: 1, name: g.title })
  return s
}
const press = (element: HTMLElement) =>
  act(async () => {
    fireEvent.click(element)
  })
const tick = (ms = 1000) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
const letIn = () => screen.findByRole('button', { name: l.button })
/** The card that lets them in: named for a screen reader. */
const card = () => screen.getByRole('region', { name: l.button })
/** Its words, the hostname (mono) left out. */
function wordsOn(element: HTMLElement = document.body): string {
  const copy = element.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.mono').forEach((mono) => mono.remove())
  return copy.textContent ?? ''
}
/** The stations as drawn: each label, and its state. */
function stations(): string[] {
  const run = screen.getByRole('region', { name: l.stationsLabel })
  return [...within(run).getByRole('list').querySelectorAll('li')].map(
    (li) =>
      `${li.querySelector('.mf-station__label')?.textContent}:${/mf-station--(\w+)/.exec(li.className)?.[1]}`,
  )
}
/** Pressed, and the deploy in flight. */
async function pressed(s: Stage) {
  await press(await letIn())
  await waitFor(() => expect(s.called('deploy')).toHaveLength(1))
}
const shown = () =>
  act(async () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
const fixesAsked = (s: Stage) =>
  s.oursCalls.filter((c) => c[0] === 'startChange').map((c) => c[2])
function withTimeouts() {
  vi.useRealTimers()
  vi.useFakeTimers({
    toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
    shouldAdvanceTime: true,
  })
}

describe('[Let your students in]: only when ready (moment 14)', () => {
  it('the one primary action, with the walk-through’s sentence: the version, and where it goes, in mono', async () => {
    await open(stage())
    const button = await letIn()
    expect(button.className).toMatch(/primary/)
    expect(card().textContent).toContain(
      `The version from 18 September, 3:12pm goes to ${HOST}. Your trying-out address stays as it is.`,
    )
    expect(card().querySelector('.mono')?.textContent).toBe(HOST)
    expect(machineryIn(wordsOn())).toEqual([])
  })

  it('not ready: no button, and no card', async () => {
    await open(stage({ readiness: REFUSED }))
    await screen.findByRole('region', { name: g.shortJobs.title })
    expect(screen.queryByRole('button', { name: l.button })).toBeNull()
    expect(screen.queryByRole('region', { name: l.button })).toBeNull()
  })
})

describe('the press sends exactly the candidate it reads (Review Focus 1)', () => {
  it('re-reads the checklist at the press, and deploys its candidate to production’s environment, with its own Idempotency-Key', async () => {
    const s = await open(stage())
    const reads = s.called('getLaunchReadiness').length
    await pressed(s)
    expect(s.called('getLaunchReadiness').length).toBe(reads + 1)
    const [environmentId, releaseId, key] = s.called('deploy')[0]!
    expect([environmentId, releaseId]).toEqual([ID.production, CANDIDATE.id])
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('a candidate changed since the page read it is never sent unnamed: asked, naming the new one; the next press sends it (the Global Constraint)', async () => {
    const s = await open(stage())
    await letIn()
    s.world.readiness = { ...READY, candidateReleaseId: NEWER.id }
    await press(await letIn())
    expect(await screen.findByText(l.changed)).toBeTruthy()
    expect(s.called('deploy')).toEqual([])
    expect(card().textContent).toContain('The version from today, 10:40am goes to ')
    expect(card().textContent).not.toContain('18 September')
    await pressed(s)
    expect(s.called('deploy')[0]?.[1]).toBe(NEWER.id)
  })

  it('asked about a new one, and trying-out changes again before the press: asked again, never sent', async () => {
    const s = await open(stage())
    await letIn()
    s.world.readiness = { ...READY, candidateReleaseId: NEWER.id }
    await press(await letIn())
    await screen.findByText(l.changed)
    s.world.readiness = READY
    await press(await letIn())
    await waitFor(() =>
      expect(card().textContent).toContain(
        'The version from 18 September, 3:12pm goes to ',
      ),
    )
    expect(screen.getByText(l.changed)).toBeTruthy()
    expect(s.called('deploy')).toEqual([])
  })

  it('RELEASE_NOT_STAGED: the walk-through’s question, naming the new one; pressed, the new one is sent', async () => {
    const s = await open(stage())
    await pressed(s)
    s.world.readiness = { ...READY, candidateReleaseId: NEWER.id }
    await s.refuse(refused(409, 'RELEASE_NOT_STAGED'))
    expect(await screen.findByText(l.changed)).toBeTruthy()
    // Said to a screen reader too: the button pressed was replaced (M8).
    expect(
      screen.getAllByRole('status').some((e) => e.textContent?.includes(l.changed)),
    ).toBe(true)
    expect(card().textContent).toContain('The version from today, 10:40am goes to ')
    await press(await letIn())
    await waitFor(() => expect(s.called('deploy')).toHaveLength(2))
    expect(s.called('deploy')[1]?.[1]).toBe(NEWER.id)
  })

  it('asked about a new one: the page reads again, so its own line and its sign-off speak of the version the card names (the whole-branch review’s I2)', async () => {
    const s = await open(stage())
    await letIn()
    expect(screen.getByText(g.version('18 September, 3:12pm'))).toBeTruthy()
    s.world.readiness = { ...READY, candidateReleaseId: NEWER.id }
    await press(await letIn())
    await screen.findByText(l.changed)
    expect(await screen.findByText(g.version('today, 10:40am'))).toBeTruthy()
    expect(screen.queryByText(g.version('18 September, 3:12pm'))).toBeNull()
    expect(s.called('getApproval').map(([id]) => id)).toContain(NEWER.id)
    expect(s.called('deploy')).toEqual([])
  })

  it('launched since the page read it (another window, a collaborator): the press sends nothing, and the page says it is live (the whole-branch review’s I1)', async () => {
    const s = await open(stage())
    await letIn()
    s.world.readiness = { ...READY, launched: true }
    await press(await letIn())
    expect(await screen.findByText(g.live)).toBeTruthy()
    expect(s.called('deploy')).toEqual([])
    expect(screen.queryByRole('button', { name: l.button })).toBeNull()
  })

  it('launched since, with a newer version on trying-out: never asked about, never sent to the live app (I1)', async () => {
    const s = await open(stage())
    await letIn()
    s.world.readiness = { ...READY, candidateReleaseId: NEWER.id, launched: true }
    await press(await letIn())
    expect(await screen.findByText(g.live)).toBeTruthy()
    expect(screen.queryByText(l.changed)).toBeNull()
    expect(s.called('deploy')).toEqual([])
  })

  it('RELEASE_NOT_STAGED, and launched meanwhile: no question, nothing sent again, and it is live (I1)', async () => {
    const s = await open(stage())
    await pressed(s)
    s.world.readiness = { ...READY, candidateReleaseId: NEWER.id, launched: true }
    await s.refuse(refused(409, 'RELEASE_NOT_STAGED'))
    expect(await screen.findByText(g.live)).toBeTruthy()
    expect(screen.queryByText(l.changed)).toBeNull()
    expect(s.called('deploy')).toHaveLength(1)
  })

  it('a checklist no longer ready at the press sends nothing', async () => {
    const s = await open(stage())
    await letIn()
    s.world.readiness = REFUSED
    await press(await letIn())
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: l.button })).toBeNull(),
    )
    expect(s.called('deploy')).toEqual([])
  })
})

describe('the card never outlives what the page reads (the final review’s I1 and I2)', () => {
  it('a press that did not go through, then a reading not ready: no button (I1)', async () => {
    const s = await open(stage())
    await pressed(s)
    await s.refuse(refused(500, 'INTERNAL'))
    await screen.findByRole('alert')
    s.world.readiness = REFUSED
    await shown()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: l.button })).toBeNull(),
    )
  })

  it('the connection dropped mid-press, then a reading that hears it launched: "It’s live.", and no button to send it twice (I1)', async () => {
    const s = await open(stage())
    await pressed(s)
    await s.refuse(new TypeError('fetch failed'))
    await screen.findByRole('alert')
    s.world.readiness = { ...READY, launched: true }
    await shown()
    expect(await screen.findByText(g.live)).toBeTruthy()
    expect(screen.queryByRole('button', { name: l.button })).toBeNull()
    expect(s.called('deploy')).toHaveLength(1)
  })

  // I2's own fallback (the card drawn from the last good reading, `going-live.tsx`'s `lastSeen`) is
  // reached by no reading today: every reading during a press is a quiet one (the page shown again),
  // and since m17 a quiet reading that fails keeps the page whole. These two hold the card by m17.
  it('a reading that fails mid-deploy never takes the card away: healthy still lands (I2, Review Focus 3; held by m17)', async () => {
    const s = await open(stage())
    await pressed(s)
    s.world.failing = ['getLaunchReadiness']
    await shown()
    await waitFor(() => expect(s.called('getLaunchReadiness').length).toBeGreaterThan(2))
    await act(async () => undefined)
    // m17: a reading nobody asked for that fails keeps the page as it stands, the card with it.
    expect(screen.queryByRole('button', { name: words.refused.button })).toBeNull()
    expect(screen.getByRole('region', { name: l.button })).toBeTruthy()
    s.world.production = [fresh('healthy'), OLD]
    await s.answer(bare(fresh('healthy')))
    expect(await screen.findByText('Reading responses is live.')).toBeTruthy()
  })

  it('unsure, and a reading whose addresses fail: the watch stays, and its end still lands (I2; held by m17)', async () => {
    const s = await open(stage())
    await pressed(s)
    await s.refuse(ourDeadline())
    await screen.findByText(t.unsure)
    s.world.failing = ['listEnvironments']
    await shown()
    await waitFor(() => expect(s.called('getLaunchReadiness').length).toBeGreaterThan(2))
    await act(async () => undefined)
    expect(screen.getByText(t.unsure)).toBeTruthy()
    s.world.production = [fresh('healthy'), OLD]
    await tick()
    expect(await screen.findByText('Reading responses is live.')).toBeTruthy()
  })

  it('we stopped watching, and a reading hears it launched: the moment, never "couldn’t see how it ended" beside it (M3)', async () => {
    const s = await open(stage())
    await pressed(s)
    await s.refuse(ourDeadline())
    await screen.findByText(t.unsure)
    await tick(5 * 60_000)
    await screen.findByText(l.unsureLong)
    s.world.readiness = { ...READY, launched: true }
    await shown()
    expect(await screen.findByText('Reading responses is live.')).toBeTruthy()
    expect(screen.queryByText(l.unsureLong)).toBeNull()
  })

  it('the gate’s line goes once a reading is ready again (M1): never "can’t go live yet" beside the button', async () => {
    const s = await open(stage())
    await pressed(s)
    s.world.readiness = REFUSED
    await s.refuse(refused(409, 'RELEASE_PRODUCTION_GATE_UNAVAILABLE'))
    await screen.findByText(l.gate)
    s.world.readiness = READY
    await shown()
    expect(await letIn()).toBeTruthy()
    expect(screen.queryByText(l.gate)).toBeNull()
  })
})

describe('the step-up: signing in once more, in place (Decision 10)', () => {
  it('STEP_UP_REQUIRED: the card in place, its rule, and [Sign in again] back to this page with then=live; nothing stored', async () => {
    const s = await open(stage())
    await pressed(s)
    await s.refuse(refused(403, 'STEP_UP_REQUIRED'))
    expect(await screen.findByText(t.stepUp.title)).toBeTruthy()
    expect(screen.getByText(t.stepUp.body)).toBeTruthy()
    expect(screen.getByText(l.stepUpRule)).toBeTruthy()
    // Said to a screen reader too: the button pressed is gone (M8).
    expect(within(screen.getByRole('alert')).getByText(t.stepUp.title)).toBeTruthy()
    expect(screen.getByRole('link', { name: t.stepUp.again }).getAttribute('href')).toBe(
      `/auth/step-up?returnTo=${encodeURIComponent(`/apps/${SLUG}/going-live?then=live`)}`,
    )
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
  })

  it('back with then=live: "You’re signed in again.", the same button, the address without then; one press sends the candidate read then', async () => {
    const s = stage({ readiness: { ...READY, candidateReleaseId: NEWER.id } })
    await open(s, `/apps/${SLUG}/going-live?then=live`)
    expect(await screen.findByText(l.again)).toBeTruthy()
    expect(window.location.pathname).toBe(`/apps/${SLUG}/going-live`)
    expect(window.location.search).toBe('')
    await pressed(s)
    expect(s.called('deploy')[0]?.[1]).toBe(NEWER.id)
    expect(screen.queryByText(l.again)).toBeNull()
  })

  it('m10: back with then=live, then the gate refused: the card drawn again never says "signed in again" again', async () => {
    const s = stage()
    await open(s, `/apps/${SLUG}/going-live?then=live`)
    expect(await screen.findByText(l.again)).toBeTruthy()
    await pressed(s)
    s.world.readiness = REFUSED
    await s.refuse(refused(409, 'RELEASE_PRODUCTION_GATE_UNAVAILABLE'))
    await screen.findByText(l.gate)
    s.world.readiness = READY
    await shown()
    expect(await letIn()).toBeTruthy()
    expect(screen.queryByText(l.again)).toBeNull()
  })

  it('back with then=live, and no longer ready: nothing to press, and then is still cleared', async () => {
    await open(stage({ readiness: REFUSED }), `/apps/${SLUG}/going-live?then=live`)
    await screen.findByRole('region', { name: g.shortJobs.title })
    expect(window.location.search).toBe('')
    expect(screen.queryByRole('button', { name: l.button })).toBeNull()
  })
})

describe('the stations, and the end: deploy’s own answer', () => {
  it('the new instance, found by the id not listed at the press, ticks every second; healthy is the moment the product is for', async () => {
    const s = await open(stage())
    await pressed(s)
    s.world.production = [OLD, fresh('pending')]
    await tick()
    expect(stations()).toEqual([
      'Waiting its turn:now',
      'Making room:next',
      'Starting up:next',
      'Answering:next',
    ])
    s.world.production = [OLD, fresh('starting')]
    await tick()
    expect(stations()[2]).toBe('Starting up:now')
    s.world.production = [fresh('healthy'), OLD]
    await s.answer(bare(fresh('healthy')))
    expect(await screen.findByText('Reading responses is live.')).toBeTruthy()
    const link = screen.getByRole('link', { name: l.tellThem })
    expect(link.getAttribute('href')).toBe(`/apps/${SLUG}`)
    expect(
      [...document.querySelectorAll('.mono')].some(
        (m) => m.textContent === `https://${HOST}`,
      ),
    ).toBe(true)
    // Rich: it wraps only after :// and before a dot, never at the slug's hyphen.
    expect(
      [...document.querySelectorAll('.going-live__address .address__piece')].map(
        (p) => p.textContent,
      ),
    ).toEqual(['https://', SLUG, '.manifest', '.internal'])
    expect(screen.queryByRole('region', { name: g.shortJobs.title })).toBeNull()
    expect(screen.queryByText(g.lead)).toBeNull()
    // The moment, not the page's plain line for a launch it did not see.
    expect(screen.queryByText(g.live)).toBeNull()
    expect(machineryIn(wordsOn())).toEqual([])
    expect(document.body.textContent).not.toMatch(/it works/i)
    const polls = s.called('listInstances').length
    await tick(5000)
    expect(s.called('listInstances').length).toBe(polls)
  })

  it('[See what to tell your students] opens the Overview, which hears the launch and leads with For your students', async () => {
    const s = await open(stage())
    await pressed(s)
    s.world.production = [fresh('healthy'), OLD]
    s.world.readiness = { ...READY, launched: true }
    await s.answer(bare(fresh('healthy')))
    await press(await screen.findByRole('link', { name: l.tellThem }))
    expect(window.location.pathname).toBe(`/apps/${SLUG}`)
    expect(
      await screen.findByRole('heading', { name: words.preview.tabs.students }),
    ).toBeTruthy()
  })

  it('our server is never asked to deploy: from the press to the end, nothing of ours but a read', async () => {
    const s = await open(stage())
    await pressed(s)
    s.world.production = [fresh('healthy'), OLD]
    await s.answer(bare(fresh('healthy')))
    await screen.findByText('Reading responses is live.')
    expect(fetched.filter((f) => f.url.startsWith('/api/'))).toEqual([])
    expect(s.oursCalls).toEqual([])
  })
})

describe('when it goes wrong (moment 14)', () => {
  it('RELEASE_PRODUCTION_GATE_UNAVAILABLE: the checklist read again, the changed row lit in words, and no button', async () => {
    const s = await open(stage())
    await pressed(s)
    s.world.readiness = REFUSED
    await s.refuse(refused(409, 'RELEASE_PRODUCTION_GATE_UNAVAILABLE'))
    expect(await screen.findByText(l.gate)).toBeTruthy()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: l.button })).toBeNull(),
    )
    const jobs = screen.getByRole('region', { name: g.shortJobs.title })
    const lit = [...jobs.querySelectorAll('li')].filter((li) =>
      li.textContent?.includes(l.changedRow),
    )
    expect(lit.map((li) => li.querySelector('.going-live__name')?.textContent)).toEqual([
      g.rows.approval.name,
    ])
  })

  it.each(['RELEASE_DIGEST_NOT_APPROVED', 'RELEASE_REESCALATED'])(
    '%s is the gate too: read again, no button',
    async (code) => {
      const s = await open(stage())
      await pressed(s)
      s.world.readiness = REFUSED
      await s.refuse(refused(409, code))
      expect(await screen.findByText(l.gate)).toBeTruthy()
      expect(screen.queryByRole('button', { name: l.button })).toBeNull()
    },
  )

  it('RELEASE_SECRET_NOT_SET: a field for each, named by our question; set on production, then the button again', async () => {
    const s = await open(stage())
    await pressed(s)
    s.world.secrets = [{ name: 'SIS_KEY', declared: true, set: false, updatedAt: null }]
    await s.refuse(refused(409, 'RELEASE_SECRET_NOT_SET'))
    const field = await screen.findByLabelText(new RegExp(ASKED.ask.replace('?', '\\?')))
    expect(s.called('listAppSecrets')).toEqual([[ID.production]])
    fireEvent.change(field, { target: { value: VALUE } })
    await press(screen.getByRole('button', { name: t.secret.set }))
    await waitFor(() => expect(s.called('setAppSecret')).toHaveLength(1))
    const [environmentId, name, value] = s.called('setAppSecret')[0]!
    expect([environmentId, name, value]).toEqual([ID.production, 'SIS_KEY', VALUE])
    expect(await letIn()).toBeTruthy()
    expect(fetched.map((f) => f.body).join()).not.toContain(VALUE)
  })

  it('a secret refused for want of a step-up: the step-up card, back to this page with then=live', async () => {
    const s = await open(stage())
    await pressed(s)
    s.world.secrets = [{ name: 'SIS_KEY', declared: true, set: false, updatedAt: null }]
    s.secretRefusals.push(refused(403, 'STEP_UP_REQUIRED'))
    await s.refuse(refused(409, 'RELEASE_SECRET_NOT_SET'))
    fireEvent.change(
      await screen.findByLabelText(new RegExp(ASKED.ask.replace('?', '\\?'))),
      { target: { value: VALUE } },
    )
    await press(screen.getByRole('button', { name: t.secret.set }))
    expect(await screen.findByText(t.stepUp.title)).toBeTruthy()
    expect(screen.getByRole('link', { name: t.stepUp.again }).getAttribute('href')).toBe(
      `/auth/step-up?returnTo=${encodeURIComponent(`/apps/${SLUG}/going-live?then=live`)}`,
    )
  })

  it("m42: the press's own read of the instances refused is reported as listInstances, never as getLaunchReadiness; nothing sent", async () => {
    const s = await open(stage())
    const button = await letIn()
    s.world.failing = ['listInstances']
    await press(button)
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(t.couldnt)).toBeTruthy()
    const reports = fetched
      .filter((f) => f.url === '/api/problems')
      .map((f) => JSON.parse(f.body) as Record<string, unknown>)
    expect(reports).toEqual([
      expect.objectContaining({ code: 'INTERNAL', operation: 'listInstances' }),
    ])
    expect(s.called('deploy')).toEqual([])
  })

  it('a press that does not go through: said with a reference, reported once, and the button again', async () => {
    const s = await open(stage())
    await pressed(s)
    await s.refuse(refused(500, 'INTERNAL'))
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(t.couldnt)).toBeTruthy()
    const reports = fetched
      .filter((f) => f.url === '/api/problems')
      .map((f) => JSON.parse(f.body) as Record<string, unknown>)
    expect(reports).toEqual([
      expect.objectContaining({ code: 'INTERNAL', operation: 'deploy' }),
    ])
    expect(await letIn()).toBeTruthy()
  })
})

describe('it never answered: the facts, and this attempt’s [What went wrong] (M2, Review Focus 4)', () => {
  async function neverAnswered(s: Stage) {
    await open(s)
    await pressed(s)
    s.world.production = [OLD, fresh('failed')]
    await s.answer(bare(fresh('failed')))
  }

  it('nothing reached their students, said only because the platform answered failed; the facts under their heading', async () => {
    const s = stage({ incidents: [INCIDENT, OLDER_INCIDENT] })
    await neverAnswered(s)
    expect(await screen.findByText(l.nothingReached)).toBeTruthy()
    expect(within(card()).getByRole('heading', { name: l.address })).toBeTruthy()
    expect(
      within(card()).getByText("Didn't start, a moment ago. Nobody lost anything."),
    ).toBeTruthy()
    expect(stations()[3]).toBe('It never answered:halted')
    expect(machineryIn(wordsOn())).toEqual([])
  })

  it('the live address still naming a dry run taken down again (gone, the platform’s 5b): nothing reached their students, never "switched off"', async () => {
    const s = stage({
      incidents: [INCIDENT],
      named: bare(summary('i-dry', CANDIDATE.id, 'gone')),
    })
    await neverAnswered(s)
    expect(await screen.findByText(l.nothingReached)).toBeTruthy()
    expect(card().textContent).not.toContain('Switched off')
  })

  it('the live address naming this attempt itself (no route: the platform’s fallback): nothing reached their students, and nothing said to serve', async () => {
    const s = stage({ incidents: [INCIDENT], named: bare(fresh('failed')) })
    await neverAnswered(s)
    expect(await screen.findByText(l.nothingReached)).toBeTruthy()
  })

  it('an older incident listed first is never taken: this attempt’s feeds a fix for the live address', async () => {
    const s = stage({ incidents: [OLDER_INCIDENT, INCIDENT] })
    await neverAnswered(s)
    await press(await screen.findByRole('button', { name: t.whatWentWrong }))
    await waitFor(() =>
      expect(window.location.pathname).toBe(`/apps/${SLUG}/conversations/c-fix`),
    )
    expect(s.called('mintToken')[0]?.[1]).toEqual(mintRequest(l.fixTitle, 'changing'))
    expect(fixesAsked(s)).toEqual([
      {
        fix: { incidentId: INCIDENT.id, environment: 'production' },
        token: 'mft_test_fix',
        tokenId: 't-fix',
      },
    ])
  })

  it('a fix already under way for this incident opens it: no token, no second fix', async () => {
    const s = stage({ incidents: [INCIDENT], fix: 'c-fix-1' })
    await neverAnswered(s)
    await press(await screen.findByRole('button', { name: t.whatWentWrong }))
    await waitFor(() =>
      expect(window.location.pathname).toBe(`/apps/${SLUG}/conversations/c-fix-1`),
    )
    expect(s.called('mintToken')).toEqual([])
    expect(fixesAsked(s)).toEqual([])
  })

  it('none of its own yet: read once more after 2 s; still none, the facts without the button', async () => {
    withTimeouts()
    const s = stage({ incidents: [OLDER_INCIDENT] })
    await neverAnswered(s)
    await tick(2000)
    expect(
      await within(card()).findByText("Didn't start. Nobody lost anything."),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: t.whatWentWrong })).toBeNull()
    const reads = s.called('listIncidents').length
    await tick(5000)
    expect(s.called('listIncidents').length).toBe(reads)
  })
})

describe('M1: our deadline is not the platform’s answer (Review Focus 3)', () => {
  it('cut: unsure, never "nothing reached", the new instance read every second; healthy is the end', async () => {
    const s = await open(stage())
    await pressed(s)
    s.world.production = [OLD, fresh('starting')]
    await s.refuse(ourDeadline())
    expect(await screen.findByText(t.unsure)).toBeTruthy()
    expect(screen.queryByText(l.nothingReached)).toBeNull()
    expect(screen.queryByText(t.couldnt)).toBeNull()
    await tick()
    expect(stations()[2]).toBe('Starting up:now')
    s.world.production = [fresh('healthy'), OLD]
    await tick()
    expect(await screen.findByText('Reading responses is live.')).toBeTruthy()
  })

  it('cut, then its start fails: the facts, and only then "nothing reached"', async () => {
    const s = await open(stage({ incidents: [INCIDENT] }))
    await pressed(s)
    await s.refuse(ourDeadline())
    await screen.findByText(t.unsure)
    s.world.production = [OLD, fresh('failed')]
    await tick()
    expect(await screen.findByText(l.nothingReached)).toBeTruthy()
    expect(await screen.findByRole('button', { name: t.whatWentWrong })).toBeTruthy()
  })

  it('five minutes more with no end: we stop reading, and say where to look', async () => {
    const s = await open(stage())
    await pressed(s)
    await s.refuse(ourDeadline())
    await screen.findByText(t.unsure)
    await tick(5 * 60_000)
    expect(await screen.findByText(l.unsureLong)).toBeTruthy()
    const polls = s.called('listInstances').length
    await tick(5000)
    expect(s.called('listInstances').length).toBe(polls)
  })
})

describe('M4: after an ending, the offer comes back when there is something new, read when shown again', () => {
  it('never answered, and trying-out has another version since, ready: the button is back, naming it', async () => {
    const s = await open(stage({ incidents: [INCIDENT] }))
    await pressed(s)
    s.world.production = [OLD, fresh('failed')]
    await s.answer(bare(fresh('failed')))
    await screen.findByText(l.nothingReached)
    s.world.readiness = { ...READY, candidateReleaseId: NEWER.id }
    await shown()
    expect(await letIn()).toBeTruthy()
    expect(card().textContent).toContain('The version from today, 10:40am goes to ')
    expect(screen.queryByText(l.nothingReached)).toBeNull()
  })

  it('never answered, having sent a newer version than the page had read (asked, then pressed): that one is not offered again by itself', async () => {
    const s = await open(stage({ incidents: [{ ...INCIDENT, releaseId: NEWER.id }] }))
    await letIn()
    s.world.readiness = { ...READY, candidateReleaseId: NEWER.id }
    await press(await letIn())
    await screen.findByText(l.changed)
    await pressed(s)
    expect(s.called('deploy')[0]?.[1]).toBe(NEWER.id)
    s.world.production = [OLD, fresh('failed', NEWER.id)]
    await s.answer(bare(fresh('failed', NEWER.id)))
    await screen.findByText(l.nothingReached)
    const reads = s.called('getLaunchReadiness').length
    await shown()
    await waitFor(() =>
      expect(s.called('getLaunchReadiness').length).toBeGreaterThan(reads),
    )
    await act(async () => undefined)
    expect(screen.getByText(l.nothingReached)).toBeTruthy()
    expect(screen.queryByRole('button', { name: l.button })).toBeNull()
  })

  it('never answered, and nothing new: the facts stay, and no button by itself', async () => {
    const s = await open(stage({ incidents: [INCIDENT] }))
    await pressed(s)
    s.world.production = [OLD, fresh('failed')]
    await s.answer(bare(fresh('failed')))
    await screen.findByText(l.nothingReached)
    const reads = s.called('getLaunchReadiness').length
    await shown()
    await waitFor(() =>
      expect(s.called('getLaunchReadiness').length).toBeGreaterThan(reads),
    )
    await act(async () => undefined)
    expect(screen.getByText(l.nothingReached)).toBeTruthy()
    expect(screen.queryByRole('button', { name: l.button })).toBeNull()
  })
})
