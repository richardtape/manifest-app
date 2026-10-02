import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openStore, type Store } from './db.js'
import type { Minted } from './minted.js'
import { dumpAll, execOn, scratchDir } from './testing.js'

/**
 * F6b TASK 3 (D5): THE IDS OF THE TOKENS OUR PAGE MINTS, never a secret. *Agents* tells ours from
 * theirs by them, and says who made an agent's (FE-49: the platform's `Token` names no minter).
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
const T1 = '0f000000-0000-4000-8000-000000000001'
const T2 = '0f000000-0000-4000-8000-000000000002'
const T3 = '0f000000-0000-4000-8000-000000000003'

function people(store: Store) {
  store.rememberPerson(ALICE)
  store.rememberPerson(BOB)
  const alices = store.createChange(ALICE.id, P1, 'Word count', 'Also a word count.')
  return { alices }
}

const conversationToken = (conversationId: string, tokenId = T1): Minted => ({
  tokenId,
  projectId: P1,
  personId: ALICE.id,
  purpose: 'conversation',
  conversationId,
  name: null,
  expiresAt: null,
  mintedAt: '2026-10-02T21:00:00.000Z',
})
const agentToken = (tokenId: string, personId: string, projectId = P1): Minted => ({
  tokenId,
  projectId,
  personId,
  purpose: 'agent',
  conversationId: null,
  name: 'Claude Code',
  expiresAt: '2026-11-01T21:00:00.000Z',
  mintedAt: '2026-10-02T21:00:00.000Z',
})

describe('the token ids kept (F6b D5)', () => {
  it('keeps a conversation’s token and an agent’s, and lists them by app', () => {
    const { store } = fresh()
    const { alices } = people(store)
    store.keepMinted(conversationToken(alices.id))
    store.keepMinted(agentToken(T2, BOB.id))
    store.keepMinted(agentToken(T3, ALICE.id, P2))
    expect(store.mintedOn(P1)).toEqual([
      conversationToken(alices.id),
      agentToken(T2, BOB.id),
    ])
    expect(store.mintedOn(P2)).toEqual([agentToken(T3, ALICE.id, P2)])
  })

  it('is idempotent on the token id: a second keep of the same id is one row, the first', () => {
    const { store } = fresh()
    const { alices } = people(store)
    store.keepMinted(conversationToken(alices.id))
    store.keepMinted({
      ...conversationToken(alices.id),
      mintedAt: '2026-10-03T00:00:00.000Z',
    })
    expect(store.mintedOn(P1)).toEqual([conversationToken(alices.id)])
  })

  it('forgets one person’s on one app, and nobody else’s', () => {
    const { store } = fresh()
    const { alices } = people(store)
    store.keepMinted(conversationToken(alices.id))
    store.keepMinted(agentToken(T2, BOB.id))
    store.keepMinted(agentToken(T3, BOB.id, P2))
    store.forgetMintedOf(P1, BOB.id)
    expect(store.mintedOn(P1)).toEqual([conversationToken(alices.id)])
    expect(store.mintedOn(P2)).toEqual([agentToken(T3, BOB.id, P2)])
  })

  it('forgetting the app (F6 Decision 11) forgets its token ids too', () => {
    const { store } = fresh()
    const { alices } = people(store)
    store.keepMinted(conversationToken(alices.id))
    store.keepMinted(agentToken(T2, BOB.id))
    store.keepMinted(agentToken(T3, BOB.id, P2))
    store.forgetApp(P1)
    expect(store.mintedOn(P1)).toEqual([])
    expect(store.mintedOn(P2)).toHaveLength(1)
  })
})

describe('never a secret (Review Focus 4)', () => {
  it('no table holds mft_ after every kind is kept', () => {
    const { store, file } = fresh()
    const { alices } = people(store)
    store.keepMinted(conversationToken(alices.id))
    store.keepMinted(agentToken(T2, BOB.id))
    expect(dumpAll(file)['minted']).toContain(T2)
    expect(JSON.stringify(dumpAll(file))).not.toMatch(/mft_|sk-[A-Za-z0-9]/)
  })

  it('the no-credential scan reads `minted`: a secret written behind the store’s back is found', () => {
    const { store, file } = fresh()
    people(store)
    execOn(
      file,
      `insert into minted values ('${T2}', '${P1}', '${BOB.id}', 'agent', null,
        'mft_0123456789abcdef_planted', '2026-11-01T00:00:00.000Z', '2026-10-02T00:00:00.000Z')`,
    )
    expect(JSON.stringify(dumpAll(file))).toMatch(/mft_0123456789abcdef/)
  })

  it('the store refuses a row shaped like a credential, as the trace does', () => {
    const { store, file } = fresh()
    people(store)
    expect(() =>
      store.keepMinted({ ...agentToken(T2, BOB.id), name: 'mft_0123_abcd' }),
    ).toThrow(/credential/)
    expect(dumpAll(file)['minted']).toBe('[]')
  })
})
