/**
 * THE INTAKE SESSION'S ID, for this tab (F2 Task 7): only the browser can end an intake
 * session (sitting 1), and it does so when *Make it* is pressed, which can come after a
 * reload. Never the key: that went to our server, and is nowhere here. Storage may be
 * refused (a private window): then the session simply expires on its own, within 30 minutes.
 */
const KEY = (conversationId: string) => `manifest-app.intake-session.${conversationId}`

export function rememberIntakeSession(conversationId: string, sessionId: string): void {
  try {
    sessionStorage.setItem(KEY(conversationId), sessionId)
  } catch {
    // Not kept: it expires by itself.
  }
}

export function recallIntakeSession(conversationId: string): string | undefined {
  try {
    return sessionStorage.getItem(KEY(conversationId)) ?? undefined
  } catch {
    return undefined
  }
}
