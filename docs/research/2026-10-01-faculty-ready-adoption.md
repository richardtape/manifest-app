# Adopting the platform's faculty-ready plan — what moves on our side

*Written 2026-10-01 by manifest-app-3a, ahead of time, from manifest's docs/superpowers/plans/2026-09-30-faculty-ready.md at manifest `a230c1a` (read-only; the plan unchanged since `02497dc`). Nothing here is built yet. The platform's Task 5 messages us before its cookie change lands.*

**Where it stands.** None of the plan has landed. Its sittings table is empty, its *What executing this plan found* says
*"Empty until sitting 1"*, and there is no `spikes/faculty-ready-baseline/` yet. It *"starts only after"* the launch path's
sitting 12 closes, and the launch path is still in sitting 9 (Task 12: `a1d4baa`, its fix wave `a230c1a`), with 10 and 12
to come. The contract is **1.5.0, 72 operations**, at `a230c1a` and in manifest's working tree.

**Line numbers** below were read at our `238e6a0` and manifest's `a230c1a`. Other sessions are editing
`packages/server/src` as this is written, so re-read before citing.

---

## What the plan changes (in its own words, per Task)

| Task | Sitting | What it does, quoted | Touches us? |
|---|---|---|---|
| 1 | 1 | The measurements. `[M1]`: *"If curl keeps a cookie Chrome refuses, record it: the demo scripts' controls must use the browser's answer, not curl's."* `[M3]`: LiteLLM against a `422`, *"non-streamed and streamed"*; *"This decides Task 6's branch."* | We read its record: `[M1]` for our curl jars, `[M3]` for our stream reader |
| 2 | 2 | FE-31: *"`listed: false` on `fixture-node`; `listBlueprints` omits it; it still resolves."* *"The published examples move to `node-ts-mongo@1`."* | Barely: our fallback already picks CWL (FE-31's fix); the mock lists one blueprint already |
| 3 | 2 | FE-30, **and the contract goes to 1.6.0**: *"Produces `x-request-id` on every answer, `ErrorEnvelope.error.requestId: string` (required), and `ManifestApiError.requestId: string \| null`."* *"Message the front-end's live session before the commit … naming `requestId`, `x-request-id` and `1.6.0`."* | Yes: the envelope, the client class, the mock |
| 4 | 2 | FE-29: *"`Limit = { scope: 'person' \| 'platform'; period: 'day' \| 'month'; resetsAt: string \| null; amountUsd?: number; count?: number }`"*, *"`StartedSession = { id: string; name: string \| null }`"*. *"Tell the front-end (its F5b's limit cards can read `resetsAt` instead of its copy of the rules)."* | Yes, optionally: our intake words compute the reset today |
| 5 | 3 | FE-28: *"`__Host-` names on https origins, and the plain name only on loopback http"*; login and step-up cookies *"also `__Host-`, with `Path=/`"*; *"clearing a `__Host-` cookie carries `Secure`"*. Step 1: *"Tell the faculty front-end's live session FIRST, before any code."* | **Yes: our `whoIs`, its tests, our scripts** |
| 6 | 4 | F8: *"A provider's `422` reaches the client as a `422`, never `200 null`."* *"A STREAMED `422` is fixed too, or the sitting stops and asks Rich: the front-end streams every call."* | Yes: how a streamed refusal arrives |
| 7 | 5 | `node:24-alpine`: *"Each app's next build moves to 24, and a rollback keeps 22's image."* | No code of ours; the knowledge pack says *"Node 24"* |
| 8 | 4 | `Init: true`: *"An exit code of `143` after a stop is recorded as a stop, never a crash, if `[M4]` finds it would be otherwise."* | Indirectly: a stop read as a crash would open an Incident, and we email *in trouble* on one |
| 9 | 5 | The IdP's store: *"Everyone signs in to the IdP again."* | Only Rich, once, at his next walk |
| 10 | 6 | §26: *"Produces the header `Manifest-Admin-Reason`, `400 ADMIN_REASON_REQUIRED`, `EventFrame.actor`."* *"Tell the front-end (`1.6.0` grows `EventFrame.actor`)."* | Additive; whether we show it is Rich's |
| 11 | 7 | The acceptance: Rich *"signs in on `console.` and `app.`, and his browser shows the `__Host-` cookie"*; Step 6: *"the front-end told."* | Yes, if our server holds 7105 when he clicks `app.` |

The plan names us directly in *Read this first* 3 (*"its server's `whoIs` (`packages/server/src/identity.ts`, which refuses
two `manifest_session` cookies), its tests, and its five `check-*.sh` scripts"*), 4 (*"the front-end's mock mode is
`http://127.0.0.1:7105`"*), Decision 7 (*"The mock keeps its plain name, because it is http only … the front-end's mock mode
is untouched"*), and *Global Constraints* (*"Task 5 changes its code too. It must be told the new cookie names and
`sessionCookieFor` BEFORE the commit, and given time to adopt."*).

**1.6.0 in one list.** No operation is added or removed. Every refusal gains a required `error.requestId`; every answer
gains `x-request-id`; three limit refusals gain `error.limit` and the two `*_ALREADY_STARTED` gain `error.session`;
`listBlueprints` answers fewer; one new code, `400 ADMIN_REASON_REQUIRED`, and one new request header,
`Manifest-Admin-Reason`; `EventFrame.actor`; `securitySchemes.session` describes both names; the client package gains
`sessionCookieFor(baseUrl)` and keeps `SESSION_COOKIE`, deprecated. Decision 1: *"ONE CONTRACT BUMP, `1.6.0`, AT TASK
3"*; Tasks 4, 5 and 10 add to it without a bump.

---

## What of ours moves

### 1. whoIs (FE-2)

**Today.**
- `packages/server/src/identity.ts:4` imports `SESSION_COOKIE` (`'manifest_session'`, manifest's
  `packages/contract/src/client.ts:5`).
- `sessionIn` (`identity.ts:25-33`) reads that one name out of the browser's Cookie header (`:29`). Two of it, or an
  empty one, are none (`:31-32`): FE-28 (b), Rich's word, 2026-09-28.
- `whoIs` (`:36-64`) replays the value with `createManifestClient({ origin: platformOrigin, session })` (`:44`). The
  contract's client writes the header itself: `cookie: ${SESSION_COOKIE}=${options.session}` (manifest
  `client.ts:59-61`). So both the name we **read** and the name we **forward** are the contract's constant.
- `platformOrigin` is `http://127.0.0.1:7100` in edge mode and `http://127.0.0.1:7102` in mock mode
  (`packages/server/src/config.ts:44`). Our own origin is `https://app.manifest.internal` or `http://127.0.0.1:7105`
  (`config.ts:45-48`).
- Two callers: `app.ts:142` (`GET /api/me`) and `api/guard.ts:50` (every guarded route). Nothing else of ours carries a
  session: every platform adapter sends the conversation's token (`platform/project.ts:44-51`, `platform/refusal.ts:53-65`).

**What changes.**
- **The name we read** must follow the origin the browser reached **us** on: `__Host-manifest_session` through the edge,
  `manifest_session` in mock mode. Never `platformOrigin`'s scheme, which is http in both modes.
- **The name we forward** must be the one the control plane reads for **our** request, and that is not obviously the same.
  The plan's readers all ask *"`cookieNames(originOf(request))`"* (Decision 7). `originOf` (manifest
  `api/origins.ts:18-21`) picks the configured origin whose host is the request's `Host`, *"or the FIRST (the console's)
  when none is"*. The laptop's origins are `https://console.manifest.internal` and `https://app.manifest.internal`
  (`config.ts:598`, `.env.example:115-116`). Our replay goes to `127.0.0.1:7100`, whose `Host` names neither, so by that
  reading the control plane reads **`__Host-manifest_session`** from us, over plain http. But `sessionCookieFor(baseUrl)`
  is keyed on the base URL, and for `http://127.0.0.1:7100` it would answer the **plain** name. That is open question 1.
