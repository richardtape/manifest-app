# Deferred minors — an inventory for Rich

*Collected 2026-10-01 by manifest-app-3a from the dated entries of F2, F3, F4, F4a and F5, each checked against main at
`238e6a0`. Nothing here is fixed: Rich chooses.* *Seven were fixed at his word (m1–m4, m14, m19, m63; 2026-10-02),
and thirty at his overnight *"Its pick, no decisions"* (2026-10-03; m77 found already fixed), and eighteen more at a second
sitting under the same words the same morning (m122 closed with it), and fifteen in a fourth round that afternoon (m129 and m120
at his words, m132 found and fixed), and twelve in a fifth that evening (five at his words of 14:42 PDT, four he left to us,
three more of ours), and seven in a sixth (m133 and his rulings of 20:07 and 20:21 PDT among them; m16 and half of m67
accepted as they are), and eight in a seventh (m134, m136 and m135 first; m99 at his ruling of 23:31 PDT; m45 accepted as it
is): see* Already fixed *and its dated entries.*

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
| m7 | F5 sitting 3, review (ledger 118), *"for Rich's click"* | A held clock (someone has it) is filled lighter than the not-started hatch, so it can look emptier than one not started. | `packages/ui/src/components.css:201-203` (`--waiting-tint`). | S | faculty-visible |
| m8 | F5 sitting 4, review (ledger 183), *"for Rich's click"* | The administrator's reason is quoted inline in ‘ ’; moment 13 puts it behind the Card's one left rule. | `packages/web/src/words.ts:713` and `:735`; drawn as the row's sentence (`sign-off.tsx:74`). | S | faculty-visible |
| m20 | F4 sitting 7, M3 (ledger 711) | Several secrets set at once: one refused after another was set empties both fields, and both are typed again. | `screens/trying-out/parts.tsx:168-171` empties every field on send; the loops at `put.tsx:553-559` and `going-live/live.tsx:347-354`. | M | faculty-visible |
| m21 | F5 sitting 5, review M10 (ledger 244) | A dropped connection on the live deploy (a `TypeError`) is said as *didn't go*, without one read of the live address. | `going-live/live.tsx:279-283`: only our deadline reads on; anything else ends at `:305` (`didNotGo(error, 'deploy')`). | M | faculty-visible |
| m22 | F5 sitting 6 (first half), own review M1 (ledger 314) | Before a launch, the Preview can call an older failed dry run *"the last attempt"*, even after a newer one passed and was taken down. | `screens/preview/facts.ts:64-69`: with nothing served, `after()` counts every failed instance; `:98-99`. | M | faculty-visible |
| m23 | F5 sitting 6 (first half), own review M3 (ledger 316) | The dry run's endings never give way: *didn't start* with no incident has no button until a reload; *passed* and *failed* outlive a reading that names a new version. | `going-live/dry-run.tsx:191-195` gives way only when the row is met; `:412-425` (no action without an incident). | M | faculty-visible |
| m24 | F4 sitting 7, M5 (ledger 713) | The line is the app's, but its words and link are the person's: *"…which is waiting for you"*, and a link to another member's conversation that answers `404`. | `packages/server/src/api/line-state.ts:86-96` carries no owner; `screens/change/waiting.tsx:96-107`. | L | faculty-visible |
| m25 | F2, *After F2: the deferred Minors*, item 1 (ledger 194) | The FE-20 honesty check reads only *Who gets in*: a class-only promise in another part, or in *Things we assumed*, passes. **Rich deferred it** until the class-limited sign-in lands (FE-20). | `packages/server/src/agents/plan.ts:127` and `agents/change.ts:134` rewrite `whoGetsIn` alone. | L | faculty-visible |
| m36 | F5 sitting 2, review (ledger 39) | The stall's forced cost read comes before the gateway's spend settles (within 60 s), so the line shows the old figure until *Carry on*. | `round.ts:446`. | S | robustness |
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

**From F6's whole-branch review** (sitting 7's unattended half, `manifest-app-s7`, 2026-10-02; the plan's entry *Sitting
7, part one*, its *Minors*). Each was read in the code at `d3600be`; none was fixed (the review's two Important were).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m64 | F6's whole-branch review, M1 | `check-keeping.sh`'s check 1 goes red from **18 November 2026**: the mock mints every token with a fixed `expiresAt` (`2026-12-18T09:00Z`), so 30 days before it our server no longer counts it good and the second hand answers `201`, not `200 current`. From then on, mock mode re-mints on every app page and revokes the id it has just handed (the same fixed id). | `scripts/check-keeping.sh:119`; `packages/web/src/screens/keeping/watch.ts:63` (the revoke); the mock's token fixture (the platform's). | S | scripts |
| m68 | F6's whole-branch review, M5 | An app's history grows without bound, and each `/api/needs` and `/api/since` load reads every kept app's whole history up to three times. Fine at pilot scale. | `packages/server/src/api/keeping.ts:114`, `:126`, `:202`. | M | robustness |

**m64.** Date-proof the harness: hand twice and accept `200 current` or, past the fixed date, check the second answer
against the first's `until`; and in `watch.ts` never revoke an id equal to the one just minted. Control: set the fake
clock past 18 November and see check 1's new form stay green while the old one goes red.
**m68.** Read each history once per request, or keep the newest outage and lines per app; measure first.

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


**From F6b sitting 3's whole-sitting review** (`manifest-app-b8`, 2026-10-02, a fresh reviewer over `a084ca7..842a403`; its
six Important and one Minor re-graded Important fixed test-first in `3912ff3`, these ten here).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m88 | The review's M2 | A removed member's conversation keeps *"Only Sam can answer it or carry it on."* above *"Sam was taken off … Their work on it stopped."* When its stop is a removal, say *"Sam started this."* alone. | `packages/web/src/screens/change/together.tsx` (`StartedBy`). | S | faculty-visible |
| m89 | The review's M3 | The waiting card, another holding the app, drops *"It starts by itself."*, and says *"Sam is working on it"* even when the holder waits on Sam. | `packages/web/src/screens/change/waiting.tsx` (the holder's branch). | S | faculty-visible |
| m90 | The review's M4 | Another's round needing a token reads *"Working, a few minutes"* with motion, though only its person's page can hand one over: it waits on them. | `packages/web/src/screens/building/model.ts` (`chipOf`'s token case). | S | faculty-visible |
| m91 | The review's M5 | The owner who pressed Stop reads *"Stopped by <their own name>."*; *"You stopped it."* (words for Rich). | `packages/web/src/screens/building/building.tsx` (`stoppedBy`), `change/waiting.tsx`. | S | faculty-visible |
| m92 | The review's M6 | People's rows share their buttons' names (*Make owner*, *Take off*): a screen reader's list of buttons cannot tell whose. Add the member's name, visually hidden. | `packages/web/src/screens/people/people.tsx`. | S | accessibility |

**From F6b sitting 1's measurements on 7100** (`manifest-app-30`, 2026-10-02, M3; the plan's entry *Sitting 1*).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m97 | M3, seen live | The history names people from the members we keep **now**, so once someone is taken off, every line about them (their adding, their new role, their removal) loses their name: *"Test Instructor took someone off it"*, *"… added someone"*. Seen in `/api/apps/:id/history` while `colleague` was off the app; their name came back when they were added again. Keep each person's name with the happening (or a name kept for former members), as F6 sitting 5's *"Alice took Bob off it"* meant. | `packages/server/src/keeping/happenings.ts` (`linesOf` → `nameOf(members, …)`); `emails.ts`'s `nameOf` reads the same members. | S | faculty-visible |

