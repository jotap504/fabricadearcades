export function getSimpleReply(text: string, firstName?: string | null): string | null {
  const normalized = text.trim().toLocaleLowerCase('es')
  if (/^(hola|buenas|buen dia|buen día|buenas tardes|buenas noches)[!.\s]*$/.test(normalized)) {
    return firstName ? `¡Hola ${firstName}! ¿En qué puedo ayudarte?` : '¡Hola! ¿En qué puedo ayudarte?'
  }
  if (/^(gracias|muchas gracias|ok gracias|dale gracias)[!.\s]*$/.test(normalized)) {
    return '¡De nada! Quedo atento.'
  }
  return null
}

export function getSafeFirstName(displayName?: string | null): string | null {
  const clean = displayName?.trim()
  if (!clean) return null
  if (/[^a-záéíóúñü'\-\s]/i.test(clean)) return null

  const first = clean.split(/\s+/)[0]
  if (first.length < 2 || first.length > 24) return null

  return first.charAt(0).toLocaleUpperCase('es') + first.slice(1).toLocaleLowerCase('es')
}
