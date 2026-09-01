'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'
import type { ProductType } from '@/lib/types'
import { ConsoleLogoSelector } from '@/components/admin/ConsoleLogoSelector'
import { Image as ImageIcon, Plus, Save, Search, Trash2, X } from 'lucide-react'

interface ProductVariantRow {
  id: string
  cabinet_type: string | null
  screen_size: string | null
  price_modifier: number
  is_active: boolean
}

interface SupplyRow {
  id: string
  name: string
  supply_type: string
  color_label: string | null
  image_url: string | null
  quantity: number
}

interface ProductMeta {
  led_surcharge?: number
  led_enabled?: boolean
  players_count?: number
  joysticks_count?: number
  buttons_per_player?: number
  families?: string[]
  vinyl_supply_ids?: string[]
  primary_console_logo_ids?: string[]
  secondary_console_logo_ids?: string[]
  bom?: unknown[]
  [key: string]: unknown
}

interface ConsoleLogoPreset {
  id: string
  name: string
  primary_logo_ids: string[]
  secondary_logo_ids: string[]
  created_at?: string
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const toast = useToast()
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [variants, setVariants] = useState<ProductVariantRow[]>([])
  const [productMeta, setProductMeta] = useState<ProductMeta>({})

  const [form, setForm] = useState({
    name: '',
    slug: '',
    short_description: '',
    description: '',
    product_type: 'arcade' as ProductType,
    base_price: '',
    retail_markup_pct: '30',
    requires_production: true,
    is_active: true,
    is_featured: false,
    meta_description: '{}',
  })

  const [allSupplies, setAllSupplies] = useState<SupplyRow[]>([])
  const [families, setFamilies] = useState<any[]>([])
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([])
  const [bom, setBom] = useState<unknown[]>([])
  const [selectedVinylIds, setSelectedVinylIds] = useState<string[]>([])
  const [primaryConsoleLogoIds, setPrimaryConsoleLogoIds] = useState<string[]>([])
  const [secondaryConsoleLogoIds, setSecondaryConsoleLogoIds] = useState<string[]>([])
  const [logoPresets, setLogoPresets] = useState<ConsoleLogoPreset[]>([])
  const [selectedLogoPresetId, setSelectedLogoPresetId] = useState('')
  const [newLogoPresetName, setNewLogoPresetName] = useState('')
  const [savingLogoPreset, setSavingLogoPreset] = useState(false)
  const [coverImage, setCoverImage] = useState('')
  const [vinylSearch, setVinylSearch] = useState('')
  const [vinylFolderFilter, setVinylFolderFilter] = useState('all')
  const [ledSurcharge, setLedSurcharge] = useState('0')
  const [ledEnabled, setLedEnabled] = useState(true)
  const [playersCount, setPlayersCount] = useState(2)
  const [joysticksCount, setJoysticksCount] = useState(2)
  const [buttonsPerPlayer, setButtonsPerPlayer] = useState(6)
  const [gamesCount, setGamesCount] = useState('')

  const [newVariant, setNewVariant] = useState({
    cabinet_type: 'bartop',
    screen_size: '',
    price_modifier: '0'
  })

