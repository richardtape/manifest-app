import { Disclosure } from '@manifest-app/ui'
import { words } from '../../words.js'

/**
 * *HOW WE KEEP WATCH* (F6 Task 9, design §4), closed, on the Overview of an app that has launched:
 * what the live-address watch does, and what it cannot (FE-4 stays the platform's).
 */
export function HowWeKeepWatch({ name }: { name: string }) {
  const h = words.keeping.how
  return (
    <Disclosure summary={h.title} className="how-we-watch">
      <p className="body">{h.body(name)}</p>
    </Disclosure>
  )
}
