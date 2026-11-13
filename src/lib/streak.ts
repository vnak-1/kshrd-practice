/**
 * How many days in a row you have practised.
 *
 * The run must reach today or yesterday. Yesterday counts so the number
 * does not drop to zero at midnight, before you have had a chance to
 * practise. Miss two days and it is gone.
 *
 * Days are "YYYY-MM-DD" strings in the phone's own time zone, the same
 * form the rest of the app stores.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** One day earlier, as "YYYY-MM-DD". Safe across months and leap years. */
function dayBefore(day: string): string {
  const at = new Date(`${day}T00:00:00Z`)
  return new Date(at.getTime() - DAY_MS).toISOString().slice(0, 10)
}

export function streakLength(daysPractised: readonly string[], today: string): number {
  if (daysPractised.length === 0) return 0
  const have = new Set(daysPractised)

  // Start at today if it is there, else yesterday, else the run is broken.
  let cursor = today
  if (!have.has(cursor)) {
    cursor = dayBefore(today)
    if (!have.has(cursor)) return 0
  }

  let run = 0
  while (have.has(cursor)) {
    run += 1
    cursor = dayBefore(cursor)
  }
  return run
}

/** true once today itself is in the list, so the streak is safe tonight. */
export function practisedToday(daysPractised: readonly string[], today: string): boolean {
  return daysPractised.includes(today)
}
