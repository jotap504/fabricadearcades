<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Fábrica de Arcades — guía persistente para agentes IA

Este repositorio contiene la web comercial, el panel administrativo, la lógica de pedidos/stock/producción y la integración del chatbot de WhatsApp de Fábrica de Arcades.

Usar este archivo como punto de partida antes de modificar el proyecto. Si una IA futura no conoce el historial de conversación, debe poder entender el producto desde acá.

## Stack y arquitectura

- Framework: Next.js 16.3.1 con App Router.
- Frontend público y panel admin: `src/app`.
- Componentes compartidos: `src/components`.
- Supabase Cloud: base de datos, auth, storage/URLs y datos comerciales.
- Vercel: despliegue del frontend existente. No migrar la web a VPS.
- VPS Truobox: solo servicios persistentes del bot de WhatsApp en Docker.
- WhatsApp: Evolution API + worker Node/TypeScript en `whatsapp-bot/worker`.
- LLM y embeddings: OpenRouter.

No instalar Supabase self-hosted. No duplicar Postgres para datos de negocio. No tocar servicios existentes del VPS fuera del directorio aislado del bot.

## Variables y secretos importantes

Nunca commitear `.env` ni claves reales.

Frontend/Vercel usa variables como:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` solo server-side.
- `WHATSAPP_BOT_WORKER_URL`
- `EVOLUTION_API_URL`
- `EVOLUTION_INSTANCE`
- `LLM_API_KEY`
- `LLM_BASE_URL=https://openrouter.ai/api/v1`
- `LLM_MODEL=deepseek/deepseek-chat-v3.1`
- `EMBEDDING_PROVIDER=openrouter`
- `EMBEDDING_BASE_URL=https://openrouter.ai/api/v1`
- `EMBEDDING_MODEL=openai/text-embedding-3-small`

VPS:

- Carpeta aislada: `/opt/whatsapp-bot`.
- Worker: `fabrica-whatsapp-bot-worker`.
- Evolution: `fabrica-evolution-api`.
- Redis/Postgres internos de Evolution: solo para persistencia de Evolution, no para negocio.
- Los datos de negocio siguen en Supabase Cloud.

## Reglas de seguridad

- No exponer `SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY`, `EVOLUTION_API_KEY` ni tokens privados al navegador.
- Las Server Actions deben validar admin con `requireAdmin`.
- Tratar Server Actions como endpoints públicos: autenticar, autorizar y devolver objetos simples.
- No borrar ni truncar tablas sin autorización explícita y reciente.
- No tocar producción/VPS sin autorización explícita del usuario.
- Antes de cambios de Supabase, revisar migraciones y mantener RLS/policies.
- No usar `$HOME`, `~`, raíz del repo o rutas amplias como destino destructivo.

## Funciones públicas de la web

### Home

- Hero principal con imágenes móviles/clickeables hacia productos.
- Botón para ver todo el catálogo.
- Carrusel infinito de logos de consolas debajo del botón principal.
- Sección “Explora por categoría”.
- Modo claro/oscuro, con modo Light como preferencia por defecto.
- WhatsApp flotante.

### Catálogo

- Página de productos en `/productos`.
- Cards de producto con:
  - imagen principal;
  - flechas para cambiar vinilo cuando el producto es “A pedido”;
  - etiqueta “Entrega inmediata” si hay stock terminado;
  - etiqueta “A pedido” si no hay stock terminado;
  - productos con entrega inmediata primero;
  - precio mostrado como precio de lista + margen configurado;
  - selector/dropdown de vinilo en productos personalizables;
  - no permitir cambio de vinilo cuando el producto es stock listo.
- Los productos en stock listo deben aparecer en catálogo, al principio.
- Los productos sin stock listo no deben decir “sin stock”; deben decir “A pedido”.

### Detalle de producto

- Galería de imágenes grande.
- Selector de vinilos disponibles.
- Si el producto es “Entrega inmediata”:
  - mostrar el vinilo real con el que está armado;
  - no permitir cambio de vinilo;
  - mostrar acción directa “Agregar al carrito” o “Comprar”, no “Personalizar”.
- Si el producto es “A pedido”:
  - permite seleccionar vinilo;
  - puede configurar componentes, colores y extras según producto.
- Sección de descripción.
- Debajo de descripción pueden mostrarse dos hileras de logos miniatura:
  - primera hilera: 10 logos principales seleccionados;
  - segunda hilera: resto de logos seleccionados;
  - carrusel infinito hacia la derecha.
- Existen presets de logos para reutilizar selecciones entre productos.

### Personalización visual

- Diferenciar por jugador:
  - Player 1: color de palanca y color de botones.
  - Player 2: color de palanca y color de botones.
