import type { Chosen } from '../agents/blueprint.js'
import type { Named } from '../agents/naming.js'
import type { Understood } from '../agents/understanding.js'
import type { Store } from '../store/db.js'
import type { Intake } from './progress.js'

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

export const NOTHING_YET: Intake = {
  round: null,
  understood: null,
  answers: {},
  skipped: [],
  names: null,
  namesAsked: 0,
  blueprint: null,
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
      case 'skip':
        break
    }
  }
  return intake
}
