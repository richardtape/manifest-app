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
10 The two long clocks, started early
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
  - *This supersedes this document's first D3* (the skeleton, always).
- **D5. *We*, everywhere** (Rich, 2026-09-27). The product has one voice, the plan included. The prototype's
  *"Here's what I'd build"* becomes *"Here's what we'd build"*. Many agents do the work (see *The agents*, below),
  and the person never has to keep track of which one is speaking.
- **D6. The agreed plan is committed into the app as `docs/plan.md`** (Rich, 2026-09-27). It is the agreement,
  versioned with the code it describes, and readable by any agent that ever works on the app.
- **D4. The person never sees a delegated token on the main road.** The browser mints one per conversation and
  hands it to our server. The prototype's *Agents* screen becomes *let an agent of your own in*, the
  bring-your-own-agent path (§1 of the spec).
  - *Rejected:* showing the key. A secret shown once is a moment of real anxiety, spent for nothing when our own
    server is the one that needs it.

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
  401 with an envelope"*). A finding to add to the list. Meanwhile, nothing we can change.
- **Twelve hours later, mid-task, the session ends.** Every call answers `401`. We show: *"You've been signed out.
  It happens after twelve hours. Sign in again and you'll come straight back here."* **Nothing the agent is doing
  stops**, because it holds its own token, and the sentence says so when a conversation is running: *"Your agent
  is still working."*

**They wait:** seconds. No state.

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
  1. **`createProject`** `{ slug, name, blueprint: 'node-ts-mongo@1', audience: { scale, burst, justification } }`,
     with one `Idempotency-Key` per press, reused on a retry. It answers `CreatedProject`: three environments,
     none deployed, and the spec validated.
  2. **`mintToken`** for our server, one per conversation:
     - named *"Building — <conversation's title>"*, so `madeThrough.tokenName` and `AgentSession.via` name the
       thread (F13's workaround);
     - `project:read`, `source:write`, `secret:write`, `build:create`, `release:create`, `release:deploy`,
       `output:read`, `agent:session`;
     - seven days.
  3. **The token goes to our server** over our own endpoint. The conversation is now tied to the project.
     - Our server subscribes to the project's stream with it, and never keeps the token beyond the
       conversation's life.
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
  sign-in (**FE-16**), and the plan must never promise one.
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
  | *Checking it answers* | `listInstances`, `getInstanceOutput` (see below for what this can and cannot prove) |

- **One plain line under the current step** saying what we are doing now: *"Writing the page students post on."*
  It is written by the lead, as structured output, never raw model text.
- **Each finished step has a disclosure: what changed**, in words (*"Two pages, and the rule about who sees
  what"*), built from the lead's own account of its commit. Behind it, *"The exact changes, for whoever you ask
  for help"* lists the files, which is machine text on purpose (`InverseSurface`).
- **Questions come inline**: a *needs you* card with an answer field. *"It is waiting, not failing."*
- **A fix it made on its own is one sentence**: *"The first build didn't take. We fixed a missing piece and built
  it again."* The raw words sit behind the disclosure.
- **Permission to leave**: *"A few minutes. You can leave. We'll email you when it's ready, or if it needs
  you."* The email is ours (F9, below).
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

---

## Open questions for Rich (part A)

*Both answered 2026-09-27: **we** everywhere (D5); **commit the plan** (D6).*
