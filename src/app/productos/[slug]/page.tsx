import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { ProductDetailClient } from './ProductDetailClient'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildPageMetadata, cleanDescription } from '@/lib/seo'
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/site'
import { PRODUCT_FAQ } from '@/lib/product-faq'
import { mockProducts, mockVariants, mockStockItems, mockSupplies } from '@/lib/mock-data'
import type { DeliveryConfig, Product, ProductVariant, StockItem, SupplyInventory } from '@/lib/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

type ProductWithRuntimeSpecs = Product & { supply_families?: unknown }


type ProductPageData = {
  product: ProductWithRuntimeSpecs
  variants: ProductVariant[]
  stockItems: StockItem[]
  supplies: SupplyInventory[]
  deliveryConfig: DeliveryConfig[]
  accessories: Product[]
}

async function fetchProductData(slug: string): Promise<ProductPageData | null> {
  const supabase = createPublicClient()

  if (!supabase) {
    const product: ProductWithRuntimeSpecs | undefined = mockProducts.find((p) => p.slug === slug)
    if (!product) return null
    return {
      product,
      variants: mockVariants.filter((v) => v.product_id === product.id),
      stockItems: mockStockItems.filter((s) => s.product_id === product.id),
      supplies: mockSupplies,
      deliveryConfig: [
        { key: 'printed_business_hours', value: '24', label: null, updated_at: '' },
        { key: 'designed_business_days', value: '7', label: null, updated_at: '' },
      ],
      accessories: [],
    }
  }

  const { data: product } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (!product) return null

  const supplyClient = await createAdminClient()
  const [variants, stock, supplies, delivery, familiesConfig, accessories] = await Promise.all([
    supabase.from('product_variants').select('*').eq('product_id', product.id).eq('is_active', true).order('sort_order'),
    supabase.from('stock_items').select('*').eq('product_id', product.id),
    supplyClient.from('supply_inventory').select('*').eq('is_active', true).order('supply_type'),
    supabase.from('delivery_config').select('*'),
    supabase.from('pricing_config').select('*').eq('key', 'supply_families').maybeSingle(),
    supabase.from('products').select('*').eq('product_type', 'accessory').eq('is_active', true),
  ])

  const result: ProductWithRuntimeSpecs = product
  const familiesValue = familiesConfig.data?.value
  if (familiesValue) {
    try {
      result.supply_families = typeof familiesValue === 'string' ? JSON.parse(familiesValue) : familiesValue
    } catch {}
  }

  return {
    product: result,
    variants: variants.data ?? [],
    stockItems: stock.data ?? [],
    supplies: supplies.data ?? [],
    deliveryConfig: delivery.data ?? [],
    accessories: accessories.data ?? [],
  }
}

// Public, cookie-less product data cached for 2 minutes, so the page and its metadata
// share one set of Supabase queries instead of repeating ~9 sequential round-trips per visit.
const loadProductData = unstable_cache(fetchProductData, ['product-detail'], { revalidate: 120, tags: ['catalog'] })

export const revalidate = 120

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  const data = await loadProductData(slug)
  const product: Pick<Product, 'name' | 'short_description' | 'description' | 'meta_title' | 'meta_description' | 'images'> | null =
    data?.product ?? null

  if (!product) return { title: 'Producto no encontrado', robots: { index: false, follow: false } }

  // meta_description holds a JSON blob in this codebase; cleanDescription() ignores it.
  const description =
    cleanDescription(product.short_description) ??
    cleanDescription(product.description) ??
    `${product.name}: consola arcade fabricada en Argentina por TodoArcade. Entrega inmediata o a pedido, garantía de 1 año.`
  const title = product.meta_title?.trim() || product.name
  const image = product.images?.[0]

  return buildPageMetadata({
    title,
    description,
    path: `/productos/${slug}`,
    image: image || undefined,
    ogType: 'website',
  })
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params
  
  const data = await loadProductData(slug)
  if (!data) notFound()
  const { product, variants, stockItems, supplies, deliveryConfig, accessories } = data

  if (!product) notFound()

  // ---- Structured data (only facts present in the product record) ----
  const hasReadyStock = stockItems.some((s) => s.stock_type === 'immediate' && s.quantity > 0)
  const hasProductionStock = stockItems.some(
    (s) => (s.stock_type === 'printed' || s.stock_type === 'designed') && s.quantity > 0
  )
  const availability = hasReadyStock
    ? 'https://schema.org/InStock'
    : product.requires_production || hasProductionStock
      ? 'https://schema.org/PreOrder'
      : 'https://schema.org/OutOfStock'
  const retailPrice = Math.round(product.base_price * (1 + product.retail_markup_pct / 100))
  const productUrl = absoluteUrl(`/productos/${slug}`)
  const productImages = (product.images ?? [])
    .filter((src) => Boolean(src) && !src.startsWith('data:'))
    .map(absoluteUrl)
  const productDescription =
    cleanDescription(product.short_description, 300) ?? cleanDescription(product.description, 300)

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${productUrl}#product`,
        name: product.name,
        url: productUrl,
        ...(productDescription ? { description: productDescription } : {}),
        ...(productImages.length > 0 ? { image: productImages } : {}),
        ...(product.category?.name ? { category: product.category.name } : {}),
        sku: product.slug,
        brand: { '@type': 'Brand', name: SITE_NAME },
        manufacturer: { '@id': `${SITE_URL}/#organization` },
        ...(retailPrice > 0
          ? {
              offers: {
                '@type': 'Offer',
                url: productUrl,
                priceCurrency: 'ARS',
                price: retailPrice,
                availability,
                itemCondition: 'https://schema.org/NewCondition',
                seller: { '@id': `${SITE_URL}/#organization` },
              },
            }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Catálogo', item: absoluteUrl('/productos') },
          { '@type': 'ListItem', position: 3, name: product.name, item: productUrl },
        ],
      },
      // Mirrors the "Preguntas Frecuentes" accordion rendered on the page.
      {
        '@type': 'FAQPage',
        '@id': `${productUrl}#faq`,
        mainEntity: PRODUCT_FAQ.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  }

  return (
    <>
      <JsonLd data={productJsonLd} />
      <ProductDetailClient
        product={product}
        variants={variants ?? []}
        stockItems={stockItems ?? []}
        supplies={supplies ?? []}
        deliveryConfig={deliveryConfig ?? []}
        accessories={accessories}
      />
    </>
  )
}
