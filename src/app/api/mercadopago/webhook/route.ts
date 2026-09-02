import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getPayment } from '@/lib/mercadopago/client'
import { getMercadoPagoWebhookSecret } from '@/lib/mercadopago/config'
import { verifyMercadoPagoSignature } from '@/lib/mercadopago/verifyWebhookSignature'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const url = new URL(request.url)
  const dataId = url.searchParams.get('data.id')
  const type = url.searchParams.get('type')

  // Always read the body (MercadoPago expects a fast 200; we don't use the
  // body for anything but keeping the request stream drained), then verify.
  await request.text().catch(() => null)

  if (type !== 'payment' || !dataId) {
    return NextResponse.json({ ignored: true }, { status: 200 })
  }

  const secret = await getMercadoPagoWebhookSecret()
  const verified = verifyMercadoPagoSignature({
    xSignature: request.headers.get('x-signature'),
    xRequestId: request.headers.get('x-request-id'),
    dataId,
    secret: secret ?? '',
  })

  if (!secret || !verified) {
    // Never process an unverified notification — reject outright.
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const admin = await createAdminClient()

  try {
    const payment = await getPayment(dataId)
    const orderId = payment.external_reference

    await admin.from('mercadopago_payments').upsert(
      {
        order_id: orderId || null,
        mp_payment_id: String(payment.id),
        status: payment.status,
        status_detail: payment.status_detail,
        raw_payload: payment as unknown as Record<string, unknown>,
      },
      { onConflict: 'mp_payment_id' }
    )

    if (payment.status === 'approved' && orderId) {
      const { data: order } = await admin
        .from('orders')
        .select('id, status, payment_method')
        .eq('id', orderId)
        .maybeSingle()

      if (order && order.payment_method === 'mercadopago' && order.status === 'pending_confirmation') {
        await admin
          .from('orders')
          .update({
            payment_status: 'paid',
            payment_reference: String(payment.id),
            status: 'confirmed',
          })
          .eq('id', orderId)
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('MercadoPago webhook error:', error)
    // Still 200 so MercadoPago doesn't hammer retries for a transient error
    // on our side after we've already logged what we could; the payment
    // itself remains verifiable via the Payments API if we need to replay.
    return NextResponse.json({ received: true, error: true }, { status: 200 })
  }
}
