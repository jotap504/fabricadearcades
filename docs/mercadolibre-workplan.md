# Ruta de trabajo — Integración MercadoLibre

Objetivo: integrar MercadoLibre al sitio y al flujo comercial existente sin romper la web actual, sin duplicar datos innecesariamente y manteniendo Supabase como fuente principal del negocio.

## Estado deseado

La web debe poder:

- Conectar una cuenta vendedora de MercadoLibre.
- Importar publicaciones existentes.
- Relacionar publicaciones de MercadoLibre con productos internos.
- Recibir preguntas de publicaciones.
- Usar el chatbot con conocimiento autorizado para responder cuando corresponda.
- Derivar a humano si el bot no sabe.
- Permitir responder desde el panel o desde el flujo humano definido.
- Sincronizar ventas/órdenes de MercadoLibre con el panel.
- Mantener stock/precios bajo reglas claras para no vender de más.

## Principio de integración

MercadoLibre no debe reemplazar el ecommerce propio.

Debe funcionar como un canal externo conectado:

```text
Producto interno
   ↓
Publicación MercadoLibre vinculada
   ↓
Preguntas / ventas / stock / precio
   ↓
Panel administrativo + chatbot + Supabase
```

Supabase sigue siendo la base principal de productos, stock, pedidos, clientes y conversaciones.

## Nota sobre MCP

Primero intentar usar el MCP oficial/disponible de MercadoLibre si está conectado en Codex.

Si no hay herramienta MCP disponible en la sesión:

- usar API REST oficial de MercadoLibre;
- dejar el código desacoplado para poder cambiar luego a MCP;
- no hardcodear endpoints si pueden encapsularse en un cliente `mercadolibre`.

Documentación base verificada:

- Developers MercadoLibre tiene módulos de publicaciones, preguntas/respuestas, órdenes, usuarios, notificaciones, precios, envíos y User Products.
- Para nuevas integraciones de publicación hay que revisar User Products y la documentación vigente antes de implementar.
- MercadoLibre usa OAuth y access tokens/refresh tokens.

## Fase 0 — Auditoría y decisión técnica

Antes de programar:

1. Verificar si existe MCP de MercadoLibre instalado o conectable en Codex.
2. Revisar documentación actual de MercadoLibre:
   - OAuth / autorización;
   - usuarios y aplicaciones;
   - publicaciones/items/User Products;
   - preguntas y respuestas;
   - órdenes;
   - notificaciones/webhooks;
   - precios;
   - stock;
   - envíos.
3. Revisar el esquema local:
   - `products`;
   - `product_variants`;
   - `stock_items`;
   - `orders`;
   - `order_items`;
   - `chatbot_conversations`;
   - `chatbot_messages`;
   - `chatbot_knowledge_items`;
   - `chatbot_handoff_routes`;
   - `customer_contacts`.
4. Definir qué será editable desde el panel propio y qué solo se leerá desde MercadoLibre.
5. No modificar producción hasta tener flujo probado con cuenta/test.

## Fase 1 — Credenciales y conexión OAuth

Crear módulo admin:

```text
/admin/mercadolibre
```

Subsecciones sugeridas:

- Estado de conexión.
- Publicaciones.
- Preguntas.
- Ventas.
- Configuración.
- Logs/sincronización.

Variables de entorno necesarias:

```ini
MELI_CLIENT_ID=
MELI_CLIENT_SECRET=
MELI_REDIRECT_URI=
MELI_SITE_ID=MLA
MELI_WEBHOOK_SECRET=
```

Reglas:

- `MELI_CLIENT_SECRET` nunca va al navegador.
- Tokens se guardan cifrados o, como mínimo, server-side en Supabase con RLS estricta.
- Usar refresh token antes de expiración.
- Registrar auditoría de conexión/desconexión.

Tablas propuestas:

```sql
mercadolibre_accounts
mercadolibre_tokens
mercadolibre_sync_logs
```

Campos conceptuales:

- cuenta ML;
- seller/user id;
- nickname;
- access token;
- refresh token;
- vencimiento;
- scopes/permisos;
- estado de conexión;
- último sync.

## Fase 2 — Importar publicaciones

Objetivo: traer publicaciones existentes de MercadoLibre al panel.

Crear tablas:

```sql
mercadolibre_listings
mercadolibre_listing_variations
```

Datos a guardar:

- item id;
- seller id;
- título;
- permalink;
- thumbnail/imágenes;
- precio;
- moneda;
- estado;
- cantidad disponible;
- cantidad vendida;
- categoría ML;
- tipo de publicación;
- modalidad de compra;
- shipping mode;
- raw payload reducido.

Panel:

- listado de publicaciones;
- búsqueda por título/item id;
- filtro por estado;
- botón “sincronizar ahora”;
- fecha de última sincronización.

## Fase 3 — Vincular publicaciones con productos internos

