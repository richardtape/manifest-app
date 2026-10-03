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
 * MOMENT 9, PUTTING A VERSION ON THE TRYING-OUT ADDRESS (F4 Task 10, Decision 11), through the
 * whole App against a recording `Platform` and `Ours`, with `setInterval` faked: the person's own
 * session deploys, in the browser, exactly the release the question named, and the page watches
 * the new instance every second. Our server is never asked to deploy, and a secret's value goes to
 * the platform and nowhere else.
 */
const t = words.tryingOut
const TZ = 'America/Vancouver'
/** 28 September, 10pm in Vancouver. */
const NOW = new Date('2026-09-29T05:00:00.000Z')
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
type Kind = keyof typeof ID
const release = (id: string, createdAt: string): Schemas['Release'] => ({
  ...fixtures.RELEASE,
  id,
  createdAt,
})
/** On the draft now: today, 3:12pm in Vancouver. */
const TODAY = release('r-today', '2026-09-28T22:12:00.000Z')
/** A round that finishes after the question: today, 4:40pm. */
const NEWER = release('r-newer', '2026-09-28T23:40:00.000Z')
/** On trying-out now: 18 September, 9:00am. */
const OLDER = release('r-older', '2026-09-18T16:00:00.000Z')
const RELEASES = [TODAY, NEWER, OLDER]

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
  lastSeenAt: state === 'healthy' ? '2026-09-29T04:59:00.000Z' : null,
  // Made when its version was, the order F4's flows produce (FE-38: contract 1.5.0).
  createdAt: RELEASES.find((r) => r.id === releaseId)!.createdAt,
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
const environment = (
  kind: Kind,
  serving: Schemas['InstanceSummary'] | undefined,
): Schemas['Environment'] => ({
  id: ID[kind],
  projectId: PROJECT.id,
  kind,
  hostname: `${SLUG}.${kind}.manifest.internal`,
  url: `https://${SLUG}.${kind}.manifest.internal`,
  instance: serving === undefined ? null : bare(serving),
})

const DRAFT = summary('i-draft', 'sandbox', TODAY.id, 'healthy', true)
const THERE = summary('i-there', 'staging', OLDER.id, 'healthy', true)
/** The new instance on trying-out, in each state it passes through. */
const fresh = (state: Schemas['Instance']['state'], serving = false) =>
  summary('i-new', 'staging', TODAY.id, state, serving)
const INCIDENT: Schemas['Incident'] = {
  ...fixtures.INCIDENTS.incidents[0]!,
  id: 'incident-new',
  instanceId: 'i-new',
  releaseId: TODAY.id,
  createdAt: '2026-09-29T04:59:40.000Z',
}
const secret = (
  name: string,
  declared: boolean,
  set: boolean,
): Schemas['AppSecretStatus'] => ({ name, declared, set, updatedAt: null })
const ASKED = { name: 'SIS_KEY', ask: 'What is the key for your class list?' }
const VALUE = 'the-class-list-key'

type World = {
  sandbox: Schemas['InstanceSummary'][]
  staging: Schemas['InstanceSummary'][]
  incidents: Schemas['Incident'][]
  secrets: Schemas['AppSecretStatus'][]
  /** The fix conversation we are already making for the incident, if any (F4 review I2). */
  fix: string | null
}

const refused = (status: number, code: string, message = 'x') =>
  new ManifestApiError(status, { error: { code, message } } as never, 'deploy')
const never = () => new Promise<never>(() => undefined)

class FakeSource implements StreamSource {
  readyState = 0
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  close() {
    this.readyState = 2
  }
}

