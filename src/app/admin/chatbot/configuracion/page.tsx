import { redirect } from 'next/navigation'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { ChatbotSettingsClient } from './ChatbotSettingsClient'
import { isMissingChatbotTableError } from '@/lib/chatbot/status'

export default async function ChatbotConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login?redirect=/admin/chatbot/configuracion')
  if (profile?.role !== 'admin') redirect('/')

  let data: any[] = []
  let databasePending = false
  try {
    const result = await supabase.from('chatbot_bot_settings').select('key,value,label').order('key')
    if (result.error) throw result.error
    data = result.data ?? []
  } catch (error) {
    if (isMissingChatbotTableError(error)) databasePending = true
    else throw error
  }
  return <ChatbotSettingsClient initialSettings={data} databasePending={databasePending} />
}
