import { ManifestApiError, type ErrorEnvelope } from '@manifest/contract'
import { createMockServer, fixtures } from '@manifest/mock'
import { createServer } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import {
  CREATE_TIMEOUT_MS,
  createPlatform,
  DEPLOY_TIMEOUT_MS,
  READ_TIMEOUT_MS,
  REHEARSAL_TIMEOUT_MS,
} from './api.js'
import { refusalOf, reported } from './refusal.js'

/**
 * THE ONE PLACE THAT CALLS THE PLATFORM, against an in-process manifest-mock (the
 * console's api.test.ts pattern). In Node, `@manifest/contract` sends the session and the
 * Origin as headers; in a browser it sends neither, because the browser does. That is why
 * this file runs in `node` and never under jsdom (sitting 2's note).
 */
async function withMock<T>(
  fn: (origin: string) => Promise<T>,
  options: { intake?: 'daily-limit' | 'budget-spent' } = {},
): Promise<T> {
  const server = createMockServer({ scanSilenceMs: 50, ...options })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as { port: number }
  try {
    return await fn(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

const platform = (origin: string) => createPlatform({ origin, session: 'mock-session' })

/** What the call threw, for `refusalOf`. */
async function thrown(call: () => Promise<unknown>): Promise<unknown> {
  try {
    await call()
  } catch (error) {
    return error
  }
  throw new Error('the call did not throw')
}

/** The platform's own id for a request (FE-30, contract 1.6.0). */
const REQUEST_ID = '1f758a00-2575-409b-bf48-dfbc4218b118'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** A refusal whose message carries machinery we must never show (Review Focus 5). */
const envelopeWith = (code: string) =>
  ({
    error: { code, message: 'sha256:9b2c… refused under §23', hint: 'see D23.7' },
  }) as unknown as ErrorEnvelope

describe('the five reads F1 makes, against manifest-mock', () => {
  it('getMe answers the person', async () => {
    await withMock(async (origin) => {
      expect((await platform(origin).getMe()).displayName).toBe('Instructor One')
    })
  })

  it('listProjects answers mock-app', async () => {
    await withMock(async (origin) => {
      expect((await platform(origin).listProjects()).map((p) => p.slug)).toEqual([
        'mock-app',
      ])
    })
  })

  it('getProject answers its three environments, expanded', async () => {
    await withMock(async (origin) => {
      const project = await platform(origin).getProject(fixtures.PROJECT_ID)
      expect(project.environments?.map((e) => e.kind)).toEqual([
        'sandbox',
        'staging',
        'production',
      ])
    })
  })

  it('the staging address reaches an instance, and getRelease answers its date', async () => {
    await withMock(async (origin) => {
      const p = platform(origin)
      const project = await p.getProject(fixtures.PROJECT_ID)
      const staging = project.environments?.find((e) => e.kind === 'staging')
      expect(staging?.instance?.state).toBe('healthy')
      const release = await p.getRelease(staging!.instance!.releaseId)
      expect(release.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
      expect(Number.isNaN(Date.parse(release.createdAt))).toBe(false)
    })
  })
})

describe('the Preview’s reads (F4 Task 5), against manifest-mock', () => {
  it('listEnvironments answers the three, as a bare array (M1)', async () => {
    await withMock(async (origin) => {
      const environments = await platform(origin).listEnvironments(fixtures.PROJECT_ID)
      expect(Array.isArray(environments)).toBe(true)
      expect(environments.map((e) => e.kind)).toEqual([
        'sandbox',
        'staging',
        'production',
      ])
      expect(environments[0]?.hostname).toMatch(/\.sandbox\./)
    })
  })

  it('listInstances answers { environmentId, instances, truncated }, each marked serving (M1)', async () => {
    await withMock(async (origin) => {
      const list = await platform(origin).listInstances(fixtures.SANDBOX_ID)
      expect(list.environmentId).toBe(fixtures.SANDBOX_ID)
      expect(list.truncated).toBe(false)
      expect(list.instances.map((i) => [i.state, i.serving])).toEqual([
        ['healthy', true],
        ['failed', false],
      ])
    })
  })

  it('listIncidents answers { environmentId, incidents }, newest first', async () => {
    await withMock(async (origin) => {
      const list = await platform(origin).listIncidents(fixtures.STAGING_ID)
      expect(list.environmentId).toBe(fixtures.STAGING_ID)
      expect(list.incidents[0]?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })
})

describe('going live’s reads (F5 Tasks 5 and 6), in the person’s session, against manifest-mock', () => {
  it('getLaunchReadiness answers the checklist: every item, its state, and the candidate', async () => {
    await withMock(async (origin) => {
      const readiness = await platform(origin).getLaunchReadiness(fixtures.PROJECT_ID)
      expect(readiness.projectId).toBe(fixtures.PROJECT_ID)
      expect(readiness.ready).toBe(false)
      expect(readiness.candidateReleaseId).toBe(fixtures.RELEASE_ID)
      expect(readiness.items.map((i) => [i.id, i.state])).toContainEqual([
        'privacy-assessment',
        'unmet',
      ])
    })
  })

  it('getLaunchRecords answers the two records an administrator keeps', async () => {
    await withMock(async (origin) => {
      const records = await platform(origin).getLaunchRecords(fixtures.PROJECT_ID)
      expect(records.iamRegistration?.state).toBe('active')
      expect(records.privacyAssessment?.state).toBe('submitted')
    })
  })

  it('getEnvironment answers one address, and the instance it reaches', async () => {
    await withMock(async (origin) => {
      const env = await platform(origin).getEnvironment(fixtures.STAGING_ID)
      expect(env.id).toBe(fixtures.STAGING_ID)
      expect(env.kind).toBe('staging')
      expect(env.instance?.state).toBe('healthy')
    })
  })
})

/** A platform that answers every request with this status and envelope, recording what it was asked. */
async function answering<T>(
  status: number,
  code: string,
  fn: (origin: string, seen: string[]) => Promise<T>,
): Promise<T> {
  const seen: string[] = []
  const server = createServer((request, response) => {
    seen.push(`${request.method} ${request.url}`)
    response.writeHead(status, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ error: { code, message: 'sha256:… under §13' } }))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    return await fn(
      `http://127.0.0.1:${(server.address() as { port: number }).port}`,
      seen,
    )
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

describe('the sign-off (F5 Task 8, moment 13), in the person’s session', () => {
  it('getApproval answers the newest decision on a release: the mock’s, approved, and who decided', async () => {
    await withMock(async (origin) => {
      const approval = await platform(origin).getApproval(fixtures.RELEASE_ID)
      expect(approval).toMatchObject({
        releaseId: fixtures.RELEASE_ID,
        decision: 'approved',
        decidedByName: 'Instructor One',
      })
    })
  })

  it('nobody has decided yet (404) is null, a state and not an error', async () => {
    await answering(404, 'NOT_FOUND', async (origin, seen) => {
      expect(await platform(origin).getApproval(fixtures.RELEASE_ID)).toBeNull()
      expect(seen).toEqual([`GET /v1/releases/${fixtures.RELEASE_ID}/approval`])
    })
  })

  it('any other refusal is thrown, for the page to say', async () => {
    await answering(403, 'FORBIDDEN', async (origin) => {
      const error = await thrown(() => platform(origin).getApproval(fixtures.RELEASE_ID))
      expect(refusalOf(error)).toEqual({
        kind: 'refused',
        code: 'FORBIDDEN',
        status: 403,
      })
    })
  })
})

describe('moments 3 and 4 (F2 Task 7), against manifest-mock', () => {
  it('startIntakeSession answers a session, its one model, and its key; endIntakeSession ends it', async () => {
    await withMock(async (origin) => {
      const started = await platform(origin).startIntakeSession('describe-0001')
      expect(started.session.model).toBe('default-chat')
      expect(started.key).toBe(fixtures.MOCK_MODEL_KEY)
      expect(started.baseUrl).toBe('http://127.0.0.1:7106/v1')
      expect(
        (await platform(origin).endIntakeSession(started.session.id, 'end-0001')).state,
      ).toBe('ended')
    })
  })

  it('checkSlug says mock-app is taken, with the platform’s own reason, and another is free', async () => {
    await withMock(async (origin) => {
      expect(await platform(origin).checkSlug('mock-app')).toMatchObject({
        available: false,
        reasons: [{ code: 'SLUG_TAKEN', message: 'a project already has this slug' }],
      })
      expect(await platform(origin).checkSlug('reading-responses')).toMatchObject({
        available: true,
      })
    })
  })

  it('listBlueprints answers node-ts-mongo@1', async () => {
    await withMock(async (origin) => {
      expect((await platform(origin).listBlueprints()).map((b) => b.ref)).toEqual([
        'node-ts-mongo@1',
      ])
    })
  })

  it('startIntakeSession sends the Idempotency-Key it is given, one per press', async () => {
    const seen: (string | undefined)[] = []
    const server = createServer((request, response) => {
      seen.push(request.headers['idempotency-key'] as string | undefined)
      response.writeHead(409, { 'content-type': 'application/json' })
      response.end(
        JSON.stringify({ error: { code: 'INTAKE_DAILY_LIMIT_REACHED', message: 'x' } }),
      )
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    try {
      const error = await thrown(() => platform(origin).startIntakeSession('press-0001'))
      expect(refusalOf(error)).toEqual({
        kind: 'refused',
        code: 'INTAKE_DAILY_LIMIT_REACHED',
        status: 409,
      })
      expect(seen).toEqual(['press-0001'])
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('Make it (F2 Task 8), against manifest-mock', () => {
  const REQUEST = {
    slug: 'reading-responses',
    name: 'Reading responses',
    blueprint: 'node-ts-mongo@1',
    audience: { scale: 'class' as const, burst: 'synchronised' as const },
  }

  it('createProject answers the project it made (the mock’s own, whatever is asked: M2)', async () => {
    await withMock(async (origin) => {
      const made = await platform(origin).createProject(REQUEST, 'make-0001')
      expect(made.id).toBe(fixtures.PROJECT_ID)
      expect(made.spec.valid).toBe(true)
    })
  })

  it('mintToken answers the secret, once', async () => {
    await withMock(async (origin) => {
      const minted = await platform(origin).mintToken(
        fixtures.PROJECT_ID,
        {
          name: 'Building — First build',
          capabilities: ['project:read'],
          expiresInDays: 7,
        },
        'mint-0001',
      )
      expect(minted.secret).toMatch(/^mft_/)
    })
  })

  it('watchProject hands over the replay’s three creation events, in order, before it is ready', async () => {
    await withMock(async (origin) => {
      const types: string[] = []
      const watch = platform(origin).watchProject(fixtures.PROJECT_ID, (event) =>
        types.push(event.type),
      )
      await watch.ready
      watch.close()
      expect(types).toEqual(['project.created', 'repository.seeded', 'spec.validated'])
    })
  })

  it('a create has a deadline of its own, 90 s: on real GitHub it may take ~40 s, and the platform says never under ~60 s (FE-41, as its sitting 4 landed)', async () => {
    const deadlines = vi.spyOn(AbortSignal, 'timeout')
    try {
      await withMock(async (origin) => {
        const p = platform(origin)
        await p.listBlueprints()
        await p.createProject(REQUEST, 'make-0090')
        await p.checkSlug('reading-responses')
      })
      expect(CREATE_TIMEOUT_MS).toBe(90_000)
      expect(deadlines.mock.calls.map(([ms]) => ms)).toEqual([
        READ_TIMEOUT_MS,
        CREATE_TIMEOUT_MS,
        READ_TIMEOUT_MS,
      ])
    } finally {
      deadlines.mockRestore()
    }
  })

  it('createProject and mintToken send the body and the Idempotency-Key they are given', async () => {
    const seen: { url: string | undefined; key: string | undefined; body: unknown }[] = []
    const server = createServer((request, response) => {
      let text = ''
      request.on('data', (chunk) => (text += chunk))
      request.on('end', () => {
        seen.push({
          url: request.url,
          key: request.headers['idempotency-key'] as string | undefined,
          body: JSON.parse(text),
        })
        response.writeHead(500, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ error: { code: 'INTERNAL', message: 'x' } }))
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    try {
      await thrown(() => platform(origin).createProject(REQUEST, 'press-0001'))
      const mint = {
        name: 'Building — x',
        capabilities: ['agent:session' as const],
        expiresInDays: 7,
      }
      await thrown(() => platform(origin).mintToken('p-1', mint, 'mint-0002'))
      expect(seen).toEqual([
        { url: '/v1/projects', key: 'press-0001', body: REQUEST },
        { url: '/v1/projects/p-1/tokens', key: 'mint-0002', body: mint },
      ])
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

/** A platform that records each request's method, path, key and body, and answers `status`. */
async function recording(status: number, answer: unknown) {
  const seen: {
    method: string | undefined
    url: string | undefined
    key: string | undefined
    body: unknown
  }[] = []
  const server = createServer((request, response) => {
    let text = ''
    request.on('data', (chunk) => (text += chunk))
    request.on('end', () => {
      seen.push({
        method: request.method,
        url: request.url,
        key: request.headers['idempotency-key'] as string | undefined,
        body: text === '' ? undefined : JSON.parse(text),
      })
      response.writeHead(status, { 'content-type': 'application/json' })
      response.end(JSON.stringify(answer))
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  return {
    origin,
    seen,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

describe('the dry run (F5 Task 7, moment 12), in the person’s session', () => {
  it('runRehearsal names the project, with the Idempotency-Key it is given and no body, and answers the rehearsal', async () => {
    const fake = await recording(200, fixtures.REHEARSAL)
    try {
      expect(
        await platform(fake.origin).runRehearsal(fixtures.PROJECT.id, 'dry-run-0001'),
      ).toEqual(fixtures.REHEARSAL)
      expect(fake.seen).toEqual([
        {
          method: 'POST',
          url: `/v1/projects/${fixtures.PROJECT.id}/rehearsal`,
          key: 'dry-run-0001',
          body: undefined,
        },
      ])
    } finally {
      await fake.close()
    }
  })

  it('a rehearsal that signed nobody in is a 200, returned, never thrown: a measurement, not an error', async () => {
    const failed = { ...fixtures.REHEARSAL, passed: false }
    const fake = await recording(200, failed)
    try {
      expect(
        (await platform(fake.origin).runRehearsal(fixtures.PROJECT.id, 'dry-run-0002'))
          .passed,
      ).toBe(false)
    } finally {
      await fake.close()
    }
  })

  it('its step-up refusal is thrown with its code, for the page to ask for the second sign-in (Spec action 8 (b))', async () => {
    const fake = await recording(403, envelopeWith('STEP_UP_REQUIRED'))
    try {
      const refusal = refusalOf(
        await thrown(() =>
          platform(fake.origin).runRehearsal(fixtures.PROJECT.id, 'dry-run-0003'),
        ),
      )
      expect(refusal).toMatchObject({ kind: 'refused', code: 'STEP_UP_REQUIRED' })
    } finally {
      await fake.close()
    }
  })

  it('its deadline is 150 s, where every other call keeps 15 s (Decision 8: the platform says up to ~90 s)', async () => {
    const deadlines = vi.spyOn(AbortSignal, 'timeout')
    try {
      await withMock(async (origin) => {
        const p = platform(origin)
        await p.getLaunchReadiness(fixtures.PROJECT.id)
        await p.runRehearsal(fixtures.PROJECT.id, 'dry-run-0004')
        await p.getLaunchRecords(fixtures.PROJECT.id)
      })
      expect(REHEARSAL_TIMEOUT_MS).toBe(150_000)
      expect(deadlines.mock.calls.map(([ms]) => ms)).toEqual([
        READ_TIMEOUT_MS,
        REHEARSAL_TIMEOUT_MS,
        READ_TIMEOUT_MS,
      ])
    } finally {
      deadlines.mockRestore()
    }
  })
})

describe('trying-out (F4 Task 10), in the person’s session', () => {
  it('deploy names the environment it is given, with the release and the Idempotency-Key, and answers the instance', async () => {
    const answered = { ...fixtures.INSTANCE, state: 'healthy' }
    const fake = await recording(200, answered)
    try {
      expect(
        await platform(fake.origin).deploy(fixtures.STAGING_ID, 'r-1', 'put-0001'),
      ).toEqual(answered)
      expect(fake.seen).toEqual([
        {
          method: 'POST',
          url: `/v1/environments/${fixtures.STAGING_ID}/deploy`,
          key: 'put-0001',
          body: { releaseId: 'r-1' },
        },
      ])
    } finally {
      await fake.close()
    }
  })

  it('a deploy answered 200 failed is returned as failed, never thrown (§14)', async () => {
    const fake = await recording(200, { ...fixtures.INSTANCE, state: 'failed' })
    try {
      expect(
        (await platform(fake.origin).deploy(fixtures.STAGING_ID, 'r-1', 'put-0002'))
          .state,
      ).toBe('failed')
    } finally {
      await fake.close()
    }
  })

  it('its deadline is 120 s, where every other call keeps 15 s (F3 Decision 17’s reason: up to ~90 s)', async () => {
    const deadlines = vi.spyOn(AbortSignal, 'timeout')
    try {
      await withMock(async (origin) => {
        const p = platform(origin)
        await p.listInstances(fixtures.STAGING_ID)
        await p.deploy(fixtures.STAGING_ID, fixtures.RELEASE.id, 'put-0003')
        await p.listAppSecrets(fixtures.STAGING_ID)
      })
      expect(DEPLOY_TIMEOUT_MS).toBe(120_000)
      expect(deadlines.mock.calls.map(([ms]) => ms)).toEqual([
        READ_TIMEOUT_MS,
        DEPLOY_TIMEOUT_MS,
        READ_TIMEOUT_MS,
      ])
    } finally {
      deadlines.mockRestore()
    }
  })

  it('listAppSecrets answers each name, declared and set, as fields (S1: M1)', async () => {
    await withMock(async (origin) => {
      const list = await platform(origin).listAppSecrets(fixtures.STAGING_ID)
      expect(list.environmentKind).toBe('staging')
      for (const secret of list.secrets) {
        expect(typeof secret.declared).toBe('boolean')
        expect(typeof secret.set).toBe('boolean')
        expect(Object.keys(secret)).not.toContain('value')
      }
    })
  })

  it('setAppSecret puts the value under its name, with the Idempotency-Key, and answers nothing back', async () => {
    const fake = await recording(200, {
      name: 'SIS_KEY',
      declared: true,
      set: true,
      updatedAt: '2026-09-29T17:00:00.000Z',
    })
    try {
      expect(
        await platform(fake.origin).setAppSecret(
          fixtures.STAGING_ID,
          'SIS_KEY',
          'a-long-value',
          'set-0001',
        ),
      ).toBeUndefined()
      expect(fake.seen).toEqual([
        {
          method: 'PUT',
          url: `/v1/environments/${fixtures.STAGING_ID}/secrets/SIS_KEY`,
          key: 'set-0001',
          body: { value: 'a-long-value' },
        },
      ])
    } finally {
      await fake.close()
    }
  })

  it('a staging secret with no value is refused by its code, the names never read from its message', async () => {
    const fake = await recording(409, {
      error: {
        code: 'RELEASE_SECRET_NOT_SET',
        message:
          'Set each name the message lists: SIS_KEY (PUT /v1/environments/x/secrets/{name})',
      },
    })
    try {
      const error = await thrown(() =>
        platform(fake.origin).deploy(fixtures.STAGING_ID, 'r-1', 'put-0004'),
      )
      expect(refusalOf(error)).toEqual({
        kind: 'refused',
        code: 'RELEASE_SECRET_NOT_SET',
        status: 409,
      })
    } finally {
      await fake.close()
    }
  })
})

describe('refusalOf: by kind and code, never by message', () => {
  it('a session-less read is signed-out', async () => {
    await withMock(async (origin) => {
      const error = await thrown(() => createPlatform({ origin }).getMe())
      expect(refusalOf(error)).toEqual({ kind: 'signed-out' })
    })
  })

  it('a platform that accepts and never answers is unreachable, in time (review #3)', async () => {
    const hanging = createServer(() => undefined)
    await new Promise<void>((resolve) => hanging.listen(0, '127.0.0.1', resolve))
    const { port } = hanging.address() as { port: number }
    try {
      const started = Date.now()
      const error = await thrown(() =>
        createPlatform({ origin: `http://127.0.0.1:${port}`, timeoutMs: 200 }).getMe(),
      )
      expect(refusalOf(error)).toEqual({ kind: 'unreachable' })
      expect(Date.now() - started).toBeLessThan(2000)
    } finally {
      hanging.closeAllConnections()
      await new Promise((resolve) => hanging.close(resolve))
    }
  })

  it('a closed port is unreachable', async () => {
    const error = await thrown(() => platform('http://127.0.0.1:1').getMe())
    expect(refusalOf(error)).toEqual({ kind: 'unreachable' })
  })

  it.each([502, 503, 504])(
    'the edge’s empty %i (the control plane down) is unreachable',
    (status) => {
      expect(refusalOf(new ManifestApiError(status, undefined, 'getMe'))).toEqual({
        kind: 'unreachable',
      })
    },
  )

  it('a code from a newer contract is refused, by its code (Review Focus 4)', () => {
    expect(
      refusalOf(new ManifestApiError(409, envelopeWith('SOMETHING_NEW'), 'x')),
    ).toEqual({
      kind: 'refused',
      code: 'SOMETHING_NEW',
      status: 409,
    })
  })

  it('a refusal carries no message (Review Focus 5)', () => {
    const r = refusalOf(new ManifestApiError(409, envelopeWith('SOMETHING_NEW'), 'x'))
    expect(Object.keys(r)).toEqual(['kind', 'code', 'status'])
    expect(JSON.stringify(r)).not.toMatch(/sha256|§|D23/)
  })

  it("FE-30 and FE-29: a refusal at the mock carries the platform's request id and its limit's facts", async () => {
    await withMock(
      async (origin) => {
        const error = await thrown(() =>
          platform(origin).startIntakeSession('describe-0002'),
        )
        const r = refusalOf(error)
        expect(r).toMatchObject({
          kind: 'refused',
          code: 'INTAKE_DAILY_LIMIT_REACHED',
          status: 409,
        })
        const id = r.kind === 'refused' ? r.requestId : undefined
        expect(id).toMatch(UUID)
        expect(id).toBe((error as ManifestApiError).requestId)
        // FE-29: and the limit's facts, as the platform states them.
        expect(r.kind === 'refused' ? r.limit : undefined).toEqual({
          scope: 'person',
          period: 'day',
          resetsAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          count: expect.any(Number),
        })
      },
      { intake: 'daily-limit' },
    )
  })

  it('FE-29: a refusal with no limit carries none', () => {
    const r = refusalOf(new ManifestApiError(409, envelopeWith('SOMETHING_NEW'), 'x'))
    expect(r.kind === 'refused' && 'limit' in r).toBe(false)
  })

  it("FE-30: a refusal carries the envelope's request id, a UUID, and still no message", () => {
    const envelope = {
      error: { ...envelopeWith('SOMETHING_NEW').error, requestId: REQUEST_ID },
    } as ErrorEnvelope
    const r = refusalOf(new ManifestApiError(409, envelope, 'x'))
    expect(r).toEqual({
      kind: 'refused',
      code: 'SOMETHING_NEW',
      status: 409,
      requestId: REQUEST_ID,
    })
    expect(JSON.stringify(r)).not.toMatch(/sha256|§|D23/)
  })

  it('FE-30: an answer with no envelope carries the header’s id; with neither, none', () => {
    expect(refusalOf(new ManifestApiError(500, undefined, 'x', REQUEST_ID))).toEqual({
      kind: 'refused',
      code: 'UNPARSEABLE',
      status: 500,
      requestId: REQUEST_ID,
    })
    expect(Object.keys(refusalOf(new ManifestApiError(500, undefined, 'x')))).toEqual([
      'kind',
      'code',
      'status',
    ])
  })

  it.each([
    [
      'a refusal with the platform’s id',
      { kind: 'refused', code: 'INTERNAL', status: 500, requestId: REQUEST_ID } as const,
      { code: 'INTERNAL', status: 500, requestId: REQUEST_ID },
    ],
    [
      'a refusal without one',
      { kind: 'refused', code: 'FORBIDDEN', status: 403 } as const,
      { code: 'FORBIDDEN', status: 403 },
    ],
    // Status 0 is no HTTP status: our server refuses a report that sends it (api/problems.ts).
    [
      'something unexpected (status 0)',
      { kind: 'refused', code: 'UNEXPECTED', status: 0 } as const,
      { code: 'UNEXPECTED' },
    ],
    ['nothing answering', { kind: 'unreachable' } as const, { code: 'UNREACHABLE' }],
  ])('reported(%s): what its report carries, exactly', (_, refusal, report) => {
    expect(reported(refusal)).toEqual(report)
  })

  it('anything else is refused as unexpected, never thrown on', () => {
    expect(refusalOf(new Error('a bug of ours'))).toEqual({
      kind: 'refused',
      code: 'UNEXPECTED',
      status: 0,
    })
  })
})

describe('keeping watch and switching (F6 Task 8), in the person’s session', () => {
  const P = '11111111-1111-4111-8111-111111111111'
  const T = 'a0000000-0000-4000-8000-000000000001'

  it('listMembers reads the project’s members, with no key and no body', async () => {
    const answer = [{ userId: 'u-1', role: 'owner' }]
    const r = await recording(200, answer)
    try {
      expect(await createPlatform({ origin: r.origin }).listMembers(P)).toEqual(answer)
      expect(r.seen).toEqual([
        {
          method: 'GET',
          url: `/v1/projects/${P}/members`,
          key: undefined,
          body: undefined,
        },
      ])
    } finally {
      await r.close()
    }
  })

  // Archive and restore take the contract's EmptyRequest, `{}` (required); the two DELETEs no body.
  it.each([
    [
      'revokeToken',
      'DELETE',
      `/v1/tokens/${T}`,
      undefined,
      (p: ReturnType<typeof createPlatform>) => p.revokeToken(T, 'k-1'),
    ],
    [
      'archiveProject',
      'POST',
      `/v1/projects/${P}/archive`,
      {},
      (p: ReturnType<typeof createPlatform>) => p.archiveProject(P, 'k-1'),
    ],
    [
      'restoreProject',
      'POST',
      `/v1/projects/${P}/restore`,
      {},
      (p: ReturnType<typeof createPlatform>) => p.restoreProject(P, 'k-1'),
    ],
    [
      'deleteProject',
      'DELETE',
      `/v1/projects/${P}`,
      undefined,
      (p: ReturnType<typeof createPlatform>) => p.deleteProject(P, 'k-1'),
    ],
  ] as const)(
    '%s sends %s %s with the Idempotency-Key it is given and the body the contract asks, and answers what the platform said',
    async (_name, method, url, body, press) => {
      const answer = { id: 'answered' }
      const r = await recording(200, answer)
      try {
        expect(await press(createPlatform({ origin: r.origin }))).toEqual(answer)
        expect(r.seen).toEqual([{ method, url, key: 'k-1', body }])
      } finally {
        await r.close()
      }
    },
  )

  it('requestApproval (F5b Task 4) asks for the release named, with the Idempotency-Key it is given and the note, and answers the request', async () => {
    const R = 'b0000000-0000-4000-8000-000000000001'
    const answer = { id: 'asked', releaseId: R }
    const r = await recording(200, answer)
    try {
      const p = createPlatform({ origin: r.origin })
      expect(await p.requestApproval(R, { note: 'By 2 November.' }, 'k-1')).toEqual(
        answer,
      )
      expect(await p.requestApproval(R, {}, 'k-2')).toEqual(answer)
      expect(r.seen).toEqual([
        {
          method: 'POST',
          url: `/v1/releases/${R}/approval-request`,
          key: 'k-1',
          body: { note: 'By 2 November.' },
        },
        {
          method: 'POST',
          url: `/v1/releases/${R}/approval-request`,
          key: 'k-2',
          body: {},
        },
      ])
    } finally {
      await r.close()
    }
  })

  it('requestApproval’s refusals are thrown with their codes (RELEASE_NOT_STAGED, APPROVAL_NOT_NEEDED, RELEASE_REJECTED)', async () => {
    for (const code of [
      'RELEASE_NOT_STAGED',
      'APPROVAL_NOT_NEEDED',
      'RELEASE_REJECTED',
    ]) {
      const r = await recording(409, { error: { code, message: 'x' } })
      try {
        const error = await thrown(() =>
          createPlatform({ origin: r.origin }).requestApproval('b-1', {}, 'k-3'),
        )
        expect(refusalOf(error)).toEqual({ kind: 'refused', code, status: 409 })
      } finally {
        await r.close()
      }
    }
  })

  it('a refusal is thrown with its code, for the page to say (a step-up, a switch-off’s teardown)', async () => {
    const r = await recording(403, {
      error: { code: 'STEP_UP_REQUIRED', message: 'x' },
    })
    try {
      const error = await thrown(() =>
        createPlatform({ origin: r.origin }).archiveProject(P, 'k-2'),
      )
      expect(refusalOf(error)).toEqual({
        kind: 'refused',
        code: 'STEP_UP_REQUIRED',
        status: 403,
      })
    } finally {
      await r.close()
    }
  })
})

describe('working on it together (F6b Task 5), in the person’s session', () => {
  const P = '11111111-1111-4111-8111-111111111111'
  const U = 'c0000000-0000-4000-8000-000000000001'
  const A = 'd0000000-0000-4000-8000-000000000001'

  it.each([
    [
      'listTokens',
      `/v1/projects/${P}/tokens`,
      (p: ReturnType<typeof createPlatform>) => p.listTokens(P),
    ],
    [
      'listPendingActions',
      `/v1/projects/${P}/pending-actions`,
      (p: ReturnType<typeof createPlatform>) => p.listPendingActions(P),
    ],
  ] as const)('%s reads GET %s, with no key and no body', async (_name, url, read) => {
    const answer = [{ id: 'listed' }]
    const r = await recording(200, answer)
    try {
      expect(await read(createPlatform({ origin: r.origin }))).toEqual(answer)
      expect(r.seen).toEqual([{ method: 'GET', url, key: undefined, body: undefined }])
    } finally {
      await r.close()
    }
  })

  // addMember sends who and as what; removeMember no body; confirm the contract's EmptyRequest, `{}`;
  // reject `{ reason }`, the platform's required 1–500 characters.
  it.each([
    [
      'addMember',
      'POST',
      `/v1/projects/${P}/members`,
      { email: 'sam@ubc.ca', role: 'collaborator' },
      (p: ReturnType<typeof createPlatform>) =>
        p.addMember(P, { email: 'sam@ubc.ca', role: 'collaborator' }, 'k-1'),
    ],
    [
      'removeMember',
      'DELETE',
      `/v1/projects/${P}/members/${U}`,
      undefined,
      (p: ReturnType<typeof createPlatform>) => p.removeMember(P, U, 'k-1'),
    ],
    [
      'confirmPendingAction',
      'POST',
      `/v1/pending-actions/${A}/confirm`,
      {},
      (p: ReturnType<typeof createPlatform>) => p.confirmPendingAction(A, 'k-1'),
    ],
    [
      'rejectPendingAction',
      'POST',
      `/v1/pending-actions/${A}/reject`,
      { reason: 'No reason given.' },
      (p: ReturnType<typeof createPlatform>) =>
        p.rejectPendingAction(A, 'No reason given.', 'k-1'),
    ],
  ] as const)(
    '%s sends %s %s with the Idempotency-Key it is given and the body the contract asks, and answers what the platform said',
    async (_name, method, url, body, press) => {
      const answer = { id: 'answered' }
      const r = await recording(200, answer)
      try {
        expect(await press(createPlatform({ origin: r.origin }))).toEqual(answer)
        expect(r.seen).toEqual([{ method, url, key: 'k-1', body }])
      } finally {
        await r.close()
      }
    },
  )

  it('a member’s refusal is thrown with its code, for People to say (MEMBER_USER_NOT_FOUND)', async () => {
    const r = await recording(400, {
      error: { code: 'MEMBER_USER_NOT_FOUND', message: 'x' },
    })
    try {
      const error = await thrown(() =>
        createPlatform({ origin: r.origin }).addMember(
          P,
          { cwlLogin: 'sam', role: 'owner' },
          'k-2',
        ),
      )
      expect(refusalOf(error)).toEqual({
        kind: 'refused',
        code: 'MEMBER_USER_NOT_FOUND',
        status: 400,
      })
    } finally {
      await r.close()
    }
  })
})
