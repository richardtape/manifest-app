import { subscribe, type Subscription } from '@manifest/contract'
import { PLATFORM_TIMEOUT_MS } from './refusal.js'

/**
 * THE PROJECT'S EVENT STREAM, ON OUR SERVER (F3 Decision 15), with the conversation's token,
 * one per conversation while a round runs. The contract's own `subscribe()` does the socket:
 * a Bearer token and no `Origin` (M1). What it does not do is ours:
 * - **each event once**, whatever the replays (a reconnect replays the newest 50);
 * - **a drop reconnects** after a growing wait, and the round is told, so it re-reads the build
 *   and the instance (FE-7: an event can fall outside the replay);
 * - **a refused token stops.** A refused upgrade closes `1006`, which a WebSocket shows with no
 *   status, so a plain `GET` of the same URL with the same token says why (M1, M3): `401` or
 *   `404` is refused, and `426` means the token is good and the network dropped us.
 *
 * **A token revoked or expired while its stream is open closes it `4401`** (FE-33, contract 1.5.0):
 * refused, like `4403` and `4404`, so the round pauses for a new token and nothing reopens it.
 *
 * **F6's keeper reads two things more**, which the round ignores: each event's own time (`at`, the
 * platform's `createdAt`, so a replay keeps when things happened), and **each replay, reported once
 * handed over**: the ids it carried and whether this watch had handed any of them over already. A
 * replay that reaches back to what was seen leaves no gap; one that does not may (FE-7).
 *
 * **And who acted** (`EventFrame.actor`, the platform's Task 10; the adoption note's question 10), as
 * sent, for the keeper's history: a platform administrator who is not a member says so, and why.
 */
export type ProjectEvent = {
  id: string
  type: string
  subject: string
  detail: unknown
  /** When the platform recorded it. */
  at: string
  /** Who acted, as the platform sent it (`EventActor`, or null when nobody's request did). */
  actor: unknown
}

/** One replay, as it was sent: every event it carried, in order, seen before or not. */
export type Replay = { ids: string[]; overlapped: boolean }

export interface Watch {
  /** The first replay is handed over. Rejects if the stream is refused, or closed, first. */
  ready: Promise<void>
  close(): void
}

export interface ProjectStream {
  watch(
    token: string,
    projectId: string,
    handlers: {
      /** Each event once. */
      event: (event: ProjectEvent) => void
      /** Connected again, and its replay handed over: re-read what the replay may have missed. */
      reconnected: () => void
      /** The token was refused: the round pauses for a new one. Called once, and nothing follows. */
      refused: () => void
      /** F6: each replay, the first included, once handed over; before `reconnected`. */
      replayed?: (replay: Replay) => void
    },
  ): Watch
}

export interface Waits {
  firstMs: number
  maxMs: number
}

/** How many event ids are remembered: far more than one replay (50). */
const REMEMBERED = 1000

/** The status a plain GET of the stream's URL answers: 0 when nothing answered. */
async function probeOf(url: string, token: string): Promise<number> {
  try {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(PLATFORM_TIMEOUT_MS),
    })
    await response.body?.cancel()
    return response.status
  } catch {
    return 0
  }
}

export function platformStream(
  origin: string,
  open: typeof subscribe = subscribe,
  probe: (url: string, token: string) => Promise<number> = probeOf,
  waits: Waits = { firstMs: 200, maxMs: 10_000 },
): ProjectStream {
  return {
    watch(token, projectId, handlers) {
      const url = `${new URL(origin).origin}/v1/projects/${encodeURIComponent(projectId)}/events`
      const seen = new Set<string>()
      let current: Subscription | undefined
      let timer: ReturnType<typeof setTimeout> | undefined
      let failures = 0
      let over = false

      let markReady: () => void = () => undefined
      let refuseReady: (error: Error) => void = () => undefined
      const ready = new Promise<void>((resolve, reject) => {
        markReady = resolve
        refuseReady = reject
      })
      // Observed by whoever awaits it; never an unhandled rejection that ends the process.
      ready.catch(() => undefined)

      const refused = () => {
        over = true
        refuseReady(new Error('the event stream was refused'))
        handlers.refused()
      }

      const again = () => {
        const wait = Math.min(waits.firstMs * 2 ** failures, waits.maxMs)
        failures++
        timer = setTimeout(() => {
          timer = undefined
          if (!over) connect(true)
        }, wait)
      }

      const connect = (reconnecting: boolean) => {
        // This connection's replay: every event before its ready frame, and whether any was seen.
        const replay: Replay = { ids: [], overlapped: false }
        let replaying = true
        const subscription = open({
          origin,
          token,
          projectId,
          onFrame(frame) {
            if (frame.kind === 'control') replaying = false
            if (over || frame.kind !== 'event') return
            if (replaying) {
              replay.ids.push(frame.id)
              if (seen.has(frame.id)) replay.overlapped = true
            }
            if (seen.has(frame.id)) return
            seen.add(frame.id)
            if (seen.size > REMEMBERED) seen.delete(seen.values().next().value as string)
            handlers.event({
              id: frame.id,
              type: frame.type,
              subject: frame.subject,
              detail: frame.machineDetail,
              at: frame.createdAt,
              actor: frame.actor,
            })
          },
        })
        current = subscription
        subscription.ready.then(
          () => {
            if (over || current !== subscription) return
            failures = 0
            replaying = false
            handlers.replayed?.(replay)
            markReady()
            if (reconnecting) handlers.reconnected()
          },
          () => undefined,
        )
        void subscription.closed.then(async ({ code }) => {
          if (over || current !== subscription) return
          if (code === 4401 || code === 4403 || code === 4404) return refused()
          if (code === 1006) {
            const status = await probe(url, token)
            if (over) return
            if (status === 401 || status === 404) return refused()
          }
          again()
        })
      }

      connect(false)
      return {
        ready,
        close() {
          over = true
          if (timer !== undefined) clearTimeout(timer)
          timer = undefined
          refuseReady(new Error('the event stream was closed'))
          current?.close()
        },
      }
    },
  }
}
