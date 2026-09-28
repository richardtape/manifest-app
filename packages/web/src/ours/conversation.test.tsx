// @vitest-environment jsdom
import type {
  Conversation,
  Intake,
  Progress,
  RoundView,
  Said,
} from '@manifest-app/server/progress'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StreamSource } from './api.js'
import { useConversation } from './conversation.js'

/**
 * THE PAGE'S HALF OF DECISION 4. What F2's sitting 1 measured decides the hard case:
 * through the edge, a restart of our server leaves `EventSource` CLOSED for good (its retry
 * meets the edge's 502), so the page must reopen it itself (Review Focus 5).
 */
class FakeSource implements StreamSource {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2
  readyState = FakeSource.CONNECTING
  closed = false
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  constructor(readonly id: string) {}
  close() {
    this.closed = true
    this.readyState = FakeSource.CLOSED
  }
  send(frame: Progress) {
    this.readyState = FakeSource.OPEN
    this.deliver(JSON.stringify(frame))
  }
  deliver(data: string) {
    act(() => this.onmessage?.(new MessageEvent('message', { data })))
  }
  /** The browser's error: CONNECTING when it will retry, CLOSED when it has given up. */
  fail(readyState: number) {
    this.readyState = readyState
    act(() => this.onerror?.(new Event('error')))
  }
}

let sources: FakeSource[] = []
const open = (id: string) => {
  const source = new FakeSource(id)
  sources.push(source)
  return source
}
const last = () => sources[sources.length - 1]!

const CONVERSATION: Conversation = {
  id: 'c-1',
  personId: 'p-1',
  projectId: null,
  title: 'First build',
  state: 'describing',
  description: "A page where students post a response to the week's reading.",
  createdAt: '2026-09-27T20:00:00.000Z',
  updatedAt: '2026-09-27T20:00:00.000Z',
}
const NOTHING_YET: Intake = {
  round: null,
  understood: null,
  answers: {},
  skipped: [],
  names: null,
  namesAsked: 0,
  blueprint: null,
  project: null,
}
const state = (
  patch: Partial<Conversation> = {},
  intake: Intake = NOTHING_YET,
  plan: Extract<Progress, { kind: 'state' }>['plan'] = null,
): Progress => ({
  kind: 'state',
  conversation: { ...CONVERSATION, ...patch },
  intake,
  plan,
  round: null,
  thread: [],
})

