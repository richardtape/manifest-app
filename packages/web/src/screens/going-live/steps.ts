import type { Schemas } from '@manifest/contract'
import { words } from '../../words.js'
import type { Five } from './checklist.js'

/**
 * THE THREE STEPS, IN UBC'S ORDER (F5b Task 2, D2; the design's §1), derived here and nowhere else,
 * and pure: the privacy assessment, then the trying-out address's registration, then the students'
 * address's. Each step's state is read from its own record (and, for the assessment and the
 * students' address, the checklist's verdict on it: **never done while the checklist says unmet**,
 * F5's S3); the current step is the first one not done, and only it is a card. Nothing measured in
 * days moves, so no step is ever working.
 *
 * **Part one** (`sending: false`, Decision 3): there is nowhere to send a draft until FE-46 lands,
 * so nothing is the person's to press. Every row the design marks *needs you* is drawn as F5 drew
 * it: nothing on file, or a draft, is *not yet* with F5's admission; UBC's questions, a sent-back
 * assessment and a lapsed registration are with the Manifest team. **Part two** (`sending: true`)
 * gives each its action.
 */

export const VANCOUVER = 'America/Vancouver'
export type StepId = 'assessment' | 'staging' | 'production'

/** What a step's record says, before words: what the card's body and other pages key on. */
export type StepKind =
  | 'nothing'
  | 'drafted'
  /** (FE-46) With the Manifest team. */
  | 'sent'
  | 'submitted'
  /** UBC came back with questions (`change_requested` from `submitted`). */
  | 'asked'
  /** A change on file with UBC (`change_requested` from `active`). */
  | 'change'
  /** The assessment sent back by the Privacy Office (`draft` again, its day sent kept). */
  | 'sent-back'
  | 'expired'
  | 'done'
  /** Done on its record, unmet on the checklist (F5's S3). */
  | 'done-unmet'
  /** (S1: M2) An app that signs nobody in: neither registration is needed. */
  | 'not-needed'
  | 'unknown'

export interface Step {
  id: StepId
  /** UBC's order: the assessment, then staging's registration, then production's (Spec action 9). */
  n: 1 | 2 | 3
  /** The first step not done; exactly one while any is not done, none when all are. */
  current: boolean
  kind: StepKind
  /** Never working: nothing measured in days moves (20-states.md). */
  state: Exclude<Five, 'working'>
  /** Who has it now, in words (Words proposed for Rich): "you", "the Manifest team", "UBC's Privacy Office"… */
  owner: string
  /** ClockItem's chip; a line's chip when not current. */
  chip: string
  /** ClockItem's clockLabel / clockMeta: "since 5 October" · "waiting 2 days". Empty on a step to come with nothing on file. */
  label: string
  meta: string
  /** Vancouver days it has waited, when it is waiting and its day can be read. */
  days: number | null
  /** One sentence more on the card (part two: "The Manifest team will be in touch…"); null when none. */
  note: string | null
  /** A step to come: what it waits for ("Next, once your trying-out address is registered."). */
  next: string | null
  /** What the current step's card offers. Always null while `sending` is false (Decision 3). */
  action: 'start' | 'check-and-send' | null
  /** F5's honest admission ("Manifest can't start this one for you yet."): only while `sending` is false. */
  admission: boolean
  /** The record behind it, for the card's body (Tasks 6, 7). */
  record: Schemas['IamRegistration'] | Schemas['PrivacyAssessment'] | null
}

export interface StepsInput {
  records: Schemas['LaunchRecords']
  readiness: Schemas['LaunchReadiness']
  now: Date
  timeZone?: string | undefined
  /** False until FE-46 lands: nothing can be sent, so nothing is the person's to press. */
  sending: boolean
}

const g = words.goingLive
const s = g.steps
const ORDER: readonly StepId[] = ['assessment', 'staging', 'production']

