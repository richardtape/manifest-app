# F5 — Going Live: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development,
> as Rich chooses at approval) to implement this plan task-by-task, one sitting per session. Steps use checkbox (`- [ ]`)
> syntax for tracking. **Read [`../ORIENTATION.md`](../ORIENTATION.md) first. F4 is executed; this plan starts from it.**

**Status: APPROVED BY RICH AS WRITTEN, 2026-09-29** (*"Approved as written"*, session `manifest-app-a0`), **executed
natively** (superpowers:executing-plans, as F3 and F4 ran), **Decision 7 accepted**. Written by `manifest-app-ce` with
Rich; the design was approved by Rich in conversation, in six sections, and is recorded below in *Decided by Rich* and
*Decisions this plan makes*. **Sittings 0 and 1 are done** (2026-09-29/30, `manifest-app-a0`): Task 3 (the banner) ran
first, as sitting 0, while the platform's launch-path sitting 3 held 7100 (Rich: *"Banner first, then wait"*); sitting 1
measured on 7100 and corrected Decisions 6, 7, 8, 10 and 14 and Tasks 2, 7 and 11, each correction marked **(S1)**, and
Task 7 is now the administrator's row (FE-42, Rich). **Sitting 2 is done** (2026-09-30, `manifest-app-e2`): every model
call streams (Task 2, with M10), and the final review's one Important (a model reasoning before its first word) is fixed,
marked **(S2)** in Decision 14. **The next is the sittings table's `← next`.**

**Goal:** A faculty member sees what stands between their app and their students from the day the draft is built, runs
the dry run, sees the sign-off when it is given, lets their students in with one press (and a second sign-in), and is
handed the address to give them. Walk-through moments 10–15, **as far as the platform's contract 1.4.0 serves them**:
the clocks' own actions, *waiting since*, and asking an administrator are **F5b's**, written when the platform's
launch-path sittings 6–10 land (*What waits on the platform*, below). Around that, three things Rich brought into F5:
**every model call streams**, **mock mode says so on every page**, and four of F4's deferred minors (M1, M2, M4, M10).

**Architecture:**
- **The app's own pages** (`screens/overview/`, `screens/going-live/`): the Overview becomes the app's landing page, and
  *Going live* joins the rail. Both read in the browser, on the person's session, through `src/platform` alone, as the
  Preview does.
- **Every launch action is the person's, in the browser**: the dry run (`runRehearsal`), the production `deploy` and its
  step-up, a production secret. **Our server never deploys anywhere but the sandbox, and never runs a dry run or
  approves anything** (a test and `check-going-live.sh` hold it).
