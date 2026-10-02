/**
 * A READ-ONLY WALK OF OUR SCREENS, and the walk library's proof against the real app: signed
 * in by *Continue with CWL* (mock mode: Instructor One), then Your apps, an app's Overview and
 * its Preview, at 1280 and 375. It presses nothing that starts work (no Describe, no Make it,
 * no change asked): the library blocks every write, and the walk checks none was tried.
 *
 *   node scripts/walk/read-only.ts [out-directory]          # our server on 7105, mock mode
 *   WALK_BASE=https://app.manifest.internal node …          # through the edge (Rich's word)
 *
 * At each screen: its heading; no machinery word (C3, the web's own list, hostnames left out);
 * every button and link named in Chrome's accessibility tree; and the three fit checks.
 */
import { machineryIn } from '../../packages/web/src/screens/machinery.ts'
import { OURS, signInHere, walk } from './index.ts'
import type { Page, Report } from './index.ts'

const { page, report } = await walk({
  base: process.env.WALK_BASE ?? OURS,
  out: process.argv[2],
})

/** What every screen is held to, whatever it shows. */
async function screen(name: string, heading: string) {
  const h1 = await page.until(
    `${name}'s heading`,
    (wanted: string) => {
      const h1 = document.querySelector('main h1')?.textContent ?? ''
      return h1 && (!wanted || h1 === wanted) ? h1 : ''
    },
    [heading],
  )
  report.check(`${page.width} ${name}: its heading`, true, h1)
  const words = await page.words('main', '.mono')
  const machinery = machineryIn(words)
  report.check(
    `${page.width} ${name}: no machinery word`,
    machinery.length === 0,
    machinery.join(', '),
  )
  const unnamed = (await page.names())
    .filter((n) => ['button', 'link', 'tab'].includes(n.role) && !n.name.trim())
    .map((n) => n.role)
  report.check(
    `${page.width} ${name}: every control named`,
    unnamed.length === 0,
    unnamed.join(', '),
  )
  const problems = await page.layout()
  report.check(`${page.width} ${name}: fits`, problems.length === 0, problems.join(' | '))
  await page.shot(name)
  return h1
}

async function yourApps(report: Report, page: Page) {
  await page.go('/')
  await page.until(
    'the apps, or none yet',
    () => !!document.querySelector('.app-card, .your-apps__empty'),
    [],
  )
  await screen('your-apps', 'Your apps')
  const apps = await page.run(() =>
    [...document.querySelectorAll<HTMLAnchorElement>('a.app-card__link')].map((a) => ({
      name: (a.textContent ?? '').trim(),
      href: a.getAttribute('href') ?? '',
    })),
  )
  report.check(
    `${page.width} your-apps: at least one app to walk`,
    apps.length > 0,
    JSON.stringify(apps),
  )
  const links = (await page.names('link')).map((n) => n.name)
  report.check(
    `${page.width} your-apps: each app's link is named for it`,
    apps.every((app) => links.includes(app.name)),
    JSON.stringify(links),
  )
  return apps[0]
}

await page.setWidth(1280)
await signInHere(page)
const me = await page.run(
  async () => (await (await fetch('/api/me')).json()) as { displayName?: string },
)
report.check(
  'signed in by Continue with CWL',
  typeof me.displayName === 'string',
  me.displayName ?? '',
)

for (const width of [1280, 375]) {
  await page.setWidth(width)
  const app = await yourApps(report, page)
  if (!app) break

  await page.go(app.href)
  await page.until(
    'the Overview read',
    () => !!document.querySelector('.overview__change, [role=alert]'),
    [],
  )
  await screen('overview', app.name)

  await page.go(`${app.href}/preview`)
  await page.until(
    'the tabs',
    () => document.querySelectorAll('[role=tab]').length > 0,
    [],
  )
  await screen('preview', app.name)
  const tabs = (await page.names('tab')).map((t) => t.name)
  report.check(
    `${width} preview: its three tabs, named`,
    JSON.stringify(tabs) ===
      JSON.stringify(['Your draft', 'Trying out', 'For your students']),
    JSON.stringify(tabs),
  )
  const shown = await page.after(
    'Trying out',
    () => page.press('Trying out', { role: 'tab' }),
    () =>
      document.querySelector('[role=tabpanel]:not([hidden])')?.getAttribute('aria-label'),
    [],
  )
  report.check(
    `${width} preview: Trying out, pressed, shows its panel`,
    shown === 'Trying out',
    String(shown),
  )
  const problems = await page.layout()
  report.check(
    `${width} preview, trying out: fits`,
    problems.length === 0,
    problems.join(' | '),
  )
  await page.shot('preview-trying-out')
}

report.finish([page])
