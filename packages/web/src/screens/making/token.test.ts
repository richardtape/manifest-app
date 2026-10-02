import { describe, expect, it } from 'vitest'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { handOverToken, mintRequest } from './token.js'

/**
 * F2's HAND-OVER, F6b D5: the conversation's token is minted in the person's session and handed
 * to our server with its id beside it, so *Agents* can tell it is ours.
 */
describe('handOverToken', () => {
  it('mints the conversation’s token, and hands over its secret with its id', async () => {
    const calls: unknown[][] = []
    const platform = {
      mintToken: async (...args: unknown[]) => {
        calls.push(['mintToken', ...args])
        return { token: { id: 't-7' }, secret: 'mft_test_7' }
      },
    } as unknown as Platform
    const ours = {
      handProject: async (...args: unknown[]) =>
        void calls.push(['handProject', ...args]),
    } as unknown as Ours
    await handOverToken(
      platform,
      ours,
      { id: 'c-1', title: 'Word count' },
      'p-1',
      'changing',
    )
    expect(calls).toEqual([
      ['mintToken', 'p-1', mintRequest('Word count', 'changing'), expect.any(String)],
      ['handProject', 'c-1', { projectId: 'p-1', token: 'mft_test_7', tokenId: 't-7' }],
    ])
  })
})
