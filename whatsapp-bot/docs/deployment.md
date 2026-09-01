# Despliegue seguro en Truobox

Este despliegue no mueve la web de Vercel ni instala Supabase local.

## Fase previa obligatoria

Antes de levantar contenedores:

1. Confirmar CPU, RAM, disco, swap y Docker del VPS.
2. Ver contenedores y puertos existentes.
3. Confirmar si ya existe Nginx, Caddy o Traefik.
4. Elegir subdominio/webhook.
5. Definir versión fija de Evolution API.
6. Aplicar primero `supabase/chatbot_core.sql`.
7. Cargar `.env` desde `.env.example`.

## Orden recomendado

1. Crear directorio aislado, por ejemplo `/opt/whatsapp-bot`.
2. Copiar carpeta `whatsapp-bot`.
3. Completar `.env`.
4. Levantar `evolution-postgres` y `evolution-redis`.
5. Levantar solo Evolution API.
6. Vincular WhatsApp de prueba por QR.
7. Probar envío manual desde Evolution.
8. Levantar `bot-worker`.
9. Configurar webhook de Evolution hacia `/webhooks/evolution`.
10. Mantener `bot_active=false`.
11. Cargar conocimiento mínimo.
12. Generar embeddings.
13. Ejecutar tests funcionales.
14. Recién después activar `bot_active=true`.

## Comandos orientativos

```bash
docker compose build bot-worker
docker compose up -d evolution-api
docker compose up -d bot-worker
docker compose logs -f bot-worker
```

Por defecto, los puertos quedan solo en localhost del VPS:

- Evolution API: `127.0.0.1:18080`
- Bot Worker: `127.0.0.1:13001`

El worker usa Node 22 porque las librerías actuales de Supabase JS requieren Node `>=22`.

## Regla de producción

No conectar el número definitivo hasta superar los tests con un número de prueba.

## Variables necesarias en Vercel para el panel WhatsApp

El frontend nunca debe exponer claves en el navegador. Estas variables son server-side:

```env
WHATSAPP_BOT_WORKER_URL=
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=fabrica-test
WHATSAPP_PROXY_TOKEN=
```

Mientras Evolution y el worker estén publicados solo en `127.0.0.1` dentro del VPS, Vercel no puede alcanzarlos. Para que el panel muestre estado/QR desde producción hay que crear un acceso HTTPS seguro, por ejemplo:

- subdominio protegido por Nginx hacia el worker/Evolution, o
- túnel/zero-trust privado, o
- endpoint intermedio autenticado en el VPS.

No publicar Evolution API abierto a internet sin protección.

## Proxy HTTPS recomendado con token perimetral

Si se usa el dominio existente `bilon.pagarqr.ar`, agregar rutas separadas sin tocar `/` ni `/ocpp/`.
Generar primero un token largo y guardarlo como `WHATSAPP_PROXY_TOKEN` tanto en Vercel como en el archivo de Nginx.

Ejemplo conceptual:

```nginx
location /whatsapp-worker/ {
    if ($http_x_internal_proxy_token != "TOKEN_LARGO") { return 403; }
    proxy_pass http://127.0.0.1:13001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /whatsapp-evolution/ {
    if ($http_x_internal_proxy_token != "TOKEN_LARGO") { return 403; }
    proxy_pass http://127.0.0.1:18080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Variables Vercel resultantes:

```env
WHATSAPP_BOT_WORKER_URL=https://bilon.pagarqr.ar/whatsapp-worker
EVOLUTION_API_URL=https://bilon.pagarqr.ar/whatsapp-evolution
```

Estado aplicado:

- Nginx tiene rutas protegidas por `X-Internal-Proxy-Token`.
- Sin header secreto, `/whatsapp-worker/health` devuelve `403`.
- Con header secreto, `/whatsapp-worker/health` devuelve `200`.
- Con header secreto, `/whatsapp-evolution/` devuelve `200`.
- Los backups de Nginx quedaron fuera de `sites-enabled`, en `/etc/nginx/backups-whatsapp`.
