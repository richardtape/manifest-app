import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openStore, type Store } from '../store/db.js'
import { scratchDir } from '../store/testing.js'
import { pieceOf, type Asked } from './piece-state.js'

/**
 * F4 DECISION 6: EACH CHANGE IS ONE `asked` MESSAGE, and a conversation's piece of work is their
 * fold, as F2 folds the intake: a reconnect or a restart rebuilds it from the store alone.
 */
const ALICE = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', displayName: 'Alice' }
const PROJECT = '22222222-2222-4222-8222-222222222222'

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

function fresh(): Store {
  const { dir, remove } = scratchDir()
  const store = openStore(join(dir, 'app.sqlite'))
  cleanups.push(() => {
    store.close()
    remove()
  })
  store.rememberPerson(ALICE)
  return store
}

const asked = (change: number, words: string, fix: Asked['fix'] = null): Asked => ({
  kind: 'asked',
  change,
  words,
  fix,
})

describe('pieceOf', () => {
  it('a first conversation, with nothing asked since, is its first piece', () => {
    const store = fresh()
    const first = store.createConversation(ALICE.id, 'A page for readings.')
    store.addMessage(first.id, 'we', { kind: 'skip' })
    expect(pieceOf(store, first.id)).toEqual({
      kind: 'first',
      change: 0,
      asked: [],
      incidentId: null,
    })
  })

  it('a change is its latest number, with every word asked for it in order; earlier changes are done', () => {
    const store = fresh()
    const c = store.createChange(
      ALICE.id,
      PROJECT,
      'Word count',
      'Also show a word count',
    )
    store.addMessage(c.id, 'person', asked(1, 'Also show a word count'))
    store.addMessage(c.id, 'person', {
      kind: 'message',
      round: 1,
      text: 'Bigger, please',
    })
    store.addMessage(c.id, 'person', asked(2, 'Now a bigger title'))
    store.addMessage(c.id, 'person', asked(2, 'And bold'))
    expect(pieceOf(store, c.id)).toEqual({
      kind: 'change',
      change: 2,
      asked: ['Now a bigger title', 'And bold'],
      incidentId: null,
    })
  })

  it("a fix carries the incident's id, and our words", () => {
    const store = fresh()
    const c = store.createChange(ALICE.id, PROJECT, 'It didn’t start', 'ours')
    store.addMessage(
      c.id,
      'we',
      asked(1, 'It didn’t start on the trying-out address', { incidentId: 'incident-1' }),
    )
    expect(pieceOf(store, c.id)).toEqual({
      kind: 'fix',
      change: 1,
      asked: ['It didn’t start on the trying-out address'],
      incidentId: 'incident-1',
    })
  })
})
