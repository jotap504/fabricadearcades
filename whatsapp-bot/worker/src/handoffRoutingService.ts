import { sendWhatsAppText, sendWhatsAppMedia, sendWhatsAppBase64Media, getMediaBase64 } from './evolution.js'
import { supabase } from './supabase.js'
import type { NormalizedMessage } from './types.js'

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

function normalizePhoneDigits(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('549') && digits.length === 13) {
    return digits
  }
  if (digits.startsWith('54') && digits.length === 12) {
    return `549${digits.slice(2)}`
  }
  if (digits.startsWith('15') && digits.length === 10) {
    return `54911${digits.slice(2)}`
  }
  if (digits.length === 10 && digits.startsWith('11')) {
    return `549${digits}`
  }
  return digits
}

function matchesPhone(a: string, b: string) {
  const normA = normalizePhoneDigits(a)
  const normB = normalizePhoneDigits(b)
  if (normA === normB) return true
  // Match last 8 digits (local subscriber number, e.g. 64045074 or 53078610)
  if (normA.length >= 8 && normB.length >= 8) {
    return normA.slice(-8) === normB.slice(-8)
  }
  return false
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
  if (routes.length === 0) return null
  const normalizedQuestion = normalizeText(question)

  // 1. Check MercadoLibre route first
  const isMercadoLibre =
    normalizedQuestion.includes('mercadolibre') ||
    normalizedQuestion.includes('mercado libre') ||
    normalizedQuestion.includes('meli') ||
    normalizedQuestion.includes('publicacion') ||
    normalizedQuestion.includes('publicaciones') ||
    normalizedQuestion.includes('mla')
  if (isMercadoLibre) {
    const meliRoute = routes.find((r) => r.route_key === 'mercadolibre' || matchesPhone(r.responsible_phone, '5491131295019'))
    if (meliRoute) return meliRoute
  }

  // 2. Check keywords match across active routes
  for (const route of routes) {
    if (route.keywords && Array.isArray(route.keywords)) {
      const matched = route.keywords.some((kw) => {
        const normKw = normalizeText(kw)
        return normKw && normalizedQuestion.includes(normKw)
      })
      if (matched) return route
    }
  }

  // 3. Default fallback: Arcades route (5491164045074) or top priority route
  const arcadeRoute = routes.find((r) => r.route_key === 'arcades' || matchesPhone(r.responsible_phone, '5491164045074'))
  return arcadeRoute ?? routes[0] ?? null
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
    'Respondé este WhatsApp (con texto o fotos) y envío tu respuesta al cliente automáticamente.',
  ].filter(Boolean).join('\n')
}

export async function forwardHandoffToResponsible(
  conversation: ConversationForHandoff,
  question: string,
  reason: string,
  mediaMessage?: NormalizedMessage,
) {
  const routes = await getActiveRoutes()
  const route = pickRoute(routes, question)
  if (!route) return null

  const responsiblePhone = normalizePhoneDigits(route.responsible_phone)
  const forwardText = buildForwardMessage(route, conversation, question, reason)
  
  let externalId: string | null = null

  // If customer sent an image, forward the photo to the responsible seller
  if (mediaMessage?.mediaType === 'image') {
    const base64 = mediaMessage.mediaBase64 || (await getMediaBase64(mediaMessage.raw))
    if (base64) {
      externalId = await sendWhatsAppBase64Media(responsiblePhone, base64, 'image', forwardText)
    }
  }

  if (!externalId) {
    externalId = await sendWhatsAppText(responsiblePhone, forwardText)
  }

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
      has_media: Boolean(mediaMessage?.mediaType),
    },
  })

  return route
}

export async function forwardCustomerFollowupToResponsible(
  conversation: ConversationForHandoff,
  message: NormalizedMessage,
) {
  const messageText = message.content || '[FOTO]'

  // Find the most recent active or answered handoff request for this conversation
  const { data: lastRequest, error } = await supabase
    .from('chatbot_handoff_requests')
    .select('id,responsible_phone,route_key')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  let responsiblePhone: string | null = null
  let routeKey = 'arcades'

  if (lastRequest?.responsible_phone) {
    responsiblePhone = normalizePhoneDigits(lastRequest.responsible_phone)
    routeKey = lastRequest.route_key
  } else {
    const routes = await getActiveRoutes()
    const route = pickRoute(routes, messageText)
    if (route) {
      responsiblePhone = normalizePhoneDigits(route.responsible_phone)
      routeKey = route.route_key
    }
  }

  if (!responsiblePhone) return null

  const name = conversation.display_name ? ` (${conversation.display_name})` : ''
  const forwardText = [
    `💬 Nuevo mensaje de cliente${name}:`,
    `Tel: ${conversation.phone}`,
    '',
    messageText,
    '',
    'Respondé este WhatsApp (texto o fotos) para responderle al cliente.',
  ].join('\n')

  let externalId: string | null = null

  if (message.mediaType === 'image') {
    const base64 = message.mediaBase64 || (await getMediaBase64(message.raw))
    if (base64) {
      externalId = await sendWhatsAppBase64Media(responsiblePhone, base64, 'image', forwardText)
    }
  }

  if (!externalId) {
    externalId = await sendWhatsAppText(responsiblePhone, forwardText)
  }

  // Ensure there is a pending request waiting for response
  await supabase.from('chatbot_handoff_requests').insert({
    conversation_id: conversation.id,
    customer_phone: conversation.phone,
    responsible_phone: responsiblePhone,
    route_key: routeKey,
    question: messageText,
    forwarded_message_id: externalId,
    status: 'pending',
  })

  await supabase.from('chatbot_audit_log').insert({
    event_type: 'handoff_followup_forwarded',
    conversation_id: conversation.id,
    metadata: {
      route_key: routeKey,
      responsible_phone: responsiblePhone,
      forwarded_message_id: externalId,
      has_media: Boolean(message.mediaType),
    },
  })

  return { responsiblePhone, externalId }
}

