import { idempotencyKey, unwrap } from '@manifest/contract'
import {
  called,
  DEPLOY_TIMEOUT_MS,
  PLATFORM_TIMEOUT_MS,
  PlatformRefusal,
  tokenClient,
} from './refusal.js'

/**
 * RELEASES AND THE DRAFT ADDRESS (F3 Task 4), with the conversation's token. **The lead never
 * touches staging or production** (F3 Global Constraints): `deploy` takes the project and finds
 * its sandbox itself, so no parameter exists through which another environment could be named.
 */
export type Instance = {
  id: string
  releaseId: string
  state:
    | 'pending'
    | 'building'
    | 'provisioning'
    | 'starting'
    | 'healthy'
    | 'failed'
    | 'hibernated'
    | 'waking'
    | 'destroying'
    | 'gone'
}

export interface Sandbox {
  environmentId: string
  hostname: string
  url: string
}

export interface Releases {
  /** A summary longer than the platform keeps (500) is cut. */
  create(
    token: string,
    projectId: string,
    buildId: string,
    summary: string,
  ): Promise<{ id: string }>
  sandbox(token: string, projectId: string): Promise<Sandbox>
  /** To the sandbox, always. A deploy that never became healthy is a `200` whose state is `failed`. */
  deploy(token: string, projectId: string, releaseId: string): Promise<Instance>
}

export interface Deadlines {
  callMs: number
  deployMs: number
}

export const instanceOf = (instance: Instance): Instance => ({
  id: instance.id,
  releaseId: instance.releaseId,
  state: instance.state,
})

/** The project's sandbox, by its kind in `listEnvironments`: never by its place in the list. */
export async function sandboxOf(
  origin: string,
  token: string,
  projectId: string,
  callMs = PLATFORM_TIMEOUT_MS,
): Promise<Sandbox> {
  return called(async () => {
    const environments = unwrap(
      await tokenClient(origin, token, callMs).GET(
        '/v1/projects/{projectId}/environments',
        {
          params: { path: { projectId } },
        },
      ),
      'listEnvironments',
    )
    const sandbox = environments.find((environment) => environment.kind === 'sandbox')
    if (sandbox === undefined) throw new PlatformRefusal('SANDBOX_MISSING', null)
    return { environmentId: sandbox.id, hostname: sandbox.hostname, url: sandbox.url }
  })
}

export function platformReleases(
  origin: string,
  deadlines: Deadlines = { callMs: PLATFORM_TIMEOUT_MS, deployMs: DEPLOY_TIMEOUT_MS },
): Releases {
  return {
    create: (token, projectId, buildId, summary) =>
      called(async () => {
        const made = unwrap(
          await tokenClient(origin, token, deadlines.callMs).POST(
            '/v1/projects/{projectId}/releases',
            {
              params: {
                path: { projectId },
                header: { 'Idempotency-Key': idempotencyKey() },
              },
              body: { buildId, summary: summary.slice(0, 500) },
            },
          ),
          'createRelease',
        )
        return { id: made.id }
      }),
    sandbox: (token, projectId) => sandboxOf(origin, token, projectId, deadlines.callMs),
    async deploy(token, projectId, releaseId) {
      const { environmentId } = await sandboxOf(
        origin,
        token,
        projectId,
        deadlines.callMs,
      )
      return called(async () =>
        instanceOf(
          unwrap(
            await tokenClient(origin, token, deadlines.deployMs).POST(
              '/v1/environments/{environmentId}/deploy',
              {
                params: {
                  path: { environmentId },
                  header: { 'Idempotency-Key': idempotencyKey() },
                },
                body: { releaseId },
              },
            ),
            'deploy',
          ),
        ),
      )
    },
  }
}
