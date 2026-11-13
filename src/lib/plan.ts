import type { Topic } from '../types'
import { dayNumber } from './countdown'

/**
 * The study plan, week by week.
 *
 * It is the plan already agreed for this exam, written down so the home
 * screen can say what to work on today instead of leaving you to decide.
 * Dates are the first and last day of each week, in Phnom Penh time, and
 * they are inclusive at both ends.
 *
 * `topics` are the app's own topic ids, so the card can link straight to
 * a practice set. A week whose subject has no questions yet simply shows
 * no button; the text still tells you what to study.
 */
export interface PlanWeek {
  /** Shown as "Week 3". The last stretch is called "Final week" instead. */
  label: string
  from: string
  to: string
  /** What this week is about, in a few words. */
  focus: string
  /** Practice topics to offer, best first. */
  topics: Topic[]
}

export const PLAN: PlanWeek[] = [
  {
    label: 'Week 1',
    from: '2026-11-10',
    to: '2026-11-16',
    focus: 'Java basics and the start of OOP',
    topics: ['java'],
  },
  {
    label: 'Week 2',
    from: '2026-11-17',
    to: '2026-11-23',
    focus: 'Java inheritance, exceptions and collections, plus SQL',
    topics: ['java', 'sql'],
  },
  {
    label: 'Week 3',
    from: '2026-11-24',
    to: '2026-11-30',
    focus: 'Networking, then an HTML and CSS review',
    topics: ['networking', 'html', 'css'],
  },
  {
    label: 'Week 4',
    from: '2026-12-01',
    to: '2026-12-07',
    focus: 'JavaScript, the event loop above all, then React',
    topics: ['javascript', 'react'],
  },
  {
    label: 'Week 5',
    from: '2026-12-08',
    to: '2026-12-14',
    focus: 'Next.js rendering, AI basics, and your weak spots',
    topics: ['nextjs', 'ai'],
  },
  {
    label: 'Final week',
    from: '2026-12-15',
    to: '2026-12-19',
    focus: 'Timed mock exams. Light review only the day before',
    topics: [],
  },
]

/** The week today falls in, or null before the plan starts or after it ends. */
export function weekFor(day: string): PlanWeek | null {
  const n = dayNumber(day)
  return PLAN.find((w) => n >= dayNumber(w.from) && n <= dayNumber(w.to)) ?? null
}

/** "24–30 Nov", for the card's subtitle. */
export function weekRangeLabel(week: PlanWeek): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC' }
  const from = new Date(`${week.from}T00:00:00Z`).toLocaleDateString('en-GB', opts)
  const to = new Date(`${week.to}T00:00:00Z`).toLocaleDateString('en-GB', opts)
  return `${from} – ${to}`
}
