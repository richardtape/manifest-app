import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import { understand } from '../agents/understanding.js'
import { suggestNames } from '../agents/naming.js'
import { chooseBlueprint } from '../agents/blueprint.js'
import { writePlan } from '../agents/plan.js'
import { buildServer } from '../app.js'
import type { Config } from '../config.js'
import { ModelError, type Model } from '../model/client.js'
import { scripted } from '../model/scripted.js'
import { walkthroughModel } from '../model/walkthrough.js'
import { openStore } from '../store/db.js'
import { dumpAll, scratchDir } from '../store/testing.js'
import { createHub } from '../api/events.js'
import type { Progress } from '../api/progress.js'
import { ALICE, AS_ALICE, fakeControlPlane } from '../api/testing.js'
import { platformAgentSessions } from './agent-sessions.js'
import { platformAuthoring } from './authoring.js'
import {
  createIntakeKeys,
  gatedIntakeModel,
  intakeKeyFrom,
  intakeModelFor,
} from './intake.js'
import { platformProjects } from './project.js'
import { PlatformRefusal } from './refusal.js'

/**
 * F2 TASK 6: THE PLATFORM, AS IT LANDED (sitting 1's M1). Each adapter is proved against a
 * recording fake, never the mock, which answers the document's examples whatever is asked
 * (M2, FE-27): a test that asserts what was SENT cannot use it.
 */
interface Seen {
  method: string | undefined
  url: string | undefined
  headers: IncomingHttpHeaders
  body: unknown
}
type Reply = { status: number; body?: unknown }

const closers: (() => Promise<unknown> | void)[] = []
afterEach(async () => {
  for (const close of closers.splice(0).reverse()) await close()
})

