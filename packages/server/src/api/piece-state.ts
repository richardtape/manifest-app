import type { FixEnvironment } from '../platform/instances.js'
import type { Store } from '../store/db.js'
import type { DryRunEvidence } from './progress.js'

export type { DryRunEvidence }

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
   * A dry run's fix carries its evidence instead (F5 Task 7): it happened on the live setup, and
   * left no incident. An outage's fix carries its two moments (F6 Decision 9): the live address
   * stopped answering, and nothing recorded why. Null for their change.
   */
  fix:
    | { incidentId: string; environment?: 'production' }
    | { dryRun: DryRunEvidence }
    | { outage: Outage }
    | null
  /**
   * F5 Task 8: a change started by *[Talk it through]* answers an administrator's refusal, so
   * pressed again it opens this one (the final review's I1). Absent on every other change.
   */
  refusal?: { approvalId: string }
}

/** F6 Decision 9: when the live address stopped answering, and when it answered again. */
export type Outage = { from: string; to: string }

export interface Piece {
  kind: 'first' | 'change' | 'fix'
  change: number
  asked: string[]
  incidentId: string | null
  /** Where a fix's app did not start; null for anything but a fix. */
  environment: FixEnvironment | null
  /** A dry run's fix: what it saw (F5 Task 7); null for anything else. */
  dryRun: DryRunEvidence | null
  /** An outage's fix: its two moments (F6 Decision 9); null for anything else. */
  outage: Outage | null
}

/** The latest change asked, whole; a conversation with none is on its first piece. */
export function pieceOf(store: Store, conversationId: string): Piece {
  let piece: Piece = {
    kind: 'first',
    change: 0,
    asked: [],
    incidentId: null,
    environment: null,
    dryRun: null,
    outage: null,
  }
  for (const { body } of store.listMessages(conversationId)) {
    const said = body as { kind?: unknown }
    if (said.kind !== 'asked') continue
    const asked = body as Asked
    if (asked.change !== piece.change) {
      const fix = asked.fix
      const none = { asked: [], incidentId: null, dryRun: null, outage: null }
      piece =
        fix === null
          ? { ...none, kind: 'change', change: asked.change, environment: null }
          : 'dryRun' in fix
            ? // A dry run runs on the live setup.
              {
                ...none,
                kind: 'fix',
                change: asked.change,
                environment: 'production',
                dryRun: fix.dryRun,
              }
            : 'outage' in fix
              ? // The live address stopped answering: no incident, nothing recorded why.
                {
                  ...none,
                  kind: 'fix',
                  change: asked.change,
                  environment: 'production',
                  outage: fix.outage,
                }
              : {
                  ...none,
                  kind: 'fix',
                  change: asked.change,
                  incidentId: fix.incidentId,
                  environment: fix.environment ?? 'staging',
                }
    }
    piece = { ...piece, asked: [...piece.asked, asked.words] }
  }
  return piece
}

/** The number the next change asked in this conversation takes. */
export function nextChange(store: Store, conversationId: string): number {
  return pieceOf(store, conversationId).change + 1
}
