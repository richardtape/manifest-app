> *Research, 2026-10-01: a read-only pass over `manifest` at `a230c1a`, kept here because a scratchpad is not durable. It is
> evidence, not a spec. Where it and `manifest` disagree, `manifest` wins.*

# Manifest public API — contract digest, addendum: everything since `186fa34`

*Read-only research, 2026-10-01, for the faculty front-end. **An addendum to [`contract-digest.md`](contract-digest.md), not a
rewrite.** The digest describes `packages/contract/openapi.json` **as committed at manifest `186fa34`**: contract **1.4.0**, 57
operations, 38 event types, 113 error codes, 82 component schemas, 25 spec problem codes. This addendum is everything that
changed between that document and the one at manifest **HEAD `a230c1a`** (2026-10-01, the platform's launch-path sitting 9 fix
wave). Both were parsed in full with node: every path, operation, parameter, response, extension, event type, error code and
schema property compared field by field, nothing sampled.*

*The reading: contract **1.5.0**, 72 operations, 52 event types, 142 error codes, 97 component schemas, 25 spec problem codes.
**This is the final read, at `a230c1a`.** The platform's sitting 9 fix-wave contract commit has landed (it dropped `state` from
`QueueItem.project` and reworded `requestApproval`, `listQueue`, `Queue`, `ApprovalRequest.open` and `RELEASE_NOT_STAGED`), and
`git status --short packages/contract/openapi.json` is clean: the working tree's document is byte-identical to the commit's
(SHA-1 `8d8210b0…`). The working tree was first read while that commit was still uncommitted, and its bytes were already the
same. manifest's working tree still has uncommitted documents (its ORIENTATION, TRAPS, roadmap and launch-path plan); none of
them is the contract.*

*Guides read at `a230c1a`, from `git diff 186fa34 a230c1a -- docs/api/` (14 files): the new `frontend.md`; `agents.md`,
`authentication.md`, `authoring.md`, `conventions.md`, `events.md`, `getting-started.md`, `index.md`, `journey.md`,
`launching.md` and `llms.txt`; and the generated `reference/operations.md`, `reference/errors.md` and `reference/events.md`.
The OpenAPI document states only the credential class, so **who may call** a new operation was read from its route
(`packages/control-plane/src/api/routes/*.ts`) and from `projects/authz.ts`, as the digest did. Each route now states the
capability it asserts (`capability:`) and whether it takes a session alone (`credential: 'session'`). Each event's
`humanMessage` was read from its publisher. Each change is attributed to the platform commit and sitting that made it (§A2),
from `git log` and the platform's plans, cross-checked with our `docs/api-findings.md`. Where those disagree the contract wins;
at `a230c1a` they agree (§A2).*

**Sections:** A1 the counts · A2 the landings · A3 new operations · A4 changed operations · A5 events · A6 error codes ·
A7 schemas, and what a faculty UI may show · A8 what the digest now says that is no longer true · How this was made.

---
## A1. Header — the two documents side by side

| Fact | Digest: `186fa34` | Now: `a230c1a` |
|---|---|---|
| `info.version` (= `@manifest/contract` `package.json` `version`) | `1.4.0` | **`1.5.0`** — moved ONCE in the window, at `d894b8e` (§A2); 9 operations landed under 1.4.0 before it and 6 under 1.5.0 after it |
| OpenAPI | `3.1.0` | `3.1.0` |
| Paths | 48 | **61** |
| **Operations** | **57** — 36 GET, 16 POST, 1 PATCH, 1 PUT, 3 DELETE | **72** — 39 GET, 25 POST, 1 PATCH, 1 PUT, 6 DELETE (+15, none removed) |
| Mutations, every one requiring `Idempotency-Key` | 21 (21 require it) | **33** (33 require it) |
| Session-only operations (`security: [{session: []}]`) | 15 | **23** — the 15 plus `startIntakeSession`, `endIntakeSession`, `deleteProject`, `archiveProject`, `submitIamRegistration`, `submitPrivacyAssessment`, `restoreProject`, `listQueue`; none left the list |
| **Event types** (`x-manifest-event-types` = the `EventFrame` variants, same order and set: true / true) | **38** | **52** (+14, none removed; five inserted mid-list, so the digest's numbering from 24 on has moved — §A5) |
| **Error codes** (`x-manifest-errors` = `ErrorCode` enum = its `x-enumDescriptions`: true / true) | **113** — 400 ×14, 401 ×10, 403 ×8, 404 ×4, 409 ×59, 413 ×1, 415 ×1, 422 ×1, 426 ×1, 429 ×1, 500 ×1, 503 ×12 | **142** — 400 ×16, 401 ×10, 403 ×11, 404 ×4, 409 ×80, 413 ×1, 415 ×1, 422 ×1, 426 ×1, 429 ×1, 500 ×3, 503 ×13 (+29, none removed, 16 reworded) |
| Codes declared by no operation | 38 | 39 (+2 `CONFIG_*`; `AI_CATALOGUE_DISABLED` is now declared) |
| Spec problem codes (`x-manifest-spec-errors` = `ManifestErrorCode`) | 25 | 25 — unchanged, word for word |
| Component schemas | 82 | **97** (+15, none removed, 20 changed besides `ErrorCode` and `EventFrame`) |
| Tags | 12 | 13 (+`agents`) |
| Unversioned endpoints (`x-manifest-unversioned`) | 8 | 8 — unchanged |
| WebSocket close codes (`x-manifest-websocket.closeCodes`) | 6 (1001, 1006, 1011, 1013, 4403, 4404) | 7 (+`4401`) |
| Commits that moved `openapi.json` since `186fa34` | — | **36** (§A2) |

Text that changed everywhere, said once here rather than per operation: `info.description` and both security schemes' descriptions lost their spec citations (`(§22)`, `D23.8`, `(§9)`, `(§20)`, `D24`); every mutation's `Idempotency-Key` parameter description went from *"D23.6. One per user action, reused across retries of THAT action."* to *"One per user action, and the same key when retrying that action."*; every operation's `default` (error) response description went from *"An error, in the D23.7 envelope; …"* to *"An error envelope; …"* (and `streamProjectEvents`'s from *"…in the D23.7 envelope…"* to *"…as an error envelope…"*); the server's description dropped *"(§21)"*.

## A2. The landings, in order

One row per manifest commit that changed `packages/contract/openapi.json` between `186fa34` and `a230c1a` (`git log --reverse 186fa34..a230c1a -- packages/contract/openapi.json`), each diffed against its parent with the same script. "Enablement" is the platform's front-end enablement plan (`docs/superpowers/plans/2026-09-27-front-end-enablement.md`, executed 2026-09-29); "launch path" is its launch-path plan (`2026-09-29-launch-path.md`, sittings 10 and 12 still to run). The sitting is read from those plans' sittings tables and entries, cross-checked with our `docs/api-findings.md`.

| # | Commit (date) | Plan, sitting (task) | What it moved in the contract | After: version · ops · events · codes · schemas |
|---|---|---|---|---|
| 1 | `e832bd5` (2026-09-27) | Enablement sitting 5 (Task 7: people by CWL login name or email) | **+events** `member.added`, `member.removed`; **+codes** `MEMBER_USER_AMBIGUOUS`; schemas changed: `AddMemberRequest`, `Member`; codes reworded: `MEMBER_USER_NOT_FOUND`; operations touched: `streamProjectEvents`, `listMembers`, `addMember`, `removeMember`; — `AddMemberRequest` gains `cwlLogin` and `email`, and `puid` becomes optional; `Member.cwlLogin` | 1.4.0 · 57 · 40 · 114 · 82 |
| 2 | `3bc386d` (2026-09-27) | Enablement sitting 5, its review’s fixes | schemas changed: `CreateProjectRequest`, `CreatedProject`, `Project`, `UpdateProjectRequest`; codes reworded: `MEMBER_USER_AMBIGUOUS`, `MEMBER_USER_NOT_FOUND`, `PROJECT_LAST_OWNER`; operations touched: `addMember`; — the name’s rules (one visible line) in the `name` descriptions; `PROJECT_LAST_OWNER` covers a demotion; `addMember` now declares it | 1.4.0 · 57 · 40 · 114 · 82 |
| 3 | `3c38199` (2026-09-27) | Enablement sitting 6 (Task 8, the `app` origin; F14, found at its close) | **+codes** `CONFIG_FRONTEND_ORIGIN_PORT_MISMATCH`, `CONFIG_ORIGINS_SHARE_A_HOST`; — two start-up codes for the second origin; no operation changed | 1.4.0 · 57 · 40 · 116 · 82 |
| 4 | `313075d` (2026-09-27) | Enablement sitting 7 (Task 9: agent sessions; FE-23) | **+ops** `getAgentBudget`, `endAgentSession`, `listAgentSessions`, `startAgentSession`; **+events** `agent_session.started`, `agent_session.ended`; **+codes** `AGENT_BUDGET_EXHAUSTED`, `AGENT_NO_MODEL_FOR_CLASSIFICATION`, `AGENT_SESSION_ALREADY_STARTED`; **+schemas** `AgentBudget`, `AgentSession`, `AgentSessionList`, `AgentSessionStarted`, `StartAgentSessionRequest`; schemas changed: `MintTokenRequest`; tags; operations touched: `streamProjectEvents`, `revokeToken`; — the tag `agents`; capability `agent:session` in `MintTokenRequest`; `revokeToken` ends the token’s sessions | 1.4.0 · 61 · 42 · 119 · 87 |
| 5 | `3cb6c82` (2026-09-27) | Enablement sitting 7 (Task 10: the intake key, FE-1) | **+ops** `startIntakeSession`, `endIntakeSession`; **+codes** `INTAKE_BUDGET_EXHAUSTED`, `INTAKE_DAILY_LIMIT_REACHED`, `INTAKE_MODEL_UNAVAILABLE`, `INTAKE_SESSION_ALREADY_STARTED`; **+schemas** `IntakeSession`, `IntakeSessionStarted`; session-only: `startIntakeSession`, `endIntakeSession`; tags; — the intake key: no project, platform-paid | 1.4.0 · 63 · 42 · 123 · 89 |
| 6 | `ce96baa` (2026-09-27) | Enablement sitting 8 (Task 11: archive and restore) | **+ops** `archiveProject`, `restoreProject`; **+events** `sso.deregistered`, `project.archived`, `project.restored`; **+codes** `PROJECT_ARCHIVED`, `PROJECT_TEARDOWN_INCOMPLETE`; schemas changed: `CreatedProject`, `Project`; session-only: `archiveProject`, `restoreProject`; operations touched: `listProjects`, `createProject`, `getProject`, `updateProject`, `streamProjectEvents`; — `Project.state` and `archivedAt`; `PROJECT_ARCHIVED` registered but declared by no operation until `16c3357` | 1.4.0 · 65 · 45 · 125 · 89 |
| 7 | `bfae957` (2026-09-27) | Enablement sitting 9 (Task 12: delete) | **+ops** `deleteProject`; **+events** `project.deleted`; **+codes** `PROJECT_LAUNCHED_NOT_DELETABLE`; **+schemas** `DeletedProject`; codes reworded: `PROJECT_TEARDOWN_INCOMPLETE`; session-only: `deleteProject`; operations touched: `streamProjectEvents` | 1.4.0 · 66 · 46 · 126 · 90 |
| 8 | `da8cfff` (2026-09-27) | Enablement sitting 9, its fix | codes reworded: `PROJECT_LAUNCHED_NOT_DELETABLE`; operations touched: `deleteProject` | 1.4.0 · 66 · 46 · 126 · 90 |
| 9 | `bb32fa6` (2026-09-28) | Enablement sitting 10 (Task 13; FE-24’s code) | **+codes** `INSTANCE_OUTPUT_STAGING`; schemas changed: `InstanceOutput`; codes reworded: `INSTANCE_OUTPUT_PRODUCTION`; operations touched: `getInstanceOutput`; — `getInstanceOutput` refuses staging; `InstanceOutput` is sandbox-only | 1.4.0 · 66 · 46 · 127 · 90 |
| 10 | `8ef685d` (2026-09-28) | Enablement sitting 11 (Task 14: published text) | schemas changed: `Fleet`; events changed: `project.created`; codes reworded: `CSRF_ORIGIN_REFUSED`, `SOURCE_INVALID_SLUG`, `SOURCE_REPOSITORY_EXISTS`; operations touched: `checkSlug`; — slug, not name, in published text; `CSRF_ORIGIN_REFUSED` names the origin a request was sent to | 1.4.0 · 66 · 46 · 127 · 90 |
| 11 | `08df532` (2026-09-28) | Enablement sitting 11 (published text) | schemas changed: `InstanceOutput`; — one description (`InstanceOutput.environmentKind`) | 1.4.0 · 66 · 46 · 127 · 90 |
| 12 | `c90f571` (2026-09-28) | Enablement sitting 11, the whole-branch review’s fix pass | schemas changed: `SlugCheck`; codes reworded: `SLUG_INVALID`, `SLUG_RESERVED`, `SLUG_TAKEN`; operations touched: `checkSlug`; — text only: the `SLUG_*` codes say slug | 1.4.0 · 66 · 46 · 127 · 90 |
| 13 | `4f261e9` (2026-09-28) | Enablement sitting 11a (Task 14a; FE-36, Spec action 10) | schemas changed: `AgentSession`; events changed: `agent_session.ended`; — `models_withdrawn` in `AgentSession.endReason` and `agent_session.ended` | 1.4.0 · 66 · 46 · 127 · 90 |
| 14 | `38c2ade` (2026-09-28) | Enablement sitting 11a (Task 14a Step 5: the safeguard) | **+codes** `INCIDENT_LOG_CONFIDENTIAL`; operations touched: `listIncidents`; — `listIncidents` refuses a token a confidential project’s staging/production Incidents | 1.4.0 · 66 · 46 · 128 · 90 |
| 15 | `8c7eb5e` (2026-09-29) | Enablement sitting 11a, the whole-sitting review’s fix pass | schemas changed: `Incident`; codes reworded: `INCIDENT_LOG_CONFIDENTIAL`; — text only | 1.4.0 · 66 · 46 · 128 · 90 |
| 16 | `16c3357` (2026-09-29) | Enablement sitting 12 (the whole-branch review’s fix pass) | 24 existing operations touched; — error lists only: 23 existing operations declare `PROJECT_ARCHIVED`; `endAgentSession` and `endIntakeSession` declare `AI_CATALOGUE_DISABLED`, and `revokeToken`, which declared it since `313075d`, now answers it | 1.4.0 · 66 · 46 · 128 · 90 |
| 17 | `d894b8e` (2026-09-29) | Launch path sitting 3 (Task 4, FE-38) | schemas changed: `Instance`, `InstanceSummary`; codes reworded: `SOURCE_PROVIDER_MISMATCH`; operations touched: `getEnvironment`, `deploy`, `listInstances`; — `Instance.createdAt` and `InstanceSummary.createdAt`; **`info.version` 1.4.0 → 1.5.0, the window’s only bump** | 1.5.0 · 66 · 46 · 128 · 90 |
| 18 | `4bac1cf` (2026-09-29) | Launch path sitting 3 (Task 5, FE-33) | codes reworded: `SOURCE_PROVIDER_MISMATCH`; operations touched: `getOpenApiDocument`, `deleteProject`, `archiveProject`, `streamProjectEvents`, `revokeToken`; — close code **`4401`**; descriptions of `revokeToken`, `archiveProject`, `deleteProject`, `streamProjectEvents`, `getOpenApiDocument` | 1.5.0 · 66 · 46 · 128 · 90 |
| 19 | `9ac609d` (2026-09-29) | Launch path sitting 3 (FE-33’s review) | operations touched: `streamProjectEvents`; — `4401` worded for a session too | 1.5.0 · 66 · 46 · 128 · 90 |
| 20 | `84d485a` (2026-09-29) | Launch path sitting 3, its final review | schemas changed: `InstanceList`; — `InstanceList` says `createdAt` orders attempts | 1.5.0 · 66 · 46 · 128 · 90 |
| 21 | `fa02bbc` (2026-09-30) | Launch path sitting 4a (Task 6b, FE-42) | schemas changed: `MintTokenRequest`; codes reworded: `TOKEN_CAPABILITY_FORBIDDEN`, `TOKEN_PERSON_ONLY`; operations touched: `runRehearsal`, `mintToken`; — `runRehearsal`: the owner and a collaborator too (`launch:rehearse`, person-only); its `FORBIDDEN` dropped | 1.5.0 · 66 · 46 · 128 · 90 |
| 22 | `d061ad7` (2026-09-30) | Launch path sitting 5 (Task 7, Spec action 1) | **+events** `agent_session.narrowed`; schemas changed: `AgentSession`; events changed: `agent_session.ended`; operations touched: `streamProjectEvents`; — a session narrowed in place | 1.5.0 · 66 · 47 · 128 · 90 |
| 23 | `baacc1c` (2026-09-30) | Launch path sitting 5 (Task 8, FE-11, Spec action 2) | schemas changed: `AgentSession`; events changed: `member.removed`, `agent_session.ended`; operations touched: `streamProjectEvents`, `removeMember`; — removing a member revokes their tokens, ends their sessions, closes their streams; `member_removed` | 1.5.0 · 66 · 47 · 128 · 90 |
| 24 | `5246d4d` (2026-09-30) | No sitting: the planning session `manifest-00`, at Rich’s word (2026-09-30), between sittings 5 and 5b | `info.description`; 53 existing operations touched; — 53 operation descriptions in the present tense, no spec citations; `info.description` too; no shape changed | 1.5.0 · 66 · 47 · 128 · 90 |
| 25 | `3333acc` (2026-09-30) | Launch path sitting 5b (Task 6c, Spec action 8 (b)+(c)) | **+codes** `REHEARSAL_RUNNING`, `REHEARSAL_TEARDOWN_FAILED`; events changed: `member.removed`, `agent_session.narrowed`; codes reworded: `AI_CATALOGUE_DISABLED`; operations touched: `removeMember`, `runRehearsal`; — the rehearsal needs a step-up and takes itself down | 1.5.0 · 66 · 47 · 130 · 90 |
| 26 | `fff8a7f` (2026-09-30) | Launch path sitting 5b, its fix wave | codes reworded: `REHEARSAL_TEARDOWN_FAILED`; operations touched: `runRehearsal`; — text only | 1.5.0 · 66 · 47 · 130 · 90 |
| 27 | `8771272` (2026-09-30) | Launch path sitting 5a (Task 8a, FE-39, Spec action 7) | **+codes** `BUILDING_NOT_OPEN`, `MEMBER_MAY_NOT_BUILD`; schemas changed: `Me`; operations touched: `startIntakeSession`, `getMe`, `createProject`, `addMember`; — `Me.mayBuild`; who may build | 1.5.0 · 66 · 47 · 132 · 90 |
| 28 | `42cd8c5` (2026-09-30) | Launch path sitting 5a, its fix wave | codes reworded: `BUILDING_NOT_OPEN`; operations touched: `addMember`; — text only | 1.5.0 · 66 · 47 · 132 · 90 |
| 29 | `b2c75e6` (2026-09-30) | Launch path sitting 6 (Task 9, Spec actions 3 and 9) | **+ops** `submitIamRegistration`, `submitPrivacyAssessment`; **+events** `iam_registration.submitted`, `privacy_assessment.submitted`; **+codes** `LAUNCH_DRAFT_REQUIRED`, `LAUNCH_PIA_NOT_APPROVED`, `LAUNCH_SENT_AT_INVALID`, `LAUNCH_STAGING_NOT_REGISTERED`; **+schemas** `SubmitLaunchRecordRequest`; schemas changed: `IamRegistration`, `LaunchReadinessItem`, `LaunchRecords`, `MintTokenRequest`, `PrivacyAssessment`, `RecordIamRegistrationRequest`; events changed: `iam_registration.recorded`; codes reworded: `TOKEN_PERSON_ONLY`; session-only: `submitIamRegistration`, `submitPrivacyAssessment`; operations touched: `streamProjectEvents`, `getLaunchReadiness`, `getLaunchRecords`, `recordIamRegistration`, `recordPrivacyAssessment`, `mintToken`; — the staging registration (`environment`), "I’ve sent it" (`launch:submit`, person-only), “waiting since” (`LaunchReadinessItem.since`) | 1.5.0 · 68 · 49 · 136 · 91 |
| 30 | `db2ddbf` (2026-10-01) | Launch path sitting 6, Task 9’s fix wave | schemas changed: `IamRegistration`, `SubmitLaunchRecordRequest`; codes reworded: `LAUNCH_PIA_NOT_APPROVED`; operations touched: `getLaunchReadiness`, `getLaunchRecords`, `recordIamRegistration`, `submitIamRegistration`, `recordPrivacyAssessment`, `submitPrivacyAssessment`; — `sentAt` is `format: date`; text | 1.5.0 · 68 · 49 · 136 · 91 |
| 31 | `6cbb489` (2026-10-01) | Launch path sitting 7 (Task 10, Spec action 4) | **+ops** `draftIamRegistration`; **+events** `iam_registration.drafted`; **+codes** `LAUNCH_NOT_CWL`, `LAUNCH_RECORD_SUBMITTED`; **+schemas** `RegistrationPackage`; schemas changed: `IamRegistration`, `MintTokenRequest`; codes reworded: `LAUNCH_DRAFT_REQUIRED`; operations touched: `streamProjectEvents`, `getLaunchRecords`, `recordIamRegistration`, `submitIamRegistration`; — `IamRegistration.package`; capability `launch:draft` (mintable) | 1.5.0 · 69 · 50 · 138 · 92 |
| 32 | `dec71d8` (2026-10-01) | Launch path sitting 7, Task 10’s fix wave | **+codes** `LAUNCH_DRAFT_CHANGED`, `LAUNCH_DRAFT_STALE`; schemas changed: `SubmitLaunchRecordRequest`; operations touched: `getLaunchRecords`, `draftIamRegistration`, `submitIamRegistration`, `submitPrivacyAssessment`; — `SubmitLaunchRecordRequest.draftGeneratedAt` | 1.5.0 · 69 · 50 · 140 · 92 |
| 33 | `81892d4` (2026-10-01) | Launch path sitting 8 (Task 11, Spec action 4) | **+ops** `draftPrivacyAssessment`; **+events** `privacy_assessment.drafted`; **+schemas** `PrivacyAssessmentDraft`; schemas changed: `PrivacyAssessment`; codes reworded: `LAUNCH_DRAFT_REQUIRED`, `LAUNCH_RECORD_SUBMITTED`; operations touched: `streamProjectEvents`, `getLaunchRecords`, `recordPrivacyAssessment`, `submitPrivacyAssessment`; — `PrivacyAssessment.draft` | 1.5.0 · 70 · 51 · 140 · 93 |
| 34 | `4aaf0ef` (2026-10-01) | Launch path sitting 8, Task 11’s fix wave | operations touched: `recordPrivacyAssessment`, `draftPrivacyAssessment`, `submitPrivacyAssessment`; — examples and descriptions only | 1.5.0 · 70 · 51 · 140 · 93 |
| 35 | `a1d4baa` (2026-10-01) | Launch path sitting 9 (Task 12, FE-25, Spec actions 5 and 10) | **+ops** `listQueue`, `requestApproval`; **+events** `approval.requested`; **+codes** `APPROVAL_NOT_NEEDED`, `RELEASE_REJECTED`; **+schemas** `ApprovalRequest`, `Queue`, `QueueItem`, `RequestApprovalRequest`; schemas changed: `Fleet`, `IamRegistration`, `LaunchReadinessItem`, `MintTokenRequest`; codes reworded: `RELEASE_DIGEST_NOT_APPROVED`, `RELEASE_REESCALATED`; session-only: `listQueue`; operations touched: `listFleet`, `streamProjectEvents`, `getLaunchRecords`, `recordIamRegistration`, `draftIamRegistration`, `submitIamRegistration`; — capability `approval:request` (mintable); `IamRegistration.changeRequestedFrom`; the fleet’s `name`, `state`, `archivedAt` | 1.5.0 · 72 · 52 · 142 · 97 |
| 36 | `a230c1a` (2026-10-01) | Launch path sitting 9, Task 12’s fix wave | schemas changed: `ApprovalRequest`, `Queue`, `QueueItem`; codes reworded: `RELEASE_NOT_STAGED`; operations touched: `listQueue`, `requestApproval`; — **`QueueItem.project.state` removed** (no version bump); descriptions of `requestApproval`, `listQueue`, `Queue`, `ApprovalRequest.open`, `RELEASE_NOT_STAGED` | 1.5.0 · 72 · 52 · 142 · 97 |

