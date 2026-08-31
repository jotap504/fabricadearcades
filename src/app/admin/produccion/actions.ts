'use server'

import { Resend } from 'resend'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import type { ProductionStatus } from '@/lib/types'

const STATUS_EMAIL: Partial<Record<ProductionStatus, { subject: string; message: string }>> = {
  in_progress: {
    subject: 'Tu arcade entró en producción',
    message: 'Ya comenzamos a fabricar tu equipo.',
  },
  finished: {
    subject: 'Tu arcade está terminado',
    message: 'Tu equipo terminó la etapa de fabricación y pronto estará listo para entrega.',
  },
  dispatched: {
    subject: 'Tu pedido fue despachado',
    message: 'Tu pedido ya está en camino.',
  },
}

async function requireStaff() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user || !profile || !['admin', 'fabricante'].includes(profile.role)) {
    throw new Error('No autorizado')
  }
  return { supabase, profile }
}

export async function updateProductionStatus(itemId: string, status: ProductionStatus) {
  const { supabase } = await requireStaff()
  const now = new Date().toISOString()
  const updates: Record<string, string> = { status, updated_at: now }
  if (status === 'in_progress') updates.started_at = now
  if (status === 'finished') updates.finished_at = now
  if (status === 'dispatched') updates.dispatched_at = now

  const { data: item, error } = await supabase
    .from('production_queue')
    .update(updates)
    .eq('id', itemId)
    .select('*, order:orders(order_number, customer_name, customer_email)')
    .single()
  if (error) throw new Error(error.message)

  const email = STATUS_EMAIL[status]
  const resendKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.ORDER_EMAIL_FROM
  if (email && resendKey && emailFrom && !resendKey.includes('your-') && item.order?.customer_email) {
    try {
      const resend = new Resend(resendKey)
      await resend.emails.send({
        from: emailFrom,
        to: item.order.customer_email,
        subject: `${email.subject} · ${item.order.order_number}`,
        text: `Hola ${item.order.customer_name},\n\n${email.message}\n\nPedido: ${item.order.order_number}`,
      })
    } catch (emailError) {
      console.error('Production updated, but email failed:', emailError)
    }
  }
  return updates
}

export async function assignProductionItem(itemId: string, fabricanteId: string | null) {
  const { supabase, profile } = await requireStaff()
  if (profile.role !== 'admin') throw new Error('Sólo administración puede asignar fabricantes')
  const { error } = await supabase
    .from('production_queue')
    .update({ assigned_to: fabricanteId })
    .eq('id', itemId)
  if (error) throw new Error(error.message)
}
