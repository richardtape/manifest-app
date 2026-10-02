import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../app.js'
import { createRounds, type Rounds } from '../build/round.js'
import type { Config } from '../config.js'
import { answered, type Answered, type Model } from '../model/client.js'
import { scripted } from '../model/scripted.js'
import type { AgentSessions } from '../platform/agent-sessions.js'
import type { Authoring } from '../platform/authoring.js'
import { createConversationTokens, type Projects } from '../platform/project.js'
import type { ProjectStream } from '../platform/stream.js'
import { storeTrace } from '../runtime/trace.js'
import { openStore, type Conversation, type Store } from '../store/db.js'
import { scratchDir } from '../store/testing.js'
import { createHub, type Hub } from './events.js'
import { pieceOf } from './piece-state.js'
import type { AppConversation, Progress } from './progress.js'
import { roundOf } from './round-state.js'
import {
  ALICE,
  AS_ALICE,
  AS_BOB,
  AS_DANA,
  BOB,
  DANA,
  fakeControlPlane,
} from './testing.js'

/**
 * F3 TASK 9: OUR API'S BUILDING ROUTES. Carry on, a message, an answer, Stop; the round starts
 * when the plan is committed. The round is the real one, over recording fakes of the platform,
 * and a lead that thinks for as long as a test needs it to.
 */
const ORIGIN = 'https://app.manifest.internal'
const STUDENT_APP = 'https://reading-responses.staging.manifest.internal'
const GATEWAY = 'http://127.0.0.1:7106/v1'
const TOKEN = 'mft_test_x_the_conversations_token'
const BASE = 'a'.repeat(40)
const PROJECT = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Reading responses',
  slug: 'reading-responses',
  blueprint: 'node-ts-mongo@1',
}
const PLAN = {
  studentsSee: 'One page listing the weeks.',
  youSee: 'Every response for a week on one page.',
  itKeeps: 'The text students write, their name, and when they posted it.',
  whoGetsIn: 'Anyone with a CWL can sign in.',
  ai: 'None.',
  assumed: ['Twelve weeks, matching a standard term'],
  onlyYouKnow: [{ id: 'late', ask: 'Is a late post still a post?' }],
  changed: [],
}
const ROUTES = ['build', 'messages', 'answers', 'stop'] as const
const BODIES: Record<(typeof ROUTES)[number], unknown> = {
  build: {},
  messages: { words: 'Make the title bigger, please.' },
  answers: { questionId: 'q-1', words: 'It closes at the deadline.' },
  stop: {},
}

let platform: Awaited<ReturnType<typeof fakeControlPlane>>
beforeAll(async () => {
  platform = await fakeControlPlane()
})
afterAll(() => platform.close())

const cleanups: (() => unknown)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

/** The lead, scripted; with no answer left, it thinks for ever (a round that is working). */
function lead(script: unknown[]) {
  let next = 0
  return (onAnswer: (a: Answered) => void): Model => ({
    complete(agent, schema, messages, check) {
      void messages
      return answered(
        async () => {
          const answer = script[next++]
          if (answer === undefined) return new Promise(() => undefined)
          onAnswer({
            model: 'default-chat-large',
            fallback: false,
            usage: null,
            received: { chars: JSON.stringify(answer).length, firstWordMs: 5, ms: 10 },
          })
          return answer
        },
        schema,
        check,
      )
    },
  })
}

