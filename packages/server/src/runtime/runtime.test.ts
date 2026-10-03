import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import { ModelError, type Model } from '../model/client.js'
import { scripted } from '../model/scripted.js'
import { openStore } from '../store/db.js'
import { CREDENTIAL } from '../store/runs.js'
import { askAgent, defineAgent } from './agent.js'
import { run, type RunState, type Stop } from './run.js'
import { defineTool, movesOf } from './tool.js'
import { storeTrace, type Trace } from './trace.js'

/**
 * OUR AGENT RUNTIME (F3 Task 2): one structured move a turn, guarded, run with a context the
 * model never sees, saved after every move, stopped on explicit conditions, and traced with
 * no text. A scripted model and fake tools that count what they did.
 */
interface Ctx {
  token: string
  key: string
  files: Record<string, string>
  did: string[]
  stop: boolean
}

const context = (): Ctx => ({
  token: 'mft_test_x',
  key: 'sk-test-y',
  files: { 'a.js': 'SECRET-CONTENT in a', 'b.js': 'SECRET-CONTENT in b' },
  did: [],
  stop: false,
})

const DOCKERFILE = 'we never write a Dockerfile: the blueprint owns the build'

const tools = [
  defineTool({
    kind: 'read',
    describe: 'read files',
    input: z.object({ paths: z.array(z.string()) }),
    run: async ({ paths }, ctx: Ctx) => {
      ctx.did.push(`read ${paths.join(',')}`)
      return {
        report: `read ${paths.join(',')}: ${paths.map((p) => ctx.files[p]).join(' | ')}`,
      }
    },
  }),
  defineTool({
    kind: 'commit',
    describe: 'commit files',
    input: z.object({ message: z.string() }),
    guard: ({ message }) =>
      message.includes('Dockerfile')
        ? DOCKERFILE
        : message.startsWith('public/')
          ? // As the real guards do, the reason names the path (m27).
            `${message} is not a file we write`
          : null,
    run: async ({ message }, ctx: Ctx) => {
      ctx.did.push(`commit ${message}`)
      if (message === 'and stop') ctx.stop = true
      return { report: `committed ${message}` }
    },
  }),
  defineTool({
    kind: 'dry',
    describe: 'a dry run the platform refuses',
    input: z.object({}),
    run: async (_input, ctx: Ctx) => {
      ctx.did.push('dry')
      return { report: 'the manifest is not valid', refused: 'SPEC_INVALID' }
    },
  }),
  defineTool({
    kind: 'ask',
    describe: 'ask the person',
    input: z.object({ ask: z.string() }),
    run: async () => ({
      report: 'asked',
      stop: { kind: 'paused', questionId: 'q-1' } satisfies Stop,
    }),
  }),
  defineTool({
    kind: 'done',
    describe: 'the pages are written',
    input: z.object({ line: z.string() }),
    run: async ({ line }) => ({ report: 'done', stop: { kind: 'done', line } }),
  }),
]

type View = { last: RunState['last']; step: string }
const lead = defineAgent({
  name: 'lead',
  instructions: 'You are the lead. One move a turn.',
  brief: (view: View) => [
    {
      role: 'user' as const,
      content: `Step: ${view.step}. Your last move: ${view.last === null ? 'none' : view.last.report}`,
    },
  ],
  answer: movesOf(tools),
})

const read = (...paths: string[]) => ({ move: { kind: 'read', paths } })
const commit = (message: string) => ({ move: { kind: 'commit', message } })
const done = (line: string) => ({ move: { kind: 'done', line } })

const start = (over: Partial<RunState> = {}): RunState => ({
  runId: 'run-1',
  step: 'pages',
  moves: 0,
  last: null,
  sameRefusal: null,
  ...over,
})

/** An agent that shows the model everything it is given: whatever reaches its view reaches the prompt. */
const telling = defineAgent({
  ...lead,
  brief: (view: View) => [{ role: 'user' as const, content: JSON.stringify(view) }],
})

function harness(
  model: Model,
  options: {
    state?: RunState
    maxMoves?: number
    ctx?: Ctx
    agent?: typeof lead
    stopWhen?: (state: RunState) => Stop | null
  } = {},
) {
  const ctx = options.ctx ?? context()
  const store = openStore(':memory:')
  const trace: Trace = storeTrace(store)
  const saved: RunState[] = []
  const result = run({
    agent: options.agent ?? lead,
    tools,
    context: ctx,
    view: (state) => ({ last: state.last, step: state.step }),
    state: options.state ?? start(),
    model,
    maxMoves: options.maxMoves ?? 40,
    stopped: () => ctx.stop,
    save: (state) => saved.push(structuredClone(state)),
    trace,
    ...(options.stopWhen === undefined ? {} : { stopWhen: options.stopWhen }),
  })
  return { ctx, saved, trace, result }
}

