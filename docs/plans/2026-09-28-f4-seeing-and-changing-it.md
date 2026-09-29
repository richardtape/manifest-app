# F4 — Seeing and Changing It: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task,
> as ONE agent (Rich, 2026-09-28: *"native as F3"*), one sitting per session. Steps use checkbox (`- [ ]`) syntax for
> tracking. **Read [`../ORIENTATION.md`](../ORIENTATION.md) first. F3 is executed; this plan starts from it.**

**Status: approved by Rich, 2026-09-28:** *"approved, native as F3, and send FE-35 now"*. Written with him in one
session (`manifest-app-bb`). It is executed by one agent, natively (superpowers:executing-plans), one sitting per
session, with the whole-branch review by one fresh reviewer at the end (Task 11). **Sitting 1 (the measurements) is
done** (2026-09-28, in the same session at Rich's word), and Tasks 2–11 are corrected to what it measured: each
correction is marked **(S1)**. Nothing is built yet. The design
was approved by Rich in conversation, in four sections, and is recorded below in *Decided by Rich* and *Decisions this
plan makes*. Sitting 1 measures before anything is built, and corrects Tasks 2–11 to what it finds. **FE-35 was sent
to the platform session (`manifest-7c`) at Rich's word the same evening.**

**Goal:** A faculty member sees their app as pretend people on the draft address, asks for a change that is agreed and
then built as its own conversation (one conversation per app at a time, the others waiting their turn), and puts a
version they like on the trying-out address. Walk-through moments 7, 8 and 9.

**Architecture:**
- **The app's own pages** (`screens/preview/`, `screens/change/`): the Preview's three tabs, read in the browser on the
  person's session; the app's conversations; *Ask for a change*. The rail gains the project's section.
- **The line** (`build/line.ts`): which conversation holds an app, which wait, in order; the next one starts by
  itself when the app is freed. Kept in our store, so it outlives a restart.
- **The change's plan** (`agents/change.ts`, through F2's plan routes): *"Here's what we'd change"*, agreed, then
  committed into `docs/plan.md` with a *Changes* list, then F3's round.
- **The round on an app that exists** (`build/round.ts`, `agents/lead.ts`, `build/moves.ts`): the lead reads
  `docs/plan.md` from the tree and the agreed change, and may not rewrite a file it has not read.
- **Trying-out** (`screens/trying-out/`): the person's own session deploys the release the draft is serving to staging,
  in the browser, and watches four stations. Our server never deploys anywhere but the sandbox.

**Tech Stack:**
- F3's: TypeScript 5, Node 24, Fastify 5, React 19, Vite, Vitest 2.1.9, `zod` 3.25.76 through `zod/v4`, `node:sqlite`.
- **No new dependency.**

**Spec:**
- [`../walkthrough.md`](../walkthrough.md): moments 7, 8 and 9, with D5, D6 and D8; moment 6 as F3 built it;
- [`../agents.md`](../agents.md): the roster, and rules 1–5;
- [`../api-findings.md`](../api-findings.md): FE-3, FE-6, FE-13, FE-24, FE-35, FE-36, FE-37;
- manifest's `docs/api/frontend.md`, `launching.md`, `journey.md`, `agents.md` and `openapi.json` 1.4.0 (66 operations,
  127 codes): read-only, as ever;
- spec §9 (*Staging: a registration with UBC's staging IdP*) and §21: on the laptop, staging keeps the Manifest IdP's
  fake sign-in;
- **the design Rich approved in conversation on 2026-09-28, in four sections** (the app's pages; a change; trying-out;
  his F3 decisions, the measurements and the acceptance).

---

## How this plan is executed: sittings, one per session

| Sitting | Tasks | Delivers | Status |
|---|---|---|---|
| 1 | 1 | **The measurements.** The contract at the platform's sitting 11 close; our mock's environments and a staging deploy; **one staging deploy on 7100** from the test user's session (at Rich's word, after telling the platform session); the draft's sign-in as pretend people in a real browser; the change planner and the lead's first moves on a built app, on the capable model; FE-35 once the platform has carried it. **Alone, and first** | **done 2026-09-28**, in the planning session (`manifest-app-bb`) at Rich's word, in the platform's window on 7100 (22:16–22:38). M6 waits on the platform's sitting 11a (the dated entry below) |
| 2 | 2, 3, 4 | `SegmentedControl` and `Timeline`, ported with parity; Rich's four F3 decisions on the building screen; names people read | **done 2026-09-28**, in session `manifest-app-07`, no platform: `e394339`, `4ec3ca6`, `f3c1d45`; 916 tests (the dated entry below) |
| 3 | 5 | The app's own pages: the routes, the rail's project section, the Preview's three tabs, *Try it as*, the two facts | **done 2026-09-28**, in session `manifest-app-07` after sitting 2, at Rich's word, no platform: `1ac8647`; 974 tests; FE-38 filed (the dated entry below) |
| 4 | 6, 7 | Conversations on an app, and the line; the change's plan, agreed and committed | not started |
| 5 | 8, 9 | The lead on an app that exists; moment 8's screens | not started |
| 6 | 10 | Trying-out: the button, the question, the deploy from the session, the four stations, the two failures | not started |
| 7 | 11 | **The acceptance:** `scripts/check-seeing.sh` against the mock; headless Chrome on the real platform; Rich's click. **Alone, and last** | not started |

**Every sitting ends as F3's did:**
1. the four gates, `pnpm test` twice; and, when it touched our server, `check-slice.sh`, `check-describing.sh` and
   `check-building.sh` in mock mode (from sitting 7, `check-seeing.sh` too);
2. a dated entry in *What executing this plan found*;
3. this table;
4. ORIENTATION's *Where things stand*, replaced, and the roadmap.

## Decided by Rich: build them, do not re-open them

- **From the walk-through** (2026-09-27): the three addresses are three worlds; the draft shows the pretend people's
  logins, passwords included (FE-3 (a)); staging is UBC's real staging world, registered by UBC IAM after a review
  with a wait (FE-24); on the laptop, staging keeps the fake sign-in; **one conversation works on an app at a time,
  and the others wait in line**; a version is only ever *"the version from <when>"*.
- **Staging: the laptop's only** (2026-09-28). F4 builds moment 9 whole, and deploys only to the laptop's staging,
  which signs people in with Manifest's own pretend IdP and registers itself (spec §21). Nothing reaches UBC. Sitting 1
  measures one staging deploy on 7100 with the test user, at Rich's word and after telling the platform session.
- **Trying out says UBC's words, everywhere, the laptop included** (2026-09-28). Never the pretend logins on that tab,
  never a date, never *"We asked…"*. Rich's words replace *"That takes weeks"*:

  > *"Trying out uses UBC's real staging sign-in, so UBC's identity team registers it first. That takes some time, as
  > several teams at UBC help make sure the app and its data are kept safe and secure. Meanwhile, your draft is ready to
  > try now."*
- **FE-35 is carried to the platform** (2026-09-28, option (a)): a model that can write an app, approved for
  confidential data, listed for a confidential project's sessions. On the laptop it is manifest's LiteLLM config, and
  a model already on the machine (`qwen3.6:35b-a3b`, 22.6 GB, or `qwen3.8:27b`, 17.7 GB, both in the laptop's Ollama,
  read 2026-09-28). **It is the platform's change, not ours.** F4 keeps F3's rule meanwhile: carry on, and say so once.
- **FE-35 and FE-36, decided by Rich with the platform session the same evening** (Spec action 10, manifest
  `d9a1fa1`, committed under his name, quoting him: *"It's okay to use the larger models to BUILD the app, but if the
  app needs AI, then we should switch to use the on-prem model for the AI within the created app … Can we perhaps make
  this a setting?"*). It supersedes the relayed FE-35 above. **Built by the platform's sitting 11a, before its
  acceptance; not landed at sitting 1's close.** What it will mean for us (the platform session's summary, to be
  re-measured when it lands):
  - a platform setting, **by default allowing the capable model on a confidential project's agent sessions**
    (`default-chat-large` beside the on-premise names). On the laptop the on-premise names move to `qwen3.8:27b`;
  - **the app's own AI stays on-premise** for a confidential app (`ai.models: [default-chat-onprem]`), as validation
    and deploy already enforce;
  - **FE-36:** a session holding more than its project now allows is ended, its key revoked, perhaps with a new end
    reason (`classification_raised`);
  - **the safeguard:** while the capable model is allowed, **a delegated token on a confidential project is refused
    staging's and production's `listIncidents`** by a code of its own (`INCIDENT_LOG_CONFIDENTIAL`, name to be ruled).
    A person's session still reads them; the sandbox's stay readable.
- **His F3 decisions** (2026-09-28, each his recommended option):
  - **the line under each step after the pages is ours**, one per step, from `words.ts`;
  - **a Stop he chose is still, not red**: the step goes back to not started, and the chip reads *"Stopped. Nothing is
    lost."* in the not-yet tone, with **[Carry on]**;
  - ***What changed* is one account per round**, from the lead's `done`; each commit's own account moves behind the
    disclosure, next to the files;
  - **the names offered read as names** (*"Reading responses"*): folded into F4 (Task 4).
- **A change is agreed before it is built** (2026-09-28, overriding our recommendation to build straight away): *"Here's
  what we'd change"*, moment 5's pattern, then *Yes*, which updates `docs/plan.md`, then the round. D6 stands: the plan
  is the agreement, versioned with the code, read by every agent that works on the app.
- **The design, approved in four sections** (2026-09-28): the app's pages (moment 7); a change as its own conversation,
  the line, the change's plan, the round on an app that exists (moment 8); trying-out (moment 9); his F3 decisions,
  sitting 1's measurements, the sittings and the acceptance.

### Words proposed for Rich

*The walk-through's words are the design. These are the sentences it does not settle. Those marked ✓ Rich approved in
the design; the rest were ours, and he approved them with the plan (2026-09-28). They stay his to change at his click.*