/** A platform answering the world as it stands at each call, and an Ours, both recording. */
function stage(start: Partial<World> = {}) {
  const world: World = {
    sandbox: [DRAFT],
    staging: [THERE],
    incidents: [],
    secrets: [],
    fix: null,
    ...start,
  }
  const calls: [string, ...unknown[]][] = []
  const ours: [string, ...unknown[]][] = []
  const deploys: {
    resolve: (i: Schemas['Instance']) => void
    reject: (e: unknown) => void
  }[] = []
  const kindOf = (environmentId: string) =>
    (Object.keys(ID) as Kind[]).find((k) => ID[k] === environmentId)!
  const listed = (kind: Kind) =>
    kind === 'production' ? [] : kind === 'sandbox' ? world.sandbox : world.staging
  const record =
    <T,>(name: string, value: (...args: never[]) => T) =>
    (...args: never[]) => {
      calls.push([name, ...args])
      return Promise.resolve(value(...args))
    }
  const platform: Platform = {
    getMe: () => Promise.resolve(fixtures.ME),
    listProjects: () => Promise.resolve([PROJECT]),
    getProject: never,
    getRelease: record('getRelease', (id: string) => RELEASES.find((r) => r.id === id)!),
    listEnvironments: record('listEnvironments', () =>
      (Object.keys(ID) as Kind[]).map((kind) =>
        environment(
          kind,
          listed(kind).find((i) => i.serving),
        ),
      ),
    ),
    listInstances: record('listInstances', (environmentId: string) => ({
      environmentId,
      instances: listed(kindOf(environmentId)),
      truncated: false,
    })),
    listIncidents: record('listIncidents', (environmentId: string) => ({
      environmentId,
      incidents: kindOf(environmentId) === 'staging' ? world.incidents : [],
    })),
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
      environmentKind: 'staging' as const,
      secrets: world.secrets,
    })),
    setAppSecret: record('setAppSecret', () => undefined),
    runRehearsal: () => new Promise<never>(() => undefined),
    getLaunchReadiness: never,
    getLaunchRecords: never,
    getApproval: never,
    requestApproval: never,
    getEnvironment: never,
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
    conversationFor: (...args) => {
      ours.push(['conversationFor', ...args])
      return Promise.resolve(null)
    },
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
  return { world, platform, ours: theirs, oursCalls: ours, calls, called, answer, refuse }
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
  } catch {
    // none
  }
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function open(s: Stage, path = `/apps/${SLUG}/preview`) {
  window.history.pushState({}, '', path)
  render(<App platform={s.platform} ours={s.ours} timeZone={TZ} now={() => NOW} />)
  await screen.findByRole('tablist')
  return s
}
const press = (element: HTMLElement) =>
  act(async () => {
    fireEvent.click(element)
  })
/** The next second of polling. */
const tick = (ms = 1000) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
const put = () => screen.findByRole('button', { name: t.put })
const putItThere = () => screen.findByRole('button', { name: t.putItThere })
const draft = () => screen.getByRole('tabpanel', { name: words.preview.tabs.draft })
/** The stations as drawn: each label, and its state. */
function stations(): string[] {
  const run = screen.getByRole('region', { name: t.stationsLabel })
  return [...within(run).getByRole('list').querySelectorAll('li')].map(
    (li) =>
      `${li.querySelector('.mf-station__label')?.textContent}:${/mf-station--(\w+)/.exec(li.className)?.[1]}`,
  )
}
/** The question, asked and answered: the deploy is in flight. */
async function putOn(s: Stage) {
  await press(await put())
  await press(await putItThere())
  await waitFor(() => expect(s.called('deploy')).toHaveLength(1))
}
/** The page's words, without hostnames (mono) or Rich's trying-out sentence (the Preview's). */
function wordsOn(element: HTMLElement = document.body): string {
  const copy = element.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.mono').forEach((mono) => mono.remove())
  return (copy.textContent ?? '').replace(words.preview.tryingOut, '')
}

