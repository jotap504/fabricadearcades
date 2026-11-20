'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  window.localStorage.setItem('site-theme', theme)
}

interface ThemeToggleProps {
  /** `pill` shows the icon plus a Light/Dark label; `icon` is a compact icon-only button for the site header. */
  variant?: 'pill' | 'icon'
}

export function ThemeToggle({ variant = 'pill' }: ThemeToggleProps) {
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
      className={variant === 'icon' ? 'header-control theme-toggle-icon' : 'theme-toggle'}
      onClick={() => {
        setTheme(nextTheme)
      }}
      aria-label={`Cambiar a modo ${nextTheme === 'light' ? 'claro' : 'oscuro'}`}
      title={`Modo ${theme === 'dark' ? 'oscuro' : 'claro'}`}
    >
      {theme === 'dark' ? <Moon size={variant === 'icon' ? 18 : 16} /> : <Sun size={variant === 'icon' ? 18 : 16} />}
      {variant === 'pill' && <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>}
    </button>
  )
}
