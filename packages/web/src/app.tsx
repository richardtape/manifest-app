import { Button, Card, SideNav } from '@manifest-app/ui'
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { signInHref, signOut } from './auth.js'
import { mode as MODE, type Mode } from './mode.js'
import { createOurs, type Ours } from './ours/api.js'
import type { Platform } from './platform/api.js'
import { linkTo, navigate, useRoute } from './router.js'
import { AskForChange } from './screens/change/ask.js'
import { AppConversations } from './screens/change/conversations.js'
import { Describing } from './screens/describe/describe.js'
import { GoingLive } from './screens/going-live/going-live.js'
import { useKeeps } from './screens/keeps.js'
import { NotOpen, NotOpenHere } from './screens/not-open.js'
import { Overview } from './screens/overview/overview.js'
import { Preview } from './screens/preview/preview.js'
import { useApp } from './screens/preview/use-app.js'
import { useWatch } from './screens/keeping/watch.js'
import { History } from './screens/history/history.js'
import { Profile } from './screens/profile.js'
import { SignIn } from './screens/sign-in.js'
import { TroubleNotice } from './screens/trouble.js'
import { YourApps } from './screens/your-apps/your-apps.js'
import { useSession } from './session.js'
import { words } from './words.js'

/** Our own API, once: its stream opener must keep its identity across renders. */
const OURS = createOurs()
const rail = words.preview.rail

/**
 * THE SHELL: session, then route, then screen. Nothing is drawn while `getMe` is asked
 * (seconds, and no spinners: 20-states.md). Signed out is the sign-in screen, the only
 * one without a rail. Signed in, every screen sits beside the rail.
 */
