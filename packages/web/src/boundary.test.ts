import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * DECISION 3: ONLY src/platform/ CALLS THE PLATFORM. This is the test half; the lint half
 * is in eslint.config.js, and each is watched failing.
 */
const SRC = new URL('.', import.meta.url).pathname
const isTest = (file: string) => /\.test\.tsx?$/.test(file)

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory()
      ? files(path)
      : /\.(ts|tsx)$/.test(name)
        ? [path]
        : []
  })
}
/** Every module specifier: `… from '<spec>'`, and a bare `import '<spec>'`. */
const imports = (text: string) =>
  [...text.matchAll(/(?:\bfrom|^import)\s+'([^']+)'/gm)].map((m) => m[1] ?? '')

/**
 * The value imports of the contract in one file's text. Each statement runs from a line's
 * `import` to its first `from '…'`, and never past the next line that starts `import`:
 * Prettier writes no semicolons, so the plan's `[^;]*` ran one statement into the next and
 * reported a type import after any other import as a value import (sitting 2, watched
 * failing). `import { type A }` counts as a value import, because under
 * `verbatimModuleSyntax` it still loads the module; so does a bare `import '…'`.
 */
function valueImportsOfContract(text: string): string[] {
  const statements = [
    ...text.matchAll(/^import\s+(type\s)?(?:(?!^import\s)[\s\S])*?\bfrom\s+'([^']+)'/gm),
  ].filter((m) => m[1] === undefined && m[2] === '@manifest/contract')
  const bare = [...text.matchAll(/^import\s+'@manifest\/contract'/gm)]
  return [...statements, ...bare].map((m) => m[0])
}

describe('the boundary’s scanner', () => {
  const cases: [string, number][] = [
    ["import { unwrap } from '@manifest/contract'", 1],
    ["import type { Schemas } from '@manifest/contract'", 0],
    ["import {\n  unwrap,\n  type Schemas,\n} from '@manifest/contract'", 1],
    ["import '@manifest/contract'", 1],
    // Prettier writes no semicolons, so a statement must never run into the next one.
    ["import { a } from './a'\nimport type { Schemas } from '@manifest/contract'", 0],
    ["import './styles.css'\nimport type { Schemas } from '@manifest/contract'", 0],
  ]
  it.each(cases)('%j has %i value import(s) of the contract', (text, count) =>
    expect(valueImportsOfContract(text)).toHaveLength(count),
  )
})

describe('the boundary (Decision 3)', () => {
  it('only src/platform/ imports @manifest/contract as a value; anyone may import its types', () => {
    for (const file of files(SRC)) {
      if (relative(SRC, file).startsWith('platform/') || isTest(file)) continue
      expect(
        valueImportsOfContract(readFileSync(file, 'utf8')),
        relative(SRC, file),
      ).toEqual([])
    }
  })
  it('nothing imports from the manifest repository except the two linked packages', () => {
    for (const file of files(SRC)) {
      for (const spec of imports(readFileSync(file, 'utf8'))) {
        expect(
          spec.includes('/manifest/') || spec.startsWith('../../../'),
          `${relative(SRC, file)}: ${spec}`,
        ).toBe(false)
      }
    }
  })
  it('only src/ours/api.ts names an /api/ path: our own API has one caller (F2 Task 3)', () => {
    for (const file of files(SRC)) {
      if (relative(SRC, file) === join('ours', 'api.ts') || isTest(file)) continue
      expect(/['`]\/api\//.test(readFileSync(file, 'utf8')), relative(SRC, file)).toBe(
        false,
      )
    }
  })
  it('only src/auth.ts names an /auth/ path', () => {
    for (const file of files(SRC)) {
      if (relative(SRC, file) === 'auth.ts' || isTest(file)) continue
      expect(readFileSync(file, 'utf8').includes("'/auth/"), relative(SRC, file)).toBe(
        false,
      )
    }
  })
})
