'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  window.localStorage.setItem('site-theme', theme)
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = window.localStorage.getItem('site-theme')
    return saved === 'light' || saved === 'dark' ? saved : 'light'
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => {
        setTheme(nextTheme)
      }}
      aria-label={`Cambiar a modo ${nextTheme === 'light' ? 'claro' : 'oscuro'}`}
      title={`Modo ${theme === 'dark' ? 'oscuro' : 'claro'}`}
    >
      {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
      <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
