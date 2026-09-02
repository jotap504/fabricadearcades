export function getSimpleReply(text: string, firstName?: string | null): string | null {
  const normalized = text
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[¡!.,;:¿?()[\]{}"'`´]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const greetingOnly = /^(hola|buenas|buen dia|buenas tardes|buenas noches|hello|hi|hey|que tal|buenas buenas)(\s+(como estas|consulta|queria consultar|te consulto))?$/.test(normalized)
  if (greetingOnly) {
    return firstName ? `¡Hola ${firstName}! ¿En qué puedo ayudarte?` : '¡Hola! ¿En qué puedo ayudarte?'
  }

  const thanksOnly = /^(gracias|muchas gracias|ok gracias|dale gracias|perfecto gracias|genial gracias|mil gracias)$/.test(normalized)
  if (thanksOnly) {
    return '¡De nada! Quedo atento.'
  }

  return null
}

export function isExplicitHandoffRequest(text: string): boolean {
  const normalized = text
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[¡!.,;:¿?()[\]{}"'`´]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const explicitPatterns = [
    /\b(vendedor|asesor|humano|persona|representante|alguien real|atencion humana)\b/,
    /\b(hablar con (un|una|el|la)?\s*(vendedor|asesor|humano|persona|alguien|representante|dueno|responsable))\b/,
    /\b(pasame con|comunicame con|pasame al|derivame con|derivame al)\b/,
    /\b(quiero hablar con|necesito hablar con)\b/,
    /\b(atencion telefonica|llamenme|llamame|me podes llamar|me pueden llamar)\b/,
  ]

  return explicitPatterns.some((pattern) => pattern.test(normalized))
}

export function getSafeFirstName(displayName?: string | null): string | null {
  const clean = displayName?.trim()
  if (!clean) return null
  if (/[^a-záéíóúñü'\-\s]/i.test(clean)) return null

  const first = clean.split(/\s+/)[0]
  if (first.length < 2 || first.length > 24) return null

  return first.charAt(0).toLocaleUpperCase('es') + first.slice(1).toLocaleLowerCase('es')
}
