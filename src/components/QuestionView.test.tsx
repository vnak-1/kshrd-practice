import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeQuestion } from '../test/fixtures'
import { QuestionView } from './QuestionView'

// The worst bug this app could have is marking a right answer wrong. That
// happens if the shuffled display order is not mapped back to the original
// option. So the correct answer here sits at original index 2, and the
// display order puts it somewhere else on screen.
const question = makeQuestion('q1', {
  options: [
    { text: 'alpha', correct: false, why: 'Alpha is not the answer here.' },
    { text: 'beta', correct: false, why: 'Beta is not the answer here.' },
    { text: 'gamma', correct: true, why: 'Gamma is the right answer here.' },
    { text: 'delta', correct: false, why: 'Delta is not the answer here.' },
  ],
})

// Shown order: delta, gamma, alpha, beta. So the right answer is button B.
const ORDER = [3, 2, 0, 1]

describe('QuestionView', () => {
  it('shows the options in the order it is given', () => {
    render(
      <QuestionView
        question={question}
        order={ORDER}
        picked={null}
        checked={false}
        revealAnswer
        onPick={() => {}}
      />,
    )
    const texts = screen.getAllByRole('radio').map((b) => b.textContent)
    expect(texts).toEqual(['Adelta', 'Bgamma', 'Calpha', 'Dbeta'])
  })

  it('reports the ORIGINAL index when a shuffled option is tapped', () => {
    const onPick = vi.fn()
    render(
      <QuestionView
        question={question}
        order={ORDER}
        picked={null}
        checked={false}
        revealAnswer
        onPick={onPick}
      />,
    )
    // "gamma" is second on screen but index 2 in the question file.
    fireEvent.click(screen.getByRole('radio', { name: /gamma/ }))
    expect(onPick).toHaveBeenCalledWith(2)

    fireEvent.click(screen.getByRole('radio', { name: /delta/ }))
    expect(onPick).toHaveBeenLastCalledWith(3)
  })

  it('marks the right answer right, wherever the shuffle put it', () => {
    render(
      <QuestionView
        question={question}
        order={ORDER}
        picked={2}
        checked
        revealAnswer
        onPick={() => {}}
      />,
    )
    const gamma = screen.getByRole('radio', { name: /gamma/ })
    expect(gamma.className).toContain('is-correct')
    expect(gamma.className).not.toContain('is-wrong')
  })

  it('marks a wrong pick wrong and still shows where the right answer was', () => {
    render(
      <QuestionView
        question={question}
        order={ORDER}
        picked={0}
        checked
        revealAnswer
        onPick={() => {}}
      />,
    )
    expect(screen.getByRole('radio', { name: /alpha/ }).className).toContain('is-wrong')
    expect(screen.getByRole('radio', { name: /gamma/ }).className).toContain('is-correct')
  })

  it('hides the right answer in timed mode, even after Check', () => {
    render(
      <QuestionView
        question={question}
        order={ORDER}
        picked={0}
        checked
        revealAnswer={false}
        onPick={() => {}}
      />,
    )
    for (const button of screen.getAllByRole('radio')) {
      expect(button.className).not.toContain('is-correct')
      expect(button.className).not.toContain('is-wrong')
    }
    // Your own choice is still visible, so you know what you answered.
    expect(screen.getByRole('radio', { name: /alpha/ }).className).toContain('selected')
  })

  it('locks the options once the answer is checked', () => {
    render(
      <QuestionView
        question={question}
        order={ORDER}
        picked={2}
        checked
        revealAnswer
        onPick={() => {}}
      />,
    )
    for (const button of screen.getAllByRole('radio')) {
      expect(button).toBeDisabled()
    }
  })
})
