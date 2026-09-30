# The faculty experience, moment by moment

*Drafted with Rich, starting 2026-09-27. This is the design the front-end is built from. Change it here first,
then the code.*

**Read with:**
- [`2026-09-27-reading-note.md`](./2026-09-27-reading-note.md): what the platform is, and what surprised us;
- [`api-findings.md`](./api-findings.md): every gap, numbered `FE-n`, which the moments below cite;
- the design system in `manifest/docs/superpowers/design/system/`. **Every sentence here obeys `10-language.md`
  and every state is one of `20-states.md`'s five.** Where a moment quotes the prototype, the quotation is
  verbatim; where it changes it, it says why.

**The prototype's words are a starting point, not a script** (Rich, 2026-09-27: *"Don't take the design mocks as
absolutes. We can change the wording as necessary to what would be best. I'm not fixed on anything."*). The
design system's rules bind; its example sentences do not.

## The person, and the task

**An instructor.** They teach a seminar, and are not a developer. They meet Manifest perhaps six times a year and
carry no mental model between visits. They are anxious about one thing: that it breaks in week eight in front of
their students.

**Their task, in their words:** *"A page where students post a response to the week's reading. They shouldn't see
anyone else's until they've posted their own. I want to be able to skim them all the night before the seminar."*
About 200 students.

## How each moment is written

