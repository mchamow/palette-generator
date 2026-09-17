import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { encodePalette, paletteToCss } from './palette'
import { STORAGE_KEY } from './savedPalettes'
import { TOAST_MS } from './useToast'

const A = ['#e5484d', '#12a594', '#3e63dd', '#1c1c1a', '#f7f7f5']
const B = ['#111111', '#222222', '#333333', '#444444', '#555555']

// jsdom has no clipboard.
const writeText = vi.fn<(text: string) => Promise<void>>()

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', `/#${encodePalette(A)}`)
  writeText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

const hexes = () =>
  screen
    .getAllByRole('button', { name: /^Copy #/ })
    .map((b) => b.getAttribute('aria-label')!.slice('Copy '.length).toLowerCase())
const press = (key: string, init: KeyboardEventInit = {}, target: Element = document.body) =>
  fireEvent.keyDown(target, { key, ...init })
const lockButton = (n: number) => screen.getByRole('button', { name: `Lock color ${n}` })
const toast = () => screen.getByRole('status')

describe('App', () => {
  it('shows the five colors from the URL with their contrast ratings', () => {
    render(<App />)
    expect(screen.getAllByRole('region', { name: /^Color \d$/ })).toHaveLength(5)
    expect(hexes()).toEqual(A)

    // #1C1C1A: white text is very readable, black text is not.
    const dark = within(screen.getByRole('region', { name: 'Color 4' }))
    const [onWhite, onBlack] = within(dark.getByRole('list', { name: 'Text contrast' })).getAllByRole(
      'listitem',
    )
    expect(onWhite.textContent).toBe('AaWhite text17.06AAA')
    expect(onBlack.textContent).toMatch(/^AaBlack text1\.\d\dFail$/)
  })

  it('generates a new palette with Space, keeping locked colors', () => {
    render(<App />)
    press('2')
    expect(lockButton(2).getAttribute('aria-pressed')).toBe('true')

    press(' ')
    const next = hexes()
    expect(next).not.toEqual(A)
    expect(next[1]).toBe(A[1])
    expect(window.location.hash).toBe(`#${encodePalette(next)}`)
  })

  it('Space generates instead of pressing the focused button', () => {
    render(<App />)
    lockButton(1).focus()
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    act(() => {
      lockButton(1).dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
    expect(hexes()).not.toEqual(A)
    expect(lockButton(1).getAttribute('aria-pressed')).toBe('false')
  })

  it('locks with the lock buttons and number keys', () => {
    render(<App />)
    fireEvent.click(lockButton(5))
    expect(lockButton(5).getAttribute('aria-pressed')).toBe('true')
    press('5')
    expect(lockButton(5).getAttribute('aria-pressed')).toBe('false')
    press('6') // there is no sixth color
    press('0')
  })

  it('switches harmony mode, which also generates', () => {
    render(<App />)
    const mono = screen.getByRole('button', { name: 'Monochrome' })
    fireEvent.click(mono)
    expect(mono.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Analogous' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
    expect(hexes()).not.toEqual(A)
  })

  it('undoes with the button, Z and Ctrl/Cmd+Z', () => {
    render(<App />)
    const undo = screen.getByRole('button', { name: 'Undo' })
    expect(undo).toHaveProperty('disabled', true)

    for (let i = 0; i < 4; i++) press(' ')
    fireEvent.click(undo)
    press('z', { ctrlKey: true })
    press('Z', { metaKey: true })
    expect(hexes()).not.toEqual(A) // three of four undone
    press('z')
    expect(hexes()).toEqual(A)
    expect(undo).toHaveProperty('disabled', true)
  })

  it('ignores shortcuts typed into a text field and with Alt held', () => {
    render(<App />)
    const input = document.body.appendChild(document.createElement('input'))
    press(' ', {}, input)
    press('1', {}, input)
    press(' ', { altKey: true })
    press('s', { metaKey: true })
    expect(hexes()).toEqual(A)
    expect(lockButton(1).getAttribute('aria-pressed')).toBe('false')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]')
    input.remove()
  })

  it('edits a color with the picker and locks it', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Edit color 3'), { target: { value: '#00ff88' } })
    expect(hexes()[2]).toBe('#00ff88')
    expect(lockButton(3).getAttribute('aria-pressed')).toBe('true')
  })

  it('copies a hex code and shows a toast that clears itself', async () => {
    vi.useFakeTimers()
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy #E5484D' }))
    })
    expect(writeText).toHaveBeenCalledWith('#E5484D')
    expect(toast().textContent).toBe('Copied #E5484D')

    act(() => vi.advanceTimersByTime(TOAST_MS))
    expect(toast().textContent).toBe('')
  })

  it('copies CSS variables and a share link', async () => {
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'CSS' }))
    })
    expect(writeText).toHaveBeenLastCalledWith(paletteToCss(A))
    expect(toast().textContent).toBe('CSS variables copied')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Link' }))
    })
    expect(writeText).toHaveBeenLastCalledWith(window.location.href)
    expect(window.location.href).toMatch(new RegExp(`#${encodePalette(A)}$`))
    expect(toast().textContent).toBe('Link copied')
  })

  it('tells you when copying fails', async () => {
    writeText.mockRejectedValue(new Error('NotAllowedError'))
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy #12A594' }))
    })
    expect(toast().textContent).toBe("Couldn't copy to the clipboard")
  })

  it('saves, loads and deletes palettes', () => {
    render(<App />)
    const saved = () => screen.getByRole('region', { name: /^Saved palettes/ })
    expect(within(saved()).getByText(/Nothing saved yet/)).toBeTruthy()

    press('s')
    expect(toast().textContent).toBe('Palette saved')
    expect(screen.getByRole('button', { name: 'Saved' }).getAttribute('aria-pressed')).toBe('true')

    // Load a second palette via its link, save it with the button, then go back to the first.
    act(() => {
      window.location.hash = encodePalette(B)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    const names = (colors: string[]) => colors.map((c) => c.toUpperCase()).join(', ')
    expect(within(saved()).getAllByRole('button', { name: /^Load palette/ })).toHaveLength(2)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toHaveLength(2)

    fireEvent.click(within(saved()).getByRole('button', { name: `Load palette ${names(A)}` }))
    expect(hexes()).toEqual(A)
    expect(
      within(saved())
        .getByRole('button', { name: `Load palette ${names(A)}` })
        .getAttribute('aria-current'),
    ).toBe('true')

    fireEvent.click(within(saved()).getByRole('button', { name: `Delete palette ${names(B)}` }))
    expect(within(saved()).getAllByRole('button', { name: /^Load palette/ })).toHaveLength(1)

    // S on a saved palette un-saves it.
    press('s')
    expect(toast().textContent).toBe('Removed from saved')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]')
  })

  it('shows palettes saved in an earlier visit', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ colors: B, savedAt: 1 }]))
    render(<App />)
    expect(screen.getByRole('button', { name: /^Load palette #111111/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('aria-pressed')).toBe('false')
  })
})
