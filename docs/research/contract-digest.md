> *Research, 2026-09-27, the front-end's first session: a read-only pass over `manifest` (see its header for the commit). Kept here because a scratchpad is not durable. It is evidence, not a spec. Where it and `manifest` disagree, `manifest` wins.*

# Manifest public API — contract digest for the faculty front-end

*Read-only research, 2026-09-27. Source of truth: `packages/contract/openapi.json` **as committed at HEAD `186fa34`**, parsed in full with
node (every path, operation, schema, event type and error code — nothing sampled). Guides read: `docs/api/index.md`,
`getting-started.md`, `conventions.md`, `authentication.md`, `authoring.md`, `agents.md`, `events.md`, `launching.md`,
`secrets.md`, `journey.md`, `llms.txt`, and the generated `reference/operations.md`, `reference/errors.md`,
`reference/events.md`. Where the digest says who may call an operation, that was read from the route handlers
(`packages/control-plane/src/api/routes/*.ts`) and the role model (`packages/control-plane/src/projects/authz.ts`), because
the OpenAPI document states only the credential class, never the capability.*

---

## 1. Header

| Fact | Value |
|---|---|
| `git -C /Users/rich/Developer/manifest rev-parse --short HEAD` | **`186fa34`** (research began at `a2918af`; see the note below) |
| OpenAPI version | `3.1.0` |
| `info.version` (and `@manifest/contract` `package.json` `version`) | **`1.4.0`** (a test holds the two equal) |
| Server | `https://console.manifest.internal` ("The console and the API share this origin.") |
| Paths | 48 |
| **Operations** | **57** — 36 `GET`, 16 `POST`, 1 `PATCH`, 1 `PUT`, 3 `DELETE`; 21 mutations, every one requiring `Idempotency-Key` |
| Session-only operations (`security: [{session: []}]`) | 15 — `getMe`, `createProject`, `listTokens`, `mintToken`, `revokeToken`, `confirmPendingAction`, `rejectPendingAction`, `createApprovalPreview`, `getApprovalPreview`, `approveRelease`, `rejectRelease`, `recordIamRegistration`, `recordPrivacyAssessment`, `runRehearsal`, `listFleet` |
| **Event types** (`x-manifest-event-types` on `streamProjectEvents`, identical in order and set to the 38 `EventFrame` variants) | **38** |
| **Error codes** (`x-manifest-errors`, identical to the `ErrorCode` enum and its `x-enumDescriptions`) | **113** |
| Spec problem codes (`x-manifest-spec-errors` = `ManifestErrorCode` enum; appear inside `details[]`/`warnings[]`) | 25 |
| Component schemas | 82 |
| Unversioned endpoints (`x-manifest-unversioned`) | 8 (`/auth/*`, `/internal/registry/token`, `/webhooks/github`) |

> **HEAD MOVED DURING THIS RESEARCH.** It began at `a2918af` (56 operations, 37 event types, 113 codes, 81 schemas). A
> parallel session (the front-end enablement plan's sitting 5, Task 6) then committed `186fa34` — *"a project's name — set at
> creation, changed by updateProject (the first PATCH), published as project.renamed"* — adding `updateProject`, the schema
> `UpdateProjectRequest`, a `name` on `Project`/`CreatedProject`/`CreateProjectRequest`, and the event `project.renamed`. A
> field-by-field diff of the two documents found NOTHING else changed (no error code, tag, `info` or other operation).
> **This digest is patched to `186fa34`.** `info.version` did NOT move (still `1.4.0`) although an operation was added — see
> §8. The same session is still working (Task 7, people by CWL login, is next), so re-parse before relying on the counts.

---

## 2. Client conventions

### 2.1 One origin, no CORS

- Every `/v1/*` and `/auth/*` path is served by the control plane behind the edge (Caddy) at
  **`https://console.manifest.internal`**; the edge forwards everything else on that host to the reference console (7104).
  The API and its caller are meant to be **the same origin**.
- **The control plane sends no CORS headers at all** (no `Access-Control-*` anywhere in `packages/control-plane/src`). A
  browser page on any other origin cannot read an API answer, and the CSRF check (§2.4) refuses a session-bearing mutation
  whose `Origin` is not the console's.
- **Today the only accepted `Origin` is the console's** (`deps.config.sp.origin`). The faculty front-end's origin,
  **`app.manifest.internal`** (Rich, 2026-09-27), is **not built yet**: the front-end enablement plan's sitting 6 (Task 8)
  makes the platform accept a configured LIST of origins, gives the edge an `app.manifest.internal` site that forwards
  `/v1/*` and `/auth/*` to the control plane and everything else to `host.docker.internal:7105`, and registers a second
  SAML ACS for it. Until that lands, a browser front-end must be served from the console's origin or use a server-side
  proxy holding a delegated token (a token needs no `Origin`).
- On a laptop TLS is signed by the platform's own CA; a Node client needs
  `NODE_EXTRA_CA_CERTS=<manifest checkout>/infra/ca/manifest-root.crt` (else `fetch failed` / `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`).

### 2.2 Two credentials — exactly one per request

| | Browser session (a person) | Delegated token (an agent, script, CI, a server-side proxy) |
|---|---|---|
| How obtained | CWL sign-in: navigate the browser to `GET /auth/login?returnTo=<same-origin path>` → IdP → `POST /auth/saml/callback` → 302 to `returnTo` with the cookie set | A person mints it in their own session: `mintToken` (`POST /v1/projects/{projectId}/tokens`), for ONE project, a capability list, 1–365 days |
| What is sent | Cookie `manifest_session` (a browser sends it itself) | `Authorization: Bearer mft_<id>_<secret>`, **no cookie** |
| `Origin` | **Required on every session-bearing mutation and on the WebSocket upgrade** — must equal the console's origin (a browser sends it itself) | Not needed, and the generated client deliberately sends none |
| Lifetime | 12 h (`SESSION_TTL_MS`); a step-up does not extend it; not revocable before expiry (Phase 1) | Its `expiresAt`; `revokeToken` ends it at once |
| Rate limit | None, except `checkSlug` (60/min per person) | Per token, per minute (`Token.rateLimit`, default **600/min**, not settable at mint); past it every route is `429 RATE_LIMITED` with `Retry-After` |
| Platform role | Carried on the cookie (`admin` or `member`); a newly-made admin must sign in again | None, ever — admin-scoped reads refuse tokens |

- **Both at once** → `400 CREDENTIAL_AMBIGUOUS`, decided before either is read (a stale/invalid cookie beside a bearer still
  counts). **Neither, or an expired/revoked/unknown token, or an invalid cookie** → `401 UNAUTHENTICATED`.
- **Cookie flags** (`api/routes/auth.ts`): `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` when the origin is https,
  `Max-Age` 43200. A second cookie `manifest_login` (Path `/auth`, Max-Age 600, `SameSite=None` on https) binds a sign-in to
  the browser; a sign-in left at the IdP for more than 10 min loses its return path. `manifest_stepup` does the same for a
  step-up.
- **`returnTo`** must match `^/(?!/)[^\s\\]{0,511}$` (a same-origin path, never protocol-relative); anything else becomes `/`.
- **Sign-out**: `POST /auth/logout` (Origin-checked, NOT idempotency-keyed) answers **`200 { "redirectTo": "…" }`** — the
  IdP's single-logout URL (so CWL forgets the person too) or `/`. The client must navigate there; the reference console
  refuses to treat anything but a 200 with a same-origin path or `https://` URL as success.
- The **eight unversioned endpoints** (`x-manifest-unversioned`) are: `GET /auth/login`, `GET /auth/step-up`,
  `POST /auth/saml/callback` (the ACS; the only route exempt from the Origin check and from Idempotency-Key),
  `POST /auth/logout`, `GET /auth/logout` (the IdP's SLO redirect binding), `GET`/`POST /internal/registry/token` (Docker's
  token realm) and `POST /webhooks/github` (GitHub's HMAC-signed deliveries; reached on 127.0.0.1:7100, never through the
  edge). A front-end touches only the first two and `POST /auth/logout`.

### 2.3 Roles and capabilities (what a session can do)

A session's capabilities come from its platform role and its project role (`capabilitiesFor` in `projects/authz.ts`):

| Capability | Owner | Collaborator | Platform admin | Mintable into a token? |
|---|:-:|:-:|:-:|---|
| `project:read` | ✓ | ✓ | ✓ | yes |
| `project:write` | ✓ | ✓ | ✓ | yes |
| `project:delete` | ✓ | — | ✓ | yes (no route uses it yet) |
| `source:write` | ✓ | ✓ | ✓ | yes |
| `secret:write` | ✓ | ✓ | ✓ | yes (sandbox/staging only; production is session + step-up) |
| `output:read` | ✓ | ✓ | ✓ | yes |
| `members:manage` | ✓ | — | ✓ | **no — PRIVILEGED** (token asks → pending action) |
| `build:create` | ✓ | ✓ | ✓ | yes |
| `release:create` | ✓ | ✓ | ✓ | yes |
| `release:deploy` (sandbox, staging) | ✓ | ✓ | ✓ | yes |
| `release:promote` (production deploy) | ✓ | — | ✓ | **no — PRIVILEGED** |
| `release:approve` | — | — | ✓ | **no — PERSON-ONLY** (refused outright) |
| `launch:record` | — | — | ✓ | **no — PERSON-ONLY** |
| `quota:set` | — | — | ✓ | **no — PRIVILEGED** (no route yet) |
| `secret:read` | — | — | — | **no — PRIVILEGED** (in the mint enum; no role holds it; no route) |

- A platform admin gets the admin set on EVERY project, but `listProjects` shows only projects they are a member of.
- A stranger to a project is answered **`404 NOT_FOUND`** (never 403) on every project-scoped route — the id space is not an
  enumeration oracle. A member lacking a capability gets **`403 FORBIDDEN`**.
- **Step-up-guarded** (a session must have re-authenticated within 10 min): `release:promote` (production deploy),
  `release:approve` (approve/reject), `members:manage` (add/remove member), `secret:write` **for production only**, and
  confirming a pending action for any of those. (`quota:set`, `secret:read` are in the set but have no route.)

### 2.4 Origin (CSRF)

- Applied by a framework hook to **every mutating request that carries the `manifest_session` cookie** (valid or not); the
  `Origin` header must equal the console's origin exactly, else **`403 CSRF_ORIGIN_REFUSED`** (its `hint` names the expected
  origin). Also applied to the WebSocket upgrade (a refused upgrade is seen as close 1006/4403). GETs are not origin-checked.
- A request without the cookie is never asked (tokens are exempt). The generated client sends `Origin` itself in Node when
  given a session, and nothing in a browser (the browser does).

### 2.5 `Idempotency-Key`

- **Required on every mutation** (all 21; a header parameter `minLength: 8`, typed as required in the generated client).
  Missing/short → `400 IDEMPOTENCY_KEY_REQUIRED`. The check runs after the Origin check.
- **One key per user ACTION, reused on a retry of that action** (make it when the person first clicks; keep it until the
  action is known to have landed). A retry with the same key and same request answers the **stored first result** (same
  status and body) — e.g. `startBuild`'s replay answers the original `202 running`, so read the build for its present state.
- The record is scoped to **(key, userId, route template)** and fingerprinted by an HMAC of the **path parameters and body**.
  The same key with a different body or a different resource in the path → **`409 IDEMPOTENCY_KEY_REUSED`**. A key made by
  a token is scoped to the minter's userId.
- **A failed request stores nothing**, so it can be retried with the same key.
- **Exception — `mintToken`**: its answer carries the secret, which is never replayed; a same-key retry is
  **`409 TOKEN_ALREADY_MINTED`** naming the token. If the first answer was lost, revoke it and mint again with a new key.
- **A dry run (`createCommit` with `dryRun: true`) takes a new key every time.** A retry spanning a rotation of the platform's
  session secret is `409 IDEMPOTENCY_KEY_REUSED` — resend with a new key. Records are never pruned.

### 2.6 The error envelope

Every refusal, from every `/v1` route, is exactly this (`ErrorEnvelope`, `additionalProperties: false` at both levels):

```json
{
  "error": {
    "code": "SOURCE_CONFLICT",          // ErrorCode — REQUIRED; stable; switch on it
    "message": "…",                      // REQUIRED; "for a person. Never parse it"
    "hint": "…",                         // optional; what to do
    "details": [ /* ManifestError[] */ ],          // only on 422 SPEC_INVALID
    "launchReadiness": { /* LaunchReadiness */ },  // on 409 RELEASE_PRODUCTION_GATE_UNAVAILABLE (and RELEASE_REESCALATED — see §8)
    "pendingAction": { /* PendingAction */ }       // on 403 TOKEN_ACTION_PENDING (and TOKEN_ACTION_REJECTED — see §8)
  }
}
```

- `ManifestError` = `{ code: ManifestErrorCode, path: "services.0.type", message, hint? }`.
- **A code always comes with the same status.** Status alone is never enough: **seven different 403s** exist —
  `FORBIDDEN`, `CSRF_ORIGIN_REFUSED`, `STEP_UP_REQUIRED`, `TOKEN_CREDENTIAL_REFUSED`, `TOKEN_ACTION_PENDING`,
  `TOKEN_ACTION_REJECTED`, `TOKEN_PERSON_ONLY` (plus `INSTANCE_OUTPUT_PRODUCTION`, eight in all) — each needing a
  different client behaviour. `404` splits into `NOT_FOUND` (not there / not yours) and `ROUTE_NOT_FOUND` (no such route).
