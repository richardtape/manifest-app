import type { Schemas } from '@manifest/contract'
import { Button, Card, StateChip } from '@manifest-app/ui'
import { useState } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { navigate } from '../../router.js'
import { words } from '../../words.js'
import { PressNotice } from '../change/notice.js'
import { pressFailed, type Notice } from '../change/press.js'
import { LIMITS } from '../limits.js'
import { mintRequest } from '../making/token.js'
import type { Five, Row } from './checklist.js'
import { dayWords } from './clocks.js'
import { RowView } from './row.js'

const r = words.goingLive.rows
const a = r.approval
const o = words.goingLive.owners

/**
 * What the page read of the candidate's sign-off: the newest decision, `null` when nobody has
 * decided (the platform's `404`), or `'unread'` when the read failed.
 */
export type Decided = Schemas['Approval'] | null | 'unread'

/**
 * THE SIGN-OFF'S ROW, MOMENT 13 (F5 Task 8, Decision 9), pure: keyed on the checklist item's
 * state first, which is what the gate reads, and then on the approval for the version on
 * trying-out, for who and when and why. Never on `why` (FE-9).
 * - **undecided**: waiting on a Manifest administrator, who is not told, with no date (FE-25);
 * - **signed off**: done, by whom and on what day, in their own time zone;
 * - **met with no decision**: nothing in this version needs one;
 * - **not signed off**: needs you, their reason in their words, and *[Talk it through]*: a
 *   rejection is final for its version (Decision 9);
 * - **signed off, then rebuilt** (the checklist counts it unmet): looked at afresh, never done;
 * - **not read**: we cannot tell, never a decision.
 */
export function signOffRow(
  item: Schemas['LaunchReadinessItem'],
  candidate: boolean,
  decided: Decided,
  timeZone?: string,
): Row {
  const row = (
    state: Five,
    owner: string,
    said: string,
    action: Row['action'] = null,
  ): Row => ({
    id: item.id,
    state,
    owner,
    name: a.name,
    words: said,
    address: null,
    action,
    apart: false,
  })
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
  if (decided === null) return row('waiting', o.admin, a.unmet)
  if (decided === 'unread') return row('notyet', o.admin, a.cantTell)
  if (decided.decision === 'rejected')
    return row('attention', o.you, a.rejected(decided.reason), 'talk-it-through')
  return row('waiting', o.admin, a.again)
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
 * *Ask for a change*); then the conversation, which plans the change, agreed first.
 */
export function SignOff({
  row,
  decided,
  platform,
  ours,
  project,
  expire,
}: {
  row: Row
  decided: Decided
  platform: Platform
  ours: Ours
  project: Schemas['Project']
  expire: () => void
}) {
  const [talking, setTalking] = useState(false)
  const [reference, setReference] = useState<Notice>()

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
        refusal: { approvalId: decided.id },
      })
      opened(made.id)
    } catch (error) {
      setTalking(false)
      const failed = pressFailed(error, step)
      if (failed.expired) expire()
      else setReference(failed)
    }
  }

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
      <div className="going-live__row-action">
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
