import Link from 'next/link'
import { ArrowLeft, Mail, MessageCircle } from 'lucide-react'
import { buildPageMetadata } from '@/lib/seo'
import { SITE_CONTACT } from '@/lib/site'

export const metadata = buildPageMetadata({
  title: 'Devoluciones y Botón de Arrepentimiento',
  description:
    'Cómo ejercer el derecho de arrepentimiento en TodoArcade: 10 días corridos, sin costo para vos. Condiciones de devolución para productos de entrega inmediata y a medida.',
  path: '/devoluciones',
})

const REVOCATION_MESSAGE =
  'Hola, quiero ejercer mi derecho de arrepentimiento.\nNombre y apellido: \nNúmero de pedido: \nEmail con el que compré: '
const WHATSAPP_URL = `https://wa.me/${SITE_CONTACT.telephone.replace('+', '')}?text=${encodeURIComponent(REVOCATION_MESSAGE)}`
const MAILTO_URL = `mailto:${SITE_CONTACT.email}?subject=${encodeURIComponent('Botón de arrepentimiento')}&body=${encodeURIComponent(REVOCATION_MESSAGE)}`

const headingStyle = {
  fontSize: '1.25rem',
  fontWeight: 700,
  color: 'var(--color-cyan)',
  marginBottom: 'var(--space-2)',
} as const

const textStyle = {
  color: 'var(--color-text-secondary)',
  lineHeight: 1.7,
  fontSize: '0.9375rem',
} as const

export default function DevolucionesPage() {
  return (
    <div className="container" style={{ padding: 'var(--space-12) var(--space-4)', maxWidth: '800px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', gap: 6, marginBottom: 'var(--space-4)' }}>
          <ArrowLeft size={16} /> Volver al inicio
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
          Devoluciones y botón de arrepentimiento
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
          Última actualización: Noviembre 2026
        </p>
      </div>

      <div className="card card-body" style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <section>
          <h2 style={headingStyle}>Botón de arrepentimiento</h2>
          <p style={textStyle}>
            Si compraste en <strong>todoarcade.com.ar</strong> y te arrepentís, podés revocar la compra sin dar explicaciones dentro de los{' '}
            <strong>10 días corridos</strong>, contados desde que recibís el producto o desde que se celebró el contrato, lo que ocurra último.
            Es un derecho que te da la Ley de Defensa del Consumidor (artículo 34 de la Ley 24.240 y artículos 1110 y siguientes del Código Civil y Comercial).
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              id="revocation-whatsapp-btn"
            >
              <MessageCircle size={18} aria-hidden="true" />
              Solicitar arrepentimiento por WhatsApp
            </a>
            <a href={MAILTO_URL} className="btn btn-ghost" id="revocation-email-btn">
              <Mail size={18} aria-hidden="true" />
              Solicitar por email
            </a>
          </div>
        </section>

        <section>
          <h2 style={headingStyle}>Cómo pedirlo</h2>
          <p style={textStyle}>
            Usá cualquiera de los dos botones de arriba: se abre un mensaje con los datos que necesitamos. Completá tu{' '}
            <strong>nombre y apellido</strong>, el <strong>número de pedido</strong> y el <strong>email con el que compraste</strong>. Con esa
            información registramos tu solicitud y te confirmamos su recepción. Conservá esa confirmación como constancia.
          </p>
        </section>

        <section>
          <h2 style={headingStyle}>Productos de entrega inmediata</h2>
          <p style={textStyle}>
            Los equipos ya armados y en stock se pueden devolver dentro del plazo de 10 días corridos. Para facilitar la devolución, conservá el
            embalaje original si lo tenés. Coordinamos con vos la forma de retiro o de entrega del producto.
          </p>
        </section>

        <section>
          <h2 style={headingStyle}>Pedidos a medida</h2>
          <p style={textStyle}>
            Los pedidos a medida se fabrican según tus especificaciones (vinilo, colores de palancas y botones, extras). El Código Civil y
            Comercial (artículo 1116, inciso c) excluye del derecho de revocación a los productos confeccionados conforme a las
            especificaciones del consumidor o claramente personalizados. Si querés cancelar o te arrepentís de un pedido a medida, escribinos
            lo antes posible: lo resolvemos con vos caso por caso.
          </p>
        </section>

        <section>
          <h2 style={headingStyle}>Reintegro y costos</h2>
          <p style={textStyle}>
            Ejercer el derecho de arrepentimiento no te genera ningún costo: los gastos de la devolución corren por nuestra cuenta. Te
            reintegramos el importe abonado por el mismo medio de pago que usaste.
          </p>
        </section>

        <section>
          <h2 style={headingStyle}>Si el producto tiene una falla</h2>
          <p style={textStyle}>
            La devolución por arrepentimiento es independiente de la garantía. Si tu equipo llegó con un defecto o dejó de funcionar, mirá las
            condiciones en{' '}
            <Link href="/garantia" style={{ color: 'var(--color-cyan)', textDecoration: 'underline' }}>
              Garantía
            </Link>{' '}
            y escribinos: tiene 1 año de garantía de fábrica.
          </p>
        </section>

        <section>
          <h2 style={headingStyle}>Contacto</h2>
          <p style={textStyle}>
            WhatsApp: <a href={`https://wa.me/${SITE_CONTACT.telephone.replace('+', '')}`} style={{ color: 'var(--color-cyan)' }}>+54 9 11 6404-5074</a>
            <br />
            Email: <a href={`mailto:${SITE_CONTACT.email}`} style={{ color: 'var(--color-cyan)' }}>{SITE_CONTACT.email}</a>
            <br />
            Showroom y fábrica: {SITE_CONTACT.streetAddress}, {SITE_CONTACT.addressLocality}. Lunes a viernes de 9:00 a 18:00 hs.
          </p>
        </section>
      </div>
    </div>
  )
}
