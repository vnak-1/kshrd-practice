import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Feedback } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { lookupMaybe } from '../lib/content'
import type { Question } from '../types'
import { TOPICS } from '../types'
import { coverageOf, scoreBySection } from '../lib/mock'
import { SECTION_LABEL, TOPIC_META } from '../lib/topics'
import { DEFAULT_SET_SIZE, isAnswerCorrect, scoreSession } from '../lib/session'
import { poolFor, startMock, startSet } from '../lib/start'
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

/**
 * The subjects this paper asked about, and the ones it skipped.
 *
 * A mock is a sample of the question bank, so it can miss a whole subject
 * by chance. Without this the score quietly suggests you are ready for the
 * lot.
 */
function Coverage({ questions }: { questions: readonly (Question | undefined)[] }) {
  const { asked, missed } = coverageOf(questions, TOPICS)
  if (asked.length === 0) return null

  return (
    <div className="card stack-s">
      <h2 className="section" style={{ marginTop: 0 }}>
        What this paper asked you
      </h2>
      <div className="chip-row">
        {asked.map(({ topic, count }) => (
          <span key={topic} className="chip">
            {TOPIC_META[topic].label} {count}
          </span>
        ))}
      </div>
      {missed.length > 0 ? (
        <p className="sub" style={{ margin: 0 }}>
          <b>Not asked at all:</b> {missed.map((t) => TOPIC_META[t].label).join(', ')}. The
          real exam can cover {missed.length === 1 ? 'that' : 'those'}, so this score does
          not say you are ready for {missed.length === 1 ? 'it' : 'them'}.
        </p>
      ) : (
        <p className="sub" style={{ margin: 0 }}>
          Every subject in the app came up in this paper.
        </p>
      )}
    </div>
  )
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
    // A mock must go back through startMock, or it would be rebuilt as a
    // flat random set with a one-minute-per-question clock instead of a
    // section-by-section paper with three hours.
    if (source.kind === 'mock') {
      startMock(session?.ids.length)
      navigate('/session')
      return
    }
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

        {/* After a mock, where you stood section by section. That is what
            tells you which part of the paper to work on next. */}
        {session.source.kind === 'mock' ? (
          <div className="card">
            <h2 className="section" style={{ marginTop: 0 }}>
              By section
            </h2>
            {scoreBySection(questions, session.picked).map((row) => (
              <div key={row.section} className="secrow">
                <div className="top">
                  <span>{SECTION_LABEL[row.section]}</span>
                  <span>
                    {row.correct}/{row.total} · {row.percent}%
                  </span>
                </div>
                <div
                  className={`tbar${row.percent >= 70 ? ' done' : ''}`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={row.total}
                  aria-valuenow={row.correct}
                  aria-label={`${SECTION_LABEL[row.section]}: ${row.correct} of ${row.total} right`}
                >
                  <span style={{ width: `${row.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* What this paper actually asked about. A mock draws a sample, so
            a subject can be missed entirely. Saying so stops a thin paper
            reading as "you are ready for all of it". */}
        {session.source.kind === 'mock' ? <Coverage questions={questions} /> : null}

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
              {source.kind === 'mock'
                ? 'Sit another mock'
                : `Practice ${size} more question${size === 1 ? '' : 's'}`}
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
