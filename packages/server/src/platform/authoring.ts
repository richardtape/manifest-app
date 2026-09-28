import { createManifestClient, idempotencyKey, unwrap } from '@manifest/contract'
import { PLATFORM_TIMEOUT_MS, refusalFrom } from './refusal.js'

/**
 * THE AUTHORING API, with the conversation's token (F2 Decision 9). The plan's first commit
 * is small and deliberate: `docs/plan.md`, and nothing else. It proves F3's path on a
 * harmless file.
 */
/** One `createCommit` as it was sent: kept, so a conversation can say what went (Task 10). */
export type Sent = { dryRun: boolean; baseCommit: string; paths: string[] }

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

  /** A dry run, then the commit: each its own Idempotency-Key, both from `baseCommit`. */
  async function attempt(
    token: string,
    projectId: string,
    baseCommit: string,
    markdown: string,
    sent: Sent[],
  ) {
    const commit = async (dryRun: boolean) => {
      const body = {
        baseCommit,
        message: MESSAGE,
        changes: [{ op: 'write' as const, path: PLAN, content: markdown }],
        ...(dryRun ? { dryRun: true } : {}),
      }
      // Recorded from the body itself, so the record is what went.
      sent.push({
        dryRun,
        baseCommit: body.baseCommit,
        paths: body.changes.map((c) => c.path),
      })
      return unwrap(
        await client(token).POST('/v1/projects/{projectId}/commits', {
          params: {
            path: { projectId },
            header: { 'Idempotency-Key': idempotencyKey() },
          },
          body,
        }),
        'createCommit',
      )
    }
    await commit(true)
    const made = await commit(false)
    return { commitSha: made.commitSha as string }
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
