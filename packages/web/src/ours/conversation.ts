import type {
  Allowance,
  Conversation,
  Intake,
  PlanView,
  Progress,
  StepKey,
} from '@manifest-app/server/progress'
import { useEffect, useState } from 'react'
import { conversationEvents, type StreamSource } from './api.js'

export type Step = { step: StepKey; state: 'now' | 'done' | 'halted' }

export interface ConversationView {
  conversation?: Conversation
  /** Moments 3 and 4 so far: the understanding, the answers, the names, the blueprint. */
  intake?: Intake
  /** Moment 5: the latest plan and its version, once one is written. */
  plan?: { version: number; plan: PlanView } | null
  /** Each step at its latest, in the order they began. */
  steps: Step[]
  /** Our code, and the reference the person may quote (Decision 11); whose allowance, if spent. */
  refusal?: { code: string; reference: string; allowance?: Allowance }
  /** Never a terminal "closed" while the page is mounted: a closed stream is reopened. */
  status: 'connecting' | 'live'
}

/** `EventSource.CLOSED`: the browser has given up, and will not retry. */
const CLOSED = 2
/** The waits before reopening a stream the browser gave up on: short, growing, capped. */
const WAITS = [1000, 2000, 4000, 8000, 15_000]

function apply(view: ConversationView, frame: Progress): ConversationView {
  switch (frame.kind) {
    case 'state':
      return {
        ...view,
        conversation: frame.conversation,
        intake: frame.intake,
        plan: frame.plan,
        status: 'live',
      }
    case 'step': {
      const step = { step: frame.step, state: frame.state }
      const at = view.steps.findIndex((s) => s.step === frame.step)
      return {
        ...view,
        steps:
          at === -1
            ? [...view.steps, step]
            : view.steps.map((s, i) => (i === at ? step : s)),
      }
    }
    case 'refusal':
      return {
        ...view,
        refusal: {
          code: frame.code,
          reference: frame.reference,
          ...(frame.allowance === undefined ? {} : { allowance: frame.allowance }),
        },
      }
  }
}

/**
 * A CONVERSATION, LIVE (F2 Decision 4): the whole state first, then each change.
 * - **Reopened when the browser gives up** (F2 sitting 1, M5): through the edge, a restart
 *   of our server leaves `EventSource` CLOSED for good, because its retry meets the edge's
 *   502. So the page opens a new one, after a short and growing wait. An error the browser
 *   will retry itself (CONNECTING) opens nothing.
 * - **Each connection's first frame starts the view again**, but for a refusal already
 *   shown: after a restart, a step left "now" would be working that nobody is doing
 *   (Review Focus 5). The stored state is the truth.
 * - **Every handler is guarded by `live`**, as the console's `useProjectStream` is: under
 *   React 19's StrictMode the effect runs twice, and the dead subscription must never set
 *   state on the live one.
 */
export function useConversation(
  /** None yet (moment 3, before the words are sent): nothing is opened. */
  id: string | undefined,
  open: (id: string) => StreamSource = conversationEvents,
): ConversationView {
  const [view, setView] = useState<ConversationView>({ steps: [], status: 'connecting' })

  useEffect(() => {
    let live = true
    let current: StreamSource | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let failures = 0
    setView({ steps: [], status: 'connecting' })
    if (id === undefined) return

    const connect = () => {
      const source = open(id)
      current = source
      let first = true
      source.onmessage = (event) => {
        if (!live || current !== source) return
        let frame: Progress
        try {
          frame = JSON.parse(event.data) as Progress
        } catch {
          return
        }
        const fresh = first
        first = false
        if (fresh) failures = 0
        setView((v) => apply(fresh ? { ...v, steps: [] } : v, frame))
      }
      source.onerror = () => {
        if (!live || current !== source) return
        setView((v) => ({ ...v, status: 'connecting' }))
        // Whoever reconnects, the browser by itself or the page below, the next frame is a
        // new connection's first: the whole state, which starts the view again (the final
        // review: a step left "now" by a restart must not outlive it).
        first = true
        if (source.readyState !== CLOSED) return
        source.close()
        const wait = WAITS[Math.min(failures, WAITS.length - 1)]
        failures++
        timer = setTimeout(() => {
          if (live) connect()
        }, wait)
      }
    }
    connect()

    return () => {
      live = false
      clearTimeout(timer)
      current?.close()
    }
  }, [id, open])

  return view
}
