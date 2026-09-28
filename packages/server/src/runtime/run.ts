import { ModelError, type Model } from '../model/client.js'
import { askAgent, type AgentDef } from './agent.js'
import type { MoveResult, Moves, ToolDef } from './tool.js'
import type { Trace } from './trace.js'

/** Why a run ended (Decision 9). Every one of them leaves the run saved. */
export type Stop =
  | { kind: 'done'; line: string }
  /** A question it cannot pass (OpenAI's interruption). */
  | { kind: 'paused'; questionId: string }
  /** Decision 9's 40 moves in one step. */
  | { kind: 'limit'; limit: 'moves' }
  /** The person's Stop. */
  | { kind: 'stopped' }
  /** A refusal nothing in the run can answer: the model's, or one a tool hands back. */
  | { kind: 'refused'; error: Error }

/** A run as it is saved in `runs` (Decision 10; OpenAI's `RunState`). */
export interface RunState {
  runId: string
  step: string
  /** In this step. */
  moves: number
  last: { kind: string; report: string } | null
  /** Decision 7: the same refusal three times in a row is a try, which the round decides. */
  sameRefusal: { reason: string; count: number } | null
}

export interface RunOptions<Ctx, In> {
  /** Its answer is `movesOf(tools)`: one move, wrapped (Decision 1). */
  agent: AgentDef<In, Moves>
  tools: ToolDef<Ctx, never>[]
  /** The token, the platform, the store: NEVER in a prompt (OpenAI's `RunContext`). */
  context: Ctx
  /** What the lead sees this move, rebuilt every time (Decision 3). It is given the state, never the context. */
  view: (state: RunState) => In
  state: RunState
  model: Model
  /** Decision 9: 40. */
  maxMoves: number
  /** The person's Stop, checked before every move and once the model has answered. */
  stopped: () => boolean
  /** After every move. */
  save: (state: RunState) => void
  trace: Trace
}

function sameRefusal(
  before: RunState['sameRefusal'],
  refused: string | undefined,
): RunState['sameRefusal'] {
  if (refused === undefined) return null
  return before?.reason === refused
    ? { reason: refused, count: before.count + 1 }
    : { reason: refused, count: 1 }
}

/**
 * THE RUNNER (F3 Task 2; OpenAI's `Runner`, Vercel's multi-step loop): ask for one structured
 * move, guard it, carry it out with the context, record it, save the run, and stop on an
 * explicit condition. It knows no platform: a tool that meets a refusal the lead cannot answer
 * hands it back as its `stop`, or throws it for the round to say.
 */
export async function run<Ctx, In>(options: RunOptions<Ctx, In>): Promise<Stop> {
  const { agent, tools, context, view, model, maxMoves, stopped, save, trace } = options
  let state = options.state
  for (;;) {
    if (stopped()) return { kind: 'stopped' }
    if (state.moves >= maxMoves) return { kind: 'limit', limit: 'moves' }

    let answer: Moves
    try {
      answer = await askAgent(agent, model, view(state))
    } catch (error) {
      if (error instanceof ModelError) return { kind: 'refused', error }
      throw error
    }
    // Stop pressed while the model thought: what it answered is never done.
    if (stopped()) return { kind: 'stopped' }

    const { kind, ...input } = answer.move
    const tool = tools.find((candidate) => candidate.kind === kind)
    // The schema admits no other kind; a tool missing here is our own mistake.
    if (tool === undefined) throw new Error(`no tool for the move '${kind}'`)

    const reason = tool.guard?.(input as never, context) ?? null
    let result: MoveResult
    if (reason === null) {
      result = await tool.run(input as never, context)
      trace.record(state.runId, {
        kind: 'move',
        move: kind,
        verdict: 'ran',
        ...(result.refused === undefined ? {} : { reason: result.refused }),
      })
    } else {
      result = { report: reason, refused: reason }
      trace.record(state.runId, { kind: 'move', move: kind, verdict: 'guarded', reason })
    }

    state = {
      ...state,
      moves: state.moves + 1,
      last: { kind, report: result.report },
      sameRefusal: sameRefusal(state.sameRefusal, result.refused),
    }
    save(state)
    if (result.stop !== undefined) return result.stop
  }
}
