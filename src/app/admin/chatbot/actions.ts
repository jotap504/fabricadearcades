'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { appendChatbotApiPath } from '@/lib/chatbot/status'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user || profile?.role !== 'admin') throw new Error('No autorizado')
  return supabase
}

export async function setChatbotConversationMode(conversationId: string, mode: 'BOT' | 'HUMAN' | 'PAUSED') {
  const supabase = await requireAdmin()
  const updates: Record<string, string | number | null> = {
    mode,
    sales_status: mode === 'BOT' ? 'BOT_ACTIVE' : mode === 'HUMAN' ? 'HUMAN_ACTIVE' : 'HUMAN_REQUIRED',
  }
  if (mode === 'BOT') {
    updates.handoff_reason = null
    updates.bot_resumed_at = new Date().toISOString()
    updates.pending_count = 0
  }
  const { error } = await supabase
    .from('chatbot_conversations')
    .update(updates)
    .eq('id', conversationId)
  if (error) throw new Error(error.message)

  await supabase.from('chatbot_audit_log').insert({
    event_type: `admin_set_${mode.toLowerCase()}`,
    conversation_id: conversationId,
    metadata: {},
  })

  revalidatePath('/admin/chatbot')
  revalidatePath('/admin/chatbot/conversaciones')
}

async function sendWhatsAppText(phone: string, text: string) {
  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  const evolutionInstance = process.env.EVOLUTION_INSTANCE
  const proxyToken = process.env.WHATSAPP_PROXY_TOKEN

  if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
    throw new Error('Faltan variables de WhatsApp/Evolution en Vercel.')
  }

  const response = await fetch(appendChatbotApiPath(evolutionUrl, `/message/sendText/${evolutionInstance}`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: evolutionKey,
      ...(proxyToken ? { 'X-Internal-Proxy-Token': proxyToken } : {}),
    },
    body: JSON.stringify({ number: phone, text }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`No se pudo enviar el WhatsApp (${response.status}): ${body.slice(0, 240)}`)
  }

  const data = await response.json() as { key?: { id?: string }; messageId?: string; id?: string }
  return data.key?.id ?? data.messageId ?? data.id ?? null
}

export async function sendChatbotConversationReply(conversationId: string, content: string, returnToBot = false) {
  const supabase = await requireAdmin()
  const cleanContent = content.trim()
  if (!cleanContent) throw new Error('Escribí una respuesta antes de enviar.')

  const { data: conversation, error: conversationError } = await supabase
    .from('chatbot_conversations')
    .select('id,phone,mode')
    .eq('id', conversationId)
    .single()
  if (conversationError) throw new Error(conversationError.message)

  const externalId = await sendWhatsAppText(conversation.phone, cleanContent)

  const { error: messageError } = await supabase
    .from('chatbot_messages')
    .insert({
      conversation_id: conversation.id,
      external_message_id: externalId,
      direction: 'outbound',
      sender_type: 'human',
      content: cleanContent,
      handled_by: 'admin_panel',
      raw_payload: { source: 'admin_panel', return_to_bot: returnToBot },
      human_generated: true,
    })
  if (messageError) throw new Error(messageError.message)

  await supabase.from('chatbot_outbox').insert({
    conversation_id: conversation.id,
    external_message_id: externalId,
    content: cleanContent,
    status: 'sent',
    provider_response: { source: 'admin_panel' },
  })

  const { error: updateError } = await supabase
    .from('chatbot_conversations')
    .update({
      mode: returnToBot ? 'BOT' : 'HUMAN',
      handoff_reason: returnToBot ? null : 'Atendido desde el panel',
      bot_resumed_at: returnToBot ? new Date().toISOString() : null,
      pending_count: 0,
      sales_status: returnToBot ? 'BOT_ACTIVE' : 'HUMAN_ACTIVE',
    })
    .eq('id', conversation.id)
  if (updateError) throw new Error(updateError.message)

  await supabase.from('chatbot_audit_log').insert({
    event_type: returnToBot ? 'admin_reply_return_to_bot' : 'admin_reply_takeover',
    conversation_id: conversation.id,
    metadata: { content_length: cleanContent.length },
  })

  revalidatePath('/admin/chatbot')
  revalidatePath('/admin/chatbot/conversaciones')
}

export async function learnUnansweredQuestion(questionId: string, title: string, content: string, category = 'preguntas frecuentes') {
  const supabase = await requireAdmin()
  const cleanTitle = title.trim()
  const cleanContent = content.trim()
  if (!cleanTitle || !cleanContent) throw new Error('Completá título y contenido.')

  const { data: question, error: questionError } = await supabase
    .from('chatbot_unanswered_questions')
    .select('id,status')
    .eq('id', questionId)
    .single()
  if (questionError) throw new Error(questionError.message)
  if (!question || question.status !== 'open') throw new Error('La pregunta ya no está abierta.')

  const { error: insertError } = await supabase
    .from('chatbot_knowledge_items')
    .insert({
      category,
      title: cleanTitle,
      content: cleanContent,
      active: false,
      priority: 0,
      embedding: null,
    })
  if (insertError) throw new Error(insertError.message)

  const { error: updateError } = await supabase
    .from('chatbot_unanswered_questions')
    .update({
      status: 'learned',
      resolved_at: new Date().toISOString(),
      human_answer: cleanContent,
    })
    .eq('id', questionId)
  if (updateError) throw new Error(updateError.message)

  revalidatePath('/admin/chatbot')
  revalidatePath('/admin/chatbot/conocimiento')
  revalidatePath('/admin/chatbot/sin-respuesta')
}

export async function dismissUnansweredQuestion(questionId: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('chatbot_unanswered_questions')
    .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
    .eq('id', questionId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/chatbot/sin-respuesta')
}

async function createEmbedding(text: string) {
  const apiKey = process.env.EMBEDDING_API_KEY
  const model = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small'
  if (!apiKey) {
    return {
      ok: false as const,
      message: 'Falta configurar EMBEDDING_API_KEY en Vercel. El bot puede seguir usando la búsqueda por texto, pero para búsqueda semántica real hay que cargar una clave de embeddings.',
    }
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: text }),
  })
  if (!response.ok) {
    const body = await response.text()
    return {
      ok: false as const,
      message: `El proveedor de embeddings rechazó la solicitud (${response.status}). Revisá que EMBEDDING_API_KEY y EMBEDDING_MODEL sean correctos. ${body.slice(0, 180)}`,
    }
  }
  const data = await response.json() as { data?: Array<{ embedding: number[] }> }
  const embedding = data.data?.[0]?.embedding
  if (!embedding) {
    return {
      ok: false as const,
      message: 'El proveedor respondió, pero no devolvió un embedding válido.',
    }
  }
  return { ok: true as const, embedding }
}

export async function regenerateKnowledgeEmbedding(knowledgeId: string) {
  const supabase = await requireAdmin()
  const { data: item, error } = await supabase
    .from('chatbot_knowledge_items')
    .select('id,title,content')
    .eq('id', knowledgeId)
    .single()
  if (error) throw new Error(error.message)

  const embeddingResult = await createEmbedding(`${item.title}\n\n${item.content}`)
  if (!embeddingResult.ok) return embeddingResult

  const { data: updated, error: updateError } = await supabase
    .from('chatbot_knowledge_items')
    .update({ embedding: embeddingResult.embedding })
    .eq('id', knowledgeId)
    .select('id,category,title,content,active,priority,updated_at')
    .single()
  if (updateError) throw new Error(updateError.message)

  revalidatePath('/admin/chatbot/conocimiento')
  return { ok: true as const, item: updated }
}
