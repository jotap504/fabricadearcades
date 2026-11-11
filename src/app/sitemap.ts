import type { MetadataRoute } from 'next'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { SITE_URL } from '@/lib/site'
import { mockProducts } from '@/lib/mock-data'

export const revalidate = 3600

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

const STATIC_PAGES: Array<{
  path: string
  priority: number
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
}> = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/productos', priority: 0.9, changeFrequency: 'daily' },
  { path: '/como-comprar', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/envios', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/garantia', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/nosotros', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contacto', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/distribuidores', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/privacidad', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/terminos', priority: 0.2, changeFrequency: 'yearly' },
]

async function getProductEntries(): Promise<MetadataRoute.Sitemap> {
  if (!isSupabaseConfigured) {
    return mockProducts
      .filter((p) => p.is_active)
      .map((p) => ({
        url: `${SITE_URL}/productos/${p.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
  }

  try {
    // Cookie-less anon client: the sitemap must not depend on a request/session.
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { data, error } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error || !data) {
      console.error('[sitemap] products query failed:', error?.message)
      return []
    }

    return data
      .filter((p): p is { slug: string; updated_at: string | null } => Boolean(p.slug))
      .map((p) => ({
        url: `${SITE_URL}/productos/${encodeURIComponent(p.slug)}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
  } catch (err) {
    console.error('[sitemap] unexpected error:', err)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map(({ path, priority, changeFrequency }) => ({
    url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  }))

  return [...staticEntries, ...(await getProductEntries())]
}
