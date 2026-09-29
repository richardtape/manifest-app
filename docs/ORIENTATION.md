# Orientation — read this first

**What this is.** The single entry point to `manifest-app`, for an agent with an empty window or a developer
joining. **The next job is always in the current plan's sittings table**, and [`plans/roadmap.md`](./plans/roadmap.md)
says which plan is current. This file states where things stand and the rules. It states no sitting's story.

**Where things stand** *(2026-09-29, afternoon: F4 executed)*:

- **YOUR JOB, IF YOU ARE THE NEXT SESSION: F5 — Going live, the next plan, written with Rich** (moments 10–15:
  the clocks, the checklist in our words, the dry run, waiting on sign-off, step-up, the address handed over).
  [`plans/roadmap.md`](./plans/roadmap.md) says so. Nothing is built for it.
  - **How:** superpowers:brainstorming, then writing-plans, as F4 was written (one session, with Rich, then his
    approval). Ask Rich first whether F5 waits for **the platform's next plan, the launch path** (FE-6, FE-25), **written by
    `manifest-63` on 2026-09-29** (manifest's `docs/superpowers/plans/2026-09-29-launch-path.md`, `0904ad5`; read-only),
    so F5 can argue from what it will build.
  - **Read first:** the walk-through's moments 10–15; `api-findings.md`'s table rows dated 2026-09-29 (the platform's
    close, its recommendations, Rich's two decisions, real GitHub); F4's plan, sitting 7's dated entry, and its *Open
    for Rich*.
- **F4a, *Only faculty build*, is written, approved by Rich, and waits on the platform** ([`plans/2026-09-29-f4a-only-faculty-build.md`](./plans/2026-09-29-f4a-only-faculty-build.md),
  walk-through **D7**, **FE-39**; Rich, 2026-09-29, after a student could start an app). When the platform's contract
  answers `Me.mayBuild` (its launch-path sitting 5a; it messages us at that commit), F4a is one sitting, before or
  beside F5. Ask Rich to confirm the method (native recommended) before starting it.
- **What F4 built** (moments 7–9; the plan's dated entries have each): the app's own pages and the Preview's three
  tabs, *Try it as*, the two facts; a change as its own conversation, **the line** (one at a time, the next starting
  by itself), the change's plan agreed and committed into `docs/plan.md` before its round, the lead on an app that
  exists (`unread`); trying-out from the person's own session (the version fixed at the question, four stations, a
  staging secret from the browser to the platform alone).
- **What sitting 7 did** (`manifest-app-9d`): the whole-branch review (no Critical; its two Importants fixed: **[Stop
  here] on every card that holds the app**, and **one fix conversation per incident**); `scripts/check-seeing.sh`
  (8/8, four negative controls); the real platform at Rich's word, walked end to end (one defect: a copied title);
  **Rich's click**, on an app of his own, found two more, each fixed test-first:
  - **a round's model call was cut at 60 s** and said *"We can't reach the model…"*: a round now waits five minutes
    (`ROUND_MODEL_TIMEOUT_MS`, `model/client.ts`);
  - **`models_withdrawn` after the lead's own commit made his app confidential**, though the capable model stayed
    allowed: **Rich decided** the round carries on by itself when a new session still lists the model it was using,
    and says *"Your app now keeps confidential data. We carried on."*; his card only when the model is gone.
- **Open for Rich** (sitting 7's entry has each): *Trying out* offers *[Open it in a new tab]* while its words say
  nobody can sign in there yet; a timeout's own words (*"…is taking longer than usual"*) and streaming the model's
  answers; whether the two acceptance projects on 7100 are kept usable after the platform moves to real GitHub; a
  negative control's re-run log that the tool's classifier would not let us read. **F4's deferred minors** (the
  review's eleven, and F3's) are in the plan's sitting 7 entry and the ledger.
- **Done so far:**
  - The faculty experience is designed moment by moment, and **approved by Rich** ([`walkthrough.md`](./walkthrough.md)).
  - **F1 is executed** (2026-09-27): sign-in, the shell, *Your apps*, and a profile.
  - **F2 is executed** (2026-09-28): moments 3–5, describe it to the plan committed as `docs/plan.md`.
  - **F3 is executed** (2026-09-28): moment 6. Rich clicked moments 3–6 on the real platform.
  - **F4 is executed** (2026-09-29): moments 7–9, seven sittings (`manifest-app-bb`, `-07`, `-f8`, `-56`, `-9d`). Rich
    clicked moments 7–9 on the real platform.
- **The platform** (the session in `/Users/rich/Developer/manifest`; how to work with it is §8):
  - **Its sitting 12 closed at `e824956` (2026-09-29): the front-end enablement plan is EXECUTED.** The contract is
    **1.4.0, 66 operations, 128 codes**, unchanged since `16c3357`. **Its next session, `manifest-63`**, wrote the
    next platform plan: the launch path (FE-6, FE-25; `0904ad5`), with **FE-38 as its Task 4, FE-33 as Task 5, FE-34 as
    Task 6** (measured first: LiteLLM 1.98's router has no setting for it), member removal and the key trim. It messages
    us before any commit to `packages/contract` or `packages/mock`.
  - **7100 is moving to real GitHub.** Rich set `MANIFEST_SOURCE_DRIVER=github` in manifest's `.env`; **`manifest-63`
    restarted the control plane onto driver 2 (real GitHub, `Manifest-local-dev`) on 2026-09-29**, after F4's close. Then every driver-1 project answers `409 SOURCE_PROVIDER_MISMATCH`
    (F4's `my-weekly-thoughts` and `notes-and-answers` among them), and **anything created through 7100 makes a real
    private repository on github.com that nothing deletes**. A real-platform walk from then on is Rich's word, every
    time. **Never restart the control plane yourself.**
  - **Findings:** FE-26 to FE-32 carried; FE-35 and FE-36 decided and built, **FE-36 changing** (Rich, 2026-09-29: a
    key trimmed in place, not the session ended); **FE-11 decided** (removing a member revokes their tokens and ends
    their sessions); **FE-33, FE-34 and FE-38: the platform recommends our option (a) for each**, pending Rich; FE-37
    fixed. Rich carries what he decides.
  - **The laptop's on-premise names are `qwen3.8:27b`**; the capable model is `default-chat-large`
    (`openai/gpt-6-luna`), read from `session.models`, never assumed. A fallback says so in
    `x-litellm-attempted-fallbacks: 1`.
  - **The platform's `make doctor` asks our server `GET /api/__doctor`**, which answers `{"name":"manifest-app"}`, in
    either mode, with no session. **Keep that path and that answer.**
- **The machine** *(2026-09-29, afternoon)*:
  - **Our server on 7105 is in mock mode** (`nohup pnpm dev:mock`, one watcher), against **our mock on 7102** (node
    93237, restarted from current source at sitting 7). **Its dev database** is sitting 7's fresh one, with its runs
    (`check-seeing.sh` sets its third change aside each run, so the mock's app is left free); `app-before-f4s7.sqlite`
    is the one before.
  - **The control plane on 7100 is the platform session's.** Query it (`lsof -nP -iTCP:7100 -sTCP:LISTEN`), ask Rich,
    and tell the platform session before using it.
  - **Our dev script trusts the system's CAs** (`NODE_OPTIONS=--use-system-ca`), where the laptop's platform CA lives.
  - To switch to the edge: stop our server's whole process tree (§7's trap), then `pnpm dev`. To switch back: the same,
    then `pnpm dev:mock`.
- **How to run it** is §6, below.
- **The workspace:**
  - `packages/ui` is the design system, **ours since Rich's *"fix it at source"***. Its stylesheets are in `src/`,
    and `reference/bundle.js` holds the components' markup by the parity test. Our extensions have tests of their own:
    SideNav's two; FormField's `count`, `FieldCount` and `secret`; LiveSteps' `line` and `detail`; `Disclosure`;
    SegmentedControl's arrow keys, tab order, `controls` and `label`.
  - `packages/web` is the app. Only `src/platform` calls the platform, and `words.ts` holds every sentence.
    `screens/building/` is moment 6, `screens/preview/` moment 7 (its facts pure, in `facts.ts`), `screens/change/`
    moment 8, `screens/trying-out/` moment 9 (`put.tsx`; its stations and the question's version pure, in
    `stations.ts`), and `ours/pretend-people.ts` the pretend people (FE-3). The router's `remember` keeps an address
    without a navigation. **Only `src/auth.ts` names an `/auth/` path** (sign in, sign out, step-up).
  - `packages/server` is 7105. `/api/me` replays the session to `GET /v1/me` and nothing else (FE-2).
    - `store/` is its only database reader: one SQLite file in `.data/`, git-ignored, holding no credential.
    - `api/` is our own API. Every change is guarded by `Origin`, and every request by the person. Its contract with
      the page is `api/progress.ts`. One piece of work per conversation at a time runs through `api/work.ts`, its
      claims kept in the hub (`events.ts`), which the line reads. The folds: `intake-state.ts`, `round-state.ts`,
      `piece-state.ts` and `line-state.ts`. `api/build.ts` is the building routes, `api/apps.ts` an app's
      conversations, the secrets we asked for, and **the fix under way for an incident**, and `api/plan.ts` a plan.
    - `model/` asks a model for structured output only, and says which model answered. **A round's calls wait five
      minutes** (`ROUND_MODEL_TIMEOUT_MS`), the intake's and the plan's 60 s. `agents/` are the agents, each a schema
      and a prompt: the three intake agents, the plan, the change planner, the lead, the CWL specialist and the
      explaining agent.
    - **`runtime/` is our own agent framework**: it knows no platform. `build/` holds the lead's guards and moves,
      `round.ts`, the round of work (it renews a session the platform withdrew, once a leg), and `line.ts`, the line.
    - `platform/` is every call our server makes, **always with the conversation's token or a model key**, never
      the person's session, and **never a deploy anywhere but the sandbox**. `platform/sign-in.ts` follows a draft's
      `/login` to the IdP.
  - **The gates:**
    - `pnpm test` (1229 tests), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`;
    - `scripts/check-slice.sh` (F1's, 8), `scripts/check-describing.sh` (F2's, 18), `scripts/check-building.sh`
      (F3's, 12), **`scripts/check-seeing.sh` (F4's, 8)**: each in mock mode, `pnpm mock` and `pnpm dev:mock` running.
      Run `check-seeing.sh` first, while the mock's app is free.

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
  though the gateway answered and billed it. A round's calls now wait five minutes (`ROUND_MODEL_TIMEOUT_MS`); a
  timeout still says *unreachable* (F4 sitting 7). The platform session can read LiteLLM's spend log: ask it.
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

## 8. Working with the platform session, and other agents

The platform is built by **another Claude session**, in `/Users/rich/Developer/manifest`. It executes the front-end
enablement plan there, one sitting per session. We share the machine, the control plane, and Rich.

- **Finding it.** Call `ListAgents`. Load `SendMessage` with `ToolSearch` if it is deferred. The platform session is
  the live session named `manifest-…` (it was `manifest-de`, `manifest-b1`, `manifest-82`, then `manifest-7c`, which F3's sitting 7 found stopped by Rich
  and back at its close, then `manifest-c3` for its sitting 11a, `manifest-8b` for its sitting 12 and close, and `manifest-63` for the next
  plan, the launch path), or the one whose messages come
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
