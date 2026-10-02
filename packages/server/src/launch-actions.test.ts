import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * EVERY LAUNCH ACTION IS THE PERSON'S, IN THE BROWSER (F5 Global Constraints; Task 10). Our server
 * reaches the platform only through the paths its code names, so this reads them all: it names no
 * dry run, no approval, no refusal, no launch record, and no step-up; and the one `deploy` and the
 * one secret's write it names are in the modules that aim them at the sandbox alone
 * (platform.test.ts: "deploy names the sandbox's environment, and no other"; "sets it in the
 * sandbox").
 */
const SRC = new URL('.', import.meta.url).pathname

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    return /\.ts$/.test(entry.name) && !/\.test\.ts$|testing\.ts$/.test(entry.name)
      ? [path]
      : []
  })
}

/** A path with its parameters, `{projectId}` or `${projectId}`, each as `{}`. */
const shape = (path: string) => path.replace(/\$?\{[^}]*\}/g, '{}')

/**
 * Each `/v1/…` or `/auth/…` path a source file names, with the file that names it: anywhere in its
 * text, a template's too (`${origin}/v1/projects/${id}/events`), up to a quote, a space or a
 * bracket. A comment naming a path counts as well: the scan errs toward refusing.
 */
function named(): { file: string; path: string }[] {
  return sources(SRC).flatMap((file) =>
    [
      ...readFileSync(file, 'utf8').matchAll(
        /\/(?:v1|auth)\/(?:\$\{[^}]*\}|[^'"`\s()])*/g,
      ),
    ].map((match) => ({ file: relative(SRC, file), path: shape(match[0]) })),
  )
}

/** The person's alone (the contract's operations), which our server never calls. */
const THEIRS = [
  '/v1/projects/{projectId}/rehearsal', // runRehearsal
  '/v1/releases/{releaseId}/approve', // approveRelease
  '/v1/releases/{releaseId}/reject', // rejectRelease
  '/v1/releases/{releaseId}/approval-preview', // createApprovalPreview
  '/v1/releases/{releaseId}/approval-request', // requestApproval (F5b Task 4: the person's, in the browser)
  '/v1/projects/{projectId}/launch-records/iam-registration', // recordIamRegistration
  '/v1/projects/{projectId}/launch-records/privacy-assessment', // recordPrivacyAssessment
]

describe('our server calls no launch action (F5 Task 10)', () => {
  it('reads real paths: the scan finds the ones we do call, a path built from a template too', () => {
    const paths = named().map((n) => n.path)
    expect(paths).toContain('/v1/projects/{}/commits')
    expect(paths).toContain('/v1/environments/{}/deploy')
    // platform/stream.ts builds its address: `${origin}/v1/projects/${projectId}/events`.
    expect(paths).toContain('/v1/projects/{}/events')
  })

  it('names no dry run, approval, refusal or launch record, and never the step-up', () => {
    const theirs = THEIRS.map(shape)
    const found = named().filter(
      (n) => theirs.includes(n.path) || n.path.startsWith('/auth/step-up'),
    )
    expect(found).toEqual([])
  })

  it('names `deploy` and a secret’s write only where they are aimed at the sandbox', () => {
    const where = (path: string) =>
      named()
        .filter((n) => n.path === shape(path))
        .map((n) => n.file)
    expect(where('/v1/environments/{environmentId}/deploy')).toEqual([
      join('platform', 'releases.ts'),
    ])
    expect(where('/v1/environments/{environmentId}/secrets/{name}')).toEqual([
      join('platform', 'secrets.ts'),
    ])
  })
})

/** The paths the watch token may read with (F6 Global Constraints): the app, its members, its stream. */
const WATCH_READS = [
  '/v1/projects/{}',
  '/v1/projects/{}/members',
  '/v1/projects/{}/events',
]

/** What changes what students reach: the person's alone, in the browser (F6 Global Constraints). */
const SWITCHING = [
  '/v1/projects/{projectId}/archive',
  '/v1/projects/{projectId}/restore',
].map(shape)

describe('the watch token only reads, and nothing switches an app off (F6 Task 3)', () => {
  const keeping = (file: string) =>
    file.startsWith(`keeping${'/'}`) || file === join('platform', 'watching.ts')

  it('keeping/ and platform/watching.ts name only the project, its members and its stream', () => {
    const found = named().filter((n) => keeping(n.file))
    expect(found.map((n) => n.path)).toContain('/v1/projects/{}/members')
    expect(found.filter((n) => !WATCH_READS.includes(n.path))).toEqual([])
  })

  it('no source names archive or restore', () => {
    expect(named().filter((n) => SWITCHING.includes(n.path))).toEqual([])
  })

  it('no source deletes a project (deleteProject is the page’s, after its step-up)', () => {
    const deletes = sources(SRC).filter((file) =>
      /DELETE\(\s*['"`]\/v1\/projects\/\{projectId\}['"`]/.test(
        readFileSync(file, 'utf8'),
      ),
    )
    expect(deletes).toEqual([])
  })
})

/**
 * WHO MAY WORK ON AN APP, AND WHAT AN AGENT MAY DO, ARE THE PERSON'S, IN THE BROWSER (F6b Global
 * Constraints, D5): adding, changing and taking off a member, minting and revoking a token, and
 * answering an agent's question. Our server reads the members with a token (F6's watch, F3's
 * instructor) and names nothing else of these.
 */
const PEOPLE_AND_AGENTS = [
  '/v1/projects/{projectId}/members/{userId}', // removeMember
  '/v1/projects/{projectId}/tokens', // listTokens, mintToken
  '/v1/tokens/{tokenId}', // revokeToken
  '/v1/pending-actions/{pendingActionId}/confirm', // confirmPendingAction
  '/v1/pending-actions/{pendingActionId}/reject', // rejectPendingAction
].map(shape)

describe('members, tokens and agents’ questions are the page’s alone (F6b Task 2)', () => {
  it('no source names taking a member off, a token, or an answer to a pending action', () => {
    expect(named().filter((n) => PEOPLE_AND_AGENTS.includes(n.path))).toEqual([])
  })

  it('the members path is only ever read: no source adds or changes a member (addMember)', () => {
    const writes = sources(SRC).filter((file) =>
      /\b(?:POST|PUT|PATCH|DELETE)\(\s*['"`]\/v1\/projects\/\{projectId\}\/members/.test(
        readFileSync(file, 'utf8'),
      ),
    )
    expect(writes).toEqual([])
  })
})
