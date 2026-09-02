import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { buildAuthorizationUrl } from '@/lib/mercadolibre/client'
import { isMercadoLibreConfigured } from '@/lib/mercadolibre/config'

export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'meli_oauth_state'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  return Boolean(user && profile?.role === 'admin')
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!isMercadoLibreConfigured()) {
    return NextResponse.redirect(new URL('/admin/mercadolibre?error=not_configured', request.url))
  }

  const state = crypto.randomUUID()
  const authorizeUrl = buildAuthorizationUrl({ state })

  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return response
}
