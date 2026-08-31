import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPrice } from '@/lib/types'
import { Search, SlidersHorizontal } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending_confirmation: { label: 'Pend. pago', className: 'status-pending_confirmation' },
  confirmed: { label: 'Confirmado', className: 'status-confirmed' },
  in_production: { label: 'En producción', className: 'status-in_production' },
  ready: { label: 'Listo', className: 'status-ready' },
  dispatched: { label: 'Despachado', className: 'status-dispatched' },
  delivered: { label: 'Entregado', className: 'status-delivered' },
  cancelled: { label: 'Cancelado', className: 'status-cancelled' },
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  pending: 'A definir',
  current_account: 'Cuenta corriente',
}

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string; payment?: string }>
}

interface OrderRow {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  payment_method: string | null
  total: number
  status: string
  created_at: string
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login')

  
  if (profile?.role !== 'admin') redirect('/')

  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }
  if (params.payment && params.payment !== 'all') query = query.eq('payment_method', params.payment)
  if (params.q?.trim()) {
    const term = params.q.trim()
    query = query.or(`order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_email.ilike.%${term}%,customer_phone.ilike.%${term}%`)
  }

  const { data: orders } = await query.limit(50)

  return (
    <div>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Pedidos</h1>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          {orders?.length ?? 0} pedidos
        </span>
      </div>

      <form className="admin-list-toolbar" method="get">
        <label className="admin-search-field">
          <span className="sr-only">Buscar pedidos</span><Search size={17} aria-hidden="true" />
          <input name="q" defaultValue={params.q ?? ''} placeholder="Buscar por pedido, cliente, email o teléfono…" />
        </label>
        <div className="admin-filter-group"><SlidersHorizontal size={17} aria-hidden="true" />
          <select name="payment" defaultValue={params.payment ?? 'all'} aria-label="Método de pago">
            <option value="all">Todos los pagos</option><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="card">Tarjeta</option><option value="current_account">Cuenta corriente</option>
          </select>
        </div>
        {params.status && <input type="hidden" name="status" value={params.status} />}
        <button className="btn btn-primary btn-sm" type="submit">Buscar</button>
        {(params.q || params.payment) && <Link className="btn btn-ghost btn-sm" href={params.status && params.status !== 'all' ? `/admin/pedidos?status=${params.status}` : '/admin/pedidos'}>Limpiar</Link>}
      </form>

      {/* Filters */}
      <div className="category-tabs" style={{ marginBottom: 'var(--space-5)' }}>
        {[
          { value: 'all', label: 'Todos' },
          { value: 'pending_confirmation', label: 'Pend. pago' },
          { value: 'confirmed', label: 'Confirmados' },
          { value: 'in_production', label: 'En producción' },
          { value: 'ready', label: 'Listos' },
          { value: 'dispatched', label: 'Despachados' },
          { value: 'delivered', label: 'Entregados' },
          { value: 'cancelled', label: 'Cancelados' },
        ].map((f) => (
          <Link
            key={f.value}
            href={`/admin/pedidos?${new URLSearchParams({
              ...(f.value !== 'all' ? { status: f.value } : {}),
              ...(params.q ? { q: params.q } : {}),
              ...(params.payment && params.payment !== 'all' ? { payment: params.payment } : {}),
            }).toString()}`}
            className={`category-tab ${(params.status ?? 'all') === f.value ? 'active' : ''}`}
            id={`orders-filter-${f.value}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nro. Pedido</th>
              <th>Cliente</th>
              <th>Pago</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(orders as OrderRow[] | null | undefined)?.map((order) => (
              <tr key={order.id}>
                <td>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.8125rem',
                      color: 'var(--color-cyan)',
                    }}
                  >
                    {order.order_number}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{order.customer_name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    {order.customer_email}
                  </div>
                </td>
                <td style={{ fontSize: '0.875rem' }}>
                  {order.payment_method ? PAYMENT_LABELS[order.payment_method] ?? '—' : '—'}
                </td>
                <td style={{ fontWeight: 700 }}>{formatPrice(order.total)}</td>
                <td>
                  <span
                    className={`status-badge ${STATUS_LABELS[order.status]?.className ?? ''}`}
                  >
                    {STATUS_LABELS[order.status]?.label ?? order.status}
                  </span>
                </td>
                <td
                  style={{
                    color: 'var(--color-text-muted)',
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {new Date(order.created_at).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })}
                </td>
                <td>
                  <Link
                    href={`/admin/pedidos/${order.id}`}
                    className="btn btn-ghost btn-sm"
                    id={`orders-detail-${order.id}`}
                  >
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: 'var(--space-10)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  No hay pedidos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
