import { words } from '../../words.js'

/**
 * MOMENT 3'S REFUSALS, IN WORDS (Rich's, after F2 sitting 1). Read by code, never by
 * message. A limit says whose it is and when it resets, in the person's own time zone; each
 * goes on to Name it with no suggestions. A gateway that did not answer may be tried again.
 */

/** The platform's month resets at the first of the next month, 00:00 UTC (the contract's rule). */
export function monthResetsAt(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

/** Vancouver's wall clock at an instant, read as if it were UTC's. */
function vancouverWall(at: Date): {
  wall: number
  year: number
  month: number
  day: number
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Vancouver',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(at)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value)
  const [year, month, day] = [part('year'), part('month'), part('day')]
  const wall = Date.UTC(
    year,
    month - 1,
    day,
    part('hour'),
    part('minute'),
    part('second'),
  )
  return { wall, year, month, day }
}

/** How far Vancouver's clock is from UTC's at an instant. */
const vancouverOffset = (at: Date) =>
  vancouverWall(at).wall - Math.floor(at.getTime() / 1000) * 1000

/**
 * A person's day resets at midnight in Vancouver (the contract's rule). TOMORROW'S midnight
 * on TOMORROW'S clock: on the nights the clocks change, now's offset is an hour off at
 * midnight (the final review's Minor, fixed at Rich's word).
 */
export function vancouverMidnightAfter(now: Date): Date {
  const { year, month, day } = vancouverWall(now)
  const nextMidnight = Date.UTC(year, month - 1, day + 1)
  const guess = new Date(nextMidnight - vancouverOffset(now))
  return new Date(nextMidnight - vancouverOffset(guess))
}

/** "5pm", "5:30pm", or "midnight", in the person's own zone. */
function timeWords(at: Date, timeZone: string | undefined): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    ...(timeZone === undefined ? {} : { timeZone }),
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(at)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  if (part('hour') === '12' && part('minute') === '00' && part('dayPeriod') === 'AM')
    return 'midnight'
  const minutes = part('minute') === '00' ? '' : `:${part('minute')}`
  return `${part('hour')}${minutes}${part('dayPeriod').toLowerCase()}`
}

/** "5pm on 30 September". */
export function whenWords(at: Date, timeZone: string | undefined): string {
  const day = new Intl.DateTimeFormat('en-GB', {
    ...(timeZone === undefined ? {} : { timeZone }),
    day: 'numeric',
    month: 'long',
  }).format(at)
  return `${timeWords(at, timeZone)} on ${day}`
}

export type IntakeRefused = { words: string; then: 'naming' | 'choose' }

export function intakeRefused(
  code: string,
  now = new Date(),
  timeZone?: string,
): IntakeRefused {
  switch (code) {
    case 'INTAKE_DAILY_LIMIT_REACHED':
      return {
        words: words.describe.pausedToday(
          timeWords(vancouverMidnightAfter(now), timeZone),
        ),
        then: 'naming',
      }
    case 'INTAKE_BUDGET_EXHAUSTED':
      return {
        words: words.describe.pausedForEveryone(whenWords(monthResetsAt(now), timeZone)),
        then: 'naming',
      }
    case 'INTAKE_MODEL_UNAVAILABLE':
    case 'AI_CATALOGUE_DISABLED':
      return { words: words.describe.waitingOnAdmin, then: 'naming' }
    case 'AI_BACKEND_UNAVAILABLE':
    case 'UNREACHABLE':
      return { words: words.describe.couldntRead, then: 'choose' }
    default:
      return { words: words.refused.body, then: 'naming' }
  }
}
