import type { FixEnvironment } from '../platform/instances.js'
import type { Store } from '../store/db.js'

/**
 * A CONVERSATION'S PIECE OF WORK, FROM WHAT WAS ASKED (F4 Decision 6). Each change is one
 * `asked` message; a waiting conversation's further words join it as more of the same number.
 * Folded from the store, as the intake is, so a reconnect or a restart rebuilds it alone.
 */

/** What we store for each change asked: their words, or ours for a fix. */
export interface Asked {
  kind: 'asked'
  /** 1 for the first change in the conversation, then 2, 3… */
  change: number
  words: string
  /**
   * A fix of ours (F4 Decision 6): the incident it answers, and where it happened: absent is the
   * trying-out address, as every F4 fix was; `production` is the live address (F5 Decision 13).
   * Null for their change.
   */
  fix: { incidentId: string; environment?: 'production' } | null
  /**
   * F5 Task 8: a change started by *[Talk it through]* answers an administrator's refusal, so
   * pressed again it opens this one (the final review's I1). Absent on every other change.
   */
  refusal?: { approvalId: string }
}

export interface Piece {
  kind: 'first' | 'change' | 'fix'
  change: number
  asked: string[]
  incidentId: string | null
  /** Where a fix's app did not start; null for anything but a fix. */
  environment: FixEnvironment | null
}

/** The latest change asked, whole; a conversation with none is on its first piece. */
export function pieceOf(store: Store, conversationId: string): Piece {
  let piece: Piece = {
    kind: 'first',
    change: 0,
    asked: [],
    incidentId: null,
    environment: null,
  }
  for (const { body } of store.listMessages(conversationId)) {
    const said = body as { kind?: unknown }
    if (said.kind !== 'asked') continue
    const asked = body as Asked
    if (asked.change !== piece.change)
      piece = {
        kind: asked.fix === null ? 'change' : 'fix',
        change: asked.change,
        asked: [],
        incidentId: asked.fix?.incidentId ?? null,
        environment: asked.fix === null ? null : (asked.fix.environment ?? 'staging'),
      }
    piece = { ...piece, asked: [...piece.asked, asked.words] }
  }
  return piece
}

/** The number the next change asked in this conversation takes. */
export function nextChange(store: Store, conversationId: string): number {
  return pieceOf(store, conversationId).change + 1
}
