-- Fábrica de Arcades — directorio de clientes y preparación para marketing consentido

create table if not exists public.customer_contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null unique check (email = lower(trim(email))),
  full_name text not null,
  phone text,
  company_name text,
  customer_type text not null default 'cliente'
    check (customer_type in ('cliente', 'distribuidor')),
  lifecycle_status text not null default 'customer'
    check (lifecycle_status in ('lead', 'customer', 'inactive')),
  tags text[] not null default '{}'::text[],
  notes text,
  email_marketing_consent boolean not null default false,
  email_consent_at timestamptz,
  whatsapp_marketing_consent boolean not null default false,
  whatsapp_consent_at timestamptz,
  consent_source text,
  first_order_at timestamptz,
  last_order_at timestamptz,
  order_count int not null default 0 check (order_count >= 0),
  total_spent numeric(14,2) not null default 0 check (total_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_contacts_user_id
  on public.customer_contacts(user_id) where user_id is not null;
create index if not exists idx_customer_contacts_status
  on public.customer_contacts(lifecycle_status);
create index if not exists idx_customer_contacts_type
  on public.customer_contacts(customer_type);
create index if not exists idx_customer_contacts_last_order
  on public.customer_contacts(last_order_at desc nulls last);
create index if not exists idx_customer_contacts_tags
  on public.customer_contacts using gin(tags);

alter table public.customer_contacts enable row level security;

drop policy if exists "Admins can read customer contacts" on public.customer_contacts;
create policy "Admins can read customer contacts"
  on public.customer_contacts for select
  to authenticated
  using ((select public.get_user_role()) = 'admin');

grant select on public.customer_contacts to authenticated;
revoke insert, update, delete on public.customer_contacts from anon, authenticated;

create or replace function public.sync_customer_contact_from_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(new.customer_email));
  v_profile public.user_profiles%rowtype;
  v_first timestamptz;
  v_last timestamptz;
  v_count int;
  v_spent numeric;
begin
  if v_email = '' then return new; end if;

  if new.user_id is not null then
    select * into v_profile from public.user_profiles where id = new.user_id;
  end if;

  select min(created_at), max(created_at), count(*)::int, coalesce(sum(total), 0)
    into v_first, v_last, v_count, v_spent
  from public.orders
  where lower(trim(customer_email)) = v_email and status <> 'cancelled';

  insert into public.customer_contacts (
    user_id, email, full_name, phone, company_name, customer_type,
    lifecycle_status, first_order_at, last_order_at, order_count, total_spent
  ) values (
    new.user_id, v_email, new.customer_name, new.customer_phone, v_profile.company_name,
    case when new.customer_role_snapshot = 'distribuidor' then 'distribuidor' else 'cliente' end,
    case when v_count > 0 then 'customer' else 'lead' end, v_first, v_last, v_count, v_spent
  )
  on conflict (email) do update set
    user_id = coalesce(excluded.user_id, public.customer_contacts.user_id),
    full_name = excluded.full_name,
    phone = coalesce(excluded.phone, public.customer_contacts.phone),
    company_name = coalesce(excluded.company_name, public.customer_contacts.company_name),
    customer_type = excluded.customer_type,
    lifecycle_status = case
      when public.customer_contacts.lifecycle_status = 'inactive' then 'inactive'
      when excluded.order_count > 0 then 'customer'
      else 'lead'
    end,
    first_order_at = excluded.first_order_at,
    last_order_at = excluded.last_order_at,
    order_count = excluded.order_count,
    total_spent = excluded.total_spent,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists sync_customer_contact_after_order on public.orders;
create trigger sync_customer_contact_after_order
after insert or update of total, status, customer_name, customer_email, customer_phone on public.orders
for each row execute function public.sync_customer_contact_from_order();

revoke all on function public.sync_customer_contact_from_order() from public, anon, authenticated;

