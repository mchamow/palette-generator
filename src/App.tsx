import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Code, Heart, Link, Undo2 } from 'lucide-react'
import { useCallback, useEffect, type ComponentProps, type ReactNode } from 'react'
import { MODES, PALETTE_SIZE, paletteToCss, type Mode } from './palette'
import { SavedList } from './SavedList'
import { isSaved, useSavedPalettes } from './savedPalettes'
import { SwatchCard } from './SwatchCard'
import { paletteUrl, usePalette } from './usePalette'
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

/** Outline button whose text label collapses to screen-reader-only on phones. */
function ToolbarButton({
  label,
  hint,
  children,
  ...props
}: ComponentProps<typeof Button> & { label: string; hint: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" size="lg" className="px-3" {...props} />}>
        {children}
        <span className="max-md:sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  )
}

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
    <TooltipProvider>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-5 pt-4 pb-8 max-md:px-3 max-md:pt-3 max-md:pb-22">
        <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-7 overflow-hidden rounded-lg ring-1 ring-foreground/10"
              aria-hidden="true"
            >
              {hexes.map((h, i) => (
                <span key={i} className="flex-1 transition-colors duration-300" style={{ background: h }} />
              ))}
            </span>
            <h1 className="text-lg font-semibold tracking-tight">Palette Generator</h1>
          </div>

          <ToggleGroup
            aria-label="Harmony"
            value={[palette.mode]}
            // Clicking the selected mode again would empty the group; keep one mode selected.
            onValueChange={([next]) => next && palette.setMode(next as Mode)}
            spacing={1}
            className="rounded-full border bg-card p-0.5 max-md:w-full"
          >
            {MODES.map((m) => (
              <ToggleGroupItem
                key={m}
                value={m}
                className="rounded-full px-3.5 text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground max-md:flex-auto max-md:px-1 max-md:text-xs"
              >
                {MODE_LABELS[m]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="flex flex-wrap gap-2 max-md:w-full">
            <ToolbarButton
              label="Undo"
              hint={
                <>
                  Undo <Kbd>Z</Kbd>
                </>
              }
              onClick={undo}
              disabled={!palette.canUndo}
            >
              <Undo2 aria-hidden />
            </ToolbarButton>
            <ToolbarButton
              label={currentSaved ? 'Saved' : 'Save'}
              hint={
                <>
                  {currentSaved ? 'Remove from saved' : 'Save'} <Kbd>S</Kbd>
                </>
              }
              aria-pressed={currentSaved}
              onClick={toggleSaved}
            >
              <Heart aria-hidden className={cn(currentSaved && 'fill-current text-red-500')} />
            </ToolbarButton>
            <ToolbarButton
              label="CSS"
              hint="Copy as CSS variables"
              onClick={() => copy(paletteToCss(hexes), 'CSS variables copied')}
            >
              <Code aria-hidden />
            </ToolbarButton>
            <ToolbarButton
              label="Link"
              hint="Copy a link to this palette"
              onClick={() => copy(paletteUrl(palette.code), 'Link copied')}
            >
              <Link aria-hidden />
            </ToolbarButton>
            <Button size="lg" className="px-3.5 max-md:ml-auto" onClick={generate}>
              Generate
              <Kbd className="bg-primary-foreground/15 text-primary-foreground/75 max-md:hidden">
                Space
              </Kbd>
            </Button>
          </div>
        </header>

        <main className="grid h-[clamp(420px,68vh,680px)] grid-cols-5 overflow-hidden rounded-2xl shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_30px_rgb(0_0_0/0.08)] max-md:h-auto max-md:grid-cols-1">
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

        <footer className="flex flex-wrap items-center gap-x-4.5 gap-y-2 border-t pt-2 text-xs text-muted-foreground">
          <span className="max-md:hidden">
            <Kbd>Space</Kbd> generate
          </span>
          <span className="max-md:hidden">
            <Kbd>1</Kbd>–<Kbd>{PALETTE_SIZE}</Kbd> lock
          </span>
          <span className="max-md:hidden">
            <Kbd>Z</Kbd> undo
          </span>
          <span className="max-md:hidden">
            <Kbd>S</Kbd> save
          </span>
          <span className="md:ml-auto">
            Day 2 of{' '}
            <a className="underline underline-offset-2 hover:text-foreground" href="https://github.com/mchamow?tab=repositories">
              100 Days of React
            </a>
          </span>
        </footer>

        <div
          className="pointer-events-none fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          {toast.message && (
            <span className="block animate-in rounded-full bg-foreground px-4 py-2.5 text-sm font-medium whitespace-nowrap text-background shadow-lg duration-200 fade-in-0 slide-in-from-bottom-2">
              {toast.message}
            </span>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
