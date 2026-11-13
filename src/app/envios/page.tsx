import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seo'
import { Truck, MapPin, PackageCheck, ShieldCheck, ArrowRight } from 'lucide-react'

export const metadata = buildPageMetadata({
  title: 'Envíos y Entregas',
  description: 'Información sobre envíos a todo el país, retiros en fábrica y embalaje protector.',
  path: '/envios',
})

export default function EnviosPage() {
  return (
    <div className="container" style={{ padding: 'var(--space-12) var(--space-4)', maxWidth: '900px' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
          Envíos y Entregas
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.125rem', maxWidth: 650, margin: '0 auto' }}>
          Retiro sin costo en Devoto (CABA) o envío a todo el país con embalaje de máxima protección. El envío lo abona siempre el cliente en destino.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        {/* Retiro */}
        <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--color-cyan-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-cyan)', marginBottom: 'var(--space-4)' }}>
            <MapPin size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Retiro en Fábrica / Showroom</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
            Sin costo de envío. Podés retirar tu máquina por nuestras instalaciones en <strong>Devoto, CABA</strong> coordinando previamente día y franja horaria.
          </p>
          <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)', gap: 6 }}>
            <MapPin size={14} aria-hidden="true" /> Virgilio 2379, Devoto, CABA
          </span>
        </div>

        {/* CABA y GBA */}
        <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--color-magenta-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-magenta)', marginBottom: 'var(--space-4)' }}>
            <Truck size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>CABA y Gran Buenos Aires</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
            Para CABA y Gran Buenos Aires el pedido queda preparado para cotizar moto mensajería en bultos chicos o flete dedicado cuando el equipo sea grande.
          </p>
          <span className="badge badge-warning">
            Cotización local antes de despachar
          </span>
        </div>

        {/* Interior */}
        <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-green)', marginBottom: 'var(--space-4)' }}>
            <PackageCheck size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Interior del País</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
            Para el interior del país se clasifica como transporte, expreso o correo. El pedido conserva CP, localidad y notas para elegir la mejor opción operativa.
          </p>
          <span className="badge badge-success">
            Pago en destino cuando corresponda
          </span>
        </div>
      </div>

      <div className="glass" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
          <ShieldCheck size={28} style={{ color: 'var(--color-cyan)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>Seguridad en el transporte</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Todos nuestros muebles y componentes viajan protegidos con film alveolar de alto impacto, cantoneras reforzadas y embalaje cerrado para garantizar que tu arcade llegue en perfectas condiciones.
            </p>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Link href="/contacto" className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
          Consultar por un envío <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  )
}
