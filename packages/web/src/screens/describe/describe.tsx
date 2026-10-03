import type { Schemas } from '@manifest/contract'
import type { Intake, Question, StepKey } from '@manifest-app/server/progress'
import { Button, Card, Choice, FieldCount, FormField, StateChip } from '@manifest-app/ui'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { OurRefusal, ourReported, reportProblem, type Ours } from '../../ours/api.js'
import { useConversation } from '../../ours/conversation.js'
import type { Platform } from '../../platform/api.js'
import { NOT_OPEN_CODE } from '../../not-open.js'
import { refusalOf, reported } from '../../platform/refusal.js'
import { linkTo, navigate } from '../../router.js'
import { words } from '../../words.js'
import { BuildingScreen } from '../building/building.js'
import type { Theirs } from '../change/together.js'
import { SetAsideScreen, WaitingScreen } from '../change/waiting.js'
import { useRole } from '../keeping/role.js'
import { NameIt } from '../name-it/name-it.js'
import { PlanScreen } from '../plan/plan.js'
import { countOf, countProp, LIMITS, tooLong } from '../limits.js'
import { SupportReference, useReported } from '../reference.js'
import { rememberIntakeSession } from './memory.js'
import { intakeRefused } from './model.js'

/**
 * A problem shown, with its reference (Decision 11). `naming`: it goes on to Name it with no
 * suggestions; `choose`: the person may try again, or name it themselves.
 */
type Notice = { words: string; reference: string; then: 'naming' | 'choose' }

/**
 * A KEY THAT HAS ENDED IS RENEWED, ONCE, WITHOUT A WORD: none handed over (a restart of our
 * server, Review Focus 5), past its time, refused by the gateway, or its few cents spent.
 * A second time, it is said.
 */
const RENEWABLE = new Set([
  'INTAKE_KEY_MISSING',
  'INTAKE_KEY_EXPIRED',
  'MODEL_KEY_REFUSED',
  'MODEL_BUDGET_EXHAUSTED',
])

/**
 * MOMENT 3, AND THE WAY INTO MOMENT 4 (F2 Task 7). `/new` is their words; `/new/<id>` is the
 * conversation they made, followed on its stream. One component for both, so what a press
 * started (a notice, the words) survives the address gaining its id.
 * - **The browser starts the intake** in the person's session and hands the key to our
 *   server (Task 6). Its refusals are read by code, and said as Rich worded them.
 * - **Round 2 appears only if our server asks one**; there is never a round 3.
 */
