import { join } from 'node:path'
import type { Schemas } from '@manifest/contract'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../app.js'
import type { Config } from '../config.js'
import type { Model } from '../model/client.js'
import { scripted } from '../model/scripted.js'
import { openStore, type Conversation, type Store } from '../store/db.js'
import { dumpAll, scratchDir } from '../store/testing.js'
import { createHub, type Hub } from './events.js'
import type { Progress } from './progress.js'
import { ALICE, AS_ALICE, AS_BOB, fakeControlPlane } from './testing.js'

/**
 * MOMENTS 3 AND 4, ON OUR SERVER: the three intake agents wired to a conversation. Each
 * route answers 202 and works in the background; what it did arrives on the stream (Decision
 * 4), so these tests read the hub. The intake model is scripted; Task 6 hands over the key.
 */
let platform: Awaited<ReturnType<typeof fakeControlPlane>>
beforeAll(async () => {
  platform = await fakeControlPlane()
})
afterAll(() => platform.close())

const ORIGIN = 'https://app.manifest.internal'
const WORDS =
  "A page where students post a response to the week's reading. They shouldn't see anyone else's until they've posted their own. I want to be able to skim them all the night before the seminar. About 200 students."
const Q1 = {
  id: 'q1',
  ask: 'Can a student change a response after posting it?',
  choices: ['Yes', 'No'],
}
const Q2 = { id: 'q2', ask: 'Should a TA see everything you see?', choices: null }
const Q3 = { id: 'q3', ask: 'Does each week open on a set date?', choices: null }
const understood = (questions: object[]) => ({
  questions,
  restatement: "A page where your students post a response to the week's reading.",
  audience: { scale: 'class', burst: 'synchronised', from: 'About 200 students' },
  cannot: [],
})
const NAMES = {
  names: [
    { name: 'Reading responses', slug: 'reading-responses' },
    { name: 'Weekly responses', slug: 'weekly-responses' },
    { name: 'Seminar reading log', slug: 'seminar-reading-log' },
  ],
}
const BLUEPRINTS: Schemas['BlueprintList'] = [
  {
    ref: 'node-ts-mongo@1',
    name: 'node-ts-mongo',
    majorVersion: 1,
    language: 'javascript',
    defaultPort: 3000,
    healthPath: '/healthz',
    schemaVersions: [1],
    provides: { services: ['mongodb'], authProviders: ['cwl', 'none'], ai: true },
    starters: [
      {
        name: 'proof-app',
        summary: 'A note-taking app with CWL sign-in and an AI answer.',
      },
    ],
  },
]

const cleanups: (() => Promise<unknown> | void)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

async function setUp(model: Model | undefined) {
  const { dir, remove } = scratchDir()
  const file = join(dir, 'app.sqlite')
  const store: Store = openStore(file)
  const hub: Hub = createHub()
  const config: Config = {
    mode: 'edge',
    port: 7105,
    origin: ORIGIN,
    platformOrigin: platform.origin,
  }
  const app: FastifyInstance = buildServer(config, () => undefined, {
    store,
    hub,
    ...(model === undefined ? {} : { intakeModel: () => model }),
  })
  cleanups.push(
    () => app.close(),
    () => store.close(),
    remove,
  )
  store.rememberPerson(ALICE)
  const conversation = store.createConversation(ALICE.id, WORDS)
  return { app, store, hub, file, conversation }
}

type Setup = Awaited<ReturnType<typeof setUp>>

