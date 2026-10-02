import type { Probed } from './outage.js'

/**
 * F6 TASK 6: ONE LOOK AT A STUDENTS' ADDRESS (design §4, D6: Node's own `fetch`, no dependency),
 * as a student's browser arrives: through the edge, never following a redirect (a CWL app's
 * sign-in is an answer), with a ceiling. Its body is never read. (S1: M3) whether the app's own
 * instance answered is `x-manifest-instance`, which the edge's catch-all never sends.
 */
const CEILING_MS = 10_000

export async function probeAddress(
  url: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = CEILING_MS,
): Promise<Probed> {
  const signal = AbortSignal.timeout(timeoutMs)
  try {
    const response = await fetchFn(url, { redirect: 'manual', signal })
    void response.body?.cancel().catch(() => undefined)
    return {
      status: response.status,
      routed: response.headers.has('x-manifest-instance'),
    }
  } catch {
    // Refused, unresolved, reset, or no answer in time: nothing answered.
    return { status: null, routed: false }
  }
}