describe('one structured move a turn (Decision 1)', () => {
  it('runs read, commit, done in order and answers done with its line', async () => {
    const model = scripted({ lead: [read('a.js'), commit('two pages'), done('Built.')] })
    const { ctx, result } = harness(model)
    expect(await result).toEqual({ kind: 'done', line: 'Built.' })
    expect(ctx.did).toEqual(['read a.js', 'commit two pages'])
    expect(model.calls).toHaveLength(3)
  })

  it("sends the moves wrapped as { move }: the schema's root is an object, never an anyOf (M1)", () => {
    const schema = z.toJSONSchema(movesOf(tools)) as Record<string, unknown>
    expect(schema['type']).toBe('object')
    expect(schema).not.toHaveProperty('anyOf')
    expect(schema).not.toHaveProperty('oneOf')
    const move = (schema['properties'] as Record<string, Record<string, unknown>>)['move']
    expect(move?.['anyOf'] ?? move?.['oneOf']).toHaveLength(tools.length)
  })

  it('refuses a kind no tool has', () => {
    expect(movesOf(tools).safeParse({ move: { kind: 'deploy' } }).success).toBe(false)
    expect(movesOf(tools).safeParse({ kind: 'done', line: 'x' }).success).toBe(false)
  })
})

describe('the view, rebuilt before every move (Decision 3)', () => {
  it("the second prompt carries the first move's report, and the third no longer does", async () => {
    const model = scripted({ lead: [read('a.js'), read('b.js'), done('Built.')] })
    await harness(model).result
    const prompts = model.calls.map((call) => JSON.stringify(call.messages))
    expect(prompts[0]).toContain('Your last move: none')
    expect(prompts[1]).toContain('read a.js')
    expect(prompts[2]).toContain('read b.js')
    expect(prompts[2]).not.toContain('read a.js')
  })

  it("carries the agent's instructions as the system message, every time", async () => {
    const model = scripted({ lead: [read('a.js'), done('Built.')] })
    await harness(model).result
    for (const call of model.calls)
      expect(call.messages[0]).toEqual({
        role: 'system',
        content: 'You are the lead. One move a turn.',
      })
  })
})

describe('a guard sends a move back (Review Focus 1)', () => {
  it('a guarded commit never runs, the next prompt carries the reason, and the trace says guarded', async () => {
    const model = scripted({ lead: [commit('add a Dockerfile'), done('Built.')] })
    const { ctx, trace, result } = harness(model)
    expect(await result).toEqual({ kind: 'done', line: 'Built.' })
    expect(ctx.did).toEqual([])
    expect(JSON.stringify(model.calls[1]?.messages)).toContain(DOCKERFILE)
    expect(trace.list('run-1')).toContainEqual(
      expect.objectContaining({
        kind: 'move',
        move: 'commit',
        verdict: 'guarded',
        reason: DOCKERFILE,
      }),
    )
  })
})

describe('a reason shaped like a key (m27)', () => {
  it("a guard's reason echoing a key-shaped path is traced with that run redacted; the lead still reads it whole, and the run goes on", async () => {
    const model = scripted({ lead: [commit('public/sk-1.js'), done('Built.')] })
    const { trace, result } = harness(model)
    expect(await result).toEqual({ kind: 'done', line: 'Built.' })
    expect(JSON.stringify(model.calls[1]?.messages)).toContain(
      'public/sk-1.js is not a file we write',
    )
    const rows = trace.list('run-1')
    expect(rows).toContainEqual(
      expect.objectContaining({
        kind: 'move',
        move: 'commit',
        verdict: 'guarded',
        reason: 'public/sk-[redacted].js is not a file we write',
      }),
    )
    expect(JSON.stringify(rows)).not.toMatch(CREDENTIAL)
  })
})

