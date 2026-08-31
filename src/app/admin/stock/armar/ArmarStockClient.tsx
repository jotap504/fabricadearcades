'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'
import { useRouter } from 'next/navigation'
import { Wrench } from 'lucide-react'

interface Props {
  products: any[]
  supplies: any[]
  supplyFamilies?: any[]
}

interface PlayerConfig {
  joystickSupplyId: string
  buttonSupplyId: string
}

export function ArmarStockClient({ products, supplies, supplyFamilies = [] }: Props) {
  const supabase = createClient()
  const toast = useToast()
  const router = useRouter()

  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '')
  const [selectedProduct, setSelectedProduct] = useState<any>(products[0] || null)

  const [unitsToAssemble, setUnitsToAssemble] = useState<number>(1)
  const [presetName, setPresetName] = useState<string>('')
  
  // Customization choices
  const [selectedVinylId, setSelectedVinylId] = useState<string>('')
  const [joystickType, setJoystickType] = useState<'standard' | 'led'>('standard')
  const [buttonType, setButtonType] = useState<'standard' | 'led'>('standard')

  // Parse product specs
  let productSpecs: any = {
    players_count: 2,
    joysticks_count: 2,
    buttons_per_player: 6,
    led_enabled: true,
    families: [],
  }
  try {
    if (selectedProduct?.meta_description) {
      const parsed = JSON.parse(selectedProduct.meta_description)
      productSpecs = { ...productSpecs, ...parsed }
    }
  } catch {}

  const numPlayers = productSpecs.players_count || 2
  const buttonsPerPlayer = productSpecs.buttons_per_player || 6
  const productFamilies: string[] = productSpecs.families || []

  // Calculate allowed supplies from assigned product families (if any)
  const allowedSupplyIds = (() => {
    if (!productFamilies || productFamilies.length === 0) return null
    const ids = new Set<string>()
    supplyFamilies
      .filter((f: any) => productFamilies.includes(f.id) || productFamilies.includes(f.name))
      .forEach((f: any) => {
        (f.supply_ids || []).forEach((id: string) => ids.add(id))
      })
    return ids
  })()

  // Independent player configurations for Joysticks & Buttons
  const [playersConfig, setPlayersConfig] = useState<PlayerConfig[]>(() =>
    Array.from({ length: numPlayers }, () => ({
      joystickSupplyId: '',
      buttonSupplyId: '',
    }))
  )

  const [loading, setLoading] = useState(false)

  // Filter supplies based on types & compatibility
  const vinyls = supplies.filter((s) => {
    if (s.supply_type !== 'vinyl') return false
    if (allowedSupplyIds && allowedSupplyIds.size > 0) return allowedSupplyIds.has(s.id)
    return true
  })
  
  const isLedSupply = (s: any) => {
    const text = `${s.name} ${s.color_label || ''}`.toLowerCase()
    return text.includes('led') || s.supply_type === 'led'
  }

  const joysticks = supplies.filter((s) => {
    if (s.supply_type !== 'joystick') return false
    if (allowedSupplyIds && allowedSupplyIds.size > 0 && !allowedSupplyIds.has(s.id)) return false
    return joystickType === 'led' ? isLedSupply(s) : !isLedSupply(s)
  })

  const buttons = supplies.filter((s) => {
    if (s.supply_type !== 'button') return false
    if (allowedSupplyIds && allowedSupplyIds.size > 0 && !allowedSupplyIds.has(s.id)) return false
    return buttonType === 'led' ? isLedSupply(s) : !isLedSupply(s)
  })

  const selectedVinyl = supplies.find((s) => s.id === selectedVinylId)

  function handleProductChange(productId: string) {
    setSelectedProductId(productId)
    const prod = products.find((p) => p.id === productId)
    setSelectedProduct(prod || null)

    let specs: any = { players_count: 2, buttons_per_player: 6 }
    try {
      if (prod?.meta_description) {
        specs = { ...specs, ...JSON.parse(prod.meta_description) }
      }
    } catch {}

    setPlayersConfig(
      Array.from({ length: specs.players_count || 2 }, () => ({
        joystickSupplyId: '',
        buttonSupplyId: '',
      }))
    )
  }

  function updatePlayerConfig(playerIndex: number, field: keyof PlayerConfig, value: string) {
    setPlayersConfig((prev) => {
      const updated = [...prev]
      if (!updated[playerIndex]) {
        updated[playerIndex] = { joystickSupplyId: '', buttonSupplyId: '' }
      }
      updated[playerIndex] = { ...updated[playerIndex], [field]: value }
      return updated
    })
  }

  // Calculate required discounts per supply ID
  const supplyDiscountsMap: Record<string, { name: string; needed: number; stock: number }> = {}

  // Fixed BOM parts (wood, computer, screen, wiring, etc.) are consumed too.
  ;(productSpecs.bom || []).forEach((bomItem: any) => {
    if (!bomItem.supply_id || bomItem.supply_type !== 'other') return
    const supply = supplies.find((item) => item.id === bomItem.supply_id)
    if (!supply) return
    const previous = supplyDiscountsMap[bomItem.supply_id]?.needed || 0
    supplyDiscountsMap[bomItem.supply_id] = {
      name: supply.name,
      needed: previous + Math.max(Number(bomItem.quantity) || 1, 1) * unitsToAssemble,
      stock: supply.quantity,
    }
  })

  if (selectedVinylId && selectedVinyl) {
    supplyDiscountsMap[selectedVinylId] = {
      name: selectedVinyl.name,
      needed: 1 * unitsToAssemble,
      stock: selectedVinyl.quantity,
    }
  }

  playersConfig.forEach((p, idx) => {
    if (idx < numPlayers) {
      if (p.joystickSupplyId) {
        const jSup = supplies.find((s) => s.id === p.joystickSupplyId)
        if (jSup) {
          const prev = supplyDiscountsMap[p.joystickSupplyId]?.needed || 0
          supplyDiscountsMap[p.joystickSupplyId] = {
            name: `${jSup.name} ${jSup.color_label ? `(${jSup.color_label})` : ''}`,
            needed: prev + 1 * unitsToAssemble,
            stock: jSup.quantity,
          }
        }
      }

      if (p.buttonSupplyId) {
        const bSup = supplies.find((s) => s.id === p.buttonSupplyId)
        if (bSup) {
          const prev = supplyDiscountsMap[p.buttonSupplyId]?.needed || 0
          supplyDiscountsMap[p.buttonSupplyId] = {
            name: `${bSup.name} ${bSup.color_label ? `(${bSup.color_label})` : ''}`,
            needed: prev + buttonsPerPlayer * unitsToAssemble,
            stock: bSup.quantity,
          }
        }
      }
    }
  })

  async function handleAssemble(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProductId) return
    setLoading(true)

    try {
      const p1Joy = supplies.find((s) => s.id === playersConfig[0]?.joystickSupplyId)
      const p1Btn = supplies.find((s) => s.id === playersConfig[0]?.buttonSupplyId)

      const playersSummary = playersConfig.slice(0, numPlayers).map((p, i) => {
        const j = supplies.find((s) => s.id === p.joystickSupplyId)
        const b = supplies.find((s) => s.id === p.buttonSupplyId)
        return {
          player: i + 1,
          joystick_supply_id: p.joystickSupplyId,
          joystick_color: j?.color_label || j?.name || '',
          button_supply_id: p.buttonSupplyId,
          button_color: b?.color_label || b?.name || '',
        }
      })

      const configuration = {
        name: presetName || `${selectedProduct.name} - ${selectedVinyl?.name || 'Armado'} (${unitsToAssemble} un)`,
        vinyl_supply_id: selectedVinylId || null,
        vinyl_name: selectedVinyl?.name || null,
        joystick_color: p1Joy?.color_label || null,
        button_color: p1Btn?.color_label || null,
        joystick_type: joystickType,
        button_type: buttonType,
        players: playersSummary,
        created_at: new Date().toISOString(),
      }

      const { error } = await supabase.rpc('assemble_ready_stock', {
        p_product_id: selectedProductId,
        p_variant_id: null,
        p_quantity: unitsToAssemble,
        p_configuration: configuration,
        p_supplies: Object.entries(supplyDiscountsMap).map(([id, data]) => ({
          id,
          quantity: data.needed,
        })),
      })
      if (error) throw error

      toast.success(
        `¡${unitsToAssemble} consola(s) armada(s) con éxito!`,
        'Los insumos fueron descontados automáticamente del inventario.'
      )

      router.push('/admin/stock')
      router.refresh()
    } catch (err: any) {
      toast.error('Error al armar el equipo', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 850, margin: '0 auto' }}>
      <form onSubmit={handleAssemble} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* 1. Seleccionar Modelo y Cantidad */}
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wrench size={18} className="text-cyan" />
            1. Seleccionar Modelo y Cantidad
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Modelo de Consola / Arcade *</label>
              <select
                className="form-input form-select"
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.base_price?.toLocaleString('es-AR')})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Unidades a Armar *</label>
              <input
                type="number"
                min="1"
                step="1"
                className="form-input"
                value={unitsToAssemble}
                onChange={(e) => setUnitsToAssemble(parseInt(e.target.value) || 1)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nombre del Preset / Modelo Armado (opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="ej: Consola 78cm Edición Mortal Kombat - P1 Rojo / P2 Azul"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
          </div>

          {selectedProduct && (
            <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              📋 <strong>Ficha Técnica:</strong> {numPlayers} Jugador(es) · {productSpecs.joysticks_count || numPlayers} Palanca(s) · {buttonsPerPlayer} Botones/Jugador ({numPlayers * buttonsPerPlayer} botones en total por consola).
            </div>
          )}
        </div>

        {/* 2. Insumos Utilizados en el Armado */}
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
            2. Insumos Utilizados en el Armado
          </h3>

          {/* Vinyl */}
          <div className="form-group">
            <label className="form-label">🎨 Vinilo / Diseño Ploteado ({1 * unitsToAssemble} un)</label>
            <select
              className="form-input form-select"
              value={selectedVinylId}
              onChange={(e) => setSelectedVinylId(e.target.value)}
            >
              <option value="">-- Sin vinilo asignado --</option>
              {vinyls.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} (Stock actual: {v.quantity})
                </option>
              ))}
            </select>
          </div>

          {/* Global LED / Standard Toggles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
            <div className="form-group">
              <label className="form-label">Tipo de Palancas</label>
              <select
                className="form-input form-select"
                value={joystickType}
                onChange={(e) => setJoystickType(e.target.value as any)}
              >
                <option value="standard">🕹️ Estándar</option>
                <option value="led">💡 LED Iluminada</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Botones</label>
              <select
                className="form-input form-select"
                value={buttonType}
                onChange={(e) => setButtonType(e.target.value as any)}
              >
                <option value="standard">🔴 Estándar</option>
                <option value="led">💡 LED Iluminado</option>
              </select>
            </div>
          </div>

          {/* Per-Player Joy & Button Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🎮 Configuración por Jugador (Palancas y Botones Separados)
            </h4>

            {Array.from({ length: numPlayers }).map((_, pIdx) => {
              const currentCfg = playersConfig[pIdx] || { joystickSupplyId: '', buttonSupplyId: '' }
              return (
                <div
                  key={pIdx}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-4)',
                    background: 'var(--color-surface)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 'var(--space-3)', color: 'var(--color-text)' }}>
                    👤 Jugador {pIdx + 1}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    {/* Palanca de este player */}
                    <div className="form-group">
                      <label className="form-label">
                        🕹️ Palanca Player {pIdx + 1} ({1 * unitsToAssemble} un)
                      </label>
                      <select
                        className="form-input form-select"
                        value={currentCfg.joystickSupplyId}
                        onChange={(e) => updatePlayerConfig(pIdx, 'joystickSupplyId', e.target.value)}
                      >
                        <option value="">-- Seleccionar color / modelo --</option>
                        {joysticks.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.name} {j.color_label ? `(${j.color_label})` : ''} - Stock: {j.quantity}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Botones de este player */}
                    <div className="form-group">
                      <label className="form-label">
                        🔴 Botones Player {pIdx + 1} ({buttonsPerPlayer * unitsToAssemble} un)
                      </label>
                      <select
                        className="form-input form-select"
                        value={currentCfg.buttonSupplyId}
                        onChange={(e) => updatePlayerConfig(pIdx, 'buttonSupplyId', e.target.value)}
                      >
                        <option value="">-- Seleccionar color / modelo --</option>
                        {buttons.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} {b.color_label ? `(${b.color_label})` : ''} - Stock: {b.quantity}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Resumen y Descuento Automático */}
        <div className="card card-body" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-cyan)' }}>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-cyan)', marginBottom: 'var(--space-3)' }}>
            ⚡ Descuento Automático de Insumos al Confirmar
          </h4>
          <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(supplyDiscountsMap).map(([id, info]) => (
              <li key={id}>
                {info.name}: <strong>-{info.needed} un</strong> (stock actual: {info.stock} → quedará en <strong>{info.stock - info.needed}</strong>)
              </li>
            ))}
            {Object.keys(supplyDiscountsMap).length === 0 && (
              <li style={{ color: 'var(--color-text-muted)' }}>
                Seleccioná los insumos arriba para ver el desglose de descuento.
              </li>
            )}
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.push('/admin/stock')}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Armando Consola...' : `✅ Confirmar y Armar ${unitsToAssemble} Consola(s)`}
          </button>
        </div>
      </form>
    </div>
  )
}
