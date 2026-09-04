'use server'

import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import type { ArcadeCustomization, PaymentMethod, ShippingAddress } from '@/lib/types'
import { createPreference, pickCheckoutUrl } from '@/lib/mercadopago/client'
import { isMercadoPagoConfigured } from '@/lib/mercadopago/config'

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

export type CreateStoreOrderResponse =
  | { success: true; data: CreatedOrderResult }
  | { success: false; error: string }

export async function createStoreOrder(input: CheckoutOrderInput): Promise<CreateStoreOrderResponse> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('create_store_order', {
      p_customer: input.customer,
      p_shipping: input.shipping,
      p_payment_method: input.paymentMethod,
      p_notes: input.notes,
      p_items: input.items,
    })

    if (error) {
      console.error('Error in create_store_order RPC:', error)
      return { success: false, error: error.message || 'No se pudo crear el pedido' }
    }

    const result = data as CreatedOrderResult
    const resendKey = process.env.RESEND_API_KEY
    const emailFrom = process.env.ORDER_EMAIL_FROM
    if (resendKey && emailFrom && !resendKey.includes('your-')) {
      try {
        const resend = new Resend(resendKey)
        const escapeHtml = (value: string) =>
          value.replace(/[&<>'"]/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
          })[char] ?? char)
        const expiry = result.reservationExpiresAt
          ? new Date(result.reservationExpiresAt).toLocaleString('es-AR')
          : null

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

    return { success: true, data: result }
  } catch (err: any) {
    console.error('Unexpected error in createStoreOrder:', err)
    return { success: false, error: err?.message || 'Error inesperado al crear el pedido' }
  }
}

export interface MercadoPagoCheckoutInput {
  orderId: string
  orderNumber: string
  payerEmail: string
  payerName: string
  total: number
  items: Array<{ title: string; quantity: number }>
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') || parts[0] || '' }
}

export type CreateMercadoPagoCheckoutResponse =
  | { success: true; checkoutUrl: string }
  | { success: false; error: string }

export async function createMercadoPagoCheckout(input: MercadoPagoCheckoutInput): Promise<CreateMercadoPagoCheckoutResponse> {
  try {
    if (!(await isMercadoPagoConfigured())) {
      return { success: false, error: 'MercadoPago no está configurado todavía. Elegí otro método de pago.' }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const { firstName, lastName } = splitName(input.payerName)
    const description = input.items.map((item) => `${item.quantity}x ${item.title}`).join(', ')

    const preference = await createPreference({
      items: [
        {
          title: `Pedido ${input.orderNumber} — Fábrica de Arcades`,
          description: description.slice(0, 250),
          quantity: 1,
          unit_price: input.total,
        },
      ],
      payerEmail: input.payerEmail,
      payerFirstName: firstName,
      payerLastName: lastName,
      externalReference: input.orderId,
      backUrls: {
        success: `${appUrl}/checkout/mercadopago/retorno?outcome=approved`,
        failure: `${appUrl}/checkout/mercadopago/retorno?outcome=failure`,
        pending: `${appUrl}/checkout/mercadopago/retorno?outcome=pending`,
      },
      notificationUrl: `${appUrl}/api/mercadopago/webhook`,
      statementDescriptor: 'FABRICARCADE',
    })

    const checkoutUrl = await pickCheckoutUrl(preference)
    return { success: true, checkoutUrl }
  } catch (err: any) {
    console.error('Unexpected error in createMercadoPagoCheckout:', err)
    return { success: false, error: err?.message || 'Error al conectar con MercadoPago' }
  }
}
