import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  conversationEvents,
  createOurs,
  newReference,
  OurRefusal,
  reportProblem,
} from './api.js'

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

describe('reportProblem with a reference made beforehand', () => {
  it('reports that reference, so a notice can show it before anything is sent (and report it twice, harmlessly)', () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    const reference = newReference()
    expect(reportProblem({ code: 'UNREACHABLE', reference })).toBe(reference)
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body)).reference).toBe(reference)
  })
})

describe('createOurs: the conversation and its intake (F2 Task 7)', () => {
  const answer = (status: number, body?: unknown) =>
    vi.fn(
      async () =>
        new Response(body === undefined ? null : JSON.stringify(body), { status }),
    )

  it('startConversation posts their words, and answers the conversation', async () => {
    const fetch = answer(201, { id: 'c-1', state: 'describing' })
    vi.stubGlobal('fetch', fetch)
    expect(await createOurs().startConversation('A page')).toMatchObject({ id: 'c-1' })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect([url, init.method, init.credentials, JSON.parse(String(init.body))]).toEqual([
      '/api/conversations',
      'POST',
      'same-origin',
      { description: 'A page' },
    ])
  })

  it('handIntakeKey sends the four things the platform answered, and nothing else', async () => {
    const fetch = answer(204)
    vi.stubGlobal('fetch', fetch)
    await createOurs().handIntakeKey('c/1', {
      key: 'sk-x',
      baseUrl: 'http://127.0.0.1:7106/v1',
      model: 'default-chat',
      expiresAt: '2026-09-28T04:00:00.000Z',
    })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/conversations/c%2F1/intake-key')
    expect(Object.keys(JSON.parse(String(init.body))).sort()).toEqual([
      'baseUrl',
      'expiresAt',
      'key',
      'model',
    ])
  })

  it('handProject sends the project and the conversation’s token, and nothing else (Task 8)', async () => {
    const fetch = answer(204)
    vi.stubGlobal('fetch', fetch)
    await createOurs().handProject('c-1', {
      projectId: '22222222-2222-4222-8222-222222222222',
      token: 'mft_x',
    })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect([url, init.method, JSON.parse(String(init.body))]).toEqual([
      '/api/conversations/c-1/project',
      'POST',
      { projectId: '22222222-2222-4222-8222-222222222222', token: 'mft_x' },
    ])
  })

  it.each([
    [
      'intake',
      (o: ReturnType<typeof createOurs>) => o.intake('c-1', { skip: true }),
      '/api/conversations/c-1/intake',
      { skip: true },
    ],
    [
      'names',
      (o: ReturnType<typeof createOurs>) => o.names('c-1', ['mock-app']),
      '/api/conversations/c-1/names',
      { taken: ['mock-app'] },
    ],
    [
      'plan',
      (o: ReturnType<typeof createOurs>) => o.plan('c-1'),
      '/api/conversations/c-1/plan',
      {},
    ],
    [
      'correct',
      (o: ReturnType<typeof createOurs>) => o.correct('c-1', 'My TA too.'),
      '/api/conversations/c-1/plan/correction',
      { correction: 'My TA too.' },
    ],
    [
      'agree',
      (o: ReturnType<typeof createOurs>) =>
        o.agree('c-1', { version: 2, answers: { late: 'Closed.' } }),
      '/api/conversations/c-1/plan/agree',
      { version: 2, answers: { late: 'Closed.' } },
    ],
    // F3 Task 11: moment 6's four, as api/build.ts reads them.
    [
      'build (Carry on, Try again)',
      (o: ReturnType<typeof createOurs>) => o.build('c-1'),
      '/api/conversations/c-1/build',
      {},
    ],
    [
      'build (Try a different way)',
      (o: ReturnType<typeof createOurs>) => o.build('c-1', 'different'),
      '/api/conversations/c-1/build',
      { way: 'different' },
    ],
    [
      'message',
      (o: ReturnType<typeof createOurs>) => o.message('c-1', 'Also add a word count.'),
      '/api/conversations/c-1/messages',
      { words: 'Also add a word count.' },
    ],
    [
      'answer',
      (o: ReturnType<typeof createOurs>) => o.answer('c-1', 'q-1', '  kept as typed '),
      '/api/conversations/c-1/answers',
      { questionId: 'q-1', words: '  kept as typed ' },
    ],
    [
      'stop',
      (o: ReturnType<typeof createOurs>) => o.stop('c-1'),
      '/api/conversations/c-1/stop',
      {},
    ],
  ] as const)('%s posts to its route', async (_, call, url, body) => {
    const fetch = answer(202)
    vi.stubGlobal('fetch', fetch)
    await call(createOurs())
    const [seen, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect([seen, JSON.parse(String(init.body))]).toEqual([url, body])
  })

  it('askedSecrets reads the names we asked for, and each question, and sends nothing (F4 Task 10)', async () => {
    const fetch = answer(200, {
      secrets: [{ name: 'SIS_KEY', ask: 'What is the key for your class list?' }],
    })
    vi.stubGlobal('fetch', fetch)
    expect(await createOurs().askedSecrets('p/1')).toEqual([
      { name: 'SIS_KEY', ask: 'What is the key for your class list?' },
    ])
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect([url, init.method, init.body]).toEqual([
      '/api/apps/p%2F1/secrets',
      'GET',
      undefined,
    ])
  })

  it('a refusal is OurRefusal by its code and status; nothing answering is UNREACHABLE', async () => {
    vi.stubGlobal('fetch', answer(409, { error: { code: 'CONVERSATION_BUSY' } }))
    const busy = await createOurs()
      .intake('c-1', {})
      .catch((e: unknown) => e)
    expect(busy).toBeInstanceOf(OurRefusal)
    expect([(busy as OurRefusal).code, (busy as OurRefusal).status]).toEqual([
      'CONVERSATION_BUSY',
      409,
    ])
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )
    const gone = await createOurs()
      .startConversation('x')
      .catch((e: unknown) => e)
    expect([(gone as OurRefusal).code, (gone as OurRefusal).status]).toEqual([
      'UNREACHABLE',
      null,
    ])
  })
})

describe('agreedRows: the hand-over’s two rows (F5 Task 9)', () => {
  const PROJECT = '22222222-2222-4222-8222-222222222222'
  it('asks our server for the plan agreed on the app, and answers its two rows', async () => {
    const rows = { studentsSee: 'Your own first.', whoGetsIn: 'Only theirs.' }
    const fetch = vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    expect(await createOurs().agreedRows(PROJECT)).toEqual(rows)
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect([url, init.method, init.credentials]).toEqual([
      `/api/apps/${PROJECT}/plan`,
      'GET',
      'same-origin',
    ])
  })

  it('no plan agreed on it (404) is null, a state and not an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404 }),
      ),
    )
    expect(await createOurs().agreedRows(PROJECT)).toBeNull()
  })

  it('an answer without its two rows is refused as unexpected, never drawn', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ studentsSee: 'Only one.' }), { status: 200 }),
      ),
    )
    await expect(createOurs().agreedRows(PROJECT)).rejects.toMatchObject({
      code: 'UNEXPECTED',
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    )
    await expect(createOurs().agreedRows(PROJECT)).rejects.toMatchObject({
      code: 'UNEXPECTED',
    })
  })

  it('anything else is thrown, with its code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: 'PLATFORM_UNAVAILABLE' } }), {
            status: 502,
          }),
      ),
    )
    await expect(createOurs().agreedRows(PROJECT)).rejects.toMatchObject({
      code: 'PLATFORM_UNAVAILABLE',
      status: 502,
    })
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
