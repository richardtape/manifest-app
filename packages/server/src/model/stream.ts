import { ModelError } from './client.js'

/**
 * ONE STREAMED CHUNK OF AN ANSWER (F5 Decision 14): its words, the model it names, and the usage
 * LiteLLM puts in the last chunk before `[DONE]` (S1: M2). A chunk's `model` is only the alias
 * asked for, never the provider's: the fallback header is the only word on a fallback.
 */
export type Chunk = {
  content: string
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
    choices?: { delta?: { content?: unknown } }[]
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } | null
  } | null
  // The gateway's own error mid-answer. Never its words: they can carry anything.
  if (body === null || typeof body !== 'object' || body.error !== undefined)
    throw new ModelError('MODEL_UNREACHABLE')
  const content = body.choices?.[0]?.delta?.content
  const input = body.usage?.prompt_tokens
  const output = body.usage?.completion_tokens
  return {
    content: typeof content === 'string' ? content : '',
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
 * it, or a payload that is not JSON, or an `error` chunk, is `MODEL_UNREACHABLE`.
 */
export async function* chunksOf(body: ReadableStream<Uint8Array>): AsyncIterable<Chunk> {
  const decoder = new TextDecoder()
  const reader = body.getReader()
  let buffered = ''
  let data: string[] = []
  try {
    for (;;) {
      const read = await reader.read()
      buffered += read.done
        ? decoder.decode()
        : decoder.decode(read.value, { stream: true })
      let end: number
      while ((end = buffered.search(/\r?\n/)) !== -1) {
        const line = buffered.slice(0, end)
        buffered = buffered.slice(end + (buffered[end] === '\r' ? 2 : 1))
        if (line === '') {
          if (data.length === 0) continue
          const payload = data.join('\n')
          data = []
          if (payload === '[DONE]') return
          yield chunkOf(payload)
        } else if (line.startsWith('data:')) {
          data.push(line.slice(line.startsWith('data: ') ? 6 : 5))
        }
        // A comment (`:`), or a field we do not read (`event`, `id`, `retry`).
      }
      if (read.done) throw new ModelError('MODEL_UNREACHABLE')
    }
  } finally {
    // Nothing more is read: whatever the gateway still sends is let go.
    reader.cancel().catch(() => undefined)
  }
}
