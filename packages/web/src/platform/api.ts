import {
  createManifestClient,
  ManifestApiError,
  subscribe,
  unwrap,
  type EventFrame,
  type Schemas,
} from '@manifest/contract'
import { noticeRefusal } from '../not-open.js'

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
  /**
   * TRYING-OUT (F4 Task 10, Decision 11), in the person's session, so the record says who chose
   * this version: the release, to the environment named. It answers once the new instance serves
   * or has failed (a failed one is a `200` whose state is `failed`), up to about 90 s: its deadline
   * is `DEPLOY_TIMEOUT_MS`. One `Idempotency-Key` per press. Staging asks no step-up (F4 M3).
   */
  deploy(
    environmentId: string,
    releaseId: string,
    idempotencyKey: string,
  ): Promise<Schemas['Instance']>
  /**
   * GOING LIVE (F5 Tasks 5 and 6), in the person's session: §13's checklist, computed from what
   * exists, from the day the project is made. Every item, met or not, and the candidate: the
   * release serving staging, null when nothing does.
   */
  getLaunchReadiness(projectId: string): Promise<Schemas['LaunchReadiness']>
  /**
   * THE DRY RUN (F5 Task 7, moment 12), in the person's session: the candidate put up on the live
   * setup with nobody watching, one sign-in tried, and taken down again. A run that signed nobody in
   * is a `200` with `passed: false`, a measurement and not an error. It asks a second sign-in
   * (`STEP_UP_REQUIRED`: Spec action 8 (b)). One `Idempotency-Key` per press; its deadline is
   * `REHEARSAL_TIMEOUT_MS`.
   */
  runRehearsal(projectId: string, idempotencyKey: string): Promise<Schemas['Rehearsal']>
  /**
   * The two records a first launch waits on, as an administrator keeps them: UBC's identity
   * team's registration and the Privacy Office's assessment. Either may be null, which is a
   * state, not an error (Decision 5).
   */
  getLaunchRecords(projectId: string): Promise<Schemas['LaunchRecords']>
  /** One address, and the instance its hostname reaches (production's, for going live). */
  getEnvironment(environmentId: string): Promise<Schemas['Environment']>
  /**
   * THE SIGN-OFF (F5 Task 8, moment 13), in the person's session: the newest decision an
   * administrator made on a release, approved or rejected, with who decided and when. **Nobody
   * has decided yet is `null`** (the platform's `404`), a state and not an error; any other
   * refusal is thrown.
   */
  getApproval(releaseId: string): Promise<Schemas['Approval'] | null>
  /**
   * ASKING FOR THE SIGN-OFF (F5b Task 4; FE-25 as it landed, `a1d4baa`), in the person's session:
   * asks for the version on trying-out, with an optional note for the administrators alone. A
   * second ask answers the first. One `Idempotency-Key` per press. Refused `409
   * RELEASE_NOT_STAGED` (another version on trying-out now), `APPROVAL_NOT_NEEDED`, or
   * `RELEASE_REJECTED`.
   */
  requestApproval(
    releaseId: string,
    body: Schemas['RequestApprovalRequest'],
    idempotencyKey: string,
  ): Promise<Schemas['ApprovalRequest']>
  /** Each secret's name, `declared` and `set`, as fields: never a value (F4 S1: M1). */
  listAppSecrets(environmentId: string): Promise<Schemas['AppSecretList']>
  /**
   * A secret's value, from the browser to the platform and nowhere else (Decision 15). Nothing is
   * answered back that the page needs.
   */
  setAppSecret(
    environmentId: string,
    name: string,
    value: string,
    idempotencyKey: string,
  ): Promise<void>
  /**
   * F6 TASK 8: WHO IS ON THE APP, in the person's session: each member and their role, read for
   * the owner's buttons alone (Decision 6). The platform still decides every action.
   */
  listMembers(projectId: string): Promise<Schemas['MemberList']>
  /**
   * A token the person minted, revoked (only its minter may: anyone else's is `404`). It answers
   * the token (S1: M8). One `Idempotency-Key` per call.
   */
  revokeToken(tokenId: string, idempotencyKey: string): Promise<Schemas['Token']>
  /**
   * F6b TASK 5: PEOPLE (moment 18), in the person's session, an owner's alone (`members:manage`),
   * each asking a second sign-in within ten minutes (`STEP_UP_REQUIRED`). `addMember` adds someone,
   * or changes the role of someone already on it (no other operation does); `removeMember` takes
   * them off, and the platform revokes their tokens and ends their sessions (FE-11). One
   * `Idempotency-Key` per press.
   */
  addMember(
    projectId: string,
    body: Schemas['AddMemberRequest'],
    idempotencyKey: string,
  ): Promise<Schemas['Member']>
  removeMember(
    projectId: string,
    userId: string,
    idempotencyKey: string,
  ): Promise<Schemas['MemberList']>
  /** Every token on the app, every minter's, revoked and expired included (session only). */
  listTokens(projectId: string): Promise<Schemas['TokenList']>
  /** Their agents' questions (D24's pending actions): a person sees every one on the app. */
  listPendingActions(projectId: string): Promise<Schemas['PendingActionList']>
  /** *[Yes, once]*: it asks a second sign-in. One `Idempotency-Key` per press. */
  confirmPendingAction(
    pendingActionId: string,
    idempotencyKey: string,
  ): Promise<Schemas['PendingAction']>
  /** *[No]*, with a reason (the platform's 1–500 characters, required); never a second sign-in. */
  rejectPendingAction(
    pendingActionId: string,
    reason: string,
    idempotencyKey: string,
  ): Promise<Schemas['PendingAction']>
  /**
   * SWITCH IT OFF (F6, moment 20), in the person's session: its addresses say so, nothing runs,
   * and everything is kept. It may ask a second sign-in (S1: M4). One `Idempotency-Key` per press.
   */
  archiveProject(projectId: string, idempotencyKey: string): Promise<Schemas['Project']>
  /** Switch it back on: no second sign-in (S1: M4). Its tokens stay revoked. */
  restoreProject(projectId: string, idempotencyKey: string): Promise<Schemas['Project']>
  /**
   * DELETE A DRAFT THAT NEVER WENT LIVE (D7), in the person's session, with a second sign-in. It
   * answers what remains of it (S1: M8); a launched app is `409 PROJECT_LAUNCHED_NOT_DELETABLE`.
   */
  deleteProject(
    projectId: string,
    idempotencyKey: string,
  ): Promise<Schemas['DeletedProject']>
}

