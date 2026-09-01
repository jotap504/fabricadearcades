import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { isMissingChatbotTableError } from '@/lib/chatbot/status'

export default async function AdminChatbotPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login?redirect=/admin/chatbot')
  if (profile?.role !== 'admin') redirect('/')

  let conversations = 0
  let openQuestions = 0
  let settings: Array<{ key: string; value: unknown }> = []
  let databasePending = false

  try {
    const [conversationResult, unansweredResult, settingsResult] = await Promise.all([
      supabase.from('chatbot_conversations').select('*', { count: 'exact', head: true }),
      supabase.from('chatbot_unanswered_questions').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('chatbot_bot_settings').select('key,value').in('key', ['bot_active', 'llm_provider', 'llm_model']),
    ])
    if (conversationResult.error) throw conversationResult.error
    if (unansweredResult.error) throw unansweredResult.error
    if (settingsResult.error) throw settingsResult.error
    conversations = conversationResult.count ?? 0
    openQuestions = unansweredResult.count ?? 0
    settings = settingsResult.data ?? []
  } catch (error) {
    if (isMissingChatbotTableError(error)) databasePending = true
    else throw error
  }

  const settingsMap = new Map((settings ?? []).map((item) => [item.key, item.value]))
  const botActive = Boolean(settingsMap.get('bot_active'))

  return (
    <div>
      <div className="admin-page-heading">
        <div>
          <h1>Chatbot WhatsApp</h1>
          <p>Atención automática controlada, con OpenRouter y conocimiento aprobado.</p>
        </div>
        <span className={`badge ${botActive ? 'badge-success' : ''}`}>{databasePending ? 'Base pendiente' : botActive ? 'Bot activo' : 'Bot apagado'}</span>
      </div>

      {databasePending && (
        <div className="admin-card" style={{ marginBottom: 'var(--space-5)' }}>
          <h2>Falta aplicar la base del chatbot</h2>
          <p>El frontend ya está listo, pero todavía faltan las tablas `chatbot_*` en Supabase. Apenas se aplique la migration, este panel empieza a mostrar datos reales.</p>
        </div>
      )}

      <div className="customer-summary-grid">
        <div className="customer-summary-card"><div><strong>{conversations}</strong><span>Conversaciones</span></div></div>
        <div className="customer-summary-card"><div><strong>{openQuestions}</strong><span>Sin respuesta</span></div></div>
        <div className="customer-summary-card"><div><strong>{String(settingsMap.get('llm_model') ?? 'deepseek/deepseek-chat-v3.1')}</strong><span>Modelo LLM</span></div></div>
      </div>

      <div className="admin-grid" style={{ marginTop: 'var(--space-6)' }}>
        {[
          ['Conversaciones', 'Ver historial, tomar conversaciones y reanudar el bot.', '/admin/chatbot/conversaciones'],
          ['Conocimiento', 'Cargar lo que el bot tiene permitido responder.', '/admin/chatbot/conocimiento'],
          ['Sin respuesta', 'Preguntas que derivaron a humano y pueden convertirse en aprendizaje.', '/admin/chatbot/sin-respuesta'],
          ['Configuración', 'Modelo, umbrales, mensajes y estado general.', '/admin/chatbot/configuracion'],
          ['WhatsApp', 'Estado de conexión, QR y datos de Evolution API.', '/admin/chatbot/whatsapp'],
        ].map(([title, text, href]) => (
          <Link key={href} href={href} className="admin-card" style={{ textDecoration: 'none' }}>
            <h2>{title}</h2>
            <p>{text}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
