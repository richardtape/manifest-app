import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import {
  ASKING_DEADLINES,
  ModelError,
  modelFor,
  notAvailable,
  openAiCompatible,
  ROUND_DEADLINES,
  type Answered,
  type Message,
} from './client.js'
import { scripted } from './scripted.js'

/**
 * DECISION 5: THE MODEL IS ASKED ONLY FOR STRUCTURED OUTPUT, and an answer is used only if
 * its schema parses it. Against a fake OpenAI-compatible gateway that records each request
 * and answers as LiteLLM 1.98.0 does (the platform measured it: `ai/errors.ts`): a refusal as
 * JSON, an answer streamed (F5 Decision 14, as S1's M2 measured it).
 */
interface Seen {
  url: string | undefined
  headers: IncomingHttpHeaders
  body: Record<string, unknown>
}
type Answer =
  | { status: number; body: unknown; headers?: Record<string, string> }
  | { status: 200; stream: string; headers?: Record<string, string> }
  | 'hang'

const servers: Server[] = []
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.closeAllConnections()
          server.close(resolve)
        }),
    ),
  )
})

/** Answers each request with the next of `answers`, the last one repeating. */
async function gateway(answers: Answer[]): Promise<{ baseUrl: string; seen: Seen[] }> {
  const seen: Seen[] = []
  const server = createServer((request, response) => {
    let text = ''
    request.on('data', (chunk) => (text += chunk))
    request.on('end', () => {
      seen.push({ url: request.url, headers: request.headers, body: JSON.parse(text) })
      const answer = answers[Math.min(seen.length - 1, answers.length - 1)]!
      if (answer === 'hang') return
      if ('stream' in answer) {
        response.writeHead(200, {
          'content-type': 'text/event-stream',
          ...answer.headers,
        })
        response.end(answer.stream)
        return
      }
      response.writeHead(answer.status, {
        'content-type': 'application/json',
        ...answer.headers,
      })
      response.end(JSON.stringify(answer.body))
    })
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    baseUrl: `http://127.0.0.1:${(server.address() as { port: number }).port}/v1`,
    seen,
  }
}

/** An answer's server-sent events as LiteLLM 1.98.0 streams them: its words in pieces, usage last (S1: M2). */
function sse(
  content: string,
  model: string | null = 'default-chat-large',
  usage: unknown = { prompt_tokens: 9644, completion_tokens: 313, total_tokens: 9957 },
): string {
  const named = model === null ? {} : { model }
  const third = Math.ceil(content.length / 3)
  const pieces = [0, 1, 2].map((i) => content.slice(i * third, (i + 1) * third))
  return [
    { ...named, choices: [{ index: 0, delta: { role: 'assistant' } }] },
    ...pieces.map((piece) => ({
      ...named,
      choices: [{ index: 0, delta: { content: piece } }],
    })),
    ...(usage === null ? [] : [{ ...named, choices: [], usage }]),
  ]
    .map((event) => `data: ${JSON.stringify(event)}\n\n`)
    .concat('data: [DONE]\n\n')
    .join('')
}
const said = (content: string) => ({ status: 200 as const, stream: sse(content) })
const refused = (status: number, type: string, message = 'refused') => ({
  status,
  body: { error: { type, message } },
})

const Guess = z.object({
  restatement: z.string().max(40),
  scale: z.enum(['class', 'solo']),
})
const GOOD = JSON.stringify({
  restatement: 'A page where your students post',
  scale: 'class',
})
const MESSAGES: Message[] = [
  { role: 'system', content: 'You speak as "we".' },
  {
    role: 'user',
    content: "A page where students post a response to the week's reading.",
  },
]
const KEY = 'sk-test-y-never-in-an-error'

async function codeOf(promise: Promise<unknown>): Promise<ModelError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(ModelError)
  return error as ModelError
}

