import type { Topic } from '../types'

// Everything is kept on the phone only. There is no server and no account.
// The key carries a version so a later change can migrate old saves.
export const STORAGE_KEY = 'kshrd-practice:v1'

export type SessionMode = 'learn' | 'timed'

export type SessionSource =
  | { kind: 'topic'; topic: Topic }
  | { kind: 'mixed' }
  | { kind: 'mistakes' }

export interface SessionState {
  mode: SessionMode
  source: SessionSource
  /** Question ids, already in the order they will be shown. */
  ids: string[]
  /** Seed for the option shuffle, so reopening the app keeps the same order. */
  seed: number
  index: number
  /** Chosen option, as a position in the question's original options array. */
  picked: (number | null)[]
  checked: boolean[]
  /** Wall-clock start. Timers are worked out from this, never counted by tick,
   *  because iOS stops JavaScript while the app is in the background. */
  startedAt: number
  limitMs: number | null
  finished: boolean
}

export interface QuestionStat {
  seen: number
  correct: number
  wrong: number
  /** true while the question is in the mistakes list. */
  inMistakes: boolean
  /** Distinct days answered correctly since the last wrong answer. */
  correctDays: string[]
  lastDay: string
}

export interface AppState {
  version: 1
  stats: Record<string, QuestionStat>
  flagged: string[]
  session: SessionState | null
  lastBackupAt: number | null
  /** Days (YYYY-MM-DD) on which at least one question was answered. */
  daysPractised: string[]
}

export function emptyState(): AppState {
  return {
    version: 1,
    stats: {},
    flagged: [],
    session: null,
    lastBackupAt: null,
    daysPractised: [],
  }
}

export function emptyStat(day: string): QuestionStat {
  return { seen: 0, correct: 0, wrong: 0, inMistakes: false, correctDays: [], lastDay: day }
}

/** Accepts anything and returns a safe state. Bad or old data is dropped. */
export function parseState(raw: unknown): AppState {
  const base = emptyState()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<AppState>
  if (r.version !== 1) return base

  const stats: Record<string, QuestionStat> = {}
  if (r.stats && typeof r.stats === 'object') {
    for (const [id, value] of Object.entries(r.stats)) {
      if (!value || typeof value !== 'object') continue
      const v = value as Partial<QuestionStat>
      stats[id] = {
        seen: num(v.seen),
        correct: num(v.correct),
        wrong: num(v.wrong),
        inMistakes: v.inMistakes === true,
        correctDays: Array.isArray(v.correctDays) ? v.correctDays.filter(isDay) : [],
        lastDay: isDay(v.lastDay) ? v.lastDay : '',
      }
    }
  }

  return {
    version: 1,
    stats,
    flagged: Array.isArray(r.flagged) ? r.flagged.filter((x) => typeof x === 'string') : [],
    session: isSession(r.session) ? r.session : null,
    lastBackupAt: typeof r.lastBackupAt === 'number' ? r.lastBackupAt : null,
    daysPractised: Array.isArray(r.daysPractised) ? r.daysPractised.filter(isDay) : [],
  }
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

function isDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isSession(value: unknown): value is SessionState {
  if (!value || typeof value !== 'object') return false
  const s = value as Partial<SessionState>
  return (
    Array.isArray(s.ids) &&
    s.ids.every((id) => typeof id === 'string') &&
    Array.isArray(s.picked) &&
    Array.isArray(s.checked) &&
    typeof s.index === 'number' &&
    typeof s.seed === 'number' &&
    typeof s.startedAt === 'number' &&
    (s.mode === 'learn' || s.mode === 'timed') &&
    // Without these the app loads, then crashes on the next screen. `source`
    // is the worst: the results page reads source.kind on every launch.
    isSource(s.source) &&
    (s.limitMs === null || typeof s.limitMs === 'number') &&
    typeof s.finished === 'boolean'
  )
}

function isSource(value: unknown): value is SessionState['source'] {
  if (!value || typeof value !== 'object') return false
  const s = value as { kind?: unknown; topic?: unknown }
  if (s.kind === 'mixed' || s.kind === 'mistakes') return true
  return s.kind === 'topic' && typeof s.topic === 'string'
}

// --- talking to localStorage ------------------------------------------------
// Safari can throw on these (private mode, storage full), so every call is
// wrapped. The app still works, it just forgets progress.

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    return parseState(JSON.parse(raw))
  } catch {
    return emptyState()
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing we can do, and nothing that should break the app
  }
}

/**
 * Asks the browser not to throw the data away when space runs low.
 * Safe to call on every start; iOS may say no, which is fine.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
