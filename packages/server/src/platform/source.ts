import { idempotencyKey, ManifestApiError, unwrap } from '@manifest/contract'
import { called, CommitRefused, refusalFrom, tokenClient } from './refusal.js'

/**
 * THE APP'S FILES, AND COMMITS (F3 Task 4), with the conversation's token: `getTree`,
 * `getFile` and `createCommit`, as F3 M1 recorded them. Every write is a commit, dry-run first
 * (Decision 2).
 */
/** A commit writes at most 500 of these, each at most 1 MiB (M1). */
export type Change =
  { op: 'write'; path: string; content: string } | { op: 'delete'; path: string }

/** One `createCommit` as it was sent: kept, so a conversation can say what went (F2 Task 10). */
export type Sent = { dryRun: boolean; baseCommit: string; paths: string[] }

export type Unreadable = 'too-large' | 'not-text' | 'not-a-file' | 'not-found'

export interface Committed {
  commitSha: string
  changed: { path: string; status: 'added' | 'modified' | 'deleted' }[]
  /** `spec.warnings`: what the validation says without refusing. Never a stop (M1). */
  warnings: { code: string; path: string; hint: string | null }[]
  /**
   * F6b Task 8: the sensitive fields this commit changes (`spec.sensitiveDiff.fields`, measured
   * against the newest valid manifest: one commit's delta, S1: M2), in the platform's order.
   */
  sensitive: string[]
}

export interface Source {
  /** The files at `main`, and the commit read: the next change's base. */
  tree(
    token: string,
    projectId: string,
  ): Promise<{
    commitSha: string
    paths: { path: string; size: number; binary: boolean }[]
    truncated: boolean
  }>
  /** A file the lead cannot read is a reason, never a crash. */
  file(
    token: string,
    projectId: string,
    path: string,
    ref: string,
  ): Promise<{ content: string } | { unreadable: Unreadable }>
  /**
   * The dry run, then the commit, each its own Idempotency-Key. SPEC_INVALID is a
   * CommitRefused; SOURCE_CONFLICT and every other refusal are thrown by their code. `sent`
   * gains each call as it goes, a refused one included.
   */
  commit(
    token: string,
    projectId: string,
    body: { baseCommit: string; message: string; changes: Change[] },
    sent?: Sent[],
  ): Promise<Committed>
}

const UNREADABLE: Record<string, Unreadable> = {
  SOURCE_FILE_TOO_LARGE: 'too-large',
  SOURCE_FILE_NOT_TEXT: 'not-text',
  SOURCE_PATH_NOT_A_FILE: 'not-a-file',
  SOURCE_PATH_NOT_FOUND: 'not-found',
}

/** SPEC_INVALID's details, for the lead, and never their message (FE-29). */
function commitRefusal(error: unknown): Error {
  if (error instanceof ManifestApiError && error.code === 'SPEC_INVALID') {
    const details = (error.envelope?.error.details ?? []).map((detail) => ({
      path: detail.path,
      code: detail.code,
      hint: detail.hint ?? null,
    }))
    return new CommitRefused(error.code, error.status, details, error.requestId)
  }
  return refusalFrom(error)
}

export function platformSource(origin: string): Source {
  return {
    tree: (token, projectId) =>
      called(async () => {
        const read = unwrap(
          await tokenClient(origin, token).GET('/v1/projects/{projectId}/tree', {
            params: { path: { projectId } },
          }),
          'getTree',
        )
        return {
          commitSha: read.commitSha,
          paths: read.entries
            .filter((entry) => entry.type === 'file')
            .map((entry) => ({
              path: entry.path,
              size: entry.size ?? 0,
              binary: entry.binary ?? false,
            })),
          truncated: read.truncated,
        }
      }),

    async file(token, projectId, path, ref) {
      try {
        const read = unwrap(
          await tokenClient(origin, token).GET('/v1/projects/{projectId}/file', {
            params: { path: { projectId }, query: { path, ref } },
          }),
          'getFile',
        )
        return { content: read.content }
      } catch (error) {
        const refusal = refusalFrom(error)
        const unreadable = UNREADABLE[refusal.code]
        if (unreadable === undefined) throw refusal
        return { unreadable }
      }
    },

    async commit(token, projectId, { baseCommit, message, changes }, sent = []) {
      const once = async (dryRun: boolean) => {
        const body = { baseCommit, message, changes, ...(dryRun ? { dryRun: true } : {}) }
        // Recorded from the body itself, so the record is what went.
        sent.push({
          dryRun,
          baseCommit: body.baseCommit,
          paths: changes.map((c) => c.path),
        })
        try {
          return unwrap(
            await tokenClient(origin, token).POST('/v1/projects/{projectId}/commits', {
              params: {
                path: { projectId },
                header: { 'Idempotency-Key': idempotencyKey() },
              },
              body,
            }),
            'createCommit',
          )
        } catch (error) {
          throw commitRefusal(error)
        }
      }
      await once(true)
      const made = await once(false)
      return {
        commitSha: made.commitSha as string,
        changed: made.changes,
        warnings: (made.spec?.warnings ?? []).map((warning) => ({
          code: warning.code,
          path: warning.path,
          hint: warning.hint ?? null,
        })),
        sensitive: [...(made.spec?.sensitiveDiff?.fields ?? [])],
      }
    },
  }
}
