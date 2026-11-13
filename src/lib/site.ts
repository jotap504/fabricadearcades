// Single source of truth for site-wide SEO / GEO constants.
// Only facts that already exist elsewhere in the codebase (contact page, footer, policies).

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://todoarcade.com.ar'

export const SITE_URL = rawSiteUrl.replace(/\/+$/, '')
export const SITE_NAME = 'TodoArcade'
export const SITE_LOCALE = 'es_AR'
export const SITE_DEFAULT_OG_IMAGE = '/og-default.jpg'
export const SITE_LOGO = '/logo.png'

export const SITE_CONTACT = {
  email: 'info@todoarcade.com.ar',
  telephone: '+5491164045074',
  streetAddress: 'Virgilio 2379',
  addressLocality: 'Devoto, Ciudad Autónoma de Buenos Aires',
  addressCountry: 'AR',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=Virgilio+2379+Devoto+CABA',
  instagram: 'https://instagram.com/todoarcade.ar',
  tiktok: 'https://tiktok.com/@todoarcade',
} as const

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  // Paths stored in the DB can hold raw spaces ("/vinilos/consola 78/x.jpg"); encode them
  // unless the value is already percent-encoded.
  return `${SITE_URL}${normalized.includes('%') ? normalized : encodeURI(normalized)}`
}
