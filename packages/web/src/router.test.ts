import { describe, expect, it } from 'vitest'
import { parse } from './router.js'

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
    // F4 Task 5: an app's own pages.
    ['/apps/mock-app', { name: 'app-preview', slug: 'mock-app', tab: 'draft' }],
    ['/apps/mock-app/conversations', { name: 'app-conversations', slug: 'mock-app' }],
    ['/apps/mock-app/change', { name: 'app-change', slug: 'mock-app' }],
    [
      '/apps/mock-app/conversations/c-1',
      { name: 'conversation', id: 'c-1', slug: 'mock-app' },
    ],
    ['/apps/mock-app/elsewhere', { name: 'unknown' }],
    ['/apps/mock-app/conversations/c-1/more', { name: 'unknown' }],
  ])('%s', (path, route) => expect(parse(path)).toEqual(route))

  it.each([
    ['?tab=trying-out', 'trying-out'],
    ['?tab=students', 'students'],
    ['?tab=draft', 'draft'],
    ['?tab=nonsense', 'draft'],
    ['', 'draft'],
  ])("the Preview's tab from %s is %s", (search, tab) =>
    expect(parse('/apps/mock-app', search)).toEqual({
      name: 'app-preview',
      slug: 'mock-app',
      tab,
    }),
  )

  it.each(['/apps/%E0', '/apps/%E0/conversations', '/apps/mock-app/conversations/%E0'])(
    'a malformed address, %s, is a page we do not have, never a crash (the final review)',
    (path) => expect(parse(path)).toEqual({ name: 'unknown' }),
  )
})
