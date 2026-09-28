import { builtinModules } from 'node:module'
import { posix } from 'node:path'

/**
 * OUR OWN CHECK BEFORE PAYING FOR A BUILD (F3 Decision 6): every import in the app's server
 * code resolves. F3 M6: the blueprint is JavaScript as ES modules, which resolve no extension
 * and no `index`, so a relative specifier must name a file in the tree EXACTLY; a bare one
 * must be a Node built-in, or a package `package.json` depends on. Only `dependencies`: the
 * build installs with `--omit=dev` (M4's log). `public/` is the browser's, and is not read.
 */
export type Missing = { path: string; missing: string }

const SERVER_CODE = /\.(?:js|mjs|cjs)$/

const FORMS = [
  // import x from '…', import { a } from '…', import * as x from '…', import '…', multi-line
  /\bimport\s+(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"]+)['"]/g,
  // export * from '…', export { a } from '…'
  /\bexport\s+(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
  // import('…') with a literal
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  // require('…')
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
]

/** Comments carry no imports: block comments, and lines that are only a comment. */
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

function specifiers(code: string): string[] {
  const found: { at: number; specifier: string }[] = []
  const text = withoutComments(code)
  for (const form of FORMS)
    for (const match of text.matchAll(form))
      found.push({ at: match.index ?? 0, specifier: match[1] as string })
  return found.sort((a, b) => a.at - b.at).map((f) => f.specifier)
}

const BUILT_IN = new Set(builtinModules)

function packageName(specifier: string): string {
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : (parts[0] as string)
}

export function importsHold(
  files: { path: string; content: string }[],
  paths: string[],
  packageJson: unknown,
): Missing[] {
  const tree = new Set(paths)
  const dependencies = Object.keys(
    ((packageJson as { dependencies?: Record<string, unknown> } | null)?.dependencies ??
      {}) as Record<string, unknown>,
  )
  const missing: Missing[] = []
  for (const file of files) {
    if (!SERVER_CODE.test(file.path) || file.path.startsWith('public/')) continue
    for (const specifier of specifiers(file.content)) {
      const holds =
        specifier.startsWith('./') || specifier.startsWith('../')
          ? tree.has(posix.normalize(posix.join(posix.dirname(file.path), specifier)))
          : specifier.startsWith('node:') ||
            BUILT_IN.has(specifier) ||
            dependencies.includes(packageName(specifier))
      if (!holds) missing.push({ path: file.path, missing: specifier })
    }
  }
  return missing
}