**What the landings show:**

- **`info.version` moved once**, at `d894b8e` (launch-path sitting 3: *"the plan's one bump"*, for `Instance.createdAt`). Before
  it, 9 operations, 8 event types, 15 codes and 8 schemas landed at 1.4.0, the pattern the digest's §8.1 #4 already noted.
  After it, 6 operations, 6 event types, 14 codes and 7 schemas landed at 1.5.0. A client cannot tell the 66- and 72-operation
  documents apart by version.
- **One field was removed, at 1.5.0 with no bump.** `QueueItem.project.state` was added at `a1d4baa` and removed at `a230c1a`,
  the same day.
- **One operation stopped declaring a code.** `runRehearsal` no longer declares `FORBIDDEN` (`fa02bbc`): the owner and a
  collaborator may now run it, and a stranger is still `404`.
- Every other change was additive, or text.
- **`5246d4d` is the only landing made outside a sitting.** The platform's planning session `manifest-00`, at Rich's word
  (2026-09-30), reworded 53 operation descriptions *"in the present tense, citing no spec section"* and the info paragraph, and
  added a test that keeps them so.
- **No contract commit came from** the capable-model sittings (enablement 9a, 9b) or launch-path sittings 1, 2 and 4.
- **Against our `docs/api-findings.md`.** Its rows for each contract landing were checked against the document at that commit,
  and they agree with the contract: enablement sittings 7–12 and launch-path sittings 3, 4a, 5, 5b, 5a and 6–9, including the
  new row for `a230c1a` (`QueueItem.project` is `{ id, slug, name }`). Six landings are not named in api-findings.md:
  - `e832bd5` and `3bc386d`: enablement sitting 5, which the digest's §8.4 already expected;
  - `ce96baa` and `bfae957`: recorded in our F2 plan;
  - `da8cfff`: recorded nowhere of ours;
  - `5246d4d`: recorded in our F5 plan.

  Some shapes it records at a landing were changed by a later one. For example, `b2c75e6`'s submission body
  `{ sentAt?, reference? }` gained `draftGeneratedAt` at `dec71d8`, and its sitting 7 row says so. That is history, not
  disagreement.

## A3. Every new operation

Fifteen operations, each in the digest's §3.2 format. **Who** uses the digest's §3.1 legend:

- **S**: session only. **S/T**: session or delegated token.
- The capability named is the one the route asserts. §A8 has the updated role table.
- **↑**: stepped up within ten minutes.
- **PO**: person-only (no token can hold it). **mintable**: a token may hold it.

Every new mutation also declares the framework codes every mutation of its kind declares: `CSRF_ORIGIN_REFUSED`,
`IDEMPOTENCY_KEY_*`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `REQUEST_INVALID`, `RATE_LIMITED`, `INTERNAL`
and `UNAUTHENTICATED`. The *Error codes* line under each operation gives its full list.

| Area | operationId | Method and path | Who | Success | Landed |
|---|---|---|---|---|---|
| Agents | `getAgentBudget` | `GET /v1/agent-budget` | S/T, any credential | 200 `AgentBudget` | `313075d` |
| Agents | `startAgentSession` | `POST /v1/projects/{projectId}/agent-sessions` | S/T `agent:session` (mintable) | 201 `AgentSessionStarted` | `313075d` |
| Agents | `listAgentSessions` | `GET /v1/projects/{projectId}/agent-sessions` | S/T `project:read` | 200 `AgentSessionList` | `313075d` |
| Agents | `endAgentSession` | `DELETE /v1/agent-sessions/{sessionId}` | S/T `agent:session`; a token only its own | 200 `AgentSession` | `313075d` |
| Agents (intake) | `startIntakeSession` | `POST /v1/intake-sessions` | S, a person who may build | 201 `IntakeSessionStarted` | `3cb6c82` |
| Agents (intake) | `endIntakeSession` | `DELETE /v1/intake-sessions/{intakeSessionId}` | S, the person who started it | 200 `IntakeSession` | `3cb6c82` |
| Projects (ending an app) | `archiveProject` | `POST /v1/projects/{projectId}/archive` | S `project:delete` ↑ **PO** (owner, admin) | 200 `Project` | `ce96baa` |
| Projects (ending an app) | `restoreProject` | `POST /v1/projects/{projectId}/restore` | S `project:delete` **PO**, no step-up | 200 `Project` | `ce96baa` |
| Projects (ending an app) | `deleteProject` | `DELETE /v1/projects/{projectId}` | S `project:delete` ↑ **PO** (owner, admin) | 200 `DeletedProject` | `bfae957` |
| Launch (UBC’s records) | `draftPrivacyAssessment` | `POST /v1/projects/{projectId}/launch-records/privacy-assessment/draft` | S/T `launch:draft` (mintable) | 200 `PrivacyAssessment` | `81892d4` |
| Launch (UBC’s records) | `submitPrivacyAssessment` | `POST /v1/projects/{projectId}/launch-records/privacy-assessment/submission` | S `launch:submit` **PO** | 200 `PrivacyAssessment` | `b2c75e6` |
| Launch (UBC’s records) | `draftIamRegistration` | `POST /v1/projects/{projectId}/launch-records/iam-registration/{environment}/draft` | S/T `launch:draft` (mintable) | 200 `IamRegistration` | `6cbb489` |
| Launch (UBC’s records) | `submitIamRegistration` | `POST /v1/projects/{projectId}/launch-records/iam-registration/{environment}/submission` | S `launch:submit` **PO** | 200 `IamRegistration` | `b2c75e6` |
| Launch (sign-off) | `requestApproval` | `POST /v1/releases/{releaseId}/approval-request` | S/T `approval:request` (mintable) | 200 `ApprovalRequest` | `a1d4baa` |
| Administration | `listQueue` | `GET /v1/queue` | S, platform admin | 200 `Queue` | `a1d4baa` |

#### `getAgentBudget` — Your agent budget this month

`GET /v1/agent-budget` · tag `agents`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** any credential; the route asserts no capability. A session reads its own person’s budget, and a delegated token reads its minter’s, across every project.  
**Idempotency:** — (a read).  
**Landed:** `313075d` (Enablement sitting 7 (Task 9: agent sessions; FE-23)).

> The monthly agent budget of the person the credential acts for — yours, or a delegated token’s minter’s — what their agents have spent across every project, and what remains. `spentUsd` is null with a reason when the model gateway does not answer: never 0 for unknown. Spend lands a few seconds after a call.

Response `200` — `AgentBudget` — The budget.
- `monthlyUsd`: number — Your monthly budget for agent sessions, in US dollars, across every project.
- `spentUsd`: number \| null — This month’s spend across every session of yours, or null when the model gateway did not answer — never 0 for "unknown".
- `remainingUsd`: number \| null — What is left this month; null when `spentUsd` is.
- `resetsAt`: string (date-time) \| null — When the month resets — the first of the next month, 00:00 UTC — or null before your first session.
- `unavailable`: string \| null — Why `spentUsd` is null, when it is.

Error codes: `INTERNAL`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

**What it is for:** to show a person what their agents have spent this month and what is left. `frontend.md`: *“$0.40 so far · $9.60 left this month”*. `spentUsd` is `null` with a reason when the gateway cannot say, never 0.  
**Guides:** `frontend.md` *Your agent’s model*; `agents.md` *Your model key, and the models you may call*; `journey.md` (*Give an agent model access…*).

#### `startAgentSession` — Give an agent a model key, charged to you

`POST /v1/projects/{projectId}/agent-sessions` · tag `agents`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `agent:session` on the project: owner, collaborator, platform administrator. It is mintable (neither privileged nor person-only), and a token must hold it (`403 FORBIDDEN` otherwise). A stranger gets `404`; an archived project gets `409 PROJECT_ARCHIVED`.  
**Idempotency:** `Idempotency-Key` required (the digest’s §2.5). Not the usual replay: a same-key retry is `409 AGENT_SESSION_ALREADY_STARTED`, naming the session. The key is answered once and never again, as with `mintToken`; if the answer was lost, end that session and start another with a new key.  
**Landed:** `313075d` (Enablement sitting 7 (Task 9: agent sessions; FE-23)).

> A model key for one agent working on this project, on the models its data classification allows, capped (`capUsd`) and short-lived (`durationMinutes`). The key is in this answer only: a retry with the same Idempotency-Key answers `409 AGENT_SESSION_ALREADY_STARTED` naming the session, so if the answer is lost, end it and start another. Spend is charged to you — a delegated token’s minter — against your monthly agent budget (`getAgentBudget`). The key calls models only; it is not a Manifest credential.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — One per user action, and the same key when retrying that action.

Request body (required, JSON): `StartAgentSessionRequest`
- `name`: string [minLen 1, maxLen 64] — A label a person reads in the list of sessions — the task the agent is on.
- `capUsd`: number [min 0.000001, max 1000] *(optional)* — The most this session may spend, in US dollars: the platform’s session cap when absent — and never more than it, nor than what remains of your month.
- `durationMinutes`: integer [min 1, max 480] *(optional)* — How long the key lives: 60 minutes by default, at most 480 — and never past the expiry of the credential that asks (a delegated token, or your signed-in session).

Response `201` — `AgentSessionStarted` — The session, and its key — the only time the key exists outside the gateway.
- `session`: `AgentSession`
- `key`: string — THE MODEL KEY. Shown in this answer and never again — Manifest keeps no copy. Send it as `Authorization: Bearer <key>` to `baseUrl`. It calls models, and nothing else: it is not a Manifest credential.
- `baseUrl`: string (uri) — Where the key is used: an OpenAI-compatible API (`/chat/completions`, `/embeddings`, `/models`).

Error codes: `AGENT_BUDGET_EXHAUSTED`, `AGENT_NO_MODEL_FOR_CLASSIFICATION`, `AGENT_SESSION_ALREADY_STARTED`, `AI_BACKEND_UNAVAILABLE`, `AI_CATALOGUE_DISABLED`, `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `PROJECT_ARCHIVED`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `UNAUTHENTICATED`

**What it is for:** to give the agent our server runs a model key for one project. It is charged to the person the token acts for, capped (`capUsd`), short-lived (`durationMinutes`), and limited to the models the project’s classification allows.  
**Guides:** `frontend.md` *Your agent’s model* (refusals included); `agents.md` *Your model key, and the models you may call*; `journey.md`.

#### `listAgentSessions` — A project’s agent sessions

`GET /v1/projects/{projectId}/agent-sessions` · tag `agents`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `project:read` (owner, collaborator, platform administrator; mintable). A token sees every session on its project, not only its own: the handler does not filter.  
**Idempotency:** — (a read).  
**Landed:** `313075d` (Enablement sitting 7 (Task 9: agent sessions; FE-23)).

> Every agent session on this project, newest first, at most 50 — ended and expired ones included — each with what its key has spent (`spentUsd`, null with a reason when the gateway cannot say, never 0 for unknown). No key is in it.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.

Response `200` — `AgentSessionList` — The sessions, newest first.
- `sessions`: `AgentSession`[] — The project’s agent sessions, newest first — ended and expired ones included; at most 50.
- `truncated`: boolean — Whether there were more than the 50 answered.

Error codes: `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_INVALID`, `UNAUTHENTICATED`

**What it is for:** to show each session’s spend and state (ended and expired ones included), and to read the models a session holds now after `agent_session.narrowed`.  
**Guides:** `frontend.md` *Your agent’s model*; `agents.md` *When something goes wrong*; `conventions.md` *Paging* (at most 50, `truncated`).

#### `endAgentSession` — End an agent session

`DELETE /v1/agent-sessions/{sessionId}` · tag `agents`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `agent:session`, checked against the session’s own project (the path names only the session). A person may end any session on the project; a token only one it started (`403 FORBIDDEN` otherwise). A stranger, or an unknown id, gets `404`.  
**Idempotency:** `Idempotency-Key` required (the digest’s §2.5). Ending twice answers the session as it is.  
**Landed:** `313075d` (Enablement sitting 7 (Task 9: agent sessions; FE-23)).

> Revokes the session’s key at the gateway, from the next call onwards, and records what it spent. A person may end any session on their project; a delegated token only the ones it started. Ending twice answers the session as it is.

Parameters:
- `sessionId` (path, required): string (uuid) — The agent session’s id, from `startAgentSession` or `listAgentSessions`.
- `Idempotency-Key` (header, required): string [minLen 8] — One per user action, and the same key when retrying that action.

Request body: none — send no body and no `Content-Type`.

Response `200` — `AgentSession` — The session, ended.
- `id`: string (uuid) — The session — what `endAgentSession` names.
- `projectId`: string (uuid) — The one project its agent works on.
- `name`: string — The label it was started with.
- `person`: object — Who the session works for, and is charged to.
  - `id`: string (uuid) — Their user id.
  - `name`: string — Their display name.
- `via`: object \| null — The delegated token that started it; null when a person started it in their session.
  - `tokenId`: string (uuid) — The token — `listTokens` names it.
  - `tokenName`: string — The label its minter gave it.
- `models`: string[] — The logical models the key may call — the ones the project’s data classification allows (D17), and never fewer restrictions than production’s release has. When the project stops allowing some of them, the key loses those at once and keeps the rest (`agent_session.narrowed`), and this list is what it holds now.
- `capUsd`: number — The most the key may spend, in US dollars. The gateway refuses it past this.
- `expiresAt`: string (date-time) — When the key stops working, whatever anybody does — the gateway enforces it.
- `state`: "active" \| "ended" \| "expired" — `expired` is read from `expiresAt`: the key stopped working then, whether or not anybody ended it.
- `endedAt`: string (date-time) \| null — When it was ended; null while it has not been.
- `endReason`: "ended" \| "token_revoked" \| "project_archived" \| "project_deleted" \| "models_withdrawn" \| "member_removed" \| null — Why it ended: `endAgentSession`, the token that started it revoked, its project switched off or deleted, `models_withdrawn` — its project no longer allows any of the models it held (its data classification was raised, or the platform now keeps a confidential project’s building agent on-premise); a session that keeps any model it may still use is narrowed instead, and goes on — or `member_removed`: the person it works for was taken off the project. Null while it has not been ended; a session that ran out of time or money is never ended by that.
- `spentUsd`: number \| null — What this session’s key has spent, in US dollars — for an ended session, what the gateway had recorded when it ended (a call in its last seconds may not be counted). Null, never 0, when it is not known: `spentUnavailable` says why.
- `spentUnavailable`: string \| null — Why `spentUsd` is null, when it is.
- `createdAt`: string (date-time) — When it was started.

Error codes: `AI_BACKEND_UNAVAILABLE`, `AI_CATALOGUE_DISABLED`, `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `PROJECT_ARCHIVED`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `UNAUTHENTICATED`

**What it is for:** to end an agent’s model key when the work ends. Revoked at the gateway from the next call; what it spent is recorded.  
**Guides:** `frontend.md` *Your agent’s model*; `conventions.md` *Limits* (a bodiless `DELETE`); `journey.md`.

#### `startIntakeSession` — A model for describing an app, before it exists

`POST /v1/intake-sessions` · tag `agents`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; any signed-in person **who may build** (`Me.mayBuild`: faculty, or a platform administrator). Anyone else gets `403 BUILDING_NOT_OPEN` before anything is counted or minted. There is no project, so no capability.  
**Idempotency:** `Idempotency-Key` required (the digest’s §2.5). Not the usual replay: a same-key retry is `409 INTAKE_SESSION_ALREADY_STARTED`, naming the session; the key is answered once.  
**Landed:** `3cb6c82` (Enablement sitting 7 (Task 10: the intake key, FE-1)).

> A model key for a person describing an app before creating it — to understand what they want, propose names (`checkSlug`), and choose the blueprint and starter. The platform pays; your agent budget is untouched. One model (`session.model`), approved for internal data; a key of cents and minutes, never outliving your session; a few per person per day (`INTAKE_DAILY_LIMIT_REACHED`, until midnight in Vancouver) within the platform’s monthly intake budget (`INTAKE_BUDGET_EXHAUSTED`). The key is in this answer only; a retry with the same Idempotency-Key answers `409 INTAKE_SESSION_ALREADY_STARTED`. Signed-in people only: a delegated token is refused. Only a person who may build — a faculty member or a platform administrator (`mayBuild` on `getMe`) — starts one; anyone else is refused `BUILDING_NOT_OPEN`, and nothing is minted or counted.

Parameters:
- `Idempotency-Key` (header, required): string [minLen 8] — One per user action, and the same key when retrying that action.

Request body: none — send no body and no `Content-Type`.

Response `201` — `IntakeSessionStarted` — The session, and its key — the only time the key exists outside the gateway.
- `session`: `IntakeSession`
- `key`: string — THE MODEL KEY. Shown in this answer and never again — Manifest keeps no copy. Send it as `Authorization: Bearer <key>` to `baseUrl`, naming `session.model`. It calls that model and nothing else, and it is not a Manifest credential.
- `baseUrl`: string (uri) — Where the key is used: an OpenAI-compatible API (`/chat/completions`, `/embeddings`, `/models`).

Error codes: `AI_BACKEND_UNAVAILABLE`, `AI_CATALOGUE_DISABLED`, `BUILDING_NOT_OPEN`, `CSRF_ORIGIN_REFUSED`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTAKE_BUDGET_EXHAUSTED`, `INTAKE_DAILY_LIMIT_REACHED`, `INTAKE_MODEL_UNAVAILABLE`, `INTAKE_SESSION_ALREADY_STARTED`, `INTERNAL`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

**What it is for:** to give a person a platform-paid model while they describe an app that does not exist yet: understanding what they want, proposing slugs (`checkSlug`), choosing the blueprint and starter. Their agent budget is untouched. A few per person per Vancouver day, inside the platform’s monthly intake budget.  
**Guides:** `frontend.md` *Describing an app before it exists*; `authentication.md` (session-only list); `journey.md` (*Describe an app before it exists…*); `conventions.md` *Limits* (a bodiless `POST`).

#### `endIntakeSession` — End an intake session

`DELETE /v1/intake-sessions/{intakeSessionId}` · tag `agents`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; **only the person who started it**. Anyone else, an administrator included, gets `404 NOT_FOUND`, the same answer an unknown id gets.  
**Idempotency:** `Idempotency-Key` required (the digest’s §2.5). Ending twice answers the session as it is.  
**Landed:** `3cb6c82` (Enablement sitting 7 (Task 10: the intake key, FE-1)).

> Revokes the intake session’s key at the gateway, from the next call onwards. Only the person who started it may end it; anyone else is answered 404 — the answer an id that does not exist gets. Ending twice answers the session as it is.

Parameters:
- `intakeSessionId` (path, required): string (uuid) — The intake session’s id, from `startIntakeSession`.
- `Idempotency-Key` (header, required): string [minLen 8] — One per user action, and the same key when retrying that action.

Request body: none — send no body and no `Content-Type`.

Response `200` — `IntakeSession` — The session, ended.
- `id`: string (uuid) — The intake session — what `endIntakeSession` names.
- `model`: string — The ONE logical model its key may call — the platform’s intake model, the same for everyone.
- `capUsd`: number — The most the key may spend, in US dollars — the platform’s money, not yours.
- `expiresAt`: string (date-time) — When the key stops working, whatever anybody does: 30 minutes by default, and never past your signed-in session.
- `state`: "active" \| "ended" \| "expired" — `expired` is read from `expiresAt`: the key stopped working then.
- `endedAt`: string (date-time) \| null — When it was ended; null while it has not been.
- `createdAt`: string (date-time) — When it was started.

Error codes: `AI_BACKEND_UNAVAILABLE`, `AI_CATALOGUE_DISABLED`, `CSRF_ORIGIN_REFUSED`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

**What it is for:** to revoke an intake key when the description is done.  
**Guides:** `frontend.md` *Describing an app before it exists*; `conventions.md` *Limits*; `journey.md`.

#### `archiveProject` — Switch a project off (archive it)

`POST /v1/projects/{projectId}/archive` · tag `projects`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `project:delete`, held by the owner and a platform administrator (a collaborator gets `403 FORBIDDEN`). It is **person-only** and **step-up-guarded** (`403 STEP_UP_REQUIRED`).  
**Idempotency:** `Idempotency-Key` required (the digest’s §2.5). Archiving an archived project answers it as it is. After `500 PROJECT_TEARDOWN_INCOMPLETE`, repeat the request to continue (the control plane’s next boot also finishes an archive).  
**Landed:** `ce96baa` (Enablement sitting 8 (Task 11: archive and restore)).

> Switches the app off for everyone and keeps its code, data, secrets and records. Nothing new starts; its agent sessions end; its delegated tokens are revoked, closing their event streams `4401` (a person’s stays open); its pending actions expire; its hostnames answer a `410` switched-off page; its instances drain and retire; its backing services stop, keeping their data; and its sandbox and staging sign-on registrations are removed. Answers once done — seconds, bounded by the drain. A failed step answers `500 PROJECT_TEARDOWN_INCOMPLETE` with the project archived: repeat the request to continue. Archiving an archived project answers it as it is. Owner or platform administrator, in their own session with a recent step-up; never a delegated token. Publishes `project.archived`.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — One per user action, and the same key when retrying that action.

Request body (required, JSON): `EmptyRequest` — the literal `{}`

Response `200` — `Project` — The project, archived — `state` and `archivedAt`.
- `id`: string (uuid) — The project — what every project-scoped path names.
- `slug`: string — The project’s permanent identifier, and the first label of every hostname it has (§23). It never changes; `name` is what people read.
- `name`: string [minLen 1, maxLen 80] — What people call the project — text of 1 to 80 characters, trimmed, on one line, with something visible in it; no control character, line separator or bidirectional mark. Never part of an address: the slug is.
- `blueprint`: string — `name@major` (§25).
- `starter`: string \| null — The starter the first commit was seeded from (§25); null for the skeleton alone.
- `owner`: `UserSummary`
- `audience`: `Audience` \| null — Who it is for (§24); null for a project created before the question was asked.
- `createdAt`: string (date-time) — When it was created.
- `launchedAt`: string (date-time) \| null — When it first went to production (§13 D9) — null until then; never cleared.
- `state`: "active" \| "archived" — §11: `active`, or `archived` — switched off by its owner (`archiveProject`): each of its names answers a page saying so, nothing runs, and its code, data, secrets and records are kept. An archived project can be read and restored (`restoreProject`), and nothing else: every change is refused `409 PROJECT_ARCHIVED`.
- `archivedAt`: string (date-time) \| null — When it was last switched off; null if it never was. Kept through a restore.
- `repository`: `RepositoryLink`
- `environments`: `Environment`[] *(optional)* — Present with `?expand=environments` (D23.1).

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `PROJECT_TEARDOWN_INCOMPLETE`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `STEP_UP_REQUIRED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

