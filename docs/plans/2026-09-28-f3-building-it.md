# F3 — Building It: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Read [`../ORIENTATION.md`](../ORIENTATION.md) first. F2 is executed; this plan starts from it.**

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
- **No new dependency.** The platform's event stream is read with the contract's own `subscribe()` helper, or with
  Node 24's global `WebSocket` if M3 shows the helper cannot run on a server.

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
| 1 | 1 | **The measurements.** The capable model's structured answers; the mock's build and deploy answers; the platform's stream from a server; a round by hand on the real platform; the two frameworks' current documentation; the blueprint's sign-in code. **Alone, and first.** M3 and M4 need the control plane, which the platform's 9b has stopped: they wait for its *"CLOSED"* | not started |
| 2 | 2, 3 | The runtime: agents, moves, the runner, its stop conditions, guards, the trace, saved runs. And the model client recording which model answered, and its usage | not started |
| 3 | 4, 5 | The platform calls, and the project's event stream | not started |
| 4 | 6, 7 | The guards, then the three agents (the lead, the CWL specialist, the explaining agent) and the lead's moves | not started |
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
   - The lead's moves are a discriminated union on `kind`, built from each move's zod schema. It is sent as
     `response_format: json_schema` by F2's model client. That is the same thing as tool calling with one tool
     required, but it keeps `agents.md` rule 3, and it works on 9b's small fallback model.
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
   - the blueprint's knowledge pack **in full**, up to the ceiling M1 sets from the model's context. F2 cut it at
     24,000 characters for the small model;
   - the tree's paths;
   - the files it last asked for, up to 60,000 characters;
   - the step it is in, and the tries so far;
   - what its last move did: the platform's answer, or a guard's reason;
   - any message from the person it has not yet read.
   - **Never the conversation's history, and never a token or key.** A test dumps every prompt the runtime sends
     and asserts no `mft_` and no `sk-` (Global Constraints).
4. **The model: the most capable one the session lists.**
   - `default-chat-large` if `session.models` names it, else `default-chat`. The choice is recorded in the trace.
   - The answer's own `model` field is recorded too, since 9b names its fallback there, as is its usage. Neither is
     ever shown to the person.
   - The explaining agent and the CWL specialist use the same session and the same model.
5. **The steps and their signals:**

   | Step (words.ts) | Key | Ticks on |
   |---|---|---|
   | *Writing the pages* | `pages` | the lead's `done`, once its commits have landed (`createCommit` answered; `repository.committed` on the stream) |
   | *Checking it holds together* | `holds` | the last commit's `spec` outcome with no errors, **and** Decision 6's check |
   | *Building it* | `build` | `build.succeeded` for that commit |
   | *Putting it on your draft address* | `draft` | `deploy` answering `healthy`, and `instance.healthy` |
   | *Checking it answers* | `answers` | the sandbox instance serving and healthy, and its output read (`getInstanceOutput`, **sandbox only**, FE-24) |

6. **Our own check before paying for a build** (`build/imports.ts`), after the commits:
   - every relative `require`/`import` in the app's code resolves to a file in the tree;
   - every bare one is a Node built-in or a dependency in `package.json`.
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
   - The round gives it the platform's own words: `getBuildLog`'s tail (200 lines) and `Build.error`; or the
     incident's `logTail`, `exitReason` and `failedCheck`, plus `getInstanceOutput`.
   - It answers `{ note, sentence }`. The `note` is the step's note (*"A piece it depends on was missing"*); the
     `sentence` is the one line in the conversation.
   - The lead is then given the raw words **and** the explanation, and fixes it.
   - The raw words go behind *"The exact words, for whoever you ask for help"*.
9. **Stop conditions, each tested** (Vercel's `stopWhen`; OpenAI's `maxTurns`):
   - **moves:** at most 40 moves per step. Then *needs you*: *"This is taking longer than it should."*
   - **tries:** Decision 7.
   - **the session's cap:** LiteLLM's `429 budget_exceeded`. `getAgentBudget` then says whether the month has room:
     room means the checkpoint, none means the month is spent.
   - **the session's clock:** we ask for 240 minutes, never past the token's expiry. An expired key is the same
     checkpoint, since a new session is new money.
   - ***Stop*:** checked before every move and after every platform call.
   - Every stop saves the run.
