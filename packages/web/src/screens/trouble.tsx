import { Button, Card } from '@manifest-app/ui'
import { useEffect } from 'react'
import { refusedLine, reported, type Refusal } from '../platform/refusal.js'
import { words } from '../words.js'
import { SupportReference, useReported } from './reference.js'

/** Anything but signed out, which is the shell's own (Review Focus 1). */
export type Trouble = Exclude<Refusal, { kind: 'signed-out' }>

/**
 * A READ THAT FAILED, IN OUR WORDS. "Can't reach" only when nothing answered (Review Focus 2);
 * any other refusal is "something went wrong on our side", and its code goes to the console
 * for whoever is looking, never to the page (Review Focus 5). Both offer Try again. Each
 * carries a support reference, reported once (F2 Decision 11), and the report and the console
 * line keep the platform's own request id beside it (FE-30): never on the page (C3).
 */
export function TroubleNotice({
  trouble,
  onRetry,
}: {
  trouble: Trouble
  onRetry: () => void
}) {
  useEffect(() => {
    if (trouble.kind === 'refused') console.warn(refusedLine(trouble))
  }, [trouble])
  const w = trouble.kind === 'unreachable' ? words.unreachable : words.refused
  const reference = useReported(reported(trouble))
  return (
    <div role="alert">
      <Card>
        <p className="body-lead">{w.body}</p>
        <SupportReference reference={reference} />
        <Button kind="secondary" onClick={onRetry}>
          {w.button}
        </Button>
      </Card>
    </div>
  )
}
