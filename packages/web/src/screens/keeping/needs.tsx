import { Button, Card } from '@manifest-app/ui'
import { linkTo } from '../../router.js'
import { words } from '../../words.js'
import { needWords, type PageNeed } from './lines.js'

/**
 * THE NEEDS-YOU BAND (F6 Task 9, design §2): across the top of *Your apps*, and on each app's
 * Overview, **only when something needs them**. One line per need, naming its app and the thing,
 * with its button; a helper is told who can, in place of an owner's button (Review Focus 5).
 */
export function NeedsBand({
  needs,
  timeZone,
}: {
  needs: PageNeed[]
  timeZone?: string | undefined
}) {
  if (needs.length === 0) return null
  return (
    <section className="needs" aria-label={words.keeping.band.label}>
      <Card tone="attention">
        <ul className="needs__list">
          {needs.map((need, i) => {
            const { says, button } = needWords(need, timeZone)
            return (
              <li key={`${need.kind}-${need.app.projectId}-${i}`} className="needs__item">
                <p className="body">{says}</p>
                {button === null ? null : (
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
