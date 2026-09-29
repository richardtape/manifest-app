import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openStore, type Store } from './db.js'
import { dumpAll, execOn, pragmaOf, scratchDir } from './testing.js'

/**
 * DECISION 2: ONE SQLITE FILE, AND ONE MODULE THAT READS IT. Decision 1 keeps every
 * credential out of it, and the last case here dumps every table to prove it.
 */
const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

function fresh(): { store: Store; file: string } {
  const { dir, remove } = scratchDir()
  const file = join(dir, 'app.sqlite')
  const store = openStore(file)
  cleanups.push(() => {
    store.close()
    remove()
  })
  return { store, file }
}

const ALICE = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  displayName: 'Alice Instructor',
}
const BOB = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', displayName: 'Bob Instructor' }
const WORDS =
  "A page where students post a response to the week's reading. They shouldn't see anyone else's until they've posted their own."

describe('conversations', () => {
  it('round-trips, in describing, titled First build, with the words verbatim', () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const made = store.createConversation(ALICE.id, WORDS)
    expect(made).toMatchObject({
      personId: ALICE.id,
      projectId: null,
      title: 'First build',
      state: 'describing',
      description: WORDS,
    })
    expect(made.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(store.getConversation(made.id, ALICE.id)).toEqual(made)
  })

  it("another person's conversation is undefined, as one that does not exist", () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    store.rememberPerson(BOB)
    const made = store.createConversation(ALICE.id, WORDS)
    expect(store.getConversation(made.id, BOB.id)).toBeUndefined()
    expect(store.getConversation('no-such-id', ALICE.id)).toBeUndefined()
  })

  it('moves state, with a project and a title when given, and a later updatedAt', async () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const made = store.createConversation(ALICE.id, WORDS)
    await new Promise((resolve) => setTimeout(resolve, 5))
    const moved = store.setState(made.id, 'planning', {
      projectId: '22222222-2222-4222-8222-222222222222',
    })
    expect(moved).toMatchObject({
      state: 'planning',
      projectId: '22222222-2222-4222-8222-222222222222',
      title: 'First build',
    })
    expect(moved.updatedAt > made.updatedAt).toBe(true)
    expect(store.setState(made.id, 'agreed', { title: 'Reading responses' }).title).toBe(
      'Reading responses',
    )
  })

  it('refuses a state it does not know', () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const made = store.createConversation(ALICE.id, WORDS)
    expect(() => store.setState(made.id, 'sleeping' as never)).toThrow()
  })

  it('keeps messages in the order they were added', () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const made = store.createConversation(ALICE.id, WORDS)
    store.addMessage(made.id, 'person', { text: WORDS })
    store.addMessage(made.id, 'we', { restatement: 'A page where your students…' })
    store.addMessage(made.id, 'person', { answers: { q1: 'No' } })
    expect(store.listMessages(made.id).map((m) => [m.from, m.body])).toEqual([
      ['person', { text: WORDS }],
      ['we', { restatement: 'A page where your students…' }],
      ['person', { answers: { q1: 'No' } }],
    ])
  })

  it('versions plans 1, 2, 3, and answers the latest', () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const made = store.createConversation(ALICE.id, WORDS)
    expect(store.latestPlan(made.id)).toBeUndefined()
    expect([1, 2, 3].map((n) => store.savePlan(made.id, { draft: n }))).toEqual([1, 2, 3])
    expect(store.latestPlan(made.id)).toEqual({ version: 3, plan: { draft: 3 } })
  })

  it('a person remembered twice is one person, with their latest name', () => {
    const { store, file } = fresh()
    store.rememberPerson(ALICE)
    store.rememberPerson({ ...ALICE, displayName: 'Alice A. Instructor' })
    expect(JSON.parse(dumpAll(file)['persons'] ?? '[]')).toEqual([
      expect.objectContaining({ id: ALICE.id, display_name: 'Alice A. Instructor' }),
    ])
  })
})

describe('the file survives a restart (the store half of Review Focus 5)', () => {
  it('a store opened again on the same file reads what the first wrote', () => {
    const { dir, remove } = scratchDir()
    cleanups.push(remove)
    const file = join(dir, 'app.sqlite')
    const first = openStore(file)
    first.rememberPerson(ALICE)
    const made = first.createConversation(ALICE.id, WORDS)
    first.setState(made.id, 'planning')
    first.close()

    const second = openStore(file)
    cleanups.push(() => second.close())
    expect(second.getConversation(made.id, ALICE.id)).toMatchObject({
      state: 'planning',
      description: WORDS,
    })
  })
})

