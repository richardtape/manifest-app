import { Button } from '@manifest-app/ui'
import { useEffect, useState } from 'react'
import { newReference, reportProblem } from '../ours/api.js'
import { words } from '../words.js'

/**
 * A PROBLEM THE PERSON IS SHOWN, REPORTED ONCE (F2 Decision 11, Rich). The reference is made
 * on the first render, so the notice shows it at once; the report goes from an effect. Under
 * StrictMode that effect runs twice, with the same reference, and our server ignores a
 * repeat.
 */
export function useReported(problem: {
  code: string
  operation?: string
  status?: number
}): string {
  const [reference] = useState(newReference)
  const { code, operation, status } = problem
  useEffect(() => {
    reportProblem({
      code,
      reference,
      ...(operation === undefined ? {} : { operation }),
      ...(status === undefined ? {} : { status }),
    })
    // Once per reference: a notice's problem is the one it was made for.
  }, [reference])
  return reference
}

/** "If you contact support, quote 7F3A-9C21." with [Copy]. Opaque: never a machine word (C3). */
export function SupportReference({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard
      ?.writeText(reference)
      .then(() => setCopied(true))
      .catch(() => undefined)
  }
  return (
    <p className="support-ref">
      <span>{words.reference.line(reference)}</span>{' '}
      <Button kind="tertiary" size="sm" onClick={copy}>
        {words.reference.copy}
      </Button>{' '}
      <span role="status">{copied ? words.reference.copied : ''}</span>
    </p>
  )
}
