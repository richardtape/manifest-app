# Deferred minors — an inventory for Rich

*Collected 2026-10-01 by manifest-app-3a from the dated entries of F2, F3, F4, F4a and F5, each checked against main at
`238e6a0`. Nothing here is fixed: Rich chooses.* *Seven were fixed at his word (m1–m4, m14, m19, m63; 2026-10-02):
see* Already fixed *and its dated entry.*

**How to read it.** Each minor has an ID (`m1`, `m2`…) for this page only. **From** names the plan and the dated entry
it was recorded in: F2 is [`plans/2026-09-27-f2-describing-it.md`](./plans/2026-09-27-f2-describing-it.md), F3
[`…-f3-building-it.md`](./plans/2026-09-28-f3-building-it.md), F4 [`…-f4-seeing-and-changing-it.md`](./plans/2026-09-28-f4-seeing-and-changing-it.md),
F4a [`…-f4a-only-faculty-build.md`](./plans/2026-09-29-f4a-only-faculty-build.md) and F5
[`…-f5-going-live.md`](./plans/2026-09-29-f5-going-live.md). Where an entry says only *"N Minors deferred (the
ledger)"*, the minor's own words are in that plan's ledger, `.superpowers/sdd/<plan>/progress.md` (git-ignored, on this
laptop only), and **ledger NN** is its line there. F3's sitting 7 entry lists none of its ten: they are all ledger lines.
**Where** is the code at `238e6a0`; the working tree holds F6 sitting 4's uncommitted edits to `round.ts`, `lead.ts` and
`apps.ts`, so a server line there can sit a few lines lower until they land. **Size:** S is under an hour (a word, a
style, one test and a few lines); M is a sitting's task (a few files, tests); L needs design, or Rich, or touches the
platform's contract. **Affects:** *accessibility* (a legal requirement: real controls, labels, visible focus, never
colour alone), *faculty-visible* (a screen a faculty member sees), *robustness*, *tests-only*, *scripts*. Each was
checked by reading the code it names, and the check is in the cell.

