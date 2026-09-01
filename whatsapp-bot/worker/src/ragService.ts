import { supabase } from './supabase.js'
import { config } from './config.js'
import type { KnowledgeSource } from './types.js'

export async function createEmbedding(text: string): Promise<number[] | null> {
  if (!config.EMBEDDING_API_KEY) return null

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.EMBEDDING_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.EMBEDDING_MODEL,
      input: text,
    }),
  })

  if (!response.ok) throw new Error(`Embedding failed: ${response.status} ${await response.text()}`)
  const data = await response.json() as { data?: Array<{ embedding: number[] }> }
  return data.data?.[0]?.embedding ?? null
}

export async function retrieveKnowledge(text: string, topK: number, threshold: number): Promise<KnowledgeSource[]> {
  const embedding = await createEmbedding(text)
  if (!embedding) return []

  const { data, error } = await supabase.rpc('chatbot_match_knowledge', {
    query_embedding: embedding,
    match_count: topK,
    min_similarity: threshold,
  })

  if (error) throw error
  return (data ?? []) as KnowledgeSource[]
}
