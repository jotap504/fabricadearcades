-- Fábrica de Arcades — pedido, reservas e inventario transaccional
-- Aplicar una sola vez sobre una base creada con supabase/schema.sql.

alter table public.user_profiles
  add column if not exists current_account_enabled boolean not null default false,
  add column if not exists distributor_requested boolean not null default false;

alter table public.stock_items
  add column if not exists configuration jsonb not null default '{}'::jsonb;

alter table public.orders
  add column if not exists reservation_status text not null default 'active',
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists cancellation_resolution text,
  add column if not exists payment_surcharge_amount numeric(12, 2) not null default 0;

alter table public.order_items
  add column if not exists fulfillment_type text not null default 'custom',
  add column if not exists stock_item_id uuid references public.stock_items(id) on delete restrict,
  add column if not exists reservation_status text not null default 'active';

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'orders_payment_method_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders drop constraint orders_payment_method_check;
  end if;
  alter table public.orders add constraint orders_payment_method_check
    check (payment_method in ('cash', 'transfer', 'card', 'pending', 'current_account'));

  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_reservation_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders add constraint orders_reservation_status_check
      check (reservation_status in ('active', 'committed', 'released', 'expired'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_cancellation_resolution_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders add constraint orders_cancellation_resolution_check
      check (cancellation_resolution is null or cancellation_resolution in ('pending', 'restock', 'disassemble'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'order_items_fulfillment_type_check'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items add constraint order_items_fulfillment_type_check
      check (fulfillment_type in ('ready_stock', 'custom'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'order_items_reservation_status_check'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items add constraint order_items_reservation_status_check
      check (reservation_status in ('active', 'committed', 'released', 'expired'));
  end if;
end $$;

create table if not exists public.inventory_reservations (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  resource_type text not null check (resource_type in ('stock_item', 'supply')),
  stock_item_id uuid references public.stock_items(id) on delete restrict,
  supply_id uuid references public.supply_inventory(id) on delete restrict,
  quantity int not null check (quantity > 0),
  status text not null default 'active' check (status in ('active', 'committed', 'released', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (
    (resource_type = 'stock_item' and stock_item_id is not null and supply_id is null)
    or (resource_type = 'supply' and supply_id is not null and stock_item_id is null)
  )
);

create index if not exists idx_inventory_reservations_order
  on public.inventory_reservations(order_id);
create index if not exists idx_inventory_reservations_order_item
  on public.inventory_reservations(order_item_id);
create index if not exists idx_inventory_reservations_stock_item
  on public.inventory_reservations(stock_item_id) where stock_item_id is not null;
create index if not exists idx_inventory_reservations_supply
  on public.inventory_reservations(supply_id) where supply_id is not null;
create index if not exists idx_inventory_reservations_expiry
  on public.inventory_reservations(expires_at)
  where status = 'active' and expires_at is not null;
create index if not exists idx_order_items_stock_item
  on public.order_items(stock_item_id)
  where stock_item_id is not null;

alter table public.inventory_reservations enable row level security;

create or replace function public.safe_jsonb(p_value text)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
begin
  return coalesce(p_value::jsonb, '{}'::jsonb);
exception when others then
  return '{}'::jsonb;
end;
$$;

drop policy if exists "Admins can read inventory reservations" on public.inventory_reservations;
create policy "Admins can read inventory reservations"
  on public.inventory_reservations for select
  to authenticated
  using ((select public.get_user_role()) = 'admin');

-- Adds a supply reservation and atomically removes it from available inventory.
create or replace function public.reserve_supply(
  p_order_id uuid,
  p_order_item_id uuid,
  p_supply_id uuid,
  p_quantity int,
  p_expires_at timestamptz,
  p_expected_type text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_available int;
begin
  if p_supply_id is null or p_quantity <= 0 then
    return;
  end if;

  select quantity into v_available
  from public.supply_inventory
  where id = p_supply_id and is_active = true
    and (p_expected_type is null or supply_type = p_expected_type)
  for update;

  if v_available is null then
    raise exception 'El insumo seleccionado no está disponible';
  end if;
  if v_available < p_quantity then
    raise exception 'Stock insuficiente para el insumo %', p_supply_id;
  end if;

  update public.supply_inventory
  set quantity = quantity - p_quantity, updated_at = now()
  where id = p_supply_id;

  insert into public.inventory_reservations (
    order_id, order_item_id, resource_type, supply_id, quantity, expires_at
  ) values (
    p_order_id, p_order_item_id, 'supply', p_supply_id, p_quantity, p_expires_at
  );
end;
$$;

-- Secure checkout entry point. Prices, identity and availability are resolved in DB.
create or replace function public.create_store_order(
  p_customer jsonb,
  p_shipping jsonb,
  p_payment_method text,
  p_notes text,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text := 'cliente';
  v_distributor_approved boolean := false;
  v_current_account boolean := false;
  v_order_id uuid;
  v_order_number text;
  v_order_status text := 'pending_confirmation';
  v_expires_at timestamptz := now() + interval '48 hours';
  v_discount_pct numeric := 0;
  v_surcharge_pct numeric := 0;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_surcharge numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_stock public.stock_items%rowtype;
  v_order_item_id uuid;
  v_quantity int;
  v_unit_price numeric;
  v_variant_modifier numeric;
  v_customization jsonb;
  v_product_meta jsonb;
  v_addons jsonb;
  v_fulfillment text;
  v_stock_item_id uuid;
  v_player jsonb;
  v_addon jsonb;
  v_bom jsonb;
  v_supply_id uuid;
  v_button_count int;
  v_required_joysticks int;
  v_required_buttons_per_player int;
  v_addon_product public.products%rowtype;
  v_addon_stock_id uuid;
  v_addon_stock_quantity int;
  v_led_surcharge numeric;
  v_has_custom boolean := false;
  v_auth_email text;
  v_profile_name text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no contiene productos';
  end if;
  if coalesce(trim(p_customer->>'name'), '') = '' or coalesce(trim(p_customer->>'email'), '') = '' then
    raise exception 'Nombre y email son obligatorios';
  end if;
  if p_payment_method not in ('cash', 'transfer', 'card', 'current_account') then
    raise exception 'Método de pago inválido';
  end if;

  if v_user_id is not null then
    select role, distributor_approved, current_account_enabled
      into v_role, v_distributor_approved, v_current_account
    from public.user_profiles
    where id = v_user_id;
    v_role := coalesce(v_role, 'cliente');
    select email into v_auth_email from auth.users where id = v_user_id;
    select full_name into v_profile_name from public.user_profiles where id = v_user_id;
    p_customer := jsonb_set(p_customer, '{email}', to_jsonb(v_auth_email), true);
    p_customer := jsonb_set(p_customer, '{name}', to_jsonb(coalesce(v_profile_name, v_auth_email)), true);
  end if;

  if p_payment_method = 'current_account' then
    if v_user_id is null or v_role <> 'distribuidor' or not v_distributor_approved or not v_current_account then
      raise exception 'La cuenta corriente no está habilitada para este usuario';
    end if;
    v_order_status := 'in_production';
    v_expires_at := null;
  elsif p_payment_method = 'transfer' then
    select coalesce(value::numeric, 0) into v_discount_pct
    from public.delivery_config where key = 'transfer_discount_pct';
  elsif p_payment_method = 'cash' then
    select coalesce(value::numeric, 0) into v_discount_pct
    from public.delivery_config where key = 'cash_discount_pct';
  elsif p_payment_method = 'card' then
    select coalesce(value::numeric, 0) into v_surcharge_pct
    from public.delivery_config where key = 'card_surcharge_pct';
  end if;

  insert into public.orders (
    user_id, customer_name, customer_email, customer_phone,
    customer_role_snapshot, status, payment_method, payment_status,
    shipping_address, notes, reservation_status, reservation_expires_at
  ) values (
    v_user_id,
    trim(p_customer->>'name'),
    lower(trim(p_customer->>'email')),
    nullif(trim(p_customer->>'phone'), ''),
    v_role,
    v_order_status,
    p_payment_method,
    'pending',
    p_shipping,
    nullif(trim(p_notes), ''),
    case when p_payment_method = 'current_account' then 'committed' else 'active' end,
    v_expires_at
  ) returning id, order_number into v_order_id, v_order_number;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := coalesce((v_item->>'quantity')::int, 0);
    if v_quantity < 1 or v_quantity > 20 then
      raise exception 'Cantidad inválida';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid and is_active = true;
    if not found then
      raise exception 'Producto inexistente o inactivo';
    end if;
    v_product_meta := public.safe_jsonb(v_product.meta_description);
    v_required_joysticks := coalesce((v_product_meta->>'joysticks_count')::int, 0);
    v_required_buttons_per_player := coalesce((v_product_meta->>'buttons_per_player')::int, 0);

    v_variant_modifier := 0;
    if nullif(v_item->>'variant_id', '') is not null then
      select * into v_variant
      from public.product_variants
      where id = (v_item->>'variant_id')::uuid
        and product_id = v_product.id
        and is_active = true;
      if not found then
        raise exception 'Variante inválida';
      end if;
      v_variant_modifier := v_variant.price_modifier;
    end if;

    v_customization := coalesce(v_item->'customization', '{}'::jsonb);
    v_addons := coalesce(v_customization->'addons', '[]'::jsonb);
    v_stock_item_id := nullif(v_item->>'stock_item_id', '')::uuid;
    if v_stock_item_id is null and not v_product.requires_production then
      select id into v_stock_item_id
      from public.stock_items
      where product_id = v_product.id and stock_type = 'immediate' and quantity >= v_quantity
      order by updated_at, id
      limit 1;
      if v_stock_item_id is null then
        raise exception 'No hay stock disponible para el producto %', v_product.name;
      end if;
    end if;
    v_fulfillment := case when v_stock_item_id is null then 'custom' else 'ready_stock' end;
    v_unit_price := v_product.base_price + v_variant_modifier;
    if v_role <> 'admin' and not (v_role = 'distribuidor' and v_distributor_approved) then
      v_unit_price := v_unit_price * (1 + v_product.retail_markup_pct / 100);
    end if;

    if v_fulfillment = 'ready_stock' then
      select * into v_stock
      from public.stock_items
      where id = v_stock_item_id
        and product_id = v_product.id
        and stock_type = 'immediate'
      for update;
      if not found or v_stock.quantity < v_quantity then
        raise exception 'El equipo listo seleccionado ya no tiene stock suficiente';
      end if;
      if v_stock.variant_id is distinct from nullif(v_item->>'variant_id', '')::uuid then
        raise exception 'La variante no corresponde al equipo listo seleccionado';
      end if;

      update public.stock_items
      set quantity = quantity - v_quantity, updated_at = now()
      where id = v_stock.id;

      -- The immutable factory snapshot wins over browser customization.
      if v_stock.configuration <> '{}'::jsonb then
        v_customization := v_stock.configuration || jsonb_build_object('addons', v_addons);
      end if;

      -- Ready stock keeps its factory configuration, including its component surcharge.
      v_led_surcharge := coalesce((v_product_meta->>'led_surcharge')::numeric, 0);
      if v_customization->>'joystick_type' = 'led' then
        v_unit_price := v_unit_price + v_led_surcharge * 0.5;
      end if;
      if v_customization->>'button_type' = 'led' then
        v_unit_price := v_unit_price + v_led_surcharge * 0.5;
      end if;
    else
      v_has_custom := true;
      v_led_surcharge := coalesce((v_product_meta->>'led_surcharge')::numeric, 0);
      if v_customization->>'joystick_type' = 'led' then
        v_unit_price := v_unit_price + v_led_surcharge * 0.5;
      end if;
      if v_customization->>'button_type' = 'led' then
        v_unit_price := v_unit_price + v_led_surcharge * 0.5;
      end if;
    end if;

    -- Add-ons are priced from products, never from browser values.
    for v_addon in select value from jsonb_array_elements(v_addons)
    loop
      select * into v_addon_product
      from public.products where id = (v_addon->>'id')::uuid and is_active = true;
      if not found then
        raise exception 'Producto adicional inválido';
      end if;
      if v_role = 'admin' or (v_role = 'distribuidor' and v_distributor_approved) then
        v_unit_price := v_unit_price + v_addon_product.base_price;
      else
        v_unit_price := v_unit_price + v_addon_product.base_price * (1 + v_addon_product.retail_markup_pct / 100);
      end if;
    end loop;

    insert into public.order_items (
      order_id, product_id, variant_id, quantity, unit_price, subtotal,
      stock_type_at_purchase, customization, fulfillment_type, stock_item_id,
      reservation_status
    ) values (
      v_order_id, v_product.id, nullif(v_item->>'variant_id', '')::uuid,
      v_quantity, round(v_unit_price, 2), round(v_unit_price * v_quantity, 2),
      case when v_fulfillment = 'ready_stock' then 'immediate' else 'designed' end,
      v_customization, v_fulfillment, v_stock_item_id,
      case when p_payment_method = 'current_account' then 'committed' else 'active' end
    ) returning id into v_order_item_id;

    -- Additional products are finished stock and are reserved with the parent item.
    for v_addon in select value from jsonb_array_elements(v_addons)
    loop
      v_addon_stock_id := null;
      select id, quantity into v_addon_stock_id, v_addon_stock_quantity
      from public.stock_items
      where product_id = (v_addon->>'id')::uuid
        and stock_type = 'immediate'
        and quantity >= v_quantity
      order by updated_at, id
      limit 1
      for update;
      if v_addon_stock_id is null then
        raise exception 'No hay stock suficiente del producto adicional';
      end if;
      update public.stock_items
      set quantity = quantity - v_quantity, updated_at = now()
      where id = v_addon_stock_id;
      insert into public.inventory_reservations(
        order_id, order_item_id, resource_type, stock_item_id, quantity, status, expires_at
      ) values (
        v_order_id, v_order_item_id, 'stock_item', v_addon_stock_id, v_quantity,
        case when p_payment_method = 'current_account' then 'committed' else 'active' end,
        v_expires_at
      );
    end loop;

    if v_fulfillment = 'ready_stock' then
      insert into public.inventory_reservations (
        order_id, order_item_id, resource_type, stock_item_id, quantity, status, expires_at
      ) values (
        v_order_id, v_order_item_id, 'stock_item', v_stock_item_id, v_quantity,
        case when p_payment_method = 'current_account' then 'committed' else 'active' end,
        v_expires_at
      );
    else
      -- Fixed BOM components.
      for v_bom in
        select value from jsonb_array_elements(coalesce(public.safe_jsonb(v_product.meta_description)->'bom', '[]'::jsonb))
      loop
        if nullif(v_bom->>'supply_id', '') is not null and coalesce(v_bom->>'supply_type', 'other') = 'other' then
          perform public.reserve_supply(
            v_order_id, v_order_item_id, (v_bom->>'supply_id')::uuid,
            coalesce((v_bom->>'quantity')::int, 1) * v_quantity, v_expires_at, 'other'
          );
        end if;
      end loop;

      -- Customer-selected vinyl and controls.
      if nullif(v_customization->>'vinyl_supply_id', '') is not null
        and coalesce(v_customization->>'vinyl_source', 'stock') = 'stock' then
        perform public.reserve_supply(v_order_id, v_order_item_id,
          (v_customization->>'vinyl_supply_id')::uuid, v_quantity, v_expires_at, 'vinyl');
      end if;
      if nullif(v_customization->>'led_supply_id', '') is not null then
        perform public.reserve_supply(v_order_id, v_order_item_id,
          (v_customization->>'led_supply_id')::uuid, v_quantity, v_expires_at, 'led');
      end if;

      if jsonb_array_length(coalesce(v_customization->'players', '[]'::jsonb)) > 0 then
        for v_player in select value from jsonb_array_elements(v_customization->'players')
        loop
          if v_required_joysticks > 0 and nullif(v_player->>'joystick_supply_id', '') is null then
            raise exception 'Seleccioná una palanca con stock para cada jugador';
          end if;
          if nullif(v_player->>'joystick_supply_id', '') is not null then
            perform public.reserve_supply(v_order_id, v_order_item_id,
              (v_player->>'joystick_supply_id')::uuid, v_quantity, v_expires_at, 'joystick');
          end if;
          v_supply_id := coalesce(
            nullif(v_player->>'button_supply_id', '')::uuid,
            nullif(v_player->'button_supply_ids'->>0, '')::uuid
          );
          v_button_count := greatest(coalesce((v_player->>'button_count')::int, 6), 1);
          if v_required_buttons_per_player > 0 and v_supply_id is null then
            raise exception 'Seleccioná botones con stock para cada jugador';
          end if;
          if v_supply_id is not null then
            perform public.reserve_supply(v_order_id, v_order_item_id,
              v_supply_id, v_button_count * v_quantity, v_expires_at, 'button');
          end if;
        end loop;
      else
        if v_required_joysticks > 0 and nullif(v_customization->>'joystick_supply_id', '') is null then
          raise exception 'Seleccioná una palanca con stock';
        end if;
        if nullif(v_customization->>'joystick_supply_id', '') is not null then
          perform public.reserve_supply(v_order_id, v_order_item_id,
            (v_customization->>'joystick_supply_id')::uuid, v_quantity, v_expires_at, 'joystick');
        end if;
        v_supply_id := coalesce(
          nullif(v_customization->>'button_supply_id', '')::uuid,
          nullif(v_customization->'button_supply_ids'->>0, '')::uuid
        );
        if v_required_buttons_per_player > 0 and v_supply_id is null then
          raise exception 'Seleccioná botones con stock';
        end if;
        if v_supply_id is not null then
          perform public.reserve_supply(v_order_id, v_order_item_id, v_supply_id,
            greatest(coalesce((v_customization->>'button_count')::int, 6), 1) * v_quantity,
            v_expires_at, 'button');
        end if;
      end if;
    end if;

    v_subtotal := v_subtotal + round(v_unit_price * v_quantity, 2);
  end loop;

  v_discount := round(v_subtotal * v_discount_pct / 100, 2);
  v_surcharge := round(v_subtotal * v_surcharge_pct / 100, 2);
  v_total := v_subtotal - v_discount + v_surcharge;
  update public.orders
  set subtotal = v_subtotal,
      discount_amount = v_discount,
      payment_surcharge_amount = v_surcharge,
      total = v_total,
      status = case
        when p_payment_method = 'current_account' and not v_has_custom then 'ready'
        else status
      end
  where id = v_order_id;
  if p_payment_method = 'current_account' and not v_has_custom then
    v_order_status := 'ready';
  end if;

  insert into public.production_queue (order_item_id, order_id, product_name, customization_summary)
  select oi.id, oi.order_id, p.name,
    concat_ws(', ',
      case
        when oi.customization->>'vinyl_source' = 'custom' then 'PEDIR DISEÑO/IMPRESIÓN PERSONALIZADA'
        else 'PEDIR IMPRESIÓN DE VINILO'
      end,
      nullif('Vinilo: ' || coalesce(oi.customization->>'vinyl_name', ''), 'Vinilo: '),
      oi.customization->>'cabinet_type',
      oi.customization->>'screen_size'
    )
  from public.order_items oi
  join public.products p on p.id = oi.product_id
  where oi.order_id = v_order_id
    and oi.fulfillment_type = 'custom'
    and p.requires_production = true
    and coalesce(oi.customization->>'vinyl_source', 'stock') in ('print', 'custom')
  on conflict do nothing;

  if p_payment_method = 'current_account' and v_has_custom then
    insert into public.production_queue (order_item_id, order_id, product_name, customization_summary)
    select oi.id, oi.order_id, p.name,
      concat_ws(', ',
        case
          when oi.customization->>'vinyl_source' = 'custom' then 'PEDIR DISEÑO/IMPRESIÓN PERSONALIZADA'
          when oi.customization->>'vinyl_source' = 'print' then 'PEDIR IMPRESIÓN DE VINILO'
          else null
        end,
        oi.customization->>'cabinet_type',
        oi.customization->>'screen_size',
        oi.customization->>'vinyl_name'
      )
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = v_order_id and oi.fulfillment_type = 'custom' and p.requires_production = true
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'orderNumber', v_order_number,
    'status', v_order_status,
    'reservationExpiresAt', v_expires_at,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'surcharge', v_surcharge,
    'total', v_total
  );
end;
$$;

-- Harden the legacy read helpers. The requested role is never trusted for pricing.
create or replace function public.get_product_price(
  p_product_id uuid,
  p_user_role text default 'cliente'
) returns numeric
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_base_price numeric;
  v_markup_pct numeric;
  v_role text := 'cliente';
  v_distributor_approved boolean := false;
begin
  if auth.uid() is not null then
    select role, distributor_approved
      into v_role, v_distributor_approved
    from public.user_profiles
    where id = auth.uid();
  end if;

  select base_price, retail_markup_pct
    into v_base_price, v_markup_pct
  from public.products
  where id = p_product_id and is_active = true;

  if v_base_price is null then
    return null;
  end if;

  if v_role = 'admin' or (v_role = 'distribuidor' and v_distributor_approved) then
    return v_base_price;
  end if;
  return v_base_price * (1 + v_markup_pct / 100);
end;
$$;

alter function public.get_user_role() set search_path = '';
alter function public.is_staff() set search_path = '';
alter function public.get_stock_summary(uuid) set search_path = '';
alter function public.get_stock_summary(uuid) security invoker;
alter function public.handle_updated_at() set search_path = '';

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_updated_at() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Cover foreign keys used by joins, cascades and the order/production workflow.
create index if not exists idx_notifications_related_order
  on public.notifications(related_order_id) where related_order_id is not null;
create index if not exists idx_notifications_related_production
  on public.notifications(related_production_id) where related_production_id is not null;
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);
create index if not exists idx_order_items_variant
  on public.order_items(variant_id) where variant_id is not null;
create index if not exists idx_product_bundles_product on public.product_bundles(product_id);
create index if not exists idx_product_bundles_component on public.product_bundles(component_product_id);
create index if not exists idx_product_variants_product on public.product_variants(product_id);
create index if not exists idx_production_queue_assigned
  on public.production_queue(assigned_to) where assigned_to is not null;
create index if not exists idx_production_queue_order on public.production_queue(order_id);
create index if not exists idx_stock_items_variant
  on public.stock_items(variant_id) where variant_id is not null;
create index if not exists idx_stock_items_vinyl
  on public.stock_items(vinyl_supply_id) where vinyl_supply_id is not null;

-- Release an unpaid reservation. Used by expiry and safe cancellation.
create or replace function public.release_order_reservations(
  p_order_id uuid,
  p_resolution text default 'released'
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res public.inventory_reservations%rowtype;
begin
  for v_res in
    select * from public.inventory_reservations
    where order_id = p_order_id and status in ('active', 'committed')
    order by id
    for update
  loop
    if v_res.resource_type = 'stock_item' then
      update public.stock_items set quantity = quantity + v_res.quantity, updated_at = now()
      where id = v_res.stock_item_id;
    else
      update public.supply_inventory set quantity = quantity + v_res.quantity, updated_at = now()
      where id = v_res.supply_id;
    end if;
    update public.inventory_reservations
    set status = case when p_resolution = 'expired' then 'expired' else 'released' end,
        resolved_at = now()
    where id = v_res.id;
  end loop;

  update public.order_items
  set reservation_status = case when p_resolution = 'expired' then 'expired' else 'released' end
  where order_id = p_order_id and reservation_status in ('active', 'committed');
  update public.orders
  set reservation_status = case when p_resolution = 'expired' then 'expired' else 'released' end,
      status = 'cancelled', updated_at = now()
  where id = p_order_id;
end;
$$;

create or replace function public.expire_order_reservations()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_count int := 0;
begin
  for v_order in
    select id from public.orders
    where reservation_status = 'active'
      and reservation_expires_at is not null
      and reservation_expires_at <= now()
    for update skip locked
  loop
    perform public.release_order_reservations(v_order.id, 'expired');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.confirm_store_order(p_order_id uuid, p_payment_paid boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select role into v_role from public.user_profiles where id = auth.uid();
  if v_role <> 'admin' then
    raise exception 'No autorizado';
  end if;

  update public.inventory_reservations
  set status = 'committed', expires_at = null, resolved_at = now()
  where order_id = p_order_id and status = 'active';
  update public.order_items set reservation_status = 'committed'
  where order_id = p_order_id and reservation_status = 'active';

  insert into public.production_queue (order_item_id, order_id, product_name, customization_summary)
  select oi.id, oi.order_id, p.name,
    concat_ws(', ',
      case
        when oi.customization->>'vinyl_source' = 'custom' then 'PEDIR DISEÑO/IMPRESIÓN PERSONALIZADA'
        when oi.customization->>'vinyl_source' = 'print' then 'PEDIR IMPRESIÓN DE VINILO'
        else null
      end,
      oi.customization->>'cabinet_type',
      oi.customization->>'screen_size',
      oi.customization->>'vinyl_name'
    )
  from public.order_items oi
  join public.products p on p.id = oi.product_id
  where oi.order_id = p_order_id and oi.fulfillment_type = 'custom' and p.requires_production = true
    and not exists (select 1 from public.production_queue pq where pq.order_item_id = oi.id);

  update public.orders
  set reservation_status = 'committed', reservation_expires_at = null,
      payment_status = case when p_payment_paid then 'paid' else payment_status end,
      status = case
        when exists (select 1 from public.order_items where order_id = p_order_id and fulfillment_type = 'custom')
          then 'in_production'
        else 'ready'
      end,
      updated_at = now()
  where id = p_order_id;
end;
$$;

revoke all on function public.reserve_supply(uuid, uuid, uuid, int, timestamptz, text) from public, anon, authenticated;
revoke all on function public.release_order_reservations(uuid, text) from public, anon, authenticated;
revoke all on function public.expire_order_reservations() from public, anon, authenticated;
grant execute on function public.expire_order_reservations() to service_role;
revoke all on function public.confirm_store_order(uuid, boolean) from public, anon;
grant execute on function public.confirm_store_order(uuid, boolean) to authenticated;
revoke all on function public.create_store_order(jsonb, jsonb, text, text, jsonb) from public;
grant execute on function public.create_store_order(jsonb, jsonb, text, text, jsonb) to anon, authenticated;

-- Guardrail: custom orders must reserve real physical supplies.
-- Vinyl designs are the only exception: if the selected vinyl has no stock,
-- checkout can mark it as print/custom and production creates a print task.
create or replace function public.validate_custom_order_physical_supplies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_meta jsonb;
  v_required_joysticks int := 0;
  v_required_buttons int := 0;
  v_player jsonb;
  v_has_players boolean := false;
  v_button_supply_id uuid;
begin
  if new.fulfillment_type <> 'custom' then
    return new;
  end if;

  select * into v_product
  from public.products
  where id = new.product_id;

  if not found then
    raise exception 'Producto inexistente';
  end if;

  v_meta := public.safe_jsonb(v_product.meta_description);
  v_required_joysticks := coalesce((v_meta->>'joysticks_count')::int, 0);
  v_required_buttons := coalesce((v_meta->>'buttons_per_player')::int, 0);

  v_has_players := jsonb_typeof(new.customization->'players') = 'array'
    and jsonb_array_length(new.customization->'players') > 0;

  if v_has_players then
    for v_player in select value from jsonb_array_elements(new.customization->'players')
    loop
      if v_required_joysticks > 0 and nullif(v_player->>'joystick_supply_id', '') is null then
        raise exception 'Seleccioná una palanca con stock para cada jugador';
      end if;

      v_button_supply_id := coalesce(
        nullif(v_player->>'button_supply_id', '')::uuid,
        nullif(v_player->'button_supply_ids'->>0, '')::uuid
      );
      if v_required_buttons > 0 and v_button_supply_id is null then
        raise exception 'Seleccioná botones con stock para cada jugador';
      end if;
    end loop;
  else
    if v_required_joysticks > 0 and nullif(new.customization->>'joystick_supply_id', '') is null then
      raise exception 'Seleccioná una palanca con stock';
    end if;

    v_button_supply_id := coalesce(
      nullif(new.customization->>'button_supply_id', '')::uuid,
      nullif(new.customization->'button_supply_ids'->>0, '')::uuid
    );
    if v_required_buttons > 0 and v_button_supply_id is null then
      raise exception 'Seleccioná botones con stock';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_custom_order_physical_supplies() from public, anon, authenticated;

drop trigger if exists validate_custom_order_physical_supplies_before_insert on public.order_items;
create trigger validate_custom_order_physical_supplies_before_insert
before insert on public.order_items
for each row
execute function public.validate_custom_order_physical_supplies();

-- Factory-only operation: components and finished stock move in one transaction.
create or replace function public.assemble_ready_stock(
  p_product_id uuid,
  p_variant_id uuid,
  p_quantity int,
  p_configuration jsonb,
  p_supplies jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_supply jsonb;
  v_supply_id uuid;
  v_needed int;
  v_available int;
  v_stock_id uuid;
begin
  select role into v_role from public.user_profiles where id = auth.uid();
  if v_role <> 'admin' then
    raise exception 'No autorizado';
  end if;
  if p_quantity < 1 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;
  if not exists (select 1 from public.products where id = p_product_id and is_active = true) then
    raise exception 'Producto inválido';
  end if;
  if p_variant_id is not null and not exists (
    select 1 from public.product_variants
    where id = p_variant_id and product_id = p_product_id and is_active = true
  ) then
    raise exception 'Variante inválida';
  end if;

  for v_supply in select value from jsonb_array_elements(coalesce(p_supplies, '[]'::jsonb))
  loop
    v_supply_id := (v_supply->>'id')::uuid;
    v_needed := (v_supply->>'quantity')::int;
    select quantity into v_available from public.supply_inventory
    where id = v_supply_id and is_active = true for update;
    if v_available is null or v_needed < 1 or v_available < v_needed then
      raise exception 'Stock insuficiente para el insumo %', v_supply_id;
    end if;
    update public.supply_inventory
    set quantity = quantity - v_needed, updated_at = now()
    where id = v_supply_id;
  end loop;

  insert into public.stock_items (
    product_id, variant_id, vinyl_supply_id, stock_type, quantity, configuration
  ) values (
    p_product_id, p_variant_id, nullif(p_configuration->>'vinyl_supply_id', '')::uuid,
    'immediate', p_quantity, coalesce(p_configuration, '{}'::jsonb)
  ) returning id into v_stock_id;

  return v_stock_id;
end;
$$;

revoke all on function public.assemble_ready_stock(uuid, uuid, int, jsonb, jsonb) from public, anon;
grant execute on function public.assemble_ready_stock(uuid, uuid, int, jsonb, jsonb) to authenticated;

create unique index if not exists idx_production_queue_order_item_unique
  on public.production_queue(order_item_id);

create or replace function public.cancel_store_order(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_started boolean;
begin
  select role into v_role from public.user_profiles where id = auth.uid();
  if v_role <> 'admin' then raise exception 'No autorizado'; end if;

  select exists (
    select 1 from public.production_queue
    where order_id = p_order_id and status in ('in_progress', 'finished', 'dispatched')
  ) into v_started;

  if v_started then
    update public.orders
    set status = 'cancelled', cancellation_resolution = 'pending', updated_at = now()
    where id = p_order_id;
    return 'pending_resolution';
  end if;

  perform public.release_order_reservations(p_order_id, 'released');
  delete from public.production_queue where order_id = p_order_id and status = 'pending';
  update public.orders
  set status = 'cancelled', cancellation_resolution = null, updated_at = now()
  where id = p_order_id;
  return 'released';
end;
$$;

create or replace function public.resolve_cancelled_order(
  p_order_id uuid,
  p_resolution text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_item record;
  v_res public.inventory_reservations%rowtype;
begin
  select role into v_role from public.user_profiles where id = auth.uid();
  if v_role <> 'admin' then raise exception 'No autorizado'; end if;
  if p_resolution not in ('restock', 'disassemble') then
    raise exception 'Resolución inválida';
  end if;
  if not exists (
    select 1 from public.orders
    where id = p_order_id and status = 'cancelled' and cancellation_resolution = 'pending'
  ) then
    raise exception 'El pedido no requiere resolución';
  end if;

  -- Finished custom items either become immutable ready stock or are disassembled.
  for v_item in
    select oi.* from public.order_items oi
    where oi.order_id = p_order_id and oi.fulfillment_type = 'custom'
  loop
    if p_resolution = 'restock' then
      insert into public.stock_items (
        product_id, variant_id, vinyl_supply_id, stock_type, quantity, configuration
      ) values (
        v_item.product_id, v_item.variant_id,
        nullif(v_item.customization->>'vinyl_supply_id', '')::uuid,
        'immediate', v_item.quantity, v_item.customization
      );
      update public.inventory_reservations
      set status = 'committed', resolved_at = now()
      where order_item_id = v_item.id and resource_type = 'supply';
    end if;
  end loop;

  for v_res in
    select * from public.inventory_reservations
    where order_id = p_order_id
      and status in ('active', 'committed')
      and (resource_type = 'stock_item' or p_resolution = 'disassemble')
    order by id for update
  loop
    if v_res.resource_type = 'stock_item' then
      update public.stock_items set quantity = quantity + v_res.quantity, updated_at = now()
      where id = v_res.stock_item_id;
    else
      update public.supply_inventory set quantity = quantity + v_res.quantity, updated_at = now()
      where id = v_res.supply_id;
    end if;
    update public.inventory_reservations
    set status = 'released', resolved_at = now() where id = v_res.id;
  end loop;

  update public.order_items set reservation_status = 'released'
  where order_id = p_order_id;
  update public.orders
  set reservation_status = 'released', cancellation_resolution = p_resolution, updated_at = now()
  where id = p_order_id;
end;
$$;

create or replace function public.sync_order_from_production()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_status text;
  v_user_id uuid;
  v_order_number text;
begin
  if exists (
    select 1 from public.production_queue
    where order_id = new.order_id and status = 'in_progress'
  ) then
    v_next_status := 'in_production';
  elsif not exists (
    select 1 from public.production_queue
    where order_id = new.order_id and status <> 'dispatched'
  ) then
    v_next_status := 'dispatched';
  elsif not exists (
    select 1 from public.production_queue
    where order_id = new.order_id and status not in ('finished', 'dispatched')
  ) then
    v_next_status := 'ready';
  else
    return new;
  end if;

  update public.orders set status = v_next_status, updated_at = now()
  where id = new.order_id and status <> 'cancelled';

  select user_id, order_number into v_user_id, v_order_number
  from public.orders where id = new.order_id;
  if v_user_id is not null and old.status is distinct from new.status then
    if new.status = 'in_progress' then
      insert into public.notifications(user_id, type, title, body, related_order_id, related_production_id, action_url)
      values (v_user_id, 'production_started', 'Tu arcade entró en producción',
        'Comenzamos a fabricar el pedido ' || v_order_number || '.', new.order_id, new.id, '/mi-cuenta');
    elsif new.status = 'finished' then
      insert into public.notifications(user_id, type, title, body, related_order_id, related_production_id, action_url)
      values (v_user_id, 'production_finished', 'Tu arcade está terminado',
        'Finalizamos un equipo del pedido ' || v_order_number || '.', new.order_id, new.id, '/mi-cuenta');
    elsif new.status = 'dispatched' then
      insert into public.notifications(user_id, type, title, body, related_order_id, related_production_id, action_url)
      values (v_user_id, 'order_dispatched', 'Tu pedido fue despachado',
        'El pedido ' || v_order_number || ' está en camino.', new.order_id, new.id, '/mi-cuenta');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_order_after_production_update on public.production_queue;
create trigger sync_order_after_production_update
after update of status on public.production_queue
for each row execute function public.sync_order_from_production();

revoke all on function public.sync_order_from_production() from public, anon, authenticated;

revoke all on function public.cancel_store_order(uuid) from public, anon;
revoke all on function public.resolve_cancelled_order(uuid, text) from public, anon;
grant execute on function public.cancel_store_order(uuid) to authenticated;
grant execute on function public.resolve_cancelled_order(uuid, text) to authenticated;

drop policy if exists "System can insert notifications" on public.notifications;
drop policy if exists "Admins can insert notifications" on public.notifications;
create policy "Admins can insert notifications"
  on public.notifications for insert
  to authenticated
  with check ((select public.get_user_role()) = 'admin');

-- Prevent self-promotion through the profile update policy.
revoke update on public.user_profiles from authenticated;
grant update (full_name, phone, company_name, avatar_url) on public.user_profiles to authenticated;

create or replace function public.admin_update_user(
  p_user_id uuid,
  p_role text default null,
  p_distributor_approved boolean default null,
  p_current_account_enabled boolean default null
) returns public.user_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_profile public.user_profiles%rowtype;
begin
  select role into v_role from public.user_profiles where id = auth.uid();
  if v_role <> 'admin' then raise exception 'No autorizado'; end if;
  if p_role is not null and p_role not in ('admin', 'fabricante', 'distribuidor', 'cliente') then
    raise exception 'Rol inválido';
  end if;

  update public.user_profiles
  set role = coalesce(p_role, role),
      distributor_approved = coalesce(p_distributor_approved, distributor_approved),
      distributor_requested = case when p_distributor_approved = true then false else distributor_requested end,
      current_account_enabled = case
        when coalesce(p_role, role) = 'distribuidor'
          then coalesce(p_current_account_enabled, current_account_enabled)
        else false
      end,
      updated_at = now()
  where id = p_user_id
  returning * into v_profile;

  if v_profile.id is null then raise exception 'Usuario inexistente'; end if;

  if p_distributor_approved = true then
    insert into public.notifications(user_id, type, title, body, action_url)
    values (p_user_id, 'distributor_approved', 'Tu cuenta de distribuidor fue aprobada',
      'Ya podés acceder a los precios especiales de distribuidor.', '/productos');
  end if;
  return v_profile;
end;
$$;

revoke all on function public.admin_update_user(uuid, text, boolean, boolean) from public, anon;
grant execute on function public.admin_update_user(uuid, text, boolean, boolean) to authenticated;

create or replace function public.request_distributor_account(
  p_full_name text,
  p_company_name text,
  p_phone text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Debés iniciar sesión'; end if;
  if coalesce(trim(p_full_name), '') = '' or coalesce(trim(p_company_name), '') = '' then
    raise exception 'Nombre y empresa son obligatorios';
  end if;
  update public.user_profiles
  set full_name = trim(p_full_name), company_name = trim(p_company_name), phone = nullif(trim(p_phone), ''),
      distributor_requested = true, distributor_approved = false, current_account_enabled = false,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.request_distributor_account(text, text, text) from public, anon;
grant execute on function public.request_distributor_account(text, text, text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_first_user boolean;
begin
  select count(*) = 0 into is_first_user from public.user_profiles;
  insert into public.user_profiles (
    id, full_name, avatar_url, phone, company_name, role, distributor_requested
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name',
    case when is_first_user then 'admin' else 'cliente' end,
    case
      when is_first_user then false
      else coalesce((new.raw_user_meta_data->>'distributor_requested')::boolean, false)
    end
  );
  return new;
end;
$$;
