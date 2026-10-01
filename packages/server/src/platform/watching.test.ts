import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { PlatformRefusal } from './refusal.js'
import { platformWatching } from './watching.js'

/**
 * F6 TASK 3: THE WATCH TOKEN'S READS, and nothing else (Global Constraints): `getProject` with
 * its environments, for the app and its students' address, and `listMembers`, for who owns it.
 * What was SENT is asserted, against a recording fake answering the shapes F6's sitting 1
 * measured on 7100 (M2).
 */
interface Seen {
  method: string | undefined
  url: string | undefined
  headers: IncomingHttpHeaders
}

const closers: (() => Promise<unknown>)[] = []
afterEach(async () => {
  for (const close of closers.splice(0)) await close()
})

async function fakePlatform(answer: (seen: Seen) => { status: number; body?: unknown }) {
  const seen: Seen[] = []
  const server: Server = createServer((request, response) => {
    const one = { method: request.method, url: request.url, headers: request.headers }
    seen.push(one)
    const reply = answer(one)
    response.writeHead(reply.status, { 'content-type': 'application/json' })
    response.end(reply.body === undefined ? '' : JSON.stringify(reply.body))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  closers.push(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections()
        server.close(resolve)
      }),
  )
  return {
    origin: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    seen,
  }
}

const TOKEN = 'mft_test_w_the_keeping_watch_token'
const PROJECT = '6af9d7e5-2aa5-48fd-a1c8-85a6800cc687'

const environment = (kind: string, hostname: string) => ({
  id: `0000000${kind.length}-0000-4000-8000-000000000000`,
  projectId: PROJECT,
  kind,
  hostname,
  url: `https://${hostname}`,
  instance: null,
})
const PROJECT_BODY = {
  id: PROJECT,
  slug: 'f6-watch',
  name: 'F6 watch',
  blueprint: 'node-ts-mongo@1',
  starter: 'proof-app',
  owner: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  audience: { kind: 'class' },
  createdAt: '2026-10-01T16:47:00.000Z',
  launchedAt: '2026-10-01T17:05:13.000Z',
  state: 'active',
  archivedAt: null,
  repository: null,
  environments: [
    environment('sandbox', 'f6-watch.sandbox.manifest.internal'),
    environment('staging', 'f6-watch.staging.manifest.internal'),
    environment('production', 'f6-watch.manifest.internal'),
  ],
}
const MEMBERS = [
  {
    userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    puid: 'ins000001',
    cwlLogin: 'instructor',
    displayName: 'Test Instructor',
    email: 'instructor@ubc.ca',
    role: 'owner',
  },
  {
    userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    puid: 'col000002',
    cwlLogin: null,
    displayName: 'A Helper',
    email: 'helper@ubc.ca',
    role: 'collaborator',
  },
]

describe('the watch token’s reads (F6 Task 3)', () => {
  it('app: getProject with its environments, production’s url the students’ address', async () => {
    const fake = await fakePlatform(() => ({ status: 200, body: PROJECT_BODY }))
    expect(await platformWatching(fake.origin).app(TOKEN, PROJECT)).toEqual({
      projectId: PROJECT,
      name: 'F6 watch',
      slug: 'f6-watch',
      state: 'active',
      launchedAt: '2026-10-01T17:05:13.000Z',
      studentsUrl: 'https://f6-watch.manifest.internal',
    })
    expect(fake.seen).toHaveLength(1)
    expect(fake.seen[0]?.method).toBe('GET')
    expect(fake.seen[0]?.url).toBe(`/v1/projects/${PROJECT}?expand=environments`)
  })

  it('app: switched off, and with no production listed, no students’ address', async () => {
    const fake = await fakePlatform(() => ({
      status: 200,
      body: {
        ...PROJECT_BODY,
        state: 'archived',
        archivedAt: '2026-12-12T00:00:00.000Z',
        environments: PROJECT_BODY.environments.slice(0, 2),
      },
    }))
    expect(await platformWatching(fake.origin).app(TOKEN, PROJECT)).toMatchObject({
      state: 'archived',
      studentsUrl: null,
    })
  })

  it('members: each one’s id, role, name and address, and nothing else (never a PUID)', async () => {
    const fake = await fakePlatform(() => ({ status: 200, body: MEMBERS }))
    const members = await platformWatching(fake.origin).members(TOKEN, PROJECT)
    expect(members).toEqual([
      {
        userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        role: 'owner',
        displayName: 'Test Instructor',
        email: 'instructor@ubc.ca',
      },
      {
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        role: 'collaborator',
        displayName: 'A Helper',
        email: 'helper@ubc.ca',
      },
    ])
    expect(fake.seen[0]?.url).toBe(`/v1/projects/${PROJECT}/members`)
  })

  it.each([401, 403, 404])(
    'a refusal (%i) is a PlatformRefusal with its status',
    async (status) => {
      const fake = await fakePlatform(() => ({
        status,
        body: { error: { code: 'NOPE', message: 'no' } },
      }))
      const refused = await platformWatching(fake.origin)
        .app(TOKEN, PROJECT)
        .catch((error: unknown) => error)
      expect(refused).toBeInstanceOf(PlatformRefusal)
      expect((refused as PlatformRefusal).status).toBe(status)
    },
  )

  it('nothing answering is PLATFORM_UNAVAILABLE', async () => {
    const refused = await platformWatching('http://127.0.0.1:9')
      .members(TOKEN, PROJECT)
      .catch((error: unknown) => error)
    expect(refused).toBeInstanceOf(PlatformRefusal)
    expect((refused as PlatformRefusal).code).toBe('PLATFORM_UNAVAILABLE')
  })

  it('every call carries the watch token, and never a Cookie (FE-2)', async () => {
    const fake = await fakePlatform((seen) =>
      seen.url?.endsWith('/members')
        ? { status: 200, body: MEMBERS }
        : { status: 200, body: PROJECT_BODY },
    )
    const watching = platformWatching(fake.origin)
    await watching.app(TOKEN, PROJECT)
    await watching.members(TOKEN, PROJECT)
    expect(fake.seen).toHaveLength(2)
    for (const seen of fake.seen) {
      expect(seen.headers.authorization).toBe(`Bearer ${TOKEN}`)
      expect(seen.headers.cookie).toBeUndefined()
    }
  })
})
