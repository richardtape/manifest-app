// @vitest-environment jsdom
import type { Schemas } from '@manifest/contract'
import type {
  BuildStep,
  Conversation,
  Intake,
  Needs,
  Progress,
  RoundView,
  Said,
} from '@manifest-app/server/progress'
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
import { OurRefusal, type Ours, type StreamSource } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { mintRequest } from '../making/token.js'

/**
 * MOMENT 6, WATCHING IT GET BUILT (F3 Task 11), through the whole App: layout C, with our API
 * and the stream stood in for, and every frame said by hand. Each press is seen reaching our
 * server by what it SENT; each frame is seen changing the page. The words are the
 * walk-through's, Rich's, and ours where neither had any (words.ts marks them).
 */
const ME: Schemas['Me'] = {
  id: '11111111-1111-4111-8111-111111111111',
  puid: 'ins000001',
  displayName: 'Instructor One',
  email: 'instructor@example.test',
  role: 'member',
}
const PROJECT = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Reading responses',
  slug: 'reading-responses',
  blueprint: 'node-ts-mongo@1',
}
const CONVERSATION: Conversation = {
  id: 'c-1',
  personId: ME.id,
  projectId: PROJECT.id,
  title: 'First build',
  state: 'building',
  description: "A page where students post a response to the week's reading.",
  createdAt: '2026-09-28T16:00:00.000Z',
  updatedAt: '2026-09-28T16:00:00.000Z',
}
const INTAKE: Intake = {
  round: 1,
  understood: null,
  answers: {},
  skipped: [],
  names: null,
  namesAsked: 0,
  blueprint: null,
  project: PROJECT,
}
const DRAFT = 'https://reading-responses.sandbox.manifest.internal'
const KEYS: BuildStep[] = ['pages', 'holds', 'build', 'draft', 'answers']

type StepView = RoundView['steps'][number]
/** A round working on its pages: every other step to come. */
function round(
  patch: Partial<RoundView> = {},
  steps: Partial<Record<BuildStep, Partial<StepView>>> = {},
): RoundView {
  return {
    round: 1,
    status: 'working',
    line: null,
    messageWaiting: false,
    steps: KEYS.map((key) => ({
      key,
      state: key === 'pages' ? 'now' : 'next',
      tries: 0,
      note: null,
      changed: null,
      exact: null,
      ...steps[key],
    })),
    needs: null,
    reference: null,
    questions: [],
    draft: null,
    cost: { conversationUsd: null, monthLeftUsd: null, resetsAt: null },
    ...patch,
  }
}
/** Every step done: the round is over. */
const ALL_DONE = Object.fromEntries(KEYS.map((key) => [key, { state: 'done' as const }]))

class FakeSource implements StreamSource {
  readyState = 0
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  close() {
    this.readyState = 2
  }
}

const never = () => new Promise<never>(() => undefined)

/** What each call of ours refuses, by its name and how many times it has been called. */
type Refusals = Partial<Record<string, (n: number) => unknown>>

function stage(refusals: Refusals = {}) {
  const sources: FakeSource[] = []
  const calls: [string, ...unknown[]][] = []
  const counts: Record<string, number> = {}
  let mints = 0
  const platform: Platform = {
    getMe: () => Promise.resolve(ME),
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
    mintToken: (projectId, body, key) => {
      calls.push(['mintToken', projectId, body, key])
      mints++
      return Promise.resolve({
        token: { id: `t-${mints}` },
        secret: `mft_test_${mints}`,
      } as Schemas['MintedToken'])
    },
    deploy: never,
    listAppSecrets: never,
    setAppSecret: never,
    watchProject: () => ({ ready: never(), close: () => undefined }),
  }
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args])
      counts[name] = (counts[name] ?? 0) + 1
      const refused = refusals[name]?.(counts[name])
      return refused === undefined ? Promise.resolve() : Promise.reject(refused)
    }
  const ours: Ours = {
    startConversation: never,
    readConversation: never,
    handIntakeKey: never,
    intake: never,
    names: never,
    blueprint: never,
    handProject: record('handProject') as Ours['handProject'],
    plan: record('plan') as Ours['plan'],
    correct: record('correct') as Ours['correct'],
    agree: record('agree') as Ours['agree'],
    build: record('build') as Ours['build'],
    message: record('message') as Ours['message'],
    answer: record('answer') as Ours['answer'],
    stop: record('stop') as Ours['stop'],
    startChange: never,
    conversationsOn: never,
    conversationFor: never,
    askedSecrets: never,
    fixFor: never,
    events: () => {
      const source = new FakeSource()
      sources.push(source)
      return source
    },
  }
  const say = (frame: Progress) =>
    act(() => {
      const source = sources.at(-1)!
      source.readyState = 1
      source.onmessage?.(new MessageEvent('message', { data: JSON.stringify(frame) }))
    })
  const state = (
    view: RoundView | null,
    conversation: Partial<Conversation> = {},
    thread: Said[] = [],
  ) =>
    say({
      kind: 'state',
      conversation: { ...CONVERSATION, ...conversation },
      intake: INTAKE,
      plan: null,
      round: view,
      thread,
      piece: null,
      line: null,
    })
  const called = (name: string) =>
    calls.filter((c) => c[0] === name).map((c) => c.slice(1))
  return { platform, ours, say, state, called, calls, sources }
}

const reports: Record<string, unknown>[] = []
beforeEach(() => {
  reports.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/problems') {
        const report = JSON.parse(String(init?.body)) as Record<string, unknown>
        // Our server's own rules for a report (api/problems.ts): a refused one is lost.
        if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(String(report['code'])))
          return new Response(null, { status: 400 })
        if (
          report['operation'] !== null &&
          !/^[a-z][A-Za-z0-9]{0,63}$/.test(String(report['operation']))
        )
          return new Response(null, { status: 400 })
        reports.push(report)
      }
      return new Response(null, { status: 204 })
    }),
  )
  window.history.pushState({}, '', '/new/c-1')
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function open(s: ReturnType<typeof stage>) {
  render(
    <App
      platform={s.platform}
      ours={s.ours}
      timeZone="America/Vancouver"
      now={() => new Date('2026-09-28T16:30:00Z')}
    />,
  )
  await waitFor(() => expect(s.sources).toHaveLength(1))
}
const press = (button: HTMLElement) =>
  act(async () => {
    fireEvent.click(button)
  })
const button = (name: string) => screen.getByRole('button', { name })
const noButton = (name: string) =>
  expect(screen.queryByRole('button', { name })).toBeNull()
