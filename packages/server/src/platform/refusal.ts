import { createManifestClient, ManifestApiError } from '@manifest/contract'

/**
 * WHAT THE PLATFORM REFUSED, AS OUR SERVER CARRIES IT: its code and status, and never its
 * message, which can carry machinery, or name what a message may never be parsed for (FE-29).
 * Nothing the platform was not reached at all is `PLATFORM_UNAVAILABLE`. **And the platform's
 * own id for the request** (FE-30, contract 1.6.0), when it gave one: kept in our problem row
 * and its line beside our reference, so the reference a person quotes finds the platform's line.
 */
export class PlatformRefusal extends Error {
  constructor(
    readonly code: string,
    readonly status: number | null,
    readonly requestId: string | null = null,
  ) {
    super(status === null ? code : `${code} (${status})`)
    this.name = 'PlatformRefusal'
  }
}

export function refusalFrom(error: unknown): PlatformRefusal {
  if (error instanceof PlatformRefusal) return error
  if (error instanceof ManifestApiError) {
    // The edge's empty 502/503/504 when the control plane is down (F1 M7).
    if (error.code === 'UNPARSEABLE' && [502, 503, 504].includes(error.status))
      return new PlatformRefusal('PLATFORM_UNAVAILABLE', error.status, error.requestId)
    return new PlatformRefusal(error.code, error.status, error.requestId)
  }
  // fetch's TypeError, or our deadline's DOMException: nothing answered.
  return new PlatformRefusal('PLATFORM_UNAVAILABLE', null)
}

/** Every call our server makes to the platform has a deadline, as the page's reads do (F1). */
export const PLATFORM_TIMEOUT_MS = 15_000
/**
 * DEPLOY HAS ITS OWN DEADLINE (F3 Decision 17): it answers when the instance is healthy or has
 * failed. F3 M4 measured 8.9 s healthy, and 91 s for one that could not start.
 */
export const DEPLOY_TIMEOUT_MS = 120_000

/**
 * A COMMIT REFUSED WITH FACTS THE LEAD MAY READ (never the person): each of SPEC_INVALID's
 * details, by its path, code and hint. Never the platform's message (FE-29).
 */
export class CommitRefused extends PlatformRefusal {
  constructor(
    code: string,
    status: number | null,
    readonly details: { path: string; code: string; hint: string | null }[],
    requestId: string | null = null,
  ) {
    super(code, status, requestId)
    this.name = 'CommitRefused'
  }
}

/** The conversation's token, and a deadline on every request. Never a cookie (FE-2). */
export function tokenClient(
  origin: string,
  token: string,
  timeoutMs = PLATFORM_TIMEOUT_MS,
) {
  return createManifestClient({
    origin,
    token,
    fetch: (request) =>
      globalThis.fetch(request, { signal: AbortSignal.timeout(timeoutMs) }),
  })
}

/** A call's refusal as ours: its code and status, never its message. */
export async function called<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    throw refusalFrom(error)
  }
}
