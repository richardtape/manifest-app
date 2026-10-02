import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../app.js'
import { planMarkdown, readPlanMarkdown } from '../agents/plan.js'
import type { Rounds } from '../build/round.js'
import type { Config } from '../config.js'
import { ModelError, type Model } from '../model/client.js'
import { scripted } from '../model/scripted.js'
import type { AgentSessions } from '../platform/agent-sessions.js'
import type { Authoring } from '../platform/authoring.js'
import { createConversationTokens, type Projects } from '../platform/project.js'
import { PlatformRefusal } from '../platform/refusal.js'
import { openStore, type Store } from '../store/db.js'
import { dumpAll, scratchDir } from '../store/testing.js'
import { createHub, type Hub } from './events.js'
import type { Progress } from './progress.js'
import { ALICE, AS_ALICE, fakeControlPlane } from './testing.js'

/**
 * MOMENT 5 ON OUR SERVER (F2 Task 9): the plan written on the person's agent session, with the
 * conversation's token; corrected; agreed, and committed as docs/plan.md. The platform is a
 * set of recording fakes: the mock answers its examples whatever is asked (M2), so only a
 * fake can show what was sent.
 */
const ORIGIN = 'https://app.manifest.internal'
const GATEWAY = 'http://127.0.0.1:7106/v1'
const TOKEN = 'mft_test_x_the_conversations_token'
const KEY = 'sk-test-y-the-sessions-key'
const PROJECT = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Reading responses',
  slug: 'reading-responses',
  blueprint: 'node-ts-mongo@1',
}
const WORDS =
  "A page where students post a response to the week's reading. About 200 students."
const PLAN = {
  studentsSee: 'One page listing the weeks.',
  youSee: 'Every response for a week on one page.',
  itKeeps: 'The text students write, their name, and when they posted it.',
  whoGetsIn: 'Anyone with a CWL can sign in.',
  ai: 'None.',
  assumed: ['Twelve weeks, matching a standard term'],
  onlyYouKnow: [
    { id: 'late', ask: 'Is a late post still a post, or does it close at the deadline?' },
  ],
}
const CORRECTED = {
  ...PLAN,
  youSee: 'Every response for a week on one page. Your TA too.',
}
/** docs/plan.md as F2 committed it: the agreement a change starts from. */
const AGREED_FILE = planMarkdown(
  PROJECT.name,
  { ...PLAN, changed: [] },
  { late: 'It closes at the deadline.' },
)

let platform: Awaited<ReturnType<typeof fakeControlPlane>>
beforeAll(async () => {
  platform = await fakeControlPlane()
})
afterAll(() => platform.close())

const cleanups: (() => Promise<unknown> | void)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

type Call = [string, ...unknown[]]

/** The platform, as fakes that record every call and answer as told. */
function fakes(
  options: {
    budget?: () => Promise<Awaited<ReturnType<AgentSessions['budget']>>>
    start?: () => Promise<Awaited<ReturnType<AgentSessions['start']>>>
    pack?: () => Promise<string>
    commit?: () => Promise<Awaited<ReturnType<Authoring['commitPlan']>>>
    /** docs/plan.md as the tree holds it (F4 Task 7): F2's, agreed, by default. */
    planFile?: () => Promise<string | null>
  } = {},
) {
  const calls: Call[] = []
  let sessions = 0
  const agentSessions: AgentSessions = {
    budget: (token) => {
      calls.push(['budget', token])
      return (
        options.budget?.() ??
        Promise.resolve({
          monthlyUsd: 10,
          remainingUsd: 9.35,
          resetsAt: '2026-10-01T00:00:00.000Z',
        })
      )
    },
    start: (token, projectId, name) => {
      calls.push(['start', token, projectId, name])
      sessions++
      return (
        options.start?.() ??
        Promise.resolve({
          sessionId: `session-${sessions}`,
          key: KEY,
          baseUrl: GATEWAY,
          models: ['default-chat', 'default-embed'],
          expiresAt: '2026-09-28T05:00:00.000Z',
          capUsd: 2,
        })
      )
    },
    list: () => Promise.resolve([]),
    end: (token, sessionId) => {
      calls.push(['end', token, sessionId])
      return Promise.resolve()
    },
  }
  const projects: Projects = {
    read: (token, projectId) => {
      calls.push(['read', token, projectId])
      return Promise.resolve(PROJECT)
    },
    knowledgePack: (token, blueprint) => {
      calls.push(['knowledgePack', token, blueprint])
      return options.pack?.() ?? Promise.resolve('## AGENTS.md\n\nHow it is built.')
    },
  }
  const authoring: Authoring = {
    tree: (token, projectId) => {
      calls.push(['tree', token, projectId])
      return Promise.resolve({ commitSha: 'a'.repeat(40), paths: ['package.json'] })
    },
    readPlan: (token, projectId, ref) => {
      calls.push(['readPlan', token, projectId, ref])
      return options.planFile?.() ?? Promise.resolve(AGREED_FILE)
    },
    commitPlan: (token, projectId, baseCommit, markdown, message) => {
      calls.push(['commitPlan', token, projectId, baseCommit, markdown, message])
      return (
        options.commit?.() ??
        Promise.resolve({
          commitSha: 'c'.repeat(40),
          sent: [
            { dryRun: true, baseCommit, paths: ['docs/plan.md'] },
            { dryRun: false, baseCommit, paths: ['docs/plan.md'] },
          ],
        })
      )
    },
  }
  const named = (name: string) =>
    calls.filter((c) => c[0] === name).map((c) => c.slice(1))
  return { calls, named, agentSessions, projects, authoring }
}

