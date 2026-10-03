import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { KEY_BYTES, seal } from '../keeping/seal.js'
import { openStore, type Store } from './db.js'
import type { KeptApp, KeptMember, KeptWatch, Outgoing } from './keeping.js'
import { dumpAll, scratchDir } from './testing.js'

/**
 * F6 TASK 2: WHAT THE KEEPER KEEPS (Decision 3). Its apps and members (an archived app has no
 * token to ask with, and a restart must not forget who owns what), the one sealed credential
 * (D2), what it saw, and each email once (D3).
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
const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'

const app = (projectId: string, name: string): KeptApp => ({
  projectId,
  name,
  slug: name.toLowerCase().replace(/ /g, '-'),
  state: 'active',
  launchedAt: null,
  studentsUrl: null,
})
const owner = (person: typeof ALICE): KeptMember => ({
  userId: person.id,
  role: 'owner',
  displayName: person.displayName,
  email: person.email,
})
const watch = (projectId: string, tokenId: string, sealed = 'v1.AAAA'): KeptWatch => ({
  projectId,
  tokenId,
  sealed,
  expiresAt: '2027-10-01T00:00:00.000Z',
  mintedBy: ALICE.id,
  mintedAt: '2026-10-01T00:00:00.000Z',
})
const email = (happening: string, recipient = ALICE.email): Outgoing => ({
  key: { kind: 'trouble', happening, recipient },
  subject: 'Reading responses: a change didn’t go live',
  text: 'Nobody has lost anything.',
})

describe('apps and members, kept (Decision 3)', () => {
  it('an app is put, read back, and put again replaced', () => {
    const { store } = fresh()
    expect(store.app(P1)).toBeUndefined()
    store.putApp(app(P1, 'Reading responses'))
    expect(store.app(P1)).toEqual(app(P1, 'Reading responses'))
    const live: KeptApp = {
      ...app(P1, 'Reading responses'),
      launchedAt: '2026-10-01T17:05:13.000Z',
      studentsUrl: 'https://reading-responses.manifest.internal',
    }
    store.putApp(live)
    expect(store.app(P1)).toEqual(live)
    store.putApp({ ...live, state: 'archived' })
    expect(store.app(P1)?.state).toBe('archived')
  })

  it("an app's members are replaced whole, and appsOf is the apps whose kept members include the person", () => {
    const { store } = fresh()
    store.putApp(app(P1, 'Reading responses'))
    store.putApp(app(P2, 'Class check-ins'))
    store.putMembers(P1, [owner(ALICE), { ...owner(BOB), role: 'collaborator' }])
    store.putMembers(P2, [owner(BOB)])
    expect(store.members(P1)).toEqual([
      owner(ALICE),
      { ...owner(BOB), role: 'collaborator' },
    ])
    expect(store.appsOf(ALICE.id).map((kept) => kept.projectId)).toEqual([P1])
    expect(
      store
        .appsOf(BOB.id)
        .map((kept) => kept.projectId)
        .sort(),
    ).toEqual([P1, P2].sort())
    store.putMembers(P1, [owner(BOB)])
    expect(store.members(P1)).toEqual([owner(BOB)])
    expect(store.appsOf(ALICE.id)).toEqual([])
    expect(store.members('no-such-app')).toEqual([])
  })
})

describe('the watch token, sealed (D2, Decision 5)', () => {
  it('is put, read, listed, and replaced by a newer one', () => {
    const { store } = fresh()
    expect(store.watchOf(P1)).toBeUndefined()
    store.putWatch(watch(P1, 'token-1'))
    store.putWatch(watch(P2, 'token-2'))
    expect(store.watchOf(P1)).toEqual(watch(P1, 'token-1'))
    expect(
      store
        .watches()
        .map((kept) => kept.tokenId)
        .sort(),
    ).toEqual(['token-1', 'token-2'])
    store.putWatch(watch(P1, 'token-3'))
    expect(store.watchOf(P1)?.tokenId).toBe('token-3')
    expect(store.watches()).toHaveLength(2)
  })

  it('dropWatch with an older token id leaves the newer row; with its own id, drops it', () => {
    const { store } = fresh()
    store.putWatch(watch(P1, 'token-new'))
    store.dropWatch(P1, 'token-old')
    expect(store.watchOf(P1)?.tokenId).toBe('token-new')
    store.dropWatch(P1, 'token-new')
    expect(store.watchOf(P1)).toBeUndefined()
  })
})

describe('history: what the keeper saw (Decision 1)', () => {
  const entry = (id: string, at: string, projectId = P1) => ({
    id,
    projectId,
    at,
    type: 'project.launched',
    detail: { releaseId: 'r-1' },
  })

  it('an id is written once: true, then false and nothing written', () => {
    const { store } = fresh()
    expect(store.addHistory(entry('e-1', '2026-10-01T10:00:00.000Z'))).toBe(true)
    expect(
      store.addHistory({ ...entry('e-1', '2026-10-01T11:00:00.000Z'), type: 'changed' }),
    ).toBe(false)
    expect(store.historyOf(P1)).toEqual([entry('e-1', '2026-10-01T10:00:00.000Z')])
  })

  it("is oldest first, and an app's own", () => {
    const { store } = fresh()
    store.addHistory(entry('e-2', '2026-10-01T12:00:00.000Z'))
    store.addHistory(entry('e-1', '2026-10-01T10:00:00.000Z'))
    store.addHistory(entry('e-3', '2026-10-01T11:00:00.000Z', P2))
    expect(store.historyOf(P1).map((held) => held.id)).toEqual(['e-1', 'e-2'])
    expect(store.historyOf(P2).map((held) => held.id)).toEqual(['e-3'])
  })

  it('keeps who acted as the platform sent it (the adoption note’s question 10): an actor, a null, or none (ours)', () => {
    const { store } = fresh()
    const actor = {
      name: 'Operator One',
      asAdministrator: true,
      reason: 'Rotating a key that leaked',
      token: null,
    }
    store.addHistory({ ...entry('e-1', '2026-10-01T10:00:00.000Z'), actor })
    store.addHistory({ ...entry('e-2', '2026-10-01T11:00:00.000Z'), actor: null })
    store.addHistory(entry('e-3', '2026-10-01T12:00:00.000Z'))
    expect(store.historyOf(P1)).toEqual([
      { ...entry('e-1', '2026-10-01T10:00:00.000Z'), actor },
      { ...entry('e-2', '2026-10-01T11:00:00.000Z'), actor: null },
      entry('e-3', '2026-10-01T12:00:00.000Z'),
    ])
    expect('actor' in store.historyOf(P1)[2]!).toBe(false)
  })

  it('heldOf answers which of these ids the app holds', () => {
    const { store } = fresh()
    store.addHistory(entry('e-1', '2026-10-01T10:00:00.000Z'))
    store.addHistory(entry('e-2', '2026-10-01T11:00:00.000Z', P2))
    expect(store.heldOf(P1, ['e-1', 'e-2', 'e-9'])).toEqual(['e-1'])
    expect(store.heldOf(P1, [])).toEqual([])
  })
})

describe('emails, once each (D3)', () => {
  it('claimed once true, again false; unfinished until done, words and all', () => {
    const { store } = fresh()
    const outgoing = email(`${P1}:incident:i-1`)
    expect(store.claimEmail(outgoing)).toBe(true)
    expect(store.claimEmail({ ...outgoing, subject: 'something else' })).toBe(false)
    expect(store.emailsUnfinished()).toEqual([outgoing])
    store.emailDone(outgoing.key, 'sent', 1)
    expect(store.emailsUnfinished()).toEqual([])
    // Done is never claimed again.
    expect(store.claimEmail(outgoing)).toBe(false)
  })

  it('one happening to two recipients is two emails; a failed one is finished too', () => {
    const { store } = fresh()
    const toAlice = email(`${P1}:incident:i-1`)
    const toBob = email(`${P1}:incident:i-1`, BOB.email)
    expect(store.claimEmail(toAlice)).toBe(true)
    expect(store.claimEmail(toBob)).toBe(true)
    store.emailDone(toBob.key, 'failed', 6)
    expect(store.emailsUnfinished()).toEqual([toAlice])
  })
})

describe('conversations, for the keeper (Decisions 14 and 15)', () => {
  it('idleConversations: only conversations on an app, only those untouched since before', async () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    store.rememberPerson(BOB)
    const intake = store.createConversation(ALICE.id, 'no project yet')
    const old = store.setState(store.createConversation(ALICE.id, 'old').id, 'built', {
      projectId: P1,
    })
    const bobs = store.setState(store.createConversation(BOB.id, 'bob').id, 'paused', {
      projectId: P2,
    })
    await new Promise((resolve) => setTimeout(resolve, 5))
    const cut = new Date().toISOString()
    await new Promise((resolve) => setTimeout(resolve, 5))
    store.setState(store.createConversation(ALICE.id, 'new').id, 'built', {
      projectId: P1,
    })
    const idle = store.idleConversations(cut).map((found) => found.id)
    expect(idle.sort()).toEqual([old.id, bobs.id].sort())
    expect(idle).not.toContain(intake.id)
  })

  it("fixUnderWay: anyone's fix for the incident counts; one set aside does not", () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    store.rememberPerson(BOB)
    expect(store.fixUnderWay(P1, 'i-1')).toBe(false)
    const fix = store.createChange(BOB.id, P1, 'A change didn’t go live', 'fix it')
    store.addMessage(fix.id, 'we', { kind: 'asked', fix: { incidentId: 'i-1' } })
    expect(store.fixUnderWay(P1, 'i-1')).toBe(true)
    expect(store.fixUnderWay(P1, 'i-2')).toBe(false)
    expect(store.fixUnderWay(P2, 'i-1')).toBe(false)
    store.setState(fix.id, 'set-aside')
    expect(store.fixUnderWay(P1, 'i-1')).toBe(false)
  })
})

describe('forgetApp (Decision 11)', () => {
  it("removes every row of ours for the app, every person's; leaves another app's, and the intake that never made a project", () => {
    const { store, file } = fresh()
    store.rememberPerson(ALICE)
    store.rememberPerson(BOB)
    const seed = (personId: string, projectId: string | null, words: string) => {
      const made = store.createConversation(personId, words)
      const conversation =
        projectId === null ? made : store.setState(made.id, 'built', { projectId })
      store.addMessage(conversation.id, 'person', { words })
      store.savePlan(conversation.id, { words })
      const runId = `run-${words}`
      store.saveRun({
        id: runId,
        conversationId: conversation.id,
        round: 1,
        step: 'pages',
        moves: 0,
        tries: {},
        status: 'done',
        sessionIds: [],
        model: null,
        last: null,
        sameRefusal: null,
        detail: null,
      })
      store.recordTrace(runId, { kind: 'platform', operation: 'deploy', named: words })
      store.addQuestion({
        id: `q-${words}`,
        runId,
        conversationId: conversation.id,
        ask: 'Who?',
        fallback: null,
        secret: null,
      })
      return conversation
    }
    seed(ALICE.id, P1, 'alice-on-p1')
    seed(BOB.id, P1, 'bob-on-p1')
    const other = seed(ALICE.id, P2, 'alice-on-p2')
    const intake = seed(ALICE.id, null, 'alice-intake')
    for (const projectId of [P1, P2]) {
      store.putApp(
        app(projectId, projectId === P1 ? 'Reading responses' : 'Class check-ins'),
      )
      store.putMembers(projectId, [owner(ALICE)])
      store.putWatch(watch(projectId, `token-${projectId}`))
      store.addHistory({
        id: `e-${projectId}`,
        projectId,
        at: '2026-10-01T10:00:00.000Z',
        type: 'project.launched',
        detail: {},
      })
      store.claimEmail(email(`${projectId}:incident:i-1`))
    }

    store.forgetApp(P1)

    const tables = dumpAll(file)
    expect(tables['conversations']).not.toContain(P1)
    for (const table of ['messages', 'plans', 'runs', 'trace', 'questions'])
      expect(tables[table]).not.toMatch(/on-p1/)
    for (const table of ['apps', 'members', 'watch_tokens', 'history', 'emails'])
      expect(tables[table]).not.toContain(P1)
    // Another app's, and the intake's, all kept.
    expect(store.getConversation(other.id, ALICE.id)).toBeDefined()
    expect(store.getConversation(intake.id, ALICE.id)).toBeDefined()
    for (const words of ['alice-on-p2', 'alice-intake']) {
      expect(store.listTrace(`run-${words}`)).toHaveLength(1)
      expect(store.getQuestion(`q-${words}`)).toBeDefined()
      expect(store.getRun(`run-${words}`)).toBeDefined()
    }
    expect(store.app(P2)).toBeDefined()
    expect(store.members(P2)).toHaveLength(1)
    expect(store.watchOf(P2)).toBeDefined()
    expect(store.historyOf(P2)).toHaveLength(1)
    expect(store.emailsUnfinished()).toHaveLength(1)
  })
})

describe('visit: when they were last here (Decision 7)', () => {
  const at = (minutes: number) =>
    new Date(Date.UTC(2026, 9, 1, 9, 0) + minutes * 60_000).toISOString()

  it('a visit is page loads less than an hour apart: last here is when the previous visit ended', () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    expect(store.visit(ALICE.id, at(0))).toEqual({ lastHere: null })
    expect(store.visit(ALICE.id, at(30))).toEqual({ lastHere: null })
    expect(store.visit(ALICE.id, at(91))).toEqual({ lastHere: at(30) })
    expect(store.visit(ALICE.id, at(96))).toEqual({ lastHere: at(30) })
  })

  it('exactly an hour is still the same visit', () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    store.visit(ALICE.id, at(0))
    expect(store.visit(ALICE.id, at(60))).toEqual({ lastHere: null })
  })

  it('a person we never remembered answers null, and nothing is written', () => {
    const { store, file } = fresh()
    expect(store.visit(BOB.id, at(0))).toEqual({ lastHere: null })
    expect(dumpAll(file)['persons']).toBe('[]')
  })

  it("is each person's own", () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    store.rememberPerson(BOB)
    store.visit(ALICE.id, at(0))
    store.visit(BOB.id, at(170))
    expect(store.visit(ALICE.id, at(200))).toEqual({ lastHere: at(0) })
    expect(store.visit(BOB.id, at(200))).toEqual({ lastHere: null })
  })

  it('remembering a person again keeps their visits', () => {
    const { store } = fresh()
    store.rememberPerson(ALICE)
    store.visit(ALICE.id, at(0))
    store.rememberPerson(ALICE)
    expect(store.visit(ALICE.id, at(90))).toEqual({ lastHere: at(0) })
  })
})

describe('the person’s address (design §3)', () => {
  it('is kept, and the latest kept', () => {
    const { store } = fresh()
    expect(store.personEmail(ALICE.id)).toBeUndefined()
    store.rememberPerson(ALICE)
    expect(store.personEmail(ALICE.id)).toBe(ALICE.email)
    store.rememberPerson({ ...ALICE, email: 'alice.instructor@example.test' })
    expect(store.personEmail(ALICE.id)).toBe('alice.instructor@example.test')
  })
})

describe('no credential in the clear (D2, the Global Constraints)', () => {
  it('after a sealed watch token is put, no table holds mft_', () => {
    const { store, file } = fresh()
    const key = randomBytes(KEY_BYTES)
    store.putWatch(
      watch(P1, 'token-1', seal(key, 'mft_0123456789abcdef0123456789abcdef')),
    )
    const tables = dumpAll(file)
    expect(tables['watch_tokens']).toContain('v1.')
    expect(JSON.stringify(tables)).not.toMatch(/mft_|sk-[A-Za-z0-9]/)
  })
})
