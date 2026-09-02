'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'
import { CreditCard, Save, Truck, Wallet, ShieldCheck } from 'lucide-react'

interface Config {
  key: string
  value: string
  label: string | null
}

interface MercadoPagoStatus {
  access_token_set: boolean
  webhook_secret_set: boolean
  updated_at: string | null
}

interface Props {
  deliveryConfig: Config[]
  pricingConfig: Config[]
  mercadoPagoStatus: MercadoPagoStatus
}

const PAYMENT_CONFIG_KEYS = ['cash_discount_pct', 'transfer_discount_pct', 'card_surcharge_pct', 'mercadopago_surcharge_pct']

function ConfigForm({
  items,
  onSave,
  numeric = false,
}: {
  items: Config[]
  onSave: (key: string, value: string, label?: string) => void
  numeric?: boolean
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(items.map((c) => [c.key, c.value]))
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {items.map((item) => (
        <div key={item.key} className="form-group">
          <label className="form-label" htmlFor={`config-${item.key}`}>
            {item.label ?? item.key}
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <input
              id={`config-${item.key}`}
              className="form-input"
              type={numeric ? 'number' : 'text'}
              min={numeric ? '0' : undefined}
              max={numeric ? '100' : undefined}
              step={numeric ? '0.01' : undefined}
              value={values[item.key] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [item.key]: e.target.value }))}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onSave(item.key, values[item.key] ?? '', item.label ?? item.key)}
              id={`save-config-${item.key}`}
            >
              <Save size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ConfigClient({ deliveryConfig, pricingConfig, mercadoPagoStatus }: Props) {
  const supabase = createClient()
  const toast = useToast()
  const [mpStatus, setMpStatus] = useState(mercadoPagoStatus)
  const [mpAccessToken, setMpAccessToken] = useState('')
  const [mpWebhookSecret, setMpWebhookSecret] = useState('')
  const [savingMp, setSavingMp] = useState(false)

  async function saveMercadoPagoCredentials() {
    if (!mpAccessToken.trim() && !mpWebhookSecret.trim()) {
      toast.error('Completá al menos un campo para guardar')
      return
    }
    setSavingMp(true)
    const { error } = await supabase.rpc('mercadopago_set_credentials', {
      p_access_token: mpAccessToken.trim() || null,
      p_webhook_secret: mpWebhookSecret.trim() || null,
    })
    setSavingMp(false)
    if (error) {
      toast.error('Error al guardar credenciales', error.message)
      return
    }
    setMpStatus((prev) => ({
      access_token_set: prev.access_token_set || Boolean(mpAccessToken.trim()),
      webhook_secret_set: prev.webhook_secret_set || Boolean(mpWebhookSecret.trim()),
      updated_at: new Date().toISOString(),
    }))
    setMpAccessToken('')
    setMpWebhookSecret('')
    toast.success('Credenciales de MercadoPago guardadas', 'Se almacenaron cifradas en Supabase Vault')
  }

  const paymentConfig: Config[] = [
    {
      key: 'transfer_discount_pct',
      label: '% descuento por transferencia',
      value: deliveryConfig.find((item) => item.key === 'transfer_discount_pct')?.value ?? '5',
    },
    {
      key: 'cash_discount_pct',
      label: '% descuento por pago en efectivo',
      value: deliveryConfig.find((item) => item.key === 'cash_discount_pct')?.value ?? '0',
    },
    {
      key: 'card_surcharge_pct',
      label: '% recargo por tarjeta de crédito',
      value: deliveryConfig.find((item) => item.key === 'card_surcharge_pct')?.value ?? '7',
    },
    {
      key: 'mercadopago_surcharge_pct',
      label: '% recargo por MercadoPago',
      value: deliveryConfig.find((item) => item.key === 'mercadopago_surcharge_pct')?.value ?? '0',
    },
  ]
  const shippingConfig = deliveryConfig.filter((item) => !PAYMENT_CONFIG_KEYS.includes(item.key))

  async function saveDeliveryConfig(key: string, value: string, label?: string) {
    const normalizedValue = PAYMENT_CONFIG_KEYS.includes(key)
      ? String(Math.max(0, Math.min(100, Number.parseFloat(value) || 0)))
      : value

    const { error } = await supabase
      .from('delivery_config')
      .upsert({
        key,
        value: normalizedValue,
        label: label ?? key,
        updated_at: new Date().toISOString(),
      })
    if (error) {
      toast.error('Error al guardar')
    } else {
      toast.success('Configuración guardada')
    }
  }

  async function savePricingConfig(key: string, value: string) {
    const { error } = await supabase
      .from('pricing_config')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)
    if (error) {
      toast.error('Error al guardar')
    } else {
      toast.success('Configuración guardada')
    }
  }

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wallet size={20} className="text-cyan" />
          Credenciales de MercadoPago
        </h2>
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} /> Se guardan cifradas en Supabase Vault, nunca en texto plano. Dejá un campo vacío para no tocarlo.
          </p>
          <div className="form-group">
            <label className="form-label" htmlFor="mp-access-token">
              Access Token {mpStatus.access_token_set ? '✓ Configurado' : '— No configurado'}
            </label>
            <input
              id="mp-access-token"
              className="form-input"
              type="password"
              autoComplete="off"
              placeholder={mpStatus.access_token_set ? '•••••••••••• (dejar vacío para no cambiar)' : 'APP_USR-... o TEST-...'}
              value={mpAccessToken}
              onChange={(e) => setMpAccessToken(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mp-webhook-secret">
              Webhook Secret {mpStatus.webhook_secret_set ? '✓ Configurado' : '— No configurado'}
            </label>
            <input
              id="mp-webhook-secret"
              className="form-input"
              type="password"
              autoComplete="off"
              placeholder={mpStatus.webhook_secret_set ? '•••••••••••• (dejar vacío para no cambiar)' : 'Secret de la sección Webhooks de tu app'}
              value={mpWebhookSecret}
              onChange={(e) => setMpWebhookSecret(e.target.value)}
            />
          </div>
          <div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={saveMercadoPagoCredentials}
              disabled={savingMp}
              id="save-mercadopago-credentials-btn"
            >
              <Save size={16} />
              {savingMp ? 'Guardando...' : 'Guardar credenciales'}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={20} className="text-cyan" />
          Lineamientos generales de pago
        </h2>
        <div className="card card-body">
          <ConfigForm items={paymentConfig} onSave={saveDeliveryConfig} numeric />
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Truck size={20} className="text-cyan" />
          Tiempos de entrega
        </h2>
        <div className="card card-body">
          <ConfigForm items={shippingConfig} onSave={saveDeliveryConfig} />
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
          💰 Configuración de precios
        </h2>
        <div className="card card-body">
          <ConfigForm items={pricingConfig} onSave={savePricingConfig} />
        </div>
      </div>
    </div>
  )
}
