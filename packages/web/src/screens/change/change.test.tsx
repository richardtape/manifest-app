// @vitest-environment jsdom
import { ManifestApiError, type Schemas } from '@manifest/contract'
import type {
  AppConversation,
  Conversation,
  Intake,
  LineView,
  PieceView,
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
import { CAPABILITIES } from '../making/token.js'
import { machineryIn } from '../machinery.js'

/**
 * MOMENT 8, ASKING FOR A CHANGE (F4 Task 9), through the whole App, with our API and the stream
 * stood in for: Ask for a change, the line, "Here's what we'd change", a change set aside, the box
 * after built, and the app's conversations. Every press is seen reaching our server.
 */
const ME: Schemas['Me'] = {
  id: '11111111-1111-4111-8111-111111111111',
  puid: 'ins000001',
  displayName: 'Instructor One',
  email: 'instructor@example.test',
  role: 'member',
  mayBuild: true,
}
const SLUG = 'reading-responses'
const PROJECT = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Reading responses',
  slug: SLUG,
  blueprint: 'node-ts-mongo@1',
}
const THE_PROJECT = {
  ...PROJECT,
  description: null,
  starter: null,
  createdAt: '2026-09-27T20:00:00.000Z',
  status: 'active',
  archivedAt: null,
} as unknown as Schemas['Project']
const WORDS = 'Also show a word count on each response.'
const CONVERSATION: Conversation = {
  id: 'c-2',
  personId: ME.id,
  projectId: PROJECT.id,
  title: 'Also show a word count on each response',
  state: 'waiting',
  description: WORDS,
  createdAt: '2026-09-28T20:00:00.000Z',
  updatedAt: '2026-09-28T20:00:00.000Z',
}
const INTAKE: Intake = {
  round: null,
  understood: null,
  answers: {},
  skipped: [],
  names: null,
  namesAsked: 0,
  blueprint: null,
  project: PROJECT,
}
const PIECE: PieceView = { kind: 'change', change: 1, asked: [WORDS], stopped: null }
const CHANGE: PlanView = {
  studentsSee: 'One page listing the weeks. Each response shows how many words it has.',
  youSee: 'Every response for a week on one page. Each shows its word count.',
  itKeeps: 'The text students write, their name, and when they posted it.',
  whoGetsIn: "Anyone with a CWL can sign in. We can't limit it to your class yet.",
  ai: 'None.',
  assumed: [],
  onlyYouKnow: [
    { id: 'count', ask: 'Should students see their count while they write?' },
  ],
  changed: ['studentsSee', 'youSee'],
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

function stage(
  options: {
    mint?: () => unknown
    rows?: AppConversation[]
    members?: Schemas['MemberList']
  } = {},
) {
  const sources: FakeSource[] = []
  const calls: [string, ...unknown[]][] = []
  let mints = 0
  const platform: Platform = {
    getMe: () => Promise.resolve(ME),
    listProjects: () => Promise.resolve([THE_PROJECT]),
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
      const trouble = options.mint?.()
      // A press held open, failed later by the test (m4).
      if (trouble instanceof Promise) return trouble as never
      if (trouble !== undefined) return Promise.reject(trouble)
      return Promise.resolve({
        token: { id: `t-${mints}` },
        secret: `mft_test_${mints}`,
      } as Schemas['MintedToken'])
    },
    deploy: never,
    listAppSecrets: never,
    setAppSecret: never,
    runRehearsal: () => new Promise<never>(() => undefined),
    getLaunchReadiness: never,
    getLaunchRecords: never,
    getApproval: never,
    requestApproval: never,
    getEnvironment: never,
    listMembers:
      options.members === undefined
        ? never
        : () => Promise.resolve(options.members ?? []),
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
  }
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args])
      return Promise.resolve()
    }
  const ours: Ours = {
    startConversation: never,
    readConversation: () => Promise.resolve(CONVERSATION),
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
    startChange: (projectId, body) => {
      calls.push(['startChange', projectId, body])
      return Promise.resolve({ ...CONVERSATION, id: 'c-9', state: 'planning' })
    },
    conversationsOn: (projectId) => {
      calls.push(['conversationsOn', projectId])
      return Promise.resolve(options.rows ?? [])
    },
    conversationFor: never,
    askedSecrets: never,
    fixFor: never,
    agreedRows: never,
    fixForDryRun: () => Promise.resolve(null),
    fixForOutage: () => Promise.resolve(null),
    changeForRefusal: never,
    keeping: never,
    handWatch: never,
    minted: never,
    keepAgent: never,
    needs: never,
    since: never,
    history: never,
    forget: never,
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
    conversation: Partial<Conversation & { byName: string }>,
    extra: {
      plan?: { version: number; plan: PlanView } | null
      piece?: PieceView | null
      line?: LineView | null
    } = {},
  ) =>
    say({
      kind: 'state',
      conversation: { ...CONVERSATION, byName: ME.displayName, ...conversation },
      intake: INTAKE,
      plan: extra.plan ?? null,
      round: null,
      thread: [],
      piece: extra.piece === undefined ? PIECE : extra.piece,
      line: extra.line ?? null,
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
      if (url === '/api/problems')
        reports.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return new Response(null, { status: 204 })
    }),
  )
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
const press = (button: HTMLElement) =>
  act(async () => {
    fireEvent.click(button)
  })
