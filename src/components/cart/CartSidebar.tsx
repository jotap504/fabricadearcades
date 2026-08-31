'use client'

import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCartStore } from '@/lib/stores/cart'
import { formatPrice, STOCK_BADGE_CONFIG } from '@/lib/types'
import Link from 'next/link'
import { clsx } from 'clsx'

export function CartSidebar() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    total,
    clearCart,
  } = useCartStore()

  const totalAmount = total()

  return (
    <>
      {/* Overlay */}
      <div
        className={clsx('drawer-overlay', { open: isOpen })}
        onClick={closeCart}
        style={{ zIndex: 290 }}
      />

      {/* Sidebar */}
      <aside className={clsx('cart-sidebar', { open: isOpen })}>
        <div className="cart-header">
          <h2 className="cart-title">
            🛒 Carrito{' '}
            {items.length > 0 && (
              <span
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                  fontWeight: 400,
                }}
              >
                ({items.length} {items.length === 1 ? 'item' : 'items'})
              </span>
            )}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-red)', fontSize: '0.8125rem' }}
                id="cart-clear-btn"
              >
                <Trash2 size={14} /> Vaciar
              </button>
            )}
            <button
              onClick={closeCart}
              className="btn btn-ghost btn-icon"
              aria-label="Cerrar carrito"
              id="cart-close-btn"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="cart-items">
          {items.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-10) 0',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
              }}
            >
              <ShoppingBag size={48} style={{ opacity: 0.3 }} />
              <div>
                <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  Tu carrito está vacío
                </p>
                <p style={{ fontSize: '0.875rem' }}>
                  Agregá productos desde el catálogo
                </p>
              </div>
              <Link
                href="/productos"
                className="btn btn-primary btn-sm"
                onClick={closeCart}
                id="cart-explore-btn"
              >
                Ver catálogo
              </Link>
            </div>
          ) : (
            items.map((item) => {
              const stockConfig = STOCK_BADGE_CONFIG[item.stock_type]
              const customLines: string[] = []
              if (item.customization.cabinet_type)
                customLines.push(item.customization.cabinet_type)
              if (item.customization.screen_size)
                customLines.push(`Pantalla ${item.customization.screen_size}`)
              if (item.customization.vinyl_name)
                customLines.push(`Vinilo: ${item.customization.vinyl_name}`)
              if (item.customization.control_type === 'led') {
                customLines.push('Controles LED')
              }
              if (item.customization.players && item.customization.players.length > 0) {
                item.customization.players.forEach((p: any, idx: number) => {
                  customLines.push(`J${idx + 1}: ${p.joystick_color ? p.joystick_color + ' ' : ''}(${p.button_count} botones)`)
                })
              }
              if (item.customization.addons && item.customization.addons.length > 0) {
                item.customization.addons.forEach((addon: any) => {
                  customLines.push(`+ ${addon.name}`)
                })
              }

              return (
                <div key={item.id} className="cart-item">
                  {/* Image */}
                  <div className="cart-item-image">
                    {item.product.images?.[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2rem',
                          background: 'var(--color-surface-2)',
                        }}
                      >
                        🕹️
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="cart-item-details">
                    <div className="cart-item-name">{item.product.name}</div>
                    {customLines.length > 0 && (
                      <div className="cart-item-customization">
                        {customLines.join(' · ')}
                      </div>
                    )}
                    <div
                      className={clsx('badge', stockConfig.className)}
                      style={{ marginTop: 4, fontSize: '0.6875rem' }}
                    >
                      {stockConfig.icon} {stockConfig.deliveryText}
                    </div>
                    <div className="cart-item-price">
                      {formatPrice(item.unit_price * item.quantity)}
                    </div>

                    {/* Quantity controls */}
                    <div className="cart-qty-controls">
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label="Reducir cantidad"
                      >
                        −
                      </button>
                      <span className="cart-qty-value">{item.quantity}</span>
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Aumentar cantidad"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        style={{
                          marginLeft: 'auto',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-text-muted)',
                          padding: 4,
                          display: 'flex',
                          transition: 'color var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLButtonElement).style.color =
                            'var(--color-red)'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLButtonElement).style.color =
                            'var(--color-text-muted)'
                        }}
                        aria-label="Eliminar item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total-row">
              <span className="cart-total-label">Total</span>
              <span className="cart-total-value">{formatPrice(totalAmount)}</span>
            </div>
            <Link
              href="/checkout"
              className="btn btn-primary"
              onClick={closeCart}
              style={{ width: '100%', justifyContent: 'center', gap: 'var(--space-2)' }}
              id="cart-checkout-btn"
            >
              Ir al checkout <ArrowRight size={18} />
            </Link>
            <Link
              href="/productos"
              className="btn btn-ghost btn-sm"
              onClick={closeCart}
              style={{ textAlign: 'center', justifyContent: 'center' }}
            >
              Seguir comprando
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
