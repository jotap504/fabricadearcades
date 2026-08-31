'use client'

import { useMemo, useState } from 'react'
import { CONSOLE_LOGOS } from '@/lib/console-logos'

interface ConsoleLogoSelectorProps {
  title: string
  description: string
  selectedIds: string[]
  onChange: (ids: string[]) => void
  max?: number
  excludeIds?: string[]
}

export function ConsoleLogoSelector({
  title,
  description,
  selectedIds,
  onChange,
  max,
  excludeIds = [],
}: ConsoleLogoSelectorProps) {
  const [search, setSearch] = useState('')
  const excluded = useMemo(() => new Set(excludeIds), [excludeIds])
  const selected = useMemo(() => new Set(selectedIds), [selectedIds])
  const filteredLogos = useMemo(() => {
    const q = search.trim().toLowerCase()
    return CONSOLE_LOGOS.filter((logo) => {
      if (excluded.has(logo.id)) return false
      if (!q) return true
      return `${logo.id} ${logo.name}`.toLowerCase().includes(q)
    })
  }, [excluded, search])

  function toggleLogo(id: string) {
    if (selected.has(id)) {
      onChange(selectedIds.filter((item) => item !== id))
      return
    }
    if (max && selectedIds.length >= max) return
    onChange([...selectedIds, id])
  }

  return (
    <div className="admin-console-logo-selector">
      <div className="admin-console-logo-header">
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
        <span>{selectedIds.length}{max ? `/${max}` : ''} seleccionados</span>
      </div>

      <input
        className="form-input"
        type="search"
        placeholder="Buscar consola, marca o sistema..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="admin-console-logo-grid">
        {filteredLogos.map((logo) => {
          const checked = selected.has(logo.id)
          const disabled = !checked && !!max && selectedIds.length >= max
          return (
            <label
              key={logo.id}
              className={`admin-console-logo-option ${checked ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggleLogo(logo.id)}
              />
              <img src={logo.src} alt="" loading="lazy" />
              <span>{logo.name}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
