import type { Run, RunDetail, Store } from '../store/db.js'
import type { BuildStep, RoundView, Said } from './progress.js'
import { unionOf } from './sensitive.js'

/**
 * THE ROUND, FROM WHAT WAS SAVED (F3 Task 8), as `intake-state.ts` folds the intake: the
 * latest run, its questions, and what was said in it. A reconnect's first frame and a restart
 * rebuild it from the database alone.
 */

/** What a round says in the conversation, as each message's body. Our words, or theirs. */
export type RoundSaid =
  /** Their message while it works: read by the lead at its next move. */
  | { kind: 'message'; round: number; text: string }
  /** Their answer to a question; a secret's is never here (`text` null). */
  | { kind: 'answer'; round: number; questionId: string; text: string | null }
  /** The explaining agent's one sentence, when a build or a draft failed (Decision 8). */
  | {
      kind: 'explained'
      round: number
      step: 'build' | 'draft'
      note: string
      sentence: string
    }
  /** Decision 4: we are working with a smaller model; once a round. */
  | { kind: 'fallback'; round: number }
  /** A confidential app's sessions list only the on-campus model (Rich: carry on, and say so); once. */
  | { kind: 'campus'; round: number }
  /** FE-36: the platform withdrew the session, and we carried on in a new one (Rich, 2026-09-29). */
  | { kind: 'carried'; round: number }
  /** The round, folded into one line (Decision 16). */
  | { kind: 'built'; round: number; line: string | null; cannot: string | null }

export const STEPS: BuildStep[] = ['pages', 'holds', 'build', 'draft', 'answers']

export const NO_DETAIL: RunDetail = {
  line: null,
  needs: null,
  reference: null,
  steps: {},
  draft: null,
  cost: { conversationUsd: null, monthLeftUsd: null, resetsAt: null },
  landed: false,
  buildId: null,
  releaseId: null,
  instanceId: null,
  fallbackSaid: false,
  heard: 0,
  failures: [],
  tried: [],
  cannot: null,
  account: null,
  sensitive: [],
}

/**
 * THEIR WORDS IN THIS ROUND, IN ORDER: each message and each answer, as the lead is shown them.
 * `detail.heard` counts how many it has been shown.
 */
export function heardIn(
  store: Store,
  conversationId: string,
  round: number,
): { kind: 'message' | 'answer'; text: string }[] {
  const heard: { kind: 'message' | 'answer'; text: string }[] = []
  const questions = new Map<string, string>()
  for (const { from, body } of store.listMessages(conversationId)) {
    const said = body as RoundSaid
    if (from !== 'person' || said.round !== round) continue
    if (said.kind === 'message') heard.push({ kind: 'message', text: said.text })
    if (said.kind === 'answer') {
      const ask =
        questions.get(said.questionId) ?? store.getQuestion(said.questionId)?.ask ?? ''
      questions.set(said.questionId, ask)
      heard.push({
        kind: 'answer',
        text:
          said.text === null
            ? `They gave the value we asked for ("${ask}"). It is set where the app reads it, and never shown.`
            : `They answered "${ask}": ${said.text}`,
      })
    }
  }
  return heard
}

/**
 * Where each step is. A Stop they chose is still (Rich): the step it was on goes back to not
 * started. `halted` is for what went wrong.
 */
function stateOf(run: Run, key: BuildStep): RoundView['steps'][number]['state'] {
  if (run.status === 'done') return 'done'
  const at = STEPS.indexOf(run.step as BuildStep)
  const here = STEPS.indexOf(key)
  if (here < at) return 'done'
  if (here > at) return 'next'
  if (run.status === 'stopped') return 'next'
  return run.status === 'working' || run.status === 'paused' ? 'now' : 'halted'
}

/**
 * A step's failed tries. A conflict is no try on the pages (Rich, moment 8: "the person sees
 * nothing unless it happens three times"); three are `needs: conflict`.
 */
function triesOf(run: Run, key: BuildStep): number {
  if (key === 'build') return run.tries['build'] ?? 0
  if (key === 'draft') return run.tries['draft'] ?? 0
  return 0
}

