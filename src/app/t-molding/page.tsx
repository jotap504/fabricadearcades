import fs from 'fs'
import path from 'path'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, MessageCircle, Ruler } from 'lucide-react'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildPageMetadata } from '@/lib/seo'
import { SITE_CONTACT, SITE_URL, absoluteUrl } from '@/lib/site'
import { createPublicClient } from '@/lib/supabase/public'
import { categoryPath } from '@/lib/catalog-seo'
import { formatPrice } from '@/lib/types'

// Guide + landing for "T-molding" / "tapacanto en T". Static, refreshed so the
// product list picks up price and activation changes made in the admin.
export const revalidate = 600

const PAGE_PATH = '/t-molding'
const CATEGORY_SLUG = 't-molding'
const PAGE_TITLE = 'T-Molding (Tapacanto en T) para Arcade: Medidas y Cómo Colocarlo'
const PAGE_DESCRIPTION =
  'T-molding o tapacanto en T negro de 16 mm y 18,5 mm para muebles arcade. Guía paso a paso para hacer la ranura con fresa en T y colocarlo. Envíos a todo el país.'

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: PAGE_PATH,
})

const WHATSAPP_URL = `https://wa.me/${SITE_CONTACT.telephone.replace('+', '')}?text=${encodeURIComponent(
  'Hola, quiero consultar por T-molding (tapacanto en T).'
)}`

const SIZES = [
  { width: '16 mm', board: 'Tableros de 15 o 16 mm de espesor', color: 'Negro' },
  { width: '18,5 mm', board: 'Tableros de 18 mm de espesor', color: 'Negro' },
]

const STEPS: Array<{ name: string; text: string }> = [
  {
    name: 'Elegí la medida según el espesor del tablero',
    text: 'El T-molding tiene que cubrir todo el canto. Usá el de 16 mm para tableros de 15 o 16 mm y el de 18,5 mm para tableros de 18 mm.',
  },
  {
    name: 'Prepará la fresadora con la fresa en T',
    text: 'La ranura se hace con una fresadora (router) y una fresa en T, también llamada fresa de ranurar o de disco. El rodamiento de la fresa apoya contra el canto y mantiene la profundidad constante en todo el recorrido.',
  },
  {
    name: 'Centrá la ranura y probá en un recorte',
    text: 'Regulá la altura de la fresa para que el corte quede en el centro del espesor del tablero. Antes de trabajar sobre el mueble, hacé una pasada de prueba en un recorte del mismo material y verificá que el T-molding entre firme, a presión, y que sobresalga parejo de los dos lados.',
  },
  {
    name: 'Fresá todo el contorno',
    text: 'Apoyá bien la base de la fresadora sobre la cara del tablero y avanzá a velocidad constante, con el rodamiento siempre contra el canto. Trabajá con el tablero firme, antiparras y protección auditiva.',
  },
  {
    name: 'Limpiá la ranura',
    text: 'Sacá el polvo y la viruta de la ranura con aire o un pincel. Si queda material adentro, la espina del T-molding no asienta hasta el fondo.',
  },
  {
    name: 'Colocá el T-molding',
    text: 'Empezá por una zona que no quede a la vista, como la parte inferior o trasera del mueble. Presioná la espina dentro de la ranura y asentala con un martillo de goma, avanzando de a tramos cortos.',
  },
  {
    name: 'Resolvé curvas y esquinas',
    text: 'En curvas cerradas y esquinas, hacé pequeños cortes en V en la espina (nunca en la cara visible) para que el perfil acompañe el radio sin arrugarse. Un poco de calor suave, con secador o pistola de calor, lo vuelve más flexible.',
  },
  {
    name: 'Cortá el sobrante y uní las puntas',
    text: 'Al completar la vuelta, cortá el sobrante al ras con un cutter y uní las dos puntas a tope. El perfil se sostiene a presión; si querés, podés reforzar la unión con una gota de adhesivo.',
  },
]

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: '¿Qué es el T-molding?',
    a: 'Es un perfil plástico flexible con forma de T que se usa para terminar los cantos de un tablero. La espina central se inserta a presión en una ranura fresada en el canto; la parte visible protege el borde de golpes y le da al mueble la terminación clásica de las máquinas arcade.',
  },
  {
    q: '¿T-molding y tapacanto en T son lo mismo?',
    a: 'Sí. T-molding es el nombre en inglés; en Argentina también se lo conoce como tapacanto en T, perfil en T o canto en T.',
  },
  {
    q: '¿Qué medida de T-molding necesito?',
    a: 'Depende del espesor del tablero: 16 mm para tableros de 15 o 16 mm, y 18,5 mm para tableros de 18 mm. Los dos los tenemos en color negro.',
  },
  {
    q: '¿Se puede colocar sin fresadora?',
    a: 'El T-molding necesita una ranura pareja y centrada en todo el canto. La forma de lograrla es con una fresadora y una fresa en T; con otras herramientas es difícil que quede derecha y a la profundidad correcta.',
  },
  {
    q: '¿Cuánto T-molding tengo que comprar?',
    a: 'Medí el largo de todos los cantos que van a quedar a la vista y sumá alrededor de un 10 % extra para las uniones, las curvas y los recortes.',
  },
  {
    q: '¿Hacen envíos de T-molding?',
    a: 'Sí. Se puede retirar por nuestra fábrica en Devoto (CABA) o enviarlo a todo el país. El envío lo abona el cliente en destino.',
  },
]

