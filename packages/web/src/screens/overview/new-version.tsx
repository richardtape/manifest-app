import type { Schemas } from '@manifest/contract'
import { useCallback, useEffect, useId, useState } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { words } from '../../words.js'
import { kindWords } from '../building/kind.js'
import { CLOCK_IDS, rowsOf, type Row } from '../going-live/checklist.js'
import { LetStudentsIn, whenOf } from '../going-live/live.js'
import { RowView } from '../going-live/row.js'
import { SignOff, signOffRow, type Decided } from '../going-live/sign-off.js'
import type { Trouble } from '../trouble.js'
import { asServed } from '../your-apps/model.js'

const nv = words.overview.newVersion
const o = words.goingLive.owners

/**
 * MINORS m98: a row drawn here, one alone, says nothing its chip says: *"Needs you"* already names
 * them, so its owner line (*"you"*) goes. An owner of a wait on someone else stays.
 */
const alone = (row: Row): Row =>
  row.state === 'attention' && row.owner === o.you ? { ...row, owner: '' } : row
const k = words.building.kind

/** The sign-off is what holds it: unmet, whether re-escalated, undecided or refused. */
const approvalUnmet = (readiness: Schemas['LaunchReadiness']) =>
  readiness.items.some((i) => i.id === 'admin-approval' && i.state === 'unmet')

/** What the panel read, in the person's session: the checklist, both versions' days, a decision. */
type Reading = {
  readiness: Schemas['LaunchReadiness']
  /** The version on trying-out (the candidate), and the one the students have: their days. */
  trying: string | null
  students: string | null
  /** Re-escalated: the candidate's sign-off, as F5b reads it; null when nobody has decided. */
  decided: Decided
  /** Why the sign-off could not be read, when it could not (m11: said with a reference). */
  unread: Trouble | null
}

/**
 * WAITING TO REACH YOUR STUDENTS (F6b Task 10, moment 17; design §1, Decision 11): on a launched app,
 * while the version on trying-out (`getLaunchReadiness`' `candidateReleaseId`) is not the one the live
 * address serves (`asServed`). The two facts, then what lets the students have it:
 * - **self-serve** (`ready`): an owner's press, F5's `LetStudentsIn` after a launch (its second
 *   sign-in back at `?then=new-version`); a helper reads that an owner does it;
 * - **the sign-off unmet** (re-escalated, undecided or refused): what changed when re-escalated
 *   (`reescalated`, never `sensitiveFields` alone, S1: M2), in Task 8's words, and F5b's sign-off: the
 *   ask, the asked row, a refusal's reason and *[Talk it through]*, **for any member** (minors m120,
 *   Rich: *"Yes, any member"*: the platform's `COLLABORATOR` holds `approval:request`, as before launch);
 * - **anything else unmet**: said here, UBC's two in our words and the rest in F5's rows (after a
 *   launch, Going live says only that it is live: the review's I2).
 * The panel reads its own checklist (the Overview reads one only before a launch), and keeps a press
 * it started to its end, whatever it reads meanwhile.
 */
