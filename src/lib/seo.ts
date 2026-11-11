import type { Metadata } from 'next'
import { SITE_DEFAULT_OG_IMAGE, SITE_LOCALE, SITE_NAME } from '@/lib/site'

interface PageSeoInput {
  /** Page title WITHOUT the site suffix (the root layout template appends it). */
  title: string
  description: string
  /** Canonical path, e.g. "/envios". */
  path: string
  /** Absolute URL or site-relative path. Defaults to the site OG image. */
  image?: string
  ogType?: 'website' | 'article'
  noindex?: boolean
}

/**
 * Builds page metadata with canonical, hreflang, OpenGraph and Twitter.
 * Next.js merges openGraph/twitter shallowly, so every page must restate the
 * full object; this helper keeps that consistent.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  image = SITE_DEFAULT_OG_IMAGE,
  ogType = 'website',
  noindex = false,
}: PageSeoInput): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: { 'es-AR': path },
    },
    openGraph: {
      type: ogType,
      locale: SITE_LOCALE,
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [image],
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  }
}

export const noIndexMetadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

/**
 * products.meta_description stores a JSON blob (vinyl ids, config) in this
 * codebase, so it must never be used as a visible description verbatim.
 */
export function cleanDescription(value: string | null | undefined, max = 160): string | null {
  if (!value) return null
  const text = value.trim()
  if (!text || text.startsWith('{') || text.startsWith('[')) return null
  const flat = text.replace(/\s+/g, ' ')
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat
}
