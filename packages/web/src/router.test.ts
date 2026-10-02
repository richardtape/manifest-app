import { describe, expect, it } from 'vitest'
import { canonical, parse } from './router.js'

describe('the router', () => {
  it.each([
    ['/', { name: 'your-apps' }],
    ['/profile', { name: 'profile' }],
    ['/signed-out', { name: 'signed-out' }],
    ['/new', { name: 'new' }],
    ['/new/c-1', { name: 'conversation', id: 'c-1' }],
    ['/new/a%2Fb', { name: 'conversation', id: 'a/b' }],
    ['/new/c-1/more', { name: 'unknown' }],
    ['/nowhere', { name: 'unknown' }],
    // F4 Task 5: an app's own pages; F5 Task 5: the Overview is its landing page (Decision 1).
    ['/apps/mock-app', { name: 'app-overview', slug: 'mock-app', then: null }],
    ['/apps/mock-app/preview', { name: 'app-preview', slug: 'mock-app', tab: 'draft' }],
    [
      '/apps/mock-app/going-live',
      { name: 'app-going-live', slug: 'mock-app', then: null },
    ],
    ['/apps/mock-app/preview/more', { name: 'unknown' }],
    ['/apps/mock-app/going-live/more', { name: 'unknown' }],
    ['/apps/mock-app/conversations', { name: 'app-conversations', slug: 'mock-app' }],
    ['/apps/mock-app/change', { name: 'app-change', slug: 'mock-app' }],
    [
      '/apps/mock-app/conversations/c-1',
      { name: 'conversation', id: 'c-1', slug: 'mock-app' },
    ],
    ['/apps/mock-app/elsewhere', { name: 'unknown' }],
    ['/apps/mock-app/conversations/c-1/more', { name: 'unknown' }],
    // F6 Task 9: an app's history.
    ['/apps/mock-app/history', { name: 'app-history', slug: 'mock-app' }],
    ['/apps/mock-app/history/more', { name: 'unknown' }],
  ])('%s', (path, route) => expect(parse(path)).toEqual(route))

  it.each([
    ['?tab=trying-out', 'trying-out'],
    ['?tab=students', 'students'],
    ['?tab=draft', 'draft'],
    ['?tab=nonsense', 'draft'],
    ['', 'draft'],
  ])("the Preview's tab from %s is %s", (search, tab) =>
    expect(parse('/apps/mock-app/preview', search)).toEqual({
      name: 'app-preview',
      slug: 'mock-app',
      tab,
    }),
  )

  it.each([
    ['?then=live', 'live'],
    ['then=live', 'live'],
    ['?then=dry-run', 'dry-run'],
    ['?then=somewhere', null],
    ['', null],
  ])(
    'Going live’s `then` from %s is %s (Decision 10, and the dry run’s: back from the step-up)',
    (search, then) =>
      expect(parse('/apps/mock-app/going-live', search)).toEqual({
        name: 'app-going-live',
        slug: 'mock-app',
        then,
      }),
  )

  it.each([
    ['?then=start-again', 'start-again'],
    ['?then=students', 'students'],
    ['?then=switch-off', 'switch-off'],
    ['then=delete', 'delete'],
    // Going live's presses are Going live's: the Overview has none of them.
    ['?then=live', null],
    ['?then=dry-run', null],
    ['?then=somewhere', null],
    ['', null],
  ])(
    'the Overview’s `then` from %s is %s (F6 Decision 10: back from the step-up)',
    (search, then) =>
      expect(parse('/apps/mock-app', search)).toEqual({
        name: 'app-overview',
        slug: 'mock-app',
        then,
      }),
  )

  it.each(['?then=start-again', '?then=switch-off', '?then=students', '?then=delete'])(
    'Going live never takes the Overview’s %s',
    (search) =>
      expect(parse('/apps/mock-app/going-live', search)).toEqual({
        name: 'app-going-live',
        slug: 'mock-app',
        then: null,
      }),
  )

  // REVIEW FOCUS 5: F4's addresses still open what they opened, and the bar shows the new one.
  it.each([
    ['?tab=trying-out', 'trying-out'],
    ['tab=students', 'students'],
    ['?tab=nonsense', 'draft'],
  ])('F4’s /apps/mock-app%s opens the Preview’s %s tab', (search, tab) => {
    expect(parse('/apps/mock-app', search)).toEqual({
      name: 'app-preview',
      slug: 'mock-app',
      tab,
    })
    expect(canonical('/apps/mock-app', search)).toBe(`/apps/mock-app/preview?tab=${tab}`)
  })

  it.each([
    ['/apps/mock-app', ''],
    ['/apps/mock-app/preview', '?tab=trying-out'],
    ['/apps/mock-app/going-live', '?then=live'],
    ['/apps/mock-app', '?then=start-again'],
    ['/', ''],
    ['/apps/%E0', '?tab=draft'],
  ])('%s%s is already where it belongs', (path, search) =>
    expect(canonical(path, search)).toBeNull(),
  )

  it.each([
    '/apps/%E0',
    '/apps/%E0/conversations',
    '/apps/mock-app/conversations/%E0',
    '/apps/%E0/preview',
    '/apps/%E0/going-live',
  ])(
    'a malformed address, %s, is a page we do not have, never a crash (the final review)',
    (path) => expect(parse(path)).toEqual({ name: 'unknown' }),
  )
})
