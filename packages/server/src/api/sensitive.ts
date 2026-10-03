/**
 * F6b DECISION 8: THE SENSITIVE FIELDS A CHANGE TOUCHES, as one list: the platform's seven in its
 * order (`spec/diff.ts`'s SENSITIVE_FIELDS), any other after them, each once. Pure.
 */
const SENSITIVE_ORDER = [
  'services',
  'auth.attributes',
  'egress.allow',
  'resources',
  'data.classification',
  'ai.models',
  'blueprint',
]

/** Both lists, each field once, in the platform's order. */
export function unionOf(kept: string[], more: string[]): string[] {
  const rank = (field: string) => {
    const at = SENSITIVE_ORDER.indexOf(field)
    return at === -1 ? SENSITIVE_ORDER.length : at
  }
  return [...new Set([...kept, ...more])]
    .map((field, seen) => ({ field, seen }))
    .sort((a, b) => rank(a.field) - rank(b.field) || a.seen - b.seen)
    .map(({ field }) => field)
}
