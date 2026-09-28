import { createManifestClient, idempotencyKey, unwrap } from '@manifest/contract'
import { PLATFORM_TIMEOUT_MS, refusalFrom } from './refusal.js'

/**
 * THE AUTHORING API, with the conversation's token (F2 Decision 9). The plan's first commit
 * is small and deliberate: `docs/plan.md`, and nothing else. It proves F3's path on a
 * harmless file.
 */
export interface Authoring {
  tree(token: string, projectId: string): Promise<{ commitSha: string; paths: string[] }>
  commitPlan(
    token: string,
    projectId: string,
    baseCommit: string,
    markdown: string,
  ): Promise<{ commitSha: string }>
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

  /** A dry run, then the commit: each its own Idempotency-Key, both from `baseCommit`. */
  async function attempt(
    token: string,
    projectId: string,
    baseCommit: string,
    markdown: string,
  ) {
    const commit = async (dryRun: boolean) =>
      unwrap(
        await client(token).POST('/v1/projects/{projectId}/commits', {
          params: {
            path: { projectId },
            header: { 'Idempotency-Key': idempotencyKey() },
          },
          body: {
            baseCommit,
            message: MESSAGE,
            changes: [{ op: 'write', path: PLAN, content: markdown }],
            ...(dryRun ? { dryRun: true } : {}),
          },
        }),
        'createCommit',
      )
    await commit(true)
    const made = await commit(false)
    return { commitSha: made.commitSha as string }
  }

  return {
    tree,
    async commitPlan(token, projectId, baseCommit, markdown) {
      try {
        return await attempt(token, projectId, baseCommit, markdown)
      } catch (error) {
        const refusal = refusalFrom(error)
        if (refusal.code !== 'SOURCE_CONFLICT') throw refusal
      }
      // Someone moved main: read it again, and try once more from where it is now.
      const { commitSha } = await tree(token, projectId)
      try {
        return await attempt(token, projectId, commitSha, markdown)
      } catch (error) {
        throw refusalFrom(error)
      }
    },
  }
}
