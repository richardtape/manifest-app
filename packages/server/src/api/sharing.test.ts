import { describe, expect, it } from 'vitest'
import type { KeptMember } from '../store/keeping.js'
import { mayRead, mayStop, standingOf, type Standing } from './sharing.js'

/**
 * F6b D3, SEE ALL, ACT ON YOUR OWN: who someone is to a conversation, from F6's kept members alone
 * (Decision 1). Every row of the rule.
 */
const APP = '22222222-2222-4222-8222-222222222222'
const ALEX = 'alex'
const SAM = 'sam'
const EVE = 'eve'
const member = (userId: string, role: KeptMember['role']): KeptMember => ({
  userId,
  role,
  displayName: userId,
  email: `${userId}@example.test`,
})
const KEPT = [member(ALEX, 'owner'), member(SAM, 'collaborator')]
const SAMS = { personId: SAM, projectId: APP }

describe('standingOf (F6b Decision 1)', () => {
  it('its own person is own', () => {
    expect(standingOf(SAMS, SAM, KEPT)).toBe('own')
  })

  it('a kept owner of its app is owner', () => {
    expect(standingOf(SAMS, ALEX, KEPT)).toBe('owner')
  })

  it('a kept helper of its app is member', () => {
    const alexs = { personId: ALEX, projectId: APP }
    expect(standingOf(alexs, SAM, KEPT)).toBe('member')
  })

  it('someone not kept on its app is a stranger', () => {
    expect(standingOf(SAMS, EVE, KEPT)).toBe('stranger')
  })

  it('with no kept members, as today: its own person only', () => {
    expect(standingOf(SAMS, SAM, [])).toBe('own')
    expect(standingOf(SAMS, ALEX, [])).toBe('stranger')
  })

  it('an intake conversation (no app yet) is its own person’s alone, even to an owner of everything', () => {
    const intake = { personId: SAM, projectId: null }
    expect(standingOf(intake, SAM, KEPT)).toBe('own')
    expect(standingOf(intake, ALEX, KEPT)).toBe('stranger')
  })
})

describe('what a standing may do (D3)', () => {
  const ALL: Standing[] = ['own', 'owner', 'member', 'stranger']

  it('everyone but a stranger reads', () => {
    expect(ALL.filter(mayRead)).toEqual(['own', 'owner', 'member'])
  })

  it('its own person and an owner stop it; a helper and a stranger do not', () => {
    expect(ALL.filter(mayStop)).toEqual(['own', 'owner'])
  })
})
