import { createManifestClient, unwrap } from '@manifest/contract'
import { PLATFORM_TIMEOUT_MS, refusalFrom } from './refusal.js'
import { platformSource, type Sent } from './source.js'

export type { Sent } from './source.js'

/**
 * THE AUTHORING API, with the conversation's token (F2 Decision 9). The plan's first commit
 * is small and deliberate: `docs/plan.md`, and nothing else. It proves F3's path on a
 * harmless file.
 */
export interface Authoring {
  tree(token: string, projectId: string): Promise<{ commitSha: string; paths: string[] }>
  /** The commit, and every `createCommit` made on the way, in order. */
  commitPlan(
    token: string,
    projectId: string,
    baseCommit: string,
    markdown: string,
  ): Promise<{ commitSha: string; sent: Sent[] }>
}

const PLAN = 'docs/plan.md'
const MESSAGE = 'The plan we agreed'

export function platformAuthoring(origin: string): Authoring {
  const client = (token: string) =>
    createManifestClient({
      origin,
      token,
      fetch: (request) =>
        globalThis.fetch(request, { signal: AbortSignal.timeout(PLATFORM_TIMEOUT_MS) }),
    })

  async function tree(token: string, projectId: string) {
    try {
      const read = unwrap(
        await client(token).GET('/v1/projects/{projectId}/tree', {
          params: { path: { projectId } },
        }),
        'getTree',
      )
      return { commitSha: read.commitSha, paths: read.entries.map((entry) => entry.path) }
    } catch (error) {
      throw refusalFrom(error)
    }
  }

  const source = platformSource(origin)
  /** A dry run, then the commit (F3 Task 4's `source.commit`): one change, `docs/plan.md`. */
  const attempt = async (
    token: string,
    projectId: string,
    baseCommit: string,
    markdown: string,
    sent: Sent[],
  ) => {
    const { commitSha } = await source.commit(
      token,
      projectId,
      {
        baseCommit,
        message: MESSAGE,
        changes: [{ op: 'write', path: PLAN, content: markdown }],
      },
      sent,
    )
    return { commitSha }
  }

  return {
    tree,
    async commitPlan(token, projectId, baseCommit, markdown) {
      const sent: Sent[] = []
      try {
        return { ...(await attempt(token, projectId, baseCommit, markdown, sent)), sent }
      } catch (error) {
        const refusal = refusalFrom(error)
        if (refusal.code !== 'SOURCE_CONFLICT') throw refusal
      }
      // Someone moved main: read it again, and try once more from where it is now.
      const { commitSha } = await tree(token, projectId)
      try {
        return { ...(await attempt(token, projectId, commitSha, markdown, sent)), sent }
      } catch (error) {
        throw refusalFrom(error)
      }
    },
  }
}