| Where | Words |
|---|---|
| Step lines after the pages ✓ | *"Building it. This usually takes under a minute."* · *"Putting it on your draft address. Under a minute and a half."* · *"Opening it, and starting a sign-in, to check it answers."* |
| The step line for *Checking it holds together* | *"Checking that everything it needs is there."* |
| *Try it as*, on the laptop **(S1: M4)** ✓ | *"On this laptop, Sign in takes you straight in as yourself. To try it as a student, use Sign out inside the app first, then sign in as the student."* (the walk-through's *"If it opens as you…"*, corrected to what M4 measured: opening signs no one in; **signing in** does, as the Manifest person). **Approved by Rich at sitting 2's start** (*"Use it as written"*, 2026-09-28) |
| The waiting conversation | **[Leave the line]**, which sets the change aside |
| A Stop they chose ✓ | chip *"Stopped. Nothing is lost."*; under it, ours (sitting 2), so the card does not repeat the chip: *"Your draft address keeps whatever was last put there."* with **[Carry on]** |
| The line ✓ | *"Waiting for 'Word count' to finish. It starts by itself."* (walk-through), and *"…which is waiting for you."* |
| The change's plan ✓ | *"Here's what we'd change"* · **[Yes, change it]** |
| The change's plan | *"Everything else stays as we agreed."* under the changed parts · **[Not now]**, which sets the change aside: *"Set aside. Nothing was changed."* |
| Ask for a change | heading *"What should change?"* · *"Say it the way you'd say it to a colleague. We'll show you what we'd change before we change anything."* · **[Ask for it]** |
| The app's conversations | heading *"Conversations"* · *"Every piece of work on <name>, and where each one left it."* |
| The two facts | *"Serving right now: the version from 28 September, 3:12pm."* · *"Nothing there yet. It appears when the first build is done."* (walk-through) · *"Last attempt: the same version. It's the one answering."* · *"Last attempt: didn't start, 4 minutes ago. Nobody lost anything."* (walk-through) · *"Last attempt: under way, started a moment ago."* |
| Trying-out's end ✓ | *"It's on the trying-out address. Nobody can sign in there until UBC's identity team has registered it. That takes some time, as several teams at UBC help make sure the app and its data are kept safe and secure."* |
| Trying-out, already there | *"This version is already on the trying-out address."* |
| The question | walk-through's, plus **[Not now]** |
| The stations | the prototype's: *Waiting its turn* (*"In the queue behind anything else going out"*) · *Making room* (*"Somewhere to run, and a place to keep things"*) · *Starting up* (*"Your app is running its first few seconds"*) · *Answering* (*"It replied to us, so it will reply to people"*); on failure *It never answered* (*"It started, then stopped replying to us"*) |
| A secret with no value there | walk-through's *"It needs <its plain name> before it can start there."* · **[Set it]**; when we never asked for it by name: *"It needs a setting we asked you for on your draft, before it can start there."* |
| A fix conversation's title | *"It didn't start on the trying-out address"* |

## Decisions this plan makes, and why

1. **The app's own pages.**
   - `/apps/:slug` is the **Preview**; `/apps/:slug/conversations` the app's conversations; `/apps/:slug/change` *Ask
     for a change*; `/apps/:slug/conversations/:id` a conversation on the app, drawn by the same screen as `/new/:id`.
     F1's *Your apps* cards already link to `/apps/:slug`.
   - **The rail's project section** (`SideNav`'s `projectName` and `items`) shows **Preview** and **Conversations**, on
     each of those routes and on `/new/:id` once its project exists.
   - *Rejected:* the prototype's six items now, which puts four dead links on screen; an Overview now, which is
     moment 16's (F6). *Changing course:* one item each.
2. **The Preview reads in the browser, on the person's session**, through `src/platform` alone: `listProjects` (the
   slug to the project), `listEnvironments` (each address and its `instance`), `getRelease` (a version's date),
   `listInstances` (the last attempt, when it is not the serving one) and `listIncidents` (when it failed).
   - *Serving right now* is the environment's own `instance` (F1's rule: *"the instance the hostname reaches"*), and
     never `listInstances`' first entry, which is the last attempt.
   - *Rejected:* our server reading with a conversation's token. The Preview is the person's own view, and an app may
     have no token alive. *Changing course:* one route of ours.
3. **The pretend people are ours** (FE-3), a module of the web package (`ours/pretend-people.ts`) marked as ours and
   citing FE-3: on the laptop, the local IdP's `student`/`student` and `instructor`/`instructor` (read 2026-09-28,
   `infra/idp/config/authsources.php`). They are drawn on the draft tab only. *Rejected:* a server setting served to the
   page, which is more moving parts for two constants. *Changing course:* when the platform publishes them (FE-3 (a)),
   one module becomes one read.
4. **Trying out's state.** The tab is **waiting on someone**, its owner named (*UBC's identity team*), still, **with no
   number**, because nothing records when the registration began (FE-6, FE-24). `20-states.md` pairs stillness with a
   number; here there is none to show, and inventing one is the drift the design exists to avoid.