## Still true

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m5 | F2, *After F2: the deferred Minors* (*"Two cosmetic things, left"*) | The window-behind notice (*"The plan changed in another window…"*) has space beneath its one line. | `packages/web/src/screens/plan/plan.tsx:360`: a bare `<p className="body-lead">` in a flex `Card`, keeping the browser's paragraph margins. | S | faculty-visible |
| m6 | F2, the same entry | At 375 a support reference in a field's message breaks at its hyphen. | `screens/name-it/name-it.tsx:319` puts the reference in `FieldMessage.body`, a plain string (`packages/ui/src/FormField.tsx:12`), with nothing keeping it whole. | S | faculty-visible |
| m7 | F5 sitting 3, review (ledger 118), *"for Rich's click"* | A held clock (someone has it) is filled lighter than the not-started hatch, so it can look emptier than one not started. | `packages/ui/src/components.css:201-203` (`--waiting-tint`). | S | faculty-visible |
| m8 | F5 sitting 4, review (ledger 183), *"for Rich's click"* | The administrator's reason is quoted inline in ‘ ’; moment 13 puts it behind the Card's one left rule. | `packages/web/src/words.ts:713` and `:735`; drawn as the row's sentence (`sign-off.tsx:74`). | S | faculty-visible |
| m9 | F5 sitting 6 (first half), whole-branch review M5' (ledger 283) | A clock record in a state we do not know, with a day we cannot read, passes an empty label, so *"Nothing counting yet"* shows beside *"We can't tell right now"*. | `going-live/clocks.ts:121-127`; the empty label falls to `ProgressBar`'s default at `packages/ui/src/ProgressBar.tsx:24`. | S | faculty-visible |
| m10 | F5 sitting 5, review M2 (ledger 240) | *"You're signed in again."* is said again after a gate refusal, when the card is drawn again. | `going-live/live.tsx:153` (`pressedOnce` is the card's own state) and `:488`; the card unmounts and remounts at `going-live.tsx:268`. | S | faculty-visible |
| m11 | F5 sitting 4, review (ledger 182) | A failed approval read says *"We can't tell right now whether it's been signed off."* with no support reference, only a `console.warn`. | `sign-off.tsx:72`; the read's failure is only warned at `going-live.tsx:44-50`, `:78-80`. | S | faculty-visible |
| m12 | F4 sitting 7, M11 (ledger 719) | The *Interrupted* card files a `ROUND_INTERRUPTED` problem, with a reference, for a fix that reached the front after a restart and never started. | `screens/building/needs.tsx:57-58` reports on every *Interrupted* card; `withoutToken` (`build/round.ts`, near its end) saves such a fix as `interrupted`. | S | faculty-visible |
| m13 | F4a sitting 1, deferred (ledger 91) | `useKeeps` draws the page as loading again when `getMe` is read again with the same answer, since it is keyed on the object. Only after a `BUILDING_NOT_OPEN` signal. | `packages/web/src/screens/keeps.ts:59` (the effect's `me`) and `:61` (`kept.me === me`). | S | faculty-visible |
| m15 | F5 sitting 6 (first half), whole-branch review (ledger 302 only) | On *Trying out*, after a first deploy that never answered, *"Serving right now"* can name the failed attempt, which the platform names as the address's instance when no route serves one. *Going live* already sets it aside. | `screens/trying-out/put.tsx:389-395` takes `staging.instance` as it comes; compare `going-live/live.tsx:430`. | S | faculty-visible |
| m16 | F5 sitting 4, review (ledger 181) | Two millisecond races in the sign-off row: a decision landing between the checklist's read and the approval's draws the wrong sentence until the next read. | `going-live.tsx:66-79`: the checklist first, the approval after. | S | faculty-visible |
| m17 | F5 sitting 3, review (ledger 116) | A failed quiet re-read (the page shown again) replaces a good page with the trouble notice, and files a new report at every tab switch while Manifest is out of reach. | `going-live.tsx:198-203` (any failed read sets `trouble`) and `:216-223` (each `visibilitychange` reads again). | S | faculty-visible |
| m18 | F3 sitting 7, review (ledger 213) | The cost line at *built* can be stale: the round's end never reads the cost again. | `build/round.ts:1379` (`end`) calls no `refreshCost` (`:384`); answers read it at most every 5 s. | S | faculty-visible |
| m20 | F4 sitting 7, M3 (ledger 711) | Several secrets set at once: one refused after another was set empties both fields, and both are typed again. | `screens/trying-out/parts.tsx:168-171` empties every field on send; the loops at `put.tsx:553-559` and `going-live/live.tsx:347-354`. | M | faculty-visible |
| m21 | F5 sitting 5, review M10 (ledger 244) | A dropped connection on the live deploy (a `TypeError`) is said as *didn't go*, without one read of the live address. | `going-live/live.tsx:279-283`: only our deadline reads on; anything else ends at `:305` (`didNotGo(error, 'deploy')`). | M | faculty-visible |
| m22 | F5 sitting 6 (first half), own review M1 (ledger 314) | Before a launch, the Preview can call an older failed dry run *"the last attempt"*, even after a newer one passed and was taken down. | `screens/preview/facts.ts:64-69`: with nothing served, `after()` counts every failed instance; `:98-99`. | M | faculty-visible |
| m23 | F5 sitting 6 (first half), own review M3 (ledger 316) | The dry run's endings never give way: *didn't start* with no incident has no button until a reload; *passed* and *failed* outlive a reading that names a new version. | `going-live/dry-run.tsx:191-195` gives way only when the row is met; `:412-425` (no action without an incident). | M | faculty-visible |
| m24 | F4 sitting 7, M5 (ledger 713) | The line is the app's, but its words and link are the person's: *"…which is waiting for you"*, and a link to another member's conversation that answers `404`. | `packages/server/src/api/line-state.ts:86-96` carries no owner; `screens/change/waiting.tsx:96-107`. | L | faculty-visible |
| m25 | F2, *After F2: the deferred Minors*, item 1 (ledger 194) | The FE-20 honesty check reads only *Who gets in*: a class-only promise in another part, or in *Things we assumed*, passes. **Rich deferred it** until the class-limited sign-in lands (FE-20). | `packages/server/src/agents/plan.ts:127` and `agents/change.ts:134` rewrite `whoGetsIn` alone. | L | faculty-visible |
| m26 | F3 sitting 7, review (ledger 211) | The dependency guard does not hold `peerDependencies` or `bundleDependencies`: a change there passes, and `npm ci` then fails on the lock (one build try wasted). | `packages/server/src/build/guards.ts:78-83` (`LOCKED`). | S | robustness |
| m27 | F3 sitting 7, review (ledger 218); F4 sitting 7, M9 (ledger 717) | A guard's reason that echoes a path shaped like a key (`public/sk-1.js`) trips the trace's credential check, and the leg ends `INTERNAL`. | Reasons echo the path at `guards.ts:145`, `:152`, `:156`, `:186`; traced at `runtime/run.ts:104`; refused at `store/runs.ts:160`, `:288`. | S | robustness |
| m28 | F4 sitting 7, M7 (ledger 715) | Their words while it worked are marked noted even when `docs/plan.md` no longer reads back, so a hand-edited plan never gains them, silently. | `build/round.ts:975` (`break`) then `:1004` (`d.noted = read.length`). | S | robustness |
| m29 | F4a sitting 1, deferred (ledger 93) | The expired card is drawn twice in `app.tsx` (the shell's, and while we look): one component would do. | `packages/web/src/app.tsx:157-164` and `:363-369`. | S | robustness |
| m30 | F4a sitting 1, deferred (ledger 95) | The platform's fetch raises the *not open* signal for a `403` from any operation, `getMe` included; a `getMe` answering `BUILDING_NOT_OPEN` (the contract rules it out) would loop. Raise on non-GET only. | `packages/web/src/platform/api.ts:174-181`. | S | robustness |
| m31 | F5 sitting 2, review (ledger 37) | A non-2xx whose body stalls is said as a stall (`MODEL_STALLED`), not its status's refusal. | `packages/server/src/model/client.ts:249-256`. | S | robustness |
| m32 | F5 sitting 2, review (ledger 40) | A 2xx with no body waits out the first-word deadline and reads as a stall. | `client.ts:264` (an empty `ReadableStream` that never closes). | S | robustness |
| m33 | F5 sitting 2, review (ledger 41) | `"error": null` in a chunk is read as an error. LiteLLM omits nulls today. | `model/stream.ts:41` (`!== undefined`). | S | robustness |
| m34 | F5 sitting 6 (first half), own review M4 (ledger 317) | A `null` body with a trailing newline (or `data: null` with no blank line) is `MODEL_UNREACHABLE`, not FE-34's refusal. Only if LiteLLM appends one. | `stream.ts:94-97`: `null\n` is consumed as a line, and the buffer is empty at the end. | S | robustness |
| m35 | F5 sitting 2, review (ledger 38) | A mid-stream `MODEL_UNREACHABLE` is billed for what streamed, but leaves no trace entry and forces no cost read; only stalls do. | `build/round.ts:548-553` traces stalls alone; `client.ts:233` carries no `received`. | S | robustness |
| m36 | F5 sitting 2, review (ledger 39) | The stall's forced cost read comes before the gateway's spend settles (within 60 s), so the line shows the old figure until *Carry on*. | `round.ts:446`. | S | robustness |
| m37 | F5 sitting 2, review (ledger 42) | `fetch` is taken when the model is made, not when it asks (the cause of two stray test requests to the real LiteLLM). | `client.ts:188` (`fetch: send = fetch`). | S | robustness |
| m38 | F5 sitting 2, review (ledger 44) | `TraceEntry.received` is required, but trace rows written before F5 lack it. Nothing reads it yet. | `packages/server/src/runtime/trace.ts:22`. | S | robustness |
| m39 | F5 sitting 2, review (ledger 45) | `received.chars` counts UTF-16 code units, and says *characters*. | `client.ts:273`. | S | robustness |
| m40 | F5 sitting 6 (first half), own review M5 (ledger 318) | The lead's view of a failed dry run names details asked for and never carried, but not details carried and never asked for. | `packages/server/src/agents/lead.ts:190-201`. | S | robustness |
| m41 | F5 sitting 5, review M5 (ledger 241) | Our five more minutes after a cut deploy are 300 timer ticks, which a hidden tab stretches; overlapping reads are not skipped. | `going-live/live.tsx:381-383`; `trying-out/put.tsx:318-320`. | S | robustness |
| m42 | F5 sitting 5, review M7 (ledger 242) | A failed `listInstances` at the press is reported under the operation `getLaunchReadiness`. | `live.tsx:245-259` (one `catch` for the whole press read). | S | robustness |
| m43 | F5 sitting 5, review M9 (ledger 243) | The 2-s incident re-read is not cancelled when the card goes (one read, its answer ignored). | `trying-out/parts.tsx:67-74` (`incidentLater`). | S | robustness |
| m44 | F5 sitting 6 (first half), whole-branch review M3' (ledger 280) | Our deadline is recognised only as `TimeoutError`; a browser rejecting with the older `AbortError` would say *couldn't* while the deploy goes on. Every browser we support says `TimeoutError`. | `trying-out/parts.tsx:33-35` (`cutByOurDeadline`). | S | robustness |
| m45 | F5 sitting 4, review (ledger 188) | The Overview reads the checklist only while the draft serves something, so a stale lookup of a launched app with nothing on its draft never hears the launch until a reload. | `overview/overview.tsx:59`; `your-apps/model.ts:126-131` (`beforeLaunch`). | S | robustness |
| m46 | F3 sitting 7, review (ledger 215) | A round left needing a token across a restart: opening the page mints a token and presses *Carry on* by itself, starting a session nobody pressed for. | `screens/building/building.tsx:157-166`: any page that finds `needs: token` renews once, however old. | S | robustness |
| m47 | F4a sitting 1, deferred (ledger 94) | `not-open.test` has no *"any other refusal raises nothing"* case for the platform's fetch, only for ours. | `packages/web/src/not-open.test.ts:33-37`. | S | tests-only |
| m48 | F5 sitting 3, review (ledger 119) | `going-live.test` defines `document.visibilityState` and never restores it; nothing tests that `hidden` reads nothing. | `going-live/going-live.test.tsx:291` and `:389`. | S | tests-only |
| m49 | F5 sitting 4, review (ledger 184) | `students.test`'s `expect(fetched).toEqual([])` proves nothing: the page's fakes never call `fetch`. | `overview/students.test.tsx:259`. | S | tests-only |
| m50 | F5 sitting 4, review (ledger 185) | An `apps.test` title says *"a student app's post is refused first"*, but it asserts `404`, no route. | `packages/server/src/api/apps.test.ts:1011`. | S | tests-only |
| m51 | F5 sitting 4, review (ledger 186) | *Talk it through*'s press has no test for a failed `mintToken` or an ended session. | `going-live/sign-off.test.tsx`: no such case (F4's shared `pressFailed` carries both). | S | tests-only |
| m52 | F5 sitting 6 (first half), own review M7 (ledger 320) | One `Idempotency-Key` per dry-run press is not pinned: a fixed key stays green. | `going-live/dry-run-press.test.tsx:291-296` checks only the key's length. | S | tests-only |
| m53 | F5 sitting 6 (first half), own review M6 (ledger 319) | `check-going-live.sh`'s check 2 does not prove the dry run's details reach the lead's view (`round.test.ts` holds that); its header should say so. | `scripts/check-going-live.sh:171-174`. | S | scripts |
| m54 | F3 sitting 7, review (ledger 209) | Their words read after *Checking it answers*, then a `done` with no new commit, builds the same commit again: a second sandbox instance, about 30 s. F4's *Changes* commit narrowed it to an answer, or a plan that no longer reads back. | `build/round.ts:1259-1260` goes back to the pages; `backToPages` (`:1019-1035`) clears the build; `build()` starts one on the same base (`:1127-1135`). | M | robustness |
| m55 | F3 sitting 7, review (ledger 210) | A deploy cut by its 120-s deadline, or a restart at the draft, deploys the release again; one `listInstances` would adopt the instance. | `round.ts:1184-1186`: `instanceId` is still null, so *Carry on* deploys. | M | robustness |
| m56 | F4 sitting 7, M8 (ledger 716) | A conversation `agreed` with no run holds its app with no way out: `/stop` and `/build` refuse `agreed`. Pre-F3 rows, or a crash in the same tick. | `api/line-state.ts:26` (`agreed` holds); `api/build.ts:124` (`/build`: `building` only) and `:207-218` (`/stop`'s states). | M | robustness |
| m57 | F3 sitting 7, review (ledgers: F3 212, 219; F4 720) | The words guard refuses ordinary English (*"and/or"*, *"for instance"*, *"committed to"*); three identical refusals stop the round (*needs: moves*). Since F4 it also guards each account and the planner's title. | `guards.ts:112-138` (`CODE_WORDS`, `FILE`) and `:167-178`; *instance* comes from F1's machinery list. | M | robustness |
| m58 | F3 sitting 7, review (ledger 216) | `lives` never forgets a conversation, and each keeps every file read, for the process's life. | `round.ts:209` (no `lives.delete` anywhere); `:722`, `:736`. | M | robustness |
| m59 | F4 sitting 7, M6 (ledger 714) | A change agreed on a hand-edited `docs/plan.md` drops the settled questions and the *Changes* history. | `agents/change.ts:156-180`: an unreadable file is `null` (`plan.ts:220`), so `before` and `changes` are empty. | M | robustness |
| m60 | F5 sitting 6 (first half), whole-branch review M4' (ledger 281) | *Stop* does not cut an answer that is streaming; a runaway answer after *Stop* is paid for up to its 15-minute ceiling. | `model/client.ts:194`: `complete` takes no outside signal; `round.ts:544-555`. | M | robustness |
| m61 | F3 sitting 7, *"minor (for the record)"* (ledger 243) | After our server restarts, the round cannot end the old session with the page's new token (`FORBIDDEN`): the orphan runs out its 240 minutes, spending nothing. | `round.ts:484-489`; the refusal is swallowed. | L | robustness |

**m6.** A non-breaking hyphen would stop a copied reference matching, as the entry says. Keep the real hyphen and hold
the reference whole with `white-space: nowrap` on a span of its own. That needs `FieldMessage.body` to take a node, a
design-system change with a parity case. `SupportReference` (`screens/reference.tsx`) can break the same way. Check it at
375 in a walk, with the walk's check run once with the fix removed.

**m7, m8.** Each has a clear fix, but the reviewer left both for Rich's eye at his click, and his F5 click spoke of the
wording only. m7 is one colour token; m8 needs the row to draw a quotation as a block (`row.tsx`), not a string.

**m12.** The card cannot tell an interruption from a fix that never started: both are `interrupted`. A fix marks the
never-started case in the run's detail and draws it without a problem report. Test first: a fix saved by
`withoutToken` draws the card and reports nothing.

**m15.** The same rule *Going live* uses (`live.tsx:428-430`): the attempt itself, named for want of a route, is
nothing there. Test first in `put.test.tsx` with a first staging deploy that fails.

**m17.** The sitting 6 review declined the related *"a notice above a press under way"*. A fix keeps the good page on a
failed quiet re-read, and says the trouble only on a read the person asked for. Test first: a ready page, then a failing
`visibilitychange` read: the rows stay, and no report is filed.

**m20.** The fields were emptied on send by ruling (no secret kept on the page longer than needed). A safe fix re-reads
`listAppSecrets` after a failure and asks again only for what is still not set. Test first: two secrets, the second
refused; only its field comes back.

**m21.** The reviewer partly disagreed: with I1 fixed the button goes once a launch is heard, so no second deploy can
be sent. What stays untrue is the sentence. A fix reads production once (the *unsure* path) before saying *didn't go*.
This is the press that reaches students, so tests first in `live.test.tsx`, and a walk.

**m22, m23.** Both come from the dry run's instances outliving their meaning before a launch. m22 wants the last
attempt counted from the newest instance made, whatever its state, not only failed ones; m23 wants the held endings
keyed to the version they ran on. Each wants a `facts.test.ts` or `dry-run-press.test.tsx` case first.

**m24.** Moment 18 (*Working on it together*) is F6b's, so it waits on that plan's design: whose wait to name, and what a
member may open.

**m25.** Rich, 2026-09-28: *"We actually WILL have a way to do this"*. The check changes when the class-limited sign-in
lands. Recorded at FE-20 in `api-findings.md`.

**m27.** Two fixes, either enough: keep the path out of the traced reason (the lead still gets it in its report), or let
the trace redact a key-shaped run instead of throwing. Test first: commit to `public/sk-1.js` and assert the leg does
not end `INTERNAL`.

**m46.** The renewal is right when the refusal happened while the page watched. A fix renews by itself only when it saw
the round go to `needs: token`, and otherwise shows *Carry on*. Test first: open a page on a round already at
`needs: token`; nothing is minted until a press.

**m54.** Narrowed since F3: a message now gets its own commit to `docs/plan.md` before the build, so the base moves. It
still happens after an answer, or when that commit is skipped (m28). A fix remembers the commit last built healthy and
goes straight to *Checking it answers* when the base has not moved. Test first in `round.test.ts`: an answer during the
build, then `done` with no commit; one `startBuild`.

**m55.** Ruling 15 of F3's sitting 5 chose this cost. One `listInstances` of the sandbox before deploying again would
adopt an instance on this release. Test first: a deploy that times out and lands; *Carry on* deploys nothing.

**m56.** `agreed` is the moment between *Yes* and the round's start, inside one run of work, so the fix must not free a
conversation that is about to start. Let `/stop` take `agreed` when no run and no work exist. Test first in
`build.test.ts`.

**m57.** Rich's C3 rule is why the guard exists, so loosening it wants care: match *instance* only as machinery's phrases
(*"an instance"*), *commit* only beside code words, and a path only with a file's ending. Test first with the reviewer's
three phrases, and keep every current refusal red.

**m58.** What a live round keeps in memory is deliberate (the specialist's proposal, what the lead has read). A fix
forgets a conversation when its round ends `done` or `stopped`; the next round reads afresh. Test: the map's size after
a round ends.

**m59.** A file edited by hand is the person's. The question is what a change should keep from it: Rich's, if he wants
anything beyond *keep their text*. A smaller fix reads the questions and *Changes* sections on their own, even when the
rest does not read back.

**m60.** A round-level change: the model's `complete` gains a signal, and *Stop* aborts it. Test first with a scripted
model that streams for ever: *Stop*, and the request is aborted.

**m61.** The platform ends a session only for the token that started it, and a restart forgets the token. Our side
could end it from the person's session in the browser, or leave it. It spends nothing.

## Found since, not from a plan's entry

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m62 | The faculty-ready adoption note ([`research/2026-10-01-faculty-ready-adoption.md`](./research/2026-10-01-faculty-ready-adoption.md), §5), 2026-10-01 | A provider's refusal streamed as an error event mid-answer is said as *"We can't reach the model"* (`MODEL_UNREACHABLE`), not as a refusal. ORIENTATION's *"ours reads both"* for F8 holds for a non-streamed `422` and for `200` `null` only. The platform's faculty-ready Task 6 may send it this way: its `[M3]` decides. | `packages/server/src/model/stream.ts:41-42` reads any `error` chunk as `MODEL_UNREACHABLE` (held by `stream.test.ts:138`). | S | faculty-visible |

**m62.** Test first in `stream.test.ts`, from `[M3]`'s recorded streamed answer: an error chunk carrying the provider's
`422` is `MODEL_ANSWER_INVALID`, and `:138`'s chunk with code `'500'` stays `MODEL_UNREACHABLE` (the control already
there). Negative control: drop the code check, and the new case goes red. `stream.ts` is in `packages/server/src`, so it
waits for F6 sitting 4 to close.

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m72 | `manifest-app-minors`' run of the read-only walk, 2026-10-02 | `scripts/walk/read-only.ts` fails *"the walk wrote nothing"* (its other 37 checks pass): on an app page the shell mints our watch token (`useWatch`, `ensureEach` on *Your apps*: F6 sitting 5) when our server keeps none for the app, as after `check-keeping.sh`'s `DELETE`, and the walk blocks the mint, as it should. | `scripts/walk/read-only.ts` (no answer for `GET /api/apps/:projectId/keeping`); `packages/web/src/screens/keeping/watch.ts:56`. | S | scripts |

**m72.** Answer `GET /api/apps/:projectId/keeping` in the walk as kept (`page.rewrite`: `{ watching: true, until: <far>,
tokenId: null, mine: false }`), as `manifest-app-minors`' walk did, so a read-only walk mints nothing and leaves no watch
for `check-keeping.sh` to meet. Control: without the rewrite, the check goes red.

**From the final verification pass** (`manifest-app-verify`, report only, on `main` at `4135da8`, 2026-10-02 00:42 PDT:
green; nothing it found costs the demo).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m73 | `manifest-app-verify`'s walk | A gap inside one day reads *"We weren't watching between 29 September and 29 September."*, and the day's heading repeats after the gap. Only a reconnect whose replay holds none of what we have makes a gap, so a fresh app won't show one. | `packages/web/src/screens/keeping/history.tsx:33` passes dates alone (`dayWords`) for both ends. m65 (the gap's position) is a different defect. | S | faculty-visible |
| m74 | `manifest-app-verify`'s run of `scripts/walk/self-test.ts` | Under `FORCE_COLOR` the self-test's control *"Chrome outlives the walk that threw"* fails (52/53): the child prints Chrome's pid through `console.log`, coloured, `Number()` reads `NaN`, and the bare Chrome is left running (three were stopped by hand). Print the pid with `process.stdout.write`. | `scripts/walk/self-test.ts` and its child script | S | scripts |

**From F6's whole-branch review** (sitting 7's unattended half, `manifest-app-s7`, 2026-10-02; the plan's entry *Sitting
7, part one*, its *Minors*). Each was read in the code at `d3600be`; none was fixed (the review's two Important were).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m64 | F6's whole-branch review, M1 | `check-keeping.sh`'s check 1 goes red from **18 November 2026**: the mock mints every token with a fixed `expiresAt` (`2026-12-18T09:00Z`), so 30 days before it our server no longer counts it good and the second hand answers `201`, not `200 current`. From then on, mock mode re-mints on every app page and revokes the id it has just handed (the same fixed id). | `scripts/check-keeping.sh:119`; `packages/web/src/screens/keeping/watch.ts:63` (the revoke); the mock's token fixture (the platform's). | S | scripts |
| m65 | F6's whole-branch review, M2 | The history page draws a gap one line too high when the gap's end is itself a line: *"We weren't watching between…"* above the line it should follow. | `packages/web/src/screens/history/history.tsx:28` (`>=` where `>` is meant). | S | faculty-visible |
| m66 | F6's whole-branch review, M3 | A watch token the page minted is left alive when our server's hand-over fails (a `502`, a timeout): a year-long read-only token in the person's name, one more on each visit while it fails. | `packages/web/src/screens/keeping/watch.ts:67` (the `catch` never revokes `minted.token.id`). | S | robustness |
| m67 | F6's whole-branch review, M4 | The hourly *still waiting for you* scan has no guard for the past: the first hand-over of an older app makes each long-stale waiting conversation on it one email an hour later; and the first scan runs only an hour after each start (a restart postpones it). | `packages/server/src/keeping/keeper.ts:306` (`scan`), `packages/server/src/store/db.ts:202` (`idleConversations`). | S | faculty-visible |
| m68 | F6's whole-branch review, M5 | An app's history grows without bound, and each `/api/needs` and `/api/since` load reads every kept app's whole history up to three times. Fine at pilot scale. | `packages/server/src/api/keeping.ts:114`, `:126`, `:202`. | M | robustness |
| m69 | F6's whole-branch review, M6 | Someone who switches off or deletes an app while a round is building on it is emailed *"we need you"*: the switch-off revokes the round's token, the round pauses, and `workEnded` emails its person (Decision 13's spirit: nobody is told what they did). | `packages/server/src/keeping/keeper.ts:460` (`workEnded`) with `api/line-state.ts`. **Seen live on 7100, 2026-10-02** (F6 sitting 7's walk: *What happened?*'s round refused `createCommit` `UNAUTHENTICATED` the second the walk switched the app off, and instructor was emailed *"we need you"*). | S | faculty-visible |
| m70 | F6's whole-branch review, M7 | The keeper starts inside `buildServer`, before our server knows it holds 7105; `deliverUnfinished` resends each `sending` row without claiming it afresh, so a second process (§7's idle watchers, an overlapping restart) can send an email the live server is also retrying. | `packages/server/src/app.ts:209` (`keeper.start()`), `packages/server/src/keeping/mail.ts:76`. | S | robustness |
| m71 | F6's whole-branch review, M8 | `close-out.sh`'s `watchers()` matches the checkout's root as a substring, so run from `/Users/rich/Developer/manifest-app` it also matches a sibling worktree's (`manifest-app-s6`, `-s7`) server and would stop it. For Rich's review of the script. | `scripts/close-out.sh:92-95` (`index($0, root)`; `index($0, root "/")` closes it). | S | scripts |

**m64.** Date-proof the harness: hand twice and accept `200 current` or, past the fixed date, check the second answer
against the first's `until`; and in `watch.ts` never revoke an id equal to the one just minted. Control: set the fake
clock past 18 November and see check 1's new form stay green while the old one goes red.
**m65.** `>` for `>=`, test first in `history.test.tsx` with a gap whose `to` is a line's `at`.
**m66.** Revoke `minted.token.id` in the `catch` once it exists; `watch.test.ts`: our `handWatch` rejecting, and the
platform's `revokeToken` asked once with that id.
**m67.** Email a day's wait only for a conversation that started waiting after the app was first kept (or after our
server started); start the first scan a minute after `start()`. Test with the keeper's fake clock.
**m68.** Read each history once per request, or keep the newest outage and lines per app; measure first.
**m69.** In `workEnded`, no *we need you* when the round paused for a token revoked by `archive` or `delete` (the app's
kept state, or the stream's `keeping.stopped` within a minute); test with a round paused after a switch-off.
**m70.** Start the keeper after `listen`, or give the boot's resend its own compare-and-set claim (`emails.state`
`sending` → `sending` with a new claim time). Test with two keepers on one store.
**m71.** One word in the `awk`, and a `--dry-run` with a sibling worktree's `tsx watch` listed by name.

**From F6 sitting 7's walk on 7100 and Rich's click** (`manifest-app-c0`, 2026-10-02).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m75 | Rich's click on 7100 | An outage ended by a switch-off never gets its recovery: no *answering again* email, and the history reads *"Your students couldn't reach it"*, then *"switched it off"*, with no *"Answering again. It was down for…"* line. Rich pressed *Start it again* and switched the app off 48 s later, before the third answer (S4: a recovery is declared at the third answer); the switch-off makes the outage `off`, and a restored app is watched afresh. The band is right throughout (no stale need after). | `packages/server/src/keeping/outage.ts:67` (`off` drops a `down` outage with its answers so far); `keeping/happenings.ts`'s lines. | S | faculty-visible |

**m75.** Decide first (Rich's): when a switch-off ends an outage that has started answering, either close it at its first
answer (a `keeping.answering` row and its line, no email: the owner is the one who switched it off), or say nothing more.
Test in `outage.test.ts`: down, one answer, `off`.

**From F6b sitting 2's whole-sitting review** (`manifest-app-b8`, 2026-10-02, a fresh reviewer over `af8983c..144d513`; its
I1 and I3 fixed test-first the same sitting, its I2 and ten minors here). Lines are at the fix pass's commit.

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m76 | The review's **I2** (graded Important; carried with m69 at the executor's ruling, **a departure from the plan's Review Focus 1**) | Someone taken off an app while a round of theirs is in flight is usually emailed *"we need you"* first: the platform revokes their tokens and ends their sessions before it publishes `member.removed`, so the round ends needs-you (`token`) and `workEnded` emails them, before our removal stops it. When they minted our watch (FE-48) the event never comes, and the stop waits for the next hand-over. | `packages/server/src/keeping/keeper.ts:489` (`workEnded`), `build/round.ts`'s `fromError`. | S | faculty-visible |
| m77 | The review's M1 (the plan's interface) | `LineView.holder.by` and `RoundView.stopped` carry a name and no id, so the page cannot say *"You're working on it"*, and two people can share a name. Decide before sitting 3 draws them: `{ id, name }`, as `AppConversation.by`. | `packages/server/src/api/progress.ts` (`LineView`, `RoundView`); `api/round-state.ts`'s `stoppedOf`. | S | faculty-visible |
| m78 | The review's M2 | *"Stopped by Someone."*: Stop never remembers the person pressing it, and `personName` falls back to an English word from our server. Rare: every page's band (`GET /api/needs`) remembers its reader. | `packages/server/src/store/db.ts:118`; the Stop route, `api/build.ts:232`. | S | faculty-visible |
| m79 | The review's M3 | A removal can be lost for good: `keepMembers` keeps the new members before ending anyone's work, so a throw for one person ends nobody after them, and nobody retries (they are no longer kept). | `packages/server/src/keeping/keeper.ts:213`. | S | robustness |
| m80 | The review's M4 | An empty members read would end everyone's work. Every project has an owner, so an empty `listMembers` is better ignored. | `keeping/keeper.ts:213`. | S | robustness |
| m81 | The review's M5 (F6's race, a new consequence) | Two members reads can land out of order: one begun before a `member.removed` can put the removed member back until the next read. | `keeping/keeper.ts`'s `refresh`. | S | robustness |
| m82 | The review's M6 (closes Task 4's first residual where it applies) | Kept members are trusted for a person's own conversations even while we do not watch the app (F6's whole-branch I2 trusted them only while watching): someone added since our last read meets 404 on their own new change. Their own could stay theirs while the keeper is not watching; and a change asked (whose token `projects.read` has just proved a member's) could prompt a read of the members. | `packages/server/src/api/sharing.ts`'s `standingOf`. | S | faculty-visible |
| m83 | The review's M7 | A hand-over's `tokenId` is not checked against its secret (`mft_<id>_<secret>`, the id without dashes): a page bug could mark someone else's token ours; and an old page's id could be read from its secret. | `packages/server/src/api/project.ts:104`, `api/apps.ts:273`. | S | robustness |
| m84 | The review's M8 | Someone taken off an app while its first piece is `making` (the creator, with another owner already added) leaves it holding the app: neither `endWork` nor Stop reaches `making`. Rare. | `packages/server/src/api/work-end.ts`; `api/line-state.ts:23`. | S | robustness |
| m85 | The review's M9 | A removal sets aside the first plan too (it bypasses the Stop route's first-plan refusal), untested. Reasonable; pin it. | `packages/server/src/app.ts` (`onRemoved`), `api/work-end.ts`. | S | tests-only |
| m86 | The review's M10 | Small: `store/conversations.ts:45`'s comment says every change still asks `getConversation` (they ask `reachable(…, mayAct)` now); `STOPPED_FROM` repeats `work-end.ts`'s two sets; `endWork`'s boolean is never read; `api/minted.ts:21`'s `MOMENT` wants seconds the contract's date-time leaves optional. | as named | S | robustness |