async function setUp(
  model: Model = scripted({ plan: [PLAN] }),
  options: Parameters<typeof fakes>[0] = {},
  file?: string,
) {
  let where = file
  if (where === undefined) {
    const { dir, remove } = scratchDir()
    cleanups.push(remove)
    where = join(dir, 'app.sqlite')
  }
  const store: Store = openStore(where)
  const hub: Hub = createHub()
  const tokens = createConversationTokens()
  const platformFakes = fakes(options)
  const keys: string[] = []
  // F3 Decision 11: agree starts round 1. The round is Task 8's, tested there; here, what it was handed.
  const roundsStarted: { conversationId: string; state: string; token: string }[] = []
  const rounds: Rounds = {
    start: (conversation, token) => {
      platformFakes.calls.push(['roundStarted', conversation.id])
      roundsStarted.push({
        conversationId: conversation.id,
        state: conversation.state,
        token,
      })
    },
    carryOn: () => undefined,
    withoutToken: () => undefined,
    message: () => undefined,
    answer: () => 'unknown',
    stop: () => undefined,
    interruptedOnBoot: () => undefined,
  }
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
    projects: platformFakes.projects,
    sessions: platformFakes.agentSessions,
    authoring: platformFakes.authoring,
    planModel: (key) => {
      keys.push(key)
      return model
    },
    rounds: () => rounds,
  })
  cleanups.push(
    () => app.close(),
    () => store.close(),
  )
  return { app, store, hub, tokens, file: where, keys, roundsStarted, ...platformFakes }
}

type Setup = Awaited<ReturnType<typeof setUp>>

/** A conversation whose project is made and whose token is ours: moment 4 is over. */
function made(s: Setup) {
  s.store.rememberPerson(ALICE)
  const conversation = s.store.createConversation(ALICE.id, WORDS)
  s.store.addMessage(conversation.id, 'we', {
    kind: 'understood',
    round: 1,
    understood: {
      questions: [],
      restatement: "A page where your students post a response to the week's reading.",
      audience: { scale: 'class', burst: 'synchronised', from: 'About 200 students' },
      cannot: [],
    },
  })
  s.store.addMessage(conversation.id, 'we', { kind: 'project', project: PROJECT })
  s.store.setState(conversation.id, 'making', { projectId: PROJECT.id })
  s.tokens.put(conversation.id, TOKEN)
  return conversation
}

/** POST a route, and wait for the stream's answer: the next state that is not planning, or a refusal. */
async function post(
  s: Setup,
  id: string,
  route: string,
  body: unknown = {},
  headers: Record<string, string> = {},
) {
  const frames: Progress[] = []
  let settled!: () => void
  const done = new Promise<void>((resolve) => (settled = resolve))
  const unsubscribe = s.hub.subscribe(id, (frame) => {
    frames.push(frame)
    if (
      frame.kind === 'refusal' ||
      (frame.kind === 'state' &&
        !['planning', 'making'].includes(frame.conversation.state))
    )
      settled()
  })
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
  if (response.statusCode === 202)
    await Promise.race([
      done,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`no answer: ${JSON.stringify(frames)}`)), 2000),
      ),
    ])
  unsubscribe()
  const states = frames.filter((f) => f.kind === 'state')
  const last = states.at(-1)
  return {
    status: response.statusCode,
    body: response.body === '' ? undefined : (response.json() as unknown),
    frames,
    state: last?.kind === 'state' ? last : undefined,
    refusal: frames.find((f) => f.kind === 'refusal'),
  }
}

const never = (): Model => ({ complete: () => new Promise(() => undefined) })

