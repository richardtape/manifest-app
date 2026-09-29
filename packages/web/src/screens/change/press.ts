import { OurRefusal, reportProblem } from '../../ours/api.js'
import { refusalOf } from '../../platform/refusal.js'

/**
 * WHAT A PRESS MET, FOR THE PERSON (Decision 11): the session ending is the shell's to say
 * (`expired`); anything else is a problem, reported, whose reference is answered for the notice.
 */
export function pressFailed(
  error: unknown,
  operation: string,
): { expired: true } | { expired: false; reference: string } {
  let code: string
  let status: number | null
  if (error instanceof OurRefusal) {
    if (error.status === 401) return { expired: true }
    code = error.code
    status = error.status
  } else {
    const refusal = refusalOf(error)
    if (refusal.kind === 'signed-out') return { expired: true }
    code = refusal.kind === 'refused' ? refusal.code : 'UNREACHABLE'
    status = refusal.kind === 'refused' ? refusal.status : null
  }
  return {
    expired: false,
    reference: reportProblem(
      status === null ? { code, operation } : { code, operation, status },
    ),
  }
}
