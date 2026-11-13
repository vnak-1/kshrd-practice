import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TOPICS } from '../types'
import type { Topic } from '../types'
import { questionsForTopic } from '../lib/content'
import { TOPIC_META } from '../lib/topics'
import { buildSession, DEFAULT_SET_SIZE } from '../lib/session'
import type { SessionMode } from '../lib/storage'
import { update, useAppState } from '../lib/store'
import { PageHeader } from '../components/PageHeader'

const SIZES = [5, 10, 20, 40]
/** One minute per question is close to real exam pace. */
const MINUTES_PER_QUESTION = 1

export function StartSet() {
  const { topic } = useParams<{ topic: string }>()
  const navigate = useNavigate()
  const state = useAppState()
  const [mode, setMode] = useState<SessionMode>('learn')
  const [size, setSize] = useState(DEFAULT_SET_SIZE)

  const valid = TOPICS.includes(topic as Topic) ? (topic as Topic) : null
  if (!valid) {
    return (
      <div className="stack">
        <PageHeader title="Not found" />
        <p className="sub">That topic does not exist.</p>
      </div>
    )
  }

  const pool = questionsForTopic(valid)
  const meta = TOPIC_META[valid]
  const sizes = SIZES.filter((n) => n <= pool.length)
  if (sizes.length === 0) sizes.push(pool.length)
  const realSize = Math.min(size, pool.length)
  const minutes = Math.max(1, Math.round(realSize * MINUTES_PER_QUESTION))
  const unfinished = state.session && !state.session.finished

  function start() {
    if (!valid) return
    update((s) => ({
      ...s,
      session: buildSession({
        mode,
        source: { kind: 'topic', topic: valid },
        pool,
        size: realSize,
        minutes,
      }),
    }))
    navigate('/session')
  }

  return (
    <>
      <div className="stack">
        <PageHeader title={meta.label} />
        <p className="sub">{meta.blurb}</p>

        {unfinished ? (
          <div className="notice warn">
            You have a set you did not finish. Starting a new one will drop it.
          </div>
        ) : null}

        <div className="card stack-s">
          <h2 className="section" style={{ marginTop: 0 }}>
            How to practice
          </h2>
          <Choice
            label="Learn"
            hint="See the answer and the reason after every question"
            selected={mode === 'learn'}
            onSelect={() => setMode('learn')}
          />
          <Choice
            label="Timed"
            hint={`Exam style: ${minutes} min, answers only at the end`}
            selected={mode === 'timed'}
            onSelect={() => setMode('timed')}
          />
        </div>

        <div className="card stack-s">
          <h2 className="section" style={{ marginTop: 0 }}>
            How many questions
          </h2>
          <div className="chip-row">
            {sizes.map((n) => (
              <button
                key={n}
                type="button"
                className={`option${realSize === n ? ' selected' : ''}`}
                style={{ width: 'auto', minWidth: 76, justifyContent: 'center' }}
                aria-pressed={realSize === n}
                onClick={() => setSize(n)}
              >
                <span className="otext">{n}</span>
              </button>
            ))}
          </div>
          <p className="sub">
            {pool.length} question{pool.length === 1 ? '' : 's'} available in this topic.
          </p>
        </div>
      </div>

      <div className="actionbar">
        <div>
          <button className="btn btn-primary" type="button" onClick={start}>
            Start {realSize} question{realSize === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </>
  )
}

function Choice({
  label,
  hint,
  selected,
  onSelect,
}: {
  label: string
  hint: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`option${selected ? ' selected' : ''}`}
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
    >
      <span className="mark" aria-hidden="true">
        {selected ? '✓' : ''}
      </span>
      <span className="otext">
        <b>{label}</b>
        <br />
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{hint}</span>
      </span>
    </button>
  )
}
