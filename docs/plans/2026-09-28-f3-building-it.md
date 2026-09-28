# F3 — Building It: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task,
> as ONE agent (Rich, 2026-09-28: not subagent-driven). Steps use checkbox (`- [ ]`) syntax for tracking.
> **Read [`../ORIENTATION.md`](../ORIENTATION.md) first. F2 is executed; this plan starts from it.**

**Status: approved by Rich, 2026-09-28:** *"The plan is approved. I think we'll work on this with one agent not
sub-agent."* It is executed by one agent, natively (superpowers:executing-plans), one sitting per session, with the
whole-branch review by one fresh reviewer at the end (Task 12). **Sittings 1–4 are done (2026-09-28, in one session at
Rich's word), and Tasks 2–12 are corrected to what sitting 1 measured. Sitting 5 is next.**

**Goal:** Once the person says *Yes, build that*, the lead agent builds their app from the agreed plan, on their own
agent session with the capable model. It commits the code, builds it, puts it on the draft address and checks that
it answers. The person watches moment 6 in layout C. They can answer questions, add a message, and stop. Walk-through
moment 6, which hands over to F4's *Seeing it*.

**Architecture:**
- **`runtime/`, our own small agent framework** (Rich, 2026-09-28), with ideas taken from OpenAI's Agents SDK and
  Vercel's AI SDK and no dependency on either:
  - an agent is data: a prompt, a brief rebuilt before every call, an answer schema, and checks;
  - a move is a tool: a zod schema, a guard, and what it does;
  - a runner asks for **one structured move at a time**, guards it, carries it out with a context the model never
    sees, records it, and stops on explicit conditions;
  - a run is saved, so it pauses and resumes.
- **`build/`, the round of work:** moment 6's five steps in a fixed order. Each ticks only on its own platform
  signal. The three tries, the checkpoint, *Stop*, the person's messages and questions all live here.
- **`platform/`, every new call, with the conversation's token:**
  - the app's files, and commits;
  - builds, releases, and deploys to the sandbox;
  - instances, incidents, and what the app printed;
  - the budget, the members list, and agent sessions;
  - the project's live event stream.
- **The page: `screens/building/`,** layout C. The conversation is on the left; the work is on the right.

**Tech Stack:**
- F2's: TypeScript 5, Node 24, Fastify 5, React 19, Vite, Vitest 2.1.9, `zod` 3.25.76 through `zod/v4`,
  `node:sqlite`.
- **No new dependency.** The platform's event stream is read with the contract's own `subscribe()` helper (M1, M3:
  it runs on a server with a token).

**Spec:**
- [`../walkthrough.md`](../walkthrough.md): moment 6 (layout C, approved by Rich), D3, D5, D6 and D8's session cap;
- [`../agents.md`](../agents.md): the roster, and rules 1–5;
- [`../api-findings.md`](../api-findings.md): FE-3, FE-7, FE-8, FE-19, FE-20, FE-23, FE-24, FE-32;
- manifest's `docs/api/agents.md`, `authoring.md` and `events.md`, and `openapi.json` 1.4.0: read-only, as ever;
- **the design Rich approved in conversation on 2026-09-28, in four parts** (the pieces, a round's flow, failures,
  testing). It is recorded below, in *Decided by Rich* and *Decisions this plan makes*.

---

## How this plan is executed: sittings, one per session

| Sitting | Tasks | Delivers | Status |
|---|---|---|---|
| 1 | 1 | **The measurements.** The capable model's structured answers; the mock's build and deploy answers; the platform's stream from a server; a round by hand on the real platform; the two frameworks' current documentation; the blueprint's sign-in code. **Alone, and first.** M3 and M4 need the control plane, which the platform's 9b has stopped: they wait for its *"CLOSED"* | **done 2026-09-28** (the dated entry below) |
| 2 | 2, 3 | The runtime: agents, moves, the runner, its stop conditions, guards, the trace, saved runs. And the model client recording which model answered, and its usage | **done 2026-09-28**, in sitting 1's session at Rich's word (the dated entry below) |
| 3 | 4, 5 | The platform calls, and the project's event stream | **done 2026-09-28**, in the same session at Rich's word, beside the platform's sitting 10 (the dated entry below) |
| 4 | 6, 7 | The guards, then the three agents (the lead, the CWL specialist, the explaining agent) and the lead's moves | **done 2026-09-28**, in the same session at Rich's word (the dated entry below) |
| 5 | 8, 9 | The round of work, our API's building routes, the building frames, and the new tables | not started |
| 6 | 10, 11 | The design system's additions, and the building screen, layout C | not started |
| 7 | 12 | **The acceptance:** against the mock with a scripted model; on the real platform with the capable model; Rich's click. **Alone, and last** | not started |

**Every sitting ends as F2's did:**
1. the four gates, `pnpm test` twice;
2. a dated entry in *What executing this plan found*;
3. this table;
4. ORIENTATION's *Where things stand*, and the roadmap.

## Decided by Rich: build them, do not re-open them

- **Moment 6, as the walk-through has it** (2026-09-27):
  - Layout C.
  - Steps, plus a line now.
  - Cost always visible.
  - $2 per piece of work, with a *Carry on* checkpoint. Never a new session without asking.
  - Three tries, then ask.
  - *"It started and answered"*, never *"It works"*.
  - *Stop* keeps whatever the draft address has.
  - **One correction to its table, agreed 2026-09-28:** every commit is preceded by its dry run, so the dry run
    belongs to *Writing the pages*. *Checking it holds together* is the platform's check of the committed settings,
    plus our own check that everything the code loads exists (Decision 6).
- **The capable model** (2026-09-28): `openai/gpt-6-luna` as `default-chat-large`, or `openai/gpt-6-sol` if luna
  does not do. A client reads the names from `session.models`. The platform's 9b adds a fallback under the same
  name: the on-premise model, when OpenAI cannot be reached.
- **When the fallback answers, carry on, and say so** (2026-09-28, in sitting 1, after M1 showed the fallback is the
  4B on-premise model with a 16k-token context):
  - the lead goes on building on whatever answers `default-chat-large`, so an offline laptop still builds;
  - what the lead sees is capped so the fallback's context never cuts it (Decision 3);
  - the person is told once in the conversation that we are working with a smaller model while the usual one cannot
    be reached (Decision 4).
- **The helpers F3 builds: the lead, the explaining agent, and a CWL specialist** (2026-09-28, option B). Toolkit
  specialists beyond CWL, and the domain helpers, come later: toolkit know-how has no home yet (FE-19).
- **Who is staff inside the app we build** (2026-09-28, option B):
  - The instructor, from the start.
  - Anyone the instructor names, by UBC email, which CWL releases.
  - This is kept apart from who may change the app (moment 18's *People*).
- ***"You can leave"* promises only what is true** (2026-09-28, option A): *"A few minutes. You can leave: it keeps
  going, and this page shows where it got to when you come back."* F6 adds email when it can send one. So does *"after
  a day we email once"*, for a question nobody answers.
- **Our own agent framework**, inspired by OpenAI's Agents SDK and Vercel's AI SDK, with no dependency on either
  (2026-09-28).
  - **What it takes from them:**
    - agents as data;
    - tools with schemas;
    - agents as tools;
    - a run context kept from the model;
    - stop conditions;
    - rebuilding the view before each step;
    - guardrails;
    - pausing for a person, with resumable state;
    - tracing.
  - **What it leaves out:**
    - native tool calling, for now;
    - handoffs;
    - their provider layers;
    - chat memory;
    - installing either.
- **The acceptance on the real platform** (2026-09-28) may:
  - spend on Rich's OpenAI key: cents a round, $2 a round at most;
  - sign in as the test user `instructor` by itself;
  - commit a deliberate break into that user's own project, to watch the lead fix it.
- **A sign-in limited to a class is coming** (FE-20, Rich: the Academic API or Canvas). F3 builds no class roster.
  The plan's honesty check stays as it is.

## Decisions this plan makes, and why

1. **One move per turn, as a structured answer.**
   - The lead's moves are a discriminated union on `kind`, built from each move's zod schema, **wrapped as
     `{ move: … }`**, so the schema's root is an object. It is sent as `response_format: json_schema` by F2's model
     client. That is the same thing as tool calling with one tool required, but it keeps `agents.md` rule 3, and it
     works on 9b's small fallback model.
   - **Why wrapped (M1, measured):** with the union at the root, OpenAI's strict mode would not take the schema, and
     LiteLLM answered every call from the 4B fallback instead, `200`, with `x-litellm-attempted-fallbacks: 1` (FE-34).
     Wrapped, `default-chat-large` answered 5 of 5, each parsing. A test holds the root to be an object.
   - *Rejected:* native tool calling (see *Decided by Rich*).
   - *Changing course* is one adapter in `runtime/run.ts`.
2. **The lead's moves are five, and every write is a commit:**
   - `read { paths }`;
   - `commit { message, changes, line, account }`;
   - `ask_cwl { brief }`;
   - `ask_person { ask, default }`;
   - `done { line }`.
   - Each `commit` is dry-run first, then committed, with `baseCommit` the tree's `commitSha` and a new
     `Idempotency-Key` each time. So the pages are saved as they are written, and *Stop* or a spent month keeps
     them.
   - The explaining agent is not a move: the round calls it when a build or a deploy fails (Decision 8).
   - *Rejected:* a working copy committed once at the end, where *Stop* would lose it.
3. **What the lead sees, rebuilt before every move** (Vercel's `prepareStep`; `agents.md` rule 5):
   - the agreed plan, `docs/plan.md`, as committed;
   - the blueprint's knowledge pack **in full** (M1: 11,513 characters for `node-ts-mongo@1`);
   - the tree's paths;
   - the files it last asked for, newest first, in what is left of the cap below. A file that does not fit is one
     line: *"too large to show beside the rest: read it alone"*;
   - the step it is in, and the tries so far;
   - what its last move did: the platform's answer, or a guard's reason;
   - any message from the person it has not yet read.
   - **Never the conversation's history, and never a token or key.** A test dumps every prompt the runtime sends
     and asserts no `mft_` and no `sk-` (Global Constraints).
   - **The cap: 48,000 characters for everything the lead is sent** (`VIEW_CAP`), instructions included, whatever
     model is listed. *(M1: `default-chat-large` answered a 108k-token prompt in 15.7 s, but the fallback's context is
     16k tokens and it cut a longer prompt without a word (FE-34). The text measured 3.7 characters a token, so
     48,000 is about 13,000 tokens, leaving the fallback room to answer. Rich: carry on with the fallback.)* The
     plan, the pack, the paths and the step come to about 20,000, so files get about 28,000: `server.js`, at 15,541,
     fits.
4. **The model: the most capable one the session lists.**
   - `default-chat-large` if `session.models` names it, else `default-chat`. The choice is recorded in the trace.
   - **Which model answered** is recorded for each answer: the header `x-litellm-attempted-fallbacks` (`0` or `1`),
     the answer's own `model`, and its usage. *(M1: on the normal path `model` reads `default-chat-large`, not
     `openai/gpt-6-luna`; a fallback's reads `ollama_chat/qwen3.5:4b`. The platform session names the header as the
     signal.)* None of these is shown to the person.
   - **When the fallback answers, we carry on and say so once** (Rich, 2026-09-28): the round's first fallback answer
     adds one line of ours to the conversation, *"Our usual model can't be reached just now, so we're carrying on with
     a smaller one. It may take a few more tries."* It is said once a round, and never again for the explaining
     agent's calls.
   - The explaining agent and the CWL specialist use the same session and the same model.
5. **The steps and their signals:**

   | Step (words.ts) | Key | Ticks on |
   |---|---|---|
   | *Writing the pages* | `pages` | the lead's `done`, once its commits have landed (`createCommit` answered `201`; `repository.committed` on the stream) |
   | *Checking it holds together* | `holds` | the last commit's own validation, **and** Decision 6's check. *(M1: a commit whose manifest.yaml is invalid is refused `422 SPEC_INVALID` before anything is written, so a landed commit's manifest is valid; its `spec.warnings` never stop anything. `spec.validated` on the stream says the same, by `commitSha`.)* |
   | *Building it* | `build` | `build.succeeded` **for the build `startBuild` answered**, matched by its id, `machineDetail.buildId` (M4: a `subject` is opaque, and on the real platform some name the slug: `project:<slug>`, `repository:<slug>`, `sp:<slug>:sandbox`). `startBuild` always names the last commit. *(M4: a build took about 18 s.)* *(M2: the mock builds `4444…` of its own commit whatever is named, so a match on the commit would never tick against it.)* |
   | *Putting it on your draft address* | `draft` | `deploy`'s `200` answering the instance `healthy`; or, if it answered earlier than that, `instance.healthy` **for that instance's id** (`machineDetail.instanceId`). *(M4: a healthy deploy answered `healthy` in 8.9 s.)* Never matched by environment *(M2: the mock's deploy answers staging's instance)* |
   | *Checking it answers* | `answers` | the sandbox instance serving and healthy (`listInstances`), and its output read (`getInstanceOutput`, **sandbox only**, FE-24) |

6. **Our own check before paying for a build** (`build/imports.ts`), after the commits:
   - every relative `import` in the app's server code names a file in the tree **exactly**. *(M6: the blueprint is
     JavaScript as ES modules, `"type": "module"`, and Node's ES modules resolve no extension and no `index`: an
     `import './routes/posts'` beside `routes/posts.js` fails at start.)* Static `import … from`, bare `import '…'`,
     `export … from`, a literal `import('…')`, and `require('…')` all count;
   - every bare one is a Node built-in (`node:` or not) or a dependency in `package.json`, by its package name
     (`@scope/name`, or the first segment);
   - `public/` is the browser's, not Node's, and is not checked.
   - It reads only the committed tree. It is cheap and deterministic, and it catches the commonest failure (FE-32's
     missing package) without a build.
7. **Three tries, per round, per kind:**
   - `build` failures, `draft` failures, and `SOURCE_CONFLICT` (someone else committed) are counted separately.
   - The third failure of a kind stops the round as *needs you*.
   - **[Try a different way]** resets that count once, and tells the lead the three failures and to take another
     approach. **[Stop here]** ends the round.
   - A guard's refusal, or a dry run's refusal, is not a try: it is the lead's next move's reason. But **the same
     refusal three times in a row** is a try.
8. **When a build or deploy fails, the explaining agent speaks first.**
   - The round gives it the platform's own words: `getBuildLog`'s tail (200 lines) and `Build.error`, with
     `build.failed`'s `reason`; or the incident's `exitReason`, `failedCheck` and `logTail` (**one string**, M1),
     `instance.failed`'s `failedCheck`. *(M4: `getInstanceOutput` on the failed instance is `409
     INSTANCE_OUTPUT_UNAVAILABLE`, *"its Incident has its last lines"*: the incident's `logTail` held the whole
     `ERR_MODULE_NOT_FOUND` stack. And a failed build's telling lines are about 50 lines from the end of its log, while
     `Build.error` and `reason` hold only npm's usage text after them (FE-32): the log's tail is what explains it.)*
   - It answers `{ note, sentence }`. The `note` is the step's note (*"A piece it depends on was missing"*); the
     `sentence` is the one line in the conversation.
   - The lead is then given the raw words **and** the explanation, and fixes it. For a draft failure it is also given
     the incident's **`prompt`**, which the platform writes for an agent to work from (M1: *"its logs, redacted, and a
     prompt an agent can work from"*), and its `diffSinceHealthy`.
   - The raw words go behind *"The exact words, for whoever you ask for help"*.
9. **Stop conditions, each tested** (Vercel's `stopWhen`; OpenAI's `maxTurns`):
   - **moves:** at most 40 moves per step. Then *needs you*: *"This is taking longer than it should."*
   - **tries:** Decision 7.
   - **the session's cap:** LiteLLM's `429 budget_exceeded`. `getAgentBudget` then says whether the month has room:
     room means the checkpoint, none means the month is spent.
   - **the session's clock:** we ask for 240 minutes, never past the token's expiry. An expired key is the same
     checkpoint, since a new session is new money. *(M1: `capUsd: 2` and `durationMinutes: 240` were both taken, and
     `expiresAt` was 240 minutes after `createdAt`.)*
   - ***Stop*:** checked before every move and after every platform call.
   - Every stop saves the run.
10. **A run's state is saved** (OpenAI's resumable run state), in three new tables. **Keys and tokens are never
    columns** (F2 Decision 1).
    - `runs`: the conversation, the round, the step, the tries, the status, the agent sessions' ids (never their
      keys), the model, and the last move.
    - `trace`: every model call (agent, model named, usage), every move (its kind and its guard's verdict), and
      every platform call (operation, code). **Never a prompt's text, and never a file's content.**
    - `questions`: each question asked, its default, and its answer. **A secret's answer is never stored:** it goes
      straight to `setAppSecret` in the sandbox (the token's `secret:write`; Task 4's `secrets.ts`) and is dropped.
      The platform refuses a value under 6 characters (M1), so the question's field says so before it is sent.
11. **The round starts by itself, on our server.**
    - When the plan's commit lands (F2's `agreeing` done), our server starts round 1 at once: the plan screen
      already said *"Say yes and this happens: we build it on your draft address, and you watch."*
    - A page closed right after *Yes* still gets its build.
    - *Rejected:* the page pressing a hidden start, which would lose the build of a page closed in that second.
12. **The conversation's states gain `building` and `built`.** `paused` means a question the work cannot pass.
    - `failed` stays unused: F3 sets it nowhere. Every screen's fallback for a state it does not draw now shows its
      words **with a reference** (`useReported`). That meets F2's deferred Minor.
    - The `conversations` table's `check` is rebuilt by a migration (`pragma user_version` 0 → 2), because SQLite
      cannot alter a `check`. *(Read in sitting 1: F2 never set `user_version`, so every existing file is at 0; F2's
      schema counts as version 1.)*
13. **Staff inside the app** (Rich's B), which the CWL specialist builds:
    - `config/staff.json` holds `{ puids: [<the instructor's>], emails: [<named by the instructor>] }`.
    - **What it builds on** (M6): a signed-in request's `req.user.user` is the blueprint's `bridge(profile)`, by
      friendly name, so the check is `puids.includes(req.user?.user?.ubcEduCwlPuid)` or
      `emails.includes(req.user?.user?.mail?.toLowerCase())`. It is an Express middleware after `passport.session()`,
      in front of the instructor's routes and never `/healthz`. `manifest.yaml`'s `auth.attributes` must hold
      `ubcEduCwlPuid` and `mail` (both pre-authorized by UBC IAM; the proof-app starter has both).
    - The instructor's PUID comes from `listMembers` with the conversation's token: the member whose `userId` is the
      conversation's person. It never comes from the session (FE-2).
    - **A named email must appear in the person's own words**: their description, a message, or an answer. A guard
      refuses an email the lead or the specialist invented, which is where injected text would put one.
    - Adding someone later is a change: F4's moment 8.
14. **The cost line:**
    - The month is `getAgentBudget` (`remainingUsd`, `resetsAt`; either can be `null`, with `unavailable` saying
      why). This conversation's figure is the sum of `spentUsd` over its sessions (`listAgentSessions`, whose answer is
      `{ sessions, truncated }`, by the ids in `runs`).
    - Spend lands a few seconds after a call, so it is re-read after each model call, at most every 5 seconds.
    - An unknown `spentUsd` (null) shows the month's figure alone.
15. **The project's event stream is our server's, one per conversation while a round runs** (Task 5):
    - opened with the contract's own `subscribe()` and the conversation's token (M1: it runs in Node by design, sends
      `Authorization: Bearer` and **no `Origin`**, and rejects `ready` when the socket closes first). Reconnecting is
      ours: `subscribe()` does none;
    - replayed events are ignored by `id`; log frames are never replayed (M1), and the round never needs them;
    - a reconnect re-reads the build and the instance (FE-7: the replay is only 50);
    - **a refused stream pauses the round for a token.** *(M1 corrects this plan's `4403`: a token's refused upgrade
      closes `1006`, which a WebSocket shows with no status, and the contract's rule is to `GET` the same URL with the
      same credential to learn it: `401 UNAUTHENTICATED` is refused, `426 EVENTS_UPGRADE_REQUIRED` means the token is
      good and the drop was the network. `4403` is a session from another origin, never a token's.)* *(M3,
      measured: a revoked token's upgrade closes `1006` in 33 ms and its `GET` answers `401`; another project's id
      closes `1006` and its `GET` answers `404`. `4404` was never sent. **A token revoked while its stream is open
      keeps the stream, and goes on receiving events** (FE-33), so the round learns of a revocation from its next
      call's `401`, never from the stream.)*
    - it closes when the round ends.
16. **After the round: `built`.** The round folds into the conversation as one line. The message box says
    *"Asking for a change arrives next."* A change is F4's moment 8, as F2 said of building.
17. **Deploy has its own deadline:** `DEPLOY_TIMEOUT_MS = 120_000`. `deploy` is synchronous for up to about 90 seconds;
    every other call keeps F1's 15 seconds. *(M4, measured: a healthy deploy answered in 8.9 s; one that could not
    start answered `200 failed` after 91 s and 87 readiness attempts. 120 s stands.)*

## Global Constraints

- Everything in F1's and F2's *Global Constraints*.
- **A token or key never reaches a model.** A test captures every prompt the runtime sends in a full scripted round
  and asserts no `mft_` and no `sk-` (Task 2, and again in Task 8).
- **Nothing is persisted that is a credential.** F2's test that dumps every table covers `runs`, `trace` and
  `questions`, including after a secret is answered (Task 8).
- **The lead never touches staging or production.** A test asserts every `deploy` and every `getInstanceOutput` names
  the sandbox (Tasks 4 and 8).
- **No dependency is added to the app** (FE-32). A guard refuses a change to `package.json`'s dependencies, and a
  request that needs one is said plainly (Task 6).
- **A step ticks only on its own signal** (Decision 5). A test holds each step at `now` until its signal arrives
  (Task 8).
- **Never *"It works"*.** A test holds that the words, and the lead's lines, never say it (Tasks 6 and 11).
- **No infrastructure words on screen** (C3). F1's machinery test covers the building screen, and a guard covers the
  lead's `line` and `account` (Tasks 6 and 11). The disclosure *"The exact words, for whoever you ask for help"* is
  machine text on purpose, and closed by default.
- **Every problem shown carries a support reference** (F2 Decision 11).

## Review Focus

1. **The lead proposes something harmful:** a path outside the app, a `Dockerfile` or `.npmrc`, a new dependency, a
   secret in code, a staff email nobody gave. The move is refused with its reason, and the lead tries again. Nothing
   reaches `createCommit`. **Pinned in Task 6.**
2. **A lead that loops cheaply:** it re-reads the same files, or commits nothing, and spends little. It stops at 40
   moves as *needs you*, never runs forever, and never starts a session by itself. **Pinned in Tasks 2 and 8.**
3. **Our server restarts in the middle of a build that carries on at the platform.**
   - The run is `interrupted`; the page offers *Carry on* and hands a token over again.
   - The round re-reads the build it had started (`getBuild`), and never builds the same commit twice.
   - **Pinned in Task 8.**
4. **Two things at once:** a message and an answer arrive mid-move, or two windows press *Stop* and *Carry on*.
   - One piece of work per conversation (`work.ts`). A message is read at the next move.
   - *Stop* wins over anything in flight: it is checked after every platform call.
   - **Pinned in Tasks 8 and 9.**
5. **The stream misses the event that matters:** it drops during a build, or the replay's 50 events skip it. The
   reconnect re-reads the build and the instance, and the step ticks from what it reads. **Pinned in Task 5.**

---

## File Structure

```
packages/server/src/
  runtime/agent.ts  runtime/tool.ts  runtime/run.ts  runtime/trace.ts  runtime/runtime.test.ts   Task 2: ours, knows nothing of Manifest
  model/client.ts   (+ onAnswer: the answer's model and usage)                                   Task 3
  platform/source.ts     tree, file, commit (dry run, then commit)       — authoring.ts's commitPlan moves onto it
  platform/builds.ts     startBuild, getBuild, getBuildLog
  platform/releases.ts   createRelease, the sandbox environment, deploy (120 s)
  platform/instances.ts  listInstances, getInstanceOutput, listIncidents
  platform/members.ts    the instructor's PUID
  platform/secrets.ts    a secret's value, sandbox only (setAppSecret)
  platform/agent-sessions.ts  (+ capUsd, durationMinutes, list)
  platform/stream.ts     the project's event stream (Task 5)
  platform/platform.test.ts   recording fake control plane: what we SENT
  build/guards.ts  build/imports.ts  build/guards.test.ts                                         Task 6
  agents/lead.ts  agents/cwl.ts  agents/explaining.ts  agents/building.test.ts                   Task 7
  build/moves.ts   the lead's five moves, as runtime tools                                        Task 7
  build/round.ts   build/round.test.ts   the round: steps, signals, tries, stops                  Task 8
  api/build.ts     api/build.test.ts   /build, /messages, /answers, /stop                          Task 9
  api/progress.ts  (+ BuildStep, RoundView, Needs; states building, built)
  store/schema.sql store/migrate.ts store/runs.ts   runs, trace, questions; user_version 2
packages/ui/src/   LiveSteps.tsx (+ line, detail)  InverseSurface.tsx LogPane.tsx (ported)  Disclosure.tsx   Task 10
packages/web/src/
  ours/api.ts  ours/conversation.ts   + the building calls and frames
  screens/building/building.tsx  building/work.tsx  building/thread.tsx  building/needs.tsx   Task 11
  screens/describe/describe.tsx   routes building, paused, built to BuildingScreen; every fallback with a reference
  words.ts
scripts/check-building.sh          Task 12, mock mode
```

---

## Task 1: Measure what this plan rests on (sitting 1, alone)

Throwaway code in the scratchpad. Only this plan's findings are committed. **Run nothing in manifest**: read it.

- [x] **M1: the contract, and the capable model's structured answers.**
  - Re-read `openapi.json`. Record the commit, the version and the operation count.
  - Record the exact paths and bodies of: `getTree`, `getFile`, `createCommit`, `startBuild`, `getBuild`,
    `getBuildLog`, `createRelease`, `listEnvironments`, `deploy`, `listInstances`, `getInstanceOutput`,
    `listIncidents`, `listMembers`, `listAgentSessions`, `startAgentSession` (`capUsd`, `durationMinutes`).
  - **With the control plane up** (after 9b's CLOSED), start one agent session on a test project. Ask
    `default-chat-large` for the lead's move union (Task 6's schema) with `json_schema` strict, five times, on the
    walk-through's plan. Record: how many parse; time per answer; the answer's `model` and `usage` fields; the
    largest prompt that answers (it sets Decision 3's ceiling); `spentUsd` afterwards.
  - **Every adapter is written against what M1 records.** Where this plan's names differ, the contract wins, and
    this plan is corrected in the same commit.
- [x] **M2: the mock's answers**, measured with `pnpm mock`, to:
  - every operation in M1's list;
  - the event stream's scripted frames: does it send `build.*` and `instance.*`?

  Record the bodies. The mock answers the document's examples (FE-27), so Task 12's mock half asserts what we sent,
  and failures are proven by fakes.
- [x] **M3: the platform's event stream from a server** (after 9b's CLOSED).
  - Can the contract's `subscribe()` run in Node with a Bearer token, against `http://127.0.0.1:7100`?
  - Record the frames on connect (the replay), then `manifest.stream.ready`.
  - Record the close code when the token is revoked.
  - If `subscribe()` cannot run on a server, use Node 24's `WebSocket` with a `headers` option, as F2's proxy test
    does.
- [x] **M4: one round by hand on the real platform** (after 9b's CLOSED; the test user, at Rich's word).
  - On a project made from the fixture blueprint's skeleton, run `startBuild` on `main`'s commit and time it.
  - Then `createRelease`, then `deploy` to the sandbox. Time it, and record the `Instance`.
  - Then `listInstances` and `getInstanceOutput`.
  - Then commit a deliberate break (`import './missing.js'`), build, deploy, and record `build.failed`'s
    `machineDetail` and `getBuildLog`'s tail, or the incident.
  - **These times set the words' *"A few minutes"*** and Decision 17's deadline.
- [x] **M5: the two frameworks' current documentation** (OpenAI's Agents SDK for JavaScript; Vercel's AI SDK).
  - Record, for each idea *Decided by Rich* takes, the name and meaning it has there: `Agent`, `tool`, agents as
    tools, `RunContext`, `maxTurns` / `stopWhen`, `prepareStep`, guardrails and their tripwire, interruptions and
    `RunState`, tracing spans.
  - Name ours to match where it reads well. Record anything that changes Task 2's interfaces.
  - **No dependency.**
- [x] **M6: what the CWL specialist builds on.** Read the blueprint's skeleton and the proof-app starter
  (`blueprints/node-ts-mongo/`):
  - `auth/ubcshib.js` and `auth/attributes.js`: what `bridge(profile)` and `puid(profile)` give, and the attribute
    name of the email (`mail`);
  - the language: JavaScript or TypeScript;
  - where a staff check would sit in the routes;
  - `manifest.yaml`'s `auth` block;
  - whether the reference bundle has an `InverseSurface` and a disclosure component (Task 10).
- [x] **Close:** the dated entry. **Correct Tasks 2–12 to what M1–M6 found before sitting 2.** Commit the plan file
  only.

---

## Task 2: The runtime: agents, moves, the runner, the trace

**Files:** `server/src/runtime/{agent.ts,tool.ts,run.ts,trace.ts,runtime.test.ts}`,
`server/src/store/{schema.sql,migrate.ts,runs.ts}` (the `runs` and `trace` tables only; `questions` is Task 8's).

**M5, the names these ideas have there** (OpenAI's Agents SDK for JavaScript v0.18.0; Vercel's AI SDK `ai@7.0.120`;
both read 2026-09-28). **Nothing changes these interfaces' shape**, and ours keep the plan's names:

| Ours | OpenAI Agents SDK | Vercel AI SDK |
|---|---|---|
| `defineAgent` (`instructions`, `answer`) | `Agent` (`instructions`, a string or a function of the run context; `outputType`) | `ToolLoopAgent` (`instructions`) |
| `defineTool` (`input`, `run`) | `tool({ parameters, execute })` | `tool({ inputSchema, execute })` |
| `askAgent` | `agent.asTool()` | a subagent: a tool whose `execute` calls it, `toModelOutput` shaping what the parent sees |
| `context` | `RunContext<T>.context`: *"not sent to the LLM"* | `runtimeContext`: *"not added to the model prompt"* |
| `view`, rebuilt every move | `callModelInputFilter` | `prepareStep` |
| `maxMoves: 40` | `maxTurns` (default 10), `MaxTurnsExceededError` | `stopWhen: isStepCount(n)` (was `stepCountIs`; default 20) |
| `guard` → a reason, the move skipped, the run goes on | a tool input guardrail's `rejectContent` (its `throwException` is a tripwire: we need none) | none built in |
| `Stop` `paused` + a saved `RunState` | `needsApproval` → `interruptions`; `RunState` `toString()` / `fromString()` | `needsApproval` → `tool-approval-request` |
| a message read at the next move | `RunState.addInput()` | — |
| `trace`, no text | spans with `traceIncludeSensitiveData: false` | telemetry with `recordInputs` / `recordOutputs: false` |

OpenAI's guide adds one rule this plan already keeps: *"avoid putting secrets in `runContext.context` if you intend to
persist … serialized state"*. Our context holds the token and is never saved.

**Interfaces:**

```ts
// runtime/agent.ts — an agent is data (OpenAI's Agent)
import type { z } from 'zod/v4'
import type { Check, Message, Model } from '../model/client.js'
export interface AgentDef<In, Out> {
  name: string                                   // the json_schema name, and the trace's agent
  instructions: string                           // how to behave; never what the platform allows (agents.md rule 4)
  brief: (input: In) => Message[]                // rebuilt before every call (Vercel's prepareStep)
  answer: z.ZodType<Out>
  check?: (input: In) => Check<Out>               // built from the call's input, as F2's `checkedAgainst(taken)` is (read in sitting 1): the CWL specialist's check needs its brief's emails
}
export function defineAgent<In, Out>(def: AgentDef<In, Out>): AgentDef<In, Out>
/** One structured answer: how the lead calls a helper (agents as tools), and how a round calls the explaining agent. */
export function askAgent<In, Out>(agent: AgentDef<In, Out>, model: Model, input: In): Promise<Out>

// runtime/tool.ts — a move is a tool with a schema (both frameworks)
export interface MoveResult {
  report: string                                 // what the lead is told on its next move
  stop?: Stop                                    // a move may end the run: done, or a question it cannot pass
}
export interface ToolDef<Ctx, In> {
  kind: string                                   // the move's discriminant
  describe: string                               // one line in the lead's instructions
  input: z.ZodObject<z.ZodRawShape>              // the move's fields, without `kind`
  guard?: (input: In, context: Ctx) => string | null   // a guardrail: a reason to send it back, or null
  run: (input: In, context: Ctx) => Promise<MoveResult>
}
export function defineTool<Ctx, In>(def: ToolDef<Ctx, In>): ToolDef<Ctx, In>
/** What the model answers: z.object({ move: z.discriminatedUnion('kind', tools.map(t => t.input.extend({ kind: z.literal(t.kind) }))) }).
 *  WRAPPED, so the JSON Schema's root is an object (Decision 1, M1: a root `anyOf` sends every call to the fallback).
 *  The runner unwraps `move`. */
export function movesOf(tools: ToolDef<never, never>[]): z.ZodType<{ move: { kind: string } & Record<string, unknown> }>

// runtime/run.ts — the runner (OpenAI's Runner; Vercel's multi-step loop)
export type Stop =
  | { kind: 'done'; line: string }
  | { kind: 'paused'; questionId: string }       // a question it cannot pass (OpenAI's interruption)
  | { kind: 'limit'; limit: 'moves' }            // Decision 9
  | { kind: 'stopped' }                          // the person's Stop
  | { kind: 'refused'; error: Error }            // ModelError or PlatformRefusal the run cannot answer itself
export interface RunState {                      // saved in `runs` (Decision 10)
  runId: string
  step: string
  moves: number                                  // in this step
  last: { kind: string; report: string } | null
  sameRefusal: { reason: string; count: number } | null   // Decision 7: the same refusal three times is a try
}
export interface RunOptions<Ctx, In> {
  agent: AgentDef<In, { kind: string } & Record<string, unknown>>
  tools: ToolDef<Ctx, never>[]
  context: Ctx                                   // the token, the platform, the store: NEVER in a prompt (RunContext)
  view: (state: RunState) => In                  // what the lead sees this move (Decision 3)
  state: RunState
  model: Model
  maxMoves: number                               // 40 (Decision 9)
  stopped: () => boolean                         // the person's Stop
  save: (state: RunState) => void                // after every move
  trace: Trace
}
export function run<Ctx, In>(options: RunOptions<Ctx, In>): Promise<Stop>

// runtime/trace.ts — what happened, never what was said (Decision 10)
export type TraceEntry =
  | { kind: 'model'; agent: string; asked: string; answered: string | null; usage: { in: number; out: number } | null }
  | { kind: 'move'; move: string; verdict: 'ran' | 'guarded'; reason?: string }
  | { kind: 'platform'; operation: string; code: string | null; named: string | null }   // the commit, build, release or environment kind it named
export interface Trace { record(runId: string, entry: TraceEntry): void; list(runId: string): (TraceEntry & { at: string })[] }
/** Over two new `Store` methods, `recordTrace` and `listTrace` (read in sitting 1: `openStore` owns the one
 *  DatabaseSync and `Store` exposes only methods; `runs.ts` holds the rows' types and SQL, called from `db.ts`). */
export function storeTrace(store: Store): Trace
```

- [ ] **Step 1: The tests, failing first** (`runtime.test.ts`, a scripted model, fake tools that count what they
  did):
  - **one move per turn:** a script `[read, commit, done]` runs the three tools in order and answers `done`, with
    its line;
  - **the schema's root is an object:** `z.toJSONSchema(movesOf(tools))` has `type: 'object'` and no root `anyOf`
    (Decision 1, M1);
  - **the view is rebuilt every move:** the second prompt carries the first move's `report`, and the first
    prompt's `report` is absent from the third;
  - **a guard sends a move back:** a guarded `commit` never runs, and the next prompt carries the guard's reason.
    The trace says `guarded`;
  - **the same refusal three times** sets `sameRefusal.count` to 3, and the runner answers
    `{ kind: 'limit', limit: 'moves' }` only at `maxMoves`, never before (Review Focus 2). The round turns
    `sameRefusal` into a try (Task 8);
  - **maxMoves:** a script that only ever reads stops at exactly 40, as `limit`;
  - ***Stop*:** `stopped()` turning true between moves ends the run as `stopped`, and the in-flight tool's result is
    still saved;
  - **a refusal the run cannot answer** (`ModelError('MODEL_BUDGET_EXHAUSTED')` from the model) ends it as
    `refused`, with that error;
  - **a paused move** (`ask_person` whose tool answers `stop: paused`) ends the run with the question's id;
  - **saved after every move:** `save` is called once per move with the new state, and a run started again from a
    saved state carries on at its step and move count;
  - **the context never reaches a prompt:** with a context holding `mft_test_x` and `sk-test-y`, every message the
    scripted model received is dumped and matches neither (Global Constraints);
  - **the trace holds no text:** after a run whose files hold `SECRET-CONTENT`, no trace row contains it;
  - **a platform entry says what it named** (a commit's sha, a build's id, `sandbox`), and never a token.
- [ ] **Step 2: Run them, and watch each fail for its reason.**
  `pnpm --filter @manifest-app/server exec vitest run src/runtime`
- [ ] **Step 3: Implement** `agent.ts`, `tool.ts`, `run.ts` and `trace.ts`, plus the `runs` and `trace` tables in
  `schema.sql`. The migration (`store/migrate.ts`: `pragma user_version`; version 2 rebuilds `conversations` with the
  new `check`, Decision 12) goes in here, with its own test in `store/db.test.ts`: **an F2 file (version 0, the
  old `check`) with a conversation, its messages and its plan opens as version 2, with all three intact, and a
  conversation can then be set to `building`.** The rebuild is SQLite's own twelve steps: `pragma foreign_keys =
  off` outside the transaction (`messages` and `plans` reference `conversations`), create the new table, copy, drop,
  rename, recreate its index, `pragma foreign_key_check`, then `foreign_keys` on again. `schema.sql`'s own
  `create table if not exists conversations` carries the new `check`, so a new file needs no rebuild.
- [ ] **Step 4: Run them green; then the negative controls:**
  - the guard not consulted → the guard test is red;
  - the view not rebuilt → the view test is red;
  - `maxMoves` ignored → the loop test times out red;
  - the context spread into the brief → the no-credential test is red.
  Restore each.
- [ ] **Step 5: Commit**, by name: `feat(server): our agent runtime — one structured move a turn, guards, stop
  conditions, a saved run, a trace with no text`.

## Task 3: The model client says which model answered

**Files:** `server/src/model/client.ts`, `server/src/model/client.test.ts`.

**Interfaces:**

```ts
/** M1: `model` is LiteLLM's (`default-chat-large` on the normal path, the fallback's own name otherwise);
 *  `fallback` is the header `x-litellm-attempted-fallbacks` above 0; usage is `prompt_tokens` / `completion_tokens`. */
export interface Answered { model: string | null; fallback: boolean; usage: { in: number; out: number } | null }
export function openAiCompatible(options: {
  baseUrl: string; key: string; model: string; fetch?: typeof fetch; timeoutMs?: number
  /** Each 2xx answer's own `model`, whether a fallback answered, and `usage`, for the trace and Decision 4's one line. */
  onAnswer?: (answered: Answered) => void
}): Model
/** Decision 4: the most capable model the session lists. */
export function modelFor(listed: string[]): string | undefined   // 'default-chat-large' ?? 'default-chat' ?? undefined
```

- [ ] **Step 1: Tests, failing first:**
  - `onAnswer` receives `{ model: 'default-chat-large', fallback: false, usage: { in: 9644, out: 313 } }` from a fake
    gateway's answer whose `model` and `usage` (`prompt_tokens`, `completion_tokens`) say so and whose header
    `x-litellm-attempted-fallbacks` is `0` (M1's recorded shape);
  - **a fallback's answer:** header `x-litellm-attempted-fallbacks: 1` and `model: 'ollama_chat/qwen3.5:4b'` →
    `{ fallback: true, model: 'ollama_chat/qwen3.5:4b' }`; no header at all is `fallback: false`;
  - a missing `usage` is `null`, never zero;
  - `onAnswer` is not called for a refusal;
  - `modelFor(['default-chat', 'default-chat-large'])` is `default-chat-large`, `modelFor(['default-chat'])` is
    `default-chat`, and `modelFor([])` is `undefined`, which the round says as `MODEL_NOT_AVAILABLE`.
- [ ] **Step 2: Run, red. Step 3: Implement. Step 4: Green, and F2's model tests unchanged.**
- [ ] **Step 5: Commit** `feat(server): the model client records which model answered, and its usage; the most
  capable model a session lists`.

## Task 4: The platform calls F3 needs

**Files:** `server/src/platform/{source.ts,builds.ts,releases.ts,instances.ts,secrets.ts,members.ts,agent-sessions.ts,refusal.ts,authoring.ts}`,
`server/src/platform/platform.test.ts`.

**Interfaces** (paths and field names corrected to M1's record before this task starts):

```ts
// refusal.ts
export const DEPLOY_TIMEOUT_MS = 120_000                      // Decision 17
/** A commit refused with facts the LEAD may read (never the person): SPEC_INVALID's details, a secret's path and line. */
export class CommitRefused extends PlatformRefusal {
  constructor(code: string, status: number | null, readonly details: { path: string; code: string; hint: string | null }[])
}

// source.ts — getTree, getFile, createCommit (M1: GET /v1/projects/{p}/tree?ref, GET …/file?path&ref, POST …/commits)
export interface Source {
  /** getTree's `entries` whose `type` is `file`; `size` and `binary` are null for anything else, so never here. */
  tree(token: string, projectId: string): Promise<{ commitSha: string; paths: { path: string; size: number; binary: boolean }[]; truncated: boolean }>
  /** SOURCE_FILE_TOO_LARGE (> 1 MiB), SOURCE_FILE_NOT_TEXT, SOURCE_PATH_NOT_A_FILE and SOURCE_PATH_NOT_FOUND are the lead's reasons, not a crash. */
  file(token: string, projectId: string, path: string, ref: string): Promise<{ content: string } | { unreadable: 'too-large' | 'not-text' | 'not-a-file' | 'not-found' }>
  /** The dry run, then the commit: each its own Idempotency-Key. SOURCE_CONFLICT is thrown for the round to count. */
  commit(token: string, projectId: string, body: { baseCommit: string; message: string; changes: Change[] }):
    Promise<{ commitSha: string; changed: { path: string; status: 'added' | 'modified' | 'deleted' }[]; warnings: { code: string; path: string; hint: string | null }[] }>   // spec.warnings (M1)
}
export type Change = { op: 'write'; path: string; content: string } | { op: 'delete'; path: string }   // ≤ 500 a commit, ≤ 1 MiB a file (M1)

// builds.ts — startBuild (202), getBuild, getBuildLog (?tail ≤ 10000; lines { seq, stream, text, at })
export type Build = { id: string; commitSha: string; status: 'pending' | 'running' | 'succeeded' | 'failed'; error: string | null }   // M1: `pending` too
export interface Builds {
  start(token: string, projectId: string, commitSha: string): Promise<Build>     // always names the commit (with none, the platform builds the last RECORDED validation's)
  get(token: string, buildId: string): Promise<Build>
  log(token: string, buildId: string, tail: number): Promise<string[]>           // getBuildLog's lines, as text
}

// releases.ts — createRelease (201), listEnvironments, deploy (POST /v1/environments/{e}/deploy { releaseId } → 200 Instance)
export interface Releases {
  create(token: string, projectId: string, buildId: string, summary: string): Promise<{ id: string }>   // summary ≤ 500
  sandbox(token: string, projectId: string): Promise<{ environmentId: string; hostname: string; url: string }>   // listEnvironments' `kind: 'sandbox'`
  deploy(token: string, environmentId: string, releaseId: string): Promise<Instance>   // DEPLOY_TIMEOUT_MS; a failed deploy is a 200
}
export type Instance = { id: string; releaseId: string; state: 'pending' | 'building' | 'provisioning' | 'starting' | 'healthy' | 'failed' | 'hibernated' | 'waking' | 'destroying' | 'gone' }   // M1: ten states

// instances.ts — listInstances ({ instances, truncated }), getInstanceOutput (?lines ≤ 1000), listIncidents ({ incidents })
export interface Instances {
  list(token: string, environmentId: string): Promise<(Instance & { serving: boolean })[]>
  /** INSTANCE_OUTPUT_UNAVAILABLE is `unavailable`; INSTANCE_OUTPUT_PRODUCTION can never be asked (the sandbox check). */
  output(token: string, instanceId: string, lines: number): Promise<{ lines: string[]; failure: string | null } | { unavailable: true }>
  /** M1: every field a string, never null; `logTail` one string; `prompt` is written for an agent (Decision 8). */
  incidents(token: string, environmentId: string): Promise<{ instanceId: string; releaseId: string; exitReason: string; logTail: string; failedCheck: string; diffSinceHealthy: string; prompt: string }[]>
}

// secrets.ts — setAppSecret (PUT /v1/environments/{e}/secrets/{NAME} { value }), for Task 8's secret answer. Sandbox only.
/** M1: a NAME is /^[A-Z][A-Z0-9_]{0,127}$/, a value 6 characters to 16 KiB (shorter is 400 REQUEST_INVALID); it takes effect at the next deploy. */
export interface Secrets { setInSandbox(token: string, projectId: string, name: string, value: string): Promise<void> }

// members.ts — listMembers (an array of { userId, puid, cwlLogin, displayName, email, role })
export interface Members { instructor(token: string, projectId: string, personId: string): Promise<{ puid: string; email: string } | undefined> }

// agent-sessions.ts (extended) — startAgentSession { name ≤ 64, capUsd?, durationMinutes? ≤ 480 } → { session, key, baseUrl }
start(token, projectId, name, options: { capUsd: number; durationMinutes: number }): Promise<{ sessionId; key; baseUrl; models; expiresAt; capUsd: number }>   // sends capUsd 2 (Rich's $2) and 240
list(token: string, projectId: string): Promise<{ id: string; spentUsd: number | null }[]>   // listAgentSessions' `sessions`
```

- [ ] **Step 1: Tests, failing first** (`platform.test.ts`: F2's recording fake control plane, answering each
  operation with M1's recorded shapes. **Assert what was sent**, never only what came back):
  - `commit` sends the dry run first, then the commit: two different `Idempotency-Key`s, the same body but
    `dryRun`, and `baseCommit` as given;
  - `SPEC_INVALID` with `details` becomes `CommitRefused` carrying `path`, `code` and `hint`, **and no `message`**;
  - `SOURCE_CONFLICT` is thrown as a `PlatformRefusal` with that code, and no second commit is sent;
  - `start` names the commit it was given;
  - `deploy` waits up to `DEPLOY_TIMEOUT_MS`: a fake that answers after 20 s is answered, while every other call
    still gives up at 15 s;
  - a `deploy` answered `200` with `state: 'failed'` is returned as failed, never thrown;
  - **`deploy` and `output` refuse to name any environment but the one `sandbox()` answered** (Global Constraints):
    a staging id is refused before any request is sent. `output` takes only an instance `list()` answered for the
    sandbox. **The check is on what we send, never on the answer** (M2: the mock's `deploy` and `getInstanceOutput`
    answer staging's instance whatever is named);
  - `setInSandbox` names the sandbox's environment and the name as given, and a value under 6 characters is refused
    before any request is sent;
  - `file` turns each of the four `SOURCE_*` refusals into its `unreadable` reason; `tree` keeps only `type: 'file'`;
  - `instructor` answers the member whose `userId` is the person, with their `puid` and `email`; another member
    never;
  - `start` sends `capUsd: 2` and `durationMinutes: 240`, and `list` reads `sessions[].spentUsd`, keeping `null` as
    `null`;
  - **F2's FE-2 test extended:** no call in this file carries a `Cookie`.
- [ ] **Step 2: Red. Step 3: Implement.**
  - `authoring.ts`'s `commitPlan` becomes one call to `source.commit` with one change. Its tests stay green:
    **a targeted improvement, not a rewrite.**
- [ ] **Step 4: Green; the negative controls:** the dry run skipped; `deploy` on F1's 15 s; the sandbox check
  removed. Each red, then restored.
- [ ] **Step 5: Commit** `feat(server): the platform calls for building — source, builds, releases (deploy at 120
  s, sandbox only), instances, members, sessions with their clock`.

## Task 5: The project's event stream, on our server

**Files:** `server/src/platform/stream.ts`, `server/src/platform/stream.test.ts`.

**Interfaces:**

```ts
export type ProjectEvent = { id: string; type: string; subject: string; detail: unknown }
export interface Watch { ready: Promise<void>; close(): void }
export interface ProjectStream {
  watch(token: string, projectId: string, handlers: {
    event: (event: ProjectEvent) => void          // each event once, whatever the replays
    reconnected: () => void                        // the round re-reads the build and the instance (Decision 15)
    refused: () => void                            // a 1006 whose GET answers 401 or 404 (M3): the round pauses for a token
  }): Watch
}
/** M1/M3: the contract's own subscribe(), wrapped with reconnect and dedupe; `subscribe` is injected for the tests. */
export function platformStream(origin: string, open?: typeof subscribe, probe?: (url: string, token: string) => Promise<number>): ProjectStream
```

- [ ] **Step 1: Tests, failing first**, with a fake WebSocket server (`node:http` plus the upgrade, as F2's proxy
  test does):
  - **each event once:** a replay of 50 events that overlaps what was seen delivers only the new ones;
  - **a drop reconnects:** close codes `1001`, `1011` and `1013` reconnect after a growing wait (200 ms, 400 ms,
    800 ms…, capped), and call `reconnected` each time;
  - **a refused token stops** (M1: a token's refused upgrade is a `1006`, and a `GET` of the same URL with the same
    token says why): `1006` then `GET` `401` → no reconnect, and `refused` is called once; `1006` then `GET` `426`
    (the token is good) → a reconnect; `1006` then `GET` `404` (M3: another project's id; `4404` is never sent) →
    `refused`;
  - **`close()`** stops everything, and no timer is left (Vitest's fake timers show none);
  - **the Bearer token is sent, and no `Origin`** (the platform's rule for a server; `subscribe()` does it, and the
    test holds it);
  - **Review Focus 5:** a build whose `build.succeeded` fell outside the replay. `reconnected` fires, and Task 8's
    round test drives the re-read.
- [ ] **Step 2: Red. Step 3: Implement** with the contract's `subscribe()` (M1, M3).
  **Step 4: Green; controls:** dedupe off; no reconnect on `1011`; a reconnect after `GET` `401`. Each red, then
  restored.
- [ ] **Step 5: Commit** `feat(server): the project's event stream on our server — each event once, reconnected on
  a drop, refused when the token is`.

## Task 6: The guards

**Files:** `server/src/build/{guards.ts,imports.ts,guards.test.ts}`.

**Interfaces:**

```ts
export interface Guards {
  /** A reason to send the commit back, or null. Run before any request (Review Focus 1). */
  commit(changes: Change[], tree: { paths: string[] }, packageJson: unknown): string | null
  words(text: string): string | null           // line and account: plain words (C3), never "it works"
  staff(emails: string[], theirWords: string[]): string | null   // Decision 13: only emails the person wrote
}
export function guards(): Guards
/** Decision 6: every relative import resolves in the tree; every bare one is a built-in or a dependency. */
export function importsHold(files: { path: string; content: string }[], paths: string[], packageJson: unknown): { path: string; missing: string }[]
```

- [ ] **Step 1: Tests, failing first** (**Review Focus 1**, each its own case):
  - a path with `..`, a leading `/`, a backslash, or inside `.git` → refused;
  - `Dockerfile`, `.npmrc`, or a `runtime.build` block written into `manifest.yaml` → refused, naming the knowledge
    pack's rule. *(M1: the platform itself accepts a `Dockerfile` or `.npmrc` and replaces it at build, so this is
    our guard's alone; a `runtime.build` block it refuses as `SPEC_BUILD_BLOCK_FORBIDDEN`.)*
  - **`package.json` whose `dependencies` or `devDependencies` gain or change a package** → refused (FE-32). Its
    reason tells the lead to say plainly what cannot be added. Changing its `scripts` is allowed;
  - text matching the platform's secret shapes (`mft_…`, `sk-…`, a PEM block) → refused before the platform's own
    scan sees it;
  - `words`: *"Writing the page students post on."* passes; *"Deploying the container"*, *"Running npm ci"* and
    *"It works"* are refused, using F1's machinery list plus *it works*;
  - `staff`: an email in the person's description passes; one nobody wrote is refused;
  - `importsHold` (M6: ES modules): `import { list } from './routes/posts.js'` with `routes/posts.js` in the tree
    holds; **`import './routes/posts'` beside it is `{ path, missing: './routes/posts' }`** (no extension is
    resolved); `import { marked } from 'marked'` absent from `package.json` is `{ path, missing: 'marked' }`;
    `node:crypto`, `fs` and `passport-ubcshib/lib/x.js` (a dependency's subpath) hold; `public/app.js` is not
    read;
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** each guard removed in turn → its case red, then
  restored.
- [ ] **Step 5: Commit** `feat(server): the lead's guards — the app's files only, no Dockerfile, no new dependency,
  no secret, plain words, only staff the person named; imports that hold`.

## Task 7: The three agents, and the lead's moves

**Files:** `server/src/agents/{lead.ts,cwl.ts,explaining.ts,building.test.ts}`, `server/src/build/moves.ts`,
`server/src/api/progress.ts` (`BuildStep`), `server/src/model/walkthrough.ts` (mock mode's answers for the three, F2
Decision 7's way: the mock has no model, M2, and its session lists no `default-chat-large`).

**Interfaces:**

```ts
// api/progress.ts gains the round's step keys here (Task 8 adds the rest of the round's frames)
export type BuildStep = 'pages' | 'holds' | 'build' | 'draft' | 'answers'

// agents/lead.ts
export interface LeadView {                        // Decision 3: everything the lead sees this move
  plan: string; pack: string; paths: string[]; files: { path: string; content: string }[]
  step: BuildStep; tries: Record<'build' | 'draft' | 'conflict', number>
  last: { kind: string; report: string } | null
  messages: string[]                               // unread words of the person's, verbatim
  failures: string[]                               // on Try a different way: the three that failed
}
export const lead: AgentDef<LeadView, LeadMove>
export type LeadMove =
  | { kind: 'read'; paths: string[] }                                         // ≤ 20 paths
  | { kind: 'commit'; message: string; changes: Change[]; line: string; account: string }
  | { kind: 'ask_cwl'; brief: { whoGetsIn: string; youSee: string; studentsSee: string; namedEmails: string[] } }
  | { kind: 'ask_person'; ask: string; default: string | null; secret: boolean }
  | { kind: 'done'; line: string }
// line: ≤ 120 chars, "Writing the page students post on."; account: ≤ 200 chars, "Two pages, and the rule about who sees what"

// agents/cwl.ts — the CWL specialist: proposes, never acts (agents.md rule 2)
export interface CwlBrief { plan: { whoGetsIn: string; youSee: string; studentsSee: string };
  staff: { instructorPuid: string; emails: string[] }; files: { path: string; content: string }[] }   // the skeleton's auth files and routes
export const cwl: AgentDef<CwlBrief, { changes: Change[]; summary: string }>

// agents/explaining.ts — a failure in one sentence (FE-8)
export interface Failure { what: 'build' | 'draft'; words: string[] }      // the platform's own, as Decision 8 gathers them
export const explaining: AgentDef<Failure, { note: string; sentence: string }>   // note ≤ 60, sentence ≤ 160

// build/moves.ts — the lead's moves as runtime tools, over the round's context (never in a prompt)
export interface RoundContext {
  token: string; projectId: string; personId: string
  source: Source; members: Members; guards: Guards                     // Tasks 4 and 6
  base: { get(): string; set(sha: string): void }                      // the commit the next change is made on
  /** Records the question. A default answers at once; none (or a secret) pauses the run. */
  question(ask: string, fallback: string | null, secret: boolean): { id: string; answeredWith: string | null }
  askCwl(brief: CwlBrief): Promise<{ changes: Change[]; summary: string }>
  theirWords(): string[]                                               // description, messages, answers: for guards.staff
  packageJson(): unknown                                               // as last read, for guards.commit
}
export const leadMoves: ToolDef<RoundContext, never>[]   // read, commit, ask_cwl, ask_person, done
```

*From sitting 2:* the lead's `answer` is `movesOf(leadMoves)`, `{ move }`-wrapped. `commit` refused `SPEC_INVALID` (or
`SOURCE_SECRET_DETECTED`, `SOURCE_PATH_CONFLICT`…) reports the facts **and** returns `refused: <code>`, so three in a
row count. `ask_person` without a default returns `stop: { kind: 'paused', questionId }`. A check that needs the
brief is `check: (input) => …` (the CWL specialist's emails).

- [ ] **Step 1: Tests, failing first** (`building.test.ts`, scripted answers):
  - **the lead's prompt** says: *we*; the stack is fixed and no dependency may be added (FE-32); never a Dockerfile
    or `.npmrc`; describe what people see, never code, in `line` and `account`; ask only what only the person can
    answer, with a default when there is a sensible one;
  - **`movesOf(leadMoves)`** accepts each of the five, and refuses a sixth kind, a `read` of 21 paths, and a `line`
    over 120 characters;
  - **`read`** answers the files' contents in its report, and a file too large or not text as a one-line reason,
    never a crash;
  - **`commit`** calls `source.commit` with `baseCommit()`, moves the base to the new commit, and reports the
    changed paths and any spec warnings;
  - **`commit` refused `SPEC_INVALID`** reports each detail's path, code and hint to the lead, and is not a try;
  - **`ask_cwl`** asks the CWL specialist with the brief plus the instructor's PUID and the skeleton's auth files,
    and reports its proposed changes **without committing them**: the lead commits (rule 2);
  - **`ask_person`** with a default answers at once with the default (*"We've built it so only you can"*) and
    records the question. **Without** a default, it stops the run as `paused`;
  - **`explaining`**, given the platform's own words as M4 recorded them, answers a `note` and a `sentence`, and
    neither holds a path, a module name or a code (C3). Two fixtures, verbatim from M4 (the dated entry):
    - a build: the log's lines *"npm error `npm ci` can only install packages when your package.json and
      package-lock.json or npm-shrinkwrap.json are in sync…"* and *"npm error Missing: marked@14.1.0 from lock
      file"*, with `Build.error` beginning *"BUILD_FAILED: build failed (exit 1)"*;
    - a draft: an incident whose `exitReason` is *"the process exited with code 1"*, whose `failedCheck` is
      *"readiness: GET /healthz … the edge last answered 0 after 87 attempt(s)"*, and whose `logTail` holds
      *"Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/missing.js' imported from /app/server.js"*;
  - **the lead's view keeps to `VIEW_CAP`** (Decision 3): with files that would pass it, every message the lead is
    sent comes to 48,000 characters or fewer, the plan and the pack are whole, and the file left out is its one
    line;
  - **the CWL specialist's answer** writes `config/staff.json` with exactly the instructor's PUID and the brief's
    emails, and its checks refuse an answer that writes any other staff.
- [ ] **Step 2: Red. Step 3: Implement.** The prompts live beside their schemas, as F2's agents do.
  **Step 4: Green. Step 5: Commit** `feat(server): the lead, the CWL specialist and the explaining agent; the lead's
  five moves`.

## Task 8: The round of work

**Files:** `server/src/build/{round.ts,round.test.ts}`, `server/src/store/runs.ts` (+ `questions`),
`server/src/api/progress.ts`, `server/src/api/work.ts` (step keys).

**What sitting 2 built that this task stands on** (its dated entry has why):
- `run()` knows only `ModelError`. A tool that meets a platform refusal the lead cannot answer returns it as its
  `stop` (`{ kind: 'refused', error }`), or throws it for `work.run` to say. Anything unknown is thrown.
- `MoveResult.refused` is a dry run's code. It counts toward `sameRefusal` as a guard's reason does. **The runner
  never stops at the third same refusal** (a test holds it), so the round adds its own stop condition:
  `stopWhen?: (state: RunState) => Stop | null` in `RunOptions` (Vercel's `stopWhen`), checked after each save, and
  `Stop`'s `limit` gains `'refusals'`.
- **Model entries in the trace are the round's to record**, from each session's `onAnswer`:
  `{ kind: 'model', agent, asked, answered, fallback, usage }`. The runner records only moves.
- The store already has `saveRun` / `getRun` (a `Run` is `RunState` plus the conversation, the round, the tries, the
  status, the sessions' ids and the model), `recordTrace` / `listTrace`, and `user_version` 2 with `building` and
  `built`. This task adds `questions`, as version 3.

**What sitting 3 built that this task stands on:**
- **`releases.deploy(token, projectId, releaseId)` and `instances.output(token, projectId, instanceId, lines)` take
  the project**, not an environment id. They find its sandbox themselves, so nothing can name staging. `output`
  refuses `SANDBOX_ONLY` an instance the sandbox does not list, and answers `{ unavailable: true }` for a failed one
  (M4). `releases.sandbox()` still answers the draft address and the environment's id, for `instances.list` and
  `incidents`.
- `source.commit` throws `CommitRefused` (with `details`) for `SPEC_INVALID`, and `PlatformRefusal` for everything
  else, `SOURCE_CONFLICT` included. It can record each call in a `sent` array. `source.file` answers
  `{ unreadable }` for the four `SOURCE_*` refusals.
- `secrets.setInSandbox` refuses `SECRET_INVALID` (a bad name, or a value under 6 characters) before anything is sent.
  A project without a sandbox is `SANDBOX_MISSING`.
- **`stream.watch(…).ready` rejects** when the stream is refused or closed before its first replay. `reconnected` is
  said once a reconnection's replay is handed over. `refused` is said once.
- `agentSessions.start(…, { capUsd: 2, durationMinutes: 240 })` answers `capUsd`; `agentSessions.list` answers each
  session's `spentUsd`, `null` kept.

**What sitting 4 built that this task stands on:**
- **`RoundContext` has three members beyond the plan's**, which the round implements:
  - `paths()`: the tree's paths as the round last knew them;
  - `wrote(changes)`: a landed commit's changes, so `paths()` and `packageJson()` follow;
  - `keep(files)`: a read's files, for the view, newest first.
- The lead's `LeadView.files` is newest first. Its report of a read is one line in the view, since the files are in
  `files`.
- The lead's moves report, and count, the refusals the lead can answer (`SPEC_INVALID` with its details,
  `SOURCE_SECRET_DETECTED`, `SOURCE_PATH_CONFLICT`…), and throw `SOURCE_CONFLICT` for the round.
- `ask_cwl` reports, and counts, `INSTRUCTOR_NOT_FOUND` and `CWL_ANSWER_INVALID`. It stops the run as `refused` on any
  other model error of the specialist's.
- **Mock mode's walk-through model answers the lead, the specialist and the explaining agent.** Its lead reads
  `server.js`, commits `public/weeks.html`, and is done.

**Interfaces:**

```ts
// api/progress.ts (additions; BuildStep is Task 7's)
export type StepKey = /* F2's */ | BuildStep
export type ConversationState = /* F2's */ | 'building' | 'built'
export type Needs =
  | { kind: 'tries'; step: 'build' | 'draft'; servingBefore: boolean }   // "…still has the last version that worked" / "…is still empty"
  | { kind: 'conflict' }
  | { kind: 'checkpoint'; capUsd: number; monthLeftUsd: number }
  | { kind: 'month'; resetsAt: string }
  | { kind: 'moves' }
  | { kind: 'unreachable'; what: 'platform' | 'model' }
  | { kind: 'cannot'; what: string }                                      // FE-32, in the lead's plain words
  | { kind: 'token' }                                                     // the page mints one, without a word
export interface RoundView {
  round: number
  status: 'working' | 'paused' | 'needs-you' | 'stopped' | 'interrupted' | 'done'
  line: string | null
  steps: { key: BuildStep; state: 'next' | 'now' | 'done' | 'halted'; tries: number; note: string | null;
           changed: string | null; exact: string[] | null }                // exact: files, or the platform's words
  needs: Needs | null
  questions: { id: string; ask: string; default: string | null; answer: string | null; secret: boolean }[]
  draft: { address: string; serving: boolean; lastAttempt: 'healthy' | 'failed' | null } | null
  cost: { conversationUsd: number | null; monthLeftUsd: number | null; resetsAt: string | null }
}
// the state frame gains `round: RoundView | null`

// build/round.ts
export interface Rounds {
  start(conversation: Conversation, token: string): void            // Decision 11: after the plan's commit
  carryOn(conversation: Conversation, token: string, way?: 'different'): void
  message(conversationId: string, words: string): void              // "Got it, after this step."
  answer(conversationId: string, questionId: string, words: string): void   // a secret's answer is never stored
  stop(conversationId: string): void
  interruptedOnBoot(): void                                         // working → interrupted (Review Focus 3)
}
export function createRounds(deps: { store: Store; hub: Hub; work: Work; sessions: AgentSessions; source: Source;
  builds: Builds; releases: Releases; instances: Instances; secrets: Secrets; members: Members; stream: ProjectStream;
  modelFor: (session: { key: string; baseUrl: string; model: string }, onAnswer: (a: Answered) => void) => Model;
  projects: Projects; trace: Trace; now: () => Date }): Rounds
```

- [ ] **Step 1: Tests, failing first** (`round.test.ts`). Fakes for every dependency, with the platform's events
  driven by hand, and a scripted lead:
  - **the five steps, each on its own signal:** `pages` stays `now` until `done` is answered after a landed commit;
    `holds` until the spec outcome and `importsHold`; `build` until `build.succeeded` **for that commit** (one for
    another commit leaves it `now`); `draft` until `healthy`; `answers` until the output is read. Then `built`, and
    the session is ended;
  - **starts by itself** when F2's plan commit lands (Decision 11), with one session of 240 minutes, on
    `default-chat-large`;
  - **three tries:** three `build.failed` → `needs: tries`, with `servingBefore` read from `listInstances`. The
    explaining agent's note is on the step, *"Building it (second try)"* is its tries, and the raw log is in `exact`;
    **[Try a different way]** resets the count once and puts the failures in the lead's view;
  - **`SOURCE_CONFLICT`:** the tree is re-read, the lead redoes its commit on the new base; three → `needs: conflict`;
  - **the checkpoint:** a `429 budget_exceeded` with `remainingUsd` 4 → `needs: checkpoint { capUsd: 2,
    monthLeftUsd: 4 }`. No new session starts until `carryOn`. Then one does, and the run resumes at its step;
  - **the month spent:** `remainingUsd` 0 → `needs: month`, with `resetsAt`;
  - **the session's clock:** a `401 expired_key` mid-round → the same checkpoint;
  - **moves:** 40 reads → `needs: moves`;
  - ***Stop*:** mid-build → the session is ended, the run is `stopped`, and nothing is deployed after it. *Stop*
    arriving while `deploy` is in flight still leaves the run `stopped` when `deploy` answers (Review Focus 4);
  - **a message mid-build:** the line becomes *"Got it, after this step."* at once. The next move's view carries
    it. A message during `build` is applied after `answers`, in the same session: back to `pages`;
  - **questions:** one with a default carries on; one without pauses (`paused`), and `answer` resumes. **A secret's
    answer goes to `secrets.setInSandbox` and nowhere else, and F2's dump of every table afterwards holds no trace of
    it**;
  - **FE-32:** a lead whose commit is guarded for a dependency, and which then answers `done`, leaves
    `needs: cannot`, and the rest built;
  - **a restart (Review Focus 3):** `interruptedOnBoot` marks a working run `interrupted`. `carryOn` with a new
    token re-reads the build it had started (`getBuild`): a `succeeded` build goes on to `draft`, never building
    that commit again;
  - **the stream reconnected** during `build`: the round re-reads the build, and ticks `build` from what it reads
    (Review Focus 5);
  - **the token refused** (the stream's `refused`, Task 5, or any call's `401 UNAUTHENTICATED`) → `needs: token`, and
    `carryOn` with a new token resumes;
  - **the fallback** (Rich, Decision 4): the round's first answer with `fallback: true` adds our one line to the
    conversation, and the round carries on; a second fallback answer in the same round adds nothing;
  - **the cost:** after each model call, `conversationUsd` is the sum of the round's sessions' `spentUsd`, and a
    `null` leaves it `null`;
  - **no credential reaches a prompt, or the store,** after a whole round (Global Constraints).
- [ ] **Step 2: Red. Step 3: Implement.** `round.ts` drives `runtime/run.ts` for each step's moves, and holds the
  signals, tries and stops itself. It runs inside `work.run`, so there is one piece of work per conversation, and
  F2's refusal frames and support references come for free.
- [ ] **Step 4: Green, twice; controls:**
  - a step ticked on `done` alone → red;
  - a new session started on a cap without `carryOn` → red;
  - *Stop* not checked after `deploy` → red;
  - a restart building the same commit twice → red;
  - the secret stored → red.
  Restore each.
- [ ] **Step 5: Commit** `feat(server): the round of work — five steps on their own signals, three tries, the
  checkpoint and the clock, Stop, messages, questions, a restart resumed`.

## Task 9: Our API's building routes

**Files:** `server/src/api/{build.ts,build.test.ts,events.ts,plan.ts,work.ts}`, `server/src/app.ts`, `server/src/main.ts`.

**Two things F2's `work.ts` does that this task must change** (read in sitting 1):
- **`work.mine` answers `409 CONVERSATION_BUSY` to anything while a piece of work runs**, and the round runs for
  minutes. So `/messages`, `/answers` and `/stop`, which exist to reach a round *while it works*, never take its busy
  check: they hand their words to `rounds.message`, `rounds.answer` and `rounds.stop`. `/build` keeps it.
- **A run's `finally` releases the conversation's claim whoever holds it.** Agree's work ends `'agreed'` and
  releases in its `finally`; a round started from inside it (Decision 11) would lose its claim to that `finally`,
  and a second `/build` would pass. Either agreeing and round 1 are **one** run (agree's work goes on into the
  round), or each run holds a claim of its own that only it releases.

**Routes** (every one guarded by the person and by `Origin`, F2 Decision 3):

| Route | Body | From state | Answers |
|---|---|---|---|
| `POST /api/conversations/:id/build` | `{}` or `{ way: 'different' }` | `building` whose run is `interrupted`, `stopped` or `needs-you` | `202`; the round carries on |
| `POST /api/conversations/:id/messages` | `{ words }` (≤ 500, `LIMITS.sentence`) | `building`, `paused` | `202`; read at the next move |
| `POST /api/conversations/:id/answers` | `{ questionId, words }` (≤ 500) | `building`, `paused` | `202` |
| `POST /api/conversations/:id/stop` | `{}` | `building`, `paused` | `202`; idempotent |

- [ ] **Step 1: Tests, failing first** (`build.test.ts`):
  - each route: `403 ORIGIN_REFUSED` from a student app, `404` for another person's conversation, `409
    CONVERSATION_STATE` from a state it does not take, `400` for a body out of shape or over `LIMITS`;
  - **F2's agree ends by starting the round:** after `/plan/agree` commits, the conversation is `building`, with
    round 1 `working` (Decision 11);
  - `/build` without a token held → `409 TOKEN_MISSING`, which the page answers by handing one over (F2's pattern);
  - the state frame carries `round`, and a reconnect's first frame rebuilds it whole;
  - **while the round's work is running**, `/messages`, `/answers` and `/stop` are `202` (never
    `CONVERSATION_BUSY`), and `/build` is `409 CONVERSATION_BUSY`;
  - **agree's run ending does not free round 1's claim:** straight after `/plan/agree`, a `/build` is `409
    CONVERSATION_BUSY`;
  - `/stop` twice is `202` both times, and one session is ended;
  - `main.ts` calls `rounds.interruptedOnBoot()` before listening.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** `/stop` without the Origin check → red; the
  claim released by any run's `finally` → the agree test red.
- [ ] **Step 5: Commit** `feat(server): our building routes — carry on, a message, an answer, stop; the round
  starts when the plan is committed`.

## Task 10: What the design system lacks for moment 6

**Files:** `ui/src/{LiveSteps.tsx,InverseSurface.tsx,LogPane.tsx,Disclosure.tsx,index.ts,components.css,parity.test.tsx,LiveSteps.test.tsx,Disclosure.test.tsx}`.

**M6 found:** the reference bundle **has `InverseSurface`** (`title`, `body`, `inset`, `warn`, `children`) **and
`LogPane`** (`lines`, `writtenBefore`), and our `components.css` already carries `.mf-inverse` and `.mf-log`. So both
are **ported, with parity cases**. It has **no disclosure**, so `Disclosure` is ours. The design system's rule for it
(manifest's `components/InverseSurface/README.md`): machine text sits *"behind a disclosure that is shut by default"*,
collapsed to a line count, line numbers muted and not selectable. Its summary is the walk-through's words (*"The exact
words, for whoever you ask for help"*), which are the design.

**Interfaces:**

```tsx
// LiveSteps: ours, not the reference's (parity holds without them)
export interface Step { text: string; note?: string; state?: 'done' | 'now' | 'next' | 'halted'
  /** Under the `now` step: what we are doing now. aria-live polite. */ line?: string
  /** A finished step's disclosure: what changed. */ detail?: ReactNode }
// InverseSurface and LogPane: ported from the reference, markup byte for byte (parity.test.tsx)
export function InverseSurface(props: InverseSurfaceProps): JSX.Element
export function LogPane(props: { lines: string[]; writtenBefore?: number; className?: string }): JSX.Element
// Disclosure: a native <details>, styled; closed, its summary says how many lines are inside; its body can be
// machine text on purpose (an InverseSurface holding a LogPane)
export function Disclosure(props: { summary: string; count?: number; children: ReactNode; machine?: boolean }): JSX.Element
```

- [ ] **Step 1: Tests, failing first:**
  - `line` renders under the `now` step only, in an `aria-live="polite"` element;
  - `detail` renders inside the finished step;
  - `Disclosure` is a `<details>`, closed by default, and its `summary` is a real focusable element;
  - `machine` gives the body the inverse surface (`InverseSurface`), and `count` shows in the closed summary;
  - **parity:** `InverseSurface` and `LogPane`, ported, render the reference's markup byte for byte; and without
    `line` and `detail`, `LiveSteps`' markup is byte for byte the reference's.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green. Step 5: Commit** `feat(ui): LiveSteps' line and detail;
  InverseSurface and LogPane ported with parity; a Disclosure of ours`.

## Task 11: The building screen, layout C

**Files:** `web/src/screens/building/{building.tsx,work.tsx,thread.tsx,needs.tsx,building.test.tsx}`,
`web/src/screens/describe/describe.tsx`, `web/src/screens/plan/plan.tsx`, `web/src/ours/{api.ts,conversation.ts}`,
`web/src/words.ts`.

**What it draws** (walk-through moment 6; words to `words.ts`, the walk-through's first):
- **Left, the conversation (`thread.tsx`):**
  - their words;
  - our one-sentence explanations;
  - earlier rounds folded into one line each: *"Built and put on your draft address · 28 Sep, 9:12 · What
    changed"*;
  - questions as *needs you* cards with an answer field (a secret's field is a password input, never echoed back);
  - the message box, with F2's count and limit. After `built`, it says *"Asking for a change arrives next."*
- **Right, the work (`work.tsx`)**, which stays in view:
  - the `StateChip` (one of the five states);
  - `LiveSteps` with the line and each step's note and tries; each finished step's *What changed*, with
    *"The exact changes, for whoever you ask for help"* inside it;
  - *"A few minutes. You can leave: it keeps going, and this page shows where it got to when you come back."*
    *(M4 and M1 hold "a few minutes": a build took about 18 s and a sandbox deploy 9 s, 91 s when it cannot start; a
    move of the lead's took 4 to 21 s on `default-chat-large`, so a round of 15 to 30 moves is about 2 to 8 minutes.)*
    Decision 4's fallback line is in `words.ts` too;
  - the draft address, in mono, as a link;
  - *serving right now* beside *the last attempt*, while a draft attempt fails;
  - the cost line: *"$0.40 so far · $9.60 left this month"*, or the month alone;
  - **[Stop]**, with *"Nothing is lost. Your draft address keeps whatever was last put there."*
- **`needs.tsx`, one card per `Needs`,** each with its reference where it is a problem:
  - `tries`: *"We couldn't get it to build after three tries. Nothing is broken: your draft address still has the
    last version that worked."* (or *"…is still empty"*), with **[Try a different way]** · **[Stop here]**;
  - `checkpoint`: *"This piece of work has used what we allow in one go. Carry on? It can use up to $2 more of the $10
    you have this month."*, with **[Carry on]** · **[Stop here]**;
  - `month`: *"Your AI allowance for this month is used up, part-way through. What's done is kept… It comes back on 1
    October."*, in their own time zone;
  - `conflict`: *"Someone else changed the app while we worked. Nothing of yours is lost."*, with **[Try again]** ·
    **[Stop here]**;
  - `moves`: *"This is taking longer than it should. Nothing is lost."*, with **[Carry on]** · **[Stop here]**;
  - `unreachable`: *"We can't reach Manifest just now. Nothing is lost."*, or *"We can't reach the model we build with
    just now. Nothing is lost."*, with **[Carry on]**. It is *waiting on someone*;
  - `cannot`: *"We can't add <what> yet: it needs a piece we can't install. Everything else is built."*, where
    `<what>` is the lead's own plain words;
  - `token`: nothing is shown; the page mints a token and carries on (F2's `handOverToken`).
- ***"Reconnecting…"*** quietly while the page's stream reopens (F2's).
- **Routing:** `describe.tsx` sends `building`, `paused` and `built` to `BuildingScreen`. F2's *"Agreed. Building it
  arrives next."* is gone, since the round has started. **Every screen's fallback for a state it does not draw shows
  its words with a reference** (Decision 12).

- [ ] **Step 1: Tests, failing first** (`building.test.tsx`, jsdom, a recording `Ours`, frames said by hand):
  - each step's state follows the frames: the line under `now`, the note and *"(second try)"*, and *What changed*
    on done;
  - each `Needs` draws its card, its buttons call the right route, and a problem card carries a reference;
  - a question with an answer field posts `/answers`; a secret's field is `type="password"`, and its value never
    appears in the DOM after sending;
  - the message box posts `/messages`, and shows *"Got it, after this step."* from the frame;
  - *Stop* posts `/stop`;
  - the cost line shows both figures, or the month alone when `conversationUsd` is `null`;
  - **`machineryIn(text())` is empty** (C3), with the closed disclosures excluded, and ***"It works"* appears
    nowhere**;
  - `needs: token` mints and hands over without a word;
  - `built` shows the folded round and *"Asking for a change arrives next."*
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green.**
- [ ] **Step 5: Walk it in headless Chrome against the mock, at 1440 and 375**, from the scratchpad (ORIENTATION §7's
  way). The mock's build and deploy answers are examples (M2), so the walk shows layout, flow and words, not a real
  build. No console error, no failed request, no overflow.
- [ ] **Step 6: Commit** `feat(web): moment 6 — the building screen in layout C: the steps and the line, questions,
  messages, the checkpoint, Stop, the cost`.

## Task 12: The acceptance (sitting 7, alone)

- [ ] **Step 1: Against the mock.** `scripts/check-building.sh`, beside `check-describing.sh`, drives our API as the
  browser does, with the scripted model. It asserts **what our server sent**, read from the trace, whose platform
  entries say what each call named (Task 2). *(M2: the mock's `main` never moves, so every commit's base is
  `c2ac2119…`; its build is `4444…` of its own commit; its `deploy` and `getInstanceOutput` answer staging's instance;
  and its stream plays `build.started` at 1 s, `build.succeeded` at 14 s and `instance.healthy` at 20.6 s, once per
  connection, whatever was started. So the round ticks on ids, and this check reads what was sent.)*
  *(**Re-measured at manifest `18f3214`**, the platform's sitting 10, FE-26 and FE-27, in F3's sitting 4:
  - **a deploy to the sandbox now answers the sandbox's own instance**, `…661` healthy, and `listInstances` of the
    sandbox lists it serving, beside a failed `…662`;
  - `getInstanceOutput` reads `…661`; `…662` is `409 INSTANCE_OUTPUT_UNAVAILABLE`; staging's `…666` is `403
    INSTANCE_OUTPUT_STAGING`;
  - sessions list `default-chat-large`, and carry the name and cap asked for;
  - **any id the mock does not hold is `404`**, so the round must use the ids the mock answers: project `2222…`,
    commit base `c2ac2119…`;
  - only `manifest_session=mock-session` is a session, though a Bearer of any value is taken;
  - **unchanged:** the build is `4444…` of its own commit `5f3c…`, the scripted stream, and `createCommit`'s fixture.
  The round's sandbox-only calls (sitting 3) therefore find a sandbox instance to read.)*
  1. the round starts when the plan's commit lands;
  2. the commits' dry runs, then the commits;
  3. `startBuild` names the last commit;
  4. `createRelease` names that build;
  5. `deploy` names the sandbox;
  6. `getInstanceOutput` names the sandbox's instance;
  7. the session ends;
  8. a `/stop` mid-round ends the session and deploys nothing more;
  9. a student app's post is `403 ORIGIN_REFUSED`;
  10. no `mft_` and no `sk-` in any table, or in any prompt the runtime recorded sending.

  **Negative controls, each red:** the sandbox check removed; the dry run skipped; *Stop* ignored; the no-credential
  scan pointed at a leaked row.
- [ ] **Step 2: On the real platform** (after 9b's CLOSED; the control plane per manifest's RUNBOOK, asking Rich
  first; our server in edge mode). Headless Chrome through `https://app.manifest.internal`, signed in as `instructor`
  (Rich's word), at 1440 and at 375:
  - describe the walk-through's app → name → *Make it* → the plan → *Yes, build that*;
  - **watch the round:** each step ticks on its signal, the line changes, and the cost line moves;
  - it reaches ***"It started and answered."*** Record the draft address, the time, the cost, and the model the trace
    says answered;
  - **the deliberate break** (Rich's word): after the plan's commit and before the build, commit a line that fails
    at start, `throw new Error('a deliberate break')`, with a token the headless page mints. *(M4: this blueprint's build runs only `npm ci`, so code cannot fail it; a start that fails is a draft
    failure, `200 failed` after about 91 s, with an incident. An `import './missing.js'` would be caught earlier,
    by Decision 6, before any build.)* Watch the explaining agent's sentence, and the lead read the incident, fix
    it, and deploy again: *"Putting it on your draft address (second try)"*;
    **Put it where the lead will not overwrite it:** the lead writes whole files, so a break in `server.js` before
    its pages is written over, and a commit after its `done` is not in the commit the round builds. So the throw goes
    at the top of a blueprint file the lead has no reason to rewrite, `auth/session.js`, straight after the plan's
    commit;
  - press *Stop* in a second round; the draft address keeps the first round's version;
  - **record the lead's words verbatim**, as F2 recorded the plan's: its lines, its accounts, its questions.
- [ ] **Step 3: Rich's click:** `https://app.manifest.internal/new`, signed in as `instructor`, moments 3–6.
- [ ] **Close:** the whole-branch review (a fresh reviewer, read-only), its findings fixed test-first; the gates twice;
  the dated entry; this table; ORIENTATION; the roadmap. **F3 is executed only when Step 3 is done.**

---

## What this plan does not build

- **Seeing it as pretend people** (moment 7, FE-3) and **a change as its own conversation** (moment 8): F4.
- **Email** of any kind: F6 (Rich's A).
- **Toolkit specialists beyond CWL, and the domain helpers**: later. Toolkit know-how has no home yet (FE-19).
- **Staging and production:** F5. The lead never touches them.
- **A dependency added to the app** (FE-32), a class roster (FE-20 is coming), rollback, and native tool calling.
- **The watch token**, and anything that runs with no conversation open: F6.

## What executing this plan found

*Each sitting adds a dated entry here: its measurements, its rulings, its negative controls, and its gates.*

### 2026-09-28 — Sitting 1 (Task 1): the measurements

*One agent, natively, as Rich chose. M1's reading, M2, M5 and M6 ran while the platform's 9b tested. M1's live half, M3
and M4 ran after its CLOSED (manifest `346cd9e`; the control plane restarted empty), signed in as the test user
`instructor` at Rich's word. The throwaway scripts and their records are in the session's scratchpad; this entry is
the record. The contract did not move: **1.4.0, 66 operations**, before and after 9b.*

**The one decision of Rich's this sitting asked for.** M1 showed 9b's fallback is the 4B on-premise model, with a
16k-token context that cuts a longer prompt without a word. Asked what the round does when it answers, Rich chose
***"Carry on, but say so"*** (recorded in *Decided by Rich*; Decisions 3 and 4 carry it).

**M1: the contract, and the capable model** (one agent session at a time; `capUsd: 2` and `durationMinutes: 240` were
both taken, and `expiresAt` was 240 minutes after `createdAt`):
- **The union of moves at the schema's root never reached OpenAI.** Seven calls of seven answered `200` from
  `ollama_chat/qwen3.5:4b`, with `x-litellm-attempted-fallbacks: 1`. A diagnosis, cheapest first: no schema, a root
  object, and a root object without `$schema` all answered from `default-chat-large`. A root `anyOf` fell back. The
  lead's union **wrapped as `{ move }`** answered from `default-chat-large`. So Decision 1 is corrected, and FE-34 is
  written.
- **Wrapped, on `default-chat-large`:** 5 of 5 parsed, in 4.0, 5.4, 6.7, 8.5 and 21.2 s. The prompt was 35,955
  characters, 9,644 tokens; the answers took 137 to 1,200 reasoning tokens; the prompt was cached after the first
  call (9,641 tokens). A 95,978-character prompt (33,782 tokens) answered in 7.1 s, and a 280,319-character one
  (107,984 tokens) in 15.7 s. All seven calls cost **$0.021**. The first run, on the fallback, cost $0.086.
- **Which model answered:** on the normal path the answer's `model` reads `default-chat-large` (not
  `openai/gpt-6-luna`), and the header says `0`. The fallback's reads `ollama_chat/qwen3.5:4b`, and the header says
  `1`. On the fallback, prompts of 95,978 and 280,319 characters both counted **16,386** prompt tokens: cut, silently.
  Hence Decision 3's cap of 48,000 characters.
- **The lead's moves, verbatim in spirit:** its first move was `ask_cwl`, with a brief true to the plan (*"Anyone with
  a CWL account can sign in; we cannot restrict access to the class yet."*). Reads asked for the blueprint's auth
  files. One `ask_person` found a real gap in the plan: *"To show how many students have not posted, we need to know
  the class roster or at least the expected class size…"*, with the default *"We'll show the number of responses
  received, but not a count of students who have not posted, unless you provide an expected class size."* (FE-20's
  shadow.)
- **The contract's shapes** (Task 4 now carries them): `getTree`'s `entries` with `type`, `size` and `binary` nullable
  for non-files; `getFile`'s four `SOURCE_*` refusals; `createCommit`'s `spec.warnings` (there is no `specWarnings`);
  `Build.status` with `pending`; `Instance.state` with ten values; `listIncidents`' fields all strings, `logTail` one
  string, and a `prompt` written for an agent; `listAgentSessions` as `{ sessions, truncated }`; `setAppSecret`, which
  no task had, and which is now Task 4's `secrets.ts`.
- **`listMembers` answers the conversation's token**, and the owner's `userId` is `getMe`'s `id`
  (`instructor@ubc.ca`, PUID `ins000001`), so Decision 13's PUID comes from it as planned.
- **The contract's `subscribe()` runs in Node with a token**, sends `Authorization: Bearer` and no `Origin`, and
  rejects `ready` when a socket closes first. It does not reconnect: Task 5 does that.

**M2: the mock** (`manifest-mock` on 7102, before 9b's close):
- Every operation answers a token of any value, from the document's examples (FE-27). `createCommit` wants the base
  `c2ac2119…`, answers that same sha as the new commit (`main` never moves), and checks nothing else: a Dockerfile,
  a secret-shaped value and `../a.js` were all `201`.
- `startBuild` answers build `4444…` of commit `5f3c…`, whatever is named. `deploy` and `getInstanceOutput` answer
  **staging's** instance whatever is named. Its sessions list no `default-chat-large`.
- **Its stream** replays three events, sends ready, then plays one script **per connection, from connect**:
  `build.started` at 1 s, 20 log frames, `build.succeeded` at 14 s, then staging's instance provisioning, starting,
  and `instance.healthy` at 20.6 s.
- So the round ticks on ids, never on a commit or an environment (Decision 5), and Task 12's mock half asserts what
  was sent.

**M3: the stream from a server** (the real platform, `subscribe()` with a token):
- The replay came oldest first (13, then 33 events), then ready, in 25–47 ms.
- A revoked token's new upgrade closed `1006` in 33 ms, and a `GET` of the same URL answered `401 UNAUTHENTICATED`. A
  good token's `GET` answers `426`. Another project's id closed `1006`, and its `GET` answered `404`. **`4404` and
  `4403` were never sent to a token**, so Decision 15 and Task 5 now read `1006`, then the `GET`.
- **A token revoked while its stream is open keeps the stream, and goes on receiving the project's events**:
  `agent_session.started` and `agent_session.ended` arrived after the revocation. That is **FE-33**. The round learns of
  a revocation from its next call's `401`.

**M4: one round by hand** (a `node-ts-mongo@1` + `proof-app` project, the real platform):

| Step | Measured |
|---|---|
| `startBuild` → `build.succeeded` | 17.8 s and 18.2 s (75 log lines); the event arrived before any poll |
| `createRelease` | 19–25 ms |
| `deploy` to the sandbox, healthy | **8.9 s**, answered `healthy`; `getInstanceOutput` read `proof app listening`; `/healthz` and `/` answered `200` through the edge |
| **Break A:** `import './missing.js'` in `server.js` | built fine (18.2 s). `deploy` answered **`200 failed` after 91 s** (87 readiness attempts). The earlier instance **kept serving**. `getInstanceOutput` was `409 INSTANCE_OUTPUT_UNAVAILABLE`, and the incident held the whole `ERR_MODULE_NOT_FOUND` stack, a `diffSinceHealthy` and a `prompt` |
| **Break B:** `marked@14.1.0` in `package.json`, no lock | **`build.failed` in 3.6 s.** The telling lines are about 50 from the end of 100: `Build.error` and `reason` hold only npm's usage text (FE-32, now measured) |
| Dry-run refusals | stale base `409 SOURCE_CONFLICT`; a secret-shaped value `409 SOURCE_SECRET_DETECTED`, naming `config/aws.js:1` in the message, with no `details`; `../x.js` `400 REQUEST_INVALID`; a `Dockerfile` **`201`** (the platform replaces it at build); `runtime.build` `422 SPEC_INVALID`, `details[0].code` `SPEC_BUILD_BLOCK_FORBIDDEN`; the same file again `409 SOURCE_NOTHING_TO_COMMIT` |

- Real subjects include the slug (`project:<slug>`, `repository:<slug>`, `sp:<slug>:sandbox`), and a deploy also
  sends `sso.registered` and `ai.key_rotated`. So Decision 5 matches on `machineDetail`'s ids.
- **"A few minutes" holds:** a build of 18 s, a deploy of 9 s (91 s when it cannot start), and a move of 4–21 s. A
  round of 15–30 moves is about 2–8 minutes. **Decision 17's 120 s stands.**
- This blueprint's build runs only `npm ci`, so code cannot fail a build. Task 12's deliberate break is now a throw
  at start, placed where the lead will not overwrite it.

**M5: the two frameworks** (OpenAI's Agents SDK for JavaScript **v0.18.0**; Vercel's AI SDK **`ai@7.0.120`**; read from
their repositories' docs): every idea *Decided by Rich* takes has a name there, recorded as a table in Task 2. **Nothing
changes Task 2's shape.** Our guard is OpenAI's tool input guardrail with `rejectContent`; `maxMoves` is `maxTurns` and
`isStepCount`; the view is `callModelInputFilter` and `prepareStep`.

**M6: the blueprint** (read-only):
- JavaScript, as **ES modules** (`"type": "module"`). So Decision 6 and Task 6 now demand an exact relative path.
- `server.js` is the entry. A signed-in request's `req.user.user` is `bridge(profile)` by friendly name
  (`ubcEduCwlPuid`, `mail`). The staff check is middleware after `passport.session()` (Decision 13).
- The knowledge pack is 11,513–11,569 characters, so it goes whole.
- The design system's reference **has `InverseSurface` and `LogPane`**, which Task 10 now ports, and **no disclosure**,
  which stays ours.

**Read from our own code** (the prep Rich asked for while 9b tested), each now a test in its task:
- F2 never set `pragma user_version`, so the migration is 0 → 2.
- `Store` exposes no database, so `storeTrace` is two new `Store` methods.
- An agent's check is built from its input, as F2's `checkedAgainst` is.
- **`work.mine` answers `409 CONVERSATION_BUSY` while work runs**, so `/messages`, `/answers` and `/stop` must skip it
  (Task 9).
- A run's `finally` must not free a later run's claim (agree → round 1, Task 9).

**Rulings** (the ledger has each with its cost):
1. M4 built `node-ts-mongo@1` + `proof-app`, not the fixture, because its times are the ones "a few minutes" rests on.
2. Break A was `import './missing.js'` (ES modules).
3. M3 revoked a token of its own.
4. `secrets.ts` joins Task 4.
5. Mock mode's answers for the three agents join Task 7.
6. Decision 15's `4403` became the contract's `1006`-then-`GET`, confirmed by M3.
7. The five corrections from reading our code.

**Findings written:**
- **FE-33** (a revoked token's open stream keeps receiving) and **FE-34** (the fallback answers a request OpenAI
  refused); neither is carried.
- **FE-32** is now measured.

**Measurement controls** (a measurement can be wrong too):
- M3's first run revoked nothing: our helper sent `content-type: application/json` with an empty `DELETE`, which the
  platform answered `400`. The stream "surviving a revocation" was therefore unproven. It was fixed and run again,
  and the open stream was then shown receiving events made *after* the `200` revocation.
- M1's first `endAgentSession` failed the same way, and was ended by hand (`200`, `$0.086`).

**Gates:** `pnpm test` **547/547, twice** (ORIENTATION said 546: FE-28's fix added one); `pnpm lint`, `pnpm typecheck`
and `pnpm format:check` pass. No code changed this sitting: the plan, `api-findings.md`, ORIENTATION and the roadmap.

**Spent:** $0.107 of the test user's month. $0.086 of it was charged at the fallback's on-premise price, before the
cause was found. **On Rich's OpenAI key, about $0.02.**

### 2026-09-28 — Sitting 2 (Tasks 2 and 3): the runtime, and which model answered

*In the same session as sitting 1, at Rich's word ("ok please continue with the next sitting"): he had chosen one
sitting per session, and waived it here.*

**Commits:**
- `d6545f5`: Task 2, the runtime (`runtime/agent.ts`, `tool.ts`, `run.ts`, `trace.ts`), the `runs` and `trace`
  tables, and the migration;
- `67e90df`: Task 3, the model client's `onAnswer` and `modelFor`.

**What was built:**
- **An agent is data:** instructions, a brief rebuilt every call, an answer, and a check built from the call's input.
  `askAgent` sends the instructions as the system message.
- **A move is a tool:** a zod schema, a guard, and a run over a context the model never sees. `movesOf` wraps the
  union as `{ move }`.
- **The runner** asks one move at a time, guards it, runs it, traces it, and saves the run after every move. It
  stops on:
  - `done`;
  - `paused`;
  - 40 moves;
  - *Stop*, checked before a move **and once the model has answered**, so a move answered after *Stop* never runs;
  - a `ModelError`.

  The same refusal, a guard's or a dry run's, is counted for the round.
- **The trace** holds moves (and, from Task 8, model and platform entries), never text. The store refuses an entry
  shaped like a credential (`mft_…`, `sk-…` at a word's start).
- **`openAiCompatible`'s `onAnswer`** hears every answer paid for: its own `model`, `fallback` from
  `x-litellm-attempted-fallbacks`, and `usage` (`null` when absent, never zero). It hears nothing of a refusal.
  `modelFor` prefers `default-chat-large`, then `default-chat`.
- **The migration** takes F2's files (`user_version` 0) to 2. It rebuilds `conversations` for `building` and `built`
  by SQLite's twelve steps, reading the table's definition out of `schema.sql` itself.
  - **Our dev database migrated live** on the next restart: 51 conversations, 221 messages and 47 plans intact,
    `pragma foreign_key_check` clean.

**Rulings** (the ledger has each with its cost):
1. `RunOptions.agent` answers the wrapped `Moves`.
2. The runtime knows only `ModelError`. A tool hands back a platform refusal as its `stop`, or throws; an unknown
   error is thrown.
3. `MoveResult.refused` exists, for Decision 7's dry-run refusals.
4. *Stop* is checked after the answer too (Review Focus 4).
5. The trace's model entry carries `fallback`.
6. The runner records moves only; model entries are the round's, from `onAnswer`.
7. The migration reads the table's definition from `schema.sql`.
8. `onAnswer` hears the retried answer too.
9. `fallback` is the header alone.

Task 8 now names the stop condition it must add (the runner never stops at the third same refusal).

**Negative controls**, each red, then restored:
- **Task 2:**
  - the guard not consulted;
  - the view not rebuilt;
  - `maxMoves` ignored;
  - the context spread into the view. It **stayed green at first**: the test's own agent rendered only two fields
    of its view. It was strengthened with an agent whose brief shows everything it is given, and then went red;
  - *Stop* not checked after the answer;
  - the union at the root;
  - no migration;
  - the trace's credential check removed.
- **Task 3:**
  - `onAnswer` before the refusal check;
  - the header ignored;
  - a missing usage as zero;
  - `default-chat` before `default-chat-large`.

**Gates:** `pnpm test` **580/580, twice** (547 + 20 runtime + 7 store + 6 model); `pnpm lint`, `pnpm typecheck` and
`pnpm format:check` pass; `scripts/check-describing.sh` 18/18 against the migrated dev database, its no-credential
scan now reading `runs` and `trace` too.

### 2026-09-28 — Sitting 3 (Tasks 4 and 5): the platform calls, and the event stream

*In the same session again, at Rich's word ("ok, start sitting 3 in parallel"), while the platform session
(`manifest-82`) ran its sitting 10: the console, the mock, FE-24, FE-17 and FE-18. What was agreed with it:*
- *it stops and truncates 7100 as it tests, since nothing of ours there must survive, and we tell it before we use
  7100;*
- *it messages us at the mock's commit, and we restart our mock between tasks;*
- *it messages us at each contract commit;*
- *we hold 7102 and 7105.*

*Sitting 3 used neither 7100 nor the mock's new answers. Its tests run against our own fakes.*

**Commits:** `90c9146` (Task 4), `b3d7efa` (Task 5).

**What was built:**
- **Task 4, each call asserted by what it SENT**, against the shapes M1 and M4 recorded:
  - `source`: the tree's files, a file (with the four `SOURCE_*` reasons), and a commit that is dry-run first, with
    two Idempotency-Keys. `SPEC_INVALID`'s details become `CommitRefused` (path, code and hint, never a message).
    `SOURCE_CONFLICT` is thrown. Each call is recorded as it goes;
  - `builds`: `start` always names the commit;
  - `releases`: `deploy` finds the sandbox itself. Its deadline is 120 s, and every other call keeps 15 s, held by
    a spy on `AbortSignal.timeout`;
  - `instances`: `output` reads the sandbox's own instances only;
  - `secrets`: the sandbox alone, with the name and value checked first;
  - `members`: the instructor's PUID and email;
  - `agentSessions`: the $2 cap and the 240 minutes, and each session's spend.
  - F2's `commitPlan` now runs through `source.commit`. Its tests stand unchanged, and so does
    `check-describing.sh` (18/18).
- **Task 5:** the contract's `subscribe()`, wrapped:
  - each event once;
  - a drop reconnects after 200 ms, doubling to a 10 s cap and starting again at 200 ms once connected, and says so
    after the replay;
  - a `1006` is followed by a `GET`: `401` or `404` is refused once, and `426` reconnects;
  - `close()` leaves no timer.
  - One case runs the **real socket** against a hand-written upgrade: the token and no `Origin` sent, the replay
    handed over, and a cut socket whose `GET` says `401` refused.

**Rulings** (the ledger has each with its cost):
1. **`deploy` and `output` take the project and find the sandbox themselves.** The brief had an environment id,
   checked against a remembered `sandbox()` answer, which a restart would forget.
2. `source.commit` takes an optional `sent` record.
3. `start`'s options are optional, so F2 still sends `{ name }`.
4. A long summary is cut, not refused.
5. Three codes of our own: `SECRET_INVALID`, `SANDBOX_ONLY` and `SANDBOX_MISSING`.
6. `tokenClient` and `called()` live in `refusal.ts`.
7. `reconnected` is said after the replay, never at the connect.
8. `ready` rejects when the stream is refused.
9. `4403` and `4404` are refused without a `GET`; the waits and the memory are constants.
10. The stream's tests script `subscribe()`, plus one real-socket case. The brief's *"as F2's proxy test does"*
    named a test that does not exist in this repository.

**Negative controls**, each red, then restored:
- **Task 4:**
  - the dry run skipped;
  - `deploy` on 15 s;
  - `deploy` taking the first environment;
  - `output` reading any instance;
  - `SPEC_INVALID` as a plain refusal;
  - a file's refusal thrown;
  - a secret unchecked;
  - the tree keeping directories;
  - the first member taken;
  - the cap and clock not sent.
- **Task 5:**
  - dedupe off;
  - no reconnect on `1011`;
  - a reconnect after `GET` `401`;
  - `close()` leaving its timer;
  - `reconnected` never said;
  - no cap on the wait;
  - the wait never starting again;
  - a `1006` never asked about.

**Gates:** `pnpm test` **625/625, twice** (580 + 31 platform + 14 stream); `pnpm lint`, `pnpm typecheck` (against the
platform's uncommitted sitting-10 tree) and `pnpm format:check` pass; `scripts/check-describing.sh` 18/18.

### 2026-09-28 — Sitting 4 (Tasks 6 and 7): the guards, and the three agents

*In the same session again, at Rich's word ("ok, let's go with sitting 4!"), while the platform's sitting 10 went on.
Its commits reached us mid-sitting:*
- *`bb32fa6`, FE-24's code: a staging instance's output is `403 INSTANCE_OUTPUT_STAGING`;*
- *`46399c5`, FE-18: the contract's `dist/` types stand alone;*
- *`18f3214`, its mock, FE-26 and FE-27.*

*The contract stayed 1.4.0 and 66 operations, with 127 codes. The mock broke two of our web tests while its changes
were still uncommitted: our tests read `@manifest/mock` live. At our agreement, we told it and changed nothing until
it committed. Between Task 7 and this close, we restarted the mock and followed it.*

**Commits:**
- `aeed3ff`: Task 6, the guards;
- `85183c6`: Task 7, the three agents and the lead's moves;
- `9278ff8`: our tests following the mock at `18f3214`.

**What was built:**
- **The guards** (Review Focus 1), each harm its own case:
  - **`commit`** refuses:
    - a path outside the app;
    - a `Dockerfile` or `.npmrc` anywhere, or a `runtime.build` block, in block or flow style, with no YAML
      dependency;
    - any change to `dependencies`, `devDependencies` or `overrides`, removals included, while `scripts` may change;
    - `package-lock.json` written or deleted (FE-32);
    - a secret's shape (`mft_`, `sk-`, a PEM block, an AWS key id), never repeated in the reason;
    - a delete of a file that is not there.
  - **`words`** refuses F1's machinery list, the code the lead writes (`npm`, `git`, `commit`, `middleware`…), a file
    or a path, and *"it works"*.
  - **`staff`** refuses any email the person did not write, whole.
  - **`importsHold`**: ES modules resolve exactly; bare names are built-ins or `dependencies`, since the build omits
    dev; `public/` is not read; comments carry no imports.
  - **Against the real proof-app seed** (manifest's blueprint, read-only): nothing missing, nothing refused.
- **The lead:**
  - its prompt, which the test holds to FE-32, the pack's build rule, plain words, and questions with defaults;
  - its answer, `movesOf(leadMoves)`;
  - its view, kept to `VIEW_CAP`, with the plan and the pack whole and the files newest first;
  - **the five moves**, each guarded. `commit` also guards its `line` and `account`, and any `config/staff.json`
    against the person's own words.
- **The CWL specialist:** its check holds `config/staff.json` to exactly the instructor's PUID and the named emails.
- **The explaining agent:** its check refuses machinery, codes, paths and the names in the platform's own words,
  proved on M4's recorded words.
- **Mock mode plays all three**, and one test runs a whole walk-through round through the runtime.

**Rulings** (the ledger has each with its cost):
1. The words guard adds the lead's code words and file shapes, since *"Running npm ci"* holds no machinery word.
2. Any change to the locked sections of `package.json` is refused, removals included.
3. The tree refuses a missing delete.
4. `importsHold` counts `dependencies` only.
5. The guards reuse F1's list from the web package, as the server's tests already do.
6. `RoundContext` gains `paths()`, `wrote()` and `keep()`.
7. The view shows a read as one line, cuts other reports at 12,000 characters, and shows a file that does not fit as
   one line.
8. The commit guard also checks words and staff.
9. `ask_cwl`'s three outcomes.
10. `CHANGE` is shared, from `moves.ts`.
11. The explaining agent's check.

**A discipline note:** Task 7's tests were written first, **but not run red before the implementation**. Each
behaviour's negative control stands in for that.

**Negative controls**, each red, then restored:
- **Task 6 (15):**
  - a path outside the app;
  - a `Dockerfile` or `.npmrc`;
  - the lockfile;
  - a missing delete;
  - secrets;
  - `runtime.build`;
  - a dependency;
  - *"it works"*;
  - machinery;
  - files and paths;
  - any staff;
  - relative imports;
  - any package;
  - comments;
  - `public/`.
- **Task 7 (14):**
  - the prompt forgets FE-32;
  - a read keeps nothing;
  - a commit leaves the base;
  - `SPEC_INVALID` not counted;
  - `SOURCE_CONFLICT` answered;
  - no staff guard;
  - the specialist not given the PUID;
  - `ask_cwl` unguarded;
  - a default still pauses;
  - the view uncapped;
  - the specialist unchecked;
  - explaining lets names through;
  - the walk-through lead never commits;
  - a read of 21 paths.
- **`check-slice.sh`'s test 7** now runs in mock mode. A nonsense session is `401`, and the mock's own is `200`.

**Gates:** `pnpm test` **705/705, twice**; `pnpm lint`, `pnpm typecheck` and `pnpm format:check` pass;
`scripts/check-describing.sh` 18/18; `scripts/check-slice.sh` 8/8, where it was 7 with one skipped.
