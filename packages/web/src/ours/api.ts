import type { Schemas } from '@manifest/contract'
import type { AppConversation, Conversation } from '@manifest-app/server/progress'

/**
 * OUR OWN API (`/api/*`), FROM THE PAGE: this file is its one caller, as src/platform/ is
 * the platform's (boundary.test.ts holds both). Our server answers for the person by their
 * cookie (FE-2), so a call here sends nothing but the cookie the browser already sends.
 */

/** What the hook needs of an `EventSource`, so a test can hand it a fake. */
export interface StreamSource {
  readonly readyState: number
  onmessage: ((event: MessageEvent<string>) => void) | null
  onerror: ((event: Event) => void) | null
  close(): void
}

/** A conversation's progress stream (F2 Decision 4). */
export function conversationEvents(id: string): StreamSource {
  return new EventSource(`/api/conversations/${encodeURIComponent(id)}/events`)
}

/** `XXXX-XXXX`: opaque, so it shows no machinery (C3). The server's are made the same way. */
export function newReference(): string {
  const hex = [...crypto.getRandomValues(new Uint8Array(4))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  return `${hex.slice(0, 4)}-${hex.slice(4)}`
}

/**
 * A PROBLEM THE PERSON IS SHOWN, REPORTED (Decision 11, Rich). The reference is made here
 * and answered at once, for the notice to show; the report goes without being waited on,
 * and `keepalive` lets it outlive the page. Nothing here can throw into a screen, and a
 * report that fails is lost: the notice is the same either way. Only a code, an operation
 * and a status are sent, never a platform message, which can carry machinery.
 */
export function reportProblem(problem: {
  code: string
  operation?: string
  status?: number
  /** Made beforehand, so a notice can show it on its first render. The server ignores a repeat. */
  reference?: string
}): string {
  const reference = problem.reference ?? newReference()
  const body = JSON.stringify({
    reference,
    code: problem.code,
    operation: problem.operation ?? null,
    status: problem.status ?? null,
    at: new Date().toISOString(),
  })
  try {
    fetch('/api/problems', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body,
    }).catch(() => undefined)
  } catch {
    // No fetch at all: the report is lost, and the reference is still shown.
  }
  return reference
}

/** What our API refused: its code and status. Nothing answering at all is `UNREACHABLE`. */
export class OurRefusal extends Error {
  constructor(
    readonly code: string,
    readonly status: number | null,
  ) {
    super(status === null ? code : `${code} (${status})`)
    this.name = 'OurRefusal'
  }
}

/** A call to our API that has not answered by now is unreachable, as the platform's are (F1). */
const TIMEOUT_MS = 15_000

