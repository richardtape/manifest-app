import { words } from '../../words.js'

/**
 * F6b TASK 9: A NEW DETAIL, IN WORDS (Decision 9), pure. Each detail UBC's identity team has not
 * registered, in our words, each once; one we do not know, or none we could read, generically.
 */
export function detailWords(details: string[]): string {
  const d = words.building.detail
  const said = [
    ...new Set(
      (details.length === 0 ? [''] : details).map((detail) =>
        Object.hasOwn(d.details, detail) ? d.details[detail]! : d.unknown,
      ),
    ),
  ]
  return words.building.kind.joined(said)
}

/** DECISION 10: [Leave it out]'s change, its first words: the detail left out of their change. */
export function leaveOutWords(details: string[], title: string): string {
  const d = words.building.detail
  return d.leaveOutChange(
    details.length === 0 ? d.theUnknown : detailWords(details),
    title,
  )
}
