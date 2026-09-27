# What the first session read, and what surprised it

*2026-09-27, the faculty front-end's first session. Written for a reader who was not there. The platform was
read at `manifest` commit `a2918af`, with **sitting 5 of the front-end enablement plan uncommitted in its working
tree**, which matters for reason 7 below. Nothing in `manifest` was changed.*

## What was read

- **The platform:** ORIENTATION §1–§3 (*What the platform keeps true*, the identity, API, token, D24 and launch
  facts); the spec's §1, §3, §3.5, the decision log (D1–D33), §5, §9, §10, §11 *Ending an app*, §13, §14, §20 *front
  door* and *Credential classes*, §21 *The front-end in the local topology*, §22, §23 *zones* and *slug check*, and
  §24; the front-end enablement plan's header, *Decided by Rich*, Decisions 1–31, Tasks 14–15 and *What this plan
  does not build*.
- **The design:** `design/README.md`, the system's `README.md`, `10-language.md` and `20-states.md`; the design
  rationale in full; the interface design brief's §3–§4. Clicked through 14 of the 17 prototype screens in a
  browser, served locally.
- **The API as it is:** `docs/api/agents.md` and `launching.md`, the contract's operation list and the schemas a
  faculty screen reads, the console's `api.ts`, `stream.ts` and `auth.ts`, and RUNBOOK's *Running `manifest-mock`*.
  The session cookie's flags were read in `packages/control-plane/src/api/routes/auth.ts`, the edge's console site
  in `infra/caddy/Caddyfile`, and the model catalogue in `infra/litellm/config.yaml` and `infra/models.txt`.
- **Three read-only research passes ran alongside**: a digest of the whole contract, an inventory of the prototype
  and the component bundle, and a re-check of the rationale's F1–F13. What they found is in
  [`api-findings.md`](./api-findings.md).

## What surprised me, most consequential first

**1. The prototype does not draw the inside of a conversation, and that is where this product spends its time.**
Describe and Draft come before any work starts. Iterate is a step list for one change. Conversations is a list.
Nowhere shows what a person sees while the agent works: the questions it asks, what it has done so far, what it
is waiting for. The rationale's §12 says so (*"The inside of a conversation… is not drawn"*). It is the main piece
of new design work.

**2. On the laptop, the agent that builds the app has one model, and it is small.** `infra/models.txt` and
`infra/litellm/config.yaml` map all four chat names (`default-chat`, `-onprem`, and the two `-reasoning` ones) to
**`qwen3.5:4b`**. Agent sessions (sitting 7) hand the front-end's agent a key to exactly these. Writing a working
CWL-and-database app through tool calls against the authoring API is a hard task for a 4B-parameter model. The
product's central promise, *an AI agent builds it*, will be judged on the laptop by the weakest model the platform
has. This is Rich's call, not a finding to route around.

**3. An agent session needs a project, but the description and the plan happen before there is one.**
`startAgentSession` is `POST /v1/projects/{projectId}/agent-sessions`. The prototype's Describe → Draft turns a
paragraph into a plan, and only *Yes, build that* creates the project. So the model that writes the plan has no way
to be paid for. The ways round it all cost something: create the project first, bring a model of our own, or ask
the platform for a session with no project.

**4. Trying the app out means signing in as a pretend person, and nothing tells the person that.** Under D6,
sandbox and staging are signed in by the Manifest IdP, which *"never authenticates a real user"*. The prototype's
Preview says *"You are signed in as yourself"*. On the laptop that happens to be true: the same local IdP signs
people in to Manifest as well, so the instructor's session carries through into their own app. At UBC it is false.
Manifest's own sign-in is real CWL there, and opening the trying-out address meets a Manifest IdP login page asking
for a test account the person has never heard of. **No operation names the test identities** an app can be tried
with, and no guide mentions them.

**5. The edge hands our server the person's full session.** `manifest_session` is `HttpOnly`, `SameSite=Lax`,
`Path=/`, so every page request on `app.manifest.internal` delivers it to 7105, our server. Our server has to know
who it is working for, because conversations are ours to store. The only way it can find out today is to replay
that cookie to `GET /v1/me`, which means our server holds a credential that can do anything the person can. It
works, but the platform should decide whether it is the sanctioned way.

**6. A question an agent raises tells the person almost nothing.** `PendingAction.summary` is the route's generic
sentence (*"add a member to this project"*), and the body is never stored, only `bodySha256`. The person
confirming cannot see *who* is being added or *which* version is going live. Our own agent's questions we can show
in full, because we made the request, but only if we can reproduce the platform's *"canonical request body"* hash.
Its canonical form is not published.

