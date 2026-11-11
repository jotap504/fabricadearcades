import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div
      className="container"
      style={{
        padding: 'var(--space-16) var(--space-4)',
        maxWidth: 640,
        textAlign: 'center',
        minHeight: '50vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
      }}
    >
      <p
        aria-hidden="true"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(4rem, 14vw, 7rem)',
          fontWeight: 800,
          lineHeight: 1,
          color: 'var(--color-cyan)',
          margin: 0,
        }}
      >
        404
      </p>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>No encontramos esta página</h1>
      <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 460 }}>
        El enlace puede estar desactualizado o el producto ya no está disponible. Mirá el catálogo
        completo o escribinos y te ayudamos a encontrarlo.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/productos" className="btn btn-primary">
          Ver catálogo <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link href="/contacto" className="btn btn-ghost">
          Contacto
        </Link>
      </div>
    </div>
  )
}
