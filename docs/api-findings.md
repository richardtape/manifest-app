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
| **Sitting 7** | **FE-1** | An *intake* session with no project, platform-paid, on one model an administrator names | **Approved in principle; into sitting 7.** **Landed** (`3cb6c82`), measured by F2's sitting 1 |
| | **FE-23** | `AgentSession.spentUsd` | **Into sitting 7.** **Landed** (`313075d`), measured by F2's sitting 1 |
| **A decision to plan** | *the model* | A capable model behind the same LiteLLM, beside `qwen3.5:4b`, which stays the offline floor | **Add a capable model option**; the provider is UBC's call. **Landed in the platform's sitting 9a** (close-out `9c54bc3`, 2026-09-28): `default-chat-large`, at `max_classification` internal, is `openai/gpt-6-luna` (Rich's); a `confidential` project never gets it, so a client reads the names from `session.models`. The contract did not move (1.4.0). **Sitting 9b** (Spec action 8, Rich): when OpenAI fails, the network off included, the same name answers from the on-premise model (`default-chat-onprem`), at its price |
| **Spec now; code in sitting 10** | **FE-24** | Staging is UBC's real staging world (IdP, Canvas, academic API). On the laptop, staging keeps the fake sign-in. Recent output becomes sandbox-only | **Spec words now**, for Rich to read; `getInstanceOutput` refuses staging **in sitting 10** |
| **Sittings 10–11** | **FE-17**, **FE-18**, **FE-5** (its guide sentence) | A page, not JSON, for a browser refused at `/auth/*`; `@manifest/contract` consumable from a sibling repository; the canonical body hash published | **Fold these three in** |
| **After the enablement plan, first** | **FE-6**, **FE-25** | The launch path: the three clocks' drafts and state, the staging registration as a tracked object, and an owner's *"please sign this off"* | **The first of the front-end's asks** |
| **Then** | **FE-19**–**FE-22**, **FE-7**, **FE-3** | Toolkits, integrations, Qdrant, course material; events after a cursor; the sandbox's pretend people (with FE-24's plan) | ordered after the launch path |
| **Phase 4, as specified** | **FE-4** | Noticing a live app that died | **Phase 4's reconciler (D10)**; the front-end watches meanwhile |
| **Carried 2026-09-28**, at Rich's word | **FE-26**, **FE-27**, **FE-28**, **FE-29**, **FE-30**, **FE-31**, **FE-32** | The mock's session check and its examples; the session cookie's `__Host-` prefix; a refusal's facts as fields (whose limit, when it resets, which session); a request id that reaches the platform's log; a test fixture offered by `listBlueprints`; a way for an agent to get a `package-lock.json` | **Decided by Rich (2026-09-28), each its option (a)**: FE-28, FE-31 and FE-30 before faculty use it for real; FE-29 when the envelope is next touched; FE-32 before a change after launch meets it; FE-27 before our F6, and FE-26 with FE-18. Our half of FE-28 is done. FE-28 matters most; FE-29 and FE-30 serve Rich's support references and plain limits; FE-31 was met on the real platform (2026-09-28). None blocks the platform's sitting 8 |
| **Landed, the platform's sitting 10** (close-out `5a952f5`, relayed by the platform session, 2026-09-28) | **FE-24**, **FE-17**, **FE-18**, **FE-26**, **FE-27** | — | FE-24's code (`bb32fa6`: a staging instance's output is `403 INSTANCE_OUTPUT_STAGING`, so `InstanceOutput.environmentKind` only ever reads `sandbox`); FE-17 (`c944a71`: a browser refused at `/auth/*` gets a short page, any other caller the envelope); FE-18 (`46399c5`: `dist/`'s types stand alone, `erasableSyntaxOnly`); the mock (`18f3214`, and `c33d4df` under `MANIFEST_MOCK_AGENT_BUDGET=unavailable` only: it refuses a session it did not issue, answers `404` for an id it does not hold, and its sandbox runs); its console calls all 66 operations. FE-26 and FE-27 confirmed by Rich there. **The contract is still 1.4.0, 66 operations, 127 codes.** Our tests follow the mock (`9278ff8`); our typecheck and 853 tests pass against it (F3 sitting 6) |
| **Landed, the platform's sitting 11** (the guides, `manifest-7c`; close-out `f4f28d6`, relayed by the platform session, 2026-09-28) | — | — | Docs and examples, and published text: `8ef685d` (the slug is called a slug in `checkSlug`'s answers and remedies, and `CSRF_ORIGIN_REFUSED`'s words; the mock's `SLUG_TAKEN` now reads *"a project already has this slug"*, which F2's *Name it* shows verbatim), `08df532` (one description; a gate refusing an internal finding id in public text), `e90de38` (*Building a front-end*). No operation, field, code or event moved. Our one test pinning the mock's slug reason follows it (`a8ffc87`). **Closed out `f4f28d6`, documents only; across the sitting the contract moved TEXT ONLY** (`c90f571`: the SLUG_* codes' summaries say slug, the guides name `agent:session` and `output:read`, a person's actions are browser code; `d82b3a2`: Spec action 9, §8's `SAML_PRIVATE_KEY_PATH` row is `all`, aligned with our `c4e10cc`). Still 1.4.0, 66 operations, 127 codes; no mock behaviour change. Our typecheck and 873 tests pass against it (F4 sitting 1) |
| **Written 2026-09-28, F3's sitting 7** (the real platform, and Rich's click) | **FE-35**, **FE-36**, **FE-37** | A confidential app's later sessions get only the on-campus 4B model, which could not write the app; a session keeps its models after its project turns confidential; no draft could sign in (the IdP demands a signed request the sandbox had no key for) | **FE-37 fixed in manifest at Rich's word, once** (`c4e10cc`, noted in its ORIENTATION; the platform session owes `pnpm test`, `pnpm test:docker` and §8's spec row). FE-36 not carried. **FE-35 CARRIED at Rich's word, 2026-09-28, option (a)** (F4's planning session, `manifest-app-bb`, to `manifest-7c`): a model that can write an app, approved for confidential data; on the laptop Rich noted `qwen3.6:35b-a3b` or `qwen3.8:27b`, both already in its Ollama. The platform session recorded it in its §8 *Open*, to confirm with Rich in his words; its sitting 12 asks him where it goes. Its design (which model, which name, the laptop's memory, a spec action) is the platform's. F4's M6 measures it once it lands |
| **Decided by Rich, 2026-09-28** (with the platform session; **Spec action 10**, manifest `d9a1fa1`, under his name) | **FE-35**, **FE-36** | The agent that builds an app on a confidential project, and a session that outlives its project's classification | Rich: *"It's okay to use the larger models to BUILD the app, but if the app needs AI, then we should switch to use the on-prem model for the AI within the created app … Can we perhaps make this a setting?"* A platform setting, **by default allowing the capable model** on a confidential project's agent sessions; the app's own AI stays on-premise; a session holding more than its project allows is ended, its key revoked; **the safeguard: while the capable model is allowed, a delegated token on a confidential project is refused staging's and production's `listIncidents`** (a code of its own). On the laptop the on-premise names move to `qwen3.8:27b`. **To be built by the platform's sitting 11a, before its acceptance; not landed at F4 sitting 1's close.** Supersedes the relayed FE-35 (a capable on-premise model). F4's plan is corrected to it (S1) |
| **The platform's sitting 11a, built, 2026-09-28; closed 2026-09-29 at `90b8e81`** (relayed by `manifest-c3` to F4's sittings 2 and 4; the close-out is documents only on top of `8c7eb5e`) | **FE-35**, **FE-36** | Spec action 10, as built | **`ad4e94c`** (no contract change): under the default `capable` setting, a confidential project's session lists `default-chat-onprem`, `default-chat-onprem-reasoning`, then `default-chat-large` when registered; under `on-premise`, the two on-premise names. **`4f261e9`** (contract 1.4.0, one enum value): **`models_withdrawn`** in `AgentSession.endReason` and `agent_session.ended`; after every valid `manifest.yaml` recorded, and at every boot, an active session holding a model its project no longer allows is ended and its key refused for every model, so the next piece of work starts a new session (F4 Task 8). A session at its cap stays `active` (`spentUsd` against `capUsd`); `expired` is its time. **`38c2ade`** (contract and mock; 1.4.0, 66 operations, **128 codes**): **`403 INCIDENT_LOG_CONFIDENTIAL`**, a delegated token on a confidential project's staging or production `listIncidents` while the setting is `capable`; a session, and any token on the sandbox, still read them. Its remedy: *"Read the sandbox's Incidents instead … or ask the person you work for to read this environment's Incidents in their own session and tell you what failed."* **Our mock gains `MANIFEST_MOCK_CONFIDENTIAL=1`**: a Bearer's staging or production `listIncidents` refused so, and every agent session holding the three names; without it nothing changes. Our typecheck and 916 tests pass against `4f261e9` and again, twice, against `38c2ade`. Our server reads only the sandbox's incidents today; F4's fix round (Tasks 8–10) meets this refusal, and **never hands the person's own reading to our server or a model** (F4 sitting 1's ruling): the person may still tell us in their own words. **Then `8c7eb5e`** (its review's fix pass, relayed to F4's sitting 4, `manifest-app-f8`, 2026-09-29; **contract text only**, 1.4.0, 66 operations, 128 codes): the Incident's `prompt` is shown to the person and never handed to a model on a confidential project's staging or production while the capable model is allowed, and `INCIDENT_LOG_CONFIDENTIAL`'s remedy says never to paste its log tail or prompt to the agent (our ruling, now the contract's words); the refusal holds after a commit *lowers* the manifest (the most restrictive of the classification and every release run there); a **production** deploy to a more restrictive release ends the sessions it no longer allows (`models_withdrawn`) before it answers. Our typecheck and 1110 tests pass against it, and again, twice, at the close-out `90b8e81` (1.4.0, 66, 128; no contract or mock change). The platform's next is its sitting 12, the acceptance (`make demo-frontend`, on the `app` origin), which uses 7100 and the edge and messages us first. **How we use `models_withdrawn`** (F4 sitting 5, `8d94539`): a key refused mid-round is looked up in `listAgentSessions`; ended `models_withdrawn`, the round **stops and asks first** (Rich, 2026-09-29), never the $2 checkpoint, and *Carry on* starts a new session |
| **The platform's sitting 12, its whole-branch review's fix pass, 2026-09-29** (`16c3357`, announced to F4's sitting 6, `manifest-app-56`, by `manifest-8b` before it landed) | — | Declared error lists | **Contract 1.4.0, error lists only** (66 operations, 128 codes; the mock unchanged): every operation an archived project refuses **declares** `409 PROJECT_ARCHIVED` (23 operations, `deploy`, `setAppSecret` and `mintToken` among them; they already answered it); `endAgentSession` and `endIntakeSession` declare `AI_CATALOGUE_DISABLED`, and `revokeToken` now answers the one it declares. Our typecheck and 1222 tests pass against it, twice. For us: trying-out (F4 Task 10) reads refusals by code, so an archived project's `deploy` is said as *"We couldn't do that just now…"* with a reference; a switched-off app is F6's to say better |
| **Written 2026-09-28, F4's sitting 3** (the Preview, from sitting 1's M3) | **FE-38** | The last attempt cannot be read from `listInstances`: its order is *"seen most recently"*, and an instance has no time of its own. It corrects FE-13's premise | **Not carried**: Rich's word decides that. Meanwhile we read the versions' dates (right for every F4 flow, wrong for a rollback, F6). Option (a): `createdAt` on an instance |
| **The platform's sitting 12 closed, 2026-09-29, at `e824956`**: **the front-end enablement plan is EXECUTED** (relayed by `manifest-8b` to F4's sitting 7, `manifest-app-9d`) | — | — | **The contract is unchanged since `16c3357`** (1.4.0, 66 operations, 128 codes; nothing in `packages/contract` or `packages/mock` since; `c5f1493` and `11f2526` are the control plane and the guides). 7100 left steady on `11f2526`, driver 1, its database empty, and used by F4's sitting 7 for its real-platform step and Rich's click (two projects: `my-weekly-thoughts`, `notes-and-answers`). Our typecheck, and 1229 tests twice, pass against it |
| **Recommended by the platform, 2026-09-29** (`manifest-8b`, at Rich's asking; **not decided: Rich's word carries them**) | **FE-33**, **FE-34**, **FE-38** | Each as an early task of the platform's **next plan, the launch path (FE-6, FE-25)**, which `manifest-63` is writing | **FE-33**: our (a), revoking, archiving, deleting or expiring a token closes its open streams with a close code of its own (e.g. `4401`); also the platform's own review's M6. For us: keep closing a round's stream at its end; treat `4401` as *"ask for a new token"* once it exists. **FE-34**: our (a) in principle, the fallback only for an unreachable or failing provider, if LiteLLM 1.98's router can restrict it by error type (measured first); else (b), the guide says so. For us: unchanged (a root-object schema, and `x-litellm-attempted-fallbacks` and `model` read on every answer); the on-premise fallback is `qwen3.8:27b` (32k) since 11a. **FE-38**: our (a), `createdAt` on `Instance` and `InstanceSummary`; the last attempt becomes the newest by it. For us: keep Task 5's interim rule; F6's *Start it again* after it ships. Timing it recommends: FE-38 before our F6; FE-33 and member removal before faculty use it for real; FE-34 measured in the next plan's Task 1 |
| **Decided by Rich, 2026-09-29** (relayed by `manifest-8b`; the platform's next plan builds each, with a spec action) | **FE-11**, **FE-36** | Removing a member; a session whose project went confidential | **FE-11: removing a member revokes that member's tokens on the project and ends their agent sessions** (not built yet; with FE-33 their streams close too). **FE-36 changes: a session holding a model its project no longer allows has its key TRIMMED in place** (the withdrawn models removed) and stays active, ended only when nothing it may use is left (measured first: does LiteLLM's `/key/update` narrow a live key at once). Until it ships, `models_withdrawn` as today. Meanwhile (F4 sitting 7, at Rich's click, **Rich's decision**): our round starts a new session itself after `models_withdrawn`, carries on when it still lists the model we were using, and asks first only when that model is gone (`5a1aa1f`) |
| **The platform's next sitting** (`manifest-63`, opened 2026-09-29, 13:00) | — | Real GitHub | Rich set `MANIFEST_SOURCE_DRIVER=github` in manifest's `.env`. The next plan's Task 1 restarts 7100 onto driver 2 against **real GitHub**: every driver-1 project then answers `409 SOURCE_PROVIDER_MISMATCH` on source operations (a restart back onto driver 1 restores them), and **anything created through 7100 makes a real private repository on github.com that nothing deletes**. Told by F4's sitting 7 that 7100 is free for it; whether the two acceptance projects are kept usable is Rich's word |
| **Decided by Rich, 2026-09-29, to carry** (after F4's close; the platform's launch-path plan was being written) | **FE-39** | Only faculty build, for now; and administrators | **Written and decided the same day** (walk-through D7): the platform decides who may build (faculty by CWL's `eduPersonAffiliation`, administrators by a prescribed list **by PUID** in its settings; someone who stops being faculty keeps their apps and starts nothing new), refuses `createProject`, `startIntakeSession` and `addMember` to anyone else with a code of its own, and `getMe` answers the decision (`mayBuild`). Rich: *"the platform, because this would then also work for agentic use"*. **Carried at Rich's word, 2026-09-29**, to `manifest-63`, for the launch-path plan while it is open |
| **Decided by Rich, 2026-09-29, to carry** (while F5 was written, `manifest-app-ce`; the platform's launch-path sitting 2 was running) | **FE-40** | The mock cannot play a launch: its checklist is never ready for a first launch, it never asks for step-up, and its approval and dry run each answer one fixture | **File it, and carry it now** (Rich, 2026-09-29): opt-in switches in the mock, for the launch path's Task 13, which already changes the mock. F5 never waits on it. **Carried the same day** to `manifest-13`, which recorded it in the launch-path plan (its own section, and a note at Task 13's head), **PROPOSED there until Rich confirms it to a platform session** (its house rule for a relayed decision; its next §7e asks him). **Confirmed by Rich to `manifest-c3`** (its launch-path sitting 3, 2026-09-29), and **to us in his own words** the same evening (*"I approve the FE-40 were my words"*, to `manifest-app-a0`); Task 13 (sitting 10) carries it |
| **Landed, the platform's launch-path sitting 3, Task 4, 2026-09-29** (`d894b8e`, announced before and after by `manifest-c3` to F5's sitting 0, `manifest-app-a0`; the sitting was still running at our close) | **FE-38** | — | **Contract 1.5.0** (66 operations, 128 codes): **`Instance.createdAt`**, required, ISO 8601, never null, when the deploy made the instance, inherited by `InstanceSummary` (`listInstances`), `deploy`'s and `getEnvironment`'s answers; the list's order unchanged (`last_seen_at desc nulls last`: one made but not yet seen is listed LAST). Every mock fixture instance has it. `SOURCE_PROVIDER_MISMATCH`'s description widened (the same driver on another GitHub). **Adopted the same day** (`33e9251`): the last attempt is the newest failure made after the one serving, whatever its version (FE-38's rollback now reads right), and the Preview reads only the serving version. Our typecheck went red on seven test fakes when it landed; with them given `createdAt`, typecheck and 1248 tests pass, twice. Our mock on 7102 was restarted to serve 1.5.0's fixtures. **Still to land on 1.5.0: Task 5, FE-33's close code `4401`** (the next F5 sitting's Step 0 adopts it) |
| **Landed, the platform's launch-path sitting 3, Task 5 and its reviews, 2026-09-29** (`4bac1cf`, `9ac609d`, `84d485a`; closed at `bf94c73`, relayed by `manifest-c3`) | **FE-33** | — | **Contract 1.5.0, no version change**: close code **`4401`** on the event stream (*"The credential was revoked or expired. Get a new one — sign the person in again, or ask them for a new token; reconnecting with the same credential is refused."*); a token's open streams close `4401` at its revoke, expiry or archive, a signed-in person's at the session's expiry, and a deleted project's other streams `4404`; `InstanceList`'s description says `createdAt` says which attempt is newest; the mock's instances made after their release (`09:01`, `09:00:30`); the mock never closes `4401` or `4404`. **Adopted** (`35102dc`): our server's subscription treats `4401` as refused and never reopens it, so the round asks for a new token; the page's own stream (*Making it*'s seconds) settles on any close. Our typecheck and 1249 tests pass against `84d485a`; our mock was restarted for its fixtures |
| **Written 2026-09-30, F5's sitting 1** (on 7100, real GitHub, at Rich's word) | **FE-41**, **FE-42** | *Make it* fails for an app on a starter (`409 SOURCE_GIT_FAILED`); the dry run is an administrator's alone (`403` to the owner) | **Decided by Rich the same evening**: FE-41 **carried** (*"Carry it now"*); FE-42 **(c)**, the administrator's row now and the owner's press (a) **carried** (*"Both: row now, ask platform"*). Both relayed to `manifest-c3`, and **confirmed by Rich to it** (`2a663ff`): FE-41 is the launch path's Task 6a (first in its sitting 4), FE-42 (a) its Task 6b (a new sitting 4a) |
| **Landed, the platform's launch-path sitting 4, closed 2026-09-30 at `0510c63`** (reported by `manifest-a1` to F5's sitting 3, `manifest-app-58`, and its close to sitting 5, `manifest-app-6b`) | **FE-41**, **FE-34** | — | **FE-41 fixed across `0f2275a..ebfc571`**: not the starter: real GitHub answers a repository it made seconds earlier as refused over git (`404`, or `403` *"Write access to repository not granted"*) for about 2–4 s, with or without a starter; driver 2's create now retries its seed push and first fetch within one 30-s budget, a fresh token each time, and a create that still fails writes an operator line (6 of 7 creates failed before, 5 of 5 after). **FE-34 committed** (`8ef6d46`, after Spec action 6 applied, `0ebe514`): the capable model's fallback answers a provider that failed, never a request it refused; **and `c16b23d`** (seen by F5's sitting 4, `manifest-app-6d`): the guard judges each request by its own failure, never a client-supplied key. **Nothing in `packages/contract` or `packages/mock`** (1.5.0, 66 operations; checked by sitting 5). **At its close (`7fc25f9`, its final wave):** a same-slug create no longer starts with a failed create's cached tokens; **a create on real GitHub may take ~30 s longer at worst (8–11 s typical), and the platform says never to time one out under ~60 s**: **adopted by F5's sitting 5 (`ac1a0d1`)**, our browser's `createProject` waiting 90 s (`CREATE_TIMEOUT_MS`), not the reads' 15. **FE-34 built:** a provider's `400`/`413`/`422` reaches the caller as the provider's refusal, streamed or not; `401`, `403`, `404`, `408`, `429`, `5xx`, timeouts and refused connections still fall back. **Known, and LiteLLM's:** a provider's `422` reaches the client as HTTP `200` with the body `null`; the guides say to treat it as a refusal. **Ours, not yet built (sitting 6's Step 0):** our streaming client reads that body as `MODEL_UNREACHABLE`. F5's acceptance (sitting 6) needs FE-41 |
| **Landed, the platform's launch-path sitting 4a, 2026-09-30** (`fa02bbc`, announced by `manifest-73` to F5's sitting 5, `manifest-app-6b`, before the commit) | **FE-42** | — | **FE-42 (a) built:** `runRehearsal` may be run by the project's owner, a collaborator or a platform administrator, each from their own session; its `FORBIDDEN` is gone (a stranger is still `404`); the token capability `launch:rehearse` is added, person-only (`mintToken` refuses it: `TOKEN_CAPABILITY_FORBIDDEN`), so no new refusal reaches a token; the Rehearsal, its evidence and the checklist item's owner are unchanged. Contract 1.5.0, 66 operations; `packages/mock` unchanged. **Our typecheck and 1568 tests pass against it.** **Task 7's press returns** (the button, the working row, *"You can leave: it carries on."*, our deadline, a failure's words) when Rich says in which sitting: sitting 5 recorded the question for him and built nothing of it. **4a closed at `09e3d7b`** (`7814f75` its review's wave: docs only, `agents.md` names the rehearsal a person's alone, `journey.md`'s launch row split in three). **Its review found that a rehearsal leaves the unapproved candidate serving the app's production hostname on the public listener** until the launch or a later deploy, and Rich's *"persons only"* answered a question that said nothing was public: **the platform re-asks him as Spec action 8** ((a) accept it; (b) a step-up before the rehearsal, a second sign-in on our press; (c) the rehearsal takes its production instance down once its sign-in is recorded, recommended; (d) an administrator's alone again, our row as it is). `runRehearsal`'s description and `launching.md` step 2 change with his answer (a contract commit under 1.5.0, announced first). **Task 7's press waits on that answer** (`manifest-73`'s advice) |
| **Landed, the platform's launch-path sitting 5b, closed 2026-10-01 at `66ac53c`** (`manifest-e2`; its contract commits announced first: `3333acc`, then text-only `fff8a7f`) | **FE-42**, **FE-43** | — | **Spec action 8 (b)+(c) built:** `runRehearsal` from an un-stepped session is `403 STEP_UP_REQUIRED` (nothing deployed); after any dry run production's `Environment.instance` is its instance, **`gone`**, or **`failed`** when the candidate never started (never `null`); a failed start's incident is on production before the answer; **`409 REHEARSAL_RUNNING`** (FE-43's platform half: a second run refused at once, a per-project lock); **`500 REHEARSAL_TEARDOWN_FAILED`** (no record; run it again); a deploy that throws, or a control plane that stops, leaves nothing serving; at boot the control plane takes down a rehearsal's leftover. Measured with the take-down: 5.6–8.8 s. **Adopted** (`1c1be77`; the press itself `71fceba`, before). **Walked on 7100** (F5's sitting 6): the second sign-in, *"Done."* in 10.0 s, production `gone`; and Rich's own dry run and launch. Contract 1.5.0, 66; `packages/mock` unchanged (FE-40, its sitting 10) |
| **Landed, the platform's launch-path sitting 5, closed 2026-09-30 at `424da79`** (reported by `manifest-d4` to F5's sitting 6, `manifest-app-f1`; each contract commit announced first) | — | — | **Task 7, a session narrowed in place** (`d061ad7`): `agent_session.narrowed { sessionId, withdrawn, models, via, userId, tokenId }`; a live key loses only the models the project no longer allows (the gateway's `403 key_model_access_denied` for those), and is ended `models_withdrawn` only when nothing is left; `AgentSession.models` reads what the key holds now. **Adopted** (`54cd767`): a `403` for a model gone from the round's live session is FE-36's withdrawal, renewed once. **Task 8, removing a member** (`baacc1c`, `0b4d50e`, `f27914e`): in one transaction their tokens on that project are revoked, their token streams close `4401` and session streams `4404`, their agent sessions there end **`member_removed`** (the gateway `401 token_not_found_in_db`); `member.removed` gains `tokensRevoked` and `sessionsEnded`; `removeMember` declares `503 AI_CATALOGUE_DISABLED` (after the removal; a retry finishes the ends). **Adopted** (`fc614bc`): `member_removed` is `needs: token`, never the checkpoint. **Contract 1.5.0, 66 operations; `packages/mock` unchanged. Our typecheck and 1639 tests pass on `424da79`.** 7100 restarted on the final tree (PID 932, real GitHub), its database empty (Rich removed 42 orphan apps). **Next: 5b**, which runs its own tiers, restarts the control plane and hands 7100 to us |
| **Decided by Rich, 2026-09-30: Spec action 8 = (b) + (c)** (relayed by `manifest-d4`, the platform session where he decided it, to F5's sitting 6, `manifest-app-f1`) | **FE-42** | — | **A second sign-in before a dry run, and the dry run takes itself down.** The platform writes it into its launch path as **Task 6c, sitting 5b**, which runs **after its sitting 5** (Rich's order): **5 → 5b → our 7100 window → 5a**; its §7e records our window (no platform Vitest, no control-plane restart, `admin-grant.sh grant opr000001` once `operator` has signed in), and 5b messages us and hands 7100 over at its close. **As `manifest-d4` described 5b (planned; 5b confirms the shape before it commits):** `runRehearsal` without a fresh step-up is `403 STEP_UP_REQUIRED`, the production deploy's refusal exactly (the hint names `/auth/step-up?returnTo=…`; 600 s; match the code, never the message); a token stays `TOKEN_PERSON_ONLY`. The answer comes **after** the take-down (deploy, probe, route removed, instance retired, the record, then the answer), so the item never reads met while the candidate serves; afterwards `listInstances(production)` lists the dry run's instance `gone`, not serving, and **`getEnvironment(production).instance` is still that instance, `gone`** (the platform's `servingInstanceOf` falls back to the newest; 5b may make it `null`); events `instance.retiring`, `instance.retired` or `instance.retire_failed`, then `rehearsal.completed`. `Rehearsal` unchanged, contract **1.5.0**; `runRehearsal`'s description and `docs/api/launching.md` step 2 change, and it declares `403 STEP_UP_REQUIRED`. A take-down refused writes no record and answers a code, **`REHEARSAL_TEARDOWN_FAILED` proposed**; the remedy is to run it again. **The mock gains no step-up** (sitting 10's, Task 13): our tests fake it. **Built ahead by F5's sitting 6:** the press with its step-up card and `?then=dry-run` (`71fceba`); **the live address's `gone` read as nothing there before a launch** on every page (`asServed`, `14f5749`). **F8** (a provider's `422` answered `200` with `null`): unchanged, open with Rich ((a) accept; (b) a guard hook turning it back into the `422`, recommended if buildable; (c) a newer LiteLLM); **adopted as today's shape** (`1ae7189`: `MODEL_ANSWER_INVALID`, `422`, not retried, and a `422` itself the same) |
| **Relayed by `manifest-00`, 2026-09-30** (a planning session in manifest, with Rich; to confirm in his own words) | **FE-28**, **FE-29**, **FE-30**, **FE-31**, **FE-32**, F8 | — | **FE-29, FE-31, FE-32 confirmed by Rich, (a) each.** After the launch path, the platform's next plan is *"before faculty use it for real"*: FE-28, FE-30 with FE-29, FE-31, a fix for F8, an administrator's reason for acting on others' projects, a `node:24-alpine` base and an init in app containers; FE-32 (resolving a lockfile) the plan after. **What it will change of ours:** (1) FE-28, **widened** (a second relay): on https origins **all three** cookies take the prefix, `__Host-manifest_session`, `__Host-manifest_login` and `__Host-manifest_stepup` (Path=/), since a sibling app could plant an unsigned `manifest_login`; the plain names stay only on loopback http (the Docker tier; so our mock-mode scripts may keep them: check at the landing); **contract 1.6.0**, a minor, the cookie named its one break. Ours: `whoIs` (it replays `manifest_session` and refuses two), our tests' session helpers, the `check-*.sh` jars, and `lib.mjs`'s per-host jars carrying `__Host-manifest_login` across the three hops; (2) FE-30: a request id on every answer (a header, and `error.requestId`): record it beside our support reference; (3) FE-29: `error.limit { scope, period, resetsAt, amountUsd? }` on the three limit refusals and `error.session { id, name }` on the two `*_ALREADY_STARTED`: our copy of the reset rules goes; (4) FE-31: `fixture-node@1` gets `listed: false` and `listBlueprints` hides it; it still resolves (our CWL rule keeps working); (5) F8: a provider's `422` arrives as a `422` (**already read as a refusal**, `1ae7189`); (6) the blueprint's base image moves to `node:24-alpine`: the lead's knowledge pack, and anything our agents assume of Node 22, follow; (7) Spec action 9's gates in the launch path's sitting 6 (its Task 9): two new `409`s on *"I've sent it"*, named then (F5b's). **Tracked for before production, not in that plan:** the platform strips LiteLLM's `x-litellm-model-api-base`, `x-litellm-model-name` and `llm_provider-*` headers, and rewrites the body's `model` to the **logical** name (`default-chat-onprem`, never `ollama_chat/…`); `x-litellm-attempted-fallbacks` stays. Our *which model answered* reads the chunk's `model` (already the alias asked for) and the fallback header: expect logical names; told when it lands. **Also relayed:** F6 is written after F4a; a mail sink, **Mailpit, in the spec now** (§21: 7111 SMTP, 7112 the inbox; always on, in memory, no relay), its container after 5b; **Spec action 9 applied** (§9, §13; the shared pages say the privacy assessment comes first); the platform's sittings 10 and 11 merged; the external track deferred. **The plan is written** (manifest `b7a80b1`, `docs/superpowers/plans/2026-09-30-faculty-ready.md`, **approved by Rich**, relayed: *"plan looks good"*; its four spec actions still his to read before their sittings; after the launch path's sitting 12), its shapes as relayed: **one bump to 1.6.0** (its Task 3); **`x-request-id`** on every answer and a required **`error.requestId`** equal to it (`ManifestApiError.requestId`, the header when the body is unparseable; the mock sends both); **`error.limit { scope: 'person' | 'platform', period: 'day' | 'month', resetsAt, amountUsd?, count? }`** on `INTAKE_DAILY_LIMIT_REACHED` (count), `INTAKE_BUDGET_EXHAUSTED` and `AGENT_BUDGET_EXHAUSTED` (amountUsd), the day's reset the next Vancouver midnight; **`error.session { id, name | null }`** on the two `*_ALREADY_STARTED`; **cookies by `cookieNames(origin)`**, the `__Host-` three on https and the plain names on http (the mock and our mock mode unchanged), `sessionCookieFor(baseUrl)` in `@manifest/contract`, `SESSION_COOKIE` deprecated, and **a plain `manifest_session` on https not read** (its Task 5 messages us before it commits; our adoption is our own commit); `listBlueprints` omits `fixture-node@1`; **a provider's `422` answers `422`** (`error.type: 'invalid_request_error'`), streamed too (ours reads a `422` status already, `1ae7189`; **an error event inside a stream is still read as unreachable**: check its shape when it lands); §26's **`Manifest-Admin-Reason`** header (`400 ADMIN_REASON_REQUIRED` for an administrator acting on a project they are not a member of) and **`EventFrame.actor { name, asAdministrator, reason | null } | null`** on every event, the deploy, build and validate sentences naming who acted |
| **Relayed by `manifest-60`, 2026-10-01 (04:20Z)** (the platform's planning session, `manifest-00`'s successor: Rich's decisions, their record in manifest's `docs/superpowers/2026-09-30-decisions.md`, and coordination; it runs no sittings) | **FE-39**, F6's mail sink | — | **Who is doing what.** **`manifest-74` runs the launch path's sitting 5a** (Task 8a, FE-39): `Me.mayBuild` for exactly `faculty` (`eduPersonAffiliation`) or an administrator named by `MANIFEST_ADMIN_PUIDS`; `403 BUILDING_NOT_OPEN` and `409 MEMBER_MAY_NOT_BUILD`, the names proposed; the mock gains a switch; a contract commit at **1.5.0, no bump**. It messages us before that commit and again at its close. **Its Vitest truncates 7100's database while it runs** (running at 04:23Z), and at its close it removes the 7100 window's containers (manifest's handoff note, `0e83a43`). **At 5a's close `manifest-60` adds Mailpit** (§21's tenth container; its image pulled ahead, `fd60750`): SMTP `127.0.0.1:7111`, the inbox `http://127.0.0.1:7112` (its API under `/api/v1/`); no authentication, messages in memory, no relay, so nothing leaves the laptop; **the host must be `127.0.0.1` or `localhost`** (any other name is `403`). It messages us when it is live (for F6). **Then** the platform's sitting 6 (Task 9: UBC's order, the privacy assessment, then staging's registration, then production's) runs **beside our F4a**; then its 7–10 (10 merged with the published-text pass) and 12. **F5b is written when its 6–10 land**, F6 after F4a. Message `manifest-60` about anything cross-repo that is not a sitting's own work, and `manifest-74` about 5a's contract; names change at each handover, so `ListAgents` first |
| **Landed, the platform's launch-path sitting 5a, closed 2026-10-01 at `003adf7`** (`8771272`, its fix wave `42cd8c5`; reported by `manifest-74`) | **FE-39** | — | **Built, ours too (F4a, executed 2026-10-01):** `Me.mayBuild` (required) read and never re-derived; our `POST /api/conversations` refuses a new start `403 BUILDING_NOT_OPEN` (a `getMe` without the decision builds); the page's screen, and the shell for someone who keeps apps; a `BUILDING_NOT_OPEN` met part-way, from the platform or from us, reads `getMe` again. **Rich's click** as `student` and `instructor` on 7100. `409 MEMBER_MAY_NOT_BUILD` is F6's (*People*). Contract 1.5.0, 66 operations at 5a |
| **Landed beside it, 2026-10-01** (`manifest-60`; `manifest-92`) | F6's mail sink; FE-6, FE-25 (F5b) | — | **Mailpit** (`8155bcf`): SMTP `127.0.0.1:7111`, the inbox `http://127.0.0.1:7112` (API `/api/v1/`), host `127.0.0.1` or `localhost` only, in memory, shared. **The launch path's sitting 6 contract commit** (`b2c75e6`, 1.5.0 additive, **68 operations**): `submitIamRegistration` (`…/launch-records/iam-registration/{environment}/submission`) and `submitPrivacyAssessment` (`…/privacy-assessment/submission`), person-only `launch:submit`, body `{ sentAt?, reference? }`; `409 LAUNCH_DRAFT_REQUIRED`, `400 LAUNCH_SENT_AT_INVALID`, `409 LAUNCH_PIA_NOT_APPROVED`, `409 LAUNCH_STAGING_NOT_REGISTERED`; `IamRegistration.environment`, `submittedAt`, `submittedBy`, `createdAt`; `PrivacyAssessment.submittedAt`, `submittedBy`, `createdAt`; `LaunchRecords.stagingRegistration`; `LaunchReadinessItem.since` (*waiting since* / *met since*, IAM and PIA only for now). **Adopted in our test data** (`f8dcfbc`); read by F5b. **Sitting 6 CLOSED 2026-10-01 at `d54e1e1`** (fix wave `db2ddbf`, relayed by `manifest-92`): `sentAt` is `format: date` (an impossible day `400 REQUEST_INVALID`); `409 LAUNCH_PIA_NOT_APPROVED` refuses **either** registration's submission until the assessment is approved with its reference, checked first; an administrator's record that omits `externalTicketRef` keeps the owner's; a submission and what it reads are one locked decision; the mock's records follow UBC's order (the PIA re-sent 09-18, `since` `2026-09-18T19:00:00.000Z`). **For F5b: a same-day `submittedAt`/`since` is NOON in Vancouver**, up to ~12 h ahead of now: count waits in Vancouver days, never `now − since`. Every real submission answers `409 LAUNCH_DRAFT_REQUIRED` until sitting 7's `draftIamRegistration` (`launch:draft`, mintable) and `IamRegistration.package`. Our typecheck and 1671 tests pass against it; the mock restarted; `check-going-live.sh` 8/8 |
| **The launch path's sitting 7 contract commit, 2026-10-01** (`6cbb489`, Task 10, Spec action 4; announced before and after by `manifest-8e`; the sitting still running, 7100 its own) | FE-6 (F5b) | — | **Contract 1.5.0, additive, 69 operations.** **`draftIamRegistration`** (`POST …/launch-records/iam-registration/{environment}/draft`, no body, `staging` or `production`, answers `IamRegistration`): capability **`launch:draft`**, new, **mintable** (owner, collaborator, administrator). **`IamRegistration.package`**, required, a `RegistrationPackage` or `null`: `environment`, `generatedAt`, `fromCommit`, `entityId`, `acsUrl`, `sloUrl`, `certificate { pem, fingerprint, expiresAt }` (never a private key), `attributes[] { name, oid, purpose, usedAt[] { path, line }, justification, unused }`, `usedAtTruncated`, `contacts { technical[], support[] }`, `privacyAssessmentReference`, `metadataXml`, `warnings[]`. Two new codes: **`409 LAUNCH_RECORD_SUBMITTED`** (a record UBC holds, submitted or active, is never re-drafted; again from `change_requested` or `expired`) and **`409 LAUNCH_NOT_CWL`** (the app signs nobody in, or asks for no attribute); `LAUNCH_DRAFT_REQUIRED`'s remedy names the draft. A new event, **`iam_registration.drafted`** (`environment`, `entityId`, `fromCommit`, `attributeCount`, `unusedCount`: no attribute names). A submission's earliest day is the newest draft's `generatedAt`. **The mock:** `getLaunchRecords` and `recordIamRegistration` answer from fixtures (`package: null`); **`submitIamRegistration` and `draftIamRegistration` from their document examples**, a real captured staging package (a ~4 KB PEM and metadata XML). **Adopted with no change of ours**: our registration test data spreads the fixtures. Our typecheck and 1671 tests pass against it; the mock restarted (pid 66212) and answers the draft; `check-seeing.sh` and `check-going-live.sh` 8/8 each. Read by F5b. **Its fix wave, `dec71d8`** (the same sitting's whole-branch review; still 1.5.0, 69 operations; the last contract change of the sitting): `SubmitLaunchRecordRequest.draftGeneratedAt`, optional, the `generatedAt` of the draft the person was shown, **to send always** (F5b): a record drafted again since is refused **`409 LAUNCH_DRAFT_CHANGED`** (new) and nothing is recorded; `submitIamRegistration` refuses **`409 LAUNCH_DRAFT_STALE`** (new) when the draft's `privacyAssessmentReference` is not the approved assessment's, checked after `LAUNCH_PIA_NOT_APPROVED` and `LAUNCH_STAGING_NOT_REGISTERED`: in UBC's order, the assessment approved, then staging drafted and sent, then production drafted and sent. The examples recaptured as one flow (the submission's request `{ reference, draftGeneratedAt }`); the mock's fixtures unchanged. Adopted with no change of ours: typecheck and 1671 tests pass; the mock restarted (pid 64522) |
| **The launch path's sitting 8 contract commit, 2026-10-01** (`81892d4`, Task 11, D19's privacy-assessment draft; announced before and after by `manifest-8d`, the sitting still running, 7100 its own) | FE-6 (F5b) | — | **Contract 1.5.0, 70 operations.** **`draftPrivacyAssessment`** (`POST …/launch-records/privacy-assessment/draft`, capability `launch:draft`, mintable; answers `PrivacyAssessment`, or `409 LAUNCH_RECORD_SUBMITTED` while `submitted` or `approved`; declares the `SOURCE_*` codes and `AI_BACKEND_UNAVAILABLE`, `AI_CATALOGUE_EMPTY`). **`PrivacyAssessment.draft`**, required, a `PrivacyAssessmentDraft` or `null`: `{ project { slug, name }, generatedAt, fromCommit, sections[] { id: collected | stored | flows | retention | accountable | hosting, title, facts[] { label, value, source }, gaps[] }, warnings[], text }`. A new event, **`privacy_assessment.drafted`** `{ fromCommit, gapCount }`. `submitPrivacyAssessment`'s earliest `sentAt` is the draft's `generatedAt`, as for the registrations, so `draftGeneratedAt` now means something for the assessment too. **The mock:** `PRIVACY_ASSESSMENT` gains `draft: null`. **Adopted with no change of ours**, checked against its working tree before the commit (`manifest-8d` kept contract and mock typecheck-clean as one step): typecheck and 1671 tests pass; the mock restarted (pid 64223). Read by F5b |
| **The launch path's sitting 8 fix wave, 2026-10-01** (`4aaf0ef`, Task 11's review fix wave; announced before and after by `manifest-8d` to `manifest-app-28`, the sitting still running) | FE-6 (F5b) | — | **Contract 1.5.0, 70 operations, no shape changed**: only `openapi.json`'s examples and doc comments, and `schema.d.ts`'s comments. The privacy-assessment draft's words: retention claims no period Manifest enforces; an undeclared classification is named Manifest's default and listed as a gap; the environments claim no backup or clearing; new facts *Incident logs* and *Deletion*, a breach-response gap, and on GitHub a gap about names leaving Canada. The checklist's privacy-assessment `why` gains a sentence when the draft was not made from the release serving staging. **Adopted with no change of ours** (F6 sitting 2): typecheck clean, 1771 tests; **our mock on 7102 restarted** for the new examples (pid 52507). **Sitting 8 closed at `c5116e0`** (docs and a script only after `4aaf0ef`; reported by `manifest-8d`): 7100's control plane back on `4aaf0ef` with an empty database. Read by F5b |
| **The launch path's sitting 9 contract commit, 2026-10-01** (`a1d4baa`, Task 12, FE-25 and §26's queue, Spec actions 5 and 10; announced before and after by `manifest-6d` to F6's sitting 3, `manifest-app-fc`) | **FE-25** (F5b) | — | **Contract 1.5.0, additive, 72 operations.** **`requestApproval`** (`POST /v1/releases/{releaseId}/approval-request`, body `{ note?: string ≤500 }`, answers `200 ApprovalRequest` `{ id, releaseId, projectId, requestedBy { id, displayName }, viaToken { id, name } \| null, createdAt, open }` for a first ask and a second alike; the note is never in the answer): capability **`approval:request`**, new, **mintable** (owner, collaborator, administrator); refusals `409 RELEASE_NOT_STAGED` (with `launchReadiness`), `409 APPROVAL_NOT_NEEDED`, **`409 RELEASE_REJECTED`** (new), `NOT_FOUND`, `FORBIDDEN`, `PROJECT_ARCHIVED`. **`listQueue`** (`GET /v1/queue`, an administrator's session only): `Queue { items, oldestSince, truncated }`. A new event, **`approval.requested`** (`requestId`, `releaseId`, `viaToken`: boolean). **`IamRegistration.changeRequestedFrom`**, required: `submitted` (UBC came back with questions: the owner's move) or `active` (an administrator's change request, which UBC holds), null otherwise. The fleet's entries gain `name`, `state` and `archivedAt`; `LaunchReadinessItem.since` dates `admin-approval` from an open request. **Adopted with no change of ours**: our registration test data spreads the mock's fixtures, which carry `changeRequestedFrom: null`; nothing of ours reads the fleet; F6's `happeningOf` reads `approval.requested` as no happening (a type it does not name). Our typecheck and 1905 tests pass against it; the mock restarted (pid 52985) and answers the new field. Read by F5b (the owner's *please sign this off*) |
| **The launch path's sitting 9 fix wave, 2026-10-01** (`a230c1a`, Task 12's review fix wave; announced before and after by `manifest-6d` to F6's sitting 4, `manifest-app-00`, the sitting still running) | FE-25 (F5b) | — | **Contract 1.5.0, 72 operations, one shape changed:** `QueueItem.project` is `{ id, slug, name }` (no `state`: the queue lists active projects only); descriptions only for `requestApproval`, `ApprovalRequest.open` (a request waits again when its release serves staging again), `Queue`, `listQueue` and `RELEASE_NOT_STAGED`'s summary and remedy. No mock fixture changed. **Adopted with no change of ours** (F6 sitting 4, with Task 6): nothing of ours reads the queue; typecheck clean, 1953 tests. Read by F5b |
| **The launch path's sitting 10, closed 2026-10-01 at `8ff925f`** (`manifest-3d`, Tasks 13 and 14: `0969d45`, `e55b0bf`, `b571471`, `9e43588`, `6d76459`; each mock and contract commit held for and announced to F6's sittings 5 and 6, `manifest-app-00` and `manifest-app-s6`) | FE-40 | — | **Contract 1.5.0, 72 operations, text only**: `b571471` takes every section, decision and phase reference out of the published text (~270 descriptions, error meanings and remedies, event descriptions and examples); the checklist's answered text (owner lines lose *"(§9)"*; the IAM and PIA items with nothing recorded name the draft and send operations; `admin-approval` with nobody asking ends *"Ask an administrator to sign it off (requestApproval)."*); four refusal messages (`STEP_UP_REQUIRED`, `TOKEN_CREDENTIAL_REFUSED` and its hint, `INSTANCE_OUTPUT_STAGING`, `INCIDENT_LOG_CONFIDENTIAL`); the blueprint's `AGENTS.md` (its sha256 new). `6d76459` (the fix wave): while a launch option is set, the mock answers a production deploy that isn't ready `409 RELEASE_PRODUCTION_GATE_UNAVAILABLE` with `launchReadiness` (the default unchanged); `MANIFEST_MOCK_STEP_UP=1` asks a session only, never a Bearer; on the platform, archive's and delete's `STEP_UP_REQUIRED` say *"switching an app off…"* / *"deleting an app…"*; `LAUNCH_RECORD_INVALID`'s meaning. **Adopted with no change of ours** (F6 sitting 6): typecheck clean, 2128 then 2172 tests; no test of ours pins a moved sentence, a step-up message or the knowledge pack's hash; our mock restarted on each (pid 24850 on `6d76459`). Its sitting 12 (the acceptance) next |
| **Decided by Rich, 2026-10-01** (writing F6's design; carried to `manifest-8e` for the platform's record, `manifest-60` not running) | **FE-45** | An owner's *mark as removed* for a switched-off app that has been live: gone from every listing and route for its members, its data kept; an administrator alone restores it or deletes it for good under UBC's retention | **Build it, in the future** (*"so it gets built in the future"*): production data is never an owner's to delete; *never been live* stays the owner's delete line. **Confirmed by Rich in the platform's session** (*"Yes, confirmed."*, relayed by `manifest-8e`, 2026-10-01), recorded in manifest's ORIENTATION §8 |
| **Decided by Rich, 2026-10-01** (designing F5b with `manifest-app-d9`; carried by it to `manifest-6d` at his word, for the platform's record and its next planning) | **FE-46** | The owner sends the launch documents to LTIC, not to UBC: a *sent to LTIC* step before `submitted`, LTIC told by email, the assessment's gaps answered on the send | **Rich's (a)**: a state between `draft` and `submitted` for all three records (the owner's person-only send; an administrator records LTIC's submission with UBC's reference); `since` from each step; `listQueue` shows what LTIC holds; **the platform** emails LTIC; each assessment gap gets an id and the send carries the owner's answers (*"Our agent suggests, they check"*). F5b is designed against it; its sending sittings wait for it. **CONFIRMED by Rich in `manifest-6d`'s session** (19:56 PDT, manifest `ddc76d7`); a spec action before it is built |
| **Decided by Rich, 2026-10-01** (designing F6b with `manifest-app-d9`; carried by it to `manifest-6d` at his word, as FE-46) | **FE-47**, **FE-5** | After launch an owner cannot ask for a new sign-in detail, and every build that needs one fails until UBC registers it; an agent's question does not say what it asks | **FE-47 (a):** the owner's request for a change to the live registration, from `active`, through LTIC as FE-46's sends are (a package drafted from the newest valid manifest; `since` and `listQueue` as FE-46; LTIC emailed); the build's check stays. **FE-5 (a):** the question carries its specific object (who and what role; which release and environment; which record), never a secret. F6b's moment 17 and *Agents* screen are designed against them. **CONFIRMED by Rich in `manifest-6d`'s session** (19:56 PDT, manifest `ddc76d7`); a spec action before they are built |
| **How the two sessions keep in step** | — | Each platform sitting's close-out lists what it changed in the contract; `@manifest/contract` stays buildable at every commit; Rich relays | **Close-out note, Rich relays** |

**Ordered by what it costs the person, most first.** Timing notes say where a sitting is about to be built past
the point where a finding is cheap.

---

## Needed before a remaining sitting is built

### FE-1 — A model before a project exists ⏰ *before sitting 7* — **APPROVED BY RICH IN PRINCIPLE, 2026-09-27** — **LANDED in sitting 7**

**Landed** in manifest `3cb6c82`, and measured by F2's sitting 1 (2026-09-27, M1):
- `startIntakeSession` and `endIntakeSession`, **both for a signed-in person only**;
- one model, the platform's `MANIFEST_INTAKE_MODEL`, which is `default-chat` (`qwen3.5:4b`) on the laptop;
- a key of cents and minutes, a few a person a day, inside a platform month;
- the codes `INTAKE_DAILY_LIMIT_REACHED`, `INTAKE_BUDGET_EXHAUSTED`, `INTAKE_MODEL_UNAVAILABLE` and
  `INTAKE_SESSION_ALREADY_STARTED`.

Because ending one is session only, **the browser ends it, not our server** (F2, Tasks 6 and 7). The finding as
raised follows.

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
- **Measured by F1** (sitting 5, 2026-09-27, against manifest `e6a5f70`).
  - Rich signed in on `https://app.manifest.internal`.
  - Our server's replay of that session to `http://127.0.0.1:7100/v1/me` answered `200`, the same person.
  - A session carries no origin (`identity/session.ts`), and reads are not origin-checked, so the replay needs
    no edge.
  - A nonsense session is refused `401`.

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

**FE-5, carried (2026-10-01, Rich: *"Build it honest, carry FE-5 now"*).** FE-5 (*a question an agent raises does not say what it is asking*) is carried with FE-47, **option (a)**: the question
carries the specific object, taken from the request and never a secret: for a member, who (their name, CWL login or email
as the request named them) and what role; for a deploy, which release and which environment; for a launch record, which
one. F6b's *Agents* screen builds the card honestly meanwhile (*"Your agent '<name>' asked to add a member to this
project."* · *"It didn't say who. If you're not sure, say no."*), and gains the object when it lands.

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

***Decided by Rich, 2026-09-29** (relayed by the platform session): removing a member revokes that member's tokens on
the project and ends their agent sessions. The platform's next plan builds it, with a spec action.*

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

- **What exists:** `listInstances` marks `serving` ✓. ~~Newest first, so the last attempt is its first entry.~~ **Not
  so** (F4 sitting 1, M3): it is *"the one seen most recently first"*, and an instance has no time of its own: **FE-38**.
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
- **Rich (2026-09-28):** *"We actually WILL have a way to do this (either via the Academic API or via Canvas,
  both of which we can run locally (as fake local services))."* A sign-in limited to a class is coming. So the
  plan agent's honesty check, which reads only *Who gets in* (a deferred Minor of F2's), is deferred rather than
  widened. It changes when the class-limited sign-in lands.

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

