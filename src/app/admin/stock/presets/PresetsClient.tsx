'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'
import { useRouter } from 'next/navigation'
import { Save, Search, SlidersHorizontal, X } from 'lucide-react'

interface Props {
  stockItems: StockPresetItem[]
  supplies: SupplyOption[]
}

interface PresetConfig {
  name?: string
  vinyl_supply_id?: string
  joystick_color?: string
  button_color?: string
  control_type?: string
}

interface StockPresetItem {
  id: string
  quantity: number
  vinyl_supply_id?: string | null
  configuration?: PresetConfig | null
  product?: { name?: string | null; slug?: string | null } | null
  variant?: { cabinet_type?: string | null; screen_size?: string | null } | null
}

interface SupplyOption {
  id: string
  name: string
  supply_type: string
  color_label?: string | null
}

export function PresetsClient({ stockItems, supplies }: Props) {
  const supabase = createClient()
  const toast = useToast()
  const router = useRouter()

  const [savingId, setSavingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState('all')

  // Local state for preset inputs for each stock item
  const [presetConfigs, setPresetConfigs] = useState<Record<string, PresetConfig>>(() => {
    const initial: Record<string, PresetConfig> = {}
    stockItems.forEach((item) => {
      const currentPreset = item.configuration || {}

      initial[item.id] = {
        name: currentPreset.name || '',
        vinyl_supply_id: currentPreset.vinyl_supply_id || item.vinyl_supply_id || '',
        joystick_color: currentPreset.joystick_color || '',
        button_color: currentPreset.button_color || '',
        control_type: currentPreset.control_type || 'standard',
      }
    })
    return initial
  })

  const vinyls = supplies.filter((s) => s.supply_type === 'vinyl')
  const joysticks = supplies.filter((s) => s.supply_type === 'joystick')
  const buttons = supplies.filter((s) => s.supply_type === 'button')

  // Get unique color labels for select dropdowns
  const joystickColors = Array.from(new Set(joysticks.map((j) => j.color_label).filter(Boolean)))
  const buttonColors = Array.from(new Set(buttons.map((b) => b.color_label).filter(Boolean)))

  const filteredStockItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    return stockItems.filter((item) => {
      const config = presetConfigs[item.id] || item.configuration || {}
      const haystack = [
        item.product?.name,
        item.product?.slug,
        item.variant?.cabinet_type,
        item.variant?.screen_size,
        config.name,
        config.joystick_color,
        config.button_color,
        config.control_type,
      ].filter(Boolean).join(' ').toLowerCase()
      const matchesSearch = !query || haystack.includes(query)
      const matchesAvailability =
        availability === 'all'
          || (availability === 'available' && item.quantity > 0)
          || (availability === 'out' && item.quantity <= 0)

      return matchesSearch && matchesAvailability
    })
  }, [availability, presetConfigs, search, stockItems])

  const handleFieldChange = (stockId: string, field: keyof PresetConfig, value: string) => {
    setPresetConfigs((prev) => ({
      ...prev,
      [stockId]: {
        ...prev[stockId],
        [field]: value,
      },
    }))
  }

  const handleSavePreset = async (item: StockPresetItem) => {
    setSavingId(item.id)
    const config = presetConfigs[item.id]
    // The configuration belongs to this finished-stock row, not to the base product.
    const updatedPreset = {
      ...(item.configuration || {}),
      name: config.name || `Modelo #${item.id.slice(0, 4)}`,
    }

    const { error: stockError } = await supabase
      .from('stock_items')
      .update({
        vinyl_supply_id: item.vinyl_supply_id || null,
        configuration: updatedPreset,
      })
      .eq('id', item.id)

    setSavingId(null)

    if (stockError) {
      toast.error('Error al guardar la configuración')
    } else {
      toast.success('Equipo pre-configurado guardado')
      router.refresh()
    }
  }

  return (
    <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {stockItems.length === 0 ? (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
          <p>No se encontraron registros de stock inmediato para los productos.</p>
          <a href="/admin/stock" className="btn btn-primary btn-sm">
            Ir a Gestión de Stock →
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="admin-list-toolbar">
            <div className="admin-search-field">
              <Search size={18} />
              <input
                type="search"
                placeholder="Buscar producto, variante, preset o color"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button type="button" className="icon-btn" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="admin-filter-group">
              <SlidersHorizontal size={16} />
              <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
                <option value="all">Todas las cantidades</option>
                <option value="available">Con stock</option>
                <option value="out">Sin stock</option>
              </select>
            </div>
            <span className="admin-list-count">
              {filteredStockItems.length} de {stockItems.length} equipos
            </span>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto / Variante</th>
                  <th>Nombre del Preset</th>
                  <th>Diseño de Vinilo</th>
                  <th>Palanca / Botones</th>
                  <th>Controles</th>
                  <th style={{ width: '100px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredStockItems.map((item) => {
                  const config = presetConfigs[item.id] || {}
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.product?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {item.variant?.cabinet_type} · {item.variant?.screen_size} · ({item.quantity} un)
                        </div>
                      </td>
                      <td>
                        <input
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                          value={config.name || ''}
                          onChange={(e) => handleFieldChange(item.id, 'name', e.target.value)}
                          placeholder="Ej. Mario Bros Special"
                        />
                      </td>
                      <td>
                        <select
                          className="form-input form-select"
                          style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                          value={config.vinyl_supply_id || ''}
                          disabled
                        >
                          <option value="">-- Sin diseño --</option>
                          {vinyls.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select
                            className="form-input form-select"
                            style={{ padding: '4px 6px', fontSize: '0.8125rem' }}
                            value={config.joystick_color || ''}
                            disabled
                          >
                            <option value="">Palanca (Color)</option>
                            {joystickColors.map((color) => (
                              <option key={color} value={color ?? ''}>
                                {color}
                              </option>
                            ))}
                          </select>
                          <select
                            className="form-input form-select"
                            style={{ padding: '4px 6px', fontSize: '0.8125rem' }}
                            value={config.button_color || ''}
                            disabled
                          >
                            <option value="">Botones (Color)</option>
                            {buttonColors.map((color) => (
                              <option key={color} value={color ?? ''}>
                                {color}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td>
                        <select
                          className="form-input form-select"
                          style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                          value={config.control_type || 'standard'}
                          disabled
                        >
                          <option value="standard">Estándar</option>
                          <option value="led">Iluminación LED</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={savingId === item.id}
                          onClick={() => handleSavePreset(item)}
                        >
                          <Save size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filteredStockItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-list-empty">
                      No hay equipos armados que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
