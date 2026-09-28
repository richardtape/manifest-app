import { ManifestApiError } from '@manifest/contract'

/**
 * WHAT THE PLATFORM REFUSED, AS OUR SERVER CARRIES IT: its code and status, and never its
 * message, which can carry machinery, or name what a message may never be parsed for (FE-29).
 * Nothing the platform was not reached at all is `PLATFORM_UNAVAILABLE`.
 */
export class PlatformRefusal extends Error {
  constructor(
    readonly code: string,
    readonly status: number | null,
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
      return new PlatformRefusal('PLATFORM_UNAVAILABLE', error.status)
    return new PlatformRefusal(error.code, error.status)
  }
  // fetch's TypeError, or our deadline's DOMException: nothing answered.
  return new PlatformRefusal('PLATFORM_UNAVAILABLE', null)
}

/** Every call our server makes to the platform has a deadline, as the page's reads do (F1). */
export const PLATFORM_TIMEOUT_MS = 15_000