Crear tabla:

```sql
mercadolibre_product_links
```

Función:

- Relacionar `mercadolibre_listings.item_id` con `products.id`.
- Opcionalmente con `product_variants.id` o `stock_items.id`.

Casos:

1. Publicación representa un producto listo.
2. Publicación representa un producto a pedido.
3. Publicación representa una familia/modelo y requiere aclaración.

Reglas:

- No asumir equivalencia automática si el título se parece.
- Sugerir match, pero que el admin confirme.
- Mostrar alerta si una publicación no está vinculada.

## Fase 4 — Preguntas de MercadoLibre

Objetivo: recibir y responder preguntas de publicaciones.

Crear tablas:

```sql
mercadolibre_questions
mercadolibre_question_events
```

Datos:

- question id;
- item id;
- texto;
- estado;
- fecha;
- buyer id si está disponible;
- respuesta enviada;
- answered_at;
- source: bot/admin/human;
- raw payload.

Flujo:

1. MercadoLibre notifica pregunta o se sincroniza por polling.
2. Se guarda pregunta.
3. Se identifica publicación y producto vinculado.
4. Se arma contexto autorizado:
   - knowledge items activos;
   - producto interno vinculado;
   - reglas de pagos/envíos/producción;
   - datos de stock si corresponde.
5. Bot decide:
   - responder;
   - repreguntar si MercadoLibre lo permite y tiene sentido;
   - derivar a humano.
6. Guardar fuentes usadas.
7. Enviar respuesta a MercadoLibre solo si pasa validación.

Regla crítica:

- No publicar respuestas inventadas en MercadoLibre.
- No mencionar datos de contacto si MercadoLibre lo prohíbe.
- No prometer stock/precio/plazos si no están autorizados en el contexto.

## Fase 5 — Handoff humano para preguntas ML

Si el bot no sabe:

- crear registro en “Sin respuesta”;
- marcar pregunta como pendiente de humano;
- reenviar a responsable de MercadoLibre.

Responsable actual previsto:

```text
5491153078610
```

Flujo deseado:

```text
Cliente pregunta en MercadoLibre
   ↓
Bot no sabe
   ↓
Sistema envía pregunta al responsable por WhatsApp
   ↓
Responsable responde
   ↓
Sistema envía esa respuesta al cliente en MercadoLibre
   ↓
Panel ofrece “Agregar al conocimiento”
```

Importante:

- La respuesta humana no debe aprenderse automáticamente.
- El admin debe aprobar “Aprender”.
- Registrar quién respondió y qué se publicó.

## Fase 6 — Órdenes / ventas ML

Crear tablas:

```sql
mercadolibre_orders
mercadolibre_order_items
```

Sincronizar:

- order id;
- buyer id;
- item id;
- cantidad;
- precio;
- estado;
- pago;
- envío;
- fecha;
- raw payload reducido.

Integración con pedidos internos:

- Si la publicación está vinculada a stock listo:
  - reservar/descontar stock listo.
  - No tocar insumos.
- Si es producto a pedido:
  - crear pedido interno.
  - pasar a producción.
  - descontar/reservar insumos según reglas existentes.
- Si no hay vínculo:
  - marcar venta como “requiere revisión”.

No permitir stock negativo.

## Fase 7 — Sincronización de stock y precios

Definir dirección de sincronización.

Recomendación inicial:

- El sistema propio manda disponibilidad/precio hacia MercadoLibre.
- MercadoLibre se importa como canal, pero no pisa productos internos automáticamente.

Reglas:

- Stock listo: publicar cantidad real disponible/reservable.
- A pedido: publicar cantidad controlada, no infinita sin criterio.
- Si una venta ML consume última unidad, catálogo propio debe reflejarlo.
- Precio ML puede incluir comisiones/margen distinto al ecommerce propio.

Agregar configuración:

```text
Margen/costo MercadoLibre
Precio mínimo
Sincronizar stock automáticamente: sí/no
Sincronizar precio automáticamente: sí/no
```

## Fase 8 — Panel administrativo ML

Módulo `/admin/mercadolibre`:

### Dashboard

- conexión activa/inactiva;
- publicaciones activas;
- preguntas pendientes;
- ventas recientes;
- errores de sync;
- últimos eventos.

### Publicaciones

- importar/sincronizar;
- ver estado;
- vincular con producto interno;
- ver stock/precio;
- pausar/activar si se decide permitirlo.

### Preguntas

- bandeja tipo chat/lista;
- filtro sin responder/respondidas/derivadas;
- respuesta sugerida del bot;
- responder manualmente;
- aprobar aprendizaje.

### Ventas

- listado de órdenes;
- estado pago/envío;
- vínculo con pedido interno;
- crear pedido interno si falta.

### Configuración

- credenciales/conexión;
- sync automático;
- responsable de handoff;
- reglas de precio/stock;
- logs.

