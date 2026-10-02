import type { Schemas } from '@manifest/contract'
import { Button, Card, FieldCount, StateChip } from '@manifest-app/ui'
import { useEffect, useId, useRef, useState } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { navigate } from '../../router.js'
import { words } from '../../words.js'
import { PressNotice } from '../change/notice.js'
import { pressFailed, useFocusBack, type Notice } from '../change/press.js'
import { countOf, LIMITS, tooLong } from '../limits.js'
import { mintRequest } from '../making/token.js'
import type { Five, Row } from './checklist.js'
import { dayWords, vancouverDays } from './steps.js'
import { RowView } from './row.js'

const r = words.goingLive.rows
const a = r.approval
const o = words.goingLive.owners

/** F5b (the design's §3): the note's bound, the platform's `RequestApprovalRequest.note` (500). */
export const NOTE_LIMIT = 500

/**
 * What the page read of the candidate's sign-off: the newest decision, `null` when nobody has
 * decided (the platform's `404`), or `'unread'` when the read failed.
 */
export type Decided = Schemas['Approval'] | null | 'unread'

/**
 * THE SIGN-OFF'S ROW, MOMENT 13 (F5 Task 8, Decision 9; F5b Task 4, D7), pure: keyed on the
 * checklist item's state first, which is what the gate reads, then on the approval for the version
 * on trying-out, for who and when and why, and **on the item's `since`, when someone asked**. Never
 * on `why` (FE-9).
 * - **undecided, nobody has asked** (`since` null): needs you, and *[Ask a Manifest administrator
 *   to sign this off]* (F5b);
 * - **undecided, asked**: waiting on a Manifest administrator, who looks at it next, *"asked 21
 *   September · waiting 2 days"* in Vancouver days (the day alone with no clock: F6's band);
 * - **signed off**: done, by whom and on what day, in their own time zone;
 * - **met with no decision**: nothing in this version needs one;
 * - **not signed off**: needs you, their reason in their words, and *[Talk it through]*: a
 *   rejection is final for its version (Decision 9);
 * - **signed off, then rebuilt** (the checklist counts it unmet): looked at afresh, never done, and
 *   asked for as an undecided one is;
 * - **not read**: we cannot tell, never a decision.
 */
export function signOffRow(
  item: Schemas['LaunchReadinessItem'],
  candidate: boolean,
  decided: Decided,
  timeZone?: string,
  now?: Date,
): Row {
  const row = (
    state: Five,
    owner: string,
    said: string,
    action: Row['action'] = null,
    when: string | null = null,
  ): Row => ({
    id: item.id,
    state,
    owner,
    name: a.name,
    words: said,
    address: null,
    when,
    action,
    apart: false,
  })
  /** Nobody has decided: theirs to ask, or asked and waiting since the day it was asked. */
  const askOr = (said: string): Row => {
    if (item.since === null) return row('attention', o.you, said, 'ask')
    const day = dayWords(item.since, timeZone)
    const days = now === undefined ? null : vancouverDays(item.since, now)
    const waited = days === null ? null : words.goingLive.steps.waiting(days)
    return row('waiting', o.admin, said, null, day === null ? null : a.when(day, waited))
  }
  if (item.state === 'not_built') return row('notyet', o.nobody, r.notTracked)
  if (item.state === 'met') {
    if (decided === null) return row('steady', o.admin, a.nothingNeeded)
    if (decided === 'unread' || decided.decision !== 'approved')
      return row('steady', o.admin, a.met)
    return row(
      'steady',
      o.admin,
      a.signedOff(decided.decidedByName, dayWords(decided.decidedAt, timeZone)),
    )
  }
  if (!candidate) return row('notyet', o.admin, r.once)
  if (decided === null) return item.since === null ? askOr(a.unmet) : askOr(a.asked)
  if (decided === 'unread') return row('notyet', o.admin, a.cantTell)
  if (decided.decision === 'rejected')
    return row('attention', o.you, a.rejected(decided.reason), 'talk-it-through')
  return askOr(a.again)
}

/**
 * THE CHANGE'S WORDS (Words proposed for Rich): ours, then their reason as the administrator
 * wrote it, **cut at a word to the change's limit**, since our server refuses a change longer
 * than a description (`LIMITS.description`).
 */
