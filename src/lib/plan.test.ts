import { describe, expect, it } from 'vitest'
import { TOPICS } from '../types'
import { EXAM_DATE } from './countdown'
import { PLAN, weekFor, weekRangeLabel } from './plan'

describe('the study plan', () => {
  it('names only real topics', () => {
    for (const week of PLAN) {
      for (const topic of week.topics) {
        expect(TOPICS).toContain(topic)
      }
    }
  })

  it('runs in order with no gap and no overlap', () => {
    for (let i = 1; i < PLAN.length; i += 1) {
      const previousEnd = new Date(`${PLAN[i - 1].to}T00:00:00Z`).getTime()
      const thisStart = new Date(`${PLAN[i].from}T00:00:00Z`).getTime()
      expect(thisStart - previousEnd).toBe(24 * 60 * 60 * 1000)
    }
  })

  it('ends on exam day', () => {
    expect(PLAN[PLAN.length - 1].to).toBe(EXAM_DATE)
  })

  it('finds the week a day falls in', () => {
    expect(weekFor('2026-11-13')?.label).toBe('Week 1')
    expect(weekFor('2026-11-24')?.label).toBe('Week 3')
    expect(weekFor('2026-11-30')?.label).toBe('Week 3')
    expect(weekFor('2026-12-01')?.label).toBe('Week 4')
    expect(weekFor(EXAM_DATE)?.label).toBe('Final week')
  })

  it('returns nothing outside the plan', () => {
    expect(weekFor('2026-11-09')).toBeNull()
    expect(weekFor('2026-12-20')).toBeNull()
  })

  it('writes a readable date range', () => {
    expect(weekRangeLabel(PLAN[2])).toBe('24 Nov – 30 Nov')
  })
})
