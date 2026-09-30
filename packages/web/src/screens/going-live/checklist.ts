import type { Schemas } from '@manifest/contract'
import { words } from '../../words.js'

/**
 * THE CHECKLIST, IN OUR WORDS (F5 Tasks 5 and 6, moments 10 and 11), derived here and nowhere
 * else, and pure.
 */

/**
 * The two production clocks (Decision 4): the registration with UBC's identity team and the
 * Privacy Office's assessment. They are cards of their own on *Going live*, never rows, and the
 * band shows while either is unmet (Decision 3).
 */
export const CLOCK_IDS: readonly string[] = ['iam-registration', 'privacy-assessment']

/** Whether a production clock is unmet: anything but `met`, an item not tracked yet included. */
export function clocksUnmet(readiness: Schemas['LaunchReadiness']): boolean {
  return readiness.items.some((i) => CLOCK_IDS.includes(i.id) && i.state !== 'met')
}

/** The five states (20-states.md): a row is one of these and no other. */
export type Five = 'working' | 'waiting' | 'attention' | 'steady' | 'notyet'

export interface Row {
  id: string
  state: Five
  /** Who meets it, in words; empty for an item we do not know. */
  owner: string
  /** What it is, in our words (ours: the walk-through's rows carry a sentence and no name). */
  name: string
  /** One plain sentence for its state (FE-9: never the platform's `why`). */
  words: string
  /** A hostname inside `words`, drawn in mono: hostnames are allowed, and are not words (C3). */
  address: string | null
  /**
   * What the person could press. Always null until the owner may run the dry run (FE-42 (a)):
   * Task 7's press returns then.
   */
  action: 'dry-run' | null
  /** Shown last, set apart: `code-review`, which never blocks a launch (D33). */
  apart: boolean
}

const r = words.goingLive.rows
const o = words.goingLive.owners

/**
 * EVERY ITEM BUT THE TWO CLOCKS, IN OUR WORDS (Decisions 6 and 7), keyed on `id` × `state` and
 * whether anything is on trying-out, never on `why`. `met` is steady and `not_built` not yet.
 * `unmet` is *waiting on someone* when someone else has it (the sign-off; `scans`, the Manifest
 * team's, Decision 7; the dry run, an administrator's until FE-42 (a)), and *not yet* when
 * nothing can be done about it yet (S1: M3: three items for want of a candidate). Nothing needs
 * the person, because nothing here is theirs to do yet. An `id` we do not know is shown, never
 * hidden (spec D23.8). `code-review` last, set apart.
 */
export function rowsOf(
  readiness: Schemas['LaunchReadiness'],
  context: { hostname: string | null },
): Row[] {
  const candidate = readiness.candidateReleaseId !== null
  const rows = readiness.items
    .filter((i) => !CLOCK_IDS.includes(i.id))
    .map((i) => rowOf(i, candidate, context.hostname))
  return [...rows.filter((row) => !row.apart), ...rows.filter((row) => row.apart)]
}

function rowOf(
  item: Schemas['LaunchReadinessItem'],
  candidate: boolean,
  hostname: string | null,
): Row {
  const row = (
    state: Five,
    owner: string,
    name: string,
    said: string,
    address: string | null = null,
  ): Row => ({
    id: item.id,
    state,
    owner,
    name,
    words: said,
    address,
    action: null,
    apart: item.id === 'code-review',
  })
  const untracked = (name: string) => row('notyet', o.nobody, name, r.notTracked)
  switch (item.id) {
    case 'scans':
      if (item.state === 'not_built') return untracked(r.scans.name)
      if (item.state === 'met') return row('steady', o.forYou, r.scans.name, r.scans.met)
      return candidate
        ? row('waiting', o.team, r.scans.name, r.scans.unmet)
        : row('notyet', o.forYou, r.scans.name, r.once)
    case 'rehearsal':
      if (item.state === 'not_built') return untracked(r.rehearsal.name)
      if (item.state === 'met')
        return row('steady', o.admin, r.rehearsal.name, r.rehearsal.met)
      return candidate
        ? row('waiting', o.admin, r.rehearsal.name, r.rehearsal.unmet)
        : row('notyet', o.admin, r.rehearsal.name, r.once)
    case 'admin-approval':
      if (item.state === 'not_built') return untracked(r.approval.name)
      if (item.state === 'met')
        return row('steady', o.admin, r.approval.name, r.approval.met)
      return candidate
        ? row('waiting', o.admin, r.approval.name, r.approval.unmet)
        : row('notyet', o.admin, r.approval.name, r.once)
    case 'load-rehearsal':
      if (item.state === 'not_built') return untracked(r.loadRehearsal.name)
      return row(
        item.state === 'met' ? 'steady' : 'notyet',
        o.us,
        r.loadRehearsal.name,
        r.loadRehearsal.said,
      )
    case 'domain':
      if (item.state === 'not_built') return untracked(r.domain.name)
      return item.state === 'met'
        ? row('steady', o.forYou, r.domain.name, r.domain.met(hostname), hostname)
        : row('notyet', o.forYou, r.domain.name, r.domain.unmet)
    case 'code-review':
      return item.state === 'met'
        ? row('steady', o.forYou, r.codeReview.name, r.codeReview.met)
        : row('notyet', o.nobody, r.codeReview.name, r.codeReview.notYet)
    default: {
      const name = r.unknown.name(item.title)
      if (item.state === 'not_built') return row('notyet', '', name, r.notTracked)
      return item.state === 'met'
        ? row('steady', '', name, r.unknown.met)
        : row('notyet', '', name, r.unknown.unmet)
    }
  }
}
