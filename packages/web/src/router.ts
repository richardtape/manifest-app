import { useEffect, useState, type MouseEvent } from 'react'

/**
 * A ROUTER OF OUR OWN (Decision 8), the console's shape: real paths over `pushState`, so a
 * deep link survives a sign-in (`returnTo` is a path). Our server hands every non-API path
 * to the app, and Vite answers it with `index.html` (appType `spa`).
 */
export type Route =
  | { name: 'your-apps' }
  | { name: 'signed-out' }
  /** Describe what you need: not built until F2, and the page says so. */
  | { name: 'new' }
  /** An app's own page: not built yet, and the page says so. */
  | { name: 'app'; slug: string }
  | { name: 'profile' }
  | { name: 'unknown' }

export function parse(pathname: string): Route {
  if (pathname === '/') return { name: 'your-apps' }
  if (pathname === '/signed-out') return { name: 'signed-out' }
  if (pathname === '/new') return { name: 'new' }
  if (pathname === '/profile') return { name: 'profile' }
  const app = /^\/apps\/([^/]+)$/.exec(pathname)
  if (app?.[1] !== undefined) return { name: 'app', slug: decodeURIComponent(app[1]) }
  return { name: 'unknown' }
}

export function navigate(path: string): void {
  window.history.pushState({}, '', path)
  // pushState fires no popstate, so the one listener useRoute installs is told.
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/** The route, and the path and query it came from (what `returnTo` names). */
export function useRoute(): { route: Route; here: string } {
  const read = () => window.location.pathname + window.location.search
  const [here, setHere] = useState(read)
  useEffect(() => {
    const onPop = () => setHere(read())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return { route: parse(here.split('?', 1)[0] ?? '/'), here }
}

/** An in-app link: a real anchor, with the plain left click kept in the page. */
export function linkTo(path: string): { href: string; onClick: (e: MouseEvent) => void } {
  return {
    href: path,
    onClick: (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      e.preventDefault()
      navigate(path)
    },
  }
}
