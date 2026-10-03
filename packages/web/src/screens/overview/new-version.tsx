import type { Schemas } from '@manifest/contract'
import { Button } from '@manifest-app/ui'
import { useCallback, useEffect, useId, useState } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { linkTo } from '../../router.js'
import { words } from '../../words.js'
import { kindWords } from '../building/kind.js'
import { rowsOf } from '../going-live/checklist.js'
import { LetStudentsIn, whenOf } from '../going-live/live.js'
import { RowView } from '../going-live/row.js'
import { SignOff, signOffRow, type Decided } from '../going-live/sign-off.js'
import { asServed } from '../your-apps/model.js'

const nv = words.overview.newVersion

/** What the panel read, in the person's session: the checklist, both versions' days, a decision. */
type Reading = {
  readiness: Schemas['LaunchReadiness']
  /** The version on trying-out (the candidate), and the one the students have: their days. */
  trying: string | null
  students: string | null
  /** Re-escalated: the candidate's sign-off, as F5b reads it; null when nobody has decided. */
  decided: Decided
}

/**
 * WAITING TO REACH YOUR STUDENTS (F6b Task 10, moment 17; design §1, Decision 11): on a launched app,
 * while the version on trying-out (`getLaunchReadiness`' `candidateReleaseId`) is not the one the live
 * address serves (`asServed`). The two facts, then what lets the students have it:
 * - **self-serve** (`ready`): an owner's press, F5's `LetStudentsIn` after a launch (its second
 *   sign-in back at `?then=new-version`); a helper reads that an owner does it;
 * - **re-escalated** (`reescalated`, never `sensitiveFields` alone, S1: M2): what changed, in Task 8's
 *   words, and F5b's sign-off: the ask, the asked row, *[Talk it through]* after a refusal;
 * - **anything else unmet**: said, with F5's rows and *[Going live]*.
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
  const [attempt, setAttempt] = useState(0)
  const [held, setHeld] = useState(false)
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
    const decision = async (releaseId: string): Promise<Decided> => {
      try {
        return await platform.getApproval(releaseId)
      } catch (error) {
        const refusal = refusalOf(error)
        if (refusal.kind === 'signed-out') throw error
        return refusal.kind === 'refused' && refusal.status === 404 ? null : 'unread'
      }
    }
    const read = async (): Promise<Reading> => {
      const readiness = await platform.getLaunchReadiness(project.id)
      const candidate = readiness.candidateReleaseId
      const [trying, students, decided] = await Promise.all([
        candidate === null ? null : day(candidate),
        served === null ? null : day(served),
        readiness.reescalated && candidate !== null ? decision(candidate) : null,
      ])
      return { readiness, trying, students, decided }
    }
    read().then(
      (value) => live && setReading(value),
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
  const onHold = useCallback((hold: boolean) => setHeld(hold), [])

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
      back={arrived}
      expire={expire}
      now={now}
      timeZone={timeZone}
      onHold={onHold}
      onGate={readAgain}
      onLanded={onChanged}
      onChanged={readAgain}
    />
  )
  const approval = readiness.items.find((i) => i.id === 'admin-approval')
  const what =
    held || (readiness.ready && owner) ? (
      press
    ) : readiness.ready ? (
      <p className="body-lead">{nv.helper}</p>
    ) : readiness.reescalated ? (
      <>
        <p className="body-lead">{kindWords(readiness.sensitiveFields)}</p>
        {owner && approval !== undefined ? (
          <SignOff
            row={signOffRow(approval, true, reading.decided, timeZone, now())}
            decided={reading.decided}
            candidate={candidate}
            platform={platform}
            ours={ours}
            project={project}
            expire={expire}
            onAsked={readAgain}
          />
        ) : (
          <p className="body-lead">{nv.helper}</p>
        )}
      </>
    ) : (
      <>
        <p className="body-lead">{nv.unmet}</p>
        {rowsOf(readiness, { hostname: production.hostname, timeZone, now: now() })
          .filter((row) => row.state !== 'steady' && !row.apart)
          .map((row) => (
            <RowView key={row.id} row={{ ...row, action: null }} />
          ))}
        <div className="describe__actions">
          <Button
            kind="secondary"
            {...linkTo(`/apps/${encodeURIComponent(project.slug)}/going-live`)}
          >
            {nv.goingLive}
          </Button>
        </div>
      </>
    )
  return (
    <section className="overview__new-version" aria-labelledby={heading}>
      <h2 className="heading" id={heading}>
        {nv.title}
      </h2>
      {held ? null : (
        <p className="body-lead">{nv.facts(reading.trying, reading.students)}</p>
      )}
      {what}
    </section>
  )
}
