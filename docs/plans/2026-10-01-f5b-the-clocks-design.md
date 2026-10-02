# F5b — The clocks, and asking for sign-off: the design

*Written 2026-10-01 by `manifest-app-d9`, from a brainstorm with Rich in which he approved each section. **This is the
design, not the plan.** The plan, `2026-10-01-f5b-the-clocks.md`, is written from it with superpowers:writing-plans once
Rich has reviewed this file. It was written **ahead of the platform's launch-path sitting 10**, at Rich's word, as F2 was
written ahead of F1. The walk-through ([`../walkthrough.md`](../walkthrough.md), moments 10 and 13) stays the source of the
faculty member's words; where this design departs from it, it says so (*Departures from the walk-through*, below).*

## What F5b is for

F5 showed a faculty member the three long waits before launch and could not let them start any of them: each card said
*"Manifest can't start this one for you yet."* F5b gives them their actions:
- **the privacy assessment, then the trying-out address's registration, then the students' address's**, one after
  another in UBC's order, each drafted by Manifest, checked by the faculty member and **sent to the Manifest team**, who
  submit it to UBC;
- for the assessment, **the answers only the faculty member can give**, suggested by our agent from the app's plan and
  what it is built from, and checked by them;
- **how long each has waited, and who has it**;
- **asking a Manifest administrator to sign off** the version on trying-out, and how long that has waited.

**Success** is Rich's click on the real platform: a faculty member who has never heard of a PIA starts the assessment in
week one, checks the suggested answers, sends it to the Manifest team, and sees it wait with them and then with UBC;
then the two registrations in turn; then asks for the sign-off, and sees each wait counted in days, owned by name, and
never shown as infrastructure.

## Rich's decisions (2026-10-01)

- **D1. Written now, ahead of sitting 10** (Rich: *"Yes, design and plan now"*). The platform's sittings 6–9 have landed
  (`d54e1e1`, `6cbb489`/`dec71d8`, `81892d4`/`4aaf0ef`, `a1d4baa` and its fix wave `a230c1a`); only sitting 10, the
  mock's half, is to come. **Whatever depends on it is marked.** *Rejected:* waiting for sitting 10, as the roadmap said;
  a design now and the plan later.
- **D2. One sequence on *Going live*** (Rich chose *"One sequence on Going live"*). UBC's order (Spec action 9, Rich's
  own description: *"app developed -> apply for PIA -> once a PIA is given -> provide info to IAM team -> … staging … ->
  send production details to IAM team"*) makes the three clocks run one after another, not side by side. The three
  steps are one numbered list on *Going live*; only the current one is a `ClockItem` card (§1).
  - *Rejected:* F5's layout (two cards on *Going live*, staging's card with its actions on *Trying out*), where the next
    step could be on another page; three cards, which breaks `ClockItem`'s *"Two at most on a screen"*.
  - **F5's Decision 4 is replaced**: the staging registration is step 2 on *Going live*, and *Trying out* keeps one line.
