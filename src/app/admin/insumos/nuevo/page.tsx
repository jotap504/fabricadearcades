'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'
import { ColorSelector } from '@/components/admin/ColorSelector'

export default function NewInsumoPage() {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [families, setFamilies] = useState<any[]>([])
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('')

  const [form, setForm] = useState({
    name: '',
    supply_type: 'button',
    color: '',
    color_label: '',
    image_url: '',
    quantity: '0',
    unit: 'unidad',
    low_stock_threshold: '5',
    is_active: true,
  })

  // Load families
  useEffect(() => {
    async function loadFamilies() {
      const { data } = await supabase.from('pricing_config').select('*').eq('key', 'supply_families').single()
      if (data?.value) {
        try {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
          setFamilies(parsed)
        } catch {}
      }
    }
    loadFamilies()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from('supply_inventory')
      .insert({
        name: form.name,
        supply_type: form.supply_type,
        color: form.color || null,
        color_label: form.color_label || null,
        image_url: form.image_url || null,
        quantity: parseInt(form.quantity) || 0,
        unit: form.unit,
        low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
        is_active: form.is_active,
      })
      .select()
      .single()

    if (data && selectedFamilyId) {
      // Add supply ID to family in pricing_config
      const { data: fConfig } = await supabase.from('pricing_config').select('*').eq('key', 'supply_families').single()
      if (fConfig?.value) {
        try {
          const list = typeof fConfig.value === 'string' ? JSON.parse(fConfig.value) : fConfig.value
          const updated = list.map((f: any) => {
            if (f.id === selectedFamilyId) {
              const ids = f.supply_ids || []
              return { ...f, supply_ids: Array.from(new Set([...ids, data.id])) }
            }
            return f
          })
          await supabase.from('pricing_config').update({ value: updated }).eq('key', 'supply_families')
        } catch {}
      }
    }

    setLoading(false)

    if (error) {
      toast.error('Error al crear insumo', error.message)
      return
    }

    toast.success('Insumo creado', form.name)
    router.push('/admin/insumos')
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Nuevo insumo</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Cargá stock de materiales</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="insumo-name">Nombre *</label>
            <input
              id="insumo-name"
              className="form-input"
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ej: Botón Sanwa 30mm"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="insumo-type">Tipo *</label>
            <select
              id="insumo-type"
              className="form-input form-select"
              value={form.supply_type}
              onChange={(e) => setForm(p => ({ ...p, supply_type: e.target.value }))}
            >
              <option value="button">🔴 Botones</option>
              <option value="joystick">🕹️ Palancas</option>
              <option value="vinyl">🎨 Vinilos</option>
              <option value="led">💡 LEDs</option>
              <option value="other">⚙️ Otros</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="insumo-family">Familia de Insumo (opcional)</label>
            <select
              id="insumo-family"
              className="form-input form-select"
              value={selectedFamilyId}
              onChange={(e) => setSelectedFamilyId(e.target.value)}
            >
              <option value="">-- Sin Familia / Asignar después --</option>
              {families.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Imagen / Foto del Insumo</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {form.image_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <img
                    src={form.image_url}
                    alt="Preview"
                    style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                  />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-cyan)' }}>✓ Imagen cargada</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      Optimizada para la tienda
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    style={{ color: 'var(--color-danger)' }}
                    onClick={() => setForm((p) => ({ ...p, image_url: '' }))}
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <label
                    className="btn btn-secondary btn-sm"
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    📁 Adjuntar Imagen desde tu PC
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('Archivo muy pesado', `El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1)}MB. El máximo es 5MB.`)
                          return
                        }
                        const reader = new FileReader()
                        reader.readAsDataURL(file)
                        reader.onload = (uploadEvent) => {
                          const img = new Image()
                          img.src = uploadEvent.target?.result as string
                          img.onload = () => {
                            let width = img.width
                            let height = img.height
                            const maxDimension = 1000
                            if (width > maxDimension || height > maxDimension) {
                              if (width > height) {
                                height = Math.round((height * maxDimension) / width)
                                width = maxDimension
                              } else {
                                width = Math.round((width * maxDimension) / height)
                                height = maxDimension
                              }
                            }
                            const canvas = document.createElement('canvas')
                            canvas.width = width
                            canvas.height = height
                            const ctx = canvas.getContext('2d')
                            if (ctx) {
                              ctx.drawImage(img, 0, 0, width, height)
                              const compressed = canvas.toDataURL('image/webp', 0.85)
                              setForm((p) => ({ ...p, image_url: compressed }))
                              toast.success('Imagen cargada y optimizada')
                            } else {
                              setForm((p) => ({ ...p, image_url: uploadEvent.target?.result as string }))
                              toast.success('Imagen cargada')
                            }
                          }
                        }
                      }}
                    />
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    PNG, JPG, WEBP (hasta 5MB)
                  </span>
                </div>
              )}
            </div>
          </div>

          <ColorSelector
            defaultColor={form.color}
            defaultLabel={form.color_label}
            onChange={({ color, label }) => setForm((p) => ({ ...p, color, color_label: label }))}
          />
        </div>

        <div className="card card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="insumo-qty">Stock actual</label>
            <input
              id="insumo-qty"
              className="form-input"
              type="number"
              min="-999"
              value={form.quantity}
              onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="insumo-unit">Unidad</label>
            <input
              id="insumo-unit"
              className="form-input"
              value={form.unit}
              onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="insumo-low-stock">Alerta stock bajo</label>
            <input
              id="insumo-low-stock"
              className="form-input"
              type="number"
              min="0"
              value={form.low_stock_threshold}
              onChange={(e) => setForm(p => ({ ...p, low_stock_threshold: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => router.push('/admin/insumos')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} id="create-insumo-submit-btn">
            {loading ? 'Guardando...' : 'Crear insumo'}
          </button>
        </div>
      </form>
    </div>
  )
}