create or replace function public.admin_update_customer_contact(
  p_contact_id uuid,
  p_lifecycle_status text,
  p_tags text[],
  p_notes text,
  p_email_consent boolean,
  p_whatsapp_consent boolean,
  p_consent_source text default 'admin'
) returns public.customer_contacts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_contact public.customer_contacts%rowtype;
begin
  select role into v_role from public.user_profiles where id = auth.uid();
  if v_role <> 'admin' then raise exception 'No autorizado'; end if;
  if p_lifecycle_status not in ('lead', 'customer', 'inactive') then
    raise exception 'Estado de cliente inválido';
  end if;

  update public.customer_contacts set
    lifecycle_status = p_lifecycle_status,
    tags = coalesce(p_tags, '{}'::text[]),
    notes = nullif(trim(p_notes), ''),
    email_marketing_consent = p_email_consent,
    email_consent_at = case
      when p_email_consent and not email_marketing_consent then now()
      when not p_email_consent then null
      else email_consent_at
    end,
    whatsapp_marketing_consent = p_whatsapp_consent,
    whatsapp_consent_at = case
      when p_whatsapp_consent and not whatsapp_marketing_consent then now()
      when not p_whatsapp_consent then null
      else whatsapp_consent_at
    end,
    consent_source = case
      when p_email_consent or p_whatsapp_consent then nullif(trim(p_consent_source), '')
      else consent_source
    end,
    updated_at = now()
  where id = p_contact_id
  returning * into v_contact;

  if v_contact.id is null then raise exception 'Cliente inexistente'; end if;
  return v_contact;
end;
$$;

revoke all on function public.admin_update_customer_contact(uuid, text, text[], text, boolean, boolean, text)
  from public, anon;
grant execute on function public.admin_update_customer_contact(uuid, text, text[], text, boolean, boolean, text)
  to authenticated;

-- Backfill: clientes registrados aunque todavía no hayan comprado.
insert into public.customer_contacts (
  user_id, email, full_name, phone, company_name, customer_type, lifecycle_status
)
select p.id, lower(trim(u.email)), coalesce(p.full_name, u.email), p.phone, p.company_name,
  case when p.role = 'distribuidor' then 'distribuidor' else 'cliente' end,
  'lead'
from public.user_profiles p
join auth.users u on u.id = p.id
where p.role in ('cliente', 'distribuidor') and u.email is not null
on conflict (email) do update set
  user_id = excluded.user_id,
  company_name = coalesce(excluded.company_name, public.customer_contacts.company_name),
  customer_type = excluded.customer_type,
  updated_at = now();

alter table public.customer_contacts
  drop constraint if exists customer_contacts_user_id_key;

-- Backfill: historial y datos de todas las compras existentes.
insert into public.customer_contacts (
  user_id, email, full_name, phone, company_name, customer_type, lifecycle_status,
  first_order_at, last_order_at, order_count, total_spent
)
select
  (array_agg(o.user_id order by o.created_at desc) filter (where o.user_id is not null))[1],
  lower(trim(o.customer_email)),
  (array_agg(o.customer_name order by o.created_at desc))[1],
  (array_agg(o.customer_phone order by o.created_at desc) filter (where o.customer_phone is not null))[1],
  (array_agg(p.company_name order by o.created_at desc) filter (where p.company_name is not null))[1],
  case when bool_or(o.customer_role_snapshot = 'distribuidor') then 'distribuidor' else 'cliente' end,
  'customer', min(o.created_at), max(o.created_at), count(*)::int, coalesce(sum(o.total), 0)
from public.orders o
left join public.user_profiles p on p.id = o.user_id
where o.status <> 'cancelled' and trim(o.customer_email) <> ''
group by lower(trim(o.customer_email))
on conflict (email) do update set
  user_id = coalesce(excluded.user_id, public.customer_contacts.user_id),
  full_name = excluded.full_name,
  phone = coalesce(excluded.phone, public.customer_contacts.phone),
  company_name = coalesce(excluded.company_name, public.customer_contacts.company_name),
  customer_type = excluded.customer_type,
  lifecycle_status = 'customer',
  first_order_at = excluded.first_order_at,
  last_order_at = excluded.last_order_at,
  order_count = excluded.order_count,
  total_spent = excluded.total_spent,
  updated_at = now();
