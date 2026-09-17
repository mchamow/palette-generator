import { hexToHsl, hslToHex, normalizeHex, seededRandom, wrapHue } from './color'

export const PALETTE_SIZE = 5

export const MODES = ['analogous', 'complementary', 'triadic', 'monochrome'] as const
export type Mode = (typeof MODES)[number]

export interface Swatch {
  hex: string
  locked: boolean
}

/** Hue offset (degrees from the base hue) of each palette slot, per mode. */
const HUE_OFFSETS: Record<Mode, number[]> = {
  analogous: [-40, -20, 0, 20, 40],
  complementary: [0, 0, 0, 180, 180],
  triadic: [0, 120, 240, 0, 120],
  monochrome: [0, 0, 0, 0, 0],
}

/** Evenly spread lightness levels, so every palette has darks and lights. */
const LIGHTNESS_STEPS = [20, 36, 52, 68, 84]

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Generates a harmonious palette. With `baseHue` omitted a random one is picked.
 * The same `seed` always gives the same palette.
 */
export function generatePalette(mode: Mode, seed: number, baseHue?: number): string[] {
  const rand = seededRandom(seed)
  const base = baseHue ?? rand() * 360
  const jitter = (amount: number) => (rand() * 2 - 1) * amount

  if (mode === 'monochrome') {
    const s = 35 + rand() * 45
    // Dark to light reads naturally for a single-hue ramp.
    return LIGHTNESS_STEPS.map((l) =>
      hslToHex({ h: wrapHue(base + jitter(4)), s: s + jitter(8), l: l + jitter(3) }),
    )
  }

  const lightness = shuffle(LIGHTNESS_STEPS, rand)
  return HUE_OFFSETS[mode].map((offset, i) =>
    hslToHex({
      h: wrapHue(base + offset + jitter(6)),
      s: 45 + rand() * 40,
      l: lightness[i] + jitter(4),
    }),
  )
}

/**
 * A fresh palette that keeps locked swatches in place. The first locked color sets the base hue,
 * so the new colors stay in harmony with it.
 */
export function regenerate(swatches: Swatch[], mode: Mode, seed: number): Swatch[] {
  const anchor = swatches.findIndex((s) => s.locked)
  const baseHue =
    anchor === -1 ? undefined : wrapHue(hexToHsl(swatches[anchor].hex).h - HUE_OFFSETS[mode][anchor])
  const fresh = generatePalette(mode, seed, baseHue)
  return swatches.map((s, i) => (s.locked ? s : { hex: fresh[i], locked: false }))
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 32)

/** `#e5484d`, … → `e5484d-12a594-…` (used in the URL hash and as the saved-palette key). */
export const encodePalette = (hexes: string[]) => hexes.map((h) => h.slice(1)).join('-')

export function decodePalette(code: string): string[] | null {
  const parts = code.replace(/^#/, '').split('-')
  if (parts.length !== PALETTE_SIZE) return null
  const hexes = parts.map((p) => (p.length === 6 ? normalizeHex(p) : null))
  return hexes.every((h): h is string => h !== null) ? hexes : null
}

export function paletteToCss(hexes: string[]): string {
  const vars = hexes.map((h, i) => `  --color-${i + 1}: ${h};`).join('\n')
  return `:root {\n${vars}\n}\n`
}
