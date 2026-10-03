/**
 * THE WALK LIBRARY: headless Chrome over the DevTools protocol, Node 24, no dependency.
 * `scripts/walk/README.md` says what each piece is for and which trap it closes.
 *
 *   import { walk } from '/Users/rich/Developer/manifest-app/scripts/walk/index.ts'
 *   const { page, report } = await walk({ out: process.argv[2] })
 *   await page.setWidth(375)
 *   await page.go('/')
 *   report.check('fits at 375', (await page.layout()).length === 0)
 *   report.finish([page])
 *
 * Run it with plain `node` (Node 24 strips the types).
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchChrome, type Chrome } from './chrome.ts'
import { Page, type PageOptions } from './page.ts'
import { Report } from './report.ts'

export { launchChrome, type Chrome } from './chrome.ts'
export { Page, type PageOptions, type Rewrite, type Trouble } from './page.ts'
export { Report } from './report.ts'
export {
  Jar,
  sessionCookie,
  signIn,
  signInHere,
  type Person,
  type Answer,
} from './sign-in.ts'
export { layoutProblems, wordsIn, LAYOUT_DEFAULTS, type LayoutOptions } from './layout.ts'

/** Our server: 7105 in either mode. Through the edge: `https://app.manifest.internal`. */
export const OURS = 'http://127.0.0.1:7105'

/**
 * Chrome, a first tab and a report. `out` is where shots and the log go (the session's
 * scratchpad); a fresh temporary directory when absent. Writes are blocked unless allowed.
 */
export async function walk(
  options: Partial<Omit<PageOptions, 'out'>> & { out?: string | undefined } = {},
): Promise<{ chrome: Chrome; page: Page; report: Report }> {
  const out = options.out ?? mkdtempSync(join(tmpdir(), 'walk-'))
  const chrome = await launchChrome()
  const page = await Page.open(chrome, { ...options, base: options.base ?? OURS, out })
  return { chrome, page, report: new Report(out) }
}