function setUp(script: unknown[] = []) {
  const { dir, remove } = scratchDir()
  cleanups.push(remove)
  const store: Store = openStore(join(dir, 'app.sqlite'))
  const hub: Hub = createHub()
  const tokens = createConversationTokens()
  const ended: string[] = []
  let started = 0
  const sessions: AgentSessions = {
    budget: async () => ({ monthlyUsd: 10, remainingUsd: 9.6, resetsAt: null }),
    start: async () => ({
      sessionId: `session-${++started}`,
      key: `sk-test-key-${started}`,
      baseUrl: GATEWAY,
      models: ['default-chat', 'default-chat-large'],
      expiresAt: '2026-09-28T23:00:00.000Z',
      capUsd: 2,
    }),
    end: async (_token, sessionId) => void ended.push(sessionId),
    list: async () => [],
  }
  const projects: Projects = {
    read: async () => PROJECT,
    knowledgePack: async () => '## AGENTS.md\n\nThe stack is fixed.',
  }
  const commits: string[] = []
  const authoring: Authoring = {
    tree: async () => ({ commitSha: BASE, paths: ['package.json'] }),
    commitPlan: async (_token, _project, baseCommit) => {
      commits.push(baseCommit)
      return { commitSha: 'c'.repeat(40), sent: [] }
    },
    readPlan: async () => null,
  }
  const stream: ProjectStream = {
    watch: () => ({ ready: Promise.resolve(), close: () => undefined }),
  }
  const model = lead(script)
  let rounds!: Rounds
  let booted = 0
  const config: Config = {
    mode: 'edge',
    port: 7105,
    origin: ORIGIN,
    platformOrigin: platform.origin,
    modelGateway: GATEWAY,
    planModel: 'default-chat',
    smtpUrl: 'smtp://127.0.0.1:7111',
    mailFrom: 'Manifest <manifest@app.manifest.internal>',
  }
  const app = buildServer(config, () => undefined, {
    store,
    hub,
    tokens,
    projects,
    sessions,
    authoring,
    planModel: () => scripted({ plan: [PLAN], change: [{ ...PLAN, title: 'A change' }] }),
    rounds: (base) => {
      rounds = createRounds({
        ...base,
        sessions,
        projects,
        signIn: { starts: async () => 'ok' },
        source: {
          tree: async () => ({
            commitSha: BASE,
            paths: [{ path: 'package.json', size: 1, binary: false }],
            truncated: false,
          }),
          file: async () => ({ content: '{"dependencies":{}}' }),
          commit: async () => ({ commitSha: 'd'.repeat(40), changed: [], warnings: [] }),
        },
        builds: {
          start: async (_t, _p, commitSha) => ({
            id: 'build-1',
            commitSha,
            status: 'pending',
            error: null,
          }),
          get: async (_t, id) => ({
            id,
            commitSha: BASE,
            status: 'running',
            error: null,
          }),
          log: async () => [],
        },
        releases: {
          create: async () => ({ id: 'release-1' }),
          sandbox: async () => ({
            environmentId: 'env-1',
            hostname: 'reading-responses.sandbox.manifest.internal',
            url: 'https://reading-responses.sandbox.manifest.internal',
          }),
          deploy: async (_t, _p, releaseId) => ({
            id: 'instance-1',
            releaseId,
            state: 'healthy',
          }),
        },
        instances: {
          list: async () => [],
          output: async () => ({ lines: [], failure: null }),
          incidents: async () => [],
          incident: async () => undefined,
        },
        secrets: { setInSandbox: async () => undefined },
        members: { instructor: async () => ({ puid: 'ins000001', email: 'a@ubc.ca' }) },
        stream,
        trace: storeTrace(store),
        now: () => new Date(),
        modelFor: (_session, onAnswer) => model(onAnswer),
      })
      const interruptedOnBoot = rounds.interruptedOnBoot
      rounds.interruptedOnBoot = () => {
        booted++
        interruptedOnBoot()
      }
      return rounds
    },
  })
  cleanups.push(
    () => app.close(),
    () => store.close(),
  )
  return {
    app,
    store,
    hub,
    tokens,
    ended,
    commits,
    rounds: () => rounds,
    booted: () => booted,
    sessionsStarted: () => started,
  }
}

type Setup = ReturnType<typeof setUp>

/** A conversation whose plan is ready, its project made and its token ours: moment 5's end. */
function planReady(s: Setup, personId = ALICE.id): Conversation {
  s.store.rememberPerson({
    id: personId,
    displayName: 'Someone',
    email: 'someone@example.test',
  })
  const conversation = s.store.createConversation(personId, 'A page for readings.')
  s.store.addMessage(conversation.id, 'we', { kind: 'project', project: PROJECT })
  s.store.savePlan(conversation.id, PLAN)
  s.tokens.put(conversation.id, TOKEN)
  return s.store.setState(conversation.id, 'plan-ready', { projectId: PROJECT.id })
}

/** A round under way, its lead still thinking. */
async function building(s: Setup): Promise<Conversation> {
  const conversation = planReady(s)
  s.rounds().start(conversation, TOKEN)
  await until(() => roundOf(s.store, conversation.id)?.status === 'working')
  return s.store.getConversation(conversation.id, ALICE.id)!
}

/** A round waiting on its build, which never finishes: where a Stop usually finds it. */
const AT_BUILD = [
  {
    move: {
      kind: 'commit',
      message: 'The page students post on',
      changes: [{ op: 'write', path: 'public/weeks.html', content: '<h1>Weeks</h1>\n' }],
      line: 'Writing the page students post on.',
      account: 'One page listing the weeks',
    },
  },
  {
    move: {
      kind: 'done',
      line: 'The pages are written.',
      cannot: null,
      account: 'One page listing the weeks, where students post.',
    },
  },
]

async function atBuild(s: Setup): Promise<Conversation> {
  const conversation = await building(s)
  await until(
    () =>
      roundOf(s.store, conversation.id)?.steps.find((step) => step.key === 'build')
        ?.state === 'now',
  )
  return conversation
}

async function until(check: () => boolean, ms = 1500) {
  const deadline = Date.now() + ms
  while (!check()) {
    if (Date.now() > deadline) throw new Error('never reached')
    await new Promise((resolve) => setTimeout(resolve, 2))
  }
}

async function post(
  s: Setup,
  id: string,
  route: string,
  body: unknown = {},
  headers: Record<string, string> = {},
) {
  const response = await s.app.inject({
    method: 'POST',
    url: `/api/conversations/${id}/${route}`,
    headers: {
      cookie: AS_ALICE,
      origin: ORIGIN,
      'content-type': 'application/json',
      ...headers,
    },
    payload: JSON.stringify(body),
  })
  return {
    status: response.statusCode,
    body: response.body === '' ? undefined : (response.json() as unknown),
  }
}

