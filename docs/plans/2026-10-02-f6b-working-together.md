# F6b — Working on It Together: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development,
> as Rich chooses at approval) to implement this plan task-by-task, one sitting per session. Steps use checkbox (`- [ ]`)
> syntax for tracking. **Read [`../ORIENTATION.md`](../ORIENTATION.md) first. F6 is executed (2026-10-02); this plan starts
> from it, and from F5b's part one (sitting 2, merged).**

**Status: WRITTEN 2026-10-02** by `manifest-app-c0`, after F6's execution (D1), from the design Rich approved as written,
[`2026-10-01-f6b-working-together-design.md`](./2026-10-01-f6b-working-together-design.md): **read it first**. This plan says how to build it, and the decisions only an implementation needs. **The contract was read for it
the same day** (manifest `6c77c15`, 1.5.0, 72 operations): most of the design's five measurements are now answered by
reading, and two findings are written (**FE-49**, **FE-50**, below). **APPROVED BY RICH, 2026-10-02** (*"plan approved,
we'll do it native"*, session `manifest-app-c0`), **to be executed natively** (superpowers:executing-plans, as F3 to F6
ran). **Sitting 2 first**, while the platform's sitting 12 holds 7100 (sittings 2 and 3 need no platform); sitting 1 in
the platform's window after it, at Rich's word.

**Goal:** An app is live and its owner is no longer alone with it. They add a colleague, say what that lets them do, and
take them off; every member sees every conversation on the app and acts on their own, and an owner can stop anyone's to
free the app; a change after launch says, before it matters, whether it can go straight to students, needs an
administrator's look, or needs a new detail from UBC's identity team, and one press lets students have it; and the few who
run their own agent let it in, see which agents are ours and which are theirs, and answer its questions. Walk-through
moments **17 and 18**, and *Throughout*'s **An agent of their own**.

**Architecture:**
- **The page makes every platform call, in the person's session** (D5): `addMember`, `removeMember`, `listTokens`,
  `mintToken` for an agent of their own, `revokeToken`, the pending actions, `deploy` to a launched app's students' address,
  `requestApproval`. **Our server calls none of them** (`launch-actions.test.ts`).
- **Our server shares conversations by F6's kept members** (§3): a pure `standingOf` says whether the reader is the
  conversation's own person, a member, an owner, or a stranger; reads widen to members, every change stays its own
  person's, and *Stop* also an owner's. **The keeper ends a removed member's work** here, on `member.removed` or on a
  re-read that no longer lists them (FE-48).
- **Our server keeps the ids of the tokens our page mints** (D5), never a secret: a store version 6 table, `minted`, beside
  F6's `watch_tokens`. *Agents* tells ours from theirs by them.
- **The round keeps what each commit says is sensitive** (`spec.sensitiveDiff.fields`), and stops at a new *needs you*
  when a build is refused for a sign-in detail UBC has not registered. **The students' press after launch** is F5's
  `LetStudentsIn` on the Overview; **the administrator's look** is F5b's sign-off press.
- **The keeper hears an agent's question** (`pending_action.created`) on F6's stream: a *needs you*, emailed once.