describe('openAiCompatible: the request', () => {
  it('asks /chat/completions for json_schema, the schema as z.toJSONSchema makes it, $schema kept, strict, streamed with its usage (F5 Decision 14)', async () => {
    const { baseUrl, seen } = await gateway([said(GOOD)])
    const model = openAiCompatible({ baseUrl, key: KEY, model: 'default-chat' })
    await model.complete('understanding', Guess, MESSAGES)

    expect(seen).toHaveLength(1)
    expect(seen[0]!.url).toBe('/v1/chat/completions')
    expect(seen[0]!.headers.authorization).toBe(`Bearer ${KEY}`)
    expect(seen[0]!.body).toEqual({
      model: 'default-chat',
      messages: MESSAGES,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'understanding',
          strict: true,
          schema: z.toJSONSchema(Guess),
        },
      },
      stream: true,
      stream_options: { include_usage: true },
    })
    expect(
      (seen[0]!.body['response_format'] as { json_schema: { schema: object } })
        .json_schema.schema,
    ).toHaveProperty('$schema')
  })

  it('sends no reasoning setting of its own: the gateway’s think:false is load-bearing (F2 M3)', async () => {
    const { baseUrl, seen } = await gateway([said(GOOD)])
    await openAiCompatible({ baseUrl, key: KEY, model: 'default-chat' }).complete(
      'understanding',
      Guess,
      MESSAGES,
    )
    expect(Object.keys(seen[0]!.body).sort()).toEqual([
      'messages',
      'model',
      'response_format',
      'stream',
      'stream_options',
    ])
  })

  it('a baseUrl with a trailing slash still reaches /chat/completions once', async () => {
    const { baseUrl, seen } = await gateway([said(GOOD)])
    await openAiCompatible({ baseUrl: `${baseUrl}/`, key: KEY, model: 'm' }).complete(
      'a',
      Guess,
      MESSAGES,
    )
    expect(seen[0]!.url).toBe('/v1/chat/completions')
  })
})

describe('openAiCompatible: its fetch (m37)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('m37: the global fetch is the one at the moment it asks, never the one when the model was made', async () => {
    // A closed port: the fetch taken at making would be refused, and the stub never asked.
    const model = openAiCompatible({
      baseUrl: 'http://127.0.0.1:9/v1',
      key: KEY,
      model: 'default-chat-large',
    })
    const asked: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      asked.push(url)
      return new Response('{}', { status: 503 })
    })
    await model.complete('intake', Guess, MESSAGES).catch(() => undefined)
    expect(asked.length).toBeGreaterThan(0)
    expect(new Set(asked)).toEqual(new Set(['http://127.0.0.1:9/v1/chat/completions']))
  })
})

describe('openAiCompatible: the answer', () => {
  it('a valid answer is parsed and typed', async () => {
    const { baseUrl } = await gateway([said(GOOD)])
    const answer = await openAiCompatible({ baseUrl, key: KEY, model: 'm' }).complete(
      'a',
      Guess,
      MESSAGES,
    )
    expect(answer).toEqual({
      restatement: 'A page where your students post',
      scale: 'class',
    })
  })

  it.each([
    ['not JSON', 'Sure! Here is the JSON: {"restatement": "x", "scale": "class"}'],
    ['the wrong shape', JSON.stringify({ restatement: 'x', scale: 'everyone' })],
    ['empty', ''],
    ['too long', JSON.stringify({ restatement: 'x'.repeat(41), scale: 'class' })],
  ])(
    'an answer that is %s is retried exactly once, then MODEL_ANSWER_INVALID (Review Focus 2)',
    async (_, content) => {
      const { baseUrl, seen } = await gateway([said(content)])
      const error = await codeOf(
        openAiCompatible({ baseUrl, key: KEY, model: 'm' }).complete(
          'a',
          Guess,
          MESSAGES,
        ),
      )
      expect(error.code).toBe('MODEL_ANSWER_INVALID')
      expect(seen).toHaveLength(2)
    },
  )

  it('an invalid answer, then a valid one, is the valid one', async () => {
    const { baseUrl, seen } = await gateway([said('nope'), said(GOOD)])
    const answer = await openAiCompatible({ baseUrl, key: KEY, model: 'm' }).complete(
      'a',
      Guess,
      MESSAGES,
    )
    expect(answer.scale).toBe('class')
    expect(seen).toHaveLength(2)
  })

  it('a check after parsing is retried once too, and its reason never reaches the error', async () => {
    const { baseUrl, seen } = await gateway([said(GOOD)])
    const error = await codeOf(
      openAiCompatible({ baseUrl, key: KEY, model: 'm' }).complete(
        'a',
        Guess,
        MESSAGES,
        () => 'a blueprint it was not given',
      ),
    )
    expect(error.code).toBe('MODEL_ANSWER_INVALID')
    expect(seen).toHaveLength(2)
  })
})

