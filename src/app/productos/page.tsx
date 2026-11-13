import type { Metadata } from 'next'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ProductsClient } from './ProductsClient'
import type { Product, Category } from '@/lib/types'
import { mockProducts, mockCategories } from '@/lib/mock-data'
import { buildPageMetadata } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL, absoluteUrl } from '@/lib/site'
import { createPublicClient } from '@/lib/supabase/public'
import {
  CATALOG_SEO,
  IMMEDIATE_CANONICAL_SLUG,
  IMMEDIATE_SEO,
  IMMEDIATE_SLUGS,
  categoryPath,
  categorySeo,
} from '@/lib/catalog-seo'

interface PageProps {
  searchParams: Promise<{ categoria?: string; buscar?: string; tipo?: string }>
}

/**
 * Each category view is its own indexable page (self-canonical). Search results and
 * the internal "tipo" filter are thin/duplicate, so they stay out of the index.
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams
  const catalog = buildPageMetadata({ ...CATALOG_SEO, path: '/productos' })
  const notIndexed: Metadata = { ...catalog, robots: { index: false, follow: true } }

  if (params.buscar || params.tipo) return notIndexed

  const slug = params.categoria
  if (!slug || slug === 'todos') return catalog

  if (IMMEDIATE_SLUGS.includes(slug)) {
    return buildPageMetadata({
      title: IMMEDIATE_SEO.title,
      description: IMMEDIATE_SEO.description,
      path: categoryPath(IMMEDIATE_CANONICAL_SLUG),
    })
  }

  const supabase = createPublicClient()
  const category = supabase
    ? (await supabase.from('categories').select('name, slug').eq('slug', slug).eq('is_active', true).maybeSingle()).data
    : mockCategories.find((c) => c.slug === slug) ?? null

  // Unknown category slug: render the catalog but don't index the made-up URL.
  if (!category) return notIndexed

  const seo = categorySeo(category.slug, category.name)
  return buildPageMetadata({ title: seo.title, description: seo.description, path: categoryPath(category.slug) })
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

  // Hide categories with no active products (empty tabs lead to a dead-end page)
  const categoriesWithProducts = (categories ?? []).filter((c: Category) =>
    allProducts.some((p: Product) => (p.category as unknown as Category | null)?.slug === c.slug)
  )

  // Filter by category client-side after fetch (slug match)
  let products = allProducts
  if (params.categoria === 'express' || params.categoria === 'inmediata') {
    products = products.filter((p: Product) => {
      return (
        p.stock_summary?.availability === 'immediate' ||
        (p.stock_summary?.immediate && p.stock_summary.immediate > 0)
      )
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

  // ---- Heading + structured data for the current view ----
  const activeSlug = params.categoria && params.categoria !== 'todos' ? params.categoria : null
  const activeCategory = activeSlug
    ? categoriesWithProducts.find((c: Category) => c.slug === activeSlug) ?? null
    : null
  const isImmediateView = Boolean(activeSlug && IMMEDIATE_SLUGS.includes(activeSlug))
  const heading = isImmediateView
    ? IMMEDIATE_SEO.heading
    : activeCategory
      ? categorySeo(activeCategory.slug, activeCategory.name).heading
      : 'Catálogo'
  const viewPath = isImmediateView
    ? categoryPath(IMMEDIATE_CANONICAL_SLUG)
    : activeCategory
      ? categoryPath(activeCategory.slug)
      : '/productos'
  const viewUrl = absoluteUrl(viewPath)
  const isIndexableView = !params.buscar && !params.tipo && (!activeSlug || isImmediateView || activeCategory)

  const catalogJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${viewUrl}#collection`,
        url: viewUrl,
        name: heading === 'Catálogo' ? CATALOG_SEO.title : heading,
        inLanguage: 'es-AR',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: products.length,
          itemListElement: products.map((p: Product, index: number) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: p.name,
            url: absoluteUrl(`/productos/${p.slug}`),
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Catálogo', item: absoluteUrl('/productos') },
          ...(viewPath !== '/productos'
            ? [{ '@type': 'ListItem', position: 3, name: heading, item: viewUrl }]
            : []),
        ],
      },
    ],
  }

  return (
    <>
      {isIndexableView && <JsonLd data={catalogJsonLd} />}
      <ProductsClient
        products={products}
        categories={categoriesWithProducts}
        activeCategory={params.categoria ?? 'todos'}
        searchQuery={params.buscar ?? ''}
        heading={heading}
      />
    </>
  )
}
