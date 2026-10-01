import { Button, TICK } from '@manifest-app/ui'
import { signInHref } from '../auth.js'
import { words } from '../words.js'
import { Brand } from './brand.js'

/**
 * MOMENT 1: the one screen with no rail. The prototype's Sign in, in the walk-through's
 * words, drawn with the design system's tokens (app.css) rather than the prototype's hex.
 * Continue with CWL is a real link to the platform's sign-in, back to where they were.
 */
export function SignIn({ returnTo }: { returnTo: string }) {
  const w = words.signIn
  return (
    <div className="signin">
      <div className="signin__brand">
        <Brand />
        <div className="signin__hero">
          <h1 className="hero">{w.hero}</h1>
          <p className="signin__lead">{w.lead}</p>
        </div>
        <ul className="signin__ticks">
          {w.ticks.map((tick) => (
            <li key={tick}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--nav-ink-subtle)"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {TICK.map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
              {tick}
            </li>
          ))}
        </ul>
      </div>
      <main className="signin__form">
        <h2 className="moment">{w.title}</h2>
        <p className="body-lead signin__muted">{w.body}</p>
        <Button kind="primary" href={signInHref(returnTo)} className="signin__cwl">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 3v9" />
            <path d="M6.5 6.5a8 8 0 1 0 11 0" />
          </svg>
          {w.button}
        </Button>
        <div className="signin__note">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ink-muted)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          <p className="body-small">{w.note}</p>
        </div>
      </main>
    </div>
  )
}
