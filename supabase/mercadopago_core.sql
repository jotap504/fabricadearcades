-- MercadoPago Checkout Pro: nuevo método de pago para clientes finales.
-- Aplicar después de order_flow_upgrade.sql (create_store_order ya debe existir).

-- Permitir 'mercadopago' como método de pago válido en orders.
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method = any (array['cash'::text, 'transfer'::text, 'card'::text, 'pending'::text, 'current_account'::text, 'mercadopago'::text]));

-- Auditoría de eventos de pago de MercadoPago (una fila por notificación de webhook procesada).
create table if not exists public.mercadopago_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  mp_payment_id text not null,
  status text not null,
  status_detail text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint mercadopago_payments_mp_payment_id_unique unique (mp_payment_id)
);

create index if not exists mercadopago_payments_order_id_idx
  on public.mercadopago_payments (order_id, created_at desc);

alter table public.mercadopago_payments enable row level security;

drop policy if exists "Admins read mercadopago payments" on public.mercadopago_payments;
create policy "Admins read mercadopago payments"
  on public.mercadopago_payments for select
  to authenticated
  using ((select public.get_user_role()) = 'admin');

grant select on public.mercadopago_payments to authenticated;
-- Inserts solo vía service_role, desde el webhook.

-- create_store_order: agregar 'mercadopago' a los métodos válidos y su
-- lookup de recargo/descuento (mercadopago_surcharge_pct en delivery_config,
-- default 0 — el comercio decide si traslada la comisión al cliente).
-- El resto de la función queda idéntico a order_flow_upgrade.sql.
CREATE OR REPLACE FUNCTION public.create_store_order(p_customer jsonb, p_shipping jsonb, p_payment_method text, p_notes text, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  v_addons jsonb;
  v_fulfillment text;
  v_stock_item_id uuid;
  v_player jsonb;
  v_addon jsonb;
  v_bom jsonb;
  v_supply_id uuid;
  v_button_count int;
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
  if p_payment_method not in ('cash', 'transfer', 'card', 'current_account', 'mercadopago') then
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
  elsif p_payment_method = 'mercadopago' then
    select coalesce(value::numeric, 0) into v_surcharge_pct
    from public.delivery_config where key = 'mercadopago_surcharge_pct';
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

      if v_stock.configuration <> '{}'::jsonb then
        v_customization := v_stock.configuration || jsonb_build_object('addons', v_addons);
      end if;

      v_led_surcharge := coalesce((public.safe_jsonb(v_product.meta_description)->>'led_surcharge')::numeric, 0);
      if v_customization->>'joystick_type' = 'led' then
        v_unit_price := v_unit_price + v_led_surcharge * 0.5;
      end if;
      if v_customization->>'button_type' = 'led' then
        v_unit_price := v_unit_price + v_led_surcharge * 0.5;
      end if;
    else
      v_has_custom := true;
      v_led_surcharge := coalesce((public.safe_jsonb(v_product.meta_description)->>'led_surcharge')::numeric, 0);
      if v_customization->>'joystick_type' = 'led' then
        v_unit_price := v_unit_price + v_led_surcharge * 0.5;
      end if;
      if v_customization->>'button_type' = 'led' then
        v_unit_price := v_unit_price + v_led_surcharge * 0.5;
      end if;
    end if;

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
          if nullif(v_player->>'joystick_supply_id', '') is not null then
            perform public.reserve_supply(v_order_id, v_order_item_id,
              (v_player->>'joystick_supply_id')::uuid, v_quantity, v_expires_at, 'joystick');
          end if;
          v_supply_id := coalesce(
            nullif(v_player->>'button_supply_id', '')::uuid,
            nullif(v_player->'button_supply_ids'->>0, '')::uuid
          );
          v_button_count := greatest(coalesce((v_player->>'button_count')::int, 6), 1);
          if v_supply_id is not null then
            perform public.reserve_supply(v_order_id, v_order_item_id,
              v_supply_id, v_button_count * v_quantity, v_expires_at, 'button');
          end if;
        end loop;
      else
        if nullif(v_customization->>'joystick_supply_id', '') is not null then
          perform public.reserve_supply(v_order_id, v_order_item_id,
            (v_customization->>'joystick_supply_id')::uuid, v_quantity, v_expires_at, 'joystick');
        end if;
        v_supply_id := coalesce(
          nullif(v_customization->>'button_supply_id', '')::uuid,
          nullif(v_customization->'button_supply_ids'->>0, '')::uuid
        );
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
$function$
;
