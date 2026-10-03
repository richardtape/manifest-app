import { Button, Card } from '@manifest-app/ui'
import type { ReactNode } from 'react'
import { linkTo } from '../../router.js'
import { words } from '../../words.js'
import { needWords, type PageNeed } from './lines.js'

/**
 * A need's own key: one per conversation, incident or outage, so a press drawn in its line (Task 10)
 * keeps where it got to when the band is read again.
 */
function keyOf(need: PageNeed): string {
  switch (need.kind) {
    case 'question':
      return `question-${need.conversationId}`
    case 'change-failed':
      return `change-failed-${need.incidentId}`
    case 'answering-again':
      return `answering-again-${need.app.projectId}-${need.from}`
    case 'agent-asks':
      return `agent-asks-${need.pendingActionId}`
    case 'down':
    case 'going-live':
      return `${need.kind}-${need.app.projectId}`
  }
}

/**
 * THE NEEDS-YOU BAND (F6 Task 9, design §2): across the top of *Your apps*, and on each app's
 * Overview, **only when something needs them**. One line per need, naming its app and the thing,
 * with its button; a helper is told who can, in place of an owner's button (Review Focus 5).
 * **`press`** (Task 10, the Overview): a need's press drawn in its line in place of the link that
 * leads to it; null keeps the link.
 */
export function NeedsBand({
  needs,
  timeZone,
  press,
}: {
  needs: PageNeed[]
  timeZone?: string | undefined
  press?: (need: PageNeed) => ReactNode | null
}) {
  if (needs.length === 0) return null
  return (
    <section className="needs" aria-label={words.keeping.band.label}>
      <Card tone="attention">
        <ul className="needs__list">
          {needs.map((need) => {
            const { says, button } = needWords(need, timeZone)
            // Only where the band offers a button: a helper's line never gains a press.
            const pressed = button === null ? null : (press?.(need) ?? null)
            return (
              <li key={keyOf(need)} className="needs__item">
                <p className="body">{says}</p>
                {pressed !== null ? (
                  <div className="needs__press">{pressed}</div>
                ) : button === null ? null : (
                  <div className="needs__button">
                    <Button
                      kind="secondary"
                      {...(button.href ? linkTo(button.href) : {})}
                    >
                      {button.label}
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </Card>
    </section>
  )
}
