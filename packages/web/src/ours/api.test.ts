import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  conversationEvents,
  createOurs,
  newReference,
  OurRefusal,
  ourReported,
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

  it("FE-30: the platform's request id, when the problem has one, is sent as requestId", () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    reportProblem({
      code: 'INTAKE_DAILY_LIMIT_REACHED',
      operation: 'startIntakeSession',
      status: 409,
      requestId: '1f758a00-2575-409b-bf48-dfbc4218b118',
    })
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual([
      'at',
      'code',
      'operation',
      'reference',
      'requestId',
      'status',
    ])
    expect(body['requestId']).toBe('1f758a00-2575-409b-bf48-dfbc4218b118')
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

  it('handProject sends the project, the conversation’s token and its id (F6b D5), and nothing else (Task 8)', async () => {
    const fetch = answer(204)
    vi.stubGlobal('fetch', fetch)
    await createOurs().handProject('c-1', {
      projectId: '22222222-2222-4222-8222-222222222222',
      token: 'mft_x',
      tokenId: 'a0000000-0000-4000-8000-000000000009',
    })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect([url, init.method, JSON.parse(String(init.body))]).toEqual([
      '/api/conversations/c-1/project',
      'POST',
      {
        projectId: '22222222-2222-4222-8222-222222222222',
        token: 'mft_x',
        tokenId: 'a0000000-0000-4000-8000-000000000009',
      },
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

describe("m124: our refusal relaying the platform's keeps its request id (FE-30)", () => {
  const answer = (status: number, body: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status }))
  it('OurRefusal reads platformRequestId; without one it is null', async () => {
    const id = '1f758a00-2575-409b-bf48-dfbc4218b118'
    vi.stubGlobal(
      'fetch',
      answer(502, { error: { code: 'PLATFORM_UNAVAILABLE', platformRequestId: id } }),
    )
    const relayed = await createOurs()
      .intake('c-1', {})
      .catch((e: unknown) => e)
    expect(relayed).toMatchObject({
      code: 'PLATFORM_UNAVAILABLE',
      status: 502,
      requestId: id,
    })
    expect(ourReported(relayed as OurRefusal)).toEqual({
      code: 'PLATFORM_UNAVAILABLE',
      status: 502,
      requestId: id,
    })
    vi.stubGlobal('fetch', answer(409, { error: { code: 'CONVERSATION_BUSY' } }))
    const busy = await createOurs()
      .intake('c-1', {})
      .catch((e: unknown) => e)
    expect((busy as OurRefusal).requestId).toBeNull()
    expect(ourReported(busy as OurRefusal)).toEqual({
      code: 'CONVERSATION_BUSY',
      status: 409,
    })
    expect(ourReported(new OurRefusal('UNREACHABLE', null))).toEqual({
      code: 'UNREACHABLE',
    })
  })
})

describe('Talk it through (F5 Task 8, the final review’s I1)', () => {
  const PROJECT = '22222222-2222-4222-8222-222222222222'
  const APPROVAL = '55555555-5555-4555-8555-555555555555'
  it('startChange sends the refusal a change answers, beside the words and the token', async () => {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ id: 'c-1' }), { status: 201 }),
    )
    vi.stubGlobal('fetch', fetch)
    await createOurs().startChange(PROJECT, {
      words: 'Ours, and their reason.',
      token: 'mft_x',
      tokenId: 'a0000000-0000-4000-8000-000000000001',
      refusal: { approvalId: APPROVAL },
    })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect([url, JSON.parse(String(init.body))]).toEqual([
      `/api/apps/${PROJECT}/conversations`,
      {
        words: 'Ours, and their reason.',
        token: 'mft_x',
        tokenId: 'a0000000-0000-4000-8000-000000000001',
        refusal: { approvalId: APPROVAL },
      },
    ])
  })

  it('changeForRefusal answers the change already under way for it, or null (404)', async () => {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ id: 'c-7' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetch)
    expect(await createOurs().changeForRefusal(PROJECT, APPROVAL)).toEqual({ id: 'c-7' })
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe(
      `/api/apps/${PROJECT}/refusals/${APPROVAL}/conversation`,
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404 }),
      ),
    )
    expect(await createOurs().changeForRefusal(PROJECT, APPROVAL)).toBeNull()
  })
})

