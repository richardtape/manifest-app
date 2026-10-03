import { z } from 'zod/v4'
import { chunksOf } from './stream.js'

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
  /** No first word by its deadline, or quiet too long mid-answer (F5 Decision 14). */
  | 'MODEL_STALLED'
  /** Words still arriving at the ceiling: longer than any answer should be (F5 Decision 14). */
  | 'MODEL_TOO_LONG'
  | 'MODEL_KEY_REFUSED'
  /** No intake key handed over, or one lost to a restart (F2 Task 6). */
  | 'INTAKE_KEY_MISSING'
  /** An intake key past its `expiresAt`: dropped (F2 Task 6). */
  | 'INTAKE_KEY_EXPIRED'

/**
 * HOW MUCH OF AN ANSWER CAME, COUNTED AND NEVER KEPT (F5 Decision 14): its length (UTF-16 code
 * units), when its first word came (null: none did), and how long it took, each from the request.
 */
export type Received = {
  /** Its length as JavaScript counts a string: UTF-16 code units, not characters (m39). */
  chars: number
  firstWordMs: number | null
  ms: number
}

/**
 * THE PLATFORM'S OWN FACTS ON A SPENT MONTH (FE-29, contract 1.6.0; m126): a start refused
 * `AGENT_BUDGET_EXHAUSTED` states `error.limit`, read fresh where `getAgentBudget` may be cached.
 * The month's amount (`null` when not stated) and when it lifts (`null` when the gateway does not
 * report a reset: never a guess).
 */
export type Limit = { amountUsd: number | null; resetsAt: string | null }

/**
 * A code and the gateway's status: never the key, the gateway's words, or the answer. A stall
 * carries what was received, so the trace says how much came and why it ended.
 */
export class ModelError extends Error {
  constructor(
    readonly code: ModelCode,
    readonly status: number | null = null,
    readonly received: Received | null = null,
    /**
     * FE-30: the platform's id for the request, when the platform refused it (an agent session's
     * start, worded as the model's: `platform/agent-sessions.ts`). The gateway's own have none.
     */
    readonly requestId: string | null = null,
    /** m126: a start the platform refused for the month, with the limit it stated. */
    readonly limit: Limit | null = null,
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
  // FE-34: the provider refused the request itself; it answered, and nobody is waited on.
  if (status === 422) return new ModelError('MODEL_ANSWER_INVALID', status)
  if (status >= 500) return new ModelError('MODEL_UNREACHABLE', status)
  return new ModelError('MODEL_NOT_AVAILABLE', status)
}

/**
 * WHICH MODEL ANSWERED (F3 Decision 4), for the trace and the round's one line. Never shown.
 * S1's M2 measured LiteLLM 1.98.0 streaming: each chunk's `model` is only the alias asked for, so
 * the header `x-litellm-attempted-fallbacks` (above 0 when the fallback answered) is the only
 * word on a fallback; `usage` is in the last chunk. `received` is how much came, never what.
 */
export interface Answered {
  model: string | null
  fallback: boolean
  usage: { in: number; out: number } | null
  received: Received
}

/** Decision 4: the most capable model a session lists, or none. */
export function modelFor(listed: string[]): string | undefined {
  return ['default-chat-large', 'default-chat', 'default-chat-onprem'].find((name) =>
    listed.includes(name),
  )
}

/**
 * THREE DEADLINES, ONE SET PER USE (F5 Decision 14), in place of one total: a long answer whose
 * words keep coming is never cut, and a dead one is known in seconds. From the request to the
 * first word; between words once they come; and a ceiling on the whole.
 */
export interface Deadlines {
  firstWordMs: number
  quietMs: number
  ceilingMs: number
}

/**
 * A ROUND'S (S1: M2, on the gateway): the on-campus lead's first word came at 56.8 s on a 4.3k-token
 * prompt, and the capable model reasons for 13.6 s before a commit; the longest gap between words
 * anywhere was 667 ms. Nobody waits on the page for a round, and a call that answers is paid for.
 */
export const ROUND_DEADLINES: Deadlines = {
  firstWordMs: 120_000,
  quietMs: 30_000,
  ceilingMs: 15 * 60_000,
}

/** THE INTAKE'S AND THE PLAN'S (S1: M2): `default-chat`'s first word came at 3.5 s cold, 0.14 s warm. */
export const ASKING_DEADLINES: Deadlines = {
  firstWordMs: 60_000,
  quietMs: 30_000,
  ceilingMs: 3 * 60_000,
}

/** An answer with no body: a stream already ended (m32). Each call makes its own. */
const ended = () =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close()
    },
  })

