# Deferred minors — an inventory for Rich

*Collected 2026-10-01 by manifest-app-3a from the dated entries of F2, F3, F4, F4a and F5, each checked against main at
`238e6a0`. Nothing here is fixed: Rich chooses.* *Seven were fixed at his word (m1–m4, m14, m19, m63; 2026-10-02),
and thirty at his overnight *"Its pick, no decisions"* (2026-10-03; m77 found already fixed), and eighteen more at a second
sitting under the same words the same morning (m122 closed with it): see* Already fixed *and its dated entries.*

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
| m11 | F5 sitting 4, review (ledger 182) | A failed approval read says *"We can't tell right now whether it's been signed off."* with no support reference, only a `console.warn`. | `sign-off.tsx:72`; the read's failure is only warned at `going-live.tsx:44-50`, `:78-80`. | S | faculty-visible |
| m12 | F4 sitting 7, M11 (ledger 719) | The *Interrupted* card files a `ROUND_INTERRUPTED` problem, with a reference, for a fix that reached the front after a restart and never started. | `screens/building/needs.tsx:57-58` reports on every *Interrupted* card; `withoutToken` (`build/round.ts`, near its end) saves such a fix as `interrupted`. | S | faculty-visible |
| m13 | F4a sitting 1, deferred (ledger 91) | `useKeeps` draws the page as loading again when `getMe` is read again with the same answer, since it is keyed on the object. Only after a `BUILDING_NOT_OPEN` signal. | `packages/web/src/screens/keeps.ts:59` (the effect's `me`) and `:61` (`kept.me === me`). | S | faculty-visible |
| m16 | F5 sitting 4, review (ledger 181) | Two millisecond races in the sign-off row: a decision landing between the checklist's read and the approval's draws the wrong sentence until the next read. | `going-live.tsx:66-79`: the checklist first, the approval after. | S | faculty-visible |
| m20 | F4 sitting 7, M3 (ledger 711) | Several secrets set at once: one refused after another was set empties both fields, and both are typed again. | `screens/trying-out/parts.tsx:168-171` empties every field on send; the loops at `put.tsx:553-559` and `going-live/live.tsx:347-354`. | M | faculty-visible |
| m21 | F5 sitting 5, review M10 (ledger 244) | A dropped connection on the live deploy (a `TypeError`) is said as *didn't go*, without one read of the live address. | `going-live/live.tsx:279-283`: only our deadline reads on; anything else ends at `:305` (`didNotGo(error, 'deploy')`). | M | faculty-visible |
| m22 | F5 sitting 6 (first half), own review M1 (ledger 314) | Before a launch, the Preview can call an older failed dry run *"the last attempt"*, even after a newer one passed and was taken down. | `screens/preview/facts.ts:64-69`: with nothing served, `after()` counts every failed instance; `:98-99`. | M | faculty-visible |
| m23 | F5 sitting 6 (first half), own review M3 (ledger 316) | The dry run's endings never give way: *didn't start* with no incident has no button until a reload; *passed* and *failed* outlive a reading that names a new version. | `going-live/dry-run.tsx:191-195` gives way only when the row is met; `:412-425` (no action without an incident). | M | faculty-visible |
| m24 | F4 sitting 7, M5 (ledger 713) | The line is the app's, but its words and link are the person's: *"…which is waiting for you"*, and a link to another member's conversation that answers `404`. | `packages/server/src/api/line-state.ts:86-96` carries no owner; `screens/change/waiting.tsx:96-107`. | L | faculty-visible |
| m25 | F2, *After F2: the deferred Minors*, item 1 (ledger 194) | The FE-20 honesty check reads only *Who gets in*: a class-only promise in another part, or in *Things we assumed*, passes. **Rich deferred it** until the class-limited sign-in lands (FE-20). | `packages/server/src/agents/plan.ts:127` and `agents/change.ts:134` rewrite `whoGetsIn` alone. | L | faculty-visible |
| m28 | F4 sitting 7, M7 (ledger 715) | Their words while it worked are marked noted even when `docs/plan.md` no longer reads back, so a hand-edited plan never gains them, silently. | `build/round.ts:975` (`break`) then `:1004` (`d.noted = read.length`). | S | robustness |
| m35 | F5 sitting 2, review (ledger 38) | A mid-stream `MODEL_UNREACHABLE` is billed for what streamed, but leaves no trace entry and forces no cost read; only stalls do. | `build/round.ts:548-553` traces stalls alone; `client.ts:233` carries no `received`. | S | robustness |
| m36 | F5 sitting 2, review (ledger 39) | The stall's forced cost read comes before the gateway's spend settles (within 60 s), so the line shows the old figure until *Carry on*. | `round.ts:446`. | S | robustness |
| m40 | F5 sitting 6 (first half), own review M5 (ledger 318) | The lead's view of a failed dry run names details asked for and never carried, but not details carried and never asked for. | `packages/server/src/agents/lead.ts:190-201`. | S | robustness |
| m41 | F5 sitting 5, review M5 (ledger 241) | Our five more minutes after a cut deploy are 300 timer ticks, which a hidden tab stretches; overlapping reads are not skipped. | `going-live/live.tsx:381-383`; `trying-out/put.tsx:318-320`. | S | robustness |
| m43 | F5 sitting 5, review M9 (ledger 243) | The 2-s incident re-read is not cancelled when the card goes (one read, its answer ignored). | `trying-out/parts.tsx:67-74` (`incidentLater`). | S | robustness |
| m45 | F5 sitting 4, review (ledger 188) | The Overview reads the checklist only while the draft serves something, so a stale lookup of a launched app with nothing on its draft never hears the launch until a reload. | `overview/overview.tsx:59`; `your-apps/model.ts:126-131` (`beforeLaunch`). | S | robustness |
| m46 | F3 sitting 7, review (ledger 215) | A round left needing a token across a restart: opening the page mints a token and presses *Carry on* by itself, starting a session nobody pressed for. | `screens/building/building.tsx:157-166`: any page that finds `needs: token` renews once, however old. | S | robustness |
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

*m62, the one minor here, **no longer applies** (2026-10-03): see* No longer applies.

**From the final verification pass** (`manifest-app-verify`, report only, on `main` at `4135da8`, 2026-10-02 00:42 PDT:
green; nothing it found costs the demo).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m73 | `manifest-app-verify`'s walk | A gap inside one day reads *"We weren't watching between 29 September and 29 September."*, and the day's heading repeats after the gap. Only a reconnect whose replay holds none of what we have makes a gap, so a fresh app won't show one. | `packages/web/src/screens/keeping/history.tsx:33` passes dates alone (`dayWords`) for both ends. m65 (the gap's position) is a different defect. | S | faculty-visible |

**From F6's whole-branch review** (sitting 7's unattended half, `manifest-app-s7`, 2026-10-02; the plan's entry *Sitting
7, part one*, its *Minors*). Each was read in the code at `d3600be`; none was fixed (the review's two Important were).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m64 | F6's whole-branch review, M1 | `check-keeping.sh`'s check 1 goes red from **18 November 2026**: the mock mints every token with a fixed `expiresAt` (`2026-12-18T09:00Z`), so 30 days before it our server no longer counts it good and the second hand answers `201`, not `200 current`. From then on, mock mode re-mints on every app page and revokes the id it has just handed (the same fixed id). | `scripts/check-keeping.sh:119`; `packages/web/src/screens/keeping/watch.ts:63` (the revoke); the mock's token fixture (the platform's). | S | scripts |
| m67 | F6's whole-branch review, M4 | The hourly *still waiting for you* scan has no guard for the past: the first hand-over of an older app makes each long-stale waiting conversation on it one email an hour later; and the first scan runs only an hour after each start (a restart postpones it). | `packages/server/src/keeping/keeper.ts:306` (`scan`), `packages/server/src/store/db.ts:202` (`idleConversations`). | S | faculty-visible |
| m68 | F6's whole-branch review, M5 | An app's history grows without bound, and each `/api/needs` and `/api/since` load reads every kept app's whole history up to three times. Fine at pilot scale. | `packages/server/src/api/keeping.ts:114`, `:126`, `:202`. | M | robustness |
| m69 | F6's whole-branch review, M6 | Someone who switches off or deletes an app while a round is building on it is emailed *"we need you"*: the switch-off revokes the round's token, the round pauses, and `workEnded` emails its person (Decision 13's spirit: nobody is told what they did). | `packages/server/src/keeping/keeper.ts:460` (`workEnded`) with `api/line-state.ts`. **Seen live on 7100, 2026-10-02** (F6 sitting 7's walk: *What happened?*'s round refused `createCommit` `UNAUTHENTICATED` the second the walk switched the app off, and instructor was emailed *"we need you"*). | S | faculty-visible |
| m70 | F6's whole-branch review, M7 | The keeper starts inside `buildServer`, before our server knows it holds 7105; `deliverUnfinished` resends each `sending` row without claiming it afresh, so a second process (§7's idle watchers, an overlapping restart) can send an email the live server is also retrying. | `packages/server/src/app.ts:209` (`keeper.start()`), `packages/server/src/keeping/mail.ts:76`. | S | robustness |

**m64.** Date-proof the harness: hand twice and accept `200 current` or, past the fixed date, check the second answer
against the first's `until`; and in `watch.ts` never revoke an id equal to the one just minted. Control: set the fake
clock past 18 November and see check 1's new form stay green while the old one goes red.
**m67.** Email a day's wait only for a conversation that started waiting after the app was first kept (or after our
server started); start the first scan a minute after `start()`. Test with the keeper's fake clock.
**m68.** Read each history once per request, or keep the newest outage and lines per app; measure first.
**m69.** In `workEnded`, no *we need you* when the round paused for a token revoked by `archive` or `delete` (the app's
kept state, or the stream's `keeping.stopped` within a minute); test with a round paused after a switch-off.
**m70.** Start the keeper after `listen`, or give the boot's resend its own compare-and-set claim (`emails.state`
`sending` → `sending` with a new claim time). Test with two keepers on one store.

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
| m81 | The review's M5 (F6's race, a new consequence) | Two members reads can land out of order: one begun before a `member.removed` can put the removed member back until the next read. | `keeping/keeper.ts`'s `refresh`. | S | robustness |
| m82 | The review's M6 (closes Task 4's first residual where it applies) | Kept members are trusted for a person's own conversations even while we do not watch the app (F6's whole-branch I2 trusted them only while watching): someone added since our last read meets 404 on their own new change. Their own could stay theirs while the keeper is not watching; and a change asked (whose token `projects.read` has just proved a member's) could prompt a read of the members. | `packages/server/src/api/sharing.ts`'s `standingOf`. | S | faculty-visible |
| m84 | The review's M8 | Someone taken off an app while its first piece is `making` (the creator, with another owner already added) leaves it holding the app: neither `endWork` nor Stop reaches `making`. Rare. | `packages/server/src/api/work-end.ts`; `api/line-state.ts:23`. | S | robustness |

**m76.** With m69, one mechanism (Rich's to choose): hold a *we need you* for a round that paused on its token for about a
minute, and at send time say nothing when its run is stopped, or the app's history has `keeping.stopped` (FE-48's `4401`)
within that minute. Test: a round refused `token`, then the removal heard (the event; FE-48's hand-over): nothing sent.

**From F6b sitting 3's whole-sitting review** (`manifest-app-b8`, 2026-10-02, a fresh reviewer over `a084ca7..842a403`; its
six Important and one Minor re-graded Important fixed test-first in `3912ff3`, these ten here).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m88 | The review's M2 | A removed member's conversation keeps *"Only Sam can answer it or carry it on."* above *"Sam was taken off … Their work on it stopped."* When its stop is a removal, say *"Sam started this."* alone. | `packages/web/src/screens/change/together.tsx` (`StartedBy`). | S | faculty-visible |
| m89 | The review's M3 | The waiting card, another holding the app, drops *"It starts by itself."*, and says *"Sam is working on it"* even when the holder waits on Sam. | `packages/web/src/screens/change/waiting.tsx` (the holder's branch). | S | faculty-visible |
| m90 | The review's M4 | Another's round needing a token reads *"Working, a few minutes"* with motion, though only its person's page can hand one over: it waits on them. | `packages/web/src/screens/building/model.ts` (`chipOf`'s token case). | S | faculty-visible |
| m91 | The review's M5 | The owner who pressed Stop reads *"Stopped by <their own name>."*; *"You stopped it."* (words for Rich). | `packages/web/src/screens/building/building.tsx` (`stoppedBy`), `change/waiting.tsx`. | S | faculty-visible |
| m92 | The review's M6 | People's rows share their buttons' names (*Make owner*, *Take off*): a screen reader's list of buttons cannot tell whose. Add the member's name, visually hidden. | `packages/web/src/screens/people/people.tsx`. | S | accessibility |
| m94 | The review's M9 | Another's conversation while its app is made draws *Making it* without who started it. | `packages/web/src/screens/plan/plan.tsx` (`making`). | S | faculty-visible |

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
| m101 | The review's M7 | The landed moment on *Waiting to reach your students* is lost if the Overview's quiet re-read fails (its trouble notice replaces the page), and kept under its heading until a reload, hiding a later version put on trying-out. | `packages/web/src/screens/overview/new-version.tsx` (`held`), `overview.tsx`. | S | faculty-visible |
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
| m111 | The review's Minor 6 | Every row's *Revoke* and every card's *Yes, once* / *No* share one accessible name (m92's kind): add the agent's name, visually hidden. | `agents.tsx`, `question.tsx`. | S | accessibility |
| m112 | The review's Minor 7 | *"Stops working <day>"* has no year: a 365-day token reads *"Stops working 2 October"* on 2 October. | `agents.tsx` (`dayWords`). | S | faculty-visible |
| m114 | The review's Minor 9 | Members unread, an owner's role stays unknown, and the card shows nothing to press and no sentence. | `question.tsx`, `keeping/role.ts`. | S | faculty-visible |
| m117 | The review's Minor 12 | A refused clipboard says nothing on the key's *Copy* (a key shown once). | `screens/preview/try-it-as.tsx` (`CopyButton`). | S | faculty-visible |
| m119 | The review's Minor 14 | *"You said no, and it has been told."* overstates: the agent learns it at its next try. Rich's words. | `words.ts` (`agents.question.saidNo`). | S | faculty-visible |

