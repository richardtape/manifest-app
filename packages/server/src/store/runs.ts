import type { DatabaseSync } from 'node:sqlite'
import type { BuildStep, Needs } from '../api/progress.js'

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
  /** The round's own facts (F3 Task 8): null for a run saved before version 3. */
  detail: RunDetail | null
}

/**
 * WHAT A ROUND KNOWS BEYOND ITS RUN (F3 Task 8), so a reconnect and a restart rebuild the
 * page's `RoundView` from here alone. Ids and our own words: never a key or a token.
 */
export interface RunDetail {
  /** The lead's line now, in its words. */
  line: string | null
  needs: Needs | null
  /** The support reference of the problem behind `needs`. */
  reference: string | null
  /** Each step's note, what changed, and the exact words or files. */
  steps: Partial<
    Record<
      BuildStep,
      { note: string | null; changed: string | null; exact: string[] | null }
    >
  >
  draft: {
    address: string
    serving: boolean
    lastAttempt: 'healthy' | 'failed' | null
  } | null
  cost: {
    conversationUsd: number | null
    monthLeftUsd: number | null
    resetsAt: string | null
  }
  /** A commit of the lead's landed this round: `pages` ticks on `done` only after one (Decision 5). */
  landed: boolean
  /** The build `startBuild` answered: the only one whose signal ticks `build`. */
  buildId: string | null
  releaseId: string | null
  /** The instance `deploy` answered: the only one whose signal ticks `draft`. */
  instanceId: string | null
  /** Decision 4: said once a round. */
  fallbackSaid: boolean
  /** How many of their messages and answers the lead has been shown. */
  heard: number
  /** On Try a different way: what failed, for the lead's view. */
  failures: string[]
  /** Every failure this round, each in a few lines: what Try a different way hands the lead. */
  tried: { what: 'build' | 'draft'; text: string }[]
  /** FE-32, in the lead's words. */
  cannot: string | null
  /**
   * The round's one sentence, from the lead's `done` (Rich, 2026-09-28): What changed. Each
   * commit's own account is in `steps.pages.exact`, above its files. A round from before F4 has
   * none, and its joined accounts are `steps.pages.changed`.
   */
  account: string | null
  /**
   * F4 Decision 10: how many of their messages this round are already in docs/plan.md's Changes.
   * Absent on a run saved before F4.
   */
  noted?: number
  /**
   * F6b Decision 6: who stopped it (a person id) and why: a Stop, by its own person or an owner of
   * the app; or its person taken off the app (`removed`). The first stop is kept: a second is
   * none. Absent on a run saved before F6b.
   */
  stopped?: { by: string; why: 'stopped' | 'removed' } | null
}

/** One question a round asked (F3 Decision 10). A secret's answer is never here. */
export interface AskedQuestion {
  id: string
  runId: string
  conversationId: string
  ask: string
  fallback: string | null
  /** The name the app reads it by; null for a question in words. */
  secret: string | null
  /** Their answer, or the default the work went on with; never a secret's. */
  answer: string | null
  answered: boolean
}

interface QuestionRow {
  id: string
  run_id: string
  conversation_id: string
  ask: string
  fallback: string | null
  secret: string | null
  answer: string | null
  answered_at: string | null
}

const questionOf = (row: QuestionRow): AskedQuestion => ({
  id: row.id,
  runId: row.run_id,
  conversationId: row.conversation_id,
  ask: row.ask,
  fallback: row.fallback,
  secret: row.secret,
  answer: row.answer,
  answered: row.answered_at !== null,
})

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
  detail: string | null
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
    detail: orNull(row.detail) as Run['detail'],
  }
}

/**
 * NOTHING SHAPED LIKE A CREDENTIAL IS EVER A TRACE ROW (F3 Global Constraints). A token is
 * `mft_…`, a model key `sk-…`; each at a word's start, so `task-list` and `risk-free` pass.
 */
export const CREDENTIAL = /\bmft_[A-Za-z0-9]|\bsk-[A-Za-z0-9]/

/** The runs and trace tables' statements, over the store's one database (`db.ts`). */
export function runStatements(db: DatabaseSync, now: () => string) {
  return {
    saveRun(run: Run): void {
      const at = now()
      db.prepare(
        `insert into runs (id, conversation_id, round, step, moves, tries, status, session_ids, model,
                           last, same_refusal, created_at, updated_at, detail)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict (id) do update set
           step = excluded.step, moves = excluded.moves, tries = excluded.tries,
           status = excluded.status, session_ids = excluded.session_ids, model = excluded.model,
           last = excluded.last, same_refusal = excluded.same_refusal, updated_at = excluded.updated_at,
           detail = excluded.detail`,
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
        run.detail === null ? null : JSON.stringify(run.detail),
      )
    },

    /** A conversation's runs, by round: the latest last. */
    listRuns(conversationId: string): Run[] {
      const rows = db
        .prepare(
          'select * from runs where conversation_id = ? order by round, created_at',
        )
        .all(conversationId) as unknown as RunRow[]
      return rows.map(runOf)
    },

    latestRun(conversationId: string): Run | undefined {
      const row = db
        .prepare(
          'select * from runs where conversation_id = ? order by round desc, created_at desc limit 1',
        )
        .get(conversationId) as RunRow | undefined
      return row === undefined ? undefined : runOf(row)
    },

    /** Every run in one of these states, whoever's: a restart's to mark (Review Focus 3). */
    runsIn(statuses: RunStatus[]): Run[] {
      const rows = db
        .prepare(
          `select * from runs where status in (${statuses.map(() => '?').join(', ')})`,
        )
        .all(...statuses) as unknown as RunRow[]
      return rows.map(runOf)
    },

    /** The default, if any, is its answer until they give one. */
    addQuestion(question: Omit<AskedQuestion, 'answer' | 'answered'>): void {
      db.prepare(
        `insert into questions (id, run_id, conversation_id, ask, fallback, secret, answer, answered_at, asked_at)
         values (?, ?, ?, ?, ?, ?, ?, null, ?)`,
      ).run(
        question.id,
        question.runId,
        question.conversationId,
        question.ask,
        question.fallback,
        question.secret,
        question.secret === null ? question.fallback : null,
        now(),
      )
    },

    /** Their answer; a secret's is null, and only its being answered is kept. */
    answerQuestion(id: string, answer: string | null): void {
      db.prepare('update questions set answer = ?, answered_at = ? where id = ?').run(
        answer,
        now(),
        id,
      )
    },

    getQuestion(id: string): AskedQuestion | undefined {
      const row = db.prepare('select * from questions where id = ?').get(id) as
        QuestionRow | undefined
      return row === undefined ? undefined : questionOf(row)
    },

    listQuestions(runId: string): AskedQuestion[] {
      const rows = db
        .prepare('select * from questions where run_id = ? order by asked_at, rowid')
        .all(runId) as unknown as QuestionRow[]
      return rows.map(questionOf)
    },

    secretsAskedOn(projectId: string, personId: string): { name: string; ask: string }[] {
      const rows = db
        .prepare(
          `select questions.secret as name, questions.ask as ask from questions
           join conversations on conversations.id = questions.conversation_id
           where conversations.project_id = ? and conversations.person_id = ?
             and questions.secret is not null
           order by questions.asked_at, questions.rowid`,
        )
        .all(projectId, personId) as { name: string; ask: string }[]
      // The latest question for each name names it.
      const latest = new Map(rows.map((row) => [row.name, row.ask]))
      return [...latest]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([name, ask]) => ({ name, ask }))
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
