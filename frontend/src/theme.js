import { useCallback, useEffect, useState } from 'react'

const KEY = 'grapht-theme'

function initialTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage blocked: fall through to the OS preference
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Current theme + toggle. Writes data-theme on <html> and remembers the choice. */
export function useTheme() {
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return { theme, toggle }
}

/** Read token values for the Sigma canvas, which can't use CSS classes. */
export function readTokens() {
  const cs = getComputedStyle(document.documentElement)
  const get = (name) => cs.getPropertyValue(name).trim()
  return {
    nodeA: get('--node-a'),
    nodeB: get('--node-b'),
    lineA: get('--line-a'),
    lineB: get('--line-b'),
    edge: get('--edge'),
    ink: get('--ink'),
    page: get('--page'),
  }
}
