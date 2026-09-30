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

/** Each `/v1/…` or `/auth/…` path a source file names, with the file that names it. */
function named(): { file: string; path: string }[] {
  return sources(SRC).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/['"`](\/(?:v1|auth)\/[^'"`]*)['"`]/g)].map(
      (match) => ({ file: relative(SRC, file), path: match[1]! }),
    ),
  )
}

/** The person's alone (the contract's operations), which our server never calls. */
const THEIRS = [
  '/v1/projects/{projectId}/rehearsal', // runRehearsal
  '/v1/releases/{releaseId}/approve', // approveRelease
  '/v1/releases/{releaseId}/reject', // rejectRelease
  '/v1/releases/{releaseId}/approval-preview', // createApprovalPreview
  '/v1/projects/{projectId}/launch-records/iam-registration', // recordIamRegistration
  '/v1/projects/{projectId}/launch-records/privacy-assessment', // recordPrivacyAssessment
]

describe('our server calls no launch action (F5 Task 10)', () => {
  it('reads real paths: the scan finds the ones we do call', () => {
    const paths = named().map((n) => n.path)
    expect(paths).toContain('/v1/projects/{projectId}/commits')
    expect(paths).toContain('/v1/environments/{environmentId}/deploy')
  })

  it('names no dry run, approval, refusal or launch record, and never the step-up', () => {
    const found = named().filter(
      (n) => THEIRS.includes(n.path) || n.path.startsWith('/auth/step-up'),
    )
    expect(found).toEqual([])
  })

  it('names `deploy` and a secret’s write only where they are aimed at the sandbox', () => {
    const where = (path: string) =>
      named()
        .filter((n) => n.path === path)
        .map((n) => n.file)
    expect(where('/v1/environments/{environmentId}/deploy')).toEqual([
      join('platform', 'releases.ts'),
    ])
    expect(where('/v1/environments/{environmentId}/secrets/{name}')).toEqual([
      join('platform', 'secrets.ts'),
    ])
  })
})
