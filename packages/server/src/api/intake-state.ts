import type { Chosen } from '../agents/blueprint.js'
import { Plan } from '../agents/plan.js'
import type { Named } from '../agents/naming.js'
import type { Understood } from '../agents/understanding.js'
import type { Sent } from '../platform/authoring.js'
import type { Made } from '../platform/project.js'
import type { Store } from '../store/db.js'
import type { Intake, PlanView } from './progress.js'

/**
 * THE INTAKE SO FAR, FROM WHAT WAS SAID (F2 Task 5). Each message's body is one of these;
 * the page's view of moments 3 and 4 is their fold, so a reconnect, or a restart, rebuilds
 * it from the database alone (Review Focus 5).
 */
/** What we store, as each message's body. Never a model's free text: its parsed answers. */
export type Said =
  | { kind: 'understood'; round: 1 | 2; understood: Understood }
  | { kind: 'answers'; round: 1 | 2; answers: Record<string, string>; skipped: string[] }
  | { kind: 'skip' }
  | { kind: 'names'; names: Named['names']; taken: string[] }
  | { kind: 'blueprint'; chosen: Chosen }
  /** The project Make it made, as its token's `getProject` answered (Task 8). */
  | { kind: 'project'; project: Made }
  /** Their sentence, correcting the plan whose version it follows (Task 9). */
  | { kind: 'correction'; text: string; after: number }
  /**
   * The plan agreed, with their answers, the commit that put it in the app, and every
   * `createCommit` made on the way, as it was sent (Tasks 9 and 10).
   */
  | {
      kind: 'agreed'
      version: number
      answers: Record<string, string>
      commitSha: string
      sent: Sent[]
    }

export const NOTHING_YET: Intake = {
  round: null,
  understood: null,
  answers: {},
  skipped: [],
  names: null,
  namesAsked: 0,
  blueprint: null,
  project: null,
}

/** The intake so far, folded from the conversation's messages, oldest first. */
export function intakeOf(store: Store, conversationId: string): Intake {
  let intake = NOTHING_YET
  for (const { body } of store.listMessages(conversationId)) {
    const said = body as Said
    switch (said.kind) {
      case 'understood':
        intake = { ...intake, round: said.round, understood: said.understood }
        break
      case 'answers':
        intake = {
          ...intake,
          answers: { ...intake.answers, ...said.answers },
          skipped: [...intake.skipped, ...said.skipped],
        }
        break
      case 'names':
        intake = { ...intake, names: said.names, namesAsked: intake.namesAsked + 1 }
        break
      case 'blueprint':
        intake = { ...intake, blueprint: said.chosen }
        break
      case 'project':
        intake = { ...intake, project: said.project }
        break
      case 'skip':
        break
    }
  }
  return intake
}

/**
 * THE LATEST PLAN, PARSED ON THE WAY OUT (F2 Task 2's ruling): a stored plan that no longer
 * parses is no plan, never a crash.
 */
export function planOf(
  store: Store,
  conversationId: string,
): { version: number; plan: PlanView } | null {
  const latest = store.latestPlan(conversationId)
  if (latest === undefined) return null
  const parsed = Plan.safeParse(latest.plan)
  return parsed.success ? { version: latest.version, plan: parsed.data } : null
}

/** A correction not yet written into a plan: the last one, if it follows the latest plan. */
export function pendingCorrection(
  store: Store,
  conversationId: string,
): string | undefined {
  const version = store.latestPlan(conversationId)?.version
  let pending: string | undefined
  for (const { body } of store.listMessages(conversationId)) {
    const said = body as Said
    if (said.kind === 'correction')
      pending = said.after === version ? said.text : undefined
  }
  return pending
}
