-- Chatbot WhatsApp con IA controlada
-- Aplicar después del esquema principal y antes de conectar WhatsApp real.

create extension if not exists vector with schema extensions;

do $$
begin
  create type public.chatbot_conversation_mode as enum ('BOT', 'HUMAN', 'PAUSED');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.chatbot_message_direction as enum ('inbound', 'outbound');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.chatbot_sender_type as enum ('customer', 'bot', 'human', 'system');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.chatbot_unanswered_status as enum ('open', 'learned', 'dismissed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.chatbot_conversations (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  display_name text,
  mode public.chatbot_conversation_mode not null default 'BOT',
  summary text,
  handoff_reason text,
  last_message_at timestamptz,
  bot_resumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chatbot_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chatbot_conversations(id) on delete cascade,
  external_message_id text,
  direction public.chatbot_message_direction not null,
  sender_type public.chatbot_sender_type not null,
  content text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  handled_by text,
  model text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric(12, 6),
  confidence numeric(4, 3),
  created_at timestamptz not null default now(),
  constraint chatbot_messages_external_id_unique unique (external_message_id)
);

create table if not exists public.chatbot_knowledge_items (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'general',
  title text not null,
  content text not null,
  active boolean not null default true,
  priority integer not null default 0,
  embedding vector(1536),
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chatbot_answer_sources (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chatbot_messages(id) on delete cascade,
  knowledge_item_id uuid not null references public.chatbot_knowledge_items(id) on delete cascade,
  similarity numeric(6, 5) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chatbot_unanswered_questions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chatbot_conversations(id) on delete cascade,
  message_id uuid references public.chatbot_messages(id) on delete set null,
  question text not null,
  reason text,
  human_answer text,
  status public.chatbot_unanswered_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.chatbot_bot_settings (
  key text primary key,
  value jsonb not null,
  label text,
  updated_at timestamptz not null default now()
);

create table if not exists public.chatbot_audit_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  conversation_id uuid references public.chatbot_conversations(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.chatbot_outbox (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chatbot_conversations(id) on delete cascade,
  external_message_id text unique,
  content text not null,
  status text not null default 'pending',
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.chatbot_bot_settings (key, value, label)
values
  ('bot_active', 'false'::jsonb, 'Bot activo'),
  ('company_name', '"Fábrica de Arcades"'::jsonb, 'Nombre de la empresa'),
  ('assistant_name', '"Asistente de Fábrica de Arcades"'::jsonb, 'Nombre del asistente'),
  ('welcome_message', '"Hola, soy el asistente de Fábrica de Arcades. ¿En qué puedo ayudarte?"'::jsonb, 'Mensaje de bienvenida'),
  ('handoff_message', '"Te derivo con una persona para que pueda ayudarte."'::jsonb, 'Mensaje de derivación'),
  ('confidence_threshold', '0.75'::jsonb, 'Confianza mínima'),
  ('rag_threshold', '0.78'::jsonb, 'Relevancia mínima RAG'),
  ('top_k', '5'::jsonb, 'Cantidad de fuentes'),
  ('llm_provider', '"openrouter"'::jsonb, 'Proveedor LLM'),
  ('llm_model', '"deepseek/deepseek-v4-pro"'::jsonb, 'Modelo OpenRouter'),
  ('llm_fallback_model', '"deepseek/deepseek-v4-pro"'::jsonb, 'Modelo OpenRouter alternativo'),
  ('temperature', '0.1'::jsonb, 'Temperatura'),
  ('debounce_ms', '2500'::jsonb, 'Espera para agrupar mensajes')
on conflict (key) do nothing;

create index if not exists chatbot_conversations_mode_last_idx
  on public.chatbot_conversations (mode, last_message_at desc);

create index if not exists chatbot_messages_conversation_created_idx
  on public.chatbot_messages (conversation_id, created_at desc);

create index if not exists chatbot_messages_external_message_idx
  on public.chatbot_messages (external_message_id)
  where external_message_id is not null;

create index if not exists chatbot_knowledge_active_priority_idx
  on public.chatbot_knowledge_items (active, priority desc, updated_at desc);

create index if not exists chatbot_unanswered_open_idx
  on public.chatbot_unanswered_questions (created_at desc)
  where status = 'open';

create index if not exists chatbot_audit_conversation_created_idx
  on public.chatbot_audit_log (conversation_id, created_at desc);

create index if not exists chatbot_knowledge_embedding_idx
  on public.chatbot_knowledge_items
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100)
  where active = true and embedding is not null;

create or replace function public.chatbot_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chatbot_conversations_touch on public.chatbot_conversations;
create trigger chatbot_conversations_touch
before update on public.chatbot_conversations
for each row execute function public.chatbot_touch_updated_at();

drop trigger if exists chatbot_knowledge_touch on public.chatbot_knowledge_items;
create trigger chatbot_knowledge_touch
before update on public.chatbot_knowledge_items
for each row execute function public.chatbot_touch_updated_at();

drop trigger if exists chatbot_outbox_touch on public.chatbot_outbox;
create trigger chatbot_outbox_touch
before update on public.chatbot_outbox
for each row execute function public.chatbot_touch_updated_at();

create or replace function public.chatbot_match_knowledge(
  query_embedding vector(1536),
  match_count integer default 5,
  min_similarity numeric default 0.78
)
returns table (
  id uuid,
  category text,
  title text,
  content text,
  priority integer,
  similarity numeric
)
language sql
stable
as $$
  select
    k.id,
    k.category,
    k.title,
    k.content,
    k.priority,
    (1 - (k.embedding <=> query_embedding))::numeric as similarity
  from public.chatbot_knowledge_items k
  where k.active = true
    and k.embedding is not null
    and (1 - (k.embedding <=> query_embedding)) >= min_similarity
  order by k.priority desc, k.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.chatbot_conversations enable row level security;
alter table public.chatbot_messages enable row level security;
alter table public.chatbot_knowledge_items enable row level security;
alter table public.chatbot_answer_sources enable row level security;
alter table public.chatbot_unanswered_questions enable row level security;
alter table public.chatbot_bot_settings enable row level security;
alter table public.chatbot_audit_log enable row level security;
alter table public.chatbot_outbox enable row level security;

drop policy if exists "Admins manage chatbot conversations" on public.chatbot_conversations;
create policy "Admins manage chatbot conversations"
  on public.chatbot_conversations for all
  to authenticated
  using ((select public.get_user_role()) = 'admin')
  with check ((select public.get_user_role()) = 'admin');

drop policy if exists "Admins manage chatbot messages" on public.chatbot_messages;
create policy "Admins manage chatbot messages"
  on public.chatbot_messages for all
  to authenticated
  using ((select public.get_user_role()) = 'admin')
  with check ((select public.get_user_role()) = 'admin');

drop policy if exists "Admins manage chatbot knowledge" on public.chatbot_knowledge_items;
create policy "Admins manage chatbot knowledge"
  on public.chatbot_knowledge_items for all
  to authenticated
  using ((select public.get_user_role()) = 'admin')
  with check ((select public.get_user_role()) = 'admin');

drop policy if exists "Admins manage chatbot sources" on public.chatbot_answer_sources;
create policy "Admins manage chatbot sources"
  on public.chatbot_answer_sources for all
  to authenticated
  using ((select public.get_user_role()) = 'admin')
  with check ((select public.get_user_role()) = 'admin');

drop policy if exists "Admins manage unanswered chatbot questions" on public.chatbot_unanswered_questions;
create policy "Admins manage unanswered chatbot questions"
  on public.chatbot_unanswered_questions for all
  to authenticated
  using ((select public.get_user_role()) = 'admin')
  with check ((select public.get_user_role()) = 'admin');

drop policy if exists "Admins manage chatbot settings" on public.chatbot_bot_settings;
create policy "Admins manage chatbot settings"
  on public.chatbot_bot_settings for all
  to authenticated
  using ((select public.get_user_role()) = 'admin')
  with check ((select public.get_user_role()) = 'admin');

drop policy if exists "Admins read chatbot audit log" on public.chatbot_audit_log;
create policy "Admins read chatbot audit log"
  on public.chatbot_audit_log for select
  to authenticated
  using ((select public.get_user_role()) = 'admin');

drop policy if exists "Admins manage chatbot outbox" on public.chatbot_outbox;
create policy "Admins manage chatbot outbox"
  on public.chatbot_outbox for all
  to authenticated
  using ((select public.get_user_role()) = 'admin')
  with check ((select public.get_user_role()) = 'admin');

grant select, insert, update, delete on
  public.chatbot_conversations,
  public.chatbot_messages,
  public.chatbot_knowledge_items,
  public.chatbot_answer_sources,
  public.chatbot_unanswered_questions,
  public.chatbot_bot_settings,
  public.chatbot_outbox
to authenticated;

grant select on public.chatbot_audit_log to authenticated;

grant execute on function public.chatbot_match_knowledge(vector, integer, numeric) to service_role;
