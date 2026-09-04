import { z } from 'zod'
import type { NormalizedMessage } from './types.js'

const webhookSchema = z.object({
  event: z.string().optional(),
  data: z.any().optional(),
  sender: z.string().optional(),
  instance: z.string().optional(),
}).passthrough()

function cleanPhone(remoteJid: string | undefined): string | null {
  if (!remoteJid) return null
  return remoteJid.replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@lid/g, '')
}

function extractText(message: any): string {
  return (
    message?.conversation
    ?? message?.extendedTextMessage?.text
    ?? message?.text
    ?? message?.message?.conversation
    ?? message?.message?.extendedTextMessage?.text
    ?? ''
  ).trim()
}

function normalizeEvent(event: string | undefined): string {
  return (event ?? '').replace(/\./g, '_').toUpperCase()
}

function extractContextInfo(message: any): { id?: string; text?: string; participant?: string } | undefined {
  const contextInfo =
    message?.extendedTextMessage?.contextInfo
    ?? message?.message?.extendedTextMessage?.contextInfo
    ?? message?.contextInfo

  if (!contextInfo) return undefined

  const stanzaId = contextInfo.stanzaId
  const participant = contextInfo.participant ? cleanPhone(contextInfo.participant) : undefined
  const quotedText = extractText(contextInfo.quotedMessage)

  if (!stanzaId && !quotedText) return undefined

  return {
    id: stanzaId,
    text: quotedText || undefined,
    participant: participant || undefined,
  }
}

function extractMediaInfo(message: any): { mediaType?: 'image' | 'video' | 'audio' | 'document'; caption?: string; base64?: string; url?: string } | null {
  const msg = message?.message ?? message
  if (msg?.imageMessage) {
    return {
      mediaType: 'image',
      caption: msg.imageMessage.caption?.trim() || '',
      base64: msg.imageMessage.base64 || msg.base64 || undefined,
      url: msg.imageMessage.url || undefined,
    }
  }
  if (msg?.videoMessage) {
    return {
      mediaType: 'video',
      caption: msg.videoMessage.caption?.trim() || '',
      base64: msg.videoMessage.base64 || msg.base64 || undefined,
      url: msg.videoMessage.url || undefined,
    }
  }
  if (msg?.documentMessage) {
    return {
      mediaType: 'document',
      caption: msg.documentMessage.caption?.trim() || msg.documentMessage.fileName || '',
      base64: msg.documentMessage.base64 || msg.base64 || undefined,
      url: msg.documentMessage.url || undefined,
    }
  }
  return null
}

export function normalizeEvolutionWebhook(payload: unknown): NormalizedMessage | null {
  const parsed = webhookSchema.safeParse(payload)
  if (!parsed.success) return null

  const event = normalizeEvent(parsed.data.event)
  if (event && !['MESSAGES_UPSERT', 'SEND_MESSAGE'].includes(event)) return null

  const data = Array.isArray(parsed.data.data) ? parsed.data.data[0] : parsed.data.data
  const key = data?.key ?? data?.message?.key
  const externalMessageId = key?.id ?? data?.id ?? data?.message?.id
  const phone = cleanPhone(
    key?.remoteJidAlt
    ?? data?.remoteJidAlt
    ?? parsed.data.sender
    ?? data?.sender
    ?? key?.remoteJid
    ?? data?.remoteJid
    ?? data?.from
    ?? data?.key?.remoteJid,
  )
  const fromMe = Boolean(key?.fromMe ?? data?.fromMe)
  const mediaInfo = extractMediaInfo(data?.message ?? data?.message?.message ?? data)
  const rawContent = extractText(data?.message ?? data?.message?.message ?? data)
  const content = rawContent || mediaInfo?.caption || (mediaInfo ? `[${mediaInfo.mediaType?.toUpperCase()}]` : '')
  const quotedMessage = extractContextInfo(data?.message ?? data?.message?.message ?? data)

  if (!externalMessageId || !phone || (!content && !mediaInfo)) return null

  return {
    externalMessageId,
    phone,
    displayName: data?.pushName ?? data?.notifyName,
    direction: fromMe ? 'outbound' : 'inbound',
    senderType: fromMe ? 'human' : 'customer',
    content: content || '[FOTO]',
    mediaType: mediaInfo?.mediaType,
    mediaBase64: mediaInfo?.base64,
    mediaUrl: mediaInfo?.url,
    raw: payload,
    quotedMessage,
  }
}
