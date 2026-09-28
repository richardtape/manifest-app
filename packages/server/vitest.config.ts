import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * DECISION 5: THE CONTRACT FROM SOURCE. Its package.json sends a runtime to its
 * git-ignored dist/, which another session rebuilds when it likes; without this alias
 * every test still passes, against that build (F1 sitting 1, M1). contract-source.test.ts
 * holds it.
 */
const CONTRACT = fileURLToPath(
  new URL('../../../manifest/packages/contract/src/index.ts', import.meta.url),
)

export default defineConfig({
  resolve: { alias: [{ find: /^@manifest\/contract$/, replacement: CONTRACT }] },
  esbuild: { jsx: 'automatic' },
  test: { name: 'server', environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
})
