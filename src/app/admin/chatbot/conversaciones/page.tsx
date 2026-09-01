import { redirect } from 'next/navigation'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { ConversationInbox } from './ConversationInbox'
import { isMissingChatbotTableError } from '@/lib/chatbot/status'

export default async function ChatbotConversacionesPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login?redirect=/admin/chatbot/conversaciones')
  if (profile?.role !== 'admin') redirect('/')

  let data: any[] = []
  let databasePending = false

  try {
    const result = await supabase
      .from('chatbot_conversations')
      .select(`
        id,
        phone,
        display_name,
        mode,
        sales_status,
        handoff_reason,
        pending_count,
        last_message_at,
        product_interest_id,
        product_interest:products(name,slug),
        customer:chatbot_customers(id,first_name,display_name,email,status,notes),
        messages:chatbot_messages(id,direction,sender_type,content,created_at)
      `)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { referencedTable: 'chatbot_messages', ascending: true })
      .limit(100)
    if (result.error) throw result.error
    data = result.data ?? []
  } catch (error) {
    if (isMissingChatbotTableError(error)) databasePending = true
    else throw error
  }

  return (
    <div>
      <div className="admin-page-heading"><div><h1>Conversaciones</h1><p>Bandeja comercial de WhatsApp: historial, estado del bot y respuesta manual.</p></div></div>
      {databasePending && <div className="admin-card" style={{ marginBottom: 'var(--space-5)' }}><h2>Base pendiente</h2><p>Falta aplicar las tablas `chatbot_*` en Supabase.</p></div>}
      <ConversationInbox conversations={data} />
    </div>
  )
}
