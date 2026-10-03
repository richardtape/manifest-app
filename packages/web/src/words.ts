/**
 * EVERY SENTENCE WE SHOW (F1 Decision 9), copied from the walk-through, which is the design.
 * The prototype's words were a starting point; where the walk-through changed one, this is
 * the walk-through's. A screen never writes a sentence of its own.
 */

/** 1 is "next"; 2 to 10 in words; beyond, a number. */
function ordinal(place: number, capital: boolean): string {
  const said =
    [
      'next',
      'second',
      'third',
      'fourth',
      'fifth',
      'sixth',
      'seventh',
      'eighth',
      'ninth',
      'tenth',
    ][place - 1] ?? `number ${place}`
  return capital ? said.charAt(0).toUpperCase() + said.slice(1) : said
}

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
  /**
   * MOCK MODE SAYS SO (F5 Task 3), Rich's words, approved with the design (2026-09-29). The one
   * sentence that names our own machinery: it is for us, and only ever shown in mock mode.
   */
  mockMode: {
    banner:
      'Mock mode: this server answers from manifest-mock on 7102, not the platform.',
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
    /** ✓ F6 (design §5): `409 PROJECT_ARCHIVED`, anywhere, said the same way. */
    archived: (name: string) => `${name} is switched off. Switch it back on first.`,
  },
  /**
   * F5 Decision 14, approved by Rich in the design: the model's answer stopped coming, or went on
   * past our ceiling. A round's card, and the intake's and the plan's, each with its own buttons.
   */
  stalled: {
    quiet: 'Our model stopped answering before it finished. Nothing is lost.',
    ceiling:
      "Our model's answer went on far longer than any should, so we stopped it. Nothing is lost.",
  },
  signOut: {
    title: 'Sign out',
    button: 'Sign out',
    failed: "We couldn't sign you out. Close the browser to be sure.",
  },
  /** D7 (Rich, 2026-09-29): someone who may not build. */
  notOpen: {
    title: "Manifest isn't available to you at the moment.",
    body: "It's open to UBC faculty for now.",
    /** Ours: so someone signed in with the wrong account can tell. The screen alone. */
    who: (name: string) => `You're signed in as ${name}.`,
  },
  notFound: {
    body: "There's nothing here.",
    link: 'Your apps',
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
    /**
     * F5 Task 5 (Decision 3): a built app not yet live, with a production clock unmet. Rich's
     * words ("each may take several days", 2026-09-29), approved with the design.
     */
    beforeStudents:
      'Before your students can use it: three things other people answer, one after another, and each may take several days.',
    goingLive: 'Going live',
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
    /**
     * F6b TASK 8: THE KIND OF CHANGE, ON A LAUNCHED APP (design §1, approved by Rich; the seven
     * fields' words his). An unknown field is ours (Words proposed): never its name.
     */
    kind: {
      straight: "Once you've tried it, this can go straight to your students.",
      look: (what: string) =>
        `This change needs a Manifest administrator's look before it reaches your students, because it changes ${what}.`,
      fields: {
        services: 'what it keeps',
        'auth.attributes': 'who it learns about',
        'egress.allow': 'what it can reach',
        resources: 'how much room it gets',
        'data.classification': 'how sensitive its data is',
        'ai.models': 'which AI it asks',
        blueprint: "what it's built on",
      } as Record<string, string>,
      unknown: 'something reviewed at launch',
      /** "a", "a and b", "a, b and c". */
      joined: (said: string[]) =>
        said.length <= 1
          ? (said[0] ?? '')
          : `${said.slice(0, -1).join(', ')} and ${said.at(-1)!}`,
    },
    /**
     * F6b TASK 9: A NEW DETAIL ABOUT THE PEOPLE WHO SIGN IN (design §1; Words proposed, ours until
     * Rich's word). S1: M1: only these four can reach a build; the platform refuses any other at the
     * commit. An unknown one is said generically, never by its name.
     */
    detail: {
      details: {
        givenName: 'their first name',
        sn: 'their last name',
        mail: 'their email',
        eduPersonAffiliation: "whether they're a student or staff",
      } as Record<string, string>,
      unknown: 'a new detail about the people who sign in',
      /** [Leave it out]'s change names it so when we could not read which. */
      theUnknown: 'the new detail about the people who sign in',
      needs: (what: string) =>
        `This change needs ${what} from UBC's identity team, and they must agree to share it first. That may take several days.`,
      /** Until FE-47: nothing pretends to ask. */
      cannotAskYet: "Manifest can't ask for it for you yet.",
      leaveOut: 'Leave it out',
      leavingOut: 'Starting that change…',
      couldntLeaveOut: "We couldn't start that change just now. Nothing has changed.",
      /** [Leave it out]'s change, its first words (Decision 10). */
      leaveOutChange: (what: string, title: string) =>
        `Leave ${what} out of ‘${title}’: UBC's identity team hasn't agreed to share it.`,
    },
    /** The five steps (Decision 5), each ticking on its own signal. */
    steps: {
      pages: 'Writing the pages',
      holds: 'Checking it holds together',
      build: 'Building it',
      draft: 'Putting it on your draft address',
      answers: 'Checking it answers',
    },
    /**
     * Rich (2026-09-28): the line under each step after the pages is ours, one per step. Under
     * the pages it is the lead's own.
     */
    stepLine: {
      /** Ours, approved with F4's plan. */
      holds: 'Checking that everything it needs is there.',
      build: 'Building it. This usually takes under a minute.',
      draft: 'Putting it on your draft address. Under a minute and a half.',
      answers: 'Opening it, and starting a sign-in, to check it answers.',
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
      /** Rich (2026-09-28): stopped by them, and still, in the not-yet tone. */
      stopped: 'Stopped. Nothing is lost.',
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
    /** Rich (2026-09-28): a confidential app is built with the on-campus model; said once. */
    campus:
      "This app keeps personal information, so we're building it with a smaller model that runs at UBC. It may take a few more tries.",
    /**
     * Rich (2026-09-29, at his click): the platform withdrew the session when the app's data became
     * confidential, and a new one still lists the model we were using, so we carried on.
     */
    carried: 'Your app now keeps confidential data. We carried on.',
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
      /**
       * Rich's choice (2026-09-29, F4 sitting 5): the platform ended the session because the app's
       * data is now confidential (FE-36's `models_withdrawn`). Stop and ask first.
       */
      withdrawn:
        "Your app now keeps confidential data, so the model we were using can't work on it. Carry on continues with the on-campus model.",
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
      /** Ours (FE-37): the draft answers, but signing in to it is refused on Manifest's side. */
      signInRefused:
        "It started and answered, but signing in to it is refused on Manifest's side. That's Manifest's to put right, not yours. Nothing is lost.",
      /** Ours: after Stop, under the chip, which already says it stopped and nothing is lost. */
      stopped: 'Your draft address keeps whatever was last put there.',
      /** Ours: our server restarted while it worked (Review Focus 3). */
      interrupted:
        'We were interrupted part-way through. Nothing is lost: carry on, and we pick up where we were.',
    },
    question: {
      /** A question the work cannot go past. */
      waiting: 'It is waiting, not failing.',
      /** Ours: a question with our default, which the work goes on with. */
      meanwhile: (fallback: string) => `Until you say: ${fallback}`,
      /** Ours: once built, the default we built with; a change is F4's moment 8. */
      wentWith: (fallback: string) => `We went with: ${fallback}`,
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
  /**
   * MOMENT 7, SEEING IT (F4 Task 5): the walk-through's words, Rich's, and ours where neither has
   * any (the plan's *Words proposed for Rich*, approved with it), marked "ours".
   */
  preview: {
    /**
     * The rail's project section (F5 Decision 2): four items; People and Agents come with their
     * plans.
     */
    rail: {
      overview: 'Overview',
      preview: 'Preview',
      conversations: 'Conversations',
      goingLive: 'Going live',
      /** F6b (design §2): after Going live. *Agents* comes with its page (sitting 5). */
      people: 'People',
    },
    /** Ours: the switcher's name for a screen reader (SegmentedControl's preview says so). */
    switcherLabel: 'Which address you are looking at',
    tabs: {
      draft: 'Your draft',
      'trying-out': 'Trying out',
      students: 'For your students',
    },
    open: 'Open it in a new tab',
    draftIs:
      'Your draft is a practice copy. Everyone in it is pretend, and so is anything they post.',
    tryItAs: 'Try it as',
    who: { student: 'A student', instructor: 'An instructor' },
    /** The walk-through's "sign in as `student`, password `student`", as two labelled rows. */
    signInAs: 'Sign in as',
    password: 'Password',
    /**
     * Ours: each copy button is "Copy" to the eye, and "Copy a student's password" to a screen
     * reader: these are the words after "Copy".
     */
    copy: 'Copy',
    copyLogin: (who: string) => `${who.toLowerCase()}'s sign-in name`,
    copyPassword: (who: string) => `${who.toLowerCase()}'s password`,
    copied: 'Copied',
    /**
     * The laptop only (the pretend people are the laptop's IdP's, FE-3): corrected to what F4's
     * M4 measured, and approved by Rich at sitting 2's start ("Use it as written").
     */
    laptop:
      'On this laptop, Sign in takes you straight in as yourself. To try it as a student, use Sign out inside the app first, then sign in as the student.',
    /** Rich (2026-09-28): UBC's words, everywhere, the laptop included. Never a date, never "We asked…". */
    tryingOut:
      "Trying out uses UBC's real staging sign-in, so UBC's identity team registers it first. That takes some time, as several teams at UBC help make sure the app and its data are kept safe and secure. Meanwhile, your draft is ready to try now.",
    /** Waiting on someone, its owner named, still, with no number (Decision 4); gone once registered (F5b). */
    waitingOn: "Waiting on UBC's identity team",
    /**
     * F5b (D2; the design's *Words for Rich*): trying-out's registration is step 2 on Going live. `state`
     * is the step's, as part of the sentence ("with UBC's identity team, waiting 4 days"); null
     * when the records could not be read.
     */
    step: (state: string | null) =>
      state === null
        ? 'Registering it is the second of three steps on Going live.'
        : `Registering it is the second of three steps on Going live: ${state}.`,
    toGoingLive: 'Going live',
    students: 'Not live yet. This is the address your students will use.',
    notRight: 'Not right? Tell us what to change.',
    askForChange: 'Ask for a change',
    /** Opens the conversation whose round deployed the failed attempt (F4 Task 9). */
    whatWentWrong: 'What went wrong',
    /** The two facts (TwoFacts), for the chosen address. */
    facts: {
      serving: 'Serving right now',
      attempt: 'The last attempt',
      /** The walk-through's, for the draft. */
      nothingDraft: 'Nothing there yet. It appears when the first build is done.',
      /** Ours: anywhere else. */
      nothing: 'Nothing there yet.',
      same: "The same version. It's the one answering.",
      /** "Didn't start, 4 minutes ago. Nobody lost anything." (walk-through); `when` null when nothing dates it. */
      failed: (when: string | null) =>
        `Didn't start${when === null ? '' : `, ${when}`}. Nobody lost anything.`,
      underWay: 'Under way, started a moment ago.',
    },
    /** How long ago, in their own time zone past a day. */
    ago: {
      moment: 'a moment ago',
      minute: 'a minute ago',
      minutes: (n: number) => `${n} minutes ago`,
      hour: 'an hour ago',
      hours: (n: number) => `${n} hours ago`,
      on: (when: string) => `on ${when}`,
    },
  },
  /**
   * THE APP'S OVERVIEW, ITS LANDING PAGE (F5 Task 5, Decisions 1 and 3). The band's words are
   * the walk-through's moment 10, with Rich's "may take several days"; the rows are the
   * Preview's tab names and F4's serving facts.
   */
  /**
   * F6, MOMENTS 16 AND 19 (Task 9): what happened, what needs them, and the history. *Words proposed
   * for Rich*, approved with the F6 plan, marked ✓; ours where the table has none, marked "ours"
   * (each named in sitting 5's entry for his word).
   */
  keeping: {
    lines: {
      wentLive: 'Went live', // ✓
      reachedStudents: 'A new version reached your students', // ✓
      changeFailed: "A change didn't go live. Your students kept the version before it.", // ✓
      signedOff: 'Signed off by a Manifest administrator', // ✓
      turnedDown: "A Manifest administrator didn't sign it off", // ✓
      dryRunPassed: 'The dry run signed someone in', // ✓
      dryRunFailed: "The dry run didn't sign anyone in", // ✓
      sentIdentity: "The request was sent to UBC's identity team", // ✓
      sentPrivacy: "The privacy assessment was sent to UBC's Privacy Office", // ✓
      identityRegistered: "UBC's identity team registered it", // ✓
      identityChange: "UBC's identity team asked for a change", // ✓
      identityAnswered: "UBC's identity team answered", // ✓
      privacyApproved: "UBC's Privacy Office approved it", // ✓
      privacyAnswered: "UBC's Privacy Office answered", // ✓
      someone: 'Someone', // ✓ (sitting 3: a member we cannot name)
      added: (whom: string) => `${whom} was added`, // ✓
      addedBy: (who: string, whom: string) => `${who} added ${whom}`, // ours
      nowRole: (whom: string, role: 'owner' | 'collaborator') =>
        `${whom} is now ${role === 'owner' ? 'an owner' : 'a helper'}`, // ✓
      madeRole: (who: string, whom: string, role: 'owner' | 'collaborator') =>
        `${who} made ${whom} ${role === 'owner' ? 'an owner' : 'a helper'}`, // ours
      removed: (whom: string) => `${whom} was taken off it`, // ✓
      removedBy: (who: string, whom: string) => `${who} took ${whom} off it`, // ours
      switchedOff: 'Switched off', // ✓
      switchedOffBy: (who: string) => `${who} switched it off`, // ours
      switchedOn: 'Switched back on', // ✓
      switchedOnBy: (who: string) => `${who} switched it back on`, // ours
      renamed: (from: string) => `Renamed from ${from}`, // ✓
      renamedBy: (who: string, from: string) => `${who} renamed it from ${from}`, // ours
      unreachable: "Your students couldn't reach it", // ✓
      answering: (howLong: string) => `Answering again. It was down for ${howLong}.`, // ✓
    },
    /** The needs-you band (design §2): each line names the app and the thing, with its button. */
    band: {
      label: 'What needs you', // ours: the band's name, for a screen reader
      question: (app: string) => `${app}: we have a question for you.`, // ✓
      open: 'Open it', // ✓
      down: (app: string, since: string) =>
        `${app}: your students can't reach it, since ${since}. We can see that, not why.`, // ✓
      downOwner: 'Starting it again usually fixes it.', // ✓
      downHelper: 'An owner can start it again.', // ✓
      startAgain: 'Start it again', // ✓
      answering: (app: string, since: string, howLong: string) =>
        `${app}: answering again since ${since}. It was down for ${howLong}.`, // ✓
      whatHappened: 'What happened?', // ✓
      changeFailed: (app: string) =>
        `${app}: a change didn't go live. Nobody has lost anything: your students still have the version from before.`, // ✓
      giveIt: 'Give this to your agent', // ✓
      goingLive: (app: string) =>
        `${app}: something on its way to your students needs you.`, // ✓
      goingLiveButton: 'Going live', // ✓
    },
    since: {
      title: 'Since you were last here', // ✓ (the design)
      everything: 'Everything', // ✓ (the design)
    },
    history: {
      title: 'Everything that happened', // ✓
      from: (day: string) => `From ${day}.`, // ✓
      gap: (from: string, to: string) => `We weren't watching between ${from} and ${to}.`, // ✓
      cantReach: "We can't reach Manifest just now. Nothing of yours has changed.", // ✓ (the design)
      retry: 'Try again', // ours
      empty: 'Nothing has happened yet.', // ours
    },
    how: {
      title: 'How we keep watch', // ✓
      body: (app: string) =>
        `Once a minute, we check that your students can reach ${app}. If they can't, twice in a row, we email its owners and offer to start it again. We can't see why it stopped, we can't tell when it answers but gets things wrong, and we only watch while we're running ourselves.`, // ✓
    },
    card: {
      switchedOff: (day: string) => `Switched off, ${day}`, // ✓ (the design)
      unreachable: (since: string) => `Your students can't reach it, since ${since}`, // ✓ (the design)
    },
    /**
     * F6 TASK 10, *START IT AGAIN* (moment 19, design §4): the version the students' address was
     * serving, put back up from the person's own session, with moment 14's second sign-in.
     */
    startAgain: {
      stationsLabel: 'Starting it again', // ✓ (F5's stations, named)
      nobodyLost:
        "Nobody has lost anything: your students' address keeps what it has until this answers.", // ✓
      landed: "It's answering again.", // ✓
      /**
       * ✓ RELEASE_NOT_STAGED: trying-out has moved on, and the live address takes only what it
       * serves. `newer` and `older` are "30 September, 10:40am"; null when undated (ours).
       */
      newer: (newer: string | null, older: string | null) =>
        `Your trying-out address has a newer version${newer === null ? '' : `, from ${newer}`}. Start that one instead, or put ${older === null ? 'the one your students had' : `the version from ${older}`} back on trying-out first?`,
      startNewer: 'Start the newer one', // ✓
      /** ✓ `day` is "18 September"; null when undated (ours). */
      putBack: (day: string | null) =>
        day === null ? 'Put theirs back first' : `Put ${day}'s back first`,
      unsureLong: "We stopped waiting, and couldn't see how it ended.", // ours (F5's M1)
      gate: "It can't go to your students yet. Going live shows what it needs.", // ours
    },
    /** F6 Task 10, *What happened?*: the conversation's title (our server's OUTAGE_FIX_WORDS). */
    whatHappened: {
      fixTitle: "Your students couldn't reach it", // ✓
    },
    /**
     * F6 TASK 11, END OF TERM (moment 20, design §5): switching it off, back on, *Start it for
     * your students*, and deleting an app that never went live. An owner's alone.
     */
    switching: {
      title: 'Switching it off', // ✓
      off: 'Switch it off', // ✓
      confirmOff:
        "Your students' address will show 'This app has been switched off by its owner.' Everything is kept: its code, what students wrote, its settings. Switch it back on whenever you like.", // ✓
      keepRunning: 'Keep it running', // ✓
      untidy:
        "It's switched off, but we didn't finish tidying up. Nothing is lost, and we'll finish by ourselves.", // ✓
      backOn: 'Switch it back on', // ✓
      back: "It's back, but not running yet.", // ✓
      students: 'Start it for your students', // ✓
      /** ✓ Said of the button beside it: "[Start it for your students] puts the version…" */
      studentsWhat: (button: string) =>
        `${button} puts the version from last term back, with everything they wrote.`,
      backDraft: "It's back. Your draft starts again the next time we work on it.", // ✓
      delete: 'Delete it', // ✓
      confirmDelete:
        "Everything goes: its code, its addresses, what anyone wrote in it. This can't be undone. Its name becomes free.", // ✓
      deleteForGood: 'Delete it for good', // ✓
      keepIt: 'Keep it', // ours: the confirming step's way back
      /** Ours: a delete whose teardown did not finish, twice: archived, partly gone (the review's I2). */
      deleteUnfinished:
        "It's switched off, and we didn't finish deleting it. Delete it for good again to finish.",
      liveKept:
        "Apps that have been live are kept, because UBC's rules decide when students' data is removed.", // ✓
      liveKeptMore:
        'Switch it off, and a Manifest administrator removes it when the rules allow.', // ✓ (FE-45)
    },
  },
  overview: {
    /**
     * F6b TASK 10: WAITING TO REACH YOUR STUDENTS (moment 17; the design's §1, approved by Rich).
     * `when` is "18 September, 3:12pm" or "today, 3:12pm" (moment 9's), null when undated (ours).
     */
    newVersion: {
      title: 'Waiting to reach your students',
      facts: (trying: string | null, students: string | null) =>
        `${trying === null ? 'A newer version' : `The version from ${trying}`} is on your trying-out address. Your students have ${students === null ? 'an earlier one' : `the version from ${students}`}.`,
      button: 'Let your students have this version',
      helper: 'An owner lets your students have it.',
      landed: (when: string | null) =>
        when === null
          ? 'Your students have this version now.'
          : `Your students have the version from ${when}.`,
      still: (when: string | null) =>
        when === null
          ? 'Your students still have the version they had.'
          : `Your students still have the version from ${when}.`,
      /** Ours: another item unmet, said where Going live says which. */
      unmet: 'Before your students can have it, something on Going live needs doing.',
      goingLive: 'Going live',
    },
    /** Ours: the address rows' name, for a screen reader: no count, since fewer may be drawn (m1). */
    addresses: 'Its addresses',
    band: {
      title: 'Before your students can use it.',
      /** F5b (D2): the design's *Words for Rich*. */
      body: 'Three things other people answer, one after another, and each may take several days. Going live shows where each one is.',
      button: 'Going live',
      /** F5b part two: while step 1 has nothing on file, and something can be sent. */
      start: 'Start them',
    },
    /**
     * MOMENT 15, THE HAND-OVER (F5 Task 9, Decision 12): Rich's words, then the agreed plan's two
     * rows as written. No model.
     */
    students: {
      /** ✓ */
      signIn: 'Students sign in with their CWL.',
      /** ✓ The message's first part; the plan's *What students see* follows it. */
      message: (name: string, address: string) =>
        `${name} is here: ${address}. Sign in with your CWL.`,
      /** Ours: the field's label, and what it is for. */
      messageLabel: 'A message to send them',
      messageHint:
        'For Canvas or an email. Change it as you like: nothing here is saved.',
      /** ✓ The honest line's first part (FE-20); the plan's *Who gets in* follows it. */
      honest: 'Anyone with a CWL can sign in, not only your class.',
      /** Ours: whose value each Copy copies, for a screen reader. */
      copyAddress: 'the address',
      copyMessage: 'the message',
    },
  },
  /**
   * GOING LIVE, MOMENTS 10 AND 11 (F5 Task 6). The walk-through's words and those Rich approved
   * with the plan (✓ in its *Words proposed for Rich*); ours where neither has any, marked "ours".
   * The clocks may take several days, never weeks (Rich, 2026-09-29), and nothing on the page is
   * a stopgap: no email, and no action a card cannot honour.
   */
  goingLive: {
    title: 'Letting your students in',
    /** F5b (D2): the three are answered one after another (the design's *Words for Rich*). */
    lead: 'Going live isn’t a button. Most of it takes minutes, but three things are answered by other people, one after another, and each may take several days. That’s why this page exists from day one.',
    /** ✓ `when` is "18 September, 3:12pm" or "today, 3:12pm"; null when its date cannot be read (ours). */
    version: (when: string | null) =>
      when === null
        ? 'What goes live is the version on your trying-out address.'
        : `What goes live is the version on your trying-out address: the one from ${when}.`,
    noVersion:
      'Nothing is on your trying-out address yet. What goes live is what’s there.',
    toTryingOut: 'Trying out',
    /**
     * F5b, THE THREE STEPS IN UBC'S ORDER (D2; the design's §1 and *Words for Rich*, the plan's *Words
     * proposed for Rich*): the privacy assessment, then the trying-out address's registration, then
     * the students' address's. Each is sent to the Manifest team, who send it on to UBC (D3). F5's
     * clock words that still hold are here too, unchanged.
     */
    steps: {
      /** Ours: the list, named for a screen reader. */
      label: 'Three things other people answer, one after another',
      assessment: {
        title: 'A privacy assessment',
        body: 'Your app keeps what students write, so UBC’s Privacy Office looks at it first.',
        /** Said only once there is something to start (part two, Decision 3): untrue before. */
        yours: 'We fill in what Manifest knows; you answer the rest.',
        with: 'With UBC’s Privacy Office',
        whose: 'UBC’s Privacy Office',
        done: (day: string | null) => (day === null ? 'Approved' : `Approved ${day}`),
        /** (FE-46) With the Manifest team, and where it goes next. */
        onward: 'They send it on to UBC’s Privacy Office.',
      },
      staging: {
        title: 'Registering your trying-out address',
        body: 'Before anyone can sign in on your trying-out address, UBC’s identity team registers it.',
        with: 'With UBC’s identity team',
        whose: 'UBC’s identity team',
        done: (day: string | null) => (day === null ? 'Registered' : `Registered ${day}`),
        onward: 'They send it on to UBC’s identity team.',
      },
      production: {
        title: 'Registering your students’ address',
        body: 'Before your students can sign in, UBC’s identity team registers the live address too.',
        with: 'With UBC’s identity team',
        whose: 'UBC’s identity team',
        done: (day: string | null) => (day === null ? 'Registered' : `Registered ${day}`),
        onward: 'They send it on to UBC’s identity team.',
      },
      /**
       * A later step with nothing on file: what it waits for, the nearest step before it not done
       * (the review's I1: never one already done).
       */
      waitsFor: {
        assessment: 'Next, once the Privacy Office has approved the assessment.',
        staging: 'Next, once your trying-out address is registered.',
      },
      /** Owners, in words (the plan's). */
      owners: {
        you: 'you',
        team: 'the Manifest team',
      },
      notStarted: 'Not started',
      nothingCounting: 'Nothing counting yet',
      duration: 'May take several days',
      admission: {
        title: 'Manifest can’t start this one for you yet.',
        body: 'For now the Manifest team does it by hand, and this card shows where it has got to.',
      },
      /** The day it went to UBC: "since 7 October". */
      since: (day: string) => `since ${day}`,
      /** (FE-46) The day it went to the Manifest team: "sent 5 October". */
      sent: (day: string) => `sent ${day}`,
      /** A record in a state we do not know: when an administrator wrote it. */
      recorded: (day: string) => `recorded ${day}`,
      /** Ours for none and one; "waiting 12 days" ✓. */
      waiting: (days: number) =>
        days <= 0
          ? 'waiting since today'
          : days === 1
            ? 'waiting 1 day'
            : `waiting ${days} days`,
      withTeam: 'With the Manifest team',
      /** Part one: what would be theirs is the Manifest team's until there is somewhere to send it. */
      teamHasIt: 'The Manifest team has it.',
      /** Rich, 2026-09-30: a change on file with UBC (`change_requested` from `active`). */
      changeAsked: (day: string | null) =>
        day === null ? 'A change' : `A change, recorded ${day}`,
      /** UBC came back with questions (`change_requested` from `submitted`). */
      asked: 'UBC’s identity team asked about it.',
      askedNote: 'The Manifest team will be in touch with what they asked.',
      /** The assessment sent back (`draft` again, its day sent kept). */
      sentBack: 'The Privacy Office sent it back.',
      sentBackNote: 'The Manifest team will be in touch about why.',
      runOut: {
        said: 'Its registration has run out.',
        who: 'The Manifest team renews it.',
        /** Part two: theirs to send again. */
        again: 'Check it again and send it.',
      },
      /** Part two: nothing on file, and theirs to start. */
      nothingStarted: 'Nothing started.',
      /** Part two: drafted, not sent. */
      ready: 'Ready for you to check and send.',
      readyChip: 'Ready for you',
      needsChange: 'The newest version needs it changed.',
      nothingNeeded: 'Nothing more needed.',
      done: 'Done',
      /** (S1: M2) An app that signs nobody in. */
      notNeeded: 'Not needed',
      notNeededSaid: 'Not needed: it doesn’t sign anyone in.',
      cantTell: 'We can’t tell right now',
      /**
       * Ours: a step's state inside another page's sentence (*Trying out*'s line): "with UBC's
       * identity team, waiting 4 days".
       */
      phrase: {
        notStarted: 'not started yet',
        with: (whose: string, waited: string | null) =>
          waited === null ? `with ${whose}` : `with ${whose}, ${waited}`,
        done: 'done',
        notNeeded: 'not needed',
        yours: 'waiting for you',
        cantTell: 'we can’t tell where it is right now',
      },
    },
    shortJobs: {
      title: 'Short jobs, for the end',
      lead: 'minutes each, and not worth doing early',
    },
    /** Ours: each row's state, in a word. Five states only. */
    state: {
      working: 'Working',
      waiting: 'Waiting on someone',
      attention: 'Needs you',
      steady: 'Done',
      notyet: 'Not yet',
    },
    /** Owners, in words (the walk-through's), and ours for Decision 7's. */
    owners: {
      forYou: 'done for you',
      us: 'us, in minutes',
      admin: 'a Manifest administrator',
      nobody: 'nobody yet',
      team: 'the Manifest team',
      /** Ours: a sign-off refused; what follows is theirs to start (Task 8). */
      you: 'you',
      /** ✓ The dry run's (the walk-through's table, moment 12). */
      youStart: 'you start it; minutes',
    },
    /** Each row: a name (ours) and a sentence per state (the walk-through's, and S1's). */
    rows: {
      /** S1: M3: rehearsal, scans and admin-approval with nothing on trying-out. */
      once: 'Once a version is on your trying-out address.',
      /** Ours: an item Manifest does not track yet (`not_built`). */
      notTracked: 'Manifest doesn’t check this one yet.',
      /** (S6) Ours: not built, and blocking: it holds the launch until Manifest can do it. */
      notBuiltBlocks:
        'Manifest can’t do this one yet, and your app can’t go live until it can. It comes in a later Manifest release.',
      scans: {
        name: 'A check for security problems',
        met: 'Checked for security problems. Nothing needs fixing, and we check again on every build.',
        /** Decision 7, accepted by Rich: no [Fix it] until FE-32 lands. */
        unmet:
          'Something it’s built on has a known security problem. Keeping what apps are built on up to date is the Manifest team’s job.',
      },
      rehearsal: {
        name: 'A dry run on the live setup',
        /** ✓ The walk-through's sentence: theirs to start (FE-42 (a); Rich: "Build it now"). */
        yours:
          'We put it up with nobody watching, check it answers and signs someone in, then take it down.',
        met: 'Done. It answered and signed someone in on the live setup.',
      },
      loadRehearsal: {
        name: 'A test with everyone at once',
        said: 'We pretend to be your whole class arriving together.',
      },
      approval: {
        name: 'A Manifest administrator’s sign-off',
        /**
         * F5b (the design's §3): undecided, and theirs to ask. F5's "Manifest doesn't tell them yet that
         * it's waiting." goes: an ask is in the administrators' queue, and the Manifest team is emailed (D5).
         */
        unmet:
          'A Manifest administrator looks at what it keeps, who it lets in and what it can reach, then signs it off, so nobody’s app reaches students with something it shouldn’t have.',
        /** Ours: met, and the approval could not be read to name who and when. */
        met: 'Signed off by a Manifest administrator.',
        /** ✓ `day` is "23 September"; null when it cannot be read. */
        signedOff: (name: string, day: string | null) =>
          day === null ? `Signed off by ${name}.` : `Signed off by ${name}, ${day}.`,
        /** ✓ Met with nobody's decision: nothing sensitive to sign off. */
        nothingNeeded: 'Nothing in this version needs a sign-off.',
        /** ✓ Their reason as the administrator wrote it; none kept, ours. */
        rejected: (reason: string | null) =>
          reason === null
            ? 'Not signed off. A new version is needed, and it’s looked at afresh.'
            : `Not signed off: ‘${reason}’ A new version is needed, and it’s looked at afresh.`,
        /**
         * Ours: signed off, then rebuilt, so the approval no longer covers what would go live and
         * the checklist counts it unmet (never "Signed off" while it is).
         */
        again:
          'It has changed since it was signed off, so a Manifest administrator looks at it afresh.',
        /** F5b (the design's §3): asked, and nobody has decided. */
        asked: 'A Manifest administrator looks at this next.',
        /**
         * F5b: "asked 21 September · waiting 2 days", the wait in Vancouver days; the day alone when no
         * clock is given. Who asked is not read back (nothing reads a request), so *asked*, not *you asked*.
         */
        when: (day: string, waited: string | null) =>
          waited === null ? `asked ${day}` : `asked ${day} · ${waited}`,
        /** F5b (D7; the design's *Words for Rich*): the press, and the note it opens in place. */
        ask: 'Ask a Manifest administrator to sign this off',
        note: 'Anything they should know?',
        noteHint:
          'For example, the day your students need it. Only Manifest administrators see it.',
        askThem: 'Ask them',
        notNow: 'Not now',
        /** F5b (the plan's *Words proposed for Rich*): working, and failed. */
        asking: 'Asking',
        couldntAsk: 'We couldn’t ask just now. Nothing is lost.',
        /** F5b: RELEASE_NOT_STAGED, F5's S5 pattern. */
        changed:
          'The version on your trying-out address changed a moment ago. Ask about the new one?',
        /** Ours: the approval could not be read. */
        cantTell: 'We can’t tell right now whether it’s been signed off.',
        /** ✓ Starts a change seeded with their reason (Decision 9). */
        talk: 'Talk it through',
        /** Ours: the press, working. */
        talking: 'Opening a conversation',
        /** Ours: the token or our server said no; nothing was kept. */
        couldntTalk: 'We couldn’t open that conversation just now. Nothing is lost.',
        /**
         * The change's words (Words proposed for Rich): ours, then their reason, cut at a word to
         * the change's limit (`talkWords`); none kept, ours alone.
         */
        change: (reason: string | null) =>
          reason === null
            ? 'A Manifest administrator didn’t sign it off.'
            : `A Manifest administrator didn’t sign it off, and said: ‘${reason}’`,
      },
      domain: {
        name: 'Its address',
        met: (hostname: string | null) =>
          hostname === null
            ? 'Its address is yours for good.'
            : `Its address is ${hostname}, yours for good.`,
        /** Ours: never seen on the laptop. */
        unmet: 'Its address isn’t settled yet.',
      },
      codeReview: {
        name: 'A review of the code',
        notYet:
          'Nobody reviews the code itself yet. What keeps it safe is how it runs: it can only reach what it asks for, and only its own data.',
        /** Ours: a reviewer the platform does not have yet. */
        met: 'Its code has been reviewed.',
      },
      /** An id the platform adds tomorrow (spec D23.8): shown, never hidden. */
      unknown: {
        name: (title: string) => `Something new on the list: ${title}`,
        met: 'Done.',
        unmet: 'Not done yet.',
      },
    },
    /**
     * Decision 2: after launch the page stays, says so, and points at the Overview (ours). That it
     * is live is a fact; that it works is not ours to say without reading it (never "It works").
     */
    live: 'It’s live.',
    toOverview: 'Go to the Overview',
    /**
     * MOMENT 14, PUTTING IT LIVE (F5 Task 10, Decision 10): the walk-through's words (✓ in the
     * plan's *Words proposed for Rich*), and ours where neither has any, marked "ours".
     */
    letIn: {
      button: 'Let your students in',
      /**
       * ✓ "The version from 18 September goes to <address>. Your trying-out address stays as it
       * is.": `when` is "18 September, 3:12pm" or "today, 3:12pm"; null when undated (ours). The
       * address sits between the two parts, in mono.
       */
      goes: (when: string | null): [string, string] => [
        when === null
          ? 'The version on your trying-out address goes to '
          : `The version from ${when} goes to `,
        '. Your trying-out address stays as it is.',
      ],
      /** ✓ Back from the step-up: the same button, in the same place. */
      again: 'You’re signed in again.',
      /** ✓ The step-up card's rule, the one sentence the card on trying-out leaves out. */
      stepUpRule:
        'We ask this before anything that reaches your students, changes who can work on your app, or switches it off.',
      /** Ours: the stations, as a list, named for a screen reader. */
      stationsLabel: 'Letting your students in',
      /** ✓ "Reading responses is live.": the moment the product is for. */
      landed: (name: string) => `${name} is live.`,
      /** ✓ Ours (the plan's words): to the Overview, which leads with For your students. */
      tellThem: 'See what to tell your students',
      /** ✓ RELEASE_NOT_STAGED: trying-out's version changed between the reading and the press. */
      changed:
        'The version on your trying-out address changed a moment ago. Go live with the new one?',
      /** ✓ Its start never answered: only when the platform answered so (M1). */
      nothingReached:
        'Nothing reached your students. The address shows nothing yet, not a broken app.',
      /** Ours: the facts' heading, as trying-out's has its own. */
      address: 'Your students’ address',
      /** Ours: the gate refused it (a race: the button shows only when ready). */
      gate: 'It can’t go live yet: something on the list changed a moment ago.',
      /** Ours: beside a row that changed since the page last read it (never colour alone). */
      changedRow: 'Changed a moment ago',
      /** Ours (M1): five minutes more with no end read, we stop reading, and say so. */
      unsureLong:
        'We stopped waiting, and couldn’t see how it ended. The Overview shows whether it’s live.',
      /** Ours: the fix conversation's title (our server's LIVE_FIX_WORDS). */
      fixTitle: "It didn't start on the live address",
    },
    /**
     * MOMENT 12, THE DRY RUN PRESSED (F5 Task 7, Decision 8): the walk-through's words and the
     * plan's (*Words proposed for Rich*, ✓), and ours where neither has any, marked (S6).
     */
    dryRun: {
      button: 'Run the dry run',
      /**
       * ✓ While it runs. The plan's "About a minute and a half." is left out (S6): measured, it
       * takes seconds (S1: M4).
       */
      running: 'Putting it up with nobody watching, signing someone in, taking it down.',
      /** ✓ Measured true (S1: M4): it carries on when its caller goes. */
      leave: 'You can leave: it carries on.',
      /** ✓ It signed nobody in: one sentence for every failure, none measured (S1: M4). */
      failed: 'It didn’t sign anyone in on the live setup.',
      /** ✓ */
      fixIt: 'Fix it',
      /** ✓ REHEARSAL_DEPLOY_FAILED: its start never answered. */
      didntStart: 'It didn’t start on the live setup.',
      /** ✓ Our deadline, not its answer (Review Focus 3). */
      unsure:
        'We stopped waiting, but it may still finish. This row updates when it does.',
      /** (S6) Ours: our deadline, and five minutes of reads without the row moving. */
      unsureLong: 'We couldn’t see how it ended. You can run it again.',
      /** (S6) Ours: one already running for this app (the platform's 5b: 409 REHEARSAL_RUNNING). */
      elsewhere:
        'A dry run is already running for this app. This row updates when it ends.',
      /** (S6) Ours: the platform's 5b take-down refused (REHEARSAL_TEARDOWN_FAILED, 500). */
      teardown: 'It ran, but didn’t finish taking itself down. Run it again.',
      /** ✓ The fix conversation's title (our server's DRY_RUN_FIX_WORDS). */
      fixTitle: "The dry run didn't sign anyone in",
    },
  },
  /**
   * MOMENT 8, ASKING FOR A CHANGE (F4 Task 9): the walk-through's words, and those Rich approved
   * with the plan (its *Words proposed for Rich*); ours where neither has any, marked "ours".
   */
  change: {
    title: 'What should change?',
    lead: "Say it the way you'd say it to a colleague. We'll show you what we'd change before we change anything.",
    /** Ours: the box's label. */
    label: 'What should change',
    ask: 'Ask for it',
    /** Ours: the press, working. */
    asking: 'Asking for it',
    /** Ours: the token or our server said no; nothing was kept. */
    couldntAsk: "We couldn't ask for it just now. Nothing is lost.",
    /**
     * The line (walk-through; "…which is waiting for you" Rich's with the plan): "Waiting for
     * 'Word count' to finish. It starts by itself.", the title between the two, a link to it.
     */
    waitingBefore: "Waiting for '",
    waitingAfter: (forYou: boolean) =>
      `' to finish${forYou ? ', which is waiting for you' : ''}. It starts by itself.`,
    /** Ours: the chip at the top of a waiting conversation (waiting on someone). */
    waitingChip: 'Waiting its turn',
    /** Ours: between one conversation ending and the next starting. */
    startsSoon: 'It starts in a moment.',
    /** Ours: its place. */
    place: (place: number) => `${ordinal(place, true)} in line.`,
    leave: 'Leave the line',
    /** Ours: what they asked, and the box that adds to it while it waits. */
    asked: 'What you asked for',
    addLabel: 'Anything to add?',
    /** Ours: true while it waits, where F3's "the next step" is not. */
    addHint: 'We add it to what you asked for.',
    send: 'Send',
    /** The change's plan (walk-through; Rich's with the plan). */
    planTitle: "Here's what we'd change",
    unchanged: 'Everything else stays as we agreed.',
    yes: 'Yes, change it',
    /** Ours: what Yes does. */
    yesBody:
      'We add it to the plan we agreed, then change it on your draft address, and you watch. You can leave; it keeps going.',
    notNow: 'Not now',
    setAside: 'Set aside. Nothing was changed.',
    /** Ours: the box on a change set aside, and on a built conversation. */
    instead: 'What should change instead?',
    next: 'What should change next?',
    nextHint: "We'll show you what we'd change before we change anything.",
    /** The app's conversations (Rich's with the plan). */
    conversations: {
      title: 'Conversations',
      lead: (name: string) =>
        `Every piece of work on ${name}, and where each one left it.`,
      /** Ours: each row's chip, one of the five states. */
      working: 'Working on it',
      attention: 'Needs you',
      built: 'Built',
      setAside: 'Set aside',
      stopped: 'Stopped',
      waiting: (place: number) => `Waiting: ${ordinal(place, false)} in line`,
      /** Ours: nothing on this app yet. */
      none: 'Nothing has been asked here yet.',
    },
  },
  /**
   * MOMENT 9, PUTTING A VERSION ON THE TRYING-OUT ADDRESS (F4 Task 10): the walk-through's words,
   * Rich's, the prototype's where they are true, and ours where none has any, marked "ours".
   */
  tryingOut: {
    /** The building screen's end, once built (walk-through). */
    ready: 'Ready on your draft address.',
    tryIt: 'Try it',
    put: 'Put this version on trying-out',
    /** Ours (Words proposed): the platform would make a new instance of the same version (M3). */
    alreadyThere: 'This version is already on the trying-out address.',
    /**
     * The walk-through's question, the version fixed when it is asked. Its second sentence only
     * when something is there to keep answering (ours).
     */
    question: (version: string, somethingThere: boolean) =>
      `Put ${version} on the trying-out address?${
        somethingThere
          ? ' The one there now keeps answering until this one proves it can.'
          : ''
      }`,
    /** "the version from today, 3:12pm" (the walk-through's question). */
    today: 'today',
    /** Ours: a version whose date cannot be read is never given one. */
    thisVersion: 'this version',
    putItThere: 'Put it there',
    notNow: 'Not now',
    /** The prototype's pill, and the bound given once, in words (Timeline/README.md). */
    working: 'Working, under 90 seconds',
    real: 'Each step is the app actually reaching that point.',
    /** Ours: F4 M3 measured a deploy carrying on when its page closed. */
    leave: 'You can leave: it keeps going, and the Preview shows where it got to.',
    /** Ours: the stations, as a list, named for a screen reader. */
    stationsLabel: 'Putting it on the trying-out address',
    /** The prototype's stations, each with its note. */
    stations: {
      turn: {
        label: 'Waiting its turn',
        note: 'In the queue behind anything else going out',
      },
      room: {
        label: 'Making room',
        note: 'Somewhere to run, and a place to keep things',
      },
      starting: {
        label: 'Starting up',
        note: 'Your app is running its first few seconds',
      },
      answering: {
        label: 'Answering',
        note: 'It replied to us, so it will reply to people',
      },
      never: {
        label: 'It never answered',
        note: 'It started, then stopped replying to us',
      },
    },
    /** Rich (2026-09-28): the end, everywhere, the laptop included. Never a date, never "We asked…". */
    arrived:
      "It's on the trying-out address. Nobody can sign in there until UBC's identity team has registered it. That takes some time, as several teams at UBC help make sure the app and its data are kept safe and secure.",
    /** The prototype's: whose two facts these are, under the draft's own on the Preview. */
    address: 'Your trying-out address',
    /** Ours: the chip on either failure. */
    needsYou: 'Needs you',
    whatWentWrong: 'What went wrong',
    /** The fix conversation's title (Words proposed for Rich; our server's FIX_WORDS). */
    fixTitle: "It didn't start on the trying-out address",
    secret: {
      /** The plan's words, for a secret we asked for on the draft; ours for several. */
      asked: (several: boolean) =>
        several
          ? 'It needs settings we asked you for on your draft, before it can start there.'
          : 'It needs a setting we asked you for on your draft, before it can start there.',
      /** Ours: a name no question of ours asked for. */
      never: 'It needs a setting we never asked you for, before it can start there.',
      set: 'Set it',
    },
    /** Moment 14's step-up card, without its rule about students (not true here). Never expected (M3). */
    stepUp: {
      title: 'Sign in once more',
      body: "We're not doubting you. We're making it useless for anyone who finds your laptop open.",
      again: 'Sign in again',
    },
    /** Ours: a press that did not go through. */
    couldnt: "We couldn't do that just now. Nothing is lost.",
    /**
     * M1 (F5 Decision 11): our deadline cut the wait, not the platform's answer. The words
     * approved for putting it live (Words proposed for Rich ✓), on trying-out too.
     */
    unsure:
      'We stopped waiting, but it may still be going. This shows it when it answers.',
    /** Ours (M1): five minutes more with no end read, we stop reading, and say so. */
    unsureLong:
      "We stopped waiting, and couldn't see how it ended. The Preview's Trying out shows what's there now.",
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
  /**
   * F6b (walk-through moment 18, design §2): WHO CAN CHANGE IT. The design's words, and F6b's
   * *Words proposed* (the plan); each marked **ours** is this sitting's, for Rich.
   */
  people: {
    title: (app: string) => `Who can change ${app}`,
    students: "Students aren't on this list. They get in once it's live.",
    you: '(you)',
    owner: 'Owner',
    helper: 'Helper',
    /** Ours: a member's CWL login, beside their email, when CWL released it. */
    login: (login: string) => `CWL login ${login}`,
    roles:
      "Helper: can change the app and try it. Only an owner can let students have a new version, change who's on this list, or switch it off.",
    helperOnly: "Only an owner can change who's on this list.",
    add: {
      /** Ours: the form's heading. */
      title: 'Add someone',
      field: 'Their CWL login or email',
      /** Ours: the role's group, for a screen reader. */
      role: 'What they can do',
      button: 'Add them',
      adding: 'Adding…',
    },
    makeOwner: 'Make owner',
    makeHelper: 'Make helper',
    /** Ours: a role being changed. */
    changing: 'Changing…',
    takeOff: 'Take off',
    /** Ours: the confirming step's two buttons. */
    takeOffConfirm: 'Take them off',
    keep: 'Keep them',
    takingOff: 'Taking them off…',
    confirmTakeOff: (who: string, app: string) =>
      `Take ${who} off ${app}? Their work on it stops.`,
    takenOff: (who: string, app: string) => `${who}'s work on ${app} has stopped.`,
    /** Ours: what an add or a role change did, said in the page's status (the review's I4). */
    added: (who: string, app: string) => `${who} can work on ${app} now.`,
    madeOwner: (who: string) => `${who} is an owner now.`,
    madeHelper: (who: string) => `${who} is a helper now.`,
    /** Ours: an owner taking themselves off (the design's hand-over: add an owner, then leave). */
    confirmLeave: (app: string) => `Take yourself off ${app}? Your work on it stops.`,
    leave: 'Take me off',
    couldnt: "We couldn't change who's on it just now. Nothing has changed.",
    refused: {
      MEMBER_USER_NOT_FOUND:
        "We don't know anyone by that name yet. They need to sign in to Manifest once: send them app.manifest.internal, then try again.",
      MEMBER_USER_AMBIGUOUS: 'Two people share that email. Use their CWL login instead.',
      MEMBER_MAY_NOT_BUILD:
        "Only UBC faculty can work on apps for now, so we can't add them yet.",
      PROJECT_LAST_OWNER: 'Someone has to own it. Make someone else an owner first.',
    },
  },
  /**
   * F6b (design §3, D3): WORKING ON IT TOGETHER. Every member reads every conversation on the app;
   * only its own person acts in it; an owner may stop it. The design's words, and the plan's
   * *Words proposed* (*"<Name> · <title>"*, a removal's sentence).
   */
  together: {
    started: (who: string) =>
      `${who} started this. Only ${who} can answer it or carry it on.`,
    onlyThey: (who: string) => `Only ${who} can answer this.`,
    stoppedBy: (who: string) => `Stopped by ${who}.`,
    removed: (who: string, app: string) =>
      `${who} was taken off ${app}. Their work on it stopped.`,
    /** A row of the app's conversations: who started it, then its title (the link). */
    row: (who: string, title: string) => `${who} · ${title}`,
    you: '(you)',
    holder: (who: string, title: string) => `${who} is working on it: ${title}.`,
    seeIt: 'See it',
    /** Ours: another's wait is theirs, never "you" (the chip, the thread's first line, a row). */
    paused: (who: string) => `Paused, waiting for ${who}`,
    needs: (who: string) => `Needs ${who}`,
    asked: (who: string) => `What ${who} asked for`,
    /** Ours: what a round needs of its person, to a colleague: theirs to read and answer. */
    waitsFor: (who: string) => `It's waiting for ${who}.`,
    onlyTheyKnow: (count: number, who: string) =>
      count === 1 ? `One thing only ${who} knows` : `Two things only ${who} knows`,
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