| Heading | What it holds |
|---|---|
| **Trying to** | what the person wants, in one line |
| **They see** | the screen, with its exact words in quotation marks |
| **Fed by** | the operation or event behind every value — or **ours** (the front-end's own state), or **FE-n** (a gap, with what we do meanwhile) |
| **If it goes wrong** | each failure, and the exact words the person reads |
| **They wait** | how long, and which of the five states the wait is |

**The rule:** no value on a screen may pretend an API exists. A value is from an operation or an event that
exists (or lands in a named sitting of the enablement plan), or it is ours, or it names its gap.

## The shape of the whole thing

```
A. MAKING IT (week −3)                B. GOING LIVE (week −1)          C. RUNNING IT (weeks 1–13)
 1 Sign in                            11 The checklist, in our words    16 Coming back after three weeks
 2 Your apps — nothing yet            12 The sign-in rehearsal          17 A change after launch
 3 Describe it                        13 Waiting on an administrator    18 Adding a TA
 4 Name it, say who it's for — made   14 Putting it live (step-up)      19 Week eight: it breaks
 5 The plan                           15 Handing over the address       20 End of term
 6 Watching it get built
 7 Seeing it, as pretend people       Throughout: the month's AI allowance running out; the connection
 8 Asking for a change                dropping mid-build; an outside agent asking for something only a
 9 "This one's good" → trying-out     person may do.
10 The three long clocks, started early
```

**Outline approved by Rich, 2026-09-27** (*"that outline looks about right"*).

## Decisions this walk-through makes

*Rich's decisions are quoted and dated. The rest are ours: each gives the option chosen, the options rejected,
and what changing course would cost.*

- **D1. A project is born after the person has described it, chosen a name, and said who it is for. Understanding
  the description is a platform cost** (Rich, 2026-09-27: *"describe the app and suggest some names, but allow the
  instructor to choose one or edit one. We should ask the audience questions then create the project"*; and *"the
  'understanding what the user asked for, proposing names, etc.' can be considered a platform cost. That will
  always be the same model for all users"*). **Needs FE-1**, which Rich approved in principle the same day.
  - *Rejected:* creating the project at the first keystroke, which puts an address in the world before anyone
    agreed to anything; a plan written without a model.
- **D2. There is one road in: describing.** The prototype's hand-made route (*New*: type a name, take the one
  template) is the reference console's journey, not this product's. *Start something new* opens *Describe*.
  - *Rejected:* keeping both, which asks a faculty member to choose between two ways of doing one thing before
    they know the difference.
  - *Changing course* is one screen, and *New*'s design already exists.
- **D3. The blueprint, and any starter, are chosen by an agent from what the person described** (Rich,
  2026-09-27: *"The app should start from the most appropriate blueprint. Sure we may not have many now but we will
  have more in the future. And we will have an agent whose job it is to determine, based on what the faculty member
  has filled in, which blueprint to use."*).
  - Today the choice is trivial: one blueprint, `node-ts-mongo@1`, with one starter, the note-taking proof app.
  - The step exists from the start, so a second blueprint is a catalogue entry rather than a redesign. When no
    starter fits, the app starts from the blueprint's skeleton (`starter` omitted).
  - The person never picks a template (C3). The choice shows only as what the app *can do*, in words: *"Students
    sign in with CWL · Keeps what they write · Can ask an AI model, on a budget"* (the blueprint's `provides`).
  - *This supersedes this walk-through's first draft*, which always started from the skeleton.
- **D4. The person never sees a delegated token on the main road.** The browser mints one per conversation and
  hands it to our server. The prototype's *Agents* screen becomes *let an agent of your own in*, the
  bring-your-own-agent path (§1 of the spec).
  - *Rejected:* showing the key. A secret shown once is a moment of real anxiety, spent for nothing when our own
    server is the one that needs it.
- **D5. *We*, everywhere** (Rich, 2026-09-27). The product has one voice, the plan included. The prototype's
  *"Here's what I'd build"* becomes *"Here's what we'd build"*. Many agents do the work (see *The agents*, below),
  and the person never has to keep track of which one is speaking.
- **D6. The agreed plan is committed into the app as `docs/plan.md`** (Rich, 2026-09-27). It is the agreement,
  versioned with the code it describes, and readable by any agent that ever works on the app.
- **D7. Only faculty build, for now; and administrators** (Rich, 2026-09-29: *"This should be available to all members
  of faculty (using the associated CWL role). For everyone else (save for a prescribed list of admins), they should
  see a screen telling them that it isn't available for them at the moment."*; *"the platform, because this would then
  also work for agentic use"*; *"Faculty members should be able to add other faculty members for now. Perhaps in the
  future they should be able to add TAs"*).
  - **The platform decides** (**FE-39**): faculty by CWL's `eduPersonAffiliation`, administrators by a prescribed list
    in its settings, **by PUID** (Rich, 2026-09-29, the platform's recommendation: a CWL login can be reassigned to
    someone new). It refuses anyone else a project, an intake, or a place on someone's app, whatever client asks, an
    agent included. `getMe` answers the decision, and our screens only follow it.
  - **Someone who stops being faculty keeps their apps, and starts nothing new** (Rich, 2026-09-29, the platform's
    recommendation: a course app mid-term keeps its owner). Their memberships and tokens keep working.
  - *Rejected:* a list of instructors that administrators keep (all faculty needs nobody to keep it);
    deciding in our own screens, which a student calling the API directly would walk past; the IdP refusing everyone
    else at sign-in, which leaves no page to say why.
  - *Changing course:* who may build is one predicate on the platform (TAs later), and one field we read.

---

# A. Making it

## 1. Sign in

**Trying to:** get in.

**They see:** the prototype's *Sign in*. It is the one screen with no rail, and a full-height UBC-blue panel on
the left.
- **Left panel:**
  - *"Build the tool your course needs."*
  - *"Describe it. We build it, sign your students in with CWL, and run it at a UBC address."*
  - Three ticks: *"Nothing to install" · "Nothing to keep patched" · "No configuration files, ever"*.
- **Right panel:**
  - *"Sign in"*
  - *"You'll go to UBC's own sign-in page and come straight back."*
  - **[Continue with CWL]**
- **Changed from the prototype:** the note under the button becomes *"Manifest never sees your password. UBC tells
  us your name, your email and your CWL login."* Sitting 5 asks UBC for `uid`, the login name, and the sentence
  must say so.

**Fed by:**
- The page is ours, served on 7105 through the edge at `https://app.manifest.internal` (sitting 6).
- **On load**, `getMe`: `401 UNAUTHENTICATED` shows this screen; `200` goes to *Your apps*.
- **The button** navigates to `/auth/login?returnTo=<the path they came for>` (sitting 6: signs in on our origin,
  with our own cookie). CWL, then back to `returnTo`. `getMe` then answers `{ displayName, email, role }`.
- **Our server** learns who it serves by replaying the session cookie to `getMe` (**FE-2**, not yet sanctioned),
  and keeps a person record keyed by `Me.id` for their conversations.

**If it goes wrong:**
- **Left at the CWL page for more than ten minutes.** The sign-in's cookie lapses and they land on *Your apps*,
  not where they were going. Nothing to say; it is a signed-in person arriving home.
- **The sign-in is refused** (a bad or unbound assertion). The platform answers its callback with a JSON error
  body, on a page that is the platform's, not ours. **A person sees raw JSON** (auth.ts's own comment ✓: *"maps to
  401 with an envelope"*). That is **FE-17**. Meanwhile, nothing we can change.
- **Twelve hours later, mid-task, the session ends.** Every call answers `401`. We show: *"You've been signed out.
  It happens after twelve hours. Sign in again and you'll come straight back here."* **Nothing the agent is doing
  stops**, because it holds its own token, and the sentence says so when a conversation is running: *"Your agent
  is still working."*

**They wait:** seconds. No state.

**Someone who isn't faculty** (D7: a student, staff, anyone not on the administrators' list):
- **They see**, with no apps of their own (every student: nobody can add them to one), in place of every page,
  whatever address they came to:
  - the brand, **"Manifest isn't available to you at the moment."** · *"It's open to UBC faculty for now."* ·
    *"You're signed in as <their name>."* · **[Sign out]**; no rail;
  - still, in the *not yet* tone: nobody is working on anything, and nothing is wrong.
- **Someone who stopped being faculty, and keeps apps** (D7): *Your apps* with their apps, and they go on working on
  them, but the rail has no *Start something new*, and `/new` says the same two sentences in the page.
- **Fed by:** `getMe`'s `mayBuild: false` (**FE-39**), then `listProjects` for whether they keep apps. Until the
  platform ships it, everyone builds, as before.
- **If it goes wrong:**
  - The platform refuses them part-way (their faculty status changed since they signed in: `createProject` or
    `startIntakeSession` answers `403 BUILDING_NOT_OPEN`): we read `getMe` again, and the page follows. Never an error.
  - Our server refuses starting something new (`POST /api/conversations`) with the same code, before the platform has
    to.
  - `listProjects` fails: moment 2's *"We can't reach Manifest just now…"* and **[Try again]**.
- **They wait:** under a second.

## 2. *Your apps*, with nothing in it yet

**Trying to:** start. The prototype draws no empty state.

**They see:**
- **The rail.** *"Your apps"* (current) and *"Start something new"*. No project section, because none is open
  (`SideNav`'s own README; the prototype showed it on every screen).
- **The page:**
  - Heading *"Your apps"*.
  - *"Nothing yet. Tell us what your course needs, and we'll build it."*
  - **[Describe what you need]**
  - One quiet line under it, in `caption`: *"Making an app takes an afternoon. Letting your students in takes a
    little longer, while we move it through the steps that keep the app, and their data, safe and secure."*
    - This is Rich's wording, 2026-09-27, replacing *"UBC paperwork"*.
    - Spec §13 wants the lead time known before anyone needs it, and this is the earliest honest moment.

**Fed by:** `listProjects` answering `[]`. **For an administrator**, `listProjects` answers every project on the
platform, so *Your apps* keeps only those whose `owner.id` is theirs. It **cannot** see the ones they were added
to as a collaborator without one `listMembers` per project (**FE-10**). The screen with apps on it is moment 16.

**If it goes wrong:** `listProjects` fails: *"We can't reach Manifest just now. Nothing of yours has changed. Try
again in a minute."* **[Try again]**.

**They wait:** under a second.

## 3. Describe it

**Trying to:** say what they need, the way they would to a colleague.

**They see:** the prototype's *Describe*, without its two fixed tiles (the audience moves to moment 4).
- *"What do you need?"*
- *"Say it as you'd say it to a colleague."*
- The textarea, labelled *"In your own words"*, with the hint *"Three sentences is plenty."*
- **[Carry on]**
- **Right card:** *"Nothing is built yet"* · *"Next, we say back what we understood and suggest a name. Nothing
  exists until you agree."*

**After [Carry on]**, the button's area becomes a **working** row: a breathing dot and *"Reading it"*. There is
no spinner.

**Then, usually, a few questions** (the *understanding* agent, `agents.md`). Only the ones whose answers would
change what gets built, three at most, each with a short answer field, or choices where the answers are few:

- *"A few questions, so we build the right thing."*
- e.g. *"Can a student change a response after posting it?"* · *"Should a TA see everything you see?"* · *"Does
  each week open on a set date, or all at once?"*
- **[Carry on]**, and beside it, *"Skip these — use your best guess"*. Skipped questions become the plan's
  *"Things we assumed"* (moment 5), so a guess is always shown, never hidden.

A second round is allowed when an answer opens a new question. A third is not: the plan (moment 5) is where
anything left gets corrected.

**Fed by:**
- **The words are ours.** They become the first message of a conversation our server creates now, which is not
  yet tied to a project.
- **The understanding is FE-1's intake session.**
  1. The browser starts one, in the person's own session.
  2. It hands the key to our server.
  3. Our server runs the intake agents (`agents.md`) on the platform's one intake model, each answering a
     structured schema of ours:
     - **understanding**: its follow-up questions, then a one-sentence restatement, a guess at the two audience
       answers with the words it guessed from, and anything no blueprint can do;
     - **naming**: three names, each address checked with `checkSlug` before it is offered;
     - **blueprint**: which blueprint and starter, from `listBlueprints` (`provides`, `starters`).
  - The blueprint's abilities come from `getBlueprint` (`provides`), and the key is ended as soon as the answer
    arrives.
  - Every platform model call whose answer is shown is structured output (the platform's own rule, D5 plan
    Decision 22). We keep to it too.

**If it goes wrong:**
- **Intake is paused for the day** (FE-1's per-person bound). *"Describing new apps is paused for today. You can
  still name it yourself."* It goes on to moment 4 with no suggestions.
- **The model does not answer, or answers badly twice.** *"We couldn't read that just now. Your words are kept.
  Try again, or name it yourself."*
- **They asked for something the blueprint cannot do** (send grades to Canvas, email students). It is said in the
  understanding, not refused: *"One thing we can't do yet: send marks to Canvas. Everything else, we can."* An
  admission that ends with an offer (`10-language.md`).
- **Until FE-1 lands,** against the real platform there is no intake model, so this screen goes straight to
  moment 4 with no suggestions. Against the mock it is scripted.

**They wait:** a few seconds, **working**.

## 4. Name it, say who it's for — and it is made

**Trying to:** agree on what it is called, answer the two questions only they can, and have it made.

**They see:** one page.

1. **What we understood.** The restatement, as a quotation of them: *"A page where students post a response to
   the week's reading and see everyone else's once they have posted, and you can skim them all at once."* Under
   it: **[That's not it]**, which goes back to moment 3 with their words kept.
2. **What should we call it?**
   - Three `Choice` cards, e.g. *"Reading responses"*, *"Weekly responses"*, *"Seminar reading log"*. Each card
     shows its address underneath in mono (`reading-responses.manifest.internal`).
   - A fourth card, *"Something else"*, opens a name field.
   - **The name and the address are two things** (sitting 5). The address comes from the name, and *"Change the
     address"* opens it as its own field.
   - Every suggested address is **checked before it is shown**, so none offered is taken.
3. **Who is going to use it?** The prototype's four `Choice` cards:
   - *"Just me"* / *"I am the only person who will open it"*
   - *"One class"* / *"A section or a seminar group"*
   - *"A large course"* / *"Hundreds of students at once"*
   - *"Anyone at all"* / *"Open beyond UBC"*

   The intake's guess is preselected and says so: *"We guessed from 'about 200 students'."*
4. **How do they turn up?** *"They come and go"* / *"Spread across a week"* · *"All at once"* / *"A deadline, or
   during a lab"*. Guessed the same way.
5. **In a sentence, why**, optional: *"shown to the people who size it, for a large course or an open app."*
6. **Worth knowing now**, the prototype's amber card, rewritten for sitting 5: *"You can rename it whenever you
   like. Its address can't change once it's live, because UBC registers it."*
7. The footer note: *"Who it's for sets how much room we give it. You can't change that yet. Ask us and we'll do
   it by hand."* (**FE-15**)
8. **[Make it]**

**Fed by:**
- `checkSlug` as the address is typed, and before each suggestion is shown. The answer is always `200`;
  `reasons[]` carries the platform's own `message`, shown as it is (`FormField`'s rule).
- **[Make it]**, in order, all in the person's browser session:
  1. **`createProject`** `{ slug, name, blueprint, starter?, audience: { scale, burst, justification } }`, with
     the blueprint and starter the *blueprint* agent chose (D3; today `node-ts-mongo@1`), and one
     `Idempotency-Key` per press, reused on a retry. It answers `CreatedProject`: three environments,
     none deployed, and the spec validated.
  2. **`mintToken`** for our server, one per conversation:
     - named *"Building — <conversation's title>"*, so `madeThrough.tokenName` and `AgentSession.via` name the
       thread (F13's workaround);
     - `project:read`, `source:write`, `secret:write`, `build:create`, `release:create`, `release:deploy`,
       `output:read`, `agent:session`;
     - seven days.
  3. **`mintToken` again**, for the app's standing *Keeping watch* token (`project:read`, `output:read`: moment
     16), which carries our server's subscription, history and emails for as long as the app exists.
  4. **Both tokens go to our server** over our own endpoint. The conversation is now tied to the project.
     - The conversation's token is never kept beyond the conversation's life.
- **What the person sees happen** is three lines ticking on the stream's replay, which are real events:
  - `project.created` → *"Reading responses is yours."*
  - `repository.seeded` → *"A starting point with CWL sign-in is in place."*
  - `spec.validated` → *"Its three addresses are ready."*

  Seconds. Then straight into moment 5. The prototype's *Provision* screen collapses into this.

**If it goes wrong:**
- **The address is taken, reserved or not an address.**
  - `SLUG_TAKEN`: *"a project already has this name"*. The platform's words. We add *"Pick another, or ask its
    owner to add you."*
  - `SLUG_RESERVED`: the platform's words say what the label stands for (*"chem is UBC's course subject code for
    Chemistry"*).
  - `SLUG_INVALID`: the platform's words, under the field.
  - The mock answers only the first of the three (FE-16), so the other two are designed from the contract's own
    examples.
- **Created, but the token did not mint.** The project exists and nothing is building. We retry the mint once.
  If that fails too: *"Reading responses is made, but we couldn't start work on it. Nothing is lost. [Start
  building]"*.
- **Anything else.** *"We couldn't make it just now. Nothing was made. Try again."* The retry reuses the key, so
  a create that did land is answered, not repeated.

**They wait:** a few seconds, **working**.

## 5. The plan

**Trying to:** check that what will be built is what they meant, before anything is built.

**They see:** the prototype's *Draft*, with the name at the top now that there is one.
- *"Here's what we'd build"*: **we**, not the prototype's *I* (D5).
- *"Read it as a description of the finished thing, not as instructions. Anything wrong, say so in a sentence."*
- **Five rows**: *What students see · What you see · What it keeps · Who gets in · AI*. The prototype's worked
  example is the model to write to.
- **Who gets in** is honest about what the platform can do: *"Anyone with a CWL can sign in. We can't limit it to
  your class yet, so it only shows each student their own work until they post."* There is no course-restricted
  sign-in (**FE-20**), and the plan must never promise one.
- *"Things we assumed"* (three at most), and ***"Two things only you know"***: each with a short answer field, so
  the answer is typed where the question is.
- **Right card:** *"Say yes and this happens"* · *"We build it on your draft address, and you watch. You can
  leave; it keeps going."* · **[Yes, build that]** · **[Not quite — let me correct it]**
- *Not quite* opens one sentence box. The plan comes back with the changed rows marked.

**Fed by:**
- **Our server**, with the token from moment 4:
  1. **`getAgentBudget`**: the person's month, and whether there is room.
  2. **`startAgentSession`** (sitting 7): a key charged to the person, capped, and routed by the project's
     classification.
  3. `getKnowledgePack` and `getTree`, then one structured completion whose schema is ours: the five rows, the
     assumptions, the two questions.
- **The plan is ours**: stored in the conversation, versioned per correction. When they say yes, it is also
  **committed into the app as `docs/plan.md`** (D6), so any agent that ever works on the app reads what was
  agreed.

**If it goes wrong:**
- **The month's allowance is used up** (`AGENT_BUDGET_EXHAUSTED`; `getAgentBudget`'s `remainingUsd` is 0). This
  is **needs you**, with the one thing that is true: *"Your AI allowance for this month is used up. It comes back
  on 1 October. Nothing is lost; this plan will be here."*
  - There is no *ask for more*. An administrator setting one person's budget is not built (the plan's *What this
    plan does not build*).
- **Spend cannot be read** (`getAgentBudget` answers `null` with a reason). We start anyway, since the platform
  refuses a spent month itself, and say nothing.
- **The plan comes back malformed twice**: *"The plan didn't come out right. Try again. Nothing was built."*
- **The model is not good enough to plan** (see the model decision in `api-findings.md`). This is the moment the
  laptop's 4B model will be judged by.

**They wait:** tens of seconds, **working**: *"Reading how apps like this are built" · "Writing the plan"*, each
ticking when it has finished.

## 6. Watching it get built

*The prototype does not draw this. The substance and the layout are agreed (Rich, 2026-09-27); the mockups are
in the visual companion's `moment6-layout.html`, kept under `.superpowers/` and not committed.*

**The layout is C: talking on the left, the work on the right** (Rich, 2026-09-27: *"C is the way forward"*).
- **Left: the conversation.** Their words and ours, questions as *needs you* cards, and the message box at the
  bottom. A conversation outlives one round of work: an earlier round collapses into the thread as one line
  (*"Built and put on your draft address · 18 Sep, 9:12 · What changed"*).
- **Right: the work**, which stays in view however long the conversation grows. The state chip, the steps with
  the line under the current one, the permission to leave, then the draft address, then **[Stop]**.
- *Rejected:* **A**, the work as the page with dialogue inline, where the dialogue gets lost between the steps
  once there is more than one round. **B**, a chat thread with the steps as one block in it, where the steps
  scroll away as the conversation grows.

**Trying to:** see that it is really being made, answer anything only they can, and know they can leave.

**They see** (decided, Rich 2026-09-27: *steps, plus a line now*):
- **The steps are the backbone**, in plain words (`LiveSteps`). Each ticks only when it has actually finished,
  backed by a real signal:

  | Step | Ticks on |
  |---|---|
  | *Writing the pages* | our lead's commits (`createCommit`; `repository.committed`) |
  | *Checking it holds together* | the dry run: `createCommit` with `dryRun`, and its spec validation |
  | *Building it* | `build.started`, then `build.succeeded` |
  | *Putting it on your draft address* | `deploy` to sandbox; `instance.provisioning`, then `starting`, then `healthy` |
  | *Checking it answers* | `listInstances`, `getInstanceOutput`, **on the draft address only** (FE-24: staging serves real people, so its output is not the agent's to read) |

- **One plain line under the current step** saying what we are doing now: *"Writing the page students post on."*
  It is written by the lead, as structured output, never raw model text.
- **Each finished step has a disclosure: what changed**, in words (*"Two pages, and the rule about who sees
  what"*), built from the lead's own account of its commit. Behind it, *"The exact changes, for whoever you ask
  for help"* lists the files, which is machine text on purpose (`InverseSurface`).
- **Questions come inline**: a *needs you* card with an answer field. *"It is waiting, not failing."*
- **A fix it made on its own is one sentence**: *"The first build didn't take. We fixed a missing piece and built
  it again."* The raw words sit behind the disclosure.
- **Permission to leave**: *"A few minutes. You can leave. We'll email you when it's ready, or if it needs
  you."* The email is ours by design (the rationale's F9): our server's watch, moment 16.
- **They can add a message at any time** (*"also add a word count"*). The lead reads it at its next step, and
  the line under the current step says so: *"Got it, after this build."*
- **What it has cost, always visible** (Rich, 2026-09-27: *always visible*, chosen over *only when it matters*
  and *never money*):
  - a small line at the foot of the work panel: *"$0.40 so far · $9.60 left this month"*;
  - the month's figure is `getAgentBudget`;
  - **the conversation's own figure has no source yet (FE-23)**. Until it has one, the line shows the month's
    figure alone: *"$9.60 left this month"*.
  - Intake (moments 3–4) is the platform's cost, and shows nothing.
- **[Stop]**: *"Nothing is lost. Your draft address keeps whatever was last put there."* This ends the agent
  session (`endAgentSession`). The token lives on with the conversation, so it can be resumed.

**What *"Checking it answers"* can and cannot prove.** The lead can see that the app started and answered, and
read what it printed. **It cannot sign in to the app as a pretend student and post a response**:
- the app is behind CWL;
- nothing tells the lead which pretend people exist, or how to sign in as one (**FE-3**);
- it has no browser.

So the step's words stop at what is true: *"It started and answered."* **Never *"It works"*.**

**Fed by:** our conversation (ours), the project's stream (our server's subscription, with the conversation's
token), and the operations named in the table.

**If it goes wrong:**
- **A build fails.** The lead reads `getBuildLog`, the *explaining* agent says why in a sentence, and the lead
  fixes it and builds again.
  - The step shows it happening: *"Building it (second try)"*, with the reason as its note (*"A piece it depends
    on was missing"*).
  - **After three tries it stops and asks**, as *needs you*: *"We couldn't get it to build after three tries.
    Nothing is broken: your draft address still has the last version that worked."* (or *"…is still empty"*).
    **[Try a different way]** · **[Stop here]**.
  - The platform's own words are behind *"The exact words, for whoever you ask for help"*.
- **It builds, but never answers on the draft address** (the instance `failed`; an Incident, `listIncidents`).
  - The same three tries, fed by the Incident and `getInstanceOutput`.
  - **The two facts** are on the right while it happens: *serving right now* (the draft address's last good
    version, or nothing) beside *the last attempt*.
- **The piece of work reaches its own limit.** A session is capped at $2 so that a looping agent burns its own
  cap (D8). LiteLLM answers `429 budget_exceeded`, and `getAgentBudget` says the month still has room.
  - That is a **checkpoint, not a failure**: *"This piece of work has used what we allow in one go. Carry on?
    It can use up to $2 more of the $10 you have this month."* **[Carry on]** · **[Stop here]**.
  - Carrying on starts a new agent session. We **never** start one without asking, which would defeat the cap.
- **The month's allowance runs out mid-way** (`429 budget_exceeded`, and `getAgentBudget` says the month is
  spent). **Needs you**, with what is true: *"Your AI allowance for this month is used up, part-way through.
  What's done is kept: the pages are written, and the build stopped before it began. It comes back on 1
  October."*
- **The connection drops.** The work runs on our server, never in the page.
  - The page says *"Reconnecting…"* quietly and picks up where it was.
  - Our server's own subscription to the project's stream reconnects and is replayed. The replay is only 50
    events (**FE-7**), so it also re-reads the build and the environment to be sure.
- **A question nobody answers.** Most questions carry our default (*"We've built it so only you can"*) and the
  work goes on around them. A question the work cannot go past pauses the conversation: *"Paused, waiting for
  you."* After a day we email once. It never *"gives up"* on its own, because nothing it did is at risk by
  waiting.
- **The conversation's token lapses** (seven days). The next time the person opens it, the browser mints a new
  one. Nothing is shown.

**They wait:** minutes, **working**, and they may leave.

## 7. Seeing it

*Drafted 2026-09-27. Rich decided how pretend people sign in (show the logins), that staging is UBC's real
staging world, that its registration is reviewed with a wait, and that staging CWLs belong to real people
(FE-24). On the laptop, staging keeps the fake sign-in, as a stated difference from UBC.*

*Changed 2026-09-28, with F4's plan (Rich): **Trying out says UBC's words everywhere, the laptop included**, never
the pretend logins, never a date and never "We asked…", since nothing records a staging registration (FE-6, FE-24).
His words replace "That usually takes <n> weeks". The Preview's rail items are Preview and Conversations until
their plans build the rest.*

*Changed 2026-09-29, with F5's plan (Rich): **on *Trying out*, [Open it in a new tab] is shown only once UBC's identity
team has registered the address** (*"Hide until registered"*), read from the platform's staging record when it exists
(F5b); until then the address alone, in mono. The Preview moves to `/apps/<slug>/preview`, and the app's Overview is its
landing page (F5).*

**Trying to:** see the thing they asked for, as a student would and as they will.

**The three addresses mean three different worlds** (Rich, 2026-09-27):

| Address | World | Who can sign in |
|---|---|---|
| **Your draft** (sandbox) | **Pretend.** A fake sign-in, and (later) a fake Canvas and a fake academic API | Pretend people: agents and instructors, freely |
| **For trying out** (staging) | **UBC's real staging world**: IAM's staging sign-in, Canvas's and the academic API's staging instances | **Real people, with a staging CWL**: separate from their everyday CWL; there are no test accounts (FE-24) |
| **For your students** (production) | **Real** | Your students, with their CWL |

**They see** the Preview screen (rail: *Preview*), rebuilt around what is true:
- **A switcher across the top**: *Your draft · Trying out · For your students* (`SegmentedControl`). Each shows its
  address in mono and **[Open it in a new tab]**. It opens in a tab and never in a frame, because apps refuse to
  be framed by another origin (`frame-ancestors 'self'`, the rationale's F12).
- **On *Your draft***: a *Try it as* card, one row per pretend person, each with its sign-in details and a copy
  button:
  - *"A student · sign in as `student`, password `student`"*
  - *"An instructor · sign in as `instructor`, password `instructor`"*
  - One sentence says what the draft is: *"Your draft is a practice copy. Everyone in it is pretend, and so is
    anything they post."*
- **On *Trying out***: the same address and button. **Until UBC IAM has registered it for staging** (a review,
  with a wait: FE-24, answered by Rich), the card is **waiting on someone**, *UBC's identity team*, still, with no
  number, because nothing records when it began (FE-6):
  - *"Trying out uses UBC's real staging sign-in, so UBC's identity team registers it first. That takes some
    time, as several teams at UBC help make sure the app and its data are kept safe and secure."* (Rich,
    2026-09-28, in place of *"That usually takes <n> weeks. We asked on 18 September."*: nothing asks, so nothing
    can say when.)
  - Meanwhile: *"Your draft is ready to try now."*
  - **The laptop says the same** (Rich, 2026-09-28), though its staging signs in with the pretend IdP: no logins
    are shown on this tab.
  - **Once registered**: *"Sign in with your staging CWL. It's a separate account from your everyday CWL, for
    trying things before they're real. [How to get one]"*
    - There are no pretend people here: everyone who signs in to staging is a real person with a staging CWL
      (Rich, FE-24). So a TA, a colleague, or a few students who have one can try it too.
  - A staging CWL is UBC's to issue, so *How to get one* links to UBC's own page. We do not know its address yet.
- **On *For your students***: *"Not live yet. This is the address your students will use."* Then **[See what
  going live needs]** (moment 11).
- **On the right, the two facts** for the chosen address: *serving right now* and *the last attempt* (`TwoFacts`).
- **Under them**: *"Not right? Tell us what to change."* **[Ask for a change]** opens the conversation (moment 8).

**Fed by:**
- `listEnvironments` (each `hostname`, `url`, `instance`); `listInstances` (`serving`, newest first);
  `listIncidents` for a failed last attempt.
- **The pretend people: FE-3.** Until the platform publishes them, they come from our own configuration, and on
  the laptop that is the local IdP's `student` and `instructor`. The configuration is marked, so it cannot pass
  for the platform's answer.

**If it goes wrong / quirks:**
- **On the laptop, Manifest's own sign-in and the draft's are the same local IdP**, so opening the draft signs the
  person straight in as whoever they signed in to Manifest as. The *Try it as* card says so on the laptop only:
  *"If it opens as you, use Sign out inside the app, then sign in as the student."*
  - At UBC this does not happen: Manifest's sign-in is real CWL and the draft's is the fake one.
- **Nothing is on the draft address yet**: *"Nothing there yet. It appears when the first build is done."*
- **The draft's last attempt failed**: the two facts show it, and *[What went wrong]* opens the conversation that
  was working on it.

**They wait:** nothing. A tab opens.

## 8. Asking for a change

**Trying to:** change something they have seen: *"also show a word count"*, *"let TAs see everything"*.

**They see:**
- **Where they ask:**
  - *"Ask for a change"* on the Preview screen, or on the project's Overview, starts **a new conversation**,
    titled from what they asked (*"Word count"*).
  - The message box of an open conversation continues **that** one.
  - One conversation is one piece of work (the prototype's *Conversations* screen), so a change asked six weeks
    later has its own history, and its own line of spend.
- **One conversation works on an app at a time; the others wait in line**, and say so (decided, Rich
  2026-09-27). The top of the waiting one reads **waiting on someone**: *"Waiting for 'Word count' to finish. It
  starts by itself."* Its message box still takes messages.
  - The reason: an app has one draft address (§23: one sandbox per project), and two conversations writing to it
    at once would each find `main` moved under them (`409 SOURCE_CONFLICT`: the platform never merges). Each
    would then redo its work, and pay twice.
  - *Works* means from reaching the front until its change is built, stopped or set aside, waiting on the person
    included, so a half-made change never sits under the next one's version (F4's plan, Decision 5).
- **The change is agreed first** (Rich, 2026-09-28): *"Here's what we'd change"*, moment 5's pattern, showing only
  what changes and *"Everything else stays as we agreed."* **[Yes, change it]** updates `docs/plan.md` (the
  agreement as it now stands, and a dated *Changes* list in their own words), then the work starts. **[Not now]**
  sets it aside: *"Set aside. Nothing was changed."* D6 holds: the plan stays the agreement.
  - A fix of something that went wrong (*[What went wrong]*, moment 9) changes no agreement, and is not asked
    about.
- **Then moment 6**, in layout C: the work on the right, the conversation on the left.

**Fed by:** ours, meaning the conversation and the queue. **`mintToken`** runs in the browser, once per new
conversation, named after it. Then moment 6's operations.

**If it goes wrong:**
- **Someone pushed to the app's code outside Manifest** (driver 2, GitHub). The lead's commit is refused
  `409 SOURCE_CONFLICT`. It re-reads the tree and redoes the change; the person sees nothing unless it happens
  three times.
- **The change touches something reviewed at launch** (the dry run's `spec.sensitiveDiff`: a new place it keeps
  things, a new sign-in detail, AI). Before launch it changes nothing. After launch it matters (moment 17), and
  the conversation says so before building: *"This change will need an administrator's look before it reaches
  your students."*

**They wait:** as moment 6.

## 9. "This one's good" — putting a version on the trying-out address

**Trying to:** say *"this version, not whatever comes next"*, and put it where real people, with staging CWLs, can
try it.

**They see:**
- **When a round of work finishes, the work panel ends with:**
  - *"Ready on your draft address."*
  - **[Try it]**, which opens moment 7;
  - **[Put this version on trying-out]**.
- **The Preview screen's draft tab has the same button**, beside the two facts.
- **Pressing it asks once, in words:** *"Put the version from today, 3:12pm on the trying-out address? The one
  there now keeps answering until this one proves it can."* **[Put it there]**
- **Then Deploy's run of stations** (`Timeline`): *Waiting its turn · Making room · Starting up · Answering*.
  Under 90 seconds, **working**.
  - The prototype's Deploy screen, with its words kept where they are true.
  - A version is only ever *"the version from <when>"*, never a digest.
- **While UBC's identity team has not yet registered it for staging** (FE-24), the stations end honestly:
  *"It's on the trying-out address. Nobody can sign in there until UBC's identity team has registered it. That
  takes some time, as several teams at UBC help make sure the app and its data are kept safe and secure."* (Rich,
  2026-09-28: no *"We asked…"*, since nothing asks; the laptop says the same.)
- **The version is fixed when they are asked**: the one the draft was serving at the question is the one put
  there, even if more work finishes in between.

**Fed by:**
- **The release the draft address is serving**, from `listInstances` on the sandbox (`serving`), then its
  `releaseId`.
- **`deploy`** to the staging environment, from the **person's session**, so the record says who chose this
  version. The same release, never a rebuild (§13: *"Promotion never rebuilds"*).
- The stations tick on `instance.provisioning`, `sso.registered`, `instance.starting`, `instance.healthy`.
- **This matters later:** production deploys only the release serving staging (`RELEASE_NOT_STAGED`). So this is
  the step that chooses what goes live.

**If it goes wrong:**
- **It never answers.** The two facts: *"Serving right now: the version from 18 September. Last attempt: didn't
  start, 2 minutes ago. Nobody lost anything."* **[What went wrong]** starts a conversation fed by the Incident.
- **A secret it needs has no value for staging** (`RELEASE_SECRET_NOT_SET`). **Needs you**: *"It needs <the
  secret's plain name> before it can start there."* It opens a field to set it (`setAppSecret`, staging, from the
  session).

