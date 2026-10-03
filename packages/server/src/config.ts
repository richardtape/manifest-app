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
   * Where the browser reaches us, and so the one `Origin` our API accepts a change from
   * (F2 Decision 3): 7105 itself in mock mode, the app's own origin through the edge.
   */
  origin: string
  /**
   * Where every call our server makes WITH A TOKEN goes (the conversation's, the watch's):
   * the control plane on 7100 in edge mode, the mock on 7102. Never the person's session:
   * that is `sessionOrigin`'s.
   */
  platformOrigin: string
  /**
   * WHERE `whoIs` REPLAYS THE PERSON'S SESSION to `getMe` (FE-2): an origin Manifest serves,
   * whose scheme names the cookie (the contract's `sessionCookieFor`). Edge mode asks through
   * the edge at our own origin, `https://app.manifest.internal`, where the control plane reads
   * `__Host-manifest_session` and the client sends it (FE-28, the platform's `7b85326` and
   * `d4291dd`): 7100 itself would read `__Host-` while the client sent the plain name. Our
   * server trusts the platform's CA by `--use-system-ca` (`pnpm dev`). Mock mode asks the mock.
   */
  sessionOrigin: string
  /**
   * The model gateway, the one base URL our server calls with an intake or agent session's
   * key (F2 Task 6). The browser hands over the key with the `baseUrl` the platform answered,
   * and any other is refused: our server never calls a URL a browser chose. Both modes: the
   * platform's `MANIFEST_AGENT_LLM_URL` default, and the mock's example.
   */
  modelGateway: string
  /**
   * THE MODEL THE PLAN IS WRITTEN ON (F2 Task 9), and only if the agent session offers it:
   * never another. `default-chat` on the laptop; `MANIFEST_APP_PLAN_MODEL` names another,
   * such as the capable model once the platform offers it.
   */
  planModel: string
  /**
   * F6 D5: WHERE EMAIL GOES, over SMTP (nodemailer). Both modes send to Mailpit on the laptop
   * (no authentication, no TLS), so nothing leaves it; `MANIFEST_APP_SMTP_URL` names another.
   */
  smtpUrl: string
  /** Who an email is from: `MANIFEST_APP_MAIL_FROM`, else Manifest at the app's own host. */
  mailFrom: string
}

const PLATFORM = { mock: 'http://127.0.0.1:7102', edge: 'http://127.0.0.1:7100' } as const
const ORIGIN = {
  mock: 'http://127.0.0.1:7105',
  edge: 'https://app.manifest.internal',
} as const
const SESSION = {
  mock: 'http://127.0.0.1:7102',
  edge: 'https://app.manifest.internal',
} as const

export function readConfig(env: NodeJS.ProcessEnv): Config {
  const mode = env['MANIFEST_APP_MODE'] ?? 'edge'
  if (mode !== 'mock' && mode !== 'edge')
    throw new Error(`MANIFEST_APP_MODE is 'mock' or 'edge', never '${mode}'`)
  return {
    mode,
    port: 7105,
    origin: ORIGIN[mode],
    platformOrigin: PLATFORM[mode],
    sessionOrigin: SESSION[mode],
    modelGateway: 'http://127.0.0.1:7106/v1',
    planModel: env['MANIFEST_APP_PLAN_MODEL'] ?? 'default-chat',
    smtpUrl: env['MANIFEST_APP_SMTP_URL'] ?? 'smtp://127.0.0.1:7111',
    mailFrom:
      env['MANIFEST_APP_MAIL_FROM'] ?? 'Manifest <manifest@app.manifest.internal>',
  }
}
