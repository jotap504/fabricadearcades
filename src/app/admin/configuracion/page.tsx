import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfigClient } from './ConfigClient'

export default async function AdminConfigPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login')
  
  if (profile?.role !== 'admin') redirect('/')

  const { data: deliveryConfig } = await supabase.from('delivery_config').select('*')
  const { data: pricingConfig } = await supabase.from('pricing_config').select('*')

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Configuración</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Ajustá los parámetros operativos de la tienda
        </p>
      </div>
      <ConfigClient
        deliveryConfig={deliveryConfig ?? []}
        pricingConfig={pricingConfig ?? []}
      />
    </div>
  )
}
