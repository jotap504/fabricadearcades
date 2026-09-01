import { sendWhatsAppText } from './evolution.js'
import { supabase } from './supabase.js'

type HandoffRoute = {
  route_key: string
  label: string
  responsible_phone: string
  keywords: string[]
  priority: number
}

type ConversationForHandoff = {
  id: string
  phone: string
  display_name?: string | null
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, '')
}

async function getActiveRoutes() {
  const { data, error } = await supabase
    .from('chatbot_handoff_routes')
    .select('route_key,label,responsible_phone,keywords,priority')
    .eq('active', true)
    .order('priority', { ascending: false })

  if (error) throw error
  return (data ?? []) as HandoffRoute[]
}

function pickRoute(routes: HandoffRoute[], question: string) {
  const normalizedQuestion = normalizeText(question)
  return routes.find((route) =>
    route.keywords.some((keyword) => normalizedQuestion.includes(normalizeText(keyword))),
  ) ?? routes.find((route) => route.route_key === 'arcades') ?? routes[0] ?? null
}

function buildForwardMessage(route: HandoffRoute, conversation: ConversationForHandoff, question: string, reason: string) {
  const name = conversation.display_name ? `\nCliente: ${conversation.display_name}` : ''
  return [
    `📩 Consulta derivada (${route.label})`,
    name.trim(),
    `Teléfono cliente: ${conversation.phone}`,
    `Motivo: ${reason}`,
    '',
    `Mensaje: ${question}`,
    '',
    'Respondé este WhatsApp y envío tu respuesta al cliente automáticamente.',
  ].filter(Boolean).join('\n')
}

export async function forwardHandoffToResponsible(
  conversation: ConversationForHandoff,
  question: string,
  reason: string,
) {
  const routes = await getActiveRoutes()
  const route = pickRoute(routes, question)
  if (!route) return null

  const responsiblePhone = cleanPhone(route.responsible_phone)
  const forwardText = buildForwardMessage(route, conversation, question, reason)
  const externalId = await sendWhatsAppText(responsiblePhone, forwardText)

  const { error } = await supabase.from('chatbot_handoff_requests').insert({
    conversation_id: conversation.id,
    customer_phone: conversation.phone,
    responsible_phone: responsiblePhone,
    route_key: route.route_key,
    question,
    forwarded_message_id: externalId,
  })

  if (error) throw error

  await supabase.from('chatbot_audit_log').insert({
    event_type: 'handoff_forwarded',
    conversation_id: conversation.id,
    metadata: {
      route_key: route.route_key,
      responsible_phone: responsiblePhone,
      reason,
      forwarded_message_id: externalId,
    },
  })

  return route
}

export async function handleResponsibleReply(responsiblePhone: string, answer: string, externalMessageId: string) {
  const phone = cleanPhone(responsiblePhone)
  const { data: pending, error } = await supabase
    .from('chatbot_handoff_requests')
    .select('id,conversation_id,customer_phone,route_key')
    .eq('responsible_phone', phone)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!pending) return null

  const sentId = await sendWhatsAppText(pending.customer_phone, answer)
  const { data: savedMessage, error: messageError } = await supabase
    .from('chatbot_messages')
    .insert({
      conversation_id: pending.conversation_id,
      external_message_id: sentId,
      direction: 'outbound',
      sender_type: 'human',
      content: answer,
      raw_payload: { source: 'responsible_whatsapp', responsible_phone: phone, inbound_external_message_id: externalMessageId },
      handled_by: phone,
      human_generated: true,
    })
    .select('id')
    .single()

  if (messageError) throw messageError

  await supabase.from('chatbot_outbox').insert({
    conversation_id: pending.conversation_id,
    external_message_id: sentId,
    content: answer,
    status: 'sent',
    provider_response: { phone: pending.customer_phone, source: 'responsible_whatsapp' },
  })

  await supabase
    .from('chatbot_handoff_requests')
    .update({
      status: 'answered',
      response_message_id: savedMessage.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', pending.id)

  await supabase
    .from('chatbot_conversations')
    .update({
      mode: 'HUMAN',
      sales_status: 'HUMAN_ACTIVE',
      handoff_reason: 'Respondido por responsable vía WhatsApp',
      pending_count: 0,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', pending.conversation_id)

  await supabase.from('chatbot_audit_log').insert({
    event_type: 'handoff_responsible_reply_forwarded',
    conversation_id: pending.conversation_id,
    metadata: {
      route_key: pending.route_key,
      responsible_phone: phone,
      customer_phone: pending.customer_phone,
      inbound_external_message_id: externalMessageId,
      outbound_external_message_id: sentId,
    },
  })

  return { conversationId: pending.conversation_id, customerPhone: pending.customer_phone }
}
