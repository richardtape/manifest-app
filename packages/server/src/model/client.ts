import { z } from 'zod/v4'

/**
 * THE MODEL, ASKED ONLY FOR STRUCTURED OUTPUT (F2 Decision 5). One zod schema is both the
 * request (`z.toJSONSchema`, sent as it is, `$schema` kept: F2 M3, and the platform's own
 * measurement in `releases/summary.ts`) and the check (`safeParse`). An answer that fails
 * either is retried once, then refused. No code anywhere reads intent out of the model's
 * free text (`agents.md` rule 3).
 */
export type Message = { role: 'system' | 'user' | 'assistant'; content: string }

export type ModelCode =
  | 'MODEL_ANSWER_INVALID'
  | 'MODEL_NOT_AVAILABLE'
  | 'MODEL_BUDGET_EXHAUSTED'
  | 'MODEL_UNREACHABLE'
  | 'MODEL_KEY_REFUSED'
  /** No intake key handed over, or one lost to a restart (F2 Task 6). */
  | 'INTAKE_KEY_MISSING'
  /** An intake key past its `expiresAt`: dropped (F2 Task 6). */
  | 'INTAKE_KEY_EXPIRED'

/** A code and the gateway's status: never the key, the gateway's words, or the answer. */
export class ModelError extends Error {
  constructor(
    readonly code: ModelCode,
    readonly status: number | null = null,
  ) {
    super(status === null ? code : `${code} (${status})`)
    this.name = 'ModelError'
  }
}

/** A rule the schema cannot state, run after parsing: a reason to refuse, or null. */
export type Check<T> = (value: T) => string | null

export interface Model {
  complete<T>(
    agent: string,
    schema: z.ZodType<T>,
    messages: Message[],
    check?: Check<T>,
  ): Promise<T>
}

function read<T>(
  raw: unknown,
  schema: z.ZodType<T>,
  check?: Check<T>,
): { value: T } | undefined {
  let json = raw
  if (typeof raw === 'string') {
    try {
      json = JSON.parse(raw)
    } catch {
      return undefined
    }
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) return undefined
  if (check !== undefined && check(parsed.data) !== null) return undefined
  return { value: parsed.data }
}

/**
 * TWO ATTEMPTS AT A STRUCTURED ANSWER, and no more (Review Focus 2). `ask` answers the
 * model's raw text (or, scripted, a value); a refusal it throws is never retried.
 */
export async function answered<T>(
  ask: () => Promise<unknown>,
  schema: z.ZodType<T>,
  check?: Check<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const answer = read(await ask(), schema, check)
    if (answer !== undefined) return answer.value
  }
  throw new ModelError('MODEL_ANSWER_INVALID')
}

/**
 * LITELLM 1.98.0'S REFUSALS, as the platform measured them (manifest's `ai/errors.ts`):
 * `429 budget_exceeded` for a session's cap or a spent month alike (the caller asks
 * `getAgentBudget` which); `401 expired_key` or `token_not_found_in_db` for a key that has
 * ended; `403 key_model_access_denied` or `400` for a model this key cannot use.
 */
function refusal(status: number, body: unknown): ModelError {
  const type = (body as { error?: { type?: unknown } } | undefined)?.error?.type
  if (status === 429)
    return new ModelError(
      type === 'budget_exceeded' ? 'MODEL_BUDGET_EXHAUSTED' : 'MODEL_UNREACHABLE',
      status,
    )
  if (status === 401) return new ModelError('MODEL_KEY_REFUSED', status)
  if (status >= 500) return new ModelError('MODEL_UNREACHABLE', status)
  return new ModelError('MODEL_NOT_AVAILABLE', status)
}

/**
 * WHICH MODEL ANSWERED (F3 Decision 4), for the trace and the round's one line. Never shown.
 * F3 M1 measured LiteLLM 1.98.0: `model` is its own name for what answered
 * (`default-chat-large` on the normal path, `ollama_chat/qwen3.5:4b` for 9b's fallback), and the
 * header `x-litellm-attempted-fallbacks` is above 0 when the fallback answered.
 */
