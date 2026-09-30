import type { Received } from '../model/client.js'
import type { Store } from '../store/db.js'

/**
 * WHAT HAPPENED IN A RUN, NEVER WHAT WAS SAID (F3 Decision 10; OpenAI's spans with
 * `traceIncludeSensitiveData: false`): no prompt's text, no file's content, no report. Each
 * entry is an agent's model call, a move and its guard's verdict, or a platform call and what
 * it named.
 */
export type TraceEntry =
  | {
      kind: 'model'
      agent: string
      /** The model asked for. */
      asked: string
      /** The model that answered, as the gateway named it (Decision 4). */
      answered: string | null
      /** Whether 9b's fallback answered (`x-litellm-attempted-fallbacks`, Decision 4). */
      fallback: boolean | null
      usage: { in: number; out: number } | null
      /** How much of the answer came, and when (F5 Decision 14): counted, never its text. */
      received: Received
      /** Why it ended before a whole answer came: its words stopped, or went on too long. */
      stalled?: 'quiet' | 'ceiling'
    }
  | { kind: 'move'; move: string; verdict: 'ran' | 'guarded'; reason?: string }
  | {
      kind: 'platform'
      operation: string
      code: string | null
      /** The commit, build, release, instance or environment kind it named. Never a token. */
      named: string | null
    }

export interface Trace {
  record(runId: string, entry: TraceEntry): void
  list(runId: string): (TraceEntry & { at: string })[]
}

/** Over the store's own trace table, which refuses anything shaped like a credential. */
export function storeTrace(store: Store): Trace {
  return {
    record: (runId, entry) => store.recordTrace(runId, entry),
    list: (runId) =>
      store.listTrace(runId).map(({ at, entry }) => ({ ...(entry as TraceEntry), at })),
  }
}
