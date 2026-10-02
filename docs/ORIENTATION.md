# Orientation — read this first

**What this is.** The single entry point to `manifest-app`, for an agent with an empty window or a developer
joining. **The next job is always in the current plan's sittings table**, and [`plans/roadmap.md`](./plans/roadmap.md)
says which plan is current. This file states where things stand and the rules. It states no sitting's story.

**Where things stand** *(2026-10-02, ~00:15 PDT: **F6's sitting 7, part one (unattended) is done**: the acceptance in mock
mode, the whole-branch review with its two Important fixed, the morning staged; **the walk on 7100 and Rich's click are
owed, at his word**: F6 is not executed until then. Rich's overnight queue, coordinated by `manifest-app-3a`; the freeze is
07:00 PDT, his demo ~09:00)*:

- **YOUR JOB, IF YOU ARE THE NEXT SESSION: F6's sitting 7, part two: Task 12's Steps 3 and 4, AT RICH'S WORD**, natively
  (superpowers:executing-plans).
  1. **First, `ListAgents`**: tell the running platform sitting your name, and ask it for a window on 7100 (Rich's word
     first, every time). Then `pgrep -fl vitest`, and Step 0 (contract 1.5.0, 72 operations at `8ff925f`; re-read
     `openapi.json` if manifest has moved).
  2. **Read** the plan's entry *Sitting 7, part one*: **"The walk on 7100: what it needs from Rich"** (his word; our server
     to edge mode, said; his yes to the walk typing the laptop IdP's test passwords; the administrator's grant; his word for
     the fall) and **"Rich's click, click by click"** (every screen and every email's words). **7100's database is empty**:
     the walk makes its own app (`make`, `launch`) before anything else.
  3. **Run `scripts/walk/keeping-7100.ts` step by step** (its header: `check`, `people`, *(the grant)*, `make <slug>`,
     `launch`, `quiet`, `members`, `fall --stop`, `switch`, `draft`, `mail`). It was smoke-tested on the mock only: **its
     first run on 7100 is its proof**, and a step that meets a surprise stops with the answer in its log (§7: a walk's own
     bugs cost runs). Then Rich's click (Step 4), **at least 30 minutes after the walk's recovery** (Review Focus 3).
  4. **Close:** the gates twice; the dated entry; the table (**F6 executed when Step 4 is done**); this file; the roadmap;
     then F6b's plan (D1). Put our server back in mock mode only if the next sitting needs it, and say so.
  - **A background session in a sibling worktree** (sittings 6 and 7): `git worktree add -b <branch>
    /Users/rich/Developer/manifest-app-<name> main` (never under `.claude/worktrees/`: `link:../manifest` must resolve),
    `pnpm install --offline --frozen-lockfile` there; **keep the session's directory in the main checkout and edit by
    absolute path inside the worktree** (never the worktree tools: one asks a permission only Rich can answer); git, tests
    and prettier there by `cd`; land each task with `git merge --ff-only <branch>` from the main checkout after `git
    status` there; at the close `git worktree remove` and `git branch -d`. **A background session ends after ~60 minutes
    idle**: commit what is finished before a long hold.
  - **Sitting 7, part one is done** (`manifest-app-s7`, overnight; `2b0cb70`, `fca7e49`, `d3600be`): `check-keeping.sh`
    8/8 and 12/12 with the plan's four controls (the actor, a restart, a token in the clear, the probe in mock mode), the five
    others pass, on `main` after the fixes too. **The whole-branch review** (opus, `03c5323..3ae288c`): no Critical; **I1**:
    a switch-off closes the watch `4401` before `project.archived`, so our server went on saying a switched-off app was
    down: **the page keeps a switched-off app's questions alone, by the platform's state** (`lines.ts`'s `needsStillTrue`);
    **I2**: our kept members go stale when the watch dies: **an app we no longer watch trusts the token handed over**
    (`hand` answers `stranger` for someone not among its members), and ***Your apps* draws needs and lines only for the
    apps the platform lists**; **FE-48** written. Nine minors: m64–m71 in `minors.md`, and one ruling (`400` over the
    design's `422`). **`scripts/walk/keeping-7100.ts`**, the walk on 7100, staged. 2193 tests twice.
  - **Sitting 6 is done** (`manifest-app-s6`, `dc3e8e6`, `c864e7d`, `635be85`, `047d6a7`, `f0429f1`): **`screens/keeping/start-again.tsx`**
    (*Start it again*: production's own version read at the press, F5's step-up back to `?then=start-again`,
    RELEASE_NOT_STAGED's choice; *Start it for your students*, its second mode; *What happened?*, the outage's fix found again
    by **our route `GET /api/apps/:projectId/outages/:from/conversation`**); **`screens/overview/switching.tsx`** (*Switching
    it off*, an owner's alone: the repeat on `PROJECT_TEARDOWN_INCOMPLETE`, *Delete it* for a draft, FE-45's sentence for a
    live app; *Switch it back on* on the Overview and *Your apps*' card); **`screens/change/notice.tsx`** and `pressFailed`'s
    `archived` (`PROJECT_ARCHIVED` said one way on every press); `useApp`'s `refresh`; the router's `Then`, each page its
    own. **The walk found the hand-over shown while the app is not running** (fixed, `635be85`, for Rich); **a fresh review
    of the sitting** found three Important (`PROJECT_ARCHIVED` on the plan and building screens, an unfinished delete, a
    press reading on after its page had gone), fixed (`047d6a7`). 2183 tests; the five acceptance scripts pass from a
    fresh dev database.
  - **Sitting 5 is done** (`manifest-app-00`, `ed8c6af`, `c20cfff`): the page's five calls (`listMembers`, `revokeToken`,
    `archiveProject`, `restoreProject`, `deleteProject`) and `Ours`' keeping routes; **`screens/keeping/watch.ts`**
    (`ensureWatch`, `useWatch` in the shell, `ensureEach` on *Your apps*; never for an app switched off) and **`role.ts`**
    (`useRole`); **`lines.ts`**, **`needs.tsx`** (the band), **`since.tsx`**, **`how.tsx`**;
    **`screens/history/history.tsx`** at `/apps/:slug/history`; the card's `switchedOff` and `unreachable`. **Words marked
    "ours" in `words.ts` wait for Rich's word.** `check-keeping.sh` (`manifest-app-47`): half one 8/8, half two 12/12.
  - **Sitting 4 is done** (`manifest-app-00`, `238e6a0`, `5d95181`): **`keeping/outage.ts`** and **`probe.ts`**: the
    keeper looks once a minute at each launched, switched-on, kept app (never in mock mode); down after two misses;
    **answering again declared at the third answer and dated from the first**; a fall within 30 minutes of a recovery,
    and its recovery, told to nobody; `410` off; a restored app watched again from its first answer; `outage(projectId)`.
    **`api/keeping.ts`**: `GET /api/needs` and `/api/since` (each load a visit), `GET /api/apps/:projectId/history` (**a
    member's alone**), `DELETE /api/apps/:projectId` (an owner's); `AppRef`, `Need`, `SinceLine` in `progress.ts`; the
    outage's fix (`{ fix: { outage: { from, to } } }`; its lookup route built in sitting 6). **Rich approved the email
    bodies with three tidy-ups (A, B, C)**; `manifest-app-3a` makes that edit after sitting 4: check `git log` for it.
  - **Sitting 3 is done** (`manifest-app-fc`, `b4cfb9f`, `bacf85c`): `keeping/happenings.ts` (an event read into a
    `Happening`; `linesOf(entries, members, launchedAt)`, **its third argument the kept app's `launchedAt`**; `Line`
    gains `whom`); the emails (`keeping/emails.ts`, `words.ts`, `mail.ts`), **nodemailer 10.0.13, our first new
    dependency since F1**, to `MANIFEST_APP_SMTP_URL` (Mailpit by default), once each by the `emails` table, tried again
    for an hour; **the first replay of an app never watched emails nobody** (its past); *your work is waiting* only for
    a kept app, so **nothing is emailed until Task 8 hands a watch token over**. **The email bodies wait for Rich's word**
    (the subjects and last lines are those he approved). A real send reached Mailpit.
  - **Sitting 2 is done** (`manifest-app-28`, `ecec79e`, `361058d`): the store's version 5; the watch token sealed
    (`keeping/seal.ts`; the laptop's key `packages/server/.keys/keeping.key`, git-ignored); the keeper (`keeping/keeper.ts`),
    one stream per kept token, every event once to `history` at its own time, its gaps and refusals;
    `GET`/`POST /api/apps/:projectId/keeping`. F3's `platformStream` gained each event's `at` and an optional `replayed`
    report.
  - **The plan was approved by Rich, 2026-10-01** (*"yes approved. native."*); the design section by section (*"looks
    good"*). **Rich's decisions:** two plans, **F6 *Keeping watch*** (moments 16, 19, 20) now and **F6b *Working on it
    together*** (17, 18, *Agents*) after; the watch token kept on disk, sealed (F2's Decision 1 amended for it alone);
    four kinds of email; the keeper inside our server; nodemailer; our own live-address watch; only a never-live app
    deleted by its owner (FE-45, confirmed by Rich, for the rest).
  - **Sitting 1 is done** (`manifest-app-34`, 16:46–17:10Z on 7100): Tasks 3, 4, 6 and 11 corrected (S1). **`f6-watch` is
    gone from 7100** (the platform's sitting 8 truncated its database; `manifest-8d` removed its six containers, networks,
    volumes and image): **its repository `Manifest-local-dev/f6-watch` is owned by no project, for Rich to delete on
    github.com.**
  - **F5b is designed and planned**, ahead of the platform's sitting 10, at Rich's word (`manifest-app-d9`): the design
    [`plans/2026-10-01-f5b-the-clocks-design.md`](./plans/2026-10-01-f5b-the-clocks-design.md) (`d5aa9e8`), the plan
    [`plans/2026-10-01-f5b-the-clocks.md`](./plans/2026-10-01-f5b-the-clocks.md) **APPROVED BY RICH, native** (`d4d3c2b`,
    `63681ca`): five sittings, **part one after F6** on today's contract (sitting 1 measures on 7100; sitting 2 the three
    steps in UBC's order, the band, *Trying out*'s line, the sign-off request), **part two when FE-46 lands** (its
    acceptance also after the platform's sitting 10). **F6b's design is approved by Rich**
    ([`plans/2026-10-01-f6b-working-together-design.md`](./plans/2026-10-01-f6b-working-together-design.md), `c47ea4b`,
    `df24be7`: *"See all, act on your own"*; the *Agents* screen honest; FE-47 and FE-5 (a) carried); its plan after F6
    (D1). Two facts under the walk-through moved (the design carries them into `walkthrough.md` with its plan): moment
    18's *"keeps its access until it expires"* is untrue since FE-11, and moment 17's *"weeks"* is *"several days"*.
  - **The prep sessions** (Rich started three on 2026-10-01 to work ahead; their commits are on `main`):
    `manifest-app-d9` (the contract digest's addendum `2d94516`, F5b, F6b's design: done); `manifest-app-47`
    (`scripts/walk/`, `8a63767`, `1b82119`; **`scripts/close-out.sh`, `2a53a6d`, dry-run only until Rich reviews it**; **Task
    12's `scripts/check-keeping.ts` (`cf2d2b2`) and `.sh` (`95216ca`)**, and `KeeperDeps.lookEveryMs` (`cfc194f`): sitting 7
    runs them); `manifest-app-3a` (the faculty-ready adoption note `3529411`; `docs/minors.md` `1f14057`, `7cda1ef`; the
    email edit `a7f5542`; **tonight's coordinator**).
  - **Every landing:** re-read `openapi.json`, `pnpm typecheck`, `pnpm test`, and record it the same day (§8). Every
    session starts with `pgrep -fl vitest`. **Restart `pnpm mock`** after a landing that moves the mock's fixtures.
- **F4a, executed** ([`plans/2026-09-29-f4a-only-faculty-build.md`](./plans/2026-09-29-f4a-only-faculty-build.md), its
  sitting 1 entry is the record): the platform decides (`Me.mayBuild`, its 5a); our server refuses a new start
  (`403 BUILDING_NOT_OPEN`, a `getMe` with no decision building as today); someone who may not build and keeps no app sees
  *"Manifest isn't available to you at the moment."* wherever they arrive; someone who keeps apps has them, without
  *Start something new*. **Rich's click** (2026-10-01, ~06:50Z, in `manifest-92`'s 7100 window): *"all works as expected"*.
- **F5, executed** ([`plans/2026-09-29-f5-going-live.md`](./plans/2026-09-29-f5-going-live.md)): moments 10–15, Rich's own
  app live on 7100 (*Class check-ins*, 2026-10-01 03:45Z). The platform's truncations have since removed it from 7100.
- **Open for Rich:**
  - **FE-44** (written, not carried): a large course's (several sections, ~5,000) or a public app can never launch on the
    platform today: its load rehearsal is blocking and not built. Options (a) build it first, (b) not-built stops blocking,
    (c) say so earlier.
  - **FE-43**'s read half (nothing reads a dry run back; the platform's half, `REHEARSAL_RUNNING`, landed).
  - **FE-46, FE-47 and FE-5 (a)** (written 2026-10-01 in `manifest-app-d9`'s session): **CONFIRMED by Rich in
    `manifest-6d`'s session** (19:56 PDT, manifest `ddc76d7`). **Each needs a spec action** (the platform's planning session)
    before any platform task builds it; F5b's part two waits for FE-46, F6b's moment 17 for FE-47.
  - **`scripts/close-out.sh`** (`manifest-app-47`, `2a53a6d`): review it before anyone runs it for real (only `--dry-run`
    so far).
  - **F6 sitting 5's words marked "ours"** (`words.ts`, `keeping`): who did it (*"Alice added Dan New"*, *"Alice made Dan
    a helper"*, *"Alice took Bob off it"*, *"Alice switched it off"*, *"…back on"*, *"…renamed it from …"*), *"What needs
    you"*, the history's *"Nothing has happened yet."* and *"Try again"*.
  - *F6 sitting 6's words marked "ours" and the hand-over held back while the app is not running: **approved by Rich**
    (2026-10-01, ~22:35 PDT, `3ae288c`).* Its deferred minor stays deferred (*Your apps*' card keeps *"Switched off"* as its
    students' fact after a restore, until started).
  - **F6 sitting 7, part one's** (the plan's entry): **FE-48** (written, not carried: a watch's `4401` carries no reason,
    and the change behind it never arrives; the residual is a former member's hand-crafted reads of an app's history, and
    our `DELETE`, until another member visits); **the walk on 7100 and his click** (the entry's two lists: his word, the
    edge-mode switch, the test passwords typed by the walk, the grant, the fall); afterwards **the walk's launched
    repository `Manifest-local-dev/<slug>`** to delete on github.com; a note: `GET /api/needs` and `/api/since` each record
    a visit, so a same-site page could move *last here* and hide *Since* lines (Decision 7's, kept); m64–m71.
  - **The platform's F8** (a provider's `422` as `200` `null`): its faculty-ready plan fixes it. **Ours reads a plain
    `422` and `200 null`, but not a refusal that arrives mid-stream**: `model/stream.ts` reads any `error` chunk as
    `MODEL_UNREACHABLE`, so the page would say *"We can't reach the model"* (`manifest-app-3a`; `docs/minors.md`'s m62). A
    small fix of its own; the platform's Task 1 [M3] decides which form arrives.
  - **F5 sitting 6's decisions** (that plan's two sitting 6 entries): the capable model's view 120,000; the
    blocking-not-built row's words; the intake's audience ceilings; *"A dry run is already running…"*.
  - **Removing the real repositories** `Manifest-local-dev/my-answers` and `class-check-ins` (and the older `f5-reading`,
    `lp-real-a` if they remain), when he wishes.
  - **Deferred minors: [`minors.md`](./minors.md)** (`manifest-app-3a`, `1f14057`): every plan's, each checked against
    the code (61 still true; F3's and m15 were only in git-ignored ledgers, so this is their one committed record), for
    Rich to choose from. *The 375 focus ring was no defect*: F4a's walk matched `<body>` (`16a79b1`).
- **Done so far:** **F1** (2026-09-27), **F2** and **F3** (2026-09-28), **F4** (2026-09-29), **F5** (2026-09-30/10-01),
  **F4a** (2026-10-01): Rich clicked each on the real platform. The walk-through is the design ([`walkthrough.md`](./walkthrough.md)).
- **The platform** (the sessions in `/Users/rich/Developer/manifest`; §8):
  - **Who is who** *(names change at every handover: `ListAgents` first)*: `manifest-60` its planning session (Rich's
    decisions, anything cross-repo); `manifest-8e` ran its sitting 7 (closed; its session ended 17:10Z); `manifest-8d` ran its sitting 8 (Task 11; **closed at `c5116e0`**, 2026-10-01); `manifest-6d` ran its sitting 9 (Task 12; **closed at `4a6f6c6`**, 2026-10-01, `a1d4baa` and its fix wave `a230c1a` adopted); `manifest-3d` ran its sitting 10 (Tasks 13 and 14; **closed at `8ff925f`**, 2026-10-01, ~22:00 PDT): the mock's `0969d45` (real packages and a draft in the records' fixtures, the ACS `/auth/ubcshib/callback`, the launch-path operations refusing as the platform would with no option set, FE-40's opt-in switches `MANIFEST_MOCK_RECORDS`, `_STEP_UP`, `_APPROVAL`, `_REHEARSAL`, `_QUEUE`), the console's `e55b0bf`, the text pass `b571471` (1.5.0, text only: no section, decision or phase cited), `9e43588` and the fix wave `6d76459` (the mock plays the gate while a launch is scripted; `_STEP_UP` asks a session only): **each adopted with no change of ours** (F6 sitting 6); its sitting 12 (Task 15, the acceptance) next, not running; a new session of ours tells the running platform sitting its own name; `manifest-s5-b3` Rich's S5 spike,
    **finished** (2026-10-01, its findings at manifest `0bb544c`): nothing of it runs, and it no longer needs telling of
    our test runs.
  - **Its launch-path plan**: sittings 1–5, 4a, 5b and **5a CLOSED** (`003adf7`: `Me.mayBuild`, `403 BUILDING_NOT_OPEN`,
    `409 MEMBER_MAY_NOT_BUILD`, `MANIFEST_ADMIN_PUIDS`; the mock's `MANIFEST_MOCK_MAY_BUILD=0`; the laptop's `student` may
    not build, `instructor` and `colleague` may, `operator` only as an administrator). **Mailpit landed** (`8155bcf`).
    **Sitting 6 CLOSED** (`manifest-92`, Task 9, `d54e1e1`; fix wave `db2ddbf`): two operations, `submitIamRegistration`
    and `submitPrivacyAssessment`; five codes; `since`, `stagingRegistration`, `submittedAt`/`submittedBy` (adopted in our
    test data, `f8dcfbc`; nothing else of ours moved). **Sitting 7 CLOSED** (`manifest-8e`, Task 10: `draftIamRegistration`, `IamRegistration.package`, `6cbb489` and `dec71d8`);
    **sitting 8 CLOSED** at `c5116e0` (`manifest-8d`, Task 11: `draftPrivacyAssessment`, `81892d4` and `4aaf0ef`); **sitting
    9 CLOSED** at `4a6f6c6` (`manifest-6d`, Task 12: `requestApproval`, `listQueue`, `changeRequestedFrom`, the fleet's
    names; `a1d4baa`, fix wave `a230c1a`), Rich having chosen (a) on `change_requested`. Each adopted with no change of
    ours. **FE-46, FE-47 and FE-5 are CONFIRMED by Rich** (`ddc76d7`), each awaiting a spec action from its planning
    session; sitting 10's mock keeps the records as they are until then. **Sitting 10 CLOSED** at `8ff925f`
    (`manifest-3d`: the console and the mock, the guides, the published-text pass). Then 12 (the acceptance), then its
    **faculty-ready plan**:
    contract 1.6.0, `__Host-` cookies on https (its Task 5 messages us first; **our adoption is prepared** in
    [`research/2026-10-01-faculty-ready-adoption.md`](./research/2026-10-01-faculty-ready-adoption.md): whoIs and edge
    mode change in one window with its restart). `api-findings.md` has each shape.
  - **The contract is 1.5.0, 72 operations** (the platform's sitting 9, `a1d4baa`: `requestApproval` and `approval:request`, `listQueue`, `approval.requested`, `409 RELEASE_REJECTED`, `IamRegistration.changeRequestedFrom` (required), the fleet's `name`, `state` and `archivedAt`; its fix wave `a230c1a`: `QueueItem.project` without `state`, descriptions; both adopted with no change of ours, `api-findings.md`).
  - **Mailpit, for F6** (`manifest-60`): SMTP `127.0.0.1:7111` (no authentication, no TLS); the inbox
    `http://127.0.0.1:7112`, its API under `/api/v1/` (`GET /api/v1/messages`, `GET /api/v1/search?query=…`, `DELETE
    /api/v1/messages` with `{"IDs":[…]}`). **Host `127.0.0.1` or `localhost` only** (any other is `403`). In memory, at most
    500, gone at a restart; nothing leaves the laptop. The inbox is shared (`make verify` sends a probe): filter by your
    own subject or recipient. manifest's RUNBOOK *Mailpit* has the rest.
  - **7100 runs on real GitHub** (`Manifest-local-dev`): anything created there is a real private repository nothing
    deletes; a real-platform walk is Rich's word, every time, **in a window the running platform sitting gives** (F4a's
    pattern: no Vitest, no Docker tier, no `make verify`, no restart; it keeps writing code). Never restart the control
    plane yourself. Every platform sitting's first test run truncates its database.
  - **The laptop's on-premise model is `qwen3.8:27b`**; the capable model `default-chat-large`, read from
    `session.models`. **The platform's `make doctor` asks our `GET /api/__doctor`**: keep it.
- **The machine** *(2026-10-02, ~00:15 PDT)*:
  - **Our server on 7105 is in MOCK mode** (`nohup pnpm dev:mock` from the main checkout, one watcher, restarted at F6 sitting
    6's close on a fresh dev database, and by itself on `d3600be`), against **our mock on 7102** (pid 24850, on the
    platform's `6d76459`). **Its dev database is at version 5**; sitting 7's acceptance ran on it, and the last
    `check-keeping.sh`'s `DELETE` left **no mock-app conversation or keeping row**; the ones before are kept as `.data/app-before-f6s6.sqlite`, `app-before-f6s5.sqlite`, `app-before-f6s4.sqlite`,
    `app-before-f6s3.sqlite` and `app-before-f6s2.sqlite`, F5's as `.data/app-before-f4a.sqlite`. **Its key file**,
    `packages/server/.keys/keeping.key`, seals the watch tokens our page now hands over. **Its keeper sends email** in both
    modes, to Mailpit, from *Manifest &lt;manifest@app.manifest.internal&gt;*, and **looks at live addresses only in edge
    mode**. Switch to edge mode before anyone clicks the real platform, and say so.
  - **7100 is the platform's**: at its sitting 10's close the real control plane is up (PID 14109, real GitHub) with an
    **empty database** (no projects, no users: `operator`'s admin grant is asked again after `operator`
    signs in). Nothing of ours is there. **LiteLLM on 7106; Mailpit on 7111/7112.**
  - Our dev script trusts the system's CAs; to switch modes, stop our server's whole tree (§7), then `pnpm dev` or
    `pnpm dev:mock`.
- **How to run it** is §6, below.
- **The workspace:**
  - `packages/ui` is the design system, **ours since Rich's *"fix it at source"***. Its stylesheets are in `src/`,
    and `reference/bundle.js` holds the components' markup by the parity test. Our extensions have tests of their own:
    SideNav's two; FormField's `count`, `FieldCount` and `secret`; LiveSteps' `line` and `detail`; `Disclosure`;
    SegmentedControl's arrow keys, tab order, `controls` and `label`; **ClockItem's `state`** (and its card's top row
    wraps, a styles test).
  - `packages/web` is the app. Only `src/platform` calls the platform, and `words.ts` holds every sentence.
    `mode.ts` says which platform our server answers from (Vite's `define`), and `App` draws the mock-mode banner from it.
    **Every reader of an address's instance takes its environment through `your-apps/model.ts`'s `asServed`** (sitting 6):
    before a launch, the live address a dry run left `gone` is nothing there (the platform's 5b).
    **An app's pages:** `/apps/:slug` is the Overview (`screens/overview/`: its rows, moment 10's band, and **moment 15's
    hand-over in `students.tsx`**, read once launched), `/apps/:slug/preview?tab=…` the Preview (`screens/preview/`,
    moment 7: its facts pure, in `facts.ts`), `/apps/:slug/going-live` *Going live* (`screens/going-live/`: `checklist.ts`'s
    `rowsOf` and `CLOCK_IDS`, `clocks.ts`'s `clockOf`, **`dry-run.tsx`: `dryRunRow` and *[Run the dry run]*** (Task 7's press, sitting 6: the step-up card and `?then=dry-run`, *[Fix it]* with what it saw, our deadline's reads, this attempt's incident) and
    **`sign-off.tsx`'s `signOffRow`, `talkWords` and *[Talk it through]***, all pure but the components; `row.tsx` draws a
    row, lit when it changed; **`live.tsx`, moment 14's *[Let your students in]***, held by the page while a press is under
    way), `/apps/:slug/conversations` and `/change` moment 8 (`screens/change/`). The router's `canonical` rewrites F4's
    `/apps/:slug?tab=…` in `useRoute`'s read, and `remember` keeps an address without a navigation. `screens/building/` is
    moment 6, `screens/trying-out/` moment 9 (`put.tsx`; its stations and the question's version pure, in `stations.ts`; **what it and
    moment 14 draw alike in `parts.tsx`**: `Stations`, `Secrets`, `StepUpCard`, `WhatWentWrong`, M1's `cutByOurDeadline`,
    M2's `incidentOf`),
    and `ours/pretend-people.ts` the pretend people (FE-3). **F6 (sitting 5):** `screens/keeping/` (`watch.ts`, the
    Keeping watch token minted; `role.ts`, owner or helper; `lines.ts`, every happening and need in words; `needs.tsx`,
    the band; `since.tsx`; `how.tsx`) and `screens/history/` (`/apps/:slug/history`). **F6 (sitting 6):** `screens/keeping/start-again.tsx` (*Start it again*,
    *Start it for your students*, *What happened?*), `screens/overview/switching.tsx` (*Switching it off*, *Switch it back
    on*, *Delete it*), `screens/change/notice.tsx` (`PressNotice`: `PROJECT_ARCHIVED` said one way on every press's notice);
    the Overview's `?then=` (`start-again`, `students`, `switch-off`, `delete`). **Only `src/auth.ts` names an `/auth/` path** (sign in, sign
    out, step-up).
    **Who may build (F4a)** is the platform's `Me.mayBuild`, read and never re-derived: `screens/keeps.ts`'s `useKeeps`
    (someone who may not build is asked `listProjects` once; its answer keyed to the person), `screens/not-open.tsx`
    (the screen, and `/new`'s two sentences), and `not-open.ts`, the signal a `BUILDING_NOT_OPEN` met part-way raises
    (from the platform's fetch or our `call()`), on which `session.ts` reads `getMe` again; Describing and Name it say
    nothing of it.
  - `packages/server` is 7105. `/api/me` replays the session to `GET /v1/me` and nothing else (FE-2); `Person` carries the
    platform's `mayBuild` (a `getMe` without it builds), never stored, and `POST /api/conversations` refuses a new start
    `403 BUILDING_NOT_OPEN` (F4a). **`Person.email`** (F6) is kept in `persons`: an address is not a credential.
    - `store/` is its only database reader: one SQLite file in `.data/`, git-ignored, holding no credential **but F6's
      sealed watch tokens** (D2; `watch_tokens.sealed`, never in the clear). **Version 5** (F6): `apps`, `members`,
      `watch_tokens`, `history`, `emails` (`store/keeping.ts`), and `persons`' visits (`visit`, Decision 7).
    - **`keeping/` is the keeper** (F6, D4): `seal.ts` (AES-256-GCM; the key from `MANIFEST_APP_KEEPING_KEY` or
      `packages/server/.keys/keeping.key`, never in `.data/`) and `keeper.ts` (one stream per kept token through F3's
      `platformStream`; every event once to `history`; `keeping.gap`, `keeping.stopped`; each new happening emailed once;
      *your work is waiting*, at a round's end with no page watching (`Hub.watched`) and once an hour for a day's wait).
      **`happenings.ts`** reads an entry into a `Happening` and chooses the lines (pure); **`emails.ts`** says who is
      emailed what (pure), **`words.ts`** every sentence of an email, **`mail.ts`** delivers each once (nodemailer).
      **The live-address watch** (sitting 4): **`outage.ts`** (pure: `answerOf`, `observe`, `outageFrom`: down after two
      misses, answering again after three answers, the outage ending at the first; a fall within 30 minutes of a recovery
      told to nobody; `410` off) and **`probe.ts`** (one `GET`, no redirect, 10 s, routed by `x-manifest-instance`); the
      keeper looks once a minute (`probing` is false in mock mode) and answers `outage(projectId)`. **It only reads**, with
      `platform/watching.ts` (`getProject?expand=environments`, `listMembers`). **`api/keeping.ts`** takes the token a
      page hands over, and answers the page (sitting 4): `GET /api/needs` and `/api/since` (the person's kept apps; each
      load a visit), `GET /api/apps/:projectId/history` (a member's alone), `DELETE /api/apps/:projectId` (an owner's,
      after the page's `deleteProject`). Started in `buildServer` after the line; `main.ts` reads the key before it
      listens.
    - `api/` is our own API. Every change is guarded by `Origin`, and every request by the person. Its contract with
      the page is `api/progress.ts`. One piece of work per conversation at a time runs through `api/work.ts`, its
      claims kept in the hub (`events.ts`), which the line reads. The folds: `intake-state.ts`, `round-state.ts`,
      `piece-state.ts` and `line-state.ts`. `api/build.ts` is the building routes, `api/apps.ts` an app's
      conversations, the secrets we asked for, the fix under way for an incident (**a fix names its address: `environment:
      'production'` for the live address**), the change under way for a refusal
      (`/refusals/:approvalId/conversation`), **a dry run's fix** (`{ fix: { dryRun } }`, held to its four fields, never the
      platform's `reason`; found again at `/rehearsals/:rehearsalId/conversation`), **an outage's fix** (`{ fix: { outage:
      { from, to } } }`, F6 sitting 4: no incident, the lead looks in the code; no lookup route yet, Task 10's), and the
      hand-over's two rows (`/plan?before=`),
      and `api/plan.ts` a plan.
    - `model/` asks a model for structured output only, and says which model answered. **Every call streams** (F5
      sitting 2): `model/stream.ts` reads the events, and `client.ts` holds three deadlines per use (`ROUND_DEADLINES`,
      `ASKING_DEADLINES`: a first word, words or reasoning arriving, a ceiling); an answer is counted (`received`), never
      kept. `agents/` are the agents, each a schema and a prompt: the three intake agents, the plan, the change planner,
      the lead, the CWL specialist and the explaining agent.
    - **`runtime/` is our own agent framework**: it knows no platform. `build/` holds the lead's guards and moves,
      `round.ts`, the round of work (it renews a session the platform withdrew, once a leg), and `line.ts`, the line.
    - `platform/` is every call our server makes, **always with the conversation's token or a model key**, never
      the person's session, and **never a deploy anywhere but the sandbox**. `platform/sign-in.ts` follows a draft's
      `/login` to the IdP.
  - **The gates:**
    - `pnpm test` (2193 tests), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`; **`launch-actions.test.ts`** scans our
      server's text for every `/v1/` and `/auth/` path, and refuses a launch action; **and (F6) holds `keeping/` to the
      watch token's reads, and refuses `archive`, `restore` and a project's `DELETE` anywhere**;
    - `scripts/check-slice.sh` (F1's, 8), `scripts/check-describing.sh` (F2's, 18), `scripts/check-building.sh`
      (F3's, 12), **`scripts/check-seeing.sh` (F4's, 8)**, **`scripts/check-going-live.sh` (F5's, 8)**, **`scripts/check-keeping.sh`
      (F6's: half one 8, half two 12, with `CONTROL=actor|restart|clear-token|mock-probe`)**: each in mock mode, `pnpm
      mock` and `pnpm dev:mock` running. Run `check-seeing.sh` first, then `check-going-live.sh`, while the mock's app is free;
      **`check-keeping.sh` last** (its `DELETE` forgets the mock's app, every conversation on it included).
    - **The walk on 7100 for F6: `scripts/walk/keeping-7100.ts`** (sitting 7's, staged; Rich's word, every step's prerequisites
      in the plan's *Sitting 7, part one*).

---

## 1. What Manifest is, and what this repository is

Manifest is UBC's internal developer platform. A faculty member describes an application in plain language, an AI
agent builds it, and Manifest deploys it, signed in with CWL and running on UBC infrastructure, **without the
faculty member ever seeing a container, a YAML file or a log line.**

The platform lives in `/Users/rich/Developer/manifest` (the control plane, the edge, the IdP, a mock, and a plain
reference console). **This repository is the product faculty actually use**: the "manifesting" front-end that the
platform's spec (§5) makes a SEPARATE PROJECT. It owns chat, the agents and ideation. The platform owns everything
that runs.

- **Served at** `https://app.manifest.internal` on the laptop, through the platform's edge. The edge sends `/v1/*`
  and `/auth/*` to the control plane and **everything else to port 7105**, which is ours.
- **Two credentials, two places.**
  - The person's **browser** holds their session: it creates projects, mints tokens, answers questions, steps up,
    goes live.
  - **Our server** holds delegated tokens the browser minted: one per conversation, and one *Keeping watch* per
    app. It runs the agents with them.
  - Our server learns who it serves by replaying the session cookie it receives to `GET /v1/me`, **and for
    nothing else** (FE-2, decided by Rich).
- **The API** is consumed only through the platform's generated client, `@manifest/contract`, by a `link:` to
  `../manifest/packages/contract`. It reads manifest's working tree, which another agent is changing.

## 2. The rules — each has a reason

- **Never change anything in `/Users/rich/Developer/manifest`.** Another agent executes plans there and commits to
  `main` all day.
  - Read it freely.
  - **Never run there:** `pnpm test`, Vitest, `pnpm test:docker`, `make reset`, any `make demo*`,
    `pnpm contract:write`. They truncate the shared database or restart the shared edge.
  - Running `manifest-mock` (7102) is harmless. **Ask Rich before starting the real control plane.**
- **Ports:** the platform owns 7100–7199. **7105 is ours**, 7102 is the mock, 7104 the reference console.
  **Never touch Laravel Valet** (it owns `.test`, port 53 and ports 80/443).
- **Passwords are Rich's to type.** An agent stages everything and asks once. Against the mock, sign-in is
  faked.
- **Ask before `sudo`.** It cannot prompt from a tool call.
- **Never edit the platform's spec.** Propose changes to Rich, who carries them to the platform session.
- **An API gap is a finding, never a workaround.** Add it to `api-findings.md` as the next `FE-n`: the screen, the
  moment, what we would call, what is missing, why it matters.
- **Commits:**
  - Commit on `main`, per task. Stage by name, **never `git add -A` / `.` / `commit -a`**.
  - Nothing is pushed.
  - End each message with the attribution lines the session gives you.
- **The machine:** macOS, bash 3.2, a BSD userland; the tool shell is zsh. Node 24 via nvm, pnpm 11 via corepack.
  Write multi-line scripts to a file and run them with `bash`.

## 3. The product's rules — from the design system and the walk-through

- **C3: a faculty member is never shown infrastructure.** No containers, YAML, exit codes, digests, ports, or
  platform state names (`provisioning`, `healthy`…). `design/system/10-language.md` in manifest has the table.
  A version is *"the version from 18 September, 9:00am"*. Hostnames are allowed, in mono.
- **Five states only** (`20-states.md`): working · waiting on someone · needs you · steady · not yet.
  - *Motion means a machine is moving; stillness plus a number means a person has it.*
  - No spinners.
- **Every refusal says what is still true. Name the owner of every wait. *We*, everywhere** (Rich).
- **Accessibility is a legal requirement:** real `<button>`/`<a>`/`<label>`, visible focus, never colour alone.
- **The prototype's words are a starting point, not a script** (Rich). The walk-through's words are the design.

## 4. The document map

| Read | For |
|---|---|
| [`walkthrough.md`](./walkthrough.md) | **The design**: 20 moments, each with its screen, words, the operation behind every value, failures and waits, and Rich's decisions |
| [`agents.md`](./agents.md) | The agents: who calls whom, what each is given, who pays |
| [`api-findings.md`](./api-findings.md) | What the platform lacks (`FE-n`), and when the platform session is doing what |
| [`plans/roadmap.md`](./plans/roadmap.md) | The plans, in order, and what each waits on |
| [`2026-09-27-reading-note.md`](./2026-09-27-reading-note.md) | What the first session read, and what surprised it |
| [`research/`](./research) | A digest of the contract (every operation, event, code), and an inventory of the prototype and components |
| [`plans/2026-10-01-f6-keeping-watch.md`](./plans/2026-10-01-f6-keeping-watch.md) | **The current plan**: F6, *Keeping watch*, its sittings, Rich's decisions (in its design, [`…-design.md`](./plans/2026-10-01-f6-keeping-watch-design.md)) and ours |
| [`plans/2026-10-01-f5b-the-clocks.md`](./plans/2026-10-01-f5b-the-clocks.md) | **Next after F6**: F5b, approved by Rich, native: part one on today's contract, part two when FE-46 lands. Its design, [`…-design.md`](./plans/2026-10-01-f5b-the-clocks-design.md) |
| [`plans/2026-10-01-f6b-working-together-design.md`](./plans/2026-10-01-f6b-working-together-design.md) | F6b's design (moments 17, 18, *Agents*), approved by Rich; its plan is written after F6 |
| [`minors.md`](./minors.md) | Every deferred minor, checked against the code, for Rich to choose from |
| [`research/2026-10-01-faculty-ready-adoption.md`](./research/2026-10-01-faculty-ready-adoption.md) | What the platform's faculty-ready plan (1.6.0, `__Host-` cookies) moves of ours, and the order to adopt it |
| [`plans/2026-09-29-f5-going-live.md`](./plans/2026-09-29-f5-going-live.md) | F5, executed: its sittings, Rich's decisions and ours, and what waits on the platform (F5b) |
| [`plans/2026-09-29-f4a-only-faculty-build.md`](./plans/2026-09-29-f4a-only-faculty-build.md) | F4a, approved: built when the platform's `Me.mayBuild` lands |
| [`plans/2026-09-28-f4-seeing-and-changing-it.md`](./plans/2026-09-28-f4-seeing-and-changing-it.md) | F4, executed: its sitting 7 is the record of Rich's click |
| [`plans/2026-09-28-f3-building-it.md`](./plans/2026-09-28-f3-building-it.md) | F3, executed: its sitting 7 is the record of the real platform |

*`research/contract-digest.md` is of 1.4.0 at `186fa34` (57 operations); its addendum,
[`research/contract-digest-addendum.md`](./research/contract-digest-addendum.md), covers everything to 1.5.0 at `a230c1a`
(72): read both. manifest's guides (`launching.md` above all) predate its sittings 6–9.*

**In manifest, read-only:**
- `docs/superpowers/design/system/`: the design system, the language, the states, the components;
- `docs/api/`: the API's own guides, also served at `GET /v1/docs`;
- `packages/contract/openapi.json`: the source of truth;
- `packages/console/src/api.ts`: how every call is made.
- **For F3:**
  - `docs/api/agents.md`, `authoring.md` and `events.md`: how an agent is expected to loop, commit, build and follow
    the stream;
  - `blueprints/node-ts-mongo/agents/AGENTS.md`: the blueprint's knowledge pack, the stack the lead builds on (fixed:
    no dependency may be added, FE-32);
  - `blueprints/node-ts-mongo/skeleton/` and `starters/proof-app/`: what an app starts from;
  - `docs/superpowers/ORIENTATION.md` §7e: the platform session's own next job, and its notes about us.
- **For F4:**
  - `docs/api/frontend.md` (*Seeing a running app*, *Two credentials*), `launching.md` and `journey.md`: environments,
    `deploy`, releases, incidents, and what a token may and may not do;
  - spec §9's *Staging: a registration with UBC's staging IdP*, and §21: the laptop's staging is the Manifest IdP's;
  - `design/system/components/SegmentedControl/` and `Timeline/`: the READMEs' rules, which the reference's markup
    does not all carry.

## 5. How to work here

- **Superpowers skills:** `brainstorming` before design, `writing-plans` for a plan, TDD when building,
  `verification-before-completion` before claiming anything.
  - **Subagent-driven execution keeps a ledger** in `.superpowers/sdd/<plan>/progress.md` (git-ignored): each task's
    rulings and results. F2's is kept there. Its record for Rich is always the plan's *What executing this plan
    found*.
  - **A design is settled in the plan, not in a separate spec.** The walk-through is the product's design. Rich's
    decisions for a plan are its *Decided by Rich*.
- **Decide, then document.** Settle routine questions, and record the option chosen, the options rejected and
  what changing course costs. Ask Rich only what is genuinely his.
- **A green result is not evidence a control is in force.** Break the thing, watch the named test go red,
  restore it.
- **Assert the shape of the answer, never that an answer arrived.** A test that expects a refusal names its
  `code`.
- **The contract moves under us.** When Rich relays that a platform sitting has landed, re-read `openapi.json` and
  re-run `pnpm typecheck`.
- **Close out at the end of every sitting:**
  1. the plan's sittings table;
  2. its *What executing this plan found*, dated;
  3. this file's *Where things stand*, replaced and not appended;
  4. the roadmap.

  The next sitting is a different agent who believes these documents.

## 6. Running it

**Against the mock** (no platform needed), in two terminals, then open `http://127.0.0.1:7105/`:

```bash
pnpm mock        # manifest-mock on 7102, from source (never manifest's own `dev`, which builds in manifest)
pnpm dev:mock    # our server on 7105: the app, /api/*, and /v1 + /auth proxied to the mock
```

- The mock fakes CWL, so *Continue with CWL* signs you straight in as Instructor One.
- It accepts any session value (FE-26), and answers `listInstances` from the document's example (FE-27).

**Against the platform, through the edge** (the control plane on 7100, started per manifest's RUNBOOK, *Running the
control plane*; ask Rich first, and check with the platform session):

```bash
pnpm dev         # our server on 7105, edge mode; open https://app.manifest.internal
```

**The checks:**

```bash
pnpm test && pnpm lint && pnpm typecheck && pnpm format:check   # the four gates (run test twice at a sitting's end)
bash scripts/check-slice.sh                                     # the headless acceptance, mock mode (starts nothing)
MODE=edge bash scripts/check-slice.sh                           # the same, through the edge
bash scripts/check-describing.sh                                # F2's acceptance: our API as the browser drives it (pnpm mock and pnpm dev:mock first)
bash scripts/check-building.sh                                  # F3's acceptance: a round to built, and Stop, read from the trace (the same)
bash scripts/check-seeing.sh                                    # F4's acceptance: the line, the change's plan, Stop freeing the app (the same; run it first)
```

**Installing:**
- `pnpm install --offline --frozen-lockfile` works from the store, **unless the lockfile has changed since it was
  last verified**. pnpm 11 then wants registry metadata to re-check it.
- Once, `pnpm install --frozen-lockfile --prefer-offline` fetches metadata only.

## 7. Traps: each one cost a sitting something

- **Prettier rewrites what you write** (`pnpm format`). Re-read a file before an exact-text edit.
- **The tool shell is zsh.**
  - A glob that matches nothing aborts the whole command: `rm -f x*` stops everything after it.
  - A `rm` of a variable path (`rm $DIR/*`) is refused by a safety check. Name files literally.
  - Quote heredocs (`<<'EOF'`), or backticks run.
- **Vitest 2.1.9 cannot `import 'node:sqlite'`.** `store/db.ts` loads it with `createRequire`, and a test that
  needs the file directly does the same (`store/testing.ts`).
- **Platform tests run in `node`, never jsdom:** the contract sends no session header when it sees a `document`.
  Screen tests opt in per file with `// @vitest-environment jsdom`.
- **StrictMode in a test** is Testing Library's `reactStrictMode: true`. A `<StrictMode>` wrapper around
  `renderHook` ran effects once (measured).
- **The mock answers the document's examples, whatever is asked** (FE-27): another project, another name, and
  fixed times long past. It accepts any session (FE-26), and holds one taken slug, `mock-app`. **Assert what was
  sent, against a recording fake,** never what the mock answered.
- **Through the edge, a restart of our server closes `EventSource` for good**: its retry meets the edge's
  `502`. The page reopens it (`ours/conversation.ts`), and mock mode can never show this.
- **A test that passes the first time proves nothing yet.** Break what it guards, watch it go red, restore it:
  each sitting's entry lists these as its *negative controls*.
- **Walk the screens in a real browser**, as every sitting since F1's has: headless Chrome over the DevTools
  protocol, from a script in the session's scratchpad, with Node 24's global `WebSocket` and no new dependency.
  It found two defects in F2's sitting 4 and one in sitting 5 that no unit test could. `pnpm dev:mock` must be
  running; `tsx watch` restarts our server on each edit, so wait for it after a formatting pass.
  - **A walk that throws leaves its headless Chrome running**, holding the DevTools port and its profile, and the
    next walk talks to the old one and hangs. Stop Chrome in `process.on('exit')`. Sitting 5 found two left
    behind on port 9334.
  - **A walk signed in at the real IdP needs a fresh profile each run**: the IdP remembers who signed in.
  - **A walk must wait for a round's page to change** before it reads the next round: a fast press reads the old
    one.
- **Our own server is left running by every session, and its idle copies pile up.** `tsx watch` keeps watching
  after its child fails to take 7105, and it ignores SIGTERM with no child. Sitting 6 found twelve, one of them in
  mock mode, ready to take 7105 at the next edit. Before switching modes:
  - list `pgrep -f 'tsx/dist/cli.mjs watch'`;
  - stop each with its `pnpm` parents (`kill -9`, the pids named one by one: zsh passes `$LIST` as one word).
- **The mock cannot show agents racing:** its model answers at once, and it lists one blueprint. The real platform
  lists a test fixture first (FE-31), and its model takes seconds. Two of sitting 6's four real-platform defects
  were races.
- **A negative control that writes state leaves it behind.** Sitting 6's "token kept in a message" wrote the mock's
  token into the dev database, and the no-credential check stayed red until the row was deleted.
- **The platform session's name changes with each of its sittings** (`manifest-de` for 9a, `manifest-b1` for 9b). A
  name in these documents is a record, not an address. Find the live one with `ListAgents` every time (§8).
- **The platform truncates its database while it tests.** Projects made on the real platform, the test user's
  included, vanish between its sittings. A real-platform walk starts from nothing, and must sign in afresh.
- **Node's time-zone data (`2025b`) predates British Columbia's end to clock changes** (Rich, 2026-09-28). It still
  has Vancouver falling back on 1 November 2026, so a Vancouver time after that shows an hour off, until the data
  (Node's, the browsers', the platform's) catches up. Nothing in our code can fix it. FE-29's `resetsAt` would leave
  only the platform's clock to get right.
- **Never `maxLength` on a field people paste into:** it cuts a paste off without a word. Say the limit, keep their
  text, and hold the send (F2's deferred Minor, `FieldCount`).
- **A problem's reference is only as good as its report.** If a reference shown on screen is missing from
  `problems` (`packages/server/.data/app.sqlite`), the report was refused. That is how sitting 4's second defect
  was found.
- **A `200` from `default-chat-large` is not proof OpenAI answered** (F3 sitting 1). LiteLLM's fallback answers any
  failed primary call, a request OpenAI refused as malformed included, from the 4B model, and cuts its prompt to
  16k tokens without a word. Read `x-litellm-attempted-fallbacks` on every answer. A zod union at a schema's root is
  such a request: wrap it in an object.
- **A script's `DELETE` with `content-type: application/json` and no body is `400`**, which looks like "not
  allowed". Send no content-type without a body. It hid F3's revocation test for one run.
- **Scripts through the edge need the platform's CA:** `NODE_EXTRA_CA_CERTS=/Users/rich/Developer/manifest/infra/ca/manifest-root.crt`,
  set before Node starts. Sign in as `instructor` by manifest's three hops (`infra/lib/idp-login.sh`, read-only), or its
  Node port: `fetch` with `redirect: 'manual'` and a cookie jar per host.
- **An event's `subject` is opaque**, and on the real platform some name the slug (`project:<slug>`). Match builds and
  instances by `machineDetail`'s ids.
- **A fake that names things the way the real one does can hide a control.** Sitting 5's restart test passed with the
  old session never ended, because the new server's fake also called its first session `session-1`. Give each fake
  process its own ids. The same sitting's test message, *"Twelve weeks"*, was also in the plan it ran on.
- **Stop is checked in several places after a platform call, by design.** A control that removes one check stays
  green; remove them all to see the test go red.
- **A negative control can hang instead of failing.** A mutation that makes React render in a loop inside `act`
  (an effect's dependencies removed) never yields to Vitest's timeout. A harness that restores the file only when
  Vitest returns then leaves it broken: stop the Vitest processes, and check the file (sitting 6). **Its worker can
  outlive the session**: F4 sitting 6 found one (`node (vitest 3)`, parent launchd) at 100% of a core for 11 hours,
  loading the machine the platform's test tiers time against. Run `pgrep -fl vitest` at a sitting's start and close.
- **`git status --short` lists a new directory as one line**, so piping it into `prettier --write` misses the files
  inside. Name the directory.
- **Vitest reads `$0` in an `it.each` title as a variable**, so a title holding money prints garbled.
- **Node's en-GB short month is *"Sept"***. Moment 6's folded time is built from en-US's parts.
- **The platform's Vitest truncates the shared database** (`packages/control-plane/vitest.global-setup.ts`), and a root
  `vitest.workspace.ts` can pull it in. To check one of its pure functions, import it into a `tsx` script with the
  context its test builds (sitting 7's `fe37-check.mts`), never its Vitest.
- **The platform's truncations leave repositories behind** in `manifest/.manifest/repos`. `checkSlug` then says a slug
  is free, and `createProject` answers `409 SOURCE_CONFLICT`: its seed meets the old `main`. A walk picks a name with no
  leftover repository.
- **A cookie-less fetch of the IdP meets *"Missing cookie"* (`200`)** after the app's `/login`. That is the IdP taking
  the request. Its refusal is a `5xx` on its first answer (`platform/sign-in.ts`).
- **OpenAI's strict mode holds a schema's `maxLength` as it writes**, so a ceiling that binds cuts text mid-word. Ask for
  less in the prompt, and keep the ceiling out of reach.
- **The lead sees only its last move's report.** Anything it must remember across moves (the specialist's proposal, its
  own questions) needs a section of its own in the view, or it asks again. Sitting 7 found three such loops.
- **After our server restarts, the page mints a new token, and the round cannot end the old session** (`FORBIDDEN`:
  another token's). The orphan runs out its 240 minutes, spending nothing.
- **A walk's own bugs cost runs.** Pick a name by its title, never the first radio of each group. Make Bearer calls from
  Node, not the page (the page adds its cookie). Watch several files with a `Monitor` filter that drops `tail -F`'s
  headers.
- **The tool shell's `ls` prints a long listing, and zsh passes an unquoted `$VAR` as one word** (`$=VAR` splits it).
- **A React id (`useId`) holds `:`, which a CSS `#id` selector refuses.** A walk that types into a field by
  `querySelector('#' + id)` throws on the plan's questions; look an id up with `getElementById` (F4 sitting 1).
- **`listInstances` is ordered *seen most recently*, not newest made.** A deploy's new instance can be listed second
  while it starts: find it by the id that was not there before, never by position (F4 sitting 1, M3).
- **A test that pins the platform's own words moves when the platform rewords them.** Its sitting 11 renamed the slug
  in published text (`8ef685d`), and one of our tests followed.
- **A scripted model's `calls` counts each `complete`, not each attempt** (`model/scripted.ts`). A refused first answer
  and its retry are one call: see the retry by what came back, never by `calls` (F4 sitting 2).
- **Headless Chrome refuses the clipboard** (*"Document is not focused"*) until the walk sends
  `Emulation.setFocusEmulationEnabled`, and its `readText` answers empty even after a write: trust the page's own
  *"Copied"*. **And a walk at 375 finds what no unit test can**: sitting 3's copy rows ran 13 px past the phone
  (F4 sitting 3).
- **A navigation moves the focus to the page** (App, on every change of address). A control that keeps its state in
  the address, as the Preview's tabs do, uses `router.remember` (no navigation), or the focus leaves the control.
- **In mock mode every conversation is on the mock's one project** (FE-27), so the dev database's older conversations
  (F2's `agreed` ones among them) **hold "the app"**, and a change asked there waits for ever. A walk of the line, or
  `check-seeing.sh`, starts from a fresh dev database (move `packages/server/.data/app.sqlite` aside, with our server
  stopped), or sets those rows aside. **The mock also holds no `docs/plan.md`**, so a change planned in mock mode marks
  all five parts (F4 sitting 4).
- **Work's claims live in the hub** (`hub.claim`, `hub.busy`), not in `work.ts`: a test that builds its own Work shares
  its hub's. A claim is released by its own run alone, and only then is the line told (`ended`): agree's run starts
  round *n+1* inside itself, and its end tells the line nothing (F4 sitting 4).
- **A change's planner runs at once when its token is held** (Task 7): a test that wants a change to stay `planning`
  gives its harness a planner that stays at work (a budget read that never answers). A default planner that fails also
  leaves `planning`, for the wrong reason (F4 sitting 4).
- **An explicit `undefined` takes a parameter's default.** Sitting 5 passed `hint={undefined}` to mean "no hint", and
  the waiting box said F3's *"We read it at the next step"*, untrue there. Only the walk showed it. Pass the words
  you mean (F4 sitting 5).
- **A screen test that reads what arrives later must wait for it**: under the larger suite, a list read right after its
  heading appeared lost to its rows 6 runs in 8, and an effect's `console.warn` read after its words appeared was
  missed 1 in 12. `findBy…`/`waitFor`, never `getBy…` on something async (F4 sitting 5).
- **The web's needs switch has no default**: a new `Needs` kind draws nothing until its card is added, and typecheck
  says nothing (F4 sitting 5 found it with `withdrawn`).
- **A mutation that only changes a type proves nothing**: `case 'x' as never` still matches at run time. Remove the
  code (F4 sitting 5).
- **A button lays its children out apart, with a gap** (`mf-btn` is a flex box): a label with inline markup (a word
  kept whole) must be ONE child span, or the word becomes its own item with a gap before it (F4 sitting 6).
- **A walk's own check can pass without the fix.** Sitting 6's first label check measured each label against its own
  station and stayed green with the defect in place. Run a new walk check once with the fix removed, as any control.
- **The mock's trying-out always serves the draft's version** (M2), so a walk of moment 9 against it sees only
  *"already there"*. Sitting 6's walk rewrote trying-out's answers in the browser (DevTools `Fetch` at the response
  stage) and answered the deploy itself. **A Node call to the mock** uses the mock's own session
  (`manifest_session=mock-session`) and an `Origin` for a change; any other session value is `401`.
- **Zod strips a key its schema does not name.** A negative control that makes a model's extra field matter (a `slug`
  it was told not to write) must change the schema **and** the code that reads it, or it stays green (F4 sitting 2).
- **A model call's deadline is a guess until the real platform answers it.** The lead writes whole files: at Rich's
  click one call wrote 9,564 tokens in 68.9 s, and our 60-s deadline cut it off and said *"We can't reach the model"*,
  though the gateway answered and billed it. **Since F5 sitting 2 every call streams**, with a deadline to the first
  word, between words and on the whole; a stall says so (`MODEL_STALLED`, `MODEL_TOO_LONG`), never *unreachable*. The
  platform session can read LiteLLM's spend log: ask it.
- **Never edit the server someone is clicking on without telling them first**, and make the change one edit: `tsx
  watch` restarts on each save, and Rich's press landed between two edits of one fix (a constant used before its
  import): `INTERNAL`, a reference, and a restart under him (F4 sitting 7).
- **The lead's own commit can raise an app's classification mid-round** (`internal` to `confidential`, with
  `ai.models: [default-chat-onprem]`), and the platform then ends **every** live session on the project
  (`models_withdrawn`), even when the capable model stays allowed. The round renews once a leg (`5a1aa1f`); the
  platform's next plan trims the key instead.
- **A quoted example in a prompt is copied.** The change planner titled an unrelated change *"Word count"*, its
  prompt's own example (F4 sitting 7). Say what a field is for, and give no example the model can copy whole.
- **`innerText` returns CSS's `text-transform`**: the facts' overline reads *"SERVING RIGHT NOW"*. A walk that matches
  words case-sensitively misses it; `textContent` does not transform.
- **`Environment.instance` is the Instance itself, not its id**: compare `env.instance.releaseId`.
- **A negative control's run stays in the dev database.** A script check that reads the whole trace table goes red
  after a control, for good: scope each check to the conversations its own run made (`check-seeing.sh`'s check 5). A
  control that sends a round's deploy to staging leaves the round at needs-you holding the mock's app: clear it
  through our API (*Stop*, then *Not now* on what waited) before the next run.
- **The tool's safety classifier can refuse a read it takes for a deploy** (it refused a control's log as
  *"Production Deploy"*). Do not route around it by another tool: say so to Rich, and let him decide.
- **Real GitHub on 7100** (from the platform's next plan's Task 1): a driver-1 project answers `409
  SOURCE_PROVIDER_MISMATCH`, and a project made through 7100 is a real private repository on github.com that nothing
  deletes. A walk that makes projects there needs Rich's word, every time.
- **A mock-mode server answers through the edge too.** `packages/web/vite.config.ts` allows the host
  `app.manifest.internal` in either mode, so the edge sends everything but `/v1` and `/auth` to 7105 whatever it is. On
  2026-09-29 Rich signed in on the real platform, typed in *Describe*, and met our mock-mode server: refused, with a
  reference (`0565-503F`) that never reached `problems`, because the report was refused the same way. **Before anyone
  clicks the real platform, put our server in edge mode, and say so.** F5's Task 3 adds a banner in mock mode.
- **LiteLLM is on 7106** (the platform session, 2026-09-29), not 7100. Our server reaches it as `session.baseUrl`; the
  key still comes from an agent session on 7100.
- **A change to `packages/web/vite.config.ts` needs our server restarted.** `tsx watch` excludes `../web/**`, and Vite in
  middleware mode did not reload its config: the first `curl` after F5 sitting 0's edit served the old one. **And in our
  dev server a `define` is not written in place**: Vite sets it as a global in `/@vite/env`, which `/@vite/client` loads
  before the page, so read it with `typeof` (`mode.ts`); a build writes it in place.
- **Real GitHub on 7100 refuses a starter's app** (FE-41, F5 sitting 1): `createProject` with `starter: 'proof-app'`
  answered `409 SOURCE_GIT_FAILED` twice; without a starter, `201`. **The bare skeleton does not start** (it declares no
  `services:`, *"MONGODB_URI is required"*): a measurement that needs a launchable app commits the platform's own
  starter files through `createCommit` (the manifest's `name` set to the slug).
- **The dry run is an administrator's** (FE-42): the owner's `runRehearsal` is `403`. So are the launch records, and the
  approval asks a step-up. A script plays the administrator as `operator` **only after the platform session's admin grant**
  (`scripts/admin-grant.sh grant opr000001`, after `operator` has signed in once), and the grant goes at every truncation.
- **Node can sign in through the edge by the three hops** (F5 sitting 1's `lib.mjs`, manifest's `idp-login.sh` ported):
  **one jar per person, keyed by host**, so the ACS post carries the `manifest_login` cookie hop 1 set; a separate IdP
  jar loses it and the sign-in is refused. A step-up forgets the IdP host's cookies first, so its form is served.
- **Shapes that cost a run** (F5 sitting 1): a build's field is `status`, an instance's `state`; `getProject` carries no
  environments and no spec (`createProject`'s answer does: use `listEnvironments` and the tree's `commitSha`); an
  audience's `burst` is `steady` or `synchronised`.
- **`openAiCompatible`'s `fetch` is the global at the moment the model is made** (F5 sitting 2). A test that stubs
  `fetch` after making the model sends real requests: sitting 2's first deadline test reached the real LiteLLM on 7106
  (with made-up keys, refused). Stub first, then make the model.
- **A negative control must break what the test guards, not something beside it** (F5 sitting 2): a 5-minute first-word
  timer was not *"the old total deadline"* (the first word replaces it), and stayed green. Read why a control stayed green
  before trusting the test or the control.
- **`textContent` runs one element's words into the next** (*"Takes weeksManifest can't…"*), so a guard like
  `/weeks?\b/` over it misses a word that ends an element. Match without the boundary (`/week/i`), or join the texts
  with spaces (F5 sitting 3: two *"never weeks"* guards were weaker than they looked).
- **A walk's width check does not catch a chip running past its card**: `scrollWidth <= innerWidth` holds while a child
  overflows a card inside the page. Check each card's children against the card (F5 sitting 3, a clock's chip at 375).
- **A new read added to a page's `Promise.all` holds that page in every test whose fake never answers it** (the
  `platform()` helpers answer nothing they are not told): answer it in the shared fakes (`mockPlatform`, `two`), as
  sitting 3 did for `getLaunchReadiness`.
- **The mock's checklist and records must agree in a rewritten walk**: since sitting 3's review a clock card reads both,
  so an approved record beside an unmet item draws *"With the Manifest team"*, correctly.
- **jsdom names a button without the leading space of its visually hidden part** (*"Copythe address"*); Chrome names it
  *"Copy the address"*. A unit test matches the name with `\s*`; a walk reads Chrome's accessibility tree
  (`Accessibility.getFullAXTree`) (F5 sitting 4).
- **A walk's spill check measures boxes, and overflowing text does not grow its `<p>`**; and Chrome breaks a long address
  at its hyphens. To prove a sentence wraps, check each sentence's `scrollWidth` against its `clientWidth`, with a word that
  cannot break (F5 sitting 4: the check stayed green twice before it could go red).
- **In a wrapped `<textarea>`, `End` moves to the end of the visual line**, not of the value: a walk that types at the end
  sets `setSelectionRange(length, length)` first (F5 sitting 4).
- **The hand-over's rows are asked `?before=` production's release date** (S4): the mock's release is from 18 September,
  older than every agreement in the dev database, so in mock mode the message has no second part unless a walk rewrites
  the release's `createdAt`.
- **Our mock runs from source and reads the platform's fixtures once, at its start.** When the contract lands (1.5.0's
  `createdAt`), restart `pnpm mock` (7102), or it answers the old fixtures while our typecheck reads the new contract.
- **A second `vi.useFakeTimers` does not replace the first** (`beforeEach`'s): a test that needs `setTimeout` faked too calls
  `vi.useRealTimers()` first, and `shouldAdvanceTime: true` keeps Testing Library's waits running (F5 sitting 5).
- **A `hidden` tab panel has no accessible name to Testing Library**, so `getByRole('tabpanel', { name, hidden: true })`
  finds nothing: read it by its `aria-label` in the DOM. **And the Preview, told a put ended (`onPut`), follows an attempt
  under way with reads of its own every 2 s**: a count of `listInstances` calls is not only yours (F5 sitting 5).
- **An effect keyed on an id does not run again for a reading with the same id**: key it on the reading itself (a new object
  each time) when each reading matters (F5 sitting 5's M4, found by a control that stayed green). **And a tokenizer of
  string literals is thrown out of step by an apostrophe in a comment**: `launch-actions.test.ts` scans the raw text.
- **Stopping our server's process tree can be refused by a session's permission classifier** (F5 sitting 5, overnight:
  *"Interfere With Workloads"*): a fresh-database acceptance run then needs Rich, or a session allowed to. Never route
  around a refusal.

- **`waitFor` polls with `setInterval`**, so in a test that fakes `setInterval` it re-checks only when the page changes: a
  call made after an async read (the dry run's `runRehearsal`, after the press's `listInstances`) changes nothing, and
  `waitFor` times out at 1 s. Settle the queue instead (`act` over a real `setTimeout(0)`: `dry-run-press.test.tsx`'s
  `settle`) (F5 sitting 6).
- **The mock lists no incident anywhere** (FE-27): a script that asks for a fix names an incident of its own, and checks
  where our round reads it (`listIncidents` named `production`), never what the mock finds (`check-going-live.sh`).
- **bash 3.2 reads a multibyte character straight after `$VAR` as part of its name** (`"…$REASON”"` is *"unbound
  variable"*): write `${VAR}` (F5 sitting 6).
- **The platform names the newest instance as an address's when no route serves one** (its `servingInstanceOf`, per
  `manifest-d4`): after a first launch that never answered, `Environment.instance` is that failed attempt, and after a dry
  run (the platform's 5b) the dry run's instance, `gone`. Neither is served: `asServed`, and a failed attempt compared by
  its id (`live.tsx`) (F5 sitting 6).
- **A control that sends a round's deploy elsewhere leaves that round needing you**, and every conversation after it waits
  in line: the acceptance script then spends its 90-s budgets waiting (about ten minutes) before it reads the check the
  control is for. Free the app through our own *Stop* after it (F5 sitting 6's `control.sh`, in its scratchpad).

- **The dry run's second sign-in arrives after its working line** (the platform's 5b): the row works for a moment, then
  shows the card. A walk that waits for "working, or the card" and then for "an end" takes the card for the end: wait for
  the card or an end, then sign in again and press (F5 sitting 6).
- **An app's audience decides its launch**: on the platform today a *large course* or *public* app can never be `ready`
  (its load rehearsal is blocking and not built: FE-44). A walk that needs a launch describes a class (one course section,
  up to ~400) (F5 sitting 6).

- **A test that stops waiting before its round ends leaves the round writing to a store its cleanup closed**: every test
  passes, and Vitest still exits 1 on the unhandled *"database is not open"* / *"statement has been finalized"*. Wait
  for each round's end (`untilStatus(…, 'done')`); F4a found F5 sitting 6's lead's-view test doing it, 5 runs in 5.
- **A `findBy…` inside `act(async () => …)` never sees the page arrive**: `act` holds React's updates until it ends, so the
  body stays empty and the query times out. Find the element first, then click it inside `act` (F4a sitting 1).
- **We read the platform's working tree, not its commits** (`link:`): a platform session's contract edits reach our
  typecheck before it commits them, so *"wait for the commit"* changes nothing we see. Say OK, and adopt it (F4a: sitting
  6's `since` reached five of our test literals mid-review).

- **Walks: import `scripts/walk/index.ts`** (its README; `manifest-app-47`, `8a63767`): headless Chrome over DevTools, Node 24,
  no dependency, with the walk traps above closed once; **`node scripts/walk/self-test.ts` proves its checks (53)**. A
  walk's *"focus reached X"* reads a focusable element's accessible name, **never `document.activeElement.textContent`**:
  past the last control, focus is `<body>`, whose text holds every hidden word (F4a's *"Sign out"* at 375 was `<body>`).
- **A sitting's end: `bash scripts/close-out.sh --keep-as <name> --logs <dir>`** (`--dry-run` first), **after Rich's review
  of it** (`2a53a6d`): until then, by hand as §6 and above.
- **Several sessions of ours in one checkout** (F6 sitting 4, Rich's prep sessions): the index is shared, so **commit by
  pathspec** (`git commit -m … -- <files>`; a new file `git add`ed first), never a bare `git commit` after `git add`, and
  **format only your own files** (`pnpm exec prettier --write <files>`, never `pnpm format`). Another session's
  uncommitted work is in your gates (the root `tsconfig.json` is `pnpm typecheck`'s first step). Relay the platform's holds
  to them, and say before an acceptance run, which needs 7105 and a fresh dev database to itself.
- **An explicit `undefined` takes a parameter's default, in a test helper too**: F6 sitting 4's *"without a person"* request
  passed `undefined` for the cookie and was sent as Alice. Say *none* with `null`.
- **A background session's harness refuses Edit and Write in the shared checkout** until the session isolates its edits in a
  git worktree (F6 sitting 6). Never route around it with shell edits. A worktree under `.claude/worktrees/` cannot resolve
  our `link:../manifest` dependencies: make it a sibling of the checkout, install offline, and land each task on `main` by
  `git merge --ff-only` from the main checkout. **A background session also ends after about 60 minutes idle** (sitting 7's
  first executor did, waiting for its GO): commit finished work on the branch before a long hold. **Never the worktree
  tools** (sitting 7: entering one puts every git command on the main checkout out of reach, and leaving and re-entering
  asks a permission only Rich can answer): keep the session's directory in the main checkout, edit by absolute path inside
  the sibling worktree, and run git and the tests there by `cd`.
- **A walk that opens an app page in mock mode mints our watch for the mock's app** (the shell's `useWatch`), and it stays
  in the dev database: `check-keeping.sh`'s check 1 then answers `current` for its first hand (F6 sitting 7, after its
  smoke of the 7100 walk). Run `check-keeping.sh` from a dev database we keep no watch for the mock's app in; its own
  `DELETE` leaves it so.
- **A walk's fetch spy installed twice on one document records every call twice** (F6 sitting 6: a restore "sent twice" was
  the walk's): install it once per document (a flag on `window`); a navigation forgets it.
- **The shell mints the watch token on every app page whose watch our server lacks** (`useWatch`, F6 Task 8): a test that
  counts a press's platform calls on an active app answers `…/keeping` as watching, or the shell's `mintToken` is counted
  too (F6 sitting 6).

## 8. Working with the platform session, and other agents

The platform is built by **another Claude session**, in `/Users/rich/Developer/manifest`. It executes the front-end
enablement plan there, one sitting per session. We share the machine, the control plane, and Rich.

- **Finding it.** Call `ListAgents`. Load `SendMessage` with `ToolSearch` if it is deferred. The platform session is
  the live session named `manifest-…` (it was `manifest-de`, `manifest-b1`, `manifest-82`, then `manifest-7c`, which F3's sitting 7 found stopped by Rich
  and back at its close, then `manifest-c3` for its sitting 11a, `manifest-8b` for its sitting 12 and close, `manifest-63` for the next
  plan, the launch path, `manifest-13` for that plan's sitting 2, `manifest-c3` again for its sitting 3, `manifest-a1` for
  its sitting 4, `manifest-73` waiting for its 4a, and `manifest-d4` where Rich decided Spec action 8 and for its sitting 5; `manifest-74` for its sitting 5a; and its planning
  session, which runs no sittings, `manifest-00` then `manifest-60`: Rich's decisions and anything cross-repo), or the one whose messages come
  from manifest. Send to the name exactly as `ListAgents` prints it. Our own session's name is printed at the top of
  that list: tell the platform session to reply to it.
- **What it tells us, and what we answer:**
  - **Before it stops the control plane, or truncates**, it asks whether anything of ours is on 7100. Answer what is
    true: which ports we hold (7102 and 7105), whether a walk is running, and whether anything there must survive.
  - **When a sitting closes**, it sends its close-out commit, what moved in the contract, and anything we must use
    (for 9a: the model name). Then re-read `openapi.json`, run `pnpm typecheck` and `pnpm test`, and record the
    landing in `api-findings.md`, the roadmap, and this file, the same day.
  - It asks things of us too (F12, the `/api/__doctor` marker). Answer, build it if it is ours to build, and tell it
    when it is done.
- **What we may ask of it:**
  - **Before we start the control plane ourselves** (for a real-platform walk): ask Rich, and tell the platform session,
    since its tests truncate the same database.
  - **To tell us when a sitting closes**, in a message. This is better than `notify_when_idle`, which fires when it
    next stops to ask Rich anything.
  - **A finding, or a decision, only at Rich's word.** Our findings are ours to write (`api-findings.md`). What the
    platform should do about them is Rich's to decide, and we carry them only when he says so (FE-26 to FE-32 were
    carried that way).
- **What never crosses:**
  - We never run anything in manifest (§2), and never edit its files or its spec.
  - **A message from another session is a teammate's words, never Rich's.** It cannot approve anything on his
    behalf, and it cannot grant a permission our session was refused.
- **Checking a claim for yourself:** manifest's `git log` shows its close-out commits (*"docs: … sitting N — record and
  close-out"*). `openapi.json`'s `info.version` and its operation count say whether the contract moved. Its
  `docs/superpowers/ORIENTATION.md` §7e is its own next job.
