import Link from 'next/link'
import { Check, Clock, X } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ outcome?: string }>
}

const OUTCOME_CONTENT: Record<string, { icon: React.ReactNode; color: string; title: string; message: string }> = {
  approved: {
    icon: <Check size={36} />,
    color: 'var(--color-green)',
    title: '¡Pago aprobado!',
    message: 'Tu pago con MercadoPago fue confirmado. En breve vas a recibir un email con los detalles de tu pedido.',
  },
  pending: {
    icon: <Clock size={36} />,
    color: 'var(--color-amber)',
    title: 'Pago en proceso',
    message: 'MercadoPago está procesando tu pago (por ejemplo, si elegiste un medio offline). Te avisamos por email apenas se confirme.',
  },
  failure: {
    icon: <X size={36} />,
    color: 'var(--color-red)',
    title: 'El pago no se pudo procesar',
    message: 'Tu pedido quedó registrado pero el pago no se completó. Podés reintentar desde tu cuenta o contactarnos por WhatsApp.',
  },
}

export default async function MercadoPagoRetornoPage({ searchParams }: PageProps) {
  const params = await searchParams
  const content = OUTCOME_CONTENT[params.outcome ?? ''] ?? OUTCOME_CONTENT.pending

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-5)',
        textAlign: 'center',
        padding: 'var(--space-8)',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'var(--color-surface)',
          border: `2px solid ${content.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: content.color,
        }}
      >
        {content.icon}
      </div>
      <div>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>{content.title}</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.0625rem', maxWidth: 480 }}>
          {content.message}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/mi-cuenta/pedidos" className="btn btn-primary" id="mp-return-orders-btn">
          Ver mis pedidos
        </Link>
        <Link href="/productos" className="btn btn-ghost" id="mp-return-catalog-btn">
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}