export function talkWords(reason: string | null): string {
  if (reason === null) return a.change(null)
  const whole = a.change(reason)
  if (whole.length <= LIMITS.description) return whole
  const room = LIMITS.description - a.change('').length - 1
  const cut = reason.slice(0, room)
  const space = cut.lastIndexOf(' ')
  return a.change(`${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}…`)
}

/**
 * THE SIGN-OFF, DRAWN: its row, and when it was not signed off, **[Talk it through]**. The press
 * opens the change already under way for this refusal, if there is one (the final review's I1,
 * F4's I2 again); else it mints a token in their session, named for the change, and sends our
 * words, their reason, the decision it answers and the token to our server in one request (F4's
 * *Ask for a change*); then the conversation, which plans the change, agreed first. **Undecided and
 * unasked, *[Ask a Manifest administrator to sign this off]*** (F5b Task 4): `Ask`.
 */
export function SignOff({
  row,
  decided,
  candidate,
  platform,
  ours,
  project,
  expire,
  onAsked,
}: {
  row: Row
  decided: Decided
  /** The release on trying-out, as this reading has it: what an ask names (F5b). */
  candidate: string | null
  platform: Platform
  ours: Ours
  project: Schemas['Project']
  expire: () => void
  /** Asked, or refused in a way the platform's next reading says: read the page again (F5b). */
  onAsked: () => void
}) {
  const [talking, setTalking] = useState(false)
  const [reference, setReference] = useState<Notice>()
  const focus = useFocusBack<HTMLDivElement>()

  const talk = async () => {
    // Only a refusal read from its approval draws the button (signOffRow).
    if (decided === null || decided === 'unread') return
    const said = talkWords(decided.reason)
    const opened = (id: string) =>
      navigate(
        `/apps/${encodeURIComponent(project.slug)}/conversations/${encodeURIComponent(id)}`,
      )
    setReference(undefined)
    setTalking(true)
    let step = 'changeForRefusal'
    try {
      // Pressed again (the final review's I1): the change already under way for this refusal.
      const under = await ours.changeForRefusal(project.id, decided.id)
      if (under !== null) return opened(under.id)
      step = 'mintToken'
      const minted = await platform.mintToken(
        project.id,
        mintRequest(said, 'changing'),
        crypto.randomUUID(),
      )
      step = 'startChange'
      const made = await ours.startChange(project.id, {
        words: said,
        token: minted.secret,
        tokenId: minted.token.id,
        refusal: { approvalId: decided.id },
      })
      opened(made.id)
    } catch (error) {
      setTalking(false)
      const failed = pressFailed(error, step)
      if (failed.expired) expire()
      else {
        setReference(failed)
        focus.back()
      }
    }
  }

  if (row.action === 'ask')
    return (
      <Ask
        row={row}
        candidate={candidate}
        platform={platform}
        project={project}
        expire={expire}
        onAsked={onAsked}
      />
    )
  if (row.action !== 'talk-it-through') return <RowView row={row} />
  return (
    <RowView row={row}>
      {reference === undefined ? null : (
        <div role="alert">
          <Card tone="attention">
            <PressNotice
              notice={reference}
              name={project.name}
              couldnt={a.couldntTalk}
              className="body-small"
            />
          </Card>
        </div>
      )}
      <div className="going-live__row-action" ref={focus.at}>
        {talking ? (
          <StateChip state="working" label={a.talking} />
        ) : (
          <Button kind="secondary" size="sm" onClick={() => void talk()}>
            {a.talk}
          </Button>
        )}
      </div>
    </RowView>
  )
}

/**
 * ASKING FOR THE SIGN-OFF (F5b Task 4, D7; the design's §3), in their session: the press opens one
 * optional note in place (never `maxLength`: a note over the platform's bound holds the press and
 * keeps their text), then *[Ask them]* asks for **the version this reading has on trying-out**, with
 * one `Idempotency-Key` per press. The note goes to the administrators' queue and is never drawn
 * back. Each refusal by its code: `RELEASE_NOT_STAGED` says the version changed and reads again,
 * the press held until that reading arrives, so the next names the new version, never the old;
 * `APPROVAL_NOT_NEEDED` and `RELEASE_REJECTED` read again, and the reading says it; a switched-off
 * app is said as F6 says it (`PressNotice`); anything else, *"We couldn't ask just now"*, with a
 * reference, the note kept.
 */
