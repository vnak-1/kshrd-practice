// Days left until the written test. The exam is in Cambodia (UTC+7), so the
// count must use that time zone, not the phone's.

export const EXAM_DATE = '2026-12-19' // Saturday
export const EXAM_TZ = 'Asia/Phnom_Penh'
export const PLAN_START = '2026-11-13'

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: EXAM_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Today in Phnom Penh, as "YYYY-MM-DD". */
export function today(now: Date = new Date()): string {
  return dayFormat.format(now)
}

/** Turns "YYYY-MM-DD" into a number of days, so two days can be subtracted. */
export function dayNumber(isoDay: string): number {
  const [y, m, d] = isoDay.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function addDays(isoDay: string, days: number): string {
  const ms = (dayNumber(isoDay) + days) * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
}

/** 0 means the exam is today. A negative number means it has passed. */
export function daysUntilExam(now: Date = new Date()): number {
  return dayNumber(EXAM_DATE) - dayNumber(today(now))
}

export function daysBetween(fromDay: string, toDay: string): number {
  return dayNumber(toDay) - dayNumber(fromDay)
}
