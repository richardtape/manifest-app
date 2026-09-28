// @vitest-environment jsdom
import { ManifestApiError, type Schemas } from '@manifest/contract'
import type { Conversation, Intake, Progress } from '@manifest-app/server/progress'
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
 * MOMENTS 3 AND 4 (F2 Task 7), through the whole App: the platform, our API and the stream
 * stood in for, so every press can be seen reaching the right place, and every frame seen
 * changing the page. The words are the walk-through's, and Rich's for the limits.
 */
const ME: Schemas['Me'] = {
  id: '11111111-1111-4111-8111-111111111111',
  puid: 'ins000001',
  displayName: 'Instructor One',
  email: 'instructor@example.test',
  role: 'member',
}
const WORDS =
  "A page where students post a response to the week's reading. About 200 students."
const CONVERSATION: Conversation = {
  id: 'c-1',
  personId: ME.id,
  projectId: null,
  title: 'First build',
  state: 'describing',
  description: WORDS,
  createdAt: '2026-09-27T20:00:00.000Z',
  updatedAt: '2026-09-27T20:00:00.000Z',
}
const NOTHING_YET: Intake = {
  round: null,
  understood: null,
  answers: {},
  skipped: [],
  names: null,
  namesAsked: 0,
  blueprint: null,
}
const Q = [
  {
    id: 'q1',
    ask: 'Can a student change a response after posting it?',
    choices: ['Yes', 'No'],
  },
  { id: 'q2', ask: 'Should a TA see everything you see?', choices: null },
]
const UNDERSTOOD = {
  questions: Q,
  restatement: "A page where your students post a response to the week's reading.",
  audience: {
    scale: 'class' as const,
    burst: 'synchronised' as const,
    from: 'About 200 students',
  },
  cannot: ['send marks to Canvas'],
}
const NAMES = [
  { name: 'Reading responses', slug: 'reading-responses' },
  { name: 'Weekly responses', slug: 'weekly-responses' },
  { name: 'Seminar reading log', slug: 'seminar-reading-log' },
]
const STARTED: Schemas['IntakeSessionStarted'] = {
  session: {
    id: '3c0d6b2e-51f4-4a8e-9d7a-2b6f0c1e4a90',
    model: 'default-chat',
    capUsd: 0.25,
    expiresAt: '2026-09-28T04:10:00.000Z',
    state: 'active',
    endedAt: null,
    createdAt: '2026-09-28T03:40:00.000Z',
  },
  key: 'sk-example-not-a-real-key',
  baseUrl: 'http://127.0.0.1:7106/v1',
}
const BLUEPRINT = {
  ref: 'node-ts-mongo@1',
  name: 'node-ts-mongo',
  majorVersion: 1,
  language: 'javascript',
  defaultPort: 3000,
  healthPath: '/healthz',
  schemaVersions: [1],
  provides: { services: ['mongodb'], authProviders: ['cwl' as const], ai: true },
  starters: [],
}
const refused = (status: number, code: string) =>
  new ManifestApiError(
    status,
    { error: { code, message: 'sha256:9b2c machinery' } } as never,
    'test',
  )

class FakeSource implements StreamSource {
  readyState = 0
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  close() {
    this.readyState = 2
  }
}

