import type { Config } from '../config.js'
import {
  ASKING_DEADLINES,
  ModelError,
  openAiCompatible,
  type Model,
} from '../model/client.js'
import { walkthroughModel } from '../model/walkthrough.js'
import type { Conversation } from '../store/db.js'

/**
 * THE INTAKE KEY (FE-1, as it landed: F2 sitting 1, M1). The browser starts the intake
 * session, in the person's session, and hands us what the platform answered. We keep the
 * key IN MEMORY ONLY, until its `expiresAt` (Decision 1). Only the browser can end it:
 * ending one is session-only, and FE-2 keeps our server out of the session.
 */
export type IntakeKey = { key: string; baseUrl: string; model: string; expiresAt: string }

const FIELDS = ['key', 'baseUrl', 'model', 'expiresAt']
const trimmed = (url: string) => url.replace(/\/+$/, '')

/** A key as the platform answered it, or why not. Never a base URL the browser chose. */
export function intakeKeyFrom(
  handed: unknown,
  config: Config,
): IntakeKey | { refused: 'INTAKE_KEY_INVALID' | 'MODEL_GATEWAY_REFUSED' } {
  const invalid = { refused: 'INTAKE_KEY_INVALID' } as const
  if (typeof handed !== 'object' || handed === null || Array.isArray(handed))
    return invalid
  const h = handed as Record<string, unknown>
  if (Object.keys(h).length !== FIELDS.length || !FIELDS.every((field) => field in h))
    return invalid
  const { key, baseUrl, model, expiresAt } = h
  if (typeof key !== 'string' || key === '' || key.length > 512) return invalid
  if (typeof model !== 'string' || model === '' || model.length > 64) return invalid
  if (typeof baseUrl !== 'string' || typeof expiresAt !== 'string') return invalid
  const until = Date.parse(expiresAt)
  if (Number.isNaN(until)) return invalid
  // The mock answers a fixed example time, long past (FE-27): in mock mode it is not a time.
  if (config.mode === 'edge' && until <= Date.now()) return invalid
  if (trimmed(baseUrl) !== trimmed(config.modelGateway))
    return { refused: 'MODEL_GATEWAY_REFUSED' }
  return { key, baseUrl, model, expiresAt }
}

/** The keys our server holds, by conversation, in memory: a restart forgets them all. */
export interface IntakeKeys {
  put(conversationId: string, key: IntakeKey): void
  get(conversationId: string): IntakeKey | undefined
  drop(conversationId: string): void
}

export function createIntakeKeys(): IntakeKeys {
  const keys = new Map<string, IntakeKey>()
  return {
    put: (id, key) => void keys.set(id, key),
    get: (id) => keys.get(id),
    drop: (id) => void keys.delete(id),
  }
}

/**
 * A MODEL FOR THE CONVERSATION'S INTAKE, only with its key: none handed over (or lost to a
 * restart, Review Focus 5) is INTAKE_KEY_MISSING; one past its time is dropped, and is
 * INTAKE_KEY_EXPIRED. The page answers either by starting another intake session, once.
 */
export function gatedIntakeModel(
  keys: IntakeKeys,
  make: (key: IntakeKey) => Model,
  /** False in mock mode, whose keys carry the document's example time, long past (FE-27). */
  honourExpiry = true,
): (conversation: Pick<Conversation, 'id'>) => Model {
  return (conversation) => ({
    complete(agent, schema, messages, check) {
      const key = keys.get(conversation.id)
      if (key === undefined) return Promise.reject(new ModelError('INTAKE_KEY_MISSING'))
      if (honourExpiry && Date.parse(key.expiresAt) <= Date.now()) {
        keys.drop(conversation.id)
        return Promise.reject(new ModelError('INTAKE_KEY_EXPIRED'))
      }
      return make(key).complete(agent, schema, messages, check)
    },
  })
}

/**
 * EACH MODE'S INTAKE MODEL. Through the edge, the platform's gateway with the handed key.
 * Against the mock, which has no model, the walk-through's answers: but still only with a
 * key handed over, so mock mode exercises the whole handover (Decision 7).
 */
export function intakeModelFor(
  config: Config,
  keys: IntakeKeys,
): (conversation: Pick<Conversation, 'id'>) => Model {
  if (config.mode === 'mock') {
    const walkthrough = walkthroughModel()
    return gatedIntakeModel(keys, () => walkthrough, false)
  }
  return gatedIntakeModel(keys, (key) =>
    openAiCompatible({
      baseUrl: config.modelGateway,
      key: key.key,
      model: key.model,
      deadlines: ASKING_DEADLINES,
    }),
  )
}
