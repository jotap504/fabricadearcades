import crypto from 'node:crypto'

interface VerifyWebhookSignatureInput {
  xSignature: string | null
  xRequestId: string | null
  dataId: string
  secret: string
}

// MercadoPago webhook signature scheme (Checkout Pro / webhooks v2):
// x-signature header looks like "ts=1704908010,v1=<hex hmac>".
// manifest = `id:{data.id lowercased};request-id:{x-request-id};ts:{ts};`
// v1 = hex(HMAC-SHA256(manifest, webhook secret))
export function verifyMercadoPagoSignature({
  xSignature,
  xRequestId,
  dataId,
  secret,
}: VerifyWebhookSignatureInput): boolean {
  if (!xSignature || !xRequestId || !secret) return false

  const parts = Object.fromEntries(
    xSignature.split(',').map((part) => {
      const [key, value] = part.split('=')
      return [key?.trim(), value?.trim()]
    })
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  const expectedBuffer = Buffer.from(expected, 'hex')
  const actualBuffer = Buffer.from(v1, 'hex')
  if (expectedBuffer.length !== actualBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}