describe('the dry run’s fix (F5 Task 7)', () => {
  const PROJECT = '22222222-2222-4222-8222-222222222222'
  const REHEARSAL = '66666666-6666-4666-8666-666666666666'
  const dryRun = {
    rehearsalId: REHEARSAL,
    signInStatus: null,
    attributesReleased: ['mail'],
    attributesAsked: ['ubcEduCwlPuid', 'mail'],
  }
  it('startChange sends what the dry run saw, and the token, in one request', async () => {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ id: 'c-1' }), { status: 201 }),
    )
    vi.stubGlobal('fetch', fetch)
    await createOurs().startChange(PROJECT, {
      fix: { dryRun },
      token: 'mft_x',
      tokenId: 'a0000000-0000-4000-8000-000000000001',
    })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect([url, JSON.parse(String(init.body))]).toEqual([
      `/api/apps/${PROJECT}/conversations`,
      {
        fix: { dryRun },
        token: 'mft_x',
        tokenId: 'a0000000-0000-4000-8000-000000000001',
      },
    ])
  })

  it('fixForDryRun answers the fix already under way for it, or null (404)', async () => {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ id: 'c-8' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetch)
    expect(await createOurs().fixForDryRun(PROJECT, REHEARSAL)).toEqual({ id: 'c-8' })
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe(
      `/api/apps/${PROJECT}/rehearsals/${REHEARSAL}/conversation`,
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404 }),
      ),
    )
    expect(await createOurs().fixForDryRun(PROJECT, REHEARSAL)).toBeNull()
  })

  it('fixForOutage asks by the moment the outage began, encoded, and answers the fix under way, or null (404) (F6 Task 10)', async () => {
    const FROM = '2026-10-01T17:03:00.000Z'
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ id: 'c-9' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetch)
    expect(await createOurs().fixForOutage(PROJECT, FROM)).toEqual({ id: 'c-9' })
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe(
      `/api/apps/${PROJECT}/outages/2026-10-01T17%3A03%3A00.000Z/conversation`,
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404 }),
      ),
    )
    expect(await createOurs().fixForOutage(PROJECT, FROM)).toBeNull()
  })
})