**What it is for:** to switch an app off for everyone, at the end of a course, keeping its code, data, secrets and records. Its addresses answer a `410` switched-off page, its tokens are revoked and its agent sessions end.  
**Guides:** `frontend.md` *Ending an app* (with a browser-code example); `journey.md` (*Switch the app off…*); `authentication.md` (step-up list).

#### `restoreProject` — Restore a switched-off project

`POST /v1/projects/{projectId}/restore` · tag `projects`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `project:delete` (owner, platform administrator). **No step-up**: bringing an app back takes nothing from anyone.  
**Idempotency:** `Idempotency-Key` required (the digest’s §2.5). Restoring an active project answers it as it is.  
**Landed:** `ce96baa` (Enablement sitting 8 (Task 11: archive and restore)).

> Makes an archived project active again, and starts nothing: its hostnames answer the switched-off page until its next deploy, which brings the app back on its kept data. Its delegated tokens stay revoked: mint new ones. Restoring an active project answers it as it is. Owner or platform administrator, in their own session; no step-up. Publishes `project.restored`.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — One per user action, and the same key when retrying that action.

Request body (required, JSON): `EmptyRequest` — the literal `{}`

Response `200` — `Project` — The project, active again.
- `id`: string (uuid) — The project — what every project-scoped path names.
- `slug`: string — The project’s permanent identifier, and the first label of every hostname it has (§23). It never changes; `name` is what people read.
- `name`: string [minLen 1, maxLen 80] — What people call the project — text of 1 to 80 characters, trimmed, on one line, with something visible in it; no control character, line separator or bidirectional mark. Never part of an address: the slug is.
- `blueprint`: string — `name@major` (§25).
- `starter`: string \| null — The starter the first commit was seeded from (§25); null for the skeleton alone.
- `owner`: `UserSummary`
- `audience`: `Audience` \| null — Who it is for (§24); null for a project created before the question was asked.
- `createdAt`: string (date-time) — When it was created.
- `launchedAt`: string (date-time) \| null — When it first went to production (§13 D9) — null until then; never cleared.
- `state`: "active" \| "archived" — §11: `active`, or `archived` — switched off by its owner (`archiveProject`): each of its names answers a page saying so, nothing runs, and its code, data, secrets and records are kept. An archived project can be read and restored (`restoreProject`), and nothing else: every change is refused `409 PROJECT_ARCHIVED`.
- `archivedAt`: string (date-time) \| null — When it was last switched off; null if it never was. Kept through a restore.
- `repository`: `RepositoryLink`
- `environments`: `Environment`[] *(optional)* — Present with `?expand=environments` (D23.1).

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

**What it is for:** to make an archived project active again. Nothing starts until its next deploy, which brings the app back on its kept data. Its tokens stay revoked.  
**Guides:** `frontend.md` *Ending an app*; `journey.md`.

#### `deleteProject` — Delete a project that never launched

`DELETE /v1/projects/{projectId}` · tag `projects`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `project:delete` (owner, platform administrator; a collaborator gets `403 FORBIDDEN`); person-only; step-up-guarded.  
**Idempotency:** `Idempotency-Key` required (the digest’s §2.5). After `500 PROJECT_TEARDOWN_INCOMPLETE`, repeat the same request to finish; `frontend.md` says with the same `Idempotency-Key`. Do not restore. Only the same request finishes a delete; a boot does not.  
**Landed:** `bfae957` (Enablement sitting 9 (Task 12: delete)).

> Deletes, for good, a project that has never been to production: switches it off as `archiveProject` does, then destroys its repository, data volumes, secrets and model budgets and releases its hostnames. Its record and audit trail remain, and its slug becomes free. Afterwards every route answers it `404`, and open event streams on it close `4404`. A launched project is refused `409 PROJECT_LAUNCHED_NOT_DELETABLE` — archive it instead — and so is one whose launch completes as the delete starts, which is left archived with everything kept. A project whose repository another source driver made is refused `409 SOURCE_PROVIDER_MISMATCH` before anything is touched. A failed step answers `500 PROJECT_TEARDOWN_INCOMPLETE` with the project archived: repeat the request to finish — restoring it instead may give back a project missing code or data. Answers once done — seconds, bounded by the drain. Owner or platform administrator, in their own session with a recent step-up; never a delegated token. Publishes `project.archived` (if it was active), then `project.deleted`.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — One per user action, and the same key when retrying that action.

Request body: none — send no body and no `Content-Type`.

Response `200` — `DeletedProject` — What remains of the project: its id, its now-free slug, and when it was deleted.
- `id`: string (uuid) — The project that was deleted. Every route answers it `404` from now on.
- `slug`: string — Its permanent identifier — now FREE: another project may be created with it (§11).
- `state`: "deleted" (const) — §11: `deleted` — its repository, every data volume, every secret and its model budgets destroyed. Its record and its audit trail remain.
- `deletedAt`: string (date-time) — When it was deleted.

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `PROJECT_LAUNCHED_NOT_DELETABLE`, `PROJECT_TEARDOWN_INCOMPLETE`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `SOURCE_PROVIDER_MISMATCH`, `STEP_UP_REQUIRED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

**What it is for:** to delete for good a project that **never launched** (a trial, or a mistake). Its repository, data, secrets and model budgets are destroyed and its slug becomes free. A launched project gets `409 PROJECT_LAUNCHED_NOT_DELETABLE`: archive it instead.  
**Guides:** `frontend.md` *Ending an app*; `journey.md` (*Delete an app that never launched…*); `conventions.md` *Limits*.

#### `draftPrivacyAssessment` — Draft the privacy impact assessment for the Privacy Office

`POST /v1/projects/{projectId}/launch-records/privacy-assessment/draft` · tag `launch`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `launch:draft`: owner, collaborator, platform administrator; **mintable**, so an agent’s token may draft (`403 FORBIDDEN` without it). A stranger gets `404`.  
**Idempotency:** `Idempotency-Key` required (the digest’s §2.5). Drafting again replaces the draft until it is sent. Once `submitted` or `approved` it is `409 LAUNCH_RECORD_SUBMITTED`, until the Privacy Office sends it back.  
**Landed:** `81892d4` (Launch path sitting 8 (Task 11, Spec action 4)).

> Manifest generates the privacy impact assessment the project’s owner completes and sends UBC’s Privacy Office, and keeps it on the record as `draft`: six questions — what personal information the app collects, where it is stored, where it flows, how long it is kept, who is accountable, and where it is hosted — each answered with facts and where Manifest read them (`manifest.yaml`, the model catalogue, the project’s members), and the gaps only the owner can fill, such as what the app keeps in its own database; and the whole as plain text to paste. It is drawn from the release serving staging — or, while nothing serves staging, from the newest valid manifest, and the draft says so. Drafting again replaces the draft until it is sent: once the assessment is `submitted` or `approved`, what was sent is kept and drafting is `409 LAUNCH_RECORD_SUBMITTED`, until the Privacy Office sends it back. The project’s owner, a collaborator, a platform administrator, or an agent on a token holding `launch:draft`, may draft — a draft sends nothing and decides nothing. Saying it was sent is `submitPrivacyAssessment`.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — One per user action, and the same key when retrying that action.

Request body: none — send no body and no `Content-Type`.

Response `200` — `PrivacyAssessment` — The assessment, with its new draft in `draft`.
- `id`: string (uuid) — The record.
- `projectId`: string (uuid) — Its project.
- `state`: "draft" \| "submitted" \| "approved" — Along §9’s states: `draft`, `submitted` to the Privacy Office, `approved`. A refused assessment goes back to `draft`.
- `reviewer`: string \| null — Who at the Privacy Office reviewed it; null until recorded.
- `approvedAt`: string (date-time) \| null — When it was approved; null until it is.
- `externalTicketRef`: string \| null — The Privacy Office’s own reference — the PIA number, which the staging registration needs before it is sent; null when none was recorded.
- `submittedAt`: string (date-time) \| null — When the assessment was sent to the Privacy Office — the day a person said it went, at noon in Vancouver, or when an administrator recorded it sent. Null until it is sent.
- `submittedBy`: object \| null — Who said it was sent; null until it is.
  - `id`: string (uuid) — Their user id.
  - `displayName`: string — Their name, as CWL gave it.
- `draft`: `PrivacyAssessmentDraft` \| null — What Manifest drafted for the person to complete and send (`draftPrivacyAssessment`), kept as it was sent once it is; null until drafted.
- `createdAt`: string (date-time) — When the record was first written.
- `updatedAt`: string (date-time) — When the record last changed.

Error codes: `AI_BACKEND_UNAVAILABLE`, `AI_CATALOGUE_EMPTY`, `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `LAUNCH_RECORD_SUBMITTED`, `NOT_FOUND`, `PROJECT_ARCHIVED`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `SOURCE_COMMIT_NOT_FOUND`, `SOURCE_GIT_FAILED`, `SOURCE_PROVIDER_MISMATCH`, `SOURCE_UNREACHABLE`, `UNAUTHENTICATED`

**What it is for:** to have Manifest draft the privacy impact assessment the owner completes and sends to UBC’s Privacy Office: six questions answered with facts and their sources, the gaps only the owner can fill, and the whole as text to paste. **First in UBC’s order.**  
**Guides:** none. Named only in the generated `reference/operations.md`. `launching.md` predates it, and `journey.md` omits it (§A8, guides).

#### `submitPrivacyAssessment` — Say the privacy assessment was sent to the Privacy Office

`POST /v1/projects/{projectId}/launch-records/privacy-assessment/submission` · tag `launch`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `launch:submit` (owner, collaborator, platform administrator); **person-only**; no step-up. It declares no `FORBIDDEN`: every role that can see the project holds it, and a stranger gets `404`.  
**Idempotency:** `Idempotency-Key` required (the digest’s §2.5). A second submission is `409 LAUNCH_TRANSITION_INVALID`.  
**Landed:** `b2c75e6` (Launch path sitting 6 (Task 9, Spec actions 3 and 9)).

> The project’s owner, a collaborator or a platform administrator, in their own session, says the privacy impact assessment was sent to UBC’s Privacy Office — on `sentAt` (today in Vancouver when absent), with the Office’s `reference` when they have one. It comes first in UBC’s order, so nothing else gates it. The record moves to `submitted`, and the launch checklist says how long it has waited from that day. What is sent is Manifest’s draft, so a record with none is `409 LAUNCH_DRAFT_REQUIRED`, one drafted again after the draft `draftGeneratedAt` names is `409 LAUNCH_DRAFT_CHANGED`, and a second submission is `409 LAUNCH_TRANSITION_INVALID`. The Office’s answer is recorded by an administrator (`recordPrivacyAssessment`). A delegated token is refused `403 TOKEN_CREDENTIAL_REFUSED`; anyone else is answered `404 NOT_FOUND`.

Parameters:
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — One per user action, and the same key when retrying that action.

Request body (required, JSON): `SubmitLaunchRecordRequest`
- `sentAt`: string (date) *(optional)* — The day it was sent, `YYYY-MM-DD` — today or earlier, and not before the draft was made. Today in Vancouver when absent.
- `reference`: string [minLen 1, maxLen 128] *(optional)* — UBC’s reference for the request, when you have one yet.
- `draftGeneratedAt`: string (date-time) *(optional)* — The `generatedAt` of the draft you sent, as you read it. If it has been drafted again since, the request is refused `409 LAUNCH_DRAFT_CHANGED` rather than recording a draft you never saw. Send it whenever you show a person the draft they send.

Response `200` — `PrivacyAssessment` — The assessment, now submitted.
- `id`: string (uuid) — The record.
- `projectId`: string (uuid) — Its project.
- `state`: "draft" \| "submitted" \| "approved" — Along §9’s states: `draft`, `submitted` to the Privacy Office, `approved`. A refused assessment goes back to `draft`.
- `reviewer`: string \| null — Who at the Privacy Office reviewed it; null until recorded.
- `approvedAt`: string (date-time) \| null — When it was approved; null until it is.
- `externalTicketRef`: string \| null — The Privacy Office’s own reference — the PIA number, which the staging registration needs before it is sent; null when none was recorded.
- `submittedAt`: string (date-time) \| null — When the assessment was sent to the Privacy Office — the day a person said it went, at noon in Vancouver, or when an administrator recorded it sent. Null until it is sent.
- `submittedBy`: object \| null — Who said it was sent; null until it is.
  - `id`: string (uuid) — Their user id.
  - `displayName`: string — Their name, as CWL gave it.
- `draft`: `PrivacyAssessmentDraft` \| null — What Manifest drafted for the person to complete and send (`draftPrivacyAssessment`), kept as it was sent once it is; null until drafted.
- `createdAt`: string (date-time) — When the record was first written.
- `updatedAt`: string (date-time) — When the record last changed.

Error codes: `CSRF_ORIGIN_REFUSED`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `LAUNCH_DRAFT_CHANGED`, `LAUNCH_DRAFT_REQUIRED`, `LAUNCH_SENT_AT_INVALID`, `LAUNCH_TRANSITION_INVALID`, `NOT_FOUND`, `PROJECT_ARCHIVED`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

**What it is for:** to record that a person sent the assessment, on the day they say (`sentAt`), with the draft they read (`draftGeneratedAt`). The record moves to `submitted`, and its *waiting since* clock starts. The Office’s answer is an administrator’s to record (`recordPrivacyAssessment`).  
**Guides:** none. Named only in the generated `reference/operations.md`. `launching.md` predates it, and `journey.md` omits it (§A8, guides).

#### `draftIamRegistration` — Draft a registration request for UBC IAM

`POST /v1/projects/{projectId}/launch-records/iam-registration/{environment}/draft` · tag `launch`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `launch:draft` (owner, collaborator, platform administrator; mintable).  
**Idempotency:** `Idempotency-Key` required (the digest’s §2.5). Drafting again replaces the draft until it is sent. Once `submitted` or `active` it is `409 LAUNCH_RECORD_SUBMITTED`, until UBC asks for changes or the registration lapses.  
**Landed:** `6cbb489` (Launch path sitting 7 (Task 10, Spec action 4)).

> Manifest generates what the project’s owner sends UBC IAM to register the staging or production environment of an app that signs people in with CWL, and keeps it on the record as `package`: the entity ID and the sign-in and sign-out addresses for that environment; the certificate the app signs with there (never its private key, which stays with Manifest); every attribute the app asks for, with its purpose and the lines of the app’s code that read it; the contacts; the privacy assessment’s PIA number once it is approved; and the SAML metadata, built from the same values. An attribute nothing reads is flagged, so it can be removed before it is asked for. Production’s is drawn from the release serving staging — or, while nothing serves staging, from the newest valid manifest, and the package says so — and staging’s from the newest valid manifest. Drafting again replaces the draft until it is sent: once the registration is `submitted` or `active`, what was sent is kept and drafting is `409 LAUNCH_RECORD_SUBMITTED`, until UBC asks for changes or the registration lapses. An app that signs nobody in with CWL, or asks for no attribute, is `409 LAUNCH_NOT_CWL`. The project’s owner, a collaborator, a platform administrator, or an agent on a token holding `launch:draft`, may draft — a draft sends nothing and decides nothing. Saying it was sent is `submitIamRegistration`.

Parameters:
- `environment` (path, required): "staging" \| "production" — Which registration to draft: `staging` or `production`.
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — One per user action, and the same key when retrying that action.

Request body: none — send no body and no `Content-Type`.

Response `200` — `IamRegistration` — The registration, with its new draft in `package`.
- `id`: string (uuid) — The record.
- `projectId`: string (uuid) — Its project.
- `environment`: "staging" \| "production" — Which registration: the staging one, sent second, or production’s, sent last. A project has at most one of each.
- `entityId`: string — §9: fixed at registration and stored here rather than recomputed — which is also why a project slug is immutable after production launch.
- `acsUrl`: string — The assertion consumer URL registered — where sign-ins are sent.
- `sloUrl`: string — The single-logout URL registered.
- `certFingerprint`: string \| null — The fingerprint of the signing certificate registered; null when none was recorded.
- `certExpiresAt`: string (date-time) \| null — D20: an unnoticed expiry silently kills login for a live course app.
- `registeredAttributes`: string[] — What UBC IAM registered; empty until it has registered something. Builds are checked against the PRODUCTION registration’s list once UBC has registered it (`registeredAt` set): a build that asks for an attribute not in it fails. The staging registration’s list, and one not yet registered, gate no build. Once registered, it changes only on a record that reaches `active` — a change UBC has not registered yet is `requestedAttributes`.
- `requestedAttributes`: string[] \| null — What an outstanding CHANGE REQUEST asks UBC IAM for (§9) — the registration’s own `change_requested` state is the change request. Null when none is outstanding; cleared when the registration is recorded `active` again.
- `registeredAt`: string (date-time) \| null — When UBC IAM last registered this Service Provider — set when the record reaches `active`. Null until the first time; a launched app’s releases need it (§13, D9).
- `state`: "draft" \| "submitted" \| "active" \| "change_requested" \| "expired" — Along §9’s states: `draft`, `submitted` to UBC IAM, `active` once registered, `change_requested` while a change is with UBC IAM, and `expired`.
- `changeRequestedFrom`: "submitted" \| "active" \| null — While `change_requested`, where it came from: `submitted` — UBC IAM came back with questions, so the next move is the owner’s (answer them, draft again, send it); `active` — an administrator filed a change request with UBC IAM, which UBC now holds. Null in any other state.
- `externalTicketRef`: string \| null — UBC IAM’s own reference for the request; null when none was recorded.
- `submittedAt`: string (date-time) \| null — When the request now with UBC IAM was sent — the day a person said it went, at noon in Vancouver, or when an administrator recorded it sent. How long it has waited is measured from here. Null until it is sent.
- `submittedBy`: object \| null — Who said it was sent; null until it is.
  - `id`: string (uuid) — Their user id.
  - `displayName`: string — Their name, as CWL gave it.
- `package`: `RegistrationPackage` \| null — What Manifest drafted for the person to send (`draftIamRegistration`), kept as it was sent once it is; null until drafted.
- `createdAt`: string (date-time) — When the record was first written.
- `updatedAt`: string (date-time) — When the record last changed.