/** A stage: the platform, our API and the stream, each recording what reached it. */
function stage(
  options: {
    start?: () => Promise<Schemas['IntakeSessionStarted']>
    taken?: string[]
  } = {},
) {
  const sources: FakeSource[] = []
  const calls: [string, ...unknown[]][] = []
  const taken = new Set(options.taken ?? [])
  const platform: Platform = {
    getMe: () => Promise.resolve(ME),
    listProjects: () => Promise.resolve([]),
    getProject: () => new Promise(() => undefined),
    getRelease: () => new Promise(() => undefined),
    startIntakeSession: (key) => {
      calls.push(['startIntakeSession', key])
      return options.start?.() ?? Promise.resolve(STARTED)
    },
    endIntakeSession: (id) => {
      calls.push(['endIntakeSession', id])
      return Promise.resolve({ ...STARTED.session, state: 'ended' as const })
    },
    checkSlug: (slug) => {
      calls.push(['checkSlug', slug])
      return Promise.resolve(
        taken.has(slug)
          ? {
              slug,
              available: false,
              reasons: [
                {
                  code: 'SLUG_TAKEN',
                  message: 'a project already has this name',
                  hint: 'Pick another name, or ask its owner to add you.',
                },
              ],
            }
          : { slug, available: true },
      )
    },
    listBlueprints: () => Promise.resolve([BLUEPRINT]),
  }
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args])
      return Promise.resolve()
    }
  const ours: Ours = {
    startConversation: (description) => {
      calls.push(['startConversation', description])
      return Promise.resolve({ ...CONVERSATION, description })
    },
    readConversation: (id) => Promise.resolve({ ...CONVERSATION, id }),
    handIntakeKey: record('handIntakeKey') as Ours['handIntakeKey'],
    intake: record('intake') as Ours['intake'],
    names: record('names') as Ours['names'],
    blueprint: record('blueprint') as Ours['blueprint'],
    events: () => {
      const source = new FakeSource()
      sources.push(source)
      return source
    },
  }
  /** The stream says something. */
  const say = (frame: Progress) =>
    act(() => {
      const source = sources.at(-1)!
      source.readyState = 1
      source.onmessage?.(new MessageEvent('message', { data: JSON.stringify(frame) }))
    })
  const state = (patch: Partial<Conversation>, intake: Partial<Intake> = {}) =>
    say({
      kind: 'state',
      conversation: { ...CONVERSATION, ...patch },
      intake: { ...NOTHING_YET, ...intake },
    })
  const called = (name: string) =>
    calls.filter((c) => c[0] === name).map((c) => c.slice(1))
  return { platform, ours, say, state, called, sources }
}

const reports: Record<string, unknown>[] = []
beforeEach(() => {
  reports.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/problems') {
        const report = JSON.parse(String(init?.body)) as Record<string, unknown>
        // Our server's own rule for a report's operation (api/problems.ts): one refused is lost.
        if (
          report['operation'] !== null &&
          !/^[a-z][A-Za-z0-9]{0,63}$/.test(String(report['operation']))
        )
          return new Response(JSON.stringify({ error: { code: 'PROBLEM_INVALID' } }), {
            status: 400,
          })
        reports.push(report)
      }
      return new Response(null, { status: 204 })
    }),
  )
  sessionStorage.clear()
  window.history.pushState({}, '', '/new')
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
    // Hostnames are allowed, in mono (C3).
    .replace(/[a-z0-9-]+\.manifest\.internal/g, '')

async function describeAndCarryOn(s: ReturnType<typeof stage>) {
  render(<App platform={s.platform} ours={s.ours} />)
  const box = await screen.findByLabelText(words.describe.label)
  fireEvent.change(box, { target: { value: WORDS } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: words.describe.carryOn }))
  })
}

describe('Describe it (moment 3)', () => {
  it('says what to do, in the walk-through’s words, and Carry on waits for words', async () => {
    const s = stage()
    render(<App platform={s.platform} ours={s.ours} />)
    expect(
      await screen.findByRole('heading', { name: words.describe.title }),
    ).toBeTruthy()
    for (const line of [
      words.describe.lead,
      words.describe.hint,
      words.describe.asideTitle,
      words.describe.aside,
    ])
      expect(screen.getByText(line)).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: words.describe.carryOn }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(document.title).toBe(words.describe.tab)
    expect(machineryIn(text())).toEqual([])
    // No conversation yet, so no stream is opened.
    expect(s.sources).toHaveLength(0)
  })

  it('Carry on: the conversation, then the intake in their session, its key handed over, then round 1; working, "Reading it"', async () => {
    const s = stage()
    await describeAndCarryOn(s)
    expect(s.called('startConversation')).toEqual([[WORDS]])
    await waitFor(() => expect(s.called('intake')).toEqual([['c-1', {}]]))
    expect(window.location.pathname).toBe('/new/c-1')
    expect(s.called('startIntakeSession')[0]![0]).toMatch(/^[0-9a-f-]{36}$/)
    expect(s.called('handIntakeKey')).toEqual([
      [
        'c-1',
        {
          key: STARTED.key,
          baseUrl: STARTED.baseUrl,
          model: 'default-chat',
          expiresAt: STARTED.session.expiresAt,
        },
      ],
    ])
    s.state({})
    expect(screen.getByText(words.steps.understanding)).toBeTruthy()
    expect(screen.queryByRole('button', { name: words.describe.carryOn })).toBeNull()
  })
})

