import type { Schemas } from '@manifest/contract'
import { TwoFacts } from '@manifest-app/ui'
import { useId, useState } from 'react'
import { OurRefusal, type Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { words } from '../../words.js'
import {
  attemptFact,
  needsIncidents,
  servingFact,
  type Attempt,
  type Said,
} from '../preview/facts.js'
import { CopyButton } from '../preview/try-it-as.js'
import { LiveAddress } from '../your-apps/your-apps.js'

const s = words.overview.students

/** What the hand-over shows: the address, the plan's two rows, and production's two facts. */
export interface Handed {
  /** Where students go: production's own address, as the platform names it. */
  address: string | null
  rows: { studentsSee: string; whoGetsIn: string } | null
  serving: Said | null
  attempt: Attempt | null
  /** Whether the address reaches anything: the facts' footnote promises an older version. */
  reaches: boolean
}

/** A read the hand-over can stand without: warned, and a session that ended is the shell's. */
function settled<T>(result: PromiseSettledResult<T>): T | null {
  if (result.status === 'fulfilled') return result.value
  const refusal = refusalOf(result.reason)
  if (refusal.kind === 'signed-out') throw result.reason
  console.warn(
    refusal.kind === 'refused'
      ? `A read was refused: ${refusal.code} (${refusal.status})`
      : 'A read went unanswered',
  )
  return null
}

/**
 * THE HAND-OVER'S READS (Decision 12), once the app has launched: production's instances (and its
 * incidents, only when a failure is the last attempt) for F4's two facts, and the agreed plan's two
 * rows from our server, **as agreed by the time the version live was made** (the final review's
 * I2): a change agreed since is on the draft, and its words must not reach students as if it were
 * live. Nothing dates the version live: the rows are not asked for. Each can fail alone: the
 * address and the first sentences stand without them. No model.
 */
export async function handOver(
  platform: Platform,
  ours: Ours,
  project: Schemas['Project'],
  production: Schemas['Environment'] | undefined,
  release: Schemas['Release'] | undefined,
  now: Date,
  timeZone: string | undefined,
): Promise<Handed> {
  const [instances, rows] = await Promise.allSettled([
    production === undefined
      ? Promise.resolve(null)
      : platform.listInstances(production.id).then((list) => list.instances),
    release === undefined
      ? Promise.resolve(null)
      : ours.agreedRows(project.id, release.createdAt),
  ])
  const listed = settled(instances)
  let incidents: Schemas['Incident'][] = []
  if (production !== undefined && listed !== null && needsIncidents(production, listed)) {
    const [read] = await Promise.allSettled([platform.listIncidents(production.id)])
    incidents = settled(read!)?.incidents ?? []
  }
  // Our server's plan read: without it, the message and the line lose their second parts.
  if (rows.status === 'rejected')
    console.warn(
      rows.reason instanceof OurRefusal
        ? `Our server refused a read: ${rows.reason.code} (${rows.reason.status})`
        : 'Our server did not answer a read',
    )
  return {
    address: production?.url ?? null,
    rows: rows.status === 'fulfilled' ? rows.value : null,
    serving: production === undefined ? null : servingFact(production, release, timeZone),
    attempt:
      production === undefined || listed === null
        ? null
        : attemptFact(production, listed, incidents, now, timeZone),
    reaches: production?.instance != null,
  }
}

/** The message to paste, as it first reads: Rich's words, then the plan's *What students see*. */
export function messageOf(name: string, address: string, rows: Handed['rows']): string {
  const first = s.message(name, address)
  return rows === null ? first : `${first} ${rows.studentsSee}`
}

/**
 * THE HONEST LINE (FE-20): ours, then the plan's *Who gets in* as written. **A plan's row that
 * opens by saying anyone with a CWL can sign in is the honest line itself**, and is said alone:
 * the plan's prompt tells it to say so (HONEST_WHO_GETS_IN opens so), and ours before it would say
 * it twice. A row that mentions it any other way, to deny it included, keeps ours first.
 */
export function honestLine(rows: Handed['rows']): string {
  if (rows === null) return s.honest
  return /^anyone with a CWL can sign in\b/i.test(rows.whoGetsIn.trim())
    ? rows.whoGetsIn
    : `${s.honest} ${rows.whoGetsIn}`
}

/**
 * FOR YOUR STUDENTS, MOMENT 15 (F5 Task 9): the address large in mono with *[Copy]*; how students
 * sign in; a message they can change and copy, **never saved**; the honest line (FE-20: anyone
 * with a CWL gets in); and production's two facts, F4's.
 */
export function ForYourStudents({ name, handed }: { name: string; handed: Handed }) {
  const id = useId()
  const [message, setMessage] = useState(() =>
    handed.address === null ? '' : messageOf(name, handed.address, handed.rows),
  )
  const honest = honestLine(handed.rows)
  return (
    <section className="overview__students" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="heading">
        {words.preview.tabs.students}
      </h2>
      {handed.address === null ? null : (
        <div className="overview__students-copy">
          <p className="mono overview__students-address">
            <LiveAddress url={handed.address} />
          </p>
          <CopyButton value={handed.address} name={s.copyAddress} />
        </div>
      )}
      <p className="body-lead">{s.signIn}</p>
      {handed.address === null ? null : (
        <div className="mf-field overview__students-message">
          <label className="mf-field__label" htmlFor={`${id}-message`}>
            {s.messageLabel}
          </label>
          <textarea
            id={`${id}-message`}
            className="mf-field__input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-describedby={`${id}-hint`}
            rows={3}
          />
          <p id={`${id}-hint`} className="body-small overview__students-hint">
            {s.messageHint}
          </p>
          <div>
            <CopyButton value={message} name={s.copyMessage} />
          </div>
        </div>
      )}
      <p className="body-small overview__students-honest">{honest}</p>
      {handed.serving === null || handed.attempt === null ? null : (
        <TwoFacts
          serving={{
            overline: words.preview.facts.serving,
            title: handed.serving.words,
            tone: handed.serving.tone,
          }}
          attempt={{
            overline: words.preview.facts.attempt,
            title: handed.attempt.words,
            tone: handed.attempt.tone,
          }}
          // The footnote promises an older version answering while a new one proves itself.
          {...(handed.reaches && handed.attempt.tone !== 'steady' ? {} : { foot: null })}
        />
      )}
    </section>
  )
}
