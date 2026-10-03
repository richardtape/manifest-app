import { words } from '../../words.js'

/**
 * F6b TASK 8: THE KIND OF CHANGE (design §1, Decision 8), pure. The platform's seven sensitive
 * fields in our words; a change naming none can go straight to the students once tried, and any
 * other needs a Manifest administrator's look. What reaches the students is the checklist's to
 * decide (Task 10): this says only what the round's commits changed.
 */
export const SENSITIVE_WORDS: Record<string, string> = words.building.kind.fields

/** `[]`: straight to the students; else the look, each field once, an unknown one generically. */
export function kindWords(sensitive: string[]): string {
  const k = words.building.kind
  if (sensitive.length === 0) return k.straight
  const said = [
    ...new Set(
      sensitive.map((field) =>
        Object.hasOwn(SENSITIVE_WORDS, field) ? SENSITIVE_WORDS[field]! : k.unknown,
      ),
    ),
  ]
  return k.look(k.joined(said))
}