describe('every building route is guarded (F2 Decision 3)', () => {
  it.each(ROUTES)(
    '/%s from a student app is 403 ORIGIN_REFUSED, and reaches no round',
    async (route) => {
      const s = setUp()
      const conversation = await building(s)
      const before = s.store.listMessages(conversation.id).length
      const answer = await post(s, conversation.id, route, BODIES[route], {
        origin: STUDENT_APP,
      })
      expect(answer).toEqual({ status: 403, body: { error: { code: 'ORIGIN_REFUSED' } } })
      expect(s.store.listMessages(conversation.id)).toHaveLength(before)
      expect(roundOf(s.store, conversation.id)?.status).toBe('working')
    },
  )

  it.each(ROUTES)("/%s on another person's conversation is 404", async (route) => {
    const s = setUp()
    const conversation = await building(s)
    const answer = await post(s, conversation.id, route, BODIES[route], {
      cookie: AS_BOB,
    })
    expect(answer).toEqual({ status: 404, body: { error: { code: 'NOT_FOUND' } } })
  })

  it.each(ROUTES)(
    '/%s from a state it does not take is 409 CONVERSATION_STATE',
    async (route) => {
      const s = setUp()
      const conversation = planReady(s)
      const answer = await post(s, conversation.id, route, BODIES[route])
      expect(answer).toEqual({
        status: 409,
        body: { error: { code: 'CONVERSATION_STATE' } },
      })
    },
  )

  it.each([
    ['build', { way: 'sideways' }, 'BUILD_INVALID'],
    ['build', { way: 'different', and: 1 }, 'BUILD_INVALID'],
    ['messages', {}, 'MESSAGE_INVALID'],
    ['messages', { words: '   ' }, 'MESSAGE_INVALID'],
    ['messages', { words: 'x'.repeat(501) }, 'MESSAGE_INVALID'],
    ['answers', { words: 'Yes.' }, 'ANSWER_INVALID'],
    ['answers', { questionId: 'q-1', words: 'x'.repeat(501) }, 'ANSWER_INVALID'],
    ['stop', { now: true }, 'STOP_INVALID'],
  ])('/%s with %j is 400 %s', async (route, body, code) => {
    const s = setUp()
    const conversation = await building(s)
    const answer = await post(s, conversation.id, route, body)
    expect(answer).toEqual({ status: 400, body: { error: { code } } })
  })
})

describe('the round starts when the plan is committed (Decision 11)', () => {
  it('agree commits docs/plan.md, and the conversation is building, round 1 working, on a session of its own', async () => {
    const s = setUp()
    const conversation = planReady(s)
    const frames: Progress[] = []
    s.hub.subscribe(conversation.id, (frame) => frames.push(frame))
    const answer = await post(s, conversation.id, 'plan/agree', {
      version: 1,
      answers: { late: 'It closes at the deadline.' },
    })
    expect(answer.status).toBe(202)
    await until(() => roundOf(s.store, conversation.id)?.status === 'working')
    expect(s.commits).toEqual([BASE])
    await until(() => s.sessionsStarted() === 1)
    expect(s.store.getConversation(conversation.id, ALICE.id)?.state).toBe('building')
    expect(roundOf(s.store, conversation.id)?.round).toBe(1)
    expect(
      frames.some((f) => f.kind === 'state' && f.conversation.state === 'agreed'),
    ).toBe(true)
  })

  it("agree's run ending does not free round 1's claim: straight after, /build is 409 CONVERSATION_BUSY", async () => {
    const s = setUp()
    const conversation = planReady(s)
    let agreed!: () => void
    const done = new Promise<void>((resolve) => (agreed = resolve))
    s.hub.subscribe(conversation.id, (frame) => {
      if (frame.kind === 'step' && frame.step === 'agreeing' && frame.state === 'done')
        agreed()
    })
    await post(s, conversation.id, 'plan/agree', {
      version: 1,
      answers: { late: 'It closes at the deadline.' },
    })
    await done
    await new Promise((resolve) => setTimeout(resolve, 10))
    const answer = await post(s, conversation.id, 'build', {})
    expect(answer).toEqual({
      status: 409,
      body: { error: { code: 'CONVERSATION_BUSY' } },
    })
  })
})

