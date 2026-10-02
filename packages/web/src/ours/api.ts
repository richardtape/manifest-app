import type { Schemas } from '@manifest/contract'
import type {
  AppConversation,
  Conversation,
  DryRunEvidence,
  Line,
  Need,
  SinceLine,
} from '@manifest-app/server/progress'
import { noticeRefusal } from '../not-open.js'

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
  method: 'GET' | 'POST' | 'DELETE',
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
    noticeRefusal(code)
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
      | { words: string; token: string }
      /** F5 Task 8: *[Talk it through]*, answering an administrator's refusal. */
      | { words: string; token: string; refusal: { approvalId: string } }
      /** A fix of ours: absent `environment` is trying-out's (F4); the live address's says so. */
      | { fix: { incidentId: string; environment?: 'production' }; token: string }
      /** F5 Task 7: a dry run that signed nobody in, and what it saw. */
      | { fix: { dryRun: DryRunEvidence }; token: string }
      /** F6 Decision 9: the live address stopped answering, between these two moments. */
      | { fix: { outage: { from: string; to: string } }; token: string },
  ): Promise<Conversation>
  /** The person's conversations on the app, newest first, each where it left off. */
  conversationsOn(projectId: string): Promise<AppConversation[]>
  /** The conversation whose round deployed this instance; none of ours did, null. */
  conversationFor(projectId: string, instanceId: string): Promise<{ id: string } | null>
  /**
   * F4 TASK 10: the secrets we asked for by name on the app, each with the question we asked, so
   * trying-out can name one it lacks (Decision 15). A read: nothing is sent, and never a value.
   */
  askedSecrets(projectId: string): Promise<{ name: string; ask: string }[]>
  /**
   * The fix we are already making for this incident, unless it was set aside; none, null. So
   * [What went wrong] pressed again opens it, and never starts a second (the review's I2).
   */
  fixFor(projectId: string, incidentId: string): Promise<{ id: string } | null>
  /**
   * The change we are already making for this administrator's refusal, unless it was set aside;
   * none, null. So *[Talk it through]* pressed again opens it (F5 Task 8, the final review's I1).
   */
  changeForRefusal(projectId: string, approvalId: string): Promise<{ id: string } | null>
  /**
   * The fix we are already making for this dry run, unless it was set aside; none, null. So
   * *[Fix it]* pressed again opens it (F5 Task 7).
   */
  fixForDryRun(projectId: string, rehearsalId: string): Promise<{ id: string } | null>
  /**
   * F5 TASK 9, THE HAND-OVER: *What students see* and *Who gets in* from the plan the person last
   * agreed on the app **by `before`, when the version live was made** (the final review's I2: a
   * change agreed since is on the draft, not live), as written, for the message and the honest
   * line. None agreed by then (an app made elsewhere), null.
   */
  agreedRows(
    projectId: string,
    before: string,
  ): Promise<{ studentsSee: string; whoGetsIn: string } | null>
  events(id: string): StreamSource
  /**
   * F6 TASK 8, THE KEEPING WATCH (design §1): whether our server watches the app with a token
   * that works, until when, which, and whether this person minted it (only its minter may revoke).
   * Anyone outside the app's kept members is refused `404`.
   */
  keeping(projectId: string): Promise<{
    watching: boolean
    until: string | null
    tokenId: string | null
    mine: boolean
  }>
  /**
   * The token the page has just minted, handed over (S2): `new` when our server keeps it (`201`),
   * `current` when the app already has a good one (`200`), and the page then revokes its own.
   */
  handWatch(
    projectId: string,
    handed: { token: string; tokenId: string; expiresAt: string },
  ): Promise<{ kept: 'new' | 'current' }>
  /** F6 Task 9's band: what needs the person, across their apps or on one. Each load is a visit. */
  needs(projectId?: string): Promise<Need[]>
  /** *Since you were last here*: when, and at most five lines, newest first. */
  since(projectId?: string): Promise<{ lastHere: string | null; lines: SinceLine[] }>
  /** An app's history: from the first event held, each gap, every line. A member's alone. */
  history(projectId: string): Promise<{
    from: string | null
    gaps: { from: string; to: string }[]
    lines: Line[]
  }>
  /** Decision 11: a draft its owner deleted, forgotten by our server (after `deleteProject`). */
  forget(projectId: string): Promise<void>
}