async function fakePlatform(answer: (seen: Seen, count: number) => Reply) {
  const seen: Seen[] = []
  const server: Server = createServer((request, response) => {
    let text = ''
    request.on('data', (chunk) => (text += chunk))
    request.on('end', () => {
      const one = {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: text === '' ? undefined : JSON.parse(text),
      }
      seen.push(one)
      const reply = answer(one, seen.length)
      response.writeHead(reply.status, { 'content-type': 'application/json' })
      response.end(reply.body === undefined ? '' : JSON.stringify(reply.body))
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  closers.push(() => new Promise((resolve) => server.close(resolve)))
  return {
    origin: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    seen,
  }
}

const TOKEN = 'mft_test_x_the_conversations_token'
const PROJECT = '22222222-2222-4222-8222-222222222222'
const SESSION_ID = '860e32ca-5a3e-4698-8bd0-0510a63517f4'
const refusal = (status: number, code: string, message = 'refused') => ({
  status,
  body: { error: { code, message } },
})
const SESSION = {
  session: {
    id: SESSION_ID,
    projectId: PROJECT,
    name: 'First build',
    person: { id: ALICE.id, name: ALICE.displayName },
    via: {
      tokenId: '927eda69-f9bf-465f-8c16-5d6f4602a5c2',
      tokenName: 'Building — First build',
    },
    models: ['default-chat', 'default-embed'],
    capUsd: 2,
    expiresAt: '2026-09-28T05:00:00.000Z',
    state: 'active',
    endedAt: null,
    endReason: null,
    spentUsd: 0,
    spentUnavailable: null,
    createdAt: '2026-09-28T04:00:00.000Z',
  },
  key: 'sk-test-y-the-sessions-key',
  baseUrl: 'http://127.0.0.1:7106/v1',
}

async function failure(promise: Promise<unknown>): Promise<Error> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(Error)
  return error as Error
}

describe('platformAgentSessions (sitting 7, as it landed)', () => {
  it('budget reads the month, with the conversation’s token and nothing else', async () => {
    const fake = await fakePlatform(() => ({
      status: 200,
      body: {
        monthlyUsd: 10,
        spentUsd: 0.65,
        remainingUsd: 9.35,
        resetsAt: '2026-10-01T00:00:00.000Z',
        unavailable: null,
      },
    }))
    expect(await platformAgentSessions(fake.origin).budget(TOKEN)).toEqual({
      monthlyUsd: 10,
      remainingUsd: 9.35,
      resetsAt: '2026-10-01T00:00:00.000Z',
    })
    expect(fake.seen[0]).toMatchObject({ method: 'GET', url: '/v1/agent-budget' })
    expect(fake.seen[0]!.headers.authorization).toBe(`Bearer ${TOKEN}`)
    expect(fake.seen[0]!.headers.cookie).toBeUndefined()
  })

  it('start names the session, sends one Idempotency-Key per start, and answers the key once', async () => {
    const fake = await fakePlatform(() => ({ status: 201, body: SESSION }))
    const sessions = platformAgentSessions(fake.origin)
    expect(await sessions.start(TOKEN, PROJECT, 'First build')).toEqual({
      sessionId: SESSION_ID,
      key: SESSION.key,
      baseUrl: SESSION.baseUrl,
      models: ['default-chat', 'default-embed'],
      expiresAt: '2026-09-28T05:00:00.000Z',
      capUsd: 2,
    })
    await sessions.start(TOKEN, PROJECT, 'First build')
    const [one, two] = fake.seen as [Seen, Seen]
    expect([one.method, one.url, one.body]).toEqual([
      'POST',
      `/v1/projects/${PROJECT}/agent-sessions`,
      { name: 'First build' },
    ])
    expect(String(one.headers['idempotency-key'])).toMatch(/^.{8,}$/)
    expect(one.headers['idempotency-key']).not.toBe(two.headers['idempotency-key'])
  })

  it('a replay is AGENT_SESSION_ALREADY_STARTED, surfaced by its code, never retried, and the message never read (FE-29)', async () => {
    const fake = await fakePlatform(() =>
      refusal(
        409,
        'AGENT_SESSION_ALREADY_STARTED',
        `this request already started the agent session 'First build' (${SESSION_ID})`,
      ),
    )
    const error = await failure(
      platformAgentSessions(fake.origin).start(TOKEN, PROJECT, 'First build'),
    )
    expect(error).toBeInstanceOf(PlatformRefusal)
    expect([(error as PlatformRefusal).code, (error as PlatformRefusal).status]).toEqual([
      'AGENT_SESSION_ALREADY_STARTED',
      409,
    ])
    expect(`${error.message} ${JSON.stringify(error)}`).not.toContain(SESSION_ID)
    expect(fake.seen).toHaveLength(1)
  })

  it.each([
    ['AI_CATALOGUE_DISABLED', 503, 'MODEL_NOT_AVAILABLE'],
    ['AGENT_NO_MODEL_FOR_CLASSIFICATION', 409, 'MODEL_NOT_AVAILABLE'],
    ['AI_BACKEND_UNAVAILABLE', 503, 'MODEL_UNREACHABLE'],
    ['AGENT_BUDGET_EXHAUSTED', 409, 'MODEL_BUDGET_EXHAUSTED'],
  ])('start refused %s (%i) is the model’s %s', async (code, status, ours) => {
    const fake = await fakePlatform(() => refusal(status, code))
    const error = await failure(
      platformAgentSessions(fake.origin).start(TOKEN, PROJECT, 'First build'),
    )
    expect(error).toBeInstanceOf(ModelError)
    expect((error as ModelError).code).toBe(ours)
  })

  it('end sends an Idempotency-Key, with the token', async () => {
    const fake = await fakePlatform(() => ({
      status: 200,
      body: { ...SESSION.session, state: 'ended' },
    }))
    await platformAgentSessions(fake.origin).end(TOKEN, SESSION_ID)
    expect([fake.seen[0]!.method, fake.seen[0]!.url]).toEqual([
      'DELETE',
      `/v1/agent-sessions/${SESSION_ID}`,
    ])
    expect(String(fake.seen[0]!.headers['idempotency-key'])).toMatch(/^.{8,}$/)
  })

  it('a platform that does not answer is PLATFORM_UNAVAILABLE, and no error ever carries the token', async () => {
    const errors = [
      await failure(platformAgentSessions('http://127.0.0.1:1').budget(TOKEN)),
      await failure(
        platformAgentSessions(
          (await fakePlatform(() => refusal(403, 'FORBIDDEN', `no, ${TOKEN}`))).origin,
        ).end(TOKEN, SESSION_ID),
      ),
    ]
    expect((errors[0] as PlatformRefusal).code).toBe('PLATFORM_UNAVAILABLE')
    expect((errors[1] as PlatformRefusal).code).toBe('FORBIDDEN')
    for (const error of errors)
      expect(`${error.message} ${error.stack} ${JSON.stringify(error)}`).not.toContain(
        'mft_',
      )
  })
})

describe('platformProjects.knowledgePack: how apps like this are built (moment 5)', () => {
  const file = (path: string, content: string) => ({
    path,
    mediaType: 'text/markdown',
    sha256: '0'.repeat(64),
    content,
  })

  it('reads the blueprint’s pack with the conversation’s token, and answers it as text, each file under its path', async () => {
    const fake = await fakePlatform(() => ({
      status: 200,
      body: {
        blueprint: 'node-ts-mongo@1',
        files: [
          file('AGENTS.md', 'Read me first.'),
          file('manifest.md', 'Pages and a database.'),
        ],
      },
    }))
    const text = await platformProjects(fake.origin).knowledgePack(
      TOKEN,
      'node-ts-mongo@1',
    )
    expect(text).toBe(
      '## AGENTS.md\n\nRead me first.\n\n## manifest.md\n\nPages and a database.',
    )
    expect(fake.seen[0]!.url).toBe('/v1/blueprints/node-ts-mongo%401/knowledge-pack')
    expect(fake.seen[0]!.headers.authorization).toBe(`Bearer ${TOKEN}`)
    expect(fake.seen[0]!.headers.cookie).toBeUndefined()
  })

  it('a pack longer than a small model can read is cut, and says so', async () => {
    const fake = await fakePlatform(() => ({
      status: 200,
      body: { blueprint: 'b@1', files: [file('AGENTS.md', 'x'.repeat(50_000))] },
    }))
    const text = await platformProjects(fake.origin).knowledgePack(TOKEN, 'b@1')
    expect(text.length).toBeLessThanOrEqual(24_000)
    expect(text.endsWith('(The rest is left out.)')).toBe(true)
  })

  it('a refusal is its code, never its message', async () => {
    const fake = await fakePlatform(() => refusal(404, 'NOT_FOUND', 'no pack at /srv/x'))
    const error = await failure(platformProjects(fake.origin).knowledgePack(TOKEN, 'b@1'))
    expect(error).toBeInstanceOf(PlatformRefusal)
    expect((error as PlatformRefusal).code).toBe('NOT_FOUND')
    expect(error.message).not.toContain('/srv/x')
  })
})

describe('platformAuthoring: the plan’s first commit (Decision 9)', () => {
  const TREE = (sha: string) => ({
    status: 200,
    body: {
      ref: 'main',
      commitSha: sha,
      entries: [
        { path: 'manifest.yaml', type: 'file', mode: '100644', size: 102, binary: false },
        { path: 'src', type: 'dir', mode: '040000', size: null, binary: false },
      ],
    },
  })
  const COMMITTED = (dryRun: boolean) => ({
    status: 201,
    body: {
      dryRun,
      commitSha: dryRun ? null : 'c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00',
      parent: 'a'.repeat(40),
      changes: [],
      spec: null,
    },
  })
  const commits = (seen: Seen[]) => seen.filter((s) => s.url?.endsWith('/commits'))
  /** What the platform received, call by call, read from the fake: never from the adapter. */
  const received = (seen: Seen[]) =>
    commits(seen).map((s) => {
      const body = s.body as {
        baseCommit: string
        dryRun?: boolean
        changes: { path: string }[]
      }
      return {
        dryRun: body.dryRun === true,
        baseCommit: body.baseCommit,
        paths: body.changes.map((c) => c.path),
      }
    })

  it('tree answers the commit and its paths', async () => {
    const fake = await fakePlatform(() => TREE('a'.repeat(40)))
    expect(await platformAuthoring(fake.origin).tree(TOKEN, PROJECT)).toEqual({
      commitSha: 'a'.repeat(40),
      paths: ['manifest.yaml', 'src'],
    })
  })

  it('dry-runs, then commits, from baseCommit, with exactly one change: docs/plan.md', async () => {
    const fake = await fakePlatform((seen) =>
      COMMITTED((seen.body as { dryRun?: boolean }).dryRun === true),
    )
    const answer = await platformAuthoring(fake.origin).commitPlan(
      TOKEN,
      PROJECT,
      'a'.repeat(40),
      '# Reading responses\n',
    )
    expect(answer.commitSha).toBe('c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00')
    const [dry, real] = commits(fake.seen) as [Seen, Seen]
    const change = [
      { op: 'write', path: 'docs/plan.md', content: '# Reading responses\n' },
    ]
    expect(dry.body).toMatchObject({
      baseCommit: 'a'.repeat(40),
      changes: change,
      dryRun: true,
    })
    expect(real.body).toMatchObject({ baseCommit: 'a'.repeat(40), changes: change })
    expect((real.body as { dryRun?: boolean }).dryRun).not.toBe(true)
    expect(dry.headers['idempotency-key']).not.toBe(real.headers['idempotency-key'])
  })

  it('on 409 SOURCE_CONFLICT it reads the tree again and tries once more, from the new commit', async () => {
    const fake = await fakePlatform((seen, count) => {
      if (seen.url?.endsWith('/tree')) return TREE('b'.repeat(40))
      if (count === 1) return refusal(409, 'SOURCE_CONFLICT')
      return COMMITTED((seen.body as { dryRun?: boolean }).dryRun === true)
    })
    await platformAuthoring(fake.origin).commitPlan(
      TOKEN,
      PROJECT,
      'a'.repeat(40),
      '# plan\n',
    )
    const bases = commits(fake.seen).map(
      (s) => (s.body as { baseCommit: string }).baseCommit,
    )
    expect(bases).toEqual(['a'.repeat(40), 'b'.repeat(40), 'b'.repeat(40)])
  })

  it('answers what it sent, call by call, exactly as the platform received it (Task 10, step 7)', async () => {
    const fake = await fakePlatform((seen, count) => {
      if (seen.url?.endsWith('/tree')) return TREE('b'.repeat(40))
      if (count === 1) return refusal(409, 'SOURCE_CONFLICT')
      return COMMITTED((seen.body as { dryRun?: boolean }).dryRun === true)
    })
    const answer = await platformAuthoring(fake.origin).commitPlan(
      TOKEN,
      PROJECT,
      'a'.repeat(40),
      '# plan\n',
    )
    expect(answer.sent).toEqual(received(fake.seen))
    expect(answer.sent.map((s) => s.dryRun)).toEqual([true, true, false])
  })

  it('a second conflict is SOURCE_CONFLICT, thrown', async () => {
    const fake = await fakePlatform((seen) =>
      seen.url?.endsWith('/tree')
        ? TREE('b'.repeat(40))
        : refusal(409, 'SOURCE_CONFLICT'),
    )
    const error = await failure(
      platformAuthoring(fake.origin).commitPlan(
        TOKEN,
        PROJECT,
        'a'.repeat(40),
        '# plan\n',
      ),
    )
    expect((error as PlatformRefusal).code).toBe('SOURCE_CONFLICT')
    expect(commits(fake.seen)).toHaveLength(2)
  })
})

describe('the intake key (FE-1, as it landed)', () => {
  const config: Config = {
    mode: 'edge',
    port: 7105,
    origin: 'https://app.manifest.internal',
    platformOrigin: 'http://127.0.0.1:7100',
    modelGateway: 'http://127.0.0.1:7106/v1',
    planModel: 'default-chat',
  }
  const later = new Date(Date.now() + 30 * 60_000).toISOString()
  const HANDED = {
    key: 'sk-test-y',
    baseUrl: 'http://127.0.0.1:7106/v1',
    model: 'default-chat',
    expiresAt: later,
  }

  it('a key as the platform answered it is kept', () => {
    expect(intakeKeyFrom(HANDED, config)).toEqual(HANDED)
    expect(
      intakeKeyFrom({ ...HANDED, baseUrl: 'http://127.0.0.1:7106/v1/' }, config),
    ).toMatchObject({ key: 'sk-test-y' })
  })

  it.each([
    ['no key', { ...HANDED, key: '' }],
    ['a key that is not words', { ...HANDED, key: 7 }],
    ['no model', { ...HANDED, model: undefined }],
    ['a time that is not one', { ...HANDED, expiresAt: 'soon' }],
    [
      'a key already past its time',
      { ...HANDED, expiresAt: new Date(Date.now() - 1000).toISOString() },
    ],
    ['a field we do not know', { ...HANDED, session: { id: 'x' } }],
    ['not an object', 'sk-test-y'],
  ])('%s is INTAKE_KEY_INVALID', (_, handed) => {
    expect(intakeKeyFrom(handed, config)).toEqual({ refused: 'INTAKE_KEY_INVALID' })
  })

  it('in mock mode, a key past its time is kept: the mock answers a fixed example time, long past (FE-27)', () => {
    const mock: Config = { ...config, mode: 'mock' }
    const past = { ...HANDED, expiresAt: '2026-09-28T02:10:00.000Z' }
    expect(intakeKeyFrom(past, mock)).toEqual(past)
    expect(intakeKeyFrom(past, config)).toEqual({ refused: 'INTAKE_KEY_INVALID' })
  })

  it('a baseUrl other than our gateway is MODEL_GATEWAY_REFUSED: our server never calls a URL a browser chose', () => {
    expect(
      intakeKeyFrom({ ...HANDED, baseUrl: 'https://evil.example/v1' }, config),
    ).toEqual({ refused: 'MODEL_GATEWAY_REFUSED' })
  })

  it('the gated model: no key is INTAKE_KEY_MISSING; a key past its time is INTAKE_KEY_EXPIRED, and dropped', async () => {
    const keys = createIntakeKeys()
    const made: string[] = []
    const model = gatedIntakeModel(keys, (key) => {
      made.push(key.key)
      return scripted({ a: [{ ok: true }] })
    })
    const schema = z.object({ ok: z.boolean() })
    const conversation = { id: 'c-1' }
    expect(
      (
        (await failure(
          model(conversation as never).complete('a', schema, []),
        )) as ModelError
      ).code,
    ).toBe('INTAKE_KEY_MISSING')

    keys.put('c-1', { ...HANDED, expiresAt: new Date(Date.now() - 1).toISOString() })
    expect(
      (
        (await failure(
          model(conversation as never).complete('a', schema, []),
        )) as ModelError
      ).code,
    ).toBe('INTAKE_KEY_EXPIRED')
    expect(
      (
        (await failure(
          model(conversation as never).complete('a', schema, []),
        )) as ModelError
      ).code,
    ).toBe('INTAKE_KEY_MISSING')

    keys.put('c-1', HANDED)
    expect(await model(conversation as never).complete('a', schema, [])).toEqual({
      ok: true,
    })
    expect(made).toEqual(['sk-test-y'])
  })
})

describe('each mode’s intake model', () => {
  const schema = z.object({ ok: z.boolean() })
  const later = new Date(Date.now() + 60_000).toISOString()

  it('through the edge: the gateway our Config names, with the handed key and the platform’s one model', async () => {
    const gateway = await fakePlatform(() => ({
      status: 200,
      body: { choices: [{ message: { content: '{"ok":true}' } }] },
    }))
    const config: Config = {
      mode: 'edge',
      port: 7105,
      origin: 'https://app.manifest.internal',
      platformOrigin: 'http://127.0.0.1:7100',
      modelGateway: `${gateway.origin}/v1`,
      planModel: 'default-chat',
    }
    const keys = createIntakeKeys()
    keys.put('c-1', {
      key: 'sk-test-y',
      baseUrl: `${gateway.origin}/v1`,
      model: 'default-chat',
      expiresAt: later,
    })
    expect(
      await intakeModelFor(config, keys)({ id: 'c-1' }).complete('a', schema, []),
    ).toEqual({ ok: true })
    expect(gateway.seen[0]).toMatchObject({
      url: '/v1/chat/completions',
      body: { model: 'default-chat' },
    })
    expect(gateway.seen[0]!.headers.authorization).toBe('Bearer sk-test-y')
  })

  it('against the mock: the walk-through’s answers, and still only with a key handed over', async () => {
    const config: Config = {
      mode: 'mock',
      port: 7105,
      origin: 'http://127.0.0.1:7105',
      platformOrigin: 'http://127.0.0.1:7102',
      modelGateway: 'http://127.0.0.1:7106/v1',
      planModel: 'default-chat',
    }
    const keys = createIntakeKeys()
    const model = intakeModelFor(config, keys)({ id: 'c-1' })
    const words = 'About 200 students post a response.'
    expect(((await failure(understand(model, words, {}, 1))) as ModelError).code).toBe(
      'INTAKE_KEY_MISSING',
    )
    keys.put('c-1', {
      key: 'sk-example-not-a-real-key',
      baseUrl: 'http://127.0.0.1:7106/v1',
      model: 'default-chat',
      expiresAt: later,
    })
    expect((await understand(model, words, {}, 1)).questions).toHaveLength(3)
    // The mock's own answer: a fixed example time, long past. Held to it, mock mode never works.
    keys.put('c-1', {
      key: 'sk-example-not-a-real-key',
      baseUrl: 'http://127.0.0.1:7106/v1',
      model: 'default-chat',
      expiresAt: '2026-09-28T02:10:00.000Z',
    })
    expect((await understand(model, words, {}, 1)).questions).toHaveLength(3)
  })
})

describe('POST /api/conversations/:id/intake-key: the handover', () => {
  const ORIGIN = 'https://app.manifest.internal'
  const later = new Date(Date.now() + 30 * 60_000).toISOString()
  const HANDED = {
    key: 'sk-test-y',
    baseUrl: 'http://127.0.0.1:7106/v1',
    model: 'default-chat',
    expiresAt: later,
  }

  async function setUp() {
    const platform = await fakeControlPlane()
    closers.push(() => platform.close())
    const { dir, remove } = scratchDir()
    const file = join(dir, 'app.sqlite')
    const store = openStore(file)
    const hub = createHub()
    const keys = createIntakeKeys()
    const handed: string[] = []
    const config: Config = {
      mode: 'edge',
      port: 7105,
      origin: ORIGIN,
      platformOrigin: platform.origin,
      modelGateway: 'http://127.0.0.1:7106/v1',
      planModel: 'default-chat',
    }
    const understood = {
      questions: [],
      restatement: 'A page where your students post.',
      audience: { scale: 'class', burst: 'steady', from: 'students' },
      cannot: [],
    }
    const app = buildServer(config, () => undefined, {
      store,
      hub,
      intakeKeys: keys,
      intakeModel: gatedIntakeModel(keys, (key) => {
        handed.push(key.key)
        return scripted({ understanding: [understood] })
      }),
    })
    closers.push(
      () => app.close(),
      () => store.close(),
      remove,
    )
    store.rememberPerson(ALICE)
    const conversation = store.createConversation(ALICE.id, 'A page where students post.')
    const post = (route: string, body: unknown, origin = ORIGIN) =>
      app.inject({
        method: 'POST',
        url: `/api/conversations/${conversation.id}/${route}`,
        headers: { cookie: AS_ALICE, origin, 'content-type': 'application/json' },
        payload: JSON.stringify(body),
      })
    return { app, store, hub, file, conversation, post, handed }
  }

  it('is 204, and the intake then runs on that key; no table holds it (Decision 1)', async () => {
    const s = await setUp()
    expect((await s.post('intake-key', HANDED)).statusCode).toBe(204)
    const frames: Progress[] = []
    const done = new Promise<void>((resolve) =>
      s.hub.subscribe(s.conversation.id, (frame) => {
        frames.push(frame)
        if (frame.kind === 'state' || frame.kind === 'refusal') resolve()
      }),
    )
    expect((await s.post('intake', {})).statusCode).toBe(202)
    await done
    expect(frames.at(-1)).toMatchObject({
      kind: 'state',
      conversation: { state: 'naming' },
    })
    expect(s.handed).toEqual(['sk-test-y'])
    expect(Object.values(dumpAll(s.file)).join('\n')).not.toMatch(/sk-/)
  })

  it('without a key handed over, the intake is a refusal: INTAKE_KEY_MISSING (after a restart, Review Focus 5)', async () => {
    const s = await setUp()
    const refused = new Promise<Progress>((resolve) =>
      s.hub.subscribe(
        s.conversation.id,
        (frame) => frame.kind === 'refusal' && resolve(frame),
      ),
    )
    await s.post('intake', {})
    expect(await refused).toMatchObject({ kind: 'refusal', code: 'INTAKE_KEY_MISSING' })
  })

  it.each([
    [
      'a key of the wrong shape is 400 INTAKE_KEY_INVALID',
      { ...HANDED, key: '' },
      400,
      'INTAKE_KEY_INVALID',
    ],
    [
      'another gateway is 400 MODEL_GATEWAY_REFUSED',
      { ...HANDED, baseUrl: 'https://evil.example/v1' },
      400,
      'MODEL_GATEWAY_REFUSED',
    ],
  ])('%s', async (_, body, status, code) => {
    const s = await setUp()
    const response = await s.post('intake-key', body)
    expect([response.statusCode, response.json()]).toEqual([status, { error: { code } }])
  })

  it('from a student app is 403, and nothing is kept', async () => {
    const s = await setUp()
    expect(
      (await s.post('intake-key', HANDED, 'https://evil.staging.manifest.internal'))
        .statusCode,
    ).toBe(403)
    const refused = new Promise<Progress>((resolve) =>
      s.hub.subscribe(
        s.conversation.id,
        (frame) => frame.kind === 'refusal' && resolve(frame),
      ),
    )
    await s.post('intake', {})
    expect(await refused).toMatchObject({ code: 'INTAKE_KEY_MISSING' })
  })
})

describe('the walk-through model (mock mode: Decision 7)', () => {
  const WORDS =
    "A page where students post a response to the week's reading. They shouldn't see anyone else's until they've posted their own. I want to be able to skim them all the night before the seminar. About 200 students."
  const model: Model = walkthroughModel()

  it('round 1 asks the walk-through’s three questions, guessed from "About 200 students"; round 2 asks none', async () => {
    const first = await understand(model, WORDS, {}, 1)
    expect(first.questions.map((q) => q.ask)).toEqual([
      'Can a student change a response after posting it?',
      'Should a TA see everything you see?',
      'Does each week open on a set date, or all at once?',
    ])
    expect(first.audience).toEqual({
      scale: 'class',
      burst: 'synchronised',
      from: 'About 200 students',
    })
    expect(
      (await understand(model, WORDS, { [first.questions[0]!.ask]: 'No' }, 2)).questions,
    ).toEqual([])
  })

  it('passes the checks for words that are not the walk-through’s too', async () => {
    const other = 'A sign-up sheet for office hours.'
    expect((await understand(model, other, {}, 1)).audience.from.length).toBeGreaterThan(
      0,
    )
  })

  it('names the walk-through’s three, and three others when those are taken', async () => {
    expect((await suggestNames(model, 'x', [])).names.map((n) => n.slug)).toEqual([
      'reading-responses',
      'weekly-responses',
      'seminar-reading-log',
    ])
    const again = await suggestNames(model, 'x', [
      'reading-responses',
      'weekly-responses',
      'seminar-reading-log',
    ])
    expect(again.names.map((n) => n.slug)).toEqual([
      'response-board',
      'reading-circle',
      'week-by-week',
    ])
  })

  it('writes the walk-through’s plan; a correction changes one row, and only that row is marked (Task 9)', async () => {
    const input = {
      description: WORDS,
      restatement: 'A page where your students post.',
      answers: {},
      skipped: [],
      knowledgePack: '# guide',
      tree: ['package.json'],
    }
    const first = await writePlan(model, input)
    expect(first.whoGetsIn).toMatch(/^Anyone with a CWL can sign in\./)
    expect(first.onlyYouKnow.map((q) => q.ask)).toEqual([
      'Is a late post still a post, or does it close at the deadline?',
      'Should a TA see everything you see?',
    ])
    expect(first.changed).toEqual([])
    const corrected = await writePlan(model, {
      ...input,
      previous: first,
      correction: 'My TA should see everything too.',
    })
    expect(corrected.changed).toEqual(['youSee'])
  })

  it('chooses the first blueprint it is given, with no starter', async () => {
    const blueprints = [
      {
        ref: 'node-ts-mongo@1',
        name: 'n',
        majorVersion: 1,
        language: 'javascript',
        defaultPort: 3000,
        healthPath: '/healthz',
        schemaVersions: [1],
        provides: { services: [], authProviders: ['cwl' as const], ai: false },
        starters: [],
      },
    ]
    expect(await chooseBlueprint(model, 'x', blueprints)).toMatchObject({
      blueprint: 'node-ts-mongo@1',
      starter: null,
    })
  })
})
