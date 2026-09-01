import { config } from './config.js'
import { logger } from './logger.js'
import { processMessage } from './processMessage.js'
import type { NormalizedMessage } from './types.js'

const pendingByPhone = new Map<string, { timer: NodeJS.Timeout; messages: NormalizedMessage[] }>()

export function enqueueMessage(message: NormalizedMessage) {
  logger.info({ phone: message.phone, direction: message.direction }, 'message_queued')
  const existing = pendingByPhone.get(message.phone)
  if (existing) {
    clearTimeout(existing.timer)
    existing.messages.push(message)
    existing.timer = setTimeout(() => flush(message.phone), config.DEBOUNCE_MS)
    return
  }

  pendingByPhone.set(message.phone, {
    messages: [message],
    timer: setTimeout(() => flush(message.phone), config.DEBOUNCE_MS),
  })
}

async function flush(phone: string) {
  const batch = pendingByPhone.get(phone)
  if (!batch) return
  pendingByPhone.delete(phone)

  const inbound = batch.messages.filter((message) => message.direction === 'inbound')
  const outbound = batch.messages.filter((message) => message.direction === 'outbound')

  try {
    logger.info({ phone, count: batch.messages.length }, 'message_batch_flushing')
    for (const message of outbound) {
      await processMessage(message)
    }

    if (inbound.length === 0) return

    const lastMessage = inbound[inbound.length - 1]
    const combinedContent = inbound.map((message) => message.content).join('\n')
    const result = await processMessage({
      ...lastMessage,
      externalMessageId: inbound.map((message) => message.externalMessageId).join(':'),
      content: combinedContent,
      raw: {
        batched: true,
        messages: inbound.map((message) => message.raw),
      },
    })
    logger.info({ phone, result }, 'message_batch_processed')
  } catch (error) {
    logger.error({ error, phone }, 'debounced_message_failed')
  }
}