describe('the follow-up questions (moment 3)', () => {
  // Its first frame is already `questions`, with no steps before it: a stream that connected
  // late. The press made on Describe is over, and the page is never left working.
  it('shows each with its choices or its field; Carry on sends the answers by question; Skip sends a skip', async () => {
    const s = stage()
    await describeAndCarryOn(s)
    s.state({ state: 'questions' }, { round: 1, understood: UNDERSTOOD })
    expect(
      screen.getByRole('heading', { name: words.describe.questionsTitle }),
    ).toBeTruthy()
    const q1 = screen.getByRole('radiogroup', { name: Q[0]!.ask })
    fireEvent.click(within(q1).getByLabelText('No'))
    fireEvent.change(screen.getByLabelText(Q[1]!.ask), {
      target: { value: 'Only the TA' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: words.describe.carryOn }))
    })
    expect(s.called('intake').at(-1)).toEqual([
      'c-1',
      { answers: { q1: 'No', q2: 'Only the TA' } },
    ])
    expect(screen.getByText(words.steps.understanding)).toBeTruthy()

    // Round 2 appears only because our server asked one, after its step, as the server sends it.
    s.say({ kind: 'step', step: 'understanding', state: 'now' })
    s.say({ kind: 'step', step: 'understanding', state: 'done' })
    s.state(
      { state: 'questions' },
      {
        round: 2,
        understood: {
          ...UNDERSTOOD,
          questions: [
            { id: 'q3', ask: 'Does each week open on a set date?', choices: null },
          ],
        },
      },
    )
    expect(screen.getByLabelText('Does each week open on a set date?')).toBeTruthy()
    expect(screen.queryByText(Q[0]!.ask)).toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: words.describe.skip }))
    })
    expect(s.called('intake').at(-1)).toEqual(['c-1', { skip: true }])
    expect(machineryIn(text())).toEqual([])
  })
})

describe('the intake refused at the start (Rich’s words: whose limit, and when it resets)', () => {
  it.each([
    ['INTAKE_DAILY_LIMIT_REACHED', 409, words.describe.pausedToday('midnight')],
    [
      'INTAKE_BUDGET_EXHAUSTED',
      409,
      /paused for everyone until .* on .*, when this month's allowance resets/,
    ],
    ['INTAKE_MODEL_UNAVAILABLE', 503, words.describe.waitingOnAdmin],
    ['AI_CATALOGUE_DISABLED', 503, words.describe.waitingOnAdmin],
  ] as const)(
    '%s: said, with its reference, reported, and on to Name it with no names asked',
    async (code, status, said) => {
      const s = stage({ start: () => Promise.reject(refused(status, code)) })
      await describeAndCarryOn(s)
      await waitFor(() => expect(s.called('intake')).toEqual([['c-1', { skip: true }]]))
      expect(s.called('handIntakeKey')).toEqual([])
      s.state({ state: 'naming' })
      const notice = await screen.findByRole('alert')
      expect(within(notice).getByText(said as string | RegExp)).toBeTruthy()
      const reference = /quote ([0-9A-F]{4}-[0-9A-F]{4})\./.exec(
        notice.textContent ?? '',
      )?.[1]
      expect(reference).toBeDefined()
      expect(reports).toContainEqual(
        expect.objectContaining({
          reference,
          code,
          operation: 'startIntakeSession',
          status,
        }),
      )
      // No names are asked for: Something else, alone.
      expect(s.called('names')).toEqual([])
      await waitFor(() =>
        expect(screen.getByLabelText(words.nameIt.somethingElse)).toBeTruthy(),
      )
      expect(
        (screen.getByLabelText(words.nameIt.somethingElse) as HTMLInputElement).checked,
      ).toBe(true)
      expect(machineryIn(text())).toEqual([])
      expect(text()).not.toContain('sha256')
    },
  )

  it('a gateway that did not answer may be tried again, or named by hand; nothing is skipped for them', async () => {
    let tries = 0
    const s = stage({
      start: () =>
        ++tries === 1
          ? Promise.reject(refused(503, 'AI_BACKEND_UNAVAILABLE'))
          : Promise.resolve(STARTED),
    })
    await describeAndCarryOn(s)
    const notice = await screen.findByRole('alert')
    expect(within(notice).getByText(words.describe.couldntRead)).toBeTruthy()
    expect(s.called('intake')).toEqual([])
    await act(async () => {
      fireEvent.click(
        within(notice).getByRole('button', { name: words.describe.tryAgain }),
      )
    })
    await waitFor(() => expect(s.called('intake')).toEqual([['c-1', {}]]))
    expect(s.called('startIntakeSession')).toHaveLength(2)
  })
})

