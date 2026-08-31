import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Search, SlidersHorizontal } from 'lucide-react'

type StockSearchParams = Promise<{
  q?: string
  type?: string
  availability?: string
}>

interface StockRow {
  id: string
  product?: { name?: string | null; slug?: string | null } | null
  variant?: { cabinet_type?: string | null; screen_size?: string | null } | null
  vinyl?: { name?: string | null; image_url?: string | null } | null
  stock_type: string
  quantity: number
  configuration?: {
    name?: string | null
    vinyl_name?: string | null
    joystick_color?: string | null
    button_color?: string | null
  } | null
  updated_at: string
}

export default async function AdminStockPage({ searchParams }: { searchParams: StockSearchParams }) {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login')
  
  if (profile?.role !== 'admin') redirect('/')

  const params = await searchParams
  const q = (params.q ?? '').trim().toLowerCase()
  const typeFilter = params.type ?? 'immediate'
  const availabilityFilter = params.availability ?? 'available'

  const { data: stockData } = await supabase
    .from('stock_items')
    .select('*, product:products(name, slug), variant:product_variants(cabinet_type, screen_size), vinyl:supply_inventory(name, image_url)')
    .order('stock_type')
    .order('quantity', { ascending: false })

  const stockItems = ((stockData ?? []) as StockRow[]).filter((item) => {
    const matchesType = typeFilter === 'all' || item.stock_type === typeFilter
    const matchesAvailability =
      availabilityFilter === 'all'
        || (availabilityFilter === 'available' && item.quantity > 0)
        || (availabilityFilter === 'out' && item.quantity <= 0)
    const haystack = [
      item.product?.name,
      item.product?.slug,
      item.variant?.cabinet_type,
      item.variant?.screen_size,
      item.stock_type,
    ].filter(Boolean).join(' ').toLowerCase()
    const matchesSearch = !q || haystack.includes(q)

    return matchesType && matchesAvailability && matchesSearch
  })

  const stockTypeLabel: Record<string, string> = {
    immediate: '✅ Equipo terminado',
    printed: '⏱ Impreso (24 hs)',
    designed: '🎨 Diseñado (7 días)',
  }

  async function updateStockQuantityAction(formData: FormData) {
    'use server'
    const stockId = formData.get('stock_id') as string
    const quantity = parseInt(formData.get('quantity') as string) || 0

    const supabase = await createClient()
    const { data: stockItem } = await supabase
      .from('stock_items')
      .select('stock_type')
      .eq('id', stockId)
      .single()
    if (stockItem?.stock_type === 'immediate') {
      revalidatePath('/admin/stock')
      return
    }
    const { error } = await supabase
      .from('stock_items')
      .update({ quantity: Math.max(0, quantity), updated_at: new Date().toISOString() })
      .eq('id', stockId)

    if (error) {
      console.error('Error updating stock item quantity:', error)
    }

    revalidatePath('/admin/stock')
  }

  async function syncMissingStockAction() {
    'use server'
    const supabase = await createClient()
    const { data: allProds } = await supabase.from('products').select('id')
    const { data: existingStock } = await supabase.from('stock_items').select('product_id, stock_type')

    const toInsert: { product_id: string; stock_type: string; quantity: number }[] = []
    allProds?.forEach((p) => {
      ['immediate', 'printed', 'designed'].forEach((type) => {
        const exists = existingStock?.some((s) => s.product_id === p.id && s.stock_type === type)
        if (!exists) {
          toInsert.push({ product_id: p.id, stock_type: type, quantity: 0 })
        }
      })
    })

    if (toInsert.length > 0) {
      await supabase.from('stock_items').insert(toInsert)
    }

    revalidatePath('/admin/stock')
    revalidatePath('/admin/stock/presets')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Stock terminado</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>
            Vista principal de equipos armados y listos para vender. Los registros en cero quedan ocultos salvo que los filtres.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <form action={syncMissingStockAction}>
            <button type="submit" className="btn btn-ghost btn-sm" id="btn-sync-stock">
              🔄 Crear registros faltantes
            </button>
          </form>
          <Link href="/admin/stock/armar" className="btn btn-primary btn-sm" id="btn-armar-stock">
            🛠️ Armar Consola en Stock
          </Link>
          <Link href="/admin/stock/presets" className="btn btn-ghost btn-sm" id="btn-stock-presets">
            Presets y Equipos Armados
          </Link>
        </div>
      </div>

      <form className="admin-list-toolbar" method="get">
        <div className="admin-search-field">
          <Search size={18} />
          <input
            type="search"
            name="q"
            placeholder="Buscar producto, variante o tipo"
            defaultValue={params.q ?? ''}
          />
        </div>
        <div className="admin-filter-group">
          <SlidersHorizontal size={16} />
          <select name="type" defaultValue={typeFilter}>
            <option value="all">Todos los tipos</option>
            <option value="immediate">Equipos terminados</option>
            <option value="printed">Impreso 24 hs</option>
            <option value="designed">Diseñado 7 días</option>
          </select>
          <select name="availability" defaultValue={availabilityFilter}>
            <option value="all">Todas las cantidades</option>
            <option value="available">Solo con stock</option>
            <option value="out">Solo en cero</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-sm">Filtrar</button>
        {(params.q || typeFilter !== 'all' || availabilityFilter !== 'all') && (
          <Link href="/admin/stock" className="btn btn-ghost btn-sm">Limpiar</Link>
        )}
        <span className="admin-list-count">
          {stockItems.length} visibles de {(stockData ?? []).length} registros internos
        </span>
      </form>

      <div className="card card-body" style={{ marginBottom: 'var(--space-5)', display: 'grid', gap: 'var(--space-2)' }}>
        <strong>Cómo leer esta pantalla</strong>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          Lo útil para venta diaria es “Equipos terminados + Solo con stock”: son los productos que ya armaste desde fábrica.
          Los registros en cero sirven como matriz interna para que el sistema tenga dónde actualizar stock impreso/diseñado,
          pero no deberían molestarte en la vista normal.
        </p>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Vinilo / configuración</th>
              <th>Variante</th>
              <th>Tipo de stock</th>
              <th style={{ width: '180px' }}>Cantidad</th>
              <th>Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {stockItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`/productos/${item.product?.slug}`} style={{ color: 'var(--color-cyan)' }}>
                    {item.product?.name ?? '—'}
                  </Link>
                </td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {(item.vinyl?.image_url) && (
                      <img
                        src={item.vinyl.image_url}
                        alt={item.vinyl.name ?? 'Vinilo'}
                        style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 'var(--radius-sm)', background: 'var(--image-stage-bg)' }}
                      />
                    )}
                    <div>
                      <strong style={{ color: 'var(--color-text)' }}>
                        {item.vinyl?.name || item.configuration?.vinyl_name || item.configuration?.name || '—'}
                      </strong>
                      {(item.configuration?.joystick_color || item.configuration?.button_color) && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {item.configuration?.joystick_color && `Palanca: ${item.configuration.joystick_color}`}
                          {item.configuration?.joystick_color && item.configuration?.button_color ? ' · ' : ''}
                          {item.configuration?.button_color && `Botones: ${item.configuration.button_color}`}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                  {item.variant ? `${item.variant.cabinet_type ?? ''} ${item.variant.screen_size ?? ''}`.trim() : 'Default'}
                </td>
                <td>
                  <span className={`badge ${
                    item.stock_type === 'immediate' ? 'badge-immediate' :
                    item.stock_type === 'printed' ? 'badge-printed' : 'badge-designed'
                  }`}>
                    {stockTypeLabel[item.stock_type]}
                  </span>
                </td>
                <td>
                  {item.stock_type === 'immediate' ? (
                    <div>
                      <strong style={{ color: item.quantity > 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                        {item.quantity}
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Se modifica al armar, vender o cancelar
                      </div>
                    </div>
                  ) : (
                  <form action={updateStockQuantityAction} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="hidden" name="stock_id" value={item.id} />
                    <input
                      type="number"
                      name="quantity"
                      defaultValue={item.quantity}
                      required
                      min="0"
                      style={{
                        width: '70px',
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        color: item.quantity <= 0 ? 'var(--color-red)' : item.quantity < 3 ? 'var(--color-amber)' : 'var(--color-green)',
                        padding: '4px 8px',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                      id={`stock-input-${item.id}`}
                    />
                    <button type="submit" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }} id={`stock-save-${item.id}`}>
                      Guardar
                    </button>
                  </form>
                  )}
                </td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  {new Date(item.updated_at).toLocaleDateString('es-AR')}
                </td>
              </tr>
            ))}
            {stockItems.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-muted)' }}>
                  No hay registros de stock que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
