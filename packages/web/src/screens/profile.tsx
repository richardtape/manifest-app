import type { Schemas } from '@manifest/contract'
import { Button, Card } from '@manifest-app/ui'
import { words } from '../words.js'

/**
 * THE PERSON (Rich's click-through): who UBC says they are, and Sign out, which the rail
 * hides when it is icons only. `Me` has no CWL login yet (sitting 5 asks UBC for `uid`), so
 * the name and email are what there is.
 */
export function Profile({ me, onSignOut }: { me: Schemas['Me']; onSignOut: () => void }) {
  const w = words.profile
  return (
    <>
      <h1 className="page-title">{w.title}</h1>
      <Card className="profile">
        <dl className="profile__facts">
          <div>
            <dt className="label">{w.name}</dt>
            <dd className="body-lead">{me.displayName}</dd>
          </div>
          <div>
            <dt className="label">{w.email}</dt>
            <dd className="body-lead">{me.email}</dd>
          </div>
        </dl>
        <p className="caption profile__source">{w.source}</p>
        <div>
          <Button kind="secondary" onClick={onSignOut}>
            {words.signOut.button}
          </Button>
        </div>
      </Card>
    </>
  )
}
