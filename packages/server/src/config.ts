/**
 * WHERE OUR SERVER RUNS AND WHO IT ASKS. Two modes, both on the laptop:
 * - `mock`: manifest-mock on 7102 is the platform, and we proxy `/v1` and `/auth` to it,
 *   because the browser reaches only us (`pnpm dev:mock`, at http://127.0.0.1:7105).
 * - `edge`: the platform's edge serves `https://app.manifest.internal`, sending `/v1` and
 *   `/auth` to the control plane and everything else to us (`pnpm dev`).
 */
export interface Config {
  mode: 'mock' | 'edge'
  port: 7105
  /**
   * Where `whoIs` asks `getMe`. Edge mode's answer is not yet measured: the control plane
   * keeps a session per origin, so whether 7100 directly serves a session minted on
   * `app.manifest.internal` is Task 8 Step 4's first measurement.
   */
  platformOrigin: string
}

const PLATFORM = { mock: 'http://127.0.0.1:7102', edge: 'http://127.0.0.1:7100' } as const

export function readConfig(env: NodeJS.ProcessEnv): Config {
  const mode = env['MANIFEST_APP_MODE'] ?? 'edge'
  if (mode !== 'mock' && mode !== 'edge')
    throw new Error(`MANIFEST_APP_MODE is 'mock' or 'edge', never '${mode}'`)
  return { mode, port: 7105, platformOrigin: PLATFORM[mode] }
}
