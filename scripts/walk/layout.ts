/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/**
 * WHAT A WALK AT 375 MUST MEASURE, run in the page (each function is sent as its source, so
 * it may use nothing from outside itself). Three checks, because each alone has passed with
 * a defect on screen (ORIENTATION §7):
 * - THE PAGE: `scrollWidth` against the viewport. It holds while a chip runs past its card
 *   inside the page (F5 sitting 3), so it is never the only check;
 * - EACH CARD'S CHILDREN against the card, left and right edges (F5 sitting 3's clock chip);
 * - EVERY BOX THAT HOLDS TEXT, its `scrollWidth` against its `clientWidth`, whatever its tag:
 *   overflowing text does not grow its `<p>`, so a box check stays green while a word runs out
 *   of it (F5 sitting 4), and a list of tags missed the rail's overline, a `<span>` (measured:
 *   a long app name ran out of the rail at 1280). Only the innermost such box is named. To
 *   prove a sentence wraps, give it a word that cannot break: Chrome breaks at hyphens.
 * Text that a box clips on purpose (`overflow` other than `visible`: an ellipsis, a scroller,
 * a visually hidden label) is not a spill.
 */

export interface LayoutOptions {
  /** The boxes whose children must stay inside them. */
  cards: string
  /** Where the text that must stay inside its box is looked for. */
  sentences: string
}

export const LAYOUT_DEFAULTS: LayoutOptions = {
  cards: '.mf-card',
  sentences: 'body',
}

/** Every way the page fails to fit, in words; empty when it fits. */
export function layoutProblems(options: LayoutOptions): string[] {
  const problems: string[] = []
  const nameOf = (element: Element) => {
    const classes =
      typeof element.className === 'string' && element.className.trim()
        ? '.' + element.className.trim().split(/\s+/).join('.')
        : ''
    return element.tagName.toLowerCase() + classes
  }
  const quote = (element: Element) =>
    JSON.stringify((element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 48))
  const clipped = (from: Element | null, card: Element) => {
    for (let at = from; at && at !== card; at = at.parentElement)
      if (getComputedStyle(at).overflowX !== 'visible') return true
    return false
  }

  const root = document.documentElement
  if (root.scrollWidth > root.clientWidth + 1) {
    const wide = [...document.body.querySelectorAll('*')]
      .filter((element) => element.getBoundingClientRect().right > root.clientWidth + 1)
      .slice(0, 3)
      .map(nameOf)
    problems.push(
      `the page is ${root.scrollWidth}px wide in a ${root.clientWidth}px window: ${wide.join(', ') || 'text past its box (below)'}`,
    )
  }

  for (const card of document.querySelectorAll(options.cards)) {
    const box = card.getBoundingClientRect()
    if (!box.width) continue
    for (const child of card.querySelectorAll('*')) {
      const rect = child.getBoundingClientRect()
      if (!rect.width || !rect.height || clipped(child.parentElement, card)) continue
      const past = Math.max(rect.right - box.right, box.left - rect.left)
      if (past > 0.5) {
        problems.push(
          `${nameOf(child)} ${quote(child)} runs ${Math.round(past)}px past its card ${nameOf(card)}`,
        )
        break
      }
    }
  }

  const spilling: HTMLElement[] = []
  for (const root of document.querySelectorAll(options.sentences))
    for (const element of [root, ...root.querySelectorAll('*')]) {
      if (!(element instanceof HTMLElement) || !element.clientWidth) continue
      if (!(element.textContent ?? '').trim()) continue
      if (getComputedStyle(element).overflowX !== 'visible') continue
      if (element.scrollWidth > element.clientWidth + 1) spilling.push(element)
    }
  for (const element of spilling) {
    // The innermost box only: its parents spill because it does.
    if (spilling.some((other) => other !== element && element.contains(other))) continue
    problems.push(
      `${nameOf(element)} ${quote(element)} runs ${element.scrollWidth - element.clientWidth}px past its own box`,
    )
  }
  return problems
}

/**
 * The words on screen, one space between every two pieces of text. `textContent` runs one
 * element's words into the next ("Takes weeksManifest can't…"), and `innerText` returns CSS's
 * `text-transform` ("SERVING RIGHT NOW"): this does neither (F5 sitting 3, F4 sitting 7).
 * `without` leaves out what a selector matches (`.mono`: hostnames are not words, C3).
 */
export function wordsIn(selector: string, without = ''): string {
  const root = document.querySelector(selector)
  if (!root) return ''
  const pieces: string[] = []
  const skip = ['script', 'style', 'template', without].filter(Boolean).join(', ')
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement
    if (!parent || !parent.checkVisibility({ visibilityProperty: true })) continue
    if (parent.closest(skip)) continue
    const text = (node.textContent ?? '').trim()
    if (text) pieces.push(text)
  }
  return pieces.join(' ').replace(/\s+/g, ' ')
}
