import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../app.js'
import type { Config } from '../config.js'
import { openStore, type Store } from '../store/db.js'
import { dumpAll, scratchDir } from '../store/testing.js'
import { newReference, problem } from './problems.js'
import { ALICE, AS_ALICE, fakeControlPlane } from './testing.js'

/**
 * DECISION 11 (Rich): EVERY PROBLEM A PERSON IS SHOWN CARRIES A REFERENCE THEY CAN QUOTE.
 * Our server's own are made by `problem()`; what the browser meets at the platform is
 * reported to `POST /api/problems`. Either way, one row, and never a platform message.
 */
let platform: Awaited<ReturnType<typeof fakeControlPlane>>
beforeAll(async () => {
  platform = await fakeControlPlane()
})
afterAll(() => platform.close())

const ORIGIN = 'https://app.manifest.internal'
const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

function setUp(): { store: Store; file: string; config: Config } {
  const { dir, remove } = scratchDir()
  const file = join(dir, 'app.sqlite')
  const store = openStore(file)
  cleanups.push(() => {
    store.close()
    remove()
  })
  return {
    store,
    file,
    config: {
      mode: 'edge',
      port: 7105,
      origin: ORIGIN,
      platformOrigin: platform.origin,
      modelGateway: 'http://127.0.0.1:7106/v1',
      planModel: 'default-chat',
      smtpUrl: 'smtp://127.0.0.1:7111',
      mailFrom: 'Manifest <manifest@app.manifest.internal>',
    },
  }
}

const rows = (file: string) =>
  JSON.parse(dumpAll(file)['problems'] ?? '[]') as Record<string, unknown>[]
const GOOD = {
  reference: '7F3A-9C21',
  code: 'INTAKE_DAILY_LIMIT_REACHED',
  operation: 'startIntakeSession',
  status: 409,
  at: '2026-09-27T20:31:00.000Z',
}

/** The platform's own id for the request (FE-30, contract 1.6.0): the mock's, as it answered. */
const REQUEST_ID = '1f758a00-2575-409b-bf48-dfbc4218b118'

async function report(
  config: Config,
  store: Store,
  body: unknown,
  headers: Record<string, string> = { cookie: AS_ALICE, origin: ORIGIN },
) {
  const app = buildServer(config, () => undefined, { store })
  const response = await app.inject({
    method: 'POST',
    url: '/api/problems',
    headers: { 'content-type': 'application/json', ...headers },
    payload: typeof body === 'string' ? body : JSON.stringify(body),
  })
  await app.close()
  return response
}

describe('newReference', () => {
  it('is XXXX-XXXX in upper-case hex, and a thousand are distinct', () => {
    const many = Array.from({ length: 1000 }, newReference)
    for (const reference of many) expect(reference).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    expect(new Set(many).size).toBe(1000)
  })
})

describe("the server's own problem", () => {
  it('writes one row and one JSON line, and answers the reference', () => {
    const { store, file } = setUp()
    const lines: string[] = []
    const reference = problem(
      store,
      {
        code: 'MODEL_ANSWER_INVALID',
        operation: 'POST /api/conversations/:id/intake',
        status: null,
        personId: ALICE.id,
        conversationId: 'c-1',
        platformRequestId: null,
      },
      (line) => lines.push(line),
    )
    expect(reference).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    expect(rows(file)).toEqual([
      expect.objectContaining({
        reference,
        code: 'MODEL_ANSWER_INVALID',
        place: 'server',
        person_id: ALICE.id,
        conversation_id: 'c-1',
      }),
    ])
    expect(lines).toHaveLength(1)
    expect(lines[0]!.endsWith('\n')).toBe(true)
    expect(JSON.parse(lines[0]!)).toMatchObject({
      msg: 'problem',
      reference,
      code: 'MODEL_ANSWER_INVALID',
      conversationId: 'c-1',
    })
  })
})

describe('POST /api/problems: what the browser met', () => {
  it('a good report is 204, one row, with the person', async () => {
    const { store, file, config } = setUp()
    const response = await report(config, store, GOOD)
    expect(response.statusCode).toBe(204)
    expect(rows(file)).toEqual([
      {
        reference: '7F3A-9C21',
        code: 'INTAKE_DAILY_LIMIT_REACHED',
        at: '2026-09-27T20:31:00.000Z',
        place: 'browser',
        operation: 'startIntakeSession',
        status: 409,
        person_id: ALICE.id,
        conversation_id: null,
        platform_request_id: null,
      },
    ])
  })

  it("FE-30: the platform's request id is kept beside our reference, exactly as reported", async () => {
    const { store, file, config } = setUp()
    const response = await report(config, store, { ...GOOD, requestId: REQUEST_ID })
    expect(response.statusCode).toBe(204)
    expect(rows(file)).toEqual([
      expect.objectContaining({
        reference: '7F3A-9C21',
        place: 'browser',
        platform_request_id: REQUEST_ID,
      }),
    ])
  })

  it('a report from nobody is kept too: a person who cannot sign in has problems', async () => {
    const { store, file, config } = setUp()
    const response = await report(
      config,
      store,
      { reference: '0000-0001', code: 'UNREACHABLE', at: GOOD.at },
      { origin: ORIGIN },
    )
    expect(response.statusCode).toBe(204)
    expect(rows(file)).toEqual([
      expect.objectContaining({
        reference: '0000-0001',
        person_id: null,
        operation: null,
        status: null,
      }),
    ])
  })

  it.each([
    ['a bad reference', { ...GOOD, reference: '7f3a-9c21' }],
    ['a code that is not a code', { ...GOOD, code: 'a message, not a code' }],
    ['an unknown key: a message', { ...GOOD, message: 'the platform said something' }],
    ['no reference', { code: GOOD.code, at: GOOD.at }],
    ['a status that is not a number', { ...GOOD, status: '409' }],
    ['a time that is not a time', { ...GOOD, at: 'yesterday' }],
    ['an operation that is prose', { ...GOOD, operation: 'we tried to start it' }],
    ['a request id that is not a UUID', { ...GOOD, requestId: 'b5ae64cb' }],
    ['a request id that is prose', { ...GOOD, requestId: `${REQUEST_ID} was refused` }],
    ['a request id that is not a string', { ...GOOD, requestId: 42 }],
    // A good report padded with whitespace: valid JSON, and only its size is wrong.
    ['a body over 1 KB', JSON.stringify(GOOD) + ' '.repeat(1100)],
    ['not JSON', '{"reference":'],
    ['an array', [GOOD]],
  ])('%s is 400 PROBLEM_INVALID, with no row', async (_, body) => {
    const { store, file, config } = setUp()
    const response = await report(config, store, body)
    expect([response.statusCode, response.json()]).toEqual([
      400,
      { error: { code: 'PROBLEM_INVALID' } },
    ])
    expect(rows(file)).toEqual([])
  })

  it('a report from another origin is 403 ORIGIN_REFUSED, with no row', async () => {
    const { store, file, config } = setUp()
    const response = await report(config, store, GOOD, {
      cookie: AS_ALICE,
      origin: 'https://evil.staging.manifest.internal',
    })
    expect(response.statusCode).toBe(403)
    expect(rows(file)).toEqual([])
  })
})
