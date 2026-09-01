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
  const content = extractText(data?.message ?? data?.message?.message ?? data)

  if (!externalMessageId || !phone || !content) return null

  return {
    externalMessageId,
    phone,
    displayName: data?.pushName ?? data?.notifyName,
    direction: fromMe ? 'outbound' : 'inbound',
    senderType: fromMe ? 'human' : 'customer',
    content,
    raw: payload,
  }
}
