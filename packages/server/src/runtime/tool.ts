import { z } from 'zod/v4'
import type { Stop } from './run.js'

/** What a move did, as the lead will be told it on its next move. */
export interface MoveResult {
  report: string
  /**
   * A refusal the move met though it ran (a dry run's code). It is the lead's next reason, as a
   * guard's is, and counts toward the same refusal three times (Decision 7).
   */
  refused?: string
  /** A move may end the run: `done`, a question it cannot pass, or a refusal nobody here can answer. */
  stop?: Stop
}

/**
 * A MOVE IS A TOOL WITH A SCHEMA (both frameworks), a guard, and what it does with a context the
 * model never sees (OpenAI's `RunContext`).
 */
export interface ToolDef<Ctx, In> {
  /** The move's discriminant. */
  kind: string
  /** One line in the lead's instructions. */
  describe: string
  /** The move's fields, without `kind`. */
  input: z.ZodObject<z.ZodRawShape>
  /**
   * A guardrail (OpenAI's tool input guardrail, `rejectContent`): a reason to send the move back
   * unrun, which the lead is told, or null.
   */
  guard?: (input: In, context: Ctx) => string | null
  run: (input: In, context: Ctx) => Promise<MoveResult>
}

export function defineTool<Ctx, Shape extends z.ZodRawShape>(
  def: Omit<ToolDef<Ctx, z.infer<z.ZodObject<Shape>>>, 'input'> & {
    input: z.ZodObject<Shape>
  },
): ToolDef<Ctx, z.infer<z.ZodObject<Shape>>> {
  return def as unknown as ToolDef<Ctx, z.infer<z.ZodObject<Shape>>>
}

export type Moves = { move: { kind: string } & Record<string, unknown> }

/**
 * WHAT THE MODEL ANSWERS: one move of the tools' kinds, WRAPPED as `{ move }`, so the JSON
 * Schema's root is an object (Decision 1). F3 M1 measured why: with the union at the root,
 * OpenAI's strict mode refused it and LiteLLM answered every call from the small fallback
 * (FE-34). The runner unwraps `move`.
 */
export function movesOf(tools: ToolDef<never, never>[]): z.ZodType<Moves> {
  const kinds = tools.map((tool) => tool.input.extend({ kind: z.literal(tool.kind) }))
  const union = z.discriminatedUnion(
    'kind',
    kinds as unknown as [(typeof kinds)[number], ...(typeof kinds)[number][]],
  )
  return z.object({ move: union }) as unknown as z.ZodType<Moves>
}
