import type { HistoryEntry } from '../store/keeping.js'

/**
 * F6 TASK 6: THE LIVE-ADDRESS WATCH'S STATE MACHINE (Decision 8, design §4), pure. One look a
 * minute at a live app's students' address; what a run of answers means is decided here:
 * - **down** after two misses in a row, from the first: nobody is told of a blip;
 * - **answering again** after three answers in a row (Review Focus 3: a flapping app is held), the
 *   outage ending at the first of them (the design's *"closes at its first answer"*);
 * - **the same outage again** for a fall within 30 minutes of a recovery: it, and its recovery, are
 *   told to nobody;
 * - **switched off** (`410`) is never down, and only an answer brings the watch back: a restored
 *   app is not running until its owner starts it for the students.
 */
export type Answer = 'answer' | 'off' | 'miss'

/** What reached us, and whether the app's own instance answered it. */
export type Probed = { status: number | null; routed: boolean }

/** The edge's own answers when the app behind it does not: a miss, routed or not (S1: M6). */
const MISSES = new Set([502, 503, 504])

/**
 * Decision 8, (S1: M3, M6): 410 is off; otherwise an answer counts only when it is ROUTED (`x-manifest-instance`, the
 * app's own instance): the edge's catch-all answers any host it has no route for `200` (`text/plain`, "manifest OK
 * host=… listener=public"), with no such header, and that is a miss. 502, 503, 504 and null (no answer) miss.
 */
export function answerOf(status: number | null, routed: boolean): Answer {
  if (status === 410) return 'off'
  if (status === null || !routed || MISSES.has(status)) return 'miss'
  return 'answer'
}

export type Recovery = { from: string; to: string }

export type Outage =
  /** `recovered`: the last recovery, for 30 minutes and the band's day. */
  | { state: 'answering'; recovered: Recovery | null }
  | { state: 'missed'; at: string; recovered: Recovery | null }
  /**
   * `answers`: in a row, toward three; `answered`: the first of them (the outage's end); `again`:
   * a fall within 30 minutes of a recovery, told to nobody, and so is its recovery.
   */
  | {
      state: 'down'
      from: string
      answers: number
      answered: string | null
      again: boolean
    }
  | { state: 'off' }

export type Change =
  | { kind: 'fell'; from: string; again: boolean }
  | { kind: 'recovered'; from: string; to: string; again: boolean }

/** Decision 8: two misses in a row; three answers in a row; a fall this soon after a recovery. */
const ANSWERS_TO_RECOVER = 3
const AGAIN_MS = 30 * 60_000

const still = (outage: Outage) => ({ outage, change: null })

export function observe(
  outage: Outage,
  answer: Answer,
  at: string,
): { outage: Outage; change: Change | null } {
  if (answer === 'off') return still({ state: 'off' })
  switch (outage.state) {
    case 'off':
      // Back on, and answering: watched again from here. Not answering yet: still not running.
      return answer === 'answer'
        ? still({ state: 'answering', recovered: null })
        : still(outage)
    case 'answering':
      return answer === 'answer'
        ? still(outage)
        : still({ state: 'missed', at, recovered: outage.recovered })
    case 'missed': {
      if (answer === 'answer')
        return still({ state: 'answering', recovered: outage.recovered })
      const from = outage.at
      const again =
        outage.recovered !== null &&
        Date.parse(from) - Date.parse(outage.recovered.to) < AGAIN_MS
      return {
        outage: { state: 'down', from, answers: 0, answered: null, again },
        change: { kind: 'fell', from, again },
      }
    }
    case 'down': {
      if (answer === 'miss') return still({ ...outage, answers: 0, answered: null })
      const answers = outage.answers + 1
      const answered = outage.answered ?? at
      if (answers < ANSWERS_TO_RECOVER) return still({ ...outage, answers, answered })
      const { from, again } = outage
      return {
        outage: { state: 'answering', recovered: { from, to: answered } },
        change: { kind: 'recovered', from, to: answered, again },
      }
    }
  }
}

const detailOf = (entry: HistoryEntry): Record<string, unknown> =>
  typeof entry.detail === 'object' && entry.detail !== null
    ? (entry.detail as Record<string, unknown>)
    : {}

const moment = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined

/**
 * Decision 8 (Review Focus 1): the outage as our history left it, so a restart never starts from
 * *answering*: a `keeping.unreachable` with no `keeping.answering` after it is down; a switch-off
 * after either is off.
 */
export function outageFrom(entries: HistoryEntry[]): Outage {
  let outage: Outage = { state: 'answering', recovered: null }
  for (const entry of entries) {
    const detail = detailOf(entry)
    const from = moment(detail.from)
    const to = moment(detail.to)
    if (entry.type === 'keeping.unreachable' && from !== undefined)
      outage = {
        state: 'down',
        from,
        answers: 0,
        answered: null,
        again: detail.again === true,
      }
    else if (entry.type === 'keeping.answering' && from !== undefined && to !== undefined)
      outage = { state: 'answering', recovered: { from, to } }
    else if (entry.type === 'project.archived') outage = { state: 'off' }
  }
  return outage
}
