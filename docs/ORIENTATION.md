# Orientation — read this first

**What this is.** The single entry point to `manifest-app`, for an agent with an empty window or a developer
joining. **The next job is always in the current plan's sittings table**, and [`plans/roadmap.md`](./plans/roadmap.md)
says which plan is current. This file states where things stand and the rules. It states no sitting's story.

**Where things stand** *(2026-09-29, morning: F4's sittings 1 to 5 done; F3 executed)*:

- **YOUR JOB, IF YOU ARE THE NEXT SESSION: F4's sitting 6, Task 10**: trying-out (moment 9): *[Put this version on
  trying-out]* on the building screen's end and the Preview's draft tab, the question (the release fixed when it is
  asked), `deploy` from the person's session, the four stations, and the two failures (*It never answered*, with
  *[What went wrong]*; a secret with no value there). The plan is
  [`plans/2026-09-28-f4-seeing-and-changing-it.md`](./plans/2026-09-28-f4-seeing-and-changing-it.md), approved by Rich:
  one agent, natively (superpowers:executing-plans). **Sitting 6 needs no platform**: our mock (also under
  `MANIFEST_MOCK_FAIL=1` for the never-answered path, on a port of its own), and our own fakes.
  - **Read first:** the plan's *Decided by Rich* (with *Words proposed for Rich*), Decisions 11 and 15, Global
    Constraints, Review Focus 2 and 5, **sittings 1 to 5's dated entries** (sitting 1's M2, M3 and M4 above all), then
    Task 10 in full. Corrections are marked **(S1)**, **(S2)**, **(S4)** and **(S5)**: trust those over the unmarked
    text around them. **Task 10's (S5) note says what sittings 4 and 5 already built for it.**
  - The ledger is `.superpowers/sdd/2026-09-28-f4-seeing-and-changing-it/progress.md` (git-ignored): every run and
    ruling with its cost.
- **What sitting 5 built** (its dated entry has each, and fourteen rulings):
  - **The lead on an app that exists** (Task 8): `docs/plan.md` from the tree for every round; the agreed change, or a
    fix (staging's incident, by our token; a confidential app's said as unreadable, never read another way), in its
    view; **`unread`**, which sends back a rewrite of a file it does not know as it is now (every round); their messages
    joined to the *Changes* before the build.
  - **Rich's decision (2026-09-29): a session the platform ends as `models_withdrawn` stops the round and asks first**
    (`needs: withdrawn`, its card on the building screen, *Carry on* starts a new session).
  - **Moment 8's screens** (Task 9): *Ask for a change*; the waiting card; *"Here's what we'd change"* with *Yes, change
    it* and *Not now*; set aside; the box open again once built; the app's conversations; *[What went wrong]* on the
    Preview's failed draft attempt. **Its walk found four defects no unit test could**, fixed (`18b1fe4`).
- **What sitting 4 built:** the line (one conversation holds an app; work in flight holds it too; the store's version
  4); `/api/apps/:projectId/conversations`; the change's plan, planned from `docs/plan.md` and committed with its
  *Changes* before round *n+1*.
- **What sitting 3 built:** moment 7. `/apps/:slug` is the Preview (three tabs, the pretend people on the draft only,
  UBC's words and a still *waiting on UBC's identity team* on *Trying out*, the two facts); the rail's project section.
  `/apps/:slug/conversations` and `/change` still say they arrive next: **Task 9 builds them**, and *[What went wrong]*.
  **FE-38 is written** (the last attempt cannot be read from `listInstances`; meanwhile `screens/preview/facts.ts`).
- **What sittings 1 and 2 built and measured:** `SegmentedControl` and `Timeline`; Rich's four F3 decisions; names people
  read (`slugOf`). A staging deploy from the person's session answers `200 healthy` in 5–9 s with no step-up, listed
  while it runs (found by id, never position); a missing staging secret is `409 RELEASE_SECRET_NOT_SET`, named as fields
  only by `listAppSecrets(staging)`; on the capable model the change planner parsed 5 of 5 (its one flaw, answered
  questions asked again, **fixed by Task 7**) and the lead read before writing 5 of 5.
