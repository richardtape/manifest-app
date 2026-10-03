// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { CopyButton } from './try-it-as.js'

/**
 * COPY (moment 7's, and every value we copy since: an address, a key shown once). Said in its own
 * status: copied, or (m117) that we could not, and what they can do instead.
 */
const w = words.preview

const clipboard = (writeText: ((text: string) => Promise<void>) | undefined) =>
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText === undefined ? undefined : { writeText },
  })

afterEach(() => {
  cleanup()
  clipboard(undefined)
})

const press = () =>
  fireEvent.click(screen.getByRole('button', { name: /Copy\s*the key/ }))

describe('CopyButton', () => {
  it('copied: said in its status', async () => {
    const copied: string[] = []
    clipboard(async (text) => void copied.push(text))
    render(<CopyButton value="mft_secret" name="the key" />)
    press()
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(w.copied))
    expect(copied).toEqual(['mft_secret'])
  })

  it.each([
    ['refused by the browser', async () => Promise.reject(new Error('NotAllowedError'))],
    ['no clipboard at all', undefined],
  ] as const)(
    'not copied (%s): said in its status, and what to do instead (m117)',
    async (_, writeText) => {
      clipboard(writeText)
      render(<CopyButton value="mft_secret" name="the key" />)
      press()
      await waitFor(() =>
        expect(screen.getByRole('status').textContent).toBe(
          "We couldn't copy it. Select it and copy it yourself.",
        ),
      )
      expect(w.copyRefused).toBe(screen.getByRole('status').textContent)
      expect(machineryIn(w.copyRefused)).toEqual([])
    },
  )
})