### FE-23 — What one piece of work has cost ⏰ *before sitting 7* — **LANDED in sitting 7**

**Landed** in manifest `313075d`, as option (a): `AgentSession.spentUsd`, `number | null`, with `spentUnavailable`
saying why when it is null. `listAgentSessions` answers it, and so do `startAgentSession` and `endAgentSession`.
Measured by F2's sitting 1 (M1). F3's allowance line reads it. The finding as raised follows.

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

*Found by F1's sitting 1 (M5), 2026-09-27, against manifest `8bb6b22`. **Carried to the platform session 2026-09-28**, at Rich's word (to `manifest-b1`).*

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
- **The platform itself refuses a nonsense session** (F1 sitting 5, `MODE=edge bash scripts/check-slice.sh`,
  step 7), so this gap is the mock's alone.
- **Added by F2's sitting 1 (M2, 2026-09-27): the mock does not check which credential an operation takes.**
  - `startIntakeSession` with a delegated token alone (`Authorization: Bearer mft_…`, no cookie) answers `201`
    and a key.
  - The platform refuses it `403 TOKEN_CREDENTIAL_REFUSED`: intake is session only, *"because intake belongs to
    no project"* (`openapi.json`, `security: [{ session: [] }]` ✓).
  - So a front-end that started intake with the wrong credential would pass every mock-backed check.
  - Same remedy: the mock refuses what the operation's `security` does not list.

