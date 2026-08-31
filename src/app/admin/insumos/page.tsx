import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { InsumosTableClient } from '@/components/admin/InsumosTableClient'

export default async function AdminInsumoPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login')
  
  if (profile?.role !== 'admin') redirect('/')

  const { data: supplies } = await supabase
    .from('supply_inventory')
    .select('*')
    .order('supply_type')
    .order('color_label')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Insumos</h1>
        <Link href="/admin/insumos/nuevo" className="btn btn-primary btn-sm" id="admin-new-insumo-btn">
          + Nuevo insumo
        </Link>
      </div>

      <InsumosTableClient supplies={supplies ?? []} />
    </div>
  )
}
