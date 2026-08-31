import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArmarStockClient } from './ArmarStockClient'

export default async function AdminArmarStockPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login')
  if (profile?.role !== 'admin') redirect('/')

  // Fetch active products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // Fetch all supplies
  const { data: supplies } = await supabase
    .from('supply_inventory')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // Fetch supply families
  const { data: fConfig } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('key', 'supply_families')
    .maybeSingle()

  let supplyFamilies = []
  if (fConfig?.value) {
    try {
      supplyFamilies = typeof fConfig.value === 'string' ? JSON.parse(fConfig.value) : fConfig.value
    } catch {}
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
            🛠️ Armar Consola para Stock Inmediato
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Registrá las unidades terminadas listas para entrega. El sistema descontará automáticamente los insumos utilizados de tu inventario.
          </p>
        </div>
        <Link href="/admin/stock" className="btn btn-ghost btn-sm">
          ← Volver al Stock
        </Link>
      </div>

      <ArmarStockClient
        products={products ?? []}
        supplies={supplies ?? []}
        supplyFamilies={supplyFamilies}
      />
    </div>
  )
}