describe('problems (Decision 11)', () => {
  const PROBLEM = {
    reference: '7F3A-9C21',
    code: 'INTAKE_DAILY_LIMIT_REACHED',
    at: '2026-09-27T20:31:00.000Z',
    where: 'browser' as const,
    operation: 'startIntakeSession',
    status: 409,
    personId: ALICE.id,
    conversationId: null,
    platformRequestId: null,
  }

  it('records one, and ignores the same reference again', () => {
    const { store, file } = fresh()
    expect(store.recordProblem(PROBLEM)).toBe(true)
    expect(store.recordProblem({ ...PROBLEM, code: 'SOMETHING_ELSE' })).toBe(false)
    expect(JSON.parse(dumpAll(file)['problems'] ?? '[]')).toEqual([
      {
        reference: '7F3A-9C21',
        code: 'INTAKE_DAILY_LIMIT_REACHED',
        at: '2026-09-27T20:31:00.000Z',
        place: 'browser',
        operation: 'startIntakeSession',
        status: 409,
        person_id: ALICE.id,
        conversation_id: null,
        platform_request_id: null,
      },
    ])
  })
})

describe("a round's run and its trace (F3 Decision 10)", () => {
  const RUN = {
    id: 'run-1',
    round: 1,
    step: 'pages',
    moves: 3,
    tries: { build: 0, draft: 0, conflict: 0 },
    status: 'working' as const,
    sessionIds: ['557de0f4-59b4-435d-ad91-6c36b5fb8ae4'],
    model: 'default-chat-large',
    last: { kind: 'read', report: 'read server.js' },
    sameRefusal: null,
    detail: null,
  }
  const DETAIL = {
    line: 'Writing the page students post on.',
    needs: { kind: 'tries' as const, step: 'build' as const, servingBefore: false },
    reference: '7F3A-9C21',
    steps: {
      build: {
        note: 'A piece it depends on was missing',
        changed: null,
        exact: ['npm error Missing: marked@14.1.0 from lock file'],
      },
    },
    draft: null,
    cost: {
      conversationUsd: 0.4,
      monthLeftUsd: 9.6,
      resetsAt: '2026-10-01T07:00:00.000Z',
    },
    landed: true,
    buildId: '44444444-4444-4444-8444-444444444444',
    releaseId: null,
    instanceId: null,
    fallbackSaid: false,
    heard: 0,
    failures: [],
    tried: [],
    cannot: null,
    account: 'Students post on a weekly page.',
  }

  it('saves a run, reads it back, and a second save replaces the first', () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const conversation = store.createConversation(ALICE.id, WORDS)
    store.saveRun({ ...RUN, conversationId: conversation.id })
    expect(store.getRun('run-1')).toMatchObject({
      ...RUN,
      conversationId: conversation.id,
    })
    store.saveRun({
      ...RUN,
      conversationId: conversation.id,
      moves: 4,
      sameRefusal: { reason: 'no Dockerfile', count: 1 },
    })
    expect(store.getRun('run-1')).toMatchObject({
      moves: 4,
      sameRefusal: { reason: 'no Dockerfile', count: 1 },
    })
    expect(store.getRun('no-such-run')).toBeUndefined()
  })

  it("keeps the round's own facts beside the run, as saved (F3 Task 8)", () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const conversation = store.createConversation(ALICE.id, WORDS)
    store.saveRun({ ...RUN, conversationId: conversation.id, detail: DETAIL })
    expect(store.getRun('run-1')?.detail).toEqual(DETAIL)
  })

  it("lists a conversation's runs by round, the latest last, and finds the runs in given states", () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const one = store.createConversation(ALICE.id, WORDS)
    const two = store.createConversation(ALICE.id, WORDS)
    store.saveRun({
      ...RUN,
      id: 'run-2',
      round: 2,
      conversationId: one.id,
      status: 'paused',
    })
    store.saveRun({
      ...RUN,
      id: 'run-1',
      round: 1,
      conversationId: one.id,
      status: 'done',
    })
    store.saveRun({ ...RUN, id: 'run-3', round: 1, conversationId: two.id })
    expect(store.listRuns(one.id).map((r) => r.id)).toEqual(['run-1', 'run-2'])
    expect(store.latestRun(one.id)?.id).toBe('run-2')
    expect(store.latestRun('no-such-conversation')).toBeUndefined()
    expect(
      store
        .runsIn(['working', 'paused'])
        .map((r) => r.id)
        .sort(),
    ).toEqual(['run-2', 'run-3'])
  })

  it("lists a run's trace in order, each entry with its time, and never another run's", () => {
    const { store } = fresh()
    store.recordTrace('run-1', { kind: 'move', move: 'read', verdict: 'ran' })
    store.recordTrace('run-2', { kind: 'move', move: 'done', verdict: 'ran' })
    store.recordTrace('run-1', { kind: 'move', move: 'commit', verdict: 'ran' })
    const rows = store.listTrace('run-1')
    expect(rows.map((r) => (r.entry as { move: string }).move)).toEqual([
      'read',
      'commit',
    ])
    expect(rows[0]?.at).toMatch(/^\d{4}-\d\d-\d\dT/)
  })

  it('refuses a trace entry that carries anything shaped like a credential', () => {
    const { store, file } = fresh()
    const named = (n: string) => ({
      kind: 'platform',
      operation: 'x',
      code: null,
      named: n,
    })
    expect(() => store.recordTrace('run-1', named('mft_0123_abcd'))).toThrow(/credential/)
    expect(() => store.recordTrace('run-1', named('key sk-abc123'))).toThrow(/credential/)
    store.recordTrace('run-1', named('the task-list and a risk-free desk-top'))
    expect(dumpAll(file)['trace']).not.toMatch(/mft_|sk-a/)
  })

  it('holds no credential in any table after a run and its trace are saved', () => {
    const { store, file } = fresh()
    store.rememberPerson(ALICE)
    const conversation = store.createConversation(ALICE.id, WORDS)
    store.saveRun({ ...RUN, conversationId: conversation.id })
    store.recordTrace('run-1', {
      kind: 'platform',
      operation: 'deploy',
      code: null,
      named: 'sandbox',
    })
    const tables = dumpAll(file)
    expect(Object.keys(tables)).toEqual(expect.arrayContaining(['runs', 'trace']))
    expect(JSON.stringify(tables)).not.toMatch(/mft_|sk-/)
  })
})

