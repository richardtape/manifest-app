import type { Schemas } from '@manifest/contract'
import { Button, Card } from '@manifest-app/ui'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { navigate, type Then } from '../../router.js'
import { words } from '../../words.js'
import { PressNotice } from '../change/notice.js'
import { pressFailed, type Notice } from '../change/press.js'
import type { Role } from '../keeping/role.js'
import { ensureWatch } from '../keeping/watch.js'
import { StepUpCard } from '../trying-out/parts.js'

export { StartForStudents } from '../keeping/start-again.js'

const w = words.keeping.switching
const t = words.tryingOut

/** The platform's code for a refusal, or null for anything else (unreachable, signed out). */
const codeOf = (error: unknown): string | null => {
  const refusal = refusalOf(error)
  return refusal.kind === 'refused' ? refusal.code : null
}

type Step =
  | { at: 'idle' }
  | { at: 'confirm-off' }
  /** `archiveProject` under way (once more by itself on PROJECT_TEARDOWN_INCOMPLETE). */
  | { at: 'switching' }
  | { at: 'confirm-delete' }
  | { at: 'deleting' }
  /** PROJECT_LAUNCHED_NOT_DELETABLE: it went live meanwhile. */
  | { at: 'kept' }
  | { at: 'step-up'; then: 'switch-off' | 'delete' }

/**
 * *SWITCHING IT OFF* (walk-through moment 20; F6 Task 11, design §5): a quiet section at the foot
 * of the Overview, **for an owner alone** (a helper and an unknown role see nothing of it: Review
 * Focus 5; the platform still decides). Everything here is the person's own session.
 * - **[Switch it off]**: a confirming step on the page, never a browser dialog; `archiveProject`,
 *   behind F5's second sign-in (`?then=switch-off` comes back to the confirming step, said so,
 *   never pressed by itself); **`500 PROJECT_TEARDOWN_INCOMPLETE` is repeated once by itself** (the
 *   platform's remedy), and still incomplete, the page is told so (`onChanged(true)`).
 * - **[Delete it]**, only for an app that never went live (D7): its confirming step, the second
 *   sign-in (`?then=delete`), `deleteProject`, then our own rows (`forget`), then *Your apps*. An
 *   app that has been live shows FE-45's sentence where it would be, and no button.
 */
export function Switching({
  platform,
  ours,
  project,
  role,
  then,
  onChanged,
  expire,
}: {
  platform: Platform
  ours: Ours
  project: Schemas['Project']
  role: Role
  /** Back from signing in again: the confirming step it was for, said so. */
  then: Then
  /** Switched off: the page reads the app again (`true`: we didn't finish tidying up). */
  onChanged: (untidy?: boolean) => void
  expire: () => void
}): ReactNode {
  const neverLive = (project.launchedAt ?? null) === null
  const [step, setStep] = useState<Step>(
    then === 'switch-off'
      ? { at: 'confirm-off' }
      : then === 'delete' && neverLive
        ? { at: 'confirm-delete' }
        : { at: 'idle' },
  )
  const [back] = useState(then === 'switch-off' || then === 'delete')
  const [pressed, setPressed] = useState(false)
  const [notice, setNotice] = useState<Notice>()
  const live = useRef(true)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  if (role !== 'owner' || project.state === 'archived') return null

  const slug = encodeURIComponent(project.slug)

  /** A press that did not go through: the session ending is the shell's; else said. */
  const didNotGo = (error: unknown, operation: string) => {
    const said = pressFailed(error, operation)
    if (said.expired) return expire()
    if (!live.current) return
    setNotice(said)
    setStep({ at: 'idle' })
  }

  const switchOff = async () => {
    setPressed(true)
    setNotice(undefined)
    setStep({ at: 'switching' })
    const archive = () => platform.archiveProject(project.id, crypto.randomUUID())
    try {
      await archive()
    } catch (error) {
      if (codeOf(error) === 'STEP_UP_REQUIRED')
        return live.current && setStep({ at: 'step-up', then: 'switch-off' })
      if (codeOf(error) !== 'PROJECT_TEARDOWN_INCOMPLETE')
        return didNotGo(error, 'archiveProject')
      // The platform's remedy: the request once more, by itself. It is switched off either way.
      try {
        await archive()
      } catch (again) {
        if (codeOf(again) === 'PROJECT_TEARDOWN_INCOMPLETE')
          return live.current && onChanged(true)
        return didNotGo(again, 'archiveProject')
      }
    }
    if (live.current) onChanged()
  }

  const deleteIt = async () => {
    setPressed(true)
    setNotice(undefined)
    setStep({ at: 'deleting' })
    const remove = () => platform.deleteProject(project.id, crypto.randomUUID())
    try {
      try {
        await remove()
      } catch (error) {
        // The platform's remedy for a step that failed: the request once more, to finish.
        if (codeOf(error) !== 'PROJECT_TEARDOWN_INCOMPLETE') throw error
        await remove()
      }
    } catch (error) {
      const code = codeOf(error)
      if (code === 'STEP_UP_REQUIRED')
        return live.current && setStep({ at: 'step-up', then: 'delete' })
      if (code === 'PROJECT_LAUNCHED_NOT_DELETABLE')
        return live.current && setStep({ at: 'kept' })
      return didNotGo(error, 'deleteProject')
    }
    // OURS TOO (Decision 11): what anyone wrote to us about it goes with it. A failure of ours is
    // reported, and never keeps them on the page of an app that is gone.
    try {
      await ours.forget(project.id)
    } catch (error) {
      const said = pressFailed(error, 'forget')
      if (said.expired) return expire()
    }
    navigate('/')
  }

  /** Back from signing in again: said once, until they press. */
  const again =
    back && !pressed ? <p className="body">{words.goingLive.letIn.again}</p> : null
  const busy = step.at === 'switching' || step.at === 'deleting'
  return (
    <section className="switching" aria-labelledby="switching-title">
      <h2 className="heading" id="switching-title">
        {w.title}
      </h2>
      {notice === undefined ? null : (
        <div role="alert">
          <Card tone="attention">
            <PressNotice notice={notice} name={project.name} couldnt={t.couldnt} />
          </Card>
        </div>
      )}
      {step.at === 'idle' || step.at === 'kept' ? (
        <>
          <div className="describe__actions">
            <Button kind="secondary" onClick={() => setStep({ at: 'confirm-off' })}>
              {w.off}
            </Button>
          </div>
          {step.at === 'kept' ? (
            <p className="body" role="status">
              {w.liveKept}
            </p>
          ) : neverLive ? (
            <div className="describe__actions">
              <Button
                kind="ghostDanger"
                onClick={() => setStep({ at: 'confirm-delete' })}
              >
                {w.delete}
              </Button>
            </div>
          ) : (
            <p className="body-small">{`${w.liveKept} ${w.liveKeptMore}`}</p>
          )}
        </>
      ) : null}
      {step.at === 'confirm-off' || step.at === 'switching' ? (
        <>
          {again}
          <p className="body">{w.confirmOff}</p>
          <div className="describe__actions">
            <Button kind="primary" disabled={busy} onClick={() => void switchOff()}>
              {w.off}
            </Button>
            <Button
              kind="secondary"
              disabled={busy}
              onClick={() => setStep({ at: 'idle' })}
            >
              {w.keepRunning}
            </Button>
          </div>
        </>
      ) : null}
      {step.at === 'confirm-delete' || step.at === 'deleting' ? (
        <>
          {again}
          <p className="body">{w.confirmDelete}</p>
          <div className="describe__actions">
            <Button kind="danger" disabled={busy} onClick={() => void deleteIt()}>
              {w.deleteForGood}
            </Button>
            <Button
              kind="secondary"
              disabled={busy}
              onClick={() => setStep({ at: 'idle' })}
            >
              {w.keepIt}
            </Button>
          </div>
        </>
      ) : null}
      {step.at === 'step-up' ? (
        <StepUpCard returnTo={`/apps/${slug}?then=${step.then}`} aboutStudents />
      ) : null}
    </section>
  )
}