describe('the same refusal (Decision 7)', () => {
  it('counts the same guard three times, and the runner still stops only at maxMoves (Review Focus 2)', async () => {
    const model = scripted({
      lead: [
        commit('a Dockerfile'),
        commit('another Dockerfile'),
        commit('a third Dockerfile'),
        read('a.js'),
        read('a.js'),
        read('a.js'),
      ],
    })
    const { saved, result } = harness(model, { maxMoves: 5 })
    expect(await result).toEqual({ kind: 'limit', limit: 'moves' })
    expect(saved.map((s) => s.sameRefusal?.count ?? 0)).toEqual([1, 2, 3, 0, 0])
    expect(saved[2]?.sameRefusal).toEqual({ reason: DOCKERFILE, count: 3 })
  })

  it("counts a refusal the platform gave a move that ran, like a guard's", async () => {
    const dry = { move: { kind: 'dry' } }
    const model = scripted({ lead: [dry, dry, commit('fixed'), done('Built.')] })
    const { saved, result } = harness(model)
    await result
    expect(saved.map((s) => s.sameRefusal)).toEqual([
      { reason: 'SPEC_INVALID', count: 1 },
      { reason: 'SPEC_INVALID', count: 2 },
      null,
      null,
    ])
  })
  it("a stopWhen the round adds (Vercel's stopWhen) ends the run after the save it names: the third same refusal as limit refusals", async () => {
    const model = scripted({
      lead: [
        commit('a Dockerfile'),
        commit('another Dockerfile'),
        commit('a third Dockerfile'),
        read('a.js'),
      ],
    })
    const { ctx, saved, result } = harness(model, {
      stopWhen: (state) =>
        (state.sameRefusal?.count ?? 0) >= 3
          ? { kind: 'limit', limit: 'refusals' }
          : null,
    })
    expect(await result).toEqual({ kind: 'limit', limit: 'refusals' })
    expect(saved).toHaveLength(3)
    expect(saved[2]?.sameRefusal).toEqual({ reason: DOCKERFILE, count: 3 })
    expect(ctx.did).toEqual([])
    expect(model.calls).toHaveLength(3)
  })

  it('a move that stops the run itself wins over stopWhen', async () => {
    const model = scripted({ lead: [done('Built.')] })
    const { result } = harness(model, {
      stopWhen: () => ({ kind: 'limit', limit: 'refusals' }),
    })
    expect(await result).toEqual({ kind: 'done', line: 'Built.' })
  })
})

describe('stop conditions (Decision 9)', () => {
  it('a lead that only ever reads stops at exactly maxMoves, as limit', async () => {
    const model = scripted({ lead: Array.from({ length: 45 }, () => read('a.js')) })
    const { ctx, saved, result } = harness(model)
    expect(await result).toEqual({ kind: 'limit', limit: 'moves' })
    expect(ctx.did).toHaveLength(40)
    expect(model.calls).toHaveLength(40)
    expect(saved.at(-1)?.moves).toBe(40)
  })

  it('Stop between moves ends the run as stopped, and the in-flight move is still saved', async () => {
    const model = scripted({ lead: [read('a.js'), commit('and stop'), done('Built.')] })
    const { ctx, saved, result } = harness(model)
    expect(await result).toEqual({ kind: 'stopped' })
    expect(ctx.did).toEqual(['read a.js', 'commit and stop'])
    expect(saved).toHaveLength(2)
    expect(saved[1]?.last).toEqual({ kind: 'commit', report: 'committed and stop' })
  })

  it('Stop pressed while the model thinks: the move it answers never runs', async () => {
    const ctx = context()
    const model: Model = {
      complete: async <T>() => {
        ctx.stop = true
        return commit('late') as T
      },
    }
    const { saved, result } = harness(model, { ctx })
    expect(await result).toEqual({ kind: 'stopped' })
    expect(ctx.did).toEqual([])
    expect(saved).toEqual([])
  })

  it('a refusal the run cannot answer ends it as refused, with that error', async () => {
    const refusal = new ModelError('MODEL_BUDGET_EXHAUSTED', 429)
    const model: Model = { complete: () => Promise.reject(refusal) }
    expect(await harness(model).result).toEqual({ kind: 'refused', error: refusal })
  })

  it('an error it does not know is thrown, never swallowed as a stop', async () => {
    const model: Model = { complete: () => Promise.reject(new TypeError('a bug')) }
    await expect(harness(model).result).rejects.toThrow('a bug')
  })

  it("a move whose tool pauses ends the run with the question's id", async () => {
    const model = scripted({ lead: [{ move: { kind: 'ask', ask: 'Late posts?' } }] })
    const { saved, result } = harness(model)
    expect(await result).toEqual({ kind: 'paused', questionId: 'q-1' })
    expect(saved).toHaveLength(1)
  })
})

