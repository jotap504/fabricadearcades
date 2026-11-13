// SEO copy for the catalog and its category views (/productos?categoria=<slug>).
// Only general, already-published facts: no prices, stock counts or promises here.

const COMMON_TAIL =
  'Precios en pesos, entrega inmediata o fabricación a pedido y envíos a todo el país.'

export const CATALOG_SEO = {
  title: 'Catálogo de Arcades, Bartops, Fightsticks y Consolas',
  description: `Catálogo completo de TodoArcade: máquinas arcade, bartops, pedestales, fightsticks, consolas retro y accesorios fabricados en Argentina. ${COMMON_TAIL}`,
}

/** Slug used by the "Entrega Inmediata" tab (and its legacy alias). */
export const IMMEDIATE_SLUGS = ['express', 'inmediata']
export const IMMEDIATE_CANONICAL_SLUG = 'express'

export const IMMEDIATE_SEO = {
  heading: 'Entrega Inmediata',
  title: 'Arcades con Entrega Inmediata',
  description:
    'Arcades, consolas y fightsticks ya armados y en stock, listos para retirar o enviar. Equipos con entrega inmediata de TodoArcade, fabricados en Argentina.',
}

const CATEGORY_SEO: Record<string, { title: string; lead: string }> = {
  arcades: {
    title: 'Máquinas Arcade Multijuegos',
    lead: 'Máquinas arcade multijuegos fabricadas en Argentina por TodoArcade, con vinilo y colores de palancas y botones a elección.',
  },
  consolas: {
    title: 'Consolas Arcade Retro',
    lead: 'Consolas arcade retro multijuegos fabricadas en Argentina por TodoArcade.',
  },
  fightsticks: {
    title: 'Fightsticks y Controles Arcade',
    lead: 'Fightsticks y controles arcade con palanca y botones, fabricados en Argentina por TodoArcade.',
  },
  bartops: {
    title: 'Bartops Arcade',
    lead: 'Bartops arcade fabricados en Argentina por TodoArcade, con vinilo y colores a elección.',
  },
  pedestales: {
    title: 'Pedestales Arcade',
    lead: 'Pedestales arcade fabricados en Argentina por TodoArcade.',
  },
  't-molding': {
    title: 'T-Molding (Tapacanto en T) para Arcade',
    lead: 'T-molding o tapacanto en T negro de 16 mm y 18,5 mm para terminar los cantos de muebles arcade.',
  },
  insumos: {
    title: 'Insumos y Accesorios para Arcade',
    lead: 'Insumos y accesorios para arcade de TodoArcade.',
  },
}

export function categorySeo(slug: string, name: string) {
  const known = CATEGORY_SEO[slug]
  return {
    heading: name,
    title: known?.title ?? `${name} | Catálogo`,
    description: `${known?.lead ?? `${name} de TodoArcade, fabricados en Argentina.`} ${COMMON_TAIL}`,
  }
}

export function categoryPath(slug: string) {
  return `/productos?categoria=${encodeURIComponent(slug)}`
}
