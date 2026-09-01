import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { appendChatbotApiPath, type ChatbotSetupStatus } from '@/lib/chatbot/status'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user || profile?.role !== 'admin') return false
  return true
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' })
  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { ok: response.ok, status: response.status, data }
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const workerUrl = process.env.WHATSAPP_BOT_WORKER_URL
  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  const evolutionInstance = process.env.EVOLUTION_INSTANCE
  const proxyToken = process.env.WHATSAPP_PROXY_TOKEN
  const proxyHeaders: Record<string, string> = proxyToken ? { 'X-Internal-Proxy-Token': proxyToken } : {}

  const result: ChatbotSetupStatus = {
    databaseReady: false,
    workerReachable: false,
    evolutionReachable: false,
    whatsappConnected: false,
    qrCode: null,
    message: 'Faltan configurar las URLs internas del worker/Evolution en Vercel.',
  }

  if (workerUrl) {
    try {
      const ready = await fetchJson(appendChatbotApiPath(workerUrl, '/ready'), { headers: proxyHeaders })
      result.workerReachable = ready.status < 500
      result.databaseReady = ready.ok
      result.message = ready.ok ? 'Worker listo.' : 'Worker accesible, pero la base del chatbot todavía no está lista.'
    } catch {
      result.message = 'No se pudo alcanzar el worker desde el servidor web.'
    }
  }

  if (evolutionUrl && evolutionKey) {
    try {
      const health = await fetchJson(evolutionUrl, { headers: { apikey: evolutionKey, ...proxyHeaders } })
      result.evolutionReachable = health.ok
    } catch {
      result.evolutionReachable = false
    }
  }

  if (evolutionUrl && evolutionKey && evolutionInstance) {
    try {
      const state = await fetchJson(appendChatbotApiPath(evolutionUrl, `/instance/connectionState/${evolutionInstance}`), {
        headers: { apikey: evolutionKey, ...proxyHeaders },
      })
      const stateText = JSON.stringify(state.data ?? '').toLocaleLowerCase('es')
      result.whatsappConnected = stateText.includes('open') || stateText.includes('connected')
    } catch {
      result.whatsappConnected = false
    }
  }

  return NextResponse.json(result)
}
