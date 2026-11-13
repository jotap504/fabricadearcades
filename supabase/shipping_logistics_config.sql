-- Fábrica de Arcades — configuración base para logística híbrida.
-- Aplica sobre una base existente. No guarda credenciales de proveedores.

insert into public.delivery_config (key, value, label) values
  ('local_shipping_area_label', 'CABA y Gran Buenos Aires', 'Zona local para moto/flete'),
  ('local_shipping_max_distance_km', '50', 'Radio local máximo desde fábrica (km)'),
  ('local_shipping_preferred_provider', 'pedidosya_moto', 'Proveedor local preferido'),
  ('local_shipping_fallback_provider', 'moova', 'Proveedor local alternativo'),
  ('interior_shipping_area_label', 'Interior del país', 'Zona interior para transporte/correo'),
  ('interior_shipping_preferred_provider', 'correo_transporte', 'Proveedor interior preferido'),
  ('interior_shipping_payment_default', 'destination', 'Forma de pago por defecto para interior')
on conflict (key) do update
set label = excluded.label,
    updated_at = now();

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method = any (array[
    'cash'::text,
    'transfer'::text,
    'card'::text,
    'pending'::text,
    'current_account'::text,
    'mercadopago'::text
  ]));
