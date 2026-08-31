import Link from 'next/link'
import fs from 'node:fs'
import path from 'node:path'
import { ArrowRight, Zap, Clock, Palette, Shield, Gamepad2, Wrench } from 'lucide-react'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/products/ProductCard'
import type { Product } from '@/lib/types'
import { mockProducts, mockCategories } from '@/lib/mock-data'
import { AnimatedMarqueeHero } from '@/components/ui/hero-3'

const getCategoryIconLarge = (slug: string) => {
  switch (slug) {
    case 'arcades':
      return <Gamepad2 size={40} className="text-primary" />
    case 'accesorios':
      return <Wrench size={40} className="text-primary" />
    default:
      return <Gamepad2 size={40} className="text-primary" />
  }
}


const HERO_IMAGES = [
  "/hero-arcade-1.jpg",
  "/hero-arcade-2.jpg",
  "/hero-arcade-3.jpg",
  "/hero-arcade-4.jpg",
  "/hero-arcade-5.jpg"
]

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

function getConsoleLogos() {
  const logosDir = path.join(process.cwd(), 'public', 'logos')
  try {
    return fs
      .readdirSync(logosDir)
      .filter((file) => /\.(png|jpe?g|webp|svg)$/i.test(file))
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((file) => ({
        name: path.parse(file).name.replace(/[-_]/g, ' '),
        src: `/logos/${file.split(path.sep).map(encodeURIComponent).join('/')}`,
      }))
  } catch {
    return []
  }
}

type ProductWithStockRows = Product & {
  stock_items?: Array<{
    id?: string
    stock_type: string
    quantity: number
    vinyl_supply_id?: string | null
    configuration?: { vinyl_supply_id?: string | null } | null
  }> | null
  vinyl_options?: Array<{ id: string; name: string; image_url: string | null; color_label?: string | null }>
}

type VinylOptionRow = NonNullable<ProductWithStockRows['vinyl_options']>[number]

function pickVinylOptions(ids: string[], vinylById: Map<string, VinylOptionRow>): VinylOptionRow[] {
  const options: VinylOptionRow[] = []
  for (const id of ids) {
    const vinyl = vinylById.get(id)
    if (vinyl) options.push(vinyl)
  }
  return options
}

function withStockSummary(product: ProductWithStockRows): Product {
  const rows = product.stock_items ?? []
  const immediate = rows
    .filter((item) => item.stock_type === 'immediate')
    .reduce((sum, item) => sum + item.quantity, 0)
  const printed = rows
    .filter((item) => item.stock_type === 'printed')
    .reduce((sum, item) => sum + item.quantity, 0)
  const designed = rows
    .filter((item) => item.stock_type === 'designed')
    .reduce((sum, item) => sum + item.quantity, 0)

  return {
    ...product,
    stock_summary: {
      immediate,
      printed,
      designed,
      total: immediate + printed + designed,
      availability: immediate > 0 ? 'immediate' : product.requires_production ? 'designed' : printed > 0 ? 'printed' : 'none',
    },
  }
}

