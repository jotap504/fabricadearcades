import Image from 'next/image'
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  LayoutDashboard,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wifi,
  XCircle,
  Zap,
} from 'lucide-react'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildPageMetadata } from '@/lib/seo'
import { SITE_CONTACT, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/site'
import { KobroGallery } from './KobroGallery'

const PAGE_PATH = '/cobros-qr'
const PAGE_TITLE = 'Cobros QR para máquinas de juegos y vending (Kobro)'
const PAGE_DESCRIPTION =
  'Cobrá con QR de Mercado Pago en arcades, pelucheras, pinball y vending por pulso. Kobro se conecta a tu máquina: seguís cobrando fichas y billetes y controlás todo desde el celular.'

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: PAGE_PATH,
})

const PAGOSQR_PANEL_URL = 'https://pay.pagarqr.ar/app'
const WHATSAPP_URL = `https://wa.me/${SITE_CONTACT.telephone.replace('+', '')}?text=${encodeURIComponent(
  'Hola, quiero consultar por Cobros QR con Kobro para mis máquinas.'
)}`

const TRUST = [
  { icon: Banknote, title: 'Seguís cobrando fichas y billetes', text: 'Kobro se conecta en paralelo a la entrada de moneda.' },
  { icon: ShieldCheck, title: 'La plata va a tu cuenta', text: 'Los cobros van a tu Mercado Pago. La plataforma no retiene tu dinero.' },
  { icon: Zap, title: 'Para juegos y vending por pulso', text: 'Si tu máquina recibe créditos por pulso de moneda, es compatible.' },
]

const CUSTOMER_STEPS = [
  { title: 'Escanea el QR', text: 'El QR está pegado en la máquina. Lo abre con Mercado Pago y encuentra el importe listo para pagar.' },
  { title: 'Paga desde el celular', text: 'El sistema verifica el pago directamente con Mercado Pago antes de habilitar el crédito.' },
  { title: 'La máquina se activa', text: 'Kobro envía un pulso de moneda, como si entrara una ficha. Habilita el juego o activa una vending compatible.' },
]

const INSTALL_STEPS = [
  { title: 'Conectá la placa', text: 'Con la máquina apagada y desenchufada: alimentación de 12 V, señal de moneda y masa.' },
  { title: 'Configurá el WiFi', text: 'Desde el celular, elegí la red del local. La placa comprueba la conexión antes de guardarla.' },
  { title: 'Vinculá e imprimí', text: 'Vinculá la placa por su QR o serie, configurá Mercado Pago y las tarifas, e imprimí el QR de cobro.' },
]

const PANEL_FEATURES = [
  { title: 'QR fijo, precio flexible', text: 'Hasta dos tarifas por máquina, cada una con su propio QR. Cambiás el precio desde el panel, sin volver a imprimir.' },
  { title: 'Configuración a distancia', text: 'Ajustá precios, promociones y créditos. Probá un pulso o activá el modo mantenimiento sin ir a la máquina.' },
  { title: 'Lo digital y la caja, en la misma cuenta', text: 'Con un billetero compatible, registra cada billete y te muestra cuánto debería haber en la caja. Acompaña el arqueo físico, no lo reemplaza.' },
  { title: 'El reparto acordado, sin la calculadora', text: 'Agrupá las máquinas por local con su porcentaje. El panel contempla los cargos de Mercado Pago, calcula la parte de cada uno y cierra el período en una operación.' },
  { title: 'Cada cosa, registrada', text: 'Pagos, devoluciones, cambios y retiros de caja, con historial para seguir cada movimiento.' },
  { title: 'Compartí con permisos', text: 'Invitá empleados y dale acceso de solo lectura a socios o dueños de locales, limitado a las máquinas que les corresponden.' },
]

const COMPATIBLE = ['Arcades JAMMA o Pandora', 'Máquinas de boxeo', 'Pelucheras', 'Pinball', 'Básquet', 'Vending que se activa por pulso']
const NOT_INCLUDED = [
  'Equipos que cobran por tiempo',
  'Expendedoras que requieren gestionar selección de productos, stock o protocolo MDB',
]

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: '¿Sirve para mi máquina?',
    a: 'Si recibe créditos por un pulso de moneda, es compatible: arcades JAMMA o Pandora, boxeo, pelucheras, pinball, básquet y máquinas vending que se activan por pulso. Los equipos por tiempo y las expendedoras que requieren gestionar selección de productos, stock o protocolo MDB todavía no están incluidos.',
  },
  {
    q: '¿Voy a seguir pudiendo cobrar en efectivo?',
    a: 'Sí. Kobro se conecta en paralelo a la entrada de moneda: conservás las fichas y los billetes. Si conectás un billetero compatible, también registrás el efectivo en el panel. El conteo no reemplaza el arqueo físico de la caja.',
  },
  {
    q: '¿Dónde recibo el dinero?',
    a: 'Los cobros van directo a tu cuenta de Mercado Pago. La plataforma no retiene tu dinero.',
  },
  {
    q: '¿Qué pasa si la máquina no entrega el crédito?',
    a: 'Si se confirma que la orden no se ejecutó, el sistema devuelve el pago automáticamente. Un caso dudoso, como un corte de luz justo durante la entrega, queda marcado para que lo resuelvas desde el panel.',
  },
  {
    q: '¿Necesito internet en el local?',
    a: 'Sí, una red WiFi de 2,4 GHz. Cuando la máquina está fuera de línea, el cobro QR queda indisponible. El efectivo se sigue registrando y se sincroniza al recuperar la conexión.',
  },
  {
    q: '¿Tengo que imprimir otro QR si cambio el precio?',
    a: 'No. El QR es fijo y el precio se cambia desde el panel. Podés configurar hasta dos tarifas por máquina, cada una con su propio QR.',
  },
]