- Debe existir selector visual de colores, no exigir códigos hex manuales.
- Layout visual de palancas y botones:
  - Player 1 y Player 2 uno al lado del otro cuando el espacio lo permita.
  - Reducir separación entre palanca y botones.
  - La cantidad/distribución debe respetar lo cargado por producto.
  - Reglas habituales:
    - 6 botones abajo: 2 líneas de 3.
    - 8 botones abajo: 2 líneas de 4.
    - 8 botones totales: 6 abajo y 2 arriba.
    - 10 botones: 6 abajo y 2 arriba.
    - 11 botones: 8 abajo y 3 arriba.
    - 13 botones: 8 abajo y 5 arriba.

## Panel administrativo

El panel vive bajo `/admin`.

### Dashboard

- Resumen general de actividad.
- Acceso a tienda, stock, pedidos, producción, clientes y chatbot.

### Productos

- CRUD de productos.
- Selector de categoría al crear/editar.
- Manejo de variantes/vinilos.
- Selección de portada del producto.
- Agregar/quitar variantes.
- Precios:
  - base/lista;
  - margen minorista;
  - precio mostrado = lista + margen configurado.
- Configuración de productos a medida:
  - familias de insumos/componentes;
  - cantidad de botones/palancas;
  - LED permitido o no;
  - tiempos de producción;
  - logos/consolas asociados;
  - presets de logos.

### Categorías

Categorías visibles actuales incluyen, entre otras:

- Arcades
- Consolas
- Fightsticks
- Bartops
- Pedestales

### Insumos

- CRUD de insumos.
- Familias de insumos.
- Control de stock disponible.
- No permitir stock negativo, salvo lógica especial de vinilos cuando corresponde generar pedido de impresión.
- Familias base de insumos:
  - Botón 30mm
  - Botón 30mm Led
  - Botón 24mm
  - Palanca Led
  - Palanca Std
  - Palanca Americana
  - Una familia por cada carpeta/tipo de vinilo para agrupar diseños.
- Palancas y botones deben tener colores corregidos/cargados para selección visual.
- Los vinilos son diseños disponibles para imprimir; que exista el diseño no significa que haya stock físico.
- Si se solicita un vinilo que no está disponible en insumos, debe lanzarse una orden/pedido de impresión.

### Stock

La gestión de stock distingue:

- Stock terminado/listo para entregar: productos ya armados.
- Stock impreso/diseñado de vinilos.
- Insumos/componentes disponibles.

Procedimiento interno:

- Para crear productos en stock, fábrica asigna componentes desde insumos.
- Esos componentes se descuentan del disponible al armar el stock.
- El producto terminado queda como stock listo.
- En catálogo debe mostrarse como “Entrega inmediata”.
- Stock listo no modifica palancas/botones/vinilo al vender; ya está armado.

### Armar stock

- Flujo interno para transformar insumos en producto terminado.
- Debe descontar componentes.
- No debe permitir stock negativo.
- Debe conservar el vinilo real usado para ese producto armado.

### Pedidos

Existen dos modalidades de compra:

1. Producto en stock/listo para entregar.
   - Se reserva al crear el pedido.
   - Vencimiento de reserva: 48 hs para cliente final.
   - Si vence y no se paga/continúa, se libera el stock.
   - No debe modificar insumos al vender, porque ya se descontaron al armar stock.

2. Producto a medida.
   - Cliente selecciona componentes/variantes desde insumos.
   - Pasa directo a producción, sin aprobación administrativa adicional.
   - Puede combinar productos listos y productos a medida en el mismo pedido.
   - Si falta vinilo físico, generar pedido/orden de impresión.

Clientes:

- Cliente final puede manejarse por email.
- Revendedores/distribuidores deben tener usuario/cuenta.
- Revendedor/distribuidor puede tener cuenta corriente.

Pagos:

- Tarjeta de crédito debe sumar porcentaje de costo operativo configurable.
- Referencia actual: 1 pago ronda 7%.
- Efectivo u otros medios pueden tener descuentos.
- Estos porcentajes/descuentos deben estar en configuración general del dashboard.

Entrega:

- Opciones:
  1. Retira el cliente.
  2. Se envía.
- Si se envía:
  - moto/flete si está a menos de 50 km de fábrica;
  - transporte/correo para interior del país.
- Envío siempre abonado por el cliente en destino.

### Producción

- Cola de producción.
- Debe tener filtros y búsqueda por estado.
- Los pedidos a medida pasan directo a producción.
- Si cliente cancela o se arrepiente:
  - resolución manual;
  - opción 1: dejar como stock listo para entregar;
  - opción 2: desarmar.

