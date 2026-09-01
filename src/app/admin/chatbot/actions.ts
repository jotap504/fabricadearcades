'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getAuthUser } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user || profile?.role !== 'admin') throw new Error('No autorizado')
  return supabase
}

export async function setChatbotConversationMode(conversationId: string, mode: 'BOT' | 'HUMAN' | 'PAUSED') {
  const supabase = await requireAdmin()
  const updates: Record<string, string | null> = { mode }
  if (mode === 'BOT') {
    updates.handoff_reason = null
    updates.bot_resumed_at = new Date().toISOString()
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
  if (!apiKey) throw new Error('Falta EMBEDDING_API_KEY en el servidor.')

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: text }),
  })
  if (!response.ok) throw new Error(`No se pudo generar embedding: ${response.status}`)
  const data = await response.json() as { data?: Array<{ embedding: number[] }> }
  const embedding = data.data?.[0]?.embedding
  if (!embedding) throw new Error('El proveedor no devolvió embedding.')
  return embedding
}

export async function regenerateKnowledgeEmbedding(knowledgeId: string) {
  const supabase = await requireAdmin()
  const { data: item, error } = await supabase
    .from('chatbot_knowledge_items')
    .select('id,title,content')
    .eq('id', knowledgeId)
    .single()
  if (error) throw new Error(error.message)

  const embedding = await createEmbedding(`${item.title}\n\n${item.content}`)
  const { data: updated, error: updateError } = await supabase
    .from('chatbot_knowledge_items')
    .update({ embedding })
    .eq('id', knowledgeId)
    .select('id,category,title,content,active,priority,updated_at')
    .single()
  if (updateError) throw new Error(updateError.message)

  revalidatePath('/admin/chatbot/conocimiento')
  return updated
}
