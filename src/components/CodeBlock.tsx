import type { Question } from '../types'

interface Props {
  code: NonNullable<Question['code']>
}

/**
 * The code box. Used on the question screen and again in the answer panel,
 * because you cannot review a "what does this print?" answer without the code
 * in front of you.
 */
export function CodeBlock({ code }: Props) {
  // An aptitude question uses the same box for a table of figures. Calling
  // that "table code block" to a screen reader would be wrong, so the label
  // follows the language.
  const plain = code.lang === 'table' || code.lang === 'text'
  return (
    <div
      className="code"
      tabIndex={0}
      role="group"
      aria-label={plain ? 'data block' : `${code.lang} code block`}
    >
      <pre>{code.source}</pre>
    </div>
  )
}
