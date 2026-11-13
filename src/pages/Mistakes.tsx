import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Feedback } from '../components/Feedback'
import { lookup } from '../lib/content'
import { CORRECT_DAYS_TO_CLEAR, mistakeIds } from '../lib/progress'
import { DEFAULT_SET_SIZE } from '../lib/session'
import { startSet } from '../lib/start'
import { useAppState } from '../lib/store'
import { TOPIC_META } from '../lib/topics'

export function Mistakes() {
  const state = useAppState()
  const navigate = useNavigate()
  const [open, setOpen] = useState<string | null>(null)
  const ids = mistakeIds(state)
  const questions = lookup(ids)

  if (questions.length === 0) {
    return (
      <div className="stack">
        <h1 className="title">Mistakes</h1>
        <div className="card">
          <div className="empty">
            <div className="big">✓</div>
            <p>Nothing to fix. A question comes here when you get it wrong.</p>
            <Link className="btn btn-primary" to="/practice">
              Practice a topic
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const size = Math.min(DEFAULT_SET_SIZE, questions.length)

  function drill() {
    startSet({ source: { kind: 'mistakes' }, mode: 'learn', size })
    navigate('/session')
  }

  return (
    <div className="stack">
      <h1 className="title">Mistakes</h1>
      <p className="sub">
        {questions.length} question{questions.length === 1 ? '' : 's'} to fix. A question
        leaves this list after {CORRECT_DAYS_TO_CLEAR} right answers on{' '}
        {CORRECT_DAYS_TO_CLEAR} different days.
      </p>

      <button className="btn btn-primary" type="button" onClick={drill}>
        Practice {size} of these
      </button>

        {questions.map((q) => {
          const stat = state.stats[q.id]
          const isOpen = open === q.id
          return (
            <div key={q.id} className="review-item no">
              <button
                type="button"
                className="head"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : q.id)}
              >
                <span className="mark" aria-hidden="true">
                  ✕
                </span>
                <span className="text">
                  <b>{TOPIC_META[q.topic].label}</b>
                  <span>{q.prompt}</span>
                  <span>
                    Wrong {stat?.wrong ?? 1}×
                    {stat && stat.correctDays.length > 0
                      ? ` · ${stat.correctDays.length} of ${CORRECT_DAYS_TO_CLEAR} clear days`
                      : ''}
                  </span>
                </span>
              </button>
              {isOpen ? <Feedback question={q} picked={null} /> : null}
            </div>
          )
        })}
    </div>
  )
}
