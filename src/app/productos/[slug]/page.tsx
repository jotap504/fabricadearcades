import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ProductDetailClient } from './ProductDetailClient'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildPageMetadata, cleanDescription } from '@/lib/seo'
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/site'
import { mockProducts, mockVariants, mockStockItems, mockSupplies } from '@/lib/mock-data'
import type { DeliveryConfig, Product, ProductVariant, StockItem, SupplyInventory } from '@/lib/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

type ProductWithRuntimeSpecs = Product & { supply_families?: unknown }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  let product: Pick<Product, 'name' | 'short_description' | 'description' | 'meta_title' | 'meta_description' | 'images'> | null = null

  if (isSupabaseConfigured) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('products')
      .select('name, short_description, description, meta_title, meta_description, images')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
    product = data
  } else {
    product = mockProducts.find(p => p.slug === slug) ?? null
  }

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
  
  let product: ProductWithRuntimeSpecs | null = null
  let variants: ProductVariant[] = []
  let stockItems: StockItem[] = []
  let supplies: SupplyInventory[] = []
  let deliveryConfig: DeliveryConfig[] = []
  let accessories: Product[] = []

  if (isSupabaseConfigured) {
    const supabase = await createClient()
    const { data: p } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    
    product = p

    if (p) {
      const { data: v } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', p.id)
        .eq('is_active', true)
        .order('sort_order')
      variants = v ?? []

      const { data: s } = await supabase
        .from('stock_items')
        .select('*')
        .eq('product_id', p.id)
      stockItems = s ?? []

      const supplyClient = await createAdminClient()
      const { data: sup } = await supplyClient
        .from('supply_inventory')
        .select('*')
        .eq('is_active', true)
        .order('supply_type')
      supplies = sup ?? []

      const { data: d } = await supabase.from('delivery_config').select('*')
      deliveryConfig = d ?? []

      const { data: fConfig } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('key', 'supply_families')
        .single()
      
      if (fConfig?.value) {
        try {
          if (product) {
            product.supply_families = typeof fConfig.value === 'string' ? JSON.parse(fConfig.value) : fConfig.value
          }
        } catch {}
      }

      const { data: acc } = await supabase
        .from('products')
        .select('*')
        .eq('product_type', 'accessory')
        .eq('is_active', true)
      accessories = acc ?? []
    }
  } else {
    product = mockProducts.find(p => p.slug === slug) ?? null
    if (product) {
      const mockProduct = product
      variants = mockVariants.filter(v => v.product_id === mockProduct.id)
      stockItems = mockStockItems.filter(s => s.product_id === mockProduct.id)
      supplies = mockSupplies
      deliveryConfig = [
        { key: 'printed_business_hours', value: '24', label: null, updated_at: '' },
        { key: 'designed_business_days', value: '7', label: null, updated_at: '' }
      ]
    }
  }

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
  const productImages = (product.images ?? []).filter(Boolean).map(absoluteUrl)
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
