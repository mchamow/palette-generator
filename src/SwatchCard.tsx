import { BLACK, bestTextColor, contrastRatio, formatRatio, wcagRating, WHITE } from './color'
import { LockIcon, PipetteIcon, UnlockIcon } from './icons'
import type { Swatch } from './palette'

interface Props {
  swatch: Swatch
  index: number
  onToggleLock: (index: number) => void
  onColorChange: (index: number, hex: string) => void
  onEditEnd: () => void
  onCopy: (hex: string) => void
}

export function SwatchCard({ swatch, index, onToggleLock, onColorChange, onEditEnd, onCopy }: Props) {
  const { hex, locked } = swatch
  const n = index + 1

  return (
    <section
      className={`swatch${locked ? ' is-locked' : ''}`}
      style={{ background: hex, color: bestTextColor(hex) }}
      aria-label={`Color ${n}`}
    >
      <div className="swatch-tools">
        <button
          type="button"
          className="swatch-btn"
          aria-pressed={locked}
          aria-label={`Lock color ${n}`}
          title={`${locked ? 'Unlock' : 'Lock'} (${n})`}
          onClick={() => onToggleLock(index)}
        >
          {locked ? <LockIcon /> : <UnlockIcon />}
        </button>
        <label className="swatch-btn" title="Pick a color">
          <PipetteIcon />
          <input
            type="color"
            value={hex}
            aria-label={`Edit color ${n}`}
            onChange={(e) => onColorChange(index, e.target.value)}
            onBlur={onEditEnd}
          />
        </label>
      </div>

      <div className="swatch-info">
        <button
          type="button"
          className="swatch-hex"
          title="Copy hex code"
          aria-label={`Copy ${hex.toUpperCase()}`}
          onClick={() => onCopy(hex)}
        >
          {hex.slice(1).toUpperCase()}
        </button>
        <ul className="contrast" aria-label="Text contrast">
          {[WHITE, BLACK].map((text) => {
            const ratio = contrastRatio(hex, text)
            const rating = wcagRating(ratio)
            const name = text === WHITE ? 'White' : 'Black'
            return (
              <li key={text} title={`${name} text: ${formatRatio(ratio)}:1 (${rating})`}>
                <span className="contrast-sample" style={{ color: text }} aria-hidden="true">
                  Aa
                </span>
                <span className="sr-only">{name} text</span>
                <span className="contrast-ratio">{formatRatio(ratio)}</span>
                <span className={`contrast-rating${rating === 'Fail' ? ' is-fail' : ''}`}>
                  {rating}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
