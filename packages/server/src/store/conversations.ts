import type { Person } from '../identity.js'
import type { Conversation, ConversationState } from '../api/progress.js'
import type { AskedQuestion, Run, RunStatus } from './runs.js'

/** The page's contract owns these (Decision 4); the store keeps them. */
export type { Conversation, ConversationState } from '../api/progress.js'
export type { AskedQuestion, Run, RunDetail, RunStatus } from './runs.js'

export type Sender = 'person' | 'we'

/** What a person was shown a support reference for (Decision 11). */
export interface Problem {
  reference: string
  code: string
  at: string
  where: 'server' | 'browser'
  /** The platform's operationId, or our route. */
  operation: string | null
  status: number | null
  /** A person who cannot sign in has problems too. */
  personId: string | null
  conversationId: string | null
  /** FE-30: null until the platform answers one. */
  platformRequestId: string | null
}

/**
 * THE ONLY READER OF THE DATABASE (Decision 2). Nothing in it is a credential (Decision 1).
 * A plan is `unknown` here: Task 9's schema parses it on the way out.
 */
export interface Store {
  rememberPerson(person: Person): void
  createConversation(personId: string, description: string): Conversation
  /** Another person's conversation is `undefined`, exactly as one that does not exist. */
  getConversation(id: string, personId: string): Conversation | undefined
  /**
   * F4 Decision 5: a conversation moved to `waiting` takes `waitingSince` as its place in the
   * app's line, or keeps the one it has, or now; moved anywhere else, it leaves the line.
   */
  setState(
    id: string,
    state: ConversationState,
    patch?: Partial<Pick<Conversation, 'projectId' | 'title'>> & {
      waitingSince?: string
    },
  ): Conversation
  /** F4 Task 6: a change asked on an app, waiting until the line lets it start. */
  createChange(
    personId: string,
    projectId: string,
    title: string,
    description: string,
  ): Conversation
  /** The person's conversations on one app, newest first. */
  listConversationsOn(projectId: string, personId: string): Conversation[]
  /** Every person's conversations on one app: the line is the app's, not a person's. */
  conversationsOn(projectId: string): Conversation[]
  /** The app's line: its waiting conversations, oldest wait first. */
  waitingOn(projectId: string): Conversation[]
  /** The apps with a conversation waiting (a restart starts each one's next). */
  waitingProjects(): string[]
  /** The person's conversation whose round deployed this instance, by its run's detail. */
  conversationForInstance(
    projectId: string,
    instanceId: string,
    personId: string,
  ): string | undefined
  /**
   * The person's fix conversation for this incident, the latest, unless it was set aside: so
   * [What went wrong] pressed again opens it (the whole-branch review's I2).
   */
  fixFor(projectId: string, incidentId: string, personId: string): string | undefined
  /** `body` is our structured JSON. */
  addMessage(conversationId: string, from: Sender, body: unknown): void
  listMessages(conversationId: string): { from: Sender; body: unknown; at: string }[]
  /** Answers the plan's version: 1, 2, 3… */
  savePlan(conversationId: string, plan: unknown): number
  latestPlan(conversationId: string): { version: number; plan: unknown } | undefined
  /** False, and nothing written, when the reference is already recorded. */
  recordProblem(problem: Problem): boolean
  /** F3 Decision 10: a round's run, saved after every move. A second save replaces the first. */
  saveRun(run: Run): void
  getRun(id: string): Run | undefined
  /** A conversation's runs, by round: the latest last. */
  listRuns(conversationId: string): Run[]
  latestRun(conversationId: string): Run | undefined
  /** Every run in one of these states (a restart marks them, Review Focus 3). */
  runsIn(statuses: RunStatus[]): Run[]
  /** F3 Decision 10: a question a round asked; its default is its answer until they give one. */
  addQuestion(question: Omit<AskedQuestion, 'answer' | 'answered'>): void
  /** Their answer. A secret's is null: it never reaches this store. */
  answerQuestion(id: string, answer: string | null): void
  getQuestion(id: string): AskedQuestion | undefined
  listQuestions(runId: string): AskedQuestion[]
  /**
   * F4 Task 10: each secret the person's conversations on the app asked for by name, with the
   * latest question we asked for it, sorted by name. Never an answer: a secret's is never here.
   */
  secretsAskedOn(projectId: string, personId: string): { name: string; ask: string }[]
  /** What happened in a run, never what was said. Anything shaped like a credential is refused. */
  recordTrace(runId: string, entry: unknown): void
  listTrace(runId: string): { at: string; entry: unknown }[]
  close(): void
}