describe('a saved run (Decision 10)', () => {
  it('is saved once per move, with the new state', async () => {
    const model = scripted({ lead: [read('a.js'), commit('two pages'), done('Built.')] })
    const { saved, result } = harness(model)
    await result
    expect(saved.map((s) => [s.moves, s.last?.kind])).toEqual([
      [1, 'read'],
      [2, 'commit'],
      [3, 'done'],
    ])
    expect(saved.every((s) => s.runId === 'run-1' && s.step === 'pages')).toBe(true)
  })

  it('started again from a saved state, carries on at its step and its move count', async () => {
    const model = scripted({ lead: [read('b.js'), read('b.js')] })
    const state = start({
      step: 'holds',
      moves: 38,
      last: { kind: 'read', report: 'read a.js' },
    })
    const { ctx, saved, result } = harness(model, { state })
    expect(await result).toEqual({ kind: 'limit', limit: 'moves' })
    expect(ctx.did).toEqual(['read b.js', 'read b.js'])
    expect(saved.map((s) => [s.step, s.moves])).toEqual([
      ['holds', 39],
      ['holds', 40],
    ])
    expect(JSON.stringify(model.calls[0]?.messages)).toContain('Step: holds')
  })
})

describe('what never leaves the run (Global Constraints)', () => {
  it('the context never reaches a prompt: no mft_ and no sk- in anything the model was sent', async () => {
    const model = scripted({
      lead: [read('a.js'), commit('a Dockerfile'), commit('two pages'), done('Built.')],
    })
    await harness(model, { agent: telling }).result
    expect(model.calls).toHaveLength(4)
    expect(JSON.stringify(model.calls)).toContain('Dockerfile')
    expect(JSON.stringify(model.calls)).not.toMatch(/mft_|sk-/)
  })

  it("the trace holds no text: no file's content, no prompt, no report", async () => {
    const model = scripted({
      lead: [read('a.js', 'b.js'), commit('two pages'), done('Built.')],
    })
    const { trace, result } = harness(model)
    await result
    const rows = JSON.stringify(trace.list('run-1'))
    expect(trace.list('run-1')).toHaveLength(3)
    expect(rows).not.toContain('SECRET-CONTENT')
    expect(rows).not.toContain('two pages')
    expect(rows).not.toContain('Built.')
  })

  it('m38: a model row written before F5 sitting 2 reads back without received, and the type says it may', () => {
    const store = openStore(':memory:')
    store.recordTrace('run-3', {
      kind: 'model',
      agent: 'lead',
      asked: 'default-chat-large',
      answered: 'default-chat-large',
      fallback: false,
      usage: null,
    })
    const [row] = storeTrace(store).list('run-3')
    expect(row?.kind === 'model' ? row.received : 'not a model row').toBeUndefined()
    if (row?.kind === 'model')
      // @ts-expect-error m38: a reader must say what it does without `received` (TS18048).
      expect(() => row.received.chars).toThrow(TypeError)
  })

  it('a platform entry says what it named, with its time, and a token is refused', () => {
    const trace = storeTrace(openStore(':memory:'))
    trace.record('run-2', {
      kind: 'platform',
      operation: 'startBuild',
      code: null,
      named: '60088ac3-31b8-42a0-9a4b-0ac3a0803070',
    })
    trace.record('run-2', {
      kind: 'platform',
      operation: 'deploy',
      code: null,
      named: 'sandbox',
    })
    const rows = trace.list('run-2')
    expect(rows.map((r) => (r.kind === 'platform' ? r.named : null))).toEqual([
      '60088ac3-31b8-42a0-9a4b-0ac3a0803070',
      'sandbox',
    ])
    expect(rows[0]?.at).toMatch(/^\d{4}-\d\d-\d\dT/)
    expect(trace.list('run-1')).toEqual([])
    expect(() =>
      trace.record('run-2', {
        kind: 'platform',
        operation: 'startBuild',
        code: null,
        named: 'mft_0123_abcd',
      }),
    ).toThrow(/credential/)
  })
})

describe('askAgent: one structured answer (agents as tools)', () => {
  it("sends the instructions, the brief, and the check built from this call's input", async () => {
    const naming = defineAgent({
      name: 'naming',
      instructions: 'Suggest one name.',
      brief: (taken: string[]) => [
        { role: 'user' as const, content: `Taken: ${taken.join(', ')}` },
      ],
      answer: z.object({ name: z.string() }),
      check: (taken: string[]) => (answer) =>
        taken.includes(answer.name) ? 'a name already taken' : null,
    })
    const model = scripted({ naming: [{ name: 'posts' }, { name: 'responses' }] })
    expect(await askAgent(naming, model, ['posts'])).toEqual({ name: 'responses' })
    expect(model.calls[0]?.messages).toEqual([
      { role: 'system', content: 'Suggest one name.' },
      { role: 'user', content: 'Taken: posts' },
    ])
  })
})
