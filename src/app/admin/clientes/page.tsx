import { redirect } from 'next/navigation'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { ClientesClient } from './ClientesClient'

export default async function AdminClientesPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login?redirect=/admin/clientes')
  if (profile?.role !== 'admin') redirect('/')

  const { data: contacts } = await supabase
    .from('customer_contacts')
    .select('*')
    .order('last_order_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  return <ClientesClient contacts={contacts ?? []} />
}
