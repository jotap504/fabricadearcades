import { z } from 'zod'
import type { NormalizedMessage } from './types.js'

const webhookSchema = z.object({
  event: z.string().optional(),
  data: z.any().optional(),
  instance: z.string().optional(),
})

function cleanPhone(remoteJid: string | undefined): string | null {
  if (!remoteJid) return null
  return remoteJid.replace(/@s\.whatsapp\.net|@c\.us|@g\.us/g, '')
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

export function normalizeEvolutionWebhook(payload: unknown): NormalizedMessage | null {
  const parsed = webhookSchema.safeParse(payload)
  if (!parsed.success) return null

  const event = parsed.data.event
  if (event && !['MESSAGES_UPSERT', 'SEND_MESSAGE'].includes(event)) return null

  const data = parsed.data.data
  const key = data?.key ?? data?.message?.key
  const externalMessageId = key?.id ?? data?.id
  const phone = cleanPhone(key?.remoteJid ?? data?.remoteJid ?? data?.from)
  const fromMe = Boolean(key?.fromMe ?? data?.fromMe)
  const content = extractText(data?.message ?? data)

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
