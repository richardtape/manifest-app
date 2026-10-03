import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { platformAgentSessions } from './agent-sessions.js'
import { platformBuilds } from './builds.js'
import { platformInstances } from './instances.js'
import { platformMembers } from './members.js'
import {
  CommitRefused,
  DEPLOY_TIMEOUT_MS,
  PLATFORM_TIMEOUT_MS,
  PlatformRefusal,
} from './refusal.js'
import { platformReleases } from './releases.js'
import { platformSecrets } from './secrets.js'
import { platformSource, type Sent } from './source.js'

/**
 * F3 TASK 4: THE PLATFORM CALLS FOR BUILDING, each against a recording fake that answers
 * with the shapes F3's sitting 1 recorded on the real platform (M1, M4). **What was SENT is
 * asserted**, never only what came back: the mock answers its own examples whatever is asked
 * (M2), and so could never show a call naming the wrong thing.
 */
interface Seen {
  method: string | undefined
  url: string | undefined
  headers: IncomingHttpHeaders
  body: unknown
}
type Reply = { status: number; body?: unknown; afterMs?: number }

/** Every request any fake in this file received: the last case reads them all (FE-2). */
const everything: Seen[] = []
const closers: (() => Promise<unknown>)[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  for (const close of closers.splice(0).reverse()) await close()
})

