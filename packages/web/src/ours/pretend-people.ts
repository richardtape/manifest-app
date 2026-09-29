/**
 * THE PRETEND PEOPLE: OURS, NOT THE PLATFORM'S (FE-3; F4 Decision 3). The draft signs people in
 * with a pretend IdP, and nothing in the platform's API says who its pretend people are, or their
 * logins. Until it does (FE-3 (a)), these are the laptop's local IdP's own
 * (`infra/idp/config/authsources.php` in manifest, read 2026-09-28), and this module is the one
 * place that says so. When the platform publishes them, this becomes one read.
 *
 * Drawn on the draft tab only, never on *Trying out* or *For your students* (Rich).
 */
export const PRETEND_PEOPLE: {
  who: 'student' | 'instructor'
  login: string
  password: string
}[] = [
  { who: 'student', login: 'student', password: 'student' },
  { who: 'instructor', login: 'instructor', password: 'instructor' },
]
