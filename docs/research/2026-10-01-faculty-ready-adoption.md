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
