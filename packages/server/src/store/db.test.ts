import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openStore, type Store } from './db.js'
import { VERSION } from './migrate.js'
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
  email: 'alice@example.test',
}
const BOB = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  displayName: 'Bob Instructor',
  email: 'bob@example.test',
}
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

  it('opens an F2 file (version 0) at the latest version, its conversation, messages and plan intact, and able to build', () => {
    const { dir, remove } = scratchDir()
    cleanups.push(remove)
    const file = join(dir, 'app.sqlite')
    execOn(file, F2)
    expect(pragmaOf(file, 'user_version')).toBe(0)

    const store = openStore(file)
    cleanups.push(() => store.close())
    expect(pragmaOf(file, 'user_version')).toBe(VERSION)
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

  it('opens a new file at the latest version, and a state it does not know is still refused', () => {
    const { store, file } = fresh()
    expect(pragmaOf(file, 'user_version')).toBe(VERSION)
    store.rememberPerson(ALICE)
    const made = store.createConversation(ALICE.id, WORDS)
    expect(store.setState(made.id, 'building').state).toBe('building')
    expect(() => store.setState(made.id, 'deploying' as never)).toThrow()
  })

  it('opens a file at the latest version again without rebuilding it', () => {
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
    expect(pragmaOf(file, 'user_version')).toBe(VERSION)
  })

  it("opens sitting 2's file (version 2, runs without their detail) at the latest version: the runs intact, their detail null, and questions there", () => {
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
    expect(pragmaOf(file, 'user_version')).toBe(VERSION)
    expect(store.getRun('run-1')).toMatchObject({ id: 'run-1', moves: 2, detail: null })
    expect(store.getConversation('c-1', ALICE.id)?.state).toBe('agreed')
    expect(Object.keys(dumpAll(file))).toContain('questions')
  })
})

describe('the migration (F4 Decision 14: the line)', () => {
  /** What F3 left behind: version 3, its conversations unable to wait or be set aside. */
  const F3 = `
    create table persons (id text primary key, display_name text not null, seen_at text not null);
    create table conversations (
      id text primary key,
      person_id text not null references persons (id),
      project_id text,
      title text not null,
      state text not null check (state in (
        'describing', 'questions', 'naming', 'making', 'planning', 'plan-ready', 'agreed', 'building', 'built',
        'paused', 'failed'
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
    create table runs (
      id text primary key, conversation_id text not null references conversations (id),
      round integer not null, step text not null, moves integer not null, tries text not null,
      status text not null, session_ids text not null, model text, last text, same_refusal text,
      created_at text not null, updated_at text not null, detail text
    );
    create table questions (
      id text primary key, run_id text not null,
      conversation_id text not null references conversations (id),
      ask text not null, fallback text, secret text, answer text, answered_at text, asked_at text not null
    );
    insert into persons values ('${ALICE.id}', 'Alice Instructor', '2026-09-28T00:00:00.000Z');
    insert into conversations values ('c-1', '${ALICE.id}', 'p-1', 'First build', 'built', 'the words',
      '2026-09-28T00:00:00.000Z', '2026-09-28T01:00:00.000Z');
    insert into messages values ('c-1', 1, 'person', '{"words":"the words"}', '2026-09-28T00:00:00.000Z');
    insert into plans values ('c-1', 1, '{"whoGetsIn":"Anyone with a CWL"}', '2026-09-28T00:00:00.000Z');
    insert into runs values ('run-1', 'c-1', 1, 'answers', 0, '{}', 'done', '[]', null, null, null,
      '2026-09-28T00:00:00.000Z', '2026-09-28T01:00:00.000Z', '{"instanceId":"i-1"}');
    insert into questions values ('q-1', 'run-1', 'c-1', 'Who is my class?', null, null, 'CPSC 110',
      '2026-09-28T00:30:00.000Z', '2026-09-28T00:20:00.000Z');
    pragma user_version = 3;
  `

  it("opens F3's file (version 3) at the latest version: every row intact, and a conversation can wait and be set aside", () => {
    const { dir, remove } = scratchDir()
    cleanups.push(remove)
    const file = join(dir, 'app.sqlite')
    execOn(file, F3)
    const before = dumpAll(file)

    const store = openStore(file)
    cleanups.push(() => store.close())
    expect(pragmaOf(file, 'user_version')).toBe(VERSION)
    expect(store.getConversation('c-1', ALICE.id)).toEqual({
      id: 'c-1',
      personId: ALICE.id,
      projectId: 'p-1',
      title: 'First build',
      state: 'built',
      description: 'the words',
      createdAt: '2026-09-28T00:00:00.000Z',
      updatedAt: '2026-09-28T01:00:00.000Z',
    })
    const after = dumpAll(file)
    for (const table of ['messages', 'plans', 'runs', 'questions'])
      expect(after[table]).toBe(before[table])
    // Version 5 (F6) adds three columns to persons, each null on a row it did not write.
    expect(JSON.parse(after['persons']!)).toEqual([
      {
        ...JSON.parse(before['persons']!)[0],
        email: null,
        here_at: null,
        last_here: null,
      },
    ])
    expect(JSON.parse(after['conversations']!)).toEqual([
      { ...JSON.parse(before['conversations']!)[0], waiting_since: null },
    ])
    expect(store.setState('c-1', 'waiting').state).toBe('waiting')
    expect(store.setState('c-1', 'set-aside').state).toBe('set-aside')
    expect(() => store.setState('c-1', 'queued' as never)).toThrow()
  })
})

