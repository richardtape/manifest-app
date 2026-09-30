import type { Schemas } from '@manifest/contract'
import { words } from '../../words.js'

/**
 * THE TWO CLOCKS (F5 Task 6, Decisions 4 and 5), derived here and nowhere else, and pure. A card
 * says only what the record an administrator keeps says: not started, with someone (still, and
 * counting the days since it was recorded), or done. Never working: a person holds a clock, and
 * nothing measured in days moves (20-states.md).
 */
export interface Clock {
  which: 'registration' | 'assessment'
  state: 'notyet' | 'waiting' | 'steady'
  chip: string
  /** The bar's two sides (ClockItem's `clockLabel` and `clockMeta`). */
  label: string
  meta: string
  /** The honest admission: Manifest cannot start it yet, and the team does it by hand. */
  admission: boolean
}

const c = words.goingLive.clocks

/** "18 September", in their own time zone: each moment by its own offset, never now's. */
function dayWords(at: string, timeZone?: string): string | null {
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

/** The calendar day a moment falls on in the zone, as a count of days (the F2 trap's day). */
function dayNumber(date: Date, timeZone?: string): number {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', {
    ...(timeZone === undefined ? {} : { timeZone }),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-')
    .map(Number)
  return Date.UTC(y!, m! - 1, d!) / 86_400_000
}

export function clockOf(
  which: Clock['which'],
  record: Schemas['IamRegistration'] | Schemas['PrivacyAssessment'] | null,
  now: Date,
  timeZone?: string,
): Clock {
  const own = c[which]
  const notStarted: Clock = {
    which,
    state: 'notyet',
    chip: c.notStarted,
    label: c.nothingCounting,
    meta: c.duration,
    admission: true,
  }
  if (record === null || record.state === 'draft') return notStarted
  const recorded = dayWords(record.updatedAt, timeZone)
  const waiting = (chip: string, label: string, meta: string): Clock => ({
    which,
    state: 'waiting',
    chip,
    label,
    meta,
    admission: true,
  })
  switch (record.state) {
    case 'submitted': {
      const days =
        dayNumber(now, timeZone) - dayNumber(new Date(record.updatedAt), timeZone)
      return waiting(
        own.with,
        recorded === null ? '' : c.recorded(recorded),
        c.waiting(days),
      )
    }
    case 'change_requested':
      return waiting(c.withTeam, c.changeAsked.said, c.changeAsked.who)
    case 'expired':
      return waiting(c.withTeam, c.runOut.said, c.runOut.who)
    case 'active':
    case 'approved': {
      const at = 'registeredAt' in record ? record.registeredAt : record.approvedAt
      return {
        which,
        state: 'steady',
        chip: c.done,
        label: own.done(at === null ? null : dayWords(at, timeZone)),
        meta: '',
        admission: false,
      }
    }
    default:
      // A state from a newer contract: only what is true (Review Focus 5).
      return {
        ...notStarted,
        chip: c.cantTell,
        label: recorded === null ? '' : c.recorded(recorded),
      }
  }
}