### FE-27 — `manifest-mock` answers `listInstances` and `getRelease` from the document's example, whatever is asked

*Found by F1's sitting 3 (Task 4), 2026-09-27, against manifest `3c38199`. **Carried to the platform session 2026-09-28**, at Rich's word (to `manifest-b1`).*

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
- **Added by F2's sitting 1 (M2, 2026-09-27): the same holds for everything sitting 7 added.** Measured with
  `pnpm mock`:
  - `startAgentSession` for `mock-app` (`22222222-…`), named *"Writing the plan"*, answers a session on project
    `c58a9190-…`, named *"Build the bulletin board"*: the document's example.
  - `listAgentSessions` answers another project's sessions. `endAgentSession` and `endIntakeSession` answer
    `200` for an id that does not exist, with a different id in the body.
  - `createProject` answers `mock-app` whatever slug is asked. `mintToken` answers its fixture token, with its
    own name and three capabilities, whatever is asked.
  - `createCommit` answers `src/app.js` as the change, whatever is sent. It does refuse a stale `baseCommit`
    `409 SOURCE_CONFLICT`, naming itself.
  - `checkSlug` holds one taken slug, `mock-app`. Every other slug is available, `edge` and `Bad Name`
    included, so `SLUG_RESERVED` and `SLUG_INVALID` are never answered (`packages/mock/src/server.ts:243-250` ✓,
    by design: *"so the create form's check-as-you-type has both answers"*).
  - **Why it matters:** F2 tests every one of these against its own fakes, and its acceptance asserts what our
    server sent, never what the mock answered. The same remedy, (a), keyed on what names each answer, as the
    mock already does for `getFile`.
