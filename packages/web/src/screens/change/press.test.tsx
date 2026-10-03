// @vitest-environment jsdom
import { ManifestApiError } from '@manifest/contract'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { words } from '../../words.js'
import { PressNotice } from './notice.js'
import { pressFailed, useFocusBack } from './press.js'

/**
 * F6 TASK 11: `409 PROJECT_ARCHIVED`, wherever a press meets it, is the app switched off, said in
 * words (switch it back on first), never a problem with a reference; anything else is as before.
 */
const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'test')

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 204 })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('pressFailed (F6 Task 11)', () => {
  it('PROJECT_ARCHIVED is the app switched off: no problem reported, no reference', () => {
    expect(pressFailed(refused(409, 'PROJECT_ARCHIVED'), 'deploy')).toEqual({
      expired: false,
      archived: true,
    })
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it('anything else is a problem, reported, with its reference', () => {
    const said = pressFailed(refused(500, 'INTERNAL'), 'deploy')
    expect(said).toEqual({
      expired: false,
      archived: false,
      reference: expect.any(String),
    })
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it("FE-30: the report keeps the platform's request id beside the reference it answers", () => {
    const id = '1f758a00-2575-409b-bf48-dfbc4218b118'
    const error = new ManifestApiError(
      409,
      { error: { code: 'RELEASE_NOT_STAGED', message: 'x', requestId: id } } as never,
      'test',
    )
    const said = pressFailed(error, 'deploy')
    const [, init] = vi.mocked(fetch).mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({
      reference: said.expired || said.archived ? undefined : said.reference,
      code: 'RELEASE_NOT_STAGED',
      operation: 'deploy',
      status: 409,
      requestId: id,
    })
  })

  it('the session ending is the shell’s', () => {
    expect(pressFailed(refused(401, 'UNAUTHENTICATED'), 'deploy')).toEqual({
      expired: true,
    })
  })
})

describe('PressNotice', () => {
  it('switched off: one sentence naming the app, no reference', () => {
    render(
      <PressNotice
        notice={{ expired: false, archived: true }}
        name="Reading responses"
        couldnt="x"
      />,
    )
    expect(document.body.textContent).toBe(
      'Reading responses is switched off. Switch it back on first.',
    )
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('anything else: the screen’s own words and the reference', () => {
    render(
      <PressNotice
        notice={{ expired: false, archived: false, reference: '7F3A-9C21' }}
        name="Reading responses"
        couldnt={words.tryingOut.couldnt}
      />,
    )
    expect(document.body.textContent).toContain(words.tryingOut.couldnt)
    expect(document.body.textContent).toContain('7F3A-9C21')
  })
})

describe('m4: the focus owed after a failed press (useFocusBack)', () => {
  /** A press's place: the button drawn or not, and `back()` called from outside. */
  let owe: () => void = () => undefined
  let draw: (drawn: boolean) => void = () => undefined
  function Place() {
    const focus = useFocusBack<HTMLDivElement>()
    const [drawn, setDrawn] = useState(false)
    owe = focus.back
    draw = setDrawn
    return (
      <div ref={focus.at}>{drawn ? <button type="button">Ask for it</button> : null}</div>
    )
  }

  it('is dropped on the render after the failure: a button drawn later never takes the focus', async () => {
    render(<Place />)
    await act(async () => owe())
    await act(async () => draw(true))
    expect(document.activeElement).toBe(document.body)
  })
})