**From F6b sitting 6** (`manifest-app-a1`, 2026-10-03): the whole-branch review's minors and the walk's m123 (a fresh reviewer over
`af8983c..3d5142d`, F6b's 25 commits; its two Important fixed test-first in `726bb53`; its M4 was the walk's, `6b6cb59`).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m120 | The review's M1 | After launch, a helper on a re-escalated version reads *"An owner lets your students have it."*: no sign-off ask, no *"asked … waiting N days"*, no refusal's reason. Sitting 4's ruling (*a helper is offered no ask*) rests on a premise the platform answers the other way: its `COLLABORATOR` keeps `approval:request` (`projects/authz.ts`), and before launch *Going live*'s `SignOff` has no role gate. Draw `SignOff` for any member, or at least its row. For Rich. | `packages/web/src/screens/overview/new-version.tsx`. | S | faculty-visible |
| m123 | The walk on 7100 | The change planner, on the laptop's plan model (`default-chat`), wrote machinery into a plan's *Things we assumed*: *"permitted by the environment variables provided by the platform"*, *"our existing deployment limits"*, *"web scraping capability"* (C3). The model's prose, shown as it wrote it; nothing of ours checks a plan's words. Re-ask once when `machineryIn` finds any (as a refused answer is re-asked), or say less of the assumptions. F4's planner, not F6b's. | `packages/server/src/agents/change.ts` (the prompt), `api/plan.ts` (no check). | S | faculty-visible |

