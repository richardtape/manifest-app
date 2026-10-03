// @vitest-environment jsdom
import type { Schemas } from '@manifest/contract'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Platform } from '../platform/api.js'
import { useKeeps } from './keeps.js'

/**
 * F4a (D7): SOMEONE WHO MAY NOT BUILD KEEPS THE APPS THEY HAVE. `useKeeps` asks `listProjects` for
 * them alone, and the answer is the person's.
 */
const ME: Schemas['Me'] = {
  id: 'a0000000-0000-4000-8000-000000000001',
  puid: 'ins000001',
  displayName: 'Alex Owner',
  email: 'alex@example.test',
  role: 'member',
  mayBuild: false,
}
const PROJECT = { owner: { id: ME.id, displayName: ME.displayName } }

function platformWith(answers: (() => Promise<unknown>)[]) {
  const listProjects = vi.fn(() =>
    (answers.shift() ?? (() => new Promise(() => undefined)))(),
  )
  return { platform: { listProjects } as unknown as Platform, listProjects }
}

describe('useKeeps', () => {
  it('getMe read again with the same answer (minors m13): the page keeps what it drew while it asks again, never loading', async () => {
    const { platform, listProjects } = platformWith([
      async () => [PROJECT],
      () => new Promise(() => undefined),
    ])
    const expire = vi.fn()
    const { result, rerender } = renderHook(({ me }) => useKeeps(platform, me, expire), {
      initialProps: { me: ME },
    })
    await waitFor(() => expect(result.current.state).toBe('some'))
    // A new object with the same answer: the shell's re-read after a not-open signal.
    rerender({ me: { ...ME } })
    expect(result.current.state).toBe('some')
    await waitFor(() => expect(listProjects).toHaveBeenCalledTimes(2))
    expect(result.current.state).toBe('some')
  })

  it('another person is never shown the one before’s answer: loading until theirs', async () => {
    const { platform } = platformWith([
      async () => [PROJECT],
      () => new Promise(() => undefined),
    ])
    const expire = vi.fn()
    const { result, rerender } = renderHook(({ me }) => useKeeps(platform, me, expire), {
      initialProps: { me: ME },
    })
    await waitFor(() => expect(result.current.state).toBe('some'))
    rerender({ me: { ...ME, id: 'a0000000-0000-4000-8000-000000000002' } })
    expect(result.current.state).toBe('loading')
  })
})