- **What Rich decided for F4, 2026-09-28** (the plan has each): laptop staging only; *Trying out* says UBC's words
  everywhere, his sentence; **a change is agreed before it is built** (built); his four F3 items (built); names people
  read (built); the laptop sentence (approved and built).
- **FE-35 and FE-36 are DECIDED** (Spec action 10) and **built** by the platform's sitting 11a: under the default
  `capable` setting a confidential session lists `default-chat-onprem`, `default-chat-onprem-reasoning`, then
  `default-chat-large`; **`models_withdrawn`** ends a session holding a model its project no longer allows, so the next
  piece of work starts a new one (Task 8); a delegated token on a confidential project's staging or production
  `listIncidents` is **`403 INCIDENT_LOG_CONFIDENTIAL`** (Tasks 8–10 meet it, and never hand the person's own reading
  to our server or a model; **`8c7eb5e`** made that the contract's words too). **The contract: 1.4.0, 66 operations,
  128 codes** (manifest `90b8e81`; text only since `38c2ade`). **Our mock has `MANIFEST_MOCK_CONFIDENTIAL=1`**; our 7102
  mock has not reloaded it (restart it with the variable when a test needs it).
- **Done so far:**
  - The faculty experience is designed moment by moment, and **approved by Rich** ([`walkthrough.md`](./walkthrough.md)).
  - **F1 is executed** (2026-09-27): sign-in, the shell, *Your apps*, and a profile.
  - **F2 is executed** (2026-09-28): moments 3–5, describe it to the plan committed as `docs/plan.md`.
  - **F3 is executed** (2026-09-28): moment 6. Rich clicked moments 3–6 on the real platform. The whole-branch review's
    minors are deferred (its sitting 7 entry, and the ledger).
  - **F4 is written and approved** (2026-09-28); **sittings 1 to 5 are done** (1 in `manifest-app-bb`; 2 and 3 in
    `manifest-app-07`; 4 and 5 in `manifest-app-f8`). Its whole-branch review is sitting 7's.
- **The platform** (the session in `/Users/rich/Developer/manifest`; how to work with it is §8):
  - **Its sitting 11a is CLOSED at `90b8e81`** (`manifest-c3`). **Its sitting 12, the acceptance, is under way**
    (`manifest-8b`: `make demo-frontend` on the `app` origin, a clicked half, the whole-branch review; its LAST sitting).
    It **borrowed 7105 for Rich's clicked half** (sitting 5 stopped our server and started it again when returned), and
    restarts 7100 onto driver 2 and back for its GitHub-driver runs. **It messages us before any truncation or restart
    of 7100, at any contract or mock commit, and at its close.** Find its live name with `ListAgents`.
  - **The laptop's on-premise names are `qwen3.8:27b`** (`9c9c500`): `default-chat-large`'s fallback answers as
    `ollama_chat/qwen3.8:27b`, and a cold first call takes about 12 s.
  - **The capable model:** ask for `default-chat-large` (`openai/gpt-6-luna`), read from `session.models`, never
    assumed. A fallback answer says so in `x-litellm-attempted-fallbacks: 1`.
  - **Our findings FE-26 to FE-32 are carried; FE-35 and FE-36 are decided and built; FE-33, FE-34 and FE-38 are
    written and not carried; FE-37 is fixed.** Rich carries what he decides.
  - **The platform's `make doctor` asks our server `GET /api/__doctor`**, which answers `{"name":"manifest-app"}`, in
    either mode, with no session. **Keep that path and that answer.**
- **The machine** *(2026-09-29, early morning)*:
  - **Our server on 7105 is in mock mode** (`nohup pnpm dev:mock`, one watcher), against **our mock on 7102** (node
    28239). **Its dev database is new** (sitting 5, version 4), holding only sitting 5's walks, none of which holds the
    mock's project; the one before is kept beside it as `packages/server/.data/app-before-f4s5.sqlite` (with its
    `-wal` and `-shm`).
  - **Our dev script trusts the system's CAs** (`NODE_OPTIONS=--use-system-ca`), where the laptop's platform CA lives.
  - **The control plane on 7100** is the platform session's. Query it before using it
    (`lsof -nP -iTCP:7100 -sTCP:LISTEN`), ask Rich, and tell the platform session.
  - To switch to the edge: stop our server's whole process tree (§7's trap), then `pnpm dev`. To switch back: the same,
    then `pnpm dev:mock`.