export default async function HomePage() {
  const supabase = isSupabaseConfigured ? await createClient() : null
  const consoleLogos = getConsoleLogos()


  // Fetch featured products
  const { data: products } = supabase
    ? await supabase
        .from('products')
        .select('*, category:categories(*), stock_items(id, stock_type, quantity, vinyl_supply_id, configuration)')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('sort_order', { ascending: true })
        .limit(6)
    : { data: mockProducts.filter(p => p.is_featured) }

  const featuredProductsBase = (products ?? []) as ProductWithStockRows[]
  const featuredVinylIds = Array.from(new Set(featuredProductsBase.flatMap((product) => {
    const stockVinylIds = (product.stock_items ?? [])
      .filter((item) => item.stock_type === 'immediate' && item.quantity > 0 && (item.vinyl_supply_id || item.configuration?.vinyl_supply_id))
      .map((item) => (item.vinyl_supply_id || item.configuration?.vinyl_supply_id) as string)
    try {
      const meta = JSON.parse(product.meta_description || '{}')
      const catalogVinylIds = Array.isArray(meta.vinyl_supply_ids) ? meta.vinyl_supply_ids : []
      return [...stockVinylIds, ...catalogVinylIds]
    } catch {
      return stockVinylIds
    }
  })))
  const adminClient = supabase && featuredVinylIds.length > 0 ? await createAdminClient() : null
  const { data: featuredVinyls } = adminClient
    ? await adminClient
        .from('supply_inventory')
        .select('id, name, image_url, color_label')
        .in('id', featuredVinylIds)
        .eq('supply_type', 'vinyl')
        .eq('is_active', true)
    : { data: [] }
  const featuredVinylById = new Map<string, VinylOptionRow>(
    ((featuredVinyls ?? []) as VinylOptionRow[]).map((vinyl) => [vinyl.id, vinyl])
  )

  const featuredProducts = featuredProductsBase
    .map((product) => {
      const stockVinylIds = (product.stock_items ?? [])
        .filter((item) => item.stock_type === 'immediate' && item.quantity > 0 && (item.vinyl_supply_id || item.configuration?.vinyl_supply_id))
        .map((item) => (item.vinyl_supply_id || item.configuration?.vinyl_supply_id) as string)
      try {
        const meta = JSON.parse(product.meta_description || '{}')
        const catalogVinylIds = Array.isArray(meta.vinyl_supply_ids) ? meta.vinyl_supply_ids : []
        const coverVinylId = catalogVinylIds.find((id: string) => {
          const vinyl = featuredVinylById.get(id)
          return vinyl?.image_url && product.images?.[0] === vinyl.image_url
        })
        const orderedVinylIds = Array.from(
          new Set([
            ...stockVinylIds,
            ...(stockVinylIds.length === 0 && coverVinylId ? [coverVinylId] : []),
            ...catalogVinylIds,
          ])
        )
        return {
          ...product,
          vinyl_options: pickVinylOptions(orderedVinylIds, featuredVinylById),
        }
      } catch {
        return {
          ...product,
          vinyl_options: pickVinylOptions(stockVinylIds, featuredVinylById),
        }
      }
    })
    .map(withStockSummary)
    .sort((a, b) => (a.stock_summary?.availability === 'immediate' ? 0 : 1) - (b.stock_summary?.availability === 'immediate' ? 0 : 1) || a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'es'))

  // Fetch all categories
  const { data: categories } = supabase
    ? await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
    : { data: mockCategories }

  return (
    <>
      {/* HERO */}
      <AnimatedMarqueeHero
        tagline="FÁBRICA DE ARCADES — Showroom en Devoto, CABA"
        title={
          <>
            Consolas Arcade
            <br />
            A Tu Medida
          </>
        }
        description="Equipos multijuegos premium fabricados en Argentina. Elegí tu gabinete, vinilos de diseño, colores de palancas y botones. Envío express."
        ctaText="Ver Catálogo"
        images={HERO_IMAGES}
        className="min-h-[80vh]"
      />

      {/* FEATURES */}
      <section className="section-sm" style={{ background: 'var(--color-bg-2)' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-5)',
            }}
          >
            {[
              {
                icon: <Zap size={22} />,
                color: 'cyan',
                title: 'Entrega inmediata',
                desc: 'Stock listo para entregar el mismo día en Buenos Aires',
              },
              {
                icon: <Clock size={22} />,
                color: 'amber',
                title: '24 hs hábiles',
                desc: 'Si tenemos el vinilo impreso, armamos tu arcade rápido',
              },
              {
                icon: <Palette size={22} />,
                color: 'magenta',
                title: '100% personalizable',
                desc: 'Elegí gabinete, pantalla, colores y temática',
              },
              {
                icon: <Shield size={22} />,
                color: 'green',
                title: 'Garantía 1 año',
                desc: 'Todos nuestros arcades con garantía de fábrica',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="card card-body"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 'var(--space-4)',
                }}
              >
                <div
                  className={`stat-card-icon ${feature.color}`}
                  style={{ flexShrink: 0 }}
                >
                  {feature.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 4,
                      fontSize: '0.9375rem',
                    }}
                  >
                    {feature.title}
                  </div>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {feature.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      {featuredProducts.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-header">
              <div className="section-divider" />
              <h2 className="section-title">
                <span className="text-gradient-cyan">Productos</span> destacados
              </h2>
              <p className="section-subtitle">
                Los arcades más elegidos por nuestros clientes, listos para personalizar
              </p>
            </div>
            <div className="product-grid">
              {featuredProducts.map((product: Product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 'var(--space-10)' }}>
              <Link href="/productos" className="btn btn-outline btn-lg" id="home-view-all-btn">
                Ver todo el catálogo <ArrowRight size={20} />
              </Link>
            </div>

            {consoleLogos.length > 0 && (
              <div className="console-logo-marquee" aria-label="Logos de consolas y sistemas incluidos">
                <div className="console-logo-marquee-caption">
                  Sistemas, consolas y clásicos compatibles
                </div>
                <div className="console-logo-marquee-window">
                  <div className="console-logo-marquee-track">
                    {[...consoleLogos, ...consoleLogos].map((logo, index) => (
                      <div className="console-logo-pill" key={`${logo.src}-${index}`}>
                        <img src={logo.src} alt={logo.name} loading="lazy" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CATEGORIES */}
      {categories && categories.length > 0 && (
        <section
          className="section-sm"
          style={{ background: 'var(--color-bg-2)' }}
        >
          <div className="container">
            <div className="section-header" style={{ marginBottom: 'var(--space-6)' }}>
              <h2 className="section-title" style={{ fontSize: '1.5rem' }}>
                Explorá por categoría
              </h2>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 'var(--space-4)',
              }}
            >
              {categories.map((cat: any) => (
                <Link
                  key={cat.id}
                  href={`/productos?categoria=${cat.slug}`}
                  className="card card-hover card-body glass-hover"
                  style={{
                    textAlign: 'center',
                    gap: 'var(--space-3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: 'var(--space-6)',
                    paddingBottom: 'var(--space-6)',
                    textDecoration: 'none',
                  }}
                  id={`category-${cat.slug}`}
                >
                  <div style={{ display: 'flex', height: '48px', alignItems: 'center', justifyContent: 'center' }}>
                    {getCategoryIconLarge(cat.slug)}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem', marginTop: 'var(--space-2)' }}>{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW TO BUY */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-divider" />
            <h2 className="section-title">Cómo funciona la compra</h2>
            <p className="section-subtitle">
              Podés elegir un equipo listo para entregar o iniciar un pedido a medida con tus componentes y vinilo.
            </p>
          </div>

          <div className="process-grid">
            {[
              {
                step: '1',
                title: 'Elegí modalidad',
                desc: 'Si hay stock listo, comprás ese equipo tal como está. Si querés personalizar, iniciás un pedido a medida.',
              },
              {
                step: '2',
                title: 'Personalizá si hace falta',
                desc: 'En pedidos a medida elegís vinilo, palancas, botones y adicionales compatibles con el modelo.',
              },
              {
                step: '3',
                title: 'Reservamos insumos',
                desc: 'Para clientes finales la reserva dura 48 hs. Distribuidores habilitados pueden usar cuenta corriente.',
              },
              {
                step: '4',
                title: 'Producción y entrega',
                desc: 'Si el vinilo no está impreso, se genera pedido de impresión. Luego pasa a armado y control final.',
              },
            ].map((item) => (
              <div key={item.step} className="process-card">
                <span>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA DISTRIBUTOR */}
      <section className="section">
        <div className="container">
          <div
            style={{
              background:
                'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-2) 100%)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-10) var(--space-8)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  'radial-gradient(ellipse at 50% 0%, rgba(255,0,229,0.08) 0%, transparent 60%)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <span
                className="badge badge-distributor"
                style={{ fontSize: '0.8125rem', marginBottom: 'var(--space-4)', display: 'inline-flex' }}
              >
                💼 Para revendedores
              </span>
              <h2
                className="section-title"
                style={{ marginBottom: 'var(--space-4)' }}
              >
                Precio especial para{' '}
                <span className="text-gradient-neon">distribuidores</span>
              </h2>
              <p
                className="section-subtitle"
                style={{ margin: '0 auto var(--space-8)', maxWidth: 500 }}
              >
                Si sos revendedor o distribuidor, registrate y accedé a nuestra lista
                de precios mayoristas sin cargo adicional.
              </p>
              <Link
                href="/registro-distribuidor"
                className="btn btn-secondary btn-lg"
                id="home-distributor-cta"
              >
                Quiero ser distribuidor
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
