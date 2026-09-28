// @vitest-environment jsdom
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SideNav } from './index.js'

/**
 * OUR TWO EXTENSIONS TO THE PROTOTYPE'S SideNav (Rich's click-through, F1 sitting 5). Neither
 * is in the reference, so parity.test.tsx cannot hold them; it still holds that without
 * them the markup is the reference's, byte for byte.
 *
 * - `collapsible`: below 900px the rail is icons only (ui's components.css). Each label is wrapped
 *   so it can be hidden while staying the link's accessible name, and a `title` names it to a
 *   pointer.
 * - `userHref`: the person is a link, with an icon, to their profile. Collapsed, it is the
 *   icon alone, and Sign out lives on the profile.
 */
const html = (props: React.ComponentProps<typeof SideNav>) =>
  renderToStaticMarkup(React.createElement(SideNav, props))
const dom = (markup: string) => {
  const template = document.createElement('template')
  template.innerHTML = markup
  return template.content
}

describe('SideNav, collapsible', () => {
  const nav = dom(
    html({
      collapsible: true,
      active: 'Your apps',
      items: [{ label: 'Overview', href: '/o', icon: 'overview' }],
      projectName: 'mock-app',
      user: 'Instructor One',
    }),
  )

  it('marks the rail collapsible', () =>
    expect(nav.querySelector('nav')?.className).toBe('mf-rail mf-rail--collapsible'))

  it('wraps every item’s label, and titles the item with it', () => {
    const items = [...nav.querySelectorAll('.mf-rail__item')]
    expect(items.map((a) => a.querySelector('.mf-rail__label')?.textContent)).toEqual([
      'Your apps',
      'Start something new',
      'Overview',
    ])
    expect(items.map((a) => a.getAttribute('title'))).toEqual([
      'Your apps',
      'Start something new',
      'Overview',
    ])
  })

  it('keeps the label as the item’s text, so it stays its accessible name (styles.test.ts holds the CSS that hides it)', () =>
    expect([...nav.querySelectorAll('.mf-rail__item')].map((a) => a.textContent)).toEqual(
      ['Your apps', 'Start something new', 'Overview'],
    ))
})

describe('SideNav, the person as a link to their profile', () => {
  const foot = dom(html({ user: 'Instructor One', userHref: '/profile' })).querySelector(
    '.mf-rail__foot',
  )

  it('is a link to the profile, with an icon, named by the person', () => {
    const who = foot?.querySelector('a.mf-rail__who')
    expect(who?.getAttribute('href')).toBe('/profile')
    expect(who?.getAttribute('title')).toBe('Instructor One')
    expect(who?.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    expect(who?.querySelector('.mf-rail__label')?.textContent).toBe('Instructor One')
  })

  it('still offers Sign out beside it', () =>
    expect(foot?.querySelector('a.mf-rail__out')?.textContent).toBe('Sign out'))

  it('without userHref, the person is the reference’s plain span', () =>
    expect(
      dom(html({ user: 'Instructor One' })).querySelector('.mf-rail__who')?.outerHTML,
    ).toBe('<span class="mf-rail__who">Instructor One</span>'))
})
