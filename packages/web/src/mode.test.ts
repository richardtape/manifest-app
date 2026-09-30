import { afterEach, expect, it, vi } from 'vitest'

/**
 * WHICH PLATFORM OUR SERVER ANSWERS FROM (F5 Task 3). vite.config.ts defines
 * `__MANIFEST_APP_MODE__` for the page; Vitest does not read that file, so here it is absent
 * unless a test stubs it, and absent is edge: the banner is mock mode's alone.
 */
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function modeWith(defined?: unknown): Promise<string> {
  if (defined !== undefined) vi.stubGlobal('__MANIFEST_APP_MODE__', defined)
  vi.resetModules()
  return (await import('./mode.js')).mode
}

it('is edge when nothing defines it (Vitest, and any page built without our config)', async () => {
  expect(await modeWith()).toBe('edge')
})

it('is mock when our config defines it so', async () => {
  expect(await modeWith('mock')).toBe('mock')
})

it('is edge when defined edge, or anything that is not mock', async () => {
  expect(await modeWith('edge')).toBe('edge')
  expect(await modeWith('MOCK')).toBe('edge')
  expect(await modeWith('')).toBe('edge')
})