5. **The line: one conversation holds an app at a time** (Rich's rule; `build/line.ts`).
   - **A conversation holds its app** from the moment it reaches the front until its latest piece of work is **built**,
     **stopped** or **set aside**. That includes planning, waiting for *Yes*, a round's question, a checkpoint and an
     interruption. The first conversation holds its app from *Make it* (`making`), so a change asked while the first
     build is still being planned waits for it.
   - **The holder is derived, never stored**: `holder(projectId)` applies `holds` to the app's conversations, so only
     the waiting order is kept.
   - *Rejected:* releasing the app while a conversation waits on the person. Its half-made change would sit under the
     next one's version, and *"this version, not whatever comes next"* would break.
   - **Waiting** is a conversation state, `waiting`, with `waiting_since` for the order. The oldest waits first.
   - **When the holder is released**, the next starts by itself: a change to plan, a fix to build, or a stopped round
     *Carry on* joined the line with. Without a token (a restart forgot it), it moves on and waits for the page to hand
     one over (F2's `409 TOKEN_MISSING`).
   - **At boot**, every app with a waiting conversation and no holder starts its next.
   - *Changing course:* the rule lives in one function, `holds(conversation, run)`.
6. **Where a change starts, and what it is.**
   - **A new conversation on the app**: *[Ask for a change]* posts their words **with a token the browser has just
     minted** for it (`Changing — <their words, cut>`), in one request. Our server checks the token as F2 does
     (`getProject` answers that project) before it trusts the project, so no project id is taken on the page's word.
   - **A built conversation's message box** asks for the next change in the same conversation (`/messages` in `built`).
     F3's *"Asking for a change arrives next."* goes.
   - **A waiting conversation's messages** join what was asked, and the planner reads them all.
   - Each change is one `asked` message: `{ kind: 'asked', change, words, fix }`. The conversation's pieces are folded
     from them (`api/piece-state.ts`), as F2 folds the intake.
   - **A fix** is a change with no agreement: *[What went wrong]* on a failed trying-out attempt makes a conversation
     whose words are ours, carrying the incident's id. The plan does not change, so there is nothing to agree.
   - **The title** is their words cut at a word, until the change's plan answers its own (*"Word count"*).
7. **The change's plan** (Rich: agree the change first).
   - **The planner** (`agents/change.ts`) runs on the conversation's own agent session, which the person pays for, as
     F2's plan does, and ends it when the plan is written (F2: a session never outlives its step).
   - **It is given** `docs/plan.md` from the app's tree, what was asked, and a correction if there is one. It answers
     F2's `Plan` whole, plus a `title`. **The parts it changed are ours to mark**, by comparing each row with the plan it
     was given, word for word, as F2's correction does. *"Keep every other part word for word"* is in its prompt.
   - **`docs/plan.md` is read back** by `readPlanMarkdown`, the inverse of F2's `planMarkdown`, held by a round-trip test.
     A file someone edited by hand that no longer reads back is given to the planner as text, and every part it writes
     is marked changed: said, not hidden.
   - **(S1: M5) Answered questions are settled, never asked again.** On the capable model the planner parsed 5 of 5
     (5–10 s), titled each *"Word count"*, changed exactly the two parts the change needed and kept the other three
     word for word; a correction narrowed it to one. **But it copied the plan's answered questions back as new ones,
     answers and all** (*"Who is my class?\nIt closes at the deadline."*). So `readPlanMarkdown` returns the questions
     and their answers apart from the parts; the planner is given them as settled, and its `onlyYouKnow` asks only
     about the change. Its check refuses a question holding a line break, or repeating one already answered. The
     agreement's answered questions are carried into the new `docs/plan.md` unchanged, and the change's own are added.
   - **The screen is F2's plan screen in change mode**: the changed parts, *"Everything else stays as we agreed."*, at
     most two questions only they can answer, **[Yes, change it]**, the correction box, and **[Not now]**.
   - ***Yes*** commits `docs/plan.md`: the agreement as it now stands, plus `## Changes since we first agreed`, each change
     dated, in their own words. Then round *n+1* starts, in the same run of work (F3 Decision 11's reason: a page closed
     right after *Yes* still gets its change).
   - **F2's routes carry it**: `/plan`, `/plan/correction` and `/plan/agree` dispatch on the conversation's current piece.
     *Rejected:* new routes, which duplicate F2's busy checks, token handling and agreement shape.
8. **The round reads `docs/plan.md` from the tree, for every round**, instead of the store's plan. F2 committed it, so
   round 1 reads the same text it always did (a test holds that). It falls back to the store's plan when the file cannot
   be read.
9. **The lead on an app that exists.**
   - **Its view gains `change`** (the agreed change: what was asked, and the parts that changed) **and `fix`** (the
     incident's `exitReason`, `failedCheck`, `logTail`, `prompt` and `diffSinceHealthy`, as F3 Decision 8 gives a draft
     failure).
   - **(S1: Spec action 10) A confidential app's staging incident may be refused to our token**
     (`INCIDENT_LOG_CONFIDENTIAL`, once the platform's sitting 11a lands). Then the fix's view carries **no** incident,
     only that it did not start on the trying-out address and that we cannot read why there. **The person's own reading
     of it is never handed to our server or a model**: that would undo the platform's safeguard. The person still sees
     the platform's words behind *"The exact words, for whoever you ask for help"*, read by their session.
   - **(S1: M5) Measured on the capable model:** with the change paragraph, the lead's first move read the files it
     would change, 5 times of 5 (1.2–2.1 s), and its commit kept 97–100% of each file's lines. `unread` stays as the
     net under that, for a smaller model or a longer round.
   - **(S1: Spec action 10) A confidential app's own AI is on-premise**: the lead's prompt says so
     (`ai.models: [default-chat-onprem]`), and the platform's refusal of anything else is one it can answer.
   - **Its prompt gains one paragraph**: it is changing an app that already works; it reads a file before it rewrites
     it; it changes only what the agreed change needs.
   - **A new guard, `unread`**: a write to a path that exists in the tree is refused unless the lead read it at the
     tree's current commit, wrote it itself this round, or is committing the specialist's proposal for it exactly as
     proposed. A new file needs no read. *Why:* the lead writes whole files, and a file it never saw would be replaced by
     its guess.
   - **Its `done` gains `account`**, one sentence for the round (Rich). The round's *What changed* is that sentence; each
     commit's own account goes into the disclosure, above its files.
10. **A message during a round stays as moment 6 has it** (the lead reads it at its next move). **After the lead's
    `done`**, if it read any, our server adds each to `docs/plan.md`'s *Changes* in their own words, in one commit with
    its own dry run and no model, before *Checking it holds together*. So the file stays the agreement, and the build
    holds it.
11. **Trying-out is the person's, in the browser.**
    - **The version is fixed when they are asked**: the question names the release the sandbox's serving instance runs,
      read when they press *[Put this version on trying-out]*, and *[Put it there]* deploys exactly that `releaseId`,
      even if a round finishes in between. The same release, never a rebuild (§13).
    - **`deploy` from the session**, to the staging environment, with an `Idempotency-Key` and a 120 s deadline (F3
      Decision 17's reason). If staging asks them to sign in again (`STEP_UP_REQUIRED`, measured in M3), F2's step-up
      pattern returns them to the question.
    - **The stations tick on the new instance's own state**, read by `listInstances` on staging every 2 s while the deploy
      runs: `pending` → *Waiting its turn*; `provisioning` or `building` → *Making room*; `starting` or `waking` →
      *Starting up*; `healthy` → *Answering*; `failed` → *It never answered*. The new instance is the newest whose id is
      not the one serving at the press. **M3 measures whether an instance is listed while the deploy runs.** If none is,
      the page subscribes to the project's events on its session (`watchProject`, which F1's platform layer has), and M3
      measures that too.
    - **They may leave.** M3 measures whether a deploy carries on when its page closes. The Preview reads what is true
      when they come back.
    - *Rejected:* our server deploying with a conversation's token. The walk-through wants the record to say who chose
      this version, and F3's constraint that we never touch staging stands, with its test.
    - **(S1: M3, measured on the real platform)**:
      - a staging deploy from the session answered `200 healthy` in 5–9 s, and **asked no step-up** (staging is
        `release:deploy`; production alone steps up). The step-up branch stays as a guard, never expected;
      - `listInstances` **lists the new instance while the deploy runs** (`provisioning` at 1 s, `starting` at 3 s,
        `healthy` at 6–9 s; `pending` never seen). **Poll every second**, not two: a deploy is 5–9 s;
      - **its order is "seen most recently", not newest made**: the new instance was listed second while it started.
        **The new instance is the one whose id was not listed at the press**, never a position;
      - **the end is `deploy`'s own answer**: under `MANIFEST_MOCK_FAIL` the mock answers the *serving* instance's id
        as `failed` while listing it healthy (M2);
      - the page's own event socket works too (`instance.*`, and `sso.registered` for staging), and carries every
        environment's events, so it would match by `machineDetail.instanceId`. Polling stays: no new subscription;
      - **a deploy whose page closes carries on** (aborted at 3 s, healthy at 5 s): *they may leave* is true;
      - **the same release deployed again makes a new instance**: the platform never says *"already there"*, so it is
        ours, by comparing staging's serving release with the draft's before asking.
12. **Rich's F3 decisions, as built:**
    - the step lines are the page's, from `words.ts`, for `holds`, `build`, `draft` and `answers`; the lead's `line` stays
      under *Writing the pages*;
    - a stopped round's step folds `next`, not `halted`; the chip is `notyet`, still. `halted` stays for what went wrong;
    - *What changed* is `done`'s `account` (Decision 9);
    - **a conflict is not a try on the pages**: `steps.pages.tries` is `0`, and three conflicts are still `needs:
      conflict` (moment 8: *"the person sees nothing unless it happens three times"*).
13. **Names people read** (Rich). Our dev database shows what the real intake model offered in F3's walks, read
    2026-09-28: `reading-responses`, `Course-questions`, `class-responses`, `Reading-responses` as **names**. The mock
    offers proper names, so no test saw it.
    - The model writes **names only**. **Our code makes each address** (`slugOf(name)`: lower case, spaces and
      punctuation to single hyphens, trimmed to 39, starting with a letter), and the browser checks it as now.
    - The names' check refuses a name that reads like an address (lower-case words joined by hyphens, or a hyphen between
      two words), so the model is asked again.
14. **The store's version 4**: `conversations.state` gains `waiting` and `set-aside` (SQLite's twelve steps, reading the
    table's definition from `schema.sql`, as F3's version 2 did), and `conversations.waiting_since`.
15. **A staging secret's value never reaches our server.** The page sets it with `setAppSecret` on the staging
    environment, from the session (**S1: M3, `200` with no step-up**). **(S1: M1, M3) Which names are missing comes from
    `listAppSecrets(staging)`, `declared && !set`**: `RELEASE_SECRET_NOT_SET` names them only in its message, which also
    holds machinery (`PUT /v1/environments/<id>/secrets/{name}`), so it is never read or shown (FE-29's shape). Its plain name is the question the lead asked when it set the draft's value (our
    `questions` table, by `secret`), read through `GET /api/apps/:projectId/secrets`, which answers names and questions,
    never a value.

## Global Constraints

- Everything in F1's, F2's and F3's *Global Constraints*, which stand: no token or key reaches a model; nothing
  persisted is a credential; **our server and the lead never deploy anywhere but the sandbox**, and never read any
  output but the sandbox's; no dependency is added to the app; a step ticks only on its own signal; never *"It works"*;
  no infrastructure words (C3); every problem shown carries a support reference.
- **Only the person's session deploys to staging, in the browser, and only the release the draft is serving at the
  question** (Decision 11). A test asserts the `releaseId` sent (Task 10), and `check-seeing.sh` asserts our server's
  trace names no staging or production (Task 11).
- **One conversation holds an app at a time** (Rich). A test drives two changes asked at once (Task 6).
- **A change is agreed before it is built, and `docs/plan.md` holds it before the round starts** (Rich). A test holds
  the commit's order (Task 7).
- **The pretend logins are drawn on the draft tab only**, never on *Trying out* or *For your students* (Rich). A test
  (Task 5).
- **Trying out never says a date, *"We asked…"*, or *"weeks"*** (Rich). A test (Tasks 5 and 10).
- **A staging secret's value is sent from the browser to the platform and nowhere else** (Decision 15). A test (Task 10).
- **Five states only; *we*, everywhere.** `machineryIn(text())` is empty on every new screen, closed disclosures
  excluded (Tasks 5, 9 and 10).

## Review Focus

1. **Two changes at once on one app:** two *Ask for a change* presses in the same second; a built conversation's
   message while another holds the app; *Stop* releasing it; *Carry on* after a *Stop* while another holds it. Exactly
   one plans or builds, the rest wait in order, and the next starts by itself. **Pinned in Task 6.**
2. **The wrong version on trying-out:** a round finishes between the question and *[Put it there]*, or the draft is
   serving nothing, or a failed instance is newest. The release deployed is the one the question named, and a draft
   serving nothing offers no button. **Pinned in Task 10.**
3. **The lead overwrites a file it never read:** a change round whose first move writes `server.js` whole. Refused, with
   *"read it first"*, and the next move reads it. **Pinned in Task 8.**
4. **Honest words:** the pretend logins on *Trying out*, a date or *"We asked"* there, *"It works"* anywhere, a
   stopped round in red, a slug offered as a name. **Pinned in Tasks 3, 4, 5 and 10.**
5. **Restarts and closed pages:** our server restarts while a change is being planned, while a round works, or with
   conversations waiting; the page closes mid-deploy. The line is rebuilt from the store, the planner can be carried on,
   and the Preview reads the attempt as it is. **Pinned in Tasks 6, 7 and 10.**

---

## File Structure

```
packages/ui/src/
  SegmentedControl.tsx   ported; + arrow keys and aria-controls (ours, tested)                 Task 2
  Timeline.tsx           ported with parity                                                     Task 2
  parity.test.tsx  SegmentedControl.test.tsx  index.ts
packages/server/src/
  api/round-state.ts     stopped folds `next`; pages' tries 0; What changed = done's account     Task 3
  build/moves.ts         done { line, cannot, account }; commit's context gains `known`          Tasks 3, 8
  agents/naming.ts       names only; slugOf; an address-like name refused                        Task 4
  model/walkthrough.ts   mock mode's answers: names, the change planner, a change round          Tasks 4, 7, 8
  store/schema.sql store/migrate.ts store/db.ts   version 4: waiting, set-aside, waiting_since   Task 6
  build/line.ts          the line: holds, join, released, onBoot                                Task 6
  api/piece-state.ts     a conversation's pieces, folded from `asked`                            Task 6
  api/apps.ts            /api/apps/:projectId/… conversations, instance → conversation, secrets  Tasks 6, 10
  api/build.ts           /messages in built and waiting; /stop sets a change aside; carry on joins the line  Task 6
  api/progress.ts        states waiting, set-aside; frame gains `piece` and `line`               Task 6
  agents/change.ts       the change planner                                                      Task 7
  agents/plan.ts         planMarkdown(… changes); readPlanMarkdown                               Task 7
  api/plan.ts            /plan, /plan/correction, /plan/agree dispatch on the piece              Task 7
  build/round.ts         docs/plan.md from the tree; change and fix in the view; Changes after done; released  Task 8
  agents/lead.ts  build/guards.ts   the change paragraph; the `unread` guard                     Task 8
packages/web/src/
  router.ts  app.tsx     the app's routes; the rail's project section                            Task 5
  platform/api.ts        listEnvironments, listInstances, listIncidents, deploy (120 s), setAppSecret  Tasks 5, 10
  ours/api.ts            startChange, conversationsOn, conversationFor, askedSecrets             Tasks 6, 9, 10
  ours/pretend-people.ts FE-3's stand-in, marked ours                                            Task 5
  screens/preview/       preview.tsx  facts.ts  try-it-as.tsx  preview.test.tsx                  Task 5
  screens/change/        ask.tsx  conversations.tsx  waiting.tsx  change.test.tsx               Task 9
  screens/plan/plan.tsx  change mode                                                             Task 9
  screens/building/      step lines, stopped chip, one account (Task 3); the end panel (Task 10); the box after built (Task 9)
  screens/trying-out/    put.tsx  stations.ts  put.test.tsx                                      Task 10
  words.ts
scripts/check-seeing.sh  Task 11, mock mode
```

---

## Task 1: Measure what this plan rests on (sitting 1, alone)

Throwaway code in the scratchpad. Only this plan's findings are committed. **Run nothing in manifest**: read it.
**Before 7100: ask Rich, and tell the platform session** (ORIENTATION §8; its tests truncate 7100 and restart the edge).

- [x] **M1: the contract and the guides, at the platform's sitting 11 close.**
  - Re-read `openapi.json`. Record the commit, the version, the operation count and the code count (1.4.0, 66, 127 at
    `c90f571`, text only). `pnpm typecheck` and `pnpm test` against it.
  - Record the exact shapes of: `listEnvironments`, `getEnvironment`, `deploy` (its codes: `STEP_UP_REQUIRED`,
    `RELEASE_SECRET_NOT_SET`, `TOKEN_ACTION_PENDING`), `listInstances`, `listIncidents`, `listReleases`, `getRelease`,
    `setAppSecret` (staging, from a session).
  - **Does `RELEASE_SECRET_NOT_SET` name the secret** in `details`, or only in its message? If only its message, it is
    FE-29's shape: say so in its entry.
  - Every adapter is written against what M1 records. Where this plan's names differ, the contract wins, and this plan is
    corrected in the same commit.
- [x] **M2: our mock's answers** (`pnpm mock` on 7102, from manifest's source at its current commit):
  - `listEnvironments` of `mock-app`: three environments, each `instance`;
  - `listInstances` of staging; `getRelease` of each instance's `releaseId`; `listIncidents` of the sandbox and staging;
  - `deploy` to staging with `manifest_session=mock-session`: its answer and time;
  - the same with the mock started under `MANIFEST_MOCK_FAIL=1` (a deploy that never becomes ready), then restarted as
    before;
  - `setAppSecret` on staging from the session;
  - `mintToken` and `getProject` for a second conversation's token.

  Record the bodies. The mock keeps no state (its guide), so Task 11's mock half asserts what we sent.
- [x] **M3: one staging deploy on 7100** (Rich's word; the platform session told; the test user `instructor`; a project
  built by our own round, **our server switched to edge mode by ORIENTATION §7's trap, and back to mock mode at the
  close** unless Rich says otherwise):
  - `deploy` to staging **from the browser's session** (headless Chrome through `https://app.manifest.internal`), naming
    the release the sandbox serves. Record: the time; whether it asks to sign in again; `Origin`;
  - **`listInstances` on staging every second while it runs**: is the new instance listed before `deploy` answers, and
    in which states? Record the sequence;
  - **the project's events on the page's own session**: can the page subscribe (`watchProject`)? Record `instance.*` and
    `sso.registered` for staging, with their `machineDetail`;
  - **the request aborted at 3 s** (the page closed): does the instance still come up? Record `listInstances` after 90 s;
  - **a release whose app declares a secret set only in the sandbox**: `RELEASE_SECRET_NOT_SET`'s shape. Then
    `setAppSecret` on staging from the session (step-up or not), and `deploy` again;
  - the laptop's staging address signs in as `student` (the pretend IdP, spec §21). Recorded for us; never shown to faculty
    (Rich).
- [x] **M4: the draft's sign-in, in headless Chrome**, a fresh profile (ORIENTATION §7):
  - signed in to `app.manifest.internal` as `instructor`, open the draft address: **is it signed in as the instructor
    already?** Record the page;
  - **does the app have a *Sign out*?** Press it. Record where it lands, and whether the IdP's session ended (signing in
    again asks for a password);
  - sign in as `student`/`student`: record what the student sees;
  - back on `app.manifest.internal`: **are they still signed in to Manifest?** (`frontend.md`: signing out of a deployed
    app ends the IdP's session and the console's, not ours.)
  - The laptop sentence on *Try it as* (*"If it opens as you, use Sign out inside the app, then sign in as the
    student."*) is kept only if M4 shows each part true. Otherwise Task 5 words what is.
- [x] **M5: a change, on the capable model** (the walk-through app, built by our round on 7100; `default-chat-large`
  if the session lists it; cents):
  - **the change planner, five times**, on *"Also show a word count on each response"*, given `docs/plan.md` from the
    tree (a first draft of Task 7's prompt and schema, in the scratchpad): record how many parse; whether the unchanged
    parts come back word for word (a diff per row); the rows it changed; its title; its questions; time and cost. Then
    once with a correction;
  - **the lead's first two moves, five times**, on a view built by a script from the real tree, with Task 8's change
    paragraph and the agreed change: **does its first move read the files it will change?** Does a commit keep the rest
    of the file? Record each move, verbatim in spirit.
- [ ] **M6: FE-35, once the platform has carried it.** *(S1: not landed; it is now Spec action 10, built by the
  platform's sitting 11a. Moves to the start of sitting 7, or earlier when 11a lands.)* For a `confidential` project: what `session.models` lists, and
  M5's lead moves on that model (parse rate, first moves, time). **If it has not landed by this sitting, record that,
  and M6 moves to the start of sitting 7.**
- [x] **M7: our own code, read for the seams**, each a correction to its task:
  - `work.ts`'s claim, and how the line's start of the next conversation runs inside it;
  - `api/plan.ts`'s `write` and `agree`, and what a change's dispatch must keep (the busy check, `TOKEN_MISSING`,
    `PLAN_CHANGED`);
  - `round.ts`'s `prepare`, where the plan is read, and `end`, where the line must be told;
  - F2's `check-describing.sh` and F3's `check-building.sh`: what a changed `docs/plan.md` or `done` breaks.
- [x] **Close:** the dated entry. **Correct Tasks 2–11 to what M1–M7 found before sitting 2.** Write any new finding as
  the next `FE-n`. Commit the plan and `api-findings.md` only.

---

## Task 2: `SegmentedControl` and `Timeline`, from the design system

**Files:** `ui/src/{SegmentedControl.tsx,Timeline.tsx,SegmentedControl.test.tsx,parity.test.tsx,index.ts}`.

**Read while writing this plan** (the reference bundle, `packages/ui/reference/bundle.js`): `SegmentedControl` is a
`div.mf-seg` of `<button>`s, `role` `tablist` (each `tab`, `aria-selected`) or `radiogroup` (each `radio`,
`aria-checked`), options as strings or `{ value, label }`. `Timeline` is an `ol.mf-timeline` of `li.mf-station`, each with
a rail (two lines and a dot, the dot pulsing when `now`), a label and a note, `aria-current="step"` on `now`. **Our
`components.css` already carries `.mf-seg` and `.mf-station`.** The README asks for arrow keys, which the reference does
not do, so they are ours, with their own tests, as F3's `LiveSteps` additions were.

**Interfaces:**

```tsx
export interface SegmentOption { value: string; label: string; /** Ours: the panel this tab shows. */ controls?: string }
export function SegmentedControl(props: {
  options: (string | SegmentOption)[]; value: string; onChange?: (value: string) => void
  role?: 'tablist' | 'radiogroup'; label?: string; className?: string
}): JSX.Element
export interface Station { label: string; note?: string; state?: 'done' | 'now' | 'next' | 'halted' }
export function Timeline(props: { stations: Station[]; className?: string }): JSX.Element
```

- [x] **Step 1: Tests, failing first:**
  - **parity:** without `controls` and `label`, each renders the reference's markup byte for byte, in `tablist` and
    `radiogroup`, and `Timeline` in each station state, with and without notes;
  - **ours:** ArrowRight and ArrowLeft move the selection and the focus, wrapping; Home and End; only the selected tab is
    in the tab order (`tabIndex` 0, the rest −1); `controls` sets `aria-controls`; `label` sets `aria-label`.
- [x] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** arrow keys not wrapping; every tab in the tab order;
  the `now` dot not pulsing. Each red, restored.
- [x] **Step 5: Commit** `feat(ui): SegmentedControl and Timeline, ported with parity; arrow keys ours`.

## Task 3: Rich's F3 decisions, on the building screen

**Files:** `server/src/api/round-state.ts`, `server/src/build/moves.ts`, `server/src/build/round.ts`,
`server/src/model/walkthrough.ts`, `web/src/screens/building/{work.tsx,model.ts,thread.tsx,building.test.tsx}`,
`web/src/words.ts`, their tests.

**Interfaces:**

```ts
// build/moves.ts: done gains one sentence for the whole round (Rich)
{ kind: 'done'; line: string; cannot: string | null; account: string }        // ACCOUNT, guarded by words()
// runs.detail gains `account: string | null`; RoundView.steps[pages].changed is it
// RoundView.steps[pages].exact: each commit's account, then its files, in order
// round-state.ts: stateOf(run, key) is 'next' for a stopped run's current step; triesOf(run, 'pages') is 0
// web: words.building.stepLine: Record<'holds' | 'build' | 'draft' | 'answers', string>
// web: chipOf(stopped) = { state: 'notyet', label: words.building.chip.stopped, pulse: false }
```

- [x] **Step 1: Tests, failing first:**
  - **server:** a `done` without `account` is refused by the schema; its `account` passes `words()` (machinery refused);
    the folded round's `changed` is `done`'s account, and `exact` lists each commit's account above its files; a
    stopped run's current step folds `next`, and an interrupted one's still `halted`; two conflicts leave
    `pages.tries` `0`, and a third is still `needs: conflict`;
  - **web:** under `build`, `draft` and `answers`, the line is `words.building.stepLine[key]`, never `round.line`; under
    `pages` it is the lead's; a stopped round shows no step in red (no `halted` class) and the chip *"Stopped. Nothing is
    lost."* in the not-yet tone, still; *What changed* shows one sentence; the thread's folded round shows the same one.
- [x] **Step 2: Red. Step 3: Implement**, and mock mode's lead answers `done` with an `account`.
- [x] **Step 4: Green; controls:** the lead's line kept under *Building it*; a stopped step `halted`; the accounts joined
  again; a conflict counted as a try. Each red, restored.
- [x] **Step 5: Commit** `feat(server,web): Rich's F3 decisions — our line per step, a Stop that is still, one account a
  round, a conflict no try until three`.

## Task 4: Names people read

**Files:** `server/src/agents/{naming.ts,naming.test.ts}`, `server/src/model/walkthrough.ts`, `server/src/api/intake.ts`
(where `names` are said), `web/src/screens/name-it/` (only if a shape moves).

**Interfaces:**

```ts
export const Names = z.object({ names: z.array(z.object({ name: z.string().min(1).max(80) })).min(3).max(5) })
/** Ours: the address a name makes. Lower case; runs of anything else to one hyphen; trimmed to 39; a letter first. */
export function slugOf(name: string): string | null
/** What the page is given, as now: each name with its address. */
export type Named = { names: { name: string; slug: string }[] }
```

- [x] **Step 1: Tests, failing first:**
  - `slugOf('Reading responses')` is `reading-responses`; `'Week 3: responses!'` is `week-3-responses`; a name with no
    letter first is `null`; a long one is trimmed to 39 at a hyphen;
  - **the check refuses a name that reads like an address**, on the five real ones from our dev database
    (`reading-responses`, `Course-questions`, `class-responses`, `Reading-responses`, `student-q-and-a`), and takes
    `Reading responses`, `Q&A for the course`;
  - two names that make the same address are refused as *"an address twice"*; a taken address as now;
  - the page's `names` said are `{ name, slug }`, the slug ours.
- [x] **Step 2: Red. Step 3: Implement**, and the prompt: *"A name is words people read, with spaces: 'Reading
  responses'. Never write an address: we make it."*
- [x] **Step 4: Green; controls:** the address-like check removed; the slug taken from the model. Each red, restored.
- [x] **Step 5: Commit** `fix(server): the names we offer read as names — we make each address from it (Rich, F3's
  sitting 7)`.

## Task 5: The app's own pages, and the Preview (moment 7)

**Files:** `web/src/{router.ts,app.tsx,words.ts}`, `web/src/platform/api.ts`, `web/src/ours/pretend-people.ts`,
`web/src/screens/preview/{preview.tsx,facts.ts,try-it-as.tsx,preview.test.tsx,facts.test.ts}`,
`web/src/screens/screens.test.tsx`.

**Interfaces:**

```ts
// router.ts
| { name: 'app-preview'; slug: string; tab: 'draft' | 'trying-out' | 'students' }   // /apps/:slug?tab=…
| { name: 'app-conversations'; slug: string }                                       // /apps/:slug/conversations
| { name: 'app-change'; slug: string }                                              // /apps/:slug/change
| { name: 'conversation'; id: string; slug?: string }                               // /new/:id, /apps/:slug/conversations/:id
// platform/api.ts (the session; the only caller of the platform)
listEnvironments(projectId: string): Promise<Schemas['EnvironmentList']>
listInstances(environmentId: string): Promise<Schemas['InstanceList']>
listIncidents(environmentId: string): Promise<Schemas['IncidentList']>
// ours/pretend-people.ts: OURS, NOT THE PLATFORM'S (FE-3). The laptop's local IdP.
export const PRETEND_PEOPLE: { who: 'student' | 'instructor'; login: string; password: string }[]
// screens/preview/facts.ts: pure
export type Address = { kind: 'sandbox' | 'staging' | 'production'; host: string; url: string }
export function servingFact(env: Schemas['Environment'], release: Schemas['Release'] | undefined, tz?: string): string
export function attemptFact(env: Schemas['Environment'], instances: Schemas['Instance'][],
  incidents: Schemas['Incident'][], now: Date, tz?: string): { words: string; failed: boolean; instanceId: string | null } | null
```

**What it draws** (words to `words.ts`; the walk-through's first, then *Words proposed for Rich*):
- **The rail's project section**: the app's name as the overline, **Preview** and **Conversations**.
- **A switcher**, `SegmentedControl` as a `tablist` with `controls`: *Your draft · Trying out · For your students*.
  Each tab: the address in mono, **[Open it in a new tab]** (`target="_blank"`, `rel="noopener"`), and on the right
  `TwoFacts`: *serving right now*, *the last attempt*.
- ***Your draft***: *"Your draft is a practice copy. Everyone in it is pretend, and so is anything they post."*; the *Try
  it as* card, one row per pretend person, each with its login and password in mono and a copy button; the laptop
  sentence **as M4 corrected it (S1)** (*Words proposed for Rich*: signing in, not opening, takes them in as
  themselves), **approved by Rich at sitting 2's start (S2)**. Nothing there yet: *"Nothing there yet. It appears when the first build is done."* A failed
  last attempt shows its fact here; its **[What went wrong]** is Task 9's, since it needs Task 6's route.
- ***Trying out***: Rich's words; **waiting on someone**, *UBC's identity team*, still, no number (Decision 4). No logins.
- ***For your students***: *"Not live yet. This is the address your students will use."*
- Under the tabs: *"Not right? Tell us what to change."* **[Ask for a change]** → `/apps/:slug/change`.

- [x] **Step 1: Tests, failing first** (`preview.test.tsx`, jsdom, a recording `Platform`; `facts.test.ts`, node):
  - the routes parse, and a malformed slug is `unknown`, never a crash;
  - the rail's project section shows on the app's routes, with the app's name, and on `/new/:id` once its project exists;
  - each tab shows its address and a link that opens a new tab; the switcher is arrow-navigable (Task 2);
  - **serving** is the environment's own `instance` with its release's date; a `failed` newest in `listInstances` does not
    change it (FE-27's rule); nothing deployed is *"Nothing there yet…"*;
  - **the last attempt**: the serving one is *"the same version"*; a newer failed one is *"didn't start, 4 minutes ago"*
    from its incident's time, with *[What went wrong]*; a newer one in progress is *"under way"*;
  - **(S1: M1)** `listEnvironments` answers a bare array; `listInstances` `{ environmentId, instances, truncated }`,
    each `serving`; the fakes answer those shapes;
  - ***Try it as*** is on the draft tab only: **the words `student` and `instructor` with their passwords never appear on
    *Trying out* or *For your students*** (Rich); each copy button copies its value;
  - ***Trying out***: Rich's sentence exactly; **no date, no *"We asked"*, no *"weeks"***; the chip names UBC's identity
    team and carries no number;
  - `machineryIn(text())` is empty (C3), and ***"It works"* appears nowhere**;
  - a refused read shows F1's words with a reference.
- [x] **Step 2: Red. Step 3: Implement.**
- [x] **Step 4: Green; controls:** *Try it as* on every tab; serving read from `listInstances`; a date on *Trying out*;
  the rail's section on *Your apps*. Each red, restored.
- [x] **Step 5: Walk it in headless Chrome against the mock, at 1440 and 375** (ORIENTATION §7's way): each tab, the copy
  buttons, *Ask for a change*. No console error, no failed request, no overflow.
- [x] **Step 6: Commit** `feat(web): moment 7 — the app's own pages: the Preview's three tabs, the pretend people on the
  draft, UBC's words on trying out, the two facts`.

## Task 6: Conversations on an app, and the line

**Files:** `server/src/store/{schema.sql,migrate.ts,db.ts,conversations.ts,db.test.ts}`,
`server/src/build/{line.ts,line.test.ts}`, `server/src/api/{piece-state.ts,apps.ts,apps.test.ts,build.ts,build.test.ts,progress.ts,events.ts}`,
`server/src/app.ts`, `web/src/ours/api.ts`.

**Interfaces:**

```ts
// store, version 4
export type ConversationState = /* F3's */ | 'waiting' | 'set-aside'
createChange(personId: string, projectId: string, title: string): Conversation     // state 'planning' or 'waiting', set by the line
listConversationsOn(projectId: string, personId: string): Conversation[]           // newest first
waitingOn(projectId: string): Conversation[]                                       // by waiting_since, oldest first
setState(id, state, patch?: { projectId?: string; title?: string; waitingSince?: string | null })
// api/piece-state.ts: each change is one message, { kind: 'asked', change, words, fix }
export interface Piece { kind: 'first' | 'change' | 'fix'; change: number; asked: string[]; incidentId: string | null }
export function pieceOf(store: Store, conversationId: string): Piece
// build/line.ts
export interface Line {
  /** Does this conversation hold its app now? Decision 5's rule, in one place. */
  holds(conversation: Conversation, run: Run | undefined): boolean
  holder(projectId: string): Conversation | undefined
  /** It wants the app: it holds it if it is free, else it waits. */
  join(conversation: Conversation): 'holding' | 'waiting'
  /** Its piece ended (built, stopped, set aside): the next waiting one starts by itself. */
  released(projectId: string): void
  /** At boot: every app with a waiting conversation and no holder starts its next. */
  onBoot(): void
  position(conversationId: string): { place: number; holder: { id: string; title: string; waitingForYou: boolean } } | null
}
export function createLine(deps: { store: Store; hub: Hub; begin: (conversation: Conversation) => void; now: () => Date }): Line
// api/progress.ts: the state frame gains
piece: { kind: 'first' | 'change' | 'fix'; change: number; asked: string[] } | null
line: { place: number; holder: { id: string; title: string; waitingForYou: boolean } } | null
```

**Routes** (every one guarded by the person and by `Origin`, F2 Decision 3):

| Route | Body | Answers |
|---|---|---|
| `POST /api/apps/:projectId/conversations` | `{ words, token }` (≤ `LIMITS.description`), or `{ fix: { incidentId }, token }` | `201` the conversation, holding or waiting; `400 CHANGE_INVALID`; `400 TOKEN_NOT_FOR_PROJECT` (F2's check) |
| `GET /api/apps/:projectId/conversations` | — | the person's conversations on the app, newest first, each `{ id, title, state, chip, updatedAt, line }` |
| `GET /api/apps/:projectId/instances/:instanceId/conversation` | — | `{ id }` of the conversation whose round deployed it, or `404` |
| `POST /api/conversations/:id/messages` | F3's | now also in `built` (the next change) and `waiting` (added to what was asked) |
| `POST /api/conversations/:id/stop` | F3's | now also in `waiting`, `planning` and `plan-ready`: the change is **set aside**, and the app freed |
| `POST /api/conversations/:id/build` | F3's | *Carry on* after *Stop* **joins the line** when another conversation holds the app |

- [ ] **Step 1: Tests, failing first:**
  - **the migration** takes a version-3 file to 4: every row intact, `waiting` and `set-aside` accepted, the dev
    database's shape held (F3's migration test's pattern);
  - **`holds`**, each case its own: making, planning, plan-ready, agreed, building with a working, paused, needs-you or
    interrupted run hold; built, set-aside, waiting, and building with a stopped run do not; a conversation still in
    its intake (no project) holds nothing;
  - **Review Focus 1:** two `POST …/conversations` in the same tick → one `planning`, one `waiting` at place 1; a built
    conversation's `/messages` while another holds → `waiting`, its words its next change; the holder built → the
    next starts by itself (its `begin` called once) with no request; `/stop` on a waiting one → `set-aside`, the line
    closes up; *Carry on* after a *Stop* while another holds → `waiting`, and when freed, `carryOn`, never a new round;
  - **a restart:** `onBoot` with a waiting conversation and no holder begins it; with a holder, begins nothing;
  - **no token held** when a conversation reaches the front: it moves to `planning` and waits for the page's
    `TOKEN_MISSING` handover; nothing is started without one;
  - **the new routes:** `403 ORIGIN_REFUSED` from a student app; `404` for another person's conversation or a project the
    token is not for; `400` out of shape or over `LIMITS`; the token checked with `getProject` before anything is
    stored, and **kept in memory only**, F2's dump of every table after holding no `mft_`;
  - `instances/:id/conversation` answers from `runs.detail.instanceId`, and another person's is `404`;
  - the state frame carries `piece` and `line`, and a reconnect's first frame rebuilds both from the store alone.
- [ ] **Step 2: Red. Step 3: Implement.** `line.begin` is wired in `app.ts` to Task 7's `planning.begin` (a change),
  F3's `rounds.start` (a fix), or `rounds.carryOn` (a stopped round that joined the line). Until Task 7 lands in the
  same sitting, a change's `begin` moves it to `planning` alone.
- [ ] **Step 4: Green; controls:** `holds` true for a stopped run; `released` not called on built; two holders at once;
  `onBoot` never called; the token not checked. Each red, restored.
- [ ] **Step 5: Commit** `feat(server): conversations on an app, and the line — one works on an app at a time, the others
  wait, and the next starts by itself`.

## Task 7: The change's plan, agreed and committed

**Files:** `server/src/agents/{change.ts,plan.ts,change.test.ts,plan.test.ts}`, `server/src/api/{plan.ts,plan.test.ts}`,
`server/src/model/walkthrough.ts`.

**Interfaces:**

```ts
// agents/plan.ts
export function planMarkdown(title: string, plan: Plan, answers: Record<string, string>,
  changes?: { at: string; words: string }[]): string                    // `## Changes since we first agreed`
// (S1: M5) the settled questions travel apart from the parts, so the planner never asks them again
export function readPlanMarkdown(markdown: string):
  { title: string; plan: Plan; answers: Record<string, string>; changes: { at: string; words: string }[] } | null
// agents/change.ts: on the conversation's agent session, which the person pays for
export const ChangeAnswer = PlanAnswer.extend({ title: z.string().min(1).max(60) })
export function writeChange(model: Model, input: {
  current: Plan | null; currentText: string; asked: string[]; knowledge: string
  previous?: Plan & { title: string }; correction?: string
}): Promise<Plan & { title: string }>                                     // `changed`: the rows whose words differ from `current`
// api/plan.ts: what the line's `begin` calls for a change, and `/plan` runs on a press: the same work
export interface Planning { begin(conversation: Conversation): void }    // to `planning`; the planner runs if a token is held
```

- [ ] **Step 1: Tests, failing first:**
  - **the round trip:** `readPlanMarkdown(planMarkdown(t, p, a, c))` gives back `t`, `p` (less `changed`), `a` and `c`,
    for F2's walk-through plan with and without changes; a hand-edited file that no longer reads back is `null`;
  - **the planner:** given the current plan and *"also show a word count"*, a scripted model's answer marks exactly the
    rows whose words differ; a row it rewrote identically is not marked; with `current` null, every row is marked; its
    `title` is guarded by F2's words check; the class-only promise is replaced as F2's is;
  - **the dispatch:** in a change's `planning`, `/plan` writes the change on a new agent session, which is ended when it is
    written; `/plan/correction` rewrites it; the frame shows `plan-ready` with the changed rows; the title becomes the
    planner's;
  - **(S1: M5) answered questions:** `readPlanMarkdown` gives back F2's questions with their answers apart from the
    parts; the planner's brief lists them as settled; its answer's `onlyYouKnow` holding a line break, or repeating a
    settled question, is refused (the model asked again); the new `docs/plan.md` keeps the settled ones and adds the
    change's;
  - **Yes:** `/plan/agree` on a change commits `docs/plan.md` with `## Changes since we first agreed` and their words,
    **before** round *n+1* starts (the fake source's call order), then the round starts in the same run (F3 Task 9's
    claim held); `PLAN_CHANGED` and `TOKEN_MISSING` as F2's;
  - **Not now** (`/stop` in `plan-ready`): `set-aside`, nothing committed, the line released;
  - **a restart during planning:** the conversation is `planning` with no work; `/plan` carries it on;
  - **F2's first plan is unchanged**: its `docs/plan.md` byte for byte (F2's test), and `check-describing.sh` 18/18.
- [ ] **Step 2: Red. Step 3: Implement**, and mock mode's model answers the change planner.
- [ ] **Step 4: Green; controls:** the round started before the commit; the changed rows taken from the model; the
  session left running; `Changes` dropped from the file. Each red, restored.
- [ ] **Step 5: Commit** `feat(server): a change is agreed before it is built — "Here's what we'd change", then Yes commits
  docs/plan.md with its Changes, then the round`.

## Task 8: The lead on an app that exists

**Files:** `server/src/build/{round.ts,round.test.ts,moves.ts,guards.ts,guards.test.ts}`,
`server/src/agents/{lead.ts,building.test.ts}`, `server/src/model/walkthrough.ts`.

**Interfaces:**

```ts
// agents/lead.ts: LeadView gains
change: { asked: string[]; parts: string[] } | null        // the agreed change: their words; the plan's parts that changed, as they now read
fix: { exitReason: string; failedCheck: string; logTail: string; prompt: string; diffSinceHealthy: string } | null
// build/moves.ts: RoundContext gains
known(path: string): boolean                               // read at the current tree, written this round, or proposed as is
// build/guards.ts
unread(changes: Change[], tree: { paths: string[] }, known: (path: string) => boolean): string | null   // "read it first"
```

- [ ] **Step 1: Tests, failing first:**
  - **`prepare` reads `docs/plan.md` from the tree** for every round; round 1 of a first conversation gets the same text
    as the store's plan would make; an unreadable file falls back to the store's plan;
  - **the view** carries `change` for a change's round and `fix` for a fix's, both within `VIEW_CAP`; neither for a first
    round;
  - **`unread` (Review Focus 3):** a write to an existing path not read → refused with *"read it first"*, and the next
    move's view says so; after a read at the current tree → taken; a read at an older tree (someone else's commit since)
    → refused; a new path → taken; the specialist's proposal committed as proposed → taken; a delete of an unread file →
    refused;
  - **the prompt** holds the change paragraph (a test pins its three rules);
  - **a message during a round**, read by the lead, is added to `docs/plan.md`'s *Changes* after `done`, in one commit
    whose dry run comes first, before `holds`; no message, no commit;
  - **the round ends by telling the line** (`released`) when built and when stopped, never when paused or needs-you;
  - **a fix's round** starts at `pages` with the incident in the view, and no plan is agreed;
  - **(S1: Spec action 10) a staging incident refused to our token** (`INCIDENT_LOG_CONFIDENTIAL`, or whatever code
    sitting 11a rules): the fix's view carries no incident, only that it did not start there and why we cannot read
    it; nothing of the person's session's reading reaches the round; the refusal is not a problem shown with a
    reference;
  - **(S1: Spec action 10) the prompt says a confidential app's own AI is `default-chat-onprem`**;
  - **(S1: FE-36, when sitting 11a lands)** a session the platform ended because the project's classification rose is
    **not** the $2 checkpoint, whose words would be false. What the round says then, and whether it asks before a new
    session, is Rich's: asked when 11a's end reason is in the contract (sitting 7's Step 0 at the latest). With the
    setting's default (the capable model allowed) our sessions are never ended this way;
  - F3's whole-round tests stand, and no credential reaches a prompt or the store.
- [ ] **Step 2: Red. Step 3: Implement**, and mock mode's lead reads before it writes on a change.
- [ ] **Step 4: Green; controls:** `unread` not consulted; a read at an older tree counted; the *Changes* commit after the
  build; `released` on a pause. Each red, restored.
- [ ] **Step 5: Commit** `feat(server): the lead on an app that exists — docs/plan.md from the tree, the agreed change in
  its view, and never a file rewritten unread`.

## Task 9: Moment 8's screens

**Files:** `web/src/screens/change/{ask.tsx,conversations.tsx,waiting.tsx,change.test.tsx}`,
`web/src/screens/plan/{plan.tsx,plan.test.tsx}`, `web/src/screens/building/{thread.tsx,building.test.tsx}`,
`web/src/screens/describe/describe.tsx` (routing the new states), `web/src/ours/api.ts`, `web/src/words.ts`.

**Interfaces:**

```ts
// ours/api.ts
startChange(projectId: string, body: { words: string; token: string } | { fix: { incidentId: string }; token: string }): Promise<Conversation>
conversationsOn(projectId: string): Promise<{ id: string; title: string; state: ConversationState; chip: State; updatedAt: string; line: LineView | null }[]>
conversationFor(projectId: string, instanceId: string): Promise<{ id: string } | null>
// screens/making/token.ts: mintRequest(title, purpose: 'building' | 'changing')   // "Changing — <their words>"
```

**What it draws:**
- **Ask for a change** (`/apps/:slug/change`): *"What should change?"*, their words with F2's count and limit, **[Ask for
  it]**. It mints the token (`Changing — <their words, cut>`), posts `startChange`, and goes to the conversation.
- **The waiting conversation**: its top reads **waiting on someone**, *"Waiting for '<title>' to finish. It starts by
  itself."*, with *"…which is waiting for you."* when the holder needs them, the title a link to it. Its message box takes
  messages. **[Leave the line]** is `/stop` (*set aside*).
- **The change's plan** (`plan.tsx`, `piece.kind === 'change'`): *"Here's what we'd change"*, the changed parts only,
  *"Everything else stays as we agreed."*, its questions, **[Yes, change it]**, the correction box, **[Not now]**.
- **A set-aside change**: *"Set aside. Nothing was changed."*; the message box asks for another.
- **The built conversation's message box** is open again: a message is the next change.
- **The app's conversations** (`/apps/:slug/conversations`): *"Conversations"*, *"Every piece of work on <name>, and
  where each one left it."*; a row each: the title, the chip (the five states), when; waiting ones with their place.
- **The Preview's failed draft attempt** gains **[What went wrong]**, which opens the conversation whose round deployed
  that instance (`conversationFor`), and is not drawn when none of ours did.

- [ ] **Step 1: Tests, failing first** (jsdom, a recording `Ours` and `Platform`, frames by hand):
  - Ask for a change mints with the changing name, posts the words **and** the token in one request, and navigates; over
    the limit holds the send and keeps their words (F2's `FieldCount`);
  - a waiting frame draws the waiting card with the holder's title and place; *"…which is waiting for you"* only when
    the holder needs them; *Leave the line* posts `/stop`;
  - a change's `plan-ready` shows only the changed rows, the sentence, and *Yes, change it*, which posts `/plan/agree`
    with F2's agreement shape; *Not now* posts `/stop`;
  - a built frame's message box posts `/messages`; F3's *"Asking for a change arrives next."* is gone;
  - the conversations list draws each chip from the five states, and links each row;
  - the Preview's failed draft attempt links the conversation `conversationFor` answers, and shows no link on `null`;
  - `machineryIn(text())` is empty, and *"It works"* appears nowhere.
- [ ] **Step 2: Red. Step 3: Implement. Step 4: Green; controls:** the token posted apart from the words; *Not now*
  missing; unchanged rows drawn; the box still closed after built. Each red, restored.
- [ ] **Step 5: Walk it in headless Chrome against the mock, at 1440 and 375**: ask for a change, its plan, *Yes*, its
  round; a second change waiting behind it, then starting by itself.
- [ ] **Step 6: Commit** `feat(web): moment 8 — ask for a change, the line, "Here's what we'd change", and the app's
  conversations`.

## Task 10: Trying-out (moment 9)

**Files:** `web/src/screens/trying-out/{put.tsx,stations.ts,put.test.tsx,stations.test.ts}`,
`web/src/screens/building/{work.tsx,building.test.tsx}`, `web/src/screens/preview/preview.tsx`,
`web/src/platform/api.ts`, `server/src/api/{apps.ts,apps.test.ts}`, `web/src/words.ts`.

**Interfaces:**

```ts
// platform/api.ts (the session)
deploy(environmentId: string, releaseId: string, idempotencyKey: string): Promise<Schemas['Instance']>   // 120 s
setAppSecret(environmentId: string, name: string, value: string, idempotencyKey: string): Promise<void>
// screens/trying-out/stations.ts: pure
export type StationKey = 'turn' | 'room' | 'starting' | 'answering'
export function stationsOf(instance: Schemas['Instance'] | null): { key: StationKey; state: Station['state'] }[]
export function newestAttempt(instances: Schemas['Instance'][], servingAtPress: string | null): Schemas['Instance'] | null
// our server: GET /api/apps/:projectId/secrets → { secrets: { name: string; ask: string }[] }   // never a value
```

**What it draws** (the walk-through's words first):
- **The building screen's end panel, once built**: *"Ready on your draft address."*, **[Try it]** (→ the Preview's draft
  tab), **[Put this version on trying-out]**. **The Preview's draft tab** has the same button beside the two facts.
  **Already there**: *"This version is already on the trying-out address."*, and no button. **A draft serving nothing**:
  no button.
- **The question**: *"Put the version from today, 3:12pm on the trying-out address? The one there now keeps answering
  until this one proves it can."* **[Put it there]** · **[Not now]**. The release is read when the button is pressed, and
  held with the question.
- **The stations** (`Timeline`), **working**, under 90 seconds. Then Rich's words: *"It's on the trying-out address.
  Nobody can sign in there until UBC's identity team has registered it. That takes some time…"*
- **It never answered**: the two facts (walk-through), **[What went wrong]**, which mints a token and starts a fix
  conversation (`startChange` with `fix`) carrying staging's newest incident's id.
- **A secret with no value there** (`RELEASE_SECRET_NOT_SET`): **needs you**, *"It needs <its plain name> before it can
  start there."*, a password field (F3's `secret`), **[Set it]** → `setAppSecret` on staging, then the question again.

- [ ] **Step 1: Tests, failing first** (a recording `Platform`, fake timers):
  - **Review Focus 2:** the question names the sandbox's serving release's date; a round finishing before *[Put it
    there]* (the serving release changes) → `deploy` still sends **the release the question named**; a draft serving
    nothing offers no button; a failed newest sandbox instance does not change what is offered;
  - `deploy` names **the staging environment's id** and carries an `Idempotency-Key`; its deadline is 120 s (a spy on
    `AbortSignal.timeout`, F3's way);
  - **the stations** follow `listInstances` **every second (S1: M3)**: `pending`, `provisioning`, `starting`, `healthy`,
    each ticking its station; **the new instance is the one whose id was not listed at the press**, whatever its
    position (the platform lists "seen most recently" first, M3), and a fake that lists it second still ticks; **the end
    is `deploy`'s own answer** (a fake whose list still says healthy while `deploy` answers `failed` ends *It never
    answered*, M2); polling stops when `deploy` answers;
  - **already there (S1: M3)**: staging's serving release equal to the draft's → the sentence, and no button (the
    platform would make a new instance of the same release);
  - **a page closed and reopened** mid-deploy: the Preview's *Trying out* reads *"under way"* from `listInstances`, then
    the result;
  - `STEP_UP_REQUIRED` sends them to sign in again and back to the question (F2's pattern);
  - **the secret**: the names missing from `listAppSecrets(staging)` (`declared && !set`, S1: M1, M3), never from the
    refusal's message; each one's plain name from `/api/apps/:projectId/secrets`; **its value is sent only to `setAppSecret`, and to
    no route of ours** (a recording `Ours` sees nothing); under 6 characters, the field says so first;
  - Rich's arrival words exactly; **no date, no *"We asked"***; `machineryIn` empty; never *"It works"*;
  - **our server:** `/secrets` answers names and questions and **never an answer**; F3's test that our server deploys
    only to the sandbox stands, run again.
- [ ] **Step 2: Red. Step 3: Implement.**
- [ ] **Step 4: Green; controls:** the release read at *[Put it there]*; `deploy` on 15 s; the serving instance taken as
  the new one; the secret's value posted to us. Each red, restored.
- [ ] **Step 5: Walk it in headless Chrome against the mock, at 1440 and 375**, the mock also under `MANIFEST_MOCK_FAIL=1`
  for the never-answered path.
- [ ] **Step 6: Commit** `feat(web): moment 9 — put the draft's version on trying-out, from your own session, and watch it
  answer`.

## Task 11: The acceptance (sitting 7, alone)

- [ ] **Step 0: M6, if sitting 1 could not run it** (S1: it could not; FE-35 is Spec action 10, the platform's sitting
  11a). Re-read the contract for 11a's codes (the incident refusal, the session's end reason) and correct Tasks 8 and
  10 to them before the walk.
- [ ] **Step 1: Against the mock.** `scripts/check-seeing.sh`, beside `check-building.sh`, drives our API as the browser
  does, with mock mode's model, and asserts **what our server sent**, from the trace and the store:
  1. two changes asked at once on one app: one plans, one waits at place 1;
  2. the first's plan is written, and *Yes* commits `docs/plan.md` with its *Changes* (its dry run first) **before** the
     round's `startAgentSession`;
  3. the round runs to built; the second then starts by itself, with no request;
  4. a `/stop` during the second's round sets nothing aside but frees the app, and a third, waiting, starts by itself;
  5. **our trace names no staging and no production**, in any `deploy` or `getInstanceOutput`;
  6. a student app's post to each new route is `403 ORIGIN_REFUSED`;
  7. no `mft_` and no `sk-` in any table, or any frame sent.

  **Negative controls, each red:** the line's hold removed; the round started before the plan's commit; a deploy to
  staging from our server; the scan pointed at a copy holding a leaked row. *(S1: M2: the mock's staging already
  serves the draft's release, so a staging deploy against it shows only "already there": moment 9 is proved by the web
  tests and on the real platform, and this script asserts our server sends none.)*
- [ ] **Step 2: On the real platform** (the control plane per manifest's RUNBOOK, **asking Rich first and telling the
  platform session**; our server in edge mode). Headless Chrome through `https://app.manifest.internal`, signed in as
  `instructor`, at 1440 and 375:
  - the walk-through app, built by moments 3–6;
  - **the Preview**: each tab, the two facts; the draft opened in a tab and **signed in to as `student`**, by the words
    on *Try it as*;
  - **two changes**: *"Also show a word count on each response"*, and a second asked while the first is planned; the
    second waits;
  - the first's *"Here's what we'd change"*, *Yes*, its round to built; `docs/plan.md` read back with its *Changes*; the
    second starts by itself;
  - **put the version on trying-out**: the stations, the time, Rich's words at the end; `listInstances` on staging
    serving that release;
  - **record the change planner's and the lead's words verbatim**, as F3 recorded the lead's.
- [ ] **Step 3: Rich's click:** `https://app.manifest.internal`, signed in as `instructor`: his app's Preview, a change,
  and trying-out.
- [ ] **Close:** the whole-branch review (a fresh reviewer, read-only), dispatched at the sitting's start so its fixes
  land before the real platform and Rich's click, its findings fixed test-first; the gates twice; the dated entry; this
  table; ORIENTATION; the roadmap. **F4 is executed only when Step 3 is done.**

---

## What this plan does not build

- **Overview** (moment 16), ***Since you were last here***, the watch token, and email: F6.
- **Going live** and the three clocks (moments 10–15): F5. *For your students* says *"Not live yet"*, and offers no
  button to a page that does not exist.
- **A request to UBC for the staging registration**, or any record of one (FE-6, FE-24): nothing records it, and
  *Trying out* says so in Rich's words.
- **The pretend people published by the platform** (FE-3 (a)): ours meanwhile.
- **A capable model for confidential apps** (FE-35): the platform's, carried by Rich.
- **Production**, rollback, *People*, *Agents*, and a preview inside the page (apps answer `frame-ancestors 'self'`).
- A change after launch (moment 17's *"an administrator's look"*): F6.

## What executing this plan found

*Each sitting adds a dated entry here: its measurements, its rulings, its negative controls, and its gates.*

### 2026-09-28 — Sitting 1 (Task 1): the measurements

*In the planning session (`manifest-app-bb`), at Rich's word (*"start sitting 1 - be aware another agent is working on
the platform at the same time"*), one agent natively. The platform session (`manifest-7c`) was closing its sitting 11:
we waited for its *"UP"* (22:16), used 7100 at Rich's word (*"Yes, as planned"*) until 22:38, and told it when we were
done. The throwaway scripts and their records are in the session's scratchpad (`s1/`); the ledger has every run. The
contract did not move: **1.4.0, 66 operations, 127 codes**, at manifest `d82b3a2`, then `f4f28d6` (documents only).*

**M1: the contract.** `pnpm typecheck` passes and `pnpm test` is 873/873 against it.
- `listEnvironments`, `listProjects` and `listReleases` answer bare arrays; `listInstances` answers `{ environmentId,
  instances, truncated }`, each with `serving`.
- **A staging deploy authorizes `release:deploy` and asks no step-up**; production alone steps up (read in the
  control plane's `releases.ts`, then measured). Setting a staging secret from a session asks none either.
- **`RELEASE_SECRET_NOT_SET` names the secrets only in its message**, which also holds machinery; `listAppSecrets`
  answers `declared` and `set` as fields, so the page reads those (Decision 15, S1). The platform session files the
  message's shape with FE-29.

**M2: our mock** (7102, and a throwaway one under `MANIFEST_MOCK_FAIL=1` on a free port; 7102 untouched):
- its staging **already serves the draft's release**, so against the mock the draft's version is always *"already on
  trying-out"*; a staging deploy answers `healthy` at once;
- **under `MANIFEST_MOCK_FAIL`, `deploy` answers the serving instance's own id as `failed`** while `listInstances`
  still lists it healthy: the stations' end is `deploy`'s answer (Decision 11, S1);
- `listAppSecrets` and `setAppSecret` answer their fixtures whatever is asked (FE-27's shape).

**M3: a staging deploy on 7100, from the page's session** (the walk-through app, built by our round in 3.3 minutes on
`default-chat-large`, 12 calls, $0.02):

| Measured | |
|---|---|
| `deploy` to staging, session | `200 healthy` in **8.3 s**; again in 5.3 s; **no step-up** |
| `listInstances(staging)`, each second | the new instance listed **while the deploy runs**: `provisioning` 1 s, `starting` 3 s, `healthy` 6–9 s; `pending` never seen. **Ordered "seen most recently"**: the new one was listed second while it started |
| the page's own event socket | opens on the session; replay, then `ready`; `instance.provisioning` 34 ms, **`sso.registered`** (staging) 2.9 s, `instance.starting`, `instance.healthy` 8.3 s; it carries every environment's events |
| the request aborted at 3 s | **the deploy carried on**: healthy at 5.4 s, the old instance `retiring`, then `retired` |
| the same release again | **a new instance**: the platform never says *"already there"* |
| a declared secret with no staging value | `409 RELEASE_SECRET_NOT_SET`; `listAppSecrets(staging)`: `declared: true, set: false`; `setAppSecret(staging)` from the session `200`; the deploy then `200 healthy` |

**M4: the draft's sign-in**, headless Chrome signed in to Manifest as `instructor`:
- **opening the draft signs no one in**: it says *"Sign in with CWL"*;
- **its *Sign in* goes straight through as the Manifest person** (*"Signed in as Test Instructor"*): the IdP's session
  is Manifest's;
- **its *Sign out* ends the IdP's session**: signing in again shows the IdP's form (*"PRACTICE SIGN-IN — NOT REAL
  CWL"*), and `student`/`student` signs in as *"Test Student"*, without the instructor's dashboard;
- **the person stays signed in to Manifest** throughout;
- the laptop's staging address signed `student` in straight away: the pretend IdP, as spec §21 says. Never shown to
  faculty (Rich).
- So the walk-through's laptop sentence is true of **signing in**, not opening: reworded in *Words proposed for Rich*.

**M5: a change, on the capable model** (`default-chat-large`, no fallback, **$0.014** for 16 answers):
- **the change planner**, on *"Also show a word count on each response"* and the app's own `docs/plan.md`: **5 of 5
  parsed** in 5–10 s; each titled *"Word count"*; each changed exactly *What students see* and *What you see*, and
  kept the other three word for word; a correction (*"Only on my view"*) narrowed it to one part. **But it copied the
  plan's answered questions back as new questions, answers and all** (*"Who is my class?\nIt closes at the
  deadline."*): Decision 7 and Task 7 now keep answered questions settled (S1);
- **the lead's first two moves**, with the change paragraph: **5 of 5 read the files it would change first** (1.2–2.1
  s), then committed whole files keeping **97–100%** of their lines, with accounts like *"Word counts appear as
  students write and beside public and instructor responses."*

**M6: not run.** FE-35 became **Spec action 10** the same evening (manifest `d9a1fa1`, Rich's words to the platform
session; *Decided by Rich* has them), built by the platform's **sitting 11a**, before its acceptance. It moves to sitting
7's Step 0. What it changes here is marked (S1) in Decisions 9 and Tasks 8, 10 and 11: a confidential app's staging
incident may be refused to our token, and its own AI is on-premise.

**M7: our code.** The line is released when a stopped round's work has **ended**, never at the *Stop* press (a deploy may
be in flight for 90 s); `commitPlan` gains a message; a change conversation carries a `project` message so the intake's
fold finds its project; F2's check 7 (the plan's commit, dry run first, `docs/plan.md` alone) holds for a change.

**Also seen:** the real intake model offered slugs as names again, in both walks (`my-reading-response`,
`readings-responses`, `student-writing-post`; `reading-responses`, `student-submissions`, `paper-inputs`): Task 4. And the
line under *Building it* was the lead's done line again: Task 3.

**Rulings** (the ledger has each with its cost):
1. M3's missing names come from `listAppSecrets`, never the refusal's message.
2. The stations poll every second; the new instance is the id not listed at the press; the end is `deploy`'s answer.
3. *"Already there"* is ours, by comparing releases.
4. The laptop sentence is reworded to what M4 measured, for Rich to read.
5. The planner's settled questions travel apart from the parts.
6. The line is released when the stopped work has ended.
7. A staging incident refused to our token is never replaced by the person's reading of it.
8. The walk's own bug (a React id's `:` in a CSS selector) was fixed in the throwaway walk; its first run stopped at the
   plan, and left a project (`my-reading-response`) on 7100.

**For Rich:**
- the laptop sentence on *Try it as*, reworded (*Words proposed for Rich*);
- FE-36's ended session, when sitting 11a lands: its words, and whether a new session is asked for (Task 8).

**Left on 7100** (told to the platform session, all to go with its next truncation): the projects `student-submissions`
and `my-reading-response`, and one delegated token (*"F4 sitting 1: measurements"*, expiring within a day), which a
script without a session could not revoke. Its file was deleted.

**Gates:** no code changed (the plan, `api-findings.md`, the roadmap and ORIENTATION). `pnpm test` **873/873, twice**;
`pnpm lint`, `pnpm typecheck` and `pnpm format:check` pass, against manifest `f4f28d6`. **Our server is back in mock mode**
(7105 → our mock on 7102).

**Spent:** about $0.04 of the test user's month on Rich's OpenAI key (the round's $0.02, M5's $0.014, the plan's cents).

### 2026-09-28 — Sitting 2 (Tasks 2, 3, 4): two components, Rich's F3 decisions, names people read

*In session `manifest-app-07`, at Rich's word (*"proceed with the next sitting"*), one agent natively, no platform: our
mock on 7102 and our server in mock mode on 7105 throughout. The ledger has every run and ruling.*

**At the start:**
- **Rich approved the laptop sentence on *Try it as* as written** (*"Use it as written"*): *Words proposed* marks it ✓.
  Task 5 uses it.
- We introduced ourselves to the platform session (**`manifest-c3`, its sitting 11a**). It answered our three asks,
  ruled: `403 INCIDENT_LOG_CONFIDENTIAL` (a delegated token, staging or production, a confidential project, while the
  setting is `capable`); a new `endReason`, **`models_withdrawn`** (not `classification_raised`: narrowing the setting
  raises nothing); a confidential session under `capable` lists `default-chat-onprem`, `default-chat-onprem-reasoning`
  and `default-chat-large` (last, when registered). A session at its $2 cap stays `active` with `endReason` null
  (`spentUsd` against `capUsd` tells it); `expired` is its time running out.
- **During the sitting the contract moved, additively** (manifest `4f261e9`, still 1.4.0, 66 operations, 127 codes):
  `models_withdrawn` in `AgentSession.endReason` and `agent_session.ended`. After every valid `manifest.yaml` recorded,
  and at every boot, an active session holding a model its project no longer allows is ended, and its key refused
  for every model: **the next piece of work must start a new session** (Task 8). `ad4e94c` built the setting. **Our
  typecheck and 916 tests pass against it.**
- **After our close-out, `38c2ade` committed the incident refusal** (contract and mock; 1.4.0, 66 operations, **128
  codes**): `403 INCIDENT_LOG_CONFIDENTIAL`, family `OutputError`. Its remedy suggests asking the person to read it in
  their own session and say what failed: that stays the person's choice, in their own words, never our server reading
  it for them (sitting 1's ruling 7, Tasks 8–10). **Our mock gains `MANIFEST_MOCK_CONFIDENTIAL=1`** (a Bearer's staging
  or production incidents refused; every agent session holding the three names); without it nothing changes, and our
  running mock on 7102 has not reloaded it. Typecheck and 916 tests, twice, pass against it. **M6 can now be measured
  against the mock**, and on 7100 at sitting 7.

**Task 2** (`e394339`): `SegmentedControl` and `Timeline`, ported from the bundle, held byte for byte by the parity
test (the previews' cases, strings and options in both roles, every station state at each end). Ours, tested apart:
arrow keys move the selection and the focus, wrapping; Home and End; up and down in a radiogroup; only the selected
segment in the tab order (the first when none is); `controls`; `label`.

**Task 3** (`4ec3ca6`): Rich's four F3 decisions.
- The line under *Checking it holds together*, *Building it*, *Putting it on your draft address* and *Checking it
  answers* is ours (`words.building.stepLine`); the lead's stays under *Writing the pages*.
- A Stop he chose is still: the step goes back to not started, the chip reads *"Stopped. Nothing is lost."* in the
  not-yet tone, and the card under it is plain, not red, with **[Carry on]**. `halted` stays for what went wrong.
- *What changed* is **one account a round**, from the lead's `done` (`runs.detail.account`, and the version's summary);
  each commit's own account sits behind the disclosure, above its files, in order. A round saved before F4 still folds
  the accounts it joined.
- A conflict is no try on the pages; three are still `needs: conflict`.

**Task 4** (`f3c1d45`): the model writes **names only**; our `slugOf` makes each address (lower case, accents dropped,
each run of anything else one hyphen, trimmed to 39 at a hyphen, a letter first). The check refuses a name that reads
like an address, one that makes none, and two that make the same one, and the model is asked again. The five real
names from F3's walks are refused; *"Sign-up sheet for office hours"* is taken.

**Rulings** (the ledger has each with its cost):
1. The parity test excuses exactly one attribute, SegmentedControl's `tabindex`: a tab order cannot be byte-identical
   to a reference that has none.
2. A radiogroup's segments answer up and down too; with none selected, the first takes the tab stop.
3. `done`'s account reaches the round through `RoundContext.account()`, as `cannot` does: the runtime's `Stop` stays
   generic.
4. `runs.detail.account` is the one place; a round from before F4 falls back to its joined accounts.
5. The pages' exact lines are always labelled *"The exact changes…"*, before `done` too: they are its commits.
6. **The stopped card no longer repeats the chip**: *"Your draft address keeps whatever was last put there."* (ours),
   in the plain tone. Rich's chip is unchanged.
7. A message waiting still says *"Got it, after this step."* under any step; only the lead's line is replaced.
8. **"Reads like an address" is words joined by hyphens with no space**, not *any* hyphen between two words: it refuses
   all five real ones, and keeps names people read that hold a hyphenated word.
9. `slugOf` drops accents (*"Café notes"* is `cafe-notes`); a name too short for a 3-character address makes none.

**Negative controls**, each red, then restored: arrows not wrapping; every tab in the tab order; the `now` dot not
pulsing; `aria-controls` always drawn (the excuse excuses nothing else); the lead's line under *Building it*; a
stopped step `halted`; `done`'s account dropped; a conflict counted as a try; the stopped chip and card red; no
fallback for a pre-F4 round; the address-like check removed; the model's slug kept **and** used (the schema alone
keeping it changed nothing: zod strips it); the address-twice check removed.

**Walked in headless Chrome, mock mode, at 1440 and 375** (the scratchpad's `walk.mjs`, F3's adapted): a plain round and
a *Stop* round. The names read as names, each with our address; our line under *Building it*; the stopped round grey,
still, with no red and no step halted; *What changed* one sentence on the step and in the folded round, each commit's
account with its file behind the disclosure. No overflow; the only failed requests the expected ones (the favicon, and
`/v1/me` before sign-in).

**Gates:** `pnpm test` **916/916, twice**; `pnpm lint`, `pnpm typecheck`, `pnpm format:check` pass;
`check-slice.sh` 8/8, `check-describing.sh` 18/18, `check-building.sh` 12/12, mock mode. **Our server stays in mock
mode** (7105 → our mock on 7102). The whole-branch review stays where the plan puts it: sitting 7, over all of F4.

### 2026-09-28 — Sitting 3 (Task 5): the app's own pages, and the Preview (moment 7)

*In session `manifest-app-07`, straight after sitting 2 at Rich's word (*"proceed with the next sitting"*), one agent
natively, no platform: our mock on 7102 and our server in mock mode on 7105. The platform session ran a Docker tier
meanwhile (it asked; nothing of ours was on 7100), and moved the laptop's on-premise names to `qwen3.8:27b` (`9c9c500`,
infra only): `default-chat-large`'s fallback now answers as it, a cold first call about 12 s.*

**Task 5** (`1ac8647`):
- **The routes**: `/apps/:slug` is the Preview (`?tab=` keeps the tab); `/apps/:slug/conversations` and `/change` say
  they arrive next (Task 9); `/apps/:slug/conversations/:id` is a conversation, drawn by the same screen as `/new/:id`.
- **The rail's project section**: the app's name, **Preview** and **Conversations**, on an app's pages and on a
  conversation once its project exists (the conversation screen reports it up).
- **The Preview** reads in the person's session (`listProjects`, `listEnvironments`, `listInstances`, `getRelease`,
  `listIncidents`): a switcher of three (sitting 2's `SegmentedControl`, arrow keys keeping the focus on the tab); each
  address in mono, **[Open it in a new tab]** where something is there; *Your draft*'s words, the pretend people (ours,
  FE-3) with copy buttons, and Rich's laptop sentence; *Trying out*'s waiting card, **UBC's identity team**, still, no
  number, and Rich's sentence; *For your students*'s *"Not live yet…"*; the two facts; *Ask for a change*.

**FE-38, written**: the last attempt cannot be told. `listInstances` is *"the one seen most recently first"* (M3), and
an instance has no time of its own, so FE-13's *"newest first, so its first entry"* is wrong. Meanwhile a failure is
the last attempt when nothing serves or **its version is newer than the one serving**; the same version failing is an
earlier try. Right for every F4 flow; wrong for a rollback (F6). Option (a): `createdAt` on an instance.

**Rulings** (the ledger has each with its cost):
1. The last attempt, by the versions' dates (FE-38 above).
2. **"Never a date" on *Trying out* is the registration's** (the walk-through's reason: nothing records it). The two
   facts there name a version as every version is named, as moment 9's own failure case does (*"Serving right now:
   the version from 18 September"*) and F1's *Your apps* already does. The test pins no date in the waiting card, and
   no *"We asked"* or *"weeks"* anywhere on the tab.
3. **Rich's sentence says *"UBC's real staging sign-in"***, and *staging* is on our machinery list: the checks set aside
   exactly his sentence, and nothing else.
4. *[What went wrong]* is Task 9's (its target is Task 6's route); `attemptFact` returns the failed instance for it.
5. The facts take `listInstances`' own shape (`InstanceSummary`, with `serving`) and the versions they must date, and
   return words with a tone for `TwoFacts`, whose overlines carry *"Serving right now"* and *"The last attempt"*.
