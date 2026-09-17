import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { encodePalette, generatePalette } from './palette'
import {
  HISTORY_LIMIT,
  initialPaletteState,
  paletteReducer,
  paletteUrl,
  URL_SYNC_MS,
  usePalette,
  type PaletteAction,
  type PaletteState,
} from './usePalette'

const A = ['#e5484d', '#12a594', '#3e63dd', '#1c1c1a', '#f7f7f5']
const B = ['#111111', '#222222', '#333333', '#444444', '#555555']

const hexes = (state: PaletteState) => state.swatches.map((s) => s.hex)
const locks = (state: PaletteState) => state.swatches.map((s) => s.locked)
const run = (state: PaletteState, ...actions: PaletteAction[]) =>
  actions.reduce(paletteReducer, state)

const start = () => initialPaletteState(`#${encodePalette(A)}`, 1)

describe('initialPaletteState', () => {
  it('uses the palette in the URL hash', () => {
    const state = start()
    expect(hexes(state)).toEqual(A)
    expect(locks(state)).toEqual([false, false, false, false, false])
    expect(state).toMatchObject({ mode: 'analogous', past: [], editing: null })
  })

  it('generates a palette when the hash is missing or invalid', () => {
    expect(hexes(initialPaletteState('', 7))).toEqual(generatePalette('analogous', 7))
    expect(hexes(initialPaletteState('#junk', 7))).toEqual(generatePalette('analogous', 7))
  })
})

describe('paletteReducer', () => {
  it('generate replaces unlocked colors and records history', () => {
    const state = run(start(), { type: 'toggleLock', index: 0 }, { type: 'generate', seed: 3 })
    expect(hexes(state)[0]).toBe(A[0])
    expect(hexes(state).slice(1)).not.toEqual(A.slice(1))
    expect(state.past).toEqual([A])
  })

  it('toggleLock flips one swatch without touching history', () => {
    const state = run(start(), { type: 'toggleLock', index: 2 })
    expect(locks(state)).toEqual([false, false, true, false, false])
    expect(run(state, { type: 'toggleLock', index: 2 }).swatches.every((s) => !s.locked)).toBe(true)
    expect(state.past).toEqual([])
  })

  it('setMode switches mode and generates in it', () => {
    const state = run(start(), { type: 'setMode', mode: 'monochrome', seed: 3 })
    expect(state.mode).toBe('monochrome')
    expect(hexes(state)).toEqual(generatePalette('monochrome', 3))
    expect(state.past).toEqual([A])
  })

  it('setMode to the current mode does nothing', () => {
    const state = start()
    expect(run(state, { type: 'setMode', mode: 'analogous', seed: 3 })).toBe(state)
  })

  it('setColor updates and locks the swatch', () => {
    const state = run(start(), { type: 'setColor', index: 1, hex: '#ABCDEF' })
    expect(hexes(state)[1]).toBe('#abcdef')
    expect(locks(state)).toEqual([false, true, false, false, false])
    expect(state.past).toEqual([A])
  })

  it('setColor ignores invalid input, unknown slots and no-op changes', () => {
    const state = start()
    expect(run(state, { type: 'setColor', index: 1, hex: 'nope' })).toBe(state)
    expect(run(state, { type: 'setColor', index: 9, hex: '#000000' })).toBe(state)
    expect(run(state, { type: 'setColor', index: 1, hex: A[1] })).toBe(state)
  })

  it('a color-picker drag is one undo step, until the edit ends', () => {
    const dragged = run(
      start(),
      { type: 'setColor', index: 0, hex: '#100000' },
      { type: 'setColor', index: 0, hex: '#200000' },
      { type: 'setColor', index: 0, hex: '#300000' },
    )
    expect(dragged.past).toEqual([A])

    const next = run(dragged, { type: 'endEdit' }, { type: 'setColor', index: 0, hex: '#400000' })
    expect(next.past).toHaveLength(2)

    // Moving to another swatch also starts a new step.
    expect(run(dragged, { type: 'setColor', index: 1, hex: '#000001' }).past).toHaveLength(2)
  })

  it('load swaps in a palette with nothing locked', () => {
    const state = run(start(), { type: 'toggleLock', index: 0 }, { type: 'load', hexes: B })
    expect(hexes(state)).toEqual(B)
    expect(locks(state).some(Boolean)).toBe(false)
    expect(state.past).toEqual([A])
  })

  it('loading the palette already shown does nothing', () => {
    const state = start()
    expect(run(state, { type: 'load', hexes: [...A] })).toBe(state)
  })

  it('undo restores the previous colors but keeps current locks', () => {
    const state = run(
      start(),
      { type: 'generate', seed: 3 },
      { type: 'toggleLock', index: 4 },
      { type: 'undo' },
    )
    expect(hexes(state)).toEqual(A)
    expect(locks(state)).toEqual([false, false, false, false, true])
    expect(state.past).toEqual([])
  })

  it('undo steps back one palette at a time and stops at the start', () => {
    const initial = start()
    const once = run(initial, { type: 'generate', seed: 3 })
    const twice = run(once, { type: 'generate', seed: 4 })
    expect(hexes(run(twice, { type: 'undo' }))).toEqual(hexes(once))
    expect(hexes(run(twice, { type: 'undo' }, { type: 'undo' }))).toEqual(A)
    const exhausted = run(initial, { type: 'undo' })
    expect(exhausted).toBe(initial)
  })

  it(`keeps at most ${HISTORY_LIMIT} undo steps`, () => {
    let state = start()
    for (let seed = 0; seed < HISTORY_LIMIT + 10; seed++) {
      state = run(state, { type: 'generate', seed })
    }
    expect(state.past).toHaveLength(HISTORY_LIMIT)
  })
})