describe('POST /api/conversations/:id/plan: written on the person’s agent session (moment 5)', () => {
  it('with the conversation’s token: the budget, a session named after the conversation, the pack and the files, the plan on its key, and the session ended', async () => {
    const s = await setUp()
    const conversation = made(s)
    const answer = await post(s, conversation.id, 'plan')
    expect(answer.status).toBe(202)
    expect(s.calls.map((c) => c[0])).toEqual([
      'budget',
      'start',
      'knowledgePack',
      'tree',
      'end',
    ])
    expect(s.named('budget')).toEqual([[TOKEN]])
    expect(s.named('start')).toEqual([[TOKEN, PROJECT.id, 'First build']])
    expect(s.named('knowledgePack')).toEqual([[TOKEN, PROJECT.blueprint]])
    expect(s.named('tree')).toEqual([[TOKEN, PROJECT.id]])
    expect(s.named('end')).toEqual([[TOKEN, 'session-1']])
    expect(s.keys).toEqual([KEY])
    expect(answer.frames.filter((f) => f.kind === 'step')).toEqual([
      { kind: 'step', step: 'reading', state: 'now' },
      { kind: 'step', step: 'reading', state: 'done' },
      { kind: 'step', step: 'writing', state: 'now' },
      { kind: 'step', step: 'writing', state: 'done' },
    ])
    expect(answer.state).toMatchObject({
      conversation: { state: 'plan-ready' },
      plan: { version: 1, plan: { ...PLAN, changed: [] } },
    })
  })

  it('is working at once: the conversation is planning before the answer is sent', async () => {
    const s = await setUp(never())
    const conversation = made(s)
    const answer = await s.app.inject({
      method: 'POST',
      url: `/api/conversations/${conversation.id}/plan`,
      headers: { cookie: AS_ALICE, origin: ORIGIN },
    })
    expect(answer.statusCode).toBe(202)
    expect(s.store.getConversation(conversation.id, ALICE.id)?.state).toBe('planning')
    expect(s.hub.working(conversation.id)).toHaveLength(1)
  })

  it('a session never outlives its step: a plan that comes back wrong twice ends it, halts the step, and is refused with a reference', async () => {
    const bad = { ...PLAN, onlyYouKnow: [{ id: 'x', ask: 'Late posts' }] }
    const s = await setUp(scripted({ plan: [bad, bad] }))
    const conversation = made(s)
    const answer = await post(s, conversation.id, 'plan')
    expect(s.named('end')).toEqual([[TOKEN, 'session-1']])
    expect(answer.frames).toContainEqual({
      kind: 'step',
      step: 'writing',
      state: 'halted',
    })
    expect(answer.refusal).toEqual({
      kind: 'refusal',
      code: 'MODEL_ANSWER_INVALID',
      reference: expect.stringMatching(/^[0-9A-F]{4}-[0-9A-F]{4}$/),
    })
    expect(dumpAll(s.file)['problems']).toContain(
      (answer.refusal as { reference: string }).reference,
    )
    expect(s.store.getConversation(conversation.id, ALICE.id)?.state).toBe('planning')
  })

  it('and a pack that cannot be read ends it too', async () => {
    const s = await setUp(undefined, {
      pack: () => Promise.reject(new PlatformRefusal('PLATFORM_UNAVAILABLE', null)),
    })
    const conversation = made(s)
    const answer = await post(s, conversation.id, 'plan')
    expect(answer.refusal).toMatchObject({ code: 'PLATFORM_UNAVAILABLE' })
    expect(answer.frames).toContainEqual({
      kind: 'step',
      step: 'reading',
      state: 'halted',
    })
    expect(s.named('end')).toEqual([[TOKEN, 'session-1']])
  })

  it('the allowance used up (remainingUsd 0): needs you, whose it is and when it resets, and no session started', async () => {
    const s = await setUp(undefined, {
      budget: () =>
        Promise.resolve({
          monthlyUsd: 10,
          remainingUsd: 0,
          resetsAt: '2026-10-01T00:00:00.000Z',
        }),
    })
    const conversation = made(s)
    const answer = await post(s, conversation.id, 'plan')
    expect(answer.refusal).toMatchObject({
      code: 'MODEL_BUDGET_EXHAUSTED',
      allowance: { monthlyUsd: 10, resetsAt: '2026-10-01T00:00:00.000Z' },
    })
    expect(s.named('start')).toEqual([])
  })

  it('AGENT_BUDGET_EXHAUSTED at the start (a budget read seconds stale) is the same needs you', async () => {
    const s = await setUp(undefined, {
      start: () => Promise.reject(new ModelError('MODEL_BUDGET_EXHAUSTED', 409)),
    })
    const conversation = made(s)
    const answer = await post(s, conversation.id, 'plan')
    expect(answer.refusal).toMatchObject({
      code: 'MODEL_BUDGET_EXHAUSTED',
      allowance: { monthlyUsd: 10, resetsAt: '2026-10-01T00:00:00.000Z' },
    })
  })

  it('a budget the gateway could not read starts anyway', async () => {
    const s = await setUp(undefined, {
      budget: () =>
        Promise.resolve({ monthlyUsd: 10, remainingUsd: null, resetsAt: null }),
    })
    const conversation = made(s)
    expect((await post(s, conversation.id, 'plan')).state?.conversation.state).toBe(
      'plan-ready',
    )
  })

  it.each([
    [
      'the platform gives this app no model',
      'MODEL_NOT_AVAILABLE',
      { start: () => Promise.reject(new ModelError('MODEL_NOT_AVAILABLE', 409)) },
      false,
    ],
    [
      'a session without the plan’s model',
      'MODEL_NOT_AVAILABLE',
      {
        start: () =>
          Promise.resolve({
            sessionId: 'session-1',
            key: KEY,
            baseUrl: GATEWAY,
            models: ['default-embed'],
            expiresAt: '2026-09-28T05:00:00.000Z',
            capUsd: 2,
          }),
      },
      true,
    ],
    [
      'a session on another gateway',
      'MODEL_GATEWAY_REFUSED',
      {
        start: () =>
          Promise.resolve({
            sessionId: 'session-1',
            key: KEY,
            baseUrl: 'https://elsewhere.example/v1',
            models: ['default-chat'],
            expiresAt: '2026-09-28T05:00:00.000Z',
            capUsd: 2,
          }),
      },
      true,
    ],
  ] as const)(
    '%s is %s, and the model is never asked',
    async (_, code, options, ended) => {
      const s = await setUp(undefined, options)
      const conversation = made(s)
      const answer = await post(s, conversation.id, 'plan')
      expect(answer.refusal).toMatchObject({ code })
      expect(s.keys).toEqual([])
      expect(s.named('end')).toHaveLength(ended ? 1 : 0)
    },
  )

  it('a token the platform refuses is TOKEN_REFUSED, and dropped', async () => {
    const s = await setUp(undefined, {
      budget: () => Promise.reject(new PlatformRefusal('UNAUTHENTICATED', 401)),
    })
    const conversation = made(s)
    const answer = await post(s, conversation.id, 'plan')
    expect(answer.refusal).toMatchObject({ code: 'TOKEN_REFUSED' })
    expect(s.tokens.get(conversation.id)).toBeUndefined()
  })

  it('without the token (a restart forgot it) is 409 TOKEN_MISSING, and the platform is never asked', async () => {
    const s = await setUp()
    const conversation = made(s)
    s.tokens.drop(conversation.id)
    const answer = await post(s, conversation.id, 'plan')
    expect(answer.status).toBe(409)
    expect(answer.body).toEqual({ error: { code: 'TOKEN_MISSING' } })
    expect(s.calls).toEqual([])
    expect(s.store.getConversation(conversation.id, ALICE.id)?.state).toBe('making')
  })

  it('a second press while it writes is 409 CONVERSATION_BUSY', async () => {
    const s = await setUp(never())
    const conversation = made(s)
    await s.app.inject({
      method: 'POST',
      url: `/api/conversations/${conversation.id}/plan`,
      headers: { cookie: AS_ALICE, origin: ORIGIN },
    })
    const again = await post(s, conversation.id, 'plan')
    expect(again.status).toBe(409)
    expect(again.body).toEqual({ error: { code: 'CONVERSATION_BUSY' } })
  })

  it('from a student app is 403, and nothing is asked', async () => {
    const s = await setUp()
    const conversation = made(s)
    const answer = await post(
      s,
      conversation.id,
      'plan',
      {},
      {
        origin: 'https://evil.staging.manifest.internal',
      },
    )
    expect(answer.status).toBe(403)
    expect(s.calls).toEqual([])
  })

  it('before the project is made, there is no plan to write: 409 CONVERSATION_STATE', async () => {
    const s = await setUp()
    s.store.rememberPerson(ALICE)
    const conversation = s.store.createConversation(ALICE.id, WORDS)
    s.tokens.put(conversation.id, TOKEN)
    expect((await post(s, conversation.id, 'plan')).status).toBe(409)
  })
})