### Clientes / CRM

- Solapa de clientes en admin.
- Pensado para email marketing o WhatsApp marketing futuro.
- Datos desde pedidos, registros y chatbot.
- Manejo de clientes finales, revendedores y distribuidores.

### Usuarios

- Administración de usuarios.
- Roles relevantes:
  - admin;
  - distribuidor/revendedor;
  - cliente.
- Usuario admin de prueba solicitado previamente:
  - `admin@admin.com`
  - contraseña definida por el usuario en entorno de pruebas.

## Chatbot de WhatsApp

El chatbot NO es un bot que sabe de todo. Es un bot que entiende muchas formas de preguntar, pero solo debe responder usando conocimiento autorizado por el administrador.

Regla máxima:

- Si sabe con fuente autorizada, responde.
- Si falta un dato puntual, repregunta.
- Si no sabe, deriva.
- Si un humano interviene, se calla.
- Nunca aprende solo; aprende únicamente con aprobación humana.

### Componentes

- Evolution API: gateway WhatsApp.
- Bot Worker: `whatsapp-bot/worker`.
- Supabase: conversaciones, mensajes, conocimiento, embeddings, fuentes, preguntas sin respuesta, auditoría.
- OpenRouter:
  - LLM: `deepseek/deepseek-chat-v3.1`.
  - Embeddings: `openai/text-embedding-3-small`.

### Flujo del mensaje

1. Cliente escribe WhatsApp.
2. Evolution recibe mensaje.
3. Evolution llama webhook del worker.
4. Worker valida y normaliza.
5. Deduplica por `external_message_id`.
6. Guarda mensaje en Supabase.
7. Revisa modo de conversación:
   - `BOT`: puede responder.
   - `HUMAN`: guarda, no responde.
   - `PAUSED`: guarda, no responde.
8. Aplica debounce para agrupar mensajes rápidos.
9. Resuelve saludos/agradecimientos por reglas simples.
10. Busca conocimiento por embeddings/RAG.
11. Llama al LLM con structured output.
12. Acciones posibles:
   - `ANSWER`: responde.
   - `CLARIFY`: repregunta.
   - `HANDOFF`: deriva.
13. Guarda respuesta y fuentes usadas.

### Repreguntas

- El bot puede repreguntar hasta 2 veces.
- Después de 2 repreguntas sin poder responder con seguridad, deriva a humano.
- No debe repreguntar eternamente.

### Saludos

- Saludos simples se responden sin RAG/LLM.
- Ejemplos:
  - `hola`
  - `hola consulta`
  - `buen día`
  - `buenas tardes`
  - `gracias`
- No depender de embeddings para saludos, porque los textos cortos producen coincidencias raras.

### Handoff / derivación humana

- Cuando el bot no puede responder, cambia conversación a `HUMAN`.
- Envía una sola vez el mensaje de derivación configurado.
- Crea registro en preguntas sin respuesta.
- Puede reenviar la consulta a responsables humanos según rutas.

Rutas de derivación configuradas:

- MercadoLibre / publicaciones externas: `5491153078610`.
- Arcades / juegos / consolas: `5491164045074`.

Estado temporal:

- La ruta a `5491164045074` fue pausada para permitir usar ese número en pruebas.
- No borrar la ruta; solo está inactiva.

### Respuestas desde teléfonos responsables

- Si hay una derivación pendiente y responde el responsable, el sistema reenvía esa respuesta al cliente original.
- Si un teléfono responsable escribe sin derivación pendiente, no debe tratarse como cliente común.
- Evitar falsos “human takeover” por mensajes enviados por el propio bot.

### Base de conocimiento

Panel: `/admin/chatbot/conocimiento`.

- CRUD de knowledge items.
- Cada item tiene categoría, título, contenido, activo, prioridad y embedding.
- Al editar contenido, conviene regenerar embedding.
- El bot solo debe usar conocimiento activo.
- Si el administrador aprueba una pregunta sin respuesta como aprendizaje, se crea conocimiento; nunca aprender automáticamente.

### Preguntas sin respuesta

Panel: `/admin/chatbot/sin-respuesta`.

- Guarda preguntas que terminaron en handoff.
- Permite convertir respuesta humana en conocimiento con aprobación.

### Configuración del chatbot

Panel: `/admin/chatbot/configuracion`.

Configuraciones típicas:

- nombre empresa;
- mensaje bienvenida;
- mensaje handoff;
- `confidence_threshold`;
- `rag_threshold`;
- `top_k`;
- modelo;
- temperatura;
- bot activo/inactivo.

Mantener temperatura baja. Se busca consistencia, no creatividad factual.

## Integración MercadoLibre

