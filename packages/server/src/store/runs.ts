import type { DatabaseSync } from 'node:sqlite'

/** Where a round's run is (F3 Task 8's RoundView keeps the same words). */
export type RunStatus =
  'working' | 'paused' | 'needs-you' | 'stopped' | 'interrupted' | 'done'

/**
 * A ROUND'S RUN, AS SAVED (F3 Decision 10): enough to resume it after a restart, and nothing
 * that is a credential. An agent session is its id alone: its key lives in memory only.
 */
export interface Run {
  id: string
  conversationId: string
  round: number
  step: string
  /** In this step (Decision 9's 40). */
  moves: number
  tries: Record<string, number>
  status: RunStatus
  sessionIds: string[]
  model: string | null
  last: { kind: string; report: string } | null
  sameRefusal: { reason: string; count: number } | null
}

interface RunRow {
  id: string
  conversation_id: string
  round: number
  step: string
  moves: number
  tries: string
  status: RunStatus
  session_ids: string
  model: string | null
  last: string | null
  same_refusal: string | null
}

const orNull = (json: string | null): unknown => (json === null ? null : JSON.parse(json))

function runOf(row: RunRow): Run {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    round: row.round,
    step: row.step,
    moves: row.moves,
    tries: JSON.parse(row.tries) as Record<string, number>,
    status: row.status,
    sessionIds: JSON.parse(row.session_ids) as string[],
    model: row.model,
    last: orNull(row.last) as Run['last'],
    sameRefusal: orNull(row.same_refusal) as Run['sameRefusal'],
  }
}

/**
 * NOTHING SHAPED LIKE A CREDENTIAL IS EVER A TRACE ROW (F3 Global Constraints). A token is
 * `mft_…`, a model key `sk-…`; each at a word's start, so `task-list` and `risk-free` pass.
 */
const CREDENTIAL = /\bmft_[A-Za-z0-9]|\bsk-[A-Za-z0-9]/

/** The runs and trace tables' statements, over the store's one database (`db.ts`). */
export function runStatements(db: DatabaseSync, now: () => string) {
  return {
    saveRun(run: Run): void {
      const at = now()
      db.prepare(
        `insert into runs (id, conversation_id, round, step, moves, tries, status, session_ids, model,
                           last, same_refusal, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict (id) do update set
           step = excluded.step, moves = excluded.moves, tries = excluded.tries,
           status = excluded.status, session_ids = excluded.session_ids, model = excluded.model,
           last = excluded.last, same_refusal = excluded.same_refusal, updated_at = excluded.updated_at`,
      ).run(
        run.id,
        run.conversationId,
        run.round,
        run.step,
        run.moves,
        JSON.stringify(run.tries),
        run.status,
        JSON.stringify(run.sessionIds),
        run.model,
        run.last === null ? null : JSON.stringify(run.last),
        run.sameRefusal === null ? null : JSON.stringify(run.sameRefusal),
        at,
        at,
      )
    },

    getRun(id: string): Run | undefined {
      const row = db.prepare('select * from runs where id = ?').get(id) as
        RunRow | undefined
      return row === undefined ? undefined : runOf(row)
    },

    recordTrace(runId: string, entry: unknown): void {
      const json = JSON.stringify(entry)
      if (CREDENTIAL.test(json))
        throw new Error('a trace entry may never carry a credential')
      db.prepare(
        `insert into trace (run_id, seq, at, entry)
         select ?, coalesce(max(seq), 0) + 1, ?, ? from trace where run_id = ?`,
      ).run(runId, now(), json, runId)
    },

    listTrace(runId: string): { at: string; entry: unknown }[] {
      const rows = db
        .prepare('select at, entry from trace where run_id = ? order by seq')
        .all(runId) as { at: string; entry: string }[]
      return rows.map((row) => ({ at: row.at, entry: JSON.parse(row.entry) }))
    },
  }
}