export interface Answered {
  model: string | null
  fallback: boolean
  usage: { in: number; out: number } | null
}

function answeredOf(payload: unknown, headers: Headers): Answered {
  const body = payload as
    | {
        model?: unknown
        usage?: { prompt_tokens?: unknown; completion_tokens?: unknown }
      }
    | undefined
  const tokens = body?.usage
  const count = (value: unknown) => (typeof value === 'number' ? value : null)
  const input = count(tokens?.prompt_tokens)
  const output = count(tokens?.completion_tokens)
  return {
    model: typeof body?.model === 'string' ? body.model : null,
    fallback: Number(headers.get('x-litellm-attempted-fallbacks') ?? 0) > 0,
    usage: input === null || output === null ? null : { in: input, out: output },
  }
}

/** Decision 4: the most capable model a session lists, or none. */
export function modelFor(listed: string[]): string | undefined {
  return ['default-chat-large', 'default-chat', 'default-chat-onprem'].find((name) =>
    listed.includes(name),
  )
}

/**
 * AN OPENAI-COMPATIBLE GATEWAY: the platform's LiteLLM, with an intake or agent session's
 * key. It sends no reasoning setting of its own: the gateway's `think: false` on
 * `default-chat` is load-bearing, and only a request's own `think: true` beats it (F2 M3).
 */
/**
 * A ROUND'S MODEL WAITS LONGER THAN THE INTAKE'S 60 s: the lead writes whole files, and on the real
 * platform one commit took 68.9 s (9,564 tokens written; F4 Step 3, Rich's click), cut off and said
 * as unreachable. Nobody waits on the page for a round, and a call that answers is paid for.
 */
export const ROUND_MODEL_TIMEOUT_MS = 5 * 60_000

export function openAiCompatible(options: {
  baseUrl: string
  key: string
  model: string
  fetch?: typeof fetch
  /** Per attempt. F1's 15 s is for reads; a model takes longer (M3: up to 7.8 s on a 4B model). */
  timeoutMs?: number
  /** Each 2xx answer's own model, whether a fallback answered, and its usage: every answer paid for. */
  onAnswer?: (answered: Answered) => void
}): Model {
  const {
    baseUrl,
    key,
    model,
    fetch: send = fetch,
    timeoutMs = 60_000,
    onAnswer,
  } = options
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  return {
    complete(agent, schema, messages, check) {
      const body = JSON.stringify({
        model,
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: { name: agent, strict: true, schema: z.toJSONSchema(schema) },
        },
      })
      return answered(
        async () => {
          let status: number
          let text: string
          let headers: Headers
          // The deadline covers the whole answer, its body included.
          const deadline = new AbortController()
          const timer = setTimeout(() => deadline.abort(), timeoutMs)
          try {
            const response = await send(url, {
              method: 'POST',
              headers: {
                authorization: `Bearer ${key}`,
                'content-type': 'application/json',
              },
              body,
              signal: deadline.signal,
            })
            status = response.status
            headers = response.headers
            text = await response.text()
          } catch {
            // Refused, or no answer by the deadline. Never the error itself: its cause
            // could carry the request, and the request carries the key.
            throw new ModelError('MODEL_UNREACHABLE')
          } finally {
            clearTimeout(timer)
          }
          let payload: unknown
          try {
            payload = JSON.parse(text)
          } catch {
            payload = undefined
          }
          if (status < 200 || status >= 300) throw refusal(status, payload)
          onAnswer?.(answeredOf(payload, headers))
          const content = (payload as { choices?: { message?: { content?: unknown } }[] })
            ?.choices?.[0]?.message?.content
          return typeof content === 'string' ? content : ''
        },
        schema,
        check,
      )
    },
  }
}

/** No model for this: the platform gives none (F2 Decision 6). */
export const notAvailable: Model = {
  complete: () => Promise.reject(new ModelError('MODEL_NOT_AVAILABLE')),
}