- **Bodies that are NOT envelopes**: Caddy's empty `502` when the control plane is down; the edge's refusal from an app
  network; and (on the reference console's Vite dev server at `127.0.0.1:7104`) an HTML `200` for any `/v1` GET. The
  generated client's `ManifestApiError.code` is `'UNPARSEABLE'` for these.
- `details`, `hint` and `message` are written for a DEVELOPER (they name operationIds, manifest paths, header names); a
  faculty UI should map `code` to its own copy (§6).

### 2.7 Step-up (`403 STEP_UP_REQUIRED`)

1. A session attempts a guarded action (production deploy; approve/reject; add/remove member; set/clear a PRODUCTION
   secret; confirm a pending action for a guarded capability) and has not re-authenticated in the last 10 minutes →
   `403 STEP_UP_REQUIRED` (checked AFTER the capability, so a person who may not do it is told `FORBIDDEN` instead).
2. The client performs a **full-page navigation** (never `fetch` — it ends at the IdP) to
   **`GET /auth/step-up?returnTo=<the page they are on>`**. It requires an existing session (a token →
   `TOKEN_CREDENTIAL_REFUSED`). The IdP is asked with `ForceAuthn`, so the person types their password again.
3. The IdP posts back to the ACS; the callback refuses an assertion for a different person (`SAML_STEP_UP_WRONG_USER`) or
   with no session (`SAML_STEP_UP_NO_SESSION`), stamps `steppedUpAt` on the SAME session cookie (lifetime unchanged), and
   **302s to `returnTo`**.
4. **How the client learns it is done: only by landing back on `returnTo`.** No API field reports step-up freshness (`Me`
   has no such field), and the refused request is NOT replayed by the platform. The client re-issues the request (the
   reference console makes the person press the button again — deliberately). The claim is good for **10 minutes**
   (`STEP_UP_TTL_MS`). For approvals, `getApprovalPreview` exists precisely so the page can re-show the stored preview after
   the round trip. A token can never step up.

### 2.8 Pending actions (D24): a token's privileged request becomes a person's question

- A token asking for a **privileged** capability — today reachable: `members:manage` (`addMember`, `removeMember`) and
  `release:promote` (`deploy` to production) — is answered **`403 TOKEN_ACTION_PENDING`** with `error.pendingAction` (a
  `PendingAction`, `state: "pending"`), and the event `pending_action.created` is published on the project's stream. The
  pending action records the token, method, path and a SHA-256 of the canonical body, plus a human `summary`.
- A person answers in their own session: **`confirmPendingAction`** (`POST /v1/pending-actions/{id}/confirm`, body `{}`) —
  only a person who HOLDS that capability themselves, and **stepped up** for it; or **`rejectPendingAction`**
  (`POST …/reject`, body `{ "reason": "1–500 chars" }`, no step-up). A second answer is `409 PENDING_ACTION_RESOLVED`.
- `confirmed` grants the **identical request** (same token, method, path, body — and the agent reuses its Idempotency-Key)
  **exactly one** retry; `consumedAt` is stamped when it is spent. `rejected` is final: a retry is
  `403 TOKEN_ACTION_REJECTED` carrying the reason. Unanswered, a question **expires after 24 h** (`PENDING_ACTION_TTL_MS`).
- The queue: `listPendingActions` (per project, newest first, answered and expired rows kept, `waitingSeconds`) and
  `getPendingAction`. A session with `project:read` sees every question on the project; a token sees only its own.
- **Person-only** actions (`release:approve`, `launch:record`) never become pending actions: a token is refused outright
  (`TOKEN_CREDENTIAL_REFUSED` at the session-only routes; `TOKEN_PERSON_ONLY` from the central rule if a token somehow held
  one). Setting a PRODUCTION secret is likewise refused to a token outright.
- For a faculty UI: the question to show is `summary` + who asked (join `tokenId` against `listTokens`' `name` — session-only
  — or read the `pending_action.created` event's `humanMessage`), the time (`createdAt`, `expiresAt`), and Confirm / Reject
  with a reason. `method`, `path`, `bodySha256`, `action` are machinery.

### 2.9 Concurrency and preconditions (there are no ETags)

- **No `ETag`, `If-Match` or `If-None-Match` anywhere.** Writes other than the ones below are last-writer-wins (e.g. two
  `setAppSecret` PUTs).
- **The commit read is the precondition for code changes.** `getTree` answers `commitSha` (what the listing is OF); read files
  with `getFile?ref=<that sha>` so tree and file agree; send `createCommit` with **`baseCommit`** = that sha. If `main` moved,
  the commit is **`409 SOURCE_CONFLICT`** and nothing is written — read again, redo the change, commit again (the platform
  never merges). `blobSha` on a file is git's content id (equal ids = equal bytes).
- **Approvals bind stored facts**: `approveRelease`/`rejectRelease` must name a `previewId` taken by `createApprovalPreview`
  (valid 30 min: `APPROVAL_PREVIEW_EXPIRED`); if the facts moved since, `409 APPROVAL_PREVIEW_STALE`. An approval binds the
  release's `imageDigest`; a rebuild is a new digest the approval does not cover.
- **Idempotency** (§2.5) is the duplicate-submission guard for every mutation.
- Production deploys only **the release currently serving staging** (`RELEASE_NOT_STAGED` otherwise).

### 2.10 Long-running work

- **`startBuild` answers `202` at once with `status: "running"`.** The end arrives on the event stream (`build.succeeded` /
  `build.failed`, `machineDetail.buildId`), and log lines as `log` frames. Subscribe BEFORE starting to see every line. A
  client with no socket polls `getBuild` until `succeeded` or `failed`. A build interrupted by a restart ends `build.failed`
  with `code: BUILD_INTERRUPTED`. `status: "pending"` exists in the enum but is never answered today.
- **`deploy` is synchronous** — it answers once the new instance serves or has failed (**up to ~90 s** when a release never
  becomes ready). A failed deploy is a **`200`** whose `Instance.state` is `failed`; `listIncidents` says why. The stream
  carries `instance.provisioning` → `instance.starting` → `instance.healthy` | `instance.failed` (+ `incident.opened`) while
  it runs. **Read `state`, never the status code alone.**
- **`runRehearsal` is synchronous, up to ~90 s**; a failed rehearsal is a `200` with `passed: false`.
- `createProject` is synchronous; its progress is also published (`project.created`, `repository.seeded`, `spec.validated`).

### 2.11 Paging and bounded lists

- **Only `listCommits` pages**: query `cursor` (the previous page's `next`), `limit` 1–100, `ref`; answer `next` (`null` on
  the last page). First-parent history, newest first; the page starts AT the cursor commit.
- Everything else is a bounded list with no paging: `listBuilds` newest 50; `listReleases` newest 50; `listInstances` 50 most
  recently seen (+ `truncated`); `getTree` first 10,000 entries (+ `truncated`); `getCommit` first 1000 changed files
  (+ `truncated`) and 256 KiB of patch (+ `patchesTruncated`); `getBuildLog` `?tail=1..10000`; `getInstanceOutput`
  `?lines=1..1000` (default 200; 256 KiB total, 4 KiB per line); the stream's replay is the newest 50 events.
  `listProjects`, `listMembers`, `listTokens`, `listPendingActions`, `listIncidents`, `listEnvironments` (always 3),
  `listBlueprints`, `listFleet` take no paging parameters.

### 2.12 Request limits and content types

- A body is JSON with `Content-Type: application/json` (else `415 REQUEST_MEDIA_TYPE_UNSUPPORTED`). **A request with no body
  sends no `Content-Type`** (`GET`, and the bodiless `DELETE`s `clearAppSecret`, `removeMember`, `revokeToken`); sending
  `application/json` with no body is `400 REQUEST_INVALID`. `confirmPendingAction` requires the literal body `{}`
  (`EmptyRequest`).
- Body size: **1 MiB**, except `createCommit` **8 MiB** → `413 REQUEST_BODY_TOO_LARGE`.
- `createCommit`: ≤ 500 changes; a text write ≤ 1 MiB; a base64 write (images, PDFs, fonts — "the ten kinds") ≤ 2 MiB decoded;
  `message` 1–4096 chars. `getFile`: text ≤ 1 MiB, `encoding=base64` ≤ 2 MiB.
- Validation failures are `400 REQUEST_INVALID` with a `message` naming each failing field (`body.changes.0.path: …`).
- An unknown path is `404 ROUTE_NOT_FOUND`.

### 2.13 Versioning

Resource routes are under `/v1`; within it the API only grows — answers may gain fields, so **ignore unknown fields**. A
breaking change would be a new prefix. `info.version` and the package version move together (1.4.0 now).


---

## 3. Every operation

### 3.1 By area — the index

Legend for **Who**: **S** = person session only (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`); **S/T** = session or
delegated token; the capability is what the route asserts (§2.3 says which roles hold it); **↑** = session must be stepped up
(§2.7); **P** = privileged — a token gets `403 TOKEN_ACTION_PENDING` (§2.8); **PO** = person-only. "any" = any credential,
no capability.

| Area | operationId | Method and path | Who | Success |
|---|---|---|---|---|
| **Me / identity** | `getMe` | `GET /v1/me` | S, any signed-in person | 200 `Me` |
| | *(unversioned)* | `GET /auth/login?returnTo=`, `GET /auth/step-up?returnTo=`, `POST /auth/logout` | browser navigation / S | 302 / 302 / 200 `{redirectTo}` |
| **Projects** | `listProjects` | `GET /v1/projects` | S/T, any (a token: its one project) | 200 `Project[]` |
| | `createProject` | `POST /v1/projects` | S, any signed-in person | 201 `CreatedProject` |
| | `getProject` | `GET /v1/projects/{projectId}?expand=environments` | S/T `project:read` | 200 `Project` |
| | `updateProject` | `PATCH /v1/projects/{projectId}` (rename: `{ name }`) | S/T `project:write` | 200 `Project` |
| | `checkSlug` | `GET /v1/slugs/{slug}` | S/T any; 60/min/person | 200 `SlugCheck` (always 200) |
| **Blueprints** | `listBlueprints` | `GET /v1/blueprints` | S/T any | 200 `Blueprint[]` |
| | `getBlueprint` | `GET /v1/blueprints/{blueprintRef}` | S/T any | 200 `Blueprint` |
| | `getKnowledgePack` | `GET /v1/blueprints/{blueprintRef}/knowledge-pack` | S/T any | 200 `KnowledgePack` |
| **Environments** | `listEnvironments` | `GET /v1/projects/{projectId}/environments` | S/T `project:read` | 200 `Environment[]` (3) |
| | `getEnvironment` | `GET /v1/environments/{environmentId}` | S/T `project:read` | 200 `Environment` |
| **Members** | `listMembers` | `GET /v1/projects/{projectId}/members` | S/T `project:read` | 200 `Member[]` |
| | `addMember` | `POST /v1/projects/{projectId}/members` | S/T `members:manage` ↑ **P** | 201 `Member` |
| | `removeMember` | `DELETE /v1/projects/{projectId}/members/{userId}` | S/T `members:manage` ↑ **P** | 200 `Member[]` |
| **manifest.yaml** | `getSpec` | `GET /v1/projects/{projectId}/spec` | S/T `project:read` | 200 `Spec` |
| | `validateSpec` | `POST /v1/projects/{projectId}/spec` | S/T `project:write` | 201 `SpecValidation` |
| **Authoring** | `getTree` | `GET /v1/projects/{projectId}/tree?ref=` | S/T `project:read` | 200 `SourceTree` |
| | `getFile` | `GET /v1/projects/{projectId}/file?path=&ref=&encoding=` | S/T `project:read` | 200 `SourceFile` |
| | `listCommits` | `GET /v1/projects/{projectId}/commits?cursor=&limit=&ref=` | S/T `project:read` | 200 `CommitList` |
| | `getCommit` | `GET /v1/projects/{projectId}/commits/{commitSha}` | S/T `project:read` | 200 `CommitDetail` |
| | `createCommit` | `POST /v1/projects/{projectId}/commits` | S/T `source:write` | 201 `CommitOutcome` |
| **Secrets** | `listAppSecrets` | `GET /v1/environments/{environmentId}/secrets` | S/T `project:read` | 200 `AppSecretList` |
| | `setAppSecret` | `PUT /v1/environments/{environmentId}/secrets/{name}` | S/T `secret:write`; production: **S ↑** | 200 `AppSecretStatus` |
| | `clearAppSecret` | `DELETE /v1/environments/{environmentId}/secrets/{name}` | S/T `secret:write`; production: **S ↑** | 200 `AppSecretStatus` |
| **Builds** | `startBuild` | `POST /v1/projects/{projectId}/builds` | S/T `build:create` | **202** `Build` (running) |
| | `listBuilds` | `GET /v1/projects/{projectId}/builds` | S/T `project:read` | 200 `Build[]` (≤50) |
| | `getBuild` | `GET /v1/builds/{buildId}` | S/T `project:read` | 200 `Build` |
| | `getBuildLog` | `GET /v1/builds/{buildId}/logs?tail=` | S/T `project:read` | 200 `BuildLog` |
| **Releases** | `createRelease` | `POST /v1/projects/{projectId}/releases` | S/T `release:create` | 201 `Release` |
| | `listReleases` | `GET /v1/projects/{projectId}/releases` | S/T `project:read` | 200 `Release[]` (≤50) |
| | `getRelease` | `GET /v1/releases/{releaseId}` | S/T `project:read` | 200 `Release` |
| **Deploys, instances, output, incidents** | `deploy` | `POST /v1/environments/{environmentId}/deploy` | S/T `release:deploy`; production: `release:promote` ↑ **P** | 200 `Instance` (healthy OR failed) |
| | `listInstances` | `GET /v1/environments/{environmentId}/instances` | S/T `project:read` | 200 `InstanceList` |
| | `getInstanceOutput` | `GET /v1/instances/{instanceId}/output?lines=` | S/T `output:read`; never production | 200 `InstanceOutput` |
| | `listIncidents` | `GET /v1/environments/{environmentId}/incidents` | S/T `project:read` | 200 `IncidentList` |
| **Launch, approvals, UBC records** | `getLaunchReadiness` | `GET /v1/projects/{projectId}/launch-readiness` | S/T `project:read` | 200 `LaunchReadiness` |
| | `getLaunchRecords` | `GET /v1/projects/{projectId}/launch-records` | S/T `project:read` | 200 `LaunchRecords` |
| | `recordIamRegistration` | `POST /v1/projects/{projectId}/launch-records/iam-registration` | S `launch:record` (admin) **PO** | 200 `IamRegistration` |
| | `recordPrivacyAssessment` | `POST /v1/projects/{projectId}/launch-records/privacy-assessment` | S `launch:record` (admin) **PO** | 200 `PrivacyAssessment` |
| | `runRehearsal` | `POST /v1/projects/{projectId}/rehearsal` | S `launch:record` (admin) **PO** | 200 `Rehearsal` (passed or not) |
| | `getApproval` | `GET /v1/releases/{releaseId}/approval` | S/T `project:read` | 200 `Approval` (404 if undecided) |
| | `createApprovalPreview` | `POST /v1/releases/{releaseId}/approval-preview` | S `release:approve` (admin) **PO**, no step-up | 201 `ApprovalPreview` |
| | `getApprovalPreview` | `GET /v1/releases/{releaseId}/approval-previews/{previewId}` | S `release:approve` (admin) **PO** | 200 `ApprovalPreview` |
| | `approveRelease` | `POST /v1/releases/{releaseId}/approve` | S `release:approve` (admin) ↑ **PO** | 201 `Approval` |
| | `rejectRelease` | `POST /v1/releases/{releaseId}/reject` | S `release:approve` (admin) ↑ **PO** | 201 `Approval` |
| **Tokens** | `listTokens` | `GET /v1/projects/{projectId}/tokens` | S `project:read` | 200 `Token[]` |
| | `mintToken` | `POST /v1/projects/{projectId}/tokens` | S `project:write` | 201 `MintedToken` (secret once) |
| | `revokeToken` | `DELETE /v1/tokens/{tokenId}` | S, the minter only | 200 `Token` |
| **Pending actions** | `listPendingActions` | `GET /v1/projects/{projectId}/pending-actions` | S/T `project:read` (token: its own) | 200 `PendingAction[]` |
| | `getPendingAction` | `GET /v1/pending-actions/{pendingActionId}` | S/T `project:read` (token: its own) | 200 `PendingAction` |
| | `confirmPendingAction` | `POST /v1/pending-actions/{pendingActionId}/confirm` | S, holds the action's capability, ↑ | 200 `PendingAction` |
| | `rejectPendingAction` | `POST /v1/pending-actions/{pendingActionId}/reject` | S, holds the action's capability | 200 `PendingAction` |
| **Events** | `streamProjectEvents` | `GET /v1/projects/{projectId}/events` (WebSocket upgrade) | S/T `project:read` | 101; plain GET 426 |
| **Docs** | `listDocs` | `GET /v1/docs` | S/T any | 200 `DocIndex` |
| | `getDoc` | `GET /v1/docs/{slug}` | S/T any | 200 `DocPage` |
| | `getOpenApiDocument` | `GET /v1/openapi.json` | S/T any | 200 the document |
| **Administration** | `listFleet` | `GET /v1/fleet` | S, platform admin | 200 `Fleet` |
| **AI** | — | *no operation.* The 11 `AI_*` codes (§5) are what an APP's own AI-gateway calls meet at runtime; only `AI_BACKEND_UNAVAILABLE`/`AI_CATALOGUE_EMPTY` are answered by API operations (when validating `ai.models`). Agent model keys (`/v1/projects/{projectId}/agent-sessions`, `/v1/agent-budget`) are planned — §8. | | |
| **Incidents** | `listIncidents` (above) | — | — | the only incident operation: no get-one, acknowledge or resolve |

**Not in the API at HEAD** (the journey guide says so, or the front-end plan is building it): adding a member by CWL login/email (today only by `puid`, and the person must have signed in once), changing a
project's audience, archive/restore/delete, rolling back a release, agent sessions, and any listing of approvals across
projects (the admin queue beyond `listFleet` and per-project `listPendingActions`).

### 3.2 Every operation in detail

Grouped by the document's own tags. For each: operationId, method and path, credential class from `security`, **who may call
it (from the route code)**, the description, every parameter, the request body's fields, each success response's fields (one
level into nested schemas; each named schema is expanded in full in Appendix A), and every error code the operation declares
(`x-manifest-error-codes`). Any operation may additionally answer `CREDENTIAL_AMBIGUOUS` (400) and `ROUTE_NOT_FOUND` (404),
which no operation declares.


#### Tag `identity`

Who the caller is: the person behind the session, and their platform role.

##### `getMe` — The signed-in person

`GET /v1/me`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** any signed-in person, session only. No capability. A token is refused `403 TOKEN_CREDENTIAL_REFUSED`.

> Who this session belongs to, and the platform role it is authorized as. Every client calls it first. Interactive sessions only: a delegated token carries no platform role at all (D24), so there is nothing truthful for this to answer it — an agent reads GET /v1/projects, which answers exactly the project it is scoped to.

Response `200` — `Me` — The person.
- `id`: string (uuid) — The person’s user id on this platform — what `listMembers` calls `userId`.
- `puid`: string — The person's ubcEduCwlPuid (§9).
- `displayName`: string — Their name, as CWL gave it.
- `email`: string — Their address, as CWL gave it.
- `role`: "admin" \| "member" — The platform role THIS SESSION is authorized as.

Error codes: `INTERNAL`, `RATE_LIMITED`, `REQUEST_INVALID`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`


#### Tag `projects`

A project, its three environments, its members, and the validation of its manifest.yaml (§6, §7, §23).

##### `getEnvironment` — An environment, and what it serves

`GET /v1/environments/{environmentId}`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read` (checked against the environment's own project).

> The environment and the instance its hostname reaches (§6 Route) — not the newest deploy, which may have failed.

Parameters:
- `environmentId` (path, required): string (uuid) — The environment’s id, from `listEnvironments` — one each for sandbox, staging and production.

Response `200` — `Environment` — The environment.
- `id`: string (uuid) — The environment — what `deploy`, `listIncidents` and the secrets operations name.
- `projectId`: string (uuid) — Its project.
- `kind`: "sandbox" \| "staging" \| "production" — Which of the three: `sandbox`, `staging` or `production` (§11).
- `hostname`: string — §23: `<slug>.<zone for this kind>`. Permanent.
- `url`: string (uri) — Where the app answers in this environment, once it is deployed.
- `instance`: `Instance` \| null — The instance the hostname reaches (§6 Route). Null before any deploy.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `listProjects` — The projects I am a member of

`GET /v1/projects`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** any credential, no capability check. A session sees the projects the person owns or collaborates on (an admin sees only their own memberships here; the fleet is `listFleet`). A token sees exactly its one project.

> Every project the caller owns or collaborates on, newest first — for administrators too. A delegated token answers exactly the one project it is scoped to (D24). The fleet is GET /v1/fleet.

Response `200` — `ProjectList` — The caller’s projects.
- (array of `Project`)
  - `id`: string (uuid) — The project — what every project-scoped path names.
  - `slug`: string — The project’s permanent identifier, and the first label of every hostname it has (§23). It never changes; `name` is what people read.
  - `name`: string [minLen 1, maxLen 80] — What people call the project — any text of 1 to 80 characters, trimmed, on one line. Never part of an address: the slug is.
  - `blueprint`: string — `name@major` (§25).
  - `starter`: string \| null — The starter the first commit was seeded from (§25); null for the skeleton alone.
  - `owner`: `UserSummary`
  - `audience`: `Audience` \| null — Who it is for (§24); null for a project created before the question was asked.
  - `createdAt`: string (date-time) — When it was created.
  - `launchedAt`: string (date-time) \| null — When it first went to production (§13 D9) — null until then; never cleared.
  - `repository`: `RepositoryLink`
  - `environments`: `Environment`[] *(optional)* — Present with `?expand=environments` (D23.1).

Error codes: `INTERNAL`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `createProject` — Create a project

`POST /v1/projects`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only, any signed-in person (no project yet, so no capability). A token is refused `TOKEN_CREDENTIAL_REFUSED`.

> §22 steps 2–3: a name, a blueprint, optionally a starter, and who the app is for (§24). Interactive sessions only: a delegated token is scoped to one project and cannot make another (D24), which is also what keeps §24’s audience question human-only (D29). Creates the project and its three environments, seeds a repository from the skeleton and the starter, and validates its manifest. Progress is on the project’s event stream: project.created, repository.seeded, spec.validated.

Parameters:
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `CreateProjectRequest`
- `slug`: string [minLen 1] — Checked by the same function as GET /v1/slugs/{slug} (§23).
- `name`: string [minLen 1, maxLen 80] *(optional)* — What people call the project — any text of 1 to 80 characters, trimmed, on one line. The slug, when none is given; `updateProject` changes it later.
- `blueprint`: string [minLen 1] — `name@major`, from GET /v1/blueprints.
- `starter`: string [minLen 1] *(optional)* — One the blueprint offers. Without one: the skeleton and a minimal manifest.
- `audience`: `AudienceInput`

Response `201` — `CreatedProject` — The project, as created.
- `id`: string (uuid) — The project — what every project-scoped path names.
- `slug`: string — The project’s permanent identifier, and the first label of every hostname it has (§23). It never changes; `name` is what people read.
- `name`: string [minLen 1, maxLen 80] — What people call the project — any text of 1 to 80 characters, trimmed, on one line. Never part of an address: the slug is.
- `blueprint`: string — `name@major` (§25).
- `starter`: string \| null — The starter the first commit was seeded from (§25); null for the skeleton alone.
- `owner`: `UserSummary`
- `audience`: `Audience` \| null — Who it is for (§24); null for a project created before the question was asked.
- `createdAt`: string (date-time) — When it was created.
- `launchedAt`: string (date-time) \| null — When it first went to production (§13 D9) — null until then; never cleared.
- `repository`: `RepositoryLink`
- `environments`: `Environment`[] — Its three environments, none deployed yet.
- `spec`: `SpecValidation`

Error codes: `AI_BACKEND_UNAVAILABLE`, `AI_CATALOGUE_EMPTY`, `BLUEPRINT_NOT_FOUND`, `CSRF_ORIGIN_REFUSED`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `SLUG_INVALID`, `SLUG_RESERVED`, `SLUG_TAKEN`, `SOURCE_GITHUB_REFUSED`, `SOURCE_GIT_FAILED`, `SOURCE_REPOSITORY_EXISTS`, `SOURCE_REPOSITORY_NOT_PRIVATE`, `SOURCE_SECRET_DETECTED`, `SOURCE_UNREACHABLE`, `STARTER_NOT_FOUND`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

##### `getProject` — A project

`GET /v1/projects/{projectId}`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read` (owner, collaborator, platform admin; mintable).

> One project; `?expand=environments` includes its three environments, each with the instance it serves (D23.1).

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `expand` (query, optional): "environments" — `environments` includes the project’s three environments in the answer.

Response `200` — `Project` — The project.
- `id`: string (uuid) — The project — what every project-scoped path names.
- `slug`: string — The project’s permanent identifier, and the first label of every hostname it has (§23). It never changes; `name` is what people read.
- `name`: string [minLen 1, maxLen 80] — What people call the project — any text of 1 to 80 characters, trimmed, on one line. Never part of an address: the slug is.
- `blueprint`: string — `name@major` (§25).
- `starter`: string \| null — The starter the first commit was seeded from (§25); null for the skeleton alone.
- `owner`: `UserSummary`
- `audience`: `Audience` \| null — Who it is for (§24); null for a project created before the question was asked.
- `createdAt`: string (date-time) — When it was created.
- `launchedAt`: string (date-time) \| null — When it first went to production (§13 D9) — null until then; never cleared.
- `repository`: `RepositoryLink`
- `environments`: `Environment`[] *(optional)* — Present with `?expand=environments` (D23.1).

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `updateProject` — Rename a project

`PATCH /v1/projects/{projectId}`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:write` (owner, collaborator, platform admin; mintable). *Added at `186fa34` — the API’s first `PATCH`.*

> Changes what people call the project — `name`, any text of 1 to 80 characters on one line — and nothing else: the slug, and so every hostname and the repository, never changes (§23, D26). Publishes `project.renamed` naming who did it; renaming a project to the name it already has answers the project and publishes nothing.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `UpdateProjectRequest`
- `name`: string [minLen 1, maxLen 80] — What people call the project — any text of 1 to 80 characters, trimmed, on one line. Never part of an address: the slug is.

Response `200` — `Project` — The project, as it now is.
- `id`: string (uuid) — The project — what every project-scoped path names.
- `slug`: string — The project’s permanent identifier, and the first label of every hostname it has (§23). It never changes; `name` is what people read.
- `name`: string [minLen 1, maxLen 80] — What people call the project — any text of 1 to 80 characters, trimmed, on one line. Never part of an address: the slug is.
- `blueprint`: string — `name@major` (§25).
- `starter`: string \| null — The starter the first commit was seeded from (§25); null for the skeleton alone.
- `owner`: `UserSummary`
- `audience`: `Audience` \| null — Who it is for (§24); null for a project created before the question was asked.
- `createdAt`: string (date-time) — When it was created.
- `launchedAt`: string (date-time) \| null — When it first went to production (§13 D9) — null until then; never cleared.
- `repository`: `RepositoryLink`
- `environments`: `Environment`[] *(optional)* — Present with `?expand=environments` (D23.1).

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `UNAUTHENTICATED`


##### `listEnvironments` — A project’s environments

`GET /v1/projects/{projectId}/environments`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> Sandbox, staging and production — all three exist from the moment the project does (§23).

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.

Response `200` — `EnvironmentList` — The environments.
- (array of `Environment`)
  - `id`: string (uuid) — The environment — what `deploy`, `listIncidents` and the secrets operations name.
  - `projectId`: string (uuid) — Its project.
  - `kind`: "sandbox" \| "staging" \| "production" — Which of the three: `sandbox`, `staging` or `production` (§11).
  - `hostname`: string — §23: `<slug>.<zone for this kind>`. Permanent.
  - `url`: string (uri) — Where the app answers in this environment, once it is deployed.
  - `instance`: `Instance` \| null — The instance the hostname reaches (§6 Route). Null before any deploy.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `listMembers` — Who is a member of a project

`GET /v1/projects/{projectId}/members`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> Owners and collaborators (§13). Reading is `project:read`; changing membership is `members:manage`.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.

Response `200` — `MemberList` — The members.
- (array of `Member`)
  - `userId`: string (uuid) — The person’s user id — what `removeMember` names.
  - `puid`: string — Their ubcEduCwlPuid (§9) — what `addMember` names.
  - `displayName`: string — Their name, as CWL gave it.
  - `email`: string — Their address, as CWL gave it.
  - `role`: "owner" \| "collaborator" — `owner` may do everything on the project; `collaborator` the same except managing members, deleting the project and promoting a release to production (§13).

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `addMember` — Add or change a member

`POST /v1/projects/{projectId}/members`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `members:manage` (owner, platform admin — NOT collaborator) AND step-up within 10 min for a session. PRIVILEGED: a token is answered `403 TOKEN_ACTION_PENDING` (a pending action a person confirms, then one identical retry).

> Grants a person who has signed in once a role on the project. One of D24’s privileged four: a delegated token never holds it, and asking creates a pending action a person confirms.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `AddMemberRequest`
- `puid`: string [minLen 1, maxLen 64] — The person’s ubcEduCwlPuid. They must have signed in once.
- `role`: "owner" \| "collaborator" — The role to grant: `owner` or `collaborator`.

Response `201` — `Member` — The member, as they now are.
- `userId`: string (uuid) — The person’s user id — what `removeMember` names.
- `puid`: string — Their ubcEduCwlPuid (§9) — what `addMember` names.
- `displayName`: string — Their name, as CWL gave it.
- `email`: string — Their address, as CWL gave it.
- `role`: "owner" \| "collaborator" — `owner` may do everything on the project; `collaborator` the same except managing members, deleting the project and promoting a release to production (§13).

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `MEMBER_USER_NOT_FOUND`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `STEP_UP_REQUIRED`, `TOKEN_ACTION_PENDING`, `TOKEN_ACTION_REJECTED`, `UNAUTHENTICATED`

##### `removeMember` — Remove a member

`DELETE /v1/projects/{projectId}/members/{userId}`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `members:manage` + step-up for a session. PRIVILEGED: a token gets `403 TOKEN_ACTION_PENDING`. Last owner cannot be removed (`PROJECT_LAST_OWNER`).

> Takes a person off the project (§13). One of D24’s privileged four: a delegated token will never hold it, and asking creates a pending action a person confirms. Idempotent — removing somebody who is not a member answers the members as they are — and the LAST owner cannot be removed, because a project with no owner is one nobody can grant access to, delete or deploy.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `userId` (path, required): string (uuid) — The member’s user id, from `listMembers`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Response `200` — `MemberList` — The members as they now are.
- (array of `Member`)
  - `userId`: string (uuid) — The person’s user id — what `removeMember` names.
  - `puid`: string — Their ubcEduCwlPuid (§9) — what `addMember` names.
  - `displayName`: string — Their name, as CWL gave it.
  - `email`: string — Their address, as CWL gave it.
  - `role`: "owner" \| "collaborator" — `owner` may do everything on the project; `collaborator` the same except managing members, deleting the project and promoting a release to production (§13).

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `PROJECT_LAST_OWNER`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `STEP_UP_REQUIRED`, `TOKEN_ACTION_PENDING`, `TOKEN_ACTION_REJECTED`, `UNAUTHENTICATED`

##### `getSpec` — The project’s newest valid manifest

`GET /v1/projects/{projectId}/spec`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> manifest.yaml as last validated (§7). An invalid newest manifest answers SPEC_INVALID with its errors.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.

Response `200` — `Spec` — The spec.
- `appSpecId`: string (uuid) — The recorded validation this is.
- `commitSha`: string — The commit whose manifest.yaml it is.
- `spec`: map<string, any> — manifest.yaml v1 as parsed and validated (§7), every default filled in. `ManifestYaml` in this document describes each field.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `SPEC_INVALID`, `SPEC_NOT_FOUND`, `UNAUTHENTICATED`

##### `validateSpec` — Validate manifest.yaml at a commit

`POST /v1/projects/{projectId}/spec`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:write` (owner, collaborator, admin; mintable).

> §22 step 3: reads manifest.yaml at the commit (HEAD by default), validates it (§7) and records the result. A sensitive diff (D9) is reported here against the newest valid spec; it is ENFORCED at the production deploy, against the last approved release (§13 D9.2).

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `ValidateSpecRequest`
- `commitSha`: string *(optional)* — Defaults to the repository’s HEAD.

Response `201` — `SpecValidation` — The validation, valid or not — an invalid manifest is a recorded answer, not a refusal.
- `appSpecId`: string (uuid) — The validation, as recorded.
- `commitSha`: string — The commit whose manifest.yaml was validated.
- `valid`: boolean — Whether it is valid; a build of this commit needs it to be.
- `errors`: `ManifestError`[] — Every problem, each with its path and code; empty when `valid`.
- `warnings`: `ManifestError`[] — What the validation says WITHOUT refusing — a field validated and recorded but not enforced yet (`SPEC_FIELD_NOT_ENFORCED`). Never a reason `valid` is false; empty for a manifest that did not parse. Show them where the errors are shown.
- `sensitiveDiff`: `SensitiveDiff`

Error codes: `AI_BACKEND_UNAVAILABLE`, `AI_CATALOGUE_EMPTY`, `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `SOURCE_COMMIT_NOT_FOUND`, `SOURCE_GIT_FAILED`, `SOURCE_PROVIDER_MISMATCH`, `SOURCE_UNREACHABLE`, `UNAUTHENTICATED`

##### `checkSlug` — Would this project name work?

`GET /v1/slugs/{slug}`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** any credential, no capability. Rate limited to 60 a minute per person (a token counts against its minter).

> §23: answers exactly what project creation will, so a client can tell a person while they type. Always 200 — the answer is about the name, and a 4xx would make "taken" indistinguishable from "not allowed to ask". Says nothing about a holder. 60 a minute per person.

Parameters:
- `slug` (path, required): string [minLen 1] — The name to check, as it would be given to `createProject`.

Response `200` — `SlugCheck` — The verdict.
- `slug`: string — The name checked, as sent.
- `available`: boolean — Whether `createProject` would accept it now.
- `reasons`: object[] *(optional)* — Present when `available` is false: every reason that applies.
  - `code`: "SLUG_INVALID" \| "SLUG_RESERVED" \| "SLUG_TAKEN" — The code `createProject` would refuse it with.
  - `message`: string — What is wrong with it, for a person.
  - `hint`: string — What to do instead.

Error codes: `INTERNAL`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`


#### Tag `blueprints`

The blueprints an app is built from (§25): what each provides, its starters, and the knowledge pack an agent reads before writing code.

##### `listBlueprints` — The blueprint catalogue

`GET /v1/blueprints`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** any credential, no capability.

> §22 step 2: what a person chooses from, with the starters each offers (§25).

Response `200` — `BlueprintList` — Every published blueprint.
- (array of `Blueprint`)
  - `ref`: string — `name@major` — what a project pins (§25).
  - `name`: string — The blueprint’s name.
  - `majorVersion`: integer — Its major version — the `@major` a project pins.
  - `language`: string — What an app on it is written in.
  - `defaultPort`: integer — The port its apps listen on unless `runtime.port` says otherwise.
  - `healthPath`: string — The health path its skeleton answers.
  - `schemaVersions`: integer[] — The `manifest:` schema versions it understands.
  - `provides`: object — What an app on it may declare in manifest.yaml (§25).
    - `services`: string[] — The service types it can bind — what `services[].type` may name.
    - `authProviders`: ("cwl" \| "none")[] — What `auth.provider` may be.
    - `ai`: boolean — Whether its apps may declare `ai.models`.
  - `starters`: object[] — §25: what `POST /v1/projects` accepts as `starter` for this blueprint.
    - `name`: string — The starter’s name, as `starter` in `createProject`.
    - `summary`: string — What it is, in a sentence.

Error codes: `INTERNAL`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `getBlueprint` — A blueprint

`GET /v1/blueprints/{blueprintRef}`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** any credential, no capability.

> One blueprint by its `name@major`: what an app on it may declare — its services, sign-in providers and AI — and the starters `createProject` accepts for it. Any credential may read it.

Parameters:
- `blueprintRef` (path, required): string — The blueprint, `name@major` — its `ref` in `listBlueprints`.

Response `200` — `Blueprint` — The blueprint.
- `ref`: string — `name@major` — what a project pins (§25).
- `name`: string — The blueprint’s name.
- `majorVersion`: integer — Its major version — the `@major` a project pins.
- `language`: string — What an app on it is written in.
- `defaultPort`: integer — The port its apps listen on unless `runtime.port` says otherwise.
- `healthPath`: string — The health path its skeleton answers.
- `schemaVersions`: integer[] — The `manifest:` schema versions it understands.
- `provides`: object — What an app on it may declare in manifest.yaml (§25).
  - `services`: string[] — The service types it can bind — what `services[].type` may name.
  - `authProviders`: ("cwl" \| "none")[] — What `auth.provider` may be.
  - `ai`: boolean — Whether its apps may declare `ai.models`.
- `starters`: object[] — §25: what `POST /v1/projects` accepts as `starter` for this blueprint.
  - `name`: string — The starter’s name, as `starter` in `createProject`.
  - `summary`: string — What it is, in a sentence.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `getKnowledgePack` — A blueprint’s knowledge pack

`GET /v1/blueprints/{blueprintRef}/knowledge-pack`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** any credential, no capability.

> D25: served over the API and versioned with its blueprint, so an agent learns the conventions without running inside the platform. Each file carries its sha256.

Parameters:
- `blueprintRef` (path, required): string — The blueprint, `name@major` — its `ref` in `listBlueprints`.

Response `200` — `KnowledgePack` — The pack.
- `blueprint`: string — The blueprint it belongs to, `name@major`.
- `files`: object[] — Every file in the pack; read them all before writing code.
  - `path`: string — The file’s path in the pack — `AGENTS.md` first.
  - `mediaType`: "text/markdown" \| "text/plain" — What kind of text it is.
  - `sha256`: string — Hex SHA-256 of `content` as UTF-8.
  - `content`: string — The file’s text, whole.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`


#### Tag `source`

The project’s code: read a tree, a file, the history and one commit, and commit changes against the commit read (§20’s git driver).

##### `listCommits` — The history of the project’s repository

`GET /v1/projects/{projectId}/commits`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> The history of `ref`, newest first, `limit` at a time: its FIRST-PARENT history — the commits the branch itself moved through, each merge once — so paging never skips a commit. `next` is the id to pass as `cursor` for the next page; the page starts AT the cursor, which must be a commit of this repository. The author is what git recorded, and is never an email address.

Parameters:
- `projectId` (path, required): string (uuid) — The project whose repository is read.
- `cursor` (query, optional): string — The `next` of the previous page; the page starts at this commit.
- `limit` (query, optional): integer [min 1, max 100] — How many commits to answer, 1 to 100.
- `ref` (query, optional): string — A branch name, or a full 40-character commit id. Defaults to `main`.

Response `200` — `CommitList` — A page of the history, newest first.
- `ref`: string — A branch name, or a full 40-character commit id. Defaults to `main`.
- `commits`: `CommitSummary`[] — Newest first.
- `next`: string \| null — Pass as `cursor` for the next page; null on the last page.

Error codes: `FORBIDDEN`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `SOURCE_COMMIT_NOT_FOUND`, `SOURCE_GIT_FAILED`, `SOURCE_PROVIDER_MISMATCH`, `SOURCE_REF_NOT_FOUND`, `SOURCE_UNREACHABLE`, `UNAUTHENTICATED`

##### `createCommit` — Commit changes to main

`POST /v1/projects/{projectId}/commits`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `source:write` (owner, collaborator, admin; mintable; not privileged).

> Writes and deletes files on the project’s `main`, as one commit computed from `baseCommit` — text, or, with `encoding: base64`, an image, a PDF or a font, recognised by its bytes. Every change is checked before anything is written — the paths, the text or the bytes, secret-shaped values in the files (in a binary file, its printable text — never text a PDF compresses, or UTF-16) and in the message, the base, the tree, and the manifest.yaml the commit would leave, which must be valid. `dryRun: true` runs every check and writes nothing. A retry with the same Idempotency-Key answers the first commit again. Who made the commit is the platform’s own record (`madeThrough` on the history), never the commit’s text.

Parameters:
- `projectId` (path, required): string (uuid) — The project whose repository is read.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `CreateCommitRequest`
- `baseCommit`: string — The commit these changes were computed from — `commitSha` from the tree or file you read. `main` must still be exactly this commit, or the request is refused `SOURCE_CONFLICT`.
- `message`: string [minLen 1, maxLen 4096] — The commit message. Its first line is its subject. Well-formed Unicode, with no control character but a line break (`\n`) and a tab — no NUL, no carriage return and no escape.
- `changes`: (object \| object)[] — At most 500 writes and deletions, each naming a different path.
  - variant 1 (op = "write"):
    - `op`: "write" — Create the file, or replace its content.
    - `path`: string [minLen 1] — A relative path, `/`-separated: at most 1024 bytes, 255 per component and 32 components; no empty, `.` or `..` component, no leading or trailing `/`, no backslash, no control character, and no `.git` component.
    - `content`: string — The whole new content of the file. As text (the default): at most 1 MiB of UTF-8, with no NUL character. With `encoding: base64`: the file’s bytes as canonical base64, at most 2 MiB decoded — an image (PNG, JPEG, GIF, WebP, ICO), a PDF or a font (WOFF, WOFF2, TTF, OTF), recognised by its bytes, at a path ending in one of those kinds’ extensions (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`, `.pdf`, `.woff`, `.woff2`, `.ttf`, `.otf` — any of them for any kind). A new file is mode `100644`; an existing file keeps its mode.
    - `encoding`: "utf8" \| "base64" *(optional)* — How `content` carries the file: `utf8` (the default) for text, `base64` for bytes. Text sent as base64 is refused — send it as text.
  - variant 2 (op = "delete"):
    - `op`: "delete" — Remove the file. It must exist in `baseCommit`.
    - `path`: string [minLen 1] — A relative path, `/`-separated: at most 1024 bytes, 255 per component and 32 components; no empty, `.` or `..` component, no leading or trailing `/`, no backslash, no control character, and no `.git` component.
- `dryRun`: boolean *(optional)* — Run every check the commit would, write nothing, and answer what would have happened.

Response `201` — `CommitOutcome` — The commit, or what it would have been.
- `dryRun`: boolean — True when nothing was written.
- `commitSha`: string \| null — The new commit on `main`; null for a dry run.
- `parent`: string — The commit this one follows — the request’s `baseCommit`.
- `changes`: object[] — What changed, by path. A write that left a file as it was is not listed.
  - `path`: string — The file’s path.
  - `status`: "added" \| "modified" \| "deleted" — What the commit did to it.
- `spec`: object — The new commit's manifest.yaml — always valid, because an invalid one is refused `SPEC_INVALID` before anything is written.
  - `appSpecId`: string (uuid) \| null — The recorded validation of the new commit; null for a dry run — and for a commit that landed when its validation could not be recorded, which a build of it then makes first.
  - `sensitiveDiff`: `SensitiveDiff`
  - `warnings`: `ManifestError`[] — What validating the new manifest.yaml said without refusing — a field validated but not enforced yet (`SPEC_FIELD_NOT_ENFORCED`). The commit is made regardless.

Error codes: `AI_BACKEND_UNAVAILABLE`, `AI_CATALOGUE_EMPTY`, `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `SOURCE_CONFLICT`, `SOURCE_GIT_FAILED`, `SOURCE_NOTHING_TO_COMMIT`, `SOURCE_PATH_CONFLICT`, `SOURCE_PATH_ESCAPE`, `SOURCE_PATH_NOT_FOUND`, `SOURCE_PROVIDER_MISMATCH`, `SOURCE_SECRET_DETECTED`, `SOURCE_UNREACHABLE`, `SPEC_INVALID`, `UNAUTHENTICATED`

##### `getCommit` — One commit, and what it changed

`GET /v1/projects/{projectId}/commits/{commitSha}`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> The commit and every file it changed against its first parent — the first 1000 by path, with `truncated` true past them — with git’s line counts and a unified diff per text file, until 256 KiB of diff has been given, after which `patchesTruncated` is true and later patches are null.

Parameters:
- `commitSha` (path, required): string — The commit to describe.
- `projectId` (path, required): string (uuid) — The project whose repository is read.

Response `200` — `CommitDetail` — The commit and its changes.
- `commitSha`: string — A full 40-character commit id.
- `parents`: string[] — Its parents, first parent first; empty for the first commit.
- `subject`: string — The first line of the commit message.
- `message`: string — The whole commit message, cut at 4096 characters.
- `messageTruncated`: boolean — True when `message` was cut.
- `authorName`: string — The author git recorded. For a commit made through the API this is the person's name; for any other push it is whatever the pusher's git said, and is not verified.
- `authoredAt`: string (date-time) — When git says the commit was authored, in UTC.
- `madeThrough`: object \| null — Who made this commit through Manifest, from the platform’s own record — a person, or a person’s agent through a delegated token. Null for a commit pushed any other way, whose author is only what the pusher’s git said.
  - `kind`: "person" \| "agent" — A person in a session, or a person’s agent through a delegated token.
  - `name`: string — The person’s name — for an agent, the person who minted its token.
  - `tokenName`: string \| null — The token’s name, for an agent; null for a person.
- `changes`: object[] — The files the commit changed, by path — every one, or the first 1000 when `truncated` is true.
  - `path`: string — The file’s path.
  - `status`: "added" \| "modified" \| "deleted" \| "type_changed" — What happened to it, against the commit's first parent.
  - `binary`: boolean — Whether git calls the file binary; a binary file has no patch and no line counts.
  - `additions`: integer [min 0] \| null — Lines added; null for a binary file.
  - `deletions`: integer [min 0] \| null — Lines removed; null for a binary file.
  - `patch`: string \| null — A unified diff with three lines of context; null for a binary file, or once 256 KiB of patch has been given.
- `truncated`: boolean — True when the commit changed more than 1000 files and `changes` lists the first 1000 by path; read the rest with git.
- `patchesTruncated`: boolean — True when some `patch` is null because the 256 KiB budget was spent.

Error codes: `FORBIDDEN`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `SOURCE_COMMIT_NOT_FOUND`, `SOURCE_GIT_FAILED`, `SOURCE_PROVIDER_MISMATCH`, `SOURCE_UNREACHABLE`, `UNAUTHENTICATED`

##### `getFile` — Read one file of the project’s repository

`GET /v1/projects/{projectId}/file`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> The file at `path`, at `ref`, whole — with the commit it was read at and git’s id for its content. By default the file is read as TEXT, exactly as its UTF-8 bytes: a binary or non-UTF-8 file is refused `SOURCE_FILE_NOT_TEXT`, and one larger than 1 MiB `SOURCE_FILE_TOO_LARGE`. With `encoding=base64` ANY regular file up to 2 MiB — an image, a PDF, a font, or text — is answered as its bytes in canonical base64. A directory, symlink or submodule is refused `SOURCE_PATH_NOT_A_FILE` either way.

Parameters:
- `projectId` (path, required): string (uuid) — The project whose repository is read.
- `encoding` (query, optional): "utf8" \| "base64" — `utf8` (the default) reads the file as text; `base64` reads any file up to 2 MiB as its bytes.
- `path` (query, required): string [minLen 1, maxLen 1024] — The file’s path from the repository root, `/`-separated.
- `ref` (query, optional): string — A branch name, or a full 40-character commit id. Defaults to `main`.

Response `200` — `SourceFile` — The file, and the commit it was read at.
- `ref`: string — A branch name, or a full 40-character commit id. Defaults to `main`.
- `commitSha`: string — The commit the file was read at.
- `path`: string — The file’s path from the repository root.
- `content`: string — The file’s content, whole: its text exactly (`encoding: utf8`, at most 1 MiB), or its bytes as canonical base64 (`encoding: base64`, at most 2 MiB decoded).
- `encoding`: "utf8" \| "base64" — How `content` carries the file: `utf8` — text, the default read — or `base64`, when the read asked for `encoding=base64`.
- `size`: integer [min 0] — The file’s size in bytes.
- `mode`: string — `100644`, or `100755` for an executable file — kept when the file is changed.
- `blobSha`: string — git's id for this content; equal ids mean equal bytes.

Error codes: `FORBIDDEN`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `SOURCE_COMMIT_NOT_FOUND`, `SOURCE_FILE_NOT_TEXT`, `SOURCE_FILE_TOO_LARGE`, `SOURCE_GIT_FAILED`, `SOURCE_PATH_NOT_A_FILE`, `SOURCE_PATH_NOT_FOUND`, `SOURCE_PROVIDER_MISMATCH`, `SOURCE_REF_NOT_FOUND`, `SOURCE_UNREACHABLE`, `UNAUTHENTICATED`

##### `getTree` — List the files of the project’s repository

`GET /v1/projects/{projectId}/tree`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> Every entry of the tree at `ref` — files, directories, symlinks and submodules — sorted by path, with the commit the ref resolved to. Past 10,000 entries the first 10,000 are listed and `truncated` is true. A binary file is marked, so a client can say so rather than try to read it.

Parameters:
- `projectId` (path, required): string (uuid) — The project whose repository is read.
- `ref` (query, optional): string — A branch name, or a full 40-character commit id. Defaults to `main`.

Response `200` — `SourceTree` — The tree, and the commit it is of.
- `ref`: string — A branch name, or a full 40-character commit id. Defaults to `main`.
- `commitSha`: string — The commit the ref resolved to — what this listing is OF. Send it as `baseCommit` when committing changes computed from it.
- `entries`: object[] — Every entry of the tree, sorted by path.
  - `path`: string — The path from the repository root, `/`-separated.
  - `type`: "file" \| "directory" \| "symlink" \| "submodule" — What git records at this path. The API reads and writes `file`s only.
  - `mode`: string — git's mode: `100644` a file, `100755` an executable file, `120000` a symlink, `040000` a directory, `160000` a submodule.
  - `size`: integer [min 0] \| null — Bytes, for a file or a symlink; null otherwise.
  - `binary`: boolean \| null — Whether git calls this file binary — read it with `getFile`’s `encoding=base64`. An image, PDF or font (the ten kinds `createCommit` writes as bytes) can be written back with `encoding: base64`; any other binary file only by a push. Null for anything that is not a file.
- `truncated`: boolean — True when the tree has more than 10,000 entries and only the first 10,000, by path, are listed.

Error codes: `FORBIDDEN`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `SOURCE_COMMIT_NOT_FOUND`, `SOURCE_GIT_FAILED`, `SOURCE_PROVIDER_MISMATCH`, `SOURCE_REF_NOT_FOUND`, `SOURCE_UNREACHABLE`, `UNAUTHENTICATED`


#### Tag `secrets`

The values of an app’s declared secrets, per environment — set and cleared, and never read back (§20).

##### `listAppSecrets` — The app’s secrets in an environment — names only

`GET /v1/environments/{environmentId}/secrets`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> Every name the environment’s newest valid manifest.yaml declares with `secret: true` (its `environments.<kind>.env` override applied), and every name that has a value, sorted — each with whether it is declared, whether a value is set, and when that value last changed. No operation answers a value. A declared name with `set: false` stops the next deploy of this environment with `RELEASE_SECRET_NOT_SET`.

Parameters:
- `environmentId` (path, required): string (uuid) — The environment whose secrets these are.

Response `200` — `AppSecretList` — The names.
- `environmentId`: string (uuid) — The environment.
- `environmentKind`: "sandbox" \| "staging" \| "production" — Which of the three it is. Production’s values are set only by a person who has stepped up.
- `secrets`: `AppSecretStatus`[] — Every name declared or set, sorted. A declared name with `set: false` stops the next deploy of this environment (`RELEASE_SECRET_NOT_SET`).

Error codes: `FORBIDDEN`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `clearAppSecret` — Clear the value of one of the app’s secrets

`DELETE /v1/environments/{environmentId}/secrets/{name}`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `secret:write`. Sandbox/staging: session or token. PRODUCTION: session only AND step-up — a token is refused `403 TOKEN_CREDENTIAL_REFUSED` outright (no pending action).

> Removes the stored value for this environment. Idempotent: clearing a name with no value answers the same state. While manifest.yaml still declares the name, the next deploy of this environment is refused with `RELEASE_SECRET_NOT_SET`; an instance already running keeps the value it was started with. Production asks what setting does: an interactive session that has stepped up.

Parameters:
- `environmentId` (path, required): string (uuid) — The environment whose secrets these are.
- `name` (path, required): string — The variable’s name, as manifest.yaml’s `env` declares it: an upper-case letter, then upper-case letters, digits and underscores, at most 128 characters.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Response `200` — `AppSecretStatus` — The name’s state, with no value set.
- `name`: string — The variable’s name, as manifest.yaml’s `env` declares it: an upper-case letter, then upper-case letters, digits and underscores, at most 128 characters.
- `declared`: boolean — Whether the environment’s newest valid manifest.yaml declares this name with `secret: true`. Only a declared name reaches the app.
- `set`: boolean — Whether a value is stored. The value itself is never answered by any operation.
- `updatedAt`: string (date-time) \| null — When the value last changed, or was first set; null when none is.

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `SECRET_NAME_RESERVED`, `STEP_UP_REQUIRED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

##### `setAppSecret` — Set the value of one of the app’s secrets

`PUT /v1/environments/{environmentId}/secrets/{name}`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `secret:write`. Sandbox/staging: session or token. PRODUCTION: session only AND step-up — a token is refused `403 TOKEN_CREDENTIAL_REFUSED` outright (no pending action).

> Stores the value for this environment, write-only: it is never answered back, and it reaches the app at the NEXT deploy of this environment — setting it redeploys nothing. A value may be set before manifest.yaml declares the name, and only a declared name is ever given to the app. A delegated token may set sandbox and staging values; a production value is set only in an interactive session that has stepped up in the last ten minutes, and a token asking is refused.

Parameters:
- `environmentId` (path, required): string (uuid) — The environment whose secrets these are.
- `name` (path, required): string — The variable’s name, as manifest.yaml’s `env` declares it: an upper-case letter, then upper-case letters, digits and underscores, at most 128 characters.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `SetAppSecretRequest`
- `value`: string [minLen 6] — The value, as text: at least 6 characters (a shorter one could not be redacted from the app’s Incidents), at most 16384 bytes of UTF-8, well-formed, with no NUL. Takes effect at the next deploy of this environment; it is never answered back.

Response `200` — `AppSecretStatus` — The name’s state — never its value.
- `name`: string — The variable’s name, as manifest.yaml’s `env` declares it: an upper-case letter, then upper-case letters, digits and underscores, at most 128 characters.
- `declared`: boolean — Whether the environment’s newest valid manifest.yaml declares this name with `secret: true`. Only a declared name reaches the app.
- `set`: boolean — Whether a value is stored. The value itself is never answered by any operation.
- `updatedAt`: string (date-time) \| null — When the value last changed, or was first set; null when none is.

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `SECRET_NAME_RESERVED`, `STEP_UP_REQUIRED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`


#### Tag `delivery`

From a commit to a running app (§11–§13): build it, release the build, deploy the release, and — for production — the approval an administrator gives. Incidents say why an instance failed.

##### `getBuild` — A build

`GET /v1/builds/{buildId}`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read` (checked against the build's own project).

> Its present status, image digest, the reason a failed build failed, and its scan (§12).

Parameters:
- `buildId` (path, required): string (uuid) — The build’s id, from `startBuild` or `listBuilds`.

Response `200` — `Build` — The build.
- `id`: string (uuid) — The build — what `getBuild`, `getBuildLog` and `createRelease` name.
- `projectId`: string (uuid) — Its project.
- `commitSha`: string — The commit built, whose own manifest.yaml it was built with.
- `status`: "pending" \| "running" \| "succeeded" \| "failed" — `running` from the moment it is started, then `succeeded` or `failed` — the stream says which as it happens. `pending` is not answered today.
- `imageDigest`: string \| null — `sha256:…` once the build has succeeded; the image a release names.
- `error`: string \| null — Why a failed build failed, in words its author can act on (§14).
- `scan`: `ScanSummary` \| null — Null until the build succeeds, and for a build from before scans were recorded.
- `createdAt`: string (date-time) — When it was started.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `getBuildLog` — A build’s log

`GET /v1/builds/{buildId}/logs`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> §14: every line, redacted at capture — or the last `tail`. Lines arrive live on the project’s event stream while the build runs; this is every one of them afterwards.

Parameters:
- `buildId` (path, required): string (uuid) — The build’s id, from `startBuild` or `listBuilds`.
- `tail` (query, optional): integer [min 1, max 10000] — Only the last this-many lines, 1 to 10000.

Response `200` — `BuildLog` — The log.
- `buildId`: string (uuid) — The build.
- `lines`: object[] — Every line, in order.
  - `seq`: integer [min 0] — Its position, from 0.
  - `stream`: "stdout" \| "stderr" — Which of the build’s outputs wrote it.
  - `text`: string — Redacted at capture (§14).
  - `at`: string (date-time) — When it was written.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `deploy` — Deploy a release to an environment

`POST /v1/environments/{environmentId}/deploy`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** Sandbox/staging: `release:deploy` (owner, collaborator, admin; mintable). PRODUCTION: `release:promote` (owner, admin — NOT collaborator) AND step-up for a session; PRIVILEGED, so a token gets `403 TOKEN_ACTION_PENDING`. Production is also gated by the launch checklist (`409 RELEASE_PRODUCTION_GATE_UNAVAILABLE` / `RELEASE_REESCALATED`, body carries `launchReadiness`).

> §22 step 5. Answers once the new instance serves, or once it has failed with an Incident — a failed deploy is a 200 whose state is `failed` (§14). The previous instance keeps serving until the new one is proved, and drains in the background. Up to ~90 s when a release never becomes ready. Production answers 409 with the checklist: a first launch’s, or — once launched — the self-serve check, re-escalated when a sensitive field changed (§13, D9). Production deploys only the release serving staging.

Parameters:
- `environmentId` (path, required): string (uuid) — The environment’s id, from `listEnvironments` — one each for sandbox, staging and production.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `DeployRequest`
- `releaseId`: string (uuid) — The release to deploy to the environment in the path.

Response `200` — `Instance` — The instance, healthy or failed.
- `id`: string (uuid) — The instance.
- `environmentId`: string (uuid) — The environment it runs in.
- `releaseId`: string (uuid) — The release it runs (`getRelease`).
- `kind`: "web" \| "worker" \| "cron" — What kind of process it is; `web`, which answers requests, is the only kind the platform runs today.
- `state`: "pending" \| "building" \| "provisioning" \| "starting" \| "healthy" \| "failed" \| "hibernated" \| "waking" \| "destroying" \| "gone" — Where it is in its life (§11): `provisioning` and `starting` on the way up, `healthy` when it serves, `failed` when it never did, and `destroying` then `gone` once replaced.
- `lastSeenAt`: string (date-time) \| null — When the platform last saw it running; null before it started.

Error codes: `AI_BACKEND_UNAVAILABLE`, `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `RELEASE_AI_BUDGET_MISSING`, `RELEASE_AI_DISABLED`, `RELEASE_DIGEST_MISSING`, `RELEASE_DIGEST_NOT_APPROVED`, `RELEASE_MODEL_CLASSIFICATION_TOO_LOW`, `RELEASE_MODEL_NOT_IN_CATALOGUE`, `RELEASE_MODEL_UNCLASSIFIED`, `RELEASE_NOT_FOUND`, `RELEASE_NOT_STAGED`, `RELEASE_PRODUCTION_GATE_UNAVAILABLE`, `RELEASE_REESCALATED`, `RELEASE_SECRET_NOT_SET`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `STEP_UP_REQUIRED`, `TOKEN_ACTION_PENDING`, `TOKEN_ACTION_REJECTED`, `UNAUTHENTICATED`

##### `listIncidents` — An environment’s incidents

`GET /v1/environments/{environmentId}/incidents`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> §14: each failed deploy’s exit, last 200 log lines, failing check and diff since the last healthy release, newest first, with its repair prompt.

Parameters:
- `environmentId` (path, required): string (uuid) — The environment’s id, from `listEnvironments` — one each for sandbox, staging and production.

Response `200` — `IncidentList` — The incidents.
- `environmentId`: string (uuid) — The environment.
- `incidents`: `Incident`[] — Newest first.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `listInstances` — An environment’s instances

`GET /v1/environments/{environmentId}/instances`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> §11: the environment’s instances, the one seen most recently first — at most 50 — each marked whether the hostname reaches it now. A failed instance stays listed after it is replaced, so an agent can find it and read its Incident; a running one’s last lines are `getInstanceOutput`.

Parameters:
- `environmentId` (path, required): string (uuid) — The environment’s id, from `listEnvironments` — one each for sandbox, staging and production.

Response `200` — `InstanceList` — The instances.
- `environmentId`: string (uuid) — The environment.
- `instances`: `InstanceSummary`[] — The environment’s instances, the one seen most recently first — at most 50. A failed instance stays listed after it is replaced, so an agent can read why it failed (`listIncidents`).
- `truncated`: boolean — True when the environment has had more than 50 instances and only the 50 seen most recently are listed.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `getInstanceOutput` — A running instance’s recent output

`GET /v1/instances/{instanceId}/output`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `output:read` (owner, collaborator, admin; mintable). A production instance is refused `403 INSTANCE_OUTPUT_PRODUCTION` to everyone.

> §14: the last lines a sandbox or staging instance printed, oldest first — read on request and never streamed or kept, bounded in lines (`lines`, 200 by default, at most 1000) and in bytes (256 KiB in all, each line cut at 4 KiB), and redacted at read with the rules that redact an Incident’s log tail. **Never production**: its output is refused, and its Incident is the only window onto it.

Parameters:
- `instanceId` (path, required): string (uuid) — The instance’s id, from `listInstances`, `getEnvironment` or `deploy`.
- `lines` (query, optional): integer [min 1, max 1000] — How many of the last lines to read: 200 by default, at most 1000.

Response `200` — `InstanceOutput` — The output.
- `instanceId`: string (uuid) — The instance.
- `environmentId`: string (uuid) — The environment it runs in.
- `environmentKind`: "sandbox" \| "staging" — Only sandbox and staging output is readable (§14).
- `readAt`: string (date-time) — When Manifest read it. Nothing is kept: read again to see newer lines.
- `lines`: object[] — The last lines the app printed, oldest first — redacted at read with the rules that redact an Incident’s log tail. At most `lines`, and fewer when a line the runtime stored in pieces began before the window.
  - `at`: string (date-time) — When the line was printed, as the runtime recorded it — or, when `stamped` is false, when Manifest read it.
  - `stamped`: boolean — Whether `at` is the runtime’s own time for the line.
  - `stream`: "stdout" \| "stderr" — Which of the app’s two outputs it printed to.
  - `text`: string — The line, redacted. A line longer than 4 KiB is cut and ends `…[cut: N bytes]`.
- `truncated`: object — Which bound the answer met.
  - `lines`: boolean — The app printed more lines than were read.
  - `bytes`: boolean — The lines read were more than 256 KiB together, and the oldest were dropped.
- `failure`: string \| null — Why reading stopped early, when it did — an error’s code or name, never its message. The lines before it are still answered.

Error codes: `FORBIDDEN`, `INSTANCE_OUTPUT_PRODUCTION`, `INSTANCE_OUTPUT_UNAVAILABLE`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `listBuilds` — A project’s builds

`GET /v1/projects/{projectId}/builds`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> The project’s newest 50 builds, newest first, each with its status, image digest and scan. A build in progress reads `running`; the event stream says when it ends.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.

Response `200` — `BuildList` — The builds.
- (array of `Build`)
  - `id`: string (uuid) — The build — what `getBuild`, `getBuildLog` and `createRelease` name.
  - `projectId`: string (uuid) — Its project.
  - `commitSha`: string — The commit built, whose own manifest.yaml it was built with.
  - `status`: "pending" \| "running" \| "succeeded" \| "failed" — `running` from the moment it is started, then `succeeded` or `failed` — the stream says which as it happens. `pending` is not answered today.
  - `imageDigest`: string \| null — `sha256:…` once the build has succeeded; the image a release names.
  - `error`: string \| null — Why a failed build failed, in words its author can act on (§14).
  - `scan`: `ScanSummary` \| null — Null until the build succeeds, and for a build from before scans were recorded.
  - `createdAt`: string (date-time) — When it was started.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `startBuild` — Build the project

`POST /v1/projects/{projectId}/builds`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `build:create` (owner, collaborator, admin; mintable).

> §22 step 4. Builds `commitSha` with THAT commit’s own manifest.yaml — its recorded validation, or one made now if nobody has validated it — and refuses `SPEC_INVALID` if it is not valid. With no `commitSha` it builds the commit of the project’s newest recorded validation, which is not necessarily `main`’s head: name the commit you mean. Answers 202 at once with the build `running`; its log lines arrive as `log` frames and its end as `build.succeeded` or `build.failed` on the project’s event stream. GET /v1/builds/{buildId} for the present state — a replayed Idempotency-Key answers the 202 as it was first sent.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `StartBuildRequest`
- `commitSha`: string *(optional)* — The full id of the commit to build. Without it, the commit of the project’s newest recorded validation — which need not be `main`’s head: name the commit you mean.

Response `202` — `Build` — The build, started.
- `id`: string (uuid) — The build — what `getBuild`, `getBuildLog` and `createRelease` name.
- `projectId`: string (uuid) — Its project.
- `commitSha`: string — The commit built, whose own manifest.yaml it was built with.
- `status`: "pending" \| "running" \| "succeeded" \| "failed" — `running` from the moment it is started, then `succeeded` or `failed` — the stream says which as it happens. `pending` is not answered today.
- `imageDigest`: string \| null — `sha256:…` once the build has succeeded; the image a release names.
- `error`: string \| null — Why a failed build failed, in words its author can act on (§14).
- `scan`: `ScanSummary` \| null — Null until the build succeeds, and for a build from before scans were recorded.
- `createdAt`: string (date-time) — When it was started.

Error codes: `AI_BACKEND_UNAVAILABLE`, `AI_CATALOGUE_EMPTY`, `BLUEPRINT_NOT_FOUND`, `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `SOURCE_COMMIT_NOT_FOUND`, `SOURCE_PROVIDER_MISMATCH`, `SOURCE_REPOSITORY_PUBLIC`, `SOURCE_UNREACHABLE`, `SPEC_INVALID`, `SPEC_NOT_FOUND`, `UNAUTHENTICATED`

##### `listReleases` — A project’s releases

`GET /v1/projects/{projectId}/releases`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> The project’s newest 50 releases, newest first. `deploy` names one; `getRelease` reads one.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.

Response `200` — `ReleaseList` — The releases.
- (array of `Release`)
  - `id`: string (uuid) — The release — what `deploy` names.
  - `projectId`: string (uuid) — Its project.
  - `buildId`: string (uuid) — The build it froze.
  - `appSpecId`: string (uuid) — The validation of manifest.yaml it froze — its build’s commit’s.
  - `imageDigest`: string — What an approval binds to (§13).
  - `summary`: string \| null — What it changes, in its author’s words; null when none was given.
  - `createdBy`: string (uuid) — Who made it.
  - `createdAt`: string (date-time) — When it was made.
  - `scan`: `ScanSummary` \| null — §12: its build’s scan, recorded on the Release.
  - `config`: object — What it runs as in each environment, resolved when it was made.
    - `sandbox`: object — One environment’s view of the release, frozen when it was made (§13).
      - `port`: integer — The port the app listens on.
      - `health`: string — The path its health check asks.
      - `resources`: object — What it may use in this environment — the blueprint’s defaults, overridden by manifest.yaml.
        - `cpu`: number — CPU cores.
        - `memory`: string — Memory, as `512Mi`.
        - `pids`: integer — The most processes and threads at once.
        - `disk`: string — Disk, as `2Gi`.
      - `services`: object[] — The backing services bound to it.
        - `type`: string — The service type.
        - `version`: string — Its version.
        - `name`: string — The app’s name for it.
      - `egressAllow`: string[] — The hostnames it may reach outside the platform.
      - `classification`: string — Its data classification (D17).
      - `auth`: object — Its sign-in (§9).
        - `provider`: "cwl" \| "none" — Whether it signs people in with CWL.
        - `attributes`: string[] — The CWL attributes it receives.
      - `ai`: object — Its AI (§10).
        - `models`: string[] — The logical models it may call.
      - `envNames`: string[] — The names of the variables the app declares — never their values.
    - `staging`: object — same shape as `sandbox` above
    - `production`: object — same shape as `sandbox` above

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `createRelease` — Release a build

`POST /v1/projects/{projectId}/releases`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `release:create` (owner, collaborator, admin; mintable).

> §13: an immutable release — the build’s digest, the spec that build was made from, and the configuration resolved from it for all three environments, frozen together. The build must be this project’s.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `CreateReleaseRequest`
- `buildId`: string (uuid) — A build that succeeded (`listBuilds`).
- `summary`: string [maxLen 500] *(optional)* — What this release changes, for the people who read it.

Response `201` — `Release` — The release.
- `id`: string (uuid) — The release — what `deploy` names.
- `projectId`: string (uuid) — Its project.
- `buildId`: string (uuid) — The build it froze.
- `appSpecId`: string (uuid) — The validation of manifest.yaml it froze — its build’s commit’s.
- `imageDigest`: string — What an approval binds to (§13).
- `summary`: string \| null — What it changes, in its author’s words; null when none was given.
- `createdBy`: string (uuid) — Who made it.
- `createdAt`: string (date-time) — When it was made.
- `scan`: `ScanSummary` \| null — §12: its build’s scan, recorded on the Release.
- `config`: object — What it runs as in each environment, resolved when it was made.
  - `sandbox`: object — One environment’s view of the release, frozen when it was made (§13).
    - `port`: integer — The port the app listens on.
    - `health`: string — The path its health check asks.
    - `resources`: object — What it may use in this environment — the blueprint’s defaults, overridden by manifest.yaml.
      - `cpu`: number — CPU cores.
      - `memory`: string — Memory, as `512Mi`.
      - `pids`: integer — The most processes and threads at once.
      - `disk`: string — Disk, as `2Gi`.
    - `services`: object[] — The backing services bound to it.
      - `type`: string — The service type.
      - `version`: string — Its version.
      - `name`: string — The app’s name for it.
    - `egressAllow`: string[] — The hostnames it may reach outside the platform.
    - `classification`: string — Its data classification (D17).
    - `auth`: object — Its sign-in (§9).
      - `provider`: "cwl" \| "none" — Whether it signs people in with CWL.
      - `attributes`: string[] — The CWL attributes it receives.
    - `ai`: object — Its AI (§10).
      - `models`: string[] — The logical models it may call.
    - `envNames`: string[] — The names of the variables the app declares — never their values.
  - `staging`: object — same shape as `sandbox` above
  - `production`: object — same shape as `sandbox` above

Error codes: `BLUEPRINT_NOT_FOUND`, `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `RELEASE_BUILD_NOT_DEPLOYABLE`, `RELEASE_BUILD_NOT_FOUND`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `UNAUTHENTICATED`

##### `getRelease` — A release

`GET /v1/releases/{releaseId}`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> One immutable release (§13): the build and the validation it froze, and what it runs as in each environment. `deploy` deploys it; to production only once `getLaunchReadiness` says the checklist is met.

Parameters:
- `releaseId` (path, required): string (uuid) — The release’s id, from `createRelease` or `listReleases`.

Response `200` — `Release` — The release.
- `id`: string (uuid) — The release — what `deploy` names.
- `projectId`: string (uuid) — Its project.
- `buildId`: string (uuid) — The build it froze.
- `appSpecId`: string (uuid) — The validation of manifest.yaml it froze — its build’s commit’s.
- `imageDigest`: string — What an approval binds to (§13).
- `summary`: string \| null — What it changes, in its author’s words; null when none was given.
- `createdBy`: string (uuid) — Who made it.
- `createdAt`: string (date-time) — When it was made.
- `scan`: `ScanSummary` \| null — §12: its build’s scan, recorded on the Release.
- `config`: object — What it runs as in each environment, resolved when it was made.
  - `sandbox`: object — One environment’s view of the release, frozen when it was made (§13).
    - `port`: integer — The port the app listens on.
    - `health`: string — The path its health check asks.
    - `resources`: object — What it may use in this environment — the blueprint’s defaults, overridden by manifest.yaml.
      - `cpu`: number — CPU cores.
      - `memory`: string — Memory, as `512Mi`.
      - `pids`: integer — The most processes and threads at once.
      - `disk`: string — Disk, as `2Gi`.
    - `services`: object[] — The backing services bound to it.
      - `type`: string — The service type.
      - `version`: string — Its version.
      - `name`: string — The app’s name for it.
    - `egressAllow`: string[] — The hostnames it may reach outside the platform.
    - `classification`: string — Its data classification (D17).
    - `auth`: object — Its sign-in (§9).
      - `provider`: "cwl" \| "none" — Whether it signs people in with CWL.
      - `attributes`: string[] — The CWL attributes it receives.
    - `ai`: object — Its AI (§10).
      - `models`: string[] — The logical models it may call.
    - `envNames`: string[] — The names of the variables the app declares — never their values.
  - `staging`: object — same shape as `sandbox` above
  - `production`: object — same shape as `sandbox` above

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `getApproval` — The latest decision about a release

`GET /v1/releases/{releaseId}/approval`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read` — any member (and a token) may read the decision.

> §13: the newest approval or rejection, with the diff it was made on. 404 when nobody has decided yet.

Parameters:
- `releaseId` (path, required): string (uuid) — The release’s id, from `createRelease` or `listReleases`.

Response `200` — `Approval` — The latest decision.
- `id`: string (uuid) — The decision.
- `releaseId`: string (uuid) — The release decided on.
- `projectId`: string (uuid) — Its project.
- `decision`: "approved" \| "rejected" — What the administrator decided; a rejection is final for this release.
- `decidedBy`: string (uuid) — Who decided.
- `decidedByName`: string — The display name of the person who decided — the owner meets a decision before anyone else, and a user id tells them nothing.
- `decidedAt`: string (date-time) — When.
- `imageDigest`: string — What this approval binds to (§13).
- `reason`: string \| null — Required on a rejection: a refusal with no words is one nobody can act on (D23.7).
- `diff`: `ApprovalDiff`
- `previewId`: string (uuid) \| null — The stored preview the administrator read, whose diff this record COPIES. Null only for a decision made before previews existed.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `createApprovalPreview` — Take the preview an administrator reads before deciding

`POST /v1/releases/{releaseId}/approval-preview`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `release:approve` = PLATFORM ADMIN only; NO step-up (a preview decides nothing). PERSON-ONLY.

> §13’s exact diff, computed NOW and STORED: the facts, the security notes, the reviewer’s verdict and the model’s summary. Approve and reject name it; the record copies it. No step-up — a preview decides nothing — but an interactive session and `release:approve` (§20). Valid for thirty minutes.

Parameters:
- `releaseId` (path, required): string (uuid) — The release’s id, from `createRelease` or `listReleases`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Response `201` — `ApprovalPreview` — The preview.
- `id`: string (uuid) — The preview — what `approveRelease` and `rejectRelease` name as `previewId`.
- `releaseId`: string (uuid) — The release it is of.
- `projectId`: string (uuid) — Its project.
- `createdBy`: string (uuid) — Who took it.
- `createdByName`: string — Who took it, by name.
- `createdAt`: string (date-time) — When it was taken.
- `expiresAt`: string (date-time) — Thirty minutes after it was taken. A decision naming it after this is refused `APPROVAL_PREVIEW_EXPIRED`; take a new one.
- `imageDigest`: string — The digest the preview was taken over (§13).
- `diff`: `ApprovalDiff`

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `RELEASE_DIGEST_MISSING`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `SOURCE_PROVIDER_MISMATCH`, `SOURCE_REPOSITORY_PUBLIC`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

##### `getApprovalPreview` — Re-read a stored preview

`GET /v1/releases/{releaseId}/approval-previews/{previewId}`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `release:approve` (platform admin). PERSON-ONLY.

> The preview exactly as it was taken — re-read, never recomputed — so a console coming back from the step-up round trip shows the administrator what they read before it. 404 for a preview of another release.

Parameters:
- `previewId` (path, required): string (uuid) — The preview’s id, from `createApprovalPreview`.
- `releaseId` (path, required): string (uuid) — The release’s id, from `createRelease` or `listReleases`.

Response `200` — `ApprovalPreview` — The preview.
- `id`: string (uuid) — The preview — what `approveRelease` and `rejectRelease` name as `previewId`.
- `releaseId`: string (uuid) — The release it is of.
- `projectId`: string (uuid) — Its project.
- `createdBy`: string (uuid) — Who took it.
- `createdByName`: string — Who took it, by name.
- `createdAt`: string (date-time) — When it was taken.
- `expiresAt`: string (date-time) — Thirty minutes after it was taken. A decision naming it after this is refused `APPROVAL_PREVIEW_EXPIRED`; take a new one.
- `imageDigest`: string — The digest the preview was taken over (§13).
- `diff`: `ApprovalDiff`

Error codes: `FORBIDDEN`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

##### `approveRelease` — Approve a release for production

`POST /v1/releases/{releaseId}/approve`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `release:approve` (platform admin) AND step-up. PERSON-ONLY: a token is refused, never offered a pending action. `previewId` required.

> §13’s *Integrity of the gate*: the approval binds the release’s immutable image digest, records who decided and when, and stores the exact diff shown at decision time — COPIED from the stored preview it names, whose facts are recomputed and must not have moved. `previewId` is optional in the request schema and REQUIRED here (`400 APPROVAL_PREVIEW_REQUIRED`). It requires step-up re-authentication (§20) and an interactive session (D14). A later rebuild produces a new digest, which this approval does not cover.

Parameters:
- `releaseId` (path, required): string (uuid) — The release’s id, from `createRelease` or `listReleases`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `ApproveReleaseRequest`
- `reason`: string [maxLen 2000] *(optional)* — Why, in the administrator’s words; optional on an approval.
- `previewId`: string (uuid) *(optional)* — The preview the administrator read (`POST /v1/releases/{releaseId}/approval-preview`). Optional in this schema and REQUIRED by the operation: without it the answer is `400 APPROVAL_PREVIEW_REQUIRED`.

Response `201` — `Approval` — The approval, with the diff it was made on.
- `id`: string (uuid) — The decision.
- `releaseId`: string (uuid) — The release decided on.
- `projectId`: string (uuid) — Its project.
- `decision`: "approved" \| "rejected" — What the administrator decided; a rejection is final for this release.
- `decidedBy`: string (uuid) — Who decided.
- `decidedByName`: string — The display name of the person who decided — the owner meets a decision before anyone else, and a user id tells them nothing.
- `decidedAt`: string (date-time) — When.
- `imageDigest`: string — What this approval binds to (§13).
- `reason`: string \| null — Required on a rejection: a refusal with no words is one nobody can act on (D23.7).
- `diff`: `ApprovalDiff`
- `previewId`: string (uuid) \| null — The stored preview the administrator read, whose diff this record COPIES. Null only for a decision made before previews existed.

Error codes: `APPROVAL_PREVIEW_EXPIRED`, `APPROVAL_PREVIEW_REQUIRED`, `APPROVAL_PREVIEW_STALE`, `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `RELEASE_DIGEST_MISSING`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `STEP_UP_REQUIRED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

##### `rejectRelease` — Decline to approve a release for production

`POST /v1/releases/{releaseId}/reject`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `release:approve` (platform admin) AND step-up. PERSON-ONLY. `reason` and `previewId` required.

> §13, and the same four guards as approving, naming a preview the same way. **The reason is REQUIRED**: a refusal a faculty member is told about, with no words in it, is a refusal nobody can act on (D23.7) — the request schema is the first half of that rule and the `approvals_rejection_has_reason` CHECK is the second.

Parameters:
- `releaseId` (path, required): string (uuid) — The release’s id, from `createRelease` or `listReleases`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `RejectReleaseRequest`
- `reason`: string [minLen 1, maxLen 2000] — Why, in the administrator’s words — required: a refusal with no words is one nobody can act on.
- `previewId`: string (uuid) *(optional)* — The preview the administrator read (`POST /v1/releases/{releaseId}/approval-preview`). Optional in this schema and REQUIRED by the operation: without it the answer is `400 APPROVAL_PREVIEW_REQUIRED`.

Response `201` — `Approval` — The rejection, with the diff it was made on.
- `id`: string (uuid) — The decision.
- `releaseId`: string (uuid) — The release decided on.
- `projectId`: string (uuid) — Its project.
- `decision`: "approved" \| "rejected" — What the administrator decided; a rejection is final for this release.
- `decidedBy`: string (uuid) — Who decided.
- `decidedByName`: string — The display name of the person who decided — the owner meets a decision before anyone else, and a user id tells them nothing.
- `decidedAt`: string (date-time) — When.
- `imageDigest`: string — What this approval binds to (§13).
- `reason`: string \| null — Required on a rejection: a refusal with no words is one nobody can act on (D23.7).
- `diff`: `ApprovalDiff`
- `previewId`: string (uuid) \| null — The stored preview the administrator read, whose diff this record COPIES. Null only for a decision made before previews existed.

Error codes: `APPROVAL_PREVIEW_EXPIRED`, `APPROVAL_PREVIEW_REQUIRED`, `APPROVAL_PREVIEW_STALE`, `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `RELEASE_DIGEST_MISSING`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `STEP_UP_REQUIRED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`


#### Tag `events`

The project’s event stream (D23.2): every audit event and build log line, live, over a WebSocket.

##### `streamProjectEvents` — The project’s event stream (WebSocket)

`GET /v1/projects/{projectId}/events`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`. A session-bearing upgrade must carry the console `Origin`; a token of the project may subscribe with no Origin.

> Upgrade to a WebSocket. Builds, their log lines, instance state transitions, incidents and every other audit event for this project, as StreamFrames: the newest events first as a replay, then the ready frame, then live. A session-bearing upgrade must carry Origin (§20); a delegated token of this project may read it too. A plain GET answers 426. `x-manifest-event-types` lists every event type with what it means and an example of its `machineDetail`.

Parameters:
- `projectId` (path, required): string (uuid) — The project whose events to stream (`listProjects`).

Response `101`: Switching Protocols. Every message is one StreamFrame, as JSON.

Response `426` — `ErrorEnvelope` — This endpoint is a WebSocket; a plain GET is answered EVENTS_UPGRADE_REQUIRED.

Error codes: `CSRF_ORIGIN_REFUSED`, `EVENTS_UPGRADE_REQUIRED`, `INTERNAL`, `NOT_FOUND`, `UNAUTHENTICATED`


#### Tag `launch`

A first production launch (§9, §13): the checklist computed from what exists, the external records UBC’s IAM and Privacy Office decisions are kept in, and the sign-in rehearsal.

##### `getLaunchReadiness` — What a production release still needs

`GET /v1/projects/{projectId}/launch-readiness`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> §13 and §22 step 7: the checklist, computed from what exists, surfaced from the moment a project exists — a first launch’s, or once launched the self-serve check, where only a sensitive change needs an administrator (D9). The production deploy is refused with this exact value until every blocking item is met.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.

Response `200` — `LaunchReadiness` — The checklist.
- `projectId`: string (uuid) — The project.
- `launched`: boolean — Which of D9’s two clauses this is: false, the first launch’s checklist; true, a launched app’s, where a release goes to production self-serve unless it changes a sensitive field (§13).
- `ready`: boolean — Whether every blocking item is met — a production deploy is refused until it is.
- `candidateReleaseId`: string (uuid) \| null — The release serving staging — what production would run; null when nothing serves staging.
- `baselineReleaseId`: string (uuid) \| null — The last approved release the candidate is compared with (D9.2); null before launch, or when nothing else is approved.
- `sensitiveFields`: ("services" \| "auth.attributes" \| "egress.allow" \| "resources" \| "data.classification" \| "ai.models" \| "blueprint")[] — §7’s fields the candidate changes since that release; empty before launch.
- `reescalated`: boolean — An administrator’s approval is what this release is waiting for — a sensitive change, not rejected, and nothing else unmet (§13 D9.2).
- `items`: `LaunchReadinessItem`[] — Every item, met or not.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `getLaunchRecords` — The IAM registration and the privacy assessment, as recorded

`GET /v1/projects/{projectId}/launch-records`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`.

> §9 and D19. Manifest tracks both; an administrator records what UBC IAM and the Privacy Office said, with the ticket reference. Manifest does not yet generate what they carry. Either may be absent, which is a state and not an error.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.

Response `200` — `LaunchRecords` — Both records, either of which may be null.
- `projectId`: string (uuid) — The project.
- `iamRegistration`: `IamRegistration` \| null — What UBC IAM registered; null until an administrator records something.
- `privacyAssessment`: `PrivacyAssessment` \| null — What the Privacy Office said; null until an administrator records something.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `recordIamRegistration` — Record what UBC IAM registered

`POST /v1/projects/{projectId}/launch-records/iam-registration`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `launch:record` = PLATFORM ADMIN only. PERSON-ONLY. No step-up.

> §9 and D19: a platform administrator records the Service Provider UBC IAM registered, with the ticket reference pasted in. The state is reached along §9’s arrows from wherever the record is, so a first write straight into `active` is refused exactly as a later one is. **A change request is the registration’s own `change_requested` state**: once UBC has registered the SP, `registeredAttributes`, `acsUrl` and `sloUrl` change only on a record that reaches `active`, the entityID never changes, and what is asked for goes in `requestedAttributes` — required when filing one from `active` (`LAUNCH_RECORD_INVALID` otherwise). A later Manifest release will submit these itself; the object and its states will not change when it does.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `RecordIamRegistrationRequest`
- `entityId`: string [minLen 1, maxLen 512] — The entityID UBC IAM registered — fixed once registered.
- `acsUrl`: string [minLen 1, maxLen 512] — The assertion consumer URL registered.
- `sloUrl`: string [minLen 1, maxLen 512] — The single-logout URL registered.
- `registeredAttributes`: string [minLen 1][] — Exactly the attributes UBC IAM registered, as the ticket lists them. Once registered, a record that does not reach `active` must repeat them unchanged.
- `requestedAttributes`: string [minLen 1][] *(optional)* — What a change request asks for; required when a registration goes from `active` to `change_requested`.
- `state`: "draft" \| "submitted" \| "active" \| "change_requested" \| "expired" — The state this record should now be in. It is reached along §9’s arrows from wherever it is — a first write into `active` is refused exactly as a later one is.
- `externalTicketRef`: string [minLen 1, maxLen 128] *(optional)* — UBC IAM’s ticket reference, pasted in.
- `certFingerprint`: string [minLen 1, maxLen 256] *(optional)* — The fingerprint of the signing certificate registered.
- `certExpiresAt`: string (date-time) *(optional)* — When that certificate expires (D20).

Response `200` — `IamRegistration` — The registration as it now stands.
- `id`: string (uuid) — The record.
- `projectId`: string (uuid) — Its project.
- `entityId`: string — §9: fixed at registration and stored here rather than recomputed — which is also why a project slug is immutable after production launch.
- `acsUrl`: string — The assertion consumer URL registered — where sign-ins are sent.
- `sloUrl`: string — The single-logout URL registered.
- `certFingerprint`: string \| null — The fingerprint of the signing certificate registered; null when none was recorded.
- `certExpiresAt`: string (date-time) \| null — D20: an unnoticed expiry silently kills login for a live course app.
- `registeredAttributes`: string[] — WHAT UBC IAM ACTUALLY REGISTERED. A production build fails when a release asks for an attribute that is not in here (§7). Once registered, it changes only on a record that reaches `active` — a change UBC has not registered yet is `requestedAttributes`.
- `requestedAttributes`: string[] \| null — What an outstanding CHANGE REQUEST asks UBC IAM for (§9) — the registration’s own `change_requested` state is the change request. Null when none is outstanding; cleared when the registration is recorded `active` again.
- `registeredAt`: string (date-time) \| null — When UBC IAM last registered this Service Provider — set when the record reaches `active`. Null until the first time; a launched app’s releases need it (§13, D9).
- `state`: "draft" \| "submitted" \| "active" \| "change_requested" \| "expired" — Along §9’s states: `draft`, `submitted` to UBC IAM, `active` once registered, `change_requested` while a change is with UBC IAM, and `expired`.
- `externalTicketRef`: string \| null — UBC IAM’s own reference for the request; null when none was recorded.
- `updatedAt`: string (date-time) — When the record last changed.

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `LAUNCH_RECORD_INVALID`, `LAUNCH_TRANSITION_INVALID`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

##### `recordPrivacyAssessment` — Record what the Privacy Office said

`POST /v1/projects/{projectId}/launch-records/privacy-assessment`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `launch:record` (platform admin). PERSON-ONLY. No step-up.

> §9 and D19: a platform administrator records it, in the same shape as the IAM registration, over §9’s three PIA states. There is deliberately no rejection state — a refused assessment goes back to `draft` with the reviewer’s note, which is what the Privacy Office actually does.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `RecordPrivacyAssessmentRequest`
- `state`: "draft" \| "submitted" \| "approved" — The state this record should now be in, reached along §9’s arrows.
- `reviewer`: string [minLen 1, maxLen 128] *(optional)* — Who at the Privacy Office reviewed it.
- `externalTicketRef`: string [minLen 1, maxLen 128] *(optional)* — The Privacy Office’s reference, pasted in.

Response `200` — `PrivacyAssessment` — The assessment as it now stands.
- `id`: string (uuid) — The record.
- `projectId`: string (uuid) — Its project.
- `state`: "draft" \| "submitted" \| "approved" — Along §9’s states: `draft`, `submitted` to the Privacy Office, `approved`. A refused assessment goes back to `draft`.
- `reviewer`: string \| null — Who at the Privacy Office reviewed it; null until recorded.
- `approvedAt`: string (date-time) \| null — When it was approved; null until it is.
- `externalTicketRef`: string \| null — The Privacy Office’s own reference; null when none was recorded.
- `updatedAt`: string (date-time) — When the record last changed.

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `LAUNCH_TRANSITION_INVALID`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

##### `runRehearsal` — Run the pre-production rehearsal

`POST /v1/projects/{projectId}/rehearsal`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `launch:record` (platform admin). PERSON-ONLY. No step-up. Synchronous, up to ~90 s.

> D21, run on this platform: deploys the candidate release into production behind the gate, registers its Service Provider with production-shaped values, completes one CWL sign-in and records pass or fail with the evidence. It proves the registration’s SHAPE, never UBC’s acceptance of it. Refused once the app has launched (`REHEARSAL_LAUNCHED`): after launch it would put an unapproved candidate on the live listener. Up to ~90 s.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Response `200` — `Rehearsal` — The rehearsal, passed or failed. A failure is a 200 with `passed: false` and the reason in its evidence — it is a MEASUREMENT, and a measurement that came out badly is not a request error.
- `id`: string (uuid) — The rehearsal.
- `projectId`: string (uuid) — Its project.
- `releaseId`: string (uuid) — The candidate release rehearsed — the one serving staging.
- `passed`: boolean — Whether a production-shaped CWL sign-in worked.
- `entityId`: string — The entityID the Service Provider was registered under when this ran — read off the registration, never recomputed.
- `acsUrl`: string — Where the sign-in’s assertion was sent.
- `attributes`: string[] — The attributes the registration listed when it ran, compared with what the candidate release would register now.
- `evidence`: object — What the rehearsal saw — measured, not assumed.
  - `instanceId`: string (uuid) \| null — The production instance it deployed; null if none started.
  - `hostname`: string — The hostname the sign-in went to.
  - `listener`: "internal" \| "public" — Which of the edge’s listeners the app answered on (§12).
  - `signInStatus`: integer \| null — What the app answered at its registered ACS, or null when no assertion was produced.
  - `attributesReleased`: string[] — What the assertion ACTUALLY carried, as friendly names where the platform knows one. §9’s attribute release, measured rather than assumed.
  - `reason`: string — Why it passed or did not, in the platform’s words.
- `ranAt`: string — When it ran, ISO 8601 in UTC.

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REHEARSAL_DEPLOY_FAILED`, `REHEARSAL_LAUNCHED`, `REHEARSAL_NOT_CWL`, `REHEARSAL_NO_CANDIDATE`, `RELEASE_DIGEST_MISSING`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`


#### Tag `pending-actions`

D24’s questions: a delegated token that asks for a privileged action waits here until a person confirms or rejects it.

##### `getPendingAction` — One pending action

`GET /v1/pending-actions/{pendingActionId}`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read` on the action's project. A token sees only questions IT asked (others are 404).

> What an agent asked for, and what a person decided. An agent polls its own question here rather than retrying a refused request to find out; anyone who can read the project reads the project’s. A question the caller may not see is answered 404, the same as one that does not exist.

Parameters:
- `pendingActionId` (path, required): string (uuid) — The pending action’s id, from `listPendingActions` or a `TOKEN_ACTION_PENDING` refusal’s `pendingAction`.

Response `200` — `PendingAction` — The pending action.
- `id`: string (uuid) — The question — what `confirmPendingAction` and `rejectPendingAction` name.
- `projectId`: string (uuid) — The project it was asked on.
- `tokenId`: string (uuid) — The delegated token that asked (`listTokens`).
- `action`: string — The privileged capability that was refused — one of D24’s four.
- `state`: "pending" \| "confirmed" \| "rejected" \| "expired" — `pending` until a person answers; `confirmed` grants the identical request one retry; `rejected` is final; `expired` when nobody answered in time.
- `method`: string — The HTTP method the token used.
- `path`: string — The path it asked for.
- `bodySha256`: string — SHA-256 of the canonical request body, so a client can match its own.
- `summary`: string — What was asked for, for the person who answers.
- `expiresAt`: string (date-time) — When the question lapses unanswered.
- `createdAt`: string (date-time) — When the token asked.
- `resolvedAt`: string (date-time) \| null — When a person answered; null while it is pending.
- `waitingSeconds`: integer [min 0] — Seconds between the question being asked and it being answered — or, while it is still pending, now.
- `reason`: string \| null — A rejection’s reason, in the person’s words — what the agent is told; null otherwise.
- `consumedAt`: string (date-time) \| null — When the confirmed retry was made, spending the confirmation; null until then.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `confirmPendingAction` — Confirm a pending action

`POST /v1/pending-actions/{pendingActionId}/confirm`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; the person must HOLD the refused capability themselves (e.g. `members:manage`, `release:promote` — so owner/admin, not collaborator) AND be stepped up for it. A stranger is 404.

> D24: lets the agent’s refused request through, ONCE. It grants that exact request — this token, this method, this path, this body — a single retry, which the agent makes itself; nothing is executed here on its behalf, and the retry is validated by its own route as any request is. Only a person who holds the capability themselves may confirm, and only in an interactive session.

Parameters:
- `pendingActionId` (path, required): string (uuid) — The pending action’s id, from `listPendingActions` or a `TOKEN_ACTION_PENDING` refusal’s `pendingAction`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `EmptyRequest`


Response `200` — `PendingAction` — The pending action, confirmed. `consumedAt` is null until the retry.
- `id`: string (uuid) — The question — what `confirmPendingAction` and `rejectPendingAction` name.
- `projectId`: string (uuid) — The project it was asked on.
- `tokenId`: string (uuid) — The delegated token that asked (`listTokens`).
- `action`: string — The privileged capability that was refused — one of D24’s four.
- `state`: "pending" \| "confirmed" \| "rejected" \| "expired" — `pending` until a person answers; `confirmed` grants the identical request one retry; `rejected` is final; `expired` when nobody answered in time.
- `method`: string — The HTTP method the token used.
- `path`: string — The path it asked for.
- `bodySha256`: string — SHA-256 of the canonical request body, so a client can match its own.
- `summary`: string — What was asked for, for the person who answers.
- `expiresAt`: string (date-time) — When the question lapses unanswered.
- `createdAt`: string (date-time) — When the token asked.
- `resolvedAt`: string (date-time) \| null — When a person answered; null while it is pending.
- `waitingSeconds`: integer [min 0] — Seconds between the question being asked and it being answered — or, while it is still pending, now.
- `reason`: string \| null — A rejection’s reason, in the person’s words — what the agent is told; null otherwise.
- `consumedAt`: string (date-time) \| null — When the confirmed retry was made, spending the confirmation; null until then.

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `PENDING_ACTION_RESOLVED`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `STEP_UP_REQUIRED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

##### `rejectPendingAction` — Reject a pending action

`POST /v1/pending-actions/{pendingActionId}/reject`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; the person must hold the refused capability themselves; NO step-up (rejecting is the safe direction).

> D24: refuses the agent’s request, in the person’s own words. A retry of that exact request is then answered TOKEN_ACTION_REJECTED carrying the reason, so the agent stops asking rather than looping — which is what D23.7 means by an error an agent can correct itself from.

Parameters:
- `pendingActionId` (path, required): string (uuid) — The pending action’s id, from `listPendingActions` or a `TOKEN_ACTION_PENDING` refusal’s `pendingAction`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `RejectPendingActionRequest`
- `reason`: string [minLen 1, maxLen 500] — Why this is refused. The agent is told, verbatim.

Response `200` — `PendingAction` — The pending action, rejected, with the reason it carries.
- `id`: string (uuid) — The question — what `confirmPendingAction` and `rejectPendingAction` name.
- `projectId`: string (uuid) — The project it was asked on.
- `tokenId`: string (uuid) — The delegated token that asked (`listTokens`).
- `action`: string — The privileged capability that was refused — one of D24’s four.
- `state`: "pending" \| "confirmed" \| "rejected" \| "expired" — `pending` until a person answers; `confirmed` grants the identical request one retry; `rejected` is final; `expired` when nobody answered in time.
- `method`: string — The HTTP method the token used.
- `path`: string — The path it asked for.
- `bodySha256`: string — SHA-256 of the canonical request body, so a client can match its own.
- `summary`: string — What was asked for, for the person who answers.
- `expiresAt`: string (date-time) — When the question lapses unanswered.
- `createdAt`: string (date-time) — When the token asked.
- `resolvedAt`: string (date-time) \| null — When a person answered; null while it is pending.
- `waitingSeconds`: integer [min 0] — Seconds between the question being asked and it being answered — or, while it is still pending, now.
- `reason`: string \| null — A rejection’s reason, in the person’s words — what the agent is told; null otherwise.
- `consumedAt`: string (date-time) \| null — When the confirmed retry was made, spending the confirmation; null until then.

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `PENDING_ACTION_RESOLVED`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

##### `listPendingActions` — The questions agents are waiting on

`GET /v1/projects/{projectId}/pending-actions`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read`. A session sees every question on the project; a token sees only its own.

> §26’s queue for one project, newest first. A person who can read the project sees every question; a delegated token sees only the ones it asked itself. Answered and expired questions stay in the list — `waitingSeconds` on a resolved row is how long the agent waited for its answer.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.

Response `200` — `PendingActionList` — The project’s pending actions, newest first.
- (array of `PendingAction`)
  - `id`: string (uuid) — The question — what `confirmPendingAction` and `rejectPendingAction` name.
  - `projectId`: string (uuid) — The project it was asked on.
  - `tokenId`: string (uuid) — The delegated token that asked (`listTokens`).
  - `action`: string — The privileged capability that was refused — one of D24’s four.
  - `state`: "pending" \| "confirmed" \| "rejected" \| "expired" — `pending` until a person answers; `confirmed` grants the identical request one retry; `rejected` is final; `expired` when nobody answered in time.
  - `method`: string — The HTTP method the token used.
  - `path`: string — The path it asked for.
  - `bodySha256`: string — SHA-256 of the canonical request body, so a client can match its own.
  - `summary`: string — What was asked for, for the person who answers.
  - `expiresAt`: string (date-time) — When the question lapses unanswered.
  - `createdAt`: string (date-time) — When the token asked.
  - `resolvedAt`: string (date-time) \| null — When a person answered; null while it is pending.
  - `waitingSeconds`: integer [min 0] — Seconds between the question being asked and it being answered — or, while it is still pending, now.
  - `reason`: string \| null — A rejection’s reason, in the person’s words — what the agent is told; null otherwise.
  - `consumedAt`: string (date-time) \| null — When the confirmed retry was made, spending the confirmation; null until then.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`


#### Tag `tokens`

Delegated tokens (D24): a person mints one for an agent, scoped to one project and a list of capabilities, and revokes it.

##### `listTokens` — A project’s delegated tokens

`GET /v1/projects/{projectId}/tokens`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `project:read` (so a collaborator sees every token on the project, not only their own).

> Every token scoped to this project, newest first, including the revoked and the expired — §20 asks for a list a person can review, and one that showed only the live ones would answer "what has been able to act here" in the present tense alone. No secret is in it.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.

Response `200` — `TokenList` — The project’s tokens, newest first.
- (array of `Token`)
  - `id`: string (uuid) — The token — what `revokeToken` names, and the `<id>` in its secret.
  - `projectId`: string (uuid) — The one project it may act on.
  - `name`: string — The label its minter gave it.
  - `capabilities`: string[] — What it may do on that project (D24); nothing else.
  - `rateLimit`: integer — Requests a minute this token may make, enforced in the control plane (§20). Past it, every route answers 429 RATE_LIMITED with Retry-After.
  - `expiresAt`: string (date-time) — When it stops working.
  - `expired`: boolean — Whether this token is past its own expiresAt. Computed by the platform; a revoked token that has not expired is not expired.
  - `revokedAt`: string (date-time) \| null — When a person revoked it; null while it is not revoked. A revoked token is refused `UNAUTHENTICATED`.
  - `lastUsedAt`: string (date-time) \| null — When it last authenticated a request; null if never.
  - `createdAt`: string (date-time) — When it was minted.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

##### `mintToken` — Mint a delegated token

`POST /v1/projects/{projectId}/tokens`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `project:write`. May grant only capabilities the minter holds, and never the privileged four or the person-only two (`TOKEN_CAPABILITY_FORBIDDEN`).

> D24: a credential an agent holds, scoped to this project and to an explicit capability set, with an expiry. The secret is in this response and nowhere else — the platform keeps only a hash of it: store it now, because `listTokens` never shows it, and a retry of this mint with the same Idempotency-Key answers `409 TOKEN_ALREADY_MINTED` naming the token rather than the secret again (revoke it and mint again if the first answer was lost). A token may never hold members:manage, release:promote, quota:set or secret:read, nor release:approve or launch:record, which are person-only: a person does them, and no confirmation grants them. And never more than the person minting it holds themselves.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Request body (required, JSON): `MintTokenRequest`
- `name`: string [minLen 1, maxLen 64] — A person’s label for it, so a list of tokens is reviewable.
- `capabilities`: ("project:read" \| "project:write" \| "project:delete" \| "source:write" \| "secret:write" \| "output:read" \| "members:manage" \| "build:create" \| "release:create" \| "release:deploy" \| "release:promote" \| "release:approve" \| "launch:record" \| "quota:set" \| "secret:read")[] — The explicit set this token may use (D24). None of members:manage, release:promote, quota:set or secret:read: those are refused to a delegated token however it was minted. Nor release:approve or launch:record, which are person-only and refused outright.
- `expiresInDays`: integer [min 1, max 365] — How long the token lives, in days. D24: a token has an expiry, and at most 365 days of one.

Response `201` — `MintedToken` — The token, and its secret — the only time the secret exists.
- `token`: `Token`
- `secret`: string — The token, in full: `mft_<id>_<secret>` — what an agent sends as `Authorization: Bearer`. Store it now: it is in this answer and nowhere else. `listTokens` never shows it, and a retry of this mint with the same Idempotency-Key answers `409 TOKEN_ALREADY_MINTED` naming the token, never the secret again.

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `TOKEN_ALREADY_MINTED`, `TOKEN_CAPABILITY_FORBIDDEN`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

##### `revokeToken` — Revoke a delegated token

`DELETE /v1/tokens/{tokenId}`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; ONLY the person who minted the token (anyone else, owners included, gets 404).

> Stops the token authenticating, from the next request onwards. Only the person who minted it may revoke it, and anyone else is answered 404 — the same answer a token id that does not exist gets, so the route cannot be used to discover which ids do. Revoking twice is idempotent.

Parameters:
- `tokenId` (path, required): string (uuid) — The token’s id, from `listTokens`.
- `Idempotency-Key` (header, required): string [minLen 8] — D23.6. One per user action, reused across retries of THAT action.

Response `200` — `Token` — The token, with its revocation stamped.
- `id`: string (uuid) — The token — what `revokeToken` names, and the `<id>` in its secret.
- `projectId`: string (uuid) — The one project it may act on.
- `name`: string — The label its minter gave it.
- `capabilities`: string[] — What it may do on that project (D24); nothing else.
- `rateLimit`: integer — Requests a minute this token may make, enforced in the control plane (§20). Past it, every route answers 429 RATE_LIMITED with Retry-After.
- `expiresAt`: string (date-time) — When it stops working.
- `expired`: boolean — Whether this token is past its own expiresAt. Computed by the platform; a revoked token that has not expired is not expired.
- `revokedAt`: string (date-time) \| null — When a person revoked it; null while it is not revoked. A revoked token is refused `UNAUTHENTICATED`.
- `lastUsedAt`: string (date-time) \| null — When it last authenticated a request; null if never.
- `createdAt`: string (date-time) — When it was minted.

Error codes: `CSRF_ORIGIN_REFUSED`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`


#### Tag `docs`

This documentation, served: the guides for a person writing a client and for an AI agent, the reference generated from this document, and the document itself.

##### `listDocs` — The API’s documentation

`GET /v1/docs`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** any credential, no capability.

> Every page of the API’s documentation, with the sentence that says what each is for — the guides for a person writing a client and for an AI agent, and the reference generated from this document. An agent’s first call is `getDoc` for `agents`. Any credential may read them.

Response `200` — `DocIndex` — Every page.
- `pages`: object[] — Every page, the index first, then the guides, then the generated reference.
  - `slug`: string — The page’s name in `getDoc`: its path under the documentation without `.md`, `/` as `-` — `reference-errors` is `reference/errors.md`.
  - `title`: string — The page’s title — its first heading.
  - `summary`: string — The page’s first paragraph: what it is for and who it is for, in a sentence or two.

Error codes: `INTERNAL`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `getDoc` — A page of the documentation

`GET /v1/docs/{slug}`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** any credential, no capability.

> One page, as Markdown. Its links name other pages by their file (`authoring.md`); read each by its slug. Any credential may read it.

Parameters:
- `slug` (path, required): string [maxLen 128] — The page’s `slug`, as `listDocs` answers it — `agents`, `reference-errors`.

Response `200` — `DocPage` — The page.
- `slug`: string — The page’s name in `getDoc`: its path under the documentation without `.md`, `/` as `-` — `reference-errors` is `reference/errors.md`.
- `title`: string — The page’s title — its first heading.
- `markdown`: string — The page, as Markdown. Its links name other pages by their file, as `authoring.md` — `getDoc` reads each by its slug.

Error codes: `DOC_NOT_FOUND`, `INTERNAL`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

##### `getOpenApiDocument` — This OpenAPI document

`GET /v1/openapi.json`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** any credential, no capability.

> The OpenAPI 3.1 document describing every operation, representation, error code and event — generated from the platform’s own route definitions when it starts, so it is exactly the document the platform publishes. Any credential may read it.

Response `200` — `OpenApiDocument` — The document.


Error codes: `INTERNAL`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`


#### Tag `administration`

Operations for the platform’s administrators — today, every project on the platform at a glance (§26).

##### `listFleet` — Every app on the platform

`GET /v1/fleet`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; platform role `admin` (anyone else `403 FORBIDDEN`).

> §26: the fleet, for platform administrators — an admin-scoped read on the one public API (D31), not a second API. Everyone else is refused 403, and so is every delegated token however it was minted (D24): this is cross-tenant data and a token is scoped to one project.

Response `200` — `Fleet` — The fleet, newest project first.
- (array of object)
  - `id`: string (uuid) — The project.
  - `slug`: string — Its name (§23).
  - `blueprint`: string — Its blueprint, `name@major`.
  - `starter`: string \| null — Its starter; null for the skeleton alone.
  - `owner`: object — Its owner of record.
    - `id`: string (uuid) — Their user id.
    - `displayName`: string — Their name.
    - `email`: string — Their address.
  - `audience`: `Audience` \| null — Who it is for (§24); null for a project created before the question was asked.
  - `createdAt`: string (date-time) — When it was created.
  - `slugReserved`: boolean — §23: holds a label reserved after it was created. Handle with the owner; never renamed automatically.
  - `environments`: object[] — Its three environments, and what each is running.
    - `kind`: "sandbox" \| "staging" \| "production" — Which environment.
    - `hostname`: string — Its hostname (§23).
    - `state`: string \| null — The serving instance’s state; null before any deploy.
    - `releaseId`: string (uuid) \| null — The release serving; null before any deploy.
    - `imageDigest`: string \| null — The image that release runs; null before any deploy.
    - `lastDeployAt`: string (date-time) \| null — When it was last deployed.
    - `latestIncidentAt`: string (date-time) \| null — When its newest Incident was recorded; null if it has none.

Error codes: `FORBIDDEN`, `INTERNAL`, `RATE_LIMITED`, `REQUEST_INVALID`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`



---

## 4. The event stream

### 4.1 Subscribing

- **URL**: `wss://<console origin>/v1/projects/{projectId}/events` — a WebSocket upgrade of `GET` (operation
  `streamProjectEvents`; OpenAPI cannot describe a socket, so the conversation is in the operation's `x-manifest-websocket`).
  **One stream per project**; there is no cross-project or per-user stream.
- **Auth**: authorized BEFORE the upgrade with `project:read`. A session upgrade carries the cookie and must carry the
  console's `Origin` (a browser does both itself — `new WebSocket(url)`); a token upgrade carries
  `Authorization: Bearer …` (Node's undici WebSocket takes headers; **a browser WebSocket cannot send an Authorization
  header**, so a browser can only subscribe with the session cookie).
- **Protocol**: every message is one JSON **`StreamFrame`**, one of three kinds — switch on `kind`, then `type`:
  - `event` — an audit event: `{ kind: "event", id (uuid), projectId, subject, type, humanMessage, machineDetail, createdAt }`.
    `machineDetail` has exactly one shape per `type` (the generated types narrow on `type`).
  - `log` — one line of a build's output: `{ kind: "log", id: "<buildId>:<seq>", projectId, buildId, seq, stream:
    "stdout"|"stderr", text (redacted), createdAt }`. **Never replayed**; `getBuildLog` has every line afterwards, with the
    same `seq` numbers.
  - `control` — `{ kind: "control", id, projectId, type: "manifest.stream.ready" }`: the end of the replay.
- **Replay, then ready, then live**: a new connection is sent the project's **newest 50 events, oldest first**, then the
  `manifest.stream.ready` frame, then live frames. Frames that arrive during the replay are held and sent after the ready
  frame, minus any the replay already carried. `subscribe().ready` resolves as the ready frame is delivered.
- **Resume / cursor semantics: there are none.** No `since`, `Last-Event-ID`, or cursor parameter exists. Reconnecting
  replays the newest 50 again; **de-duplicate by event `id`** (a replay repeats ids by design). A client away for longer than
  50 events must re-read the resources themselves (`getBuild`, `listReleases`, `getEnvironment`, `listPendingActions` …).
  Subscribe BEFORE starting a build to see all its log lines.
- **Back-pressure**: `maxBufferedBytes` = 1,048,576; a client that falls behind is closed `1013`.
- **Close codes** (`x-manifest-websocket.closeCodes`):

| Code | Meaning | What to do |
|---|---|---|
| 1001 | The edge reloaded and its grace period ran out | Reconnect; the replay carries what was missed |
| 1006 | The upgrade was refused with an HTTP status (`UNAUTHENTICATED`, `NOT_FOUND`, `CSRF_ORIGIN_REFUSED`) or the connection dropped — a WebSocket client is shown no status | `GET` the same URL with the same credential to see the refusal in an envelope (a plain GET is not origin-checked; if nothing is wrong it answers `426 EVENTS_UPGRADE_REQUIRED`); otherwise reconnect |
| 1011 | The stream could not be opened (operator log says why) | Reconnect |
| 1013 | Client fell behind (> 1 MiB queued) | Reconnect, to be replayed |
| 4403 | The upgrade carried a session from another origin | Send the console's origin; reconnecting will not help |
| 4404 | Not found — or not yours | Check the project id and credential; reconnecting will not help |

- **`subject`** is opaque but has observable forms: `build:<buildId>`, `instance:<instanceId>`, `project:<projectId>`,
  `secret:<slug>:<kind>:<NAME>`, `rehearsal:<slug>:production`, and others; match on `machineDetail` ids, not on `subject`
  text, except as the guides do (`frame.subject === 'build:' + buildId`).
- **`humanMessage`** is "for a person — never parse it". It is written by the publisher (the table below gives each
  template, read from the code). Event rows are the project's append-only audit trail.

### 4.2 Every event type — meaning, the sentence a person sees, and its payload

`{…}` marks a value filled in at publish time. "actor" is `{person's name}` or `{name}'s agent (token '{tokenName}')`.

| # | `type` | What it means (the contract's sentence) | `humanMessage` as published | `machineDetail` fields |
|---|---|---|---|---|
| 1 | `sso.registered` | The app's SAML SP registration with the IdP was written for one environment | "Single sign-on was set up for {slug} in {environmentKind}." | `entityId`, `acsUrl`, `attributes[]`, `certificateFingerprint`, `changed` |
| 2 | `sso.acs_changed` | Where the app receives CWL sign-in assertions moved; worth a person's attention | "Where {slug} receives sign-in responses has changed." | `from` (null for first), `to` |
| 3 | `build.started` | A build began; log lines follow; `build.succeeded`/`build.failed` ends it | "Building {slug} at commit {sha, 7 chars}." | `buildId`, `commitSha`, `blueprintRef` |
| 4 | `build.succeeded` | A build finished and passed every gate; create a release next | "{slug} was built." | `buildId`, `imageDigest`, `imageRepository` |
| 5 | `build.failed` | A build failed; `reason` says why; `getBuildLog` has the output | "{slug} could not be built. Its build log says why." — or, after a restart, "A build was interrupted when the platform restarted. Start it again." | `buildId`, `code` (e.g. `BUILD_FAILED`, `BUILD_INTERRUPTED`, or null), `reason` (redacted; "for the agent") |
| 6 | `instance.provisioning` | A deploy made an instance and is binding services | "Preparing {slug} in {kind}." | `instanceId`, `releaseId`, `environmentId`, `environment`, `state` |
| 7 | `instance.starting` | Services bound; runtime starting it beside the serving one | "{slug} is starting in {kind}." | `instanceId`, `releaseId`, `environmentId`, `environment`, `state` |
| 8 | `instance.healthy` | Passed its health check and now serves; the deploy succeeded | "{slug} is running in {kind}." | `instanceId`, `releaseId`, `environmentId`, `environment`, `state` |
| 9 | `instance.failed` | Never became healthy; the old one keeps serving; an Incident records why | "{slug} did not start in {kind}." | `instanceId`, `releaseId`, `environmentId`, `environment`, `state`, `failedCheck` |
| 10 | `incident.opened` | An Incident was recorded for a failed instance | "{slug} failed to start in {kind}. The incident records what it printed and what changed since it last worked." | `incidentId`, `instanceId`, `releaseId`, `environment` |
| 11 | `ai.key_rotated` | The app's AI key was replaced by a deploy that became healthy (never the key) | "{slug} was given a new AI access key for this release in {kind}." | `instanceId`, `environment`, `models` |
| 12 | `instance.retiring` | A replaced instance is finishing its requests | "The previous version of {slug} in {kind} is finishing its last requests." | `instanceId` (nullable), `handle`, `environment`, `drainMs` |
| 13 | `instance.retired` | A replaced instance finished; container gone, AI key revoked | "The previous version of {slug} in {kind} has been removed." | `instanceId` (nullable), `handle`, `environment`, `drainMs` |
| 14 | `instance.retire_failed` | A replaced instance could not be retired; will be retried | "The previous version of {slug} in {kind} could not be removed yet; it will be tried again." | `instanceId` (nullable), `handle`, `environment`, `drainMs`, `error` |
| 15 | `project.created` | A project and its three environments were created | "{slug} was created from {blueprint}[ with the {starter} starter]." | `slug`, `blueprint`, `starter` (nullable), `audience` |
| 16 | `repository.seeded` | The repository was created and first commit made | "{slug}'s repository was created with {n} files." | `commitSha`, `files`, `starter` (nullable) |
| 17 | `spec.validated` | manifest.yaml at a commit was validated, valid or not | "{slug}'s manifest.yaml is valid." / "{slug}'s manifest.yaml has {n} problem(s) to fix." | `appSpecId`, `commitSha`, `valid`, `errorCount` |
| 18 | `token.minted` | A person minted a delegated token (never the token or its hash) | "{person} created a delegated token, '{name}', which can {raw capability list, e.g. project:read, source:write} until {YYYY-MM-DD}." | `tokenId`, `capabilities`, `expiresAt` |
| 19 | `pending_action.created` | A token asked for a privileged action; a person must confirm or reject | "An agent asked to {summary, lower-cased}, which D24 reserves to a person. It is waiting for someone to confirm or reject it." | `pendingActionId`, `tokenId`, `action` |
| 20 | `pending_action.confirmed` | A person confirmed; one retry granted | "{person} confirmed an agent's request to {summary}. It may do it once." | `pendingActionId`, `tokenId`, `action`, `resolvedBy` |
| 21 | `pending_action.rejected` | A person rejected; a retry is `TOKEN_ACTION_REJECTED` | "{person} refused an agent's request to {summary}: {reason}" | `pendingActionId`, `tokenId`, `action`, `resolvedBy`, `reason` |
| 22 | `iam_registration.recorded` | An admin recorded what UBC IAM registered | "{person} recorded this app's UBC IAM registration as {state}[ (ticket {ref})]." | `state`, `entityId`, `externalTicketRef` (nullable), `attributeCount` |
| 23 | `privacy_assessment.recorded` | An admin recorded what the Privacy Office said | "{person} recorded this app's privacy assessment as {state}[ (ticket {ref})]." | `state`, `externalTicketRef` (nullable) |
| 24 | `rehearsal.completed` | A production-shaped rehearsal of CWL sign-in ran, passed or not | "{person} ran the pre-production rehearsal and it passed." / "… and it did not pass: {reason}" | `rehearsalId`, `releaseId`, `passed`, `attributeCount` |
| 25 | `release.approved` | An admin approved a release for production, bound to its digest | "{person} approved this release for production." | `releaseId`, `imageDigest`, `decision` |
| 26 | `release.approval_rejected` | An admin rejected a release for production (final) | "{person} did not approve this release: {reason}" | `releaseId`, `imageDigest`, `decision` |
| 27 | `project.launched` | The first production launch became healthy (once per project, ever) | "{slug} launched: it is in production for the first time (§13)." | `releaseId`, `instanceId`, `imageDigest` |
| 28 | `repository.pushed` | A branch moved on GitHub and Manifest took it (driver 2) | "{branch} appeared on GitHub at {sha, 12}." / "{branch} moved on GitHub to {sha, 12}." | `ref`, `from` (nullable), `to` |
| 29 | `repository.history_rewritten` | GitHub history rewritten; Manifest kept its history | "GitHub's history for {branch} was rewritten; Manifest kept the commits it had." | `ref`, `mirror`, `upstream` |
| 30 | `repository.visibility_enforced` | Repository found public on GitHub; made private again or could not be | "{slug}'s repository was found PUBLIC on GitHub and was made private again." / "… is PUBLIC on GitHub and could not be made private; it will not be built until it is private." | `observed`, `result`, `detail` |
| 31 | `repository.secret_detected` | A commit pushed to GitHub adds a secret-shaped value (never the value) | "A secret-shaped value was pushed to GitHub in {sha, 12} ({path}:{line}, {rule}[, and N more]). It is on GitHub now: treat it as exposed and rotate it. Manifest will not build a commit that carries it." | `commit`, `findings`, `truncated` |
| 32 | `repository.scan_incomplete` | Pushed commits too large to scan for secrets | "A commit pushed to GitHub ({sha, 12}) was too large for Manifest to scan for secrets, so nothing in it was checked. A build of any commit still scans the whole tree it builds." (plural variant) | `commits` |
| 33 | `repository.protection_unavailable` | GitHub would not protect `main` | "{org/slug}'s main is NOT protected: GitHub would not protect it (see the project's repository), so a person can force-push or delete it on GitHub. Manifest keeps every commit a release names either way." | `ref`, `detail` |
| 34 | `repository.committed` | A commit was made through `createCommit` — the platform's own record of who | "{actor} committed {n} change(s) to main: {commit subject}" | `commitSha`, `parent`, `added`, `modified`, `deleted`, `via`, `userId`, `tokenId` (nullable) |
| 35 | `repository.secret_refused` | A commit carried a secret-shaped value and was refused (never the value) | "{actor} tried to commit a secret-shaped value to main, at {where}; nothing was committed." | `findings` |
| 36 | `app_secret.set` | A value was set for one secret in one environment (never the value) | "{actor} set {NAME} for {kind}; it takes effect at the next deploy." | `environmentKind`, `name`, `via`, `userId`, `tokenId` (nullable) |
| 37 | `app_secret.cleared` | A secret's value was removed from one environment | "{actor} cleared {NAME} for {kind}; a release that declares it will not deploy there until it is set again." | `environmentKind`, `name`, `via`, `userId`, `tokenId` (nullable) |
| 38 | `project.renamed` | The project's name — what people call it — changed; its slug and hostnames did not | "{actor} renamed {from} to {name}." | `from`, `to`, `via`, `userId`, `tokenId` (nullable) |


### 4.3 Every event type's `machineDetail`, field by field (generated from the contract)

Each event's envelope fields are the same (`kind`, `id`, `projectId`, `subject`, `type`, `humanMessage`, `machineDetail`,
`createdAt`); only `machineDetail` differs.


##### 1. `sso.registered`

The app’s SAML Service Provider registration with the identity provider was written for one environment (§9).

`machineDetail`:
- `entityId`: string — The app’s SAML entity id in this environment (§9).
- `acsUrl`: string — Where the identity provider sends its assertions.
- `attributes`: string[] — The CWL attributes the identity provider releases to the app.
- `certificateFingerprint`: string — The SHA-256 fingerprint of the app’s SAML signing certificate.
- `changed`: boolean — Whether the registration differs from the one before; false when it was written again unchanged.

Example `machineDetail`: `{"entityId":"https://manifest.internal/sp/chem-labs/staging","acsUrl":"https://chem-labs.staging.manifest.internal/auth/saml/callback","attributes":["displayName","mail"],"certificateFingerprint":"3A:9C:04:E7:B2:5D:18:6A:C3:47:0E:9B:D2:61:A8:35:7C:E0:4B:93:2D:A6:15:C8:E9:30:7A:4E:B1:6C:D5:08","changed":true}`

##### 2. `sso.acs_changed`

Where the app receives CWL sign-in assertions moved (§9). Worth a person’s attention: it is where a sign-in is sent.

`machineDetail`:
- `from`: string \| null — Where assertions were sent before; null for a first registration.
- `to`: string — Where they are sent now.

Example `machineDetail`: `{"from":"http://127.0.0.1:7188/auth/saml/callback","to":"https://chem-labs.staging.manifest.internal/auth/saml/callback"}`

##### 3. `build.started`

A build began (§14). Its log lines follow on the stream as LogFrames, and `build.succeeded` or `build.failed` ends it.

`machineDetail`:
- `buildId`: string (uuid) — The build (`getBuild`); its log streams after this event.
- `commitSha`: string — A full 40-character commit id.
- `blueprintRef`: string — The blueprint it is built with, `name@major` (§25).

Example `machineDetail`: `{"buildId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","commitSha":"0123456789abcdef0123456789abcdef01234567","blueprintRef":"fixture-node@1"}`

##### 4. `build.succeeded`

A build finished and passed every gate (§12); create a release from it next.

`machineDetail`:
- `buildId`: string (uuid) — The build (`getBuild`).
- `imageDigest`: string \| null — The image’s content digest, `sha256:…` — what a release freezes.
- `imageRepository`: string \| null — Where the image is stored in the platform’s registry.

Example `machineDetail`: `{"buildId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","imageDigest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","imageRepository":"manifest-registry:5000/apps/chem-labs"}`

##### 5. `build.failed`

A build failed. `reason` says why, and `getBuildLog` has the whole output to correct it from.

`machineDetail`:
- `buildId`: string (uuid) — The build (`getBuild`); `getBuildLog` has its whole output.
- `code`: string \| null — A stable code for the failure when there is one; null for a failure with no code.
- `reason`: string — Redacted at capture (§14). For the agent; the human message is for a person.

Example `machineDetail`: `{"buildId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","code":"BUILD_FAILED","reason":"npm ci exited 1"}`

##### 6. `instance.provisioning`

A deploy made an instance and is binding its services — the first step of a deploy (§11).

`machineDetail`:
- `instanceId`: string (uuid) — The instance (`listInstances`).
- `releaseId`: string (uuid) — The release it runs (`getRelease`).
- `environmentId`: string (uuid) — Its environment (`getEnvironment`).
- `environment`: "sandbox" \| "staging" \| "production" — Which of the project’s three environments.
- `state`: "pending" \| "building" \| "provisioning" \| "starting" \| "healthy" \| "failed" \| "hibernated" \| "waking" \| "destroying" \| "gone" — The state the instance moved to (§11).

Example `machineDetail`: `{"instanceId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","releaseId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","environmentId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","environment":"staging","state":"provisioning"}`

##### 7. `instance.starting`

The instance’s services are bound and the runtime is starting it, beside the one already serving (§11).

`machineDetail`:
- `instanceId`: string (uuid) — The instance (`listInstances`).
- `releaseId`: string (uuid) — The release it runs (`getRelease`).
- `environmentId`: string (uuid) — Its environment (`getEnvironment`).
- `environment`: "sandbox" \| "staging" \| "production" — Which of the project’s three environments.
- `state`: "pending" \| "building" \| "provisioning" \| "starting" \| "healthy" \| "failed" \| "hibernated" \| "waking" \| "destroying" \| "gone" — The state the instance moved to (§11).

Example `machineDetail`: `{"instanceId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","releaseId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","environmentId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","environment":"staging","state":"starting"}`

##### 8. `instance.healthy`

The instance passed its health check and now serves the environment; a deploy has succeeded (§11).

`machineDetail`:
- `instanceId`: string (uuid) — The instance (`listInstances`).
- `releaseId`: string (uuid) — The release it runs (`getRelease`).
- `environmentId`: string (uuid) — Its environment (`getEnvironment`).
- `environment`: "sandbox" \| "staging" \| "production" — Which of the project’s three environments.
- `state`: "pending" \| "building" \| "provisioning" \| "starting" \| "healthy" \| "failed" \| "hibernated" \| "waking" \| "destroying" \| "gone" — The state the instance moved to (§11).

Example `machineDetail`: `{"instanceId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","releaseId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","environmentId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","environment":"staging","state":"healthy"}`

##### 9. `instance.failed`

The instance never became healthy — whatever was already serving keeps serving — and an Incident records why (§11, §14).

`machineDetail`:
- `instanceId`: string (uuid) — The instance (`listInstances`).
- `releaseId`: string (uuid) — The release it runs (`getRelease`).
- `environmentId`: string (uuid) — Its environment (`getEnvironment`).
- `environment`: "sandbox" \| "staging" \| "production" — Which of the project’s three environments.
- `state`: "pending" \| "building" \| "provisioning" \| "starting" \| "healthy" \| "failed" \| "hibernated" \| "waking" \| "destroying" \| "gone" — The state the instance moved to (§11).
- `failedCheck`: string — Which check it failed, and how — the health check, and what it answered.

Example `machineDetail`: `{"instanceId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","releaseId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","environmentId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","environment":"staging","state":"failed","failedCheck":"health: GET /healthz on port 3000 — connection refused"}`

##### 10. `incident.opened`

An Incident was recorded for a failed instance (§14): its logs, redacted, and a prompt an agent can work from.

`machineDetail`:
- `incidentId`: string (uuid) — The Incident (`listIncidents`).
- `instanceId`: string (uuid) — The instance that failed.
- `releaseId`: string (uuid) — The release it ran.
- `environment`: "sandbox" \| "staging" \| "production" — Which of the project’s three environments.

Example `machineDetail`: `{"incidentId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","instanceId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","releaseId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","environment":"staging"}`

##### 11. `ai.key_rotated`

The app’s AI key was replaced by a deploy that became healthy (§10). The key itself is never in an event.

`machineDetail`:
- `instanceId`: string (uuid) — The instance the key was issued to.
- `environment`: "sandbox" \| "staging" \| "production" — Which of the project’s three environments.
- `models`: string[] — The logical models the new key reaches.

Example `machineDetail`: `{"instanceId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","environment":"staging","models":["default-chat"]}`

##### 12. `instance.retiring`

An instance a deploy replaced is finishing the requests it already had, before it stops (§11).

`machineDetail`:
- `instanceId`: string (uuid) \| null — The instance being retired; null for a container no instance row names any more, which `handle` then names.
- `handle`: string — The runtime’s own name for the container — what an operator would look for.
- `environment`: "sandbox" \| "staging" \| "production" — Which of the project’s three environments.
- `drainMs`: integer [min 0] — How long, in milliseconds, requests already in flight are given to finish before the container stops (§11).

Example `machineDetail`: `{"instanceId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","handle":"mf-chem-labs-staging-6f1c1d2e-9b8a7c6d-app","environment":"staging","drainMs":1240}`

##### 13. `instance.retired`

A replaced instance finished: its container is gone and its AI key is revoked (§11).

`machineDetail`:
- `instanceId`: string (uuid) \| null — The instance being retired; null for a container no instance row names any more, which `handle` then names.
- `handle`: string — The runtime’s own name for the container — what an operator would look for.
- `environment`: "sandbox" \| "staging" \| "production" — Which of the project’s three environments.
- `drainMs`: integer [min 0] — How long, in milliseconds, requests already in flight are given to finish before the container stops (§11).

Example `machineDetail`: `{"instanceId":null,"handle":"mf-chem-labs-staging-6f1c1d2e-9b8a7c6d-app","environment":"staging","drainMs":1240}`

##### 14. `instance.retire_failed`

A replaced instance could not be retired, and will be tried again — never silently (§11).

`machineDetail`:
- `instanceId`: string (uuid) \| null — The instance being retired; null for a container no instance row names any more, which `handle` then names.
- `handle`: string — The runtime’s own name for the container — what an operator would look for.
- `environment`: "sandbox" \| "staging" \| "production" — Which of the project’s three environments.
- `drainMs`: integer [min 0] — How long, in milliseconds, requests already in flight are given to finish before the container stops (§11).
- `error`: string — A code or an error class name — never a message (§14).

Example `machineDetail`: `{"instanceId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","handle":"mf-chem-labs-staging-6f1c1d2e-9b8a7c6d-app","environment":"staging","drainMs":1240,"error":"DRIVER_UNAVAILABLE"}`

##### 15. `project.created`

A project and its three environments were created (§22). `repository.seeded` and `spec.validated` follow.

`machineDetail`:
- `slug`: string — The project’s name (§23).
- `blueprint`: string — Its blueprint, `name@major` (§25).
- `starter`: string \| null — The starter it was seeded from; null for the skeleton alone.
- `audience`: object — Who the app is for, as its owner answered at creation (§24).
  - `scale`: "solo" \| "class" \| "large_course" \| "public" — §24: how many people the app is for.
  - `burst`: "steady" \| "synchronised" — §24: whether they arrive steadily or all at once.

Example `machineDetail`: `{"slug":"chem-labs","blueprint":"fixture-node@1","starter":null,"audience":{"scale":"solo","burst":"steady"}}`

##### 16. `repository.seeded`

The project’s repository was created and its first commit made, from the blueprint’s skeleton and starter (§25).

`machineDetail`:
- `commitSha`: string — A full 40-character commit id.
- `files`: integer — How many files the first commit holds.
- `starter`: string \| null — The starter laid over the skeleton; null for the skeleton alone.

Example `machineDetail`: `{"commitSha":"0123456789abcdef0123456789abcdef01234567","files":2,"starter":null}`

##### 17. `spec.validated`

manifest.yaml at a commit was validated — by a commit through the API, a push, or `validateSpec` — valid or not (§7).

`machineDetail`:
- `appSpecId`: string (uuid) — The recorded validation (`getSpec` reads the newest).
- `commitSha`: string — A full 40-character commit id.
- `valid`: boolean — Whether manifest.yaml at that commit is valid.
- `errorCount`: integer [min 0] — How many errors it has; 0 when it is valid.

Example `machineDetail`: `{"appSpecId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","commitSha":"0123456789abcdef0123456789abcdef01234567","valid":true,"errorCount":0}`

##### 18. `token.minted`

A person minted a delegated token for this project (D24). Never carries the token or its hash.

`machineDetail`:
- `tokenId`: string (uuid) — The token (`listTokens`).
- `capabilities`: string[] — What it may do (D24).
- `expiresAt`: string (date-time) — When it stops working, in UTC.

Example `machineDetail`: `{"tokenId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","capabilities":["project:read","build:create"],"expiresAt":"2026-10-17T00:00:00.000Z"}`

##### 19. `pending_action.created`

A delegated token asked for one of D24’s privileged actions, and a person must confirm or reject it in the console.

`machineDetail`:
- `pendingActionId`: string (uuid) — The question (`getPendingAction`).
- `tokenId`: string (uuid) — The token that asked.
- `action`: string — The privileged capability it asked to use (D24).

Example `machineDetail`: `{"pendingActionId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","action":"members:manage"}`

##### 20. `pending_action.confirmed`

A person confirmed a token’s pending action, which grants that one request exactly one retry (D24).

`machineDetail`:
- `pendingActionId`: string (uuid) — The question (`getPendingAction`).
- `tokenId`: string (uuid) — The token that asked.
- `action`: string — The privileged capability it asked to use (D24).
- `resolvedBy`: string (uuid) — The person who confirmed it.

Example `machineDetail`: `{"pendingActionId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","action":"members:manage","resolvedBy":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f"}`

##### 21. `pending_action.rejected`

A person rejected a token’s pending action; a retry of it is refused `TOKEN_ACTION_REJECTED` (D24).

`machineDetail`:
- `pendingActionId`: string (uuid) — The question (`getPendingAction`).
- `tokenId`: string (uuid) — The token that asked.
- `action`: string — The privileged capability it asked to use (D24).
- `resolvedBy`: string (uuid) — The person who rejected it.
- `reason`: string — Why, in their own words — what the agent is told.

Example `machineDetail`: `{"pendingActionId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","action":"members:manage","resolvedBy":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","reason":"not this term"}`

##### 22. `iam_registration.recorded`

An administrator recorded what UBC IAM registered for the app’s production sign-in (§9).

`machineDetail`:
- `state`: "draft" \| "submitted" \| "active" \| "change_requested" \| "expired" — The registration’s state, as UBC IAM gave it (§9).
- `entityId`: string — The production entity id registered.
- `externalTicketRef`: string \| null — UBC IAM’s own reference for the request; null when none was given.
- `attributeCount`: integer — How many attributes are registered; `getLaunchRecords` lists them.

Example `machineDetail`: `{"state":"submitted","entityId":"https://manifest.internal/sp/chem-labs/production","externalTicketRef":"IAM-2026-0412","attributeCount":2}`

##### 23. `privacy_assessment.recorded`

An administrator recorded what UBC’s Privacy Office said of the app’s privacy impact assessment (§9).

`machineDetail`:
- `state`: "draft" \| "submitted" \| "approved" — The assessment’s state, as the Privacy Office gave it (§9).
- `externalTicketRef`: string \| null — The Privacy Office’s own reference; null when none was given.

Example `machineDetail`: `{"state":"submitted","externalTicketRef":"PIA-2026-0088"}`

##### 24. `rehearsal.completed`

A production-shaped rehearsal of the app’s CWL sign-in ran for the release serving staging, and passed or did not (D21).

`machineDetail`:
- `rehearsalId`: string (uuid) — The rehearsal (`getLaunchReadiness` reads the newest).
- `releaseId`: string (uuid) — The candidate release rehearsed.
- `passed`: boolean — Whether the production-shaped sign-in worked.
- `attributeCount`: integer [min 0] — How many attributes the sign-in released.

Example `machineDetail`: `{"rehearsalId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","releaseId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","passed":true,"attributeCount":2}`

##### 25. `release.approved`

An administrator approved a release for production, bound to the image digest it froze (§13).

`machineDetail`:
- `releaseId`: string (uuid) — The release decided on (`getApproval` has the whole decision).
- `imageDigest`: string — The first 19 characters of the image digest decided on — recognisable, and never mistaken for the binding itself.
- `decision`: "approved" \| "rejected" — What the administrator decided.

Example `machineDetail`: `{"releaseId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","imageDigest":"sha256:aaaaaaaaaaaa","decision":"approved"}`

##### 26. `release.approval_rejected`

An administrator rejected a release for production, which is final for that release (§13); the sentence carries their reason.

`machineDetail`:
- `releaseId`: string (uuid) — The release decided on (`getApproval` has the whole decision).
- `imageDigest`: string — The first 19 characters of the image digest decided on — recognisable, and never mistaken for the binding itself.
- `decision`: "approved" \| "rejected" — What the administrator decided.

Example `machineDetail`: `{"releaseId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","imageDigest":"sha256:aaaaaaaaaaaa","decision":"rejected"}`

##### 27. `project.launched`

The app’s first production launch became healthy (§13 D9). Published once per project, ever.

`machineDetail`:
- `releaseId`: string (uuid) — The release that launched it.
- `instanceId`: string (uuid) — The production instance that became healthy.
- `imageDigest`: string — The first 19 characters — recognisable, and never mistaken for the binding.

Example `machineDetail`: `{"releaseId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","instanceId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","imageDigest":"sha256:aaaaaaaaaaaa"}`

##### 28. `repository.pushed`

A branch moved on GitHub and Manifest’s copy took it (D5). Commit ids only — never an author or a message.

`machineDetail`:
- `ref`: string — The branch, as git names it: `refs/heads/main`.
- `from`: string \| null — Where the branch was; null for a branch that appeared.
- `to`: string — Where it is now.

Example `machineDetail`: `{"ref":"refs/heads/main","from":"0123456789abcdef0123456789abcdef01234567","to":"89abcdef0123456789abcdef0123456789abcdef"}`

##### 29. `repository.history_rewritten`

A branch’s history was rewritten on GitHub; Manifest kept the history its releases name, and reads GitHub’s for what comes next (§13).

`machineDetail`:
- `ref`: string — The branch, as git names it: `refs/heads/main`.
- `mirror`: string — What Manifest kept — the history an approved release may name.
- `upstream`: string — What GitHub has now.

Example `machineDetail`: `{"ref":"refs/heads/main","mirror":"0123456789abcdef0123456789abcdef01234567","upstream":"89abcdef0123456789abcdef0123456789abcdef"}`

##### 30. `repository.visibility_enforced`

The repository was found public on GitHub, and was made private again or could not be (§20).

`machineDetail`:
- `observed`: "public" — What the repository was found to be on GitHub.
- `result`: "private" \| "still-public" — `private` when Manifest made it private again; `still-public` when it could not, and nothing is built from it until it is private.
- `detail`: string — Manifest’s own sentence about what happened.

Example `machineDetail`: `{"observed":"public","result":"private","detail":"made private again"}`

##### 31. `repository.secret_detected`

A commit pushed to GitHub adds a value shaped like a secret (§20). Never the value; the commit is never deployed with it.

`machineDetail`:
- `commit`: string — The commit that added the value.
- `findings`: object[] — Where each value is, and what kind — at most 50.
  - `path`: string [minLen 1] — The file, from the repository root.
  - `line`: integer [min 1] — The line, counting from 1 — in a file written through the API with `encoding: base64`, the run of printable text, counting from 1.
  - `rule`: string [minLen 1] — Which kind of secret it looks like — `an AWS access key id`. Never the value.
- `truncated`: boolean — True when there were more than 50.

Example `machineDetail`: `{"commit":"0123456789abcdef0123456789abcdef01234567","findings":[{"path":"config/aws.js","line":2,"rule":"an AWS access key id"}],"truncated":false}`

##### 32. `repository.scan_incomplete`

Commits pushed to GitHub were too large for Manifest to scan for secrets (§20). Nothing in them was read; a build of any commit still scans the whole tree it builds.

`machineDetail`:
- `commits`: string[] — The commits whose own changes were too large to scan, oldest first.

Example `machineDetail`: `{"commits":["89abcdef0123456789abcdef0123456789abcdef"]}`

##### 33. `repository.protection_unavailable`

GitHub would not protect the new repository’s `main`, so a person can rewrite or delete it there; `getProject`’s repository says so too.

`machineDetail`:
- `ref`: string — The branch, as git names it: `refs/heads/main`.
- `detail`: string — Manifest’s own sentence about why.

Example `machineDetail`: `{"ref":"refs/heads/main","detail":"GitHub would not protect main on this repository"}`

##### 34. `repository.committed`

A commit was made through Manifest’s API (`createCommit`) — the platform’s own record of who made it, which `listCommits` reads as `madeThrough`.

`machineDetail`:
- `commitSha`: string — The commit made.
- `parent`: string — The commit it was made on — the request’s `baseCommit`.
- `added`: integer [min 0] — How many files it added.
- `modified`: integer [min 0] — How many files it changed.
- `deleted`: integer [min 0] — How many files it deleted.
- `via`: "session" \| "token" — How the person acted: `session` in their own interactive session, `token` through a delegated token they minted.
- `userId`: string (uuid) — The person who acted — for a token, the person who minted it. `listMembers` names them.
- `tokenId`: string (uuid) \| null — The delegated token that acted (`listTokens`); null when the person acted in their own session.

Example `machineDetail`: `{"commitSha":"89abcdef0123456789abcdef0123456789abcdef","parent":"0123456789abcdef0123456789abcdef01234567","added":1,"modified":2,"deleted":0,"via":"token","userId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f"}`

##### 35. `repository.secret_refused`

A commit Manifest was asked to make carried a value shaped like a secret, and was refused (§20). Never the value.

`machineDetail`:
- `findings`: object[] — Where each value was, and what kind.
  - `path`: string [minLen 1] — The file, from the repository root.
  - `line`: integer [min 1] — The line, counting from 1 — in a file written through the API with `encoding: base64`, the run of printable text, counting from 1.
  - `rule`: string [minLen 1] — Which kind of secret it looks like — `an AWS access key id`. Never the value.

Example `machineDetail`: `{"findings":[{"path":"config.js","line":1,"rule":"an AWS access key id"}]}`

##### 36. `app_secret.set`

A value was set for one of the app’s secrets in one environment; the next deploy there renders it. Never the value.

`machineDetail`:
- `environmentKind`: "sandbox" \| "staging" \| "production" — Which of the project’s three environments.
- `name`: string — The secret’s name, as manifest.yaml declares it. Never its value.
- `via`: "session" \| "token" — How the person acted: `session` in their own interactive session, `token` through a delegated token they minted.
- `userId`: string (uuid) — The person who acted — for a token, the person who minted it. `listMembers` names them.
- `tokenId`: string (uuid) \| null — The delegated token that acted (`listTokens`); null when the person acted in their own session.

Example `machineDetail`: `{"environmentKind":"staging","name":"SIS_API_KEY","via":"session","userId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":null}`

##### 37. `app_secret.cleared`

A secret’s value was removed from one environment; deploying a release that declares it there is refused until it is set again.

`machineDetail`:
- `environmentKind`: "sandbox" \| "staging" \| "production" — Which of the project’s three environments.
- `name`: string — The secret’s name, as manifest.yaml declares it. Never its value.
- `via`: "session" \| "token" — How the person acted: `session` in their own interactive session, `token` through a delegated token they minted.
- `userId`: string (uuid) — The person who acted — for a token, the person who minted it. `listMembers` names them.
- `tokenId`: string (uuid) \| null — The delegated token that acted (`listTokens`); null when the person acted in their own session.

Example `machineDetail`: `{"environmentKind":"staging","name":"SIS_API_KEY","via":"token","userId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f"}`


##### 38. `project.renamed`

The project’s name — what people call it — changed. Its slug, and so every hostname it has, did not.

`machineDetail`:
- `from`: string [minLen 1] — What people called the project before.
- `to`: string [minLen 1] — What they call it now (`Project.name`).
- `via`: "session" \| "token" — How the person acted: `session` in their own interactive session, `token` through a delegated token they minted.
- `userId`: string (uuid) — The person who acted — for a token, the person who minted it. `listMembers` names them.
- `tokenId`: string (uuid) \| null — The delegated token that acted (`listTokens`); null when the person acted in their own session.

Example `machineDetail`: `{"from":"chem-labs","to":"CHEM 121 — Lab notebook","via":"session","userId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":null}`


---

## 5. Every error code

113 codes, each always with the same HTTP status. Counts by status: 400 ×14, 401 ×10, 403 ×8, 404 ×4, 409 ×59, 413, 415,
422, 426, 429, 500 ×1 each, 503 ×12.

**38 codes are declared by NO operation** — they come from somewhere other than a `/v1` handler, and a front-end will meet
only a few of them:

- `CREDENTIAL_AMBIGUOUS` (400) and `ROUTE_NOT_FOUND` (404) — answerable by ANY request, from the framework hooks.
- `TOKEN_PERSON_ONLY` (403) — the central rule's answer if a token somehow holds a person-only capability.
- `SAML_*` (7) — `/auth/saml/callback`, `/auth/logout` (the sign-in and step-up round trips); a browser sees these on the
  ACS, not through the client.
- `WEBHOOK_*` (4) and `WEBHOOKS_NOT_CONFIGURED` — `/webhooks/github` only.
- `CONFIG_*` (7) — the control plane refusing to START with a bad configuration; never answered to a request.
- `AI_*` except `AI_BACKEND_UNAVAILABLE`/`AI_CATALOGUE_EMPTY` (9) — what a DEPLOYED APP's own gateway calls meet at runtime.
- `RELEASE_BLUEPRINT_NOT_FOUND`, `RELEASE_ENVIRONMENT_NOT_FOUND`, `RELEASE_IMAGE_REPOSITORY_MISSING`,
  `RELEASE_LOCAL_IMAGE_ON_REMOTE_DRIVER`, `RELEASE_PROJECT_NOT_FOUND`, `SOURCE_GITHUB_KEY_UNREADABLE`, `SOURCE_INVALID_SLUG`
  — internal/driver faults registered with a status but listed on no route.

The table is generated from `x-manifest-errors` (status, summary = meaning, remedy) plus the operations whose
`x-manifest-error-codes` name each code ("ALL" = every operation; "N ops" when more than 12 do). Summaries and remedies are
written for a developer or an agent (they name operationIds, headers and manifest paths) — see §6 for what a faculty UI
should do with them.


| Code | HTTP | Meaning | Remedy | Operations that declare it |
|---|---|---|---|---|
| `AI_BACKEND_UNAVAILABLE` | 503 | The gateway could not be reached. | Retry later: the AI gateway did not answer. | deploy, createProject, startBuild, createCommit, validateSpec |
| `AI_CATALOGUE_DISABLED` | 503 | AI is switched off on this control plane. | Remove `ai.models` from manifest.yaml to go on without AI, or ask an administrator to switch AI on. | (none declared) |
| `AI_CATALOGUE_EMPTY` | 503 | The gateway returned an empty model catalogue. | Retry later, or ask an administrator: the AI gateway lists no models, so none can be declared or checked. | createProject, startBuild, createCommit, validateSpec |
| `AI_KEY_EXPIRED` | 503 | The app’s key expired. | Deploy the app again: a deploy issues its instance a new key. | (none declared) |
| `AI_KEY_REVOKED` | 503 | The app’s key was revoked. | Deploy the app again: a deploy issues its instance a new key. | (none declared) |
| `AI_MODEL_NOT_PERMITTED` | 503 | The app’s key does not reach the model it asked for. | Declare the model in manifest.yaml’s `ai.models`, then build, release and deploy: an app’s key reaches only the models its release declares. | (none declared) |
| `AI_MODEL_UNKNOWN` | 503 | The gateway does not know the model. | Use a logical model name from the catalogue, never a vendor’s model id. | (none declared) |
| `AI_PROJECT_BUDGET_EXCEEDED` | 503 | The app has used its AI budget for the month. | Wait for next month’s budget, or raise `ai.budget.project_monthly_usd` within the project’s AI quota and release again. | (none declared) |
| `AI_ROUTE_NOT_PERMITTED` | 503 | The app’s key does not reach that gateway route. | Call the gateway only through the routes the blueprint’s AI client uses; the key reaches no others. | (none declared) |
| `AI_UNMAPPED` | 503 | The gateway answered with a failure this platform does not map. | Retry once; if it recurs, report the time to the platform’s operator, whose log has the gateway’s answer. | (none declared) |
| `AI_USER_BUDGET_EXCEEDED` | 503 | The person has used their AI allowance for the month. | Wait for next month’s allowance, or ask an administrator to raise it. | (none declared) |
| `APPROVAL_PREVIEW_EXPIRED` | 409 | The preview is older than thirty minutes, so it is no longer what was shown at decision time; take a new one. | Take a new preview (`createApprovalPreview`), read it, and decide naming the new one. | approveRelease, rejectRelease |
| `APPROVAL_PREVIEW_REQUIRED` | 400 | An approval or rejection names no preview. Take one (`POST /v1/releases/{releaseId}/approval-preview`), read it, and decide naming its id. | Take a preview (`createApprovalPreview`), read it, and send the decision again naming its `previewId`. | approveRelease, rejectRelease |
| `APPROVAL_PREVIEW_STALE` | 409 | What the release would be approved as changed since the preview was taken — in practice another decision moved the last approved release. Take a new preview and read it. | Take a new preview (`createApprovalPreview`), read what changed, and decide naming the new one. | approveRelease, rejectRelease |
| `BLUEPRINT_NOT_FOUND` | 400 | No blueprint with this reference is in the registry. | Choose one from `listBlueprints` and name it `name@major`. | createProject, startBuild, createRelease |
| `CONFIG_BUILD_CREDENTIAL_SECRET_REQUIRED` | 409 | MANIFEST_BUILD_CREDENTIAL_SECRET is required outside development. | The control plane refuses to start until its operator corrects the setting the message names; nothing a client sends changes it. | (none declared) |
| `CONFIG_CONTROL_PLANE_ORIGIN_PORT_MISMATCH` | 409 | A loopback origin names a port the control plane does not listen on. | The control plane refuses to start until its operator corrects the setting the message names; nothing a client sends changes it. | (none declared) |
| `CONFIG_GITHUB_FAKE_OUTSIDE_DEVELOPMENT` | 409 | A GitHub URL names loopback — the fake GitHub a laptop runs — on the GitHub driver outside development. | The control plane refuses to start until its operator corrects the setting the message names; nothing a client sends changes it. | (none declared) |
| `CONFIG_GITHUB_INSECURE_URL` | 409 | A GitHub URL is plain http beyond loopback, so an installation token would cross the network in plaintext. | The control plane refuses to start until its operator corrects the setting the message names; nothing a client sends changes it. | (none declared) |
| `CONFIG_INVALID` | 409 | A setting failed validation. | The control plane refuses to start until its operator corrects the setting the message names; nothing a client sends changes it. | (none declared) |
| `CONFIG_LITELLM_MASTER_KEY_REQUIRED` | 409 | MANIFEST_LITELLM_MASTER_KEY is required outside development. | The control plane refuses to start until its operator corrects the setting the message names; nothing a client sends changes it. | (none declared) |
| `CONFIG_MASTER_SECRET_REQUIRED` | 409 | MANIFEST_MASTER_SECRET is required outside development. | The control plane refuses to start until its operator corrects the setting the message names; nothing a client sends changes it. | (none declared) |
| `CREDENTIAL_AMBIGUOUS` | 400 | The request carried both a session cookie and a delegated token; it carries one or the other. | Send one credential: the session cookie from a browser, or `Authorization: Bearer` from a program — never both. | (none declared) |
| `CSRF_ORIGIN_REFUSED` | 403 | A request carrying a session did not come from the console’s origin. | Send `Origin` naming the console’s origin — a browser does this itself, and `hint` names it. A program that is not a browser sends a delegated token rather than a session cookie; a token needs no Origin. | 22 ops |
| `DOC_NOT_FOUND` | 404 | No page of the API’s documentation has this slug. | Read the index (`listDocs`): it names every page with the slug to read it by. A page’s links name files — `authoring.md` is the slug `authoring`, `reference/errors.md` is `reference-errors`. | getDoc |
| `EVENTS_UPGRADE_REQUIRED` | 426 | The event stream is a WebSocket; a plain GET cannot read it. | Open the same URL as a WebSocket (`wss://`), with the same credential. | streamProjectEvents |
| `FORBIDDEN` | 403 | A member of the project whose role does not hold this capability. | Ask one of the project’s owners (`listMembers` names them) for a role that holds this capability — or, for a token, mint one that holds it (`mintToken`). | 27 ops |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | A mutation arrived without an Idempotency-Key of at least 8 characters (D23.6). | Send `Idempotency-Key` with every mutation: a new random value of 8 characters or more — a UUID — for each user action, reused unchanged when retrying that same action. | 21 ops |
| `IDEMPOTENCY_KEY_REUSED` | 409 | This Idempotency-Key was used on this route for a different request — another resource in the path, or a different body. | Use a new Idempotency-Key for a new action. To retry the SAME action, send the same key to the same path with exactly the same body, and the first answer is replayed — except a mint, whose secret is never kept (`TOKEN_ALREADY_MINTED`). | 21 ops |
| `INSTANCE_OUTPUT_PRODUCTION` | 403 | A production instance’s output is not readable (§14): it serves real people, whose input its output can carry. | Read a sandbox or staging instance’s output instead, or a failed production instance’s Incident (`listIncidents`) — its log tail is the only window onto production. | getInstanceOutput |
| `INSTANCE_OUTPUT_UNAVAILABLE` | 409 | The instance no longer runs, or never started, so there is no output to read — Manifest keeps none. | Read the environment’s Incidents (`listIncidents`): a failed instance’s last lines are in its Incident. `listInstances` says which instance is running now. | getInstanceOutput |
| `INTERNAL` | 500 | The control plane failed; its operator log has the reason. Nothing the client sent explains it. | Retry once; if it recurs, the platform’s operator has a line naming it — report the time and the operation. | ALL |
| `LAUNCH_RECORD_INVALID` | 400 | An external record’s fields cannot be accepted — today, an empty registered-attribute list, which §9 measured as the fail-open case. | Correct the fields the message names — a registration lists at least one attribute — and record it again. | recordIamRegistration |
| `LAUNCH_TRANSITION_INVALID` | 409 | An IAM registration or a privacy assessment was asked to make a move §9 does not have; the message names what that state CAN become. | Move the record along §9’s states one step at a time, to one of the states the message names. | recordIamRegistration, recordPrivacyAssessment |
| `MEMBER_USER_NOT_FOUND` | 400 | No user with this PUID has ever signed in. | Ask the person to sign in to Manifest once with CWL, then add them again. | addMember |
| `NOT_FOUND` | 404 | No such resource — or one the caller has no business knowing exists. | Check the id. If it is right you cannot see it: ask one of the project’s owners to add you (`addMember`), or use a token minted for that project. | 48 ops |
| `PENDING_ACTION_RESOLVED` | 409 | This pending action has already been confirmed or rejected; it cannot be answered twice. | Read it again (`getPendingAction`): somebody has already answered, and its `state` says how. | confirmPendingAction, rejectPendingAction |
| `PROJECT_LAST_OWNER` | 409 | A project must always have an owner, so the last one cannot be removed. | Make another member an owner first (`addMember` with role `owner`), then remove this one. | removeMember |
| `RATE_LIMITED` | 429 | Too many requests from this credential; Retry-After says when to try again. A delegated token’s limit is its own, from its row (§20). | Wait the number of seconds `Retry-After` gives, then retry. A token’s limit is its `rateLimit`, fixed when it was minted. | 56 ops |
| `REHEARSAL_DEPLOY_FAILED` | 409 | The candidate could not be deployed to production, or the deploy registered no Service Provider. | Read the message and the project’s events for why the deploy failed, fix that, and rehearse again. | runRehearsal |
| `REHEARSAL_LAUNCHED` | 409 | The app has launched, so a rehearsal would put an unapproved candidate on its live production listener. A registration change is proved by UBC IAM’s change request. | Nothing to rehearse: a launched app’s registration change goes to UBC IAM as a change request (§9), which an administrator records (`recordIamRegistration`). | runRehearsal |
| `REHEARSAL_NOT_CWL` | 409 | The app signs nobody in with CWL, so it registers no Service Provider and there is nothing to rehearse. Its checklist item is met. | Nothing to do: the launch checklist’s rehearsal item is already met for an app with no CWL sign-in. | runRehearsal |
| `REHEARSAL_NO_CANDIDATE` | 409 | Nothing is serving staging, so there is no candidate release to rehearse (§13). | Deploy a release to staging and let it become healthy, then rehearse again. | runRehearsal |
| `RELEASE_AI_BUDGET_MISSING` | 409 | The release declares models and no AI budget. | Set `ai.budget.project_monthly_usd` above 0 in manifest.yaml, or ask an administrator to raise the project’s AI quota, then build and release again. A budget of 0 would refuse the app’s every question. | deploy |
| `RELEASE_AI_DISABLED` | 409 | The release declares models and AI is switched off on this control plane. | Remove `ai.models` from manifest.yaml and release again to deploy without AI, or ask an administrator to switch AI on. | deploy |
| `RELEASE_BLUEPRINT_NOT_FOUND` | 409 | The project’s blueprint is no longer in the registry. | Ask an administrator to restore the blueprint to the registry; nothing in the project can change it. | (none declared) |
| `RELEASE_BUILD_NOT_DEPLOYABLE` | 409 | The build did not succeed, so nothing can be released from it. | Read the build’s log (`getBuildLog`), fix the cause, build again (`startBuild`) and release the build that succeeds. | createRelease |
| `RELEASE_BUILD_NOT_FOUND` | 409 | No build with this id. | Check the build id; `listBuilds` lists the project’s builds. | createRelease |
| `RELEASE_DIGEST_MISSING` | 409 | The release’s build recorded no digest. | Build the commit again (`startBuild`) and create the release from the new build (`createRelease`). | deploy, runRehearsal, createApprovalPreview, approveRelease, rejectRelease |
| `RELEASE_DIGEST_NOT_APPROVED` | 409 | This production deploy needs an administrator’s approval — a first launch, or a launched app’s change to a sensitive field (§13 D9.2) — and none covers the digest it would run; or an administrator rejected this release, which is final. The message says which. | Ask an administrator to approve this release — they take a preview (`createApprovalPreview`) and approve naming it — then deploy again. A rejected release stays rejected: build and release a new one. | deploy |
| `RELEASE_ENVIRONMENT_NOT_FOUND` | 409 | No environment with this id. | Check the environment id; `listEnvironments` lists the project’s three. | (none declared) |
| `RELEASE_IMAGE_REPOSITORY_MISSING` | 409 | The build recorded a digest and no repository; rebuild it. | Build the commit again (`startBuild`) and create the release from the new build (`createRelease`). | (none declared) |
| `RELEASE_LOCAL_IMAGE_ON_REMOTE_DRIVER` | 409 | A laptop-built image cannot reach a remote driver (§13). | Nothing a client can change: this control plane builds on one machine and runs on another. Report it to the platform’s operator. | (none declared) |
| `RELEASE_MODEL_CLASSIFICATION_TOO_LOW` | 409 | A declared model is not approved for the app’s data classification (D17). | Declare a model approved for the app’s `data.classification`, or lower the classification if it is overstated; then build and release again. | deploy |
| `RELEASE_MODEL_NOT_IN_CATALOGUE` | 409 | A declared model is no longer in the catalogue. | Declare a model the catalogue has — `validateSpec` names them when one is unknown — then build and release again. | deploy |
| `RELEASE_MODEL_UNCLASSIFIED` | 409 | A declared model has no classification in the catalogue. | Declare another model, or ask an administrator to classify this one; then build and release again. | deploy |
| `RELEASE_NOT_FOUND` | 409 | No release with this id. | Check the release id; `listReleases` lists the project’s releases. | deploy |
| `RELEASE_NOT_STAGED` | 409 | Production deploys only the release serving staging — production runs exactly what staging ran (§13); the body carries the LaunchReadiness of the one that is. | Deploy this release to staging first and let it become healthy, then deploy it to production — or deploy the release that is serving staging. | deploy |
| `RELEASE_PRODUCTION_GATE_UNAVAILABLE` | 409 | A blocking item an approval alone cannot fix is unmet — a first launch’s checklist (§13, D19), or a launched app’s (D9.2), a rejected release included; the body carries LaunchReadiness. | Read `launchReadiness`: each unmet blocking item says what meets it. Meet them — most are records an administrator keeps, some with long lead times — and deploy again; a retry alone changes nothing. | deploy |
| `RELEASE_PROJECT_NOT_FOUND` | 409 | The environment names a project that does not exist. | Check the environment id: its project has been deleted, and nothing can be deployed to it. | (none declared) |
| `RELEASE_REESCALATED` | 409 | A launched app’s release changes a sensitive field (§7) since the last approved release, and only an administrator’s approval is missing (§13 D9.2); the body carries LaunchReadiness. | Ask an administrator to approve this release: they take a preview (`createApprovalPreview`), read it, and approve naming it (`approveRelease`). Deploy again once they have. | deploy |
| `RELEASE_SECRET_NOT_SET` | 409 | The release’s manifest.yaml declares a secret (`secret: true`) that has no value in this environment, so nothing was started. Set each name the message lists with `setAppSecret`, then deploy again. | Set each name the message lists in this environment (`setAppSecret`) and deploy again; `listAppSecrets` shows which are set. | deploy |
| `REQUEST_BODY_TOO_LARGE` | 413 | The request body is larger than the API accepts. | Send a smaller body. Every operation accepts at most 1 MiB except `createCommit`, which accepts 8 MiB — split a larger change into several commits. | 21 ops |
| `REQUEST_INVALID` | 400 | A field in the request is missing or malformed, or the body could not be read at all; the message says which. | Read `message`: it names each part and field that failed (`body.changes.0.path: …`). Correct them against this operation’s schema and send it again. A request with no body — a GET, or a DELETE that takes none — carries no `Content-Type`. | 56 ops |
| `REQUEST_MEDIA_TYPE_UNSUPPORTED` | 415 | The request body is a content type the route does not read. | Send the body as JSON, with `Content-Type: application/json`. | 21 ops |
| `ROUTE_NOT_FOUND` | 404 | No route has this method and path. Resource routes are under /v1/. | Check the method and the path against this document: every resource route begins `/v1/`, and a path parameter is an id, never a name. | (none declared) |
| `SAML_ASSERTION_REJECTED` | 401 | The assertion was refused; the operator log says why. | Start the sign-in again at /auth/login. If it keeps failing, report the time to the platform’s operator, whose log has the reason. | (none declared) |
| `SAML_LOGIN_NOT_BOUND` | 401 | The assertion answers a sign-in this browser did not start. | Start the sign-in again at /auth/login, in the browser that will receive the answer. | (none declared) |
| `SAML_LOGOUT_REJECTED` | 400 | The single-logout request could not be verified; the operator log says why. | Nothing a client can change: this endpoint’s caller is the identity provider. The platform’s operator log says why its request could not be verified. | (none declared) |
| `SAML_NO_PUID` | 401 | The assertion released no ubcEduCwlPuid. | Nothing the person can change: the identity provider’s registration for Manifest must release ubcEduCwlPuid. Report it to the platform’s operator. | (none declared) |
| `SAML_STEP_UP_NO_SESSION` | 401 | The step-up came back to a browser holding no valid session; sign in again. | Sign in again at /auth/login, then step up. | (none declared) |
| `SAML_STEP_UP_WRONG_USER` | 401 | The step-up assertion is for a different person than the session in this browser. | Step up as the person who is signed in — or sign out, sign in as the other person, and step up then. | (none declared) |
| `SAML_USER_UPSERT_FAILED` | 401 | The user could not be recorded. | Start the sign-in again at /auth/login. If it keeps failing, report the time to the platform’s operator. | (none declared) |
| `SECRET_NAME_RESERVED` | 400 | That variable is one the platform sets for every app (§8) — the platform’s value always wins — so it cannot be an app secret. Choose another name. | Name the secret something else, in manifest.yaml and here. The platform’s own variables are listed in the blueprint’s knowledge pack (`getKnowledgePack`). | clearAppSecret, setAppSecret |
| `SLUG_INVALID` | 400 | The name breaks §7’s slug rule. | Choose a name of 3 to 39 lower-case letters, digits and hyphens that starts with a letter. `checkSlug` checks one without creating anything. | createProject |
| `SLUG_RESERVED` | 409 | The name is one of §23’s reserved labels; the message says what it stands for. | Choose another name. `checkSlug` says whether one is free. | createProject |
| `SLUG_TAKEN` | 409 | Another project holds the name. | Choose another name. `checkSlug` says whether one is free. | createProject |
| `SOURCE_COMMIT_NOT_FOUND` | 409 | The repository has no such commit — or what was named is not a full commit id — so there is nothing to build or read from it. | Name the full 40-character id of a commit the repository has; `listCommits` lists them. | startBuild, listCommits, getCommit, getFile, validateSpec, getTree |
| `SOURCE_CONFLICT` | 409 | The branch moved after the commit this request was computed from; read it again and retry. | Read the tree again (`getTree`) for its `commitSha`, recompute your changes against it, and commit with that as `baseCommit`. | createCommit |
| `SOURCE_FILE_NOT_TEXT` | 409 | The file is binary or not UTF-8, so it is not read as text. | Read it as bytes: `getFile` with `encoding=base64` answers any file up to 2 MiB. `getTree` marks a binary file `binary: true`. | getFile |
| `SOURCE_FILE_TOO_LARGE` | 409 | The file is larger than the API carries in one read — 1 MiB as text, 2 MiB with `encoding=base64`. | A text file between 1 and 2 MiB can be READ with `encoding=base64`, and changed only with git directly, by a push — as can any file past 2 MiB. `getTree` gives every file’s `size`. | getFile |
| `SOURCE_GITHUB_KEY_UNREADABLE` | 409 | The GitHub App’s private key cannot be read, or is not an RSA key; the message names the file. | Nothing a client can change: the platform’s operator restores the key file, readable by its owner alone. | (none declared) |
| `SOURCE_GITHUB_REFUSED` | 409 | GitHub refused the request; the message carries GitHub’s own message and nothing else of its answer. | Read GitHub’s message: a limit passes with time, and a permission is the GitHub App installation’s to grant. Retry once it is resolved. | createProject |
| `SOURCE_GIT_FAILED` | 409 | git failed; the message names the operation. | Retry once; if it recurs, report the time and the operation the message names to the platform’s operator. | createProject, listCommits, createCommit, getCommit, getFile, validateSpec, getTree |
| `SOURCE_INVALID_SLUG` | 409 | The slug cannot name a repository. | Choose a project name that follows §23’s rule; `checkSlug` checks one. | (none declared) |
| `SOURCE_NOTHING_TO_COMMIT` | 409 | Every change leaves its file as it is in the base commit, so there is nothing to commit. | Nothing to do: every file already reads as you would write it. Read the file again (`getFile`) if you expected a difference. | createCommit |
| `SOURCE_PATH_CONFLICT` | 409 | A change does not fit the base commit’s tree: a file where a directory is, a path under a file, a symlink or a submodule, something other than a regular file to overwrite or a file to delete, or one path named twice; the message names the path. | Read the tree at `baseCommit` (`getTree`) and change the path the message names: write beside a directory rather than over it, delete a directory’s files one by one, and name each path once. A symlink or a submodule is changed with git directly. | createCommit |
| `SOURCE_PATH_ESCAPE` | 409 | A slug that would leave the repository root, or a path that is not inside the repository — absolute, or with an empty, `.` or `..` component — or into a repository’s own `.git`. | Name a path relative to the repository root, `/`-separated, with no empty, `.`, `..` or `.git` component. | createCommit |
| `SOURCE_PATH_NOT_A_FILE` | 409 | The path names a directory, a symlink or a submodule; the API reads and writes regular files. | Name a file; `getTree` says what each path is, and lists a directory’s contents. | getFile |
| `SOURCE_PATH_NOT_FOUND` | 409 | The commit has no such path — so there is nothing to read, or to delete. | Check the path against `getTree` at the same commit; paths are case-sensitive. | createCommit, getFile |
| `SOURCE_PROVIDER_MISMATCH` | 409 | The project’s repository was made by a different source driver from the one this control plane runs; the message names both. | Use a control plane running the project’s own driver: a project stays with the driver that created its repository. | startBuild, listCommits, createCommit, getCommit, getFile, validateSpec, getTree, createApprovalPreview |
| `SOURCE_REF_NOT_FOUND` | 409 | No branch has that name. | Name `main`, another branch the repository has, or a full 40-character commit id. | listCommits, getFile, getTree |
| `SOURCE_REPOSITORY_EXISTS` | 409 | A repository of that name already exists — on GitHub, or as a mirror on this machine — and Manifest never adopts one it did not create. | Choose another project name. A leftover repository of that name is removed by whoever owns it; Manifest will not take it over. | createProject |
| `SOURCE_REPOSITORY_NOT_PRIVATE` | 409 | GitHub did not create the repository private, so it was deleted. | Create the project again. If it recurs, the GitHub organisation’s settings forbid private repositories, and its administrator changes them. | createProject |
| `SOURCE_REPOSITORY_PUBLIC` | 409 | The repository was last read PUBLIC on GitHub and could not be made private; it is not built while it is public (§20). | Make the repository private on GitHub. The next push or read checks it again, and building resumes. | startBuild, createApprovalPreview |
| `SOURCE_SECRET_DETECTED` | 409 | A commit Manifest was asked to make carries a secret-shaped value, and nothing was committed; the message names path:line and the rule, never the value (§20). | Remove the value from the file — or the commit message — the message names, and never commit a credential: set it as an app secret instead (`setAppSecret`) and read it from the environment. Then commit again. In a file written with `encoding: base64`, the line counts runs of printable text, not lines. | createProject, createCommit |
| `SOURCE_UNREACHABLE` | 503 | The git host did not answer. A commit already mirrored still builds. | Retry when the git host answers. Meanwhile a commit already mirrored still builds, releases and deploys. | createProject, startBuild, listCommits, createCommit, getCommit, getFile, validateSpec, getTree |
| `SPEC_INVALID` | 422 | manifest.yaml at this commit is not valid; `details` lists each error with its path. | Read `details`: each entry names a path in manifest.yaml, a code (`ManifestErrorCode`), a message and usually a hint. Correct each one and commit the file again (`createCommit`); `validateSpec` checks it without building. | startBuild, createCommit, getSpec |
| `SPEC_NOT_FOUND` | 400 | The project has no validated spec yet. | Validate the manifest on `main` (`validateSpec`), or commit one (`createCommit`), and try again. | startBuild, getSpec |
| `STARTER_NOT_FOUND` | 400 | The blueprint offers no starter by that name (§25). | Choose one of the starters `getBlueprint` lists, or leave `starter` out for the skeleton alone. | createProject |
| `STEP_UP_REQUIRED` | 403 | This action needs a second authentication round trip (§20). Send the person to /auth/step-up and retry. | Send the person’s browser to `/auth/step-up?returnTo=<the page they are on>`, let them complete the CWL prompt, and repeat the request within ten minutes. A token cannot step up. | deploy, clearAppSecret, setAppSecret, confirmPendingAction, addMember, removeMember, approveRelease, rejectRelease |
| `TOKEN_ACTION_PENDING` | 403 | A delegated token asked for one of D24’s privileged four; `pendingAction` is the question a person must answer. | Ask the person who minted the token to confirm `pendingAction` in the console, then retry the identical request — same body, same Idempotency-Key — once. The confirmation grants exactly one retry. | deploy, addMember, removeMember |
| `TOKEN_ACTION_REJECTED` | 403 | A person refused this exact request. `pendingAction.reason` is why, in their words; retrying it will not change the answer. | Do not retry it. Read `pendingAction.reason`, then ask the person, or ask for something different. | deploy, addMember, removeMember |
| `TOKEN_ALREADY_MINTED` | 409 | A mint was retried with its Idempotency-Key: the first request minted the token named, and its secret was shown to that request alone and is not kept. | If you have the first answer’s secret, use it. If that answer was lost, revoke the token named (`revokeToken`) and mint again with a new Idempotency-Key. | mintToken |
| `TOKEN_CAPABILITY_FORBIDDEN` | 400 | A mint asked for one of D24’s four privileged capabilities, or for one of its two person-only ones; the message names which. | Mint the token without them. A privileged action is granted to a token one request at a time, by a person’s confirmation (`TOKEN_ACTION_PENDING`); a person-only one never is. | mintToken |
| `TOKEN_CREDENTIAL_REFUSED` | 403 | A valid delegated token asked for something D24 reserves to an interactive session. | Have a person do it in the console, in their own session: no delegated token may, and no confirmation changes that. The operation’s description says when a token is refused. | 17 ops |
| `TOKEN_PERSON_ONLY` | 403 | A delegated token asked for a person-only action (D24) — approving a release, or recording UBC’s IAM or privacy decision. Refused outright; no pending action is created. | A person does this, in the console, in their own session. No token can hold it and no confirmation grants it — do not ask for one. | (none declared) |
| `UNAUTHENTICATED` | 401 | The request carries no valid credential — no session, or a delegated token that is unknown, revoked or expired. | Sign in at /auth/login for a session, or send a delegated token as `Authorization: Bearer mft_…`. A token that expired or was revoked is refused the same way: mint a new one (`mintToken`). | ALL |
| `WEBHOOKS_NOT_CONFIGURED` | 404 | This control plane runs the local source driver, which receives no webhooks. | Nothing to fix here: on the local driver a person pushes into Manifest’s own repository and no webhook is needed. Point a GitHub webhook only at a control plane that runs the GitHub driver. | (none declared) |
| `WEBHOOK_PAYLOAD_INVALID` | 400 | A correctly signed delivery whose body is not a JSON object, or which lacks X-GitHub-Delivery or X-GitHub-Event. | Send GitHub’s delivery unchanged: a JSON object, with its X-GitHub-Delivery and X-GitHub-Event headers. | (none declared) |
| `WEBHOOK_SIGNATURE_INVALID` | 401 | X-Hub-Signature-256 is well formed and does not match the body under the App’s webhook secret. | Make the App’s webhook secret and the control plane’s the same, and sign the exact bytes sent — a body re-serialised after signing no longer matches. | (none declared) |
| `WEBHOOK_SIGNATURE_MALFORMED` | 401 | X-Hub-Signature-256 is not exactly one sha256= and 64 lowercase hex characters. | Send the signature exactly as GitHub computes it: `sha256=` and the HMAC-SHA256 of the raw body, as 64 lowercase hex characters. | (none declared) |
| `WEBHOOK_SIGNATURE_MISSING` | 401 | The delivery carries no X-Hub-Signature-256 — including one that carries only the legacy SHA-1 X-Hub-Signature. | Give the GitHub App’s webhook its secret, so that GitHub signs every delivery with X-Hub-Signature-256. Only GitHub calls this endpoint; a Manifest client never does. | (none declared) |


### Spec problem codes (`x-manifest-spec-errors`, appear in `error.details[].code` on `422 SPEC_INVALID`, and in `warnings[]`)

| Code | Meaning | Remedy |
|---|---|---|
| `BLUEPRINT_AI_UNSUPPORTED` | The pinned blueprint does not provide AI (§25). | Remove `ai.models`: an app gets AI only from a blueprint that provides it. |
| `BLUEPRINT_AUTH_UNSUPPORTED` | The pinned blueprint does not support that `auth.provider` (§25). | Set `auth.provider` to one the hint lists, which the pinned blueprint supports. |
| `BLUEPRINT_SCHEMA_VERSION_UNSUPPORTED` | The pinned blueprint does not understand this `manifest:` schema version (§25). | Set `manifest:` to a schema version the hint lists. |
| `BLUEPRINT_SERVICE_UNSUPPORTED` | The pinned blueprint cannot bind that service type (§25). | Use a service type the hint lists, which the pinned blueprint can bind. |
| `SPEC_AI_BUDGET_REQUIRED` | The manifest declares a model and its AI budget is $0, which would refuse every request the app makes. | Set `ai.budget.project_monthly_usd` above 0, or leave it out to use the project’s AI quota — and if that quota is $0, ask an administrator to raise it. |
| `SPEC_AI_DISABLED` | The manifest declares models, and this platform offers none. | Remove `ai.models`, or ask an administrator to switch AI on. |
| `SPEC_ATTRIBUTE_NOT_REGISTERED` | A launched app asks for a CWL attribute its recorded IAM registration does not release (§7); refused when the production build runs. | Remove the attribute from `auth.attributes`, or have UBC IAM approve the registration’s change and record it (`recordIamRegistration`), then build again. |
| `SPEC_ATTRIBUTE_NOT_WHITELISTED` | A CWL attribute UBC does not release to applications. | Use an attribute the hint lists. The person’s identifier is `ubcEduCwlPuid`, never `uid`. |
| `SPEC_BLUEPRINT_NOT_PINNED` | `blueprint` names a different blueprint from the one the project is pinned to; a commit cannot move a project. | Set `blueprint` to the project’s pin, which the hint names. |
| `SPEC_BUILD_BLOCK_FORBIDDEN` | manifest.yaml supplies its own build definition (`runtime.build`); the Dockerfile is the blueprint’s (D13). | Remove `runtime.build`. Declare what the app needs — never how to build it. |
| `SPEC_ENV_NAME_RESERVED` | An `env` entry declares a variable the platform sets for every app (§8). | Remove the entry, or choose another name: the platform’s value always wins, so this line would do nothing. |
| `SPEC_FIELD_NOT_ENFORCED` | A WARNING, not an error: a field Manifest validates and records with the release but does not enforce yet — today `ai.budget.per_user_monthly_usd`, not enforced before Phase 4 (§10). The manifest is valid. | Nothing to fix. Keep the value if you mean it — it applies once Manifest enforces it; what limits the app today is `ai.budget.project_monthly_usd`. |
| `SPEC_INVALID_BLUEPRINT_REF` | `blueprint` is not a name pinned to a major version. | Write it as `name@major` — the project’s own pin, which `getProject` answers as `blueprint`. |
| `SPEC_INVALID_SLUG` | `name` is not a valid project slug. | Set `name` to the project’s slug: 3 to 39 lower-case letters, digits and hyphens, starting with a letter. |
| `SPEC_INVALID_VALUE` | A value has the wrong type, or is outside what §7 permits. | Correct the value the path names. This document’s `ManifestYaml` schema gives every field’s type and permitted values. |
| `SPEC_MODEL_CLASSIFICATION_TOO_LOW` | A model that is not approved for the app’s `data.classification` (D17). | Choose a model approved for that classification, or lower `data.classification` if it is overstated. |
| `SPEC_MODEL_UNCLASSIFIED` | A model with no data classification, which no app may use (D17). | Choose another model, or ask an administrator to classify this one. |
| `SPEC_MODEL_UNKNOWN` | A model the catalogue does not name. | Use a logical model name the hint lists, never a vendor’s model id. |
| `SPEC_NAME_SLUG_MISMATCH` | `name` is not the project’s slug. | Set `name` to the project’s slug, which `getProject` answers as `slug`. |
| `SPEC_PATH_EXPECTED` | A field that takes a path was given a URL. | Write a path beginning `/`, such as `/auth/ubcshib/callback`; Manifest derives the origin itself (D15). |
| `SPEC_QUOTA_EXCEEDED` | A resource, the number of services, or the AI budget is above the project’s quota. | Lower what the manifest asks for, or ask an administrator to raise the quota. |
| `SPEC_RESERVED_BLOCK_NOT_EMPTY` | `integrations`, `jobs` or `checks` is not empty; §15 reserves each, empty, in schema version 1. | Leave the block out, or leave it as an empty list. |
| `SPEC_SERVICE_TYPE_UNKNOWN` | A service type this platform does not offer. | Use a service type the hint lists — the ones this platform can provision. |
| `SPEC_UNKNOWN_KEY` | A key §7 does not define at that path. | Remove or rename the key; the hint lists the keys that path accepts. |
| `SPEC_YAML_PARSE_FAILED` | manifest.yaml is not valid YAML. | Fix the YAML at the place the message names; YAML indents with spaces, never tabs. |


---

## 6. For a non-technical faculty UI: human-readable fields vs machinery

**Rule for the UI: machinery is never shown to faculty.** "Human" below means a field a faculty member can read as-is (or
after formatting a date, or translating an enum into the UI's own words). "Translate" means an enum or identifier whose VALUE
is machinery but whose MEANING the UI should render in its own copy. "Machinery" means ids, digests, hostnames, ports,
exit codes, raw logs, image refs, git internals, capability strings, spec field paths, HTTP details — use them for joins and
logic, never display them.

### 6.1 Cross-cutting warnings

1. **Several "human" strings leak spec jargon.** The platform's own prose often cites the design spec: `LaunchReadinessItem.why`
   and `.owner` ("UBC IAM, recorded by a platform administrator (§9)", "(§9, C4)"), `ApprovalDiff.security[].note`,
   `ApprovalDiff.coverage`, `ApprovalDiff.review.detail`, and some event sentences ("…launched: it is in production for the
   first time (§13).", "…which D24 reserves to a person."). Either write the UI's own copy keyed on the stable ids
   (`LaunchReadinessItem.id`, event `type`, `sensitiveFields` values) or strip `(§…)`/`D<n>` citations before display.
2. **Some event sentences embed machinery**: `build.started` (a 7-char commit sha), `repository.pushed`/`secret_detected`/
   `scan_incomplete` (12-char shas, file paths, scanner rule names), `token.minted` (raw capability strings such as
   `project:read, source:write` and an ISO date), `app_secret.*` (the env-var NAME), `iam_registration.recorded` (raw enum
   state such as `change_requested`), `project.created` (`fixture-node@1`-style blueprint refs), and `{slug}` in nearly every
   sentence (a hostname label, not `Project.name` — only `project.renamed` uses names). The UI should render its own sentence per `type` from
   `machineDetail` + resources it has already read, and fall back to `humanMessage` only for types it does not know.
3. **Error `message` and `hint` are developer-facing** (they quote field paths like `body.changes.0.path`, header names,
   origins, operationIds). Map `error.code` to the UI's own words; `x-manifest-errors[code].remedy` is also developer copy.
   The genuinely person-facing error payloads are `details[].message`/`hint` on `SPEC_INVALID` (still about manifest.yaml,
   so arguably for the agent, not the instructor), `SlugCheck.reasons[].message`/`hint`, `PendingAction.reason`, and
   `Approval.reason`.
4. **Who-did-it is often a bare user id.** `Release.createdBy`, `Audience.setBy`, `ApprovalPreview.createdBy`,
   `Approval.decidedBy` are uuids. Only `Approval.decidedByName`, `ApprovalPreview.createdByName`, `Project.owner.displayName`,
   `Member.displayName`, `CommitSummary.madeThrough.name` and the event sentences carry names. To name a release's author the
   UI must join `createdBy` against `listMembers` (and a departed member will not be there).
5. **Pending actions do not name the agent.** `PendingAction` carries `tokenId`, not the token's name; `listTokens` (session
   only) has the name. The `pending_action.created` event sentence does not name it either.
6. **Show `Project.name`, not `slug`.** `slug` is the permanent lowercase hostname label (`chem-labs`) in every URL; `name`
   (1–80 chars, e.g. "CHEM 121 — Lab notebook", defaulting to the slug) is what people read, changed by `updateProject`.

### 6.2 Field-by-field classification

| Schema | Human (show) | Translate (enum/flag → UI words) | Machinery (never show) |
|---|---|---|---|
| `Me` | `displayName`, `email` | `role` (`admin`/`member`) | `id`, `puid` |
| `Project` / `CreatedProject` | **`name`** (the label people read — since `186fa34`), `owner.displayName`, `createdAt`, `launchedAt`, `audience.justification`; `slug` only as a web address | `audience.scale`, `audience.burst`, `starter` (map via `Blueprint.starters[].summary`), `launchedAt != null` ⇒ "live" | `id`, `blueprint` (`name@major`), `owner.id`, `audience.setBy`, `audience.setAt`, `repository.*` (`provider`, `fullName`, `webUrl`, `mainProtected`, `protectionDetail`, `visibility`), `spec` (on create) |
| `Environment` | `url` (the link to open the app) | `kind` (`sandbox`/`staging`/`production`), `instance` null ⇒ "not deployed yet", `instance.state` | `id`, `projectId`, `hostname`, `instance.id`, `instance.releaseId`, `instance.kind` |
| `Instance` / `InstanceSummary` | `lastSeenAt` (as "last seen") | `state` (10-value enum: `provisioning`/`starting` ⇒ starting, `healthy` ⇒ running, `failed` ⇒ didn't start, `destroying`/`gone` ⇒ replaced…), `serving` | `id`, `environmentId`, `releaseId`, `kind` |
| `InstanceOutput` | — (raw app logs; not for faculty) | `truncated.*`, `failure` ⇒ "couldn't read" | `lines[].text`, `lines[].stream`, `lines[].at`, `stamped`, `readAt`, ids |
| `Build` | `createdAt` | `status` (`running`/`succeeded`/`failed`), `scan` ⇒ one "security check" verdict at most | `id`, `projectId`, `commitSha`, `imageDigest`, `error` (actionable for the AUTHOR/agent; may quote tool output), `scan.*` (scanner, CVE counts, `unfixableFindings`, `databaseAgeDays`, `stale`, `baseImageKnown`) |
| `BuildLog`, `LogFrame` | — | — | everything (raw build output) |
| `Release` | `summary` (author's words), `createdAt` | `scan` (as above) | `id`, `projectId`, `buildId`, `appSpecId`, `imageDigest`, `createdBy` (uuid — join for a name), `config.*` (`port`, `health`, `resources`, `services`, `egressAllow`, `classification`, `auth.provider`, `auth.attributes`, `ai.models`, `envNames`) |
| `Incident` | `createdAt`; `exitReason` and `diffSinceHealthy` are prose but technical ("health check", manifest paths) — show only in an "details for your assistant" disclosure | — | `logTail` (raw logs), `failedCheck` ("health: GET /healthz on port 3000 …"), `prompt` (a repair request for an agent), `id`, `instanceId`, `releaseId` |
| `LaunchReadiness` | `items[].title`, `items[].why` (strip § citations), `items[].owner` (strip citations), `items[].builtBy` | `ready`, `launched`, `reescalated`, `items[].state` (`met`/`unmet`/`not_built`), `items[].blocking`, `sensitiveFields[]` (7 fixed values) | `projectId`, `candidateReleaseId`, `baselineReleaseId`, `items[].id` (use as the key) |
| `LaunchRecords` → `IamRegistration` | `updatedAt`, `registeredAt`, `externalTicketRef` (a UBC ticket number — admin-facing) | `state` (`draft`/`submitted`/`active`/`change_requested`/`expired`) | `id`, `projectId`, `entityId`, `acsUrl`, `sloUrl`, `certFingerprint`, `certExpiresAt` (admin-only concern), `registeredAttributes[]`, `requestedAttributes[]` (CWL attribute names like `ubcEduCwlPuid`) |
| `LaunchRecords` → `PrivacyAssessment` | `reviewer`, `approvedAt`, `updatedAt`, `externalTicketRef` | `state` (`draft`/`submitted`/`approved`) | `id`, `projectId` |
| `Rehearsal` | `ranAt`, `evidence.reason` (platform prose) | `passed` | `id`, `projectId`, `releaseId`, `entityId`, `acsUrl`, `attributes[]`, `evidence.instanceId`, `evidence.hostname`, `evidence.listener`, `evidence.signInStatus`, `evidence.attributesReleased[]` |
| `Approval` | `decidedByName`, `decidedAt`, `reason`, `diff.summary` (when `summarySource` = `llm`), `diff.changes[].summary` ("one clause a faculty member can read"), `diff.summaryExposures[].sentence` (model-written; label as such) | `decision`, `diff.sensitiveFields[]`, `diff.summarySource` (6 values), `diff.review.state` | `id`, `releaseId`, `projectId`, `decidedBy`, `imageDigest`, `previewId`, `diff.imageDigest`, `diff.changes[].path/from/to/added/removed`, `diff.services[]` (`type@version`), `diff.attributes[]`, `diff.resources.*`, `diff.baselineReleaseId`, `diff.summaryWithheldBecause`, `diff.security[].field`; `diff.security[].note`, `diff.coverage`, `diff.review.reviewer/detail` are prose but spec-laden and admin-facing |
| `ApprovalPreview` (admin screen only) | `createdByName`, `createdAt`, `expiresAt` + the `diff` as above | — | `id`, `releaseId`, `projectId`, `createdBy`, `imageDigest` |
| `PendingAction` | `summary` ("Remove a member"), `createdAt`, `expiresAt`, `resolvedAt`, `reason`, `waitingSeconds` (as a duration) | `state` (`pending`/`confirmed`/`rejected`/`expired`), `action` (`members:manage` ⇒ "change who's on the project", `release:promote` ⇒ "put it live") | `id`, `projectId`, `tokenId` (join for the agent's name), `method`, `path`, `bodySha256`, `consumedAt` |
| `Token` / `MintedToken` | `name`, `createdAt`, `expiresAt`, `lastUsedAt`, `revokedAt` | `expired`, `capabilities[]` (render as plain-language permissions) | `id`, `projectId`, `rateLimit`, **`secret`** (a credential: show once for copying, never log or store it in the UI) |
| `Member` | `displayName`, `email` | `role` (`owner`/`collaborator`) | `userId`, `puid` |
| `AppSecretList` / `AppSecretStatus` | `name` is the variable name — show it (it is what the app's code reads), `updatedAt` | `declared`, `set`, `environmentKind` | `environmentId`; the value is never answered |
| `SpecValidation` / `CommitOutcome.spec` | `errors[].message`, `errors[].hint`, `warnings[].message`/`hint` (manifest-level; best shown as "your assistant needs to fix this") | `valid`, `sensitiveDiff.sensitive`, `sensitiveDiff.fields[]` | `appSpecId`, `commitSha`, `errors[].code`, `errors[].path` |
| `Spec` | — | — | everything (the whole parsed manifest) |
| `SourceTree` / `SourceFile` | file `path` (if the UI shows files at all), `size` | `type`, `binary` | `ref`, `commitSha`, `mode`, `blobSha`, `encoding`, `content` (code) |
| `CommitList` / `CommitSummary` / `CommitDetail` | `subject`, `message`, `authoredAt`, `madeThrough.name`, `madeThrough.tokenName` (the agent's label) | `madeThrough.kind` (`person`/`agent`), `madeThrough == null` ⇒ "pushed outside Manifest", `changes[].status` | `commitSha`, `parents[]`, `authorName` (unverified git text — prefer `madeThrough`), `messageTruncated`, `changes[].patch`, `additions`, `deletions`, `binary`, `truncated`, `patchesTruncated`, `next` |
| `Blueprint` | `name`, `language`, `starters[].name`, `starters[].summary` | `provides.ai`, `provides.authProviders` (`cwl` ⇒ "UBC sign-in") | `ref`, `majorVersion`, `defaultPort`, `healthPath`, `schemaVersions`, `provides.services` |
| `KnowledgePack`, `DocIndex`, `DocPage`, `OpenApiDocument` | — (for agents/developers) | — | everything |
| `SlugCheck` | `reasons[].message`, `reasons[].hint` | `available` | `slug` echo, `reasons[].code` |
| `Fleet` (admin) | `slug`, `owner.displayName`, `owner.email`, `createdAt`, `environments[].lastDeployAt`, `latestIncidentAt` | `environments[].kind`, `.state`, `slugReserved`, `audience.*` | `id`, `blueprint`, `owner.id`, `environments[].hostname`, `.releaseId`, `.imageDigest` |
| Stream `EventFrame` | `humanMessage` (with the caveats in 6.1), `createdAt` | `type` (the key for the UI's own sentence) | `id`, `projectId`, `subject`, `machineDetail.*` (every field; use ids to refresh resources) |
| Stream `ControlFrame` | — | — | everything |


---

## 7. The generated client package — `packages/contract`

### 7.1 `package.json` (verbatim facts)

| Field | Value |
|---|---|
| `name` | `@manifest/contract` |
| `version` | `1.4.0` (equal to `info.version`; a test on each side holds them equal) |
| `private` | **`true`** (never published to a registry) |
| `type` | `module` (ESM only) |
| `exports` | `"."`: `{ "types": "./src/index.ts", "default": "./dist/index.js" }`; `"./openapi.json": "./openapi.json"` |
| `main` / `types` / `module` (top level) | **none** — the `exports` map is the only entry |
| `dependencies` | `openapi-fetch` **`0.17.0`** (exact pin) — the only runtime dependency |
| `devDependencies` | `openapi-typescript` `7.13.0` |
| `peerDependencies` | none |
| `workspace:` dependencies | none |
| scripts | `build`: `tsc`; `typecheck`: `tsc --noEmit`; `generate`: `openapi-typescript openapi.json --output src/schema.d.ts` |
| `tsconfig.json` | extends `../../tsconfig.base.json` (`target ES2023`, `module`/`moduleResolution` `NodeNext`, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `skipLibCheck`, `declaration`, `sourceMap`); `rootDir: src`, `outDir: dist`, `types: ["node"]`, `include: ["src"]` |

**Tracked in git**: `README.md`, `openapi.json`, `package.json`, `tsconfig.json`, `src/{index,client,errors,stream}.ts`,
`src/schema.d.ts` (394 KB, generated), and two test files. **`dist/` is gitignored** (the root `.gitignore` has `dist/`).

### 7.2 Consumed as TypeScript SOURCE for types, as BUILT JS at runtime — the split that matters

- **Types** resolve through the `types` condition to **`src/index.ts`** — raw TypeScript, which a consumer's `tsc` compiles as
  part of ITS program under ITS compiler options (it is a `.ts` file, not a `.d.ts`, so `skipLibCheck` does not cover it).
- **Runtime** resolves through `default` to **`dist/index.js`**, which exists only after `pnpm --filter @manifest/contract build`
  has been run in the manifest checkout. A fresh clone has no `dist/`. (RUNBOOK: *"the console BUNDLES dist/, and typechecks
  src/"*; `scripts/ci-acceptance.sh` builds it as a step.) The local checkout's `dist/` was built 2026-09-27 00:34, newer
  than every `src/*.ts` it compiles (last changed 2026-09-16 … 09-18).
- **`dist/` JS does not depend on the schema.** The runtime code (`client.js`, `errors.js`, `stream.js`, `index.js`) is
  schema-free, so a changed `openapi.json`/`schema.d.ts` needs NO rebuild; only a change to the four hand-written files does.
- **`dist/*.d.ts` is NOT a usable types entry**: `dist/index.d.ts`, `client.d.ts`, `errors.d.ts` and `stream.d.ts` import
  `./schema.js`, but `tsc` does not copy the input `src/schema.d.ts` to `dist/`, so `dist/schema.d.ts` does not exist. Only
  `src/` gives working types.
- `dist/` also contains the compiled tests (`client.test.js`, `stream.test.js`); nothing imports them.

### 7.3 Exports and exact signatures (`src/index.ts`)

```ts
// values
export { createManifestClient, idempotencyKey, SESSION_COOKIE, unwrap } from './client.js'
export { ManifestApiError } from './errors.js'
export { subscribe } from './stream.js'
// types
export type { ManifestClient, ManifestClientOptions, Schemas } from './client.js'
export type { ErrorCode, ErrorEnvelope } from './errors.js'
export type { components, paths } from './schema.js'
export type { ControlFrame, EventFrame, LogFrame, StreamFrame, SubscribeOptions, Subscription } from './stream.js'
```

```ts
// src/client.ts
import createClient, { type Client } from 'openapi-fetch'
export const SESSION_COOKIE = 'manifest_session'
export type Schemas = components['schemas']          // e.g. Schemas['Project'], Schemas['PendingAction']
export type ManifestClient = Client<paths>           // openapi-fetch 0.17: client.GET/POST/PUT/DELETE(path, init) → { data?, error?, response }

export interface ManifestClientOptions {
  origin: string                 // e.g. 'https://console.manifest.internal' — reduced to URL.origin; no path
  session?: string               // the manifest_session cookie VALUE, for a non-browser client only
  token?: string                 // 'mft_<id>_<secret>' — mutually exclusive with session
  fetch?: typeof globalThis.fetch
}
export function createManifestClient(options: ManifestClientOptions): ManifestClient
export function idempotencyKey(): string            // globalThis.crypto.randomUUID()
export function unwrap<T>(
  result: { data?: T; error?: unknown; response: Response },
  operation: string,
): T                                                 // throws ManifestApiError unless response.ok and no error

// src/errors.ts
export type ErrorEnvelope = components['schemas']['ErrorEnvelope']
export type ErrorCode = components['schemas']['ErrorCode']
export class ManifestApiError extends Error {
  readonly code: ErrorCode | 'UNPARSEABLE'
  constructor(readonly status: number, readonly envelope: ErrorEnvelope | undefined, readonly operation: string)
}

// src/stream.ts
export type StreamFrame = components['schemas']['StreamFrame']
export type EventFrame = components['schemas']['EventFrame']
export type LogFrame = components['schemas']['LogFrame']
export type ControlFrame = components['schemas']['ControlFrame']
export interface SubscribeOptions {
  origin: string                 // stream URL is `${origin → ws(s)}/v1/projects/${encodeURIComponent(projectId)}/events`
  session?: string
  token?: string                 // mutually exclusive with session
  projectId: string
  onFrame(frame: StreamFrame): void
}
export interface Subscription {
  ready: Promise<void>                                   // resolves on the control frame (after the replay); rejects if closed first
  closed: Promise<{ code: number; reason: string }>
  close(): void
}
export function subscribe(options: SubscribeOptions): Subscription
```

Behaviour worth knowing:

- **Browser detection** is `typeof globalThis.document !== 'undefined'`. In a browser, `createManifestClient` sets **no
  headers at all** (the browser sends cookie and Origin) and `subscribe` calls `new WebSocket(url)` with no protocols — so
  **a browser cannot use `token`** in `subscribe` (it is silently not sent), and passing `session` in a browser does nothing.
- In Node: `session` ⇒ `cookie: manifest_session=<value>` + `origin: <origin>`; `token` ⇒ `authorization: Bearer <token>`
  and NO origin. Passing both throws synchronously (mirroring the server's `CREDENTIAL_AMBIGUOUS`).
- `Idempotency-Key` is **not** added by the client: the generated `paths` make it a required header param of every
  mutation, so each call site passes `{ params: { header: { 'Idempotency-Key': key } } }`.
- `unwrap(result, 'operationId')` returns `data` or throws `ManifestApiError` with `status`, `code` (`'UNPARSEABLE'` when the
  body was not an envelope), `envelope` and `operation`; its `message` is `"<op> failed with <status> <CODE>: <message>"`.
- `EventFrame` is a union of 38 object types discriminated by `type`, so `if (f.kind === 'event' && f.type === 'build.failed')`
  narrows `f.machineDetail` to `{ buildId, code, reason }`.
- `subscribe` parses every message with `JSON.parse` and hands it to `onFrame` in arrival order; there is no reconnect logic
  (the reference console retries once, on 1013 only).

### 7.4 How the reference console consumes it (`packages/console`)

- `package.json`: `"@manifest/contract": "workspace:*"` (plus `react`/`react-dom` 19.3.0, `@scalar/api-reference` 1.72.0;
  dev: `vite` 8.3.0, `@vitejs/plugin-react` 6.1.1, `@manifest/mock` `workspace:*`). `node_modules/@manifest/contract` is a
  symlink to `../../../contract/`.
- `tsconfig.json`: extends the base, then `"moduleResolution": "Bundler"`, `"module": "ESNext"`, `"jsx": "react-jsx"`,
  `"lib": ["ES2023","DOM","DOM.Iterable"]`, `"types": ["vite/client"]`, `"noEmit": true`. **No `paths` alias.** `tsc`
  therefore reads the contract's `src/index.ts` via the `types` condition.
- `vite.config.ts`: **no alias for the contract** — Vite resolves `@manifest/contract` through the `exports` map's `default`
  condition, i.e. **`dist/index.js`**, which is why RUNBOOK builds the contract before `vite dev`. Dev server `127.0.0.1:7104`,
  `allowedHosts: ['console.manifest.internal']`, HMR over `wss://console.manifest.internal:443`; with `MANIFEST_MOCK=1` it
  proxies `/v1` (`ws: true`) and `/auth` to the mock on `127.0.0.1:7102` instead.
- It builds ONE client from `window.location.origin` (`createApi({ origin: window.location.origin })`) and one stream per
  project (`subscribe({ origin: window.location.origin, projectId, onFrame })`), and names `fetch`/`/auth/*` only in
  `src/auth.ts` (sign-in and step-up are `window.location.href` navigations; sign-out is `fetch('/auth/logout', {method:'POST'})`
  expecting `200 {redirectTo}`). Its import boundary (`boundary.test.ts`) allows only `@manifest/contract`, `react`,
  `node:` builtins and its own files.

### 7.5 Consuming it from a sibling repository (`/Users/rich/Developer/manifest-app`)

`/Users/rich/Developer/manifest-app` is currently an **empty directory**. With
`"@manifest/contract": "link:../manifest/packages/contract"` in its `package.json`, pnpm creates
`node_modules/@manifest/contract → ../../manifest/packages/contract` (a symlink; the relative path resolves to
`/Users/rich/Developer/manifest/packages/contract`). What works, and what gets in the way:

| Concern | Verdict |
|---|---|
| A `workspace:` dependency inside the contract | **None** — its only dependency is `openapi-fetch@0.17.0`. |
| Peer dependencies | **None.** |
| A tsconfig `paths` alias required | **No** — but see the `moduleResolution` row. |
| The contract's own dependency `openapi-fetch` | pnpm installs nothing for a `link:` target. `src/client.ts`/`dist/client.js` import `openapi-fetch` and resolve it from the symlink's REAL path, i.e. `manifest/packages/contract/node_modules/openapi-fetch` → the manifest checkout's `.pnpm` store. **Works only while the manifest checkout has run `pnpm install`**, and only with symlinks resolved to real paths (the default for both `tsc` — `preserveSymlinks: false` — and Vite). If the front-end imports `openapi-fetch` itself (e.g. for `Client` types), add it as its own dependency at exactly `0.17.0`. |
| **A build step** | **Yes, for runtime**: a bundler follows `exports["."].default` → `dist/index.js`, which is gitignored and exists only after `pnpm --filter @manifest/contract build` (plain `tsc`) in the manifest checkout. Without it Vite fails to resolve the entry. Rebuild only when `src/{client,errors,stream,index}.ts` change — never for schema changes. Alternative that needs no build: a Vite `resolve.alias` of `@manifest/contract` → `/Users/rich/Developer/manifest/packages/contract/src/index.ts` (Vite transpiles it), plus `server.fs.allow` covering that directory if Vite refuses to serve it. |
| **TS `moduleResolution`** | Must be **`bundler`**, `node16` or `nodenext` — the package has NO top-level `types`/`main`, so legacy `node`/`node10` resolution cannot find it at all. `bundler` is what the console uses. |
| **TS source under the consumer's compiler options** | `src/*.ts` is type-checked with the front-end's settings. It is written to pass `strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax` + `isolatedModules`. **One known clash: `erasableSyntaxOnly`** (on by default in recent `create-vite` TypeScript templates): `src/errors.ts` declares `ManifestApiError`'s constructor with parameter properties (`readonly status: number, …`), which that flag rejects (TS1294). Turn the flag off in the front-end, or the contract must change. `noUnusedLocals`/`noUnusedParameters` are fine (nothing unused). |
| `lib` / globals | The source uses `Response`, `fetch`, `WebSocket`, `globalThis.crypto.randomUUID` — provided by `lib: ["DOM"]` in a browser app (the contract itself builds with `@types/node`). |
| Types entry being `.ts` | Fine with `bundler`/`nodenext`; no `allowImportingTsExtensions` needed (it is a package export, and internal imports use `.js` specifiers that TS maps to `.ts`). Do not point types at `dist/*.d.ts` — incomplete (7.2). |
| ESM | ESM only (`"type": "module"`); a CommonJS consumer cannot `require` it. |
| Versioning drift | `link:` tracks whatever the manifest working tree holds — including a parallel session's **uncommitted** `openapi.json`/`schema.d.ts` (this happened during this research: Appendix B). The types can change under the front-end mid-day; pin by checking out a known commit if that matters. |
| The mock, for offline work | `@manifest/mock` (in the manifest checkout; `pnpm --filter @manifest/mock dev` builds then serves `http://127.0.0.1:7102`) answers every operation from fixtures/the document's examples, validates bodies with Ajv, and has `/auth/login` (sets `manifest_session=mock-session`, 302 to `returnTo`) and `POST /auth/logout` (`{redirectTo:'/'}`). It has **no `/auth/step-up`**, never answers `STEP_UP_REQUIRED` or `TOKEN_ACTION_PENDING`, and **does not enforce the Origin check**. `MANIFEST_MOCK_ROLE=admin` unlocks the fleet; `MANIFEST_MOCK_FAIL=1` plays a failed deploy. A front-end's dev server can proxy `/v1` (with `ws: true`) and `/auth` to it exactly as the console's `MANIFEST_MOCK=1` mode does. |
| Same-origin requirement | The API has no CORS and accepts only the console's `Origin` for session mutations **today**. A browser front-end on `app.manifest.internal` works only after the front-end plan's sitting 6 (the `app` origin: a list of accepted origins, an edge site forwarding `/v1` and `/auth` to the control plane and the rest to `host.docker.internal:7105`, a second SAML ACS). Until then: develop against the mock, or serve the page behind the console's origin. A server-side BFF holding a delegated token needs no `Origin`, but a token can never do the person-only or step-up actions (approve, production deploy, members, production secrets, confirming an agent's question), so faculty still need a real browser session for those. A dev proxy that rewrites `Origin` to the console's would pass the check but defeats the CSRF control — do not ship it. |


---

## 8. Inconsistencies, gaps and surprises

### 8.1 Docs vs the contract

1. **`agents.md` is stale on output**: it ends *"Reading a running app's own output is not available yet; The journey says
   what is planned."* — but `listInstances` and `getInstanceOutput` (`output:read`) are in contract 1.4.0, and `journey.md`
   lists them under *"Read a running app's recent output to debug it"*.
2. **The guides predate binary files.** `authoring.md` says `getFile` "answers one text file's content" and a binary file is
   `409 SOURCE_FILE_NOT_TEXT`; its *What is refused* says **"Text only"** and "`createCommit` writes and deletes text files";
   `getting-started.md`/`authoring.md` code comments say "A binary file is listed and cannot be read as text". The contract
   now has `getFile?encoding=base64` (any file ≤ 2 MiB) and `createCommit` writes with `encoding: "base64"` for images, PDFs
   and fonts (the ten recognised kinds), and `SourceTree.entries[].binary` says to read such files with base64. No guide
   mentions `encoding` or base64.
3. **The error envelope's own descriptions under-state two fields.** `ErrorEnvelope.error.launchReadiness` says "On
   RELEASE_PRODUCTION_GATE_UNAVAILABLE", but `RELEASE_REESCALATED`'s summary says its body carries `LaunchReadiness` too;
   `error.pendingAction` says "On TOKEN_ACTION_PENDING", but `conventions.md` and `TOKEN_ACTION_REJECTED`'s remedy
   (`pendingAction.reason`) say it comes with `TOKEN_ACTION_REJECTED` as well. Treat both fields as possibly present on both
   codes.
4. **The contract README says the package stays `0.x`** "until P5c's console has proved the contract"; it is `1.4.0`. And it says
   *"additive changes bump the minor"* — yet `186fa34` added an operation, a schema and an event type and left
   `info.version`/`package.json` at `1.4.0` (the two are held equal by a test, but nothing forces the bump). A client cannot
   tell the 56-operation and 57-operation documents apart by version.
5. **The guides name only 38 of the 57 operations** outside the journey table. Never explained in prose: **`updateProject`** (only a journey row), `getEnvironment`,
   `listInstances`, `getInstanceOutput`, `listBuilds`, `listReleases`, `getRelease`, `getApproval`, `getApprovalPreview`,
   `getSpec`, `getLaunchRecords`, `listMembers`, **`addMember`, `removeMember`**, **`listPendingActions`,
   `confirmPendingAction`, `rejectPendingAction`** (the person's half of D24 — the guides describe it only from the agent's
   side), `listFleet`, and `streamProjectEvents` by name (covered as `subscribe`). The front-end plan's sitting 11 (Task 14)
   is scheduled to add a *Building a front-end* guide and bring the others up to date.
6. `authentication.md`'s step-up list includes "changing a quota"; no quota operation exists. `getting-started.md`'s example
   mint omits `output:read`, so an agent minted from it cannot read output.

### 8.2 Things the contract does not tell a UI

7. **Capabilities are not in the OpenAPI document.** `security` distinguishes session-only from session-or-token, and
   nothing more; which capability an operation asserts, which role holds it, what needs step-up, and what a token is refused
   live only in descriptions and route code (§3's "Who" is read from the code). There is no "what may I do here" endpoint:
   the UI must derive button visibility from `Me.role` (platform admin?) + `listMembers` (owner/collaborator) + §2.3's table,
   and still handle `FORBIDDEN`/`STEP_UP_REQUIRED` gracefully.
8. **Step-up freshness is unreadable** (no field on `Me` or anywhere), so the UI cannot pre-empt `STEP_UP_REQUIRED`; it can
   only react to it and navigate to `/auth/step-up`.
9. **Names are missing where a UI wants them**: `Release.createdBy`, `Audience.setBy`, `Approval.decidedBy` are bare uuids
   (only `Approval.decidedByName`/`ApprovalPreview.createdByName` are resolved); `PendingAction` names its `tokenId` but not
   the token's name (and `listTokens` is session-only); and a UI must show `Project.name` (since `186fa34`), never `slug`.
10. **Owners cannot revoke collaborators' tokens**: `revokeToken` is minter-only (anyone else gets 404), though
    `listTokens` shows every token on the project to any member.
11. **`listProjects` for a platform admin lists only their memberships**; the cross-project view is `listFleet` (admin only).
12. **A browser cannot subscribe to the stream with a token** — a browser WebSocket sends no `Authorization` header, and the
    client silently ignores `token` in a browser. A browser needs the session cookie and the console's Origin.
13. **No resume cursor on the stream**; reconnects replay the newest 50 events and the client de-duplicates by `id`.
14. **Bootstrapping requires a person**: `createProject`, `mintToken`, `listTokens`, `revokeToken`, `getMe` are
    session-only, so a server-side BFF cannot start from a token alone.
15. **Declared-but-unanswered values**: `Build.status: "pending"` "is not answered today"; `Instance.kind` `worker`/`cron`
    are never run ("`web` … is the only kind the platform runs today"). `Rehearsal.ranAt` is a plain `string` with no
    `date-time` format, unlike every other timestamp. `ApproveReleaseRequest.previewId`/`RejectReleaseRequest.previewId` are
    optional in the schema but REQUIRED by the operation (`400 APPROVAL_PREVIEW_REQUIRED`), so the generated types will not
    force them. `PendingAction.action` and `Token.capabilities` are plain strings in responses (the enum exists only on
    `MintTokenRequest`).
16. **38 of the 113 error codes are declared by no operation** (§5), including the two any request can meet
    (`CREDENTIAL_AMBIGUOUS`, `ROUTE_NOT_FOUND`); and 9 `AI_*` codes are runtime codes for a deployed app's AI gateway calls,
    not API answers. There is **no AI operation** in the API at all today.

### 8.3 Machinery leaking into fields a UI would want to show

17. `humanMessage` sentences and `LaunchReadinessItem.why`/`.owner`, `ApprovalDiff.security[].note`/`coverage`/
    `review.detail` carry design-spec citations (`(§13)`, `(§9, C4)`, `D24`); several event sentences embed commit shas,
    file paths, scanner rule names, raw capability strings (`token.minted`), env-var names, raw enum states
    (`change_requested`) and blueprint refs (`fixture-node@1`). Details in §6.1.
18. `Incident.exitReason`/`diffSinceHealthy`/`failedCheck` read as prose but are technical; `Incident.prompt` is written for
    an agent; `Build.error` is "for its author" and may quote tool output. None of these should reach faculty verbatim.

### 8.4 What is changing next (so the front-end should expect it)

The front-end enablement plan (`docs/superpowers/plans/2026-09-27-front-end-enablement.md`, sittings 1–4 done, **5 in
progress now**) adds, in order: **`updateProject`** (`PATCH /v1/projects/{projectId}`, `Project.name`, event
`project.renamed` — COMMITTED at `186fa34`, and included throughout this digest); **adding a member by CWL login name or email**
(`AddMemberRequest` gains keys; events `member.added`/`member.removed`); **the `app` origin** (`app.manifest.internal`:
accepted origins become a list; sign-in, step-up and sign-out resolve the origin a request arrived on; the edge forwards
`/v1`, `/auth` there to the control plane and the rest to `host.docker.internal:7105`); **agent sessions**
(`POST`/`GET /v1/projects/{projectId}/agent-sessions`, `DELETE /v1/agent-sessions/{sessionId}`, `GET /v1/agent-budget`,
capability `agent:session`; a model key charged to the person, default $10/month, $2/session); **archive / restore**
(`POST /v1/projects/{projectId}/archive`, `/restore`, `409 PROJECT_ARCHIVED` on every change); **delete** of a
never-launched project (`DELETE /v1/projects/{projectId}`); new console coverage and mock scripting; the guides including
*Building a front-end* (`GET /v1/docs/frontend`); and `make demo-frontend`. Every one of these will move the counts above.


---

## Appendix A — every component schema, field by field (generated from the committed contract)

Each of the 82 schemas, its description, and every property: type, whether optional, and its description. Nested inline objects are expanded; a named schema is shown by name and expanded under its own heading here. `EventFrame` is §4.3; `ErrorCode` and `ManifestErrorCode` are §5.


### `AddMemberRequest`

Who to add, and as what. Adding someone who is already a member changes their role.

- `puid`: string [minLen 1, maxLen 64] — The person’s ubcEduCwlPuid. They must have signed in once.
- `role`: "owner" \| "collaborator" — The role to grant: `owner` or `collaborator`.

### `AppSecretList`

An environment’s app secrets, by name: which are declared and which are set.

- `environmentId`: string (uuid) — The environment.
- `environmentKind`: "sandbox" \| "staging" \| "production" — Which of the three it is. Production’s values are set only by a person who has stepped up.
- `secrets`: `AppSecretStatus`[] — Every name declared or set, sorted. A declared name with `set: false` stops the next deploy of this environment (`RELEASE_SECRET_NOT_SET`).

### `AppSecretStatus`

One secret’s name in one environment, and whether it has a value — never the value.

- `name`: string — The variable’s name, as manifest.yaml’s `env` declares it: an upper-case letter, then upper-case letters, digits and underscores, at most 128 characters.
- `declared`: boolean — Whether the environment’s newest valid manifest.yaml declares this name with `secret: true`. Only a declared name reaches the app.
- `set`: boolean — Whether a value is stored. The value itself is never answered by any operation.
- `updatedAt`: string (date-time) \| null — When the value last changed, or was first set; null when none is.

### `Approval`

One decision about one release, kept for ever (§13).

- `id`: string (uuid) — The decision.
- `releaseId`: string (uuid) — The release decided on.
- `projectId`: string (uuid) — Its project.
- `decision`: "approved" \| "rejected" — What the administrator decided; a rejection is final for this release.
- `decidedBy`: string (uuid) — Who decided.
- `decidedByName`: string — The display name of the person who decided — the owner meets a decision before anyone else, and a user id tells them nothing.
- `decidedAt`: string (date-time) — When.
- `imageDigest`: string — What this approval binds to (§13).
- `reason`: string \| null — Required on a rejection: a refusal with no words is one nobody can act on (D23.7).
- `diff`: `ApprovalDiff`
- `previewId`: string (uuid) \| null — The stored preview the administrator read, whose diff this record COPIES. Null only for a decision made before previews existed.

### `ApprovalDiff`

The exact diff shown at decision time (§13).

- `imageDigest`: string — The image this approval binds to — the same value as the approval’s.
- `changes`: object[] — Every change to manifest.yaml since the release it is compared with, in the file’s own vocabulary.
  - `path`: string — Where, in manifest.yaml’s own vocabulary — the file an agent edits.
  - `from`: string — What it was, as a string.
  - `to`: string — What it is now.
  - `summary`: string — One clause a faculty member can read.
  - `added`: string[] *(optional)* — For a set-valued field only (`auth.attributes`, `egress.allow`, `ai.models`, `services`, `env`): what this change added, sorted — members of the set, or the names of services and variables. Absent for any other field, and absent from a record taken before the field existed.
  - `removed`: string[] *(optional)* — For a set-valued field only: what this change removed, sorted — what the app no longer has. Absent exactly when `added` is.
- `services`: string[] — `type@version`, sorted — what this release asks the platform to run.
- `attributes`: string[] — The CWL attributes this release requests, sorted (§7).
- `resources`: object — The production limits this release would run under.
  - `cpu`: number \| null — CPU cores; null when no limit is set.
  - `memory`: string \| null — Memory; null when no limit is set.
  - `disk`: string \| null — Disk; null when no limit is set.
  - `pids`: integer \| null — Processes and threads; null when no limit is set.
- `summary`: string \| null — The AI-written plain-English summary of what changed. **Null is a state, not an error**: an approval gate that fails closed on a language model being down is an outage, not a control. `summarySource` says why.
- `summarySource`: "llm" \| "unavailable" \| "no-previous-release" \| "no-changes" \| "withheld" \| "not-modelled" — `llm`: the model wrote it. `unavailable`: it could not be produced, and the diff beside it is the control. `no-previous-release`: this is a first launch, so there is nothing to diff. `no-changes`: nothing in manifest.yaml changed, and the summary is the platform’s fixed sentence — no model wrote it. `withheld`: the model answered, and its answer broke the schema it was given or stated a decision, so it is not shown — `summaryWithheldBecause` names the rule, and the diff, the security notes and the reviewer’s verdict are the record. `not-modelled`: every change is one no model describes — a change to the CWL attributes, whose change line is the record — so no model was asked; this is by design, not an outage.
- `summaryWithheldBecause`: string \| null — Which rule a `withheld` answer broke, in the platform’s words — never the model’s text, which could carry an app’s own words. Null for every other `summarySource`.
- `summaryExposures`: object[] \| null — One sentence per change, in `changes`’ order, written by a language model: what that change could expose. **Never for a change to `auth.attributes`**: a model read those wrong — a removed attribute as one the app now receives, `sn` as a student number — so the change line alone is the record, and such a change has no entry here. The model is given the changes and the security notes only — never the verdict — and fills a schema with no place for one. The change lines are the record; these are the model’s reading of them, and a reading can get a fact wrong. Null unless `summarySource` is `llm`, and for a record made before it existed, whose `summary` is one string.
  - `path`: string — The change it is about — one of `changes`’ own paths.
  - `sentence`: string — What that change could expose, in the model’s words.
- `baselineReleaseId`: string (uuid) \| null — The last approved release this one was compared with (§13 D9.2) — null for a first launch, and for a record made before subsequent releases were compared.
- `sensitiveFields`: ("services" \| "auth.attributes" \| "egress.allow" \| "resources" \| "data.classification" \| "ai.models" \| "blueprint")[] — Which of §7’s sensitive fields changed since that release — what re-escalated it to an administrator. Empty for a first launch.
- `security`: object[] — What each changed field means for security and privacy, in the platform’s own words — present whether or not the model answered.
  - `field`: "services" \| "auth.attributes" \| "egress.allow" \| "resources" \| "data.classification" \| "ai.models" \| "blueprint" — One of §7’s sensitive fields that changed.
  - `note`: string — What it means for security and privacy.
- `coverage`: string \| null — D33’s coverage limit, stated in the record: an administrator sees a first launch and a re-escalation, never a self-serve release, and nothing reviews code. Null only for a record made before it was stated.
- `review`: object — The code reviewer’s verdict at decision time (D33, §15). `not_performed` until a reviewer is configured — an honest absence rather than a stub that purports to have reviewed.
  - `state`: "not_performed" \| "clean" \| "findings" — The verdict, or `not_performed`.
  - `reviewer`: string — Which reviewer answered.
  - `detail`: string — What it said, in the platform’s words.

### `ApprovalPreview`

§13’s exact diff, shown BEFORE the decision: approve and reject name it, the platform recomputes its facts and refuses if they moved (`APPROVAL_PREVIEW_STALE`), and the record copies its summary and verdict rather than asking the model again.

- `id`: string (uuid) — The preview — what `approveRelease` and `rejectRelease` name as `previewId`.
- `releaseId`: string (uuid) — The release it is of.
- `projectId`: string (uuid) — Its project.
- `createdBy`: string (uuid) — Who took it.
- `createdByName`: string — Who took it, by name.
- `createdAt`: string (date-time) — When it was taken.
- `expiresAt`: string (date-time) — Thirty minutes after it was taken. A decision naming it after this is refused `APPROVAL_PREVIEW_EXPIRED`; take a new one.
- `imageDigest`: string — The digest the preview was taken over (§13).
- `diff`: `ApprovalDiff`

### `ApproveReleaseRequest`

An administrator’s approval, naming the preview they read.

- `reason`: string [maxLen 2000] *(optional)* — Why, in the administrator’s words; optional on an approval.
- `previewId`: string (uuid) *(optional)* — The preview the administrator read (`POST /v1/releases/{releaseId}/approval-preview`). Optional in this schema and REQUIRED by the operation: without it the answer is `400 APPROVAL_PREVIEW_REQUIRED`.

### `Audience`

Who the app is for, as its owner answered at creation (§24, D29). A large or public audience adds a load rehearsal to the launch checklist.

- `scale`: "solo" \| "class" \| "large_course" \| "public" — §24: how many people the app is for.
- `burst`: "steady" \| "synchronised" — §24: whether they arrive steadily, or all at once — a class starting a lab together.
- `justification`: string \| null — Why, in the owner’s words; null when none was given.
- `setBy`: string (uuid) — Who answered.
- `setAt`: string (date-time) — When they answered.

### `AudienceInput`

§24’s two questions about who the app is for, answered by a person at creation.

- `scale`: "solo" \| "class" \| "large_course" \| "public" — §24: how many people.
- `burst`: "steady" \| "synchronised" — §24: do they all arrive at once.
- `justification`: string [maxLen 1000] *(optional)* — Why, in a sentence or two — shown to an administrator for a large or public app.

### `Blueprint`

A blueprint as a client chooses one: what it provides and the starters it offers. Never its base image or build internals.

- `ref`: string — `name@major` — what a project pins (§25).
- `name`: string — The blueprint’s name.
- `majorVersion`: integer — Its major version — the `@major` a project pins.
- `language`: string — What an app on it is written in.
- `defaultPort`: integer — The port its apps listen on unless `runtime.port` says otherwise.
- `healthPath`: string — The health path its skeleton answers.
- `schemaVersions`: integer[] — The `manifest:` schema versions it understands.
- `provides`: object — What an app on it may declare in manifest.yaml (§25).
  - `services`: string[] — The service types it can bind — what `services[].type` may name.
  - `authProviders`: ("cwl" \| "none")[] — What `auth.provider` may be.
  - `ai`: boolean — Whether its apps may declare `ai.models`.
- `starters`: object[] — §25: what `POST /v1/projects` accepts as `starter` for this blueprint.
  - `name`: string — The starter’s name, as `starter` in `createProject`.
  - `summary`: string — What it is, in a sentence.

### `BlueprintList`

Every blueprint a project can be created from.

- (array of `Blueprint`)

### `Build`

A build of one commit (§13). It answers `running` when it starts, and ends as `succeeded` or `failed` on the project’s stream.

- `id`: string (uuid) — The build — what `getBuild`, `getBuildLog` and `createRelease` name.
- `projectId`: string (uuid) — Its project.
- `commitSha`: string — The commit built, whose own manifest.yaml it was built with.
- `status`: "pending" \| "running" \| "succeeded" \| "failed" — `running` from the moment it is started, then `succeeded` or `failed` — the stream says which as it happens. `pending` is not answered today.
- `imageDigest`: string \| null — `sha256:…` once the build has succeeded; the image a release names.
- `error`: string \| null — Why a failed build failed, in words its author can act on (§14).
- `scan`: `ScanSummary` \| null — Null until the build succeeds, and for a build from before scans were recorded.
- `createdAt`: string (date-time) — When it was started.

### `BuildList`

A project’s newest builds, newest first.

- (array of `Build`)

### `BuildLog`

§14’s build log, as stored.

- `buildId`: string (uuid) — The build.
- `lines`: object[] — Every line, in order.
  - `seq`: integer [min 0] — Its position, from 0.
  - `stream`: "stdout" \| "stderr" — Which of the build’s outputs wrote it.
  - `text`: string — Redacted at capture (§14).
  - `at`: string (date-time) — When it was written.

### `CommitDetail`

One commit and every file it changed against its first parent, with patches.

- `commitSha`: string — A full 40-character commit id.
- `parents`: string[] — Its parents, first parent first; empty for the first commit.
- `subject`: string — The first line of the commit message.
- `message`: string — The whole commit message, cut at 4096 characters.
- `messageTruncated`: boolean — True when `message` was cut.
- `authorName`: string — The author git recorded. For a commit made through the API this is the person's name; for any other push it is whatever the pusher's git said, and is not verified.
- `authoredAt`: string (date-time) — When git says the commit was authored, in UTC.
- `madeThrough`: object \| null — Who made this commit through Manifest, from the platform’s own record — a person, or a person’s agent through a delegated token. Null for a commit pushed any other way, whose author is only what the pusher’s git said.
  - `kind`: "person" \| "agent" — A person in a session, or a person’s agent through a delegated token.
  - `name`: string — The person’s name — for an agent, the person who minted its token.
  - `tokenName`: string \| null — The token’s name, for an agent; null for a person.
- `changes`: object[] — The files the commit changed, by path — every one, or the first 1000 when `truncated` is true.
  - `path`: string — The file’s path.
  - `status`: "added" \| "modified" \| "deleted" \| "type_changed" — What happened to it, against the commit's first parent.
  - `binary`: boolean — Whether git calls the file binary; a binary file has no patch and no line counts.
  - `additions`: integer [min 0] \| null — Lines added; null for a binary file.
  - `deletions`: integer [min 0] \| null — Lines removed; null for a binary file.
  - `patch`: string \| null — A unified diff with three lines of context; null for a binary file, or once 256 KiB of patch has been given.
- `truncated`: boolean — True when the commit changed more than 1000 files and `changes` lists the first 1000 by path; read the rest with git.
- `patchesTruncated`: boolean — True when some `patch` is null because the 256 KiB budget was spent.

### `CommitList`

A page of the branch’s history, following first parents, newest first.

- `ref`: string — A branch name, or a full 40-character commit id. Defaults to `main`.
- `commits`: `CommitSummary`[] — Newest first.
- `next`: string \| null — Pass as `cursor` for the next page; null on the last page.

### `CommitOutcome`

The commit made — or, for a dry run, the one that would have been.

- `dryRun`: boolean — True when nothing was written.
- `commitSha`: string \| null — The new commit on `main`; null for a dry run.
- `parent`: string — The commit this one follows — the request’s `baseCommit`.
- `changes`: object[] — What changed, by path. A write that left a file as it was is not listed.
  - `path`: string — The file’s path.
  - `status`: "added" \| "modified" \| "deleted" — What the commit did to it.
- `spec`: object — The new commit's manifest.yaml — always valid, because an invalid one is refused `SPEC_INVALID` before anything is written.
  - `appSpecId`: string (uuid) \| null — The recorded validation of the new commit; null for a dry run — and for a commit that landed when its validation could not be recorded, which a build of it then makes first.
  - `sensitiveDiff`: `SensitiveDiff`
  - `warnings`: `ManifestError`[] — What validating the new manifest.yaml said without refusing — a field validated but not enforced yet (`SPEC_FIELD_NOT_ENFORCED`). The commit is made regardless.

### `CommitSummary`

One commit on the branch — who, when and why, without its changes.

- `commitSha`: string — A full 40-character commit id.
- `parents`: string[] — Its parents, first parent first; empty for the first commit.
- `subject`: string — The first line of the commit message.
- `message`: string — The whole commit message, cut at 4096 characters.
- `messageTruncated`: boolean — True when `message` was cut.
- `authorName`: string — The author git recorded. For a commit made through the API this is the person's name; for any other push it is whatever the pusher's git said, and is not verified.
- `authoredAt`: string (date-time) — When git says the commit was authored, in UTC.
- `madeThrough`: object \| null — Who made this commit through Manifest, from the platform’s own record — a person, or a person’s agent through a delegated token. Null for a commit pushed any other way, whose author is only what the pusher’s git said.
  - `kind`: "person" \| "agent" — A person in a session, or a person’s agent through a delegated token.
  - `name`: string — The person’s name — for an agent, the person who minted its token.
  - `tokenName`: string \| null — The token’s name, for an agent; null for a person.

### `ControlFrame`

Ends the replay: everything after it is live.

- `kind`: "control" — A message about the stream itself.
- `id`: string — An id for this message; opaque.
- `projectId`: string (uuid) — The project the stream is for.
- `type`: "manifest.stream.ready" — The replay is over: every message after this one is live.

### `CreateCommitRequest`

Changes to make on `main`, computed from `baseCommit`: whole-file writes — text, or an image, PDF or font as base64 — and deletions.

- `baseCommit`: string — The commit these changes were computed from — `commitSha` from the tree or file you read. `main` must still be exactly this commit, or the request is refused `SOURCE_CONFLICT`.
- `message`: string [minLen 1, maxLen 4096] — The commit message. Its first line is its subject. Well-formed Unicode, with no control character but a line break (`\n`) and a tab — no NUL, no carriage return and no escape.
- `changes`: (object \| object)[] — At most 500 writes and deletions, each naming a different path.
  - variant 1 (op = "write"):
    - `op`: "write" — Create the file, or replace its content.
    - `path`: string [minLen 1] — A relative path, `/`-separated: at most 1024 bytes, 255 per component and 32 components; no empty, `.` or `..` component, no leading or trailing `/`, no backslash, no control character, and no `.git` component.
    - `content`: string — The whole new content of the file. As text (the default): at most 1 MiB of UTF-8, with no NUL character. With `encoding: base64`: the file’s bytes as canonical base64, at most 2 MiB decoded — an image (PNG, JPEG, GIF, WebP, ICO), a PDF or a font (WOFF, WOFF2, TTF, OTF), recognised by its bytes, at a path ending in one of those kinds’ extensions (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`, `.pdf`, `.woff`, `.woff2`, `.ttf`, `.otf` — any of them for any kind). A new file is mode `100644`; an existing file keeps its mode.
    - `encoding`: "utf8" \| "base64" *(optional)* — How `content` carries the file: `utf8` (the default) for text, `base64` for bytes. Text sent as base64 is refused — send it as text.
  - variant 2 (op = "delete"):
    - `op`: "delete" — Remove the file. It must exist in `baseCommit`.
    - `path`: string [minLen 1] — A relative path, `/`-separated: at most 1024 bytes, 255 per component and 32 components; no empty, `.` or `..` component, no leading or trailing `/`, no backslash, no control character, and no `.git` component.
- `dryRun`: boolean *(optional)* — Run every check the commit would, write nothing, and answer what would have happened.

### `CreateProjectRequest`

A new project: its slug, optionally a name people read, its blueprint, an optional starter, and who it is for.

- `slug`: string [minLen 1] — Checked by the same function as GET /v1/slugs/{slug} (§23).

- `name`: string [minLen 1, maxLen 80] *(optional)* — What people call the project — any text of 1 to 80 characters, trimmed, on one line. The slug, when none is given; `updateProject` changes it later.
- `blueprint`: string [minLen 1] — `name@major`, from GET /v1/blueprints.
- `starter`: string [minLen 1] *(optional)* — One the blueprint offers. Without one: the skeleton and a minimal manifest.
- `audience`: `AudienceInput`

### `CreateReleaseRequest`

The build to freeze into a release, with a line saying what it changes.

- `buildId`: string (uuid) — A build that succeeded (`listBuilds`).
- `summary`: string [maxLen 500] *(optional)* — What this release changes, for the people who read it.

### `CreatedProject`

§22 steps 2–3: the project, its environments, and the validation of the manifest its first commit carries.

- `id`: string (uuid) — The project — what every project-scoped path names.
- `slug`: string — The project’s permanent identifier, and the first label of every hostname it has (§23). It never changes; `name` is what people read.
- `name`: string [minLen 1, maxLen 80] — What people call the project — any text of 1 to 80 characters, trimmed, on one line. Never part of an address: the slug is.
- `blueprint`: string — `name@major` (§25).
- `starter`: string \| null — The starter the first commit was seeded from (§25); null for the skeleton alone.
- `owner`: `UserSummary`
- `audience`: `Audience` \| null — Who it is for (§24); null for a project created before the question was asked.
- `createdAt`: string (date-time) — When it was created.
- `launchedAt`: string (date-time) \| null — When it first went to production (§13 D9) — null until then; never cleared.
- `repository`: `RepositoryLink`
- `environments`: `Environment`[] — Its three environments, none deployed yet.
- `spec`: `SpecValidation`

### `DeployRequest`

Which release to deploy.

- `releaseId`: string (uuid) — The release to deploy to the environment in the path.

### `DocIndex`

The API’s documentation: every page Manifest serves, for a person and for an agent.

- `pages`: object[] — Every page, the index first, then the guides, then the generated reference.
  - `slug`: string — The page’s name in `getDoc`: its path under the documentation without `.md`, `/` as `-` — `reference-errors` is `reference/errors.md`.
  - `title`: string — The page’s title — its first heading.
  - `summary`: string — The page’s first paragraph: what it is for and who it is for, in a sentence or two.

### `DocPage`

One page of the API’s documentation, as the platform serves it.

- `slug`: string — The page’s name in `getDoc`: its path under the documentation without `.md`, `/` as `-` — `reference-errors` is `reference/errors.md`.
- `title`: string — The page’s title — its first heading.
- `markdown`: string — The page, as Markdown. Its links name other pages by their file, as `authoring.md` — `getDoc` reads each by its slug.

### `EmptyRequest`

A mutation that takes no fields still sends a JSON object: `{}`, with `Content-Type: application/json`.



### `Environment`

One of a project’s three environments (§11): where a release is deployed, and what is serving there now.

- `id`: string (uuid) — The environment — what `deploy`, `listIncidents` and the secrets operations name.
- `projectId`: string (uuid) — Its project.
- `kind`: "sandbox" \| "staging" \| "production" — Which of the three: `sandbox`, `staging` or `production` (§11).
- `hostname`: string — §23: `<slug>.<zone for this kind>`. Permanent.
- `url`: string (uri) — Where the app answers in this environment, once it is deployed.
- `instance`: `Instance` \| null — The instance the hostname reaches (§6 Route). Null before any deploy.

### `EnvironmentList`

A project’s three environments: sandbox, staging and production.

- (array of `Environment`)

### `ErrorCode`

Every code the API answers with, in `error.code`. Stable: a client switches on it (§20). `x-enumDescriptions` gives each code’s meaning, and the top-level `x-manifest-errors` its status and remedy.

(enum of 113 values — see section 5)


### `ErrorEnvelope`

Every error the API answers, in one shape (D23.7): a stable code to switch on, a message for a person, and — where there is one — a hint and the details to act on.

- `error`: object — What went wrong: switch on `code`; `x-manifest-errors` gives its remedy.
  - `code`: `ErrorCode`
  - `message`: string — For a person. Never parse it; switch on `code`.
  - `hint`: string *(optional)* — What to do about it.
  - `details`: `ManifestError`[] *(optional)* — On SPEC_INVALID: each problem in manifest.yaml, with its path and code.
  - `launchReadiness`: `LaunchReadiness` *(optional)* — On RELEASE_PRODUCTION_GATE_UNAVAILABLE: what a first launch still needs (§13).
  - `pendingAction`: `PendingAction` *(optional)* — On TOKEN_ACTION_PENDING: the question a person must answer before this request can succeed (D24).

### `EventFrame`

An audit Event, as recorded (§20) and redacted at capture (§14). Switch on `type`; each type has one `machineDetail` shape. Replayed on reconnect.

(see sections 4/5)


### `Fleet`

§26’s fleet, administrators only. Not yet: department, custom domains, AI spend this month.

- (array of object)
  - `id`: string (uuid) — The project.
  - `slug`: string — Its name (§23).
  - `blueprint`: string — Its blueprint, `name@major`.
  - `starter`: string \| null — Its starter; null for the skeleton alone.
  - `owner`: object — Its owner of record.
    - `id`: string (uuid) — Their user id.
    - `displayName`: string — Their name.
    - `email`: string — Their address.
  - `audience`: `Audience` \| null — Who it is for (§24); null for a project created before the question was asked.
  - `createdAt`: string (date-time) — When it was created.
  - `slugReserved`: boolean — §23: holds a label reserved after it was created. Handle with the owner; never renamed automatically.
  - `environments`: object[] — Its three environments, and what each is running.
    - `kind`: "sandbox" \| "staging" \| "production" — Which environment.
    - `hostname`: string — Its hostname (§23).
    - `state`: string \| null — The serving instance’s state; null before any deploy.
    - `releaseId`: string (uuid) \| null — The release serving; null before any deploy.
    - `imageDigest`: string \| null — The image that release runs; null before any deploy.
    - `lastDeployAt`: string (date-time) \| null — When it was last deployed.
    - `latestIncidentAt`: string (date-time) \| null — When its newest Incident was recorded; null if it has none.

### `IamRegistration`

What UBC IAM registered for the app’s production CWL sign-in (§9), as an administrator recorded it.

- `id`: string (uuid) — The record.
- `projectId`: string (uuid) — Its project.
- `entityId`: string — §9: fixed at registration and stored here rather than recomputed — which is also why a project slug is immutable after production launch.
- `acsUrl`: string — The assertion consumer URL registered — where sign-ins are sent.
- `sloUrl`: string — The single-logout URL registered.
- `certFingerprint`: string \| null — The fingerprint of the signing certificate registered; null when none was recorded.
- `certExpiresAt`: string (date-time) \| null — D20: an unnoticed expiry silently kills login for a live course app.
- `registeredAttributes`: string[] — WHAT UBC IAM ACTUALLY REGISTERED. A production build fails when a release asks for an attribute that is not in here (§7). Once registered, it changes only on a record that reaches `active` — a change UBC has not registered yet is `requestedAttributes`.
- `requestedAttributes`: string[] \| null — What an outstanding CHANGE REQUEST asks UBC IAM for (§9) — the registration’s own `change_requested` state is the change request. Null when none is outstanding; cleared when the registration is recorded `active` again.
- `registeredAt`: string (date-time) \| null — When UBC IAM last registered this Service Provider — set when the record reaches `active`. Null until the first time; a launched app’s releases need it (§13, D9).
- `state`: "draft" \| "submitted" \| "active" \| "change_requested" \| "expired" — Along §9’s states: `draft`, `submitted` to UBC IAM, `active` once registered, `change_requested` while a change is with UBC IAM, and `expired`.
- `externalTicketRef`: string \| null — UBC IAM’s own reference for the request; null when none was recorded.
- `updatedAt`: string (date-time) — When the record last changed.

### `Incident`

A failed deploy, as §14 records it: how it ended, what the platform checked, what the app printed, and what changed since it last worked.

- `id`: string (uuid) — The Incident.
- `instanceId`: string (uuid) — The instance that failed.
- `releaseId`: string (uuid) — The release it ran (`getRelease`).
- `exitReason`: string — How it ended — its exit, or that it never answered its health check.
- `logTail`: string — The last 200 lines, redacted at capture (§14).
- `failedCheck`: string — Which check the platform ran and what it got back (§11).
- `diffSinceHealthy`: string — What changed in manifest.yaml since the last release that was healthy here — often the cause.
- `createdAt`: string (date-time) — When it was recorded.
- `prompt`: string — §14: shaped to be handed straight to an agent as a repair request.

### `IncidentList`

One environment’s Incidents, newest first.

- `environmentId`: string (uuid) — The environment.
- `incidents`: `Incident`[] — Newest first.

### `Instance`

A running (or once-running) copy of a release in one environment (§11). Never its driver or handle.

- `id`: string (uuid) — The instance.
- `environmentId`: string (uuid) — The environment it runs in.
- `releaseId`: string (uuid) — The release it runs (`getRelease`).
- `kind`: "web" \| "worker" \| "cron" — What kind of process it is; `web`, which answers requests, is the only kind the platform runs today.
- `state`: "pending" \| "building" \| "provisioning" \| "starting" \| "healthy" \| "failed" \| "hibernated" \| "waking" \| "destroying" \| "gone" — Where it is in its life (§11): `provisioning` and `starting` on the way up, `healthy` when it serves, `failed` when it never did, and `destroying` then `gone` once replaced.
- `lastSeenAt`: string (date-time) \| null — When the platform last saw it running; null before it started.

### `InstanceList`

An environment’s instances (§11), newest first.

- `environmentId`: string (uuid) — The environment.
- `instances`: `InstanceSummary`[] — The environment’s instances, the one seen most recently first — at most 50. A failed instance stays listed after it is replaced, so an agent can read why it failed (`listIncidents`).
- `truncated`: boolean — True when the environment has had more than 50 instances and only the 50 seen most recently are listed.

### `InstanceOutput`

A running instance’s recent output (§14): read on request, never streamed, never stored — in sandbox and staging only.

- `instanceId`: string (uuid) — The instance.
- `environmentId`: string (uuid) — The environment it runs in.
- `environmentKind`: "sandbox" \| "staging" — Only sandbox and staging output is readable (§14).
- `readAt`: string (date-time) — When Manifest read it. Nothing is kept: read again to see newer lines.
- `lines`: object[] — The last lines the app printed, oldest first — redacted at read with the rules that redact an Incident’s log tail. At most `lines`, and fewer when a line the runtime stored in pieces began before the window.
  - `at`: string (date-time) — When the line was printed, as the runtime recorded it — or, when `stamped` is false, when Manifest read it.
  - `stamped`: boolean — Whether `at` is the runtime’s own time for the line.
  - `stream`: "stdout" \| "stderr" — Which of the app’s two outputs it printed to.
  - `text`: string — The line, redacted. A line longer than 4 KiB is cut and ends `…[cut: N bytes]`.
- `truncated`: object — Which bound the answer met.
  - `lines`: boolean — The app printed more lines than were read.
  - `bytes`: boolean — The lines read were more than 256 KiB together, and the oldest were dropped.
- `failure`: string \| null — Why reading stopped early, when it did — an error’s code or name, never its message. The lines before it are still answered.

### `InstanceSummary`

An instance, and whether it is the one serving.

- `id`: string (uuid) — The instance.
- `environmentId`: string (uuid) — The environment it runs in.
- `releaseId`: string (uuid) — The release it runs (`getRelease`).
- `kind`: "web" \| "worker" \| "cron" — What kind of process it is; `web`, which answers requests, is the only kind the platform runs today.
- `state`: "pending" \| "building" \| "provisioning" \| "starting" \| "healthy" \| "failed" \| "hibernated" \| "waking" \| "destroying" \| "gone" — Where it is in its life (§11): `provisioning` and `starting` on the way up, `healthy` when it serves, `failed` when it never did, and `destroying` then `gone` once replaced.
- `lastSeenAt`: string (date-time) \| null — When the platform last saw it running; null before it started.
- `serving`: boolean — Whether the environment’s hostname reaches this instance now. At most one instance of an environment serves, and a failed one never does.

### `KnowledgePack`

D25: the files that teach an agent to write a valid manifest.yaml and wire the blueprint, versioned with it.

- `blueprint`: string — The blueprint it belongs to, `name@major`.
- `files`: object[] — Every file in the pack; read them all before writing code.
  - `path`: string — The file’s path in the pack — `AGENTS.md` first.
  - `mediaType`: "text/markdown" \| "text/plain" — What kind of text it is.
  - `sha256`: string — Hex SHA-256 of `content` as UTF-8.
  - `content`: string — The file’s text, whole.

### `LaunchReadiness`

§13’s checklist, computed from what exists — a first launch’s, or once launched the self-serve check (D9). A production deploy is refused with this exact value until every blocking item is met.

- `projectId`: string (uuid) — The project.
- `launched`: boolean — Which of D9’s two clauses this is: false, the first launch’s checklist; true, a launched app’s, where a release goes to production self-serve unless it changes a sensitive field (§13).
- `ready`: boolean — Whether every blocking item is met — a production deploy is refused until it is.
- `candidateReleaseId`: string (uuid) \| null — The release serving staging — what production would run; null when nothing serves staging.
- `baselineReleaseId`: string (uuid) \| null — The last approved release the candidate is compared with (D9.2); null before launch, or when nothing else is approved.
- `sensitiveFields`: ("services" \| "auth.attributes" \| "egress.allow" \| "resources" \| "data.classification" \| "ai.models" \| "blueprint")[] — §7’s fields the candidate changes since that release; empty before launch.
- `reescalated`: boolean — An administrator’s approval is what this release is waiting for — a sensitive change, not rejected, and nothing else unmet (§13 D9.2).
- `items`: `LaunchReadinessItem`[] — Every item, met or not.

### `LaunchReadinessItem`

One item of the launch checklist (§13), computed from what exists.

- `id`: "domain" \| "iam-registration" \| "privacy-assessment" \| "rehearsal" \| "scans" \| "admin-approval" \| "load-rehearsal" \| "code-review" — Which item — stable, for a client to switch on.
- `title`: string — The item, for a person.
- `owner`: string — Who meets it: the project’s owner, Manifest itself, or UBC recorded by an administrator.
- `blocking`: boolean — Whether this item gates production. `ready` is every BLOCKING item being met; a non-blocking item is shown and never refuses a launch (D33: `code-review`).
- `state`: "met" \| "unmet" \| "not_built" — `met`: satisfied. `unmet`: tracked and not satisfied — `why` says what to do. `not_built`: Manifest does not track it yet, and `builtBy` says what will.
- `why`: string — Why it matters, and — when it is unmet — what meets it.
- `builtBy`: string *(optional)* — For a `not_built` item: what will build it. Absent otherwise.

### `LaunchRecords`

The two external records a first production launch waits on (§9).

- `projectId`: string (uuid) — The project.
- `iamRegistration`: `IamRegistration` \| null — What UBC IAM registered; null until an administrator records something.
- `privacyAssessment`: `PrivacyAssessment` \| null — What the Privacy Office said; null until an administrator records something.

### `LogFrame`

One line of a build’s output, as it is written. Never replayed — GET /v1/builds/{buildId}/logs has them all.

- `kind`: "log" — A line of a build’s output.
- `id`: string — `<buildId>:<seq>`.
- `projectId`: string (uuid) — The project the build belongs to.
- `buildId`: string (uuid) — The build writing it (`getBuild`).
- `seq`: integer [min 0] — Its position in the build’s log, from 0 — `getBuildLog` answers the same numbers.
- `stream`: "stdout" \| "stderr" — Which of the build’s outputs wrote it.
- `text`: string — Redacted at capture (§14).
- `createdAt`: string (date-time) — When it was written.

### `ManifestError`

One thing wrong with manifest.yaml (§7, §25), inside `details` of a `422 SPEC_INVALID` or a spec validation. Switch on `code`; show `message` and `hint` to a person.

- `code`: `ManifestErrorCode`
- `path`: string — Where in manifest.yaml, dotted: `services.0.type`.
- `message`: string — What is wrong at `path`, naming the value — for a person to read.
- `hint`: string *(optional)* — How to correct it, when there is one sentence to say: the permitted values, or the setting to ask about.

### `ManifestErrorCode`

A code inside `details` of a `422 SPEC_INVALID`: a breach of §7’s schema or policy, or of §25’s blueprint compatibility. `x-enumDescriptions` gives each code’s meaning, and the top-level `x-manifest-spec-errors` its remedy.

(enum of 25 values — see section 5)


### `ManifestYaml`

manifest.yaml, schema version 1 (§7), as a JSON Schema — DOCUMENTATION FOR THE FILE, for whoever writes it. The platform validates with its own code: `validateSpec` and a commit answer each problem as a `ManifestError` with a path, and some rules are not expressible here — the name must equal the project’s slug, a model must be in the catalogue and approved for `data.classification`, and what is asked for must fit the project’s quota.

- `manifest`: 1 — The schema version: `1`.
- `name`: string — The project’s slug, exactly (§23): 3 to 39 lower-case letters, digits and hyphens, starting with a letter.
- `blueprint`: string — The project’s blueprint and its major version, `name@major` — the project’s own pin (§25). A commit cannot change it.
- `description`: string [maxLen 500] *(optional)* — What the app is for, in a sentence or two.
- `runtime`: object — How the app runs.
  - `port`: integer [min 1, max 65535] — The port the app listens on inside its container.
  - `health`: string *(optional)* — The path the platform checks before an instance serves: it must answer 200 (§11). A path, never a URL.
  - `command`: string \| null *(optional)* — Overrides the blueprint’s entrypoint; null keeps it.
  - `build`: any *(optional)* — FORBIDDEN (D13): the Dockerfile is the blueprint’s. An app declares what it needs, never how to build it.
- `resources`: object *(optional)* — What the app may use. Unset fields take the blueprint’s defaults; the total is bounded by the project’s quota.
  - `cpu`: number *(optional)* — CPU cores: `0.5` is half of one.
  - `memory`: string *(optional)* — Memory, as `512Mi` or `1Gi`.
  - `pids`: integer *(optional)* — The most processes and threads the app may run at once — a fork-bomb ceiling.
  - `disk`: string *(optional)* — The disk the app’s volume and logs may use, as `2Gi`.
- `services`: object[] *(optional)* — The backing services the app needs; may be empty.
  - `type`: string [minLen 1] — Which service: one of the platform’s catalogue, such as `mongo` or `qdrant`.
  - `version`: string [minLen 1] — The service’s version, as a string: `"7"`.
  - `name`: string — The app’s own name for it, unique in the manifest: lower-case letters, digits and hyphens.
- `auth`: object *(optional)* — Who may use the app, and what it learns about them (§9).
  - `provider`: "cwl" \| "none" *(optional)* — `cwl` signs people in with UBC’s CWL (§9); `none` signs nobody in.
  - `attributes`: string [minLen 1][] *(optional)* — The CWL attributes the app receives about a signed-in person — `ubcEduCwlPuid`, `mail`, `givenName`, `sn`, `eduPersonAffiliation`. The identifier is `ubcEduCwlPuid`, never `uid`.
  - `callback`: string *(optional)* — The PATH the identity provider posts a sign-in to (D15) — Manifest derives the origin.
  - `logout`: string *(optional)* — The PATH single logout arrives at (D15).
- `ai`: object *(optional)* — The AI the app uses, through the platform’s gateway (§10).
  - `models`: string [minLen 1][] *(optional)* — The LOGICAL models the app may call — `default-chat`, `default-embed` — never a vendor’s model id. Each must be approved for `data.classification` (D17).
  - `budget`: object *(optional)* — What the app’s AI may cost (§10).
    - `project_monthly_usd`: number [min 0] *(optional)* — The most the app may spend on AI in a month, in US dollars. Omitted, with models declared, it is the project’s AI quota; 0 is refused.
    - `per_user_monthly_usd`: number [min 0] *(optional)* — The most one person may spend through the app in a month, in US dollars (§7) — validated, not enforced before Phase 4 (§10): never above the project’s AI quota, recorded with the release, and limiting no single person yet; a validation that finds it set carries a `SPEC_FIELD_NOT_ENFORCED` warning.
- `env`: (any \| any)[] *(optional)* — Environment variables the app is given, beside the ones the platform sets (§8).
  - `name`: string — The variable’s name: upper-case letters, digits and underscores, starting with a letter. Not one the platform sets itself (§8).
  - `value`: string *(optional)* — Its value, written here and so in git — never a credential.
  - `secret`: boolean *(optional)* — `true` for a value held by Manifest and never in git: set it per environment with `setAppSecret`, and a deploy is refused until it is set.
- `egress`: object *(optional)* — Where the app may connect to outside the platform.
  - `allow`: string [minLen 1][] *(optional)* — Hostnames the app may reach outside the platform — `api.ubc.ca`. Everything else is refused.
- `data`: object *(optional)* — What the app’s data is (§15).
  - `classification`: "public" \| "internal" \| "confidential" *(optional)* — How sensitive the app’s data is: `public`, `internal` or `confidential` — what its models must be approved for (D17).
  - `retention_days`: integer *(optional)* — How many days the app keeps its data.
- `integrations`: any[] *(optional)* — Reserved (§15): must be empty, or absent, in schema version 1.
- `jobs`: any[] *(optional)* — Reserved (§15): must be empty, or absent, in schema version 1.
- `checks`: any[] *(optional)* — Reserved (§15): must be empty, or absent, in schema version 1.
- `environments`: object *(optional)* — Per-environment overrides of `resources` and `env` only. Sandbox takes the top level as written.
  - `staging`: object *(optional)* — What changes in staging.
    - `resources`: object *(optional)* — Replaces the top-level `resources` in this environment, field by field.
      - `cpu`: number *(optional)* — CPU cores: `0.5` is half of one.
      - `memory`: string *(optional)* — Memory, as `512Mi` or `1Gi`.
      - `pids`: integer *(optional)* — The most processes and threads the app may run at once — a fork-bomb ceiling.
      - `disk`: string *(optional)* — The disk the app’s volume and logs may use, as `2Gi`.
    - `env`: (any \| any)[] *(optional)* — Adds to, or replaces by name, the top-level `env` in this environment.
      - `name`: string — The variable’s name: upper-case letters, digits and underscores, starting with a letter. Not one the platform sets itself (§8).
      - `value`: string *(optional)* — Its value, written here and so in git — never a credential.
      - `secret`: boolean *(optional)* — `true` for a value held by Manifest and never in git: set it per environment with `setAppSecret`, and a deploy is refused until it is set.
  - `production`: object *(optional)* — What changes in production.
    - `resources`: object *(optional)* — Replaces the top-level `resources` in this environment, field by field.
      - `cpu`: number *(optional)* — CPU cores: `0.5` is half of one.
      - `memory`: string *(optional)* — Memory, as `512Mi` or `1Gi`.
      - `pids`: integer *(optional)* — The most processes and threads the app may run at once — a fork-bomb ceiling.
      - `disk`: string *(optional)* — The disk the app’s volume and logs may use, as `2Gi`.
    - `env`: (any \| any)[] *(optional)* — Adds to, or replaces by name, the top-level `env` in this environment.
      - `name`: string — The variable’s name: upper-case letters, digits and underscores, starting with a letter. Not one the platform sets itself (§8).
      - `value`: string *(optional)* — Its value, written here and so in git — never a credential.
      - `secret`: boolean *(optional)* — `true` for a value held by Manifest and never in git: set it per environment with `setAppSecret`, and a deploy is refused until it is set.

### `Me`

The person the session belongs to.

- `id`: string (uuid) — The person’s user id on this platform — what `listMembers` calls `userId`.
- `puid`: string — The person's ubcEduCwlPuid (§9).
- `displayName`: string — Their name, as CWL gave it.
- `email`: string — Their address, as CWL gave it.
- `role`: "admin" \| "member" — The platform role THIS SESSION is authorized as.

### `Member`

A person who may work on the project, and their role on it.

- `userId`: string (uuid) — The person’s user id — what `removeMember` names.
- `puid`: string — Their ubcEduCwlPuid (§9) — what `addMember` names.
- `displayName`: string — Their name, as CWL gave it.
- `email`: string — Their address, as CWL gave it.
- `role`: "owner" \| "collaborator" — `owner` may do everything on the project; `collaborator` the same except managing members, deleting the project and promoting a release to production (§13).

### `MemberList`

Everyone who may work on the project; every project has an owner.

- (array of `Member`)

### `MintTokenRequest`

A delegated token to mint: a label, what it may do, and how long it lives.

- `name`: string [minLen 1, maxLen 64] — A person’s label for it, so a list of tokens is reviewable.
- `capabilities`: ("project:read" \| "project:write" \| "project:delete" \| "source:write" \| "secret:write" \| "output:read" \| "members:manage" \| "build:create" \| "release:create" \| "release:deploy" \| "release:promote" \| "release:approve" \| "launch:record" \| "quota:set" \| "secret:read")[] — The explicit set this token may use (D24). None of members:manage, release:promote, quota:set or secret:read: those are refused to a delegated token however it was minted. Nor release:approve or launch:record, which are person-only and refused outright.
- `expiresInDays`: integer [min 1, max 365] — How long the token lives, in days. D24: a token has an expiry, and at most 365 days of one.

### `MintedToken`

A newly minted delegated token, with its secret. The only time the secret exists.

- `token`: `Token`
- `secret`: string — The token, in full: `mft_<id>_<secret>` — what an agent sends as `Authorization: Bearer`. Store it now: it is in this answer and nowhere else. `listTokens` never shows it, and a retry of this mint with the same Idempotency-Key answers `409 TOKEN_ALREADY_MINTED` naming the token, never the secret again.

### `OpenApiDocument`

This API’s OpenAPI 3.1 document — the one the platform publishes, generated from its own route definitions when it starts, so what is served is what is published.

(see sections 4/5)


### `PendingAction`

D24: a delegated token asked for one of the privileged four. A person confirms or rejects it; a confirmation grants that one request a single retry.

- `id`: string (uuid) — The question — what `confirmPendingAction` and `rejectPendingAction` name.
- `projectId`: string (uuid) — The project it was asked on.
- `tokenId`: string (uuid) — The delegated token that asked (`listTokens`).
- `action`: string — The privileged capability that was refused — one of D24’s four.
- `state`: "pending" \| "confirmed" \| "rejected" \| "expired" — `pending` until a person answers; `confirmed` grants the identical request one retry; `rejected` is final; `expired` when nobody answered in time.
- `method`: string — The HTTP method the token used.
- `path`: string — The path it asked for.
- `bodySha256`: string — SHA-256 of the canonical request body, so a client can match its own.
- `summary`: string — What was asked for, for the person who answers.
- `expiresAt`: string (date-time) — When the question lapses unanswered.
- `createdAt`: string (date-time) — When the token asked.
- `resolvedAt`: string (date-time) \| null — When a person answered; null while it is pending.
- `waitingSeconds`: integer [min 0] — Seconds between the question being asked and it being answered — or, while it is still pending, now.
- `reason`: string \| null — A rejection’s reason, in the person’s words — what the agent is told; null otherwise.
- `consumedAt`: string (date-time) \| null — When the confirmed retry was made, spending the confirmation; null until then.

### `PendingActionList`

The questions agents have put to the people who own this project, newest first (§26).

- (array of `PendingAction`)

### `PrivacyAssessment`

What UBC’s Privacy Office said of the app’s privacy impact assessment (§9), as an administrator recorded it.

- `id`: string (uuid) — The record.
- `projectId`: string (uuid) — Its project.
- `state`: "draft" \| "submitted" \| "approved" — Along §9’s states: `draft`, `submitted` to the Privacy Office, `approved`. A refused assessment goes back to `draft`.
- `reviewer`: string \| null — Who at the Privacy Office reviewed it; null until recorded.
- `approvedAt`: string (date-time) \| null — When it was approved; null until it is.
- `externalTicketRef`: string \| null — The Privacy Office’s own reference; null when none was recorded.
- `updatedAt`: string (date-time) — When the record last changed.

### `Project`

A project: one app, its code, its three environments and who works on it (§6).

- `id`: string (uuid) — The project — what every project-scoped path names.
- `slug`: string — The project’s permanent identifier, and the first label of every hostname it has (§23). It never changes; `name` is what people read.
- `name`: string [minLen 1, maxLen 80] — What people call the project — any text of 1 to 80 characters, trimmed, on one line. Never part of an address: the slug is.
- `blueprint`: string — `name@major` (§25).
- `starter`: string \| null — The starter the first commit was seeded from (§25); null for the skeleton alone.
- `owner`: `UserSummary`
- `audience`: `Audience` \| null — Who it is for (§24); null for a project created before the question was asked.
- `createdAt`: string (date-time) — When it was created.
- `launchedAt`: string (date-time) \| null — When it first went to production (§13 D9) — null until then; never cleared.
- `repository`: `RepositoryLink`
- `environments`: `Environment`[] *(optional)* — Present with `?expand=environments` (D23.1).

### `ProjectList`

Every project the caller is a member of — every project, for an administrator.

- (array of `Project`)

### `RecordIamRegistrationRequest`

What UBC IAM registered for the app’s production sign-in, as an administrator records it from the ticket (§9).

- `entityId`: string [minLen 1, maxLen 512] — The entityID UBC IAM registered — fixed once registered.
- `acsUrl`: string [minLen 1, maxLen 512] — The assertion consumer URL registered.
- `sloUrl`: string [minLen 1, maxLen 512] — The single-logout URL registered.
- `registeredAttributes`: string [minLen 1][] — Exactly the attributes UBC IAM registered, as the ticket lists them. Once registered, a record that does not reach `active` must repeat them unchanged.
- `requestedAttributes`: string [minLen 1][] *(optional)* — What a change request asks for; required when a registration goes from `active` to `change_requested`.
- `state`: "draft" \| "submitted" \| "active" \| "change_requested" \| "expired" — The state this record should now be in. It is reached along §9’s arrows from wherever it is — a first write into `active` is refused exactly as a later one is.
- `externalTicketRef`: string [minLen 1, maxLen 128] *(optional)* — UBC IAM’s ticket reference, pasted in.
- `certFingerprint`: string [minLen 1, maxLen 256] *(optional)* — The fingerprint of the signing certificate registered.
- `certExpiresAt`: string (date-time) *(optional)* — When that certificate expires (D20).

### `RecordPrivacyAssessmentRequest`

What the Privacy Office said, as an administrator records it (§9).

- `state`: "draft" \| "submitted" \| "approved" — The state this record should now be in, reached along §9’s arrows.
- `reviewer`: string [minLen 1, maxLen 128] *(optional)* — Who at the Privacy Office reviewed it.
- `externalTicketRef`: string [minLen 1, maxLen 128] *(optional)* — The Privacy Office’s reference, pasted in.

### `Rehearsal`

A LOCAL, production-shaped rehearsal of the app’s CWL sign-in (D21): it proves the SHAPE of the registration, and never UBC’s acceptance of it.

- `id`: string (uuid) — The rehearsal.
- `projectId`: string (uuid) — Its project.
- `releaseId`: string (uuid) — The candidate release rehearsed — the one serving staging.
- `passed`: boolean — Whether a production-shaped CWL sign-in worked.
- `entityId`: string — The entityID the Service Provider was registered under when this ran — read off the registration, never recomputed.
- `acsUrl`: string — Where the sign-in’s assertion was sent.
- `attributes`: string[] — The attributes the registration listed when it ran, compared with what the candidate release would register now.
- `evidence`: object — What the rehearsal saw — measured, not assumed.
  - `instanceId`: string (uuid) \| null — The production instance it deployed; null if none started.
  - `hostname`: string — The hostname the sign-in went to.
  - `listener`: "internal" \| "public" — Which of the edge’s listeners the app answered on (§12).
  - `signInStatus`: integer \| null — What the app answered at its registered ACS, or null when no assertion was produced.
  - `attributesReleased`: string[] — What the assertion ACTUALLY carried, as friendly names where the platform knows one. §9’s attribute release, measured rather than assumed.
  - `reason`: string — Why it passed or did not, in the platform’s words.
- `ranAt`: string — When it ran, ISO 8601 in UTC.

### `RejectPendingActionRequest`

A person’s refusal of a pending action, in their own words.

- `reason`: string [minLen 1, maxLen 500] — Why this is refused. The agent is told, verbatim.

### `RejectReleaseRequest`

An administrator’s rejection, naming the preview they read. It is final for the release.

- `reason`: string [minLen 1, maxLen 2000] — Why, in the administrator’s words — required: a refusal with no words is one nobody can act on.
- `previewId`: string (uuid) *(optional)* — The preview the administrator read (`POST /v1/releases/{releaseId}/approval-preview`). Optional in this schema and REQUIRED by the operation: without it the answer is `400 APPROVAL_PREVIEW_REQUIRED`.

### `Release`

Immutable: a build, a spec and the configuration resolved for every environment (§13).

- `id`: string (uuid) — The release — what `deploy` names.
- `projectId`: string (uuid) — Its project.
- `buildId`: string (uuid) — The build it froze.
- `appSpecId`: string (uuid) — The validation of manifest.yaml it froze — its build’s commit’s.
- `imageDigest`: string — What an approval binds to (§13).
- `summary`: string \| null — What it changes, in its author’s words; null when none was given.
- `createdBy`: string (uuid) — Who made it.
- `createdAt`: string (date-time) — When it was made.
- `scan`: `ScanSummary` \| null — §12: its build’s scan, recorded on the Release.
- `config`: object — What it runs as in each environment, resolved when it was made.
  - `sandbox`: object — One environment’s view of the release, frozen when it was made (§13).
    - `port`: integer — The port the app listens on.
    - `health`: string — The path its health check asks.
    - `resources`: object — What it may use in this environment — the blueprint’s defaults, overridden by manifest.yaml.
      - `cpu`: number — CPU cores.
      - `memory`: string — Memory, as `512Mi`.
      - `pids`: integer — The most processes and threads at once.
      - `disk`: string — Disk, as `2Gi`.
    - `services`: object[] — The backing services bound to it.
      - `type`: string — The service type.
      - `version`: string — Its version.
      - `name`: string — The app’s name for it.
    - `egressAllow`: string[] — The hostnames it may reach outside the platform.
    - `classification`: string — Its data classification (D17).
    - `auth`: object — Its sign-in (§9).
      - `provider`: "cwl" \| "none" — Whether it signs people in with CWL.
      - `attributes`: string[] — The CWL attributes it receives.
    - `ai`: object — Its AI (§10).
      - `models`: string[] — The logical models it may call.
    - `envNames`: string[] — The names of the variables the app declares — never their values.
  - `staging`: object — same shape as `sandbox` above
  - `production`: object — same shape as `sandbox` above

### `ReleaseList`

A project’s newest releases, newest first.

- (array of `Release`)

### `RepositoryLink`

Where the project’s code lives (D5), and whether `main` is protected there.

- `provider`: "local" \| "github" — Which of D5’s drivers holds it: a repository on this machine, or GitHub.
- `fullName`: string — The slug on this machine; `<org>/<slug>` on GitHub, as GitHub names it.
- `webUrl`: string \| null — Where a person opens it; null on this machine, where a path is not an address.
- `mainProtected`: boolean — Whether a person’s force-push or deletion of `main` is refused where the code lives.
- `protectionDetail`: string \| null — The host’s own words when it would not protect `main`; null when it did.
- `visibility`: "private" \| "public" \| null — What Manifest last read of the repository’s visibility on GitHub: `private`, or `public` — and nothing is built from a repository last read public until a read says it is private again. Null on this machine, where a repository has no visibility, and before GitHub has been read.

### `ScanSummary`

§12’s scan of the image a build produced (§6 `Build.scan`).

- `scanner`: string — The scanner and its version — `fake` from the in-memory driver.
- `scannedAt`: string (date-time) — An instant, ISO 8601 in UTC.
- `databaseAgeDays`: number [min 0] \| null — How old the vulnerability database was, in days; null when the scanner could not say, and then `stale` is true.
- `stale`: boolean — A clean result from a stale database is not evidence there is nothing to find (§12).
- `baseImageKnown`: boolean — False when the base image was not identified: every finding was attributed to the build, so `baseImage` counted nothing.
- `fixable`: object — Introduced by this build, with a published fix. On a fresh database a build with any is refused (§12).
  - `critical`: integer [min 0] — Critical findings.
  - `high`: integer [min 0] — High findings.
- `unfixable`: object — Introduced by this build, with no published fix: recorded, not blocking (§12).
  - `critical`: integer [min 0] — Critical findings.
  - `high`: integer [min 0] — High findings.
- `baseImage`: object — The base image’s own — the blueprint’s to fix (§20).
  - `critical`: integer [min 0] — Critical findings.
  - `high`: integer [min 0] — High findings.
- `unfixableFindings`: object[] — The unfixable findings by id, at most 50; `unfixable` counts them all.
  - `id`: string — The vulnerability’s id — a CVE or an advisory.
  - `severity`: string — `Critical` or `High`.
  - `package`: string — The package it is in, with its version.

### `SensitiveDiff`

D9: which of §7’s sensitive fields this manifest changes against the project’s newest VALID one. Reported here, and enforced at a launched app’s production deploy, where such a change needs an administrator’s approval (§13).

- `sensitive`: boolean — Whether any of §7’s sensitive fields changed.
- `fields`: string[] — Which of them changed — `services`, `auth.attributes`, `egress.allow` and so on.

### `SetAppSecretRequest`

The value to store under the name in the path.

- `value`: string [minLen 6] — The value, as text: at least 6 characters (a shorter one could not be redacted from the app’s Incidents), at most 16384 bytes of UTF-8, well-formed, with no NUL. Takes effect at the next deploy of this environment; it is never answered back.

### `SlugCheck`

§23: exactly what project creation will answer — advisory, since creation checks again.

- `slug`: string — The name checked, as sent.
- `available`: boolean — Whether `createProject` would accept it now.
- `reasons`: object[] *(optional)* — Present when `available` is false: every reason that applies.
  - `code`: "SLUG_INVALID" \| "SLUG_RESERVED" \| "SLUG_TAKEN" — The code `createProject` would refuse it with.
  - `message`: string — What is wrong with it, for a person.
  - `hint`: string — What to do instead.

### `SourceFile`

One file at one commit, whole — as text, or as base64 bytes.

- `ref`: string — A branch name, or a full 40-character commit id. Defaults to `main`.
- `commitSha`: string — The commit the file was read at.
- `path`: string — The file’s path from the repository root.
- `content`: string — The file’s content, whole: its text exactly (`encoding: utf8`, at most 1 MiB), or its bytes as canonical base64 (`encoding: base64`, at most 2 MiB decoded).
- `encoding`: "utf8" \| "base64" — How `content` carries the file: `utf8` — text, the default read — or `base64`, when the read asked for `encoding=base64`.
- `size`: integer [min 0] — The file’s size in bytes.
- `mode`: string — `100644`, or `100755` for an executable file — kept when the file is changed.
- `blobSha`: string — git's id for this content; equal ids mean equal bytes.

### `SourceTree`

Every path in the repository at one commit — the files an API client can read and write.

- `ref`: string — A branch name, or a full 40-character commit id. Defaults to `main`.
- `commitSha`: string — The commit the ref resolved to — what this listing is OF. Send it as `baseCommit` when committing changes computed from it.
- `entries`: object[] — Every entry of the tree, sorted by path.
  - `path`: string — The path from the repository root, `/`-separated.
  - `type`: "file" \| "directory" \| "symlink" \| "submodule" — What git records at this path. The API reads and writes `file`s only.
  - `mode`: string — git's mode: `100644` a file, `100755` an executable file, `120000` a symlink, `040000` a directory, `160000` a submodule.
  - `size`: integer [min 0] \| null — Bytes, for a file or a symlink; null otherwise.
  - `binary`: boolean \| null — Whether git calls this file binary — read it with `getFile`’s `encoding=base64`. An image, PDF or font (the ten kinds `createCommit` writes as bytes) can be written back with `encoding: base64`; any other binary file only by a push. Null for anything that is not a file.
- `truncated`: boolean — True when the tree has more than 10,000 entries and only the first 10,000, by path, are listed.

### `Spec`

The project’s newest recorded validation of manifest.yaml, parsed (§7), when it is valid — an invalid one is answered `422 SPEC_INVALID` instead. Its commit is the one a build names when it names none.

- `appSpecId`: string (uuid) — The recorded validation this is.
- `commitSha`: string — The commit whose manifest.yaml it is.
- `spec`: map<string, any> — manifest.yaml v1 as parsed and validated (§7), every default filled in. `ManifestYaml` in this document describes each field.

### `SpecValidation`

One validation of manifest.yaml at one commit (§7), recorded — valid or not — and announced as `spec.validated`.

- `appSpecId`: string (uuid) — The validation, as recorded.
- `commitSha`: string — The commit whose manifest.yaml was validated.
- `valid`: boolean — Whether it is valid; a build of this commit needs it to be.
- `errors`: `ManifestError`[] — Every problem, each with its path and code; empty when `valid`.
- `warnings`: `ManifestError`[] — What the validation says WITHOUT refusing — a field validated and recorded but not enforced yet (`SPEC_FIELD_NOT_ENFORCED`). Never a reason `valid` is false; empty for a manifest that did not parse. Show them where the errors are shown.
- `sensitiveDiff`: `SensitiveDiff`

### `StartBuildRequest`

Which commit to build.

- `commitSha`: string *(optional)* — The full id of the commit to build. Without it, the commit of the project’s newest recorded validation — which need not be `main`’s head: name the commit you mean.

### `StreamFrame`

Every message on WS /v1/projects/{projectId}/events is one of these, as JSON. Switch on `kind`, then `type`.

- variant 1: `EventFrame`
- variant 2: `LogFrame`
- variant 3: `ControlFrame`

### `Token`

A delegated token (D24), scoped to one project and a capability set. Its secret is shown once, when it is minted, and is never readable again.

- `id`: string (uuid) — The token — what `revokeToken` names, and the `<id>` in its secret.
- `projectId`: string (uuid) — The one project it may act on.
- `name`: string — The label its minter gave it.
- `capabilities`: string[] — What it may do on that project (D24); nothing else.
- `rateLimit`: integer — Requests a minute this token may make, enforced in the control plane (§20). Past it, every route answers 429 RATE_LIMITED with Retry-After.
- `expiresAt`: string (date-time) — When it stops working.
- `expired`: boolean — Whether this token is past its own expiresAt. Computed by the platform; a revoked token that has not expired is not expired.
- `revokedAt`: string (date-time) \| null — When a person revoked it; null while it is not revoked. A revoked token is refused `UNAUTHENTICATED`.
- `lastUsedAt`: string (date-time) \| null — When it last authenticated a request; null if never.
- `createdAt`: string (date-time) — When it was minted.

### `TokenList`

The project’s delegated tokens — revoked and expired ones included.

- (array of `Token`)

### `UpdateProjectRequest`

What to change about a project. Only its name can change; its slug never does (§23, D26).

- `name`: string [minLen 1, maxLen 80] — What people call the project — any text of 1 to 80 characters, trimmed, on one line. Never part of an address: the slug is.


### `UserSummary`

A person, by name.

- `id`: string (uuid) — Their user id.
- `displayName`: string — Their name, as CWL gave it.

### `ValidateSpecRequest`

Which commit’s manifest.yaml to validate; `{}` validates `main`’s head.

- `commitSha`: string *(optional)* — Defaults to the repository’s HEAD.


---

## Appendix B — what changed during this research: `a2918af` → `186fa34`

Research began at `a2918af`. Part-way through, `git status` showed a parallel session's uncommitted edits to
`packages/contract/openapi.json` and `src/schema.d.ts`; they were committed as `186fa34` shortly afterwards. A diff of the
two committed documents (every schema and operation, examples ignored; `info`, `tags`, `x-manifest-errors`,
`x-manifest-spec-errors`, `x-manifest-unversioned` compared whole) found exactly:

- **New operation `updateProject`** — `PATCH /v1/projects/{projectId}` (the API's first PATCH, on an existing path, so 48
  paths still). Session or token; the route asserts `project:write`. Body `UpdateProjectRequest { name }`. Answers `200 Project`.
- **New schema `UpdateProjectRequest`.**
- **`Project` and `CreatedProject`** gain a REQUIRED `name` (1–80 chars); `slug`'s description now reads *"The project's
  permanent identifier … It never changes; `name` is what people read."*
- **`CreateProjectRequest`** gains an optional `name` ("The slug, when none is given").
- **New event `project.renamed`** (38th, appended last) — `machineDetail { from, to, via, userId, tokenId }`; `humanMessage`
  "{actor} renamed {from} to {name}."; renaming to the same name publishes nothing.
- `streamProjectEvents` and `EventFrame` change only by that event. **No error code, tag or `info` change** — `info.version`
  stayed `1.4.0`.

Counts: 56 → **57** operations, 37 → **38** event types, 113 error codes (unchanged), 81 → **82** schemas. Guides: `journey.md`
gained the row *"Give the project a name people read, and change it — either — `updateProject`"*, `events.md` and the
generated references gained the event and the operation. At the time of writing the working tree again carried a parallel
session's uncommitted test edits (`api/auth.test.ts`, `sso/platform.test.ts` — Task 7), not yet touching the contract.
