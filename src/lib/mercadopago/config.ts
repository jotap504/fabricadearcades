import { createAdminClient } from '@/lib/supabase/server'

export async function isMercadoPagoConfigured(): Promise<boolean> {
  if (process.env.MERCADOPAGO_ACCESS_TOKEN) return true
  const admin = await createAdminClient()
  const { data } = await admin.rpc('mercadopago_get_access_token')
  return Boolean(data)
}

export async function getMercadoPagoAccessToken(): Promise<string> {
  if (process.env.MERCADOPAGO_ACCESS_TOKEN) return process.env.MERCADOPAGO_ACCESS_TOKEN

  const admin = await createAdminClient()
  const { data, error } = await admin.rpc('mercadopago_get_access_token')
  if (error || !data) {
    throw new Error('MercadoPago no está configurado: cargá el Access Token desde /admin/configuracion.')
  }
  return data as string
}

export async function getMercadoPagoWebhookSecret(): Promise<string | null> {
  if (process.env.MERCADOPAGO_WEBHOOK_SECRET) return process.env.MERCADOPAGO_WEBHOOK_SECRET

  const admin = await createAdminClient()
  const { data } = await admin.rpc('mercadopago_get_webhook_secret')
  return (data as string) || null
}
