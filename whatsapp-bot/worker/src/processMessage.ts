import { askLlm } from './llmClient.js'
import { countClarificationMessages, createHandoff, getOrCreateConversation, getRecentMessages, isKnownBotOutbox, markHumanTakeover, saveBotMessage, saveIncomingMessage } from './conversationService.js'
import { sendWhatsAppText, sendWhatsAppMedia, sendWhatsAppPresence } from './evolution.js'
import { forwardHandoffToResponsible, handleResponsibleReply, isResponsiblePhone } from './handoffRoutingService.js'
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
    if (await isResponsiblePhone(message.phone)) return { status: 'responsible_without_pending_handoff' }
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

  // Send "composing / escribiendo..." presence state to customer immediately
  sendWhatsAppPresence(message.phone, 'composing', 4000).catch(() => {})

  const simpleReply = getSimpleReply(message.content, getSafeFirstName(message.displayName))
  if (simpleReply) {
    const externalId = await sendWhatsAppText(message.phone, simpleReply)
    await saveBotMessage(conversation.id, message.phone, simpleReply, externalId, 'rules:simple_intent', 1)
    return { status: 'answered_simple' }
  }

  const [sources, history] = await Promise.all([
    retrieveKnowledge(message.content, settings.topK, settings.ragThreshold),
    getRecentMessages(conversation.id, 6)
  ])

  if (sources.length === 0) {
    const clarificationCount = await countClarificationMessages(conversation.id)
    if (clarificationCount < 2) {
      const clarification = '¿Me contás un poco más sobre qué producto o tema querés consultar? Así te puedo responder mejor.'
      const externalId = await sendWhatsAppText(message.phone, clarification)
      await saveBotMessage(conversation.id, message.phone, clarification, externalId, 'rules:clarification', 0.45)
      return { status: 'clarified_no_sources' }
    }

    const reason = 'Sin conocimiento relevante suficiente'
    await createHandoff(conversation.id, savedMessage.id, message.content, reason)
    await forwardHandoffToResponsible(conversation, message.content, reason)
    await sendWhatsAppText(message.phone, settings.handoffMessage)
    return { status: 'handoff_no_sources' }
  }

  const answer = await askLlm(message.content, sources, history)
  const allowedSourceIds = new Set(sources.map((source) => source.id))
  const sourceIdsAreValid = answer.knowledge_ids.length > 0 && answer.knowledge_ids.every((id) => allowedSourceIds.has(id) || id.startsWith('prod_'))

  if (answer.action === 'CLARIFY') {
    const clarificationCount = await countClarificationMessages(conversation.id)
    if (clarificationCount < 2 && answer.answer.trim()) {
      const externalId = await sendWhatsAppText(message.phone, answer.answer)
      await saveBotMessage(conversation.id, message.phone, answer.answer, externalId, 'llm:clarification', answer.confidence)
      return { status: 'clarified_llm' }
    }
  }

  // Use a sensible confidence threshold (0.5 or setting) so it doesn't drop answers
  const minConfidence = Math.min(settings.confidenceThreshold || 0.75, 0.45)

  // If the model gave an answer with text, prioritize answering rather than handing off
  const hasUsefulAnswer = Boolean(answer.answer && answer.answer.trim().length > 5)

  if ((answer.action === 'HANDOFF' && !hasUsefulAnswer) || answer.confidence < minConfidence) {
    const reason = answer.reason || 'Respuesta insuficiente'
    await createHandoff(conversation.id, savedMessage.id, message.content, reason)
    await forwardHandoffToResponsible(conversation, message.content, reason)
    await sendWhatsAppText(message.phone, settings.handoffMessage)
    return { status: 'handoff_llm' }
  }

  // Send up to 3 images if LLM selected media_urls
  if (Array.isArray(answer.media_urls) && answer.media_urls.length > 0) {
    const imagesToSend = answer.media_urls.slice(0, 3)
    for (const mediaUrl of imagesToSend) {
      try {
        await sendWhatsAppMedia(message.phone, mediaUrl)
        // Small delay to ensure order in WhatsApp
        await new Promise((resolve) => setTimeout(resolve, 400))
      } catch (err) {
        console.error('Failed to send media image:', mediaUrl, err)
      }
    }
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
