import { createManifestClient, idempotencyKey, unwrap } from '@manifest/contract'
import { ModelError, type ModelCode } from '../model/client.js'
import { PLATFORM_TIMEOUT_MS, PlatformRefusal, refusalFrom } from './refusal.js'

/**
 * AGENT SESSIONS (the enablement plan's sitting 7, as it landed: F2 sitting 1, M1), with the
 * conversation's delegated token. A session's key is charged to the person, capped, and lives
 * an hour; the plan step starts one, writes, and ends it (Task 9).
 */
export interface AgentSessions {
  /** The person's month. `remainingUsd` is null when the gateway did not say; `resetsAt` before a first session. */
  budget(
    token: string,
  ): Promise<{ monthlyUsd: number; remainingUsd: number | null; resetsAt: string | null }>
  /**
   * One `Idempotency-Key` per start. The key is in this answer and never again. F3's round
   * states its cap and its clock (Decision 9: $2 and 240 minutes, both taken as sent, M1);
   * F2's plan step states neither and takes the platform's.
   */
  start(
    token: string,
    projectId: string,
    name: string,
    options?: { capUsd: number; durationMinutes: number },
  ): Promise<{
    sessionId: string
    key: string
    baseUrl: string
    models: string[]
    expiresAt: string
    capUsd: number
  }>
  end(token: string, sessionId: string): Promise<void>
  /**
   * Each of the project's sessions, what it has spent (`null` when the gateway did not say, F3
   * Decision 14), why the platform ended it, if it did (`models_withdrawn`: FE-36), and the models
   * its key holds now: the platform narrows a live key in place when the project stops allowing
   * one (its sitting 5, `d061ad7`).
   */
  list(
    token: string,
    projectId: string,
  ): Promise<
    { id: string; spentUsd: number | null; endReason: string | null; models: string[] }[]
  >
}

/**
 * THE AI REFUSALS OF A START ARE THE MODEL'S, so a step words them as it words a model's:
 * AI off, or no model for this app's data, is "not available"; the gateway down is
 * "unreachable"; the person's month spent is "budget exhausted". Anything else is the
 * platform's own refusal, by its code. `AGENT_SESSION_ALREADY_STARTED` names its session in
 * its message alone, which is never read (FE-29): the orphan's key was never received, so it
 * spends nothing, and it expires.
 */
const AS_MODEL: Record<string, ModelCode> = {
  AI_CATALOGUE_DISABLED: 'MODEL_NOT_AVAILABLE',
  AGENT_NO_MODEL_FOR_CLASSIFICATION: 'MODEL_NOT_AVAILABLE',
  AI_BACKEND_UNAVAILABLE: 'MODEL_UNREACHABLE',
  AGENT_BUDGET_EXHAUSTED: 'MODEL_BUDGET_EXHAUSTED',
}

async function asked<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    const refusal: PlatformRefusal = refusalFrom(error)
    const model = AS_MODEL[refusal.code]
    throw model === undefined
      ? refusal
      : new ModelError(model, refusal.status, null, refusal.requestId)
  }
}

export function platformAgentSessions(origin: string): AgentSessions {
  const client = (token: string) =>
    createManifestClient({
      origin,
      token,
      fetch: (request) =>
        globalThis.fetch(request, { signal: AbortSignal.timeout(PLATFORM_TIMEOUT_MS) }),
    })
  return {
    budget: (token) =>
      asked(async () => {
        const budget = unwrap(
          await client(token).GET('/v1/agent-budget'),
          'getAgentBudget',
        )
        return {
          monthlyUsd: budget.monthlyUsd,
          remainingUsd: budget.remainingUsd,
          resetsAt: budget.resetsAt,
        }
      }),
    start: (token, projectId, name, options) =>
      asked(async () => {
        const started = unwrap(
          await client(token).POST('/v1/projects/{projectId}/agent-sessions', {
            params: {
              path: { projectId },
              header: { 'Idempotency-Key': idempotencyKey() },
            },
            body: { name, ...options },
          }),
          'startAgentSession',
        )
        return {
          sessionId: started.session.id,
          key: started.key,
          baseUrl: started.baseUrl,
          models: started.session.models,
          expiresAt: started.session.expiresAt,
          capUsd: started.session.capUsd,
        }
      }),
    list: (token, projectId) =>
      asked(async () =>
        unwrap(
          await client(token).GET('/v1/projects/{projectId}/agent-sessions', {
            params: { path: { projectId } },
          }),
          'listAgentSessions',
        ).sessions.map((session) => ({
          id: session.id,
          spentUsd: session.spentUsd,
          endReason: session.endReason ?? null,
          models: session.models,
        })),
      ),
    end: (token, sessionId) =>
      asked(async () => {
        unwrap(
          await client(token).DELETE('/v1/agent-sessions/{sessionId}', {
            params: {
              path: { sessionId },
              header: { 'Idempotency-Key': idempotencyKey() },
            },
          }),
          'endAgentSession',
        )
      }),
  }
}
