import type { Schemas } from '@manifest/contract'
import { Button, Card, Choice, FormField } from '@manifest-app/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { navigate, type Then } from '../../router.js'
import { words } from '../../words.js'
import { PressNotice } from '../change/notice.js'
import { pressFailed, useFocusBack, type Notice } from '../change/press.js'
import { ensureWatch } from '../keeping/watch.js'
import { TroubleNotice, type Trouble } from '../trouble.js'
import { StepUpCard } from '../trying-out/parts.js'
import { refusalWords, whoOf } from './model.js'

const p = words.people
/** FE-48's page half: our server hears a watch closed a little after the removal answers. */
const RECHECK_MS = 5_000

type Role = Schemas['Member']['role']
type Loaded =
  | { state: 'loading' }
  | { state: 'trouble'; trouble: Trouble }
  | { state: 'ready'; members: Schemas['Member'][] }
/** What is under way: one press at a time. */
type Pressing =
  { kind: 'add' } | { kind: 'role'; userId: string } | { kind: 'remove'; userId: string }
/** What a press that did not go through says: the design's own words, or F5's notice. */
type Said = { kind: 'words'; text: string } | { kind: 'notice'; notice: Notice }

/** Decision 15: what they typed, kept across the second sign-in. Never anything else. */
type Kept = { typed: string; role: Role }
const keyOf = (projectId: string) => `manifest-app.people.${projectId}`

function keptOf(projectId: string): Kept | undefined {
  try {
    const kept = JSON.parse(sessionStorage.getItem(keyOf(projectId)) ?? 'null') as unknown
    if (typeof kept !== 'object' || kept === null) return undefined
    const { typed, role } = kept as Record<string, unknown>
    return typeof typed === 'string' && (role === 'owner' || role === 'collaborator')
      ? { typed, role }
      : undefined
  } catch {
    return undefined
  }
}

const codeOf = (error: unknown): string | null => {
  const refusal = refusalOf(error)
  return refusal.kind === 'refused' ? refusal.code : null
}

/**
 * *PEOPLE* (walk-through moment 18; F6b Task 6, design §2): who can change the app, in the person's
 * own session (`listMembers`). **An owner** adds someone (`addMember`, by the shape of what they
 * typed: `whoOf`), makes a member owner or helper (the same call, by their PUID), or takes them off
 * (`removeMember`, asked in place first); **a helper** reads why not. Every change asks the second
 * sign-in: F5's card, back at `?then=people`, the form as they left it (Decision 15), and nothing
 * pressed by itself. **The platform still decides**: a refusal is said in the design's words, or
 * F5's general ones with a support reference. Nothing here is our server's (D5).
 */
