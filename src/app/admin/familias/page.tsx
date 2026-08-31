import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FamiliasClient } from './FamiliasClient'

export default async function AdminFamiliasPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login')
  if (profile?.role !== 'admin') redirect('/')

  const { data: config } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('key', 'supply_families')
    .single()

  let families: any[] = []
  try {
    if (config?.value) {
      families = typeof config.value === 'string' ? JSON.parse(config.value) : config.value
    }
  } catch {
    families = []
  }

  const { data: supplies } = await supabase
    .from('supply_inventory')
    .select('id, name, supply_type, color_label, quantity')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
            📦 Familias de Insumos
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Agrupá y categorizá insumos (ej: <em>Vinilos Consola 78cm</em>, <em>Palancas Sanwa</em>, <em>Botones LED 30mm</em>) para vincularlos a los modelos de consolas.
          </p>
        </div>
      </div>

      <FamiliasClient
        initialFamilies={families}
        supplies={supplies ?? []}
      />
    </div>
  )
}
