import type { AppState, QuestionStat } from './storage'
import { emptyStat } from './storage'

/** A question must be answered correctly on 2 DIFFERENT days to leave the
 *  mistakes list. Answering it twice in one minute proves nothing. */
export const CORRECT_DAYS_TO_CLEAR = 2

export function recordAnswer(
  state: AppState,
  questionId: string,
  wasCorrect: boolean,
  day: string,
): AppState {
  const before: QuestionStat = state.stats[questionId] ?? emptyStat(day)
  const after: QuestionStat = {
    ...before,
    seen: before.seen + 1,
    correct: before.correct + (wasCorrect ? 1 : 0),
    wrong: before.wrong + (wasCorrect ? 0 : 1),
    lastDay: day,
    correctDays: before.correctDays.slice(),
    inMistakes: before.inMistakes,
  }

  if (!wasCorrect) {
    after.inMistakes = true
    after.correctDays = []
  } else if (after.inMistakes) {
    if (!after.correctDays.includes(day)) after.correctDays.push(day)
    if (after.correctDays.length >= CORRECT_DAYS_TO_CLEAR) {
      after.inMistakes = false
      after.correctDays = []
    }
  }

  const daysPractised = state.daysPractised.includes(day)
    ? state.daysPractised
    : [...state.daysPractised, day].sort()

  return { ...state, stats: { ...state.stats, [questionId]: after }, daysPractised }
}

export function mistakeIds(state: AppState): string[] {
  return Object.keys(state.stats).filter((id) => state.stats[id].inMistakes)
}

export function toggleFlag(state: AppState, questionId: string): AppState {
  const flagged = state.flagged.includes(questionId)
    ? state.flagged.filter((id) => id !== questionId)
    : [...state.flagged, questionId]
  return { ...state, flagged }
}

export interface TopicProgress {
  answered: number
  correct: number
  accuracy: number
}

export function progressFor(state: AppState, ids: readonly string[]): TopicProgress {
  let answered = 0
  let correct = 0
  for (const id of ids) {
    const stat = state.stats[id]
    if (!stat || stat.seen === 0) continue
    answered += 1
    // "correct" here means: the last run of answers is clean, i.e. not a mistake
    if (!stat.inMistakes) correct += 1
  }
  return { answered, correct, accuracy: answered === 0 ? 0 : correct / answered }
}

/** How many days in a row, ending today, had at least one answer. */
export function streak(state: AppState, todayDay: string, dayNumber: (d: string) => number): number {
  const days = new Set(state.daysPractised)
  let count = 0
  let cursor = dayNumber(todayDay)
  // Today not practised yet should not break yesterday's streak.
  if (!days.has(todayDay)) cursor -= 1
  while (days.has(isoFromNumber(cursor))) {
    count += 1
    cursor -= 1
  }
  return count
}

function isoFromNumber(dayNum: number): string {
  return new Date(dayNum * 86_400_000).toISOString().slice(0, 10)
}
