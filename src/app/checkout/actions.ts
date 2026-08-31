'use server'

import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import type { ArcadeCustomization, PaymentMethod, ShippingAddress } from '@/lib/types'

export interface CheckoutOrderInput {
  customer: { name: string; email: string; phone: string }
  shipping: ShippingAddress
  paymentMethod: PaymentMethod
  notes: string
  items: Array<{
    product_id: string
    variant_id: string | null
    stock_item_id: string | null
    quantity: number
    customization: ArcadeCustomization
  }>
}

export interface CreatedOrderResult {
  success: true
  orderId: string
  orderNumber: string
  status: string
  reservationExpiresAt: string | null
  subtotal: number
  discount: number
  surcharge: number
  total: number
}

export async function createStoreOrder(input: CheckoutOrderInput): Promise<CreatedOrderResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_store_order', {
    p_customer: input.customer,
    p_shipping: input.shipping,
    p_payment_method: input.paymentMethod,
    p_notes: input.notes,
    p_items: input.items,
  })

  if (error) {
    console.error('Error creating store order:', error)
    throw new Error(error.message || 'No se pudo crear el pedido')
  }

  const result = data as CreatedOrderResult
  const resendKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.ORDER_EMAIL_FROM
  if (resendKey && emailFrom && !resendKey.includes('your-')) {
    const resend = new Resend(resendKey)
    const escapeHtml = (value: string) =>
      value.replace(/[&<>'"]/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
      })[char] ?? char)
    const expiry = result.reservationExpiresAt
      ? new Date(result.reservationExpiresAt).toLocaleString('es-AR')
      : null
    try {
      await resend.emails.send({
        from: emailFrom,
        to: input.customer.email,
        subject: `Recibimos tu pedido ${result.orderNumber}`,
        html: `<h1>Pedido ${escapeHtml(result.orderNumber)}</h1>
          <p>Hola ${escapeHtml(input.customer.name)}, recibimos tu pedido.</p>
          ${expiry ? `<p>Tu stock está reservado hasta el <strong>${escapeHtml(expiry)}</strong>.</p>` : '<p>El pedido pasó directamente a producción por cuenta corriente.</p>'}
          <p>Total confirmado: <strong>$${Number(result.total).toLocaleString('es-AR')}</strong>.</p>
          <p>Te contactaremos por este email con las próximas novedades.</p>`,
      })
    } catch (emailError) {
      console.error('Order created, but confirmation email failed:', emailError)
    }
  }

  return result
}
