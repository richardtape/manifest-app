/**
 * OUR OWN CONTRACT WITH THE PAGE (F2 Decision 4), exported as
 * `@manifest-app/server/progress`. The web app imports it with `import type` only, so this
 * file imports nothing: the page's program never pulls in the server's source.
 */

/** Where a conversation is, from the person's words to the agreed plan (moments 3–5). */
/**
 * HOW MUCH WE READ AT ONCE, in characters: our server refuses more, and the page says so
 * before it is sent (F2's deferred Minor, Rich: say the limits). The page imports this file
 * for its types only, so it keeps its own copy, which a test of its own holds equal to this.
 */
export const LIMITS = {
  /** Their words, moment 3. */
  description: 4000,
  /** An answer to a question, a correction, an answer to what only they know. */
  sentence: 500,
} as const

export type ConversationState =
  | 'describing'
  | 'questions'
  | 'naming'
  | 'making'
  | 'planning'
  | 'plan-ready'
  | 'agreed'
  /** F3 Decision 12: a round of work is under way, or its questions wait; then it is built. */
  | 'building'
  | 'built'
  | 'paused'
  | 'failed'

export interface Conversation {
  id: string
  personId: string
  /** Null until moment 4 makes the project. */
  projectId: string | null
  /** "First build" for the first; F3 titles later ones. */
  title: string
  state: ConversationState
  /** The person's own words, verbatim. */
  description: string
  createdAt: string
  updatedAt: string
}

/** One follow-up question (moment 3): `choices` when the answers are few, else null. */
export interface Question {
  id: string
  ask: string
  choices: string[] | null
}

/** What the understanding agent made of the person's words (moment 3). */
export interface Understood {
  questions: Question[]
  /** One sentence, to them: "A page where your students…". */
  restatement: string
  audience: {
    scale: 'solo' | 'class' | 'large_course' | 'public'
    burst: 'steady' | 'synchronised'
    /** The words of theirs it guessed from: "About 200 students". */
    from: string
  }
  /** "send marks to Canvas": said, never refused. */
  cannot: string[]
}

/** Moments 3 and 4 so far, as the page shows them. */
export interface Intake {
  /** The round of the latest understanding; null before the first. */
  round: 1 | 2 | null
  understood: Understood | null
  /** Each question asked, and the person's answer, across both rounds. */
  answers: Record<string, string>
  /** The questions skipped: they become "Things we assumed" (moment 5). */
  skipped: string[]
  names: { name: string; slug: string }[] | null
  /** Rounds of names asked for: at most two (Review Focus 3). */
  namesAsked: number
  blueprint: { blueprint: string; starter: string | null; why: string } | null
  /** What *Make it* made (F2 Task 8), as the platform answered it: null until then. */
  project: { id: string; name: string; slug: string; blueprint: string } | null
}

/** One of the plan's five rows (moment 5). */
export type PlanRow = 'studentsSee' | 'youSee' | 'itKeeps' | 'whoGetsIn' | 'ai'

/** The plan, as the page shows it (moment 5; F2 Task 9). */
export interface PlanView {
  studentsSee: string
  youSee: string
  itKeeps: string
  whoGetsIn: string
  ai: string
  /** "Things we assumed": three at most. */
  assumed: string[]
  /** "Two things only you know": each answered where it is asked. */
  onlyYouKnow: { id: string; ask: string }[]
  /** The rows a correction changed, which the page marks. */
  changed: PlanRow[]
}

/** Whose allowance is used up, and when it resets (Rich): null before a first session. */
export interface Allowance {
  monthlyUsd: number
  resetsAt: string | null
}

/** What each step is; the page words it (words.ts holds every sentence). */
export type StepKey =
  | 'understanding'
  | 'naming'
  | 'blueprint'
  /** Moment 5: "Reading how apps like this are built", then "Writing the plan". */
  | 'reading'
  | 'writing'
  /** The plan agreed, and committed as docs/plan.md. */
  | 'agreeing'

/** One frame of `GET /api/conversations/:id/events`, as `data: <json>`. */
export type Progress =
  /** The whole state: first on every connection, and again on every change. */
  | {
      kind: 'state'
      conversation: Conversation
      intake: Intake
      /** The latest plan and its version: null until one is written (Task 9). */
      plan: { version: number; plan: PlanView } | null
    }
  /** A step, by its key, ticking on real completion. */
  | { kind: 'step'; step: StepKey; state: 'now' | 'done' | 'halted' }
  /**
   * Our code, and the support reference the person may quote (Decision 11); a spent
   * allowance says whose it is and when it resets (Rich).
   */
  | { kind: 'refusal'; code: string; reference: string; allowance?: Allowance }
