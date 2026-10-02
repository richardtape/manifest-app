# F6b — Working on it together: the design

*Written 2026-10-01 by `manifest-app-d9`, from a brainstorm with Rich in which he approved each section. **This is the
design, not the plan.** Rich's D1 for F6 says F6b's plan is written **after F6 is executed**; he asked for this design
ahead of it (2026-10-01, *"Yes, design now"*), so later sittings start faster. The walk-through
([`../walkthrough.md`](../walkthrough.md), moments 17 and 18, and *Throughout*'s *An agent of their own*) stays the source
of the faculty member's words; where this design departs from it, it says so.*

## What F6b is for

An app is live, and the faculty member is no longer alone with it. F6b is the work they do with others:
- **a change after launch** (moment 17): most changes go straight to their students once tried; a change to something
  reviewed at launch waits for an administrator's look; a new detail about the people who sign in waits for UBC's
  identity team. They are told which, before it matters, and let their students have it with one press;
- **People** (moment 18): who can change the app, adding a colleague and what that lets them do, and taking them off;
- **working on it together**: each member sees every conversation on the app, and acts on their own;
- **an agent of their own** (*Agents*): the agents with access, theirs let in with a secret shown once, and their agent's
  questions answered.

**Success** is Rich's click on the real platform, with two people: a colleague added as a helper; the owner reading the
helper's conversation and stopping it to free the app; a change that needs an administrator's look asked about and then
let through to students; their own agent's question answered.

## Rich's decisions (2026-10-01)

- **D1. The design now, the plan after F6** (Rich: *"Yes, design now"*; F6's D1 stands for the plan). F6b builds on F6
  (the keeper, its kept members, the needs-you band, the emails) and on F5b's part one (the sign-off press).
- **D2. FE-47, filed and carried, as FE-46** (Rich chose *"File FE-47, as FE-46"*): after launch, an owner cannot ask for
  a new sign-in detail (no owner write on an `active` registration), and every build that needs one fails until UBC
  registers it (the platform's `releases/build.ts`, read 2026-10-01). FE-47 asks for the owner's request for a change to
  the live registration, sent to LTIC as FE-46's sends are. **Carried 2026-10-01** to `manifest-6d`, recorded
  **PROPOSED** for its sitting 10 and the next planning session, with FE-46. *Rejected:* saying no to a new detail on a
  live app, with no path; LTIC told by an email from our server, with nothing recorded.
- **D3. See all, act on your own** (Rich chose *"See all, act on your own"*): every member reads every conversation on
  the app; only the person who started one types in it, answers its questions or carries it on; **an owner may stop
  anyone's**, to free the app. *Rejected:* a shared workspace where anyone acts on anything; each seeing only their own,
  as today.
- **D4. The *Agents* screen built honest, FE-5 carried now** (Rich chose *"Build it honest, carry FE-5 now"*): their
  agent's question says what the platform lets it say, with the walk-through's honest line, and **FE-5 (a)** (the question
  carrying who, or which version) is carried with FE-47. *Rejected:* building it without carrying FE-5; leaving the
  *Agents* screen out of F6b.
- **D5. Approach A, with token ids** (Rich chose *"A, with token ids"*): the page makes every platform call, in the
  person's session; our server shares conversations by the kept members, ends a removed member's conversations, keeps
  each round's sensitive fields, and **keeps the ids of the tokens our page minted**, to tell ours from theirs.
  *Rejected:* our server proxying *People* and *Agents* (member changes are person-only and need a step-up); telling ours
  from theirs by the token's name (free text, which a person could copy: a state read from a field).
- **The design, approved in five sections** (2026-10-01): a change after launch (*"Yes"*); *People* (*"Yes"*); working
  together (*"Yes"*); *Agents* (*"Yes"*); what waits, the measurements and the plan's shape (*"Yes"*).
- **Carried from earlier plans, still binding:** only faculty may be added for now (D7 of F4a, FE-39); a step-up is the
  platform's page, and we remember what they were doing; the five states; C3; *we*, everywhere; a failed change never takes
  the students' version away; every refusal says what is still true.

## §1 A change after launch (moment 17)

Moments 8, 6 and 9 stand: the change is agreed first, built, and put on trying-out. F6b adds **the kind of change** and
**the press that lets students have it**.

**The kind, said in the conversation as soon as it is known.**
- **The round keeps the fields each commit's dry run named** (`CommitOutcome.spec.sensitiveDiff.fields`) on its run; the
  work panel says the kind as soon as a commit names one, and again at the round's end beside *"Ready on your draft
  address"*. (It is measured against the manifest before the commit; the authority for what reaches students is the
  checklist's, below.)
- **Nothing sensitive:** *"Once you've tried it, this can go straight to your students."*
- **Something reviewed at launch:** *"This change needs a Manifest administrator's look before it reaches your students,
  because it changes what it keeps."*, the platform's seven fields (`spec/diff.ts`'s `SENSITIVE_FIELDS`) in words:

  | Field | Words |
  |---|---|
  | `services` | *what it keeps* |
  | `auth.attributes` | *who it learns about* |
  | `egress.allow` | *what it can reach* |
  | `resources` | *how much room it gets* |
  | `data.classification` | *how sensitive its data is* |
  | `ai.models` | *which AI it asks* |
  | `blueprint` | *what it's built on* |

  An unknown field is said as *"something reviewed at launch"*, never hidden and never by its name.
- **A new detail about the people who sign in:** the build is refused for a detail UBC has not registered (**M1** names
  the code and where it arrives). The round stops at **needs you**, a new needs kind:
  - *"This change needs their last name from UBC's identity team, and they must agree to share it first. That may take
    several days."* (the detail in our words, as F5b's attribute words);
  - **[Ask for it]**: FE-47's ask, in the person's session; then the card waits, in F5b's words: *"With the Manifest team ·
    sent 5 October · waiting 2 days"*, then *"With UBC's identity team…"*;
  - when the keeper hears `iam_registration.recorded` with the detail registered: *"UBC's identity team agreed. We can
    carry on."* **[Carry on]**, and F6 emails *a long wait is over*;
  - **until FE-47 lands**: *"Manifest can't ask for it for you yet."*, and only **[Leave it out]**: a change, agreed first,
    without that detail. Nothing pretends to ask.

**Letting students have it**, on a launched app's Overview: a new panel, ***"Waiting to reach your students"***, shown
while the version on trying-out is not the live one:
- *"The version from 3 October is on your trying-out address. Your students have the version from 18 September."*
- **Self-serve** (`getLaunchReadiness`: `launched`, `ready`): **[Let your students have this version]**, owners only, with
  F5's step-up card, stations and refusals (`live.tsx`'s `LetStudentsIn`, generalised for a launched app). A helper reads
  *"An owner lets your students have it."*
- **Re-escalated** (`reescalated`, `sensitiveFields`): the panel names the fields in words, and offers **F5b's sign-off
  press**, *[Ask a Manifest administrator to sign this off]* (`requestApproval` serves a launched app's release: its
  description says so). Approved, the press above returns.
- **If it fails:** *"Your students still have the version from 18 September."*, with F5's *[What went wrong]*. A failed
  change never takes the students' version away (§13), and every screen says so.

## §2 *People* (moment 18)

**The rail** gains ***People*** and ***Agents*** (§4), after *Going live* (F5's Decision 2: *"People and Agents come with
their plans"*).

**The page** (`listMembers`, in the person's session):
- *"Who can change Reading responses"* · *"Students aren't on this list. They get in once it's live."*
- **The list:** each person's name, email, CWL login (when CWL released it: `cwlLogin` may be null) and **Owner** or
  **Helper** (`collaborator`), with *(you)* beside the person reading.
- **The roles in words**, said once: *"Helper: can change the app and try it. Only an owner can let students have a new
  version, change who's on this list, or switch it off."*

**An owner** sees (a helper reads *"Only an owner can change who's on this list."* instead):
- **Add someone:** one field, *"Their CWL login or email"* (an `@` makes it `email`, anything else `cwlLogin`), and Owner
  or Helper: `addMember`. Someone already on the list has their role changed, which is also **Make owner** / **Make
  helper** on each row.
- **Take off**, asked once in place: *"Take Sam off Reading responses? Their work on it stops."*: `removeMember`.
- **Both ask them to sign in again** (`403 STEP_UP_REQUIRED`, **M3**): F5's step-up card, back at `?then=people`, *"You're
  signed in again."*, and the form as they left it (the typed name kept in `sessionStorage` until then, as F4's
  trying-out does, and cleared after).

**Refusals, by code:**
- `MEMBER_USER_NOT_FOUND`: *"We don't know anyone by that name yet. They need to sign in to Manifest once: send them
  `app.manifest.internal`, then try again."*
- `MEMBER_USER_AMBIGUOUS`: *"Two people share that email. Use their CWL login instead."*
- `MEMBER_MAY_NOT_BUILD` (FE-39): *"Only UBC faculty can work on apps for now, so we can't add them yet."*
- `PROJECT_LAST_OWNER`: *"Someone has to own it. Make someone else an owner first."*

**Removing someone, as the platform now does it.** FE-11 landed (the platform's launch path, sitting 5): removing a member
revokes their tokens on the project, ends their agent sessions and closes their streams. **Our keeper hears
`member.removed`** (F6 refreshes its kept members on it) and **ends their conversations on the app here**, as *Stop* does
(the draft keeps what it has; the line moves on), and forgets any token of theirs it holds. The page says *"Sam's work on
Reading responses has stopped."*

**Not built:** inviting someone who has never signed in (deliberately, by the walk-through); a helper leaving by
themselves.

## §3 Working on it together (D3)

**On our server:**
- **Who may read:** a person among the app's **kept members** (F6's `members`) reads **every conversation on the app**:
  the list, its messages, its progress stream, its plan. With no kept members, as today: their own only.
- **Who may act:** every change to a conversation stays **its own person's** (a message, an answer, agreeing, correcting,
  carrying on, *Try a different way*), **except *Stop***, which an **owner** (by the kept members' role) may press on
  anyone's, to free the app. The conversation then says *"Stopped by Alex."*
- **Not shared:** intake conversations (before an app exists) stay private; F6's needs-you band and its emails stay the
  conversation's own person's.
- **Guarded:** a stranger reading any of it is `404`; a helper's write to another person's conversation is `404`; an
  owner's *Stop* on another's is checked against the kept role. The platform still decides everything that reaches it.

**On the page:**
- **Conversations** lists everyone's on the app, newest first, each with who started it (*"Sam · Add a word count"*),
  theirs marked *(you)*.
- **Another person's conversation** opens read-only: *"Sam started this. Only Sam can answer it or carry it on."*; no
  message box; its questions shown with *"Only Sam can answer this."*; for an owner, **[Stop]**.
- **The line** names who holds the app, with a link: *"Sam is working on it: Add a word count."* **[See it]**.
- A removed member's conversations stay readable, as history, ended.

## §4 The *Agents* screen (D4)

**The page** (`listTokens`, `listPendingActions`, in the person's session): *"Agents with access to Reading
responses"*. Expired and revoked tokens are not listed.
- **Ours:** the tokens whose **ids our store keeps** (D5): the page hands each token's id over with its secret (a
  conversation's, F6's *Keeping watch*, F5b's *Privacy answers*). Named in our words: *"Working on 'Add a word count'"* (a
  link to the conversation), *"Keeping watch"*, *"Suggesting privacy answers"*; one line for all: *"These are ours. They
  end with their conversation, or with the app."* No *Revoke* here.
- **Yours:** every other token on the app: its name; what it may do, in words keyed on each capability (*read the app*,
  *change its code*, *build it*, *put a version on the draft or trying-out address*, *use AI on your allowance*…; an
  unknown one by its name, never hidden); when it was last used and when it stops working; **[Revoke]** (`revokeToken`:
  only its minter may, so anyone else is told *"Only the person who made it can revoke it."*).
- **Let an agent of your own in:** a name, what it may do (each capability a checkbox, in words), how long (7, 30 or 90
  days), **[Make it]** (`mintToken`). The secret is shown **once**, in mono, with **[Copy]** and *"This is the only time we
  can show it. Keep it somewhere safe."*, and a link to how an agent uses it (the platform's guide).
- **Ours never asks**: our tokens never hold one of D24's privileged four.

**Their agent's questions** (D24's pending actions):
- **The keeper hears `pending_action.created`** on the stream: a *needs you* in F6's band (*"Reading responses: your agent
  is asking something."* **[Agents]**), emailed once, F6's way.
- **The card**, at the top of *Agents*: *"Your agent 'Claude Code' asked to add a member to this project."* (ours, keyed
  on `action`; an unknown action by the platform's `summary`); FE-5's honest line, *"It didn't say who. If you're not
  sure, say no."*; *"Yes lets it try that one request once."*; *"It stops waiting at 4:12pm."*; **[Yes, once]** · **[No]**,
  with an optional *"Tell it why"* (`confirmPendingAction` / `rejectPendingAction`).
- **When FE-5 (a) lands**, the card names who, or which version, and the honest line goes.
- **Who may answer**, and whether answering asks a step-up, is **M4**; a member who may not reads *"An owner answers
  this."*

## §5 How we will know it works

- **Pure:** the seven fields' words, the capabilities' and the actions' words (`machineryIn` empty over all); the kind of
  a change from a round's fields; the sharing guards' rules.
- **Our server:** every guard of §3 (a stranger `404`, a helper's write to another's `404`, an owner's *Stop*);
  `member.removed` ending conversations and forgetting tokens; a pending action's need and its one email; the token ids
  kept, and never a secret (the no-credential scan).
- **Screens, against recording fakes** (assert what was sent, never what the mock answered); then
  **`scripts/check-together.sh`** in mock mode, and a headless-Chrome walk at 375 and at desktop width.
- **On 7100, at Rich's word, with two people** (`instructor` and `colleague`, who may both build): a helper added; their
  conversation read by the owner and stopped; a sensitive change asked about, then let through to students; their own
  agent's question answered; then **Rich's click**.

## To measure on 7100 (the plan's first sitting, in the platform's window)

1. **M1.** A launched app's change that adds an unregistered detail: the build's refusal, **its code** and where it
   arrives (`startBuild`'s answer, or `build.failed`), so the round stops by code.
2. **M2.** A sensitive change after launch: each commit's `sensitiveDiff.fields` across a round; then `reescalated`,
   `sensitiveFields` and `admin-approval` for the candidate, and `requestApproval` for it.
3. **M3.** `addMember` and `removeMember`: the step-up, every refusal's code, and `member.removed` reaching the keeper
   (what the platform ends).
4. **M4.** A pending action from a token of our own making: who may answer, whether answering asks a step-up, how long it
   waits, and `pending_action.created` on the stream.
5. **M5.** `listTokens`: whose tokens it lists, and `revokeToken` by someone who did not mint it.

## What waits on the platform

- **FE-47** (D2): the new-detail ask. Until it lands, **[Leave it out]**. PROPOSED on the platform's side until Rich
  confirms it to a platform session, with FE-46; a spec action follows.
- **FE-5 (a)** (D4): the question's object. Until it lands, the honest line.
- **Nothing else.** Contract 1.5.0 has the members, the tokens, the pending actions, a launched app's checklist, `deploy`
  and `requestApproval`.

## The plan's shape (written after F6 is executed; the plan decides)

1. The measurements (M1–M5).
2. Sharing (§3) and the keeper's removals (§2's last part): our server.
3. *People* (§2): the page.
4. A change after launch (§1).
5. *Agents* (§4).
6. The acceptance: `check-together.sh`, the whole-branch review, the walk on 7100 with two people, Rich's click.

## Words for Rich

*All proposed, for his review with the plan; each stays his to change at his click.*

| Where | Words |
|---|---|
| The kind of change | *"Once you've tried it, this can go straight to your students."* · *"This change needs a Manifest administrator's look before it reaches your students, because it changes <field in words>."* · the seven fields' words (§1) |
| A new detail | *"This change needs <detail> from UBC's identity team, and they must agree to share it first. That may take several days."* **[Ask for it]** · *"UBC's identity team agreed. We can carry on."* **[Carry on]** · *"Manifest can't ask for it for you yet."* **[Leave it out]** |
| Waiting to reach your students | *"Waiting to reach your students"* · *"The version from 3 October is on your trying-out address. Your students have the version from 18 September."* · **[Let your students have this version]** · *"An owner lets your students have it."* · *"Your students still have the version from 18 September."* |
| People | *"Who can change <App>"* · *"Students aren't on this list. They get in once it's live."* · *"Their CWL login or email"* · the roles' sentence · *"Only an owner can change who's on this list."* · *"Take <name> off <App>? Their work on it stops."* · *"<Name>'s work on <App> has stopped."* · the four refusals (§2) |
| Together | *"<Name> started this. Only <Name> can answer it or carry it on."* · *"Only <Name> can answer this."* · *"Stopped by <Name>."* · *"<Name> is working on it: <title>."* **[See it]** |
| Agents | *"Agents with access to <App>"* · *"These are ours. They end with their conversation, or with the app."* · *"Working on '<title>'"* · *"Keeping watch"* · *"Suggesting privacy answers"* · the capabilities' words · *"Only the person who made it can revoke it."* · *"Let an agent of your own in"* · *"This is the only time we can show it. Keep it somewhere safe."* |
| Their agent's question | *"<App>: your agent is asking something."* · *"Your agent '<name>' asked to <action in words>."* · *"It didn't say who. If you're not sure, say no."* · *"Yes lets it try that one request once."* · *"It stops waiting at <time>."* · **[Yes, once]** · **[No]** · *"Tell it why"* · *"An owner answers this."* |

## Departures from the walk-through

To be carried into [`../walkthrough.md`](../walkthrough.md) with the plan:
- **Moment 17**: *"That takes weeks"* becomes *"That may take several days"* (Rich's F5 rule), and the new detail is asked
  for through LTIC (FE-47), with *[Leave it out]* until then; the students' press is on a launched app's Overview, in
  *"Waiting to reach your students"*.
- **Moment 18**: removing someone no longer leaves their agent working: FE-11 landed, so *"Anything they run elsewhere
  keeps its access until it expires"* goes.
- ***Throughout***: our agents are told from theirs by the token ids we keep; their agent's question is in F6's band and
  emailed once.

## What F6b does not build

- **Inviting someone who has never signed in** (the walk-through: deliberately not built), and **TAs** until the
  platform's *who may build* includes them (D7 of F4a).
- **A helper leaving by themselves**, and transferring ownership as one action (an owner adds another owner, then takes
  themselves off).
- **Editing another person's conversation**, or answering its questions (D3).
- **Revoking our own tokens from *Agents***: they end with their conversation or the app.
- **What their agent does with its token** beyond the four limits: the platform's.
