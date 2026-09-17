import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addPalette,
  isSaved,
  loadSaved,
  MAX_SAVED,
  removePalette,
  STORAGE_KEY,
  storeSaved,
  useSavedPalettes,
  type SavedPalette,
} from './savedPalettes'

const A = ['#e5484d', '#12a594', '#3e63dd', '#1c1c1a', '#f7f7f5']
const B = ['#111111', '#222222', '#333333', '#444444', '#555555']

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('list operations', () => {
  it('adds new palettes to the front', () => {
    const list = addPalette(addPalette([], A, 1), B, 2)
    expect(list).toEqual([
      { colors: B, savedAt: 2 },
      { colors: A, savedAt: 1 },
    ])
  })

  it('does not add a duplicate', () => {
    const list = addPalette([], A, 1)
    expect(addPalette(list, [...A], 2)).toBe(list)
    expect(isSaved(list, [...A])).toBe(true)
    expect(isSaved(list, B)).toBe(false)
  })

  it(`keeps at most ${MAX_SAVED}`, () => {
    let list: SavedPalette[] = []
    for (let i = 0; i < MAX_SAVED + 5; i++) {
      const hex = `#${i.toString(16).padStart(6, '0')}`
      list = addPalette(list, [hex, ...B.slice(1)], i)
    }
    expect(list).toHaveLength(MAX_SAVED)
    expect(list[0].savedAt).toBe(MAX_SAVED + 4)
  })

  it('removes by colors', () => {
    const list = addPalette(addPalette([], A, 1), B, 2)
    expect(removePalette(list, A)).toEqual([{ colors: B, savedAt: 2 }])
  })
})

describe('loadSaved / storeSaved', () => {
  it('round-trips', () => {
    const list = [{ colors: A, savedAt: 5 }]
    storeSaved(list)
    expect(loadSaved()).toEqual(list)
  })

  it('returns an empty list when nothing is stored or data is corrupt', () => {
    expect(loadSaved()).toEqual([])
    localStorage.setItem(STORAGE_KEY, '{nope')
    expect(loadSaved()).toEqual([])
    localStorage.setItem(STORAGE_KEY, '{"colors": []}')
    expect(loadSaved()).toEqual([])
  })

  it('drops malformed entries but keeps the good ones', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { colors: A, savedAt: 1 },
        { colors: ['#fff'], savedAt: 2 },
        { colors: [1, 2, 3, 4, 5], savedAt: 3 },
        { colors: B },
        null,
        'x',
        { colors: B.map((c) => c.toUpperCase()), savedAt: 4 },
      ]),
    )
    expect(loadSaved()).toEqual([
      { colors: A, savedAt: 1 },
      { colors: B, savedAt: 4 },
    ])
  })

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => storeSaved([{ colors: A, savedAt: 1 }])).not.toThrow()
    expect(loadSaved()).toEqual([])
  })
})

describe('useSavedPalettes', () => {
  it('saves, removes and persists', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000)
    const { result, unmount } = renderHook(() => useSavedPalettes())
    expect(result.current.saved).toEqual([])

    act(() => result.current.save(A))
    act(() => result.current.save(B))
    expect(result.current.saved.map((p) => p.colors)).toEqual([B, A])

    act(() => result.current.remove(B))
    expect(result.current.saved).toEqual([{ colors: A, savedAt: 1000 }])
    unmount()

    // A fresh mount (like a page reload) reads the saved list back.
    expect(renderHook(() => useSavedPalettes()).result.current.saved).toEqual([
      { colors: A, savedAt: 1000 },
    ])
  })
})