describe('conversations on an app (F4 Task 6)', () => {
  const PROJECT = '22222222-2222-4222-8222-222222222222'
  const OTHER = '99999999-9999-4999-8999-999999999999'

  it('a change is made on its project, waiting, with its title and their words', () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const made = store.createChange(ALICE.id, PROJECT, 'Also show a word count', WORDS)
    expect(made).toMatchObject({
      personId: ALICE.id,
      projectId: PROJECT,
      title: 'Also show a word count',
      state: 'waiting',
      description: WORDS,
    })
    expect(store.getConversation(made.id, ALICE.id)).toEqual(made)
  })

  it("lists the person's conversations on one app, newest first, and never another's or another app's", async () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    store.rememberPerson(BOB)
    const first = store.createConversation(ALICE.id, WORDS)
    store.setState(first.id, 'built', { projectId: PROJECT })
    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = store.createChange(ALICE.id, PROJECT, 'Word count', WORDS)
    store.createChange(BOB.id, PROJECT, "Bob's", WORDS)
    store.createChange(ALICE.id, OTHER, 'Elsewhere', WORDS)
    expect(store.listConversationsOn(PROJECT, ALICE.id).map((c) => c.id)).toEqual([
      second.id,
      first.id,
    ])
    expect(
      store
        .conversationsOn(PROJECT)
        .map((c) => c.title)
        .sort(),
    ).toEqual(["Bob's", 'First build', 'Word count'])
  })

  it('the line keeps each wait by its time, oldest first, whoever waits; leaving it clears the time', () => {
    const { store, file } = fresh()
    store.rememberPerson(ALICE)
    store.rememberPerson(BOB)
    const a = store.createChange(ALICE.id, PROJECT, 'A', WORDS)
    const b = store.createChange(BOB.id, PROJECT, 'B', WORDS)
    const c = store.createChange(ALICE.id, PROJECT, 'C', WORDS)
    store.setState(b.id, 'waiting', { waitingSince: '2026-09-28T10:00:00.000Z' })
    store.setState(c.id, 'waiting', { waitingSince: '2026-09-28T10:00:00.001Z' })
    store.setState(a.id, 'waiting', { waitingSince: '2026-09-28T10:00:00.002Z' })
    expect(store.waitingOn(PROJECT).map((w) => w.title)).toEqual(['B', 'C', 'A'])
    // Waiting again without a time keeps its place.
    store.setState(b.id, 'waiting')
    expect(store.waitingOn(PROJECT).map((w) => w.title)).toEqual(['B', 'C', 'A'])
    // Leaving the line clears its time: a later wait is at the back.
    store.setState(b.id, 'planning')
    expect(store.waitingOn(PROJECT).map((w) => w.title)).toEqual(['C', 'A'])
    store.setState(b.id, 'waiting', { waitingSince: '2026-09-28T10:00:01.000Z' })
    expect(store.waitingOn(PROJECT).map((w) => w.title)).toEqual(['C', 'A', 'B'])
    expect(store.waitingOn(OTHER)).toEqual([])
    expect(store.waitingProjects()).toEqual([PROJECT])
    const dumped = JSON.parse(dumpAll(file)['conversations']!) as {
      title: string
      waiting_since: string | null
    }[]
    expect(dumped.find((row) => row.title === 'B')?.waiting_since).toBe(
      '2026-09-28T10:00:01.000Z',
    )
  })

  it("finds the conversation whose round deployed an instance, from its run's detail; never another person's", () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    store.rememberPerson(BOB)
    const mine = store.createChange(ALICE.id, PROJECT, 'Word count', WORDS)
    const bobs = store.createChange(BOB.id, PROJECT, "Bob's", WORDS)
    const run = (id: string, conversationId: string, instanceId: string) =>
      store.saveRun({
        id,
        conversationId,
        round: 1,
        step: 'answers',
        moves: 0,
        tries: {},
        status: 'done',
        sessionIds: [],
        model: null,
        last: null,
        sameRefusal: null,
        detail: { instanceId } as never,
      })
    run('run-a', mine.id, 'instance-a')
    run('run-b', bobs.id, 'instance-b')
    expect(store.conversationForInstance(PROJECT, 'instance-a', ALICE.id)).toBe(mine.id)
    expect(store.conversationForInstance(PROJECT, 'instance-b', ALICE.id)).toBeUndefined()
    expect(store.conversationForInstance(OTHER, 'instance-a', ALICE.id)).toBeUndefined()
    expect(store.conversationForInstance(PROJECT, 'nothing', ALICE.id)).toBeUndefined()
  })

  it("finds the fix conversation for an incident: the latest, never one set aside, never another person's (F4 review I2)", () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    store.rememberPerson(BOB)
    const fix = (personId: string, incidentId: string) => {
      const made = store.createChange(personId, PROJECT, 'It didn’t start', 'ours')
      store.addMessage(made.id, 'we', {
        kind: 'asked',
        change: 1,
        words: 'ours',
        fix: { incidentId },
      })
      return made
    }
    const older = fix(ALICE.id, 'incident-a')
    const newer = fix(ALICE.id, 'incident-a')
    const asideFix = fix(ALICE.id, 'incident-b')
    store.setState(asideFix.id, 'set-aside')
    fix(BOB.id, 'incident-c')
    const theirs = store.createChange(ALICE.id, PROJECT, 'Word count', WORDS)
    store.addMessage(theirs.id, 'person', {
      kind: 'asked',
      change: 1,
      words: WORDS,
      fix: null,
    })
    expect(store.fixFor(PROJECT, 'incident-a', ALICE.id)).toBe(newer.id)
    expect(older.id).not.toBe(newer.id)
    expect(store.fixFor(PROJECT, 'incident-b', ALICE.id)).toBeUndefined()
    expect(store.fixFor(PROJECT, 'incident-c', ALICE.id)).toBeUndefined()
    expect(store.fixFor(OTHER, 'incident-a', ALICE.id)).toBeUndefined()
    expect(store.fixFor(PROJECT, 'nothing', ALICE.id)).toBeUndefined()
  })

  it("finds the fix conversation for an outage by its start: the latest, never one set aside, never another person's (F6 Task 10, S4)", () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    store.rememberPerson(BOB)
    const A = '2026-10-01T17:03:00.000Z'
    const B = '2026-10-02T09:00:00.000Z'
    const C = '2026-10-03T09:00:00.000Z'
    const later = (from: string) => new Date(Date.parse(from) + 240_000).toISOString()
    const fix = (personId: string, from: string) => {
      const made = store.createChange(personId, PROJECT, 'It fell', 'ours')
      store.addMessage(made.id, 'we', {
        kind: 'asked',
        change: 1,
        words: 'ours',
        fix: { outage: { from, to: later(from) } },
      })
      return made
    }
    const older = fix(ALICE.id, A)
    const newer = fix(ALICE.id, A)
    store.setState(fix(ALICE.id, B).id, 'set-aside')
    fix(BOB.id, C)
    // An incident's fix whose id happens to be the moment is not an outage's.
    const incident = store.createChange(ALICE.id, PROJECT, 'It didn’t start', 'ours')
    store.addMessage(incident.id, 'we', {
      kind: 'asked',
      change: 1,
      words: 'ours',
      fix: { incidentId: C },
    })
    expect(store.fixForOutage(PROJECT, A, ALICE.id)).toBe(newer.id)
    expect(older.id).not.toBe(newer.id)
    expect(store.fixForOutage(PROJECT, B, ALICE.id)).toBeUndefined()
    expect(store.fixForOutage(PROJECT, C, ALICE.id)).toBeUndefined()
    expect(store.fixForOutage(OTHER, A, ALICE.id)).toBeUndefined()
    expect(store.fixForOutage(PROJECT, later(A), ALICE.id)).toBeUndefined()
  })
})

