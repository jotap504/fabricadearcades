import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { appendChatbotApiPath } from '@/lib/chatbot/status'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user || profile?.role !== 'admin') return false
  return true
}

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  const evolutionInstance = process.env.EVOLUTION_INSTANCE
  const proxyToken = process.env.WHATSAPP_PROXY_TOKEN

  if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
    return NextResponse.json({ error: 'Faltan variables de Evolution API en el servidor web.' }, { status: 400 })
  }

  const response = await fetch(appendChatbotApiPath(evolutionUrl, `/instance/connect/${evolutionInstance}`), {
    method: 'GET',
    headers: { apikey: evolutionKey, ...(proxyToken ? { 'X-Internal-Proxy-Token': proxyToken } : {}) },
    cache: 'no-store',
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) return NextResponse.json({ error: 'No se pudo pedir QR a Evolution.', detail: data }, { status: response.status })

  const qrCode = data?.base64 ?? data?.qrcode?.base64 ?? data?.qrcode ?? data?.code ?? null
  return NextResponse.json({ qrCode, raw: qrCode ? undefined : data })
}
