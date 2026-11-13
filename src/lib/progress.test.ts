import { describe, expect, it } from 'vitest'
import { dayNumber } from './countdown'
import { mistakeIds, progressFor, recordAnswer, streak, toggleFlag } from './progress'
import { emptyState } from './storage'

describe('recordAnswer and the mistakes list', () => {
  it('puts a wrong answer in the mistakes list', () => {
    const s = recordAnswer(emptyState(), 'q1', false, '2026-11-13')
    expect(mistakeIds(s)).toEqual(['q1'])
    expect(s.stats.q1.wrong).toBe(1)
    expect(s.stats.q1.seen).toBe(1)
  })

  it('leaves a first-time right answer out of the mistakes list', () => {
    const s = recordAnswer(emptyState(), 'q1', true, '2026-11-13')
    expect(mistakeIds(s)).toEqual([])
    expect(s.stats.q1.correct).toBe(1)
  })

  it('does NOT clear a mistake from two right answers on the same day', () => {
    let s = recordAnswer(emptyState(), 'q1', false, '2026-11-13')
    s = recordAnswer(s, 'q1', true, '2026-11-14')
    s = recordAnswer(s, 'q1', true, '2026-11-14')
    // Same day twice proves nothing, so the question stays on the list.
    expect(mistakeIds(s)).toEqual(['q1'])
  })

  it('clears a mistake after right answers on two different days', () => {
    let s = recordAnswer(emptyState(), 'q1', false, '2026-11-13')
    s = recordAnswer(s, 'q1', true, '2026-11-14')
    expect(mistakeIds(s)).toEqual(['q1'])
    s = recordAnswer(s, 'q1', true, '2026-11-15')
    expect(mistakeIds(s)).toEqual([])
  })

  it('puts a cleared question back on the list after a new wrong answer', () => {
    let s = recordAnswer(emptyState(), 'q1', false, '2026-11-13')
    s = recordAnswer(s, 'q1', true, '2026-11-14')
    s = recordAnswer(s, 'q1', true, '2026-11-15')
    s = recordAnswer(s, 'q1', false, '2026-11-16')
    expect(mistakeIds(s)).toEqual(['q1'])
  })

  it('a wrong answer wipes the good days you had built up', () => {
    let s = recordAnswer(emptyState(), 'q1', false, '2026-11-13')
    s = recordAnswer(s, 'q1', true, '2026-11-14')
    s = recordAnswer(s, 'q1', false, '2026-11-15')
    // One good day was lost, so one more right day is not enough.
    s = recordAnswer(s, 'q1', true, '2026-11-16')
    expect(mistakeIds(s)).toEqual(['q1'])
    s = recordAnswer(s, 'q1', true, '2026-11-17')
    expect(mistakeIds(s)).toEqual([])
  })

  it('does not change the state you pass in', () => {
    const before = emptyState()
    recordAnswer(before, 'q1', false, '2026-11-13')
    expect(before.stats).toEqual({})
  })

  it('records the day you practised, once per day', () => {
    let s = recordAnswer(emptyState(), 'q1', true, '2026-11-13')
    s = recordAnswer(s, 'q2', true, '2026-11-13')
    s = recordAnswer(s, 'q3', true, '2026-11-14')
    expect(s.daysPractised).toEqual(['2026-11-13', '2026-11-14'])
  })
})

describe('toggleFlag', () => {
  it('adds a flag, then takes it away', () => {
    let s = toggleFlag(emptyState(), 'q1')
    expect(s.flagged).toEqual(['q1'])
    s = toggleFlag(s, 'q1')
    expect(s.flagged).toEqual([])
  })
})

describe('progressFor', () => {
  it('counts only questions you have seen', () => {
    let s = recordAnswer(emptyState(), 'q1', true, '2026-11-13')
    s = recordAnswer(s, 'q2', false, '2026-11-13')
    const p = progressFor(s, ['q1', 'q2', 'q3'])
    expect(p.answered).toBe(2)
    expect(p.correct).toBe(1)
    expect(p.accuracy).toBe(0.5)
  })

  it('is zero, not a crash, when nothing has been answered', () => {
    expect(progressFor(emptyState(), ['q1'])).toEqual({
      answered: 0,
      correct: 0,
      accuracy: 0,
    })
  })
})

describe('streak', () => {
  it('counts days in a row up to today', () => {
    const s = { ...emptyState(), daysPractised: ['2026-11-11', '2026-11-12', '2026-11-13'] }
    expect(streak(s, '2026-11-13', dayNumber)).toBe(3)
  })

  it('keeps yesterday alive when today has not started yet', () => {
    const s = { ...emptyState(), daysPractised: ['2026-11-11', '2026-11-12'] }
    expect(streak(s, '2026-11-13', dayNumber)).toBe(2)
  })

  it('breaks on a missed day', () => {
    const s = { ...emptyState(), daysPractised: ['2026-11-10', '2026-11-13'] }
    expect(streak(s, '2026-11-13', dayNumber)).toBe(1)
  })

  it('is zero when you have never practised', () => {
    expect(streak(emptyState(), '2026-11-13', dayNumber)).toBe(0)
  })

  it('is zero after a gap of two days', () => {
    const s = { ...emptyState(), daysPractised: ['2026-11-09', '2026-11-10'] }
    expect(streak(s, '2026-11-13', dayNumber)).toBe(0)
  })
})
