import { beforeEach, describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  clearState,
  emptyState,
  loadState,
  parseState,
  saveState,
} from './storage'

beforeEach(() => {
  localStorage.clear()
})

describe('parseState', () => {
  it('gives an empty state for junk', () => {
    expect(parseState(null)).toEqual(emptyState())
    expect(parseState('hello')).toEqual(emptyState())
    expect(parseState(42)).toEqual(emptyState())
    expect(parseState([])).toEqual(emptyState())
  })

  it('throws away a save from an older version', () => {
    const old = { ...emptyState(), version: 0, flagged: ['q1'] }
    expect(parseState(old)).toEqual(emptyState())
  })

  it('keeps good stats', () => {
    const saved = {
      version: 1,
      stats: {
        q1: {
          seen: 3,
          correct: 2,
          wrong: 1,
          inMistakes: true,
          correctDays: ['2026-11-13'],
          lastDay: '2026-11-13',
        },
      },
      flagged: ['q2'],
      session: null,
      lastBackupAt: 123,
      daysPractised: ['2026-11-13'],
    }
    const out = parseState(saved)
    expect(out.stats.q1.seen).toBe(3)
    expect(out.stats.q1.inMistakes).toBe(true)
    expect(out.flagged).toEqual(['q2'])
    expect(out.daysPractised).toEqual(['2026-11-13'])
  })

  it('cleans up broken numbers instead of trusting them', () => {
    const saved = {
      version: 1,
      stats: { q1: { seen: -5, correct: 'two', wrong: NaN, correctDays: 'nope' } },
    }
    const out = parseState(saved)
    expect(out.stats.q1).toEqual({
      seen: 0,
      correct: 0,
      wrong: 0,
      inMistakes: false,
      correctDays: [],
      lastDay: '',
    })
  })

  it('throws away day strings that are not real dates', () => {
    const saved = { version: 1, daysPractised: ['2026-11-13', 'yesterday', 42, null] }
    expect(parseState(saved).daysPractised).toEqual(['2026-11-13'])
  })

  it('throws away a session that is missing its parts', () => {
    expect(parseState({ version: 1, session: { mode: 'learn' } }).session).toBeNull()
  })

  it('throws away a session with no source, which would crash the results page', () => {
    const broken = {
      mode: 'learn',
      ids: ['q1'],
      seed: 5,
      index: 0,
      picked: [null],
      checked: [false],
      startedAt: 1,
      limitMs: null,
      finished: false,
      // source is missing on purpose
    }
    expect(parseState({ version: 1, session: broken }).session).toBeNull()
  })

  it('throws away a session whose source kind is nonsense', () => {
    const session = {
      mode: 'learn',
      source: { kind: 'everything' },
      ids: ['q1'],
      seed: 5,
      index: 0,
      picked: [null],
      checked: [false],
      startedAt: 1,
      limitMs: null,
      finished: false,
    }
    expect(parseState({ version: 1, session }).session).toBeNull()
  })

  it('throws away a topic session with no topic name', () => {
    const session = {
      mode: 'learn',
      source: { kind: 'topic' },
      ids: ['q1'],
      seed: 5,
      index: 0,
      picked: [null],
      checked: [false],
      startedAt: 1,
      limitMs: null,
      finished: false,
    }
    expect(parseState({ version: 1, session }).session).toBeNull()
  })

  it('throws away a session with no finished flag', () => {
    const session = {
      mode: 'learn',
      source: { kind: 'mixed' },
      ids: ['q1'],
      seed: 5,
      index: 0,
      picked: [null],
      checked: [false],
      startedAt: 1,
      limitMs: null,
    }
    expect(parseState({ version: 1, session }).session).toBeNull()
  })

  it('keeps a whole session', () => {
    const session = {
      mode: 'timed',
      source: { kind: 'mixed' },
      ids: ['q1', 'q2'],
      seed: 5,
      index: 1,
      picked: [0, null],
      checked: [true, false],
      startedAt: 1_700_000_000_000,
      limitMs: 600_000,
      finished: false,
    }
    expect(parseState({ version: 1, session })?.session).toEqual(session)
  })
})

describe('saving and loading', () => {
  it('goes out and comes back the same', () => {
    const state = { ...emptyState(), flagged: ['q1'], daysPractised: ['2026-11-13'] }
    expect(saveState(state)).toBe(true)
    expect(loadState()).toEqual(state)
  })

  it('gives an empty state when nothing was ever saved', () => {
    expect(loadState()).toEqual(emptyState())
  })

  it('gives an empty state when the saved text is broken, instead of crashing', () => {
    localStorage.setItem(STORAGE_KEY, '{ this is not json')
    expect(loadState()).toEqual(emptyState())
  })

  it('clears everything', () => {
    saveState({ ...emptyState(), flagged: ['q1'] })
    clearState()
    expect(loadState()).toEqual(emptyState())
  })

  it('says false, and does not throw, when the browser blocks writing', () => {
    // Safari in private mode throws here. The app must survive it.
    const real = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    try {
      expect(saveState(emptyState())).toBe(false)
    } finally {
      Storage.prototype.setItem = real
    }
  })

  it('still loads, as empty, when the browser blocks reading', () => {
    const real = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error('SecurityError')
    }
    try {
      expect(loadState()).toEqual(emptyState())
    } finally {
      Storage.prototype.getItem = real
    }
  })
})
