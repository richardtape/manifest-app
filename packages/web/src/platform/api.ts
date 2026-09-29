import {
  createManifestClient,
  subscribe,
  unwrap,
  type EventFrame,
  type Schemas,
} from '@manifest/contract'

/**
 * THE ONE PLACE THE FRONT-END CALLS THE PLATFORM (Decision 3; the console's api.ts is the
 * pattern). Screens call these functions and never hold the client. `origin` is a
 * parameter, so the browser passes its own and a test passes the mock's. A browser sends
 * its own cookie and Origin, and `session` is for a Node caller only.
 *
 * `unwrap` throws a `ManifestApiError` carrying D23.7's envelope. `refusalOf` is the one
 * thing that reads it.
 */
export interface Platform {
  getMe(): Promise<Schemas['Me']>
  listProjects(): Promise<Schemas['ProjectList']>
  /**
   * Always `?expand=environments` (D23.1's one expansion): a card needs its three, and each
   * one's `instance`, *"the instance the hostname reaches"*. No `listInstances` in F1: its
   * value is the last attempt (FE-13), which F1 does not show (FE-27).
   */
  getProject(projectId: string): Promise<Schemas['Project']>
  getRelease(releaseId: string): Promise<Schemas['Release']>
  /**
   * THE PREVIEW (F4 Task 5, Decision 2), in the person's session: an app's three addresses, each
   * with `instance`, *"the instance the hostname reaches"*. A bare array (F4 M1).
   */
  listEnvironments(projectId: string): Promise<Schemas['EnvironmentList']>
  /**
   * An address's instances, each marked `serving`, **"the one seen most recently first"**: never
   * the newest first (F4 M3), so the last attempt is never read from its order (FE-38).
   */
  listInstances(environmentId: string): Promise<Schemas['InstanceList']>
  /** Why an attempt failed, newest first: its time is when it did not start. */
  listIncidents(environmentId: string): Promise<Schemas['IncidentList']>
  /**
   * MOMENT 3 (FE-1, as it landed): a model for describing an app, in the person's own
   * session (a token is refused). **A new `Idempotency-Key` for every attempt**: the key is in
   * the first answer and nowhere else, and the same key again answers `409
   * INTAKE_SESSION_ALREADY_STARTED` without it. So each *Try again* starts a new session and
   * spends one of the person's few a day, even when the one before did land (the final review).
   */
  startIntakeSession(idempotencyKey: string): Promise<Schemas['IntakeSessionStarted']>
  /** Only the person can end it (F2 sitting 1): our server cannot, and never asks. */
  endIntakeSession(
    intakeSessionId: string,
    idempotencyKey: string,
  ): Promise<Schemas['IntakeSession']>
  /** Moment 4: is this address free? Always 200; `reasons` carry the platform's own words. */
  checkSlug(slug: string): Promise<Schemas['SlugCheck']>
  /** Moment 4: the blueprints, for the blueprint agent to choose from (D3). */
  listBlueprints(): Promise<Schemas['BlueprintList']>
  /**
   * MAKE IT (F2 Task 8), in the person's session: a delegated token cannot make a project
   * (D24). One `Idempotency-Key` per press, reused on its retry, so a create that did land is
   * answered and never repeated.
   */
  createProject(
    body: Schemas['CreateProjectRequest'],
    idempotencyKey: string,
  ): Promise<Schemas['CreatedProject']>
  /**
   * The conversation's token, for our server (D4). Its secret is in this answer and nowhere
   * else: a retry with the same key is `TOKEN_ALREADY_MINTED`, so each attempt takes its own.
   */
  mintToken(
    projectId: string,
    body: Schemas['MintTokenRequest'],
    idempotencyKey: string,
  ): Promise<Schemas['MintedToken']>
  /**
   * The project's event stream, for the seconds *Making it* shows (moment 4): each event of
   * its replay, then `ready`. F3 owns the stream after. A browser subscribes with its cookie.
   */
  watchProject(
    projectId: string,
    onEvent: (event: EventFrame) => void,
  ): { ready: Promise<void>; close(): void }
}

