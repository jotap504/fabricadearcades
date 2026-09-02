'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'
import type { Category, ProductType } from '@/lib/types'
import { Sparkles, Upload, X, Image as ImageIcon, Plus, Package } from 'lucide-react'

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

  // Images & Stock
  const [images, setImages] = useState<string[]>([])
  const [initialStock, setInitialStock] = useState<number>(0)
  const [generatingAiImage, setGeneratingAiImage] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAiModal, setShowAiModal] = useState(false)

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

  // Accessory general specifications
  const [accessorySpecs, setAccessorySpecs] = useState({
    brand: '',
    model: '',
    material: '',
    dimensions: '',
    compatibility: '',
    connection_type: '',
    weight: '',
    warranty: '1 año de fábrica',
  })

  function handleProductTypeChange(type: ProductType) {
    setForm((prev) => ({
      ...prev,
      product_type: type,
      requires_production: type === 'arcade',
    }))
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Archivo muy pesado', `${file.name} supera el máximo de 5MB`)
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
          const maxDimension = 1200
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
            setImages((prev) => [...prev, compressed])
            toast.success('Imagen agregada y optimizada')
          } else {
            setImages((prev) => [...prev, uploadEvent.target?.result as string])
            toast.success('Imagen agregada')
          }
        }
      }
    })
  }

  async function handleGenerateAiImage() {
    if (!form.name.trim() && !aiPrompt.trim()) {
      toast.error('Ingresá el nombre del producto o una descripción para la IA')
      return
    }

    setGeneratingAiImage(true)
    try {
      const res = await fetch('/api/admin/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: form.name,
          prompt: aiPrompt.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar imagen')

      if (data.image_url) {
        setImages((prev) => [...prev, data.image_url])
        toast.success('¡Imagen generada con IA agregada con éxito!')
        setShowAiModal(false)
        setAiPrompt('')
      }
    } catch (err: any) {
      toast.error('Error generando imagen IA', err.message)
    } finally {
      setGeneratingAiImage(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const metaJSON = JSON.stringify(
      form.product_type === 'accessory'
        ? {
            accessory_specs: accessorySpecs,
            is_accessory: true,
          }
        : {
            led_surcharge: parseFloat(ledSurcharge) || 0,
            led_enabled: ledEnabled,
            players_count: playersCount,
            joysticks_count: joysticksCount,
            buttons_per_player: buttonsPerPlayer,
            games_count: parseInt(gamesCount) || 0,
            families: selectedFamilies,
            bom: bom,
          }
    )

    const { data, error } = await supabase
      .from('products')
      .insert({
        ...form,
        category_id: form.category_id || null,
        images: images,
        base_price: parseFloat(form.base_price) || 0,
        retail_markup_pct: parseFloat(form.retail_markup_pct) || 30,
        meta_description: metaJSON,
      })
      .select()
      .single()

    if (data) {
      // Automatically generate stock_items rows with requested initial stock
      await supabase.from('stock_items').insert([
        { product_id: data.id, stock_type: 'immediate', quantity: Math.max(0, initialStock) },
        { product_id: data.id, stock_type: 'printed', quantity: 0 },
        { product_id: data.id, stock_type: 'designed', quantity: 0 },
      ])
    }

    setLoading(false)

    if (error) {
      toast.error('Error al crear el producto', error.message)
      return
    }

    toast.success('Producto creado con éxito', form.name)
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
              onChange={(e) => handleProductTypeChange(e.target.value as ProductType)}
            >
              <option value="arcade">Arcade / Consola</option>
              <option value="accessory">Accesorio</option>
              <option value="bundle">Bundle / Combo</option>
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

        {/* Ficha Técnica: ACCESORIO */}
        {form.product_type === 'accessory' ? (
          <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🔌 Especificaciones del Accesorio
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Completá los datos técnicos generales de este accesorio o componente.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Marca / Fabricante</label>
                <input
                  className="form-input"
                  value={accessorySpecs.brand}
                  onChange={(e) => setAccessorySpecs((p) => ({ ...p, brand: e.target.value }))}
                  placeholder="Ej: Sanwa / Fábrica de Arcades"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Modelo / Referencia</label>
                <input
                  className="form-input"
                  value={accessorySpecs.model}
                  onChange={(e) => setAccessorySpecs((p) => ({ ...p, model: e.target.value }))}
                  placeholder="Ej: JLF-TP-8YT / OBSF-30"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Compatibilidad</label>
                <input
                  className="form-input"
                  value={accessorySpecs.compatibility}
                  onChange={(e) => setAccessorySpecs((p) => ({ ...p, compatibility: e.target.value }))}
                  placeholder="Ej: PC, PS4, Raspberry Pi, Bartops"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Conexión / Ficha</label>
                <input
                  className="form-input"
                  value={accessorySpecs.connection_type}
                  onChange={(e) => setAccessorySpecs((p) => ({ ...p, connection_type: e.target.value }))}
                  placeholder="Ej: USB 2.0 / Terminal 4.8mm / Bluetooth"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Material / Terminación</label>
                <input
                  className="form-input"
                  value={accessorySpecs.material}
                  onChange={(e) => setAccessorySpecs((p) => ({ ...p, material: e.target.value }))}
                  placeholder="Ej: Acrílico / Plástico ABS / Metal"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dimensiones / Medidas</label>
                <input
                  className="form-input"
                  value={accessorySpecs.dimensions}
                  onChange={(e) => setAccessorySpecs((p) => ({ ...p, dimensions: e.target.value }))}
                  placeholder="Ej: 30mm diámetro / 20x15x5 cm"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Garantía</label>
                <input
                  className="form-input"
                  value={accessorySpecs.warranty}
                  onChange={(e) => setAccessorySpecs((p) => ({ ...p, warranty: e.target.value }))}
                  placeholder="Ej: 1 año de fábrica / 6 meses"
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Ficha Técnica: ARCADE / CONSOLA */}
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
          </>
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

        {/* Fotos del Producto & Generación IA */}
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                📸 Fotos del Producto ({images.length})
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Subí una o varias fotos desde tu PC o generalas automáticamente con Inteligencia Artificial.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAiModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: 'var(--color-cyan)', color: 'var(--color-cyan)' }}
              >
                <Sparkles size={16} /> Generar con IA
              </button>
              <label
                className="btn btn-primary btn-sm"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Upload size={16} /> Subir fotos
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          {images.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-3)' }}>
              {images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: idx === 0 ? '2px solid var(--color-cyan)' : '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                  }}
                >
                  <img
                    src={imgUrl}
                    alt={`Foto ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {idx === 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        left: 4,
                        background: 'rgba(0,0,0,0.75)',
                        color: 'var(--color-cyan)',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      Portada
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'rgba(0,0,0,0.75)',
                      border: 'none',
                      color: 'var(--color-danger)',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Eliminar foto"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-6)',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}
            >
              <ImageIcon size={32} />
              <div>Podés subir fotos del producto o generarlas con IA antes de guardar.</div>
            </div>
          )}
        </div>

        {/* Modal Generador de Fotos con IA */}
        {showAiModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-4)',
            }}
            onClick={() => !generatingAiImage && setShowAiModal(false)}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: 540,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-4) var(--space-5)',
                  borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} className="text-cyan" />
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>
                    Generar Foto de Producto con IA
                  </h3>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setShowAiModal(false)}
                  disabled={generatingAiImage}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  La IA creará una imagen fotográfica de estudio para <strong>{form.name || 'este producto'}</strong> con estética arcade y calidad comercial.
                </p>

                <div className="form-group">
                  <label className="form-label">Detalles visuales adicionales (opcional)</label>
                  <textarea
                    className="form-input form-textarea"
                    rows={3}
                    placeholder="Ej: Arcade bartop con marquesina iluminada, botones azul neón, vinilo de Street Fighter..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    disabled={generatingAiImage}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowAiModal(false)}
                    disabled={generatingAiImage}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleGenerateAiImage}
                    disabled={generatingAiImage}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    {generatingAiImage ? (
                      <>✨ Generando imagen con IA...</>
                    ) : (
                      <>✨ Generar y Adjuntar</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Carga Directa de Stock Inicial */}
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={18} className="text-cyan" />
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              📦 Stock Inmediato Inicial
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Indicá cuántas unidades tenés listas en este momento para que queden disponibles automáticamente en la tienda.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 'var(--space-4)', alignItems: 'center' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Unidades en stock</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={initialStock}
                onChange={(e) => setInitialStock(parseInt(e.target.value) || 0)}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {[0, 1, 3, 5, 10].map((val) => (
                <button
                  key={val}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ border: '1px solid var(--color-border)' }}
                  onClick={() => setInitialStock(val)}
                >
                  {val === 0 ? 'Sin stock' : `${val} un.`}
                </button>
              ))}
            </div>
          </div>
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
