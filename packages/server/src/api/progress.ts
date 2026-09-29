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
  /** F4 Decision 5: waiting its turn on the app, which another conversation holds. */
  | 'waiting'
  /** A change they chose not to make (Not now, Leave the line): nothing was changed. */
  | 'set-aside'

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

/** The five states (`20-states.md`), as the design system's `StateChip` names them. */
export type Chip = 'working' | 'waiting' | 'attention' | 'steady' | 'notyet'

/** F4 Decision 6: the piece of work a conversation is on, folded from what was asked. */
export interface PieceView {
  /** The first build; a change they asked for; a fix of ours, when trying-out did not start. */
  kind: 'first' | 'change' | 'fix'
  /** 0 for the first; each change asked in the conversation counts on from 1. */
  change: number
  /** Their words for it, in order; ours for a fix. */
  asked: string[]
}

/** F4 Decision 5: where a waiting conversation is in its app's line. */
export interface LineView {
  /** 1 is next. */
  place: number
  /** The conversation holding the app: null only between one ending and the next starting. */
  holder: { id: string; title: string; waitingForYou: boolean } | null
}

/** One row of an app's conversations (F4 Task 6): where each piece of work left it. */
export interface AppConversation {
  id: string
  title: string
  state: ConversationState
  chip: Chip
  updatedAt: string
  /** Its place, when it waits. */
  line: LineView | null
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
/** F3 Decision 5: moment 6's five steps, each ticking on its own signal. */
export type BuildStep = 'pages' | 'holds' | 'build' | 'draft' | 'answers'

/**
 * WHAT A ROUND NEEDS OF THE PERSON (F3 Task 8), one card each (Task 11). A problem's card
 * carries `RoundView.reference`.
 */
export type Needs =
  /** Three failures of one kind: "…still has the last version that worked", or "…is still empty". */
  | { kind: 'tries'; step: 'build' | 'draft'; servingBefore: boolean }
  /** Someone else changed the app three times while we worked. */
  | { kind: 'conflict' }
  /** The piece of work's $2 is used: Carry on starts another session, if they say so. */
  | { kind: 'checkpoint'; capUsd: number; monthLeftUsd: number | null }
  /**
   * FE-36: the platform ended the session because the app's data is now confidential
   * (`models_withdrawn`). Rich, 2026-09-29: stop and ask first; Carry on starts a new session.
   */
  | { kind: 'withdrawn' }
  /** The month's allowance is spent. */
  | { kind: 'month'; resetsAt: string | null }
  /** 40 moves in one step, or the same refusal three times in a row (Review Focus 2). */
  | { kind: 'moves' }
  | { kind: 'unreachable'; what: 'platform' | 'model' }
  /** FE-32: what they asked for that needs a piece we cannot install, in the lead's plain words. */
  | { kind: 'cannot'; what: string }
  /** The token was refused: the page mints another, without a word. */
  | { kind: 'token' }
  /** A refusal the round cannot answer itself: F2's words for its code. */
  | { kind: 'refused'; code: string }

/** Where a round is (F3 Task 8): the whole of it, in every state frame. */
export interface RoundView {
  round: number
  status: 'working' | 'paused' | 'needs-you' | 'stopped' | 'interrupted' | 'done'
  /** The lead's line now, in its words. */
  line: string | null
  /** A message of theirs waits for the lead: the page says "Got it, after this step." */
  messageWaiting: boolean
  steps: {
    key: BuildStep
    state: 'next' | 'now' | 'done' | 'halted'
    /** The failures so far: 1 is "(second try)". */
    tries: number
    note: string | null
    changed: string | null
    /** The files changed, or the platform's own words: "The exact words, for whoever you ask for help". */
    exact: string[] | null
  }[]
  needs: Needs | null
  /** The support reference of the problem `needs` shows (Global Constraints). */
  reference: string | null
  questions: {
    id: string
    ask: string
    default: string | null
    /** Never a secret's: it goes to the sandbox and is dropped. */
    answer: string | null
    answered: boolean
    secret: boolean
  }[]
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
}

/**
 * WHAT A ROUND SAID IN THE CONVERSATION (F3 Task 11), as the page draws it, oldest first, each
 * with its time: theirs (`message`, `answer`) and ours. Folded from the store with every state
 * frame, as the round is.
 */
export type Said =
  | { kind: 'message'; round: number; text: string; at: string }
  /** Their answer, with the question it answers; a secret's `text` is always null. */
  | { kind: 'answer'; round: number; ask: string; text: string | null; at: string }
  /** The explaining agent's one sentence (Decision 8). */
  | {
      kind: 'explained'
      round: number
      step: 'build' | 'draft'
      sentence: string
      at: string
    }
  /** Decision 4: we are working with a smaller model; once a round. */
  | { kind: 'fallback'; round: number; at: string }
  /** A confidential app: we build it with the on-campus model; once in the conversation. */
  | { kind: 'campus'; round: number; at: string }
  /** FE-36: the app's data became confidential, and we carried on in a new session (Rich). */
  | { kind: 'carried'; round: number; at: string }
  /** A round, folded into one line (Decision 16): what changed, in the lead's own accounts. */
  | {
      kind: 'built'
      round: number
      changed: string | null
      cannot: string | null
      at: string
    }

export type StepKey =
  | 'understanding'
  | 'naming'
  | 'blueprint'
  /** Moment 5: "Reading how apps like this are built", then "Writing the plan". */
  | 'reading'
  | 'writing'
  /** The plan agreed, and committed as docs/plan.md. */
  | 'agreeing'
  /** F3: the round's steps travel whole in `RoundView`, never as step frames. */
  | BuildStep

/** One frame of `GET /api/conversations/:id/events`, as `data: <json>`. */
export type Progress =
  /** The whole state: first on every connection, and again on every change. */
  | {
      kind: 'state'
      conversation: Conversation
      intake: Intake
      /** The latest plan and its version: null until one is written (Task 9). */
      plan: { version: number; plan: PlanView } | null
      /** The latest round of work (F3): null until the plan is agreed. */
      round: RoundView | null
      /** What every round said, oldest first (F3 Task 11): empty until one speaks. */
      thread: Said[]
      /** The piece of work it is on (F4): null in the intake, before its project. */
      piece: PieceView | null
      /** Its place in the app's line (F4): null unless it waits. */
      line: LineView | null
    }
  /** A step, by its key, ticking on real completion. */
  | { kind: 'step'; step: StepKey; state: 'now' | 'done' | 'halted' }
  /**
   * Our code, and the support reference the person may quote (Decision 11); a spent
   * allowance says whose it is and when it resets (Rich).
   */
  | { kind: 'refusal'; code: string; reference: string; allowance?: Allowance }