describe('while the round works (F2 work.ts, Review Focus 4)', () => {
  it('/messages, /answers and /stop reach it (202), and /build is 409 CONVERSATION_BUSY', async () => {
    const s = setUp([
      {
        move: {
          kind: 'ask_person',
          ask: 'Should a TA see everything you see?',
          default: "We've built it so only you can.",
          secret: null,
        },
      },
    ])
    const conversation = await building(s)
    await until(() => (roundOf(s.store, conversation.id)?.questions.length ?? 0) === 1)
    const question = roundOf(s.store, conversation.id)!.questions[0]!

    expect(await post(s, conversation.id, 'build', {})).toEqual({
      status: 409,
      body: { error: { code: 'CONVERSATION_BUSY' } },
    })
    expect(
      await post(s, conversation.id, 'messages', { words: 'Make the title bigger.' }),
    ).toEqual({ status: 202, body: undefined })
    expect(roundOf(s.store, conversation.id)?.messageWaiting).toBe(true)
    expect(
      await post(s, conversation.id, 'answers', {
        questionId: question.id,
        words: 'Yes, the TA too.',
      }),
    ).toEqual({ status: 202, body: undefined })
    expect(roundOf(s.store, conversation.id)?.questions[0]).toMatchObject({
      answer: 'Yes, the TA too.',
      answered: true,
    })
    expect(await post(s, conversation.id, 'stop', {})).toEqual({
      status: 202,
      body: undefined,
    })
    await until(() => roundOf(s.store, conversation.id)?.status === 'stopped')
  })

  it("a secret's answer under 6 characters is 400 ANSWER_INVALID, and one with no token held (a restart) is 409 TOKEN_MISSING", async () => {
    const s = setUp([
      {
        move: {
          kind: 'ask_person',
          ask: 'What is the SIS key?',
          default: null,
          secret: 'SIS_KEY',
        },
      },
    ])
    const conversation = await building(s)
    await until(() => roundOf(s.store, conversation.id)?.status === 'paused')
    const question = roundOf(s.store, conversation.id)!.questions[0]!
    expect(
      await post(s, conversation.id, 'answers', {
        questionId: question.id,
        words: 'short',
      }),
    ).toEqual({ status: 400, body: { error: { code: 'ANSWER_INVALID' } } })
    // A restart: a new server over the same store, holding no token for it yet.
    const again = buildServer(
      {
        mode: 'edge',
        port: 7105,
        origin: ORIGIN,
        platformOrigin: platform.origin,
        modelGateway: GATEWAY,
        planModel: 'default-chat',
        smtpUrl: 'smtp://127.0.0.1:7111',
        mailFrom: 'Manifest <manifest@app.manifest.internal>',
      },
      () => undefined,
      { store: s.store },
    )
    cleanups.push(() => again.close())
    const answer = await again.inject({
      method: 'POST',
      url: `/api/conversations/${conversation.id}/answers`,
      headers: { cookie: AS_ALICE, origin: ORIGIN, 'content-type': 'application/json' },
      payload: JSON.stringify({ questionId: question.id, words: 'a-long-enough-value' }),
    })
    expect([answer.statusCode, answer.json()]).toEqual([
      409,
      { error: { code: 'TOKEN_MISSING' } },
    ])
  })

  it('an answer to a question it never asked is 404 QUESTION_NOT_FOUND', async () => {
    const s = setUp()
    const conversation = await building(s)
    expect(
      await post(s, conversation.id, 'answers', { questionId: 'q-9', words: 'Yes.' }),
    ).toEqual({ status: 404, body: { error: { code: 'QUESTION_NOT_FOUND' } } })
  })

  it('/stop twice is 202 both times, and one session is ended', async () => {
    const s = setUp()
    const conversation = await building(s)
    await until(() => s.sessionsStarted() === 1)
    expect((await post(s, conversation.id, 'stop', {})).status).toBe(202)
    await until(() => roundOf(s.store, conversation.id)?.status === 'stopped')
    expect((await post(s, conversation.id, 'stop', {})).status).toBe(202)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(s.ended).toEqual(['session-1'])
  })
})

describe('Carry on (/build)', () => {
  it('a stopped round carries on, on a new session', async () => {
    const s = setUp(AT_BUILD)
    const conversation = await atBuild(s)
    await until(() => s.sessionsStarted() === 1)
    await post(s, conversation.id, 'stop', {})
    await until(() => roundOf(s.store, conversation.id)?.status === 'stopped')
    expect(await post(s, conversation.id, 'build', {})).toEqual({
      status: 202,
      body: undefined,
    })
    await until(() => roundOf(s.store, conversation.id)?.status === 'working')
    await until(() => s.sessionsStarted() === 2)
  })

  it('without a token held (a restart forgot it) is 409 TOKEN_MISSING, which the page answers by handing one over', async () => {
    const s = setUp(AT_BUILD)
    const conversation = await atBuild(s)
    await post(s, conversation.id, 'stop', {})
    await until(() => roundOf(s.store, conversation.id)?.status === 'stopped')
    s.tokens.drop(conversation.id)
    expect(await post(s, conversation.id, 'build', {})).toEqual({
      status: 409,
      body: { error: { code: 'TOKEN_MISSING' } },
    })
    expect(roundOf(s.store, conversation.id)?.status).toBe('stopped')
  })

  it('a round that is not interrupted, stopped or needing them is not carried on: 409 CONVERSATION_STATE', async () => {
    const s = setUp()
    const conversation = planReady(s)
    s.store.saveRun({
      id: 'run-1',
      conversationId: conversation.id,
      round: 1,
      step: 'answers',
      moves: 0,
      tries: {},
      status: 'done',
      sessionIds: [],
      model: null,
      last: null,
      sameRefusal: null,
      detail: null,
    })
    s.store.setState(conversation.id, 'building')
    expect(await post(s, conversation.id, 'build', {})).toEqual({
      status: 409,
      body: { error: { code: 'CONVERSATION_STATE' } },
    })
  })

  it('a round that is built is not carried on: 409 CONVERSATION_STATE', async () => {
    const s = setUp()
    const conversation = planReady(s)
    s.store.setState(conversation.id, 'built')
    expect(await post(s, conversation.id, 'build', {})).toEqual({
      status: 409,
      body: { error: { code: 'CONVERSATION_STATE' } },
    })
  })
})

describe('the state frame carries the round (Review Focus 5)', () => {
  it("a connection's first frame rebuilds the round whole, from the store", async () => {
    const s = setUp()
    const conversation = await building(s)
    await post(s, conversation.id, 'messages', { words: 'Make the title bigger.' })
    await s.app.listen({ host: '127.0.0.1', port: 0 })
    const port = (s.app.server.address() as { port: number }).port
    const controller = new AbortController()
    const response = await fetch(
      `http://127.0.0.1:${port}/api/conversations/${conversation.id}/events`,
      { headers: { cookie: AS_ALICE }, signal: controller.signal },
    )
    const reader = response.body!.getReader()
    let text = ''
    while (!text.includes('\n\n'))
      text += new TextDecoder().decode((await reader.read()).value)
    controller.abort()
    const first = JSON.parse(
      text.slice('data: '.length, text.indexOf('\n\n')),
    ) as Progress
    expect(first.kind).toBe('state')
    expect(first.kind === 'state' && first.round).toEqual(
      roundOf(s.store, conversation.id),
    )
    expect(first.kind === 'state' && first.round?.messageWaiting).toBe(true)
  })
})

