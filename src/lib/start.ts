import type { Question } from '../types'
import { ALL_QUESTIONS, lookup, questionsForTopic } from './content'
import { mistakeIds } from './progress'
import { buildSession } from './session'
import type { AppState, SessionMode, SessionSource } from './storage'
import { update } from './store'

/** The questions a set of this kind can draw from. */
export function poolFor(source: SessionSource, state: AppState): Question[] {
  if (source.kind === 'topic') return questionsForTopic(source.topic)
  if (source.kind === 'mistakes') return lookup(mistakeIds(state))
  return ALL_QUESTIONS
}

/**
 * Puts a new set in the saved state. The caller then goes to /session.
 * Does nothing when there are no questions to draw from.
 */
export function startSet(opts: {
  source: SessionSource
  mode: SessionMode
  size: number
  minutes?: number
}): void {
  update((s) => {
    const pool = poolFor(opts.source, s)
    if (pool.length === 0) return s
    return {
      ...s,
      session: buildSession({
        mode: opts.mode,
        source: opts.source,
        pool,
        size: opts.size,
        minutes: opts.minutes,
        seen: s.stats,
      }),
    }
  })
}
