import type { Schemas } from '@manifest/contract'
import { Button, Card, Choice, Disclosure, FormField } from '@manifest-app/ui'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { OurRefusal, type Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf, type Refusal } from '../../platform/refusal.js'
import { linkTo, type Then } from '../../router.js'
import { words } from '../../words.js'
import { PressNotice } from '../change/notice.js'
import { pressFailed, useFocusBack, type Notice } from '../change/press.js'
import { dayWords } from '../going-live/steps.js'
import { whenOf } from '../going-live/live.js'
import { countOf } from '../limits.js'
import { CopyButton } from '../preview/try-it-as.js'
import { TroubleNotice, type Trouble } from '../trouble.js'
import { CAPABILITY_WORDS, MINTABLE, rowsOf, type Row } from './model.js'

const a = words.agents
const t = a.theirs
const m = a.make
/** A token's name, as `mintToken` takes it: 1–64 characters. */
const NAME_MOST = 64
const DAYS = [7, 30, 90] as const

type Loaded =
  | { state: 'loading' }
  | { state: 'trouble'; trouble: Trouble }
  | { state: 'ready'; rows: Row[] }
/** One press at a time. */
type Pressing = { kind: 'revoke'; tokenId: string } | { kind: 'make' }
/** What a press that did not go through says, and where. */
type Said =
  | { where: 'revoke'; kind: 'words'; text: string }
  | { where: 'revoke' | 'make'; kind: 'notice'; notice: Notice }

/** A read our server refused is said as the platform's are; its 401 is the shell's. */
function refusalFrom(error: unknown): Refusal {
  if (!(error instanceof OurRefusal)) return refusalOf(error)
  if (error.status === 401) return { kind: 'signed-out' }
  return error.status === null
    ? { kind: 'unreachable' }
    : { kind: 'refused', code: error.code, status: error.status }
}

/** A sentence's words around one place (`words.ts` keeps the sentence whole). */
function around(sentence: (said: string) => string): [string, string] {
  const [before = '', after = ''] = sentence('\u0000').split('\u0000')
  return [before, after]
}

/** What a token may do: our words, an unknown one by its name in mono; "a, b and c". */
function mayOf(capabilities: string[]): ReactNode {
  const said = capabilities.map((capability) =>
    Object.hasOwn(CAPABILITY_WORDS, capability) ? (
      CAPABILITY_WORDS[capability]!
    ) : (
      <span className="mono">{capability}</span>
    ),
  )
  const [before, after] = around(t.may)
  return (
    <>
      {before}
      {said.map((part, i) => (
        <span key={i}>
          {i === 0 ? '' : i === said.length - 1 ? ' and ' : ', '}
          {part}
        </span>
      ))}
      {after}
    </>
  )
}

/**
 * *AGENTS* (F6b Task 11; design §4, D4, D5; *Throughout*'s *An agent of their own*): every agent
 * with access to the app (`listTokens`, in the person's own session), the active alone. **Ours**
 * are told by the ids our server keeps (`ours.minted`), named for what they do, and never revocable
 * here: they end with their conversation, or with the app. **Theirs** say what each may do in words,
 * when it was last used and when it stops; **[Revoke]** where it may succeed (Decision 4; FE-49:
 * the platform names no minter, and anyone but the minter is refused `404`), answering *no* first to
 * what that agent still waits on (Decision 16; FE-52). **One of their own let in**: exactly what
 * they chose minted, its id, name and expiry handed to our server, **its key shown once and sent
 * nowhere** (Review Focus 4). Every change is the person's own call; the platform still decides.
 */
