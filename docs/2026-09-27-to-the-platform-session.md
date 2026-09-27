# To the platform session: what the faculty front-end needs, decided by Rich on 2026-09-27

*From the faculty front-end's first session. Rich copies this to the agent working the front-end enablement
plan's next sitting. It is addressed to that agent and to every sitting after it: please carry what outlives
your sitting into ORIENTATION, the roadmap and the plan, as your close-out rules say.*

---

**Who is asking.** The faculty front-end now exists as a separate project (spec §5) at
`/Users/rich/Developer/manifest-app`. It is served at `https://app.manifest.internal` from port **7105**, and
consumes the API through `@manifest/contract` by a pnpm `link:` to `../manifest/packages/contract`, so it reads
your working tree.
- Its first session wrote no code. It designed the faculty experience with Rich, moment by moment, and listed
  every gap it found.
- **Read-only for you, and worth reading before you act:**
  - `manifest-app/docs/api-findings.md`: every finding `FE-1`…`FE-25`, each with the screen, the moment, what is
    missing, options, and file:line evidence (✓ where re-read that session);
  - `manifest-app/docs/walkthrough.md`: the design the findings come from.
- **Please do not change anything in `manifest-app`.** It is another session's repository, as `manifest` is to
  it.

**Rich decided everything below on 2026-09-27**, in the front-end session. Record the decisions in ORIENTATION §8
*Decided*, and those that change this plan in its *Decided by Rich*, with the date. **The spec rule stands: each
spec change is applied only after Rich has read its exact words**, so every *spec action* below is yours to draft
and put to him.

## 1. Sitting 6 (the `app` origin) and sitting 11 (the guides): FE-2, who the front-end's server serves

**The fact.**
- `manifest_session` is set `HttpOnly`, `SameSite=Lax`, **`Path=/`** (`packages/control-plane/src/api/routes/auth.ts:72-80`).
- Decision 19 sends everything outside `/v1/*` and `/auth/*` to 7105.
- So **every page request on `app.manifest.internal` delivers the person's session to the front-end's server.**
  That server stores conversations and must know which person it is serving.

**Rich decided: allow the replay to `getMe`.**
- The front-end's server may send the cookie it receives to `GET /v1/me`, to learn who it serves, **and for
  nothing else**.
- Sitting 6 leaves the cookie alone.
- **Sitting 11's *Building a front-end* states the rule**: the server may replay the session to `getMe` only;
  never logs it, stores it, or uses it for any other call. A server can set its own `Origin`, so CSRF does not
  stop it. The rule is the control.
- The plan's current *"Two credentials, two places"* wording understates it. The session reaches the server
  whether the front-end wants it or not.
- *Rejected by Rich:* stripping the cookie at the edge, plus a *"who minted this token"* read; and a signed
  identity statement for the front-end's server.

## 2. Sitting 7 (agent sessions): FE-1, an intake session with no project; and FE-23, a session's own spend

**FE-1: approved by Rich in principle, to be built in sitting 7.**
- **Why.** A faculty member describes an app before a project exists. The front-end's *intake* agents need a
  model *before* the project is created:
  - one understands the description and asks follow-up questions;
  - one suggests names, with addresses checked through `checkSlug`;
  - one chooses the blueprint and starter.
- **Rich:** *"the 'understanding what the user asked for, proposing names, etc.' can be considered a platform
  cost. That will always be the same model for all users (and that's something we'll need to set as part of our
  options at the platform level). So I approve of that spec change."*