export function Describing({
  platform,
  ours,
  id,
  from,
  expire,
  now = () => new Date(),
  timeZone,
  onProject,
  me,
}: {
  platform: Platform
  ours: Ours
  /**
   * F6b D3: the reader. A conversation on an app that is not theirs is read-only, and an owner of
   * the app may stop it; the role is read here, for the conversation's own app (`useRole`).
   */
  me: Pick<Schemas['Me'], 'id'>
  /** The conversation, once there is one. */
  id?: string
  /** "That's not it": the conversation whose words to bring back. */
  from?: string
  expire: () => void
  now?: () => Date
  timeZone?: string
  /** F4 Task 5: the conversation's project, once it exists, for the rail's project section. */
  onProject?: (project: { name: string; slug: string } | null) => void
}) {
  const view = useConversation(id, ours.events)
  const project = view.intake?.project ?? null
  const role = useRole(platform, view.conversation?.projectId ?? undefined, me)
  const whose: Theirs =
    view.conversation === undefined ||
    view.conversation.projectId === null ||
    view.conversation.personId === me.id
      ? null
      : { name: view.conversation.byName, mayStop: role === 'owner' }
  const projectKey = project === null ? '' : `${project.slug}\n${project.name}`
  useEffect(() => {
    onProject?.(project === null ? null : { name: project.name, slug: project.slug })
    // Told when the project's name or address changes, never on every frame.
  }, [projectKey])
  /**
   * WHERE A PRESS WAS MADE: the state and the intake round. The press is over when the page
   * it was made on is gone, so a stream that connects late, or reconnects and never hears
   * the steps, can never leave a working state stuck (Review Focus 5).
   */
  const [pressedAt, setPressedAt] = useState<string | undefined>()
  const state = view.conversation?.state
  const here = `${state ?? 'describing'}:${view.intake?.round ?? ''}`
  const pressed = pressedAt === here
  const press = () => setPressedAt(here)
  const unpress = () => setPressedAt(undefined)
  const [text, setText] = useState('')
  const [notice, setNotice] = useState<Notice>()
  const renewed = useRef(false)
  /** Whether this conversation's key has been handed over: until then, Try again starts one. */
  const handed = useRef(false)
  /** "Name it yourself": no names are asked for after that. */
  const selfNamed = useRef(false)
  const lastAnswers = useRef<Record<string, string> | undefined>(undefined)
  const lastTaken = useRef<string[]>([])
  const blueprints = useRef<Schemas['BlueprintList'] | undefined>(undefined)
  /** Where the conversation is now, for work that finishes after a render has passed. */
  const stateNow = useRef(state)
  stateNow.current = state
  /** No such conversation, or another person's (the final review): said, never a blank page. */
  const [missing, setMissing] = useState(false)

  // ANOTHER CONVERSATION, OR A NEW ONE AFTER IT, STARTS CLEAN (the final review): one
  // component serves /new and /new/<id> so a press survives its id arriving, and nothing of
  // the last conversation's may carry into the next: its words, its notice, "Name it
  // yourself", a key renewed or handed over.
  const previousId = useRef(id)
  useEffect(() => {
    const before = previousId.current
    previousId.current = id
    if (id !== undefined)
      void ours.readConversation(id).catch((error: unknown) => {
        if (!(error instanceof OurRefusal)) return
        if (error.status === 401) expire()
        else if (error.status === 404) setMissing(true)
      })
    if (before === undefined || before === id) return
    setText('')
    setNotice(undefined)
    setPressedAt(undefined)
    setMissing(false)
    renewed.current = false
    handed.current = false
    selfNamed.current = false
    lastAnswers.current = undefined
    lastTaken.current = []
    blueprints.current = undefined
  }, [id])

  // A step newly done is progress: a key may be renewed again for a later failure (the final
  // review: once per failure, never once per page).
  const doneBefore = useRef(new Set<string>())
  const stepsKey = view.steps.map((s) => `${s.step}:${s.state}`).join()
  useEffect(() => {
    const done = new Set(view.steps.filter((s) => s.state === 'done').map((s) => s.step))
    if ([...done].some((key) => !doneBefore.current.has(key))) renewed.current = false
    doneBefore.current = done
  }, [stepsKey])

  // "That's not it" brings their words back, to be changed (moment 4).
  useEffect(() => {
    if (id !== undefined || from === undefined) return
    void ours.readConversation(from).then(
      (conversation) => setText(conversation.description),
      () => undefined,
    )
  }, [from])

  /** Shown, with its reference, and reported. */
  const show = (
    said: { words: string; then: Notice['then'] },
    problem: { code: string; operation: string; status?: number; requestId?: string },
  ) => {
    unpress()
    setNotice({ ...said, reference: reportProblem(problem) })
  }

  /** Something outside the stream failed: ours, or the platform's. Answers where it goes on. */
  const failed = (error: unknown, operation: string): Notice['then'] | undefined => {
    // D7 (FE-39): refused because they may no longer build. The shell follows the platform's
    // decision (not-open.ts): nothing is said, reported or moved on here.
    if (error instanceof OurRefusal) {
      if (error.code === NOT_OPEN_CODE) return void unpress()
      if (error.status === 401) return void expire()
      const unreachable = error.code === 'UNREACHABLE'
      show(
        {
          words: unreachable ? words.describe.couldntRead : words.refused.body,
          then: 'choose',
        },
        // Ours, relaying the platform's request id when it carried one (m124).
        { ...ourReported(error), operation },
      )
      return 'choose'
    }
    const refusal = refusalOf(error)
    if (refusal.kind === 'signed-out') return void expire()
    if (refusal.kind === 'refused' && refusal.code === NOT_OPEN_CODE)
      return void unpress()
    // The platform's request id rides the report (FE-30).
    const report = reported(refusal)
    // FE-29: when a limit lifts is the platform's to say.
    const said = intakeRefused(
      report.code,
      now(),
      timeZone,
      refusal.kind === 'refused' ? refusal.limit?.resetsAt : undefined,
    )
    show(said, { ...report, operation })
    return said.then
  }

  /**
   * AN INTAKE SESSION, STARTED AND HANDED OVER: in the person's session, one
   * Idempotency-Key per press. Refused, it says why, and a limit goes on to Name it.
   */
  const handOver = async (conversationId: string): Promise<boolean> => {
    let started: Schemas['IntakeSessionStarted']
    try {
      started = await platform.startIntakeSession(crypto.randomUUID())
    } catch (error) {
      // On to Name it: unless it is there already, where a skip is refused (the final review).
      if (
        failed(error, 'startIntakeSession') === 'naming' &&
        stateNow.current !== 'naming'
      )
        await ours
          .intake(conversationId, { skip: true })
          .catch((e: unknown) => failed(e, 'intake'))
      return false
    }
    rememberIntakeSession(conversationId, started.session.id)
    try {
      await ours.handIntakeKey(conversationId, {
        key: started.key,
        baseUrl: started.baseUrl,
        model: started.session.model,
        expiresAt: started.session.expiresAt,
      })
      handed.current = true
      return true
    } catch (error) {
      failed(error, 'handIntakeKey')
      return false
    }
  }

  const post = (conversationId: string, send: () => Promise<void>, operation: string) =>
    send().catch((error: unknown) => {
      failed(error, operation)
    })

  /** Read their words: the key first, then round 1. */
  const read = async (conversationId: string) => {
    setNotice(undefined)
    press()
    if (await handOver(conversationId))
      await post(conversationId, () => ours.intake(conversationId, {}), 'intake')
  }

  const carryOn = async () => {
    press()
    let made
    try {
      made = await ours.startConversation(text)
    } catch (error) {
      failed(error, 'startConversation')
      return
    }
    navigate(`/new/${encodeURIComponent(made.id)}`)
    await read(made.id)
  }

  const nameItYourself = () => {
    if (id === undefined) return
    selfNamed.current = true
    setNotice(undefined)
    void post(id, () => ours.intake(id, { skip: true }), 'intake')
  }

  /** The step that halted, done again once the key is renewed. */
  const redo = (step: StepKey | undefined) => {
    if (id === undefined) return
    if (step === 'naming')
      return void post(id, () => ours.names(id, lastTaken.current), 'names')
    const list = blueprints.current
    if (step === 'blueprint') {
      if (list !== undefined) void post(id, () => ours.blueprint(id, list), 'blueprint')
      return
    }
    const answers = lastAnswers.current
    if (view.conversation?.state === 'questions' && answers !== undefined)
      return void post(id, () => ours.intake(id, { answers }), 'intake')
    void post(id, () => ours.intake(id, {}), 'intake')
  }

  // A REFUSAL ON THE STREAM: a key renewed once and the step done again; the blueprint,
  // which the person never sees, left to Make it; anything else said, with the reference
  // the server already recorded.
  const halted = [...view.steps].reverse().find((s) => s.state === 'halted')?.step
  useEffect(() => {
    const refusal = view.refusal
    if (refusal === undefined || id === undefined) return
    // Moments 3 and 4 only: from Make it on, a refusal is the plan's (PlanScreen).
    const at = view.conversation?.state
    if (at !== undefined && at !== 'describing' && at !== 'questions' && at !== 'naming')
      return
    unpress()
    // The blueprint, which the person never sees, renews nothing: Make it falls back to the
    // list's first. Renewing for it could meet a limit, and say so, for nothing (the final
    // review).
    if (halted === 'blueprint') return
    if (RENEWABLE.has(refusal.code) && !renewed.current) {
      renewed.current = true
      void handOver(id).then((ok) => ok && redo(halted))
      return
    }
    if (refusal.code === 'MODEL_NOT_AVAILABLE') {
      setNotice({
        words: words.describe.waitingOnAdmin,
        reference: refusal.reference,
        then: 'naming',
      })
      const state = view.conversation?.state
      if (state === 'describing' || state === 'questions')
        void post(id, () => ours.intake(id, { skip: true }), 'intake')
      return
    }
    setNotice({
      // F5 Decision 14: a stall says which; anything else, that we couldn't read it.
      words:
        refusal.code === 'MODEL_STALLED'
          ? words.stalled.quiet
          : refusal.code === 'MODEL_TOO_LONG'
            ? words.stalled.ceiling
            : words.describe.couldntRead,
      reference: refusal.reference,
      then: 'choose',
    })
  }, [view.refusal])

  // And over when the understanding step answers (now, done or halted): from then on, the
  // step itself says whether we are working.
  const understanding = view.steps.find((s) => s.step === 'understanding')?.state
  useEffect(() => {
    if (understanding !== undefined) setPressedAt(undefined)
  }, [understanding])

  const working = (key: StepKey) =>
    view.steps.some((s) => s.step === key && s.state === 'now')

  const noticeCard =
    notice === undefined ? undefined : (
      <div role="alert">
        <Card tone={notice.then === 'naming' ? 'waiting' : 'attention'}>
          <p className="body-lead">{notice.words}</p>
          <SupportReference reference={notice.reference} />
          {notice.then === 'choose' ? (
            <div className="describe__actions">
              <Button
                kind="secondary"
                onClick={() => {
                  setNotice(undefined)
                  if (id === undefined) void carryOn()
                  else if (!handed.current) void read(id)
                  else redo(halted)
                }}
              >
                {words.describe.tryAgain}
              </Button>
              {id !== undefined && state !== 'naming' ? (
                <Button kind="tertiary" onClick={nameItYourself}>
                  {words.describe.nameItYourself}
                </Button>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>
    )

  if (missing && view.conversation === undefined)
    return (
      <p className="body-lead">
        {words.notFound.body} <a {...linkTo('/')}>{words.notFound.link}</a>
      </p>
    )

  // Connecting to a conversation: nothing drawn, for the seconds it takes (no spinners).
  if (id !== undefined && view.conversation === undefined) return noticeCard ?? null
  const intake: Intake | undefined = view.intake

  if (state === 'naming' && view.conversation !== undefined && intake !== undefined)
    return (
      <NameIt
        key={view.conversation.id}
        platform={platform}
        ours={ours}
        conversation={view.conversation}
        intake={intake}
        working={view.steps.filter((s) => s.state === 'now').map((s) => s.step)}
        naming={view.steps.find((s) => s.step === 'naming')}
        blueprintStep={view.steps.find((s) => s.step === 'blueprint')}
        suggest={notice?.then !== 'naming' && !selfNamed.current}
        notice={noticeCard}
        expire={expire}
        onTaken={(taken) => (lastTaken.current = taken)}
        onBlueprints={(list) => (blueprints.current = list)}
      />
    )

  if (
    state === 'questions' &&
    intake?.understood !== null &&
    intake?.understood !== undefined
  )
    return (
      <Questions
        key={intake.round ?? 0}
        questions={intake.understood.questions}
        working={pressed || working('understanding')}
        notice={noticeCard}
        onAnswer={(answers) => {
          if (id === undefined) return
          lastAnswers.current = answers
          press()
          void post(id, () => ours.intake(id, { answers }), 'intake')
        }}
        onSkip={() => {
          if (id === undefined) return
          press()
          void post(id, () => ours.intake(id, { skip: true }), 'intake')
        }}
      />
    )

  // Made, and its token ours: Making it's three lines, then the plan (moments 4's end and 5).
  if (
    (state === 'making' || state === 'planning' || state === 'plan-ready') &&
    view.conversation !== undefined &&
    intake !== undefined
  )
    return (
      <PlanScreen
        key={view.conversation.id}
        platform={platform}
        ours={ours}
        conversation={view.conversation}
        intake={intake}
        plan={view.plan ?? null}
        piece={view.piece ?? null}
        steps={view.steps}
        refusal={view.refusal}
        expire={expire}
        now={now}
        timeZone={timeZone}
        theirs={whose}
      />
    )

  // Agreed, and the round started at once (F3 Decision 11): moment 6, layout C.
  if (
    (state === 'agreed' ||
      state === 'building' ||
      state === 'paused' ||
      state === 'built') &&
    view.conversation !== undefined &&
    intake !== undefined
  )
    return (
      <BuildingScreen
        key={view.conversation.id}
        platform={platform}
        ours={ours}
        conversation={view.conversation}
        intake={intake}
        round={view.round ?? null}
        thread={view.thread ?? []}
        purpose={view.piece?.kind === 'change' ? 'changing' : 'building'}
        connecting={view.status === 'connecting'}
        expire={expire}
        now={now}
        timeZone={timeZone}
        theirs={whose}
      />
    )

  // F4, moment 8: waiting its turn on the app, or a change set aside.
  if (state === 'waiting' && view.conversation !== undefined && intake !== undefined)
    return (
      <WaitingScreen
        key={view.conversation.id}
        ours={ours}
        conversation={view.conversation}
        intake={intake}
        line={view.line ?? null}
        piece={view.piece ?? null}
        me={me}
        theirs={whose}
        expire={expire}
      />
    )
  if (state === 'set-aside' && view.conversation !== undefined && intake !== undefined)
    return (
      <SetAsideScreen
        key={view.conversation.id}
        ours={ours}
        conversation={view.conversation}
        intake={intake}
        piece={view.piece ?? null}
        theirs={whose}
        expire={expire}
      />
    )

  // A state no screen draws: said, with a reference (F3 Decision 12), never a bare sentence.
  if (state !== undefined && state !== 'describing') return <Undrawn state={state} />

  // THEIR WORDS: typed here, or, once sent, theirs as they wrote them.
  const theirs = view.conversation?.description ?? text
  const reading = pressed || working('understanding')
  // Near 4,000 characters, a count; past it, said, and Carry on waits (a deferred Minor).
  const count = id === undefined ? countOf(theirs, LIMITS.description) : undefined
  return (
    <div className="describe">
      <div className="describe__main">
        <h1 className="page-title">{words.describe.title}</h1>
        <p className="body-lead">{words.describe.lead}</p>
        {noticeCard}
        <div className="mf-field">
          <label className="mf-field__label" htmlFor="describe-words">
            {words.describe.label}
          </label>
          <p className="mf-field__hint">{words.describe.hint}</p>
          {/* Decision 10: the description box has no system component; the field's input class, recorded. */}
          <textarea
            id="describe-words"
            className="mf-field__input describe__words"
            value={theirs}
            readOnly={id !== undefined}
            onChange={(e) => setText(e.target.value)}
            aria-describedby={count === undefined ? undefined : 'describe-words-count'}
          />
          {count === undefined ? null : (
            <FieldCount id="describe-words-count" {...count} />
          )}
        </div>
        <div className="describe__actions">
          {reading ? (
            <StateChip state="working" label={words.steps.understanding} />
          ) : notice?.then === 'choose' ? null : (
            <Button
              kind="primary"
              disabled={theirs.trim() === '' || tooLong(theirs, LIMITS.description)}
              onClick={() => (id === undefined ? void carryOn() : void read(id))}
            >
              {words.describe.carryOn}
            </Button>
          )}
        </div>
      </div>
      <Card title={words.describe.asideTitle} className="describe__aside">
        <p className="body-lead">{words.describe.aside}</p>
      </Card>
    </div>
  )
}

/**
 * A CONVERSATION IN A STATE NO SCREEN DRAWS (F3 Decision 12, F2's deferred Minor): our generic
 * words, with a reference reported once. The state is the report's operation, camel-cased, since
 * our server refuses one with a hyphen (and a refused report leaves a reference nobody can find).
 */
function Undrawn({ state }: { state: string }) {
  const reference = useReported({
    code: 'STATE_NOT_DRAWN',
    operation: state.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase()),
  })
  return (
    <div role="alert">
      <Card tone="attention">
        <p className="body-lead">{words.refused.body}</p>
        <SupportReference reference={reference} />
      </Card>
    </div>
  )
}

/** The follow-up questions (moment 3): at most three, each with its field or its choices. */
function Questions({
  questions,
  working,
  notice,
  onAnswer,
  onSkip,
}: {
  questions: Question[]
  working: boolean
  notice?: ReactNode
  onAnswer: (answers: Record<string, string>) => void
  onSkip: () => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const set = (questionId: string, answer: string) =>
    setAnswers((current) => ({ ...current, [questionId]: answer }))
  return (
    <div className="describe__main">
      <h1 className="page-title">{words.describe.questionsTitle}</h1>
      {notice}
      {questions.map((q) =>
        q.choices !== null ? (
          <fieldset key={q.id} className="describe__question">
            <legend className="mf-field__label">{q.ask}</legend>
            <Choice
              name={`question-${q.id}`}
              label={q.ask}
              value={answers[q.id]}
              onChange={(value) => set(q.id, value)}
              options={q.choices.map((choice) => ({ title: choice, value: choice }))}
            />
          </fieldset>
        ) : (
          <FormField
            key={q.id}
            id={`question-${q.id}`}
            label={q.ask}
            value={answers[q.id] ?? ''}
            onChange={(e) => set(q.id, e.target.value)}
            {...countProp(answers[q.id] ?? '')}
          />
        ),
      )}
      <div className="describe__actions">
        {working ? (
          <StateChip state="working" label={words.steps.understanding} />
        ) : (
          <>
            <Button
              kind="primary"
              disabled={Object.values(answers).some((a) => tooLong(a, LIMITS.sentence))}
              onClick={() => onAnswer(answers)}
            >
              {words.describe.carryOn}
            </Button>
            <Button kind="tertiary" onClick={onSkip}>
              {words.describe.skip}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
