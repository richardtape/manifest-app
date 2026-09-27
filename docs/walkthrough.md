# The faculty experience, moment by moment

*Drafted with Rich, starting 2026-09-27. This is the design the front-end is built from. Change it here first,
then the code.*

**Read with:**
- [`2026-09-27-reading-note.md`](./2026-09-27-reading-note.md): what the platform is, and what surprised us;
- [`api-findings.md`](./api-findings.md): every gap, numbered `FE-n`, which the moments below cite;
- the design system in `manifest/docs/superpowers/design/system/`. **Every sentence here obeys `10-language.md`
  and every state is one of `20-states.md`'s five.** Where a moment quotes the prototype, the quotation is
  verbatim; where it changes it, it says why.

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
- **D3. The app starts from the blueprint's skeleton alone, not the proof-app starter.** `createProject` omits
  `starter`.
  - The agent writes the app from the knowledge pack, on a base that already signs people in with CWL. A
    note-taking app to be torn down first would only be noise in the agent's context and in the history.
  - *Changing course* is one field.
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
  - One quiet line under it, in `caption`: *"Making an app takes an afternoon. Letting students in takes a few
    weeks of UBC paperwork, which we start for you on day one."* Spec §13 wants the lead time known before
    anyone needs it. This is the earliest honest moment, and it says who owns the weeks.

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

**Fed by:**
- **The words are ours.** They become the first message of a conversation our server creates now, which is not
  yet tied to a project.
- **The understanding is FE-1's intake session.**
  1. The browser starts one, in the person's own session.
  2. It hands the key to our server.
  3. Our server asks the platform's one intake model a single structured question. The answer schema is ours:
     - a one-sentence restatement;
     - three names, each with a candidate address;
     - a guess at the two audience answers, with the words it guessed from;
     - anything the blueprint cannot do.
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
- *"Here's what we'd build"*: **we**, not the prototype's *I* (open question 1, below).
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
  **committed into the app as `docs/plan.md`** (open question 2), so any agent that ever works on the app reads
  what was agreed.

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

---

## Open questions for Rich (part A)

1. **Who is speaking?** The prototype's plan says *"Here's what I'd build"* (the agent as *I*), while every other
   screen says *we* (Manifest). One voice for the whole product, or the agent as its own *I* inside a
   conversation? **Recommended: *we* everywhere.** A faculty member should not have to model two parties, one of
   which is software that can be wrong.
2. **Commit the agreed plan into the app** (`docs/plan.md`)? **Recommended: yes.** It is the agreement, versioned
   with the code it describes. A bring-your-own agent reads it too, and it costs one file in the first commit.