- **The shape:**
  - **Started only by an interactive session** (a token belongs to one project). The key is answered once and
    never stored (`withholdOnReplay`), and the browser hands it to the front-end's server.
  - **No project**: `AgentSession.projectId` is nullable, or a small table of its own. Your call.
  - **One model, named by a platform setting** (an administrator's). It must be one D17 allows for §7's default
    classification, `internal`, since there is no manifest yet.
  - **Paid by the platform, bounded per person**, all as settings. Recommended: **$0.25 and 30 minutes per key,
    and 10 keys per person per day**. Intake is a short conversation of several calls, not one. Running out has
    its own refusal code; the front-end shows *"Describing new apps is paused for today."*
  - Confined like every key: the three `allowed_routes`, and no capability on the control plane. It is audited
    against the person; there is no project stream to publish on.
- **Spec action (yours to draft, Rich's to read):** D2 (a platform-paid exception), §10's key table (an *Intake
  key* row), a §10 paragraph, and §20's agent-key sentence. A first draft of the words is in
  `manifest-app/docs/api-findings.md`, FE-1. Use it or improve it.
- **If sitting 7 runs long**, the plan's own rule applies: FE-1 opens the next sitting.

**FE-23: `AgentSession.spentUsd`, into sitting 7.**
- Rich chose that faculty see the AI allowance **always**, per conversation: *"$0.40 so far · $9.60 left this
  month"*.
- The plan's *What this plan does not build* says per-session spend is *"one call per session, and no screen
  needs it yet"*. **This screen needs it.**
- Recommended: `spentUsd: number | null` on `AgentSession`, read from LiteLLM `/key/info` by the alias the plan
  already derives (`mf-agent-<id>`). It follows the month's rule: `null` with a reason, never `0`, when LiteLLM
  does not answer. It is cached like the month.

## 3. A decision to plan: the building agent's model

**The fact.** `infra/models.txt` and `infra/litellm/config.yaml` point all four chat names at `qwen3.5:4b`, and
sitting 7's keys reach exactly those. Writing a working CWL-and-database app through tool calls against the
authoring API is very likely beyond a 4B model.

**Rich decided: add a capable model option.**
- It sits behind the same LiteLLM, so D2, D8 and D17's budgets and routing stay intact, with the
  `max_classification` D17 allows it.
- **`qwen3.5:4b` stays as the offline floor (C1).** FE-1's intake setting may name the capable one.
- **Which provider is UBC's call.** Please put the options to Rich (C1, §21's inventory, D17's classification
  per provider) as a decision, and place it in the roadmap. It is not in this plan's scope unless he says so.

## 4. A spec action now, and code in sitting 10: FE-24, staging is UBC's real staging world

**Rich, 2026-09-27:** *"in the sandbox we will use the fake IdP, but in staging, we'll actually be connecting to
the real Staging IdP from UBC's Identity and Access Management team. The sandbox is where the agents and
instructors can log in freely with fake users, but the staging environment has a real connection to real
(staging) services at the university. Same with Canvas and Academic API etc. Sandbox will be a fake environment,
staging will be a real staging environment, and production (of course) will be real."*

**His answers to what that raised:**
- **An app's staging registration with UBC IAM is reviewed, with a wait.** It is a third clock, beside the
  production registration and the privacy assessment, and it gates the trying-out address.
- **Staging accounts are real people's:** *"Folks can get a staging cwl. It's separate and distinct from their
  production CWL. There's no 'test' accounts. Only accounts associated with a real person, like production."*
- **On the laptop, staging keeps the fake sign-in**, stated in §21's honest divergences (C1).

**The spec today says the opposite**, so this is a spec action for you to draft and Rich to read:
- D6: the Manifest IdP *"serves sandbox and staging with test users"*;
- §9's identity table and *Sandbox and staging: SP auto-provisioning*;
- D21 and §13's `rehearsal` item: *"not part of the daily build loop… Staging on the Manifest IdP keeps iteration
  frictionless"*;
- §14's recent-output read: *"Sandbox and staging serve the Manifest IdP's test users and never a real person"*
  (§14, line 1531);
- §21's divergences; §15's `integrations`.

**The one code consequence, in sitting 10.**
- Staging will serve real people. **`getInstanceOutput` should refuse staging as it refuses production**, by a
  code that names the rule, so the recent-output read is sandbox-only.
- Today production is refused `403 INSTANCE_OUTPUT_PRODUCTION` (`packages/control-plane/src/api/routes/instances.ts:189`),
  and staging is not.
- The front-end's agent already reads only the sandbox's output, by design.

**Open questions to carry**, in ORIENTATION §8 and the external track:
- whether D21's rehearsal keeps a purpose once staging exercises UBC's staging IdP every day;
- **whether a privacy assessment covers an app's staging use by real people** (a Privacy Office question);
- the staging registration as a tracked object. It belongs with FE-6, below.

## 5. Sittings 10–11: three small ones folded in

- **FE-17 — a refused sign-in shows the person raw JSON.**
  - The SAML callback is the platform's page, and a refusal *"maps to 401 with an envelope"* (the comment beside
    `samlSp.validate` in `api/routes/auth.ts`).
  - A browser that arrived by the IdP's auto-submitting form sees that JSON.
  - Asked: a browser refused at `/auth/*` is shown a short page, or sent to its origin's `/` with a code the
    front-end renders. The JSON stays for a non-browser caller.
