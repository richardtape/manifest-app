import { unwrap } from '@manifest/contract'
import type { KeptApp, KeptMember } from '../store/keeping.js'
import { called, tokenClient } from './refusal.js'

/**
 * THE KEEPING WATCH TOKEN'S READS, AND NOTHING ELSE (F6 Global Constraints; `launch-actions.test.ts`
 * holds it). The token is `project:read` and `output:read`; our server reads the app (its state,
 * when it went live, and production's address, which is the students') and who is on it. Never a
 * cookie (FE-2), and never a PUID kept: an address is what an email needs.
 */
export interface Watching {
  /** `getProject?expand=environments`: production's `url` is the students' address. */
  app(token: string, projectId: string): Promise<KeptApp>
  members(token: string, projectId: string): Promise<KeptMember[]>
}

export function platformWatching(origin: string): Watching {
  return {
    app: (token, projectId) =>
      called(async () => {
        const project = unwrap(
          await tokenClient(origin, token).GET('/v1/projects/{projectId}', {
            params: { path: { projectId }, query: { expand: 'environments' } },
          }),
          'getProject',
        )
        const production = project.environments?.find(
          (each) => each.kind === 'production',
        )
        return {
          projectId: project.id,
          name: project.name,
          slug: project.slug,
          state: project.state,
          launchedAt: project.launchedAt,
          studentsUrl: production?.url ?? null,
        }
      }),
    members: (token, projectId) =>
      called(async () => {
        const members = unwrap(
          await tokenClient(origin, token).GET('/v1/projects/{projectId}/members', {
            params: { path: { projectId } },
          }),
          'listMembers',
        )
        return members.map((member) => ({
          userId: member.userId,
          role: member.role,
          displayName: member.displayName,
          email: member.email,
        }))
      }),
  }
}
