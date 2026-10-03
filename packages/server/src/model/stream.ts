import { ModelError } from './client.js'

/** The status LiteLLM's `null` stands for: the provider's `422` (FE-34). */
const REFUSED_AS_NULL = 422

/**
 * ONE STREAMED CHUNK OF AN ANSWER (F5 Decision 14): its words, the model it names, and the usage
 * LiteLLM puts in the last chunk before `[DONE]` (S1: M2). A chunk's `model` is only the alias
 * asked for, never the provider's: the fallback header is the only word on a fallback.
 */
export type Chunk = {
  content: string
  /**
   * The model's reasoning arrived (`reasoning_content`, or `reasoning`): it is working, though
   * not yet answering. Never kept, never counted as the answer (the final review's I1).
   */
  thinking: boolean
  model: string | null
  usage: { in: number; out: number } | null
}

function chunkOf(data: string): Chunk {
  let payload: unknown
  try {
    payload = JSON.parse(data)
  } catch {
    throw new ModelError('MODEL_UNREACHABLE')
  }
  const body = payload as {
    error?: unknown
    model?: unknown
    choices?: {
      delta?: { content?: unknown; reasoning_content?: unknown; reasoning?: unknown }
    }[]
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } | null
  } | null
  // FE-34: LiteLLM answers a provider's `422` as `200` with `null`: the request refused, never
  // a gateway out of reach (the platform's sitting 4). Its F8 (b) would send the 422 itself.
  if (body === null) throw new ModelError('MODEL_ANSWER_INVALID', REFUSED_AS_NULL)
  // The gateway's own error mid-answer. Never its words: they can carry anything. An `"error":
  // null` is no error (minors m33): LiteLLM omits nulls today, but nothing promises it.
  if (typeof body !== 'object' || (body.error !== undefined && body.error !== null))
    throw new ModelError('MODEL_UNREACHABLE')
  const delta = body.choices?.[0]?.delta
  const content = delta?.content
  const said = (value: unknown) => typeof value === 'string' && value !== ''
  const input = body.usage?.prompt_tokens
  const output = body.usage?.completion_tokens
  return {
    content: typeof content === 'string' ? content : '',
    thinking: said(delta?.reasoning_content) || said(delta?.reasoning),
    model: typeof body.model === 'string' ? body.model : null,
    usage:
      typeof input === 'number' && typeof output === 'number'
        ? { in: input, out: output }
        : null,
  }
}

/**
 * THE RESPONSE BODY'S SERVER-SENT EVENTS IN, CHUNKS OUT. Pure: it knows no deadline (the client
 * holds those). An event ends at a blank line and may be cut by any read; `data:` lines are its
 * payload, and comments and other fields are not. `[DONE]` is the end: a body that ends before
 * it, or a payload that is not JSON, or an `error` chunk, is `MODEL_UNREACHABLE`. A body, or an
 * event, that is only `null` is a provider's refusal of the request (FE-34): `MODEL_ANSWER_INVALID`.
 */
export async function* chunksOf(body: ReadableStream<Uint8Array>): AsyncIterable<Chunk> {
  const decoder = new TextDecoder()
  const reader = body.getReader()
  let buffered = ''
  let data: string[] = []
  let events = 0
  // The body's first characters, enough to know one that is only `null` however it ends.
  let head = ''
  try {
    for (;;) {
      const read = await reader.read()
      const text = read.done
        ? decoder.decode()
        : decoder.decode(read.value, { stream: true })
      buffered += text
      if (head.length < 32) head += text
      let end: number
      while ((end = buffered.search(/\r?\n/)) !== -1) {
        const line = buffered.slice(0, end)
        buffered = buffered.slice(end + (buffered[end] === '\r' ? 2 : 1))
        if (line === '') {
          if (data.length === 0) continue
          const payload = data.join('\n')
          data = []
          if (payload === '[DONE]') return
          events += 1
          yield chunkOf(payload)
        } else if (line.startsWith('data:')) {
          data.push(line.slice(line.startsWith('data: ') ? 6 : 5))
        }
        // A comment (`:`), or a field we do not read (`event`, `id`, `retry`).
      }
      // A body that is only `null` (or one `data: null` never closed by a blank line), however
      // it ends: the provider's refusal, never the gateway gone (minors m34).
      if (read.done)
        throw events === 0 && /^(data: ?)?null$/.test(head.trim())
          ? new ModelError('MODEL_ANSWER_INVALID', REFUSED_AS_NULL)
          : new ModelError('MODEL_UNREACHABLE')
    }
  } finally {
    // Nothing more is read: whatever the gateway still sends is let go.
    reader.cancel().catch(() => undefined)
  }
}
