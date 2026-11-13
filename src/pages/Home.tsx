import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ALL_QUESTIONS, lookup } from '../lib/content'
import { daysUntilExam, EXAM_DATE } from '../lib/countdown'
import { mistakeIds } from '../lib/progress'
import { DEFAULT_SET_SIZE, scoreSession } from '../lib/session'
import { startSet } from '../lib/start'
import { useAppState } from '../lib/store'
import { ChevronRight } from '../components/Icons'

const EXAM_LABEL = new Date(`${EXAM_DATE}T00:00:00Z`).toLocaleDateString('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function Home() {
  const state = useAppState()
  const navigate = useNavigate()
  const days = daysUntilExam()
  const mistakes = mistakeIds(state)
  const session = state.session
  const unfinished = session && !session.finished ? session : null
  const total = ALL_QUESTIONS.length
  const setSize = Math.min(DEFAULT_SET_SIZE, total)
  const [asking, setAsking] = useState(false)

  function startMixed() {
    startSet({ source: { kind: 'mixed' }, mode: 'learn', size: setSize })
    navigate('/session')
  }

  // A new set replaces the one you did not finish, so never do that silently.
  function onPrimary() {
    if (unfinished) setAsking(true)
    else startMixed()
  }

  return (
    <div className="stack">
      <div>
        <h1 className="title">KSHRD Practice</h1>
        <p className="sub">Written test · {EXAM_LABEL}</p>
      </div>

      {unfinished ? (
        <Link className="banner" to="/session">
          <span className="grow">
            <strong>Carry on where you stopped</strong>
            <small>
              Question {Math.min(unfinished.index + 1, unfinished.ids.length)} of{' '}
              {unfinished.ids.length}
            </small>
          </span>
          <ChevronRight />
        </Link>
      ) : null}

      <div className="card">
        <div className="row-between">
          <div>
            <div className="big-number">{days > 0 ? days : 0}</div>
            <p className="sub">
              {days > 1
                ? 'days left'
                : days === 1
                  ? 'day left'
                  : days === 0
                    ? 'The exam is today. Good luck.'
                    : 'The exam date has passed.'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="big-number">{total}</div>
            <p className="sub">questions ready</p>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="big">📄</div>
            <p>
              No questions yet. Add a JSON file in <code className="inline-code">
                src/content/questions/
              </code>{' '}
              and build again.
            </p>
          </div>
        </div>
      ) : (
        <>
          {asking ? (
            <div className="notice warn stack-s" role="group">
              <p style={{ margin: 0 }}>
                You have a set you did not finish. A new set will drop it.
              </p>
              <button className="btn btn-primary" type="button" onClick={startMixed}>
                Drop it and start {setSize} new
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setAsking(false)}
              >
                Keep it
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" type="button" onClick={onPrimary}>
              {unfinished
                ? `Start ${setSize} new question${setSize === 1 ? '' : 's'}`
                : `Practice ${setSize} question${setSize === 1 ? '' : 's'}`}
            </button>
          )}
          <Link className="btn btn-secondary" to="/practice">
            Choose a topic
          </Link>
        </>
      )}

      {mistakes.length > 0 ? (
        <Link className="tile" to="/mistakes">
          <span className="grow">
            <span className="name">Fix your mistakes</span>
            <span className="meta">
              {mistakes.length} question{mistakes.length === 1 ? '' : 's'} to get right twice
            </span>
          </span>
          <ChevronRight className="arrow" />
        </Link>
      ) : null}

      {session?.finished ? <LastResult /> : null}
    </div>
  )
}

function LastResult() {
  const state = useAppState()
  const session = state.session
  if (!session?.finished) return null
  const score = scoreSession(session, lookup(session.ids))
  return (
    <Link className="tile" to="/review">
      <span className="grow">
        <span className="name">Last set: {score.percent}%</span>
        <span className="meta">
          {score.correct} of {score.total} correct · tap to review
        </span>
      </span>
      <ChevronRight className="arrow" />
    </Link>
  )
}