/** "18 September", in their own time zone: each moment by its own offset, never now's (F5's). */
export function dayWords(at: string, timeZone?: string): string | null {
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-US', {
    ...(timeZone === undefined ? {} : { timeZone }),
    day: 'numeric',
    month: 'long',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${part('day')} ${part('month')}`
}

/** The calendar day a moment falls on in Vancouver, as a count of days since the epoch. */
function vancouverDay(date: Date): number {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', {
    timeZone: VANCOUVER,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-')
    .map(Number)
  return Date.UTC(y!, m! - 1, d!) / 86_400_000
}

/**
 * Calendar days in Vancouver from `from` to `now` (Decision 2), whatever the person's own zone:
 * days, never hours, so a send at noon is "today" until Vancouver's midnight and a day across a
 * change of the clocks is still one day. 0 when `now` is earlier; null when `from` cannot be read.
 */
export function vancouverDays(from: string, now: Date): number | null {
  const at = new Date(from)
  if (Number.isNaN(at.getTime())) return null
  return Math.max(0, vancouverDay(now) - vancouverDay(at))
}

type Own = Omit<Step, 'id' | 'n' | 'current' | 'next' | 'record'>

/** One step alone, from its record and its checklist item: `current` and `next` are `stepsOf`'s. */
export function stepOf(
  id: StepId,
  input: {
    records: Schemas['LaunchRecords']
    items: readonly Schemas['LaunchReadinessItem'][]
    now: Date
    timeZone?: string | undefined
    sending: boolean
  },
): Step {
  const { records, items, now, timeZone, sending } = input
  const record =
    id === 'assessment'
      ? records.privacyAssessment
      : id === 'staging'
        ? records.stagingRegistration
        : records.iamRegistration
  return {
    id,
    n: id === 'assessment' ? 1 : id === 'staging' ? 2 : 3,
    current: false,
    next: null,
    record,
    ...own(id, record, records, items, now, timeZone, sending),
  }
}

function own(
  id: StepId,
  record: Step['record'],
  records: Schemas['LaunchRecords'],
  items: readonly Schemas['LaunchReadinessItem'][],
  now: Date,
  timeZone: string | undefined,
  sending: boolean,
): Own {
  const words = s[id]
  // The checklist's verdict: staging's registration has no item of its own (`active` is done).
  const item = items.find(
    (i) =>
      i.id ===
      (id === 'assessment'
        ? 'privacy-assessment'
        : id === 'production'
          ? 'iam-registration'
          : undefined),
  )
  const base = {
    note: null,
    days: null,
    action: null,
    admission: !sending,
  } as const
  /** Theirs to do once something can be sent (part two); the Manifest team's until then. */
  const theirs = (kind: StepKind, label: string, note: string, teamMeta: string): Own =>
    sending
      ? {
          ...base,
          kind,
          state: 'attention',
          owner: s.owners.you,
          chip: g.state.attention,
          label,
          meta: '',
          note,
          action: 'start',
        }
      : {
          ...base,
          kind,
          state: 'waiting',
          owner: s.owners.team,
          chip: s.withTeam,
          label,
          meta: teamMeta,
        }
  /** A wait from a day: its label and its Vancouver days, none when the day cannot be read. */
  const wait = (at: string | null, label: (day: string) => string) => {
    const day = at === null ? null : dayWords(at, timeZone)
    const days = at === null || day === null ? null : vancouverDays(at, now)
    return {
      label: day === null ? '' : label(day),
      meta: days === null ? '' : s.waiting(days),
      days,
    }
  }

  // (S1: M2, read from the platform's NOT_CWL_ITEM) An app that signs nobody in: the checklist's
  // registration item is met with no registration on file, and neither address registers anything.
  const signsNobodyIn =
    id !== 'assessment' &&
    records.iamRegistration === null &&
    items.some((i) => i.id === 'iam-registration' && i.state === 'met') &&
    (record === null || record.state === 'draft')
  if (signsNobodyIn)
    return {
      ...base,
      kind: 'not-needed',
      state: 'steady',
      owner: words.whose,
      chip: s.notNeeded,
      label: s.notNeededSaid,
      meta: '',
      admission: false,
    }

  const drafted =
    record !== null &&
    record.state === 'draft' &&
    ('draft' in record ? record.draft !== null : record.package !== null)
  if (
    record === null ||
    (record.state === 'draft' && !drafted && record.submittedAt === null)
  ) {
    // Nothing recorded, and the checklist counts it met: nothing more is needed (F5's).
    if (item?.state === 'met')
      return {
        ...base,
        kind: 'done',
        state: 'steady',
        owner: words.whose,
        chip: s.done,
        label: s.nothingNeeded,
        meta: '',
        admission: false,
      }
    return sending
      ? {
          ...base,
          kind: 'nothing',
          state: 'attention',
          owner: s.owners.you,
          chip: s.notStarted,
          label: s.nothingStarted,
          meta: s.duration,
          action: 'start',
        }
      : notStarted('nothing')
  }

  switch (record.state as string) {
    case 'draft':
      // (S1: M1, read from the platform's `recordPrivacyAssessment`: a return to `draft` keeps the
      // day it was sent, and nothing else does.) Sent back by the Privacy Office.
      if (record.submittedAt !== null)
        return theirs('sent-back', s.sentBack, s.sentBackNote, s.teamHasIt)
      return sending
        ? {
            ...base,
            kind: 'drafted',
            state: 'attention',
            owner: s.owners.you,
            chip: s.readyChip,
            label: s.ready,
            meta: '',
            action: 'check-and-send',
          }
        : notStarted('drafted')
    case 'sent': {
      // (FE-46) Our proposal's shape, `state: 'sent'` and `sentAt`: renamed at sitting 3's Step 0.
      const sentAt = (record as { sentAt?: string | null }).sentAt ?? null
      return {
        ...base,
        kind: 'sent',
        state: 'waiting',
        owner: s.owners.team,
        chip: s.withTeam,
        note: words.onward,
        ...wait(sentAt, s.sent),
      }
    }
    case 'submitted':
      return {
        ...base,
        kind: 'submitted',
        state: 'waiting',
        owner: words.whose,
        chip: words.with,
        // Waiting since the day it was sent: the record's own, else the checklist's `since`.
        ...wait(record.submittedAt ?? item?.since ?? null, s.since),
      }
    case 'change_requested':
      if ('changeRequestedFrom' in record && record.changeRequestedFrom === 'submitted')
        return theirs('asked', s.asked, s.askedNote, s.teamHasIt)
      // A change on file, with UBC (F5's S3), counted from the day it was filed: the platform stamps
      // `submittedAt` then, and a later edit of the record moves only `updatedAt` (the review's I2).
      return {
        ...base,
        kind: 'change',
        state: 'waiting',
        owner: words.whose,
        chip: words.with,
        ...wait(record.submittedAt ?? item?.since ?? record.updatedAt, s.changeAsked),
      }
    case 'expired':
      return sending
        ? theirs('expired', s.runOut.said, s.runOut.again, s.runOut.who)
        : {
            ...base,
            kind: 'expired',
            state: 'waiting',
            owner: s.owners.team,
            chip: s.withTeam,
            label: s.runOut.said,
            meta: s.runOut.who,
          }
    case 'active':
    case 'approved': {
      const at = 'registeredAt' in record ? record.registeredAt : record.approvedAt
      const done = words.done(at === null ? null : dayWords(at, timeZone))
      // Done on the record, unmet on the checklist: the Manifest team has it, never done.
      if (item?.state === 'unmet')
        return {
          ...base,
          kind: 'done-unmet',
          state: 'waiting',
          owner: s.owners.team,
          chip: s.withTeam,
          label: done,
          meta: s.needsChange,
        }
      return {
        ...base,
        kind: 'done',
        state: 'steady',
        owner: words.whose,
        chip: s.done,
        label: done,
        meta: '',
        admission: false,
      }
    }
    default: {
      // A state from a newer contract: only what is true.
      const day = dayWords(record.updatedAt, timeZone)
      return {
        ...notStarted('unknown'),
        owner: '',
        chip: s.cantTell,
        label: day === null ? '' : s.recorded(day),
      }
    }
  }

  function notStarted(kind: StepKind): Own {
    return {
      ...base,
      kind,
      state: 'notyet',
      owner: s.owners.team,
      chip: s.notStarted,
      label: s.nothingCounting,
      meta: s.duration,
    }
  }
}

/**
 * THE SEQUENCE: each step alone, then the first one not done is current (one card at a time,
 * `ClockItem`'s *"Two at most"*). A later step with nothing on file says only what it waits for:
 * **the nearest step before it not done**, never one already done (the review's I1); one with
 * something on file beyond a draft says its own state, and nothing it waits for (the design's §1).
 * **Only the current step is ever theirs** (the platform refuses a step out of order), so a later
 * one that would need them is not yet.
 */
export function stepsOf(input: StepsInput): [Step, Step, Step] {
  const each = ORDER.map((id) =>
    stepOf(id, {
      records: input.records,
      items: input.readiness.items,
      now: input.now,
      timeZone: input.timeZone,
      sending: input.sending,
    }),
  )
  const at = each.findIndex((step) => step.state !== 'steady')
  const steps = each.map((step, i): Step => {
    if (at === -1 || i < at || step.state === 'steady') return step
    if (i === at) return { ...step, current: true }
    // Nothing on file (or a draft): its line says only what it waits for.
    if (step.kind === 'nothing' || step.kind === 'drafted') {
      const before = each
        .slice(0, i)
        .reverse()
        .find((earlier) => earlier.state !== 'steady')!
      return {
        ...step,
        next: s.waitsFor[before.id === 'assessment' ? 'assessment' : 'staging'],
        state: 'notyet',
        chip: s.notStarted,
        label: '',
        meta: '',
        days: null,
        note: null,
        action: null,
      }
    }
    return step.state === 'attention'
      ? { ...step, state: 'notyet', chip: g.state.notyet, action: null }
      : step
  })
  return [steps[0]!, steps[1]!, steps[2]!]
}

/**
 * THE OVERVIEW'S BAND (Task 3; F5's Decision 3): while any step is not done and the app has not
 * launched. *[Start them]* while step 1 has nothing on file and something can be sent; else
 * *[Going live]*. Its state is the current step's: *needs you* only while that step is theirs.
 */
export function bandOf(
  steps: readonly Step[],
  launched: boolean,
  sending: boolean,
): { button: 'start' | 'going-live'; state: Five } | null {
  if (launched) return null
  const current = steps.find((step) => step.current)
  if (current === undefined) return null
  return {
    button:
      sending && current.n === 1 && current.kind === 'nothing' ? 'start' : 'going-live',
    state: current.state,
  }
}

/** A step's state inside another page's sentence (*Trying out*'s line): "with UBC's identity team, waiting 4 days". */
export function phraseOf(step: Step): string {
  const p = s.phrase
  const waited = step.days === null ? null : s.waiting(step.days)
  switch (step.kind) {
    case 'nothing':
    case 'drafted':
      return step.state === 'attention' ? p.yours : p.notStarted
    case 'submitted':
    case 'change':
      return p.with(s[step.id].whose, waited)
    case 'sent':
      return p.with(s.owners.team, waited)
    case 'asked':
    case 'sent-back':
    case 'expired':
    case 'done-unmet':
      return step.state === 'attention' ? p.yours : p.with(s.owners.team, null)
    case 'done':
      return p.done
    case 'not-needed':
      return p.notNeeded
    case 'unknown':
      return p.cantTell
  }
}
