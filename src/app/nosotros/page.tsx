import Link from 'next/link'
import { Sparkles, Award, HeartHandshake, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Sobre Nosotros | Fábrica de Arcades',
  description: 'Conocé la historia y calidad artesanal detrás de Fábrica de Arcades.',
}

export default function NosotrosPage() {
  return (
    <div className="container" style={{ padding: 'var(--space-12) var(--space-4)', maxWidth: '900px' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
        <span className="badge badge-primary" style={{ marginBottom: 'var(--space-3)', display: 'inline-flex' }}>
          🕹️ Pasión por el retro gaming
        </span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
          Sobre Nosotros
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.125rem', maxWidth: 650, margin: '0 auto' }}>
          Reviviendo la época dorada de los videojuegos con tecnología moderna y construcción artesanal de máxima durabilidad.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        <div className="card card-body" style={{ padding: 'var(--space-8)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--color-cyan)' }}>
            Nuestra Historia
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, marginBottom: 'var(--space-4)' }}>
            En <strong>Fábrica de Arcades</strong> nacimos con una misión clara: devolver la magia y emoción de los fichines clásicos a los hogares, oficinas y espacios de entretenimiento de toda Argentina.
          </p>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
            Fabricamos muebles arcade, bartops, fightsticks y pedestales de primera línea, combinando estructuras de alta densidad, pantallas de alta definición y electrónica de respuesta inmediata.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-6)' }}>
          <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--color-cyan-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-cyan)', marginBottom: 'var(--space-4)' }}>
              <Sparkles size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>100% Personalizable</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Elegí vinilos exclusivos, palancas y botones para cada jugador. Cada máquina es única.
            </p>
          </div>

          <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--color-magenta-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-magenta)', marginBottom: 'var(--space-4)' }}>
              <Award size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Calidad Industrial</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              MDF cortado con precisión CNC, componentes de alto rendimiento y terminaciones profesionales.
            </p>
          </div>

          <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-green)', marginBottom: 'var(--space-4)' }}>
              <HeartHandshake size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Garantía y Soporte</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Acompañamiento postventa continuo, repuestos disponibles y servicio técnico directo de fábrica.
            </p>
          </div>
        </div>

        <div
          className="glass"
          style={{
            padding: 'var(--space-8)',
            borderRadius: 'var(--radius-xl)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>¿Listo para equipar tu rincón arcade?</h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: 500 }}>
            Explorá nuestros modelos terminados con entrega inmediata o armá tu arcade a medida.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/productos" className="btn btn-primary btn-lg">
              Ver Catálogo <ArrowRight size={18} />
            </Link>
            <Link href="/contacto" className="btn btn-ghost btn-lg">
              Contactar Asesor
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
