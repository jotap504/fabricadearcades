# Fábrica de Arcades

Tienda y sistema operativo para vender equipos arcade, administrar insumos, fabricar stock terminado y seguir pedidos a medida.

## Modalidades de venta

- **Stock listo:** el cliente compra una configuración terminada e inmutable. Sus insumos ya fueron consumidos durante el armado interno; al comprar sólo se reserva la unidad terminada.
- **A medida:** el cliente selecciona componentes disponibles. Al crear el pedido se reservan los insumos elegidos.
- **Pedido mixto:** puede contener ambas modalidades. Cada renglón conserva su forma de cumplimiento.
- **Cliente final:** la reserva vence a las 48 horas si no se confirma. Transferencia y efectivo requieren gestión manual.
- **Distribuidor con cuenta corriente habilitada:** no tiene vencimiento, se confirma automáticamente y los artículos a medida pasan directo a producción.

## Flujo interno

1. El administrador carga productos, variantes, insumos y BOM.
2. “Armar consola en stock” descuenta todos los insumos y crea el equipo terminado en una única transacción.
3. Un equipo listo conserva su configuración en el registro de stock y no puede editarse después del armado.
4. El checkout recalcula precios y disponibilidad en la base de datos. El navegador no decide precios, roles ni descuentos.
5. Al confirmar un pedido a medida se crean las tareas de producción.
6. La cola sincroniza automáticamente el pedido entre producción, listo y despachado.
7. Una cancelación previa a producción libera inventario. Si ya comenzó, administración elige convertir el equipo en stock listo o desarmarlo y devolver los insumos.

## Configuración

Copiar `.env.local.example` a `.env.local` y completar las variables. No exponer `SUPABASE_SERVICE_ROLE_KEY` ni `CRON_SECRET` al navegador.

Para una base existente, aplicar [`supabase/order_flow_upgrade.sql`](supabase/order_flow_upgrade.sql) desde el editor SQL de Supabase. Para una instalación nueva, aplicar primero [`supabase/schema.sql`](supabase/schema.sql) y después la actualización del flujo.

La ruta `/api/cron/expire-reservations` libera reservas vencidas. `vercel.json` la ejecuta cada hora y Vercel utiliza `CRON_SECRET` para autenticarla.

## Desarrollo

```bash
npm install
npm run dev
```

Verificación:

```bash
npm run build
npm run lint
```

## Pruebas del flujo de pedidos

[`supabase/tests/order_flow.test.sql`](supabase/tests/order_flow.test.sql) prueba las dos modalidades de compra, reservas por 48 horas, confirmación manual, carrito mixto, cuenta corriente, las dos resoluciones de cancelación y la protección de precios.

La suite se ejecuta dentro de una transacción y termina con `ROLLBACK`: usa el inventario real para validar las cantidades, pero no deja pedidos ni movimientos de prueba guardados. Puede ejecutarse desde el editor SQL de Supabase o mediante el MCP del proyecto.

El proyecto usa Next.js 16, React 19, TypeScript, Supabase, Zustand y Resend.