- **A leftover or tossed plain cookie** beside the new one: the platform ignores it on https (Decision 8: *"A LEFTOVER
  PLAIN `manifest_session` ON AN HTTPS ORIGIN IS IGNORED, never ambiguous"*). Our *"two are none"* counts one name today;
  whether it should count the plain one beside `__Host-` is open question 9.
- `whoIs` needs our origin as well as `platformOrigin`: its signature changes, and so do its two callers.

**Risk.**
- **Edge mode signs everyone out between the two commits.** Once 7100 restarts on Task 5's code, a `whoIs` that reads or
  forwards the old name finds nobody, whatever the person does. Before that restart, a `whoIs` that already reads or
  forwards the new name finds nobody either. The two must land in one window, with no edge walk between. Mock mode is
  untouched throughout.
- **FE-28's harm through our door.** If `whoIs` read a plain `manifest_session` in edge mode and forwarded it under the
  `__Host-` name, a sibling app could still plant a session that our server accepts: the platform's own fix, undone by us.
  The test must assert that a plain-only header is nobody in edge mode, and asks nobody.
- **The contract reaches us live.** We resolve `@manifest/contract` to manifest's `src/` (`contract-source.test.ts`), at
  run time too, so a change to `createManifestClient` reaches our server the moment manifest's working tree changes.

### 2. sign-in.ts's jars

**Today.** `packages/server/src/platform/sign-in.ts` has **no cookie jar**. `signInStarts` (`:20-39`) fetches the draft
app's `/login` with `redirect: 'manual'`, reads `location`, fetches the IdP's first answer the same way, and judges by its
status. It sends no cookie, keeps none, and never reaches Manifest's `/auth/*`: the app's `/login` is the app's own CWL
sign-in, not the platform's. Mock mode never calls it (`app.ts:289`).

**What changes.** Nothing. Task 5 renames Manifest's three cookies; a faculty app's own cookies are the app's. Task 7
rebuilds drafts on Node 24, and `/login` is the same route.

**The Node sign-in the plan means.** Task 5 Step 1 tells us *"its Node sign-in must read `__Host-manifest_session` and carry
`__Host-manifest_login` across the three hops"*. The only code of ours that does those three hops is
**`scripts/walk/sign-in.ts`, untracked at the time of writing** (another session's headless-Chrome walk library, appearing
at 19:19). Its `Jar` (`:24-67`) is per host and keeps whatever names `Set-Cookie` sends, so it carries
`__Host-manifest_login` without change. It ignores `Path`, `Secure` and `Domain`, as curl does, so it can never witness
Review Focus 1 or 2: only the browser half (`signInHere`, `Page.adopt` at `page.ts:349-357`) can. Its session check
(`sign-in.ts:202`, `/manifest_session$/`) accepts either name.

**Risk.** Low. Say so in the reply to Task 5's message, so the platform does not wait on a change we have no reason to make.

### 3. The scripts

**Today** (no `lib.mjs`, no `idp-login`, and nothing in `scripts/` builds a Cookie header except these):

| File:line | What it does with the session |
|---|---|
| `check-building.sh:140`, `check-describing.sh:102`, `check-going-live.sh:139`, `check-seeing.sh:152` | Sign in through our `/auth/login` (proxied to the mock), then `grep -q 'manifest_session' "$JAR"`. Mock mode only (each `APP=http://127.0.0.1:7105`). |
| `check-slice.sh:87` (`:89`, `:92` its messages) | Mock mode: `grep -q 'manifest_session<TAB>mock-session' "$JAR"`. |
| `check-slice.sh:116`, `:122` | Sends `-H 'cookie: manifest_session=nonsense'` to `/api/me`, in mock mode (`:116`) and **in edge mode** (`:122`, `MODE=edge`). |
| `check-slice.sh:78` (step 2) | Matches the **platform's** envelope by `'"code":"UNAUTHENTICATED","message"'`. |
| every `call`/`get` helper | `-c "$JAR" -b "$JAR"`: curl keeps and sends whatever it is given. |

**What changes.**
- **Mock mode: nothing has to.** The mock keeps `manifest_session` (Decision 7). But every jar check above is a substring
  match, and `__Host-manifest_session` contains `manifest_session` (`check-slice.sh:87` included: the tab comes after the
  name). So a mock that renamed its cookie would pass them all. They should match the jar's name field exactly.
- **Edge mode, `check-slice.sh:122`**: after our change, a plain `manifest_session=nonsense` is nobody, so our server asks
  nobody and answers `401`. It stays green **for the wrong reason**. It should send `__Host-manifest_session=nonsense` in
  edge mode. Even then the script cannot tell the two apart (both answer the same envelope): the unit tests are the witness.
- **Step 2's pattern** is red if the mock or the platform puts `requestId` between `code` and `message` (Task 3).

**Risk.** Low, and quiet: each of these would stay green through the defect it should catch.

### 4. Test sessions, the mock, Vite and the edge

**The literals.** `manifest_session=` in our test files (`packages/*/src/**/*.test.ts(x)`):

| Package | Occurrences | Lines | Files |
|---|---|---|---|
| server | 10 | 8 | `identity.test.ts` (7, on `:66`, `:92`, `:133`, `:142`, `:145`), `app.test.ts` (2, on `:67`, `:216`), `api/guard.test.ts` (1, on `:69`) |
| web | 0 | 0 | — (`platform/api.test.ts:31` passes `session: 'mock-session'` to our `createPlatform`, and the contract's client names the cookie) |
| ui | 0 | 0 | — |

Beside them, the helper `packages/server/src/api/testing.ts` (not a test file) has five lines:
- `AS_ALICE`, `AS_BOB`, `AS_CAROL`, `AS_DANA` (`:36-39`), each `manifest_session=<who>-session`. They are named **83
  times in 11 test files** (imports included), and those uses do not change: only the four constants do.
- The fake control plane's reader (`:58`): `/manifest_session=([^;]+)/`. **It is unanchored**, so it also matches
  `__Host-manifest_session=`. Every edge-mode API test would pass whichever name `whoIs` forwards, until it reads exactly one.

**Which change.** Every API test runs in edge mode with our origin `https://app.manifest.internal` (for example
`api/conversations.test.ts:38-46`, `api/guard.test.ts:20-29`). So:
- `identity.test.ts`'s 7 change or gain an edge twin, with the signature;
- `guard.test.ts:69` changes: in edge mode, a plain `manifest_session=nonsense` would be refused without asking the
  platform, so *"a session the platform does not know is 401 too"* would stay green for the wrong reason;
- `app.test.ts:67` and `:216` stay. They are mock mode, and `:216`'s anchored `/^manifest_session=mock-session; Path=\//`
  is already the assertion that the mock kept its plain name.

So **8 of the 10 literals move** (on 6 lines), plus the 5 helper lines.

**The mock.**
- Ours runs it from source: `pnpm mock` is `tsx scripts/mock.ts` (root `package.json`), which imports `createMockServer`
  through `@manifest/mock`, `link:../manifest/packages/mock` (root and server `devDependencies`). It listens on 7102.
  `pnpm dev:mock` is our server with `MANIFEST_APP_MODE=mock`. Fifteen test files import the mock in-process
  (`app.test.ts` and fourteen in `packages/web`).
- In mock mode our server proxies `/v1` (with its WebSocket) and `/auth` to 7102, untouched (`app.ts:220-242`).
- The mock's session: `SESSION_COOKIE = 'manifest_session'`, `ISSUED_SESSION = 'mock-session'` (manifest
  `packages/mock/src/server.ts:54-56`); set at `:997`, cleared at `:1007`, read at `:1195` and `:1229`.
- **What the plan changes in it:** Task 3 (*"`envelope()` adds a UUID; every answer carries the header"*,
  `server.ts:821-835` in the plan, `:858-872` today); Task 4 (the facts, `:480,534,540,1051,1059`); Task 5 (*"unchanged
  names, asserted"*); Task 7 (`fixtures.ts:390-392`); Task 10 (*"the example refusal"*). And Task 2's examples move to
  `node-ts-mongo@1`, which the mock answers from for some operations (FE-27).

**Vite.** `packages/web/vite.config.ts` has no proxy and no cookie handling. `allowedHosts: ['app.manifest.internal']`
(`:32`) and edge mode's HMR socket over `wss` (`:34`) are about the `Host`, not cookies. Nothing moves.

**The edge.** We own no edge configuration. The platform's is `infra/caddy/Caddyfile`; the app's site is `:124-151`:

```
app.manifest.internal {
	…
	route {
		@outside not remote_ip 10.89.0.1/32
		…
		@api path /v1/* /auth/*
		reverse_proxy @api host.docker.internal:7100 {
			stream_close_delay 1h
		}
		reverse_proxy host.docker.internal:7105 {
			stream_close_delay 1h
		}
	}
}
```

There is no `header_up`, no cookie rewrite, and the `Host` is preserved (its comment at `:114`). The plan's *File
Structure* names no file under `infra/caddy`, and manifest's `scripts/verify.sh:1031-1055` holds the app's site equal to
the console's but for 7105. So the browser's `__Host-manifest_session` will reach 7105 as the browser sent it.

**Risk.** The unanchored fake is the one that would hide a real defect. The rest is mechanical.

### 5. Everything else that touches us

- **The error envelope and `ManifestApiError` (Task 3).** Nothing in our production code constructs either. The tests
  construct `ManifestApiError` **19 times in 12 web test files** (`platform/api.test.ts` 3, `describe/intake.test.tsx` 6,
  and one each in `trying-out/put`, `screens`, `going-live/going-live`, `going-live/dry-run-press`, `going-live/live`,
  `going-live/sign-off`, `mode-banner`, `preview/preview`, `overview/overview`, `overview/students`). Every envelope there is
  cast (`as never`, or `as unknown as ErrorEnvelope` at `platform/api.test.ts:44-47`), so a required `requestId` breaks no
  type. **A new required constructor parameter would break all 19** (open question 2).
- **FE-30's read (Task 3).** FE-30 said *"We record the id beside our reference."* Our problem row has no field for it, and
  the browser's report is refused for any key outside `reference, code, operation, status, at` (`api/problems.ts:41`). The
  plan's Decision 2 counts on it: *"a short code, which the front-end already makes (its reference) and records beside
  ours."* We record the platform's id; we never show a UUID to a faculty member (C3).
- **FE-29's read (Task 4).** Our intake words compute the reset from the contract's prose: Vancouver's next midnight and
  the month (`packages/web/src/screens/describe/model.ts:53-58`, `:93-104`). `error.limit.resetsAt` lets them read it. The
  agent budget already reads a `resetsAt` (`building/needs.tsx:160`). `*_ALREADY_STARTED`'s `error.session` we have no use
  for: the orphan's key was never received, so it spends nothing (`platform/agent-sessions.ts:48-55`).
- **F8 (Task 6).** *"Ours reads both"* (ORIENTATION) is true for the non-streamed `422` (`model/client.ts:111`, held by
  `client.test.ts:288`) and for `null` (`model/stream.ts:39`, `:95`; `client.test.ts:281`). **It is not true for a streamed
  `422` that arrives as an error event mid-stream**: `chunkOf` reads any `error` chunk as `MODEL_UNREACHABLE`
  (`stream.ts:41-42`, held by `stream.test.ts:138`), so a fixed gateway would make us say *"We can't reach the model"* for a
  request the provider refused. A `422` before the body is read correctly (`client.ts:249-257`). Which one Task 6 produces is
  `[M3]`'s answer (open question 4). The plan keeps the platform's own null tolerance *"for old gateways"*; we keep ours too.
- **CSRF and Origin (Task 5).** `csrf.ts:35`'s `carriesSession` will read the origin's name. Our browser's mutations on
  `app.` carry `__Host-manifest_session` and our `Origin`, as today. **Our own Origin rule (`api/guard.ts:6-13`) stays
  necessary**: `__Host-` limits who may *set* the cookie, not who makes the browser *send* it, and `SameSite=Lax` still sends
  it on a same-site post from a student app. `check-seeing.sh`'s and `check-going-live.sh`'s `evil` steps stay valid.
- **CORS, session lifetime, step-up.** The plan changes no CORS and no session lifetime. The step-up cookie becomes
  `__Host-manifest_stepup` at `Path=/`; our `stepUpHref` (`packages/web/src/auth.ts:15-17`) is unchanged.
- **`/auth/*` paths.** `packages/web/src/auth.ts` stays the only file naming one; no `/auth/` path is added, removed or
  renamed. Sign-out (`auth.ts:29-47`) posts `/auth/logout` as today; the clear's `Secure` is the platform's (Review Focus 1).
- **`launch-actions.test.ts`.** The plan adds no operation we call, and our server never sends `Manifest-Admin-Reason`. Its
  scan (`launch-actions.test.ts:33-41`) and its lists stay as they are.
- **The doctor.** The plan touches `scripts/doctor.sh` only for `base/node`'s tag (Task 7) and the IdP store's key (Task 9).
  Its probe of our `GET /api/__doctor` (manifest `doctor.sh:200-207`; ours at `app.ts:137`) is untouched. Keep it.
- **§26 (Task 10).** `EventFrame.actor` is additive, and nothing of ours parses a frame strictly. Our happenings name an
  actor only among the kept members (`keeping/happenings.ts:120-138`), so an administrator who is not a member acts as
  nobody named today. Whether we tell an owner that an administrator acted, and why, is open question 10. A non-member
  administrator using our pages would meet `400 ADMIN_REASON_REQUIRED` on a mutation, and our page would word it as a
  refusal. Our *Make it* mints its token for the person's own new project, where they are a member, so it is never asked.
- **Task 8 and our emails.** We email *in trouble* on `incident.opened` (`keeping/happenings.ts:52`). If a hibernation's
  exit `143` were read as a crash, every sleeping app would open an Incident. The plan guards it (Decision 11); we watch for it.
- **Published text.** We never show the platform's `message`, `hint` or event sentences (C3), so Task 10's new sentences and
  the plan's published-text rule move nothing of ours. The platform's HTML refusal page (Task 3) will show its own
  reference at a refused sign-in on `app.`: that page is the platform's.

---

## The test-first order

Each step: the failing test first, then the change, then the negative control, watched red. Steps 1–7 can be done in mock
mode and in the unit tier. **Step 8, and step 4's proof, need the real platform on 7100: Rich's word, in a window the
platform's running sitting gives, and he types the passwords.** Hold every Vitest run of ours through the platform's
announced Docker tier and closing test runs, as now.

**1. The landing of 1.6.0 (the platform's sitting 2: Tasks 2, 3 and 4). Mock mode.**
- *First:* nothing new to write. Our `link:` means manifest's uncommitted `packages/contract` edits reach our `pnpm
  typecheck` before the platform commits, and Task 3 Step 4 messages us before its commit. Run `pnpm typecheck`, then `pnpm
  test`, then the five scripts in mock mode.
- *Where red could come from:* the 19 `new ManifestApiError(` above, if the constructor gains a required parameter;
  `check-slice.sh:78`'s pattern, if `requestId` sits between `code` and `message`; a live-mock assertion on an example that
  moved from `fixture-node@1` to `node-ts-mongo@1`. Read each red as the landing, never as a defect of ours, until shown.
- *Negative control:* none to make. The landing is the change; a gate that was green before it and is green after it has
  shown nothing, so say what each gate read.

**2. FE-30: we keep the platform's request id beside our reference. Mock mode.**
- *Failing tests:*
  - `packages/server/src/api/problems.test.ts`: a report carrying `requestId: '<a UUID>'` is kept, and the row's new
    field equals it exactly; a `requestId` that is not a UUID is refused as an unknown key is today; the operator line
    carries the id.
  - `packages/web/src/platform/api.test.ts`, against the live mock: a refusal's `refusalOf(…)` carries the envelope's
    `requestId`, a UUID, equal to the answer's `x-request-id`. A refusal with no envelope (`UNPARSEABLE`, the edge's empty
    `502`) carries the header's id, or `null` when there is none.
- *Change:* the store's next version (one nullable column on problems); `requestId` in `KEYS` (`problems.ts:41`), checked
  as a UUID; `refusalOf` and the report carry it. **Server first**: today it refuses the key.
- *Negative controls:* take `requestId` out of `KEYS`: the report is refused, red at the row. Drop it in `refusalOf`: red at
  the web test.

**3. `whoIs` reads the name of the origin the browser reached us on. Unit; mock mode.**
- *Failing tests* (`packages/server/src/identity.test.ts`; `whoIs` takes our origin as well):
  1. edge (`https://app.manifest.internal`): `theme=dark; __Host-manifest_session=S; other=1` is the person, after exactly
     one `GET /v1/me`;
  2. edge: a header holding only `manifest_session=S` is nobody, and **the fake's `seen` is empty** (Review Focus 2,
     through our door);
  3. edge: `manifest_session=T; __Host-manifest_session=S` is S's person, and only S is forwarded (pending open question
     9; today's rule would make it nobody);
  4. mock (`http://127.0.0.1:7105`): `manifest_session=S` is the person; `__Host-manifest_session=S` is nobody;
  5. kept from today, in both modes: an empty value and two of the name read are nobody; a `500` never carries the value;
     nothing is written anywhere.
- *Change:* `identity.ts`: the name read is `sessionCookieFor(ourOrigin)` (the contract's, once Task 5 exports it), never
  derived from `platformOrigin`. The two callers (`app.ts:142`, `guard.ts:50`) pass the config.
- *Negative controls:* (a) read the plain name in edge mode as well: red at 2. (b) choose the name by `platformOrigin`'s
  scheme: red at 1, because it is http in both modes. (c) put back *"two of any name are none"*: red at 3.

**4. `whoIs` forwards the name the control plane reads for our request. Unit; its proof on 7100.**
- *Failing test* (`identity.test.ts`): the fake's `seen[0].headers.cookie` is **exactly** `'<NAME>=S'`, one cookie and
  nothing else, as `:92` asserts today. In mock mode `<NAME>` is `manifest_session`. In edge mode it is open question 1's
  answer: by `originOf` as it reads today, `__Host-manifest_session` for a request to `http://127.0.0.1:7100`.
- *Change:* whatever open question 1 settles. If the contract's client cannot name it, that is **FE-46** in
  `api-findings.md`, never a Cookie header built by hand around the client.
- *Negative control:* forward the other name in edge mode: red at the exact header.
- *Real proof (7100):* after 7100 restarts on Task 5, Rich signs in on `app.`; our `/api/me` answers him with
  `/v1/me`'s id (check-slice.sh's steps 5, 6 and 6b, by hand). Only a real control plane says which name it reads.

**5. The fake control plane stops accepting either name. Unit.**
- *Failing test* (`api/guard.test.ts`, or beside the helper): the fake answers `401` to `manifest_session=alice-session`
  and Alice to `__Host-manifest_session=alice-session` (or step 4's `<NAME>`). Red today: the unanchored reader accepts both.
- *Change:* `testing.ts:58` reads exactly the name it is told the platform reads (a parameter of `fakeControlPlane`).
  `AS_ALICE`…`AS_DANA` (`:36-39`) become the edge name; their 83 uses follow by import. `guard.test.ts:69` sends
  `__Host-manifest_session=nonsense` and also asserts the fake was asked (`platform.seen` holds one `/v1/me`).
- *Negative controls:* put `AS_ALICE` back to the plain name: every edge-mode test that needs a person goes `401`. Put
  `guard.test.ts:69` back to the plain name: red at `seen`.

**6. The scripts. Mock mode; the edge leg on 7100.**
- *First:* in mock mode, look for `__Host-manifest_session` in the jar instead: the four sign-in steps and
  `check-slice.sh`'s step 4 must go red. Today they stay green, because the match is a substring.
- *Change:* each jar check matches the name field exactly (`awk -F'\t' '$6=="manifest_session" && $7=="mock-session"'`).
  `check-slice.sh` sends `__Host-manifest_session=nonsense` in edge mode and the plain name in mock mode, and says in a
  comment that its step 7 cannot tell the two names apart (the unit tests of steps 3 and 5 are the witness).
- *Negative control:* the *First* above, kept as a one-line change and reverted.
- `scripts/walk/sign-in.ts:202`, when it is committed: the session check names the origin's exact name. That is its
  author's change, not this note's.

**7. The additive reads, each when its task lands. Unit; mock mode.**
- **FE-29 (Task 4):** `packages/web/src/screens/describe/model.test.ts`: `INTAKE_DAILY_LIMIT_REACHED` with
  `limit.resetsAt` at an hour our own computation never gives (01:00 Vancouver) is worded *"1am"*; without `limit`, as
  today. The same for `INTAKE_BUDGET_EXHAUSTED`'s month. *Negative control:* ignore `limit`: red at *"1am"*. The mock's
  switches (`MANIFEST_MOCK_INTAKE=daily-limit`, `=budget-spent`) will start sending facts.
- **F8 (Task 6):** `packages/server/src/model/stream.test.ts`, written from `[M3]`'s recorded streamed answer. If it is an
  error event (the plan's non-streamed body is `{ error: { type: 'invalid_request_error', code: '422' } }`), that chunk is
  `MODEL_ANSWER_INVALID` with status `422`, never `MODEL_UNREACHABLE`. The positive control is already there: `:138`'s
  error chunk with code `'500'` stays `MODEL_UNREACHABLE`. If it is a non-200 before the body, `client.test.ts:288` holds it
  and nothing changes. *Negative control:* drop the code check: red. The real witness is the platform's Docker case; we
  cannot provoke a provider's `422` on 7100 at will.
- **§26 (Task 10):** nothing to build unless Rich asks for it (open question 10).

**8. The walk, on 7100.** After 7100 restarts on Task 5 and steps 3–5 are in, with our server in edge mode on 7105:
1. Rich signs in on `app.`: DevTools shows `__Host-manifest_session` (`Secure`, `Path=/`, no `Domain`); our page knows him.
2. A plain `manifest_session` left from before changes nothing: he is signed out once, then signs in.
3. A tossed plain cookie (set in DevTools with `Domain=manifest.internal`) changes nothing on our pages.
4. Moment 14's step-up on `app.`: `__Host-manifest_stepup` at `Path=/`, and he lands back where he pressed.
5. Sign out: afterwards the browser holds no `__Host-manifest_session` (Review Focus 1, on the app's origin).
6. `MODE=edge bash scripts/check-slice.sh`.

Then the five scripts in mock mode, as every sitting ends.

---

## Open questions

**For the platform session** (to ask in the reply to Task 5's message, or sooner):
1. **Which name does the control plane read on a direct request to `http://127.0.0.1:7100`?** Its `Host` names no
   configured origin, so `originOf` falls back to `https://console.manifest.internal`, and `cookieNames` would answer
   `__Host-manifest_session`. Does `sessionCookieFor('http://127.0.0.1:7100')` then answer the plain name, so the contract's
   own client sends the wrong one for a server that replays a session to 7100? If so, which would it rather: (a) the client
   takes the name, or the origin the session belongs to; (b) our `whoIs` asks through the edge
   (`https://app.manifest.internal/v1/me`), where `Host` and scheme agree; (c) a `Host` that names no origin reads the plain
   name?
2. Does `ManifestApiError` take `requestId` as a constructor parameter, and is it optional? (19 test sites of ours.)
3. Is `Manifest-Admin-Reason` declared as an **optional** header parameter on each mutation? A required one would break the
   types of every mutation we call.
4. After Task 6, how does a streamed `422` arrive: a non-200 before the body, or an error event mid-stream, and in what
   shape? (`[M3]`.)
5. Where does `requestId` sit in the mock's envelope? (`check-slice.sh:78`'s pattern.)
6. At Task 11's clicked half on `app.`, whose server holds 7105: ours in edge mode, or the reference console? If ours,
   steps 3–5 must be in.
7. Can Task 5's commit and the restart of 7100 on it leave a window for our adoption commit between them, announced?

**For Rich:**

8. **Which cookie name over http?** The plan answers it: the plain name, and the mock keeps it (Decision 7, *"the front-end's
   mock mode is untouched"*). Is that what he wants for ever, or should mock mode one day rehearse `__Host-` over https?
9. **"Two are none"** was his word (FE-28 (b), 2026-09-28). With `__Host-`, should our `whoIs` ignore a plain
   `manifest_session` beside it, as the platform does (Decision 8), or keep refusing two of any name? Keeping it lets a
   sibling app still sign a person out of our app by tossing a plain cookie.
10. **`EventFrame.actor`:** do we tell an owner, in *what happened* (F6), that an administrator acted on their app, and why?
    Or not at all?
11. **FE-30:** we record the platform's id with our reference, and never show the UUID to a faculty member (C3). Confirm.
12. **Does the edge rewrite?** No line of the app's site handles a cookie, and no task of the plan touches the Caddyfile.
    We would ask the platform to keep it so.
13. **Does the mock change?** Its cookie does not. Its envelopes, its limit facts, its examples and its knowledge pack do
    (Tasks 2, 3, 4, 7 and 10), so **restart `pnpm mock`** after each of those landings.

## The platform's answers to questions 1–7

*From `manifest-9f` (a platform session, read-only, documents only), 2026-10-01 ~23:30 PDT, at manifest `6c77c15`. The
same answers are in manifest's faculty-ready plan, section "Asked by the faculty front-end before this plan runs", so the
sitting that executes it inherits them. "Recommended" means the plan is silent: that sitting keeps or changes the
recommendation and tells us at its Task 1's close.*

1. **The cookie on a direct request to `127.0.0.1:7100`: the plan doesn't say, and as written client and server would
   disagree.** The server's `originOf` falls back to the console's https origin (`api/origins.ts:6`, `:18-21`;
   `config.ts:598`), so after Task 5 it reads only `__Host-manifest_session` there (Decision 8 ignores the plain name).
   The client's `sessionCookieFor(baseUrl)` has no body yet (Task 5 *Interfaces*); if it follows Decision 7's scheme
   rule it answers the plain name for `http://127.0.0.1:7100`, **so our `whoIs` replay would get `401`**. Today a direct
   session-bearing *mutation* to 7100 is already refused by CSRF (the client sends `Origin http://127.0.0.1:7100`,
   `contract/src/client.ts:46,58`; the server expects the console's, `api/server.ts:339`): only reads work direct.
   **Recommended: our option (b), `whoIs` asks through the edge** (`https://app.manifest.internal/v1/me`, where `Host` and
   scheme agree): spec §21 (*"Clients reach it through the edge … never on this port"*), and what manifest's own
   `journey/src/frontend.ts:166,205` does (it needs `NODE_EXTRA_CA_CERTS`). Option (a) would need a new client option
   (the fallback follows `origins[0]`, not the base URL); option (c) contradicts `origins.ts:8`.
2. **`ManifestApiError`: partly said.** Today `(status, envelope, operation)` (`contract/src/errors.ts:18`); Task 3 adds
   `requestId: string | null`, *"from the body, else the header"*, without saying how it arrives. **Recommended: an
   optional fourth parameter defaulting to `null`**, so our 19 constructions keep compiling.
3. **`Manifest-Admin-Reason`: the plan doesn't say how it is declared.** Today the only header parameter,
   `Idempotency-Key`, is `required: true` on every mutation (`api/contract/document.ts:294-302`). **Recommended:
   `required: false`** (it is required only of an administrator who is not a member; required would break every
   mutation's call site, the console's too).
4. **A streamed `422` after Task 6: left to `[M3]`'s measurement** (Decision 9). Today a streamed `400` answers as a
   non-200 JSON body before any stream starts (`ai/fallback-guard.docker.test.ts:348-359`), and a `422` as `200` `null`
   (`:372-381`). The sitting tells us `[M3]`'s answer at its Task 1's close. Our `stream.ts:41-42` (m62) matters only in
   the mid-stream case.
5. **`requestId` in the mock's envelope: the plan says only *"envelope() adds a UUID"*.** Today the mock writes
   `{ error: { code, message, hint?, details?, launchReadiness? } }` (`mock/src/server.ts:993-1009`); the platform's own
   sketch is `{ error: { ...error, requestId } }`, so **`requestId` comes last. Recommended: the mock appends it last too**,
   keeping `"code":"UNAUTHENTICATED","message"` adjacent. Still: `check-slice.sh` should parse the body, not grep it.
6. **Who holds 7105 at Task 11's clicked half: the plan doesn't say.** What Rich clicks there is the reference
   console's (Tasks 3 and 10); sign-in goes through `/auth/*` to 7100. **Recommended: the reference console's preview on
   7105, lent by us and returned after**, as the front-end enablement plan's clicked half did (its l.5405-5406;
   `Caddyfile:117-121`). If Rich wants our own server in that walk, our steps 3–5 must land first.
7. **A window between Task 5's commit and the restart: none named, and its order leaves none.** Step 1 tells us and
   *"agree[s] when it adopts"*; Step 6 runs `demo-journey`, `demo-token` and `demo-frontend` through the edge on the new
   names, which needs 7100 restarted on Task 5's code **before** the commit; Step 7 commits *"after the front-end's
   reply"*. **So our edge-mode adoption must land before Step 6's restart.** Mock mode is untouched throughout. Every
   restart signs everyone out (`cp-start.sh` makes a new `MANIFEST_SESSION_SECRET`). **Recommended:** Step 1's message
   names that restart as the moment, and the sitting announces it.

**What this changes in our test-first order:** step 4 (the name `whoIs` forwards) becomes *ask through the edge*, if the
platform keeps recommendation 1: its failing test asserts the request goes to `https://app.manifest.internal/v1/me` with
exactly `__Host-manifest_session=S`, and our server then needs to trust the platform's CA (`pnpm dev` already runs with `--use-system-ca`; check that
the system store holds the platform's root, or set `NODE_EXTRA_CA_CERTS`). Steps 3–5 land before the platform's Task 5 Step 6 restart (answer 7).

---

## Part one, adopted: contract 1.6.0 — 2026-10-03 (the 1.6.0 adoption sitting, overnight, mock mode)

*Spawned by `manifest-3d`, the night's coordinator, at Rich's night plan (manifest's `docs/superpowers/2026-09-30-decisions.md`,
2026-10-03 ~01:10 PDT: *"the contract 1.6.0 adoption once sitting 2 lands"*). Against manifest `1b404f2` (the faculty-ready
sitting 2's close), then `7b85326` (its sitting 3's Task 5) under us. Our server in mock mode throughout; 7100 untouched.*

**What landed** (Step 0, re-read from `openapi.json`): **1.6.0, 72 operations, 142 codes**, none added or removed. FE-30
(`71df40d`), FE-29 (`95843e2`), FE-31 (`3d73adf`), FE-50 and FE-51 (`e355d10`), the review's `70c3964`; `api-findings.md` has
each. The answers above held: `requestId` is the envelope's **last** key (answer 5), and `ManifestApiError`'s fourth argument is
optional (answer 2), so none of our three-argument constructions moved.

**What we built**, test-first, one commit each:
- `5ea2275` (server): `POST /api/problems` takes `requestId`, a UUID or `null`, into `problems.platform_request_id`, the column F2
  left waiting; anything else under the key is `400 PROBLEM_INVALID`.
- `b331142` (web): `refusalOf`'s refused kind carries `requestId`; **`reported(refusal)`** is the one statement of what a report of
  a refusal carries (code, an HTTP status, the id; never a message), used by every report made from a platform refusal:
  `TroubleNotice`, `pressFailed`, *Describe*, *Name it* (both), *Building*, the plan. In passing: `UNEXPECTED`'s status `0` was
  sent and our server refused it (`status < 100`), so those reports were lost; it is no longer sent.
- `3746337` (server): `PlatformRefusal.requestId` (`CommitRefused` too); a round's needs-you reference, a step our work runs
  (`work.ts`), and a sandbox secret refused keep it in the row and the operator line. Never in a frame or a view.
- `79cf355` (web, FE-29): moment 3's two limit sentences read `error.limit.resetsAt`.
- `fa80bf0` (web): **`refusedLine(refusal)`**, every refused read's console line, names the id (six places).
- `d5e1274` (server, m125): a session start the platform refused, worded as the model's (`AGENT_BUDGET_EXHAUSTED`, the `AI_*`
  codes), keeps its id: `ModelError.requestId`, into the round's and the work's rows.
- `3518242` (both, m124): our refusals that relay the platform's (the project's hand-over, a change's ask, the watch's
  hand-over) carry its id as `error.platformRequestId` beside our code; `OurRefusal.requestId` and **`ourReported()`** report it.
  And two reports `b331142` missed: *Name it*'s `mintToken`, and the shell's refused `getMe`.

**Decided here (ours), with what changing course costs:**
1. **The person is shown our reference, as before, and never the platform's id** (C3; F2's Decision 11, Rich's: *"If you contact
   support, quote 7F3A-9C21."*). The platform's guide says *"Show a refusal's id to the person and keep it in your own log"*: ours
   is shown **through** the reference, whose row now names the platform's request, and kept in our logs. No new words. *Rejected:*
   a second line with the UUID (machinery to a faculty member, and two references to quote); replacing our reference with the
   platform's id (a problem of ours, or nothing answering, has no platform id, and the person would meet two kinds of reference).
   *Cost to change:* `SupportReference` takes an optional id and one sentence, Rich's. **This is open question 11 above,
   answered our way; Rich confirms or changes it.**
2. **The platform's `resetsAt` first; our copy of its two rules only when it states none.** When the platform says `null` (the
   gateway reported no reset) or sends no limit, the sentence still says when, from the contract's own rule (the next Vancouver
   midnight; the first of the month, 00:00 UTC), as before: Rich asked that a person always hear when. The daily limit's
   `resetsAt` is computed by the platform's database and never `null`, so for it our rule is now a fallback that should never be
   said. *Rejected:* time-less sentences for `null` (new words, and less than Rich asked); keeping our rule first (the drift
   FE-29 was about). *Cost to change:* delete `vancouverMidnightAfter` and `monthResetsAt`'s two uses here and add two sentences.
3. **The agent budget's month card and moment 5's allowance are unchanged.** They already read `getAgentBudget`'s `resetsAt`,
   the same gateway fact as `AGENT_BUDGET_EXHAUSTED`'s `limit.resetsAt` (both `null` before a first session), so reading the
   refusal's would remove none of our copy. The stale-budget case is m126. *(The platform's notice said "F5b's limit cards": F5b has
   none; it meant these, F2's and F3's.)*
4. **`error.session` has no use here**: every start we make takes a fresh `Idempotency-Key` (the intake's per press, the agent
   session's per call), so `*_SESSION_ALREADY_STARTED` never reaches us, and nothing of ours guesses a session by name. A start whose
   answer is lost still leaves an orphan that spends nothing and expires. *Rejected:* replaying the key on *Carry on* to learn the
   orphan's id and end it (a key kept across a leg, for an hour's unspent orphan).
5. **FE-31, FE-50, FE-51: nothing of ours moves** (`api-findings.md`).

**Negative controls**, each a mutation in a script in the sitting's scratchpad, watched red, restored: the report's key out of
`KEYS` (1 red) and its UUID check off (2); `refusalOf` without the id (4), `reportProblem` without it (2), the notice reporting
the old way (1), status `0` kept (1), `pressFailed` without the helper (1); `refusalFrom` without it, the round's reference without
it, `work.ts` without it, `publishRefusal` without it (1, 1, 1, 2); `intakeRefused` ignoring the platform's time (3), `refusalOf`
without the limit (2), *Describe* passing none (1); `refusedLine` without the id (2); `asked()` without it, the round's
model branch without it (1, 1); the three routes relaying none (3), `OurRefusal` reading none (1), `pressFailed`'s ours branch
without it (1), the shell's refusal without it (1). **FE-29's code and m124/m125's were written during a platform HOLD, before
their tests could run**: for those, the controls are the evidence the tests guard the code.

**The gates at the close** (on the final code tree, `3518242`): `pnpm test` **2722 tests, 106 files, twice** (2689 before: 33
new), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, all clean; **the seven acceptance scripts** in mock mode, each run
from a fresh dev database, three times (the first on a tree mid-sitting): `check-seeing` 8, `check-going-live` 8, `check-slice`
8, `check-describing` 18, `check-building` 12, `check-together` 13, `check-keeping` 12, every one passing. **One slip, ours:** a
single-file run at ~03:41 started a minute after the flag turned HOLD (it was read beside the run, not gating it); every run
after was gated on the flag.

**Found** (`minors.md`): m124 and m125, fixed the same sitting (above); **m126 open**: the stale-budget case could read
`error.limit`.

**For part two, the `__Host-` cookies** (the platform's sitting 3, Task 5, **committed at `7b85326`**, still 1.6.0):
- **`createManifestClient` now names the cookie by the scheme of the origin it is given** (`sessionCookieFor(baseUrl)`:
  `__Host-manifest_session` on https, the plain name on http; `SESSION_COOKIE` kept, deprecated, as the http name). Our `whoIs`
  replays to `platformOrigin`, `http://127.0.0.1:7100` in edge mode, so the client sends the **plain** name, which the control plane
  on an https origin (its `originOf` falls back to the console's) no longer reads: **once 7100 runs `7b85326`, edge mode's
  `whoIs` is nobody until part two lands**. Mock mode (`http://127.0.0.1:7102`) is untouched: our suite was green on `7b85326`
  (2714, then 2722). Answer 1's recommendation (b), `whoIs` asking through the edge, is the way the client's rule makes right,
  and the platform now says so itself: its sitting 3's review (`d4291dd`) documents that `sessionCookieFor`'s `baseUrl` is an
  origin Manifest serves, *"NOT the control plane's own port"*, names our `whoIs` as the client a replay to the port signs out,
  and pins the port's name (`__Host-manifest_session`) in its `auth.test.ts`. Its sitting 3 closed at `f6b9ee8`.
- Steps 3–6 above stand; step 2 (this part) is done, and `check-slice.sh:78`'s pattern held (`requestId` comes last).

---

## Part two, adopted: the `__Host-` cookies — 2026-10-03 (the `__Host-` adoption sitting, overnight, mock mode)

*Spawned by `manifest-3d`, the night's coordinator, at Rich's night plan (manifest's `docs/superpowers/2026-09-30-decisions.md`,
2026-10-03 ~01:10 PDT: *"the __Host- cookie adoption once sitting 3 lands"*). Against manifest `f6b9ee8` (the faculty-ready
sitting 3's close: Task 5 `7b85326`, its review's `d4291dd`), with the platform's sitting 4 (`plat-s4`) running beside us; every
Vitest run of ours gated on its flag. Our server in mock mode throughout. Its notices: `notice-cookies-s3.md`, both.*

**What landed** (still **1.6.0**): on an https origin the three cookies are `__Host-manifest_session`, `__Host-manifest_login`
and `__Host-manifest_stepup`, Secure, `Path=/` (login and step-up moved from `/auth`), no `Domain`; a plain `manifest_session`
there is not read (the platform's Decision 8). Loopback http keeps the plain names, so the mock and our mock mode are unchanged
by design. `sessionCookieFor(baseUrl)` names the cookie by the scheme of `baseUrl`, **an origin Manifest serves, never 7100's own
port** (`d4291dd`): the platform judges a request to the bare port as the console's https origin and reads `__Host-` there,
while the client, reading `http:`, sends the plain name. So our edge-mode `whoIs`, replaying to `http://127.0.0.1:7100`, found
nobody (the second notice). Answer 1's recommendation (b) is what we built.

**What we built**, test-first, one commit each:
- `39b4a0b` (server): **`whoIs(cookieHeader, config, fetch?)`** reads `sessionCookieFor(config.origin)` alone (where the browser
  reached us: `__Host-manifest_session` through the edge, `manifest_session` in mock mode) and asks at **`Config.sessionOrigin`**,
  a new field: `https://app.manifest.internal` in edge mode (through the edge, where scheme and Host agree, so the client
  forwards `__Host-`), `http://127.0.0.1:7102` in mock mode. `platformOrigin` stays the address of every call with a token.
  `whoIs` takes the config, not an address, so neither caller (`/api/me`, the guard) can pass the wrong one. Its tests run every
  case in both modes; edge mode's https request reaches a fake through the client's own `fetch`, which records the address the
  client ASKED. The test platform (`api/testing.ts`) reads the plain name **exactly** (it is an http origin, as the mock is);
  `AS_ALICE`…`AS_DANA` are the `__Host-` name a browser sends us; `check-together.ts` the same.
- `68bbbcb` (scripts): every `check-*.sh` reads curl's jar by its name field (`jar_holds`, `$6`), never a substring, under
  `$APP`'s scheme's name; `check-slice.sh` sends its nonsense session under that name in both modes, and says why step 7 cannot
  tell the names apart. The walk's `signIn` is signed in only by `sessionCookie(app)` (was `/manifest_session$/`, either name);
  its jar carries `__Host-manifest_login` across the three hops as it is (it keeps any name and ignores `Path`). The walk's
  self-test: 55 (two new).
- `7ef6bea`: our server's start line names where `whoIs` asks.

**Decided here (ours), with what changing course costs:**
1. **A plain `manifest_session` beside `__Host-manifest_session` is ignored, not "two are none"** (the note's question 9,
   answered our way, after the platform's own Decision 8, which Rich approved for the platform). Rich's FE-28 (b) stands for
   two of the name read. Reason: a sibling app can set only the plain name; keeping it fatal would let any app on the zone sign
   a person out of ours, which is what the rename exists to stop. *Rejected:* counting both names (that denial of service);
   reading either name (FE-28's harm through our door). *Cost to change:* one filter in `identity.ts`'s `sessionIn`, and two
   tests. **Rich confirms or changes it.**
2. **Edge mode asks through the edge** (answer 1's (b)), not 7100 with a client option (a) or a platform change (c). It needs
   our server to trust the edge's CA: `pnpm dev` runs with `--use-system-ca`, and the System keychain holds *Caddy Local
   Authority - 2026 ECC Root* (measured: the proof below ran with `--use-system-ca` and no `NODE_EXTRA_CA_CERTS`). *Cost to
   change:* `SESSION.edge` in `config.ts`.
3. **The test platform is an http Manifest origin and reads the plain name**: the API tests' configs ask it as their
   `sessionOrigin`. Edge mode's exact forward (`https://app.manifest.internal/v1/me`, exactly `__Host-manifest_session=S`) is
   held by `identity.test.ts` and `readConfig`'s tests (*"the name we read is the one we forward"*). *Rejected:* an https fake
   (a certificate and a CA per test process), or a `fetch` threaded through `Config` into ten route modules.

**Negative controls**, each a mutation in a script in the sitting's scratchpad (`controls.py`), watched red, restored and
checked by hash: `whoIs` reading the plain name too (4 red); the name read from the asked origin instead of ours (8, in
`guard.test.ts`: `identity.test.ts` cannot see it, since the two agree in every real config, which `app.test.ts` holds); asking
7100 itself (4); two of *any* session name none (6); the test platform unanchored again (1); `AS_ALICE` plain (15); edge
mode's `sessionOrigin` 7100 in `config.ts` (3). The scripts: the jar asked for `__Host-` in mock mode (`check-slice` step 4
red); the old substring check shown green on a jar holding only `__Host-` and the new one red (`jar-control.sh`); the walk's old
suffix check back (the self-test 54/55).

**Proved on 7100** (`plat-s3`'s `d4291dd`, at `manifest-3d`'s word and Rich's standing yes for the laptop IdP's test passwords;
the flag FREE; headless, from Node, `instructor`; nothing created; `proof.mts` in the scratchpad, no value or password printed):
hop 1 (`/auth/login`) set `__Host-manifest_login` (`Max-Age=600; Path=/; HttpOnly; Secure; SameSite=None`); the ACS
(`/auth/saml/callback`) set `__Host-manifest_session` (`Max-Age=43200; Path=/; HttpOnly; Secure; SameSite=Lax`, no `Domain`)
and cleared the login cookie; `/v1/me` through the edge answered *Test Instructor*; **our `whoIs` with `readConfig({})` (edge)**
answered that person, by `/v1/me`'s id, nobody for the same value under the plain name, and the `__Host-` person with a plain
one beside it; the old request (7100 itself, the plain name) `401`; 7100 itself with `__Host-` `200`; the plain name through
the edge `401`. Sign-out cleared the cookie (`Max-Age=0; Path=/; Secure`); the value still answered `200` afterwards, as the
spec's Phase 1 divergence says it will (§20: stateless sessions, *"a session cannot be revoked before its own expiry"*). Our
server stayed in mock mode: the proof imported `whoIs` into a Node process of its own.

**The gates at the close** (on the final code tree, `5d17771`): `pnpm test` **2742 tests, 106 files, twice** (2722 before: 20
new), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, all clean; the walk's self-test 55/55; **the seven acceptance scripts
in mock mode**, in ORIENTATION's order, against our mock restarted on Task 13's fixture: `check-seeing` 8, `check-going-live`
8, `check-slice` 8, `check-describing` 18, `check-building` 12, `check-together` 10 and 13, `check-keeping` 8 and 12, every one
passing (and `check-seeing` and `check-slice` once more each, before). **On the dev database as it was**, not a fresh one:
stopping our server's tree was refused by the session's classifier (*Interfere With Workloads*, as ORIENTATION §7 warns), so a
fresh-database run is Rich's or an allowed session's. Stopping and restarting our mock on 7102 was allowed.

**Still owed** (§8 of this note's test-first order): Rich's own click on `app.` with our server in edge mode (DevTools shows
`__Host-manifest_session`; a leftover plain cookie changes nothing; moment 14's step-up at `Path=/`; sign-out); and `MODE=edge
bash scripts/check-slice.sh` against our server in edge mode. Both at the next sitting on 7100 (F5b sitting 1), which is no
longer blocked by this.

**Beside it, the platform's Task 13** (sitting 4, in its working tree at 05:27): `Token.mintedBy` required turned our typecheck
red at two hand-built fixtures; the minimal fix only (`5d17771`), at `manifest-3d`'s word. Using it is the next sitting's.

---

## Part three, adopted: the platform's sitting 4 (Task 13, FE-49 and FE-52; Task 6, F8) — 2026-10-03 (overnight, mock mode)

*Spawned by `manifest-3d`, the night's coordinator, at Rich's night plan (manifest's `docs/superpowers/2026-09-30-decisions.md`,
2026-10-03 ~01:10 PDT). Against manifest **`0d5a743`** (Task 13, committed 05:35) and its review's fix **`d8ce094`** (descriptions
only in `packages/contract`, the mock untouched; nothing moving after it, read at 06:45; the platform's sitting 4 closed at `3d7d38c`), with Task 6 at `5effd5e`; the platform's sitting 4 (`plat-s4`) closing beside us, its
HOLD (05:38–06:37) waited out before any Vitest of ours. Our server in mock mode throughout; 7100 untouched. Its notice:
`notice-s4.md`, *Task 6* and *Task 13*.*

**What landed** (still **1.6.0**, additive): `Token.mintedBy: Uuid`, required (*"Only they may revoke it"*), on `listTokens`,
`mintToken`'s `token` and `revokeToken`'s answer; the mock's `TOKEN` names its own person. `pending_action.expired`
(`{ pendingActionId, tokenId, action, cause: token_revoked | member_removed | project_archived, by }`), one per question,
published after a person's act ended the token, **never when a question simply runs out of time**. `revokeToken` (and a
member's removal) ends the token's waiting questions in the same transaction. **A question's `expiresAt` is capped at its
token's.** Task 6 (F8): a provider's `422` answers `422` with a JSON body, **a streamed request before any stream begins**.

**What we built**, test-first, one commit each:
- `5e656e4` (web, server): ***Agents* names each maker by `Token.mintedBy`** against `getMe`'s id: *(yours)* and **[Revoke]** on the
  reader's own, wherever it was made (the console's too); anyone else's *"Made by <name>"* (`listMembers`, now read with the
  page) and *"Only the person who made it can revoke it."*, no press; a maker the list does not name, no name. **Dropped**: our
  server's answer of who made an agent (`KeptTokens.agents[].by`, read from the `minted` row's person and `persons`): it stood
  only for FE-49, and a member's word could name someone else as an outside token's maker (m122's *agents* half). **Kept**:
  the `minted` rows themselves and every id (*Our agents* are told from theirs by them, which `mintedBy` cannot do: our page
  mints them all in the person's own session); an agent row's **name** (the keeper's email names the agent: the watch token
  cannot `listTokens`), its **expiry** (below), its **person** (a removal forgets their rows, Decision 5); `…/minted`'s
  `agents` as ids alone (the walk's `tidy` keeps them). m127: every fixture's maker true to its story.
- `2755283` (web): **[Revoke] without its reject step** (Decision 16's workaround): a revoke is said and the list read again; the
  platform has already ended that agent's questions, so the re-read finds none waiting (each reject would now be `409
  PENDING_ACTION_RESOLVED`). *"This agent was revoked."* (the reason sent to the agent) is gone with it.
- `d6037d8` (server): **`pending_action.expired` as the platform sends it**, every cause: our keeper writes every event to history,
  and the band's questions already counted `.expired` as an end (sitting 5 wrote it ahead, for FE-52's option (a)); now held
  at the API (`/api/needs`, for owner and helper) and in `check-together.ts`'s check 8 (run by `check-together.sh`: a question of
  Sam's agent, then its `.expired`, gone from both bands; its check 7 of `check-together.sh` reads an agent's id alone now). **A question waits no longer than its token, where we know the token's end**: the band's
  need and the owners' email said *its day* (the event carries no expiry, S1: M4); for an agent our page let in, the kept
  expiry now caps it (`tokenEndsOf`), as the platform does.
- `f84c6bf` (server, tests): F8's `422` held with the platform's exact body, and as a **streamed** request's (our model calls all
  stream): `client.ts` already read the status before the stream, so **m62 no longer applies**.

**The review's fix** (`d8ce094`, ~06:15): an ask whose token is ended between authenticating and recording its question now
answers `401` and records no question; once a person ends a token, every call it makes (`getPendingAction` included) is `401`,
while the person sees the question `expired`. **Nothing of ours meets it:** no agent of ours asks with a token for the four
(our server calls no `promoteRelease`, `addMember`, `setQuota` or secret read: ours never asks), and a token's `401` reads as
before (a round's `token` need, `round.ts`; the stream's refusal, `stream.ts`; the plan's, `plan.ts`).

**Decided here (ours), with what changing course costs:**
1. **The maker's name from `listMembers`, read with the page** (a fourth read in its `Promise.all`; its refusal is the page's,
   as the other three). *Rejected:* our server naming makers from its kept members (a copy of the platform's list, stale by
   design); `useRole`'s read lifted to share (app-level plumbing for one name). *Cost to change:* one read and `rowsOf`'s third
   argument.
2. **`pending_action.expired` says nothing of its own on our pages.** Its sentence names who acted, but each act is said where
   it is done (the revoke's *"Revoked. It can't do anything on <App> now."*, People's *"<Name>'s work on <App> has stopped."*,
   the switch-off's), and a question is a need, never a line of the history (Task 12). Someone looking at a card that ends
   meanwhile still reads *"It has stopped waiting."* at their press (`PENDING_ACTION_RESOLVED`). **No new words.**
3. **The question card still says *"Your agent '<name>'"*** to an owner for a helper's agent, as before; `mintedBy` now lets us
   say whose, but the words are Rich's (m129).
4. **A token we did not mint** (the console's, an API mint) **keeps the band's and the email's day** (we cannot read its
   expiry: `listTokens` is a person's call, and the event carries none): the card on *Agents* reads the platform's capped
   `expiresAt` and is right; the band may say it a little longer (m130; and the expiry a member hands over is trusted, m131). *Rejected:* the keeper reading every question
   (`getPendingAction` refuses the watch token another token's question, S1: M4).

**Negative controls** (`controls.py` in the sitting's scratchpad; each a mutation, its named tests watched red, restored and
checked by hash): *Agents*' maker read as nobody's (`Row.minter`'s id `''`: 15 red, `model.test.ts` and `agents.test.tsx`); the
members not passed to `rowsOf` (2 red: *"Made by"*, and the made-elsewhere test); a reject sent again after a revoke (3 red); `.expired`
out of `ANSWERED` (5 red: `happenings.test.ts` 2, `keeping.test.ts` 3; and `check-together.ts`'s check 8 red, 12 of 13); the cap
ignored in `questionsOf` (3 red: one each in `happenings`, `keeping`, `keeper`); the keeper passing no ends (1), `needsOn` passing
none (1). The review's note stands: the revoke test's last card count is held by `askingOf`'s own token check too, so what holds
`2755283` is `rejectPendingAction` called never and the one re-read.

**The gates at the close** (on the final code tree, `f84c6bf`): `pnpm test` **2752 tests, 106 files, twice** (2742 before: 10
new), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, all clean; **the seven acceptance scripts in mock mode**, in ORIENTATION's
order, against our mock restarted at 06:40 (the contract's dist rebuilt from `d8ce094`): `check-seeing` 8, `check-going-live` 8,
`check-slice` 8, `check-describing` 18, `check-building` 12, `check-together` 10 and 13, `check-keeping` 8 and 12, every one
passing, **on the dev database as it was** (stopping our server's tree is the classifier's to refuse, ORIENTATION §7: not
tried). Our server on 7105 runs this code (`tsx watch` reloaded it); no restart owed.

**A fresh read-only review** (a spawned agent, during the HOLD, nothing run): no defect in the product code; it found two test
setups that would have failed on the store's foreign key (`minted.person_id` names a remembered person: fixed before the first
run), `check-together.sh`'s check 7 still reading the dropped `by` (fixed in `5e656e4`), two stale comments (fixed), two
places this record named the wrong script (fixed), the walk-through over-saying the cap (fixed), and **m131** (a member's word
for an agent's expiry caps its question here: m122's kind, written).

**Owed / open:** m129 (the card's and the email's *"Your agent"* for someone else's agent: Rich's words), m130 (the band's day for
a token we did not mint), m131 (the expiry a member hands over is trusted), m122's *watch* half (a watch hand-over's id
unchecked). Nothing on 7100.