describe('a restart (Review Focus 3)', () => {
  it('a server built over a store marks its working rounds interrupted before it can listen', async () => {
    const s = setUp()
    const conversation = await building(s)
    expect(s.booted()).toBe(1)
    const again = buildServer(
      {
        mode: 'edge',
        port: 7105,
        origin: ORIGIN,
        platformOrigin: platform.origin,
        modelGateway: GATEWAY,
        planModel: 'default-chat',
        smtpUrl: 'smtp://127.0.0.1:7111',
        mailFrom: 'Manifest <manifest@app.manifest.internal>',
      },
      () => undefined,
      { store: s.store },
    )
    cleanups.push(() => again.close())
    expect(roundOf(s.store, conversation.id)?.status).toBe('interrupted')
  })
})

/** A change on the same app, in `state`: its project and what was asked, as Task 6 stores them. */
function changeOn(
  s: Setup,
  state: Conversation['state'],
  words = 'Also show a word count.',
) {
  s.store.rememberPerson(ALICE)
  const made = s.store.createChange(ALICE.id, PROJECT.id, words.replace(/\.$/, ''), words)
  s.store.addMessage(made.id, 'we', { kind: 'project', project: PROJECT })
  s.store.addMessage(made.id, 'person', { kind: 'asked', change: 1, words, fix: null })
  s.tokens.put(made.id, TOKEN)
  return s.store.setState(made.id, state)
}

/** A first conversation whose round is done: built. */
function built(s: Setup): Conversation {
  const conversation = planReady(s)
  s.store.saveRun({
    id: `run-${conversation.id}`,
    conversationId: conversation.id,
    round: 1,
    step: 'answers',
    moves: 0,
    tries: {},
    status: 'done',
    sessionIds: [],
    model: null,
    last: null,
    sameRefusal: null,
    detail: null,
  })
  return s.store.setState(conversation.id, 'built')
}

const stateOf = (s: Setup, id: string) => s.store.getConversation(id, ALICE.id)?.state
const placeOf = (s: Setup, id: string) =>
  s.store.waitingOn(PROJECT.id).findIndex((c) => c.id === id) + 1

describe('the line on the building routes (F4 Task 6, Review Focus 1)', () => {
  it("a built conversation's message is its next change: on a free app it starts at once", async () => {
    const s = setUp()
    const conversation = built(s)
    const answer = await post(s, conversation.id, 'messages', {
      words: 'Also a word count.',
    })
    expect(answer.status).toBe(202)
    // Its token is held, so its change is planned at once (Task 7), with no press.
    await until(() => stateOf(s, conversation.id) === 'plan-ready')
    expect(pieceOf(s.store, conversation.id)).toEqual({
      kind: 'change',
      change: 1,
      asked: ['Also a word count.'],
      incidentId: null,
      environment: null,
      dryRun: null,
      outage: null,
    })
  })

  it("a built conversation's message while another holds the app waits: its words its next change", async () => {
    const s = setUp()
    const holder = changeOn(s, 'plan-ready')
    const conversation = built(s)
    expect(
      (await post(s, conversation.id, 'messages', { words: 'Bigger title.' })).status,
    ).toBe(202)
    expect(stateOf(s, conversation.id)).toBe('waiting')
    expect(placeOf(s, conversation.id)).toBe(1)
    expect(stateOf(s, holder.id)).toBe('plan-ready')
    expect(pieceOf(s.store, conversation.id).asked).toEqual(['Bigger title.'])
  })

  it("a waiting conversation's messages join what was asked, and it keeps its place", async () => {
    const s = setUp()
    changeOn(s, 'plan-ready')
    const waiting = changeOn(s, 'waiting', 'Bigger title.')
    s.store.setState(waiting.id, 'waiting')
    expect((await post(s, waiting.id, 'messages', { words: 'And bold.' })).status).toBe(
      202,
    )
    expect(pieceOf(s.store, waiting.id)).toMatchObject({
      change: 1,
      asked: ['Bigger title.', 'And bold.'],
    })
    expect(stateOf(s, waiting.id)).toBe('waiting')
    expect(placeOf(s, waiting.id)).toBe(1)
  })

  it('Leave the line: /stop on a waiting change sets it aside, and the line closes up', async () => {
    const s = setUp()
    const holder = changeOn(s, 'plan-ready')
    const a = changeOn(s, 'waiting', 'A.')
    const b = changeOn(s, 'waiting', 'B.')
    s.store.setState(a.id, 'waiting', { waitingSince: '2026-09-28T10:00:00.000Z' })
    s.store.setState(b.id, 'waiting', { waitingSince: '2026-09-28T10:00:01.000Z' })
    expect((await post(s, a.id, 'stop')).status).toBe(202)
    expect(stateOf(s, a.id)).toBe('set-aside')
    expect(placeOf(s, b.id)).toBe(1)
    expect(stateOf(s, holder.id)).toBe('plan-ready')
  })

  it.each(['planning', 'plan-ready'] as const)(
    'Not now: /stop on a change %s sets it aside and frees the app; the next starts by itself',
    async (state) => {
      const s = setUp()
      const holder = changeOn(s, state)
      const next = changeOn(s, 'waiting', 'Next.')
      s.store.setState(next.id, 'waiting')
      expect((await post(s, holder.id, 'stop')).status).toBe(202)
      expect(stateOf(s, holder.id)).toBe('set-aside')
      await until(() => stateOf(s, next.id) === 'plan-ready')
    },
  )

  it("the holder's round stopped: when what it had in flight returns, the next starts by itself, with no request", async () => {
    const s = setUp(AT_BUILD)
    const holder = await atBuild(s)
    const next = changeOn(s, 'waiting', 'Next.')
    s.store.setState(next.id, 'waiting')
    expect((await post(s, holder.id, 'stop')).status).toBe(202)
    await until(() => stateOf(s, next.id) === 'plan-ready')
    expect(roundOf(s.store, holder.id)?.status).toBe('stopped')
  })

  it('Carry on after a Stop while another holds: it waits; freed, the same round carries on, on a new session, never a new round', async () => {
    const s = setUp(AT_BUILD)
    const conversation = await atBuild(s)
    await post(s, conversation.id, 'stop')
    await until(() => !s.hub.busy(conversation.id))
    const holder = changeOn(s, 'plan-ready')
    expect((await post(s, conversation.id, 'build')).status).toBe(202)
    expect(stateOf(s, conversation.id)).toBe('waiting')
    expect(s.sessionsStarted()).toBe(1)
    // The holder set aside: the stopped round carries on by itself.
    expect((await post(s, holder.id, 'stop')).status).toBe(202)
    await until(() => roundOf(s.store, conversation.id)?.status === 'working')
    expect(stateOf(s, conversation.id)).toBe('building')
    expect(s.store.listRuns(conversation.id).map((r) => r.round)).toEqual([1])
    await until(() => s.sessionsStarted() === 2)
  })

  it('Leave the line on a stopped round waiting to carry on leaves it stopped, never set aside', async () => {
    const s = setUp(AT_BUILD)
    const conversation = await atBuild(s)
    await post(s, conversation.id, 'stop')
    await until(() => !s.hub.busy(conversation.id))
    changeOn(s, 'plan-ready')
    await post(s, conversation.id, 'build')
    expect(stateOf(s, conversation.id)).toBe('waiting')
    expect((await post(s, conversation.id, 'stop')).status).toBe(202)
    expect(stateOf(s, conversation.id)).toBe('building')
    expect(roundOf(s.store, conversation.id)?.status).toBe('stopped')
  })

  it("the first plan's /stop is still refused: only a change is set aside", async () => {
    const s = setUp()
    const conversation = planReady(s)
    expect(await post(s, conversation.id, 'stop')).toEqual({
      status: 409,
      body: { error: { code: 'CONVERSATION_STATE' } },
    })
  })
})

