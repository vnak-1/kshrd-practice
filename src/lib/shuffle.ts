// Shuffling uses a seed, so the same practice set keeps the same order after
// the app is closed and reopened. Only the seed is saved, not the whole order.

/** Small, fast, repeatable random number generator. */
export function makeRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}

/** Returns a new shuffled array. The input is not changed. */
export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * The order to show a question's options in, as a list of positions into the
 * original array. Saving positions (not the options themselves) keeps saved
 * sessions small and lets the answer stay correct if the text is edited later.
 */
export function optionOrder(count: number, rand: () => number, fixed = false): number[] {
  const base = Array.from({ length: count }, (_, i) => i)
  return fixed ? base : shuffle(base, rand)
}
