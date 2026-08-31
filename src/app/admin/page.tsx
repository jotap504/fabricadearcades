import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingBag,
  Package,
  Wrench,
  Users,
  AlertTriangle,
  ContactRound,
} from 'lucide-react'
import { formatPrice } from '@/lib/types'

interface RecentOrderRow {
  id: string
  order_number: string
  customer_name: string
  total: number
  status: string
  created_at: string
}

interface LowStockSupplyRow {
  id: string
  name: string
  supply_type: string
  color: string | null
  color_label: string | null
  quantity: number
  unit: string | null
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
    profile
  } = await getAuthUser(supabase)
  if (!user) redirect('/login')

  

  if (profile?.role !== 'admin') redirect('/')

  // Fetch stats
  const [
    { count: totalOrders },
    { count: pendingOrders },
    { count: productionPending },
    { count: pendingDistributors },
    { data: recentOrders },
    { data: lowStockItems },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_confirmation'),
    supabase
      .from('production_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'distribuidor')
      .eq('distributor_approved', false),
    supabase
      .from('orders')
      .select('id, order_number, customer_name, total, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('supply_inventory')
      .select('*')
      .lt('quantity', 5)
      .gt('quantity', -1)
      .not('unit', 'eq', 'diseño')
      .order('quantity', { ascending: true })
      .limit(5),
  ])

  const stats = [
    {
      icon: <ShoppingBag size={22} />,
      color: 'cyan',
      label: 'Pedidos totales',
      value: totalOrders ?? 0,
    },
    {
      icon: <AlertTriangle size={22} />,
      color: 'amber',
      label: 'Pendientes de pago',
      value: pendingOrders ?? 0,
    },
    {
      icon: <Wrench size={22} />,
      color: 'magenta',
      label: 'En cola de producción',
      value: productionPending ?? 0,
    },
    {
      icon: <Users size={22} />,
      color: 'green',
      label: 'Distribuidores pendientes',
      value: pendingDistributors ?? 0,
    },
  ]

  const STATUS_LABELS: Record<string, string> = {
    pending_confirmation: 'Pend. pago',
    confirmed: 'Confirmado',
    in_production: 'En prod.',
    ready: 'Listo',
    dispatched: 'Despachado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Bienvenido al panel de administración
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}>{stat.icon}</div>
            <div className="stat-card-label">{stat.label}</div>
            <div className="stat-card-value">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-8)',
        }}
      >
        {[
          { href: '/admin/pedidos', label: 'Ver pedidos', icon: <ShoppingBag size={22} />, color: 'var(--color-cyan)' },
          { href: '/admin/produccion', label: 'Cola de producción', icon: <Wrench size={22} />, color: 'var(--color-magenta)' },
          { href: '/admin/clientes', label: 'Clientes y marketing', icon: <ContactRound size={22} />, color: 'var(--color-amber)' },
          { href: '/admin/productos/nuevo', label: 'Nuevo producto', icon: <Package size={22} />, color: 'var(--color-green)' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="card card-hover card-body"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              textDecoration: 'none',
            }}
            id={`admin-action-${action.href.split('/').pop()}`}
          >
            <span style={{ color: action.color, display: 'inline-flex' }}>{action.icon}</span>
            <span style={{ fontWeight: 600, color: action.color }}>{action.label}</span>
          </Link>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'var(--space-6)',
        }}
      >
        {/* Recent orders */}
        <div>
          <div
            className="flex-between"
            style={{ marginBottom: 'var(--space-4)' }}
          >
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Últimos pedidos</h2>
            <Link
              href="/admin/pedidos"
              style={{ fontSize: '0.875rem', color: 'var(--color-cyan)' }}
            >
              Ver todos →
            </Link>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {(recentOrders as RecentOrderRow[] | null | undefined)?.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        style={{
                          color: 'var(--color-cyan)',
                          fontFamily: 'var(--font-display)',
                          fontSize: '0.875rem',
                        }}
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td>{order.customer_name}</td>
                    <td style={{ fontWeight: 700 }}>{formatPrice(order.total)}</td>
                    <td>
                      <span className={`status-badge status-${order.status}`}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {new Date(order.created_at).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                ))}
                {(!recentOrders || recentOrders.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: 'center',
                        color: 'var(--color-text-muted)',
                        padding: 'var(--space-8)',
                      }}
                    >
                      No hay pedidos aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low stock alerts */}
        {lowStockItems && lowStockItems.length > 0 && (
          <div>
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                marginBottom: 'var(--space-4)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                color: 'var(--color-amber)',
              }}
            >
              <AlertTriangle size={18} /> Stock bajo de insumos
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {(lowStockItems as LowStockSupplyRow[]).map((item) => (
                <div
                  key={item.id}
                  className="card card-body"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    borderColor: 'rgba(245,158,11,0.3)',
                  }}
                >
                  {item.color && (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius-sm)',
                        background: item.color,
                        border: '2px solid var(--color-border)',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {item.supply_type} · {item.color_label}
                    </div>
                  </div>
                  <span
                    className="badge"
                    style={{
                      background: item.quantity === 0 ? 'var(--color-red-dim)' : 'var(--color-amber-dim)',
                      color: item.quantity === 0 ? 'var(--color-red)' : 'var(--color-amber)',
                      border: 'none',
                    }}
                  >
                    {item.quantity} {item.unit}
                  </span>
                  <Link
                    href={`/admin/insumos`}
                    style={{ fontSize: '0.875rem', color: 'var(--color-cyan)' }}
                  >
                    Reponer →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
