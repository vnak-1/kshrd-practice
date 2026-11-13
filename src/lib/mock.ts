import type { Question, Section } from '../types'
import { SECTIONS } from '../types'
import { shuffle } from './shuffle'

/**
 * Picking the questions for a full mock exam.
 *
 * WHAT IS KNOWN about the real paper, from KSHRD's own site:
 *   - it lasts three hours
 *   - it is one sitting with a single countdown, not timed per section
 *   - it is on paper, and the sections are Aptitude, Technical and
 *     English Writing
 *
 * WHAT IS NOT KNOWN, and nobody could find out:
 *   - how many questions there are
 *   - how the marks are split between the sections
 *   - whether a wrong answer loses marks
 *
 * So the length and the mix below are a sensible guess, not a copy of the
 * real paper, and the start screen says so. There is deliberately no
 * negative marking anywhere in this file.
 */

/** Three hours, the one length that is actually known to be right. */
export const MOCK_MINUTES = 180

/** Offered lengths. 80 is the default: long enough to feel like the real
 *  thing, short enough to finish in one sitting. */
export const MOCK_SIZES = [40, 60, 80] as const
export const DEFAULT_MOCK_SIZE = 80

/**
 * Share of the paper each section gets. A guess.
 *
 * Technical takes the most because it covers nine subjects (Java, HTML,
 * CSS, JavaScript, React, Next.js, SQL, networking, AI) against aptitude's
 * three. English gets a small share for grammar-style questions; the real
 * English section is an essay, which the mock handles separately.
 *
 * A section with no questions gives its share to the others, so the mix
 * stays sensible while topics are still being written.
 */
export const SECTION_WEIGHT: Record<Section, number> = {
  aptitude: 30,
  technical: 65,
  english: 5,
}

export interface SectionQuota {
  section: Section
  want: number
  available: number
}

/**
 * How many questions to take from each section.
 *
 * Shares are worked out from the weights above, then capped at what each
 * section actually holds. Anything left over is passed to the sections
 * with room, again and again until nothing more can be placed. That means
 * the total always equals `size`, unless the whole pool is smaller.
 */
export function quotasFor(pool: readonly Question[], size: number): SectionQuota[] {
  const have: Record<Section, number> = { aptitude: 0, technical: 0, english: 0 }
  for (const q of pool) have[q.section] += 1

  const want: Record<Section, number> = { aptitude: 0, technical: 0, english: 0 }
  const target = Math.max(0, Math.min(size, pool.length))

  // First pass: split by weight, ignoring sections that hold nothing.
  const live = SECTIONS.filter((s) => have[s] > 0)
  const totalWeight = live.reduce((sum, s) => sum + SECTION_WEIGHT[s], 0)
  if (totalWeight > 0) {
    for (const s of live) {
      want[s] = Math.min(have[s], Math.floor((target * SECTION_WEIGHT[s]) / totalWeight))
    }
  }

  // Later passes: hand out what is still unplaced, one at a time, to the
  // section with the most room. Looping one by one keeps it simple and is
  // cheap: `size` is at most a few hundred.
  let placed = SECTIONS.reduce((sum, s) => sum + want[s], 0)
  while (placed < target) {
    let best: Section | null = null
    let bestRoom = 0
    for (const s of SECTIONS) {
      const room = have[s] - want[s]
      if (room > bestRoom) {
        bestRoom = room
        best = s
      }
    }
    if (best === null) break // every section is full
    want[best] += 1
    placed += 1
  }

  return SECTIONS.map((section) => ({ section, want: want[section], available: have[section] }))
}

export interface DrawOptions {
  pool: readonly Question[]
  size: number
  rand: () => number
  /** How often each question has been seen, so unseen ones come first. */
  seen?: Readonly<Record<string, { seen: number }>>
}

/**
 * The questions for one mock, in the order they will be shown: the
 * aptitude block first, then technical, then English, the way a paper is
 * laid out. Inside a block the order is random.
 *
 * Within a section the draw spreads across topics in turn, so a section is
 * never all Java just because Java has the most questions written.
 */
export function drawMock(opts: DrawOptions): Question[] {
  const quotas = quotasFor(opts.pool, opts.size)
  const out: Question[] = []

  for (const quota of quotas) {
    if (quota.want === 0) continue
    const inSection = opts.pool.filter((q) => q.section === quota.section)
    out.push(...takeSpreadAcrossTopics(inSection, quota.want, opts.rand, opts.seen))
  }

  return out
}

/**
 * Takes `want` questions from one section, going round the topics one at a
 * time so every topic in the section is represented before any topic gives
 * a second question.
 */
function takeSpreadAcrossTopics(
  inSection: readonly Question[],
  want: number,
  rand: () => number,
  seen?: Readonly<Record<string, { seen: number }>>,
): Question[] {
  // Group by topic, each group shuffled, then least-seen first inside it.
  const byTopic = new Map<string, Question[]>()
  for (const q of shuffle([...inSection], rand)) {
    const list = byTopic.get(q.topic)
    if (list) list.push(q)
    else byTopic.set(q.topic, [q])
  }
  if (seen) {
    for (const list of byTopic.values()) {
      list.sort((a, b) => (seen[a.id]?.seen ?? 0) - (seen[b.id]?.seen ?? 0))
    }
  }

  // Deal them out like cards: one per topic, round and round.
  const queues = shuffle([...byTopic.values()], rand)
  const picked: Question[] = []
  let dealt = true
  while (picked.length < want && dealt) {
    dealt = false
    for (const queue of queues) {
      if (picked.length >= want) break
      const q = queue.shift()
      if (q) {
        picked.push(q)
        dealt = true
      }
    }
  }

  // Shuffle again so the topics are not in a repeating cycle on screen.
  return shuffle(picked, rand)
}

export interface SectionScore {
  section: Section
  total: number
  correct: number
  percent: number
}

/**
 * The score broken down by section, for the results page after a mock.
 * Only sections that appeared in the paper are returned.
 *
 * `questions` and `picked` line up by position with the session's ids. A
 * question that has since been removed from the app is skipped.
 */
export function scoreBySection(
  questions: readonly (Question | undefined)[],
  picked: readonly (number | null)[],
): SectionScore[] {
  const tally = new Map<Section, { total: number; correct: number }>()
  questions.forEach((question, i) => {
    if (!question) return
    const row = tally.get(question.section) ?? { total: 0, correct: 0 }
    row.total += 1
    const pick = picked[i]
    if (pick !== null && pick !== undefined && question.options[pick]?.correct === true) {
      row.correct += 1
    }
    tally.set(question.section, row)
  })

  return SECTIONS.filter((s) => tally.has(s)).map((section) => {
    const row = tally.get(section) ?? { total: 0, correct: 0 }
    return {
      section,
      total: row.total,
      correct: row.correct,
      percent: row.total === 0 ? 0 : Math.round((row.correct / row.total) * 100),
    }
  })
}
