export type ChatbotSetupStatus = {
  databaseReady: boolean
  workerReachable: boolean
  evolutionReachable: boolean
  whatsappConnected: boolean
  qrCode: string | null
  message: string
}

export const CHATBOT_TABLE_MISSING = 'PENDING_CHATBOT_TABLES'

export function isMissingChatbotTableError(error: unknown) {
  const message = typeof error === 'object' && error && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : String(error ?? '')
  return message.includes('chatbot_') || message.includes('schema cache') || message.includes('does not exist')
}

export function appendChatbotApiPath(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  return new URL(normalizedPath, normalizedBase).toString()
}
