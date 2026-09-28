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
