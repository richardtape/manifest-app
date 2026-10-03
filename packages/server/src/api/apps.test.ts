import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../app.js'
import type { Rounds } from '../build/round.js'
import type { Config } from '../config.js'
import { createConversationTokens } from '../platform/project.js'
import { openStore, type Conversation, type Run, type Store } from '../store/db.js'
import { dumpAll, scratchDir } from '../store/testing.js'
import { DRY_RUN_FIX_WORDS, FIX_WORDS, OUTAGE_FIX_WORDS } from './apps.js'
import { createHub, publishState, type Hub } from './events.js'
import { pieceOf } from './piece-state.js'
import { LIMITS, type AppConversation, type Progress } from './progress.js'
import {
  ALICE,
  AS_ALICE,
  AS_BOB,
  AS_CAROL,
  BOB,
  fakeControlPlane,
  type Seen,
} from './testing.js'

/**
 * F4 TASK 6: CONVERSATIONS ON AN APP, AND THE LINE (Decision 5, Review Focus 1). *Ask for a
 * change* posts their words with a token the browser has just minted, in one request; our
 * server checks the token sees the project before it trusts it, keeps it in memory only, and
 * the line says whether the change starts now or waits.
 */
const ORIGIN = 'https://app.manifest.internal'
const STUDENT_APP = 'https://reading-responses.staging.manifest.internal'
const PROJECT = '22222222-2222-4222-8222-222222222222'
const ANOTHER = '99999999-9999-4999-8999-999999999999'
const INCIDENT = '44444444-4444-4444-8444-444444444444'
const REHEARSAL = '55555555-5555-4555-8555-555555555555'
/** A dry run that signed nobody in, as the page reads it off `runRehearsal`'s answer (M4's shape). */
const EVIDENCE = {
  rehearsalId: REHEARSAL,
  signInStatus: null,
  attributesReleased: ['mail'],
  attributesAsked: ['ubcEduCwlPuid', 'mail'],
}
/** F6 Decision 9: the outage's two moments, from the fall to the first answer. */
const OUTAGE = { from: '2026-10-01T17:03:00.000Z', to: '2026-10-01T17:07:00.000Z' }
const GOOD = 'mft_test_x_the_changes_token'
const SECOND = 'mft_test_x_the_second_changes_token'
const STRANGER = 'mft_test_x_another_projects_token'
const LIAR = 'mft_test_x_answers_another_project'
const DOWN = 'mft_test_x_the_platform_is_down'
/** The platform's own failure, with its request id (FE-30). */
const FAILED = 'mft_test_x_the_platform_failed'
const REQUEST_ID = '1f758a00-2575-409b-bf48-dfbc4218b118'
const WORDS = 'Also show a word count on each response.'

const project = (id: string) => ({
  id,
  slug: 'reading-responses',
  name: 'Reading responses',
  blueprint: 'node-ts-mongo@1',
  starter: null,
})

let platform: Awaited<ReturnType<typeof fakeControlPlane>>
beforeAll(async () => {
  platform = await fakeControlPlane((seen: Seen) => {
    const bearer = /^Bearer (.+)$/.exec(seen.headers.authorization ?? '')?.[1]
    if (seen.url === `/v1/projects/${PROJECT}`) {
      if (bearer === GOOD || bearer === SECOND)
        return { status: 200, body: project(PROJECT) }
      if (bearer === LIAR) return { status: 200, body: project(ANOTHER) }
      if (bearer === DOWN) return { status: 502, body: undefined }
      if (bearer === FAILED)
        return {
          status: 500,
          body: { error: { code: 'INTERNAL', message: 'm', requestId: REQUEST_ID } },
        }
      return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'no' } } }
    }
    return undefined
  })
})
afterAll(() => platform.close())

const cleanups: (() => Promise<unknown> | void)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

const runOf = (conversationId: string, status: Run['status'], round = 1): Run => ({
  id: `run-${conversationId}-${round}`,
  conversationId,
  round,
  step: 'pages',
  moves: 0,
  tries: {},
  status,
  sessionIds: [],
  model: null,
  last: null,
  sameRefusal: null,
  detail: null,
})

/** Rounds that record what they were asked, and move the conversation as a round would. */
function recordingRounds(store: Store, hub: Hub, did: string[]): Rounds {
  const working = (conversation: Conversation, what: string, status: Run['status']) => {
    did.push(`${what} ${conversation.title}`)
    const round =
      (store.latestRun(conversation.id)?.round ?? 0) + (what === 'start' ? 1 : 0)
    store.saveRun(runOf(conversation.id, status, Math.max(round, 1)))
    publishState(hub, store, store.setState(conversation.id, 'building'))
  }
  return {
    start: (conversation) => working(conversation, 'start', 'working'),
    carryOn: (conversation) => working(conversation, 'carryOn', 'working'),
    withoutToken: (conversation) => working(conversation, 'withoutToken', 'interrupted'),
    message: (conversation, words) =>
      void did.push(`message ${conversation.title} ${words}`),
    answer: () => 'taken',
    stop: (conversation) => void did.push(`stop ${conversation.title}`),
    interruptedOnBoot: () => undefined,
  }
}

function setUp(file?: string) {
  let where = file
  if (where === undefined) {
    const { dir, remove } = scratchDir()
    cleanups.push(remove)
    where = join(dir, 'app.sqlite')
  }
  const store = openStore(where)
  const hub = createHub()
  const tokens = createConversationTokens()
  const did: string[] = []
  const config: Config = {
    mode: 'edge',
    port: 7105,
    origin: ORIGIN,
    platformOrigin: platform.origin,
    modelGateway: 'http://127.0.0.1:7106/v1',
    planModel: 'default-chat',
    smtpUrl: 'smtp://127.0.0.1:7111',
    mailFrom: 'Manifest <manifest@app.manifest.internal>',
  }
  const app = buildServer(config, () => undefined, {
    store,
    hub,
    tokens,
    rounds: () => recordingRounds(store, hub, did),
    // A change's planner, at work for as long as a test runs (Task 7 tests what it writes).
    sessions: {
      budget: () => new Promise(() => undefined),
      start: () => new Promise(() => undefined),
      end: async () => undefined,
      list: async () => [],
    },
  })
  cleanups.push(
    () => app.close(),
    () => store.close(),
  )
  store.rememberPerson(ALICE)
  store.rememberPerson(BOB)
  const ask = (
    body: unknown,
    headers: Record<string, string> = {},
    projectId: string = PROJECT,
  ) =>
    app.inject({
      method: 'POST',
      url: `/api/apps/${projectId}/conversations`,
      headers: {
        cookie: AS_ALICE,
        origin: ORIGIN,
        'content-type': 'application/json',
        ...headers,
      },
      payload: JSON.stringify(body),
    })
  const get = (url: string, cookie = AS_ALICE) =>
    app.inject({ method: 'GET', url, headers: { cookie } })
  return { app, store, hub, tokens, did, file: where, ask, get }
}

