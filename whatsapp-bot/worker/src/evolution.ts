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

export async function sendWhatsAppBase64Media(
  phone: string,
  base64: string,
  mediaType: 'image' | 'video' | 'audio' | 'document' = 'image',
  caption?: string,
  fileName?: string
): Promise<string | null> {
  const url = new URL(`/message/sendMedia/${config.EVOLUTION_INSTANCE}`, config.EVOLUTION_API_URL)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: phone,
      mediatype: mediaType,
      media: base64,
      caption: caption ?? '',
      ...(fileName ? { fileName } : {}),
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`Evolution sendWhatsAppBase64Media failed: ${response.status} ${body}`)
    return null
  }

  const data = (await response.json()) as SendTextResult
  return data.key?.id ?? data.messageId ?? data.id ?? null
}

export async function getMediaBase64(messageKeyOrId: any): Promise<string | null> {
  try {
    const url = new URL(`/chat/getBase64FromMediaMessage/${config.EVOLUTION_INSTANCE}`, config.EVOLUTION_API_URL)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        message: messageKeyOrId,
        convertToMp4: false,
      }),
    })

    if (!response.ok) return null
    const data = (await response.json()) as { base64?: string }
    return data.base64 ?? null
  } catch (err) {
    console.error('Failed to getBase64FromMediaMessage:', err)
    return null
  }
}

export async function sendWhatsAppPresence(phone: string, presence: 'composing' | 'paused' = 'composing', delayMs: number = 3000): Promise<void> {
  try {
    const url = new URL(`/chat/sendPresence/${config.EVOLUTION_INSTANCE}`, config.EVOLUTION_API_URL)
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone,
        presence,
        delay: delayMs,
      }),
    })
  } catch (err) {
    console.error('Evolution sendPresence failed:', err)
  }
}