Error codes: `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `LAUNCH_NOT_CWL`, `LAUNCH_RECORD_SUBMITTED`, `NOT_FOUND`, `PROJECT_ARCHIVED`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `SOURCE_COMMIT_NOT_FOUND`, `SOURCE_GIT_FAILED`, `SOURCE_PROVIDER_MISMATCH`, `SOURCE_UNREACHABLE`, `UNAUTHENTICATED`

**What it is for:** to have Manifest draft the staging or the production registration request the owner sends to UBC IAM: entity ID, addresses, certificate, every attribute with its purpose and the code that reads it, contacts, the PIA number and the SAML metadata. An attribute nothing reads is flagged.  
**Guides:** none. Named only in the generated `reference/operations.md`. `launching.md` predates it, and `journey.md` omits it (§A8, guides).

#### `submitIamRegistration` — Say a registration request was sent to UBC IAM

`POST /v1/projects/{projectId}/launch-records/iam-registration/{environment}/submission` · tag `launch`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; `launch:submit` (owner, collaborator, platform administrator); person-only; no step-up; no `FORBIDDEN` (as for `submitPrivacyAssessment`).  
**Idempotency:** `Idempotency-Key` required (the digest’s §2.5). A second submission is `409 LAUNCH_TRANSITION_INVALID`.  
**Landed:** `b2c75e6` (Launch path sitting 6 (Task 9, Spec actions 3 and 9)).

> The project’s owner, a collaborator or a platform administrator, in their own session, says the staging or production registration was sent to UBC IAM — on `sentAt` (today in Vancouver when absent), with UBC’s `reference` when they have one. The record moves to `submitted`, and the launch checklist and the record say how long it has waited from that day. What is sent is Manifest’s draft, so a record with none is `409 LAUNCH_DRAFT_REQUIRED`. UBC works in an order: neither registration is sent until the privacy assessment is approved with its PIA number (`409 LAUNCH_PIA_NOT_APPROVED`), and production’s only once staging’s is active as well (`409 LAUNCH_STAGING_NOT_REGISTERED`). What is sent must be the draft the person read — name it with `draftGeneratedAt`, or a draft made since is `409 LAUNCH_DRAFT_CHANGED` — and it must carry the assessment’s PIA number: a draft made before the assessment was approved is `409 LAUNCH_DRAFT_STALE`, to be drafted again. It is sent from a draft, after UBC asked for changes, or once it lapsed — a second submission is `409 LAUNCH_TRANSITION_INVALID`. UBC’s answer is recorded by an administrator (`recordIamRegistration`). A delegated token is refused `403 TOKEN_CREDENTIAL_REFUSED`; anyone else is answered `404 NOT_FOUND`.

Parameters:
- `environment` (path, required): "staging" \| "production" — Which registration was sent: `staging` or `production`.
- `projectId` (path, required): string (uuid) — The project’s id, from `listProjects` or `createProject`.
- `Idempotency-Key` (header, required): string [minLen 8] — One per user action, and the same key when retrying that action.

Request body (required, JSON): `SubmitLaunchRecordRequest`
- `sentAt`: string (date) *(optional)* — The day it was sent, `YYYY-MM-DD` — today or earlier, and not before the draft was made. Today in Vancouver when absent.
- `reference`: string [minLen 1, maxLen 128] *(optional)* — UBC’s reference for the request, when you have one yet.
- `draftGeneratedAt`: string (date-time) *(optional)* — The `generatedAt` of the draft you sent, as you read it. If it has been drafted again since, the request is refused `409 LAUNCH_DRAFT_CHANGED` rather than recording a draft you never saw. Send it whenever you show a person the draft they send.

Response `200` — `IamRegistration` — The registration, now submitted.
- `id`: string (uuid) — The record.
- `projectId`: string (uuid) — Its project.
- `environment`: "staging" \| "production" — Which registration: the staging one, sent second, or production’s, sent last. A project has at most one of each.
- `entityId`: string — §9: fixed at registration and stored here rather than recomputed — which is also why a project slug is immutable after production launch.
- `acsUrl`: string — The assertion consumer URL registered — where sign-ins are sent.
- `sloUrl`: string — The single-logout URL registered.
- `certFingerprint`: string \| null — The fingerprint of the signing certificate registered; null when none was recorded.
- `certExpiresAt`: string (date-time) \| null — D20: an unnoticed expiry silently kills login for a live course app.
- `registeredAttributes`: string[] — What UBC IAM registered; empty until it has registered something. Builds are checked against the PRODUCTION registration’s list once UBC has registered it (`registeredAt` set): a build that asks for an attribute not in it fails. The staging registration’s list, and one not yet registered, gate no build. Once registered, it changes only on a record that reaches `active` — a change UBC has not registered yet is `requestedAttributes`.
- `requestedAttributes`: string[] \| null — What an outstanding CHANGE REQUEST asks UBC IAM for (§9) — the registration’s own `change_requested` state is the change request. Null when none is outstanding; cleared when the registration is recorded `active` again.
- `registeredAt`: string (date-time) \| null — When UBC IAM last registered this Service Provider — set when the record reaches `active`. Null until the first time; a launched app’s releases need it (§13, D9).
- `state`: "draft" \| "submitted" \| "active" \| "change_requested" \| "expired" — Along §9’s states: `draft`, `submitted` to UBC IAM, `active` once registered, `change_requested` while a change is with UBC IAM, and `expired`.
- `changeRequestedFrom`: "submitted" \| "active" \| null — While `change_requested`, where it came from: `submitted` — UBC IAM came back with questions, so the next move is the owner’s (answer them, draft again, send it); `active` — an administrator filed a change request with UBC IAM, which UBC now holds. Null in any other state.
- `externalTicketRef`: string \| null — UBC IAM’s own reference for the request; null when none was recorded.
- `submittedAt`: string (date-time) \| null — When the request now with UBC IAM was sent — the day a person said it went, at noon in Vancouver, or when an administrator recorded it sent. How long it has waited is measured from here. Null until it is sent.
- `submittedBy`: object \| null — Who said it was sent; null until it is.
  - `id`: string (uuid) — Their user id.
  - `displayName`: string — Their name, as CWL gave it.
- `package`: `RegistrationPackage` \| null — What Manifest drafted for the person to send (`draftIamRegistration`), kept as it was sent once it is; null until drafted.
- `createdAt`: string (date-time) — When the record was first written.
- `updatedAt`: string (date-time) — When the record last changed.

Error codes: `CSRF_ORIGIN_REFUSED`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `LAUNCH_DRAFT_CHANGED`, `LAUNCH_DRAFT_REQUIRED`, `LAUNCH_DRAFT_STALE`, `LAUNCH_PIA_NOT_APPROVED`, `LAUNCH_SENT_AT_INVALID`, `LAUNCH_STAGING_NOT_REGISTERED`, `LAUNCH_TRANSITION_INVALID`, `NOT_FOUND`, `PROJECT_ARCHIVED`, `RATE_LIMITED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

**What it is for:** to record that a person sent the registration request, in UBC’s order: the assessment approved with its PIA number (`LAUNCH_PIA_NOT_APPROVED`), then staging, then production once staging is active (`LAUNCH_STAGING_NOT_REGISTERED`). The draft sent must be the one read (`LAUNCH_DRAFT_CHANGED`) and must carry the PIA number (`LAUNCH_DRAFT_STALE`).  
**Guides:** none. Named only in the generated `reference/operations.md`. `launching.md` predates it, and `journey.md` omits it (§A8, guides).

#### `requestApproval` — Ask an administrator to sign off the release serving staging

`POST /v1/releases/{releaseId}/approval-request` · tag `launch`  
**Credential (from `security`):** session or delegated token  
**Who may call it (route code):** `approval:request`, on the release’s own project: owner, collaborator, platform administrator; **mintable**, so an agent may ask. An unknown release or a stranger gets `404`; a token without it `403 FORBIDDEN`. A request grants nothing and decides nothing.  
**Idempotency:** `Idempotency-Key` required (the digest’s §2.5). Asking again answers the request already made, unchanged: one request per release.  
**Landed:** `a1d4baa` (Launch path sitting 9 (Task 12, FE-25, Spec actions 5 and 10)).

> Asks a platform administrator to approve the release serving staging for production — the one approval a first launch needs from a person at the platform, and the one a launched app’s release needs when it changes a sensitive field. The request waits in the administrators’ queue (`listQueue`), oldest first, until an administrator approves or rejects the release or another release serves staging — and if this release serves staging again, rolled back to it, it waits again from when it was asked — and the launch checklist’s `admin-approval` item says who asked and since when. Asking again answers the request already made, unchanged. The `note` is shown to administrators and to nobody else. Refused `409 RELEASE_NOT_STAGED` for any release but the one serving staging, with the checklist naming that one; `409 APPROVAL_NOT_NEEDED` when nothing needs approving — an approval already covers it, or the release changes nothing that needs one; and `409 RELEASE_REJECTED` once an administrator has rejected it. The project’s owner, a collaborator, a platform administrator, or an agent on a token holding `approval:request` may ask — a request grants nothing and decides nothing.

Parameters:
- `releaseId` (path, required): string (uuid) — The release’s id, from `createRelease` or `listReleases`.
- `Idempotency-Key` (header, required): string [minLen 8] — One per user action, and the same key when retrying that action.

Request body (required, JSON): `RequestApprovalRequest`
- `note`: string [maxLen 500] *(optional)* — Anything the administrators should know — a date the app is needed by, say. Shown to administrators in their queue, and to nobody else; never in an event.

Response `200` — `ApprovalRequest` — The request — made now, or the one already made for this release.
- `id`: string (uuid) — The request.
- `releaseId`: string (uuid) — The release an administrator is asked to approve for production — the one serving staging when it was asked.
- `projectId`: string (uuid) — Its project.
- `requestedBy`: object — Who asked: the person — also when an agent asked on their token.
  - `id`: string (uuid) — Their user id.
  - `displayName`: string — Their name.
- `viaToken`: object \| null — The token an agent asked on; null when the person asked in their own session.
  - `id`: string (uuid) — The token.
  - `name`: string — Its name, as its person gave it.
- `createdAt`: string (date-time) — When it was asked — what the administrators’ queue measures its wait from.
- `open`: boolean — Whether it waits on an administrator now: until one approves or rejects the release, and while the release serves staging — closed while another release does, and waiting again if this one serves staging again.