10. **A run's state is saved** (OpenAI's resumable run state), in three new tables. **Keys and tokens are never
    columns** (F2 Decision 1).
    - `runs`: the conversation, the round, the step, the tries, the status, the agent sessions' ids (never their
      keys), the model, and the last move.
    - `trace`: every model call (agent, model named, usage), every move (its kind and its guard's verdict), and
      every platform call (operation, code). **Never a prompt's text, and never a file's content.**
    - `questions`: each question asked, its default, and its answer. **A secret's answer is never stored:** it goes
      straight to `secret:write` (sandbox only) and is dropped.
11. **The round starts by itself, on our server.**
    - When the plan's commit lands (F2's `agreeing` done), our server starts round 1 at once: the plan screen
      already said *"Say yes and this happens: we build it on your draft address, and you watch."*
    - A page closed right after *Yes* still gets its build.
    - *Rejected:* the page pressing a hidden start, which would lose the build of a page closed in that second.
12. **The conversation's states gain `building` and `built`.** `paused` means a question the work cannot pass.
    - `failed` stays unused: F3 sets it nowhere. Every screen's fallback for a state it does not draw now shows its
      words **with a reference** (`useReported`). That meets F2's deferred Minor.
    - The `conversations` table's `check` is rebuilt by a migration (`pragma user_version` 1 → 2), because SQLite
      cannot alter a `check`.
13. **Staff inside the app** (Rich's B), which the CWL specialist builds:
    - `config/staff.json` holds `{ puids: [<the instructor's>], emails: [<named by the instructor>] }`.
    - The instructor's PUID comes from `listMembers` with the conversation's token: the member whose `userId` is the
      conversation's person. It never comes from the session (FE-2).
    - **A named email must appear in the person's own words**: their description, a message, or an answer. A guard
      refuses an email the lead or the specialist invented, which is where injected text would put one.
    - Adding someone later is a change: F4's moment 8.
14. **The cost line:**
    - The month is `getAgentBudget`. This conversation's figure is the sum of `spentUsd` over its sessions
      (`listAgentSessions`, by the ids in `runs`).
    - Spend lands a few seconds after a call, so it is re-read after each model call, at most every 5 seconds.
    - An unknown `spentUsd` (null) shows the month's figure alone.
15. **The project's event stream is our server's, one per conversation while a round runs** (Task 5):
    - replayed events are ignored by `id`;
    - a reconnect re-reads the build and the instance (FE-7: the replay is only 50);
    - a refused stream (`4403`) pauses the round for a token;
    - it closes when the round ends.
16. **After the round: `built`.** The round folds into the conversation as one line. The message box says
    *"Asking for a change arrives next."* A change is F4's moment 8, as F2 said of building.
17. **Deploy has its own deadline:** `DEPLOY_TIMEOUT_MS = 120_000`. `deploy` is synchronous for up to about 90 seconds;
    every other call keeps F1's 15 seconds.

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
packages/ui/src/   LiveSteps.tsx (+ line, detail)  Disclosure.tsx  (+ tests; parity holds without them)   Task 10
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

- [ ] **M1: the contract, and the capable model's structured answers.**
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
- [ ] **M2: the mock's answers**, measured with `pnpm mock`, to:
  - every operation in M1's list;
  - the event stream's scripted frames: does it send `build.*` and `instance.*`?

  Record the bodies. The mock answers the document's examples (FE-27), so Task 12's mock half asserts what we sent,
  and failures are proven by fakes.
- [ ] **M3: the platform's event stream from a server** (after 9b's CLOSED).
  - Can the contract's `subscribe()` run in Node with a Bearer token, against `http://127.0.0.1:7100`?
  - Record the frames on connect (the replay), then `manifest.stream.ready`.
  - Record the close code when the token is revoked.
  - If `subscribe()` cannot run on a server, use Node 24's `WebSocket` with a `headers` option, as F2's proxy test
    does.
- [ ] **M4: one round by hand on the real platform** (after 9b's CLOSED; the test user, at Rich's word).
  - On a project made from the fixture blueprint's skeleton, run `startBuild` on `main`'s commit and time it.
  - Then `createRelease`, then `deploy` to the sandbox. Time it, and record the `Instance`.
  - Then `listInstances` and `getInstanceOutput`.
  - Then commit a deliberate break (`require('./missing')`), build, deploy, and record `build.failed`'s
    `machineDetail` and `getBuildLog`'s tail, or the incident.
  - **These times set the words' *"A few minutes"*** and Decision 17's deadline.
- [ ] **M5: the two frameworks' current documentation** (OpenAI's Agents SDK for JavaScript; Vercel's AI SDK).
  - Record, for each idea *Decided by Rich* takes, the name and meaning it has there: `Agent`, `tool`, agents as
    tools, `RunContext`, `maxTurns` / `stopWhen`, `prepareStep`, guardrails and their tripwire, interruptions and
    `RunState`, tracing spans.
  - Name ours to match where it reads well. Record anything that changes Task 2's interfaces.
  - **No dependency.**
