import { Button, Card } from '@manifest-app/ui'
import { useId } from 'react'
import { linkTo } from '../../router.js'
import { words } from '../../words.js'

/**
 * THE BAND, MOMENT 10 (F5 Decision 3): one band, not a list, on the Overview of an app whose
 * draft is built, that has not launched, while a production clock is unmet. It is never
 * *needs you*: nothing here is theirs to do yet, and *Going live* shows where each one is.
 * F5b adds *[Start them]* once the platform can start them.
 */
export function Band({ slug }: { slug: string }) {
  const id = useId()
  const b = words.overview.band
  return (
    <section className="overview__band" aria-labelledby={id}>
      <Card>
        <h2 id={id} className="heading">
          {b.title}
        </h2>
        <p className="body-lead">{b.body}</p>
        <div>
          <Button
            kind="secondary"
            {...linkTo(`/apps/${encodeURIComponent(slug)}/going-live`)}
          >
            {b.button}
          </Button>
        </div>
      </Card>
    </section>
  )
}
