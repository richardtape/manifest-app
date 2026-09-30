import { useEffect, useState, type MouseEvent } from 'react'

/**
 * A ROUTER OF OUR OWN (Decision 8), the console's shape: real paths over `pushState`, so a
 * deep link survives a sign-in (`returnTo` is a path). Our server hands every non-API path
 * to the app, and Vite answers it with `index.html` (appType `spa`).
 */
export type Tab = 'draft' | 'trying-out' | 'students'
export const TABS: Tab[] = ['draft', 'trying-out', 'students']

/** Where the step-up sends them back to on *Going live*: the press they were making. */
export type Then = 'live' | 'dry-run' | null
const thenOf = (then: string | null): Then =>
  then === 'live' || then === 'dry-run' ? then : null

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
  /** An app's landing page, its Overview (F5 Decision 1, moments 10 and 15): `/apps/:slug`. */
  | { name: 'app-overview'; slug: string }
  /**
   * An app's Preview (F4, moment 7): `/apps/:slug/preview?tab=…`, the draft by default. F4's
   * `/apps/:slug?tab=…` still opens it (`canonical`).
   */
  | { name: 'app-preview'; slug: string; tab: Tab }
  /**
   * Going live (F5, moments 10–14): `/apps/:slug/going-live`, and `?then=live` when the step-up
   * sends them back to finish letting their students in (Decision 10), or `?then=dry-run` to run
   * the dry run (Task 7: Spec action 8 (b)).
   */
  | { name: 'app-going-live'; slug: string; then: Then }
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
  const app =
    /^\/apps\/([^/]+)(?:\/(conversations|change|preview|going-live))?(?:\/([^/]+))?$/.exec(
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
    const query = new URLSearchParams(search)
    if (page === 'going-live')
      return {
        name: 'app-going-live',
        slug,
        then: thenOf(query.get('then')),
      }
    // The Preview, and F4's address for it: a `tab` on the bare path (Decision 1).
    if (page === 'preview' || query.has('tab')) {
      const asked = query.get('tab')
      return { name: 'app-preview', slug, tab: TABS.find((t) => t === asked) ?? 'draft' }
    }
    return { name: 'app-overview', slug }
  }
  const conversation = /^\/new\/([^/]+)$/.exec(pathname)
  if (conversation?.[1] !== undefined) {
    const id = decoded(conversation[1])
    return id === undefined ? { name: 'unknown' } : { name: 'conversation', id }
  }
  return { name: 'unknown' }
}

/**
 * F4'S ADDRESSES, KEPT WORKING (F5 Decision 1, Review Focus 5): `/apps/:slug?tab=…` opened the
 * Preview, which now lives at `/apps/:slug/preview`. This is the address it has now, or null when
 * the address is already where it belongs. No link or bookmark breaks.
 */
export function canonical(pathname: string, search = ''): string | null {
  if (!/^\/apps\/[^/]+$/.test(pathname)) return null
  const route = parse(pathname, search)
  return route.name === 'app-preview'
    ? `${pathname}/preview?tab=${encodeURIComponent(route.tab)}`
    : null
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

/**
 * The route, and the path and query it came from (what `returnTo` names). An old address is
 * rewritten where it is read, by `remember` (no navigation, and so no move of the focus), so
 * `here` is always the address the bar shows.
 */
export function useRoute(): { route: Route; here: string } {
  const read = () => {
    const moved = canonical(window.location.pathname, window.location.search)
    if (moved !== null) remember(moved)
    return window.location.pathname + window.location.search
  }
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
