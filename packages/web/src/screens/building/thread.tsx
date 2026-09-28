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

/** Their words while it works: the lead reads them at its next step. */
function MessageBox({ onMessage }: { onMessage: (words: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="building__message">
      <FormField
        id="building-message"
        label={words.building.thread.messageLabel}
        hint={words.building.thread.messageHint}
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
          {words.building.thread.send}
        </Button>
      </div>
    </div>
  )
}

/**
 * THE CONVERSATION, ON THE LEFT (layout C): their words from moment 3, then what every round
 * said, each earlier round folded into one line; the questions still open; and the message
 * box, until the round is built, when a change arrives next (Decision 16).
 */
export function Thread({
  description,
  thread,
  questions,
  talking,
  built,
  onAnswer,
  onMessage,
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
  timeZone: string | undefined
}) {
  const open = questions.filter((q) => !q.answered)
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
      {open.map((question) => (
        <QuestionCard key={question.id} question={question} onAnswer={onAnswer} />
      ))}
      {built ? (
        <p className="body-lead">{words.building.thread.changeNext}</p>
      ) : talking ? (
        <MessageBox onMessage={onMessage} />
      ) : null}
    </section>
  )
}