**m76.** With m69, one mechanism (Rich's to choose): hold a *we need you* for a round that paused on its token for about a
minute, and at send time say nothing when its run is stopped, or the app's history has `keeping.stopped` (FE-48's `4401`)
within that minute. Test: a round refused `token`, then the removal heard (the event; FE-48's hand-over): nothing sent.

**From F6b sitting 3's whole-sitting review** (`manifest-app-b8`, 2026-10-02, a fresh reviewer over `a084ca7..842a403`; its
six Important and one Minor re-graded Important fixed test-first in `3912ff3`, these ten here).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m87 | The review's M1 | `?then=people` stays in the address after the second sign-in, so a reload says *"You're signed in again."* again (Going live and the Overview `remember` it away). | `packages/web/src/screens/people/people.tsx` (`back`). | S | faculty-visible |
| m88 | The review's M2 | A removed member's conversation keeps *"Only Sam can answer it or carry it on."* above *"Sam was taken off … Their work on it stopped."* When its stop is a removal, say *"Sam started this."* alone. | `packages/web/src/screens/change/together.tsx` (`StartedBy`). | S | faculty-visible |
| m89 | The review's M3 | The waiting card, another holding the app, drops *"It starts by itself."*, and says *"Sam is working on it"* even when the holder waits on Sam. | `packages/web/src/screens/change/waiting.tsx` (the holder's branch). | S | faculty-visible |
| m90 | The review's M4 | Another's round needing a token reads *"Working, a few minutes"* with motion, though only its person's page can hand one over: it waits on them. | `packages/web/src/screens/building/model.ts` (`chipOf`'s token case). | S | faculty-visible |
| m91 | The review's M5 | The owner who pressed Stop reads *"Stopped by <their own name>."*; *"You stopped it."* (words for Rich). | `packages/web/src/screens/building/building.tsx` (`stoppedBy`), `change/waiting.tsx`. | S | faculty-visible |
| m92 | The review's M6 | People's rows share their buttons' names (*Make owner*, *Take off*): a screen reader's list of buttons cannot tell whose. Add the member's name, visually hidden. | `packages/web/src/screens/people/people.tsx`. | S | accessibility |
| m93 | The review's M7 | People does not read the list again after a refusal that means it moved (`PROJECT_LAST_OWNER`, *"the other owner left meanwhile"*; `FORBIDDEN` after being made a helper). | `people.tsx` (`didNotGo`'s `'said'`). | S | faculty-visible |
| m94 | The review's M9 | Another's conversation while its app is made draws *Making it* without who started it. | `packages/web/src/screens/plan/plan.tsx` (`making`). | S | faculty-visible |
| m95 | The review's M10 | `MEMBER_USER_NOT_FOUND` says `app.manifest.internal` in plain prose; C3 and the design show a hostname in mono. | `packages/web/src/words.ts` (`people.refused`), drawn by `people.tsx`. | S | faculty-visible |
| m96 | The review's M12 | BuildingScreen's `send` would mint and hand over on `TOKEN_MISSING` for any press, an owner's Stop on another's included; safe today only because Stop never answers it. Guard the branch for another's. | `packages/web/src/screens/building/building.tsx` (`send`). | S | robustness |

