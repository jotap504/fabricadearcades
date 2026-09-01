import { supabase } from './supabase.js'
import type { ConversationMode, NormalizedMessage } from './types.js'

export async function getOrCreateConversation(message: NormalizedMessage) {
  const { data: existing, error: selectError } = await supabase
    .from('chatbot_conversations')
    .select('*')
    .eq('phone', message.phone)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing) return existing as { id: string; phone: string; display_name: string | null; mode: ConversationMode }

  const { data, error } = await supabase
    .from('chatbot_conversations')
    .insert({
      phone: message.phone,
      display_name: message.displayName ?? null,
      mode: 'BOT',
      last_message_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw error
  return data as { id: string; phone: string; display_name: string | null; mode: ConversationMode }
}

export async function saveIncomingMessage(conversationId: string, message: NormalizedMessage) {
  const { data, error } = await supabase
    .from('chatbot_messages')
    .insert({
      conversation_id: conversationId,
      external_message_id: message.externalMessageId,
      direction: message.direction,
      sender_type: message.senderType,
      content: message.content,
      raw_payload: message.raw,
      handled_by: message.senderType,
    })
    .select('*')
    .single()

  if (error && error.code === '23505') return null
  if (error) throw error

  await supabase
    .from('chatbot_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  return data as { id: string }
}

export async function markHumanTakeover(conversationId: string, reason: string) {
  await supabase
    .from('chatbot_conversations')
    .update({ mode: 'HUMAN', handoff_reason: reason })
    .eq('id', conversationId)

  await supabase.from('chatbot_audit_log').insert({
    event_type: 'human_takeover',
    conversation_id: conversationId,
    metadata: { reason },
  })
}

export async function isKnownBotOutbox(externalMessageId: string) {
  const { data, error } = await supabase
    .from('chatbot_outbox')
    .select('id')
    .eq('external_message_id', externalMessageId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export async function saveBotMessage(conversationId: string, phone: string, content: string, externalMessageId: string | null, model: string, confidence: number) {
  const { data, error } = await supabase
    .from('chatbot_messages')
    .insert({
      conversation_id: conversationId,
      external_message_id: externalMessageId,
      direction: 'outbound',
      sender_type: 'bot',
      content,
      handled_by: 'bot',
      model,
      confidence,
    })
    .select('*')
    .single()

  if (error) throw error

  await supabase.from('chatbot_outbox').insert({
    conversation_id: conversationId,
    external_message_id: externalMessageId,
    content,
    status: 'sent',
    provider_response: { phone },
  })

  return data as { id: string }
}

export async function countClarificationMessages(conversationId: string) {
  const { count, error } = await supabase
    .from('chatbot_messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('direction', 'outbound')
    .eq('sender_type', 'bot')
    .in('model', ['rules:clarification', 'llm:clarification'])

  if (error) throw error
  return count ?? 0
}

export async function createHandoff(conversationId: string, messageId: string | null, question: string, reason: string) {
  await supabase
    .from('chatbot_conversations')
    .update({ mode: 'HUMAN', handoff_reason: reason })
    .eq('id', conversationId)

  await supabase.from('chatbot_unanswered_questions').insert({
    conversation_id: conversationId,
    message_id: messageId,
    question,
    reason,
  })
}
