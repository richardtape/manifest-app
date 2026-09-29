import { useEffect, useState, type MouseEvent } from 'react'

/**
 * A ROUTER OF OUR OWN (Decision 8), the console's shape: real paths over `pushState`, so a
 * deep link survives a sign-in (`returnTo` is a path). Our server hands every non-API path
 * to the app, and Vite answers it with `index.html` (appType `spa`).
 */
export type Tab = 'draft' | 'trying-out' | 'students'
export const TABS: Tab[] = ['draft', 'trying-out', 'students']

export type Route =
  | { name: 'your-apps' }
  | { name: 'signed-out' }
  /** Describe what you need (moment 3): their words, before a conversation exists. */
  | { name: 'new' }
  /**
   * A conversation (F2, F3): the one their words began, at `/new/:id`, or one on an app, at
   * `/apps/:slug/conversations/:id` (F4). The same screen draws both.
   */
  | { name: 'conversation'; id: string; slug?: string }
  /** An app's own page, the Preview (F4, moment 7): `/apps/:slug?tab=…`, the draft by default. */
  | { name: 'app-preview'; slug: string; tab: Tab }
  /** Every piece of work on an app (F4 Task 9). */
  | { name: 'app-conversations'; slug: string }
  /** Ask for a change (F4 Task 9). */
  | { name: 'app-change'; slug: string }
  | { name: 'profile' }
  | { name: 'unknown' }

/** A path's piece, decoded; a malformed one is a page we do not have, never a crash (the final review). */
function decoded(piece: string): string | undefined {
  try {
    return decodeURIComponent(piece)
  } catch {
    return undefined
  }
}

export function parse(pathname: string, search = ''): Route {
  if (pathname === '/') return { name: 'your-apps' }
  if (pathname === '/signed-out') return { name: 'signed-out' }
  if (pathname === '/new') return { name: 'new' }
  if (pathname === '/profile') return { name: 'profile' }
  const app = /^\/apps\/([^/]+)(?:\/(conversations|change))?(?:\/([^/]+))?$/.exec(
    pathname,
  )
  if (app !== null) {
    const slug = decoded(app[1]!)
    const [, , page, id] = app
    if (slug === undefined) return { name: 'unknown' }
    if (id !== undefined) {
      const conversation = page === 'conversations' ? decoded(id) : undefined
      return conversation === undefined
        ? { name: 'unknown' }
        : { name: 'conversation', id: conversation, slug }
    }
    if (page === 'conversations') return { name: 'app-conversations', slug }
    if (page === 'change') return { name: 'app-change', slug }
    const asked = new URLSearchParams(search).get('tab')
    const tab = TABS.find((t) => t === asked) ?? 'draft'
    return { name: 'app-preview', slug, tab }
  }
  const conversation = /^\/new\/([^/]+)$/.exec(pathname)
  if (conversation?.[1] !== undefined) {
    const id = decoded(conversation[1])
    return id === undefined ? { name: 'unknown' } : { name: 'conversation', id }
  }
  return { name: 'unknown' }
}

export function navigate(path: string): void {
  window.history.pushState({}, '', path)
  // pushState fires no popstate, so the one listener useRoute installs is told.
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/**
 * THE ADDRESS BAR FOLLOWS THE PAGE, AND NOTHING ELSE MOVES (F4 Task 5): the Preview's tab is kept
 * in the address, so a reload or a shared link opens it, without a navigation. A navigation
 * would take the focus to the page (App), away from the tab the arrow keys just moved to.
 */
export function remember(path: string): void {
  window.history.replaceState({}, '', path)
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
  const [path, query = ''] = here.split('?', 2)
  return { route: parse(path ?? '/', query), here }
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