**From F6b sitting 1's measurements on 7100** (`manifest-app-30`, 2026-10-02, M3; the plan's entry *Sitting 1*).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m97 | M3, seen live | The history names people from the members we keep **now**, so once someone is taken off, every line about them (their adding, their new role, their removal) loses their name: *"Test Instructor took someone off it"*, *"… added someone"*. Seen in `/api/apps/:id/history` while `colleague` was off the app; their name came back when they were added again. Keep each person's name with the happening (or a name kept for former members), as F6 sitting 5's *"Alice took Bob off it"* meant. | `packages/server/src/keeping/happenings.ts` (`linesOf` → `nameOf(members, …)`); `emails.ts`'s `nameOf` reads the same members. | S | faculty-visible |

**From F6b sitting 4's walk** (`manifest-app-30`, 2026-10-02, mock mode; the plan's entry *Sitting 4*).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m98 | The walk, 375 | On the Overview's *Waiting to reach your students*, re-escalated, F5b's sign-off row draws its owner (*"you"*) alone under the sentence: the row is drawn outside *Going live*'s grid. | `packages/web/src/screens/overview/new-version.tsx` (the `SignOff`'s `RowView`); `app.css`. | S | faculty-visible |
| m99 | The walk | Self-serve, the panel names the version on trying-out twice: its facts (*"The version from today, 7:29pm is on your trying-out address…"*) and the press's own *"The version from today, 7:29pm goes to <address>…"*. Say the facts' first sentence only when no press is offered, or drop the press's. | `new-version.tsx`; `going-live/live.tsx` (`goes`). | S | faculty-visible |

