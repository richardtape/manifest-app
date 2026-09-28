import { idempotencyKey, unwrap } from '@manifest/contract'
import { called, tokenClient } from './refusal.js'

/**
 * BUILDS (F3 Task 4), with the conversation's token. `startBuild` answers `202` with the
 * build as it is: the answer that arrived is not the outcome. The stream, or `get`, says that.
 */
export type Build = {
  id: string
  commitSha: string
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  error: string | null
}

export interface Builds {
  /** ALWAYS names the commit: with none, the platform builds the last RECORDED validation's. */
  start(token: string, projectId: string, commitSha: string): Promise<Build>
  get(token: string, buildId: string): Promise<Build>
  /** The log's last lines, as text. A failed build's telling lines are there, not in `error` (M4). */
  log(token: string, buildId: string, tail: number): Promise<string[]>
}

const buildOf = (build: Build): Build => ({
  id: build.id,
  commitSha: build.commitSha,
  status: build.status,
  error: build.error,
})

export function platformBuilds(origin: string): Builds {
  return {
    start: (token, projectId, commitSha) =>
      called(async () =>
        buildOf(
          unwrap(
            await tokenClient(origin, token).POST('/v1/projects/{projectId}/builds', {
              params: {
                path: { projectId },
                header: { 'Idempotency-Key': idempotencyKey() },
              },
              body: { commitSha },
            }),
            'startBuild',
          ),
        ),
      ),
    get: (token, buildId) =>
      called(async () =>
        buildOf(
          unwrap(
            await tokenClient(origin, token).GET('/v1/builds/{buildId}', {
              params: { path: { buildId } },
            }),
            'getBuild',
          ),
        ),
      ),
    log: (token, buildId, tail) =>
      called(async () =>
        unwrap(
          await tokenClient(origin, token).GET('/v1/builds/{buildId}/logs', {
            params: { path: { buildId }, query: { tail } },
          }),
          'getBuildLog',
        ).lines.map((line) => line.text),
      ),
  }
}
