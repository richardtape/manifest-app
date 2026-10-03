import { afterEach, describe, expect, it, vi } from 'vitest'
import { NOT_OPEN_CODE, notOpen } from './not-open.js'
import { createOurs } from './ours/api.js'
import { createPlatform } from './platform/api.js'

const refusedWith = (code: string) =>
  new Response(JSON.stringify({ error: { code, message: 'x' } }), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  })

const heard = vi.fn()
notOpen.addEventListener('refused', heard)
afterEach(() => {
  heard.mockClear()
  vi.unstubAllGlobals()
})

describe('a refusal because they may not build is heard by the shell (D7, FE-39)', () => {
  it('from the platform: its fetch raises the signal, and the call still rejects', async () => {
    vi.stubGlobal('fetch', async () => refusedWith(NOT_OPEN_CODE))
    const platform = createPlatform({ origin: 'http://127.0.0.1:1', session: 's' })
    await expect(platform.startIntakeSession('key-1')).rejects.toBeTruthy()
    await vi.waitFor(() => expect(heard).toHaveBeenCalledTimes(1))
  })

  it('from the platform, a read answering it raises nothing (minors m30): a getMe that did would loop', async () => {
    vi.stubGlobal('fetch', async () => refusedWith(NOT_OPEN_CODE))
    const platform = createPlatform({ origin: 'http://127.0.0.1:1', session: 's' })
    await expect(platform.getMe()).rejects.toBeTruthy()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(heard).not.toHaveBeenCalled()
  })

  it('from our server: call() raises it too', async () => {
    vi.stubGlobal('fetch', async () => refusedWith(NOT_OPEN_CODE))
    await expect(createOurs().startConversation('words')).rejects.toBeTruthy()
    expect(heard).toHaveBeenCalledTimes(1)
  })

  it('any other refusal raises nothing', async () => {
    vi.stubGlobal('fetch', async () => refusedWith('FORBIDDEN'))
    await expect(createOurs().startConversation('words')).rejects.toBeTruthy()
    expect(heard).not.toHaveBeenCalled()
  })

  it('from the platform, any other refusal raises nothing either (minors m47)', async () => {
    vi.stubGlobal('fetch', async () => refusedWith('FORBIDDEN'))
    const platform = createPlatform({ origin: 'http://127.0.0.1:1', session: 's' })
    await expect(platform.startIntakeSession('key-1')).rejects.toBeTruthy()
    // The signal is raised from a copy of the answer, read after the call rejects: let it land.
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(heard).not.toHaveBeenCalled()
  })
})