/** A read that has not answered by now is unreachable: never a page left blank (review #3). */
export const READ_TIMEOUT_MS = 15_000

export function createPlatform(options: {
  origin: string
  session?: string
  timeoutMs?: number
}): Platform {
  const timeoutMs = options.timeoutMs ?? READ_TIMEOUT_MS
  const client = createManifestClient({
    origin: options.origin,
    ...(options.session === undefined ? {} : { session: options.session }),
    // Every call has a deadline. A platform that takes the connection and never answers
    // (the edge has no response timeout of its own) becomes a TimeoutError, which
    // refusalOf reads as unreachable.
    fetch: (request) =>
      globalThis.fetch(request, { signal: AbortSignal.timeout(timeoutMs) }),
  })
  return {
    async getMe() {
      return unwrap(await client.GET('/v1/me'), 'getMe')
    },
    async listProjects() {
      return unwrap(await client.GET('/v1/projects'), 'listProjects')
    },
    async getProject(projectId) {
      return unwrap(
        await client.GET('/v1/projects/{projectId}', {
          params: { path: { projectId }, query: { expand: 'environments' } },
        }),
        'getProject',
      )
    },
    async getRelease(releaseId) {
      return unwrap(
        await client.GET('/v1/releases/{releaseId}', { params: { path: { releaseId } } }),
        'getRelease',
      )
    },
    async listEnvironments(projectId) {
      return unwrap(
        await client.GET('/v1/projects/{projectId}/environments', {
          params: { path: { projectId } },
        }),
        'listEnvironments',
      )
    },
    async listInstances(environmentId) {
      return unwrap(
        await client.GET('/v1/environments/{environmentId}/instances', {
          params: { path: { environmentId } },
        }),
        'listInstances',
      )
    },
    async listIncidents(environmentId) {
      return unwrap(
        await client.GET('/v1/environments/{environmentId}/incidents', {
          params: { path: { environmentId } },
        }),
        'listIncidents',
      )
    },
    async startIntakeSession(idempotencyKey) {
      return unwrap(
        await client.POST('/v1/intake-sessions', {
          params: { header: { 'Idempotency-Key': idempotencyKey } },
        }),
        'startIntakeSession',
      )
    },
    async endIntakeSession(intakeSessionId, idempotencyKey) {
      return unwrap(
        await client.DELETE('/v1/intake-sessions/{intakeSessionId}', {
          params: {
            path: { intakeSessionId },
            header: { 'Idempotency-Key': idempotencyKey },
          },
        }),
        'endIntakeSession',
      )
    },
    async checkSlug(slug) {
      return unwrap(
        await client.GET('/v1/slugs/{slug}', { params: { path: { slug } } }),
        'checkSlug',
      )
    },
    async listBlueprints() {
      return unwrap(await client.GET('/v1/blueprints'), 'listBlueprints')
    },
    async createProject(body, idempotencyKey) {
      return unwrap(
        await client.POST('/v1/projects', {
          params: { header: { 'Idempotency-Key': idempotencyKey } },
          body,
        }),
        'createProject',
      )
    },
    async mintToken(projectId, body, idempotencyKey) {
      return unwrap(
        await client.POST('/v1/projects/{projectId}/tokens', {
          params: {
            path: { projectId },
            header: { 'Idempotency-Key': idempotencyKey },
          },
          body,
        }),
        'mintToken',
      )
    },
    watchProject(projectId, onEvent) {
      const subscription = subscribe({
        origin: options.origin,
        projectId,
        ...(options.session === undefined ? {} : { session: options.session }),
        onFrame: (frame) => {
          if (frame.kind === 'event') onEvent(frame)
        },
      })
      return { ready: subscription.ready, close: () => subscription.close() }
    },
  }
}
