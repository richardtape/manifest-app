import { ManifestApiError } from '@manifest/contract'

/**
 * WHAT A FAILED READ MEANS TO A SCREEN: by kind and by code, NEVER by message. A platform
 * message can carry machinery (`sha256:…`, a spec section), and C3 says a faculty member
 * is never shown it (Review Focus 5). A screen renders the codes it names in our words, and
 * everything else as "Something went wrong on our side".
 */
export type Refusal =
  | { kind: 'signed-out' }
  | { kind: 'unreachable' }
  | { kind: 'refused'; code: string; status: number }

/** The edge answers these with no envelope when the control plane is down (F1 M7). */
const GATEWAY = [502, 503, 504]

export function refusalOf(error: unknown): Refusal {
  if (error instanceof ManifestApiError) {
    // Any 401: the credential is not accepted, whatever a newer contract calls it.
    if (error.status === 401) return { kind: 'signed-out' }
    if (error.code === 'UNPARSEABLE' && GATEWAY.includes(error.status))
      return { kind: 'unreachable' }
    return { kind: 'refused', code: error.code, status: error.status }
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
