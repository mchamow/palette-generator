import { useCallback, useEffect, useRef, useState } from 'react'

export const TOAST_MS = 1800

/** A short status message that clears itself. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback((text: string) => {
    clearTimeout(timer.current)
    setMessage(text)
    timer.current = setTimeout(() => setMessage(null), TOAST_MS)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return { message, show }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // No clipboard API (insecure context) or permission denied.
    return false
  }
}
