import { redirect } from 'next/navigation'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { ConversationActions } from './ConversationActions'
import { isMissingChatbotTableError } from '@/lib/chatbot/status'

export default async function ChatbotConversacionesPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login?redirect=/admin/chatbot/conversaciones')
  if (profile?.role !== 'admin') redirect('/')

  let data: Array<{ id: string; phone: string; display_name: string | null; mode: 'BOT' | 'HUMAN' | 'PAUSED'; handoff_reason: string | null; last_message_at: string | null }> = []
  let databasePending = false

  try {
    const result = await supabase
      .from('chatbot_conversations')
      .select('id,phone,display_name,mode,handoff_reason,last_message_at,updated_at')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100)
    if (result.error) throw result.error
    data = result.data ?? []
  } catch (error) {
    if (isMissingChatbotTableError(error)) databasePending = true
    else throw error
  }

  return (
    <div>
      <div className="admin-page-heading"><div><h1>Conversaciones</h1><p>Estado BOT/HUMAN/PAUSED y últimos contactos.</p></div></div>
      {databasePending && <div className="admin-card" style={{ marginBottom: 'var(--space-5)' }}><h2>Base pendiente</h2><p>Falta aplicar las tablas `chatbot_*` en Supabase.</p></div>}
      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>Cliente</th><th>Estado</th><th>Último mensaje</th><th>Motivo</th><th>Acciones</th></tr></thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.display_name ?? row.phone}</strong><div className="table-secondary">{row.phone}</div></td>
                <td><span className="badge">{row.mode}</span></td>
                <td className="table-secondary">{row.last_message_at ? new Date(row.last_message_at).toLocaleString('es-AR') : 'Sin mensajes'}</td>
                <td className="table-secondary">{row.handoff_reason ?? '—'}</td>
                <td><ConversationActions conversationId={row.id} mode={row.mode} /></td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={5} className="admin-empty-state">Todavía no hay conversaciones.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
