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
import type { Progress } from './progress.js'
import { roundOf } from './round-state.js'
import { ALICE, AS_ALICE, AS_BOB, fakeControlPlane } from './testing.js'

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
          onAnswer({ model: 'default-chat-large', fallback: false, usage: null })
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
  }
  const app = buildServer(config, () => undefined, {
    store,
    hub,
    tokens,
    projects,
    sessions,
    authoring,
    planModel: () => scripted({ plan: [PLAN] }),
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
  s.store.rememberPerson({ id: personId, displayName: 'Someone' })
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
  { move: { kind: 'done', line: 'The pages are written.', cannot: null } },
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
      },
      () => undefined,
      { store: s.store },
    )
    cleanups.push(() => again.close())
    expect(roundOf(s.store, conversation.id)?.status).toBe('interrupted')
  })
})
