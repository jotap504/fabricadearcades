import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { ShoppingBag, CreditCard, Sparkles, Truck, CheckCircle2, ArrowRight } from 'lucide-react'

export const metadata = buildPageMetadata({
  title: 'Cómo Comprar',
  description: 'Conocé los pasos sencillos para adquirir tu arcade terminado o personalizarlo a medida.',
  path: '/como-comprar',
})

const FAQS = [
  {
    q: '¿Cuánto demora la fabricación de un arcade a medida?',
    a: 'Los productos en stock listo se entregan de inmediato. Los pedidos a medida demoran entre 3 y 7 días hábiles según personalización y disponibilidad de componentes.',
  },
  {
    q: '¿Qué formas de pago reciben?',
    a: 'Aceptamos MercadoPago con tarjetas de débito/crédito, transferencias bancarias directas y efectivo.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

export default function ComoComprarPage() {
  const steps = [
    {
      number: '01',
      icon: <ShoppingBag size={24} />,
      title: 'Elegí tu modelo',
      desc: 'Explorá nuestro catálogo de arcades clásicos, bartops, fightsticks o pedestales. Podés optar por stock listo con Entrega Inmediata o productos A Pedido.',
    },
    {
      number: '02',
      icon: <Sparkles size={24} />,
      title: 'Personalizá a tu gusto',
      desc: 'En modelos a pedido podés seleccionar el diseño del vinilo, la distribución y colores de palancas y botones para Jugador 1 y 2, y agregar extras.',
    },
    {
      number: '03',
      icon: <CreditCard size={24} />,
      title: 'Seleccioná el pago',
      desc: 'Aceptamos MercadoPago (tarjetas, dinero en cuenta), transferencia bancaria con descuento especial y efectivo al retirar.',
    },
    {
      number: '04',
      icon: <Truck size={24} />,
      title: 'Entrega o Envío',
      desc: 'Podés retirar personalmente por nuestro showroom/fábrica en Devoto (CABA) o solicitar envío a todo el país (flete/transporte con pago en destino).',
    },
  ]

  return (
    <div className="container" style={{ padding: 'var(--space-12) var(--space-4)', maxWidth: '900px' }}>
      <JsonLd data={faqJsonLd} />
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
          Cómo Comprar
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.125rem', maxWidth: 650, margin: '0 auto' }}>
          Comprar tu arcade en TodoArcade es fácil, rápido y seguro.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-10)' }}>
        {steps.map((step) => (
          <div key={step.number} className="card card-body" style={{ padding: 'var(--space-6)', position: 'relative' }}>
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                color: 'var(--color-cyan)',
                opacity: 0.25,
                position: 'absolute',
                top: 16,
                right: 20,
              }}
            >
              {step.number}
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-cyan-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-cyan)',
                marginBottom: 'var(--space-4)',
              }}
            >
              {step.icon}
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>{step.title}</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>{step.desc}</p>
          </div>
        ))}
      </div>

      <div className="card card-body" style={{ padding: 'var(--space-8)', marginBottom: 'var(--space-10)' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--color-magenta)' }}>
          Preguntas Frecuentes de Compra
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {FAQS.map((item) => (
            <div key={item.q}>
              <h3 style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: '1rem' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--color-green)' }} /> {item.q}
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', paddingLeft: 22 }}>
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Link href="/productos" className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
          Ir a la Tienda de Arcades <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  )
}