**From the 1.6.0 adoption** (2026-10-03, overnight, mock mode; `research/2026-10-01-faculty-ready-adoption.md`, *Part one*): read
while carrying the platform's request id (FE-30) and a limit's facts (FE-29). m124 and m125 were fixed the same sitting, and
m126 by the second minors sitting of 2026-10-03 (`8743428`): *Already fixed*, below. None is open.

**From the `__Host-` adoption** (2026-10-03, overnight, mock mode; the same note, *Part two*): both open, neither needing a
decision.

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m128 | The adoption's reading | `close-out.sh`'s mock probe (`:212`) sends `manifest_session=mock-session` by name, right for the mock (loopback http keeps the plain name) but the only session name in `scripts/` not derived from its origin. Harmless while the mock is http; say why in a comment, or derive it, when Rich reviews the script. | `scripts/close-out.sh`. | S | code |
| m129 | The faculty-ready adoption, part three | The question card on *Agents* and the owners' email say *"Your agent '<name>'"* for an agent another member made (an owner answering a helper's agent's question): untrue to that reader. `Token.mintedBy` now says whose (and our `minted` row's person, for the email). New words are Rich's: e.g. *"<Name>'s agent '<name>'"* when it is not the reader's. | `packages/web/src/screens/agents/question.tsx` (`q.yourAgent`), `packages/server/src/keeping/words.ts` (`agentAsks.body`). | S | faculty-visible |
| m130 | The faculty-ready adoption, part three | The platform now caps a question at its token's expiry, and our band and email cap it only for an agent our page let in (its kept expiry): for a token made elsewhere (the console, an API mint) the band can say *"your agent is asking something"* after the question ended by time, until its day is out, with no card behind it (the card reads the platform's own `expiresAt`). The keeper cannot read that token's expiry (`listTokens` is a person's; the event carries none). Ask the platform to put `expiresAt` on `pending_action.created` (a finding, FE-n, at Rich's word), or leave it. | `packages/server/src/keeping/happenings.ts` (`questionsOf`). | S | faculty-visible |
| m131 | The faculty-ready adoption, part three (its review) | The question's wait is capped by the expiry our page handed over for an agent (`POST …/agents`'s `expiresAt`, the first kept for an id standing): a member who kept someone else's token id with an early expiry would end that token's band need and shorten the email's *"It stops waiting at …"*. The card on *Agents* stays right (the platform's own `expiresAt`). m122's kind: our server cannot check a member's word against `listTokens`. Accept it, or keep the expiry only from a mint our page saw (the page's `mintToken` answer is the only source today). | `packages/server/src/keeping/happenings.ts` (`tokenEndsOf`), `api/minted.ts` (`POST …/agents`). | S | robustness |

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
| **m26**: F3 sitting 7, review (ledger 211) | The dependency guard did not hold `peerDependencies` or `bundleDependencies` | `f562774` |
| **m30**: F4a sitting 1, deferred (ledger 95) | The platform's fetch raised the *not open* signal for a read too (a `getMe` answering it would loop) | `b192e82` (a change only) |
| **m33**: F5 sitting 2, review (ledger 41) | `"error": null` in a chunk read as an error | `8448a7d` |
| **m34**: F5 sitting 6 (first half), own review M4 (ledger 317) | A `null` body with a trailing newline, or one unclosed `data: null`, read as unreachable, not FE-34's refusal | `967cceb` |
| **m44**: F5 sitting 6 (first half), whole-branch review M3' (ledger 280) | Our deadline recognised only as `TimeoutError` | `ab7b71b` (`AbortError` too) |
| **m47**: F4a sitting 1, deferred (ledger 94) | No *"any other refusal raises nothing"* case for the platform's fetch | `98616ea` |
| **m48**: F5 sitting 3, review (ledger 119) | `going-live.test` never restored `document.visibilityState`; nothing tested that `hidden` reads nothing | `eabbc5e`, `c1412af` (the restore asserted in its own test: the review) |
| **m50**: F5 sitting 4, review (ledger 185) | An `apps.test` title said *refused first* and asserted `404` | `c4064a3` |
| **m51**: F5 sitting 4, review (ledger 186) | *Talk it through* had no test for a failed `mintToken` or an ended session | `68fabd5` |
| **m52**: F5 sitting 6 (first half), own review M7 (ledger 320) | One `Idempotency-Key` per dry-run press not pinned | `5d17915` |
| **m53**: F5 sitting 6 (first half), own review M6 (ledger 319) | `check-going-live.sh`'s check 2 did not say what it leaves to `round.test.ts` | `73fc63d` |
| **m65**: F6's whole-branch review, M2 | A history gap drawn one line too high when its end is a line | `a947482` |
| **m66**: F6's whole-branch review, M3 | A watch token minted for a failed hand-over left alive | `1540110`, `aebba1c` (our server asked once; revoked unless it kept it: the review) |
| **m71**: F6's whole-branch review, M8 | `close-out.sh`'s `watchers()` matched a sibling worktree's server | `6d49ae9` |
| **m72**: `manifest-app-minors`' walk, 2026-10-02 | `read-only.ts` red on *"the walk wrote nothing"* (the shell's watch mint) | `bbc7141` (37/38 before, 38/38 after) |
| **m74**: `manifest-app-verify`'s self-test run | The self-test's bare Chrome pid lost under `FORCE_COLOR` (52/53, a Chrome left) | `5611b11` (53/53 under `FORCE_COLOR=1`) |
| **m77**: F6b sitting 2's review, M1 | `LineView.holder.by` and `RoundView.stopped` carried a name and no id | `9502d7c` (F6b sitting 3, at Rich's word; moved here 2026-10-03) |
| **m78**: F6b sitting 2's review, M2 | *"Stopped by Someone."*: Stop never remembered who pressed it | `b53743f` |
| **m79**: F6b sitting 2's review, M3 | One removal that threw ended nobody after it, and nobody retried | `4bd2ab3`, `ea61389` (each its own; retried from a list of its own, never kept as a member: the review's Important 1) |
| **m80**: F6b sitting 2's review, M4 | An empty members read would end everyone's work | `de20d61` (ignored) |
| **m85**: F6b sitting 2's review, M9 | A removal setting aside a first plan was untested | `840a453` |
| **m87**: F6b sitting 3's review, M1 | `?then=people` stayed in the address | `daa57d2` |
| **m95**: F6b sitting 3's review, M10 | `MEMBER_USER_NOT_FOUND`'s hostname in plain prose | `2f5228b` (mono; no word changed) |
| **m96**: F6b sitting 3's review, M12 | `TOKEN_MISSING` would mint and hand over for another's conversation | `07203e4` |
| **m100**: F6b sitting 4's review, M4 | A new-detail stop kept an earlier try's note | `1d24d29` |
| **m102**: F6b sitting 4's review, M8 | After the gate refused, the old reading offered the press again for a moment | `429c933`, `962a1d8` (nothing in the press's place until a reading lands: the review's Important 2) |
| **m110**: F6b sitting 5's review, Minor 5 | *Done* on the key's card moved the focus to an empty status | `b319882` (the section's heading) |
| **m113**: F6b sitting 5's review, Minor 8 | `?then=agents` stayed in the address | `87e5c5b` |
| **m115**: F6b sitting 5's review, Minor 10 | The mint test's *"(yours)"* comment, never asserted | `9e0a3df` |
| **m116**: F6b sitting 5's review, Minor 11 | *What may it do?* and *How long should it last?* heard twice | `1ed1f02` (`Choice`'s `labelledBy`, ours) |
| **m118**: F6b sitting 5's review, Minor 13 | `q.didntSay[action]` read without `Object.hasOwn` | `1f91fe3` |
| The review's M2 (F6b sitting 5), **m121** | A question's band line outlives its agent (a helper's revoke, a removal) | the platform's `0d5a743` (FE-52: `pending_action.expired` on a revoke, a removal, a switch-off), read by `questionsOf` since sitting 5; held by `d6037d8` |
| The platform's Task 13, met mid-sitting, **m127** | Our Token fixtures named the mock's person as every token's maker | `5e656e4` |
| **m126**: the 1.6.0 adoption | A start refused for the month said the allowance from a cached budget read, and the round made a spent month the session's checkpoint | `8743428` (the platform's `error.limit`) |
| **m122**: F6b sitting 6's review, M3 | A member's word claimed a token id: its *watch* half (an outside token noted under *Our agents*) | `44793b5`, `1b12316` (the secret must name the id; its *agents* half: `5e656e4`) |
| **m83**: F6b sitting 2's review, M7 | A conversation's token id handed over unchecked against its secret | `0168092` (an absent id is still not read from the secret: its entry) |
| **m18**: F3 sitting 7, review (ledger 213) | The cost line at *built* stale: nothing read it after the round | `2763335` (m36's lag stays) |
| **m37**: F5 sitting 2, review (ledger 42) | The model's `fetch` taken when the model was made | `b9ddb64` |
| **m15**: F5 sitting 6 (first half), whole-branch review (ledger 302) | *Trying out*'s never-answered facts named the failed attempt as serving | `74f6097` |
| **m42**: F5 sitting 5, review M7 (ledger 242) | A failed `listInstances` at the press reported as `getLaunchReadiness` | `2a70baf` |
| **m93**: F6b sitting 3's review, M7 | People never read its list again after a refusal that meant it moved | `68413d6` |
| **m49**: F5 sitting 4, review (ledger 184) | `students.test`'s *nothing sent* heard only `fetch` | `e0a029d` |
| **m86**: F6b sitting 2's review, M10 | A stale comment, `STOPPED_FROM` twice, `endWork`'s unread boolean, `MOMENT` stricter than the contract | `03d5098` |
| **m17**: F5 sitting 3, review (ledger 116) | A failed quiet re-read replaced *Going live*'s good page and filed a report at every tab switch | `0a874e9` |
| **m31**: F5 sitting 2, review (ledger 37) | A refusal whose body stalled was said as a stall | `52591d8` |
| **m32**: F5 sitting 2, review (ledger 40) | A 2xx with no body waited out the first-word deadline | `460ccc8` |
| **m10**: F5 sitting 5, review M2 (ledger 240) | *"You're signed in again."* said again after a gate refusal | `8daf66c` (the Overview's panel too) |
| **m38**: F5 sitting 2, review (ledger 44) | `TraceEntry.received` read back as required, which older rows lack | `bf7b6d5` |
| **m39**: F5 sitting 2, review (ledger 45) | `received.chars` said *characters* and counts UTF-16 code units | `8f82e42` (said so) |
| **m29**: F4a sitting 1, deferred (ledger 93) | The expired card drawn twice in `app.tsx` | `fa79b46` |
| **m27**: F3 sitting 7, review (ledger 218); F4 sitting 7, M9 (ledger 717) | A guard's reason echoing a key-shaped path ended the leg `INTERNAL` | `e5c3631` (the traced reason redacted) |

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

### 2026-10-03 — thirty minors fixed overnight at Rich's *"Its pick, no decisions"* (`manifest-app-minors-2`, mock mode only)

**Rich's word** (2026-10-03, ~01:10 PDT, his night plan through `manifest-3d`; manifest's
`docs/superpowers/2026-09-30-decisions.md`, its last entry): *"Its pick, no decisions"*: any open minor that needs no
decision of his and no 7100, the sitting listing what it skipped and why. One commit per minor on `main` in the main
checkout (no worktree: Edit worked there, and no other session of ours ran), each test-first: the new test watched red for
the defect, then green; a tests-only minor's new test watched red under a control that re-made the gap, then restored.
The platform's faculty-ready sitting 2 (`manifest-71`) held the machine four times (`HOLD` on its flag file, the longest
02:11–03:25 for its close): no Vitest of ours ran in any hold; code and tests were written then and proved red and green
after.

