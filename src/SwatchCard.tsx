import { cn } from '@/lib/utils'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Lock, LockOpen, Pipette } from 'lucide-react'
import { BLACK, bestTextColor, contrastRatio, formatRatio, wcagRating, WHITE } from './color'
import type { Swatch } from './palette'

interface Props {
  swatch: Swatch
  index: number
  onToggleLock: (index: number) => void
  onColorChange: (index: number, hex: string) => void
  onEditEnd: () => void
  onCopy: (hex: string) => void
}

/** Round tool button tinted with the swatch's own text color, so it reads on any background. */
const toolButton =
  'relative grid size-10 cursor-pointer place-items-center rounded-full bg-current/12 transition-colors hover:bg-current/22 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current aria-pressed:bg-current/28 [&_svg]:size-[18px]'

export function SwatchCard({ swatch, index, onToggleLock, onColorChange, onEditEnd, onCopy }: Props) {
  const { hex, locked } = swatch
  const n = index + 1

  return (
    <section
      className="group/swatch relative flex min-w-0 flex-col justify-between px-4 pt-4.5 pb-5.5 transition-colors duration-350 max-md:min-h-26 max-md:flex-row-reverse max-md:items-center max-md:px-3.5 max-md:py-3"
      style={{ background: hex, color: bestTextColor(hex) }}
      data-locked={locked ? '' : undefined}
      aria-label={`Color ${n}`}
    >
      {/* Tools show on hover/focus; a locked swatch always shows its lock. Touch screens and phones always show them. */}
      <div className="flex justify-center gap-2 opacity-0 transition-opacity group-focus-within/swatch:opacity-100 group-hover/swatch:opacity-100 group-data-locked/swatch:opacity-100 max-md:opacity-100 [@media(hover:none)]:opacity-100">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className={toolButton}
                aria-pressed={locked}
                aria-label={`Lock color ${n}`}
                onClick={() => onToggleLock(index)}
              />
            }
          >
            {locked ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
          </TooltipTrigger>
          <TooltipContent>
            {locked ? 'Unlock' : 'Lock'} <Kbd>{n}</Kbd>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <label
                className={cn(
                  toolButton,
                  'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-current',
                  'md:[[data-locked]:not(:hover,:focus-within)_&]:invisible',
                )}
              />
            }
          >
            <Pipette aria-hidden />
            <input
              type="color"
              value={hex}
              aria-label={`Edit color ${n}`}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              onChange={(e) => onColorChange(index, e.target.value)}
              onBlur={onEditEnd}
            />
          </TooltipTrigger>
          <TooltipContent>Pick a color</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-col items-center gap-3 max-md:flex-row max-md:gap-3.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="cursor-pointer rounded-lg px-2 py-1 font-mono text-[clamp(1.1rem,2vw,1.6rem)] font-bold tracking-wide transition-colors hover:bg-current/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                aria-label={`Copy ${hex.toUpperCase()}`}
                onClick={() => onCopy(hex)}
              />
            }
          >
            {hex.slice(1).toUpperCase()}
          </TooltipTrigger>
          <TooltipContent>Copy hex code</TooltipContent>
        </Tooltip>
        <ul className="flex flex-col gap-1 text-[0.78rem]" aria-label="Text contrast">
          {[WHITE, BLACK].map((text) => {
            const ratio = contrastRatio(hex, text)
            const rating = wcagRating(ratio)
            const name = text === WHITE ? 'White' : 'Black'
            return (
              <li
                key={text}
                className="grid grid-cols-[1.6em_2.6em_auto] items-center gap-1.5"
                title={`${name} text: ${formatRatio(ratio)}:1 (${rating})`}
              >
                <span className="text-base font-bold" style={{ color: text }} aria-hidden="true">
                  Aa
                </span>
                <span className="sr-only">{name} text</span>
                <span className="tabular-nums opacity-85">{formatRatio(ratio)}</span>
                <span
                  className={cn(
                    'justify-self-start rounded-full border border-current/45 px-1.5 py-px text-[0.68rem] font-semibold whitespace-nowrap',
                    rating === 'Fail' && 'border-dashed opacity-75',
                  )}
                >
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
