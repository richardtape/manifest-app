import { fileURLToPath } from 'node:url'
import { createServer as createVite } from 'vite'
import { buildServer } from './app.js'
import { readConfig } from './config.js'
import { createHub } from './api/events.js'
import { createKeeper } from './keeping/keeper.js'
import { probeAddress } from './keeping/probe.js'
import { smtpMailer } from './keeping/mail.js'
import { KEY_FILE, keyFrom } from './keeping/seal.js'
import { createIntakeKeys, intakeModelFor } from './platform/intake.js'
import { platformStream } from './platform/stream.js'
import { platformWatching } from './platform/watching.js'
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
// F6 D2: THE KEY THAT SEALS THE WATCH TOKENS, read (or made) before we listen. Never in .data/,
// so a copy of the database carries no usable token.
const key = keyFrom(process.env, KEY_FILE)
// Who is watching what: our API's streams, and the keeper's "is a page on it?" (F6 Decision 14).
const hub = createHub()
// F6 D4: the keeper, in both modes, reading only with each app's watch token, and emailing through
// nodemailer (D5) to Mailpit on the laptop in either mode.
const keeper = createKeeper({
  store,
  key,
  stream: platformStream(config.platformOrigin),
  watching: platformWatching(config.platformOrigin),
  now: () => new Date(),
  mailer: smtpMailer(config.smtpUrl, config.mailFrom),
  origin: config.origin,
  hub,
  // F6 Task 6 (D6): each live address looked at once a minute, through the edge; never in mock
  // mode, where the mock's app has no live address on the laptop (Decision 12).
  probe: (url) => probeAddress(url),
  probing: config.mode !== 'mock',
})

// The app is asked for only once we listen, which is after Vite exists: the closure reads
// `vite` then, and Vite needs our HTTP server first, for its HMR socket (`server.ws`, which
// Vite 8 names in place of the deprecated `server.hmr`).
const app = buildServer(
  config,
  (request, response) => vite.middlewares(request, response),
  { store, hub, intakeKeys, intakeModel: intakeModelFor(config, intakeKeys), keeper },
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
  `manifest-app (${config.mode}) on http://127.0.0.1:${config.port}, asking ${config.platformOrigin}, who at ${config.sessionOrigin}`,
)

// The keeper's streams closed with the server. A ceiling, so an open EventSource never holds a
// restart (tsx watch's, or a stop).
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.once(signal, () => {
    keeper.stop()
    setTimeout(() => process.exit(0), 1_000).unref()
    void app.close().then(
      () => process.exit(0),
      () => process.exit(1),
    )
  })