describe("a round's questions (F3 Decision 10)", () => {
  it('asked, read back in order, and answered; a default is its answer until they give one', () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const conversation = store.createConversation(ALICE.id, WORDS)
    const base = { runId: 'run-1', conversationId: conversation.id }
    store.addQuestion({
      ...base,
      id: 'q-1',
      ask: 'Should a TA see everything you see?',
      fallback: "We've built it so only you can.",
      secret: null,
    })
    store.addQuestion({
      ...base,
      id: 'q-2',
      ask: 'Is a late post still a post?',
      fallback: null,
      secret: null,
    })
    expect(store.listQuestions('run-1')).toMatchObject([
      { id: 'q-1', answer: "We've built it so only you can.", answered: false },
      { id: 'q-2', answer: null, answered: false },
    ])
    store.answerQuestion('q-2', 'It closes at the deadline.')
    expect(store.getQuestion('q-2')).toMatchObject({
      id: 'q-2',
      conversationId: conversation.id,
      ask: 'Is a late post still a post?',
      fallback: null,
      secret: null,
      answer: 'It closes at the deadline.',
      answered: true,
    })
    expect(store.getQuestion('no-such-question')).toBeUndefined()
  })

  it("a secret's question keeps its name, and its answer is never a column: answered, with none", () => {
    const { store, file } = fresh()
    store.rememberPerson(ALICE)
    const conversation = store.createConversation(ALICE.id, WORDS)
    store.addQuestion({
      id: 'q-1',
      runId: 'run-1',
      conversationId: conversation.id,
      ask: 'What is the SIS key?',
      fallback: null,
      secret: 'SIS_KEY',
    })
    store.answerQuestion('q-1', null)
    expect(store.getQuestion('q-1')).toMatchObject({
      secret: 'SIS_KEY',
      answer: null,
      answered: true,
    })
    expect(Object.keys(dumpAll(file))).toContain('questions')
  })
})