## Fase 9 — Worker o cron de sincronización

Opciones:

1. Vercel cron / Route Handler:
   - útil para sync liviano.
   - no ideal para procesos largos.

2. Worker en VPS:
   - recomendado si hay polling frecuente o webhooks externos.
   - puede convivir en `/opt/whatsapp-bot` o en `/opt/mercadolibre-worker`.
   - mejor separado si crece.

Recomendación inicial:

- Webhooks/API handlers en Vercel para eventos simples.
- Worker/cron VPS solo si hace falta polling robusto o procesos largos.

## Fase 10 — Webhooks/notificaciones

Crear endpoint:

```text
/api/mercadolibre/webhook
```

Debe:

- validar origen/firma si MercadoLibre lo permite en la configuración usada;
- deduplicar eventos;
- guardar raw event;
- encolar/sincronizar recurso específico;
- responder rápido.

Tabla:

```sql
mercadolibre_events
```

Campos:

- topic;
- resource;
- user_id;
- attempts;
- received_at;
- processed_at;
- status;
- error.

## Fase 11 — Chatbot + MercadoLibre

Extender el bot actual para soportar canal:

```text
channel = whatsapp | mercadolibre
```

O crear tablas separadas al principio y unir en el panel.

Recomendación:

- Mantener preguntas ML en tablas `mercadolibre_*`.
- Reutilizar `chatbot_knowledge_items`.
- Reutilizar lógica RAG/LLM.
- Guardar fuentes usadas en una tabla específica o extender `answer_sources`.

Acciones del LLM:

- `ANSWER`
- `CLARIFY`
- `HANDOFF`

Para MercadoLibre hay que validar además:

- no enviar teléfono/email/contacto si no corresponde;
- no mandar links externos si MercadoLibre los bloquea;
- no prometer condiciones fuera de la publicación.

## Fase 12 — Tests obligatorios

### Conexión

- OAuth conecta.
- Refresh token renueva.
- Desconectar cuenta no borra datos históricos.

### Publicaciones

- Importa publicaciones.
- Vincula publicación con producto interno.
- Detecta publicación sin vínculo.
- Actualiza estado/precio/stock.

### Preguntas

- Pregunta con conocimiento exacto: responde.
- Pregunta redactada distinto: responde.
- Pregunta ambigua: repregunta.
- Pregunta sin conocimiento: deriva.
- Prompt injection: no obedece.
- Pregunta con datos de contacto: no infringe reglas.
- Respuesta humana por WhatsApp se publica en ML solo si corresponde.

### Ventas

- Venta de stock listo descuenta/reserva producto terminado.
- Venta de producto a pedido crea producción.
- No permite stock negativo.
- Venta sin vínculo queda para revisión.

### Fallos

- MercadoLibre API caído: no inventar ni marcar respondido.
- Supabase caído: no responder.
- OpenRouter caído: derivar o dejar pendiente.
- Evento duplicado: no responder dos veces.

## Riesgos

- Cambios frecuentes en APIs de MercadoLibre/User Products.
- Restricciones de contacto dentro de preguntas/respuestas.
- Rate limits.
- Diferencias entre stock interno y stock publicado.
- Publicaciones moderadas si títulos/descripciones no cumplen políticas.
- Órdenes de ML pueden tener flujos de pago/envío distintos al ecommerce propio.

## Orden recomendado de implementación

1. Conectar cuenta MercadoLibre por OAuth.
2. Importar publicaciones en modo solo lectura.
3. Panel de publicaciones + vinculación manual con productos internos.
4. Importar preguntas en modo solo lectura.
5. Respuesta manual desde panel.
6. Sugerencia del bot sin publicar automáticamente.
7. Publicación automática de respuestas solo cuando pase validación.
8. Handoff por WhatsApp al responsable ML.
9. Importar ventas/órdenes.
10. Crear pedidos internos desde ventas ML.
11. Sincronizar stock.
12. Sincronizar precios.

## Definiciones pendientes

- Cuenta/app de MercadoLibre a usar.
- Si se usará MCP oficial o API REST directa.
- Alcance inicial: preguntas solamente, publicaciones, ventas o todo.
- Si las respuestas automáticas a preguntas ML deben publicarse sin aprobación o primero como sugerencia.
- Margen/costo específico para MercadoLibre.
- Estrategia de stock para productos a pedido.
- Responsable humano definitivo para MercadoLibre.

## Recomendación de MVP

MVP más seguro:

1. OAuth + conexión.
2. Importar publicaciones.
3. Vincular publicaciones a productos internos.
4. Importar preguntas.
5. Generar respuesta sugerida con bot.
6. Admin aprueba/envía respuesta.
7. Registrar preguntas sin respuesta y permitir aprender.

Después pasar a automático.

Motivo: MercadoLibre tiene reglas y moderaciones; conviene validar calidad antes de que el bot publique solo.
