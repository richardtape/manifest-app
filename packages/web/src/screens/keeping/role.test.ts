// @vitest-environment jsdom
import type { Schemas } from '@manifest/contract'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Platform } from '../../platform/api.js'
import { useRole } from './role.js'

/**
 * F6 TASK 8: OWNER OR HELPER (Decision 6), read from `listMembers` in the person's session, for
 * the owner's buttons alone. Anyone not listed, or a read that fails, is `unknown`: the page then
 * shows no owner's button, and the platform still decides.
 */
const P = '11111111-1111-4111-8111-111111111111'
const ME = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } as Schemas['Me']
const member = (userId: string, role: 'owner' | 'collaborator') =>
  ({ userId, role }) as Schemas['Member']

const platformWith = (answer: () => Promise<Schemas['MemberList']>) =>
  ({ listMembers: answer }) as unknown as Platform

describe('useRole', () => {
  it.each([
    ['owner', 'owner'],
    ['collaborator', 'helper'],
  ] as const)('a member who is %s is %s', async (role, is) => {
    const platform = platformWith(async () => [
      member('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'owner'),
      member(ME.id, role),
    ])
    const { result } = renderHook(() => useRole(platform, P, ME))
    expect(result.current).toBe('unknown')
    await waitFor(() => expect(result.current).toBe(is))
  })

  it('someone not listed is unknown', async () => {
    let asked = 0
    const platform = platformWith(async () => {
      asked++
      return [member('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'owner')]
    })
    const { result } = renderHook(() => useRole(platform, P, ME))
    await waitFor(() => expect(asked).toBe(1))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current).toBe('unknown')
  })

  it('a refusal is unknown, and nothing is thrown', async () => {
    const platform = platformWith(() => Promise.reject(new Error('FORBIDDEN')))
    const { result } = renderHook(() => useRole(platform, P, ME))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current).toBe('unknown')
  })

  it('no project or no person yet: unknown, and nothing asked', async () => {
    let asked = 0
    const platform = platformWith(async () => {
      asked++
      return []
    })
    const { result } = renderHook(() => useRole(platform, undefined, ME))
    renderHook(() => useRole(platform, P, undefined))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect([result.current, asked]).toEqual(['unknown', 0])
  })
})