/**
 * [SWITCH IT BACK ON] (moment 20; F6 Task 11, design §5), for an owner, on the Overview and on
 * *Your apps*' card: `restoreProject`, **no second sign-in** (bringing an app back takes nothing from
 * anyone), then **our server's watch minted at once** (its tokens stay revoked: design §1). Then
 * the page is told (`onChanged`). An app that never went live: *"It's back. Your draft starts
 * again the next time we work on it."*; one that has been live: `launched`, what the page puts
 * after it (*It's back, but not running yet.* and *Start it for your students*).
 */
export function SwitchBackOn({
  platform,
  ours,
  project,
  onChanged,
  expire,
  launched = null,
  watch = true,
}: {
  platform: Platform
  ours: Ours
  project: Pick<Schemas['Project'], 'id' | 'name' | 'launchedAt'>
  onChanged: () => void
  expire: () => void
  /** Drawn once it is back, for an app that has been live; nothing when absent. */
  launched?: ReactNode
  /** Mint our server's watch here (*Your apps*); an app's own page leaves it to the shell. */
  watch?: boolean
}) {
  const [pressing, setPressing] = useState(false)
  const [backOn, setBackOn] = useState(false)
  const [notice, setNotice] = useState<Notice>()
  const press = async () => {
    setPressing(true)
    setNotice(undefined)
    let restored: Schemas['Project']
    try {
      restored = await platform.restoreProject(project.id, crypto.randomUUID())
    } catch (error) {
      setPressing(false)
      const said = pressFailed(error, 'restoreProject')
      if (said.expired) return expire()
      return setNotice(said)
    }
    // Its tokens stay revoked: our server's watch, minted again now (it never throws, and a slow
    // answer of ours never holds the page). On an app's own pages the shell's watch does it, as
    // soon as it reads the app again (`useWatch`), so it is not minted twice.
    if (watch) void ensureWatch(platform, ours, restored, new Date())
    setBackOn(true)
    onChanged()
  }
  if (backOn)
    return (project.launchedAt ?? null) === null ? (
      <p className="body" role="status">
        {w.backDraft}
      </p>
    ) : (
      launched
    )
  return (
    <>
      {notice === undefined ? null : (
        <div role="alert">
          <Card tone="attention">
            <PressNotice notice={notice} name={project.name} couldnt={t.couldnt} />
          </Card>
        </div>
      )}
      <div className="describe__actions">
        <Button kind="primary" disabled={pressing} onClick={() => void press()}>
          {w.backOn}
        </Button>
      </div>
    </>
  )
}
