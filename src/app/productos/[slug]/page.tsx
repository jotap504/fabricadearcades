import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ProductDetailClient } from './ProductDetailClient'
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
  
  let product = null

  if (isSupabaseConfigured) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('products')
      .select('name, short_description, meta_title, meta_description')
      .eq('slug', slug)
      .single()
    product = data
  } else {
    product = mockProducts.find(p => p.slug === slug)
  }

  if (!product) return { title: 'Producto no encontrado' }

  return {
    title: product.meta_title ?? product.name,
    description: product.meta_description ?? product.short_description ?? '',
  }
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
    product = mockProducts.find(p => p.slug === slug)
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

  return (
    <ProductDetailClient
      product={product}
      variants={variants ?? []}
      stockItems={stockItems ?? []}
      supplies={supplies ?? []}
      deliveryConfig={deliveryConfig ?? []}
      accessories={accessories}
    />
  )
}