export async function handleResponsibleReply(
  responsiblePhone: string,
  message: NormalizedMessage,
) {
  const answer = message.content || ''
  const externalMessageId = message.externalMessageId
  const quotedMessage = message.quotedMessage

  // 1. If the responsible user quoted/replied to a specific message, try to match by forwarded_message_id or phone extracted from quoted text
  let pending: { id: string; conversation_id: string; customer_phone: string; route_key: string } | null = null

  if (quotedMessage?.id) {
    const { data: matchedById } = await supabase
      .from('chatbot_handoff_requests')
      .select('id,conversation_id,customer_phone,route_key,responsible_phone')
      .eq('forwarded_message_id', quotedMessage.id)
      .limit(1)
      .maybeSingle()

    if (matchedById && matchesPhone(matchedById.responsible_phone, responsiblePhone)) {
      pending = matchedById
    }
  }

  // If not matched by message ID, check if the quoted text contains the customer phone (e.g. "Tel: 54911...")
  if (!pending && quotedMessage?.text) {
    const phoneMatch = quotedMessage.text.match(/Tel(?:éfono cliente)?:\s*(\+?\d[\d\s-]{7,15})/i)
    if (phoneMatch && phoneMatch[1]) {
      const extractedPhone = normalizePhoneDigits(phoneMatch[1])
      const { data: matchedByText } = await supabase
        .from('chatbot_handoff_requests')
        .select('id,conversation_id,customer_phone,route_key,responsible_phone')
        .order('created_at', { ascending: false })
        .limit(20)

      const found = (matchedByText ?? []).find(
        (item) => matchesPhone(item.responsible_phone, responsiblePhone) && matchesPhone(item.customer_phone, extractedPhone)
      )
      if (found) {
        pending = found
      }
    }
  }

  // 2. Fallback: match by the most recent pending request for this responsible phone
  if (!pending) {
    const { data: pendingList, error } = await supabase
      .from('chatbot_handoff_requests')
      .select('id,conversation_id,customer_phone,route_key,responsible_phone')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    if (!pendingList || pendingList.length === 0) return null

    pending = pendingList.find((item) => matchesPhone(item.responsible_phone, responsiblePhone)) ?? null
  }

  if (!pending) return null

  let sentId: string | null = null

  // If responsible sent an image/photo, forward the image directly to the customer
  if (message.mediaType === 'image') {
    const base64 = message.mediaBase64 || (await getMediaBase64(message.raw))
    if (base64) {
      sentId = await sendWhatsAppBase64Media(pending.customer_phone, base64, 'image', answer)
    }
  }

  if (!sentId) {
    sentId = await sendWhatsAppText(pending.customer_phone, answer)
  }

  const { data: savedMessage, error: messageError } = await supabase
    .from('chatbot_messages')
    .insert({
      conversation_id: pending.conversation_id,
      external_message_id: sentId,
      direction: 'outbound',
      sender_type: 'human',
      content: answer,
      raw_payload: {
        source: 'responsible_whatsapp',
        responsible_phone: responsiblePhone,
        inbound_external_message_id: externalMessageId,
        media_type: message.mediaType,
      },
      handled_by: responsiblePhone,
      human_generated: true,
      message_type: message.mediaType || 'text',
    })
    .select('id')
    .single()

  if (messageError) throw messageError

  await supabase.from('chatbot_outbox').insert({
    conversation_id: pending.conversation_id,
    external_message_id: sentId,
    content: answer,
    status: 'sent',
    provider_response: { phone: pending.customer_phone, source: 'responsible_whatsapp', media_type: message.mediaType },
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
      responsible_phone: responsiblePhone,
      customer_phone: pending.customer_phone,
      inbound_external_message_id: externalMessageId,
      outbound_external_message_id: sentId,
      media_type: message.mediaType,
    },
  })

  return { conversationId: pending.conversation_id, customerPhone: pending.customer_phone }
}

export async function isResponsiblePhone(phone: string) {
  const routes = await getActiveRoutes()
  return routes.some((route) => matchesPhone(route.responsible_phone, phone))
}
