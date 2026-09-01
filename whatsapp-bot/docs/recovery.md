# Recovery y backups

## Qué se guarda dónde

- Supabase Cloud: conversaciones, mensajes, conocimiento, configuración, handoffs y auditoría.
- Volumen Docker `evolution_instances`: sesión local de WhatsApp usada por Evolution API.
- `.env`: secretos del worker y Evolution. No se commitea.

## Backup mínimo

1. Backup de Supabase según el plan contratado.
2. Copia segura del `.env`.
3. Backup del volumen `evolution_instances`.

## Restauración

1. Restaurar Supabase o confirmar que sigue operativo.
2. Restaurar `.env`.
3. Restaurar volumen de Evolution.
4. Levantar contenedores.
5. Revisar `/ready`.
6. Confirmar estado de WhatsApp.

## Nota importante

Copiar el volumen ayuda, pero no garantiza que WhatsApp nunca pida vincular de nuevo. WhatsApp puede exigir reautenticación por cambios externos.
