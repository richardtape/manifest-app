import { afterEach, describe, expect, it, vi } from 'vitest'
import { conversationEvents, reportProblem } from './api.js'

/**
 * OUR OWN API, FROM THE PAGE: its one caller. `reportProblem` is Decision 11's browser half:
 * the reference is made here and shown at once; the report goes without being waited on,
 * and nothing about it can ever throw into a screen.
 */
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('reportProblem (Decision 11)', () => {
  it('answers a reference at once, and posts what was met, and nothing else, to /api/problems', () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)

    const reference = reportProblem({
      code: 'INTAKE_DAILY_LIMIT_REACHED',
      operation: 'startIntakeSession',
      status: 409,
    })

    expect(reference).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/problems')
    expect(init).toMatchObject({
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
    })
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual([
      'at',
      'code',
      'operation',
      'reference',
      'status',
    ])
    expect(body).toMatchObject({
      reference,
      code: 'INTAKE_DAILY_LIMIT_REACHED',
      operation: 'startIntakeSession',
      status: 409,
    })
    expect(new Date(String(body['at'])).toISOString()).toBe(body['at'])
  })

  it('without an operation or a status, sends nulls', () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    reportProblem({ code: 'UNREACHABLE' })
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({ operation: null, status: null })
  })

  it.each([
    ['rejects', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['answers 500', async () => new Response('{}', { status: 500 })],
    [
      'throws before it starts',
      () => {
        throw new TypeError('no fetch')
      },
    ],
  ])('never throws, and never leaves a rejection, when fetch %s', async (_, impl) => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    vi.stubGlobal('fetch', vi.fn(impl))
    expect(() => reportProblem({ code: 'X' })).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 10))
    process.off('unhandledRejection', unhandled)
    expect(unhandled).not.toHaveBeenCalled()
  })
})

describe('conversationEvents', () => {
  it("opens the conversation's stream, its id encoded", () => {
    const opened: string[] = []
    vi.stubGlobal(
      'EventSource',
      class {
        constructor(url: string) {
          opened.push(url)
        }
      },
    )
    conversationEvents('a/b')
    expect(opened).toEqual(['/api/conversations/a%2Fb/events'])
  })
})
