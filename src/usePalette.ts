import { useEffect, useMemo, useReducer } from 'react'
import { normalizeHex } from './color'
import {
  decodePalette,
  encodePalette,
  generatePalette,
  randomSeed,
  regenerate,
  type Mode,
  type Swatch,
} from './palette'

export interface PaletteState {
  swatches: Swatch[]
  mode: Mode
  /** Earlier palettes (hex codes only), newest last, for undo. */
  past: string[][]
  /** Swatch currently being dragged in the color picker; its edits share one undo step. */
  editing: number | null
}

export type PaletteAction =
  | { type: 'generate'; seed: number }
  | { type: 'setMode'; mode: Mode; seed: number }
  | { type: 'toggleLock'; index: number }
  | { type: 'setColor'; index: number; hex: string }
  | { type: 'endEdit' }
  | { type: 'load'; hexes: string[] }
  | { type: 'undo' }

export const HISTORY_LIMIT = 50

const hexesOf = (swatches: Swatch[]) => swatches.map((s) => s.hex)
const unlocked = (hexes: string[]): Swatch[] => hexes.map((hex) => ({ hex, locked: false }))

function withHistory(state: PaletteState, swatches: Swatch[]): PaletteState {
  return {
    ...state,
    swatches,
    past: [...state.past, hexesOf(state.swatches)].slice(-HISTORY_LIMIT),
    editing: null,
  }
}

export function initialPaletteState(hash: string, seed: number): PaletteState {
  return {
    swatches: unlocked(decodePalette(hash) ?? generatePalette('analogous', seed)),
    mode: 'analogous',
    past: [],
    editing: null,
  }
}

export function paletteReducer(state: PaletteState, action: PaletteAction): PaletteState {
  switch (action.type) {
    case 'generate':
      return withHistory(state, regenerate(state.swatches, state.mode, action.seed))

    case 'setMode':
      if (action.mode === state.mode) return state
      return {
        ...withHistory(state, regenerate(state.swatches, action.mode, action.seed)),
        mode: action.mode,
      }

    case 'toggleLock':
      return {
        ...state,
        swatches: state.swatches.map((s, i) =>
          i === action.index ? { ...s, locked: !s.locked } : s,
        ),
      }

    case 'setColor': {
      const hex = normalizeHex(action.hex)
      if (!hex || !state.swatches[action.index] || state.swatches[action.index].hex === hex) {
        return state
      }
      // A color you picked yourself is locked so the next generate keeps it.
      const swatches = state.swatches.map((s, i) => (i === action.index ? { hex, locked: true } : s))
      if (state.editing === action.index) return { ...state, swatches }
      return { ...withHistory(state, swatches), editing: action.index }
    }

    case 'endEdit':
      return state.editing === null ? state : { ...state, editing: null }

    case 'load':
      if (encodePalette(action.hexes) === encodePalette(hexesOf(state.swatches))) return state
      return withHistory(state, unlocked(action.hexes))

    case 'undo': {
      const previous = state.past.at(-1)
      if (!previous) return state
      return {
        ...state,
        // Locks are left as they are; only the colors go back.
        swatches: state.swatches.map((s, i) => ({ ...s, hex: previous[i] })),
        past: state.past.slice(0, -1),
        editing: null,
      }
    }
  }
}

export function usePalette() {
  const [state, dispatch] = useReducer(paletteReducer, null, () =>
    initialPaletteState(window.location.hash, randomSeed()),
  )
  const hexes = useMemo(() => hexesOf(state.swatches), [state.swatches])
  const code = encodePalette(hexes)

  // Keep the URL shareable. replaceState doesn't fire hashchange, so this can't loop.
  useEffect(() => {
    window.history.replaceState(window.history.state, '', `#${code}`)
  }, [code])

  // A palette link pasted into the address bar of an already-open tab.
  useEffect(() => {
    const onHashChange = () => {
      const decoded = decodePalette(window.location.hash)
      if (decoded) dispatch({ type: 'load', hexes: decoded })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const actions = useMemo(
    () => ({
      generate: () => dispatch({ type: 'generate', seed: randomSeed() }),
      setMode: (mode: Mode) => dispatch({ type: 'setMode', mode, seed: randomSeed() }),
      toggleLock: (index: number) => dispatch({ type: 'toggleLock', index }),
      setColor: (index: number, hex: string) => dispatch({ type: 'setColor', index, hex }),
      endEdit: () => dispatch({ type: 'endEdit' }),
      load: (next: string[]) => dispatch({ type: 'load', hexes: next }),
      undo: () => dispatch({ type: 'undo' }),
    }),
    [],
  )

  return {
    swatches: state.swatches,
    hexes,
    code,
    mode: state.mode,
    canUndo: state.past.length > 0,
    ...actions,
  }
}
