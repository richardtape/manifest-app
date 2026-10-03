import { unwrap } from '@manifest/contract'
import { called, tokenClient } from './refusal.js'

/**
 * A NEW DETAIL ABOUT THE PEOPLE WHO SIGN IN (F6b Task 9, Decision 9), with the conversation's token
 * (S1: M1, measured on 7100): what the newest valid manifest asks (`getSpec`'s
 * `spec.auth.attributes`: the platform's own parse of manifest.yaml, never ours) and what
 * production registered (`getLaunchRecords`' `iamRegistration.registeredAttributes`). The round
 * names what a build refused as `SPEC_ATTRIBUTE_NOT_REGISTERED` from these two, never from the
 * failure's free-text reason.
 */
export interface Details {
  /** The newest valid manifest's attributes, and the commit it was validated at. */
  asked(
    token: string,
    projectId: string,
  ): Promise<{ commitSha: string; attributes: string[] }>
  /** Production's registered attributes; null when nothing is registered there yet. */
  registered(token: string, projectId: string): Promise<string[] | null>
}

export function platformDetails(origin: string): Details {
  return {
    asked: (token, projectId) =>
      called(async () => {
        const read = unwrap(
          await tokenClient(origin, token).GET('/v1/projects/{projectId}/spec', {
            params: { path: { projectId } },
          }),
          'getSpec',
        )
        const auth = (read.spec as { auth?: { attributes?: unknown } }).auth
        const attributes = Array.isArray(auth?.attributes)
          ? auth.attributes.filter((a): a is string => typeof a === 'string')
          : []
        return { commitSha: read.commitSha, attributes }
      }),
    registered: (token, projectId) =>
      called(async () => {
        const records = unwrap(
          await tokenClient(origin, token).GET(
            '/v1/projects/{projectId}/launch-records',
            {
              params: { path: { projectId } },
            },
          ),
          'getLaunchRecords',
        )
        const production = records.iamRegistration
        if (production === null || production.registeredAt === null) return null
        return [...production.registeredAttributes]
      }),
  }
}
