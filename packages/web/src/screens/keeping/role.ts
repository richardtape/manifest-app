import type { Schemas } from '@manifest/contract'
import { useEffect, useState } from 'react'
import type { Platform } from '../../platform/api.js'

export type Role = 'owner' | 'helper' | 'unknown'

/**
 * F6 TASK 8: OWNER OR HELPER (Decision 6), by `listMembers` in the person's session, for the
 * owner's buttons alone: an owner may start the app again and switch it off; a helper (a
 * `collaborator`) sees why not. Anyone not listed, or a read that fails, is `unknown`, and the page
 * shows no owner's button. **The platform still decides**: a helper who reaches an owner's action
 * by hand is refused by it.
 */
export function useRole(
  platform: Platform,
  projectId: string | undefined,
  me: Pick<Schemas['Me'], 'id'> | undefined,
): Role {
  const [role, setRole] = useState<{ for: string; role: Role } | null>(null)
  const meId = me?.id
  useEffect(() => {
    if (projectId === undefined || meId === undefined) return
    let live = true
    platform.listMembers(projectId).then(
      (members) => {
        const mine = members.find((member) => member.userId === meId)?.role
        if (live)
          setRole({
            for: `${projectId} ${meId}`,
            role:
              mine === 'owner' ? 'owner' : mine === 'collaborator' ? 'helper' : 'unknown',
          })
      },
      () => live && setRole({ for: `${projectId} ${meId}`, role: 'unknown' }),
    )
    return () => {
      live = false
    }
  }, [platform, projectId, meId])
  // A role read for another app, or another person, is no answer for this one.
  return role !== null && role.for === `${projectId} ${meId}` ? role.role : 'unknown'
}
