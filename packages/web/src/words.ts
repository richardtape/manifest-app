/**
 * EVERY SENTENCE WE SHOW (F1 Decision 9), copied from the walk-through, which is the design.
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
    /** The keyboard's first stop, so it can reach the page and not only the rail. */
    skipToContent: 'Skip to content',
  },
  /** Rich's click-through: the person, from the rail, with Sign out on it. */
  profile: {
    title: 'Your profile',
    name: 'Name',
    email: 'Email',
    source: 'UBC tells us these when you sign in with CWL.',
  },
  expired: {
    body: "You've been signed out. It happens after twelve hours. Sign in again and you'll come straight back here.",
    button: 'Sign in again',
  },
  unreachable: {
    /** Moment 2's words, in full (the final review): when to try, as well as that they can. */
    body: "We can't reach Manifest just now. Nothing of yours has changed. Try again in a minute.",
    button: 'Try again',
  },
  /** Review Focus 5: a refusal we do not name. Its code goes to the console, never here. */
  refused: {
    body: 'Something went wrong on our side. Nothing of yours has changed.',
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
    /** On an app's own page, until a later plan builds it. */
    appPageNext: "An app's own page arrives next.",
  },
  /** Moments 2 and 16. */
  yourApps: {
    empty: "Nothing yet. Tell us what your course needs, and we'll build it.",
    describe: 'Describe what you need',
    /** Rich's wording, 2026-09-27: the lead time, known before anyone needs it (§13). */
    leadTime:
      'Making an app takes an afternoon. Letting your students in takes a little longer, while we move it through the steps that keep the app, and their data, safe and secure.',
    forStudents: 'For your students',
    draft: 'Your draft',
    tryingOut: 'For trying out',
  },
  /**
   * WHAT AN ADDRESS IS DOING, in the product's five states and never the platform's words
   * (C3). The working ones are the deploy's own stations (moment 9).
   */
  facts: {
    notLive: 'Not live yet',
    answering: 'Answering',
    versionFrom: 'the version from',
    waitingItsTurn: 'Waiting its turn',
    makingRoom: 'Making room',
    startingUp: 'Starting up',
    wakingUp: 'Waking up',
    neverAnswered: 'It never answered',
    asleep: 'Asleep until somebody opens it',
    switchedOff: 'Switched off',
    cantTell: "We can't tell right now",
  },
  /**
   * MOMENT 3, DESCRIBE IT (F2). The walk-through's words, and Rich's for the limits (after
   * F2 sitting 1): whose limit, and when it resets, in the person's own time zone.
   */
  describe: {
    tab: 'Describe what you need',
    title: 'What do you need?',
    lead: "Say it as you'd say it to a colleague.",
    label: 'In your own words',
    hint: 'Three sentences is plenty.',
    carryOn: 'Carry on',
    asideTitle: 'Nothing is built yet',
    aside:
      'Next, we say back what we understood and suggest a name. Nothing exists until you agree.',
    questionsTitle: 'A few questions, so we build the right thing.',
    skip: 'Skip these — use your best guess',
    couldntRead:
      "We couldn't read that just now. Your words are kept. Try again, or name it yourself.",
    /** Rich's (2026-09-27): the walk-through names the two ways on, not their buttons. */
    tryAgain: 'Try again',
    nameItYourself: 'Name it yourself',
    pausedToday: (when: string) =>
      `You've described as many new apps today as one person can. That resets at ${when}. You can still name it yourself.`,
    pausedForEveryone: (when: string) =>
      `Describing new apps is paused for everyone until ${when}, when this month's allowance resets. You can still name it yourself.`,
    /** Rich's, agreed 2026-09-27. */
    waitingOnAdmin:
      'Describing new apps is waiting on a Manifest administrator. You can still name it yourself.',
  },
  /**
   * EACH STEP, BY ITS KEY (the server sends keys: words live here). "Reading it" is the
   * walk-through's; the other two are Rich's (2026-09-27).
   */
  steps: {
    understanding: 'Reading it',
    naming: 'Thinking of names',
    blueprint: 'Choosing how to build it',
  },
  /** MOMENT 4, NAME IT (F2): the walk-through's words, with sitting 5's two things. */
  nameIt: {
    tab: 'Name it',
    understoodTitle: 'What we understood',
    notIt: "That's not it",
    cannotOne: (thing: string) =>
      `One thing we can't do yet: ${thing}. Everything else, we can.`,
    cannotMany: (things: string) =>
      `Some things we can't do yet: ${things}. Everything else, we can.`,
    callTitle: 'What should we call it?',
    somethingElse: 'Something else',
    /** Rich's (2026-09-27). */
    nameLabel: 'Its name',
    changeAddress: 'Change the address',
    addressLabel: 'Its address',
    /** The prototype's FormField hint. */
    addressHint: 'Lower case, hyphens between words. This becomes its web address.',
    /** Rich's (2026-09-27): free now, and not yet theirs. */
    addressFree: (address: string) => `Free. It will live at ${address}.`,
    /** Added to SLUG_TAKEN when the platform gives no hint of its own. */
    takenExtra: 'Pick another, or ask its owner to add you.',
    whoTitle: 'Who is going to use it?',
    scale: {
      solo: { title: 'Just me', note: 'I am the only person who will open it' },
      class: { title: 'One class', note: 'A section or a seminar group' },
      large_course: { title: 'A large course', note: 'Hundreds of students at once' },
      public: { title: 'Anyone at all', note: 'Open beyond UBC' },
    },
    howTitle: 'How do they turn up?',
    burst: {
      steady: { title: 'They come and go', note: 'Spread across a week' },
      synchronised: { title: 'All at once', note: 'A deadline, or during a lab' },
    },
    guessedFrom: (from: string) => `We guessed from '${from}'.`,
    whyLabel: 'In a sentence, why',
    whyHint:
      'Optional. Shown to the people who size it, for a large course or an open app.',
    worthKnowingTitle: 'Worth knowing now',
    worthKnowing:
      "You can rename it whenever you like. Its address can't change once it's live, because UBC registers it.",
    /** FE-15. */
    footer:
      "Who it's for sets how much room we give it. You can't change that yet. Ask us and we'll do it by hand.",
    makeIt: 'Make it',
    /** Until F2's Task 8 builds it. Rich's (2026-09-27). */
    makingNext: 'Making it arrives next.',
  },
  /**
   * MOMENT 4'S END, MAKING IT (F2 Task 8): three lines, each ticking on its real event from
   * the project's stream, and what is said when making it goes wrong. The walk-through's.
   */
  making: {
    yours: (name: string) => `${name} is yours.`,
    startingPoint: 'A starting point with CWL sign-in is in place.',
    addresses: 'Its three addresses are ready.',
    couldntMake: "We couldn't make it just now. Nothing was made. Try again.",
    madeNotStarted: (name: string) =>
      `${name} is made, but we couldn't start work on it. Nothing is lost.`,
    startBuilding: 'Start building',
  },
  /** DECISION 11 (Rich): every problem shown carries a reference the person can quote. */
  reference: {
    line: (reference: string) => `If you contact support, quote ${reference}.`,
    copy: 'Copy',
    copied: 'Copied',
  },
  /** §24's two answers, in words. */
  audience: {
    scale: {
      solo: 'just you',
      class: 'one class',
      large_course: 'a large course',
      public: 'anyone at all',
    },
    burst: {
      steady: 'coming and going',
      synchronised: 'all arriving at once',
    },
  },
} as const
