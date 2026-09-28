// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './error-boundary.js'
import { words } from './words.js'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Throws(): never {
  throw new Error('a bug of ours, with sha256:9b2c… in it')
}

it('a screen that throws is our generic words and Try again, never a white page (the final review)', () => {
  const logged: unknown[] = []
  vi.spyOn(console, 'error').mockImplementation((...args) => void logged.push(args))
  render(
    <ErrorBoundary>
      <Throws />
    </ErrorBoundary>,
  )
  expect(screen.getByText(words.refused.body)).toBeTruthy()
  expect(screen.getByRole('button', { name: words.refused.button })).toBeTruthy()
  expect(document.body.textContent).not.toContain('sha256')
  expect(logged.length).toBeGreaterThan(0)
})

it('renders its children when nothing throws', () => {
  render(
    <ErrorBoundary>
      <p>fine</p>
    </ErrorBoundary>,
  )
  expect(screen.getByText('fine')).toBeTruthy()
})
