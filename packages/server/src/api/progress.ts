/**
 * OUR OWN CONTRACT WITH THE PAGE (F2 Decision 4), exported as
 * `@manifest-app/server/progress`. The web app imports it with `import type` only, so this
 * file imports nothing: the page's program never pulls in the server's source.
 */

/** Where a conversation is, from the person's words to the agreed plan (moments 3–5). */
export type ConversationState =
  | 'describing'
  | 'questions'
  | 'naming'
  | 'making'
  | 'planning'
  | 'plan-ready'
  | 'agreed'
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
}

/** What each step is; the page words it (words.ts holds every sentence). */
export type StepKey = 'understanding' | 'naming' | 'blueprint'

/** One frame of `GET /api/conversations/:id/events`, as `data: <json>`. */
export type Progress =
  /** The whole state: first on every connection, and again on every change. */
  | { kind: 'state'; conversation: Conversation; intake: Intake }
  /** A step, by its key, ticking on real completion. */
  | { kind: 'step'; step: StepKey; state: 'now' | 'done' | 'halted' }
  /** Our code, and the support reference the person may quote (Decision 11). */
  | { kind: 'refusal'; code: string; reference: string }
