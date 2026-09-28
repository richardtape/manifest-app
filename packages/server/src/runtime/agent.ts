import type { z } from 'zod/v4'
import type { Check, Message, Model } from '../model/client.js'

/**
 * AN AGENT IS DATA (F3 Task 2; OpenAI's `Agent`): how it behaves, what it is shown this call,
 * the one structured answer it gives, and a check on that answer. It never holds what the
 * platform allows or refuses: the platform says that itself (`agents.md` rule 4).
 */
export interface AgentDef<In, Out> {
  /** The `json_schema`'s name, and the trace's agent. */
  name: string
  /** The system message, the same every call. */
  instructions: string
  /** What it is shown, rebuilt before every call from this call's input (Vercel's `prepareStep`). */
  brief: (input: In) => Message[]
  answer: z.ZodType<Out>
  /** Built from this call's input, as F2's `checkedAgainst(taken)` is; a reason makes the model try again. */
  check?: (input: In) => Check<Out>
}

export function defineAgent<In, Out>(def: AgentDef<In, Out>): AgentDef<In, Out> {
  return def
}

/**
 * ONE STRUCTURED ANSWER: how the lead asks a helper (agents as tools, OpenAI's `asTool`), and
 * how a round asks the explaining agent. The model client parses, checks, and tries once more.
 */
export function askAgent<In, Out>(
  agent: AgentDef<In, Out>,
  model: Model,
  input: In,
): Promise<Out> {
  return model.complete(
    agent.name,
    agent.answer,
    [{ role: 'system', content: agent.instructions }, ...agent.brief(input)],
    agent.check?.(input),
  )
}
