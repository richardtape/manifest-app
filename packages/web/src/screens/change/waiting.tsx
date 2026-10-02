import type {
  Conversation,
  Intake,
  LineView,
  PieceView,
} from '@manifest-app/server/progress'
import { Button, Card, StateChip } from '@manifest-app/ui'
import { useState, type ReactNode } from 'react'
import type { Ours } from '../../ours/api.js'
import { linkTo } from '../../router.js'
import { words } from '../../words.js'
import { MessageBox } from '../building/thread.js'
import { SupportReference } from '../reference.js'
import { pressFailed } from './press.js'

const w = words.change

/**
 * A press on one of these screens, sent: our server answers on the stream. What it could not
 * take is said with its reference; the session ending is the shell's to say.
 */
function usePress(expire: () => void) {
  const [reference, setReference] = useState<string>()
  const send = async (operation: string, call: () => Promise<void>) => {
    setReference(undefined)
    try {
      await call()
    } catch (error) {
      const failed = pressFailed(error, operation)
      if (failed.expired) expire()
      // Our server answers its own codes, never the platform's PROJECT_ARCHIVED (F6 Task 11).
      else if (!failed.archived) setReference(failed.reference)
    }
  }
  const notice =
    reference === undefined ? null : (
      <div role="alert">
        <Card tone="attention">
          <p className="body-lead">{words.building.couldntPress}</p>
          <SupportReference reference={reference} />
        </Card>
      </div>
    )
  return { send, notice }
}

/** What they asked for this piece of work, each in their words. */
function Asked({ piece }: { piece: PieceView | null }): ReactNode {
  if (piece === null || piece.asked.length === 0) return null
  return (
    <section className="waiting__asked">
      <h2 className="subheading">{w.asked}</h2>
      <ul>
        {piece.asked.map((asked, i) => (
          <li key={i}>{asked}</li>
        ))}
      </ul>
    </section>
  )
}

/**
 * THE LINE, SEEN FROM THE BACK OF IT (walk-through moment 8; F4 Decision 5): its top reads
 * waiting on someone, who holds the app and whether that one waits for them, and its place. Its
 * message box still takes their words, which join what they asked. Leave the line sets it aside.
 */
export function WaitingScreen({
  ours,
  conversation,
  intake,
  line,
  piece,
  expire,
}: {
  ours: Ours
  conversation: Conversation
  intake: Intake
  line: LineView | null
  piece: PieceView | null
  expire: () => void
}) {
  const { send, notice } = usePress(expire)
  const id = conversation.id
  const slug = intake.project?.slug
  const holder = line?.holder ?? null
  return (
    <div className="waiting">
      <h1 className="page-title">{intake.project?.name ?? conversation.title}</h1>
      {notice}
      <Card tone="waiting" className="waiting__card">
        <StateChip state="waiting" label={w.waitingChip} />
        {holder === null ? (
          <p className="body-lead">{w.startsSoon}</p>
        ) : (
          <p className="body-lead">
            {w.waitingBefore}
            {slug === undefined ? (
              holder.title
            ) : (
              <a
                {...linkTo(
                  `/apps/${encodeURIComponent(slug)}/conversations/${encodeURIComponent(holder.id)}`,
                )}
              >
                {holder.title}
              </a>
            )}
            {w.waitingAfter(holder.waitingForYou)}
          </p>
        )}
        {line === null ? null : <p>{w.place(line.place)}</p>}
        <div className="describe__actions">
          <Button kind="secondary" onClick={() => void send('stop', () => ours.stop(id))}>
            {w.leave}
          </Button>
        </div>
      </Card>
      <Asked piece={piece} />
      <MessageBox
        id="waiting-message"
        label={w.addLabel}
        hint={w.addHint}
        send={w.send}
        onMessage={(said) => void send('message', () => ours.message(id, said))}
      />
    </div>
  )
}

/**
 * A CHANGE SET ASIDE (Not now, or Leave the line): nothing was changed, and the box asks for
 * another, which is the conversation's next change.
 */
export function SetAsideScreen({
  ours,
  conversation,
  intake,
  piece,
  expire,
}: {
  ours: Ours
  conversation: Conversation
  intake: Intake
  piece: PieceView | null
  expire: () => void
}) {
  const { send, notice } = usePress(expire)
  const id = conversation.id
  return (
    <div className="waiting">
      <h1 className="page-title">{intake.project?.name ?? conversation.title}</h1>
      {notice}
      <Card tone="plain" className="waiting__card">
        <StateChip state="notyet" label={w.conversations.setAside} />
        <p className="body-lead">{w.setAside}</p>
      </Card>
      <Asked piece={piece} />
      <MessageBox
        id="set-aside-message"
        label={w.instead}
        hint={w.nextHint}
        send={w.ask}
        onMessage={(said) => void send('message', () => ours.message(id, said))}
      />
    </div>
  )
}
