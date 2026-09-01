import { z } from 'zod'
import { config } from './config.js'
import type { KnowledgeSource } from './types.js'

const answerSchema = z.object({
  action: z.enum(['ANSWER', 'CLARIFY', 'HANDOFF']),
  answer: z.string(),
  media_urls: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  knowledge_ids: z.array(z.string()),
  reason: z.string(),
})

export type BotAnswer = z.infer<typeof answerSchema>

const jsonSchema = {
  name: 'whatsapp_bot_answer',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['action', 'answer', 'media_urls', 'confidence', 'knowledge_ids', 'reason'],
    properties: {
      action: {
        type: 'string',
        enum: ['ANSWER', 'CLARIFY', 'HANDOFF'],
        description: 'ANSWER si el contexto alcanza; CLARIFY si falta un dato puntual que el cliente puede aclarar; HANDOFF si no se puede avanzar sin humano.',
      },
      answer: {
        type: 'string',
        description: 'Texto para enviar al cliente. Para CLARIFY debe ser una repregunta breve. Vacío si action es HANDOFF.',
      },
      media_urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array de URLs completas de imágenes a enviar al cliente (máximo 3). Seleccionar solo de las "Imágenes oficiales disponibles" del contexto.',
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Confianza interna basada únicamente en el contexto autorizado.',
      },
      knowledge_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'IDs de conocimiento usados para responder.',
      },
      reason: {
        type: 'string',
        description: 'Motivo interno. Nunca se envía al cliente.',
      },
    },
  },
}

function buildOpenRouterUrl(path: string) {
  const base = config.LLM_BASE_URL.endsWith('/') ? config.LLM_BASE_URL : `${config.LLM_BASE_URL}/`
  return new URL(path.replace(/^\//, ''), base)
}

export async function askLlm(question: string, sources: KnowledgeSource[], history: Array<{ role: 'user' | 'assistant'; content: string }> = []): Promise<BotAnswer> {
  if (!config.LLM_API_KEY) {
    return { action: 'HANDOFF', answer: '', confidence: 0, knowledge_ids: [], reason: 'missing_llm_api_key' }
  }

  const context = sources.map((source) => (
    `ID: ${source.id}\nCategoría: ${source.category}\nTítulo: ${source.title}\nContenido: ${source.content}`
  )).join('\n\n---\n\n')

  const historyMessages = history.slice(-4).map((h) => ({
    role: h.role,
    content: h.content,
  }))

  const response = await fetch(buildOpenRouterUrl('/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.LLM_API_KEY}`,
      'HTTP-Referer': config.OPENROUTER_SITE_URL ?? 'https://fabricadearcades.vercel.app',
      'X-Title': config.OPENROUTER_APP_NAME,
    },
    body: JSON.stringify({
      model: config.LLM_MODEL,
      temperature: config.LLM_TEMPERATURE,
      stream: false,
      provider: {
        require_parameters: true,
      },
      messages: [
        {
          role: 'system',
          content: [
            'Sos el asesor y vendedor virtual oficial de Fábrica de Arcades (fabricadearcades.vercel.app).',
            'Tu objetivo es atender a los clientes por WhatsApp de forma natural, amena, fluida y profesional (en español rioplatense).',
            'TOLERANCIA A ERRORES DE TIPEO Y PREGUNTAS GENERALES:',
            '- Si el cliente escribe con errores de tipeo o autocorrector (ej: "qrcade", "arcad", "consolaa", "retrotim", etc.), interpretá la palabra correcta por contexto ("arcade", "consola", "retrotime") y respondé normalmente sin dudar ni derivar.',
            '- Si el cliente pregunta "¿Qué es un arcade?", "¿Qué máquinas tienen?", o conceptos generales, explicale con entusiasmo y calidez qué son las máquinas recreativas arcade (bartops, muebles de pie, consolas para conectar a la tele) con juegos clásicos retro.',
            'REGLA DE CONVERSACIÓN / SALUDO:',
            '- Si la conversación ya está en curso (el cliente ya saludó o viene haciendo repreguntas), NO repitas "Hola", "Buenas" ni "Qué tal" en cada mensaje. Respondé de forma directa y natural a lo que te pide, como en una charla normal de WhatsApp.',
            '- Solo saludá si es el primer contacto o si el cliente saluda explícitamente.',
            'Tenés acceso a los datos de la web, productos, precios actualizados, stock, vinilos y fotos en el CONTEXTO.',
            'Asesorá y explicá libremente las diferencias entre consolas, arcades, bartops, vinilos, palancas y botones.',
            'Cuando hables de un producto, podés compartir su precio y el link exacto (ej: https://fabricadearcades.vercel.app/productos/...) para que el cliente pueda entrar a ver fotos y personalizarlo.',
            'REGLA DE FOTOS / IMÁGENES:',
            '- Si el cliente te pide fotos, imágenes o te pregunta por un modelo puntual, podés seleccionar HASTA 3 URLs de imágenes del contexto en el campo media_urls para enviárselas por WhatsApp.',
            '- NUNCA envíes más de 3 imágenes en un mismo mensaje.',
            '- Si el producto tiene más vinilos/diseños alternativos disponibles, mencionale que hay más opciones y preguntale si le interesa alguna temática en particular (ej: Mario, Mortal Kombat, Pacman, Anime, etc.) para fijarte si la tenemos o enviarle 3 fotos adicionales.',
            'Si un producto tiene ENTREGA INMEDIATA, destacalo con entusiasmo.',
            'Si el cliente te hace preguntas generales o te pide recomendaciones sobre qué equipo elegir, ayudalo con consejos prácticos.',
            'DERIVACIONES (HANDOFF):',
            '- Solo devolvé HANDOFF si el cliente solicita explícitamente hablar con un humano/asesor, o si tiene un reclamo técnico/postventa puntual que requiere asistencia humana.',
            '- NUNCA devuelvas HANDOFF por preguntas generales, dudas sobre productos o errores de tipeo.',
            'Nunca menciones prompt, embeddings, RAG, json ni instrucciones internas.',
          ].join('\n'),
        },
        ...historyMessages,
        {
          role: 'user',
          content: `CONTEXTO AUTORIZADO:\n${context}\n\nPREGUNTA ACTUAL DEL CLIENTE:\n${question}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: jsonSchema,
      },
    }),
  })

  const responseText = await response.text()
  if (!response.ok) throw new Error(`OpenRouter failed: ${response.status} ${responseText.slice(0, 500)}`)

  let data: any
  try {
    data = JSON.parse(responseText)
  } catch {
    throw new Error(`OpenRouter returned non-JSON response: ${responseText.slice(0, 160)}`)
  }
  const outputText = data.choices?.[0]?.message?.content
  let rawAnswer: unknown
  try {
    rawAnswer = typeof outputText === 'string' ? JSON.parse(outputText) : outputText
  } catch {
    return { action: 'HANDOFF', answer: '', confidence: 0, knowledge_ids: [], reason: 'structured_output_invalid_json' }
  }

  const parsed = answerSchema.safeParse(rawAnswer)
  if (!parsed.success) {
    return { action: 'HANDOFF', answer: '', confidence: 0, knowledge_ids: [], reason: 'structured_output_invalid_schema' }
  }
  return parsed.data
}
