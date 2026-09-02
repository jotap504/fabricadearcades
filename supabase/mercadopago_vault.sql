-- MercadoPago: guardar credenciales cifradas en Supabase Vault (libsodium),
-- para poder cargarlas desde el panel admin en vez de variables de entorno.
-- Requiere las extensiones vault y pgcrypto (ya instaladas en este proyecto).

-- Guarda/actualiza las credenciales. Solo admins (chequeo interno).
create or replace function public.mercadopago_set_credentials(
  p_access_token text,
  p_webhook_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing_id uuid;
begin
  if (select public.get_user_role()) <> 'admin' then
    raise exception 'No autorizado';
  end if;

  if p_access_token is not null and length(trim(p_access_token)) > 0 then
    select id into v_existing_id from vault.secrets where name = 'mercadopago_access_token';
    if v_existing_id is not null then
      perform vault.update_secret(v_existing_id, trim(p_access_token));
    else
      perform vault.create_secret(trim(p_access_token), 'mercadopago_access_token');
    end if;
  end if;

  if p_webhook_secret is not null and length(trim(p_webhook_secret)) > 0 then
    select id into v_existing_id from vault.secrets where name = 'mercadopago_webhook_secret';
    if v_existing_id is not null then
      perform vault.update_secret(v_existing_id, trim(p_webhook_secret));
    else
      perform vault.create_secret(trim(p_webhook_secret), 'mercadopago_webhook_secret');
    end if;
  end if;
end;
$$;

revoke all on function public.mercadopago_set_credentials(text, text) from public, anon;
grant execute on function public.mercadopago_set_credentials(text, text) to authenticated;

-- Lectura de credenciales DESCIFRADAS: solo el propio backend (service_role),
-- nunca desde el navegador ni con la sesión de un usuario común.
create or replace function public.mercadopago_get_access_token()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'mercadopago_access_token' limit 1;
$$;

create or replace function public.mercadopago_get_webhook_secret()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'mercadopago_webhook_secret' limit 1;
$$;

revoke all on function public.mercadopago_get_access_token() from public, anon, authenticated;
revoke all on function public.mercadopago_get_webhook_secret() from public, anon, authenticated;
grant execute on function public.mercadopago_get_access_token() to service_role;
grant execute on function public.mercadopago_get_webhook_secret() to service_role;

-- Estado para el panel admin (¿hay credenciales cargadas?) sin exponer el valor.
create or replace function public.mercadopago_credentials_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select public.get_user_role()) <> 'admin' then
    raise exception 'No autorizado';
  end if;
  return jsonb_build_object(
    'access_token_set', exists(select 1 from vault.secrets where name = 'mercadopago_access_token'),
    'webhook_secret_set', exists(select 1 from vault.secrets where name = 'mercadopago_webhook_secret'),
    'updated_at', (select updated_at from vault.secrets where name = 'mercadopago_access_token')
  );
end;
$$;

revoke all on function public.mercadopago_credentials_status() from public, anon;
grant execute on function public.mercadopago_credentials_status() to authenticated;
