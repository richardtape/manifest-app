# F2 — Describing It: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Read [`../ORIENTATION.md`](../ORIENTATION.md) first. F1 must be executed before this plan starts.**

**Goal:** A faculty member describes what they need in their own words, and answers at most a few follow-up
questions. They choose one of the names we suggest, say who it is for, and has it made. They then read and correct
a plan of what we will build. **When they say yes, the plan is committed into their app as `docs/plan.md`.**
Walk-through moments 3, 4 and 5, which hand over to F3's building.

**Architecture:**
- **Our server gains three things:**
  - **storage**: conversations and plans, never credentials;
  - **its own API under `/api/*`**, guarded by the person (FE-2) and by `Origin`, with one Server-Sent Events
    stream per conversation for progress;
  - **a model client that only ever asks for structured output.**
- **Three intake agents** (understanding, naming, blueprint) run on the platform's intake model (FE-1). **The
  plan agent** runs on the person's agent session (the enablement plan's sitting 7).
- **The browser does everything that needs the person's session**: checking an address, reading the blueprints,
  creating the project, minting tokens, starting the intake. It hands our server only what our server needs.
- **Each platform dependency not built yet sits behind an adapter**, with an honest *not built* implementation
  and a scripted one for the mock. *Amended by sitting 1:* both have landed, so there is no *not built*
  implementation (Decision 7).

**Tech Stack:** F1's, plus `zod` **3.25.76** (the platform's version, used through `zod/v4` for
`z.toJSONSchema`, as the platform's approval summary does), and `node:sqlite`, which Task 1 confirmed on Node
24.12.0 (SQLite 3.50.4). *Amended by sitting 1:* it is loaded with `createRequire`, because Vitest 2.1.9 cannot
import it (Task 2).

**Spec:**
- [`../walkthrough.md`](../walkthrough.md): moments 3, 4 and 5; D1, D3, D5, D6;
- [`../agents.md`](../agents.md): the intake agents and the lead, and rules 2, 3 and 5;
- [`../api-findings.md`](../api-findings.md): FE-1, FE-2, FE-10, FE-16;
- the enablement plan's Decisions 20–25, for agent sessions: manifest's
  `docs/superpowers/plans/2026-09-27-front-end-enablement.md`;
- `docs/api/agents.md` and `authoring.md` in manifest, for the dry run and the commit.

---

## How this plan is executed: sittings, one per session

| Sitting | Tasks | Delivers | Status |
|---|---|---|---|
| 1 | 1 | **The measurements**: what the platform has landed since F1; structured output through the local model; storage. **Alone, and first** | **done 2026-09-27.** No Decision breaks. Intake and agent sessions have both landed, and Tasks 2–10 are amended to the contract. Three proposed sentences wait on Rich |
| 2 | 2, 3 | Storage and our API: conversations, the person, `Origin`, the progress stream | **done 2026-09-27.** Storage, the guard, conversations and support references; the progress stream, reopened by the page when the browser gives up. 213 tests |
| 3 | 4, 5 | The model client; the three intake agents, tested against a scripted model | **done 2026-09-27.** A client that takes only structured answers; the three agents, with checks after parsing ruled on from M3; `/intake`, `/names` and `/blueprint`, with the intake carried in the state frame. 300 tests |
| 4 | 6, 7 | The intake adapter; the *Describe* and *Name it* screens and their components | |
| 5 | 8, 9 | Making the project and handing over its tokens; the plan, corrected and agreed, committed as `docs/plan.md` | |
| 6 | 10 | **The acceptance**: against the mock with a scripted model; against the real platform where sittings 7 and 10 have landed. **Alone, and last** | |

**Every sitting ends as F1's do:**
1. the four gates, `pnpm test` twice;
2. a dated entry in *What executing this plan found*;
3. this table;
4. ORIENTATION's *Where things stand*, and the roadmap.

## Decided by Rich (2026-09-27): build them, do not re-open them

- **The project is born after the person has described it, chosen or edited a suggested name, and answered the
  two audience questions** (walk-through D1).
- **Understanding the description, suggesting names and choosing a blueprint are a platform cost, on one model
  for everyone, set as a platform option** (FE-1, approved in principle).
- **An agent chooses the blueprint and any starter** (walk-through D3).
- **The follow-up questions are at most three per round, and at most two rounds; skipped ones become *Things we
  assumed*** (moment 3).
- **The plan's voice is *we*** (D5). **The agreed plan is committed into the app as `docs/plan.md`** (D6).
- **Our server may replay the session cookie to `getMe`, and for nothing else** (FE-2). It follows that our
  server calls no other operation with the person's session: whatever needs the person, the browser does.
