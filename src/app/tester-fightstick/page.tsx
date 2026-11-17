import Link from 'next/link'
import { ArrowLeft, Usb } from 'lucide-react'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildPageMetadata } from '@/lib/seo'
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/site'
import { categoryPath } from '@/lib/catalog-seo'
import { TesterFrame } from './TesterFrame'

const PAGE_PATH = '/tester-fightstick'
const PAGE_TITLE = 'Tester de Comandos para Fightstick (GP2040-CE)'
const PAGE_DESCRIPTION =
  'Probá en el navegador los botones, la palanca digital y analógica de tu fightstick. Asigná cada puerto USB a Player 1 o Player 2 y mapeá los pines GPIO de tu placa GP2040-CE.'

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: PAGE_PATH,
})

const STEPS = [
  'Conectá tu fightstick por USB. Cada stick es un puerto USB distinto.',
  'En el panel del jugador que quieras probar, tocá CONECTAR y presioná cualquier botón de ese stick: queda asignado a ese puerto hasta que lo desconectes o lo desenchufes.',
  'Repetí con el segundo stick en el panel de Player 2.',
  'Movés la palanca y apretás los botones, y el tablero te muestra en vivo qué entrada llega y en qué modo (digital o analógico) está cada jugador.',
  'Abrí "Pines GPIO" para cargar el número de pin de cada botón de tu placa. Los valores se guardan en tu navegador.',
]

export default function FightstickTesterPage() {
  const toolJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Tester de comandos para Fightstick GP2040-CE',
    url: absoluteUrl(PAGE_PATH),
    description: PAGE_DESCRIPTION,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Chrome, Edge (cualquier sistema con Gamepad API)',
    inLanguage: 'es-AR',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'ARS' },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  }

  return (
    <>
      <JsonLd data={toolJsonLd} />
      <div className="container" style={{ padding: 'var(--space-8) var(--space-4) var(--space-16)' }}>
        <Link
          href={categoryPath('fightsticks')}
          className="btn btn-ghost"
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <ArrowLeft size={18} aria-hidden="true" /> Volver a Fightsticks
        </Link>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
            fontWeight: 800,
            marginBottom: 'var(--space-3)',
            textWrap: 'balance',
          }}
        >
          Tester de comandos para fightstick
        </h1>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '1.0625rem',
            lineHeight: 1.6,
            maxWidth: '65ch',
            marginBottom: 'var(--space-6)',
          }}
        >
          Verificá que cada botón y cada dirección de tu fightstick responda bien, y en qué modo está
          funcionando. Pensado para placas con firmware GP2040-CE, con dos jugadores independientes.
        </p>

        <TesterFrame />

        <section style={{ marginTop: 'var(--space-10)', maxWidth: '65ch' }}>
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: '1.25rem',
              fontWeight: 700,
              marginBottom: 'var(--space-4)',
            }}
          >
            <Usb size={20} aria-hidden="true" /> Cómo usar el tester
          </h2>
          <ol style={{ paddingLeft: '1.25rem', display: 'grid', gap: 'var(--space-2)', lineHeight: 1.6 }}>
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p
            style={{
              marginTop: 'var(--space-4)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.9375rem',
              lineHeight: 1.6,
            }}
          >
            Funciona en Chrome y Edge. El navegador solo detecta un mando después de la primera
            pulsación, y todo se procesa en tu equipo: no se envía ningún dato a ningún servidor.
          </p>
        </section>
      </div>
    </>
  )
}
