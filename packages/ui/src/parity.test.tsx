import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import * as Ours from './index.js'

type Component = React.FC<Record<string, unknown>>

/** The prototype's bundle, evaluated as the classic script it is, under OUR React (M2). */
function reference(): Record<string, Component> {
  const window: Record<string, unknown> = { React }
  runInNewContext(
    readFileSync(new URL('../reference/bundle.js', import.meta.url), 'utf8'),
    {
      window,
      React,
    },
  )
  return window['Manifest'] as Record<string, Component>
}
const REF = reference()
const html = (c: Component, props: Record<string, unknown>) =>
  renderToStaticMarkup(React.createElement(c, props))

const STATES = ['working', 'waiting', 'attention', 'steady', 'notyet'] as const
const KINDS = ['primary', 'secondary', 'tertiary', 'danger', 'ghostDanger'] as const
/** The bundle's NAV_ICONS keys, and one it does not have (it falls back to `overview`). */
const ICONS = [
  'apps',
  'overview',
  'preview',
  'talk',
  'live',
  'people',
  'agent',
  'plus',
  'nope',
]
/** manifest's SideNav/preview.html mounts these six. */
const PROJECT_ITEMS = [
  ['Overview', 'overview'],
  ['Preview', 'preview'],
  ['Conversations', 'talk'],
  ['Going live', 'live'],
  ['People', 'people'],
  ['Agents', 'agent'],
].map(([label, icon]) => ({ label, icon, href: '#' }))

/**
 * Each case's props come from the component's own preview.html in manifest, plus every
 * documented variant and the fallbacks the bundle's code has.
 */
const CASES: Record<string, Record<string, unknown>[]> = {
  StateChip: [
    ...STATES.map((state) => ({ state, label: state })),
    // preview.html
    { state: 'working', label: 'Working, a few minutes' },
    { state: 'waiting', label: 'Waiting on someone' },
    { state: 'attention', label: 'Needs you' },
    { state: 'steady', label: 'Steady' },
    { state: 'notyet', label: 'Not yet' },
    // pulse overridden both ways, a className, and a state from nowhere
    { state: 'working', label: 'Working, a few minutes', pulse: false },
    { state: 'steady', label: 'Steady', pulse: true },
    { state: 'waiting', label: 'Waiting', className: 'extra' },
    { state: 'no-such-state', label: 'Unknown' },
  ],
  Button: [
    { children: 'Make it' },
    ...KINDS.map((kind) => ({ kind, children: kind })),
    // preview.html
    { kind: 'primary', children: 'Make it' },
    { kind: 'secondary', children: 'Watch again' },
    { kind: 'tertiary', children: 'Open the app' },
    { kind: 'danger', children: 'Yes, revoke it' },
    { kind: 'ghostDanger', size: 'sm', children: 'Revoke it' },
    { kind: 'primary', disabled: true, children: 'Building…' },
    {
      kind: 'primary',
      style: { outline: '2px solid var(--focus-ring)', outlineOffset: 3 },
      children: 'Focus ring',
    },
    // the rest of the documented props
    { kind: 'secondary', size: 'sm', children: 'Small' },
    { href: '/somewhere', children: 'A link' },
    {
      href: '/somewhere',
      kind: 'tertiary',
      className: 'extra',
      disabled: true,
      children: 'A link',
    },
    { type: 'submit', children: 'Send' },
    { disabled: true, children: 'Building…' },
    { onClick: () => undefined, children: 'Click' },
  ],
  Card: [
    { children: 'Plain' },
    { tone: 'plain', title: 'Plain', children: 'Body' },
    ...(['working', 'waiting', 'attention', 'steady'] as const).map((tone) => ({
      tone,
      title: tone,
      children: 'Body',
    })),
    // preview.html
    {
      title: 'Next: build it',
      style: { flex: '1 1 0' },
      children: [
        React.createElement('p', { key: 'p' }, 'A few minutes. Watch it, or walk away.'),
        React.createElement('a', { key: 'a', href: '#' }, 'Build it →'),
      ],
    },
    {
      tone: 'working',
      title: 'You can close this page',
      style: { flex: '1 1 0' },
      children: 'x',
    },
    { tone: 'waiting', title: 'Worth knowing now', className: 'extra', children: 'y' },
  ],
  SideNav: [
    {},
    { active: 'Your apps', user: 'Instructor One' },
    { active: 'Your apps', newLabel: null },
    // preview.html
    {
      active: 'Going live',
      projectName: 'mock-app',
      items: PROJECT_ITEMS,
      user: 'Instructor One',
    },
    {
      active: 'Overview',
      projectName: 'Reading responses',
      items: [
        { label: 'Overview', href: '#', icon: 'overview' },
        { label: 'Preview', href: '#', icon: 'preview' },
      ],
      user: 'Instructor One',
    },
    // every icon, an item with no href, and one with no icon
    {
      items: [
        ...ICONS.map((icon) => ({ label: icon, icon, href: `/${icon}` })),
        { label: 'bare' },
      ],
      active: 'people',
    },
    // items with no project name, and a project name with no items
    { items: PROJECT_ITEMS.slice(0, 2) },
    { projectName: 'mock-app' },
    // every naming prop
    {
      name: 'Manifest',
      org: 'UBC Science',
      homeLabel: 'Home',
      homeHref: '/',
      newLabel: 'Describe what you need',
      newHref: '/new',
      active: 'Describe what you need',
      user: 'Instructor One',
      signOutHref: '/signed-out',
      className: 'extra',
      style: { minHeight: '100vh' },
    },
  ],
}

describe('the design system is the prototype’s, byte for byte (Decision 2)', () => {
  for (const [name, cases] of Object.entries(CASES)) {
    it(`${name} renders the reference's markup for every case`, () => {
      const ours = (Ours as unknown as Record<string, Component>)[name]
      const ref = REF[name]
      expect(ours, `${name} is exported`).toBeTypeOf('function')
      expect(ref, `${name} is in the reference`).toBeTypeOf('function')
      for (const props of cases)
        expect(html(ours!, props), JSON.stringify(props)).toBe(html(ref!, props))
    })
  }
})