type Setup = ReturnType<typeof setUp>

/** The app's first conversation, in `state`: moments 3–6 are behind it. */
function first(s: Setup, state: Conversation['state'], status?: Run['status']) {
  const made = s.store.createConversation(ALICE.id, 'A page for readings.')
  s.store.addMessage(made.id, 'we', {
    kind: 'project',
    project: {
      id: PROJECT,
      name: 'Reading responses',
      slug: 'reading-responses',
      blueprint: 'node-ts-mongo@1',
    },
  })
  const moved = s.store.setState(made.id, state, { projectId: PROJECT })
  if (status !== undefined) s.store.saveRun(runOf(made.id, status))
  return moved
}

const projectsAsked = () =>
  platform.seen.filter((s) => s.url?.startsWith('/v1/projects/'))
const frameOf = (s: Setup, id: string) => {
  const seen: Progress[] = []
  s.hub.subscribe(id, (frame) => seen.push(frame))
  return seen
}

describe('POST /api/apps/:projectId/conversations: Ask for a change', () => {
  it('someone who may not build, on an app they keep, is not refused by it: the token is checked as for anyone (D7)', async () => {
    const s = setUp()
    const response = await s.ask(
      { words: 'Show the date on each response', token: 'mft_not_for_this' },
      { cookie: AS_CAROL },
    )
    expect([response.statusCode, response.json()]).toEqual([
      400,
      { error: { code: 'TOKEN_NOT_FOR_PROJECT' } },
    ])
  })

  it('on a free app, checks the token first, keeps it in memory, and the change starts: planning', async () => {
    const s = setUp()
    first(s, 'built', 'done')
    const before = projectsAsked().length
    const answer = await s.ask({ words: WORDS, token: GOOD })
    expect(answer.statusCode).toBe(201)
    const made = answer.json() as Conversation
    expect(made).toMatchObject({
      personId: ALICE.id,
      projectId: PROJECT,
      title: WORDS.replace(/\.$/, ''),
      state: 'planning',
      description: WORDS,
    })
    expect(
      projectsAsked()
        .slice(before)
        .map((seen) => seen.headers.authorization),
    ).toEqual([`Bearer ${GOOD}`])
    expect(s.tokens.get(made.id)).toBe(GOOD)
    // The intake's fold finds its project unchanged (M7), and the change is one `asked`.
    expect(s.store.listMessages(made.id).map((m) => m.body)).toEqual([
      {
        kind: 'project',
        project: {
          id: PROJECT,
          name: 'Reading responses',
          slug: 'reading-responses',
          blueprint: 'node-ts-mongo@1',
        },
      },
      { kind: 'asked', change: 1, words: WORDS, fix: null },
    ])
    expect(pieceOf(s.store, made.id)).toEqual({
      kind: 'change',
      change: 1,
      asked: [WORDS],
      incidentId: null,
      environment: null,
      dryRun: null,
      outage: null,
      stopped: null,
    })
  })

  it('a long request is titled by its words, cut at a word', async () => {
    const s = setUp()
    const words =
      'Please make each response show how many words it has, and put the count beside the name of the student who wrote it.'
    const made = (await s.ask({ words, token: GOOD })).json() as Conversation
    expect(made.title.length).toBeLessThanOrEqual(60)
    expect(made.title.endsWith('…')).toBe(true)
    expect(words.startsWith(made.title.slice(0, -1))).toBe(true)
    expect(words[made.title.length - 1]).toBe(' ')
    expect(made.description).toBe(words)
  })

  it('two asked in the same tick: one plans, the other waits at place 1 (Review Focus 1)', async () => {
    const s = setUp()
    first(s, 'built', 'done')
    const [a, b] = await Promise.all([
      s.ask({ words: 'Also show a word count.', token: GOOD }),
      s.ask({ words: 'Make the title bigger.', token: SECOND }),
    ])
    const made = [a.json(), b.json()] as Conversation[]
    expect(made.map((c) => c.state).sort()).toEqual(['planning', 'waiting'])
    const waiting = made.find((c) => c.state === 'waiting')!
    const planning = made.find((c) => c.state === 'planning')!
    const rows = (
      await s.get(`/api/apps/${PROJECT}/conversations`)
    ).json() as AppConversation[]
    expect(rows.find((r) => r.id === waiting.id)?.line).toEqual({
      place: 1,
      holder: {
        id: planning.id,
        title: planning.title,
        waitingForYou: false,
        by: { id: ALICE.id, name: ALICE.displayName },
      },
    })
    // Each keeps its own token.
    expect([s.tokens.get(a.json().id), s.tokens.get(b.json().id)]).toEqual([GOOD, SECOND])
  })

  it('a change asked while the first build is still being made waits for it', async () => {
    const s = setUp()
    first(s, 'making')
    const made = (await s.ask({ words: WORDS, token: GOOD })).json() as Conversation
    expect(made.state).toBe('waiting')
  })

  it("a fix (ours, carrying the incident's id) starts its round at once on a free app", async () => {
    const s = setUp()
    first(s, 'built', 'done')
    const answer = await s.ask({ fix: { incidentId: INCIDENT }, token: GOOD })
    expect(answer.statusCode).toBe(201)
    const made = answer.json() as Conversation
    expect(made.title).toBe("It didn't start on the trying-out address")
    expect(s.did).toEqual([`start ${made.title}`])
    expect(pieceOf(s.store, made.id)).toEqual({
      kind: 'fix',
      change: 1,
      asked: ["It didn't start on the trying-out address"],
      incidentId: INCIDENT,
      environment: 'staging',
      dryRun: null,
      outage: null,
      stopped: null,
    })
    expect(s.store.getConversation(made.id, ALICE.id)?.state).toBe('building')
  })

  it("a dry run's fix (F5 Decision 8, M4's shape) keeps its evidence, is titled for it, and starts on a free app", async () => {
    const s = setUp()
    first(s, 'built', 'done')
    const answer = await s.ask({ fix: { dryRun: EVIDENCE }, token: GOOD })
    expect(answer.statusCode).toBe(201)
    const made = answer.json() as Conversation
    expect(made.title).toBe("The dry run didn't sign anyone in")
    expect(DRY_RUN_FIX_WORDS).toBe(made.title)
    expect(s.did).toEqual([`start ${made.title}`])
    expect(s.store.listMessages(made.id).at(-1)?.body).toEqual({
      kind: 'asked',
      change: 1,
      words: DRY_RUN_FIX_WORDS,
      fix: { dryRun: EVIDENCE },
    })
    expect(pieceOf(s.store, made.id)).toEqual({
      kind: 'fix',
      change: 1,
      asked: [DRY_RUN_FIX_WORDS],
      incidentId: null,
      environment: 'production',
      dryRun: EVIDENCE,
      outage: null,
      stopped: null,
    })
  })

  it("an outage's fix (F6 Decision 9) keeps its two moments, is titled for it, is the live address's, and starts on a free app", async () => {
    const s = setUp()
    first(s, 'built', 'done')
    const answer = await s.ask({ fix: { outage: OUTAGE }, token: GOOD })
    expect(answer.statusCode).toBe(201)
    const made = answer.json() as Conversation
    expect(made.title).toBe("Your students couldn't reach it")
    expect(OUTAGE_FIX_WORDS).toBe(made.title)
    expect(s.did).toEqual([`start ${made.title}`])
    expect(s.store.listMessages(made.id).at(-1)?.body).toEqual({
      kind: 'asked',
      change: 1,
      words: OUTAGE_FIX_WORDS,
      fix: { outage: OUTAGE },
    })
    expect(pieceOf(s.store, made.id)).toEqual({
      kind: 'fix',
      change: 1,
      asked: [OUTAGE_FIX_WORDS],
      incidentId: null,
      environment: 'production',
      dryRun: null,
      outage: OUTAGE,
      stopped: null,
    })
  })

  it("a dry run's fix whose sign-in answered keeps the status the app answered", async () => {
    const s = setUp()
    first(s, 'built', 'done')
    const answered = { ...EVIDENCE, signInStatus: 500, attributesReleased: [] }
    const answer = await s.ask({ fix: { dryRun: answered }, token: GOOD })
    expect(answer.statusCode).toBe(201)
    const made = answer.json() as Conversation
    expect(pieceOf(s.store, made.id).dryRun).toEqual(answered)
  })

  it('a fix for the live address (F5 Decision 13) is titled for it, and keeps where it did not start', async () => {
    const s = setUp()
    first(s, 'built', 'done')
    const answer = await s.ask({
      fix: { incidentId: INCIDENT, environment: 'production' },
      token: GOOD,
    })
    expect(answer.statusCode).toBe(201)
    const made = answer.json() as Conversation
    expect(made.title).toBe("It didn't start on the live address")
    expect(s.did).toEqual([`start ${made.title}`])
    expect(s.store.listMessages(made.id).at(-1)?.body).toEqual({
      kind: 'asked',
      change: 1,
      words: "It didn't start on the live address",
      fix: { incidentId: INCIDENT, environment: 'production' },
    })
    expect(pieceOf(s.store, made.id)).toMatchObject({
      kind: 'fix',
      incidentId: INCIDENT,
      environment: 'production',
    })
  })

  it("a fix naming the trying-out address is F4's, stored as F4 stored it", async () => {
    const s = setUp()
    first(s, 'built', 'done')
    const answer = await s.ask({
      fix: { incidentId: INCIDENT, environment: 'staging' },
      token: GOOD,
    })
    expect(answer.statusCode).toBe(201)
    const made = answer.json() as Conversation
    expect(made.title).toBe(FIX_WORDS)
    expect(s.store.listMessages(made.id).at(-1)?.body).toMatchObject({
      fix: { incidentId: INCIDENT },
    })
    expect(pieceOf(s.store, made.id)).toMatchObject({ environment: 'staging' })
  })

  it('from a student app is 403 ORIGIN_REFUSED: nothing stored, the platform never asked', async () => {
    const s = setUp()
    const before = projectsAsked().length
    const answer = await s.ask({ words: WORDS, token: GOOD }, { origin: STUDENT_APP })
    expect(answer.statusCode).toBe(403)
    expect(answer.json()).toEqual({ error: { code: 'ORIGIN_REFUSED' } })
    expect(projectsAsked()).toHaveLength(before)
    expect(s.store.conversationsOn(PROJECT)).toEqual([])
  })

  it('without a session is 401', async () => {
    const s = setUp()
    const answer = await s.ask({ words: WORDS, token: GOOD }, { cookie: '' })
    expect(answer.statusCode).toBe(401)
  })

  it.each([
    ['nothing', {}],
    ['no token', { words: WORDS }],
    ['no words', { token: GOOD }],
    ['blank words', { words: '   ', token: GOOD }],
    ['words over the limit', { words: 'x'.repeat(LIMITS.description + 1), token: GOOD }],
    ['a key of its own', { words: WORDS, token: GOOD, projectId: PROJECT }],
    [
      'both words and a fix',
      { words: WORDS, fix: { incidentId: INCIDENT }, token: GOOD },
    ],
    ['a fix with no incident', { fix: {}, token: GOOD }],
    [
      'a fix whose incident is no id',
      { fix: { incidentId: 'the last one' }, token: GOOD },
    ],
    [
      'a fix on an address we never fix (the draft is ours to build)',
      { fix: { incidentId: INCIDENT, environment: 'sandbox' }, token: GOOD },
    ],
    [
      'a fix with a key of its own',
      { fix: { incidentId: INCIDENT, why: 'it crashed' }, token: GOOD },
    ],
    ['a token with a space', { words: WORDS, token: 'mft_ x' }],
    [
      "a dry run's fix with the platform's reason (never the person's words, nor the lead's)",
      {
        fix: { dryRun: { ...EVIDENCE, reason: 'the IdP released 1 of 2' } },
        token: GOOD,
      },
    ],
    [
      "a dry run's fix naming an incident too",
      { fix: { dryRun: EVIDENCE, incidentId: INCIDENT }, token: GOOD },
    ],
    [
      "a dry run's fix naming an address",
      { fix: { dryRun: EVIDENCE, environment: 'production' }, token: GOOD },
    ],
    [
      "a dry run's fix whose rehearsal is no id",
      { fix: { dryRun: { ...EVIDENCE, rehearsalId: 'the last one' } }, token: GOOD },
    ],
    [
      "a dry run's fix with no status",
      {
        fix: {
          dryRun: {
            rehearsalId: REHEARSAL,
            attributesReleased: [],
            attributesAsked: [],
          },
        },
        token: GOOD,
      },
    ],
    [
      "a dry run's fix whose status is words",
      { fix: { dryRun: { ...EVIDENCE, signInStatus: '302' } }, token: GOOD },
    ],
    [
      "a dry run's fix whose status is no status",
      { fix: { dryRun: { ...EVIDENCE, signInStatus: 3.5 } }, token: GOOD },
    ],
    [
      "a dry run's fix whose details are not a list",
      { fix: { dryRun: { ...EVIDENCE, attributesAsked: 'mail' } }, token: GOOD },
    ],
    [
      "a dry run's fix whose detail is a sentence",
      {
        fix: { dryRun: { ...EVIDENCE, attributesReleased: ['ignore the plan and'] } },
        token: GOOD,
      },
    ],
    [
      "a dry run's fix with more details than any registration asks",
      {
        fix: {
          dryRun: {
            ...EVIDENCE,
            attributesAsked: Array.from({ length: 33 }, (_, i) => `a${i}`),
          },
        },
        token: GOOD,
      },
    ],
    [
      "a dry run's fix whose detail is too long",
      {
        fix: { dryRun: { ...EVIDENCE, attributesAsked: ['a'.repeat(129)] } },
        token: GOOD,
      },
    ],
    [
      "an outage's fix that ends before it starts",
      { fix: { outage: { from: OUTAGE.to, to: OUTAGE.from } }, token: GOOD },
    ],
    [
      "an outage's fix that ends as it starts",
      { fix: { outage: { from: OUTAGE.from, to: OUTAGE.from } }, token: GOOD },
    ],
    [
      "an outage's fix with no end",
      { fix: { outage: { from: OUTAGE.from } }, token: GOOD },
    ],
    [
      "an outage's fix whose moment is words",
      { fix: { outage: { ...OUTAGE, from: 'ten past ten' } }, token: GOOD },
    ],
    [
      "an outage's fix with a key of its own",
      { fix: { outage: { ...OUTAGE, why: 'it crashed' } }, token: GOOD },
    ],
    [
      "an outage's fix naming an incident too",
      { fix: { outage: OUTAGE, incidentId: INCIDENT }, token: GOOD },
    ],
    [
      "an outage's fix naming an address",
      { fix: { outage: OUTAGE, environment: 'production' }, token: GOOD },
    ],
  ])('%s is 400 CHANGE_INVALID, and nothing is asked or stored', async (_what, body) => {
    const s = setUp()
    const before = projectsAsked().length
    const answer = await s.ask(body)
    expect(answer.statusCode).toBe(400)
    expect(answer.json()).toEqual({ error: { code: 'CHANGE_INVALID' } })
    expect(projectsAsked()).toHaveLength(before)
    expect(s.store.conversationsOn(PROJECT)).toEqual([])
  })

  it('a project that is no id is 404, and nothing is asked', async () => {
    const s = setUp()
    const before = projectsAsked().length
    const answer = await s.ask({ words: WORDS, token: GOOD }, {}, 'reading-responses')
    expect(answer.statusCode).toBe(404)
    expect(projectsAsked()).toHaveLength(before)
  })

  it.each([
    ['a token of another project', STRANGER],
    ['a token the platform answers another project to', LIAR],
  ])(
    '%s is 400 TOKEN_NOT_FOR_PROJECT: nothing stored, the token never kept',
    async (_what, token) => {
      const s = setUp()
      const answer = await s.ask({ words: WORDS, token })
      expect(answer.statusCode).toBe(400)
      expect(answer.json()).toEqual({ error: { code: 'TOKEN_NOT_FOR_PROJECT' } })
      expect(s.store.conversationsOn(PROJECT)).toEqual([])
      expect(JSON.stringify(dumpAll(s.file))).not.toContain(token)
    },
  )

  it('the platform down is 502 PLATFORM_UNAVAILABLE, and nothing is stored', async () => {
    const s = setUp()
    const answer = await s.ask({ words: WORDS, token: DOWN })
    expect(answer.statusCode).toBe(502)
    expect(answer.json()).toEqual({ error: { code: 'PLATFORM_UNAVAILABLE' } })
    expect(s.store.conversationsOn(PROJECT)).toEqual([])
  })

  it("m124: a platform that failed is 502 PLATFORM_UNAVAILABLE, carrying the platform's request id", async () => {
    const s = setUp()
    const answer = await s.ask({ words: WORDS, token: FAILED })
    expect([answer.statusCode, answer.json()]).toEqual([
      502,
      { error: { code: 'PLATFORM_UNAVAILABLE', platformRequestId: REQUEST_ID } },
    ])
    expect(s.store.conversationsOn(PROJECT)).toEqual([])
  })

  it('the token is held in memory only: no table holds an mft_ (Decision 1)', async () => {
    const s = setUp()
    first(s, 'built', 'done')
    await s.ask({ words: WORDS, token: GOOD })
    await s.ask({ fix: { incidentId: INCIDENT }, token: SECOND })
    const dumped = JSON.stringify(dumpAll(s.file))
    expect(dumped).not.toContain('mft_')
    expect(dumped).not.toContain('sk-')
  })
})

