import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProductionQueueClient } from './ProductionQueueClient'

export default async function AdminProductionPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login')

  

  if (!['admin', 'fabricante'].includes(profile?.role ?? '')) redirect('/')

  const { data: queue } = await supabase
    .from('production_queue')
    .select('*, order:orders(order_number, customer_name, customer_email, customer_phone)')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })

  const { data: fabricantes } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('role', ['admin', 'fabricante'])

  return (
    <ProductionQueueClient
      queue={queue ?? []}
      fabricantes={fabricantes ?? []}
      isAdmin={profile?.role === 'admin'}
    />
  )
}
