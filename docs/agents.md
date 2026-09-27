# The agents

*Started 2026-09-27, from Rich's direction the same day. This document grows alongside
[`walkthrough.md`](./walkthrough.md): the walk-through says what the person sees, and this says which agent is
doing the work, what it is given, what it may do, and who pays. **Proposed unless it says "decided".***

Rich, 2026-09-27: *"We'll have quite a few agents — one, for example, will help with understanding the app the
faculty member described so we can ask relevant follow-up questions so we can really understand the app the user
wants. And perhaps one to help with suggesting names. We'll probably have agents who know the different parts of
our toolkit… And even specific agents for common things like creating learning objectives, generating questions
from course material, etc. … So we'll need a way to call these agents when needed and provide them the relevant
context."*

## The roster, by when they work and who pays

| When | Agent | Its one job | Who pays |
|---|---|---|---|
| **Intake**, before a project exists (moments 3–4) | **Understanding** | Reads the description, asks follow-up questions until it really understands, and says what it understood | **The platform** (decided, Rich; needs FE-1) |
| | **Naming** | Suggests names, each with an address already checked | The platform |
| | **Blueprint** | Chooses the blueprint and any starter from what was described (decided, Rich: walk-through D3) | The platform |
| **Making it** (moments 5–9) | **Lead** | One per conversation. Owns the conversation's token, writes the plan, drives the authoring API, calls specialists, answers to the person | **The person's** monthly agent budget (sitting 7) |
| | **Toolkit specialists** | One per UBC toolkit: CWL, Canvas, the academic API, encryption at rest, retrieval over Qdrant (chunk, embed, store)… Each knows its toolkit and what an app must declare to use it | The person |
| | **Domain helpers** | Help the instructor write the app's content: learning objectives, a question bank from their readings. What they write is reviewed by the person before it goes in (decided, Rich: *both, kept separate*) | The person |
| | **Explaining** | Turns what the platform printed (a build log, an Incident) into a sentence a faculty member can read (FE-8) | The person |
| **In the finished app**, for students | *(not an agent of ours)* | The same domain abilities, built into an app as code on a toolkit. Students generate questions from material, for example | **The app's own** AI budget, under its `data.classification` (D17) |

## What holds them together (proposed)

1. **The person hears one voice.** *We* (walk-through D5, decided). No screen names which agent is speaking.
2. **Only the lead touches the platform.** Specialists and helpers are called by the lead, with a brief, and
   answer with a structured result: a proposed change to files, an explanation, a question for the person. They
   hold no token, and never call Manifest.
   - So every write goes through one place, with one `baseCommit`, one `Idempotency-Key` discipline and one dry
     run before a commit.
   - A prompt-injected specialist (course material is exactly where injection arrives, spec §3.5) can propose,
     and cannot act.
3. **Every model answer that is shown or acted on is structured output**, as the platform already requires of
   its own model calls (the D5 plan's Decision 22). A free-text answer is never parsed for intent.
4. **Knowledge comes from the platform where the platform decides**:
   - a blueprint's knowledge pack (`getKnowledgePack`);
   - a toolkit's know-how, which has no home yet (**FE-19**);
   - the API's own guides (`getDoc`).

   Our own prompts say how to behave, never what the platform allows.
5. **A brief carries only what the job needs:**
   - the person's words;
   - the agreed plan;
   - the files concerned, at the commit read;
   - the relevant knowledge;
   - the one question.

   Never the whole conversation by default: less for a small model to lose, and less for injected text to
   reach.

## Open

- **Which model does the building on the laptop?** Every agent session's key reaches `qwen3.5:4b` today
  (`api-findings.md`, *Not a gap*). The lead's job is the hardest in the product. This is Rich's call.
- **How the lead calls a specialist**: as a tool it chooses (each specialist described to it once), or by a fixed
  sequence per moment. To be settled with moment 6.
- **Our own loop, or a library?** The key speaks the OpenAI-compatible API only; LiteLLM's three routes, with no
  `/v1/messages` (plan: *What this plan does not build*). To be settled in the plan, not here.
