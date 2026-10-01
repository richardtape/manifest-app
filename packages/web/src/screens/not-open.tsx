import { Button, Card } from '@manifest-app/ui'
import { useState } from 'react'
import { signOut } from '../auth.js'
import { words } from '../words.js'
import { Brand } from './brand.js'

/**
 * D7 (Rich, 2026-09-29): SOMEONE WHO MAY NOT BUILD, with no apps, wherever they arrive. The
 * platform decides (FE-39); this screen only says so. Sign-in's layout, the other screen with no
 * rail, and still: nobody is working on anything, and nothing is wrong.
 */
export function NotOpen({ name }: { name: string }) {
  const [failed, setFailed] = useState(false)
  const w = words.notOpen
  return (
    <div className="signin">
      <div className="signin__brand">
        <Brand />
      </div>
      <main className="signin__form" id="main" tabIndex={-1}>
        <h1 className="moment">{w.title}</h1>
        <p className="body-lead">{w.body}</p>
        <p className="body-lead signin__muted">{w.who(name)}</p>
        {failed ? (
          <div role="alert">
            <Card tone="attention">
              <p className="body-lead">{words.signOut.failed}</p>
            </Card>
          </div>
        ) : null}
        <Button
          kind="secondary"
          onClick={() => {
            setFailed(false)
            signOut().catch(() => setFailed(true))
          }}
        >
          {words.signOut.button}
        </Button>
      </main>
    </div>
  )
}

/** The same two sentences in the page, for someone who keeps apps and goes to `/new`. */
export function NotOpenHere() {
  return (
    <>
      <h1 className="page-title">{words.notOpen.title}</h1>
      <p className="body-lead">{words.notOpen.body}</p>
    </>
  )
}
