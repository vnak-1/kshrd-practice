import { describe, expect, it } from 'vitest'
import { makeQuestion, makePool } from '../test/fixtures'
import {
  buildSession,
  correctIndex,
  formatClock,
  isAnswerCorrect,
  isOutOfTime,
  orderFor,
  remainingMs,
  scoreSession,
} from './session'
import type { SessionState } from './storage'

const MIXED = { kind: 'mixed' } as const

describe('buildSession', () => {
  it('never asks for more questions than the pool holds', () => {
    const s = buildSession({ mode: 'learn', source: MIXED, pool: makePool(3), size: 10 })
    expect(s.ids).toHaveLength(3)
  })

  it('takes exactly the size asked for when the pool is big enough', () => {
    const s = buildSession({ mode: 'learn', source: MIXED, pool: makePool(20), size: 10 })
    expect(s.ids).toHaveLength(10)
  })

  it('never repeats a question inside one set', () => {
    const s = buildSession({ mode: 'learn', source: MIXED, pool: makePool(20), size: 10 })
    expect(new Set(s.ids).size).toBe(s.ids.length)
  })

  it('puts the least seen questions first', () => {
    // q1 has been seen a lot, so a set of 2 must leave it out.
    const seen = { q1: { seen: 9 }, q2: { seen: 0 }, q3: { seen: 0 } }
    const s = buildSession({ mode: 'learn', source: MIXED, pool: makePool(3), size: 2, seen })
    expect(s.ids).not.toContain('q1')
  })

  it('orders purely by times seen, whatever the seed', () => {
    const seen = { q1: { seen: 3 }, q2: { seen: 1 }, q3: { seen: 2 } }
    for (const seed of [1, 2, 3, 100, 54321]) {
      const s = buildSession({ mode: 'learn', source: MIXED, pool: makePool(3), size: 3, seed, seen })
      expect(s.ids).toEqual(['q2', 'q3', 'q1'])
    }
  })

  it('gives a timed set a limit and a learn set none', () => {
    const timed = buildSession({
      mode: 'timed',
      source: MIXED,
      pool: makePool(5),
      size: 5,
      minutes: 5,
    })
    const learn = buildSession({ mode: 'learn', source: MIXED, pool: makePool(5), size: 5 })
    expect(timed.limitMs).toBe(300_000)
    expect(learn.limitMs).toBeNull()
  })

  it('starts with nothing picked and nothing checked', () => {
    const s = buildSession({ mode: 'learn', source: MIXED, pool: makePool(4), size: 4 })
    expect(s.picked).toEqual([null, null, null, null])
    expect(s.checked).toEqual([false, false, false, false])
    expect(s.index).toBe(0)
    expect(s.finished).toBe(false)
  })
})

describe('orderFor', () => {
  const question = makeQuestion('q1')
  const session = buildSession({
    mode: 'learn',
    source: MIXED,
    pool: [question],
    size: 1,
    seed: 777,
  })

  it('still contains the right answer after the shuffle', () => {
    const order = orderFor(session, 0, question)
    const right = correctIndex(question)
    expect(order).toContain(right)
    expect(question.options[right].correct).toBe(true)
  })

  it('shows every option exactly once', () => {
    const order = orderFor(session, 0, question)
    expect(order.slice().sort()).toEqual([0, 1, 2, 3])
  })

  it('gives the same order again, so closing and reopening keeps the layout', () => {
    expect(orderFor(session, 0, question)).toEqual(orderFor(session, 0, question))
  })

  it('shuffles each question in the set differently', () => {
    const orders = [0, 1, 2, 3, 4].map((i) => orderFor(session, i, question).join(''))
    expect(new Set(orders).size).toBeGreaterThan(1)
  })
})

describe('isAnswerCorrect', () => {
  const question = makeQuestion('q1')

  it('is true for the correct option', () => {
    expect(isAnswerCorrect(question, 0)).toBe(true)
  })

  it('is false for a wrong option', () => {
    expect(isAnswerCorrect(question, 2)).toBe(false)
  })

  it('is false when nothing was picked', () => {
    expect(isAnswerCorrect(question, null)).toBe(false)
  })
})

describe('scoreSession', () => {
  const pool = makePool(4)
  const base = buildSession({ mode: 'learn', source: MIXED, pool, size: 4, seed: 5 })
  const questions = base.ids.map((id) => pool.find((q) => q.id === id))

  it('counts right answers', () => {
    const session = { ...base, picked: [0, 0, 1, 1] }
    const score = scoreSession(session, questions)
    expect(score).toEqual({ total: 4, answered: 4, correct: 2, percent: 50 })
  })

  it('counts a blank answer as not answered but still in the total', () => {
    const session = { ...base, picked: [0, null, null, null] }
    const score = scoreSession(session, questions)
    expect(score.answered).toBe(1)
    expect(score.correct).toBe(1)
    expect(score.total).toBe(4)
    // The percent is out of every question, not out of the answered ones.
    expect(score.percent).toBe(25)
  })

  it('does not divide by zero on an empty set', () => {
    const session = { ...base, ids: [], picked: [] }
    expect(scoreSession(session, []).percent).toBe(0)
  })

  it('skips a question that is no longer in the app', () => {
    const session = { ...base, picked: [0, 0, 0, 0] }
    const score = scoreSession(session, [questions[0], undefined, undefined, undefined])
    expect(score.answered).toBe(1)
    expect(score.correct).toBe(1)
  })
})

describe('the timer, worked out from the saved start time', () => {
  // iOS freezes JavaScript in the background, so the clock must never count
  // ticks. These tests pass a fake "now" instead of waiting.
  const START = 1_700_000_000_000
  const timed: SessionState = {
    ...buildSession({ mode: 'timed', source: MIXED, pool: makePool(5), size: 5, minutes: 10 }),
    startedAt: START,
  }

  it('has the full time at the start', () => {
    expect(remainingMs(timed, START)).toBe(600_000)
  })

  it('loses the time the app spent in the background', () => {
    expect(remainingMs(timed, START + 240_000)).toBe(360_000)
  })

  it('never goes below zero', () => {
    expect(remainingMs(timed, START + 99_999_999)).toBe(0)
  })

  it('says time is up after the limit', () => {
    expect(isOutOfTime(timed, START + 599_999)).toBe(false)
    expect(isOutOfTime(timed, START + 600_000)).toBe(true)
    expect(isOutOfTime(timed, START + 3_600_000)).toBe(true)
  })

  it('a learn set is never out of time', () => {
    const learn = buildSession({ mode: 'learn', source: MIXED, pool: makePool(5), size: 5 })
    expect(remainingMs(learn, Date.now() + 99_999_999)).toBeNull()
    expect(isOutOfTime(learn, Date.now() + 99_999_999)).toBe(false)
  })
})

describe('formatClock', () => {
  it('pads the seconds', () => {
    expect(formatClock(61_000)).toBe('1:01')
  })

  it('shows zero at the end', () => {
    expect(formatClock(0)).toBe('0:00')
  })

  it('never shows a negative clock', () => {
    expect(formatClock(-5000)).toBe('0:00')
  })

  it('handles more than ten minutes', () => {
    expect(formatClock(630_000)).toBe('10:30')
  })
})