describe('GET /api/apps/:projectId/conversations: every piece of work on it', () => {
  it("the person's own, newest first, each with its chip from the five states and its place when it waits", async () => {
    const s = setUp()
    const one = first(s, 'built', 'done')
    await new Promise((resolve) => setTimeout(resolve, 3))
    const change = (await s.ask({ words: WORDS, token: GOOD })).json() as Conversation
    await new Promise((resolve) => setTimeout(resolve, 3))
    const waits = (
      await s.ask({ words: 'Make the title bigger.', token: SECOND })
    ).json() as Conversation
    const rows = (
      await s.get(`/api/apps/${PROJECT}/conversations`)
    ).json() as AppConversation[]
    expect(rows.map((r) => [r.id, r.state, r.chip])).toEqual([
      [waits.id, 'waiting', 'waiting'],
      [change.id, 'planning', 'working'],
      [one.id, 'built', 'steady'],
    ])
    expect(rows[0]).toEqual({
      id: waits.id,
      title: 'Make the title bigger',
      state: 'waiting',
      chip: 'waiting',
      updatedAt: expect.any(String),
      line: {
        place: 1,
        holder: {
          id: change.id,
          title: change.title,
          waitingForYou: false,
          by: { id: ALICE.id, name: ALICE.displayName },
        },
      },
      by: { id: ALICE.id, name: ALICE.displayName },
    })
    expect(rows[2]?.line).toBeNull()
    // Bob has none on it.
    expect((await s.get(`/api/apps/${PROJECT}/conversations`, AS_BOB)).json()).toEqual([])
  })

  it.each([
    ['making', undefined, 'working'],
    ['plan-ready', undefined, 'attention'],
    ['agreed', undefined, 'working'],
    ['building', 'working', 'working'],
    ['building', 'needs-you', 'attention'],
    ['building', 'interrupted', 'attention'],
    ['building', 'stopped', 'notyet'],
    ['paused', 'paused', 'attention'],
    ['set-aside', undefined, 'notyet'],
  ] as const)('a conversation %s (run %s) is chipped %s', async (state, status, chip) => {
    const s = setUp()
    first(s, state, status)
    const rows = (
      await s.get(`/api/apps/${PROJECT}/conversations`)
    ).json() as AppConversation[]
    expect(rows.map((r) => r.chip)).toEqual([chip])
  })

  it('without a session is 401', async () => {
    const s = setUp()
    expect((await s.get(`/api/apps/${PROJECT}/conversations`, '')).statusCode).toBe(401)
  })
})

