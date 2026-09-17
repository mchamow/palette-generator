import { useCallback, useEffect } from 'react'
import { CodeIcon, HeartIcon, LinkIcon, UndoIcon } from './icons'
import { MODES, PALETTE_SIZE, paletteToCss, type Mode } from './palette'
import { SavedList } from './SavedList'
import { isSaved, useSavedPalettes } from './savedPalettes'
import { SwatchCard } from './SwatchCard'
import { usePalette } from './usePalette'
import { copyText, useToast } from './useToast'

const MODE_LABELS: Record<Mode, string> = {
  analogous: 'Analogous',
  complementary: 'Complementary',
  triadic: 'Triadic',
  monochrome: 'Monochrome',
}

/** Keys typed into these belong to the field, not to our shortcuts. */
const isTextField = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.matches('textarea, select, input:not([type="color"])'))

export default function App() {
  const palette = usePalette()
  const { saved, save, remove } = useSavedPalettes()
  const toast = useToast()
  const { hexes, generate, undo, toggleLock } = palette
  const currentSaved = isSaved(saved, hexes)

  const copy = useCallback(
    async (text: string, done: string) => {
      toast.show((await copyText(text)) ? done : "Couldn't copy to the clipboard")
    },
    [toast],
  )

  const toggleSaved = useCallback(() => {
    if (currentSaved) {
      remove(hexes)
      toast.show('Removed from saved')
    } else {
      save(hexes)
      toast.show('Palette saved')
    }
  }, [currentSaved, hexes, remove, save, toast])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTextField(e.target) || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if (e.metaKey || e.ctrlKey) return
      if (key === ' ') {
        // Also stops Space from clicking whichever button has focus.
        e.preventDefault()
        generate()
      } else if (key === 's') {
        toggleSaved()
      } else if (/^[1-9]$/.test(key) && Number(key) <= PALETTE_SIZE) {
        toggleLock(Number(key) - 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [generate, undo, toggleLock, toggleSaved])

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            {hexes.map((h, i) => (
              <span key={i} style={{ background: h }} />
            ))}
          </span>
          <h1>Palette Generator</h1>
        </div>

        <div className="modes" role="group" aria-label="Harmony">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={palette.mode === m}
              onClick={() => palette.setMode(m)}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="actions">
          <button
            type="button"
            className="btn"
            onClick={undo}
            disabled={!palette.canUndo}
            title="Undo (Z)"
          >
            <UndoIcon /> <span className="btn-label">Undo</span>
          </button>
          <button
            type="button"
            className="btn"
            onClick={toggleSaved}
            aria-pressed={currentSaved}
            title="Save (S)"
          >
            <HeartIcon filled={currentSaved} />{' '}
            <span className="btn-label">{currentSaved ? 'Saved' : 'Save'}</span>
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => copy(paletteToCss(hexes), 'CSS variables copied')}
            title="Copy as CSS variables"
          >
            <CodeIcon /> <span className="btn-label">CSS</span>
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => copy(window.location.href, 'Link copied')}
            title="Copy a link to this palette"
          >
            <LinkIcon /> <span className="btn-label">Link</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={generate}>
            Generate <kbd>Space</kbd>
          </button>
        </div>
      </header>

      <main className="swatches">
        {palette.swatches.map((swatch, i) => (
          <SwatchCard
            key={i}
            swatch={swatch}
            index={i}
            onToggleLock={toggleLock}
            onColorChange={palette.setColor}
            onEditEnd={palette.endEdit}
            onCopy={(hex) => copy(hex.toUpperCase(), `Copied ${hex.toUpperCase()}`)}
          />
        ))}
      </main>

      <SavedList
        saved={saved}
        currentCode={palette.code}
        onLoad={palette.load}
        onRemove={remove}
      />

      <footer className="hints">
        <span>
          <kbd>Space</kbd> generate
        </span>
        <span>
          <kbd>1</kbd>–<kbd>{PALETTE_SIZE}</kbd> lock
        </span>
        <span>
          <kbd>Z</kbd> undo
        </span>
        <span>
          <kbd>S</kbd> save
        </span>
        <span>
          Day 2 of{' '}
          <a href="https://github.com/mchamow?tab=repositories">100 Days of React</a>
        </span>
      </footer>

      <div className="toast" role="status" aria-live="polite">
        {toast.message && <span>{toast.message}</span>}
      </div>
    </div>
  )
}