export function NewVersion({
  platform,
  ours,
  project,
  production,
  role,
  arrived,
  expire,
  now,
  timeZone,
  onChanged,
}: {
  platform: Platform
  ours: Ours
  project: Schemas['Project']
  /** The live address, as the Overview read it. */
  production: Schemas['Environment']
  role: 'owner' | 'helper' | 'unknown'
  /** Back from the second sign-in (`?then=new-version`). */
  arrived: boolean
  expire: () => void
  now: () => Date
  timeZone?: string | undefined
  /** The students have it now: the Overview reads its addresses again. */
  onChanged: () => void
}) {
  const [reading, setReading] = useState<Reading | null>(null)
  /** The gate refused the press, and the checklist is being read again (minors m102). */
  const [gated, setGated] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [held, setHeld] = useState(false)
  // Said once: a gate refusal draws the press again, and it is not "back" again then (m10).
  const [back, setBack] = useState(arrived)
  const heading = useId()
  const served = asServed(production, true).instance?.releaseId ?? null

  useEffect(() => {
    let live = true
    const day = async (releaseId: string) => {
      try {
        return whenOf((await platform.getRelease(releaseId)).createdAt, now(), timeZone)
      } catch (error) {
        if (refusalOf(error).kind === 'signed-out') throw error
        return null
      }
    }
    const decision = async (
      releaseId: string,
    ): Promise<{ decided: Decided; unread: Trouble | null }> => {
      try {
        return { decided: await platform.getApproval(releaseId), unread: null }
      } catch (error) {
        const refusal = refusalOf(error)
        if (refusal.kind === 'signed-out') throw error
        if (refusal.kind === 'refused' && refusal.status === 404)
          return { decided: null, unread: null }
        return { decided: 'unread', unread: refusal }
      }
    }
    const read = async (): Promise<Reading> => {
      const readiness = await platform.getLaunchReadiness(project.id)
      const candidate = readiness.candidateReleaseId
      const [trying, students, sign] = await Promise.all([
        candidate === null ? null : day(candidate),
        served === null ? null : day(served),
        // Undecided or refused alike: what the sign-off says (the review's I2).
        approvalUnmet(readiness) && candidate !== null ? decision(candidate) : null,
      ])
      const { decided, unread } = sign ?? { decided: null, unread: null }
      return { readiness, trying, students, decided, unread }
    }
    read().then(
      (value) => {
        if (!live) return
        setReading(value)
        setGated(false)
      },
      (error: unknown) => {
        // A reading lost loses the panel, never the page: the Overview stands.
        if (live && refusalOf(error).kind === 'signed-out') expire()
      },
    )
    return () => {
      live = false
    }
    // `now` is a clock, read once per reading: never a reason to read again.
  }, [platform, project.id, served, attempt, timeZone, expire])

  const readAgain = useCallback(() => setAttempt((n) => n + 1), [])
  // MINORS m136: SHOWN AGAIN, READ AGAIN (Going live's Decision 16): a version put on trying-out
  // while they were away (another tab, a colleague). Quietly: a reading lost keeps the panel.
  useEffect(() => {
    const shown = () => {
      if (document.visibilityState === 'visible') readAgain()
    }
    document.addEventListener('visibilitychange', shown)
    return () => document.removeEventListener('visibilitychange', shown)
  }, [readAgain])
  const onHold = useCallback((hold: boolean) => setHeld(hold), [])
  // The gate said it is not ready: nothing to press, and nothing said of what stands, until the
  // checklist is read again (minors m102): the old reading is the one the gate just refused.
  const onGate = useCallback(() => {
    setBack(false)
    setGated(true)
    setAttempt((n) => n + 1)
  }, [])

  if (reading === null) return null
  const { readiness } = reading
  const candidate = readiness.candidateReleaseId
  const waiting = readiness.launched && candidate !== null && candidate !== served
  if (!held && !waiting) return null

  const owner = role === 'owner'
  const press = (
    <LetStudentsIn
      platform={platform}
      ours={ours}
      project={project}
      ready={readiness.ready}
      launched
      afterLaunch
      candidate={
        candidate === null ? null : { releaseId: candidate, when: reading.trying }
      }
      production={production}
      back={back}
      expire={expire}
      now={now}
      timeZone={timeZone}
      onHold={onHold}
      onGate={onGate}
      onLanded={onChanged}
      onChanged={readAgain}
    />
  )
  const approval = readiness.items.find((i) => i.id === 'admin-approval')
  // While we do not know whether they own it, neither the press nor "An owner lets…" (the review's
  // M6): an owner reads the facts until the members answer.
  const theirs = role === 'unknown' ? null : <p className="body-lead">{nv.helper}</p>
  const unmet = readiness.items.filter(
    (i) => CLOCK_IDS.includes(i.id) && i.blocking && i.state !== 'met',
  )
  const what = gated ? null : held || (readiness.ready && owner) ? (
    press
  ) : readiness.ready ? (
    theirs
  ) : approval !== undefined && approvalUnmet(readiness) ? (
    <>
      {readiness.reescalated ? (
        <p className="body-lead">
          {/* The platform's "no baseline" names none: still a look, never "straight" (M9). */}
          {readiness.sensitiveFields.length === 0
            ? k.look(k.unknown)
            : kindWords(readiness.sensitiveFields)}
        </p>
      ) : null}
      {/* m98: in Going live's own list, as its rows are there. */}
      <ul className="going-live__rows">
        <SignOff
          row={alone(signOffRow(approval, true, reading.decided, timeZone, now()))}
          decided={reading.decided}
          unread={reading.unread}
          candidate={candidate}
          platform={platform}
          ours={ours}
          project={project}
          expire={expire}
          onAsked={readAgain}
        />
      </ul>
    </>
  ) : (
    <>
      <p className="body-lead">{nv.unmet}</p>
      {unmet.map((i) => (
        <p key={i.id} className="body-lead">
          {nv.clocks[i.id]}
        </p>
      ))}
      <ul className="going-live__rows">
        {rowsOf(readiness, { hostname: production.hostname, timeZone, now: now() })
          .filter((row) => row.state !== 'steady' && !row.apart)
          .map((row) => (
            <RowView key={row.id} row={alone({ ...row, action: null })} />
          ))}
      </ul>
    </>
  )
  return (
    <section className="overview__new-version" aria-labelledby={heading}>
      <h2 className="heading" id={heading}>
        {nv.title}
      </h2>
      {/* m136: the facts' region stays while a press holds the panel, empty, so a landed moment
          giving way to a later version (m101) is said to a screen reader, as `changed` says its own. */}
      <div role="status">
        {held ? null : (
          <p className="body-lead">{nv.facts(reading.trying, reading.students)}</p>
        )}
      </div>
      {what}
    </section>
  )
}
