// @vitest-environment jsdom
import type { Schemas } from '@manifest/contract'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { DryRun, dryRunRow } from './dry-run.js'

/**
 * THE DRY RUN ON THE LIVE SETUP, MOMENT 12 (F5 Task 7, as S1 rewrote it). The owner is refused
 * `runRehearsal` (FE-42; Rich, 2026-09-30: "Both: row now, ask platform"), so the row is an
 * administrator's, read from the checklist item alone, and **nothing on it can be pressed** in
 * any state. The press returns here when FE-42 (a) lands.
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

/** The row, drawn as the page draws it: one item of a list. */
function drawn(row: ReturnType<typeof dryRunRow>) {
  render(
    <ul>
      <DryRun row={row} />
    </ul>,
  )
  return screen.getByRole('listitem')
}

describe('the dry run’s row, read from the checklist item (S1, FE-42)', () => {
  it('nothing on trying-out: not yet, once a version is there', () =>
    expect(dryRunRow(item('unmet'), false)).toMatchObject({
      id: 'rehearsal',
      state: 'notyet',
      name: 'A dry run on the live setup',
      words: 'Once a version is on your trying-out address.',
      owner: 'a Manifest administrator',
      action: null,
      apart: false,
    }))

  it('a version on trying-out, not yet run: waiting on a Manifest administrator, who is not told', () =>
    expect(dryRunRow(item('unmet'), true)).toMatchObject({
      state: 'waiting',
      words:
        'A Manifest administrator runs it. Manifest doesn’t tell them yet that it’s waiting.',
      owner: 'a Manifest administrator',
      action: null,
    }))

  it('run and passed: done, it answered and signed someone in', () =>
    expect(dryRunRow(item('met'), true)).toMatchObject({
      state: 'steady',
      words: 'Done. It answered and signed someone in on the live setup.',
      action: null,
    }))

  it('not tracked by Manifest yet: not yet, nobody yet', () =>
    expect(dryRunRow(item('not_built'), true)).toMatchObject({
      state: 'notyet',
      words: 'Manifest doesn’t check this one yet.',
      owner: 'nobody yet',
    }))

  it('a failed run is not told apart from one not yet run (unmeasured): waiting, with no Fix it', () => {
    // The laptop's IdP releases every attribute asked for, so a failure's `why` was never seen
    // (S1: M4), and nothing gives the page a failed run's evidence.
    const failed = {
      ...item('unmet'),
      why: 'The last rehearsal did not sign anyone in: attribute ubcEduCwlPuid was not released.',
    }
    expect(dryRunRow(failed, true)).toEqual(dryRunRow(item('unmet'), true))
  })
})

describe('the dry run’s row, drawn', () => {
  it.each([
    ['unmet', true, 'Waiting on someone'],
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

  it('nothing to press in any state: no button, no link, no mailto (FE-42; no stopgap)', () => {
    for (const state of STATES)
      for (const candidate of [true, false]) {
        const li = drawn(dryRunRow(item(state), candidate))
        const where = `${state} × ${candidate ? 'a version' : 'none'}`
        expect(within(li).queryAllByRole('button'), where).toEqual([])
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