/** A success without its list is not an answer: never drawn as one (as `agreedRows`). */
function listed<T>(answer: unknown, key: string): T {
  const list = (answer as Record<string, unknown> | undefined)?.[key]
  if (!Array.isArray(list)) throw new OurRefusal('UNEXPECTED', 200)
  return answer as T
}

const app = (projectId: string, route = '') =>
  `/api/apps/${encodeURIComponent(projectId)}${route}`
const forOne = (path: string, projectId?: string) =>
  projectId === undefined ? path : `${path}?projectId=${encodeURIComponent(projectId)}`

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
    askedSecrets: async (projectId) =>
      (
        (await call('GET', `/api/apps/${encodeURIComponent(projectId)}/secrets`)) as {
          secrets: { name: string; ask: string }[]
        }
      ).secrets,
    fixFor: async (projectId, incidentId) => {
      try {
        const found = (await call(
          'GET',
          `/api/apps/${encodeURIComponent(projectId)}/incidents/${encodeURIComponent(incidentId)}/conversation`,
        )) as { id?: unknown } | undefined
        return typeof found?.id === 'string' ? { id: found.id } : null
      } catch (error) {
        if (error instanceof OurRefusal && error.status === 404) return null
        throw error
      }
    },
    changeForRefusal: async (projectId, approvalId) => {
      try {
        const found = (await call(
          'GET',
          `/api/apps/${encodeURIComponent(projectId)}/refusals/${encodeURIComponent(approvalId)}/conversation`,
        )) as { id?: unknown } | undefined
        return typeof found?.id === 'string' ? { id: found.id } : null
      } catch (error) {
        if (error instanceof OurRefusal && error.status === 404) return null
        throw error
      }
    },
    fixForDryRun: async (projectId, rehearsalId) => {
      try {
        const found = (await call(
          'GET',
          `/api/apps/${encodeURIComponent(projectId)}/rehearsals/${encodeURIComponent(rehearsalId)}/conversation`,
        )) as { id?: unknown } | undefined
        return typeof found?.id === 'string' ? { id: found.id } : null
      } catch (error) {
        if (error instanceof OurRefusal && error.status === 404) return null
        throw error
      }
    },
    agreedRows: async (projectId, before) => {
      try {
        const rows = (await call(
          'GET',
          `/api/apps/${encodeURIComponent(projectId)}/plan?before=${encodeURIComponent(before)}`,
        )) as { studentsSee?: unknown; whoGetsIn?: unknown } | undefined
        const { studentsSee, whoGetsIn } = rows ?? {}
        // A success without the two rows is not a plan: never drawn as one.
        if (typeof studentsSee !== 'string' || typeof whoGetsIn !== 'string')
          throw new OurRefusal('UNEXPECTED', 200)
        return { studentsSee, whoGetsIn }
      } catch (error) {
        if (error instanceof OurRefusal && error.status === 404) return null
        throw error
      }
    },
    events: conversationEvents,
    keeping: async (projectId) =>
      (await call('GET', app(projectId, '/keeping'))) as Awaited<
        ReturnType<Ours['keeping']>
      >,
    handWatch: async (projectId, handed) => {
      const answer = (await call('POST', app(projectId, '/keeping'), {
        token: handed.token,
        tokenId: handed.tokenId,
        expiresAt: handed.expiresAt,
      })) as { kept?: unknown } | undefined
      // `201 { watching, until }` is kept; `200 { kept: 'current', until }` is not (S2).
      return { kept: answer?.kept === 'current' ? 'current' : 'new' }
    },
    needs: async (projectId) =>
      listed<{ needs: Need[] }>(
        await call('GET', forOne('/api/needs', projectId)),
        'needs',
      ).needs,
    since: async (projectId) =>
      listed<Awaited<ReturnType<Ours['since']>>>(
        await call('GET', forOne('/api/since', projectId)),
        'lines',
      ),
    history: async (projectId) =>
      listed<Awaited<ReturnType<Ours['history']>>>(
        await call('GET', app(projectId, '/history')),
        'lines',
      ),
    forget: async (projectId) => {
      await call('DELETE', app(projectId))
    },
  }
}
