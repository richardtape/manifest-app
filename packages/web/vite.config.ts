import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * DECISION 5: THE CONTRACT FROM SOURCE. Without this alias the page would load the
 * contract's git-ignored dist/, which another session rebuilds when it likes, and nothing
 * would fail (F1 sitting 1, M1).
 */
const CONTRACT = fileURLToPath(
  new URL('../../../manifest/packages/contract/src/index.ts', import.meta.url),
)

/**
 * Our server (packages/server/src/main.ts) runs this in middleware mode and gives HMR its own
 * HTTP server. In EDGE mode the page is reached at https://app.manifest.internal, so HMR's
 * socket must be told the public host and port, or it dials 7105 from the browser and the
 * page reloads for ever (the console's vite.config.ts, for its own origin). In MOCK mode the
 * page is reached at http://127.0.0.1:7105 and Vite's default is right.
 */
const EDGE = process.env['MANIFEST_APP_MODE'] !== 'mock'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: [{ find: /^@manifest\/contract$/, replacement: CONTRACT }] },
  server: {
    // Vite refuses a Host it does not know, and the edge PRESERVES the app's hostname.
    allowedHosts: ['app.manifest.internal'],
    ...(EDGE
      ? { ws: { protocol: 'wss', host: 'app.manifest.internal', clientPort: 443 } }
      : {}),
  },
})