const h2Style = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
  fontWeight: 800,
  lineHeight: 1.15,
  marginBottom: 'var(--space-3)',
  textWrap: 'balance',
} as const

const leadStyle = { color: 'var(--color-text-secondary)', fontSize: '1.0625rem', lineHeight: 1.7 } as const
const bodyStyle = { color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.65 } as const
const sectionGap = { marginBottom: 'var(--space-16)' } as const

function StepNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flexShrink: 0,
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: 'var(--color-cyan-dim)',
        color: 'var(--color-cyan)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '0.9375rem',
      }}
    >
      {n}
    </span>
  )
}

export default function CobrosQrPage() {
  const pageUrl = absoluteUrl(PAGE_PATH)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${pageUrl}#service`,
        name: 'Cobros QR con Kobro para máquinas de juegos y vending',
        description: PAGE_DESCRIPTION,
        serviceType: 'Cobros con QR de Mercado Pago para máquinas por pulso',
        areaServed: { '@type': 'Country', name: 'Argentina' },
        provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        url: pageUrl,
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
          { '@type': 'ListItem', position: 2, name: 'Cobros QR', item: pageUrl },
        ],
      },
    ],
  }

  return (
    <div className="container" style={{ padding: 'var(--space-12) var(--space-4) var(--space-16)' }}>
      <JsonLd data={jsonLd} />

      {/* HERO: the promise, the proof, one clear action */}
      <section
        aria-labelledby="cobros-titulo"
        style={{
          ...sectionGap,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--space-10)',
          alignItems: 'center',
        }}
      >
        <div>
          <h1
            id="cobros-titulo"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3.25rem)',
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              marginBottom: 'var(--space-4)',
              textWrap: 'balance',
            }}
          >
            Que tu máquina cobre con QR. Sin cambiar la máquina.
          </h1>
          <p style={{ ...leadStyle, fontSize: '1.1875rem', maxWidth: '52ch' }}>
            Tu cliente escanea y paga con Mercado Pago. Tu arcade, pelucha o vending se activa por pulso, como si entrara una
            ficha. Vos controlás las ventas, el efectivo y los locales desde el celular.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
              <MessageCircle size={18} aria-hidden="true" /> Consultar por WhatsApp
            </a>
            <a href="#como-funciona" className="btn btn-secondary btn-lg" style={{ display: 'inline-flex' }}>
              Ver cómo funciona <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            aspectRatio: '1 / 1',
            width: '100%',
            maxWidth: 520,
            justifySelf: 'center',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            background: '#ffffff',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Image
            src="/cobros-qr/kobro-antena-externa.webp"
            alt="Equipo Kobro con pantalla roja y antena externa, la placa que habilita el cobro con QR en tu máquina"
            fill
            sizes="(max-width: 700px) 90vw, 520px"
            quality={75}
            fetchPriority="high"
            style={{ objectFit: 'contain' }}
          />
        </div>
      </section>

      {/* The three objections that stop a purchase, answered up front */}
      <section aria-label="Lo esencial" style={sectionGap}>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {TRUST.map(({ icon: Icon, title, text }) => (
            <li key={title} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
              <Icon size={22} aria-hidden="true" style={{ color: 'var(--color-cyan)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>{title}</p>
                <p style={bodyStyle}>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* HOW IT WORKS for the customer */}
      <section id="como-funciona" aria-labelledby="como-paga" style={{ ...sectionGap, scrollMarginTop: 'calc(var(--header-height) + var(--space-4))' }}>
        <h2 id="como-paga" style={h2Style}>Escaneá. Pagá. Activá.</h2>
        <p style={{ ...leadStyle, marginBottom: 'var(--space-6)', maxWidth: '60ch' }}>
          Así de simple es para tu cliente. Por detrás, cada pago queda verificado y registrado.
        </p>

        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {CUSTOMER_STEPS.map((step, index) => (
            <li key={step.title} className="card card-body" style={{ padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
              <StepNumber n={index + 1} />
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>{step.title}</h3>
                <p style={bodyStyle}>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div
          className="card card-body"
          style={{ marginTop: 'var(--space-4)', padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', background: 'var(--color-cyan-dim)' }}
        >
          <ShieldCheck size={22} aria-hidden="true" style={{ color: 'var(--color-cyan)', flexShrink: 0, marginTop: 2 }} />
          <p style={{ ...bodyStyle, color: 'var(--color-text)' }}>
            <strong>Si no se entrega, se devuelve.</strong> Devolución automática cuando se confirma que la máquina no dio el crédito.
            Los casos dudosos quedan marcados para tu revisión.
          </p>
        </div>
      </section>

      {/* HARDWARE: the Kobro board and how it connects */}
      <section
        aria-labelledby="equipo-titulo"
        style={{
          ...sectionGap,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--space-10)',
          alignItems: 'center',
        }}
      >
        <KobroGallery />

        <div>
          <h2 id="equipo-titulo" style={h2Style}>Se integra a tu máquina. Y a tu forma de trabajar.</h2>
          <p style={{ ...leadStyle, marginBottom: 'var(--space-6)' }}>
            Kobro se conecta en paralelo a la entrada de moneda. La máquina conserva su funcionamiento con fichas y billetes.
          </p>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {INSTALL_STEPS.map((step, index) => (
              <li key={step.title} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                <StepNumber n={index + 1} />
                <div>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>{step.title}</h3>
                  <p style={bodyStyle}>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p style={{ ...bodyStyle, marginTop: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Wifi size={16} aria-hidden="true" style={{ color: 'var(--color-cyan)', flexShrink: 0 }} />
            Necesita una red WiFi de 2,4 GHz en el local.
          </p>
        </div>
      </section>

      {/* CONTROL: the owner's panel */}
      <section aria-labelledby="panel-titulo" style={sectionGap}>
        <h2 id="panel-titulo" style={h2Style}>Todas tus máquinas. El control en tu mano.</h2>
        <p style={{ ...leadStyle, marginBottom: 'var(--space-6)', maxWidth: '60ch' }}>
          Desde el navegador de tu celular o tu compu, sin instalar una aplicación.
        </p>
        <dl
          style={{
            margin: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            columnGap: 'var(--space-10)',
            rowGap: 'var(--space-6)',
          }}
        >
          {PANEL_FEATURES.map((feature) => (
            <div key={feature.title} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
              <dt style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>{feature.title}</dt>
              <dd style={{ ...bodyStyle, margin: 0 }}>{feature.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* QUALIFICATION: is it for my machine? */}
      <section aria-labelledby="compatibilidad" style={sectionGap}>
        <h2 id="compatibilidad" style={h2Style}>¿Sirve para tu máquina?</h2>
        <p style={{ ...leadStyle, marginBottom: 'var(--space-6)', maxWidth: '60ch' }}>
          La regla es simple: si recibe créditos por un pulso de moneda, es compatible.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <QrCode size={20} aria-hidden="true" style={{ color: 'var(--color-cyan)' }} /> Compatibles
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {COMPATIBLE.map((item) => (
                <li key={item} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={18} aria-hidden="true" style={{ color: 'var(--color-green)', flexShrink: 0, marginTop: 3 }} />
                  <span style={bodyStyle}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Smartphone size={20} aria-hidden="true" style={{ color: 'var(--color-text-muted)' }} /> Todavía no incluidos
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {NOT_INCLUDED.map((item) => (
                <li key={item} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                  <XCircle size={18} aria-hidden="true" style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: 3 }} />
                  <span style={bodyStyle}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="preguntas" style={{ ...sectionGap, maxWidth: 860 }}>
        <h2 id="preguntas" style={h2Style}>Las cosas claras.</h2>
        <p style={{ ...leadStyle, marginBottom: 'var(--space-6)' }}>
          Lo que necesitás saber para entender si Kobro y Pagos QR encajan en tu negocio.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {FAQ.map((item) => (
            <details key={item.q} className="card card-body" style={{ padding: 'var(--space-4) var(--space-5)' }}>
              <summary style={{ fontWeight: 600, cursor: 'pointer' }}>{item.q}</summary>
              <p style={{ ...bodyStyle, marginTop: 'var(--space-3)' }}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CLOSING CTA */}
      <section
        aria-labelledby="cierre"
        className="card card-body"
        style={{ padding: 'var(--space-10) var(--space-6)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}
      >
        <h2 id="cierre" style={{ ...h2Style, marginBottom: 0 }}>Tu máquina de siempre. Una nueva forma de cobrar.</h2>
        <p style={{ ...leadStyle, maxWidth: '52ch' }}>
          Escribinos y te contamos cómo sumar Kobro a tus máquinas. Para juegos y vending por pulso, con Mercado Pago Argentina y precios en pesos.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
            <MessageCircle size={18} aria-hidden="true" /> Consultar por WhatsApp
          </a>
        </div>
        <p style={{ ...bodyStyle, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <LayoutDashboard size={16} aria-hidden="true" style={{ color: 'var(--color-cyan)' }} />
          <span>
            Si ya tenés tu cuenta,{' '}
            <a href={PAGOSQR_PANEL_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-cyan)', textDecoration: 'underline' }}>
              ingresá al panel
            </a>
            .
          </span>
        </p>
      </section>
    </div>
  )
}