- **D3. All three go via LTIC** (Rich: *"We send it. It emails us and we fill out the appropriate forms."*; *"We need an
  extra step. Sent to LTIC. And then submitted to PRISM by LTIC."*; *"All three go via LTIC"*). A faculty member never
  deals with UBC's forms: they send the assessment and both registrations to the Manifest team (LTIC), who submit the
  assessment to PRISM (UBC's privacy system) and the registrations to UBC IAM.
  - *Rejected:* the faculty member sending each to UBC themselves, with an address we give, or none; our server
    emailing each document to UBC on their behalf.
  - **The platform's design said *"drafted by Manifest and sent by the owner"*** (Spec action 3), and its records go
    `draft → submitted`, `submitted` meaning UBC has it. So:
- **D4. FE-46, filed and carried now** (Rich chose *"File FE-46, carry it now"*): the records gain a step of their own,
  *sent to LTIC*, between the draft and UBC's submission (`api-findings.md`, **FE-46**). F5b is designed against it, and
  **every press that sends waits for it**.
  - *Rejected:* building now on today's submission read as *"sent to LTIC"*, with an administrator's reference read as
    *"now with UBC"* (a state read from a field, which our rules forbid); designing F5b only once the platform has built
    the step.
  - **Carried 2026-10-01** to `manifest-6d` (the platform's sitting 9, closing; `manifest-60` was not running), which
    records it as **PROPOSED** in its close-out, for its sitting 10 and the next planning session. **CONFIRMED by Rich in
    that platform session, 2026-10-01 19:56 PDT** (*"i approved"*; manifest `ddc76d7`). **A spec action, drafted by the
    planning session and decided by Rich, comes before any platform task builds it.**
- **D5. The platform emails LTIC, a sign-off request too** (Rich chose *"The platform"*, then *"Yes, and email it
  too"*): when a record is sent to LTIC, and when `approval.requested` is published. Part of FE-46. *Rejected:* our
  server emailing LTIC; a sign-off request left in the queue with no email.
- **D6. Our agent suggests the assessment's answers, and they check** (Rich chose *"Our agent suggests, they check"*). The
  draft names gaps only the faculty member can fill (*"what the app keeps in its own database"*); our agent drafts an
  answer to each from the app's agreed plan and its code, and the faculty member reads and changes it before sending.
  The answers travel with the send, kept on the platform's record (FE-46). *Rejected:* fields with no suggestion; the
  answers in an email only; not answering them in our page at all (LTIC asking).
- **D7. The sign-off is asked with a press, with an optional note** (Rich chose *"A press, with an optional note"*), once
  a version is on trying-out. *Rejected:* asking automatically with every version put on trying-out (the administrators'
  queue filling with versions still changing); offering the press only once everything else is met.
- **D8. Approach A: the page makes every platform call; our server adds one agent** (Rich chose *"A: page calls, one
  agent"*). Every platform call is the person's session, in the browser, as F5's are: both drafts, the send to LTIC
  (person-only), the sign-off request. Our server's only new part is the agent of D6 (§4).
  - *Rejected:* (B) our server drafting and asking for sign-off on a token (both are mintable), the page making only the
    person-only send: two credentials acting on one page, and our server holding a launch token for no gain; (C) the
    gaps answered in a conversation with the agent: richer, but it holds the app's line and costs a conversation per
    assessment. A *[Talk it through]* beside one suggestion could come later.
- **The design, approved in five sections** (2026-10-01): the three steps (*"Yes"*); each step's actions (*"Yes"*); the
  sign-off request (*"Yes, and email it too"*); the agent (*"Yes"*); what waits, and the sittings (*"Yes"*).
- **Carried from earlier plans, still binding:** *"may take several days"*, never *weeks*; no stopgap; *we*, everywhere;
  the five states; C3; a version is only ever *"the version from <when>"*; a clock card never says done while the
  checklist says unmet (F5's S3, *"With the Manifest team"*); a change on file with UBC is waiting on UBC (F5's S3);
  [Open it in a new tab] on *Trying out* hidden until the staging registration is `active` (F5).

## §1 The three steps (moment 10)

***Going live*'s lead** gains *"one after another"*: *"Going live isn't a button. Most of it takes minutes, but three things
are answered by other people, one after another, and each may take several days. That's why this page exists from day
one."* The version that would go live stays as F5 built it.

**The two clock cards become one numbered list of three steps** (`<ol>`), in UBC's order:

| # | Step | Whose answer |
|---|---|---|
| 1 | *A privacy assessment* | UBC's Privacy Office |
| 2 | *Registering your trying-out address* | UBC's identity team |
| 3 | *Registering your students' address* | UBC's identity team |

- **The current step** is the first one not done (a step *not needed* counts as done). It alone is a `ClockItem` card,
  with its one action (§2). So there is one clock card on the page at a time, and `ClockItem`'s *"Two at most"* holds.
  When all three are done, all three are steady lines.
- **A step done** is one steady line: *"Approved 3 October."* / *"Registered 3 October."*
- **A step to come** is one line naming what it waits for: *"Next, once the Privacy Office has approved the
  assessment."* / *"Next, once your trying-out address is registered."* A later step with something on file (an
  administrator records UBC's answers in whatever order they arrive) says its state in that line, never as a second card.
- **F5's admission goes** (*"Manifest can't start this one for you yet…"*) once the send exists (FE-46). Until then it
  stays on the current card, because it is still true (§7, part one).

**A step's state**, derived pure (`screens/going-live/steps.ts`, replacing `clocks.ts`) from its record (step 1
`LaunchRecords.privacyAssessment`, step 2 `stagingRegistration`, step 3 `iamRegistration`), FE-46's new step, and its
checklist item (`privacy-assessment`, `iam-registration`; staging has none):

| What the record says | State | Words (proposed) |
|---|---|---|
| nothing yet (no record, or no draft) | **needs you** when it is the current step; else a line | *"Nothing started."* **[Start]** |
| drafted, not sent | needs you | *"Ready for you to check and send."* |
| **with LTIC** (FE-46) | waiting on someone | *"With the Manifest team · sent 5 October · waiting 2 days."* · *"They send it on to UBC's Privacy Office."* (or *identity team*) |
| with UBC (`submitted`) | waiting on someone | *"With UBC's Privacy Office · since 7 October · waiting 4 days"* (or *identity team*) |
| UBC came back with questions (`change_requested`, `changeRequestedFrom: submitted`) | needs you | *"UBC's identity team asked about it. The Manifest team will be in touch with what they asked."* · then check it and send it again |
| a change with UBC (`change_requested` from `active`) | waiting on someone | F5's (S3): *"A change, recorded 18 September · waiting 3 days"* |
| the assessment sent back (`draft` again; **M1**) | needs you | *"The Privacy Office sent it back. The Manifest team will be in touch about why."* · check it and send it again |
| run out (`expired`) | needs you | *"Its registration has run out. Check it again and send it."* |
| done (`approved` / `active`, its item met) | steady | *"Approved 3 October"* / *"Registered 3 October"* |
| done on its record, unmet on the checklist | waiting on someone | F5's (S3): *"With the Manifest team."* · *"The newest version needs it changed."* |
| an app that signs nobody in (**M2**) | steady | both registrations: *"Not needed: it doesn't sign anyone in."* |
| a state from a newer contract | not yet | F5's *"We can't tell…"*: only what is true |

- **Waits are counted in Vancouver days** from the platform's dates (`LaunchReadinessItem.since`, the record's
  `submittedAt` and FE-46's `sentAt`; a same-day date is noon in Vancouver), never `now − since`. Never animated.
- **Whose wait:** *the Manifest team* while it is with LTIC, *UBC's Privacy Office* or *UBC's identity team* once
  submitted, *you* when it is the person's move. PRISM is never named to a faculty member.
- **Until FE-46 lands (part one), nothing in this table is the person's to press**: there is nowhere to send a draft.
  So every *needs you* row above is drawn as F5 draws it today: a step with nothing on file is **not yet**, with F5's
  admission and no **[Start]**; UBC's questions, a sent-back assessment and a lapsed registration are **waiting on the
  Manifest team** (*"The Manifest team has it."*). Each becomes *needs you*, with its action, in part two. The band is
  never *needs you* in part one.

**The Overview's band** (F5's Decision 3) gets the same sentence: *"Three things other people answer, one after another,
and each may take several days. Going live shows where each one is."* Its button is **[Start them]** while nothing has
been started (it opens *Going live* with step 1's card in view), and **[Going live]** after. Its state is the current
step's: *needs you* only while that step is the person's move. *Your apps*' line gains *"one after another"*.

***Trying out*** (the Preview's tab) keeps *"Nobody can sign in there until UBC's identity team has registered it"*, and
adds one line with step 2's state and a link: *"Registering it is the second of three steps on Going live: with UBC's
identity team, waiting 4 days."* **[Going live]**. Once `stagingRegistration.state` is `active`, the line goes and
**[Open it in a new tab]** returns (Rich, F5).

## §2 Each step's actions

Every call is the person's own session, in the browser (D8). Drafting needs no step-up, and neither does sending.

**Step 1, the assessment.** **[Start]** calls `draftPrivacyAssessment`; the card opens on what will be sent:
- *"We've filled in what Manifest knows."* A **closed disclosure**, *What Manifest filled in*, holds each section's
  `title` and its facts' `value` sentences, never their `label` or `source`. The facts are written for the Privacy Office
  (*"A mongo database, version 7"*, attribute names), so they live only in the disclosure, which F5's machinery check
  already excludes.
- *"Only you can answer these."* One field per gap, under its section's title, **filled with our agent's suggestion**
  (§4), with *"Suggested from your app's plan and what it's built from. Check it, and change anything that isn't
  right."* A gap only UBC can settle has no suggestion: *"Only the Privacy Office can answer this one. The Manifest team
  will ask them."*
  - **A field's label is the platform's own sentence until FE-46 gives the gaps ids**; then it is ours, keyed on the id
    (FE-9).
- **[Send it to the Manifest team]**: FE-46's send, with the answers and the draft the person read (`draftGeneratedAt`).

**Steps 2 and 3, the registrations.** **[Start]** calls `draftIamRegistration(staging | production)`; the card shows:
- *"What it asks UBC for"*: one line per attribute, **in our words keyed on its name** (the platform's seven:
  `ubcEduCwlPuid` *"a number that tells each person apart, so the app knows them when they come back"*, `mail` *"their
  email address"*, `givenName` *"their first name"*, `sn` *"their last name"*, `eduPersonAffiliation` *"whether they're a
  student, faculty or staff"*, `eduPersonPrincipalName` and `uid` *"their CWL name, to match them with another UBC
  system"*). **A name we do not know** is shown by the platform's `purpose` sentence, never hidden: the one place a
  registration's card reads the platform's prose.
- **An attribute nothing reads** (`unused`) makes the card *needs you*: *"Your app asks UBC for their last name, but
  nothing in it uses it. UBC's identity team will ask why."* **[Take it out]** starts a change (F4's, agreed first) whose
  words are ours: *"Stop asking UBC for their last name: nothing in the app uses it."* Once that version is on
  trying-out, the draft is stale (below).
- The entity ID, the addresses, the certificate and the metadata are **never drawn**. LTIC reads them in its console.
- **[Send it to the Manifest team]** (FE-46).

**A stale draft is told by structure, never by the platform's warning text** (FE-9):
- the draft's `fromCommit` is not the version on trying-out (the candidate release's commit, **M4**): *"Your app has
  changed since this was drafted."* **[Draft it again]**;
- a registration's `privacyAssessmentReference` is not the approved assessment's `externalTicketRef`: *"Drafted before
  the assessment was approved."* **[Draft it again]**;
- step 3 with nothing on trying-out (`candidateReleaseId` null): *"Put a version on your trying-out address first: this
  is drawn from it."*, with no **[Start]**.

**Refusals, each by its code:**
- `409 LAUNCH_DRAFT_CHANGED` (drafted again since, by a collaborator or another tab): *"It was drafted again a moment
  ago. Here it is: check it, then send it."*, and the page reads again;
- `409 LAUNCH_RECORD_SUBMITTED`, `409 LAUNCH_TRANSITION_INVALID` (sent from elsewhere): the page reads again, and the
  card says it was sent;
- the order's refusals (`LAUNCH_PIA_NOT_APPROVED`, `LAUNCH_STAGING_NOT_REGISTERED`, `LAUNCH_DRAFT_STALE`) cannot be
  pressed into, since only the current step offers a send; met anyway (a record changed under the page), the page reads
  again;
- `409 LAUNCH_NOT_CWL`: both registrations are *not needed* (**M2**);
- a draft that fails (`SOURCE_*`, `AI_BACKEND_UNAVAILABLE`, `AI_CATALOGUE_EMPTY`): F5's trouble notice, with a support
  reference.

**Once sent**, the card shows its wait (§1), and a closed disclosure, *What you sent*: the answers and the attribute lines,
read back from the record (FE-46 keeps them).

## §3 Asking for the sign-off (moment 13)

The row is F5's `signOffRow`, extended. Its keys stay the checklist item's state first, then the candidate's approval:
- **Unmet, a version on trying-out, nobody has decided, nobody has asked** (`since` null): **needs you**. *"A Manifest
  administrator looks at what it keeps, who it lets in and what it can reach, then signs it off, so nobody's app reaches
  students with something it shouldn't have."* **[Ask a Manifest administrator to sign this off]**
- **The press** opens one optional field in place: *"Anything they should know?"*, hint *"For example, the day your
  students need it. Only Manifest administrators see it."* (≤ 500 characters, counted with `FieldCount`, never
  `maxLength`), then **[Ask them]** · **[Not now]**: `requestApproval(candidateReleaseId, { note })` in their session,
  with one `Idempotency-Key` per press. The note is never shown back (the platform never answers it).
- **Asked** (`since` set, undecided): **waiting on someone**. *"A Manifest administrator looks at this next."* · *"asked
  21 September · waiting 2 days"*, in Vancouver days. F5's *"Manifest doesn't tell them yet that it's waiting"* goes:
  the request is in the administrators' queue, and LTIC is emailed (D5). Who asked is not read back (nothing reads a
  request), so the row says *asked*, not *you asked*.
- **Refusals, by code:**
  - `409 RELEASE_NOT_STAGED`: *"The version on your trying-out address changed a moment ago. Ask about the new one?"*
    (F5's S5 pattern), and the page reads again;
  - `409 APPROVAL_NOT_NEEDED`: the page reads again; the row is steady, *"Nothing in this version needs a sign-off."*;
  - `409 RELEASE_REJECTED`: the page reads again; the row shows F5's refusal with **[Talk it through]**, unchanged.
- **A new version on trying-out** closes the old request on the platform, and the row offers the press again; a version
  rolled back waits again from its first ask (the platform's `since` says so, **M3**). A second press answers the same
  request: harmless.

## §4 The agent that suggests the assessment's answers

**Privacy answers**, a new agent of ours (`agents.md`'s roster, *Making it*).

- **Its one job:** for each gap in the assessment's draft, suggest an answer in plain words that the faculty member
  will read and change before sending, or say it cannot tell.
- **Given only what the job needs** (`agents.md`, point 5):
  - the gaps, with their sections' titles;
  - the facts Manifest already filled in, so it never contradicts them;
  - **the agreed plan** (`docs/plan.md` from the app's tree, as F4's change planner reads it): its *What it keeps* row
    answers the commonest gap almost by itself;
  - **the app's data definitions**: the files the blueprint's knowledge pack names as where data lives, bounded (a cap on
    files and kilobytes, set by **M5**);
  - the knowledge pack, to know what it is reading.
- **Its answer is structured output** (`agents.md`, point 3): `answers[] { gap, answer | null }`, each answer bounded by
  the platform's limit (FE-46). A gap only UBC can settle gets `null` (§2's words). The prompt forbids technical words,
  and a scripted-model test holds the screen to `machineryIn`.
- **Credential and cost:** the page mints a token in the person's session for it (F4's *Ask for a change* pattern); our
  server opens an agent session on that token, makes one model call, and keeps nothing of the token. **The person's
  monthly agent budget pays**, as for the change planner, on the same choice of model.
- **Kept, in our store's next version:** the suggestions per draft (keyed on the draft's `generatedAt` and each gap: its
  id after FE-46, its section and text before), so leaving the page never pays twice; and **their edits, saved as they
  type**, so a collaborator sees the same answers and nothing is lost. This is our work in progress, as a conversation
  is; **what counts is what the platform keeps at the send** (FE-46). A new draft gets fresh suggestions, and an answer
  the person edited is carried over to a gap that is unchanged.
- **On screen:** while it reads, the fields' area is **working**: *"Reading your app's plan to suggest answers…"*; if it
  fails, *"We couldn't suggest answers just now. You can write them yourself, or try again."* **[Try again]**, with a
  support reference. Nothing is ever sent without the person's press.
- **Safety:** the code it reads is untrusted text. It proposes words into fields, holds no capability, and calls and
  acts on nothing, so injected text can at worst put a bad suggestion in front of a person who checks it.

## §5 How we will know it works

- **Pure, by table:** `steps.ts` across every record state × `changeRequestedFrom` × FE-46's step × checklist item ×
  which step is current, with one clock card at most; the Vancouver day count, a same-day noon and the 1 November trap
  (Node's time-zone data, ORIENTATION §7) included; `signOffRow` extended; the attribute words, an unknown name included.
- **The presses, against recording fakes** (ORIENTATION §7: assert what was sent, never what the mock answered): one
  `Idempotency-Key` per press; `draftGeneratedAt` always sent; the note sent and never drawn back; each refusal by its
  `code`; a stale draft offered again, never sent.
- **The agent, with a scripted model:** structured answers; `null` for a UBC-only gap; no technical words; nothing kept
  of the token; the failure's words and its support reference; suggestions not paid for twice.
- **The guards:** `launch-actions.test.ts` holds that our server calls none of `draft…`, `submit…`, FE-46's send,
  `requestApproval` or the `record…` routes (every launch action is the person's, in the browser). `machineryIn(text())`
  is empty on every new screen, closed disclosures excluded.
- **Negative controls**, named in each sitting's entry: a second clock card drawn; the platform's warning text read for a
  stale draft; the note drawn back; a send without `draftGeneratedAt`.
- **The acceptance, `scripts/check-clocks.sh`, in mock mode**, once the platform's sitting 10 scripts the mock's drafts,
  submissions and requests (and FE-46's step, once it exists): each step drafted, answered and sent in order, each wait,
  the sign-off asked; with a headless-Chrome walk at 375 and at desktop width.
- **On the real platform, at Rich's word**, in a platform window: the three steps with LTIC's half played by `operator`
  (the admin grant, as F5's walk had it), the sign-off asked and decided; then **Rich's click**.

## To measure on 7100 (the plan's first sitting, in the platform's window)

1. **M1.** A sent-back assessment (`recordPrivacyAssessment` back to `draft`): its `submittedAt`, its `draft`, and the
   checklist's `since`. Can it be told from a draft never sent, by structure? If not, a finding.
2. **M2.** An app that signs nobody in: `draftIamRegistration`'s `409 LAUNCH_NOT_CWL`, and what the checklist's
   `iam-registration` item says.
3. **M3.** `requestApproval`, then the checklist: `admin-approval`'s `since`; a new version on trying-out (`since` null);
   the old version back (its `since` again).
4. **M4.** The drafts on a real app: their sizes, the gaps' texts, and how the draft's `fromCommit` is compared with the
   version on trying-out (which field of the candidate release names its commit).
5. **M5.** Where the blueprint keeps its data definitions, and the agent's reading cap.
6. **M6.** A same-day submission's dates (noon in Vancouver) and our day count against them.
7. **M7.** **[Take it out]**: the lead removing an attribute from the app's sign-in, validated, and the draft again.

## What waits on the platform

- **FE-46** (`api-findings.md`): the *sent to LTIC* step, LTIC told by email (a sign-off request too), the gaps' ids and
  the answers kept. **Every press that sends waits for it**, and so do §2's cards and §4's agent (their keys are the
  gaps' ids). **CONFIRMED by Rich** in the platform's session (`ddc76d7`); next a spec action, then a sitting.
- **The platform's sitting 10** (the launch path's Task 13: the mock's drafts, submissions, requests and queue scripted,
  and FE-40's switches): **F5b's mock-mode acceptance and walks wait for it.** Until then F5b is built against recording
  fakes, and the mock's document examples (which answer whatever is asked: FE-27). Its hand-forward says the mock should
  not script *sent to LTIC* until the platform has it. **(S0, 2026-10-02) It has closed** (`8ff925f`): the mock plays
  each stage of the records and the sign-off by a switch (`MANIFEST_MOCK_RECORDS`, `MANIFEST_MOCK_APPROVAL`); the plan
  says how F5b walks them.
- **Nothing else.** Contract 1.5.0 at `a230c1a` (72 operations) serves part one: the records, `since`,
  `changeRequestedFrom`, the drafts and `requestApproval`.

## The sittings (the plan decides their tasks)

**Part one: buildable on today's contract, after F6 is executed.**
1. **Sitting 1, the measurements** (M1–M7), on 7100 in the platform's window, at Rich's word.
2. **Sitting 2:** the one sequence of three steps (`steps.ts`), from today's records and *waiting since*, **with F5's
   admission kept on the current card** (no send exists yet); *Trying out*'s line and **[Open it]**; the band's words;
   **the sign-off request, whole** (§3: it waits for nothing).

**Part two: when FE-46 lands; its acceptance when sitting 10 has too.**

3. **Sitting 3:** the Privacy answers agent and our store's next version (§4); the assessment's card: **[Start]**, the
   disclosure, the fields, **[Send it to the Manifest team]**.
4. **Sitting 4:** the registrations' cards: the plain words, **[Take it out]**, stale drafts, every refusal; F5's
   admission gone for good.
5. **Sitting 5, the acceptance:** `check-clocks.sh` in mock mode; the whole-branch review; the walk on 7100; Rich's click.

## Words for Rich

*The walk-through's words are the design. These are the sentences it does not settle, or that Rich's decisions today
changed; all are proposed, for his review with the plan, and stay his to change at his click.*

| Where | Words |
|---|---|
| *Going live*'s lead | *"…three things are answered by other people, one after another, and each may take several days. That's why this page exists from day one."* |
| The steps | *"A privacy assessment"* · *"Registering your trying-out address"* · *"Registering your students' address"* |
| A step to come | *"Next, once the Privacy Office has approved the assessment."* · *"Next, once your trying-out address is registered."* |
| A step's states | §1's table |
| The assessment's card | *"We've filled in what Manifest knows."* · disclosure *"What Manifest filled in"* · *"Only you can answer these."* · *"Suggested from your app's plan and what it's built from. Check it, and change anything that isn't right."* · *"Only the Privacy Office can answer this one. The Manifest team will ask them."* · **[Send it to the Manifest team]** |
| The agent, working and failed | *"Reading your app's plan to suggest answers…"* · *"We couldn't suggest answers just now. You can write them yourself, or try again."* **[Try again]** |
| A registration's card | *"What it asks UBC for"* · the seven attributes' words (§2) · *"Your app asks UBC for <it>, but nothing in it uses it. UBC's identity team will ask why."* **[Take it out]** · its change, *"Stop asking UBC for <it>: nothing in the app uses it."* |
| Stale | *"Your app has changed since this was drafted."* · *"Drafted before the assessment was approved."* · **[Draft it again]** · *"Put a version on your trying-out address first: this is drawn from it."* · *"It was drafted again a moment ago. Here it is: check it, then send it."* |
| Sent | disclosure *"What you sent"* |
| Not needed | *"Not needed: it doesn't sign anyone in."* |
| The band | *"Three things other people answer, one after another, and each may take several days. Going live shows where each one is."* **[Start them]** / **[Going live]** |
| *Trying out* | *"Registering it is the second of three steps on Going live: <its state>."* **[Going live]** |
| The sign-off | **[Ask a Manifest administrator to sign this off]** · *"Anything they should know?"* · *"For example, the day your students need it. Only Manifest administrators see it."* · **[Ask them]** · **[Not now]** · *"A Manifest administrator looks at this next."* · *"asked 21 September · waiting 2 days"* · *"The version on your trying-out address changed a moment ago. Ask about the new one?"* |

## Departures from the walk-through

To be carried into [`../walkthrough.md`](../walkthrough.md) with the plan:
- **Moment 10**: *"three long clocks, started early"* become three steps **one after another** (D2), each **sent to the
  Manifest team**, not to UBC (D3); *Draft the request* and *Fill in what we know* become one **[Start]** per step, and
  *"I've sent it"* becomes **[Send it to the Manifest team]**; the staging registration is step 2 on *Going live*, and
  *Trying out* keeps one line (replacing F5's Decision 4).
- **Moment 13**: *"There is nothing for asked (FE-25)"* is gone: FE-25 landed (`a1d4baa`), and the row asks with a press
  and an optional note (D7).

## What F5b does not build

- **The administrators' half**: the queue (`listQueue`), recording LTIC's submission and UBC's answers. The platform's
  console (its Task 13) and LTIC's work.
- **What UBC asked**, when it comes back with questions (`changeRequestedFrom: submitted`): LTIC relays it to the faculty
  member by its own means (FE-46's *Not asked here*).
- **Emails to the faculty member when a wait ends**: F6's *a long wait is over* (`iam_registration.recorded`,
  `privacy_assessment.recorded`, `release.approved`, `release.approval_rejected`). F6's happenings read FE-46's new events
  when they land.
- **A conversation about a suggestion** (approach C): a *[Talk it through]* beside one answer, if faculty ask.
- **Renewing a registration after launch**, the load rehearsal (FE-44), the dry run read back (FE-43), domains.
