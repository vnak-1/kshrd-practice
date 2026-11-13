import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeQuestion } from '../test/fixtures'
import { Feedback } from './Feedback'

// The answer panel repeats the options as plain text. When the options ARE
// code, they must keep the code font there too, or the spacing and brackets
// the question is about disappear.
const codeQuestion = makeQuestion('q1', {
  codeOptions: true,
  code: { lang: 'java', source: 'int n = 5;\nn = "hi";' },
  options: [
    { text: 'n = "hi";', correct: true, why: 'A String cannot go into an int.' },
    { text: 'int n = 5;', correct: false, why: 'A normal int declaration, nothing wrong.' },
    { text: 'System.out.print(n);', correct: false, why: 'Printing an int is fine here.' },
  ],
})

describe('Feedback', () => {
  it('keeps the code font on answers that are code', () => {
    render(<Feedback question={codeQuestion} picked={1} />)
    const labels = [...document.querySelectorAll('.olabel.mono')].map((e) => e.textContent)
    expect(labels).toEqual(['n = "hi";', 'int n = 5;', 'System.out.print(n);'])
  })

  it('uses the normal font when the answers are words', () => {
    render(<Feedback question={makeQuestion('q2')} picked={1} />)
    expect(document.querySelectorAll('.olabel.mono')).toHaveLength(0)
  })

  it('shows the right answer, then every wrong one with a reason', () => {
    render(<Feedback question={codeQuestion} picked={1} />)
    expect(screen.getByText('Not correct')).toBeTruthy()
    expect(screen.getByText('A String cannot go into an int.')).toBeTruthy()
    expect(screen.getByText('A normal int declaration, nothing wrong.')).toBeTruthy()
    expect(screen.getByText('Printing an int is fine here.')).toBeTruthy()
  })

  it('repeats the code in a list, but not during a set', () => {
    const { unmount } = render(<Feedback question={codeQuestion} picked={1} />)
    expect(document.querySelector('.feedback pre')).toBeTruthy()
    unmount()
    render(<Feedback question={codeQuestion} picked={1} restate={false} />)
    expect(document.querySelector('.feedback pre')).toBeNull()
  })
})