- **Every problem a person is shown carries a support reference they can quote** (Rich, after sitting 1:
  *"if the member of faculty gets in touch with support, they will copy and paste the error and it will at least
  have an identifier so we can see what the actual issue is"*). Decision 11 says how.
- **A limit is said plainly: whose allowance is used up, and when it resets** (Rich, the same day). The words are
  in Tasks 7 and 9.

## Decisions this plan makes, and why

1. **Our server stores no credential at rest.**
   - A conversation's token, and an intake or agent key, live **in memory only**, for the conversation's work.
   - If the server restarts, the work pauses. The next time the person opens the conversation, their browser
     mints a new token (moment 6 already does this when a token lapses).
   - *Rejected:* encrypting tokens at rest, which is a key to manage, a file to protect, and a credential in two
     places. F6's watch token will need to survive restarts, and it decides this again with its own reasons.
   - *Changing course* is one table and a key file.
2. **Storage is a single SQLite file**, in a git-ignored directory. It holds `persons` (id and display name, from
   `getMe`), `conversations`, `messages`, `plans` (versioned), and `intake` state.
   - `node:sqlite` if Task 1's measurement holds on Node 24.12; else `better-sqlite3`, fetched once.
     *Amended by sitting 1:* it holds (M4), including a process killed mid-transaction. Vitest 2.1.9 cannot
     `import` it, so `store/db.ts` loads it with `createRequire(import.meta.url)('node:sqlite')`.
     `better-sqlite3` is rejected: a native build, for the same thing.
   - *Rejected:* the platform's Postgres, which belongs to the platform.
   - One module, `server/src/store/`, is the only reader of the database.
3. **Our API is ours alone, under `/api/*`, and every request is judged twice**:
   - **who**: `whoIs`, F1's FE-2 reader. No person is `401`.
   - **from where**: every mutation's `Origin` must equal our own origin.
     - `http://127.0.0.1:7105` in mock mode; `https://app.manifest.internal` in edge mode.
     - Otherwise `403 { error: { code: 'ORIGIN_REFUSED' } }`.
   - **Why the second:** `SameSite=Lax` sends the session on a same-SITE post, and every student app is
     same-site (`<slug>.staging.manifest.internal` beside `app.manifest.internal`). This is exactly the platform's
     reason (spec §20).
   - A conversation belongs to the person who started it. Another person is `404`, never `403`, as the platform's
     stranger is. Collaborators seeing each other's conversations is F6's.
4. **Progress reaches the page by Server-Sent Events**:
   - one stream per conversation, `GET /api/conversations/:id/events`;
   - it replays the conversation's state on connect, then each change.
   - *Amended by sitting 1* (M5): nothing buffers it, through our assembly or the edge. But **through the edge,
     a restart of our server closes the page's `EventSource` for good**: its retry meets the edge's `502`, and a
     browser never retries a non-`200`. So the page reopens a stream that has closed, and our server never ends
     a stream it means to keep, since an ended stream makes the browser reconnect every 3 seconds.
   - *Rejected:* polling, which the platform's own rule refuses (D23.2) and F3's live steps cannot live with; a
     WebSocket, which is two-way where only one way is needed.
5. **The model is asked only for structured output.**
   - `complete(schema, messages)` sends `response_format: { type: 'json_schema' }`, built by
     `z.toJSONSchema(schema)`, and parses the answer with the same zod schema.
   - An answer that does not parse is retried **once**, then the call fails with `MODEL_ANSWER_INVALID`.
   - **No code anywhere reads intent out of free text** (`agents.md` rule 3; the platform's D5-plan Decision 22).
6. **The model is an interface with three implementations**:
   - `OpenAiCompatible` (a key and a `baseUrl`, for the platform's LiteLLM);
   - `Scripted` (fixed answers keyed by agent and round, for tests and for mock mode);
   - `NotAvailable` (it throws `MODEL_NOT_AVAILABLE`, and the screen says the honest thing).
7. **Each platform operation not built yet is an adapter, chosen by what the contract has**:
   - **`IntakeSource`**, FE-1. If `openapi.json` names an intake operation, `PlatformIntake` calls it. Otherwise
     `NotBuiltIntake` answers `{ unavailable: 'not-built' }`, and moment 3 goes straight to moment 4 with no
     suggestions, as the walk-through says.
   - **`AgentSessions`**, sitting 7: `startAgentSession`, `getAgentBudget`, `endAgentSession`. The contract names
     them once sitting 7 lands. Until then `NotBuiltAgentSessions` makes the plan screen say *"Writing plans
     arrives soon. Nothing was lost."*
   - Mock mode uses `Scripted` for all three, whatever the contract says, because the mock is stateless and has
     no model.
   - *Amended by sitting 1* (M1): **both have landed**, so this rule chooses the platform's adapters, and the
     *not built* ones would have no caller. They are not written. **The contract's refusals take their place**,
     each worded (Tasks 7 and 9). Mock mode still uses `Scripted`, because the mock answers the document's
     examples (M2).
8. **The browser checks addresses; the server never does.** `checkSlug` needs a credential, and our server's
   only use of the person's is `getMe` (FE-2). So the naming agent proposes names and slugs, the browser checks
   each with `checkSlug`, and only available ones are shown. If fewer than two survive, the browser asks our
   server for another round.
9. **The plan's first commit is small and deliberate**: `docs/plan.md` only.
   - It goes through `createCommit` with `dryRun: true`, then for real, from the conversation's token, with
     `baseCommit` the tree's `commitSha`.
   - It is the first write through the authoring API, so it proves F3's path on a harmless file.
   - A `409 SOURCE_CONFLICT` re-reads the tree and retries once.
10. **Components ported in this plan**, each with parity cases, as F1 did: `FormField`, `Choice`, `LiveSteps`.
    **The description box has no system component**: a `<textarea>` styled with the `mf-field__input` class,
    which is recorded rather than invented.
11. **A support reference on every problem** (Rich's direction, above; added after sitting 1).
    - **What it is:** `XXXX-XXXX`, eight upper-case hex digits from `crypto.getRandomValues`. It is opaque, so it
      shows no machinery (C3).
    - **What the person sees**, under the problem's own words: *"If you contact support, quote 7F3A-9C21."*,
      with a **[Copy]** button.
      - Every refusal we show carries one, and so does F1's trouble notice.
      - A state is not a problem, and has none: signed out, *Not live yet*, *Answering*.
    - **Where it is made and kept:**
      - **Our server's own problems** (a `refusal` frame, or an error our API answers): the server makes the
        reference. It writes one row to `problems` and one JSON line to its output: the reference, the code,
        when, the person, the conversation, and where it happened.
      - **What the browser meets at the platform** (a start refused, a read that failed): the browser makes the
        reference, shows it at once, and reports it to `POST /api/problems` without waiting. A report that fails
        is lost, and the notice is unchanged.
      - **Nothing else is kept.** Never a platform message (C3: it can carry machinery), and never a credential:
        the no-credential test dumps `problems` too.
    - **The platform's half is FE-30.** It has no request identifier, and it logs only its `500`s. When it answers
      one, the report carries it, so support can follow a reference into the platform's log.
    - *Rejected:* showing the platform's code, which is machinery and is not findable in any log. *Rejected:* a
      reference for our server's problems only, because most of moments 3 and 4's refusals are met by the
      browser.
    - *Changing course* is one table and one route.

## Global Constraints

- Everything in F1's *Global Constraints*.
- **Our server never calls the platform with the person's session except `GET /v1/me`.** A test enforces it
  (Task 2).
- **Nothing is persisted that is a credential**: no `mft_` token and no `sk-` key, in the database or in any log.
  A test enforces it (Task 2).
- **Every model answer shown or acted on is structured output** (Decision 5).
- **The words are the walk-through's**, in `words.ts`, and F1's machinery-words test covers every new screen.
- **The intake shows no money** (it is the platform's cost). The plan step shows nothing about money either;
  F3's allowance line starts with building.
  - *Amended after sitting 1:* except the allowance's amount when it is used up. That is Rich's wording of the
    limit (Task 9).
- **Every problem shown carries a support reference** (Decision 11), and each screen's tests assert it.
- **A limit says whose it is and when it resets**, in the person's own time zone (Rich, after sitting 1).

## Review Focus

1. **A cross-site post to our API.** A student app on `*.manifest.internal` posts to `app.manifest.internal/api/…`
   carrying the person's cookie.
   - It is refused `403 ORIGIN_REFUSED`, and nothing changes.
   - **Pinned in Task 2.**
2. **The model answers badly**: not JSON, the wrong shape, or empty.
   - Retried once, then *"We couldn't read that just now. Your words are kept. Try again, or name it
     yourself."* The person's words are never lost.
   - **Pinned in Tasks 4 and 5.**
3. **Every suggested address is taken or reserved.**
   - Another round is asked for once. Then the *"Something else"* card is offered alone, with its field focused.
     Never an empty list.
   - **Pinned in Task 7.**
4. **The person double-clicks *Make it*, or retries after a timeout.**
   - One `Idempotency-Key` per press, reused on the retry: one project, one pair of tokens.
   - A create that landed and a mint that did not says *"Reading responses is made, but we couldn't start work
     on it. Nothing is lost."* with **[Start building]**, which mints again.
   - **Pinned in Task 8.**
5. **Our server restarts in the middle of intake or of a plan being written.**
   - The conversation is in the database; its key was in memory.
   - The page reconnects its stream, reads the stored state, and offers **[Carry on]**, which starts a new intake
     or agent session. Never a stuck working state.
   - *Amended by sitting 1* (M5): **in edge mode the browser does not reconnect by itself.** The edge answers
     `502` while we restart, and `EventSource` closes for good. The page's own reopen is what reconnects it
     (Task 3), and only a test that closes the stream can show it: the mock never goes through the edge.
   - **Pinned in Tasks 3 and 9.**

---

## File Structure

```
packages/server/src/
  store/schema.sql  store/db.ts  store/conversations.ts  store/db.test.ts    Decision 2 — the ONLY database reader
  api/guard.ts      api/guard.test.ts                                        who + Origin (Decision 3)
  api/conversations.ts  api/conversations.test.ts                            /api/conversations…
  api/events.ts     api/events.test.ts                                       SSE (Decision 4)
  api/progress.ts                                                            Progress + Conversation TYPES, exported as
                                                                             `@manifest-app/server/progress`; web imports them `import type` only
  model/client.ts   model/client.test.ts                                     complete(schema, messages) (Decisions 5–6)
  model/scripted.ts                                                          test and mock-mode answers
  agents/understanding.ts  agents/naming.ts  agents/blueprint.ts  agents/plan.ts   one schema and one prompt each
  agents/agents.test.ts
  platform/intake.ts     platform/agent-sessions.ts     platform/authoring.ts   adapters (Decision 7); authoring = getTree, createCommit
  platform/adapters.test.ts
packages/ui/src/   FormField.tsx  Choice.tsx  LiveSteps.tsx   (+ parity cases)
packages/web/src/
  platform/api.ts                        + checkSlug, listBlueprints, createProject, mintToken, (intake start when FE-1 lands)
  ours/api.ts                            the ONE caller of our /api/* (boundary test extended)
  screens/describe/describe.tsx          moment 3
  screens/name-it/name-it.tsx  name-it/model.ts  name-it/model.test.ts    moment 4
  screens/plan/plan.tsx                  moment 5
```

---

## Task 1: Measure what this plan rests on (sitting 1, alone)

Throwaway code in the scratchpad. Only this plan's findings are committed.

- [x] **M1: the contract today.** Re-read `openapi.json`; record the commit and the operation count. Record each
  of these as *landed, with its exact shape*, or *not yet*:
  - FE-1's intake operation (`grep -i intake`);
  - `startAgentSession`, `listAgentSessions`, `endAgentSession`, `getAgentBudget`, and the three `AGENT_*`
    codes;
  - `AgentSession.spentUsd` (FE-23);
  - `Project.name` and `CreateProjectRequest.name` (sitting 5);
  - `MintTokenRequest.capabilities`' enum: does it name `agent:session` and `output:read`?

  **Every adapter in this plan is written against what M1 records.** Where the plan's names differ, the contract
  wins, and this plan is corrected in the same commit.
- [x] **M2: the mock's answers** to `createProject`, `mintToken`, `checkSlug` (for `mock-app`, `edge` and
  `Bad Name`), `listBlueprints`, `getTree`, and `createCommit` with `dryRun`. Record the bodies. They are the
  fixtures the screens are built against (the mock is stateless: RUNBOOK).
- [x] **M3: structured output through the local model**, only if Ollama already answers on `127.0.0.1:11434`. Do
  not start it, and do not start the control plane.
  - Ask `qwen3.5:4b` for the understanding schema (Task 5) with Ollama's `format` set to its JSON Schema, five
    times, on the walk-through's example description.
  - Record how many parse, and how long each took.
  - **This is the evidence for the model decision Rich made** (a capable option is to be added). It is not a
    gate.
- [x] **M4: `node:sqlite`** on 24.12: a file database, a transaction, a restart, a read. Record the warning text,
  and whether `--disable-warning=ExperimentalWarning` silences exactly that and nothing else.
- [x] **M5: Server-Sent Events through M4-of-F1's assembly**: that `text/event-stream` flows through Vite's
  middleware or the edge without buffering, measured at `127.0.0.1:7105`. The edge's `stream_close_delay` is for
  WebSockets; record what an SSE stream does across a Caddy reload if sitting 6 has landed.
- [x] **Close:** the dated entry. **If M1 shows sitting 7 or FE-1 has landed differently than this plan assumes,
  correct Tasks 6–9 before sitting 2.** Commit the plan file only.

---

## Task 2: Storage, the guard, and conversations

**Files:** `server/src/store/{schema.sql,db.ts,conversations.ts,db.test.ts}`,
`server/src/api/{guard.ts,guard.test.ts,conversations.ts,conversations.test.ts}`.

**Interfaces:**

```ts
// store/conversations.ts
export type ConversationState =
  | 'describing' | 'questions' | 'naming' | 'making' | 'planning' | 'plan-ready' | 'agreed' | 'paused' | 'failed'
export interface Conversation {
  id: string                 // crypto.randomUUID()
  personId: string           // Me.id
  projectId: string | null   // null until moment 4 makes the project
  title: string              // "First build" for the first; F3 titles later ones
  state: ConversationState
  description: string        // the person's own words, verbatim
  createdAt: string
  updatedAt: string
}
export interface Store {
  createConversation(personId: string, description: string): Conversation
  getConversation(id: string, personId: string): Conversation | undefined     // another person's is undefined
  setState(id: string, state: ConversationState, patch?: Partial<Pick<Conversation, 'projectId' | 'title'>>): Conversation
  addMessage(conversationId: string, from: 'person' | 'we', body: unknown): void   // body: our structured JSON
  listMessages(conversationId: string): { from: 'person' | 'we'; body: unknown; at: string }[]
  savePlan(conversationId: string, plan: Plan): number   // returns its version, 1, 2, …
  latestPlan(conversationId: string): { version: number; plan: Plan } | undefined
}

// api/guard.ts
export type Guarded = { person: Person }
/** 401 UNAUTHENTICATED without a person; 403 ORIGIN_REFUSED for a mutation whose Origin is not ours. */
export function guard(config: Config): (request: FastifyRequest, reply: FastifyReply) => Promise<Guarded | undefined>
```

- [ ] **Step 1: The tests, failing first.**
  - **`db.test.ts`:**
    - a conversation round-trips;
    - another person's `getConversation` is `undefined`;
    - plans version 1, 2, 3;
    - **no column anywhere holds a string matching `/mft_|sk-/`** after a full intake-to-plan run with scripted
      tokens `mft_test_x` and `sk-test-y`: dump every table and assert.
  - **`guard.test.ts`**, with Fastify `inject`:
    - no cookie is `401 UNAUTHENTICATED`;
    - a `POST` with `Origin: https://evil.staging.manifest.internal` and a good cookie is `403 ORIGIN_REFUSED`,
      **and the handler never ran** (a counter stays 0) — **Review Focus 1**;
    - a `POST` with no `Origin` is refused too, because browsers send one on every POST;
    - a `GET` from anywhere with a good cookie passes (CORS, not us, stops cross-origin reads, and our reads carry
      no side effects).
  - **`conversations.test.ts`:**
    - `POST /api/conversations { description }` is `201`, a conversation in `describing`;
    - `GET /api/conversations/:id` is `200` for its person and `404` for another;
    - **the platform-call control**: a fake control plane records every request our server makes during the
      whole test file, and **the only path it ever sees with a `Cookie` header is `/v1/me`**.
- [ ] **Step 2:** fail. **Step 3:** implement. `schema.sql` is applied at start, idempotently (`create table if not
  exists`). The database file is `packages/server/.data/app.sqlite`, and `.data/` is git-ignored.
  - *Amended by sitting 1* (M4):
    - `db.ts` loads `node:sqlite` as `createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite')`,
      with a comment naming M4. Under Vitest 2.1.9 a static or dynamic `import` fails with *"Failed to load url
      sqlite"*, even with `server.deps.external`.
    - WAL mode (`pragma journal_mode = wal`) leaves `-wal` and `-shm` files beside the database, and `.data/` covers
      them.
    - SQLite's `ExperimentalWarning` is left alone, one line per process. `--disable-warning=ExperimentalWarning`
      is not used: it silences every experimental warning, not just this one.
    - A duplicate key throws `ERR_SQLITE_ERROR` with `errcode` 1555.
- [ ] **Step 4:** pass. **Negative controls**, each seen red and restored:
  - drop the `Origin` check;
  - let `getConversation` ignore `personId`;
  - store a scripted token in `messages`.
- [ ] *Amended after sitting 1* (Decision 11): **the server half of support references.**
  - **Files:** `server/src/api/{problems.ts,problems.test.ts}`; `schema.sql` gains `problems`.
  - **Interfaces:**

    ```ts
    // store
    export interface Problem {
      reference: string                 // 'XXXX-XXXX'
      code: string                      // ours or the platform's, e.g. INTAKE_DAILY_LIMIT_REACHED
      at: string
      where: 'server' | 'browser'
      operation: string | null          // the platform's operationId, or our route
      status: number | null
      personId: string | null           // a person who cannot sign in has problems too
      conversationId: string | null
      platformRequestId: string | null  // FE-30; null until the platform answers one
    }
    // Store gains: recordProblem(problem: Problem): void   — a duplicate reference is ignored
    // api/problems.ts
    export function newReference(): string
    /** The server's own problem: one row, one JSON line to the output; returns the reference. */
    export function problem(store: Store, fields: Omit<Problem, 'reference' | 'at' | 'where'>): string
    // POST /api/problems { reference, code, operation, status, at } → 204.
    // Origin-guarded like every mutation. The person is recorded when there is one, and a report from nobody is
    // still kept: guard(config, { person: 'optional' }).
    ```

  - **Tests, failing first:**
    - `newReference` matches `/^[0-9A-F]{4}-[0-9A-F]{4}$/`, and 1,000 of them are distinct;
    - a good report is `204`, with one row;
    - each of these is `400 PROBLEM_INVALID`, with no row: a bad reference; a code outside
      `/^[A-Z][A-Z0-9_]{0,63}$/`; **an unknown key, such as `message`**; a body over 1 KB;
    - a cross-origin report is `403 ORIGIN_REFUSED`, with no row;
    - `problem()` writes one row and one JSON line;
    - the no-credential dump includes `problems`.
  - **Negative control:** accept `message` in the body, and see the unknown-key case go red.
- [ ] **Step 5: The gates; commit** `feat(server): storage with no credential in it, our API guarded by person and
  Origin, conversations`.

---

## Task 3: The progress stream

**Files:** `server/src/api/{events.ts,events.test.ts}`, `web/src/ours/api.ts` (its first half).

**Interfaces:**

```ts
// server/src/api/progress.ts — our own contract, shared with web as `import type` from '@manifest-app/server/progress'
export type Progress =
  | { kind: 'state'; conversation: Conversation }                      // on connect, and on every change
  | { kind: 'step'; step: string; state: 'now' | 'done' | 'halted' }   // "Reading it", "Writing the plan", …
  | { kind: 'refusal'; code: string }                                  // our codes, e.g. MODEL_ANSWER_INVALID
  // Amended after sitting 1 (Decision 11): { kind: 'refusal'; code: string; reference: string }, the reference
  // made by problem(), so the row exists before the frame is sent
export function publish(conversationId: string, frame: Progress): void
// web
export function useConversation(id: string): { conversation?: Conversation; steps: ...; refusal?: string; status: 'connecting' | 'live' | 'closed' }
```

- [ ] **Step 1: Tests first.**
  - Connecting gets the `state` frame first.
  - A `publish` reaches two connected clients.
  - Another person's connection is `404`, with no frame.
  - **A reconnect after the server restarts gets the stored state**, not an empty stream (the Review Focus 5
    half that is the stream's).
  - *Amended by sitting 1* (M5):
    - **An `EventSource` that closes (`readyState` 2, as the edge's `502` leaves it) is reopened by the page**,
      after a short, growing wait, and `status` reads `connecting` meanwhile. It is never a terminal `closed`
      while the page is mounted. The test drives a fake `EventSource` to `CLOSED`.
    - The server never ends a stream it means to keep. It writes a comment line every 25 seconds, so an idle
      stream is never taken for a dead one. An idle stream through the edge was measured for 3 seconds only.
    - A reconnect carries `Last-Event-ID` (Chrome sent `12`). The server may ignore it, because the first frame
      is the whole state.
- [ ] **Step 2–4:** fail, implement, pass.
  - The web half mirrors the console's `useProjectStream` guard: a dead subscription never sets state on a live
    one under StrictMode.
  - **Negative control:** skip the on-connect `state` frame, and see the restart case go red.
  - **Negative control** *(amended by sitting 1)*: never reopen a closed stream, and see the `CLOSED` case go red.
  - *Amended after sitting 1* (Decision 11):
    - a `refusal` frame carries a `reference`, and its `problems` row exists when the frame arrives;
    - `web/src/ours/api.ts` gains `reportProblem(problem)`, which posts to `/api/problems`, never throws, and is
      never awaited by a screen.
- [ ] **Step 5: The gates; commit** `feat: one progress stream per conversation — state first, then each step`.

---

## Task 4: The model client

**Files:** `server/src/model/{client.ts,client.test.ts,scripted.ts}`.

**Interfaces:**

```ts
export interface Model {
  complete<T>(agent: string, schema: z.ZodType<T>, messages: { role: 'system' | 'user' | 'assistant'; content: string }[]): Promise<T>
}
export class ModelError extends Error { constructor(readonly code: 'MODEL_ANSWER_INVALID' | 'MODEL_NOT_AVAILABLE' | 'MODEL_BUDGET_EXHAUSTED' | 'MODEL_UNREACHABLE') }
export function openAiCompatible(options: { baseUrl: string; key: string; model: string; fetch?: typeof fetch }): Model
export function scripted(answers: Record<string, unknown[]>): Model   // answers[agent][callIndex]
export const notAvailable: Model
```

- [ ] **Step 1: Tests first**, against a fake OpenAI-compatible server (`node:http`) that records each request:
  - the request carries `response_format.type === 'json_schema'`, whose schema equals `z.toJSONSchema(schema)`;
  - a valid answer is parsed and typed;
  - **an invalid answer is retried exactly once, then `MODEL_ANSWER_INVALID`** (Review Focus 2);
  - **LiteLLM's `429` with `budget_exceeded` is `MODEL_BUDGET_EXHAUSTED`** (the enablement plan's Task 9
    measurement: a session cap and a spent month look alike there; the caller asks `getAgentBudget` which);
  - a refused connection is `MODEL_UNREACHABLE`;
  - **the key never appears in a thrown error's message** (spy on the error text, as F1's no-leak test).
  - *Amended by sitting 1* (M3):
    - `z.toJSONSchema`'s output is sent **as it is, `$schema` key included**, as `json_schema.schema` with
      `strict: true`. Five answers in five parsed that way, from Ollama's OpenAI-compatible endpoint directly.
      With no gateway there, M3 turned thinking off itself (`reasoning_effort: 'none'`). The platform measured
      the LiteLLM hop the same way (`releases/summary.ts`).
    - The request sends **no `reasoning_effort` and no `think`**. The gateway's `default-chat` sets `think:
      false`, which is load-bearing (manifest's `infra/litellm/config.yaml`), and only a request's own `think:
      true` beats it.
- [ ] **Step 2–4:** fail, implement, pass. **Negative control:** parse with a free-text fallback (`JSON.parse` of
  the first `{`…`}`), and see the invalid-answer case pass where it must fail. Restore it.
- [ ] **Step 5: The gates; commit** `feat(server): a model client that only accepts structured answers`.

---

## Task 5: The three intake agents

**Files:** `server/src/agents/{understanding.ts,naming.ts,blueprint.ts,agents.test.ts}`.

**Interfaces:** each exports its schema and one function over `Model`:

```ts
export const Understanding = z.object({
  questions: z.array(z.object({ id: z.string(), ask: z.string(), choices: z.array(z.string()).max(4).optional() })).max(3),
  restatement: z.string().max(400),                 // one sentence, second person: "A page where your students…"
  audience: z.object({
    scale: z.enum(['solo', 'class', 'large_course', 'public']),
    burst: z.enum(['steady', 'synchronised']),
    from: z.string().max(80),                       // the words it guessed from: "about 200 students"
  }),
  cannot: z.array(z.string().max(160)).max(3),      // "send marks to Canvas"
})
export function understand(model: Model, description: string, answers: Record<string, string>, round: 1 | 2): Promise<z.infer<typeof Understanding>>

export const Names = z.object({ names: z.array(z.object({ name: z.string().min(1).max(80), slug: z.string().regex(/^[a-z][a-z0-9-]{2,38}$/) })).min(3).max(5) })
export function suggestNames(model: Model, restatement: string, taken: string[]): Promise<z.infer<typeof Names>>

export const BlueprintChoice = z.object({ blueprint: z.string(), starter: z.string().nullable(), why: z.string().max(200) })
export function chooseBlueprint(model: Model, restatement: string, blueprints: Schemas['BlueprintList']): Promise<z.infer<typeof BlueprintChoice>>
```

- [ ] **Step 1: Tests first**, against `scripted`:
  - **Round 2 never asks more than the rule allows**: `understand(…, round: 2)` passes the schema's `max(3)`, and
    **a round 3 is refused by the caller** (a function argument typed `1 | 2`; a test that the conversation
    endpoint never calls round 3).
  - **`suggestNames` receives the slugs already found taken, and the prompt names them** (Review Focus 3's other
    half).
  - **`chooseBlueprint`'s answer must be one of the `blueprints` it was given.** An answer naming another is
    `MODEL_ANSWER_INVALID`, checked after parsing: a model cannot invent a blueprint.
  - **The prompts:** each is a constant in its file, and a test asserts each names *"we"* as the voice and forbids
    naming infrastructure (walk-through D5, C3). A prompt that says *"container"* fails the machinery-words test
    too.
  - *Amended by sitting 1* (M3), **for this sitting to rule on**: every one of `qwen3.5:4b`'s ten answers
    parsed, and several were still wrong in ways the schema allows:
    - `questions[].ask` of *"No"*, *"Yes"*, *"Integration"*;
    - restatements that invented *"anonymously"*;
    - `audience.from` empty, or not the words it guessed from.

    A check after parsing, like the platform's `checkExposure` (each `ask` a question, `from` found in the
    description), would make these `MODEL_ANSWER_INVALID`, retried once.
- [ ] **Step 2–4:** fail, implement, pass.
- [ ] **Step 5: Wire them to the conversation**, in `api/conversations.ts`:
  - `POST /api/conversations/:id/intake`: round 1, or round 2 with answers → `questions`, or straight to `naming`
    when none are asked.
  - `POST /api/conversations/:id/names`, with `{ taken: string[] }`.
  - `POST /api/conversations/:id/blueprint`, with `{ blueprints }` the browser read.
  - Each publishes its steps.
- [ ] **Step 6: The gates; commit** `feat(server): the intake agents — understanding, names, blueprint — each a
  schema and a prompt`.

---

## Task 6: The adapters for what the platform has not built yet

**Files:** `server/src/platform/{intake.ts,agent-sessions.ts,authoring.ts,adapters.test.ts}`; `web/src/platform/api.ts`
extended.

**Interfaces** (the names are the enablement plan's and FE-1's; **Task 1's M1 corrects them to the contract**):

```ts
// intake.ts — FE-1
export type IntakeKey = { key: string; baseUrl: string; model: string; expiresAt: string }
export interface IntakeSource { fromBrowser(handed: unknown): IntakeKey | { unavailable: 'not-built' | 'paused' } }
// The BROWSER starts the intake session (session-only, FE-1) and POSTs what it was answered to
// /api/conversations/:id/intake-key; the server validates its shape and keeps it in memory (Decision 1).

// agent-sessions.ts — sitting 7
export interface AgentSessions {
  budget(token: string): Promise<{ remainingUsd: number | null; resetsAt: string | null }>
  start(token: string, projectId: string, name: string): Promise<{ sessionId: string; key: string; baseUrl: string; models: string[] }>
  end(token: string, sessionId: string): Promise<void>
}
export function platformAgentSessions(origin: string): AgentSessions   // only if M1 found the operations
export const notBuiltAgentSessions: AgentSessions                      // every call throws MODEL_NOT_AVAILABLE
```

*Amended by sitting 1* (M1, the contract at manifest `e6a5f70`, last changed in `3cb6c82`). **Both have landed, and
these are the contract's names and shapes.** They replace the block above where the two differ.

```ts
// intake.ts — startIntakeSession / endIntakeSession: SESSION ONLY (a delegated token is TOKEN_CREDENTIAL_REFUSED).
// IntakeSessionStarted is { session: IntakeSession, key, baseUrl }; IntakeSession is { id, model, capUsd,
// expiresAt, state, endedAt, createdAt }. `model` is the ONE model (`default-chat` on the laptop, qwen3.5:4b);
// `expiresAt` is 30 minutes on, and never past the person's session.
export type IntakeKey = { key: string; baseUrl: string; model: string; expiresAt: string }
export function intakeKeyFrom(handed: unknown, config: Config): IntakeKey | { refused: 'INTAKE_KEY_INVALID' | 'MODEL_GATEWAY_REFUSED' }
// - The browser starts the intake session and POSTs { key, baseUrl, model, expiresAt } to
//   /api/conversations/:id/intake-key. The server checks the shape and keeps the key in memory (Decision 1)
//   until expiresAt. **A baseUrl other than Config's model gateway is refused**: our server never calls a URL a
//   browser chose. (The platform's default is http://127.0.0.1:7106/v1, MANIFEST_AGENT_LLM_URL.)
// - **Only the browser can end it** (endIntakeSession is session only, and FE-2 keeps our server out of the
//   session). It keeps session.id and ends the session when the person presses Make it. Otherwise it expires.
//   This is the walk-through's "the key is ended as soon as the answer arrives".
// - A key past expiresAt is dropped, and the conversation publishes { kind: 'refusal', code: 'INTAKE_KEY_EXPIRED' }.
//   The browser then starts another, which counts against the person's day.
// - The browser's start is refused with, and worded by Task 7:
//   INTAKE_DAILY_LIMIT_REACHED (409) · INTAKE_BUDGET_EXHAUSTED (409) · INTAKE_MODEL_UNAVAILABLE (503) ·
//   AI_CATALOGUE_DISABLED (503) · AI_BACKEND_UNAVAILABLE (503) · INTAKE_SESSION_ALREADY_STARTED (409, a replay).

// agent-sessions.ts — startAgentSession, listAgentSessions, endAgentSession, getAgentBudget: a session or a token.
export interface AgentSessions {
  // getAgentBudget → { monthlyUsd, spentUsd|null, remainingUsd|null, resetsAt|null, unavailable|null }.
  // remainingUsd is null when the gateway did not answer; resetsAt is null before the person's first session.
  budget(token: string): Promise<{ remainingUsd: number | null; resetsAt: string | null }>
  // POST /v1/projects/{projectId}/agent-sessions, { name (1–64), capUsd?, durationMinutes? (default 60, ≤ 480) },
  // one Idempotency-Key per start. The TOKEN needs `agent:session` (Task 8 mints it). The answer is
  // { session: AgentSession, key, baseUrl }, and the key is never shown again.
  start(token: string, projectId: string, name: string): Promise<{ sessionId: string; key: string; baseUrl: string; models: string[]; expiresAt: string }>
  // DELETE /v1/agent-sessions/{sessionId}, with an Idempotency-Key. A token ends only the sessions it started.
  // Ending twice answers the session as it is.
  end(token: string, sessionId: string): Promise<void>
}
export function platformAgentSessions(origin: string): AgentSessions
// No notBuiltAgentSessions (Decision 7, amended). start's refusals, which Task 9 words:
// AGENT_BUDGET_EXHAUSTED (409) · AGENT_NO_MODEL_FOR_CLASSIFICATION (409) · AI_CATALOGUE_DISABLED (503) ·
// AI_BACKEND_UNAVAILABLE (503) · AGENT_SESSION_ALREADY_STARTED (409, a replay: names the session only in
// `message`, which we never parse — FE-29).

// authoring.ts — built today
export interface Authoring {
  tree(token: string, projectId: string): Promise<{ commitSha: string; paths: string[] }>
  commitPlan(token: string, projectId: string, baseCommit: string, markdown: string): Promise<{ commitSha: string }>
}
```

- [ ] **Step 1: Tests first.**
  - `platformAgentSessions`, against the mock (sitting 10 teaches the mock these), or against a fake if M1 found
    the mock does not know them yet.
  - `start` sends `Idempotency-Key`, and a replay is answered `409 AGENT_SESSION_ALREADY_STARTED`, which the
    adapter surfaces as its code, never retries.
  - `commitPlan`:
    - dry-runs, then commits, with `baseCommit`;
    - on `409 SOURCE_CONFLICT` re-reads the tree and retries once;
    - on a second conflict throws `SOURCE_CONFLICT`;
    - sends exactly one change, `docs/plan.md`.
  - **`notBuiltAgentSessions` makes the plan step publish `{ kind: 'refusal', code: 'MODEL_NOT_AVAILABLE' }`**,
    which the screen words as *"Writing plans arrives soon. Nothing was lost."*
  - *Amended by sitting 1* (M1, M2):
    - **`platformAgentSessions` is tested against a fake**, never the mock. The mock knows all four operations,
      but it answers each from the document's example, whatever is asked: another project's id (`c58a9190-…`),
      another name (*"Build the bulletin board"*), and any id to `endAgentSession` (FE-27's addendum). A test that
      asserts the project or the name it sent cannot use it.
    - The `409 AGENT_SESSION_ALREADY_STARTED` case asserts that the adapter **never reads the session out of the
      message** (FE-29). The orphaned session's key was never received, so it spends nothing, and it expires at
      its `expiresAt`.
    - `end` sends an `Idempotency-Key`.
    - **The `notBuiltAgentSessions` case is struck** (Decision 7, amended). In its place: **`start`'s
      `AI_CATALOGUE_DISABLED` and `AGENT_NO_MODEL_FOR_CLASSIFICATION` make the plan step publish `{ kind:
      'refusal', code: 'MODEL_NOT_AVAILABLE' }`**, which Task 9 words.
    - **`intakeKeyFrom`:** a good handed key is kept; a wrong shape is `INTAKE_KEY_INVALID`; **a `baseUrl` other
      than Config's gateway is `MODEL_GATEWAY_REFUSED`, and nothing is called**. A key past its `expiresAt` is
      dropped, and `INTAKE_KEY_EXPIRED` is published.
    - `commitPlan` asserts what it **sent**, against a recording fake. The mock's `createCommit` answers
      `src/app.js` as the change, whatever is sent. It does answer `409 SOURCE_CONFLICT` to a stale
      `baseCommit`, and the conflict test may use that.
- [ ] **Step 2–4:** fail, implement, pass.
- [ ] **Step 5: The gates; commit** `feat(server): adapters for intake, agent sessions and the first commit —
  honest where the platform is not built yet`. *Amended by sitting 1:* `feat(server): adapters for intake, agent
  sessions and the first commit, on the contract as it landed`.

---

## Task 7: *Describe it* and *Name it* (moments 3 and 4, before the project exists)

**Files:** `ui/src/{FormField,Choice,LiveSteps}.tsx` with their parity cases; `web/src/ours/api.ts`;
`web/src/screens/describe/describe.tsx`; `web/src/screens/name-it/{name-it.tsx,model.ts,model.test.ts}`;
`words.ts`.

**Interfaces:**

```ts
// name-it/model.ts — pure
export function slugFor(name: string): string        // "Reading responses" → "reading-responses"; ≤ 39; starts with a letter
export type Offer = { name: string; slug: string; available: true } | { name: string; slug: string; available: false; reasons: string[] }
export function offerable(offers: Offer[]): Offer[]  // available ones only
export function needAnotherRound(offers: Offer[]): boolean   // fewer than 2 available (Review Focus 3)
```

- [ ] **Step 1: The ports**, with their parity cases taken from each component's `preview.html`, and failing
  first.
  - F1's harness; `FormField` with its `message` tones; `Choice` radio and checkbox, on and off; `LiveSteps` with
    `done`, `now`, `next` and `halted`.
  - Then implement them to parity.
- [ ] **Step 2: `model.test.ts`, failing first.**
  - `slugFor('Reading responses')` is `'reading-responses'`, and `slugFor('Week 3 — Reading!')` is
    `'week-3-reading'`.
  - `slugFor('3D models')` starts with a letter: `'app-3d-models'`.
  - `slugFor` is never longer than 39 characters.
  - `needAnotherRound` is true when fewer than 2 are available.
- [ ] **Step 3: The screens, tested with the platform and our API stubbed.**
  - ***Describe* (moment 3)**, with the walk-through's words.
    - The follow-up questions: at most three, each with its field or choices. **[Carry on]**, and *"Skip these —
      use your best guess"*.
    - **Round 2 appears only if our API answers one**, and never a round 3.
    - The intake's `unavailable: 'not-built'` goes straight to *Name it* with no suggestions.
    - `'paused'` says *"Describing new apps is paused for today. You can still name it yourself."*
    - *Amended by sitting 1* (M1). **The browser starts the intake** (`startIntakeSession`, in `platform/api.ts`,
      one `Idempotency-Key` per *Carry on*) and hands the key to our server (Task 6). There is no `not-built`
      any more. The start's refusals, read by code and never by message, each go on to *Name it* with no
      suggestions:

      | Code | Says |
      |---|---|
      | `INTAKE_DAILY_LIMIT_REACHED` | the walk-through's *"Describing new apps is paused for today. You can still name it yourself."* |
      | `INTAKE_BUDGET_EXHAUSTED`, `INTAKE_MODEL_UNAVAILABLE`, `AI_CATALOGUE_DISABLED` | *"Describing new apps is paused for now. You can still name it yourself."* **Proposed, for Rich:** "for today" would be untrue for a month's budget |
      | `AI_BACKEND_UNAVAILABLE`, or no answer in 15 seconds | the walk-through's *"We couldn't read that just now. Your words are kept. Try again, or name it yourself."* |
      | any other | F1's *"Something went wrong on our side…"*, with the code to the console |

      *Amended after sitting 1, at Rich's word:* limits are said plainly, whose they are and when they reset
      (in the person's own time zone). **This table replaces the one above.** Every row is followed by the
      reference line (Decision 11), and each refusal is reported with `reportProblem`.

      | Code | Says |
      |---|---|
      | `INTAKE_DAILY_LIMIT_REACHED` | *"You've described as many new apps today as one person can. That resets at midnight. You can still name it yourself."* **Rich's.** Midnight is Vancouver's, said in the person's own zone |
      | `INTAKE_BUDGET_EXHAUSTED` | *"Describing new apps is paused for everyone until 5pm on 30 September, when this month's allowance resets. You can still name it yourself."* **Rich's.** The time follows the contract's rule, *"the first of the month, 00:00 UTC"*, until FE-29 answers it as a field |
      | `INTAKE_MODEL_UNAVAILABLE`, `AI_CATALOGUE_DISABLED` | *"Describing new apps is waiting on a Manifest administrator. You can still name it yourself."* **Proposed, for Rich** |
      | `AI_BACKEND_UNAVAILABLE`, or no answer in 15 seconds | the walk-through's *"We couldn't read that just now. Your words are kept. Try again, or name it yourself."* |
      | any other | F1's *"Something went wrong on our side…"* |

    - *Amended after sitting 1* (Decision 11): **F1's `TroubleNotice` gains the reference line and [Copy]**, and
      reports what it shows. Its tests and the machinery-words test cover the line: a reference is never a
      machine word.

    - *Amended by sitting 1:* **the browser ends the intake session** (`endIntakeSession`) when *Make it* is
      pressed. On `INTAKE_KEY_EXPIRED` from our stream, it starts another, once, and hands it over.
  - ***Name it* (moment 4, before *Make it*):**
    - the restatement, with **[That's not it]**;
    - the suggestions **checked by the browser** (`checkSlug` for each, Decision 8), with only available ones as
      `Choice` cards, each showing its address in mono;
    - *"Something else"*;
    - *"Change the address"*, which checks live (debounced) and shows the platform's `reasons[].message` under
      the field, as it comes (`FormField`'s rule, and the walk-through's);
    - the two audience questions preselected from the intake's guess, with *"We guessed from 'about 200
      students'."*;
    - *In a sentence, why*;
    - the two footer notes (FE-15).
  - **Review Focus 3:** every suggestion is taken, so the browser asks for a round of names with
    `taken: [...]`. If that one is all taken too, *"Something else"* is offered alone, focused.
  - *Amended by sitting 1* (M2): **the mock's `checkSlug` holds one taken slug, `mock-app`, and answers every
    other slug available**, `edge` and `Bad Name` included. It never answers `SLUG_RESERVED` or `SLUG_INVALID`.
    So these cases are stubbed in the tests, and against the mock a person can only see *taken*, by typing
    `mock-app`.
- [ ] **Step 4:** pass. The machinery-words test covers both screens. **Negative control:** show an unavailable
  suggestion, and see the Review Focus 3 test go red.
- [ ] **Step 5: The gates; commit** `feat(web): describe it, and name it — suggestions checked before they are
  shown; the audience guessed and said so`.

---

## Task 8: *Make it*: the project, the tokens, and the handover (moment 4's end)

**Files:** `web/src/platform/api.ts` (`createProject`, `mintToken`);
`server/src/api/conversations.ts` (`POST /api/conversations/:id/project`); `web/src/screens/name-it/name-it.tsx`.

**Interfaces:**

```ts
// web, all in the person's session, in this order, one Idempotency-Key per press (reused on its retry):
// 1. createProject { slug, name, blueprint, starter?, audience: { scale, burst, justification? } }
// 2. mintToken for the conversation: name "Building — <title>", 7 days, capabilities:
//      project:read source:write secret:write build:create release:create release:deploy output:read agent:session
//    (agent:session only if M1 found it in MintTokenRequest's enum; recorded, never guessed)
// 3. POST /api/conversations/:id/project { projectId, token }   — ours; the server keeps the token in memory
// (F6 mints the Keeping-watch token; it is not minted here, because nothing in F2 would use it — a module with no caller.)
```

*Amended by sitting 1* (M1, M2):
- **`agent:session` and `output:read` are both in `MintTokenRequest.capabilities`' enum**, so the token carries
  all eight, unconditionally. Without `agent:session`, Task 9's `startAgentSession` is refused.
- `CreateProjectRequest.name` is optional (1–80), and `Project.name` is required. We always send the chosen name.
- **The mock answers its fixtures whatever is sent:**
  - `createProject` answers `mock-app` (`22222222-…`), whatever slug is asked;
  - `mintToken` answers its token *"the agent that builds this app"*, with three capabilities, and the secret
    `mft_77777777-7777-4777-8777-777777777777_ZmFrZS1zZWNyZXQtZm9yLXRoZS1tb2NrLW9ubHk`.

  So the tests assert what was **sent**, against the counting fake Step 2 already names. The mock's secret is
  a ready `mft_` value for Task 10's no-credential check.

- [ ] **Step 1: Tests first.**
  - **The server validates the handed token before trusting it**: `getProject(projectId)` with the token must
    answer that project (a token sees exactly one), else `400 TOKEN_NOT_FOR_PROJECT`, and the token is dropped.
  - **Review Focus 4:**
    - two presses of *Make it* send one `Idempotency-Key`;
    - a replayed `createProject` answers the same project;
    - a failed `mintToken` after a created project shows *"Reading responses is made, but we couldn't start work
      on it. Nothing is lost."* with **[Start building]**, which mints with a new key and hands over.
  - The three events on the platform's stream replay (`project.created`, `repository.seeded`, `spec.validated`)
    are shown as *Making it*'s three lines. The browser subscribes (`subscribe`) for those seconds only; F3 owns
    the stream after.
  - **The slug refusals at create time** (a race): `SLUG_TAKEN`, `SLUG_RESERVED` and `SLUG_INVALID` return the
    person to *Name it*, with the platform's message under the address field.
- [ ] **Step 2–4:** fail, implement, pass. **Negative control:** make a new `Idempotency-Key` per call, and see
  the double-press test create two projects (against a fake that counts). Restore it.
- [ ] **Step 5: The gates; commit** `feat: make it — the project in the person's session, the conversation's token
  handed to our server and checked`.

---

## Task 9: The plan, corrected, agreed, and committed (moment 5)

**Files:** `server/src/agents/plan.ts`; `server/src/api/conversations.ts` (`/plan`, `/plan/correction`,
`/plan/agree`); `web/src/screens/plan/plan.tsx`; `words.ts`.

**Interfaces:**

```ts
export const Plan = z.object({
  studentsSee: z.string().max(400), youSee: z.string().max(400), itKeeps: z.string().max(400),
  whoGetsIn: z.string().max(400), ai: z.string().max(300),
  assumed: z.array(z.string().max(160)).max(3),
  onlyYouKnow: z.array(z.object({ id: z.string(), ask: z.string().max(200) })).max(2),
  changed: z.array(z.enum(['studentsSee', 'youSee', 'itKeeps', 'whoGetsIn', 'ai'])).default([]),   // rows a correction touched
})
export function writePlan(model: Model, input: { description: string; answers: Record<string, string>; knowledgePack: string; tree: string[]; correction?: string; previous?: Plan }): Promise<z.infer<typeof Plan>>
export function planMarkdown(title: string, plan: z.infer<typeof Plan>, onlyYouKnowAnswers: Record<string, string>): string   // docs/plan.md
```

- [ ] **Step 1: Tests first.**
  - **The plan step**, all with the conversation's token:
    - `AgentSessions.budget`;
    - `start` (named after the conversation);
    - `getKnowledgePack` (the blueprint's), and `getTree`;
    - `writePlan` on the session's key;
    - `end` the session when the plan is written. **A session never outlives its step**, and a test asserts the
      `end` call after both success and failure.
  - **`whoGetsIn` never promises a course-restricted sign-in** (FE-20). A scripted plan that says *"only your
    class"* is caught by a check after parsing, and rewritten to the walk-through's honest sentence.
  - **The correction** passes `previous` and `correction`; the answer's `changed` rows are the ones the screen
    marks.
  - **Agree:** `planMarkdown` is deterministic, and snapshot-tested with the walk-through's example.
    `Authoring.commitPlan` is called once, and the conversation moves to `agreed`. F3 takes it from there, and
    until F3 exists the screen says *"Agreed. Building it arrives next."*
  - **The budget:**
    - `remainingUsd === 0` publishes *needs you*: *"Your AI allowance for this month is used up. It comes back
      on <resetsAt, in words>. Nothing is lost; this plan will be here."*;
    - a `null` budget starts anyway (the walk-through);
    - `MODEL_NOT_AVAILABLE` publishes *"Writing plans arrives soon. Nothing was lost."*
  - *Amended by sitting 1* (M1, M2):
    - **Which model.** `session.models` is what the app's data allows, and it can include an embedding model (the
      example lists `default-embed`). The plan agent calls the one model Config names (`planModel`, default
      `default-chat`), and only if it is in `models`. Otherwise it is `MODEL_NOT_AVAILABLE`, never another
      model. The session's `baseUrl` must be Config's gateway, as the intake's must.
    - The session is named after the conversation's title, at most 64 characters.
    - **`AGENT_BUDGET_EXHAUSTED` from `start` publishes the same *needs you* as `remainingUsd === 0`**, because
      a budget read can be seconds stale (*"Spend lands a few seconds after a call"*).
    - *Amended after sitting 1, at Rich's word:* that *needs you* says **whose allowance, and when it resets**:
      *"You've used your $10.00 AI allowance for this month. It resets at 5pm on 30 September. Nothing is lost;
      this plan will be here."* The amount is `monthlyUsd`, and the time is `resetsAt`, in the person's own zone.
      It replaces the words above, and every refusal here carries its reference (Decision 11).
    - **`MODEL_NOT_AVAILABLE` now means the platform gives this app no model**: `AI_CATALOGUE_DISABLED` or
      `AGENT_NO_MODEL_FOR_CLASSIFICATION`. *"Arrives soon"* would be untrue, since it has arrived. **Proposed,
      for Rich:** *"Writing plans is waiting on a Manifest administrator. Nothing is lost."*, waiting on someone.
    - `AI_BACKEND_UNAVAILABLE` from `start` is Task 4's `MODEL_UNREACHABLE`, with **[Carry on]**. **Proposed,
      for Rich:** *"We couldn't write the plan just now. Nothing is lost."*
    - The mock answers `startAgentSession` from its example (another project, another name) and
      `getAgentBudget` with `remainingUsd: 9.35`. So the tests use Task 6's fake, and mock mode uses `Scripted`.
  - **Review Focus 5:** a server restart during `planning` leaves the conversation in `planning` with no key in
    memory. On reconnect the page shows **[Carry on]**, and pressing it starts a new session. A test restarts the
    `buildServer` instance against the same database file.
- [ ] **Step 2–4:** fail, implement, pass.
  - The screen is the walk-through's moment 5: *"Here's what we'd build"*, five rows, *Things we assumed*, *Two
    things only you know* with answer fields, *Say yes and this happens*, **[Yes, build that]** and **[Not quite
    — let me correct it]**.
  - The waiting is working, with the two steps *"Reading how apps like this are built"* and *"Writing the
    plan"*, ticking on real completion.
- [ ] **Step 5: The gates; commit** `feat: the plan — written on the person's agent session, corrected, agreed,
  and committed as docs/plan.md`.

---

## Task 10: The acceptance (sitting 6, alone)

- [ ] **Step 1: `scripts/check-describing.sh`**, against the mock with the scripted model (mock mode). It drives
  our API as the browser would, asserting BODIES:
  1. start a conversation;
  2. intake round 1 answers three questions;
  3. round 2 answers none;
  4. names answer three; the blueprint answers `node-ts-mongo@1`;
  5. the project is made (the mock's fixture) and its token handed over;
  6. the plan is written; a correction marks one row; agreed;
  7. `createCommit`'s dry run, then its commit, were made with `docs/plan.md` as the only change;
  8. **a cross-origin `POST` is `403 ORIGIN_REFUSED`**;
  9. **the database holds no `mft_` and no `sk-`**.

  **Negative control:** remove the guard's `Origin` check, and see step 8 go red.

  *Amended by sitting 1* (M2):
  - **Step 7 asserts what our server sent**, as the conversation records it. The mock's `createCommit` answers
    `src/app.js` as the change, whatever is sent, so its answer cannot be the evidence.
  - Step 5's project is always `mock-app`, whatever name was chosen, and its token is the mock's fixture.
  - Step 9 has a real `mft_` value to look for: the mock's token secret. The mock's model keys are
    `sk-example-not-a-real-key`.

  *Amended after sitting 1* (Decision 11): **step 10: a refusal carries a reference, and `problems` holds its row**,
  with no `mft_`, no `sk-` and no platform message in it.
- [ ] **Step 2: The clicked half, Rich's**, against the mock:
  1. describe the walk-through's example;
  2. answer or skip the questions;
  3. pick a name and see its address;
  4. *Make it*;
  5. read the plan, correct one row, agree.

  Stage everything first and ask once.
- [ ] **Step 3, only where it has landed** (M1): against the real platform, with Rich's agreement to start it.
  - If sitting 7 has landed, the plan is written on a real agent session: the laptop's model, or the capable
    one if the platform has added it.
  - **Record what the model wrote, verbatim.** It is the first evidence of the model question.
  - *Amended by sitting 1* (M1): **sitting 7 and FE-1 have both landed**, so this step runs whole: the intake on
    the platform's intake key, and the plan on a real agent session. On the laptop both reach `default-chat`,
    which is `qwen3.5:4b` with thinking off, unless the platform has added the capable model. M3 has that
    model's first evidence.
- [ ] **Step 4: The close-out** for a plan executed: this plan, the roadmap (F2 executed, F3 next, to be written),
  ORIENTATION, and `api-findings.md`.

---

## What this plan does not build

- **Building the app**: moment 6 onward, F3. The agreed plan is the handover.
- **The *Keeping watch* token, the history, emails**: F6. Not minted here, because nothing would use it.
- **Money on screen**: F3's allowance line begins with building.
- **Collaborators seeing each other's conversations**: F6, with People.
- **Encrypting tokens at rest**: Decision 1 keeps them out of storage altogether. F6 revisits it for the watch
  token.
- **Toolkit specialists and domain helpers** (`agents.md`): F3 onward, and blocked in part on FE-19–FE-22.
- **Choosing among several blueprints for real**: the agent and its check exist, and there is one blueprint to
  choose.

## What executing this plan found

*Each sitting adds a dated entry: tasks, defects with the measurement that found each, negative controls (and any
that could not fail, and why), the gate numbers, and the machine's state at the close.*

### 2026-09-27 — Sitting 1 (Task 1): the measurements

**Against manifest `e6a5f70`.** The contract last changed in `3cb6c82` (18:44).
- The platform session began its sitting 8 during this sitting. It changed 20 files, all under
  `packages/control-plane`. Nothing under `packages/contract` or `packages/mock` changed.
- All code was throwaway, in the session's scratchpad, run by Node 24.12.0 on 20:12–20:25 PDT. Nothing was
  written inside manifest.

**Verdict: no Decision breaks.** What the platform built differs from what this plan assumed in detail, and each
difference is amended in place, marked *Amended by sitting 1*:
- Decision 2 (`createRequire`) and Task 2;
- Decision 4 (the page reopens a closed stream), Task 3 and Review Focus 5;
- Decision 7 (no *not built* adapters);
- Task 4 (the request's reasoning settings) and Task 5 (M3's answers, for sitting 3 to rule on);
- Tasks 6–9 (the contract's names and refusals);
- Task 10 (what the mock can prove).

| | Result | Decision |
|---|---|---|
| **M1** | **Intake and agent sessions have both landed**: six operations, seven codes, two events. `agent:session` and `output:read` can be minted. `pnpm typecheck` passes | 7: applied, and the *not built* adapters dropped |
| **M2** | The mock knows every operation. It answers the new ones from the document's examples, whatever is asked | Tasks 6, 8, 9 and 10 test against fakes |
| **M3** | `qwen3.5:4b`: **10 of 10 parse** on both paths, in 2.2–7.8 s. **What they say is weak** | 5 confirmed. Evidence for Rich's model decision |
| **M4** | `node:sqlite` holds, through a kill mid-transaction. **Vitest 2.1.9 cannot `import` it**, and `createRequire` can | 2 confirmed, with `createRequire` |
| **M5** | Nothing buffers, direct or through the edge. **Through the edge, a restart closes `EventSource` for good** | 4 confirmed, with the page's reopen |

**M1: the contract** (`node` scripts over `openapi.json`: `scratchpad/m1/{shape,schemas,codes,desc}.mjs`).
- OpenAPI 3.1.0, `info.version` 1.4.0, **63 operations**, 53 paths, 89 schemas.
- **FE-1, landed:**
  - `startIntakeSession`, `POST /v1/intake-sessions`, with no body and an `Idempotency-Key`. It answers `201
    IntakeSessionStarted { session: IntakeSession, key, baseUrl }`.
  - `endIntakeSession`, `DELETE /v1/intake-sessions/{id}`, with an `Idempotency-Key`.
  - **Both are session only.** A delegated token is `TOKEN_CREDENTIAL_REFUSED`, *"because intake belongs to no
    project"*. And *"Only the person who started it may end it"*.
  - `IntakeSession` is `{ id, model, capUsd, expiresAt, state: active|ended|expired, endedAt, createdAt }`.
    - `model` is one model, the platform's (`MANIFEST_INTAKE_MODEL`, default `default-chat`).
    - The key lasts 30 minutes by default, and never outlives the session.
- **Sitting 7's agent sessions, landed.** Each takes a session or a delegated token.
  - `startAgentSession`, `POST /v1/projects/{id}/agent-sessions`:
    - its body is `{ name (1–64), capUsd?, durationMinutes? (default 60, at most 480) }`;
    - it answers `201 { session: AgentSession, key, baseUrl }`;
    - **it asserts `agent:session` on the token** (`routes/agents.ts:234`).
  - `listAgentSessions` (`project:read`, at most 50, newest first). `endAgentSession`, with an
    `Idempotency-Key`. `getAgentBudget`, `{ monthlyUsd, spentUsd|null, remainingUsd|null, resetsAt|null,
    unavailable|null }`.
  - **`AgentSession.spentUsd` (FE-23)**, `number | null`, with `spentUnavailable`. It also has `models`, `capUsd`,
    `expiresAt`, `state`, `endReason` and `via { tokenId, tokenName } | null`.
- **The seven codes:**
  - `AGENT_BUDGET_EXHAUSTED`, `AGENT_NO_MODEL_FOR_CLASSIFICATION` and `AGENT_SESSION_ALREADY_STARTED`, all 409;
  - `INTAKE_BUDGET_EXHAUSTED` 409, `INTAKE_DAILY_LIMIT_REACHED` 409, `INTAKE_MODEL_UNAVAILABLE` 503 and
    `INTAKE_SESSION_ALREADY_STARTED` 409.
  - The operations also answer `AI_BACKEND_UNAVAILABLE` and `AI_CATALOGUE_DISABLED` (503).
- **Events:** `agent_session.started` and `agent_session.ended`, with `sessionId`, `models`, `capUsd`, `expiresAt`.
- **Sitting 5's names:** `Project.name` is required (1–80), and `CreateProjectRequest.name` is optional.
- **`MintTokenRequest.capabilities` names both `agent:session` and `output:read`.**
- `pnpm typecheck`: exit 0 against it.
- **Two things this plan did not expect:**
  - **Our server cannot end an intake session.** Ending it is session only, and FE-2 keeps our server out of the
    session. So the browser ends it (Tasks 6 and 7).
  - **A replayed start names the session only in `message`**, which the envelope says never to parse
    (`routes/agents.ts:221`). The envelope has no field for it, as it has `pendingAction` for
    `TOKEN_ACTION_PENDING`. **Filed as FE-29.**

**M2: the mock's answers** (`bash scratchpad/m2/m2.sh`, against `pnpm mock` on 7102, 20:16).

| Asked | Answered |
|---|---|
| `checkSlug` `mock-app` | `200 { available: false, reasons: [{ code: SLUG_TAKEN, message: "a project already has this name", hint: … }] }` |
| `checkSlug` `edge`, `Bad Name`, `reading-responses` | `200 { available: true }`, each. **Only `mock-app` is taken** (`server.ts:243-250`) |
| `listBlueprints` | `[{ ref: "node-ts-mongo@1", … }]` |
| `createProject` `reading-responses`, and its replay | `201`, **`mock-app` (`22222222-…`) both times** |
| `mintToken`, eight capabilities | `201`, its fixture: *"the agent that builds this app"*, three capabilities, secret `mft_77777777-…` |
| `getTree` | `200`, `commitSha c2ac2119…` |
| `createCommit` `dryRun`, then for real, `docs/plan.md` | `201`. **Both name `src/app.js`**, whatever is sent; `commitSha` `null`, then `c2ac2119…` |
| `createCommit`, a stale `baseCommit` | `409 SOURCE_CONFLICT`, the mock naming itself |
| `getKnowledgePack node-ts-mongo@1` | `200`, `files: [AGENTS.md, …]` |
| `startIntakeSession` | `201`, `model default-chat`, `capUsd 0.25`, key `sk-example-not-a-real-key`, `baseUrl http://127.0.0.1:7106/v1` |
| `startIntakeSession` with a delegated token only | **`201`** (the platform refuses a token) |
| `startAgentSession` for `mock-app`, `"Writing the plan"` | `201`, **project `c58a9190-…`, name *"Build the bulletin board"***: the document's example |
| `listAgentSessions`, `endAgentSession`, `endIntakeSession` (any id) | `200`, examples with other ids |
| `getAgentBudget` | `200 { monthlyUsd: 10, spentUsd: 0.65, remainingUsd: 9.35, resetsAt: 2026-10-01T00:00:00.000Z }` |

- These bodies are the fixtures the screens can be built against. **Anything that must show what was sent is
  tested against a fake.**
- Added to FE-26 (the token accepted) and FE-27 (the examples), not yet carried.

**M3: structured output through the local model.**
- Ollama 0.34.4 was already answering on 11434. The control plane was not started.
- `node scratchpad/m3/m3.mjs`, 20:17–20:18:
  - Task 5's `Understanding`, built by the platform's `zod` 3.25.76 (`zod/v4`, read from manifest's store);
  - on the walk-through's description with *"About 200 students"*;
  - thinking off, as the gateway's `default-chat` has it.

| Path | Parsed | Time (tokens out) |
|---|---|---|
| native `format: <schema>` | **5/5** | 7.8 s (3.3 s of it loading), 7.5, 6.1, 5.9, 5.3 (145–278) |
| `/v1/chat/completions`, `response_format: json_schema`, `$schema` kept | **5/5** | 2.2, 3.0, 2.4, 2.6, 6.0 (78–219) |

- **The shape is always right. What it says often is not:**
  - `questions` of *"No"*, *"Yes"*; *"Integration"*, *"Organization"*; *"synchronised"*, *"class"*;
  - a question about *"storage space"*;
  - restatements that invent *"anonymously"*, or say *"You have created"*;
  - the audience guesses unstable: scale `class` 8 times and `large_course` 2; burst `synchronised` 6 and
    `steady` 4;
  - `from` sometimes empty, or *"week's"*.
- Three answers asked no questions at all. **That is evidence for Rich's capable-model decision, not a gate.**
  Task 5 carries a proposed check after parsing.
- **Not measured:** the LiteLLM hop. It needs the gateway's master key, which is the platform's. The platform
  measured it the same way on 2026-09-25 (`releases/summary.ts`).

**M4: `node:sqlite`** (`bash scratchpad/m4/setup.sh`, 20:21).
- Node 24.12.0, SQLite 3.50.4, `journal_mode wal`.
- **A transaction commits, and one rolls back** on `UNIQUE constraint failed: conversations.id` (`ERR_SQLITE_ERROR`,
  `errcode` 1555, `errstr` *"constraint failed"*).
- **A second process reads what the first committed.**
- A third process was `SIGKILL`ed inside an open transaction. **A fourth reads exactly the committed rows**, and
  the in-flight one is gone. `-wal` and `-shm` files stay beside the database.
- **The warning, on every process:** `ExperimentalWarning: SQLite is an experimental feature and might change at
  any time`.
- **`--disable-warning=ExperimentalWarning`** (and the same in `NODE_OPTIONS`) **silences it, and every other
  `ExperimentalWarning` too**: a second one of ours vanished with it. A deprecation and a plain warning still
  show.
  - So it does **not** silence exactly that. SQLite's warning has no code to name.
  - A filter on `process.emitWarning`, set before the first load, silences exactly it and nothing else. It is on
    the shelf, not used.
- **Found beyond the plan's list: Vitest 2.1.9 cannot import `node:sqlite`.**
  - `vitest run` over one test (`scratchpad/m4/vt`):
    - a static `import` fails *"Failed to load url sqlite (resolved id: sqlite)"*;
    - a dynamic `import()` fails the same;
    - with `server.deps.external: [/sqlite/]` it fails *"Cannot find package 'sqlite'"*.
  - `createRequire(import.meta.url)('node:sqlite')` passes.
  - The cause is that `sqlite` is not in `builtinModules`: it exists only with the `node:` prefix.
  - Decision 2 stands with that one line (Task 2, amended). *Rejected:* `better-sqlite3`, a native build for the
    same thing.

**M5: Server-Sent Events.**
- **The assembly:** `packages/server`'s own `buildServer`, imported read-only, with Vite in middleware mode as
  `main.ts` has it. Two throwaway routes: `reply.hijack()` with raw writes, and a `PassThrough` handed to
  `reply.send`. Each sends 12 frames, 250 ms apart. Run with `tsx --tsconfig packages/server/tsconfig.json
  scratchpad/m5/serve.mts`.
- **`/api` never reaches Vite's middleware.** The factory's front door gives it to Fastify, so *"through Vite's
  middleware"* is not a path our stream takes.
- **Measured** (20:22–20:25). Lag is from sending to arrival:

| Where | Client | Result |
|---|---|---|
| `127.0.0.1` direct (port 17105, outside the platform's block) | Node `fetch` | both routes: 12 frames in **13 network chunks**, 250 ms apart, lag ≤ 2 ms, `chunked`, no encoding |
| `https://app.manifest.internal` (our assembly on 7105) | Node `fetch` (HTTP/1.1) | both: 13 chunks, lag ≤ 4 ms |
| the same | `curl --http2` | both: HTTP/2, lag ≤ 5 ms; the edge adds only its headers |
| the same | **headless Chrome, `EventSource`** (`scratchpad/m5/chrome.mjs`) | HTTP/2, lag ≤ 6 ms. **When the stream ended, Chrome reconnected 3.0 s later on its own, with `Last-Event-ID: 12`** |

- **Our server restarting mid-stream** (`scratchpad/m5/restart.mjs`). The assembly was killed after frame 4 and
  started again 5 s later, from a page with no Vite client in it:
  - **Through the edge:** an error with `readyState 0` (retrying). 3 s later the retry met the edge's `502`, and
    **`readyState 2`: it never tried again**, although our server was listening again about 3 s later.
  - **Direct at `127.0.0.1:7105`:** the refused connection was retried. It reopened at 7.2 s, and ran on.
  - This is the platform's `502` meeting the browser's rule that a non-`200` ends a stream. **Decision 4 stands,
    with the page reopening a closed stream** (Task 3, amended). Mock mode never goes through the edge, so it
    could never show this.
- **The edge's site** (read-only, `infra/caddy/Caddyfile:124-151`) has no `encode`, and `stream_close_delay 1h`
  on the proxy to 7105.
- **The Caddy reload was not measured.** Reloading the shared edge is the platform's.
  - From Caddy's documentation, as read and not verified, `stream_close_delay` holds open *upgraded* connections
    (WebSockets) across a reload, and an SSE response is not one.
  - Whatever a reload does to a stream, the restart above shows what follows a drop, and Task 3's reopen
    recovers it.
- **To measure, 7105 was ours for three minutes.** The `pnpm dev:mock` left running at F1's close was stopped
  and started again with `nohup pnpm dev:mock`. After that, `/api/me` answered `401`, `/` `200`, and
  `/auth/login` `302`.

**Proposed words, for Rich.** The walk-through has none for these, and each is in `words.ts` only once he agrees:
1. *"Describing new apps is paused for now. You can still name it yourself."*
   - For the platform's month spent, no intake model, or AI switched off.
   - The walk-through's *"paused for today"* is kept for the per-person day.
2. *"Writing plans is waiting on a Manifest administrator. Nothing is lost."*
   - For AI switched off, or no model approved for the app's data.
   - The plan's *"arrives soon"* is untrue now that it has arrived.
3. *"We couldn't write the plan just now. Nothing is lost."*, with **[Carry on]**.
   - For the gateway not answering.

**Negative controls.**
- M4's warning flag: a second `ExperimentalWarning` of ours vanished with SQLite's. That is how "exactly that"
  was shown false.
- M4's Vitest import: three ways red, one green.
- M5: the direct restart recovered where the edge's did not, which is the control for the edge's `502` being the
  cause.

**Could not fail:** nothing claimed rests on a check that could not fail. Two halves were not measured, each
with its reason above: the LiteLLM hop, and the Caddy reload.

**Gates, from the root.** No code changed in the repository, and the gates were run anyway:
- `pnpm test` twice: 141/141 each time;
- `pnpm lint` 0;
- `pnpm typecheck` 0, which is also M1's check against the contract;
- `pnpm format:check` clean.

**The machine at the close:**
- the mock on 7102 and our server on 7105 in mock mode, for Rich;
- the edge up, the gateway (7106) up, and the control plane stopped;
- Ollama as it was: M3 loaded `qwen3.5:4b`, and Ollama has since unloaded it;
- manifest's working tree changed only by the platform session.

**For sitting 2:** Tasks 2 and 3, as amended. Rich's answer on the three proposed sentences is needed by
sitting 4 (Task 7) and sitting 5 (Task 9), not before.

### 2026-09-27 — After sitting 1: support references, and limits said plainly (Rich)

**Rich, on reading sitting 1:**
- *"With the 'human language' error messages, I think we might need some way of having an identifier, so if the
  member of faculty gets in touch with support, they will copy and paste the error and it will at least have an
  identifier so we can see what the actual issue is."*
- *"If it's about budgets, I think we can be more explicit to the faculty member, we can tell them that their
  allocation is up, and when it resets."*

**Written into this plan:**
- **Decision 11**, a support reference on every problem, and its halves in Tasks 2, 3, 7 and 10;
- the limit words, **Rich's**, in Tasks 7 and 9. These supersede sitting 1's first proposal (*"paused for now"*).

**Still proposed, for Rich** (needed by sittings 4 and 5):
- *"Describing new apps is waiting on a Manifest administrator. You can still name it yourself."*
- *"Writing plans is waiting on a Manifest administrator. Nothing is lost."*
- *"We couldn't write the plan just now. Nothing is lost."*

**Checked before filing:**
- The platform has no request identifier, and logs only its `500`s (FE-30).
- Its limits' facts are in their messages only (FE-29, widened). **Both are for Rich to carry.**

**One constraint moved:** the plan step shows money once, in the allowance's amount when it is used up. That is
Rich's wording.

### 2026-09-27 — Sitting 2 (Tasks 2 and 3): storage, our API, and the progress stream

**Commits:**
- `f3c4c19`: storage with no credential in it, our API guarded by person and `Origin`, conversations, and support
  references;
- `889c6c4`: one progress stream per conversation;
- `0222447`: a comment corrected by measurement (below).

~~The contract and the mock were unchanged in manifest's working tree during the sitting.~~ *Corrected by
sitting 3:* the platform committed `ce96baa` (archive and restore) at 20:52, during this sitting. It changed
`openapi.json` (63 → 65 operations: `archiveProject`, `restoreProject`) and the mock's fixtures. It is additive:
this sitting's gates ran after it, and passed.

**Task 2: storage, the guard, conversations, and Decision 11's server half.**
- **`store/`:** one SQLite file, `packages/server/.data/app.sqlite`, git-ignored.
  - `node:sqlite` is loaded by `createRequire`, as M4 found it must be. WAL mode, foreign keys on.
  - Tables: `persons`, `conversations`, `messages`, versioned `plans`, and `problems`.
  - Its one reader is `openStore`.
- **`api/guard`:** `Origin` first, for every change, then *who* (FE-2).
  - A forged request never costs a question to the platform.
  - `{ person: 'optional' }` is for problem reports. It also passes when the platform cannot be reached, because
    the platform may be the problem.
- **`api/conversations`:** `POST` and `GET`. Another person's conversation is `404`, exactly as one that does not
  exist.
- **`api/problems`:** `newReference`, `problem()` (a row and one JSON line), and `POST /api/problems`.
  - Anything but `{ reference, code, operation, status, at }` is `400 PROBLEM_INVALID`: a `message`, a body
    over 1 KB, or anything that is not JSON.
  - A server reference that collides with one already recorded is drawn again, never lost.
- **`Config` gains `origin`:** `http://127.0.0.1:7105` in mock mode, `https://app.manifest.internal` in edge mode.
- **The no-credential run** goes through our API with a session, `Authorization: Bearer mft_test_x` and a
  `sk-test-y` header. A dump of every table holds none of them. Tasks 8 and 9 extend the run when a token is
  first handed over.
- **The FE-2 control:** the fake control plane shared by the whole conversations file saw a `Cookie` only on
  `/v1/me`, and never an `Authorization`.
- **Rulings** (in the ledger):
  - plans are `unknown` until Task 9;
  - `rememberPerson`;
  - only the tables used;
  - `Config.origin`;
  - `Origin` before *who*;
  - an optional person passes when the platform is down;
  - `buildServer`'s third argument;
  - the no-credential run's shape;
  - the column `place`.

**Task 3: the progress stream.**
- **Server:**
  - `GET /api/conversations/:id/events` sends the whole conversation first, then each published frame;
  - a hub per server, not the interface's module-level `publish`;
  - a comment line every 25 seconds;
  - never ended while the server runs, and ended in `preClose`, which Fastify's close would otherwise wait on
    for ever;
  - `publishRefusal` writes the problem's row, then sends the frame with its reference.
- **`api/progress.ts`**, our contract with the page:
  - it imports nothing, and owns `Conversation`;
  - web takes it as `import type` from `@manifest-app/server/progress`, a workspace devDependency. The lockfile
    gained three lines, and nothing was downloaded.
- **Web:**
  - `ours/api.ts` is the one caller of `/api/*`, and the boundary test now holds that.
  - `reportProblem` answers a reference at once, posts with `keepalive`, and cannot throw.
  - `useConversation`:
    - **reopens a stream the browser gave up on** (`CLOSED`), after 1, 2, 4 and 8 s, then every 15 s;
    - resets the wait once a frame arrives;
    - lets the browser retry by itself when it will (`CONNECTING`);
    - clears the steps on each connection's first frame, so a restart leaves nothing working;
    - guards every handler, as the console does.
  - Its `status` is `'connecting' | 'live'`: the interface's `'closed'` could never be observed (a ruling).
- **Two things found:**
  - **A `<StrictMode>` wrapper around `renderHook` ran the effect once**, measured with a probe. Testing Library's
    own `reactStrictMode: true` mounts, unmounts and mounts, as a page does. The StrictMode test uses the option.
  - **My comment said a request's `close` fires as soon as its body is read.** Measured on Node 24.12, it fires
    with the response's, at disconnect. The comment is corrected (`0222447`), and the code, which listens on the
    response, stands.
- **Live, on the running `dev:mock`:**
  - `POST /api/conversations` answered `201`, in `describing`;
  - a student app's `Origin` answered `403 ORIGIN_REFUSED`;
  - the stream answered `200 text/event-stream`, with the state frame first.

**Negative controls.** Each was red, then restored and green.

| Control | Red |
|---|---|
| the guard's `Origin` check dropped | 9: the guard's six, the optional person's, conversations' and problems' cross-origin cases |
| `getConversation` ignoring the person | 2: the store's and the API's |
| a route that keeps its request's headers in a message | the no-credential run (`mft_`, `sk-` and the session found) |
| a `message` accepted in a problem report | the unknown-key case |
| the on-connect `state` frame skipped | 6, **the restart case** among them |
| a refusal published before its row | the refusal's row, missing when the frame was sent |
| a closed stream never reopened | 3: the reopen, the cap, and the steps cleared on reconnect |
| the `live` guard removed | the StrictMode case |
| an `/api/` path outside `ours/api.ts` | the boundary |

**Could not fail:** nothing claimed rests on a check that could not fail.

**Gates, from the root:**
- `pnpm test` twice: 213/213 each time (`ui` 14, `web` 121, `server` 78);
- `pnpm lint` 0;
- `pnpm typecheck` 0;
- `pnpm format:check` clean;
- `check-slice` 7 passed (mock mode).

**The machine at the close:**
- the mock on 7102 and our server on 7105 in mock mode, for Rich;
- `packages/server/.data/app.sqlite` holding the two conversations made by the live checks;
- the control plane stopped;
- manifest's working tree touched only by the platform session.

**For sitting 3 (Tasks 4 and 5):**
- the model client, and the three intake agents against a scripted model;
- Task 4's request sends no reasoning settings (amended by sitting 1);
- Task 5 carries M3's evidence and a proposed check after parsing, to rule on;
- `zod` 3.25.76 arrives with Task 4, an install with the network allowed;
- publish refusals with `publishRefusal`, never `hub.publish` directly, so each carries its reference.

### 2026-09-27 — Sitting 3 (Tasks 4 and 5): the model client, and the three intake agents

**Commits:**
- `273fd92`: the model client;
- `d8a9f02`: the three intake agents, and their routes.

**The contract, against manifest `2ff30d0`:** 65 operations. Since sitting 2 it has gained archive and restore
(F6's; see sitting 2's correction), and our typecheck and all 300 tests pass against it.

**Task 4: a model client that only accepts structured answers.**
- `zod` 3.25.76 is added to the server, pinned exactly, from the store. Nothing was downloaded.
- **`complete(agent, schema, messages, check?)`:**
  - one schema is the request (`z.toJSONSchema` as it is, `$schema` kept, `strict: true`) and the check;
  - an optional check after parsing may refuse too;
  - either kind of failure is retried once, then `MODEL_ANSWER_INVALID`;
  - no reasoning setting of ours is sent.
- **LiteLLM's refusals, mapped as the platform measured 1.98.0** (`ai/errors.ts`):

  | The gateway answers | Our code |
  |---|---|
  | `429 budget_exceeded` | `MODEL_BUDGET_EXHAUSTED` |
  | `401` (a key that has ended) | `MODEL_KEY_REFUSED`, **new** |
  | `403`, and any other `4xx` | `MODEL_NOT_AVAILABLE` |
  | `5xx`, any other `429`, a refused connection, or 60 s of silence | `MODEL_UNREACHABLE` |

  An error carries a code and a status, never the key or the gateway's words.
- **`scripted`** runs the same path from fixed answers, and records each prompt. **`notAvailable`** always
  refuses.
- **Rulings** (in the ledger): `MODEL_KEY_REFUSED`; the mapping; `check`; the 60 s deadline; `scripted`'s rules.

**Task 5: the three intake agents, and their routes.**
- **The agents:**
  - `understand`: round 1 or 2, never 3, by type;
  - `suggestNames`: the addresses found taken are named in its prompt;
  - `chooseBlueprint`: one it was given, and a starter of its own.
  - Every schema field is required, and `choices` is nullable rather than optional, for strict gateways.
- **Checks after parsing, the plan's question for this sitting, ruled on from M3's real answers.** Each is
  retried once, like a bad parse:
  - a question is a question: it ends in `?`, with three words or more;
  - choices are two to four, and distinct;
  - the audience is guessed from the person's own words;
  - names and addresses are distinct, and none is taken.
  - **The restatement's meaning is not checked**: that would read intent out of free text (`agents.md` rule 3).
    So an invented *"anonymously"* still passes. Only a better model fixes that: evidence for Rich's decision.
- **The prompts** speak as *"we"*, forbid technical words, and pass F1's machinery list (imported from web: one
  list).
- **The routes** (`api/intake.ts`):
  - `POST /intake`: read, answers, or skip;
  - `POST /names`: two rounds at most, then `409 NAMES_EXHAUSTED`;
  - `POST /blueprint`.
  - Each answers `202`, works in the background, publishes a step (by its key: the page words it), then the
    whole state.
  - Or the step is halted, and a refusal is published with its reference, the conversation left where it was.
  - One piece of work at a time (`409 CONVERSATION_BUSY`), and each route only in its state
    (`409 CONVERSATION_STATE`).
- **The state frame now carries `intake`**, folded from the stored messages, so a reconnect or a restart
  rebuilds what moments 3 and 4 show. The page's hook keeps it. This changed Task 3's contract, as a ruling.
- **Found and fixed in my own code before commit:**
  - The busy check sat in an `async` function with nothing to await, so a second press could slip between the
    check and the claim. It is now synchronous.
  - A test of three simultaneous presses **could not fail** against the `async` version (three runs): each
    press's guard finishes its platform call at its own moment. It holds *one winner*, and says it cannot show
    the race.
- **Live, on the running `dev:mock`** (whose intake model is *not available* until Task 6):
  - `/intake` answered `202`;
  - the stream showed the step halted, then `MODEL_NOT_AVAILABLE` with reference `33ED-CD94`;
  - a skip moved the conversation to naming.

**Negative controls.** Each was red, then restored and green.

| Control | Red |
|---|---|
| a free-text JSON fallback (the first `{…}`) | the not-JSON case passed where it must fail |
| the gateway's words in a `401`'s error | the key-never-leaks case |
| *"container"* in a prompt | the prompts' case |
| the guess-from-their-words check removed | 2: an empty guess, and invented words |
| the invented-blueprint check removed | 1 |
| the taken-address check removed | 1 |
| the question check removed | 2: *"No"*, and *"Integration?"* |
| round 2's answers asking a round 3 | *never a round 3* |
| the busy check removed | the second press |
| the names cap removed | `NAMES_EXHAUSTED` |
| `round` typed as `number` | `typecheck`: an unused `@ts-expect-error` |

**Could not fail:** three presses at once through `inject`, as above.

**Gates, from the root:**
- `pnpm test` twice: 300/300 each time (`ui` 14, `web` 121, `server` 165);
- `pnpm lint` 0;
- `pnpm typecheck` 0;
- `pnpm format:check` clean;
- `check-slice` 7 passed.

**The machine at the close:**
- the mock on 7102 and our server on 7105 in mock mode, for Rich;
- the control plane stopped;
- manifest's working tree touched only by the platform session.

**For sitting 4 (Tasks 6 and 7):**
- **Task 6 gives `intakeModel` its key.** The browser starts the intake session and hands the key over. Mock
  mode gets a scripted model, so Rich can click moments 3 and 4 against the mock.
- `MODEL_KEY_REFUSED` is the gateway's own *"this key has ended"*. For an intake key, the browser starts
  another, as `INTAKE_KEY_EXPIRED` does.
- **Task 7 words the step keys** (`understanding`, `naming`, `blueprint`) in `words.ts`. Only *"Reading it"*
  is the walk-through's.
- The three proposed sentences are still Rich's to agree.
