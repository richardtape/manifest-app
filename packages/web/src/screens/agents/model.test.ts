import type { Schemas } from '@manifest/contract'
import { describe, expect, it } from 'vitest'
import type { KeptTokens } from '@manifest-app/server/progress'
import { machineryIn } from '../machinery.js'
import { activeOf, CAPABILITY_WORDS, capabilityWords, MINTABLE, rowsOf } from './model.js'

/**
 * F6b TASK 11: *AGENTS*' WORDS AND ROWS, pure. What a token may do in words (the eleven a person
 * may mint; an unknown one by its name, never dropped), and which tokens are listed: active only,
 * ours told from theirs by the ids our server keeps (D5), an agent's minter where our page made it.
 */
const NOW = new Date('2026-10-03T12:00:00Z')
const token = (id: string, over: Partial<Schemas['Token']> = {}): Schemas['Token'] => ({
  id,
  projectId: 'p0000000-0000-4000-8000-000000000000',
  name: `token ${id}`,
  capabilities: ['project:read'],
  rateLimit: 600,
  expiresAt: '2026-11-01T00:00:00Z',
  expired: false,
  revokedAt: null,
  lastUsedAt: null,
  createdAt: '2026-10-01T00:00:00Z',
  ...over,
})
const NONE: KeptTokens = { ours: [], agents: [] }

describe('what a token may do, in words', () => {
  it('names exactly the eleven a person may mint, in the platform’s order', () => {
    expect(MINTABLE).toEqual([
      'project:read',
      'project:write',
      'source:write',
      'secret:write',
      'output:read',
      'agent:session',
      'build:create',
      'release:create',
      'release:deploy',
      'launch:draft',
      'approval:request',
    ])
    expect(Object.keys(CAPABILITY_WORDS).sort()).toEqual([...MINTABLE].sort())
  })

  it('says each in the plan’s words', () => {
    expect(
      capabilityWords([
        'project:read',
        'source:write',
        'agent:session',
        'release:deploy',
        'approval:request',
      ]),
    ).toEqual([
      'read the app',
      'change its code',
      'use AI on your allowance',
      'put a version on the draft or trying-out address',
      "ask for a Manifest administrator's sign-off",
    ])
  })

  it('keeps an unknown one, by its name, in its place', () => {
    expect(capabilityWords(['project:read', 'quota:peek', 'build:create'])).toEqual([
      'read the app',
      'quota:peek',
      'build it',
    ])
  })

  it('says no machinery', () => {
    for (const said of Object.values(CAPABILITY_WORDS))
      expect(machineryIn(said)).toEqual([])
  })
})

describe('which tokens are listed', () => {
  it('lists only the active: never a revoked one, an expired one, or one past its expiry', () => {
    const tokens = [
      token('a'),
      token('b', { revokedAt: '2026-10-02T00:00:00Z' }),
      token('c', { expired: true, expiresAt: '2026-10-02T00:00:00Z' }),
      token('d', { expiresAt: '2026-10-03T11:59:59Z' }),
      token('e'),
    ]
    expect(rowsOf(tokens, NONE, NOW).map((row) => row.token.id)).toEqual(['a', 'e'])
    expect(activeOf(tokens[0]!, NOW)).toBe(true)
    expect(activeOf(tokens[3]!, NOW)).toBe(false)
  })

  it('tells ours by the ids our server keeps, and names what each is for', () => {
    const kept: KeptTokens = {
      ours: [
        { tokenId: 'w', purpose: 'watch', conversationId: null, title: null },
        {
          tokenId: 'c',
          purpose: 'conversation',
          conversationId: 'conv-1',
          title: 'Add a word count',
        },
        { tokenId: 'p', purpose: 'privacy', conversationId: null, title: null },
      ],
      agents: [],
    }
    const rows = rowsOf([token('c'), token('x'), token('w'), token('p')], kept, NOW)
    expect(rows.map((row) => [row.token.id, row.ours])).toEqual([
      [
        'c',
        { what: 'conversation', title: 'Add a word count', conversationId: 'conv-1' },
      ],
      ['x', null],
      ['w', { what: 'watch', title: null, conversationId: null }],
      ['p', { what: 'privacy', title: null, conversationId: null }],
    ])
  })

  it('names who made an agent our page minted, and no one for any other', () => {
    const kept: KeptTokens = {
      ours: [],
      agents: [{ tokenId: 'mine', by: { id: 'u-1', name: 'Alex Owner' } }],
    }
    const rows = rowsOf([token('mine'), token('theirs')], kept, NOW)
    expect(rows.map((row) => [row.token.id, row.ours, row.minter])).toEqual([
      ['mine', null, { id: 'u-1', name: 'Alex Owner' }],
      ['theirs', null, null],
    ])
  })
})
