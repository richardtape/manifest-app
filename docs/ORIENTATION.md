# Orientation — read this first

**What this is.** The single entry point to `manifest-app`, for an agent with an empty window or a developer
joining. **The next job is always in the current plan's sittings table**, and [`plans/roadmap.md`](./plans/roadmap.md)
says which plan is current. This file states where things stand and the rules. It states no sitting's story.

**Where things stand** *(2026-10-01, 16:30Z: **F6 is written** (`manifest-app-34`): the design and the plan, waiting for Rich's review; the platform's sitting 7 is running, its contract commit `6cbb489` and fix wave `dec71d8` adopted)*:

- **YOUR JOB, IF YOU ARE THE NEXT SESSION: F6 is WRITTEN, waiting for Rich's review** (`manifest-app-34`, 2026-10-01):
  the design, [`plans/2026-10-01-f6-keeping-watch-design.md`](./plans/2026-10-01-f6-keeping-watch-design.md) (approved by
  Rich section by section, and reviewed: *"looks good"*), and the plan,
  [`plans/2026-10-01-f6-keeping-watch.md`](./plans/2026-10-01-f6-keeping-watch.md) (seven sittings, twelve tasks). **Ask
  Rich to approve it and choose how it runs**; then its sitting 1 (the measurements, on 7100 in the platform's window,
  at his word), or sittings 2–4 first if 7100 is not free (they need no platform). Its mail sink is live (below). **Rich's decisions so far (2026-10-01):** **two plans**: **F6, *Keeping watch*** (moments 16, 19, 20:
  the watch token, the history and *Since you were last here*, the needs-you band, emails, the live-address watch and
  *Start it again*, switch off, back on, delete) and **F6b, *Working on it together*** (moments 17, 18 and the *Agents*
  screen), written after F6; **the watch token is kept on disk, encrypted** (AES-256-GCM, its key apart from `.data/`:
  F2's Decision 1 amended for it alone); **four kinds of email** (it's in trouble; your work is waiting; a long wait is
  over; who's on it changed); **the keeper runs inside our server** (one stream per app through F3's `platformStream`,
  a `history` table, pure rules, a once-a-minute check of each live address), not a second process and not polling.
  - **F5b** (the clocks' own actions, UBC's sequential order: Spec action 9) is written when the platform's sittings 6–10
    land (`manifest-60`). **Sitting 6 landed** (`d54e1e1`, below): its waits are counted in Vancouver days (a same-day
    date is noon there), and nothing can be submitted until sitting 7's drafts. **Sitting 7's contract commit landed**
    (`6cbb489`, below): `draftIamRegistration` and `IamRegistration.package`.
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
  - **The platform's F8** (a provider's `422` as `200` `null`): its faculty-ready plan fixes it; ours reads both.
  - **F5 sitting 6's decisions** (that plan's two sitting 6 entries): the capable model's view 120,000; the
    blocking-not-built row's words; the intake's audience ceilings; *"A dry run is already running…"*.
  - **Removing the real repositories** `Manifest-local-dev/my-answers` and `class-check-ins` (and the older `f5-reading`,
    `lp-real-a` if they remain), when he wishes.
  - **Seen, not ours to fix in F4a:** at 375 the folded rail's *Sign out* takes the keyboard's focus with no visible
    ring (F4a's walk). Accessibility is a legal requirement (§3): a small fix of its own.
  - **Deferred minors:** F4a's four (its sitting 1 entry), F5's, F4's, F3's and F2's in their dated entries.
- **Done so far:** **F1** (2026-09-27), **F2** and **F3** (2026-09-28), **F4** (2026-09-29), **F5** (2026-09-30/10-01),
  **F4a** (2026-10-01): Rich clicked each on the real platform. The walk-through is the design ([`walkthrough.md`](./walkthrough.md)).
- **The platform** (the sessions in `/Users/rich/Developer/manifest`; §8):
  - **Who is who** *(names change at every handover: `ListAgents` first)*: `manifest-60` its planning session (Rich's
    decisions, anything cross-repo); `manifest-8e` its sitting 7 (7100 its own until its close, which it messages us); `manifest-s5-b3` Rich's S5 spike,
    **finished** (2026-10-01, its findings at manifest `0bb544c`): nothing of it runs, and it no longer needs telling of
    our test runs.
  - **Its launch-path plan**: sittings 1–5, 4a, 5b and **5a CLOSED** (`003adf7`: `Me.mayBuild`, `403 BUILDING_NOT_OPEN`,
    `409 MEMBER_MAY_NOT_BUILD`, `MANIFEST_ADMIN_PUIDS`; the mock's `MANIFEST_MOCK_MAY_BUILD=0`; the laptop's `student` may
    not build, `instructor` and `colleague` may, `operator` only as an administrator). **Mailpit landed** (`8155bcf`).
    **Sitting 6 CLOSED** (`manifest-92`, Task 9, `d54e1e1`; fix wave `db2ddbf`): two operations, `submitIamRegistration`
    and `submitPrivacyAssessment`; five codes; `since`, `stagingRegistration`, `submittedAt`/`submittedBy` (adopted in our
    test data, `f8dcfbc`; nothing else of ours moved). **Sitting 7 RUNNING** (`manifest-8e`, Task 10): its contract commit
    `6cbb489` landed (`draftIamRegistration`, mintable `launch:draft`, `IamRegistration.package`, `409 LAUNCH_RECORD_SUBMITTED`,
    `409 LAUNCH_NOT_CWL`, `iam_registration.drafted`), and its fix wave `dec71d8` (`draftGeneratedAt`, `409 LAUNCH_DRAFT_CHANGED`, `409 LAUNCH_DRAFT_STALE`: the sitting's last contract change), adopted with no change of ours; it messages us before any further
    contract commit and at its close. Then 8–10 (10 merged with the published-text pass) and 12. **Two questions for Rich** sit in manifest's ORIENTATION §8
    *Open*: `change_requested`'s two meanings, and whether a re-submission waits for UBC's order too. Then its **faculty-ready plan**: contract 1.6.0, `__Host-` cookies on https (its Task 5
    messages us first). `api-findings.md` has each shape.
  - **The contract is 1.5.0, 69 operations.**
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
- **The machine** *(2026-10-01, 15:15Z)*:
  - **Our server on 7105 is in MOCK mode** (`nohup pnpm dev:mock`, one watcher), against **our mock on 7102**, both
    restarted at F4a's close; **the mock again at sitting 7's fix wave** (pid 64522), for `dec71d8`'s examples. **A fresh dev database**: F5's is kept as
    `.data/app-before-f4a.sqlite`, F4a's acceptance runs as `.data/app-f4a-checks.sqlite`. Switch to edge mode before
    anyone clicks the real platform, and say so.
  - **7100 is the platform's**: **its sitting 7's (`manifest-8e`) until that sitting closes**: its Vitest runs truncate
    the database and stop the control plane, and its Docker tier restarts the edge and takes `default-chat-large` out of
    LiteLLM for a while. We are mock-only meanwhile (agreed with it, 2026-10-01). **LiteLLM on 7106; Mailpit on 7111/7112.**
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
    and `ours/pretend-people.ts` the pretend people (FE-3). **Only `src/auth.ts` names an `/auth/` path** (sign in, sign
    out, step-up).
    **Who may build (F4a)** is the platform's `Me.mayBuild`, read and never re-derived: `screens/keeps.ts`'s `useKeeps`
    (someone who may not build is asked `listProjects` once; its answer keyed to the person), `screens/not-open.tsx`
    (the screen, and `/new`'s two sentences), and `not-open.ts`, the signal a `BUILDING_NOT_OPEN` met part-way raises
    (from the platform's fetch or our `call()`), on which `session.ts` reads `getMe` again; Describing and Name it say
    nothing of it.
  - `packages/server` is 7105. `/api/me` replays the session to `GET /v1/me` and nothing else (FE-2); `Person` carries the
    platform's `mayBuild` (a `getMe` without it builds), never stored, and `POST /api/conversations` refuses a new start
    `403 BUILDING_NOT_OPEN` (F4a).
    - `store/` is its only database reader: one SQLite file in `.data/`, git-ignored, holding no credential.
    - `api/` is our own API. Every change is guarded by `Origin`, and every request by the person. Its contract with
      the page is `api/progress.ts`. One piece of work per conversation at a time runs through `api/work.ts`, its
      claims kept in the hub (`events.ts`), which the line reads. The folds: `intake-state.ts`, `round-state.ts`,
      `piece-state.ts` and `line-state.ts`. `api/build.ts` is the building routes, `api/apps.ts` an app's
      conversations, the secrets we asked for, the fix under way for an incident (**a fix names its address: `environment:
      'production'` for the live address**), the change under way for a refusal
      (`/refusals/:approvalId/conversation`), **a dry run's fix** (`{ fix: { dryRun } }`, held to its four fields, never the
      platform's `reason`; found again at `/rehearsals/:rehearsalId/conversation`), and the hand-over's two rows (`/plan?before=`),
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
    - `pnpm test` (1671 tests), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`; **`launch-actions.test.ts`** scans our
      server's text for every `/v1/` and `/auth/` path, and refuses a launch action;
    - `scripts/check-slice.sh` (F1's, 8), `scripts/check-describing.sh` (F2's, 18), `scripts/check-building.sh`
      (F3's, 12), **`scripts/check-seeing.sh` (F4's, 8)**, **`scripts/check-going-live.sh` (F5's, 8)**: each in mock mode, `pnpm
      mock` and `pnpm dev:mock` running. Run `check-seeing.sh` first, then `check-going-live.sh`, while the mock's app is free.

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
| [`plans/2026-09-29-f5-going-live.md`](./plans/2026-09-29-f5-going-live.md) | **The current plan**: F5, its sittings, Rich's decisions and ours, and what waits on the platform (F5b) |
| [`plans/2026-09-29-f4a-only-faculty-build.md`](./plans/2026-09-29-f4a-only-faculty-build.md) | F4a, approved: built when the platform's `Me.mayBuild` lands |
| [`plans/2026-09-28-f4-seeing-and-changing-it.md`](./plans/2026-09-28-f4-seeing-and-changing-it.md) | F4, executed: its sitting 7 is the record of Rich's click |
| [`plans/2026-09-28-f3-building-it.md`](./plans/2026-09-28-f3-building-it.md) | F3, executed: its sitting 7 is the record of the real platform |

*`research/`'s contract digest predates the platform's sittings 7–9a (57 operations, not 66). For F3, read the
contract and the guides themselves.*

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