describe('the plan agreed on an app (F5 Task 9, the hand-over)', () => {
  const PROJECT = '22222222-2222-4222-8222-222222222222'
  const OTHER = '99999999-9999-4999-8999-999999999999'
  const plan = (tag: string) => ({
    studentsSee: `${tag}: what students see`,
    youSee: `${tag}: what you see`,
    itKeeps: `${tag}: what it keeps`,
    whoGetsIn: `${tag}: who gets in`,
    ai: `${tag}: its AI`,
    assumed: [],
    onlyYouKnow: [],
    changed: [],
  })
  const agree = (store: Store, conversationId: string, version: number) =>
    store.addMessage(conversationId, 'person', {
      kind: 'agreed',
      version,
      answers: {},
      commitSha: 'abc123',
      sent: true,
    })
  const onApp = (store: Store, personId: string, projectId = PROJECT) => {
    const made = store.createConversation(personId, WORDS)
    return store.setState(made.id, 'built', { projectId })
  }

  it('is the version their Yes named, not the newest one written', () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const built = onApp(store, ALICE.id)
    store.savePlan(built.id, plan('first'))
    agree(store, built.id, 1)
    store.savePlan(built.id, plan('written after'))
    expect(store.agreedPlanOn(PROJECT, ALICE.id)).toEqual(plan('first'))
  })

  it('a change agreed later is the latest', async () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const built = onApp(store, ALICE.id)
    store.savePlan(built.id, plan('first'))
    agree(store, built.id, 1)
    await new Promise((resolve) => setTimeout(resolve, 5))
    const change = store.createChange(ALICE.id, PROJECT, 'Word count', WORDS)
    store.savePlan(change.id, plan('changed'))
    store.savePlan(change.id, plan('changed, corrected'))
    agree(store, change.id, 2)
    expect(store.agreedPlanOn(PROJECT, ALICE.id)).toEqual(plan('changed, corrected'))
  })

  it('the latest by when it was agreed, whichever conversation: a first build agreed again after a change', async () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const built = onApp(store, ALICE.id)
    store.savePlan(built.id, plan('first'))
    agree(store, built.id, 1)
    await new Promise((resolve) => setTimeout(resolve, 5))
    const change = store.createChange(ALICE.id, PROJECT, 'Word count', WORDS)
    store.savePlan(change.id, plan('changed'))
    agree(store, change.id, 1)
    await new Promise((resolve) => setTimeout(resolve, 5))
    store.savePlan(built.id, plan('first, again'))
    agree(store, built.id, 2)
    expect(store.agreedPlanOn(PROJECT, ALICE.id)).toEqual(plan('first, again'))
  })

  it('agreed by a moment: the agreement made at or before it, for the version live (the final review’s I2)', async () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    const built = onApp(store, ALICE.id)
    store.savePlan(built.id, plan('launched'))
    agree(store, built.id, 1)
    const first = store.listMessages(built.id).at(-1)!.at
    await new Promise((resolve) => setTimeout(resolve, 5))
    const change = store.createChange(ALICE.id, PROJECT, 'Word count', WORDS)
    store.savePlan(change.id, plan('on the draft only'))
    agree(store, change.id, 1)
    const second = store.listMessages(change.id).at(-1)!.at
    expect(store.agreedPlanOn(PROJECT, ALICE.id, first)).toEqual(plan('launched'))
    expect(store.agreedPlanOn(PROJECT, ALICE.id, second)).toEqual(
      plan('on the draft only'),
    )
    const before = new Date(Date.parse(first) - 1).toISOString()
    expect(store.agreedPlanOn(PROJECT, ALICE.id, before)).toBeUndefined()
  })

  it('nothing agreed, another person’s, another app’s: none', () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    store.rememberPerson(BOB)
    const written = onApp(store, ALICE.id)
    store.savePlan(written.id, plan('only written'))
    expect(store.agreedPlanOn(PROJECT, ALICE.id)).toBeUndefined()
    const bobs = onApp(store, BOB.id)
    store.savePlan(bobs.id, plan('bob'))
    agree(store, bobs.id, 1)
    expect(store.agreedPlanOn(PROJECT, ALICE.id)).toBeUndefined()
    const elsewhere = onApp(store, ALICE.id, OTHER)
    store.savePlan(elsewhere.id, plan('elsewhere'))
    agree(store, elsewhere.id, 1)
    expect(store.agreedPlanOn(PROJECT, ALICE.id)).toBeUndefined()
    expect(store.agreedPlanOn(OTHER, ALICE.id)).toEqual(plan('elsewhere'))
  })
})