describe('our own server refuses the handover', () => {
  it('said, with its reference, and the report lands: its operation is one our server takes', async () => {
    const s = stage()
    s.ours.handIntakeKey = () => Promise.reject(new OurRefusal('INTAKE_KEY_INVALID', 400))
    await describeAndCarryOn(s)
    const notice = await screen.findByRole('alert')
    expect(within(notice).getByText(words.refused.body)).toBeTruthy()
    const reference = /quote ([0-9A-F]{4}-[0-9A-F]{4})\./.exec(
      notice.textContent ?? '',
    )?.[1]
    await waitFor(() =>
      expect(reports).toContainEqual(
        expect.objectContaining({ reference, code: 'INTAKE_KEY_INVALID', status: 400 }),
      ),
    )
  })
})

describe('a refusal on the stream', () => {
  it('a bad answer: "We couldn\'t read that just now", with the reference the server recorded; Try again reads again', async () => {
    const s = stage()
    await describeAndCarryOn(s)
    s.state({})
    s.say({ kind: 'step', step: 'understanding', state: 'halted' })
    s.say({ kind: 'refusal', code: 'MODEL_ANSWER_INVALID', reference: '7F3A-9C21' })
    const notice = await screen.findByRole('alert')
    expect(within(notice).getByText(words.describe.couldntRead)).toBeTruthy()
    expect(within(notice).getByText(words.reference.line('7F3A-9C21'))).toBeTruthy()
    await act(async () => {
      fireEvent.click(
        within(notice).getByRole('button', { name: words.describe.tryAgain }),
      )
    })
    await waitFor(() => expect(s.called('intake')).toHaveLength(2))
  })

  it('a key lost to a restart (Review Focus 5): a new intake session, handed over, and the step again, without a word; twice, it is said', async () => {
    const s = stage()
    await describeAndCarryOn(s)
    s.state({})
    s.say({ kind: 'step', step: 'understanding', state: 'halted' })
    s.say({ kind: 'refusal', code: 'INTAKE_KEY_MISSING', reference: '0000-0001' })
    await waitFor(() => expect(s.called('intake')).toHaveLength(2))
    expect(s.called('handIntakeKey')).toHaveLength(2)
    expect(screen.queryByRole('alert')).toBeNull()
    s.say({ kind: 'refusal', code: 'INTAKE_KEY_MISSING', reference: '0000-0002' })
    expect((await screen.findByRole('alert')).textContent).toContain(
      words.describe.couldntRead,
    )
  })

  it('"Name it yourself" goes on to naming, and no names are asked for after it', async () => {
    const s = stage()
    await describeAndCarryOn(s)
    s.state({})
    s.say({ kind: 'refusal', code: 'MODEL_UNREACHABLE', reference: '0000-0003' })
    await act(async () => {
      fireEvent.click(
        await screen.findByRole('button', { name: words.describe.nameItYourself }),
      )
    })
    expect(s.called('intake').at(-1)).toEqual(['c-1', { skip: true }])
    s.state({ state: 'naming' })
    await waitFor(() =>
      expect(screen.getByLabelText(words.nameIt.somethingElse)).toBeTruthy(),
    )
    expect(s.called('names')).toEqual([])
  })
})

