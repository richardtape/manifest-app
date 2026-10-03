import type { Schemas } from '@manifest/contract'
import { Button, Card, FieldCount } from '@manifest-app/ui'
import { useEffect, useId, useRef, useState } from 'react'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { words } from '../../words.js'
import { PressNotice } from '../change/notice.js'
import { pressFailed, useFocusBack, type Notice } from '../change/press.js'
import { clockWords, dayWords } from '../keeping/lines.js'
import { countOf, LIMITS, tooLong } from '../limits.js'
import { StepUpCard } from '../trying-out/parts.js'
import { around } from './model.js'

/**
 * THE WHOLE-BRANCH REVIEW'S I2: the question a [Yes, once] left for its second sign-in, kept for the
 * way back (as People keeps its form, Decision 15). Its id alone; never a secret.
 */
export const askedKey = (slug: string) => `manifest-app.agents.${slug}`
/** The question kept for the way back, if any (read, never removed: the page removes it). */
export function askedOf(slug: string): string | null {
  try {
    return sessionStorage.getItem(askedKey(slug))
  } catch {
    return null
  }
}

const q = words.agents.question

/** The four a token is refused and asks a person about (D24), in words; any other is its summary. */
export const ACTION_WORDS: Record<string, (app: string) => string> = q.actions

/** Who asked: their agent by the name it was given, in mono (its own words), or *"An agent"*. */
function Who({ name }: { name: string | null }) {
  if (name === null) return <>{q.anAgent}</>
  const [before, after] = around(q.yourAgent)
  return (
    <>
      {before}
      <span className="mono">{name}</span>
      {after}
    </>
  )
}

/**
 * THEIR AGENT'S QUESTION (F6b Task 12; design §4, D4; Decisions 13, 16; (S1: M4)): a token refused
 * one of D24's four asks a person, and this card says what the platform lets it say, with FE-5's
 * honest line until it says who or which. **An owner answers** (FE-50: the code's rule, a helper
 * is `403` even for their own agent): **[Yes, once]** lets that one request through once, behind
 * the second sign-in (back at `?then=agents`, nothing pressed by itself); **[No]** sends their
 * words, or *"No reason given."* (the platform asks for one). Answered already, or past its day:
 * it has stopped waiting. Every answer is the person's own call; the page is told which.
 */