- **Added by F2's sitting 4 (2026-09-27), found live:** **the times are the document's too, and they are past.**
  - `startIntakeSession` answers `expiresAt: 2026-09-28T02:10:00.000Z`, and `startAgentSession` answers
    `2026-09-28T02:27:48.266Z`, whenever they are asked.
  - A client that holds a key to its time, as ours does through the edge, refuses every mock key after that
    moment. Mock mode now holds no key to its time.
  - **The remedy:** the mock answers times from now, as the platform does: 30 minutes, and 60.

### FE-28 — The session cookie is not `__Host-`, and apps live on sibling hosts

*Raised by F1's final review (sitting 5), 2026-09-27, from reading, and **not measured**. **Carried to the platform session 2026-09-28**, at Rich's word (to `manifest-b1`).*

- **Screen and moment:** every signed-in request.
  - That includes our server's *"who is this?"* (FE-2's `whoIs`), which replays the first `manifest_session` it
    finds.
  - It also includes the platform's own sessions.
- **What is missing:**
  - `manifest_session` is host-only, `HttpOnly`, `SameSite=Lax`, `Path=/` and Secure by origin ✓
    (`packages/control-plane/src/api/routes/auth.ts`, `sessionCookie`).
  - But its name has no `__Host-` prefix, so nothing stops **another host under `manifest.internal`** from
    setting a cookie of the same name with `Domain=manifest.internal`.
  - Faculty apps are such hosts: production answers at `<slug>.manifest.internal`, beside `app.` and
    `console.`.
  - The browser would then send both cookies to `app.manifest.internal`, and which one comes first depends on
    path and age. That is *cookie tossing*.
- **Why it matters:**
  - An app's author, or anything that compromises an app, could plant their own valid session in a colleague's
    browser.
  - The colleague would then act, and describe apps, as that author.
  - Our server would file the colleague's conversations under that author, which is FE-2's boundary crossed
    from outside.
- **Options:**
  - **(a) Recommended:** name the cookie `__Host-manifest_session`. The browser then refuses any version of it
    set from another host, or with a `Domain`. It needs Secure and `Path=/`, which the https origins already
    have.
  - (b) As well, on our side: `whoIs` refuses a request carrying two `manifest_session` cookies, rather than
    choosing one.
    **Done, 2026-09-28, at Rich's word.** Until the platform renames the cookie, a planted one signs the person
    out of our app, visibly, rather than in as someone else.
- **When:** before faculty apps share the zone with real people. Sittings 10–11 at the latest, beside FE-18 and
  FE-26.

### FE-29 — A refusal's facts are only in its message

*Found by F2's sitting 1 (M1), 2026-09-27, against manifest `e6a5f70`, from reading. Widened the same day at
Rich's word: a limit is to be said plainly, whose it is and when it resets. **Carried to the platform session 2026-09-28**, at Rich's word (to `manifest-b1`).*

- **Screen and moment:**
  - moments 3 and 4, when describing is paused;
  - moment 5, when our server starts an agent session to write the plan, and the person's allowance is spent;
  - every conversation in F3;
  - **moment 9** (F4 sitting 1, measured 2026-09-28): `RELEASE_SECRET_NOT_SET` names the missing secret only in its
    message, beside machinery (`PUT /v1/environments/<id>/secrets/{name}`). Not a gap for us: `listAppSecrets` answers
    `declared` and `set` as fields, and we read those.
- **What we would call:** the refusal itself, and switch on its `code`, as the envelope asks. Then word it from
  its facts: whose limit, how much, and when it lifts.
