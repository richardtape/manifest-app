import type { RoundView, Said } from '@manifest-app/server/progress'
import { Button, Card, Disclosure, FormField } from '@manifest-app/ui'
import { useState } from 'react'
import { words } from '../../words.js'
import { countProp, LIMITS, tooLong } from '../limits.js'
import { foldedWhen } from './model.js'

type Question = RoundView['questions'][number]

/** The platform refuses a secret under 6 characters (F3 M1): said before it is sent. */
const SECRET_LEAST = 6

/** Theirs, marked in words: never by colour or side alone. */
function Theirs({ children }: { children: React.ReactNode }) {
  return (
    <li className="said said--theirs">
      <span className="said__who">{words.building.thread.you}</span>
      {children}
    </li>
  )
}

function SaidItem({ said, timeZone }: { said: Said; timeZone: string | undefined }) {
  switch (said.kind) {
    case 'message':
      return (
        <Theirs>
          <p className="said__text">{said.text}</p>
        </Theirs>
      )
    case 'answer':
      return (
        <Theirs>
          <p className="said__ask">{said.ask}</p>
          <p className="said__text">{said.text ?? words.building.thread.secretGiven}</p>
        </Theirs>
      )
    case 'explained':
      return (
        <li className="said said--ours">
          <p className="said__text">{said.sentence}</p>
        </li>
      )
    case 'fallback':
      return (
        <li className="said said--ours">
          <p className="said__text">{words.building.fallback}</p>
        </li>
      )
    case 'campus':
      return (
        <li className="said said--ours">
          <p className="said__text">{words.building.campus}</p>
        </li>
      )
    case 'carried':
      return (
        <li className="said said--ours">
          <p className="said__text">{words.building.carried}</p>
        </li>
      )
    case 'built':
      return (
        <li className="said said--ours said--folded">
          <p className="said__text">
            {words.building.thread.built(foldedWhen(new Date(said.at), timeZone))}
          </p>
          {said.changed === null && said.cannot === null ? null : (
            <Disclosure summary={words.building.whatChanged}>
              {said.changed === null ? null : <p>{said.changed}</p>}
              {said.cannot === null ? null : (
                <p>{words.building.needs.cannot(said.cannot)}</p>
              )}
            </Disclosure>
          )}
        </li>
      )
  }
}

/**
 * A QUESTION, INLINE, AS A NEEDS-YOU CARD (walk-through moment 6): the lead's ask, what we went
 * on with (or that it waits, not fails), and an answer. A secret's field is a password field,
 * emptied the moment it is sent, so its value never stays on the page.
 */
function QuestionCard({
  question,
  onAnswer,
}: {
  question: Question
  onAnswer: (questionId: string, words: string) => void
}) {
  const [value, setValue] = useState('')
  const short = question.secret && value.length > 0 && value.length < SECRET_LEAST
  const id = `answer-${question.id}`
  return (
    <Card tone={question.default === null ? 'attention' : 'waiting'}>
      <p className="body-lead">
        {question.default === null
          ? words.building.question.waiting
          : words.building.question.meanwhile(question.default)}
      </p>
      <FormField
        id={id}
        label={question.ask}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        {...(question.secret
          ? { secret: true, hint: words.building.question.secretHint }
          : {})}
        {...(short
          ? { message: { tone: 'attention', title: words.building.question.secretShort } }
          : {})}
        {...countProp(value)}
      />
      <div className="describe__actions">
        <Button
          kind="primary"
          disabled={value.trim() === '' || short || tooLong(value, LIMITS.sentence)}
          onClick={() => {
            const sent = value
            setValue('')
            onAnswer(question.id, sent)
          }}
        >
          {words.building.question.answer}
        </Button>
      </div>
    </Card>
  )
}

/**
 * A QUESTION WE WENT ON WITH, ONCE NO ANSWER CAN BE TAKEN (built): the ask and the default we
 * built with, and no field, since our server takes an answer only while it builds. A change is
 * asked in the message box below it (F4's moment 8).
 */
