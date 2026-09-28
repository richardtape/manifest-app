import { unwrap } from '@manifest/contract'
import { called, tokenClient } from './refusal.js'

/**
 * THE INSTRUCTOR, AS A MEMBER OF THE PROJECT (F3 Decision 13): their PUID and email for the
 * app's `config/staff.json`, read with the conversation's token, never from the session
 * (FE-2). M1: the member's `userId` is the person's id.
 */
export interface Members {
  instructor(
    token: string,
    projectId: string,
    personId: string,
  ): Promise<{ puid: string; email: string } | undefined>
}

export function platformMembers(origin: string): Members {
  return {
    instructor: (token, projectId, personId) =>
      called(async () => {
        const members = unwrap(
          await tokenClient(origin, token).GET('/v1/projects/{projectId}/members', {
            params: { path: { projectId } },
          }),
          'listMembers',
        )
        const found = members.find((member) => member.userId === personId)
        return found === undefined ? undefined : { puid: found.puid, email: found.email }
      }),
  }
}
