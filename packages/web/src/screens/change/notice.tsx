import { words } from '../../words.js'
import { SupportReference } from '../reference.js'
import type { Notice } from './press.js'

/**
 * A PRESS'S NOTICE, ITS WORDS ONLY (the page keeps its own card): the app switched off, said the
 * same way on every screen (F6 Task 11: *"Reading responses is switched off. Switch it back on
 * first."*), or the screen's own *"We couldn't…"* with its reference.
 */
export function PressNotice({
  notice,
  name,
  couldnt,
  className = 'body-lead',
}: {
  notice: Notice
  /** The app's name, for the switched-off sentence. */
  name: string
  /** The screen's own words for a press that did not go through. */
  couldnt: string
  className?: string
}) {
  return notice.archived ? (
    <p className={className}>{words.refused.archived(name)}</p>
  ) : (
    <>
      <p className={className}>{couldnt}</p>
      <SupportReference reference={notice.reference} />
    </>
  )
}
