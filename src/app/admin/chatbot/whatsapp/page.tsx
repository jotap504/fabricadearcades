import { redirect } from 'next/navigation'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { WhatsAppLinkClient } from './WhatsAppLinkClient'

export default async function ChatbotWhatsAppPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login?redirect=/admin/chatbot/whatsapp')
  if (profile?.role !== 'admin') redirect('/')

  return <WhatsAppLinkClient />
}