/**
 * F6b D3, SEE ALL, ACT ON YOUR OWN (Task 2): Alice owns the app, Bob helps on it, and Dana is on
 * nothing. Each reads by her standing to the conversation (`api/sharing.ts`); every change stays
 * its own person's; an owner may also stop anyone's, to free the app.
 */
describe('working on it together (F6b D3, Task 2)', () => {
  /** The app's kept members (F6), as the keeper keeps them, and everyone's name. */
  function together(s: Setup) {
    for (const person of [ALICE, BOB, DANA]) s.store.rememberPerson(person)
    s.store.putMembers(PROJECT.id, [
      {
        userId: ALICE.id,
        role: 'owner',
        displayName: ALICE.displayName,
        email: ALICE.email,
      },
      {
        userId: BOB.id,
        role: 'collaborator',
        displayName: BOB.displayName,
        email: BOB.email,
      },
    ])
  }

  /** A change of `person`'s on the app, in `state`. */
  function changeOf(
    s: Setup,
    person: { id: string },
    state: Conversation['state'],
    words = 'Also show a word count.',
  ) {
    const made = s.store.createChange(
      person.id,
      PROJECT.id,
      words.replace(/\.$/, ''),
      words,
    )
    s.store.addMessage(made.id, 'we', { kind: 'project', project: PROJECT })
    s.store.addMessage(made.id, 'person', { kind: 'asked', change: 1, words, fix: null })
    s.tokens.put(made.id, TOKEN)
    return s.store.setState(made.id, state)
  }

  /** Bob's first round under way, its lead at the build. */
  async function bobsRound(s: Setup): Promise<Conversation> {
    const conversation = planReady(s, BOB.id)
    s.store.rememberPerson(BOB)
    s.rounds().start(conversation, TOKEN)
    await until(
      () =>
        roundOf(s.store, conversation.id)?.steps.find((step) => step.key === 'build')
          ?.state === 'now',
    )
    return conversation
  }

  const get = async (s: Setup, url: string, cookie: string) => {
    const response = await s.app.inject({ method: 'GET', url, headers: { cookie } })
    return { status: response.statusCode, body: response.json() as unknown }
  }

  const as = (cookie: string) => ({ cookie })

  /** The first frame of a conversation's stream, as `cookie` reads it. */
  async function firstFrame(s: Setup, id: string, cookie: string): Promise<Progress> {
    await s.app.listen({ host: '127.0.0.1', port: 0 })
    const port = (s.app.server.address() as { port: number }).port
    const controller = new AbortController()
    const response = await fetch(
      `http://127.0.0.1:${port}/api/conversations/${id}/events`,
      { headers: { cookie }, signal: controller.signal },
    )
    expect(response.status).toBe(200)
    const reader = response.body!.getReader()
    let text = ''
    while (!text.includes('\n\n'))
      text += new TextDecoder().decode((await reader.read()).value)
    controller.abort()
    return JSON.parse(text.slice('data: '.length, text.indexOf('\n\n'))) as Progress
  }

  it("a member reads another's conversation; someone on nothing reads 404", async () => {
    const s = setUp()
    together(s)
    const bobs = changeOf(s, BOB, 'plan-ready')
    const url = `/api/conversations/${bobs.id}`
    expect(await get(s, url, AS_ALICE)).toEqual({ status: 200, body: bobs })
    expect(await get(s, url, AS_BOB)).toEqual({ status: 200, body: bobs })
    expect(await get(s, url, AS_DANA)).toEqual({
      status: 404,
      body: { error: { code: 'NOT_FOUND' } },
    })
    expect(await get(s, `${url}/events`, AS_DANA)).toEqual({
      status: 404,
      body: { error: { code: 'NOT_FOUND' } },
    })
  })

  it("a member's stream of another's conversation opens on its state, which names whose it is", async () => {
    const s = setUp()
    together(s)
    const bobs = changeOf(s, BOB, 'plan-ready')
    const first = await firstFrame(s, bobs.id, AS_ALICE)
    expect(first).toMatchObject({
      kind: 'state',
      conversation: { ...bobs, byName: BOB.displayName },
    })
  })

  it('an intake conversation (no app yet) stays its own person’s alone (design §3)', async () => {
    const s = setUp()
    together(s)
    const intake = s.store.createConversation(BOB.id, 'A page for readings.')
    expect((await get(s, `/api/conversations/${intake.id}`, AS_ALICE)).status).toBe(404)
    expect((await get(s, `/api/conversations/${intake.id}`, AS_BOB)).status).toBe(200)
  })

  it('an app’s conversations: a member sees everyone’s, newest first, each with who started it; someone on nothing sees none', async () => {
    const s = setUp()
    together(s)
    const alices = changeOf(s, ALICE, 'set-aside', 'Bigger title.')
    const bobs = changeOf(s, BOB, 'plan-ready')
    const url = `/api/apps/${PROJECT.id}/conversations`
    const listed = (await get(s, url, AS_BOB)).body as AppConversation[]
    expect(listed.map((c) => [c.id, c.by])).toEqual([
      [bobs.id, { id: BOB.id, name: BOB.displayName }],
      [alices.id, { id: ALICE.id, name: ALICE.displayName }],
    ])
    expect(await get(s, url, AS_DANA)).toEqual({ status: 200, body: [] })
  })

  it('with no kept members, as today: a person sees their own alone', async () => {
    const s = setUp()
    for (const person of [ALICE, BOB]) s.store.rememberPerson(person)
    changeOf(s, ALICE, 'set-aside', 'Bigger title.')
    const bobs = changeOf(s, BOB, 'plan-ready')
    const url = `/api/apps/${PROJECT.id}/conversations`
    const listed = (await get(s, url, AS_BOB)).body as AppConversation[]
    expect(listed.map((c) => c.id)).toEqual([bobs.id])
    expect((await get(s, `/api/conversations/${bobs.id}`, AS_ALICE)).status).toBe(404)
  })

  it('the line names who holds the app, by their name', async () => {
    const s = setUp()
    together(s)
    changeOf(s, BOB, 'plan-ready')
    const waiting = changeOf(s, ALICE, 'waiting', 'Bigger title.')
    const listed = (await get(s, `/api/apps/${PROJECT.id}/conversations`, AS_ALICE))
      .body as AppConversation[]
    expect(listed.find((c) => c.id === waiting.id)?.line?.holder?.by).toBe(
      BOB.displayName,
    )
  })

  /** Every change route, the state its own person may press it in, and a body it would take. */
  const CHANGES: [string, Conversation['state'], unknown][] = [
    ['intake-key', 'describing', {}],
    ['intake', 'describing', {}],
    ['names', 'naming', { taken: [] }],
    ['blueprint', 'naming', { blueprints: [{ ref: 'node-ts-mongo@1', starters: [] }] }],
    ['project', 'naming', { projectId: PROJECT.id, token: TOKEN }],
    ['plan', 'planning', {}],
    ['plan/correction', 'plan-ready', { correction: 'Bigger, please.' }],
    ['plan/agree', 'plan-ready', { version: 1, answers: {} }],
    ['build', 'building', {}],
    ['messages', 'built', { words: 'Make the title bigger, please.' }],
    ['answers', 'building', { questionId: 'q-1', words: 'It closes at the deadline.' }],
  ]

  it.each(CHANGES)(
    "/%s on a helper's conversation, pressed by an owner, is 404 NOT_FOUND, and nothing changes (Review Focus 2)",
    async (route, state, body) => {
      const s = setUp()
      together(s)
      const bobs = changeOf(s, BOB, state)
      const messages = s.store.listMessages(bobs.id).length
      expect(await post(s, bobs.id, route, body)).toEqual({
        status: 404,
        body: { error: { code: 'NOT_FOUND' } },
      })
      expect(s.store.getConversation(bobs.id, BOB.id)?.state).toBe(state)
      expect(s.store.listMessages(bobs.id)).toHaveLength(messages)
    },
  )

  it("an owner stops a helper's round: 202, stopped, by her; the app is freed and the next starts", async () => {
    const s = setUp(AT_BUILD)
    together(s)
    const bobs = await bobsRound(s)
    const next = changeOf(s, ALICE, 'waiting', 'Next.')
    expect(await post(s, bobs.id, 'stop')).toEqual({ status: 202, body: undefined })
    await until(() => roundOf(s.store, bobs.id)?.status === 'stopped')
    expect(s.store.latestRun(bobs.id)?.detail?.stopped).toEqual({
      by: ALICE.id,
      why: 'stopped',
    })
    await until(() => s.store.getConversation(next.id, ALICE.id)?.state === 'plan-ready')
  })

  it('the round says who stopped it, to whoever reads it; its own person’s Stop names nobody', async () => {
    const s = setUp(AT_BUILD)
    together(s)
    const bobs = await bobsRound(s)
    await post(s, bobs.id, 'stop')
    await until(() => roundOf(s.store, bobs.id)?.status === 'stopped')
    expect(roundOf(s.store, bobs.id)?.stopped).toEqual({
      name: ALICE.displayName,
      why: 'stopped',
    })

    const t = setUp(AT_BUILD)
    together(t)
    const own = await bobsRound(t)
    await post(t, own.id, 'stop', {}, as(AS_BOB))
    await until(() => roundOf(t.store, own.id)?.status === 'stopped')
    expect(roundOf(t.store, own.id)?.stopped).toBeNull()
  })

  it("a helper's Stop on another's conversation is 404, and the round works on", async () => {
    const s = setUp(AT_BUILD)
    together(s)
    const alices = await atBuild(s)
    expect(await post(s, alices.id, 'stop', {}, as(AS_BOB))).toEqual({
      status: 404,
      body: { error: { code: 'NOT_FOUND' } },
    })
    expect(roundOf(s.store, alices.id)?.status).toBe('working')
  })

  it('someone on nothing stops nothing: 404', async () => {
    const s = setUp(AT_BUILD)
    together(s)
    const bobs = await bobsRound(s)
    expect((await post(s, bobs.id, 'stop', {}, as(AS_DANA))).status).toBe(404)
    expect(roundOf(s.store, bobs.id)?.status).toBe('working')
  })

  it('pressed twice, and by its own person after: one stop, still hers, one session ended (Review Focus 3)', async () => {
    const s = setUp(AT_BUILD)
    together(s)
    const bobs = await bobsRound(s)
    await until(() => s.sessionsStarted() === 1)
    const [one, two] = await Promise.all([
      post(s, bobs.id, 'stop'),
      post(s, bobs.id, 'stop'),
    ])
    expect([one.status, two.status]).toEqual([202, 202])
    await until(() => roundOf(s.store, bobs.id)?.status === 'stopped')
    expect((await post(s, bobs.id, 'stop', {}, as(AS_BOB))).status).toBe(202)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(s.store.latestRun(bobs.id)?.detail?.stopped).toEqual({
      by: ALICE.id,
      why: 'stopped',
    })
    expect(s.ended).toEqual(['session-1'])
  })

  it("its own person carries on after an owner's Stop: 202, theirs", async () => {
    const s = setUp(AT_BUILD)
    together(s)
    const bobs = await bobsRound(s)
    await post(s, bobs.id, 'stop')
    await until(() => !s.hub.busy(bobs.id))
    expect(await post(s, bobs.id, 'build', {}, as(AS_BOB))).toEqual({
      status: 202,
      body: undefined,
    })
    await until(() => roundOf(s.store, bobs.id)?.status === 'working')
    expect(roundOf(s.store, bobs.id)?.stopped).toBeNull()
  })

  it.each(['waiting', 'planning', 'plan-ready'] as const)(
    "an owner's Stop on a helper's change %s sets it aside and frees the app, as its own person's would",
    async (state) => {
      const s = setUp()
      together(s)
      const holder = changeOf(s, BOB, state === 'waiting' ? 'plan-ready' : state)
      const bobs = state === 'waiting' ? changeOf(s, BOB, 'waiting', 'B.') : holder
      expect((await post(s, bobs.id, 'stop')).status).toBe(202)
      expect(s.store.getConversation(bobs.id, BOB.id)?.state).toBe('set-aside')
    },
  )

  it("an owner's GET /api/needs holds no question of a helper's (design §3: the band stays its own person's)", async () => {
    const s = setUp()
    together(s)
    s.store.putApp({
      projectId: PROJECT.id,
      name: PROJECT.name,
      slug: PROJECT.slug,
      state: 'active',
      launchedAt: null,
      studentsUrl: null,
    })
    const bobs = changeOf(s, BOB, 'building')
    s.store.saveRun({
      id: `run-${bobs.id}`,
      conversationId: bobs.id,
      round: 1,
      step: 'pages',
      moves: 0,
      tries: {},
      status: 'paused',
      sessionIds: [],
      model: null,
      last: null,
      sameRefusal: null,
      detail: null,
    })
    s.store.addQuestion({
      id: 'q-1',
      runId: `run-${bobs.id}`,
      conversationId: bobs.id,
      ask: 'When does it close?',
      fallback: null,
      secret: null,
    })
    s.store.setState(bobs.id, 'paused')
    const questions = async (cookie: string) =>
      (
        (await get(s, '/api/needs', cookie)).body as { needs: { kind: string }[] }
      ).needs.filter((n) => n.kind === 'question')
    expect(await questions(AS_ALICE)).toEqual([])
    expect(await questions(AS_BOB)).toHaveLength(1)
  })
})
