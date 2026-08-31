'use client'

import { useMemo, useState } from 'react'

const COMMON_COLORS = [
  { label: 'Negro', value: '#111111' },
  { label: 'Blanco', value: '#ffffff' },
  { label: 'Rojo', value: '#ef4444' },
  { label: 'Azul', value: '#2563eb' },
  { label: 'Verde', value: '#16a34a' },
  { label: 'Amarillo', value: '#facc15' },
  { label: 'Naranja', value: '#f97316' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Violeta', value: '#8b5cf6' },
  { label: 'Gris', value: '#6b7280' },
]

interface ColorSelectorProps {
  defaultColor?: string | null
  defaultLabel?: string | null
  onChange?: (value: { color: string; label: string }) => void
}

function normalizeHex(value?: string | null) {
  if (!value) return ''
  const trimmed = value.trim()
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toLowerCase() : ''
}

export function ColorSelector({ defaultColor, defaultLabel, onChange }: ColorSelectorProps) {
  const initialColor = normalizeHex(defaultColor)
  const initialLabel = defaultLabel?.trim() || COMMON_COLORS.find((color) => color.value === initialColor)?.label || ''
  const [color, setColor] = useState(initialColor)
  const [label, setLabel] = useState(initialLabel)

  const selectedPreset = useMemo(
    () => COMMON_COLORS.find((item) => item.value === color && item.label.toLowerCase() === label.toLowerCase()),
    [color, label]
  )

  function selectPreset(nextColor: string, nextLabel: string) {
    setColor(nextColor)
    setLabel(nextLabel)
    onChange?.({ color: nextColor, label: nextLabel })
  }

  return (
    <div className="form-group">
      <label className="form-label">Color</label>
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="color_label" value={label} />

      <div className="admin-color-grid" role="list" aria-label="Colores comunes">
        {COMMON_COLORS.map((option) => {
          const isSelected = selectedPreset?.value === option.value
          const isWhite = option.value === '#ffffff'
          return (
            <button
              key={option.value}
              type="button"
              className={`admin-color-chip ${isSelected ? 'selected' : ''}`}
              onClick={() => selectPreset(option.value, option.label)}
              aria-pressed={isSelected}
              title={option.label}
            >
              <span
                className="admin-color-dot"
                style={{
                  background: option.value,
                  borderColor: isWhite ? 'rgba(15, 23, 42, 0.24)' : 'transparent',
                }}
              />
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>

      <div className="admin-color-custom">
        <label>
          <span>Personalizado</span>
          <input
            type="color"
            value={color || '#111111'}
            onChange={(event) => {
              const nextColor = event.target.value
              const nextLabel = !label || COMMON_COLORS.some((item) => item.label === label) ? 'Personalizado' : label
              setColor(nextColor)
              if (!label || COMMON_COLORS.some((item) => item.label === label)) {
                setLabel(nextLabel)
              }
              onChange?.({ color: nextColor, label: nextLabel })
            }}
            aria-label="Elegir color personalizado"
          />
        </label>
        <input
          className="form-input"
          value={label}
          onChange={(event) => {
            setLabel(event.target.value)
            onChange?.({ color, label: event.target.value })
          }}
          placeholder="Nombre visible, ej. Rojo"
          aria-label="Nombre del color"
        />
      </div>
    </div>
  )
}
