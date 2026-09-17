import { describe, expect, it } from 'vitest'
import {
  bestTextColor,
  BLACK,
  contrastRatio,
  formatRatio,
  hexToHsl,
  hexToRgb,
  hslToHex,
  normalizeHex,
  relativeLuminance,
  rgbToHex,
  seededRandom,
  wcagRating,
  WHITE,
  wrapHue,
} from './color'

describe('normalizeHex', () => {
  it.each([
    ['#E5484D', '#e5484d'],
    ['e5484d', '#e5484d'],
    ['#abc', '#aabbcc'],
    ['  FFF ', '#ffffff'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeHex(input)).toBe(expected)
  })

  it.each(['', '#12345', '#ggg000', 'red', '#1234567'])('rejects %j', (input) => {
    expect(normalizeHex(input)).toBeNull()
  })
})

describe('hex / rgb / hsl conversions', () => {
  it('parses and formats hex', () => {
    expect(hexToRgb('#e5484d')).toEqual({ r: 229, g: 72, b: 77 })
    expect(rgbToHex({ r: 229, g: 72, b: 77 })).toBe('#e5484d')
  })

  it('rounds and clamps channels when formatting', () => {
    expect(rgbToHex({ r: 254.6, g: -3, b: 300 })).toBe('#ff00ff')
  })

  it.each([
    ['#ff0000', { h: 0, s: 100, l: 50 }],
    ['#00ff00', { h: 120, s: 100, l: 50 }],
    ['#0000ff', { h: 240, s: 100, l: 50 }],
    ['#ffffff', { h: 0, s: 0, l: 100 }],
    ['#808080', { h: 0, s: 0, l: 50.2 }],
  ])('%s to hsl', (hex, hsl) => {
    const out = hexToHsl(hex)
    expect(out.h).toBeCloseTo(hsl.h, 0)
    expect(out.s).toBeCloseTo(hsl.s, 0)
    expect(out.l).toBeCloseTo(hsl.l, 0)
  })

  it('converts hsl to hex, wrapping out-of-range hues', () => {
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000')
    expect(hslToHex({ h: 480, s: 100, l: 50 })).toBe('#00ff00')
    expect(hslToHex({ h: -120, s: 100, l: 50 })).toBe('#0000ff')
  })

  it('round-trips arbitrary colors', () => {
    for (const hex of ['#e5484d', '#12a594', '#3e63dd', '#1c1c1a', '#f7f7f5', '#7f3fbf']) {
      expect(hslToHex(hexToHsl(hex))).toBe(hex)
    }
  })

  it('wraps hues into [0, 360)', () => {
    expect(wrapHue(370)).toBe(10)
    expect(wrapHue(-30)).toBe(330)
    expect(wrapHue(360)).toBe(0)
  })
})

describe('contrast', () => {
  it('has luminance 0 for black and 1 for white', () => {
    expect(relativeLuminance(BLACK)).toBe(0)
    expect(relativeLuminance(WHITE)).toBe(1)
  })

  it('gives 21:1 for black on white, in either order', () => {
    expect(contrastRatio(BLACK, WHITE)).toBe(21)
    expect(contrastRatio(WHITE, BLACK)).toBe(21)
    expect(contrastRatio('#e5484d', '#e5484d')).toBe(1)
  })

  it('matches a known reference value', () => {
    // #767676 on white is the classic "just passes AA" grey.
    expect(contrastRatio('#767676', WHITE)).toBeCloseTo(4.54, 2)
  })

  it.each([
    [21, 'AAA'],
    [7, 'AAA'],
    [6.99, 'AA'],
    [4.5, 'AA'],
    [4.49, 'AA Large'],
    [3, 'AA Large'],
    [2.99, 'Fail'],
  ] as const)('rates %d as %s', (ratio, rating) => {
    expect(wcagRating(ratio)).toBe(rating)
  })

  it('truncates rather than rounds the displayed ratio', () => {
    expect(formatRatio(4.499)).toBe('4.49')
    expect(formatRatio(21)).toBe('21.00')
  })

  it('picks the more readable text color', () => {
    expect(bestTextColor('#ffff00')).toBe(BLACK)
    expect(bestTextColor('#f7f7f5')).toBe(BLACK)
    expect(bestTextColor('#1c1c1a')).toBe(WHITE)
    expect(bestTextColor('#3e63dd')).toBe(WHITE)
  })
})

describe('seededRandom', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const values = Array.from({ length: 200 }, () => a())
    expect(values).toEqual(Array.from({ length: 200 }, () => b()))
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true)
    expect(seededRandom(43)()).not.toBe(values[0])
  })
})