**From F6b sitting 4's whole-sitting review** (`manifest-app-30`, 2026-10-02, a fresh reviewer over `86c2156..6efc46e`; its
three Important and four minors re-graded Important fixed test-first in `3c31dd0`, these seven here).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m100 | The review's M4 | A new-detail stop leaves `d.steps.build` from an earlier try in the same leg, so the halted *Building it* shows that old failure's note beside the card. Clear it at the stop. | `packages/server/src/build/round.ts` (the detail stop in `build`). | S | faculty-visible |
| m101 | The review's M7 | The landed moment on *Waiting to reach your students* is lost if the Overview's quiet re-read fails (its trouble notice replaces the page), and kept under its heading until a reload, hiding a later version put on trying-out. | `packages/web/src/screens/overview/new-version.tsx` (`held`), `overview.tsx`. | S | faculty-visible |
| m102 | The review's M8 | After the gate refuses the press, the old reading (ready) offers the press again for a moment until the re-read lands; Going live sets `ready: false` at once. | `new-version.tsx` (`readAgain` on `onGate`). | S | faculty-visible |
| m103 | The review's M9 (second half) | Undated, the facts say *"A newer version… Your students have an earlier one."*, assuming the order. | `words.ts` (`overview.newVersion.facts`). | S | faculty-visible |
| m104 | The review's M10 | **[Leave it out]**'s own commit removes the attribute, so the new conversation says it *"needs a Manifest administrator's look… because it changes who it learns about"* while the readiness will be self-serve. Decision 8 allows over-saying; every [Leave it out] does it. For Rich. | `api/sensitive.ts`'s union; the platform's `sensitiveDiff` names a removal too. | S | faculty-visible |
| m105 | The review's M11 | Test gaps: no Overview-level test of the held press across the Overview's re-read; the failed-deploy test has no incident ([What went wrong] after launch unasserted). | `new-version.test.tsx`, `students.test.tsx`. | S | tests-only |
| m106 | The review's M12 | Focus is lost when **[Leave it out]** becomes *"Starting that change…"*, and not restored on a failure. | `packages/web/src/screens/building/needs.tsx`, `building.tsx`. | S | accessibility |

