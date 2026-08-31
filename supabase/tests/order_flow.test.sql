-- Fábrica de Arcades — pruebas integrales del flujo de pedidos
-- La suite usa datos existentes, valida los movimientos y revierte todo al finalizar.

begin;

do $$
declare
  v_ready_stock public.stock_items%rowtype;
  v_custom_product public.products%rowtype;
  v_custom_variant uuid;
  v_joystick public.supply_inventory%rowtype;
  v_button public.supply_inventory%rowtype;
  v_vinyl public.supply_inventory%rowtype;
  v_admin_id uuid;
  v_distributor_id uuid;
  v_result jsonb;
  v_order_id uuid;
  v_order_item_id uuid;
  v_stock_before int;
  v_joystick_before int;
  v_button_before int;
  v_vinyl_before int;
  v_finished_stock_before bigint;
  v_value int;
  v_text text;
begin
  select si.* into v_ready_stock
  from public.stock_items si
  join public.products p on p.id = si.product_id and p.is_active
  where si.stock_type = 'immediate' and si.quantity > 0
  order by si.quantity desc, si.id
  limit 1;
  if v_ready_stock.id is null then
    raise exception 'TEST SETUP: se necesita al menos un producto con stock listo';
  end if;

  select p.* into v_custom_product
  from public.products p
  where p.is_active and p.requires_production
    and jsonb_array_length(coalesce(public.safe_jsonb(p.meta_description)->'bom', '[]'::jsonb)) = 0
  order by p.id
  limit 1;
  if v_custom_product.id is null then
    raise exception 'TEST SETUP: se necesita un producto a medida sin BOM fijo';
  end if;

  select id into v_custom_variant
  from public.product_variants
  where product_id = v_custom_product.id and is_active
  order by sort_order, id
  limit 1;

  select * into v_joystick from public.supply_inventory
  where is_active and supply_type = 'joystick' and quantity >= 4
  order by quantity desc, id limit 1;
  select * into v_button from public.supply_inventory
  where is_active and supply_type = 'button' and quantity >= 24
  order by quantity desc, id limit 1;
  select * into v_vinyl from public.supply_inventory
  where is_active and supply_type = 'vinyl' and quantity >= 4
  order by quantity desc, id limit 1;
  if v_joystick.id is null or v_button.id is null or v_vinyl.id is null then
    raise exception 'TEST SETUP: faltan insumos suficientes para la suite';
  end if;

  select id into v_admin_id from public.user_profiles where role = 'admin' order by id limit 1;
  select id into v_distributor_id from public.user_profiles where role = 'distribuidor' order by id limit 1;
  if v_admin_id is null or v_distributor_id is null then
    raise exception 'TEST SETUP: se necesita un admin y un distribuidor';
  end if;

  -- FLUJO 1: cliente final compra stock listo; reserva 48 h y no toca insumos.
  perform set_config('request.jwt.claim.sub', '', true);
  v_stock_before := v_ready_stock.quantity;
  select quantity into v_joystick_before from public.supply_inventory where id = v_joystick.id;

  v_result := public.create_store_order(
    jsonb_build_object('name', 'Prueba stock listo', 'email', 'stock-listo@test.local', 'phone', '111'),
    jsonb_build_object('delivery_method', 'pickup'),
    'cash', 'TEST: stock listo',
    jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'product_id', v_ready_stock.product_id,
      'variant_id', v_ready_stock.variant_id,
      'stock_item_id', v_ready_stock.id,
      'quantity', 1,
      'customization', '{}'::jsonb
    )))
  );
  v_order_id := (v_result->>'orderId')::uuid;

  select quantity into v_value from public.stock_items where id = v_ready_stock.id;
  if v_value <> v_stock_before - 1 then
    raise exception 'FLUJO 1: no se reservó una unidad de stock listo';
  end if;
  select quantity into v_value from public.supply_inventory where id = v_joystick.id;
  if v_value <> v_joystick_before then
    raise exception 'FLUJO 1: vender stock listo modificó insumos';
  end if;
  if not exists (
    select 1 from public.orders
    where id = v_order_id and reservation_status = 'active'
      and reservation_expires_at between now() + interval '47 hours 55 minutes'
                                     and now() + interval '48 hours 5 minutes'
  ) then
    raise exception 'FLUJO 1: la reserva no vence aproximadamente en 48 horas';
  end if;

  update public.orders set reservation_expires_at = now() - interval '1 minute' where id = v_order_id;
  update public.inventory_reservations set expires_at = now() - interval '1 minute' where order_id = v_order_id;
  perform public.expire_order_reservations();
  select quantity into v_value from public.stock_items where id = v_ready_stock.id;
  if v_value <> v_stock_before then
    raise exception 'FLUJO 1: el vencimiento no devolvió el stock listo';
  end if;
  if not exists (select 1 from public.orders where id = v_order_id and status = 'cancelled' and reservation_status = 'expired') then
    raise exception 'FLUJO 1: el pedido vencido no quedó cancelado';
  end if;

  -- FLUJO 2: cliente final compra a medida; se reservan los insumos seleccionados.
  select quantity into v_joystick_before from public.supply_inventory where id = v_joystick.id;
  select quantity into v_button_before from public.supply_inventory where id = v_button.id;
  select quantity into v_vinyl_before from public.supply_inventory where id = v_vinyl.id;

  v_result := public.create_store_order(
    jsonb_build_object('name', 'Prueba a medida', 'email', 'medida@test.local'),
    jsonb_build_object('delivery_method', 'pickup'),
    'transfer', 'TEST: a medida',
    jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'product_id', v_custom_product.id,
      'variant_id', v_custom_variant,
      'quantity', 1,
      'customization', jsonb_build_object(
        'vinyl_supply_id', v_vinyl.id,
        'players', jsonb_build_array(jsonb_build_object(
          'joystick_supply_id', v_joystick.id,
          'button_supply_id', v_button.id,
          'button_count', 6
        )),
        'addons', '[]'::jsonb
      )
    )))
  );
  v_order_id := (v_result->>'orderId')::uuid;
  select id into v_order_item_id from public.order_items where order_id = v_order_id;

  if (select quantity from public.supply_inventory where id = v_joystick.id) <> v_joystick_before - 1
     or (select quantity from public.supply_inventory where id = v_button.id) <> v_button_before - 6
     or (select quantity from public.supply_inventory where id = v_vinyl.id) <> v_vinyl_before - 1 then
    raise exception 'FLUJO 2: las cantidades de insumos reservadas son incorrectas';
  end if;
  select count(*) into v_value from public.inventory_reservations
  where order_item_id = v_order_item_id and resource_type = 'supply' and status = 'active';
  if v_value <> 3 then
    raise exception 'FLUJO 2: se esperaban tres reservas de insumos, se encontraron %', v_value;
  end if;

  -- Confirmación manual: pasa directo a producción, sin aprobación adicional.
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  perform public.confirm_store_order(v_order_id, true);
  if not exists (
    select 1 from public.orders
    where id = v_order_id and status = 'in_production'
      and payment_status = 'paid' and reservation_status = 'committed'
  ) or not exists (
    select 1 from public.production_queue where order_id = v_order_id and status = 'pending'
  ) then
    raise exception 'FLUJO 2: la confirmación no envió el pedido a producción';
  end if;

  -- Cancelación antes de comenzar producción: devuelve todos los insumos.
  v_text := public.cancel_store_order(v_order_id);
  if v_text <> 'released'
     or (select quantity from public.supply_inventory where id = v_joystick.id) <> v_joystick_before
     or (select quantity from public.supply_inventory where id = v_button.id) <> v_button_before
     or (select quantity from public.supply_inventory where id = v_vinyl.id) <> v_vinyl_before then
    raise exception 'FLUJO 2: cancelar antes de fabricar no devolvió los insumos';
  end if;

  -- FLUJO 3: carrito mixto de distribuidor con cuenta corriente.
  update public.user_profiles
  set distributor_approved = true, current_account_enabled = true
  where id = v_distributor_id;
  perform set_config('request.jwt.claim.sub', v_distributor_id::text, true);
  v_stock_before := (select quantity from public.stock_items where id = v_ready_stock.id);
  v_result := public.create_store_order(
    jsonb_build_object('name', 'Nombre ignorado', 'email', 'ignorado@test.local'),
    jsonb_build_object('delivery_method', 'pickup'),
    'current_account', 'TEST: carrito mixto',
    jsonb_build_array(
      jsonb_strip_nulls(jsonb_build_object(
        'product_id', v_ready_stock.product_id, 'variant_id', v_ready_stock.variant_id,
        'stock_item_id', v_ready_stock.id, 'quantity', 1, 'customization', '{}'::jsonb
      )),
      jsonb_strip_nulls(jsonb_build_object(
        'product_id', v_custom_product.id, 'variant_id', v_custom_variant, 'quantity', 1,
        'customization', jsonb_build_object(
          'vinyl_supply_id', v_vinyl.id,
          'players', jsonb_build_array(jsonb_build_object(
            'joystick_supply_id', v_joystick.id,
            'button_supply_id', v_button.id,
            'button_count', 6
          )), 'addons', '[]'::jsonb
        )
      ))
    )
  );
  v_order_id := (v_result->>'orderId')::uuid;
  if not exists (
    select 1 from public.orders
    where id = v_order_id and status = 'in_production'
      and reservation_status = 'committed' and reservation_expires_at is null
  ) then
    raise exception 'FLUJO 3: la cuenta corriente no pasó directo a producción';
  end if;
  select count(*) into v_value from public.order_items where order_id = v_order_id;
  if v_value <> 2 or not exists (
    select 1 from public.order_items where order_id = v_order_id and fulfillment_type = 'ready_stock'
  ) or not exists (
    select 1 from public.order_items where order_id = v_order_id and fulfillment_type = 'custom'
  ) then
    raise exception 'FLUJO 3: el carrito mixto no conservó ambas modalidades';
  end if;
  if not exists (select 1 from public.production_queue where order_id = v_order_id) then
    raise exception 'FLUJO 3: el artículo a medida no ingresó a producción';
  end if;

  -- Un distribuidor no puede ejecutar acciones administrativas.
  begin
    perform public.confirm_store_order(v_order_id, false);
    raise exception 'FLUJO 3: un distribuidor pudo confirmar administrativamente un pedido';
  exception
    when others then
      if sqlerrm <> 'No autorizado' then raise; end if;
  end;

  -- FLUJO 4: producción iniciada y resolución manual como stock listo.
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  update public.production_queue set status = 'in_progress' where order_id = v_order_id;
  v_text := public.cancel_store_order(v_order_id);
  if v_text <> 'pending_resolution' or not exists (
    select 1 from public.orders where id = v_order_id and cancellation_resolution = 'pending'
  ) then
    raise exception 'FLUJO 4: la cancelación iniciada no solicitó resolución manual';
  end if;
  select count(*) into v_finished_stock_before from public.stock_items
  where product_id = v_custom_product.id and stock_type = 'immediate';
  perform public.resolve_cancelled_order(v_order_id, 'restock');
  if (select count(*) from public.stock_items where product_id = v_custom_product.id and stock_type = 'immediate')
       <> v_finished_stock_before + 1 then
    raise exception 'FLUJO 4: el producto cancelado no se convirtió en stock listo';
  end if;
  if not exists (
    select 1 from public.orders where id = v_order_id and cancellation_resolution = 'restock'
  ) then
    raise exception 'FLUJO 4: no quedó registrada la resolución restock';
  end if;

  -- FLUJO 5: producción iniciada y resolución manual por desarme.
  perform set_config('request.jwt.claim.sub', v_distributor_id::text, true);
  select quantity into v_joystick_before from public.supply_inventory where id = v_joystick.id;
  select quantity into v_button_before from public.supply_inventory where id = v_button.id;
  select quantity into v_vinyl_before from public.supply_inventory where id = v_vinyl.id;
  select count(*) into v_finished_stock_before from public.stock_items
  where product_id = v_custom_product.id and stock_type = 'immediate';

  v_result := public.create_store_order(
    jsonb_build_object('name', 'Nombre ignorado', 'email', 'ignorado@test.local'),
    jsonb_build_object('delivery_method', 'pickup'),
    'current_account', 'TEST: cancelar y desarmar',
    jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'product_id', v_custom_product.id, 'variant_id', v_custom_variant, 'quantity', 1,
      'customization', jsonb_build_object(
        'vinyl_supply_id', v_vinyl.id,
        'players', jsonb_build_array(jsonb_build_object(
          'joystick_supply_id', v_joystick.id,
          'button_supply_id', v_button.id,
          'button_count', 6
        )), 'addons', '[]'::jsonb
      )
    )))
  );
  v_order_id := (v_result->>'orderId')::uuid;
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  update public.production_queue set status = 'in_progress' where order_id = v_order_id;
  v_text := public.cancel_store_order(v_order_id);
  perform public.resolve_cancelled_order(v_order_id, 'disassemble');

  if v_text <> 'pending_resolution'
     or (select quantity from public.supply_inventory where id = v_joystick.id) <> v_joystick_before
     or (select quantity from public.supply_inventory where id = v_button.id) <> v_button_before
     or (select quantity from public.supply_inventory where id = v_vinyl.id) <> v_vinyl_before then
    raise exception 'FLUJO 5: el desarme no devolvió todos los insumos';
  end if;
  if (select count(*) from public.stock_items where product_id = v_custom_product.id and stock_type = 'immediate')
       <> v_finished_stock_before then
    raise exception 'FLUJO 5: el desarme creó stock terminado indebidamente';
  end if;
  if not exists (
    select 1 from public.orders where id = v_order_id and cancellation_resolution = 'disassemble'
  ) then
    raise exception 'FLUJO 5: no quedó registrada la resolución disassemble';
  end if;

  -- FLUJO 6: el precio no acepta un rol privilegiado enviado por el cliente.
  perform set_config('request.jwt.claim.sub', '', true);
  if public.get_product_price(v_custom_product.id, 'admin')
       <> v_custom_product.base_price * (1 + v_custom_product.retail_markup_pct / 100) then
    raise exception 'FLUJO 6: fue posible forzar el precio administrativo';
  end if;
end;
$$;

rollback;

select jsonb_build_object(
  'success', true,
  'suite', 'order_flow',
  'flows', jsonb_build_array(
    'stock_ready_48h_expiry',
    'custom_supply_reservation',
    'manual_confirmation_to_production',
    'mixed_cart_current_account',
    'cancel_to_ready_stock',
    'cancel_and_disassemble',
    'privileged_price_protection'
  ),
  'database_changes_persisted', false
) as test_result;