/** A read that has not answered by now is unreachable: never a page left blank (review #3). */
export const READ_TIMEOUT_MS = 15_000
/** A deploy answers once it has proved itself, up to about 90 s (F3 Decision 17's reason). */
export const DEPLOY_TIMEOUT_MS = 120_000
/**
 * A dry run answers once it has signed someone in and taken the app down again: the platform says
 * up to ~90 s (it took 7 s as sitting 1 measured it); ours is 150 s (Decision 8).
 */
export const REHEARSAL_TIMEOUT_MS = 150_000
/**
 * A create answers once its repository is seeded: on real GitHub, 8–11 s, and up to ~30 s more
 * while GitHub refuses a repository it made seconds ago (FE-41's fix retries it). The platform
 * says never to time one out under ~60 s.
 */
export const CREATE_TIMEOUT_MS = 90_000

export function createPlatform(options: {
  origin: string
  session?: string
  timeoutMs?: number
}): Platform {
  const timeoutMs = options.timeoutMs ?? READ_TIMEOUT_MS
  // Every call has a deadline. A platform that takes the connection and never answers
  // (the edge has no response timeout of its own) becomes a TimeoutError, which
  // refusalOf reads as unreachable. A deploy's is its own.
  const clientWith = (deadline: number) =>
    createManifestClient({
      origin: options.origin,
      ...(options.session === undefined ? {} : { session: options.session }),
      fetch: async (request) => {
        const response = await globalThis.fetch(request, {
          signal: AbortSignal.timeout(deadline),
        })
        // D7 (FE-39): a refusal because they may not build is heard by the shell; the answer
        // itself is left to `unwrap`, read from a copy.
        if (response.status === 403)
          void response
            .clone()
            .json()
            .then((body: { error?: { code?: unknown } }) =>
              noticeRefusal(body?.error?.code),
            )
            .catch(() => undefined)
        return response
      },
    })
  const client = clientWith(timeoutMs)
  const deploys = clientWith(DEPLOY_TIMEOUT_MS)
  const rehearsals = clientWith(REHEARSAL_TIMEOUT_MS)
  const creates = clientWith(CREATE_TIMEOUT_MS)
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
        await creates.POST('/v1/projects', {
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
    async deploy(environmentId, releaseId, idempotencyKey) {
      return unwrap(
        await deploys.POST('/v1/environments/{environmentId}/deploy', {
          params: {
            path: { environmentId },
            header: { 'Idempotency-Key': idempotencyKey },
          },
          body: { releaseId },
        }),
        'deploy',
      )
    },
    async runRehearsal(projectId, idempotencyKey) {
      return unwrap(
        await rehearsals.POST('/v1/projects/{projectId}/rehearsal', {
          params: {
            path: { projectId },
            header: { 'Idempotency-Key': idempotencyKey },
          },
        }),
        'runRehearsal',
      )
    },
    async getLaunchReadiness(projectId) {
      return unwrap(
        await client.GET('/v1/projects/{projectId}/launch-readiness', {
          params: { path: { projectId } },
        }),
        'getLaunchReadiness',
      )
    },
    async getLaunchRecords(projectId) {
      return unwrap(
        await client.GET('/v1/projects/{projectId}/launch-records', {
          params: { path: { projectId } },
        }),
        'getLaunchRecords',
      )
    },
    async getEnvironment(environmentId) {
      return unwrap(
        await client.GET('/v1/environments/{environmentId}', {
          params: { path: { environmentId } },
        }),
        'getEnvironment',
      )
    },
    async getApproval(releaseId) {
      try {
        return unwrap(
          await client.GET('/v1/releases/{releaseId}/approval', {
            params: { path: { releaseId } },
          }),
          'getApproval',
        )
      } catch (error) {
        if (error instanceof ManifestApiError && error.status === 404) return null
        throw error
      }
    },
    async requestApproval(releaseId, body, idempotencyKey) {
      return unwrap(
        await client.POST('/v1/releases/{releaseId}/approval-request', {
          params: { path: { releaseId }, header: { 'Idempotency-Key': idempotencyKey } },
          body,
        }),
        'requestApproval',
      )
    },
    async listAppSecrets(environmentId) {
      return unwrap(
        await client.GET('/v1/environments/{environmentId}/secrets', {
          params: { path: { environmentId } },
        }),
        'listAppSecrets',
      )
    },
    async setAppSecret(environmentId, name, value, idempotencyKey) {
      unwrap(
        await client.PUT('/v1/environments/{environmentId}/secrets/{name}', {
          params: {
            path: { environmentId, name },
            header: { 'Idempotency-Key': idempotencyKey },
          },
          body: { value },
        }),
        'setAppSecret',
      )
    },
    async listMembers(projectId) {
      return unwrap(
        await client.GET('/v1/projects/{projectId}/members', {
          params: { path: { projectId } },
        }),
        'listMembers',
      )
    },
    async revokeToken(tokenId, idempotencyKey) {
      return unwrap(
        await client.DELETE('/v1/tokens/{tokenId}', {
          params: { path: { tokenId }, header: { 'Idempotency-Key': idempotencyKey } },
        }),
        'revokeToken',
      )
    },
    async addMember(projectId, body, idempotencyKey) {
      return unwrap(
        await client.POST('/v1/projects/{projectId}/members', {
          params: { path: { projectId }, header: { 'Idempotency-Key': idempotencyKey } },
          body,
        }),
        'addMember',
      )
    },
    async removeMember(projectId, userId, idempotencyKey) {
      return unwrap(
        await client.DELETE('/v1/projects/{projectId}/members/{userId}', {
          params: {
            path: { projectId, userId },
            header: { 'Idempotency-Key': idempotencyKey },
          },
        }),
        'removeMember',
      )
    },
    async listTokens(projectId) {
      return unwrap(
        await client.GET('/v1/projects/{projectId}/tokens', {
          params: { path: { projectId } },
        }),
        'listTokens',
      )
    },
    async listPendingActions(projectId) {
      return unwrap(
        await client.GET('/v1/projects/{projectId}/pending-actions', {
          params: { path: { projectId } },
        }),
        'listPendingActions',
      )
    },
    async confirmPendingAction(pendingActionId, idempotencyKey) {
      return unwrap(
        await client.POST('/v1/pending-actions/{pendingActionId}/confirm', {
          params: {
            path: { pendingActionId },
            header: { 'Idempotency-Key': idempotencyKey },
          },
          // The contract's EmptyRequest: required, and nothing in it.
          body: {},
        }),
        'confirmPendingAction',
      )
    },
    async rejectPendingAction(pendingActionId, reason, idempotencyKey) {
      return unwrap(
        await client.POST('/v1/pending-actions/{pendingActionId}/reject', {
          params: {
            path: { pendingActionId },
            header: { 'Idempotency-Key': idempotencyKey },
          },
          body: { reason },
        }),
        'rejectPendingAction',
      )
    },
    async archiveProject(projectId, idempotencyKey) {
      return unwrap(
        await client.POST('/v1/projects/{projectId}/archive', {
          params: { path: { projectId }, header: { 'Idempotency-Key': idempotencyKey } },
          // The contract's EmptyRequest: required, and nothing in it.
          body: {},
        }),
        'archiveProject',
      )
    },
    async restoreProject(projectId, idempotencyKey) {
      return unwrap(
        await client.POST('/v1/projects/{projectId}/restore', {
          params: { path: { projectId }, header: { 'Idempotency-Key': idempotencyKey } },
          // The contract's EmptyRequest: required, and nothing in it.
          body: {},
        }),
        'restoreProject',
      )
    },
    async deleteProject(projectId, idempotencyKey) {
      return unwrap(
        await client.DELETE('/v1/projects/{projectId}', {
          params: { path: { projectId }, header: { 'Idempotency-Key': idempotencyKey } },
        }),
        'deleteProject',
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
