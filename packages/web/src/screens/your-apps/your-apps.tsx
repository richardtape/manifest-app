import type { Schemas } from '@manifest/contract'
import { Button, Card, StateChip } from '@manifest-app/ui'
import { Fragment, useCallback, useEffect, useState } from 'react'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { linkTo } from '../../router.js'
import { TroubleNotice, type Trouble } from '../trouble.js'
import { words } from '../../words.js'
import { appCard, mine, releasesToRead, type Address, type AppCard } from './model.js'

type Loaded =
  | { state: 'loading' }
  | { state: 'trouble'; trouble: Trouble }
  | { state: 'ready'; cards: AppCard[] }

/**
 * THE READS BEHIND *YOUR APPS*. `listProjects`, then one `getProject?expand=environments`
 * per app, then one `getRelease` per release an answering address reaches. That is FE-10's
 * N+1, accepted at pilot scale. No `listInstances`: the address's own `instance` is what
 * reaches students (FE-27).
 */
async function read(platform: Platform, me: Schemas['Me']): Promise<AppCard[]> {
  const projects = mine(await platform.listProjects(), me)
  const expanded = await Promise.all(projects.map((p) => platform.getProject(p.id)))
  const releases = new Map(
    await Promise.all(
      releasesToRead(expanded).map(
        async (id) => [id, await platform.getRelease(id)] as const,
      ),
    ),
  )
  return expanded.map((project) => appCard(project, releases))
}

/** *YOUR APPS* (moments 2 and 16). */
export function YourApps({
  platform,
  me,
  expire,
}: {
  platform: Platform
  me: Schemas['Me']
  expire: () => void
}) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    read(platform, me).then(
      (cards) => live && setLoaded({ state: 'ready', cards }),
      (error: unknown) => {
        if (!live) return
        // A session that ended mid-page is the shell's to say (Review Focus 1). Anything else
        // is our words, never the platform's (Review Focus 2 and 5).
        const refusal = refusalOf(error)
        if (refusal.kind === 'signed-out') expire()
        else setLoaded({ state: 'trouble', trouble: refusal })
      },
    )
    return () => {
      live = false
    }
  }, [platform, me, expire, attempt])

  const retry = useCallback(() => {
    setLoaded({ state: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const w = words.yourApps
  return (
    <>
      <h1 className="page-title">{words.shell.yourApps}</h1>
      {loaded.state === 'trouble' ? (
        <TroubleNotice trouble={loaded.trouble} onRetry={retry} />
      ) : null}
      {loaded.state === 'ready' && loaded.cards.length === 0 ? (
        <div className="your-apps__empty">
          <p className="body-lead">{w.empty}</p>
          <div>
            <Button kind="primary" {...linkTo('/new')}>
              {w.describe}
            </Button>
          </div>
          <p className="caption">{w.leadTime}</p>
        </div>
      ) : null}
      {loaded.state === 'ready'
        ? loaded.cards.map((card) => <AppCardView key={card.id} card={card} />)
        : null}
    </>
  )
}

function AppCardView({ card }: { card: AppCard }) {
  const w = words.yourApps
  return (
    <Card className="app-card">
      <div className="app-card__head">
        <h2 className="heading app-card__name">
          {/* Its own page arrives in a later plan; until then it says so (Rich, sitting 5). */}
          <a
            className="app-card__link"
            {...linkTo(`/apps/${encodeURIComponent(card.slug)}`)}
          >
            {card.name}
          </a>
        </h2>
        {card.audience === '' ? null : (
          <p className="body-small app-card__audience">{card.audience}</p>
        )}
      </div>
      <p className="app-card__students">
        <span className="label">{w.forStudents}</span>
        <StateChip state={card.students.state} label={card.students.words} />
      </p>
      <dl className="app-card__addresses">
        <AddressView label={w.draft} address={card.draft} />
        <AddressView label={w.tryingOut} address={card.tryingOut} />
      </dl>
    </Card>
  )
}

function AddressView({ label, address }: { label: string; address: Address }) {
  return (
    <div className="app-card__address">
      <dt className="label">{label}</dt>
      <dd>
        {address.hostname === undefined ? null : (
          <span className="mono">
            <Hostname name={address.hostname} />
          </span>
        )}
        <StateChip state={address.fact.state} label={address.fact.words} />
      </dd>
    </div>
  )
}

/** A hostname that breaks, when it must, after a dot: never mid-label, as `mock-` did. */
function Hostname({ name }: { name: string }) {
  const labels = name.split('.')
  return (
    <>
      {labels.map((label, i) => (
        <Fragment key={i}>
          {label}
          {i < labels.length - 1 ? (
            <>
              .<wbr />
            </>
          ) : null}
        </Fragment>
      ))}
    </>
  )
}
