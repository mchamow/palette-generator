/**
 * Mirrors the OS light/dark setting onto the `.dark` class that shadcn's theme keys off.
 * Returns a function that stops following it.
 */
export function followSystemTheme(root: HTMLElement = document.documentElement) {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  const apply = () => root.classList.toggle('dark', query.matches)
  apply()
  query.addEventListener('change', apply)
  return () => query.removeEventListener('change', apply)
}
