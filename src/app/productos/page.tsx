import type { Metadata } from 'next'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ProductsClient } from './ProductsClient'
import type { Product, Category } from '@/lib/types'
import { mockProducts, mockCategories } from '@/lib/mock-data'

export const metadata: Metadata = {
  title: 'Catálogo de Arcades',
  description: 'Explorá nuestro catálogo completo de arcades, bartops, pedestales y accesorios personalizados.',
}

interface PageProps {
  searchParams: Promise<{ categoria?: string; buscar?: string; tipo?: string }>
}

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

type ProductStockRow = Product & {
  stock_items?: Array<{
    id?: string
    stock_type: string
    quantity: number
    vinyl_supply_id?: string | null
    configuration?: { vinyl_supply_id?: string | null } | null
  }> | null
  vinyl_options?: Array<{ id: string; name: string; image_url: string | null; color_label?: string | null }>
}

type VinylOptionRow = NonNullable<ProductStockRow['vinyl_options']>[number]

function pickVinylOptions(ids: string[], vinylById: Map<string, VinylOptionRow>): VinylOptionRow[] {
  const options: VinylOptionRow[] = []
  for (const id of ids) {
    const vinyl = vinylById.get(id)
    if (vinyl) options.push(vinyl)
  }
  return options
}

function applyStockSummary(product: ProductStockRow): Product {
  const stockRows = product.stock_items ?? []
  const immediate = stockRows
    .filter((item) => item.stock_type === 'immediate')
    .reduce((sum, item) => sum + item.quantity, 0)
  const printed = stockRows
    .filter((item) => item.stock_type === 'printed')
    .reduce((sum, item) => sum + item.quantity, 0)
  const designed = stockRows
    .filter((item) => item.stock_type === 'designed')
    .reduce((sum, item) => sum + item.quantity, 0)
  const availability = immediate > 0
    ? 'immediate'
    : product.requires_production
      ? 'designed'
      : printed > 0
        ? 'printed'
        : 'none'

  return {
    ...product,
    stock_summary: {
      immediate,
      printed,
      designed,
      total: immediate + printed + designed,
      availability,
    },
  }
}

function sortByAvailability(products: Product[]) {
  const rank = (product: Product) => product.stock_summary?.availability === 'immediate' ? 0 : 1
  return [...products].sort((a, b) => rank(a) - rank(b) || a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'es'))
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = isSupabaseConfigured ? await createClient() : null

  let allProducts: Product[] = []
  let categories: Category[] = []

  if (supabase) {
    let query = supabase
      .from('products')
      .select('*, category:categories(*), stock_items(id, stock_type, quantity, vinyl_supply_id, configuration)')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (params.tipo) {
      query = query.eq('product_type', params.tipo)
    }

    const { data: p } = await query
    const { data: c } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    const productsWithVinyls = (p ?? []) as ProductStockRow[]
    const vinylIds = Array.from(new Set(productsWithVinyls.flatMap((product) => {
      const stockVinylIds = (product.stock_items ?? [])
        .filter((item) => item.quantity > 0 && (item.vinyl_supply_id || item.configuration?.vinyl_supply_id))
        .map((item) => (item.vinyl_supply_id || item.configuration?.vinyl_supply_id) as string)
      try {
        const meta = JSON.parse(product.meta_description || '{}')
        const catalogVinylIds = Array.isArray(meta.vinyl_supply_ids) ? meta.vinyl_supply_ids : []
        return [...stockVinylIds, ...catalogVinylIds]
      } catch {
        return stockVinylIds
      }
    })))
    const vinylClient = await createAdminClient()
    const { data: vinyls } = vinylIds.length > 0
      ? await vinylClient
          .from('supply_inventory')
          .select('id, name, image_url, color_label')
          .in('id', vinylIds)
          .eq('supply_type', 'vinyl')
          .eq('is_active', true)
      : { data: [] }
    const vinylById = new Map<string, VinylOptionRow>(
      ((vinyls ?? []) as VinylOptionRow[]).map((vinyl) => [vinyl.id, vinyl])
    )

    allProducts = productsWithVinyls.map((product) => {
      try {
        const meta = JSON.parse(product.meta_description || '{}')
        const immediateVinylIds = (product.stock_items ?? [])
          .filter((item) => item.stock_type === 'immediate' && item.quantity > 0 && (item.vinyl_supply_id || item.configuration?.vinyl_supply_id))
          .map((item) => (item.vinyl_supply_id || item.configuration?.vinyl_supply_id) as string)
        const catalogVinylIds = Array.isArray(meta.vinyl_supply_ids)
          ? meta.vinyl_supply_ids
          : []
        const coverVinylId = catalogVinylIds.find((id: string) => {
          const vinyl = vinylById.get(id)
          return vinyl?.image_url && product.images?.[0] === vinyl.image_url
        })
        const orderedVinylIds = Array.from(
          new Set([
            ...immediateVinylIds,
            ...(immediateVinylIds.length === 0 && coverVinylId ? [coverVinylId] : []),
            ...catalogVinylIds,
          ])
        )
        const productVinyls = pickVinylOptions(orderedVinylIds, vinylById)
        return applyStockSummary({ ...product, vinyl_options: productVinyls })
      } catch {
        return applyStockSummary({ ...product, vinyl_options: [] })
      }
    }) as Product[]
    categories = c ?? []
  } else {
    allProducts = mockProducts
    categories = mockCategories
    if (params.tipo) {
      allProducts = allProducts.filter(p => p.product_type === params.tipo)
    }
  }

  // Filter by category client-side after fetch (slug match)
  let products = allProducts
  if (params.categoria === 'express') {
    products = products.filter((p: Product) => {
      try {
        const meta = JSON.parse(p.meta_description || '{}')
        return Array.isArray(meta.presets) && meta.presets.length > 0
      } catch {
        return false
      }
    })
  } else if (params.categoria && params.categoria !== 'todos') {
    products = products.filter(
      (p: Product) => (p.category as unknown as Category)?.slug === params.categoria
    )
  }
  if (params.buscar) {
    const q = params.buscar.toLowerCase()
    products = products.filter(
      (p: Product) =>
        p.name.toLowerCase().includes(q) ||
        (p.short_description ?? '').toLowerCase().includes(q)
    )
  }
  products = sortByAvailability(products)

  return (
    <ProductsClient
      products={products}
      categories={categories ?? []}
      activeCategory={params.categoria ?? 'todos'}
      searchQuery={params.buscar ?? ''}
    />
  )
}