6. **[Open it in a new tab] and *Try it as* only where something is there**; the address always.
7. The tab is kept in the address without a navigation (`router.remember`): a navigation moves the focus to the page.
8. Nothing tried on trying-out or for students shows no facts: the tab's own words say it.
9. *"Sign in as"* and *"Password"* are row labels, capitalized (the walk-through's inline words, laid out as a grid).

**Negative controls**, each red, then restored: *Try it as* on every tab; serving read from `listInstances`' first;
*"3 weeks"* and *"We asked on 18 September"* on *Trying out*; the rail's section on *Your apps*; the same version's
failure taken as the last attempt; the tab choice as a navigation (re-run with its import, so it failed on the focus).

**Walked in headless Chrome, mock mode, at 1440 and 375** (the scratchpad's `walk-preview.mjs`): each tab, the copy
buttons, the arrow keys, *Ask for a change*, *Conversations*. **The walk found a defect no unit test could**: at 375,
*"Copied"* pushed a row 13 px past the phone, and *"sign in as"* broke over three lines. Fixed as a grid of label, value
and copy. Headless Chrome refuses the clipboard until focus is emulated, and reads back an empty clipboard even after a
write, so the walk trusts the *"Copied"* status. The last walk: every check, no overflow, the only failed requests the
expected ones.

**Gates:** `pnpm test` **974/974, twice**; `pnpm lint`, `pnpm typecheck`, `pnpm format:check` pass; `check-slice.sh`
8/8, `check-describing.sh` 18/18, `check-building.sh` 12/12, mock mode. **Our server stays in mock mode.**
