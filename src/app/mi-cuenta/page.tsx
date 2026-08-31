import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPrice } from '@/lib/types'
import { User, Package, Bell, LogOut } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pending_confirmation: 'Pendiente de pago',
  confirmed: 'Confirmado',
  in_production: 'En producción',
  ready: 'Listo para retirar/enviar',
  dispatched: 'Despachado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export default async function MyAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await getAuthUser(supabase)
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length ?? 0

  return (
    <div style={{ paddingBottom: 'var(--space-16)' }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--color-bg-2)',
          borderBottom: '1px solid var(--color-border)',
          padding: 'var(--space-8) 0 var(--space-6)',
        }}
      >
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--color-cyan)',
                  boxShadow: 'var(--shadow-glow-cyan)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'var(--color-cyan-dim)',
                  border: '2px solid var(--color-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow-cyan)',
                }}
              >
                <User size={28} style={{ color: 'var(--color-cyan)' }} />
              </div>
            )}
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
                {profile?.full_name ?? user.email?.split('@')[0] ?? 'Mi cuenta'}
              </h1>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  {user.email}
                </span>
                {profile?.role === 'distribuidor' && (
                  <span className="badge badge-distributor">💼 Distribuidor</span>
                )}
                {profile?.role === 'distribuidor' && !profile.distributor_approved && (
                  <span className="badge badge-printed">⏳ Aprobación pendiente</span>
                )}
              </div>
            </div>
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
          {/* My Orders */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-5)',
              }}
            >
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <Package size={20} style={{ color: 'var(--color-cyan)' }} />
                Mis pedidos
              </h2>
            </div>

            {orders && orders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {orders.map((order: any) => (
                  <div
                    key={order.id}
                    className="card card-body"
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 'var(--space-4)',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          color: 'var(--color-cyan)',
                          fontSize: '0.875rem',
                          marginBottom: 2,
                        }}
                      >
                        {order.order_number}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '1.0625rem' }}>
                        {formatPrice(order.total)}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--color-text-muted)',
                          marginTop: 2,
                        }}
                      >
                        {new Date(order.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <span className={`status-badge status-${order.status}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="card card-body"
                style={{
                  textAlign: 'center',
                  padding: 'var(--space-10)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Package size={36} style={{ opacity: 0.3, margin: '0 auto var(--space-3)' }} />
                <p>No tenés pedidos aún</p>
                <Link
                  href="/productos"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 'var(--space-4)', display: 'inline-flex' }}
                  id="account-shop-btn"
                >
                  Ir al catálogo
                </Link>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div>
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-5)',
              }}
            >
              <Bell size={20} style={{ color: 'var(--color-cyan)' }} />
              Notificaciones
              {unreadCount > 0 && (
                <span
                  className="badge badge-admin"
                  style={{ fontSize: '0.6875rem' }}
                >
                  {unreadCount} nuevas
                </span>
              )}
            </h2>

            {notifications && notifications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {notifications.map((notif: any) => (
                  <div
                    key={notif.id}
                    className="card card-body"
                    style={{
                      display: 'flex',
                      gap: 'var(--space-3)',
                      alignItems: 'flex-start',
                      borderColor: notif.is_read
                        ? 'var(--color-border)'
                        : 'rgba(0, 245, 255, 0.3)',
                      background: notif.is_read
                        ? 'var(--color-surface)'
                        : 'rgba(0, 245, 255, 0.03)',
                    }}
                  >
                    {!notif.is_read && (
                      <div
                        className="glow-dot"
                        style={{ flexShrink: 0, marginTop: 6 }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>
                        {notif.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {notif.body}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-text-muted)',
                          marginTop: 4,
                        }}
                      >
                        {new Date(notif.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="card card-body"
                style={{
                  textAlign: 'center',
                  padding: 'var(--space-8)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Bell size={28} style={{ opacity: 0.3, margin: '0 auto var(--space-2)' }} />
                <p style={{ fontSize: '0.9375rem' }}>Sin notificaciones</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
