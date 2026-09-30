// @vitest-environment jsdom
import type { Schemas } from '@manifest/contract'
import { fixtures } from '@manifest/mock'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { DryRun, dryRunRow } from './dry-run.js'

/**
 * THE DRY RUN ON THE LIVE SETUP, MOMENT 12 (F5 Task 7): its row, read from the checklist item
 * alone. Since the platform's 4a (FE-42 (a)) the owner may run it, and Rich brought the press back
 * (2026-09-30, "Build it now"): **theirs to start once a version is on trying-out**, and nothing to
 * press otherwise. The press itself is `dry-run-press.test.tsx`'s.
 */
const g = words.goingLive
const STATES = ['met', 'unmet', 'not_built'] as const
const item = (
  state: Schemas['LaunchReadinessItem']['state'],
): Schemas['LaunchReadinessItem'] => ({
  id: 'rehearsal',
  title: 'Launch rehearsal passed',
  owner: 'Manifest',
  blocking: true,
  state,
  why: 'Nothing is serving in staging yet, so there is no release to rehearse (§13).',
})

afterEach(cleanup)

/** Nothing is pressed here: a platform or a server asked anything fails the test. */
const untouchable = new Proxy(
  {},
  {
    get: (_target, name) => () => {
      throw new Error(`asked ${String(name)}`)
    },
  },
)

/** The row, drawn as the page draws it: one item of a list. */
function drawn(row: ReturnType<typeof dryRunRow>) {
  render(
    <ul>
      <DryRun
        row={row}
        platform={untouchable as Platform}
        ours={untouchable as Ours}
        project={fixtures.PROJECT}
        production={undefined}
        back={false}
        expire={() => undefined}
        onRan={() => undefined}
      />
    </ul>,
  )
  return screen.getByRole('listitem')
}

describe('the dry run’s row, read from the checklist item (FE-42 (a), Spec action 8)', () => {
  it('nothing on trying-out: not yet, once a version is there', () =>
    expect(dryRunRow(item('unmet'), false)).toMatchObject({
      id: 'rehearsal',
      state: 'notyet',
      name: 'A dry run on the live setup',
      words: 'Once a version is on your trying-out address.',
      owner: 'you start it; minutes',
      action: null,
      apart: false,
    }))

  it('a version on trying-out, not yet run: needs you, the walk-through’s sentence, and theirs to start', () =>
    expect(dryRunRow(item('unmet'), true)).toMatchObject({
      state: 'attention',
      words:
        'We put it up with nobody watching, check it answers and signs someone in, then take it down.',
      owner: 'you start it; minutes',
      action: 'dry-run',
    }))

  it('run and passed: done, it answered and signed someone in', () =>
    expect(dryRunRow(item('met'), true)).toMatchObject({
      state: 'steady',
      words: 'Done. It answered and signed someone in on the live setup.',
      owner: 'you start it; minutes',
      action: null,
    }))

  it('not tracked by Manifest yet: not yet, nobody yet', () =>
    expect(dryRunRow(item('not_built'), true)).toMatchObject({
      state: 'notyet',
      words: 'Manifest doesn’t check this one yet.',
      owner: 'nobody yet',
    }))

  it('a failed run is not told apart from one not yet run, read from the checklist: theirs to run again', () => {
    // No operation reads a rehearsal back: only the press's own answer carries what it saw
    // (dry-run-press.test.tsx), and never the checklist's `why` (FE-9).
    const failed = {
      ...item('unmet'),
      why: 'The last rehearsal did not sign anyone in: attribute ubcEduCwlPuid was not released.',
    }
    expect(dryRunRow(failed, true)).toEqual(dryRunRow(item('unmet'), true))
  })
})

describe('the dry run’s row, drawn', () => {
  it.each([
    ['unmet', true, 'Needs you'],
    ['unmet', false, 'Not yet'],
    ['met', true, 'Done'],
    ['not_built', true, 'Not yet'],
  ] as const)(
    '%s (a version there: %s): its state in a word, its name, one sentence and its owner',
    (state, candidate, chip) => {
      const row = dryRunRow(item(state), candidate)
      const li = drawn(row)
      expect(within(li).getByText(chip)).toBeTruthy()
      expect(within(li).getByText(g.rows.rehearsal.name)).toBeTruthy()
      expect(within(li).getByText(row.words)).toBeTruthy()
      expect(within(li).getByText(row.owner)).toBeTruthy()
    },
  )

  it('one button, [Run the dry run], only when it is theirs to start: a version there, not yet run; never a link or a mailto', () => {
    for (const state of STATES)
      for (const candidate of [true, false]) {
        const li = drawn(dryRunRow(item(state), candidate))
        const where = `${state} × ${candidate ? 'a version' : 'none'}`
        const buttons = within(li)
          .queryAllByRole('button')
          .map((b) => b.textContent)
        expect(buttons, where).toEqual(
          state === 'unmet' && candidate ? ['Run the dry run'] : [],
        )
        expect(within(li).queryAllByRole('link'), where).toEqual([])
        expect(li.innerHTML, where).not.toMatch(/mailto:/i)
        cleanup()
      }
  })

  it('none of the platform’s words, and never its why (C3, FE-9)', () => {
    for (const state of STATES)
      for (const candidate of [true, false]) {
        const li = drawn(dryRunRow(item(state), candidate))
        const said = li.textContent ?? ''
        expect(machineryIn(said), state).toEqual([])
        expect(said, state).not.toMatch(/rehears|§|staging|release/i)
        cleanup()
      }
  })
})