  useEffect(() => {
    async function load() {
      if (!params.id) return
      const { data, error } = await supabase.from('products').select('*').eq('id', params.id).single()
      if (data) {
        setForm({
          name: data.name || '',
          slug: data.slug || '',
          short_description: data.short_description || '',
          description: data.description || '',
          product_type: data.product_type || 'arcade',
          base_price: data.base_price?.toString() || '0',
          retail_markup_pct: data.retail_markup_pct?.toString() || '30',
          requires_production: data.requires_production ?? true,
          is_active: data.is_active ?? true,
          is_featured: data.is_featured ?? false,
          meta_description: data.meta_description || '{}',
        })
        try {
          const obj = JSON.parse(data.meta_description || '{}') as ProductMeta
          setProductMeta(obj)
          setLedSurcharge(obj.led_surcharge?.toString() || '0')
          setLedEnabled(obj.led_enabled ?? true)
          setPlayersCount(obj.players_count ?? 2)
          setJoysticksCount(obj.joysticks_count ?? 2)
          setButtonsPerPlayer(obj.buttons_per_player ?? 6)
          setGamesCount(obj.games_count?.toString() || '')
          setSelectedFamilies(obj.families || [])
          setSelectedVinylIds(obj.vinyl_supply_ids || [])
          setPrimaryConsoleLogoIds(obj.primary_console_logo_ids || [])
          setSecondaryConsoleLogoIds(obj.secondary_console_logo_ids || [])
          setBom(obj.bom || [])
          setCoverImage(Array.isArray(data.images) ? data.images[0] || '' : '')
        } catch {
          const surcharge = parseFloat(data.meta_description) || 0
          setLedSurcharge(surcharge.toString())
          setBom([])
          setCoverImage(Array.isArray(data.images) ? data.images[0] || '' : '')
        }
      }
      
      const { data: vData } = await supabase.from('product_variants').select('*').eq('product_id', params.id).order('sort_order')
      if (vData) setVariants(vData)

      const { data: sData } = await supabase.from('supply_inventory').select('*').eq('is_active', true).order('supply_type')
      if (sData) setAllSupplies(sData)

      const { data: configData } = await supabase
        .from('pricing_config')
        .select('*')
        .in('key', ['supply_families', 'console_logo_presets'])

      const familiesConfig = configData?.find((config) => config.key === 'supply_families')
      if (familiesConfig?.value) {
        try {
          const parsed = typeof familiesConfig.value === 'string' ? JSON.parse(familiesConfig.value) : familiesConfig.value
          setFamilies(Array.isArray(parsed) ? parsed : [])
        } catch {}
      }

      const logoPresetConfig = configData?.find((config) => config.key === 'console_logo_presets')
      if (logoPresetConfig?.value) {
        try {
          const parsed = typeof logoPresetConfig.value === 'string' ? JSON.parse(logoPresetConfig.value) : logoPresetConfig.value
          setLogoPresets(Array.isArray(parsed) ? parsed : [])
        } catch {}
      }
      
      setInitialLoading(false)
    }
    load()
  }, [params.id, supabase])

  function handleNameChange(name: string) {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
    setForm((prev) => ({ ...prev, name, slug }))
  }

