// Fake questions for the tests. Kept away from src/content so the real
// question files stay the only thing the app ever ships.

import type { Question } from '../types'

export function makeQuestion(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    section: 'technical',
    topic: 'java',
    subtopic: 'test',
    difficulty: 1,
    kind: 'concept',
    prompt: `Prompt for ${id}`,
    options: [
      { text: 'right', correct: true, why: 'This one is the right answer.' },
      { text: 'wrong one', correct: false, why: 'This one is a wrong answer.' },
      { text: 'wrong two', correct: false, why: 'This one is also wrong.' },
      { text: 'wrong three', correct: false, why: 'This one is wrong as well.' },
    ],
    verify: { runner: 'review', reviewed: true },
    ...overrides,
  }
}

export function makePool(count: number): Question[] {
  return Array.from({ length: count }, (_, i) => makeQuestion(`q${i + 1}`))
}
