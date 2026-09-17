import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { X } from 'lucide-react'
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
    <section aria-labelledby="saved-title">
      <h2 id="saved-title" className="my-3 flex items-center gap-2 font-semibold">
        Saved palettes{' '}
        <span className="min-w-6 rounded-full bg-muted px-2 py-px text-center text-xs font-medium text-muted-foreground">
          {saved.length}
        </span>
      </h2>
      {saved.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing saved yet. Press <Kbd>S</Kbd> to save the palette you're looking at.
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
          {saved.map(({ colors }) => {
            const code = encodePalette(colors)
            const names = colors.map((c) => c.toUpperCase()).join(', ')
            const current = code === currentCode
            return (
              <li key={code} className="group/saved relative">
                <button
                  type="button"
                  className="flex h-13 w-full cursor-pointer overflow-hidden rounded-xl ring-1 ring-foreground/10 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=true]:outline-2 aria-[current=true]:outline-offset-2 aria-[current=true]:outline-foreground"
                  aria-label={`Load palette ${names}`}
                  aria-current={current ? 'true' : undefined}
                  title={names}
                  onClick={() => onLoad(colors)}
                >
                  {colors.map((c, i) => (
                    <span key={i} className="flex-1" style={{ background: c }} />
                  ))}
                </button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  className="absolute -top-2 -right-2 rounded-full bg-background opacity-0 shadow-sm group-hover/saved:opacity-100 focus-visible:opacity-100 dark:bg-background [@media(hover:none)]:opacity-100"
                  aria-label={`Delete palette ${names}`}
                  title="Delete"
                  onClick={() => onRemove(colors)}
                >
                  <X aria-hidden />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
