import { MACHINERY } from '../../../web/src/screens/machinery.js'
import type { Change } from '../platform/source.js'

/**
 * THE LEAD'S GUARDS (F3 Task 6; Review Focus 1), OpenAI's tool input guardrails: a reason to
 * send a move back, or null. Each runs before any request, and its reason is what the lead is
 * told. A reason never repeats a secret it found.
 */
export interface Guards {
  /** A commit's changes, against the tree they are made on and `package.json` as last read. */
  commit(
    changes: Change[],
    tree: { paths: string[] },
    packageJson: unknown,
  ): string | null
  /** The lead's `line` and `account`: plain words the person reads (C3), and never "it works". */
  words(text: string): string | null
  /** Decision 13: every staff email is one the person wrote themselves. */
  staff(emails: string[], theirWords: string[]): string | null
  /**
   * F4 Decision 9: a file already in the app is written or deleted only when the lead knows it as
   * it is now (read at the current tree, written this round, or the specialist's proposal for it
   * committed as proposed). The lead writes whole files: one it never saw would be its guess.
   */
  unread(
    changes: Change[],
    tree: { paths: string[] },
    known: (change: Change) => boolean,
  ): string | null
}

const OUTSIDE =
  "a path outside the app's own files: relative, with no '..', no leading '/', no backslash, and nothing inside .git"
const BUILD =
  'the blueprint owns how the app is built: never a Dockerfile, an .npmrc, or a build block in manifest.yaml (the knowledge pack, D13)'
const PACKAGES =
  'we cannot add a package the app does not already have, or change the lockfile: nothing here can regenerate package-lock.json (FE-32). Build it with what the app already depends on, or, if it cannot be done without one, say so plainly to the person in your line'
const SECRET =
  'a value shaped like a secret: never put one in a file. Declare it in manifest.yaml and ask the person for its value'

/** The platform's secret shapes (F3 M4 met the AWS one), each at a word's start. */
const SECRETS = [
  /\bmft_[A-Za-z0-9]/,
  /\bsk-[A-Za-z0-9]/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
]

function outside(path: string): boolean {
  if (path === '' || path.startsWith('/') || path.includes('\\')) return true
  if (/[\u0000-\u001f]/.test(path)) return true
  return path
    .split('/')
    .some(
      (part) =>
        part === '' || part === '.' || part === '..' || part.toLowerCase() === '.git',
    )
}

const basename = (path: string) => path.slice(path.lastIndexOf('/') + 1)

/**
 * A `build` key under `runtime` in manifest.yaml, block or flow style. No YAML parser: a
 * dependency is not ours to add. Top-level keys start in column 0; `runtime`'s own keys are
 * indented beneath it.
 */
function runtimeBuild(yaml: string): boolean {
  if (/^runtime:\s*\{[^}]*\bbuild\s*:/m.test(yaml)) return true
  let inRuntime = false
  for (const line of yaml.split('\n')) {
    if (/^\S/.test(line)) inRuntime = /^runtime\s*:/.test(line)
    else if (inRuntime && /^\s+build\s*:/.test(line)) return true
  }
  return false
}

/** What the lockfile depends on: every one of these must stay exactly as it was. */
const LOCKED = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'overrides',
] as const

function packagesChanged(before: unknown, content: string): 'unreadable' | boolean {
  let after: unknown
  try {
    after = JSON.parse(content)
  } catch {
    return 'unreadable'
  }
  if (typeof after !== 'object' || after === null) return 'unreadable'
  const was = (typeof before === 'object' && before !== null ? before : {}) as Record<
    string,
    unknown
  >
  const is = after as Record<string, unknown>
  return LOCKED.some(
    (key) => JSON.stringify(sorted(was[key])) !== JSON.stringify(sorted(is[key])),
  )
}

function sorted(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value ?? null
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
}

/**
 * Words a faculty member never reads from the lead: F1's machinery (C3), the code it is
 * writing, and "it works" (moment 6: "It started and answered", never "It works").
 */
const CODE_WORDS = [
  'npm',
  'node',
  'express',
  'mongo',
  'mongodb',
  'docker',
  'dockerfile',
  'git',
  'commit',
  'committing',
  'committed',
  'deploy',
  'deploying',
  'deployed',
  'json',
  'api',
  'endpoint',
  'middleware',
  'passport',
  'saml',
  'repository',
  'dependency',
  'dependencies',
  'lockfile',
]
const FILE =
  /\b[\w.-]+\.(?:js|mjs|cjs|ts|json|ya?ml|html|css|md|env)\b|\b[\w.-]+\/[\w./-]+/i

export function guards(): Guards {
  return {
    commit(changes, tree, packageJson) {
      for (const change of changes) {
        if (outside(change.path)) return `${OUTSIDE} (${change.path})`
        const name = basename(change.path)
        if (name === 'Dockerfile' || name === '.npmrc') return BUILD
        if (change.path === 'package-lock.json') return PACKAGES
        if (change.op === 'delete') {
          if (change.path === 'package.json') return 'package.json is never deleted'
          if (!tree.paths.includes(change.path))
            return `there is no file ${change.path} to delete`
          continue
        }
        if (SECRETS.some((shape) => shape.test(change.content)))
          return `${SECRET} (${change.path})`
        if (change.path === 'manifest.yaml' && runtimeBuild(change.content)) return BUILD
        if (change.path === 'package.json') {
          const changed = packagesChanged(packageJson, change.content)
          if (changed === 'unreadable') return 'package.json must stay valid JSON'
          if (changed) return PACKAGES
        }
      }
      return null
    },

    words(text) {
      if (/\bit works\b/i.test(text))
        return 'never say "it works": say what happened, as "It started and answered"'
      const lower = text.toLowerCase()
      const machine = [...MACHINERY, ...CODE_WORDS].find((word) =>
        new RegExp(`\\b${word}\\b`).test(lower),
      )
      if (machine !== undefined)
        return `say what the person will see, never how it is built ("${machine}")`
      if (FILE.test(text)) return 'say what the person will see, never a file or a path'
      return null
    },

    unread(changes, tree, known) {
      const unread = changes.find(
        (change) => tree.paths.includes(change.path) && !known(change),
      )
      return unread === undefined
        ? null
        : `${unread.path} is already in the app, and you have not read it as it is now: read it first, then write it whole on what is there`
    },

    staff(emails, theirWords) {
      const said = theirWords.join('\n').toLowerCase()
      const invented = emails.find((email) => {
        const address = email.trim().toLowerCase()
        const escaped = address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        return !new RegExp(`(^|[^\\w.+-])${escaped}(?![\\w-]|\\.\\w)`).test(said)
      })
      return invented === undefined
        ? null
        : `only people the person named may be staff, and nobody wrote ${invented}`
    },
  }
}
