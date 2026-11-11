// Single source of truth for site-wide SEO / GEO constants.
// Only facts that already exist elsewhere in the codebase (contact page, footer, policies).

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://todoarcade.com.ar'

export const SITE_URL = rawSiteUrl.replace(/\/+$/, '')
export const SITE_NAME = 'TodoArcade'
export const SITE_LOCALE = 'es_AR'
export const SITE_DEFAULT_OG_IMAGE = '/og-default.jpg'
export const SITE_LOGO = '/logo.png'

export const SITE_CONTACT = {
  email: 'info@fabricadearcades.com.ar',
  telephone: '+5491164045074',
  streetAddress: 'Virgilio 2379',
  addressLocality: 'Devoto, Ciudad Autónoma de Buenos Aires',
  addressCountry: 'AR',
  instagram: 'https://instagram.com/Fabricadearcades',
  tiktok: 'https://tiktok.com/@fabricadearcades',
} as const

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