export function Question({
  platform,
  project,
  action,
  tokenName,
  role,
  now,
  timeZone,
  expire,
  onAnswered,
}: {
  platform: Platform
  project: Pick<Schemas['Project'], 'name' | 'slug'>
  action: Schemas['PendingAction']
  /** Its token's name (`listTokens`), or null when the page has none for it. */
  tokenName: string | null
  role: 'owner' | 'helper' | 'unknown'
  now: () => Date
  timeZone?: string | undefined
  expire: () => void
  /** Answered here (`yes`, `no`), or found no longer waiting (`gone`): the page reads again. */
  onAnswered: (answer: 'yes' | 'no' | 'gone') => void
}) {
  const [reason, setReason] = useState('')
  const [pressing, setPressing] = useState<'yes' | 'no' | null>(null)
  const [notice, setNotice] = useState<Notice>()
  const [stepUp, setStepUp] = useState(false)
  const { at: yesAt, back: focusYes } = useFocusBack<HTMLDivElement>()
  const { at: noAt, back: focusNo } = useFocusBack<HTMLDivElement>()
  const id = useId()
  const live = useRef(true)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  const known = Object.hasOwn(ACTION_WORDS, action.action)
  // Its own words alone: an action named `constructor` borrows nothing (minors m118).
  const didnt = Object.hasOwn(q.didntSay, action.action)
    ? q.didntSay[action.action]
    : undefined
  const expires = action.expiresAt
  const today = dayWords(now().toISOString(), timeZone) === dayWords(expires, timeZone)
  const count = countOf(reason, LIMITS.sentence)
  const busy = pressing !== null

  const answer = async (which: 'yes' | 'no') => {
    setPressing(which)
    setNotice(undefined)
    setStepUp(false)
    try {
      if (which === 'yes')
        await platform.confirmPendingAction(action.id, crypto.randomUUID())
      else
        await platform.rejectPendingAction(
          action.id,
          reason.trim() === '' ? q.noReason : reason.trim(),
          crypto.randomUUID(),
        )
    } catch (error) {
      if (!live.current) return
      setPressing(null)
      const refusal = refusalOf(error)
      const code = refusal.kind === 'refused' ? refusal.code : null
      if (code === 'STEP_UP_REQUIRED') {
        // Which question, for the way back (the whole-branch review's I2): the platform asks the
        // second sign-in before it says one is no longer waiting.
        try {
          sessionStorage.setItem(askedKey(project.slug), action.id)
        } catch {
          // Kept nowhere: its card says so itself, if it is still waiting.
        }
        return setStepUp(true)
      }
      if (code === 'PENDING_ACTION_RESOLVED') return onAnswered('gone')
      const failed = pressFailed(
        error,
        which === 'yes' ? 'confirmPendingAction' : 'rejectPendingAction',
      )
      if (failed.expired) return expire()
      setNotice(failed)
      if (which === 'yes') focusYes()
      else focusNo()
      return
    }
    if (!live.current) return
    setPressing(null)
    onAnswered(which)
  }

  return (
    <Card tone="attention" className="agents__question">
      <p className="body-lead">
        {known ? (
          <>
            {around((who) => q.asked(who, ACTION_WORDS[action.action]!(project.name)))[0]}
            <Who name={tokenName} />
            {around((who) => q.asked(who, ACTION_WORDS[action.action]!(project.name)))[1]}
          </>
        ) : (
          <>
            {around(q.askedThis)[0]}
            <Who name={tokenName} />
            {around(q.askedThis)[1]} <span className="mono">{action.summary}</span>
          </>
        )}
      </p>
      <p className="body">{didnt === undefined ? q.unsure : `${didnt} ${q.unsure}`}</p>
      <p className="body">{q.once}</p>
      <p className="body">
        {q.stops(
          clockWords(expires, timeZone),
          today ? null : dayWords(expires, timeZone),
        )}
      </p>
      {role === 'helper' ? <p className="body">{q.ownerAnswers}</p> : null}
      {role === 'owner' ? (
        <>
          <div className="mf-field">
            <label className="mf-field__label" htmlFor={`${id}-why`}>
              {q.why}
            </label>
            <p className="mf-field__hint" id={`${id}-hint`}>
              {q.whyHint}
            </p>
            <textarea
              id={`${id}-why`}
              className="mf-field__input agents__why"
              value={reason}
              rows={2}
              onChange={(event) => setReason(event.target.value)}
              aria-describedby={
                count === undefined ? `${id}-hint` : `${id}-hint ${id}-count`
              }
            />
            {count === undefined ? null : <FieldCount id={`${id}-count`} {...count} />}
          </div>
          {notice === undefined ? null : (
            <div role="alert">
              <PressNotice notice={notice} name={project.name} couldnt={q.couldnt} />
            </div>
          )}
          {stepUp ? (
            <StepUpCard
              returnTo={`/apps/${encodeURIComponent(project.slug)}/agents?then=agents`}
            />
          ) : null}
          <div className="describe__actions">
            <div ref={yesAt}>
              <Button kind="primary" disabled={busy} onClick={() => void answer('yes')}>
                {pressing === 'yes' ? q.answering : q.yes}
              </Button>
            </div>
            <div ref={noAt}>
              <Button
                kind="secondary"
                disabled={busy || tooLong(reason, LIMITS.sentence)}
                onClick={() => void answer('no')}
              >
                {pressing === 'no' ? q.answering : q.no}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </Card>
  )
}
