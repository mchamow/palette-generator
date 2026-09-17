import { describe, expect, it } from 'vitest'
import { hexToHsl, normalizeHex } from './color'
import {
  decodePalette,
  encodePalette,
  generatePalette,
  MODES,
  PALETTE_SIZE,
  paletteToCss,
  regenerate,
  type Swatch,
} from './palette'

const SEEDS = [1, 7, 42, 1234, 99999, 2 ** 32 - 1]

/** Smallest distance between two hues on the color wheel. */
const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

const hues = (hexes: string[]) => hexes.map((h) => hexToHsl(h).h)

describe('generatePalette', () => {
  it.each(MODES)('%s: gives five valid, distinct hex colors', (mode) => {
    for (const seed of SEEDS) {
      const palette = generatePalette(mode, seed)
      expect(palette).toHaveLength(PALETTE_SIZE)
      for (const hex of palette) expect(normalizeHex(hex)).toBe(hex)
      expect(new Set(palette).size).toBe(PALETTE_SIZE)
    }
  })

  it.each(MODES)('%s: same seed, same palette', (mode) => {
    expect(generatePalette(mode, 42)).toEqual(generatePalette(mode, 42))
    expect(generatePalette(mode, 42)).not.toEqual(generatePalette(mode, 43))
  })

  it.each(MODES)('%s: always spans dark to light', (mode) => {
    for (const seed of SEEDS) {
      const lightness = generatePalette(mode, seed).map((h) => hexToHsl(h).l)
      expect(Math.min(...lightness)).toBeLessThan(30)
      expect(Math.max(...lightness)).toBeGreaterThan(75)
    }
  })

  it('monochrome: one hue, ordered dark to light', () => {
    for (const seed of SEEDS) {
      const palette = generatePalette('monochrome', seed, 200)
      for (const h of hues(palette)) expect(hueDistance(h, 200)).toBeLessThanOrEqual(6)
      const lightness = palette.map((h) => hexToHsl(h).l)
      expect(lightness).toEqual([...lightness].sort((a, b) => a - b))
    }
  })

  it('analogous: stays within 50° of the base hue', () => {
    for (const seed of SEEDS) {
      for (const h of hues(generatePalette('analogous', seed, 30))) {
        expect(hueDistance(h, 30)).toBeLessThanOrEqual(50)
      }
    }
  })

  it('complementary: three near the base hue and two opposite it', () => {
    const [a, b, c, d, e] = hues(generatePalette('complementary', 5, 30))
    for (const h of [a, b, c]) expect(hueDistance(h, 30)).toBeLessThanOrEqual(10)
    for (const h of [d, e]) expect(hueDistance(h, 210)).toBeLessThanOrEqual(10)
  })

  it('triadic: hues 120° apart', () => {
    const [a, b, c] = hues(generatePalette('triadic', 5, 0))
    expect(hueDistance(a, 0)).toBeLessThanOrEqual(10)
    expect(hueDistance(b, 120)).toBeLessThanOrEqual(10)
    expect(hueDistance(c, 240)).toBeLessThanOrEqual(10)
  })
})

describe('regenerate', () => {
  const start: Swatch[] = generatePalette('analogous', 1).map((hex) => ({ hex, locked: false }))

  it('replaces every unlocked swatch', () => {
    const next = regenerate(start, 'analogous', 2)
    expect(next.map((s) => s.hex)).toEqual(generatePalette('analogous', 2))
    expect(next.every((s) => !s.locked)).toBe(true)
  })

  it('keeps locked swatches exactly where they are', () => {
    const locked = start.map((s, i) => (i === 1 || i === 3 ? { ...s, locked: true } : s))
    const next = regenerate(locked, 'analogous', 2)
    expect(next[1]).toEqual(locked[1])
    expect(next[3]).toEqual(locked[3])
    expect(next[0].hex).not.toBe(start[0].hex)
  })

  it('builds the new colors around the first locked color', () => {
    // A red locked in slot 3 of a complementary palette (the "opposite" slot)
    // means the base hue is cyan, so slots 0–2 come out cyan-ish.
    const swatches = start.map((s, i) => (i === 3 ? { hex: '#ff0000', locked: true } : s))
    for (const seed of SEEDS) {
      const next = regenerate(swatches, 'complementary', seed)
      for (const h of hues(next.slice(0, 3).map((s) => s.hex))) {
        expect(hueDistance(h, 180)).toBeLessThanOrEqual(10)
      }
    }
  })

  it('returns the same palette when everything is locked', () => {
    const all = start.map((s) => ({ ...s, locked: true }))
    expect(regenerate(all, 'triadic', 9)).toEqual(all)
  })
})

describe('encode / decode', () => {
  const palette = ['#e5484d', '#12a594', '#3e63dd', '#1c1c1a', '#f7f7f5']

  it('round-trips a palette', () => {
    expect(encodePalette(palette)).toBe('e5484d-12a594-3e63dd-1c1c1a-f7f7f5')
    expect(decodePalette(encodePalette(palette))).toEqual(palette)
  })

  it('accepts a leading # and upper case', () => {
    expect(decodePalette('#E5484D-12A594-3E63DD-1C1C1A-F7F7F5')).toEqual(palette)
  })

  it.each([
    '',
    '#',
    'e5484d-12a594-3e63dd-1c1c1a',
    'e5484d-12a594-3e63dd-1c1c1a-f7f7f5-000000',
    'e5484d-12a594-3e63dd-1c1c1a-zzzzzz',
    'e5484d-12a594-3e63dd-1c1c1a-fff',
  ])('rejects %j', (code) => {
    expect(decodePalette(code)).toBeNull()
  })
})

it('exports CSS custom properties', () => {
  expect(paletteToCss(['#111111', '#222222'])).toBe(
    ':root {\n  --color-1: #111111;\n  --color-2: #222222;\n}\n',
  )
})
