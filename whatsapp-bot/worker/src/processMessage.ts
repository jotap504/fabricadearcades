import { askLlm } from './llmClient.js'
import { createHandoff, getOrCreateConversation, isKnownBotOutbox, markHumanTakeover, saveBotMessage, saveIncomingMessage } from './conversationService.js'
import { sendWhatsAppText } from './evolution.js'
import { forwardHandoffToResponsible, handleResponsibleReply } from './handoffRoutingService.js'
import { retrieveKnowledge } from './ragService.js'
import { getBotSettings } from './settingsService.js'
import { getSafeFirstName, getSimpleReply } from './simpleIntents.js'
import type { NormalizedMessage } from './types.js'

export async function processMessage(message: NormalizedMessage) {
  if (message.direction === 'outbound' && await isKnownBotOutbox(message.externalMessageId)) {
    return { status: 'bot_outbox_echo' }
  }

  if (message.direction === 'inbound') {
    const responsibleReply = await handleResponsibleReply(message.phone, message.content, message.externalMessageId)
    if (responsibleReply) return { status: 'responsible_reply_forwarded' }
  }

  const conversation = await getOrCreateConversation(message)

  if (message.direction === 'outbound' && message.senderType === 'human') {
    await markHumanTakeover(conversation.id, 'Mensaje saliente detectado desde WhatsApp')
    await saveIncomingMessage(conversation.id, message)
    return { status: 'human_takeover' }
  }

  const savedMessage = await saveIncomingMessage(conversation.id, message)
  if (!savedMessage) return { status: 'duplicate' }

  const settings = await getBotSettings()
  if (!settings.botActive) return { status: 'bot_inactive' }
  if (conversation.mode !== 'BOT') return { status: `conversation_${conversation.mode.toLowerCase()}` }

  const simpleReply = getSimpleReply(message.content, getSafeFirstName(message.displayName))
  if (simpleReply) {
    const externalId = await sendWhatsAppText(message.phone, simpleReply)
    await saveBotMessage(conversation.id, message.phone, simpleReply, externalId, 'rules:simple_intent', 1)
    return { status: 'answered_simple' }
  }

  const sources = await retrieveKnowledge(message.content, settings.topK, settings.ragThreshold)
  if (sources.length === 0) {
    const reason = 'Sin conocimiento relevante suficiente'
    await createHandoff(conversation.id, savedMessage.id, message.content, reason)
    await forwardHandoffToResponsible(conversation, message.content, reason)
    await sendWhatsAppText(message.phone, settings.handoffMessage)
    return { status: 'handoff_no_sources' }
  }

  const answer = await askLlm(message.content, sources)
  const allowedSourceIds = new Set(sources.map((source) => source.id))
  const sourceIdsAreValid = answer.knowledge_ids.length > 0 && answer.knowledge_ids.every((id) => allowedSourceIds.has(id))

  if (answer.action !== 'ANSWER' || answer.confidence < settings.confidenceThreshold || !sourceIdsAreValid) {
    const reason = answer.reason || 'Respuesta insuficiente'
    await createHandoff(conversation.id, savedMessage.id, message.content, reason)
    await forwardHandoffToResponsible(conversation, message.content, reason)
    await sendWhatsAppText(message.phone, settings.handoffMessage)
    return { status: 'handoff_llm' }
  }

  const externalId = await sendWhatsAppText(message.phone, answer.answer)
  const botMessage = await saveBotMessage(conversation.id, message.phone, answer.answer, externalId, configModel(), answer.confidence)
  await saveAnswerSources(botMessage.id, answer.knowledge_ids, sources)
  return { status: 'answered_llm' }
}

function configModel() {
  return process.env.LLM_MODEL ?? 'deepseek/deepseek-chat-v3.1'
}

async function saveAnswerSources(messageId: string, knowledgeIds: string[], sources: Array<{ id: string; similarity: number }>) {
  const byId = new Map(sources.map((source) => [source.id, source.similarity]))
  const rows = knowledgeIds.map((id) => ({
    message_id: messageId,
    knowledge_item_id: id,
    similarity: byId.get(id) ?? 0,
  }))
  const { supabase } = await import('./supabase.js')
  await supabase.from('chatbot_answer_sources').insert(rows)
}
