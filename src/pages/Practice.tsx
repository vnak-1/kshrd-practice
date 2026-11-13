import { Link } from 'react-router-dom'
import { SECTIONS } from '../types'
import type { Topic } from '../types'
import { questionsForTopic, topicCount } from '../lib/content'
import { SECTION_LABEL, TOPIC_META, topicsInSection } from '../lib/topics'
import { progressFor } from '../lib/progress'
import { useAppState } from '../lib/store'
import { ChevronRight } from '../components/Icons'

export function Practice() {
  const state = useAppState()

  return (
    <div className="stack">
      <h1 className="title">Practice</h1>
      <p className="sub">Pick a topic. A set is 10 questions, about 5 minutes.</p>

      {SECTIONS.map((section) => {
        const topics = topicsInSection(section).filter((t) => topicCount(t) > 0)
        if (topics.length === 0) return null
        return (
          <div key={section} className="stack-s">
            <h2 className="section">{SECTION_LABEL[section]}</h2>
            {topics.map((topic) => (
              <TopicTile key={topic} topic={topic} state={state} />
            ))}
          </div>
        )
      })}

      {SECTIONS.every((s) => topicsInSection(s).every((t) => topicCount(t) === 0)) ? (
        <div className="card">
          <div className="empty">
            <div className="big">📄</div>
            <p>No questions are loaded yet.</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TopicTile({
  topic,
  state,
}: {
  topic: Topic
  state: ReturnType<typeof useAppState>
}) {
  const meta = TOPIC_META[topic]
  const questions = questionsForTopic(topic)
  const done = progressFor(
    state,
    questions.map((q) => q.id),
  )
  const seenPercent =
    questions.length === 0 ? 0 : Math.round((done.answered / questions.length) * 100)
  const allSeen = done.answered >= questions.length && questions.length > 0

  return (
    <Link className="tile" to={`/start/${topic}`}>
      <span className="grow">
        <span className="name">{meta.label}</span>
        <span className="meta">{meta.blurb}</span>

        {/* How far through the topic you are. A bar says it faster than a
            sentence, and it shows at a glance which topic to open next. */}
        <span
          className={allSeen ? 'tbar done' : 'tbar'}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={done.answered}
          aria-label={`${meta.label}: ${done.answered} of ${questions.length} seen`}
        >
          <span style={{ width: `${seenPercent}%` }} />
        </span>
        <span className="tmeta">
          <span>
            {done.answered} of {questions.length} seen
          </span>
          <span>
            {done.answered > 0 ? `${Math.round(done.accuracy * 100)}% right` : 'not started'}
          </span>
        </span>
      </span>
      <ChevronRight className="arrow" />
    </Link>
  )
}
