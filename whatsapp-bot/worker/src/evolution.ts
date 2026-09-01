import { config } from './config.js'

type SendTextResult = {
  key?: {
    id?: string
  }
  messageId?: string
  id?: string
}

export async function sendWhatsAppText(phone: string, text: string): Promise<string | null> {
  const url = new URL(`/message/sendText/${config.EVOLUTION_INSTANCE}`, config.EVOLUTION_API_URL)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: phone,
      text,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Evolution sendText failed: ${response.status} ${body}`)
  }

  const data = (await response.json()) as SendTextResult
  return data.key?.id ?? data.messageId ?? data.id ?? null
}

export async function sendWhatsAppMedia(phone: string, mediaUrl: string, caption?: string): Promise<string | null> {
  const url = new URL(`/message/sendMedia/${config.EVOLUTION_INSTANCE}`, config.EVOLUTION_API_URL)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: phone,
      mediatype: 'image',
      media: mediaUrl,
      caption: caption ?? '',
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`Evolution sendMedia failed: ${response.status} ${body}`)
    return null
  }

  const data = (await response.json()) as SendTextResult
  return data.key?.id ?? data.messageId ?? data.id ?? null
}
