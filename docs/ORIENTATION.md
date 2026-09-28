# Orientation — read this first

**What this is.** The single entry point to `manifest-app`, for an agent with an empty window or a developer
joining. **The next job is always in the current plan's sittings table**, and [`plans/roadmap.md`](./plans/roadmap.md)
says which plan is current. This file states where things stand and the rules. It states no sitting's story.

**Where things stand** *(2026-09-28, after F2's sitting 6 and the marker on 7105)*:
- The faculty experience is designed moment by moment and **approved by Rich**
  ([`walkthrough.md`](./walkthrough.md)).
- The platform's gaps are listed, and Rich's decisions on them have been carried to the platform session
  ([`api-findings.md`](./api-findings.md), [`2026-09-27-to-the-platform-session.md`](./2026-09-27-to-the-platform-session.md)).
- **F1 is executed** (2026-09-27), in [`plans/2026-09-27-f1-foundations.md`](./plans/2026-09-27-f1-foundations.md):
  sign-in, the shell, *Your apps*, and a profile.
- **F2 is built and accepted, but for Rich's click**, in
  [`plans/2026-09-27-f2-describing-it.md`](./plans/2026-09-27-f2-describing-it.md). All six sittings are done
  (2026-09-27/28). Moments 3–5:
  - describe it; at most three questions a round, two rounds;
  - name it, with every address checked;
  - *Make it* in the person's session, the conversation's token handed to our server;
  - the plan, written on the person's agent session, corrected in a sentence, agreed, and committed into the app
    as `docs/plan.md`.
  - **Against the mock:** `scripts/check-describing.sh`, 17/17.
  - **Against the real platform:** walked whole in headless Chrome at `https://app.manifest.internal`, signed in
    as the IdP's test user (Rich's permission, that user only). A real `docs/plan.md` was committed.
  - **The whole-branch review's 2 Critical and 8 Important are fixed**, and so are four defects only the real
    platform showed. The sitting 6 entry has them, and **the laptop model's words, verbatim**: the shape always
    right, what it says weak.
  - **Owed:**
    - **Rich's clicked half**: open `https://app.manifest.internal/new`, sign in as `instructor`, and click
      moments 3–5. **It now waits for sitting 9a**, because the control plane is stopped (the machine, below).
    - then the close-out that marks F2 executed.
  - **For Rich to decide:**
    - nine Minors deferred by the review (the plan's sitting 6 entry, and the ledger);
    - FE-31.
- **The capable model is being built**: the platform's sitting 9a, which Rich started on 2026-09-28.
  - **Predicted by the platform session:** the name is `default-chat-large`, at `max_classification` internal,
    and nothing in the contract moves. Our plan agent then takes `MANIFEST_APP_PLAN_MODEL=default-chat-large`.
  - **Rich chose `openai/gpt-6-luna`.** LiteLLM prices it only from the list it downloads when it starts with the
    network on. Its bundled offline list stops at gpt-5.6.
    - Started offline, it cannot price the model, so the platform refuses to register `default-chat-large` and
      writes an operator line instead. Our plan agent would then have no model.
  - **The platform session will message us** (`manifest-app-b0`) when 9a lands: the commit, the model name, and
    what moved in the contract.
- **Next: F3 (building it)**, to be written once F2 is executed **and 9a has landed**. Do not start F3 before the
  platform session's message.
- **The machine** *(2026-09-28, after the marker)*:
  - **the control plane on 7100 is stopped**, by the platform session for 9a, with Rich's word. Its first Vitest
    run truncates the database, so **the F2 walk's projects are gone**. Bring the control plane back only per
    manifest's RUNBOOK, after 9a, and ask Rich first;
  - our server on 7105 in edge mode, with nothing behind it until then. The platform's `make doctor` asks it
    `/api/__doctor`;
  - the mock on 7102.
  - To go back to the mock: stop our server's whole process tree, then `pnpm dev:mock`.
- **The platform:** sittings 8 (archive and restore) and 9 (delete, `4738abb`) have landed, both F6's. 66
  operations, 1.4.0. Our typecheck and tests pass against it.
- **How to run it** is §6, below.
- **The workspace:**
  - `packages/ui` is the design system, **ours since Rich's *"fix it at source"***. Its stylesheets are in
    `src/`, and `reference/bundle.js` holds the four components' markup by the parity test.
  - `packages/web` is the app. Only `src/platform` calls the platform, and `words.ts` holds every sentence.
  - `packages/server` is 7105. `/api/me` replays the session to `GET /v1/me` and nothing else (FE-2).
    - `store/` is its only database reader: one SQLite file in `.data/`, git-ignored, holding no credential.
    - `api/` is our own API. Every change is guarded by `Origin`, and every request by the person. Its contract
      with the page is `api/progress.ts`. One piece of work per conversation at a time runs through
      `api/work.ts`.
    - `model/` asks a model for structured output only. `agents/` are the agents, each a schema and a prompt:
      the three intake agents, and the plan.
    - `platform/` is every call our server makes, **always with the conversation's token or a model key**, never
      the person's session.
  - **The gates:**
    - `pnpm test` (526 tests), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`;
    - `scripts/check-slice.sh` (F1's);
    - `scripts/check-describing.sh` (F2's, mock mode).
- **Findings not yet carried to the platform session** (Rich's to carry):
  - FE-26 to FE-30, as before;
  - **FE-31**: `listBlueprints` offers a test fixture with no CWL sign-in, and nothing marks it.
- **The platform's request to us is answered** (2026-09-28): `GET /api/__doctor` on 7105 answers
  `{"name":"manifest-app"}`, with no session, so its `make doctor` can tell our server from a stray process (its
  F12). The platform session has been told. **Keep that path and that answer.** The platform's doctor matches
  them.

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

**In manifest, read-only:**
- `docs/superpowers/design/system/`: the design system, the language, the states, the components;
- `docs/api/`: the API's own guides, also served at `GET /v1/docs`;
- `packages/contract/openapi.json`: the source of truth;
- `packages/console/src/api.ts`: how every call is made.

## 5. How to work here

- **Superpowers skills:** `brainstorming` before design, `writing-plans` for a plan, TDD when building,
  `verification-before-completion` before claiming anything.
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
- **A problem's reference is only as good as its report.** If a reference shown on screen is missing from
  `problems` (`packages/server/.data/app.sqlite`), the report was refused. That is how sitting 4's second defect
  was found.
