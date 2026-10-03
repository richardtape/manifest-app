import { Button, Card } from '@manifest-app/ui'
import { useState } from 'react'
import { PRETEND_PEOPLE } from '../../ours/pretend-people.js'
import { words } from '../../words.js'

const w = words.preview

/**
 * "Copy", named for whose value it copies; said in a status once it has, or (m117) that it could
 * not: the browser refused it, or has no clipboard here.
 */
export function CopyButton({ value, name }: { value: string; name: string }) {
  const [said, setSaid] = useState<'copied' | 'refused' | null>(null)
  const copy = () => {
    const clipboard = navigator.clipboard as Clipboard | undefined
    if (clipboard === undefined) return setSaid('refused')
    clipboard.writeText(value).then(
      () => setSaid('copied'),
      () => setSaid('refused'),
    )
  }
  return (
    <>
      <Button kind="tertiary" size="sm" onClick={copy}>
        {w.copy}
        <span className="visually-hidden"> {name}</span>
      </Button>
      <span className="try-it-as__copied" role="status">
        {said === 'copied' ? w.copied : said === 'refused' ? w.copyRefused : ''}
      </span>
    </>
  )
}

/**
 * TRY IT AS (walk-through moment 7): one row per pretend person, each value in mono with a copy
 * button, and how to be someone else on the laptop. The people are ours (FE-3): the draft tab's
 * alone, never *Trying out* or *For your students* (Rich).
 */
export function TryItAs() {
  return (
    <Card className="try-it-as" title={w.tryItAs}>
      <ul className="try-it-as__people">
        {PRETEND_PEOPLE.map((person) => {
          const who = w.who[person.who]
          return (
            <li key={person.who} className="try-it-as__person">
              <span className="try-it-as__who">{who}</span>
              <dl className="try-it-as__values">
                <div className="try-it-as__value">
                  <dt>{w.signInAs}</dt>
                  <dd>
                    <span className="mono">{person.login}</span>
                    <CopyButton value={person.login} name={w.copyLogin(who)} />
                  </dd>
                </div>
                <div className="try-it-as__value">
                  <dt>{w.password}</dt>
                  <dd>
                    <span className="mono">{person.password}</span>
                    <CopyButton value={person.password} name={w.copyPassword(who)} />
                  </dd>
                </div>
              </dl>
            </li>
          )
        })}
      </ul>
      <p className="body-small try-it-as__laptop">{w.laptop}</p>
    </Card>
  )
}