- **FE-18 — `@manifest/contract` consumed from a sibling repository**, through `link:`. These come from a
  read-only research pass; please verify:
  - its runtime is the git-ignored `dist/index.js`, so a consumer must build it first;
  - **`dist/*.d.ts` are broken, because `schema.d.ts` is never copied into `dist/`**;
  - `src/errors.ts` uses constructor parameter properties, which `erasableSyntaxOnly` refuses.

  Asked: `dist/` complete with its types, and a sentence in *Building a front-end* on consuming the package from
  outside the workspace.
- **FE-5's guide sentence.** `PendingAction.bodySha256` is *"the canonical request body"*, and the canonical form
  is published nowhere. Asked: publish it, so a front-end whose own agent asked can show a person exactly what
  was asked.
  - The fuller ask, that the question names who or which release, is queued.

## 6. After the enablement plan, in Rich's order

1. **The launch path first: FE-6 and FE-25.**
   - The three clocks (staging registration, production registration, privacy assessment): D19's generated
     drafts, an owner's *"I've sent it"*, and a state that can say *waiting since*.
   - The staging registration as a tracked object, like `IamRegistration`.
   - An owner's *"please sign this off"* for a release, feeding §26's queue. Today no administrator is told, and
     nothing records it.
2. **Then:**
   - toolkits' know-how served like knowledge packs (FE-19);
   - Canvas and the academic API, since `integrations` is reserved (FE-20);
   - Qdrant in a blueprint, for RAG apps (FE-21; it is in the service catalogue, but `node-ts-mongo@1` offers
     only `mongo`);
   - the rule for course material given to an agent session (FE-22);
   - events after a cursor (FE-7; the replay is 50 events);
   - the sandbox's pretend people as a read, with FE-24's plan (FE-3).
3. **FE-4 — nothing notices a live app that has died — stays in Phase 4, as specified (Rich).** Health is read
   only inside a deploy (`releases/release.ts:1185`, the one caller of `driver.status`); an Incident is captured
   only on a failed deploy (`:881`); `RestartPolicy: 'no'` (`runtime/docker/hardening.ts:32`). A crashed live app
   reads `healthy` while students get the edge's `502`.
   - **Meanwhile the front-end's server watches every launched app's production address once a minute through
     the edge.** It emails the owners when the address stops answering, and offers a fresh `deploy` of the same
     release, with step-up.
   - **Please know it is there:** one request a minute per live app, on the public listener.
4. FE-8 to FE-16 are smaller, each with its own options in `api-findings.md`.

## 7. How the front-end will use the platform (so nothing surprises you)

- **The browser, in the person's session:** creates projects, mints tokens, answers questions, steps up,
  deploys to production, manages members, archives and deletes.
- **The server, with tokens the browser mints and hands it:**
  - **one per conversation** (`project:read`, `source:write`, `secret:write`, `build:create`, `release:create`,
    `release:deploy`, `output:read`, `agent:session`; seven days), named after the conversation, so
    `madeThrough.tokenName` and `AgentSession.via` name the thread;
  - **one standing *Keeping watch* token per project** (`project:read`, `output:read`), for its stream
    subscription, its history and its emails.
  - Archive revokes both kinds; restore re-mints.
- **Only the front-end's lead agent calls the platform.** Its specialists propose and never hold a token. The
  lead never asks for a privileged action: going live, members and archive are the person's own buttons.
  **D24's pending actions will therefore mostly come from agents people run elsewhere.**
- **It keeps its own record of the events it saw**, because the stream replays 50 and there is no history read
  (FE-7). It keeps no launch state of its own.

## 8. Keeping in step (Rich's choice)

- **Each sitting's close-out lists what it changed in the contract**: operations, fields, codes, events. Rich
  relays it to the front-end's session, which re-reads `openapi.json`.
- **Please keep `packages/contract` buildable at every commit.** The front-end links your working tree, so a
  half-finished contract reaches its typecheck.
- **When a plan reaches ORIENTATION, a line on the front-end's existence and where its findings live** will save
  the next agent from rediscovering them.