function Ask({
  row,
  candidate,
  platform,
  project,
  expire,
  onAsked,
}: {
  row: Row
  candidate: string | null
  platform: Platform
  project: Schemas['Project']
  expire: () => void
  onAsked: () => void
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [note, setNote] = useState('')
  const [notice, setNotice] = useState<Notice>()
  // RELEASE_NOT_STAGED: the row it was refused on. The press waits for a reading after it.
  const [changedOn, setChangedOn] = useState<Row | null>(null)
  // No reading after the page has gone (F6 sitting 6's review).
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const count = countOf(note, NOTE_LIMIT)
  const held = changedOn === row
  // THE FOCUS FOLLOWS THE PRESS (the review's I3, F6's switching pattern): into the note as it
  // opens; onto *Asking* while it asks; back to *[Ask them]* when a press did not go through; and,
  // as the note closes, back to the row's button, or to what changed when the press is held.
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const workingRef = useRef<HTMLSpanElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const offerRef = useRef<HTMLDivElement>(null)
  const changedRef = useRef<HTMLParagraphElement>(null)
  const was = useRef({ open, sending })
  useEffect(() => {
    const before = was.current
    was.current = { open, sending }
    if (open && !before.open) noteRef.current?.focus()
    else if (sending && !before.sending) workingRef.current?.focus()
    else if (open && before.sending) actionsRef.current?.querySelector('button')?.focus()
    else if (!open && before.open)
      (offerRef.current?.querySelector('button') ?? changedRef.current)?.focus()
  }, [open, sending])

  const ask = async () => {
    if (candidate === null || tooLong(note, NOTE_LIMIT)) return
    const theirs = note.trim()
    setNotice(undefined)
    setChangedOn(null)
    setSending(true)
    try {
      await platform.requestApproval(
        candidate,
        theirs === '' ? {} : { note: theirs },
        crypto.randomUUID(),
      )
      if (!mounted.current) return
      setSending(false)
      setOpen(false)
      setNote('')
      onAsked()
    } catch (error) {
      if (!mounted.current) return
      setSending(false)
      const refusal = refusalOf(error)
      const code = refusal.kind === 'refused' ? refusal.code : null
      if (code === 'RELEASE_NOT_STAGED') {
        setOpen(false)
        setChangedOn(row)
        return onAsked()
      }
      if (code === 'APPROVAL_NOT_NEEDED' || code === 'RELEASE_REJECTED') {
        setOpen(false)
        return onAsked()
      }
      const failed = pressFailed(error, 'requestApproval')
      if (failed.expired) expire()
      else setNotice(failed)
    }
  }

  return (
    <RowView row={row} announce>
      {changedOn === null ? null : (
        <p
          ref={changedRef}
          tabIndex={-1}
          className="body-small going-live__changed"
          role="status"
        >
          {a.changed}
        </p>
      )}
      {notice === undefined ? null : (
        <div role="alert">
          <Card tone="attention">
            <PressNotice
              notice={notice}
              name={project.name}
              couldnt={a.couldntAsk}
              className="body-small"
            />
          </Card>
        </div>
      )}
      {open ? (
        <div className="going-live__ask">
          <div className="mf-field">
            <label className="mf-field__label" htmlFor={`${id}-note`}>
              {a.note}
            </label>
            <p className="mf-field__hint" id={`${id}-hint`}>
              {a.noteHint}
            </p>
            <textarea
              ref={noteRef}
              id={`${id}-note`}
              className="mf-field__input going-live__note"
              value={note}
              rows={3}
              onChange={(event) => setNote(event.target.value)}
              aria-describedby={
                count === undefined ? `${id}-hint` : `${id}-hint ${id}-count`
              }
            />
            {count === undefined ? null : <FieldCount id={`${id}-count`} {...count} />}
          </div>
          <div
            ref={actionsRef}
            className="going-live__row-action going-live__ask-actions"
          >
            {sending ? (
              <span ref={workingRef} tabIndex={-1} role="status">
                <StateChip state="working" label={a.asking} />
              </span>
            ) : (
              <>
                <Button
                  kind="primary"
                  size="sm"
                  disabled={tooLong(note, NOTE_LIMIT)}
                  onClick={() => void ask()}
                >
                  {a.askThem}
                </Button>
                <Button kind="secondary" size="sm" onClick={() => setOpen(false)}>
                  {a.notNow}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : held ? null : (
        <div ref={offerRef} className="going-live__row-action">
          <Button kind="secondary" size="sm" onClick={() => setOpen(true)}>
            {a.ask}
          </Button>
        </div>
      )}
    </RowView>
  )
}
