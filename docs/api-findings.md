# What the faculty front-end needs from the platform

*For Rich to carry to the platform session. Started 2026-09-27, the front-end's first session, against `manifest`
commit `a2918af` with sitting 5 of the front-end enablement plan uncommitted in its working tree (contract 1.4.0: 56
operations committed, 57 in the working tree).*

**Each finding has the same shape:** the screen and moment where it bites, what we would call there, what is
missing, and why it matters to the person. It ends with the options, our recommendation, and **when**: which
remaining sitting could take it, if any. An **API gap is a finding, never a workaround.** Where the front-end
designs around one meanwhile, the walk-through says so on the screen concerned.

**Evidence.** A cite marked **✓** was read in this session. An unmarked cite comes from a read-only research pass
and has not been re-opened; open it before acting on it. `openapi:` lines are the COMMITTED document
(`git show a2918af:packages/contract/openapi.json`).

## For the platform session, in the order it needs them — decided by Rich, 2026-09-27

| When | Finding | What is asked | Rich decided |
|---|---|---|---|
| **Sitting 6, and the guide in 11** | **FE-2** | The front-end's server may replay the session cookie it receives to `GET /v1/me`, to learn who it serves, and for nothing else | **(a) Allow the replay**, and write the rule down in *Building a front-end* |
| **Sitting 7** | **FE-1** | An *intake* session with no project, platform-paid, on one model an administrator names | **Approved in principle; into sitting 7.** The spec words go to Rich to read before they are applied |
| | **FE-23** | `AgentSession.spentUsd` | **Into sitting 7** |
| **A decision to plan** | *the model* | A capable model behind the same LiteLLM, beside `qwen3.5:4b`, which stays the offline floor | **Add a capable model option**; the provider is UBC's call |
| **Spec now; code in sitting 10** | **FE-24** | Staging is UBC's real staging world (IdP, Canvas, academic API). On the laptop, staging keeps the fake sign-in. Recent output becomes sandbox-only | **Spec words now**, for Rich to read; `getInstanceOutput` refuses staging **in sitting 10** |
| **Sittings 10–11** | **FE-17**, **FE-18**, **FE-5** (its guide sentence) | A page, not JSON, for a browser refused at `/auth/*`; `@manifest/contract` consumable from a sibling repository; the canonical body hash published | **Fold these three in** |
| **After the enablement plan, first** | **FE-6**, **FE-25** | The launch path: the three clocks' drafts and state, the staging registration as a tracked object, and an owner's *"please sign this off"* | **The first of the front-end's asks** |
| **Then** | **FE-19**–**FE-22**, **FE-7**, **FE-3** | Toolkits, integrations, Qdrant, course material; events after a cursor; the sandbox's pretend people (with FE-24's plan) | ordered after the launch path |
| **Phase 4, as specified** | **FE-4** | Noticing a live app that died | **Phase 4's reconciler (D10)**; the front-end watches meanwhile |
| **How the two sessions keep in step** | — | Each platform sitting's close-out lists what it changed in the contract; `@manifest/contract` stays buildable at every commit; Rich relays | **Close-out note, Rich relays** |

**Ordered by what it costs the person, most first.** Timing notes say where a sitting is about to be built past
the point where a finding is cheap.

---

## Needed before a remaining sitting is built

### FE-1 — A model before a project exists ⏰ *before sitting 7* — **APPROVED BY RICH IN PRINCIPLE, 2026-09-27**

- **Screen and moment:** *Describe* (walk-through moments 3–4). A faculty member writes what they need in a
  paragraph. The agent answers with what it understood and a few names to choose from; they pick one or edit it.
  Only AFTER that, and the two audience questions, is the project created.
- **Decided by Rich, 2026-09-27**, in two steps:
  - First: *"us 'understanding' the project is going to need AI, but that can come out of the user's AI budget."*
  - Then, superseding the budget half: ***"I guess the 'understanding what the user asked for, proposing names,
    etc.' can be considered a platform cost. That will always be the same model for all users (and that's
    something we'll need to set as part of our options at the platform level). So I approve of that spec
    change."***
- **What we would call:** a model, before any project exists, paid for by the platform, on a model the platform
  names. **Several intake agents share it** (Rich, 2026-09-27):
  - one that understands the description and asks follow-up questions until it really does;
  - one that suggests names;
  - one that chooses the blueprint and starter.

  So intake is **a short conversation of several calls, not one**, and the bound must allow for that.
- **What is missing:**
  - `startAgentSession` is `POST /v1/projects/{projectId}/agent-sessions`, a project's operation (plan Task 10).
  - Its models are D17's for the *project's* classification (plan Decision 23).
  - D2 says an agent key is *"issued for one agent session… charged to the person the agent works for"*, and
    §10's key table has no platform-paid row ✓ (spec §4 D2, §10).
- **Why it matters:** without it, the first thing a faculty member does (*say what you need*) has no model. The
  only alternative forces a project (an address, a repository, three environments) into existence before they
  have agreed to anything.
