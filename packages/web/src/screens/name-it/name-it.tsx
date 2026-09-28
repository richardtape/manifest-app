import type { Schemas } from '@manifest/contract'
import type { Conversation, Intake, StepKey } from '@manifest-app/server/progress'
import {
  Button,
  Card,
  Choice,
  FormField,
  StateChip,
  type FieldMessage,
} from '@manifest-app/ui'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { linkTo } from '../../router.js'
import { words } from '../../words.js'
import { recallIntakeSession } from '../describe/memory.js'
import {
  addressOf,
  needAnotherRound,
  offerable,
  slugFor,
  type Offer,
  type Reason,
} from './model.js'

/** "Something else": not an address, so it can never be one. */
const ELSE = '(something else)'
/** How long a typed address rests before it is checked. */
const SETTLE_MS = 400

type Scale = 'solo' | 'class' | 'large_course' | 'public'
type Burst = 'steady' | 'synchronised'

/** The platform's own words, as FormField shows them (never rewritten), or ours for a free one. */
function messageFor(check: Schemas['SlugCheck']): FieldMessage {
  if (check.available)
    return { tone: 'steady', title: words.nameIt.addressFree(addressOf(check.slug)) }
  const reason: Reason | undefined = check.reasons?.[0]
  const hint =
    reason?.hint ?? (reason?.code === 'SLUG_TAKEN' ? words.nameIt.takenExtra : undefined)
  return {
    tone: 'attention',
    title: reason?.message ?? check.slug,
    ...(hint === undefined ? {} : { body: hint }),
  }
}

/**
 * MOMENT 4, BEFORE *MAKE IT* (F2 Task 7): what we understood, a name and its address, who it
 * is for and how they turn up, why, and the two notes.
 * - **Every suggestion is checked before it is shown** (Decision 8). Fewer than two free asks
 *   for one more round, naming the taken ones; if that one leaves none, *Something else* is
 *   offered alone, focused (Review Focus 3).
 * - **The name and the address are two things.** The address comes from the name; *Change
 *   the address* opens it as its own field, checked as it is typed.
 * - **The audience is guessed, and says so.**
 */
