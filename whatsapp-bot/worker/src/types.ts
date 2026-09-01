export type ConversationMode = 'BOT' | 'HUMAN' | 'PAUSED'

export type NormalizedMessage = {
  externalMessageId: string
  phone: string
  displayName?: string
  direction: 'inbound' | 'outbound'
  senderType: 'customer' | 'human' | 'bot'
  content: string
  raw: unknown
}

export type KnowledgeSource = {
  id: string
  category: string
  title: string
  content: string
  priority: number
  similarity: number
}
