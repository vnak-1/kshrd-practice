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
  return (
    <div className="code" tabIndex={0} role="group" aria-label={`${code.lang} code block`}>
      <pre>{code.source}</pre>
    </div>
  )
}