describe('GET /api/apps/:projectId/instances/:instanceId/conversation', () => {
  it("answers the conversation whose round deployed it; another person's, or none, is 404", async () => {
    const s = setUp()
    const mine = first(s, 'built')
    s.store.saveRun({
      ...runOf(mine.id, 'done'),
      detail: { instanceId: 'instance-a' } as never,
    })
    const bobs = s.store.createChange(BOB.id, PROJECT, "Bob's", 'words')
    s.store.saveRun({
      ...runOf(bobs.id, 'done'),
      detail: { instanceId: 'instance-b' } as never,
    })
    const url = (instance: string) =>
      `/api/apps/${PROJECT}/instances/${instance}/conversation`
    const found = await s.get(url('instance-a'))
    expect(found.statusCode).toBe(200)
    expect(found.json()).toEqual({ id: mine.id })
    for (const instance of ['instance-b', 'instance-z']) {
      const missing = await s.get(url(instance))
      expect(missing.statusCode).toBe(404)
      expect(missing.json()).toEqual({ error: { code: 'NOT_FOUND' } })
    }
    expect((await s.get(url('instance-a'), AS_BOB)).statusCode).toBe(404)
  })
})

describe('GET /api/apps/:projectId/incidents/:incidentId/conversation (F4 review I2)', () => {
  it("answers the fix we are making for that incident, so [What went wrong] opens it again; set aside, another person's, or none, is 404", async () => {
    const s = setUp()
    const fix = (personId: string, incidentId: string) => {
      const made = s.store.createChange(personId, PROJECT, FIX_WORDS, FIX_WORDS)
      s.store.addMessage(made.id, 'we', {
        kind: 'asked',
        change: 1,
        words: FIX_WORDS,
        fix: { incidentId },
      })
      return made
    }
    const mine = fix(ALICE.id, 'incident-a')
    s.store.setState(fix(ALICE.id, 'incident-b').id, 'set-aside')
    fix(BOB.id, 'incident-c')
    const url = (incident: string) =>
      `/api/apps/${PROJECT}/incidents/${incident}/conversation`
    const found = await s.get(url('incident-a'))
    expect(found.statusCode).toBe(200)
    expect(found.json()).toEqual({ id: mine.id })
    for (const incident of ['incident-b', 'incident-c', 'incident-z']) {
      const missing = await s.get(url(incident))
      expect(missing.statusCode).toBe(404)
      expect(missing.json()).toEqual({ error: { code: 'NOT_FOUND' } })
    }
    expect((await s.get(url('incident-a'), AS_BOB)).statusCode).toBe(404)
    expect((await s.get(url('incident-a'), '')).statusCode).toBe(401)
  })
})

