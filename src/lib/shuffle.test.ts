import { describe, expect, it } from 'vitest'
import { makeRandom, optionOrder, shuffle } from './shuffle'

describe('makeRandom', () => {
  it('gives the same numbers for the same seed', () => {
    const a = makeRandom(12345)
    const b = makeRandom(12345)
    const runA = [a(), a(), a(), a(), a()]
    const runB = [b(), b(), b(), b(), b()]
    expect(runA).toEqual(runB)
  })

  it('gives different numbers for different seeds', () => {
    const a = makeRandom(1)
    const b = makeRandom(2)
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()])
  })

  it('stays between 0 and 1', () => {
    const rand = makeRandom(987)
    for (let i = 0; i < 500; i++) {
      const n = rand()
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
    }
  })
})

describe('shuffle', () => {
  it('keeps every item, loses none and adds none', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const out = shuffle(input, makeRandom(42))
    expect(out.slice().sort((x, y) => x - y)).toEqual(input)
  })

  it('does not change the input array', () => {
    const input = [1, 2, 3, 4, 5]
    const copy = input.slice()
    shuffle(input, makeRandom(7))
    expect(input).toEqual(copy)
  })

  it('really moves things around', () => {
    const input = Array.from({ length: 30 }, (_, i) => i)
    const out = shuffle(input, makeRandom(2026))
    expect(out).not.toEqual(input)
  })
})

describe('optionOrder', () => {
  it('is a permutation: every position appears exactly once', () => {
    const order = optionOrder(4, makeRandom(99))
    expect(order.slice().sort()).toEqual([0, 1, 2, 3])
  })

  it('keeps the original order when the question says fixedOrder', () => {
    const order = optionOrder(4, makeRandom(99), true)
    expect(order).toEqual([0, 1, 2, 3])
  })

  it('gives the same order for the same seed, so reopening the app matches', () => {
    expect(optionOrder(5, makeRandom(31))).toEqual(optionOrder(5, makeRandom(31)))
  })
})