describe('openAiCompatible: when the gateway refuses (LiteLLM 1.98.0, as the platform measured it)', () => {
  it.each([
    [
      '429 budget_exceeded (a session cap or a spent month: the caller asks getAgentBudget)',
      refused(429, 'budget_exceeded', 'Budget has been exceeded! Key=mf-agent-1'),
      'MODEL_BUDGET_EXHAUSTED',
    ],
    ['429 of any other kind', refused(429, 'rate_limit_error'), 'MODEL_UNREACHABLE'],
    ['401 expired_key', refused(401, 'expired_key'), 'MODEL_KEY_REFUSED'],
    [
      '401 token_not_found_in_db',
      refused(401, 'token_not_found_in_db'),
      'MODEL_KEY_REFUSED',
    ],
    [
      '403 key_model_access_denied',
      refused(403, 'key_model_access_denied'),
      'MODEL_NOT_AVAILABLE',
    ],
    ['400 an unknown model', refused(400, 'None'), 'MODEL_NOT_AVAILABLE'],
    ['500', refused(500, 'internal'), 'MODEL_UNREACHABLE'],
    ['503 with no body we know', { status: 503, body: 'down' }, 'MODEL_UNREACHABLE'],
  ] as const)('%s is %s, not retried', async (_, answer, code) => {
    const { baseUrl, seen } = await gateway([answer])
    const error = await codeOf(
      openAiCompatible({ baseUrl, key: KEY, model: 'm' }).complete('a', Guess, MESSAGES),
    )
    expect([error.code, error.status]).toEqual([code, answer.status])
    expect(seen).toHaveLength(1)
  })

  it.each([
    [
      'the whole body null (LiteLLM’s answer to a provider’s 422: FE-34, the platform’s sitting 4)',
      { status: 200, body: null } as const,
    ],
    [
      'a streamed event whose data is null',
      { status: 200, stream: 'data: null\n\n' } as const,
    ],
    [
      // The platform's F8 (manifest 5effd5e): a streamed request too, before any stream begins.
      'a 422 itself, before any stream (the platform’s F8, 5effd5e: its exact body)',
      {
        status: 422,
        body: {
          error: {
            message:
              'the provider could not process this request (422), so it was not answered; correct the request',
            type: 'invalid_request_error',
            param: null,
            code: '422',
          },
        },
      } as const,
    ],
  ])(
    'a request the provider refused, as %s: MODEL_ANSWER_INVALID (422), not retried, never MODEL_UNREACHABLE',
    async (_, answer) => {
      const { baseUrl, seen } = await gateway([answer])
      const error = await codeOf(
        openAiCompatible({ baseUrl, key: KEY, model: 'm' }).complete(
          'a',
          Guess,
          MESSAGES,
        ),
      )
      expect([error.code, error.status]).toEqual(['MODEL_ANSWER_INVALID', 422])
      expect(seen).toHaveLength(1)
      // Every call streams (F5 sitting 2): the 422 is a streamed request's, read by its status.
      expect(seen[0]!.body).toMatchObject({ stream: true })
    },
  )

  it('a refused connection is MODEL_UNREACHABLE', async () => {
    const error = await codeOf(
      openAiCompatible({
        baseUrl: 'http://127.0.0.1:1/v1',
        key: KEY,
        model: 'm',
      }).complete('a', Guess, MESSAGES),
    )
    expect([error.code, error.status]).toEqual(['MODEL_UNREACHABLE', null])
  })

  it('a gateway that never answers is MODEL_STALLED at the first-word deadline, with nothing received', async () => {
    const { baseUrl } = await gateway(['hang'])
    const error = await codeOf(
      openAiCompatible({
        baseUrl,
        key: KEY,
        model: 'm',
        deadlines: { firstWordMs: 100, quietMs: 100, ceilingMs: 1000 },
      }).complete('a', Guess, MESSAGES),
    )
    expect(error.code).toBe('MODEL_STALLED')
    expect(error.received).toMatchObject({ chars: 0, firstWordMs: null })
  })

  /**
   * A gateway answering `status` and a body that never sends a byte, nor ends; like the real
   * fetch, an aborted request errors the body.
   */
  const stallingBody = (status: number) =>
    (async (_url: string, init: RequestInit) => {
      const signal = init.signal!
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          signal.addEventListener('abort', () => c.error(signal.reason))
        },
      })
      return new Response(body, {
        status,
        headers: { 'content-type': 'application/json' },
      })
    }) as unknown as typeof fetch

  it("m31: a refusal whose body stalls is its status's refusal, never a stall", async () => {
    const error = await codeOf(
      openAiCompatible({
        baseUrl: 'http://127.0.0.1:9/v1',
        key: KEY,
        model: 'm',
        fetch: stallingBody(401),
        deadlines: { firstWordMs: 100, quietMs: 100, ceilingMs: 1000 },
      }).complete('a', Guess, MESSAGES),
    )
    expect([error.code, error.status]).toEqual(['MODEL_KEY_REFUSED', 401])
  })

  it('m32: a 2xx with no body at all is a body that ended before its end (MODEL_UNREACHABLE), at once, never a stall', async () => {
    let asked = 0
    const started = Date.now()
    const error = await codeOf(
      openAiCompatible({
        baseUrl: 'http://127.0.0.1:9/v1',
        key: KEY,
        model: 'm',
        fetch: (async () => {
          asked += 1
          return new Response(null, { status: 200 })
        }) as unknown as typeof fetch,
        deadlines: { firstWordMs: 2000, quietMs: 2000, ceilingMs: 5000 },
      }).complete('a', Guess, MESSAGES),
    )
    expect(error.code).toBe('MODEL_UNREACHABLE')
    expect(Date.now() - started).toBeLessThan(1000)
    expect(asked).toBe(1)
  })

  it("an error chunk mid-answer is MODEL_UNREACHABLE, not retried, and never the gateway's words", async () => {
    const broken = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: '{"restatement":' } }] })}\n\n`,
      `data: ${JSON.stringify({ error: { message: `upstream refused ${KEY}`, code: '500' } })}\n\n`,
    ].join('')
    const { baseUrl, seen } = await gateway([{ status: 200, stream: broken }])
    const error = await codeOf(
      openAiCompatible({ baseUrl, key: KEY, model: 'm' }).complete('a', Guess, MESSAGES),
    )
    expect([error.code, error.status]).toEqual(['MODEL_UNREACHABLE', null])
    expect(seen).toHaveLength(1)
    expect(`${error.message} ${JSON.stringify(error)}`).not.toContain(KEY)
  })

  it('the key never appears in a thrown error, whatever the gateway says back', async () => {
    const echo = refused(401, 'expired_key', `Authentication Error, key ${KEY} expired`)
    const cases = [
      openAiCompatible({
        baseUrl: (await gateway([echo])).baseUrl,
        key: KEY,
        model: 'm',
      }),
      openAiCompatible({
        baseUrl: (await gateway([said('nope')])).baseUrl,
        key: KEY,
        model: 'm',
      }),
      openAiCompatible({ baseUrl: 'http://127.0.0.1:1/v1', key: KEY, model: 'm' }),
    ]
    for (const model of cases) {
      const error = await codeOf(model.complete('a', Guess, MESSAGES))
      const everything = `${error.message} ${error.stack ?? ''} ${JSON.stringify(error)} ${String(error.cause ?? '')}`
      expect(everything).not.toContain(KEY)
      expect(everything).not.toContain('sk-')
    }
  })
})

/**
 * An answer as LiteLLM 1.98.0 streams it (S1: M2): each chunk's `model` is the alias asked for,
 * `usage` in the last chunk, and the fallback header on the stream too.
 */
const litellm = (
  content: string,
  model: string | null,
  fallbacks: string | null,
  usage: unknown = { prompt_tokens: 9644, completion_tokens: 313, total_tokens: 9957 },
) => ({
  status: 200 as const,
  stream: sse(content, model, usage),
  headers: fallbacks === null ? {} : { 'x-litellm-attempted-fallbacks': fallbacks },
})

describe('openAiCompatible: which model answered (F3 Task 3, Decision 4)', () => {
  async function heard(answers: Answer[]): Promise<Answered[]> {
    const { baseUrl } = await gateway(answers)
    const answered: Answered[] = []
    await openAiCompatible({
      baseUrl,
      key: KEY,
      model: 'default-chat-large',
      onAnswer: (a) => answered.push(a),
    })
      .complete('a', Guess, MESSAGES)
      .catch(() => undefined)
    return answered
  }

  const RECEIVED = {
    chars: GOOD.length,
    firstWordMs: expect.any(Number),
    ms: expect.any(Number),
  }

  it("hears the chunks' model, the last chunk's usage, no fallback, and what was received (S1: M2's shape)", async () => {
    expect(await heard([litellm(GOOD, 'default-chat-large', '0')])).toEqual([
      {
        model: 'default-chat-large',
        fallback: false,
        usage: { in: 9644, out: 313 },
        received: RECEIVED,
      },
    ])
  })

  it("hears a fallback from the header alone: a chunk's model is only the alias asked for (S1: M2)", async () => {
    expect(await heard([litellm(GOOD, 'default-chat-large', '1')])).toEqual([
      {
        model: 'default-chat-large',
        fallback: true,
        usage: { in: 9644, out: 313 },
        received: RECEIVED,
      },
    ])
  })

  it('no header at all is no fallback; a missing usage is null, never zero; a missing model is null', async () => {
    expect(await heard([litellm(GOOD, 'default-chat-large', null, null)])).toEqual([
      { model: 'default-chat-large', fallback: false, usage: null, received: RECEIVED },
    ])
    expect(await heard([litellm(GOOD, null, null, null)])).toEqual([
      { model: null, fallback: false, usage: null, received: RECEIVED },
    ])
  })

  it('hears every answer that was paid for, the one retried included', async () => {
    const answered = await heard([
      litellm('not json', 'default-chat-large', '1'),
      litellm(GOOD, 'default-chat-large', '0'),
    ])
    expect(answered.map((a) => a.fallback)).toEqual([true, false])
  })

  it('hears nothing of a refusal', async () => {
    expect(await heard([refused(429, 'budget_exceeded')])).toEqual([])
  })
})

/**
 * A RECORDING FETCH WHOSE ANSWER THE TEST STREAMS AT ITS OWN PACE (F5 Task 2), under fake timers:
 * the gateway's headers at once, then each chunk when the test says. Like the real fetch, an
 * aborted signal errors the body and a pending request.
 */
function paced(
  headers: Record<string, string> = { 'x-litellm-attempted-fallbacks': '0' },
) {
  const encoder = new TextEncoder()
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const requests: { url: string; body: Record<string, unknown>; signal: AbortSignal }[] =
    []
  let answering = true
  const fetch = (async (url: string, init: RequestInit) => {
    const signal = init.signal!
    requests.push({ url, body: JSON.parse(String(init.body)), signal })
    if (!answering)
      return new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason)),
      )
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c
        signal.addEventListener('abort', () => c.error(signal.reason))
      },
    })
    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'text/event-stream', ...headers },
    })
  }) as unknown as typeof globalThis.fetch
  const event = (payload: unknown) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
  return {
    fetch,
    requests,
    /** The gateway takes the request and never answers it. */
    silent() {
      answering = false
    },
    words: (content: string) =>
      event({ model: 'default-chat-large', choices: [{ index: 0, delta: { content } }] }),
    /** The model's reasoning, streamed before its answer, as LiteLLM names it. */
    thinks: (reasoning: string) =>
      event({
        model: 'default-chat-large',
        choices: [{ index: 0, delta: { reasoning_content: reasoning } }],
      }),
    usage: (input: number, output: number) =>
      event({
        model: 'default-chat-large',
        choices: [],
        usage: { prompt_tokens: input, completion_tokens: output },
      }),
    done: () => controller.enqueue(encoder.encode('data: [DONE]\n\n')),
  }
}

/** GOOD, in `n` pieces. */
const piecesOf = (text: string, n: number) =>
  Array.from({ length: n }, (_, i) =>
    text.slice(
      Math.floor((i * text.length) / n),
      Math.floor(((i + 1) * text.length) / n),
    ),
  )

describe('openAiCompatible: three deadlines, never one total (F5 Decision 14, Review Focus 2)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  function asked(gateway: ReturnType<typeof paced>, onAnswer?: (a: Answered) => void) {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const model = openAiCompatible({
      baseUrl: 'http://gateway.test/v1',
      key: KEY,
      model: 'default-chat-large',
      fetch: gateway.fetch,
      deadlines: ROUND_DEADLINES,
      ...(onAnswer === undefined ? {} : { onAnswer }),
    })
    return model.complete('lead', Guess, MESSAGES).then(
      (value) => ({ value }),
      (error: unknown) => ({ error: error as ModelError }),
    )
  }

  it("the deadlines S1 set: a round's 120 s to a first word, 30 s between words, 15 min in all; the intake's and the plan's 60 s, 30 s, 3 min", () => {
    expect(ROUND_DEADLINES).toEqual({
      firstWordMs: 120_000,
      quietMs: 30_000,
      ceilingMs: 15 * 60_000,
    })
    expect(ASKING_DEADLINES).toEqual({
      firstWordMs: 60_000,
      quietMs: 30_000,
      ceilingMs: 3 * 60_000,
    })
  })

  it('a six-minute answer whose words keep arriving succeeds, parsed and checked, asked once', async () => {
    const gateway = paced()
    const heard: Answered[] = []
    const result = asked(gateway, (a) => heard.push(a))
    await vi.advanceTimersByTimeAsync(0)
    // 13 pieces, 29 s apart: past five minutes (the old total), never 30 s quiet.
    for (const piece of piecesOf(GOOD, 13)) {
      await vi.advanceTimersByTimeAsync(29_000)
      gateway.words(piece)
    }
    gateway.usage(4300, 13)
    gateway.done()
    await vi.advanceTimersByTimeAsync(0)
    expect(await result).toEqual({
      value: { restatement: 'A page where your students post', scale: 'class' },
    })
    expect(gateway.requests).toHaveLength(1)
    expect(heard).toEqual([
      {
        model: 'default-chat-large',
        fallback: false,
        usage: { in: 4300, out: 13 },
        received: { chars: GOOD.length, firstWordMs: 29_000, ms: 13 * 29_000 },
      },
    ])
  })

  it('quiet past 30 s mid-answer: MODEL_STALLED, what came counted, the request aborted, never asked again', async () => {
    const gateway = paced()
    const heard: Answered[] = []
    const result = asked(gateway, (a) => heard.push(a))
    await vi.advanceTimersByTimeAsync(13_600)
    gateway.words('{"restatement":')
    await vi.advanceTimersByTimeAsync(1_000)
    gateway.words(' "A page')
    await vi.advanceTimersByTimeAsync(29_999)
    expect(gateway.requests[0]!.signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    const { error } = (await result) as { error: ModelError }
    expect(error).toBeInstanceOf(ModelError)
    expect(error.code).toBe('MODEL_STALLED')
    expect(error.received).toEqual({
      chars: '{"restatement": "A page'.length,
      firstWordMs: 13_600,
      ms: 13_600 + 1_000 + 30_000,
    })
    expect(gateway.requests[0]!.signal.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(gateway.requests).toHaveLength(1)
    expect(heard).toEqual([])
  })

  it('no first word by 120 s: MODEL_STALLED with no first word, the request aborted', async () => {
    const gateway = paced()
    const result = asked(gateway)
    // A comment, or a chunk with no words, is not a first word.
    await vi.advanceTimersByTimeAsync(100_000)
    gateway.usage(0, 0)
    await vi.advanceTimersByTimeAsync(19_999)
    expect(gateway.requests[0]!.signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    const { error } = (await result) as { error: ModelError }
    expect(error.code).toBe('MODEL_STALLED')
    expect(error.received).toEqual({ chars: 0, firstWordMs: null, ms: 120_000 })
    expect(gateway.requests[0]!.signal.aborted).toBe(true)
    expect(gateway.requests).toHaveLength(1)
  })

  it("a model that reasons for three minutes before its first word is working, not stalled: its first word is the answer's, and only the answer is counted (the final review's I1)", async () => {
    const gateway = paced()
    const heard: Answered[] = []
    const result = asked(gateway, (a) => heard.push(a))
    // Its reasoning every 20 s, past the 120 s to a first word.
    for (let t = 0; t < 180_000; t += 20_000) {
      await vi.advanceTimersByTimeAsync(20_000)
      gateway.thinks('Weighing the weeks against the posts. ')
    }
    await vi.advanceTimersByTimeAsync(20_000)
    gateway.words(GOOD)
    gateway.done()
    await vi.advanceTimersByTimeAsync(0)
    expect(await result).toEqual({
      value: { restatement: 'A page where your students post', scale: 'class' },
    })
    expect(heard[0]!.received).toEqual({
      chars: GOOD.length,
      firstWordMs: 200_000,
      ms: 200_000,
    })
  })

  it('a model that reasons, then goes quiet past 30 s: MODEL_STALLED, with no first word and nothing of the answer counted', async () => {
    const gateway = paced()
    const result = asked(gateway)
    await vi.advanceTimersByTimeAsync(10_000)
    gateway.thinks('Weighing the weeks. ')
    await vi.advanceTimersByTimeAsync(29_999)
    expect(gateway.requests[0]!.signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    const { error } = (await result) as { error: ModelError }
    expect(error.code).toBe('MODEL_STALLED')
    expect(error.received).toEqual({ chars: 0, firstWordMs: null, ms: 40_000 })
  })

  it('a gateway that takes the request and never answers it: MODEL_STALLED at the first-word deadline', async () => {
    const gateway = paced()
    gateway.silent()
    const result = asked(gateway)
    await vi.advanceTimersByTimeAsync(120_000)
    const { error } = (await result) as { error: ModelError }
    expect([error.code, error.status]).toEqual(['MODEL_STALLED', null])
    expect(error.received).toEqual({ chars: 0, firstWordMs: null, ms: 120_000 })
    expect(gateway.requests[0]!.signal.aborted).toBe(true)
  })

  it('words arriving past 15 minutes: MODEL_TOO_LONG, what came counted, the request aborted, never asked again', async () => {
    const gateway = paced()
    const result = asked(gateway)
    await vi.advanceTimersByTimeAsync(2_000)
    let sent = 0
    for (let t = 2_000; t < 15 * 60_000; t += 20_000) {
      gateway.words('  ')
      sent += 2
      await vi.advanceTimersByTimeAsync(20_000)
    }
    const { error } = (await result) as { error: ModelError }
    expect(error.code).toBe('MODEL_TOO_LONG')
    expect(error.received).toEqual({ chars: sent, firstWordMs: 2_000, ms: 15 * 60_000 })
    expect(gateway.requests[0]!.signal.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(gateway.requests).toHaveLength(1)
  })

  it('an answer whose schema fails is asked once more, streamed again (F2 rule)', async () => {
    let n = 0
    const gateways = [paced(), paced()]
    const fetch = ((url: string, init: RequestInit) =>
      gateways[n++]!.fetch(url, init)) as typeof globalThis.fetch
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const result = openAiCompatible({
      baseUrl: 'http://gateway.test/v1',
      key: KEY,
      model: 'm',
      fetch,
    }).complete('a', Guess, MESSAGES)
    await vi.advanceTimersByTimeAsync(0)
    gateways[0]!.words('not json')
    gateways[0]!.done()
    await vi.advanceTimersByTimeAsync(0)
    gateways[1]!.words(GOOD)
    gateways[1]!.done()
    expect((await result).scale).toBe('class')
    expect(n).toBe(2)
  })

  it('the asking deadlines are the default: no first word by 60 s is MODEL_STALLED', async () => {
    const gateway = paced()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const result = openAiCompatible({
      baseUrl: 'http://gateway.test/v1',
      key: KEY,
      model: 'default-chat',
      fetch: gateway.fetch,
    })
      .complete('understanding', Guess, MESSAGES)
      .catch((e: unknown) => e as ModelError)
    await vi.advanceTimersByTimeAsync(59_999)
    expect(gateway.requests[0]!.signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(((await result) as ModelError).code).toBe('MODEL_STALLED')
  })
})

describe('modelFor: the most capable model the session lists (Decision 4)', () => {
  it('prefers default-chat-large, then default-chat, else none', () => {
    expect(modelFor(['default-chat', 'default-chat-large', 'default-embed'])).toBe(
      'default-chat-large',
    )
    expect(modelFor(['default-chat-onprem', 'default-chat'])).toBe('default-chat')
    expect(modelFor(['default-embed'])).toBeUndefined()
    expect(modelFor([])).toBeUndefined()
  })

  it('a confidential project is listed only the on-campus model: that one, last (Rich, 2026-09-28: carry on, and say so)', () => {
    expect(
      modelFor(['default-chat-onprem', 'default-chat-onprem-reasoning', 'default-embed']),
    ).toBe('default-chat-onprem')
    expect(modelFor(['default-chat-onprem', 'default-chat-large'])).toBe(
      'default-chat-large',
    )
  })
})

describe('scripted: the same rules, from fixed answers (tests, and mock mode)', () => {
  it('answers each agent in turn, and records what it was asked', async () => {
    const model = scripted({
      understanding: [
        { restatement: 'first', scale: 'class' },
        { restatement: 'second', scale: 'solo' },
      ],
    })
    expect((await model.complete('understanding', Guess, MESSAGES)).restatement).toBe(
      'first',
    )
    expect((await model.complete('understanding', Guess, MESSAGES)).restatement).toBe(
      'second',
    )
    expect(model.calls.map((c) => [c.agent, c.messages])).toEqual([
      ['understanding', MESSAGES],
      ['understanding', MESSAGES],
    ])
  })

  it('an answer its schema refuses is retried once with the next, then MODEL_ANSWER_INVALID', async () => {
    const recovers = scripted({ a: ['not json', { restatement: 'ok', scale: 'class' }] })
    expect((await recovers.complete('a', Guess, MESSAGES)).restatement).toBe('ok')
    const never = scripted({ a: [{ scale: 'everyone' }, 'still not json'] })
    expect((await codeOf(never.complete('a', Guess, MESSAGES))).code).toBe(
      'MODEL_ANSWER_INVALID',
    )
  })

  it('runs out loudly: a test that did not script enough is the test’s mistake', async () => {
    await expect(scripted({}).complete('nobody', Guess, MESSAGES)).rejects.toThrow(
      /no answer 1 for nobody/,
    )
  })
})

describe('notAvailable', () => {
  it('is MODEL_NOT_AVAILABLE, always', async () => {
    expect((await codeOf(notAvailable.complete('a', Guess, MESSAGES))).code).toBe(
      'MODEL_NOT_AVAILABLE',
    )
  })
})