/** POST a route, and wait for the stream's answer: the next state or refusal frame. */
async function post(
  { app, hub, conversation }: Setup,
  route: 'intake' | 'names' | 'blueprint',
  body: unknown,
  headers: Record<string, string> = {},
) {
  const frames: Progress[] = []
  let settled!: () => void
  const done = new Promise<void>((resolve) => (settled = resolve))
  const unsubscribe = hub.subscribe(conversation.id, (frame) => {
    frames.push(frame)
    if (frame.kind === 'state' || frame.kind === 'refusal') settled()
  })
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversation.id}/${route}`,
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
  const state = frames.filter((f) => f.kind === 'state').at(-1)
  return {
    status: response.statusCode,
    body: response.body === '' ? undefined : (response.json() as unknown),
    frames,
    state: state?.kind === 'state' ? state : undefined,
  }
}

describe('POST /api/conversations/:id/intake: round 1 (moment 3)', () => {
  it('reads their words and asks its questions: 202, the step, then the state, in questions', async () => {
    const model = scripted({ understanding: [understood([Q1, Q2])] })
    const s = await setUp(model)
    const answer = await post(s, 'intake', {})
    expect(answer.status).toBe(202)
    expect(answer.frames.slice(0, 2)).toEqual([
      { kind: 'step', step: 'understanding', state: 'now' },
      { kind: 'step', step: 'understanding', state: 'done' },
    ])
    expect(answer.state?.conversation.state).toBe('questions')
    expect(answer.state?.intake).toMatchObject({
      round: 1,
      understood: understood([Q1, Q2]),
      namesAsked: 0,
    })
    expect(model.calls[0]!.messages[1]!.content).toContain(WORDS)
  })

  it('asking nothing goes straight to naming', async () => {
    const s = await setUp(scripted({ understanding: [understood([])] }))
    expect((await post(s, 'intake', {})).state?.conversation.state).toBe('naming')
  })

  it('a model that answers badly twice: the step halted, a refusal with its reference, and nothing moved (Review Focus 2)', async () => {
    const bad = understood([{ id: 'q1', ask: 'No', choices: null }])
    const s = await setUp(scripted({ understanding: [bad, bad] }))
    const answer = await post(s, 'intake', {})
    expect(answer.status).toBe(202)
    const refusal = answer.frames.find((f) => f.kind === 'refusal')
    expect(answer.frames).toContainEqual({
      kind: 'step',
      step: 'understanding',
      state: 'halted',
    })
    expect(refusal).toEqual({
      kind: 'refusal',
      code: 'MODEL_ANSWER_INVALID',
      reference: expect.stringMatching(/^[0-9A-F]{4}-[0-9A-F]{4}$/),
    })
    expect(s.store.getConversation(s.conversation.id, ALICE.id)?.state).toBe('describing')
    expect(dumpAll(s.file)['problems']).toContain(
      (refusal as { reference: string }).reference,
    )
    expect(dumpAll(s.file)['problems']).toContain(s.conversation.id)
  })

  it('with no intake model (the platform gives none) is a refusal, MODEL_NOT_AVAILABLE', async () => {
    const s = await setUp(undefined)
    const answer = await post(s, 'intake', {})
    expect(answer.frames.at(-1)).toMatchObject({
      kind: 'refusal',
      code: 'MODEL_NOT_AVAILABLE',
    })
  })

  it('a second press while the first is working is 409 CONVERSATION_BUSY', async () => {
    let release!: () => void
    const slow: Model = {
      complete: async (_agent, schema) => {
        await new Promise<void>((resolve) => (release = resolve))
        return schema.parse(understood([]))
      },
    }
    const s = await setUp(slow)
    const first = s.app.inject({
      method: 'POST',
      url: `/api/conversations/${s.conversation.id}/intake`,
      headers: { cookie: AS_ALICE, origin: ORIGIN, 'content-type': 'application/json' },
      payload: '{}',
    })
    expect((await first).statusCode).toBe(202)
    const second = await post(s, 'intake', {})
    expect([second.status, second.body]).toEqual([
      409,
      { error: { code: 'CONVERSATION_BUSY' } },
    ])
    release()
  })
})

describe('two presses at once (Review Focus 4’s kin)', () => {
  // It holds "one winner" under concurrent presses. It CANNOT show the race that `mine` being
  // synchronous closes: measured, it passed against the async version too, because each
  // press's guard finishes its own platform call at its own moment. The code closes that
  // race by construction, and says so where it does.
  it('exactly one is 202, the other 409 CONVERSATION_BUSY, and the model is asked once', async () => {
    let asked = 0
    let release!: () => void
    const slow: Model = {
      complete: async (_agent, schema) => {
        asked++
        await new Promise<void>((resolve) => (release = resolve))
        return schema.parse(understood([]))
      },
    }
    const s = await setUp(slow)
    const press = () =>
      s.app.inject({
        method: 'POST',
        url: `/api/conversations/${s.conversation.id}/intake`,
        headers: { cookie: AS_ALICE, origin: ORIGIN, 'content-type': 'application/json' },
        payload: '{}',
      })
    const codes = (await Promise.all([press(), press(), press()])).map(
      (r) => r.statusCode,
    )
    expect(codes.sort()).toEqual([202, 409, 409])
    expect(asked).toBe(1)
    release()
  })
})

describe('the answers, and round 2', () => {
  async function asked(model: ReturnType<typeof scripted>) {
    const s = await setUp(model)
    await post(s, 'intake', {})
    return s
  }

  it('answers open round 2, which reads each question with its answer', async () => {
    const model = scripted({ understanding: [understood([Q1, Q2]), understood([Q3])] })
    const s = await asked(model)
    const answer = await post(s, 'intake', { answers: { q1: 'No', q2: '' } })
    expect(answer.status).toBe(202)
    expect(model.calls[1]!.messages[1]!.content).toContain(`${Q1.ask} No`)
    expect(answer.state?.conversation.state).toBe('questions')
    expect(answer.state?.intake).toMatchObject({
      round: 2,
      understood: understood([Q3]),
      answers: { [Q1.ask]: 'No' },
      skipped: [Q2.ask],
    })
  })

  it('round 2’s answers go to naming, and there is never a round 3', async () => {
    const model = scripted({ understanding: [understood([Q1]), understood([Q3])] })
    const s = await asked(model)
    await post(s, 'intake', { answers: { q1: 'No' } })
    const answer = await post(s, 'intake', { answers: { q3: 'Yes, every Monday' } })
    expect(answer.state?.conversation.state).toBe('naming')
    expect(model.calls).toHaveLength(2)
    expect(answer.state?.intake.answers).toEqual({
      [Q1.ask]: 'No',
      [Q3.ask]: 'Yes, every Monday',
    })
  })

  it('nothing answered in round 1 goes to naming, every question skipped, and asks nothing more', async () => {
    const model = scripted({ understanding: [understood([Q1, Q2])] })
    const s = await asked(model)
    const answer = await post(s, 'intake', { answers: {} })
    expect(answer.state?.conversation.state).toBe('naming')
    expect(answer.state?.intake.skipped).toEqual([Q1.ask, Q2.ask])
    expect(model.calls).toHaveLength(1)
  })

  it('"Skip these — use your best guess" goes to naming, every question skipped', async () => {
    const s = await asked(scripted({ understanding: [understood([Q1, Q2])] }))
    const answer = await post(s, 'intake', { skip: true })
    expect(answer.state?.conversation.state).toBe('naming')
    expect(answer.state?.intake.skipped).toEqual([Q1.ask, Q2.ask])
  })

  it('skipping before anything is read ("name it yourself") goes to naming, with no understanding', async () => {
    const model = scripted({})
    const s = await setUp(model)
    const answer = await post(s, 'intake', { skip: true })
    expect(answer.state?.conversation.state).toBe('naming')
    expect(answer.state?.intake.understood).toBeNull()
    expect(model.calls).toHaveLength(0)
  })

  it.each([
    ['an answer to a question not asked', { answers: { q9: 'Yes' } }],
    ['answers and a skip together', { answers: { q1: 'No' }, skip: true }],
    ['an answer that is not words', { answers: { q1: 7 } }],
    ['an answer over 500 characters', { answers: { q1: 'x'.repeat(501) } }],
    ['a key we do not know', { answers: { q1: 'No' }, round: 3 }],
  ])('%s is 400 INTAKE_INVALID', async (_, body) => {
    const s = await asked(scripted({ understanding: [understood([Q1])] }))
    const answer = await post(s, 'intake', body)
    expect([answer.status, answer.body]).toEqual([
      400,
      { error: { code: 'INTAKE_INVALID' } },
    ])
  })

  it('reading their words again once naming has begun is 409 CONVERSATION_STATE', async () => {
    const s = await setUp(scripted({ understanding: [understood([])] }))
    await post(s, 'intake', {})
    const again = await post(s, 'intake', {})
    expect([again.status, again.body]).toEqual([
      409,
      { error: { code: 'CONVERSATION_STATE' } },
    ])
  })
})

describe('POST /api/conversations/:id/names (moment 4)', () => {
  async function naming(model: ReturnType<typeof scripted>) {
    const s = await setUp(model)
    await post(s, 'intake', {})
    return s
  }

  it('suggests names from the restatement, naming the addresses the browser found taken (Review Focus 3)', async () => {
    const model = scripted({ understanding: [understood([])], naming: [NAMES] })
    const s = await naming(model)
    const answer = await post(s, 'names', { taken: ['mock-app'] })
    expect(answer.status).toBe(202)
    expect(answer.frames[0]).toEqual({ kind: 'step', step: 'naming', state: 'now' })
    expect(answer.state?.intake).toMatchObject({ names: NAMES.names, namesAsked: 1 })
    const user = model.calls[1]!.messages[1]!.content
    expect(user).toContain(understood([]).restatement)
    expect(user).toContain('mock-app')
  })

  it('from their own words when they skipped the understanding', async () => {
    const model = scripted({ naming: [NAMES] })
    const s = await setUp(model)
    await post(s, 'intake', { skip: true })
    await post(s, 'names', { taken: [] })
    expect(model.calls[0]!.messages[1]!.content).toContain(WORDS)
  })

  it('a second round is allowed, and a third is 409 NAMES_EXHAUSTED', async () => {
    const more = {
      names: [
        { name: 'Response board', slug: 'response-board' },
        { name: 'Reading circle', slug: 'reading-circle' },
        { name: 'Week by week', slug: 'week-by-week' },
      ],
    }
    const s = await naming(
      scripted({ understanding: [understood([])], naming: [NAMES, more] }),
    )
    expect((await post(s, 'names', { taken: [] })).state?.intake.namesAsked).toBe(1)
    expect(
      (await post(s, 'names', { taken: NAMES.names.map((n) => n.slug).slice(0, 2) }))
        .state?.intake.namesAsked,
    ).toBe(2)
    const third = await post(s, 'names', { taken: [] })
    expect([third.status, third.body]).toEqual([
      409,
      { error: { code: 'NAMES_EXHAUSTED' } },
    ])
  })

  it.each([
    ['taken that is not a list', { taken: 'mock-app' }],
    ['an address that is not one', { taken: ['Bad Name'] }],
    ['no taken', {}],
  ])('%s is 400 NAMES_INVALID', async (_, body) => {
    const s = await naming(scripted({ understanding: [understood([])] }))
    const answer = await post(s, 'names', body)
    expect([answer.status, answer.body]).toEqual([
      400,
      { error: { code: 'NAMES_INVALID' } },
    ])
  })

  it('before naming has begun is 409 CONVERSATION_STATE', async () => {
    const s = await setUp(scripted({}))
    expect((await post(s, 'names', { taken: [] })).status).toBe(409)
  })
})

describe('POST /api/conversations/:id/blueprint (moment 4, D3)', () => {
  it('chooses from the blueprints the browser read, and keeps the choice', async () => {
    const choice = {
      blueprint: 'node-ts-mongo@1',
      starter: null,
      why: 'Students write, and you read.',
    }
    const s = await setUp(
      scripted({ understanding: [understood([])], blueprint: [choice] }),
    )
    await post(s, 'intake', {})
    const answer = await post(s, 'blueprint', { blueprints: BLUEPRINTS })
    expect(answer.status).toBe(202)
    expect(answer.frames[0]).toEqual({ kind: 'step', step: 'blueprint', state: 'now' })
    expect(answer.state?.intake.blueprint).toEqual(choice)
  })

  it('a blueprint it was not given, twice, is a refusal: a model cannot invent one', async () => {
    const invented = { blueprint: 'python-flask@1', starter: null, why: 'x' }
    const s = await setUp(
      scripted({ understanding: [understood([])], blueprint: [invented, invented] }),
    )
    await post(s, 'intake', {})
    const answer = await post(s, 'blueprint', { blueprints: BLUEPRINTS })
    expect(answer.frames.at(-1)).toMatchObject({
      kind: 'refusal',
      code: 'MODEL_ANSWER_INVALID',
    })
  })

  it.each([
    ['no blueprints', { blueprints: [] }],
    ['a blueprint with no ref', { blueprints: [{ starters: [] }] }],
    ['not a list', { blueprints: 'node-ts-mongo@1' }],
  ])('%s is 400 BLUEPRINTS_INVALID', async (_, body) => {
    const s = await setUp(scripted({ understanding: [understood([])] }))
    await post(s, 'intake', {})
    const answer = await post(s, 'blueprint', body)
    expect([answer.status, answer.body]).toEqual([
      400,
      { error: { code: 'BLUEPRINTS_INVALID' } },
    ])
  })
})

describe('who, and from where', () => {
  it("another person's conversation is 404; a student app's post is 403; nothing runs", async () => {
    const model = scripted({})
    const s = await setUp(model)
    expect((await post(s, 'intake', {}, { cookie: AS_BOB })).status).toBe(404)
    expect(
      (await post(s, 'intake', {}, { origin: 'https://evil.staging.manifest.internal' }))
        .status,
    ).toBe(403)
    expect(model.calls).toHaveLength(0)
    const unchanged: Conversation | undefined = s.store.getConversation(
      s.conversation.id,
      ALICE.id,
    )
    expect(unchanged?.state).toBe('describing')
  })
})
