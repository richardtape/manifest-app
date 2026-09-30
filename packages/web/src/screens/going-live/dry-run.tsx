import type { Schemas } from '@manifest/contract'
import { words } from '../../words.js'
import type { Five, Row } from './checklist.js'
import { RowView } from './row.js'

const r = words.goingLive.rows
const o = words.goingLive.owners

/**
 * THE DRY RUN'S ROW, MOMENT 12 (F5 Task 7, as S1 rewrote it), pure: read from the checklist item
 * alone, since no operation reads a rehearsal back (its `rehearsal.completed` reaches us with F6's
 * watch). **The owner is refused `runRehearsal`** (FE-42; Rich, 2026-09-30: "Both: row now, ask
 * platform"), so the row is an administrator's, who is not told it is waiting:
 * - nothing on trying-out: not yet, once a version is there (S1: M3);
 * - a version there, not yet passed: waiting on a Manifest administrator;
 * - passed: done.
 *
 * A failed run's `why` was never seen (the laptop's IdP releases every attribute asked for: S1:
 * M4), and nothing gives the page a failed run's evidence, so it reads as one not yet run, and
 * there is no *[Fix it]*. Keyed on `state` and a candidate, never on `why` (FE-9).
 */
export function dryRunRow(item: Schemas['LaunchReadinessItem'], candidate: boolean): Row {
  const row = (state: Five, owner: string, said: string): Row => ({
    id: item.id,
    state,
    owner,
    name: r.rehearsal.name,
    words: said,
    address: null,
    action: null,
    apart: false,
  })
  if (item.state === 'not_built') return row('notyet', o.nobody, r.notTracked)
  if (item.state === 'met') return row('steady', o.admin, r.rehearsal.met)
  return candidate
    ? row('waiting', o.admin, r.rehearsal.unmet)
    : row('notyet', o.admin, r.once)
}

/**
 * THE DRY RUN, DRAWN: its row, with nothing to press in any state. When the platform lets the
 * owner run it (FE-42 (a), the platform's sitting 4a), *[Run the dry run]*, its working row, *"You
 * can leave: it carries on."*, our deadline and a failure's words return here, as Decision 8 was
 * approved.
 */
export function DryRun({ row }: { row: Row }) {
  return <RowView row={row} />
}