Error codes: `APPROVAL_NOT_NEEDED`, `CSRF_ORIGIN_REFUSED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `NOT_FOUND`, `PROJECT_ARCHIVED`, `RATE_LIMITED`, `RELEASE_NOT_STAGED`, `RELEASE_REJECTED`, `REQUEST_BODY_TOO_LARGE`, `REQUEST_INVALID`, `REQUEST_MEDIA_TYPE_UNSUPPORTED`, `UNAUTHENTICATED`

**What it is for:** the owner’s *please sign this off*: asks a platform administrator to approve the release serving staging for production. The request waits in `listQueue` until an administrator decides or another release serves staging, and waits again if this one serves staging again. The checklist’s `admin-approval` item says who asked and since when (`since`). The `note` is for administrators only.  
**Guides:** none. Named only in the generated `reference/operations.md`. `launching.md` predates it, and `journey.md` omits it (§A8, guides).

#### `listQueue` — Everything waiting on an administrator

`GET /v1/queue` · tag `administration`  
**Credential (from `security`):** session ONLY (a token is refused `403 TOKEN_CREDENTIAL_REFUSED`)  
**Who may call it (route code):** session only; **platform administrators** (the session’s `platformRole`: a person made an administrator reads it once they sign in again). Anyone else gets `403 FORBIDDEN`.  
**Idempotency:** — (a read).  
**Landed:** `a1d4baa` (Launch path sitting 9 (Task 12, FE-25, Spec actions 5 and 10)).

> Everything waiting on a platform administrator, oldest first, each item saying since when it has waited: a release someone asked them to sign off (`requestApproval`), with the asker’s note; the staging and production registrations sent to UBC IAM, and the change requests filed with it, whose answers an administrator records; and the privacy assessments sent to the Privacy Office. A registration UBC IAM sent back to its owner with questions is the owner’s to answer, and is not here; nor is anything of an archived project, which cannot be acted on until it is restored. `oldestSince` is the age of the oldest item. For platform administrators: anyone else is refused `403 FORBIDDEN`, and a delegated token `403 TOKEN_CREDENTIAL_REFUSED` however it was minted.

Response `200` — `Queue` — Everything waiting, oldest first.
- `items`: `QueueItem`[] — Everything waiting, oldest first — at most 200.
- `oldestSince`: string (date-time) \| null — When the oldest item began waiting — the queue’s headline: a queue that is long is working, and one that is old is not. Null when nothing waits.
- `truncated`: boolean — True when more than 200 wait, and only the oldest are here.

Error codes: `FORBIDDEN`, `INTERNAL`, `RATE_LIMITED`, `REQUEST_INVALID`, `TOKEN_CREDENTIAL_REFUSED`, `UNAUTHENTICATED`

**What it is for:** the administrators’ queue: everything waiting on them, oldest first, each with how long it has waited. Sign-off requests carry the asker’s note, plus registrations and change requests with UBC IAM and assessments with the Privacy Office. A registration UBC IAM sent back to its owner is not in it, nor is anything of an archived project. `oldestSince` is its headline.  
**Guides:** none. Named only in the generated `reference/operations.md`. `launching.md` predates it, and `journey.md` omits it (§A8, guides).

## A4. Every changed operation

Every operation that existed at `186fa34` and differs now, field by field. The global wording in §A1's last paragraph (the
`Idempotency-Key` description and the error preamble) is not repeated here. Each description is marked one of two ways:

- *reworded*: it only lost spec citations, moved to the present tense (`5246d4d`), or says slug for name (`8ef685d`,
  `c90f571`).
- **NEW FACT**: it says something the digest's did not. The full new text is in the contract and in manifest's
  `docs/api/reference/operations.md`.

A response example marked "updated" follows its schema's change (§A7).

**46 of the 57 surviving operations changed beyond §A1’s global wording.** The other 11 changed only in that wording (their error preamble): `getBlueprint`, `listDocs`, `getDoc`, `listAppSecrets`, `getPendingAction`, `listBuilds`, `listCommits`, `getCommit`, `getFile`, `listReleases`, `getTree`. Unchanged in every byte: —.

- **`listBlueprints`** (`GET /v1/blueprints`)
  - description: *reworded*
- **`getKnowledgePack`** (`GET /v1/blueprints/{blueprintRef}/knowledge-pack`)
  - description: *reworded*
- **`getBuild`** (`GET /v1/builds/{buildId}`)
  - description: *reworded*
- **`getBuildLog`** (`GET /v1/builds/{buildId}/logs`)
  - description: *reworded*
- **`getEnvironment`** (`GET /v1/environments/{environmentId}`)
  - description: *reworded*
  - response 200 example updated (values only, or a nested object's new field — §A7)
- **`deploy`** (`POST /v1/environments/{environmentId}/deploy`)
  - description: *reworded*; now states that production needs a recent step-up in a session and that a token’s request becomes a pending action, both already the rule (digest §2.7–2.8)
  - response 200 example updated (gains `createdAt`, from its schema — §A7)
  - **+ error codes** `PROJECT_ARCHIVED`
- **`listIncidents`** (`GET /v1/environments/{environmentId}/incidents`)
  - description: **NEW FACT**: *"A delegated token is refused a `confidential` project’s staging and production Incidents (`INCIDENT_LOG_CONFIDENTIAL`) while the platform lets its building agent use the capable model; a session reads them, and any token reads the sandbox’s."*
  - **+ error codes** `INCIDENT_LOG_CONFIDENTIAL`
- **`listInstances`** (`GET /v1/environments/{environmentId}/instances`)
  - description: *reworded*
  - response 200 example updated (values only, or a nested object's new field — §A7)
- **`setAppSecret`** (`PUT /v1/environments/{environmentId}/secrets/{name}`)
  - description: *reworded* (production: a session with a recent step-up; a token is refused `TOKEN_CREDENTIAL_REFUSED`, as before)
  - **+ error codes** `PROJECT_ARCHIVED`
- **`clearAppSecret`** (`DELETE /v1/environments/{environmentId}/secrets/{name}`)
  - description: *reworded*
  - **+ error codes** `PROJECT_ARCHIVED`
- **`listFleet`** (`GET /v1/fleet`)
  - description: *reworded* (non-administrator `403 FORBIDDEN`, token `403 TOKEN_CREDENTIAL_REFUSED`, as before)
  - response 200 example updated (gains `name`, `state`, `archivedAt`, from its schema — §A7)
- **`getInstanceOutput`** (`GET /v1/instances/{instanceId}/output`)
  - description: **NEW FACT**: sandbox only. *"Staging and production are always refused (`INSTANCE_OUTPUT_STAGING`, `INSTANCE_OUTPUT_PRODUCTION`); an Incident is the only view of their output."*
  - response 200 example updated (values only, or a nested object's new field — §A7)
  - **+ error codes** `INSTANCE_OUTPUT_STAGING`, `PROJECT_ARCHIVED`
- **`getMe`** (`GET /v1/me`)
  - description: **NEW FACT**: answers *"whether they may build (`mayBuild`)"*
  - response 200 example updated (gains `mayBuild`, from its schema — §A7)
- **`getOpenApiDocument`** (`GET /v1/openapi.json`)
  - description: *reworded*
  - response 200 example updated (values only, or a nested object's new field — §A7)
- **`confirmPendingAction`** (`POST /v1/pending-actions/{pendingActionId}/confirm`)
  - description: *reworded*; now says *"in their own session with a recent step-up"*, already the rule (digest §2.8)
  - **+ error codes** `PROJECT_ARCHIVED`
- **`rejectPendingAction`** (`POST /v1/pending-actions/{pendingActionId}/reject`)
  - description: *reworded*; now says only a person holding the capability may reject, in their own session
  - **+ error codes** `PROJECT_ARCHIVED`
- **`listProjects`** (`GET /v1/projects`)
  - description: *reworded*
  - response 200 example updated (gains `state`, `archivedAt`, from its schema — §A7)
- **`createProject`** (`POST /v1/projects`)
  - description: **NEW FACT**: *"only for a person who may build — a faculty member or a platform administrator (`mayBuild` on `getMe`); anyone else is refused `BUILDING_NOT_OPEN` before anything is checked or created."*
  - response 201 example updated (gains `state`, `archivedAt`, from its schema — §A7)
  - **+ error codes** `BUILDING_NOT_OPEN`
- **`getProject`** (`GET /v1/projects/{projectId}`)
  - description: *reworded*
  - response 200 example updated (gains `state`, `archivedAt`, from its schema — §A7)
- **`updateProject`** (`PATCH /v1/projects/{projectId}`)
  - description: *reworded*
  - response 200 example updated (gains `state`, `archivedAt`, from its schema — §A7)
  - **+ error codes** `PROJECT_ARCHIVED`
- **`startBuild`** (`POST /v1/projects/{projectId}/builds`)
  - description: *reworded*
  - **+ error codes** `PROJECT_ARCHIVED`
- **`createCommit`** (`POST /v1/projects/{projectId}/commits`)
  - **+ error codes** `PROJECT_ARCHIVED`
- **`listEnvironments`** (`GET /v1/projects/{projectId}/environments`)
  - description: *reworded*
- **`streamProjectEvents`** (`GET /v1/projects/{projectId}/events`)
  - description: *reworded*; names `426 EVENTS_UPGRADE_REQUIRED`
  - **+ close code `4401`**: *"The credential was revoked or expired. Get a new one — sign the person in again, or ask them for a new token; reconnecting with the same credential is refused."*
  - `x-manifest-event-types`: +14 types, 2 changed (§A5)
- **`getLaunchReadiness`** (`GET /v1/projects/{projectId}/launch-readiness`)
  - description: *reworded*
  - response 200 example updated (values only, or a nested object's new field — §A7)
- **`getLaunchRecords`** (`GET /v1/projects/{projectId}/launch-records`)
  - summary: *"The IAM registration and the privacy assessment, as recorded"* → *"The privacy assessment and the two IAM registrations"*
  - description: **NEW FACT**: *"The three records a first production launch waits on — the privacy assessment, the staging registration and the production registration — each with when a person said it was sent and what UBC said…"*
  - response 200 description: *"Both records, either of which may be null."* → *"The three records, any of which may be null."*
  - response 200 example updated (gains `stagingRegistration`, from its schema — §A7)
- **`recordIamRegistration`** (`POST /v1/projects/{projectId}/launch-records/iam-registration`)
  - description: **NEW FACT**: records *"the staging registration or production’s (`environment`, production’s when absent)"*; any move off the allowed transitions is `409 LAUNCH_TRANSITION_INVALID`, *"naming the moves allowed"*; *"UBC’s answer is recorded whatever order it arrives in"*
  - request example now `{"entityId":"https://manifest.internal/sp/fixture/production","acsUrl":"https://fixture.production.manifest.internal/auth/ubcshib/callback","sloUrl":"https://fixture.production.manifest.internal/auth/logout","registeredAttributes":["ubcEduCwlPuid","mail"],"state":"submitted","externalTicketRef":"IAM-1"}`
  - response 200 example updated (gains `environment`, `changeRequestedFrom`, `submittedAt`, `submittedBy`, `package`, `createdAt`, from its schema — §A7)
  - **+ error codes** `PROJECT_ARCHIVED`
- **`recordPrivacyAssessment`** (`POST /v1/projects/{projectId}/launch-records/privacy-assessment`)
  - description: *reworded*; names `409 LAUNCH_TRANSITION_INVALID` for a move the states do not allow (already declared)
  - request example now `{"state":"approved","reviewer":"K. Privacy"}`
  - response 200 example updated (gains `submittedAt`, `submittedBy`, `draft`, `createdAt`, from its schema — §A7)
  - **+ error codes** `PROJECT_ARCHIVED`
- **`listMembers`** (`GET /v1/projects/{projectId}/members`)
  - description: *reworded*
  - response 200 example updated (gains `cwlLogin`, from its schema — §A7)
- **`addMember`** (`POST /v1/projects/{projectId}/members`)
  - description: **NEW FACT**: *"name them by exactly one of their PUID, CWL login name or email (a shared email is `MEMBER_USER_AMBIGUOUS`). Only a person who may build … is added; anyone else is refused `MEMBER_MAY_NOT_BUILD` … Publishes `member.added` when something changed."*
  - request example now `{"cwlLogin":"colleague","role":"collaborator"}`
  - response 201 example updated (gains `cwlLogin`, from its schema — §A7)
  - **+ error codes** `MEMBER_MAY_NOT_BUILD`, `MEMBER_USER_AMBIGUOUS`, `PROJECT_ARCHIVED`, `PROJECT_LAST_OWNER`
- **`removeMember`** (`DELETE /v1/projects/{projectId}/members/{userId}`)
  - description: **NEW FACT**: *"Removes a person from the project, and their agent with them: their delegated tokens on it are revoked, their open event streams on it close (`4401` a token’s, `4404` their own), and their agent sessions there end. Publishes `member.removed`."* A `503 AI_CATALOGUE_DISABLED` or `500` can come **after** the removal happened: repeat it.
  - response 200 example updated (gains `cwlLogin`, from its schema — §A7)
  - **+ error codes** `AI_CATALOGUE_DISABLED`, `PROJECT_ARCHIVED`
- **`listPendingActions`** (`GET /v1/projects/{projectId}/pending-actions`)
  - description: *reworded*
- **`runRehearsal`** (`POST /v1/projects/{projectId}/rehearsal`)
  - description: **NEW FACT**: *"The owner, a collaborator or a platform administrator runs it in their own session, after a second sign-in (step-up) in the last ten minutes … anyone else is answered `404 NOT_FOUND`."* It *"takes the deployment down again"* before it records; production then reads the instance as `gone`, or `failed`. One at a time (`REHEARSAL_RUNNING`); `500 REHEARSAL_TEARDOWN_FAILED` records nothing.
  - **+ error codes** `PROJECT_ARCHIVED`, `REHEARSAL_RUNNING`, `REHEARSAL_TEARDOWN_FAILED`, `STEP_UP_REQUIRED`
  - **− error codes** `FORBIDDEN`
- **`createRelease`** (`POST /v1/projects/{projectId}/releases`)
  - description: *reworded*
  - **+ error codes** `PROJECT_ARCHIVED`
- **`getSpec`** (`GET /v1/projects/{projectId}/spec`)
  - description: *reworded*; names `SPEC_NOT_FOUND` (already declared)
- **`validateSpec`** (`POST /v1/projects/{projectId}/spec`)
  - description: *reworded*
  - **+ error codes** `PROJECT_ARCHIVED`
- **`listTokens`** (`GET /v1/projects/{projectId}/tokens`)
  - description: *reworded*
- **`mintToken`** (`POST /v1/projects/{projectId}/tokens`)
  - description: **NEW FACT**: a token may never hold *"the person-only `release:approve`, `launch:record`, `launch:submit`, `launch:rehearse` or `project:delete` (`400 TOKEN_CAPABILITY_FORBIDDEN`), nor more than the minter holds (`403 FORBIDDEN`)"*
  - **+ error codes** `PROJECT_ARCHIVED`
- **`getRelease`** (`GET /v1/releases/{releaseId}`)
  - description: *reworded*
- **`getApproval`** (`GET /v1/releases/{releaseId}/approval`)
  - description: *reworded*
- **`createApprovalPreview`** (`POST /v1/releases/{releaseId}/approval-preview`)
  - description: *reworded*
  - **+ error codes** `PROJECT_ARCHIVED`
- **`getApprovalPreview`** (`GET /v1/releases/{releaseId}/approval-previews/{previewId}`)
  - description: *reworded*
  - **+ error codes** `PROJECT_ARCHIVED`
- **`approveRelease`** (`POST /v1/releases/{releaseId}/approve`)
  - description: *reworded*
  - **+ error codes** `PROJECT_ARCHIVED`
- **`rejectRelease`** (`POST /v1/releases/{releaseId}/reject`)
  - description: *reworded*
  - **+ error codes** `PROJECT_ARCHIVED`
- **`checkSlug`** (`GET /v1/slugs/{slug}`)
  - summary: *"Would this project name work?"* → *"Would this slug work?"*
  - description: *reworded*: the slug, not what people read (the `name`)
  - parameter `slug`: description *"The name to check, as it would be given to `createProject`."* → *"The slug to check, as it would be given to `createProject` — not what people read, which is the project’s `name`: separate, and need not be unique."*
  - response 200 example updated (values only, or a nested object's new field — §A7)
- **`revokeToken`** (`DELETE /v1/tokens/{tokenId}`)
  - description: **NEW FACT**: also *"closes every event stream it holds open (`4401`), and ends every agent session it started"*; if ending them fails (`503 AI_CATALOGUE_DISABLED`, or a `500`), the token is already revoked: repeat the request
  - **+ error codes** `AI_CATALOGUE_DISABLED`

**What did not change.** No surviving operation moved path or method, changed its `security`, gained or lost a parameter, or
changed the named schema of its request or response. Every shape change reached them through the schemas they name (§A7).

## A5. Event types: the new and the changed

Fourteen new types, two changed, none removed.

- **The digest's numbers from 24 on have moved.** Five new types were inserted mid-list, so its §4.2/§4.3 numbers from 24 on
  now point elsewhere. The table gives old and new numbers for every type that moved; types 1–23 keep theirs.
- **`humanMessage` is in neither the contract nor the guides.** It was read from each publisher: `launch/records.ts`,
  `launch/requests.ts`, `api/routes/project-reads.ts`, `ai/sessions.ts`, `sso/registration.ts` and `releases/lifecycle.ts`.
  "{actor}" is "{name}" or "{name}'s agent (token '{tokenName}')", as in the digest; "{person}" is always the person's name.
- **The guides' meanings match the contract.** The *Events* guide's table gives each type's meaning, and for all 52 types its
  sentence is word for word the contract's description (checked by script).

| # now | # in the digest | `type` | Meaning (the contract's sentence, word for word the *Events* guide's) | `humanMessage` as published (read from the code) | `machineDetail` fields | Landed, or changed by |
|---|---|---|---|---|---|---|
| 15 | 15 | `project.created` (**changed**) | A project and its three environments were created (§22). `repository.seeded` and `spec.validated` follow. | (unchanged) "{slug} was created from {blueprint}[ with the {starter} starter]." | `slug`, `blueprint`, `starter`, `audience` | `8ef685d` |
| 22 | 22 | `iam_registration.recorded` (**changed**) | An administrator recorded what UBC IAM registered for the app’s staging or production sign-in. | "{person} recorded this app’s **{environment}** UBC IAM registration as {state}[ (ticket {ref})]." (gained `{environment}`) | `state`, `environment`, `entityId`, `externalTicketRef`, `attributeCount` | `b2c75e6` |
| 24 | **new** | `iam_registration.submitted` | A person said the app’s staging or production registration request was sent to UBC IAM. It now waits for UBC’s answer, which an administrator records. | "{person} said this app’s {environment} registration was sent to UBC IAM on {day, e.g. October 1, 2026}[ (ticket {ref})]." | `environment`, `sentAt`, `externalTicketRef` | `b2c75e6` |
| 25 | **new** | `privacy_assessment.submitted` | A person said the app’s privacy impact assessment was sent to UBC’s Privacy Office. It now waits for the Office’s answer, which an administrator records. | "{person} said this app’s privacy assessment was sent to the UBC Privacy Office on {day}[ (ticket {ref})]." | `sentAt`, `externalTicketRef` | `b2c75e6` |
| 26 | **new** | `iam_registration.drafted` | Manifest drafted the app’s staging or production registration request for a person to send to UBC IAM. Nothing was sent; the draft is on the record. | "{person} drafted this app’s {environment} registration for UBC IAM, asking for {n} attribute(s)[, {u} of them not read by the app]." | `environment`, `entityId`, `fromCommit`, `attributeCount`, `unusedCount` | `6cbb489` |
| 27 | **new** | `privacy_assessment.drafted` | Manifest drafted the app’s privacy impact assessment for a person to complete and send to UBC’s Privacy Office. Nothing was sent; the draft is on the record. | "{person} drafted this app’s privacy assessment for the Privacy Office, with {gapCount} gap(s) for the owner to fill." | `fromCommit`, `gapCount` | `81892d4` |
| 28 | 24 | `rehearsal.completed` | (unchanged; renumbered) |  |  |  |
| 29 | 25 | `release.approved` | (unchanged; renumbered) |  |  |  |
| 30 | 26 | `release.approval_rejected` | (unchanged; renumbered) |  |  |  |
| 31 | **new** | `approval.requested` | A person asked an administrator to approve the release serving staging for production. It waits in the administrators’ queue until an administrator decides, or another release serves staging. | "{person} asked an administrator to approve this release for production." On a token: "An agent on {person}’s token asked an administrator to approve this release for production." Never the note. | `requestId`, `releaseId`, `viaToken` | `a1d4baa` |
| 32 | 27 | `project.launched` | (unchanged; renumbered) |  |  |  |
| 33 | 28 | `repository.pushed` | (unchanged; renumbered) |  |  |  |
| 34 | 29 | `repository.history_rewritten` | (unchanged; renumbered) |  |  |  |
| 35 | 30 | `repository.visibility_enforced` | (unchanged; renumbered) |  |  |  |
| 36 | 31 | `repository.secret_detected` | (unchanged; renumbered) |  |  |  |
| 37 | 32 | `repository.scan_incomplete` | (unchanged; renumbered) |  |  |  |
| 38 | 33 | `repository.protection_unavailable` | (unchanged; renumbered) |  |  |  |
| 39 | 34 | `repository.committed` | (unchanged; renumbered) |  |  |  |
| 40 | 35 | `repository.secret_refused` | (unchanged; renumbered) |  |  |  |
| 41 | 36 | `app_secret.set` | (unchanged; renumbered) |  |  |  |
| 42 | 37 | `app_secret.cleared` | (unchanged; renumbered) |  |  |  |
| 43 | 38 | `project.renamed` | (contract unchanged; renumbered. Its `humanMessage` changed in the code: §A5.2) |  |  |  |
| 44 | **new** | `member.added` | A person was added to the project, or their role on it changed (§13). Not published when nothing changed. | "{actor} added {name} to the project as {an owner \| a collaborator}." / "{actor} made {name} {an owner \| a collaborator} of the project; they were {…}." | `memberId`, `role`, `previousRole`, `via`, `userId`, `tokenId` | `e832bd5` |
| 45 | **new** | `member.removed` | A person was taken off the project (§13) — and with them their agent: every delegated token they had minted on it revoked, their agent sessions there ended, and their open event streams closed (§6, §10, §20). Not published for somebody who was not a member. | "{actor} removed {name} from the project[, revoking {n} delegated token(s) they had minted on it][ and ending {n} agent session(s) of theirs there]." [+ " At least one of their agent sessions could not be ended; repeating the removal ends it."] | `memberId`, `tokensRevoked`, `sessionsEnded`, `via`, `userId`, `tokenId` | `e832bd5` |
| 46 | **new** | `agent_session.started` | An agent was given a model key for this project, charged to the person who started it (§10). The key itself is never published. | "{person} started an agent session, '{name}', charged to them: up to ${capUsd} until {YYYY-MM-DD HH:MM} UTC[, asked for by the delegated token '{tokenName}']." | `sessionId`, `models`, `capUsd`, `expiresAt`, `via`, `userId`, `tokenId` | `313075d` |
| 47 | **new** | `agent_session.narrowed` | An agent session’s key lost the models its project no longer allows — its data classification was raised, or the platform now keeps a confidential project’s building agent on-premise — and kept the rest (§7, §10). The session goes on with the same key. | "{person}’s agent session '{name}' can no longer use {withdrawn models}, because {why}; it keeps {kept models}." | `sessionId`, `withdrawn`, `models`, `via`, `userId`, `tokenId` | `d061ad7` |
| 48 | **new** | `agent_session.ended` | An agent session’s key was revoked at the gateway (§10). | "{person}’s agent session '{name}' was {ended \| ended because the delegated token that started it was revoked \| … the project was switched off \| … the project was deleted \| … its project no longer allows any of the models it held — … \| … the person it works for was removed from the project}." | `sessionId`, `reason`, `via`, `userId`, `tokenId` | `313075d` |
| 49 | **new** | `sso.deregistered` | The app’s SAML Service Provider registration with the Manifest identity provider was removed for one environment — its project was switched off (§9, §11). | "Single sign-on was removed for {slug} in {environmentKind}." | `entityId` | `ce96baa` |
| 50 | **new** | `project.archived` | The project was switched off by its owner (§11): each of its names answers a page saying so, its instances are retired and its services stopped. Its code, data, secrets and records are kept, and it can be restored. | "{person} switched {slug} off. Each of its names now answers a page saying so; its code, data and secrets are kept, and it can be restored." As a delete’s first step: "{person} switched {slug} off, to delete it." | `via`, `userId`, `tokenId` | `ce96baa` |
| 51 | **new** | `project.restored` | A switched-off project was restored (§11). Nothing started: its names answer the switched-off page until its next deploy brings the app back on its kept data. Its delegated tokens stay revoked. | "{person} restored {slug}. It is off until its next deploy, which brings it back on its kept data." | `via`, `userId`, `tokenId` | `ce96baa` |
| 52 | **new** | `project.deleted` | The project, which never launched, was deleted by its owner (§11): switched off, then its repository, every data volume, every secret and its model budgets destroyed, and its names released. Its record and this trail remain; its name (slug) is free for another project. The last event a project has. | "{person} deleted {slug}. Its code, data and secrets are gone; this record remains, and the name {slug} is free for another project." | `via`, `userId`, `tokenId` | `bfae957` |

Types 1–23 keep their numbers. Apart from #15 and #22 above, their digest rows stand, `humanMessage` included.

### A5.1 The new types' `machineDetail`, field by field (generated from the contract)

##### 24. `iam_registration.submitted`

A person said the app’s staging or production registration request was sent to UBC IAM. It now waits for UBC’s answer, which an administrator records.

`machineDetail`:
- `environment`: "staging" \| "production" — Which registration was sent: the staging one, or production’s.
- `sentAt`: string — The day it was sent, `YYYY-MM-DD`, as the person who sent it said.
- `externalTicketRef`: string \| null — UBC IAM’s reference for the request; null when the person had none yet.

Example `machineDetail`: `{"environment":"staging","sentAt":"2026-09-29","externalTicketRef":"IAM-2026-0500"}`

##### 25. `privacy_assessment.submitted`

A person said the app’s privacy impact assessment was sent to UBC’s Privacy Office. It now waits for the Office’s answer, which an administrator records.

`machineDetail`:
- `sentAt`: string — The day it was sent, `YYYY-MM-DD`, as the person who sent it said.
- `externalTicketRef`: string \| null — The Privacy Office’s reference; null when the person had none yet.

Example `machineDetail`: `{"sentAt":"2026-09-22","externalTicketRef":"PIA-2026-0088"}`

##### 26. `iam_registration.drafted`

Manifest drafted the app’s staging or production registration request for a person to send to UBC IAM. Nothing was sent; the draft is on the record.

`machineDetail`:
- `environment`: "staging" \| "production" — Which registration was drafted: the staging one, or production’s.
- `entityId`: string — The Service Provider entity ID the draft registers, for that environment.
- `fromCommit`: string — The commit whose manifest and code the draft was drawn from.
- `attributeCount`: integer — How many attributes the draft asks for. The names are in the record, not here.
- `unusedCount`: integer — How many of them nothing in the app was found reading — each to remove before sending.

Example `machineDetail`: `{"environment":"staging","entityId":"https://manifest.internal/sp/chem-labs/staging","fromCommit":"3f2a9c41d0b7e85f6a1c2d3e4f5a6b7c8d9e0f12","attributeCount":3,"unusedCount":1}`

##### 27. `privacy_assessment.drafted`

Manifest drafted the app’s privacy impact assessment for a person to complete and send to UBC’s Privacy Office. Nothing was sent; the draft is on the record.

`machineDetail`:
- `fromCommit`: string — The commit whose manifest the draft was drawn from.
- `gapCount`: integer — How many things the draft names for the owner to add before sending — what Manifest cannot know. The draft itself is on the record, not here.

Example `machineDetail`: `{"fromCommit":"3f2a9c41d0b7e85f6a1c2d3e4f5a6b7c8d9e0f12","gapCount":5}`

##### 31. `approval.requested`

A person asked an administrator to approve the release serving staging for production. It waits in the administrators’ queue until an administrator decides, or another release serves staging.

`machineDetail`:
- `requestId`: string (uuid) — The request.
- `releaseId`: string (uuid) — The release an administrator is asked to approve — the one serving staging.
- `viaToken`: boolean — Whether an agent asked on a person’s token, rather than the person.

Example `machineDetail`: `{"requestId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","releaseId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","viaToken":false}`

##### 44. `member.added`

A person was added to the project, or their role on it changed (§13). Not published when nothing changed.

`machineDetail`:
- `memberId`: string (uuid) — The person added — `listMembers` names them.
- `role`: "owner" \| "collaborator" — The role they now have.
- `previousRole`: "owner" \| "collaborator" \| null — The role they had before; null when they were not a member.
- `via`: "session" \| "token" — How the person acted: `session` in their own interactive session, `token` through a delegated token they minted.
- `userId`: string (uuid) — The person who acted — for a token, the person who minted it. `listMembers` names them.
- `tokenId`: string (uuid) \| null — The delegated token that acted (`listTokens`); null when the person acted in their own session.

Example `machineDetail`: `{"memberId":"2b7e4f90-3c1d-4a6e-8f25-9d0c1b3a4e57","role":"collaborator","previousRole":null,"via":"session","userId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":null}`

##### 45. `member.removed`

A person was taken off the project (§13) — and with them their agent: every delegated token they had minted on it revoked, their agent sessions there ended, and their open event streams closed (§6, §10, §20). Not published for somebody who was not a member.

`machineDetail`:
- `memberId`: string (uuid) — The person taken off the project.
- `tokensRevoked`: integer [min 0] — How many delegated tokens they had minted on the project were revoked with the removal — every one not already revoked, an expired one included; a token of theirs on another project is not touched.
- `sessionsEnded`: integer [min 0] — How many of their agent sessions on the project the removal ended — started by a token or in their own browser alike. When some could not be ended (the request was answered an error), repeating the removal ends them; each end is its own `agent_session.ended`.
- `via`: "session" \| "token" — How the person acted: `session` in their own interactive session, `token` through a delegated token they minted.
- `userId`: string (uuid) — The person who acted — for a token, the person who minted it. `listMembers` names them.
- `tokenId`: string (uuid) \| null — The delegated token that acted (`listTokens`); null when the person acted in their own session.

Example `machineDetail`: `{"memberId":"2b7e4f90-3c1d-4a6e-8f25-9d0c1b3a4e57","tokensRevoked":1,"sessionsEnded":1,"via":"session","userId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":null}`

##### 46. `agent_session.started`

An agent was given a model key for this project, charged to the person who started it (§10). The key itself is never published.

`machineDetail`:
- `sessionId`: string (uuid) — The session — `listAgentSessions` names it.
- `models`: string[] — The logical models its key may call — what D17 allows for the project’s data.
- `capUsd`: number — The most its key may spend, in US dollars.
- `expiresAt`: string (date-time) — When its key stops working, whatever anybody does.
- `via`: "session" \| "token" — How the person acted: `session` in their own interactive session, `token` through a delegated token they minted.
- `userId`: string (uuid) — The person who acted — for a token, the person who minted it. `listMembers` names them.
- `tokenId`: string (uuid) \| null — The delegated token that acted (`listTokens`); null when the person acted in their own session.

Example `machineDetail`: `{"sessionId":"2b7e4f90-3c1d-4a6e-8f25-9d0c1b3a4e57","models":["default-chat","default-embed"],"capUsd":2,"expiresAt":"2026-09-27T23:15:00.000Z","via":"token","userId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":"2b7e4f90-3c1d-4a6e-8f25-9d0c1b3a4e57"}`

##### 47. `agent_session.narrowed`

An agent session’s key lost the models its project no longer allows — its data classification was raised, or the platform now keeps a confidential project’s building agent on-premise — and kept the rest (§7, §10). The session goes on with the same key.

`machineDetail`:
- `sessionId`: string (uuid) — The session — `listAgentSessions` names it.
- `withdrawn`: string[] [minItems 1] — The logical models its key may no longer call — the gateway refuses them from now on. Never empty.
- `models`: string[] [minItems 1] — The logical models its key still holds: what it held that the project still allows. Never empty — a session left with nothing it may use is ended instead.
- `via`: "session" \| "token" — How the person acted: `session` in their own interactive session, `token` through a delegated token they minted.
- `userId`: string (uuid) — The person who acted — for a token, the person who minted it. `listMembers` names them.
- `tokenId`: string (uuid) \| null — The delegated token that acted (`listTokens`); null when the person acted in their own session.

Example `machineDetail`: `{"sessionId":"2b7e4f90-3c1d-4a6e-8f25-9d0c1b3a4e57","withdrawn":["default-chat","default-chat-reasoning","default-embed"],"models":["default-chat-onprem","default-chat-onprem-reasoning","default-chat-large"],"via":"session","userId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":null}`

##### 48. `agent_session.ended`

An agent session’s key was revoked at the gateway (§10).

`machineDetail`:
- `sessionId`: string (uuid) — The session that ended.
- `reason`: "ended" \| "token_revoked" \| "project_archived" \| "project_deleted" \| "models_withdrawn" \| "member_removed" — Why: `endAgentSession`, the token that started it revoked, its project switched off or deleted, `models_withdrawn` — its project no longer allows any of the models it held (its data classification was raised, or the platform now keeps a confidential project’s building agent on-premise) — or `member_removed`: the person it works for was taken off the project. A session that keeps any model it may still use is narrowed instead (`agent_session.narrowed`).
- `via`: "session" \| "token" — How the person acted: `session` in their own interactive session, `token` through a delegated token they minted.
- `userId`: string (uuid) — The person who acted — for a token, the person who minted it. `listMembers` names them.
- `tokenId`: string (uuid) \| null — The delegated token that acted (`listTokens`); null when the person acted in their own session.

Example `machineDetail`: `{"sessionId":"2b7e4f90-3c1d-4a6e-8f25-9d0c1b3a4e57","reason":"token_revoked","via":"session","userId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":null}`

##### 49. `sso.deregistered`

The app’s SAML Service Provider registration with the Manifest identity provider was removed for one environment — its project was switched off (§9, §11).

`machineDetail`:
- `entityId`: string — The app’s SAML entity id in this environment (§9), now unregistered.

Example `machineDetail`: `{"entityId":"https://manifest.internal/sp/chem-labs/staging"}`

##### 50. `project.archived`

The project was switched off by its owner (§11): each of its names answers a page saying so, its instances are retired and its services stopped. Its code, data, secrets and records are kept, and it can be restored.

`machineDetail`:
- `via`: "session" \| "token" — How the person acted: `session` in their own interactive session, `token` through a delegated token they minted.
- `userId`: string (uuid) — The person who acted — for a token, the person who minted it. `listMembers` names them.
- `tokenId`: string (uuid) \| null — The delegated token that acted (`listTokens`); null when the person acted in their own session.

Example `machineDetail`: `{"via":"session","userId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":null}`

##### 51. `project.restored`

A switched-off project was restored (§11). Nothing started: its names answer the switched-off page until its next deploy brings the app back on its kept data. Its delegated tokens stay revoked.

`machineDetail`:
- `via`: "session" \| "token" — How the person acted: `session` in their own interactive session, `token` through a delegated token they minted.
- `userId`: string (uuid) — The person who acted — for a token, the person who minted it. `listMembers` names them.
- `tokenId`: string (uuid) \| null — The delegated token that acted (`listTokens`); null when the person acted in their own session.

Example `machineDetail`: `{"via":"session","userId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":null}`

##### 52. `project.deleted`

The project, which never launched, was deleted by its owner (§11): switched off, then its repository, every data volume, every secret and its model budgets destroyed, and its names released. Its record and this trail remain; its name (slug) is free for another project. The last event a project has.

`machineDetail`:
- `via`: "session" \| "token" — How the person acted: `session` in their own interactive session, `token` through a delegated token they minted.
- `userId`: string (uuid) — The person who acted — for a token, the person who minted it. `listMembers` names them.
- `tokenId`: string (uuid) \| null — The delegated token that acted (`listTokens`); null when the person acted in their own session.

Example `machineDetail`: `{"via":"session","userId":"6f1c1d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f","tokenId":null}`

### A5.2 The changed types

- **`project.created`** (`8ef685d`): `machineDetail.slug`'s description changed from *"The project’s name (§23)."* to *"The
  project’s slug (§23) — what its hostnames and repository are made from, and never changes."* No shape change.
- **`iam_registration.recorded`** (`b2c75e6`):
  - Its description changed from *"…for the app’s production sign-in (§9)."* to *"…for the app’s staging or production
    sign-in."*
  - `machineDetail` gains **`environment`**: `"staging" | "production"`, required (*"Which registration: the staging one, or
    production’s."*).
  - `entityId`'s description changed from *"The production entity id registered."* to *"The entity id registered."*
  - The example gains `"environment":"production"`.
  - Its `humanMessage` (code) now names the environment: "{person} recorded this app's {environment} UBC IAM registration as
    {state}[ (ticket {ref})]." The digest's #22 had no `{environment}`.
- **`project.renamed`: not a contract change, but a sentence the digest records.** Its `humanMessage` (code) is now "{actor}
  renamed the project from “{from}” to “{name}”." (the digest's #38: "{actor} renamed {from} to {name}."). A search of the
  publishers' diff since `186fa34` found no other surviving type's sentence changed.
- **Changes to the new types before `a230c1a`.** These are already part of the types as §A5.1 gives them, since none of the
  types existed at `186fa34`:
  - `agent_session.ended`'s `reason` gained `models_withdrawn` (`4f261e9`) and `member_removed` (`baacc1c`).
  - `member.removed` gained `tokensRevoked` and `sessionsEnded` (`baacc1c`).
  - `agent_session.narrowed`'s two lists gained `minItems 1` (`3333acc`).

## A6. Error codes: new, reworded, and who declares them

29 new, 0 removed. Counts by status, now: 400 ×16, 401 ×10, 403 ×11, 404 ×4, 409 ×80, 413 ×1, 415 ×1, 422 ×1, 426 ×1, 429 ×1, 500 ×3, 503 ×13 (the digest: 400 ×14, 401 ×10, 403 ×8, 404 ×4, 409 ×59, 413 ×1, 415 ×1, 422 ×1, 426 ×1, 429 ×1, 500 ×1, 503 ×12). The new 403s make **eleven** codes whose status is 403 (the digest's §2.6 counted eight); the new 500s make three.

### A6.1 The 29 new codes

| Code | HTTP | Meaning (`summary`) | Remedy | Operations that declare it | Landed |
|---|---|---|---|---|---|
| `AGENT_BUDGET_EXHAUSTED` | 409 | The monthly agent budget of the person this credential acts for is spent, so no key was issued (§10). | Wait for the month to reset (`getAgentBudget` says when), or ask a platform administrator to raise this person’s agent budget. | startAgentSession | `313075d` |
| `AGENT_NO_MODEL_FOR_CLASSIFICATION` | 409 | No model in the platform’s catalogue is approved for this project’s data classification, so no key was issued (D17). An empty model list would be every model to the gateway. | Ask a platform administrator to approve a model for this classification in the catalogue. The classification is the newest valid manifest’s, and never less restrictive than production’s release. | startAgentSession | `313075d` |
| `AGENT_SESSION_ALREADY_STARTED` | 409 | This request — its Idempotency-Key — already started an agent session, and its key was answered then. A key is shown once and never again. | Use the key from the first answer. If it was lost, end the session this refusal names (`endAgentSession`) and start another with a new Idempotency-Key. | startAgentSession | `313075d` |
| `APPROVAL_NOT_NEEDED` | 409 | The release serving staging needs no administrator’s approval: one already covers it, or — for an app that has launched — it changes nothing that needs one. The message says which. Nothing was asked. | Nothing to ask for: read the launch checklist (`getLaunchReadiness`) for what is still unmet, and deploy to production once it is ready. | requestApproval | `a1d4baa` |
| `BUILDING_NOT_OPEN` | 403 | Building on Manifest — creating a project or starting an intake session — is open only to faculty members and platform administrators for now, and the signed-in person is neither. Nothing was created. | Read `mayBuild` on `getMe` before offering to build, and tell a person for whom it is false that building is not open to them yet. The affiliation is read at sign-in, so a faculty member refused should sign out and sign in again first; if they still may not build, a platform administrator can help. | startIntakeSession, createProject | `8771272` |
| `CONFIG_FRONTEND_ORIGIN_PORT_MISMATCH` | 409 | MANIFEST_FRONTEND_ORIGIN is a loopback origin naming a port the control plane does not listen on. | The control plane refuses to start until its operator corrects the setting the message names; nothing a client sends changes it. | (none declared — the control plane refusing to start; never answered to a request) | `3c38199` |
| `CONFIG_ORIGINS_SHARE_A_HOST` | 409 | MANIFEST_CONTROL_PLANE_ORIGIN and MANIFEST_FRONTEND_ORIGIN are on one host, so a request could not say which it arrived on. | The control plane refuses to start until its operator corrects the setting the message names; nothing a client sends changes it. | (none declared — the control plane refusing to start; never answered to a request) | `3c38199` |
| `INCIDENT_LOG_CONFIDENTIAL` | 403 | A confidential project’s staging and production Incidents are not answered to a delegated token while the platform lets that project’s building agent use the capable model (§7): their log tails can carry the input of the real people the classification protects, and redaction does not remove names or student numbers. | Read the sandbox’s Incidents instead — its users are test users — or ask the person you work for to read this environment’s Incidents in their own session and tell you, in their own words, what failed — never to paste its log tail or prompt to you, which is what this protects. | listIncidents | `38c2ade` |
| `INSTANCE_OUTPUT_STAGING` | 403 | A staging instance’s output is not readable (§14): staging serves real people — staging CWL holders at UBC — whose input its output can carry. Decided by the environment’s kind, so a laptop’s staging is refused too. | Read a sandbox instance’s output instead — deploy the same release there (`deploy`) to see what it prints — or a failed staging instance’s Incident (`listIncidents`), whose log tail is the only window onto staging. | getInstanceOutput | `bb32fa6` |
| `INTAKE_BUDGET_EXHAUSTED` | 409 | The platform’s monthly intake budget is spent (§10), so describing new apps is paused for everyone until the month resets. It is never charged to a person’s budget instead. | Wait for the month to reset — the first of the month, 00:00 UTC — or ask a platform administrator to raise the intake budget. | startIntakeSession | `3cb6c82` |
| `INTAKE_DAILY_LIMIT_REACHED` | 409 | This person has started the intake sessions a person may start in a day (§10), so describing new apps is paused for them until midnight, Vancouver time. | Try again tomorrow, or create the project now and continue under an agent session (`startAgentSession`), which is charged to the person instead. | startIntakeSession | `3cb6c82` |
| `INTAKE_MODEL_UNAVAILABLE` | 503 | The platform’s intake model is not a catalogue model approved for internal data (D17), so intake is paused rather than sent to another model. | A platform administrator names an intake model the catalogue approves for internal data (`MANIFEST_INTAKE_MODEL`). | startIntakeSession | `3cb6c82` |
| `INTAKE_SESSION_ALREADY_STARTED` | 409 | This request — its Idempotency-Key — already started an intake session, and its key was answered then. A key is shown once and never again. | Use the key from the first answer. If it was lost, end the session this refusal names (`endIntakeSession`) and start another with a new Idempotency-Key. | startIntakeSession | `3cb6c82` |
| `LAUNCH_DRAFT_CHANGED` | 409 | The draft was made again after the one the request names (`draftGeneratedAt`), so what Manifest holds is not what was sent. Nothing was recorded. | Read the current draft (`getLaunchRecords`). If it is what you sent, say so again with its `generatedAt`; if you sent the earlier one, send the current draft instead and say so. | submitIamRegistration, submitPrivacyAssessment | `dec71d8` |
| `LAUNCH_DRAFT_REQUIRED` | 409 | There is no draft of this registration or privacy assessment to have sent: Manifest drafts it, and what a person sends is that draft. | Draft it first (`draftIamRegistration` for a registration, `draftPrivacyAssessment` for the privacy assessment), send the draft to UBC, then say it was sent. Nothing was recorded. | submitIamRegistration, submitPrivacyAssessment | `b2c75e6` |
| `LAUNCH_DRAFT_STALE` | 409 | The registration’s draft does not carry the privacy assessment’s PIA number, which UBC IAM asks for: it was drafted before the assessment was approved with it, or the number has changed since. Nothing was recorded. | Draft the registration again (`draftIamRegistration`) — the new draft carries the PIA number — send that one, then say it was sent. | submitIamRegistration | `dec71d8` |
| `LAUNCH_NOT_CWL` | 409 | The app signs nobody in with CWL — or asks for no attribute, which no registration may — so there is nothing to register with UBC IAM. | An app that signs nobody in needs no registration. To sign people in, set `auth.provider: cwl` and the attributes the app needs in `auth.attributes`, validate the manifest, then draft again. | draftIamRegistration | `6cbb489` |
| `LAUNCH_PIA_NOT_APPROVED` | 409 | Neither registration is sent until the privacy assessment is approved and carries its reference, the PIA number UBC IAM asks for. UBC’s order is the assessment first. | Send the privacy assessment first. Once an administrator records it approved, with its PIA number, send the registration and say so again. | submitIamRegistration | `b2c75e6` |
| `LAUNCH_RECORD_SUBMITTED` | 409 | This record has been sent, and what was sent is kept as it was sent. A registration that is with UBC IAM or registered by it (`submitted` or `active`) is drafted again only once UBC asks for changes or the registration lapses; a privacy assessment that is with the Privacy Office or approved by it (`submitted` or `approved`), only once the Office sends it back. | To change what was sent, ask UBC IAM or the Privacy Office. Once an administrator records that UBC asked for changes (`change_requested`), that the registration lapsed (`expired`), or that the assessment came back (`draft`), draft it again. | draftIamRegistration, draftPrivacyAssessment | `6cbb489` |
| `LAUNCH_SENT_AT_INVALID` | 400 | The day given for when it was sent cannot be true: it is after today in Vancouver, or before the draft that was sent was made. | Give the day you sent it, as YYYY-MM-DD — today or earlier, and not before the draft’s day — or leave it out for today. | submitIamRegistration, submitPrivacyAssessment | `b2c75e6` |
| `LAUNCH_STAGING_NOT_REGISTERED` | 409 | The production registration is sent only once the staging registration is active — registered by UBC IAM, and the app tested at staging. UBC’s order is staging before production. | Send the staging registration first. Once an administrator records it active and you have tested the app at staging, send the production registration and say so again. | submitIamRegistration | `b2c75e6` |
| `MEMBER_MAY_NOT_BUILD` | 409 | The person named may not build on Manifest — only faculty members and platform administrators may, for now — so they cannot be added to a project. The message names them; nobody was added. | Add a faculty colleague instead. A person already on the project keeps their place, and their role can still be changed. | addMember | `8771272` |
| `MEMBER_USER_AMBIGUOUS` | 400 | More than one person who has signed in to Manifest has the email given, so it names nobody in particular. The answer names none of them. | Add the person by their CWL login name (`cwlLogin`) or their PUID (`puid`) instead. | addMember | `e832bd5` |
| `PROJECT_ARCHIVED` | 409 | The project is archived — switched off by its owner (§11) — so it can be read and restored, and nothing else can change. | Restore it (`restoreProject`, the owner or an administrator, in their own session), then deploy to bring it back. A delegated token of an archived project was revoked with it: mint a new one after the restore. | 28 ops: endAgentSession, deploy, setAppSecret, clearAppSecret, getInstanceOutput, confirmPendingAction, rejectPendingAction, updateProject, startAgentSession, startBuild, createCommit, recordIamRegistration, draftIamRegistration, submitIamRegistration, recordPrivacyAssessment, draftPrivacyAssessment, submitPrivacyAssessment, addMember, removeMember, runRehearsal, createRelease, validateSpec, mintToken, createApprovalPreview, getApprovalPreview, requestApproval, approveRelease, rejectRelease | `ce96baa` |
| `PROJECT_LAUNCHED_NOT_DELETABLE` | 409 | The project has been to production, so it cannot be deleted (§11): its data is disposed of under its retention period and UBC’s sunset procedure, which are the Privacy Office’s, and its production name stays held for good (D26). Nothing was destroyed — and nothing was changed, unless the launch completed while the delete was starting, when the app has been switched off (archived) with everything kept. | Archive it instead (`archiveProject`) to switch it off for everyone; its data and records are kept for their retention period. One the delete switched off is restored with `restoreProject`. | deleteProject | `bfae957` |
| `PROJECT_TEARDOWN_INCOMPLETE` | 500 | Switching the project off, or deleting it, stopped at a step (named in the message). It is archived — nothing new starts — but something it ran, or something a delete destroys, may still be there. | Send the same request again: every finished step answers at once, and the rest continue. The control plane’s next boot finishes an archive too — never a delete, which only the same request finishes. If it keeps stopping at the same step, tell a platform administrator. | deleteProject, archiveProject | `ce96baa` |
| `REHEARSAL_RUNNING` | 409 | A rehearsal of this project is already running, so this one was not started and nothing was deployed. | Wait for the running rehearsal to answer — up to about two minutes — then read the launch checklist (`getLaunchReadiness`): its `rehearsal` item says how it went. | runRehearsal | `3333acc` |
| `REHEARSAL_TEARDOWN_FAILED` | 500 | The rehearsal ran, but could not take its production instance down afterwards (the message says what is left), so its result was not recorded. | Run the rehearsal again: it deploys the candidate afresh and takes it down again. If it keeps failing, tell a platform administrator: the control plane’s operator log names the step that failed. | runRehearsal | `3333acc` |
| `RELEASE_REJECTED` | 409 | An administrator did not approve this release, and a rejection is final for the release it was made on; the message carries their reason. Nothing was asked. | Read the administrator’s reason (`getApproval`), change the app, build and release it, deploy that release to staging, and ask for sign-off on it. | requestApproval | `a1d4baa` |

### A6.2 The 16 reworded codes (status unchanged for every one)

| Code | HTTP | What changed | Now (the field that changed) | Declared by (now) | By |
|---|---|---|---|---|---|
| `AI_CATALOGUE_DISABLED` | 503 | remedy: a member removal or token revocation answered this has already happened | **remedy:** Ask an administrator to switch AI on. A build or release can go on without AI: remove `ai.models` from manifest.yaml. A member removal or a token revocation answered this has already happened: repeat it once AI is back on, to end the agent sessions it left. | endAgentSession, startIntakeSession, endIntakeSession, startAgentSession, removeMember, revokeToken | `3333acc` |
| `CSRF_ORIGIN_REFUSED` | 403 | two origins, not the console’s alone | **summary:** A request carrying a session did not come from the origin it was sent to. Each of Manifest’s origins — the console’s, and the faculty front-end’s — takes a session’s request only from itself.<br>**remedy:** Send `Origin` naming the origin the request is sent to — a browser does this itself, and `hint` names it. A session is its own origin’s: one set on the other origin is not a session here. A program that is not a browser sends a delegated token rather than a session cookie; a token needs no Origin. | 34 ops | `8ef685d` |
| `INSTANCE_OUTPUT_PRODUCTION` | 403 | remedy: read a sandbox instance (staging no longer readable) | **remedy:** Read a sandbox instance’s output instead, or a failed production instance’s Incident (`listIncidents`) — its log tail is the only window onto production. | getInstanceOutput | `bb32fa6` |
| `MEMBER_USER_NOT_FOUND` | 400 | by PUID, CWL login name or email | **summary:** Nobody Manifest knows by the PUID, CWL login name or email given has signed in. A CWL login name is known only for a person who has signed in since Manifest began asking CWL for one, so a person who has signed in can still miss by login.<br>**remedy:** Check it. For a CWL login name, add the person by their email or PUID instead; otherwise ask them to sign in to Manifest once with CWL, then add them again. | addMember | `e832bd5`, `3bc386d` |
| `PROJECT_LAST_OWNER` | 409 | also refuses making the last owner a collaborator | **summary:** A project must always have an owner, so the last one cannot be removed or made a collaborator.<br>**remedy:** Make another member an owner first (`addMember` with role `owner`), then remove this one or change their role. | addMember, removeMember | `3bc386d` |
| `RELEASE_DIGEST_NOT_APPROVED` | 409 | remedy names `requestApproval` and the queue | **remedy:** Ask an administrator to approve this release (`requestApproval`) — the request waits in their queue — then deploy again. A rejected release stays rejected: build and release a new one. | deploy | `a1d4baa` |
| `RELEASE_NOT_STAGED` | 409 | also refuses asking for sign-off on any release but staging’s | **summary:** Only the release serving staging may go to production, or be asked about for sign-off — production runs exactly what staging ran; the body carries the LaunchReadiness of the one that is.<br>**remedy:** Deploy this release to staging first and let it become healthy — or name the release serving staging (`candidateReleaseId` in the body): deploy that one to production, or ask for sign-off on it. | deploy, requestApproval | `a230c1a` |
| `RELEASE_REESCALATED` | 409 | remedy names `requestApproval` and the queue | **remedy:** Ask an administrator to approve this release (`requestApproval`) — the request waits in their queue — then deploy again once they have. | deploy | `a1d4baa` |
| `SLUG_INVALID` | 400 | slug for name | **summary:** The slug breaks §7’s rule for slugs.<br>**remedy:** Choose a slug of 3 to 39 lower-case letters, digits and hyphens that starts with a letter. `checkSlug` checks one without creating anything. | createProject | `c90f571` |
| `SLUG_RESERVED` | 409 | slug for name | **summary:** The slug is one of §23’s reserved labels; the message says what it stands for.<br>**remedy:** Choose another slug. `checkSlug` says whether one is free. | createProject | `c90f571` |
| `SLUG_TAKEN` | 409 | slug for name | **summary:** Another project holds the slug.<br>**remedy:** Choose another slug. `checkSlug` says whether one is free. | createProject | `c90f571` |
| `SOURCE_INVALID_SLUG` | 409 | slug for name | **remedy:** Choose a slug that follows §23’s rule; `checkSlug` checks one. | (none) | `8ef685d` |
| `SOURCE_PROVIDER_MISMATCH` | 409 | also the same GitHub driver against another GitHub (`MANIFEST_GITHUB_API_URL`) | **summary:** The project’s repository was not made by the source driver this control plane runs: either a different driver made it (driver 1’s local repository, or driver 2’s GitHub one), or the same GitHub driver made it against another GitHub — the fake or the real App, told apart by the API host recorded when the repository was made (one recorded before Manifest kept that host is answered by whichever GitHub is running); the message names both the driver or host that made it and the one running.<br>**remedy:** Use a control plane running the project’s own driver, and for driver 2 the same GitHub (`MANIFEST_GITHUB_API_URL`): a project stays with the driver, and the GitHub, that created its repository. | deleteProject, startBuild, listCommits, createCommit, getCommit, getFile, draftIamRegistration, draftPrivacyAssessment, validateSpec, getTree, createApprovalPreview | `d894b8e`, `4bac1cf` |
| `SOURCE_REPOSITORY_EXISTS` | 409 | slug for name | **remedy:** Choose another slug. A leftover repository of that name is removed by whoever owns it; Manifest will not take it over. | createProject | `8ef685d` |
| `TOKEN_CAPABILITY_FORBIDDEN` | 400 | "a person-only one" (no longer "one of its two") | **summary:** A mint asked for one of D24’s four privileged capabilities, or for a person-only one; the message names which. | mintToken | `fa02bbc` |
| `TOKEN_PERSON_ONLY` | 403 | lists the new person-only actions | **summary:** A delegated token asked for a person-only action (D24) — approving a release, recording UBC’s IAM or privacy decision, saying a request to UBC IAM or the Privacy Office was sent, running the pre-production rehearsal, or switching an app off, bringing it back or deleting it. Refused outright; no pending action is created. | (none) | `fa02bbc`, `b2c75e6` |

### A6.3 Existing codes that more (or fewer) operations now declare

Beyond the new operations' own lists (§A3), which declare the usual framework codes (`CSRF_ORIGIN_REFUSED`, `IDEMPOTENCY_KEY_*`, `INTERNAL`, `NOT_FOUND`, `RATE_LIMITED`, `REQUEST_*`, `UNAUTHENTICATED`) as every operation of their kind does, these declarations changed on operations that existed at `186fa34`:

- `AI_CATALOGUE_DISABLED`: now declared by `removeMember`, `revokeToken`
- `FORBIDDEN`: **no longer** by `runRehearsal`
- `PROJECT_LAST_OWNER`: now declared by `addMember`
- `STEP_UP_REQUIRED`: now declared by `runRehearsal`
- `PROJECT_ARCHIVED` (new, §A6.1) is declared by 28 operations — 23 existing ones from `16c3357`, and 5 of the new ones.

**Checks.** No code changed its status. The 25 spec problem codes (`x-manifest-spec-errors`) are identical at both revisions,
word for word. At both revisions every `ErrorCode` `x-enumDescriptions` entry equals that code's `summary`, and the enum, the
descriptions and `x-manifest-errors` name the same set.

**The 39 codes declared by no operation.**

- **Same as the digest's §5 list:**
  - `CREDENTIAL_AMBIGUOUS` and `ROUTE_NOT_FOUND` (any request);
  - `TOKEN_PERSON_ONLY`;
  - `SAML_*` (7);
  - `WEBHOOK_*` (4) and `WEBHOOKS_NOT_CONFIGURED`;
  - the seven `RELEASE_*`/`SOURCE_*` driver faults.
- **Changed:**
  - **`CONFIG_*` (9, was 7)**, with the two new origin codes.
  - **`AI_*` (8, was 9)**: `AI_CATALOGUE_DISABLED` is now declared by `startAgentSession`, `endAgentSession`,
    `startIntakeSession`, `endIntakeSession`, `removeMember` and `revokeToken`.

## A7. Component schemas: the new and the changed

15 new: `AgentBudget`, `AgentSession`, `AgentSessionList`, `AgentSessionStarted`, `ApprovalRequest`, `DeletedProject`, `IntakeSession`, `IntakeSessionStarted`, `PrivacyAssessmentDraft`, `Queue`, `QueueItem`, `RegistrationPackage`, `RequestApprovalRequest`, `StartAgentSessionRequest`, `SubmitLaunchRecordRequest`. None removed. Changed, besides `ErrorCode` (+29 values, §A6) and `EventFrame` (+14 variants, §A5): listed in §A7.2.

### A7.1 The new schemas, field by field (Appendix A's format, generated from the contract)

#### `AgentBudget` *(landed `313075d`)*

The agent budget of the person a credential acts for — a delegated token’s minter.

- `monthlyUsd`: number — Your monthly budget for agent sessions, in US dollars, across every project.
- `spentUsd`: number \| null — This month’s spend across every session of yours, or null when the model gateway did not answer — never 0 for "unknown".
- `remainingUsd`: number \| null — What is left this month; null when `spentUsd` is.
- `resetsAt`: string (date-time) \| null — When the month resets — the first of the next month, 00:00 UTC — or null before your first session.
- `unavailable`: string \| null — Why `spentUsd` is null, when it is.

#### `AgentSession` *(landed `313075d`)*

One agent’s model session: its key’s bounds, and what it has spent.

- `id`: string (uuid) — The session — what `endAgentSession` names.
- `projectId`: string (uuid) — The one project its agent works on.
- `name`: string — The label it was started with.
- `person`: object — Who the session works for, and is charged to.
  - `id`: string (uuid) — Their user id.
  - `name`: string — Their display name.
- `via`: object \| null — The delegated token that started it; null when a person started it in their session.
  - `tokenId`: string (uuid) — The token — `listTokens` names it.
  - `tokenName`: string — The label its minter gave it.
- `models`: string[] — The logical models the key may call — the ones the project’s data classification allows (D17), and never fewer restrictions than production’s release has. When the project stops allowing some of them, the key loses those at once and keeps the rest (`agent_session.narrowed`), and this list is what it holds now.
- `capUsd`: number — The most the key may spend, in US dollars. The gateway refuses it past this.
- `expiresAt`: string (date-time) — When the key stops working, whatever anybody does — the gateway enforces it.
- `state`: "active" \| "ended" \| "expired" — `expired` is read from `expiresAt`: the key stopped working then, whether or not anybody ended it.
- `endedAt`: string (date-time) \| null — When it was ended; null while it has not been.
- `endReason`: "ended" \| "token_revoked" \| "project_archived" \| "project_deleted" \| "models_withdrawn" \| "member_removed" \| null — Why it ended: `endAgentSession`, the token that started it revoked, its project switched off or deleted, `models_withdrawn` — its project no longer allows any of the models it held (its data classification was raised, or the platform now keeps a confidential project’s building agent on-premise); a session that keeps any model it may still use is narrowed instead, and goes on — or `member_removed`: the person it works for was taken off the project. Null while it has not been ended; a session that ran out of time or money is never ended by that.
- `spentUsd`: number \| null — What this session’s key has spent, in US dollars — for an ended session, what the gateway had recorded when it ended (a call in its last seconds may not be counted). Null, never 0, when it is not known: `spentUnavailable` says why.
- `spentUnavailable`: string \| null — Why `spentUsd` is null, when it is.
- `createdAt`: string (date-time) — When it was started.

#### `AgentSessionList` *(landed `313075d`)*

A project’s agent sessions.

- `sessions`: `AgentSession`[] — The project’s agent sessions, newest first — ended and expired ones included; at most 50.
- `truncated`: boolean — Whether there were more than the 50 answered.

#### `AgentSessionStarted` *(landed `313075d`)*

A started session, and its key — the only time the key exists outside the gateway.

- `session`: `AgentSession`
- `key`: string — THE MODEL KEY. Shown in this answer and never again — Manifest keeps no copy. Send it as `Authorization: Bearer <key>` to `baseUrl`. It calls models, and nothing else: it is not a Manifest credential.
- `baseUrl`: string (uri) — Where the key is used: an OpenAI-compatible API (`/chat/completions`, `/embeddings`, `/models`).

#### `ApprovalRequest` *(landed `a1d4baa`)*

A request that an administrator sign off the release serving staging for production. One per release: asking again answers this one.

- `id`: string (uuid) — The request.
- `releaseId`: string (uuid) — The release an administrator is asked to approve for production — the one serving staging when it was asked.
- `projectId`: string (uuid) — Its project.
- `requestedBy`: object — Who asked: the person — also when an agent asked on their token.
  - `id`: string (uuid) — Their user id.
  - `displayName`: string — Their name.
- `viaToken`: object \| null — The token an agent asked on; null when the person asked in their own session.
  - `id`: string (uuid) — The token.
  - `name`: string — Its name, as its person gave it.
- `createdAt`: string (date-time) — When it was asked — what the administrators’ queue measures its wait from.
- `open`: boolean — Whether it waits on an administrator now: until one approves or rejects the release, and while the release serves staging — closed while another release does, and waiting again if this one serves staging again.

#### `DeletedProject` *(landed `bfae957`)*

A deleted project (§11): what remains of it — the record its audit trail refers to.

- `id`: string (uuid) — The project that was deleted. Every route answers it `404` from now on.
- `slug`: string — Its permanent identifier — now FREE: another project may be created with it (§11).
- `state`: "deleted" (const) — §11: `deleted` — its repository, every data volume, every secret and its model budgets destroyed. Its record and its audit trail remain.
- `deletedAt`: string (date-time) — When it was deleted.

#### `IntakeSession` *(landed `3cb6c82`)*

One intake session: a model key for describing an app, before the app exists.

- `id`: string (uuid) — The intake session — what `endIntakeSession` names.
- `model`: string — The ONE logical model its key may call — the platform’s intake model, the same for everyone.
- `capUsd`: number — The most the key may spend, in US dollars — the platform’s money, not yours.
- `expiresAt`: string (date-time) — When the key stops working, whatever anybody does: 30 minutes by default, and never past your signed-in session.
- `state`: "active" \| "ended" \| "expired" — `expired` is read from `expiresAt`: the key stopped working then.
- `endedAt`: string (date-time) \| null — When it was ended; null while it has not been.
- `createdAt`: string (date-time) — When it was started.

#### `IntakeSessionStarted` *(landed `3cb6c82`)*

A started intake session, and its key — the only time the key exists outside the gateway.

- `session`: `IntakeSession`
- `key`: string — THE MODEL KEY. Shown in this answer and never again — Manifest keeps no copy. Send it as `Authorization: Bearer <key>` to `baseUrl`, naming `session.model`. It calls that model and nothing else, and it is not a Manifest credential.
- `baseUrl`: string (uri) — Where the key is used: an OpenAI-compatible API (`/chat/completions`, `/embeddings`, `/models`).

#### `PrivacyAssessmentDraft` *(landed `81892d4`)*

What a person completes and sends UBC’s Privacy Office: what the app collects, where it is stored and where it flows, how long it is kept, who is accountable and where it is hosted — each as facts with their source, and the gaps only the owner can fill.

- `project`: object — The app this assesses.
  - `slug`: string — The app’s address name.
  - `name`: string — The app’s name, as it was when this was drafted.
- `generatedAt`: string (date-time) — When Manifest drafted it. The day a person says they sent it can be no earlier.
- `fromCommit`: string — The commit whose `manifest.yaml` it was drawn from: the release serving staging — or, while nothing serves staging, the newest valid manifest.
- `sections`: object[] — The six questions, in the order the Privacy Office reads them.
  - `id`: "collected" \| "stored" \| "flows" \| "retention" \| "accountable" \| "hosting" — Which question it answers — stable, for a client to switch on: what personal information is collected, where it is stored, where it flows, how long it is kept, who is accountable, and where it is hosted.
  - `title`: string — The question, for a person.
  - `facts`: object[] — What Manifest knows, in order.
    - `label`: string — What the fact is about.
    - `value`: string — The fact, as a sentence.
    - `source`: string — Where Manifest read it — a field of `manifest.yaml`, the model catalogue, the project’s members.
  - `gaps`: string[] — What Manifest cannot know, for the owner to add before sending — what the app keeps in its own database, where UBC will host it. Empty when there is nothing.
- `warnings`: string[] — What to know before sending it — a draft drawn without a release serving staging. Empty when there is nothing.
- `text`: string — The whole draft as plain text — every fact with where it came from, and every gap — for the owner to paste into the Privacy Office’s form.

#### `Queue` *(landed `a1d4baa`)*

Everything waiting on a platform administrator, oldest first: a release someone asked them to sign off, and the registrations and privacy assessments with UBC whose answers they record. Only switched-on projects: an archived project’s records cannot be acted on until it is restored, and come back with it.

- `items`: `QueueItem`[] — Everything waiting, oldest first — at most 200.
- `oldestSince`: string (date-time) \| null — When the oldest item began waiting — the queue’s headline: a queue that is long is working, and one that is old is not. Null when nothing waits.
- `truncated`: boolean — True when more than 200 wait, and only the oldest are here.

#### `QueueItem` *(landed `a1d4baa`)*

One thing waiting on a platform administrator.

- `kind`: "release-approval" \| "iam-registration" \| "iam-change-request" \| "privacy-assessment" — What waits: `release-approval` — someone asked for the release serving staging to be approved (`requestApproval`); `iam-registration` — a registration sent to UBC IAM, whose answer an administrator records; `iam-change-request` — a change request an administrator filed with UBC IAM; `privacy-assessment` — an assessment sent to the Privacy Office, whose answer an administrator records.
- `project`: object — The app it is about.
  - `id`: string (uuid) — The project.
  - `slug`: string — Its slug, which its hostnames are made from.
  - `name`: string — Its name, as its owner gave it.
- `subjectId`: string (uuid) — What it is about: the release for `release-approval`, the registration or the assessment otherwise.
- `environment`: "staging" \| "production" \| null — Which registration, for a registration’s item; null otherwise.
- `requestedBy`: object \| null — Who asked, or who said it was sent; null when nobody was recorded doing so.
  - `id`: string (uuid) — Their user id.
  - `displayName`: string — Their name.
- `since`: string (date-time) — Since when it has waited: when it was asked for, or when it was sent to UBC.
- `summary`: string — What waits, in one sentence for a person.
- `note`: string \| null — What the person who asked for sign-off wrote to the administrators; null for anything else, or when they wrote nothing.

#### `RegistrationPackage` *(landed `6cbb489`)*

What a person sends UBC IAM to register one environment of a CWL app: its entity and addresses, the certificate it signs with, every attribute it asks for with why, the contacts and the PIA number — and the metadata, built from the same values.

- `environment`: "staging" \| "production" — Which registration this package is for.
- `generatedAt`: string (date-time) — When Manifest drafted it. The day a person says they sent it can be no earlier.
- `fromCommit`: string — The commit whose `manifest.yaml` and code it was drawn from: for production, the release serving staging; for staging — or for production while nothing serves staging — the newest valid manifest.
- `entityId`: string — The Service Provider’s entity ID for this environment, derived by Manifest and fixed once registered.
- `acsUrl`: string — Where sign-ins are sent — the app’s callback path on this environment’s hostname.
- `sloUrl`: string — Where sign-outs are sent — the app’s logout path on this hostname.
- `certificate`: object — The certificate Manifest issued for this environment — the same one the environment’s deploys register.
  - `pem`: string — The certificate the app signs with in this environment, as PEM. Never a private key: the key stays with Manifest.
  - `fingerprint`: string — Its SHA-256 fingerprint, colon-separated.
  - `expiresAt`: string (date-time) — When it expires.
- `attributes`: object[] — Every attribute the app asks for, in `auth.attributes` order.
  - `name`: string — The attribute’s friendly name, as `auth.attributes` lists it.
  - `oid`: string — Its OID, as UBC releases it.
  - `purpose`: string — What it is for, in one plain sentence.
  - `usedAt`: object[] — Every line of the app’s code Manifest found reading it, as a property — a hint for the reviewer, never a proof. Empty when none was found.
    - `path`: string — A file of the app, from its repository’s root.
    - `line`: integer — The line, counting from 1.
  - `justification`: string — Why the app needs it — its purpose and where the app reads it — or, when nothing reads it, that it should be removed before sending.
  - `unused`: boolean — True when the app asks for it and Manifest found nothing reading it: remove it from `auth.attributes` before you send this.
- `usedAtTruncated`: boolean — True when Manifest read only part of the app’s code (at most 200 files and 2 MiB of text): a line elsewhere is not shown.
- `contacts`: object — Who UBC IAM may write to.
  - `technical`: object[] — The project’s owners, then its collaborators.
    - `name`: string — Their name.
    - `email`: string — Their address.
  - `support`: object[] — The platform’s contacts — as configured, or else its longest-serving administrator.
    - `name`: string — Their name.
    - `email`: string — Their address.
- `privacyAssessmentReference`: string \| null — The privacy assessment’s PIA number, which UBC IAM asks for — null until the assessment is recorded approved with it.
- `metadataXml`: string — The SAML metadata for the request, in the structure UBC’s own metadata generator produces, with these values.
- `warnings`: string[] — What to fix or know before sending it — an attribute nothing reads, a missing PIA number, a package drawn without a release serving staging. Empty when there is nothing.

#### `RequestApprovalRequest` *(landed `a1d4baa`)*

Asking an administrator to sign off the release serving staging.

- `note`: string [maxLen 500] *(optional)* — Anything the administrators should know — a date the app is needed by, say. Shown to administrators in their queue, and to nobody else; never in an event.

#### `StartAgentSessionRequest` *(landed `313075d`)*

What an agent session is for, and — optionally — less than the platform’s cap or life.

- `name`: string [minLen 1, maxLen 64] — A label a person reads in the list of sessions — the task the agent is on.
- `capUsd`: number [min 0.000001, max 1000] *(optional)* — The most this session may spend, in US dollars: the platform’s session cap when absent — and never more than it, nor than what remains of your month.
- `durationMinutes`: integer [min 1, max 480] *(optional)* — How long the key lives: 60 minutes by default, at most 480 — and never past the expiry of the credential that asks (a delegated token, or your signed-in session).

#### `SubmitLaunchRecordRequest` *(landed `b2c75e6`)*

That a request to UBC was sent: the day, its reference if there is one, and which draft was sent.

- `sentAt`: string (date) *(optional)* — The day it was sent, `YYYY-MM-DD` — today or earlier, and not before the draft was made. Today in Vancouver when absent.
- `reference`: string [minLen 1, maxLen 128] *(optional)* — UBC’s reference for the request, when you have one yet.
- `draftGeneratedAt`: string (date-time) *(optional)* — The `generatedAt` of the draft you sent, as you read it. If it has been drafted again since, the request is refused `409 LAUNCH_DRAFT_CHANGED` rather than recording a draft you never saw. Send it whenever you show a person the draft they send.

### A7.2 The changed schemas, as a diff (`+` added, `−` removed, `~` changed; generated)

- **`AddMemberRequest`**
  - ~ description → *"Who to add, and as what — the person by EXACTLY ONE of their PUID, CWL login name or email. They must have signed in to Manifest once. Adding someone who is already a member changes their role."*
  - + `cwlLogin`: string [minLen 1, maxLen 64] *(optional)* — The person’s CWL login name, as they type it to sign in — matched whatever its case.
  - + `email`: string (email) [maxLen 254] *(optional)* — The person’s email address, as UBC releases it — matched whatever its case. Two people sharing one address is `MEMBER_USER_AMBIGUOUS`; add them by CWL login name instead.
  - ~ `puid` now optional
  - ~ `puid` description → *"The person’s ubcEduCwlPuid."*
- **`CreateProjectRequest`**
  - ~ `name` description → *"What people call the project — `ProjectName`’s rules. The slug, when none is given; `updateProject` changes it later."*
- **`CreatedProject`**
  - + `state`: "active" \| "archived" — §11: `active`, or `archived` — switched off by its owner (`archiveProject`): each of its names answers a page saying so, nothing runs, and its code, data, secrets and records are kept. An archived project can be read and restored (`restoreProject`), and nothing else: every change is refused `409 PROJECT_ARCHIVED`.
  - + `archivedAt`: string (date-time) \| null — When it was last switched off; null if it never was. Kept through a restore.
  - ~ `name` description → *"What people call the project — text of 1 to 80 characters, trimmed, on one line, with something visible in it; no control character, line separator or bidirectional mark. Never part of an address: the slug is."*
- **`Fleet`**
  - + `[].name`: string — Its name, as its owner gave it.
  - + `[].state`: "active" \| "archived" — Whether it is switched on: `archived` is switched off by its owner, its environments taken down and restorable — not broken.
  - + `[].archivedAt`: string (date-time) \| null — When it was last archived — kept through a restore, so it says the project once was. Null if it never has been.
  - ~ `[].slug` description → *"Its slug (§23), which its hostnames are made from."*
- **`IamRegistration`**
  - ~ description → *"One of the app’s two UBC IAM registrations, staging’s or production’s: what Manifest drafted, when a person said it was sent, and what UBC IAM registered, as an administrator recorded it."*
  - + `environment`: "staging" \| "production" — Which registration: the staging one, sent second, or production’s, sent last. A project has at most one of each.
  - + `changeRequestedFrom`: "submitted" \| "active" \| null — While `change_requested`, where it came from: `submitted` — UBC IAM came back with questions, so the next move is the owner’s (answer them, draft again, send it); `active` — an administrator filed a change request with UBC IAM, which UBC now holds. Null in any other state.
  - + `submittedAt`: string (date-time) \| null — When the request now with UBC IAM was sent — the day a person said it went, at noon in Vancouver, or when an administrator recorded it sent. How long it has waited is measured from here. Null until it is sent.
  - + `submittedBy`: object \| null — Who said it was sent; null until it is.
  - + `submittedBy.id`: string (uuid) — Their user id.
  - + `submittedBy.displayName`: string — Their name, as CWL gave it.
  - + `package`: `RegistrationPackage` \| null — What Manifest drafted for the person to send (`draftIamRegistration`), kept as it was sent once it is; null until drafted.
  - + `createdAt`: string (date-time) — When the record was first written.
  - ~ `registeredAttributes` description → *"What UBC IAM registered; empty until it has registered something. Builds are checked against the PRODUCTION registration’s list once UBC has registered it (`registeredAt` set): a build that asks for an attribute not in it fails. The staging registration’s list, and one not yet registered, gate no build. Once registered, it changes only on a record that reaches `active` — a change UBC has not registered yet is `requestedAttributes`."*
- **`Incident`**
  - ~ `prompt` description → *"§14: shaped to be handed straight to an agent as a repair request — except a `confidential` project’s staging or production Incident while its building agent may use the capable model: it carries the log tail, which a delegated token is refused (`INCIDENT_LOG_CONFIDENTIAL`), so show it to the person and never hand it to a model."*
- **`Instance`**
  - + `createdAt`: string (date-time) — When the deploy made it — never null, and fixed for the instance’s life. Unlike `lastSeenAt` it is set for an instance that never started, so a newer attempt is always newer, whatever order the list is in. An instance from before the platform recorded this reads as old as its release.
  - ~ `lastSeenAt` description → *"When the platform last saw it running; null before it started. The list is ordered by this, so it says nothing of how old an instance is (`createdAt`)."*
- **`InstanceList`**
  - ~ description → *"An environment’s instances (§11), the one seen most recently first; `createdAt` says which attempt is newest."*
- **`InstanceOutput`**
  - ~ description → *"A running instance’s recent output (§14): read on request, never streamed, never stored — in the sandbox only."*
  - ~ `environmentKind` description → *"Only a sandbox instance’s output is readable (§14): a staging instance is refused `INSTANCE_OUTPUT_STAGING`, so this reads `sandbox`. `staging` stays in the list so a client written against an earlier version still compiles."*
- **`InstanceSummary`**
  - + `createdAt`: string (date-time) — When the deploy made it — never null, and fixed for the instance’s life. Unlike `lastSeenAt` it is set for an instance that never started, so a newer attempt is always newer, whatever order the list is in. An instance from before the platform recorded this reads as old as its release.
  - ~ `lastSeenAt` description → *"When the platform last saw it running; null before it started. The list is ordered by this, so it says nothing of how old an instance is (`createdAt`)."*
- **`LaunchReadinessItem`**
  - + `since`: string (date-time) \| null — When the item’s current state began, when Manifest knows it: while a registration or the privacy assessment waits on UBC, the day it was said to be sent; while the release waits on an administrator’s approval someone asked for (`requestApproval`), when they asked; once met, the day UBC registered it or the Privacy Office approved it. Null otherwise. Read it as “waiting since” or “met since”.
- **`LaunchRecords`**
  - ~ description → *"The three records a first production launch waits on, in the order UBC works through them: the privacy assessment, the staging registration, then production’s."*
  - + `stagingRegistration`: `IamRegistration` \| null — The STAGING registration — sent after the privacy assessment is approved, and before production’s; null until it is drafted or recorded.
  - ~ `iamRegistration` description → *"The PRODUCTION registration; null until it is drafted or recorded."*
  - ~ `privacyAssessment` description → *"The privacy assessment; null until it is drafted or recorded."*
- **`Me`**
  - + `mayBuild`: boolean — Whether this person may build: create a project, start an intake session, or be added to a project. True for a faculty member — by the CWL affiliation their last sign-in carried — and for a platform administrator; false for everyone else, who should be told that building is not open to them yet. The three operations refuse such a person `BUILDING_NOT_OPEN`, or `MEMBER_MAY_NOT_BUILD` when they are the person being added. A person who stops being faculty keeps the projects they are on.
- **`Member`**
  - + `cwlLogin`: string \| null — Their CWL login name, lowercased, as they last signed in with it (§9) — what a colleague adds them by. Null if CWL has never released it.
  - ~ `puid` description → *"Their ubcEduCwlPuid (§9) — the one key a person is identified by."*
- **`MintTokenRequest`**
  - ~ `capabilities` type: ("project:read" \| "project:write" \| "project:delete" \| "source:write" \| "secret:write" \| "output:read" \| "members:manage" \| "build:create" \| "release:create" \| "release:deploy" \| "release:promote" \| "release:approve" \| "launch:record" \| "quota:set" \| "secret:read")[] [minItems 1] → ("project:read" \| "project:write" \| "project:delete" \| "source:write" \| "secret:write" \| "output:read" \| "agent:session" \| "members:manage" \| "build:create" \| "release:create" \| "release:deploy" \| "release:promote" \| "release:approve" \| "launch:record" \| "launch:rehearse" \| "launch:submit" \| "launch:draft" \| "approval:request" \| "quota:set" \| "secret:read")[] [minItems 1]
  - ~ `capabilities` description → *"The explicit set this token may use (D24). None of members:manage, release:promote, quota:set or secret:read: those are refused to a delegated token however it was minted. Nor release:approve, launch:record, launch:submit, launch:rehearse or project:delete, which are person-only and refused outright."*
- **`PrivacyAssessment`**
  - ~ description → *"The app’s privacy impact assessment: when a person said it was sent, and what UBC’s Privacy Office said, as an administrator recorded it. It comes first: the staging registration waits for its approval."*
  - + `submittedAt`: string (date-time) \| null — When the assessment was sent to the Privacy Office — the day a person said it went, at noon in Vancouver, or when an administrator recorded it sent. Null until it is sent.
  - + `submittedBy`: object \| null — Who said it was sent; null until it is.
  - + `submittedBy.id`: string (uuid) — Their user id.
  - + `submittedBy.displayName`: string — Their name, as CWL gave it.
  - + `draft`: `PrivacyAssessmentDraft` \| null — What Manifest drafted for the person to complete and send (`draftPrivacyAssessment`), kept as it was sent once it is; null until drafted.
  - + `createdAt`: string (date-time) — When the record was first written.
  - ~ `externalTicketRef` description → *"The Privacy Office’s own reference — the PIA number, which the staging registration needs before it is sent; null when none was recorded."*
- **`Project`**
  - + `state`: "active" \| "archived" — §11: `active`, or `archived` — switched off by its owner (`archiveProject`): each of its names answers a page saying so, nothing runs, and its code, data, secrets and records are kept. An archived project can be read and restored (`restoreProject`), and nothing else: every change is refused `409 PROJECT_ARCHIVED`.
  - + `archivedAt`: string (date-time) \| null — When it was last switched off; null if it never was. Kept through a restore.
  - ~ `name` description → *"What people call the project — text of 1 to 80 characters, trimmed, on one line, with something visible in it; no control character, line separator or bidirectional mark. Never part of an address: the slug is."*
- **`RecordIamRegistrationRequest`**
  - ~ description → *"What UBC IAM registered for the app’s staging or production sign-in, as an administrator records it from the ticket. UBC’s answer is recorded whatever order it arrives in."*
  - + `environment`: "staging" \| "production" *(optional)* — Which registration this records; production’s when absent.
- **`SlugCheck`**
  - ~ `slug` description → *"The slug checked, as sent."*
- **`UpdateProjectRequest`**
  - ~ `name` description → *"What people call the project — text of 1 to 80 characters, trimmed, on one line, with something visible in it; no control character, line separator or bidirectional mark. Never part of an address: the slug is."*

**Not changed:** `ManifestYaml`, `Release`, `Build`, `Rehearsal`, `PendingAction`, `Token`, `LaunchReadiness` (only its item
gained `since`), `Approval*`, `Environment`, the stream's `StreamFrame`/`LogFrame`/`ControlFrame`, and every other schema not
listed above. `PendingAction` still names its `tokenId` and not the token's name, and `Release.createdBy` is still a bare user
id.

**A dangling reference.** `CreateProjectRequest.name`'s description now says *"`ProjectName`’s rules"*, but the document
publishes no `ProjectName` schema. It is a zod constant in `packages/control-plane/src/api/representations/projects.ts`, and
the rules are the ones `Project.name`'s description states (1–80 characters, trimmed, one line, something visible, no control
character, line separator or bidirectional mark).

### A7.3 For a faculty UI: what each new or changed field is (the digest's §6 classification, extended)

**The rule is the digest's, and C3's:** a faculty member is never shown infrastructure, and never a platform state name.

- **Human**: show it as it is, after formatting a date or an amount.
- **Translate**: the value is machinery (an enum, a flag, a platform state name), but the meaning goes on screen in the UI's
  own words.
- **Machinery**: never shown. Use it for joins and logic.

**Bold** marks a credential, which must never be shown, stored or logged.

| Schema | Human (show) | Translate (enum/flag → our words) | Machinery (never show) |
|---|---|---|---|
| `Me` (changed) | — | `mayBuild` (`false` ⇒ "building isn't open to you yet"; decide from nothing else) | — |
| `Member` (changed) | `cwlLogin` (what a colleague adds them by; null when CWL never released it) | — | — |
| `AddMemberRequest` (changed) | inputs `cwlLogin` or `email`, what a person types | `role` | `puid` (now optional; never ask a person for it) |
| `Project` / `CreatedProject` (changed) | `archivedAt` | `state` (`archived` ⇒ "switched off"; never the word *archived* as a platform state) | — |
| `Fleet` (administrators; changed) | `name` | `state` | — |
| `Instance` / `InstanceSummary` (changed) | `createdAt`, which orders attempts ("the last attempt") | — | — |
| `InstanceOutput` (changed) | — | — | everything, as before: raw app output; now sandbox only |
| `Incident` (changed) | — | — | `prompt`. Also: for a `confidential` project's staging or production Incident, never hand it to a model (its description) |
| `LaunchReadinessItem` (changed) | `since` ("waiting since" / "met since"; count Vancouver days, never `now − since`, because a same-day value is noon in Vancouver) | — | — |
| `LaunchRecords` (changed) | — | `stagingRegistration == null` ⇒ "not started" | — |
| `IamRegistration` (changed; mostly an administrator's record) | `submittedAt`, `submittedBy.displayName`, `createdAt`, `externalTicketRef` (UBC's ticket) | `environment`, `state`, `changeRequestedFrom` (`submitted` ⇒ "UBC IAM has questions for you"; `active` ⇒ "a change is with UBC IAM") | `submittedBy.id`; `package` (below); the digest's list (`entityId`, `acsUrl`, `sloUrl`, `certFingerprint`, attribute names…) |
| `PrivacyAssessment` (changed) | `submittedAt`, `submittedBy.displayName`, `createdAt`, `externalTicketRef` (the PIA number) | `state` | `submittedBy.id`; `draft` (below) |
| `RegistrationPackage` (new). What the owner **sends** to UBC IAM: hand it over whole (copy or download), and never render its machinery inline | `attributes[].purpose`, `attributes[].justification`, `contacts.technical[]`/`support[]` `name` and `email`, `generatedAt`, `privacyAssessmentReference` (the PIA number), `warnings[]` (platform prose that can name attributes) | `environment`, `attributes[].unused` ("nothing in your app reads this — take it out before sending"), `usedAtTruncated` | `entityId`, `acsUrl`, `sloUrl`, `certificate.pem`/`fingerprint`/`expiresAt`, `attributes[].name` (CWL attribute names such as `ubcEduCwlPuid`), `attributes[].oid`, `attributes[].usedAt[]` (file paths and lines), `fromCommit`, `metadataXml` |
| `PrivacyAssessmentDraft` (new). The document the owner completes and sends | `project.name`, `generatedAt`, `sections[].title`, `sections[].facts[].label`/`value`, `sections[].gaps[]`, `warnings[]`, `text` (the whole, to paste). All platform prose: check it for manifest field names before showing it | `sections[].id` (the key for our own copy) | `project.slug`, `fromCommit`, `sections[].facts[].source` (manifest fields, the model catalogue) |
| `AgentBudget` (new) | `monthlyUsd`, `spentUsd`, `remainingUsd` (money), `resetsAt` | `spentUsd == null` ⇒ "we can't say just now" (never 0) | `unavailable` (the gateway's reason) |
| `AgentSession` / `AgentSessionList` (new) | `name` (the task's label), `person.name`, `via.tokenName` (the agent's label), `capUsd`, `spentUsd`, `createdAt`, `expiresAt`, `endedAt` | `state`, `endReason`, `truncated` | `id`, `projectId`, `person.id`, `via.tokenId`, `models` (model names are infrastructure), `spentUnavailable` |
| `AgentSessionStarted` (new) | — | — | **`key`**, `baseUrl`; `session` as above |
| `IntakeSession` / `IntakeSessionStarted` (new) | — | `state` | `id`, `model`, `capUsd` (the platform's money, not the person's), `expiresAt`, `endedAt`, `createdAt`; **`key`**, `baseUrl` |
| `DeletedProject` (new) | `deletedAt` | `state` (`"deleted"`) | `id`; `slug` only as a web address (now free) |
| `ApprovalRequest` (new) | `requestedBy.displayName`, `viaToken.name` (the agent's label), `createdAt` | `open` ("waiting for sign-off") | `id`, `releaseId`, `projectId`, `requestedBy.id`, `viaToken.id` |
| `Queue` / `QueueItem` (new; administrators' screen) | `items[].project.name`, `items[].requestedBy.displayName`, `items[].since`, `items[].summary` (a sentence for a person), `items[].note` (the asker's own words), `oldestSince` | `items[].kind`, `items[].environment`, `truncated` | `items[].project.id`, `items[].project.slug`, `items[].subjectId`, `items[].requestedBy.id` |
| `StartAgentSessionRequest` (new) | input `name` | — | `capUsd`, `durationMinutes` (our server's choices) |
| `SubmitLaunchRecordRequest` (new) | inputs `sentAt` (a day) and `reference` (UBC's reference) | — | `draftGeneratedAt` (echo the draft the person read; always send it) |
| `RequestApprovalRequest` (new) | input `note` (administrators see it; it is never in an event) | — | — |
| `MintTokenRequest` (changed) | — | — | the five new capability strings |
| Stream `EventFrame`, the 14 new types | `humanMessage`, with the digest's §6.1 caveats. New machinery in sentences: `{slug}` (`sso.deregistered`, `project.archived`, `project.restored`, `project.deleted`); model names (`agent_session.narrowed`); a UTC time and a dollar cap (`agent_session.started`); a raw `{environment}`, `staging` or `production` (`iam_registration.*`); a token's name (`member.*`, `approval.requested` via a token) | `type` | every `machineDetail` field |

## A8. What the digest now says that is no longer true

Each item gives the digest's section, what it says, and the correction. Anything not listed still stands.

### §1 Header

- **Every count** in the table → §A1.
- **Session-only operations, 15** → **23**, the eight in §A1.
- **The "HEAD moved" note**, *"`info.version` did NOT move … although an operation was added"*: still true of `186fa34`, and
  the pattern went on. 1.4.0 carried nine more operations, one bump came at `d894b8e`, and 1.5.0 then carried six more and a
  field's removal (§A2). *"The same session is still working (Task 7…)"*: that plan is executed (2026-09-29).

### §2 Client conventions

- **§2.1 *"Today the only accepted `Origin` is the console's … `app.manifest.internal` is not built yet"*.** It is built
  (enablement sitting 6, Task 8). There are two origins, the console's and the front-end's (`app.<zone>`,
  `https://app.manifest.internal`), and each takes a session's request only from itself (`CSRF_ORIGIN_REFUSED`'s new words). A
  session set on one origin is not a session on the other (`frontend.md` *Your origin*). The fallback the digest offered (*"must
  be served from the console's origin or use a server-side proxy"*) is no longer needed. Evidence in the contract:
  `CSRF_ORIGIN_REFUSED`; `CONFIG_FRONTEND_ORIGIN_PORT_MISMATCH` and `CONFIG_ORIGINS_SHARE_A_HOST` (`MANIFEST_FRONTEND_ORIGIN`).
- **§2.2 table, `Origin` row, *"must equal the console's origin"*** → must name the origin the request is sent to.
- **§2.3, the capability table.** Five rows are new and one changed. From `authz.ts`'s `OWNER`, `COLLABORATOR`,
  `PLATFORM_ADMIN`, `PERSON_ONLY` and `STEP_UP_GUARDED`:

  | Capability | Owner | Collaborator | Platform admin | Mintable into a token? | Used by |
  |---|:-:|:-:|:-:|---|---|
  | `project:delete` (changed) | ✓ | — | ✓ | **no — PERSON-ONLY** (was "yes, no route uses it yet") | `archiveProject` ↑, `deleteProject` ↑, `restoreProject` (no step-up) |
  | `agent:session` | ✓ | ✓ | ✓ | yes | `startAgentSession`, `endAgentSession` |
  | `launch:rehearse` | ✓ | ✓ | ✓ | **no — PERSON-ONLY** | `runRehearsal` ↑ (was `launch:record`, an administrator's) |
  | `launch:submit` | ✓ | ✓ | ✓ | **no — PERSON-ONLY** | `submitIamRegistration`, `submitPrivacyAssessment` |
  | `launch:draft` | ✓ | ✓ | ✓ | yes | `draftIamRegistration`, `draftPrivacyAssessment` |
  | `approval:request` | ✓ | ✓ | ✓ | yes | `requestApproval` |

  - **Step-up-guarded** now also covers `project:delete` (archive and delete; restore asserts the same capability and does not
    step up) and `launch:rehearse`.
  - **Beside the capabilities, a new gate:** `Me.mayBuild` (faculty by CWL affiliation, or a platform administrator). It
    governs `createProject` and `startIntakeSession` (`403 BUILDING_NOT_OPEN`) and who `addMember` may add
    (`409 MEMBER_MAY_NOT_BUILD`).
  - **Two administrator-only reads** (by the session's platform role, not a capability): `listFleet`, as before, and the new
    `listQueue`.
- **§2.4 *"the `Origin` header must equal the console's origin exactly"*** → it must equal the origin the request arrived on.
  The `hint` names it, and the WebSocket upgrade follows the same rule.
- **§2.5 *"all 21"* mutations** → **33**.
  - Two more same-key exceptions like `mintToken`: a key is never answered twice. A retried `startAgentSession` is
    `409 AGENT_SESSION_ALREADY_STARTED` and a retried `startIntakeSession` `409 INTAKE_SESSION_ALREADY_STARTED`, each naming
    the session.
  - After `500 PROJECT_TEARDOWN_INCOMPLETE`, the same request (same key) continues the archive or delete.
- **§2.6 *"seven different 403s … eight in all"*** → **eleven**: + `BUILDING_NOT_OPEN`, `INCIDENT_LOG_CONFIDENTIAL`,
  `INSTANCE_OUTPUT_STAGING`.
- **§2.7, the step-up list** (production deploy; approve/reject; add/remove member; a production secret; confirming any of
  those) gains switching an app off (`archiveProject`), deleting it (`deleteProject`) and running the rehearsal
  (`runRehearsal`). `Me` still has no step-up freshness field.
- **§2.8 *"Person-only actions (`release:approve`, `launch:record`)"*** → also `project:delete`, `launch:rehearse` and
  `launch:submit`, all refused to a token outright. `TOKEN_PERSON_ONLY`'s summary now lists saying a request was sent, the
  rehearsal, and switching an app off, bringing it back or deleting it.
- **§2.10 Long-running work.**
  - `runRehearsal` is still up to ~90 s, but now takes its deployment down again before it records. Production then reads the
    rehearsal's instance as `gone`, or `failed` when the candidate never started. Two new answers: `409 REHEARSAL_RUNNING` and
    `500 REHEARSAL_TEARDOWN_FAILED`.
  - New: `archiveProject` and `deleteProject` answer once done, *"seconds, bounded by the drain"*.
- **§2.11 Bounded lists** gain `listAgentSessions` (newest 50, `truncated`) and `listQueue` (oldest 200, `truncated`).
- **§2.12 *"the bodiless `DELETE`s `clearAppSecret`, `removeMember`, `revokeToken`"*.**
  - Bodiless `DELETE`s: + `endAgentSession`, `endIntakeSession`, `deleteProject`.
  - Bodiless `POST`s: `startIntakeSession`, `draftIamRegistration`, `draftPrivacyAssessment`, as well as `runRehearsal` and
    `createApprovalPreview`.
  - The literal `{}` (`EmptyRequest`) is also required by `archiveProject` and `restoreProject`.
- **§2.13 *"(1.4.0 now)"*** → 1.5.0.

### §3.1 The index

- **`getInstanceOutput`**: *"never production"* → sandbox only (`INSTANCE_OUTPUT_STAGING`).
- **`recordIamRegistration`**: takes `environment` (production's when absent).
- **`runRehearsal`**: *"S `launch:record` (admin) **PO**"* → **S `launch:rehearse` (owner, collaborator, admin) ↑ PO**, and a
  stranger `404`.
- **The AI row**: *"no operation … Agent model keys … are planned"* → six operations under the new tag `agents` (§A3).
- **The tags**: + `agents`, + rows for every §A3 operation.
- ***"Not in the API at HEAD"***:
  - **Now in:** adding a member by CWL login name or email; archive, restore and delete; agent sessions; the administrators'
    queue across projects (`listQueue`).
  - **Still not in:** changing a project's audience, and rolling back a release (`journey.md`'s *Not yet* rows).

### §4 The event stream

- **§4.1, the close codes**: + `4401` (*"The credential was revoked or expired…"*, `4bac1cf`). It comes when a token is
  revoked, expires or its project is archived, when a removed member's tokens are revoked, or when a session expires. A deleted
  project's other streams close `4404`, and so do a removed member's own session streams on the project.
- **§4.1, `4403` and *"must carry the console's `Origin`"*** → the origin the upgrade is sent to.
- **§4.1, a token's stream at an archive or delete** is closed `4401` before `project.archived` or `project.deleted` reaches it.
  A token client learns it from the close code, not the event (launch path `[S8]`, relayed from our F6).
- **§4.2 and §4.3**: 14 new types, and the numbering from 24 on has moved (§A5). `iam_registration.recorded`'s and
  `project.renamed`'s sentences changed (§A5.2).

### §5 Every error code

- **Counts and the status breakdown** → §A6.
- ***"38 codes are declared by NO operation"*** → 39 (§A6). Within it, `CONFIG_*` is 9 (was 7) and `AI_*` 8 (was 9).
  ***"only `AI_BACKEND_UNAVAILABLE`/`AI_CATALOGUE_EMPTY` are answered by API operations"*** → `AI_CATALOGUE_DISABLED` too.
- **16 codes reworded** (§A6.2). `TOKEN_PERSON_ONLY`'s row in particular is out of date.

### §6 The faculty UI classification

- **Extended for every new and changed field** → §A7.3.
- **§6.1 #5 *"Pending actions do not name the agent"***: still true.
- **§6.2's `Instance` row**: `createdAt` now exists and is the field that orders attempts.

### §7 The client package

- **§7.1 `version`** → `1.5.0`. **`build`** → `node build.mjs`: `tsc` plus a copy of `src/schema.d.ts` into `dist/` (FE-18,
  enablement sitting 10). So **§7.2's *"`dist/*.d.ts` is NOT a usable types entry"* no longer holds** for a fresh
  `pnpm --filter @manifest/contract build`. The `exports` map is unchanged (`types` → `src/index.ts`).
- **`ManifestApiError`** declares its fields rather than constructor parameter properties (`erasableSyntaxOnly`). Its
  signature is unchanged.

### §8 Inconsistencies, gaps and surprises

- **#1 (`agents.md` stale on output)**: resolved. `agents.md` now has *Reading what your app printed*, sandbox only.
- **#4 (the version did not move)**: true again, for six operations and a removal under 1.5.0.
- **#5 (*"the guides name only 38 of the 57 operations"*; a front-end guide *"scheduled"*)**: *Building a front-end*
  (`frontend.md`) exists (enablement sitting 11). Now **the six launch-path operations are named by no guide**: see below.
- **#6 (`authentication.md`'s *"changing a quota"*)**: still there. No quota operation exists.
- **#7**: still true, but `Me.mayBuild` is the first "may I" field.
- **#10 (owners cannot revoke collaborators' tokens)**: still true of `revokeToken`, but **removing the member** now revokes
  every token they minted on the project (`baacc1c`).
- **#14**: 23 session-only operations now.
- **#15**: add `InstanceOutput.environmentKind`, whose enum keeps `staging` *"so a client written against an earlier version
  still compiles"*, though only `sandbox` is answered.
- **#16 *"There is no AI operation in the API at all today"*** → there are six (tag `agents`).
- **New, guides that now disagree with the contract** (the contract wins):
  1. **`launching.md`** (4 lines changed in the window) predates launch-path sittings 6–9.
     - Its step 3 says only that an administrator records UBC's decisions. Nothing on drafts, *"I've sent it"*, the staging
       registration, or UBC's order (assessment, then staging, then production).
     - Nothing on `requestApproval` or `listQueue`.
     - Its *"What an agent may do"* omits drafting (`launch:draft`) and asking for sign-off (`approval:request`), both
       mintable.
     - Its rewrite is the launch path's Task 14.
  2. **`journey.md`** (last changed `7814f75`, 2026-09-30) names none of the six launch-path operations and says *"One
     operation is in no step, deliberately: `listFleet`"*. Its source, `packages/journey/src/coverage.ts` (`a1d4baa`), puts
     **seven** in `OUTSIDE_THE_JOURNEY`:
     - `listFleet`;
     - the five launch steps (the two drafts, the two submissions and `requestApproval`), *"until its Task 15's
       `make demo-launch` makes them steps"*;
     - `listQueue`, *"an administrator’s view of everything waiting on them"*.
  3. **`conventions.md`** (last changed `c90f571`). *Paging* omits `listQueue` (at most 200, `truncated`). *Limits* names
     *"the three `POST`s that take none"* (`startIntakeSession`, `runRehearsal`, `createApprovalPreview`), but the contract
     has five: + `draftIamRegistration`, `draftPrivacyAssessment`.
  4. **`events.md`**'s `4403` row still says *"Send the console’s origin"*. There are two origins now; the contract's own
     `4403` text names none.
  5. **`authentication.md`**'s session-only list (*"among them"*) is incomplete rather than wrong. It omits saying a request
     to UBC was sent, and `listQueue`.

### §8.4 *What is changing next*

**Everything it listed has landed.**

| What §8.4 expected | Landed |
|---|---|
| `updateProject` | `186fa34`, as the digest said |
| Members by CWL login or email, with `member.added`/`member.removed` | `e832bd5` |
| The `app` origin | enablement sitting 6 |
| Agent sessions | `313075d` |
| Archive and restore | `ce96baa` |
| Delete | `bfae957` |
| Console and mock coverage | sitting 10 |
| The guides, with *Building a front-end* | sitting 11 |
| `make demo-frontend` | sitting 12 |

The capability is `agent:session`, as the digest expected. The budget figures it quoted ($10 a month, $2 a session) are
configuration, not contract: `getAgentBudget` reports the month's, and a session's cap is `capUsd`.

**What is changing next, as the platform's plans say at `a230c1a`:**

- **The launch path's sitting 10** (Tasks 13 and 14, merged by Rich):
  - the console and the mock, where every new operation is called and the mock scripts drafts, submissions, requests and the
    queue;
  - the guides, with *Launching* rewritten around the three steps in UBC's order;
  - **a published-text pass (`[S10]`)**: every schema, property, tag, error entry, event and unversioned-endpoint text loses
    its spec citations (about 101 references measured), and so does the info paragraph's *"Generated … do not edit"*.

  Expect many descriptions and error summaries to be reworded, with no shape change.
- **The launch path's sitting 12** (Task 15): `make demo-launch`, which is to make the five launch steps journey steps.
- **The platform's next plan, *Before faculty use it for real*** (`2026-09-30-faculty-ready.md`, approved, not started):
  - **contract `1.6.0` once**: a request id on every answer and refusal (FE-30), a limit's facts as fields (FE-29), and test
    fixtures unlisted from `listBlueprints` (FE-31);
  - **`__Host-` cookie names** on https for the session, login and step-up cookies (FE-28, widened);
  - an administrator's reason for acting on others' projects, as a request header stored with the event.

---

## How this was made

- **The baseline.** `git -C /Users/rich/Developer/manifest show 186fa34:packages/contract/openapi.json > base.json`.
- **The reading.** A copy of manifest's working-tree `packages/contract/openapi.json`, taken when HEAD was `a230c1a` and
  `git status --short packages/contract/openapi.json` was clean. It is identical to
  `git show a230c1a:packages/contract/openapi.json` (SHA-1 `8d8210b0220c821539dad7b211753a02ff6e4107`; the baseline's is
  `43fed7ed7883c17ecadd212d4495bbd828af87ae`).
- **The scripts live in this session's scratchpad**, `/private/tmp/claude-501/-Users-rich-Developer-manifest-app/7e2a1a6c-03d3-4721-ac89-f4bc23d54ab6/scratchpad/`.
  **A scratchpad is not durable**, which is why this file exists.
  - `contract-diff.mjs <base.json> <current.json> [--render | --summary]` diffs two documents field by field:
    - `info`, servers, security, tags, security schemes and unversioned endpoints;
    - every operation's summary, description, security, parameters, request body, responses, examples,
      `x-manifest-error-codes` and other `x-manifest-*`;
    - the event types and their `machineDetail`;
    - the error codes and their declarers;
    - the spec problem codes;
    - every schema property's type, required, constraints and description.

    `--render` prints new items in the digest's format; `--summary` prints one JSON line.
  - `landings.sh [base] [head]` runs it for every commit that touched the contract.
  - `compose.mjs` (with `compose-lib.mjs`, `compose-hand.mjs` and `hand-blocks.md`) wrote this file. The hand-read facts are
    who may call, idempotency, purposes, `humanMessage` sentences, sittings and the C3 table.
- **The commands**, re-runnable for as long as the scratchpad lasts:

  ```sh
  SP=/private/tmp/claude-501/-Users-rich-Developer-manifest-app/7e2a1a6c-03d3-4721-ac89-f4bc23d54ab6/scratchpad
  M=/Users/rich/Developer/manifest
  git -C $M rev-parse --short HEAD; git -C $M status --short packages/contract/openapi.json   # empty = clean
  git -C $M show 186fa34:packages/contract/openapi.json > $SP/base.json
  cp $M/packages/contract/openapi.json $SP/current.json
  node $SP/contract-diff.mjs $SP/base.json $SP/current.json --render > $SP/diff-output.md   # the full diff
  zsh $SP/landings.sh 186fa34 HEAD > $SP/landings-output.txt                                # one diff per commit
  node $SP/compose.mjs $SP/base.json $SP/current.json $SP/landings-output.txt > $SP/addendum.md
  ```

  The composer's hand-read facts (`compose-hand.mjs`, `hand-blocks.md`) are true at `a230c1a`. A later platform commit needs
  them read again: a new operation fails the composer until it has an entry.
- **The two revisions.** The baseline is manifest `186fa34` (2026-09-27, contract 1.4.0, the digest's). The reading is
  manifest `a230c1a` (2026-10-01, contract 1.5.0).
- **Read-only throughout.** Nothing in manifest was changed or run: no pnpm, make or test there. Only `git show`/`log`/`diff`/
  `status` and file reads.