- **The shape we recommend**, for the platform session to confirm against its own code:
  - **An *intake* session: a model key with no project, paid by the platform.** Started only from an
    interactive session, because a token belongs to one project and could not hold it. The browser hands the key
    to the front-end's server, exactly as it hands over a token. The key is answered once and never stored.
  - **One model, named by a platform setting** (an administrator's, like the model catalogue). It is not chosen
    per request and not derived from a classification, because there is no manifest yet. The setting's model
    must be one D17 allows for §7's default classification, `internal`, so a description a person types never
    goes somewhere their app could not.
  - **Paid from a platform budget, with a per-person bound**, so one person cannot spend the platform's intake
    budget. A small cap and a short life per key (say $0.25 and 30 minutes, enough for a few rounds of follow-up
    questions), and a number of keys per person per day (say 10), all platform settings. Running out is a refusal with its own code, whose words the
    front-end can show: *"Describing new apps is paused for today."*
  - **Confined like every key**: `allowed_routes`' three, and no capability on the control plane (§20).
  - **§5 is unchanged.** The front-end still owns the ideation, meaning the prompt, the conversation and what it
    does with the answer. The platform only supplies and pays for the model, as it does for an agent session.
- **The spec action, drafted for Rich to read before it is applied** (the platform session applies it; this
  repository never edits the spec):
  - **D2**: after *"…charged to the person the agent works for."*, add: *"One exception is paid by the platform:
    before a project exists, a person's interactive session may start an **intake session**, whose key calls
    one model an administrator names, to understand what the person described. It is bounded per person by the
    platform, and no project, token or app budget is involved (§10)."*
  - **§10's key table**: a fourth row, **Intake key**.
    - *Scope:* one person, no project.
    - *Lifetime:* a short `duration` TTL; revoked when ended; never outlives the session that started it.
    - *Budget source:* the platform's intake budget, with a per-key hard cap and a per-person daily number of
      keys, all platform settings.
  - **§10**: a paragraph after *"An agent outside a sandbox is issued its key through the API (Phase 2)"*,
    saying:
    - it is started by an interactive session only, and answered once;
    - its model is the one platform setting, which must be allowed for `internal` under D17;
    - it is charged to the platform, and its spend is readable by administrators (§26);
    - starting one publishes no project event, since there is no project, but is audited against the person.
  - **§20's credential table**: the agent-key paragraph (*"An agent key (§10) is neither class"*) names intake
    keys too.
- **When:** sitting 7 builds agent sessions. Folding the intake session in there costs a nullable `project_id`
  (or its own small table), one route, and the settings. After sitting 7 it is a plan of its own.

### FE-2 — Who is the front-end's server working for? ⏰ *before sitting 6*

- **Screen and moment:** every screen. Our server (7105) stores conversations and runs the agent. It must know
  which person a browser request comes from, so that a person reads only their own projects' conversations.
- **What we would call:** something that answers *"who is this?"* for a request that reached 7105.
- **What is missing:**
  - **Every page request on `app.manifest.internal` already carries the person's session to 7105.**
    `manifest_session` is set with `httpOnly: true`, `sameSite: 'lax'`, `path: '/'` ✓
    (`packages/control-plane/src/api/routes/auth.ts:72-80`). The edge forwards everything outside `/v1/*` and
    `/auth/*` to 7105 (plan Decision 19; the console's site does exactly this ✓, `infra/caddy/Caddyfile:63-106`).
  - So the one way our server can learn who it serves is to **replay that cookie to `GET /v1/me`**. That makes
    our server hold a credential that can do anything the person can: a server sets its own `Origin`, so CSRF
    does not stop it.
  - The plan's *Building a front-end* says *"two credentials, two places"* (plan Task 14). That understates it:
    the session reaches our server whether we want it or not.
- **Why it matters:** it is a security property of the whole product, and it is invisible unless someone says it.
- **Options:**
  - **(a) Recommended:** the platform **sanctions** the replay to `GET /v1/me` in *Building a front-end*, and
    says what the front-end's server must never do with the cookie: use it for anything but `getMe`, log it,
    or keep it.
  - (b) The edge strips `manifest_session` from requests it sends to 7105. The front-end's server then learns
    the person only from a token the browser hands it, which needs a *"who minted this token"* read (`Token` has
    no minter field).
  - (c) A narrower credential: the control plane issues the front-end's server a signed, short-lived identity
    assertion.
- **When:** sitting 6 builds the `app` origin and its edge site, which is where (b) would live. Sitting 11 writes
  the guide that (a) needs.

### FE-3 — Trying an app out on its draft address means signing in as a pretend person, and nothing says which ⏰ *before sitting 11*

> **Decided by Rich, 2026-09-27: show the test logins** (option (a) below, passwords included, because they
> authenticate nobody real). **And its scope is the SANDBOX only.** Rich: *"in the sandbox we will use the fake
> IdP, but in staging, we'll actually be connecting to the real Staging IdP from UBC's Identity and Access
> Management team."* That is a spec change, **FE-24**. This finding describes today's platform, where staging is
> on the Manifest IdP too.

- **Screen and moment:** *Seeing it* (moment 7), the emotional payload of the product. The person opens their
  draft or trying-out address.
- **What we would call:** something that tells the person how to sign in to their own app before launch: the
  pretend people they can be (*a student*, *an instructor*) and how.
- **What is missing:**
  - Under D6, sandbox and staging are signed in by the Manifest IdP, which *"never authenticates a real user"* ✓
    (spec §4 D6, §9). No operation lists the test identities, and no guide mentions them ✓ (`grep -rn "test
    user" docs/api/` finds nothing).
  - On the laptop the same local IdP signs people in to Manifest too, so the instructor's own session carries
    straight into their app. That is why the prototype's *"You are signed in as yourself"* looks true. **At UBC
    it is false**: Manifest's own sign-in is real CWL there, and the app's is the Manifest IdP asking for a test
    account.
  - **A pilot with even five real students is a full production launch.**
- **Why it matters:**
  - The moment the idea becomes a real thing is the moment the person meets a login page they cannot get through.
  - **The agent cannot try its own app either.** It has no pretend person to be and no browser, so it can prove
    only that the app started and answered (`getInstanceOutput`), never that a student can use it (walk-through
    moment 6). A read of the pretend people, with a way to sign in as one that a program can follow, would let
    the lead check its own work before the person looks.
- **Options:**
  - **(a) Recommended:** a read of the pretend people an app's sandbox and staging accept: a name, a role in
    words, and how to sign in as them. They are not secrets, since they authenticate nobody real. The guide
    says the rest.
  - (b) The Manifest IdP offers *"continue as a pretend student"* with no password, for sandbox and staging only.
  - (c) Only the guide says it, and the front-end hard-codes the test users. It drifts at UBC.
- **When:** sitting 11's *Building a front-end* at the least. (a) is a small read, and could land in sitting 10
  beside the console and mock work.

---

## The week-eight fear

### FE-4 — Nothing notices a running app that has died

- **Screen and moment:** *Week eight, it breaks* (moment 19); *Your apps* and the project page every time
  anyone looks.
- **What we would call:** an event, an Incident, or an instance state that says the live app stopped answering.
- **What is missing:**
  - A running app's health is read only inside a deploy: the ONE caller of `driver.status` is
    `releases/release.ts:1185` ✓.
  - An Incident is captured only when a deploy fails: the ONE caller of `captureIncident` is
    `releases/release.ts:881` ✓.
  - App containers run with `RestartPolicy: { Name: 'no' }` ✓ (`runtime/docker/hardening.ts:32`), commented
    *"a crash becomes `failed` and an Event, not a loop"*. But nothing turns the crash into either.
  - So an app that crashes in week eight still reads `healthy` everywhere, while students get the edge's 502.
    §14's per-app metrics (request count, error rate, p95, memory, AI spend: *"Sufficient for a faculty
    dashboard"* ✓, spec §14) are neither built nor in the plan.
  - The reconciler that would notice is Phase 4 (D10).
- **Why it matters:** the design system's reason for existing is this person's fear of *"week eight during an
  assessment, in front of two hundred people"*. Today the platform would tell them everything is fine.
- **Options:**
  - **(a) Recommended:** a small watcher, before Phase 4's reconciler. It reads each serving instance's status
    on a timer, marks a dead one `failed`, and captures an Incident with its last output. That is the Incident
    path the deploy already has.
  - (b) The front-end's server probes each live address and notices the edge's 502. It is outside the platform,
    it cannot see why, and it cannot read production output.
  - (c) The design says plainly that Manifest cannot tell yet.
- **Meanwhile (decided by Rich, 2026-09-27): (b), with a restart.** Our server watches every live address once a
  minute, emails the owners when it stops answering, and offers *Start it again* (a fresh `deploy` of the same
  release, with step-up). It cannot say why, cannot see an app that answers wrongly, and watches only while it
  runs. **It is a stop-gap, and FE-4 stays the platform's top item** (walk-through moment 19).
- **When — decided by Rich, 2026-09-27: Phase 4, as specified** (D10's reconciler). The front-end's watch is
  the stop-gap until then, for longer than recommended. This is still the most consequential item here.

---

## The rest, most consequential first

### FE-5 — A question an agent raises does not say what it is asking

- **Screen and moment:** the question an agent raises (the prototype's *Queue*); *Your apps*' needs-you band.
- **What is missing:**
  - `PendingAction.summary` is the ROUTE's summary (*"add a member to this project"*) ✓
    (`tokens/pending.ts:57`, `api/contract/route.ts:225`).
  - The body is never stored, only `bodySha256`, described as *"SHA-256 of the canonical request body, so a
    client can match its own"* ✓. The canonical form is not published.
- **Why it matters:** a person asked *"may it add a member?"* cannot see *who*. Asked *"may it put this live?"*,
  they cannot see *which version*.
- **Options:**
  - **(a) Recommended:** the question carries the specific object: for a member, who and what role; for a
    deploy, which release and which environment. Taken from the request, and never a secret.
  - (b) Publish the canonical form, so a front-end whose own agent asked can show and prove what it asked.
    That helps only the agent the front-end runs.
- **When:** not in the plan. (b) is a sentence in the guide (sitting 11).

### FE-6 — The owner cannot start the long clocks, and the drafts D19 promises do not exist

> **Three clocks, not two, since FE-24** (Rich, 2026-09-27): **the staging registration** with UBC IAM (reviewed,
> with a wait, and needed before the trying-out address signs anyone in), the **production registration**, and
> the **privacy assessment**. All three need the same things from the platform: a generated draft, an owner's
> *"I've sent it"*, and a state that can say *waiting*.

- **Screen and moment:** *Before your students can use it* (moment 10), from week one; *Going live* (moment 11).
- **What we would call:** *Draft the request* (a registration package for UBC IAM) and *Fill in what we know* (a
  privacy assessment draft). Then *"I've sent it"*, so the clock starts.
- **What is missing:**
  - No operation generates either document ✓: the contract's launch schemas are `IamRegistration`,
    `PrivacyAssessment`, `LaunchRecords` and the two *record* requests.
  - `recordIamRegistration` and `recordPrivacyAssessment` need `launch:record`, an administrator's and a
    person's-only capability (`projects/authz.ts:62-75`).
  - The owner has no write on this page at all. `LaunchReadinessItem.state` is `met · unmet · not_built`, with
    nothing for *"submitted, waiting"* (rationale F3).
- **Why it matters:** spec §13: *"A faculty member should never discover the existence of a PIA on the day they
  wanted to launch."* The page can show the clock and cannot start it.
- **Options:**
  - **(a) Recommended:** the two generated drafts (D19, §9), read by the owner.
  - (b) An owner's *"sent on <date>, reference <x>"* that moves a record to `submitted`, so waiting shows as
    waiting.
- **When:** not in the plan. D19 is Phase 2 by §17.

### FE-7 — The event stream remembers 50 events

- **Screen and moment:**
  - *Coming back after three weeks* (moment 16): *"what happened since you were last here"*.
  - Our server's notifications (rationale F9, which is ours by design): if our server was down, it cannot catch
    up.
- **What is missing:** the replay is the last 50 events, with no cursor, and there is no REST read of events
  (openapi:3172).
- **Options:**
  - **(a) Recommended:** a cursor, *events after id X*, on the stream's replay or as a paged read. D23.2 keeps the
    stream the source.
- **When:** not in the plan.

### FE-8 — Build progress has nothing a faculty member can read (rationale F1, still standing)

- **Screen and moment:** *Watching it get built* (moment 6).
- **What is missing:** `LogFrame.text` is raw builder output, and the only build events are
  `build.started · succeeded · failed` ✓. `build.failed`'s sentence is *"… could not be built. Its build log says
  why."*
- **Meanwhile:** our agent's model can read `getBuildLog` and say what went wrong in words. That is a
  translation, and it is paid for from the person's budget.
- **Options:**
  - (a) A handful of build-stage events: *dependencies installed*, *checked for security problems*, *stored*.
    The scan window's ten silent seconds (RUNBOOK) is one of them.

### FE-9 — Launch sentences are written for developers (rationale F2, still standing, and not in the plan's list)

- **What is missing:** `LaunchReadinessItem.why` cites spec sections, decision numbers, *"image digest"*, *"Phase
  2"* and entity ids ✓ (`launch/readiness.ts:204, 268, 354, 590`). `owner` is free text.
- **Meanwhile:** the front-end writes its own sentence for every item `id` × `state`. That drifts the day an item
  is added.
- **Options:**
  - (a) A faculty-legible sentence beside `why`, under the same contract events already keep (`humanMessage`).

### FE-10 — *Your apps* costs one read per app, several times over

- **What is missing:** `listProjects` takes no parameters ✓. A card needs `getProject?expand=environments`,
  `getLaunchReadiness`, `listPendingActions` and `listIncidents` for each app. For an administrator
  `listProjects` answers every project on the platform ✓ (its schema description).
- **Options:**
  - (a) `?expand=environments` on `listProjects`, which D23.1 permits *"where round-trips genuinely hurt"*.
  - (b) A cross-project read of pending actions for the caller.
  - (c) `?member=me` for an administrator's own list.

### FE-11 — Removing a colleague does not stop their agent

- **What is missing:**
  - A token outlives its minter's membership ✓ (ORIENTATION §3, *"A token therefore outlives its minter's
    membership"*).
  - Only the minter may revoke it (`api/routes/tokens.ts:303-311`), and `Token` has no minter field.
- **Why it matters:** an owner removes a TA in week five, and the TA's agent keeps working on the app for up to a
  year.
- **Options:**
  - (a) Removing a member revokes their tokens on that project.
  - (b) An owner may revoke any token on their project, and `Token` names its minter.

### FE-12 — `Project.owner` is the creator for ever

- **What is missing:** set at creation (`projects/repository.ts:81`), never updated, and there is no `owners[]`.
  After a hand-over the most-read line on the project names the wrong person.

### FE-13 — What is serving and what the last attempt did: still two reads, and a refused deploy leaves nothing

- **What exists:** `listInstances` marks `serving` ✓, newest first, so the last attempt is its first entry.
- **What is missing:** a deploy refused before an instance exists (a secret not set; the launch gate) leaves no
  row anywhere. The person's *"what you tried last"* then has nothing to show.
- **Options:**
  - (a) `Environment.lastAttempt`, as the rationale's F6 proposed.

### FE-14 — An app's AI spend, its quota, and how many people used it

- **What is missing:**
  - Per-project AI spend has no read. The fleet says *"Not yet"*, and the plan gives it to the admin console
    (plan's *What this plan does not build*).
  - `Project` has no quota field, although `RELEASE_AI_BUDGET_MISSING` tells the owner to ask for more.
  - There are no request counts (§14's metrics).
- **Why it matters:** *"Can ask an AI model, on a budget"* is a chip on the create screen. The owner cannot see
  the budget.

### FE-15 — The audience cannot be changed (rationale F8's remainder)

- §24: upward is an administrator's approval, downward immediate; neither has an operation. The plan names it as
  not built.
- The create screen has to say so at the moment of choosing.

### FE-16 — Smaller

- **`Token.capabilities` is an open array on read** (rationale F10) while capabilities keep arriving
  (`output:read`, `agent:session`). The front-end renders an unknown one as *"something we can't describe yet"*.
- **Step-up's residuals** (F4):
  - the capability being re-proved is only in the human `message`;
  - `Me` has no *stepped-up until*;
  - `deploy` and `setAppSecret` declare `STEP_UP_REQUIRED`, though only their production cases raise it.
- **Event sentences name the slug, not the name** (`release.ts`, `build.ts`), after sitting 5 gives projects
  names.
- **A spent session cap and a spent month are both LiteLLM `429 budget_exceeded`**, told apart only by the
  message (plan Task 9's measurements). The front-end must read `getAgentBudget` to know which to say.
- **`manifest-mock` is stateless and answers no `SLUG_INVALID` or `SLUG_RESERVED`** (rationale F11). A flow
  cannot be developed against it, and the hardest copy has no fixture.
- **No course-restricted access and no LTI.** `integrations` is reserved (`maxItems: 0`), `auth.audience` is
  reserved, and `frame-ancestors 'self'` also keeps an app out of a Canvas page. The front-end can only say
  *"post the link"*.

### FE-17 — A refused sign-in shows the person raw JSON

- **Screen and moment:** *Sign in* (moment 1), when the platform refuses an assertion: unbound, expired, or for
  the wrong person on a step-up.
- **What is missing:** the SAML callback is the platform's page, and a refusal *"maps to 401 with an envelope"*
  ✓ (the comment beside `samlSp.validate` in `packages/control-plane/src/api/routes/auth.ts`). The browser
  arrived there by the IdP's auto-submitting form, so what it answers is what the person sees.
- **Options:**
  - (a) A browser arriving at `/auth/*` is answered a short page, or redirected to the origin's `/` with a code
    the front-end renders. The JSON stays for a non-browser caller.

### FE-18 — `@manifest/contract` as a package another repository consumes

The research pass, confirmed in part by the console's own `package.json` ✓ (it consumes the package as
`workspace:*`, inside the monorepo, where none of this bites):

- **Its runtime is `dist/index.js`, which git ignores.** A sibling that links it must build it first.
  - **Measured by F1's sitting 1 (M1, 2026-09-27): it is worse than a missing build.**
  - The platform session rebuilds `dist/` in its own working tree (17:09, and again at 17:43 that day).
  - A sibling that forgets its alias, or runs plain `node`, or `tsx` without `paths`, **silently runs whichever
    build is there, and every test still passes.**
  - We resolve to `src/` in Vite, Vitest and `tsx`, and F1's Task 2 adds a test that holds it there.
- **Its `dist/*.d.ts` are broken**: `schema.d.ts` is never copied into `dist/`. A consumer takes the types from
  `src/`, which needs `moduleResolution: bundler` (or `nodenext`).
- **`src/errors.ts` uses constructor parameter properties**, which `erasableSyntaxOnly` refuses. Recent
  `create-vite` templates turn that flag on.
- **The version did not move when an operation was added** (1.4.0 before and after `updateProject`). The plan
  says so on purpose (*"it stays numbered 1.4.0 through this plan while it grows"*). A consumer therefore cannot
  tell two 1.4.0s apart except by the commit.
- **Guides lag the contract** (sitting 11 is the fix):
  - `agents.md` still says reading an app's output is *"not available yet"* ✓;
  - `authoring.md` still says text only;
  - nineteen operations are explained in no guide, among them the person's side of a pending action and member
    management.

### FE-19 — A toolkit's know-how has no home in the API

- **Screen and moment:** *Watching it get built* (moment 6), whenever the lead agent calls a specialist: CWL,
  Canvas, the academic API, encryption at rest, RAG over Qdrant, and more (Rich, 2026-09-27: *"just like we have
  a toolkit/library for CWL integration, we have quite a few other toolkits which help us integrate with other ubc
  systems"*).
- **What we would call:** *"how does an app use toolkit X, and what must it declare to do so?"*, versioned with
  the toolkit.
- **What is missing:** D25 serves one knowledge pack per BLUEPRINT (`getKnowledgePack`). CWL's know-how lives
  inside `node-ts-mongo@1`'s pack because that blueprint wires it. There is no toolkit catalogue and no per-toolkit
  pack.
- **Why it matters:** each specialist's knowledge must match what the platform will let an app declare, reach
  and be given. That is the platform's to state, exactly as D25 argues for blueprints. A bring-your-own agent
  needs the same knowledge.
- **Options:**
  - **(a) Recommended:** toolkits as a catalogue beside blueprints, each with a knowledge pack, the manifest
    fields it needs, and the blueprints it works with. D30's descriptor argument, applied to a second axis.
  - (b) The front-end keeps its own copy of each toolkit's know-how. It drifts, and is invisible to anyone else's
    agent.

### FE-20 — Nothing for Canvas, the academic API, or any UBC system beyond CWL

- **What is missing:**
  - `manifest.yaml`'s `integrations` is **reserved: `maxItems: 0`** ✓ (`ManifestYaml.integrations`, *"Reserved
    (§15): must be empty"*).
  - Today an app can reach an outside API only by `egress.allow` naming its host, plus an app secret holding
    whatever credential it needs.
  - There is no LTI, no Canvas course an app belongs to, and no institutional credential brokered by the
    platform.
- **Why it matters:** *"connect to Canvas"* is among the first things a faculty member will ask for. Today the
  honest answer is *"we can't yet"*.

### FE-21 — A RAG app needs a blueprint that offers Qdrant

- **What exists:** Qdrant is in the platform's service catalogue ✓
  (`packages/control-plane/src/services/catalogue.ts:55`, `SERVICE_CATALOGUE: Record<'mongo' | 'qdrant', …>`).
  `default-embed` (nomic-embed-text) is in the model catalogue ✓.
- **What is missing:** `node-ts-mongo@1` provides `services: [mongo]` only ✓
  (`blueprints/node-ts-mongo/blueprint.yaml:40`). A RAG app declaring `qdrant` would be refused by the blueprint's
  compatibility check.
- **Options:**
  - (a) Extend the blueprint to offer Qdrant, additively.
  - (b) A second blueprint for retrieval-backed apps, which is what D3's blueprint-choosing agent would then
    choose between.

### FE-22 — Course material: where it lives, and which model may read it

- **Screen and moment:** a domain specialist working while the app is being made (*"generate questions from my
  readings"*, Rich's *both, kept separate*), and an app whose students do the same at run time.
- **What is missing:**
  - **While the app is being made**, the material is the front-end's to hold. The platform says nothing about
    which models may read *course material* rather than *app data*. D17 classifies an APP's data
    (`data.classification`), and an agent session's models follow the project's classification (plan Decision
    23). A reading pack with students' names in it goes wherever the session's models go.
  - **At run time**, material committed into the app is bounded at 2 MiB per file (sitting 3) and scanned for
    secrets. Material uploaded by students is the app's own data, under its classification.
- **Why it matters:** faculty will paste in whatever they have, and FIPPA is why D17 exists.
- **Options:**
  - (a) The platform states the rule for material given to an agent session: it is governed by the project's
    classification, and the front-end asks before sending anything that looks personal.

### FE-23 — What one piece of work has cost ⏰ *before sitting 7*

- **Screen and moment:** every conversation, always (walk-through moment 6). Rich chose, 2026-09-27, that
  faculty see the allowance as money, *always visible*: *"$0.40 so far · $9.60 left this month"*.
- **What we would call:** the spend of each agent session, which our server sums per conversation.
- **What is missing:**
  - `getAgentBudget` answers the MONTH (plan Decision 24).
  - The plan's *What this plan does not build* names it outright: *"A session's own spend — getAgentBudget
    answers the month; per-session spend is LiteLLM's `/key/info`, one call per session, and no screen needs it
    yet."* **This screen needs it.**
  - Differencing the month before and after is wrong whenever two conversations run at once.
- **Options:**
  - **(a) Recommended:** `AgentSession.spentUsd`, `number | null` with the month's rule (never `0` when LiteLLM
    does not answer), read from LiteLLM's `/key/info` by the alias the plan already derives (`mf-agent-<id>`).
    It is answered by `listAgentSessions`, cached like the month.
- **When:** sitting 7 builds `AgentSession` and `listAgentSessions`. One field there; a change to a published
  representation after.

### FE-24 — Staging is UBC's real staging world, not the fake one — **a spec action, stated by Rich 2026-09-27**

- **Rich, 2026-09-27:** *"in the sandbox we will use the fake IdP, but in staging, we'll actually be connecting to
  the real Staging IdP from UBC's Identity and Access Management team. The sandbox is where the agents and
  instructors can log in freely with fake users, but the staging environment has a real connection to real
  (staging) services at the university. Same with Canvas and Academic API etc. Sandbox will be a fake
  environment, staging will be a real staging environment, and production (of course) will be real."*
- **What the approved spec says today** ✓, and what the platform is built to:
  - **D6**: *"The Manifest IdP… serves **sandbox and staging** with test users."*
  - **§9's table**: sandbox and staging share a column, with automatic registration in seconds.
  - **D21**: a rehearsal against UBC's staging IdP is a launch-readiness item, *"not part of the daily build loop.
    … Staging on the Manifest IdP keeps iteration frictionless"*.
- **What the change touches:**
  - D6; §9's identity table and *Sandbox and staging: SP auto-provisioning*; D21 and §13's checklist (the
    rehearsal item); §8's injection of `SAML_*` for staging;
  - §21 (*Honest divergences*): the laptop cannot reach UBC's staging IdP offline (C1), so laptop staging needs a
    stated stand-in;
  - §15's `integrations` (Canvas, the academic API): sandbox fakes, staging's real staging instances.
- **Questions only Rich or UBC IAM can answer, which the walk-through waits on:**
  1. ~~Is an app's registration with UBC's staging IdP a request IAM reviews, with a lead time?~~ **ANSWERED by
     Rich, 2026-09-27: IAM reviews it, with a wait.** So:
     - the *trying-out* address signs nobody in until IAM has registered it for staging;
     - **it is a third clock**, beside the production registration and the privacy assessment, and the earliest
       of the three;
     - most trying happens on the draft address meanwhile.

     The platform has no object for it: `IamRegistration` is production's alone ✓ (its `entityId` is
     production's), and D19's generated package does not exist (**FE-6**).
  2. ~~On the laptop, is staging the fake IdP?~~ **ANSWERED by Rich, 2026-09-27: yes.** On the laptop, staging
     uses the fake sign-in, stated in §21's honest divergences. C1 forbids a laptop that needs UBC's network.
  3. ~~Who signs in to staging?~~ **ANSWERED by Rich, 2026-09-27:** *"Folks can get a staging cwl. It's
     separate and distinct from their production CWL. There's no "test" accounts. Only accounts associated with a
     real person, like production."*
- **The consequence the spec is built against: staging then serves REAL PEOPLE**, and three things rest on it not
  doing so.
  - **§14's recent-output read.** It is allowed in sandbox and staging *because* ✓ *"Sandbox and staging serve
    the Manifest IdP's test users and never a real person"* (spec §14, line 1531). Enablement sitting 2 built it
    on exactly that reasoning: production is refused `403 INSTANCE_OUTPUT_PRODUCTION` ✓
    (`packages/control-plane/src/api/routes/instances.ts:189`), and staging is not.
    - Under FE-24 a staging app's output can carry real people's names and emails.
    - Our agent reads it (walk-through moment 6), and so do its models, which are chosen by the project's data
      classification.
    - **Recommended: the output read becomes sandbox-only**, and staging is refused like production. That moves
      *"Checking it answers"* entirely to the draft address, where it belongs anyway.
  - **D6's reason for staging's attribute release, and the harvesting argument in D16**, both assume test users.
  - **The privacy assessment's scope.** Does a PIA cover an app's staging use by real people with staging CWLs,
    or does staging need its own cover? A question for the Privacy Office, through Rich.
- **For the walk-through:** the instructor, a TA, or a colleague tries the trying-out address with their own
  staging CWL, and so can a few real students who have one. **How a person gets a staging CWL** is UBC's process,
  and the card links to it.
- **The drafted spec words wait on the answers above**, and are then Rich's to read before the platform session
  applies them.

### FE-25 — Nobody is told that an app is waiting for an administrator's sign-off

- **Screen and moment:** *Waiting on an administrator* (walk-through moment 13).
- **What we would call:** *"please look at this"*, so the person has a date to count from, and an administrator
  has a queue entry.
- **What is missing:**
  - Approval starts from the administrator's side (`createApprovalPreview`).
  - Nothing records that an owner wants one: a refused production deploy writes no event and no request (the
    research pass; admin console design A3).
  - `getApproval` answers only once decided.
- **Why it matters:** *"Name the owner of every wait"* (`10-language.md`). This wait has an owner who does not
  know it is theirs.
- **Options:**
  - (a) An owner's request for sign-off on the release serving staging: an event on the stream, and a row in
    §26's queue. It is D31's queue *"of things blocked on a human"*, fed from the side that is blocked.

### FE-26 — `manifest-mock` accepts any session, and starts only by building inside manifest

*Found by F1's sitting 1 (M5), 2026-09-27, against manifest `8bb6b22`. Not yet carried to the platform session.*

- **Screen and moment:** every signed-in screen, as the mock serves it. And our server's *"who is this?"* (FE-2),
  which is the one place a wrong answer lets one person see another's conversations.
- **What we would call:** `GET /v1/me` with a session the platform never issued, expecting
  `401 UNAUTHENTICATED`, as the platform answers.
- **What is missing:**
  - **The mock checks only that a `manifest_session` cookie is present, never its value**
    (`packages/mock/src/server.ts:778-791` ✓).
    - `manifest_session=nonsense` answers Instructor One, and so does `manifest_session=` (empty) (measured).
    - Only the value its own `/auth/login` sets, `mock-session` (`:613-621` ✓), should.
  - **Its only start script builds inside manifest.** `dev` is `pnpm run build && node dist/main.js`: `tsc`
    writes `packages/mock/dist` (its `package.json` ✓).
    - A sibling repository must not build there.
    - We run `createMockServer()` from source with `tsx` instead, which works because the mock imports only
      *types* from the contract.
- **Why it matters:**
  - A front-end cannot prove against the mock that it refuses a session it should not trust. F1's acceptance
    wanted to: its Task 8, step 7.
  - A bug where our server ignores the cookie would pass every mock-backed check. We prove it instead against a
    fake control plane of our own (F1 Task 5), and against the real one in edge mode.
- **Options:**
  - **(a) Recommended:** the mock answers `401 UNAUTHENTICATED` for any session other than the one it issued,
    and says so in its header comment.
  - (b) As well: a start script that runs from source (`node --import <a .ts resolver> src/main.ts`, as the
    repository's `resolve-ts.mjs` already does elsewhere), so starting the mock writes nothing.
- **When:** sittings 10–11, beside FE-18, which is the same subject: the platform's packages consumed from a
  sibling. F1 designs around both meanwhile.

### FE-27 — `manifest-mock` answers `listInstances` and `getRelease` from the document's example, whatever is asked

*Found by F1's sitting 3 (Task 4), 2026-09-27, against manifest `3c38199`. Not yet carried to the platform
session.*

- **Screen and moment:** *Your apps* (moments 2 and 16), and anything else that reads what an address is running.
- **What we would call:** `listInstances` on each of `mock-app`'s three environments, then `getRelease` for the
  serving instance's `releaseId`.
- **What is missing** (measured with `pnpm mock`):
  - **`listInstances` answers the same document example for every environment.**
    - It gives `environmentId df060503-…`, which is none of the three asked for.
    - It gives two instances: a `failed` one, and a *serving, healthy* one on release `165db6ac-…`, which the
      fixtures do not have.
    - It answers the sandbox and production exactly as it answers staging.
  - **`getProject?expand=environments` disagrees with it.** Its hand-written fixtures have the sandbox and
    production at `instance: null`, and staging healthy on release `55555555-…`.
  - **`getRelease` answers the fixture release for any id.** Asked for `165db6ac-…`, it answers
    `id: 55555555-…`, so a client never learns it asked for the wrong one.
- **Why it matters:** a front-end that reads what an address is running from `listInstances` (as the walk-through's
  moment 16 does, for the last attempt: FE-13) tells the person their app is *answering students* when, by the
  mock's own project, it is not live. A test against the mock then asserts something false, or a screen is
  designed around the mock rather than the contract.
- **Options:**
  - **(a) Recommended:** `listInstances` answers from the fixtures, per environment: staging's `INSTANCE`
    serving, and the sandbox and production empty. `getRelease` answers `404` for an id it does not have.
    Both as `getProject` already does.
  - (b) At least: the example's `environmentId` is the one asked for, so a client can see the answer is not
    about its environment.
- **When:** with FE-26, in sittings 10–11.
  - **F1 is not held up by it, and needs no workaround.** Its card has no use for the last attempt, and the
    contract gives it the exact value it needs: `Environment.instance`, *"the instance the hostname reaches"*
    (F1 Task 7, amended).
  - F6's needs-you band, which reads the last attempt, meets this finding head on.

---

## Not a gap: decisions that are Rich's

- **The building agent's model on the laptop is `qwen3.5:4b`**, a 4B-parameter model ✓ (`infra/models.txt`;
  `infra/litellm/config.yaml` maps all four chat names to it). Spec §21 already says offline agent quality will
  be poor. Whether the front-end is developed and demonstrated against it, or against a larger model behind the
  same LiteLLM (which keeps D2, D8 and D17 intact), is Rich's call. It is not a finding.
