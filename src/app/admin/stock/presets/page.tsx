import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PresetsClient } from './PresetsClient'

export default async function AdminStockPresetsPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login')
  if (profile?.role !== 'admin') redirect('/')

  // Fetch all immediate stock items
  const { data: stockItems } = await supabase
    .from('stock_items')
    .select('*, product:products(id, name, slug, meta_description), variant:product_variants(id, cabinet_type, screen_size)')
    .eq('stock_type', 'immediate')

  // Fetch active supplies (vinyls, joysticks, buttons)
  const { data: supplies } = await supabase
    .from('supply_inventory')
    .select('*')
    .eq('is_active', true)

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
          ⚙️ Configurar Equipos Armados (Presets)
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Asigná especificaciones fijas (vinilos, palancas, botones) a los equipos listos para entrega en stock inmediato.
        </p>
      </div>
      <PresetsClient
        stockItems={stockItems ?? []}
        supplies={supplies ?? []}
      />
    </div>
  )
}
