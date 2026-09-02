import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartSidebar } from '@/components/cart/CartSidebar'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { AuthProvider } from '@/components/auth/AuthProvider'

export const metadata: Metadata = {
  title: {
    default: 'Fábrica de Arcades | Consolas Arcade Personalizadas en Argentina',
    template: '%s | Fábrica de Arcades',
  },
  description:
    'Fabricamos consolas arcade personalizadas en Argentina. Elegí tu gabinete, colores y temática. Stock disponible, envío a todo el país.',
  keywords: ['arcade', 'consola arcade', 'máquina arcade', 'Argentina', 'retro gaming', 'personalizado'],
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'Fábrica de Arcades',
  },
}

import { WhatsAppFloat } from '@/components/layout/WhatsAppFloat'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
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
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <CartSidebar />
          <ToastContainer />
          <WhatsAppFloat />
        </AuthProvider>
      </body>
    </html>
  )
}
