import { getMercadoLibreConfig } from './config'
import type { MLTokenResponse, MLUserInfo } from './types'

const API_BASE = 'https://api.mercadolibre.com'

const AUTH_HOST_BY_SITE: Record<string, string> = {
  MLA: 'auth.mercadolibre.com.ar',
  MLB: 'auth.mercadolivre.com.br',
  MLM: 'auth.mercadolibre.com.mx',
  MLC: 'auth.mercadolibre.cl',
  MCO: 'auth.mercadolibre.com.co',
}

function getAuthHost(siteId: string) {
  return AUTH_HOST_BY_SITE[siteId] || 'auth.mercadolibre.com.ar'
}

export function buildAuthorizationUrl({ state }: { state: string }): string {
  const { clientId, redirectUri, siteId } = getMercadoLibreConfig()
  const url = new URL(`https://${getAuthHost(siteId)}/authorization`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  return url.toString()
}

async function postForm(path: string, params: Record<string, string>): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(params).toString(),
    cache: 'no-store',
  })
  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : `MercadoLibre respondió ${response.status}`
    throw new Error(message)
  }
  return data
}

export async function exchangeCodeForToken(code: string): Promise<MLTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getMercadoLibreConfig()
  return postForm('/oauth/token', {
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  }) as Promise<MLTokenResponse>
}

export async function refreshAccessToken(refreshToken: string): Promise<MLTokenResponse> {
  const { clientId, clientSecret } = getMercadoLibreConfig()
  return postForm('/oauth/token', {
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  }) as Promise<MLTokenResponse>
}

export async function getUserInfo(accessToken: string): Promise<MLUserInfo> {
  const response = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`No se pudo obtener el usuario de MercadoLibre (status ${response.status})`)
  }
  return response.json() as Promise<MLUserInfo>
}
