import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartSidebar } from '@/components/cart/CartSidebar'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { JsonLd } from '@/components/seo/JsonLd'
import {
  SITE_URL,
  SITE_NAME,
  SITE_LOCALE,
  SITE_LOGO,
  SITE_CONTACT,
  SITE_DEFAULT_OG_IMAGE,
  absoluteUrl,
} from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'TodoArcade | Consolas Arcade Personalizadas en Argentina',
    template: '%s | TodoArcade',
  },
  description:
    'Fabricamos consolas arcade personalizadas en Argentina. Elegí tu gabinete, colores y temática. Stock disponible, envío a todo el país.',
  applicationName: SITE_NAME,
  keywords: ['arcade', 'consola arcade', 'máquina arcade', 'Argentina', 'retro gaming', 'personalizado'],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: SITE_LOCALE,
    siteName: SITE_NAME,
    url: '/',
    title: 'TodoArcade | Consolas Arcade Personalizadas en Argentina',
    description:
      'Fabricamos consolas arcade personalizadas en Argentina. Elegí tu gabinete, colores y temática. Stock disponible, envío a todo el país.',
    images: [{ url: SITE_DEFAULT_OG_IMAGE, alt: 'Consolas arcade fabricadas por TodoArcade' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TodoArcade | Consolas Arcade Personalizadas en Argentina',
    description:
      'Fabricamos consolas arcade personalizadas en Argentina. Elegí tu gabinete, colores y temática.',
    images: [SITE_DEFAULT_OG_IMAGE],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
}

const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl(SITE_LOGO),
      email: SITE_CONTACT.email,
      telephone: SITE_CONTACT.telephone,
      sameAs: [SITE_CONTACT.instagram, SITE_CONTACT.tiktok],
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          telephone: SITE_CONTACT.telephone,
          email: SITE_CONTACT.email,
          availableLanguage: 'es',
          areaServed: 'AR',
        },
      ],
    },
    {
      '@type': 'Store',
      '@id': `${SITE_URL}/#localbusiness`,
      name: SITE_NAME,
      description:
        'Fábrica y showroom de consolas arcade personalizadas en Devoto, Ciudad de Buenos Aires. Equipos listos para entregar y pedidos a medida.',
      url: SITE_URL,
      image: absoluteUrl(SITE_DEFAULT_OG_IMAGE),
      logo: absoluteUrl(SITE_LOGO),
      email: SITE_CONTACT.email,
      telephone: SITE_CONTACT.telephone,
      address: {
        '@type': 'PostalAddress',
        streetAddress: SITE_CONTACT.streetAddress,
        addressLocality: SITE_CONTACT.addressLocality,
        addressCountry: SITE_CONTACT.addressCountry,
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '18:00',
        },
      ],
      areaServed: { '@type': 'Country', name: 'Argentina' },
      currenciesAccepted: 'ARS',
      paymentAccepted: 'MercadoPago, tarjeta de crédito, tarjeta de débito, transferencia bancaria, efectivo',
      hasMap: SITE_CONTACT.mapUrl,
      parentOrganization: { '@id': `${SITE_URL}/#organization` },
      sameAs: [SITE_CONTACT.instagram, SITE_CONTACT.tiktok],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: 'es-AR',
      publisher: { '@id': `${SITE_URL}/#organization` },
      // The catalog search is a real, crawlable URL (/productos?buscar=...).
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/productos?buscar={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

import { WhatsAppFloat } from '@/components/layout/WhatsAppFloat'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('site-theme') || 'light';
                document.documentElement.dataset.theme = theme;
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body>
        <JsonLd data={siteJsonLd} />
        <AuthProvider>
          <a href="#contenido" className="skip-link">
            Saltar al contenido
          </a>
          <Header />
          <main id="contenido" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          <CartSidebar />
          <ToastContainer />
          <WhatsAppFloat />
        </AuthProvider>
      </body>
    </html>
  )
}
