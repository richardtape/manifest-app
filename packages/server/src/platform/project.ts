import { createManifestClient, unwrap } from '@manifest/contract'
import { PLATFORM_TIMEOUT_MS, refusalFrom } from './refusal.js'

/**
 * THE CONVERSATION'S PROJECT AND ITS TOKEN (F2 Task 8). The browser makes the project and
 * mints the token in the person's session, and hands both to us. The token is kept IN MEMORY
 * ONLY, for the conversation's work (Decision 1): a restart forgets it, and the page mints
 * another.
 */
export interface ConversationTokens {
  put(conversationId: string, token: string): void
  get(conversationId: string): string | undefined
  drop(conversationId: string): void
}

export function createConversationTokens(): ConversationTokens {
  const tokens = new Map<string, string>()
  return {
    put: (id, token) => void tokens.set(id, token),
    get: (id) => tokens.get(id),
    drop: (id) => void tokens.delete(id),
  }
}

/** What we keep of a project: never a credential, and nothing a person is not shown. */
export type Made = { id: string; name: string; slug: string; blueprint: string }

/** `getProject`, with the conversation's token: a token sees exactly one project. */
export interface Projects {
  read(token: string, projectId: string): Promise<Made>
}

export function platformProjects(origin: string): Projects {
  return {
    async read(token, projectId) {
      try {
        const project = unwrap(
          await createManifestClient({
            origin,
            token,
            fetch: (request) =>
              globalThis.fetch(request, {
                signal: AbortSignal.timeout(PLATFORM_TIMEOUT_MS),
              }),
          }).GET('/v1/projects/{projectId}', { params: { path: { projectId } } }),
          'getProject',
        )
        return {
          id: project.id,
          name: project.name,
          slug: project.slug,
          blueprint: project.blueprint,
        }
      } catch (error) {
        throw refusalFrom(error)
      }
    },
  }
}
