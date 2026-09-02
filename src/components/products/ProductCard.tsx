'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCartStore } from '@/lib/stores/cart'
import { useToast } from '@/lib/stores/toast'
import { ConsoleLogoRows } from '@/components/products/ConsoleLogoRows'
import {
  formatPrice,
  getEffectivePrice,
  STOCK_BADGE_CONFIG,
  type Product,
  type StockSummary,
} from '@/lib/types'
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import { clsx } from 'clsx'

interface ProductCardProps {
  product: Product & {
    vinyl_options?: VinylOption[]
    stock_items?: Array<{
      id?: string
      stock_type: string
      quantity: number
      vinyl_supply_id?: string | null
      configuration?: {
        vinyl_supply_id?: string | null
        vinyl_name?: string | null
        name?: string | null
      } | null
    }> | null
  }
  stockSummary?: StockSummary
}

interface VinylOption {
  id: string
  name: string
  image_url: string | null
}

export function ProductCard({ product, stockSummary }: ProductCardProps) {
  const { profile } = useAuth()
  const { addItem } = useCartStore()
  const toast = useToast()

  const role =
    profile?.role === 'distribuidor' && profile.distributor_approved ? 'distribuidor' : 'cliente'
  const price = getEffectivePrice(product, role)
  const isDistributor = role === 'distribuidor'

  const stock = stockSummary ?? product.stock_summary
  const availability = stock?.availability ?? 'none'
  const isImmediate = availability === 'immediate'
  const stockConfig = STOCK_BADGE_CONFIG[availability]

  const vinylOptions = useMemo(() => product.vinyl_options ?? [], [product.vinyl_options])
  const coverImage = product.images?.[0] || ''
  const coverVinyl = useMemo(
    () => vinylOptions.find((vinyl) => vinyl.image_url && vinyl.image_url === coverImage),
    [coverImage, vinylOptions]
  )
  const immediateStockItem = useMemo(
    () =>
      (product.stock_items ?? []).find(
        (item) =>
          item.stock_type === 'immediate' &&
          item.quantity > 0 &&
          (item.vinyl_supply_id || item.configuration?.vinyl_supply_id)
      ) ??
      (product.stock_items ?? []).find((item) => item.stock_type === 'immediate' && item.quantity > 0),
    [product.stock_items]
  )
  const immediateVinylId =
    immediateStockItem?.vinyl_supply_id || immediateStockItem?.configuration?.vinyl_supply_id || ''
  const [selectedVinylId, setSelectedVinylId] = useState(
    immediateVinylId || coverVinyl?.id || vinylOptions[0]?.id || ''
  )
  const effectiveSelectedVinylId = isImmediate
    ? immediateVinylId || selectedVinylId || vinylOptions[0]?.id || ''
    : selectedVinylId || coverVinyl?.id || vinylOptions[0]?.id || ''

  const selectedVinyl = useMemo(
    () => vinylOptions.find((vinyl) => vinyl.id === effectiveSelectedVinylId),
    [effectiveSelectedVinylId, vinylOptions]
  )
  const selectedVinylIndex = Math.max(
    0,
    vinylOptions.findIndex((vinyl) => vinyl.id === effectiveSelectedVinylId)
  )
  const mainImage = selectedVinyl?.image_url || coverImage
  const productHref = `/productos/${product.slug}${
    effectiveSelectedVinylId ? `?vinilo=${encodeURIComponent(effectiveSelectedVinylId)}` : ''
  }`
  const modeInfo = product.requires_production
    ? {
        label: availability === 'immediate' ? 'Entrega inmediata' : 'A pedido',
        detail: availability === 'immediate'
          ? 'Modelo con stock listo para entregar.'
          : 'Lo fabricamos con la configuración que elijas.',
      }
    : {
        label: 'Listo para entregar',
        detail: 'Producto terminado, compra directa.',
      }
  const timeInfo =
    availability === 'immediate'
      ? 'Entrega inmediata'
      : availability === 'printed'
        ? '24/48 hs hábiles'
        : product.requires_production
          ? '7 a 10 días hábiles'
          : 'Consultar disponibilidad'

  function changeVinyl(direction: -1 | 1, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (isImmediate) return
    if (vinylOptions.length < 2) return
    const nextIndex = (selectedVinylIndex + direction + vinylOptions.length) % vinylOptions.length
    setSelectedVinylId(vinylOptions[nextIndex].id)
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (isImmediate || !product.requires_production) {
      addItem({
        product,
        quantity: 1,
        unit_price: price,
        customization: {
          vinyl_supply_id: selectedVinyl?.id || immediateVinylId || undefined,
          vinyl_name:
            selectedVinyl?.name ||
            immediateStockItem?.configuration?.vinyl_name ||
            immediateStockItem?.configuration?.name ||
            undefined,
          vinyl_source: isImmediate ? 'stock' : undefined,
        },
        stock_type: availability,
        stock_item_id: immediateStockItem?.id,
        fulfillment_type: isImmediate ? 'ready_stock' : product.requires_production ? 'custom' : 'ready_stock',
      })
      toast.success('¡Agregado al carrito!', product.name)
    }
  }

  return (
    <article className="product-card" id={`product-card-${product.slug}`}>
      {/* Image */}
      <Link href={productHref} className="product-card-image" aria-label={`Ver ${product.name}`}>
        {mainImage ? (
          <img src={mainImage} alt={product.name} loading="lazy" />
        ) : (
          <div className="product-card-image-placeholder">
            {product.product_type === 'arcade' ? '🕹️' : '🔧'}
          </div>
        )}
        <div className="product-card-stock-badge">
          <span className={clsx('badge', stockConfig.className)}>
            {stockConfig.icon} {stockConfig.label}
          </span>
        </div>
      </Link>
      {!isImmediate && vinylOptions.length > 1 && (
        <div className="product-card-vinyl-arrows" aria-label="Cambiar vinilo visible">
          <button
            type="button"
            onClick={(event) => changeVinyl(-1, event)}
            aria-label="Vinilo anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="product-card-vinyl-counter">
            {selectedVinylIndex + 1}/{vinylOptions.length}
          </span>
          <button
            type="button"
            onClick={(event) => changeVinyl(1, event)}
            aria-label="Vinilo siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Body */}
      <div className="product-card-body">
        <div className="product-card-category">
          {product.category?.name ?? product.product_type}
        </div>
        <h3 className="product-card-name">
          <Link href={productHref}>{product.name}</Link>
        </h3>
        {product.short_description && (
          <p className="product-card-description">{product.short_description}</p>
        )}

        <div className="product-card-mode">
          <div>
            <strong>{modeInfo.label}</strong>
            <span>{modeInfo.detail}</span>
          </div>
          <small>{timeInfo}</small>
        </div>

        {isImmediate && product.product_type === 'arcade' ? (
          <div className="product-card-console-logos">
            <ConsoleLogoRows
              primaryIds={(() => {
                try {
                  const meta = JSON.parse(product.meta_description || '{}')
                  return meta.primary_console_logo_ids || ['arcade', 'cps1', 'cps2', 'cps3', 'neogeo', 'mame', 'sega', 'nintendo']
                } catch {
                  return ['arcade', 'cps1', 'cps2', 'cps3', 'neogeo', 'mame', 'sega', 'nintendo']
                }
              })()}
              secondaryIds={(() => {
                try {
                  const meta = JSON.parse(product.meta_description || '{}')
                  return meta.secondary_console_logo_ids || []
                } catch {
                  return []
                }
              })()}
            />
          </div>
        ) : vinylOptions.length > 0 ? (
          <label className="product-card-vinyl-select">
            <span>Vinilo</span>
            <select
              value={effectiveSelectedVinylId}
              onChange={(event) => setSelectedVinylId(event.target.value)}
            >
              {vinylOptions.map((vinyl) => (
                <option key={vinyl.id} value={vinyl.id}>
                  {vinyl.name.replace(/^.* - /, '')}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="product-card-footer">
          <div>
            <div className="product-price">{formatPrice(price)}</div>
            {isDistributor && (
              <div
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--color-magenta)',
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                Precio distribuidor
              </div>
            )}
          </div>

          {isImmediate ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddToCart}
              id={`add-ready-stock-${product.slug}`}
              aria-label={`Agregar ${product.name} al carrito`}
            >
              <ShoppingCart size={16} /> Agregar
            </button>
          ) : product.requires_production ? (
            <Link href={productHref} className="btn btn-outline btn-sm">
              Personalizar
            </Link>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddToCart}
              id={`add-to-cart-${product.slug}`}
              aria-label={`Agregar ${product.name} al carrito`}
            >
              <ShoppingCart size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
