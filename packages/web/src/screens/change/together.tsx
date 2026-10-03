import { words } from '../../words.js'

/**
 * F6b D3: A CONVERSATION THAT IS NOT THE READER'S, on an app they are a member of: whose it is, and
 * whether they may stop it (an owner may, to free the app). Null when it is theirs. Our server
 * decides every press; this only says which presses the page draws.
 */
export type Theirs = { name: string; mayStop: boolean } | null

/** *"Sam started this. Only Sam can answer it or carry it on."*, under the page's title. */
export function StartedBy({ theirs }: { theirs: Theirs }) {
  return theirs === null ? null : (
    <p className="body-lead together__started">{words.together.started(theirs.name)}</p>
  )
}
