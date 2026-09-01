-- Integración comercial del chatbot WhatsApp.
-- Agrega identidad de cliente, estado comercial, asignación y notas sin depender de email.

do $$
begin
  create type public.chatbot_customer_status as enum ('lead', 'customer', 'inactive', 'do_not_contact');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.chatbot_sales_status as enum (
    'NEW',
    'BOT_ACTIVE',
    'WAITING_CUSTOMER',
    'HUMAN_REQUIRED',
    'HUMAN_ACTIVE',
    'PURCHASE_INTENT',
    'PURCHASE_LINK_SENT',
    'PURCHASED',
    'CLOSED',
    'POST_SALE'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.chatbot_customers (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.customer_contacts(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  phone text not null unique,
  display_name text,
  first_name text,
  email text check (email is null or email = lower(trim(email))),
  google_id text,
  channel_original text not null default 'whatsapp',
  status public.chatbot_customer_status not null default 'lead',
  product_interest_id uuid references public.products(id) on delete set null,
  tags text[] not null default '{}'::text[],
  notes text,
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chatbot_conversations
  add column if not exists customer_id uuid references public.chatbot_customers(id) on delete set null,
  add column if not exists channel text not null default 'whatsapp',
  add column if not exists sales_status public.chatbot_sales_status not null default 'BOT_ACTIVE',
  add column if not exists product_interest_id uuid references public.products(id) on delete set null,
  add column if not exists assigned_to uuid references public.user_profiles(id) on delete set null,
  add column if not exists pending_count integer not null default 0 check (pending_count >= 0),
  add column if not exists last_customer_message_at timestamptz,
  add column if not exists last_bot_message_at timestamptz,
  add column if not exists last_human_message_at timestamptz,
  add column if not exists closed_at timestamptz;

alter table public.chatbot_messages
  add column if not exists customer_id uuid references public.chatbot_customers(id) on delete set null,
  add column if not exists message_type text not null default 'text',
  add column if not exists media_url text,
  add column if not exists ai_generated boolean not null default false,
  add column if not exists human_generated boolean not null default false;

create index if not exists chatbot_customers_phone_idx
  on public.chatbot_customers (phone);

create index if not exists chatbot_customers_last_contact_idx
  on public.chatbot_customers (last_contact_at desc nulls last);

create index if not exists chatbot_conversations_customer_last_idx
  on public.chatbot_conversations (customer_id, last_message_at desc nulls last);

create index if not exists chatbot_conversations_sales_status_idx
  on public.chatbot_conversations (sales_status, last_message_at desc nulls last);

create index if not exists chatbot_messages_customer_created_idx
  on public.chatbot_messages (customer_id, created_at desc)
  where customer_id is not null;

create or replace function public.chatbot_extract_first_name(p_display_name text)
returns text
language plpgsql
immutable
as $$
declare
  v_name text := trim(coalesce(p_display_name, ''));
  v_first text;
begin
  if v_name = '' then
    return null;
  end if;

  if v_name ~ '[^[:alpha:] áéíóúÁÉÍÓÚñÑüÜ''-]' then
    return null;
  end if;

  v_first := split_part(v_name, ' ', 1);
  if length(v_first) < 2 or length(v_first) > 24 then
    return null;
  end if;

  return initcap(v_first);
end;
$$;

create or replace function public.chatbot_touch_customer_from_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
begin
  insert into public.chatbot_customers (phone, display_name, first_name, last_contact_at)
  values (
    new.phone,
    nullif(trim(coalesce(new.display_name, '')), ''),
    public.chatbot_extract_first_name(new.display_name),
    coalesce(new.last_message_at, now())
  )
  on conflict (phone) do update set
    display_name = coalesce(nullif(trim(excluded.display_name), ''), public.chatbot_customers.display_name),
    first_name = coalesce(public.chatbot_extract_first_name(excluded.display_name), public.chatbot_customers.first_name),
    last_contact_at = greatest(coalesce(public.chatbot_customers.last_contact_at, '-infinity'::timestamptz), coalesce(excluded.last_contact_at, now())),
    updated_at = now()
  returning id into v_customer_id;

  new.customer_id := coalesce(new.customer_id, v_customer_id);
  return new;
end;
$$;

drop trigger if exists chatbot_conversation_customer_before_insert on public.chatbot_conversations;
create trigger chatbot_conversation_customer_before_insert
before insert on public.chatbot_conversations
for each row execute function public.chatbot_touch_customer_from_conversation();

create or replace function public.chatbot_sync_message_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.chatbot_conversations%rowtype;
begin
  select * into v_conversation
  from public.chatbot_conversations
  where id = new.conversation_id;

  new.customer_id := coalesce(new.customer_id, v_conversation.customer_id);
  new.ai_generated := new.sender_type = 'bot';
  new.human_generated := new.sender_type = 'human';

  update public.chatbot_conversations set
    last_message_at = greatest(coalesce(last_message_at, '-infinity'::timestamptz), new.created_at),
    last_customer_message_at = case when new.direction = 'inbound' then new.created_at else last_customer_message_at end,
    last_bot_message_at = case when new.sender_type = 'bot' then new.created_at else last_bot_message_at end,
    last_human_message_at = case when new.sender_type = 'human' then new.created_at else last_human_message_at end,
    pending_count = case
      when new.direction = 'inbound' and mode <> 'BOT' then pending_count + 1
      when new.direction = 'outbound' then 0
      else pending_count
    end,
    sales_status = case
      when sales_status in ('PURCHASED', 'CLOSED', 'POST_SALE') then sales_status
      when mode = 'HUMAN' then 'HUMAN_ACTIVE'::public.chatbot_sales_status
      when mode = 'PAUSED' then 'HUMAN_REQUIRED'::public.chatbot_sales_status
      else 'BOT_ACTIVE'::public.chatbot_sales_status
    end,
    updated_at = now()
  where id = new.conversation_id;

  if new.customer_id is not null then
    update public.chatbot_customers set
      last_contact_at = greatest(coalesce(last_contact_at, '-infinity'::timestamptz), new.created_at),
      updated_at = now()
    where id = new.customer_id;
  end if;

  return new;
end;
$$;

drop trigger if exists chatbot_message_customer_before_insert on public.chatbot_messages;
create trigger chatbot_message_customer_before_insert
before insert on public.chatbot_messages
for each row execute function public.chatbot_sync_message_customer();

alter table public.chatbot_customers enable row level security;

drop policy if exists "Admins manage chatbot customers" on public.chatbot_customers;
create policy "Admins manage chatbot customers"
  on public.chatbot_customers for all
  to authenticated
  using ((select public.get_user_role()) = 'admin')
  with check ((select public.get_user_role()) = 'admin');

grant select, insert, update, delete on public.chatbot_customers to authenticated;

revoke all on function public.chatbot_touch_customer_from_conversation() from public, anon, authenticated;
revoke all on function public.chatbot_sync_message_customer() from public, anon, authenticated;
grant execute on function public.chatbot_extract_first_name(text) to authenticated, service_role;

update public.chatbot_conversations
set display_name = nullif(trim(display_name), '')
where display_name is not null;

insert into public.chatbot_customers (phone, display_name, first_name, last_contact_at)
select phone, display_name, public.chatbot_extract_first_name(display_name), last_message_at
from public.chatbot_conversations
on conflict (phone) do update set
  display_name = coalesce(excluded.display_name, public.chatbot_customers.display_name),
  first_name = coalesce(excluded.first_name, public.chatbot_customers.first_name),
  last_contact_at = greatest(coalesce(public.chatbot_customers.last_contact_at, '-infinity'::timestamptz), coalesce(excluded.last_contact_at, now())),
  updated_at = now();

update public.chatbot_conversations c
set customer_id = cu.id
from public.chatbot_customers cu
where c.customer_id is null and cu.phone = c.phone;

update public.chatbot_messages m
set customer_id = c.customer_id,
    ai_generated = m.sender_type = 'bot',
    human_generated = m.sender_type = 'human'
from public.chatbot_conversations c
where m.conversation_id = c.id;
