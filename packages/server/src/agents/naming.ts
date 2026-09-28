import { z } from 'zod/v4'
import type { Check, Message, Model } from '../model/client.js'

/**
 * THE NAMING AGENT (agents.md; walk-through moment 4): three to five names, each with its
 * address. The browser checks every address with `checkSlug` before it shows one (Decision
 * 8); the ones it found taken come back here, and the prompt names them (Review Focus 3).
 */
export const Names = z.object({
  names: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        slug: z.string().regex(/^[a-z][a-z0-9-]{2,38}$/),
      }),
    )
    .min(3)
    .max(5),
})
export type Named = z.infer<typeof Names>

export const NAMING_PROMPT = [
  'You suggest names for a small web app a university instructor has described. You are one of a team, and you always speak as "we".',
  'Suggest three names, or up to five. Each is short and plain, and says what the app is for as its students would say it: "Reading responses", not "RR Portal".',
  'Each name has an address made from it: lower-case letters, digits and hyphens, starting with a letter, from 3 to 39 characters, such as "reading-responses".',
  'Never suggest an address you are told is taken.',
  'Never use technical words: say what people see and do.',
].join('\n')

function checkedAgainst(taken: string[]): Check<Named> {
  return ({ names }) => {
    if (new Set(names.map((n) => n.slug)).size !== names.length) return 'an address twice'
    if (new Set(names.map((n) => n.name.trim().toLowerCase())).size !== names.length)
      return 'a name twice'
    if (names.some((n) => taken.includes(n.slug))) return 'an address already taken'
    if (names.some((n) => /[\r\n]/.test(n.name) || n.name.trim() === ''))
      return 'a name that is not one line'
    return null
  }
}

export function suggestNames(
  model: Model,
  restatement: string,
  taken: string[],
): Promise<Named> {
  const user =
    taken.length === 0
      ? `The app: ${restatement}`
      : `The app: ${restatement}\n\nThese addresses are taken, so suggest none of them: ${taken.join(', ')}`
  const messages: Message[] = [
    { role: 'system', content: NAMING_PROMPT },
    { role: 'user', content: user },
  ]
  return model.complete('naming', Names, messages, checkedAgainst(taken))
}
