import { OurRefusal, reportProblem } from '../../ours/api.js'
import { refusalOf } from '../../platform/refusal.js'

/**
 * WHAT A PRESS MET, FOR THE PERSON (Decision 11): the session ending is the shell's to say
 * (`expired`); **the app switched off** (`409 PROJECT_ARCHIVED`, F6 Task 11) is said in words,
 * never a problem; anything else is a problem, reported, whose reference is answered for the
 * notice.
 */
export type Failed =
  | { expired: true }
  | { expired: false; archived: true }
  | { expired: false; archived: false; reference: string }

/** What a page keeps to say after a press: `pressFailed`'s answer, the session ending aside. */
export type Notice = Exclude<Failed, { expired: true }>

export function pressFailed(error: unknown, operation: string): Failed {
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
  if (code === 'PROJECT_ARCHIVED') return { expired: false, archived: true }
  return {
    expired: false,
    archived: false,
    reference: reportProblem(
      status === null ? { code, operation } : { code, operation, status },
    ),
  }
}