  const vinyls = useMemo(() => {
    return allSupplies
      .filter((supply) => supply.supply_type === 'vinyl')
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [allSupplies])

  const selectedVinyls = useMemo(() => {
    const selected = new Set(selectedVinylIds)
    return vinyls.filter((vinyl) => selected.has(vinyl.id))
  }, [selectedVinylIds, vinyls])

  const vinylFolders = useMemo(() => {
    return Array.from(new Set(vinyls.map((vinyl) => vinyl.color_label).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b, 'es'))
  }, [vinyls])

  const filteredVinyls = useMemo(() => {
    const search = vinylSearch.trim().toLowerCase()
    return vinyls.filter((vinyl) => {
      const matchesFolder = vinylFolderFilter === 'all' || vinyl.color_label === vinylFolderFilter
      const matchesSearch = !search || `${vinyl.name} ${vinyl.color_label || ''}`.toLowerCase().includes(search)
      return matchesFolder && matchesSearch
    })
  }, [vinylFolderFilter, vinylSearch, vinyls])

  const filteredSelectedCount = filteredVinyls.filter((vinyl) => selectedVinylIds.includes(vinyl.id)).length

  function selectFilteredVinyls() {
    setSelectedVinylIds((current) => Array.from(new Set([...current, ...filteredVinyls.map((vinyl) => vinyl.id)])))
    if (!coverImage) {
      const firstWithImage = filteredVinyls.find((vinyl) => vinyl.image_url)
      if (firstWithImage?.image_url) setCoverImage(firstWithImage.image_url)
    }
  }

  function unselectFilteredVinyls() {
    const filteredIds = new Set(filteredVinyls.map((vinyl) => vinyl.id))
    setSelectedVinylIds((current) => {
      const next = current.filter((id) => !filteredIds.has(id))
      const currentCoverStillSelected = vinyls.some((vinyl) => next.includes(vinyl.id) && vinyl.image_url === coverImage)
      if (!currentCoverStillSelected) {
        const fallback = vinyls.find((vinyl) => next.includes(vinyl.id) && vinyl.image_url)
        setCoverImage(fallback?.image_url || '')
      }
      return next
    })
  }

  function toggleVinyl(vinyl: SupplyRow) {
    setSelectedVinylIds((current) => {
      const exists = current.includes(vinyl.id)
      const next = exists ? current.filter((id) => id !== vinyl.id) : [...current, vinyl.id]
      if (!exists && !coverImage && vinyl.image_url) setCoverImage(vinyl.image_url)
      if (exists && vinyl.image_url === coverImage) {
        const fallback = vinyls.find((candidate) => next.includes(candidate.id) && candidate.image_url)
        setCoverImage(fallback?.image_url || '')
      }
      return next
    })
  }

  function applyLogoPreset(presetId: string) {
    const preset = logoPresets.find((item) => item.id === presetId)
    setSelectedLogoPresetId(presetId)
    if (!preset) return

    const primaryIds = Array.isArray(preset.primary_logo_ids) ? preset.primary_logo_ids.slice(0, 10) : []
    const primarySet = new Set(primaryIds)
    const secondaryIds = Array.isArray(preset.secondary_logo_ids)
      ? preset.secondary_logo_ids.filter((id) => !primarySet.has(id))
      : []

    setPrimaryConsoleLogoIds(primaryIds)
    setSecondaryConsoleLogoIds(secondaryIds)
    toast.success('Preselección aplicada', preset.name)
  }

  async function saveCurrentLogoPreset() {
    const name = newLogoPresetName.trim()
    if (!name) {
      toast.error('Poné un nombre para la preselección')
      return
    }

    const primaryIds = primaryConsoleLogoIds.slice(0, 10)
    const primarySet = new Set(primaryIds)
    const secondaryIds = secondaryConsoleLogoIds.filter((id) => !primarySet.has(id))

    if (primaryIds.length === 0 && secondaryIds.length === 0) {
      toast.error('Elegí al menos un logo antes de guardar')
      return
    }

    setSavingLogoPreset(true)
    const preset: ConsoleLogoPreset = {
      id: `preset-${Date.now().toString(36)}`,
      name,
      primary_logo_ids: primaryIds,
      secondary_logo_ids: secondaryIds,
      created_at: new Date().toISOString(),
    }
    const nextPresets = [
      ...logoPresets.filter((item) => item.name.trim().toLowerCase() !== name.toLowerCase()),
      preset,
    ].sort((a, b) => a.name.localeCompare(b.name, 'es'))

    const { error } = await supabase.from('pricing_config').upsert(
      {
        key: 'console_logo_presets',
        label: 'Preselecciones de logos de consolas',
        value: JSON.stringify(nextPresets),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )

    setSavingLogoPreset(false)
    if (error) {
      toast.error('No se pudo guardar la preselección', error.message)
      return
    }

    setLogoPresets(nextPresets)
    setSelectedLogoPresetId(preset.id)
    setNewLogoPresetName('')
    toast.success('Preselección guardada', name)
  }

  function clearConsoleLogos() {
    setPrimaryConsoleLogoIds([])
    setSecondaryConsoleLogoIds([])
    setSelectedLogoPresetId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const metaJSON = JSON.stringify({
      ...productMeta,
      led_surcharge: parseFloat(ledSurcharge) || 0,
      led_enabled: ledEnabled,
      players_count: playersCount,
      joysticks_count: joysticksCount,
      buttons_per_player: buttonsPerPlayer,
      games_count: parseInt(gamesCount) || 0,
      families: selectedFamilies,
      vinyl_supply_ids: selectedVinylIds,
      primary_console_logo_ids: primaryConsoleLogoIds.slice(0, 10),
      secondary_console_logo_ids: secondaryConsoleLogoIds.filter((id) => !primaryConsoleLogoIds.includes(id)),
      bom: bom
    })

    const { error } = await supabase
      .from('products')
      .update({
        ...form,
        base_price: parseFloat(form.base_price) || 0,
        retail_markup_pct: parseFloat(form.retail_markup_pct) || 30,
        images: coverImage ? [coverImage] : [],
        meta_description: metaJSON,
      })
      .eq('id', params.id)

    setLoading(false)

    if (error) {
      toast.error('Error al actualizar el producto', error.message)
      return
    }

    toast.success('Producto actualizado', form.name)
    router.push('/admin/productos')
  }

  async function handleAddVariant(e: React.FormEvent) {
    e.preventDefault()
    const { data, error } = await supabase.from('product_variants').insert({
      product_id: params.id,
      cabinet_type: newVariant.cabinet_type,
      screen_size: newVariant.screen_size || null,
      price_modifier: parseFloat(newVariant.price_modifier) || 0,
      is_active: true
    }).select().single()

    if (data) {
      setVariants([...variants, data])
      setNewVariant({ cabinet_type: 'bartop', screen_size: '', price_modifier: '0' })
      toast.success('Variante agregada')
    } else if (error) {
      toast.error('Error', error.message)
    }
  }

  async function handleDeleteVariant(variantId: string) {
    if (!confirm('¿Quitar esta variante del producto?')) return
    const { error } = await supabase.from('product_variants').delete().eq('id', variantId)
    if (error) {
      toast.error('No se pudo quitar la variante', error.message)
      return
    }
    setVariants((current) => current.filter((variant) => variant.id !== variantId))
    toast.success('Variante quitada')
  }

  if (initialLoading) return <div style={{ padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
          Editar producto
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Actualizá los datos del producto y sus variantes</p>
      </div>

      <form
        id="product-edit-form"
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

        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Logos de consolas del producto
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', margin: 0 }}>
            Elegí los logos que se mostrarán debajo de la descripción del producto. La primera hilera acepta hasta 10 principales.
          </p>
          <div className="admin-logo-preset-panel">
            <div>
              <label className="form-label" htmlFor="logo-preset-select">Aplicar preselección</label>
              <select
                id="logo-preset-select"
                className="form-input form-select"
                value={selectedLogoPresetId}
                onChange={(event) => applyLogoPreset(event.target.value)}
              >
                <option value="">Elegir una preselección guardada</option>
                {logoPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} ({preset.primary_logo_ids.length + preset.secondary_logo_ids.length} logos)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="logo-preset-name">Guardar selección actual como</label>
              <input
                id="logo-preset-name"
                className="form-input"
                value={newLogoPresetName}
                onChange={(event) => setNewLogoPresetName(event.target.value)}
                placeholder="Ej: Clásicos arcade / Consolas 90s"
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveCurrentLogoPreset}
              disabled={savingLogoPreset}
            >
              <Save size={16} />
              {savingLogoPreset ? 'Guardando...' : 'Guardar preset'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={clearConsoleLogos}
            >
              Limpiar
            </button>
            <p>
              Estas preselecciones quedan disponibles para todos los productos. Si guardás otra con el mismo nombre, se reemplaza.
            </p>
          </div>
          <ConsoleLogoSelector
            title="Hilera principal"
            description="Los 10 sistemas más importantes para este modelo."
            selectedIds={primaryConsoleLogoIds}
            onChange={setPrimaryConsoleLogoIds}
            max={10}
          />
          <ConsoleLogoSelector
            title="Hilera secundaria"
            description="El resto de sistemas que querés mostrar en una segunda hilera."
            selectedIds={secondaryConsoleLogoIds}
            onChange={setSecondaryConsoleLogoIds}
            excludeIds={primaryConsoleLogoIds}
          />
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
            id="update-product-submit-btn"
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
      
      <div className="card card-body" style={{ marginTop: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Variantes ({variants.length})
        </h3>
        {variants.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {variants.map(v => (
              <div key={v.id} className="admin-variant-row">
                <div>
                  <strong>{v.cabinet_type || 'Sin tipo'}</strong>
                  <span>{v.screen_size ? `Pantalla ${v.screen_size}` : 'Sin pantalla definida'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong>{Number(v.price_modifier) > 0 ? `+ $${Number(v.price_modifier).toLocaleString('es-AR')}` : '$0'}</strong>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteVariant(v.id)} aria-label="Quitar variante">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <form onSubmit={handleAddVariant} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 16 }}>
           <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="v-cab">Tipo de Mueble</label>
              <select
                id="v-cab"
                className="form-input form-select"
                value={newVariant.cabinet_type}
                onChange={(e) => setNewVariant((p) => ({ ...p, cabinet_type: e.target.value }))}
              >
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
                <option value="bartop">Bartop</option>
                <option value="pedestal">Pedestal</option>
                <option value="cocktail">Cocktail</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="v-size">Pantalla</label>
              <input id="v-size" className="form-input" placeholder='ej: 22"' value={newVariant.screen_size} onChange={e => setNewVariant(p => ({...p, screen_size: e.target.value}))}/>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="v-price">Modificador $</label>
              <input id="v-price" type="number" className="form-input" value={newVariant.price_modifier} onChange={e => setNewVariant(p => ({...p, price_modifier: e.target.value}))}/>
            </div>
            <button type="submit" className="btn btn-secondary" style={{ height: 42 }}>
              <Plus size={16} /> Añadir
            </button>
        </form>
      </div>

      <div className="card card-body" style={{ marginTop: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Vinilos y portada ({selectedVinyls.length})
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', margin: 0 }}>
            Marcá los diseños que pertenecen al producto y elegí cuál se usa como portada del catálogo.
          </p>
        </div>

        {coverImage ? (
          <div className="admin-cover-preview">
            <img src={coverImage} alt="Portada seleccionada" />
          </div>
        ) : (
          <div className="admin-cover-empty">
            <ImageIcon size={24} />
            Sin portada seleccionada
          </div>
        )}

        <div className="admin-vinyl-toolbar">
          <label className="admin-search-field" style={{ margin: 0 }}>
            <Search size={16} />
            <input
              value={vinylSearch}
              onChange={(event) => setVinylSearch(event.target.value)}
              placeholder="Buscar vinilo por nombre…"
            />
            {vinylSearch && (
              <button type="button" onClick={() => setVinylSearch('')} aria-label="Limpiar búsqueda">
                <X size={14} />
              </button>
            )}
          </label>

          <div className="admin-filter-group">
            <select
              value={vinylFolderFilter}
              onChange={(event) => setVinylFolderFilter(event.target.value)}
              aria-label="Filtrar por familia de vinilo"
            >
              <option value="all">Todas las familias</option>
              {vinylFolders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-vinyl-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={selectFilteredVinyls} disabled={filteredVinyls.length === 0}>
              Seleccionar visibles
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={unselectFilteredVinyls} disabled={filteredSelectedCount === 0}>
              Quitar visibles
            </button>
          </div>
        </div>

        <div className="admin-vinyl-summary">
          <span>{filteredVinyls.length} visibles</span>
          <span>{filteredSelectedCount} seleccionados en esta vista</span>
          <span>{selectedVinylIds.length} seleccionados total</span>
        </div>

        <div className="admin-vinyl-grid">
          {filteredVinyls.map((vinyl) => {
            const checked = selectedVinylIds.includes(vinyl.id)
            const isCover = coverImage && vinyl.image_url === coverImage
            return (
              <div key={vinyl.id} className={`admin-vinyl-tile ${checked ? 'selected' : ''}`}>
                {vinyl.image_url ? <img src={vinyl.image_url} alt={vinyl.name} /> : <div className="admin-cover-empty">Sin imagen</div>}
                <label>
                  <input type="checkbox" checked={checked} onChange={() => toggleVinyl(vinyl)} />
                  <span>
                    {vinyl.name}
                    {vinyl.color_label && <small>{vinyl.color_label}</small>}
                  </span>
                </label>
                <button
                  type="button"
                  className={isCover ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                  disabled={!vinyl.image_url || !checked}
                  onClick={() => setCoverImage(vinyl.image_url || '')}
                >
                  {isCover ? 'Portada actual' : 'Usar portada'}
                </button>
              </div>
            )
          })}
          {filteredVinyls.length === 0 && (
            <div className="admin-empty-state" style={{ gridColumn: '1 / -1' }}>
              No hay vinilos que coincidan con esa búsqueda.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" form="product-edit-form" className="btn btn-primary" disabled={loading}>
            <Save size={16} /> Guardar portada y vinilos
          </button>
        </div>
      </div>

    </div>
  )
}
