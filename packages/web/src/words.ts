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
    /** Moment 5's two, the walk-through's. */
    reading: 'Reading how apps like this are built',
    writing: 'Writing the plan',
    /** Rich's (2026-09-27, F2 sitting 5): the agreed plan committed as docs/plan.md. */
    agreeing: 'Saving the plan with your app',
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
    /** The address could not be checked: ours or the platform's, never theirs (a deferred Minor). */
    couldntCheck: "We couldn't check that address just now.",
    checkAgain: 'Check it again',
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
    /** Two windows pressed Make it, and the other's reached us first (a deferred Minor). */
    madeElsewhere:
      "This was already made in another window. We're carrying on with that one.",
    startBuilding: 'Start building',
  },
  /**
   * MOMENT 5, THE PLAN (F2 Task 9): the walk-through's words; Rich's for the allowance and
   * for what the plan waits on, and for the few sitting 5 worded (2026-09-27), marked.
   */
  plan: {
    title: "Here's what we'd build",
    lead: 'Read it as a description of the finished thing, not as instructions. Anything wrong, say so in a sentence.',
    rows: {
      studentsSee: 'What students see',
      youSee: 'What you see',
      itKeeps: 'What it keeps',
      whoGetsIn: 'Who gets in',
      ai: 'AI',
    },
    /** Rich's (2026-09-27): a row a correction changed. */
    changed: 'Changed',
    assumedTitle: 'Things we assumed',
    /** The walk-through's "Two things only you know"; the one-question form Rich's (2026-09-27). */
    onlyYouKnow: (count: number) =>
      count === 1 ? 'One thing only you know' : 'Two things only you know',
    yesTitle: 'Say yes and this happens',
    yesBody:
      'We build it on your draft address, and you watch. You can leave; it keeps going.',
    yes: 'Yes, build that',
    notQuite: 'Not quite — let me correct it',
    /** Rich's (2026-09-27): the one sentence box. */
    correctionLabel: 'In a sentence, what should change',
    /** Rich's (after F2 sitting 1): whose allowance, and when it resets, in their own time. */
    allowanceUsed: (amount: string, when: string) =>
      `You've used your ${amount} AI allowance for this month. It resets at ${when}. Nothing is lost; this plan will be here.`,
    /** Rich's, agreed 2026-09-27. */
    waitingOnAdmin:
      'Writing plans is waiting on a Manifest administrator. Nothing is lost.',
    /** Rich's, agreed 2026-09-27. */
    couldntWrite: "We couldn't write the plan just now. Nothing is lost.",
    /** The walk-through's: the plan came back malformed twice. */
    didntComeOut: "The plan didn't come out right. Try again. Nothing was built.",
    /** Rich's (2026-09-27): the agreed plan could not be committed. */
    couldntSave: "We couldn't save the plan with your app just now. Nothing is lost.",
    /** A window behind said yes to a plan corrected in another (a deferred Minor). */
    changedElsewhere: 'The plan changed in another window. Read it again, then say yes.',
  },
  /**
   * MOMENT 6, WATCHING IT GET BUILT (F3 Task 11): the walk-through's words, and Rich's; ours
   * where neither has any, marked "ours".
   */
  building: {
    /** The five steps (Decision 5), each ticking on its own signal. */
    steps: {
      pages: 'Writing the pages',
      holds: 'Checking it holds together',
      build: 'Building it',
      draft: 'Putting it on your draft address',
      answers: 'Checking it answers',
    },
    /** "Building it (second try)": the failures so far. Three tries, then it asks. */
    tries: (failures: number) =>
      failures >= 2 ? ' (third try)' : failures === 1 ? ' (second try)' : '',
    /** The state chip: one of the five states, named. */
    chip: {
      /** The design system's own example of a working label. */
      working: 'Working, a few minutes',
      paused: 'Paused, waiting for you',
      needsYou: 'Needs you',
      /** Ours: stopped by them, and still. */
      stopped: 'Stopped',
      /** Ours: the round is done. */
      built: 'Built',
      /** Ours: every wait names its owner. */
      waitingOn: {
        platform: 'Waiting on Manifest',
        model: 'Waiting on the model we build with',
        admin: 'Waiting on a Manifest administrator',
      },
    },
    /** Rich's (option A, 2026-09-28): only what is true; F6 adds email. */
    leave:
      'A few minutes. You can leave: it keeps going, and this page shows where it got to when you come back.',
    /** Never "It works" (FE-3). */
    startedAndAnswered: 'It started and answered.',
    /** A message of theirs waits for the lead. */
    gotIt: 'Got it, after this step.',
    /** Decision 4 (Rich: carry on, and say so), once a round. */
    fallback:
      "Our usual model can't be reached just now, so we're carrying on with a smaller one. It may take a few more tries.",
    whatChanged: 'What changed',
    exactChanges: 'The exact changes, for whoever you ask for help',
    exactWords: 'The exact words, for whoever you ask for help',
    draftAddress: 'Your draft address',
    /** Two facts, never one (TwoFacts): while a draft attempt fails. */
    facts: {
      serving: 'Serving right now',
      servingLastGood: 'The last version that worked',
      servingNothing: 'Nothing yet',
      attempt: 'The last attempt',
      /** The design system's word for an instance that failed (10-language.md). */
      attemptFailed: 'It never answered',
    },
    /** "$0.40 so far · $9.60 left this month", or either alone. */
    cost: (soFar: string | null, left: string | null) =>
      [
        soFar === null ? null : `${soFar} so far`,
        left === null ? null : `${left} left this month`,
      ]
        .filter((part) => part !== null)
        .join(' · '),
    stop: 'Stop',
    stopNote: 'Nothing is lost. Your draft address keeps whatever was last put there.',
    stopHere: 'Stop here',
    carryOn: 'Carry on',
    tryDifferent: 'Try a different way',
    tryAgain: 'Try again',
    /** One card for each thing a round needs of them. */
    needs: {
      tries: (step: 'build' | 'draft', servingBefore: boolean) =>
        `${
          step === 'build'
            ? "We couldn't get it to build after three tries."
            : /* ours: the walk-through's "the same three tries", for the draft */
              "We couldn't get it to answer on your draft address after three tries."
        } Nothing is broken: ${
          servingBefore
            ? 'your draft address still has the last version that worked.'
            : 'your draft address is still empty.'
        }`,
      checkpoint: (cap: string, monthLeft: string | null) =>
        `This piece of work has used what we allow in one go. Carry on? It can use up to ${cap} more${
          monthLeft === null ? '' : ` of the ${monthLeft} you have this month`
        }.`,
      /** In their own time: the month resets at the first, 00:00 UTC. */
      month: (when: string) =>
        `Your AI allowance for this month is used up, part-way through. What's done is kept. It comes back at ${when}.`,
      conflict: 'Someone else changed the app while we worked. Nothing of yours is lost.',
      moves: 'This is taking longer than it should. Nothing is lost.',
      unreachable: {
        platform: "We can't reach Manifest just now. Nothing is lost.",
        model: "We can't reach the model we build with just now. Nothing is lost.",
      },
      /** FE-32: `what` is the lead's own plain words. */
      cannot: (what: string) =>
        `We can't add ${what} yet: it needs a piece we can't install. Everything else is built.`,
      /** Ours, after Rich's for the plan: the model is not ours to switch on. */
      waitingOnAdmin: 'Building is waiting on a Manifest administrator. Nothing is lost.',
      /** Ours: after Stop. */
      stopped:
        'Stopped. Nothing is lost: your draft address keeps whatever was last put there.',
      /** Ours: our server restarted while it worked (Review Focus 3). */
      interrupted:
        'We were interrupted part-way through. Nothing is lost: carry on, and we pick up where we were.',
    },
    question: {
      /** A question the work cannot go past. */
      waiting: 'It is waiting, not failing.',
      /** Ours: a question with our default, which the work goes on with. */
      meanwhile: (fallback: string) => `Until you say: ${fallback}`,
      answer: 'Answer',
      /** Ours: a secret the app needs. */
      secretHint: 'We set it where your app reads it, and never show it again.',
      /** The platform refuses a value under 6 characters (M1): said before it is sent. */
      secretShort: 'At least 6 characters.',
    },
    thread: {
      /** Ours: the two halves of layout C, named for a screen reader. */
      label: 'The conversation',
      /** Ours: their words from moment 3, at the top. */
      asked: 'What you asked for',
      /** Ours: whose words, never by colour alone. */
      you: 'You',
      /** Ours: a secret they gave, never echoed. */
      secretGiven: 'Given. We set it where your app reads it, and never show it.',
      /** An earlier round, folded: "Built and put on your draft address · 28 Sep, 9:12am". */
      built: (when: string) => `Built and put on your draft address · ${when}`,
      messageLabel: 'Add a message',
      /** The lead reads it at its next step. */
      messageHint: 'We read it at the next step.',
      send: 'Send',
      /** Decision 16: a change is F4's moment 8. */
      changeNext: 'Asking for a change arrives next.',
    },
    /** Ours: quietly, while the page's stream reopens. */
    reconnecting: 'Reconnecting…',
    /** Ours: the other half of layout C. */
    workLabel: 'The work',
    /** Ours: Carry on just after Stop, while the stopped work finishes (409 CONVERSATION_BUSY). */
    busy: "We're still finishing what we were doing. Try again in a moment.",
    /** Ours: a press our server did not take. */
    couldntPress: "We couldn't do that just now. Nothing is lost.",
  },
  /** DECISION 11 (Rich): every problem shown carries a reference the person can quote. */
  /** How much we read at once, near and past a limit (F2's deferred Minor, Rich: say it). */
  limits: {
    count: (typed: string, most: string) => `${typed} of ${most} characters`,
    over: (typed: string, most: string) =>
      `${typed} of ${most} characters: more than we can read at once. Could you shorten it a little?`,
  },
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