beforeEach(() => {
  sources = []
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useConversation', () => {
  it('is connecting until the first frame, then live with the whole conversation', () => {
    const { result } = renderHook(() => useConversation('c-1', open))
    expect(result.current).toEqual({ steps: [], status: 'connecting' })
    expect(last().id).toBe('c-1')
    last().send(state())
    expect(result.current).toEqual({
      conversation: CONVERSATION,
      intake: NOTHING_YET,
      plan: null,
      round: null,
      thread: [],
      steps: [],
      status: 'live',
    })
  })

  it('keeps the plan the state carries, and whose allowance a refusal names (F2 Task 9)', () => {
    const plan = {
      studentsSee: 'a',
      youSee: 'b',
      itKeeps: 'c',
      whoGetsIn: 'd',
      ai: 'e',
      assumed: [],
      onlyYouKnow: [],
      changed: ['youSee' as const],
    }
    const { result } = renderHook(() => useConversation('c-1', open))
    last().send(state({ state: 'plan-ready' }, NOTHING_YET, { version: 2, plan }))
    expect(result.current.plan).toEqual({ version: 2, plan })
    last().send({
      kind: 'refusal',
      code: 'MODEL_BUDGET_EXHAUSTED',
      reference: '7F3A-9C21',
      allowance: { monthlyUsd: 10, resetsAt: '2026-10-01T00:00:00.000Z' },
    })
    expect(result.current.refusal).toEqual({
      code: 'MODEL_BUDGET_EXHAUSTED',
      reference: '7F3A-9C21',
      allowance: { monthlyUsd: 10, resetsAt: '2026-10-01T00:00:00.000Z' },
    })
  })

  it('keeps the round the state carries, and what the rounds said (F3 Task 11)', () => {
    const round: RoundView = {
      round: 1,
      status: 'working',
      line: 'Writing the page students post on.',
      messageWaiting: true,
      steps: [
        { key: 'pages', state: 'now', tries: 0, note: null, changed: null, exact: null },
      ],
      needs: null,
      reference: null,
      questions: [],
      draft: null,
      cost: { conversationUsd: 0.4, monthLeftUsd: 9.6, resetsAt: null },
    }
    const thread: Said[] = [
      {
        kind: 'message',
        round: 1,
        text: 'Also add a word count.',
        at: '2026-09-28T16:12:00Z',
      },
    ]
    const { result } = renderHook(() => useConversation('c-1', open))
    last().send({ ...state({ state: 'building' }), round, thread } as Progress)
    expect(result.current.round).toEqual(round)
    expect(result.current.thread).toEqual(thread)
    // The next state is the whole again: a round gone from it is gone from the page.
    last().send(state({ state: 'building' }))
    expect(result.current.round).toBeNull()
    expect(result.current.thread).toEqual([])
  })

  it('keeps each step at its latest, in the order they began, and the refusal with its reference', () => {
    const { result } = renderHook(() => useConversation('c-1', open))
    last().send(state())
    last().send({ kind: 'step', step: 'understanding', state: 'now' })
    last().send({ kind: 'step', step: 'naming', state: 'now' })
    last().send({ kind: 'step', step: 'understanding', state: 'done' })
    last().send({ kind: 'refusal', code: 'MODEL_ANSWER_INVALID', reference: '7F3A-9C21' })
    last().send(state({ state: 'naming' }))
    expect(result.current).toEqual({
      conversation: { ...CONVERSATION, state: 'naming' },
      intake: NOTHING_YET,
      plan: null,
      round: null,
      thread: [],
      steps: [
        { step: 'understanding', state: 'done' },
        { step: 'naming', state: 'now' },
      ],
      refusal: { code: 'MODEL_ANSWER_INVALID', reference: '7F3A-9C21' },
      status: 'live',
    })
  })

  it('a frame it cannot read is ignored', () => {
    const { result } = renderHook(() => useConversation('c-1', open))
    last().send(state())
    last().deliver('not json')
    expect(result.current.status).toBe('live')
  })

  it('an error the browser will retry opens nothing new, and reads connecting', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useConversation('c-1', open))
    last().send(state())
    last().fail(FakeSource.CONNECTING)
    expect(result.current.status).toBe('connecting')
    act(() => vi.advanceTimersByTime(60_000))
    expect(sources).toHaveLength(1)
  })

  it('Review Focus 5: when the browser reconnects by itself, its first frame starts the view again, so a step left working is gone (the final review)', () => {
    const { result } = renderHook(() => useConversation('c-1', open))
    last().send(state())
    last().send({ kind: 'step', step: 'naming', state: 'now' })
    // Our server restarts; Chrome retries the same EventSource itself (M5, direct).
    last().fail(FakeSource.CONNECTING)
    last().send(state({ state: 'naming' }))
    expect(result.current.steps).toEqual([])
    expect(result.current.status).toBe('live')
  })

  it('a stream the browser gave up on (CLOSED, as the edge’s 502 leaves it) is reopened, after a growing wait', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useConversation('c-1', open))
    last().send(state())

    last().fail(FakeSource.CLOSED)
    expect(result.current.status).toBe('connecting')
    act(() => vi.advanceTimersByTime(999))
    expect(sources).toHaveLength(1)
    act(() => vi.advanceTimersByTime(1))
    expect(sources).toHaveLength(2)

    // It fails again before it answers: the wait grows.
    last().fail(FakeSource.CLOSED)
    act(() => vi.advanceTimersByTime(1999))
    expect(sources).toHaveLength(2)
    act(() => vi.advanceTimersByTime(1))
    expect(sources).toHaveLength(3)

    last().send(state({ state: 'planning' }))
    expect(result.current).toMatchObject({
      status: 'live',
      conversation: { state: 'planning' },
    })

    // Once it has answered, the next failure waits the shortest time again.
    last().fail(FakeSource.CLOSED)
    act(() => vi.advanceTimersByTime(1000))
    expect(sources).toHaveLength(4)
  })

  it('never waits longer than 15 seconds', () => {
    vi.useFakeTimers()
    renderHook(() => useConversation('c-1', open))
    for (let i = 0; i < 8; i++) {
      last().fail(FakeSource.CLOSED)
      act(() => vi.advanceTimersByTime(15_000))
    }
    expect(sources).toHaveLength(9)
  })

  it('a reconnect clears the steps the dead connection left, so nothing is left working (Review Focus 5)', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useConversation('c-1', open))
    last().send(state({ state: 'planning' }))
    last().send({ kind: 'step', step: 'blueprint', state: 'now' })
    last().fail(FakeSource.CLOSED)
    act(() => vi.advanceTimersByTime(1000))
    last().send(state({ state: 'planning' }))
    expect(result.current.steps).toEqual([])
  })

  it('unmounted, it closes its stream and never reopens', () => {
    vi.useFakeTimers()
    const { unmount } = renderHook(() => useConversation('c-1', open))
    const first = last()
    first.fail(FakeSource.CLOSED)
    unmount()
    act(() => vi.advanceTimersByTime(60_000))
    expect(sources).toHaveLength(1)
    expect(first.closed).toBe(true)
  })

  it('under StrictMode, the dead subscription never sets state on the live one', () => {
    // Testing Library's own option: a <StrictMode> wrapper around the hook ran its effect
    // once here (measured), where the option mounts, unmounts and mounts, as a page does.
    const { result } = renderHook(() => useConversation('c-1', open), {
      reactStrictMode: true,
    })
    expect(sources).toHaveLength(2)
    const [dead, live] = sources as [FakeSource, FakeSource]
    expect(dead.closed).toBe(true)
    live.send(state())
    dead.deliver(JSON.stringify(state({ state: 'failed' })))
    dead.fail(FakeSource.CLOSED)
    expect(result.current).toMatchObject({
      status: 'live',
      conversation: { state: 'describing' },
    })
  })

  it('a new id starts again from nothing', () => {
    const { result, rerender } = renderHook(({ id }) => useConversation(id, open), {
      initialProps: { id: 'c-1' },
    })
    last().send(state())
    rerender({ id: 'c-2' })
    expect(result.current).toEqual({ steps: [], status: 'connecting' })
    expect(last().id).toBe('c-2')
    expect(sources[0]!.closed).toBe(true)
  })
})
