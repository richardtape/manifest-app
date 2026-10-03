import { words } from '../../words.js'

/**
 * F6b TASK 6: WHO THEY TYPED, AS THE PLATFORM NAMES SOMEONE (moment 18): an `@` makes it an email,
 * anything else a CWL login, trimmed. The platform matches either whatever its case.
 */
export function whoOf(typed: string): { email: string } | { cwlLogin: string } {
  const who = typed.trim()
  return who.includes('@') ? { email: who } : { cwlLogin: who }
}

/**
 * THE FOUR REFUSALS THE DESIGN WORDS (§2), each saying what is still true; anything else is null,
 * and the page says its general words with a support reference.
 */
export function refusalWords(code: string): string | null {
  const refused: Record<string, string> = words.people.refused
  return Object.hasOwn(refused, code) ? refused[code]! : null
}