const stepItem = (text: string) => screen.getByText(text).closest('li')!
const referenceIn = (element: HTMLElement) =>
  /quote ([0-9A-F]{4}-[0-9A-F]{4})\./.exec(element.textContent ?? '')?.[1]
/** A disclosure by its summary's words. */
const disclosure = (summary: string | RegExp) =>
  screen.getByText(summary, { selector: 'summary' }).closest('details')!

/**
 * THE WORDS A PERSON READS: the page's text without hostnames (mono, allowed on screen) and
 * without the bodies of disclosures still shut (machine text on purpose, behind a deliberate
 * act, C3's rule for it).
 */
function wordsShown(): string {
  const copy = document.body.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.mono').forEach((mono) => mono.remove())
  copy.querySelectorAll('details:not([open])').forEach((details) =>
    [...details.children].forEach((child) => {
      if (child.tagName !== 'SUMMARY') child.remove()
    }),
  )
  const texts: string[] = []
  const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode())
    texts.push(node.nodeValue ?? '')
  return texts.join(' ')
}

describe('the conversation past Yes, build that, routed (Decision 12)', () => {
  it.each([
    ['building', round()],
    ['paused', round({ status: 'paused' })],
    ['built', round({ status: 'done' }, ALL_DONE)],
    ['agreed', null],
  ] as const)('%s is the building screen, never the fallback', async (state, view) => {
    const s = stage()
    await open(s)
    s.state(view, { state })
    expect(screen.getByRole('heading', { name: PROJECT.name })).toBeTruthy()
    for (const key of KEYS)
      expect(screen.getByText(words.building.steps[key])).toBeTruthy()
    expect(screen.queryByText(words.refused.body)).toBeNull()
  })

  it('agreed, before the round’s first frame: every step to come, and working', async () => {
    const s = stage()
    await open(s)
    s.state(null, { state: 'agreed' })
    for (const key of KEYS)
      expect(stepItem(words.building.steps[key]).className).toContain('mf-step--next')
    expect(screen.getByText(words.building.chip.working)).toBeTruthy()
    expect(screen.queryByText('Agreed. Building it arrives next.')).toBeNull()
  })

  it('a state no screen draws says so with a reference, and the reference is reported', async () => {
    const s = stage()
    await open(s)
    s.state(null, { state: 'failed' })
    const notice = await screen.findByRole('alert')
    expect(within(notice).getByText(words.refused.body)).toBeTruthy()
    const reference = referenceIn(notice)
    expect(reference).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    await waitFor(() =>
      expect(reports).toEqual([
        expect.objectContaining({
          reference,
          code: 'STATE_NOT_DRAWN',
          operation: 'failed',
        }),
      ]),
    )
  })
})

describe('a state from a newer server', () => {
  it('is said with a reference, reported with its name camel-cased, as our server takes one', async () => {
    const s = stage()
    await open(s)
    s.state(null, { state: 'handed-over' as Conversation['state'] })
    const notice = await screen.findByRole('alert')
    const reference = referenceIn(notice)
    await waitFor(() =>
      expect(reports).toEqual([
        expect.objectContaining({
          reference,
          code: 'STATE_NOT_DRAWN',
          operation: 'handedOver',
        }),
      ]),
    )
  })
})

describe('the steps, each ticking on its own signal', () => {
  it('follow the frames: the line under the step at work, a note and its second try, What changed once done', async () => {
    const s = stage()
    await open(s)
    s.state(round({ line: 'Writing the page students post on.' }))
    const pages = stepItem(words.building.steps.pages)
    expect(pages.className).toContain('mf-step--now')
    expect(pages.querySelector('[aria-live="polite"]')?.textContent).toBe(
      'Writing the page students post on.',
    )
    expect(stepItem(words.building.steps.build).className).toContain('mf-step--next')

    s.state(
      round(
        { line: 'Building it again.' },
        {
          pages: {
            state: 'done',
            changed: 'Students post on a weekly page.',
            exact: [
              'One page listing the weeks.',
              'public/weeks.html',
              'The rule about who sees what.',
              'server.js',
            ],
          },
          holds: { state: 'done', exact: [] },
          build: { state: 'now', tries: 1, note: 'A piece it depends on was missing' },
        },
      ),
    )
    const build = stepItem('Building it (second try)')
    expect(build.className).toContain('mf-step--now')
    expect(within(build).getByText('A piece it depends on was missing')).toBeTruthy()
    // After the pages, the line is ours (Rich), never the lead's.
    expect(build.querySelector('[aria-live="polite"]')?.textContent).toBe(
      words.building.stepLine.build,
    )
    // The line is under the step at work, and nowhere else.
    expect(document.querySelectorAll('.mf-step [aria-live]')).toHaveLength(1)

    const done = stepItem(words.building.steps.pages)
    expect(done.className).toContain('mf-step--done')
    const changed = within(done).getByText(words.building.whatChanged, {
      selector: 'summary',
    })
    const what = changed.closest('details')!
    expect(what.open).toBe(false)
    expect(within(what).getByText('Students post on a weekly page.')).toBeTruthy()
    const exact = within(what).getByText(words.building.exactChanges, { exact: false })
    expect(exact.textContent).toBe(`${words.building.exactChanges} · 4 lines`)
    expect(exact.closest('details')!.querySelector('.mf-inverse')).not.toBeNull()
    // Nothing missing from the pages: the check that holds has nothing to disclose.
    expect(stepItem(words.building.steps.holds).querySelector('details')).toBeNull()
  })

  it('a try that failed keeps the platform’s own words behind its disclosure, shut, on the inverse surface', async () => {
    const s = stage()
    await open(s)
    s.state(
      round(
        {},
        {
          pages: { state: 'done' },
          holds: { state: 'done' },
          build: {
            state: 'now',
            tries: 2,
            note: 'A piece it depends on was missing',
            exact: ['npm error missing: marked@14.1.0\nnpm error code 1', 'exit 1'],
          },
        },
      ),
    )
    const build = stepItem('Building it (third try)')
    const exact = within(build).getByText(words.building.exactWords, { exact: false })
    expect(exact.textContent).toBe(`${words.building.exactWords} · 3 lines`)
    const details = exact.closest('details')!
    expect(details.open).toBe(false)
    expect(details.querySelector('.mf-inverse .mf-log')?.textContent).toContain(
      'npm error missing: marked@14.1.0',
    )
  })

  it('says they can leave while it works; once done, what is true, never "It works"', async () => {
    const s = stage()
    await open(s)
    s.state(round())
    expect(screen.getByText(words.building.leave)).toBeTruthy()
    s.state(round({ status: 'done' }, ALL_DONE), { state: 'built' })
    expect(screen.queryByText(words.building.leave)).toBeNull()
    expect(screen.getByText(words.building.startedAndAnswered)).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/it works/i)
  })

  it('the draft address is a link, in mono; while a draft attempt fails, what is serving sits beside it', async () => {
    const s = stage()
    await open(s)
    s.state(round({ draft: { address: DRAFT, serving: true, lastAttempt: null } }))
    const link = screen.getByRole('link', {
      name: 'reading-responses.sandbox.manifest.internal',
    })
    expect(link.getAttribute('href')).toBe(DRAFT)
    expect(link.className).toContain('mono')
    expect(screen.queryByText(words.building.facts.attempt)).toBeNull()

    s.state(round({ draft: { address: DRAFT, serving: true, lastAttempt: 'failed' } }))
    expect(screen.getByText(words.building.facts.serving)).toBeTruthy()
    expect(screen.getByText(words.building.facts.servingLastGood)).toBeTruthy()
    expect(screen.getByText(words.building.facts.attempt)).toBeTruthy()
    expect(screen.getByText(words.building.facts.attemptFailed)).toBeTruthy()

    s.state(round({ draft: { address: DRAFT, serving: false, lastAttempt: 'failed' } }))
    expect(screen.getByText(words.building.facts.servingNothing)).toBeTruthy()
    expect(screen.queryByText(words.building.facts.servingLastGood)).toBeNull()
  })
})

