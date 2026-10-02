import { describe, expect, it } from 'vitest'
import { probeAddress } from './probe.js'

/**
 * F6 TASK 6: ONE LOOK AT A STUDENTS' ADDRESS (design §4, S1: M3), as a student's browser arrives:
 * never following a redirect, with a ceiling. What came back, and whether the app's own instance
 * answered it (the edge's catch-all carries no `x-manifest-instance`). A fake `fetch` records what
 * was asked.
 */
const URL_ = 'https://reading-responses.manifest.internal'

function fakeFetch(answer: () => Promise<Response>) {
  const asked: { url: string; init: RequestInit | undefined }[] = []
  let cancelled = 0
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    asked.push({ url: String(url), init })
    const response = await answer()
    const body = new ReadableStream({ cancel: () => void cancelled++ })
    return new Response(response.status === 204 ? null : body, {
      status: response.status,
      headers: response.headers,
    })
  }) as typeof fetch
  return { fetchFn, asked, cancelled: () => cancelled }
}

const answered =
  (status: number, headers: Record<string, string> = {}) =>
  () =>
    Promise.resolve(new Response(null, { status, headers }))

describe('probeAddress', () => {
  it('asks the address once, never following a redirect, and with a deadline', async () => {
    const f = fakeFetch(
      answered(302, { 'x-manifest-instance': 'i1', location: '/login' }),
    )
    await probeAddress(URL_, f.fetchFn)
    expect(f.asked).toHaveLength(1)
    expect(f.asked[0]!.url).toBe(URL_)
    expect(f.asked[0]!.init?.redirect).toBe('manual')
    expect(f.asked[0]!.init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('a routed answer: its status, routed (the header, any value)', async () => {
    const f = fakeFetch(answered(302, { 'x-manifest-instance': 'anything' }))
    expect(await probeAddress(URL_, f.fetchFn)).toEqual({ status: 302, routed: true })
  })

  it('the edge catch-all: 200, not routed', async () => {
    const f = fakeFetch(answered(200, { 'content-type': 'text/plain' }))
    expect(await probeAddress(URL_, f.fetchFn)).toEqual({ status: 200, routed: false })
  })

  it('its body is never read: cancelled', async () => {
    const f = fakeFetch(answered(200, { 'x-manifest-instance': 'i1' }))
    await probeAddress(URL_, f.fetchFn)
    expect(f.cancelled()).toBe(1)
  })

  it('no answer (a refused connection, a name that does not resolve): nothing, not routed', async () => {
    const f = fakeFetch(() => Promise.reject(new TypeError('fetch failed')))
    expect(await probeAddress(URL_, f.fetchFn)).toEqual({ status: null, routed: false })
  })

  it('no answer within the deadline: nothing, not routed, and the request abandoned', async () => {
    let signal: AbortSignal | undefined
    const fetchFn = ((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined
      return new Promise((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
      )
    }) as unknown as typeof fetch
    expect(await probeAddress(URL_, fetchFn, 20)).toEqual({ status: null, routed: false })
    expect(signal?.aborted).toBe(true)
  })
})
