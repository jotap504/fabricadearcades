import { redirect } from 'next/navigation'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { ChatbotKnowledgeClient } from './ChatbotKnowledgeClient'
import { isMissingChatbotTableError } from '@/lib/chatbot/status'

export default async function ChatbotConocimientoPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login?redirect=/admin/chatbot/conocimiento')
  if (profile?.role !== 'admin') redirect('/')

  let data: any[] = []
  let databasePending = false
  try {
    const result = await supabase
      .from('chatbot_knowledge_items')
      .select('id,category,title,content,active,priority,updated_at')
      .order('priority', { ascending: false })
      .order('updated_at', { ascending: false })
    if (result.error) throw result.error
    data = result.data ?? []
  } catch (error) {
    if (isMissingChatbotTableError(error)) databasePending = true
    else throw error
  }

  return <ChatbotKnowledgeClient initialItems={data} databasePending={databasePending} />
}