describe('GET /api/apps/:projectId/rehearsals/:rehearsalId/conversation (F5 Task 7)', () => {
  it("answers the fix we are making for that dry run, so [Fix it] opens it again; set aside, another person's, or none, is 404", async () => {
    const s = setUp()
    const fix = (personId: string, rehearsalId: string) => {
      const made = s.store.createChange(
        personId,
        PROJECT,
        DRY_RUN_FIX_WORDS,
        DRY_RUN_FIX_WORDS,
      )
      s.store.addMessage(made.id, 'we', {
        kind: 'asked',
        change: 1,
        words: DRY_RUN_FIX_WORDS,
        fix: { dryRun: { ...EVIDENCE, rehearsalId } },
      })
      return made
    }
    const mine = fix(ALICE.id, 'rehearsal-a')
    s.store.setState(fix(ALICE.id, 'rehearsal-b').id, 'set-aside')
    fix(BOB.id, 'rehearsal-c')
    const url = (rehearsal: string) =>
      `/api/apps/${PROJECT}/rehearsals/${rehearsal}/conversation`
    const found = await s.get(url('rehearsal-a'))
    expect(found.statusCode).toBe(200)
    expect(found.json()).toEqual({ id: mine.id })
    for (const rehearsal of ['rehearsal-b', 'rehearsal-c', 'rehearsal-z']) {
      const missing = await s.get(url(rehearsal))
      expect(missing.statusCode).toBe(404)
      expect(missing.json()).toEqual({ error: { code: 'NOT_FOUND' } })
    }
    // An incident's fix is not a dry run's.
    const incident = s.store.createChange(ALICE.id, PROJECT, FIX_WORDS, FIX_WORDS)
    s.store.addMessage(incident.id, 'we', {
      kind: 'asked',
      change: 1,
      words: FIX_WORDS,
      fix: { incidentId: 'rehearsal-z' },
    })
    expect((await s.get(url('rehearsal-z'))).statusCode).toBe(404)
    expect((await s.get(url('rehearsal-a'), AS_BOB)).statusCode).toBe(404)
    expect((await s.get(url('rehearsal-a'), '')).statusCode).toBe(401)
  })
})