Existe una ruta de trabajo específica en `docs/mercadolibre-workplan.md`.

Principio:

- MercadoLibre debe integrarse como canal externo, no reemplazar el ecommerce propio.
- Supabase sigue siendo la fuente principal de productos, stock, pedidos, clientes y conversaciones.
- Antes de implementar, verificar si hay MCP oficial/disponible de MercadoLibre conectado en Codex.
- Si no hay MCP disponible, usar API REST oficial de MercadoLibre con un cliente desacoplado.
- Empezar en modo seguro: importar publicaciones/preguntas, vincular con productos internos y sugerir respuestas antes de publicar automáticamente.
- No responder ni publicar automáticamente en MercadoLibre información no autorizada por conocimiento interno.
- Cuidar restricciones de MercadoLibre sobre datos de contacto, links externos, títulos, descripciones, stock y moderaciones.
- Responsable humano previsto para MercadoLibre: `5491153078610`.

## Supabase y migraciones

Archivos SQL relevantes:

- `supabase/schema.sql`: esquema principal de tienda.
- `supabase/order_flow_upgrade.sql`: mejoras de pedidos, reservas, stock y producción.
- `supabase/customer_crm.sql`: clientes/CRM.
- `supabase/chatbot_core.sql`: tablas base chatbot.
- `supabase/chatbot_seed_initial_knowledge.sql`: conocimiento inicial.
- `supabase/chatbot_commercial_integration.sql`: clientes/conversaciones comerciales.
- `supabase/chatbot_handoff_routing.sql`: rutas y solicitudes de handoff.
- `supabase/seed_ventas_catalog.sql`: carga desde Excel/carpeta `/ventas`.
- `supabase/tests/order_flow.test.sql`: pruebas funcionales de pedidos.

Tablas importantes del negocio:

- `user_profiles`
- `categories`
- `products`
- `product_variants`
- `product_bundles`
- `supply_inventory`
- `stock_items`
- `delivery_config`
- `orders`
- `order_items`
- `production_queue`
- `customer_contacts`

Tablas importantes del chatbot:

- `chatbot_conversations`
- `chatbot_messages`
- `chatbot_knowledge_items`
- `chatbot_answer_sources`
- `chatbot_unanswered_questions`
- `chatbot_bot_settings`
- `chatbot_audit_log`
- `chatbot_customers`
- `chatbot_handoff_routes`
- `chatbot_handoff_requests`
- `chatbot_outbox`

## Tests y verificación

Antes de entregar cambios importantes:

- Ejecutar `npx tsc --noEmit`.
- Ejecutar `npm run build`.
- `npm run lint` puede fallar por deuda previa de lint no relacionada; no asumir que el cambio nuevo rompió todo si los errores ya existían.
- Para worker:
  - si hay dependencias instaladas: `npm --prefix whatsapp-bot/worker run build`;
  - en VPS: reconstruir `bot-worker` y consultar `/ready`.
- Para cambios de stock/pedidos, revisar `supabase/tests/order_flow.test.sql`.

Pruebas funcionales críticas:

- Stock listo se reserva por 48 hs y vuelve si vence.
- Stock listo no descuenta insumos al vender.
- Producto a medida pasa a producción.
- No permitir stock negativo.
- Vinilo faltante genera pedido de impresión.
- Cancelación en producción permite restock o desarme.
- Chatbot responde cuando tiene conocimiento.
- Chatbot repregunta antes de derivar si falta contexto.
- Chatbot deriva cuando no sabe.
- Chatbot no responde en modo HUMAN/PAUSED.
- Mensaje duplicado no genera doble respuesta.
- Respuesta humana desde WhatsApp detiene/continúa según corresponda.

## Cuidado con assets e imágenes

- Vinilos: carpetas bajo `public/vinilos` o fuente `/ventas` según carga.
- Logos: `public/logos`.
- Muchas imágenes tienen fondo blanco; la web tiene modo Light/Dark.
- Para dark mode se prefieren contenedores, fondos suavizados o versión light si el blanco choca demasiado.
- No destruir ni renombrar assets masivamente sin revisar referencias.

## Convenciones de trabajo

- Usar `rg` para buscar.
- Usar `apply_patch` para editar archivos desde Codex.
- Preservar cambios del usuario y archivos no relacionados.
- Antes de tocar Supabase, leer instrucciones/skills de Supabase si están disponibles.
- Antes de tocar UI, considerar consistencia visual del admin y catálogo.
- Antes de tocar Next.js, leer docs locales relevantes en `node_modules/next/dist/docs/` por la advertencia superior.
- Commits autorizados previamente por el usuario pueden subirse a `main`, pero revisar diffs y no incluir secretos ni archivos no relacionados.
