import type { Schemas } from '@manifest/contract'
import { Button, Card, FieldCount, StateChip } from '@manifest-app/ui'
import { useState } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { navigate } from '../../router.js'
import { words } from '../../words.js'
import { countOf, LIMITS, tooLong } from '../limits.js'
import { mintRequest } from '../making/token.js'
import { PressNotice } from './notice.js'
import { pressFailed, useFocusBack, type Notice } from './press.js'

const w = words.change

/**
 * ASK FOR A CHANGE (walk-through moment 8; F4 Task 9): their words, as they would say them to a
 * colleague. The press mints a token in their session, named for what they asked, and sends
 * their words and the token to our server in one request; then the conversation, which plans
 * the change, or waits its turn.
 */
export function AskForChange({
  platform,
  ours,
  project,
  expire,
}: {
  platform: Platform
  ours: Ours
  project: Schemas['Project']
  expire: () => void
}) {
  const [text, setText] = useState('')
  const [asking, setAsking] = useState(false)
  const [reference, setReference] = useState<Notice>()
  const focus = useFocusBack<HTMLDivElement>()
  const count = countOf(text, LIMITS.description)

  const ask = async () => {
    const theirs = text.trim()
    setReference(undefined)
    setAsking(true)
    let step = 'mintToken'
    try {
      const minted = await platform.mintToken(
        project.id,
        mintRequest(theirs, 'changing'),
        crypto.randomUUID(),
      )
      step = 'startChange'
      const made = await ours.startChange(project.id, {
        words: theirs,
        token: minted.secret,
        tokenId: minted.token.id,
      })
      navigate(
        `/apps/${encodeURIComponent(project.slug)}/conversations/${encodeURIComponent(made.id)}`,
      )
    } catch (error) {
      setAsking(false)
      const failed = pressFailed(error, step)
      if (failed.expired) expire()
      else {
        setReference(failed)
        focus.back()
      }
    }
  }

  return (
    <div className="describe">
      <div className="describe__main">
        <h1 className="page-title">{w.title}</h1>
        <p className="body-lead">{w.lead}</p>
        {reference === undefined ? null : (
          <div role="alert">
            <Card tone="attention">
              <PressNotice
                notice={reference}
                name={project.name}
                couldnt={w.couldntAsk}
              />
            </Card>
          </div>
        )}
        <div className="mf-field">
          <label className="mf-field__label" htmlFor="change-words">
            {w.label}
          </label>
          {/* F2's description box: the field's input class, recorded (Decision 10). */}
          <textarea
            id="change-words"
            className="mf-field__input describe__words"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-describedby={count === undefined ? undefined : 'change-words-count'}
          />
          {count === undefined ? null : <FieldCount id="change-words-count" {...count} />}
        </div>
        <div className="describe__actions" ref={focus.at}>
          {asking ? (
            <StateChip state="working" label={w.asking} />
          ) : (
            <Button
              kind="primary"
              disabled={text.trim() === '' || tooLong(text, LIMITS.description)}
              onClick={() => void ask()}
            >
              {w.ask}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