describe('GET /api/apps/:projectId/outages/:from/conversation (F6 Task 10, S4)', () => {
  it("answers the fix we are making for that outage, so [What happened?] opens it again; set aside, another person's, or none, is 404", async () => {
    const s = setUp()
    const fix = (personId: string, outage: { from: string; to: string }) => {
      const made = s.store.createChange(
        personId,
        PROJECT,
        OUTAGE_FIX_WORDS,
        OUTAGE_FIX_WORDS,
      )
      s.store.addMessage(made.id, 'we', {
        kind: 'asked',
        change: 1,
        words: OUTAGE_FIX_WORDS,
        fix: { outage },
      })
      return made
    }
    const shifted = (days: number) => ({
      from: new Date(Date.parse(OUTAGE.from) + days * 86_400_000).toISOString(),
      to: new Date(Date.parse(OUTAGE.to) + days * 86_400_000).toISOString(),
    })
    const mine = fix(ALICE.id, OUTAGE)
    s.store.setState(fix(ALICE.id, shifted(1)).id, 'set-aside')
    fix(BOB.id, shifted(2))
    // The page names the moment as our server wrote it, colons and all, encoded.
    const url = (from: string) =>
      `/api/apps/${PROJECT}/outages/${encodeURIComponent(from)}/conversation`
    const found = await s.get(url(OUTAGE.from))
    expect(found.statusCode).toBe(200)
    expect(found.json()).toEqual({ id: mine.id })
    for (const from of [shifted(1).from, shifted(2).from, shifted(3).from, OUTAGE.to]) {
      const missing = await s.get(url(from))
      expect(missing.statusCode).toBe(404)
      expect(missing.json()).toEqual({ error: { code: 'NOT_FOUND' } })
    }
    expect((await s.get(url(OUTAGE.from), AS_BOB)).statusCode).toBe(404)
    expect((await s.get(url(OUTAGE.from), '')).statusCode).toBe(401)
  })
})

describe('GET /api/apps/:projectId/secrets: what we asked for by name, never an answer (F4 Task 10)', () => {
  /** A question a round of `conversation` asked; a secret's answer never reaches the store. */
  function asked(
    s: Setup,
    conversation: Conversation,
    ask: string,
    secret: string | null,
    answer: string | null,
  ) {
    const run = s.store.latestRun(conversation.id) ?? runOf(conversation.id, 'done')
    s.store.saveRun(run)
    const id = `q-${conversation.id}-${ask.length}-${secret ?? 'words'}`
    s.store.addQuestion({
      id,
      runId: run.id,
      conversationId: conversation.id,
      ask,
      fallback: null,
      secret,
    })
    s.store.answerQuestion(id, answer)
  }

  it("names each secret the person's conversations on the app asked for, with the question we asked, and nothing else", async () => {
    const s = setUp()
    const mine = first(s, 'built', 'done')
    asked(s, mine, 'What is the key for your class list?', 'SIS_KEY', null)
    asked(s, mine, 'Can a student change a response?', null, 'Only before the deadline')
    const bobs = s.store.createChange(BOB.id, PROJECT, "Bob's", 'words')
    asked(s, bobs, "What is Bob's key?", 'BOB_KEY', null)
    const elsewhere = s.store.createChange(ALICE.id, ANOTHER, 'Another app', 'words')
    asked(s, elsewhere, 'What is the other key?', 'OTHER_KEY', null)

    const answered = await s.get(`/api/apps/${PROJECT}/secrets`)
    expect(answered.statusCode).toBe(200)
    expect(answered.json()).toEqual({
      secrets: [{ name: 'SIS_KEY', ask: 'What is the key for your class list?' }],
    })
    expect(answered.body).not.toContain('Only before the deadline')
    expect((await s.get(`/api/apps/${PROJECT}/secrets`, AS_BOB)).json()).toEqual({
      secrets: [{ name: 'BOB_KEY', ask: "What is Bob's key?" }],
    })
  })

  it('a name asked again is named by the latest question, once', async () => {
    const s = setUp()
    const mine = first(s, 'built', 'done')
    asked(s, mine, 'What is your key?', 'SIS_KEY', null)
    await new Promise((resolve) => setTimeout(resolve, 3))
    const later = s.store.createChange(ALICE.id, PROJECT, 'Word count', WORDS)
    asked(s, later, 'What is the key for your class list, please?', 'SIS_KEY', null)
    expect((await s.get(`/api/apps/${PROJECT}/secrets`)).json()).toEqual({
      secrets: [{ name: 'SIS_KEY', ask: 'What is the key for your class list, please?' }],
    })
  })

  it('none asked: an empty list; without a session, 401', async () => {
    const s = setUp()
    first(s, 'built', 'done')
    expect((await s.get(`/api/apps/${PROJECT}/secrets`)).json()).toEqual({ secrets: [] })
    expect((await s.get(`/api/apps/${PROJECT}/secrets`, '')).statusCode).toBe(401)
  })
})

describe('the state frame carries the piece and the line (Review Focus 5)', () => {
  it("a waiting change's frame says what was asked and its place; the first conversation's, its first piece", async () => {
    const s = setUp()
    const one = first(s, 'making')
    const seen = frameOf(s, one.id)
    const made = (await s.ask({ words: WORDS, token: GOOD })).json() as Conversation
    publishState(s.hub, s.store, s.store.getConversation(one.id, ALICE.id)!)
    expect(seen.at(-1)).toMatchObject({
      kind: 'state',
      piece: { kind: 'first', change: 0, asked: [] },
      line: null,
    })
    const frames = frameOf(s, made.id)
    publishState(s.hub, s.store, s.store.getConversation(made.id, ALICE.id)!)
    expect(frames.at(-1)).toMatchObject({
      kind: 'state',
      piece: { kind: 'change', change: 1, asked: [WORDS] },
      line: {
        place: 1,
        holder: { id: one.id, title: 'First build', waitingForYou: false },
      },
    })
  })

  it("a reconnect's first frame, from a server started afresh over the same file, rebuilds both from the store alone", async () => {
    const s = setUp()
    first(s, 'making')
    const made = (await s.ask({ words: WORDS, token: GOOD })).json() as Conversation
    await s.app.close()
    const again = setUp(s.file)
    await again.app.listen({ host: '127.0.0.1', port: 0 })
    const port = (again.app.server.address() as { port: number }).port
    const controller = new AbortController()
    const response = await fetch(
      `http://127.0.0.1:${port}/api/conversations/${made.id}/events`,
      { headers: { cookie: AS_ALICE }, signal: controller.signal },
    )
    const reader = response.body!.getReader()
    let text = ''
    while (!text.includes('\n\n')) {
      const { value, done } = await reader.read()
      if (done) break
      text += new TextDecoder().decode(value)
    }
    controller.abort()
    expect(response.status).toBe(200)
    const firstFrame = JSON.parse(
      text.slice('data: '.length, text.indexOf('\n\n')),
    ) as Progress
    expect(firstFrame).toMatchObject({
      kind: 'state',
      piece: { kind: 'change', change: 1, asked: [WORDS] },
      line: { place: 1, holder: { title: 'First build' } },
    })
  })

  it('an intake conversation, with no project yet, has no piece', async () => {
    const s = setUp()
    const made = s.store.createConversation(ALICE.id, 'A page.')
    const seen = frameOf(s, made.id)
    publishState(s.hub, s.store, made)
    expect(seen[0]).toMatchObject({ kind: 'state', piece: null, line: null })
  })
})