describe('the plan corrected, and agreed', () => {
  async function ready(model: Model, options: Parameters<typeof fakes>[0] = {}) {
    const s = await setUp(model, options)
    const conversation = made(s)
    await post(s, conversation.id, 'plan')
    return { s, conversation }
  }

  it('a correction carries the plan so far and their sentence; version 2 comes back with the changed row marked', async () => {
    const model = scripted({ plan: [PLAN, CORRECTED] })
    const { s, conversation } = await ready(model)
    const answer = await post(s, conversation.id, 'plan/correction', {
      correction: 'My TA should see everything too.',
    })
    expect(answer.status).toBe(202)
    expect(answer.state).toMatchObject({
      conversation: { state: 'plan-ready' },
      plan: { version: 2, plan: { ...CORRECTED, changed: ['youSee'] } },
    })
    const user = model.calls[1]!.messages[1]!.content
    expect(user).toContain('My TA should see everything too.')
    expect(user).toContain(PLAN.studentsSee)
    expect(s.named('start')).toHaveLength(2)
    expect(s.named('end')).toHaveLength(2)
  })

  it('a correction whose step failed is carried on with its sentence, never lost', async () => {
    const bad = { ...PLAN, ai: '   ' }
    const model = scripted({ plan: [PLAN, bad, bad, CORRECTED] })
    const { s, conversation } = await ready(model)
    const failed = await post(s, conversation.id, 'plan/correction', {
      correction: 'My TA should see everything too.',
    })
    expect(failed.refusal).toMatchObject({ code: 'MODEL_ANSWER_INVALID' })
    const carried = await post(s, conversation.id, 'plan')
    expect(carried.state?.plan).toMatchObject({
      version: 2,
      plan: { changed: ['youSee'] },
    })
    expect(model.calls[2]!.messages[1]!.content).toContain(
      'My TA should see everything too.',
    )
  })

  it.each([
    ['no sentence', {}],
    ['an empty one', { correction: '  ' }],
    ['a long one', { correction: 'x'.repeat(501) }],
    ['an extra key', { correction: 'x', plan: {} }],
  ])('a correction with %s is 400 CORRECTION_INVALID', async (_, body) => {
    const { s, conversation } = await ready(scripted({ plan: [PLAN] }))
    const answer = await post(s, conversation.id, 'plan/correction', body)
    expect(answer.status).toBe(400)
    expect(answer.body).toEqual({ error: { code: 'CORRECTION_INVALID' } })
  })

  it('agreed: docs/plan.md, from the tree’s commit, with their answers; once; then agreed', async () => {
    const { s, conversation } = await ready(scripted({ plan: [PLAN] }))
    const answer = await post(s, conversation.id, 'plan/agree', {
      version: 1,
      answers: { late: 'It closes at the deadline.' },
    })
    expect(answer.status).toBe(202)
    expect(answer.frames.filter((f) => f.kind === 'step')).toEqual([
      { kind: 'step', step: 'agreeing', state: 'now' },
      { kind: 'step', step: 'agreeing', state: 'done' },
    ])
    expect(answer.state?.conversation.state).toBe('agreed')
    // Decision 11: agreed, and round 1 is started at once, with the conversation's token.
    expect(s.roundsStarted).toEqual([
      { conversationId: conversation.id, state: 'agreed', token: TOKEN },
    ])
    const commits = s.named('commitPlan')
    expect(commits).toHaveLength(1)
    const [token, projectId, base, markdown] = commits[0] as string[]
    expect([token, projectId, base]).toEqual([TOKEN, PROJECT.id, 'a'.repeat(40)])
    expect(markdown).toContain('# Reading responses: the plan we agreed')
    expect(markdown).toContain('  It closes at the deadline.')
    // What went to createCommit, as the conversation records it (Task 10, step 7).
    const agreed = s.store
      .listMessages(conversation.id)
      .map((m) => m.body as { kind: string })
      .find((body) => body.kind === 'agreed')
    expect(agreed).toMatchObject({
      version: 1,
      commitSha: 'c'.repeat(40),
      sent: [
        { dryRun: true, baseCommit: 'a'.repeat(40), paths: ['docs/plan.md'] },
        { dryRun: false, baseCommit: 'a'.repeat(40), paths: ['docs/plan.md'] },
      ],
    })
  })

  it('an answer to a question it never asked is 400 AGREE_INVALID, and nothing is committed', async () => {
    const { s, conversation } = await ready(scripted({ plan: [PLAN] }))
    const answer = await post(s, conversation.id, 'plan/agree', {
      version: 1,
      answers: { who: 'x' },
    })
    expect(answer.status).toBe(400)
    expect(answer.body).toEqual({ error: { code: 'AGREE_INVALID' } })
    expect(s.named('commitPlan')).toEqual([])
  })

  it('a window behind: agreeing to a plan that is no longer the latest is 409 PLAN_CHANGED, and nothing is committed (deferred Minor, Rich: fix it)', async () => {
    const { s, conversation } = await ready(scripted({ plan: [PLAN, CORRECTED] }))
    await post(s, conversation.id, 'plan/correction', { correction: 'The TA too.' })
    const answer = await post(s, conversation.id, 'plan/agree', {
      version: 1,
      answers: { late: 'Closed.' },
    })
    expect(answer.status).toBe(409)
    expect(answer.body).toEqual({ error: { code: 'PLAN_CHANGED' } })
    expect(s.named('commitPlan')).toEqual([])
    expect(s.store.getConversation(conversation.id, ALICE.id)?.state).toBe('plan-ready')
  })

  it('a window behind whose answers are to questions the correction no longer asks: still 409 PLAN_CHANGED, never AGREE_INVALID', async () => {
    const ASKS_ANOTHER = {
      ...CORRECTED,
      onlyYouKnow: [{ id: 'ta', ask: 'Should your TA see the names as well?' }],
    }
    const { s, conversation } = await ready(scripted({ plan: [PLAN, ASKS_ANOTHER] }))
    await post(s, conversation.id, 'plan/correction', { correction: 'The TA too.' })
    const answer = await post(s, conversation.id, 'plan/agree', {
      version: 1,
      answers: { late: 'Closed.' },
    })
    expect(answer.status).toBe(409)
    expect(answer.body).toEqual({ error: { code: 'PLAN_CHANGED' } })
  })

  it.each([
    ['no version', { answers: {} }],
    ['a version that is not a number', { version: '1', answers: {} }],
    ['an extra key', { version: 1, answers: {}, plan: {} }],
  ])('agreeing with %s is 400 AGREE_INVALID', async (_, body) => {
    const { s, conversation } = await ready(scripted({ plan: [PLAN] }))
    const answer = await post(s, conversation.id, 'plan/agree', body)
    expect(answer.status).toBe(400)
    expect(answer.body).toEqual({ error: { code: 'AGREE_INVALID' } })
    expect(s.named('commitPlan')).toEqual([])
  })

  it('a commit that is refused leaves the plan ready, the step halted, and says why with a reference', async () => {
    const { s, conversation } = await ready(scripted({ plan: [PLAN] }), {
      commit: () => Promise.reject(new PlatformRefusal('SOURCE_CONFLICT', 409)),
    })
    const answer = await post(s, conversation.id, 'plan/agree', {
      version: 1,
      answers: {},
    })
    expect(answer.refusal).toMatchObject({ code: 'SOURCE_CONFLICT' })
    expect(answer.frames).toContainEqual({
      kind: 'step',
      step: 'agreeing',
      state: 'halted',
    })
    expect(s.store.getConversation(conversation.id, ALICE.id)?.state).toBe('plan-ready')
  })

  it('the stream’s first frame carries the latest plan, so a reconnect rebuilds it', async () => {
    const { s, conversation } = await ready(scripted({ plan: [PLAN] }))
    await s.app.listen({ host: '127.0.0.1', port: 0 })
    const port = (s.app.server.address() as { port: number }).port
    const abort = new AbortController()
    const response = await fetch(
      `http://127.0.0.1:${port}/api/conversations/${conversation.id}/events`,
      { headers: { cookie: AS_ALICE }, signal: abort.signal },
    )
    const reader = response.body!.getReader()
    let text = ''
    while (!text.includes('\n\n'))
      text += new TextDecoder().decode((await reader.read()).value)
    abort.abort()
    const first = JSON.parse(text.slice(text.indexOf('data: ') + 6, text.indexOf('\n\n')))
    expect(first).toMatchObject({
      kind: 'state',
      conversation: { state: 'plan-ready' },
      plan: { version: 1, plan: { ...PLAN, changed: [] } },
    })
  })

  it('Decision 1: after writing, correcting and agreeing, no table holds the token or the key', async () => {
    const { s, conversation } = await ready(scripted({ plan: [PLAN, CORRECTED] }))
    await post(s, conversation.id, 'plan/correction', { correction: 'The TA too.' })
    await post(s, conversation.id, 'plan/agree', {
      version: 2,
      answers: { late: 'Closed.' },
    })
    expect(Object.values(dumpAll(s.file)).join('\n')).not.toMatch(/mft_|sk-/)
  })
})