- **Our server's part** is what it already does: a fix conversation (now also for a production start and a failed dry
  run), a change (now also seeded by an administrator's reason), and one read of the agreed plan's two rows for the
  hand-over.
- **The model client streams** (`model/client.ts`, `model/stream.ts`): three deadlines (first word, between words, a
  ceiling) replace the five-minute total, and a stall is its own needs kind.

**Tech Stack:**
- F4's: TypeScript 5, Node 24, Fastify 5, React 19, Vite 8, Vitest 2.1.9, `zod` 3.25.76 through `zod/v4`, `node:sqlite`.
- **No new dependency.** The server-sent events are read by hand (`model/stream.ts`), as the rest of the client is.

**Spec:**
- [`../walkthrough.md`](../walkthrough.md): moments 10–15, **as changed 2026-09-29 with this plan** (Rich's *"may take
  several days"*; two clocks on *Going live*; no stopgap; [Open it] hidden on *Trying out*); moments 7–9 as F4 built them;
- [`../api-findings.md`](../api-findings.md): FE-6, FE-9, FE-13, FE-17, FE-20, FE-24, FE-25, FE-32, FE-38, **FE-40**;
- manifest's `openapi.json` 1.4.0 (66 operations, 128 codes), `docs/api/launching.md` and `frontend.md`: read-only;
- **the platform's launch-path plan** (manifest `docs/superpowers/plans/2026-09-29-launch-path.md`, read-only): what it
  will build for F5b, and when;
- the design system's `ClockItem`, `ProgressBar`, `Timeline` and `TwoFacts` (manifest `design/system/components/`), and
  `20-states.md`;
- **the design Rich approved in conversation on 2026-09-29, in six sections** (the app's pages; *Going live* and the
  clocks; the dry run and the sign-off; putting it live and the hand-over; streaming; the sittings).

---

## How this plan is executed: sittings, one per session

| Sitting | Tasks | Delivers | Status |
|---|---|---|---|
| 0 | 3 | **The mock-mode banner**, moved ahead of the measurements at Rich's word (2026-09-29, *"Banner first, then wait"*): it needs no measurement and no 7100, which the platform's launch-path sitting 3 holds | **done 2026-09-29** (`manifest-app-a0`): the banner on every page in mock mode, none in edge; **and Step 0 for contract 1.5.0** (FE-38 adopted). 1248 tests (the dated entry below) |
| 1 | 1 | **The measurements**, on 7100 at Rich's word (after telling the platform session): streaming on the gateway; every checklist `id` × `state` the laptop produces, with its `why`; a dry run; a production deploy's step-up and gate; `getApproval`; a production secret; the mock's answers. **One project, a real private repository on GitHub**, remade by a script at the acceptance (every platform sitting's first test run truncates). Rich types, as the administrator. **Alone** | **done 2026-09-30** (`manifest-app-a0`, 04:19–04:40Z on 7100): M1–M7 measured; Tasks 2, 6, 7, 10 and 11 corrected (S1); **FE-41 and FE-42 written, carried at Rich's word**; FE-33's `4401` adopted (Step 0). 1249 tests (the dated entry below) |
| 2 | 2 | Every model call streams, and a stall has its own card (M10 with it) | **done 2026-09-30** (`manifest-app-e2`, no platform): `2009fba` (the stream, three deadlines, `stalled`, M10), `f6b09af` (the final review's I1: reasoning is working, not a stall). 1284 tests; the four acceptance scripts pass in mock mode (the dated entry below) |
| 3 | 4, 5, 6 | `ClockItem` and `ProgressBar`'s clock, ported with parity; the app's pages (the Overview, the rail, the Preview's new address, *Your apps*' line, [Open it] hidden); *Going live*: the page, the two clocks, the short jobs | ← **next** (no platform needed) |
| 4 | 7, 8, 9 | The dry run (moment 12); the sign-off (moment 13) with *[Talk it through]*; the hand-over (moment 15) | |
| 5 | 10 | Putting it live (moment 14): the step-up, the deploy, the stations, every failure; M1, M2 and M4, on *Trying out* too | |
| 6 | 11 | **The acceptance:** `scripts/check-going-live.sh` against the mock; the whole-branch review; a first launch walked end to end on 7100 at Rich's word; **Rich's click**. **Alone, and last** | |

**Every sitting starts** with `pgrep -fl vitest` (a stray worker loads the machine the platform times its tiers
against) and **Step 0: the platform's landings** (*Adopting what lands*, below). **Every sitting ends as F4's did:**
1. the four gates, `pnpm test` twice; and, when it touched our server, `check-slice.sh`, `check-describing.sh`,
   `check-building.sh` and `check-seeing.sh` in mock mode (`check-seeing.sh` first; from sitting 6, `check-going-live.sh`
   too);
2. a dated entry in *What executing this plan found*;
3. this table;
4. ORIENTATION's *Where things stand*, replaced, and the roadmap;
5. `pgrep -fl vitest` again.

## Decided by Rich: build them, do not re-open them

- **F5 is written now, and says what waits** (2026-09-29, the sitting's first message: *"F5 should say which of its
  moments can be built now and which wait on which platform task"*).
- **Build now, no stopgap** (2026-09-29). What the platform cannot do yet is shown as it is, with no email to anyone:
  the clocks are still cards with the honest admission and no action; the sign-off row shows a decision once one is
  made, and says nobody is told. *Rejected by Rich:* the walk-through's *[Ask them]* emails to the Manifest team; waiting
  for the whole launch path.
- **Two plans: F5 now, F5b later** (2026-09-29, *"A: F5 now, F5b later"*). F5 has its own acceptance, so F6 is not held
  by the platform. **F5b is written when the platform's launch-path sittings 6–10 land**, as F4a was, against the
  interfaces as built.
- **The clocks may take several days each, not weeks** (2026-09-29: *"'each taking weeks' needs to be 'each may take
  several days'"*). Everywhere the product states their duration: the band, *Your apps*' line, *Going live*'s lead, and
  `ClockItem`'s bar (*"May take several days"*). The walk-through is changed with this plan.
- **[Open it in a new tab] on *Trying out* is hidden until the staging registration is active** (2026-09-29, *"Hide until
  registered"*). F5 removes it (nothing records a staging registration yet); F5b shows it when
  `LaunchRecords.stagingRegistration.state` is `active`.
- **Every model call streams** (2026-09-29). Rich asked: *"When the timeout happens have we still captured what the LLM
  has sent up to that point? It feels like we need to do a better job of looking at what the model is sending to us
  rather than arbitrarily waiting 5 minutes and then bailing. Perhaps this means we need to think about streaming?"* The
  answer was no: we asked for the whole answer in one piece, so nothing arrived before the model finished, and the
  gateway billed a call we had abandoned. He chose *"Stream every call"* over the round's calls alone, and over showing
  the stream on screen.
- **F4's minors M1, M2, M4 and M10 are fixed in F5** (2026-09-29); F4's other seven, and F3's and F2's, stay in the
  ledger.
- **Mock mode says so** (2026-09-29, after `manifest-13` reported his demo's `0565-503F`: our server was still in mock
  mode behind `app.manifest.internal`): *"I think we should just make it more obvious when we are in mock mode. A banner
  or something would allow me to see that."* *Rejected by Rich:* logging each refused request.
- **FE-40, filed and carried** (2026-09-29, *"File it, and carry it now"*): the mock cannot play a launch. Carried to
  `manifest-13` the same day, which recorded it in its launch-path plan at Task 13, **PROPOSED until Rich confirms it to a
  platform session** (its house rule for a relayed decision). F5 never waits on it. **Confirmed by Rich to the
  platform session `manifest-c3`** (its launch-path sitting 3, 2026-09-29), and to us in his own words (*"I approve the
  FE-40 were my words"*); Task 13 (the platform's sitting 10) carries it.
- **Sitting 1 starts when the platform session messages us at its sitting 3's close** (2026-09-29, *"when it messages
  you, please feel free to begin sitting 1"*): his word for 7100 for this sitting.
- **The administrator's part is scripted, as `operator`** (2026-09-29, *"Script does it"*), and **the platform session
  runs the admin grant** (*"Platform session"*). *Rejected by Rich:* clicking the reference console himself.
- **FE-42, the dry run: "Both: row now, ask platform"** (2026-09-30). The owner is refused `runRehearsal` (an
  administrator's alone, by the platform's design), so **F5 shows the row as an administrator's, with no button**, and
  **FE-42 (a), the owner's own press, is carried** to the platform; when it lands, *[Run the dry run]* returns as the
  design had it. *Rejected by Rich:* holding Task 7 for the platform; accepting the administrator's row for good.
- **FE-41, a starter's app cannot be made on real GitHub: "Carry it now"** (2026-09-30), to the platform session, the
  same evening.
- **The plan approved as written, executed natively, Decision 7 accepted** (2026-09-29, `manifest-app-a0`'s first
  question: *"Approved as written"*, *"Native"*, *"Accept Decision 7"*).
- **Task 3 first, then wait** (2026-09-29, *"Banner first, then wait"*): the platform's launch-path sitting 3 holds 7100
  for several hours and truncates it on its first test run, so the banner, which needs neither, is built as sitting 0,
  and the measurements wait for that sitting's close. *Rejected by Rich:* measuring now in a window the platform's
  sitting would have to hold open.
- **The design, approved in six sections** (2026-09-29): the app's pages and the banner (*"yep"*, with the duration
  change); *Going live* and two clocks (*"yep"*); the dry run and the sign-off (*"yes"*); putting it live and the hand-over
  (*"yes"*); streaming (*"yes"*); the sittings, F5b and what F5 does not build (*"yes"*).
- **Carried from earlier plans, still binding:** laptop staging only, with UBC's words on *Trying out* everywhere (F4);
  a version is only ever *"the version from <when>"*; *we*, everywhere; the five states; a step-up is the platform's
  page, and we remember what they were doing.

### Words proposed for Rich

*The walk-through's words are the design. These are the sentences it does not settle, or that Rich's decisions today
changed. Those marked ✓ Rich approved in the design; the rest are ours, for his review with the plan. They stay his to
change at his click.*

| Where | Words |
|---|---|
| The mock-mode banner ✓ | *"Mock mode: this server answers from manifest-mock on 7102, not the platform."* |
| *Your apps*, a built app not yet live ✓ | *"Before your students can use it: three things other people answer, and each may take several days."* · **[Going live]** |
| The Overview's band | *"Before your students can use it."* · *"Three things other people answer, and each may take several days. Going live shows where each one is."* · **[Going live]** (F5b: *[Start them]*, once they can be started) |
| The Overview's addresses | the Preview's tab names and F4's *serving* facts, each row a link: *"Your draft"* · *"Trying out"* · *"For your students"* |
| *Going live*'s lead ✓ | heading *"Letting your students in"*; *"Going live isn't a button. Most of it takes minutes, but three things are answered by other people, and each may take several days. That's why this page exists from day one."* |
| The version that would go live ✓ | *"What goes live is the version on your trying-out address: the one from 18 September, 3:12pm."* · none: *"Nothing is on your trying-out address yet. What goes live is what's there."* **[Trying out]** |
| The clock cards' titles and bodies | the prototype's titles, *"Registering with UBC's identity team"* and *"A privacy assessment"*; bodies *"Your app needs its own entry in UBC's identity register before real students can sign in. UBC's identity team makes it."* and the prototype's *"Your app keeps what students write, so the Privacy Office has to look at it. The most common reason a launch slips."* (the prototype's *"You ask"* is untrue with no stopgap) |
| A clock not started ✓ | chip *"Not started"*; bar *"Nothing counting yet"* · *"May take several days"*; admission *"Manifest can't start this one for you yet."* · *"For now the Manifest team does it by hand, and this card shows where it has got to."* |
| A clock waiting ✓ | *"With UBC's identity team"* / *"With UBC's Privacy Office"*; *"recorded 18 September · waiting 12 days"* |
| A clock with a change asked, or run out ✓ | *"UBC asked for a change. The Manifest team has it."* · *"Its registration has run out. The Manifest team renews it."* |
| A clock done ✓ | *"Registered 3 October"* · *"Approved 3 October"* |
| The staging clock's line on *Going live* | *"The trying-out address has a registration of its own, with UBC's identity team."* **[See Trying out]** |
| Short jobs ✓ | *"Short jobs, for the end"* · *"minutes each, and not worth doing early"* |
| The rows ✓ | the walk-through's table, for `scans` met, `rehearsal`, `load-rehearsal`, `admin-approval`, `domain` met and `code-review`; an unknown id, *"Something new on the list: <title>"* |
| The rows, ours | **`scans` unmet** (Decision 7): *"Something it's built on has a known security problem. Keeping what apps are built on up to date is the Manifest team's job."*, owner *"the Manifest team"*; **(S1)** a stale security list, if M3 sees one: *"We couldn't check it against the newest list of security problems. The Manifest team refreshes that list."* · **`rehearsal` with nothing on trying-out**: *"Once a version is on your trying-out address."* · owners in words: *done for you* · *you start it; minutes* · *us, in minutes* · *a Manifest administrator* · *nobody yet* |
| The dry run ✓ | **(S1, FE-42: until the owner may run it, the row is an administrator's: *"A Manifest administrator runs it."* · *"Manifest doesn't tell them yet that it's waiting."*; no button; the rest of this row returns with FE-42 (a). *"You can leave: it carries on."* is measured true; it takes seconds, not a minute and a half)** **[Run the dry run]**; while it runs *"Putting it up with nobody watching, signing someone in, taking it down. About a minute and a half."*, and *"You can leave: it carries on."* **(S1: M4, only if true)**; passed *"Done. It answered and signed someone in on the live setup."*; failed, one sentence per failure M4 reads, else *"It didn't sign anyone in on the live setup."*, **[Fix it]**; *"It didn't start on the live setup"*; our deadline *"We stopped waiting, but it may still finish. This row updates when it does."* |
| The sign-off ✓ | the table of Section 3: *"A Manifest administrator looks at what it keeps, who it lets in and what it can reach, then signs it off, so nobody's app reaches students with something it shouldn't have."* · *"Manifest doesn't tell them yet that it's waiting."* · *"Signed off by <name>, 23 September."* · *"Nothing in this version needs a sign-off."* · *"Not signed off: '<their reason>'"* · *"A new version is needed, and it's looked at afresh."* · **[Talk it through]** |
| *[Talk it through]*'s change | *"A Manifest administrator didn't sign it off, and said: '<their reason>'"* (their reason cut at a word to the change's limit) |
| Putting it live ✓ | the walk-through's **[Let your students in]**, its sentence, the step-up card, *"You're signed in again."*, F4's stations, *"Reading responses is live."*, and ours: **[See what to tell your students]** |
| Putting it live, when it goes wrong ✓ | *"The version on your trying-out address changed a moment ago. Go live with the new one?"* · *"Nothing reached your students. The address shows nothing yet, not a broken app."* · **[What went wrong]** · our deadline: *"We stopped waiting, but it may still be going. This shows it when it answers."* |
| A fix conversation's title, for production | *"It didn't start on the live address"*; for a dry run, *"The dry run didn't sign anyone in"* **(S1: M4)** (not built until FE-42 (a): nothing gives the page a failed run's evidence) |
| The hand-over ✓ | *"For your students"*; the address, **[Copy]**; *"Students sign in with their CWL."*; the message *"<Name> is here: <address>. Sign in with your CWL."* followed by the plan's *What students see*; the honest line *"Anyone with a CWL can sign in, not only your class."* followed by the plan's *Who gets in*; the two facts |
| A stall, in a round ✓ | *"Our model stopped answering before it finished. Nothing is lost."* · *"Our model's answer went on far longer than any should, so we stopped it. Nothing is lost."* · **[Carry on]** · **[Stop here]** |
| A stall, on the intake or the plan | the same first sentence, with their **[Try again]** |

## Decisions this plan makes, and why

1. **The Overview is the app's landing page** (moments 10 and 15 are on it; so are 19 and 20, F6's).
   - `/apps/:slug` is the **Overview**; `/apps/:slug/preview?tab=…` the Preview; `/apps/:slug/going-live` *Going live*.
     F4's addresses still work: **a `tab` query on the bare path opens the Preview**, and `router.remember` rewrites the
     address to the new one, so no link or bookmark breaks. The building screen's *[Try it]* and F4's links move to the
     new address.
   - **Before launch** it holds the name and who it is for (`audienceWords`), one row per address (the Preview's tab
     name, F4's *serving* fact, a link to that tab), **[Ask for a change]**, and **the band** (Decision 3). **After
     launch** (`launchedAt` set) it leads with **For your students** (Decision 12).
   - **Nothing of moment 16's** (*since you were last here*, the needs-you band): F6.
   - *This reverses F4's Decision 1* (*"an Overview now, which is moment 16's"*): moments 10 and 15 need a page, and
     putting them on the Preview's *For your students* tab would move them again in F6. *Rejected:* keeping the Preview as
     the landing. *Changing course:* one route.
2. **The rail**: *Overview · Preview · Conversations · Going live* (icons `overview`, `preview`, `talk`, `live`, all in
   `icons.tsx`). *People* and *Agents* come with their plans. After launch, *Going live* stays; its page says the app is
   live and links to the Overview.
3. **The band (moment 10)** shows on the Overview once a draft has been built (the sandbox has served an instance) and
   until both production clocks are met (`iam-registration` and `privacy-assessment`) or the app has launched. On *Your
   apps*, each such app's card gains one line (Rich's words) with **[Going live]**, from one `getLaunchReadiness` per
   built, unlaunched app (FE-10's cost; moment 16 pays it anyway). *Rejected:* a page-level band naming apps, which is
   moment 16's needs-you band.
4. **Two clocks on *Going live*, the staging registration's on *Trying out*.** `ClockItem`'s rule is *"Two at most on a
   screen. A page of clocks is a page of dread."*, and the design system binds where the walk-through's three cards
   would break it. The staging registration gates the trying-out address, which already says so in Rich's words; *Going
   live* names it in one line with a link. F5b revisits it when a staging record exists. *Changing course:* one card.
5. **A clock card shows only what the record says** (`getLaunchRecords`, the production registration and the privacy
   assessment an administrator keeps). No record or `draft` → **not yet**; `submitted`, `change_requested`, `expired` →
   **waiting on someone**, still, with *"recorded <day> · waiting <n> days"* from `updatedAt` for `submitted` (*recorded*,
   not *asked*: it is when an administrator wrote it; F5b's `submittedAt` replaces it); `active` / `approved` → **steady**,
   dated by `registeredAt` / `approvedAt`. Never animated (`20-states.md`).
6. **The short jobs are the checklist's other items, each in our words** (FE-9), keyed on `id` × `state`: `met` → steady;
   `not_built` → not yet; `unmet` → *needs you* when the person can act now (the dry run, once there is a candidate),
   *waiting on someone* when someone else owns it (the sign-off; `scans`, Decision 7), *not yet* when it cannot be acted
   on yet. An unknown `id` is shown, never hidden (spec D23.8: the enum grows). `code-review` last, set apart. **(S1:
   M3)** every `why` the laptop produces is read, and every combination it can produce has words.
   - **(S1: M3) `rehearsal`, `scans` and `admin-approval` are `unmet` with NO candidate** (*"Nothing is serving in staging
     yet, so there is no release to …"*): each is then **not yet**, *"Once a version is on your trying-out address."*,
     keyed on `candidateReleaseId === null`, never on the `why`. `scans` unmet **with** a candidate is Decision 7's.
   - **(S1: M3) an unfixable finding does not block**: the blueprint's own `passport-saml` critical (GHSA-4mxg-3p6v-xgq3,
     *"no published fix"*) leaves `scans` **met**, its `why` saying *"1 finding(s) with no published fix are recorded"*.
     `scans` unmet with a candidate means a finding **with** a published fix, or a failed secret or lockfile gate.
   - **(S1: M3) `load-rehearsal` is absent** for a class-sized audience (the platform adds it for large courses only):
     its row is drawn only when the item is listed.
   - **(S1: M3) a registration or assessment that is `submitted`** is `unmet` (*"must be 'active'"*, *"must be
     'approved'"*); `active` / `approved` is `met`. The clocks read the records (Decision 5), not these `why`s.
7. **`scans` unmet is waiting on the Manifest team, with no *[Fix it]*** (**a correction to Section 2, accepted by Rich
   at review**, 2026-09-29). Section 2 said *[Fix it]* would start a fix conversation fed by the build's scan. Writing the task found it
   cannot be true: **an agent cannot change an app's dependencies** (FE-32: nothing regenerates `package-lock.json`, and
   F3's dependency guard refuses it), and a blueprint's dependencies and base image are the platform's. A *[Fix it]* that
   can only fail is the bureaucracy `ClockItem` warns of. *Changing course:* when FE-32 lands, one row gains its button.
   **(S1: M3)** it applies only with a candidate (Decision 6's first S1 note); without one the row is *not yet*.
8. **The dry run is the person's, in the browser** (`runRehearsal` is session-only): one `Idempotency-Key` per press, a
   150-s deadline (the platform says *up to ~90 s*). **(S1: M4)** whether it finishes when its caller goes decides *"You can
   leave"*; what a failure's `evidence` holds decides its sentences and its fix's shape.
   - **(S1: M4) THE OWNER CANNOT RUN IT: `403 FORBIDDEN`, *"role 'owner' may not 'launch:record'"*.** The platform's
     authorization table says so by design (P6a Task 14: *"an administrator alone, in an interactive session"*;
     `authz-contract.ts`), and the checklist names its owner *"Manifest"*. **Rich decided (FE-42, *"Both: row now, ask
     platform"*): the row is an administrator's, with no button**, until the platform lets the owner run it (FE-42 (a),
     carried). Task 7 is rewritten to that (S1); this decision's press, deadline and *"You can leave"* return with (a).
   - **(S1: M4) measured as the administrator:** it passed in **7 s** (and in under 13 s when its caller left at 3 s),
     never near 90 s; **it carries on when its caller goes** (the item turned `met` with nobody waiting), so *"You can
     leave: it carries on."* is true; its answer is `{ id, releaseId, passed, entityId, acsUrl, attributes, evidence:
     { instanceId, hostname, listener, signInStatus, attributesReleased, reason }, ranAt }`. A failure's shape was not made
     (the laptop's IdP releases every attribute asked for).
   - **Its fix (S1: M4 chooses one):** a failure that left an **incident** on production is the existing fix path,
     generalised to production (Decision 13); a failure with **only evidence** (the sign-in's status, the attributes
     released) is a fix whose asked message carries those fields, handed from the page, which the lead's view carries as
     it carries an incident. The page's evidence is context for the lead, never trusted for anything else.
9. **The sign-off reads `getApproval` for the candidate** (`404` until someone decides, which our platform layer answers as
   `null`). A rejection's **[Talk it through]** mints a token and starts **a change** (F4's, agreed first) whose words are
   ours plus their reason: a rejection is final for its version, so what follows is a change, a new version, trying-out,
   and a new sign-off. No server change.
10. **Putting it live is F4's trying-out, on production, with the step-up.**
    - The button only when `ready`; the press re-reads `candidateReleaseId` and deploys **exactly that release**, with an
      `Idempotency-Key` and F4's 120-s deadline; the stations poll production's `listInstances` every second (F4 M3's
      rule: the new instance is the one not listed at the press); **the end is `deploy`'s own answer**.
    - **The step-up** (`403 STEP_UP_REQUIRED`): a card in place, **[Sign in again]** to
      `stepUpHref('/apps/<slug>/going-live?then=live')`. Back, the page reads `then=live`, clears it with
      `router.remember`, and shows *"You're signed in again."* with the same button. **Nothing is kept in storage**: the
      button names the candidate it will send, read at that moment, so a candidate that changed while they were away is
      the one they see. *(F4's trying-out keeps its `sessionStorage`: its question is a version they chose; this one is
      what the checklist says.)* **(S1: M5)** measures that `returnTo` keeps its query.
    - **(S1: M5) measured:** `returnTo` **keeps its query** (`/auth/step-up?returnTo=/apps/f5-reading/going-live?then=live`
      came back to exactly that); a step-up lasts **10 minutes** (`STEP_UP_TTL_MS`, read in the control plane's
      `identity/step-up.ts`); **the step-up is asked BEFORE the gate**, so a press before `ready` answers `403
      STEP_UP_REQUIRED` first, and only a stepped-up press sees `409 RELEASE_PRODUCTION_GATE_UNAVAILABLE`, whose envelope
      carries the whole checklist as `error.launchReadiness`; the press after the step-up answered **`200 healthy` in 5.3 s**,
      the new instance listed **last** (3 of 3) while `starting` at 1 s, `launchedAt` set at the healthy moment, and
      production's `getEnvironment` answers its `url` (`https://f5-reading.manifest.internal`). The skeleton declares no
      production secret (`listAppSecrets` answered none), so *setting one* was not measured.
    - The shared pieces (`Stations`, `Secrets`, the step-up card, `WhatWentWrong`) move from `put.tsx` into
      `screens/trying-out/parts.tsx`, exported, so *Going live* and *Trying out* draw the same things.
11. **M1, M2, M4** are fixed where F5 meets them, and on *Trying out* too:
    - **M1:** a deploy (or a dry run) our deadline cut is *unsure*, never *not done*: said as such, and the page keeps
      reading the new instance (every second, up to five minutes more) until it answers `healthy` or `failed`.
    - **M2:** *[What went wrong]* is fed by the incident whose `instanceId` is the failed attempt's, **never
      `incidents[0]`**. None yet: one re-read after 2 s; still none, the facts without the button.
    - **M4:** after any ending (arrived, never answered), the card returns to its offer when there is something new to
      offer (the draft serving another version; for *Going live*, `ready` with another candidate), re-read when the page
      is shown again (`visibilitychange`), without leaving the page.
12. **The hand-over (moment 15)** is the Overview's lead once `launchedAt` is set: production's address (`getEnvironment`,
    `url`) large in mono with **[Copy]**; the message and the honest line (Rich's words above), whose second parts are the
    **agreed plan's `studentsSee` and `whoGetsIn` rows, as written, from our store** (a new read, `GET
    /api/apps/:projectId/plan`, answering those two rows of the latest plan agreed on the app, or `404`). **No model.** The
    message is an editable field and is not saved. *Rejected:* a model writing it (a session and a spend for one
    sentence); a new field in the plan (moment 5's five rows are Rich's); reading `docs/plan.md` from the tree, which needs
    a token our server may not hold.
13. **A fix for a production start** generalises F4's: `{ fix: { incidentId, environment: 'staging' | 'production' } }`
    (absent `environment` is `staging`, so F4's page and rows stand); the title per environment; the round reads the
    incident with its token from that environment (`Instances.incident`, today's `stagingIncident` generalised). **A
    confidential app's production incident is refused to a token** (FE-35's safeguard), exactly as staging's: the fix's
    view says only that it did not start there. F4's I2 (*one fix per incident*) holds.
14. **Streaming** (`model/client.ts`, `model/stream.ts`):
    - `stream: true`, `stream_options: { include_usage: true }`. `stream.ts` is a pure reader: the response body's
      server-sent events in, chunks out (`content`, `model`, `usage`), `[DONE]` the end, an `error` chunk an error.
    - **Three deadlines**, one set per use: **to the first word** (from the request), **between words**, and a **ceiling**.
      Provisional values, **set by M2**: a round's 120 s / 60 s / 15 min; the intake's and the plan's 60 s / 30 s / 3 min.
      `ROUND_MODEL_TIMEOUT_MS` and `timeoutMs` go.
      **(S1: M2) set: a round's 120 s / 30 s / 15 min; the intake's and the plan's 60 s / 30 s / 3 min.** Measured on 7106:
      `default-chat-large` writing a commit (3,360 tokens) gave its **first word at 13.6 s** (it reasons first) and was done
      at 24.4 s; its first moves' first words came in 1.2–2.4 s; **the on-premise `default-chat-onprem` (`qwen3.8:27b`)
      gave its first word at 56.8 s** on the lead's 4.3k-token prompt, so a round's 120 s leaves twice that; the intake's
      `default-chat` 3.5 s cold, 0.14 s warm. **The longest gap between words anywhere was 667 ms** (the on-premise model;
      98 ms on the capable one), so 30 s between words is still forty times the worst seen.
    - **New codes:** `MODEL_STALLED` (no first word, or a gap) and `MODEL_TOO_LONG` (the ceiling). A connection refused, a
      `5xx` or a gateway `error` chunk stays `MODEL_UNREACHABLE`.
    - **What arrived is counted, never kept**: `Answered` gains `received: { chars, firstWordMs, ms }`, and `ModelError`
      carries the same for a stall, so the trace records how much came and why it ended. The text lives only for the call.
    - **Which model answered**: the fallback header when a stream carries it; **(S1: M2)** if it does not, the chunks'
      `model` (F3 M1: *"`ollama_chat/qwen3.5:4b` for 9b's fallback"*) says so.
      **(S1: M2) a stream DOES carry `x-litellm-attempted-fallbacks`** (`0` on all 16 streamed answers), and **each chunk's
      `model` is the alias asked for** (`default-chat-large`, `default-chat-onprem`, `default-chat`), never the provider's,
      so the header is the only word on a fallback; `usage` arrives in the last chunk, before `[DONE]`.
    - **(S1: M2) a stream we cut is billed for what was streamed**: LiteLLM's own spend log (read by `manifest-c3`) billed
      the cut call **594 completion tokens** ($0.0015; 2,354 characters had arrived), against a whole commit's 3,360
      ($0.0032); the session's `spentUsd` showed it within 60 s and grew no more. Whether the upstream provider stopped
      generating is not visible from the laptop. So *Stop here* after a stall costs only what arrived.
    - **A stall is not retried by itself**: a retry re-asks and re-pays, so it is the person's *Carry on*. A complete
      answer that fails its schema is still asked once more.
    - **(S2: the final review's I1) A model's reasoning is working, not a stall.** A delta of `reasoning_content` (or
      `reasoning`) is never the answer and never counted, but from the first thought or word the quiet deadline runs
      between chunks, so a model that reasons past the first-word deadline is not cut. `received` counts the answer alone;
      the ceiling still bounds a reasoning loop. Whether the laptop's models stream their reasoning was not measured.
    - **The round's needs gains `{ kind: 'stalled'; why: 'quiet' | 'ceiling' }`**; the intake's and the plan's cards say
      the stall's words with their *Try again*.
    - **Mock mode is untouched**: its walkthrough model answers at once.
15. **The banner** is mock mode's alone. `packages/web/vite.config.ts` already reads `MANIFEST_APP_MODE` (for HMR), in the
    same process as our server; it defines `__MANIFEST_APP_MODE__` from it, and `web/src/mode.ts` reads it (`'edge'` when
    undefined, as in Vitest). `App` draws the strip above everything, the sign-in page included. `/api/me` and
    `/api/__doctor` do not change.
16. **Reads and re-reads.** *Going live* reads `getLaunchReadiness`, `getLaunchRecords`, `getRelease` (the candidate's
    date) and `getApproval`, and production's `getEnvironment`, on the person's session. It re-reads after each of its own
    actions and when shown again (`visibilitychange`). **No event stream in F5**: the platform's launch events reach our
    server in F6, with the watch token.

## What waits on the platform

**F5b, written when these land** (the platform's launch-path plan; each sitting's spec action is Rich's first):

| Ours, in F5b | The platform's sitting (task), and its spec action |
|---|---|
| *waiting since* on every item (`LaunchReadinessItem.since`); the clocks dated by `submittedAt`; **the staging registration's clock on *Trying out*** (`LaunchRecords.stagingRegistration`), and **[Open it in a new tab] once it is `active`** | **6** (Task 9), after Spec action 3 |
| **[Draft the request]**: the registration package shown (the attributes and their justifications, the metadata to send, the certificate's fingerprint) | **7** (Task 10), after Spec action 4 |
| **[Fill in what we know]**: the privacy-assessment draft shown, its gaps named | **8** (Task 11), after Spec action 4 |
| **[I've sent it]**, with a day and a reference (`launch:submit`, person-only) | **6** (Task 9) |
| **[Ask an administrator to sign this off]** (`requestApproval`) and its *waiting since* | **9** (Task 12), after Spec action 5 |
| The band's **[Start them]** | 6–8 |
| **The mock half of all of it**, and FE-40's switches if Rich confirms them | **10** (Task 13) |

**Adopting what lands meanwhile** (each sitting's Step 0; ORIENTATION §8: re-read `openapi.json`, `pnpm typecheck`,
`pnpm test`, and record the landing the same day):

| The platform's sitting | What we adopt |
|---|---|
| **3** (Tasks 4, 5) | **FE-38** (**adopted 2026-09-29**, `33e9251`, against `d894b8e`): `Instance.createdAt` replaces `facts.ts`'s comparison by the versions' dates, for the last attempt. **FE-33** (Task 5, **not landed at sitting 0's close**): a platform stream closed `4401` means its credential is gone: our server's subscription is not reopened, and the round's needs is `token` |
| **4** (Task 6a, first; then Task 6) | **FE-41** (Task 6a, confirmed by Rich 2026-09-30): a starter's `createProject` works on real GitHub, so moments 3–6 can be made through our page on 7100 again (the acceptance, sitting 6, needs it; nothing of ours changes). **FE-34**: a malformed request answers its own `400`, which the client already maps; the trace's fallback line becomes rarer |
| **4a** (Task 6b) | **FE-42 (a)** (confirmed by Rich 2026-09-30): the owner may run the rehearsal, and `runRehearsal`'s description says who may. **Then Task 7's press returns** as Decision 8 was approved (the button, the working row, *"You can leave: it carries on."*, our deadline, and a failure's words): ask Rich whether it goes into the next F5 sitting or a later one |
| **5** (Tasks 7, 8) | `agent_session.narrowed` (the key trimmed in place) parsed and traced, the round carrying on; `member_removed` as an end reason (`needs: token`); F4's renewal after `models_withdrawn` stays as the net |
| **5a** (Task 8a) | `Me.mayBuild`: **that is F4a**. The platform session messages us; **stop and ask Rich** whether to switch to F4a (native recommended) |

## Global Constraints

- Everything in F1's to F4's *Global Constraints*, which stand: no token or key reaches a model; nothing persisted is a
  credential; **our server and the lead never deploy anywhere but the sandbox**, and never read any output but the
  sandbox's; no dependency is added to the app; a step ticks only on its own signal; never *"It works"*; no
  infrastructure words (C3); every problem shown carries a support reference.
- **Every launch action is the person's session, in the browser**: `runRehearsal`, the production `deploy`, a production
  secret. **Our server calls none of them**, nor `approveRelease`, `rejectRelease` or the record routes (a test, Task 10;
  `check-going-live.sh`, Task 11).
- **The production deploy sends exactly the candidate the button named** (Decision 10). A test (Task 10).
- **Nothing measured in days is animated**, and every wait names its owner (`20-states.md`; `ClockItem`). A test (Tasks
  4, 6).
- **The clocks' duration is Rich's *"may take several days"***, never *weeks*; *Trying out* still never says a date,
  *"We asked…"*, or *"weeks"* (F4). A test (Tasks 5, 6).
- **No stopgap**: no `mailto:`, and no action a clock or the sign-off cannot honour. A test (Tasks 6, 8).
- **A model's answer is counted, never kept**: no text of an answer in the trace or the store. A test (Task 2).
- **Five states only; *we*, everywhere.** `machineryIn(text())` is empty on every new screen, closed disclosures and the
  mock-mode banner excluded (Tasks 3, 5–10).

## Review Focus

1. **The candidate moves under the button:** a round's version is put on trying-out while *Going live* is open, or while
   the person is away at the step-up. The press sends the candidate the button names at that moment, and a
   `RELEASE_NOT_STAGED` asks again with the new one. **Pinned in Task 10.**
2. **A long answer, and a dead one:** the lead writes a large file for six minutes, still arriving; the gateway goes
   quiet mid-answer; the first word never comes. The first succeeds, the others are `stalled` with their own words, and
   nothing of the answer is kept. **Pinned in Task 2.**
3. **Our deadline is not the platform's answer:** a production deploy or a dry run cut by our deadline and then
   succeeding. Never said as *nothing reached your students*; the page shows the end when it comes. **Pinned in Tasks 7
   and 10.**
4. **An old incident taken for this one:** a failed production start with an older incident listed first, or none yet.
   *[What went wrong]* is fed by this attempt's, or not offered. **Pinned in Task 10.**
5. **Old addresses and states nobody designed:** F4's `/apps/:slug?tab=trying-out`; an item `id` the platform adds
   tomorrow; a record in a state F5 did not expect; a launched app. Each opens something true. **Pinned in Tasks 5 and 6.**

---

## File Structure

```
packages/ui/src/
  ProgressBar.tsx        ported (the clock kind first), with parity                               Task 4
  ClockItem.tsx          ported with parity; + `state` (ours, tested)                             Task 4
  parity.test.tsx  ClockItem.test.tsx  index.ts  components.css
packages/server/src/
  model/stream.ts        server-sent events → chunks; pure                                        Task 2
  model/client.ts        stream; three deadlines; MODEL_STALLED, MODEL_TOO_LONG; received        Task 2
  app.ts  platform/intake.ts   each use's deadlines                                              Task 2
  build/round.ts         stalled → needs; the fix's view: production incident, dry run          Tasks 2, 7, 10
  api/progress.ts        Needs `stalled`                                                          Task 2
  api/apps.ts            fix { environment } and { dryRun }; GET /api/apps/:projectId/plan         Tasks 7, 9, 10
  platform/instances.ts  incident(token, projectId, environment, incidentId)                     Task 10
packages/web/
  vite.config.ts         define __MANIFEST_APP_MODE__                                              Task 3
  src/mode.ts            the mode, 'edge' when undefined                                          Task 3
  src/app.tsx            the banner; the rail; the new routes                                      Tasks 3, 5
  src/router.ts          app-overview, app-preview at /preview, app-going-live; `tab` on the bare path  Task 5
  src/platform/api.ts    getLaunchReadiness, getLaunchRecords, getEnvironment, runRehearsal, getApproval  Tasks 5–8
  src/ours/api.ts        startChange's fix kinds; agreedRows                                       Tasks 7, 9, 10
  src/screens/overview/  overview.tsx  band.tsx  students.tsx  overview.test.tsx                   Tasks 5, 9
  src/screens/going-live/  going-live.tsx  checklist.ts  clocks.ts  dry-run.tsx  sign-off.tsx  live.tsx  (+ tests)  Tasks 6–8, 10
  src/screens/trying-out/  parts.tsx (moved out of put.tsx)  put.tsx (M1, M2, M4)                  Task 10
  src/screens/building/needs.tsx   `stalled`'s card; the exhaustive default (M10)                  Task 2
  src/screens/your-apps/ model.ts  your-apps.tsx   the line                                        Task 5
  src/screens/preview/preview.tsx  [Open it] gone from Trying out; the new address                 Task 5
  src/words.ts
scripts/check-going-live.sh   Task 11, mock mode
```

---

## Task 1: Measure what this plan rests on (sitting 1, alone)

Throwaway code in the scratchpad. Only this plan's findings are committed. **Run nothing in manifest**: read it.
**Before 7100: ask Rich, and tell the platform session** (ORIENTATION §8). **Every project made on 7100 is a real private
repository on GitHub that nothing deletes**: this sitting makes **one**, named for this plan (for example `f5-reading`).
**Its row does not survive**: every platform sitting's first test run and its Docker tier truncate 7100 (`manifest-c3`,
2026-09-29), so the acceptance (Task 11) remakes a project by script; the repository stays on GitHub, and removing it is
Rich's (the platform's `scripts/github-real-repos.sh` lists it `NONE`). **LiteLLM is on 7106** (`manifest-13`, 2026-09-29); an agent session's key comes from
that project on 7100. **Rich types every password**; the administrator's part is his, as `operator`, in the reference
console (7104) or wherever the platform session says, with its step-up. **`make refresh-vulndb` is due after
2026-10-06**: past it `scans` blocks every launch, and it is the platform's to run, at Rich's word.

- [ ] **M1: the contract, and what landed.** Re-read `openapi.json` (version, operations, codes); name any launch-path
  sitting that has closed, and do its Step 0 (*Adopting what lands*).
- [ ] **M2: streaming on the gateway** (the project's agent session, from Node, the key never printed):
  - a strict `json_schema` answer streamed from `default-chat-large`, with the lead's real prompt and a lead-sized
    answer (a whole file): time to the first content chunk, **the longest gap**, total, characters;
  - `usage` in the last chunk; **`x-litellm-attempted-fallbacks` on a streamed answer**, and each chunk's `model`;
  - the same from the on-premise model (`default-chat` through an intake session, and the session's on-premise name);
  - **an aborted stream**: the session's `spentUsd` before, just after, and a minute after (does the spend stop?);
  - what a gateway error mid-stream looks like, if one can be made without touching the platform;
  - **→ set Decision 14's deadlines** from these numbers, with room above the longest real gap.
- [ ] **M3: the checklist, from nothing to ready** (the project built by moments 3–6, a version put on trying-out by
  moment 9's button): `getLaunchReadiness` (every item's `id`, `state`, `owner`, `blocking`, `why`; `ready`;
  `candidateReleaseId`) and `getLaunchRecords` **at each point**: before a build; built; on trying-out; after the dry run;
  after Rich records the registration `submitted`, then `active`, and the assessment `approved`; after the approval. **→
  words for every `id` × `state` seen** (Decision 6), and whether `scans` shows a stale list.
- [ ] **M4: the dry run** (`runRehearsal` from the session): its time; its answer; `evidence`'s fields; the item after;
  **whether it finishes when its caller goes** (abort at 3 s, then read the item). **A failure's shape**: the contract's
  `evidence`, and a real one if one can be made without changing the platform (an app whose sign-in releases less than it
  asked). **→ Decision 8's fix** (an incident on production, or evidence only).
- [ ] **M5: going live** (the button's path, from the session):
  - the production `deploy` **before `ready`**: the gate's refusal (`RELEASE_PRODUCTION_GATE_UNAVAILABLE`), its body;
  - **the first press after `ready`**: `403 STEP_UP_REQUIRED`, its body; **`/auth/step-up?returnTo=/apps/<slug>/going-live?then=live`**
    through the IdP and back: does `returnTo` keep its query; **how long a step-up lasts**;
  - the press after: its time; `listInstances` on production while it runs (the stations); `project.launched`;
    `launchedAt`; production's `getEnvironment`;
  - **a production secret** (only if the app declares one): `setAppSecret` on production, and its step-up.
- [ ] **M6: the sign-off**: `getApproval` for the candidate before (`404`) and after Rich approves (its fields); whether a
  version with nothing sensitive meets `admin-approval` without anyone. A rejection only if Rich wants to make a second
  version for it.
- [ ] **M7: the mock** (`pnpm mock`, 7102): what each operation above answers, so the walks know what to rewrite (FE-40).
- [ ] **Record** in this plan: each measurement, and **(S1)** corrections to Tasks 2–11. **Tell the platform session when
  7100 is free again.**

## Task 2: Every model call streams (sitting 2)

**Files:** `server/src/model/{stream.ts,stream.test.ts,client.ts,client.test.ts}`, `server/src/app.ts`,
`server/src/platform/intake.ts` (the intake's and the plan's models), `server/src/build/round.ts`,
`server/src/api/progress.ts`, `server/src/api/{intake.ts,plan.ts}` (a stall's refusal code),
`web/src/screens/building/{needs.tsx,model.ts,building.test.tsx}`, `web/src/screens/{describe/describe.tsx,plan/plan.tsx,
trouble.tsx}` (the intake's and the plan's cards), `web/src/words.ts`.

**Interfaces:**

```ts
// model/stream.ts: pure
export type Chunk = { content: string; model: string | null; usage: { in: number; out: number } | null }
export function chunksOf(body: ReadableStream<Uint8Array>): AsyncIterable<Chunk>   // throws ModelError('MODEL_UNREACHABLE') on an error chunk
// model/client.ts
export interface Deadlines { firstWordMs: number; quietMs: number; ceilingMs: number }
export const ROUND_DEADLINES: Deadlines      // (S1: M2) first word 120 s, between words 30 s, ceiling 15 min
export const ASKING_DEADLINES: Deadlines     // the intake's and the plan's (S1: M2) 60 s, 30 s, 3 min
export type ModelCode = … | 'MODEL_STALLED' | 'MODEL_TOO_LONG'
export class ModelError { readonly received: Received | null }
export type Received = { chars: number; firstWordMs: number | null; ms: number }
export interface Answered { model: string | null; fallback: boolean; usage: …; received: Received }
openAiCompatible({ baseUrl, key, model, fetch?, deadlines?: Deadlines, onAnswer? }): Model   // timeoutMs goes
// api/progress.ts
export type Needs = … | { kind: 'stalled'; why: 'quiet' | 'ceiling' }
```

- [ ] **Step 1: Tests, failing first** (a recording `fetch` that answers a `ReadableStream`, fake timers):
  - **Review Focus 2:** a six-minute answer whose chunks keep arriving within the quiet deadline **succeeds**, parsed and
    checked; a gap past `quietMs` mid-answer → `MODEL_STALLED`, `received.chars` the characters that came; no first chunk
    by `firstWordMs` → `MODEL_STALLED`, `firstWordMs: null`; past `ceilingMs` → `MODEL_TOO_LONG`; **each aborts the
    request** (the recorded `signal` is aborted);
  - the request body carries `stream: true` and `stream_options: { include_usage: true }`, and the schema as before;
  - `usage` from the last chunk, `model` from the chunks, the fallback from the header (**(S1: M2)** streams carry it;
    the chunks' `model` is only the alias asked for, so it is never read as the fallback); `onAnswer` gets `received`;
  - a `5xx`, a refused connection and an `error` chunk are `MODEL_UNREACHABLE`; `429` / `401` / `403` keep their codes;
  - a complete answer that fails the schema is asked once more (F2's rule); **a stall is never asked again by the
    client**;
  - `chunksOf`: events split across reads, a `data:` line split mid-JSON, `[DONE]`, comments and blank lines;
  - **the round:** `MODEL_STALLED` → `needs: { kind: 'stalled', why: 'quiet' }`, `MODEL_TOO_LONG` → `why: 'ceiling'`;
    *[Carry on]* resumes as from `unreachable`; the trace records `received`, and **no text of the answer** (a scan of the
    trace and the store for a sentinel the fake streamed);
  - **the page:** each stall's words with **[Carry on]** and **[Stop here]**; the intake's and the plan's stall words
    with their *Try again*; **M10:** the needs switch ends in an exhaustive default (a `never` check), and at run time a
    kind it does not know draws a card with a reference, never nothing.
- [ ] **Step 2: Red. Step 3: Implement** (`stream.ts` first, then the client's loop: a first-word timer, a quiet timer
  re-armed on each chunk, a ceiling timer, one `AbortController`).
- [ ] **Step 4: Green; controls:** restore the old total deadline (the six-minute answer red); remove the quiet timer (the
  mid-answer stall red); drop `usage` from the last chunk (the trace test red); keep the answer's text in the trace (the
  sentinel scan red); remove M10's default case (typecheck red, then the run-time test red). Each red, restored.
- [ ] **Step 5: Against the real gateway** (only if sitting 1's project is still there and Rich says so): one round's call,
  streamed, its `received` in the trace.
- [ ] **Step 6: Commit** `feat(server): every model call streams — a first word, words arriving, a ceiling; a stall says
  so, and nothing of an answer is kept`.

## Task 3: Mock mode says so (sitting 0, first, at Rich's word)

**Files:** `web/vite.config.ts`, `web/src/{mode.ts,vite-env.d.ts,app.tsx,app.css}`, `web/src/vite-config.test.ts`, a
screen test, `web/src/words.ts`.

- [ ] **Step 1: Tests, failing first:** the config defines `__MANIFEST_APP_MODE__` from `MANIFEST_APP_MODE` (`'mock'`
  when it is, else `'edge'`); `mode` is `'edge'` when the define is absent; **with `mode` `'mock'`** the banner (Rich's
  words) is on every page, signed in and not (the sign-in page, *Your apps*, a conversation), first in the document, as
  text (`role="note"`), not colour alone; **with `'edge'`** it is nowhere; `/api/__doctor` still answers exactly
  `{"name":"manifest-app"}` (F12's test, run again).
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; control:** the banner drawn in edge mode (red), restored.
- [ ] **Step 5: See it** at 1440 and 375 in `pnpm dev:mock`. **Tell Rich before restarting the server he may be using**
  (ORIENTATION §7), and make the change one edit.
- [ ] **Step 6: Commit** `feat(web): mock mode says so on every page`.

## Task 4: `ClockItem`, and `ProgressBar`'s clock (sitting 3)

**Files:** `ui/src/{ProgressBar.tsx,ClockItem.tsx,ClockItem.test.tsx,parity.test.tsx,index.ts,components.css}`.

**Interfaces:**

```ts
export interface ProgressBarProps { kind?: 'working' | 'done' | 'clock'; value?: number; label?: string; meta?: string; className?: string }
export interface ClockItemProps {
  title: string; body: string; chip?: string; clockLabel?: string; clockMeta?: string
  admissionTitle?: string; admissionBody?: string; action?: string; actionHref?: string; className?: string
  /** OURS: the clock's state. Absent, the reference's not-started card, byte for byte. */
  state?: 'notyet' | 'waiting' | 'steady'
}
```

- [ ] **Step 1: Tests, failing first:** **parity**: each reference case of `ProgressBar` and `ClockItem` renders the
  reference's markup (the parity test's table); **ours**: `state` sets the chip (`notyet` → the not-yet chip; `waiting` →
  waiting, unpulsed; `steady` → steady), the bar (hatched for not yet; still for waiting; filled for steady); **nothing
  animates** in any state (no working fill, no pulse); the labels are the caller's (the reference's *"Takes weeks"* only
  when none is given); no `action` → no button.
- [ ] **Step 2: Red. Step 3: Port, then extend. Step 4: Green; controls:** a pulse on waiting (red); `state` changing the
  reference's own markup (parity red). Each restored.
- [ ] **Step 5: Commit** `feat(ui): ClockItem and the clock's bar, from the design system, with a state of ours`.

## Task 5: The app's pages (sitting 3)

**Files:** `web/src/{router.ts,router.test.ts,app.tsx,words.ts}`, `web/src/screens/overview/{overview.tsx,band.tsx,
overview.test.tsx}`, `web/src/screens/preview/{preview.tsx,preview.test.tsx}`, `web/src/screens/building/…` (the *[Try it]*
address), `web/src/screens/your-apps/{model.ts,model.test.ts,your-apps.tsx}`, `web/src/platform/api.ts`.

**Interfaces:**

```ts
// router.ts
| { name: 'app-overview'; slug: string }
| { name: 'app-preview'; slug: string; tab: Tab }          // /apps/:slug/preview?tab=…
| { name: 'app-going-live'; slug: string; then: 'live' | null }
// platform/api.ts (the session)
getLaunchReadiness(projectId: string): Promise<Schemas['LaunchReadiness']>
getLaunchRecords(projectId: string): Promise<Schemas['LaunchRecords']>
getEnvironment(environmentId: string): Promise<Schemas['Environment']>
// your-apps/model.ts
AppCard gains `beforeStudents: boolean`   // built, not launched, a production clock unmet
```

- [ ] **Step 1: Tests, failing first:**
  - **Review Focus 5:** `/apps/x` is the Overview; `/apps/x/preview?tab=trying-out` the Preview's tab;
    **`/apps/x?tab=trying-out` opens the Preview's tab and the address becomes `/apps/x/preview?tab=trying-out`** (by
    `remember`, no navigation); `/apps/x/going-live?then=live` carries `then`; a malformed piece is `unknown`;
  - the rail: *Overview · Preview · Conversations · Going live*, each active on its route, on a conversation's page too;
  - **the Overview before launch**: the name and audience; three address rows, each F4's *serving* fact and a link to its
    tab; *[Ask for a change]*; **the band** only when a draft has been built, the app is not launched, and a production
    clock is unmet (each of the three conditions' negation hides it); its words say *"may take several days"*, never
    *weeks*; after launch, the band is gone and a slot for *For your students* (Task 9) is there;
  - ***Your apps***: a built, unlaunched app with a clock unmet carries the line and *[Going live]*; launched, not built,
    or both clocks met, none; one `getLaunchReadiness` per such app, none for the rest;
  - ***Trying out* has no *[Open it in a new tab]***, and still Rich's words, no date, no *"We asked"*;
  - the building screen's *[Try it]* goes to `/apps/<slug>/preview`;
  - `machineryIn` empty on the Overview.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** the `tab` redirect removed (red); the band's launched
  condition removed (red); *weeks* in the band (red). Each restored.
- [ ] **Step 5: Walk it** in headless Chrome against the mock, at 1440 and 375: the rail, the Overview, an F4 address.
- [ ] **Step 6: Commit** `feat(web): the app's Overview, and Going live in the rail`.

## Task 6: *Going live* (moments 10 and 11; sitting 3)

**Files:** `web/src/screens/going-live/{going-live.tsx,checklist.ts,clocks.ts,going-live.test.tsx,checklist.test.ts,
clocks.test.ts}`, `web/src/words.ts`.

**Interfaces:**

```ts
// checklist.ts: pure
export type Five = 'working' | 'waiting' | 'attention' | 'steady' | 'notyet'
export interface Row { id: string; state: Five; owner: string; words: string; action: 'dry-run' | null; apart: boolean }
export const CLOCK_IDS: readonly string[]   // 'iam-registration', 'privacy-assessment'
export function rowsOf(readiness: Schemas['LaunchReadiness'], context: { hostname: string | null }): Row[]
// clocks.ts: pure
export interface Clock { which: 'registration' | 'assessment'; state: 'notyet' | 'waiting' | 'steady'; chip: string; label: string; meta: string; admission: boolean }
export function clockOf(which: Clock['which'], record: Schemas['IamRegistration'] | Schemas['PrivacyAssessment'] | null, now: Date, timeZone?: string): Clock
```

- [ ] **Step 1: Tests, failing first:**
  - **the page**: the heading and lead (Rich's duration); **the version that would go live**, from `candidateReleaseId`
    (its date by F4's `versionAsked`), or the none-yet sentence with a link to *Trying out*; **two `ClockItem`s**, the
    staging line with its link, *"Short jobs, for the end"*, the rows, `code-review` last and apart;
  - **`clockOf`**: every record state (none, each IAM state, each PIA state) to its state, chip, label and meta; `submitted`
    counts days from `updatedAt` in Vancouver (the F2 trap's day, never now's offset); `active` / `approved` dated;
    **no clock is ever `working`**;
  - **`rowsOf`** (**Review Focus 5**): every `id` × `state` the contract allows, and every one **M3** saw, to its words;
    the two clocks' ids are not rows; **an unknown `id`** → *"Something new on the list: <title>"*; the rehearsal *needs
    you* only with a candidate, else *not yet*; **`scans` unmet → waiting on the Manifest team, no action** (Decision 7);
  - **no stopgap**: no `mailto:` anywhere on the page, and no action on a clock;
  - `[Let your students in]` absent unless `ready` (Task 10 draws it);
  - re-reads on `visibilitychange`; a read that fails says what is still true, with a reference; `machineryIn` empty.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** a clock `working` (red); the unknown id hidden (red);
  *weeks* on the page (red); a `mailto:` (red). Each restored.
- [ ] **Step 5: Walk it** against the mock at 1440 and 375, and with the mock's answers rewritten in DevTools (FE-40):
  records in each state, a ready checklist.
- [ ] **Step 6: Commit** `feat(web): Going live — what stands between the app and its students, in our words`.

## Task 7: The dry run (moment 12; sitting 4)

> **(S1, FE-42, Rich 2026-09-30: *"Both: row now, ask platform"*.) The owner cannot run it**, so this task builds **the
> row only**, read from the checklist item (no operation reads a rehearsal back; its `rehearsal.completed` event reaches
> us with F6's watch):
> - no candidate → **not yet**, *"Once a version is on your trying-out address."*;
> - `unmet` with a candidate → **waiting on someone**: *"A Manifest administrator runs it."* · *"Manifest doesn't tell
>   them yet that it's waiting."* No button, no `mailto:`;
> - `met` → **steady**, *"Done. It answered and signed someone in on the live setup."*;
> - a failed run's `why` was not measured (the laptop's IdP releases every attribute asked for): its row is *waiting on
>   someone* with the same words until one is seen, and **no *[Fix it]*** (nothing gives the page the evidence).
>
> The press, `runRehearsal` in `platform/api.ts`, `REHEARSAL_TIMEOUT_MS`, the fix's `dryRun` shape and the server side
> below are **not built**: they return with FE-42 (a). What remains of the steps below: the row's tests (each state,
> `machineryIn` empty, no button in any state, a control that draws one goes red), and its walk.

**Files:** `web/src/screens/going-live/{dry-run.tsx,dry-run.test.tsx}`, `web/src/platform/api.ts`, `web/src/ours/api.ts`,
`server/src/api/{apps.ts,apps.test.ts}`, `server/src/build/round.ts`, `server/src/agents/lead.ts` (the view's dry run),
`web/src/words.ts`.

**Interfaces** (the fix's shape **(S1: M4)**):

```ts
// platform/api.ts (the session)
export const REHEARSAL_TIMEOUT_MS = 150_000
runRehearsal(projectId: string, idempotencyKey: string): Promise<Schemas['Rehearsal']>
// ours/api.ts: startChange's body gains, when M4 finds evidence only
| { fix: { dryRun: { rehearsalId: string; signInStatus: number | null; attributesReleased: string[]; attributesAsked: string[] } }; token: string }
```

- [ ] **Step 1: Tests, failing first** (a recording `Platform`, fake timers):
  - the row's **[Run the dry run]** only with a candidate; the press sends one `runRehearsal` with an `Idempotency-Key`;
    **working** while it runs, with its words and no stations; passed → steady; not passed → needs you, M4's sentence,
    **[Fix it]**;
  - `REHEARSAL_NO_CANDIDATE` → not yet; `REHEARSAL_DEPLOY_FAILED` → needs you with its words; `REHEARSAL_LAUNCHED` → a
    re-read;
  - **Review Focus 3 / M1:** our deadline cut → *"We stopped waiting…"*, then the item read again until it moves (never
    *"nothing happened"*);
  - **[Fix it]** mints a token and starts one fix (the review's I2: pressed again, the same one); its title (S1);
  - **our server:** the dry run's fix is kept, joins the line, and the lead's view carries it (an incident, or the
    evidence's fields), **never the evidence's `reason` as the person's words**; a body with extra fields is `400`;
  - `machineryIn` empty; *"You can leave"* only if **M4** measured it true.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** the deadline's *unsure* removed (red); a second fix
  for the same dry run (red). Each restored.
- [ ] **Step 5: Walk it** against the mock (its dry run passes; a failure rewritten in DevTools).
- [ ] **Step 6: Commit** `feat: moment 12 — the dry run, from your own session, and its fix`.

## Task 8: The sign-off (moment 13; sitting 4)

**Files:** `web/src/screens/going-live/{sign-off.tsx,sign-off.test.tsx}`, `web/src/platform/api.ts`, `web/src/words.ts`.

**Interfaces:**

```ts
getApproval(releaseId: string): Promise<Schemas['Approval'] | null>   // 404 → null
```

- [ ] **Step 1: Tests, failing first:** each row of Decision 9's table (undecided, approved, met without one, rejected),
  its state and words; **no date while undecided** and *"Manifest doesn't tell them yet that it's waiting."*; rejected →
  **[Talk it through]** mints a token and starts **a change** whose words are ours plus the reason, cut at a word to the
  change's limit, then opens its conversation; a candidate that changes re-reads its own approval; **no `mailto:`**;
  `machineryIn` empty.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** the reason dropped from the change's words (red); an
  undecided row with a date (red). Each restored.
- [ ] **Step 5: Walk it** with rewritten answers (the mock's approval is always approved: FE-40).
- [ ] **Step 6: Commit** `feat(web): moment 13 — the sign-off, as it stands, and talking a refusal through`.

## Task 9: The hand-over (moment 15; sitting 4)

**Files:** `web/src/screens/overview/{students.tsx,students.test.tsx,overview.tsx}`, `web/src/ours/api.ts`,
`server/src/api/{apps.ts,apps.test.ts}`, `server/src/store/…` (the latest agreed plan on an app), `web/src/words.ts`.

**Interfaces:**

```ts
// our server: GET /api/apps/:projectId/plan → { studentsSee: string; whoGetsIn: string } | 404
// ours/api.ts
agreedRows(projectId: string): Promise<{ studentsSee: string; whoGetsIn: string } | null>
```

- [ ] **Step 1: Tests, failing first:**
  - after launch the Overview leads with **For your students**: production's address (`getEnvironment`'s `url`) in mono,
    **[Copy]** (the page's *"Copied"*); *"Students sign in with their CWL."*; **the message** as Rich's words with the
    plan's *What students see*, in an editable field with [Copy], not saved; **the honest line** with the plan's *Who gets
    in*; production's two facts (F4's `facts.ts`);
  - no agreed plan (an app made elsewhere) → the message and the line without their second parts;
  - **our server:** `/plan` answers the two rows of **the latest plan agreed on that app**, and only to a person whose
    conversations are on it (another person → `404`); never another row; a student app's `Origin` refused as every route
    (`403`);
  - `machineryIn` empty.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** the plan's other rows answered (red); another person
  answered (red). Each restored.
- [ ] **Step 5: Walk it** with a launched project's answers rewritten (the mock's `MANIFEST_MOCK_LAUNCHED=1` gives
  `launchedAt`).
- [ ] **Step 6: Commit** `feat: moment 15 — the address handed over, with a message to paste`.

## Task 10: Putting it live (moment 14), and M1, M2, M4 (sitting 5)

**Files:** `web/src/screens/going-live/{live.tsx,live.test.tsx,going-live.tsx}`,
`web/src/screens/trying-out/{parts.tsx,put.tsx,put.test.tsx}`, `web/src/router.ts`, `web/src/ours/api.ts`,
`server/src/api/{apps.ts,apps.test.ts}`, `server/src/platform/instances.ts`, `server/src/build/round.ts`,
`web/src/words.ts`.

**Interfaces:**

```ts
// screens/trying-out/parts.tsx: moved out of put.tsx, exported
export function Stations(props: { instance: Pick<Schemas['Instance'], 'state'> | null }): JSX.Element
export function Secrets(props: { missing: Missing[]; onSet: (values: Record<string, string>) => Promise<void> }): JSX.Element
export function StepUpCard(props: { returnTo: string; aboutStudents: boolean }): JSX.Element
export function WhatWentWrong(props: { …; incidentId: string; environment: 'staging' | 'production' }): JSX.Element
// ours/api.ts: startChange's fix gains `environment`
| { fix: { incidentId: string; environment?: 'staging' | 'production' }; token: string }
// platform/instances.ts (our server)
incident(token: string, projectId: string, environment: 'staging' | 'production', incidentId: string): Promise<IncidentView>
```

- [ ] **Step 1: Tests, failing first** (a recording `Platform`, fake timers):
  - **[Let your students in]** only when `ready`, with the walk-through's sentence naming the candidate's version and
    production's hostname;
  - **Review Focus 1:** the press re-reads `candidateReleaseId` and **deploys exactly that release to production's
    environment id**, with an `Idempotency-Key`; a candidate that changed between the page's read and the press is the
    one sent **and** named; `RELEASE_NOT_STAGED` → the walk-through's question with the new version;
  - **the step-up:** `STEP_UP_REQUIRED` → the card in place, **[Sign in again]**'s `href` is `stepUpHref` of
    `/apps/<slug>/going-live?then=live`; arriving with `then=live` → *"You're signed in again."*, the button, and the
    address without `then` (by `remember`); **nothing in `sessionStorage` or `localStorage`**;
  - **the stations** on production's new instance (every second; the one not listed at the press); the end is `deploy`'s
    answer: healthy → *"Reading responses is live."*, the address, **[See what to tell your students]**;
  - `RELEASE_PRODUCTION_GATE_UNAVAILABLE` → the checklist re-read, the changed row lit, no button;
    `RELEASE_SECRET_NOT_SET` → `Secrets` on production (and the step-up card if `setAppSecret` asks, **S1: M5**);
  - **Review Focus 4 / M2:** a failed start with an older incident listed first → *[What went wrong]* fed by the one whose
    `instanceId` is this attempt's; none → one re-read after 2 s; still none → the facts without the button; **the same on
    *Trying out***;
  - **Review Focus 3 / M1:** a deploy cut by our 120 s → *unsure* words, the new instance read every second up to five
    minutes, then its end; never *"Nothing reached your students"* unless `deploy` answered `failed`; **the same on
    *Trying out***;
  - **M4:** after *arrived* or *never answered*, a `visibilitychange` with a new version on the draft (trying-out) or a new
    candidate and `ready` (going live) brings the offer back; with nothing new, no offer;
  - **our server:** a fix with `environment: 'production'` is titled *"It didn't start on the live address"*, and the
    round reads production's incident; a confidential project's refusal (`INCIDENT_LOG_CONFIDENTIAL`) gives the view only
    that it did not start there; a fix with no `environment` is F4's, unchanged; **our server calls no `deploy` but the
    sandbox's, and never `runRehearsal`, `approveRelease`, `rejectRelease` or a record route** (a recording platform over
    every route the page reaches);
  - `machineryIn` empty; *"Reading responses is live"* says the app's name.
- [ ] **Step 2: Red. Step 3: Move the parts** (one commit of its own if it is large: `refactor(web): trying-out's parts,
  shared`), then implement.
- [ ] **Step 4: Green; controls:** the candidate read at page load instead of the press (red); `incidents[0]` restored
  (red); the deadline's *unsure* removed (red); `then` left in the address (red); a production deploy from our server's
  fake (the guard red). Each restored.
- [ ] **Step 5: Walk it** against the mock at 1440 and 375, with DevTools rewriting the answers (FE-40): the step-up (a
  `403` first, then a fake `/auth/step-up` redirect back), the stations, each failure.
- [ ] **Step 6: Commit** `feat: moment 14 — let your students in, with a second sign-in; M1, M2 and M4 on trying-out too`.

## Task 11: The acceptance (sitting 6, alone)

> **(S1) Before it runs:** a project made through our page on real GitHub needs **FE-41** fixed (a starter's
> `createProject` answers `409 SOURCE_GIT_FAILED`; carried at Rich's word). Every platform sitting's first test run
> truncates 7100, **the admin grant included**: the acceptance asks the platform session for
> `scripts/admin-grant.sh grant opr000001` after `operator` has signed in once, and plays the administrator by script
> (Rich: *"Script does it"*). Sitting 1's scripts (`lib.mjs`: the three hops and the step-up in Node; `m.mjs`:
> the records, the preview and approval, the gate, the press) are the acceptance's starting point: copy them into the
> repository's `scripts/` then, or rewrite them in its bash, as `check-going-live.sh` needs.

- [ ] **Step 0:** the platform's landings (*Adopting what lands*); re-read `openapi.json`.
- [ ] **Step 1: Against the mock** (from a fresh dev database, ORIENTATION §7). `scripts/check-going-live.sh`, beside
  `check-seeing.sh`, drives our API as the browser does, and asserts **what our server sent**, from the trace and the
  store:
  1. a fix for a production incident: kept with its environment, titled, holding the app, its round reading production's
     incident;
  2. a dry run's fix (M4's shape), carried into the lead's view;
  3. *[Talk it through]*'s change: their reason in its words, planned and waiting for *Yes* (a change is agreed first);
  4. **our trace names no `deploy` but the sandbox's, and no `runRehearsal`, `approveRelease`, `rejectRelease`,
     `recordIamRegistration` or `recordPrivacyAssessment`**;
  5. `/api/apps/:projectId/plan` answers two rows, and `404` to another person;
  6. a student app's post to each changed route is `403 ORIGIN_REFUSED`;
  7. no `mft_` and no `sk-` in any table or frame; **no sentinel of a model's answer in the trace**.

  **Negative controls, each red:** a production deploy from our server; the plan route answering a third row; the fix's
  environment dropped; a model's text kept in the trace.
- [ ] **Step 2: On the real platform** (at Rich's word, telling the platform session; our server in edge mode; sitting
  1's project if it survived, else one new real repository at his word). Headless Chrome through
  `https://app.manifest.internal`, signed in as `instructor`, at 1440 and 375: the band on *Your apps* and the Overview;
  *Going live* from nothing to ready (Rich, as the administrator, recording and approving); **the dry run**; **[Let your
  students in]**, the step-up (**Rich types**), the stations, *"… is live."*; **the hand-over**, its message copied;
  **one round's calls streamed**, their `received` in the trace; record every sentence the platform's `why`s and our words
  put side by side.
- [ ] **Step 3: Rich's click:** his own app, from the Overview to live.
- [ ] **Close:** the whole-branch review (a fresh reviewer, read-only, dispatched at the sitting's start so its fixes land
  before the real platform), its findings fixed test-first; the gates twice; the dated entry; this table; ORIENTATION; the
  roadmap. **F5 is executed only when Step 3 is done.** Then F5b is written when the platform's sittings 6–10 land.

---

## What this plan does not build

- **F5b** (*What waits on the platform*, above): the clocks' actions, *waiting since*, the staging clock and [Open it]
  once registered, the package and the assessment draft, asking an administrator, the band's *[Start them]*.
- **Emails** (moment 13's *"our server turns into an email"*), the watch token, and **moment 16's Overview** (*since you
  were last here*, the needs-you band): F6.
- **People** and **Agents**; a change after launch (moment 17); switching off (moment 20): F6.
- **A load test of our own**: the `load-rehearsal` row says what the platform answers.
- **The stream shown on screen** (*"Writing the page students see"*): Rich chose streaming without it.
- **Logging refused requests**: Rich chose the banner.
- **F4's other seven minors** (M3, M5–M9, M11), **F3's** and **F2's**: in the ledger.
- **A *[Fix it]* for `scans`** until FE-32 lands (Decision 7).

## What executing this plan found

*Each sitting adds a dated entry here: its measurements, its rulings, its negative controls, and its gates.*

### 2026-09-29 — The plan written, with Rich (session `manifest-app-ce`, documents only)

*At Rich's word (*"start the next sitting: writing F5 — Going live, with me … This sitting writes and gets the plan
approved; it builds nothing"*): superpowers:brainstorming, then writing-plans, as F4 was written. Nothing was built,
7100 was not used, and no test was run: the gates are owed by code, and none changed.*

- **Read first:** the walk-through's moments 10–15; `api-findings.md`; F4's sitting 7 entry and its *Open for Rich*; the
  ledgers' deferred minors; **the platform's launch-path plan** (read-only), which builds FE-6 (its sittings 6–8), FE-25
  (sitting 9), FE-33 and FE-38 (sitting 3), FE-34 (sitting 4), the key trim and member removal (sitting 5), FE-39's
  `mayBuild` (sitting 5a), and the mock's half (sitting 10). Its spec actions 3–5, which F5b's sittings wait on, are
  undecided.
- **The platform session, `manifest-13`** (its launch-path sitting 2): told at our start that we write documents only
  and would not use 7100. **It reported Rich's demo of that afternoon** (`0565-503F`): our server was in mock mode
  behind `app.manifest.internal`, so his real session met a mock-mode server and was refused, and so was the problem
  report. Rich chose a banner (Task 3). It will message us when `Me.mayBuild` lands (sitting 5a, F4a), and before any
  commit to `packages/contract` or `packages/mock`. **LiteLLM is on 7106** (its word), which Task 1 records.
- **Rich decided, in order** (each is in *Decided by Rich*): build now, no stopgap; [Open it] hidden until registered;
  streaming (*"When the timeout happens have we still captured what the LLM has sent…?"*), then every call; M1, M2, M4
  and M10; the banner; two plans, F5 and F5b; *"may take several days"*; FE-40 filed and carried. **The design's six
  sections, each approved.**
- **FE-40 written and carried** (`28f136c`) to `manifest-13`, which recorded it in its launch-path plan at Task 13,
  **PROPOSED until Rich confirms it to a platform session**.
- **One correction made while writing, for Rich at review**: Decision 7 (`scans` unmet waits on the Manifest team, no
  *[Fix it]*, because of FE-32), against Section 2 as approved.
- **The walk-through changed with the plan** (`2959e40`): moments 7, 10, 11, 13 and 15.
- **Open for Rich:** the plan's review and its execution method (native recommended); Decision 7; confirming FE-40 to a
  platform session when its §7e asks; sitting 1's use of 7100 (one real repository) when it starts.
- **The machine at the close** (queried 18:48 PDT, not remembered): 7100 the control plane (node 58453, on real GitHub;
  `manifest-13` restarts it at its close, which signs everyone out); 7102 our mock (node 93237); 7105 our server in mock
  mode (node 10795, one `tsx watch`, 10789); 7106 LiteLLM (Docker); 7104 not listening. **Two Vitest processes are the
  platform's own `pnpm test`** (parent `pnpm test`, cwd manifest), left alone, as its `test:docker` was at our start.
  Manifest at `46f3988`; the contract 1.4.0, 66 operations, unchanged.

### 2026-09-29 — Sitting 0: the plan approved, Task 3 (the banner), and Step 0 for 1.5.0 (session `manifest-app-a0`)

*Rich's first answers: **"Approved as written"**, **"Native"**, **"Accept Decision 7"**, and **"Banner first, then
wait"**: the platform's launch-path sitting 3 (`manifest-c3`) holds 7100 for several hours and truncates it from its
first test run, so Task 3, which needs neither 7100 nor a measurement, ran first. 7100 was not used.*

- **The platform session, `manifest-c3`** (its launch-path sitting 3, Tasks 4–5): told at our start that nothing of ours
  is on 7100 and that we hold 7102 and 7105. It answered that 7100 is its own until its close (several hours: its
  Docker tier and two full runs come last), that **every platform sitting's first test run and its Docker tier truncate
  7100**, so a project there survives only from one sitting's close to the next one's first test: **sitting 1's project
  cannot be kept for the acceptance** (Task 1 now says so; the acceptance remakes one by script). **It reported that
  Rich confirmed FE-40 to it**, which its Task 13 carries. It announced 1.5.0 before and after it landed.
- **Task 3: mock mode says so** (`ae148d4`). `vite.config.ts` defines `__MANIFEST_APP_MODE__` from our server's
  `MANIFEST_APP_MODE`; `mode.ts` reads it (`'edge'` when absent, as in Vitest, or anything but `'mock'`); `App` draws
  Rich's sentence first on every page in mock mode, as a `note` in words, the sign-in page and *Manifest out of reach*
  included, and nothing in edge mode (edge's DOM is unchanged). `/api/__doctor` still answers `{"name":"manifest-app"}`
  (F12's test, run again; and `curl` after the restart).
  - **Rulings** (the ledger): the page and banner share a `.mock-frame` column in mock mode only, so the pages that are
    `min-height: 100vh` do not scroll by the banner's height; `App` takes `mode` for a test, as it takes `now`.
  - **Found by the walk: in our dev server Vite does not write a `define` in place.** It sets it as a global in
    `/@vite/env`, which `/@vite/client` loads before the page, so `mode.ts` reads it with `typeof`, and the stubbed
    global in `mode.test.ts` is the dev path. **And a change to `vite.config.ts` needs our server restarted** (`tsx
    watch` excludes `../web/**`, and Vite in middleware mode did not reload its config): the first `curl` after the edit
    served the old config. Both are traps in ORIENTATION §7.
  - **The walk** (headless Chrome, 1440 and 375, `pnpm dev:mock`): the sign-in page, *Your apps*, *Start something new*
    and a conversation. On all eight, one note, first on the page, at the top; no sideways scroll; no page that fitted
    scrolls (`scrollHeight` = `innerHeight`, the conversation at 375 excepted, by its own length); the skip link still
    the keyboard's first stop once signed in. At 375 the sentence takes two lines, breaking at *manifest-mock*'s hyphen.
  - **Negative controls:** the banner drawn in edge mode (6 of the screen test's 11 red); the banner after the page
    (4 red: every page that draws something); `mode.ts` taking any defined value (1 red). Each restored.
- **Step 0: contract 1.5.0 landed mid-sitting** (manifest `d894b8e`, the platform's launch-path Task 4, FE-38 option
  (a)): `Instance.createdAt`, required, when the deploy made it; the list's order unchanged. **Our typecheck went red on
  seven test fakes** (the Preview's, trying-out's and the stations'), none of Task 3's, so Task 3 was committed on its
  own green suite and the adoption made its own commit (**`33e9251`**, *Adopting what lands*): **the last attempt is
  the newest failure made after the one serving, whatever its version** (FE-38's rollback now reads right; the same
  version failing after the one serving is no longer taken for an earlier try; of several failures the newest made is
  the last even before its incident is written), and the Preview reads only the serving version, a failure no longer
  needing its version dated. Three new tests, each red before; the control (the old same-version rule back) turned
  three red. **Our mock on 7102 was restarted** (it runs from source and had read the old fixtures), and answers
  `createdAt`; the Preview's two facts drawn against it. FE-38's landing is in `api-findings.md`.
- **Not landed at our close:** Task 5, FE-33's close code `4401` (a revoked or expired credential), on the same 1.5.0.
  `manifest-c3` will message before it lands; **the next sitting's Step 0 adopts it** (our server's subscription not
  reopened, the round's needs `token`).
- **Gates:** `pnpm test` twice, **1248 passed** (60 files; 1229 at F4's close, +16 Task 3, +3 FE-38); `pnpm typecheck`,
  `pnpm lint`, `pnpm format:check` clean; `check-slice.sh` 8/8 in mock mode. `check-describing.sh`, `check-building.sh`
  and `check-seeing.sh` were not run: neither commit touched our server's code, only the page and its Vite config.
- **The machine at the close** (queried 19:46 PDT, not remembered): 7100 the control plane (node 49186, `manifest-c3`'s,
  mid-sitting); 7102 our mock (node 20899, restarted for 1.5.0); 7105 our server in **mock mode** (node 2681, one `tsx
  watch`, 2675), **restarted for Task 3's Vite config: it now shows the banner**; 7106 LiteLLM (Docker); 7104 not
  listening. No Vitest process, no walk's Chrome left. Manifest at `2a26547`; the contract 1.5.0, 66 operations.
- **Next:** sitting 1, the measurements, once `manifest-c3`'s sitting 3 has closed (it messages us), at Rich's word for
  7100; its Step 0 adopts FE-33's `4401` if it has landed.

### 2026-09-30 — Sitting 1: the measurements, on 7100 (session `manifest-app-a0`)

*At Rich's word (*"when it messages you, please feel free to begin sitting 1"*), when `manifest-c3` closed the platform's
launch-path sitting 3 (`bf94c73`) and said 7100 was ours. 7100 was used from 04:19 to 04:40Z; nothing was restarted.
The throwaway scripts are in the session's scratchpad (`s1/`: `lib.mjs`, `build.mjs`, `prep.mjs`, `m.mjs`, `m2.mts`,
`m7.mjs`), their records in `s1/out/` (`m2.jsonl` to `m7.txt`); the ledger has every run.*

- **Step 0.** Contract **1.5.0** (66 operations): FE-38 adopted in sitting 0; **FE-33's `4401` adopted** (`35102dc`: our
  server's platform stream treats `4401` as refused and never reopens it, so the round asks for a new token; red first,
  one test); `9ac609d` (the `4401` text) and `84d485a` (the mock's `createdAt`, `InstanceList`'s description) need
  nothing of ours: typecheck and 1249 tests pass against each, and **our mock was restarted to read the new fixtures**.
- **The platform's side, at the start:** control plane 98101 on `84d485a`, real GitHub, an empty database.
  `operator` and `instructor` signed in from Node by the three hops (`lib.mjs`, manifest's `idp-login.sh` ported: one
  host-keyed jar per person, so the ACS post carries the login cookie); **`manifest-c3` ran the admin grant** for
  `opr000001` at Rich's word; our server switched to edge mode for the sitting, and back to mock mode at its end.
- **FE-41 (written, carried): *Make it* failed twice through our page**, `409 SOURCE_GIT_FAILED`, nothing made. Our blueprint
  agent had chosen the `proof-app` starter (read back from our store); **the same `createProject` from Node without a
  starter answered `201`**. So the project is **`f5-reading`** (a real private repository,
  `Manifest-local-dev/f5-reading`), made from Node; **the bare skeleton failed to start** (*"MONGODB_URI is required"*:
  it declares no `services:`), so the starter's five files were committed through the authoring API (the manifest's
  `name` set to the slug), then built (20 s), released, and put on the draft (8.6 s) and trying-out (8.1 s), healthy.
  **Our round was not run on 7100 this sitting**: moments 3–6 through our page wait on FE-41; sitting 6 runs them.
- **M2, streaming on the gateway** (16 streamed answers on `default-chat-large`, `default-chat-onprem`, `default-chat`):
  the capable model's commit move (3,360 tokens) gave its **first word at 13.6 s** and finished at 24.4 s; its first moves
  1.2–2.4 s; **the on-premise lead's first word at 56.8 s**; the intake's `default-chat` 3.5 s cold, 0.14 s warm; **the
  longest gap between words anywhere, 667 ms**. `usage` is in the last chunk; **`x-litellm-attempted-fallbacks` rides on
  a stream** (`0` every time); **each chunk's `model` is the alias asked for**, never the provider's. **A cut stream is
  billed for what was streamed** (LiteLLM's own spend log, read by `manifest-c3`: 594 completion tokens for 2,354
  characters, against 3,360 for a whole commit); the session's `spentUsd` settles within 60 s. **→ Decision 14's
  deadlines set: a round's 120 s / 30 s / 15 min; the intake's and the plan's 60 s / 30 s / 3 min.** A gateway error
  mid-stream was not made.
- **M3, the checklist from nothing to launched** (every `why` in `s1/out/m3.jsonl`): made → built → released → on the
  draft: `domain` met, everything else `unmet` (the IAM and PIA with nothing recorded; `rehearsal`, `scans` and
  `admin-approval` **for want of a candidate**), `code-review` `not_built`; **on trying-out: `scans` met** although the scan
  lists the blueprint's own unfixable `passport-saml` critical (*"no published fix"* does not block); the registration
  `submitted` → unmet, `active` → met; the assessment `submitted` → unmet, `approved` → met; after the approval
  **`ready: true`**; after launch, the launched clause (no `rehearsal` item). **No `load-rehearsal` for a class-sized
  audience.** The platform's own words say *"multi-week lead time"*; ours stay Rich's *"may take several days"*. **→
  Decisions 6 and 7 corrected (S1):** three rows are *not yet* without a candidate, and `scans` unmet with one means a
  fixable finding.
- **M4, the dry run: THE OWNER IS REFUSED** (`403 FORBIDDEN`, *"role 'owner' may not 'launch:record'"*), by the platform's
  design (`authz-contract.ts`: an administrator alone). **FE-42 written.** As `operator`: passed in **7 s**; **it carries
  on when its caller goes** (cut at 3 s, `met` by the next read); `evidence` is `{ instanceId, hostname, listener,
  signInStatus, attributesReleased, reason }`. A failure was not made. **→ Rich: *"Both: row now, ask platform"*; Task 7
  rewritten to the administrator's row (S1), FE-42 (a) carried.**
- **M5, going live:** **the step-up is asked before the gate** (a press before `ready` answers `403 STEP_UP_REQUIRED`;
  stepped up, `409 RELEASE_PRODUCTION_GATE_UNAVAILABLE` with the checklist as `error.launchReadiness`); **`returnTo` keeps
  its query** (`…/going-live?then=live` came back exactly); a step-up lasts **10 minutes** (read in the control plane's
  `identity/step-up.ts`); the press after the step-up: **`200 healthy` in 5.3 s**, the new instance listed **last** while
  `starting`, `launchedAt` set, production's environment answering its `url`. The app declares no production secret:
  setting one was not measured. **The recording of the registration and the assessment asks no step-up; the approval
  does.**
- **M6, the sign-off:** `getApproval` **`404` before a decision** (to the owner and the administrator); a stored preview
  (`201`, expires in 30 minutes) then `approveRelease` naming it: **`403 STEP_UP_REQUIRED`, then `201`**; after, the owner's
  `getApproval` is `200` with `decidedByName` (*"Test Operator"*), `decidedAt`, `reason`. **After launch a README-only
  release is self-serve**: `admin-approval` met, `ready: true`, and `getApproval` `404`, so *"Nothing in this version
  needs a sign-off."* is keyed on met with no approval.
- **M7, our mock** (before 7100, as it is ours): FE-40 confirmed point by point, and **`/auth/step-up` is `404` in the
  mock**; recorded in FE-40.
- **Rich decided** (the plan's *Decided by Rich*): the administrator scripted, the grant the platform session's; **FE-42
  (c)**; **FE-41 carried**. Both carried to `manifest-c3` the same evening, **PROPOSED on its side** until Rich confirms
  them to a platform session.
- **Rulings** (the ledger): M7 measured before 7100 was free; the app made from Node and filled with the platform's own
  starter when our page could not make it (the measurements need a launchable app, not our round, which sitting 6
  walks); the dry run measured as the administrator once the owner was refused.
- **Gates:** no product code changed in this sitting beyond Step 0's `35102dc` (its gates: typecheck, lint, format, 1249
  tests, twice with `84d485a`'s run). `pgrep -fl vitest` empty at the start and the close.
- **What 7100 holds at our close:** `f5-reading`, **launched** (production, staging and the draft healthy), its IAM and
  PIA records and an approval; `operator` an administrator. All of it disposable at the platform's next truncation (told
  to `manifest-c3`); **the repository `Manifest-local-dev/f5-reading` stays on GitHub, and removing it is Rich's**.
- **Next: sitting 2** (Task 2, every model call streams), which needs no platform: its deadlines are set.

### 2026-09-30 — Sitting 2: every model call streams (session `manifest-app-e2`)

*No platform: 7100 was `manifest-a1`'s throughout (the launch path's sitting 4, FE-41 first), and our server stayed in mock
mode. Rich asked this session to introduce itself to the other agents, take the next sitting, and pass the baton to
`manifest-app-58` at its close. The ledger has every ruling and control.*

- **Step 0.** manifest at `1af171b` (documents only since `84d485a`: Spec action 6 decided for its sitting 4); contract
  **1.5.0, 66 operations**: nothing to adopt. `pgrep -fl vitest` empty at the start and the close.
- **Task 2, `2009fba`:**
  - `model/stream.ts` (new, pure) reads the gateway's server-sent events by hand: each chunk's words, its model (the
    alias) and the last chunk's usage; `[DONE]` ends it. An `error` chunk, a payload that is not JSON, or **a body that
    ends before `[DONE]`** is `MODEL_UNREACHABLE` (a ruling: parsing a cut answer would re-ask and re-pay by the schema's
    retry).
  - `model/client.ts` asks with `stream: true` and `include_usage`, and holds **three deadlines**: a round's
    `ROUND_DEADLINES` (120 s / 30 s / 15 min), the intake's and the plan's `ASKING_DEADLINES` (60 s / 30 s / 3 min), each
    passed by its use (`app.ts`, `platform/intake.ts`). `MODEL_STALLED` and `MODEL_TOO_LONG` abort the request (the body
    is piped through with the signal, and the reviewer saw real undici close the connection at the deadline) and **are
    never asked again by the client**. `Answered` and `ModelError` carry `received: { chars, firstWordMs, ms }`, never
    the text. `ROUND_MODEL_TIMEOUT_MS` and `timeoutMs` are gone.
  - **The round:** a stall is `needs: { kind: 'stalled', why: 'quiet' | 'ceiling' }`, with a reference; *Carry on*
    re-asks in the same session, as from unreachable. The round's own model wrapper writes a stall's trace entry
    (`received`, `stalled`; `answered`, `fallback` and `usage` null) and reads the cost again, since a cut stream is billed
    (S1: M2). An answer's entry gains `received`.
  - **The page:** each stall's card in Rich's words with **[Carry on]** and **[Stop here]** (tone: needs you); the intake's
    and the plan's notices say **each stall's own sentence** with their *Try again* (a ruling: the words table's "the
    same first sentence" read as each stall's, since each is true only of its own). **M10:** the needs switch ends in a
    `never` check, and a kind it does not know draws our generic card with Carry on and Stop here, and the reference our
    server recorded, or one of ours reported once as `NEEDS_NOT_DRAWN`.
- **Negative controls** (each red, each restored): a 5-minute ceiling (the old total) → the six-minute answer red; the
  quiet timer removed → the mid-answer stall red; usage not read → the round's trace test red; the text kept in
  `received` → the sentinel scan red; `case 'stalled'` removed → typecheck red (the `never` check) and its cards red;
  the default removed → the two M10 tests red (typecheck stays green: the switch is still exhaustive, so M10's control
  is two controls); the stall's cost read removed → its test red. **My own first "total deadline" control stayed green:
  the mutation was wrong** (a 5-minute first-word timer is replaced at the first word), and the ceiling was the right one.
- **The final review** (a fresh reviewer, the whole range): no Critical; **one Important, fixed (`f6b09af`)**: a model
  that streams its reasoning before its first word was cut at the first-word deadline and said as *"stopped answering"*,
  and *Carry on* would have met the same. A reasoning delta now counts as arriving, never as the answer (Decision 14,
  **(S2)**; two tests red first, and their control). **Nine Minors deferred** (the ledger): a non-2xx whose body stalls is
  said as a stall; a mid-stream `MODEL_UNREACHABLE` is billed but untraced; the stall's cost read comes before the
  spend settles, so the line shows the old figure until *Carry on*; a bodiless 2xx waits out the first-word deadline;
  `"error": null` read as an error; `fetch` taken when the model is made; ORIENTATION's code map (fixed at this close);
  old trace rows lack `received`; `chars` counts UTF-16 units.
- **For sitting 6's acceptance (a ruling):** measure the on-campus lead's first word on a late round's prompt. The 120 s
  rests on 56.8 s for a 4.3k-token prompt, and the lead's prompt grows through a round; a model that processes a long
  prompt sends nothing, reasoning or words, until it is done.
- **Not done:** Step 5 (one round's call against the real gateway): 7100 was the platform's sitting 4's, which
  truncates it, and it needed Rich's word. S1's M2 measured streaming on 7106 already; **the client's first real stream
  is sitting 6's**. No browser walk: mock mode cannot stall (its model answers at once), and the stall card is the same
  card as its siblings, drawn by the table test. **A harness bug of mine sent two requests to the real LiteLLM on 7106**
  with made-up keys (`sk-test-round`, `sk-test-plan`), both refused: the round's model was made before `fetch` was
  stubbed; fixed in the test.
- **Gates:** `pnpm test` 1284 twice (1249 at the start), `pnpm lint`, `pnpm typecheck`, `pnpm format:check` clean;
  **`check-seeing.sh` 8/8, `check-slice.sh` 8/8, `check-describing.sh` 18/18, `check-building.sh` 12/12** in mock mode,
  from a fresh dev database (the old one kept as `packages/server/.data/app-before-f5s2.sqlite`); a mock-mode round's
  trace rows carry `received`.
- **The machine at the close:** our server on 7105 in mock mode (`nohup pnpm dev:mock`, one watcher, on the fresh
  database), our mock on 7102; 7100 `manifest-a1`'s.
- **Next: sitting 3** (Tasks 4, 5, 6: `ClockItem` and `ProgressBar`'s clock; the app's pages; *Going live*), which needs
  no platform, handed to `manifest-app-58`.
