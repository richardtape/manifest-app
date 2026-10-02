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
import { OurRefusal, reportProblem, type Ours } from '../../ours/api.js'
import type { Step } from '../../ours/conversation.js'
import type { Platform } from '../../platform/api.js'
import { NOT_OPEN_CODE } from '../../not-open.js'
import { refusalOf } from '../../platform/refusal.js'
import { linkTo } from '../../router.js'
import { words } from '../../words.js'
import {
  forgetMadeProject,
  recallIntakeSession,
  recallMadeProject,
  rememberMadeProject,
  type MadeProject,
} from '../describe/memory.js'
import { MakingSteps } from '../making/making.js'
import { mintRequest } from '../making/token.js'
import { SupportReference } from '../reference.js'
import {
  addressOf,
  needAnotherRound,
  offerable,
  slugFor,
  type Offer,
  type Reason,
} from './model.js'
import { ensureWatch } from '../keeping/watch.js'

/** "Something else": not an address, so it can never be one. */
const ELSE = '(something else)'
/** How long a typed address rests before it is checked. */
const SETTLE_MS = 400

type Scale = 'solo' | 'class' | 'large_course' | 'public'
type Burst = 'steady' | 'synchronised'

const SLUG_REFUSALS = new Set(['SLUG_TAKEN', 'SLUG_RESERVED', 'SLUG_INVALID'])

