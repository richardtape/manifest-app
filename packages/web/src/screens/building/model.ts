import type { RoundView } from '@manifest-app/server/progress'
import type { State } from '@manifest-app/ui'
import { words } from '../../words.js'

/**
 * MOMENT 6'S SMALL RULES, AS DATA (F3 Task 11): what the chip says, how money and times are
 * written, and how the platform's words become lines. Words come from words.ts, never here.
 */

/** "$2", "$0.40", "$9.60": whole dollars stay whole. */
export const money = (usd: number): string =>
  Number.isInteger(usd) ? `$${usd}` : `$${usd.toFixed(2)}`

/** The refusals that wait on an administrator, as the plan screen reads them. */
export const ADMIN = new Set(['MODEL_NOT_AVAILABLE', 'MODEL_GATEWAY_REFUSED'])
/** FE-37: the IdP refused the draft's sign-in: Manifest's to put right. */
export const SIGN_IN_REFUSED = 'SIGN_IN_REFUSED'

/**
 * The five states only: where the round is, and who has it. `whose`: the conversation's person,
 * when the reader is someone else (F6b D3): its wait is theirs, never "you".
 */
export function chipOf(
  round: RoundView | null,
  whose: string | null = null,
): {
  state: State
  label: string
  pulse?: boolean
} {
  const chip =
    whose === null
      ? words.building.chip
      : {
          ...words.building.chip,
          paused: words.together.paused(whose),
          needsYou: words.together.needs(whose),
        }
  const working = { state: 'working' as const, label: chip.working }
  if (round === null) return working
  const needs = round.needs
  switch (round.status) {
    case 'working':
      return working
    case 'paused':
      return { state: 'attention', label: chip.paused }
    case 'stopped':
      // Rich: a Stop they chose is still, not red.
      return { state: 'notyet', label: chip.stopped, pulse: false }
    case 'interrupted':
      return { state: 'attention', label: chip.needsYou }
    case 'done':
      return { state: 'steady', label: chip.built }
    case 'needs-you':
      // A token is handed over without a word: nothing waits on them.
      if (needs?.kind === 'token') return working
      if (needs?.kind === 'unreachable')
        return { state: 'waiting', label: chip.waitingOn[needs.what] }
      if (needs?.kind === 'refused' && ADMIN.has(needs.code))
        return { state: 'waiting', label: chip.waitingOn.admin }
      if (needs?.kind === 'refused' && needs.code === SIGN_IN_REFUSED)
        return { state: 'waiting', label: chip.waitingOn.platform }
      return { state: 'attention', label: chip.needsYou }
  }
}

/** The platform's own words, one line each: an incident's log is one string of many. */
export const linesOf = (exact: string[]): string[] =>
  exact.flatMap((words) => words.replace(/\n+$/, '').split('\n'))

/** "28 Sep, 9:12am", in their own time zone: an earlier round, folded. */
export function foldedWhen(at: Date, timeZone: string | undefined): string {
  // en-US's parts, put in our order: en-GB's short month is "Sept" in current ICU, and the
  // walk-through writes "Sep".
  const parts = new Intl.DateTimeFormat('en-US', {
    ...(timeZone === undefined ? {} : { timeZone }),
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(at)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${part('day')} ${part('month')}, ${part('hour')}:${part('minute')}${part('dayPeriod').toLowerCase()}`
}

/** The draft address as a person reads it: its host, in mono. */
export function hostOf(address: string): string {
  try {
    return new URL(address).host
  } catch {
    return address
  }
}
