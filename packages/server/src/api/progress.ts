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

/** One frame of `GET /api/conversations/:id/events`, as `data: <json>`. */
export type Progress =
  /** The whole conversation: first on every connection, and again on every change. */
  | { kind: 'state'; conversation: Conversation }
  /** "Reading it", "Writing the plan"… ticking on real completion. */
  | { kind: 'step'; step: string; state: 'now' | 'done' | 'halted' }
  /** Our code, and the support reference the person may quote (Decision 11). */
  | { kind: 'refusal'; code: string; reference: string }