type ProductRow = {
  name: string
  slug: string
  short_description: string | null
  base_price: number | null
  retail_markup_pct: number | null
  images: string[] | null
}

async function getTMoldingProducts(): Promise<ProductRow[]> {
  const supabase = createPublicClient()
  if (!supabase) return []
  try {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', CATEGORY_SLUG)
      .eq('is_active', true)
      .maybeSingle()
    if (!category) return []
    const { data } = await supabase
      .from('products')
      .select('name, slug, short_description, base_price, retail_markup_pct, images')
      .eq('category_id', category.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    return (data ?? []) as ProductRow[]
  } catch (err) {
    console.error('[t-molding] products query failed:', err)
    return []
  }
}

/** Optional photo of the T-slot cutter: shown only when the file has been added. */
function getCutterPhoto(): string | null {
  const dir = path.join(process.cwd(), 'public', 't-molding')
  for (const file of ['fresa-en-t.jpg', 'fresa-en-t.jpeg', 'fresa-en-t.png', 'fresa-en-t.webp']) {
    try {
      if (fs.existsSync(path.join(dir, file))) return `/t-molding/${file}`
    } catch {
      return null
    }
  }
  return null
}

const sectionTitle = { fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-4)' } as const
const bodyText = { color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: 1.7 } as const

export default async function TMoldingPage() {
  const products = await getTMoldingProducts()
  const cutterPhoto = getCutterPhoto()
  const pageUrl = absoluteUrl(PAGE_PATH)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'HowTo',
        '@id': `${pageUrl}#howto`,
        name: 'Cómo hacer la ranura y colocar T-molding (tapacanto en T)',
        description: PAGE_DESCRIPTION,
        inLanguage: 'es-AR',
        ...(cutterPhoto ? { image: absoluteUrl(cutterPhoto) } : {}),
        tool: [
          { '@type': 'HowToTool', name: 'Fresadora (router)' },
          { '@type': 'HowToTool', name: 'Fresa en T (fresa de ranurar con rodamiento)' },
          { '@type': 'HowToTool', name: 'Martillo de goma' },
          { '@type': 'HowToTool', name: 'Cutter' },
        ],
        supply: [{ '@type': 'HowToSupply', name: 'T-molding (tapacanto en T) de 16 mm o 18,5 mm' }],
        step: STEPS.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.name,
          text: step.text,
          url: `${pageUrl}#paso-${index + 1}`,
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        mainEntity: FAQ.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'T-Molding', item: pageUrl },
        ],
      },
    ],
  }

  return (
    <div className="container" style={{ padding: 'var(--space-12) var(--space-4)', maxWidth: '900px' }}>
      <JsonLd data={jsonLd} />

      <header style={{ marginBottom: 'var(--space-10)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
          T-Molding: tapacanto en T para arcade
        </h1>
        <p style={{ ...bodyText, fontSize: '1.125rem', maxWidth: 700 }}>
          El T-molding, o tapacanto en T, es el perfil plástico que protege los cantos de un mueble arcade y le da su
          terminación clásica. Lo tenemos en negro, en 16 mm y 18,5 mm de ancho. Acá te contamos qué medida elegir y
          cómo hacer la ranura para colocarlo.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
            <MessageCircle size={18} aria-hidden="true" /> Consultar por WhatsApp
          </a>
          <a href="#como-colocar" className="btn btn-secondary btn-lg" style={{ display: 'inline-flex' }}>
            Ver cómo se coloca <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </header>

      <section aria-labelledby="medidas" style={{ marginBottom: 'var(--space-10)' }}>
        <h2 id="medidas" style={sectionTitle}>Medidas disponibles</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
          {SIZES.map((size) => (
            <div key={size.width} className="card card-body" style={{ padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-cyan)', marginBottom: 'var(--space-2)' }}>
                <Ruler size={20} aria-hidden="true" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>T-Molding {size.width}</h3>
              </div>
              <p style={{ ...bodyText, fontSize: '0.9375rem' }}>{size.board}.</p>
              <p style={{ ...bodyText, fontSize: '0.9375rem' }}>Color: {size.color}.</p>
            </div>
          ))}
        </div>

        {products.length > 0 && (
          <div style={{ marginTop: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Comprar online</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {products.map((product) => {
                const price = Math.round(Number(product.base_price ?? 0) * (1 + Number(product.retail_markup_pct ?? 0) / 100))
                return (
                  <li key={product.slug}>
                    <Link
                      href={`/productos/${product.slug}`}
                      className="card card-body"
                      style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', textDecoration: 'none', color: 'inherit' }}
                    >
                      <span style={{ fontWeight: 600 }}>{product.name}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-cyan)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {price > 0 ? formatPrice(price) : 'Ver producto'} <ArrowRight size={16} aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <p style={{ marginTop: 'var(--space-3)' }}>
              <Link href={categoryPath(CATEGORY_SLUG)} className="footer-link" style={{ padding: 0 }}>
                Ver todo el T-molding en el catálogo
              </Link>
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="como-colocar" style={{ marginBottom: 'var(--space-10)' }}>
        <h2 id="como-colocar" style={sectionTitle}>Cómo hacer la ranura y colocar el T-molding</h2>
        <p style={{ ...bodyText, marginBottom: 'var(--space-6)' }}>
          El T-molding no se pega: entra a presión en una ranura fina fresada a lo largo del canto. Para que quede
          firme y parejo, la ranura tiene que estar centrada y tener la misma profundidad en todo el recorrido. Eso se
          logra con una fresadora y una fresa en T.
        </p>

        {cutterPhoto && (
          <figure style={{ margin: '0 0 var(--space-6)' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <Image
                src={cutterPhoto}
                alt="Fresa en T para hacer la ranura del T-molding en el canto del tablero"
                fill
                sizes="(max-width: 900px) 100vw, 868px"
                style={{ objectFit: 'contain' }}
              />
            </div>
            <figcaption style={{ ...bodyText, fontSize: '0.875rem', marginTop: 'var(--space-2)' }}>
              Fresa en T: el disco corta la ranura y el rodamiento apoya contra el canto para mantener la profundidad.
            </figcaption>
          </figure>
        )}

        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {STEPS.map((step, index) => (
            <li key={step.name} id={`paso-${index + 1}`} className="card card-body" style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
              <span
                aria-hidden="true"
                style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: 'var(--color-cyan-dim)', color: 'var(--color-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}
              >
                {index + 1}
              </span>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>{step.name}</h3>
                <p style={{ ...bodyText, fontSize: '0.9375rem' }}>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="consejos" className="card card-body" style={{ padding: 'var(--space-8)', marginBottom: 'var(--space-10)' }}>
        <h2 id="consejos" style={{ ...sectionTitle, color: 'var(--color-cyan)', fontSize: '1.35rem' }}>Consejos para que quede prolijo</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[
            'Hacé siempre una prueba en un recorte del mismo tablero antes de fresar el mueble.',
            'Fresá la ranura antes de armar el mueble: con las piezas sueltas es más fácil apoyar la fresadora.',
            'Si el tablero lleva vinilo o laminado, colocá el T-molding al final para que tape el borde del vinilo.',
            'Calculá los metros midiendo todos los cantos a la vista y sumando alrededor de un 10 % extra.',
          ].map((tip) => (
            <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
              <CheckCircle2 size={18} aria-hidden="true" style={{ color: 'var(--color-green)', flexShrink: 0, marginTop: 3 }} />
              <span style={{ ...bodyText, fontSize: '0.9375rem' }}>{tip}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="preguntas" style={{ marginBottom: 'var(--space-10)' }}>
        <h2 id="preguntas" style={sectionTitle}>Preguntas frecuentes sobre T-molding</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {FAQ.map((item) => (
            <details key={item.q} className="card card-body" style={{ padding: 'var(--space-4) var(--space-5)' }}>
              <summary style={{ fontWeight: 600, cursor: 'pointer' }}>{item.q}</summary>
              <p style={{ ...bodyText, fontSize: '0.9375rem', marginTop: 'var(--space-3)' }}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div style={{ textAlign: 'center' }}>
        <p style={{ ...bodyText, marginBottom: 'var(--space-4)' }}>
          ¿Dudas con la medida o con la cantidad que necesitás? Escribinos y te ayudamos.
        </p>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
          <MessageCircle size={18} aria-hidden="true" /> Consultar por WhatsApp
        </a>
      </div>
    </div>
  )
}
