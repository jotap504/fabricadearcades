-- MercadoLibre — Fase 1: cuenta conectada, tokens OAuth y auditoría de conexión/sincronización.
-- Aplicar después del esquema principal. Reutiliza public.get_user_role() y
-- public.chatbot_touch_updated_at(), ya definidos en chatbot_core.sql.

create table if not exists public.mercadolibre_accounts (
  id uuid primary key default gen_random_uuid(),
  ml_user_id bigint not null,
  nickname text,
  email text,
  site_id text not null default 'MLA',
  status text not null default 'disconnected'
    check (status in ('connected', 'disconnected', 'error', 'revoked')),
  scopes text,
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ml_user_id)
);

-- Solo una cuenta "connected" a la vez; las desconectadas quedan como historial.
create unique index if not exists mercadolibre_accounts_one_connected_idx
  on public.mercadolibre_accounts (status)
  where status = 'connected';

create table if not exists public.mercadolibre_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.mercadolibre_accounts(id) on delete cascade,
  access_token text,
  refresh_token text,
  token_type text not null default 'bearer',
  scope text,
  expires_at timestamptz,
  obtained_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id)
);

create table if not exists public.mercadolibre_sync_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.mercadolibre_accounts(id) on delete set null,
  event_type text not null,
  status text not null default 'ok' check (status in ('ok', 'error')),
  message text,
  metadata jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists mercadolibre_sync_logs_account_created_idx
  on public.mercadolibre_sync_logs (account_id, created_at desc);

drop trigger if exists mercadolibre_accounts_touch on public.mercadolibre_accounts;
create trigger mercadolibre_accounts_touch
before update on public.mercadolibre_accounts
for each row execute function public.chatbot_touch_updated_at();

drop trigger if exists mercadolibre_tokens_touch on public.mercadolibre_tokens;
create trigger mercadolibre_tokens_touch
before update on public.mercadolibre_tokens
for each row execute function public.chatbot_touch_updated_at();

alter table public.mercadolibre_accounts enable row level security;
alter table public.mercadolibre_tokens enable row level security;
alter table public.mercadolibre_sync_logs enable row level security;

drop policy if exists "Admins read mercadolibre accounts" on public.mercadolibre_accounts;
create policy "Admins read mercadolibre accounts"
  on public.mercadolibre_accounts for select
  to authenticated
  using ((select public.get_user_role()) = 'admin');

grant select on public.mercadolibre_accounts to authenticated;
-- Sin policies de insert/update/delete para `authenticated`: todo el ciclo
-- connect/disconnect pasa por Server Actions/Route Handlers con createAdminClient()
-- (service role, bypassa RLS).

-- mercadolibre_tokens: sin grants ni policies para `authenticated` — deny-by-default.
-- Solo accesible vía service_role (createAdminClient()). Nunca desde el navegador
-- ni desde el cliente de sesión.

drop policy if exists "Admins read mercadolibre sync logs" on public.mercadolibre_sync_logs;
create policy "Admins read mercadolibre sync logs"
  on public.mercadolibre_sync_logs for select
  to authenticated
  using ((select public.get_user_role()) = 'admin');

grant select on public.mercadolibre_sync_logs to authenticated;
-- Inserts de sync_logs solo vía service_role.
