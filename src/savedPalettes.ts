import { useCallback, useEffect, useState } from 'react'
import { decodePalette, encodePalette } from './palette'

export interface SavedPalette {
  colors: string[]
  savedAt: number
}

export const STORAGE_KEY = 'palette-generator:saved'
export const MAX_SAVED = 60

function parseColors(value: unknown): string[] | null {
  const valid =
    Array.isArray(value) && value.every((c) => typeof c === 'string' && c.startsWith('#'))
  return valid ? decodePalette(encodePalette(value)) : null
}

export function loadSaved(): SavedPalette[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    // Drop anything malformed rather than letting one bad entry break the app.
    return raw.flatMap((entry): SavedPalette[] => {
      const colors = parseColors(entry?.colors)
      return colors && typeof entry.savedAt === 'number' ? [{ colors, savedAt: entry.savedAt }] : []
    })
  } catch {
    return []
  }
}

export function storeSaved(list: SavedPalette[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Storage can be unavailable (private mode, quota); saving just won't persist.
  }
}

export const isSaved = (list: SavedPalette[], colors: string[]) =>
  list.some((p) => encodePalette(p.colors) === encodePalette(colors))

/** Adds to the front; a palette that's already saved is left where it is. */
export function addPalette(list: SavedPalette[], colors: string[], now: number): SavedPalette[] {
  if (isSaved(list, colors)) return list
  return [{ colors, savedAt: now }, ...list].slice(0, MAX_SAVED)
}

export const removePalette = (list: SavedPalette[], colors: string[]) =>
  list.filter((p) => encodePalette(p.colors) !== encodePalette(colors))

export function useSavedPalettes() {
  const [saved, setSaved] = useState(loadSaved)

  useEffect(() => storeSaved(saved), [saved])

  const save = useCallback((colors: string[]) => {
    const now = Date.now()
    setSaved((list) => addPalette(list, colors, now))
  }, [])

  const remove = useCallback((colors: string[]) => {
    setSaved((list) => removePalette(list, colors))
  }, [])

  return { saved, save, remove }
}