describe('usePalette', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    vi.useFakeTimers()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const syncUrl = () => act(() => vi.advanceTimersByTime(URL_SYNC_MS))

  it('starts from the URL hash and writes changes back to it', () => {
    window.history.replaceState(null, '', `/#${encodePalette(A)}`)
    const { result } = renderHook(() => usePalette())
    expect(result.current.hexes).toEqual(A)
    expect(result.current.canUndo).toBe(false)

    act(() => result.current.load(B))
    syncUrl()
    expect(window.location.hash).toBe(`#${encodePalette(B)}`)
    expect(result.current.code).toBe(encodePalette(B))
    expect(result.current.canUndo).toBe(true)

    act(() => result.current.undo())
    syncUrl()
    expect(window.location.hash).toBe(`#${encodePalette(A)}`)
  })

  it('puts a generated palette in the URL when there is none', () => {
    const { result } = renderHook(() => usePalette())
    expect(result.current.hexes).toHaveLength(5)
    syncUrl()
    expect(window.location.hash).toBe(`#${result.current.code}`)
  })

  // Holding Space generates dozens of palettes a second. Chrome silently drops replaceState calls
  // past its rate limit (leaving a stale URL); Safari and Firefox throw a SecurityError.
  it('writes the URL once after a burst of changes', () => {
    const { result } = renderHook(() => usePalette())
    syncUrl()
    const replaceState = vi.spyOn(window.history, 'replaceState')
    for (let i = 0; i < 300; i++) act(() => result.current.generate())
    expect(replaceState).not.toHaveBeenCalled()

    syncUrl()
    expect(replaceState).toHaveBeenCalledTimes(1)
    expect(window.location.hash).toBe(`#${result.current.code}`)
  })

  it('keeps working when the browser rejects URL updates', () => {
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new DOMException('Attempt to use history.replaceState() too often', 'SecurityError')
    })
    const { result } = renderHook(() => usePalette())
    act(() => result.current.generate())
    expect(() => syncUrl()).not.toThrow()
    expect(result.current.hexes).toHaveLength(5)
  })

  it('builds a share link for any palette, independent of the current URL', () => {
    window.history.replaceState(null, '', '/palette-generator/?ref=x#stale')
    expect(paletteUrl('abc')).toBe(`${window.location.origin}/palette-generator/?ref=x#abc`)
  })

  it('loads a palette link opened in the same tab', () => {
    const { result } = renderHook(() => usePalette())
    act(() => {
      window.location.hash = encodePalette(B)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(result.current.hexes).toEqual(B)
  })

  it('ignores hash changes that are not palettes', () => {
    window.history.replaceState(null, '', `/#${encodePalette(A)}`)
    const { result } = renderHook(() => usePalette())
    act(() => {
      window.history.replaceState(null, '', '/#about')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(result.current.hexes).toEqual(A)
  })

  it('generate and setMode produce new palettes', () => {
    window.history.replaceState(null, '', `/#${encodePalette(A)}`)
    const { result } = renderHook(() => usePalette())
    act(() => result.current.toggleLock(0))
    act(() => result.current.generate())
    expect(result.current.hexes[0]).toBe(A[0])
    expect(result.current.hexes).not.toEqual(A)

    act(() => result.current.setMode('triadic'))
    expect(result.current.mode).toBe('triadic')
    expect(result.current.swatches[0]).toEqual({ hex: A[0], locked: true })
  })
})