- **What is missing.** Every fact below is in `message` only, and the envelope says of `message`: *"For a person.
  Never parse it; switch on `code`."* ✓

  | Code | The fact, in the message only |
  |---|---|
  | `AGENT_SESSION_ALREADY_STARTED`, `INTAKE_SESSION_ALREADY_STARTED` | the session the first start made: *"this request already started the agent session '<name>' (<id>)…"* (`routes/agents.ts:221` ✓, `routes/intake.ts:77` ✓) |
  | `INTAKE_DAILY_LIMIT_REACHED` | the day's limit, *"the <n> intake sessions a person may start in a day"*, and when it lifts: *"paused for today"* (`ai/intake.ts:113-114` ✓) |
  | `INTAKE_BUDGET_EXHAUSTED` | the platform's month, *"of $<n>"*, and *"until the month resets"* (`ai/intake.ts:77-78` ✓) |
  | `AGENT_BUDGET_EXHAUSTED` | the person's month and spend, *"of $<n> is spent ($<x> so far)"* (`ai/sessions.ts:181-182` ✓). Its reset *is* readable, from `getAgentBudget` |

  - The envelope already carries such facts for other codes: `pendingAction` for `TOKEN_ACTION_PENDING` ✓, and
    `launchReadiness` for `RELEASE_PRODUCTION_GATE_UNAVAILABLE` ✓.
  - The reset rules are written in the contract's prose (*"the first of the month, 00:00 UTC"*; *"midnight,
    Vancouver time"*). Meanwhile we compute from those, which is a rule we read, not a message we parse.
- **Why it matters:**
  - Rich wants every limit said plainly: *"we can tell them that their allocation is up, and when it resets."*
    For the intake's two limits we can only do that by copying the platform's rules into our code, where they
    drift silently if an administrator changes them.
  - A client cannot follow `*_ALREADY_STARTED`'s own remedy, *"end the session this refusal names"*, without
    parsing prose. `listAgentSessions` by name is a guess when two starts share a name. That cost is small: the
    orphaned key was never received, so it spends nothing, and it expires on its own (60 minutes by default).
- **Options:**
  - **(a) Recommended:** each refusal carries its facts as fields, beside `message`, as `pendingAction` does:
    - `error.session: { id, name }` on the two `*_ALREADY_STARTED`;
    - `error.limit: { scope: 'person' | 'platform', period: 'day' | 'month', resetsAt, amountUsd? }` on the three
      limits.
  - (b) At least `resetsAt` on the three limits.
- **When:** whenever the error envelope is next touched. It adds fields, so it is additive (D23.8).

### FE-30 — Nothing lets a support report meet the platform's log

*Raised 2026-09-27 at Rich's word, after F2's sitting 1, against manifest `e6a5f70`. Read, not measured. **Carried to the platform session 2026-09-28**, at Rich's word (to `manifest-b1`).*

- **Screen and moment:** every problem a faculty member is shown. Rich: *"if the member of faculty gets in touch
  with support, they will copy and paste the error and it will at least have an identifier so we can see what the
  actual issue is."*
- **What we would do** (F2's Decision 11): show a reference under every problem, *"If you contact support, quote
  7F3A-9C21"*, and keep a row saying what happened. For a refusal the browser meets at the platform, that row
  should name the platform's own record of the request.
- **What is missing:**
  - **The platform has no request identifier.** No response header carries one, the error envelope has no field
    for one, and nothing in `packages/control-plane/src` assigns one ✓ (`grep -i 'request-id\|genReqId\|reqId'`
    finds nothing).
  - **It logs only its `500`s**, and without a time or an id: one JSON line of method, URL and message
    (`api/server.ts:339-380` ✓). A refused request leaves no trace at all.
  - Its own remedy for `AI_UNMAPPED` reads: *"report the time to the platform's operator, whose log has the
    gateway's answer"* ✓. That is the gap, in the platform's words.
- **Why it matters:**
  - A faculty member's report reaches us with our reference, and we can say what they were shown.
  - We cannot say why the platform said it, and neither can the platform's operator, unless the time alone is
    enough.
- **Options:**
  - **(a) Recommended:** every response carries a request id in a header, and every refusal carries it as
    `error.requestId` too. The platform logs one line per refusal, not only per `500`, with the id, the time, the
    operation and the code. We record the id beside our reference.
  - (b) At least the header, and a log line for every `5xx`.
- **When:** before faculty use it for real. It adds a header and a field, so it is additive.

### FE-31 — `listBlueprints` offers a test fixture, with no CWL sign-in, to every client

*Found 2026-09-28 in F2's sitting 6, walking moments 3–5 on the real platform, against manifest `4738abb`.
Measured. **Carried to the platform session 2026-09-28**, at Rich's word (to `manifest-b1`).*

- **Screen and moment:** moment 4, *Make it*. D3 says an agent chooses the blueprint from `listBlueprints`, and the
  walk-through says the choice is trivial today: *"one blueprint, `node-ts-mongo@1`"*.
- **What happened:**
  - The platform lists **two**: `fixture-node@1` first, then `node-ts-mongo@1`.
  - `fixture-node@1` is a test fixture: `blueprints/fixture-node/blueprint.yaml` ✓ declares
    `auth_providers: [none]` and `ai: false`.
  - The laptop's 4B model answered the blueprint agent badly twice in one of two walks (`MODEL_ANSWER_INVALID`,
    reference `C3E6-ED02`). *Make it* then fell back to the list's first, and a faculty member's project,
    `reading`, was made from the fixture. Moment 4 then said *"A starting point with CWL sign-in is in place."*,
    which was untrue.
- **What we did** (F2 sitting 6, `fix:` after this finding):
  - the blueprint agent's answer must provide CWL when any blueprint does, or it is refused and retried;
  - the fallback is the first blueprint whose `provides.authProviders` includes `cwl`.

  Both read what the contract says a blueprint provides. Neither guesses from a name.
- **What is missing:** nothing in `Blueprint` (`ref, name, majorVersion, language, defaultPort, healthPath,
  schemaVersions, provides, starters` ✓) says that one is for the platform's own tests and not for people.
- **Why it matters:**
  - A client that trusts the list offers a fixture to a faculty member, or starts from it.
  - Our rule holds only while every real blueprint provides CWL. A future blueprint without CWL, rightly offered
    for a public app, would be skipped by our fallback.
- **Options:**
  - **(a) Recommended:** `listBlueprints` lists only blueprints meant for people. The fixtures are served to the
    platform's tests alone, by a setting.
  - (b) `Blueprint.purpose: 'people' | 'testing'`, and clients filter.
- **When:** before faculty use it for real. Either is small.

### FE-32 — An agent cannot add a dependency: nothing regenerates `package-lock.json`

*Found 2026-09-28 while preparing F3, from reading, against manifest `9c54bc3`. Not measured. **Carried to the platform session 2026-09-28**, at Rich's word (to `manifest-b1`).*

- **Screen and moment:** moment 6 (building it), and every change after it (moments 8 and 17), whenever what the
  person asked for needs a package the blueprint's skeleton does not already have.
- **What we would call:** `createCommit` with `package.json` changed **and** the regenerated `package-lock.json`,
  then `startBuild`.
- **What is missing:**
  - The build runs `npm ci`, which fails without a lockfile that matches `package.json` (the knowledge pack,
    `blueprints/node-ts-mongo/agents/AGENTS.md:10-13` ✓: *"Adding a dependency means adding it to
    `package.json` **and** committing the regenerated `package-lock.json`"*).
  - An agent working over the API cannot regenerate one: it has no `exec`, and cannot run `npm` (Phase 3's
    sandboxes, `journey.md` ✓). Writing a lockfile by hand means inventing every transitive version and
    integrity hash, which a model cannot do correctly.
  - So the lead can build only with what the skeleton (or its starter) already depends on.
- **Why it matters:**
  - The fixed stack covers the walk-through's app, so F3 is not blocked.
  - But the first request that needs a package (rendering Markdown, reading a spreadsheet, making a PDF) can
    only be answered *"we can't add that yet"*. Or the lead tries, and every build fails three times at `npm ci`.
- **What we do meanwhile** (not a workaround): the lead is told the stack is fixed, never adds a dependency, and
  says so plainly when a request needs one.
- **Options:**
  - **(a) Recommended:** an operation that resolves a lockfile. The agent sends a `package.json`, and the platform
    answers the `package-lock.json` resolved through its own mirror, for the agent to commit.
  - (b) The build regenerates the lockfile itself when every dependency is on the mirror's allowlist, and records
    what it resolved.
  - (c) Wait for Phase 3's `exec`.
- **When:** before a change after launch meets it (moments 8 and 17). F3 is not blocked.
- **Measured 2026-09-28** (F3 sitting 1, M4, manifest `346cd9e`): `package.json` given `marked@14.1.0` and no lock
  entry builds `failed` in 3.6 s. The telling lines, *"`npm ci` can only install packages when your package.json and
  package-lock.json … are in sync"* and *"Missing: marked@14.1.0 from lock file"*, are about 50 lines from the end of
  a 100-line log. `Build.error` and `build.failed`'s `reason` hold only npm's usage text after them.

### FE-33 — A revoked token keeps its open event stream, and goes on receiving the project's events

*Found 2026-09-28 in F3's sitting 1 (M3), against manifest `346cd9e` (contract 1.4.0). Measured. Not carried: Rich's
word decides that. **The platform recommends (a), 2026-09-29** (a close code of its own, e.g. `4401`, on revoke, archive,
delete and expiry; its own review's M6), in its next plan: see the table.*

- **Screen and moment:** moment 6. Our server watches the project's stream with the conversation's token for as long
  as a round runs. Any agent holding a delegated token can do the same (`docs/api/events.md` ✓).
- **What happened** (`scratchpad m3-after.mjs`, a token minted for the test):
  - a token opened `GET /v1/projects/{p}/events`, took its replay and the ready frame;
  - the person revoked it (`DELETE /v1/tokens/{id}`, `200`, `revokedAt` set);
  - **the socket stayed open, for the whole minute we watched, and was sent `agent_session.started` and
    `agent_session.ended`**, made afterwards with another token;
  - a new upgrade with the revoked token was refused (`1006`; a `GET` of the same URL answers `401 UNAUTHENTICATED`).
    So revocation is checked at the upgrade and never after it.
- **Why it matters:**
  - Revoking a token is how a person stops an agent (*agents.md* ✓: *"Ask the person for a new one"*). An agent
    stopped that way can still read what happens on the project: builds and their logs, incidents with their
    `logTail` and `prompt`, commits, who was added.
  - The events are redacted at capture, so no secret travels this way. What travels is everything else a revoked
    agent should no longer see.
  - The same holds for an expired token, if expiry is checked the same way (not measured).
- **Also measured, for the guide:** a token's upgrade for **another project** closes `1006`, and the `GET` says
  `404 NOT_FOUND`. The contract's close code `4404` (*"Not found — or not yours"*) was never sent to a token, and
  `4403` is a session's alone.
- **Options:**
  - **(a) Recommended:** revoking a token closes its open streams, with a close code of their own (say `4401`, *"the
    credential was revoked or expired"*), and an expired token's are closed at its `expiresAt`.
  - (b) The stream checks its credential on a timer, and closes `4401` within a minute of a revocation.
- **When:** before faculty use it for real. Our round closes its stream when the round ends (Decision 15), so F3 does
  not depend on it.

### FE-34 — The capable model's fallback also answers a request OpenAI refused as malformed

*Found 2026-09-28 in F3's sitting 1 (M1), against manifest `346cd9e` (9b's fallback). Measured. Not carried: Rich's
word decides that. **The platform recommends (a) in principle, 2026-09-29**, if LiteLLM 1.98's router can restrict a
fallback by error type (measured first), else (b): see the table.*

- **Screen and moment:** moment 6. The lead asks `default-chat-large` for one move at a time, as structured output.
- **What happened** (`scratchpad m1-why.mjs`, one agent session):
  - a `response_format` whose `json_schema` has an `anyOf` at its root (a union of moves, as zod writes it) is one
    OpenAI's strict mode documents it does not accept (the root must be an object). The primary call failed (the
    header below says a fallback was attempted); its own error is never shown to the client;
  - **the call still answered `200`**, from `ollama_chat/qwen3.5:4b`, at the on-premise price, with the header
    `x-litellm-attempted-fallbacks: 1`. It did so on every one of seven calls in M1's first run;
  - the same union wrapped as `{ move: … }` is answered by `default-chat-large` itself (`attempted-fallbacks: 0`,
    `model: "default-chat-large"`).
  - On the normal path `model` reads `default-chat-large`, not `openai/gpt-6-luna`. Only the fallback names its
    model (`ollama_chat/qwen3.5:4b`).
  - The on-premise model's context is 16k tokens: a 108k-token prompt was answered with `prompt_tokens` 16,386, cut
    without a word.
- **Why it matters:**
  - 9b's fallback was for OpenAI *being unreachable* (Spec action 8). LiteLLM's `general` fallback also covers a
    request OpenAI refused as wrong, so a client's own mistake looks like success from a smaller model, which is
    then given a prompt cut to its context.
  - We found it only because we read the header. Another client would build on a 4B model's answers and never
    know.
- **What we do** (not a workaround): the lead's schema is a root object (`{ move }`), a test holds it, and every
  answer's `x-litellm-attempted-fallbacks` and `model` are recorded (F3 Decision 4).
- **Options:**
  - **(a) Recommended:** the fallback answers only when the provider could not be reached or failed (a timeout,
    a connection error, a `5xx`, a `429`). A `400` from the provider is the client's, and is answered as one.
  - (b) At least the agents guide says so: read `x-litellm-attempted-fallbacks`, not only `model`, and a refused
    schema falls back silently.
- **When:** before a client other than ours meets it. F3 is not blocked.

### FE-35 — A confidential app's agent sessions get only the on-campus 4B model, which could not write the app

*Found 2026-09-28 in F3's sitting 7 (Task 12's real-platform walk), against manifest `e90de38` (contract 1.4.0).
Measured. **Carried at Rich's word, 2026-09-28, option (a)**, by F4's planning session to the platform session
(`manifest-7c`), which recorded it in its ORIENTATION §8 *Open*; its sitting 12 asks Rich where it goes. Until it
lands, a confidential project's session lists exactly `default-chat-onprem` and `default-chat-onprem-reasoning`
(`manifest-7c`, the same evening).* **Then DECIDED by Rich with the platform session, the same evening: Spec action 10
(manifest `d9a1fa1`), which supersedes this carry: the capable model may build a confidential app, by a platform
setting, and the app's own AI stays on-premise. The platform's sitting 11a builds it.**

- **Screen and moment:** moment 6, from the round's second agent session on: after *Carry on* at the $2 checkpoint,
  after *Stop* and *Carry on*, or after our server restarts.
