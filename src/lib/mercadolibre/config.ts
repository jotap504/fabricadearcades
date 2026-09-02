export interface MercadoLibreConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  siteId: string
}

export function isMercadoLibreConfigured() {
  return Boolean(
    process.env.MELI_CLIENT_ID && process.env.MELI_CLIENT_SECRET && process.env.MELI_REDIRECT_URI
  )
}

export function getMercadoLibreConfig(): MercadoLibreConfig {
  const clientId = process.env.MELI_CLIENT_ID
  const clientSecret = process.env.MELI_CLIENT_SECRET
  const redirectUri = process.env.MELI_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('MercadoLibre no está configurado: faltan MELI_CLIENT_ID, MELI_CLIENT_SECRET o MELI_REDIRECT_URI.')
  }
  return {
    clientId,
    clientSecret,
    redirectUri,
    siteId: process.env.MELI_SITE_ID || 'MLA',
  }
}
