'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'
import type { Category, ProductType } from '@/lib/types'

export default function NewProductPage() {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    slug: '',
    short_description: '',
    description: '',
    category_id: '',
    product_type: 'arcade' as ProductType,
    base_price: '',
    retail_markup_pct: '30',
    requires_production: true,
    is_active: true,
    is_featured: false,
    meta_description: '{}',
  })

  const [allSupplies, setAllSupplies] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [families, setFamilies] = useState<any[]>([])
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([])
  const [bom, setBom] = useState<any[]>([])
  const [ledSurcharge, setLedSurcharge] = useState('0')
  const [ledEnabled, setLedEnabled] = useState(true)
  const [playersCount, setPlayersCount] = useState(2)
  const [joysticksCount, setJoysticksCount] = useState(2)
  const [buttonsPerPlayer, setButtonsPerPlayer] = useState(6)
  const [gamesCount, setGamesCount] = useState('')

  useEffect(() => {
    async function load() {
      const { data: sData } = await supabase.from('supply_inventory').select('*').eq('is_active', true).order('supply_type')
      if (sData) setAllSupplies(sData)

      const { data: cData } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (cData) {
        setCategories(cData)
        setForm((prev) => ({
          ...prev,
          category_id: prev.category_id || cData[0]?.id || '',
        }))
      }

      const { data: fData } = await supabase.from('pricing_config').select('*').eq('key', 'supply_families').single()
      if (fData?.value) {
        try {
          const parsed = typeof fData.value === 'string' ? JSON.parse(fData.value) : fData.value
          setFamilies(parsed)
        } catch {}
      }
    }
    load()
  }, [supabase])

  function handleNameChange(name: string) {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
    setForm((prev) => ({ ...prev, name, slug }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const metaJSON = JSON.stringify({
      led_surcharge: parseFloat(ledSurcharge) || 0,
      led_enabled: ledEnabled,
      players_count: playersCount,
      joysticks_count: joysticksCount,
      buttons_per_player: buttonsPerPlayer,
      games_count: parseInt(gamesCount) || 0,
      families: selectedFamilies,
      bom: bom
    })

    const { data, error } = await supabase
      .from('products')
      .insert({
        ...form,
        category_id: form.category_id || null,
        base_price: parseFloat(form.base_price) || 0,
        retail_markup_pct: parseFloat(form.retail_markup_pct) || 30,
        meta_description: metaJSON,
      })
      .select()
      .single()

    if (data) {
      // Automatically generate default stock_items rows for this new product
      await supabase.from('stock_items').insert([
        { product_id: data.id, stock_type: 'immediate', quantity: 0 },
        { product_id: data.id, stock_type: 'printed', quantity: 0 },
        { product_id: data.id, stock_type: 'designed', quantity: 0 },
      ])
    }

    setLoading(false)

    if (error) {
      toast.error('Error al crear el producto', error.message)
      return
    }

    toast.success('Producto creado', form.name)
    router.push('/admin/productos')
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
          Nuevo producto
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Completá los datos del producto</p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
      >
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Información básica
          </h3>

          <div className="form-group">
            <label className="form-label" htmlFor="product-name">Nombre *</label>
            <input
              id="product-name"
              className="form-input"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Arcade Bartop Pro"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="product-slug">Slug (URL)</label>
            <input
              id="product-slug"
              className="form-input"
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              placeholder="arcade-bartop-pro"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="product-short-desc">Descripción corta</label>
            <input
              id="product-short-desc"
              className="form-input"
              value={form.short_description}
              onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))}
              placeholder="Arcade compacto perfecto para bares y hogares"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="product-desc">Descripción completa</label>
            <textarea
              id="product-desc"
              className="form-input form-textarea"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Descripción detallada del producto..."
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="product-type">Tipo de producto</label>
            <select
              id="product-type"
              className="form-input form-select"
              value={form.product_type}
              onChange={(e) => setForm((p) => ({ ...p, product_type: e.target.value as ProductType }))}
            >
              <option value="arcade">Arcade</option>
              <option value="accessory">Accesorio</option>
              <option value="bundle">Bundle/Combo</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="product-category">Categoría</label>
            <select
              id="product-category"
              className="form-input form-select"
              value={form.category_id}
              onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
              disabled={categories.length === 0}
            >
              {categories.length === 0 ? (
                <option value="">No hay categorías activas</option>
              ) : (
                categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))
              )}
            </select>
            {categories.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Creá o activá categorías desde el panel para clasificar productos.
              </p>
            )}
          </div>
        </div>

        {/* Ficha Técnica / Especificaciones del Modelo */}
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            🎮 Ficha Técnica del Modelo (Fórmula de Armado)
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Definí las especificaciones fijas de hardware que lleva este modelo.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Jugadores</label>
              <select
                className="form-input form-select"
                value={playersCount}
                onChange={(e) => setPlayersCount(parseInt(e.target.value) || 2)}
              >
                <option value="1">1 Jugador</option>
                <option value="2">2 Jugadores</option>
                <option value="4">4 Jugadores</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Cant. Palancas</label>
              <input
                type="number"
                min="1"
                max="4"
                className="form-input"
                value={joysticksCount}
                onChange={(e) => setJoysticksCount(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Botones / Jugador</label>
              <select
                className="form-input form-select"
                value={buttonsPerPlayer}
                onChange={(e) => setButtonsPerPlayer(parseInt(e.target.value) || 6)}
              >
                <option value="4">4 Botones</option>
                <option value="6">6 Botones</option>
                <option value="8">8 Botones</option>
                <option value="12">12 Botones</option>
                <option value="16">16 Botones</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="product-games-count">Cantidad de juegos</label>
              <input
                id="product-games-count"
                type="number"
                min="0"
                className="form-input"
                value={gamesCount}
                onChange={(e) => setGamesCount(e.target.value)}
                placeholder="500"
              />
            </div>
          </div>

          {/* Opciones LED */}
          <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ledEnabled}
                onChange={(e) => setLedEnabled(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--color-cyan)' }}
              />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Habilitar opción de Controles LED en este producto</span>
            </label>

            {ledEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="product-led-surcharge">Valor Adicional LED Completo ($)</label>
                  <input
                    id="product-led-surcharge"
                    className="form-input"
                    type="number"
                    min="0"
                    step="100"
                    value={ledSurcharge}
                    onChange={(e) => setLedSurcharge(e.target.value)}
                    placeholder="25000"
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  💡 Si el cliente elige solo palancas LED o solo botones LED, el sistema calculará automáticamente el <strong>50%</strong> (${(parseFloat(ledSurcharge || '0') / 2).toLocaleString('es-AR')}). Si elige ambos, sumará el 100%.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Emparejar Familias de Insumos */}
        {families.length > 0 && (
          <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                  📦 Familias de Insumos Compatibles
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Tildá qué familias de insumos son compatibles y se ofrecerán para este modelo.
                </p>
              </div>
              <a href="/admin/familias" className="btn btn-ghost btn-xs" target="_blank">
                + Administrar Familias ↗
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-2)' }}>
              {families.map((fam: any) => {
                const isSelected = selectedFamilies.includes(fam.id)
                return (
                  <label
                    key={fam.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      background: isSelected ? 'var(--color-cyan-dim)' : 'var(--color-surface-2)',
                      border: isSelected ? '1px solid var(--color-cyan)' : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedFamilies((prev) =>
                          isSelected ? prev.filter((id) => id !== fam.id) : [...prev, fam.id]
                        )
                      }}
                      style={{ width: 16, height: 16, accentColor: 'var(--color-cyan)' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{fam.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {fam.supply_ids?.length || 0} insumos vinculados
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Precios
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="product-price">Precio base (distribuidor) *</label>
              <input
                id="product-price"
                className="form-input"
                type="number"
                min="0"
                step="100"
                value={form.base_price}
                onChange={(e) => setForm((p) => ({ ...p, base_price: e.target.value }))}
                placeholder="150000"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="product-markup">Margen cliente final (%)</label>
              <input
                id="product-markup"
                className="form-input"
                type="number"
                min="0"
                max="200"
                step="1"
                value={form.retail_markup_pct}
                onChange={(e) => setForm((p) => ({ ...p, retail_markup_pct: e.target.value }))}
              />
            </div>
          </div>
          {form.base_price && (
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
              💼 Precio distribuidor: <strong>${parseFloat(form.base_price).toLocaleString('es-AR')}</strong>
              {' · '}
              👤 Precio público: <strong>${(parseFloat(form.base_price) * (1 + parseFloat(form.retail_markup_pct) / 100)).toLocaleString('es-AR')}</strong>
            </div>
          )}
        </div>

        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Opciones
          </h3>
          {[
            { key: 'requires_production', label: 'Requiere producción/personalización' },
            { key: 'is_active', label: 'Producto activo (visible en tienda)' },
            { key: 'is_featured', label: 'Producto destacado (aparece en inicio)' },
          ].map((opt) => (
            <label
              key={opt.key}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={form[opt.key as keyof typeof form] as boolean}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [opt.key]: e.target.checked }))
                }
                style={{ width: 18, height: 18, accentColor: 'var(--color-cyan)' }}
                id={`product-option-${opt.key}`}
              />
              <span style={{ fontSize: '0.9375rem' }}>{opt.label}</span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.push('/admin/productos')}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            id="create-product-submit-btn"
          >
            {loading ? 'Creando...' : 'Crear producto'}
          </button>
        </div>
      </form>
    </div>
  )
}