describe('Name it (moment 4, before Make it)', () => {
  async function naming(s: ReturnType<typeof stage>, intake: Partial<Intake> = {}) {
    await describeAndCarryOn(s)
    s.state({ state: 'naming' }, { round: 1, understood: UNDERSTOOD, ...intake })
  }

  it('what we understood, as their words; what we can’t do; and That’s not it back to their words', async () => {
    const s = stage()
    await naming(s)
    expect(
      screen.getByRole('heading', { name: words.nameIt.understoodTitle }),
    ).toBeTruthy()
    expect(screen.getByText(UNDERSTOOD.restatement)).toBeTruthy()
    expect(screen.getByText(words.nameIt.cannotOne('send marks to Canvas'))).toBeTruthy()
    const notIt = screen.getByRole('link', { name: words.nameIt.notIt })
    expect(notIt.getAttribute('href')).toBe('/new?from=c-1')
  })

  it('asks for names and the blueprint once, on arrival, and shows only the names whose address is free, each with it in mono', async () => {
    const s = stage({ taken: ['weekly-responses'] })
    await naming(s)
    await waitFor(() => expect(s.called('names')).toEqual([['c-1', []]]))
    await waitFor(() => expect(s.called('blueprint')).toEqual([['c-1', [BLUEPRINT]]]))
    s.state(
      { state: 'naming' },
      { round: 1, understood: UNDERSTOOD, names: NAMES, namesAsked: 1 },
    )
    await waitFor(() => expect(screen.getByLabelText(/Reading responses/)).toBeTruthy())
    expect(screen.queryByText('Weekly responses')).toBeNull()
    expect(screen.getByText('seminar-reading-log.manifest.internal')).toBeTruthy()
    expect(
      s
        .called('checkSlug')
        .map((c) => c[0])
        .sort(),
    ).toEqual(NAMES.map((n) => n.slug).sort())
    // A later frame (the blueprint's) neither checks again nor asks again.
    s.state(
      { state: 'naming' },
      {
        round: 1,
        understood: UNDERSTOOD,
        names: NAMES,
        namesAsked: 1,
        blueprint: { blueprint: 'node-ts-mongo@1', starter: null, why: 'x' },
      },
    )
    expect(s.called('checkSlug')).toHaveLength(3)
    expect(s.called('names')).toHaveLength(1)
  })

  it('Review Focus 3: every suggestion taken asks once more, naming them; taken again, Something else alone, and focused', async () => {
    const all = NAMES.map((n) => n.slug)
    const s = stage({
      taken: [...all, 'response-board', 'reading-circle', 'week-by-week'],
    })
    await naming(s)
    s.state(
      { state: 'naming' },
      { round: 1, understood: UNDERSTOOD, names: NAMES, namesAsked: 1 },
    )
    await waitFor(() => expect(s.called('names').at(-1)).toEqual(['c-1', all]))
    const more = [
      { name: 'Response board', slug: 'response-board' },
      { name: 'Reading circle', slug: 'reading-circle' },
      { name: 'Week by week', slug: 'week-by-week' },
    ]
    s.state(
      { state: 'naming' },
      { round: 1, understood: UNDERSTOOD, names: more, namesAsked: 2 },
    )
    await waitFor(() =>
      expect(
        (screen.getByLabelText(words.nameIt.somethingElse) as HTMLInputElement).checked,
      ).toBe(true),
    )
    expect(
      screen
        .getAllByRole('radio', { checked: false })
        .filter((r) => (r as HTMLInputElement).name === 'name-it-name'),
    ).toHaveLength(0)
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText(words.nameIt.nameLabel)),
    )
    expect(s.called('names')).toHaveLength(2)
  })

  it('who it is for and how they turn up, guessed, and said so', async () => {
    const s = stage()
    await naming(s)
    expect(
      (
        screen.getByLabelText(
          new RegExp(words.nameIt.scale.class.title),
        ) as HTMLInputElement
      ).checked,
    ).toBe(true)
    expect(
      (
        screen.getByLabelText(
          new RegExp(words.nameIt.burst.synchronised.title),
        ) as HTMLInputElement
      ).checked,
    ).toBe(true)
    expect(screen.getByText(words.nameIt.guessedFrom('About 200 students'))).toBeTruthy()
    for (const line of [
      words.nameIt.worthKnowing,
      words.nameIt.footer,
      words.nameIt.whyLabel,
    ])
      expect(screen.getByText(line)).toBeTruthy()
    expect(machineryIn(text())).toEqual([])
  })

  it('Something else: its address comes from the name, checked as it settles; the platform’s own words when it is taken', async () => {
    const s = stage({ taken: ['mock-app'] })
    await naming(s, { names: [], namesAsked: 2 })
    fireEvent.click(await screen.findByLabelText(words.nameIt.somethingElse))
    fireEvent.change(screen.getByLabelText(words.nameIt.nameLabel), {
      target: { value: 'Mock app' },
    })
    expect(
      await screen.findByText('a project already has this name', {}, { timeout: 2000 }),
    ).toBeTruthy()
    expect(
      screen.getByText('Pick another name, or ask its owner to add you.'),
    ).toBeTruthy()
    fireEvent.change(screen.getByLabelText(words.nameIt.nameLabel), {
      target: { value: 'Reading log' },
    })
    expect(
      await screen.findByText(
        words.nameIt.addressFree('reading-log.manifest.internal'),
        {},
        { timeout: 2000 },
      ),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: words.nameIt.changeAddress }))
    const address = screen.getByLabelText(words.nameIt.addressLabel) as HTMLInputElement
    expect(address.value).toBe('reading-log')
    expect(address.className).toContain('mf-field__input--mono')
  })

  it('Make it waits for a name, a free address and both answers; pressed, it ends the intake session', async () => {
    const s = stage()
    await naming(s)
    s.state(
      { state: 'naming' },
      { round: 1, understood: UNDERSTOOD, names: NAMES, namesAsked: 1 },
    )
    const make = screen.getByRole('button', {
      name: words.nameIt.makeIt,
    }) as HTMLButtonElement
    expect(make.disabled).toBe(true)
    fireEvent.click(await screen.findByLabelText(/Reading responses/))
    expect(make.disabled).toBe(false)
    await act(async () => {
      fireEvent.click(make)
    })
    expect(s.called('endIntakeSession')).toEqual([[STARTED.session.id]])
    expect(screen.getByText(words.nameIt.makingNext)).toBeTruthy()
  })
})

