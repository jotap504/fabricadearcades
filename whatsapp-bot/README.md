# WhatsApp Bot — Fábrica de Arcades

Este módulo agrega el chatbot de WhatsApp sin mover la web de Vercel ni reemplazar Supabase Cloud.

Estado actual: primera implementación técnica, todavía no conectada al número real.

## Componentes

- `evolution-api`: gateway de WhatsApp.
- `evolution-postgres`: base operativa aislada para Evolution API.
- `evolution-redis`: cache/cola aislada para Evolution API.
- `bot-worker`: servicio propio que recibe webhooks, consulta Supabase, llama a OpenRouter y decide si responde o deriva.
- Supabase Cloud: conserva conversaciones, mensajes, conocimiento, configuración y auditoría.

## Antes de usar

1. Aplicar `supabase/chatbot_core.sql` en Supabase.
2. Copiar `.env.example` a `.env`.
3. Completar claves reales.
4. Definir `EVOLUTION_IMAGE` con una versión fija de Evolution API. No usar `latest`.
5. Probar primero con un número de WhatsApp de prueba.

## Seguridad

- No commitear `.env`.
- No exponer `SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY` ni `EVOLUTION_API_KEY` al frontend.
- Mantener `bot_active=false` hasta terminar pruebas.

## Persistencia

La sesión local de Evolution queda en el volumen Docker `evolution_instances`.
Una actualización de contenedor no debería borrar ese volumen, aunque WhatsApp igualmente podría pedir revinculación externa.
