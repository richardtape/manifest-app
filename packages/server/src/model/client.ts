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
 * AN OPENAI-COMPATIBLE GATEWAY: the platform's LiteLLM, with an intake or agent session's
 * key. It sends no reasoning setting of its own: the gateway's `think: false` on
 * `default-chat` is load-bearing, and only a request's own `think: true` beats it (F2 M3).
 */
export function openAiCompatible(options: {
  baseUrl: string
  key: string
  model: string
  fetch?: typeof fetch
  /** Per attempt. F1's 15 s is for reads; a model takes longer (M3: up to 7.8 s on a 4B model). */
  timeoutMs?: number
}): Model {
  const { baseUrl, key, model, fetch: send = fetch, timeoutMs = 60_000 } = options
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
          try {
            const response = await send(url, {
              method: 'POST',
              headers: {
                authorization: `Bearer ${key}`,
                'content-type': 'application/json',
              },
              body,
              signal: AbortSignal.timeout(timeoutMs),
            })
            status = response.status
            text = await response.text()
          } catch {
            // Refused, or no answer by the deadline. Never the error itself: its cause
            // could carry the request, and the request carries the key.
            throw new ModelError('MODEL_UNREACHABLE')
          }
          let payload: unknown
          try {
            payload = JSON.parse(text)
          } catch {
            payload = undefined
          }
          if (status < 200 || status >= 300) throw refusal(status, payload)
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
