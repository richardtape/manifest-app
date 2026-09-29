import { ManifestApiError, type ErrorEnvelope } from '@manifest/contract'
import { createMockServer, fixtures } from '@manifest/mock'
import { createServer } from 'node:http'
import { describe, expect, it } from 'vitest'
import { createPlatform } from './api.js'
import { refusalOf } from './refusal.js'

/**
 * THE ONE PLACE THAT CALLS THE PLATFORM, against an in-process manifest-mock (the
 * console's api.test.ts pattern). In Node, `@manifest/contract` sends the session and the
 * Origin as headers; in a browser it sends neither, because the browser does. That is why
 * this file runs in `node` and never under jsdom (sitting 2's note).
 */
async function withMock<T>(fn: (origin: string) => Promise<T>): Promise<T> {
  const server = createMockServer({ scanSilenceMs: 50 })
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

  it('anything else is refused as unexpected, never thrown on', () => {
    expect(refusalOf(new Error('a bug of ours'))).toEqual({
      kind: 'refused',
      code: 'UNEXPECTED',
      status: 0,
    })
  })
})