**Tech Stack:** F6's: TypeScript 5, Node 24, Fastify 5, React 19, Vite 8, Vitest 2.1.9, `zod` 3.25.76 through `zod/v4`,
`node:sqlite`, nodemailer 10.0.13 (F6's, our server only). **No new dependency.**

**Spec:**
- **[`2026-10-01-f6b-working-together-design.md`](./2026-10-01-f6b-working-together-design.md)**: Rich's D1–D5 and §1–§5.
  **This plan argues from it**; where they disagree, the design wins until Rich says otherwise.
- [`../walkthrough.md`](../walkthrough.md): moments 17 and 18, *Throughout*'s *An agent of their own*: the faculty member's
  words (the departures, below, are carried into it by the tasks that build each moment);
- [`../api-findings.md`](../api-findings.md): FE-5 (a), FE-11 (landed), FE-39, FE-47, FE-48, and **FE-49 and FE-50, written
  with this plan**;
- manifest's `openapi.json` **1.5.0, 72 operations**; `docs/api/events.md`; `packages/control-plane/src` for behaviour:
  read-only.

---

## How this plan is executed: sittings, one per session

| Sitting | Tasks | Delivers | Status |
|---|---|---|---|
| 1 | 1 | **The measurements** that reading could not settle (M1–M5, below), on 7100 in the platform's window, at Rich's word, **with two people**. **Alone.** Sittings 2 and 3 may run before it (they need no platform); 4 and 5 after it | **done 2026-10-02** (`manifest-app-30`, edge mode, in `manifest-96`'s window): M1–M5 on `f6b-measure-1`, launched; the plan corrected **(S1)**; FE-51, FE-52, m97, Decision 16. *What executing this plan found*, its entry |
| 2 | 2, 3, 4 | **Our server:** sharing (§3); the token ids kept (D5), store version 6; the keeper's removals (§2's last part) | **done 2026-10-02** (`manifest-app-b8`, mock mode): `a751003`, `2e3a21a`, `144d513`; the review's I1 and I3 `2169b13`; a flake `32887f1`. 2386 tests twice; the six acceptance scripts from a fresh dev database. *What executing this plan found*, its entry |
| 3 | 5, 6, 7 | **The page:** the platform's six new calls, *People* and *Agents* in the rail; *People* (moment 18); working on it together (§3) | **done 2026-10-02** (`manifest-app-b8`, mock mode): m77 `9502d7c`; `005a552`, `1559bc6`, `842a403`; the review's fixes `3912ff3`. 2476 tests twice; walks of *People* and of two people on one app at 1440 and 375; the six acceptance scripts from a fresh dev database. *What executing this plan found*, its entry |
| 4 | 8, 9, 10 | **A change after launch** (moment 17): the kind of change; the new detail's stop and **[Leave it out]**; *Waiting to reach your students* | not started |
| 5 | 11, 12 | ***Agents***: ours and theirs, **[Revoke]**, an agent of their own let in; their agent's questions (the band, the email, the card) | not started |
| 6 | 13 | **The acceptance:** `scripts/check-together.sh` in mock mode; the whole-branch review; the walk on 7100 with two people; **Rich's click**. **Alone, and last** | not started |
| 7 | 14, 15 | **When the platform lands them:** FE-47's **[Ask for it]**; FE-5 (a)'s question naming who or which version | **waits for FE-47 and FE-5 (a)** (confirmed by Rich, `ddc76d7`; their spec actions drafted at manifest `6c77c15`, not applied) |

**F6b is executed when sitting 6 is done.** Sitting 7 is its own, later, and does not hold F6b open (as F5b's part two).

**Every sitting starts** with `pgrep -fl vitest`, `ListAgents` (tell the platform's live session our name, and hold every
Vitest run of ours between its *tier* and *closing tests* holds), and **Step 0** (*Adopting what lands*). **Every sitting
ends as F6's did:**
1. the four gates, `pnpm test` twice; and, when it touched our server, the acceptance scripts in mock mode from a fresh dev
   database (`check-seeing.sh` first; `check-keeping.sh` last; from sitting 6, `check-together.sh` before it);
2. a dated entry in *What executing this plan found*;
3. this table;
4. ORIENTATION's *Where things stand*, replaced, and the roadmap;
5. `pgrep -fl vitest` again.

**Every walk uses `scripts/walk/`** (headless Chrome over DevTools, its README, `self-test.ts`), at 1440 and 375, and
**answers `GET /api/apps/:projectId/keeping` as kept** (`page.rewrite`), so no app page mints a watch it was not asked to
(ORIENTATION §7; minors m72).

**Adopting what lands (Step 0).** The platform runs its launch path's sitting 12, then its faculty-ready plan (1.6.0,
`__Host-` cookies: our adoption is prepared in `research/2026-10-01-faculty-ready-adoption.md`). At each sitting's start:
re-read `openapi.json` (version, operations, codes); `pnpm typecheck`; `pnpm test`; record any landing in `api-findings.md`
the same day; **restart `pnpm mock`** when its fixtures moved. **A landing of FE-47 or FE-5 (a)** opens sitting 7: its
names are the platform's, and ours (marked **(FE-47)** below) are renamed to match, test-first, before its task.

---

## Decided by Rich: build them, do not re-open them

The design's **D1–D5**, each quoted and dated there. In one line each:
- **D1.** The design before F6's execution; **this plan after it** (now).
- **D2.** FE-47 filed and carried, as FE-46: a new sign-in detail after launch is asked through LTIC; until it lands,
  **[Leave it out]**.
- **D3.** **See all, act on your own:** every member reads every conversation on the app; only its own person acts in it;
  **an owner may stop anyone's**, to free the app.
- **D4.** ***Agents* built honest, FE-5 (a) carried:** their agent's question says what the platform lets it say, with the
  walk-through's honest line, until FE-5 (a) lands.
- **D5.** **Approach A, with token ids:** the page makes every platform call in the person's session; our server shares by
  the kept members, ends a removed member's conversations, keeps each round's sensitive fields, and **keeps the ids of the
  tokens our page minted**, to tell ours from theirs.
- **Carried, binding:** only faculty may be added for now (F4a's D7, FE-39); a step-up is the platform's page, and we
  remember what they were doing; the five states; C3; *we*, everywhere; a failed change never takes the students' version
  away; every refusal says what is still true.

### Words proposed for Rich

The design's *Words for Rich* table stands (moment 17, *People*, working together, *Agents*, their agent's question). **New
here** (each in `words.ts`, or `keeping/words.ts` for the email):

| Where | Words |
|---|---|
| *People* | *(you)* · **Owner** · **Helper** · **[Add them]** · *"Adding…"* · **[Make owner]** · **[Make helper]** · **[Take off]** · *"Taking them off…"* · *"We couldn't change who's on it just now. Nothing has changed."* |
| Together | *"<Name> was taken off <App>. Their work on it stopped."* (a removed member's conversation) · *"<Name> · <title>"* (the list's row) |
| The kind of change | an unknown sensitive field: *"something reviewed at launch"* · the round's end: *"Ready on your draft address. <the kind>"* |
| A new detail | each detail in words (Decision 9): *"their name"*, *"their first name"*, *"their last name"*, *"their email"*, *"whether they're a student or staff"*, *"their student number"* (**(S1: M1)**: only *first name* (`givenName`), *last name* (`sn`), *email* (`mail`) and *student or staff* (`eduPersonAffiliation`) can arise; the platform refuses the rest at the commit); an unknown one: *"a new detail about the people who sign in"* · **[Leave it out]**'s change, its first words: *"Leave <detail> out of '<title>': UBC's identity team hasn't agreed to share it."* |
| *Agents*: what a token may do | *read the app* · *change its settings* · *change its code* · *set its secrets* · *read what it printed* · *use AI on your allowance* · *build it* · *make a version* · *put a version on the draft or trying-out address* · *draft its launch records* · *ask for a Manifest administrator's sign-off*; an unknown one by its name · *"Last used <when>"* / *"Never used"* · *"Stops working <day>"* · **[Make it]** · *"7 days"*, *"30 days"*, *"90 days"* · *"How an agent uses it"* |
| Their agent's question: the action | *change who's on <App>* (`members:manage`) · *let your students have a new version* (`release:promote`) · *read one of its secrets* (`secret:read`) · *change how much it may use* (`quota:set`); an unknown one: the platform's `summary`, as it says it |
| Their agent's question: no reason given | **[No]** with *"Tell it why"* left empty sends *"No reason given."* (the platform asks for one: Decision 13) |
| The email | subject *"<App>: your agent is asking something"* · body *"Your agent '<name>' asked to <action> on <App>. It stops waiting at <time> on <day>. Answer it on its page:"*, the link to *Agents*, and F6's last line |

---

## What the contract says (read 2026-10-02, manifest `6c77c15`)

The design's measurements, as far as reading answers them. **Each line is the code's or the contract's, with where.** What
reading cannot settle stays for sitting 1 (M1–M5 below).

- **Members.** `addMember` (`POST /v1/projects/{projectId}/members`) **adds or changes** a member: `{ puid? | cwlLogin? |
  email?, role: 'owner' | 'collaborator' }`, exactly one name (else `REQUEST_INVALID`); `201 Member` either way;
  `member.added` only when something changed, carrying `previousRole` (**no `member.role_changed` exists**). `removeMember`
  (`DELETE /v1/projects/{projectId}/members/{userId}`, no body) answers `200 MemberList`. Both need **`members:manage`**
  (an owner's: a collaborator is `403 FORBIDDEN`) and **a step-up within ten minutes** (`403 STEP_UP_REQUIRED`); a token's
  request becomes a pending action. Refusals: `MEMBER_USER_NOT_FOUND` and `MEMBER_USER_AMBIGUOUS` (`400`),
  `MEMBER_MAY_NOT_BUILD`, `PROJECT_LAST_OWNER`, `PROJECT_ARCHIVED` (`409`). `Member` is `{ userId, puid, cwlLogin: string |
  null, displayName, email, role }`. **(S1: M3)** measured as read, and: the step-up returns `302` to `returnTo` exactly;
  one step-up covers every members change for ten minutes; **`removeMember` of someone not on the app (or a made-up id) is
  `200` with the list unchanged**, no refusal and no event; the last owner adding themself as a helper is
  `PROJECT_LAST_OWNER` too; a helper reads the members (`200`), a stranger gets `404`. **In `member.added` and
  `member.removed`, `userId` is the one who did it and `memberId` the one it is about** (our keeper reads them so).
- **Removing someone** (FE-11, `project-reads.ts:581-663`): their tokens on the project revoked, their tokens' streams
  closed **`4401`**, their own browser streams **`4404`**, their agent sessions ended, then `member.removed { memberId,
  tokensRevoked, sessionsEnded, via, userId, tokenId }`. **A stream of a token they minted closes before `member.removed`
  is published, so it never hears it** (FE-48).
- **Tokens.** `listTokens` (session only) lists **every** token on the project, every minter's, **revoked and expired
  included**. `Token` is `{ id, projectId, name, capabilities, rateLimit, expiresAt, expired, revokedAt, lastUsedAt,
  createdAt }`: **no minter** (**FE-49**). `revokeToken` by anyone but its minter is **`404 NOT_FOUND`**, as for an id that
  does not exist. `mintToken`: `expiresInDays` 1–365; **eleven capabilities may be minted** (`project:read`,
  `project:write`, `source:write`, `secret:write`, `output:read`, `agent:session`, `build:create`, `release:create`,
  `release:deploy`, `launch:draft`, `approval:request`); D24's privileged four and the five person-only ones are `400
  TOKEN_CAPABILITY_FORBIDDEN`. **No `token.revoked` event exists.** **(S1: M5)** measured: a helper's `listTokens` lists
  every minter's; **an owner's `revokeToken` of a helper's token is `404` too** (only the minter, whatever the role); a
  helper may mint an agent's token (`201`); a token's `mintToken` is `403 TOKEN_CREDENTIAL_REFUSED`.
- **Pending actions** (D24): `listPendingActions` (a person sees all; a token its own), `confirmPendingAction` (**asks a
  step-up**), `rejectPendingAction` (`{ reason }`, **1–500 characters, required**; never a step-up). `PendingAction` is `{
  id, projectId, tokenId, action, state: pending | confirmed | rejected | expired, method, path, bodySha256, summary,
  expiresAt, createdAt, resolvedAt, waitingSeconds, reason, consumedAt }`: `action` is **a string, not an enum** (one of
  the privileged four today), and **no token name** (the page joins `tokenId` with `listTokens`). **It waits 24 hours.**
  **Who may answer:** the code lets **anyone holding the action's capability** answer (`pending-actions.ts:90`: for
  `members:manage` and `release:promote`, an owner); the docs say **its minter** (**FE-50**). `pending_action.created {
  pendingActionId, tokenId, action }`, `.confirmed` and `.rejected` reach **any `project:read` stream**: our watch token's.
  **(S1: M4)** measured: the events reach our watch and our keeper writes them; `.confirmed` and `.rejected` also carry
  `resolvedBy` (a person id), `.rejected` the `reason`. **The code's rule holds (FE-50)**: a helper's confirm and reject
  are `403 FORBIDDEN`, **even for their own agent's question**; an owner who did not mint it answers. `listPendingActions`
  takes **no `?state=`** (`400`): filter `pending` on the page. A watch token's list is `[]` (its own only). The retry after a
  yes is matched by the body, not the key (**FE-51**). **A revoked token's questions stay `pending`, and a yes to one does
  nothing** (**FE-52**; Decision 16).
- **A change after launch.** `createCommit`'s `CommitOutcome.spec.sensitiveDiff` is `{ sensitive: boolean, fields:
  string[] }`, measured **against the newest valid manifest** (one commit's delta); the platform's seven
  (`spec/diff.ts`): `services`, `auth.attributes`, `egress.allow`, `resources`, `data.classification`, `ai.models`,
  `blueprint`. **The authority** is `getLaunchReadiness` on a launched app: `launched: true`, `sensitiveFields` (against
  the last approved release), `reescalated` (an approval is what this release waits for), `ready`, `candidateReleaseId`
  (the release serving staging). `deploy` to production asks **`release:promote`** (an owner's), **a step-up**, and
  `ready`; refusals `RELEASE_REESCALATED` (only the approval missing), `RELEASE_PRODUCTION_GATE_UNAVAILABLE`,
  `RELEASE_NOT_STAGED` (`409`, with `error.launchReadiness`). `requestApproval` serves a launched app's release that changes
  a sensitive field (`409 APPROVAL_NOT_NEEDED` otherwise). **(S1: M2)** measured end to end with a conversation token:
  each commit's `sensitiveDiff` is that commit's alone (`egress.allow`; a README `{ false, [] }`; `egress.allow` again);
  before the change `baselineReleaseId` is `null`; on trying-out `reescalated: true`, `sensitiveFields: ['egress.allow']`,
  `admin-approval` `unmet`; **the owner's production deploy asks the step-up first, then answers `409 RELEASE_REESCALATED`**;
  the owner's `requestApproval` is `200` with no step-up (`approval.requested` on the stream; `admin-approval`'s `since` is
  the ask's time); after the administrator's approval `ready: true`, `reescalated: false`, **but `sensitiveFields` keeps
  `['egress.allow']`**, before and after the press: **`reescalated` is the signal, never `sensitiveFields` alone**. The
  conversation token's own production deploy is `403 TOKEN_ACTION_PENDING` (`release:promote`: a question for an owner);
  our round never makes it.
- **M1, read** (`releases/build.ts:179`, `:239-258`, `:325-341`): a manifest asking for a CWL attribute that production's
  **registered** registration (`registeredAt` set) lacks fails **every** build, the sandbox's included: **not** `startBuild`'s
  answer (it was `202`), but the build `failed` and **`build.failed` with `machineDetail.code:
  'SPEC_ATTRIBUTE_NOT_REGISTERED'`**, and the attributes only in a free-text `reason`. `auth.attributes` is free strings (no
  catalogue on the platform). **(S1: M1) Measured, and one line corrected: there IS a catalogue.** A commit asking an
  attribute outside the platform's five (`ubcEduCwlPuid`, `mail`, `givenName`, `sn`, `eduPersonAffiliation`) is refused at
  the commit, `422 SPEC_INVALID` with `details[].code` `SPEC_ATTRIBUTE_NOT_WHITELISTED` (*"uid" is not a releasable UBC
  attribute*), and nothing is written. A whitelisted attribute that production did not register is the build's failure,
  as read: the commit `201`, `startBuild` `202`, the build `failed` within a second, and **`build.failed` reaches the
  conversation token's stream with `machineDetail { code: 'SPEC_ATTRIBUTE_NOT_REGISTERED', reason, buildId }`**.
  **`getLaunchRecords` answers the conversation token** (`200`): the field is **`iamRegistration.registeredAttributes`**
  (production's, `registeredAt` set). The readiness's `iam-registration` item reads `unmet` for such a release at once.

### What sitting 1 still measures (M1–M5)

*Measured 2026-10-02 (sitting 1): each answer is in its line above and below, marked **(S1)**, and in the entry *Sitting 1*.*

1. **M1.** On a launched app with production registered: a commit adding `sn` to `auth.attributes`; `build.failed`'s
   `machineDetail.code` **on the conversation token's stream**; `getLaunchRecords` with **the conversation's token** (its
   capabilities, `token.ts`'s `CAPABILITIES`) and the field naming the registered attributes, so the round names the missing
   detail **without reading the free-text reason** (Decision 9). And the laptop IdP's attributes, for Decision 9's words.
2. **M2.** A sensitive change after launch, end to end: each commit's `sensitiveDiff.fields` across a round; then
   `getLaunchReadiness` (`reescalated`, `sensitiveFields`, `admin-approval`'s `since`); the owner's `deploy` refused
   `RELEASE_REESCALATED`; `requestApproval`; the administrator's approval; the owner's `deploy` with its step-up.
3. **M3.** `addMember` (a helper, then **Make owner** on the same person) and `removeMember`: the step-up's return; every
   refusal's code and `hint`; **`member.removed` reaching our keeper when the remover did not mint our watch token**, and the
   `4401` (with no event) when the one removed did.
4. **M4.** A pending action from a token minted as *Agents* will mint it (`project:read`, `agent:session`, `source:write`):
   `addMember` with it → `403 TOKEN_ACTION_PENDING` and its `error.pendingAction`; `pending_action.created` on **our watch
   token's** stream; `listPendingActions` in the owner's and a helper's sessions; **a helper's confirm (`FORBIDDEN`?) and
   reject**; the owner's confirm with its step-up; the token's identical retry passing once.
5. **M5.** `listTokens` in a helper's session (every minter's tokens?); `revokeToken` of another person's token (`404`).

---

## Findings written with this plan

- **FE-49** (written, not carried): **a token names no minter.** `Token` carries no `mintedBy`, yet only its minter may
  revoke it (`404` for anyone else). *Agents* cannot say, for a token not made on our page, whose it is or whether the reader
  may revoke it, and the question card cannot say *whose* agent asks. **Ours, meanwhile** (Decision 4): our page keeps the
  minter of every token it mints; any other token shows **[Revoke]**, and a `404` says *"Only the person who made it can
  revoke it."* Option (a): `Token.mintedBy { userId, displayName }`.
- **FE-50** (written, not carried; the platform's to rule): **who answers an agent's question: the docs and the code
  disagree.** `docs/api/authentication.md:50` and `TOKEN_ACTION_PENDING`'s remedy say *the person who minted the token*
  confirms; `confirmPendingAction` lets **anyone holding the action's capability** (`pending-actions.ts:90`). *Agents* builds
  on the code (an owner answers), and sitting 1's M4 measures it.

---

## Decisions this plan makes, and why

1. **Who someone is to a conversation is one pure function** (Task 2): `standingOf(conversation, personId, members)` →
   `own` · `owner` · `member` · `stranger`. **An intake conversation (no project yet) is its own person's alone**; an app's
   is readable by its kept members; **with no kept members, as today: own only.** Every read route asks `mayRead`; every
   change route stays the person's own (`getConversation(id, personId)`, unchanged), **except *Stop***, which asks `mayStop`
   (own, or an owner by the kept role). *Rejected:* sharing by the platform's membership read per request (our server has no
   person's session to ask with: FE-2).
2. **A stranger and a helper's write both answer `404 NOT_FOUND`**, as today's *someone else's conversation looks like none*:
   nothing says a conversation exists to someone who may not act on it. *Rejected:* `403` for a member's write (it would
   tell a helper, by hand, which ids are real: harmless among members, but two codes for one rule).
3. **The lookup routes stay the person's own** (`…/incidents/:id/conversation`, `…/refusals/…`, `…/rehearsals/…`,
   `…/outages/…`, `…/instances/…`): they reopen **your** work. Another's is on *Conversations*. Cost: two members pressing
   *What happened?* for one outage make two conversations (each their own), rare and harmless.
4. **The token ids** (D5, Task 3): store version 6's `minted` table keeps **`{ token_id, project_id, person_id, purpose:
   'conversation' | 'privacy' | 'agent', conversation_id, name, expires_at, minted_at }`**, never a secret (the no-credential scan
   reads it). The Keeping watch's id is F6's `watch_tokens.token_id`. **An *agent* row keeps its minter**, so *Agents* says
   *(yours)* and offers **[Revoke]** only where it may succeed, for what our page minted (FE-49 for the rest). *Rejected:*
   telling ours from theirs by the token's name (free text: D5's own rejection).
5. **A removed member's work ends here** (Task 4) on either signal: `member.removed` on the stream, **or a members re-read
   (a hand-over, a reconnect, the boot) that no longer lists someone we kept** (FE-48: removing our watch's minter closes the
   stream before the event). Their rounds stop as *Stop* does, recorded `{ why: 'removed' }`; a conversation waiting in the
   line or planning is set aside; their conversation tokens are dropped and their `minted` rows forgotten. **Their own
   conversations on that app become `404` to them** (they are no longer a member: the platform's rule, ours too), and
   readable by the members, ended. *Residual* (FE-48's): until a member's page hands a new watch, a removed watch-minter is
   still a kept member here, and reads as one. **(S1: M3)** seen live, both ways: with our watch the remover's, our keeper
   heard `member.removed` and dropped them; with our watch theirs, it wrote `keeping.stopped` and kept them, and **the next
   member's hand-over replayed `member.removed`** and dropped them.
6. **"Stopped by"** is the run's (Task 2): `RunDetail.stopped: { by: string; why: 'stopped' | 'removed' } | null` (a person
   id; JSON, no migration), and `RoundView.stopped: { name: string; why: 'stopped' | 'removed' } | null`. The page says
   *"Stopped by Alex."* only when the one who stopped is not the conversation's own person.
7. **What the page is told about a conversation's people** (Task 2): `AppConversation` gains `by: { id, name }`; the state
   frame's `conversation` gains `byName` (its person's display name, from `persons`); `LineView.holder` gains `by` (a name).
   **Whether it is yours, and whether you may stop it, the page works out** (`me.id`, `useRole`): one frame serves every
   member watching. Our server still decides every write.
8. **The kind of change** (Task 8): each commit's `spec.sensitiveDiff.fields` is kept on the run as **the union over the
   round** (`RunDetail.sensitive: string[]`), carried as `RoundView.sensitive`. **The page says the kind only for a launched
   app**, and only the union: it may over-say *"needs a look"* (a later commit that reverts names the field again), never
   under-say. **What reaches students is decided by `getLaunchReadiness`** (Task 10), which the panel reads. *Rejected:*
   asking the readiness from the round (the candidate is staging's release, not the draft's).
9. **The new detail** (Task 9): a build failure whose `build.failed.machineDetail.code` is
   **`SPEC_ATTRIBUTE_NOT_REGISTERED`** stops the round at once (never three tries: no retry can pass), as a new needs kind
   **`detail`** with **`details: string[]`**, the attributes **our committed manifest asks for minus production's
   registered ones** (`getLaunchRecords` with the conversation's token; **(S1: M1)** its field is
   `iamRegistration.registeredAttributes`, readable with that token). **Never parsed from the free-text `reason`.** Words
   per attribute (*Words proposed*); an unknown one, *"a new detail about the people who sign in"*, never its name (C3).
   **(S1: M1)** only the platform's five can reach a build (any other is refused at the commit, `SPEC_INVALID`, which the
   round already meets as a refused commit), so the words need only `mail`, `givenName`, `sn` and `eduPersonAffiliation`
   (`ubcEduCwlPuid` is always registered); the generic words stay for a sixth the platform adds.
10. **[Leave it out]** (Task 9, until FE-47): **a new change conversation on the app**, seeded with our words (*"Leave
    <detail> out of '<title>': …"*), planned and agreed first (moment 8, as F5's *Talk it through* is), and the stuck one set
    aside (readable). *Rejected:* a message to the stuck round (the plan agreed would no longer be what is built: D3 of F4,
    *agreed first*); undoing the commit ourselves (the lead's code is the lead's).
11. ***Waiting to reach your students*** (Task 10) is drawn on a launched app's Overview **while `candidateReleaseId` is not
    production's serving release** (`asServed`). Self-serve (`ready`): F5's `LetStudentsIn` with `launched` (it already
    takes it), its step-up returning to `?then=new-version`. Re-escalated (`reescalated`): the fields in words and **F5b's
    sign-off press** (`SignOff`'s ask), then the press when approved. Any other unmet item: the panel says which, in F5's
    row words, and **[Going live]**. **A helper reads *"An owner lets your students have it."*** and no press (the platform's
    `release:promote` is an owner's).
12. **The rail** gains ***People*** and ***Agents*** after *Going live* (F5's Decision 2; `SideNav`'s six), each its own
    route: `/apps/:slug/people`, `/apps/:slug/agents`. **`Then`** gains `people`, `agents` (each page's step-up return) and
    `new-version` (the Overview's).
13. **Rejecting with no reason** (Task 12): the platform requires `reason` (1–500). An empty *"Tell it why"* sends *"No reason
    given."*: the agent learns no more than *no*. *Rejected:* asking the person for a reason before **[No]** (a press that
    asks a question back).
14. **Their agent's question is a *needs you*** (Task 12): `Need { kind: 'agent-asks'; app; pendingActionId; tokenId;
    action; at; expiresAt; owner: boolean }`, **read from F6's `history`** (the keeper already writes every event there: no
    new table): a `pending_action.created` with no `.confirmed` or `.rejected` for its id, and **`expiresAt` its `at` plus
    24 hours** (the platform's TTL; **(S1: M4)**: the event carries no expiry, and **the watch token cannot read another
    token's question**, so the summary and the true expiry are the card's, read in the person's session). The token's name,
    for the email, is ours when our page minted it (`minted.name`), else *"An agent"*. **Emailed once to the app's owners** (they may answer `members:manage` and `release:promote`; FE-50), as F6's
    **`waiting`** kind (D3's four kinds stand: a question for them is *your work is waiting*), keyed by the pending action.
    **Not to the minter as such** (FE-49: we cannot know them). **(S1: M4)** measured: the event carries no expiry
    (`pending_action.created { action, tokenId, pendingActionId }`), the platform's `expiresAt` is its `createdAt` plus 24
    hours, and a watch token's `listPendingActions` is `[]`.
16. **A question from an agent that can no longer act is not asked** **(S1: M4, ours)**. The platform keeps a revoked
    token's questions `pending` for their 24 hours, and a yes to one does nothing (FE-52). So *Agents*' card lists a
    `pending` question only when its token is still active (`listTokens`: not revoked, not expired), and **our
    [Revoke] first answers *no*** to that token's waiting questions (`rejectPendingAction`, *"This agent was revoked."*), so
    their `.rejected` ends the band's need. *Residual:* a token revoked elsewhere (the console, a removal, which revokes the
    person's tokens) keeps its need in the band until its 24 hours end, with no card behind it. *Rejected:* a card with
    **[No]** alone for a revoked agent (a question nobody can act on, asked anyway); our keeper reading `listTokens` (a
    person's session only: the watch token cannot, and no event says when to).
15. **Text kept across a step-up** (Task 6): *People*'s typed name and role, in `sessionStorage` under
    `manifest-app.people.<projectId>`, written on `STEP_UP_REQUIRED` and read once (removed) on return, as trying-out keeps
    its release id. **A secret is never stored anywhere** (Task 11): a page left after **[Make it]** loses it, as the words
    say.

## What waits on the platform

- **FE-47** (D2): the new detail asked through LTIC. Until it lands, **[Leave it out]** alone (Task 9); sitting 7 builds
  **[Ask for it]**.
- **FE-5 (a)** (D4): the question names who, or which version. Until it lands, the honest line; sitting 7 drops it.
- **FE-49, FE-50** (written with this plan, for Rich): nothing waits on them; each is honest without them.
- **Nothing else.** Contract 1.5.0 has every operation F6b calls.

## Global Constraints

- Everything in F1's to F6's *Global Constraints*, which stand: no token or key reaches a model; **our server and the lead
  never deploy anywhere but the sandbox**; no dependency is added; a step ticks only on its own signal; no infrastructure
  words (C3); every problem shown carries a support reference.
- **Every platform call that changes who may work on an app, what students reach, or what an agent may do is the person's
  own, in the browser**: `addMember`, `removeMember`, `mintToken`, `revokeToken`, `confirmPendingAction`,
  `rejectPendingAction`, `deploy` to production, `requestApproval`. **Our server calls none of them**
  (`launch-actions.test.ts` grows, Task 2).
- **Nothing persisted is a credential** but F6's sealed watch token. `minted` holds ids. The no-credential scan reads every
  table (Tasks 3, 13).
- **A member reads; only its own person acts; an owner may also stop.** Every route's guard is a test (Tasks 2, 4).
- **Five states only; *we*, everywhere; `machineryIn(text())` empty** on every new screen, and over every word map (the
  seven fields, the details, the capabilities, the actions), unknowns included.
- **Never hide what we do not know:** an unknown sensitive field, detail, capability or action is said generically, never
  dropped.

## Review Focus

1. **The removed member who minted our watch** (FE-48): `removeMember` closes the stream `4401` and `member.removed` never
   arrives. The next hand-over's re-read must end their work here and make their reads `404`; nothing may still email them
   *we need you* for a conversation the removal stopped (m69's cousin). **Pinned in Task 4.**
2. **A member watching another's conversation while it changes:** a frame adds a question, a needs-you card, a plan to agree,
   or *Carry on*: the member sees each, read-only, **never** a box, an **[Answer]**, **[Agree]** or **[Carry on]**; an
   owner sees **[Stop]** and nothing else of the person's. Pressed by hand, our server says `404`. **Pinned in Tasks 2 and
   7.**
3. **An owner stops another's round while its person presses *Carry on*:** *Stop* is idempotent and records who; *Carry on*
   by its person after an owner's stop is allowed (their own), and waits in the line if another holds the app. Two owners
   stopping at once record one stop. **Pinned in Tasks 2 and 7.**
4. **A token's secret, once:** after **[Make it]** the secret is on screen, never sent to our server (`POST …/agents` carries
   the id alone), never in storage, gone at a reload; the no-credential scan finds no `mft_` in `minted`. **Pinned in Tasks 3
   and 11.**
5. **A question that expires, or is answered elsewhere, while its card is open:** **[Yes, once]** after 24 hours answers
   `409 PENDING_ACTION_RESOLVED`: the card says it stopped waiting, and the band forgets it at `expiresAt` without an event.
   **Pinned in Task 12.**

---

## File Structure

```
packages/server/src/
  api/sharing.ts               standingOf, mayRead, mayStop: pure                                     Task 2
  api/{conversations,events,apps,build}.ts   reads by standing; Stop by an owner; who started it      Task 2
  api/progress.ts              AppConversation.by, LineView.holder.by, the frame's byName,
                               RoundView.stopped, .sensitive; Needs 'detail'; Need 'agent-asks'      Tasks 2, 8, 9, 12
  store/{schema.sql,migrate.ts,db.ts,conversations.ts}   version 6: minted; personName            Tasks 2, 3
  store/minted.ts              the token ids: keep, list, forget                                     Task 3
  api/{project,apps}.ts        tokenId handed over beside a secret                                   Task 3
  api/minted.ts                GET /api/apps/:projectId/minted, POST /api/apps/:projectId/agents     Task 3
  keeping/keeper.ts            removals (event or re-read); pending actions heard                    Tasks 4, 12
  api/work-end.ts              endWork: Stop's body, shared by Stop, an owner's Stop and a removal   Tasks 2, 4
  store/runs.ts  api/round-state.ts   RunDetail.stopped, .sensitive                                  Tasks 2, 8
  build/round.ts  platform/source.ts  the sensitive fields; the new detail's stop                    Tasks 8, 9
  keeping/{emails,words}.ts    the question's email                                                  Task 12
  api/keeping.ts               needsOn: 'agent-asks'                                                  Task 12
  launch-actions.test.ts       members, tokens and pending actions: the page's alone                 Task 2
packages/web/src/
  platform/api.ts              addMember, removeMember, listTokens, listPendingActions,
                               confirmPendingAction, rejectPendingAction                             Task 5
  ours/api.ts                  tokenId handed over; minted, keepAgent                                Tasks 3, 5
  router.ts  app.tsx           People, Agents; Then 'people' | 'agents' | 'new-version'              Task 5
  screens/people/{people.tsx,model.ts}   People (moment 18)                                          Task 6
  screens/change/conversations.tsx  screens/building/*  screens/change/waiting.tsx   together         Task 7
  screens/building/kind.ts     the kind of change in words: pure                                     Task 8
  screens/building/needs.tsx   the new detail's card; Leave it out                                   Task 9
  screens/overview/new-version.tsx   Waiting to reach your students                                  Task 10
  screens/agents/{agents.tsx,model.ts,question.tsx}   Agents; their agent's question                 Tasks 11, 12
  screens/keeping/{lines.ts,needs.tsx}   the band's 'agent-asks'                                     Task 12
  words.ts
scripts/check-together.sh  scripts/check-together.ts                                                 Task 13
docs/walkthrough.md          moments 17, 18 and Throughout: the departures                           Tasks 6, 10, 11
```

---

## Task 1: Measure what reading could not settle (sitting 1, alone)

Throwaway code in the scratchpad (`scripts/walk/`'s `signIn` for the Node calls). **Run nothing in manifest**: read it.
**At Rich's word, in a window the running platform sitting gives**: our server in edge mode, said; `instructor` and
`colleague` (both may build) and `operator` (the administrator, for M2's approval); his yes to the walk typing the laptop
IdP's test passwords. **A launched app** is needed (M1, M2): `scripts/walk/keeping-7100.ts`'s `make` and `launch`, a slug
never used (`f6b-measure-1`), **a real repository on GitHub for Rich to delete**.

- [ ] **Step 1: M1** (a commit adding `sn` on the launched app; production registered by the administrator first): record
  `build.failed`'s frame as the conversation's token sees it; `getLaunchRecords` with that token, and the field naming the
  registered attributes; the laptop IdP's attribute list (`infra/idp/config/authsources.php`, read).
- [ ] **Step 2: M2** (a commit adding an `egress.allow` host): each commit's `sensitiveDiff`; `getLaunchReadiness` before
  and after `requestApproval`; the owner's `deploy` (`RELEASE_REESCALATED`), the administrator's approval, the owner's
  `deploy` with a step-up.
- [ ] **Step 3: M3** (`instructor` adds `colleague` as a helper, then makes them owner, then takes them off; then the
  reverse with our watch minted by `colleague`): every answer, the step-up's return, and what our keeper heard (its
  `history` rows).
- [ ] **Step 4: M4 and M5** (a token minted by `instructor` with `project:read`, `agent:session`, `source:write`):
  `addMember` with it; the frames on our watch's stream; `listPendingActions` in each session; `colleague`'s confirm and
  reject (as a helper); `instructor`'s confirm with the step-up; the retry. `listTokens` as `colleague`; `colleague`'s
  `revokeToken` of `instructor`'s token.
- [ ] **Step 5: Correct the plan** where a measurement disagrees, each marked **(S1)** in its task; record the sitting.
  **Commit** `docs: F6b sitting 1 — the measurements on 7100 (M1–M5) and the plan corrected (S1)`.

## Task 2: Sharing, on our server (sitting 2)

**Files:**
- Create: `packages/server/src/api/sharing.ts`, `sharing.test.ts`; `packages/server/src/api/work-end.ts`, `work-end.test.ts`
- Modify: `packages/server/src/api/{conversations,events,apps,build}.ts` (+ their tests), `api/progress.ts`,
  `store/{runs.ts,conversations.ts,db.ts}`, `api/round-state.ts`, `api/line-state.ts`, `launch-actions.test.ts`

**Interfaces:**

```ts
// api/sharing.ts — pure
export type Standing = 'own' | 'owner' | 'member' | 'stranger'
/** Its own person; else, for a conversation on an app, a kept member (an owner or not); else a stranger.
 *  An intake conversation (projectId null) is its own person's alone; no kept members: own only (as today). */
export function standingOf(
  conversation: Pick<Conversation, 'personId' | 'projectId'>,
  personId: string,
  members: KeptMember[],
): Standing
export const mayRead = (standing: Standing): boolean => standing !== 'stranger'
export const mayStop = (standing: Standing): boolean => standing === 'own' || standing === 'owner'
// store: any person's conversation, for the guard to judge; and a person's name for the page
conversationById(id: string): Conversation | undefined
personName(personId: string): string            // persons.display_name, else 'Someone'
// api/work-end.ts — Stop's body (build.ts:206-248), shared
export function endWork(deps: { store: Store; hub: Hub; rounds: Rounds; line: Line },
  conversation: Conversation, stopped: { by: string; why: 'stopped' | 'removed' }): void
// store/runs.ts RunDetail gains: stopped: { by: string; why: 'stopped' | 'removed' } | null   (default null)
// api/progress.ts
AppConversation gains: by: { id: string; name: string }
LineView['holder'] gains: by: string                       // the holder's person's name
Progress's state frame: conversation: Conversation & { byName: string }
RoundView gains: stopped: { name: string; why: 'stopped' | 'removed' } | null
```

- [x] **Step 1: Tests, failing first.**
  - **`standingOf`** (pure, every row): own; a kept owner; a kept collaborator; a stranger; no kept members (own only); an
    intake conversation read by a member of nothing (stranger), by its person (own).
  - **The routes, by standing** (a store with two people on one app, `alice` owner and `sam` helper, and `eve` outside):
    `GET /api/conversations/:id` and `…/events` for sam's conversation: alice `200`, eve **`404`**; `GET
    /api/apps/:projectId/conversations`: alice sees **both**, newest first, each with `by`; eve `[]`; **every change route**
    (messages, answers, plan, correction, agree, build, intake, names, blueprint, project) on sam's, pressed by alice:
    **`404 NOT_FOUND`**, nothing changed (Review Focus 2); **`POST …/stop` on sam's by alice (an owner): `202`**, the run
    `stopped` with `stopped: { by: alice, why: 'stopped' }`, the line released; by a helper on another's: `404`; twice:
    one stop (Review Focus 3); **sam's *Carry on* after alice's stop: `202`** (their own).
  - **The frame:** `byName` is the person's display name; `RoundView.stopped` names alice to a reader.
  - **Not shared** (§3): alice's `GET /api/needs` holds no *question* of sam's, and sam's *we need you* email goes to sam
    alone; an intake conversation of sam's (no project) is `404` to alice.
  - **The line:** `holder.by` is the holding conversation's person's name.
  - **`launch-actions.test.ts`:** `/v1/projects/{projectId}/members` (`POST`), `/v1/projects/{projectId}/members/{userId}`,
    `/v1/projects/{projectId}/tokens` (`POST`), `/v1/tokens/{tokenId}`, `/v1/pending-actions/{pendingActionId}/confirm`,
    `…/reject` are named nowhere in our server's source (the page's alone).
- [x] **Step 2: Red. Step 3: Implement** (`check` then `standingOf` with `store.members(projectId)` on each read route;
  change routes untouched; *Stop* by `mayStop`, through `endWork`).
- [x] **Step 4: Green; controls:** `mayRead` true for a stranger (red: eve reads); `mayStop` true for a member (red: sam
  stops alice's); the intake rule dropped (red). Each restored.
- [x] **Step 5: Commit** `feat(server): every member reads every conversation on an app; only its own person acts, and an owner may stop it (F6b D3)`.

## Task 3: The token ids, kept (sitting 2)

**Files:**
- Create: `packages/server/src/store/minted.ts`, `minted.test.ts`; `packages/server/src/api/minted.ts`, `minted.test.ts`
- Modify: `packages/server/src/store/{schema.sql,migrate.ts,db.ts}` (+ `db.test.ts`), `api/{project,apps}.ts` (+ tests),
  `app.ts`; `packages/web/src/ours/{api.ts,api.test.ts}`, `screens/making/token.ts` (+ test), **every caller of
  `ours.startChange`** (`grep -rn "startChange(" packages/web/src --include=*.tsx`: the change's ask, F5's *Talk it through*,
  F6's *What happened?*, the dry run's and trying-out's fixes), each test asserting the id sent

**Interfaces:**

```sql
-- store/schema.sql, version 6
create table if not exists minted (
  token_id text primary key,
  project_id text not null,
  person_id text not null references persons (id),
  purpose text not null check (purpose in ('conversation', 'privacy', 'agent')),
  conversation_id text references conversations (id),
  name text,                                    -- the token's own name, as minted (never a secret)
  expires_at text not null,
  minted_at text not null
);
create index if not exists minted_by_project on minted (project_id);
```

```ts
// store/minted.ts
export interface Minted { tokenId: string; projectId: string; personId: string; purpose: 'conversation' | 'privacy' | 'agent';
  conversationId: string | null; name: string | null; expiresAt: string; mintedAt: string }
keepMinted(row: Minted): void                         // idempotent on token_id
mintedOn(projectId: string): Minted[]
forgetMintedOf(projectId: string, personId: string): void
// api/project.ts and api/apps.ts: the bodies gain `tokenId?: string` (uuid) beside `token`; kept when present
// api/minted.ts (kept members only, else 404)
// api/progress.ts
export interface KeptTokens {
  ours: { tokenId: string; purpose: 'conversation' | 'watch' | 'privacy'; conversationId: string | null; title: string | null }[]
  agents: { tokenId: string; by: { id: string; name: string } }[]
}
GET  /api/apps/:projectId/minted  → KeptTokens
POST /api/apps/:projectId/agents  { tokenId: string; name: string; expiresAt: string } → 201 (purpose 'agent', minter the person)
// ours/api.ts: handProject(id, { projectId, token, tokenId }); startChange bodies gain tokenId;
minted(projectId: string): Promise<KeptTokens>
keepAgent(projectId: string, made: { tokenId: string; name: string; expiresAt: string }): Promise<void>
```

- [x] **Step 1: Tests, failing first.** The migration: version 6, `minted` made, an old database migrated with its rows
  (`db.test.ts`'s pattern, `it('is version 6')`); **the no-credential scan reads `minted`** and a row holding `mft_` is red;
  `POST …/project` and a change keep `{ tokenId, purpose: 'conversation', conversationId }`; a hand-over without `tokenId`
  keeps nothing and still works; `GET …/minted` for a member lists ours (the watch's from `watch_tokens`, a conversation's
  with its title) and agents with their minter's name; for eve `404`; `POST …/agents` with a body holding `token` or
  `secret` is **`400`** (zod strict: Review Focus 4); the page sends `minted.token.id` beside the secret on every
  hand-over (recording `Ours`).
- [x] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** the scan skipping `minted` (red); `POST …/agents`
  accepting an extra field (red). Each restored.
- [x] **Step 5: Commit** `feat(server,web): the ids of the tokens our page mints are kept, never a secret — ours told from theirs (F6b D5)`.

## Task 4: A removed member's work ends here (sitting 2)

**Files:**
- Modify: `packages/server/src/keeping/keeper.ts` (+ `keeper.test.ts`), `store/keeping.ts`, `app.ts`,
  `api/work-end.ts`, `api/keeping.ts` (+ tests)

**Interfaces:**

```ts
// keeping/keeper.ts: KeeperDeps gains
endWorkOf(projectId: string, personId: string): void   // app.ts: each of their conversations on the app through endWork
                                                       // ({ by: personId, why: 'removed' }), waiting/planning ones set aside,
                                                       // their conversation tokens dropped, store.forgetMintedOf
// the keeper calls it once per person: on member.removed (machineDetail.memberId), and when refresh()'s read
// no longer lists a kept member (Decision 5)
```

- [x] **Step 1: Tests, failing first** (the keeper's scripted stream, as F6's): `member.removed` for sam → sam's building
  round stopped `{ why: 'removed' }`, his waiting conversation set aside, his token dropped, his `minted` rows gone, **the
  line moves on**; **a re-read without sam and no event** (the FE-48 path: the hand-over after a `4401`) → the same, once;
  a re-read that still lists everyone → nothing; **sam's own `GET` of his conversation on that app → `404`**, alice's →
  `200` with `stopped.why: 'removed'`; **no *we need you* email to sam** for the round the removal stopped (Review Focus 1:
  `workEnded` skips a `removed` stop); F6's *who's on it changed* email still goes to the other owners, once.
- [x] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** the re-read path removed (red on the FE-48 test); the
  `workEnded` skip removed (red). Each restored.
- [x] **Step 5: Commit** `feat(server): someone taken off an app has their work here ended — on the event, or on the next read of its members (FE-48)`.

## Task 5: The platform's six calls, and *People* and *Agents* in the rail (sitting 3)

**Files:**
- Modify: `packages/web/src/platform/{api.ts,api.test.ts}`, **the sixteen typed `Platform` literals** (the web fact-check's
  list: `overview.test.tsx` ×2, `switching.test.tsx`, `students.test.tsx`, `change.test.tsx`, `put.test.tsx`,
  `plan.test.tsx`, `dry-run-press.test.tsx`, `going-live.test.tsx`, `live.test.tsx`, `sign-off.test.tsx`,
  `intake.test.tsx`, `preview.test.tsx`, `start-again.test.tsx`, `building.test.tsx`, `screens.test.tsx`), `router.ts`
  (+ test), `app.tsx`, `words.ts` (`preview.rail`), `overview.test.tsx`'s rail test (four items → six)

**Interfaces:**

```ts
// platform/api.ts: Platform gains (each change with an Idempotency-Key)
addMember(projectId: string, body: Schemas['AddMemberRequest'], idempotencyKey: string): Promise<Schemas['Member']>
removeMember(projectId: string, userId: string, idempotencyKey: string): Promise<Schemas['MemberList']>
listTokens(projectId: string): Promise<Schemas['TokenList']>
listPendingActions(projectId: string): Promise<Schemas['PendingActionList']>
confirmPendingAction(pendingActionId: string, idempotencyKey: string): Promise<Schemas['PendingAction']>
rejectPendingAction(pendingActionId: string, reason: string, idempotencyKey: string): Promise<Schemas['PendingAction']>
// router.ts
type Then = … | 'people' | 'agents' | 'new-version'
Route gains { name: 'app-people'; slug: string; then: Then } | { name: 'app-agents'; slug: string; then: Then }
// app.tsx: the rail's items gain People (icon 'people', '/people') and Agents (icon 'agent', '/agents'), after Going live
```

- [x] **Step 1: Tests, failing first.** Each call against the mock in-process (`api.test.ts`'s `withMock`): **what was
  sent** (method, path, body, `Idempotency-Key`), never what the mock answered; `confirmPendingAction` sends `{}` (the
  contract's `EmptyRequest`); `rejectPendingAction` sends `{ reason }`. The router: `/apps/x/people?then=people` and
  `/apps/x/agents?then=agents` parse, `then` kept only for its page; the rail draws six, *People* and *Agents* after
  *Going live*, the current one marked.
- [x] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** `removeMember` sending a body (red); `then=people` read on
  the Overview (red). Each restored.
- [x] **Step 5: Commit** `feat(web): the platform's member, token and question calls, and People and Agents in the rail`.

## Task 6: *People* (moment 18) (sitting 3)

**Files:**
- Create: `packages/web/src/screens/people/{people.tsx,model.ts,people.test.tsx,model.test.ts}`
- Modify: `app.tsx`, `words.ts` (`people`), `docs/walkthrough.md` (moment 18's departure: *"Anything they run elsewhere
  keeps its access until it expires"* goes; FE-11 landed)

**Interfaces:**

```ts
// screens/people/model.ts — pure
/** An `@` makes it an email; anything else a CWL login (trimmed; lower case is the platform's). */
export function whoOf(typed: string): { email: string } | { cwlLogin: string }
export function refusalWords(code: string): string | null   // the design's four (§2); null → F5's general refusal
// screens/people/people.tsx
export function People(props: { platform: Platform; ours: Ours; project: Schemas['Project']; me: Schemas['Me'];
  then: Then; expire: () => void; timeZone?: string }): JSX.Element
```

- [x] **Step 1: Tests, failing first** (a recording `Platform`; jsdom).
  - **The list:** each member's name, email, CWL login (absent when `null`), **Owner** / **Helper**, *(you)* beside `me`;
    the roles' sentence once; *"Students aren't on this list. They get in once it's live."*
  - **A helper** reads *"Only an owner can change who's on this list."*: no field, no **[Make …]**, no **[Take off]**.
  - **Add:** `sam@ubc.ca` sends `{ email, role }`, `sam` sends `{ cwlLogin, role }`; **Helper** is `collaborator`;
    someone already listed has their role changed by the same call.
  - **Make owner / Make helper** on a row: `addMember` with the new role.
  - **Take off:** asked in place, *"Take Sam off Reading responses? Their work on it stops."*, then `removeMember(userId)`;
    after it, *"Sam's work on Reading responses has stopped."*, and the list re-read.
  - **The step-up:** `STEP_UP_REQUIRED` keeps the typed name and role in `sessionStorage` (`manifest-app.people.<projectId>`)
    and shows F5's `StepUpCard` (`returnTo` `…/people?then=people`); back, *"You're signed in again."*, the form as left,
    the storage removed (Decision 15); **nothing pressed by itself**.
  - **Refusals, by code:** the four (§2), each with what is still true; `PROJECT_ARCHIVED` as F6's `PressNotice`; anything
    else F5's general refusal with its reference. `machineryIn` empty.
  - **Focus:** after a failed press, on the button again (m4's `useFocusBack`).
- [x] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** an `@`-less login sent as `email` (red); the storage
  left after the return (red). Each restored. **Walk it** (1440, 375): the list, add, make owner, take off, a refusal.
- [x] **Step 5: Commit** `feat(web): People — who can change it, adding a colleague and what that lets them do, and taking them off (moment 18)`.

## Task 7: Working on it together, on the page (sitting 3)

**Files:**
- Modify: `packages/web/src/screens/change/conversations.tsx`, `screens/describe/describe.tsx` (given `me`, and the role),
  `screens/building/{building.tsx,thread.tsx,work.tsx,needs.tsx}`, `screens/change/waiting.tsx`, `app.tsx`, `words.ts`
  (`together`), and their tests

**Interfaces:**

```ts
// screens/describe/describe.tsx: Describing gains props
me: Pick<Schemas['Me'], 'id'>; role: 'owner' | 'helper' | 'unknown'
// derived on the page: yours = frame.conversation.personId === me.id; mayStop = yours || role === 'owner'
```

- [x] **Step 1: Tests, failing first.**
  - **Conversations** lists everyone's, newest first, each *"Sam · Add a word count"*, yours marked *(you)*.
  - **Another's conversation** (building, paused, built, waiting): *"Sam started this. Only Sam can answer it or carry it
    on."*; **no message box; no [Answer], [Agree], [Carry on], [Try a different way], [Leave the line]**; each question with
    *"Only Sam can answer this."*; **an owner sees [Stop]** (when it holds the app), a helper nothing (Review Focus 2). A
    frame adding a question, a needs-you card or a plan while it is open adds no control.
  - **Stopped by:** *"Stopped by Alex."* when `stopped.by` is not the person; a removal: *"Sam was taken off Reading
    responses. Their work on it stopped."*
  - **The line:** *"Sam is working on it: Add a word count."* **[See it]** (a link to it); yours, as today.
  - `machineryIn` empty.
- [x] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** the message box drawn for another's (red); **[Stop]** for a
  helper (red). Each restored. **Walk it** (two tabs, two people, the mock: one conversation each).
- [x] **Step 5: Commit** `feat(web): every member sees every conversation, acts on their own, and an owner can stop one to free the app`.

## Task 8: The kind of change (moment 17) (sitting 4)

**Files:**
- Create: `packages/web/src/screens/building/{kind.ts,kind.test.ts}`
- Modify: `packages/server/src/platform/source.ts` (`Committed` gains `sensitive: string[]`), `build/round.ts`,
  `store/runs.ts`, `api/round-state.ts`, `api/progress.ts` (+ tests); `packages/web/src/screens/building/work.tsx`,
  `words.ts` (`building.kind`)

**Interfaces:**

```ts
// platform/source.ts: Committed gains  sensitive: string[]     // made.spec?.sensitiveDiff.fields ?? []
// store/runs.ts: RunDetail gains  sensitive: string[]          // the union over the round's commits (Decision 8)
// api/progress.ts: RoundView gains  sensitive: string[]
// screens/building/kind.ts — pure
export const SENSITIVE_WORDS: Record<string, string>   // the seven (the design's table)
export function kindWords(sensitive: string[]): string  // [] → straight to students; else "…because it changes <a, b and c>."
```

- [ ] **Step 1: Tests, failing first.** `source.commit` maps `sensitiveDiff.fields`; the round keeps the union (commit 1
  `egress.allow`, commit 2 none, commit 3 `services` → both, in the platform's order); `kindWords` for none, one, two, all
  seven and **an unknown field** (*"something reviewed at launch"*, never its name); **the work panel says it only on a
  launched app**, as soon as a commit names one, and again at the round's end beside *"Ready on your draft address"*;
  `machineryIn` empty over every combination (a property over the power set of the seven plus one unknown).
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** the union replaced by the last commit's (red); the kind
  said before launch (red). Each restored.
- [ ] **Step 5: Commit** `feat(server,web): a change after launch says which kind it is — straight to students, or an administrator's look first`.

## Task 9: A new detail: the stop, and **[Leave it out]** (sitting 4)

**Files:**
- Modify: `packages/server/src/build/round.ts` (+ test), `api/progress.ts` (`Needs`), `platform/` (the round's
  `getLaunchRecords` with its token; **(S1: M1)**); `packages/web/src/screens/building/needs.tsx` (+ test), `words.ts`
  (`building.needs.detail`, `details`)

**Interfaces:**

```ts
// api/progress.ts: Needs gains
| { kind: 'detail'; details: string[] }            // attributes our manifest asks for that production has not registered
// build/round.ts: a build.failed whose machineDetail.code is 'SPEC_ATTRIBUTE_NOT_REGISTERED' → needs 'detail' at once
// screens/building/needs.tsx: the card; [Leave it out] → ours.startChange(projectId, { words, token, tokenId }) seeded
//   (Decision 10), then ours.stop(id) on the stuck one, then navigate to the new conversation
```

- [ ] **Step 1: Tests, failing first.** The round: that code → `needs: { kind: 'detail', details: ['sn'] }` after **one**
  build (never three tries), from the manifest's `auth.attributes` minus the registered list, **never from the free-text
  `reason`** (a `reason` naming a different attribute changes nothing); another build failure → today's `tries`. The card:
  *"This change needs their last name from UBC's identity team, and they must agree to share it first. That may take several
  days."*, *"Manifest can't ask for it for you yet."*, **[Leave it out]** alone (nothing pretends to ask); two details
  joined; an unknown one in its generic words; the press sends the seeded words and the new token's id, then stops the
  stuck one; `machineryIn` empty. **The building screen's needs switch** draws it (ORIENTATION §7: a new kind draws nothing
  until its card is added).
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** the code ignored (red: three tries); the reason parsed
  instead (red on the test whose reason names another). Each restored.
- [ ] **Step 5: Commit** `feat(server,web): a change that needs a new sign-in detail stops and says so — Leave it out, until FE-47`.

## Task 10: *Waiting to reach your students* (moment 17) (sitting 4)

**Files:**
- Create: `packages/web/src/screens/overview/{new-version.tsx,new-version.test.tsx}`
- Modify: `screens/overview/overview.tsx`, `screens/going-live/{live.tsx,sign-off.tsx}` (exports only; `Then`'s
  `new-version` is Task 5's), `words.ts` (`overview.newVersion`), `docs/walkthrough.md` (moment 17's departures: *"That takes
  weeks"* → *"That may take several days"*; the new detail through LTIC, **[Leave it out]** until then; the students' press
  in *Waiting to reach your students*)

**Interfaces:**

```ts
// screens/overview/new-version.tsx
export function NewVersion(props: { platform: Platform; ours: Ours; project: Schemas['Project'];
  readiness: Schemas['LaunchReadiness']; production: Schemas['Environment']; role: 'owner' | 'helper' | 'unknown';
  arrived: boolean; expire: () => void; now: () => Date; timeZone?: string; onChanged: () => void }): JSX.Element | null
// null unless launched and candidateReleaseId differs from production's served release (Decision 11)
```

- [ ] **Step 1: Tests, failing first.** Drawn only when launched and the versions differ (a launched app with the same
  version: nothing; before launch: nothing, *Going live* has it); the two facts (*"The version from 3 October is on your
  trying-out address. Your students have the version from 18 September."*); **self-serve, an owner:** F5's press (its
  step-up to `?then=new-version`, its stations, *"Your students have the version from 3 October."*); **a helper:** *"An
  owner lets your students have it."*, no press; **re-escalated:** the fields in words (Task 8's `SENSITIVE_WORDS`) and
  F5b's **[Ask a Manifest administrator to sign this off]** (its note, its asked row), no deploy press (**(S1: M2)**: read
  `reescalated`, never `sensitiveFields`, which stays non-empty after the approval and the press); **another item
  unmet:** its row's words and **[Going live]**; **a failed deploy:** *"Your students still have the version from 18
  September."* and F5's **[What went wrong]**; `RELEASE_REESCALATED` met at the press: the panel read again;
  `machineryIn` empty.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** the press shown to a helper (red); the press shown while
  re-escalated (red). Each restored. **Walk it** with the mock's stages (`MANIFEST_MOCK_LAUNCHED=1` with `_RECORDS=approved`;
  re-escalated by DevTools' rewrite of the readiness, as F5b's walks did).
- [ ] **Step 5: Commit** `feat(web): Waiting to reach your students — a launched app's new version, let through by its owner, or asked about first (moment 17)`.

## Task 11: *Agents*: ours and theirs, and an agent of their own let in (sitting 5)

**Files:**
- Create: `packages/web/src/screens/agents/{agents.tsx,model.ts,agents.test.tsx,model.test.ts}`
- Modify: `app.tsx`, `words.ts` (`agents`), `docs/walkthrough.md` (*Throughout*: ours told from theirs by the ids we keep)

**Interfaces:**

```ts
// screens/agents/model.ts — pure
export const CAPABILITY_WORDS: Record<string, string>         // the eleven mintable (Words proposed)
export function capabilityWords(capabilities: string[]): string[]   // unknown → its name, never dropped
export interface Row { token: Schemas['Token']; ours: { what: 'conversation' | 'watch' | 'privacy'; title: string | null;
  conversationId: string | null } | null; minter: { id: string; name: string } | null }
/** Active only (not revoked, not expired); ours by the kept ids; an agent row's minter when we minted it. */
export function rowsOf(tokens: Schemas['Token'][], kept: KeptTokens, now: Date): Row[]
// screens/agents/agents.tsx
export function Agents(props: { platform: Platform; ours: Ours; project: Schemas['Project']; me: Schemas['Me'];
  role: 'owner' | 'helper' | 'unknown'; then: Then; expire: () => void; now?: () => Date; timeZone?: string }): JSX.Element
```

- [ ] **Step 1: Tests, failing first.**
  - **The list** (`listTokens` and `ours.minted`): expired and revoked not listed; **ours** named *"Working on 'Add a word
    count'"* (a link to it), *"Keeping watch"*, *"Suggesting privacy answers"*, with *"These are ours. They end with their
    conversation, or with the app."* and **no [Revoke]**; **theirs**: the name, what it may do in words, *"Last used …"* /
    *"Never used"*, *"Stops working …"*.
  - **[Revoke]:** on a token we minted for `me` (Decision 4), and on any token we did not mint (FE-49); one minted by
    someone else here: *"Only the person who made it can revoke it."* and no press; **a `404` at the press says the same**
    (**(S1: M5)**: an owner's press on a helper's token is `404` too); a success re-reads the list. **Before the revoke,
    [Revoke] answers *no* to that token's `pending` questions** (Decision 16, **(S1: M4)**), then revokes.
  - **Let an agent of your own in:** a name; each mintable capability a checkbox in words; 7, 30 or 90 days; **[Make it]**
    → `mintToken` with exactly what was chosen, then `ours.keepAgent({ tokenId, name, expiresAt })` **with no secret** (Review
    Focus 4); the secret shown **once**, in mono, **[Copy]**, *"This is the only time we can show it. Keep it somewhere
    safe."*, a link to how an agent uses it; **nothing in `localStorage` or `sessionStorage`** after it; a re-render from a
    reload shows no secret.
  - `machineryIn` empty (the secret and the token's own name in `.mono` excluded, as hostnames are).
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** the secret sent to `keepAgent` (red); a revoked token
  listed (red). Each restored. **Walk it** (1440, 375): the list, a mint, the secret's copy, a revoke.
- [ ] **Step 5: Commit** `feat(web): Agents — ours and theirs told apart, revoke what's yours, and let an agent of your own in`.

## Task 12: Their agent's question (sitting 5)

**Files:**
- Create: `packages/web/src/screens/agents/{question.tsx,question.test.tsx}`
- Modify: `packages/server/src/keeping/{keeper.ts,happenings.ts,emails.ts,words.ts}` (+ tests), `store/minted.ts` (the
  name), `api/keeping.ts` (`needsOn`), `api/progress.ts` (`Need`); `packages/web/src/screens/keeping/{lines.ts,needs.tsx}`
  (+ tests), `screens/agents/agents.tsx`, `words.ts` (`agents.question`, `keeping.band.agent`), `docs/walkthrough.md`
  (*Throughout*: their agent's question is in F6's band and emailed once)

**Interfaces:**

```ts
// api/progress.ts: Need gains
| { kind: 'agent-asks'; app: AppRef; pendingActionId: string; tokenId: string; action: string;
    at: string; expiresAt: string; owner: boolean }                    // expiresAt = at + 24 h (Decision 14; (S1: M4))
// needsOn: from history — pending_action.created with no .confirmed/.rejected for its pendingActionId, not past expiresAt
// the keeper: one email per pending action to the app's owners (kind 'waiting'), the token named by minted.name or 'An agent'
// screens/agents/question.tsx
export function Question(props: { platform: Platform; action: Schemas['PendingAction']; tokenName: string | null;
  role: 'owner' | 'helper' | 'unknown'; arrived: boolean; now: () => Date; timeZone?: string; onAnswered: () => void }): JSX.Element
export const ACTION_WORDS: Record<string, (app: string) => string>   // the four (Words proposed); unknown → summary
```

- [ ] **Step 1: Tests, failing first.**
  - **The keeper:** `pending_action.created` → a need for every member (`owner` true for owners); one email to each owner,
    keyed by the pending action, its subject and body (*Words proposed*), never to a helper; a replay sends nothing again;
    `.confirmed`, `.rejected`, or `expiresAt` passed → the need gone (Review Focus 5: no event needed for expiry).
  - **The band:** *"Reading responses: your agent is asking something."* **[Agents]**; **on a switched-off app it goes**
    (`needsStillTrue` keeps only questions of ours; a switch-off revokes every token, so nothing can be confirmed).
  - **The card** (top of *Agents*, from `listPendingActions`, `pending` only, filtered on the page: the operation takes no
    `?state=` **(S1: M4)**; **and only a question whose token is still active**, Decision 16): *"Your agent 'Claude Code' asked to change
    who's on Reading responses."* (its name joined from `listTokens`; `null` → *"An agent"*); *"It didn't say who. If you're
    not sure, say no."*; *"Yes lets it try that one request once."*; *"It stops waiting at 4:12pm."*; **[Yes, once]** ·
    **[No]**, *"Tell it why"* (a textarea, `FieldCount` to 500, never `maxLength`).
  - **[Yes, once]:** `confirmPendingAction`; `STEP_UP_REQUIRED` → F5's `StepUpCard` to `…/agents?then=agents`, back *"You're
    signed in again."* and the same card; **[No]:** `rejectPendingAction` with the words typed, or *"No reason given."*
    (Decision 13); **`PENDING_ACTION_RESOLVED`:** *"It has stopped waiting."* and the list re-read (**(S1: M4)**: the platform
    answers it when someone has already answered, *"this pending action was already confirmed"*; the words are Rich's to
    sharpen); **a helper:** *"An owner answers this."*, no presses (FE-50 **(S1: M4)**: a helper's confirm and reject are
    `403 FORBIDDEN` **even for their own agent's question**, before any step-up).
  - `machineryIn` empty over the four actions and an unknown one.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** an email to a helper (red); an expired question still in
  the band (red); `reject` with an empty reason (red). Each restored. **Walk it.**
- [ ] **Step 5: Commit** `feat(server,web): their agent's question — in the band, emailed once, and answered on Agents`.

## Task 13: The acceptance (sitting 6, alone)

- [ ] **Step 0:** the platform's landings; re-read `openapi.json`.
- [ ] **Step 1: Against the mock and Mailpit.** `scripts/check-together.sh` (our API as the browser drives it, curl, two
  sessions of the mock's) and `scripts/check-together.ts` (the keeper in-process, F6's way):
  1. **Sharing:** two people on the mock's app (our `members` seeded through the keeper's hand-over); each reads the other's
     conversation; each change route on the other's is `404`; an owner's *Stop* frees the app, recorded; a stranger `404`.
  2. **Token ids:** a hand-over with `tokenId` kept; `…/minted` lists it; `POST …/agents` with a secret `400`; **no `mft_`
     and no `sk-` in any table**.
  3. **Removals, in-process:** `member.removed` ends the work; a re-read without them ends it once; no email to them.
  4. **Their agent's question, in-process:** `pending_action.created` → the need, **one email per owner** in Mailpit (our
     subjects), none to the helper; `.confirmed` → gone; our messages deleted from the shared inbox by id.

  **Negative controls, each red on its own check:** a helper's write to another's allowed; a secret kept in `minted`; the
  re-read path removed; an email to the helper.
- [ ] **Step 2: The whole-branch review** (a fresh reviewer, the most capable model, read-only, dispatched at the sitting's
  start so its fixes land before the real platform), its findings fixed test-first.
- [ ] **Step 3: On the real platform** (at Rich's word, in the platform's window; our server in edge mode, said; `instructor`
  and `colleague`; `operator` for the administrator's look). A walk with `scripts/walk/` (a new `together-7100.ts`, built as
  `keeping-7100.ts` is, step by step, its first run its proof): `colleague` added as a helper (step-up typed by the walk at
  Rich's word); `colleague`'s conversation read by `instructor` and stopped; a sensitive change (an `egress.allow` host)
  asked about, approved by `operator`, then let through by `instructor` with the step-up; an agent of `instructor`'s own
  minted on *Agents*, its `addMember` asked, the band and the email, answered **[No]**; `colleague` taken off, their work
  ended; every email in Mailpit word for word.
- [ ] **Step 4: Rich's click**, with two people: a colleague added as a helper; the owner reading the helper's conversation
  and stopping it to free the app; a change that needs an administrator's look asked about and then let through to
  students; their own agent's question answered (the design's *Success*).
- [ ] **Close:** the gates twice; the dated entry; this table; ORIENTATION; the roadmap. **F6b is executed only when Step 4
  is done.**

## Task 14: **[Ask for it]** (FE-47) (sitting 7; waits for FE-47)

**Written in full at sitting 7's Step 0**, when FE-47 has landed and its names are the platform's (as F5b's part two is
written against FE-46): its Files, Interfaces and tests then, each test of Task 9's card kept and extended. What it builds,
from the design's §1: **[Ask for it]**
in the person's session; the card waits in F5b's words (*"With the Manifest team · sent 5 October · waiting 2 days"*, then
*"With UBC's identity team…"*); the keeper's `iam_registration.recorded` with the detail registered → *"UBC's identity team
agreed. We can carry on."* **[Carry on]**, and F6's *a long wait is over* email. **[Leave it out]** stays beside it. The walk; the commit `feat(web): a new sign-in detail asked for through the Manifest team — FE-47`.

## Task 15: The question names who (FE-5 (a)) (sitting 7; waits for FE-5 (a))

**Written in full at sitting 7's Step 0**, when FE-5 (a) has landed and its field is named. What it builds: the card names
who and what role, or which version and where, from the platform's
field; the honest line *"It didn't say who."* goes when the object is there, and stays when it is absent (an older
question), tested as Task 12's card is, with the object present and absent. The commit `feat(web): their agent's question says who, or which version — FE-5 (a)`.

---

## What this plan does not build

- **Inviting someone who has never signed in** (the walk-through: deliberately), and **TAs** until the platform's *who may
  build* includes them (F4a's D7).
- **A helper leaving by themselves**, and **transferring ownership as one action** (an owner adds another owner, then takes
  themselves off).
- **Editing another person's conversation**, or answering its questions (D3).
- **Revoking our own tokens from *Agents*** (they end with their conversation or the app), or **someone else's** (FE-11's
  option (b), not chosen: an owner takes the person off instead).
- **What their agent does with its token** beyond the four limits: the platform's.

---

## What executing this plan found

### 2026-10-02 — The plan written (session `manifest-app-c0`, documents only)

- **Why now:** F6 executed the same day (D1); Rich's word for this plan next (*"sure, please do"*), while the platform runs
  its sitting 12 on 7100 (no platform needed to write it).
- **The contract read for it** (three read-only fact-checks: the contract and the control plane at `6c77c15`, our server,
  our page): **most of the design's five measurements are answered by reading** (*What the contract says*), and what is
  left is sitting 1's. Facts that moved the design's words or this plan's shape:
  - `addMember` **changes** a role (no separate operation, no `member.role_changed`): **Make owner / Make helper** is
    `addMember`;
  - **a token names no minter** (**FE-49**), and **who answers a question: the docs and the code disagree** (**FE-50**);
  - the new detail's refusal is **`build.failed`'s `SPEC_ATTRIBUTE_NOT_REGISTERED`**, after `startBuild`'s `202`, with the
    attributes only in free text: the round names them from its own manifest (Decision 9);
  - **removing our watch's minter closes the stream before `member.removed`** (FE-48): the re-read is a second signal
    (Decision 5);
  - **rejecting needs a reason** (Decision 13); a question waits **24 hours**; confirming asks a step-up, rejecting never.
- **Rich approved it the same day** (*"plan approved, we'll do it native"*), and a new session took sitting 2 at once
  (7100 was the platform's sitting 12's). **Still for Rich, at each sitting:** the *Words proposed*; Decisions 2, 3, 5, 10, 11, 13 and 14 (each says what it rejected and
  what changing it costs); FE-49 and FE-50 (written, not carried); the execution method.

### 2026-10-02 — Sitting 2: our server (Tasks 2, 3, 4) (session `manifest-app-b8`, mock mode, natively)

**At Rich's word** (*"yes, start F6b sitting 2"*), beside the platform's sitting 12 (`manifest-5a`, which held 7100
throughout and announced its holds; nothing of ours touched 7100). Executed with superpowers:executing-plans, one ledger
(`.superpowers/sdd/2026-10-02-f6b-working-together/progress.md`, git-ignored: every ruling with its cost).

- **What landed:**
  - **`a751003`, Task 2 (D3):** `api/sharing.ts`'s pure `standingOf` (own · owner · member · stranger) and `reachable`:
    a conversation, its stream and an app's list read by every kept member; every change its own person's; Stop an
    owner's too, through `api/work-end.ts`'s `endWork` (Stop's body, shared). `RunDetail.stopped { by, why }`;
    `RoundView.stopped { name, why }`; `AppConversation.by`, the state frame's `byName`, `LineView.holder.by`.
    `launch-actions.test.ts`: no member, token or pending-action write named anywhere in our server.
  - **`2e3a21a`, Task 3 (D5):** store **version 6**, `minted` (`store/minted.ts`): each token's id, app, minter,
    purpose and conversation, never a secret, forgotten with the app. The page sends `tokenId` beside every secret it
    hands over (Make it, a restart's, a change, each fix, *Talk it through*, *What happened?*);
    `GET /api/apps/:projectId/minted` and `POST /api/apps/:projectId/agents` (exactly `{ tokenId, name, expiresAt }`);
    the page's `ours.minted` and `ours.keepAgent`, ready for sitting 3.
  - **`144d513`, Task 4 (Decision 5, FE-48):** the keeper keeps the members whole and says once who was taken off
    (`Keeper.onRemoved`), on `member.removed` (the other owners told first) or when a read of the members no longer
    lists someone kept (a hand-over after a `4401`, a reconnect, the boot); `buildServer` ends their work as Stop does,
    recorded `removed` (theirs waiting first), drops their conversations' tokens and forgets their token ids.
  - **`2169b13`, the review's I1 and I3** (below); **`32887f1`**, a flake met at the close (below).
- **Gates:** `pnpm test` **2386 tests, 97 files, twice**; lint, typecheck, format clean. **The six acceptance scripts pass
  in mock mode from a fresh dev database**, at `144d513` and again after the fixes (`check-seeing` 8, `check-going-live` 8,
  `check-slice` 8, `check-describing` 18, `check-building` 12, `check-keeping` 8 + 12). **The migration** 5 → 6 opened a
  copy of F6's walk database (version 5: three members, a sealed watch, a run) with every row kept and `minted` made.
- **Negative controls** (each red, then restored): `mayRead` true for a stranger (4 red); `mayStop` true for a member
  (2); the intake rule dropped (1, the pure test: the routes are also held by `reachable` giving an intake no members); a
  source naming `/v1/tokens/{tokenId}` (1) or POSTing members (1); the no-credential scan skipping `minted` (3); `POST
  …/agents` without `.strict()` (2); the keeper's re-read path removed (2); `workEnded` emailing a stopped round (1); a
  person always `own` (3); `Hub.watched` ignoring whose page it is (1).
- **Decided in executing (each in the ledger with its cost):**
  - `RoundView.stopped` is null when a round's own person stopped it: Decision 6 says *"Stopped by Alex."* only for
    another's, and the plan's `{ name, why }` carries no id to compare (see m77).
  - `minted.expires_at` may be null: the hand-over carries the token's id alone, so our server knows only an agent's
    expiry. A row or an agent's name shaped like a credential is refused (as the trace's is). `tokenId` must be a uuid
    (the contract's `Token.id`), required on the page and optional on our server (an old page's hand-over still works).
  - **The keeper says who was taken off through `Keeper.onRemoved`**, which `buildServer` registers, not the plan's
    `KeeperDeps.endWorkOf`: main.ts makes the keeper before `buildServer` makes the rounds and the line.
  - **Someone taken off is a stranger to their own conversations on the app on every route** (reads, changes, Stop),
    not only reads, and their list of the app's conversations is empty: otherwise a message on their built conversation
    would join the line with no token and hold the app.
  - No `workEnded` skip was needed: a round stopped `removed` has the chip `notyet`, so nothing emails it (pinned).
  - No separate `work-end.test.ts`: every branch of `endWork` is driven through the Stop route and the removal.
- **The whole-sitting review** (a fresh reviewer, `af8983c..144d513`): **no Critical**; it found no route the standing
  rule missed.
  - **I1, fixed** (`2169b13`): since every member may hold a conversation's stream, a colleague reading it silenced its
    person's *we need you* and *we've finished* (F6 Decision 14 counted any listener). `Hub.watched` now asks whose page
    it is. The plan's *"sam's email goes to sam alone"* test, missed in Task 2, is written.
  - **I3, fixed** (`2169b13`): someone taken off kept hearing every frame on a stream they had open. A stream now re-checks
    its reader before each frame and ends, as the platform ends their browser streams.
  - **I2, carried with m69 (for Rich): a departure from Review Focus 1.** Someone taken off while a round of theirs is in
    flight is usually emailed *we need you* first: the platform revokes their token before it publishes `member.removed`,
    so the round ends needs-you and is emailed before our removal stops it. The fix is m69's own (a short hold and a
    re-check at send time), which is Rich's to choose: **m76** in [`minors.md`](../minors.md).
  - **Ten minors, m77–m86** in [`minors.md`](../minors.md). **m77 wants deciding before sitting 3 draws them**:
    `LineView.holder.by` and `RoundView.stopped` carry a name and no id.
- **A flake met at the close** (`32887f1`, test only): *the app's conversations* read `conversationsOn`'s call as soon as
  the heading was drawn, before the effect that asks it (1 run in 12 under the platform's load); now read once the list
  it fills is there, 16 in 16 (§7's trap).
- **For Rich:** I2/m76 (above); m77 before sitting 3; **someone added since our last read of the members meets 404 on
  their own new change** until the keeper reads them again (`member.added`, a reconnect, a hand-over: normally seconds;
  m82 says how to close it); Decision 5's rule is made from kept members, as D3's reads are.
- **For sitting 3:** the page's `Ours` has `minted` and `keepAgent`; the state frame's `conversation.byName`,
  `AppConversation.by`, `LineView.holder.by` and `RoundView.stopped` are there to draw; **in mock mode every mint answers
  the mock's one token id** (`77777777-…`), so `minted` keeps only the first (the watch shares it): a walk of *Agents*
  rewrites `listTokens` and `…/minted`, as F6's walks rewrite `…/keeping`.
- **The platform:** its sitting 12's text-only contract change (`f619376`: `IamRegistration.registeredAt`'s description;
  1.5.0, 72 operations) adopted with no change of ours; our Vitest held across its regeneration at `manifest-5a`'s word.
- **The machine:** our server in **mock mode** on a fresh dev database (version 6), restarted twice for the acceptance; the
  databases before kept in `.data/`: `app-before-f6b-s2.sqlite` (the session's start), `app-f6b-s2-first-acceptance.sqlite`.

### 2026-10-02 — Sitting 3: the page (Tasks 5, 6, 7) (session `manifest-app-b8`, mock mode, natively)

**At Rich's word** (*"yes, start sitting 3 with the ids for m77"*). The platform's sitting 12 held our Vitest through its
tier and closing tests (`manifest-5a`), then **closed at `d5c76d5`: the launch path plan is EXECUTED** (contract 1.5.0,
72; one text-only change, `f619376`; 7100 left empty, on real GitHub). Nothing of ours touched 7100.

- **What landed:**
  - **`9502d7c`, m77 (Rich's word):** `LineView.holder.by` and `RoundView.stopped.by` carry `{ id, name }`; our server
    says who stopped any stopped round with a record, and the page judges whose (sitting 2's null for an own Stop goes).
  - **`005a552`, Task 5:** `Platform`'s `addMember`, `removeMember`, `listTokens`, `listPendingActions`,
    `confirmPendingAction` (`{}`), `rejectPendingAction` (`{ reason }`), each asserted by what it sent; `/apps/:slug/people`
    and `/apps/:slug/agents` with their own `then`, the Overview's `new-version`; **People in the rail after Going live;
    Agents joins it with its page** (sitting 5: no link to an empty page between sittings).
  - **`1559bc6`, Task 6, *People* (moment 18):** the list (name, email, CWL login when released, Owner or Helper,
    *(you)*), the roles said once; an owner adds (an `@` an email, else a CWL login), makes owner or helper (`addMember` by
    PUID), takes someone off (asked in place); a helper reads why not; the second sign-in back at `?then=people` with the
    form as left; the design's four refusals. Moment 18's sentence FE-11 made untrue, gone from the walk-through.
  - **`842a403`, Task 7, working together (D3, §3):** the list names who started each, theirs *(you)*; another's
    conversation read-only under *"Sam started this. Only Sam can answer it or carry it on."* (no box, no answer, no Carry
    on, Agree, Not quite, Not now or Leave the line; *"Only Sam can answer this."*); an owner's Stop where it holds the
    app; *"Stopped by Alex."*, a removal's sentence; the line's *"Sam is working on it: …"* and **[See it]**. The page
    mints and hands over nothing for another's, and leaves its stream's refusals to its own person's page.
  - **`3912ff3`, the review's fixes** (below).
- **How it was built:** the tests were written first while the platform held our Vitest; once free, each commit was
  rebuilt from `HEAD` in order and each task watched red without its implementation, then green, the tree checked byte
  for byte against the snapshot after. **Controls** (each red, restored): `removeMember` with a body; the Overview reading
  `then=people`; a login sent as an email; the storage left after the return; the message box drawn for another's; Stop
  for a helper; and, at the review, each of PlanScreen's two guards removed.
- **Walks** (Chrome, `scripts/walk/`, 1440 and 375): *People* 33/33 (the list, add, make owner, take off, a refusal;
  `listMembers` and its changes answered by the walk); **two people on one app** 39/39 (a second person and their
  conversation seeded into the dev database with the app's kept members: the list, a wait behind them, theirs read as an
  owner and as a helper, and the owner's Stop through our server saying who). **One defect found and fixed** test-first
  before Task 7's commit: another's wait was said as *"waiting for you"* / *"Needs you"* / *"What you asked for"*.
- **The whole-sitting review** (a fresh reviewer, `a084ca7..842a403`): **no Critical**; nothing presses or mints for
  another's conversation. **Fixed in `3912ff3`, each test-first:**
  - **I1/I2:** a colleague read sentences meant for the conversation's person (the thread's *"You"*, a plan's *"only
    you know"* and its lead, a wait's *"What you asked for"*, the needs cards' allowance and Carry on, the cost's *"left
    this month"*); and a finished conversation's unanswered question said *"Only Sam can answer this."*. Now named for
    its person (*"It's waiting for Sam."*), and what we went with.
  - **I3:** a change set aside by an owner's Stop or a removal said nothing of who: **our server now keeps it with the
    change** (`{ kind: 'set-aside', change, by, why }`, folded into `Piece.stopped` and `PieceView.stopped`), and the
    page says *"Stopped by Alex."* or the removal's sentence.
  - **I4:** *People* kept the focus after each press (a row's button again, *Take off* after *Keep them*, the status after
    a removal), its status in the page from the start, an add and a role change said.
  - **I5, FE-48's page half:** after a removal, *People* looks at our watch again (`ensureWatch`), now and 5 s later: if
    the one taken off minted it, a new one reads the members afresh and ends their work here.
  - **M8, re-graded Important:** an owner may take themselves off (their own row's *Take off*, its own words, then *Your
    apps*): the design's hand-over is *"an owner adds another owner, then takes themselves off"*, which sitting 3's first
    ruling had made impossible.
  - **I6:** PlanScreen's two guards for another's conversation (a refused token on its stream; its app being made)
    pinned, each control red.
  - **Ten minors, m87–m96**, in [`minors.md`](../minors.md).
- **Decided in executing (each in the ledger with its cost):** *Agents* joins the rail with its page; no trying-out press
  at the end of another's built round (the Preview still has it); an owner's Stop on another's plan only for a change; the
  conversation page reads the reader's role itself (`/new/<id>` has no app looked up); only the add form is kept across the
  second sign-in; the list read again after every change.
- **Words for Rich** (each marked *ours* in `words.ts`): *People*'s *"Add someone"*, *"What they can do"*, *"CWL login
  <x>"*, *"Changing…"*, *"Take them off"*, *"Keep them"*, *"<Name> can work on <App> now."*, *"<Name> is an owner now."* /
  *"…a helper now."*, *"Take yourself off <App>? Your work on it stops."*, *"Take me off"*; together's *"Paused, waiting
  for Sam"*, *"Needs Sam"*, *"What Sam asked for"*, *"It's waiting for Sam."*, *"Two things only Sam knows"*.
- **For sitting 4** (moment 17): it needs sitting 1's measurements (M1, M2) on 7100, now free at Rich's word. **For
  sitting 5:** the page's `listTokens`, `listPendingActions`, `confirmPendingAction` and `rejectPendingAction` are
  ready; the router's `/agents` draws the unknown page until then; mock mode mints one token id for everything.
- **The machine:** our server in **mock mode**, restarted for each acceptance run; the walks' databases kept in `.data/`
  (`app-f6b-s3-walks.sqlite`, `app-f6b-s3-walks-2.sqlite`, with the seeded second person).

### 2026-10-02 — Sitting 1: the measurements on 7100 (Task 1) (session `manifest-app-30`, edge mode, natively)

**At Rich's word** (*"Go: F6b sitting 1"*; the walk types the laptop IdP's test passwords; F5b's sitting 1 its own,
later). **The window was `manifest-96`'s** (the platform's new session, no work of its own: no restart, tier, verify,
truncation or cleanup until we closed it). 7100: `37b223d`, real GitHub, its database empty at the start. Our server in
**edge mode** for the sitting (the mock-mode database kept as `app-before-f6b-s1.sqlite`, restored at the close).
**Operator's admin grant:** `manifest-96`'s permission classifier refused it; **Rich ran it himself** (the second time with
the script's absolute path: the first ran where the script is not, and never reached the database). Neither session
routed around the refusal. M3–M5 ran while it waited (`52a1717`).

- **The app:** `f6b-measure-1` (instructor's; **a real private repository, `Manifest-local-dev/f6b-measure-1`, for Rich to
  delete**), made, built, on trying-out, then launched by the walk's `launch` (records, the owner's dry run, the sign-off,
  the owner's press): live at 04:32Z, then its second version (M2) live at 04:36Z. Left live; our *Keeping watch* the one
  active token on it.
- **M1** (Decision 9, Task 9): **one line of the plan was wrong**: `auth.attributes` is **not** free strings: the platform
  accepts five (`ubcEduCwlPuid`, `mail`, `givenName`, `sn`, `eduPersonAffiliation`) and refuses any other **at the commit**
  (`422 SPEC_INVALID`, `SPEC_ATTRIBUTE_NOT_WHITELISTED`). The proof-app starter asks all five, so the unregistered detail
  was made by **the registration** (recorded without `sn`, then the round's commit adding it): the commit `201`, the
  build `failed` at once, and **`build.failed` on the conversation token's stream with `machineDetail { code:
  'SPEC_ATTRIBUTE_NOT_REGISTERED', reason, buildId }`**; **`getLaunchRecords` answers the conversation token**, its field
  **`iamRegistration.registeredAttributes`**. Put back after.
- **M2** (Decisions 8 and 11, Task 10), end to end: each commit's `sensitiveDiff` is its own (`egress.allow`; a README
  none; `egress.allow` again); on trying-out `reescalated`, `admin-approval` unmet; **the owner's press: the step-up first,
  then `409 RELEASE_REESCALATED`**; the owner's `requestApproval` `200`, no step-up; the administrator's approval (its own
  step-up); the press again `200`. **`sensitiveFields` stays `['egress.allow']` after the approval and the press**: the
  panel reads `reescalated`. The conversation token's production deploy is a pending action (`release:promote`).
- **M3** (Decision 5, Task 4, *People*): the step-up returns to `?then=people` exactly; every refusal's code and hint as the
  design words them; **`removeMember` of a non-member is `200`, unchanged**; in `member.*`, `userId` is who did it and
  `memberId` whom. **FE-48 seen live**: a removal closes the person's token stream `4401` (*"the token was revoked"*) and
  session stream `4404` before `member.removed`; with our watch theirs, our keeper wrote `keeping.stopped`, and **the next
  member's hand-over replayed `member.removed`** and dropped them. *People* matches every code measured.
- **M4** (Decisions 13, 14, Task 12): `TOKEN_ACTION_PENDING` and the pending action as read; the events reach our watch and
  our history (`.confirmed`/`.rejected` with `resolvedBy`); a watch token's list is `[]`; no `?state=` filter. **FE-50:
  the code's rule**: a helper cannot answer, **even their own agent's question**; an owner answers any. The owner's confirm
  asks a step-up, a reject never; a reason is required. **FE-51** (new): the retry after a yes is matched by its body, not
  the key the hint names. **FE-52** (new): a revoked agent's question stays `pending` and a yes to it does nothing:
  **Decision 16** (ours) asks only about an active agent's, and our [Revoke] answers *no* first.
- **M5** (Decision 4, Task 11): a helper lists every minter's tokens; **only the minter revokes, an owner included**
  (`404`). FE-49 as written.
- **Found:** **m97** (ours, seen live): the history names people from today's members, so someone taken off becomes
  *"someone"* in every line about them. **FE-51, FE-52** (written, not carried). The platform's `why` mixes a Vancouver
  date (*"asked … on October 2, 2026"*) with UTC ones (*"approved it on 2026-10-03"*): its text; we draw our own.
- **The plan corrected**, each marked **(S1)**: *What the contract says* (members, tokens, pending actions, a change after
  launch, M1's catalogue), Decisions 5, 9, 14 and the new 16, Tasks 10, 11 and 12, *Words proposed* (a new detail).
  **Sittings 4 and 5 are unblocked**; nothing measured moves sitting 2's or 3's code but m97.
- **For Rich:** delete `Manifest-local-dev/f6b-measure-1` when he wishes (with `keep-walk-1002` and `f6-watch`);
  Decision 16 (ours); FE-51 and FE-52; the *"It has stopped waiting."* words (`PENDING_ACTION_RESOLVED` means someone
  else answered); m97.
