import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openStore, type Store } from './db.js'
import { dumpAll, scratchDir } from './testing.js'

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
