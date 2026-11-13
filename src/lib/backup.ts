import type { AppState } from './storage'
import { parseState } from './storage'

// Progress lives only on this phone. A backup is a plain JSON file the user
// saves to Files, iCloud or anywhere else.

export function backupFilename(day: string): string {
  return `kshrd-backup-${day}.json`
}

export function toBackupText(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function fromBackupText(text: string): AppState | null {
  try {
    const parsed = parseState(JSON.parse(text))
    // parseState always returns a state; treat a totally empty one as a bad file
    const looksReal = Object.keys(parsed.stats).length > 0 || parsed.flagged.length > 0
    return looksReal ? parsed : null
  } catch {
    return null
  }
}

export type SaveResult = 'shared' | 'downloaded' | 'failed'

/**
 * On iPhone this opens the share sheet, where "Save to Files" works.
 * Everywhere else it falls back to a normal download.
 * Must be called straight from a tap, or iOS blocks it.
 */
export async function saveBackupFile(text: string, filename: string): Promise<SaveResult> {
  const file = makeFile(text, filename)
  try {
    if (file && navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: 'KSHRD Practice backup' })
      return 'shared'
    }
  } catch (err) {
    // The user tapping Cancel also lands here. Fall through to a download.
    if (err instanceof DOMException && err.name === 'AbortError') return 'failed'
  }
  return downloadText(text, filename) ? 'downloaded' : 'failed'
}

function makeFile(text: string, filename: string): File | null {
  try {
    return new File([text], filename, { type: 'application/json' })
  } catch {
    return null
  }
}

function downloadText(text: string, filename: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return true
  } catch {
    return false
  }
}