export function App({
  platform,
  ours = OURS,
  now,
  timeZone,
  mode = MODE,
}: {
  platform: Platform
  ours?: Ours
  /** Which platform our server answers from: mode.ts's, unless a test says. */
  mode?: Mode
  /** For a test: the clock and the zone the limits' times are said in. */
  now?: () => Date
  timeZone?: string
}) {
  const { session, retry, expire } = useSession(platform)
  const { route, here } = useRoute()
  const [signOutFailed, setSignOutFailed] = useState(false)

  // AN APP'S OWN PAGES (F4 Task 5): the app their address names, once someone is signed in.
  const slug =
    route.name === 'app-overview' ||
    route.name === 'app-preview' ||
    route.name === 'app-going-live' ||
    route.name === 'app-conversations' ||
    route.name === 'app-change' ||
    route.name === 'app-history' ||
    route.name === 'conversation'
      ? route.slug
      : undefined
  const signedIn = session.state === 'signed-in' || session.state === 'expired'
  // D7 (FE-39): someone who may not build keeps their apps, and starts nothing new; with none,
  // the one screen that says so, and nothing is looked up for them.
  const me =
    session.state === 'signed-in' || session.state === 'expired' ? session.me : undefined
  const keeps = useKeeps(platform, me, expire)
  const builds = keeps.state === 'builds'
  const { lookup, retry: retryApp } = useApp(
    platform,
    signedIn && (builds || keeps.state === 'some') ? slug : undefined,
    expire,
  )
  // F6 TASK 8: ON EVERY APP PAGE, our server's Keeping watch for the app, minted when it has
  // none that works (never for one switched off). Once per app; it never throws or shows.
  useWatch(platform, ours, lookup.state === 'found' ? lookup.project : undefined)
  // A conversation's project, as its screen reports it: the rail names it once it exists.
  const [talking, setTalking] = useState<{ name: string; slug: string } | null>(null)
  const conversationId = route.name === 'conversation' ? route.id : undefined
  useEffect(() => setTalking(null), [conversationId])
  const app =
    lookup.state === 'found'
      ? { name: lookup.project.name, slug: lookup.project.slug }
      : route.name === 'conversation'
        ? talking
        : null

  // FOCUS FOLLOWS AN IN-APP NAVIGATION TO THE PAGE (the final review): otherwise it stays on
  // the rail's link, or falls to <body> when the link it was on goes. Not on first load,
  // where the browser's own place is right.
  const arrived = useRef(false)
  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true
      return
    }
    document.getElementById('main')?.focus()
    // A failed sign-out's notice belongs to the page it happened on (the final review).
    setSignOutFailed(false)
  }, [here])

  // Each page names its tab, so a person with several open, or a screen reader, can tell
  // them apart.
  // Someone who may not build, at a new start: the page says it is not open to them (D7).
  const notHere =
    !builds &&
    (route.name === 'new' || (route.name === 'conversation' && slug === undefined))
  useEffect(() => {
    document.title =
      session.state === 'signed-out'
        ? words.signIn.tab
        : keeps.state === 'none' ||
            keeps.state === 'loading' ||
            keeps.state === 'trouble' ||
            notHere
          ? words.shell.manifest
          : route.name === 'your-apps'
            ? words.shell.yourApps
            : route.name === 'profile'
              ? words.profile.title
              : route.name === 'new' || route.name === 'conversation'
                ? words.describe.tab
                : lookup.state === 'found'
                  ? lookup.project.name
                  : words.shell.manifest
  }, [session.state, keeps.state, notHere, route.name, lookup])

  // MOCK MODE SAYS SO (F5 Task 3): first on every page, signed in or not, in words. Rich met
  // a mock-mode server through the edge on 2026-09-29, and nothing on the page told him.
  const framed = (page: ReactNode) =>
    mode === 'mock' ? (
      <div className="mock-frame">
        <div className="mock-banner mono" role="note">
          {words.mockMode.banner}
        </div>
        {page}
      </div>
    ) : (
      page
    )

  if (session.state === 'loading') return framed(null)
  if (session.state === 'signed-out') return framed(<SignIn returnTo={here} />)
  if (session.state === 'unreachable' || session.state === 'refused')
    return framed(
      <main className="app-alone">
        <TroubleNotice
          trouble={
            session.state === 'refused'
              ? { kind: 'refused', code: session.code, status: session.status }
              : { kind: 'unreachable' }
          }
          onRetry={retry}
        />
      </main>,
    )
  if (keeps.state === 'loading')
    // Their session ended while we looked (a 401): sign in again, never a blank page.
    return framed(
      session.state === 'expired' ? (
        <main className="app-alone">
          <div role="alert">
            <Card tone="attention">
              <p className="body-lead">{words.expired.body}</p>
              <Button kind="primary" href={signInHref(here)}>
                {words.expired.button}
              </Button>
            </Card>
          </div>
        </main>
      ) : null,
    )
  if (keeps.state === 'trouble')
    return framed(
      <main className="app-alone">
        <TroubleNotice trouble={keeps.trouble} onRetry={keeps.retry} />
      </main>,
    )
  if (keeps.state === 'none') return framed(<NotOpen name={session.me.displayName} />)

  const leave = () => {
    setSignOutFailed(false)
    return signOut().catch(() => setSignOutFailed(true))
  }
  // SideNav's Sign out is the design system's <a> (its markup is held by the parity test),
  // and signing out is a POST. So its plain click is caught here; its href is /signed-out,
  // a page with a real button, so opening it in a new tab signs nobody out.
  const onRail = (e: MouseEvent) => {
    const target = e.target as Element
    const link = target.closest('a')
    if (
      link === null ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0
    )
      return
    const path = link.getAttribute('href') ?? ''
    if (link.classList.contains('mf-rail__out')) {
      e.preventDefault()
      void leave()
    } else if (path.startsWith('/')) {
      e.preventDefault()
      navigate(path)
    }
  }

  let page: ReactNode
  if (route.name === 'your-apps')
    page = <YourApps platform={platform} ours={ours} me={session.me} expire={expire} />
  else if (route.name === 'profile')
    page = <Profile me={session.me} onSignOut={() => void leave()} />
  else if (
    route.name === 'app-overview' ||
    route.name === 'app-preview' ||
    route.name === 'app-going-live' ||
    route.name === 'app-conversations' ||
    route.name === 'app-change' ||
    route.name === 'app-history'
  )
    page =
      lookup.state === 'trouble' ? (
        <TroubleNotice trouble={lookup.trouble} onRetry={retryApp} />
      ) : lookup.state === 'missing' ? (
        <p className="body-lead">
          {words.notFound.body} <a {...linkTo('/')}>{words.notFound.link}</a>
        </p>
      ) : lookup.state !== 'found' ? null : route.name === 'app-overview' ? (
        <Overview
          key={lookup.project.id}
          platform={platform}
          ours={ours}
          project={lookup.project}
          expire={expire}
          timeZone={timeZone}
          then={route.then}
          {...(now === undefined ? {} : { now })}
        />
      ) : route.name === 'app-going-live' ? (
        <GoingLive
          key={lookup.project.id}
          platform={platform}
          ours={ours}
          project={lookup.project}
          expire={expire}
          timeZone={timeZone}
          then={route.then}
          {...(now === undefined ? {} : { now })}
        />
      ) : route.name === 'app-preview' ? (
        <Preview
          key={lookup.project.id}
          platform={platform}
          ours={ours}
          project={lookup.project}
          tab={route.tab}
          expire={expire}
          {...(now === undefined ? {} : { now })}
          {...(timeZone === undefined ? {} : { timeZone })}
        />
      ) : route.name === 'app-history' ? (
        <History
          key={lookup.project.id}
          ours={ours}
          project={lookup.project}
          timeZone={timeZone}
        />
      ) : route.name === 'app-change' ? (
        <AskForChange
          key={lookup.project.id}
          platform={platform}
          ours={ours}
          project={lookup.project}
          expire={expire}
        />
      ) : (
        <AppConversations
          key={lookup.project.id}
          ours={ours}
          project={lookup.project}
          expire={expire}
          now={now ?? (() => new Date())}
          timeZone={timeZone}
        />
      )
  else if (notHere) page = <NotOpenHere />
  else if (route.name === 'new' || route.name === 'conversation') {
    const from = new URLSearchParams(here.split('?')[1] ?? '').get('from') ?? undefined
    // One element for both, in one place: what a press began survives the id arriving.
    page = (
      <Describing
        key="describing"
        platform={platform}
        ours={ours}
        expire={expire}
        {...(now === undefined ? {} : { now })}
        {...(timeZone === undefined ? {} : { timeZone })}
        {...(route.name === 'conversation' ? { id: route.id } : {})}
        {...(from === undefined ? {} : { from })}
        onProject={setTalking}
      />
    )
  } else if (route.name === 'signed-out')
    page = (
      <>
        <h1 className="page-title">{words.signOut.title}</h1>
        <div>
          <Button kind="secondary" onClick={() => void leave()}>
            {words.signOut.button}
          </Button>
        </div>
      </>
    )
  else
    page = (
      <>
        <p className="body-lead">
          {words.notFound.body} <a {...linkTo('/')}>{words.notFound.link}</a>
        </p>
      </>
    )

  return framed(
    <div className="app-shell">
      {/* The keyboard's first stop: without it, Tab ran down the rail and out of the page. */}
      <a className="skip-link" href="#main">
        {words.shell.skipToContent}
      </a>
      {/* A wrapper for the rail's clicks: the links inside it are what the keyboard reaches. */}
      <div className="app-rail" onClick={onRail}>
        <SideNav
          collapsible
          userHref="/profile"
          {...(route.name === 'your-apps'
            ? { active: words.shell.yourApps }
            : route.name === 'app-overview'
              ? { active: rail.overview }
              : route.name === 'app-preview'
                ? { active: rail.preview }
                : route.name === 'app-going-live'
                  ? { active: rail.goingLive }
                  : route.name === 'app-conversations' ||
                      route.name === 'app-change' ||
                      (route.name === 'conversation' && route.slug !== undefined)
                    ? { active: rail.conversations }
                    : route.name === 'new' || route.name === 'conversation'
                      ? { active: words.shell.startNew }
                      : {})}
          {...(app === null
            ? {}
            : {
                projectName: app.name,
                // F5 Decision 2: the app's four pages. People and Agents come with their plans.
                items: [
                  { label: rail.overview, icon: 'overview', path: '' },
                  { label: rail.preview, icon: 'preview', path: '/preview' },
                  { label: rail.conversations, icon: 'talk', path: '/conversations' },
                  { label: rail.goingLive, icon: 'live', path: '/going-live' },
                ].map(({ label, icon, path }) => ({
                  label,
                  icon,
                  href: `/apps/${encodeURIComponent(app.slug)}${path}`,
                })),
              })}
          homeHref="/"
          newLabel={builds ? words.shell.startNew : null}
          newHref="/new"
          user={session.me.displayName}
          signOutHref="/signed-out"
        />
      </div>
      <main className="app-main" id="main" tabIndex={-1}>
        {session.state === 'expired' ? (
          <div role="alert">
            <Card tone="attention">
              <p className="body-lead">{words.expired.body}</p>
              <Button kind="primary" href={signInHref(here)}>
                {words.expired.button}
              </Button>
            </Card>
          </div>
        ) : null}
        {signOutFailed ? (
          <div role="alert">
            <Card tone="attention">
              <p className="body-lead">{words.signOut.failed}</p>
            </Card>
          </div>
        ) : null}
        {page}
      </main>
    </div>,
  )
}
