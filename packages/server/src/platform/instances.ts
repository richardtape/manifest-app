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
  id: string
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

/** The addresses a fix answers: the draft is our own round's to fix, never a fix's. */
export type FixEnvironment = 'staging' | 'production'

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
  /**
   * F4 Decision 9: the incident a fix names, by its id, on the address where it happened: the
   * trying-out address's, or the live address's (F5 Decision 13); `undefined` when it is not
   * there. A confidential app's is refused to our token while the capable model builds it (`403
   * INCIDENT_LOG_CONFIDENTIAL`), on either: `confidential`, and never read another way.
   */
  incident(
    token: string,
    projectId: string,
    environment: FixEnvironment,
    incidentId: string,
  ): Promise<Incident | 'confidential' | undefined>
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

  const incidents = (token: string, environmentId: string) =>
    called(async () =>
      unwrap(
        await tokenClient(origin, token).GET(
          '/v1/environments/{environmentId}/incidents',
          {
            params: { path: { environmentId } },
          },
        ),
        'listIncidents',
      ).incidents.map((incident): Incident => ({
        id: incident.id,
        instanceId: incident.instanceId,
        releaseId: incident.releaseId,
        exitReason: incident.exitReason,
        logTail: incident.logTail,
        failedCheck: incident.failedCheck,
        diffSinceHealthy: incident.diffSinceHealthy,
        prompt: incident.prompt,
      })),
    )

  return {
    list,
    incidents,
    async incident(token, projectId, environment, incidentId) {
      const environments = await called(async () =>
        unwrap(
          await tokenClient(origin, token).GET('/v1/projects/{projectId}/environments', {
            params: { path: { projectId } },
          }),
          'listEnvironments',
        ),
      )
      // By its kind, never its place in the list.
      const where = environments.find((e) => e.kind === environment)
      if (where === undefined) return undefined
      try {
        return (await incidents(token, where.id)).find((i) => i.id === incidentId)
      } catch (error) {
        if (
          error instanceof PlatformRefusal &&
          error.code === 'INCIDENT_LOG_CONFIDENTIAL'
        )
          return 'confidential'
        throw error
      }
    },
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
  }
}
