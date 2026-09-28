import { fileURLToPath } from 'node:url'
import { createServer as createVite } from 'vite'
import { buildServer } from './app.js'
import { readConfig } from './config.js'
import { createIntakeKeys, intakeModelFor } from './platform/intake.js'
import { openStore } from './store/db.js'

/**
 * OUR SERVER ON 7105: `pnpm dev` (edge) or `pnpm dev:mock`. The app is served by Vite in
 * middleware mode, and its HMR socket shares our HTTP server (M4). 7105 is ours and only
 * ours: if it is taken we stop, and never choose another port.
 */
const WEB = fileURLToPath(new URL('../../web/', import.meta.url))
const config = readConfig(process.env)
// Decision 2: one SQLite file, git-ignored. Decision 1: no credential is ever written to it.
const store = openStore(fileURLToPath(new URL('../.data/app.sqlite', import.meta.url)))
// The intake keys the browser hands over, in memory only; each mode's model uses them (Task 6).
const intakeKeys = createIntakeKeys()

// The app is asked for only once we listen, which is after Vite exists: the closure reads
// `vite` then, and Vite needs our HTTP server first, for its HMR socket (`server.ws`, which
// Vite 8 names in place of the deprecated `server.hmr`).
const app = buildServer(
  config,
  (request, response) => vite.middlewares(request, response),
  { store, intakeKeys, intakeModel: intakeModelFor(config, intakeKeys) },
)
const vite = await createVite({
  root: WEB,
  appType: 'spa',
  server: { middlewareMode: true, ws: { server: app.server } },
})

try {
  await app.listen({ host: '127.0.0.1', port: config.port })
} catch (error) {
  console.error(
    `manifest-app could not listen on ${config.port}: ${(error as Error).message}`,
  )
  await vite.close()
  process.exit(1)
}
console.log(
  `manifest-app (${config.mode}) on http://127.0.0.1:${config.port}, asking ${config.platformOrigin}`,
)
