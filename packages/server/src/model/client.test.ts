import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import {
  ModelError,
  modelFor,
  notAvailable,
  openAiCompatible,
  type Answered,
  type Message,
} from './client.js'
import { scripted } from './scripted.js'

/**
 * DECISION 5: THE MODEL IS ASKED ONLY FOR STRUCTURED OUTPUT, and an answer is used only if
 * its schema parses it. Against a fake OpenAI-compatible gateway that records each request
 * and answers as LiteLLM 1.98.0 does (the platform measured it: `ai/errors.ts`).
 */
interface Seen {
  url: string | undefined
  headers: IncomingHttpHeaders
  body: Record<string, unknown>
}
type Answer = { status: number; body: unknown; headers?: Record<string, string> } | 'hang'

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

const said = (content: string) => ({
  status: 200,
  body: { choices: [{ message: { role: 'assistant', content } }] },
})
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
  it('asks /chat/completions for json_schema, the schema as z.toJSONSchema makes it, $schema kept, strict', async () => {
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

  it('a gateway that never answers is MODEL_UNREACHABLE at the deadline', async () => {
    const { baseUrl } = await gateway(['hang'])
    const error = await codeOf(
      openAiCompatible({ baseUrl, key: KEY, model: 'm', timeoutMs: 100 }).complete(
        'a',
        Guess,
        MESSAGES,
      ),
    )
    expect(error.code).toBe('MODEL_UNREACHABLE')
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

/** An answer as LiteLLM 1.98.0 gave it in F3's M1: its own `model`, its usage, and the fallback header. */
const litellm = (
  content: string,
  model: string,
  fallbacks: string | null,
  usage: unknown = { prompt_tokens: 9644, completion_tokens: 313, total_tokens: 9957 },
) => ({
  status: 200,
  body: {
    model,
    choices: [{ message: { role: 'assistant', content } }],
    ...(usage === null ? {} : { usage }),
  },
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

  it("hears the answer's own model, its usage, and no fallback (M1's shape)", async () => {
    expect(await heard([litellm(GOOD, 'default-chat-large', '0')])).toEqual([
      { model: 'default-chat-large', fallback: false, usage: { in: 9644, out: 313 } },
    ])
  })

  it('hears a fallback answer: the header says 1, and the model names itself', async () => {
    expect(await heard([litellm(GOOD, 'ollama_chat/qwen3.5:4b', '1')])).toEqual([
      {
        model: 'ollama_chat/qwen3.5:4b',
        fallback: true,
        usage: { in: 9644, out: 313 },
      },
    ])
  })

  it('no header at all is no fallback; a missing usage is null, never zero; a missing model is null', async () => {
    const bare = { status: 200, body: { choices: [{ message: { content: GOOD } }] } }
    expect(await heard([litellm(GOOD, 'default-chat-large', null, null)])).toEqual([
      { model: 'default-chat-large', fallback: false, usage: null },
    ])
    expect(await heard([bare])).toEqual([{ model: null, fallback: false, usage: null }])
  })

  it('hears every answer that was paid for, the one retried included', async () => {
    const answered = await heard([
      litellm('not json', 'ollama_chat/qwen3.5:4b', '1'),
      litellm(GOOD, 'default-chat-large', '0'),
    ])
    expect(answered.map((a) => a.fallback)).toEqual([true, false])
  })

  it('hears nothing of a refusal', async () => {
    expect(await heard([refused(429, 'budget_exceeded')])).toEqual([])
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
