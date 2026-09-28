import { Button, Card } from '@manifest-app/ui'
import { useEffect } from 'react'
import type { Refusal } from '../platform/refusal.js'
import { words } from '../words.js'

/** Anything but signed out, which is the shell's own (Review Focus 1). */
export type Trouble = Exclude<Refusal, { kind: 'signed-out' }>

/**
 * A READ THAT FAILED, IN OUR WORDS. "Can't reach" only when nothing answered (Review Focus 2);
 * any other refusal is "something went wrong on our side", and its code goes to the console
 * for whoever is looking, never to the page (Review Focus 5). Both offer Try again.
 */
export function TroubleNotice({
  trouble,
  onRetry,
}: {
  trouble: Trouble
  onRetry: () => void
}) {
  useEffect(() => {
    if (trouble.kind === 'refused')
      console.warn(`Manifest refused a read: ${trouble.code} (${trouble.status})`)
  }, [trouble])
  const w = trouble.kind === 'unreachable' ? words.unreachable : words.refused
  return (
    <div role="alert">
      <Card>
        <p className="body-lead">{w.body}</p>
        <Button kind="secondary" onClick={onRetry}>
          {w.button}
        </Button>
      </Card>
    </div>
  )
}
