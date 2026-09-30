import { fileURLToPath } from 'node:url'
import { afterEach, expect, it, vi } from 'vitest'
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

/**
 * MOCK MODE SAYS SO (F5 Task 3). Our server runs this config in its own process, so the
 * page is told the mode our server was started in: `pnpm dev:mock` sets MANIFEST_APP_MODE to
 * mock, and `pnpm dev` leaves it unset, which is edge (server/src/config.ts).
 */
afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function definedWith(env: string | undefined): Promise<unknown> {
  vi.stubEnv('MANIFEST_APP_MODE', env)
  vi.resetModules()
  const fresh = (await import('../vite.config.js')).default
  return fresh.define?.['__MANIFEST_APP_MODE__']
}

it('defines the page’s mode as mock when our server runs in mock mode', async () => {
  expect(await definedWith('mock')).toBe(JSON.stringify('mock'))
})

it('defines the page’s mode as edge when our server runs in edge mode', async () => {
  expect(await definedWith(undefined)).toBe(JSON.stringify('edge'))
  expect(await definedWith('edge')).toBe(JSON.stringify('edge'))
})
