import type { Schemas } from '@manifest/contract'
import { describe, expect, it } from 'vitest'
import type { KeptTokens } from '@manifest-app/server/progress'
import { machineryIn } from '../machinery.js'
import {
  activeOf,
  askingOf,
  CAPABILITY_WORDS,
  capabilityWords,
  MINTABLE,
  rowsOf,
} from './model.js'

/**
 * F6b TASK 11: *AGENTS*' WORDS AND ROWS, pure. What a token may do in words (the eleven a person
 * may mint; an unknown one by its name, never dropped), and which tokens are listed: active only,
 * ours told from theirs by the ids our server keeps (D5), each one's maker as the platform names it
 * (`Token.mintedBy`, FE-49) and as the members' list names them.
 */
const NOW = new Date('2026-10-03T12:00:00Z')
const ALEX = { userId: 'a0000000-0000-4000-8000-000000000001', displayName: 'Alex Owner' }
const SAM = { userId: 'a0000000-0000-4000-8000-000000000002', displayName: 'Sam Helper' }
const MEMBERS = [ALEX, SAM]
const token = (id: string, over: Partial<Schemas['Token']> = {}): Schemas['Token'] => ({
  id,
  projectId: 'p0000000-0000-4000-8000-000000000000',
  name: `token ${id}`,
  // Made by the reader unless a test says otherwise (minors m127: each maker true to its story).
  mintedBy: ALEX.userId,
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
    expect(rowsOf(tokens, NONE, MEMBERS, NOW).map((row) => row.token.id)).toEqual([
      'a',
      'e',
    ])
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
    const rows = rowsOf(
      [token('c'), token('x'), token('w'), token('p')],
      kept,
      MEMBERS,
      NOW,
    )
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

  it('names who made each, ours and theirs, as the platform says (mintedBy) and the members’ list names them', () => {
    const kept: KeptTokens = {
      ours: [{ tokenId: 'w', purpose: 'watch', conversationId: null, title: null }],
      agents: [],
    }
    const rows = rowsOf(
      [
        token('mine'),
        token('sams', { mintedBy: SAM.userId }),
        token('w', { mintedBy: SAM.userId }),
      ],
      kept,
      MEMBERS,
      NOW,
    )
    expect(rows.map((row) => [row.token.id, row.minter])).toEqual([
      ['mine', { id: ALEX.userId, name: 'Alex Owner' }],
      ['sams', { id: SAM.userId, name: 'Sam Helper' }],
      ['w', { id: SAM.userId, name: 'Sam Helper' }],
    ])
  })

  it('a maker the members’ list does not name: by their id alone, never someone else’s name', () => {
    const gone = 'a0000000-0000-4000-8000-000000000009'
    const [row] = rowsOf([token('x', { mintedBy: gone })], NONE, MEMBERS, NOW)
    expect(row?.minter).toEqual({ id: gone, name: null })
  })

  it('a member’s word is never a maker: an id someone handed our server as theirs still names its real maker (minors m122)', () => {
    // The shape our server answered before FE-49: a claimant's id kept beside an outside token.
    const kept = {
      ours: [],
      agents: [{ tokenId: 'x', by: { id: ALEX.userId, name: 'Alex Owner' } }],
    } as unknown as KeptTokens
    const [row] = rowsOf([token('x', { mintedBy: SAM.userId })], kept, MEMBERS, NOW)
    expect(row?.minter).toEqual({ id: SAM.userId, name: 'Sam Helper' })
  })
})

describe('which questions are asked (F6b Task 12; Decision 16; (S1: M4))', () => {
  const asked = (
    id: string,
    tokenId: string,
    over: Partial<Schemas['PendingAction']> = {},
  ): Schemas['PendingAction'] => ({
    id,
    projectId: 'p',
    tokenId,
    action: 'members:manage',
    state: 'pending',
    method: 'POST',
    path: '/v1/projects/p/members',
    bodySha256: 'x',
    summary: 'Add a member',
    expiresAt: '2026-10-04T00:00:00Z',
    createdAt: '2026-10-03T00:00:00Z',
    resolvedAt: null,
    waitingSeconds: 0,
    reason: null,
    consumedAt: null,
    ...over,
  })
  const tokens = [
    token('live', { name: 'Claude Code' }),
    token('gone', { revokedAt: '2026-10-03T00:00:00Z' }),
    token('lapsed', { expired: true }),
  ]

  it('still waiting, not past its day, and its agent still able to act: with its name', () => {
    const actions = [
      asked('a', 'live'),
      asked('b', 'live', { state: 'confirmed' }),
      asked('c', 'live', { state: 'rejected' }),
      asked('d', 'live', { state: 'expired' }),
      asked('e', 'live', { expiresAt: '2026-10-03T11:59:59Z' }),
      asked('f', 'gone'),
      asked('g', 'lapsed'),
      asked('h', 'unknown-token'),
    ]
    expect(
      askingOf(actions, tokens, MEMBERS, ALEX.userId, NOW).map(
        ({ action, tokenName }) => [action.id, tokenName],
      ),
    ).toEqual([['a', 'Claude Code']])
  })

  it('whose agent (m129, Rich’s words of 2026-10-03): the reader’s own, another member’s by name, or a maker the list does not name', () => {
    const made = [
      token('mine', { name: 'Claude Code' }),
      token('sams', { name: 'Helper bot', mintedBy: SAM.userId }),
      token('elsewhere', {
        name: 'Console',
        mintedBy: 'a0000000-0000-4000-8000-000000000009',
      }),
    ]
    const actions = [asked('a', 'mine'), asked('b', 'sams'), asked('c', 'elsewhere')]
    expect(
      askingOf(actions, made, MEMBERS, ALEX.userId, NOW).map(({ action, whose }) => [
        action.id,
        whose,
      ]),
    ).toEqual([
      ['a', 'yours'],
      ['b', { name: 'Sam Helper' }],
      ['c', { name: null }],
    ])
    // Sam reading it: Alex's agent is Alex's, and Sam's own is Sam's.
    expect(
      askingOf(actions, made, MEMBERS, SAM.userId, NOW).map(({ whose }) => whose),
    ).toEqual([{ name: 'Alex Owner' }, 'yours', { name: null }])
  })
})
