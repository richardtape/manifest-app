import { ManifestApiError, type Schemas } from '@manifest/contract'

/**
 * WHAT A FAILED READ MEANS TO A SCREEN: by kind and by code, NEVER by message. A platform
 * message can carry machinery (`sha256:…`, a spec section), and C3 says a faculty member
 * is never shown it (Review Focus 5). A screen renders the codes it names in our words, and
 * everything else as "Something went wrong on our side".
 */
export type Refusal =
  | { kind: 'signed-out' }
  | { kind: 'unreachable' }
  | {
      kind: 'refused'
      code: string
      status: number
      /**
       * FE-30 (contract 1.6.0): the platform's own id for the request, when it gave one: kept in
       * our report beside the reference the person is shown, so that reference finds the
       * platform's line too. Never shown itself (C3).
       */
      requestId?: string
      /**
       * FE-29 (contract 1.6.0): a limit's facts, as the platform states them, on its three limit
       * refusals: whose, over what, and when it lifts (`resetsAt`, `null` when it does not know).
       */
      limit?: Schemas['Limit']
    }

/** The edge answers these with no envelope when the control plane is down (F1 M7). */
const GATEWAY = [502, 503, 504]

export function refusalOf(error: unknown): Refusal {
  if (error instanceof ManifestApiError) {
    // Any 401: the credential is not accepted, whatever a newer contract calls it.
    if (error.status === 401) return { kind: 'signed-out' }
    if (error.code === 'UNPARSEABLE' && GATEWAY.includes(error.status))
      return { kind: 'unreachable' }
    return {
      kind: 'refused',
      code: error.code,
      status: error.status,
      ...(error.requestId === null ? {} : { requestId: error.requestId }),
      ...(error.envelope?.error.limit === undefined
        ? {}
        : { limit: error.envelope.error.limit }),
    }
  }
  // `fetch` rejects with a TypeError when nothing answers: a closed port, no network.
  if (error instanceof TypeError) return { kind: 'unreachable' }
  // And with a DOMException when our deadline passes (api.ts, READ_TIMEOUT_MS).
  if (
    error instanceof DOMException &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  )
    return { kind: 'unreachable' }
  return { kind: 'refused', code: 'UNEXPECTED', status: 0 }
}

/**
 * A REFUSAL, AS ITS REPORT CARRIES IT (Decision 11): its code and status, and the platform's own
 * request id when it gave one (FE-30), never its message. Nothing answering is `UNREACHABLE`; a
 * status that is no HTTP status (`UNEXPECTED`'s 0) is left out, or our server refuses the report.
 */
export function reported(refusal: Exclude<Refusal, { kind: 'signed-out' }>): {
  code: string
  status?: number
  requestId?: string
} {
  if (refusal.kind === 'unreachable') return { code: 'UNREACHABLE' }
  const { code, status, requestId } = refusal
  return {
    code,
    ...(status >= 100 && status <= 599 ? { status } : {}),
    ...(requestId === undefined ? {} : { requestId }),
  }
}
