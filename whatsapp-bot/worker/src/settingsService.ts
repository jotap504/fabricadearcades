import { supabase } from './supabase.js'

export type BotSettings = {
  botActive: boolean
  handoffMessage: string
  confidenceThreshold: number
  ragThreshold: number
  topK: number
}

export async function getBotSettings(): Promise<BotSettings> {
  const { data, error } = await supabase
    .from('chatbot_bot_settings')
    .select('key,value')
    .in('key', ['bot_active', 'handoff_message', 'confidence_threshold', 'rag_threshold', 'top_k'])

  if (error) throw error

  const map = new Map((data ?? []).map((item) => [item.key, item.value]))
  return {
    botActive: Boolean(map.get('bot_active') ?? false),
    handoffMessage: String(map.get('handoff_message') ?? 'Te derivo con una persona para que pueda ayudarte.'),
    confidenceThreshold: Number(map.get('confidence_threshold') ?? 0.75),
    ragThreshold: Number(map.get('rag_threshold') ?? 0.78),
    topK: Number(map.get('top_k') ?? 5),
  }
}
