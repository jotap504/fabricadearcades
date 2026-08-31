import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsersClient } from './UsersClient'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login')

  
  if (profile?.role !== 'admin') redirect('/')

  const { data: users } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return <UsersClient users={users ?? []} />
}