**Fixed** (each commit names its minor; *Already fixed*, above, has the rows):

- **Web:** m30 (the not-open signal raised for a change only), m44 (`AbortError` read as our deadline too), m47 (the
  platform's fetch raises nothing for another refusal: test), m48 (`going-live.test` gives jsdom's visibility back; a
  hidden page reads nothing), m51 (*Talk it through*'s mint refused, and a session ended at it: tests), m52 (one
  Idempotency-Key per dry-run press: test), m65 (a history gap at a line's own moment drawn below it), m66 (a watch token
  minted for a failed hand-over revoked), m87 and m113 (`?then=people` / `?then=agents` taken out of the address once
  back), m95 (People's *"send them app.manifest.internal"* draws the hostname in mono), m96 (a token is never minted for
  another's conversation on `TOKEN_MISSING`), m102 (no press offered while *Waiting to reach your students* reads again
  after the gate), m110 (*Done* on an agent's key: the focus to the section's heading), m115 (the agents test's fake keeps
  an agent's id; *(yours)* asserted), m116 (Agents' two groups named by their visible labels: `Choice`'s `labelledBy`, ours),
  m118 (`didntSay` read by its own key alone).
- **Server:** m26 (the dependency guard holds `peerDependencies` and `bundle(d)Dependencies`), m33 (`"error": null` is no
  error), m34 (a body that is only `null` is FE-34's refusal however it ends), m50 (a test's title), m78 (the Stop route
  remembers who pressed it), m79 (one removal that throws stops no other, and is ended again at the next read), m80 (a
  members read listing nobody is not believed), m85 (a removal sets aside a first plan too: pinned), m100 (a new-detail
  stop clears an earlier try's note).
- **Scripts:** m53 (`check-going-live.sh` says what check 2 does not prove), m71 (`close-out.sh`'s watchers match the
  root with its slash), m72 (`read-only.ts` answers our watch as kept: **37/38 before, 38/38 after**), m74 (the
  self-test's bare Chrome pid written plain: **53/53 under `FORCE_COLOR=1`**).
- **A sweep correction:** m77 was fixed in F6b sitting 3 (`9502d7c`, Rich's word) and still listed here; moved.

**Decided, routine** (the option chosen; the options rejected; what changing course costs):

- **m66**: after a hand-over that failed, our server is asked once more (`GET …/keeping`): if it kept the token just
  minted, it is ours (and the person's own old one revoked, as on a hand-over that answered); if not, or if that read fails
  too, the token is revoked. Rejected: revoking blind (the first cut: the review's Minor 3, a race where our server kept it
  after all), and leaving it for the next visit (one more year-long token per failed visit). A wrong guess heals: a kept
  token revoked meets `4401`, is forgotten (`keeping.stopped`), and the next visit mints again.
- **m79**: each removal ended on its own, a throw logged (`console.error`, which never carries a token here), and that
  person's ending tried again at the app's next members read, from a list in memory (`unended`): **taken off stays taken
  off meanwhile** (no standing on our server). Rejected: keeping them as a member until it worked (the first cut: the
  review's Important 1, which gave a removed person their reads, their acts and an owner's Stop back, possibly for good).
  The residual: a restart forgets the list, and their conversations here are then never ended by us (the platform has
  revoked their tokens already, FE-11).
- **m95**: the sentence stays one string in `words.ts`; its address is a key of its own (`people.ourAddress`), drawn in
  mono where the sentence holds it. No word changed.
- **m102**: once the gate refuses, nothing stands in the press's place until a reading lands (`gated`); a re-read that
  fails leaves it so until the next. Rejected: *Going live*'s `ready: false` alone (the first cut: the review's Important 2,
  which drew *"Before your students can have it, this needs doing first."* with nothing under it), and keeping the press
  (it offers again what the gate just refused).
- **m110**: the focus goes to the section's heading (*Let an agent of your own in*, `tabIndex -1`), where the key was.
  Rejected: the status (it says nothing there), the name field (it invites typing), and new words in the status (Rich's).
- **m116**: `Choice` gains our `labelledBy` (the reference's `aria-label` without it; the parity test holds that markup).
  Rejected: `aria-hidden` on the visible label (the visible text should name the group).
- **m30**: only a change raises the signal (`request.method !== 'GET'`): the three operations that refuse it all start
  something.
- **m34**: the body's first 32 characters kept to tell a body that is only `null` (or one `data: null` never closed).

**The review** (a fresh reviewer on the most capable model, read-only, over `9b486cb..68fabd5`; asked whether any commit
took a decision of Rich's, and for any regression or test that cannot fail): no Critical; 26 of the 30 judged to have a
test that goes red without its fix (the rest a title, a comment and three script fixes checked by running them). **Its two
Important, fixed test-first** in `ea61389` (m79) and `962a1d8` (m102): m79's retry gave a removed person their standing back (the reviewer: *"His"*
as it stood; now a separate retry list, no standing restored); m102 drew *"needs doing first"* with nothing listed. **Its
Minor 3 fixed** (`aebba1c`: m66's race, above), **and its m48 note** (`c1412af`) (the restore was proved by the order of tests: now asserted
inside the test that set it). **Its Minor 4**, the documents, is this entry and ORIENTATION's. **Judged routine, told
here:** m110's focus target (the section's heading, existing words) and m96's *couldn't* on a path that never happens
today. Not changed: m30's and m47's 20 ms waits (each had a control).

**Controls.** Each new unit test was red before its fix (or, written during a `HOLD`, red with the fix reverted to its
committed form once `FREE` came); each tests-only minor's test went red under a control that re-made the gap (named in its
commit), and was restored. The review's four fixes were red against the commits they mend.

**The walks** (headless Chrome, `scripts/walk/`, on 7105 in mock mode): `read-only.ts` **37/38 before m72, 38/38 after**;
`self-test.ts` **53/53 under `FORCE_COLOR=1`** after m74 (52/53 before, measured by `manifest-app-verify`). No Chrome of
ours left running.

**The acceptance**, in mock mode, **twice, each from a fresh dev database** (our server stopped by pid, `app.sqlite` moved
aside, `pnpm dev:mock` again): `check-seeing.sh` 8/8, `check-going-live.sh` 8/8, `check-slice.sh` 8/8,
`check-describing.sh` 18/18, `check-building.sh` 12/12, `check-together.sh` 10 + 13, `check-keeping.sh` 8 + 12. **The mock
on 7102 still runs the fixtures it read before contract 1.6.0 landed**: restarting it is the adoption's first step.

**The gates** (at `c1412af`, on contract **1.6.0**, unadopted: `71df40d`, `95843e2`): `pnpm test` **2689 tests, 106 files,
twice** (2651 at F6b's close: 38 new), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, all clean.

**For Rich:** nothing to decide. Told here: m110's focus target (the section's heading) and m66's *"asked once more"* are
routine choices of ours, each a line to change; m95 and m116 change no word and no accessible name.

**Skipped, and why:**

- **A decision or words of Rich's:** m7, m8 (left for his eye), m25 (deferred by him until FE-20), m59, m69 and m76, m75,
  m88, m89 and m90 (new words), m91, m104, m107 (when *signed in again* stops being said), m109, m112 (a year in the day
  words), m117 (words for a refused clipboard), m119, m120, m123; m73 (the gap's time words).
- **Needs 7100:** m92 and m111 (a visually hidden name on People's and Agents' buttons changes their accessible names:
  `together-7100.ts` presses *Take off* by its text, so only a walk on 7100 re-proves it).
- **Waits on the platform:** m64 (its half in the mock's fixed `expiresAt`). *(m62 no longer applies, m122's agents
  half closed: the faculty-ready adoption, part three, 2026-10-03.)*
- **Larger than a minor tonight (M or L):** m20–m24, m54–m61, m68, m97; m106 (the focus needs a ref through `Work` and
  `RoundNeeds`: a small task of its own).
- **Not reached** (S, no decision found): m5, m6, m9–m13, m15–m18, m27–m29, m31, m32, m35–m43, m45, m46, m49, m57, m67,
  m70, m81–m84, m86, m93, m94, m98, m99, m101, m103, m105, m108, m114 (m121 since fixed by the platform's FE-52). m13's premise wants a second look (a re-read
  after the not-open signal may be wanted), and m86's *MOMENT* item needs the contract's date-time read again first.

### 2026-10-03 — m124 and m125, found and fixed by the 1.6.0 adoption (overnight, mock mode)

- **m124** (`3518242`): our API's refusals that relay a platform refusal (the project's hand-over, a change's ask, the watch's
  hand-over: our `TOKEN_NOT_FOR_PROJECT` or `PLATFORM_UNAVAILABLE`) carry the platform's id as `error.platformRequestId`;
  `OurRefusal.requestId` reads it and `ourReported()` reports it (`pressFailed`, *Building*, the plan, *Describe*, *Name it*). The
  same commit carries the id in two reports of a platform refusal the adoption's first pass missed: *Name it*'s `mintToken`, and
  the shell's refused `getMe`.
- **m125** (`d5e1274`): a session start the platform refused, worded as the model's (`AGENT_BUDGET_EXHAUSTED`, the `AI_*`
  codes), keeps its id: `ModelError.requestId`, into the round's and the work's problem rows.

Each test-first, its controls watched red (the sitting's record has them). The gates at the close: the adoption's record.

### 2026-10-03 — the faculty-ready adoption, part three (overnight, mock mode): m62, m121, m127 closed; m122 half; m129–m131 found

- **m127** (`5e656e4`): every Token fixture's maker true to its story, now that *Agents* reads `mintedBy`.
- **m122**, its *agents* half (`5e656e4`): a maker is the platform's `Token.mintedBy`, never our kept word; its *watch* half
  stays open (its row).
- **m121** fixed by the platform's FE-52 (`0d5a743`): a revoke, a removal or a switch-off publishes `pending_action.expired`,
  which the band read as an end since F6b sitting 5; held now at the API for every cause (`d6037d8`).
- **m62** no longer applies (F8, `5effd5e`; `f84c6bf` holds the platform's exact `422`).
- **Found:** m129 (*"Your agent"* for another's agent: Rich's words), m130 (the band's day for a token made elsewhere: a finding,
  Rich's word), m131 (a member's word for an agent's expiry: m122's kind; its review's).

The record: `research/2026-10-01-faculty-ready-adoption.md`, *Part three*.

### 2026-10-03 — eighteen more at a second overnight sitting, m122 closed (`app-minors-3`, mock mode only)

**Rich's word**, the same as the sitting before (manifest's `docs/superpowers/2026-09-30-decisions.md`, its last entry): *"Its
pick, no decisions"*; spawned by `manifest-3d`. One commit per minor on `main` in the main checkout, each test-first: the new
test watched red against the committed code (one written in a `HOLD`: red with the fix set aside once `FREE` came), then green.
The platform's faculty-ready sitting 6 (`plat-s6`, Task 10) held the machine twice (06:55–06:57 for its contract and mock edits;
07:14–08:53 for its close): no Vitest of ours ran in either; the review ran in the second, reading only.

**Fixed** (each commit names its minor; *Already fixed*, above, has the rows):

- **Server:** m126 (a start refused for the month: the platform's `error.limit` is moment 5's allowance and the round's
  month, never a cached budget read's checkpoint), **m122's watch half and m83** (a token id handed over beside a secret must be
  the one the secret names, `mft_<id>_…`: the watch's `400 KEEPING_INVALID`, the project's `PROJECT_INVALID`, a change's
  `CHANGE_INVALID`; `api/token-names.ts`; **m122 is closed**), m18 (built, the cost read once more), m37 (the model's `fetch`
  taken when it asks), m31 (a refusal whose body stalls is its status's), m32 (a 2xx with no body is unreachable at once),
  m27 (a guard's reason echoing `public/sk-1.js` traced redacted, never `INTERNAL`), m86 (an agent's expiry as the contract's
  date-time allows; `STOPPABLE` said once; `endWork` answers nothing; a comment), m38 (`Trace.list` answers `received` as
  optional), m39 (`received.chars` says it counts UTF-16 code units).
- **Web:** m15 (*Trying out*'s never-answered facts: the attempt the platform names for want of a route is nothing there),
  m42 (the press's refused instances read reported as `listInstances`), m93 (People reads its list again after
  `PROJECT_LAST_OWNER` or `FORBIDDEN`), m17 (*Going live*'s quiet re-read that fails keeps a good page and files nothing),
  m10 (*"You're signed in again."* said once: *Going live* and the Overview's *Waiting to reach your students* alike), m29
  (one `Expired` card), m49 (tests: the hand-over's *nothing sent* hears the page's own fakes).
- **Scripts:** `check-together.sh` and `.ts` hand over secrets that name their own ids (`1b12316`, `0168092`): the mock answers
  one token id to every mint, and accepts any Bearer.

**Decided, routine** (the option chosen; the options rejected; what changing course costs):

- **m126**: the refusal's limit first: its `amountUsd` and `resetsAt`, the read's only where it names none (after the review:
  a spent allowance says when it resets, Rich's rule); the round needs the month at once, a budget read only for a reset the
  limit does not name. Rejected: a `null` reset kept `null` (the first cut), which dropped a date the read had just given.
  One line each to change.
- **m122, m83**: the id is read from the secret alone, dashes or none (the platform's id has none; the mock's fixture has
  them), and refused under each route's existing code; no new code, no platform call. **Rejected for m83: reading an absent id
  from the secret** (its second half): every page since F6b D5 sends one, and the scripts that send none
  (`check-building.sh`, `check-describing.sh`) would keep the mock's one id for every conversation. A line to add.
- **m17**: a quiet read is the page shown again (`visibilitychange`) alone; with a good page drawn, its failure keeps the page
  as it stands (its refused line warned, no report), and the next showing reads again; the first read and *Try again* say it as
  before. **The final review's I2 test** (`live.test.tsx`, a reading that fails mid-deploy) waited for that notice: it now
  waits for the failed read and asserts the card stays with no notice. Rejected: a notice above the page (the sitting 6 review
  declined it, and it would need words).
- **m10**: the page forgets *back* at the gate (`back`; the panel's `arrived`, the same twin on the Overview, F6b Task 10).
- **m15**: by the attempt's own id, as `live.tsx` does: *"Nothing there yet."* (existing words). The Preview's trying-out tab
  is not changed (m22's ground).
- **m18**: a round ending `done` alone (a stall already reads its cost; a refusal has nothing new to show). m36's lag stays.
- **m27**: redacted in the traced reason (`runtime/run.ts`), never in the store, whose refusal stays the net; the lead reads
  its reason whole. **m39**: said, not recounted: the trace's rows keep their meaning.

**Controls.** Every behaviour fix's new test was red against the committed code (named in its commit). Tests-only and
type-only: m49's new assertion red with a change sent through the page's own fake while the `fetch` one stayed green; m38's
type made a reader of `e.received.chars` fail typecheck (TS18048); m29 with `Expired`'s button removed, two tests red. **The
committed `check-together.sh` against m122**: half one 3 passed, 7 failed (its watch hand-over refused); its leftovers forgotten
by its own `forget`, and half one 10/10 after, then both halves 10 + 13.

**The platform's Task 10, landed mid-sitting** (`EventFrame.actor`, `Manifest-Admin-Reason`, `400 ADMIN_REASON_REQUIRED`;
contract still 1.6.0): our typecheck clean against its working tree at 06:57, with no fixture of ours needing `actor`; our mock
restarted at 06:58 on its fixtures; committed as manifest `beb4827`..`efcaaeb` (143 codes; `EventActor.token` added before its
FREE), against which the closing gates ran, our mock restarted on it again at 08:54.

**The review** (a fresh read-only reviewer over `f309eb5..e5c3631`, asked whether any commit took a decision of Rich's, and for
any regression or test that cannot fail; it ran no tests, the platform holding the machine): **no Critical; no decision of
Rich's taken** (m10 the nearest: it restores the card's own once-only rule after a remount, no word changed; m107, when *signed
in again* stops being said at all, stays his); **no caller broken** (every page hand-over pairs `minted.secret` with
`minted.token.id`; the scripts that send no id are unchecked). Fixed after it, in `abaf069`:
- **Its Important 1, ruled otherwise:** the two I2 tests of the final review (`live.test.tsx`) no longer reach I2's own fallback
  (`going-live.tsx`'s `lastSeen`). Its suggested path does not either: the `changed` question is not a held phase, so the card is
  released before that read. **Every reading during a press is a quiet one**, and since m17 a quiet reading's failure keeps the
  page whole; I2's fallback is reached by no reading today, kept as it is, and the two tests are retitled to say m17 holds them.
- **Minor 2 (m93):** after `FORBIDDEN` the re-read took away the button the focus went back to: a refusal that means the list
  moved now puts the focus on what was said (the words unchanged); asserted in m93's tests.
- **Minor 3 (m126):** a limit naming no reset now keeps the read's (the round's: a budget read), so a spent allowance still says
  when it resets (Rich's rule); the plan step's header comment says where each fact comes from.
- **Minor 4 (m18):** the cost is read after *done* is said, never before it.
- **Minors 5–7:** two doc comments back above their own declarations; m38 kept by a `@ts-expect-error` reader in
  `runtime.test.ts` (red, TS2578, with `received` required again); `MOMENT` takes any fraction, as the contract's `\.\d+`.
- **Minor 8:** `0168092`'s message names the change route `POST /api/apps/:projectId/changes`; it is
  `POST /api/apps/:projectId/conversations` (not amended: history stands).

**The acceptance**, in mock mode, on the dev database as it was (every run since the 1.6.0 adoption's on it: stopping our server
for a fresh one was refused twice tonight), against our mock restarted at 08:54 on the platform's committed Task 10
(`efcaaeb`): `check-seeing.sh` 8/8, `check-going-live.sh` 8/8, `check-slice.sh` 8/8, `check-describing.sh` 18/18,
`check-building.sh` 12/12, `check-together.sh` 10 + 13, `check-keeping.sh` 8 + 12.

**The gates** (at `abaf069`, contract 1.6.0 with Task 10 at manifest `efcaaeb`): `pnpm test` **2785 tests, 106 files, twice**
(2752 at the adoption's part three: 33 new), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, all clean. Our server on 7105
stays in mock mode (pid 9809's watcher throughout); no Vitest of ours left running.

**For Rich:** nothing to decide. Told: m17 (a quiet read's failure says nothing on the page) and m83 (an absent id not read
from the secret), each a line to change.

**Skipped, and why:**

- **m131** (named needing no decision): **no decision-free fix exists.** The keeper cannot read another token's question
  (manifest's `api/routes/pending-actions.ts`, `getPendingAction`: a token reads *"ITS OWN, and nothing else"*) nor its expiry
  (`listTokens` is a session's); keeping an expiry only from a mint our page saw needs the agent's key sent to our server
  (F6b's Review Focus 4: never a secret on `POST …/agents`); and m130's finding (the expiry on the event) is Rich's word.
  Task 10's `EventFrame.actor` names a person by display name only, too weak to match a kept row. Open; accept it, or decide
  m130.
- **m45**: reading the checklist of an app whose draft serves nothing goes past F5 Decision 3's rule (*"the only ones whose
  checklist is read"*): a decision's edge.
- **m101**: its second half (the landed moment kept under its heading, hiding a later version) needs the press's landed
  version out of `LetStudentsIn` and an Overview-level landing test (m105's): larger than a minor. Its first half is m17's
  mechanism, for the Overview.
- **m12**: needs a mark in our progress contract (server and page) for a fix that never started: a small task of its own.
- **m43**: begun as the `HOLD` came (nothing written).
- **The sitting before's lists stand** for Rich's (m7, m8, m25, m59, m69 and m76, m75, m88–m91, m104, m107, m109, m112, m117,
  m119, m120, m123, m73; and m129, m130), 7100's (m92, m111), the platform's (m64) and the larger (m20–m24, m54–m61, m68,
  m97, m106).
- **Not reached** (S, no decision found): m5, m6, m9, m11, m13, m16, m28, m35, m36, m40, m41, m46, m67, m70, m81, m82, m84,
  m94, m98, m108, m128 (at Rich's review of `close-out.sh`); m99, m103 and m114 may need words.

## No longer applies

- **m62** (the faculty-ready adoption note, §5): *a provider's refusal streamed as an error event mid-answer is said as unreachable*. The platform's F8 (`5effd5e`) sends a provider's `422` as an HTTP `422` with a JSON body **before any stream begins**, and `client.ts` reads the status before the stream (`MODEL_ANSWER_INVALID`, held by `client.test.ts` with the platform's exact body, as a streamed request's: `f84c6bf`). An error chunk mid-stream is now only the gateway's own, which `MODEL_UNREACHABLE` says truly.

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