**From F6b sitting 5** (`manifest-app-ba`, 2026-10-02): its walk's m107, and the whole-sitting review's minors (a fresh
reviewer over `7a85693..f14a877`; its two Important and two minors re-graded Important fixed test-first in `4c44f2a`).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m107 | The walk | *"You’re signed in again."* stays above the cards after a press that is not an answer (a mint, a revoke), until an answer or a navigation. | `packages/web/src/screens/agents/agents.tsx` (`answered`). | S | faculty-visible |
| m108 | The review's Minor 3 | A reconnect's or restart's replay holding both a question and its answer emails the owners the question first. Send question emails after the replay's report, for what `questionsOf(history)` still lists. | `packages/server/src/keeping/keeper.ts` (`asked`). | S | faculty-visible (email) |
| m109 | The review's Minor 4 | A helper's band says *"your agent is asking something"* with **[Agents]** for what only an owner answers; the need's `owner` is unused (F6's `down` tells a helper who can). The plan's words: Rich's. | `packages/web/src/screens/keeping/lines.ts`. | S | faculty-visible |
| m110 | The review's Minor 5 | **[Done]** on the key's card moves the focus to an empty status, so a screen reader hears nothing. | `agents.tsx` (Done). | S | accessibility |
| m111 | The review's Minor 6 | Every row's *Revoke* and every card's *Yes, once* / *No* share one accessible name (m92's kind): add the agent's name, visually hidden. | `agents.tsx`, `question.tsx`. | S | accessibility |
| m112 | The review's Minor 7 | *"Stops working <day>"* has no year: a 365-day token reads *"Stops working 2 October"* on 2 October. | `agents.tsx` (`dayWords`). | S | faculty-visible |
| m113 | The review's Minor 8 | `?then=agents` stays in the address, so a reload says *"signed in again"* again (m87's kind). | `agents.tsx`, `router.ts`. | S | faculty-visible |
| m114 | The review's Minor 9 | Members unread, an owner's role stays unknown, and the card shows nothing to press and no sentence. | `question.tsx`, `keeping/role.ts`. | S | faculty-visible |
| m115 | The review's Minor 10 | The mint test's comment says *"(yours) once our server keeps its id"*, but its fake never keeps it and nothing asserts it. | `agents.test.tsx`. | S | tests-only |
| m116 | The review's Minor 11 | The visible *"What may it do?"* / *"How long should it last?"* repeat the groups' `aria-label`: a screen reader hears each twice. | `agents.tsx`. | S | accessibility |
| m117 | The review's Minor 12 | A refused clipboard says nothing on the key's *Copy* (a key shown once). | `screens/preview/try-it-as.tsx` (`CopyButton`). | S | faculty-visible |
| m118 | The review's Minor 13 | `q.didntSay[action.action]` is read without `Object.hasOwn`, unlike `ACTION_WORDS`. | `question.tsx`. | S | code |
| m119 | The review's Minor 14 | *"You said no, and it has been told."* overstates: the agent learns it at its next try. Rich's words. | `words.ts` (`agents.question.saidNo`). | S | faculty-visible |

