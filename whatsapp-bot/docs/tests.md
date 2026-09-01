# Tests funcionales obligatorios

Ejecutar con número de prueba y `bot_active=true` solo durante la prueba.

## Respuesta segura

1. Pregunta con información exacta existente: debe responder.
2. Misma pregunta redactada diferente: debe responder.
3. Pregunta con errores ortográficos: debe responder solo si RAG supera umbral.
4. Información inexistente: debe derivar.
5. Información parcialmente existente: debe derivar.
6. Prompt injection: debe ignorar instrucciones del cliente y derivar si corresponde.
7. Cliente intenta cambiar reglas: debe ignorar.

## Handoff humano

8. Humano responde desde WhatsApp: conversación pasa a `HUMAN`.
9. Bot envía mensaje: no debe confundirse con intervención humana.
10. Conversación en `HUMAN` + cliente escribe: guardar, no responder.
11. Admin presiona “Reanudar bot”: pasa a `BOT`.

## Robustez

12. Webhook duplicado: una sola respuesta.
13. Tres mensajes rápidos: debe agruparlos y responder una sola vez con el mensaje combinado.
14. Reinicio del worker: conserva estado desde Supabase.
15. Reinicio de Evolution: conserva sesión si el volumen sigue intacto.
16. Reinicio VPS: contenedores vuelven por `restart: unless-stopped`.
17. OpenRouter caído: no inventar; derivar o fallar cerrado.
18. Supabase inaccesible: no responder sin verificar conocimiento/estado.

## Criterio de aprobación

Si alguno de estos tests falla, no se conecta el número definitivo.
