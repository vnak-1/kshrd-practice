import type { Question } from '../types'
import { CodeBlock } from './CodeBlock'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

interface Props {
  question: Question
  /** Display order: positions into question.options. */
  order: number[]
  /** The chosen option, as a position in question.options. */
  picked: number | null
  /** true after the user tapped Check. */
  checked: boolean
  /** false in timed mode: the right answer stays hidden until the end. */
  revealAnswer: boolean
  onPick: (originalIndex: number) => void
}

export function QuestionView({ question, order, picked, checked, revealAnswer, onPick }: Props) {
  return (
    <div>
      <p className="qprompt">{question.prompt}</p>

      {question.code ? <CodeBlock code={question.code} /> : null}

      <div className="options" role="radiogroup" aria-label="Answer choices">
        {order.map((original, shown) => {
          const option = question.options[original]
          const isPicked = picked === original
          const reveal = checked && revealAnswer
          const showCorrect = reveal && option.correct
          const showWrong = reveal && isPicked && !option.correct

          let cls = 'option'
          if (showCorrect) cls += ' is-correct'
          else if (showWrong) cls += ' is-wrong'
          else if (isPicked) cls += ' selected'

          let mark = LETTERS[shown] ?? String(shown + 1)
          if (showCorrect) mark = '✓'
          else if (showWrong) mark = '✕'

          return (
            <button
              key={original}
              type="button"
              className={cls}
              role="radio"
              aria-checked={isPicked}
              disabled={checked}
              onClick={() => onPick(original)}
            >
              <span className="mark" aria-hidden="true">
                {mark}
              </span>
              <span className={question.codeOptions ? 'otext mono' : 'otext'}>
                {option.text}
                {showCorrect ? <span className="sr-only"> — correct answer</span> : null}
                {showWrong ? <span className="sr-only"> — your answer, wrong</span> : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
