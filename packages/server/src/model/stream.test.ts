import { describe, expect, it } from 'vitest'
import { ModelError } from './client.js'
import { chunksOf, type Chunk } from './stream.js'

/**
 * THE GATEWAY'S SERVER-SENT EVENTS, READ BY HAND (F5 Decision 14): each read of the body may cut
 * an event, a line, or a character anywhere, and LiteLLM 1.98.0 ends with `[DONE]` (S1: M2).
 */
function body(...reads: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const read of reads)
        controller.enqueue(typeof read === 'string' ? encoder.encode(read) : read)
      controller.close()
    },
  })
}

const event = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`
const delta = (content: string, model = 'default-chat-large') => ({
  model,
  choices: [{ index: 0, delta: { content } }],
})
const DONE = 'data: [DONE]\n\n'

async function all(stream: ReadableStream<Uint8Array>): Promise<Chunk[]> {
  const chunks: Chunk[] = []
  for await (const chunk of chunksOf(stream)) chunks.push(chunk)
  return chunks
}

async function refusal(stream: ReadableStream<Uint8Array>): Promise<ModelError> {
  const error = await all(stream).then(
    () => undefined,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(ModelError)
  return error as ModelError
}

describe('chunksOf: each event, its words, its model and its usage', () => {
  it('reads each delta, the usage in the last chunk (S1: M2), and ends at [DONE]', async () => {
    const chunks = await all(
      body(
        event({
          model: 'default-chat-large',
          choices: [{ delta: { role: 'assistant' } }],
        }),
        event(delta('{"a":')),
        event(delta('1}')),
        event({
          model: 'default-chat-large',
          choices: [],
          usage: { prompt_tokens: 4300, completion_tokens: 12, total_tokens: 4312 },
        }),
        DONE,
      ),
    )
    expect(chunks).toEqual([
      { content: '', thinking: false, model: 'default-chat-large', usage: null },
      { content: '{"a":', thinking: false, model: 'default-chat-large', usage: null },
      { content: '1}', thinking: false, model: 'default-chat-large', usage: null },
      {
        content: '',
        thinking: false,
        model: 'default-chat-large',
        usage: { in: 4300, out: 12 },
      },
    ])
  })

  it('an event cut across reads, and a data line cut mid-JSON, are read whole', async () => {
    const whole = event(delta('Reading responses'))
    const chunks = await all(
      body(
        whole.slice(0, 7),
        whole.slice(7, 30),
        whole.slice(30),
        DONE.slice(0, 9),
        DONE.slice(9),
      ),
    )
    expect(chunks.map((c) => c.content)).toEqual(['Reading responses'])
  })

  it('a character cut between two reads is not garbled', async () => {
    const bytes = new TextEncoder().encode(event(delta('Café, “quoted”')))
    const at = bytes.indexOf(0xc3) + 1
    const chunks = await all(body(bytes.slice(0, at), bytes.slice(at), DONE))
    expect(chunks.map((c) => c.content)).toEqual(['Café, “quoted”'])
  })

  it('comments, blank lines, other fields and CRLF are not events', async () => {
    const chunks = await all(
      body(
        ': keep-alive\n\n',
        '\n\n',
        'event: message\r\nid: 7\r\n',
        `data: ${JSON.stringify(delta('x'))}\r\n\r\n`,
        'retry: 1000\n\n',
        DONE,
      ),
    )
    expect(chunks.map((c) => c.content)).toEqual(['x'])
  })

  it('a missing model or usage is null, never a guess', async () => {
    const chunks = await all(
      body(event({ choices: [{ delta: { content: 'y' } }] }), DONE),
    )
    expect(chunks).toEqual([{ content: 'y', thinking: false, model: null, usage: null }])
  })

  it("a delta of the model's reasoning is thinking, never words of the answer (the final review's I1)", async () => {
    const chunks = await all(
      body(
        event({ choices: [{ delta: { reasoning_content: 'First, the weeks' } }] }),
        event({ choices: [{ delta: { reasoning: 'then the posts' } }] }),
        event({ choices: [{ delta: { reasoning_content: '' } }] }),
        DONE,
      ),
    )
    expect(chunks.map((c) => [c.content, c.thinking])).toEqual([
      ['', true],
      ['', true],
      ['', false],
    ])
  })

  it('stops at [DONE], whatever follows', async () => {
    const chunks = await all(body(event(delta('z')), DONE, event(delta('after'))))
    expect(chunks.map((c) => c.content)).toEqual(['z'])
  })
})

describe('chunksOf: an answer the gateway could not finish', () => {
  it("an error chunk is MODEL_UNREACHABLE, and never carries the gateway's words", async () => {
    const error = await refusal(
      body(
        event(delta('{"a":')),
        event({
          error: { message: 'upstream sk-leaked went away', type: 'None', code: '500' },
        }),
      ),
    )
    expect(error.code).toBe('MODEL_UNREACHABLE')
    expect(`${error.message} ${JSON.stringify(error)}`).not.toContain('sk-leaked')
  })

  it('a body that ends before [DONE] is MODEL_UNREACHABLE: the gateway went mid-answer', async () => {
    expect((await refusal(body(event(delta('{"a":'))))).code).toBe('MODEL_UNREACHABLE')
  })

  it('an event that is not JSON is MODEL_UNREACHABLE', async () => {
    expect((await refusal(body('data: {"choices": [\n\n', DONE))).code).toBe(
      'MODEL_UNREACHABLE',
    )
  })
})
