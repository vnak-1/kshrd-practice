// Shapes of the data. The question files in src/content/questions/*.json must
// match `Question`. `npm run validate` checks every file against these rules.

export const SECTIONS = ['aptitude', 'technical', 'english'] as const
export type Section = (typeof SECTIONS)[number]

export const TOPICS = [
  'logic',
  'numerical',
  'analytical',
  'java',
  'html',
  'css',
  'javascript',
  'react',
  'nextjs',
  'sql',
  'networking',
  'ai',
  'grammar',
] as const
export type Topic = (typeof TOPICS)[number]

/** concept = knowledge, syntax = "is this line valid", output = "what prints". */
export const KINDS = ['concept', 'syntax', 'output'] as const
export type Kind = (typeof KINDS)[number]

export const RUNNERS = ['java', 'node', 'sqlite', 'python', 'review'] as const
export type Runner = (typeof RUNNERS)[number]

export interface QuestionOption {
  text: string
  correct: boolean
  /** Why this option is right, or why it is wrong. Shown after answering. */
  why: string
  /** Exact program output, when it differs from the short `text` shown. */
  match?: string
}

export interface QuestionCode {
  lang: string
  source: string
}

export interface QuestionVerify {
  runner: Runner
  /** Full runnable program for the `java` / `node` / `python` runners. */
  program?: string
  /** Python expression, when no `program`. Must print the correct text. */
  check?: string
  /**
   * 'stdout' (default), 'exception:<ClassName>', or
   * 'compile_error:<part of the javac message>'. The javac message is
   * required, so the code must fail for the reason the question claims.
   */
  expect?: string
  /** Only for runner 'review': set by a second reviewer, never by the writer. */
  reviewed?: boolean
  /**
   * Fill-the-blank. Put `{{BLANK}}` in `program` and `____` in the code on
   * screen. Verify drops every option into the blank and runs it: the right
   * one must print `output`, and no wrong one may.
   */
  output?: string
  /** SQL setup for the `sqlite` runner, on top of the shared seed. */
  setup?: string
  /** The query to run for the `sqlite` runner. */
  query?: string
}

export interface Question {
  id: string
  section: Section
  topic: Topic
  subtopic: string
  difficulty: 1 | 2 | 3
  kind: Kind
  prompt: string
  code?: QuestionCode
  options: QuestionOption[]
  hint?: string
  /** true = never shuffle the options (e.g. "A and B" style answers). */
  fixedOrder?: boolean
  /** true = the options are code, so show them in the code font. */
  codeOptions?: boolean
  verify: QuestionVerify
}