const button = (name: string) => screen.getByRole('button', { name })

async function open(path: string, s = stage()) {
  window.history.pushState({}, '', path)
  render(
    <App
      platform={s.platform}
      ours={s.ours}
      timeZone="America/Vancouver"
      now={() => new Date('2026-09-28T20:05:00Z')}
    />,
  )
  return s
}
/** A conversation on the app, its stream open. */
async function conversation(s = stage()) {
  await open(`/apps/${SLUG}/conversations/c-2`, s)
  await waitFor(() => expect(s.sources).toHaveLength(1))
  return s
}
const plain = () => {
  expect(machineryIn(text())).toEqual([])
  expect(text()).not.toMatch(/it works/i)
}

describe('Ask for a change (/apps/:slug/change)', () => {
  it('asks what should change, mints a token named for it, and sends their words and the token in one request; then the conversation', async () => {
    const s = await open(`/apps/${SLUG}/change`)
    await screen.findByRole('heading', { name: 'What should change?' })
    expect(
      screen.getByText(
        "Say it the way you'd say it to a colleague. We'll show you what we'd change before we change anything.",
      ),
    ).toBeTruthy()
    fireEvent.change(screen.getByLabelText('What should change'), {
      target: { value: WORDS },
    })
    await press(button('Ask for it'))
    await waitFor(() => expect(s.called('startChange')).toHaveLength(1))
    const [[projectId, body, key]] = s.called('mintToken') as [
      [string, Schemas['MintTokenRequest'], string],
    ]
    expect(projectId).toBe(PROJECT.id)
    expect(body).toEqual({
      name: `Changing — ${WORDS}`.slice(0, 64),
      capabilities: CAPABILITIES,
      expiresInDays: 7,
    })
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
    // One request: their words, the token, and its id (F6b D5) together.
    expect(s.called('startChange')).toEqual([
      [PROJECT.id, { words: WORDS, token: 'mft_test_1', tokenId: 't-1' }],
    ])
    await waitFor(() =>
      expect(window.location.pathname).toBe(`/apps/${SLUG}/conversations/c-9`),
    )
  })

  it('over the limit, says so, holds the send, and keeps every word they wrote', async () => {
    const s = await open(`/apps/${SLUG}/change`)
    const long = 'x'.repeat(4001)
    fireEvent.change(await screen.findByLabelText('What should change'), {
      target: { value: long },
    })
    expect((button('Ask for it') as HTMLButtonElement).disabled).toBe(true)
    expect(
      (screen.getByLabelText('What should change') as HTMLTextAreaElement).value,
    ).toBe(long)
    expect(text()).toMatch(/4,001/)
    expect(s.called('mintToken')).toEqual([])
  })

  it('a token the platform will not mint is said, with a reference, and nothing is asked of our server', async () => {
    const s = stage({ mint: () => new Error('offline') })
    await open(`/apps/${SLUG}/change`, s)
    fireEvent.change(await screen.findByLabelText('What should change'), {
      target: { value: WORDS },
    })
    await press(button('Ask for it'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/quote [0-9A-F]{4}-[0-9A-F]{4}/)
    expect(s.called('startChange')).toEqual([])
    // Their words stay, and they can ask again.
    expect(
      (screen.getByLabelText('What should change') as HTMLTextAreaElement).value,
    ).toBe(WORDS)
    plain()
  })

  it('m4: after a failed press the focus is on the button again, and the alert still says why', async () => {
    await open(`/apps/${SLUG}/change`, stage({ mint: () => new Error('offline') }))
    fireEvent.change(await screen.findByLabelText('What should change'), {
      target: { value: WORDS },
    })
    button('Ask for it').focus()
    await press(button('Ask for it'))
    expect((await screen.findByRole('alert')).textContent).toMatch(
      /quote [0-9A-F]{4}-[0-9A-F]{4}/,
    )
    await waitFor(() => expect(document.activeElement).toBe(button('Ask for it')))
  })

  it('m4: a press that fails after they went back to their words leaves the focus with their words', async () => {
    let fail: (error: unknown) => void = () => undefined
    const held = new Promise<never>((_, reject) => {
      fail = reject
    })
    await open(`/apps/${SLUG}/change`, stage({ mint: () => held }))
    const box = await screen.findByLabelText('What should change')
    fireEvent.change(box, { target: { value: WORDS } })
    button('Ask for it').focus()
    await press(button('Ask for it'))
    box.focus()
    await act(async () => fail(new Error('offline')))
    await screen.findByRole('alert')
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
    expect(document.activeElement).toBe(box)
  })

  it('the app switched off (PROJECT_ARCHIVED, F6 Task 11): said in words, switch it back on first; no reference', async () => {
    const s = stage({
      mint: () =>
        new ManifestApiError(
          409,
          { error: { code: 'PROJECT_ARCHIVED', message: 'x' } } as never,
          'test',
        ),
    })
    await open(`/apps/${SLUG}/change`, s)
    fireEvent.change(await screen.findByLabelText('What should change'), {
      target: { value: WORDS },
    })
    await press(button('Ask for it'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(words.refused.archived(THE_PROJECT.name))
    expect(s.called('startChange')).toEqual([])
  })

  it('speaks plainly', async () => {
    await open(`/apps/${SLUG}/change`)
    await screen.findByRole('heading', { name: 'What should change?' })
    plain()
  })
})

describe('the line: a waiting conversation (Decision 5)', () => {
  const HOLDER = {
    id: 'c-1',
    title: 'Word count',
    waitingForYou: false,
    by: { id: ME.id, name: ME.displayName },
  }

  it("its top reads waiting on someone: the holder's title, a link to it, and its place; its message box takes words", async () => {
    const s = await conversation()
    s.state({}, { line: { place: 1, holder: HOLDER } })
    const card = await screen.findByText(
      (_, el) =>
        el?.tagName === 'P' &&
        el.textContent === "Waiting for 'Word count' to finish. It starts by itself.",
    )
    const link = within(card).getByRole('link', { name: 'Word count' })
    expect(link.getAttribute('href')).toBe(`/apps/${SLUG}/conversations/c-1`)
    expect(document.querySelector('.mf-chip.mf-is-waiting')).not.toBeNull()
    expect(screen.getByText('Next in line.')).toBeTruthy()
    expect(text()).not.toMatch(/which is waiting for you/)
    // What they asked, and a box for more, whose hint is true here (the walk: F3's said "the next step").
    expect(screen.getByText(WORDS)).toBeTruthy()
    expect(screen.getByText('We add it to what you asked for.')).toBeTruthy()
    expect(text()).not.toMatch(/next step/)
    fireEvent.change(screen.getByLabelText('Anything to add?'), {
      target: { value: 'And bold, please.' },
    })
    await press(button('Send'))
    expect(s.called('message')).toEqual([['c-2', 'And bold, please.']])
    plain()
  })

  it('"…which is waiting for you" only when the holder needs them; a later place is said as such', async () => {
    const s = await conversation()
    s.state({}, { line: { place: 3, holder: { ...HOLDER, waitingForYou: true } } })
    await screen.findByText(
      (_, el) =>
        el?.tagName === 'P' &&
        el.textContent ===
          "Waiting for 'Word count' to finish, which is waiting for you. It starts by itself.",
    )
    expect(screen.getByText('Third in line.')).toBeTruthy()
  })

  it('between one ending and the next starting (no holder), it says it starts in a moment', async () => {
    const s = await conversation()
    s.state({}, { line: { place: 1, holder: null } })
    await screen.findByText('It starts in a moment.')
    expect(screen.queryByRole('link', { name: 'Word count' })).toBeNull()
  })

  it('Leave the line sets it aside (/stop)', async () => {
    const s = await conversation()
    s.state({}, { line: { place: 1, holder: HOLDER } })
    await press(await screen.findByRole('button', { name: 'Leave the line' }))
    expect(s.called('stop')).toEqual([['c-2']])
  })
})

describe("the change's plan: \"Here's what we'd change\" (Rich: agree the change first)", () => {
  const ready = (s: ReturnType<typeof stage>) =>
    s.state(
      { state: 'plan-ready', title: 'Word count' },
      { plan: { version: 1, plan: CHANGE } },
    )

  it('shows only the parts that change, says everything else stays, asks its question, and Yes, change it agrees with the version on screen', async () => {
    const s = await conversation()
    ready(s)
    await screen.findByRole('heading', { name: "Here's what we'd change" })
    expect(screen.getByText('What students see')).toBeTruthy()
    expect(screen.getByText(CHANGE.studentsSee)).toBeTruthy()
    expect(screen.getByText(CHANGE.youSee)).toBeTruthy()
    expect(screen.queryByText('What it keeps')).toBeNull()
    expect(screen.queryByText(CHANGE.itKeeps)).toBeNull()
    expect(screen.getByText('Everything else stays as we agreed.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText(CHANGE.onlyYouKnow[0]!.ask), {
      target: { value: 'Yes, as they type.' },
    })
    await press(button('Yes, change it'))
    expect(s.called('agree')).toEqual([
      ['c-2', { version: 1, answers: { count: 'Yes, as they type.' } }],
    ])
    plain()
  })

  it('every part changed (a plan that no longer read back): all five shown, and no "Everything else…" about nothing', async () => {
    const s = await conversation()
    s.state(
      { state: 'plan-ready', title: 'Word count' },
      {
        plan: {
          version: 1,
          plan: {
            ...CHANGE,
            changed: ['studentsSee', 'youSee', 'itKeeps', 'whoGetsIn', 'ai'],
          },
        },
      },
    )
    await screen.findByRole('heading', { name: "Here's what we'd change" })
    expect(screen.getByText('What it keeps')).toBeTruthy()
    expect(screen.queryByText('Everything else stays as we agreed.')).toBeNull()
  })

  it('Not now sets it aside (/stop); a correction is one sentence, as the first plan’s', async () => {
    const s = await conversation()
    ready(s)
    await press(await screen.findByRole('button', { name: 'Not now' }))
    expect(s.called('stop')).toEqual([['c-2']])
    await press(button('Not quite — let me correct it'))
    fireEvent.change(screen.getByLabelText('In a sentence, what should change'), {
      target: { value: 'Only on my view.' },
    })
    await press(button('Carry on'))
    expect(s.called('correct')).toEqual([['c-2', 'Only on my view.']])
  })

  it("the first plan is F2's: every part, \"Here's what we'd build\", and no Not now", async () => {
    const s = await conversation()
    s.state(
      { state: 'plan-ready', title: 'First build' },
      {
        plan: { version: 1, plan: { ...CHANGE, changed: [] } },
        piece: { kind: 'first', change: 0, asked: [], stopped: null },
      },
    )
    await screen.findByRole('heading', { name: "Here's what we'd build" })
    expect(screen.getByText('What it keeps')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Not now' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Yes, build that' })).toBeTruthy()
  })
})

describe('a change set aside, and the box after built', () => {
  it('set aside: "Set aside. Nothing was changed.", and its box asks for another', async () => {
    const s = await conversation()
    s.state({ state: 'set-aside' })
    await screen.findByText('Set aside. Nothing was changed.')
    fireEvent.change(screen.getByLabelText('What should change instead?'), {
      target: { value: 'Bigger titles instead.' },
    })
    await press(button('Ask for it'))
    expect(s.called('message')).toEqual([['c-2', 'Bigger titles instead.']])
    plain()
  })

  it('built: the message box is open again, and a message is the next change', async () => {
    const s = await conversation()
    s.say({
      kind: 'state',
      conversation: { ...CONVERSATION, state: 'built', byName: ME.displayName },
      intake: INTAKE,
      plan: null,
      round: null,
      thread: [],
      piece: PIECE,
      line: null,
    })
    fireEvent.change(await screen.findByLabelText('What should change next?'), {
      target: { value: 'Now sort them by length.' },
    })
    await press(button('Ask for it'))
    expect(s.called('message')).toEqual([['c-2', 'Now sort them by length.']])
    expect(text()).not.toMatch(/arrives next/)
  })
})

describe("the app's conversations (/apps/:slug/conversations)", () => {
  const ROWS: AppConversation[] = [
    {
      id: 'c-3',
      title: 'Bigger titles',
      state: 'waiting',
      chip: 'waiting',
      updatedAt: '2026-09-28T20:04:00.000Z',
      line: {
        place: 2,
        holder: {
          id: 'c-2',
          title: 'Word count',
          waitingForYou: false,
          by: { id: ME.id, name: ME.displayName },
        },
      },
      by: { id: ME.id, name: ME.displayName },
    },
    {
      id: 'c-2',
      title: 'Word count',
      state: 'plan-ready',
      chip: 'attention',
      updatedAt: '2026-09-28T20:03:00.000Z',
      line: null,
      by: { id: ME.id, name: ME.displayName },
    },
    {
      id: 'c-4',
      title: 'Dark colours',
      state: 'set-aside',
      chip: 'notyet',
      updatedAt: '2026-09-28T19:00:00.000Z',
      line: null,
      by: { id: ME.id, name: ME.displayName },
    },
    {
      id: 'c-1',
      title: 'First build',
      state: 'built',
      chip: 'steady',
      updatedAt: '2026-09-27T20:00:00.000Z',
      line: null,
      by: { id: ME.id, name: ME.displayName },
    },
  ]

  it('every piece of work on the app, each linked, its chip one of the five states, when, and a waiting one its place', async () => {
    const s = await open(`/apps/${SLUG}/conversations`, stage({ rows: ROWS }))
    await screen.findByRole('heading', { name: 'Conversations' })
    expect(
      screen.getByText(
        'Every piece of work on Reading responses, and where each one left it.',
      ),
    ).toBeTruthy()
    const rows = within(
      await screen.findByRole('list', { name: 'Conversations' }),
    ).getAllByRole('listitem')
    // Asked in an effect after the heading is drawn: read once the list it fills is there (§7).
    expect(s.called('conversationsOn')).toEqual([[PROJECT.id]])
    expect(rows).toHaveLength(4)
    for (const [i, row] of ROWS.entries()) {
      const link = within(rows[i]!).getByRole('link', { name: row.title })
      expect(link.getAttribute('href')).toBe(`/apps/${SLUG}/conversations/${row.id}`)
      expect(rows[i]!.querySelector(`.mf-chip.mf-is-${row.chip}`)).not.toBeNull()
    }
    expect(within(rows[0]!).getByText('Waiting: second in line')).toBeTruthy()
    expect(within(rows[1]!).getByText('Needs you')).toBeTruthy()
    expect(within(rows[2]!).getByText('Set aside')).toBeTruthy()
    expect(within(rows[3]!).getByText('Built')).toBeTruthy()
    expect(within(rows[1]!).getByText('2 minutes ago')).toBeTruthy()
    plain()
  })

  it('what our server could not answer is said, with a reference', async () => {
    const s = stage()
    s.ours.conversationsOn = () => Promise.reject(new OurRefusal('UNREACHABLE', null))
    await open(`/apps/${SLUG}/conversations`, s)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/quote [0-9A-F]{4}-[0-9A-F]{4}/)
  })
})

