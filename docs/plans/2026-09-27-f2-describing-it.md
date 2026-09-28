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
  and a scripted one for the mock.

**Tech Stack:** F1's, plus `zod` **3.25.76** (the platform's version, used through `zod/v4` for
`z.toJSONSchema`, as the platform's approval summary does), and the storage Task 1 confirms (`node:sqlite` is the
candidate).

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
| 1 | 1 | **The measurements**: what the platform has landed since F1; structured output through the local model; storage. **Alone, and first** | |
| 2 | 2, 3 | Storage and our API: conversations, the person, `Origin`, the progress stream | |
| 3 | 4, 5 | The model client; the three intake agents, tested against a scripted model | |
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
   - **Pinned in Task 9.**

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

- [ ] **M1: the contract today.** Re-read `openapi.json`; record the commit and the operation count. Record each
  of these as *landed, with its exact shape*, or *not yet*:
  - FE-1's intake operation (`grep -i intake`);
  - `startAgentSession`, `listAgentSessions`, `endAgentSession`, `getAgentBudget`, and the three `AGENT_*`
    codes;
  - `AgentSession.spentUsd` (FE-23);
  - `Project.name` and `CreateProjectRequest.name` (sitting 5);
  - `MintTokenRequest.capabilities`' enum: does it name `agent:session` and `output:read`?

  **Every adapter in this plan is written against what M1 records.** Where the plan's names differ, the contract
  wins, and this plan is corrected in the same commit.
- [ ] **M2: the mock's answers** to `createProject`, `mintToken`, `checkSlug` (for `mock-app`, `edge` and
  `Bad Name`), `listBlueprints`, `getTree`, and `createCommit` with `dryRun`. Record the bodies. They are the
  fixtures the screens are built against (the mock is stateless: RUNBOOK).
- [ ] **M3: structured output through the local model**, only if Ollama already answers on `127.0.0.1:11434`. Do
  not start it, and do not start the control plane.
  - Ask `qwen3.5:4b` for the understanding schema (Task 5) with Ollama's `format` set to its JSON Schema, five
    times, on the walk-through's example description.
  - Record how many parse, and how long each took.
  - **This is the evidence for the model decision Rich made** (a capable option is to be added). It is not a
    gate.
- [ ] **M4: `node:sqlite`** on 24.12: a file database, a transaction, a restart, a read. Record the warning text,
  and whether `--disable-warning=ExperimentalWarning` silences exactly that and nothing else.
- [ ] **M5: Server-Sent Events through M4-of-F1's assembly**: that `text/event-stream` flows through Vite's
  middleware or the edge without buffering, measured at `127.0.0.1:7105`. The edge's `stream_close_delay` is for
  WebSockets; record what an SSE stream does across a Caddy reload if sitting 6 has landed.
- [ ] **Close:** the dated entry. **If M1 shows sitting 7 or FE-1 has landed differently than this plan assumes,
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
- [ ] **Step 4:** pass. **Negative controls**, each seen red and restored:
  - drop the `Origin` check;
  - let `getConversation` ignore `personId`;
  - store a scripted token in `messages`.
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
- [ ] **Step 2–4:** fail, implement, pass.
  - The web half mirrors the console's `useProjectStream` guard: a dead subscription never sets state on a live
    one under StrictMode.
  - **Negative control:** skip the on-connect `state` frame, and see the restart case go red.
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
- [ ] **Step 2–4:** fail, implement, pass.
- [ ] **Step 5: The gates; commit** `feat(server): adapters for intake, agent sessions and the first commit —
  honest where the platform is not built yet`.

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

*Empty until sitting 1.*
