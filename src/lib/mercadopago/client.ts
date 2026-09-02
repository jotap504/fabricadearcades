import { getMercadoPagoAccessToken } from './config'
import type { MPCreatePreferenceInput, MPPayment, MPPreferenceResponse } from './types'

const API_BASE = 'https://api.mercadopago.com'

async function mpFetch<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getMercadoPagoAccessToken()
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  })
  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : `MercadoPago respondió ${response.status}`
    throw new Error(message)
  }
  return data as T
}

export async function createPreference(input: MPCreatePreferenceInput): Promise<MPPreferenceResponse> {
  return mpFetch<MPPreferenceResponse>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items: input.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: 'ARS',
      })),
      payer: { email: input.payerEmail },
      external_reference: input.externalReference,
      back_urls: input.backUrls,
      auto_return: 'approved',
      notification_url: input.notificationUrl,
    }),
  })
}

export async function getPayment(paymentId: string): Promise<MPPayment> {
  return mpFetch<MPPayment>(`/v1/payments/${paymentId}`, { method: 'GET' })
}

// Test (sandbox) access tokens are prefixed "TEST-"; MercadoPago only honors
// sandbox_init_point in that case, init_point is for live credentials.
export async function pickCheckoutUrl(preference: MPPreferenceResponse): Promise<string> {
  const token = await getMercadoPagoAccessToken()
  return token.startsWith('TEST-') ? preference.sandbox_init_point : preference.init_point
}
