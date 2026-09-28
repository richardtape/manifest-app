import { Button, Card } from '@manifest-app/ui'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { words } from './words.js'

/**
 * THE LAST LINE AGAINST A WHITE PAGE (Review Focus 2; the final review). A screen that
 * throws while drawing shows our generic words, never the error. The error goes to the
 * console for whoever is looking. Try again reloads the page.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('A screen failed to draw', error, info.componentStack)
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <main className="app-alone">
        <div role="alert">
          <Card>
            <p className="body-lead">{words.refused.body}</p>
            <Button kind="secondary" onClick={() => window.location.reload()}>
              {words.refused.button}
            </Button>
          </Card>
        </div>
      </main>
    )
  }
}