export function NameIt({
  platform,
  ours,
  conversation,
  intake,
  working,
  suggest,
  notice,
  onTaken,
  onBlueprints,
}: {
  platform: Platform
  ours: Ours
  conversation: Conversation
  intake: Intake
  working: StepKey[]
  /** False when the intake is paused or failed: no names are asked for. */
  suggest: boolean
  notice?: ReactNode
  onTaken: (taken: string[]) => void
  onBlueprints: (blueprints: Schemas['BlueprintList']) => void
}) {
  const id = conversation.id
  const understood = intake.understood
  const [offers, setOffers] = useState<Offer[] | undefined>(suggest ? undefined : [])
  const [choice, setChoice] = useState<string | undefined>()
  const [name, setName] = useState('')
  const [edited, setEdited] = useState<string | undefined>()
  const [changing, setChanging] = useState(false)
  const [check, setCheck] = useState<Schemas['SlugCheck']>()
  const [scale, setScale] = useState<Scale | undefined>(understood?.audience.scale)
  const [burst, setBurst] = useState<Burst | undefined>(understood?.audience.burst)
  const [why, setWhy] = useState('')
  const [made, setMade] = useState(false)
  const taken = useRef<string[]>([])
  const nameField = useRef<HTMLDivElement>(null)

  // ON ARRIVAL, ONCE: names, if we may suggest them, and the blueprint, which the person
  // never sees (D3: an agent chooses it; Task 8 makes the project with it).
  const arrived = useRef(false)
  useEffect(() => {
    if (arrived.current) return
    arrived.current = true
    if (suggest && intake.names === null && intake.namesAsked === 0)
      void ours.names(id, []).catch(() => setOffers([]))
    if (intake.blueprint === null)
      void platform
        .listBlueprints()
        .then((list) => {
          onBlueprints(list)
          return ours.blueprint(id, list)
        })
        .catch(() => undefined)
    // Once per arrival: what it asks for comes back on the stream.
  }, [])

  // EVERY SUGGESTION CHECKED BEFORE IT IS SHOWN. Keyed on the names themselves, not the
  // frame: a later frame (the blueprint) must not check them, or ask, again.
  const namesKey = JSON.stringify(intake.names)
  useEffect(() => {
    const names = intake.names
    if (names === null) return
    let live = true
    void Promise.all(
      names.map(async (n): Promise<Offer> => {
        try {
          const found = await platform.checkSlug(n.slug)
          return found.available
            ? { ...n, available: true }
            : { ...n, available: false, reasons: found.reasons ?? [] }
        } catch {
          // Unchecked is never shown.
          return { ...n, available: false, reasons: [] }
        }
      }),
    ).then((checked) => {
      if (!live) return
      if (needAnotherRound(checked) && intake.namesAsked < 2) {
        taken.current = [
          ...taken.current,
          ...checked.filter((o) => !o.available).map((o) => o.slug),
        ]
        onTaken(taken.current)
        void ours.names(id, taken.current).catch(() => setOffers(offerable(checked)))
        return
      }
      setOffers(offerable(checked))
    })
    return () => {
      live = false
    }
  }, [namesKey])

  // Nothing to offer: Something else, alone, and focused (Review Focus 3).
  const alone = offers !== undefined && offers.length === 0
  useEffect(() => {
    if (alone) setChoice(ELSE)
  }, [alone])
  // Focused once its field exists: that is the render after it is chosen.
  useEffect(() => {
    if (alone && choice === ELSE) nameField.current?.querySelector('input')?.focus()
  }, [alone, choice])

  const suggested = offers?.find((o) => o.slug === choice)
  const chosenName = choice === ELSE ? name.trim() : (suggested?.name ?? '')
  const slug =
    edited ?? (choice === ELSE ? (name.trim() === '' ? '' : slugFor(name)) : choice)
  // A suggestion as it was offered is already checked; anything typed is checked here.
  const needsCheck =
    slug !== undefined && slug !== '' && (choice === ELSE || edited !== undefined)
  useEffect(() => {
    if (!needsCheck) return
    let live = true
    const timer = setTimeout(() => {
      void platform.checkSlug(slug).then(
        (found) => live && setCheck(found),
        () => undefined,
      )
    }, SETTLE_MS)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [slug, needsCheck])
  const checked = needsCheck && check?.slug === slug ? check : undefined
  const addressFree = needsCheck ? checked?.available === true : suggested !== undefined
  const ready =
    chosenName !== '' && addressFree && scale !== undefined && burst !== undefined

  const make = () => {
    setMade(true)
    // Only the browser can end the intake session (sitting 1): it is over once they say.
    const session = recallIntakeSession(id)
    if (session !== undefined)
      void platform.endIntakeSession(session, crypto.randomUUID()).catch(() => undefined)
  }

  const cannot = understood?.cannot ?? []
  const isWorking = (key: StepKey) => working.includes(key)
  return (
    <div className="name-it">
      {notice}
      {understood !== null ? (
        <section className="name-it__section">
          <h1 className="page-title">{words.nameIt.understoodTitle}</h1>
          <blockquote className="name-it__quote">{understood.restatement}</blockquote>
          {cannot.length > 0 ? (
            <p className="body-lead">
              {cannot.length === 1
                ? words.nameIt.cannotOne(cannot[0]!)
                : words.nameIt.cannotMany(cannot.join('; '))}
            </p>
          ) : null}
          <div>
            <Button kind="tertiary" {...linkTo(`/new?from=${encodeURIComponent(id)}`)}>
              {words.nameIt.notIt}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="name-it__section">
        {understood !== null ? (
          <h2 className="subheading">{words.nameIt.callTitle}</h2>
        ) : (
          <h1 className="page-title">{words.nameIt.callTitle}</h1>
        )}
        {isWorking('naming') || (suggest && offers === undefined) ? (
          <div>
            <StateChip state="working" label={words.steps.naming} />
          </div>
        ) : (
          <Choice
            className="name-it__names"
            name="name-it-name"
            label={words.nameIt.callTitle}
            value={choice}
            onChange={(value) => {
              setChoice(value)
              setEdited(undefined)
              setChanging(false)
            }}
            options={[
              ...(offers ?? []).map((o) => ({
                title: o.name,
                note: addressOf(o.slug),
                value: o.slug,
              })),
              { title: words.nameIt.somethingElse, value: ELSE },
            ]}
          />
        )}
        {choice === ELSE ? (
          <div ref={nameField}>
            <FormField
              id="name-it-name"
              label={words.nameIt.nameLabel}
              value={name}
              onChange={(e) => setName(e.target.value)}
              {...(!changing && checked !== undefined
                ? { message: messageFor(checked) }
                : {})}
            />
          </div>
        ) : null}
        {choice !== undefined && !changing ? (
          <div>
            <Button kind="tertiary" onClick={() => setChanging(true)}>
              {words.nameIt.changeAddress}
            </Button>
          </div>
        ) : null}
        {changing ? (
          <FormField
            id="name-it-address"
            label={words.nameIt.addressLabel}
            hint={words.nameIt.addressHint}
            mono
            value={slug ?? ''}
            onChange={(e) => setEdited(e.target.value)}
            {...(checked !== undefined ? { message: messageFor(checked) } : {})}
          />
        ) : null}
      </section>

      <section className="name-it__section">
        <h2 className="subheading">{words.nameIt.whoTitle}</h2>
        <Choice
          name="name-it-scale"
          label={words.nameIt.whoTitle}
          value={scale}
          onChange={(value) => setScale(value as Scale)}
          options={(['solo', 'class', 'large_course', 'public'] as const).map(
            (value) => ({
              ...words.nameIt.scale[value],
              value,
            }),
          )}
        />
        <h2 className="subheading">{words.nameIt.howTitle}</h2>
        <Choice
          name="name-it-burst"
          label={words.nameIt.howTitle}
          value={burst}
          onChange={(value) => setBurst(value as Burst)}
          options={(['steady', 'synchronised'] as const).map((value) => ({
            ...words.nameIt.burst[value],
            value,
          }))}
        />
        {understood !== null ? (
          <p className="name-it__guess">
            {words.nameIt.guessedFrom(understood.audience.from)}
          </p>
        ) : null}
      </section>

      <FormField
        id="name-it-why"
        label={words.nameIt.whyLabel}
        hint={words.nameIt.whyHint}
        value={why}
        onChange={(e) => setWhy(e.target.value)}
      />

      <Card tone="waiting" title={words.nameIt.worthKnowingTitle}>
        <p className="body-lead">{words.nameIt.worthKnowing}</p>
      </Card>
      <p className="name-it__footer">{words.nameIt.footer}</p>

      {made ? (
        <p className="body-lead" role="status">
          {words.nameIt.makingNext}
        </p>
      ) : (
        <div>
          <Button kind="primary" disabled={!ready} onClick={make}>
            {words.nameIt.makeIt}
          </Button>
        </div>
      )}
    </div>
  )
}
