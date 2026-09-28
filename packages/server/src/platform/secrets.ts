import { idempotencyKey, unwrap } from '@manifest/contract'
import { called, PlatformRefusal, tokenClient } from './refusal.js'
import { sandboxOf } from './releases.js'

/**
 * A SECRET'S VALUE, IN THE SANDBOX ALONE (F3 Task 8's secret answer), with the conversation's
 * token and its `secret:write`. The value goes to the platform and nowhere else: never a row,
 * never an error. What the platform would refuse is refused here first (M1): a name is
 * upper-case letters, digits and underscores, and a value 6 characters to 16 KiB. It takes
 * effect at the next deploy.
 */
export interface Secrets {
  setInSandbox(
    token: string,
    projectId: string,
    name: string,
    value: string,
  ): Promise<void>
}

const NAME = /^[A-Z][A-Z0-9_]{0,127}$/

export function platformSecrets(origin: string): Secrets {
  return {
    async setInSandbox(token, projectId, name, value) {
      const bytes = Buffer.byteLength(value, 'utf8')
      if (!NAME.test(name) || value.length < 6 || bytes > 16 * 1024)
        throw new PlatformRefusal('SECRET_INVALID', null)
      const { environmentId } = await sandboxOf(origin, token, projectId)
      await called(async () =>
        unwrap(
          await tokenClient(origin, token).PUT(
            '/v1/environments/{environmentId}/secrets/{name}',
            {
              params: {
                path: { environmentId, name },
                header: { 'Idempotency-Key': idempotencyKey() },
              },
              body: { value },
            },
          ),
          'setAppSecret',
        ),
      )
    },
  }
}