async function call(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      ...(body === undefined
        ? {}
        : {
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new OurRefusal('UNREACHABLE', null)
  }
  const text = await response.text().catch(() => '')
  let json: unknown
  try {
    json = text === '' ? undefined : JSON.parse(text)
  } catch {
    json = undefined
  }
  if (!response.ok) {
    const code = (json as { error?: { code?: unknown } } | undefined)?.error?.code
    // Our server down behind the edge: its empty 502 (F1 M7).
    if (code === undefined && [502, 503, 504].includes(response.status))
      throw new OurRefusal('UNREACHABLE', response.status)
    throw new OurRefusal(typeof code === 'string' ? code : 'UNEXPECTED', response.status)
  }
  return json
}

const at = (id: string, route = '') =>
  `/api/conversations/${encodeURIComponent(id)}${route}`

export type IntakeBody =
  Record<string, never> | { answers: Record<string, string> } | { skip: true }

/** The conversation and its intake (moments 3 and 4): each answers when our server has taken it. */
export interface Ours {
  startConversation(description: string): Promise<Conversation>
  readConversation(id: string): Promise<Conversation>
  /** What the platform answered `startIntakeSession`: the key, for our server to hold in memory. */
  handIntakeKey(
    id: string,
    key: { key: string; baseUrl: string; model: string; expiresAt: string },
  ): Promise<void>
  intake(id: string, body: IntakeBody): Promise<void>
  names(id: string, taken: string[]): Promise<void>
  blueprint(id: string, blueprints: Schemas['BlueprintList']): Promise<void>
  /**
   * MAKE IT'S HANDOVER (Task 8): the project made and the conversation's token minted, both
   * in the person's session, for our server to check and hold in memory.
   */
  handProject(id: string, made: { projectId: string; token: string }): Promise<void>
  /** MOMENT 5 (Task 9): write the plan, after Make it, or Carry on. */
  plan(id: string): Promise<void>
  /** Not quite: one sentence of theirs. */
  correct(id: string, correction: string): Promise<void>
  /** Yes, build that: with their answers to what only they know. */
  /** Yes to the plan on screen: its version, so a window behind never agrees to another. */
  agree(
    id: string,
    agreement: { version: number; answers: Record<string, string> },
  ): Promise<void>
  /**
   * MOMENT 6 (F3 Task 11): Carry on and Try again are `{}`; Try a different way is
   * `{ way: 'different' }`. Our server refuses TOKEN_MISSING when a restart forgot the token.
   */
  build(id: string, way?: 'different'): Promise<void>
  /** Their words while it works: the lead reads them at its next step. */
  message(id: string, words: string): Promise<void>
  /** An answer, kept as they typed it: a secret's goes to their app alone. */
  answer(id: string, questionId: string, words: string): Promise<void>
  /** Stop: whatever the draft address has, it keeps. A change waiting or planned is set aside (F4). */
  stop(id: string): Promise<void>
  /**
   * F4 TASK 6: A CHANGE ON AN APP, in one request: their words (or a fix of ours) and the token the
   * browser has just minted for it. Our server checks the token before it keeps anything.
   */
  startChange(
    projectId: string,
    body:
      { words: string; token: string } | { fix: { incidentId: string }; token: string },
  ): Promise<Conversation>
  /** The person's conversations on the app, newest first, each where it left off. */
  conversationsOn(projectId: string): Promise<AppConversation[]>
  /** The conversation whose round deployed this instance; none of ours did, null. */
  conversationFor(projectId: string, instanceId: string): Promise<{ id: string } | null>
  events(id: string): StreamSource
}

export function createOurs(): Ours {
  return {
    startConversation: async (description) =>
      (await call('POST', '/api/conversations', { description })) as Conversation,
    readConversation: async (id) => (await call('GET', at(id))) as Conversation,
    handIntakeKey: async (id, key) => {
      await call('POST', at(id, '/intake-key'), {
        key: key.key,
        baseUrl: key.baseUrl,
        model: key.model,
        expiresAt: key.expiresAt,
      })
    },
    intake: async (id, body) => {
      await call('POST', at(id, '/intake'), body)
    },
    names: async (id, taken) => {
      await call('POST', at(id, '/names'), { taken })
    },
    blueprint: async (id, blueprints) => {
      await call('POST', at(id, '/blueprint'), { blueprints })
    },
    plan: async (id) => {
      await call('POST', at(id, '/plan'), {})
    },
    correct: async (id, correction) => {
      await call('POST', at(id, '/plan/correction'), { correction })
    },
    agree: async (id, agreement) => {
      await call('POST', at(id, '/plan/agree'), agreement)
    },
    handProject: async (id, made) => {
      await call('POST', at(id, '/project'), {
        projectId: made.projectId,
        token: made.token,
      })
    },
    build: async (id, way) => {
      await call('POST', at(id, '/build'), way === undefined ? {} : { way })
    },
    message: async (id, words) => {
      await call('POST', at(id, '/messages'), { words })
    },
    answer: async (id, questionId, words) => {
      await call('POST', at(id, '/answers'), { questionId, words })
    },
    stop: async (id) => {
      await call('POST', at(id, '/stop'), {})
    },
    startChange: async (projectId, body) =>
      (await call(
        'POST',
        `/api/apps/${encodeURIComponent(projectId)}/conversations`,
        body,
      )) as Conversation,
    conversationsOn: async (projectId) =>
      ((await call('GET', `/api/apps/${encodeURIComponent(projectId)}/conversations`)) ??
        []) as AppConversation[],
    conversationFor: async (projectId, instanceId) => {
      try {
        const found = (await call(
          'GET',
          `/api/apps/${encodeURIComponent(projectId)}/instances/${encodeURIComponent(instanceId)}/conversation`,
        )) as { id?: unknown } | undefined
        return typeof found?.id === 'string' ? { id: found.id } : null
      } catch (error) {
        if (error instanceof OurRefusal && error.status === 404) return null
        throw error
      }
    },
    events: conversationEvents,
  }
}
