import type { Schemas } from '@manifest/contract'

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
