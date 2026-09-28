/**
 * MANIFEST-MOCK ON 7102, FROM SOURCE (F1 sitting 1, M5; FE-26). The mock's own `dev`
 * script runs `tsc` and writes `packages/mock/dist` inside manifest, which we never do.
 * So `createMockServer()` is imported through our `link:` and run by tsx. The mock imports
 * only types from the contract, so nothing of manifest's is built to run it.
 *
 * It reads its own switches: `MANIFEST_MOCK_ROLE=admin`, `MANIFEST_MOCK_FAIL=1`.
 */
import { createMockServer } from '@manifest/mock'

const PORT = 7102

createMockServer()
  .on('error', (error) => {
    console.error(`manifest-mock could not listen on ${PORT}: ${error.message}`)
    process.exit(1)
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log(`manifest-mock on http://127.0.0.1:${PORT} (from source)`)
  })
