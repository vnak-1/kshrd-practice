import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ALL_QUESTIONS, lookup, topicCount } from '../lib/content'
import { TOPIC_META } from '../lib/topics'
import { daysUntilExam, EXAM_DATE, today } from '../lib/countdown'
import { weekFor, weekRangeLabel } from '../lib/plan'
import { mistakeIds } from '../lib/progress'
import { DEFAULT_SET_SIZE, scoreSession } from '../lib/session'
import { startSet } from '../lib/start'
import { practisedToday, streakLength } from '../lib/streak'
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
  const day = today()
  const streak = streakLength(state.daysPractised, day)
  const doneToday = practisedToday(state.daysPractised, day)
  const answered = Object.values(state.stats).filter((s) => s.seen > 0).length
  const seenPercent = total === 0 ? 0 : Math.round((answered / total) * 100)

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
      <div className="row-between" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h1 className="title">KSHRD Practice</h1>
          <p className="sub">Written test · {EXAM_LABEL}</p>
        </div>
        {state.daysPractised.length > 0 ? (
          <span
            className={doneToday ? 'streak' : 'streak cold'}
            title={doneToday ? 'Practised today' : 'Practise today to keep it'}
          >
            <span className="flame" aria-hidden="true">
              {doneToday ? '🔥' : '🌙'}
            </span>
            {streak} day{streak === 1 ? '' : 's'}
            <span className="sr-only">
              {doneToday
                ? ' practised in a row, including today'
                : ' practised in a row. Practise today to keep the run going.'}
            </span>
          </span>
        ) : null}
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

      <div className="hero">
        <div className="hero-grid">
          <div className="hero-cell">
            <div className="big-number">{days > 0 ? days : 0}</div>
            <p className="sub" style={{ margin: 0 }}>
              {days > 1
                ? 'days left'
                : days === 1
                  ? 'day left'
                  : days === 0
                    ? 'the exam is today'
                    : 'the exam has passed'}
            </p>
          </div>
          <div className="hero-split" aria-hidden="true" />
          <div className="hero-cell right">
            <div className="big-number">{total}</div>
            <p className="sub" style={{ margin: 0 }}>
              questions ready
            </p>
          </div>
        </div>

        {total > 0 ? (
          <>
            <div
              className="tbar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={answered}
              aria-label="Questions you have answered at least once"
            >
              <span style={{ width: `${seenPercent}%` }} />
            </div>
            <div className="tmeta">
              <span>
                {answered} seen · {total - answered} still new
              </span>
              <span>{seenPercent}%</span>
            </div>
          </>
        ) : null}
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

      <ThisWeek />

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

/**
 * What the study plan says to work on this week, with a way straight into
 * it. Only topics that actually have questions get a button; the rest are
 * still named, so the card never hides part of the week's work.
 */
function ThisWeek() {
  const week = weekFor(today())
  if (!week) return null
  const ready = week.topics.filter((t) => topicCount(t) > 0)
  const notReady = week.topics.filter((t) => topicCount(t) === 0)

  return (
    <div className="card stack-s">
      <div className="row-between">
        <h2 className="section" style={{ marginTop: 0, marginBottom: 0 }}>
          {week.label}
        </h2>
        <span className="sub" style={{ margin: 0 }}>
          {weekRangeLabel(week)}
        </span>
      </div>
      <p className="sub" style={{ margin: 0 }}>
        {week.focus}
      </p>

      {ready.length > 0 ? (
        <div className="chip-row">
          {ready.map((topic) => (
            <Link key={topic} className="chip" to={`/start/${topic}`}>
              {TOPIC_META[topic].label}
            </Link>
          ))}
        </div>
      ) : null}

      {notReady.length > 0 ? (
        <p className="sub" style={{ margin: 0 }}>
          No questions in the app yet for{' '}
          {notReady.map((t) => TOPIC_META[t].label).join(', ')}.
        </p>
      ) : null}
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
