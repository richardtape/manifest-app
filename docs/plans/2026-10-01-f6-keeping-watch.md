# F6 — Keeping Watch: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development,
> as Rich chooses at approval) to implement this plan task-by-task, one sitting per session. Steps use checkbox (`- [ ]`)
> syntax for tracking. **Read [`../ORIENTATION.md`](../ORIENTATION.md) first. F4a is executed; this plan starts from it.**

**Status: APPROVED BY RICH, 2026-10-01** (*"yes approved. native."*, session `manifest-app-34`), **executed natively**
(superpowers:executing-plans, as F3 to F5 ran). The design was approved by Rich
section by section and is its own file, [`2026-10-01-f6-keeping-watch-design.md`](./2026-10-01-f6-keeping-watch-design.md):
**read it first**. This plan says how to build it, and the decisions only an implementation needs.

**Goal:** While nobody is looking, we notice when a faculty member's app needs them and tell them by email; when they
come back, the page says what happened since and what is theirs to do; when the live app falls over, one button starts
it again; at the end of term they switch it off without losing anything, have it back, or delete a draft that never
went live. Walk-through moments **16, 19 and 20**. Moments 17 and 18, and the *Agents* screen, are **F6b's** (D1).

**Architecture:**
- **The keeper** (`packages/server/src/keeping/`) runs inside our server (D4). It keeps one read-only *"Keeping watch"*
  token per app, **sealed on disk** (D2), and opens one event stream per app through F3's `platformStream`. Every event is
  written once to `history`. Pure functions decide what is a line a person reads, an email, and a *needs you*.
- **The live-address watch** is ours (D6): once a minute, one `GET` per launched, switched-on app's students' address,
  through the edge. A pure state machine says *answering*, *down* and *answering again*.
- **Email** goes through nodemailer (D5) to `MANIFEST_APP_SMTP_URL` (Mailpit on the laptop), **once each**, by an `emails`
  table.
- **The page** mints the watch token (no step-up), reads our new routes (`/api/needs`, `/api/since`,
  `/api/apps/:projectId/history`, `…/keeping`), and does **every action that changes what students reach in the person's
  own session**: *Start it again*, *Switch it off*, *Switch it back on*, *Start it for your students*, *Delete it*. **Our
  server still deploys nowhere but the sandbox.**

**Tech Stack:**
- F5's: TypeScript 5, Node 24, Fastify 5, React 19, Vite 8, Vitest 2.1.9, `zod` 3.25.76 through `zod/v4`, `node:sqlite`.
- **One new dependency, for our server only: `nodemailer` 10.0.13**, pinned exactly (D5). Its types come with it, or
  from `@types/nodemailer` 8.0.2 as a dev dependency if they do not (Task 5 says which). Node's own `crypto` seals the
  token; Node's own `fetch` does the watch (D6).

**Spec:**
- **[`2026-10-01-f6-keeping-watch-design.md`](./2026-10-01-f6-keeping-watch-design.md)**: Rich's decisions D1–D7 and
  §1–§6. **This plan argues from it**; where they disagree, the design wins until Rich says otherwise.
- [`../walkthrough.md`](../walkthrough.md): moments 16, 19 and 20, the faculty member's words;
- [`../api-findings.md`](../api-findings.md): FE-4, FE-7, FE-10, FE-11 (built: `member.removed` revokes the member's
  tokens), FE-33 (`4401`), FE-38 (`createdAt`), FE-40 (the mock cannot play a launch), **FE-45** (Rich, 2026-10-01);
- manifest's `openapi.json` **1.5.0, 69 operations**, `docs/api/events.md` (every event type, the close codes):
  read-only.

---

## How this plan is executed: sittings, one per session

