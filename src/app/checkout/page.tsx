'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCartStore } from '@/lib/stores/cart'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/lib/stores/toast'
import { createClient } from '@/lib/supabase/client'
import { createStoreOrder, createMercadoPagoCheckout, type CreatedOrderResult } from './actions'
import {
  formatPrice,
  STOCK_BADGE_CONFIG,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type ShippingAddress,
} from '@/lib/types'
import { ArrowLeft, CreditCard, Banknote, Building2, Check, MapPin, Truck, Wallet } from 'lucide-react'
import Link from 'next/link'

type Step = 'cart-review' | 'shipping' | 'payment' | 'confirm'
type DeliveryMethod = 'pickup' | 'shipping'

export default function CheckoutPage() {
  const { user, profile } = useAuth()
  const { items, total, clearCart } = useCartStore()
  const toast = useToast()

  const [step, setStep] = useState<Step>('cart-review')
  const [loading, setLoading] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<CreatedOrderResult | null>(null)

  const [shipping, setShipping] = useState<ShippingAddress>({
    delivery_method: 'pickup',
    shipping_mode: null,
    shipping_payment: null,
    street: '',
    city: '',
    province: '',
    zip: '',
    notes: '',
  })
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer')
  const [paymentRules, setPaymentRules] = useState({
    transfer_discount_pct: 5,
    cash_discount_pct: 0,
    card_surcharge_pct: 7,
    mercadopago_surcharge_pct: 0,
  })
  const [customerPhone, setCustomerPhone] = useState(profile?.phone ?? '')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [notes, setNotes] = useState('')

  const totalAmount = total()

  useEffect(() => {
    let ignore = false

    async function loadPaymentRules() {
      const supabase = createClient()
      const { data } = await supabase
        .from('delivery_config')
        .select('key, value')
        .in('key', ['transfer_discount_pct', 'cash_discount_pct', 'card_surcharge_pct', 'mercadopago_surcharge_pct'])

      if (ignore || !data) return

      setPaymentRules((current) => ({
        ...current,
        ...Object.fromEntries(
          data.map((item) => [item.key, Number.parseFloat(item.value) || 0])
        ),
      }))
    }

    loadPaymentRules()
    return () => {
      ignore = true
    }
  }, [])

  const { discountPct, surchargePct, discountAmount, surchargeAmount, finalTotal } = useMemo(() => {
    const nextDiscountPct =
      paymentMethod === 'transfer'
        ? paymentRules.transfer_discount_pct
        : paymentMethod === 'cash'
          ? paymentRules.cash_discount_pct
          : 0
    const nextSurchargePct =
      paymentMethod === 'card'
        ? paymentRules.card_surcharge_pct
        : paymentMethod === 'mercadopago'
          ? paymentRules.mercadopago_surcharge_pct
          : 0
    const nextDiscountAmount = totalAmount * (nextDiscountPct / 100)
    const nextSurchargeAmount = totalAmount * (nextSurchargePct / 100)

    return {
      discountPct: nextDiscountPct,
      surchargePct: nextSurchargePct,
      discountAmount: nextDiscountAmount,
      surchargeAmount: nextSurchargeAmount,
      finalTotal: totalAmount - nextDiscountAmount + nextSurchargeAmount,
    }
  }, [paymentMethod, paymentRules, totalAmount])

  const getItemMode = (item: typeof items[number]) => {
    if (item.fulfillment_type === 'ready_stock') {
      return {
        label: 'Listo para entregar',
        detail: 'Equipo terminado en fábrica. No requiere producción.',
        className: 'badge-immediate',
      }
    }

    if (item.customization.vinyl_source === 'print') {
      return {
        label: 'A medida + impresión de vinilo',
        detail: 'Se genera pedido interno de impresión y luego armado.',
        className: 'badge-designed',
      }
    }

    if (item.customization.vinyl_source === 'custom') {
      return {
        label: 'A medida + diseño personalizado',
        detail: 'Coordinamos la imagen y se genera pedido de impresión.',
        className: 'badge-designed',
      }
    }

    return {
      label: 'A medida',
      detail: 'Se reservan insumos y pasa a producción al confirmar.',
      className: 'badge-printed',
    }
  }

  async function submitOrder() {
    const finalName = user && profile ? (profile.full_name ?? user.email!) : guestName
    const finalEmail = user ? user.email! : guestEmail

    if (!finalName || !finalEmail) {
      toast.error('Datos incompletos', 'Por favor completá tu nombre y email')
      return
    }

    setLoading(true)

    try {
      const shippingForOrder: ShippingAddress =
        deliveryMethod === 'pickup'
          ? {
              delivery_method: 'pickup',
              shipping_mode: null,
              shipping_payment: null,
              street: 'Retira el cliente en fábrica/showroom',
              city: 'CABA',
              province: 'CABA',
              zip: '',
              notes: shipping.notes ? `Retiro en fábrica. ${shipping.notes}` : 'Retiro en fábrica.',
            }
          : {
              ...shipping,
              delivery_method: 'shipping',
              shipping_mode: 'coordinar',
              shipping_payment: 'destination',
              notes: [
                'Envío pago en destino.',
                'Dentro de 50 km de la fábrica: moto/flete.',
                'Interior del país: transporte o correo.',
                shipping.notes,
              ].filter(Boolean).join(' '),
            }

      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant?.id ?? null,
        stock_item_id: item.stock_item_id ?? null,
        quantity: item.quantity,
        customization: item.customization,
      }))

      const result = await createStoreOrder({
        customer: { name: finalName, email: finalEmail, phone: customerPhone },
        shipping: shippingForOrder,
        paymentMethod,
        notes,
        items: orderItems,
      })

      if (paymentMethod === 'mercadopago') {
        const { checkoutUrl } = await createMercadoPagoCheckout({
          orderId: result.orderId,
          payerEmail: finalEmail,
          items: items.map((item) => ({
            title: item.product.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        })
        clearCart()
        window.location.href = checkoutUrl
        return
      }

      setCreatedOrder(result)
      setStep('confirm')
      clearCart()
    } catch (err) {
      console.error(err)
      toast.error('Error al procesar el pedido', 'Intentá nuevamente o contactanos')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0 && step !== 'confirm') {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-4)',
          textAlign: 'center',
          padding: 'var(--space-8)',
        }}
      >
        <div style={{ fontSize: '4rem' }}>🛒</div>
        <h2>Tu carrito está vacío</h2>
        <Link href="/productos" className="btn btn-primary" id="checkout-empty-catalog-btn">
          Ir al catálogo
        </Link>
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-5)',
          textAlign: 'center',
          padding: 'var(--space-8)',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--color-green-dim)',
            border: '2px solid var(--color-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(16,185,129,0.3)',
          }}
        >
          <Check size={36} style={{ color: 'var(--color-green)' }} />
        </div>
        <div>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>
            {paymentMethod === 'current_account' ? '¡Pedido en producción!' : '¡Pedido recibido!'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.0625rem' }}>
            Te enviaremos la información de pago y seguimiento por email.
          </p>
        </div>
        {createdOrder?.orderNumber && (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Número de pedido: <strong>{createdOrder.orderNumber}</strong>
          </p>
        )}
        {createdOrder?.reservationExpiresAt && (
          <p style={{ color: 'var(--color-amber)', maxWidth: 520 }}>
            El stock quedó reservado hasta el{' '}
            {new Date(createdOrder.reservationExpiresAt).toLocaleString('es-AR')}.
          </p>
        )}
        <div
          className="glass"
          style={{
            padding: 'var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary)',
            maxWidth: 400,
          }}
        >
          <strong style={{ color: 'var(--color-cyan)' }}>
            Método de pago: {PAYMENT_METHOD_LABELS[paymentMethod]}
          </strong>
          {paymentMethod === 'transfer' && (
            <p style={{ marginTop: 8 }}>
              Te enviamos los datos bancarios por email. Una vez confirmado el
              pago comenzamos a preparar tu pedido.
            </p>
          )}
          {paymentMethod === 'cash' && (
            <p style={{ marginTop: 8 }}>
              Coordinaremos la entrega y el pago en efectivo por email.
            </p>
          )}
          {paymentMethod === 'current_account' && (
            <p style={{ marginTop: 8 }}>
              El pedido fue cargado a tu cuenta corriente y pasó directamente a producción.
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/mi-cuenta/pedidos" className="btn btn-primary" id="checkout-success-orders-btn">
            Ver mis pedidos
          </Link>
          <Link href="/productos" className="btn btn-ghost" id="checkout-success-catalog-btn">
            Seguir comprando
          </Link>
        </div>
      </div>
    )
  }

  const steps = [
    { id: 'cart-review', label: 'Revisión' },
    { id: 'shipping', label: 'Envío' },
    { id: 'payment', label: 'Pago' },
  ]

  return (
    <div style={{ paddingBottom: 'var(--space-16)' }}>
      {/* Step indicator */}
      <div
        style={{
          background: 'var(--color-bg-2)',
          borderBottom: '1px solid var(--color-border)',
          padding: 'var(--space-4) 0',
        }}
      >
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Link href="/productos" className="btn btn-ghost btn-icon btn-sm" style={{ marginRight: 'var(--space-2)' }}>
              <ArrowLeft size={18} />
            </Link>
            {steps.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    fontWeight: step === s.id ? 700 : 400,
                    color:
                      step === s.id
                        ? 'var(--color-cyan)'
                        : steps.findIndex((candidate) => candidate.id === step) > i
                          ? 'var(--color-green)'
                          : 'var(--color-text-muted)',
                    fontSize: '0.9375rem',
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background:
                        step === s.id ? 'var(--color-cyan)' : 'var(--color-surface)',
                      border: `1px solid ${step === s.id ? 'var(--color-cyan)' : 'var(--color-border)'
                        }`,
                      color: step === s.id ? 'var(--color-bg)' : 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span className="hide-mobile">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    style={{
                      width: 32,
                      height: 1,
                      background: 'var(--color-border)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: 'var(--space-8)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--space-8)',
          }}
        >
          {/* Main content */}
          <div>
            {/* STEP 1: Cart review */}
            {step === 'cart-review' && (
              <div>
                <h2 style={{ marginBottom: 'var(--space-5)' }}>Revisión del carrito</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {items.map((item) => (
                    <div key={item.id} className="card card-body checkout-item-card">
                      <div className="checkout-item-icon">🕹️</div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontWeight: 700, marginBottom: 2 }}>
                          {item.product.name}
                        </div>
                        {(() => {
                          const mode = getItemMode(item)
                          return (
                            <div className="checkout-item-mode">
                              <span className={`badge ${mode.className}`}>{mode.label}</span>
                              <small>{mode.detail}</small>
                            </div>
                          )
                        })()}
                        {item.customization.players && item.customization.players.length > 0 ? (
                          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div>
                              {item.customization.cabinet_type}
                              {item.customization.screen_size && ` · ${item.customization.screen_size}`}
                              {item.customization.vinyl_name && ` · ${item.customization.vinyl_name}`}
                              {item.customization.control_type === 'led' && ` · Controles LED`}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', fontSize: '0.8125rem', marginTop: 2 }}>
                              {item.customization.players.map((p, idx) => (
                                <span key={idx} style={{ background: 'var(--color-surface-2)', padding: '2px 6px', borderRadius: 4 }}>
                                  J{idx + 1}: Palanca {p.joystick_color ? <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: p.joystick_color, marginRight: 2 }} /> : ''}{p.button_count}P
                                </span>
                              ))}
                            </div>
                            {item.customization.addons && item.customization.addons.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2, fontSize: '0.8125rem' }}>
                                {item.customization.addons.map((addon) => (
                                  <span key={addon.id} style={{ border: '1px dashed var(--color-cyan)', color: 'var(--color-cyan)', padding: '1px 6px', borderRadius: 4 }}>
                                    + {addon.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          item.customization.cabinet_type && (
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                              {item.customization.cabinet_type}
                              {item.customization.screen_size && ` · ${item.customization.screen_size}`}
                              {item.customization.vinyl_name && ` · ${item.customization.vinyl_name}`}
                              {item.customization.control_type === 'led' && ` · Controles LED`}
                            </div>
                          )
                        )}
                        <span
                          className={`badge ${STOCK_BADGE_CONFIG[item.stock_type].className}`}
                          style={{ marginTop: 4, fontSize: '0.6875rem' }}
                        >
                          {STOCK_BADGE_CONFIG[item.stock_type].deliveryText}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-cyan)' }}>
                          {formatPrice(item.unit_price * item.quantity)}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                          {item.quantity}x {formatPrice(item.unit_price)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => setStep('shipping')}
                    id="checkout-next-shipping-btn"
                  >
                    Continuar →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Shipping */}
            {step === 'shipping' && (
              <div>
                <h2 style={{ marginBottom: 'var(--space-5)' }}>Forma de entrega</h2>
                 <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 'var(--space-4)',
                  }}
                >
                  {!user && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="guest-name">Nombre completo *</label>
                        <input
                          id="guest-name"
                          className="form-input"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Juan Pérez"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="guest-email">Email *</label>
                        <input
                          id="guest-email"
                          type="email"
                          className="form-input"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="juan@ejemplo.com"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="delivery-method-grid">
                    {[
                      {
                        id: 'pickup' as DeliveryMethod,
                        icon: <MapPin size={22} />,
                        title: 'Retira el cliente',
                        desc: 'Coordinamos día y horario para retirar en fábrica/showroom.',
                      },
                      {
                        id: 'shipping' as DeliveryMethod,
                        icon: <Truck size={22} />,
                        title: 'Se envía',
                        desc: 'El envío se coordina según distancia y siempre se abona en destino.',
                      },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`delivery-method-card ${deliveryMethod === option.id ? 'selected' : ''}`}
                        onClick={() => {
                          setDeliveryMethod(option.id)
                          setShipping((prev) => ({
                            ...prev,
                            delivery_method: option.id,
                            shipping_mode: option.id === 'shipping' ? 'coordinar' : null,
                            shipping_payment: option.id === 'shipping' ? 'destination' : null,
                          }))
                        }}
                        aria-pressed={deliveryMethod === option.id}
                      >
                        <span>{option.icon}</span>
                        <strong>{option.title}</strong>
                        <small>{option.desc}</small>
                      </button>
                    ))}
                  </div>

                  {deliveryMethod === 'pickup' && (
                    <div className="checkout-delivery-note">
                      <strong>Retiro en fábrica</strong>
                      <span>No se cobra envío. Luego de confirmar el pedido coordinamos día y horario de retiro.</span>
                    </div>
                  )}

                  {deliveryMethod === 'shipping' && (
                    <>
                      <div className="checkout-delivery-note">
                        <strong>Envío pago en destino</strong>
                        <span>
                          Si estás a menos de 50 km de la fábrica lo coordinamos por moto/flete. Para interior del país, por transporte o correo.
                        </span>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="shipping-street">
                          Calle y número *
                        </label>
                        <input
                          id="shipping-street"
                          className="form-input"
                          value={shipping.street}
                          onChange={(e) =>
                            setShipping((prev) => ({ ...prev, street: e.target.value }))
                          }
                          placeholder="Av. Corrientes 1234"
                          required={deliveryMethod === 'shipping'}
                        />
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 'var(--space-4)',
                        }}
                      >
                        <div className="form-group">
                          <label className="form-label" htmlFor="shipping-city">
                            Ciudad *
                          </label>
                          <input
                            id="shipping-city"
                            className="form-input"
                            value={shipping.city}
                            onChange={(e) =>
                              setShipping((prev) => ({ ...prev, city: e.target.value }))
                            }
                            placeholder="Buenos Aires"
                            required={deliveryMethod === 'shipping'}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="shipping-province">
                            Provincia *
                          </label>
                          <select
                            id="shipping-province"
                            className="form-input form-select"
                            value={shipping.province}
                            onChange={(e) =>
                              setShipping((prev) => ({ ...prev, province: e.target.value }))
                            }
                            required={deliveryMethod === 'shipping'}
                          >
                            <option value="">Seleccionar</option>
                            {[
                              'Buenos Aires',
                              'CABA',
                              'Córdoba',
                              'Santa Fe',
                              'Mendoza',
                              'Tucumán',
                              'Entre Ríos',
                              'Salta',
                              'Misiones',
                              'Chaco',
                              'Corrientes',
                              'Santiago del Estero',
                              'San Juan',
                              'Jujuy',
                              'Río Negro',
                              'Neuquén',
                              'Formosa',
                              'Chubut',
                              'San Luis',
                              'Catamarca',
                              'La Rioja',
                              'La Pampa',
                              'Santa Cruz',
                              'Tierra del Fuego',
                            ].map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label className="form-label" htmlFor="shipping-phone">
                      Teléfono de contacto
                    </label>
                    <input
                      id="shipping-phone"
                      className="form-input"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+54 11 0000-0000"
                      type="tel"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="shipping-notes">
                      Notas de entrega (opcional)
                    </label>
                    <textarea
                      id="shipping-notes"
                      className="form-input form-textarea"
                      value={shipping.notes}
                      onChange={(e) =>
                        setShipping((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      placeholder={deliveryMethod === 'pickup' ? 'Horario preferido para retirar...' : 'Horario preferido, referencias, instrucciones especiales...'}
                    />
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 'var(--space-6)',
                    display: 'flex',
                    gap: 'var(--space-3)',
                    justifyContent: 'space-between',
                  }}
                >
                  <button className="btn btn-ghost" onClick={() => setStep('cart-review')}>
                    ← Volver
                  </button>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => setStep('payment')}
                    disabled={
                      (deliveryMethod === 'shipping' && (!shipping.street || !shipping.city || !shipping.province)) ||
                      (!user && (!guestName || !guestEmail))
                    }
                    id="checkout-next-payment-btn"
                  >
                    Continuar →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Payment */}
            {step === 'payment' && (
              <div>
                <h2 style={{ marginBottom: 'var(--space-5)' }}>Método de pago</h2>
                <div className="checkout-payment-note">
                  <strong>Elegí cómo querés abonar</strong>
                  <span>
                    El total se actualiza automáticamente: transferencia/efectivo pueden aplicar descuento, y tarjeta suma el gasto del operador si está configurado.
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {[
                    {
                      id: 'transfer' as PaymentMethod,
                      icon: <Building2 size={22} />,
                      label: 'Transferencia bancaria',
                      desc: paymentRules.transfer_discount_pct > 0 ? 'Descuento por pago anticipado' : 'Pago anticipado por transferencia',
                      adjustment: paymentRules.transfer_discount_pct > 0 ? `-${paymentRules.transfer_discount_pct}%` : null,
                    },
                    {
                      id: 'cash' as PaymentMethod,
                      icon: <Banknote size={22} />,
                      label: 'Efectivo',
                      desc: 'Pagás al momento de la entrega',
                      adjustment: paymentRules.cash_discount_pct > 0 ? `-${paymentRules.cash_discount_pct}%` : null,
                    },
                    ...(profile?.role === 'distribuidor' &&
                    profile.distributor_approved &&
                    profile.current_account_enabled
                      ? [{
                          id: 'current_account' as PaymentMethod,
                          icon: <Building2 size={22} />,
                          label: 'Cuenta corriente',
                          desc: 'Confirmación inmediata y pase directo a producción',
                          adjustment: null,
                        }]
                      : []),
                    {
                      id: 'card' as PaymentMethod,
                      icon: <CreditCard size={22} />,
                      label: 'Tarjeta de crédito',
                      desc: paymentRules.card_surcharge_pct > 0 ? 'Incluye gastos del operador' : 'Pago con tarjeta de crédito',
                      adjustment: paymentRules.card_surcharge_pct > 0 ? `+${paymentRules.card_surcharge_pct}%` : null,
                    },
                    {
                      id: 'mercadopago' as PaymentMethod,
                      icon: <Wallet size={22} />,
                      label: 'MercadoPago',
                      desc: 'Tarjeta, dinero en cuenta o efectivo a través de MercadoPago',
                      adjustment: paymentRules.mercadopago_surcharge_pct > 0 ? `+${paymentRules.mercadopago_surcharge_pct}%` : null,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setPaymentMethod(opt.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                        padding: 'var(--space-4)',
                        background:
                          paymentMethod === opt.id
                            ? 'var(--color-cyan-dim)'
                            : 'var(--color-surface)',
                        border: `2px solid ${paymentMethod === opt.id
                            ? 'var(--color-cyan)'
                            : 'var(--color-border)'
                          }`,
                        borderRadius: 'var(--radius-lg)',
                        cursor: 'pointer',
                        opacity: 1,
                        textAlign: 'left',
                        transition: 'all var(--transition-fast)',
                        width: '100%',
                      }}
                      id={`payment-method-${opt.id}`}
                    >
                      <div
                        style={{
                          color:
                            paymentMethod === opt.id
                              ? 'var(--color-cyan)'
                              : 'var(--color-text-secondary)',
                        }}
                      >
                        {opt.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, marginBottom: 2 }}>{opt.label}</div>
                        <div
                          style={{
                            fontSize: '0.875rem',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {opt.desc}
                        </div>
                      </div>
                      {opt.adjustment && (
                        <span className={opt.adjustment.startsWith('+') ? 'badge badge-printed' : 'badge badge-immediate'} style={{ fontSize: '0.8125rem' }}>
                          {opt.adjustment}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="form-group" style={{ marginTop: 'var(--space-5)' }}>
                  <label className="form-label" htmlFor="order-notes">
                    Notas adicionales (opcional)
                  </label>
                  <textarea
                    id="order-notes"
                    className="form-input form-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="¿Alguna información adicional para el pedido?"
                  />
                </div>

                {/* Order summary */}
                <div
                  className="card card-body"
                  style={{
                    marginTop: 'var(--space-5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div className="cart-total-row">
                    <span className="cart-total-label">Subtotal</span>
                    <span style={{ fontWeight: 600 }}>{formatPrice(totalAmount)}</span>
                  </div>
                  <div className="checkout-summary-hint">
                    {discountAmount > 0 && `Estás ahorrando ${formatPrice(discountAmount)} con ${PAYMENT_METHOD_LABELS[paymentMethod]}.`}
                    {surchargeAmount > 0 && `Tarjeta suma ${formatPrice(surchargeAmount)} por gastos del operador.`}
                    {discountAmount === 0 && surchargeAmount === 0 && 'Sin descuentos ni recargos para este método.'}
                  </div>
                  {discountAmount > 0 && (
                    <div className="cart-total-row">
                      <span className="cart-total-label" style={{ color: 'var(--color-green)' }}>
                        Descuento ({discountPct}%)
                      </span>
                      <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>
                        −{formatPrice(discountAmount)}
                      </span>
                    </div>
                  )}
                  {surchargeAmount > 0 && (
                    <div className="cart-total-row">
                      <span className="cart-total-label" style={{ color: 'var(--color-amber)' }}>
                        Recargo tarjeta ({surchargePct}%)
                      </span>
                      <span style={{ color: 'var(--color-amber)', fontWeight: 600 }}>
                        +{formatPrice(surchargeAmount)}
                      </span>
                    </div>
                  )}
                  <div
                    className="cart-total-row"
                    style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}
                  >
                    <span className="cart-total-label" style={{ fontSize: '1rem' }}>
                      Total
                    </span>
                    <span className="cart-total-value">{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 'var(--space-6)',
                    display: 'flex',
                    gap: 'var(--space-3)',
                    justifyContent: 'space-between',
                  }}
                >
                  <button className="btn btn-ghost" onClick={() => setStep('shipping')}>
                    ← Volver
                  </button>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={submitOrder}
                    disabled={loading}
                    id="checkout-submit-btn"
                  >
                    {loading ? (
                      <>
                        <div className="spinner" /> Procesando...
                      </>
                    ) : paymentMethod === 'mercadopago' ? (
                      `Ir a pagar con MercadoPago — ${formatPrice(finalTotal)}`
                    ) : (
                      `Confirmar pedido — ${formatPrice(finalTotal)}`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
