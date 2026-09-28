import { words } from '../words.js'

/**
 * HOW MUCH WE READ AT ONCE, in characters: our server's `LIMITS` (progress.ts), which this
 * page imports for its types only, so this is a copy, held equal by limits.test.ts.
 */
export const LIMITS = {
  /** Their words, moment 3. */
  description: 4000,
  /** An answer to a question, a correction, an answer to what only they know. */
  sentence: 500,
} as const

/** From here, a quiet count: near the limit, never before. */
const NEAR = 0.9

/**
 * WHAT A FIELD SAYS ABOUT ITS LENGTH (F2's deferred Minor, Rich: say the limits): nothing
 * far from the limit, a count near it, and past it that it is too long, in words. Their
 * text is never cut: what they pasted stays, and what sends it waits.
 */
export function countOf(
  value: string,
  limit: number,
): { text: string; over: boolean } | undefined {
  if (value.length < limit * NEAR) return undefined
  const [typed, most] = [value.length, limit].map((n) => n.toLocaleString('en-CA'))
  return value.length > limit
    ? { text: words.limits.over(typed!, most!), over: true }
    : { text: words.limits.count(typed!, most!), over: false }
}

/** Too long to send. */
export const tooLong = (value: string, limit: number) => value.length > limit

/** A FormField's `count` for a sentence (500), or nothing: spread into its props. */
export const countProp = (value: string): { count?: { text: string; over: boolean } } => {
  const count = countOf(value, LIMITS.sentence)
  return count === undefined ? {} : { count }
}
