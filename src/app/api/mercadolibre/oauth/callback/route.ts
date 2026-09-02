import { NextResponse } from 'next/server'
import { createClient, createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { exchangeCodeForToken, getUserInfo } from '@/lib/mercadolibre/client'

export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'meli_oauth_state'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user || profile?.role !== 'admin') return null
  return user
}

async function logSyncEvent(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  event: { accountId?: string | null; status: 'ok' | 'error'; message?: string; actorUserId?: string; metadata?: Record<string, unknown> }
) {
  await admin.from('mercadolibre_sync_logs').insert({
    account_id: event.accountId ?? null,
    event_type: event.status === 'ok' ? 'oauth_connect' : 'oauth_error',
    status: event.status,
    message: event.message ?? null,
    actor_user_id: event.actorUserId ?? null,
    metadata: event.metadata ?? {},
  })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const redirectBase = new URL('/admin/mercadolibre', url)

  const user = await requireAdmin()
  if (!user) {
    return NextResponse.redirect(new URL('/login', url))
  }

  const stateParam = url.searchParams.get('state')
  const code = url.searchParams.get('code')
  const mlError = url.searchParams.get('error')

  const cookieState = request.headers
    .get('cookie')
    ?.split('; ')
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.split('=')[1]

  function withClearedStateCookie(response: NextResponse) {
    response.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 })
    return response
  }

  if (mlError) {
    return withClearedStateCookie(
      NextResponse.redirect(new URL(`${redirectBase.pathname}?error=meli_${mlError}`, url))
    )
  }

  if (!code || !stateParam || !cookieState || stateParam !== cookieState) {
    return withClearedStateCookie(
      NextResponse.redirect(new URL(`${redirectBase.pathname}?error=state_mismatch`, url))
    )
  }

  const admin = await createAdminClient()

  try {
    const tokenResponse = await exchangeCodeForToken(code)
    const userInfo = await getUserInfo(tokenResponse.access_token)

    const { data: existingConnected } = await admin
      .from('mercadolibre_accounts')
      .select('id, ml_user_id')
      .eq('status', 'connected')
      .maybeSingle()

    if (existingConnected && existingConnected.ml_user_id !== userInfo.id) {
      await logSyncEvent(admin, {
        accountId: existingConnected.id,
        status: 'error',
        message: 'Se intentó conectar una cuenta distinta a la ya conectada.',
        actorUserId: user.id,
        metadata: { attempted_ml_user_id: userInfo.id },
      })
      return withClearedStateCookie(
        NextResponse.redirect(new URL(`${redirectBase.pathname}?error=account_conflict`, url))
      )
    }

    const { data: account, error: accountError } = await admin
      .from('mercadolibre_accounts')
      .upsert(
        {
          ml_user_id: userInfo.id,
          nickname: userInfo.nickname,
          email: userInfo.email ?? null,
          site_id: userInfo.site_id,
          status: 'connected',
          scopes: tokenResponse.scope,
          connected_at: new Date().toISOString(),
          connected_by: user.id,
          last_error: null,
        },
        { onConflict: 'ml_user_id' }
      )
      .select('id')
      .single()

    if (accountError || !account) {
      throw new Error(accountError?.message || 'No se pudo guardar la cuenta de MercadoLibre')
    }

    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
    const { error: tokenError } = await admin.from('mercadolibre_tokens').upsert(
      {
        account_id: account.id,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token ?? null,
        token_type: tokenResponse.token_type,
        scope: tokenResponse.scope,
        expires_at: expiresAt,
        obtained_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: 'account_id' }
    )

    if (tokenError) {
      throw new Error(tokenError.message)
    }

    await logSyncEvent(admin, {
      accountId: account.id,
      status: 'ok',
      actorUserId: user.id,
      metadata: { ml_user_id: userInfo.id, nickname: userInfo.nickname },
    })

    return withClearedStateCookie(
      NextResponse.redirect(new URL(`${redirectBase.pathname}?connected=1`, url))
    )
  } catch (error) {
    await logSyncEvent(admin, {
      status: 'error',
      message: error instanceof Error ? error.message : 'Error desconocido conectando MercadoLibre',
      actorUserId: user.id,
    })
    return withClearedStateCookie(
      NextResponse.redirect(new URL(`${redirectBase.pathname}?error=connect_failed`, url))
    )
  }
}
