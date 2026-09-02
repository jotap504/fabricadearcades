'use client'

import { useState, useMemo, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShoppingCart, ChevronLeft, ChevronRight, Play, Check } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCartStore } from '@/lib/stores/cart'
import { useToast } from '@/lib/stores/toast'
import {
  formatPrice,
  getEffectivePrice,
  STOCK_BADGE_CONFIG,
  CABINET_TYPE_LABELS,
  type Product,
  type ProductVariant,
  type StockItem,
  type SupplyInventory,
  type DeliveryConfig,
  type ArcadeCustomization,
  type PlayerCustomization,
  type StockType,
  type CabinetType,
  getProductPlayers,
} from '@/lib/types'
import { clsx } from 'clsx'
import Link from 'next/link'
import { ConsoleLogoRows } from '@/components/products/ConsoleLogoRows'

interface Props {
  product: Product
  variants: ProductVariant[]
  stockItems: StockItem[]
  supplies: SupplyInventory[]
  deliveryConfig: DeliveryConfig[]
  accessories?: Product[]
}

export function ProductDetailClient({
  product,
  variants,
  stockItems,
  supplies,
  deliveryConfig,
  accessories = [],
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useAuth()
  const { addItem } = useCartStore()
  const toast = useToast()

  const role =
    profile?.role === 'distribuidor' && profile.distributor_approved ? 'distribuidor' : 'cliente'
  const basePrice = getEffectivePrice(product, role)

  // Parse product specs from meta_description
  const productSpecs = useMemo(() => {
    let specs: any = {
      players_count: 2,
      joysticks_count: 2,
      buttons_per_player: 6,
      games_count: 0,
      led_enabled: true,
      led_surcharge: 0,
      families: [],
      vinyl_supply_ids: [],
      presets: [],
      bom: [],
    }
    try {
      const parsed = JSON.parse(product.meta_description || '{}')
      specs = { ...specs, ...parsed }
      if (typeof parsed.led_surcharge === 'number') specs.led_surcharge = parsed.led_surcharge
    } catch {
      const surcharge = parseFloat(product.meta_description || '0') || 0
      specs.led_surcharge = surcharge
    }
    return specs
  }, [product.meta_description])

  const numPlayers = productSpecs.players_count || getProductPlayers(product)
  const legacyPresets = productSpecs.presets || []
  const stockPresets = stockItems
    .filter((item) => item.stock_type === 'immediate' && item.quantity > 0 && item.configuration)
    .map((item) => ({ ...item.configuration, stock_id: item.id, units: item.quantity }))
  const presets = stockPresets.length > 0 ? stockPresets : legacyPresets
  const bom = productSpecs.bom || []
  const productFamilies: string[] = productSpecs.families || []
  const productVinylSupplyIds: string[] = productSpecs.vinyl_supply_ids || []

  // All families defined
  const allSupplyFamilies: any[] = (product as any).supply_families || []

  // Helper to test if a supply is LED
  const isLedSupply = (s: SupplyInventory) => {
    const text = `${s.name} ${s.color_label || ''}`.toLowerCase()
    return text.includes('led') || s.supply_type === 'led'
  }

  // Supply IDs allowed by assigned families
  const allowedSupplyIds = useMemo(() => {
    if (productFamilies.length === 0) return null // All allowed if no families explicitly assigned
    const ids = new Set<string>()
    allSupplyFamilies
      .filter((f) => productFamilies.includes(f.id) || productFamilies.includes(f.name))
      .forEach((f) => {
        (f.supply_ids || []).forEach((id: string) => ids.add(id))
      })
    return ids
  }, [productFamilies, allSupplyFamilies])

  // Customization state
  const initialPreset = presets.length > 0 ? presets[0] : null
  const initialStockItem = initialPreset ? stockItems.find((s) => s.id === initialPreset.stock_id) : null
  const initialVariant = initialStockItem ? variants.find((v) => v.id === initialStockItem?.variant_id) : null

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    (initialVariant || variants[0]) ?? null
  )
  const [activePlayer, setActivePlayer] = useState(0)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    initialPreset ? (initialPreset.stock_id || initialPreset.id) : null
  )

  const [joystickType, setJoystickType] = useState<'standard' | 'led'>(
    initialPreset?.joystick_type || 'standard'
  )
  const [buttonType, setButtonType] = useState<'standard' | 'led'>(
    initialPreset?.button_type || 'standard'
  )
  const [vinylSource, setVinylSource] = useState<'stock' | 'print' | 'custom'>('stock')

  const [customization, setCustomization] = useState<ArcadeCustomization>(() => {
    if (initialPreset) {
      const vinyl = supplies.find((s) => s.id === initialPreset.vinyl_supply_id)
      const joystickSupply = supplies.find((s) => s.supply_type === 'joystick' && s.color_label === initialPreset.joystick_color)
      const buttonSupply = supplies.find((s) => s.supply_type === 'button' && s.color_label === initialPreset.button_color)

      const players = Array.from({ length: numPlayers }, () => ({
        joystick_supply_id: joystickSupply?.id || '',
        joystick_color: initialPreset.joystick_color || '',
        button_supply_ids: buttonSupply ? [buttonSupply.id] : [],
        button_color: initialPreset.button_color || '',
        button_count: productSpecs.buttons_per_player || 6,
      }))

      return {
        control_type: (initialPreset.joystick_type === 'led' || initialPreset.button_type === 'led') ? 'led' : 'standard',
        joystick_type: initialPreset.joystick_type || 'standard',
        button_type: initialPreset.button_type || 'standard',
        cabinet_type: initialVariant?.cabinet_type || undefined,
        screen_size: initialVariant?.screen_size || undefined,
        vinyl_source: 'stock',
        vinyl_supply_id: initialPreset.vinyl_supply_id || undefined,
        vinyl_name: initialPreset.vinyl_name || vinyl?.name || undefined,
        players,
      }
    }

    const defaultPlayers = Array.from({ length: numPlayers }, () => ({
      joystick_supply_id: '',
      joystick_color: '',
      button_supply_ids: [],
      button_count: productSpecs.buttons_per_player || 6,
    }))
    return {
      control_type: 'standard',
      joystick_type: 'standard',
      button_type: 'standard',
      vinyl_source: 'stock',
      players: defaultPlayers,
    }
  })

  const [quantity, setQuantity] = useState(1)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const vinylParam = searchParams.get('vinilo')

  const ledSurchargeFull = productSpecs.led_surcharge || 0

  // 50% for joysticks, 50% for buttons
  const calculatedLedSurcharge = useMemo(() => {
    if (!productSpecs.led_enabled) return 0
    let surcharge = 0
    if (joystickType === 'led') surcharge += ledSurchargeFull * 0.5
    if (buttonType === 'led') surcharge += ledSurchargeFull * 0.5
    return surcharge
  }, [productSpecs.led_enabled, joystickType, buttonType, ledSurchargeFull])

  const addonsCost = useMemo(() => {
    return (customization.addons ?? []).reduce((sum: number, addon) => {
      return sum + addon.price
    }, 0)
  }, [customization.addons])

  const handleSelectPreset = (preset: any) => {
    setSelectedPresetId(preset.stock_id || preset.id)

    const stockItem = stockItems.find((s) => s.id === preset.stock_id)
    const variant = variants.find((v) => v.id === stockItem?.variant_id)
    if (variant) setSelectedVariant(variant)

    setJoystickType(preset.joystick_type || 'standard')
    setButtonType(preset.button_type || 'standard')

    setCustomization((prev) => {
      const vinyl = supplies.find((s) => s.id === preset.vinyl_supply_id)
      const joystickSupply = supplies.find((s) => s.supply_type === 'joystick' && s.color_label === preset.joystick_color)
      const buttonSupply = supplies.find((s) => s.supply_type === 'button' && s.color_label === preset.button_color)

      const players = (prev.players || []).map((p) => ({
        ...p,
        joystick_supply_id: joystickSupply?.id || '',
        joystick_color: preset.joystick_color || '',
        button_supply_ids: buttonSupply ? [buttonSupply.id] : [],
        button_color: preset.button_color || '',
      }))

      return {
        ...prev,
        control_type: (preset.joystick_type === 'led' || preset.button_type === 'led') ? 'led' : 'standard',
        joystick_type: preset.joystick_type || 'standard',
        button_type: preset.button_type || 'standard',
        cabinet_type: variant?.cabinet_type || prev.cabinet_type,
        screen_size: variant?.screen_size || prev.screen_size,
        vinyl_supply_id: preset.vinyl_supply_id || undefined,
        vinyl_name: preset.vinyl_name || vinyl?.name || undefined,
        players,
      }
    })
  }

  const handleSelectCustom = () => {
    setSelectedPresetId(null)
  }

  const joysticks = useMemo(() => {
    let list = supplies.filter((s) => s.supply_type === 'joystick' && s.is_active && s.quantity > 0)
    if (allowedSupplyIds && allowedSupplyIds.size > 0) {
      list = list.filter((s) => allowedSupplyIds.has(s.id))
    } else if (bom.length > 0) {
      list = list.filter((s) => bom.some((b: any) => b.supply_id === s.id))
    }
    const isLed = joystickType === 'led'
    return list.filter((s) => (isLed ? isLedSupply(s) : !isLedSupply(s)))
  }, [supplies, allowedSupplyIds, bom, joystickType])

  const buttons = useMemo(() => {
    let list = supplies.filter((s) => s.supply_type === 'button' && s.is_active && s.quantity > 0)
    if (allowedSupplyIds && allowedSupplyIds.size > 0) {
      list = list.filter((s) => allowedSupplyIds.has(s.id))
    } else if (bom.length > 0) {
      list = list.filter((s) => bom.some((b: any) => b.supply_id === s.id))
    }
    const isLed = buttonType === 'led'
    return list.filter((s) => (isLed ? isLedSupply(s) : !isLedSupply(s)))
  }, [supplies, allowedSupplyIds, bom, buttonType])

  const vinylsInStock = useMemo(() => {
    let list = supplies.filter((s) => s.supply_type === 'vinyl' && s.is_active && s.quantity > 0)
    if (productVinylSupplyIds.length > 0) {
      list = list.filter((s) => productVinylSupplyIds.includes(s.id))
    } else if (allowedSupplyIds && allowedSupplyIds.size > 0) {
      list = list.filter((s) => allowedSupplyIds.has(s.id))
    } else if (bom.length > 0) {
      list = list.filter((s) => bom.some((b: any) => b.supply_id === s.id))
    }
    const seen = new Set<string>()
    return list.filter((vinyl) => {
      const key = vinyl.id || vinyl.image_url || vinyl.name
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [supplies, productVinylSupplyIds, allowedSupplyIds, bom])

  const allCompatibleVinyls = useMemo(() => {
    let list = supplies.filter((s) => s.supply_type === 'vinyl' && s.is_active)
    if (productVinylSupplyIds.length > 0) {
      list = list.filter((s) => productVinylSupplyIds.includes(s.id))
    } else if (allowedSupplyIds && allowedSupplyIds.size > 0) {
      list = list.filter((s) => allowedSupplyIds.has(s.id))
    }
    const seen = new Set<string>()
    return list.filter((vinyl) => {
      const key = vinyl.id || vinyl.image_url || vinyl.name
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [supplies, productVinylSupplyIds, allowedSupplyIds])

  // Dynamic images based on vinyl selection
  const selectedVinyl = useMemo(() => {
    if (customization.vinyl_supply_id) {
      return (
        supplies.find((s) => s.id === customization.vinyl_supply_id) ||
        allCompatibleVinyls.find((s) => s.id === customization.vinyl_supply_id)
      )
    }
    if (customization.vinyl_name && customization.vinyl_name !== 'Personalizado a Medida') {
      return (
        supplies.find((s) => s.name.toLowerCase() === customization.vinyl_name?.toLowerCase()) ||
        allCompatibleVinyls.find((s) => s.name.toLowerCase() === customization.vinyl_name?.toLowerCase())
      )
    }
    return undefined
  }, [supplies, allCompatibleVinyls, customization.vinyl_supply_id, customization.vinyl_name])

  const images = useMemo(() => {
    const base = product.images ?? []
    if (selectedVinyl?.image_url) {
      return [selectedVinyl.image_url, ...base]
    }
    return base
  }, [product.images, selectedVinyl])

  // Image gallery state
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    setActiveImage(0)
  }, [selectedVinyl?.image_url, customization.vinyl_supply_id, customization.vinyl_name, customization.vinyl_source])

  useEffect(() => {
    if (vinylParam) {
      const requestedVinyl = allCompatibleVinyls.find((vinyl) => vinyl.id === vinylParam)
      if (requestedVinyl) {
        setVinylSource(requestedVinyl.quantity > 0 ? 'stock' : 'print')
        setCustomization((prev) => ({
          ...prev,
          vinyl_supply_id: requestedVinyl.id,
          vinyl_name: requestedVinyl.name,
          vinyl_source: requestedVinyl.quantity > 0 ? 'stock' : 'print',
        }))
        return
      }
    }

    if (customization.vinyl_source === 'custom' || customization.vinyl_name || customization.vinyl_supply_id) {
      return
    }

    const firstStockVinyl = vinylsInStock[0]
    if (firstStockVinyl) {
      setVinylSource('stock')
      setCustomization((prev) => ({
        ...prev,
        vinyl_supply_id: firstStockVinyl.id,
        vinyl_name: firstStockVinyl.name,
        vinyl_source: 'stock',
      }))
      return
    }

    const firstPrintableVinyl = allCompatibleVinyls[0]
    if (firstPrintableVinyl) {
      setVinylSource('print')
        setCustomization((prev) => ({
          ...prev,
          vinyl_supply_id: firstPrintableVinyl.id,
          vinyl_name: firstPrintableVinyl.name,
          vinyl_source: 'print',
        }))
    }
  }, [
    allCompatibleVinyls,
    customization.vinyl_name,
    customization.vinyl_source,
    customization.vinyl_supply_id,
    vinylParam,
    vinylsInStock,
  ])

  const withPrintedVinylDays = productSpecs.production_days_with_printed_vinyl
  const withoutPrintedVinylDays = productSpecs.production_days_without_printed_vinyl
  const designedDaysLabel = withoutPrintedVinylDays?.min && withoutPrintedVinylDays?.max
    ? withoutPrintedVinylDays.min === withoutPrintedVinylDays.max
      ? `${withoutPrintedVinylDays.min} días hábiles`
      : `${withoutPrintedVinylDays.min} a ${withoutPrintedVinylDays.max} días hábiles`
    : '7 días hábiles'

  // Compute delivery badge based on selection
  const deliveryEstimate = useMemo(() => {
    if (selectedPresetId) {
      return { badge: '⚡ Entrega Inmediata', subtitle: 'Listo para retirar / despachar hoy', type: 'immediate' }
    }
    if (vinylSource === 'stock' && selectedVinyl && selectedVinyl.quantity > 0) {
      const label = withPrintedVinylDays ? `${withPrintedVinylDays} días hábiles` : '24/48 hs'
      return { badge: `⏱️ Listo en ${label}`, subtitle: 'Vinilo ya impreso en fábrica', type: 'printed' }
    }
    return { badge: `🎨 Diseñado / impresión a medida: ${designedDaysLabel}`, subtitle: 'Imprimimos y armamos tu diseño a medida', type: 'designed' }
  }, [selectedPresetId, vinylSource, selectedVinyl, withPrintedVinylDays, designedDaysLabel])

  // Compute stock availability
  const stockSummary = useMemo(() => {
    const immediate = stockItems
      .filter(
        (s) =>
          s.stock_type === 'immediate' &&
          (selectedVariant ? s.variant_id === selectedVariant.id || s.variant_id === null : true)
      )
      .reduce((sum, s) => sum + s.quantity, 0)
    const printed = stockItems
      .filter((s) => s.stock_type === 'printed')
      .reduce((sum, s) => sum + s.quantity, 0)
    const designed = stockItems
      .filter((s) => s.stock_type === 'designed')
      .reduce((sum, s) => sum + s.quantity, 0)

    const availability: StockType =
      immediate > 0 ? 'immediate' : printed > 0 ? 'printed' : designed > 0 ? 'designed' : product.requires_production ? 'designed' : 'none'

    return { immediate, printed, designed, total: immediate + printed + designed, availability }
  }, [stockItems, selectedVariant, product.requires_production])

  const stockConfig = STOCK_BADGE_CONFIG[stockSummary.availability]

  // Compute total price
  const variantModifier = selectedVariant?.price_modifier ?? 0
  const unitPrice = basePrice + variantModifier + calculatedLedSurcharge + addonsCost
  const selectedReadyStock = selectedPresetId
    ? stockItems.find((item) => item.id === selectedPresetId)
    : null
  const maxReadyQuantity = selectedReadyStock?.quantity ?? 0

  const stockValidationErrors = useMemo(() => {
    if (selectedPresetId) {
      if (!selectedReadyStock || selectedReadyStock.quantity < quantity) {
        return ['No hay suficiente stock listo para esa cantidad.']
      }
      return []
    }

    const errors: string[] = []
    const players = customization.players ?? []
    const joystickNeeds = new Map<string, number>()
    const buttonNeeds = new Map<string, number>()

    if ((productSpecs.joysticks_count ?? numPlayers) > 0) {
      players.forEach((player, index) => {
        const supplyId = player.joystick_supply_id || customization.joystick_supply_id
        if (!supplyId) {
          errors.push(`Elegí una palanca con stock para Jugador ${index + 1}.`)
          return
        }
        joystickNeeds.set(supplyId, (joystickNeeds.get(supplyId) ?? 0) + quantity)
      })
    }

    if ((productSpecs.buttons_per_player ?? 0) > 0) {
      players.forEach((player, index) => {
        const supplyId = player.button_supply_id || player.button_supply_ids?.[0] || customization.button_supply_ids?.[0]
        const buttonCount = Math.max(player.button_count ?? productSpecs.buttons_per_player ?? 1, 1)
        if (!supplyId) {
          errors.push(`Elegí botones con stock para Jugador ${index + 1}.`)
          return
        }
        buttonNeeds.set(supplyId, (buttonNeeds.get(supplyId) ?? 0) + buttonCount * quantity)
      })
    }

    joystickNeeds.forEach((needed, supplyId) => {
      const supply = supplies.find((item) => item.id === supplyId)
      if (!supply || supply.supply_type !== 'joystick' || supply.quantity < needed) {
        errors.push(`No hay stock suficiente de ${supply?.name ?? 'la palanca seleccionada'} (${needed} requerido/s).`)
      }
    })

    buttonNeeds.forEach((needed, supplyId) => {
      const supply = supplies.find((item) => item.id === supplyId)
      if (!supply || supply.supply_type !== 'button' || supply.quantity < needed) {
        errors.push(`No hay stock suficiente de ${supply?.name ?? 'los botones seleccionados'} (${needed} requerido/s).`)
      }
    })

    if (customization.vinyl_source === 'stock') {
      const vinylId = customization.vinyl_supply_id
      const vinyl = vinylId ? supplies.find((item) => item.id === vinylId) : null
      if (!vinylId || !vinyl || vinyl.quantity < quantity) {
        errors.push('Ese vinilo no tiene stock impreso. Cambiá a “Diseño a Pedido” para generar impresión.')
      }
    }

    return [...new Set(errors)]
  }, [
    customization,
    numPlayers,
    productSpecs.buttons_per_player,
    productSpecs.joysticks_count,
    quantity,
    selectedPresetId,
    selectedReadyStock,
    supplies,
  ])

  const canAddToCart = stockValidationErrors.length === 0

  const getPlayer = (index: number): PlayerCustomization => {
    return customization.players?.[index] ?? {
      joystick_supply_id: customization.joystick_supply_id || '',
      joystick_color: customization.joystick_color || '',
      button_supply_ids: customization.button_supply_ids || [],
      button_count: productSpecs.buttons_per_player || 6,
    }
  }

  const getSupplyById = (id?: string) => {
    if (!id) return undefined
    return supplies.find((item) => item.id === id)
  }

  const updatePlayerCustomization = (index: number, patch: Record<string, unknown>) => {
    setCustomization((prev) => {
      const players = Array.from({ length: numPlayers }, (_, playerIndex) => ({
        joystick_supply_id: prev.joystick_supply_id || '',
        joystick_color: prev.joystick_color || '',
        button_supply_ids: prev.button_supply_ids || [],
        button_supply_id: prev.button_supply_ids?.[0] || '',
        button_color: prev.button_color || '',
        button_count: productSpecs.buttons_per_player || 6,
        ...(prev.players?.[playerIndex] || {}),
      }))
      players[index] = { ...players[index], ...patch }

      return {
        ...prev,
        players,
        joystick_supply_id: players[0]?.joystick_supply_id,
        joystick_color: players[0]?.joystick_color,
        button_supply_ids: players[0]?.button_supply_ids,
        button_count: players[0]?.button_count,
      }
    })
  }

  const getButtonLayoutRows = (buttonCount: number) => {
    const count = Math.max(buttonCount || 0, 0)
    const presets: Record<number, { top: number; bottom: number }> = {
      8: { top: 2, bottom: 6 },
      10: { top: 2, bottom: 6 },
      11: { top: 3, bottom: 8 },
      13: { top: 5, bottom: 8 },
    }
    const preset = presets[count]
    const splitBottomRows = (bottom: number) => {
      if (bottom === 6) return [3, 3]
      if (bottom === 8) return [4, 4]
      if (bottom <= 4) return [bottom]
      return [Math.ceil(bottom / 2), Math.floor(bottom / 2)].filter(Boolean)
    }

    if (preset) {
      const used = Math.min(count, preset.top + preset.bottom)
      const top = Math.min(preset.top, used)
      const bottom = Math.min(preset.bottom, Math.max(count - top, 0))
      return {
        top,
        bottomRows: splitBottomRows(bottom),
        aux: Math.max(count - preset.top - preset.bottom, 0),
      }
    }

    if (count <= 6) {
      return { top: 0, bottomRows: splitBottomRows(count), aux: 0 }
    }

    const top = Math.ceil(count / 2)
    return { top, bottomRows: splitBottomRows(count - top), aux: 0 }
  }

  // Cabinet types available
  const cabinetTypes = [...new Set(variants.map((v) => v.cabinet_type).filter(Boolean))] as CabinetType[]
  const screenSizes = [
    ...new Set(
      variants
        .filter((v) => !selectedVariant?.cabinet_type || v.cabinet_type === selectedVariant.cabinet_type)
        .map((v) => v.screen_size)
        .filter(Boolean)
    ),
  ] as string[]

  const getConfigValue = (key: string) =>
    deliveryConfig.find((c) => c.key === key)?.value ?? ''

  function handleAddToCart() {
    // Removed login requirement for adding to cart
    if (!canAddToCart) {
      toast.error('Faltan insumos con stock', stockValidationErrors[0])
      return
    }

    addItem({
      product,
      variant: selectedVariant ?? undefined,
      quantity,
      unit_price: unitPrice,
      customization,
      stock_type: selectedPresetId ? 'immediate' : stockSummary.availability,
      stock_item_id: selectedPresetId ?? undefined,
      fulfillment_type: selectedPresetId ? 'ready_stock' : 'custom',
    })
    toast.success('¡Agregado al carrito!', product.name)
  }

  return (
    <div style={{ paddingBottom: 'var(--space-16)' }}>
      {/* Breadcrumb */}
      <div
        style={{
          background: 'var(--color-bg-2)',
          borderBottom: '1px solid var(--color-border)',
          padding: 'var(--space-4) 0',
        }}
      >
        <div className="container">
          <nav
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
            }}
          >
            <Link href="/" style={{ color: 'var(--color-text-muted)' }}>
              Inicio
            </Link>
            <span>/</span>
            <Link href="/productos" style={{ color: 'var(--color-text-muted)' }}>
              Catálogo
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--color-text)' }}>{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container" style={{ marginTop: 'var(--space-8)' }}>
        <div
          className="product-detail-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 'var(--space-10)',
            alignItems: 'start',
          }}
        >
          {/* LEFT: Gallery + Info */}
          <div>
            {/* Gallery */}
            <div
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                border: '1px solid var(--color-border)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div
                style={{
                  aspectRatio: '4/3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  background: 'var(--image-stage-bg)',
                  fontSize: '8rem',
                  padding: 'var(--space-4)',
                }}
              >
                {images[activeImage] ? (
                  <img
                    src={images[activeImage]}
                    alt={product.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--image-stage-shadow)',
                    }}
                  />
                ) : (
                  '🕹️'
                )}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setActiveImage((prev) => (prev - 1 + images.length) % images.length)
                      }
                      style={{
                        position: 'absolute',
                        left: 'var(--space-3)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.6)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'white',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() =>
                        setActiveImage((prev) => (prev + 1) % images.length)
                      }
                      style={{
                        position: 'absolute',
                        right: 'var(--space-3)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.6)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'white',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-3)',
                    overflowX: 'auto',
                  }}
                >
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      style={{
                        width: 64,
                        height: 48,
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        border: `2px solid ${i === activeImage ? 'var(--color-cyan)' : 'transparent'}`,
                        cursor: 'pointer',
                        flexShrink: 0,
                        background: 'var(--image-stage-bg)',
                        padding: 3,
                      }}
                    >
                      <img
                        src={img}
                        alt={`Imagen ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 2 }}
                      />
                    </button>
                  ))}
                  {product.video_url && (
                    <a
                      href={product.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: 64,
                        height: 48,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-surface-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '2px solid transparent',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <Play size={20} />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Product description */}
            {product.description && (
              <div
                className="card card-body"
                style={{ marginTop: 'var(--space-6)' }}
              >
                <h2
                  style={{
                    fontWeight: 700,
                    marginBottom: 'var(--space-3)',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontSize: '0.8125rem',
                  }}
                >
                  Descripción
                </h2>
                <div
                  style={{
                    fontSize: '0.9375rem',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {product.description}
                </div>
                {productSpecs.games_count > 0 && (
                  <p
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: 'var(--color-text-secondary)',
                      marginTop: 'var(--space-3)',
                    }}
                  >
                    🕹️ Incluye {productSpecs.games_count} juegos
                  </p>
                )}
                <ConsoleLogoRows
                  primaryIds={productSpecs.primary_console_logo_ids as string[] | undefined}
                  secondaryIds={productSpecs.secondary_console_logo_ids as string[] | undefined}
                />
              </div>
            )}

            {/* FAQ Accordion */}
            <div
              className="card card-body"
              style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
            >
              <h2
                style={{
                  fontWeight: 700,
                  marginBottom: 'var(--space-2)',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontSize: '0.8125rem',
                }}
              >
                Preguntas Frecuentes 🕹️
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[
                  {
                    q: '¿Viene listo para usar con juegos cargados?',
                    a: 'Sí, todos nuestros equipos se entregan configurados con un sistema multijuegos listo para usar (Plug & Play). Incluye miles de títulos clásicos retro de arcade, consolas y portátiles organizados por categorías con sus respectivas carátulas y videos.',
                  },
                  {
                    q: '¿Puedo conectar el equipo a internet o añadir más juegos?',
                    a: 'Pueden agregarse juegos. También podés conectar periféricos compatibles por USB según el modelo.',
                  },
                  {
                    q: '¿Tienen local o showroom para probar las máquinas?',
                    a: '¡Por supuesto! Podés visitarnos en nuestro showroom ubicado en Virgilio 2379, Devoto, Capital Federal. Escribinos para coordinar una cita y probar la calidad de fabricación, botones y pantallas.',
                  },
                  {
                    q: '¿Cómo funciona la garantía de fábrica?',
                    a: 'Todos los equipos de Fábrica de Arcades cuentan con 1 año de garantía oficial. Cubre cualquier falla en el mother, cableado, micro-switches de palancas/botones y monitor. Además, ofrecemos soporte técnico post-venta permanente.',
                  },
                ].map((item, index) => {
                  const isOpen = openFaq === index
                  return (
                    <div
                      key={index}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        background: isOpen ? 'var(--color-bg-2)' : 'transparent',
                      }}
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: 'var(--space-3) var(--space-4)',
                          fontWeight: 600,
                          fontSize: '0.9375rem',
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <span>{item.q}</span>
                        <span style={{ color: 'var(--color-cyan)', fontSize: '1.2rem', transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
                      </button>
                      {isOpen && (
                        <div
                          style={{
                            padding: '0 var(--space-4) var(--space-4) var(--space-4)',
                            fontSize: '0.875rem',
                            color: 'var(--color-text-secondary)',
                            lineHeight: 1.6,
                          }}
                        >
                          {item.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Purchase panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Title & Price */}
            <div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--color-cyan)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {(product.category as any)?.name ?? product.product_type}
              </div>
              <h1
                style={{
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  fontWeight: 800,
                  marginBottom: 'var(--space-3)',
                }}
              >
                {product.name}
              </h1>
              {product.short_description && (
                <p
                  style={{
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  {product.short_description}
                </p>
              )}

              {/* Stock badge */}
              <span className={clsx('badge', stockConfig.className)} style={{ fontSize: '0.8125rem' }}>
                {stockConfig.icon} {stockConfig.label} — {stockConfig.deliveryText}
              </span>
              {stockSummary.availability === 'printed' && (
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  {getConfigValue('printed_business_hours')} horas hábiles desde la confirmación
                </p>
              )}
              {stockSummary.availability === 'designed' && (
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  {getConfigValue('designed_business_days')} días hábiles (impresión + armado)
                </p>
              )}

              <div className="purchase-mode-grid">
                <button
                  type="button"
                  className={clsx('purchase-mode-card', { active: selectedPresetId !== null })}
                  onClick={() => {
                    if (presets.length > 0) {
                      handleSelectPreset(presets[0])
                    }
                  }}
                  disabled={presets.length === 0}
                  style={{ textAlign: 'left', cursor: presets.length > 0 ? 'pointer' : 'not-allowed', border: '1px solid var(--color-border)' }}
                >
                  <strong>⚡ Comprar listo para entregar</strong>
                  <span>
                    Equipo ya armado en fábrica. La configuración no se modifica.
                  </span>
                  <small>{stockSummary.immediate > 0 ? `${stockSummary.immediate} disponible(s)` : 'Sin equipos listos ahora'}</small>
                </button>
                <button
                  type="button"
                  className={clsx('purchase-mode-card', { active: selectedPresetId === null })}
                  onClick={() => handleSelectCustom()}
                  style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--color-border)' }}
                >
                  <strong>🎨 Comprar a medida</strong>
                  <span>
                    Elegís vinilo, palancas, botones y adicionales antes de iniciar el pedido.
                  </span>
                  <small>
                    {vinylSource === 'stock' && selectedVinyl?.quantity ? '24/48 hs con vinilo impreso' : `${designedDaysLabel} con impresión`}
                  </small>
                </button>
              </div>
            </div>

            {/* Price */}
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 'var(--space-3)',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                  }}
                >
                  {formatPrice(unitPrice * quantity)}
                </span>
                {quantity > 1 && (
                  <span
                    style={{
                      fontSize: '0.9375rem',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    ({formatPrice(unitPrice)} c/u)
                  </span>
                )}
              </div>
              {role === 'distribuidor' && (
                <span
                  className="badge badge-distributor"
                  style={{ marginTop: 'var(--space-2)', fontSize: '0.75rem' }}
                >
                  💼 Precio distribuidor
                </span>
              )}
            </div>

            {/* CUSTOMIZER */}
            {product.requires_production && (() => {
              const isLocked = selectedPresetId !== null
              return (
                <div className="customizer">
                  <h3
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      marginBottom: 'var(--space-1)',
                      color: 'var(--color-text)',
                    }}
                  >
                    🎨 Personalizá tu arcade
                  </h3>

                  {/* Preset Selector / Modalidad de compra */}
                  {presets.length > 0 && (
                    <div className="customizer-section" style={{ background: 'var(--color-surface-2)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
                      <span className="customizer-section-title" style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ⚡ Modalidad de Compra
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                        <button
                          onClick={() => setSelectedPresetId(null)}
                          className={clsx('category-tab', {
                            active: selectedPresetId === null,
                          })}
                          style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', width: '100%', padding: 'var(--space-2) var(--space-3)', border: selectedPresetId === null ? '1px solid var(--color-cyan)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: selectedPresetId === null ? 'var(--color-cyan-dim)' : 'var(--color-surface)' }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            🎨 Armar mi consola a medida
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            24/48hs con vinilo en stock · 7 días a medida
                          </span>
                        </button>

                        {presets.map((preset: any) => {
                          const isSelected = selectedPresetId === (preset.stock_id || preset.id)
                          const vinyl = supplies.find((s) => s.id === preset.vinyl_supply_id)
                          return (
                            <button
                              key={preset.stock_id || preset.id}
                              onClick={() => handleSelectPreset(preset)}
                              className={clsx('category-tab', {
                                active: isSelected,
                              })}
                              style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4, width: '100%', border: isSelected ? '1px solid var(--color-cyan)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', background: isSelected ? 'var(--color-cyan-dim)' : 'var(--color-surface)' }}
                            >
                              <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.875rem' }}>
                                <span>📦 {preset.name}</span>
                                <span style={{ color: 'var(--color-cyan)', fontSize: '0.75rem', fontWeight: 700 }}>⚡ Stock Inmediato</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <span>Vinilo: {vinyl?.name || preset.vinyl_name || 'Fijo'}</span>
                                <span>Palanca: {preset.joystick_color || 'Estándar'}</span>
                                <span>Botones: {preset.button_color || 'Estándar'}</span>
                                <span>Tipo: {preset.joystick_type === 'led' || preset.button_type === 'led' ? 'LED' : 'Estándar'}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Delivery Estimate Banner */}
                  <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderLeft: '3px solid var(--color-cyan)', borderRadius: '0 var(--radius-md) var(--radius-md) 0', marginBottom: 'var(--space-4)' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-cyan)' }}>
                      {deliveryEstimate.badge}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {deliveryEstimate.subtitle}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {isLocked && (
                      <div
                        style={{
                          background: 'var(--color-cyan-dim)',
                          border: '1px solid var(--color-cyan)',
                          padding: 'var(--space-3) var(--space-4)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 'var(--space-3)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ fontSize: '1.25rem' }}>⚡</span>
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>
                              Composición exacta del equipo armado en stock
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              El vinilo y los colores de palancas y botones corresponden a la unidad física disponible. Para elegir tus propios colores, hacé clic en &quot;Comprar a medida&quot;.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectCustom()}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                        >
                          🎨 Cambiar a pedido a medida
                        </button>
                      </div>
                    )}

                    {/* 1. SECCIÓN TEMÁTICA / VINILO */}
                    <div className="customizer-section">
                      <span className="customizer-section-title">
                        1. Temática y Vinilo Ploteado {isLocked && <small style={{ fontWeight: 600, color: 'var(--color-cyan)', marginLeft: 6 }}>🔒 (Fijo en stock)</small>}
                      </span>
                      
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            setVinylSource('stock')
                            setCustomization((prev) => ({ ...prev, vinyl_source: 'stock' }))
                          }}
                          className={clsx('category-tab', { active: vinylSource === 'stock' })}
                          style={{ fontSize: '0.8125rem', cursor: isLocked ? 'default' : 'pointer' }}
                        >
                          🎨 Vinilos en Stock Fábrica (24/48 hs)
                        </button>
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            setVinylSource('print')
                            setCustomization((prev) => ({ ...prev, vinyl_source: 'print' }))
                          }}
                          className={clsx('category-tab', { active: vinylSource === 'print' || vinylSource === 'custom' })}
                          style={{ fontSize: '0.8125rem', cursor: isLocked ? 'default' : 'pointer' }}
                        >
                          ✨ Diseño a Pedido / Personalizado (7 días)
                        </button>
                      </div>

                      {vinylSource === 'stock' ? (
                        <div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                            Elegí un diseño ya impreso disponible para retiro rápido:
                          </div>
                          <div className="vinyl-picker">
                            {vinylsInStock.length > 0 ? (
                              <>
                                <label className="vinyl-picker-select">
                                  <span>Vinilo</span>
                                  <select
                                    value={customization.vinyl_supply_id || ''}
                                    disabled={isLocked}
                                    onChange={(event) => {
                                      const vinyl = vinylsInStock.find((v) => v.id === event.target.value)
                                      setCustomization((prev) => ({
                                        ...prev,
                                        vinyl_supply_id: vinyl?.id,
                                        vinyl_name: vinyl?.name,
                                        vinyl_source: 'stock',
                                      }))
                                    }}
                                  >
                                    <option value="">Seleccioná un vinilo en stock</option>
                                    {vinylsInStock.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.name} · {v.quantity} en stock
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <div className="vinyl-picker-preview">
                                  {selectedVinyl?.image_url ? (
                                    <img src={selectedVinyl.image_url} alt={selectedVinyl.name} />
                                  ) : (
                                    <div className="vinyl-picker-empty">Elegí un vinilo para verlo en grande</div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                                No hay vinilos con stock impreso actualmente. Podés seleccionar la opción de <strong>Diseño a Pedido (7 días)</strong>.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                            Elegí un diseño de nuestro catálogo para imprimir o pedí uno 100% personalizado. Hay <strong>{allCompatibleVinyls.length}</strong> diseños compatibles para este producto.
                          </div>

                          <div className="vinyl-picker">
                            <label className="vinyl-picker-select">
                              <span>Vinilo</span>
                              <select
                                value={customization.vinyl_source === 'custom' ? '__custom__' : customization.vinyl_supply_id || ''}
                                disabled={isLocked}
                                onChange={(event) => {
                                  if (event.target.value === '__custom__') {
                                    setCustomization((prev) => ({
                                      ...prev,
                                      vinyl_supply_id: undefined,
                                      vinyl_name: 'Personalizado a Medida',
                                      vinyl_source: 'custom',
                                    }))
                                    return
                                  }

                                  const vinyl = allCompatibleVinyls.find((v) => v.id === event.target.value)
                                  setCustomization((prev) => ({
                                    ...prev,
                                    vinyl_supply_id: vinyl?.id,
                                    vinyl_name: vinyl?.name,
                                    vinyl_source: 'print',
                                  }))
                                }}
                              >
                                <option value="">Seleccioná un diseño para imprimir</option>
                                {allCompatibleVinyls.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.name}
                                  </option>
                                ))}
                                <option value="__custom__">100% Personalizado</option>
                              </select>
                            </label>
                            <div className="vinyl-picker-preview">
                              {customization.vinyl_source === 'custom' ? (
                                <div className="vinyl-picker-empty">
                                  100% personalizado: te pedimos la imagen luego de iniciar el pedido.
                                </div>
                              ) : selectedVinyl?.image_url ? (
                                <img src={selectedVinyl.image_url} alt={selectedVinyl.name} />
                              ) : (
                                <div className="vinyl-picker-empty">Elegí un vinilo para verlo en grande</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. SECCIÓN CONTROLES POR JUGADOR */}
                    <div className="customizer-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <span className="customizer-section-title" style={{ margin: 0 }}>
                          2. Controles por jugador {isLocked && <small style={{ fontWeight: 600, color: 'var(--color-cyan)', marginLeft: 6 }}>🔒 (Fijo en stock)</small>}
                        </span>
                        {productSpecs.led_enabled && (
                          <div className="controls-type-grid">
                            <div>
                              <small>Palancas</small>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => {
                                    setJoystickType('standard')
                                    setCustomization((prev) => ({ ...prev, joystick_type: 'standard' }))
                                  }}
                                  className={clsx('category-tab', { active: joystickType === 'standard' })}
                                  style={{ cursor: isLocked ? 'default' : 'pointer' }}
                                >
                                  Std
                                </button>
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => {
                                    setJoystickType('led')
                                    setCustomization((prev) => ({ ...prev, joystick_type: 'led' }))
                                  }}
                                  className={clsx('category-tab', { active: joystickType === 'led' })}
                                  style={{ cursor: isLocked ? 'default' : 'pointer' }}
                                >
                                  LED
                                </button>
                              </div>
                            </div>
                            <div>
                              <small>Botones</small>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => {
                                    setButtonType('standard')
                                    setCustomization((prev) => ({ ...prev, button_type: 'standard' }))
                                  }}
                                  className={clsx('category-tab', { active: buttonType === 'standard' })}
                                  style={{ cursor: isLocked ? 'default' : 'pointer' }}
                                >
                                  Std
                                </button>
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => {
                                    setButtonType('led')
                                    setCustomization((prev) => ({ ...prev, button_type: 'led' }))
                                  }}
                                  className={clsx('category-tab', { active: buttonType === 'led' })}
                                  style={{ cursor: isLocked ? 'default' : 'pointer' }}
                                >
                                  LED
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="control-layout-preview" aria-label="Vista previa de colores de controles">
                        {Array.from({ length: numPlayers }).map((_, playerIndex) => {
                          const player = getPlayer(playerIndex)
                          const joystickSupply = getSupplyById(player.joystick_supply_id)
                          const buttonSupply = getSupplyById(player.button_supply_id || player.button_supply_ids?.[0])
                          const layout = getButtonLayoutRows(productSpecs.buttons_per_player || 6)
                          const buttonStyle = { '--control-color': buttonSupply?.color || '#8b8b8b' } as CSSProperties
                          return (
                            <div key={playerIndex} className="control-player-preview">
                              <span>Player {playerIndex + 1}</span>
                              <div className="control-panel-visual">
                                <div
                                  className="control-joystick-visual"
                                  style={{ '--control-color': joystickSupply?.color || '#8b8b8b' } as CSSProperties}
                                  title={`Palanca ${player.joystick_color || 'sin seleccionar'}`}
                                />
                                <div className="control-buttons-visual">
                                  {layout.top > 0 && (
                                    <div className="control-button-row top">
                                      {Array.from({ length: layout.top }).map((__, buttonIndex) => (
                                        <i
                                          key={`top-${buttonIndex}`}
                                          style={buttonStyle}
                                          title={`Botón ${buttonIndex + 1} ${player.button_color || 'sin seleccionar'}`}
                                        />
                                      ))}
                                    </div>
                                  )}
                                  {layout.bottomRows.map((bottomRow, rowIndex) => {
                                    const priorBottomButtons = layout.bottomRows
                                      .slice(0, rowIndex)
                                      .reduce((sum, row) => sum + row, 0)
                                    return (
                                      <div key={`bottom-row-${rowIndex}`} className="control-button-row bottom">
                                        {Array.from({ length: bottomRow }).map((__, buttonIndex) => (
                                          <i
                                            key={`bottom-${rowIndex}-${buttonIndex}`}
                                            style={buttonStyle}
                                            title={`Botón ${layout.top + priorBottomButtons + buttonIndex + 1} ${player.button_color || 'sin seleccionar'}`}
                                          />
                                        ))}
                                      </div>
                                    )
                                  })}
                                  {layout.aux > 0 && (
                                    <div className="control-button-row aux">
                                      {Array.from({ length: layout.aux }).map((__, buttonIndex) => (
                                        <i
                                          key={`aux-${buttonIndex}`}
                                          style={buttonStyle}
                                          title={`Botón auxiliar ${buttonIndex + 1} ${player.button_color || 'sin seleccionar'}`}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {numPlayers > 1 && (
                        <div style={{ marginBottom: 'var(--space-3)' }}>
                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            {Array.from({ length: numPlayers }).map((_, i) => {
                              const pBtnId = customization.players?.[i]?.button_supply_id || customization.players?.[i]?.button_supply_ids?.[0]
                              const pBtn = buttons.find((b) => b.id === pBtnId)
                              const pJoyId = customization.players?.[i]?.joystick_supply_id
                              const pJoy = joysticks.find((j) => j.id === pJoyId)
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setActivePlayer(i)}
                                  className={clsx('category-tab', {
                                    active: activePlayer === i,
                                  })}
                                  style={{ padding: '6px 12px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6 }}
                                  id={`player-tab-${i}`}
                                >
                                  {pJoy?.color && (
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: pJoy.color,
                                      }}
                                    />
                                  )}
                                  {pBtn?.color && (
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: pBtn.color,
                                      }}
                                    />
                                  )}
                                  Jugador {i + 1}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div className="player-control-picker">
                        <div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Palanca {numPlayers > 1 ? `Player ${activePlayer + 1}` : ''}:</span>
                            {(() => {
                              const activeJoystickId = getPlayer(activePlayer).joystick_supply_id
                              const activeJoystick = joysticks.find((j) => j.id === activeJoystickId)
                              return activeJoystick ? (
                                <span style={{ color: 'var(--color-cyan)', fontWeight: 600 }}>
                                  {activeJoystick.color_label || activeJoystick.name}
                                </span>
                              ) : null
                            })()}
                          </div>
                          <div className="swatch-grid">
                            {joysticks.map((j) => {
                              const selected = getPlayer(activePlayer).joystick_supply_id === j.id
                              return (
                                <button
                                  key={j.id}
                                  type="button"
                                  disabled={isLocked}
                                  className={clsx('swatch', { selected })}
                                  style={{ backgroundColor: j.color ?? '#888', cursor: isLocked ? 'default' : 'pointer' }}
                                  onClick={() =>
                                    updatePlayerCustomization(activePlayer, {
                                      joystick_supply_id: j.id,
                                      joystick_color: j.color_label || j.name,
                                    })
                                  }
                                  title={`${j.color_label ?? j.name} (${j.quantity} un en stock)`}
                                  id={`joystick-${j.id}`}
                                />
                              )
                            })}
                            {joysticks.length === 0 && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                No hay palancas de este tipo con stock disponible.
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Botones {numPlayers > 1 ? `Player ${activePlayer + 1}` : ''}:</span>
                          {(() => {
                            const activeBtnId = customization.players?.[activePlayer]?.button_supply_id || customization.players?.[activePlayer]?.button_supply_ids?.[0]
                            const activeBtn = buttons.find((b) => b.id === activeBtnId)
                            return activeBtn ? (
                              <span style={{ color: 'var(--color-cyan)', fontWeight: 600 }}>
                                {activeBtn.color_label || activeBtn.name}
                              </span>
                            ) : null
                          })()}
                          </div>
                          <div className="swatch-grid">
                            {buttons.map((b) => {
                              const selected =
                                customization.players?.[activePlayer]?.button_supply_id === b.id ||
                                (customization.players?.[activePlayer]?.button_supply_ids ?? []).includes(b.id)
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  disabled={isLocked}
                                  className={clsx('swatch', {
                                    selected,
                                  })}
                                  style={{ backgroundColor: b.color ?? '#888', cursor: isLocked ? 'default' : 'pointer' }}
                                  onClick={() => {
                                    updatePlayerCustomization(activePlayer, {
                                      button_supply_id: b.id,
                                      button_supply_ids: [b.id],
                                      button_color: b.color_label || b.name,
                                      button_count: productSpecs.buttons_per_player || 6,
                                    })
                                  }}
                                  title={`${b.color_label ?? b.name} (${b.quantity} un en stock)`}
                                  id={`button-${b.id}`}
                                />
                              )
                            })}
                            {buttons.length === 0 && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                No hay botones de este tipo con stock disponible.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                {/* Accessories */}
                {accessories && accessories.length > 0 && (
                  <div className="customizer-section">
                    <span className="customizer-section-title">Productos adicionales / Opciones</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {accessories.map((acc) => {
                        const price = getEffectivePrice(acc, role)
                        const isChecked = (customization.addons ?? []).some((addon) => addon.id === acc.id)
                        return (
                          <label
                            key={acc.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-3)',
                              padding: 'var(--space-3)',
                              background: 'var(--color-surface-2)',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              border: isChecked ? '1px solid var(--color-cyan)' : '1px solid var(--color-border)',
                              userSelect: 'none',
                            }}
                            id={`addon-label-${acc.id}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = customization.addons ?? []
                                const next = e.target.checked
                                  ? [...current, { id: acc.id, name: acc.name, price }]
                                  : current.filter((addon) => addon.id !== acc.id)
                                setCustomization((prev) => ({ ...prev, addons: next }))
                              }}
                              style={{ width: 18, height: 18 }}
                              id={`addon-checkbox-${acc.id}`}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{acc.name}</div>
                              {acc.short_description && (
                                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                  {acc.short_description}
                                </div>
                              )}
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.9375rem' }}>
                              + {formatPrice(price)}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
                  </div>
                </div>
              )
          })()}

            {/* Quantity & Add to cart */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    width: 40,
                    height: 44,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text)',
                    fontSize: '1.25rem',
                  }}
                >
                  −
                </button>
                <span
                  style={{
                    minWidth: 40,
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                  }}
                >
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={!!selectedPresetId && quantity >= maxReadyQuantity}
                  style={{
                    width: 40,
                    height: 44,
                    border: 'none',
                    background: 'none',
                    cursor: selectedPresetId && quantity >= maxReadyQuantity ? 'not-allowed' : 'pointer',
                    color: selectedPresetId && quantity >= maxReadyQuantity ? 'var(--color-text-muted)' : 'var(--color-text)',
                    fontSize: '1.25rem',
                  }}
                >
                  +
                </button>
              </div>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleAddToCart}
                disabled={!canAddToCart}
                style={{ flex: 1 }}
                id="add-to-cart-detail-btn"
              >
                <ShoppingCart size={20} />
                {stockSummary.availability === 'none' ? 'Consultar' : 'Agregar al carrito'}
              </button>
            </div>
            {!canAddToCart && (
              <div className="stock-validation-panel" role="alert">
                <strong>No se puede agregar todavía</strong>
                <ul>
                  {stockValidationErrors.slice(0, 4).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
                <small>Los vinilos sin stock sí se pueden pedir desde “Diseño a Pedido”; el resto de insumos físicos debe tener disponible.</small>
              </div>
            )}

            {/* Delivery info */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                padding: 'var(--space-4)',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <Check size={14} style={{ color: 'var(--color-green)', flexShrink: 0 }} />
                Envío a todo el país
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <Check size={14} style={{ color: 'var(--color-green)', flexShrink: 0 }} />
                Garantía 1 año de fábrica
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <Check size={14} style={{ color: 'var(--color-green)', flexShrink: 0 }} />
                Efectivo · Transferencia · Tarjeta
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive 2-col on desktop */}
      <style>{`
        @media (min-width: 1024px) {
          .product-detail-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
