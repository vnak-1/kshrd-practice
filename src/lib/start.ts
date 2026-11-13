import type { Question } from '../types'
import { ALL_QUESTIONS, lookup, questionsForTopic } from './content'
import { mistakeIds } from './progress'
import { DEFAULT_MOCK_SIZE, MOCK_MINUTES, drawMock } from './mock'
import { buildSession } from './session'
import { makeRandom, newSeed } from './shuffle'
import type { AppState, SessionMode, SessionSource } from './storage'
import { update } from './store'

/** The questions a set of this kind can draw from. */
export function poolFor(source: SessionSource, state: AppState): Question[] {
  if (source.kind === 'topic') return questionsForTopic(source.topic)
  if (source.kind === 'mistakes') return lookup(mistakeIds(state))
  // 'mixed' and 'mock' both draw from everything. A mock then picks by
  // section inside startMock, rather than taking a flat random sample.
  return ALL_QUESTIONS
}

/**
 * Puts a new set in the saved state. The caller then goes to /session.
 * Does nothing when there are no questions to draw from.
 */
/**
 * Puts a full mock exam in the saved state.
 *
 * Unlike a normal set this draws by section, so the paper is laid out
 * aptitude first, then technical, then English, with each section spread
 * across its topics. Always three hours, always timed, so the answers only
 * appear at the end.
 */
export function startMock(size: number = DEFAULT_MOCK_SIZE): void {
  update((s) => {
    if (ALL_QUESTIONS.length === 0) return s
    const seed = newSeed()
    const picked = drawMock({
      pool: ALL_QUESTIONS,
      size,
      rand: makeRandom(seed),
      seen: s.stats,
    })
    if (picked.length === 0) return s
    return {
      ...s,
      session: {
        mode: 'timed',
        source: { kind: 'mock' },
        ids: picked.map((q) => q.id),
        seed,
        index: 0,
        picked: picked.map(() => null),
        checked: picked.map(() => false),
        startedAt: Date.now(),
        limitMs: MOCK_MINUTES * 60_000,
        finished: false,
      },
    }
  })
}

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
