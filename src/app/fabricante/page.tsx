import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProductionQueueClient } from '../admin/produccion/ProductionQueueClient'

export default async function FabricantePanel() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login')

  

  if (!['admin', 'fabricante'].includes(profile?.role ?? '')) redirect('/')

  const { data: queue } = await supabase
    .from('production_queue')
    .select('*, order:orders(order_number, customer_name, customer_email, customer_phone)')
    .neq('status', 'dispatched')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })

  const { data: fabricantes } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('role', ['admin', 'fabricante'])

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <div
        style={{
          marginBottom: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}
      >
        <span style={{ fontSize: '2rem' }}>🔧</span>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Panel de Producción</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Cola de trabajo activa</p>
        </div>
      </div>
      <ProductionQueueClient
        queue={queue ?? []}
        fabricantes={fabricantes ?? []}
        isAdmin={profile?.role === 'admin'}
      />
    </div>
  )
}
