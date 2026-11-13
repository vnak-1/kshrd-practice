import { useSyncExternalStore } from 'react'
import type { AppState } from './storage'
import { clearState, emptyState, loadState, saveState } from './storage'

// One small store for the whole app. No library needed.

let current: AppState = loadState()
let saveFailed = false
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function getState(): AppState {
  return current
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function update(change: (state: AppState) => AppState): void {
  const next = change(current)
  if (next === current) return
  current = next
  if (!saveState(next)) saveFailed = true
  notify()
}

export function replaceState(next: AppState): void {
  current = next
  if (!saveState(next)) saveFailed = true
  notify()
}

export function resetAll(): void {
  clearState()
  current = emptyState()
  notify()
}

/** True when the phone refused to save (private mode, or storage full). */
export function hasSaveProblem(): boolean {
  return saveFailed
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState)
}