describe('the cost, always visible (Rich)', () => {
  it.each([
    [{ conversationUsd: 0.4, monthLeftUsd: 9.6 }, '$0.40 so far · $9.60 left this month'],
    [{ conversationUsd: null, monthLeftUsd: 9.6 }, '$9.60 left this month'],
    [{ conversationUsd: 0.4, monthLeftUsd: null }, '$0.40 so far'],
    [{ conversationUsd: 0, monthLeftUsd: 10 }, '$0 so far · $10 left this month'],
  ])('the line for %o', async (cost, line) => {
    const s = stage()
    await open(s)
    s.state(round({ cost: { ...cost, resetsAt: null } }))
    expect(screen.getByText(line)).toBeTruthy()
  })

  it('with neither figure read yet, no line at all', async () => {
    const s = stage()
    await open(s)
    s.state(round())
    expect(screen.getByText(words.building.stopNote)).toBeTruthy()
    expect(screen.queryByText(/so far|left this month/)).toBeNull()
  })
})

/** Each card: the round's needs, its words, whether it is a problem, its buttons and what each sends. */
const CARDS: [
  string,
  Needs,
  string,
  boolean,
  [label: string, route: string, sent: unknown[]][],
][] = [
  [
    'three failed builds, a version serving',
    { kind: 'tries', step: 'build', servingBefore: true },
    words.building.needs.tries('build', true),
    true,
    [
      [words.building.tryDifferent, 'build', ['c-1', 'different']],
      [words.building.stopHere, 'stop', ['c-1']],
    ],
  ],
  [
    'three failed drafts, nothing serving',
    { kind: 'tries', step: 'draft', servingBefore: false },
    words.building.needs.tries('draft', false),
    true,
    [[words.building.tryDifferent, 'build', ['c-1', 'different']]],
  ],
  [
    'the checkpoint',
    { kind: 'checkpoint', capUsd: 2, monthLeftUsd: 10 },
    'This piece of work has used what we allow in one go. Carry on? It can use up to $2 more of the $10 you have this month.',
    false,
    [
      [words.building.carryOn, 'build', ['c-1']],
      [words.building.stopHere, 'stop', ['c-1']],
    ],
  ],
  [
    'the checkpoint, the month unread',
    { kind: 'checkpoint', capUsd: 2, monthLeftUsd: null },
    'This piece of work has used what we allow in one go. Carry on? It can use up to $2 more.',
    false,
    [[words.building.carryOn, 'build', ['c-1']]],
  ],
  [
    'its session ended, the app now confidential (FE-36; Rich: stop and ask first)',
    { kind: 'withdrawn' },
    "Your app now keeps confidential data, so the model we were using can't work on it. Carry on continues with the on-campus model.",
    false,
    [
      [words.building.carryOn, 'build', ['c-1']],
      [words.building.stopHere, 'stop', ['c-1']],
    ],
  ],
  [
    'the month spent',
    { kind: 'month', resetsAt: '2026-10-01T00:00:00.000Z' },
    words.building.needs.month('5pm on 30 September'),
    true,
    [[words.building.stopHere, 'stop', ['c-1']]],
  ],
  [
    'the month spent, its reset unknown',
    { kind: 'month', resetsAt: null },
    words.building.needs.month('5pm on 30 September'),
    true,
    [[words.building.stopHere, 'stop', ['c-1']]],
  ],
  [
    'someone else changed it',
    { kind: 'conflict' },
    words.building.needs.conflict,
    true,
    [
      [words.building.tryAgain, 'build', ['c-1']],
      [words.building.stopHere, 'stop', ['c-1']],
    ],
  ],
  [
    'too many moves',
    { kind: 'moves' },
    words.building.needs.moves,
    true,
    [
      [words.building.carryOn, 'build', ['c-1']],
      [words.building.stopHere, 'stop', ['c-1']],
    ],
  ],
  [
    'Manifest unreachable',
    { kind: 'unreachable', what: 'platform' },
    words.building.needs.unreachable.platform,
    true,
    [
      [words.building.carryOn, 'build', ['c-1']],
      [words.building.stopHere, 'stop', ['c-1']],
    ],
  ],
  [
    'the model unreachable',
    { kind: 'unreachable', what: 'model' },
    words.building.needs.unreachable.model,
    true,
    [
      [words.building.carryOn, 'build', ['c-1']],
      [words.building.stopHere, 'stop', ['c-1']],
    ],
  ],
  [
    'the model stopped answering (F5 Decision 14)',
    { kind: 'stalled', why: 'quiet' },
    'Our model stopped answering before it finished. Nothing is lost.',
    true,
    [
      [words.building.carryOn, 'build', ['c-1']],
      [words.building.stopHere, 'stop', ['c-1']],
    ],
  ],
  [
    'the model went on too long (F5 Decision 14)',
    { kind: 'stalled', why: 'ceiling' },
    "Our model's answer went on far longer than any should, so we stopped it. Nothing is lost.",
    true,
    [
      [words.building.carryOn, 'build', ['c-1']],
      [words.building.stopHere, 'stop', ['c-1']],
    ],
  ],
  [
    'waiting on an administrator',
    { kind: 'refused', code: 'MODEL_NOT_AVAILABLE' },
    words.building.needs.waitingOnAdmin,
    true,
    [
      [words.building.carryOn, 'build', ['c-1']],
      [words.building.stopHere, 'stop', ['c-1']],
    ],
  ],
  [
    "sign-in refused on Manifest's side (FE-37)",
    { kind: 'refused', code: 'SIGN_IN_REFUSED' },
    words.building.needs.signInRefused,
    true,
    [
      [words.building.carryOn, 'build', ['c-1']],
      [words.building.stopHere, 'stop', ['c-1']],
    ],
  ],
  [
    'a refusal we do not name',
    { kind: 'refused', code: 'INTERNAL' },
    words.refused.body,
    true,
    [
      [words.building.carryOn, 'build', ['c-1']],
      [words.building.stopHere, 'stop', ['c-1']],
    ],
  ],
]