- **What happened** (conversation `e46de81c`, project `fa907e61`, the test user):
  - the lead marked the app confidential, rightly: it keeps students' names and CWL IDs. Its commit wrote
    `data.classification: confidential` into `manifest.yaml`;
  - the next agent session listed only `default-chat-onprem` and `default-chat-onprem-reasoning`: a session's models
    are those whose `max_classification` reaches the project's newest valid manifest's classification ✓
    (`control-plane/src/ai/models.ts`, `classificationFloor` and `agentModelsFor`; `infra/litellm/config.yaml`);
  - **at Rich's word** (2026-09-28: *carry on, and say so*), our round carries on with `default-chat-onprem` and tells
    the person once. On it, the lead answered 11 times (4,000–8,600 tokens in, **24–85 out**), read files and asked
    questions, and **committed nothing in 10 moves**. Before that decision, the round had stopped as *"waiting on a
    Manifest administrator"*, which no administrator could change.
- **Why it matters:** most apps an instructor builds keep students' names, so most are confidential. Each can be
  written in its first session, on the capable model, and then carried on only on a model that does not write it.
  The person reads *"It may take a few more tries"*, then *"This is taking longer than it should."*
- **Options:**
  - **(a) Recommended:** a model capable of writing an app, approved for confidential data (UBC's call: an on-premise
    model large enough, or a provider under a UBC agreement), listed at `max_classification: confidential`.
  - (b) `startAgentSession` says why the capable model is absent (the classification that set the floor), so a
    client can tell the person what is true.
  - (c) At least the agents guide says that a confidential project's sessions are the on-premise models.
- **When:** before faculty build an app that keeps students' data, which is before real use. F3 is not blocked: it
  carries on and says so.

### FE-36 — An agent session keeps its models after a commit raises the project's classification

*Found 2026-09-28 in F3's sitting 7, against manifest `e90de38`. Measured. **Decided by Rich with the platform
session, 2026-09-28, in Spec action 10 (manifest `d9a1fa1`)**: a session holding more than its project now allows is
ended, its key revoked; the platform's sitting 11a builds it, and may give the end a reason of its own. **Built**
(`models_withdrawn`). **Changed by Rich, 2026-09-29**: the platform's next plan trims such a key in place instead (see
the table). F4's sitting 7 met it at Rich's click: the lead's own commit raised his app to `confidential`, every live
session ended though `default-chat-large` stayed allowed, and our round now carries on by itself in that case
(`5a1aa1f`).*

