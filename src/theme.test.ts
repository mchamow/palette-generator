import { afterEach, expect, it, vi } from 'vitest'
import { followSystemTheme } from './theme'

// jsdom has no matchMedia; this fake lets the test flip the OS setting.
function fakeColorScheme(dark: boolean) {
  const listeners = new Set<() => void>()
  const query = {
    get matches() {
      return dark
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }
  vi.stubGlobal('matchMedia', (q: string) => {
    expect(q).toBe('(prefers-color-scheme: dark)')
    return query
  })
  return {
    set(next: boolean) {
      dark = next
      listeners.forEach((fn) => fn())
    },
    listeners,
  }
}

afterEach(() => vi.unstubAllGlobals())

it('adds .dark when the OS is in dark mode and follows changes', () => {
  const scheme = fakeColorScheme(true)
  const root = document.createElement('html')
  const stop = followSystemTheme(root)
  expect(root.classList.contains('dark')).toBe(true)

  scheme.set(false)
  expect(root.classList.contains('dark')).toBe(false)
  scheme.set(true)
  expect(root.classList.contains('dark')).toBe(true)

  stop()
  expect(scheme.listeners.size).toBe(0)
  scheme.set(false)
  expect(root.classList.contains('dark')).toBe(true)
})

it('leaves .dark off in light mode', () => {
  fakeColorScheme(false)
  const root = document.createElement('html')
  followSystemTheme(root)
  expect(root.classList.contains('dark')).toBe(false)
})
