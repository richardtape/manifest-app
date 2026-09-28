/**
 * EVERY SENTENCE F1 SHOWS (Decision 9), copied from the walk-through, which is the design.
 * The prototype's words were a starting point; where the walk-through changed one, this is
 * the walk-through's. A screen never writes a sentence of its own.
 */
export const words = {
  signIn: {
    /** The tab's title, as the prototype names it. */
    tab: 'Sign in to Manifest',
    hero: 'Build the tool your course needs.',
    lead: 'Describe it. We build it, sign your students in with CWL, and run it at a UBC address.',
    ticks: [
      'Nothing to install',
      'Nothing to keep patched',
      'No configuration files, ever',
    ],
    title: 'Sign in',
    body: "You'll go to UBC's own sign-in page and come straight back.",
    button: 'Continue with CWL',
    /** Moment 1: changed from the prototype, because sitting 5 asks UBC for `uid`. */
    note: 'Manifest never sees your password. UBC tells us your name, your email and your CWL login.',
  },
  shell: {
    /** The tab's title where a page has no name of its own. */
    manifest: 'Manifest',
    yourApps: 'Your apps',
    startNew: 'Start something new',
  },
  expired: {
    body: "You've been signed out. It happens after twelve hours. Sign in again and you'll come straight back here.",
    button: 'Sign in again',
  },
  unreachable: {
    body: "We can't reach Manifest just now. Nothing of yours has changed.",
    button: 'Try again',
  },
  signOut: {
    title: 'Sign out',
    button: 'Sign out',
    failed: "We couldn't sign you out. Close the browser to be sure.",
  },
  notFound: {
    body: "There's nothing here.",
    link: 'Your apps',
  },
} as const
