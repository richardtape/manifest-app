import { Button, Card, SideNav } from '@manifest-app/ui'
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { signInHref, signOut } from './auth.js'
import type { Platform } from './platform/api.js'
import { linkTo, navigate, useRoute } from './router.js'
import { SignIn } from './screens/sign-in.js'
import { YourApps } from './screens/your-apps/your-apps.js'
import { useSession } from './session.js'
import { words } from './words.js'

/**
 * THE SHELL: session, then route, then screen. Nothing is drawn while `getMe` is asked
 * (seconds, and no spinners: 20-states.md). Signed out is the sign-in screen, the only
 * one without a rail. Signed in, every screen sits beside the rail.
 */
export function App({ platform }: { platform: Platform }) {
  const { session, retry, expire } = useSession(platform)
  const { route, here } = useRoute()
  const [signOutFailed, setSignOutFailed] = useState(false)

  // Each page names its tab, so a person with several open, or a screen reader, can tell
  // them apart.
  useEffect(() => {
    document.title =
      session.state === 'signed-out'
        ? words.signIn.tab
        : route.name === 'your-apps'
          ? words.shell.yourApps
          : words.shell.manifest
  }, [session.state, route.name])

  if (session.state === 'loading') return null
  if (session.state === 'signed-out') return <SignIn returnTo={here} />
  if (session.state === 'unreachable')
    return (
      <main className="app-alone">
        <Unreachable onRetry={retry} />
      </main>
    )

  const leave = () => signOut().catch(() => setSignOutFailed(true))
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
  else if (route.name === 'signed-out')
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
        {route.name === 'new' ? (
          <p className="body-lead">{words.notFound.describingNext}</p>
        ) : null}
        <p className="body-lead">
          {words.notFound.body} <a {...linkTo('/')}>{words.notFound.link}</a>
        </p>
      </>
    )

  return (
    <div className="app-shell">
      {/* A wrapper for the rail's clicks: the links inside it are what the keyboard reaches. */}
      <div className="app-rail" onClick={onRail}>
        <SideNav
          {...(route.name === 'your-apps' ? { active: words.shell.yourApps } : {})}
          homeHref="/"
          newLabel={words.shell.startNew}
          newHref="/new"
          user={session.me.displayName}
          signOutHref="/signed-out"
        />
      </div>
      <main className="app-main">
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

function Unreachable({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert">
      <Card>
        <p className="body-lead">{words.unreachable.body}</p>
        <Button kind="secondary" onClick={onRetry}>
          {words.unreachable.button}
        </Button>
      </Card>
    </div>
  )
}
