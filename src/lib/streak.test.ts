import { describe, expect, it } from 'vitest'
import { practisedToday, streakLength } from './streak'

describe('streakLength', () => {
  it('is zero when nothing has been practised', () => {
    expect(streakLength([], '2026-11-13')).toBe(0)
  })

  it('counts a single day practised today', () => {
    expect(streakLength(['2026-11-13'], '2026-11-13')).toBe(1)
  })

  it('counts a run that ends today', () => {
    const days = ['2026-11-11', '2026-11-12', '2026-11-13']
    expect(streakLength(days, '2026-11-13')).toBe(3)
  })

  it('still counts a run that ends yesterday, so midnight does not wipe it', () => {
    const days = ['2026-11-11', '2026-11-12']
    expect(streakLength(days, '2026-11-13')).toBe(2)
  })

  it('is zero after two days missed', () => {
    const days = ['2026-11-10', '2026-11-11']
    expect(streakLength(days, '2026-11-13')).toBe(0)
  })

  it('counts only the most recent run, not every day ever', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-12', '2026-11-13']
    expect(streakLength(days, '2026-11-13')).toBe(2)
  })

  it('crosses the end of a month', () => {
    const days = ['2026-10-30', '2026-10-31', '2026-11-01']
    expect(streakLength(days, '2026-11-01')).toBe(3)
  })

  it('crosses the end of a year', () => {
    const days = ['2026-12-31', '2027-01-01']
    expect(streakLength(days, '2027-01-01')).toBe(2)
  })

  it('handles a leap day', () => {
    const days = ['2028-02-28', '2028-02-29', '2028-03-01']
    expect(streakLength(days, '2028-03-01')).toBe(3)
  })

  it('does not mind an unsorted list', () => {
    const days = ['2026-11-13', '2026-11-11', '2026-11-12']
    expect(streakLength(days, '2026-11-13')).toBe(3)
  })

  it('does not mind the same day stored twice', () => {
    const days = ['2026-11-12', '2026-11-12', '2026-11-13']
    expect(streakLength(days, '2026-11-13')).toBe(2)
  })
})

describe('practisedToday', () => {
  it('is true only when today is in the list', () => {
    expect(practisedToday(['2026-11-13'], '2026-11-13')).toBe(true)
    expect(practisedToday(['2026-11-12'], '2026-11-13')).toBe(false)
    expect(practisedToday([], '2026-11-13')).toBe(false)
  })
})