describe('a change that answers a refusal (F5 Task 8, the final review’s I1)', () => {
  const PROJECT = '22222222-2222-4222-8222-222222222222'
  const OTHER = '99999999-9999-4999-8999-999999999999'
  const talked = (
    store: Store,
    personId: string,
    approvalId: string,
    projectId = PROJECT,
  ) => {
    const made = store.createChange(
      personId,
      projectId,
      'A Manifest administrator…',
      WORDS,
    )
    store.addMessage(made.id, 'person', {
      kind: 'asked',
      change: 1,
      words: WORDS,
      fix: null,
      refusal: { approvalId },
    })
    return made
  }

  it('is found by the decision it answers: the newest, never one set aside, another person’s or another app’s', async () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    store.rememberPerson(BOB)
    const older = talked(store, ALICE.id, 'approval-a')
    await new Promise((resolve) => setTimeout(resolve, 5))
    const newer = talked(store, ALICE.id, 'approval-a')
    expect(store.changeForRefusal(PROJECT, 'approval-a', ALICE.id)).toBe(newer.id)
    store.setState(newer.id, 'set-aside')
    expect(store.changeForRefusal(PROJECT, 'approval-a', ALICE.id)).toBe(older.id)
    talked(store, BOB.id, 'approval-b')
    talked(store, ALICE.id, 'approval-c', OTHER)
    expect(store.changeForRefusal(PROJECT, 'approval-b', ALICE.id)).toBeUndefined()
    expect(store.changeForRefusal(PROJECT, 'approval-c', ALICE.id)).toBeUndefined()
    expect(store.changeForRefusal(PROJECT, 'approval-z', ALICE.id)).toBeUndefined()
  })
})