describe('That’s not it (moment 4 → 3): their words back', () => {
  it('Describe comes back with the words they wrote, to change', async () => {
    const s = stage()
    window.history.pushState({}, '', '/new?from=c-1')
    render(<App platform={s.platform} ours={s.ours} />)
    await waitFor(() =>
      expect(
        (screen.getByLabelText(words.describe.label) as HTMLTextAreaElement).value,
      ).toBe(WORDS),
    )
  })
})

describe('Decision 11 on F1’s notice', () => {
  it('a read that failed shows a reference, reports it once, and Copy is a real button', async () => {
    const s = stage()
    s.platform.listProjects = () => Promise.reject(refused(500, 'INTERNAL'))
    window.history.pushState({}, '', '/')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(<App platform={s.platform} ours={s.ours} />)
    const notice = await screen.findByRole('alert')
    const reference = /quote ([0-9A-F]{4}-[0-9A-F]{4})\./.exec(
      notice.textContent ?? '',
    )?.[1]
    expect(reference).toBeDefined()
    await waitFor(() =>
      expect(reports).toContainEqual(
        expect.objectContaining({ reference, code: 'INTERNAL', status: 500 }),
      ),
    )
    expect(new Set(reports.map((r) => r['reference'])).size).toBe(1)
    expect(
      within(notice).getByRole('button', { name: words.reference.copy }),
    ).toBeTruthy()
  })
})