function WentWith({ ask, fallback }: { ask: string; fallback: string }) {
  return (
    <Card tone="steady">
      <p className="body-lead">{ask}</p>
      <p>{words.building.question.wentWith(fallback)}</p>
    </Card>
  )
}

/**
 * THEIR WORDS, IN ONE SENTENCE: while it works (the lead reads them at its next step), or, from F4,
 * the next change once it is built or set aside, and more of what they asked while it waits.
 */
export function MessageBox({
  onMessage,
  id = 'building-message',
  label = words.building.thread.messageLabel,
  hint = words.building.thread.messageHint,
  send = words.building.thread.send,
}: {
  onMessage: (words: string) => void
  id?: string
  label?: string
  hint?: string
  send?: string
}) {
  const [value, setValue] = useState('')
  return (
    <div className="building__message">
      <FormField
        id={id}
        label={label}
        {...(hint === undefined ? {} : { hint })}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        {...countProp(value)}
      />
      <div>
        <Button
          kind="secondary"
          disabled={value.trim() === '' || tooLong(value, LIMITS.sentence)}
          onClick={() => {
            const sent = value.trim()
            setValue('')
            onMessage(sent)
          }}
        >
          {send}
        </Button>
      </div>
    </div>
  )
}

/**
 * THE CONVERSATION, ON THE LEFT (layout C): their words from moment 3, then what every round
 * said, each earlier round folded into one line; the questions still open; and the message
 * box: their words while it works, and once it is built, the next change (F4's moment 8).
 */
export function Thread({
  description,
  thread,
  questions,
  talking,
  built,
  onAnswer,
  onMessage,
  theirs = null,
  timeZone,
}: {
  description: string
  thread: Said[]
  questions: Question[]
  /** A message may be sent: the conversation is building or paused. */
  talking: boolean
  built: boolean
  onAnswer: (questionId: string, words: string) => void
  onMessage: (words: string) => void
  /**
   * F6b D3: whose it is, when it is not the reader's: every question read-only (*"Only Sam can
   * answer this."*), and no message box.
   */
  theirs?: string | null
  timeZone: string | undefined
}) {
  const open = questions.filter((q) => !q.answered)
  if (theirs !== null)
    return (
      <section className="building__talk" aria-label={words.building.thread.label}>
        <ol className="thread">
          <li className="said said--theirs">
            <span className="said__who">{words.together.asked(theirs)}</span>
            <p className="said__text">{description}</p>
          </li>
          {thread.map((said, i) => (
            <SaidItem key={i} said={said} timeZone={timeZone} />
          ))}
        </ol>
        {open.map((question) => (
          <Card key={question.id} tone="waiting">
            <p className="body-lead">{question.ask}</p>
            <p className="body">{words.together.onlyThey(theirs)}</p>
          </Card>
        ))}
      </section>
    )
  return (
    <section className="building__talk" aria-label={words.building.thread.label}>
      <ol className="thread">
        <li className="said said--theirs">
          <span className="said__who">{words.building.thread.asked}</span>
          <p className="said__text">{description}</p>
        </li>
        {thread.map((said, i) => (
          <SaidItem key={i} said={said} timeZone={timeZone} />
        ))}
      </ol>
      {talking
        ? open.map((question) => (
            <QuestionCard key={question.id} question={question} onAnswer={onAnswer} />
          ))
        : open.map((question) =>
            question.default === null ? null : (
              <WentWith
                key={question.id}
                ask={question.ask}
                fallback={question.default}
              />
            ),
          )}
      {built ? (
        <MessageBox
          id="building-next"
          label={words.change.next}
          hint={words.change.nextHint}
          send={words.change.ask}
          onMessage={onMessage}
        />
      ) : talking ? (
        <MessageBox onMessage={onMessage} />
      ) : null}
    </section>
  )
}
