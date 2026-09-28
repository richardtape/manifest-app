import { unwrap } from '@manifest/contract'
import { called, PlatformRefusal, refusalFrom, tokenClient } from './refusal.js'
import { instanceOf, sandboxOf, type Instance } from './releases.js'

/**
 * WHAT IS ON THE DRAFT ADDRESS, AND WHAT IT PRINTED (F3 Task 4). `output` reads the sandbox
 * alone (FE-24; F3 Global Constraints): it takes the project, and refuses an instance its
 * sandbox does not list before anything is read from it. The check is on what we send, never
 * on the answer (M2: the mock answers staging's instance whatever is named).
 */
export interface Incident {
  instanceId: string
  releaseId: string
  exitReason: string
  /** One string: the app's last lines, redacted (M1). */
  logTail: string
  failedCheck: string
  diffSinceHealthy: string
  /** Written for an agent to work from (Decision 8). */
  prompt: string
}

export interface Instances {
  list(token: string, environmentId: string): Promise<(Instance & { serving: boolean })[]>
  /** INSTANCE_OUTPUT_UNAVAILABLE, an instance that never ran or no longer runs, is `unavailable` (M4). */
  output(
    token: string,
    projectId: string,
    instanceId: string,
    lines: number,
  ): Promise<{ lines: string[]; failure: string | null } | { unavailable: true }>
  incidents(token: string, environmentId: string): Promise<Incident[]>
}

export function platformInstances(origin: string): Instances {
  const list = (token: string, environmentId: string) =>
    called(async () =>
      unwrap(
        await tokenClient(origin, token).GET(
          '/v1/environments/{environmentId}/instances',
          {
            params: { path: { environmentId } },
          },
        ),
        'listInstances',
      ).instances.map((instance) => ({
        ...instanceOf(instance),
        serving: instance.serving,
      })),
    )

  return {
    list,
    async output(token, projectId, instanceId, lines) {
      const { environmentId } = await sandboxOf(origin, token, projectId)
      const sandboxed = await list(token, environmentId)
      if (!sandboxed.some((instance) => instance.id === instanceId))
        throw new PlatformRefusal('SANDBOX_ONLY', null)
      try {
        const read = unwrap(
          await tokenClient(origin, token).GET('/v1/instances/{instanceId}/output', {
            params: { path: { instanceId }, query: { lines } },
          }),
          'getInstanceOutput',
        )
        return { lines: read.lines.map((line) => line.text), failure: read.failure }
      } catch (error) {
        const refusal = refusalFrom(error)
        if (refusal.code === 'INSTANCE_OUTPUT_UNAVAILABLE') return { unavailable: true }
        throw refusal
      }
    },
    incidents: (token, environmentId) =>
      called(async () =>
        unwrap(
          await tokenClient(origin, token).GET(
            '/v1/environments/{environmentId}/incidents',
            {
              params: { path: { environmentId } },
            },
          ),
          'listIncidents',
        ).incidents.map((incident) => ({
          instanceId: incident.instanceId,
          releaseId: incident.releaseId,
          exitReason: incident.exitReason,
          logTail: incident.logTail,
          failedCheck: incident.failedCheck,
          diffSinceHealthy: incident.diffSinceHealthy,
          prompt: incident.prompt,
        })),
      ),
  }
}