**Not here:** the focus ring at 375 on the folded rail (ORIENTATION's *Open for Rich*). It is being looked at on its own.

## Already fixed

| From | The minor | Fixed in |
|---|---|---|
| F2, sitting 6 review and *After F2* item 2 | The input limits are not said | `401b124` |
| F2, item 3 | A silent, disabled *Make it* when an address could not be checked | `248381e` |
| F2, item 4 | `/plan/agree` carries no version | `5bf7544` |
| F2, item 5 | Two windows making one conversation's project | `7ec6a82` |
| F2, item 6 | Vancouver's midnight on the two changeover nights | `f2d27ad` |
| F2, item 7 | The intake key comment said a retry reused the key | `7d623f9` |
| F2, item 8 (carried into F3) | The fallback for a state not drawn showed no reference | `4fefd9b` (F3 sitting 6: `STATE_NOT_DRAWN`, reported) |
| F3 sitting 7, review (ledger 217) | No *Stop* while the round could not reach something | `2e15d36` (F4 sitting 7's I1: *Stop here* on every holding card) |
| F3 sitting 7 (ledger 248) | The lead's line cut mid-word at 120 characters | `c83f33a` |
| F4 sitting 7, M1 | A deploy cut by our 120 s said as not done, though it may land | `2ed58c9` (*Trying out*), `74c8a85` (*Going live*), `39ed744` (the give-up re-reads the Preview) |
| F4 sitting 7, M2 | *[What went wrong]* fed by `incidents[0]` | `2ed58c9` |
| F4 sitting 7, M4 | No way back to the offer after an ending | `2ed58c9`, `74c8a85` |
| F4 sitting 7, M10 | The needs switch had no exhaustive default | `2009fba` (a `never` check, and a generic card) |
| F5 sitting 2, review (ledger 43) | ORIENTATION's code map said a round waits five minutes | `59d1de4` |
| F5 sitting 3, review (ledger 113) | `launchedAt` read once per slug, so a launch elsewhere went unheard | `2788bde`, `154a227` (m45 is its remaining edge) |
| F5 sitting 5, *Seen at 375, not changed* | The landed address broke at the slug's hyphen | `ef1dd6b` (`LiveAddress`, at Rich's word) |
| F5 sitting 6 (first half), own review M2 (ledger 315) | A failed dry run's instance read *"It never answered"* before a launch | `1c1be77` (`asServed`: before a launch only an answering instance is there) |
| **m1**: F5 sitting 3, review (ledger 117) | The Overview's address list named *"Its three addresses"* whatever the rows drawn | `2b9c3e1` (*"Its addresses"*; no list when no row), `13e6e17` (`read-only.ts` waits for the Overview, not the list) |
| **m2**: F5 sitting 3, review (ledger 115) | *Going live*'s set-apart list unnamed; either list drawn empty | `7345e0c` (one list, named by its heading; code review apart by its row) |
| **m3**: F5 sitting 3, review (ledger 114) | *Going live*'s headings: the `h1`, the clocks' `h3`, then the short jobs' `h2` | `c5bae5a` (ClockItem's `level`, ours; the clocks at `h2`) |
| **m4**: F5 sitting 4, review (ledger 187) | The focus lost after a failed press on *Talk it through* and *Ask for a change* | `09c45da` (`useFocusBack`, `change/press.ts`), `92002fa` (only when the focus was lost; the review's I1) |
| **m14**: F3 sitting 7, review (ledger 214) | A secret answered after a refused token sent with that token | `ba7e529` (the token store's alone) |
| **m19**: F3 sitting 7, review (ledger 245) | `SOURCE_GIT_FAILED` never retried | `d4ea05b` (a read asked once more, never a write) |
| **m63**: `manifest-app-47`'s walk control (`1b82119`) | An app's name with a word that cannot break runs out of the rail, the title, the card | `ecbbec5` (`overflow-wrap: anywhere`, at source) |

### 2026-10-02 — m1–m4, m14, m19 and m63 fixed at Rich's word (`manifest-app-minors`, overnight, mock mode only)

**Rich's word** (2026-10-01, ~22:35 PDT, in `manifest-app-3a`'s session): *"m1–m4 accessibility, m14 + m19 (server),
m63 long app names"*. Every other minor stays deferred. One commit per minor, each test-first (the new test watched red
for the defect, then green) and landed on `main` by fast-forward from the worktree `manifest-app-minors`.

