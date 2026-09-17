export interface Rgb {
  r: number
  g: number
  b: number
}

/** h in degrees [0, 360), s and l in percent [0, 100]. */
export interface Hsl {
  h: number
  s: number
  l: number
}

export const BLACK = '#000000'
export const WHITE = '#ffffff'

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** Accepts `#abc`, `abc`, `#aabbcc` or `aabbcc` (any case); returns `#aabbcc` or null. */
export function normalizeHex(input: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim())
  if (!m) return null
  const digits = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return `#${digits.toLowerCase()}`
}

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l: l * 100 }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return { h: wrapHue(h * 60), s: s * 100, l: l * 100 }
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sn = clamp(s, 0, 100) / 100
  const ln = clamp(l, 0, 100) / 100
  const k = (n: number) => (n + wrapHue(h) / 30) % 12
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 }
}

export const hexToHsl = (hex: string) => rgbToHsl(hexToRgb(hex))
export const hslToHex = (hsl: Hsl) => rgbToHex(hslToRgb(hsl))

export const wrapHue = (h: number) => ((h % 360) + 360) % 360

/** WCAG 2.x relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio between two colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export type WcagRating = 'AAA' | 'AA' | 'AA Large' | 'Fail'

/** Rating for normal-size text; "AA Large" means it only passes for large or bold text. */
export function wcagRating(ratio: number): WcagRating {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA Large'
  return 'Fail'
}

/** Two decimals, truncated rather than rounded so 4.499 never displays as a passing 4.50. */
export const formatRatio = (ratio: number) => (Math.floor(ratio * 100) / 100).toFixed(2)

/** Black or white, whichever is more readable on `background`. */
export function bestTextColor(background: string): string {
  return contrastRatio(background, BLACK) >= contrastRatio(background, WHITE) ? BLACK : WHITE
}

/** Small deterministic PRNG (mulberry32), so palette generation is reproducible in tests. */
export function seededRandom(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}
