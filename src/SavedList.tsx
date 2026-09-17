import { CloseIcon } from './icons'
import { encodePalette } from './palette'
import type { SavedPalette } from './savedPalettes'

interface Props {
  saved: SavedPalette[]
  currentCode: string
  onLoad: (colors: string[]) => void
  onRemove: (colors: string[]) => void
}

export function SavedList({ saved, currentCode, onLoad, onRemove }: Props) {
  return (
    <section className="saved" aria-labelledby="saved-title">
      <h2 id="saved-title">
        Saved palettes <span className="count">{saved.length}</span>
      </h2>
      {saved.length === 0 ? (
        <p className="empty">
          Nothing saved yet. Press <kbd>S</kbd> to save the palette you're looking at.
        </p>
      ) : (
        <ul className="saved-list">
          {saved.map(({ colors }) => {
            const code = encodePalette(colors)
            const names = colors.map((c) => c.toUpperCase()).join(', ')
            return (
              <li key={code} className={`saved-item${code === currentCode ? ' is-current' : ''}`}>
                <button
                  type="button"
                  className="saved-strip"
                  aria-label={`Load palette ${names}`}
                  aria-current={code === currentCode ? 'true' : undefined}
                  title={names}
                  onClick={() => onLoad(colors)}
                >
                  {colors.map((c, i) => (
                    <span key={i} style={{ background: c }} />
                  ))}
                </button>
                <button
                  type="button"
                  className="saved-remove"
                  aria-label={`Delete palette ${names}`}
                  title="Delete"
                  onClick={() => onRemove(colors)}
                >
                  <CloseIcon />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