| Sitting | Tasks | Delivers | Status |
|---|---|---|---|
| 1 | 1 | **The measurements**, on 7100 in the platform's window, at Rich's word: a watch token's reads and stream; the students' address through the edge; switch off, back on and the two deploys after; delete; a fall (stopping the container: **Rich's word first**); the mock's answers. **Alone.** It needs 7100 free (the platform's sitting 7 closes first), so **sittings 2–4 may run before it**: they need no platform | not started |
| 2 | 2, 3 | Our server: the store's version 5; the seal and its key; the watch token handed over and kept; the keeper's streams, its history and its gaps | not started |
| 3 | 4, 5 | The happenings and the lines; the emails, once each, through nodemailer | not started |
| 4 | 6, 7 | The live-address watch and its outages; our routes: needs, since, history, forget; the outage's fix conversation | not started |
| 5 | 8, 9 | The page: the platform's new calls; the watch token minted; *Your apps* and the Overview (the band, *Since you were last here*, the card's states, *How we keep watch*); the history page | not started |
| 6 | 10, 11 | The page: *Start it again* and *What happened?*; switching off, back on, *Start it for your students*, and delete | not started |
| 7 | 12 | **The acceptance:** `scripts/check-keeping.sh` against the mock and Mailpit; the whole-branch review; the walk on 7100 at Rich's word; **Rich's click**. **Alone, and last** | not started |

**Every sitting starts** with `pgrep -fl vitest` (a stray worker of ours loads the machine the platform times its tiers
against; the platform's own are not ours to stop) and **Step 0: the platform's landings** (*Adopting what lands*,
below). **Every sitting ends as F5's did:**
1. the four gates, `pnpm test` twice; and, when it touched our server, `check-slice.sh`, `check-describing.sh`,
   `check-building.sh`, `check-seeing.sh` and `check-going-live.sh` in mock mode (`check-seeing.sh` first; from sitting
   7, `check-keeping.sh` too);
2. a dated entry in *What executing this plan found*;
3. this table;
4. ORIENTATION's *Where things stand*, replaced, and the roadmap;
5. `pgrep -fl vitest` again.

**Adopting what lands (Step 0).** The platform runs its launch-path sittings 8–10 and 12 while F6 is built. At each
sitting's start: re-read `openapi.json` (version, operations, codes); `pnpm typecheck`; `pnpm test`; record any landing in
`api-findings.md` the same day; **restart `pnpm mock`** when its fixtures or examples moved. A landing that changes
something F6 calls (a new close code, an event type renamed, `archiveProject`'s answer) is adopted test-first before the
sitting's own task.

## Decided by Rich: build them, do not re-open them

The design's **D1–D7**, each quoted and dated there. In one line each:
- **D1.** Two plans: F6 *Keeping watch* (moments 16, 19, 20) now; F6b *Working on it together* (17, 18, *Agents*) after.
- **D2.** The watch token is kept on disk, sealed; F2's Decision 1 is amended for it alone.
- **D3.** Four kinds of email: *it's in trouble*, *your work is waiting*, *a long wait is over*, *who's on it changed*.
- **D4.** The keeper runs inside our server.
- **D5.** nodemailer.
- **D6.** The live-address watch is ours, with no dependency; FE-4 stays the platform's.
- **D7.** Only an app that never went live is deleted by its owner; FE-45 for the rest.

### Words proposed for Rich

The walk-through's sentences stand (moments 16, 19, 20), and so do the design's. **New here**, for Rich to approve with
the plan (each in `words.ts`, or in `keeping/words.ts` for an email):

| Where | Words |
|---|---|
| History and *Since you were last here*: a line each | *Went live* · *A new version reached your students* · *A change didn't go live. Your students kept the version before it.* · *Signed off by a Manifest administrator* · *A Manifest administrator didn't sign it off* · *The dry run signed someone in* / *The dry run didn't sign anyone in* · *The request was sent to UBC's identity team* · *UBC's identity team registered it* / *…asked for a change* / *…answered* · *The privacy assessment was sent to UBC's Privacy Office* · *UBC's Privacy Office approved it* / *…answered* · *<name> was added* · *<name> is now an owner* / *…a helper* · *<name> was taken off it* · *Switched off* · *Switched back on* · *Renamed from <old name>* · *Your students couldn't reach it* · *Answering again. It was down for 4 minutes.* |
| The band | *<App>: we have a question for you.* [Open it] · *<App>: your students can't reach it, since 10:03. We can see that, not why. Starting it again usually fixes it.* [Start it again] · (a helper) *An owner can start it again.* · *<App>: answering again since 10:07. It was down for 4 minutes.* [What happened?] · *<App>: a change didn't go live. Nobody has lost anything: your students still have the version from before.* [Give this to your agent] · *<App>: something on its way to your students needs you.* [Going live] |
| The history page | *Everything that happened* · *From 18 September.* · *We weren't watching between 2 and 5 October.* |
| *How we keep watch* | *Once a minute, we check that your students can reach <App>. If they can't, twice in a row, we email its owners and offer to start it again. We can't see why it stopped, we can't tell when it answers but gets things wrong, and we only watch while we're running ourselves.* |
| *Start it again* | *Starting it again…* (F5's stations) · *It's answering again.* · *Your trying-out address has a newer version, from <date>. Start that one instead, or put the version from <date> back on trying-out first?* [Start the newer one] [Put <date>'s back first] |
| *What happened?*'s conversation | title *Your students couldn't reach it*; its first words, the design's §4 |
| Switching | the design's §5, and *Switching it off* (the section) · *You're signed in again.* (after the step-up, as F5) |
| Emails: subjects | *<App>: a change didn't go live* · *<App>: your students can't reach it* · *<App> is answering again* · *<App>: we've finished* · *<App>: we need you* · *<App>: still waiting for you* · *<App>: signed off* · *<App>: not signed off* · *<App>: the dry run worked* / *…didn't sign anyone in* · *<App>: UBC's identity team answered* · *<App>: UBC's Privacy Office answered* · *<App>: <name> was added* · *<App>: <name> was taken off it* |
| Emails: their last line | *You're getting this because you own <App> on Manifest.* · (your work is waiting) *You're getting this because you asked us to work on <App>.* |

Times in an email are **Vancouver time** (`America/Vancouver`), as the platform counts its waits; on the page, the
person's own time zone, as F5's dates are.

## Decisions this plan makes, and why

1. **What happened is stored as the platform said it; words are made at reading.** `history` keeps each event's `type`
   and `machineDetail` (redacted at capture by the platform), and our own outages and gaps beside them. A pure
   `happeningOf` turns an entry into a typed `Happening`; **the page** words a happening (`words.ts`, the one file of
   sentences), and **our server** words an email (`keeping/words.ts`). *Rejected:* storing sentences, which would freeze
   today's words into every old row.
2. **Lines are chosen when read** (`linesOf`, pure): a launch's own `instance.healthy` is not also *"a new version
   reached your students"* (the same `instanceId` as `project.launched`), and a production instance healthy with the
   **same release** as the one before is a restart, not a new version (no line: the outage's own line says it).
3. **The store's version 5** (Task 2): `apps`, `members`, `watch_tokens`, `history`, `emails`; `persons` gains `email`,
   `here_at` and `last_here`. **Members and the app's facts are kept**, not cached in memory: an archived app has no
   token to ask with, and its history must still answer its members, and a restart must not forget who owns what.
4. **The seal** (Task 2): AES-256-GCM, a random 12-byte nonce, written `v1.<base64url(nonce ‖ ciphertext ‖ tag)>`. The
   key is 32 bytes: `MANIFEST_APP_KEEPING_KEY` (base64), else the file `packages/server/.keys/keeping.key`, made at the
   first start with mode `0600`, its directory `0700`, git-ignored. **A key that cannot unseal a row makes that row no
   token** (Review Focus 4), never a crash and never a log line with the sealed value.
5. **One watch token per app; the first good one stays** (Review Focus 2). `POST …/keeping` keeps the handed token only
   when the app has none, or its own is refused or has under 30 days left; otherwise it answers `200 { kept: 'current' }`
   and the page revokes the token it has just minted (its own: only a minter may revoke).
6. **Who is an owner** is read from `listMembers`: on the page, in the person's session (owner-only buttons); on our
   server, from the kept `members` (owner-only routes, an email's recipients). **The platform still decides**: a helper
   who reaches an owner's action by hand is refused by it, and the page says so in F5's words.
7. **"Last here"** (design §2): `persons.here_at` is the last page load we heard of (`/api/since` or `/api/needs`), and
   `last_here` is when the previous visit ended. A load more than an hour after `here_at` moves `here_at` into
   `last_here`. Lines are those after `last_here`; with none, the section is not drawn.
8. **The watch** (Task 6) probes only an app that is **launched, `active`, and watched** (a token kept), at its
   production `Environment.url`, kept in `apps.students_url`. **An open outage survives a restart** (Review Focus 1): it is
   a `keeping.unreachable` row with no `keeping.answering` after it, and the keeper starts from it, never from
   *answering*. **Flapping is held** (Review Focus 3): *answering again* needs three answers in a row (about three
   minutes), and a fall within 30 minutes of the last recovery is the same outage again: no second *can't reach* email.
9. **The outage's fix** is a new kind beside F5's: `{ fix: { outage: { from, to } } }`, two moments (the outage's).
   `pieceOf` carries it; the round puts it in the lead's view as `fix.outage`, and the lead's prompt says plainly that
   there is no incident and production's output cannot be read (§14).
10. **The page's step-up returns** to the Overview with `?then=`: `start-again`, `students` (*Start it for your
    students*), `switch-off` or `delete`. Arriving with one, the page says *"You're signed in again."* and shows the same
    button, never pressing it by itself (as F5's `then=live`).
11. **Forgetting** (`DELETE /api/apps/:projectId`, Task 7) is for an **owner by the kept members**, and only after the
    page's `deleteProject` succeeded. It deletes our rows for the app, every person's: conversations and what hangs on
    them (messages, plans, runs, trace, questions), history, emails, members, the app and its watch token. A round
    working on it is stopped first.
12. **Mock mode runs the keeper too**, against the mock's stream (it accepts any Bearer and replays its script), and
    sends to Mailpit, as edge mode does. **The probe is off in mock mode** (`config.mode === 'mock'`): the mock's app has
    no live address on the laptop (with `MANIFEST_MOCK_LAUNCHED=1` its `url` answers nothing, which would read as a fall
    every two minutes). `check-keeping.sh` drives the watch in-process instead (Task 12).
13. **Who acted** is the event's `machineDetail.userId` where it carries one (`member.*`, `project.archived`,
    `project.restored`, `project.renamed`); nobody is emailed about what they did themselves, and a line names them by
    the kept members, else *"someone"*. An administrator's signing off carries no actor: *"a Manifest administrator"*.
14. **Your work is waiting** (Task 5): when a piece of work ends (`createWork`'s `ended`) and **no page holds the
    conversation's stream** (`hub.watched`, new), its person gets one email, keyed by the run, if the conversation now
    waits on them (*"we need you"*) or is built (*"we've finished"*). Once an hour the keeper looks for conversations
    waiting on their person (`chipOf` is `attention`) untouched for 24 hours: one email each, keyed by the conversation
    and its `updated_at`.
15. **The change that didn't go live** emails only for a **launched** app: before a first launch, the person is on
    *Going live* pressing, and *"your students still have the version from before"* would not be true.

## What waits on the platform

- **Nothing to build F6.** Contract 1.5.0 has every operation it calls: `mintToken`, `revokeToken`, `listMembers`,
  `getProject?expand=environments`, `getEnvironment`, `listInstances`, `deploy`, `archiveProject`, `restoreProject`,
  `deleteProject`, and the event stream with `4401` and `4404`.
- **FE-45** (*mark as removed*, Rich): until it lands, a live app's owner reads the sentence where *Delete it* would be.
- **FE-4** (the platform noticing a dead app): our watch is the stop-gap, and says what it cannot do.
- **FE-7** (a cursor on the stream's replay): our history says *"From …"* and names its gaps.

## Global Constraints

- Everything in F1's to F5's *Global Constraints*, which stand: no token or key reaches a model; **our server and the
  lead never deploy anywhere but the sandbox**, and never read any output but the sandbox's; no dependency is added to
  the app (`packages/web`); a step ticks only on its own signal; never *"It works"*; no infrastructure words (C3); every
  problem shown carries a support reference.
- **The one credential at rest is a sealed watch token** (D2). Nothing else persisted is a credential; the key is never
  in `.data/`, never logged, never in a row. The no-credential scan reads every table, `watch_tokens` included: sealed
  bytes only, never `mft_` (Tasks 2, 12).
- **The watch token only reads.** Our server calls nothing with it but `getProject`, `listMembers` and the event stream
  (`launch-actions.test.ts` grows to hold it, Task 3).
- **Every action that changes what students reach is the person's session, in the browser**: *Start it again*, *Start it
  for your students*, `archiveProject`, `restoreProject`, `deleteProject`. **Our server calls none of them** (Task 3's
  guard; `check-keeping.sh`).
- **One email per happening and recipient**, never a digest, never to the person who did it (D3; Decisions 13–15).
- **An email is plain text in our words**: `machineryIn` is empty on every subject and body (Task 5).
- **Five states only; *we*, everywhere.** `machineryIn(text())` is empty on every new screen (Tasks 9–11).
- **Only nodemailer is new** (D5), and only in `packages/server`.

## Review Focus

1. **A restart in the middle of an outage, or of an email's retries:** the app was down when our server stopped. The
   keeper starts from the open outage (no second *can't reach* email); a half-sent email's row is retried, never sent
   twice. **Pinned in Tasks 5 and 6.**
2. **Two members at once, and a stale token handed over:** two pages mint for the same app in the same second; a page
   hands over a token after the app was switched off. One token is kept, the other revoked by its own page; a token
   that cannot read the project is `400 TOKEN_NOT_FOR_PROJECT` and nothing is kept. **Pinned in Tasks 3 and 8.**
3. **A flapping app:** down, up, down, up within minutes. Two emails at most (*can't reach*, *answering again*) for the
   whole run of it, and the band says the truth now. **Pinned in Task 6.**
4. **Switched off, then back:** nothing mints for an archived app (`mintToken` would be `409 PROJECT_ARCHIVED`); `410`
   is never *down*; the replay after a restore adds `project.archived` and `project.restored` once and records no false
   gap; a changed key makes the sealed tokens no token, and the next visit mints. **Pinned in Tasks 2, 3, 6 and 8.**
5. **Strangers and helpers on someone else's routes:** another person's `history`, `keeping`, `needs` or `DELETE` is
   `404`; a helper sees *An owner can start it again.* and no switching buttons, and our `DELETE` refuses them. **Pinned
   in Tasks 7, 9 and 11.**

---

## File Structure

```
packages/server/src/
  keeping/seal.ts             the key; seal and unseal; pure but the key's file                      Task 2
  store/keeping.ts            version 5's tables, and their statements (as runs.ts)                  Task 2
  store/schema.sql  store/migrate.ts  store/db.ts  store/conversations.ts   version 5                 Task 2
  platform/watching.ts        getProject?expand=environments, listMembers: the watch token's reads   Task 3
  keeping/keeper.ts           the keeper: tokens handed over, streams, history, gaps, members        Tasks 3, 5, 6
  api/keeping.ts              GET/POST /api/apps/:projectId/keeping                                    Task 3
  keeping/happenings.ts       happeningOf, linesOf, gapsOf: pure                                       Task 4
  keeping/emails.ts           who is emailed what: pure                                                Task 5
  keeping/words.ts            every email's sentences                                                  Task 5
  keeping/mail.ts             nodemailer; once each; retries                                           Task 5
  keeping/outage.ts           the watch's state machine: pure                                          Task 6
  keeping/probe.ts            one GET, through the edge                                                Task 6
  api/keeping.ts              GET /api/needs, /api/since, /api/apps/:projectId/history; DELETE /api/apps/:projectId   Task 7
  api/apps.ts  api/piece-state.ts  build/round.ts  agents/lead.ts   the outage's fix                   Task 7
  api/events.ts               Hub.watched                                                              Task 5
  identity.ts                 Person.email                                                             Task 2
  config.ts  main.ts  app.ts  the key, the mailer, the keeper                                          Tasks 3, 5
  launch-actions.test.ts      the watch token only reads; nothing changes what students reach         Task 3
packages/web/src/
  platform/api.ts             listMembers, revokeToken, archiveProject, restoreProject, deleteProject  Task 8
  ours/api.ts                 keeping, handWatch, needs, since, history, forget; the outage's fix      Task 8
  screens/keeping/watch.ts    ensureWatch, useWatch: the token minted and handed over                  Task 8
  screens/keeping/role.ts     useRole: owner or helper, from listMembers                               Task 8
  screens/keeping/lines.ts    a happening in words: pure                                               Task 9
  screens/keeping/needs.tsx   the band                                                                 Task 9
  screens/keeping/since.tsx   Since you were last here                                                 Task 9
  screens/keeping/how.tsx     How we keep watch                                                        Task 9
  screens/history/history.tsx the app's history page                                                   Task 9
  screens/keeping/start-again.tsx   Start it again; What happened?                                     Task 10
  screens/overview/switching.tsx    Switch it off, back on, Start it for your students, Delete it      Task 11
  screens/your-apps/{model.ts,your-apps.tsx}   the card's states; the band; Since                      Tasks 9, 11
  screens/overview/overview.tsx      the band; Since; How we keep watch; Switching                     Tasks 9–11
  screens/name-it/name-it.tsx        the watch minted at Make it                                       Task 8
  router.ts  app.tsx  words.ts
scripts/check-keeping.sh  scripts/check-keeping.ts                                                     Task 12
```

---

## Task 1: Measure what this plan rests on (sitting 1, alone)

Throwaway code in the scratchpad. Only this plan's findings are committed. **Run nothing in manifest**: read it.
**Before 7100: ask Rich, and tell the platform session** (ORIENTATION §8: its sitting 7 says when 7100 is free). **Every
project made on 7100 is a real private repository on GitHub that nothing deletes**: make **one**, named for this plan
(`f6-watch`), and a second only for M6 (a draft to delete). **Rich types every password**; the administrator's part is his,
as `operator`.

- [ ] **M0: a launched app on 7100.** Ask the platform session for the shortest honest way to one (its scripts, or a walk
  as F5's acceptance did, now with sitting 7's drafts and submissions). Record which, and how long it took.
- [ ] **M1: the contract, and what landed.** Re-read `openapi.json`; do Step 0 for any landing.
- [ ] **M2: a watch token** (`project:read`, `output:read`, 365 days, minted in the session from Node): `getProject?expand=
  environments` with it (production's `url`); `listMembers` with it (every field); its stream: the replay (how many, which
  types), `ready`, and an event while open. **Each event type F6 reads, its `machineDetail` as sent**:
  `project.launched`, `instance.healthy`, `incident.opened`, `release.approved`, `rehearsal.completed`,
  `iam_registration.recorded`, `member.added`, `project.archived`, `project.restored`, `project.renamed`.
- [ ] **M3: the students' address through the edge**, from Node with `NODE_OPTIONS=--use-system-ca`, `redirect:
  'manual'`: the CWL app's status and `location`, and its time; the same while switched off (expected `410`).
- [ ] **M4: switching off and back on** (the session):
  - `archiveProject` without a recent step-up (`403 STEP_UP_REQUIRED`?), and with one: its time; what the watch token's
    open stream receives before it closes (`project.archived`, then `4401`?);
  - production after it: `getEnvironment` (`instance`?), `listInstances` (each `state`, `releaseId`, `createdAt`): **is
    the last-served release readable?**
  - `restoreProject` (no step-up): its answer; a **new** watch token's replay: `project.archived` and `project.restored`
    in it?
  - **the two deploys**: staging with the last-served release, then production with the step-up: refused? Each code
    (`LAUNCH_NOT_READY`-like with the checklist, an approval bound to its digest, a lapsed registration), and the
    checklist's items after the restore.
- [ ] **M5: a change that does not go live on production**, **only if one can be made without changing the platform** (a
  version healthy on trying-out that fails on the live address): `incident.opened`'s time to the watch token's stream.
  Else recorded as not measured; the mock-side tests carry it.
- [ ] **M6: the app falls over.** **Ask Rich first: this touches the platform's Docker.** At his word, stop the live
  app's container (`docker stop`, by the name the platform's runbook gives): what the edge answers (`502`?), at once and
  a minute on; what `getEnvironment` says (still `healthy`: FE-4); then *Start it again*'s deploy of the same release in
  the session (its step-up; its time; the address answering again). If Rich says no, the walk (Task 12) does it at his
  word instead, or not at all.
- [ ] **M7: delete** (the second, never-launched project): `deleteProject` without and with a step-up; the watch token's
  stream (`4401` or `4404`?); `getProject` after (`404`); the slug free (`checkSlug`).
- [ ] **M8: the mock** (`pnpm mock`, 7102): what `mintToken`, `revokeToken`, `listMembers`, `archiveProject`,
  `restoreProject` and `deleteProject` answer, with `MANIFEST_MOCK_LAUNCHED` unset and `=1` (FE-40: what the walks fake).
- [ ] **Record** in this plan: each measurement, and **(S1)** corrections to Tasks 3–12. **Tell the platform session
  when 7100 is free again.**

## Task 2: The store's version 5, the seal, and the person's email (sitting 2)

**Files:**
- Create: `packages/server/src/keeping/seal.ts`, `packages/server/src/keeping/seal.test.ts`,
  `packages/server/src/store/keeping.ts`
- Modify: `packages/server/src/store/{schema.sql,migrate.ts,db.ts,conversations.ts,db.test.ts}`,
  `packages/server/src/identity.ts` (+ its test), every test fake that builds a `Person` (typecheck names them),
  `.gitignore`

**Interfaces:**

```ts
// keeping/seal.ts
export const KEY_BYTES = 32
/** MANIFEST_APP_KEEPING_KEY (base64, 32 bytes), else the file, made 0600 in a 0700 directory when absent. */
export function keyFrom(env: NodeJS.ProcessEnv, file: string): Buffer   // throws on a key of the wrong length
export function seal(key: Buffer, secret: string): string               // 'v1.' + base64url(nonce ‖ ciphertext ‖ tag)
export function unseal(key: Buffer, sealed: string): string | undefined // undefined: another key, tampered, or not v1

// identity.ts
export type Person = { id: string; displayName: string; email: string; mayBuild: boolean }

// store/keeping.ts
export type EmailKind = 'trouble' | 'waiting' | 'over' | 'people'
export interface KeptApp {
  projectId: string; name: string; slug: string
  state: 'active' | 'archived'; launchedAt: string | null; studentsUrl: string | null
}
export interface KeptMember {
  userId: string; role: 'owner' | 'collaborator'; displayName: string; email: string
}
export interface KeptWatch {
  projectId: string; tokenId: string; sealed: string; expiresAt: string; mintedBy: string; mintedAt: string
}
/** A platform event as sent (`id` its own), or ours: `keeping.gap`, `keeping.stopped`, `keeping.unreachable`, `keeping.answering`. */
export interface HistoryEntry { id: string; projectId: string; at: string; type: string; detail: unknown }
export type EmailKey = { kind: EmailKind; happening: string; recipient: string }
/** One email: its key (the recipient is its address), and what it says. */
export type Outgoing = { key: EmailKey; subject: string; text: string }
export function keepingStatements(db: DatabaseSync, now: () => string): KeepingStatements

// store/conversations.ts: Store gains (and rememberPerson keeps the email)
rememberPerson(person: Pick<Person, 'id' | 'displayName' | 'email'>): void
personEmail(personId: string): string | undefined
/** Decision 7: records this load; answers when the previous visit ended. */
visit(personId: string, at: string): { lastHere: string | null }
putApp(app: KeptApp): void
app(projectId: string): KeptApp | undefined
putMembers(projectId: string, members: KeptMember[]): void   // replaces the app's members whole
members(projectId: string): KeptMember[]
/** The apps whose kept members include this person. */
appsOf(personId: string): KeptApp[]
putWatch(watch: KeptWatch): void
watchOf(projectId: string): KeptWatch | undefined
watches(): KeptWatch[]
/** Drops the row only while it still holds this token: a newer one handed meanwhile stays. */
dropWatch(projectId: string, tokenId: string): void
/** False, and nothing written, when the id is already held. */
addHistory(entry: HistoryEntry): boolean
/** Oldest first. */
historyOf(projectId: string): HistoryEntry[]
/** Which of these ids are held. */
heldOf(projectId: string, ids: string[]): string[]
/** True when this call claimed it (state `sending`, its words kept); false when it was ever claimed. */
claimEmail(outgoing: Outgoing): boolean
emailDone(key: EmailKey, state: 'sent' | 'failed', tries: number): void
/** Claimed, never finished: a restart's to finish, words and all. */
emailsUnfinished(): Outgoing[]
/** Conversations on an app, any person's, untouched since `before`. */
idleConversations(before: string): Conversation[]
/** Anyone's fix for this incident, not set aside. */
fixUnderWay(projectId: string, incidentId: string): boolean
/** Decision 11: every row of ours for the app, every person's. */
forgetApp(projectId: string): void
```

- [ ] **Step 1: Tests, failing first.**
  - **The seal** (`seal.test.ts`): a round trip; two seals of one secret differ (the nonce); `unseal` with another key,
    a flipped byte, `v2.…`, or `''` is `undefined` and throws nothing; `keyFrom` with the variable set uses it (and
    throws on 31 bytes); without it, makes the file once with mode `0600` in a `0700` directory and reads the same key
    back on a second call; **the file is never under `.data/`** (the path `main.ts` passes, asserted in Task 3).
  - **Version 5** (`db.test.ts`): a version-4 file (made by `execOn` with F4's schema and `user_version = 4`) opens at 5
    with every row kept, `persons` gaining `email`, `here_at`, `last_here` (null), and the five new tables; a new file
    is 5; opening twice changes nothing.
  - **The statements**: `addHistory` twice with one id is `true` then `false`; `historyOf` is oldest first; `heldOf`;
    `dropWatch` with an older token id leaves a newer row; `claimEmail` once `true`, again `false`, `emailsUnfinished`
    lists it until `emailDone`; `putMembers` replaces; `appsOf`; `idleConversations` (only an app's conversations, only
    older than `before`); `fixUnderWay` (another person's fix counts; one set aside does not); **`forgetApp` leaves
    another app's rows and every row of the intake that never made a project**.
  - **`visit`** (Decision 7): the first load answers `null`; a load 30 minutes later answers `null` still; a load 61
    minutes after the last answers the last's time; the next, five minutes later, answers the same.
  - **The no-credential scan** (`dumpAll`, as F2's): after a `putWatch` of `seal(key, 'mft_…')`, no table holds `mft_`.
  - `identity.test.ts`: `whoIs` carries `email` from `getMe`.
- [ ] **Step 2: Red.**
- [ ] **Step 3: Implement.** `schema.sql`:

  ```sql
  create table if not exists apps (
    project_id text primary key,
    name text not null,
    slug text not null,
    state text not null check (state in ('active', 'archived')),
    launched_at text,
    students_url text,                 -- production's Environment.url; null before a deploy
    read_at text not null
  );
  create table if not exists members (
    project_id text not null,
    user_id text not null,
    role text not null check (role in ('owner', 'collaborator')),
    display_name text not null,
    email text not null,               -- an address is not a credential
    primary key (project_id, user_id)
  );
  -- D2: THE ONE CREDENTIAL AT REST, SEALED (AES-256-GCM); its key is never in .data/.
  create table if not exists watch_tokens (
    project_id text primary key,
    token_id text not null,
    sealed text not null,
    expires_at text not null,
    minted_by text not null,
    minted_at text not null
  );
  -- What the keeper saw, as the platform sent it, and its own outages and gaps (Decision 1).
  create table if not exists history (
    id text primary key,
    project_id text not null,
    at text not null,
    type text not null,
    detail text not null
  );
  create index if not exists history_by_project on history (project_id, at);
  -- D3: one email per happening and recipient.
  create table if not exists emails (
    kind text not null check (kind in ('trouble', 'waiting', 'over', 'people')),
    happening text not null,
    recipient text not null,           -- the address
    subject text not null,             -- kept, so a restart can finish what it claimed (Review Focus 1)
    body text not null,
    state text not null check (state in ('sending', 'sent', 'failed')),
    tries integer not null,
    at text not null,
    primary key (kind, happening, recipient)
  );
  ```

  and `persons` gains `email text`, `here_at text`, `last_here text` (new files from `schema.sql`; `migrate.ts`'s
  version 5 adds each with `alter table … add column` when `pragma table_info(persons)` lacks it, as version 3 added
  `runs.detail`). The header comment's *"no credential is ever a column here"* becomes D2's exception, named. `forgetApp`
  deletes in one transaction, children first (`trace` and `questions` by run, `runs`, `messages`, `plans`,
  `conversations`, then `history`, `emails` whose happening names the app, `members`, `watch_tokens`, `apps`). **An
  email's `happening` starts with its project id** (`<projectId>:<what>`, Task 5), so the app's are found.
  `.gitignore` gains `packages/server/.keys/`.
- [ ] **Step 4: Green; controls:** `unseal` returning the ciphertext on a bad tag (red); `version < 5` skipped (red);
  `forgetApp` without the run's `trace` (the scan of a forgotten app red). Each restored.
- [ ] **Step 5: Commit** `feat(server): the store's version 5 — the watch token sealed, what the keeper saw, emails once each; Person.email`.

## Task 3: The watch token handed over, and the keeper's streams (sitting 2)

**Files:**
- Create: `packages/server/src/platform/watching.ts`, `packages/server/src/keeping/keeper.ts`,
  `packages/server/src/keeping/keeper.test.ts`, `packages/server/src/api/keeping.ts`,
  `packages/server/src/api/keeping.test.ts`
- Modify: `packages/server/src/{app.ts,main.ts,config.ts,launch-actions.test.ts}`

**Interfaces:**

```ts
// platform/watching.ts: the watch token's reads, and nothing else
export interface Watching {
  /** getProject?expand=environments: production's `url` is the students' address. */
  app(token: string, projectId: string): Promise<KeptApp>
  members(token: string, projectId: string): Promise<KeptMember[]>
}
export function platformWatching(origin: string): Watching

// keeping/keeper.ts
export interface KeeperDeps {
  store: Store
  key: Buffer
  stream: ProjectStream                 // platform/stream.ts, unchanged
  watching: Watching
  now: () => Date
  // Task 5 adds: mailer: Mailer; hub: Pick<Hub, 'watched' | 'busy'>; origin: string (config.origin, an email's links);
  //   every.scanMs (3_600_000)
  // Task 6 adds: probe: (url: string) => Promise<number | null>; probing: boolean (Decision 12: false in mock mode);
  //   every.probeMs (60_000)
}
export type Handed = { token: string; tokenId: string; expiresAt: string }
export interface Keeper {
  /** Every kept token's stream opened; the timers started. */
  start(): void
  stop(): void
  /** Decision 5. Throws PlatformRefusal when the token cannot read the project. */
  hand(projectId: string, handed: Handed, personId: string): Promise<'kept' | 'current'>
  status(projectId: string): { watching: boolean; until: string | null; tokenId: string | null; mintedBy: string | null }
  // Task 5 adds: workEnded(conversation: Conversation): void
  // Task 6 adds: outage(projectId: string): Outage
  /** Decision 11: its stream closed, and every row forgotten. */
  forget(projectId: string): void
}
export function createKeeper(deps: KeeperDeps): Keeper
/** A keeper that keeps nothing: buildServer's default, for tests that do not need one. */
export const idleKeeper: Keeper

// api/keeping.ts
export function registerKeeping(app: FastifyInstance, deps: { config: Config; store: Store; keeper: Keeper }): void
//   GET  /api/apps/:projectId/keeping  → { watching, until, tokenId, mine }   (mine: minted by this person)
//   POST /api/apps/:projectId/keeping  { token, tokenId, expiresAt } → 201 { watching: true, until } | 200 { kept: 'current', until }
```

- [ ] **Step 1: Tests, failing first** (a recording fake `ProjectStream` whose test can push events, close `refused`,
  or call `reconnected`; a fake `Watching`; an in-memory store; fake timers).
  - **`hand`**: a token whose `watching.app` answers another project's id, or is refused `401`/`403`/`404`, is
    `PlatformRefusal` and nothing is kept; a good one is sealed (`unseal` gives it back), its app and members kept, and
    its stream opened; **Decision 5**: a second hand while the first is good is `'current'` and nothing changes; while
    the first has 29 days left, or was refused, it replaces it (the old stream closed).
  - **Boot**: two kept tokens open two streams; a row that will not unseal (another key) is dropped, opens nothing, and
    leaves `status` `watching: false` (Review Focus 4).
  - **Events**: each is written to `history` once (the same id twice is one row); `member.added` and `member.removed`
    re-read the members (`putMembers`); `project.archived` and `project.restored` re-read the app; `project.deleted`
    forgets the app.
  - **A restore's replay** (Review Focus 4): a new token handed after a switch-off, its replay holding events already
    held and `project.archived` and `project.restored` not yet held: the two written once, **no gap**.
  - **Refused** (the stream's `refused`): the token's row dropped (`dropWatch` with its id), a `keeping.stopped` row with
    the time, `status` `watching: false`.
  - **A gap** (Decision 1): on `reconnected`, or at boot, the first replayed events are checked with `heldOf`; **when
    the app has history and none of the replay is held**, one `keeping.gap` row `{ from: <newest held at>, to: <oldest
    replayed at> }`; when some are held, none; an app with no history yet records none (it is *"From …"*, Task 4).
  - **The scan grows** (`launch-actions.test.ts`): `keeping/` and `platform/watching.ts` name only
    `/v1/projects/{}`, `/v1/projects/{}/members` and the stream; **no source names `/v1/projects/{}/archive`, `…/restore`,
    `DELETE /v1/projects/{}`** (our server never switches anything off); `deploy` still only in `platform/releases.ts`.
  - **The routes** (`api/keeping.test.ts`, `buildServer` with a fake keeper): `GET` without a person `401`; for an app
    whose kept members exclude the person `404`; for an app with none kept, `{ watching: false, … }`; `POST` from another
    `Origin` `403 ORIGIN_REFUSED`; a body with any other key, a token over 512 characters, a bad `tokenId` or `expiresAt`
    is `400 KEEPING_INVALID`; the keeper's refusal `400 TOKEN_NOT_FOR_PROJECT`; the platform unreachable `502`.
- [ ] **Step 2: Red.**
- [ ] **Step 3: Implement.** `platformWatching` with `tokenClient` (deadline, `refusalFrom`). The keeper holds a
  `Map<projectId, Watch>` (from `platformStream.watch`) and nothing else in memory but Task 6's outages. `main.ts` reads
  the key with `keyFrom(process.env, fileURLToPath(new URL('../.keys/keeping.key', import.meta.url)))` **before**
  listening; builds the keeper (`platformStream(config.platformOrigin)`, `platformWatching(...)`); passes it to
  `buildServer`, which gains `keeper?: Keeper` (default `idleKeeper`), registers `registerKeeping`, and calls
  `keeper.start()` after `line.onBoot()`; `main.ts` calls `keeper.stop()` on `SIGTERM`/`SIGINT` with the server's close.
- [ ] **Step 4: Green; controls:** `hand` keeping a token whose project is another (red); the gap recorded when one
  replayed id is held (red); the `refused` row left in place (red); a `/archive` path added to `watching.ts` (the scan
  red). Each restored.
- [ ] **Step 5: Commit** `feat(server): the Keeping watch token, handed over and sealed; one stream per app, its history and its gaps`.

## Task 4: The happenings, and the lines a person reads (sitting 3)

**Files:**
- Create: `packages/server/src/keeping/happenings.ts`, `packages/server/src/keeping/happenings.test.ts`
- Modify: `packages/server/src/api/progress.ts` (`Happening`, `Line`)

**Interfaces:**

```ts
// api/progress.ts, our API's shapes (the page reads them through `@manifest-app/server/progress`), imported by
// keeping/happenings.ts, which is pure
export type Happening =
  | { kind: 'went-live'; instanceId: string }
  | { kind: 'reached-students'; instanceId: string; releaseId: string }
  | { kind: 'change-failed'; incidentId: string; releaseId: string }
  | { kind: 'signed-off'; releaseId: string }
  | { kind: 'turned-down'; releaseId: string }
  | { kind: 'dry-run'; passed: boolean }
  | { kind: 'sent'; to: 'identity' | 'privacy' }
  | { kind: 'answered'; by: 'identity' | 'privacy'; state: string }
  | { kind: 'member-added'; userId: string; role: 'owner' | 'collaborator'; previousRole: 'owner' | 'collaborator' | null; by: string | null }
  | { kind: 'member-removed'; userId: string; by: string | null }
  | { kind: 'switched-off'; by: string | null }
  | { kind: 'switched-on'; by: string | null }
  | { kind: 'renamed'; from: string; to: string; by: string | null }
  | { kind: 'unreachable'; from: string }
  | { kind: 'answering-again'; from: string; to: string }
/** A line: a happening, when, and who did it by name (the kept members), else null. */
export type Line = { id: string; at: string; happening: Happening; who: string | null }
// keeping/happenings.ts
export function happeningOf(entry: HistoryEntry): Happening | null
/** Decision 2: oldest first in, newest first out; a launch's own healthy and a restart's are not lines. */
export function linesOf(entries: HistoryEntry[], members: KeptMember[]): Line[]
export function gapsOf(entries: HistoryEntry[]): { from: string; to: string }[]
/** The first event held: the history's "From …"; null with none. */
export function fromOf(entries: HistoryEntry[]): string | null
```

- [ ] **Step 1: Tests, failing first**, a table of entries in and happenings out, with M2's `machineDetail` shapes (S1):
  - `project.launched` → `went-live`; `instance.healthy` with `environment: 'production'` → `reached-students`, with
    `staging` or `sandbox` → `null`; `incident.opened` on production → `change-failed`, on staging → `null`;
    `release.approved` → `signed-off`; `release.approval_rejected` → `turned-down`; `rehearsal.completed` →
    `dry-run` with `passed`; `iam_registration.submitted` → `sent identity`; `privacy_assessment.submitted` → `sent
    privacy`; `…recorded` → `answered` with `state`; `member.added` (with and without `previousRole`) and
    `member.removed` with `by` from `userId`; `project.archived`/`restored`/`renamed`; `keeping.unreachable`/`answering`;
    **every other type, `iam_registration.drafted`, `sso.*`, `build.*`, `token.minted` and a type from a newer contract,
    → `null`** (never a crash on a detail missing a field).
  - **`linesOf`** (Decision 2): a launch's `instance.healthy` and `project.launched` with one `instanceId` are one line,
    *went live*; a later production `instance.healthy` with a **new** release is *reached students*; one with the
    **same** release as the production instance before it is no line; `who` is the kept member's `displayName` for
    `by`, `null` for an unknown id; newest first.
  - `gapsOf` gives each `keeping.gap`; `fromOf` the first entry that is not ours (a platform event), else null.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** staging's healthy as a line (red); the launch's
  healthy kept (red). Each restored.
- [ ] **Step 5: Commit** `feat(server): what happened, as a person reads it — the happenings and their lines`.

## Task 5: The emails, once each (sitting 3)

**Files:**
- Create: `packages/server/src/keeping/{emails.ts,emails.test.ts,words.ts,mail.ts,mail.test.ts}`
- Modify: `packages/server/src/keeping/keeper.ts` (+ test), `packages/server/src/api/events.ts` (+ test),
  `packages/server/src/{app.ts,main.ts,config.ts}`, `packages/server/package.json`, `pnpm-lock.yaml`

**Interfaces:**

```ts
// keeping/emails.ts: pure (Outgoing is store/keeping.ts's: the recipient is key.recipient)
/** Who is emailed what for one happening (D3; Decisions 13 and 15). */
export function emailsFor(
  happening: Happening,
  context: { app: KeptApp; members: KeptMember[]; origin: string; at: string; id: string },
): Outgoing[]
/** Decision 14. */
export function waitingEmail(
  why: 'finished' | 'needs-you' | 'a-day',
  context: { app: KeptApp; conversation: Conversation; to: string; origin: string; key: string },
): Outgoing
// keeping/words.ts: every sentence of every email; `America/Vancouver` for times
// keeping/mail.ts
export interface Mailer { send(message: { to: string; subject: string; text: string }): Promise<void> }   // to = key.recipient
export function smtpMailer(url: string, from: string): Mailer
/** Claims, sends, retries at 1, 2, 4… minutes for an hour, then `failed`. Never throws. */
export function deliver(
  store: Store, mailer: Mailer, outgoing: Outgoing,
  wait?: (ms: number) => Promise<void>,   // setTimeout's, by default; a test's fake
): Promise<void>
// api/events.ts: Hub gains
watched(conversationId: string): boolean      // a page holds its stream
// config.ts: Config gains
smtpUrl: string     // MANIFEST_APP_SMTP_URL ?? 'smtp://127.0.0.1:7111'
mailFrom: string    // MANIFEST_APP_MAIL_FROM ?? 'Manifest <manifest@app.manifest.internal>'
```

- [ ] **Step 0: The dependency.** `pnpm --filter @manifest-app/server add -E nodemailer@10.0.13`; if `tsc` finds no
  types, `pnpm --filter @manifest-app/server add -DE @types/nodemailer@8.0.2`. Record which in the sitting's entry.
- [ ] **Step 1: Tests, failing first.**
  - **`emailsFor`** (the table of D3): `change-failed` on a launched app → each owner, *trouble*; on an app not launched →
    none (Decision 15); `unreachable` and `answering-again` → each owner, *trouble*; `signed-off`, `turned-down`,
    `dry-run`, `answered` → each owner, *over*; `member-added`/`member-removed` → each owner **but `by`**, *people*;
    `went-live`, `reached-students`, `sent`, `switched-*`, `renamed` → none. Each `key.happening` is `<projectId>:<id>` (an
    outage's: `<projectId>:outage:<from>` and `…:answering:<from>`), so a replay is the same key.
  - **The words**: each subject begins with the app's name; each body has one link (`origin` + the page: the Overview, or
    *Going live* for `over`) and the last line; **`machineryIn(subject + text)` is empty** for every kind, imported by the
    test from `packages/web/src/screens/machinery.ts` (one list, two readers); no `instance`, no log, no `incidentId`;
    times are Vancouver's (*"since 10:03"* for `2026-10-01T17:03:00Z`).
  - **`deliver`**: claimed once (a second `deliver` of the same key sends nothing); a send that throws twice and then
    works is `sent` with `tries: 3`, at 1 and 2 minutes (fake timers); one that never works is `failed` after an hour;
    **`emailsUnfinished` at boot is delivered again** (Review Focus 1), and never twice.
  - **The keeper**: each new history entry's happening goes through `emailsFor` and `deliver`; **a replayed entry
    (`addHistory` false) sends nothing**.
  - **Your work is waiting** (Decision 14): `workEnded` with nobody watching and the conversation `built` → *we've
    finished* to the person's email; waiting on them → *we need you*; with `hub.watched` true → nothing; once per run.
    The hourly scan: a conversation waiting on its person, untouched 25 hours → *still waiting for you*, once; at 23
    hours → nothing.
  - `Hub.watched`: true while a listener is subscribed, false after it unsubscribes.
  - **`smtpMailer`** against a one-connection SMTP listener the test opens on a free port (`node:net`, answering `220`,
    `250`, `354`, `250`, `221`): the `MAIL FROM`, `RCPT TO` and the subject arrive; no authentication is sent to a URL
    without credentials.
- [ ] **Step 2: Red. Step 3: Implement**; `app.ts`'s `createWork(…, (conversation) => { line.released(...);
  keeper.workEnded(conversation) })`; `main.ts` builds `smtpMailer(config.smtpUrl, config.mailFrom)`.
- [ ] **Step 4: Green; controls:** the actor emailed (red); a replay sending again (red); the machinery list not imported
  (an email with *"instance"* passes: red when imported); `watched` ignored (red). Each restored.
- [ ] **Step 5: Commit** `feat(server): the emails — in trouble, your work is waiting, a long wait is over, who's on it changed; once each, through nodemailer`.

## Task 6: The live-address watch (sitting 4)

**Files:**
- Create: `packages/server/src/keeping/{outage.ts,outage.test.ts,probe.ts,probe.test.ts}`
- Modify: `packages/server/src/keeping/keeper.ts` (+ test)

**Interfaces:**

```ts
// keeping/outage.ts: pure
export type Answer = 'answer' | 'off' | 'miss'
/** Decision 8: 2xx, 3xx and 4xx but 410 answer; 410 is off; 502, 503, 504 and null (no answer) miss; any other 5xx answers. */
export function answerOf(status: number | null): Answer
export type Outage =
  | { state: 'answering'; recovered: { from: string; to: string } | null }   // the last recovery, for 30 minutes and the band's day
  | { state: 'missed'; at: string; recovered: { from: string; to: string } | null }
  | { state: 'down'; from: string; answers: number }                         // answers: in a row, toward 3
  | { state: 'off' }
export type Change =
  | { kind: 'fell'; from: string; again: boolean }     // again: within 30 minutes of the last recovery (no email)
  | { kind: 'recovered'; from: string; to: string }
export function observe(outage: Outage, answer: Answer, at: string): { outage: Outage; change: Change | null }
/** Decision 8: the open outage from history (a keeping.unreachable with no keeping.answering after it). */
export function outageFrom(entries: HistoryEntry[]): Outage
// keeping/probe.ts
export function probeAddress(url: string, fetchFn?: typeof fetch, timeoutMs?: number): Promise<number | null>
```

- [ ] **Step 1: Tests, failing first.**
  - **`answerOf`**: `200`, `302`, `404` answer; `410` off; `502`, `503`, `504`, `null` miss.
  - **`observe`** as a sequence table: answer, miss, answer → never down; miss, miss → `fell` at the **first** miss's
    time; down, answer, answer → still down; a third answer → `recovered` with `from` and `to`; a fall 10 minutes after a
    recovery → `fell` with `again: true`; 40 minutes after → `again: false`; `off` from any state → `off`, and an answer
    after `off` → `answering` with no change (switched back on is not *answering again*).
  - **`outageFrom`**: an unreachable row with no answering after it → `down` from its `from`; with one after → answering
    with that recovery.
  - **`probeAddress`** with a fake `fetch`: `redirect: 'manual'`; the status; a thrown `TypeError` or the deadline →
    `null`; the body cancelled.
  - **The keeper** (fake timers, a fake `probe`): every 60 s, one probe per kept app that is **launched, `active`, with a
    `studentsUrl` and a kept token**, none when `probing` is false (mock mode); `fell` (not `again`) → a
    `keeping.unreachable` row and the owners' *can't reach* email; `fell` with `again` → the row, no email; `recovered` →
    `keeping.answering` `{ from, to }` and the *answering again* email; **a restart with an open outage starts `down`**
    and a further miss sends nothing (Review Focus 1); **a flapping run of down, up, down, up within 20 minutes sends two
    emails in all** (Review Focus 3); `outage(projectId)` answers the state for Task 7.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** one miss counted as down (red); `410` as a miss (red);
  the outage read fresh at boot instead of from history (red). Each restored.
- [ ] **Step 5: Commit** `feat(server): we watch every live address once a minute — down after two misses, answering again after three answers`.

## Task 7: Our routes for the page, and the outage's fix (sitting 4)

**Files:**
- Modify: `packages/server/src/api/keeping.ts` (+ test), `packages/server/src/api/{apps.ts,apps.test.ts,
  piece-state.ts,piece-state.test.ts,progress.ts}`, `packages/server/src/build/round.ts` (+ test),
  `packages/server/src/agents/lead.ts` (+ `agents.test.ts`)

**Interfaces:**

```ts
// api/progress.ts: our API's shapes, for the page
export type AppRef = { projectId: string; name: string; slug: string }
export type Need =
  | { kind: 'question'; app: AppRef; conversationId: string; title: string; since: string }
  | { kind: 'down'; app: AppRef; from: string; owner: boolean }
  | { kind: 'answering-again'; app: AppRef; from: string; to: string }
  | { kind: 'change-failed'; app: AppRef; incidentId: string; at: string; owner: boolean }
export type SinceLine = Line & { app: AppRef }
// GET /api/needs[?projectId=]          → { needs: Need[] }            (records the visit, Decision 7)
// GET /api/since[?projectId=]          → { lastHere: string | null; lines: SinceLine[] }   (at most 5; records the visit)
// GET /api/apps/:projectId/history     → { from: string | null; gaps: { from: string; to: string }[]; lines: Line[] }
// DELETE /api/apps/:projectId          → 204                           (Decision 11)
// POST /api/apps/:projectId/conversations gains { fix: { outage: { from, to } }, token }
export const OUTAGE_FIX_WORDS = "Your students couldn't reach it"
// api/piece-state.ts: Asked.fix gains { outage: { from: string; to: string } }; Piece gains outage: { from; to } | null
// agents/lead.ts: the view's fix gains outage: { from: string; to: string } | null
```

- [ ] **Step 1: Tests, failing first.**
  - **`/api/needs`**: the person's conversations waiting on them (`chipOf` `attention`), on apps only (an intake is the
    conversation's own page); for each app whose kept members include the person: `down` (with `owner`), an
    `answering-again` for a day after the recovery, and a production `change-failed` whose incident has no fix under way
    (`fixUnderWay`) and is newer than the app's last `reached-students`; **another person's app is not in it** (Review
    Focus 5); `?projectId=` keeps to one app.
  - **`/api/since`**: lines after `last_here` across the person's apps, newest first, at most five; `null` `lastHere`
    gives no lines; the visit recorded (a second call within the hour answers the same `lastHere`).
  - **`/history`**: a member gets `from`, `gaps` and every line; a non-member `404`; an archived app's members still get
    it (kept members, no token).
  - **`DELETE`**: from another `Origin` `403`; a helper `404`; a stranger `404`; an owner `204`, the keeper's `forget`
    called, and **a round working on one of the app's conversations stopped first** (the line's `stop`, as `/stop`);
    the rows gone (`forgetApp`).
  - **The outage's fix**: `{ fix: { outage: { from, to } } }` with two moments, `from` before `to`, is kept as
    `OUTAGE_FIX_WORDS` with its fix; any other shape, or `to` before `from`, `400 CHANGE_INVALID`; `pieceOf` gives
    `kind: 'fix'`, `environment: 'production'`, `outage`; the round's view carries `fix.outage` and reads no incident;
    **the lead's prompt says there is no record of why and nothing it wrote can be read**, and asks it to look in the code
    (`agents.test.ts`).
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** `/needs` without the membership check (Review Focus 5
  red); `DELETE` for a helper (red); the outage's fix reading an incident (red). Each restored.
- [ ] **Step 5: Commit** `feat(server): what needs you, what happened since, an app's history, forgetting a deleted app; the outage's own fix`.

## Task 8: The page's calls, and the watch token minted (sitting 5)

**Files:**
- Create: `packages/web/src/screens/keeping/{watch.ts,watch.test.ts,role.ts,role.test.ts}`
- Modify: `packages/web/src/platform/{api.ts,api.test.ts}`, `packages/web/src/ours/{api.ts,api.test.ts}`,
  `packages/web/src/screens/name-it/name-it.tsx` (+ its test), `packages/web/src/screens/overview/overview.tsx`,
  `packages/web/src/screens/your-apps/your-apps.tsx`

**Interfaces:**

```ts
// platform/api.ts: Platform gains (each mutating one with an Idempotency-Key)
listMembers(projectId: string): Promise<Schemas['MemberList']>
revokeToken(tokenId: string): Promise<Schemas['Token']>                                  // (S1: M8) it answers the token
archiveProject(projectId: string, idempotencyKey: string): Promise<Schemas['Project']>
restoreProject(projectId: string, idempotencyKey: string): Promise<Schemas['Project']>
deleteProject(projectId: string, idempotencyKey: string): Promise<Schemas['DeletedProject']>  // (S1: M8) { id, slug, state: 'deleted', deletedAt }
// ours/api.ts: Ours gains (call() gains 'DELETE')
keeping(projectId: string): Promise<{ watching: boolean; until: string | null; tokenId: string | null; mine: boolean }>
handWatch(projectId: string, handed: { token: string; tokenId: string; expiresAt: string }): Promise<{ kept: 'new' | 'current' }>
needs(projectId?: string): Promise<Need[]>
since(projectId?: string): Promise<{ lastHere: string | null; lines: SinceLine[] }>
history(projectId: string): Promise<{ from: string | null; gaps: { from: string; to: string }[]; lines: Line[] }>
forget(projectId: string): Promise<void>
// startChange's fix gains { outage: { from: string; to: string } }
// screens/keeping/watch.ts
export const WATCH_NAME = 'Keeping watch'
/** Mints and hands over when none works, or under 30 days are left; never for an archived app. Never throws: a failure waits for the next visit. */
export function ensureWatch(platform: Platform, ours: Ours, project: Pick<Schemas['Project'], 'id' | 'state'>, now: Date): Promise<void>
export function useWatch(platform: Platform, ours: Ours, project: Schemas['Project'] | undefined): void
// screens/keeping/role.ts
export function useRole(platform: Platform, projectId: string | undefined, me: Schemas['Me'] | undefined): 'owner' | 'helper' | 'unknown'
```

- [ ] **Step 1: Tests, failing first** (a recording `Platform` and `Ours`).
  - **`ensureWatch`**: `watching: false` → `mintToken` with exactly `{ name: 'Keeping watch', capabilities:
    ['project:read', 'output:read'], expiresInDays: 365 }`, then `handWatch` with the secret, its id and `expiresAt`;
    `watching` with 200 days → nothing; with 20 days → a new one, and **`revokeToken` of the old one only when `mine`**;
    `handWatch` answering `current` → `revokeToken` of the one just minted (Review Focus 2); **`state: 'archived'` →
    nothing at all** (Review Focus 4); any refusal → nothing thrown, nothing shown.
  - **Where it runs**: the Overview and every app page (`useWatch`, once per project id); *Your apps*, once per card
    after its reads, one at a time; **Make it** (`name-it.tsx`), after `createProject` and the conversation's token,
    best-effort (a failure never stops Make it).
  - **`useRole`**: the member whose `userId` is `me.id`: `owner` → `owner`, `collaborator` → `helper`; not listed or a
    refusal → `unknown` (the page then shows no owner's button).
  - The five platform calls send what the contract says (method, path, `Idempotency-Key`). **(S1: M8) Assert what was
    sent, never what the mock answers**: its `mintToken` answers its example's capabilities (`project:read`,
    `build:create`, `release:deploy`) and `expiresAt` whatever is asked (FE-27's way).
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** minting for an archived app (red); the other
  person's token revoked (red). Each restored.
- [ ] **Step 5: Commit** `feat(web): the Keeping watch token, minted when an app has none — never for one switched off`.

## Task 9: *Your apps* and the Overview: the band, *Since you were last here*, the card's states, the history (sitting 5)

**Files:**
- Create: `packages/web/src/screens/keeping/{lines.ts,lines.test.ts,needs.tsx,since.tsx,how.tsx,keeping.test.tsx}`,
  `packages/web/src/screens/history/{history.tsx,history.test.tsx}`
- Modify: `packages/web/src/screens/your-apps/{model.ts,model.test.ts,your-apps.tsx}`,
  `packages/web/src/screens/overview/{overview.tsx,overview.test.tsx}`, `packages/web/src/{router.ts,router.test.ts,
  app.tsx,words.ts,app.css}`

**Interfaces:**

```ts
// screens/keeping/lines.ts: pure
export function lineWords(line: Line, timeZone?: string): string            // 'Went live' … (Words proposed for Rich)
export function needWords(need: Need, timeZone?: string): { says: string; button: { label: string; href?: string } | null }
// router.ts
| { name: 'app-history'; slug: string }                                     // /apps/:slug/history
// your-apps/model.ts: AppCard gains
switchedOff: string | null      // archivedAt, in words: 'Switched off, 12 December'
unreachable: string | null      // a `down` need's time: the students' fact turns attention
```

- [ ] **Step 1: Tests, failing first.**
  - **`lineWords`** for every `Happening` kind (the table in *Words proposed for Rich*), with `who` and without;
    `answering-again`'s minutes; **`machineryIn` empty over all of them**.
  - **The band** (`needs.tsx`): none → not drawn; each `Need` kind its sentence and button: `question` → the
    conversation; `down` → **[Start it again]** for an owner (Task 10's press), *An owner can start it again.* for a helper
    (Review Focus 5); `answering-again` → **[What happened?]**; `change-failed` → **[Give this to your agent]**, F5's
    `WhatWentWrong` path; and **the page's own**: an app built and not launched whose checklist has an `attention` row →
    *something on its way to your students needs you*, [Going live]. On *Your apps* every app's; on the Overview its own.
  - **Since** (`since.tsx`): `lastHere` null or no lines → not drawn; up to five lines, each naming its app on *Your apps*
    (a link to its history), not on the Overview, which has **[Everything]**.
  - **The card**: `archivedAt` set → *Switched off, 12 December* and the students' fact *Switched off*; a `down` need →
    the students' fact *attention*, *Your students can't reach it, since 10:03*.
  - **The history page** (`/apps/:slug/history`): its title, every line grouped by day (the person's time zone), *From
    18 September.* at its foot, each gap's sentence in its place, *We can't reach Manifest just now. Nothing of yours has
    changed.* when the read fails; a `404` is the page's *There's nothing here.*
  - **How we keep watch** (`how.tsx`): a closed `Disclosure` on the Overview of a launched app; its words.
  - **The router**: `/apps/x/history` parses; nothing else moves (F4's and F5's addresses still parse).
  - `machineryIn(text())` empty on *Your apps*, the Overview and the history page, closed disclosures excluded.
- [ ] **Step 2: Red. Step 3: Implement.** Each page reads `ours.needs()` / `ours.since()` beside its platform reads, and
  a failure of ours loses the band or the lines, never the page.
- [ ] **Step 4: Green; controls:** a helper shown the button (red); `since` drawn with `lastHere` null (red); a
  staging line leaking a machinery word (red). Each restored.
- [ ] **Step 5: Walk it** against the mock at 1440 and 375 (headless Chrome, as every sitting), with DevTools rewriting
  our `/api/needs` and `/api/since` answers for each kind.
- [ ] **Step 6: Commit** `feat(web): coming back — what needs you, what happened since, an app's history, and what we can't see`.

## Task 10: *Start it again*, and *What happened?* (sitting 6)

**Files:**
- Create: `packages/web/src/screens/keeping/{start-again.tsx,start-again.test.tsx}`
- Modify: `packages/web/src/screens/keeping/needs.tsx`, `packages/web/src/screens/overview/overview.tsx`,
  `packages/web/src/router.ts` (`then`), `packages/web/src/words.ts`

**Interfaces:**

```ts
// router.ts
export type Then = 'live' | 'dry-run' | 'start-again' | 'students' | 'switch-off' | 'delete' | null
| { name: 'app-overview'; slug: string; then: Then }
// screens/keeping/start-again.tsx
export function StartItAgain(props: {
  platform: Platform; ours: Ours; project: Schemas['Project']; arrived: boolean   // arrived: then=start-again
  onDone(): void
}): JSX.Element
export function WhatHappened(props: { ours: Ours; project: Schemas['Project']; from: string; to: string }): JSX.Element
```

- [ ] **Step 1: Tests, failing first** (a recording `Platform`, fake timers; S1's M6 for the shapes).
  - **The press** reads production's `getEnvironment` and **deploys exactly its `instance.releaseId` to production's
    environment id**, with an `Idempotency-Key`; F5's `Stations` on the new instance, under *Nobody has lost anything:
    your students' address keeps what it has until this answers.*; healthy → *It's answering again.*;
    `failed` → F5's words and *[What went wrong]* (F5's `WhatWentWrong`, this attempt's incident).
  - **The step-up**: `STEP_UP_REQUIRED` → F5's `StepUpCard` with `returnTo` `/apps/<slug>?then=start-again`; arriving
    with it → *You're signed in again.* and the button, the address without `then` (`remember`); never pressed by
    itself.
  - **`RELEASE_NOT_STAGED`**: the question with both dates (staging's serving release and production's); *Start the
    newer one* deploys **staging's** release to production; *Put <date>'s back first* deploys production's release to
    staging, waits for its end, then to production (the step-up between if asked). Any other refusal: F5's words.
  - **What happened?** posts `startChange` `{ fix: { outage: { from, to } } }` with a freshly minted conversation token
    (as *[What went wrong]* does) and opens the conversation; pressed again, the same conversation (our route, as
    `fixFor`).
  - A helper never sees the press (the band's own test, Task 9); `machineryIn` empty.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** the release read at page load rather than at the
  press (red); staging's release sent on the first press (red); `then` left in the address (red). Each restored.
- [ ] **Step 5: Walk it** against the mock with DevTools rewriting: a `403` first, the fake step-up back, the stations,
  `RELEASE_NOT_STAGED`.
- [ ] **Step 6: Commit** `feat(web): Start it again — the same version, with a second sign-in; and What happened?`.

## Task 11: Switching it off, back on, and deleting a draft (sitting 6)

**Files:**
- Create: `packages/web/src/screens/overview/{switching.tsx,switching.test.tsx}`
- Modify: `packages/web/src/screens/overview/overview.tsx`, `packages/web/src/screens/your-apps/{your-apps.tsx,model.ts}`,
  `packages/web/src/app.tsx` (the Overview told to re-read its project: `useApp`'s `retry`), `packages/web/src/words.ts`,
  every screen that maps a refusal code to words (`PROJECT_ARCHIVED`)

**Interfaces:**

```ts
// screens/overview/switching.tsx
export function Switching(props: {
  platform: Platform; ours: Ours; project: Schemas['Project']; role: 'owner' | 'helper' | 'unknown'
  then: Then; onChanged(): void   // useApp's retry
}): JSX.Element | null            // null unless an owner
export function SwitchBackOn(props: { platform: Platform; ours: Ours; project: Schemas['Project']; onChanged(): void }): JSX.Element
export function StartForStudents(props: { platform: Platform; project: Schemas['Project']; arrived: boolean; onDone(): void }): JSX.Element
// words.ts: refused.archived = (name) => `${name} is switched off. Switch it back on first.`
```

- [ ] **Step 1: Tests, failing first.**
  - **Only an owner** sees *Switching it off*; a helper and `unknown` see nothing of it (Review Focus 5).
  - **[Switch it off]**: the confirming step's words, **[Keep it running]** closes it; `archiveProject` with an
    `Idempotency-Key`; `STEP_UP_REQUIRED` → the step-up card, `returnTo` `/apps/<slug>?then=switch-off`; arriving → the
    confirming step again with *You're signed in again.*; `500 PROJECT_TEARDOWN_INCOMPLETE` → **the request once more by
    itself**, then the words if still incomplete; success → `onChanged()`.
  - **Switched off** (the project `archived`): *Your apps*' card and the Overview show **[Switch it back on]** for an
    owner; `restoreProject`, **no step-up**; then `ensureWatch` at once (Task 8); a launched app → *It's back, but not
    running yet.* and **[Start it for your students]**; never launched → *It's back. Your draft starts again the next
    time we work on it.*
  - **[Start it for your students]**: the last-served release (S1's M4: production's newest instance by `createdAt`, its
    `releaseId`) deployed to staging, its end awaited, then to production with the step-up (`then=students`); a refusal
    with the checklist → F5's words and a link to *Going live*.
  - **[Delete it]** only when `launchedAt` is null: the confirming step's words, **[Delete it for good]**, the step-up
    (`then=delete`), `deleteProject`, then `ours.forget`, then *Your apps*; `409 PROJECT_LAUNCHED_NOT_DELETABLE` → its
    sentence. **A launched app** shows the FE-45 sentence where *Delete it* would be, and no button.
  - **`PROJECT_ARCHIVED`** anywhere it can arrive (a change asked, *Trying out*, *Going live*'s presses): *Reading
    responses is switched off. Switch it back on first.*
  - `machineryIn` empty.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** *Delete it* on a launched app (red); the restore
  asking a step-up (red); the teardown not repeated (red); a helper shown the section (red). Each restored.
- [ ] **Step 5: Walk it** against the mock (`MANIFEST_MOCK_LAUNCHED` unset, then `=1`), DevTools rewriting the
  refusals.
- [ ] **Step 6: Commit** `feat(web): switch it off, have it back, start it for your students; delete a draft that never went live`.

## Task 12: The acceptance (sitting 7, alone)

- [ ] **Step 0:** the platform's landings; re-read `openapi.json`.
- [ ] **Step 1: Against the mock and Mailpit.** `scripts/check-keeping.sh`, beside `check-going-live.sh`, in two halves:
  1. **Our API, as the browser drives it** (curl against `pnpm dev:mock`, as the other scripts): a token minted on the
     mock and handed over (`201`), handed again (`200 current`); `GET …/keeping` `watching: true`; another `Origin`'s
     post to each new route `403 ORIGIN_REFUSED`; `/api/needs`, `/api/since`, `…/history` answer their shapes; the
     outage's fix kept with its words; `DELETE` for the owner `204` and the app's rows gone; **no `mft_` and no `sk-` in
     any table**, `watch_tokens` holding a sealed value only.
  2. **The keeper, in-process** (`scripts/check-keeping.ts`, run by `tsx`): our real store on a scratch file, **real
     email to Mailpit** (`smtp://127.0.0.1:7111`), a scripted `ProjectStream` and a pretend live address on a free
     port outside 7100–7199 (`node:http`, made to answer `302`, then `502`, then `302`). Asserted from Mailpit's API
     (`GET /api/v1/search?query=subject:…`, our own subjects): *can't reach* once, *answering again* once, *a change
     didn't go live* once for a launched app and none for one not launched, *who's on it changed* to the other owner and
     not the actor; **a restart of the keeper mid-outage sends no second email**; the replay of the same events sends
     nothing. Then our messages deleted from the shared inbox (`DELETE /api/v1/messages` with their ids).

  **Negative controls, each red:** the actor emailed; a second *can't reach* after a restart; a token in the clear in
  `watch_tokens`; the probe running in mock mode.
- [ ] **Step 2: The whole-branch review** (a fresh reviewer, read-only, dispatched at the sitting's start so its fixes
  land before the real platform), its findings fixed test-first.
- [ ] **Step 3: On the real platform** (at Rich's word, in the platform's window, telling the platform session; our
  server in edge mode, `MANIFEST_APP_SMTP_URL` at Mailpit). Headless Chrome through `https://app.manifest.internal`,
  signed in as `instructor`, at 1440 and 375, on an app launched for it (Task 1's M0):
  - *Your apps* and the Overview with nothing needing them; a second person (`colleague`) added as an owner by the
    platform's own means, and the *who's on it changed* email;
  - **the fall**, at Rich's word (Task 1's M6): the container stopped; within about two minutes the email and the band;
    **[Start it again]** with the step-up (**Rich types**); *answering again* and its email; **[What happened?]**'s
    conversation;
  - **switch it off** (step-up), the students' address answering `410`, the card; **back on**, the watch minted again;
    **[Start it for your students]**; the history page with every line and no false gap;
  - a draft made for it, then **deleted**, its slug free;
  - every email in Mailpit, read and recorded word for word.
- [ ] **Step 4: Rich's click:** his own app (or the walk's), fallen and started again from the email; switched off and
  back.
- [ ] **Close:** the gates twice; the dated entry; this table; ORIENTATION; the roadmap. **F6 is executed only when
  Step 4 is done.** Then F6b is written (D1).

---

## What this plan does not build

- **Moments 17 and 18, and the *Agents* screen**: F6b (D1). So also: an agent's own question in the band; collaborators
  seeing each other's conversations.
- **F5b's actions**: drafting and sending the registrations, asking for sign-off. F6 tells them when those waits end.
- **A digest, quiet hours, or turning an email off** (D3).
- **Repository warnings** (`repository.secret_detected`, `visibility_enforced` and the rest): kept in `history`, never a
  line, an email or a need in F6.
- **Removing an app that has been live** (FE-45) and **a copy of what students wrote**: the platform's.

---

## What executing this plan found

### 2026-10-01 — The plan written, with Rich (session `manifest-app-34`, documents only)

- **The design first**, at Rich's word (*"yes please"* to start F6; superpowers:brainstorming): six sections approved one
  by one, then the written design (`b654573`), reviewed: *"looks good"*. Rich decided D1–D7 in it, FE-45 among them
  (`46aed71`), carried to `manifest-8e` for the platform's record (`manifest-60` not running).
- **The platform's sitting 7 ran meanwhile** (`manifest-8e`, 7100 its own): its contract commit `6cbb489` and fix wave
  `dec71d8` adopted with no change of ours (`5f32f1e`, `03c5323`); we stayed mock-only, as agreed with it.
- **Read for this plan:** our server's store, guards, routes, hub, stream, work and round's fix; the page's platform and
  our API, the router, *Your apps*, the Overview, F5's step-up card and press; the contract's token, member, archive,
  restore, delete and event shapes (FE-11 is built: `member.removed` revokes the member's tokens and closes their
  streams).
- **Not yet measured** (Task 1): every `machineDetail` F6 reads; a CWL app's students' address through the edge;
  archive's and restore's effects on production and on the deploys after.

### 2026-10-01 — Sitting 1, its first part: what needs no 7100 (session `manifest-app-34`)

- **Rich approved the plan** (*"yes approved. native."*) and asked for sitting 1 in this session, **holding for 7100
  until the platform's sitting 7 (`manifest-8e`) says our work would not affect it**. Asked it (impact, when it closes,
  the shortest way to a launched project, and whether stopping one app's container is safe for its state); **holding**.
- **F5's measurement scripts survive** in session `dd912ad6`'s scratchpad (`s6/lib.mjs`: the three sign-in hops and the
  step-up from Node; `s6/admin.mjs`: the administrator as `operator`, by script; `s6/step6-walk.mjs`: a launch walked).
  Sitting 1 copies them into its own scratchpad rather than writing them again.
- **M1: the contract.** 1.5.0, **69 operations**: the platform's sitting 7 contract commit (`6cbb489`) and fix wave
  (`dec71d8`) adopted with no change of ours (`5f32f1e`, `03c5323`). Nothing F6 calls moved.
- **M8: the mock** (7102, `MANIFEST_MOCK_LAUNCHED` unset), with any Bearer or the mock's session:
  - `mintToken` → the example: id `77777777-…`, capabilities `project:read`, `build:create`, `release:deploy` **whatever
    was asked**, `expiresAt` `2026-12-18T09:00:00.000Z`, a secret `mft_…`. **Tests assert what we sent** (Task 8,
    corrected **(S1)**);
  - `listMembers` → one owner, *Instructor One*, `instructor@example.test`, `cwlLogin` `instructor`;
  - `getProject?expand=environments` → `active`, `launchedAt` null; production's `url`
    `https://mock-app.manifest.internal`, its `instance` null;
  - `archiveProject` → `200` the project `archived`, `archivedAt` now; `restoreProject` → `200` `active`, `archivedAt`
    kept: **no step-up asked** of either (the mock asks none, FE-40);
  - `revokeToken` → `200` for its own token's id, `404` for another (as the contract: only the minter's);
  - `deleteProject` → **`200` `{ id, slug, state: 'deleted', deletedAt }`** (`DeletedProject`), not an empty body (Task 8,
    corrected **(S1)**); the mock keeps nothing, so the project reads as before afterwards;
  - the event stream's URL by `GET` with a Bearer → `426` (the token is good; it wants a WebSocket).
- **`manifest-8e`'s answer** (2026-10-01, ~16:15Z): **(a) it conflicts, hold**: its `pnpm test` truncates the control
  database, and the control plane on 7100 is stopped until its close, **expected ~16:40–16:50Z**; it messages when 7100
  is up, and nothing of ours starts before. **(b) The shortest honest way to a launched app** is the sequence in
  manifest's `packages/journey/src/production.ts`, **read, never run** (`make demo-production` would make `launch-app`
  on real GitHub): the owner (`instructor`) creates a CWL project, commits a CWL manifest, builds, releases, deploys
  staging; `operator` signs in once, `scripts/admin-grant.sh grant opr000001` (**Rich's to run or approve**:
  `MANIFEST_ADMIN_PUIDS` is not set), signs in again; the administrator records the assessment `submitted` → `approved`
  and **production's** registration `submitted` → `active` with exactly the derived values (`entityId`
  `https://manifest.internal/sp/<slug>/production`, the production hostname's ACS and SLO with the manifest's paths,
  `registeredAttributes` ⊇ the manifest's); the dry run, stepped up; the approval, stepped up, preview first; the
  owner's production deploy, stepped up. Its sitting 7 adds nothing to that path (drafts and submissions are the owner's;
  the gate reads only the administrator's records). The scans' database is fresh until 2026-10-06. **(c) Stopping one
  app container** (`docker stop mf-…`, never a `manifest-*` one) is safe for the platform: the instance keeps reading
  `healthy` (FE-4), the edge answers `502`, a redeploy retires it; `scripts/dead-app-resources.sh` after, if anything is
  left. **And:** the platform's sitting 8 truncates at its first Vitest, so `f6-watch` (launched, never deletable) will
  need removing on github.com afterwards. **FE-45 confirmed by Rich** in its session (*"Yes, confirmed."*).
- **Rich's three answers** (2026-10-01, ~16:15Z): **the admin grant** is asked of the platform session once `operator`
  has signed in (as F5's acceptance did); **yes, make `Manifest-local-dev/f6-watch`** (launched, so it will need removing
  on github.com after the platform's sitting 8 truncates; the second project, a draft, is deleted by `deleteProject`);
  **yes, stop the live app's container in sitting 1** (M6: one `mf-…` container, never a `manifest-*` one; then the
  redeploy, and `dead-app-resources.sh` if anything is left).
