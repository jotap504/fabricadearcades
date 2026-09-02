'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient, getAuthUser } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user || profile?.role !== 'admin') throw new Error('No autorizado')
  return user
}

export async function disconnectMercadoLibreAccount(accountId: string) {
  const user = await requireAdmin()
  const admin = await createAdminClient()

  const { error: accountError } = await admin
    .from('mercadolibre_accounts')
    .update({ status: 'disconnected', disconnected_at: new Date().toISOString() })
    .eq('id', accountId)

  if (accountError) throw new Error(accountError.message)

  await admin
    .from('mercadolibre_tokens')
    .update({ access_token: null, refresh_token: null, revoked_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .is('revoked_at', null)

  await admin.from('mercadolibre_sync_logs').insert({
    account_id: accountId,
    event_type: 'oauth_disconnect',
    status: 'ok',
    actor_user_id: user.id,
    metadata: {},
  })

  revalidatePath('/admin/mercadolibre')
}
