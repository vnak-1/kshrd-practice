import { describe, expect, it } from 'vitest'
import { EXAM_DATE, addDays, dayNumber, daysBetween, daysUntilExam, today } from './countdown'

describe('today, in Phnom Penh time', () => {
  // Cambodia is UTC+7. The count must follow Cambodia, not the phone, or the
  // app says "1 day left" on the morning of the exam.
  it('is already tomorrow in Phnom Penh late in the UTC evening', () => {
    expect(today(new Date('2026-11-13T17:30:00Z'))).toBe('2026-11-14')
  })

  it('is still the same day just before that', () => {
    expect(today(new Date('2026-11-13T16:30:00Z'))).toBe('2026-11-13')
  })

  it('handles midnight UTC', () => {
    expect(today(new Date('2026-11-13T00:00:00Z'))).toBe('2026-11-13')
  })
})

describe('daysUntilExam', () => {
  it('is 0 once it is exam day in Phnom Penh', () => {
    // 17:30 UTC on 18 Dec is 00:30 on 19 Dec in Cambodia.
    expect(daysUntilExam(new Date('2026-12-18T17:30:00Z'))).toBe(0)
  })

  it('is 1 on the evening before, Cambodia time', () => {
    expect(daysUntilExam(new Date('2026-12-18T16:00:00Z'))).toBe(1)
  })

  it('is negative after the exam', () => {
    expect(daysUntilExam(new Date('2026-12-21T05:00:00Z'))).toBe(-2)
  })

  it('counts the whole run from the start of the plan', () => {
    expect(daysUntilExam(new Date('2026-11-13T03:00:00Z'))).toBe(36)
  })
})

describe('day maths', () => {
  it('turns a date into a number that can be subtracted', () => {
    expect(dayNumber('2026-11-14') - dayNumber('2026-11-13')).toBe(1)
  })

  it('crosses a month end', () => {
    expect(daysBetween('2026-11-30', '2026-12-01')).toBe(1)
  })

  it('crosses a year end', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
  })

  it('adds days', () => {
    expect(addDays('2026-11-28', 5)).toBe('2026-12-03')
  })

  it('takes days away', () => {
    expect(addDays('2026-12-03', -5)).toBe('2026-11-28')
  })
})

describe('the exam date itself', () => {
  it('is Saturday 19 December 2026', () => {
    expect(EXAM_DATE).toBe('2026-12-19')
    expect(new Date(`${EXAM_DATE}T00:00:00Z`).getUTCDay()).toBe(6) // 6 = Saturday
  })
})
