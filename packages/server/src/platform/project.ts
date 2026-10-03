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

/** What the conversation's token reads about its project. */
export interface Projects {
  /** `getProject`: a token sees exactly one project. */
  read(token: string, projectId: string): Promise<Made>
  /**
   * `getProject` again (F6b, the review's I1): whether the app has reached its students
   * (`launchedAt`), kept apart from `Made`, which a conversation's record keeps.
   */
  launched(token: string, projectId: string): Promise<boolean>
  /**
   * `getKnowledgePack`: how apps on this blueprint are built (D25), as text, each file under
   * its path, `AGENTS.md` first as the platform sends it. Cut at a length a small model can
   * read, and said so.
   */
  knowledgePack(token: string, blueprint: string): Promise<string>
}

/** The most of a pack a plan is written from: the laptop's model is small (M3). */
const PACK_CHARS = 24_000
const CUT = '\n\n(The rest is left out.)'

export function platformProjects(origin: string): Projects {
  const client = (token: string) =>
    createManifestClient({
      origin,
      token,
      fetch: (request) =>
        globalThis.fetch(request, { signal: AbortSignal.timeout(PLATFORM_TIMEOUT_MS) }),
    })
  return {
    async knowledgePack(token, blueprint) {
      try {
        const pack = unwrap(
          await client(token).GET('/v1/blueprints/{blueprintRef}/knowledge-pack', {
            params: { path: { blueprintRef: blueprint } },
          }),
          'getKnowledgePack',
        )
        const text = pack.files
          .map((file) => `## ${file.path}\n\n${file.content.trim()}`)
          .join('\n\n')
        return text.length <= PACK_CHARS
          ? text
          : text.slice(0, PACK_CHARS - CUT.length) + CUT
      } catch (error) {
        throw refusalFrom(error)
      }
    },
    async launched(token, projectId) {
      try {
        const project = unwrap(
          await client(token).GET('/v1/projects/{projectId}', {
            params: { path: { projectId } },
          }),
          'getProject',
        )
        return (project.launchedAt ?? null) !== null
      } catch (error) {
        throw refusalFrom(error)
      }
    },
    async read(token, projectId) {
      try {
        const project = unwrap(
          await client(token).GET('/v1/projects/{projectId}', {
            params: { path: { projectId } },
          }),
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