/**
 * AN OPENAI-COMPATIBLE GATEWAY: the platform's LiteLLM, with an intake or agent session's
 * key. It sends no reasoning setting of its own: the gateway's `think: false` on
 * `default-chat` is load-bearing, and only a request's own `think: true` beats it (F2 M3).
 * **Every call streams** (F5 Decision 14, Rich: *"Stream every call"*): the answer's words are
 * gathered for the call alone and parsed whole; a stall aborts the request, which the gateway
 * bills for what it streamed (S1: M2), and is never asked again here: that is the person's
 * Carry on, since a retry re-asks and re-pays.
 */
export function openAiCompatible(options: {
  baseUrl: string
  key: string
  model: string
  fetch?: typeof fetch
  /** The intake's and the plan's, unless a round's are given. */
  deadlines?: Deadlines
  /** Each whole answer's model, whether a fallback answered, its usage and how much came: every answer paid for. */
  onAnswer?: (answered: Answered) => void
}): Model {
  const {
    baseUrl,
    key,
    model,
    // m37: the global at the moment it asks, never the one when the model was made.
    fetch: send = (input, init) => globalThis.fetch(input, init),
    deadlines = ASKING_DEADLINES,
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
        stream: true,
        stream_options: { include_usage: true },
      })
      return answered(
        async () => {
          const started = Date.now()
          const cut = new AbortController()
          let why: 'quiet' | 'ceiling' | null = null
          const stop = (reason: 'quiet' | 'ceiling') => {
            why ??= reason
            cut.abort()
          }
          let chars = 0
          let firstWordMs: number | null = null
          const received = (): Received => ({
            chars,
            firstWordMs,
            ms: Date.now() - started,
          })
          // To the first word from the request; then between words; and the whole.
          let quiet = setTimeout(() => stop('quiet'), deadlines.firstWordMs)
          const ceiling = setTimeout(() => stop('ceiling'), deadlines.ceilingMs)
          // Refused or cut: never the error itself, whose cause could carry the request, and
          // the request carries the key.
          const failed = (error: unknown): ModelError =>
            why === 'quiet'
              ? new ModelError('MODEL_STALLED', null, received())
              : why === 'ceiling'
                ? new ModelError('MODEL_TOO_LONG', null, received())
                : error instanceof ModelError
                  ? error
                  : new ModelError('MODEL_UNREACHABLE')
          try {
            let response: Response
            try {
              response = await send(url, {
                method: 'POST',
                headers: {
                  authorization: `Bearer ${key}`,
                  'content-type': 'application/json',
                },
                body,
                signal: cut.signal,
              })
            } catch (error) {
              throw failed(error)
            }
            if (response.status < 200 || response.status >= 300) {
              let payload: unknown
              try {
                payload = JSON.parse(await response.text())
              } catch {
                // A body that stalls, breaks or is not JSON: the status has said it (m31).
                payload = undefined
              }
              throw refusal(response.status, payload)
            }
            let content = ''
            let named: string | null = null
            let usage: Answered['usage'] = null
            try {
              // No body at all is a body that ended before its end, at once (m32): never a
              // stream that waits out the first-word deadline.
              const words = (response.body ?? ended()).pipeThrough(
                new TransformStream<Uint8Array, Uint8Array>(),
                {
                  signal: cut.signal,
                },
              )
              let arriving = false
              for await (const chunk of chunksOf(words)) {
                if (chunk.content !== '') {
                  firstWordMs ??= Date.now() - started
                  content += chunk.content
                  chars += chunk.content.length
                }
                // Its answer's words, or its reasoning before them: either way it is working, and
                // from then on the quiet deadline runs between chunks. Only the answer is counted.
                arriving ||= chunk.content !== '' || chunk.thinking
                if (arriving) {
                  clearTimeout(quiet)
                  quiet = setTimeout(() => stop('quiet'), deadlines.quietMs)
                }
                named ??= chunk.model
                if (chunk.usage !== null) usage = chunk.usage
              }
            } catch (error) {
              throw failed(error)
            }
            onAnswer?.({
              model: named,
              fallback:
                Number(response.headers.get('x-litellm-attempted-fallbacks') ?? 0) > 0,
              usage,
              received: received(),
            })
            return content
          } finally {
            clearTimeout(quiet)
            clearTimeout(ceiling)
          }
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