describe('Review Focus 5: our server restarts while the plan is written', () => {
  it('the conversation is left planning, with no key; the page’s Carry on hands a token over again, and a new session writes the plan', async () => {
    const first = await setUp(never())
    const conversation = made(first)
    await first.app.inject({
      method: 'POST',
      url: `/api/conversations/${conversation.id}/plan`,
      headers: { cookie: AS_ALICE, origin: ORIGIN },
    })
    expect(first.named('start')).toHaveLength(1)
    await first.app.close()

    // The same database file, a new process: nothing in memory survives.
    const second = await setUp(scripted({ plan: [PLAN] }), {}, first.file)
    expect(second.store.getConversation(conversation.id, ALICE.id)?.state).toBe(
      'planning',
    )
    expect(second.hub.working(conversation.id)).toEqual([])
    const refused = await post(second, conversation.id, 'plan')
    expect(refused.body).toEqual({ error: { code: 'TOKEN_MISSING' } })

    const handed = await second.app.inject({
      method: 'POST',
      url: `/api/conversations/${conversation.id}/project`,
      headers: { cookie: AS_ALICE, origin: ORIGIN, 'content-type': 'application/json' },
      payload: JSON.stringify({ projectId: PROJECT.id, token: TOKEN }),
    })
    expect(handed.statusCode).toBe(204)
    const carried = await post(second, conversation.id, 'plan')
    expect(carried.state?.conversation.state).toBe('plan-ready')
    expect(second.named('start')).toHaveLength(1)
    expect(second.named('end')).toHaveLength(1)
  })
})