- **How to run it** is §6, below.
- **The workspace:**
  - `packages/ui` is the design system, **ours since Rich's *"fix it at source"***. Its stylesheets are in `src/`,
    and `reference/bundle.js` holds the components' markup by the parity test. Our extensions have tests of their own:
    SideNav's two; FormField's `count`, `FieldCount` and `secret`; LiveSteps' `line` and `detail`; `Disclosure`;
    SegmentedControl's arrow keys, tab order, `controls` and `label`.
  - `packages/web` is the app. Only `src/platform` calls the platform, and `words.ts` holds every sentence.
    `screens/building/` is moment 6, `screens/preview/` moment 7 (its facts pure, in `facts.ts`), **`screens/change/`
    moment 8** (ask, the waiting and set-aside screens, the app's conversations), and `ours/pretend-people.ts` the
    pretend people (FE-3). The router's `remember` keeps an address without a navigation.
  - `packages/server` is 7105. `/api/me` replays the session to `GET /v1/me` and nothing else (FE-2).
    - `store/` is its only database reader: one SQLite file in `.data/`, git-ignored, holding no credential.
    - `api/` is our own API. Every change is guarded by `Origin`, and every request by the person. Its contract with
      the page is `api/progress.ts`. One piece of work per conversation at a time runs through `api/work.ts`, **its
      claims kept in the hub** (`events.ts`), which the line reads. The folds: `intake-state.ts`, `round-state.ts`,
      **`piece-state.ts`** (each change one `asked` message) and **`line-state.ts`** (`holds`, the holder, a place).
      `api/build.ts` is the building routes, **`api/apps.ts`** an app's conversations, and `api/plan.ts` a plan, the
      first or a change's (its `Planning.begin` is what the line calls).
    - `model/` asks a model for structured output only, and says which model answered. `agents/` are the agents,
      each a schema and a prompt: the three intake agents (naming writes names only; `slugOf` makes the address),
      the plan (with `readPlanMarkdown`), **the change planner**, the lead, the CWL specialist and the explaining agent.
    - **`runtime/` is our own agent framework**: it knows no platform. `build/` holds the lead's guards and moves,
      `round.ts`, the round of work, and **`line.ts`, the line** (`beginPiece`: plan a change, build a fix, carry on).
    - `platform/` is every call our server makes, **always with the conversation's token or a model key**, never
      the person's session. `platform/sign-in.ts` follows a draft's `/login` to the IdP.
  - **The gates:**
    - `pnpm test` (1162 tests), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`;
    - `scripts/check-slice.sh` (F1's, 8), `scripts/check-describing.sh` (F2's, 18), `scripts/check-building.sh`
      (F3's, 12): each in mock mode, `pnpm mock` and `pnpm dev:mock` running.

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
| [`plans/2026-09-28-f4-seeing-and-changing-it.md`](./plans/2026-09-28-f4-seeing-and-changing-it.md) | **The current plan**: F4, its sittings, Rich's decisions and ours |
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
  Vitest returns then leaves it broken: stop the Vitest processes, and check the file (sitting 6).
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
- **Zod strips a key its schema does not name.** A negative control that makes a model's extra field matter (a `slug`
  it was told not to write) must change the schema **and** the code that reads it, or it stays green (F4 sitting 2).

## 8. Working with the platform session, and other agents

The platform is built by **another Claude session**, in `/Users/rich/Developer/manifest`. It executes the front-end
enablement plan there, one sitting per session. We share the machine, the control plane, and Rich.

- **Finding it.** Call `ListAgents`. Load `SendMessage` with `ToolSearch` if it is deferred. The platform session is
  the live session named `manifest-…` (it was `manifest-de`, `manifest-b1`, `manifest-82`, then `manifest-7c`, which F3's sitting 7 found stopped by Rich
  and back at its close, then `manifest-c3` for its sitting 11a), or the one whose messages come
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