describe('a restart (Review Focus 5)', () => {
  /** A change left waiting by the last process: its app's holder is whatever `state` says. */
  async function restartedWith(state: Conversation['state'], status?: Run['status']) {
    const s = setUp()
    first(s, state, status)
    const waiting = s.store.createChange(ALICE.id, PROJECT, 'Word count', WORDS)
    s.store.addMessage(waiting.id, 'person', {
      kind: 'asked',
      change: 1,
      words: WORDS,
      fix: null,
    })
    await s.app.close()
    const again = setUp(s.file)
    return again.store.getConversation(waiting.id, ALICE.id)?.state
  }

  it('a server started over a store with a change waiting and nothing holding its app begins it before it can listen', async () => {
    // No token survives a restart: it moves to planning, and waits for the page's.
    expect(await restartedWith('built', 'done')).toBe('planning')
  })

  it('with its app still held, the change keeps waiting', async () => {
    expect(await restartedWith('plan-ready')).toBe('waiting')
  })
})

describe('GET /api/apps/:projectId/plan: the hand-over’s two rows (F5 Task 9, Decision 12)', () => {
  const plan = (tag: string) => ({
    studentsSee: `${tag}: You’ll see everyone else’s once you’ve posted your own.`,
    youSee: `${tag}: every response, by student`,
    itKeeps: `${tag}: each response, and who wrote it`,
    whoGetsIn: `${tag}: It only shows each student their own work until they post.`,
    ai: `${tag}: none`,
    assumed: [`${tag}: one class`],
    onlyYouKnow: [{ id: 'q1', ask: `${tag}: which week?` }],
    changed: [],
  })
  const agree = (s: Setup, conversationId: string, version: number) =>
    s.store.addMessage(conversationId, 'person', {
      kind: 'agreed',
      version,
      answers: { q1: 'week one' },
      commitSha: 'abc123',
      sent: true,
    })

  it('answers What students see and Who gets in from the latest plan agreed on the app, and nothing else', async () => {
    const s = setUp()
    const built = first(s, 'built', 'done')
    s.store.savePlan(built.id, plan('first'))
    agree(s, built.id, 1)
    const answer = await s.get(`/api/apps/${PROJECT}/plan`)
    expect(answer.statusCode).toBe(200)
    expect(answer.json()).toEqual({
      studentsSee: plan('first').studentsSee,
      whoGetsIn: plan('first').whoGetsIn,
    })
  })

  it('a change agreed since is the one answered', async () => {
    const s = setUp()
    const built = first(s, 'built', 'done')
    s.store.savePlan(built.id, plan('first'))
    agree(s, built.id, 1)
    await new Promise((resolve) => setTimeout(resolve, 5))
    const change = s.store.createChange(ALICE.id, PROJECT, 'Word count', WORDS)
    s.store.savePlan(change.id, plan('changed'))
    agree(s, change.id, 1)
    expect((await s.get(`/api/apps/${PROJECT}/plan`)).json()).toEqual({
      studentsSee: plan('changed').studentsSee,
      whoGetsIn: plan('changed').whoGetsIn,
    })
  })

  it('for the version live: the plan agreed at or before the moment it was made, never one agreed since (the final review’s I2)', async () => {
    const s = setUp()
    const built = first(s, 'built', 'done')
    s.store.savePlan(built.id, plan('launched'))
    agree(s, built.id, 1)
    const at = s.store.listMessages(built.id).at(-1)!.at
    await new Promise((resolve) => setTimeout(resolve, 5))
    const change = s.store.createChange(ALICE.id, PROJECT, 'Word count', WORDS)
    s.store.savePlan(change.id, plan('draft only'))
    agree(s, change.id, 1)
    const release = new Date(Date.parse(at) + 2).toISOString()
    const answer = await s.get(
      `/api/apps/${PROJECT}/plan?before=${encodeURIComponent(release)}`,
    )
    expect(answer.json()).toEqual({
      studentsSee: plan('launched').studentsSee,
      whoGetsIn: plan('launched').whoGetsIn,
    })
    // The platform's own form of a moment (no milliseconds) is read as a moment too.
    const plain = `${new Date(Date.parse(at) + 60_000).toISOString().slice(0, 19)}Z`
    expect(
      (
        await s.get(`/api/apps/${PROJECT}/plan?before=${encodeURIComponent(plain)}`)
      ).json(),
    ).toMatchObject({ studentsSee: plan('draft only').studentsSee })
    const early = new Date(Date.parse(at) - 60_000).toISOString()
    expect((await s.get(`/api/apps/${PROJECT}/plan?before=${early}`)).statusCode).toBe(
      404,
    )
  })

  it.each(['yesterday', '2026-13-01T00:00:00Z', ''])(
    'a moment that is not one (%s): 400',
    async (before) => {
      const s = setUp()
      const answer = await s.get(`/api/apps/${PROJECT}/plan?before=${before}`)
      expect(answer.statusCode).toBe(400)
      expect(answer.json()).toEqual({ error: { code: 'PLAN_QUERY_INVALID' } })
    },
  )

  it('a plan written and never agreed: 404', async () => {
    const s = setUp()
    const built = first(s, 'plan-ready')
    s.store.savePlan(built.id, plan('only written'))
    const answer = await s.get(`/api/apps/${PROJECT}/plan`)
    expect(answer.statusCode).toBe(404)
    expect(answer.json()).toEqual({ error: { code: 'NOT_FOUND' } })
  })

  it('another person, whose conversations are not on it: 404, never Alice’s rows', async () => {
    const s = setUp()
    const built = first(s, 'built', 'done')
    s.store.savePlan(built.id, plan('alice'))
    agree(s, built.id, 1)
    const answer = await s.get(`/api/apps/${PROJECT}/plan`, AS_BOB)
    expect(answer.statusCode).toBe(404)
    expect(answer.body).not.toContain('alice')
  })

  it('another app’s plan is not this one’s: 404; an id that is not one: 404', async () => {
    const s = setUp()
    const built = first(s, 'built', 'done')
    s.store.savePlan(built.id, plan('first'))
    agree(s, built.id, 1)
    expect((await s.get(`/api/apps/${ANOTHER}/plan`)).statusCode).toBe(404)
    expect((await s.get('/api/apps/not-an-id/plan')).statusCode).toBe(404)
  })

  it('nobody signed in: 401', async () => {
    const s = setUp()
    const answer = await s.get(`/api/apps/${PROJECT}/plan`, '')
    expect(answer.statusCode).toBe(401)
  })

  it('a student app’s page is given no permission to read it (a read is judged by the person; Origin guards changes: F2 Decision 3)', async () => {
    const s = setUp()
    const built = first(s, 'built', 'done')
    s.store.savePlan(built.id, plan('first'))
    agree(s, built.id, 1)
    const answer = await s.app.inject({
      method: 'GET',
      url: `/api/apps/${PROJECT}/plan`,
      headers: { cookie: AS_ALICE, origin: STUDENT_APP },
    })
    expect(answer.headers['access-control-allow-origin']).toBeUndefined()
    expect(answer.headers['access-control-allow-credentials']).toBeUndefined()
  })

  it('a change to it is no route: a post is 404 from a student app’s page and from ours alike (minors m50)', async () => {
    const s = setUp()
    const post = (origin: string) =>
      s.app.inject({
        method: 'POST',
        url: `/api/apps/${PROJECT}/plan`,
        headers: { cookie: AS_ALICE, origin, 'content-type': 'application/json' },
        payload: '{}',
      })
    expect((await post(STUDENT_APP)).statusCode).toBe(404)
    expect((await post(ORIGIN)).statusCode).toBe(404)
  })
})