describe('the migration (F6 Decision 3: what the keeper keeps)', () => {
  /** What F4 and F5 left behind: version 4, a row in every table, persons without an address. */
  const F4 = `
    create table persons (id text primary key, display_name text not null, seen_at text not null);
    create table conversations (
      id text primary key,
      person_id text not null references persons (id),
      project_id text,
      title text not null,
      state text not null check (state in (
        'describing', 'questions', 'naming', 'making', 'planning', 'plan-ready', 'agreed', 'building', 'built',
        'paused', 'failed', 'waiting', 'set-aside'
      )),
      description text not null,
      created_at text not null,
      updated_at text not null,
      waiting_since text
    );
    create index conversations_by_person on conversations (person_id);
    create index conversations_by_project on conversations (project_id, state);
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
    create table problems (
      reference text primary key, code text not null, at text not null,
      place text not null check (place in ('server', 'browser')),
      operation text, status integer, person_id text, conversation_id text, platform_request_id text
    );
    create table runs (
      id text primary key, conversation_id text not null references conversations (id),
      round integer not null, step text not null, moves integer not null, tries text not null,
      status text not null, session_ids text not null, model text, last text, same_refusal text,
      created_at text not null, updated_at text not null, detail text
    );
    create table trace (
      run_id text not null, seq integer not null, at text not null, entry text not null,
      primary key (run_id, seq)
    );
    create table questions (
      id text primary key, run_id text not null,
      conversation_id text not null references conversations (id),
      ask text not null, fallback text, secret text, answer text, answered_at text, asked_at text not null
    );
    insert into persons values ('${ALICE.id}', 'Alice Instructor', '2026-09-30T00:00:00.000Z');
    insert into conversations values ('c-1', '${ALICE.id}', 'p-1', 'First build', 'built', 'the words',
      '2026-09-30T00:00:00.000Z', '2026-09-30T01:00:00.000Z', null);
    insert into messages values ('c-1', 1, 'person', '{"words":"the words"}', '2026-09-30T00:00:00.000Z');
    insert into plans values ('c-1', 1, '{"whoGetsIn":"Anyone with a CWL"}', '2026-09-30T00:00:00.000Z');
    insert into problems values ('ABCD-1234', 'INTERNAL', '2026-09-30T00:00:00.000Z', 'server', 'deploy', 500,
      '${ALICE.id}', 'c-1', null);
    insert into runs values ('run-1', 'c-1', 1, 'answers', 0, '{}', 'done', '[]', null, null, null,
      '2026-09-30T00:00:00.000Z', '2026-09-30T01:00:00.000Z', '{"instanceId":"i-1"}');
    insert into trace values ('run-1', 1, '2026-09-30T00:10:00.000Z', '{"kind":"platform"}');
    insert into questions values ('q-1', 'run-1', 'c-1', 'Who is my class?', null, null, 'CPSC 110',
      '2026-09-30T00:30:00.000Z', '2026-09-30T00:20:00.000Z');
    pragma user_version = 4;
  `
  const NEW_TABLES = ['apps', 'members', 'watch_tokens', 'history', 'emails']

  function f4File(): string {
    const { dir, remove } = scratchDir()
    cleanups.push(remove)
    const file = join(dir, 'app.sqlite')
    execOn(file, F4)
    return file
  }

  it('is version 5', () => {
    expect(VERSION).toBe(5)
  })

  it("opens F4's file (version 4) at version 5: every row kept, persons with three null columns, and the five new tables", () => {
    const file = f4File()
    const before = dumpAll(file)
    const store = openStore(file)
    cleanups.push(() => store.close())
    expect(pragmaOf(file, 'user_version')).toBe(5)
    const after = dumpAll(file)
    for (const table of [
      'conversations',
      'messages',
      'plans',
      'problems',
      'runs',
      'trace',
      'questions',
    ])
      expect(after[table]).toBe(before[table])
    expect(JSON.parse(after['persons']!)).toEqual([
      {
        ...JSON.parse(before['persons']!)[0],
        email: null,
        here_at: null,
        last_here: null,
      },
    ])
    for (const table of NEW_TABLES) expect(after[table]).toBe('[]')
    // A person remembered again gains their address; one not yet remembered has none.
    expect(store.personEmail(ALICE.id)).toBeUndefined()
    store.rememberPerson(ALICE)
    expect(store.personEmail(ALICE.id)).toBe(ALICE.email)
  })

  it('a new file is version 5, with the five new tables and persons holding an address', () => {
    const { store, file } = fresh()
    expect(pragmaOf(file, 'user_version')).toBe(5)
    expect(Object.keys(dumpAll(file))).toEqual(expect.arrayContaining(NEW_TABLES))
    store.rememberPerson(ALICE)
    expect(JSON.parse(dumpAll(file)['persons']!)).toEqual([
      expect.objectContaining({
        id: ALICE.id,
        email: ALICE.email,
        here_at: null,
        last_here: null,
      }),
    ])
  })

  it('opening the migrated file again changes nothing', () => {
    const file = f4File()
    openStore(file).close()
    const once = dumpAll(file)
    openStore(file).close()
    expect(dumpAll(file)).toEqual(once)
    expect(pragmaOf(file, 'user_version')).toBe(5)
  })
})