**They wait:** under 90 seconds, **working**; and, for the sign-in, the staging clock (moment 10).

## 10. The three long clocks, started early

*Changed 2026-09-29, with F5's plan (Rich):*
- ***"each may take several days"***, not weeks, wherever the product states their duration (*"'each taking weeks' needs
  to be 'each may take several days'"*);
- **no stopgap** (*"Build now, no stopgap"*): no email to the Manifest team; each card says what the record says, and the
  honest admission ends on what is true;
- **two clocks on *Going live***, the production registration and the privacy assessment, because `ClockItem`'s rule is
  *"Two at most on a screen"*; the staging registration's clock is on *Trying out*, where it gates, and *Going live*
  names it in one line;
- **what the platform cannot do yet is F5b's**: *Draft the request*, *Fill in what we know*, *I've sent it* and *waiting
  since*, written when the platform's launch-path sittings 6–10 land.

**Trying to:** nothing. They did not know these existed. The design's job is that they never discover them on
launch day (spec §13).

**Three clocks** (Rich, FE-24), each answered by people outside Manifest, each of which may take several days:

| Clock | Needed for | Answered by |
|---|---|---|
| **Staging registration** | anyone signing in on the trying-out address | UBC's identity team |
| **Production registration** | your students signing in | UBC's identity team |
| **Privacy assessment** | going live at all | UBC's Privacy Office |

**They see**, the moment the first draft is built (the attributes it signs people in with are known then):
- **On the project's Overview and on *Your apps*, one band**, not a list: *"Before your students can use it."*
  *"Three things other people answer, and each may take several days. Going live shows where each one is."*
  **[Going live]** (F5; **[Start them]** once they can be started, F5b). On *Your apps*, one line in the app's card:
  *"Before your students can use it: three things other people answer, and each may take several days."*
- ***Going live*** (moment 11) has the full page, the prototype's *"Letting your students in"*, with **two** clock
  cards (`ClockItem`): the production registration and the privacy assessment.
  - Each card shows its owner, a still bar (hatched while nothing counts: *"Nothing counting yet · May take several
    days"*), and, once the platform can start it (F5b), one action.
  - The staging registration's clock is on *Trying out*, because it gates the trying-out address; *Going live* names
    it in one line, with a link.

**Fed by: nothing yet, and the screen says so (FE-6).**
- The actions the cards promise have no operation: *Draft the request*, *Fill in what we know*, and *"I've sent
  it"* for all three.
- The platform records only the PRODUCTION registration and the assessment, and **an administrator records
  them** (`recordIamRegistration`, `recordPrivacyAssessment`), after UBC has answered.
- `getLaunchRecords` reads those two records' state and `updatedAt`, which is enough to show *waiting since*
  once an administrator has written *submitted*.
- **Meanwhile each card says the true thing** (`10-language.md`, *Honesty*): *"Manifest can't start this one for
  you yet. For now the Manifest team does it by hand, and this card shows where it has got to."* With no stopgap
  (Rich, 2026-09-29), there is no email: the card follows the record an administrator keeps, *not started*, *with UBC's
  identity team* (*"recorded 18 September · waiting 12 days"*), or done (*"Registered 3 October"*).
  - It is **not** a record the front-end keeps: a second record of launch state, beside the platform's, is the
    drift this design exists to avoid.

**If it goes wrong:** nothing breaks. The band is **not yet**, then **waiting on someone**, and never **needs
you** until the person is actually needed (a question from IAM, which reaches Manifest as nothing today).

**They wait:** days, **waiting on someone**, completely still, with *"recorded 18 September · waiting 12 days"*
once there is a date to count from (*"asked"* once F5b has the day it was sent).

---

# B. Going live

## 11. The checklist, in our words

**Trying to:** find out what stands between this app and their students, and who has each piece.

**They see** *Going live* (rail), the prototype's *"Letting your students in"*, rebuilt on three clocks:
- **Heading:** *"Letting your students in"*. *"Going live isn't a button. Most of it takes minutes, but three
  things are answered by other people, and each may take several days. That's why this page exists from day one."*
- **The version that would go live**, stated once, at the top: *"What goes live is the version on your
  trying-out address: the one from 18 September, 3:12pm."* Production deploys only what staging serves
  (`RELEASE_NOT_STAGED`), so this is a fact, not a choice. Changing it is moment 9.
- **Two clocks** (moment 10's cards), and the staging registration's line.
- ***"Short jobs, for the end"*** (*"minutes each, and not worth doing early"*), one row per checklist item, each
  with its state as one of the five, its owner in words, and one plain sentence:

| Item (`id`) | Our words | Owner, in words |
|---|---|---|
| `scans` | met: *"Checked for security problems. Nothing needs fixing, and we check again on every build."* | *done for you* |
| `rehearsal` | *"A dry run on the live setup: we put it up with nobody watching, check it answers and signs someone in, then take it down."* | *you start it; minutes* (moment 12) |
| `load-rehearsal` | only for *a large course* or *anyone at all*: *"A test with everyone at once. We pretend to be your whole class arriving together."* | *us, in minutes* |
| `admin-approval` | *"A Manifest administrator looks at what it keeps, who it lets in and what it can reach, then signs it off."* | *a Manifest administrator* (moment 13) |
| `domain` | met: *"Its address is `reading-responses.manifest.apps.ltic.ubc.ca`, yours for good."* | *done for you* |
| `code-review` | shown last, set apart, **not yet**: *"Nobody reviews the code itself yet. What keeps it safe is how it runs: it can only reach what it asks for, and only its own data."* | *nobody yet* |

**Fed by:**
- `getLaunchReadiness`: `items[]` with `id`, `state`, `blocking` and `owner`; `ready`; `candidateReleaseId`.
  **Every sentence is ours, keyed on `id` × `state` (FE-9)**, because `why` is written for developers.
- An `id` we do not know is shown as *"Something new on the list: <title>"* rather than hidden. The enum grows
  (spec D23.8).
- The clocks: moment 10. `getLaunchRecords` for the two records the platform keeps.

**If it goes wrong:** there is no failure here, only states. The two that need words:
- **An item is `unmet` and owned by the person**: **needs you**, with the one action.
- **`scans` unmet**: *"Something it's built on has a known security problem. Keeping what apps are built on up to
  date is the Manifest team's job."*, **waiting on someone**, with no action. *Proposed with F5's plan, for Rich's
  review (2026-09-29):* this moment first said *"We'll update it in a conversation: [Fix it]"*, but an agent cannot
  change an app's dependencies (FE-32), and a blueprint's are the platform's. *[Fix it]* returns when FE-32 lands.

**They wait:** nothing on this page. It is a map.

## 12. The dry run on the live setup

**Trying to:** tick the one short job that is theirs.

**They see:** on its row, **[Run the dry run]**. Then a small **working** row: *"Putting it up with nobody
watching… signing someone in… taking it down."* It ends **steady**: *"Done. It answered and signed someone in on
the live setup."* Or it ends **needs you**, with what failed in a sentence and *[Fix it]*, which starts a
conversation.

**Fed by:** `runRehearsal`, which is session-only (a person's act), then `rehearsal.completed` on the stream, and
the item's state after.

**Under FE-24 this changes meaning.** It was built to prove the sign-in's shape before launch day, because
staging used the fake IdP. If staging signs in through UBC's real staging IdP every day, the rehearsal proves
little that staging has not. FE-24 carries the question. Until then, the row stays, in the words above.

**They wait:** minutes, **working**. They may leave.

**As the platform stands, the press is not theirs (FE-42; Rich, 2026-09-30: *"Both: row now, ask platform"*).** On
7100 the owner is refused `runRehearsal` (`403`, *"role 'owner' may not 'launch:record'"*): an administrator alone may
run it. So until the platform lets the owner run it, the row is **waiting on someone**, with no button (no stopgap):
*"A Manifest administrator runs it."* · *"Manifest doesn't tell them yet that it's waiting."* Once someone has run it,
it says what came of it, in the words above (*"Done. It answered and signed someone in on the live setup."*, or the
failure in a sentence with *[Fix it]*). FE-42 (a), the owner's own press, is carried to the platform: when it lands,
**[Run the dry run]** returns as designed. Measured (F5 sitting 1): it takes seconds, and it carries on when its
caller goes.

## 13. Waiting on an administrator

**Trying to:** get the sign-off, without knowing who gives it.

**They see:** the `admin-approval` row, **waiting on someone**:
- *"A Manifest administrator looks at this next."*
- A one-line reason it exists: *"so nobody's app reaches students with something it shouldn't have."*
- *"asked 21 September · waiting 2 days"*, once there is a date to count from.
- When decided: **steady**, *"Signed off by <decidedByName>, 23 September."* Or **needs you**, *"Not signed off:
  '<their reason>'"*, in the person's own words behind the system's one left rule. **[Talk it through]** starts
  a conversation seeded with the reason.

**Fed by:**
- `getApproval` for the candidate release (`decision`, `decidedByName`, `decidedAt`, `reason`), and
  `release.approved` / `release.approval_rejected` on the stream, which our server turns into an email.
- **There is nothing for *asked* (FE-25).** No operation says *"please look at this"*, and a refused production
  deploy records nothing. So there is no date to count from, and no administrator is told.
- Meanwhile the row says so, with no stopgap (Rich, 2026-09-29): *"Manifest doesn't tell them yet that it's
  waiting."* No email, and no date. Asking is F5b's, when the platform's sign-off request lands (FE-25).
- A rejection's **[Talk it through]** starts a change (moment 8, agreed first) seeded with their reason. A rejection is
  final for its version, so the row also says *"A new version is needed, and it's looked at afresh."*

**They wait:** days, **waiting on someone**, still.

## 14. Putting it live

**Trying to:** let their students in. This is the one moment that asks them to prove it is them.

**They see:**
- **When every blocking item is met** (`ready`), the page's top gains the one primary action: **[Let your
  students in]**. Under it: *"The version from 18 September goes to `reading-responses.manifest.apps.ltic.ubc.ca`.
  Your trying-out address stays as it is."*
- **Pressing it, the first time in ten minutes**, is answered `403 STEP_UP_REQUIRED`. We show the step-up card
  in place, not a new page:
  - *"Sign in once more"* · *"We're not doubting you. We're making it useless for anyone who finds your laptop
    open."*
  - *"We ask this before anything that reaches your students, changes who can work on your app, or switches it
    off."* That sentence is the rule, with no list: the list is longer than four now, and it is still learnable.
  - **[Sign in again]**, which goes to `/auth/step-up?returnTo=<this page>`, then CWL, which asks for the password
    even though they are signed in, then back.
- **Back on the page**: *"You're signed in again. [Let your students in]"*. The platform never replays the
  request (the console's `stepUpUrl` says why: *they press the button again, which is the point*). We remember
  what they were doing, so this is the same button in the same place, and one press.
- **Then the four stations** (moment 9's `Timeline`). It ends with the moment the product is for: *"Reading
  responses is live."* And the address, in mono, large.

**Fed by:**
- `deploy` to the production environment, from the session. It is synchronous, up to about 90 seconds (D23.9's
  exception).
- `403 STEP_UP_REQUIRED`, then `GET /auth/step-up`.
- `project.launched` on the stream, and `Project.launchedAt`.

**If it goes wrong:**
- **Refused on the checklist** (`409 RELEASE_PRODUCTION_GATE_UNAVAILABLE`, carrying the checklist): the page
  shows the checklist it already shows, with the changed row lit. It cannot happen if we only offer the button
  when `ready`, but a race can.
- **`RELEASE_NOT_STAGED`**: the trying-out address changed while they were here. *"The version on your trying-out
  address changed a moment ago. Go live with the new one?"*
- **It never answers**: the two facts. *"Nothing reached your students. The address shows nothing yet, not a
  broken app."* **[What went wrong]**.
- **The step-up sign-in is refused, or is someone else**: the platform's own page (FE-17), then back on ours
  signed in as before, with nothing changed.

**They wait:** under 90 seconds, **working**.

## 15. Handing over the address

**Trying to:** tell 200 students where to go, and be sure they will get in.

**They see**, on the project's Overview, now led by **For your students**:
- The address, large, in mono, with **[Copy]**.
- *"Students sign in with their CWL."*
- A message they can paste into Canvas or an email, pre-written and editable: *"This week's reading responses
  go here: <address>. Sign in with your CWL. You'll see everyone else's once you've posted your own."* The last
  sentence comes from the agreed plan (D6). *As F5 builds it (2026-09-29):* *"<Name> is here: <address>. Sign in with
  your CWL."*, then the plan's *What students see* as written, with no model.
- **The honest line about who can get in**: *"Anyone with a CWL can sign in, not only your class. It only shows
  each student their own work until they post."* No course-restricted sign-in exists (FE-20). *As F5 builds it:* the
  first sentence, then the plan's *Who gets in* as written (the second sentence above was this app's own).
- **The two facts, now for students**: *"Serving right now: the version from 18 September"* and *"Last attempt:
  the same"*, **steady**.

**Fed by:** `getEnvironment` (production `url`), the plan (ours), and `listInstances`.

**If it goes wrong:** week eight (moment 19).

**They wait:** nothing.

---

# C. Running it

## 16. Coming back after three weeks

**Trying to:** check it is fine, and whether anything needs them, without remembering how any of this works.

**They see** *Your apps*, now with an app on it. One card per app:
- **The name and who it is for**: *"Reading responses · one class, all arriving at once"*.
- **The students' fact first**, because that is the one they fear for: *"For your students · answering · the
  version from 18 September"*. Then the draft and trying-out addresses, smaller.
- **A needs-you band across the top of the page, only when something does**, naming the app and the thing:
  *"Reading responses: we have a question for you."* Sources:
  - a question in one of our conversations (ours);
  - a question an agent of their own asked (`listPendingActions`, per app: **FE-10**);
  - a launch item that is theirs.
- **"Since you were last here"**, at most five lines, newest first: *"Signed off by <name>, 23 Sep · <TA> was
  added, 25 Sep · Went live, 26 Sep."* **[Everything]** opens the app's history.

**Fed by:**
- `listProjects`, then one `getProject?expand=environments`, `listInstances` and `getLaunchReadiness` per app
  (**FE-10**).
- **The history is ours: what our server saw on each project's stream, kept as it arrived.** This is the one
  record we keep of platform events. The platform replays only the last 50 and keeps no readable history
  (**FE-7**). Anything that happened while our server was not listening is missing, and the page says so rather
  than implying completeness: *"From 18 September."*

**A standing read-only token per project** (our decision; the plan's *Building a front-end* expects it):
- minted in the browser when the project is made: `project:read` and `output:read`, named *"Keeping watch"*;
- our server's subscription, history and emails (F9) all run on it;
- archive revokes it (moment 20), and restore mints a new one.
- *Rejected:* subscribing only while a conversation's token lives, which leaves an app that is quietly live
  watched by nobody.

**If it goes wrong:** the reads fail. *"We can't reach Manifest just now. Nothing of yours has changed."*

**They wait:** a second.

## 17. A change after launch

**Trying to:** change a live app without breaking it for 200 people.

**They see:** moments 8, 6 and 9, unchanged: a conversation, the work, the draft, then the trying-out address.
Then one more step, and one sentence decides how long it takes.
- **Before building**, the conversation says which kind of change this is, from the dry run:
  - **Most changes**: *"Once you've tried it, this can go straight to your students."*
  - **A change to something reviewed at launch**: *"This change needs an administrator's look before it reaches
    your students, because it changes <what it keeps / who it learns about / what it can reach / which AI it
    asks / how much room it gets / how sensitive its data is / what it's built on>."* That is §7's seven
    sensitive fields, in words. Moment 13's wait follows.
  - **A new detail about the people who sign in** (a new CWL attribute): also *"…and UBC's identity team must
    agree to share it first. That takes weeks."* That is a change request to the production registration: a
    clock again (moment 10).
- **Then** **[Let your students have this version]**, with step-up (moment 14's card and flow). The students'
  address keeps the old version until the new one answers: the two facts, throughout.

**Fed by:**
- `createCommit`'s dry run: `spec.sensitiveDiff`.
- `getLaunchReadiness` after launch: `launched`, `reescalated`, `sensitiveFields`, and the self-serve
  `admin-approval`.
- `deploy` to production, with step-up.

**If it goes wrong:** as moments 9 and 14. **The students' version is never taken away by a change that fails**
(§13: *"Deploying a release never takes down the one it replaces"*), and every screen says so.

**They wait:** minutes, or days when it re-escalates.

## 18. Adding a TA

**For now, a colleague who is faculty** (D7, Rich, 2026-09-29: *"Faculty members should be able to add other faculty
members for now. Perhaps in the future they should be able to add TAs"*). The platform refuses to add anyone who may
not build (**FE-39**), and we say: *"Only UBC faculty can work on apps for now, so we can't add them yet."* The rest
of this moment stands for when TAs may be added.

**Trying to:** let a TA help, and understand what that lets the TA do.

**They see** *People*:
- *"Who can change Reading responses"* · *"Students aren't on this list. They get in once it's live."*
- **The list**: each person's name, email and CWL login, and **Owner** or **Helper** (`collaborator`).
- **Add someone**: one field, *"Their CWL login or email"*, and the role.
  - *"Helper: can change the app and try it. Only an owner can let students have a new version, change who's on
    this list, or switch it off."* That is §13's roles, in words.
- **Adding asks them to sign in once more** (moment 14's card), since changing who can work on the app is one of
  those things.

**Fed by:**
- `listMembers`.
- `addMember` `{ cwlLogin | email, role }`. The sign-in name or the email typed is sent as `cwlLogin` or `email`
  by its shape (an `@` makes it an email).
- `403 STEP_UP_REQUIRED`, then step-up; `member.added` / `member.removed` on the stream.
- `removeMember`, with step-up.

**If it goes wrong:**
- **`MEMBER_USER_NOT_FOUND`**: *"We don't know anyone by that name yet. They need to sign in to Manifest once:
  send them `app.manifest.internal`, then try again."* Inviting someone who has never signed in is deliberately
  not built.
- **`MEMBER_USER_AMBIGUOUS`**: *"Two people share that email. Use their CWL login instead."*
- **`PROJECT_LAST_OWNER`** when removing: *"Someone has to own it. Make someone else an owner first."*
- **Removing a TA whose agent is still working**:
  - The platform keeps their token alive (**FE-11**). But the tokens our server holds are ours to stop using, so
    removing someone **ends their conversations here** and discards their tokens.
  - The page says what is true: *"<TA>'s work on this app has stopped here. Anything they run elsewhere keeps
    its access until it expires."*

**They wait:** seconds, plus the sign-in.

## 19. Week eight: it breaks

**Trying to:** make it work again, now, in front of 200 people. **This is the moment the design system exists
for.**

**Three different breaks, and the platform sees only two of them:**

| What broke | Does the platform notice? | What they read |
|---|---|---|
| **A change that failed to go live** | Yes: `instance.failed`, an Incident, and the old version still serving | *"Nobody has lost anything. <address> is still answering with the version from before."* This is the prototype's *Incident* screen, with its **[Give this to your agent]**. |
| **The live app fell over on its own** | **No (FE-4).** Nothing watches a running app; it still reads `healthy` | we watch, tell, and offer a restart (below) |
| **It works, but does the wrong thing** (a student reports it) | No, and it shouldn't | a conversation: moment 17 |

**The failed change** (the one the platform sees):
- **The email first** (ours, from the watcher token's stream): *"Reading responses: a change didn't go live.
  Nobody has lost anything; your students still have the version from before."*
- Then the Incident screen, in words: *"It started, then went quiet."* The exact words go behind *"for whoever
  you ask for help"*.
- **[Give this to your agent]** starts a conversation seeded with `Incident.prompt`, the platform's own repair
  request. The rest is moment 17.
- **Production's own output is never readable** (§14). The Incident's `logTail` is the only window, redacted, and
  the agent reads it.

**The app that fell over** (decided, Rich 2026-09-27: *we watch, tell, and offer a restart*, until the platform
notices for itself: **FE-4**):
- **Our server watches every live app's students' address**:
  - one request a minute, through the edge, as a student's browser would arrive;
  - a CWL app answers with its sign-in redirect, which counts as answering;
  - the edge's `502`, `503` or `504`, or no answer, **twice in a row**, counts as down.
  - Sandbox and staging are not watched this way: the agent sees those.
- **Then, within about two minutes of it falling over:**
  - **the email**, to every owner: *"Your students can't reach Reading responses, since 10:03. We can see that,
    not why. Starting it again usually fixes it: [Start it again]"*;
  - **needs you**, on *Your apps* and the project's Overview, with the same words and button.
- **[Start it again]** puts the same version back up: a fresh `deploy` of the release production was serving,
  from the session, with moment 14's sign-in. A redeploy interrupts nobody (P4c).
  - **If the trying-out address has moved on to a newer version**, the platform refuses the old one
    (`RELEASE_NOT_STAGED`: production takes only what trying-out serves). We say so and let them choose:
    *"Your trying-out address has a newer version. Start that one instead, or put last week's back on
    trying-out first?"*
- **When it answers again:** *"Answering again since 10:07. It was down for 4 minutes."* **[What happened?]**
  starts a conversation. It can read nothing from production's own output (§14), and there is no Incident,
  because the platform never saw it fall. **We say so plainly in that conversation.**
- **What this cannot do**, stated on the screen that explains it:
  - it cannot say why;
  - it cannot see an app that answers but answers wrongly;
  - it watches only while our server runs.

  That is why FE-4 stays the platform's.

**Fed by:** `incident.opened` and `instance.failed` on the stream; `listIncidents` (`prompt`, `exitReason`,
`logTail`, `diffSinceHealthy`); `listInstances`.

**They wait:** as moment 17, while the old version keeps answering.

## 20. End of term

**Trying to:** stop it for the summer without losing what students wrote, and have it back in September. Or
clear away an app that never went live.

**They see**, on the project's Overview, under **For your students**, a quiet **[Switch it off]**:
- *"Your students' address will show 'This app has been switched off by its owner.' Everything is kept: its code,
  what students wrote, its settings. Switch it back on whenever you like."*
- Owner only. It asks them to sign in once more.
- **Then, switched off**: the app's card on *Your apps* reads **not yet**: *"Switched off, 12 December"*, with
  **[Switch it back on]**.
- **Switching it back on** (no second sign-in: bringing an app back takes nothing from anyone):
  - *"It's back, but not running yet. [Start it for your students] puts the version from last term back, with
    everything they wrote."*
  - That button is two deploys under the hood: the trying-out address first, then the students'. Production
    takes only what staging serves, and the second deploy asks for the sign-in again.
  - The watcher token is minted again. **The staging and production registrations may have lapsed over the
    summer**, and the checklist says so if they have.
- **An app that never went live** also offers **[Delete it]**: *"Everything goes: its code, its addresses, what
  anyone wrote in it. This can't be undone. Its name becomes free."* Owner only, with the sign-in.
- **An app that has been live cannot be deleted**, and says why: *"Apps that have been live are kept, because
  UBC's rules decide when students' data is removed."*

**Fed by:**
- **Sitting 8**: `archiveProject` (person-only, step-up; synchronous) and `restoreProject`, with `Project.state`
  and `archivedAt`. The switched-off address answers the platform's `410` page.
- **Sitting 9**: `deleteProject`, and `409 PROJECT_LAUNCHED_NOT_DELETABLE`.
- `deploy` twice to bring it back (the research pass's G18: restore starts nothing).

**If it goes wrong:**
- **Switching off fails part-way** (`500 PROJECT_TEARDOWN_INCOMPLETE`): *"It's switched off, but we didn't finish
  tidying up. Nothing is lost, and we'll finish by ourselves."* The platform finishes it at its next boot, and a
  retry finishes it now.
- **Anything done to a switched-off app** (`409 PROJECT_ARCHIVED`): *"Reading responses is switched off. Switch
  it back on first."*

**They wait:** seconds.

**Not built, and asked for by this moment:** a copy of what students wrote, before delete or at the end of term
(the research pass's G19); and *"the same app, empty, for next year's class"* (D32's fork, Phase 2, absent).
Both belong in the platform's list, not here.

---

# Throughout

**The month's AI allowance.** It is visible on every conversation (moment 6), as *"$0.40 so far · $9.60 left this
month"*. The piece-of-work cap is a checkpoint, and the month running out is **needs you** with its reset date
(moment 6). Intake costs the person nothing (D1).

**The connection dropping.** Nothing runs in the page: the agent, the watching and the emails are our server's.
The page reconnects quietly and re-reads what it shows. The only place a person could lose anything is a message
typed but not sent, and the message box keeps it.

**Signed out after twelve hours.** Moment 1: *"You've been signed out. It happens after twelve hours. Sign in again
and you'll come straight back here."* Their agent keeps working.

**An agent of their own.** For the few who run one (spec §1, *Bring your own agent*):
- ***Agents***, in the project's rail, lists every agent with access:
  - **ours**, one per conversation and one *Keeping watch*, not revocable here: they end with their
    conversation, or with the app;
  - **theirs**, minted on this screen: the prototype's *Agents* screen, with its secret shown once.
- **Their agent is held to the same four limits**, and when it asks for one of them, a question appears for a
  person: the prototype's *Queue* screen, reached from the needs-you band.
- **The question says what it can**: *"Your agent '<token's name>' asked to add a member to this project."*
  - The platform does not store WHO it wanted to add (**FE-5**), so the card says that too: *"It didn't say
    who. If you're not sure, say no."*
  - Yes buys **one** try at that one request (the prototype's words stand).
- **Ours never asks.** Going live, changing who can get in and switching it off are the person's own buttons in
  this product. They are never a question from our agent.

---

## Open questions for Rich

*Part A's two were answered 2026-09-27: **we** everywhere (D5); **commit the plan** (D6).*

1. ~~Moment 19: the live app that fell over on its own (FE-4).~~ **Answered 2026-09-27: we watch, tell, and offer
   a restart**, until the platform notices for itself.
