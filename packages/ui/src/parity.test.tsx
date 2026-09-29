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
  // F2 Task 7: the three moments 3 and 4 need.
  LiveSteps: [
    { steps: [] },
    {},
    // preview.html, both columns
    {
      steps: [
        { text: 'Reading how your app is put together', state: 'done' },
        { text: 'Fetching the JavaScript toolkit it runs on', state: 'done' },
        { text: 'Installing the 135 pieces it depends on', state: 'now' },
        { text: 'Packaging it up', state: 'next' },
        { text: 'Storing it, ready to run', state: 'next' },
      ],
    },
    {
      steps: [
        { text: 'Made the change', state: 'done' },
        { text: 'Put it where you can try it', state: 'done' },
        {
          text: 'Tried to go live for your class',
          state: 'halted',
          note: 'And was stopped at the door. Nothing about your running app has changed.',
        },
      ],
    },
    // a step with no state is next; a note on every state; a className
    {
      steps: [
        { text: 'No state' },
        { text: 'Done, with a note', state: 'done', note: 'Why' },
        { text: 'Now, with a note', state: 'now', note: 'Still going' },
        { text: 'Next, with a note', state: 'next', note: 'Later' },
      ],
      className: 'extra',
    },
  ],
  // F3 Task 10: moment 6's machine text, and its two facts.
  InverseSurface: [
    {},
    // preview.html: a log, and a one-time key with its warning mark and a button
    {
      style: { flex: '1 1 0', minWidth: 0 },
      children: React.createElement(REF['LogPane']!, {
        writtenBefore: 2,
        lines: [
          '#1 [internal] load build definition',
          '#1 DONE 0.1s',
          '#7 added 135 packages',
        ],
      }),
    },
    {
      style: { flex: '1 1 0', minWidth: 0 },
      warn: true,
      title: 'The only time you will see this',
      body: 'We keep a fingerprint, not the key. Once you close this we cannot show it again.',
      inset: 'mft_77777777-7777-4777-8777-777777777777_ZmFrZS1zZWNyZXQ',
      children: React.createElement('button', { type: 'button' }, 'Copy it'),
    },
    // a title without the mark; the mark without a title draws nothing; body alone; a className
    { title: 'Title', body: 'Body' },
    { warn: true, body: 'No title, so no mark' },
    { inset: 'mono', className: 'extra' },
  ],
  LogPane: [
    { lines: [] },
    {},
    // preview.html
    {
      writtenBefore: 2,
      lines: [
        '#1 [internal] load build definition',
        '#1 transferring dockerfile: 892B done',
        '#1 DONE 0.1s',
        '#7 [4/8] RUN npm ci --omit=dev',
        '#7 added 135 packages in 6s',
      ],
    },
    // none written before; all of them; more than there are; 1,000 lines' numbering; a className and style
    { lines: ['a', 'b'] },
    { lines: ['a', 'b'], writtenBefore: 2 },
    { lines: ['a'], writtenBefore: 5 },
    { lines: Array.from({ length: 1001 }, (_, i) => `line ${i}`), writtenBefore: 999 },
    { lines: ['a'], className: 'extra', style: { maxHeight: 200 } },
  ],
  TwoFacts: [
    {},
    // preview.html
    {
      serving: {
        overline: 'What people get',
        title: 'The version from 18 September, 9:00am',
        note: 'Running without complaint for 9 hours.',
      },
      attempt: {
        overline: 'What you tried last',
        title: 'A change that didn’t take, 4 minutes ago',
        note: 'What went wrong →',
        tone: 'attention',
      },
    },
    // every tone on both sides, one unknown; no note; the foot dropped, and a foot of its own
    ...['steady', 'attention', 'working', 'neutral', 'no-such-tone'].map((tone) => ({
      serving: { overline: 'Serving', title: 'Nothing yet', tone },
      attempt: { overline: 'Last', title: 'It never answered', note: 'Why', tone },
    })),
    {
      serving: { overline: 'A', title: 'B' },
      attempt: { overline: 'C', title: 'D' },
      foot: null,
    },
    {
      serving: { overline: 'A', title: 'B' },
      attempt: { overline: 'C', title: 'D' },
      foot: 'Our own foot.',
      className: 'extra',
    },
  ],
  FormField: [
    { label: 'What should we call it?' },
    // preview.html: taken, then free
    {
      id: 'mf-demo-name',
      label: 'What should we call it?',
      hint: 'Lower case, hyphens between words. This becomes its web address.',
      value: 'mock-app',
      mono: true,
      message: {
        tone: 'attention',
        title: 'a project already has this name',
        body: 'Pick another name, or ask its owner to add you.',
      },
      onChange: () => undefined,
    },
    {
      id: 'mf-demo-name',
      label: 'What should we call it?',
      hint: 'Lower case, hyphens between words. This becomes its web address.',
      value: 'reading-responses',
      mono: true,
      message: {
        tone: 'steady',
        title: 'Yours. It will live at reading-responses.manifest.internal',
      },
      onChange: () => undefined,
    },
    // every tone, one unknown; no hint; a placeholder; read-only without onChange; a className
    ...['working', 'neutral', 'no-such-tone'].map((tone) => ({
      id: `f-${tone}`,
      label: 'Why?',
      value: 'x',
      message: { tone, title: 'Title', body: 'Body' },
      onChange: () => undefined,
    })),
    { label: 'In a sentence, why', placeholder: 'Optional', onChange: () => undefined },
    { id: 'ro', label: 'Read only', value: 'fixed', className: 'extra' },
  ],
  Choice: [
    { options: [] },
    // preview.html: the radio cards, and the capability checkboxes
    {
      name: 'mf-scale',
      label: 'Who is going to use it?',
      value: 'class',
      onChange: () => undefined,
      options: [
        { title: 'Just me', note: 'The only person who will open it', value: 'solo' },
        { title: 'One class', note: 'A section or a seminar group', value: 'class' },
        {
          title: 'A large course',
          note: 'Hundreds of students at once',
          value: 'large_course',
        },
        { title: 'Anyone at all', note: 'Open beyond UBC', value: 'public' },
      ],
    },
    {
      type: 'checkbox',
      onChange: () => undefined,
      options: [
        { title: 'Look at this project', value: 'project:read', checked: true },
        { title: 'Build it', value: 'build:create', checked: true },
        { title: 'Prepare a version', value: 'release:create', checked: false },
        { title: 'Delete the project', value: 'project:delete', checked: false },
      ],
    },
    // nothing chosen; a type from nowhere is a radio; a className
    {
      name: 'n',
      options: [
        { title: 'A', value: 'a' },
        { title: 'B', value: 'b', note: 'b' },
      ],
    },
    {
      type: 'toggle',
      value: 'a',
      options: [{ title: 'A', value: 'a' }],
      className: 'extra',
    },
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
  SegmentedControl: [
    // preview.html: which address, which viewport, a filter carrying its counts
    {
      value: 'staging',
      options: [
        { label: 'Your draft', value: 'sandbox' },
        { label: 'Trying out', value: 'staging' },
        { label: 'Students', value: 'production' },
      ],
      onChange: () => {},
    },
    {
      role: 'radiogroup',
      value: 'desktop',
      options: [
        { value: 'desktop', label: 'Desktop' },
        { value: 'phone', label: 'Phone' },
      ],
      onChange: () => {},
    },
    {
      value: 'all',
      options: [
        { label: 'All 4', value: 'all' },
        { label: 'Needs you 1', value: 'needs' },
        { label: 'Working 1', value: 'working' },
        { label: 'Over 2', value: 'ended' },
      ],
    },
    // options as strings, each selected in turn, in both roles
    ...['Desktop', 'Phone', 'Tablet'].flatMap((value) => [
      { options: ['Desktop', 'Phone', 'Tablet'], value },
      { role: 'radiogroup', options: ['Desktop', 'Phone', 'Tablet'], value },
    ]),
    // an explicit tablist, a className, nothing selected, and no options at all
    { role: 'tablist', options: ['One', 'Two'], value: 'Two', className: 'extra' },
    { options: ['One', 'Two'], value: 'none of them' },
    { options: [], value: 'x' },
    {},
  ],
  Timeline: [
    // preview.html: a run under way, and a run that ended badly
    {
      stations: [
        {
          label: 'Waiting its turn',
          note: 'In the queue behind anything else going out',
          state: 'done',
        },
        {
          label: 'Making room',
          note: 'Somewhere to run, and a place to keep things',
          state: 'done',
        },
        {
          label: 'Starting up',
          note: 'Your app is running its first few seconds',
          state: 'now',
        },
        {
          label: 'Answering',
          note: 'It replied to us, so it will reply to people',
          state: 'next',
        },
      ],
    },
    {
      stations: [
        { label: 'Making room', state: 'done' },
        { label: 'Starting up', state: 'done' },
        {
          label: 'It never answered',
          note: 'It started, then stopped replying to us',
          state: 'halted',
        },
      ],
    },
    // each state at the start, the middle and the end, with and without a note
    ...(['done', 'now', 'next', 'halted', undefined, 'no-such-state'] as const).flatMap(
      (state) => [
        { stations: [{ label: 'Alone', state }] },
        {
          stations: [
            { label: 'First', note: 'a note', state },
            { label: 'Second', state: 'next' },
          ],
        },
        {
          stations: [
            { label: 'First', state: 'done' },
            { label: 'Middle', note: 'a note', state },
            { label: 'Last', state: 'next' },
          ],
        },
        {
          stations: [
            { label: 'First', state: 'done' },
            { label: 'Last', state },
          ],
        },
      ],
    ),
    { stations: [], className: 'extra' },
    {},
  ],
}

/**
 * OURS, and the only bytes excused (F4 Task 2's ruling): a SegmentedControl keeps only its
 * selected segment in the tab order, so arrow keys move within it (SegmentedControl/README.md:
 * "arrow-key navigable"). The reference renders no `tabindex`; SegmentedControl.test.tsx holds
 * ours. Every other byte is still the reference's.
 */
const OURS: Record<string, (markup: string) => string> = {
  SegmentedControl: (markup) => markup.replace(/ tabindex="(?:0|-1)"/g, ''),
}

describe('the design system is the prototype’s, byte for byte (Decision 2)', () => {
  for (const [name, cases] of Object.entries(CASES)) {
    it(`${name} renders the reference's markup for every case`, () => {
      const ours = (Ours as unknown as Record<string, Component>)[name]
      const ref = REF[name]
      expect(ours, `${name} is exported`).toBeTypeOf('function')
      expect(ref, `${name} is in the reference`).toBeTypeOf('function')
      const excuse = OURS[name] ?? ((markup: string) => markup)
      for (const props of cases)
        expect(excuse(html(ours!, props)), JSON.stringify(props)).toBe(html(ref!, props))
    })
  }
})
