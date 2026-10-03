import { describe, expect, it } from 'vitest'
import type { Change } from '../platform/source.js'
import { guards } from './guards.js'
import { importsHold } from './imports.js'

/**
 * F3 TASK 6: THE LEAD'S GUARDS (Review Focus 1). A move the lead proposes that would harm the
 * app, or say machinery to the person, is sent back with its reason before any request is made.
 * Each harm is its own case.
 */
const TREE = {
  paths: [
    'manifest.yaml',
    'package.json',
    'package-lock.json',
    'server.js',
    'auth/ubcshib.js',
    'public/app.js',
  ],
}
const PACKAGE = {
  name: 'node-ts-mongo-app',
  private: true,
  type: 'module',
  engines: { node: '>=22.0.0' },
  dependencies: { express: '4.22.2', passport: '0.7.0', 'passport-ubcshib': '0.1.6' },
  overrides: { '@xmldom/xmldom': '0.8.15' },
}
const write = (path: string, content = 'export const x = 1\n'): Change => ({
  op: 'write',
  path,
  content,
})
const guard = (changes: Change[]) => guards().commit(changes, TREE, PACKAGE)

describe("commit: the app's own files, and only those", () => {
  it('a plain write to the app passes', () => {
    expect(
      guard([write('routes/posts.js'), write('public/week.html', '<p>A week</p>')]),
    ).toBeNull()
  })

  it.each([
    ['..', '../outside.js'],
    ['a .. inside', 'routes/../../outside.js'],
    ['a leading /', '/etc/passwd'],
    ['a backslash', 'routes\\posts.js'],
    ['inside .git', '.git/config'],
    ['inside .GIT', 'sub/.GIT/hooks/pre-commit'],
    ['an empty part', 'routes//posts.js'],
  ])('a path with %s is refused', (_, path) => {
    expect(guard([write(path)])).toMatch(/app's own files/)
  })

  it('deleting a file that is not there is refused', () => {
    expect(guard([{ op: 'delete', path: 'routes/nothing.js' }])).toMatch(/no file/)
    expect(guard([{ op: 'delete', path: 'public/app.js' }])).toBeNull()
  })
})

describe('commit: the blueprint owns the build (the knowledge pack, D13)', () => {
  it.each(['Dockerfile', 'docker/Dockerfile', '.npmrc', 'config/.npmrc'])(
    '%s is refused',
    (path) => {
      expect(guard([write(path, 'FROM node:22\n')])).toMatch(
        /blueprint owns how the app is built/,
      )
    },
  )

  it('a runtime.build block written into manifest.yaml is refused; the rest of manifest.yaml may change', () => {
    const manifest =
      'manifest: 1\nname: posts\nruntime:\n  port: 3000\n  health: /healthz\n'
    expect(guard([write('manifest.yaml', manifest)])).toBeNull()
    expect(
      guard([
        write(
          'manifest.yaml',
          manifest.replace('  health', '  build:\n    dockerfile: x\n  health'),
        ),
      ]),
    ).toMatch(/blueprint owns how the app is built/)
    expect(
      guard([
        write('manifest.yaml', 'runtime: { port: 3000, build: { dockerfile: x } }\n'),
      ]),
    ).toMatch(/blueprint owns how the app is built/)
    // A key called build elsewhere is not the runtime's.
    expect(
      guard([write('manifest.yaml', `${manifest}notes:\n  build: weekly\n`)]),
    ).toBeNull()
  })
})

describe('commit: no dependency may be added (FE-32)', () => {
  const pkg = (edit: (p: typeof PACKAGE & Record<string, unknown>) => void) => {
    const next = structuredClone(PACKAGE) as typeof PACKAGE & Record<string, unknown>
    edit(next)
    return write('package.json', `${JSON.stringify(next, null, 2)}\n`)
  }

  it('gaining a dependency is refused, and the reason tells us to say plainly what cannot be added', () => {
    const reason = guard([
      pkg((p) => ((p.dependencies as Record<string, string>)['marked'] = '14.1.0')),
    ])
    expect(reason).toMatch(/cannot add a package/)
    expect(reason).toMatch(/say so plainly/)
  })

  it.each([
    [
      'changing a version',
      (p: Record<string, unknown>) =>
        ((p['dependencies'] as Record<string, string>)['express'] = '5.0.0'),
    ],
    [
      'removing one',
      (p: Record<string, unknown>) =>
        delete (p['dependencies'] as Record<string, string>)['passport'],
    ],
    [
      'gaining a devDependency',
      (p: Record<string, unknown>) => (p['devDependencies'] = { vitest: '2.1.9' }),
    ],
    ['changing the overrides', (p: Record<string, unknown>) => (p['overrides'] = {})],
    // minors m26: npm ci reads these against the lock too, and a change there fails the build.
    [
      'gaining a peerDependency',
      (p: Record<string, unknown>) => (p['peerDependencies'] = { react: '19.0.0' }),
    ],
    [
      'gaining bundleDependencies',
      (p: Record<string, unknown>) => (p['bundleDependencies'] = ['express']),
    ],
    [
      'gaining bundledDependencies (its other spelling)',
      (p: Record<string, unknown>) => (p['bundledDependencies'] = ['express']),
    ],
  ])('%s is refused too: the lockfile would no longer match', (_, edit) => {
    expect(guard([pkg(edit)])).toMatch(/cannot add a package/)
  })

  it('changing its scripts is allowed', () => {
    expect(guard([pkg((p) => (p['scripts'] = { start: 'node server.js' }))])).toBeNull()
  })

  it('a package.json that is not JSON, or deleted, is refused', () => {
    expect(guard([write('package.json', '{ "name": ')])).toMatch(/package.json/)
    expect(guard([{ op: 'delete', path: 'package.json' }])).toMatch(/package.json/)
  })

  it('package-lock.json is never written or deleted: nothing here can regenerate it', () => {
    expect(guard([write('package-lock.json', '{}')])).toMatch(/cannot add a package/)
    expect(guard([{ op: 'delete', path: 'package-lock.json' }])).toMatch(
      /cannot add a package/,
    )
  })
})

describe('commit: never a secret (before the platform scans it)', () => {
  it.each([
    ['a delegated token', "const token = 'mft_0123456789abcdef_0123456789'"],
    ['a model key', 'const key = "sk-proj-0123456789abcdef"'],
    [
      'a PEM block',
      '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----',
    ],
    ['an AWS access key id', "const id = 'AKIA0123456789ABCDEF'"],
  ])('%s is refused, and the reason never repeats it', (_, content) => {
    const reason = guard([write('config/keys.js', content)])
    expect(reason).toMatch(/secret/)
    expect(reason).not.toContain(content.slice(12, 24))
  })

  it('words that only look like one pass: a task list, a risk-free desk-top', () => {
    expect(
      guard([
        write(
          'public/notes.js',
          "export const notes = 'the task-list, a risk-free desk-top'",
        ),
      ]),
    ).toBeNull()
  })
})

describe('words: what the person reads is plain (C3), and never "it works"', () => {
  it('passes a line about what people see', () => {
    expect(guards().words('Writing the page students post on.')).toBeNull()
    expect(guards().words('Two pages, and the rule about who sees what')).toBeNull()
  })

  it.each([
    'Deploying the container',
    'Running npm ci',
    'It works',
    'it works!',
    'Updating server.js',
    'Editing routes/posts.js',
    'Adding the passport middleware',
    'Committing the changes',
    'The sandbox environment is healthy',
  ])('refuses "%s"', (text) => {
    expect(guards().words(text)).not.toBeNull()
  })
})

describe('staff: only emails the person wrote (Decision 13)', () => {
  const THEIRS = [
    'A page where students post a response. My TA, Sam.Lee@ubc.ca, should see everything.',
    'Yes, and ta2@ubc.ca too',
  ]

  it('an email in their own words passes, whatever its case', () => {
    expect(guards().staff(['sam.lee@ubc.ca', 'TA2@ubc.ca'], THEIRS)).toBeNull()
    expect(guards().staff([], THEIRS)).toBeNull()
  })

  it('an email nobody wrote is refused, by name', () => {
    expect(guards().staff(['sam.lee@ubc.ca', 'attacker@example.com'], THEIRS)).toMatch(
      /attacker@example\.com/,
    )
  })

  it('an address that only contains one they wrote is refused', () => {
    expect(guards().staff(['lee@ubc.ca'], THEIRS)).not.toBeNull()
  })
})

describe('importsHold: every import resolves (Decision 6; M6: ES modules)', () => {
  const PATHS = ['server.js', 'routes/posts.js', 'config/staff.json', 'public/app.js']
  const holds = (path: string, content: string, paths = PATHS) =>
    importsHold([{ path, content }], paths, PACKAGE)

  it('a relative import of a file in the tree holds, from a nested directory too', () => {
    expect(holds('server.js', "import { list } from './routes/posts.js'\n")).toEqual([])
    expect(
      holds(
        'routes/posts.js',
        "import staff from '../config/staff.json' with { type: 'json' }\n",
      ),
    ).toEqual([])
  })

  it('an import without its extension is missing: ES modules resolve none', () => {
    expect(holds('server.js', "import './routes/posts'\n")).toEqual([
      { path: 'server.js', missing: './routes/posts' },
    ])
  })

  it('a package that package.json does not depend on is missing', () => {
    expect(holds('server.js', "import { marked } from 'marked'\n")).toEqual([
      { path: 'server.js', missing: 'marked' },
    ])
  })

  it('built-ins, dependencies and a dependency’s subpath hold', () => {
    const code = [
      "import crypto from 'node:crypto'",
      "import { readFileSync } from 'fs'",
      "import { readFile } from 'fs/promises'",
      "import express from 'express'",
      "import x from 'passport-ubcshib/lib/x.js'",
    ].join('\n')
    expect(holds('server.js', code)).toEqual([])
  })

  it('reads every form: multi-line, default and named, export from, dynamic, require', () => {
    const code = [
      'import {',
      '  one,',
      '  two,',
      "} from './a.js'",
      "import d, { e } from './b.js'",
      "export * from './c.js'",
      "export { f } from './d.js'",
      "const lazy = await import('./e.js')",
      "const old = require('./f.js')",
      "import * as all from './g.js'",
    ].join('\n')
    expect(holds('server.js', code).map((m) => m.missing)).toEqual([
      './a.js',
      './b.js',
      './c.js',
      './d.js',
      './e.js',
      './f.js',
      './g.js',
    ])
  })

  it('an import in a comment is not an import', () => {
    expect(
      holds(
        'server.js',
        "// import './routes/old.js'\n/* import 'marked' */\nconst x = 1\n",
      ),
    ).toEqual([])
  })

  it("public/ is the browser's, and is not read", () => {
    expect(holds('public/app.js', "import './nowhere.js'\nimport 'marked'\n")).toEqual([])
  })

  it('a devDependency does not hold: the build installs without them', () => {
    const withDev = { ...PACKAGE, devDependencies: { vitest: '2.1.9' } }
    expect(
      importsHold([{ path: 'server.js', content: "import 'vitest'\n" }], PATHS, withDev),
    ).toEqual([{ path: 'server.js', missing: 'vitest' }])
  })
})

describe('unread: never a file rewritten unread (F4 Decision 9, Review Focus 3)', () => {
  /** What the round knows: read at the current tree, written this round, or proposed as is. */
  const known =
    (...paths: string[]) =>
    (change: Change) =>
      paths.includes(change.path)
  const unread = (changes: Change[], ...paths: string[]) =>
    guards().unread(changes, TREE, known(...paths))

  it('a write to a file already in the app, never read as it is now, is sent back: read it first', () => {
    const reason = unread([write('server.js')])
    expect(reason).toMatch(/server\.js/)
    expect(reason).toMatch(/read it first/)
  })

  it('a file read as it is now, or written this round, is taken', () => {
    expect(unread([write('server.js')], 'server.js')).toBeNull()
  })

  it('a new file needs no read', () => {
    expect(unread([write('routes/word-count.js')])).toBeNull()
  })

  it('a delete of a file never read is sent back too', () => {
    expect(unread([{ op: 'delete', path: 'public/app.js' }])).toMatch(
      /public\/app\.js.*read it first/,
    )
  })

  it('among several, the unread one is named', () => {
    const reason = unread([write('server.js'), write('public/app.js')], 'server.js')
    expect(reason).toMatch(/public\/app\.js/)
    expect(reason).not.toMatch(/server\.js/)
  })
})
