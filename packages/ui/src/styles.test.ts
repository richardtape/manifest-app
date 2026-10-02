import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * THE DESIGN SYSTEM'S CSS, READ AS TEXT: what jsdom cannot see, because it applies no
 * stylesheet (the final review). Each case names a rule a person depends on.
 */
const CSS = readFileSync(new URL('./components.css', import.meta.url), 'utf8').replace(
  // A comment is not a rule: left in, it is read as part of the next rule's selector, and a
  // comment holding a comma hides that rule from `declarationsFor` (F5 Task 4 found it).
  /\/\*[\s\S]*?\*\//g,
  '',
)
/** The type and the tokens (`.page-title`), read the same way. */
const TOKENS = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)

/** The body of the first `@media <query>` block. */
function media(query: string): string {
  const at = CSS.indexOf(`@media ${query}`)
  if (at === -1) return ''
  let depth = 0
  const open = CSS.indexOf('{', at)
  for (let i = open; i < CSS.length; i++) {
    if (CSS[i] === '{') depth++
    if (CSS[i] === '}' && --depth === 0) return CSS.slice(open + 1, i)
  }
  return ''
}

/** The declarations of every rule in `block` whose selectors include `selector`. */
function declarationsFor(block: string, selector: string): string {
  return [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => (m[1] ?? '').split(',').some((s) => s.trim() === selector))
    .map((m) => m[2] ?? '')
    .join(';')
}

describe('the rail folded to icons (below 900px)', () => {
  it('hides a label visually and keeps it for a screen reader: clipped, never display:none', () => {
    const hidden = declarationsFor(
      media('(max-width: 899px)'),
      '.mf-rail--collapsible .mf-rail__label',
    )
    expect(hidden).toMatch(/clip-path:\s*inset\(50%\)/)
    expect(hidden).not.toMatch(/display:\s*none|visibility:\s*hidden/)
  })
})

describe('motion, for a person who asks for less (prefers-reduced-motion)', () => {
  // A media query adds no specificity: a rule that sets an animation AFTER the block would
  // win over it, and the test above would still pass. So the block comes after every one.
  it('comes after every animation it overrides, so it wins', () => {
    const block = CSS.indexOf('@media (prefers-reduced-motion: reduce)')
    const animations = [...CSS.matchAll(/animation:\s*mf-/g)].map((m) => m.index ?? 0)
    expect(block).toBeGreaterThan(-1)
    expect(Math.max(...animations)).toBeLessThan(block)
  })

  it.each(['.mf-pulse', '.mf-bar__fill--working'])('%s stops moving', (selector) =>
    expect(declarationsFor(media('(prefers-reduced-motion: reduce)'), selector)).toMatch(
      /animation:\s*none/,
    ),
  )
})

describe('machine text at a phone’s width (F3 Task 10)', () => {
  // A log line is one long word as often as not (a path, a hash): unwrapped, it widens the
  // whole page at 375px, since the pane sits inside a step inside a list.
  it('a log line wraps anywhere rather than widen what holds it', () =>
    expect(declarationsFor(CSS, '.mf-log')).toMatch(/overflow-wrap:\s*anywhere/))

  it('a step holding a disclosure may shrink below its content’s width', () =>
    expect(declarationsFor(CSS, '.mf-step__body')).toMatch(/min-width:\s*0/))
})

describe('a clock, held by a person (F5 Task 4, ClockItem’s `state`)', () => {
  // ProgressBar/README.md: "Never animate it. Motion would imply the platform is doing something
  // about it, and it is not; a person is."
  it.each([
    '.mf-clock',
    '.mf-clockbar--waiting .mf-clock',
    '.mf-clockbar--steady .mf-clock',
  ])('%s never moves', (selector) =>
    expect(declarationsFor(CSS, selector)).not.toMatch(/animation|transition/),
  )

  it('a clock someone has is filled, still, in the waiting tint', () =>
    expect(declarationsFor(CSS, '.mf-clockbar--waiting .mf-clock')).toMatch(
      /background:\s*var\(--waiting-tint\)/,
    ))

  it('a clock that is done is filled steady', () =>
    expect(declarationsFor(CSS, '.mf-clockbar--steady .mf-clock')).toMatch(
      /background:\s*var\(--steady\)/,
    ))
})

describe('a clock card at a phone’s width (F5 Task 6’s walk)', () => {
  // A chip holding its owner ("With the Manifest team") beside a two-line title ran 28 px past
  // the card at 375: the title and the chip share one row until they cannot.
  it('its title and chip wrap onto two lines rather than run past the card', () =>
    expect(declarationsFor(CSS, '.mf-clockitem__top')).toMatch(/flex-wrap:\s*wrap/))
})

describe('an app’s name holding a word that cannot break (m63)', () => {
  // A hyphen breaks, so real names rarely do this; one that does ran 251 px out of the rail at
  // 1280, and the Overview's title made the page 888 px wide at 375 (manifest-app-47's control).
  it('the rail’s overline, the app’s name, wraps anywhere rather than run out of the rail', () =>
    expect(declarationsFor(CSS, '.mf-rail__over')).toMatch(/overflow-wrap:\s*anywhere/))

  it('a page’s title wraps anywhere rather than widen the page', () =>
    expect(declarationsFor(TOKENS, '.page-title')).toMatch(/overflow-wrap:\s*anywhere/))
})
