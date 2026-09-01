import { redirect } from 'next/navigation'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { UnansweredActions } from './UnansweredActions'
import { isMissingChatbotTableError } from '@/lib/chatbot/status'

export default async function ChatbotSinRespuestaPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login?redirect=/admin/chatbot/sin-respuesta')
  if (profile?.role !== 'admin') redirect('/')

  let data: any[] = []
  let databasePending = false
  try {
    const result = await supabase
      .from('chatbot_unanswered_questions')
      .select('id,question,reason,human_answer,status,created_at,chatbot_conversations(phone,display_name)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (result.error) throw result.error
    data = result.data ?? []
  } catch (error) {
    if (isMissingChatbotTableError(error)) databasePending = true
    else throw error
  }

  return (
    <div>
      <div className="admin-page-heading"><div><h1>Sin respuesta</h1><p>Consultas que el bot no pudo contestar y derivó a humano.</p></div></div>
      {databasePending && <div className="admin-card" style={{ marginBottom: 'var(--space-5)' }}><h2>Base pendiente</h2><p>Falta aplicar las tablas `chatbot_*` en Supabase.</p></div>}
      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>Pregunta</th><th>Cliente</th><th>Motivo</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.id}>
                <td><strong>{row.question}</strong>{row.human_answer && <div className="table-secondary">Respuesta humana: {row.human_answer}</div>}</td>
                <td>{row.chatbot_conversations?.display_name ?? row.chatbot_conversations?.phone ?? '—'}</td>
                <td className="table-secondary">{row.reason ?? '—'}</td>
                <td><span className="badge">{row.status}</span></td>
                <td className="table-secondary">{new Date(row.created_at).toLocaleString('es-AR')}</td>
                <td>{row.status === 'open' ? <UnansweredActions questionId={row.id} question={row.question} /> : '—'}</td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={6} className="admin-empty-state">Todavía no hay preguntas derivadas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
