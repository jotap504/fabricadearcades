import Link from 'next/link'
import { ShieldCheck, Wrench, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Garantía y Servicio Técnico | Fábrica de Arcades',
  description: 'Conocé nuestra política de garantía oficial, soporte técnico y provisión de repuestos originales.',
}

export default function GarantiaPage() {
  return (
    <div className="container" style={{ padding: 'var(--space-12) var(--space-4)', maxWidth: '900px' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
        <span className="badge badge-primary" style={{ marginBottom: 'var(--space-3)', display: 'inline-flex' }}>
          🛡️ Compromiso de calidad
        </span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
          Garantía y Servicio Técnico
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.125rem', maxWidth: 650, margin: '0 auto' }}>
          Comprás directo al fabricante: respaldo total, repuestos y asistencia continua.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--color-cyan-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-cyan)', marginBottom: 'var(--space-4)' }}>
            <ShieldCheck size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Garantía Escrita</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Todos nuestros productos cuentan con garantía oficial de fábrica por defectos de fabricación y componentes electrónicos.
          </p>
        </div>

        <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--color-magenta-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-magenta)', marginBottom: 'var(--space-4)' }}>
            <Wrench size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Servicio Técnico Propio</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Contamos con taller propio y técnicos especializados para reparaciones, calibraciones, ampliaciones de software y mantenimiento.
          </p>
        </div>

        <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-green)', marginBottom: 'var(--space-4)' }}>
            <RefreshCw size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Repuestos Originales</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Stock permanente de botones estándar/LED, palancas sanwa/americanas, microswitches, encoders USB y fuentes de alimentación.
          </p>
        </div>
      </div>

      <div className="card card-body" style={{ padding: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--color-cyan)' }}>
          Cobertura de la Garantía
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--color-green)', flexShrink: 0, marginTop: 2 }} />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
              <strong>Componentes electrónicos:</strong> Placas controladoras, pantallas, sistemas de sonido, fuentes de poder e iluminación LED.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--color-green)', flexShrink: 0, marginTop: 2 }} />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
              <strong>Mueble y estructura:</strong> Estabilidad del chasis, herrajes, cantos protectores T-molding y calidad de laqueado/laminado.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--color-green)', flexShrink: 0, marginTop: 2 }} />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
              <strong>Asistencia remota:</strong> Soporte vía WhatsApp para configuración de mandos, emuladores y dudas operativas.
            </span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Link href="/contacto" className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
          Contactar con Soporte <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  )
}
