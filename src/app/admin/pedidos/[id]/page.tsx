import { createClient, getAuthUser } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPrice, type OrderItem, type PlayerCustomization } from '@/lib/types'
import { ArrowLeft, Save } from 'lucide-react'
import { revalidatePath } from 'next/cache'

const STATUS_LABELS: Record<string, string> = {
  pending_confirmation: 'Pendiente de pago',
  confirmed: 'Confirmado',
  in_production: 'En producción',
  ready: 'Listo para retirar/enviar',
  dispatched: 'Despachado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia bancaria',
  card: 'Tarjeta',
  pending: 'A definir',
  current_account: 'Cuenta corriente',
}

function getOrderItemMode(item: OrderItem) {
  if (item.fulfillment_type === 'ready_stock') {
    return {
      label: 'Listo para entregar',
      helper: 'Equipo terminado; no requiere armado nuevo.',
      className: 'badge-immediate',
    }
  }

  if (item.customization?.vinyl_source === 'custom') {
    return {
      label: 'A medida + diseño personalizado',
      helper: 'Coordinar diseño, pedir impresión y luego fabricar.',
      className: 'badge-designed',
    }
  }

  if (item.customization?.vinyl_source === 'print') {
    return {
      label: 'A medida + impresión de vinilo',
      helper: 'Pedir impresión del diseño elegido y luego fabricar.',
      className: 'badge-designed',
    }
  }

  if (item.customization?.vinyl_source === 'stock') {
    return {
      label: 'A medida con vinilo disponible',
      helper: 'Reservar insumos disponibles y fabricar.',
      className: 'badge-printed',
    }
  }

  return {
    label: 'A medida',
    helper: 'Revisar configuración y fabricar.',
    className: 'badge-printed',
  }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  
  if (!user || profile?.role !== 'admin') {
    redirect('/')
  }

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(*))')
    .eq('id', id)
    .single()

  if (!order) {
    notFound()
  }

  async function updateOrderAction(formData: FormData) {
    'use server'
    const status = formData.get('status') as string
    const payment_status = formData.get('payment_status') as string
    const admin_notes = formData.get('admin_notes') as string

    const supabase = await createClient()
    const { data: { user: actionUser }, profile: actionProfile } = await getAuthUser(supabase)
    if (!actionUser || actionProfile?.role !== 'admin') redirect('/')

    if (status === 'cancelled') {
      const { error } = await supabase.rpc('cancel_store_order', { p_order_id: id })
      if (error) console.error('Error cancelling order:', error)
      revalidatePath(`/admin/pedidos/${id}`)
      revalidatePath('/admin/pedidos')
      return
    }

    if (
      order.reservation_status === 'active' &&
      ['confirmed', 'in_production', 'ready'].includes(status)
    ) {
      const { error } = await supabase.rpc('confirm_store_order', {
        p_order_id: id,
        p_payment_paid: payment_status === 'paid',
      })
      if (error) {
        console.error('Error confirming order:', error)
        return
      }
    }

    const { error } = await supabase
      .from('orders')
      .update({
        status,
        payment_status,
        admin_notes,
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating order:', error)
    }

    revalidatePath(`/admin/pedidos/${id}`)
    revalidatePath('/admin/pedidos')
  }

  async function resolveCancellationAction(formData: FormData) {
    'use server'
    const resolution = formData.get('resolution') as 'restock' | 'disassemble'
    const supabase = await createClient()
    const { data: { user: actionUser }, profile: actionProfile } = await getAuthUser(supabase)
    if (!actionUser || actionProfile?.role !== 'admin') redirect('/')
    const { error } = await supabase.rpc('resolve_cancelled_order', {
      p_order_id: id,
      p_resolution: resolution,
    })
    if (error) console.error('Error resolving cancelled order:', error)
    revalidatePath(`/admin/pedidos/${id}`)
    revalidatePath('/admin/stock')
  }

  return (
    <div style={{ paddingBottom: 'var(--space-16)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <Link href="/admin/pedidos" className="btn btn-ghost btn-icon btn-sm">
          <ArrowLeft size={18} />
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Pedido {order.order_number}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-8)' }}>
        {/* Left column: Customer info & Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Cliente */}
          <div className="card card-body">
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Datos del Cliente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', fontSize: '0.9375rem' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', display: 'block' }}>Nombre</span>
                <strong>{order.customer_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', display: 'block' }}>Email</span>
                <strong>{order.customer_email}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', display: 'block' }}>Teléfono</span>
                <strong>{order.customer_phone || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', display: 'block' }}>Rol de Compra</span>
                <span className="badge badge-admin">{order.customer_role_snapshot}</span>
              </div>
            </div>
          </div>

          {/* Envio */}
          {order.shipping_address && (
            <div className="card card-body">
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Dirección de Envío</h3>
              <div style={{ fontSize: '0.9375rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', display: 'block' }}>Calle</span>
                  <strong>{order.shipping_address.street}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', display: 'block' }}>Ciudad</span>
                    <strong>{order.shipping_address.city}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', display: 'block' }}>Provincia</span>
                    <strong>{order.shipping_address.province}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', display: 'block' }}>C.P.</span>
                    <strong>{order.shipping_address.zip || '—'}</strong>
                  </div>
                </div>
                {order.shipping_address.notes && (
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', display: 'block' }}>Instrucciones Especiales</span>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                      &ldquo;{order.shipping_address.notes}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items */}
          <div className="card card-body">
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Productos Solicitados</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {order.items?.map((item: OrderItem) => (
                <div key={item.id} style={{ display: 'flex', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
                  <div style={{ fontSize: '2.5rem' }}>🕹️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{item.product?.name ?? 'Producto desconocido'}</div>
                    {(() => {
                      const mode = getOrderItemMode(item)
                      return (
                        <div className="order-item-mode">
                          <span className={`badge ${mode.className}`}>{mode.label}</span>
                          <small>{mode.helper}</small>
                        </div>
                      )
                    })()}
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {item.customization.cabinet_type && <div>Gabinete: {item.customization.cabinet_type} {item.customization.screen_size}</div>}
                      {item.customization.vinyl_name && <div>Temática/Vinilo: {item.customization.vinyl_name}</div>}
                      
                      {/* Render J1-J4 customizations if present */}
                      {item.customization.players && item.customization.players.length > 0 ? (
                        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {item.customization.players.map((p: PlayerCustomization, idx: number) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', background: 'var(--color-surface-2)', padding: '2px 8px', borderRadius: 4, width: 'fit-content' }}>
                              <strong>Jugador {idx + 1}:</strong>
                              <span>Palanca: {p.joystick_color ? <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: p.joystick_color, marginRight: 2 }} /> : '—'}</span>
                              <span>· {p.button_count || 6} botones</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        (item.customization.joystick_color || item.customization.button_count) && (
                          <div style={{ fontSize: '0.8125rem', background: 'var(--color-surface-2)', padding: '4px 8px', borderRadius: 4, marginTop: 4, width: 'fit-content' }}>
                            <span>Palanca: {item.customization.joystick_color ? <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: item.customization.joystick_color }} /> : '—'}</span>
                            <span style={{ marginLeft: 8 }}>· {item.customization.button_count || 6} botones</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{formatPrice(item.unit_price * item.quantity)}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{item.quantity} x {formatPrice(item.unit_price)}</div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Totales */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)', alignSelf: 'flex-end', width: '300px', marginLeft: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem', color: 'var(--color-green)' }}>
                  <span>Descuento</span>
                  <span>-{formatPrice(order.discount_amount)}</span>
                </div>
              )}
              {(order.payment_surcharge_amount ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem', color: 'var(--color-amber)' }}>
                  <span>Recargo</span>
                  <span>+{formatPrice(order.payment_surcharge_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)', fontWeight: 700, fontSize: '1.0625rem' }}>
                <span>Total</span>
                <span style={{ color: 'var(--color-cyan)' }}>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Update form & actions */}
        <div>
          {order.cancellation_resolution === 'pending' && (
            <form action={resolveCancellationAction} className="card card-body" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Resolver equipo fabricado</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-4)' }}>
                Elegí qué hacer con los componentes del pedido cancelado.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <button name="resolution" value="restock" className="btn btn-primary" type="submit">
                  Convertir en stock listo
                </button>
                <button name="resolution" value="disassemble" className="btn btn-ghost" type="submit">
                  Desarmar y devolver insumos
                </button>
              </div>
            </form>
          )}
          <form action={updateOrderAction} className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Gestión Interna</h3>
            
            <div className="form-group">
              <label className="form-label">Estado de la Orden</label>
              <select name="status" className="form-input form-select" defaultValue={order.status}>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estado del Pago</label>
              <select name="payment_status" className="form-input form-select" defaultValue={order.payment_status}>
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
                <option value="refunded">Reembolsado</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Método de Pago</label>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                {PAYMENT_LABELS[order.payment_method] || order.payment_method || 'A definir'}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notas del Admin</label>
              <textarea
                name="admin_notes"
                className="form-input form-textarea"
                defaultValue={order.admin_notes || ''}
                placeholder="Notas de seguimiento internas..."
                style={{ height: '120px' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', gap: 8, marginTop: 'var(--space-2)' }}>
              <Save size={16} /> Guardar Cambios
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
