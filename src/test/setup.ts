import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

afterEach(() => {
  try {
    window.localStorage.clear()
  } catch {
    // Some test environments block localStorage. Nothing to clean then.
  }
})
