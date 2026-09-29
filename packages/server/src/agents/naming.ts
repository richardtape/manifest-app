import { z } from 'zod/v4'
import type { Check, Message, Model } from '../model/client.js'

/**
 * THE NAMING AGENT (agents.md; walk-through moment 4): three to five names. **The model writes
 * names only, and our code makes each address** (F4 Task 4, Rich: the real model offered
 * addresses as names in every F3 walk). The browser checks every address with `checkSlug` before
 * it shows one (Decision 8); the ones it found taken come back here, and the prompt names them
 * (Review Focus 3).
 */
export const Names = z.object({
  names: z
    .array(z.object({ name: z.string().min(1).max(80) }))
    .min(3)
    .max(5),
})
/** What the page is given, as before: each name with the address we made from it. */
export type Named = { names: { name: string; slug: string }[] }

/** A project's address as the platform takes it (openapi.json): a letter first, 3 to 39. */
const ADDRESS = /^[a-z][a-z0-9-]{2,38}$/
const LONGEST = 39
/** A name that reads like an address: words joined by hyphens, with no space between any. */
const ADDRESS_LIKE = /^\S+-\S+$/

/**
 * OURS: THE ADDRESS A NAME MAKES. Lower case, accents dropped; each run of anything else one
 * hyphen; trimmed to 39 at a hyphen, never mid-word; a letter first. Null when it makes none.
 */
export function slugOf(name: string): string | null {
  let slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug.length > LONGEST) {
    const cut = slug.slice(0, LONGEST)
    const atWord = slug[LONGEST] === '-' || cut.lastIndexOf('-') === -1
    slug = (atWord ? cut : cut.slice(0, cut.lastIndexOf('-'))).replace(/-+$/, '')
  }
  return ADDRESS.test(slug) ? slug : null
}

export const NAMING_PROMPT = [
  'You suggest names for a small web app a university instructor has described. You are one of a team, and you always speak as "we".',
  'Suggest three names, or up to five. Each is short and plain, and says what the app is for as its students would say it: "Reading responses", not "RR Portal".',
  "A name is words people read, with spaces: 'Reading responses'. Never write an address: we make it.",
  "We make each name's address from its words, in lower case with hyphens: 'Reading responses' becomes reading-responses. Never suggest a name whose address you are told is taken.",
  'Never use technical words: say what people see and do.',
].join('\n')

function checkedAgainst(taken: string[]): Check<z.infer<typeof Names>> {
  return ({ names }) => {
    if (names.some((n) => /[\r\n]/.test(n.name) || n.name.trim() === ''))
      return 'a name that is not one line'
    if (names.some((n) => ADDRESS_LIKE.test(n.name.trim())))
      return 'a name that reads like an address'
    const slugs = names.map((n) => slugOf(n.name))
    if (slugs.some((slug) => slug === null)) return 'a name that makes no address'
    if (new Set(slugs).size !== names.length) return 'an address twice'
    if (new Set(names.map((n) => n.name.trim().toLowerCase())).size !== names.length)
      return 'a name twice'
    if (slugs.some((slug) => taken.includes(slug!))) return 'an address already taken'
    return null
  }
}

export async function suggestNames(
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
  const { names } = await model.complete('naming', Names, messages, checkedAgainst(taken))
  // The check made sure each name makes an address.
  return { names: names.map(({ name }) => ({ name: name.trim(), slug: slugOf(name)! })) }
}