export function Agents({
  platform,
  ours,
  project,
  me,
  expire,
  now = () => new Date(),
  timeZone,
}: {
  platform: Platform
  ours: Ours
  project: Schemas['Project']
  me: Pick<Schemas['Me'], 'id'>
  /** Owner or helper (`useRole`): who may answer an agent's question (Task 12). */
  role: 'owner' | 'helper' | 'unknown'
  /** Back from signing in again (`agents`): an answer's second sign-in (Task 12). */
  then: Then
  expire: () => void
  now?: () => Date
  timeZone?: string | undefined
}) {
  const clock = useRef(now)
  clock.current = now
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [reads, setReads] = useState(0)
  const [pressing, setPressing] = useState<Pressing | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [said, setSaid] = useState<Said>()
  /** What the last press did, said in the page's status. */
  const [status, setStatus] = useState<string | null>(null)
  const [focusOn, setFocusOn] = useState<{ tokenId: string } | 'status' | 'made' | null>(
    null,
  )
  const [name, setName] = useState('')
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())
  const [days, setDays] = useState<number>(30)
  /** The key, the one time it exists: in this component alone, never stored (Review Focus 4). */
  const [made, setMade] = useState<string | null>(null)
  const revokes = useRef(new Map<string, HTMLDivElement>())
  const statusRef = useRef<HTMLParagraphElement>(null)
  const madeRef = useRef<HTMLParagraphElement>(null)
  const confirmRef = useRef<HTMLParagraphElement>(null)
  const { at: makeAt, back: focusMake } = useFocusBack<HTMLDivElement>()
  const live = useRef(true)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  useEffect(() => {
    let current = true
    Promise.all([platform.listTokens(project.id), ours.minted(project.id)]).then(
      ([tokens, kept]) =>
        current &&
        setLoaded({ state: 'ready', rows: rowsOf(tokens, kept, clock.current()) }),
      (error: unknown) => {
        if (!current) return
        const refusal = refusalFrom(error)
        if (refusal.kind === 'signed-out') return expire()
        setLoaded({ state: 'trouble', trouble: refusal })
      },
    )
    return () => {
      current = false
    }
  }, [platform, ours, project.id, reads, expire])
  const readAgain = useCallback(() => setReads((n) => n + 1), [])
  const retry = useCallback(() => {
    setLoaded({ state: 'loading' })
    setReads((n) => n + 1)
  }, [])

  useEffect(() => {
    if (confirming !== null) confirmRef.current?.focus()
  }, [confirming])

  // THE FOCUS FOLLOWS THE PRESS: back on a row's Revoke, on what is now true, or on the key.
  useEffect(() => {
    if (focusOn === null) return
    setFocusOn(null)
    if (focusOn === 'status') return statusRef.current?.focus()
    if (focusOn === 'made') return madeRef.current?.focus()
    revokes.current.get(focusOn.tokenId)?.querySelector('button')?.focus()
  })

  const begin = (press: Pressing) => {
    setSaid(undefined)
    setStatus(null)
    setPressing(press)
  }

  const revoke = async (row: Row) => {
    const tokenId = row.token.id
    begin({ kind: 'revoke', tokenId })
    // DECISION 16 (FE-52): a revoked agent's questions would wait a day for a yes that does nothing.
    // Answered no first, each in the agent's hearing; one that cannot be (a helper's, FE-50; or
    // answered meanwhile) never holds the revoke.
    try {
      const waiting = (await platform.listPendingActions(project.id)).filter(
        (action) => action.state === 'pending' && action.tokenId === tokenId,
      )
      for (const action of waiting) {
        try {
          await platform.rejectPendingAction(action.id, t.answer, crypto.randomUUID())
        } catch {
          // Still waiting: the band forgets it at its expiry.
        }
      }
    } catch {
      // Not read: the revoke goes ahead, and the platform still decides it.
    }
    try {
      await platform.revokeToken(tokenId, crypto.randomUUID())
    } catch (error) {
      if (!live.current) return
      setPressing(null)
      setConfirming(null)
      const refusal = refusalOf(error)
      if (refusal.kind === 'refused' && refusal.code === 'NOT_FOUND')
        setSaid({ where: 'revoke', kind: 'words', text: t.onlyMinter })
      else {
        const failed = pressFailed(error, 'revokeToken')
        if (failed.expired) return expire()
        setSaid({ where: 'revoke', kind: 'notice', notice: failed })
      }
      setFocusOn({ tokenId })
      return
    }
    if (!live.current) return
    setPressing(null)
    setConfirming(null)
    setStatus(t.revoked(project.name))
    setFocusOn('status')
    readAgain()
  }

  const trimmed = name.trim()
  const count = countOf(name, NAME_MOST)
  const ready = trimmed !== '' && trimmed.length <= NAME_MOST && chosen.size > 0

  const make = async () => {
    begin({ kind: 'make' })
    setMade(null)
    let minted: Schemas['MintedToken']
    try {
      minted = await platform.mintToken(
        project.id,
        {
          name: trimmed,
          capabilities: MINTABLE.filter((capability) => chosen.has(capability)),
          expiresInDays: days,
        },
        crypto.randomUUID(),
      )
    } catch (error) {
      if (!live.current) return
      setPressing(null)
      const failed = pressFailed(error, 'mintToken')
      if (failed.expired) return expire()
      setSaid({ where: 'make', kind: 'notice', notice: failed })
      focusMake()
      return
    }
    // Our server keeps its id, name and expiry, so *Agents* says it is theirs: never its key. If
    // it cannot, the key is still shown (the only time), and the row reads as one we did not make.
    try {
      await ours.keepAgent(project.id, {
        tokenId: minted.token.id,
        name: minted.token.name,
        expiresAt: minted.token.expiresAt,
      })
    } catch {
      // Not kept: it is listed with [Revoke], which its maker may still press.
    }
    if (!live.current) return
    setPressing(null)
    setMade(minted.secret)
    setName('')
    setChosen(new Set())
    setDays(30)
    setFocusOn('made')
    readAgain()
  }

  const rows = loaded.state === 'ready' ? loaded.rows : []
  const ourRows = rows.filter((row) => row.ours !== null)
  const theirRows = rows.filter((row) => row.ours === null)
  const busy = pressing !== null
  const slug = encodeURIComponent(project.slug)
  const origin = typeof location === 'undefined' ? '' : location.origin
  const notice = (where: 'revoke' | 'make') =>
    said === undefined || said.where !== where ? null : (
      <div role="alert">
        <Card tone="attention">
          {said.kind === 'words' ? (
            <p className="body-lead">{said.text}</p>
          ) : (
            <PressNotice
              notice={said.notice}
              name={project.name}
              couldnt={where === 'make' ? m.couldnt : t.couldnt}
            />
          )}
        </Card>
      </div>
    )

  return (
    <div className="agents">
      <h1 className="page-title">{a.title(project.name)}</h1>
      {loaded.state === 'trouble' ? (
        <TroubleNotice trouble={loaded.trouble} onRetry={retry} />
      ) : null}
      {loaded.state === 'ready' ? (
        <>
          {ourRows.length === 0 ? null : (
            <section className="agents__section" aria-labelledby="agents-ours">
              <h2 className="heading" id="agents-ours">
                {a.ours.title}
              </h2>
              <p className="body">{a.ours.end}</p>
              <ul className="agents__list">
                {ourRows.map(({ token, ours: one }) => (
                  <li key={token.id} className="agents__agent">
                    <p className="body-lead">
                      {one!.what === 'watch' ? (
                        a.ours.watch
                      ) : one!.what === 'privacy' ? (
                        a.ours.privacy
                      ) : one!.conversationId === null ? (
                        one!.title === null ? (
                          a.ours.untitled
                        ) : (
                          a.ours.conversation(one!.title)
                        )
                      ) : (
                        <a
                          {...linkTo(
                            `/apps/${slug}/conversations/${encodeURIComponent(one!.conversationId)}`,
                          )}
                        >
                          {one!.title === null
                            ? a.ours.untitled
                            : a.ours.conversation(one!.title)}
                        </a>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="agents__section" aria-labelledby="agents-theirs">
            <h2 className="heading" id="agents-theirs">
              {t.title}
            </h2>
            {theirRows.length === 0 ? <p className="body">{t.none}</p> : null}
            <ul className="agents__list">
              {theirRows.map((row) => {
                const { token, minter } = row
                const yours = minter !== null && minter.id === me.id
                const theirs = minter !== null && !yours
                const used =
                  token.lastUsedAt === null
                    ? t.neverUsed
                    : t.lastUsed(
                        whenOf(token.lastUsedAt, clock.current(), timeZone) ?? '',
                      )
                const stops = dayWords(token.expiresAt, timeZone)
                return (
                  <li key={token.id} className="agents__agent">
                    <p className="agents__who">
                      <span className="body-lead mono">{token.name}</span>
                      {yours ? <span className="body"> {t.yours}</span> : null}
                    </p>
                    <p className="agents__about body-small">
                      {mayOf(token.capabilities)}
                    </p>
                    <p className="agents__about body-small">
                      {[used, ...(stops === null ? [] : [t.stops(stops)])].join(' · ')}
                      {theirs ? ` · ${t.madeBy(minter.name)}` : ''}
                    </p>
                    {theirs ? (
                      <p className="agents__about body-small">{t.onlyMinter}</p>
                    ) : confirming === token.id ? (
                      <div className="agents__confirm">
                        <p className="body" ref={confirmRef} tabIndex={-1}>
                          {t.confirm}
                        </p>
                        <div className="describe__actions">
                          <Button
                            kind="danger"
                            disabled={busy}
                            onClick={() => void revoke(row)}
                          >
                            {pressing?.kind === 'revoke' && pressing.tokenId === token.id
                              ? t.revoking
                              : t.revokeConfirm}
                          </Button>
                          <Button
                            kind="secondary"
                            disabled={busy}
                            onClick={() => {
                              setConfirming(null)
                              setFocusOn({ tokenId: token.id })
                            }}
                          >
                            {t.keep}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="describe__actions"
                        ref={(element) => {
                          if (element === null) revokes.current.delete(token.id)
                          else revokes.current.set(token.id, element)
                        }}
                      >
                        <Button
                          kind="ghostDanger"
                          disabled={busy}
                          onClick={() => {
                            setSaid(undefined)
                            setConfirming(token.id)
                          }}
                        >
                          {t.revoke}
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {notice('revoke')}
          </section>
          {/* In the page before anything is said, so a screen reader hears it arrive. */}
          <p className="body agents__status" role="status" ref={statusRef} tabIndex={-1}>
            {status ?? ''}
          </p>
          <section className="agents__section agents__make" aria-labelledby="agents-make">
            <h2 className="heading" id="agents-make">
              {m.title}
            </h2>
            {made === null ? null : (
              <Card tone="attention" className="agents__made">
                <p className="body-lead" ref={madeRef} tabIndex={-1}>
                  <strong>{m.made}</strong>
                </p>
                <p className="agents__key mono">{made}</p>
                <div className="agents__copy">
                  <CopyButton value={made} name={m.copyName} />
                </div>
                <p className="body">{m.once}</p>
                <Disclosure summary={m.how}>
                  <p className="body-small">{m.sends}</p>
                  <p className="body-small mono">{`${origin}/v1`}</p>
                  <p className="body-small">{m.guide}</p>
                  <p className="body-small mono">{`${origin}/v1/docs/agents`}</p>
                </Disclosure>
                <div className="describe__actions">
                  <Button
                    kind="secondary"
                    onClick={() => {
                      setMade(null)
                      setFocusOn('status')
                    }}
                  >
                    {m.done}
                  </Button>
                </div>
              </Card>
            )}
            <FormField
              id="agents-name"
              label={m.name}
              hint={m.nameHint}
              value={name}
              onChange={(event) => setName(event.target.value)}
              {...(count === undefined ? {} : { count })}
            />
            <p className="mf-field__label">{m.may}</p>
            <Choice
              type="checkbox"
              name="agents-may"
              label={m.may}
              options={MINTABLE.map((capability) => ({
                title: CAPABILITY_WORDS[capability]!,
                value: capability,
                checked: chosen.has(capability),
              }))}
              onChange={(capability) =>
                setChosen((now) => {
                  const next = new Set(now)
                  if (next.has(capability)) next.delete(capability)
                  else next.add(capability)
                  return next
                })
              }
            />
            <p className="mf-field__label">{m.long}</p>
            <Choice
              name="agents-days"
              label={m.long}
              value={String(days)}
              options={DAYS.map((n) => ({ title: m.days(n), value: String(n) }))}
              onChange={(value) => setDays(Number(value))}
            />
            {notice('make')}
            <div className="describe__actions" ref={makeAt}>
              <Button
                kind="primary"
                disabled={busy || !ready}
                onClick={() => void make()}
              >
                {pressing?.kind === 'make' ? m.making : m.button}
              </Button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
