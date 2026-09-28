/**
 * MOMENT 4, PURE (F2 Task 7): an address from a name, and which suggestions may be offered.
 * Every suggestion is checked with `checkSlug` before it is shown (Decision 8), so none
 * offered is taken; fewer than two left asks for another round (Review Focus 3).
 */

/** The platform's slug rule, as the naming agent's schema states it. */
const MAX = 39

export function slugFor(name: string): string {
  let slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug === '') return 'app'
  if (!/^[a-z]/.test(slug) || slug.length < 3) slug = `app-${slug}`
  return slug.slice(0, MAX).replace(/-+$/, '')
}

/** The platform's reason, as it gave it: its code, its message, and its hint, never rewritten. */
export type Reason = { code: string; message: string; hint?: string }

export type Offer =
  | { name: string; slug: string; available: true }
  | { name: string; slug: string; available: false; reasons: Reason[] }

export function offerable(offers: Offer[]): Offer[] {
  return offers.filter((offer) => offer.available)
}

export function needAnotherRound(offers: Offer[]): boolean {
  return offerable(offers).length < 2
}

/**
 * THE ADDRESS A PERSON WILL BE GIVEN: production answers at `<slug>.manifest.internal` on the
 * laptop (spec §23). A hostname is allowed on screen, in mono (C3).
 */
export function addressOf(slug: string): string {
  return `${slug}.manifest.internal`
}