/** What changed in a round: its one account; a round from before F4, the accounts it joined. */
const accountOf = (detail: RunDetail | null): string | null =>
  detail?.account ?? detail?.steps.pages?.changed ?? null

/** The latest round's view, or null before the first. */
export function roundOf(store: Store, conversationId: string): RoundView | null {
  const run = store.latestRun(conversationId)
  if (run === undefined) return null
  const detail = run.detail ?? NO_DETAIL
  const heard = heardIn(store, conversationId, run.round)
  return {
    round: run.round,
    status: run.status,
    line: detail.line,
    messageWaiting: heard.slice(detail.heard).some((h) => h.kind === 'message'),
    steps: STEPS.map((key) => ({
      key,
      state: stateOf(run, key),
      tries: triesOf(run, key),
      note: detail.steps[key]?.note ?? null,
      changed: key === 'pages' ? accountOf(detail) : (detail.steps[key]?.changed ?? null),
      exact: detail.steps[key]?.exact ?? null,
    })),
    needs: detail.needs,
    reference: detail.reference,
    questions: store.listQuestions(run.id).map((q) => ({
      id: q.id,
      ask: q.ask,
      default: q.fallback,
      answer: q.secret === null ? q.answer : null,
      answered: q.answered,
      secret: q.secret !== null,
    })),
    draft: detail.draft,
    cost: detail.cost,
    stopped: stoppedOf(store, run),
    sensitive: sensitiveOf(store, conversationId, detail),
  }
}

/**
 * F6b DECISION 8, AFTER THE REVIEW'S I1: the union over this conversation's runs that began after
 * launch; null unless this one did (a first build's fields are launch's, and an old run's unknown).
 */
function sensitiveOf(
  store: Store,
  conversationId: string,
  detail: RunDetail,
): string[] | null {
  if (detail.launched !== true) return null
  return store
    .listRuns(conversationId)
    .filter((run) => run.detail?.launched === true)
    .reduce<string[]>((kept, run) => unionOf(kept, run.detail?.sensitive ?? []), [])
}

/**
 * F6b DECISION 6: WHO STOPPED IT, to whoever reads it, while it is stopped (m77: by id and name, so
 * the page judges whether it says so).
 */
function stoppedOf(store: Store, run: Run): RoundView['stopped'] {
  const stopped = run.detail?.stopped ?? null
  if (run.status !== 'stopped' || stopped === null) return null
  return { by: { id: stopped.by, name: store.personName(stopped.by) }, why: stopped.why }
}

/**
 * WHAT EVERY ROUND SAID, OLDEST FIRST (F3 Task 11): each message a round kept, as the page draws
 * it. An answer carries its question; a folded round carries what changed, from its run.
 */
export function threadOf(store: Store, conversationId: string): Said[] {
  const runs = new Map(store.listRuns(conversationId).map((run) => [run.round, run]))
  const thread: Said[] = []
  for (const { body, at } of store.listMessages(conversationId)) {
    const said = body as RoundSaid
    switch (said.kind) {
      case 'message':
        thread.push({ kind: 'message', round: said.round, text: said.text, at })
        break
      case 'answer':
        thread.push({
          kind: 'answer',
          round: said.round,
          ask: store.getQuestion(said.questionId)?.ask ?? '',
          text: said.text,
          at,
        })
        break
      case 'explained':
        thread.push({
          kind: 'explained',
          round: said.round,
          step: said.step,
          sentence: said.sentence,
          at,
        })
        break
      case 'fallback':
        thread.push({ kind: 'fallback', round: said.round, at })
        break
      case 'campus':
        thread.push({ kind: 'campus', round: said.round, at })
        break
      case 'carried':
        thread.push({ kind: 'carried', round: said.round, at })
        break
      case 'built':
        thread.push({
          kind: 'built',
          round: said.round,
          changed: accountOf(runs.get(said.round)?.detail ?? null),
          cannot: said.cannot,
          at,
        })
    }
  }
  return thread
}