async function fakePlatform(answer: (seen: Seen, count: number) => Reply) {
  const seen: Seen[] = []
  const server: Server = createServer((request, response) => {
    let text = ''
    request.on('data', (chunk) => (text += chunk))
    request.on('end', () => {
      const one = {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: text === '' ? undefined : JSON.parse(text),
      }
      seen.push(one)
      everything.push(one)
      const reply = answer(one, seen.length)
      const send = () => {
        if (response.destroyed) return
        response.writeHead(reply.status, { 'content-type': 'application/json' })
        response.end(reply.body === undefined ? '' : JSON.stringify(reply.body))
      }
      if (reply.afterMs === undefined) send()
      else setTimeout(send, reply.afterMs)
    })
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

const TOKEN = 'mft_test_x_the_conversations_token'
const PROJECT = '6af9d7e5-2aa5-48fd-a1c8-85a6800cc687'
const SANDBOX = 'e08ec65f-d36f-462e-b6a9-4c8655a77e54'
const STAGING = '358558f7-9614-4787-8324-d4d300e8a1fd'
const PRODUCTION = '7a1d2c3e-4f50-4617-8829-3a4b5c6d7e8f'
const SHA = '169f00cf5aeb43689077cc56ec7c3e5f524ed95a'
const NEXT = '23ed148f924ee0d410ad552938cd902d3c037a98'
const BUILD = '60088ac3-31b8-42a0-9a4b-0ac3a0803070'
const RELEASE = 'd8d4ce63-5eaf-47c2-afba-13ffd829f921'
const INSTANCE = 'b7669db8-684b-49bf-883a-e599831212ef'
const STAGING_INSTANCE = '66666666-6666-4666-8666-666666666666'
const PERSON = 'b7296956-e133-47fa-90d1-e53bb5564bd9'

const refusal = (status: number, code: string, extra: object = {}) => ({
  status,
  body: {
    error: { code, message: `the platform's own words for ${code}`, ...extra },
  },
})
const ok = (body: unknown, status = 200) => ({ status, body })
const path = (seen: Seen) => seen.url?.split('?')[0]
const query = (seen: Seen) => new URL(`http://x${seen.url}`).searchParams

/** listEnvironments as M1 recorded it; staging first, so a first-in-the-list pick is caught. */
const ENVIRONMENTS = [
  {
    id: STAGING,
    projectId: PROJECT,
    kind: 'staging',
    hostname: 'f3-measure.staging.manifest.internal',
    url: 'https://f3-measure.staging.manifest.internal',
    instance: null,
  },
  {
    id: SANDBOX,
    projectId: PROJECT,
    kind: 'sandbox',
    hostname: 'f3-measure.sandbox.manifest.internal',
    url: 'https://f3-measure.sandbox.manifest.internal',
    instance: null,
  },
  {
    id: PRODUCTION,
    projectId: PROJECT,
    kind: 'production',
    hostname: 'f3-measure.manifest.internal',
    url: 'https://f3-measure.manifest.internal',
    instance: null,
  },
]
const instance = (id: string, environmentId: string, state: string) => ({
  id,
  environmentId,
  releaseId: RELEASE,
  kind: 'web',
  state,
  lastSeenAt: null,
})

async function failure(promise: Promise<unknown>): Promise<Error> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(Error)
  return error as Error
}

describe('source: the tree, a file, and a commit (M1)', () => {
  it('tree keeps only the files, with their size and whether they are binary', async () => {
    const fake = await fakePlatform(() =>
      ok({
        ref: 'main',
        commitSha: SHA,
        entries: [
          { path: 'server.js', type: 'file', mode: '100644', size: 15541, binary: false },
          { path: 'public', type: 'directory', mode: '040000', size: null, binary: null },
          { path: 'logo.png', type: 'file', mode: '100644', size: 812, binary: true },
          { path: 'link', type: 'symlink', mode: '120000', size: null, binary: null },
        ],
        truncated: false,
      }),
    )
    expect(await platformSource(fake.origin).tree(TOKEN, PROJECT)).toEqual({
      commitSha: SHA,
      paths: [
        { path: 'server.js', size: 15541, binary: false },
        { path: 'logo.png', size: 812, binary: true },
      ],
      truncated: false,
    })
    expect([fake.seen[0]?.method, path(fake.seen[0]!)]).toEqual([
      'GET',
      `/v1/projects/${PROJECT}/tree`,
    ])
  })

  it('file reads one path at the commit it names', async () => {
    const fake = await fakePlatform(() =>
      ok({
        ref: SHA,
        commitSha: SHA,
        path: 'server.js',
        content: 'import express from "express"\n',
        encoding: 'utf8',
        size: 31,
        mode: '100644',
        blobSha: 'a'.repeat(40),
      }),
    )
    expect(
      await platformSource(fake.origin).file(TOKEN, PROJECT, 'server.js', SHA),
    ).toEqual({ content: 'import express from "express"\n' })
    expect(path(fake.seen[0]!)).toBe(`/v1/projects/${PROJECT}/file`)
    expect(Object.fromEntries(query(fake.seen[0]!))).toMatchObject({
      path: 'server.js',
      ref: SHA,
    })
  })

  it.each([
    ['SOURCE_FILE_TOO_LARGE', 'too-large'],
    ['SOURCE_FILE_NOT_TEXT', 'not-text'],
    ['SOURCE_PATH_NOT_A_FILE', 'not-a-file'],
    ['SOURCE_PATH_NOT_FOUND', 'not-found'],
  ])('file answers %s as the reason "%s", never a crash', async (code, reason) => {
    const fake = await fakePlatform(() => refusal(409, code))
    expect(await platformSource(fake.origin).file(TOKEN, PROJECT, 'x.js', SHA)).toEqual({
      unreadable: reason,
    })
  })

  it('file throws any other refusal, by its code', async () => {
    const fake = await fakePlatform(() => refusal(503, 'SOURCE_UNREACHABLE'))
    const error = await failure(
      platformSource(fake.origin).file(TOKEN, PROJECT, 'x.js', SHA),
    )
    expect(error).toBeInstanceOf(PlatformRefusal)
    expect((error as PlatformRefusal).code).toBe('SOURCE_UNREACHABLE')
  })

  const CHANGES = [
    {
      op: 'write' as const,
      path: 'routes/posts.js',
      content: 'export const posts = []\n',
    },
    { op: 'delete' as const, path: 'public/app.js' },
  ]
  const COMMITTED = (dryRun: boolean) =>
    ok(
      {
        dryRun,
        commitSha: dryRun ? null : NEXT,
        parent: SHA,
        changes: [
          { path: 'routes/posts.js', status: 'added' },
          { path: 'public/app.js', status: 'deleted' },
        ],
        spec: {
          appSpecId: dryRun ? null : '4c1917f4-f09d-4d5b-a866-e42714b91f04',
          sensitiveDiff: { sensitive: false, fields: [] },
          warnings: [
            {
              code: 'SPEC_FIELD_NOT_ENFORCED',
              path: 'ai.budget.per_user_monthly_usd',
              message: 'validated and recorded, not enforced',
              hint: 'Nothing to fix.',
            },
          ],
        },
      },
      201,
    )

  it('commit dry-runs, then commits: the same body but dryRun, baseCommit as given, two Idempotency-Keys', async () => {
    const fake = await fakePlatform((seen) =>
      COMMITTED((seen.body as { dryRun?: boolean }).dryRun === true),
    )
    const answer = await platformSource(fake.origin).commit(TOKEN, PROJECT, {
      baseCommit: SHA,
      message: 'Two pages',
      changes: CHANGES,
    })
    expect(answer).toEqual({
      commitSha: NEXT,
      changed: [
        { path: 'routes/posts.js', status: 'added' },
        { path: 'public/app.js', status: 'deleted' },
      ],
      warnings: [
        {
          code: 'SPEC_FIELD_NOT_ENFORCED',
          path: 'ai.budget.per_user_monthly_usd',
          hint: 'Nothing to fix.',
        },
      ],
      sensitive: [],
    })
    const [dry, real] = fake.seen as [Seen, Seen]
    expect(dry.body).toEqual({
      baseCommit: SHA,
      message: 'Two pages',
      changes: CHANGES,
      dryRun: true,
    })
    expect(real.body).toEqual({ baseCommit: SHA, message: 'Two pages', changes: CHANGES })
    expect([dry.method, path(dry)]).toEqual(['POST', `/v1/projects/${PROJECT}/commits`])
    expect(String(dry.headers['idempotency-key'])).toMatch(/^.{8,}$/)
    expect(dry.headers['idempotency-key']).not.toBe(real.headers['idempotency-key'])
  })

  it("commit says which sensitive fields the commit changes, from the commit's own answer, never the dry run's (F6b Task 8)", async () => {
    const fake = await fakePlatform((seen) => {
      const dryRun = (seen.body as { dryRun?: boolean }).dryRun === true
      const answer = COMMITTED(dryRun)
      const body = answer.body as { spec: { sensitiveDiff: unknown } }
      body.spec.sensitiveDiff = dryRun
        ? { sensitive: true, fields: ['services'] }
        : { sensitive: true, fields: ['egress.allow', 'auth.attributes'] }
      return answer
    })
    const answer = await platformSource(fake.origin).commit(TOKEN, PROJECT, {
      baseCommit: SHA,
      message: 'Read the calendar',
      changes: CHANGES,
    })
    expect(answer.sensitive).toEqual(['egress.allow', 'auth.attributes'])
  })

  it('commit with no sensitiveDiff in its answer says no sensitive field', async () => {
    const fake = await fakePlatform((seen) => {
      const answer = COMMITTED((seen.body as { dryRun?: boolean }).dryRun === true)
      delete (answer.body as { spec: { sensitiveDiff?: unknown } }).spec.sensitiveDiff
      return answer
    })
    const answer = await platformSource(fake.origin).commit(TOKEN, PROJECT, {
      baseCommit: SHA,
      message: 'Two pages',
      changes: CHANGES,
    })
    expect(answer.sensitive).toEqual([])
  })

  it('commit records what it sent, call by call, even when a call is refused', async () => {
    const fake = await fakePlatform(() => refusal(409, 'SOURCE_CONFLICT'))
    const sent: Sent[] = []
    await failure(
      platformSource(fake.origin).commit(
        TOKEN,
        PROJECT,
        { baseCommit: SHA, message: 'm', changes: CHANGES },
        sent,
      ),
    )
    expect(sent).toEqual([
      { dryRun: true, baseCommit: SHA, paths: ['routes/posts.js', 'public/app.js'] },
    ])
  })

  it("SPEC_INVALID is a CommitRefused carrying each detail's path, code and hint, and no message; nothing is committed", async () => {
    const fake = await fakePlatform(() =>
      refusal(422, 'SPEC_INVALID', {
        hint: 'Fix each path `details` lists in manifest.yaml, then commit again.',
        details: [
          {
            code: 'SPEC_BUILD_BLOCK_FORBIDDEN',
            path: 'runtime.build',
            message: 'an app may not supply its own build definition',
            hint: 'Remove the build block.',
          },
          { code: 'SPEC_UNKNOWN_KEY', path: 'runtime.colour', message: 'no such key' },
        ],
      }),
    )
    const error = await failure(
      platformSource(fake.origin).commit(TOKEN, PROJECT, {
        baseCommit: SHA,
        message: 'm',
        changes: CHANGES,
      }),
    )
    expect(error).toBeInstanceOf(CommitRefused)
    expect((error as CommitRefused).code).toBe('SPEC_INVALID')
    expect((error as CommitRefused).details).toEqual([
      {
        path: 'runtime.build',
        code: 'SPEC_BUILD_BLOCK_FORBIDDEN',
        hint: 'Remove the build block.',
      },
      { path: 'runtime.colour', code: 'SPEC_UNKNOWN_KEY', hint: null },
    ])
    expect(JSON.stringify(error)).not.toContain('build definition')
    expect(error.message).not.toContain("the platform's own words")
    expect(fake.seen).toHaveLength(1)
  })

  it('SOURCE_CONFLICT is thrown by its code, and no commit follows the dry run', async () => {
    const fake = await fakePlatform(() => refusal(409, 'SOURCE_CONFLICT'))
    const error = await failure(
      platformSource(fake.origin).commit(TOKEN, PROJECT, {
        baseCommit: SHA,
        message: 'm',
        changes: CHANGES,
      }),
    )
    expect(error).toBeInstanceOf(PlatformRefusal)
    expect(error).not.toBeInstanceOf(CommitRefused)
    expect((error as PlatformRefusal).code).toBe('SOURCE_CONFLICT')
    expect(fake.seen).toHaveLength(1)
  })
})

describe('builds (M1, M4)', () => {
  const BUILT = (status: string) => ({
    id: BUILD,
    projectId: PROJECT,
    commitSha: SHA,
    status,
    imageDigest: null,
    error: status === 'failed' ? 'BUILD_FAILED: build failed (exit 1)' : null,
    scan: null,
    createdAt: '2026-09-28T20:28:00.000Z',
  })

  it('start names the commit it was given, with an Idempotency-Key, and answers the build as it is', async () => {
    const fake = await fakePlatform(() => ok(BUILT('pending'), 202))
    expect(await platformBuilds(fake.origin).start(TOKEN, PROJECT, SHA)).toEqual({
      id: BUILD,
      commitSha: SHA,
      status: 'pending',
      error: null,
    })
    const [sent] = fake.seen as [Seen]
    expect([sent.method, path(sent), sent.body]).toEqual([
      'POST',
      `/v1/projects/${PROJECT}/builds`,
      { commitSha: SHA },
    ])
    expect(String(sent.headers['idempotency-key'])).toMatch(/^.{8,}$/)
  })

  it('get reads the build; log reads its tail as lines of text', async () => {
    const fake = await fakePlatform((seen) =>
      path(seen)?.endsWith('/logs')
        ? ok({
            buildId: BUILD,
            lines: [
              {
                seq: 48,
                stream: 'stderr',
                text: 'npm error code EUSAGE',
                at: '2026-09-28T20:32:09Z',
              },
              {
                seq: 52,
                stream: 'stderr',
                text: 'npm error Missing: marked@14.1.0 from lock file',
                at: '2026-09-28T20:32:09Z',
              },
            ],
          })
        : ok(BUILT('failed')),
    )
    const builds = platformBuilds(fake.origin)
    expect(await builds.get(TOKEN, BUILD)).toMatchObject({
      status: 'failed',
      error: 'BUILD_FAILED: build failed (exit 1)',
    })
    expect(await builds.log(TOKEN, BUILD, 200)).toEqual([
      'npm error code EUSAGE',
      'npm error Missing: marked@14.1.0 from lock file',
    ])
    expect(path(fake.seen[0]!)).toBe(`/v1/builds/${BUILD}`)
    expect(path(fake.seen[1]!)).toBe(`/v1/builds/${BUILD}/logs`)
    expect(query(fake.seen[1]!).get('tail')).toBe('200')
  })
})

describe('releases: the sandbox, and only the sandbox (Global Constraints)', () => {
  it('create names the build, with a summary cut to 500 characters, and answers its id', async () => {
    const fake = await fakePlatform(() =>
      ok({ id: RELEASE, projectId: PROJECT, buildId: BUILD }, 201),
    )
    expect(
      await platformReleases(fake.origin).create(TOKEN, PROJECT, BUILD, 'x'.repeat(600)),
    ).toEqual({
      id: RELEASE,
    })
    const [sent] = fake.seen as [Seen]
    expect([sent.method, path(sent)]).toEqual([
      'POST',
      `/v1/projects/${PROJECT}/releases`,
    ])
    expect(sent.body).toEqual({ buildId: BUILD, summary: 'x'.repeat(500) })
    expect(String(sent.headers['idempotency-key'])).toMatch(/^.{8,}$/)
  })

  it('sandbox answers the sandbox, wherever the list puts it', async () => {
    const fake = await fakePlatform(() => ok(ENVIRONMENTS))
    expect(await platformReleases(fake.origin).sandbox(TOKEN, PROJECT)).toEqual({
      environmentId: SANDBOX,
      hostname: 'f3-measure.sandbox.manifest.internal',
      url: 'https://f3-measure.sandbox.manifest.internal',
    })
  })

  it("deploy names the sandbox's environment, and no other, with the release and an Idempotency-Key", async () => {
    const fake = await fakePlatform((seen) =>
      seen.method === 'GET'
        ? ok(ENVIRONMENTS)
        : ok(instance(INSTANCE, SANDBOX, 'healthy')),
    )
    expect(await platformReleases(fake.origin).deploy(TOKEN, PROJECT, RELEASE)).toEqual({
      id: INSTANCE,
      releaseId: RELEASE,
      state: 'healthy',
    })
    const deploys = fake.seen.filter((s) => s.method === 'POST')
    expect(deploys.map(path)).toEqual([`/v1/environments/${SANDBOX}/deploy`])
    expect(deploys[0]?.body).toEqual({ releaseId: RELEASE })
    expect(fake.seen.some((s) => s.url?.includes(STAGING))).toBe(false)
  })

  it('a deploy answered 200 failed is returned as failed, never thrown (M4: after 91 s)', async () => {
    const fake = await fakePlatform((seen) =>
      seen.method === 'GET'
        ? ok(ENVIRONMENTS)
        : ok(instance(INSTANCE, SANDBOX, 'failed')),
    )
    expect(
      await platformReleases(fake.origin).deploy(TOKEN, PROJECT, RELEASE),
    ).toMatchObject({
      state: 'failed',
    })
  })

  it('deploy waits past the deadline every other call keeps (Decision 17)', async () => {
    const fake = await fakePlatform((seen) =>
      seen.method === 'GET'
        ? { ...ok(ENVIRONMENTS), afterMs: seen.url?.includes('slow') ? 400 : 0 }
        : { ...ok(instance(INSTANCE, SANDBOX, 'healthy')), afterMs: 250 },
    )
    const releases = platformReleases(fake.origin, { callMs: 100, deployMs: 1000 })
    expect(await releases.deploy(TOKEN, PROJECT, RELEASE)).toMatchObject({
      state: 'healthy',
    })
    const error = await failure(releases.sandbox(TOKEN, 'slow'))
    expect((error as PlatformRefusal).code).toBe('PLATFORM_UNAVAILABLE')
  })

  it('its deadlines are 120 s for deploy and F1’s 15 s for everything else', async () => {
    const deadlines = vi.spyOn(AbortSignal, 'timeout')
    const fake = await fakePlatform((seen) =>
      seen.method === 'GET'
        ? ok(ENVIRONMENTS)
        : ok(instance(INSTANCE, SANDBOX, 'healthy')),
    )
    await platformReleases(fake.origin).deploy(TOKEN, PROJECT, RELEASE)
    expect(DEPLOY_TIMEOUT_MS).toBe(120_000)
    expect(deadlines.mock.calls.map(([ms]) => ms)).toEqual([
      PLATFORM_TIMEOUT_MS,
      DEPLOY_TIMEOUT_MS,
    ])
  })
})

describe('instances: what is on the draft address, and what it printed', () => {
  const LISTED = (environmentId: string) =>
    ok({
      environmentId,
      instances: [
        {
          ...instance('c9e0a517-631a-4759-87e0-21ec3f19d857', environmentId, 'failed'),
          serving: false,
        },
        { ...instance(INSTANCE, environmentId, 'healthy'), serving: true },
      ],
      truncated: false,
    })

  it('list answers each instance with whether it serves', async () => {
    const fake = await fakePlatform(() => LISTED(SANDBOX))
    expect(await platformInstances(fake.origin).list(TOKEN, SANDBOX)).toEqual([
      {
        id: 'c9e0a517-631a-4759-87e0-21ec3f19d857',
        releaseId: RELEASE,
        state: 'failed',
        serving: false,
      },
      { id: INSTANCE, releaseId: RELEASE, state: 'healthy', serving: true },
    ])
    expect(path(fake.seen[0]!)).toBe(`/v1/environments/${SANDBOX}/instances`)
  })

  it("output reads a sandbox instance's last lines, as text", async () => {
    const fake = await fakePlatform((seen) => {
      if (path(seen)?.endsWith('/environments')) return ok(ENVIRONMENTS)
      if (path(seen)?.endsWith('/instances')) return LISTED(SANDBOX)
      return ok({
        instanceId: INSTANCE,
        environmentId: SANDBOX,
        environmentKind: 'sandbox',
        readAt: '2026-09-28T20:28:45Z',
        lines: [
          {
            at: '2026-09-28T20:28:44Z',
            stamped: true,
            stream: 'stdout',
            text: 'proof app listening',
          },
        ],
        truncated: { lines: false, bytes: false },
        failure: null,
      })
    })
    expect(
      await platformInstances(fake.origin).output(TOKEN, PROJECT, INSTANCE, 100),
    ).toEqual({
      lines: ['proof app listening'],
      failure: null,
    })
    const read = fake.seen.find((s) => path(s)?.endsWith('/output'))
    expect(path(read!)).toBe(`/v1/instances/${INSTANCE}/output`)
    expect(query(read!).get('lines')).toBe('100')
    expect(fake.seen.find((s) => path(s)?.endsWith('/instances'))?.url).toContain(SANDBOX)
  })

  it('output refuses an instance the sandbox does not list, before anything is read from it', async () => {
    const fake = await fakePlatform((seen) =>
      path(seen)?.endsWith('/environments') ? ok(ENVIRONMENTS) : LISTED(SANDBOX),
    )
    const error = await failure(
      platformInstances(fake.origin).output(TOKEN, PROJECT, STAGING_INSTANCE, 100),
    )
    expect((error as PlatformRefusal).code).toBe('SANDBOX_ONLY')
    expect(fake.seen.some((s) => path(s)?.endsWith('/output'))).toBe(false)
  })

  it('output answers INSTANCE_OUTPUT_UNAVAILABLE as unavailable (M4: a failed instance)', async () => {
    const fake = await fakePlatform((seen) => {
      if (path(seen)?.endsWith('/environments')) return ok(ENVIRONMENTS)
      if (path(seen)?.endsWith('/instances')) return LISTED(SANDBOX)
      return refusal(409, 'INSTANCE_OUTPUT_UNAVAILABLE')
    })
    expect(
      await platformInstances(fake.origin).output(TOKEN, PROJECT, INSTANCE, 100),
    ).toEqual({
      unavailable: true,
    })
  })

  it('incidents answers each with its words, for the explaining agent and the lead (Decision 8)', async () => {
    const fake = await fakePlatform(() =>
      ok({
        environmentId: SANDBOX,
        incidents: [
          {
            id: '98164f37-b25e-4e29-b448-47971377a346',
            instanceId: 'c9e0a517-631a-4759-87e0-21ec3f19d857',
            releaseId: RELEASE,
            exitReason: 'the process exited with code 1',
            logTail: "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/missing.js'",
            failedCheck: 'readiness: GET /healthz … after 87 attempt(s)',
            diffSinceHealthy: '- the code changed: commit 169f00c → 23ed148',
            createdAt: '2026-09-28T20:32:00Z',
            prompt: 'The application failed to start in its sandbox environment.',
          },
        ],
      }),
    )
    expect(await platformInstances(fake.origin).incidents(TOKEN, SANDBOX)).toEqual([
      {
        id: '98164f37-b25e-4e29-b448-47971377a346',
        instanceId: 'c9e0a517-631a-4759-87e0-21ec3f19d857',
        releaseId: RELEASE,
        exitReason: 'the process exited with code 1',
        logTail: "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/missing.js'",
        failedCheck: 'readiness: GET /healthz … after 87 attempt(s)',
        diffSinceHealthy: '- the code changed: commit 169f00c → 23ed148',
        prompt: 'The application failed to start in its sandbox environment.',
      },
    ])
    expect(path(fake.seen[0]!)).toBe(`/v1/environments/${SANDBOX}/incidents`)
  })

  const STAGING_INCIDENT = {
    id: '4b2f3a60-0c38-4f86-9d43-4f7c1f2f7a10',
    instanceId: 'd1e0a517-631a-4759-87e0-21ec3f19d857',
    releaseId: RELEASE,
    exitReason: 'the process exited with code 1',
    logTail: "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/count.js'",
    failedCheck: 'readiness: GET /healthz … after 87 attempt(s)',
    diffSinceHealthy: '- the code changed',
    createdAt: '2026-09-29T01:00:00Z',
    prompt: 'The application failed to start in its staging environment.',
  }

  it("incident finds a fix's incident by its id on the staging environment, by its kind (F4 Task 8)", async () => {
    const fake = await fakePlatform((seen) =>
      seen.url?.endsWith('/environments')
        ? ok(ENVIRONMENTS)
        : ok({ environmentId: STAGING, incidents: [STAGING_INCIDENT] }),
    )
    const instances = platformInstances(fake.origin)
    expect(
      await instances.incident(TOKEN, PROJECT, 'staging', STAGING_INCIDENT.id),
    ).toMatchObject({
      id: STAGING_INCIDENT.id,
      logTail: STAGING_INCIDENT.logTail,
      prompt: STAGING_INCIDENT.prompt,
    })
    expect(fake.seen.map(path)).toEqual([
      `/v1/projects/${PROJECT}/environments`,
      `/v1/environments/${STAGING}/incidents`,
    ])
    expect(
      await instances.incident(
        TOKEN,
        PROJECT,
        'staging',
        '00000000-0000-4000-8000-000000000000',
      ),
    ).toBeUndefined()
  })

  it("and on production's, for a fix of a start on the live address (F5 Decision 13): never another address's", async () => {
    const LIVE_INCIDENT = {
      ...STAGING_INCIDENT,
      id: '5c3a4b71-1d49-4a97-8e5f-5a8d2e3f8b21',
      prompt: 'The application failed to start in its production environment.',
    }
    const fake = await fakePlatform((seen) =>
      seen.url?.endsWith('/environments')
        ? ok(ENVIRONMENTS)
        : path(seen) === `/v1/environments/${PRODUCTION}/incidents`
          ? ok({ environmentId: PRODUCTION, incidents: [LIVE_INCIDENT] })
          : ok({ environmentId: STAGING, incidents: [STAGING_INCIDENT] }),
    )
    const instances = platformInstances(fake.origin)
    expect(
      await instances.incident(TOKEN, PROJECT, 'production', LIVE_INCIDENT.id),
    ).toMatchObject({ id: LIVE_INCIDENT.id, prompt: LIVE_INCIDENT.prompt })
    expect(fake.seen.map(path)).toEqual([
      `/v1/projects/${PROJECT}/environments`,
      `/v1/environments/${PRODUCTION}/incidents`,
    ])
    // Staging's incident is not production's, whatever its id.
    expect(
      await instances.incident(TOKEN, PROJECT, 'production', STAGING_INCIDENT.id),
    ).toBeUndefined()
  })

  it.each(['staging', 'production'] as const)(
    "a confidential app's %s incident refused to our token is `confidential`, and read no other way",
    async (environment) => {
      const fake = await fakePlatform((seen) =>
        seen.url?.endsWith('/environments')
          ? ok(ENVIRONMENTS)
          : refusal(403, 'INCIDENT_LOG_CONFIDENTIAL'),
      )
      expect(
        await platformInstances(fake.origin).incident(
          TOKEN,
          PROJECT,
          environment,
          STAGING_INCIDENT.id,
        ),
      ).toBe('confidential')
      expect(fake.seen).toHaveLength(2)
    },
  )

  it('any other refusal is thrown, by its code', async () => {
    const fake = await fakePlatform((seen) =>
      seen.url?.endsWith('/environments')
        ? ok(ENVIRONMENTS)
        : refusal(503, 'PLATFORM_UNAVAILABLE'),
    )
    const error = await failure(
      platformInstances(fake.origin).incident(
        TOKEN,
        PROJECT,
        'production',
        STAGING_INCIDENT.id,
      ),
    )
    expect((error as PlatformRefusal).code).toBe('PLATFORM_UNAVAILABLE')
  })
})

describe("secrets: a secret's value, in the sandbox alone (Task 8)", () => {
  it('sets it in the sandbox, under the name as given, with an Idempotency-Key', async () => {
    const fake = await fakePlatform((seen) =>
      seen.method === 'GET'
        ? ok(ENVIRONMENTS)
        : ok({
            name: 'SIS_API_KEY',
            declared: true,
            set: true,
            updatedAt: '2026-09-28T21:00:00Z',
          }),
    )
    await platformSecrets(fake.origin).setInSandbox(
      TOKEN,
      PROJECT,
      'SIS_API_KEY',
      'a-long-value',
    )
    const put = fake.seen.find((s) => s.method === 'PUT')!
    expect(path(put)).toBe(`/v1/environments/${SANDBOX}/secrets/SIS_API_KEY`)
    expect(put.body).toEqual({ value: 'a-long-value' })
    expect(String(put.headers['idempotency-key'])).toMatch(/^.{8,}$/)
  })

  it.each([
    ['a value under 6 characters', 'SIS_API_KEY', 'short'],
    ['a name the platform refuses', 'sis-api-key', 'a-long-value'],
  ])('refuses %s before any request is sent', async (_, name, value) => {
    const fake = await fakePlatform(() => ok(ENVIRONMENTS))
    const error = await failure(
      platformSecrets(fake.origin).setInSandbox(TOKEN, PROJECT, name, value),
    )
    expect(error).toBeInstanceOf(PlatformRefusal)
    expect(error.message).not.toContain(value)
    expect(fake.seen).toHaveLength(0)
  })
})

describe("members: the instructor's PUID (Decision 13)", () => {
  const MEMBERS = [
    {
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      puid: 'col000002',
      cwlLogin: 'ta',
      displayName: 'A TA',
      email: 'ta@ubc.ca',
      role: 'collaborator',
    },
    {
      userId: PERSON,
      puid: 'ins000001',
      cwlLogin: 'instructor',
      displayName: 'Test Instructor',
      email: 'instructor@ubc.ca',
      role: 'owner',
    },
  ]

  it('answers the member who is the person, and nobody else', async () => {
    const fake = await fakePlatform(() => ok(MEMBERS))
    const members = platformMembers(fake.origin)
    expect(await members.instructor(TOKEN, PROJECT, PERSON)).toEqual({
      puid: 'ins000001',
      email: 'instructor@ubc.ca',
    })
    expect(await members.instructor(TOKEN, PROJECT, 'someone-else')).toBeUndefined()
    expect(path(fake.seen[0]!)).toBe(`/v1/projects/${PROJECT}/members`)
  })
})

describe('agent sessions, with their cap and their clock (Decision 9)', () => {
  const SESSION = {
    session: {
      id: '557de0f4-59b4-435d-ad91-6c36b5fb8ae4',
      projectId: PROJECT,
      name: 'Building — First build',
      person: { id: PERSON, name: 'Test Instructor' },
      via: null,
      models: ['default-chat', 'default-chat-large'],
      capUsd: 2,
      expiresAt: '2026-09-29T00:27:40.970Z',
      state: 'active',
      endedAt: null,
      endReason: null,
      spentUsd: 0,
      spentUnavailable: null,
      createdAt: '2026-09-28T20:27:40.970Z',
    },
    key: 'sk-test-y-the-sessions-key',
    baseUrl: 'http://127.0.0.1:7106/v1',
  }

  it('start sends the $2 cap and 240 minutes, and answers the cap', async () => {
    const fake = await fakePlatform(() => ok(SESSION, 201))
    expect(
      await platformAgentSessions(fake.origin).start(
        TOKEN,
        PROJECT,
        'Building — First build',
        {
          capUsd: 2,
          durationMinutes: 240,
        },
      ),
    ).toMatchObject({
      sessionId: SESSION.session.id,
      capUsd: 2,
      expiresAt: SESSION.session.expiresAt,
    })
    expect(fake.seen[0]?.body).toEqual({
      name: 'Building — First build',
      capUsd: 2,
      durationMinutes: 240,
    })
  })

  it('list reads each session’s spend, keeping null as null', async () => {
    const fake = await fakePlatform(() =>
      ok({
        sessions: [
          { ...SESSION.session, spentUsd: 0.021253 },
          {
            ...SESSION.session,
            id: 'c988abc1-c8ee-4ac8-b499-52f37c9f9b52',
            spentUsd: null,
            spentUnavailable: 'gateway',
          },
        ],
        truncated: false,
      }),
    )
    expect(await platformAgentSessions(fake.origin).list(TOKEN, PROJECT)).toEqual([
      {
        id: SESSION.session.id,
        spentUsd: 0.021253,
        endReason: null,
        models: SESSION.session.models,
      },
      {
        id: 'c988abc1-c8ee-4ac8-b499-52f37c9f9b52',
        spentUsd: null,
        endReason: null,
        models: SESSION.session.models,
      },
    ])
    expect(path(fake.seen[0]!)).toBe(`/v1/projects/${PROJECT}/agent-sessions`)
  })

  it('list reads what each key holds now: a session narrowed in place lists only what is left (the platform’s sitting 5, `d061ad7`)', async () => {
    const fake = await fakePlatform(() =>
      ok({
        sessions: [{ ...SESSION.session, models: ['default-chat-onprem'] }],
        truncated: false,
      }),
    )
    expect(
      (await platformAgentSessions(fake.origin).list(TOKEN, PROJECT)).map(
        (s) => s.models,
      ),
    ).toEqual([['default-chat-onprem']])
  })

  it('list says why the platform ended a session: models_withdrawn (FE-36, F4 Task 8)', async () => {
    const fake = await fakePlatform(() =>
      ok({
        sessions: [
          {
            ...SESSION.session,
            state: 'ended',
            endReason: 'models_withdrawn',
            spentUsd: 0.4,
          },
        ],
        truncated: false,
      }),
    )
    expect(await platformAgentSessions(fake.origin).list(TOKEN, PROJECT)).toEqual([
      {
        id: SESSION.session.id,
        spentUsd: 0.4,
        endReason: 'models_withdrawn',
        models: SESSION.session.models,
      },
    ])
  })
})

describe('FE-2, for every call in this file', () => {
  it('each carried the conversation’s token, and none a Cookie', () => {
    expect(everything.length).toBeGreaterThan(20)
    for (const seen of everything) {
      expect(seen.headers.cookie).toBeUndefined()
      expect(seen.headers.authorization).toBe(`Bearer ${TOKEN}`)
    }
  })
})
