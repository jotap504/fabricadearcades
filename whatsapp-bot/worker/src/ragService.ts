import { supabase } from './supabase.js'
import { config } from './config.js'
import type { KnowledgeSource } from './types.js'

const STOPWORDS = new Set([
  'a', 'al', 'algo', 'como', 'con', 'cuanto', 'cuánto', 'de', 'del', 'el', 'en', 'es', 'esta', 'está', 'esto',
  'hay', 'hola', 'la', 'las', 'lo', 'los', 'me', 'mi', 'para', 'por', 'que', 'qué', 'se', 'si', 'sí', 'sobre',
  'te', 'tenes', 'tenés', 'tienen', 'un', 'una', 'y',
])

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function extractTerms(text: string) {
  return normalizeText(text)
    .split(/[^a-z0-9]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3 && !STOPWORDS.has(term))
}

function scoreKnowledgeItem(item: { title: string; category: string; content: string; priority: number }, terms: string[]) {
  const title = normalizeText(item.title)
  const category = normalizeText(item.category)
  const content = normalizeText(item.content)
  let score = 0

  for (const term of terms) {
    if (title.includes(term)) score += 5
    if (category.includes(term)) score += 3
    if (content.includes(term)) score += 2
  }

  return score + Math.max(0, item.priority ?? 0) / 100
}

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

async function retrieveKnowledgeByText(text: string, topK: number): Promise<KnowledgeSource[]> {
  const terms = extractTerms(text)
  if (terms.length === 0) return []

  const { data, error } = await supabase
    .from('chatbot_knowledge_items')
    .select('id,category,title,content,priority')
    .eq('active', true)
    .order('priority', { ascending: false })
    .limit(50)

  if (error) throw error

  return (data ?? [])
    .map((item) => ({
      ...item,
      similarity: Math.min(0.95, scoreKnowledgeItem(item, terms) / Math.max(8, terms.length * 4)),
    }))
    .filter((item) => item.similarity >= 0.35)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK) as KnowledgeSource[]
}

export async function retrieveKnowledge(text: string, topK: number, threshold: number): Promise<KnowledgeSource[]> {
  const embedding = await createEmbedding(text)
  if (!embedding) return retrieveKnowledgeByText(text, topK)

  const { data, error } = await supabase.rpc('chatbot_match_knowledge', {
    query_embedding: embedding,
    match_count: topK,
    min_similarity: threshold,
  })

  if (error) throw error
  const vectorResults = (data ?? []) as KnowledgeSource[]
  if (vectorResults.length > 0) return vectorResults
  return retrieveKnowledgeByText(text, topK)
}
