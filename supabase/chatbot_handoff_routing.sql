begin;

create table if not exists public.chatbot_handoff_routes (
  id uuid primary key default gen_random_uuid(),
  route_key text not null unique,
  label text not null,
  responsible_phone text not null,
  keywords text[] not null default '{}'::text[],
  priority integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chatbot_handoff_requests (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chatbot_conversations(id) on delete cascade,
  customer_phone text not null,
  responsible_phone text not null,
  route_key text not null,
  question text not null,
  status text not null default 'pending',
  forwarded_message_id text,
  response_message_id uuid references public.chatbot_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint chatbot_handoff_requests_status_check
    check (status in ('pending', 'answered', 'closed', 'cancelled'))
);

create index if not exists chatbot_handoff_requests_responsible_pending_idx
  on public.chatbot_handoff_requests (responsible_phone, created_at desc)
  where status = 'pending';

create index if not exists chatbot_handoff_requests_conversation_idx
  on public.chatbot_handoff_requests (conversation_id, created_at desc);

insert into public.chatbot_handoff_routes (route_key, label, responsible_phone, keywords, priority)
values
  (
    'mercadolibre',
    'MercadoLibre',
    '5491153078610',
    array['mercadolibre', 'mercado libre', 'meli', 'publicacion', 'publicación', 'envio full', 'envío full', 'pausada', 'oferta ml'],
    100
  ),
  (
    'arcades',
    'Arcades, juegos y consolas',
    '5491164045074',
    array['arcade', 'arcades', 'juego', 'juegos', 'consola', 'consolas', 'fightstick', 'retrocade', 'bartop', 'fichin', 'maquina', 'máquina', 'palanca', 'boton', 'botón', 'vinilo'],
    50
  )
on conflict (route_key) do update set
  label = excluded.label,
  responsible_phone = excluded.responsible_phone,
  keywords = excluded.keywords,
  priority = excluded.priority,
  active = true,
  updated_at = now();

alter table public.chatbot_handoff_routes enable row level security;
alter table public.chatbot_handoff_requests enable row level security;

drop policy if exists "Admins manage chatbot handoff routes" on public.chatbot_handoff_routes;
create policy "Admins manage chatbot handoff routes"
  on public.chatbot_handoff_routes for all
  to authenticated
  using (exists (
    select 1 from public.user_profiles
    where id = (select auth.uid()) and role = 'admin'
  ))
  with check (exists (
    select 1 from public.user_profiles
    where id = (select auth.uid()) and role = 'admin'
  ));

drop policy if exists "Admins manage chatbot handoff requests" on public.chatbot_handoff_requests;
create policy "Admins manage chatbot handoff requests"
  on public.chatbot_handoff_requests for all
  to authenticated
  using (exists (
    select 1 from public.user_profiles
    where id = (select auth.uid()) and role = 'admin'
  ))
  with check (exists (
    select 1 from public.user_profiles
    where id = (select auth.uid()) and role = 'admin'
  ));

grant select, insert, update, delete on public.chatbot_handoff_routes to authenticated;
grant select, insert, update, delete on public.chatbot_handoff_requests to authenticated;

commit;
