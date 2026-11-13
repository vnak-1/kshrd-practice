import type { Question } from '../types'
import type { SessionMode, SessionSource, SessionState } from './storage'
import { makeRandom, newSeed, optionOrder, shuffle } from './shuffle'

export const DEFAULT_SET_SIZE = 10

export interface BuildOptions {
  mode: SessionMode
  source: SessionSource
  pool: Question[]
  size: number
  /** Minutes allowed, for timed mode. */
  minutes?: number
  seed?: number
  now?: number
  /**
   * How many times each question has been seen. Questions you have seen
   * least come first, so a small pool is covered before anything repeats.
   */
  seen?: Readonly<Record<string, { seen: number }>>
}

export function buildSession(opts: BuildOptions): SessionState {
  const seed = opts.seed ?? newSeed()
  const rand = makeRandom(seed)
  const stats = opts.seen
  // Shuffle first, then put the least seen in front. Two questions seen the
  // same number of times keep their random order, so sets are not identical.
  const mixed = shuffle(opts.pool, rand)
  const ordered =
    stats === undefined
      ? mixed
      : mixed
          .map((q, i) => ({ q, i, seen: stats[q.id]?.seen ?? 0 }))
          .sort((a, b) => (a.seen === b.seen ? a.i - b.i : a.seen - b.seen))
          .map((row) => row.q)
  const picked = ordered.slice(0, Math.max(1, Math.min(opts.size, opts.pool.length)))
  return {
    mode: opts.mode,
    source: opts.source,
    ids: picked.map((q) => q.id),
    seed,
    index: 0,
    picked: picked.map(() => null),
    checked: picked.map(() => false),
    startedAt: opts.now ?? Date.now(),
    limitMs: opts.mode === 'timed' && opts.minutes ? opts.minutes * 60_000 : null,
    finished: false,
  }
}

/**
 * The order to show option buttons in, for question number `index`.
 * Worked out from the seed, so it is the same every time the app reopens.
 */
export function orderFor(session: SessionState, index: number, question: Question): number[] {
  const rand = makeRandom((session.seed + index * 0x9e3779b1) >>> 0)
  return optionOrder(question.options.length, rand, question.fixedOrder === true)
}

export function correctIndex(question: Question): number {
  return question.options.findIndex((o) => o.correct)
}

export function isAnswerCorrect(question: Question, originalIndex: number | null): boolean {
  return originalIndex !== null && question.options[originalIndex]?.correct === true
}

export interface SessionScore {
  total: number
  answered: number
  correct: number
  percent: number
}

export function scoreSession(
  session: SessionState,
  questions: readonly (Question | undefined)[],
): SessionScore {
  let correct = 0
  let answered = 0
  questions.forEach((q, i) => {
    const pick = session.picked[i]
    if (!q || pick === null || pick === undefined) return
    answered += 1
    if (isAnswerCorrect(q, pick)) correct += 1
  })
  const total = questions.length
  return { total, answered, correct, percent: total === 0 ? 0 : Math.round((correct / total) * 100) }
}

/** Milliseconds left in a timed session, or null when there is no limit. */
export function remainingMs(session: SessionState, now: number = Date.now()): number | null {
  if (session.limitMs === null) return null
  return Math.max(0, session.startedAt + session.limitMs - now)
}

export function isOutOfTime(session: SessionState, now: number = Date.now()): boolean {
  const left = remainingMs(session, now)
  return left !== null && left <= 0
}

/**
 * "4:05" for a short set, "2:59:04" once an hour or more is left.
 *
 * The hours only appear from 60 minutes up, so every shorter clock in the
 * app reads exactly as it did before. Without this a three-hour mock would
 * start at "180:00".
 */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor(total / 60) % 60
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  if (h === 0) return `${Math.floor(total / 60)}:${ss}`
  return `${h}:${String(m).padStart(2, '0')}:${ss}`
}