**From F6b sitting 4's walk** (`manifest-app-30`, 2026-10-02, mock mode; the plan's entry *Sitting 4*).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|

**From F6b sitting 4's whole-sitting review** (`manifest-app-30`, 2026-10-02, a fresh reviewer over `86c2156..6efc46e`; its
three Important and four minors re-graded Important fixed test-first in `3c31dd0`, these seven here).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m104 | The review's M10 | **[Leave it out]**'s own commit removes the attribute, so the new conversation says it *"needs a Manifest administrator's look… because it changes who it learns about"* while the readiness will be self-serve. Decision 8 allows over-saying; every [Leave it out] does it. **Rich, 2026-10-03, ~14:48 PDT: ask the platform (FE-54, (a)); open until it lands** (the platform's FE-46/47/5 plan, Task 2b). | `api/sensitive.ts`'s union; the platform's `sensitiveDiff` names a removal too. | S | faculty-visible |

**From F6b sitting 5** (`manifest-app-ba`, 2026-10-02): its walk's m107, and the whole-sitting review's minors (a fresh
reviewer over `7a85693..f14a877`; its two Important and two minors re-graded Important fixed test-first in `4c44f2a`).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m111 | The review's Minor 6 | Every row's *Revoke* and every card's *Yes, once* / *No* share one accessible name (m92's kind): add the agent's name, visually hidden. | `agents.tsx`, `question.tsx`. | S | accessibility |

**From F6b sitting 6** (`manifest-app-a1`, 2026-10-03): the whole-branch review's minors and the walk's m123 (a fresh reviewer over
`af8983c..3d5142d`, F6b's 25 commits; its two Important fixed test-first in `726bb53`; its M4 was the walk's, `6b6cb59`).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|

**From the 1.6.0 adoption** (2026-10-03, overnight, mock mode; `research/2026-10-01-faculty-ready-adoption.md`, *Part one*): read
while carrying the platform's request id (FE-30) and a limit's facts (FE-29). m124 and m125 were fixed the same sitting, and
m126 by the second minors sitting of 2026-10-03 (`8743428`): *Already fixed*, below. None is open.

**From the `__Host-` adoption** (2026-10-03, overnight, mock mode; the same note, *Part two*): both open, neither needing a
decision.

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m128 | The adoption's reading | `close-out.sh`'s mock probe (`:212`) sends `manifest_session=mock-session` by name, right for the mock (loopback http keeps the plain name) but the only session name in `scripts/` not derived from its origin. Harmless while the mock is http; say why in a comment, or derive it, when Rich reviews the script. | `scripts/close-out.sh`. | S | code |
| m130 | The faculty-ready adoption, part three | The platform now caps a question at its token's expiry, and our band and email cap it only for an agent our page let in (its kept expiry): for a token made elsewhere (the console, an API mint) the band can say *"your agent is asking something"* after the question ended by time, until its day is out, with no card behind it (the card reads the platform's own `expiresAt`). The keeper cannot read that token's expiry (`listTokens` is a person's; the event carries none). Ask the platform to put `expiresAt` on `pending_action.created` (a finding, FE-n, at Rich's word), or leave it. **Rich (2026-10-03, ~12:45 PDT; manifest's `docs/superpowers/2026-09-30-decisions.md`, item 4): ask it. Filed as FE-53** (`api-findings.md`), placed with FE-5 after the faculty-ready plan; **open until FE-53 lands**, then the band and the email read the platform's end. | `packages/server/src/keeping/happenings.ts` (`questionsOf`). | S | faculty-visible |
| m131 | The faculty-ready adoption, part three (its review) | The question's wait is capped by the expiry our page handed over for an agent (`POST …/agents`'s `expiresAt`, the first kept for an id standing): a member who kept someone else's token id with an early expiry would end that token's band need and shorten the email's *"It stops waiting at …"*. The card on *Agents* stays right (the platform's own `expiresAt`). m122's kind: our server cannot check a member's word against `listTokens`. Accept it, or keep the expiry only from a mint our page saw (the page's `mintToken` answer is the only source today). **Rich (2026-10-03, ~12:45 PDT; manifest's `docs/superpowers/2026-09-30-decisions.md`, item 4): FE-53 gives it its fix** (the platform's expiry read, never a member's word): **closes when FE-53 lands**, open until then. | `packages/server/src/keeping/happenings.ts` (`tokenEndsOf`), `api/minted.ts` (`POST …/agents`). | S | robustness |

**From F5b's sitting 1, the measurements on 7100** (`manifest-app-79`, 2026-10-03, evening; the plan's dated entry).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|

**From the sixth round's review** (`manifest-app-c1`, 2026-10-03, a fresh read-only reviewer over the round's first six
commits; its other findings fixed in the same round, below).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|

**From the seventh round's review** (`manifest-app-cf`, 2026-10-03, a fresh read-only reviewer over `6bbbede..d096a5d`; its
I1 and four of its minors fixed the same round, below).

