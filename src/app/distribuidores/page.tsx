import Link from 'next/link'
import { Building2, Percent, Headphones, ShieldCheck, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Programa para Distribuidores y Revendedores | Fábrica de Arcades',
  description: 'Unite a nuestra red comercial con precios mayoristas, atención directa y stock garantizado para reventa.',
}

export default function DistribuidoresPage() {
  return (
    <div className="container" style={{ padding: 'var(--space-12) var(--space-4)', maxWidth: '900px' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
        <span className="badge badge-distributor" style={{ marginBottom: 'var(--space-3)', display: 'inline-flex' }}>
          💼 Canal Mayorista
        </span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
          Distribuidores y Revendedores
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.125rem', maxWidth: 650, margin: '0 auto' }}>
          Ofrecé arcades y accesorios de máxima calidad en tu negocio o tienda online con márgenes comerciales atractivos.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-10)' }}>
        <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--color-magenta-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-magenta)', marginBottom: 'var(--space-4)' }}>
            <Percent size={24} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Precios Mayoristas</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Accedé a la lista de precios de fábrica sin margen minorista agregado en todo nuestro catálogo.
          </p>
        </div>

        <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--color-cyan-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-cyan)', marginBottom: 'var(--space-4)' }}>
            <Building2 size={24} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Cuenta Corriente</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Distribuidores habilitados cuentan con opción de cuenta corriente y pase directo a cola de producción.
          </p>
        </div>

        <div className="card card-body" style={{ padding: 'var(--space-6)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-green)', marginBottom: 'var(--space-4)' }}>
            <Headphones size={24} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Atención Preferencial</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Canal de soporte y asesoramiento directo para cotizaciones especiales y pedidos por volumen.
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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>¿Querés ser distribuidor oficial?</h2>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: 520 }}>
          Completá el formulario de solicitud. Revisaremos tus datos y activaremos tu cuenta mayorista en 24 horas hábiles.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/registro-distribuidor" className="btn btn-secondary btn-lg" style={{ display: 'inline-flex' }}>
            Solicitar Cuenta Mayorista <ArrowRight size={18} />
          </Link>
          <Link href="/contacto" className="btn btn-ghost btn-lg">
            Consultar por WhatsApp
          </Link>
        </div>
      </div>
    </div>
  )
}
