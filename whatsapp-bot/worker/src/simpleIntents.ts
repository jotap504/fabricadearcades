export function getSimpleReply(text: string): string | null {
  const normalized = text.trim().toLocaleLowerCase('es')
  if (/^(hola|buenas|buen dia|buen día|buenas tardes|buenas noches)[!.\s]*$/.test(normalized)) {
    return '¡Hola! ¿En qué puedo ayudarte?'
  }
  if (/^(gracias|muchas gracias|ok gracias|dale gracias)[!.\s]*$/.test(normalized)) {
    return '¡De nada! Quedo atento.'
  }
  return null
}
