import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Feedback } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { lookupMaybe } from '../lib/content'
import { DEFAULT_SET_SIZE, isAnswerCorrect, scoreSession } from '../lib/session'
import { poolFor, startSet } from '../lib/start'
import { useAppState } from '../lib/store'

/**
 * One short line about the score. It is encouragement, not a grade: the
 * real exam's pass mark is not published, so no line here claims you
 * passed or failed.
 */
function verdictLine(percent: number): string {
  if (percent === 100) return 'Every one right. Well done.'
  if (percent >= 80) return 'Strong set. Keep going.'
  if (percent >= 60) return 'Good. Read the ones you missed.'
  if (percent >= 40) return 'Halfway there. The wrong ones are the lesson.'
  return 'A hard set. Read every reason below, then try again.'
}

export function Review() {
  const state = useAppState()
  const navigate = useNavigate()
  const session = state.session
  const [open, setOpen] = useState<number | null>(null)

  if (!session) {
    return (
      <div className="stack">
        <PageHeader title="Results" backTo="/" />
        <div className="card">
          <div className="empty">
            <p>There is no set to show yet.</p>
            <Link className="btn btn-primary" to="/practice">
              Start a set
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const questions = lookupMaybe(session.ids)
  const score = scoreSession(session, questions)
  const { source, mode } = session
  // Never offer more questions than the topic actually holds, or the button
  // promises a number it cannot give.
  const size = Math.min(
    Math.max(session.ids.length, DEFAULT_SET_SIZE),
    poolFor(source, state).length,
  )

  function again() {
    startSet({ source, mode, size, minutes: size })
    navigate('/session')
  }

  return (
    <>
      <div className="stack">
        <PageHeader title="Results" backTo="/" />

        <div className="card">
          {/* The ring fills to the score. The number inside says it in
              words as well, so the ring is decoration, never the only
              way to read the result. */}
          <div
            className={`ring ${score.percent >= 70 ? 'is-good' : score.percent < 40 ? 'is-bad' : ''}`}
            style={{ '--pct': score.percent } as CSSProperties}
            role="img"
            aria-label={`Score ${score.percent} percent`}
          >
            <span className="ring-label">
              <span className="ring-pct">{score.percent}%</span>
              <span className="ring-sub">
                {score.correct}/{score.total}
              </span>
            </span>
          </div>
          <p className="sub" style={{ textAlign: 'center', marginTop: 12 }}>
            {verdictLine(score.percent)}
          </p>
          <p className="sub" style={{ textAlign: 'center' }}>
            {score.correct} right out of {score.total}
            {score.answered < score.total
              ? ` · ${score.total - score.answered} not answered`
              : ''}
          </p>
        </div>

        <h2 className="section">Every question</h2>
        {session.ids.map((id, i) => {
          const q = questions[i]
          const pick = session.picked[i] ?? null
          const right = q ? isAnswerCorrect(q, pick) : false
          const isOpen = open === i
          return (
            <div key={id} className={`review-item${right ? ' ok' : ' no'}`}>
              <button
                type="button"
                className="head"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span className="mark" aria-hidden="true">
                  {right ? '✓' : '✕'}
                </span>
                <span className="text">
                  <b>
                    {i + 1}. {right ? 'Right' : pick === null ? 'Not answered' : 'Wrong'}
                  </b>
                  <span>{q ? q.prompt : 'This question is not in the app any more.'}</span>
                </span>
              </button>
              {isOpen && q ? <Feedback question={q} picked={pick} /> : null}
            </div>
          )
        })}
      </div>

      <div className="actionbar">
        <div>
          {/* A mistakes set empties itself. With nothing left to draw from,
              the button would promise 0 questions, so show a way out instead. */}
          {size > 0 ? (
            <button className="btn btn-primary" type="button" onClick={again}>
              Practice {size} more question{size === 1 ? '' : 's'}
            </button>
          ) : (
            <Link className="btn btn-primary" to="/practice">
              Pick a topic
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