**7. The contract is moving under a `link:` dependency right now.** At the time of reading, `openapi.json` in the
working tree has **57 operations** (sitting 5's `updateProject` is there, uncommitted), where the commit it sits on
has 56. A `link:` dependency reads the working tree, so our typecheck will see half-finished sittings. This is the
cost we accepted when choosing `link:`. The plan has to say how we live with it.

**8. The launch page's two primary buttons have nothing behind them.** *Draft the request* (IAM) and *Fill in
what we know* (the privacy assessment) promise what D19 describes: a registration package and a PIA draft that
Manifest generates. No operation generates either. `recordIamRegistration` and `recordPrivacyAssessment` exist,
but an **administrator** calls them, after UBC has already answered. The faculty member has no operation of their
own on this page at all, not even *"I've sent it."*

**9. `manifest-mock` cannot carry a flow.** It is stateless by design: a created project does not appear in the
next list, and a build started does not change the build read. It is right for one screen at a time, and wrong for
*describe → watch it get made*.

**10. Two prototype screens change meaning in our architecture.**
- **Token**: our server holds the delegated token, so a faculty member never needs to see one. The screen becomes
  *let your own agent in*, a bring-your-own-agent path rather than the main road.
- **Queue**: in our product the agent should never *ask* to go live. Going live is the person's own button, with
  step-up. The queue then mostly serves agents the person runs elsewhere.

**11. Smaller things.**
- **The design README's "zero PATCH/PUT" is out of date**: `setAppSecret` is a `PUT`, and `updateProject` is on
  its way.
- **The People screen's "four things we ask you to prove it's you for" is stale.** Step-up now guards promoting,
  approving, members, reading a secret, quota, a production secret's value, archiving and deleting (§20).
- **`LaunchReadinessItem.why` still cites §23, D33, "Phase 2" and entity ids.** Every launch sentence on a faculty
  screen has to be ours.
- **The component bundle is a classic script for a global React 18**, with no source anywhere. We are on React 19.
- **`listProjects` takes no `?expand=`**, so *Your apps* costs one read per app to show each app's addresses and
  state, and one more per app for its launch band. For an administrator, it lists every project on the platform.
- **Going live has an order a person cannot see**: production deploys only the release serving staging, so a
  person's *put it live* must first be *put it where you can try it*.

## The rationale's thirteen findings, today

Checked against the contract in the working tree and the enablement plan. The research pass's evidence is in
[`api-findings.md`](./api-findings.md).

| | Finding (2026-09-19) | Today |
|---|---|---|
| F1 | Build log lines have nothing faculty-legible | **Stands.** `LogFrame.text` is raw builder output. The plan leaves it open. |
| F2 | `LaunchReadinessItem.why` is internal vocabulary | **Stands.** It cites spec sections, decision numbers and entity ids. |
| F3 | The checklist cannot express time | **Stands, partly eased.** `getLaunchRecords` has `updatedAt` and state for the two records, but only once an administrator has recorded them. Nothing covers *"started, waiting"*. |
| F4 | No re-authentication signal | **Closed.** `403 STEP_UP_REQUIRED`, then `GET /auth/step-up?returnTo=`. |
| F5 | Two different "privileged fours" | **Resolved in the platform, open in our copy.** Tokens are refused four; step-up guards a longer, different list. Our words must say both. |
| F6 | Serving and last attempt take two reads | **Eased.** `listInstances` marks `serving`, newest first, so the last attempt is its first entry. Still two reads. |
| F7 | No human name | **Closing in sitting 5** (in the working tree now). |
| F8 | Nothing is editable | **Mostly closed**: `createCommit`, `setAppSecret`, `updateProject`. **Audience still is not**: it goes through the administrators' queue under §24, and no operation exists. |
| F9 | Nothing reaches a person who is not looking | **Stands, and it is ours.** Our server subscribes to the stream and decides whom to tell. |
| F10 | `Token.capabilities` is an open array on read | **Stands.** |
| F11 | Two of three slug refusals have no fixture | **Partly closed**: the contract now carries a real `SLUG_RESERVED` example; the mock still answers neither it nor `SLUG_INVALID`. |
| F12 | An authenticated preview has nothing behind it | **Stands, and is sharper than it looked** (surprise 4). |
| F13 | No conversation object | **Ours by design.** Sitting 7 gives us `AgentSession.via`, and `madeThrough.tokenName` already exists, so a thread can be keyed to its token's name. |