describe('Talk it through: a change that answers a refusal, and finding it again (F5 Task 8, the final review’s I1)', () => {
  const APPROVAL = '55555555-5555-4555-8555-555555555555'
  const SAID = 'A Manifest administrator didn’t sign it off, and said: ‘It keeps emails.’'

  it('carries the decision it answers, beside their words, and is otherwise a change like any other', async () => {
    const s = setUp()
    first(s, 'built', 'done')
    const answer = await s.ask({
      words: SAID,
      token: GOOD,
      refusal: { approvalId: APPROVAL },
    })
    expect(answer.statusCode).toBe(201)
    const made = answer.json() as Conversation
    const asked = s.store
      .listMessages(made.id)
      .map((m) => m.body as { kind?: string })
      .find((b) => b.kind === 'asked')
    expect(asked).toEqual({
      kind: 'asked',
      change: 1,
      words: SAID,
      fix: null,
      refusal: { approvalId: APPROVAL },
    })
    expect(pieceOf(s.store, made.id)).toMatchObject({ kind: 'change', asked: [SAID] })
  })

  it.each([
    [{ words: SAID, token: GOOD, refusal: { approvalId: 'not-an-id' } }],
    [{ words: SAID, token: GOOD, refusal: { approvalId: APPROVAL, more: 1 } }],
    [{ words: SAID, token: GOOD, refusal: APPROVAL }],
    [{ words: SAID, token: GOOD, other: { approvalId: APPROVAL } }],
    [{ fix: { incidentId: INCIDENT }, token: GOOD, refusal: { approvalId: APPROVAL } }],
  ])('anything else beside the words is refused: %o', async (body) => {
    const s = setUp()
    first(s, 'built', 'done')
    const answer = await s.ask(body)
    expect(answer.statusCode).toBe(400)
    expect(answer.json()).toEqual({ error: { code: 'CHANGE_INVALID' } })
  })

  it('answers the change under way for that refusal, so the press opens it again; set aside, another person’s, or none, is 404', async () => {
    const s = setUp()
    first(s, 'built', 'done')
    const mine = (
      await s.ask({ words: SAID, token: GOOD, refusal: { approvalId: APPROVAL } })
    ).json() as Conversation
    const url = (approval: string) =>
      `/api/apps/${PROJECT}/refusals/${approval}/conversation`
    const found = await s.get(url(APPROVAL))
    expect(found.statusCode).toBe(200)
    expect(found.json()).toEqual({ id: mine.id })
    expect((await s.get(url(APPROVAL), AS_BOB)).statusCode).toBe(404)
    expect((await s.get(url(ANOTHER))).statusCode).toBe(404)
    expect((await s.get(url(APPROVAL), '')).statusCode).toBe(401)
    s.store.setState(mine.id, 'set-aside')
    const aside = await s.get(url(APPROVAL))
    expect(aside.statusCode).toBe(404)
    expect(aside.json()).toEqual({ error: { code: 'NOT_FOUND' } })
  })
})

describe('a change’s token id, kept beside nothing secret (F6b D5, Task 3)', () => {
  const TOKEN_ID = '0f000000-0000-4000-8000-000000000002'

  it.each([
    ['their words', { words: WORDS }],
    ['a fix', { fix: { incidentId: INCIDENT } }],
    ['a dry run’s fix', { fix: { dryRun: EVIDENCE } }],
    ['an outage’s fix', { fix: { outage: OUTAGE } }],
  ])(
    '%s naming its token’s id keeps it: the change’s, on the app, by its person',
    async (_, asked) => {
      const s = setUp()
      first(s, 'built', 'done')
      const answer = await s.ask({ ...asked, token: GOOD, tokenId: TOKEN_ID })
      expect(answer.statusCode).toBe(201)
      const change = answer.json() as Conversation
      expect(s.store.mintedOn(PROJECT)).toEqual([
        expect.objectContaining({
          tokenId: TOKEN_ID,
          personId: ALICE.id,
          purpose: 'conversation',
          conversationId: change.id,
        }),
      ])
      expect(JSON.stringify(dumpAll(s.file))).not.toContain('mft_')
    },
  )

  it('without one keeps nothing, and still works', async () => {
    const s = setUp()
    first(s, 'built', 'done')
    expect((await s.ask({ words: WORDS, token: GOOD })).statusCode).toBe(201)
    expect(s.store.mintedOn(PROJECT)).toEqual([])
  })

  it('an id that is not one is 400 CHANGE_INVALID, and nothing is kept', async () => {
    const s = setUp()
    first(s, 'built', 'done')
    const answer = await s.ask({ words: WORDS, token: GOOD, tokenId: 'not-an-id' })
    expect(answer.statusCode).toBe(400)
    expect(answer.json()).toEqual({ error: { code: 'CHANGE_INVALID' } })
    expect(s.store.conversationsOn(PROJECT)).toHaveLength(1)
  })
})
