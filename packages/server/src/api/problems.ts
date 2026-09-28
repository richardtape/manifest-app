import { getRandomValues } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { Config } from '../config.js'
import type { Problem, Store } from '../store/db.js'
import { guard } from './guard.js'

/**
 * A SUPPORT REFERENCE ON EVERY PROBLEM (F2 Decision 11, Rich). Opaque, so it shows no
 * machinery (C3): eight upper-case hex digits, `XXXX-XXXX`. The person quotes it; the row
 * says what they were shown, and never a platform message, which can carry machinery.
 */
export function newReference(): string {
  const hex = Buffer.from(getRandomValues(new Uint8Array(4)))
    .toString('hex')
    .toUpperCase()
  return `${hex.slice(0, 4)}-${hex.slice(4)}`
}

type Fields = Omit<Problem, 'reference' | 'at' | 'where'>

/**
 * OUR SERVER'S OWN PROBLEM: one row, one JSON line to the output, and the reference to show.
 * A reference already taken is drawn again, never lost.
 */
export function problem(
  store: Store,
  fields: Fields,
  write: (line: string) => void = (line) => void process.stdout.write(line),
): string {
  const at = new Date().toISOString()
  let reference = newReference()
  while (!store.recordProblem({ ...fields, reference, at, where: 'server' }))
    reference = newReference()
  write(
    `${JSON.stringify({ level: 'warn', msg: 'problem', reference, at, ...fields })}\n`,
  )
  return reference
}

/** What a browser may report, and nothing else: an unknown key (a `message`) is refused. */
const KEYS = new Set(['reference', 'code', 'operation', 'status', 'at'])
const REFERENCE = /^[0-9A-F]{4}-[0-9A-F]{4}$/
const CODE = /^[A-Z][A-Z0-9_]{0,63}$/
/** The platform's operationIds: `startIntakeSession`. */
const OPERATION = /^[a-z][A-Za-z0-9]{0,63}$/
const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/

type Report = Pick<Problem, 'reference' | 'code' | 'at' | 'operation' | 'status'>

function reportOf(body: unknown): Report | undefined {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined
  const b = body as Record<string, unknown>
  if (!Object.keys(b).every((key) => KEYS.has(key))) return undefined
  const { reference, code, at, operation = null, status = null } = b
  if (typeof reference !== 'string' || !REFERENCE.test(reference)) return undefined
  if (typeof code !== 'string' || !CODE.test(code)) return undefined
  if (typeof at !== 'string' || !AT.test(at) || Number.isNaN(Date.parse(at)))
    return undefined
  if (operation !== null && (typeof operation !== 'string' || !OPERATION.test(operation)))
    return undefined
  if (
    status !== null &&
    (typeof status !== 'number' ||
      !Number.isInteger(status) ||
      status < 100 ||
      status > 599)
  )
    return undefined
  return { reference, code, at, operation, status }
}

const INVALID = { error: { code: 'PROBLEM_INVALID' } }

/**
 * `POST /api/problems`: what the browser met at the platform, reported without waiting
 * (Decision 11). Origin-guarded like every change; the person is recorded when there is
 * one. A body we cannot read, of any kind, is `400 PROBLEM_INVALID`.
 */
export function registerProblems(
  app: FastifyInstance,
  { config, store }: { config: Config; store: Store },
): void {
  const check = guard(config, { person: 'optional' })
  app.post(
    '/api/problems',
    {
      bodyLimit: 1024,
      // Too large, not JSON, or not a JSON type: never Fastify's own words.
      errorHandler: (_error, _request, reply) => reply.code(400).send(INVALID),
    },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const report = reportOf(request.body)
      if (report === undefined) return reply.code(400).send(INVALID)
      store.recordProblem({
        ...report,
        where: 'browser',
        personId: who.person?.id ?? null,
        conversationId: null,
        platformRequestId: null,
      })
      return reply.code(204).send()
    },
  )
}