describe('what a round needs of them: one card each', () => {
  it.each(CARDS)(
    '%s: its words, its reference if a problem, and its buttons',
    async (_, needs, said, problem, buttons) => {
      for (const [label, route, sent] of [...buttons, [null, null, null] as const]) {
        const s = stage()
        await open(s)
        s.state(
          round(
            { status: 'needs-you', needs, reference: '0000-0C01' },
            { pages: { state: 'halted' } },
          ),
        )
        const card = screen.getByText(said).closest('.mf-card') as HTMLElement
        expect(card).not.toBeNull()
        expect(referenceIn(card) ?? null).toBe(problem ? '0000-0C01' : null)
        for (const [name] of buttons)
          expect(within(card).getByRole('button', { name })).toBeTruthy()
        if (label !== null) {
          await press(within(card).getByRole('button', { name: label }))
          expect(s.called(route)).toEqual([sent])
        }
        cleanup()
      }
    },
  )

  it('M10: a need this page does not know (a newer server) draws a card with a reference, reported, and its buttons, never nothing', async () => {
    const s = stage()
    await open(s)
    s.state(
      round(
        {
          status: 'needs-you',
          needs: { kind: 'handed-over' } as unknown as Needs,
          reference: null,
        },
        { pages: { state: 'halted' } },
      ),
    )
    const card = (await screen.findByText(words.refused.body)).closest(
      '.mf-card',
    ) as HTMLElement
    const reference = referenceIn(card)
    expect(reference).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    await waitFor(() =>
      expect(reports).toEqual([
        expect.objectContaining({
          reference,
          code: 'NEEDS_NOT_DRAWN',
          operation: 'handedOver',
        }),
      ]),
    )
    expect(
      within(card).getByRole('button', { name: words.building.carryOn }),
    ).toBeTruthy()
    expect(
      within(card).getByRole('button', { name: words.building.stopHere }),
    ).toBeTruthy()
  })

  it('M10: a need this page does not know, with a reference the server recorded: that reference, and no second report', async () => {
    const s = stage()
    await open(s)
    s.state(
      round(
        {
          status: 'needs-you',
          needs: { kind: 'handed-over' } as unknown as Needs,
          reference: '0000-0C02',
        },
        { pages: { state: 'halted' } },
      ),
    )
    const card = (await screen.findByText(words.refused.body)).closest(
      '.mf-card',
    ) as HTMLElement
    expect(referenceIn(card)).toBe('0000-0C02')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(reports).toEqual([])
  })

  it('the chip names who has it: Manifest, the model, or them', async () => {
    const s = stage()
    await open(s)
    s.state(
      round({ status: 'needs-you', needs: { kind: 'unreachable', what: 'platform' } }),
    )
    expect(screen.getByText(words.building.chip.waitingOn.platform)).toBeTruthy()
    s.state(round({ status: 'needs-you', needs: { kind: 'unreachable', what: 'model' } }))
    expect(screen.getByText(words.building.chip.waitingOn.model)).toBeTruthy()
    // FE-37: a sign-in the IdP refuses is Manifest's to put right, never theirs.
    s.state(
      round({ status: 'needs-you', needs: { kind: 'refused', code: 'SIGN_IN_REFUSED' } }),
    )
    expect(screen.getByText(words.building.chip.waitingOn.platform)).toBeTruthy()
    s.state(round({ status: 'needs-you', needs: { kind: 'moves' } }))
    expect(screen.getByText(words.building.chip.needsYou)).toBeTruthy()
  })

  it('a thing we cannot add, once built: said with its reference, the lead’s own words in it', async () => {
    const s = stage()
    await open(s)
    s.state(
      round(
        {
          status: 'done',
          needs: { kind: 'cannot', what: 'sending marks to Canvas' },
          reference: '0000-0C02',
        },
        ALL_DONE,
      ),
      { state: 'built' },
    )
    const card = screen
      .getByText(words.building.needs.cannot('sending marks to Canvas'))
      .closest('.mf-card') as HTMLElement
    expect(referenceIn(card)).toBe('0000-0C02')
    expect(
      within(card)
        .queryAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([words.reference.copy])
  })

  it('stopped: nothing is lost, and Carry on sends {}', async () => {
    const s = stage()
    await open(s)
    s.state(round({ status: 'stopped' }, { pages: { state: 'next' } }))
    expect(screen.getByText(words.building.needs.stopped)).toBeTruthy()
    expect(screen.getByText(words.building.chip.stopped)).toBeTruthy()
    // Nothing keeps going: the permission to leave would not be true.
    expect(screen.queryByText(words.building.leave)).toBeNull()
    noButton(words.building.stop)
    await press(button(words.building.carryOn))
    expect(s.called('build')).toEqual([['c-1']])
  })

  it('interrupted by a restart: said with a reference of its own, reported, and Carry on sends {}', async () => {
    const s = stage()
    await open(s)
    s.state(round({ status: 'interrupted' }, { pages: { state: 'halted' } }))
    const card = screen
      .getByText(words.building.needs.interrupted)
      .closest('.mf-card') as HTMLElement
    const reference = referenceIn(card)
    await waitFor(() =>
      expect(reports).toEqual([
        expect.objectContaining({ reference, code: 'ROUND_INTERRUPTED' }),
      ]),
    )
    await press(within(card).getByRole('button', { name: words.building.carryOn }))
    expect(s.called('build')).toEqual([['c-1']])
  })

  it('interrupted, it can be stopped here: a round that holds the app is never kept by a card with no Stop (F4 review I1)', async () => {
    const s = stage()
    await open(s)
    s.state(round({ status: 'interrupted' }, { pages: { state: 'halted' } }))
    const card = screen
      .getByText(words.building.needs.interrupted)
      .closest('.mf-card') as HTMLElement
    await press(within(card).getByRole('button', { name: words.building.stopHere }))
    expect(s.called('stop')).toEqual([['c-1']])
  })
})

describe('a token our server no longer holds (F2 handOverToken), without a word', () => {
  it('Carry on answered TOKEN_MISSING: a token minted, handed over, and Carry on pressed again', async () => {
    const s = stage({
      build: (n) => (n === 1 ? new OurRefusal('TOKEN_MISSING', 409) : undefined),
    })
    await open(s)
    s.state(round({ status: 'stopped' }, { pages: { state: 'next' } }))
    await press(button(words.building.carryOn))
    await waitFor(() => expect(s.called('build')).toHaveLength(2))
    expect(s.calls.map((c) => c[0])).toEqual([
      'build',
      'mintToken',
      'handProject',
      'build',
    ])
    expect(s.called('mintToken')[0]!.slice(0, 2)).toEqual([
      PROJECT.id,
      mintRequest(CONVERSATION.title),
    ])
    expect(s.called('handProject')).toEqual([
      ['c-1', { projectId: PROJECT.id, token: 'mft_test_1' }],
    ])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('needs: token: minted, handed over, and carried on, with no card', async () => {
    const s = stage()
    await open(s)
    s.state(round({ status: 'needs-you', needs: { kind: 'token' } }))
    await waitFor(() => expect(s.called('build')).toEqual([['c-1']]))
    expect(s.calls.map((c) => c[0])).toEqual(['mintToken', 'handProject', 'build'])
    expect(document.querySelectorAll('.mf-card')).toHaveLength(0)
    // The same frame again, while that is under way, and once it is done: once, and unsaid.
    s.state(round({ status: 'needs-you', needs: { kind: 'token' } }))
    await act(async () => undefined)
    s.state(round({ status: 'needs-you', needs: { kind: 'token' } }))
    await act(async () => undefined)
    expect(s.called('mintToken')).toHaveLength(1)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a token refused again straight after: said, with a reference, and Carry on tries once more', async () => {
    const s = stage()
    await open(s)
    s.state(round({ status: 'needs-you', needs: { kind: 'token' } }))
    await waitFor(() => expect(s.called('build')).toHaveLength(1))
    s.state(round({ status: 'working' }))
    s.state(round({ status: 'needs-you', needs: { kind: 'token' } }))
    const notice = await screen.findByRole('alert')
    expect(within(notice).getByText(words.building.couldntPress)).toBeTruthy()
    expect(referenceIn(notice)).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    expect(s.called('mintToken')).toHaveLength(1)
    await press(within(notice).getByRole('button', { name: words.building.tryAgain }))
    await waitFor(() => expect(s.called('mintToken')).toHaveLength(2))
  })
})

describe('questions, inline, as needs-you cards', () => {
  const QUESTION = {
    id: 'q-1',
    ask: 'Should a TA see everything you see?',
    default: "We've built it so only you can.",
    answer: null,
    answered: false,
    secret: false,
  }

  it('one with our default: the ask, what we went on with, and an answer that posts /answers', async () => {
    const s = stage()
    await open(s)
    s.state(round({ questions: [QUESTION] }))
    expect(
      screen.getByText(words.building.question.meanwhile(QUESTION.default)),
    ).toBeTruthy()
    const field = screen.getByLabelText(QUESTION.ask) as HTMLInputElement
    expect(field.type).toBe('text')
    fireEvent.change(field, { target: { value: 'Yes, the TA too.' } })
    await press(button(words.building.question.answer))
    expect(s.called('answer')).toEqual([['c-1', 'q-1', 'Yes, the TA too.']])
    expect(field.value).toBe('')
  })

  it('one the work cannot pass: paused, waiting for them, and waiting, not failing', async () => {
    const s = stage()
    await open(s)
    s.state(round({ status: 'paused', questions: [{ ...QUESTION, default: null }] }), {
      state: 'paused',
    })
    expect(screen.getByText(words.building.chip.paused)).toBeTruthy()
    expect(screen.getByText(words.building.question.waiting)).toBeTruthy()
  })

  it('an answered question asks no more', async () => {
    const s = stage()
    await open(s)
    s.state(
      round({
        questions: [
          { ...QUESTION, answer: 'Yes.', answered: true },
          { ...QUESTION, id: 'q-2', ask: 'How many weeks?' },
        ],
      }),
    )
    expect(screen.getByLabelText('How many weeks?')).toBeTruthy()
    expect(screen.queryByLabelText(QUESTION.ask)).toBeNull()
  })

  it('a secret: a password field that says its least before it is sent, and never keeps the value on the page', async () => {
    const s = stage()
    await open(s)
    const secret = {
      ...QUESTION,
      id: 'q-2',
      ask: 'The key the app uses to reach the library catalogue',
      default: null,
      secret: true,
    }
    s.state(round({ status: 'paused', questions: [secret] }), { state: 'paused' })
    const field = screen.getByLabelText(secret.ask) as HTMLInputElement
    expect(field.type).toBe('password')
    fireEvent.change(field, { target: { value: 'abc' } })
    expect(screen.getByText(words.building.question.secretShort)).toBeTruthy()
    expect((button(words.building.question.answer) as HTMLButtonElement).disabled).toBe(
      true,
    )
    fireEvent.change(field, { target: { value: 'cat-key-123456' } })
    await press(button(words.building.question.answer))
    expect(s.called('answer')).toEqual([['c-1', 'q-2', 'cat-key-123456']])
    expect(document.documentElement.outerHTML).not.toContain('cat-key-123456')
    for (const input of document.querySelectorAll('input'))
      expect(input.value).not.toContain('cat-key-123456')
  })

  it('a secret answered with no token held (a restart): one handed over, and the answer sent again', async () => {
    const s = stage({
      answer: (n) => (n === 1 ? new OurRefusal('TOKEN_MISSING', 409) : undefined),
    })
    await open(s)
    const secret = { ...QUESTION, default: null, secret: true }
    s.state(round({ status: 'paused', questions: [secret] }), { state: 'paused' })
    fireEvent.change(screen.getByLabelText(secret.ask), {
      target: { value: 'cat-key-123456' },
    })
    await press(button(words.building.question.answer))
    await waitFor(() => expect(s.called('answer')).toHaveLength(2))
    expect(s.calls.map((c) => c[0])).toEqual([
      'answer',
      'mintToken',
      'handProject',
      'answer',
    ])
    expect(document.documentElement.outerHTML).not.toContain('cat-key-123456')
  })
})

describe('their messages, at any time', () => {
  it('the box posts /messages and empties; the frame then says "Got it, after this step." under the step at work', async () => {
    const s = stage()
    await open(s)
    s.state(round({ line: 'Writing the page students post on.' }))
    const box = screen.getByLabelText(
      words.building.thread.messageLabel,
    ) as HTMLInputElement
    fireEvent.change(box, { target: { value: 'Also add a word count.' } })
    await press(button(words.building.thread.send))
    expect(s.called('message')).toEqual([['c-1', 'Also add a word count.']])
    expect(box.value).toBe('')
    s.state(round({ line: 'Writing the page students post on.', messageWaiting: true }))
    const pages = stepItem(words.building.steps.pages)
    expect(pages.querySelector('[aria-live="polite"]')?.textContent).toBe(
      words.building.gotIt,
    )
  })

  it('over 500 characters: the count says so, and Send waits', async () => {
    const s = stage()
    await open(s)
    s.state(round())
    fireEvent.change(screen.getByLabelText(words.building.thread.messageLabel), {
      target: { value: 'x'.repeat(501) },
    })
    expect(screen.getByText(words.limits.over('501', '500'))).toBeTruthy()
    expect((button(words.building.thread.send) as HTMLButtonElement).disabled).toBe(true)
  })

  it('a blank message is never sent', async () => {
    const s = stage()
    await open(s)
    s.state(round())
    fireEvent.change(screen.getByLabelText(words.building.thread.messageLabel), {
      target: { value: '   ' },
    })
    expect((button(words.building.thread.send) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('Stop', () => {
  it('posts /stop, and says what is still true', async () => {
    const s = stage()
    await open(s)
    s.state(round())
    expect(screen.getByText(words.building.stopNote)).toBeTruthy()
    await press(button(words.building.stop))
    expect(s.called('stop')).toEqual([['c-1']])
  })

  it('a Stop our server refused: said, with a reference reported as the stop, and Try again stops again', async () => {
    const s = stage({
      stop: (n) => (n === 1 ? new OurRefusal('INTERNAL', 500) : undefined),
    })
    await open(s)
    s.state(round())
    await press(button(words.building.stop))
    const notice = await screen.findByRole('alert')
    expect(within(notice).getByText(words.building.couldntPress)).toBeTruthy()
    const reference = referenceIn(notice)
    await waitFor(() =>
      expect(reports).toEqual([
        expect.objectContaining({
          reference,
          code: 'INTERNAL',
          operation: 'stop',
          status: 500,
        }),
      ]),
    )
    await press(within(notice).getByRole('button', { name: words.building.tryAgain }))
    expect(s.called('stop')).toHaveLength(2)
  })

  it('Carry on while the stopped work finishes (CONVERSATION_BUSY): said plainly, and Try again presses again', async () => {
    const s = stage({
      build: (n) => (n === 1 ? new OurRefusal('CONVERSATION_BUSY', 409) : undefined),
    })
    await open(s)
    s.state(round({ status: 'stopped' }, { pages: { state: 'next' } }))
    await press(button(words.building.carryOn))
    expect(await screen.findByText(words.building.busy)).toBeTruthy()
    expect(reports).toEqual([])
    await press(button(words.building.tryAgain))
    expect(s.called('build')).toEqual([['c-1'], ['c-1']])
  })

  it('a session that ends while they press: signed out, as everywhere', async () => {
    const s = stage({ stop: () => new OurRefusal('UNAUTHENTICATED', 401) })
    await open(s)
    s.state(round())
    await press(button(words.building.stop))
    expect(await screen.findByText(words.expired.body)).toBeTruthy()
  })
})

describe('the conversation, on the left', () => {
  it('their words; their messages and answers; our sentences; an earlier round folded, with What changed', async () => {
    const s = stage()
    await open(s)
    const thread: Said[] = [
      {
        kind: 'explained',
        round: 1,
        step: 'build',
        sentence:
          "The first build didn't take. We fixed a missing piece and built it again.",
        at: '2026-09-28T16:05:00.000Z',
      },
      { kind: 'fallback', round: 1, at: '2026-09-28T16:06:00.000Z' },
      { kind: 'campus', round: 1, at: '2026-09-28T16:07:00.000Z' },
      { kind: 'carried', round: 1, at: '2026-09-28T16:08:00.000Z' },
      {
        kind: 'built',
        round: 1,
        changed: 'One page listing the weeks. The rule about who sees what',
        cannot: 'sending marks to Canvas',
        at: '2026-09-28T16:12:00.000Z',
      },
      {
        kind: 'message',
        round: 2,
        text: 'Also add a word count.',
        at: '2026-09-28T16:20:00.000Z',
      },
      {
        kind: 'answer',
        round: 2,
        ask: 'Should a TA see everything you see?',
        text: 'Yes, the TA too.',
        at: '2026-09-28T16:21:00.000Z',
      },
      {
        kind: 'answer',
        round: 2,
        ask: 'The key the app uses to reach the library catalogue',
        text: null,
        at: '2026-09-28T16:22:00.000Z',
      },
    ]
    s.state(round({ round: 2 }), {}, thread)
    const talk = screen.getByRole('region', { name: words.building.thread.label })
    expect(within(talk).getByText(CONVERSATION.description)).toBeTruthy()
    expect(
      within(talk).getByText(
        "The first build didn't take. We fixed a missing piece and built it again.",
      ),
    ).toBeTruthy()
    expect(within(talk).getByText(words.building.fallback)).toBeTruthy()
    expect(within(talk).getByText(words.building.campus)).toBeTruthy()
    // Rich, 2026-09-29: the platform withdrew the session, and we carried on by ourselves.
    expect(
      within(talk).getByText('Your app now keeps confidential data. We carried on.'),
    ).toBeTruthy()
    // 16:12 UTC is 9:12am in Vancouver.
    expect(
      within(talk).getByText(words.building.thread.built('28 Sep, 9:12am')),
    ).toBeTruthy()
    const folded = within(talk).getByText(words.building.whatChanged, {
      selector: 'summary',
    })
    const what = folded.closest('details')!
    expect(what.open).toBe(false)
    expect(within(what).getByText(/One page listing the weeks/)).toBeTruthy()
    expect(
      within(what).getByText(words.building.needs.cannot('sending marks to Canvas')),
    ).toBeTruthy()
    expect(within(talk).getByText('Also add a word count.')).toBeTruthy()
    expect(within(talk).getByText('Should a TA see everything you see?')).toBeTruthy()
    expect(within(talk).getByText('Yes, the TA too.')).toBeTruthy()
    expect(within(talk).getByText(words.building.thread.secretGiven)).toBeTruthy()
    // Whose words, in words: never colour alone.
    expect(
      within(talk).getAllByText(words.building.thread.you).length,
    ).toBeGreaterThanOrEqual(3)
  })
})

describe('built (Decision 16)', () => {
  it('every step done, the round folded, and a change arriving next', async () => {
    const s = stage()
    await open(s)
    s.state(
      round(
        {
          status: 'done',
          draft: { address: DRAFT, serving: true, lastAttempt: 'healthy' },
        },
        ALL_DONE,
      ),
      { state: 'built' },
      [
        {
          kind: 'built',
          round: 1,
          changed: 'One page listing the weeks',
          cannot: null,
          at: '2026-09-28T16:12:00.000Z',
        },
      ],
    )
    for (const key of KEYS)
      expect(stepItem(words.building.steps[key]).className).toContain('mf-step--done')
    expect(screen.getByText(words.building.chip.built)).toBeTruthy()
    expect(screen.getByText(words.building.thread.built('28 Sep, 9:12am'))).toBeTruthy()
    // F4 Task 9: once built, the box is open again, and a message is the next change.
    expect(screen.getByLabelText('What should change next?')).toBeTruthy()
    expect(screen.queryByLabelText(words.building.thread.messageLabel)).toBeNull()
    noButton(words.building.stop)
  })

  it('the work ends: "Ready on your draft address.", [Try it] opening the Preview’s draft, and [Put this version on trying-out] (F4 Task 10)', async () => {
    const s = stage()
    const serving = {
      id: 'i-1',
      environmentId: 'e-sandbox',
      releaseId: 'r-1',
      kind: 'web' as const,
      state: 'healthy' as const,
      lastSeenAt: null,
    }
    s.platform.listEnvironments = () =>
      Promise.resolve([
        { id: 'e-sandbox', kind: 'sandbox', instance: serving },
        { id: 'e-staging', kind: 'staging', instance: null },
      ] as Schemas['EnvironmentList'])
    await open(s)
    s.state(
      round(
        {
          status: 'done',
          draft: { address: DRAFT, serving: true, lastAttempt: 'healthy' },
        },
        ALL_DONE,
      ),
      { state: 'built' },
    )
    const work = screen.getByRole('region', { name: words.building.workLabel })
    expect(within(work).getByText(words.building.startedAndAnswered)).toBeTruthy()
    expect(within(work).getByText(words.tryingOut.ready)).toBeTruthy()
    const tryIt = within(work).getByRole('link', { name: words.tryingOut.tryIt })
    expect(tryIt.getAttribute('href')).toBe(`/apps/${PROJECT.slug}?tab=draft`)
    expect(
      await within(work).findByRole('button', { name: words.tryingOut.put }),
    ).toBeTruthy()
    expect(machineryIn(wordsShown())).toEqual([])
  })

  it('while it works, the work does not end: no [Try it], no trying-out', async () => {
    const s = stage()
    await open(s)
    s.state(round())
    expect(screen.queryByText(words.tryingOut.ready)).toBeNull()
    expect(screen.queryByRole('link', { name: words.tryingOut.tryIt })).toBeNull()
  })

  it('a question we went on with is said as what we went with, never an answer our server would refuse once built', async () => {
    const s = stage()
    await open(s)
    const question = {
      id: 'q-1',
      ask: 'How many students should the count of who has not posted assume?',
      default: "We'll show the number of responses received.",
      answer: null,
      answered: false,
      secret: false,
    }
    s.state(
      round(
        {
          status: 'done',
          draft: { address: DRAFT, serving: true, lastAttempt: 'healthy' },
          questions: [question],
        },
        ALL_DONE,
      ),
      { state: 'built' },
    )
    const talk = screen.getByRole('region', { name: words.building.thread.label })
    expect(within(talk).getByText(question.ask)).toBeTruthy()
    expect(
      within(talk).getByText(words.building.question.wentWith(question.default)),
    ).toBeTruthy()
    expect(screen.queryByLabelText(question.ask)).toBeNull()
    noButton(words.building.question.answer)
    expect(
      within(talk).queryByText(words.building.question.meanwhile(question.default)),
    ).toBeNull()
  })
})

describe('Reconnecting… (the page’s stream reopening)', () => {
  it('said quietly while the stream is down, and gone at its next frame', async () => {
    const s = stage()
    await open(s)
    s.state(round())
    act(() => {
      s.sources[0]!.readyState = 0
      s.sources[0]!.onerror?.(new Event('error'))
    })
    expect(screen.getByText(words.building.reconnecting).getAttribute('role')).toBe(
      'status',
    )
    s.state(round())
    expect(screen.queryByText(words.building.reconnecting)).toBeNull()
  })
})

describe('no machinery shown, and never "It works" (C3)', () => {
  it('a round at its busiest: a failed draft, the platform’s words, a question, the cost, the address', async () => {
    const s = stage()
    await open(s)
    s.state(
      round(
        {
          status: 'working',
          line: 'Putting it on your draft address again.',
          draft: { address: DRAFT, serving: true, lastAttempt: 'failed' },
          cost: { conversationUsd: 0.4, monthLeftUsd: 9.6, resetsAt: null },
          questions: [
            {
              id: 'q-1',
              ask: 'Should a TA see everything you see?',
              default: "We've built it so only you can.",
              answer: null,
              answered: false,
              secret: false,
            },
          ],
        },
        {
          pages: {
            state: 'done',
            changed: 'One page listing the weeks',
            exact: ['public/weeks.html'],
          },
          holds: { state: 'done', exact: [] },
          build: { state: 'done' },
          draft: {
            state: 'now',
            tries: 1,
            note: 'It stopped as it started',
            exact: [
              'Error [ERR_MODULE_NOT_FOUND]: Cannot find module',
              'readiness probe failed: the instance is not healthy in the sandbox environment',
            ],
          },
        },
      ),
      {},
      [
        {
          kind: 'explained',
          round: 1,
          step: 'draft',
          sentence: 'It stopped as it started. We are putting it back together.',
          at: '2026-09-28T16:05:00.000Z',
        },
      ],
    )
    // Drawn: the line, the two facts, the question, the cost, and the platform's words shut away.
    expect(screen.getByText(words.building.stepLine.draft)).toBeTruthy()
    expect(screen.queryByText('Putting it on your draft address again.')).toBeNull()
    expect(screen.getByText(words.building.facts.attemptFailed)).toBeTruthy()
    expect(screen.getByLabelText('Should a TA see everything you see?')).toBeTruthy()
    expect(screen.getByText('$0.40 so far · $9.60 left this month')).toBeTruthy()
    expect(disclosure(new RegExp(words.building.exactWords)).textContent).toContain(
      'ERR_MODULE_NOT_FOUND',
    )
    expect(machineryIn(wordsShown())).toEqual([])
    expect(document.body.textContent).not.toMatch(/it works/i)
  })
})

/**
 * RICH'S F3 DECISIONS (2026-09-28), ON THE BUILDING SCREEN (F4 Task 3): the line under each step
 * after the pages is ours; a Stop he chose is still, not red; What changed is one account a
 * round, the commits' own behind the disclosure with their files.
 */
describe("Rich's F3 decisions", () => {
  const LEADS = 'Students can save private answers, and you can review and post them.'
  const AFTER = ['holds', 'build', 'draft', 'answers'] as const

  it.each([...AFTER])('under %s, the line is ours, never the lead’s', async (key) => {
    const s = stage()
    await open(s)
    const steps = Object.fromEntries(
      KEYS.map((k) => [
        k,
        {
          state:
            KEYS.indexOf(k) < KEYS.indexOf(key)
              ? ('done' as const)
              : k === key
                ? ('now' as const)
                : ('next' as const),
        },
      ]),
    )
    s.state(round({ line: LEADS }, steps))
    const live = document.querySelectorAll('.mf-step [aria-live="polite"]')
    expect(live).toHaveLength(1)
    expect(live[0]!.closest('li')).toBe(stepItem(words.building.steps[key]))
    expect(live[0]!.textContent).toBe(words.building.stepLine[key])
    expect(document.body.textContent).not.toContain(LEADS)
  })

  it('under Writing the pages, the line is the lead’s own', async () => {
    const s = stage()
    await open(s)
    s.state(round({ line: 'Writing the page students post on.' }))
    expect(
      stepItem(words.building.steps.pages).querySelector('[aria-live="polite"]')
        ?.textContent,
    ).toBe('Writing the page students post on.')
  })

  it('a Stop they chose is still: no step in red, the chip not yet and still, the card not red, and Carry on', async () => {
    const s = stage()
    await open(s)
    s.state(
      round(
        { status: 'stopped', line: LEADS },
        { pages: { state: 'done' }, holds: { state: 'done' }, build: { state: 'next' } },
      ),
    )
    expect(document.querySelector('.mf-step--halted')).toBeNull()
    expect(document.querySelector('.mf-step--now')).toBeNull()
    const chip = screen.getByText(words.building.chip.stopped)
    expect(words.building.chip.stopped).toBe('Stopped. Nothing is lost.')
    expect(chip.className).toContain('mf-is-notyet')
    expect(chip.querySelector('.mf-pulse')).toBeNull()
    expect(document.querySelector('.mf-card--attention')).toBeNull()
    expect(document.querySelector('[class*="mf-is-attention"]')).toBeNull()
    expect(button(words.building.carryOn)).toBeTruthy()
    // Stopped, nothing is moving: no line under any step.
    expect(document.querySelectorAll('.mf-step [aria-live]')).toHaveLength(0)
  })

  it("What changed is the round's one sentence, the same folded in the thread; each commit's account is behind the disclosure with its files", async () => {
    const s = stage()
    await open(s)
    const ACCOUNT = 'Students post on a weekly page, and only you see every response.'
    s.state(
      round(
        { status: 'done' },
        {
          ...ALL_DONE,
          pages: {
            state: 'done',
            changed: ACCOUNT,
            exact: [
              'One page listing the weeks.',
              'public/weeks.html',
              'The rule about who sees what.',
              'config/staff.json',
            ],
          },
        },
      ),
      { state: 'built' },
      [
        {
          kind: 'built',
          round: 1,
          changed: ACCOUNT,
          cannot: null,
          at: '2026-09-28T16:12:00.000Z',
        },
      ],
    )
    const pages = stepItem(words.building.steps.pages)
    const what = within(pages)
      .getByText(words.building.whatChanged, { selector: 'summary' })
      .closest('details')!
    expect(what.querySelector('.building__changed')?.textContent).toBe(ACCOUNT)
    const exact = within(what)
      .getByText(words.building.exactChanges, { exact: false })
      .closest('details')!
    expect(exact.querySelector('.mf-log')?.textContent).toContain(
      'The rule about who sees what.',
    )
    const talk = screen.getByRole('region', { name: words.building.thread.label })
    const folded = within(talk)
      .getByText(words.building.whatChanged, { selector: 'summary' })
      .closest('details')!
    expect(folded.querySelector('p')?.textContent).toBe(ACCOUNT)
  })

  it('while it writes, the commits so far are the exact changes, never the exact words', async () => {
    const s = stage()
    await open(s)
    s.state(
      round(
        { line: 'Writing the page students post on.' },
        {
          pages: {
            state: 'now',
            exact: ['One page listing the weeks.', 'public/weeks.html'],
          },
        },
      ),
    )
    const pages = stepItem(words.building.steps.pages)
    expect(
      within(pages).getByText(words.building.exactChanges, { exact: false }).textContent,
    ).toBe(`${words.building.exactChanges} · 2 lines`)
    expect(
      within(pages).queryByText(words.building.exactWords, { exact: false }),
    ).toBeNull()
  })

  it('a conflict is no try: Writing the pages is never "(second try)"', async () => {
    const s = stage()
    await open(s)
    s.state(round({}, { pages: { state: 'now', tries: 0 } }))
    expect(stepItem(words.building.steps.pages).textContent).not.toMatch(/try\)/)
  })
})

/**
 * THE RAIL'S PROJECT SECTION ON A CONVERSATION (F4 Task 5, Decision 1): once the conversation's
 * project exists, the rail names it and offers its Preview and Conversations.
 */
describe("the rail's project section, on a conversation", () => {
  const nav = () => screen.getByRole('navigation', { name: 'Manifest' })

  it('shows once its project exists: the name, Preview and Conversations; Start something new stays current', async () => {
    const s = stage()
    await open(s)
    s.state(round())
    await waitFor(() =>
      expect(nav().querySelector('.mf-rail__over')?.textContent).toBe(PROJECT.name),
    )
    expect(
      within(nav())
        .getByRole('link', { name: words.preview.rail.preview })
        .getAttribute('href'),
    ).toBe(`/apps/${PROJECT.slug}`)
    expect(
      within(nav())
        .getByRole('link', { name: words.preview.rail.conversations })
        .getAttribute('href'),
    ).toBe(`/apps/${PROJECT.slug}/conversations`)
    expect(nav().querySelector('[aria-current="page"]')?.textContent).toBe(
      words.shell.startNew,
    )
  })

  it('not before it has one', async () => {
    const s = stage()
    await open(s)
    s.say({
      kind: 'state',
      conversation: { ...CONVERSATION, projectId: null, state: 'naming' },
      intake: { ...INTAKE, project: null },
      plan: null,
      round: null,
      thread: [],
      piece: null,
      line: null,
    })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(nav().querySelector('.mf-rail__over')).toBeNull()
  })
})
