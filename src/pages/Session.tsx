import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Feedback } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { QuestionView } from '../components/QuestionView'
import { ClockIcon, FlagIcon } from '../components/Icons'
import { lookupMaybe } from '../lib/content'
import { today } from '../lib/countdown'
import { recordAnswer, toggleFlag } from '../lib/progress'
import {
  formatClock,
  isAnswerCorrect,
  isOutOfTime,
  orderFor,
  remainingMs,
} from '../lib/session'
import type { AppState, SessionState } from '../lib/storage'
import { update, useAppState } from '../lib/store'
import { TOPIC_META } from '../lib/topics'

export function Session() {
  const state = useAppState()
  const navigate = useNavigate()
  const session = state.session
  const [showHint, setShowHint] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const timed = session?.mode === 'timed' && session.limitMs !== null
  const index = session?.index ?? 0
  const feedbackRef = useRef<HTMLDivElement | null>(null)
  // True once the answer panel is on screen. Worked out up here because a
  // React hook cannot sit after the early return further down.
  const showingAnswer =
    session != null &&
    !session.finished &&
    session.mode === 'learn' &&
    session.checked[session.index] === true

  // The clock is worked out from the saved start time, so it stays right even
  // if iOS freezes the app in the background.
  useEffect(() => {
    if (!timed || !session || session.finished) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [timed, session])

  // New question: start at the top, hide the old hint.
  useEffect(() => {
    setShowHint(false)
    window.scrollTo(0, 0)
  }, [index])

  // The answer panel opens below the fold on a phone. Bring it into view so
  // nobody has to hunt for it after tapping Check.
  useEffect(() => {
    if (!showingAnswer) return
    feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showingAnswer, index])

  // Time up: close the set and go to the results.
  useEffect(() => {
    if (!session || session.finished || !timed) return
    if (!isOutOfTime(session, now)) return
    update((s) => closeSet(s, today()))
    navigate('/review')
  }, [session, timed, now, navigate])

  if (!session || session.finished) {
    return (
      <div className="stack">
        <PageHeader title="Practice" backTo="/" />
        <div className="card">
          <div className="empty">
            <p>This set is over.</p>
            <Link className="btn btn-primary" to="/practice">
              Start a new set
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const questions = lookupMaybe(session.ids)
  const question = questions[index]
  const picked = session.picked[index] ?? null
  const checked = session.checked[index] === true
  const reveal = checked && session.mode === 'learn'
  const last = index >= session.ids.length - 1
  const left = remainingMs(session, now)
  const title =
    session.source.kind === 'topic'
      ? TOPIC_META[session.source.topic].label
      : session.source.kind === 'mistakes'
        ? 'Your mistakes'
        : 'Mixed set'

  function pick(originalIndex: number) {
    update((s) => patchSession(s, (sess) => ({
      ...sess,
      picked: replaceAt(sess.picked, sess.index, originalIndex),
    })))
  }

  function check() {
    const day = today()
    update((s) => {
      const sess = s.session
      if (!sess) return s
      const q = lookupMaybe(sess.ids)[sess.index]
      const pickNow = sess.picked[sess.index] ?? null
      let next = s
      if (q && pickNow !== null) {
        next = recordAnswer(s, q.id, isAnswerCorrect(q, pickNow), day)
      }
      return {
        ...next,
        session: { ...sess, checked: replaceAt(sess.checked, sess.index, true) },
      }
    })
  }

  function next() {
    if (last) {
      update((s) => closeSet(s, today()))
      navigate('/review')
      return
    }
    update((s) => patchSession(s, (sess) => ({ ...sess, index: sess.index + 1 })))
  }

  const flagged = question ? state.flagged.includes(question.id) : false

  return (
    <>
      <div className="stack">
        <PageHeader
          title={title}
          backTo="/"
          right={
            timed && left !== null ? (
              <span className={`clock${left < 30_000 ? ' low' : ''}`}>
                <ClockIcon />
                {formatClock(left)}
              </span>
            ) : question ? (
              <button
                type="button"
                className={`flagbtn${flagged ? ' on' : ''}`}
                aria-pressed={flagged}
                aria-label={flagged ? 'Remove flag' : 'Flag this question'}
                onClick={() => update((s) => toggleFlag(s, question.id))}
              >
                <FlagIcon />
              </button>
            ) : null
          }
        />

        <div className="progress-row">
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={session.ids.length}
            aria-valuenow={index + 1}
            aria-label="Progress through this set"
          >
            <span style={{ width: `${((index + 1) / session.ids.length) * 100}%` }} />
          </div>
          <span className="chip">
            {index + 1} / {session.ids.length}
          </span>
        </div>

        {question ? (
          <>
            <div className="card">
              <QuestionView
                question={question}
                order={orderFor(session, index, question)}
                picked={picked}
                checked={checked}
                revealAnswer={session.mode === 'learn'}
                onPick={pick}
              />
              {question.hint && !checked && session.mode === 'learn' ? (
                showHint ? (
                  <p className="hint">Hint: {question.hint}</p>
                ) : (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setShowHint(true)}
                  >
                    Show a hint
                  </button>
                )
              ) : null}
            </div>

            {reveal ? (
              <div ref={feedbackRef}>
                <Feedback question={question} picked={picked} restate={false} />
              </div>
            ) : null}
            {checked && session.mode === 'timed' ? (
              <p className="notice">Answer saved. You see the answers at the end.</p>
            ) : null}
          </>
        ) : (
          <div className="card">
            <div className="empty">
              <p>This question is not in the app any more.</p>
            </div>
          </div>
        )}
      </div>

      <div className="actionbar">
        <div>
          {!question ? (
            <button className="btn btn-primary" type="button" onClick={next}>
              {last ? 'See results' : 'Next'}
            </button>
          ) : !checked ? (
            <button
              className="btn btn-primary"
              type="button"
              disabled={picked === null}
              onClick={check}
            >
              {picked === null ? 'Pick an answer' : 'Check'}
            </button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={next}>
              {last ? 'See results' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function replaceAt<T>(list: T[], index: number, value: T): T[] {
  const copy = list.slice()
  copy[index] = value
  return copy
}

function patchSession(
  state: AppState,
  change: (session: SessionState) => SessionState,
): AppState {
  if (!state.session) return state
  return { ...state, session: change(state.session) }
}

/**
 * Ends the set. Any answer that was picked but never confirmed still counts,
 * so a set that runs out of time is scored the same way.
 */
function closeSet(state: AppState, day: string): AppState {
  const sess = state.session
  if (!sess || sess.finished) return state
  const questions = lookupMaybe(sess.ids)
  const checked = sess.checked.slice()
  let next = state
  sess.ids.forEach((id, i) => {
    if (checked[i]) return
    const pick = sess.picked[i] ?? null
    const q = questions[i]
    if (pick === null || !q) return
    checked[i] = true
    next = recordAnswer(next, id, isAnswerCorrect(q, pick), day)
  })
  return { ...next, session: { ...sess, checked, finished: true } }
}
