import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Search, SlidersHorizontal } from 'lucide-react'
import { ProductPriceMarkupInputs } from '@/components/admin/ProductPriceMarkupInputs'

interface PageProps { searchParams: Promise<{ q?: string; type?: string; state?: string }> }

interface ProductRow {
  id: string
  name: string
  slug: string
  product_type: string
  base_price: number
  retail_markup_pct: number
  images: string[] | null
  meta_description: string | null
  is_active: boolean
  category?: { name: string | null } | null
  variants?: { id: string }[] | null
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login')
  
  if (profile?.role !== 'admin') redirect('/')

  let productsQuery = supabase
    .from('products')
    .select('*, category:categories(name), variants:product_variants(id)')
    .order('sort_order')
  if (params.q?.trim()) productsQuery = productsQuery.or(`name.ilike.%${params.q.trim()}%,slug.ilike.%${params.q.trim()}%,short_description.ilike.%${params.q.trim()}%`)
  if (params.type && params.type !== 'all') productsQuery = productsQuery.eq('product_type', params.type)
  if (params.state === 'active') productsQuery = productsQuery.eq('is_active', true)
  if (params.state === 'inactive') productsQuery = productsQuery.eq('is_active', false)
  const { data: products } = await productsQuery

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Productos</h1>
        <Link href="/admin/productos/nuevo" className="btn btn-primary btn-sm" id="admin-new-product-btn">
          + Nuevo producto
        </Link>
      </div>

      <form className="admin-list-toolbar" method="get">
        <label className="admin-search-field"><span className="sr-only">Buscar productos</span><Search size={17} aria-hidden="true" /><input name="q" defaultValue={params.q ?? ''} placeholder="Buscar por nombre, código o descripción…" /></label>
        <div className="admin-filter-group"><SlidersHorizontal size={17} aria-hidden="true" />
          <select name="type" defaultValue={params.type ?? 'all'} aria-label="Tipo de producto"><option value="all">Todos los tipos</option><option value="arcade">Arcades</option><option value="accessory">Accesorios</option><option value="bundle">Combos</option></select>
          <select name="state" defaultValue={params.state ?? 'all'} aria-label="Estado del producto"><option value="all">Cualquier estado</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select>
        </div>
        <button className="btn btn-primary btn-sm" type="submit">Buscar</button>
        {(params.q || params.type || params.state) && <Link className="btn btn-ghost btn-sm" href="/admin/productos">Limpiar</Link>}
        <span className="admin-toolbar-count">{products?.length ?? 0} resultados</span>
      </form>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Tipo</th>
              <th>Catálogo</th>
              <th style={{ minWidth: '220px' }}>Precio Base y Margen</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(products as ProductRow[] | null | undefined)?.map((p) => {
              let vinylCount = 0
              try {
                const meta = p.meta_description ? JSON.parse(p.meta_description) : {}
                vinylCount = Array.isArray(meta.vinyl_supply_ids) ? meta.vinyl_supply_ids.length : 0
              } catch {
                vinylCount = 0
              }
              const imageCount = Array.isArray(p.images) ? p.images.length : 0
              const variantCount = p.variants?.length ?? 0

              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{p.slug}</div>
                  </td>
                  <td>{p.category?.name ?? '—'}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--color-cyan-dim)', color: 'var(--color-cyan)' }}>
                      {p.product_type}
                    </span>
                  </td>
                  <td>
                    <div className="product-admin-catalog-flags">
                      <span className={imageCount > 0 ? 'is-ok' : 'is-missing'}>{imageCount > 0 ? `${imageCount} img` : 'Sin portada'}</span>
                      <span className={vinylCount > 0 ? 'is-ok' : 'is-muted'}>{vinylCount} vinilos</span>
                      <span className={variantCount > 0 ? 'is-ok' : 'is-muted'}>{variantCount} variantes</span>
                    </div>
                  </td>
                  <td>
                    <ProductPriceMarkupInputs
                      id={p.id}
                      initialBasePrice={p.base_price}
                      initialMarkupPct={p.retail_markup_pct}
                    />
                  </td>
                  <td>
                    <span className={`badge ${p.is_active ? 'badge-immediate' : 'badge-none'}`}>
                      {p.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <Link href={`/admin/productos/${p.id}`} className="btn btn-ghost btn-sm" id={`edit-product-${p.id}`}>
                      Editar
                    </Link>
                  </td>
                </tr>
              )
            })}
            {(!products || products.length === 0) && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-muted)' }}>
                  No hay productos aún. <Link href="/admin/productos/nuevo" style={{ color: 'var(--color-cyan)' }}>Crear el primero →</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