**Decided, routine** (the option chosen; the options rejected; what changing course costs):

- **m1**: the list's name is *"Its addresses"*, the walk-through's own phrase (moment 20's *Delete it*), and no `<ul>` is
  drawn when no row is. Rejected: a name that counts (*"Its two addresses"*), since a screen reader already says the
  count, and it is a word per count. Changing it is one string in `words.ts` (marked *Ours*).
- **m2**: one list, named by the section's heading (`aria-labelledby`), with code review set apart by its own row
  (`going-live__row--apart`: the same rule and space as before, measured in the walk's screenshot). Rejected: naming the
  second list, which needs new words (Rich's). Changing it back to two lists costs a name for the second.
- **m3**: ClockItem gains our `level` (2 or 3; absent, the reference's `h3`, so the parity test holds), and *Going live*
  asks for 2: the page reads 1, 2, 2, 2. Its class sets every visible property, so nothing moved on screen. Rejected: a
  heading over the clocks (new words). `ClockItem.test.tsx` holds it.
- **m4**: one hook, `useFocusBack` (`screens/change/press.ts`, beside `pressFailed`): the failure owes the focus for the
  render after it, and the button takes it **only if the focus was lost** (on the page, or nowhere: the review's I1, so
  someone who went back to their words while a slow press failed keeps their place); the alert still announces. A
  session that ended is the shell's to say, and owes nothing. Not looked at: the bigger presses that become a whole
  phase (*Let your students in*, *Start it again*, the dry run, *Trying out*'s put): their focus after an ending is a
  different question.
- **m14**: the answer reads the conversation token store alone. It holds the newest token handed over (Carry on and the
  line read theirs from it) and drops a refused one, while the round's own may be the refused one until *Carry on*.
  With none, `409 TOKEN_MISSING`, and the page already hands a new token over and sends the answer again
  (`building.tsx`'s `send`). Rejected: clearing `live.token` on a drop (a type change through the round for the same
  effect).
- **m19**: the sketch said *"in `call()`"*, but the round's git reads never pass through it: they go through its source
  (and `tracedSource`, which spreads it). So `gitRetried` wraps the round's own source: `tree` and `file` asked once more
  on `SOURCE_GIT_FAILED` alone, a commit never (its own dry run and Idempotency-Key). The retry is not traced (the trace
  records the read once, by its answer). Not covered: the plan's reads outside the round (`api/plan.ts`, through
  `platform/authoring.ts`); a passing git failure there is still said as a refusal.
- **m63**: `overflow-wrap: anywhere` on `.mf-rail__over` and `.page-title` at source (a `styles.test.ts` case each,
  `tokens.css` now read too), and on `.app-card__name`, `.app-card__link` (`app.css`).

**Controls.** Each new unit test was red before its fix. m4's was red again with the hook's `focus()` removed; m19's
commit guard went red with the commit retried too; each restored.

**The review** (a fresh reviewer, `f8129e3..ecbbec5`, read-only): no Critical; m14 and m19 judged correct (every
`start` and `carryOn` takes its token from the store, which drops one only after a `401`; the retry sits where every read
of the round passes, traced once, the commit untouched). **One Important, fixed** (`92002fa`): m4's hook took the focus
from wherever the person was when a press failed (a press can take some seconds; *Ask for a change*'s box stays
editable), and its debt could outlive the failure; both test-first. **Its Minor 3, fixed** (`13e6e17`): `read-only.ts`
waited for the address list, which m1 now leaves out when empty. **Not fixed, recorded:** a screen reader may cut the
alert short as the focus lands on the button (jsdom cannot hear it; pointing the button's `aria-describedby` at the
notice, or a VoiceOver check, would settle it); when code review is lit (`lightUp`), its left bar now runs up through
the set-apart padding to the rule (cosmetic, rare: code review is *not built*); m19 leaves the plan's reads outside the
round (above); m14 leaves the moment between the platform refusing a token and the round dropping it (older than this).

**The walk** (headless Chrome, `scripts/walk/`, on 7105 in mock mode, at 1440 and 375; read-only, our watch answered as
kept so no app page minted one; its script was in the session's scratchpad): m1 with two addresses and with none, m2
and m3 on *Going live*, m4's two presses failed by a mint answered `503` and pressed from the keyboard's focus, m63 with
the app's name rewritten in the browser to a word that cannot break. **Before m63 landed: 36/39, its three red** (at
1440 the overline 239 px out of the rail and the `h1` 35 px; at 375 the card's link 180 px past its card, and the `h1`
516 px, the page 875 px wide); **after: 39/39**, and again after the review's fix (*Talk it through*'s lookup of a change
for the refusal answered as none: the acceptance below leaves one for the mock's approval, and the press rightly opens
it). Every other check passed with a control that re-made its defect in the
page and went red (the old name over two rows; an empty list; a second list; a clock's `h3`; `focus()` made a no-op
before the press).

**The acceptance**, against the running server, no fresh database (the server's API moved only for m14 and m19, both
inside a round): `check-slice.sh` 8/8, `check-describing.sh` 18/18, `check-building.sh` 12/12, `check-seeing.sh` 8/8,
`check-going-live.sh` 8/8. They leave their conversations on the mock's app in the dev database, as every run does.

**The gates** (after the review's fixes, `13e6e17`): `pnpm test` 2211 twice (2193 before: 18 new), `pnpm lint`,
`pnpm typecheck`, `pnpm format:check`, all clean. Our server on 7105 stays in mock mode (its `tsx watch` restarted
itself on each server landing, pid 24890 throughout); nothing of ours is left running.

**Found:** m72 (above, *Found since*): `read-only.ts` goes red on *"the walk wrote nothing"*.

**For Rich:** nothing new to decide. m1's *"Its addresses"* is ours, and so is m2's choice of one list over a named
second one: either is one line to change.

## No longer applies

- **F5 sitting 6 (first half), whole-branch review, Minor 5** (ledger 282): *check 2 of a dry run's fix that was never
  built*. Overtaken the same sitting: Rich said *"Build it now"*, the press was built (`71fceba`), and check 2 now runs
  against it.

## Not minors: decisions waiting on Rich

- **A faculty member reads *slug*.** The platform's `SLUG_TAKEN` reason (*"'x' is already a project's slug."*) is shown
  verbatim under *Its address*, by F2's rule that the platform's words are never rewritten
  (`screens/name-it/name-it.tsx:63`). Ours to reword, or the platform's to change. F3's sitting 6 entry, *The platform,
  meanwhile*.
- **F5 sitting 6's decisions, for his review**: the dry run's row as *needs you*, its words, FE-34's *"didn't come
  out"*, 5b built ahead (the first half's list); the capable model's view of 120,000, the blocking-not-built row's words,
  the intake's audience ceilings, *"A dry run is already running…"* (the second half's). ORIENTATION's *Open for Rich*.
- **The ready page says the version twice** (the card's sentence and *"What goes live is…"*), both the walk-through's
  words. F5's sitting 5 entry, its decided item 12.
