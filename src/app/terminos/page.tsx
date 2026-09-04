import Link from 'next/link'
import { FileText, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Términos y Condiciones | Fábrica de Arcades',
  description: 'Términos y condiciones de compra, garantías y servicios de Fábrica de Arcades.',
}

export default function TerminosPage() {
  return (
    <div className="container" style={{ padding: 'var(--space-12) var(--space-4)', maxWidth: '800px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', gap: 6, marginBottom: 'var(--space-4)' }}>
          <ArrowLeft size={16} /> Volver al inicio
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
          Términos y Condiciones
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
          Última actualización: Septiembre 2026
        </p>
      </div>

      <div className="card card-body" style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-cyan)', marginBottom: 'var(--space-2)' }}>
            1. Ámbito de aplicación
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
            Las presentes condiciones regulan la compra y contratación de productos comercializados por <strong>Fábrica de Arcades</strong> a través de su sitio web oficial. Al confirmar un pedido, el usuario declara conocer y aceptar estos términos.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-cyan)', marginBottom: 'var(--space-2)' }}>
            2. Modalidades de productos y reservas
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
            Los productos de <strong>Entrega Inmediata</strong> corresponden a unidades ya fabricadas y disponibles en stock. Al generar un pedido con esta modalidad, la unidad queda reservada por un plazo de hasta 48 horas para concretar el pago. Los pedidos <strong>A Medida</strong> ingresan a la cola de producción tras la confirmación de la orden.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-cyan)', marginBottom: 'var(--space-2)' }}>
            3. Métodos de pago y precios
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
            Los precios publicados en la tienda son en pesos argentinos (ARS). Los pagos mediante MercadoPago, transferencia bancaria o efectivo reflejan los descuentos o recargos operativos estipulados al momento del checkout.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-cyan)', marginBottom: 'var(--space-2)' }}>
            4. Envíos y entregas
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
            Las opciones de entrega comprenden el retiro personal por showroom/fábrica (Devoto, CABA) o envío por flete/transporte de carga a todo el país. Los gastos de traslado son abonados por el comprador en destino directamente a la empresa transportista.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-cyan)', marginBottom: 'var(--space-2)' }}>
            5. Garantía oficial
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
            Todos los muebles y componentes electrónicos disponen de garantía oficial de fábrica por defectos de manufactura. No cubre daños ocasionados por mal uso, caídas accidentales o sobretensiones eléctricas ajenas al equipo.
          </p>
        </section>
      </div>
    </div>
  )
}