/** A problem Make it met, with its reference (Decision 11), and the one way on. */
/** `none`: nothing to press, while the stream carries this window on (another window made it). */
type MakeNotice =
  | { words: string; reference: string; then: 'make' | 'start' }
  | { words: string; then: 'none' }

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
  naming,
  blueprintStep,
  suggest,
  notice,
  expire,
  onTaken,
  onBlueprints,
}: {
  platform: Platform
  ours: Ours
  conversation: Conversation
  intake: Intake
  working: StepKey[]
  /** The naming step at its latest: a new object with each of its frames, whatever its state. */
  naming?: Step | undefined
  /** The blueprint step at its latest, likewise. */
  blueprintStep?: Step | undefined
  /** False when the intake is paused or failed: no names are asked for. */
  suggest: boolean
  notice?: ReactNode
  /** The session has ended: the shell says so. */
  expire: () => void
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
  /** Making it: from the press until our server holds the token. */
  const [making, setMaking] = useState(false)
  /** The project, once made: from then on, Make it is never pressed again. */
  const [made, setMade] = useState<MadeProject | undefined>(() => recallMadeProject(id))
  const [makeNotice, setMakeNotice] = useState<MakeNotice>()
  /** The platform's own words for the address, when the create found it gone (a race). */
  const [slugRefused, setSlugRefused] = useState<{
    slug: string
    message: FieldMessage
  }>()
  /** One Idempotency-Key per press, reused on its retry: while the request is the same. */
  const pressKey = useRef<{ key: string; body: string } | undefined>(undefined)
  const busy = useRef(false)
  const listed = useRef<Schemas['BlueprintList'] | undefined>(undefined)
  const [list, setList] = useState<Schemas['BlueprintList']>()
  const taken = useRef<string[]>([])
  const nameField = useRef<HTMLDivElement>(null)

  /**
   * WAITING FOR NAMES, AND ONLY WHILE SOMETHING IS ON ITS WAY (Review Focus 5, the final
   * review): a request not yet begun on our server, the naming step at work, or names being
   * checked. A restart, or a refusal, leaves none of the three, and Something else is offered.
   */
  const [asking, setAsking] = useState(
    () => suggest && intake.names === null && intake.namesAsked === 0,
  )
  const [checking, setChecking] = useState(() => intake.names !== null)
  const namingNow = working.includes('naming')
  // Any frame of the naming step answers the request: now, done or halted. Each frame is a
  // new object, so a quick model's now and done in one render still count (found by the walk:
  // waiting on "now" alone, the blueprint was never asked).
  useEffect(() => {
    if (naming !== undefined) setAsking(false)
  }, [naming])
  const waitingForNames = namingNow || asking || checking
  const askNames = (slugs: string[], otherwise: () => void) => {
    setAsking(true)
    void ours.names(id, slugs).catch(() => {
      setAsking(false)
      otherwise()
    })
  }

  // ON ARRIVAL, ONCE: names, if we may suggest them, and the blueprints to choose among,
  // which the person never sees (D3: an agent chooses; Task 8 makes the project with it).
  const arrived = useRef(false)
  useEffect(() => {
    if (arrived.current) return
    arrived.current = true
    if (asking) askNames([], () => setOffers([]))
    if (intake.blueprint === null)
      void platform
        .listBlueprints()
        .then((blueprints) => {
          listed.current = blueprints
          onBlueprints(blueprints)
          setList(blueprints)
        })
        .catch(() => undefined)
    // Made before a reload, and never handed over: carry on from the project.
    if (made !== undefined) void startWork(made)
    // Once per arrival: what it asks for comes back on the stream.
  }, [])

  // THE BLUEPRINT, ONCE THE NAMES HAVE SETTLED: our server does one piece of work per
  // conversation at a time, so asked beside the names it was refused as busy (the final
  // review). Only if its agent cannot choose does Make it fall back to the list's first.
  const [blueprintAsked, setBlueprintAsked] = useState(false)
  const [blueprintAsking, setBlueprintAsking] = useState(false)
  useEffect(() => {
    if (list === undefined || waitingForNames || blueprintAsked) return
    if (intake.blueprint !== null) return
    setBlueprintAsked(true)
    setBlueprintAsking(true)
    void ours.blueprint(id, list).catch(() => setBlueprintAsking(false))
  }, [list, waitingForNames])
  useEffect(() => {
    if (blueprintStep !== undefined) setBlueprintAsking(false)
  }, [blueprintStep])
  /**
   * D3, FOUND ON THE REAL PLATFORM: an agent chooses the blueprint, so Make it waits for its
   * answer (seconds), or its refusal. Pressed before, the list's first was a test fixture, and
   * the agent was still using the intake key the press ended.
   */
  const waitingForBlueprint =
    list !== undefined &&
    intake.blueprint === null &&
    (!blueprintAsked ||
      blueprintAsking ||
      // At work, or done with its answer not yet here: the state follows the step.
      blueprintStep?.state === 'now' ||
      blueprintStep?.state === 'done')
  const [queued, setQueued] = useState(false)
  useEffect(() => {
    if (!queued || waitingForBlueprint) return
    setQueued(false)
    void make()
  }, [queued, waitingForBlueprint])

  // EVERY SUGGESTION CHECKED BEFORE IT IS SHOWN. Keyed on the names themselves, not the
  // frame: a later frame (the blueprint) must not check them, or ask, again.
  const namesKey = JSON.stringify(intake.names)
  useEffect(() => {
    const names = intake.names
    if (names === null) return
    let live = true
    setChecking(true)
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
      setChecking(false)
      if (needAnotherRound(checked) && intake.namesAsked < 2) {
        taken.current = [
          ...taken.current,
          ...checked.filter((o) => !o.available).map((o) => o.slug),
        ]
        onTaken(taken.current)
        askNames(taken.current, () => setOffers(offerable(checked)))
        return
      }
      setOffers(offerable(checked))
    })
    return () => {
      live = false
    }
  }, [namesKey])

  // Nothing on its way and nothing offered: Something else, alone, and focused (Review Focus 3).
  const shownOffers = offers ?? (waitingForNames ? undefined : [])
  const alone = shownOffers !== undefined && shownOffers.length === 0
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
  // AN ADDRESS WE COULD NOT CHECK is said under it, with its reference and a way to check it
  // again: never a silent Make it (a deferred Minor, Rich's word).
  const [checkFailed, setCheckFailed] = useState<{ slug: string; reference: string }>()
  const [rechecks, setRechecks] = useState(0)
  useEffect(() => {
    if (!needsCheck) return
    let live = true
    const timer = setTimeout(() => {
      void platform.checkSlug(slug).then(
        (found) => live && setCheck(found),
        (error: unknown) => {
          if (!live) return
          const refusal = refusalOf(error)
          if (refusal.kind === 'signed-out') return expire()
          setCheckFailed({
            slug,
            reference: reportProblem({
              code: refusal.kind === 'refused' ? refusal.code : 'UNREACHABLE',
              operation: 'checkSlug',
              ...(refusal.kind === 'refused' ? { status: refusal.status } : {}),
            }),
          })
        },
      )
    }, SETTLE_MS)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [slug, needsCheck, rechecks])
  const checked = needsCheck && check?.slug === slug ? check : undefined
  const uncheckable =
    needsCheck && checked === undefined && checkFailed?.slug === slug
      ? checkFailed
      : undefined
  /** What the address field says: the platform's refusal, its check, or that we could not. */
  const addressMessage: FieldMessage | undefined =
    checked !== undefined
      ? messageFor(checked)
      : uncheckable !== undefined
        ? {
            tone: 'attention',
            title: words.nameIt.couldntCheck,
            body: words.reference.line(uncheckable.reference),
          }
        : undefined
  const checkAgain =
    uncheckable === undefined ? null : (
      <div>
        <Button
          kind="tertiary"
          onClick={() => {
            setCheckFailed(undefined)
            setRechecks((n) => n + 1)
          }}
        >
          {words.nameIt.checkAgain}
        </Button>
      </div>
    )
  const refusedHere =
    slugRefused !== undefined && slugRefused.slug === slug
      ? slugRefused.message
      : undefined
  const addressFree = needsCheck ? checked?.available === true : suggested !== undefined
  const ready =
    chosenName !== '' &&
    addressFree &&
    refusedHere === undefined &&
    scale !== undefined &&
    burst !== undefined

  /** Said, with its reference, and reported (Decision 11). */
  const said = (
    text: string,
    then: 'make' | 'start',
    problem: { code: string; operation: string; status?: number | null },
  ) => {
    const { status, ...rest } = problem
    setMakeNotice({
      words: text,
      then,
      reference: reportProblem({
        ...rest,
        ...(status === null || status === undefined ? {} : { status }),
      }),
    })
  }

  /**
   * THE CONVERSATION'S TOKEN, MINTED AND HANDED OVER. A mint takes its own key every time (a
   * repeated key is TOKEN_ALREADY_MINTED, and the secret is never answered again), and is
   * tried once more by itself. A handover refused is not minted again: that is the person's.
   */
  async function startWork(project: MadeProject) {
    setMakeNotice(undefined)
    setMaking(true)
    let failure: { code: string; operation: string; status: number | null } | undefined
    for (let attempt = 0; attempt < 2; attempt++) {
      let minted: Schemas['MintedToken']
      try {
        minted = await platform.mintToken(
          project.id,
          mintRequest(conversation.title),
          crypto.randomUUID(),
        )
      } catch (error) {
        const refusal = refusalOf(error)
        if (refusal.kind === 'signed-out') return expire()
        failure = {
          code: refusal.kind === 'refused' ? refusal.code : 'UNREACHABLE',
          operation: 'mintToken',
          status: refusal.kind === 'refused' ? refusal.status : null,
        }
        continue
      }
      try {
        await ours.handProject(id, { projectId: project.id, token: minted.secret })
        // Ours now: the conversation's state moves on, on the stream.
        forgetMadeProject(id)
        // F6 TASK 8: the app's Keeping watch, from its first minute; best-effort, never waited on.
        void ensureWatch(platform, ours, { id: project.id, state: 'active' }, new Date())
        return
      } catch (error) {
        const ourRefusal =
          error instanceof OurRefusal ? error : new OurRefusal('UNEXPECTED', null)
        if (ourRefusal.status === 401) return expire()
        // ANOTHER WINDOW'S MADE IT FIRST (a deferred Minor, Rich: the first wins). Nothing of
        // ours failed: the stream carries this window on to that one. Never Start building,
        // which would mint again for this project, and be refused again.
        if (ourRefusal.code === 'PROJECT_MISMATCH') {
          forgetMadeProject(id)
          setMakeNotice({ words: words.making.madeElsewhere, then: 'none' })
          return
        }
        failure = {
          code: ourRefusal.code,
          operation: 'handProject',
          status: ourRefusal.status,
        }
        break
      }
    }
    setMaking(false)
    said(words.making.madeNotStarted(project.name), 'start', failure!)
  }

  /** The blueprint the agent chose, or the list's first when it never answered (D3). */
  const blueprintToUse = async (): Promise<{
    blueprint: string
    starter: string | null
  }> => {
    if (intake.blueprint !== null) return intake.blueprint
    const list = listed.current ?? (await platform.listBlueprints())
    listed.current = list
    // Found on the real platform: its list's first is a test fixture with no CWL sign-in, and
    // Making it then says "A starting point with CWL sign-in is in place". The first that
    // provides CWL, by what the contract says it provides; the list's first only if none does.
    const first = list.find((b) => b.provides.authProviders.includes('cwl')) ?? list[0]
    if (first === undefined) throw new OurRefusal('NO_BLUEPRINT', null)
    return { blueprint: first.ref, starter: null }
  }

  /** MAKE IT (walk-through moment 4), in the person's session: the project, then its token. */
  const make = async () => {
    if (busy.current || slug === undefined) return
    // The blueprint agent is still choosing: making, and made once it has answered.
    if (waitingForBlueprint) {
      setMaking(true)
      setQueued(true)
      return
    }
    busy.current = true
    setMakeNotice(undefined)
    setMaking(true)
    // Only the browser can end the intake session (sitting 1): it is over once they say.
    const session = recallIntakeSession(id)
    if (session !== undefined)
      void platform.endIntakeSession(session, crypto.randomUUID()).catch(() => undefined)
    try {
      let created: Schemas['CreatedProject']
      let operation = 'listBlueprints'
      try {
        const chosen = await blueprintToUse()
        operation = 'createProject'
        const justification = why.trim()
        const body: Schemas['CreateProjectRequest'] = {
          slug,
          name: chosenName,
          blueprint: chosen.blueprint,
          ...(chosen.starter === null ? {} : { starter: chosen.starter }),
          audience: {
            scale: scale!,
            burst: burst!,
            ...(justification === '' ? {} : { justification }),
          },
        }
        const fingerprint = JSON.stringify(body)
        if (pressKey.current?.body !== fingerprint)
          pressKey.current = { key: crypto.randomUUID(), body: fingerprint }
        created = await platform.createProject(body, pressKey.current.key)
      } catch (error) {
        setMaking(false)
        if (error instanceof OurRefusal)
          return said(words.making.couldntMake, 'make', { code: error.code, operation })
        const refusal = refusalOf(error)
        if (refusal.kind === 'signed-out') return expire()
        // D7 (FE-39): they may no longer build; the shell follows (not-open.ts), and says so.
        if (refusal.kind === 'refused' && refusal.code === NOT_OPEN_CODE) return
        const envelope = (
          error as { envelope?: { error?: { message?: string; hint?: string } } }
        ).envelope?.error
        if (refusal.kind === 'refused' && SLUG_REFUSALS.has(refusal.code)) {
          // The platform's own words about the address, as FormField shows them.
          setSlugRefused({
            slug,
            message: {
              tone: 'attention',
              title: envelope?.message ?? slug,
              ...(envelope?.hint === undefined ? {} : { body: envelope.hint }),
            },
          })
          setChanging(true)
          return
        }
        return said(words.making.couldntMake, 'make', {
          code: refusal.kind === 'refused' ? refusal.code : 'UNREACHABLE',
          operation,
          status: refusal.kind === 'refused' ? refusal.status : null,
        })
      }
      const project = { id: created.id, name: created.name }
      rememberMadeProject(id, project)
      setMade(project)
      await startWork(project)
    } finally {
      busy.current = false
    }
  }

  const makeNoticeCard =
    makeNotice === undefined ? undefined : (
      <div role="alert">
        <Card tone="attention">
          <p className="body-lead">{makeNotice.words}</p>
          {makeNotice.then === 'none' ? null : (
            <>
              <SupportReference reference={makeNotice.reference} />
              <div className="describe__actions">
                {makeNotice.then === 'start' && made !== undefined ? (
                  <Button kind="primary" onClick={() => void startWork(made)}>
                    {words.making.startBuilding}
                  </Button>
                ) : (
                  <Button kind="secondary" onClick={() => void make()}>
                    {words.describe.tryAgain}
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    )

  // MADE, OR BEING MADE: the three lines, and nothing to press but what the notice offers.
  if (making || made !== undefined)
    return (
      <div className="making">
        <h1 className="page-title">{made?.name ?? chosenName}</h1>
        {makeNoticeCard}
        {makeNotice === undefined ? (
          <MakingSteps name={made?.name ?? chosenName} seen={new Set()} />
        ) : null}
      </div>
    )

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
        {isWorking('naming') || shownOffers === undefined ? (
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
              ...(shownOffers ?? []).map((o) => ({
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
              {...(!changing && addressMessage !== undefined
                ? { message: addressMessage }
                : {})}
            />
            {changing ? null : checkAgain}
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
            {...(refusedHere !== undefined
              ? { message: refusedHere }
              : addressMessage !== undefined
                ? { message: addressMessage }
                : {})}
          />
        ) : null}
        {changing && refusedHere === undefined ? checkAgain : null}
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

      {makeNoticeCard}
      <div>
        <Button kind="primary" disabled={!ready} onClick={() => void make()}>
          {words.nameIt.makeIt}
        </Button>
      </div>
    </div>
  )
}
