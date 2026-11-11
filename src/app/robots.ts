import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

const PRIVATE_PATHS = [
  '/admin',
  '/api',
  '/checkout',
  '/mi-cuenta',
  '/login',
  '/registrarse',
  '/registro-distribuidor',
  '/fabricante',
  '/auth',
]

// A crawler with its own group ignores the "*" group, so the disallow list is repeated.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
