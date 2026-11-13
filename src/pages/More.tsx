import { useRef, useState } from 'react'
import { ALL_QUESTIONS, lookup } from '../lib/content'
import { backupFilename, fromBackupText, saveBackupFile, toBackupText } from '../lib/backup'
import { EXAM_DATE, daysUntilExam, today } from '../lib/countdown'
import { requestPersistentStorage } from '../lib/storage'
import { hasSaveProblem, replaceState, resetAll, update, useAppState } from '../lib/store'
import { TOPIC_META } from '../lib/topics'

type Note = { kind: 'ok' | 'bad'; text: string } | null

export function More() {
  const state = useAppState()
  const [note, setNote] = useState<Note>(null)
  const [paste, setPaste] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const answered = Object.values(state.stats).filter((s) => s.seen > 0).length
  const flagged = lookup(state.flagged)

  async function backup() {
    const result = await saveBackupFile(toBackupText(state), backupFilename(today()))
    if (result === 'failed') {
      setNote({ kind: 'bad', text: 'The backup did not save. Try again.' })
    } else {
      setNote({
        kind: 'ok',
        text: result === 'shared' ? 'Saved. Pick "Save to Files".' : 'Backup file downloaded.',
      })
      update((s) => ({ ...s, lastBackupAt: Date.now() }))
    }
  }

  function restore(text: string) {
    const parsed = fromBackupText(text)
    if (!parsed) {
      setNote({ kind: 'bad', text: 'That file is not a backup from this app.' })
      return
    }
    replaceState(parsed)
    setPaste('')
    setNote({ kind: 'ok', text: 'Progress restored.' })
  }

  async function pickFile(file: File | undefined) {
    if (!file) return
    try {
      restore(await file.text())
    } catch {
      setNote({ kind: 'bad', text: 'The file could not be read.' })
    }
  }

  async function keepOffline() {
    const ok = await requestPersistentStorage()
    setNote(
      ok
        ? { kind: 'ok', text: 'This phone will keep your progress.' }
        : { kind: 'bad', text: 'The browser said no. Keep a backup file instead.' },
    )
  }

  return (
    <div className="stack">
      <h1 className="title">More</h1>

      {hasSaveProblem() ? (
        <p className="notice warn">
          This browser is not saving progress. Private browsing does that. Open the app in a
          normal tab.
        </p>
      ) : null}

      {note ? (
        <p className={`notice${note.kind === 'bad' ? ' bad' : ' good'}`} role="status">
          {note.text}
        </p>
      ) : null}

      <div className="card stack-s">
        <h2 className="section" style={{ marginTop: 0 }}>
          Your progress
        </h2>
        <p className="sub">
          {answered} of {ALL_QUESTIONS.length} questions answered ·{' '}
          {state.daysPractised.length} day{state.daysPractised.length === 1 ? '' : 's'}{' '}
          practiced · {daysUntilExam()} days to {EXAM_DATE}
        </p>
      </div>

      <div className="card stack-s">
        <h2 className="section" style={{ marginTop: 0 }}>
          Keep your progress safe
        </h2>
        <p className="sub">
          Progress lives on this phone only. A backup file is the way to move it or get it
          back.
        </p>
        <button className="btn btn-secondary" type="button" onClick={() => void backup()}>
          Save a backup file
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => fileInput.current?.click()}>
          Restore from a backup file
        </button>
        <input
          ref={fileInput}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            void pickFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button className="btn btn-secondary" type="button" onClick={() => void keepOffline()}>
          Ask the phone to keep my data
        </button>
        <details>
          <summary>Paste a backup instead</summary>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={4}
            placeholder="Paste the backup text here"
            aria-label="Backup text"
          />
          <button
            className="btn btn-secondary"
            type="button"
            disabled={paste.trim() === ''}
            onClick={() => restore(paste)}
          >
            Restore from pasted text
          </button>
        </details>
      </div>

      {flagged.length > 0 ? (
        <div className="card stack-s">
          <h2 className="section" style={{ marginTop: 0 }}>
            Flagged questions
          </h2>
          {flagged.map((q) => (
            <div key={q.id} className="tile flat">
              <span className="grow">
                <span className="name">{TOPIC_META[q.topic].label}</span>
                <span className="meta">{q.prompt}</span>
              </span>
              <button
                type="button"
                className="link-btn"
                onClick={() =>
                  update((s) => ({ ...s, flagged: s.flagged.filter((id) => id !== q.id) }))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="card stack-s">
        <h2 className="section" style={{ marginTop: 0 }}>
          Start fresh
        </h2>
        <p className="sub">This deletes every answer, mistake and flag on this phone.</p>
        {confirmReset ? (
          <>
            <p className="notice bad">This cannot be undone.</p>
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => {
                resetAll()
                setConfirmReset(false)
                setNote({ kind: 'ok', text: 'Progress deleted.' })
              }}
            >
              Yes, delete my progress
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setConfirmReset(false)}
            >
              Keep my progress
            </button>
          </>
        ) : (
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setConfirmReset(true)}
          >
            Delete my progress
          </button>
        )}
      </div>

      <div className="card stack-s">
        <h2 className="section" style={{ marginTop: 0 }}>
          About
        </h2>
        <p className="sub">
          A practice app for the KSHRD 15th Generation written test. It works with no
          internet, no account and no sign-in. Every question and answer ships inside the
          app.
        </p>
      </div>
    </div>
  )
}
