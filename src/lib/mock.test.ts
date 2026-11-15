import { describe, expect, it } from 'vitest'
import type { Question, Section, Topic } from '../types'
import { makeRandom } from './shuffle'
import {
  DEFAULT_MOCK_SIZE,
  MOCK_MINUTES,
  drawMock,
  coverageOf,
  quotasFor,
  scoreBySection,
} from './mock'

/** A question with only the fields the draw actually reads. */
function q(id: string, section: Section, topic: Topic): Question {
  return {
    id,
    section,
    topic,
    kind: 'concept',
    difficulty: 1,
    prompt: id,
    options: [
      { text: 'a', correct: true, why: 'because' },
      { text: 'b', correct: false, why: 'because not' },
    ],
    verify: { runner: 'review', reviewed: true },
  } as Question
}

function many(prefix: string, section: Section, topic: Topic, n: number): Question[] {
  return Array.from({ length: n }, (_, i) => q(`${prefix}-${i}`, section, topic))
}

/** A pool shaped roughly like the real one: lots of Java, nothing yet for
 *  several topics, and no English questions at all. */
const POOL: Question[] = [
  ...many('java', 'technical', 'java', 40),
  ...many('sql', 'technical', 'sql', 26),
  ...many('net', 'technical', 'networking', 25),
  ...many('num', 'aptitude', 'numerical', 17),
  ...many('logic', 'aptitude', 'logic', 14),
  ...many('anal', 'aptitude', 'analytical', 9),
  ...many('ai', 'technical', 'ai', 1),
  ...many('js', 'technical', 'javascript', 1),
]

const rand = () => makeRandom(12345)()

describe('the length we practise at', () => {
  // Three hours is our best information, NOT a confirmed fact: KSHRD's FAQ
  // asks how long the test takes but never serves the answer. This test only
  // pins the number so it cannot drift by accident.
  it('is three hours, which is unconfirmed but deliberate', () => {
    expect(MOCK_MINUTES).toBe(180)
  })
})

describe('quotasFor', () => {
  it('hands out exactly the size asked for', () => {
    for (const size of [10, 40, 60, 80]) {
      const total = quotasFor(POOL, size).reduce((sum, qq) => sum + qq.want, 0)
      expect(total).toBe(size)
    }
  })

  it('never asks a section for more than it holds', () => {
    for (const quota of quotasFor(POOL, 80)) {
      expect(quota.want).toBeLessThanOrEqual(quota.available)
    }
  })

  it('gives an empty section nothing and shares its weight out', () => {
    const quotas = quotasFor(POOL, 80)
    const english = quotas.find((x) => x.section === 'english')
    expect(english?.available).toBe(0)
    expect(english?.want).toBe(0)
    // the other two still add up to the full paper
    expect(quotas.reduce((sum, x) => sum + x.want, 0)).toBe(80)
  })

  it('keeps roughly the intended split when every section is full', () => {
    const full = [
      ...many('t', 'technical', 'java', 200),
      ...many('a', 'aptitude', 'logic', 200),
      ...many('e', 'english', 'grammar', 200),
    ]
    const quotas = quotasFor(full, 100)
    const by = (s: Section) => quotas.find((x) => x.section === s)?.want ?? 0
    expect(by('technical')).toBe(65)
    expect(by('aptitude')).toBe(30)
    expect(by('english')).toBe(5)
  })

  it('cannot ask for more than the whole pool', () => {
    const small = many('t', 'technical', 'java', 5)
    expect(quotasFor(small, 80).reduce((sum, x) => sum + x.want, 0)).toBe(5)
  })

  it('copes with an empty pool', () => {
    expect(quotasFor([], 80).reduce((sum, x) => sum + x.want, 0)).toBe(0)
  })
})

