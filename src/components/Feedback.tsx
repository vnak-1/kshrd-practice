import type { Question } from '../types'
import { CodeBlock } from './CodeBlock'

interface Props {
  question: Question
  /** Chosen option, as a position in question.options. */
  picked: number | null
  /**
   * Repeat the code block. Needed in a list, where the row head shows the
   * prompt but not the code, and you cannot judge a "what does this print?"
   * answer without the code. Not needed during a set: the code is right above.
   */
  restate?: boolean
}

/**
 * Order asked for in CLAUDE.md: the question in front of you, then the correct
 * answer and why, then every wrong option with the reason it is wrong.
 * In a list the prompt comes from the row head, so only the code is repeated.
 */
export function Feedback({ question, picked, restate = true }: Props) {
  const correct = question.options.find((o) => o.correct)
  const wasRight = picked !== null && question.options[picked]?.correct === true

  return (
    <section className="feedback" aria-live="polite">
      {picked === null ? null : (
        <p className={`verdict ${wasRight ? 'good' : 'bad'}`}>
          <span className="dot" aria-hidden="true">
            {wasRight ? '✓' : '✕'}
          </span>
          {wasRight ? 'Correct' : 'Not correct'}
        </p>
      )}

      {restate && question.code ? <CodeBlock code={question.code} /> : null}

      {correct ? (
        <div className="why-item ok">
          <span className="tag">ANSWER</span>
          <span className="body">
            <b>{correct.text}</b>
            <span>{correct.why}</span>
          </span>
        </div>
      ) : null}

      <div className="why">
        <h3>Why the others are wrong</h3>
        {question.options.map((option, i) =>
          option.correct ? null : (
            <div className="why-item no" key={i}>
              <span className="tag">{picked === i ? 'YOURS' : 'NO'}</span>
              <span className="body">
                <b>{option.text}</b>
                <span>{option.why}</span>
              </span>
            </div>
          ),
        )}
      </div>
    </section>
  )
}