- **Screen and moment:** moment 6, the round's first session.
- **What happened** (the same conversation): the session started at 02:31 UTC while the project was `internal`, and
  listed `default-chat-large`. The lead's commit made the project `confidential` at about 02:43. The session went on
  being answered by `default-chat-large` until the round stopped (the trace's last answer, 02:43:47). The floor is
  read once, when a session starts ✓ (`control-plane/src/ai/sessions.ts`, `startAgentSession`).
- **Why it matters:** routing by classification (D17) is the platform's control over where a project's data may go.
  Our lead's prompts carry code and the plan, not students' data. But the lead is given a failed draft's incident,
  whose `logTail` is the app's own output, and another agent may be given more.
- **Options:**
  - **(a) Recommended:** a commit whose validated spec raises the classification ends, or re-routes, the project's
    live agent sessions, and says so on the stream (`agent_session.ended` with a reason).
  - (b) The gateway checks the project's current classification on each request.
- **When:** before faculty use it with real data. F3 is not blocked.

### FE-37 — No app on a draft address can sign in: the IdP demands a signed request the platform gives it no key to sign

*Found 2026-09-28 by Rich's click in F3's sitting 7, against manifest `e90de38`. Measured, and read in the platform's
code. Not carried: Rich's word decides that.*

- **Screen and moment:** the draft address itself, after moment 6's *"It started and answered."* A faculty member
  opens their app and presses *Sign in*. Moment 7 (*Seeing it*, F4) is built on this working.
- **What happened:** the app's `/login` redirects to the Manifest IdP with an unsigned `AuthnRequest`, and the IdP
  answers `500`, *"Validation of received messages enabled, but no signature found on message."* Measured on three
  sandbox apps (`student-q-and-a`, Rich's; `class-responses` and `weekly-readings`, the walks'). Why, read ✓:
  - every app's IdP row is rendered with `'validate.authnrequest': true` and its certificate, whatever the
    environment (`control-plane/src/sso/metadata-store.ts`, `renderSpMetadata`);
  - the app is given its private key only outside the sandbox: `if (ctx.environmentKind !== 'sandbox')
    env.SAML_PRIVATE_KEY_PATH = …`, *"Optional in sandbox, where an unsigned request is accepted"*
    (`control-plane/src/spec/injection.ts`; §8's table says `staging+production`);
  - the blueprint's `auth/ubcshib.js` signs only when that key is present, so a sandbox app never signs.
  - Both rules date from 2026-09-09 (`fdf63e8`, `bf19547`). The lead and the CWL specialist never touch `auth/`.
- **Why it matters:** no draft address can be signed in to, so nobody can try the app they asked for. Every app
  Manifest builds is behind CWL.
- **Options:**
  - **(a) Recommended:** the sandbox gets `SAML_PRIVATE_KEY_PATH` too, since the keypair is minted anyway and the IdP
    already holds its certificate. §8's row becomes `all`, and a platform test holds that a sandbox app's sign-in
    reaches the IdP's login form. An app already deployed is fixed by deploying its release again.
  - (b) A sandbox app's IdP row has `validate.authnrequest: false`, as the injection's comment assumes.
- **When:** now. It blocks every draft address's sign-in, and F4 builds on it.

### FE-38 — The last attempt cannot be told: instances are listed "seen most recently", and carry no time of their own

*Found 2026-09-28 by F4's sitting 3, from what F4's sitting 1 measured (M3) against manifest `d82b3a2`, and the
contract at `38c2ade`. It corrects FE-13's premise. **The platform recommended (a), 2026-09-29, and built it: contract
1.5.0, `d894b8e`** (its launch-path Task 4). **Adopted by us the same day** (`33e9251`, F5's sitting 0): the last
attempt is the newest failure made after the one serving. What follows is the finding as written.*

- **Screen and moment:** the Preview's two facts (moment 7), on every address: *serving right now* and **the last
  attempt**; and moment 9, where a failed attempt on the trying-out address offers *[What went wrong]*.
- **What we would call:** `listInstances`, and read the last attempt from it.
- **What is missing:** its order is *"the one seen most recently first"* (the contract), **not newest made**: F4's M3
  saw a new staging instance listed **second** while it started, below the one serving. And an `Instance` carries no
  time of its own: `lastSeenAt` only, which the serving one renews all the time, and which is `null` for one that
  never started. So a failure **before** a fix and a failure **after** the version serving are listed the same way,
  after the serving one. FE-13 assumed "newest first, so the last attempt is its first entry": it is not.
- **What we do meanwhile** (F4 Task 5's ruling, `screens/preview/facts.ts`): one on its way up is under way; else a
  failure is the last attempt when nothing serves, or when **its version is newer** than the one serving (the
  releases' `createdAt`); the same version failing is an earlier try. Right for every flow F4 builds (the draft only
  ever deploys newer versions; trying-out never puts the version already there). **Wrong for a rollback** (F6's *Start
  it again*, an older version put back): the older version answers, and the newer failure still reads as the last
  attempt.
- **Why it matters:** the two facts exist so a person is never told a failure is current when it is not, or the
  reverse. *"Didn't start, 4 minutes ago"* over a version that has since started and answered is exactly that.
- **Options:**
  - **(a) Recommended:** `createdAt` on `Instance` and `InstanceSummary` (when the deploy made it). The last attempt is
    then the newest, whatever the order.
  - (b) `Environment.lastAttempt`, as FE-13 (a) proposed: the instance, its state, and when.
  - (c) `listInstances` newest made first, as FE-13 assumed. It would change a published order.
- **When:** before F6's *Start it again*, which is the first flow our rule reads wrongly.

---

### FE-39 — Anyone with a CWL can build: nothing says who may, and a student can make an app

*Found 2026-09-29 by Rich, signed in to `app.manifest.internal` as the laptop IdP's `student`, after F4's close,
against manifest `0904ad5` (contract 1.4.0). **Decided by Rich the same day** (walk-through **D7**). **Carried at his
word the same day** to the platform session (`manifest-63`), for its launch-path plan.*

- **Screen and moment:** moment 1 (sign in) and every screen after it; moment 18 (adding someone to an app).
- **What happened:** a student signed in and could start an app. The platform knows two roles, `admin` and `member`
  (`Me.role`), and every CWL holder is a member; `createProject` and `startIntakeSession` answer any member. By design
  it does not ask the IdP for `eduPersonAffiliation` (`sso/platform.ts`: *"A platform role is Manifest's to decide (§9
  — authentication is the IdP's job, authorization is not)"*), so nothing can tell a student from a faculty member.
  Administrators are made by an operator's script (`scripts/admin-grant.sh`), with no setting and no API.
- **What Rich decided:**
  - *"This should be available to all members of faculty (using the associated CWL role). For everyone else (save for
    a prescribed list of admins), they should see a screen telling them that it isn't available for them at the
    moment."*
  - *"the platform, because this would then also work for agentic use"*: the rule belongs where every client meets it,
    an agent included, not in our screens.
  - *"Faculty members should be able to add other faculty members for now. Perhaps in the future they should be able
    to add TAs"*.
- **What we would call, and what is missing** (the names are the platform's to choose):
  - **At sign-in**, the platform asks CWL for `eduPersonAffiliation` and keeps whether the person is faculty. Unlike
    the admin role, it is refreshed at every sign-in: it is UBC's current fact about them.
  - **Administrators are a setting**: a list, **by PUID** (Rich's decision, below; we first wrote CWL logins). How it
    meets today's `admin` role and `admin-grant.sh` is the platform's to settle.
  - **One predicate: may build = faculty or administrator.** `createProject`, `startIntakeSession` (which spends the
    platform's money on a model before any project exists) and `addMember` (someone who may not build) refuse anyone
    else with a code of their own (for example `403 BUILDING_NOT_OPEN`, and one for `addMember`'s target).
  - **`getMe` answers the decision, not the attribute**: for example `mayBuild: boolean`. Every client reads one answer,
    and none re-derives the rule.
  - **Unchanged:** a token a faculty member minted keeps working (it is how their agents act), and a project's members
    keep their roles.
  - **A member who stops being faculty keeps their apps and starts nothing new** (Rich's decision, below; we first
    recommended losing access).
  - **The mock** answers `mayBuild: true`, and a switch (for example `MANIFEST_MOCK_MAY_BUILD=0`) answers `false` and
    refuses the three operations, so we test and walk both ways.
  - **On the laptop:** `instructor` is faculty; `student` and the staff test user are not.
- **Why it matters:** Manifest is for faculty, for now. A student who starts an app spends the platform's model money
  and makes a project, an address and (on driver 2) a real repository; an agent acting with a student's session could
  do the same, which no screen of ours can stop.
- **Options:**
  - **(a) Decided by Rich:** the platform, as above.
  - (b) Our screens alone: rejected. Our server never sees the CWL assertion (FE-2), and the API stays open to anyone.
  - (c) The IdP refusing everyone else at sign-in: rejected. No page could say why, and it would be UBC IAM's rule, not
    Manifest's.
- **For us, meanwhile:** nothing changes until `getMe` answers it. Then the *"isn't available to you"* screen (moment
  1), our server refusing new conversations and changes with the same code, and moment 18's faculty-only words. A
  small plan of our own, *"Only faculty build"*, written now and built when it lands.
- **Later:** TAs (Rich: *"Perhaps in the future"*), as a change to the one predicate.
- **In the platform's launch-path plan** (`manifest-63`, `3f20f83`, 2026-09-29): Task 8a in its sitting 5a, with Spec
  action 7; **confirmed by Rich there the same day** (`e46df38`), and **Spec action 7 applied at his *"apply 7"***
  (`dcbd023`: §9 asks CWL for `eduPersonAffiliation`, and only `faculty` or an administrator may start a project or an
  intake session, or be added to one; §6 `User.affiliations`; §13 *Who may build* heads *Roles*, its collaborator now
  *"an invited co-instructor (a TA once who may build includes TAs)"*; §20 administrators may be named by a setting of
  PUIDs). No contract change yet: `mayBuild` lands at sitting 5a. Its shape: `users.affiliations`, refreshed at every
  sign-in (an assertion without the attribute is `[]`, not faculty); `mayBuild(user)` = administrator, or **exactly the
  affiliation `faculty`** (Rich: no setting for other values; a sessional lecturer UBC marks `staff` builds only if the
  administrators' list names them); **`Me.mayBuild: boolean`**; `createProject` and `startIntakeSession` **`403 BUILDING_NOT_OPEN`**;
  `addMember` with a target who may not build **`409 MEMBER_MAY_NOT_BUILD`**, naming them; the mock's
  **`MANIFEST_MOCK_MAY_BUILD=0`**; a second faculty test user, `colleague`. It messages us at the contract commit.
- **As sitting 5a's session described it to us** (`manifest-74`, 2026-10-01 04:45Z, before its contract commit; F4a's Task 1
  reads what actually lands): **`Me.mayBuild: boolean`, required**, true for exactly `faculty` at the last sign-in or a
  platform administrator. `createProject` and `startIntakeSession` answer `403 BUILDING_NOT_OPEN` **first, before anything
  else is checked**. `addMember` answers `409 MEMBER_MAY_NOT_BUILD` only when the person named may not build **and is not
  already a member** (a member who stops being faculty keeps their place, and their role can still change); its message
  names them, its hint *"Add a faculty colleague instead. Nobody was added."*; a token's confirmed retry reaches
  `addMember`, so an agent can meet the `409` after a person confirms (F6's *People*). **The mock:** `mayBuild` true by
  default; `MANIFEST_MOCK_MAY_BUILD=0`, or `createMockServer({ mayBuild: false })`, answers false and both refusals (an
  administrator's role still builds); its `MEMBER` fixture may become a faculty colleague (we told it nothing of ours reads
  it). **The laptop's IdP:** `student`/`student` may **not** build (affiliation `student`); `operator`/`operator` is `staff`,
  building only as an administrator; `instructor` and a **new `colleague`/`colleague`** (`col000001`, faculty) build.
  **`MANIFEST_ADMIN_PUIDS` is unset by default** (`scripts/admin-grant.sh` stays the procedure). Contract 1.5.0.
- **Rich decided the platform's two differences, 2026-09-29, each its recommendation:** administrators **by PUID**
  (`MANIFEST_ADMIN_PUIDS`: UBC can reassign a CWL login, which would hand admin to a stranger; when set, authoritative
  and reconciled at every sign-in; when empty, `admin-grant.sh` stays the way in); and **someone who stops being faculty
  keeps their memberships and tokens, and starts nothing new** (a course app mid-term keeps its owner). Our part
  follows: the *not available* screen for someone with no apps, *Your apps* without *Start something new* for someone
  who keeps apps, and our server refusing only a new start.

### FE-40 — The mock cannot play a launch: never ready, never a step-up, one approval and one dry run

*Found 2026-09-29 while F5 (moments 10–15) was written with Rich (`manifest-app-ce`), against manifest's working tree
at `20838d4` (contract 1.4.0, 66 operations). **Decided by Rich the same day:** file it, and carry it now.*

- **Screen and moment:** *Going live* (moments 11–14): the checklist, the dry run, the sign-off, and *Let your students
  in* with its step-up.
- **What we would call:** `getLaunchReadiness`, `runRehearsal`, `getApproval` and `deploy` to production, from the
  person's session in the browser, and `/auth/step-up` when `deploy` answers `403 STEP_UP_REQUIRED`: exactly as on the
  platform.
- **What is missing, in the mock** (`packages/mock/src/server.ts` and `fixtures.ts`, read 2026-09-29 ✓):
  - **A first launch is never ready.** `LAUNCH_READINESS` is `ready: false` (`fixtures.ts:623-629`). The one ready
    checklist, `SELF_SERVE_READINESS`, is a LAUNCHED app's (`launched: true`, `:695-704`). So *Let your students in*
    can never be offered in mock mode.
  - **No step-up, by design** ✓ (`server.ts:45-47`: *"WHAT IT DELIBERATELY DOES NOT ENFORCE: … §20's STEP-UP"*). A
    production `deploy` is never answered `STEP_UP_REQUIRED`, and the mock has no `/auth/step-up`.
  - **A production deploy answers staging's fixture** ✓ (`:250-257`: *"Production still answers staging's fixture —
    the mock scripts no launch"*).
  - **One approval, always approved** ✓ (`:426-435`: *"A screen that needs a REJECTED approval drives the platform,
    not this"*): no `404` before a decision, and no rejection with a reason.
  - **One dry run, always passed** ✓ (`:407-412`, `f.REHEARSAL`, `passed: true`): no failure and its evidence.
- **Why it matters:** every other moment is walked and checked in mock mode before the real platform, and each of
  F2–F4's acceptance scripts runs there. Moment 14's step-up is the one place a person proves who they are, and it
  could only ever be seen on 7100, where each project is now a real repository on GitHub. Meanwhile F5 asserts what
  it SENT against a recording fake (ORIENTATION §7), and its browser walks rewrite the mock's answers in DevTools, as F4
  sitting 6 did for trying-out.
- **Options:**
  - **(a) Recommended, and decided by Rich:** opt-in switches, like `MANIFEST_MOCK_LAUNCHED`, so the mock's defaults
    and the console's tests stay as they are (the names are the platform's to choose):
    - a first launch that is ready (`ready: true`, `launched: false`, every blocking item met), with a production
      `deploy` that answers a production instance of its own;
    - a production `deploy` (and a production secret) answered `403 STEP_UP_REQUIRED` until the session has stepped
      up, and an `/auth/step-up` that steps it up and redirects to `returnTo`;
    - `getApproval` answered `404` before a decision, and a rejection with a reason;
    - `runRehearsal` answered `passed: false`, with evidence shaped as the platform's.
  - (b) Nothing: F5's mock-mode checks stay on recording fakes and rewritten answers.
- **When:** the platform's launch-path plan, **Task 13** (sitting 10), which already scripts the mock's drafts,
  submissions, requests and queue. F5 never waits on it; F5b's acceptance would use it.
- **Carried 2026-09-29, at Rich's word,** to `manifest-13`, which recorded it in the launch-path plan (its own section
  after FE-39's, and a note at Task 13's head listing the four switches, the defaults unmoved). **PROPOSED there until
  Rich confirms it to a platform session**, its house rule for a relayed decision; its next session's §7e asks him.
  **Confirmed by Rich** to `manifest-c3`, and to us in his words (2026-09-29).
- **Measured by F5's sitting 1 (M7), against our mock at manifest `84d485a`:** each point above holds. `getApproval`
  answers the fixture's approval for the fixture release and `404` for any other id; `runRehearsal` answers
  `passed: true`; a production `deploy` answers `200` with **staging's** instance though the checklist says
  `ready: false`; `getEnvironment(production)` answers staging's environment; `listAppSecrets(production)` answers a
  staging fixture under a random environment id; `createApprovalPreview` answers `201`; and **`/auth/step-up` is `404`**,
  so our page's *[Sign in again]* leads nowhere in mock mode.

---

### FE-41 — Make it fails for an app on a starter: `createProject` with `proof-app` answers `409 SOURCE_GIT_FAILED` on real GitHub

*Found 2026-09-30 (04:20Z) by F5's sitting 1 (`manifest-app-a0`), on 7100 at manifest `84d485a` against REAL GitHub
(driver 2, `Manifest-local-dev`), contract 1.5.0. **Carried at Rich's word the same evening** (*"Carry it now"*) to
`manifest-c3`, and **confirmed by Rich to it** (manifest `2a663ff`: *"Fold into sitting 4"*): the launch path's **Task
6a**, first in its sitting 4 (make a create's source failure visible, reproduce it with `proof-app`, fix the seed on the
real driver with a test). **Fixed there across `0f2275a..ebfc571`** (reported by `manifest-a1`, 2026-09-30, its sitting
still running): the cause was not the starter but GitHub's first seconds after a create (the status table).*

- **Screen and moment:** moment 4, *Make it* (*"We couldn't make it just now. Nothing was made. Try again."*).
- **What we called:** `createProject` from the person's session, as the page does, with the blueprint our blueprint agent
  chose: `{ blueprint: 'node-ts-mongo@1', starter: 'proof-app', … }` (read back from our store: the conversation's
  `blueprint` message).
- **What happened:** **`409 SOURCE_GIT_FAILED`, twice**, about 8 s after the press (references `CCB0-30F0`, `7FC2-5D35`,
  different slugs). **Nothing was made**: the slug stayed free, no project was listed, and no mirror was left. **The same
  call from Node with no `starter` answered `201`** in 8.8 s (`f5-reading`). The control plane's log (its `cp-close.log`)
  has only its boot lines, so the cause is not visible from our side; a starter's seed on real GitHub is the difference
  we can see.
- **Why it matters:** our blueprint agent chooses `proof-app` whenever sign-in is wanted, which is nearly every class app;
  on real GitHub **no such app can be made**, and the person is told to try again, which fails the same way. The real
  platform's first-run fixes (its launch-path sitting 2) did not cover a starter.
- **Options:**
  - **(a) Recommended:** the platform finds and fixes the starter's seed on real GitHub (its own diagnosis: we cannot see
    its log), with a test of `createProject` with a starter on the real driver.
  - (b) Meanwhile our blueprint agent is told never to choose a starter. **A workaround, so not ours to take** (the rule:
    an API gap is a finding): it would also change what apps start from.
- **When:** before F5's acceptance (sitting 6), which makes its project through our page on 7100; and before faculty
  use it for real.

---

### FE-42 — The dry run is an administrator's alone: the owner is refused `runRehearsal`

*Found 2026-09-30 by F5's sitting 1 (M4), on 7100 at manifest `84d485a`, contract 1.5.0. It corrects F5's Decision 8 and
the walk-through's moment 12. **Decided by Rich, 2026-09-30: (c)** (*"Both: row now, ask platform"*): F5 shows the
administrator's row now, and **(a) is carried** to `manifest-c3`, and **confirmed by Rich to it** (manifest `2a663ff`: *"Yes, its
own small sitting"*): the launch path's **Task 6b**, a new sitting 4a after its sitting 4 (spec §13, §20 and D24 read
first; a capability the owner holds; `runRehearsal`'s description to say who may run it). **Rich's answer to 4a's question,
relayed by `manifest-73` to F5's sitting 4 (2026-09-30): persons only**: the owner, collaborators and administrators may run
it from an interactive session, and a delegated token stays refused exactly as today, so no new refusal reaches a token; 4a's
only contract change is `runRehearsal`'s description (1.5.0 stays). F5 shows the administrator's row until it lands
(`dry-run.tsx`, where the press returns). **(a) landed (4a, `fa02bbc`); its review re-asked Rich, and he decided Spec action 8
= (b) + (c) (2026-09-30): a step-up before a dry run, and it takes itself down (the platform's 5b). The press is built, F5's
sitting 6 (`71fceba`), at his "Build it now", against 5b as described (the table above).***

- **Screen and moment:** *Going live*, the dry run (moment 12): **[Run the dry run]**, the person's own press in F5's
  design (Decision 8, approved with Section 3).
- **What we called:** `runRehearsal` from the owner's session, with an `Idempotency-Key`.
- **What happened:** **`403 FORBIDDEN`, *"role 'owner' may not 'launch:record'"***. By design ✓: the platform's
  authorization table says *"D21's rehearsal … the same actor answers as the other two: an administrator alone, in an
  interactive session"* (`packages/control-plane/src/api/authz-contract.ts`, the rehearsal row: owner `403`, collaborator
  `403`), and the checklist names the item's owner *"Manifest"*. The contract's description of `runRehearsal` does not
  say who may run it. As `operator` (an administrator) it passed in 7 s, and **it carries on when its caller goes**.
- **Why it matters:** the walk-through's moment 12 gives the faculty member the press (*"Run the dry run"*, minutes, done
  for you), and F5's Task 7 builds it. As the platform stands, the only honest row is *waiting on someone*: an
  administrator runs it, and nothing tells them it is waiting (FE-25's gap, for the sign-off, is the same shape).
- **Options:**
  - **(a)** The platform lets the project's owner run the rehearsal: it deploys the candidate the owner already put on
    staging, behind the gate, with production-shaped values, and proves only a shape, which is not a decision about UBC's
    records. Then F5's Decision 8 stands as approved.
  - **(b)** F5 shows the row as an administrator's: *"A Manifest administrator runs it. Manifest doesn't tell them yet
    that it's waiting."*, no button (Rich's no-stopgap rule), and F5b asks for it with the sign-off (FE-25's request).
  - (c) Both: (b) now, (a) carried for the launch path.
- **When:** before F5's sitting 4 (Task 7, the dry run).

### FE-43 — No read of a dry run: one under way, or how the last one ended, cannot be read back

*Found 2026-09-30 by F5's sitting 6, in its own review (I-C), building the owner's press against 4a and the platform's 5b
as `manifest-d4` described it. Not carried: Rich's word carries it.*

- **Screen and moment:** *Going live*, the dry run's row (moment 12): *[Run the dry run]*, *"You can leave: it carries
  on."*, and a failure's *[Fix it]* with what it saw.
- **What we would call:** a read of the project's dry runs: whether one is under way, and the latest one's answer (the
  `Rehearsal`: `passed`, and its `evidence`), for the candidate on trying-out.
- **What is missing:** only `runRehearsal`'s own answer carries it, to the one request that ran it. The checklist item
  says `met` or `unmet`, never "under way" and never why; `rehearsal.completed` reaches us only on an event stream (F6's
  watch). **So the page holds the press in its own memory** (sitting 6: per app, never browser storage): a person who
  leaves as told and comes back in the same tab sees it working, then how it ended; **after a reload, or in another tab,
  nothing** — the row offers *[Run the dry run]* again beside one under way, and a failure's evidence is gone.
- **Why it matters:** a second run beside the first is a second deploy to the live setup (with 5b, one run's take-down
  could meet the other's probe); and a failed run's *[Fix it]* is lost to anyone who did not stay on the page.
- **Options:** **(a)** `listRehearsals(projectId)` (or the latest on `getLaunchReadiness`'s item), with an `inProgress`
  state; **(b)** the platform refuses a second run while one is under way (`409`), and F5 reads the checklist; **(c)**
  leave it, and say less than *"You can leave: it carries on."* (Rich's words).
- **When:** before faculty run it for real; F5 works meanwhile in one tab.

### FE-44 — A large course's app can never launch: its load rehearsal blocks, and is not built

*Found 2026-10-01 by F5's sitting 6, walking the real platform (7100, `66ac53c`), and read in the control plane's
`launch/readiness.ts`. Written at Rich's word ("write it, you decide later"); not carried.*

- **Screen and moment:** *Going live* (moments 11 and 14): the checklist, and *[Let your students in]*, offered only when
  every blocking item is met.
- **What happened:** the walk's app, *"My answers"*, was made from *"About 200 students"*, so the intake set its audience
  to *a large course*. Every item reached `met` (the address, the registration, the assessment, the dry run, the scans,
  the sign-off), but **`ready` stays `false` for good**: `load-rehearsal` is listed for a `large_course` or `public`
  audience, `blocking: true`, `state: 'not_built'` (*"a later Manifest release (§24's load rehearsal)"*), and `readyOf`
  needs every blocking item `met`.
- **Our part in it (`manifest-00`'s catch, the same evening):** *"About 200 students"* is a **class** by the platform's
  spec §24 (one course section, up to ~400); our intake's prompt named the scales without their ceilings, so the model
  guessed *a large course*. Fixed (`4bfc57e`): the prompt gives each scale its meaning and rough ceiling. **FE-44
  stands for a real large course (several sections, up to ~5,000) and a public app.**
- **Why it matters:** a large course's or a public app's owner cannot go live on the platform as it stands, and
  nothing tells them so but a row; a faculty member reaches *"Done"* on every job they can do and never sees the
  button. **Ours, fixed meanwhile** (`2f83f62`): a blocking item that is not built reads *waiting on the Manifest team*,
  *"Manifest can't do this one yet, and your app can't go live until it can. It comes in a later Manifest release."*
- **Options:**
  - **(a)** the platform builds the load rehearsal (§24) before faculty use it for real;
  - **(b)** an item that is `not_built` does not block until it is built (the gate reads it as a person does: *not yet*);
  - **(c)** it stays, and we say so earlier (on the Overview's band, before the dry run), so nobody does the work first.
- **When:** before faculty with a large course use it; F5's acceptance walked moments 14 and 15 in Rich's own click (a
  class-sized app), at his word.

### FE-45 — An owner cannot put away an app that has been live: delete is refused, and nothing else takes it off their list

*Found 2026-10-01 writing F6's design (moment 20), with Rich. **Rich's decision, the same day:** *"We can't allow folks to
delete apps that have been actively used. i.e. production databases can't be deleted. We'll need some way to 'mark as
deleted' which removes it from all paths, but we can't delete the data. That can only be an admin decision (due to data
retention)"*; the line is **never been live** (an owner may still delete an app that never launched, as `deleteProject`
allows today). Carried at his word ("make a record of this, so it gets built in the future"): `manifest-60` was not
running, so it went to `manifest-8e` for the platform's record at its sitting 7's close.*

- **Screen and moment:** moment 20, *End of term*: the Overview's *Switching it off*, and *Your apps*.
- **What we would call:** an owner's *mark as removed* on a switched-off project.
- **What is missing:**
  - `deleteProject` refuses a launched project, `409 PROJECT_LAUNCHED_NOT_DELETABLE` ✓, rightly: its data is students'.
  - `archiveProject` keeps it, and it stays in `listProjects` and every route for its members for ever ✓. An owner who is
    done with a course's app has nowhere to put it but a switched-off card, every term after.
  - Nothing lets an administrator delete a launched project's data once UBC's retention allows (the app's own
    `data.retention_days`, if it declared one).
- **Why it matters:** *Your apps* fills with switched-off apps nobody will open again, and the only way to tidy it would
  delete what UBC's rules keep. Hiding them in our screens alone would be a workaround: the reference console and any
  agent would still see them.
- **Options:**
  - **(a) Recommended:** a project state *removed*, after *archived*: the owner's `removeProject` (person-only, step-up, on
    an archived project; `409` otherwise). A removed project drops out of `listProjects` and answers its members `404`;
    its name stays taken; its code, data, secrets and records are kept. **An administrator alone** lists removed projects,
    restores one to *archived*, or deletes it for good when retention allows (`deleteProject` for an administrator, on a
    removed project, whatever `launchedAt` says). An event each: `project.removed`, and the administrator's own.
  - (b) The same, without a new state: `archivedAt` plus a `removedAt` the listings filter on.
- **Ours meanwhile (F6):** a live app's owner sees *Switch it off* only, and *"Apps that have been live are kept, because
  UBC's rules decide when students' data is removed. Switch it off, and a Manifest administrator removes it when the rules
  allow."* When it lands, **[Remove it from your apps]** follows, and our own rows for it are kept under the same
  retention (what students and owners wrote to us is part of it).
- **When:** Rich's word: *"so it gets built in the future"*; not before F6.

### FE-46 — The owner sends to LTIC, not to UBC: the launch records have no step between the two, nobody at LTIC is told, and the assessment's gaps have nowhere to be answered

*Found 2026-10-01 while F5b (moments 10 and 13's own actions) was designed with Rich (`manifest-app-d9`), against manifest
`a230c1a` (contract 1.5.0, 72 operations). **Decided by Rich the same day:** file it, and carry it now; F5b is designed
against it, and its build waits for it.*

- **Screen and moment:** *Going live* (moments 10 and 11): the three steps in UBC's order (the privacy assessment, the
  staging registration, production's), each with its one action, and the band's *[Start them]*.
- **How UBC's process runs** (Rich, 2026-10-01): *"Sent to LTIC. And then submitted to PRISM by LTIC."*, and **all three go
  via LTIC**: the faculty member sends the assessment and both registrations to LTIC (the team that runs Manifest), and
  LTIC submits the assessment to PRISM (UBC's privacy system) and the registrations to UBC IAM. A faculty member never deals
  with UBC's forms. And *"It emails us and we fill out the appropriate forms"*: the platform tells LTIC (Rich: the platform,
  not the front-end's server).
- **What we would call:** after `draftPrivacyAssessment` / `draftIamRegistration`, the owner's **send to LTIC**, from their
  own session (person-only, as `launch:submit` is): the day (today), the draft they read (`draftGeneratedAt`), and **for the
  assessment, their answers to its gaps**. Then, read back: *with LTIC since 5 October*, then *with UBC's Privacy Office
  (or identity team) since 7 October*, then UBC's answer.
- **What is missing:**
  - **A state for "with LTIC".** The records go `draft → submitted → approved | active`, and `submitted` means UBC has it
    (`IamRegistration.submittedAt`: *"When the request now with UBC IAM was sent"*; `submitIamRegistration`: *"says the
    staging or production registration was sent to UBC IAM"*; `submitPrivacyAssessment`: *"sent to UBC's Privacy
    Office"*). The owner's press would claim UBC has it while LTIC still has to fill out PRISM's form, and the wait would
    be counted against UBC from a day UBC never saw it. An administrator's later `record…` with UBC's reference cannot say
    *"now with UBC"* except by a field being set: a state read from a field, which we never do.
  - **Nobody at LTIC is told.** `listQueue` lists a `submitted` record (*"here, to record UBC's answer"*), but nothing emails
    the administrators, so a sent document waits until someone opens the console.
  - **The assessment's gaps have nowhere to be answered.** `PrivacyAssessmentDraft.sections[].gaps` are strings (*"what the
    app keeps in its own database"*, *"where UBC will host it"*); `SubmitLaunchRecordRequest` carries `sentAt`, `reference`
    and `draftGeneratedAt` only. LTIC cannot fill out PRISM's form without the owner's answers, and the gaps carry no id to
    key an answer to.
- **Why it matters:** *"Name the owner of every wait"* (`10-language.md`). Between the owner's press and LTIC's submission,
  the wait is LTIC's, and the page would name UBC; LTIC would not know it has anything to do; and the one part of the
  assessment only the faculty member can write would travel by a separate email, outside the record LTIC works from.
- **Options:**
  - **(a) Recommended, and decided by Rich: a step of its own, and LTIC told** (the names are the platform's to choose):
    - **A state between `draft` and `submitted`**, for all three records (*sent to LTIC*): the owner's send (person-only,
      `launch:submit` as today) moves `draft → sent` (a registration also from `change_requested` and `expired`), with
      `sentAt` and `sentBy`; **an administrator** then records **`sent → submitted`** when LTIC has submitted it to PRISM or
      UBC IAM, with UBC's reference and that day as `submittedAt`. UBC's order gates the owner's send, as it gates the
      submission today (the assessment approved before staging's is sent; staging's active before production's).
    - **`LaunchReadinessItem.since`** dates the wait from `sentAt` while it is with LTIC, and from `submittedAt` once UBC
      has it, so a client can say who has it and for how long.
    - **`listQueue`** lists a record LTIC holds (*to submit to PRISM* / *to submit to UBC IAM*), oldest first, apart from
      one UBC holds (*to record UBC's answer*).
    - **The platform emails LTIC** (an address it is configured with; Mailpit on the laptop) when a record is sent to it,
      naming the app and what was sent, with a link to the record in the console. Never the owner's answers in the email
      body, if the platform prefers them read in the console. **And the same for a sign-off request** (Rich, 2026-10-01,
      the same session: *"Yes, and email it too"*): `approval.requested` emails LTIC too, so *"A Manifest administrator
      looks at this next"* is backed by someone being told (the note stays out of the email, as it stays out of events).
    - **The owner's answers to the assessment's gaps**: each gap gains a stable id, and the send carries
      `answers[] { gapId, answer }` (plain text, bounded), kept on the record beside the draft as it was sent, and shown
      to administrators. **The front-end suggests each answer** (Rich: *"Our agent suggests, they check"*: our agent drafts
      an answer from the app's agreed plan and its code, and the faculty member reads and changes it before sending), so
      the answer the platform keeps is always the person's own.
    - **Events** for the stream, as `…submitted` has today: one when a record is sent to LTIC, one when LTIC submits it.
  - (b) The owner's `submit…` read as *sent to LTIC*, and an administrator's `externalTicketRef` read as *now with UBC*.
    *Rejected by Rich*: a state read from a field, and the queue and the stream would still say UBC has it.
  - (c) F5b waits, designed only once the platform has built the step. *Rejected by Rich*: F5b is designed now against
    (a), and marks plainly what waits for it.
- **When:** carried now, at Rich's word (2026-10-01). **Before F5b is built**: F5b's sittings that send anything wait for
  it; its drafts, its *waiting since* from the records as they are, and the sign-off request do not. The platform's mock
  half (its launch path's Task 13, sitting 10) would script the new step too.
- **Not asked here** (F5b's own, or later): what UBC asked when it comes back with questions (`changeRequestedFrom:
  submitted`), which LTIC relays to the owner today by its own means.

### FE-47 — After launch, an owner cannot ask for a new sign-in detail, and every build that needs one fails until UBC registers it

*Found 2026-10-01 while F6b (moments 17, 18 and the Agents screen) was designed with Rich (`manifest-app-d9`), against
manifest `a230c1a` (contract 1.5.0, 72 operations). **Decided by Rich the same day:** file it, as FE-46 (*"File FE-47, as
FE-46"*): carried now, and F6b's moment 17 is designed against it.*

- **Screen and moment:** a change after launch (moment 17), whose agreed plan adds a detail about the people who sign in
  (a CWL attribute: their last name, their affiliation). The walk-through: *"…and UBC's identity team must agree to share
  it first."*
- **How it runs at UBC** (Rich, FE-46): the faculty member sends to LTIC, and LTIC files it with UBC IAM. For a live app's
  registration that is a **change request** (`change_requested` from `active`, Spec action 10).
- **What we would call:** the owner's **ask for a change to the live registration**, from their own session (person-only):
  the attributes wanted, with a package drafted for them (each attribute's purpose and where the app reads it, as
  `draftIamRegistration` justifies one), sent to LTIC; then, read back: *with LTIC since 5 October*, *with UBC's identity
  team since 7 October*, *registered*.
- **What is missing:**
  - **No owner write on an `active` registration.** `draftIamRegistration` refuses it (`409 LAUNCH_RECORD_SUBMITTED`: it
    drafts again only from `change_requested` or `expired`), and `submitIamRegistration` moves only from `draft`,
    `change_requested` or `expired`. Only an administrator can file the change (`recordIamRegistration` to
    `change_requested` with `requestedAttributes`), and nothing tells them an owner wants one.
  - **Every build that needs it fails meanwhile.** Once production's registration is registered, `releases/build.ts`'s
    `assertAttributesRegistered` fails any build, the sandbox's included, whose manifest asks for an attribute not in
    `registeredAttributes` (naming a change request on file, if there is one). So the change cannot even be tried on the
    draft address until UBC has registered the detail.
  - **Nobody at LTIC is told** (FE-46's gap, for this request too).
- **Why it matters:** moment 17's third kind of change has no path but an email outside the platform. A faculty member
  whose change needs one more detail meets a failed build with a reason they cannot act on, and nobody owns the wait.
- **Options:**
  - **(a) Recommended, and decided by Rich: an owner's request for a change to the live registration, through LTIC as
    FE-46's sends are** (the names are the platform's to choose):
    - from `active`, the owner (person-only, `launch:submit` as today) asks for the attributes wanted, with a package drafted
      from the newest valid manifest (as staging's is), and the request goes to LTIC (FE-46's *sent to LTIC*); LTIC files it
      with UBC (`change_requested` from `active`, as an administrator does today), and UBC's answer is recorded as now;
    - `LaunchReadinessItem.since` and `listQueue` date and list it (FE-46's rules);
    - the platform emails LTIC (FE-46's email).
    - **Not asked here:** the build's check stays as it is. The front-end's conversation stops before building, says
      why and who has it, and carries on once the detail is registered.
  - (b) Say no, for now: a change's plan leaves a new sign-in detail out of a live app, with no path. *Rejected by Rich.*
  - (c) LTIC told by an email from the front-end's server, nothing recorded on the platform. *Rejected by Rich*: no wait
    can be counted, and nothing is in the queue.
- **When:** carried now, at Rich's word (2026-10-01). F6b's moment 17 waits for it for that one kind of change; its other two
  kinds (straight to students; an administrator's look) do not.

### FE-48 — A watch token's stream closes `4401` without a reason, and the change that closed it never arrives

*Found 2026-10-02 by F6's whole-branch review (sitting 7's unattended half, `manifest-app-s7`), against manifest `8ff925f`
(contract 1.5.0, 72 operations). Written, not carried: for Rich.*

- **Screen and moment:** moments 16 and 20, our server's *Keeping watch* (F6). The keeper keeps one read-only token per app
  and follows its event stream; it keeps the app's state and members from what that token reads.
- **What happens** (✓ `docs/api/events.md` line 102, *"a token's stream closes `4401` before `project.archived` or
  `project.deleted` reaches it"*; ✓ measured in F6 sitting 1, M4 and M7; ✓ the contract's `removeMember`: *"their delegated
  tokens on it are revoked, their open event streams on it close (`4401` a token's…)"*): a switch-off, a delete, an expiry,
  a revocation, and **taking the token's minter off the app** all close the stream `4401`, alike, and the event that says
  what changed (`project.archived`, `member.removed`) never reaches it. The token can read nothing afterwards.
- **What we would call:** nothing new: we would read **why** in the close (`4401` with a reason: *switched off*, *deleted*,
  *expired*, *revoked*, *its minter taken off the project*), or receive the event before the close.
- **What is missing, and what it costs:**
  - **Our server cannot tell a switch-off from the rest.** It went on saying an app was down, answering again, or that a
    change didn't go live after its owner switched it off. **Our side is fixed** (`fca7e49`): the page, which reads the
    project's state in the person's session, keeps a switched-off app's questions alone.
  - **Our kept members go stale exactly when the watch dies.** The person taken off an app is, most often, the one who
    minted its watch token (Make it hands over the creator's), so `member.removed` is never heard: they stay a member in
    our rows until another member's page hands a new token. Meanwhile our routes would answer them that app's needs, lines
    and history, and our `DELETE` would let a former owner forget our rows for it. **Our side, in part** (the review's I2):
    an app we no longer watch trusts the token handed over, not our kept members (so a new member mints, and the members
    are read again); *Your apps* draws needs and lines only for the apps the platform lists as theirs. **A hand-crafted
    request by a former member still reads `…/history` and can `DELETE` until a member visits**: our server has no way to
    ask the platform who is on an app but the token (FE-2: the person's session is replayed to `/v1/me` alone).
- **Options:**
  - **(a) Recommended:** the close carries its reason (a `4401` close reason, or a final frame before it), so the keeper
    marks the app switched off or deleted, or reads its members again with another member's next token.
  - (b) The event first, then the close, as for any other event (events.md's order reversed for these).
  - (c) Leave it: our page keeps the truth by the platform's state, and the residual stays (a former member's hand-crafted
    reads until a member visits).
- **When:** any platform sitting; nothing of F6 waits on it.

## Not a gap: decisions that are Rich's

- **The building agent's model on the laptop is `qwen3.5:4b`**, a 4B-parameter model ✓ (`infra/models.txt`;
  `infra/litellm/config.yaml` maps all four chat names to it). Spec §21 already says offline agent quality will
  be poor. Whether the front-end is developed and demonstrated against it, or against a larger model behind the
  same LiteLLM (which keeps D2, D8 and D17 intact), is Rich's call. It is not a finding.