describe('what the plan is kept as', () => {
  it('a stored plan that no longer parses is no plan: agreeing to it is 409 PLAN_MISSING, never a crash', async () => {
    const s = await setUp()
    const conversation = made(s)
    s.store.savePlan(conversation.id, { nonsense: true })
    s.store.setState(conversation.id, 'plan-ready')
    const answer = await post(s, conversation.id, 'plan/agree', {
      version: 1,
      answers: {},
    })
    expect(answer.status).toBe(409)
    expect(answer.body).toEqual({ error: { code: 'PLAN_MISSING' } })
  })
})

describe('a change: "Here\'s what we\'d change", agreed, then committed (F4 Task 7)', () => {
  const ASKED = 'Also show a word count on each response.'
  const CHANGE = {
    ...PLAN,
    studentsSee: `${PLAN.studentsSee} Each response shows how many words it has.`,
    youSee: `${PLAN.youSee} Each response shows its word count.`,
    onlyYouKnow: [
      { id: 'count', ask: 'Should students see their count while they write?' },
    ],
    title: 'Word count',
  }
  const NARROWED = { ...CHANGE, studentsSee: PLAN.studentsSee }

  /** A change on the app, in `state`, its project and their words stored as Task 6 stores them. */
  function changing(s: Setup, state: 'planning' | 'plan-ready' | 'waiting' = 'planning') {
    s.store.rememberPerson(ALICE)
    const change = s.store.createChange(
      ALICE.id,
      PROJECT.id,
      'Also show a word count on each response',
      ASKED,
    )
    s.store.addMessage(change.id, 'we', { kind: 'project', project: PROJECT })
    s.store.addMessage(change.id, 'person', {
      kind: 'asked',
      change: 1,
      words: ASKED,
      fix: null,
    })
    s.tokens.put(change.id, TOKEN)
    return s.store.setState(change.id, state)
  }

  async function planned(
    model = scripted({ change: [CHANGE] }),
    options: Parameters<typeof fakes>[0] = {},
  ) {
    const s = await setUp(model, options)
    const change = changing(s)
    const answer = await post(s, change.id, 'plan')
    return { s, change, answer, model }
  }

  it('/plan writes the change on a session of its own, from docs/plan.md at the tree’s commit, and ends it: the changed parts marked, titled by the planner', async () => {
    const { s, change, answer, model } = await planned()
    expect(answer.status).toBe(202)
    expect(s.calls.map((c) => c[0])).toEqual([
      'budget',
      'start',
      'knowledgePack',
      'tree',
      'readPlan',
      'end',
    ])
    expect(s.named('start')).toEqual([
      [TOKEN, PROJECT.id, 'Also show a word count on each response'],
    ])
    expect(s.named('readPlan')).toEqual([[TOKEN, PROJECT.id, 'a'.repeat(40)]])
    expect(s.named('end')).toEqual([[TOKEN, 'session-1']])
    expect(s.keys).toEqual([KEY])
    expect(answer.state).toMatchObject({
      conversation: { id: change.id, state: 'plan-ready', title: 'Word count' },
      plan: {
        version: 1,
        plan: {
          studentsSee: CHANGE.studentsSee,
          youSee: CHANGE.youSee,
          onlyYouKnow: CHANGE.onlyYouKnow,
          changed: ['studentsSee', 'youSee'],
        },
      },
      piece: { kind: 'change', change: 1, asked: [ASKED] },
    })
    // The planner read the agreement's parts, what was asked, and the settled question with its answer.
    const user = model.calls[0]!.messages[1]!.content
    expect(model.calls[0]!.agent).toBe('change')
    expect(user).toContain(PLAN.itKeeps)
    expect(user).toContain(ASKED)
    expect(user).toContain(`- ${PLAN.onlyYouKnow[0]!.ask} It closes at the deadline.`)
  })

  it('reaching the front of the line with its token, it is planned at once, with no press', async () => {
    const s = await setUp(scripted({ change: [CHANGE] }))
    s.store.rememberPerson(ALICE)
    const frames: Progress[] = []
    const response = await s.app.inject({
      method: 'POST',
      url: `/api/apps/${PROJECT.id}/conversations`,
      headers: { cookie: AS_ALICE, origin: ORIGIN, 'content-type': 'application/json' },
      payload: JSON.stringify({ words: ASKED, token: TOKEN }),
    })
    expect(response.statusCode).toBe(201)
    const id = (response.json() as { id: string }).id
    s.hub.subscribe(id, (frame) => frames.push(frame))
    const deadline = Date.now() + 2000
    while (s.store.getConversation(id, ALICE.id)?.state !== 'plan-ready') {
      if (Date.now() > deadline) throw new Error(JSON.stringify(frames))
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    expect(s.store.getConversation(id, ALICE.id)?.title).toBe('Word count')
    expect(s.named('end')).toHaveLength(1)
  })

  it('/plan/correction rewrites it with the change so far and their sentence; the marks stay against the agreement', async () => {
    const model = scripted({ change: [CHANGE, NARROWED] })
    const { s, change } = await planned(model)
    const answer = await post(s, change.id, 'plan/correction', {
      correction: 'Only on my view.',
    })
    expect(answer.state).toMatchObject({
      conversation: { state: 'plan-ready' },
      plan: { version: 2, plan: { changed: ['youSee'] } },
    })
    const user = model.calls[1]!.messages[1]!.content
    expect(user).toContain('Only on my view.')
    expect(user).toContain(CHANGE.youSee)
    expect(user).toContain('titled "Word count"')
    expect(s.named('end')).toHaveLength(2)
  })

  it('a docs/plan.md edited by hand is given as it is written, and every part is marked', async () => {
    const { answer, model } = await planned(scripted({ change: [CHANGE] }), {
      planFile: () => Promise.resolve('# Our app\n\nWritten by hand.\n'),
    })
    expect(answer.state?.plan?.plan.changed).toEqual([
      'studentsSee',
      'youSee',
      'itKeeps',
      'whoGetsIn',
      'ai',
    ])
    expect(model.calls[0]!.messages[1]!.content).toContain('Written by hand.')
  })

  it('Yes commits docs/plan.md — the agreement as it now stands, the settled answers kept, the change’s added, and its Changes — before round n+1, which starts in the same run', async () => {
    const { s, change } = await planned()
    const answer = await post(s, change.id, 'plan/agree', {
      version: 1,
      answers: { count: 'Yes, as they type.' },
    })
    expect(answer.status).toBe(202)
    expect(answer.state?.conversation.state).toBe('agreed')
    // The commit, then the round: never the round first.
    const order = s.calls
      .map((c) => c[0])
      .filter((n) => ['commitPlan', 'roundStarted'].includes(n))
    expect(order).toEqual(['commitPlan', 'roundStarted'])
    expect(s.roundsStarted).toEqual([
      { conversationId: change.id, state: 'agreed', token: TOKEN },
    ])
    const [token, projectId, base, markdown, message] = s.named(
      'commitPlan',
    )[0] as string[]
    expect([token, projectId, base, message]).toEqual([
      TOKEN,
      PROJECT.id,
      'a'.repeat(40),
      'The change we agreed: Word count',
    ])
    const read = readPlanMarkdown(markdown!)
    expect(read).not.toBeNull()
    expect(read!.title).toBe(PROJECT.name)
    expect(read!.plan).toMatchObject({
      studentsSee: CHANGE.studentsSee,
      youSee: CHANGE.youSee,
      itKeeps: PLAN.itKeeps,
      onlyYouKnow: [
        { id: 'q1', ask: PLAN.onlyYouKnow[0]!.ask },
        { id: 'q2', ask: CHANGE.onlyYouKnow[0]!.ask },
      ],
    })
    expect(read!.answers).toEqual({
      q1: 'It closes at the deadline.',
      q2: 'Yes, as they type.',
    })
    expect(read!.changes).toEqual([
      { at: expect.stringMatching(/^\d{1,2} [A-Z][a-z]+ \d{4}$/), words: ASKED },
    ])
    expect(markdown).toContain('## Changes since we first agreed')
    const agreed = s.store
      .listMessages(change.id)
      .map((m) => m.body as { kind: string })
      .find((body) => body.kind === 'agreed')
    expect(agreed).toMatchObject({ version: 1, answers: { count: 'Yes, as they type.' } })
  })

  it('a second change keeps the first change in the Changes, and every settled answer', async () => {
    const earlier = planMarkdown(
      PROJECT.name,
      {
        ...CHANGE,
        onlyYouKnow: [PLAN.onlyYouKnow[0]!, CHANGE.onlyYouKnow[0]!],
        changed: [],
      },
      { late: 'It closes at the deadline.', count: 'Yes.' },
      [{ at: '28 September 2026', words: ASKED }],
    )
    const second = {
      ...CHANGE,
      youSee: `${CHANGE.youSee} Sorted by length.`,
      onlyYouKnow: [],
      title: 'Sort by length',
    }
    const { s, change } = await planned(scripted({ change: [second] }), {
      planFile: () => Promise.resolve(earlier),
    })
    await post(s, change.id, 'plan/agree', { version: 1, answers: {} })
    const read = readPlanMarkdown(s.named('commitPlan')[0]![3] as string)!
    expect(read.changes.map((c) => c.words)).toEqual([ASKED, ASKED])
    expect(read.answers).toEqual({ q1: 'It closes at the deadline.', q2: 'Yes.' })
    expect(read.plan.onlyYouKnow).toHaveLength(2)
  })

  it('agreeing to a plan the window no longer shows is 409 PLAN_CHANGED, and without the token 409 TOKEN_MISSING: nothing committed', async () => {
    const { s, change } = await planned()
    expect(
      (await post(s, change.id, 'plan/agree', { version: 2, answers: {} })).body,
    ).toEqual({
      error: { code: 'PLAN_CHANGED' },
    })
    s.tokens.drop(change.id)
    expect(
      (await post(s, change.id, 'plan/agree', { version: 1, answers: {} })).body,
    ).toEqual({
      error: { code: 'TOKEN_MISSING' },
    })
    expect(s.named('commitPlan')).toEqual([])
  })

  it('Not now: set aside, nothing committed, and the app freed: the next waiting change is planned by itself', async () => {
    const { s, change } = await planned(scripted({ change: [CHANGE, NARROWED] }))
    const next = changing(s, 'waiting')
    const answer = await s.app.inject({
      method: 'POST',
      url: `/api/conversations/${change.id}/stop`,
      headers: { cookie: AS_ALICE, origin: ORIGIN, 'content-type': 'application/json' },
      payload: '{}',
    })
    expect(answer.statusCode).toBe(202)
    expect(s.store.getConversation(change.id, ALICE.id)?.state).toBe('set-aside')
    expect(s.named('commitPlan')).toEqual([])
    const deadline = Date.now() + 2000
    while (s.store.getConversation(next.id, ALICE.id)?.state !== 'plan-ready') {
      if (Date.now() > deadline) throw new Error('the next change was never planned')
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
  })

  it('Not now while the planner writes: set aside at once; what it writes is dropped, and its session ended', async () => {
    let answer!: (value: unknown) => void
    const held: Model = {
      complete: (_agent, schema) =>
        new Promise(
          (resolve) => (answer = (value) => resolve(schema.parse(value))),
        ) as never,
    }
    const s = await setUp(held)
    const change = changing(s)
    await s.app.inject({
      method: 'POST',
      url: `/api/conversations/${change.id}/plan`,
      headers: { cookie: AS_ALICE, origin: ORIGIN },
    })
    const deadline = Date.now() + 2000
    while (answer === undefined) {
      if (Date.now() > deadline) throw new Error('the planner was never asked')
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    await s.app.inject({
      method: 'POST',
      url: `/api/conversations/${change.id}/stop`,
      headers: { cookie: AS_ALICE, origin: ORIGIN, 'content-type': 'application/json' },
      payload: '{}',
    })
    expect(s.store.getConversation(change.id, ALICE.id)?.state).toBe('set-aside')
    answer(CHANGE)
    while (s.named('end').length === 0) {
      if (Date.now() > deadline) throw new Error('the session was never ended')
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(s.store.getConversation(change.id, ALICE.id)?.state).toBe('set-aside')
    expect(s.store.latestPlan(change.id)).toBeUndefined()
  })

  it('a restart while it was planned: planning, with no work; /plan carries it on', async () => {
    const s = await setUp(scripted({ change: [CHANGE] }))
    const change = changing(s)
    expect(s.hub.busy(change.id)).toBe(false)
    const answer = await post(s, change.id, 'plan')
    expect(answer.state?.conversation.state).toBe('plan-ready')
  })

  it('Decision 1: after a change is planned and agreed, no table holds the token or the key', async () => {
    const { s, change } = await planned()
    await post(s, change.id, 'plan/agree', { version: 1, answers: {} })
    const dumped = JSON.stringify(dumpAll(s.file))
    expect(dumped).not.toContain(TOKEN)
    expect(dumped).not.toContain(KEY)
  })

  it("the first plan's agreement is F2's: its message is the platform's default, and no plan is read", async () => {
    const s = await setUp(scripted({ plan: [PLAN] }))
    const conversation = made(s)
    await post(s, conversation.id, 'plan')
    await post(s, conversation.id, 'plan/agree', { version: 1, answers: {} })
    expect(s.named('readPlan')).toEqual([])
    expect(s.named('commitPlan')[0]?.[4]).toBeUndefined()
  })
})