describe('the migration (F3 Decision 12: building and built)', () => {
  /** What F2 left behind: its schema as it was, and no user_version (0). */
  const F2 = `
    create table persons (id text primary key, display_name text not null, seen_at text not null);
    create table conversations (
      id text primary key,
      person_id text not null references persons (id),
      project_id text,
      title text not null,
      state text not null check (state in (
        'describing', 'questions', 'naming', 'making', 'planning', 'plan-ready', 'agreed', 'paused', 'failed'
      )),
      description text not null,
      created_at text not null,
      updated_at text not null
    );
    create index conversations_by_person on conversations (person_id);
    create table messages (
      conversation_id text not null references conversations (id),
      seq integer not null, sender text not null check (sender in ('person', 'we')),
      body text not null, at text not null, primary key (conversation_id, seq)
    );
    create table plans (
      conversation_id text not null references conversations (id),
      version integer not null, body text not null, at text not null,
      primary key (conversation_id, version)
    );
    insert into persons values ('${ALICE.id}', 'Alice Instructor', '2026-09-28T00:00:00.000Z');
    insert into conversations values ('c-1', '${ALICE.id}', 'p-1', 'First build', 'agreed', 'the words',
      '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z');
    insert into messages values ('c-1', 1, 'person', '{"words":"the words"}', '2026-09-28T00:00:00.000Z');
    insert into plans values ('c-1', 1, '{"whoGetsIn":"Anyone with a CWL"}', '2026-09-28T00:00:00.000Z');
  `

  it('opens an F2 file (version 0) at version 3, its conversation, messages and plan intact, and able to build', () => {
    const { dir, remove } = scratchDir()
    cleanups.push(remove)
    const file = join(dir, 'app.sqlite')
    execOn(file, F2)
    expect(pragmaOf(file, 'user_version')).toBe(0)

    const store = openStore(file)
    cleanups.push(() => store.close())
    expect(pragmaOf(file, 'user_version')).toBe(3)
    expect(store.getConversation('c-1', ALICE.id)).toMatchObject({
      state: 'agreed',
      projectId: 'p-1',
      description: 'the words',
    })
    expect(store.listMessages('c-1')).toEqual([
      { from: 'person', body: { words: 'the words' }, at: '2026-09-28T00:00:00.000Z' },
    ])
    expect(store.latestPlan('c-1')).toEqual({
      version: 1,
      plan: { whoGetsIn: 'Anyone with a CWL' },
    })
    expect(store.setState('c-1', 'building').state).toBe('building')
    expect(store.setState('c-1', 'built').state).toBe('built')
  })

  it('opens a new file at version 3, and a state it does not know is still refused', () => {
    const { store, file } = fresh()
    expect(pragmaOf(file, 'user_version')).toBe(3)
    store.rememberPerson(ALICE)
    const made = store.createConversation(ALICE.id, WORDS)
    expect(store.setState(made.id, 'building').state).toBe('building')
    expect(() => store.setState(made.id, 'deploying' as never)).toThrow()
  })

  it('opens a version-3 file again without rebuilding it', () => {
    const { dir, remove } = scratchDir()
    cleanups.push(remove)
    const file = join(dir, 'app.sqlite')
    const first = openStore(file)
    first.rememberPerson(ALICE)
    const made = first.createConversation(ALICE.id, WORDS)
    first.setState(made.id, 'built')
    first.close()
    const second = openStore(file)
    cleanups.push(() => second.close())
    expect(second.getConversation(made.id, ALICE.id)?.state).toBe('built')
    expect(pragmaOf(file, 'user_version')).toBe(3)
  })

  it("opens sitting 2's file (version 2, runs without their detail) at version 3: the runs intact, their detail null, and questions there", () => {
    const { dir, remove } = scratchDir()
    cleanups.push(remove)
    const file = join(dir, 'app.sqlite')
    execOn(
      file,
      `${F2}
      create table runs (
        id text primary key, conversation_id text not null references conversations (id),
        round integer not null, step text not null, moves integer not null, tries text not null,
        status text not null, session_ids text not null, model text, last text, same_refusal text,
        created_at text not null, updated_at text not null
      );
      insert into runs values ('run-1', 'c-1', 1, 'pages', 2, '{}', 'working', '[]', null, null, null,
        '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z');
      pragma user_version = 2;`,
    )
    const store = openStore(file)
    cleanups.push(() => store.close())
    expect(pragmaOf(file, 'user_version')).toBe(3)
    expect(store.getRun('run-1')).toMatchObject({ id: 'run-1', moves: 2, detail: null })
    // Version 2 was already rebuilt for building and built: never rebuilt again.
    expect(store.getConversation('c-1', ALICE.id)?.state).toBe('agreed')
    expect(Object.keys(dumpAll(file))).toContain('questions')
  })
})