describe('what is offered (Review Focus 2)', () => {
  it('on the draft tab, beside the two facts: [Put this version on trying-out]', async () => {
    await open(stage())
    expect(await within(draft()).findByRole('button', { name: t.put })).toBeTruthy()
  })

  it('a draft serving nothing offers no button, though an attempt failed there', async () => {
    const s = stage({ sandbox: [summary('i-f', 'sandbox', NEWER.id, 'failed')] })
    await open(s)
    expect(await within(draft()).findByText(/Didn't start/)).toBeTruthy()
    await act(async () => undefined)
    expect(screen.queryByRole('button', { name: t.put })).toBeNull()
  })

  it('already there (S1: M3): the sentence, and no button — the platform would make another of the same', async () => {
    const s = stage({
      staging: [summary('i-same', 'staging', TODAY.id, 'healthy', true)],
    })
    await open(s)
    expect(await within(draft()).findByText(t.alreadyThere)).toBeTruthy()
    expect(screen.queryByRole('button', { name: t.put })).toBeNull()
  })
})

describe('the question: the version fixed when it is asked (Decision 11)', () => {
  it("names the draft's serving version, read at the press, with [Put it there] and [Not now]", async () => {
    const s = await open(stage())
    const before = s.called('listEnvironments').length
    await press(await put())
    expect(
      await screen.findByText(t.question('the version from today, 3:12pm', true)),
    ).toBeTruthy()
    expect(s.called('listEnvironments').length).toBe(before + 1)
    expect(s.called('getRelease')).toContainEqual([TODAY.id])
    expect(screen.getByRole('button', { name: t.notNow })).toBeTruthy()
  })

  it('a newer version that FAILED on the draft changes nothing: the one serving is named', async () => {
    const s = stage({
      sandbox: [summary('i-f', 'sandbox', NEWER.id, 'failed'), DRAFT],
    })
    await open(s)
    await press(await put())
    expect(
      await screen.findByText(t.question('the version from today, 3:12pm', true)),
    ).toBeTruthy()
    await press(await putItThere())
    expect(s.called('deploy')[0]?.[1]).toBe(TODAY.id)
  })

  it('a round finishing before [Put it there]: deploy still sends the release the question named', async () => {
    const s = await open(stage())
    await press(await put())
    await screen.findByText(t.question('the version from today, 3:12pm', true))
    // The draft moves on while the question is open.
    s.world.sandbox = [summary('i-newer', 'sandbox', NEWER.id, 'healthy', true)]
    await press(await putItThere())
    await waitFor(() => expect(s.called('deploy')).toHaveLength(1))
    const [environmentId, releaseId, key] = s.called('deploy')[0]!
    expect([environmentId, releaseId]).toEqual([ID.staging, TODAY.id])
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('with nothing on trying-out yet, it promises no one there keeps answering', async () => {
    await open(stage({ staging: [] }))
    await press(await put())
    expect(
      await screen.findByText(t.question('the version from today, 3:12pm', false)),
    ).toBeTruthy()
  })

  it('[Not now] closes it, and nothing is deployed', async () => {
    const s = await open(stage())
    await press(await put())
    await press(await screen.findByRole('button', { name: t.notNow }))
    expect(await put()).toBeTruthy()
    expect(s.called('deploy')).toEqual([])
  })

  it('each press is its own Idempotency-Key', async () => {
    const s = await open(stage())
    await putOn(s)
    await s.refuse(refused(500, 'INTERNAL'))
    await press(await put())
    await press(await putItThere())
    await waitFor(() => expect(s.called('deploy')).toHaveLength(2))
    const [first, second] = s.called('deploy').map((c) => c[2])
    expect(first).not.toBe(second)
  })
})

describe('the four stations: the new instance, every second (S1: M3)', () => {
  it('pending, provisioning, starting, healthy each tick their station; the new one is found listed SECOND', async () => {
    const s = await open(stage())
    await putOn(s)
    expect(screen.getByText(t.working)).toBeTruthy()
    expect(screen.getByText(t.real)).toBeTruthy()
    expect(screen.getByText(t.leave)).toBeTruthy()
    expect(stations()).toEqual([
      'Waiting its turn:now',
      'Making room:next',
      'Starting up:next',
      'Answering:next',
    ])
    const polls = () => s.called('listInstances').filter(([e]) => e === ID.staging).length
    const before = polls()
    const seen: string[][] = []
    for (const state of ['pending', 'provisioning', 'starting'] as const) {
      // "Seen most recently first": the one serving leads while the new one starts.
      s.world.staging = [THERE, fresh(state)]
      await tick()
      seen.push(stations())
    }
    expect(polls()).toBe(before + 3)
    expect(seen).toEqual([
      ['Waiting its turn:now', 'Making room:next', 'Starting up:next', 'Answering:next'],
      ['Waiting its turn:done', 'Making room:now', 'Starting up:next', 'Answering:next'],
      ['Waiting its turn:done', 'Making room:done', 'Starting up:now', 'Answering:next'],
    ])
    s.world.staging = [fresh('healthy', true), { ...THERE, serving: false }]
    await tick()
    expect(stations()).toEqual([
      'Waiting its turn:done',
      'Making room:done',
      'Starting up:done',
      'Answering:done',
    ])
  })

  it('the one serving at the press is never taken for the new one, though it is healthy and first', async () => {
    const s = await open(stage())
    await putOn(s)
    await tick()
    await tick()
    expect(stations()[0]).toBe('Waiting its turn:now')
    expect(screen.queryByText(t.arrived)).toBeNull()
  })

  it("the end is deploy's own answer (M2): the list still healthy while deploy answers failed is It never answered", async () => {
    const s = await open(stage())
    await putOn(s)
    s.world.staging = [THERE, fresh('starting')]
    await tick()
    s.world.incidents = [INCIDENT]
    s.world.staging = [THERE, fresh('healthy')]
    await s.answer(bare(fresh('failed')))
    expect(stations()).toEqual([
      'Waiting its turn:done',
      'Making room:done',
      'Starting up:done',
      'It never answered:halted',
    ])
    expect(screen.getByText(t.stations.never.note)).toBeTruthy()
    expect(await screen.findByText(t.needsYou)).toBeTruthy()
    expect(screen.queryByText(t.arrived)).toBeNull()
  })

  it('polling stops when deploy answers', async () => {
    const s = await open(stage())
    await putOn(s)
    await tick()
    s.world.staging = [fresh('healthy', true), { ...THERE, serving: false }]
    await s.answer(bare(fresh('healthy', true)))
    const polls = () => s.called('listInstances').filter(([e]) => e === ID.staging).length
    const after = polls()
    await tick(5000)
    expect(polls()).toBe(after)
  })
})

describe("it arrives: Rich's words (2026-09-28)", () => {
  it('exactly, with no date, no "We asked", no "weeks", no machinery, and never "It works"', async () => {
    const s = await open(stage())
    await putOn(s)
    s.world.staging = [fresh('healthy', true), { ...THERE, serving: false }]
    await s.answer(bare(fresh('healthy', true)))
    const said = await screen.findByText(t.arrived)
    expect(said.textContent).toBe(
      "It's on the trying-out address. Nobody can sign in there until UBC's identity team has registered it. That takes some time, as several teams at UBC help make sure the app and its data are kept safe and secure.",
    )
    const region = screen.getByRole('region', { name: t.put })
    expect(wordsOn(region)).not.toMatch(
      /\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)\b|We asked|weeks/i,
    )
    expect(machineryIn(wordsOn())).toEqual([])
    expect(document.body.textContent).not.toMatch(/it works/i)
  })

  it('the Preview reads what is true after: Trying out serves the version put there', async () => {
    const s = await open(stage())
    await putOn(s)
    s.world.staging = [fresh('healthy', true), { ...THERE, serving: false }]
    await s.answer(bare(fresh('healthy', true)))
    await screen.findByText(t.arrived)
    await press(screen.getByRole('tab', { name: words.preview.tabs['trying-out'] }))
    const trying = screen.getByRole('tabpanel', {
      name: words.preview.tabs['trying-out'],
    })
    expect(
      await within(trying).findByText('The version from 28 September, 3:12pm'),
    ).toBeTruthy()
  })
})

describe('It never answered: the two facts, and [What went wrong]', () => {
  async function neverAnswered(s: Stage) {
    await open(s)
    await putOn(s)
    s.world.incidents = [INCIDENT]
    s.world.staging = [THERE, fresh('failed')]
    await s.answer(bare(fresh('failed')))
  }

  it('what serves there still, and the attempt that did not start', async () => {
    await neverAnswered(stage())
    const region = screen.getByRole('region', { name: t.put })
    // Under the draft's own two facts: these are trying-out's, and say so (the walk, sitting 6).
    expect(await within(region).findByRole('heading', { name: t.address })).toBeTruthy()
    expect(
      await within(region).findByText('The version from 18 September, 9:00am'),
    ).toBeTruthy()
    expect(
      within(region).getByText("Didn't start, a moment ago. Nobody lost anything."),
    ).toBeTruthy()
    expect(machineryIn(wordsOn())).toEqual([])
  })

  it('[What went wrong] mints a token named for the fix, starts a fix conversation carrying the incident, and opens it', async () => {
    const s = stage()
    await neverAnswered(s)
    await press(await screen.findByRole('button', { name: t.whatWentWrong }))
    await waitFor(() =>
      expect(window.location.pathname).toBe(`/apps/${SLUG}/conversations/c-fix`),
    )
    const [projectId, body] = s.called('mintToken')[0]!
    expect([projectId, body]).toEqual([PROJECT.id, mintRequest(t.fixTitle, 'changing')])
    expect(s.oursCalls.filter((c) => c[0] === 'startChange')).toEqual([
      [
        'startChange',
        PROJECT.id,
        { fix: { incidentId: INCIDENT.id }, token: 'mft_test_fix', tokenId: 't-fix' },
      ],
    ])
  })

  it('[What went wrong] once a fix for that incident is under way opens it: no token minted, and no second fix (F4 review I2)', async () => {
    const s = stage({ fix: 'c-fix-1' })
    await neverAnswered(s)
    await press(await screen.findByRole('button', { name: t.whatWentWrong }))
    await waitFor(() =>
      expect(window.location.pathname).toBe(`/apps/${SLUG}/conversations/c-fix-1`),
    )
    expect(s.oursCalls.filter((c) => c[0] === 'fixFor')).toEqual([
      ['fixFor', PROJECT.id, INCIDENT.id],
    ])
    expect(s.called('mintToken')).toEqual([])
    expect(s.oursCalls.filter((c) => c[0] === 'startChange')).toEqual([])
  })

  it("on the Preview's Trying out tab, a failed last attempt offers [What went wrong] too", async () => {
    const failed = summary('i-new', 'staging', NEWER.id, 'failed')
    const s = stage({ staging: [failed, THERE], incidents: [INCIDENT] })
    await open(s, `/apps/${SLUG}/preview?tab=trying-out`)
    const trying = screen.getByRole('tabpanel', {
      name: words.preview.tabs['trying-out'],
    })
    await press(await within(trying).findByRole('button', { name: t.whatWentWrong }))
    await waitFor(() =>
      expect(s.oursCalls.filter((c) => c[0] === 'startChange')).toEqual([
        [
          'startChange',
          PROJECT.id,
          { fix: { incidentId: INCIDENT.id }, token: 'mft_test_fix', tokenId: 't-fix' },
        ],
      ]),
    )
  })
})

describe('a secret with no value there (Decision 15)', () => {
  /** Refused: the message names a secret the page must never read it for. */
  const NOT_SET = () =>
    refused(
      409,
      'RELEASE_SECRET_NOT_SET',
      'Set each name the message lists: MESSAGE_ONLY (PUT /v1/environments/x/secrets/{name})',
    )
  const MISSING = [
    secret('SIS_KEY', true, false),
    secret('ALREADY_SET', true, true),
    secret('NOT_DECLARED', false, false),
  ]

  it('needs you: a field for each name declared and not set (S1: M1), named by the question we asked', async () => {
    const s = stage({ secrets: MISSING })
    await open(s)
    await putOn(s)
    await s.refuse(NOT_SET())
    expect(await screen.findByText(t.secret.asked(false))).toBeTruthy()
    expect(screen.getByText(t.needsYou)).toBeTruthy()
    const field = screen.getByLabelText(ASKED.ask) as HTMLInputElement
    expect(field.type).toBe('password')
    expect(s.called('listAppSecrets')).toEqual([[ID.staging]])
    for (const other of ['ALREADY_SET', 'NOT_DECLARED', 'MESSAGE_ONLY'])
      expect(screen.queryByLabelText(other)).toBeNull()
    expect(document.body.textContent).not.toContain('MESSAGE_ONLY')
  })

  it('under 6 characters, the field says so first, and [Set it] waits', async () => {
    const s = stage({ secrets: MISSING })
    await open(s)
    await putOn(s)
    await s.refuse(NOT_SET())
    const field = await screen.findByLabelText(ASKED.ask)
    fireEvent.change(field, { target: { value: 'short' } })
    expect(screen.getByText(words.building.question.secretShort)).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: t.secret.set }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('[Set it] sends the value to setAppSecret on trying-out, and to no route of ours; then the question again, for the same version', async () => {
    const s = stage({ secrets: MISSING })
    await open(s)
    await putOn(s)
    await s.refuse(NOT_SET())
    fireEvent.change(await screen.findByLabelText(ASKED.ask), {
      target: { value: VALUE },
    })
    await press(screen.getByRole('button', { name: t.secret.set }))
    await waitFor(() => expect(s.called('setAppSecret')).toHaveLength(1))
    const [environmentId, name, value, key] = s.called('setAppSecret')[0]!
    expect([environmentId, name, value]).toEqual([ID.staging, 'SIS_KEY', VALUE])
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
    expect(JSON.stringify(s.oursCalls)).not.toContain(VALUE)
    expect(JSON.stringify(fetched)).not.toContain(VALUE)
    // The draft moved on meanwhile: the question still names the version it named.
    s.world.sandbox = [summary('i-newer', 'sandbox', NEWER.id, 'healthy', true)]
    expect(
      await screen.findByText(t.question('the version from today, 3:12pm', true)),
    ).toBeTruthy()
    expect(document.body.textContent).not.toContain(VALUE)
    await press(await putItThere())
    await waitFor(() => expect(s.called('deploy')).toHaveLength(2))
    expect(s.called('deploy')[1]?.[1]).toBe(TODAY.id)
  })

  it('asked for and never asked, together: each said of its own, never one sentence untrue of some', async () => {
    const s = stage({
      secrets: [secret('SIS_KEY', true, false), secret('OTHER_KEY', true, false)],
    })
    await open(s)
    await putOn(s)
    await s.refuse(NOT_SET())
    const asked = await screen.findByText(t.secret.asked(false))
    const never = screen.getByText(t.secret.never)
    const field = (label: string) => screen.getByLabelText(label)
    // Each sentence comes before its own field, and the asked one's before the other's.
    const follows = (a: Node, b: Node) =>
      (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    expect(follows(asked, field(ASKED.ask))).toBe(true)
    expect(follows(field(ASKED.ask), never)).toBe(true)
    expect(follows(never, field('OTHER_KEY'))).toBe(true)
    expect(screen.queryByText(t.secret.asked(true))).toBeNull()
  })

  it('a name no question of ours asked for is said so, and named as the app reads it', async () => {
    const s = stage({ secrets: [secret('OTHER_KEY', true, false)] })
    await open(s)
    await putOn(s)
    await s.refuse(NOT_SET())
    expect(await screen.findByText(t.secret.never)).toBeTruthy()
    expect((screen.getByLabelText('OTHER_KEY') as HTMLInputElement).type).toBe('password')
  })
})

describe('step-up (never expected: staging asks none, M3)', () => {
  it('STEP_UP_REQUIRED: sign in again, and back to the question for the same version', async () => {
    const s = await open(stage())
    await putOn(s)
    await s.refuse(refused(403, 'STEP_UP_REQUIRED'))
    expect(await screen.findByText(t.stepUp.title)).toBeTruthy()
    const again = screen.getByRole('link', { name: t.stepUp.again })
    expect(again.getAttribute('href')).toBe(
      `/auth/step-up?returnTo=${encodeURIComponent(`/apps/${SLUG}/preview`)}`,
    )
    // Back from signing in: a new page, and the draft has moved on meanwhile.
    cleanup()
    const back = stage({
      sandbox: [summary('i-newer', 'sandbox', NEWER.id, 'healthy', true)],
    })
    await open(back)
    expect(
      await screen.findByText(t.question('the version from today, 3:12pm', true)),
    ).toBeTruthy()
    await press(await putItThere())
    await waitFor(() => expect(back.called('deploy')).toHaveLength(1))
    expect(back.called('deploy')[0]?.[1]).toBe(TODAY.id)
  })
})

describe('a page closed and reopened mid-deploy (Review Focus 5)', () => {
  it("the Preview's Trying out reads under way from listInstances, then the result", async () => {
    const s = stage({ staging: [THERE, fresh('starting')] })
    await open(s, `/apps/${SLUG}/preview?tab=trying-out`)
    const trying = () =>
      screen.getByRole('tabpanel', { name: words.preview.tabs['trying-out'] })
    expect(await within(trying()).findByText(words.preview.facts.underWay)).toBeTruthy()
    s.world.staging = [fresh('healthy', true), { ...THERE, serving: false }]
    await tick(2000)
    expect(await within(trying()).findByText(words.preview.facts.same)).toBeTruthy()
    expect(
      within(trying()).getByText('The version from 28 September, 3:12pm'),
    ).toBeTruthy()
  })
})

describe('a press that does not go through', () => {
  it('said with a reference, reported once, and the button again', async () => {
    const s = await open(stage())
    await putOn(s)
    await s.refuse(refused(500, 'INTERNAL'))
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(t.couldnt)).toBeTruthy()
    const reference = /quote ([0-9A-F]{4}-[0-9A-F]{4})\./.exec(
      alert.textContent ?? '',
    )?.[1]
    const reports = fetched
      .filter((f) => f.url === '/api/problems')
      .map((f) => JSON.parse(f.body) as Record<string, unknown>)
    expect(reports).toEqual([
      expect.objectContaining({ reference, code: 'INTERNAL', operation: 'deploy' }),
    ])
    expect(await put()).toBeTruthy()
  })
})

describe('our server is never asked to deploy (Global Constraints)', () => {
  it('the whole way, from the question to the end, calls no route of ours but reads', async () => {
    const s = await open(stage())
    await putOn(s)
    s.world.staging = [fresh('healthy', true), { ...THERE, serving: false }]
    await s.answer(bare(fresh('healthy', true)))
    await screen.findByText(t.arrived)
    expect(
      fetched.filter((f) => f.url.startsWith('/api/') && f.url !== '/api/problems'),
    ).toEqual([])
    expect(s.oursCalls.map((c) => c[0]).filter((n) => n !== 'conversationFor')).toEqual(
      [],
    )
  })
})

/** Our own deadline, as `AbortSignal.timeout` rejects `fetch` with it (platform/api.ts). */
const ourDeadline = () => new DOMException('The operation timed out.', 'TimeoutError')
/** An older attempt's incident, listed first (the platform lists incidents newest first). */
const OLDER_INCIDENT: Schemas['Incident'] = {
  ...INCIDENT,
  id: 'incident-older',
  instanceId: 'i-older-failure',
  createdAt: '2026-09-29T04:30:00.000Z',
}
/** The fixes asked of our server: each startChange's body. */
const fixesAsked = (s: Stage) =>
  s.oursCalls.filter((c) => c[0] === 'startChange').map((c) => c[2])
const incidentReads = (s: Stage) =>
  s.called('listIncidents').filter(([e]) => e === ID.staging).length
/** `setTimeout` faked too, for M2's one re-read (the clock still runs, so Testing Library waits). */
function withTimeouts() {
  vi.useRealTimers()
  vi.useFakeTimers({
    toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
    shouldAdvanceTime: true,
  })
}
/** Trying-out's own region: the Preview's hidden tab says the same facts. */
const region = () => screen.getByRole('region', { name: t.put })

describe('M2: [What went wrong] is fed by THIS attempt’s incident, never the newest listed (Review Focus 4)', () => {
  it('an older incident listed first is never taken for this attempt: its own feeds the button', async () => {
    const s = await open(stage())
    await putOn(s)
    s.world.incidents = [INCIDENT, OLDER_INCIDENT]
    s.world.staging = [THERE, fresh('failed')]
    await s.answer(bare(fresh('failed')))
    await press(await screen.findByRole('button', { name: t.whatWentWrong }))
    await waitFor(() =>
      expect(fixesAsked(s)).toEqual([
        { fix: { incidentId: INCIDENT.id }, token: 'mft_test_fix', tokenId: 't-fix' },
      ]),
    )
  })

  it('none of its own yet: read once more after 2 s, and its own, once written, feeds the button', async () => {
    withTimeouts()
    const s = await open(stage())
    await putOn(s)
    s.world.incidents = [OLDER_INCIDENT]
    s.world.staging = [THERE, fresh('failed')]
    await s.answer(bare(fresh('failed')))
    const before = incidentReads(s)
    s.world.incidents = [INCIDENT, OLDER_INCIDENT]
    await tick(2000)
    await press(await screen.findByRole('button', { name: t.whatWentWrong }))
    await waitFor(() =>
      expect(fixesAsked(s)).toEqual([
        { fix: { incidentId: INCIDENT.id }, token: 'mft_test_fix', tokenId: 't-fix' },
      ]),
    )
    expect(incidentReads(s)).toBe(before + 1)
  })

  it('still none of its own after 2 s: the two facts, undated, and no button; never an older one', async () => {
    withTimeouts()
    const s = await open(stage())
    await putOn(s)
    s.world.incidents = [OLDER_INCIDENT]
    s.world.staging = [THERE, fresh('failed')]
    await s.answer(bare(fresh('failed')))
    await tick(2000)
    expect(
      await within(region()).findByText("Didn't start. Nobody lost anything."),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: t.whatWentWrong })).toBeNull()
    const reads = incidentReads(s)
    await tick(5000)
    expect(incidentReads(s)).toBe(reads)
  })
})

describe('M1: our deadline is not the platform’s answer (Review Focus 3)', () => {
  it('a deploy our deadline cut is unsure, never "couldn’t": said so, nothing reported, and the new instance still read every second to its end', async () => {
    const s = await open(stage())
    await putOn(s)
    s.world.staging = [THERE, fresh('starting')]
    await tick()
    await s.refuse(ourDeadline())
    expect(await screen.findByText(t.unsure)).toBeTruthy()
    expect(screen.queryByText(t.couldnt)).toBeNull()
    expect(fetched.filter((f) => f.url === '/api/problems')).toEqual([])
    const polls = () => s.called('listInstances').filter(([e]) => e === ID.staging).length
    const at = polls()
    await tick()
    expect(polls()).toBe(at + 1)
    expect(stations()).toEqual([
      'Waiting its turn:done',
      'Making room:done',
      'Starting up:now',
      'Answering:next',
    ])
    s.world.staging = [fresh('healthy', true), { ...THERE, serving: false }]
    await tick()
    expect(await screen.findByText(t.arrived)).toBeTruthy()
    expect(screen.queryByText(t.unsure)).toBeNull()
    const ended = polls()
    await tick(5000)
    expect(polls()).toBe(ended)
  })

  it('cut, then the new instance fails: the two facts, and this attempt’s [What went wrong]', async () => {
    const s = await open(stage())
    await putOn(s)
    await s.refuse(ourDeadline())
    await screen.findByText(t.unsure)
    s.world.incidents = [INCIDENT, OLDER_INCIDENT]
    s.world.staging = [THERE, fresh('failed')]
    await tick()
    expect(
      await within(region()).findByText(
        "Didn't start, a moment ago. Nobody lost anything.",
      ),
    ).toBeTruthy()
    await press(await screen.findByRole('button', { name: t.whatWentWrong }))
    await waitFor(() =>
      expect(fixesAsked(s)).toEqual([
        { fix: { incidentId: INCIDENT.id }, token: 'mft_test_fix', tokenId: 't-fix' },
      ]),
    )
  })

  it('five minutes more with no end: we stop reading, and say we could not see how it ended', async () => {
    const s = await open(stage())
    await putOn(s)
    // No new instance listed: nothing under way for the Preview to follow, so every read counted
    // here is ours.
    await s.refuse(ourDeadline())
    await screen.findByText(t.unsure)
    await tick(5 * 60_000)
    expect(await screen.findByText(t.unsureLong)).toBeTruthy()
    const polls = () => s.called('listInstances').filter(([e]) => e === ID.staging).length
    const stopped = polls()
    await tick(5000)
    expect(polls()).toBe(stopped)
    expect(screen.queryByText(t.couldnt)).toBeNull()
  })

  it('cut: the Preview’s Trying out reads again, so what the give-up points at shows the attempt under way (the final review’s M4)', async () => {
    const s = await open(stage())
    await putOn(s)
    s.world.staging = [THERE, fresh('starting')]
    await s.refuse(ourDeadline())
    await screen.findByText(t.unsure)
    // The Preview's Trying out panel, hidden while the draft's tab is chosen: read by its label.
    const trying = () =>
      document.querySelector<HTMLElement>(
        `section[role="tabpanel"][aria-label="${words.preview.tabs['trying-out']}"]`,
      )
    await waitFor(() =>
      expect(trying()?.textContent).toContain(words.preview.facts.underWay),
    )
  })

  it('we stopped watching, then a newer version on the draft: shown again, the offer is back (the final review’s M4)', async () => {
    const s = await open(stage())
    await putOn(s)
    s.world.staging = [THERE, fresh('starting')]
    await s.refuse(ourDeadline())
    await screen.findByText(t.unsure)
    await tick(5 * 60_000)
    await screen.findByText(t.unsureLong)
    s.world.sandbox = [summary('i-newer', 'sandbox', NEWER.id, 'healthy', true)]
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(await put()).toBeTruthy()
    delete (document as { visibilityState?: unknown }).visibilityState
  })

  it('nothing answering at all (a connection refused: nothing was sent) is still a press that did not go through', async () => {
    const s = await open(stage())
    await putOn(s)
    await s.refuse(new TypeError('fetch failed'))
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(t.couldnt)).toBeTruthy()
    expect(screen.queryByText(t.unsure)).toBeNull()
  })
})

describe('M4: after an ending, the offer comes back when there is something new, read when shown again', () => {
  const shown = () =>
    act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
  afterEach(() => {
    delete (document as { visibilityState?: unknown }).visibilityState
  })
  const NEWER_DRAFT = summary('i-newer', 'sandbox', NEWER.id, 'healthy', true)
  async function arrived(s: Stage) {
    await open(s)
    await putOn(s)
    s.world.staging = [fresh('healthy', true), { ...THERE, serving: false }]
    await s.answer(bare(fresh('healthy', true)))
    await screen.findByText(t.arrived)
  }
  async function failed(s: Stage) {
    await open(s)
    await putOn(s)
    s.world.incidents = [INCIDENT]
    s.world.staging = [THERE, fresh('failed')]
    await s.answer(bare(fresh('failed')))
    await screen.findByRole('button', { name: t.whatWentWrong })
  }

  it('arrived, and a newer version is on the draft since: the button is back', async () => {
    const s = stage()
    await arrived(s)
    s.world.sandbox = [NEWER_DRAFT]
    await shown()
    expect(await put()).toBeTruthy()
  })

  it('arrived, and nothing new: the arrival stays, and no button', async () => {
    const s = stage()
    await arrived(s)
    const reads = s.called('listEnvironments').length
    await shown()
    await waitFor(() => expect(s.called('listEnvironments').length).toBe(reads + 1))
    expect(screen.getByText(t.arrived)).toBeTruthy()
    expect(screen.queryByRole('button', { name: t.put })).toBeNull()
  })

  it('never answered, and a newer version is on the draft since: the button is back', async () => {
    const s = stage()
    await failed(s)
    s.world.sandbox = [NEWER_DRAFT]
    await shown()
    expect(await put()).toBeTruthy()
  })

  it('never answered, and the same version still on the draft: no offer by itself', async () => {
    const s = stage()
    await failed(s)
    const reads = s.called('listEnvironments').length
    await shown()
    await waitFor(() => expect(s.called('listEnvironments').length).toBe(reads + 1))
    expect(screen.getByRole('button', { name: t.whatWentWrong })).toBeTruthy()
    expect(screen.queryByRole('button', { name: t.put })).toBeNull()
  })

  it('hidden is never a reading', async () => {
    const s = stage()
    await arrived(s)
    const reads = s.called('listEnvironments').length
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(s.called('listEnvironments').length).toBe(reads)
  })
})