export function People({
  platform,
  ours,
  project,
  me,
  then,
  expire,
}: {
  platform: Platform
  /** Only for our watch, looked at again after someone is taken off (FE-48's page half). */
  ours: Ours
  project: Schemas['Project']
  me: Pick<Schemas['Me'], 'id'>
  /** Back from signing in again (`people`): said so, and the form as they left it. */
  then: Then
  expire: () => void
  timeZone?: string | undefined
}) {
  const back = then === 'people'
  const [kept] = useState(() => (back ? keptOf(project.id) : undefined))
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [reads, setReads] = useState(0)
  const [typed, setTyped] = useState(kept?.typed ?? '')
  const [role, setRole] = useState<Role>(kept?.role ?? 'collaborator')
  const [pressing, setPressing] = useState<Pressing | null>(null)
  const [pressed, setPressed] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [said, setSaid] = useState<Said>()
  const [stepUp, setStepUp] = useState(false)
  /** What the last press did, said in the page's status (always in the page: the review's I4). */
  const [status, setStatus] = useState<string | null>(null)
  /** Where the focus goes once the page is drawn again: a row's first or last button, or the status. */
  const [focusOn, setFocusOn] = useState<
    { userId: string; which: 'first' | 'last' } | 'status' | null
  >(null)
  const actions = useRef(new Map<string, HTMLDivElement>())
  const statusRef = useRef<HTMLParagraphElement>(null)
  const { at: addAt, back: focusAdd } = useFocusBack<HTMLDivElement>()
  const confirmRef = useRef<HTMLParagraphElement>(null)
  const live = useRef(true)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  // Read once, on the way back (Decision 15): the storage goes, whatever happens next.
  useEffect(() => {
    if (!back) return
    try {
      sessionStorage.removeItem(keyOf(project.id))
    } catch {
      // A browser that keeps nothing kept nothing.
    }
  }, [back, project.id])

  useEffect(() => {
    let current = true
    platform.listMembers(project.id).then(
      (members) => current && setLoaded({ state: 'ready', members }),
      (error: unknown) => {
        if (!current) return
        const refusal = refusalOf(error)
        if (refusal.kind === 'signed-out') return expire()
        setLoaded({ state: 'trouble', trouble: refusal })
      },
    )
    return () => {
      current = false
    }
  }, [platform, project.id, reads, expire])
  const readAgain = useCallback(() => setReads((n) => n + 1), [])
  const retry = useCallback(() => {
    setLoaded({ state: 'loading' })
    setReads((n) => n + 1)
  }, [])

  useEffect(() => {
    if (confirming !== null) confirmRef.current?.focus()
  }, [confirming])

  // THE FOCUS FOLLOWS THE PRESS (the review's I4): back on a row's button, or on what is now true.
  useEffect(() => {
    if (focusOn === null) return
    setFocusOn(null)
    if (focusOn === 'status') return statusRef.current?.focus()
    const buttons = actions.current.get(focusOn.userId)?.querySelectorAll('button')
    const button =
      focusOn.which === 'first' ? buttons?.[0] : buttons?.[buttons.length - 1]
    button?.focus()
  })

  /** Before a press: what an earlier one said goes. */
  const begin = (press: Pressing) => {
    setPressed(true)
    setSaid(undefined)
    setStepUp(false)
    setStatus(null)
    setPressing(press)
  }

  /** A press that did not go through: the second sign-in, the design's words, or F5's. */
  const didNotGo = (error: unknown, operation: string): 'step-up' | 'said' => {
    if (!live.current) return 'said'
    setPressing(null)
    const code = codeOf(error)
    if (code === 'STEP_UP_REQUIRED') {
      setStepUp(true)
      return 'step-up'
    }
    const known = code === null ? null : refusalWords(code)
    if (known !== null) {
      setSaid({ kind: 'words', text: known })
      return 'said'
    }
    const failed = pressFailed(error, operation)
    if (failed.expired) {
      expire()
      return 'said'
    }
    setSaid({ kind: 'notice', notice: failed })
    return 'said'
  }

  const add = async () => {
    begin({ kind: 'add' })
    let added: Schemas['Member']
    try {
      added = await platform.addMember(
        project.id,
        { ...whoOf(typed), role },
        crypto.randomUUID(),
      )
    } catch (error) {
      if (didNotGo(error, 'addMember') === 'step-up') {
        try {
          sessionStorage.setItem(keyOf(project.id), JSON.stringify({ typed, role }))
        } catch {
          // Kept nowhere: they type it again.
        }
      } else focusAdd()
      return
    }
    if (!live.current) return
    setPressing(null)
    setTyped('')
    setStatus(p.added(added.displayName, project.name))
    readAgain()
  }

  const changeRole = async (member: Schemas['Member'], to: Role) => {
    begin({ kind: 'role', userId: member.userId })
    try {
      await platform.addMember(
        project.id,
        { puid: member.puid, role: to },
        crypto.randomUUID(),
      )
    } catch (error) {
      if (didNotGo(error, 'addMember') === 'said')
        setFocusOn({ userId: member.userId, which: 'first' })
      return
    }
    if (!live.current) return
    setPressing(null)
    setStatus(
      to === 'owner' ? p.madeOwner(member.displayName) : p.madeHelper(member.displayName),
    )
    readAgain()
  }

  const remove = async (member: Schemas['Member']) => {
    begin({ kind: 'remove', userId: member.userId })
    try {
      await platform.removeMember(project.id, member.userId, crypto.randomUUID())
    } catch (error) {
      didNotGo(error, 'removeMember')
      setConfirming(null)
      setFocusOn({ userId: member.userId, which: 'last' })
      return
    }
    if (!live.current) return
    // Taken off themselves: the app is no longer theirs to see.
    if (member.userId === me.id) return navigate('/')
    setPressing(null)
    setConfirming(null)
    setStatus(p.takenOff(member.displayName, project.name))
    setFocusOn('status')
    readAgain()
    // FE-48'S PAGE HALF (the review's I5): if they minted our watch, our server lost it as they
    // went, and nothing tells it who left. Our watch looked at again now, and once more in a
    // moment (our server hears the closing a little after): a new one reads the members afresh.
    void ensureWatch(platform, ours, project, new Date())
    setTimeout(() => {
      if (live.current) void ensureWatch(platform, ours, project, new Date())
    }, RECHECK_MS)
  }

  const members = loaded.state === 'ready' ? loaded.members : []
  const mine = members.find((member) => member.userId === me.id)?.role
  const owner = mine === 'owner'
  const busy = pressing !== null
  const slug = encodeURIComponent(project.slug)

  return (
    <div className="people">
      <h1 className="page-title">{p.title(project.name)}</h1>
      <p className="body-lead">{p.students}</p>
      {loaded.state === 'trouble' ? (
        <TroubleNotice trouble={loaded.trouble} onRetry={retry} />
      ) : null}
      {loaded.state === 'ready' ? (
        <>
          <ul className="people__list">
            {members.map((member) => {
              const you = member.userId === me.id
              const here = (kind: Pressing['kind']) =>
                pressing?.kind === kind &&
                'userId' in pressing &&
                pressing.userId === member.userId
              return (
                <li key={member.userId} className="people__member">
                  <p className="people__who">
                    <span className="body-lead">{member.displayName}</span>
                    {you ? <span className="body"> {p.you}</span> : null}
                    <span className="people__role body-small">
                      {member.role === 'owner' ? p.owner : p.helper}
                    </span>
                  </p>
                  <p className="people__how body-small">
                    {member.cwlLogin === null
                      ? member.email
                      : `${member.email} · ${p.login(member.cwlLogin)}`}
                  </p>
                  {owner ? (
                    confirming === member.userId ? (
                      <div className="people__confirm">
                        <p className="body" ref={confirmRef} tabIndex={-1}>
                          {you
                            ? p.confirmLeave(project.name)
                            : p.confirmTakeOff(member.displayName, project.name)}
                        </p>
                        <div className="describe__actions">
                          <Button
                            kind="danger"
                            disabled={busy}
                            onClick={() => void remove(member)}
                          >
                            {here('remove')
                              ? p.takingOff
                              : you
                                ? p.leave
                                : p.takeOffConfirm}
                          </Button>
                          <Button
                            kind="secondary"
                            disabled={busy}
                            onClick={() => {
                              setConfirming(null)
                              setFocusOn({ userId: member.userId, which: 'last' })
                            }}
                          >
                            {p.keep}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="describe__actions"
                        ref={(element) => {
                          if (element === null) actions.current.delete(member.userId)
                          else actions.current.set(member.userId, element)
                        }}
                      >
                        {/* Their own row: Take off alone (an owner leaves; the design's hand-over). */}
                        {you ? null : (
                          <Button
                            kind="secondary"
                            disabled={busy}
                            onClick={() =>
                              void changeRole(
                                member,
                                member.role === 'owner' ? 'collaborator' : 'owner',
                              )
                            }
                          >
                            {here('role')
                              ? p.changing
                              : member.role === 'owner'
                                ? p.makeHelper
                                : p.makeOwner}
                          </Button>
                        )}
                        <Button
                          kind="ghostDanger"
                          disabled={busy}
                          onClick={() => {
                            setSaid(undefined)
                            setConfirming(member.userId)
                          }}
                        >
                          {p.takeOff}
                        </Button>
                      </div>
                    )
                  ) : null}
                </li>
              )
            })}
          </ul>
          <p className="body">{p.roles}</p>
          {/* In the page before anything is said, so a screen reader hears it arrive (I4). */}
          <p className="body people__status" role="status" ref={statusRef} tabIndex={-1}>
            {status ?? ''}
          </p>
          {back && !pressed ? (
            <p className="body">{words.goingLive.letIn.again}</p>
          ) : null}
          {said === undefined ? null : (
            <div role="alert">
              <Card tone="attention">
                {said.kind === 'words' ? (
                  <p className="body-lead">{said.text}</p>
                ) : (
                  <PressNotice
                    notice={said.notice}
                    name={project.name}
                    couldnt={p.couldnt}
                  />
                )}
              </Card>
            </div>
          )}
          {stepUp ? <StepUpCard returnTo={`/apps/${slug}/people?then=people`} /> : null}
          {owner ? (
            <section className="people__add" aria-labelledby="people-add">
              <h2 className="heading" id="people-add">
                {p.add.title}
              </h2>
              <FormField
                label={p.add.field}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
              />
              <Choice
                name="people-role"
                label={p.add.role}
                value={role}
                onChange={(value) => setRole(value as Role)}
                options={[
                  { title: p.helper, value: 'collaborator' },
                  { title: p.owner, value: 'owner' },
                ]}
              />
              <div className="describe__actions" ref={addAt}>
                <Button
                  kind="primary"
                  disabled={busy || typed.trim() === ''}
                  onClick={() => void add()}
                >
                  {pressing?.kind === 'add' ? p.add.adding : p.add.button}
                </Button>
              </div>
            </section>
          ) : (
            <p className="body">{p.helperOnly}</p>
          )}
        </>
      ) : null}
    </div>
  )
}