describe('drawMock', () => {
  it('returns the number asked for', () => {
    expect(drawMock({ pool: POOL, size: 80, rand }).length).toBe(80)
    expect(drawMock({ pool: POOL, size: 40, rand }).length).toBe(40)
  })

  it('never repeats a question', () => {
    const drawn = drawMock({ pool: POOL, size: 80, rand })
    expect(new Set(drawn.map((x) => x.id)).size).toBe(80)
  })

  it('lays the paper out in section order: aptitude, technical, english', () => {
    const drawn = drawMock({ pool: POOL, size: 80, rand })
    const order = drawn.map((x) => x.section)
    const firstTechnical = order.indexOf('technical')
    const lastAptitude = order.lastIndexOf('aptitude')
    expect(lastAptitude).toBeLessThan(firstTechnical)
  })

  it('spreads a section across its topics instead of taking all of one', () => {
    const drawn = drawMock({ pool: POOL, size: 80, rand })
    const technical = drawn.filter((x) => x.section === 'technical')
    const topics = new Set(technical.map((x) => x.topic))
    // java, sql, networking, ai and javascript all exist, so a spread draw
    // must reach more than two of them
    expect(topics.size).toBeGreaterThanOrEqual(4)
  })

  it('does not take 40 Java questions just because Java is the biggest topic', () => {
    const drawn = drawMock({ pool: POOL, size: 80, rand })
    const java = drawn.filter((x) => x.topic === 'java').length
    const technical = drawn.filter((x) => x.section === 'technical').length
    expect(java).toBeLessThan(technical)
  })

  it('takes the whole pool when the pool is smaller than the paper', () => {
    const small = [...many('t', 'technical', 'java', 3), ...many('a', 'aptitude', 'logic', 2)]
    expect(drawMock({ pool: small, size: 80, rand }).length).toBe(5)
  })

  it('returns nothing from an empty pool rather than throwing', () => {
    expect(drawMock({ pool: [], size: 80, rand })).toEqual([])
  })

  it('prefers questions you have not seen', () => {
    const pool = many('t', 'technical', 'java', 10)
    // mark the first five as seen many times
    const seen: Record<string, { seen: number }> = {}
    for (let i = 0; i < 5; i += 1) seen[`t-${i}`] = { seen: 9 }
    const drawn = drawMock({ pool, size: 5, rand, seen })
    const ids = drawn.map((x) => x.id)
    for (let i = 5; i < 10; i += 1) expect(ids).toContain(`t-${i}`)
  })

  it('offers a default length that fits the pool we have', () => {
    expect(DEFAULT_MOCK_SIZE).toBeLessThanOrEqual(POOL.length)
  })
})

describe('scoreBySection', () => {
  const paper = [
    q('a1', 'aptitude', 'logic'),
    q('a2', 'aptitude', 'logic'),
    q('t1', 'technical', 'java'),
    q('t2', 'technical', 'java'),
  ]

  it('counts each section on its own', () => {
    // option 0 is the correct one in the helper above
    const rows = scoreBySection(paper, [0, 1, 0, 0])
    const by = (s: Section) => rows.find((r) => r.section === s)
    expect(by('aptitude')).toMatchObject({ total: 2, correct: 1, percent: 50 })
    expect(by('technical')).toMatchObject({ total: 2, correct: 2, percent: 100 })
  })

  it('treats a blank answer as wrong, not as missing', () => {
    const rows = scoreBySection(paper, [null, null, 0, 0])
    expect(rows.find((r) => r.section === 'aptitude')).toMatchObject({
      total: 2,
      correct: 0,
      percent: 0,
    })
  })

  it('leaves out a section that was not in the paper', () => {
    const rows = scoreBySection(paper, [0, 0, 0, 0])
    expect(rows.map((r) => r.section)).toEqual(['aptitude', 'technical'])
  })

  it('skips a question that is no longer in the app', () => {
    const rows = scoreBySection([paper[0], undefined, paper[2]], [0, 0, 0])
    expect(rows.reduce((sum, r) => sum + r.total, 0)).toBe(2)
  })
})

describe('coverageOf', () => {
  const every: Topic[] = ['java', 'sql', 'css', 'logic']

  it('lists what was asked, most asked first', () => {
    const paper = [
      q('j1', 'technical', 'java'),
      q('j2', 'technical', 'java'),
      q('s1', 'technical', 'sql'),
    ]
    const { asked } = coverageOf(paper, every)
    expect(asked).toEqual([
      { topic: 'java', count: 2 },
      { topic: 'sql', count: 1 },
    ])
  })

  it('names the subjects the paper never touched', () => {
    const paper = [q('j1', 'technical', 'java')]
    expect(coverageOf(paper, every).missed).toEqual(['sql', 'css', 'logic'])
  })

  it('reports nothing missed when every subject came up', () => {
    const paper = every.map((t, i) => q(`x${i}`, 'technical', t))
    expect(coverageOf(paper, every).missed).toEqual([])
  })

  it('ignores a question that is no longer in the app', () => {
    const { asked } = coverageOf([undefined, q('j1', 'technical', 'java')], every)
    expect(asked).toEqual([{ topic: 'java', count: 1 }])
  })
})