| ID | From | The minor | Where it is today | Size | Affects |
|---|---|---|---|---|---|
| m137 | The seventh round's review, M4 | *Waiting to reach your students* reads its checklist again when the page is shown again (m136), but the students' version (`served`) is the Overview's `production`, which is not read again then: a colleague who let the students have it meanwhile leaves the panel saying *"Your students have the version from <old>"*, with a press that would send the same version again, until a new visit. Read the live address in the panel's own reading (it unmounts nothing). | `packages/web/src/screens/overview/new-version.tsx` (`served`, the reading's effect). | S | faculty-visible |
| m138 | The seventh round's review, M5 | A reading taken while a press works (they leave, as *"You can leave: it keeps going"* invites, and come back) may name a version a colleague put on trying-out meanwhile; it is kept as the landing's `named` (m101's review), so the landed moment never gives way to it on that visit. No worse than before m136. Record what the readings named when the press started (a reading's sequence number). | `packages/web/src/screens/going-live/live.tsx` (`naming`, `land`, the give-way effect). | S | faculty-visible |
| m139 | The seventh round's review, M6 | A quiet re-read that fails only in part loses good facts: a momentary `getRelease` refusal turns dated facts into m103's undated words; a momentary `getApproval` refusal replaces a good sign-off row with *"We can't tell"* and files a report. m17's rule (a quiet read keeps a good page) covers only a whole read that fails. Going live may share it. | `packages/web/src/screens/overview/new-version.tsx` (`day`, `decision`); `going-live/going-live.tsx` (`read`). | S | robustness |

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
| **m66**: F6's whole-branch review, M3 | A watch token minted for a failed hand-over left alive | `1540110`, `aebba1c` (our server asked once; revoked unless it kept it: the review); accepted by Rich, 2026-10-03 |
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
| **m110**: F6b sitting 5's review, Minor 5 | *Done* on the key's card moved the focus to an empty status | `b319882` (the section's heading); accepted by Rich, 2026-10-03 |
| **m113**: F6b sitting 5's review, Minor 8 | `?then=agents` stayed in the address | `87e5c5b` |
| **m115**: F6b sitting 5's review, Minor 10 | The mint test's *"(yours)"* comment, never asserted | `9e0a3df` |
| **m116**: F6b sitting 5's review, Minor 11 | *What may it do?* and *How long should it last?* heard twice | `1ed1f02` (`Choice`'s `labelledBy`, ours) |
| **m118**: F6b sitting 5's review, Minor 13 | `q.didntSay[action]` read without `Object.hasOwn` | `1f91fe3` |
| The review's M2 (F6b sitting 5), **m121** | A question's band line outlives its agent (a helper's revoke, a removal) | the platform's `0d5a743` (FE-52: `pending_action.expired` on a revoke, a removal, a switch-off), read by `questionsOf` since sitting 5; held by `d6037d8` |
| The platform's Task 13, met mid-sitting, **m127** | Our Token fixtures named the mock's person as every token's maker | `5e656e4` |
| **m126**: the 1.6.0 adoption | A start refused for the month said the allowance from a cached budget read, and the round made a spent month the session's checkpoint | `8743428` (the platform's `error.limit`) |
| **m122**: F6b sitting 6's review, M3 | A member's word claimed a token id: its *watch* half (an outside token noted under *Our agents*) | `44793b5`, `1b12316` (the secret must name the id; its *agents* half: `5e656e4`) |
| **m83**: F6b sitting 2's review, M7 | A conversation's token id handed over unchecked against its secret | `0168092` (an absent id is still not read from the secret: its entry); accepted by Rich, 2026-10-03 |
| **m18**: F3 sitting 7, review (ledger 213) | The cost line at *built* stale: nothing read it after the round | `2763335` (m36's lag stays) |
| **m37**: F5 sitting 2, review (ledger 42) | The model's `fetch` taken when the model was made | `b9ddb64` |
| **m15**: F5 sitting 6 (first half), whole-branch review (ledger 302) | *Trying out*'s never-answered facts named the failed attempt as serving | `74f6097` |
| **m42**: F5 sitting 5, review M7 (ledger 242) | A failed `listInstances` at the press reported as `getLaunchReadiness` | `2a70baf` |
| **m93**: F6b sitting 3's review, M7 | People never read its list again after a refusal that meant it moved | `68413d6` |
| **m49**: F5 sitting 4, review (ledger 184) | `students.test`'s *nothing sent* heard only `fetch` | `e0a029d` |
| **m86**: F6b sitting 2's review, M10 | A stale comment, `STOPPED_FROM` twice, `endWork`'s unread boolean, `MOMENT` stricter than the contract | `03d5098` |
| **m17**: F5 sitting 3, review (ledger 116) | A failed quiet re-read replaced *Going live*'s good page and filed a report at every tab switch | `0a874e9`; accepted by Rich, 2026-10-03 |
| **m31**: F5 sitting 2, review (ledger 37) | A refusal whose body stalled was said as a stall | `52591d8` |
| **m32**: F5 sitting 2, review (ledger 40) | A 2xx with no body waited out the first-word deadline | `460ccc8` |
| **m10**: F5 sitting 5, review M2 (ledger 240) | *"You're signed in again."* said again after a gate refusal | `8daf66c` (the Overview's panel too) |
| **m38**: F5 sitting 2, review (ledger 44) | `TraceEntry.received` read back as required, which older rows lack | `bf7b6d5` |
| **m39**: F5 sitting 2, review (ledger 45) | `received.chars` said *characters* and counts UTF-16 code units | `8f82e42` (said so) |
| **m29**: F4a sitting 1, deferred (ledger 93) | The expired card drawn twice in `app.tsx` | `fa79b46` |
| **m27**: F3 sitting 7, review (ledger 218); F4 sitting 7, M9 (ledger 717) | A guard's reason echoing a key-shaped path ended the leg `INTERNAL` | `e5c3631` (the traced reason redacted) |
| **m5**: F2, *After F2: the deferred Minors* | The window-behind notice had space beneath its one line | `f68ab80` (a card's last line keeps no margin) |
| **m6**: F2, the same entry | At 375 a support reference in a field's message broke at its hyphen | `040c623` (`ReferenceLine`, kept whole) |
| **m9**: F5 sitting 6 (first half), whole-branch review M5' (ledger 283) | *"Nothing counting yet"* beside *"We can't tell right now"* | `42f4458` (`ProgressBar`'s words given as nothing say nothing) |
| **m13**: F4a sitting 1, deferred (ledger 91) | `useKeeps` drew loading again for `getMe` read again with the same answer | `5e6cca9` (keyed on the person; it still asks again) |
| **m28**: F4 sitting 7, M7 (ledger 715) | Their words marked noted when `docs/plan.md` no longer read back | `8512385` |
| **m35**: F5 sitting 2, review (ledger 38) | A stream broken mid-answer left no trace and forced no cost read | `2c3fdad` (`stalled: 'broken'`) |
| **m40**: F5 sitting 6 (first half), own review M5 (ledger 318) | The lead's view named no detail carried and never asked for | `7158a17` |
| **m43**: F5 sitting 5, review M9 (ledger 243) | The 2-s incident re-read was made after its page had gone | `51812e8` (each caller's live flag) |
| **m81**: The review's M5 (F6's race) | Two members reads out of order could put back someone taken off | `3b4e165` (reads numbered) |
| **m84**: The review's M8 | Someone taken off while their app was being made left it holding the app | `1b0e8d6` |
| **m94**: The review's M9 | Another's conversation while its app was made named nobody | `9e0fa5f` |
| **m108**: The review's Minor 3 | A replay holding a question and its answer emailed the question | `f130230` (held to the replay's report) |
| **m120**: F6b sitting 6's review, M1 (Rich: *"Yes, any member"*) | After launch, a helper was offered no sign-off ask | `6adc8cd` |
| **m129**: The faculty-ready adoption, part three (Rich's words) | *"Your agent"* for another member's agent, on the card and in the email | `937f99f` |
| **m132**: found 2026-10-03 (`manifest-app-5a`, after m129) | The band said *"your agent is asking something"* to every member, whoever made the agent | `0d9dc10` (Rich's words for m129) |
| **m69**, **m76**: F6's whole-branch review M6; F6b sitting 2's review I2 (Rich, 2026-10-03: *"A different email"*) | A switch-off, a deletion or a removal under a round emailed its person *"we need you"* | `2d2f887` (held a minute, then why it stopped, in Rich's words; a first build's its own), `ad1eb6b` (the review's fixes) |
| **m109**: F6b sitting 5's review, Minor 4 (Rich's words) | A helper's band offered **[Agents]** for what only an owner answers | `0c20ae2`, `1e505fd` |
| **m119**: F6b sitting 5's review, Minor 14 (Rich's words) | *"You said no, and it has been told."* overstated | `3c3a48f` |
| **m123**: F6b sitting 6's walk on 7100 (Rich: *"Re-ask once"*) | Machinery in a change plan's *Things we assumed* | `92b3ec1` |
| **m107**: F6b sitting 5's walk (ours, at Rich's *"Yes, its call"*) | *"You're signed in again."* stayed after a press that was not an answer | `0e42077` (its test in `0bf6d7c`) |
| **m112**: F6b sitting 5's review, Minor 7 (ours, the same) | *"Stops working <day>"* had no year | `0bf6d7c` |
| **m114**: F6b sitting 5's review, Minor 9 (ours, the same) | A role not known: the question's card said nothing of who answers | `f3fac3f`, `3066286` (the review: *"We can't tell right now whether you can answer this."*) |
| **m117**: F6b sitting 5's review, Minor 12 (ours, the same) | A refused clipboard said nothing on *Copy* | `02365a8` |
| **m11**: F5 sitting 4, review (ledger 182) | A failed sign-off read said *"We can't tell right now…"* with no reference | `9b31e00` (reported once as `getApproval`), `a54e88c` (the Overview's too) |
| **m12**: F4 sitting 7, M11 (ledger 719) | The *Interrupted* card filed a problem for a fix that never started | `eda591b` (`RoundView.forgotten`) |
| **m70**: F6's whole-branch review, M7 | The keeper started before our server held 7105 | `7cc841c` (on listen), `5b763d8` (a failed start said); its rounds' half is m133 |
| **m133**: the fifth round's review, I4 (Rich: *"Fix it"*) | An idle watcher refused 7105 marked the live server's rounds interrupted and started its line | `97d1ce4` (both in `onListen`, before the keeper: ours, within his ruling), `cadee0f` (the review: each its own `try`) |
| **m82**: F6's whole-branch review, M6 (Rich: *"Re-read on a stranger"*) | Someone added since our last read met 404 on their own new change | `170ea27` (`Keeper.readMembers` with the change's own token), `5a6fb10` (the review: never over a watch opened meanwhile) |
| **m67**, its first half: F6's whole-branch review, M4 (Rich: *"A minute after start"*) | The first *still waiting for you* scan an hour after each start | `1965e40`; its other half accepted (below) |
| **m46**: F3 sitting 7, review (ledger 215) (Rich: *"Interrupted card"*) | A page opened on a round needing a token renewed it and carried on by itself | `9559b1f`, `2f867b0` (the review: a press's hand-over is the renewal) |
| **m41**: F5 sitting 5, review M5 (ledger 241) | Five more minutes counted in ticks a hidden tab stretches; overlapping reads | `d41b8e6` (`readFor`, by the clock) |
| **m101**: F6b sitting 3's review, M7 | The landed moment lost to a quiet read that failed, and kept over a later version | `0bb0c8b` (m17's rule for the Overview; M4's give-way after a launch), `d4a6ef2` (the review: never to an older reading's); its rest is m136 |
| **m98**: F6b sitting 4's walk, 375 | The re-escalated panel's sign-off row outside any list, its *"you"* alone under the sentence | `8b83978` (Going live's list; an owner line that repeats its chip dropped), the walk at 375 |
| **m134**: F5b sitting 1, M2 (Task 2's **(S1: M2)**) | An app that signed people in, drafted, then stopped read *drafted, not sent*, never *"Not needed: it doesn't sign anyone in."* | `f191d2b` (no registration in force, never none on file) |
| **m136**: the sixth round's review, Minor 4 | *Waiting to reach your students* read nothing when the page was shown again, and its give-way said nothing to a screen reader | `25f045e` (a shown-again read; the facts' live region), `c1a0705` (the review: said only when a landed moment gives way; no gap of its own) |
| **m135**: F5b sitting 1, M7 | The change planner described an app it could not see, and the lead built part of it | `91793a6` (*"We don't know this part yet: it was never written down."*, ours), `155696d` (the review: who gets in too; kept on the next change) |
| **m99**: F6b sitting 4's walk (Rich, 23:31 PDT: *"Line only while the press works"*; at 22:55, on a wrong premise, *"Drop the press's line after launch"*) | Self-serve, the panel named the version on trying-out twice | `94350b3`, superseded in shape by `bd696e3` (the line only while the press works, where the facts are held) |
| **m73**: `manifest-app-verify`'s walk | A gap inside one day read *"between 29 September and 29 September"*, and the day's heading repeated after it | `f66eb11` (its times, the day once), `25bef8d` (the review: inside one minute, a moment) |
| **m106**: F6b sitting 4's review, M12 | The focus fell to the page when **[Leave it out]** became *"Starting that change…"*, and stayed there after a refusal | `6803954` |
| **m103**: F6b sitting 4's review, M9 (second half) | Undated, the facts said which version was newer | `72bcd99` (*"a different version"*, ours) |
| **m105**: F6b sitting 4's review, M11 | No Overview-level test of the held press across the Overview's re-read; [What went wrong] after a launch unasserted | `d096a5d` |

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
routine choices of ours, each a line to change; m95 and m116 change no word and no accessible name. **Accepted by Rich as made**
(2026-10-03, ~12:45 PDT; manifest's `docs/superpowers/2026-09-30-decisions.md`, item 4).

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
from the secret), each a line to change. **Accepted by Rich as made** (2026-10-03, ~12:45 PDT; manifest's `docs/superpowers/2026-09-30-decisions.md`, item 4).

**Skipped, and why:**

- **m131** (named needing no decision): **no decision-free fix exists.** The keeper cannot read another token's question
  (manifest's `api/routes/pending-actions.ts`, `getPendingAction`: a token reads *"ITS OWN, and nothing else"*) nor its expiry
  (`listTokens` is a session's); keeping an expiry only from a mint our page saw needs the agent's key sent to our server
  (F6b's Review Focus 4: never a secret on `POST …/agents`); and m130's finding (the expiry on the event) is Rich's word.
  Task 10's `EventFrame.actor` names a person by display name only, too weak to match a kept row. Open; accept it, or decide
  m130. *(Rich decided m130 the same day: FE-53; m131 closes when it lands.)*
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

### 2026-10-03 — a fourth round: fifteen fixed, m129 and m132 among them (`manifest-app-5a`, mock mode only)

**Who asked:** `manifest-94` (the platform's day session, coordinating), at Rich's spawn of this session: record his decisions of
~12:45 PDT, build Q10 and m129, then *"a fourth minors round: any open minor needing no decision of Rich's and no 7100"*; m120
joined at his *"Yes, any member"* (~13:45 PDT). One commit per minor on `main`, each test-first: the new test watched red against
the committed code, then green, then a negative control (the fix taken out, its tests red, restored by hash). The platform's
sitting 5 (`manifest-b9`) and Rich's driver-1 script held the machine five times: no Vitest of ours ran in a HOLD; tests written
then were run red at the next FREE before any fix.

**Fixed** (each commit names its minor; *Already fixed*, above, has the rows):

- **Rich's words, built:** **m129** (`937f99f`: *"<Name>'s agent '<name>'"* for another's agent on the card and in each owner's
  email, body and subject; *"Your agent '<name>'"* for their own) and **m132**, found after it (`0d9dc10`: the band said *"your
  agent"* to every member); **m120** (`6adc8cd`: after launch any member reads F5b's sign-off and may ask, as before launch; the
  press to let the students have it stays an owner's).
- **Server:** m108 (`f130230`: the stream says which events a replay carried; a replay's questions are emailed at its report,
  only those its own answers left waiting), m84 (`1b0e8d6`: someone taken off while their app is being made: set aside, the app
  freed), m40 (`7158a17`: the lead's view names details carried and never asked for), m35 (`2c3fdad`: a stream broken mid-answer
  is traced with how much came, `stalled: 'broken'`, and its cost read again), m28 (`8512385`: their words not marked noted when
  `docs/plan.md` no longer reads back), m81 (`3b4e165`: members reads numbered; an older answer, or one begun before a member
  event heard since, is not kept).
- **Web and ui:** m13 (`5e6cca9`: the same person read again keeps their page while it asks again), m94 (`9e0fa5f`: *Making it*
  on another's conversation says who started it), m43 (`51812e8`: the incident's 2-s re-read never made once its page has gone,
  at all four callers), m9 (`42f4458`: `ProgressBar`'s clock says nothing for words given as nothing), m6 (`040c623`:
  `ReferenceLine`, a support reference kept whole, `FieldMessage.body` a node), m5 (`f68ab80`: a card's last line keeps no
  margin beneath it; `app-css.test.ts` reads `app.css` as text, as the design system's styles test does).

**Decided, routine** (the option chosen; the options rejected; what changing course costs):

- **m13**: keyed on the person's id; a re-read still asks `listProjects` again and replaces the answer. Rejected: asking nothing
  on a re-read (a not-open signal may mean what they keep changed). One comparison.
- **m108**: the stream's handler takes `replayed` (absent: live). Rejected: holding every question to the next report (a live
  one would wait for a reconnect). `check-keeping.ts`'s fake replay says it too.
- **m84**: only a removal reaches `making` (Stop's route still refuses it). Rejected: Stop on `making` (nothing to stop: the
  page's own Make it is under way).
- **m35**: `stalled` gains `'broken'` (nobody else reads the field). Rejected: a field of its own.
- **m28**: the round's next `done`, if any, tries again; a later round counts only its own words (the review's M3: the
  comment first said otherwise, corrected in the review's commit; `8512385`'s message stands).
- **m81**: a member event makes every members read begun before it unbelieved; its own read follows it.
- **m120**: drawn while the role is unread too, as *Going live* draws it before launch.
- **m6**: `FieldMessage.body` takes a node (ours since F1). Rejected: a non-breaking hyphen in the reference (a person copying it
  by hand would copy a character support cannot search).
- **m5**: at source, every card ending on its sentence (`.mf-card .body-lead:last-child`). Rejected: the plan's notice alone.
  **Not walked** at 1440 or 375: a later walk should glance at the cards that end on a sentence.
- **m9**: at source (`??` for the reference's two defaults); its parity test still holds the markup without props.

**Ours, for Rich** (none taken without a pattern he approved): m129's *"An agent '<name>'"* for a maker the members do not name,
and *"an agent is asking something"* (band and email subject) for an agent our page did not let in; Q10's fold (a second act
within the hour, the same reason, is the first's line). Both told to `manifest-94` at the close.

**The review** (a fresh read-only reviewer over `cb78922..` and the uncommitted m5/m6, during a HOLD, running nothing): **no
Critical**; no caller broken (every changed signature's callers checked); no C3 or accessibility slip. Fixed after it, test-first,
in `d4cd8b0`:
- **I1 (Important, m81's):** a members read not kept also dropped the name the *"someone was added"* email waited for (two
  additions close together, or a replay holding both): `refresh` now answers the members it read, and the email names the person
  from its own event's read.
- **M1:** a read that lists nobody moved what is believed and knocked out an older real one: it no longer moves it.
- **M2 (m108's):** a replay's held questions were lost when its stream was replaced before the report: the new stream takes them.
- **M3:** m28's comment corrected (above). **M6:** `lineWords` reads a missing `administrator` as none (`== null`).
- **M4, M5:** for Rich (above). **M7:** m9 also quiets an `attention` step's empty meta: consistent, unreachable until part two.

**Controls.** Every behaviour fix's new test was red against the committed code; each fix's negative control red, restored by
hash (`*-controls.py` in the session's scratchpad); the review's four fixes the same (four controls, each red).

**The acceptance**, in mock mode, on the dev database as it was (now **version 8**), against our mock restarted at ~13:30 on the
platform's `56c614a`/`9b216d3`: `check-seeing.sh` 8/8, `check-going-live.sh` 8/8, `check-slice.sh` 8/8, `check-describing.sh`
18/18, `check-building.sh` 12/12, `check-together.sh` 10 + 13, `check-keeping.sh` 8 + 12.

**The gates** (at `d4cd8b0`): `pnpm test` **2831 tests, 108 files, twice** (2785 at `abaf069`: 46 new, Q10's and m129's among
them), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, all clean. Our server on 7105 stays in mock mode; no Vitest of ours
left running.

**Skipped, and why:**
- **m11** (a failed sign-off read without a reference): a reported reference on a row, through a read that is also the quiet
  one (m17's rule): a small task of its own. **m16** (two millisecond races): the approval needs the checklist's candidate first;
  no cheap order. **m36**: the sitting before's ruling stands (*"m36's lag stays"*). **m41**: three copies of a timer and the
  tests that count its ticks: a small task (a shared wall-clock helper). **m46**: what a person sees on arriving at a round left
  needing a token (a press instead of a renewal) is a design question. **m67**: which old waits are *new* is a ruling (and a scan
  at start). **m70**: the live server's retry loop must keep checking its claim, and the keeper start after listen: a small
  task. **m82**: when our server should read the members on a member's own change: a ruling. **m98**: needs a walk at 375 on a
  staged re-escalated Overview to see the defect at all. **m12, m101**: small tasks of their own (unchanged).
- **Rich's, decided by him at 14:42 PDT** (through `manifest-94`, after this round began; **not touched here**: a fresh session,
  `manifest-app-f6`, records and builds them): m69/m76, m104, m107–m119 still open, m123. **The sitting before's other lists
  stand**: Rich's (m7, m8, m25, m59, m75, m88–m91), 7100's (m92), the platform's (m64; m130 and m131 with FE-53) and the larger
  (m20–m24, m54–m61, m68, m97, m106).

### 2026-10-03 — a fifth round: Rich's words built, twelve fixed, m104 asked of the platform (`manifest-app-f6`, mock mode only)

**Who asked:** `manifest-94` (the platform's day session, coordinating), at Rich's spawn of this session, with his decisions of
14:42 PDT on the minors needing his words, relayed through its question tool, and its *"go"* once `manifest-app-5a` closed at
`bf862e8`. One commit per minor on `main`, each test-first: the new test watched red against the committed code, then green,
then a negative control (the fix taken out, its tests red, restored by hash: `*-controls.py` in the session's scratchpad).
`manifest-9d` (the platform's sitting 5b) held the machine once (~15:12–16:33 PDT): no Vitest of ours ran in it; the tests
written then ran red at its FREE before any code.

**Rich's decisions, as relayed** (each recorded by `manifest-94` in manifest's `docs/superpowers/2026-09-30-decisions.md`):
- **14:42 PDT:** m69/m76 *"A different email"*; m104 *"Judge the net change"*; m109's words (*"<App>: an agent is waiting for
  an owner's answer."*, no button); m119's (*"You said no. It'll find out next time it tries."*); m123 *"Re-ask once"*.
- **~14:48:** m104 re-asked after this session checked its premise (no operation reads a change against the last approved
  release before it is staged): **(a) FE-54**, the platform's; m104 open until it lands.
- **~14:51:** m69/m76's words **approved as drafted** (the subject *"<App>: your change stopped"*, three bodies, the closing
  line, the one-minute hold, silence for someone who left by their own word, nothing when our watch's stop cannot be told
  apart). **14:52:** a first build's own words, approved as drafted (*"<App>: building it stopped"*, *"Building <App> stopped
  because…"*).
- **15:09:** FE-53 widened by `tokenMintedBy` (`api-findings.md`). **15:16:** m107, m112, m114, m117 *"Yes, its call"*: ours,
  any new words under his *"approve, change on sight"*; m111 waits for 7100.

**Fixed** (each commit names its minor; *Already fixed*, above, has the rows):
- **Rich's words, built:** **m69/m76** (`2d2f887`, its review's fixes `ad1eb6b`), **m109** (`0c20ae2`, `1e505fd`), **m119**
  (`3c3a48f`), **m123** (`92b3ec1`).
- **Ours at his word:** m107 (`0e42077`), m112 (`0bf6d7c`), m114 (`f3fac3f`, `3066286`), m117 (`02365a8`).
- **Row 3's:** m70 (`7cc841c`, `5b763d8`), m11 (`9b31e00`, `a54e88c`), m12 (`eda591b`).
- **Docs:** FE-54 filed and FE-53 widened (`151b6fd`).

**Decided, routine** (the option chosen; the options rejected; what changing course costs):
- **m69/m76's mechanism**: every *we need you* waits a minute (not only a token's: a session the platform ends at a switch-off
  can reach us as a refused model key, which a budget read then calls a checkpoint), then reads *why* from what we keep: the
  app forgotten is a deletion; its person no longer a kept member, taken off (or silent: our `/leave`, or the platform's
  `member.removed` naming them as its own actor); the kept app's state, switched off (set from the event at once, since a
  switch-off revokes our watch's read; a later read of the app says it afresh); our own watch stopped in that minute with
  nothing else (FE-48), nothing. **A deletion is told at once** (`Keeper.deleting`), while the rows still say whose: by our
  DELETE route before its Stop, and by `forget` on the stream's `project.deleted`; what is held on the app is decided there,
  once. A stop decides what is held, and holds nothing after it. Rejected: a token's refusal alone (misses the model-key path);
  the history's last switch (a restore never heard would stick). **The person who switched the app off or deleted it, when
  the round was their own, is told too**: Rich's *"A different email"* was chosen for exactly m69's case (instructor's own
  round, seen on 7100), so it is not skipped by Decision 13; only leaving, which he approved as silent, is.
- **m123**: the second answer is kept as it wrote it, never a third ask; a second ask the model refuses keeps the first plan.
  Only *Things we assumed* is checked (his words named it). One line to widen to every part.
- **m70**: the keeper starts in Fastify's `onListen` (a refused listen starts none; a failed start is said on the console).
  **Rejected for now: a compare-and-set claim for the boot's resend** (the minor's other option): after `onListen`, only the
  process holding 7105 runs a keeper, and a restart's old process exits within its 1-s ceiling before the new one listens
  (Vite starts first); a claim needs a lease renewed before every try and a column (store version 9). **Its rounds' half is
  m133** (new, above).
- **m12**: `RunDetail.forgotten` (`withoutToken` true; `interruptedOnBoot` false) and `RoundView.forgotten`; the card keeps
  its words and drops the reference. Rejected: inferring it from an empty run (a real interruption at a round's first move
  looks the same).
- **m11**: the read's refusal kept beside `'unread'` and reported once as `getApproval` under the row (`ReferenceLine`, no
  Copy button: the row stays without presses), on *Going live* and the Overview alike.
- **m114**: a role not known says *"We can't tell right now whether you can answer this."* (**new words, ours**), never *"An
  owner answers this."* to one who may be an owner (the Overview's M6 ruling, which the review pointed to: the first cut
  said it).
- **m117**: *"We couldn't copy it. Select it and copy it yourself."* (**new words, ours**) in the button's status, refused or
  with no clipboard.
- **m112**: the year only when the day is not in this year (their zone). **m107**: any press ends the line, as an answer does.

**The review** (a fresh read-only reviewer over `bf862e8..eda591b`, running nothing): **no Critical**; no C3 or accessibility
slip. Fixed after it, test-first, each with a control: **I1** a leave whose platform event arrives before our `/leave` was
told *"taken off"*; **I2** a switch-off could stick for good (the history's last switch over a fresh read); **I3** our DELETE
route stopped rounds before telling anyone, so its path told nobody while the stream's told; **M5** a held run, carried on,
then deleted: two emails; **M6** a held run carried on and built, then switched off: *"stopped"* after *"finished"*; **M7** a
hold after a stop armed a timer nothing cleared; **M8** a failed keeper start was silent; **M9** the Overview's sign-off had
m11's defect too; **M10** check 11 of `check-together.ts` cannot see a held email (its comment says so). **Its I4 is m133**;
its *Rich's calls*: I3's actor (above: decided by his own choice), m114 (above: reworded), our watch's stop silencing a real
*we need you* for that minute (approved by him as drafted, ~14:51).

**Controls.** Every behaviour fix's new test was red against the committed code; m69/m76's seven controls and the review's six
each red where predicted; m109's, m117's, m123's two, m107's, m112's, m114's and m12's each red; all restored by hash.

**The acceptance**, in mock mode, on the dev database as it was (version 8), against our mock as `manifest-app-5a` left it:
`check-seeing.sh` 8/8, `check-going-live.sh` 8/8, `check-slice.sh` 8/8, `check-describing.sh` 18/18, `check-building.sh`
12/12, `check-together.sh` 10 + 13, `check-keeping.sh` 8 + 12, before the review's fixes and again after them.

**The gates** (at `3066286`): `pnpm test` **2878 tests, 109 files, twice** (2831 at `d4cd8b0`: 47 new), `pnpm lint`, `pnpm
typecheck`, `pnpm format:check`, all clean. Our server on 7105 stays in mock mode; no Vitest of ours left running.

**Ours, for Rich** (none takes a decision of his): m114's and m117's new words (above); a first build's subject *"<App>:
building it stopped"* beside his body words.

**Skipped, and why:**
- **m41**: three copies of a timer, and their tests fake only `setInterval` and count its ticks: a wall-clock deadline needs
  those tests' clocks, and skipping an overlapping read changes the reads they count. A small task of its own.
- **m101**: as the round before found (its second half needs the press's landed version out of `LetStudentsIn`).
- **m16, m46, m67, m82**: a ruling each, not reached; **m98**: a walk at 375 on a staged re-escalated Overview.
- **m104** waits for FE-54; **m111** for 7100; **m130, m131** for FE-53; **m133** (new) needs its ruling. **The sitting
  before's other lists stand**: Rich's (m7, m8, m25, m59, m75, m88–m91), the platform's (m64) and the larger (m20–m24,
  m54–m61, m68, m97, m106).

### 2026-10-03 — a sixth round: m133 and Rich's rulings built, m41, m101 and m98 (`manifest-app-c1`, mock mode only)

**Who asked:** `manifest-af` (the platform's coordinator), row 2 of ORIENTATION's next-job table, at ~19:58 PDT; Rich's rulings
through its question tool. A second front-end session, `manifest-app-79`, held 7102/7105 for F5b sitting 1 on 7100 from 20:36:
**every commit of this round was made on branch `minors-6` in a sibling worktree (`../manifest-app-c1`), nothing saved in the
checkout during that window**, and `main` fast-forwarded to it after its *"back"* (`2f867b0`, rebased onto its `5e4a61d`; m98
then on `main`, `8b83978`). The platform's HOLD (19:59–20:35, `manifest-ec`'s gateway Task 0) held every Vitest of ours; the red
runs went at its FREE. Its own minors (m134, m135) were none of this round's. One commit per minor, each test-first:
the new tests watched red against `a01aed3`, then green, then a negative control (the fix taken out or bent, red where
predicted, restored).

**Rich's rulings, as relayed** (each recorded by `manifest-af` in manifest's decisions file):
- **20:07 PDT:** m16 *"Accept it"* (no re-read; the gate decides any press); m46 *"Interrupted card"*; m67 *"Accept it"* (no
  `kept_at`, no store change); m82 *"Re-read on a stranger"*; m133's shape needs no question (within his 17:23 *"Fix it"*, ours).
- **20:21 PDT:** m67's other half, asked on its own, *"A minute after start"*.

**Fixed** (each commit names its minor; *Already fixed*, above, has the rows):
- **m133** (`97d1ce4`, the review's `cadee0f`), **m82** (`170ea27`, `5a6fb10`), **m67**'s first scan (`1965e40`), **m46**
  (`9559b1f`, `2f867b0`), **m41** (`d41b8e6`), **m101** (`0bb0c8b`, `d4a6ef2`), **m98** (`8b83978`, after the walk).
- **Accepted as they are:** m16 and m67's guard for the past (the section above *No longer applies*).

**Decided, routine** (the option chosen; the options rejected; what changing course costs):
- **m133's shape**: both marks in Fastify's `onListen`, before `keeper.start()`, each in its own `try` and said on the console.
  Fastify 5.12.3 calls the first `onListen` hook in the same turn as `listen` resolves (`lib/server.js:116-118`, `hooks.js:218`)
  when the host is an address (`main.ts` says so: with `localhost` it looks the others up first), and the marks are
  synchronous, so no request is read before them. **Rejected: a lock** (a file in `.data` and a stale-lock check by pid, where
  the port already says who is live). A failed mark now serves (said) instead of stopping the start: the store it could not
  read fails every request anyway.
- **m82**: the read is the keeper's (`Keeper.readMembers`), never the route's own `putMembers`: kept by `keepMembers`, so anyone
  no longer listed is taken off (F6b Decision 5), a list of nobody is not believed (m80), m81's order is kept, and an answer is
  dropped when a watch opened or changed while it read (the review). A failed read keeps the members and the 404 until our next
  read. **Rejected:** trusting kept members only while we watch (Rich chose the read).
- **m41**: one helper, `readFor(everyMs, forMs, read)` in `trying-out/parts.tsx`, for all four copies (Going live, trying-out,
  *Start it again*, the dry run): `last` by the wall clock, a tick skipped while a read is out (platform reads time out at 15 s,
  so none blocks it for good). Their tests fake `Date` with the interval.
- **m101**: its first half is m17's rule for the Overview (`quiet`, as `going-live.tsx`'s). **Its second half was smaller than
  the fourth round judged**: `LetStudentsIn`'s M4 effect already gave way to a later candidate after a failed start; after a
  launch, a landed press now does too, ready or not, and never to the version the page's reading named as it landed (the
  review: a reading older than the press). Nothing came out of `LetStudentsIn`. **Its rest is m136** (new): the Overview reads
  nothing when shown again, and the give-way says nothing to a screen reader.
- **m46**: *watched* is per mount of the building screen: a change that waited in line and was refused at its first call mounts
  on `needs: token` and gets the card, a press (benign). A press's hand-over now counts as the renewal (the review).

**The review** (a fresh read-only reviewer over `a01aed3..0bb0c8b`, running nothing): **no Critical, no Important**; no C3 or
accessibility slip in what changed; nothing of Rich's taken. Its Minors: **1** (m82's read kept over a watch opened meanwhile)
`5a6fb10`; **2** (m82's route test could not see the wait) `5a6fb10`; **3** (m101's give-way to an older reading's version)
`d4a6ef2`; **4** filed as **m136**; **5** (one `try` for both marks) `cadee0f`. Its notes: the `localhost` comment (`cadee0f`);
m46's double renewal after a press (`2f867b0`). m133's shape is recorded here, as its ruling asked.

**Controls.** Every new test red against `a01aed3` (m101's three after a fix to the tests themselves: a `findBy…` inside `act`,
ORIENTATION §7, and several `status` regions on the Overview). Controls, each red where predicted and restored: m133 (the keeper
before the marks), m82 (the route not reading; the keeper's bare `putMembers`; the route not waiting), m67 (a stop that leaves
the first scan's timer), m46 (renewing without having watched), m41 (no skip while out; ticks counted again), m101 (the
committed code, each half's test on its own file), the review's (each its own red first).

**The walk at 375** (m98; mock mode, `walk-m98.ts` in the session's scratchpad on `scripts/walk/`, the panel staged by
`page.rewrite`: mock-app launched, production on an older release, the checklist re-escalated, the sign-off undecided,
Instructor One its owner): before the fix, at 1280 and 375, the sign-off row stood straight in the section, outside any list,
its *"you"* alone under the sentence (Going live's rows read *"done for you"*, *"you start it; minutes"*, in their list); **after
`8b83978`**, in Going live's list, no lone *"you"*, everything fits, nothing thrown or logged: 10/11, its eleventh the shell's
watch-token mint, refused by the walk as §7 says it is. **Decided, routine:** the list (as Going live's), and an owner line that
only repeats a row's *"Needs you"* chip left out where a row is drawn alone; an owner of a wait on someone else stays. Rejected:
a new owner word (Rich's to choose).

**The acceptance**, in mock mode, on the dev database as `manifest-app-79` restored it after its window, against our mock as it
ran, at `8b83978`: `check-seeing.sh` 8/8, `check-going-live.sh` 8/8, `check-slice.sh` 8/8, `check-describing.sh` 18/18,
`check-building.sh` 12/12, `check-together.sh` 10 + 13, `check-keeping.sh` 8 + 12.

**The gates:** in the worktree before the merge, `pnpm test` **2900 tests, 109 files, twice**; **on `main` at `8b83978`, 2902
tests, 109 files, three runs** (2878 at `a01aed3`: 24 new), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, all clean; no
Vitest of ours left running. Our server on 7105 stays in mock mode.

**Ours, for Rich:** no new words this round.

**Skipped, and why:**
- **m104** waits for FE-54; **m130, m131** for FE-53; **m111** for 7100. **m136** (new) is a small task of its own (a
  shown-again read for the Overview, and words said when the panel gives way, which may need his).
- **The lists before stand**: Rich's (m7, m8, m25, m59, m75, m88–m91), the platform's (m64) and the larger (m20–m24, m54–m61,
  m68, m97, m106).

### 2026-10-03 — a seventh round: m134, m136 and m135; m99 at Rich's ruling; m73, m106, m103, m105 (`manifest-app-cf`, mock mode only)

**Who asked:** `manifest-af` (the platform's coordinator), row 1 of ORIENTATION's next-job table, at ~22:20 PDT: m134 first,
then m136 and m135, then any open minor needing no ruling and no 7100; Rich's rulings through its question tool. **The
platform's HOLD** (the UBC AI Gateway's sitting 2, its Docker tier) **held every Vitest of ours from the start to 23:05 PDT**:
the tests and the fixes were written meanwhile, and at its FREE the new tests ran red against the committed code (the sources
set aside by pathspec, `red.sh` in the session's scratchpad), then green. One commit per minor on `main`, each test-first;
negative controls each red where predicted, restored by hash (`controls*.py`, the same scratchpad).

**Rich's rulings, as relayed** (each recorded by `manifest-af` in manifest's decisions file):
- **22:55 PDT:** m99 *"Drop the press's line after launch"*; m45 *"Accept it"*. m135's words noted under his *"approve, change
  on sight"*.
- **23:31 PDT:** m99 **re-asked**, its 22:55 premise wrong (*"the facts stay whole"*: they are held while a press holds the
  panel; found by this round's review, M2): *"Line only while the press works"*: the *"goes to"* line kept only while the press
  works or is unsure, dropped from the offer and from a version changed under the button. **It supersedes `94350b3`'s shape**
  (`bd696e3`).

**Fixed** (each commit names its minor; *Already fixed*, above, has the rows):
- **m134** (`f191d2b`), **m136** (`25f045e`, the review's `c1a0705`), **m135** (`91793a6`, the review's `155696d`), **m99**
  (`94350b3`, then `bd696e3` at the 23:31 ruling), **m73** (`f66eb11`, the review's `25bef8d`), **m106** (`6803954`), **m103**
  (`72bcd99`), **m105** (`d096a5d`, tests only).
- **Accepted as it is:** m45 (the section above *No longer applies*).

**Decided, routine** (the option chosen; the options rejected; what changing course costs):
- **m134's key**: no production registration **in force** (none; or neither `active` nor ever registered, `registeredAt`
  null) beside the item met, and the step's own record none or a draft (sitting 2's rule kept). Read from the platform's
  `readiness.ts`: `iamItem` meets a CWL app's item only once production's is `active`, and `liveRegistrationItem` only while
  `registeredAt` is set (`expired` clears it), so a real registration reads as signing nobody in neither before a launch nor
  after one. **Rejected:** the minor's literal *"not `active`"* (a launched app's change with UBC keeps the item met, and the
  Preview's trying-out line reads `stepOf('staging')` after a launch).
- **m136**: the panel's own shown-again read, quiet (a reading lost keeps the panel); the facts' live region always on the
  page, **filled only when a press's ending gives way to a later version** (`LetStudentsIn`'s `onHold(hold, gaveWay)`), the
  facts drawn beside it otherwise. No new words: the facts say what changed. **Rejected:** the Overview's other reads on shown
  again (a whole re-read could unmount a press under way, *Start it for your students*'s; `/api/since` counts a visit, F6
  Decision 7): the students' side is **m137**. **Rejected:** the facts always in the region (the review's M1: stale facts said
  beside the press's own *changed*).
- **m135**: say what we cannot see (the minor's first option). With no `docs/plan.md`, the planner writes only what the change
  makes true, and every other part, who gets in included unless the change is about who can sign in, as **"We don't know this
  part yet: it was never written down."** (ours), held exactly (spacing, apostrophe) and never marked; a plan holding those
  words keeps them on the next change, told they are parts we cannot see. **Rejected:** starting the plan from the tree (the
  app's code read into the planner: tokens and a reader of its own, for a path only an app made elsewhere reaches). Changing
  course costs a prompt; parts committed in our words read so until a change makes them true.
- **m73**: the design's own sentence with times (*"between 29 September, 9:00am and 11:30am"*), a moment inside one minute
  (*"We weren't watching for a moment, around 9:00am on 29 September."*, ours), and a day's lines that a gap parts under its
  one heading. **m106**: the sign-off's pattern (a `DetailCard` moving the focus; `NeedsCard` takes its actions row's ref).
  **m103**: ours, *"A different version…"*, *"…a different one."*, and, neither dated, *"Your trying-out address has a different
  version from the one your students have."* **m105**: the two gaps it names, each red with its guard taken out.

**The review** (a fresh read-only reviewer over `6bbbede..d096a5d`, running nothing): **no Critical**; no C3 slip; nothing of
Rich's taken. Fixed after it, test-first, each with a control: **I1** (m135: on an app with no plan the planner still wrote *Who
gets in*, marked it, and the lead was told a sign-in it would ask the sign-in specialist to build: `155696d`); **M1** (the
facts' region spoke at every letting go: `c1a0705`); **M3** (the empty region a second gap under the title while held, 40 px,
28 before m136: `c1a0705`, also found by the walk); **M7** (m135's protections only for the first change: `155696d`); **M8** (a
gap inside one minute: `25bef8d`). **M2** went to Rich (m99's premise: his 23:31 ruling). **M4, M5, M6 filed as m137, m138,
m139.** Its declined list held nothing of ours to act on (each existed before, or is Rich's).

**Controls.** Every new test red against `6bbbede`, but m105's two and three guards (m134's registration in force, m73's days
across midnight, m136's panel no longer drawn), green there by design and each red under its own control. Two tests fixed before
their red counted: a `findBy…` inside `act` (ORIENTATION §7). Controls, each red where predicted and restored by hash: eleven
for the round's commits, six for the review's fixes, two for the 23:31 ruling.

**The walk** (mock mode, `walk-seventh.ts` in the session's scratchpad on `scripts/walk/`; the panel staged by `page.rewrite`:
mock-app launched, production on an older release, self-serve, Instructor One its owner): at 1280 and 375 the facts name the
version once, no *"goes to"* line offered, the region empty before a press, the page fits, one gap under the title; after a
press lands, the region still there and empty, **one gap under the title (28 px, as before m136; 40 px before `c1a0705`)**; the
history's same-day gap in times under one heading. 20/21, its twenty-first the shell's watch-token mint, refused by the walk
(as the sixth round's).

**The acceptance**, in mock mode, on the dev database as it was, against our mock as it ran: at `d096a5d`, `check-seeing.sh`
8/8, `check-going-live.sh` 8/8, `check-slice.sh` 8/8, `check-describing.sh` 18/18, `check-building.sh` 12/12,
`check-together.sh` 10 + 13, `check-keeping.sh` 8 + 12; **after the review's fixes** (from `25bef8d`; `bd696e3` touches only
the page's press line), the same seven, the same counts.

**The gates:** at `d096a5d`, `pnpm test` **2922 tests, 109 files, twice**; **at `bd696e3`, 2928, twice** (2902 at `6bbbede`: 26
new), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, all clean; no Vitest of ours left running. Our server on 7105 stays
in mock mode.

**Ours, for Rich:** m135's sentence, m103's undated words, m73's moment (above).

**Skipped, and why:**
- **m104** waits for FE-54; **m130, m131** for FE-53; **m111** and **m92** for 7100.
- **m97**: our server must keep former members' names (the platform's `member.added` carries only `memberId`): a store change,
  larger. **m36**: ruled (*"m36's lag stays"*). **m128**: at Rich's review of `close-out.sh`.
- **m137–m139** (new, S, no ruling): the next round's.
- **The lists before stand**: Rich's (m7, m8, m25, m59, m75, m88–m91), the platform's (m64) and the larger (m20–m24, m54–m61,
  m68, m97).

## Accepted as they are, by Rich

- **m16** (F5 sitting 4, review, ledger 181): *two millisecond races in the sign-off row*, a decision landing between the
  checklist's read and the approval's (`going-live.tsx:68-81`): *"Signed off by a Manifest administrator."* beside a
  rejection, or *"It has changed since it was signed off…"* beside a fresh approval, until the next read. **Rich, 2026-10-03,
  20:07 PDT: "Accept it"** (through `manifest-af`; manifest's decisions file): no re-read; the gate decides any press.
- **m67**, its other half (F6's whole-branch review, M4): *the first hand-over of an older app makes each long-stale waiting
  conversation on it one email*. **Rich, 20:07 PDT: "Accept it"**: no `kept_at` column, no store change. Its first half (the
  scan at start) he chose at 20:21 (*Already fixed*).

- **m45** (F5 sitting 4, review, ledger 188): *the Overview reads the checklist only while the draft serves something*
  (`overview/overview.tsx:90`, `your-apps/model.ts`'s `beforeLaunch`), so a stale lookup (`launchedAt` null; the App reads the
  project once per slug) of an app launched elsewhere while its draft serves nothing never hears the launch until a reload.
  **Rich, 2026-10-03, 22:55 PDT: "Accept it"** (through `manifest-af`; manifest's decisions file): F5 Decision 3's rule
  stands; any reload hears it.

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
