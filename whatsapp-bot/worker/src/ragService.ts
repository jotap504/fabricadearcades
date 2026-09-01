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
  const apiKey = config.EMBEDDING_API_KEY || (config.EMBEDDING_PROVIDER === 'openrouter' ? config.LLM_API_KEY : undefined)
  if (!apiKey) return null

  const endpoint = config.EMBEDDING_PROVIDER === 'openrouter'
    ? new URL('/api/v1/embeddings', config.EMBEDDING_BASE_URL).toString()
    : 'https://api.openai.com/v1/embeddings'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(config.EMBEDDING_PROVIDER === 'openrouter' && config.OPENROUTER_SITE_URL ? { 'HTTP-Referer': config.OPENROUTER_SITE_URL } : {}),
      ...(config.EMBEDDING_PROVIDER === 'openrouter' ? { 'X-Title': config.OPENROUTER_APP_NAME } : {}),
    },
    body: JSON.stringify({
      model: config.EMBEDDING_MODEL,
      input: text,
      ...(config.EMBEDDING_PROVIDER === 'openrouter' ? { dimensions: 1536 } : {}),
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

async function retrieveCatalogKnowledge(text: string): Promise<KnowledgeSource[]> {
  try {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, slug, short_description, description, base_price, retail_markup_pct, requires_production, is_active, metadata')
      .eq('is_active', true)
      .limit(30)

    if (!products || products.length === 0) return []

    const { data: stockItems } = await supabase
      .from('stock_items')
      .select('product_id, quantity, stock_type, configuration')
      .gt('quantity', 0)

    const stockByProduct = new Map<string, number>()
    const readyPresetsByProduct = new Map<string, string[]>()

    stockItems?.forEach((item) => {
      const current = stockByProduct.get(item.product_id) || 0
      stockByProduct.set(item.product_id, current + item.quantity)
      if (item.stock_type === 'immediate' && item.configuration) {
        const conf = item.configuration as any
        const details = `Vinilo: ${conf.vinyl_name || 'Diseño de stock'}, Palanca: ${conf.joystick_color || 'Estándar'}, Botones: ${conf.button_color || 'Estándar'}`
        const arr = readyPresetsByProduct.get(item.product_id) || []
        arr.push(details)
        readyPresetsByProduct.set(item.product_id, arr)
      }
    })

    const terms = extractTerms(text)
    const sources: KnowledgeSource[] = []

    for (const p of products) {
      const markup = p.retail_markup_pct ?? 30
      const finalPrice = Math.round(Number(p.base_price || 0) * (1 + markup / 100))
      const formattedPrice = `$ ${finalPrice.toLocaleString('es-AR')}`
      const totalStock = stockByProduct.get(p.id) || 0
      const readyUnits = readyPresetsByProduct.get(p.id) || []

      let stockInfo = 'Modalidad: A pedido / Fabricación personalizada.'
      if (totalStock > 0) {
        stockInfo = `⚡ ¡ENTREGA INMEDIATA DISPONIBLE! (${totalStock} unidades listas en fábrica).`
        if (readyUnits.length > 0) {
          stockInfo += ` Equipos armados: ${readyUnits.join(' | ')}.`
        }
      }

      const productContent = [
        `Producto: ${p.name}`,
        `Precio de lista actual: ${formattedPrice}`,
        stockInfo,
        `Descripción: ${p.short_description || p.description || ''}`,
        `Link en la web para comprar y configurar: https://fabricadearcades.com/productos/${p.slug}`,
      ].filter(Boolean).join('\n')

      const score = terms.length > 0 ? scoreKnowledgeItem({ title: p.name, category: 'catalogo', content: productContent, priority: 10 }, terms) : 1

      // If user specifically asked or mentioned products or catalog, include
      sources.push({
        id: `prod_${p.id}`,
        category: 'catalogo',
        title: `Catálogo Web - ${p.name}`,
        content: productContent,
        priority: 15,
        similarity: Math.min(0.99, score / Math.max(6, terms.length * 3)),
      })
    }

    return sources
  } catch (err) {
    console.error('Error retrieving catalog knowledge:', err)
    return []
  }
}

export async function retrieveKnowledge(text: string, topK: number, threshold: number): Promise<KnowledgeSource[]> {
  const [catalogSources, embedding] = await Promise.all([
    retrieveCatalogKnowledge(text),
    createEmbedding(text)
  ])

  let knowledgeSources: KnowledgeSource[] = []
  if (embedding) {
    try {
      const { data, error } = await supabase.rpc('chatbot_match_knowledge', {
        query_embedding: embedding,
        match_count: topK,
        min_similarity: threshold,
      })
      if (!error && data && data.length > 0) {
        knowledgeSources = data as KnowledgeSource[]
      }
    } catch {
      // Fallback below
    }
  }

  if (knowledgeSources.length === 0) {
    knowledgeSources = await retrieveKnowledgeByText(text, topK)
  }

  // Combine vector/manual knowledge with live catalog items
  const terms = extractTerms(text)
  const isCatalogQuery = terms.some((t) =>
    ['precio', 'precios', 'cuanto', 'sale', 'cuesta', 'modelo', 'modelos', 'catalogo', 'arcade', 'consola', 'bartop', 'stock', 'comprar', 'entrega', 'wonderboy', 'retrotime', 'plus'].includes(t)
  )

  const allSources = [...knowledgeSources, ...catalogSources]

  if (isCatalogQuery || knowledgeSources.length === 0) {
    return allSources
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, Math.max(topK, 8))
  }

  return allSources
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
}