- [ ] **M6: what the CWL specialist builds on.** Read the blueprint's skeleton and the proof-app starter
  (`blueprints/node-ts-mongo/`):
  - `auth/ubcshib.js` and `auth/attributes.js`: what `bridge(profile)` and `puid(profile)` give, and the attribute
    name of the email (`mail`);
  - the language: JavaScript or TypeScript;
  - where a staff check would sit in the routes;
  - `manifest.yaml`'s `auth` block;
  - whether the reference bundle has an `InverseSurface` and a disclosure component (Task 10).
- [ ] **Close:** the dated entry. **Correct Tasks 2–12 to what M1–M6 found before sitting 2.** Commit the plan file
  only.

---

## Task 2: The runtime: agents, moves, the runner, the trace

**Files:** `server/src/runtime/{agent.ts,tool.ts,run.ts,trace.ts,runtime.test.ts}`,
`server/src/store/{schema.sql,migrate.ts,runs.ts}` (the `runs` and `trace` tables only; `questions` is Task 8's).

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
  check?: Check<Out>                              // after parsing; a reason makes the model client try again
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
/** The union the model answers: z.discriminatedUnion('kind', tools.map(t => t.input.extend({ kind: z.literal(t.kind) }))). */
export function movesOf(tools: ToolDef<never, never>[]): z.ZodType<{ kind: string } & Record<string, unknown>>

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
export function storeTrace(store: Store): Trace
```

- [ ] **Step 1: The tests, failing first** (`runtime.test.ts`, a scripted model, fake tools that count what they
  did):
  - **one move per turn:** a script `[read, commit, done]` runs the three tools in order and answers `done`, with
    its line;
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
  new `check`, Decision 12) goes in here, with its own test in `store/db.test.ts`: a version-1 file with a
  conversation opens as version 2, with the conversation intact.
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
export interface Answered { model: string | null; usage: { in: number; out: number } | null }
export function openAiCompatible(options: {
  baseUrl: string; key: string; model: string; fetch?: typeof fetch; timeoutMs?: number
  /** Each 2xx answer's own `model` (9b names its fallback there) and `usage`, for the trace. Never shown. */
  onAnswer?: (answered: Answered) => void
}): Model
/** Decision 4: the most capable model the session lists. */
export function modelFor(listed: string[]): string | undefined   // 'default-chat-large' ?? 'default-chat' ?? undefined
```

- [ ] **Step 1: Tests, failing first:**
  - `onAnswer` receives `{ model: 'openai/gpt-6-luna', usage: { in: 812, out: 96 } }` from a fake gateway's answer
    whose `model` and `usage` (`prompt_tokens`, `completion_tokens`) say so;
  - a missing `usage` is `null`, never zero;
  - `onAnswer` is not called for a refusal;
  - `modelFor(['default-chat', 'default-chat-large'])` is `default-chat-large`, `modelFor(['default-chat'])` is
    `default-chat`, and `modelFor([])` is `undefined`, which the round says as `MODEL_NOT_AVAILABLE`.
- [ ] **Step 2: Run, red. Step 3: Implement. Step 4: Green, and F2's model tests unchanged.**
- [ ] **Step 5: Commit** `feat(server): the model client records which model answered, and its usage; the most
  capable model a session lists`.

## Task 4: The platform calls F3 needs

**Files:** `server/src/platform/{source.ts,builds.ts,releases.ts,instances.ts,members.ts,agent-sessions.ts,refusal.ts,authoring.ts}`,
`server/src/platform/platform.test.ts`.

**Interfaces** (paths and field names corrected to M1's record before this task starts):

```ts
// refusal.ts
export const DEPLOY_TIMEOUT_MS = 120_000                      // Decision 17
/** A commit refused with facts the LEAD may read (never the person): SPEC_INVALID's details, a secret's path and line. */
export class CommitRefused extends PlatformRefusal {
  constructor(code: string, status: number | null, readonly details: { path: string; code: string; hint: string | null }[])
}

// source.ts
export interface Source {
  tree(token: string, projectId: string): Promise<{ commitSha: string; paths: { path: string; size: number; binary: boolean }[]; truncated: boolean }>
  file(token: string, projectId: string, path: string, ref: string): Promise<{ content: string } | { unreadable: 'too-large' | 'not-text' | 'not-a-file' }>
  /** The dry run, then the commit: each its own Idempotency-Key. SOURCE_CONFLICT is thrown for the round to count. */
  commit(token: string, projectId: string, body: { baseCommit: string; message: string; changes: Change[] }):
    Promise<{ commitSha: string; changed: { path: string; status: 'added' | 'modified' | 'deleted' }[]; specWarnings: string[] }>
}
export type Change = { op: 'write'; path: string; content: string } | { op: 'delete'; path: string }

// builds.ts
export type Build = { id: string; commitSha: string; status: 'running' | 'succeeded' | 'failed'; error: string | null }
export interface Builds {
  start(token: string, projectId: string, commitSha: string): Promise<Build>     // always names the commit
  get(token: string, buildId: string): Promise<Build>
  log(token: string, buildId: string, tail: number): Promise<string[]>           // getBuildLog's lines, as text
}

// releases.ts
export interface Releases {
  create(token: string, projectId: string, buildId: string, summary: string): Promise<{ id: string }>   // summary ≤ 500
  sandbox(token: string, projectId: string): Promise<{ environmentId: string; hostname: string }>
  deploy(token: string, environmentId: string, releaseId: string): Promise<Instance>   // DEPLOY_TIMEOUT_MS; a failed deploy is a 200
}
export type Instance = { id: string; releaseId: string; state: 'provisioning' | 'starting' | 'healthy' | 'failed' | 'destroying' | 'gone' }

// instances.ts
export interface Instances {
  list(token: string, environmentId: string): Promise<(Instance & { serving: boolean })[]>
  output(token: string, instanceId: string, lines: number): Promise<{ lines: string[]; failure: string | null } | { unavailable: true }>
  incidents(token: string, environmentId: string): Promise<{ exitReason: string | null; logTail: string[]; failedCheck: string | null }[]>
}

// members.ts
export interface Members { instructor(token: string, projectId: string, personId: string): Promise<{ puid: string; email: string } | undefined> }

// agent-sessions.ts (extended)
start(token, projectId, name, options: { durationMinutes: number }): Promise<{ sessionId; key; baseUrl; models; expiresAt; capUsd: number }>
list(token: string, projectId: string): Promise<{ id: string; spentUsd: number | null }[]>
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
    a staging id is refused before any request is sent;
  - `instructor` answers the member whose `userId` is the person, with their `puid` and `email`; another member
    never;
  - `start` sends `durationMinutes: 240`, and `list` reads `spentUsd`, keeping `null` as `null`;
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
    refused: () => void                            // 4403/4404: the round pauses for a token
  }): Watch
}
export function platformStream(origin: string, open?: (url: string, token: string) => WebSocketLike): ProjectStream
```

- [ ] **Step 1: Tests, failing first**, with a fake WebSocket server (`node:http` plus the upgrade, as F2's proxy
  test does):
  - **each event once:** a replay of 50 events that overlaps what was seen delivers only the new ones;
  - **a drop reconnects:** close codes `1001`, `1011` and `1013` reconnect after a growing wait (200 ms, 400 ms,
    800 ms…, capped), and call `reconnected` each time;
  - **`4403` stops:** no reconnect, and `refused` is called once;
  - **`close()`** stops everything, and no timer is left (Vitest's fake timers show none);
  - **the Bearer token is sent, and no `Origin`** (the platform's rule for a server);
  - **Review Focus 5:** a build whose `build.succeeded` fell outside the replay. `reconnected` fires, and Task 8's
    round test drives the re-read.
- [ ] **Step 2: Red. Step 3: Implement** with what M3 chose (the contract's `subscribe()`, or Node's `WebSocket`).
  **Step 4: Green; controls:** dedupe off; no reconnect on `1011`; a reconnect on `4403`. Each red, then restored.
- [ ] **Step 5: Commit** `feat(server): the project's event stream on our server — each event once, reconnected on
  a drop, refused on 4403`.

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
    pack's rule;
  - **`package.json` whose `dependencies` or `devDependencies` gain or change a package** → refused (FE-32). Its
    reason tells the lead to say plainly what cannot be added. Changing its `scripts` is allowed;
  - text matching the platform's secret shapes (`mft_…`, `sk-…`, a PEM block) → refused before the platform's own
    scan sees it;
  - `words`: *"Writing the page students post on."* passes; *"Deploying the container"*, *"Running npm ci"* and
    *"It works"* are refused, using F1's machinery list plus *it works*;
  - `staff`: an email in the person's description passes; one nobody wrote is refused;
  - `importsHold`: `require('./routes/posts')` with `routes/posts.js` in the tree holds; `require('marked')` absent
    from `package.json` is `{ path, missing: 'marked' }`; `require('node:crypto')` holds.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** each guard removed in turn → its case red, then
  restored.
- [ ] **Step 5: Commit** `feat(server): the lead's guards — the app's files only, no Dockerfile, no new dependency,
  no secret, plain words, only staff the person named; imports that hold`.

## Task 7: The three agents, and the lead's moves

**Files:** `server/src/agents/{lead.ts,cwl.ts,explaining.ts,building.test.ts}`, `server/src/build/moves.ts`,
`server/src/api/progress.ts` (`BuildStep`).

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
  - **`explaining`** turns a build log whose tail says `Cannot find module 'marked'` into a `note` and a
    `sentence`, and neither holds a path, a module name or a code (C3);
  - **the CWL specialist's answer** writes `config/staff.json` with exactly the instructor's PUID and the brief's
    emails, and its checks refuse an answer that writes any other staff.
- [ ] **Step 2: Red. Step 3: Implement.** The prompts live beside their schemas, as F2's agents do.
  **Step 4: Green. Step 5: Commit** `feat(server): the lead, the CWL specialist and the explaining agent; the lead's
  five moves`.

## Task 8: The round of work

**Files:** `server/src/build/{round.ts,round.test.ts}`, `server/src/store/runs.ts` (+ `questions`),
`server/src/api/progress.ts`, `server/src/api/work.ts` (step keys).

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
  builds: Builds; releases: Releases; instances: Instances; members: Members; stream: ProjectStream;
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
    answer goes to `secret:write` for the sandbox only, and F2's dump of every table afterwards holds no trace of
    it**;
  - **FE-32:** a lead whose commit is guarded for a dependency, and which then answers `done`, leaves
    `needs: cannot`, and the rest built;
  - **a restart (Review Focus 3):** `interruptedOnBoot` marks a working run `interrupted`. `carryOn` with a new
    token re-reads the build it had started (`getBuild`): a `succeeded` build goes on to `draft`, never building
    that commit again;
  - **the stream reconnected** during `build`: the round re-reads the build, and ticks `build` from what it reads
    (Review Focus 5);
  - **the token refused** (`4403`) → `needs: token`, and `carryOn` with a new token resumes;
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

**Files:** `server/src/api/{build.ts,build.test.ts,events.ts,plan.ts}`, `server/src/app.ts`, `server/src/main.ts`.

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
  - `/stop` twice is `202` both times, and one session is ended;
  - `main.ts` calls `rounds.interruptedOnBoot()` before listening.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; control:** `/stop` without the Origin check → red.
- [ ] **Step 5: Commit** `feat(server): our building routes — carry on, a message, an answer, stop; the round
  starts when the plan is committed`.

## Task 10: What the design system lacks for moment 6

**Files:** `ui/src/{LiveSteps.tsx,Disclosure.tsx,index.ts,components.css,LiveSteps.test.tsx,Disclosure.test.tsx}`.
M6 records whether the reference bundle has an `InverseSurface` and a disclosure. If it does, **port it** (with parity
cases) instead of writing one.

**Interfaces:**

```tsx
// LiveSteps: ours, not the reference's (parity holds without them)
export interface Step { text: string; note?: string; state?: 'done' | 'now' | 'next' | 'halted'
  /** Under the `now` step: what we are doing now. aria-live polite. */ line?: string
  /** A finished step's disclosure: what changed. */ detail?: ReactNode }
// Disclosure: a native <details>, styled; its body can be machine text (InverseSurface) on purpose
export function Disclosure(props: { summary: string; children: ReactNode; machine?: boolean }): JSX.Element
```

- [ ] **Step 1: Tests, failing first:**
  - `line` renders under the `now` step only, in an `aria-live="polite"` element;
  - `detail` renders inside the finished step;
  - `Disclosure` is a `<details>`, closed by default, and its `summary` is a real focusable element;
  - `machine` gives the body the inverse surface's class;
  - **parity:** without `line` and `detail`, `LiveSteps`' markup is byte for byte the reference's.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green. Step 5: Commit** `feat(ui): LiveSteps' line and detail, and a
  Disclosure — ours; parity holds without them`.

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
  - *"A few minutes. You can leave: it keeps going, and this page shows where it got to when you come back."* (the
    minutes come from M4);
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
  entries say what each call named (Task 2):
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
  - **the deliberate break** (Rich's word): after the plan's commit and before the build, commit
    `require('./missing')` into the app with a token the headless page mints. Watch the lead read the log, fix it,
    and build again: *"Building it (second try)"*;
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

*Nothing yet. Each sitting adds a dated entry here: its measurements, its rulings, its negative controls, and its
gates.*
