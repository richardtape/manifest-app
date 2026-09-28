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

/**
 * THE PROJECT MAKE IT MADE, until our server has its token (F2 Task 8). A reload between the
 * two carries on from the project, minting and handing over, and never makes another, whose
 * address would be the person's own and taken.
 */
const MADE = (conversationId: string) => `manifest-app.made.${conversationId}`

export type MadeProject = { id: string; name: string }

export function rememberMadeProject(conversationId: string, made: MadeProject): void {
  try {
    sessionStorage.setItem(MADE(conversationId), JSON.stringify(made))
  } catch {
    // Not kept: a reload then shows Name it again.
  }
}

export function recallMadeProject(conversationId: string): MadeProject | undefined {
  try {
    const kept = JSON.parse(
      sessionStorage.getItem(MADE(conversationId)) ?? 'null',
    ) as unknown
    if (typeof kept !== 'object' || kept === null) return undefined
    const { id, name } = kept as Record<string, unknown>
    return typeof id === 'string' && typeof name === 'string' ? { id, name } : undefined
  } catch {
    return undefined
  }
}

export function forgetMadeProject(conversationId: string): void {
  try {
    sessionStorage.removeItem(MADE(conversationId))
  } catch {
    // Nothing to forget.
  }
}