describe('agreedRows: the hand-over’s two rows (F5 Task 9)', () => {
  const PROJECT = '22222222-2222-4222-8222-222222222222'
  it('asks our server for the plan agreed by the moment the version live was made, and answers its two rows', async () => {
    const rows = { studentsSee: 'Your own first.', whoGetsIn: 'Only theirs.' }
    const fetch = vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    expect(await createOurs().agreedRows(PROJECT, '2026-09-18T22:12:00.000Z')).toEqual(
      rows,
    )
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect([url, init.method, init.credentials]).toEqual([
      `/api/apps/${PROJECT}/plan?before=2026-09-18T22%3A12%3A00.000Z`,
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
    expect(await createOurs().agreedRows(PROJECT, '2026-09-18T22:12:00.000Z')).toBeNull()
  })

  it('an answer without its two rows is refused as unexpected, never drawn', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ studentsSee: 'Only one.' }), { status: 200 }),
      ),
    )
    await expect(
      createOurs().agreedRows(PROJECT, '2026-09-18T22:12:00.000Z'),
    ).rejects.toMatchObject({
      code: 'UNEXPECTED',
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    )
    await expect(
      createOurs().agreedRows(PROJECT, '2026-09-18T22:12:00.000Z'),
    ).rejects.toMatchObject({
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
    await expect(
      createOurs().agreedRows(PROJECT, '2026-09-18T22:12:00.000Z'),
    ).rejects.toMatchObject({
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

describe('keeping watch (F6 Task 8): our routes, from the page', () => {
  const PROJECT = '22222222-2222-4222-8222-222222222222'
  const TOKEN_ID = 'a0000000-0000-4000-8000-000000000001'
  const answering = (status: number, body?: unknown) => {
    const fetch = vi.fn(
      async () =>
        new Response(body === undefined ? null : JSON.stringify(body), { status }),
    )
    vi.stubGlobal('fetch', fetch)
    return fetch
  }
  const sent = (fetch: ReturnType<typeof answering>, n = 0) => {
    const [url, init] = fetch.mock.calls[n] as unknown as [string, RequestInit]
    return {
      url,
      method: init.method,
      body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
      headers: init.headers,
    }
  }

  it('keeping reads whether we watch the app, and sends nothing', async () => {
    const status = {
      watching: true,
      until: '2027-10-01T00:00:00.000Z',
      tokenId: TOKEN_ID,
      mine: true,
    }
    const fetch = answering(200, status)
    expect(await createOurs().keeping(PROJECT)).toEqual(status)
    expect(sent(fetch)).toMatchObject({
      url: `/api/apps/${PROJECT}/keeping`,
      method: 'GET',
      body: undefined,
    })
  })

  it('handWatch posts the secret, its id and when it expires, and nothing else: 201 is new, 200 current (S2)', async () => {
    const handed = {
      token: 'mft_x_y',
      tokenId: TOKEN_ID,
      expiresAt: '2027-10-01T00:00:00.000Z',
    }
    let fetch = answering(201, { watching: true, until: handed.expiresAt })
    expect(await createOurs().handWatch(PROJECT, handed)).toEqual({ kept: 'new' })
    expect(sent(fetch)).toMatchObject({
      url: `/api/apps/${PROJECT}/keeping`,
      method: 'POST',
      body: handed,
    })
    fetch = answering(200, { kept: 'current', until: handed.expiresAt })
    expect(await createOurs().handWatch(PROJECT, handed)).toEqual({ kept: 'current' })
  })

  it('needs answers the list, across apps or for one', async () => {
    const need = {
      kind: 'down',
      app: { projectId: PROJECT, name: 'A', slug: 'a' },
      from: 'x',
      owner: true,
    }
    let fetch = answering(200, { needs: [need] })
    expect(await createOurs().needs()).toEqual([need])
    expect(sent(fetch).url).toBe('/api/needs')
    fetch = answering(200, { needs: [] })
    expect(await createOurs().needs(PROJECT)).toEqual([])
    expect(sent(fetch).url).toBe(`/api/needs?projectId=${PROJECT}`)
  })

  it('since answers when they were last here and the lines, across apps or for one', async () => {
    const answer = { lastHere: '2026-10-01T00:00:00.000Z', lines: [] }
    let fetch = answering(200, answer)
    expect(await createOurs().since()).toEqual(answer)
    expect(sent(fetch).url).toBe('/api/since')
    fetch = answering(200, answer)
    await createOurs().since(PROJECT)
    expect(sent(fetch).url).toBe(`/api/since?projectId=${PROJECT}`)
  })

  it('history answers from, the gaps and every line; a 404 is thrown with its status', async () => {
    const answer = { from: '2026-09-18T16:00:00.000Z', gaps: [], lines: [] }
    const fetch = answering(200, answer)
    expect(await createOurs().history(PROJECT)).toEqual(answer)
    expect(sent(fetch).url).toBe(`/api/apps/${PROJECT}/history`)
    answering(404, { error: { code: 'NOT_FOUND' } })
    await expect(createOurs().history(PROJECT)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
  })

  it.each([
    ['needs', () => createOurs().needs()],
    ['since', () => createOurs().since()],
    ['history', () => createOurs().history(PROJECT)],
  ] as const)(
    '%s answering without its list is refused as unexpected, never drawn',
    async (_name, read) => {
      answering(204)
      await expect(read()).rejects.toMatchObject({ code: 'UNEXPECTED' })
      answering(200, { something: 'else' })
      await expect(read()).rejects.toMatchObject({ code: 'UNEXPECTED' })
    },
  )

  it('forget sends DELETE with no body and no content-type (a DELETE with JSON and no body is 400, §7)', async () => {
    const fetch = answering(204)
    await createOurs().forget(PROJECT)
    const call = sent(fetch)
    expect(call).toMatchObject({
      url: `/api/apps/${PROJECT}`,
      method: 'DELETE',
      body: undefined,
    })
    expect(call.headers).toBeUndefined()
  })

  it("startChange sends an outage's two moments, and the token, in one request (Decision 9)", async () => {
    const fetch = answering(201, { id: 'c-1' })
    const outage = { from: '2026-10-01T17:03:00.000Z', to: '2026-10-01T17:07:00.000Z' }
    await createOurs().startChange(PROJECT, {
      fix: { outage },
      token: 'mft_x',
      tokenId: 'a0000000-0000-4000-8000-000000000001',
    })
    expect(sent(fetch)).toMatchObject({
      url: `/api/apps/${PROJECT}/conversations`,
      body: {
        fix: { outage },
        token: 'mft_x',
        tokenId: 'a0000000-0000-4000-8000-000000000001',
      },
    })
  })
})

describe('the token ids our page mints (F6b D5, Task 3): our routes, from the page', () => {
  const PROJECT = '22222222-2222-4222-8222-222222222222'
  const TOKEN_ID = 'a0000000-0000-4000-8000-000000000003'
  const answering = (status: number, body?: unknown) => {
    const fetch = vi.fn(
      async () =>
        new Response(body === undefined ? null : JSON.stringify(body), { status }),
    )
    vi.stubGlobal('fetch', fetch)
    return fetch
  }
  const sent = (fetch: ReturnType<typeof answering>) => {
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    return {
      url,
      method: init.method,
      body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
    }
  }

  it('minted reads which tokens are ours and who made an agent’s, and sends nothing', async () => {
    const kept = {
      ours: [{ tokenId: TOKEN_ID, purpose: 'watch', conversationId: null, title: null }],
      agents: [],
    }
    const fetch = answering(200, kept)
    expect(await createOurs().minted(PROJECT)).toEqual(kept)
    expect(sent(fetch)).toEqual({
      url: `/api/apps/${PROJECT}/minted`,
      method: 'GET',
      body: undefined,
    })
  })

  it('keepAgent sends an agent’s id, name and expiry, and never its secret (Review Focus 4)', async () => {
    const fetch = answering(201)
    await createOurs().keepAgent(PROJECT, {
      tokenId: TOKEN_ID,
      name: 'Claude Code',
      expiresAt: '2026-11-01T21:00:00.000Z',
    })
    expect(sent(fetch)).toEqual({
      url: `/api/apps/${PROJECT}/agents`,
      method: 'POST',
      body: {
        tokenId: TOKEN_ID,
        name: 'Claude Code',
        expiresAt: '2026-11-01T21:00:00.000Z',
      },
    })
  })

  it('startChange carries the token’s id beside the token', async () => {
    const fetch = answering(201, { id: 'c-1' })
    await createOurs().startChange(PROJECT, {
      words: 'Bigger titles.',
      token: 'mft_x',
      tokenId: TOKEN_ID,
    })
    expect(sent(fetch).body).toEqual({
      words: 'Bigger titles.',
      token: 'mft_x',
      tokenId: TOKEN_ID,
    })
  })
})
