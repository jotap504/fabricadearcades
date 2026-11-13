import { SITE_CONTACT, SITE_URL } from '@/lib/site'
import { cleanDescription } from '@/lib/seo'
import { createPublicClient } from '@/lib/supabase/public'
import { categoryPath } from '@/lib/catalog-seo'

// llms.txt for AI assistants and answer engines. The policy text is fixed; the
// catalog section is read from the database so prices and availability stay current.
export const revalidate = 3600

type CategoryRef = { name: string | null; slug: string | null; is_active: boolean | null }
type ProductRow = {
  id: string
  name: string
  slug: string
  short_description: string | null
  description: string | null
  base_price: number | null
  retail_markup_pct: number | null
  sort_order: number | null
  category: CategoryRef | CategoryRef[] | null
}

const arsFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

async function buildCatalogSection(): Promise<string> {
  const supabase = createPublicClient()
  if (!supabase) return ''

  try {
    const [{ data: products, error }, { data: stock }] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, slug, short_description, description, base_price, retail_markup_pct, sort_order, category:categories(name, slug, is_active)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase.from('stock_items').select('product_id, quantity').eq('stock_type', 'immediate').gt('quantity', 0),
    ])
    if (error || !products || products.length === 0) return ''

    const inStock = new Set((stock ?? []).map((item) => item.product_id as string))
    const rows = (products as unknown as ProductRow[]).filter((p) => Boolean(p.slug))
    const categoryOf = (p: ProductRow) => (Array.isArray(p.category) ? p.category[0] : p.category)

    // Ready-to-ship products first, same order as the catalog page.
    rows.sort((a, b) => Number(inStock.has(b.id)) - Number(inStock.has(a.id)) || (a.sort_order ?? 0) - (b.sort_order ?? 0))

    const productLines = rows.map((p) => {
      const price = Math.round(Number(p.base_price ?? 0) * (1 + Number(p.retail_markup_pct ?? 0) / 100))
      const parts = [
        price > 0 ? `$ ${arsFormatter.format(price)} ARS` : null,
        inStock.has(p.id) ? 'Entrega inmediata (en stock)' : 'A pedido (se fabrica a medida)',
        categoryOf(p)?.name ? `Categoría: ${categoryOf(p)!.name}` : null,
        cleanDescription(p.short_description, 200) ?? cleanDescription(p.description, 200),
      ].filter(Boolean)
      return `- [${p.name}](${SITE_URL}/productos/${encodeURIComponent(p.slug)}): ${parts.join('. ')}`
    })

    const categories = new Map<string, string>()
    for (const p of rows) {
      const category = categoryOf(p)
      if (category?.slug && category.name && category.is_active) categories.set(category.slug, category.name)
    }
    const categoryLines = [...categories].map(
      ([slug, name]) => `- [${name}](${SITE_URL}${categoryPath(slug)})`
    )

    return [
      '## Catálogo actual',
      'Precios de lista para cliente final en pesos argentinos (ARS). Precios y disponibilidad pueden cambiar; la página de cada producto tiene el dato vigente.',
      ...productLines,
      '',
      '## Categorías',
      ...categoryLines,
      '',
      '',
    ].join('\n')
  } catch (err) {
    console.error('[llms.txt] catalog query failed:', err)
    return ''
  }
}

export async function GET() {
  const address = `${SITE_CONTACT.streetAddress}, ${SITE_CONTACT.addressLocality}, Argentina`
  const catalog = await buildCatalogSection()

  const body = `# TodoArcade

> Fábrica y showroom de consolas arcade personalizadas en Devoto, Ciudad de Buenos Aires, Argentina. Fabricamos arcades, bartops, fightsticks y pedestales, con equipos listos para entregar y pedidos a medida (vinilo, colores de palancas y botones, extras). Sitio en español (es-AR). Envíos a todo el país.

## Datos de contacto
- Dirección (showroom y fábrica): ${address}
- Mapa: ${SITE_CONTACT.mapUrl}
- WhatsApp / teléfono: +54 9 11 6404-5074
- Email: ${SITE_CONTACT.email}
- Horario de atención: lunes a viernes de 9:00 a 18:00 hs
- Instagram: ${SITE_CONTACT.instagram}
- TikTok: ${SITE_CONTACT.tiktok}

## Páginas principales
- [Inicio](${SITE_URL}/): resumen de la tienda, productos destacados y cómo funciona la compra
- [Catálogo de productos](${SITE_URL}/productos): arcades, consolas, fightsticks, bartops, pedestales y accesorios, con precios en pesos argentinos (ARS)
- [Cómo comprar](${SITE_URL}/como-comprar): pasos de compra, formas de pago y plazos de fabricación
- [Envíos y entregas](${SITE_URL}/envios): retiro en fábrica y envíos a todo el país
- [Garantía y servicio técnico](${SITE_URL}/garantia): cobertura de la garantía, soporte y repuestos
- [Distribuidores y revendedores](${SITE_URL}/distribuidores): programa con precios mayoristas
- [Nosotros](${SITE_URL}/nosotros): quiénes somos
- [Contacto](${SITE_URL}/contacto): medios de contacto y ubicación
- [Términos y condiciones](${SITE_URL}/terminos)
- [Política de privacidad](${SITE_URL}/privacidad)

${catalog}## Cómo se compra
- Entrega inmediata: son equipos ya armados y en stock. Se compran tal como están (el vinilo, las palancas y los botones no se modifican). Al crear el pedido, el equipo se reserva 48 horas para clientes finales; si la reserva vence sin continuar con el pago, el stock se libera.
- A pedido (a medida): el cliente elige el vinilo (diseño), la distribución y los colores de palancas y botones para Jugador 1 y Jugador 2, y los extras compatibles con el modelo. El pedido pasa directo a producción. Si el vinilo elegido no está impreso, se genera un pedido de impresión.
- Plazos: si el vinilo está impreso, el armado ronda las 24 horas hábiles. Los pedidos a medida demoran entre 3 y 7 días hábiles según la personalización y la disponibilidad de componentes.
- Un mismo pedido puede combinar productos listos y productos a medida.
- Formas de pago: MercadoPago (tarjetas de débito/crédito y dinero en cuenta), transferencia bancaria con descuento especial, y efectivo al retirar.
- Precios mostrados en pesos argentinos (ARS). Distribuidores y revendedores registrados acceden a lista de precios mayoristas y pueden operar con cuenta corriente.

## Envíos y retiro
- Retiro por el showroom/fábrica en Devoto, CABA, sin costo de envío, coordinando día y franja horaria.
- Envíos a todo el país: en CABA y Gran Buenos Aires por moto mensajería (bultos chicos) o flete dedicado (equipos grandes), con cotización previa; al interior del país por transporte, expreso o correo.
- El costo del envío lo abona siempre el cliente en destino.
- Los equipos viajan con film alveolar de alto impacto, cantoneras reforzadas y embalaje cerrado.

## Garantía y servicio técnico
- Todos los equipos tienen 1 año de garantía oficial de fábrica.
- Cobertura: componentes electrónicos (placas controladoras, pantallas, sonido, fuentes de poder, iluminación LED), mueble y estructura, y asistencia remota por WhatsApp.
- Servicio técnico propio y stock de repuestos (botones estándar y LED, palancas Sanwa/americanas, microswitches, encoders USB, fuentes).

## Consultas
- Para consultas o coordinar una visita al showroom, escribir por WhatsApp al +54 9 11 6404-5074 o a ${SITE_CONTACT.email}.
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
