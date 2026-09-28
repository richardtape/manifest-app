import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import config from '../vite.config.js'

/**
 * THE PAGE'S OWN ALIAS (Decision 5; the final review). contract-source.test.ts holds the one
 * in vitest.config.ts, which is Vitest's. This holds the one in vite.config.ts, which is the
 * page's, when our server serves it through Vite. Without it the page would run the
 * contract's git-ignored dist/, and nothing else would fail.
 */
const SOURCE = fileURLToPath(
  new URL('../../../../manifest/packages/contract/src/index.ts', import.meta.url),
)

it('vite.config.ts sends @manifest/contract to its src/index.ts', () => {
  const aliases = (config.resolve?.alias ?? []) as {
    find: RegExp | string
    replacement: string
  }[]
  const contract = aliases.find((a) =>
    a.find instanceof RegExp
      ? a.find.test('@manifest/contract')
      : a.find === '@manifest/contract',
  )
  expect(contract?.replacement).toBe(SOURCE)
})
