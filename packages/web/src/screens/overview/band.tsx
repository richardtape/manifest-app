import { Button, Card } from '@manifest-app/ui'
import { useId } from 'react'
import { linkTo } from '../../router.js'
import { words } from '../../words.js'
import type { Five } from '../going-live/checklist.js'

/**
 * THE BAND, MOMENT 10 (F5 Decision 3; F5b Task 3): one band, not a list, on the Overview of an app
 * whose draft is built, that has not launched, while a step is not done (`bandOf`). Its state is the
 * current step's: *needs you* only while that step is theirs, which in part one it never is.
 * *[Start them]* while step 1 has nothing on file and something can be sent (part two); else
 * *[Going live]*. Both open *Going live*, where the steps are.
 */
export function Band({
  slug,
  band,
}: {
  slug: string
  band: { button: 'start' | 'going-live'; state: Five }
}) {
  const id = useId()
  const b = words.overview.band
  return (
    <section className="overview__band" aria-labelledby={id}>
      <Card {...(band.state === 'attention' ? { tone: 'attention' as const } : {})}>
        <h2 id={id} className="heading">
          {b.title}
        </h2>
        <p className="body-lead">{b.body}</p>
        <div>
          <Button
            kind="secondary"
            {...linkTo(`/apps/${encodeURIComponent(slug)}/going-live`)}
          >
            {band.button === 'start' ? b.start : b.button}
          </Button>
        </div>
      </Card>
    </section>
  )
}
