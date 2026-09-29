import { Button, Card, SideNav } from '@manifest-app/ui'
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { signInHref, signOut } from './auth.js'
import { createOurs, type Ours } from './ours/api.js'
import type { Platform } from './platform/api.js'
import { linkTo, navigate, useRoute } from './router.js'
import { AskForChange } from './screens/change/ask.js'
import { AppConversations } from './screens/change/conversations.js'
import { Describing } from './screens/describe/describe.js'
import { Preview } from './screens/preview/preview.js'
import { useApp } from './screens/preview/use-app.js'
import { Profile } from './screens/profile.js'
import { SignIn } from './screens/sign-in.js'
import { TroubleNotice } from './screens/trouble.js'
import { YourApps } from './screens/your-apps/your-apps.js'
import { useSession } from './session.js'
import { words } from './words.js'

/** Our own API, once: its stream opener must keep its identity across renders. */
const OURS = createOurs()

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
}: {
  platform: Platform
  ours?: Ours
  /** For a test: the clock and the zone the limits' times are said in. */
  now?: () => Date
  timeZone?: string
}) {
  const { session, retry, expire } = useSession(platform)
  const { route, here } = useRoute()
  const [signOutFailed, setSignOutFailed] = useState(false)

  // AN APP'S OWN PAGES (F4 Task 5): the app their address names, once someone is signed in.
  const slug =
    route.name === 'app-preview' ||
    route.name === 'app-conversations' ||
    route.name === 'app-change' ||
    route.name === 'conversation'
      ? route.slug
      : undefined
  const signedIn = session.state === 'signed-in' || session.state === 'expired'
  const { lookup, retry: retryApp } = useApp(
    platform,
    signedIn ? slug : undefined,
    expire,
  )
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
  useEffect(() => {
    document.title =
      session.state === 'signed-out'
        ? words.signIn.tab
        : route.name === 'your-apps'
          ? words.shell.yourApps
          : route.name === 'profile'
            ? words.profile.title
            : route.name === 'new' || route.name === 'conversation'
              ? words.describe.tab
              : lookup.state === 'found'
                ? lookup.project.name
                : words.shell.manifest
  }, [session.state, route.name, lookup])

  if (session.state === 'loading') return null
  if (session.state === 'signed-out') return <SignIn returnTo={here} />
  if (session.state === 'unreachable' || session.state === 'refused')
    return (
      <main className="app-alone">
        <TroubleNotice
          trouble={
            session.state === 'refused'
              ? { kind: 'refused', code: session.code, status: session.status }
              : { kind: 'unreachable' }
          }
          onRetry={retry}
        />
      </main>
    )

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
    page = <YourApps platform={platform} me={session.me} expire={expire} />
  else if (route.name === 'profile')
    page = <Profile me={session.me} onSignOut={() => void leave()} />
  else if (
    route.name === 'app-preview' ||
    route.name === 'app-conversations' ||
    route.name === 'app-change'
  )
    page =
      lookup.state === 'trouble' ? (
        <TroubleNotice trouble={lookup.trouble} onRetry={retryApp} />
      ) : lookup.state === 'missing' ? (
        <p className="body-lead">
          {words.notFound.body} <a {...linkTo('/')}>{words.notFound.link}</a>
        </p>
      ) : lookup.state !== 'found' ? null : route.name === 'app-preview' ? (
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

  return (
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
            : route.name === 'app-preview'
              ? { active: words.preview.rail.preview }
              : route.name === 'app-conversations' ||
                  route.name === 'app-change' ||
                  (route.name === 'conversation' && route.slug !== undefined)
                ? { active: words.preview.rail.conversations }
                : route.name === 'new' || route.name === 'conversation'
                  ? { active: words.shell.startNew }
                  : {})}
          {...(app === null
            ? {}
            : {
                projectName: app.name,
                items: [
                  {
                    label: words.preview.rail.preview,
                    icon: 'preview',
                    href: `/apps/${encodeURIComponent(app.slug)}`,
                  },
                  {
                    label: words.preview.rail.conversations,
                    icon: 'talk',
                    href: `/apps/${encodeURIComponent(app.slug)}/conversations`,
                  },
                ],
              })}
          homeHref="/"
          newLabel={words.shell.startNew}
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
    </div>
  )
}
