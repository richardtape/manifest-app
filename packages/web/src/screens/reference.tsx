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
  /** FE-30: the platform's id for the request it refused, kept beside the reference. */
  requestId?: string
}): string {
  const [reference] = useState(newReference)
  const { code, operation, status, requestId } = problem
  useEffect(() => {
    reportProblem({
      code,
      reference,
      ...(operation === undefined ? {} : { operation }),
      ...(status === undefined ? {} : { status }),
      ...(requestId === undefined ? {} : { requestId }),
    })
    // Once per reference: a notice's problem is the one it was made for.
  }, [reference])
  return reference
}

/**
 * "If you contact support, quote 7F3A-9C21.", the reference kept whole (minors m6: at 375 it broke at
 * its hyphen), wherever it is said.
 */
export function ReferenceLine({ reference }: { reference: string }) {
  const [before = '', after = ''] = words.reference.line('\u0000').split('\u0000')
  return (
    <>
      {before}
      <span className="support-ref__code">{reference}</span>
      {after}
    </>
  )
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
      <span>
        <ReferenceLine reference={reference} />
      </span>{' '}
      <Button kind="tertiary" size="sm" onClick={copy}>
        {words.reference.copy}
      </Button>{' '}
      <span role="status">{copied ? words.reference.copied : ''}</span>
    </p>
  )
}
