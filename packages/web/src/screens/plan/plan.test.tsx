// @vitest-environment jsdom
import type { Schemas } from '@manifest/contract'
import type {
  Conversation,
  Intake,
  PlanView,
  Progress,
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

/**
 * MOMENT 5 (F2 Task 9), through the whole App: the plan written, corrected and agreed, with
 * our API and the stream stood in for, so every press can be seen reaching our server and
 * every frame seen changing the page. The words are the walk-through's, and Rich's.
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
  state: 'making',
  description: "A page where students post a response to the week's reading.",
  createdAt: '2026-09-27T20:00:00.000Z',
  updatedAt: '2026-09-27T20:00:00.000Z',
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
const PLAN: PlanView = {
  studentsSee: 'One page listing the weeks.',
  youSee: 'Every response for a week on one page.',
  itKeeps: 'The text students write, their name, and when they posted it.',
  whoGetsIn: "Anyone with a CWL can sign in. We can't limit it to your class yet.",
  ai: 'None. You didn’t ask for it.',
  assumed: ['Twelve weeks, matching a standard term'],
  onlyYouKnow: [
    { id: 'late', ask: 'Is a late post still a post, or does it close at the deadline?' },
    { id: 'ta', ask: 'Should a TA see everything you see?' },
  ],
  changed: [],
}

class FakeSource implements StreamSource {
  readyState = 0
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  close() {
    this.readyState = 2
  }
}

const never = () => new Promise<never>(() => undefined)

function stage(options: { mint?: (n: number) => unknown } = {}) {
  const sources: FakeSource[] = []
  const calls: [string, ...unknown[]][] = []
  const watches: { ready: () => void; fail: () => void; closed: boolean }[] = []
  let mints = 0
  const platform: Platform = {
    getMe: () => Promise.resolve(ME),
    listProjects: () => Promise.resolve([]),
    getProject: never,
    getRelease: never,
    startIntakeSession: () => {
      calls.push(['startIntakeSession'])
      return never()
    },
    endIntakeSession: never,
    checkSlug: never,
    listBlueprints: never,
    createProject: never,
    mintToken: (projectId, body, key) => {
      calls.push(['mintToken', projectId, body, key])
      mints++
      const trouble = options.mint?.(mints)
      if (trouble !== undefined) return Promise.reject(trouble)
      return Promise.resolve({
        token: { id: `t-${mints}` },
        secret: `mft_test_${mints}`,
      } as Schemas['MintedToken'])
    },
    watchProject: (projectId) => {
      calls.push(['watchProject', projectId])
      let ready!: () => void
      let fail!: () => void
      const settled = new Promise<void>((resolve, reject) => {
        ready = resolve
        fail = () => reject(new Error('closed'))
      })
      settled.catch(() => undefined)
      const watch = { ready, fail, closed: false }
      watches.push(watch)
      return { ready: settled, close: () => void (watch.closed = true) }
    },
  }
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args])
      return Promise.resolve()
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
    conversation: Partial<Conversation>,
    plan: { version: number; plan: PlanView } | null = null,
  ) =>
    say({
      kind: 'state',
      conversation: { ...CONVERSATION, ...conversation },
      intake: INTAKE,
      plan,
    })
  const called = (name: string) =>
    calls.filter((c) => c[0] === name).map((c) => c.slice(1))
  return { platform, ours, say, state, called, sources, watches }
}

const reports: Record<string, unknown>[] = []
beforeEach(() => {
  reports.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/problems') {
        const report = JSON.parse(String(init?.body)) as Record<string, unknown>
        // Our server's own rule for a report's operation (api/problems.ts).
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

const text = () =>
  [...document.body.querySelectorAll('*')]
    .flatMap((el) =>
      [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? ''),
    )
    .join(' ')

async function open(s: ReturnType<typeof stage>, now = new Date('2026-09-27T20:00:00Z')) {
  render(
    <App
      platform={s.platform}
      ours={s.ours}
      timeZone="America/Vancouver"
      now={() => now}
    />,
  )
  await waitFor(() => expect(s.sources).toHaveLength(1))
}
const press = (button: HTMLElement) =>
  act(async () => {
    fireEvent.click(button)
  })
const referenceIn = (notice: HTMLElement) =>
  /quote ([0-9A-F]{4}-[0-9A-F]{4})\./.exec(notice.textContent ?? '')?.[1]
const step = (text: string) => screen.getByText(text).closest('li')!.className

describe('from Make it to the plan (moment 4 → 5)', () => {
  it('once Making it’s replay is done, the plan is asked for, once', async () => {
    const s = stage()
    await open(s)
    s.state({ state: 'making' })
    await waitFor(() => expect(s.watches).toHaveLength(1))
    expect(s.called('plan')).toEqual([])
    await act(async () => s.watches[0]!.ready())
    await waitFor(() => expect(s.called('plan')).toEqual([['c-1']]))
    s.state({ state: 'making' })
    expect(s.called('plan')).toHaveLength(1)
  })

  it('a stream that could not be opened never holds the plan up', async () => {
    const s = stage()
    await open(s)
    s.state({ state: 'making' })
    await waitFor(() => expect(s.watches).toHaveLength(1))
    await act(async () => s.watches[0]!.fail())
    await waitFor(() => expect(s.called('plan')).toEqual([['c-1']]))
  })
})

describe('the plan being written (moment 5’s wait)', () => {
  it('two steps, each ticking on its real completion, and nothing to press meanwhile', async () => {
    const s = stage()
    await open(s)
    s.state({ state: 'planning' })
    s.say({ kind: 'step', step: 'reading', state: 'now' })
    expect(screen.getByRole('heading', { name: PROJECT.name })).toBeTruthy()
    expect(step(words.steps.reading)).toContain('mf-step--now')
    expect(step(words.steps.writing)).toContain('mf-step--next')
    s.say({ kind: 'step', step: 'reading', state: 'done' })
    s.say({ kind: 'step', step: 'writing', state: 'now' })
    expect(step(words.steps.reading)).toContain('mf-step--done')
    expect(step(words.steps.writing)).toContain('mf-step--now')
    expect(screen.queryByRole('button', { name: words.describe.carryOn })).toBeNull()
    expect(machineryIn(text())).toEqual([])
  })

  it('Review Focus 5: nothing at work after a restart is Carry on, never a working state; our server has no token, so one is minted and handed over, and the plan asked again', async () => {
    const s = stage()
    const plans: string[] = []
    s.ours.plan = (id) => {
      plans.push(id)
      return plans.length === 1
        ? Promise.reject(new OurRefusal('TOKEN_MISSING', 409))
        : Promise.resolve()
    }
    await open(s)
    s.state({ state: 'planning' })
    expect(document.querySelector('.mf-step--now')).toBeNull()
    await press(screen.getByRole('button', { name: words.describe.carryOn }))
    await waitFor(() => expect(plans).toHaveLength(2))
    const [[projectId, mint, key]] = s.called('mintToken') as [
      [string, Schemas['MintTokenRequest'], string],
    ]
    expect(projectId).toBe(PROJECT.id)
    expect(mint.capabilities).toContain('agent:session')
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
    expect(s.called('handProject')).toEqual([
      ['c-1', { projectId: PROJECT.id, token: 'mft_test_1' }],
    ])
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('the plan (moment 5)', () => {
  async function planReady(s: ReturnType<typeof stage>, plan: PlanView = PLAN) {
    await open(s)
    s.state({ state: 'plan-ready' }, { version: 1, plan })
  }

  it('Here’s what we’d build: the name at the top, five rows, what we assumed, what only they know with a field each, and saying yes', async () => {
    const s = stage()
    await planReady(s)
    expect(screen.getByRole('heading', { name: PROJECT.name })).toBeTruthy()
    expect(screen.getByRole('heading', { name: words.plan.title })).toBeTruthy()
    expect(screen.getByText(words.plan.lead)).toBeTruthy()
    for (const [row, label] of Object.entries(words.plan.rows))
      expect(screen.getByText(label).closest('.plan__row')?.textContent).toContain(
        PLAN[row as keyof typeof words.plan.rows],
      )
    expect(screen.getByText(PLAN.assumed[0]!)).toBeTruthy()
    expect(screen.getByText(words.plan.onlyYouKnow(2))).toBeTruthy()
    for (const q of PLAN.onlyYouKnow) expect(screen.getByLabelText(q.ask)).toBeTruthy()
    expect(screen.getByText(words.plan.yesTitle)).toBeTruthy()
    expect(screen.getByText(words.plan.yesBody)).toBeTruthy()
    expect(screen.getByRole('button', { name: words.plan.yes })).toBeTruthy()
    expect(screen.getByRole('button', { name: words.plan.notQuite })).toBeTruthy()
    expect(screen.queryByText(words.plan.changed)).toBeNull()
    expect(machineryIn(text())).toEqual([])
  })

  it('Not quite: one sentence, sent; the plan comes back with the changed row marked, and only it', async () => {
    const s = stage()
    await planReady(s)
    await press(screen.getByRole('button', { name: words.plan.notQuite }))
    fireEvent.change(screen.getByLabelText(words.plan.correctionLabel), {
      target: { value: 'My TA should see everything too.' },
    })
    await press(screen.getByRole('button', { name: words.describe.carryOn }))
    expect(s.called('correct')).toEqual([['c-1', 'My TA should see everything too.']])
    s.state({ state: 'planning' }, { version: 1, plan: PLAN })
    s.say({ kind: 'step', step: 'reading', state: 'now' })
    expect(step(words.steps.reading)).toContain('mf-step--now')
    s.state(
      { state: 'plan-ready' },
      {
        version: 2,
        plan: {
          ...PLAN,
          youSee: 'Every response, and your TA too.',
          changed: ['youSee'],
        },
      },
    )
    const marked = [...document.querySelectorAll('.plan__row')].filter((row) =>
      row.textContent?.includes(words.plan.changed),
    )
    expect(marked.map((row) => row.textContent)).toEqual([
      expect.stringContaining(words.plan.rows.youSee),
    ])
  })

  it('Yes, build that: their answers go with it; saving, then agreed', async () => {
    const s = stage()
    await planReady(s)
    fireEvent.change(screen.getByLabelText(PLAN.onlyYouKnow[0]!.ask), {
      target: { value: 'It closes at the deadline.' },
    })
    await press(screen.getByRole('button', { name: words.plan.yes }))
    expect(s.called('agree')).toEqual([['c-1', { late: 'It closes at the deadline.' }]])
    s.say({ kind: 'step', step: 'agreeing', state: 'now' })
    expect(screen.getByText(words.steps.agreeing)).toBeTruthy()
    expect(screen.queryByRole('button', { name: words.plan.yes })).toBeNull()
    s.say({ kind: 'step', step: 'agreeing', state: 'done' })
    s.state({ state: 'agreed' }, { version: 1, plan: PLAN })
    expect(screen.getByText(words.plan.agreed)).toBeTruthy()
  })

  it('a commit refused: said, with its reference, and Try again sends the same answers', async () => {
    const s = stage()
    await planReady(s)
    fireEvent.change(screen.getByLabelText(PLAN.onlyYouKnow[1]!.ask), {
      target: { value: 'Yes' },
    })
    await press(screen.getByRole('button', { name: words.plan.yes }))
    s.say({ kind: 'step', step: 'agreeing', state: 'halted' })
    s.say({ kind: 'refusal', code: 'SOURCE_CONFLICT', reference: '0000-00A1' })
    const notice = await screen.findByRole('alert')
    expect(within(notice).getByText(words.plan.couldntSave)).toBeTruthy()
    expect(within(notice).getByText(words.reference.line('0000-00A1'))).toBeTruthy()
    await press(within(notice).getByRole('button', { name: words.describe.tryAgain }))
    expect(s.called('agree')).toEqual([
      ['c-1', { ta: 'Yes' }],
      ['c-1', { ta: 'Yes' }],
    ])
  })
})

describe('the final review’s findings on the plan', () => {
  it('Critical 1: a correction our server refused is tried again as a correction, never agreed', async () => {
    const s = stage()
    let refusals = 1
    const correct = s.ours.correct
    s.ours.correct = (...args) =>
      refusals-- > 0
        ? Promise.reject(new OurRefusal('UNREACHABLE', null))
        : correct(...args)
    await open(s)
    s.state({ state: 'plan-ready' }, { version: 1, plan: PLAN })
    await press(screen.getByRole('button', { name: words.plan.notQuite }))
    fireEvent.change(screen.getByLabelText(words.plan.correctionLabel), {
      target: { value: 'My TA should see everything too.' },
    })
    await press(screen.getByRole('button', { name: words.describe.carryOn }))
    const notice = await screen.findByRole('alert')
    expect(within(notice).getByText(words.plan.couldntWrite)).toBeTruthy()
    await press(within(notice).getByRole('button', { name: words.describe.carryOn }))
    expect(s.called('agree')).toEqual([])
    expect(s.called('correct')).toEqual([['c-1', 'My TA should see everything too.']])
  })

  it('Important 4: only the questions the plan now asks are answered, whatever was typed for an earlier version', async () => {
    const s = stage()
    await open(s)
    s.state({ state: 'plan-ready' }, { version: 1, plan: PLAN })
    fireEvent.change(screen.getByLabelText(PLAN.onlyYouKnow[1]!.ask), {
      target: { value: 'Yes' },
    })
    s.state(
      { state: 'plan-ready' },
      {
        version: 2,
        plan: { ...PLAN, onlyYouKnow: [PLAN.onlyYouKnow[0]!], changed: ['youSee'] },
      },
    )
    fireEvent.change(screen.getByLabelText(PLAN.onlyYouKnow[0]!.ask), {
      target: { value: 'It closes.' },
    })
    await press(screen.getByRole('button', { name: words.plan.yes }))
    expect(s.called('agree')).toEqual([['c-1', { late: 'It closes.' }]])
  })

  it('Important 9: a token is renewed once per failure, not once per page: after a step is done, a later refusal renews again', async () => {
    const s = stage()
    await open(s)
    s.state({ state: 'planning' })
    s.say({ kind: 'step', step: 'reading', state: 'halted' })
    s.say({ kind: 'refusal', code: 'TOKEN_REFUSED', reference: '0000-00B1' })
    await waitFor(() => expect(s.called('plan')).toHaveLength(1))
    s.say({ kind: 'step', step: 'reading', state: 'now' })
    s.say({ kind: 'step', step: 'reading', state: 'done' })
    s.say({ kind: 'step', step: 'writing', state: 'now' })
    s.say({ kind: 'step', step: 'writing', state: 'halted' })
    s.say({ kind: 'refusal', code: 'TOKEN_REFUSED', reference: '0000-00B2' })
    await waitFor(() => expect(s.called('plan')).toHaveLength(2))
    expect(s.called('mintToken')).toHaveLength(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('Important 9: a step done long ago is not progress: two refusals with nothing done between them are said, never a loop of renewals', async () => {
    const s = stage()
    await open(s)
    s.state({ state: 'planning' })
    // The first plan was written: both steps are done on this connection.
    s.say({ kind: 'step', step: 'reading', state: 'now' })
    s.say({ kind: 'step', step: 'reading', state: 'done' })
    s.say({ kind: 'step', step: 'writing', state: 'now' })
    s.say({ kind: 'step', step: 'writing', state: 'done' })
    // A correction's reading fails, is renewed, and fails again at once.
    s.say({ kind: 'step', step: 'reading', state: 'now' })
    s.say({ kind: 'step', step: 'reading', state: 'halted' })
    s.say({ kind: 'refusal', code: 'TOKEN_REFUSED', reference: '0000-00B3' })
    await waitFor(() => expect(s.called('plan')).toHaveLength(1))
    s.say({ kind: 'step', step: 'reading', state: 'now' })
    s.say({ kind: 'step', step: 'reading', state: 'halted' })
    s.say({ kind: 'refusal', code: 'TOKEN_REFUSED', reference: '0000-00B4' })
    const notice = await screen.findByRole('alert')
    expect(within(notice).getByText(words.plan.couldntWrite)).toBeTruthy()
    expect(s.called('mintToken')).toHaveLength(1)
  })
})

describe('refusals while the plan is written (Rich’s words)', () => {
  async function refused(frame: Extract<Progress, { kind: 'refusal' }>) {
    const s = stage()
    await open(s)
    s.state({ state: 'planning' })
    s.say({ kind: 'step', step: 'reading', state: 'halted' })
    s.say(frame)
    return { s, notice: await screen.findByRole('alert') }
  }

  it('the allowance used up: whose it is, how much, and when it resets in their own time; needs you', async () => {
    const { s, notice } = await refused({
      kind: 'refusal',
      code: 'MODEL_BUDGET_EXHAUSTED',
      reference: '0000-0001',
      allowance: { monthlyUsd: 10, resetsAt: '2026-10-01T00:00:00.000Z' },
    })
    expect(
      within(notice).getByText(
        "You've used your $10.00 AI allowance for this month. It resets at 5pm on 30 September. Nothing is lost; this plan will be here.",
      ),
    ).toBeTruthy()
    expect(within(notice).getByText(words.reference.line('0000-0001'))).toBeTruthy()
    // The plan's refusal is the plan's: moment 3's key renewal never hears it.
    expect(s.called('startIntakeSession')).toEqual([])
  })

  it('an allowance with no reset yet resets by the contract’s rule: the first of the month, UTC', async () => {
    const { notice } = await refused({
      kind: 'refusal',
      code: 'MODEL_BUDGET_EXHAUSTED',
      reference: '0000-0002',
      allowance: { monthlyUsd: 25, resetsAt: null },
    })
    expect(notice.textContent).toContain(
      "You've used your $25.00 AI allowance for this month. It resets at 5pm on 30 September.",
    )
  })

  it.each([
    ['MODEL_NOT_AVAILABLE', words.plan.waitingOnAdmin, 'carryOn'],
    ['MODEL_GATEWAY_REFUSED', words.plan.waitingOnAdmin, 'carryOn'],
    ['MODEL_UNREACHABLE', words.plan.couldntWrite, 'carryOn'],
    ['MODEL_ANSWER_INVALID', words.plan.didntComeOut, 'tryAgain'],
    ['INTERNAL', words.refused.body, 'carryOn'],
  ] as const)(
    '%s is said, with its reference; its button writes the plan again',
    async (code, said, button) => {
      const { s, notice } = await refused({
        kind: 'refusal',
        code,
        reference: '0000-0003',
      })
      expect(within(notice).getByText(said)).toBeTruthy()
      await press(within(notice).getByRole('button', { name: words.describe[button] }))
      expect(s.called('plan')).toEqual([['c-1']])
    },
  )

  it('a token refused is renewed once without a word, and the plan written again; twice, it is said', async () => {
    const s = stage()
    await open(s)
    s.state({ state: 'planning' })
    s.say({ kind: 'step', step: 'reading', state: 'halted' })
    s.say({ kind: 'refusal', code: 'TOKEN_REFUSED', reference: '0000-0004' })
    await waitFor(() => expect(s.called('plan')).toEqual([['c-1']]))
    expect(s.called('mintToken')).toHaveLength(1)
    expect(s.called('handProject')).toHaveLength(1)
    expect(screen.queryByRole('alert')).toBeNull()
    s.say({ kind: 'refusal', code: 'TOKEN_REFUSED', reference: '0000-0005' })
    const notice = await screen.findByRole('alert')
    expect(within(notice).getByText(words.plan.couldntWrite)).toBeTruthy()
    expect(s.called('mintToken')).toHaveLength(1)
  })
})

describe('a refusal from moments 3 and 4', () => {
  it('is theirs: the plan screen never reads one that came before it', async () => {
    const s = stage()
    await open(s)
    s.state({ state: 'naming', projectId: null })
    s.say({ kind: 'refusal', code: 'MODEL_NOT_AVAILABLE', reference: '0000-0009' })
    s.state({ state: 'making' })
    await waitFor(() => expect(s.watches).toHaveLength(1))
    expect(screen.queryByText(words.plan.waitingOnAdmin)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('what our own server refuses', () => {
  it('the plan asked for and our server unreachable: said, with a reference, reported as the plan', async () => {
    const s = stage()
    s.ours.plan = () => Promise.reject(new OurRefusal('UNREACHABLE', null))
    await open(s)
    s.state({ state: 'planning' })
    await press(screen.getByRole('button', { name: words.describe.carryOn }))
    const notice = await screen.findByRole('alert')
    expect(within(notice).getByText(words.plan.couldntWrite)).toBeTruthy()
    expect(reports).toContainEqual(
      expect.objectContaining({
        reference: referenceIn(notice),
        code: 'UNREACHABLE',
        operation: 'plan',
      }),
    )
  })

  it('signed out: the signed-out notice', async () => {
    const s = stage()
    s.ours.plan = () => Promise.reject(new OurRefusal('UNAUTHENTICATED', 401))
    await open(s)
    s.state({ state: 'planning' })
    await press(screen.getByRole('button', { name: words.describe.carryOn }))
    expect(await screen.findByText(words.expired.body)).toBeTruthy()
  })
})
