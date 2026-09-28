/**
 * OUR OWN API (`/api/*`), FROM THE PAGE: this file is its one caller, as src/platform/ is
 * the platform's (boundary.test.ts holds both). Our server answers for the person by their
 * cookie (FE-2), so a call here sends nothing but the cookie the browser already sends.
 */

/** What the hook needs of an `EventSource`, so a test can hand it a fake. */
export interface StreamSource {
  readonly readyState: number
  onmessage: ((event: MessageEvent<string>) => void) | null
  onerror: ((event: Event) => void) | null
  close(): void
}

/** A conversation's progress stream (F2 Decision 4). */
export function conversationEvents(id: string): StreamSource {
  return new EventSource(`/api/conversations/${encodeURIComponent(id)}/events`)
}

/** `XXXX-XXXX`: opaque, so it shows no machinery (C3). The server's are made the same way. */
function newReference(): string {
  const hex = [...crypto.getRandomValues(new Uint8Array(4))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  return `${hex.slice(0, 4)}-${hex.slice(4)}`
}

/**
 * A PROBLEM THE PERSON IS SHOWN, REPORTED (Decision 11, Rich). The reference is made here
 * and answered at once, for the notice to show; the report goes without being waited on,
 * and `keepalive` lets it outlive the page. Nothing here can throw into a screen, and a
 * report that fails is lost: the notice is the same either way. Only a code, an operation
 * and a status are sent, never a platform message, which can carry machinery.
 */
export function reportProblem(problem: {
  code: string
  operation?: string
  status?: number
}): string {
  const reference = newReference()
  const body = JSON.stringify({
    reference,
    code: problem.code,
    operation: problem.operation ?? null,
    status: problem.status ?? null,
    at: new Date().toISOString(),
  })
  try {
    fetch('/api/problems', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body,
    }).catch(() => undefined)
  } catch {
    // No fetch at all: the report is lost, and the reference is still shown.
  }
  return reference
}
