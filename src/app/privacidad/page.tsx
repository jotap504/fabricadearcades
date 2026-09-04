import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Política de Privacidad | Fábrica de Arcades',
  description: 'Política de privacidad y protección de datos personales de Fábrica de Arcades.',
}

export default function PrivacidadPage() {
  return (
    <div className="container" style={{ padding: 'var(--space-12) var(--space-4)', maxWidth: '800px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', gap: 6, marginBottom: 'var(--space-4)' }}>
          <ArrowLeft size={16} /> Volver al inicio
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
          Política de Privacidad
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
          Última actualización: Septiembre 2026
        </p>
      </div>

      <div className="card card-body" style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-cyan)', marginBottom: 'var(--space-2)' }}>
            1. Información que recopilamos
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
            En Fábrica de Arcades recopilamos datos personales indispensables para la gestión y entrega de pedidos (nombre, correo electrónico, teléfono, domicilio de entrega) y datos necesarios para la gestión de cuentas de clientes y distribuidores mayoristas.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-cyan)', marginBottom: 'var(--space-2)' }}>
            2. Uso de la información
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
            La información brindada se utiliza exclusivamente para: procesar compras, coordinar retiros o envíos a domicilio, emitir comprobantes de compra, notificar estados de producción y responder consultas de atención al cliente y soporte técnico.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-cyan)', marginBottom: 'var(--space-2)' }}>
            3. Seguridad y pagos
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
            Los pagos con tarjeta de crédito, débito o dinero en cuenta se procesan a través de plataformas seguras y certificadas como <strong>MercadoPago</strong>. Fábrica de Arcades no almacena números de tarjeta ni datos bancarios sensibles en sus servidores.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-cyan)', marginBottom: 'var(--space-2)' }}>
            4. Derechos del usuario
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
            El titular de los datos personales tiene la facultad de ejercer el derecho de acceso, rectificación y supresión de los mismos conforme a la normativa vigente de Protección de Datos Personales (Ley 25.326). Para solicitar modificaciones, contactate a <strong>info@fabricadearcades.com.ar</strong>.
          </p>
        </section>
      </div>
    </div>
  )
}