/** F6b TASK 7 (D3): EVERY MEMBER SEES EVERY CONVERSATION, AND ACTS ON THEIR OWN. */
describe('working on it together (F6b Task 7)', () => {
  const t = words.together
  const SAM = { id: 'c0000000-0000-4000-8000-000000000001', name: 'Sam Helper' }
  const member = (
    userId: string,
    role: Schemas['Member']['role'],
  ): Schemas['Member'] => ({
    userId,
    puid: `puid-${userId.slice(-4)}`,
    cwlLogin: null,
    displayName: userId === ME.id ? ME.displayName : SAM.name,
    email: 'someone@ubc.ca',
    role,
  })
  const AS_HELPER = [member(ME.id, 'collaborator'), member(SAM.id, 'owner')]
  const AS_OWNER = [member(ME.id, 'owner'), member(SAM.id, 'collaborator')]
  const sams = { personId: SAM.id, byName: SAM.name }

  it('Conversations lists everyone’s, each with who started it, theirs marked (you)', async () => {
    const rows: AppConversation[] = [
      {
        id: 'c-5',
        title: 'Bigger titles',
        state: 'paused',
        chip: 'attention',
        updatedAt: '2026-09-28T20:04:00.000Z',
        line: null,
        by: SAM,
      },
      {
        id: 'c-1',
        title: 'First build',
        state: 'built',
        chip: 'steady',
        updatedAt: '2026-09-27T20:00:00.000Z',
        line: null,
        by: { id: ME.id, name: ME.displayName },
      },
    ]
    await open(`/apps/${SLUG}/conversations`, stage({ rows }))
    const list = await screen.findByRole('list', { name: 'Conversations' })
    const [sam, mine] = within(list).getAllByRole('listitem')
    expect(sam!.textContent).toContain(t.row(SAM.name, 'Bigger titles'))
    // Its wait is Sam's, never "you".
    expect(sam!.textContent).toContain(t.needs(SAM.name))
    expect(sam!.textContent).not.toContain(words.change.conversations.attention)
    expect(within(sam!).getByRole('link', { name: 'Bigger titles' })).toBeTruthy()
    expect(mine!.textContent).toContain(
      t.row(`${ME.displayName} ${t.you}`, 'First build'),
    )
    plain()
  })

  it('the line, held by another’s: "Sam Helper is working on it: Word count." and [See it]', async () => {
    const s = await conversation()
    s.state(
      {},
      {
        line: {
          place: 1,
          holder: { id: 'c-1', title: 'Word count', waitingForYou: false, by: SAM },
        },
      },
    )
    expect(await screen.findByText(t.holder(SAM.name, 'Word count'))).toBeTruthy()
    expect(screen.getByRole('link', { name: t.seeIt }).getAttribute('href')).toBe(
      `/apps/${SLUG}/conversations/c-1`,
    )
    plain()
  })

  it('another’s waiting conversation: who started it; no Leave the line, no message box', async () => {
    const s = await conversation(stage({ members: AS_OWNER }))
    s.state(sams, {
      line: {
        place: 1,
        holder: {
          id: 'c-1',
          title: 'Word count',
          waitingForYou: false,
          by: { id: ME.id, name: ME.displayName },
        },
      },
    })
    expect(await screen.findByText(t.started(SAM.name))).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Leave the line' })).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('another’s change set aside: no message box', async () => {
    const s = await conversation(stage({ members: AS_HELPER }))
    s.state({ ...sams, state: 'set-aside' })
    expect(await screen.findByText(t.started(SAM.name))).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('another’s plan to agree, read by a helper: the plan, and no Yes, no Not quite, no Not now, no answers to type', async () => {
    const s = await conversation(stage({ members: AS_HELPER }))
    s.state(
      { ...sams, state: 'plan-ready', title: 'Word count' },
      { plan: { version: 1, plan: CHANGE } },
    )
    await screen.findByRole('heading', { name: "Here's what we'd change" })
    expect(screen.getByText(t.started(SAM.name))).toBeTruthy()
    expect(screen.getByText(CHANGE.studentsSee)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Yes, change it' })).toBeNull()
    expect(screen.queryByRole('button', { name: words.plan.notQuite })).toBeNull()
    expect(screen.queryByRole('button', { name: words.change.notNow })).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: words.building.stop })).toBeNull()
  })

  it('another’s plan to agree, read by an owner: [Stop] frees the app, and nothing else of theirs', async () => {
    const s = await conversation(stage({ members: AS_OWNER }))
    s.state(
      { ...sams, state: 'plan-ready', title: 'Word count' },
      { plan: { version: 1, plan: CHANGE } },
    )
    await press(await screen.findByRole('button', { name: words.building.stop }))
    expect(s.called('stop')).toEqual([['c-2']])
    expect(screen.queryByRole('button', { name: 'Yes, change it' })).toBeNull()
  })

  it('another’s plan, its questions: only they know them, and no invitation to correct it (the review’s I1)', async () => {
    const s = await conversation(stage({ members: AS_HELPER }))
    s.state(
      { ...sams, state: 'plan-ready', title: 'Word count' },
      { plan: { version: 1, plan: CHANGE } },
    )
    await screen.findByRole('heading', { name: "Here's what we'd change" })
    expect(
      screen.getByText(t.onlyTheyKnow(CHANGE.onlyYouKnow.length, SAM.name)),
    ).toBeTruthy()
    expect(screen.getByText(CHANGE.onlyYouKnow[0]!.ask)).toBeTruthy()
    expect(text()).not.toMatch(/only you know/i)
    expect(screen.queryByText(words.plan.lead)).toBeNull()
  })

  it('another’s waiting change: what they asked for, never "What you asked for" (the review’s I1)', async () => {
    const s = await conversation(stage({ members: AS_OWNER }))
    s.state(sams, { line: { place: 1, holder: null } })
    expect(await screen.findByText(t.asked(SAM.name))).toBeTruthy()
    expect(screen.queryByText(words.change.asked)).toBeNull()
  })

  it('another’s plan, a token refused on its stream: the page mints and hands over nothing (the review’s I6)', async () => {
    const s = await conversation(stage({ members: AS_OWNER }))
    s.state({ ...sams, state: 'planning', title: 'Word count' })
    await screen.findByText(t.started(SAM.name))
    s.say({ kind: 'refusal', code: 'TOKEN_REFUSED', reference: 'ABCD-1234' })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(s.called('mintToken')).toEqual([])
    expect(s.called('handProject')).toEqual([])
    expect(s.called('plan')).toEqual([])
  })

  it('another’s app being made: the plan is not asked for from this page (the review’s I6)', async () => {
    const s = stage({ members: AS_OWNER })
    s.platform.watchProject = () => ({ ready: Promise.resolve(), close: () => undefined })
    await conversation(s)
    s.state({ ...sams, state: 'making', title: 'First build' })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(s.called('plan')).toEqual([])
  })

  it.each([
    [
      'an owner set it aside',
      {
        by: { id: 'c0000000-0000-4000-8000-0000000000a1', name: 'Alex Owner' },
        why: 'stopped' as const,
      },
      'Stopped by Alex Owner.',
    ],
    ['its person was taken off', { by: SAM, why: 'removed' as const }, null],
  ])(
    'set aside because %s: the page says so (the review’s I3)',
    async (_, stopped, said) => {
      const s = await conversation(stage({ members: AS_OWNER }))
      const removed = stopped.why === 'removed'
      s.state(
        { ...(removed ? sams : {}), state: 'set-aside' },
        { piece: { ...PIECE, stopped } },
      )
      expect(
        await screen.findByText(said ?? t.removed(SAM.name, PROJECT.name)),
      ).toBeTruthy()
    },
  )

  it('set aside by its own person (Not now, Leave the line): nothing more is said', async () => {
    const s = await conversation()
    s.state(
      { state: 'set-aside' },
      {
        piece: {
          ...PIECE,
          stopped: { by: { id: ME.id, name: ME.displayName }, why: 'stopped' },
        },
      },
    )
    await screen.findByText(words.change.setAside)
    expect(screen.queryByText(t.stoppedBy(ME.displayName))).toBeNull()
  })

  it('another’s plan being written: no Carry on of theirs', async () => {
    const s = await conversation(stage({ members: AS_OWNER }))
    s.state({ ...sams, state: 'planning', title: 'Word count' })
    expect(await screen.findByText(t.started(SAM.name))).toBeTruthy()
    expect(screen.queryByRole('button', { name: words.describe.carryOn })).toBeNull()
    expect(s.called('plan')).toEqual([])
  })
})
