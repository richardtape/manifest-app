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
  /** One `Idempotency-Key` per start. The key is in this answer and never again. */
  start(
    token: string,
    projectId: string,
    name: string,
  ): Promise<{
    sessionId: string
    key: string
    baseUrl: string
    models: string[]
    expiresAt: string
  }>
  end(token: string, sessionId: string): Promise<void>
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
    throw model === undefined ? refusal : new ModelError(model, refusal.status)
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
    start: (token, projectId, name) =>
      asked(async () => {
        const started = unwrap(
          await client(token).POST('/v1/projects/{projectId}/agent-sessions', {
            params: {
              path: { projectId },
              header: { 'Idempotency-Key': idempotencyKey() },
            },
            body: { name },
          }),
          'startAgentSession',
        )
        return {
          sessionId: started.session.id,
          key: started.key,
          baseUrl: started.baseUrl,
          models: started.session.models,
          expiresAt: started.session.expiresAt,
        }
      }),
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
