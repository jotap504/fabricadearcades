-- Seed generado desde ventas/Lista producto con precio mayorista.xlsx
begin;

insert into public.categories (name, slug, description, sort_order, is_active) values ('Arcades', 'arcades', 'Catálogo cargado desde planilla de ventas', 0, true) on conflict (slug) do update set name = excluded.name, description = excluded.description, is_active = true;
insert into public.categories (name, slug, description, sort_order, is_active) values ('Bartops', 'bartops', 'Catálogo cargado desde planilla de ventas', 0, true) on conflict (slug) do update set name = excluded.name, description = excluded.description, is_active = true;
insert into public.categories (name, slug, description, sort_order, is_active) values ('Consolas', 'consolas', 'Catálogo cargado desde planilla de ventas', 0, true) on conflict (slug) do update set name = excluded.name, description = excluded.description, is_active = true;
insert into public.categories (name, slug, description, sort_order, is_active) values ('Fightsticks', 'fightsticks', 'Catálogo cargado desde planilla de ventas', 0, true) on conflict (slug) do update set name = excluded.name, description = excluded.description, is_active = true;
insert into public.categories (name, slug, description, sort_order, is_active) values ('Pedestales', 'pedestales', 'Catálogo cargado desde planilla de ventas', 0, true) on conflict (slug) do update set name = excluded.name, description = excluded.description, is_active = true;

insert into public.supply_inventory (name, supply_type, color_label, quantity, unit, low_stock_threshold, is_active) values ('Palanca estándar', 'joystick', null, 0, 'unidad', 5, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, quantity, unit, low_stock_threshold, is_active) values ('Palanca LED', 'joystick', 'LED', 0, 'unidad', 5, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, quantity, unit, low_stock_threshold, is_active) values ('Botón estándar', 'button', null, 0, 'unidad', 5, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, quantity, unit, low_stock_threshold, is_active) values ('Botón LED', 'button', 'LED', 0, 'unidad', 5, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, quantity, unit, low_stock_threshold, is_active) values ('Cerebro intel n2807 320hdd', 'other', null, 0, 'unidad', 5, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, quantity, unit, low_stock_threshold, is_active) values ('Cerebro pc i3 4ta 500hdd', 'other', null, 0, 'unidad', 5, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, quantity, unit, low_stock_threshold, is_active) values ('Cerebro raspberry 2040', 'other', null, 0, 'unidad', 5, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('arcade pie - Marioretro', 'vinyl', 'arcade pie', '/vinilos/arcade pie/marioretro.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('arcade pie - Messi', 'vinyl', 'arcade pie', '/vinilos/arcade pie/messi.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('arcade pie - Minecraftroblox', 'vinyl', 'arcade pie', '/vinilos/arcade pie/minecraftroblox.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('arcade pie - Mortalkombat', 'vinyl', 'arcade pie', '/vinilos/arcade pie/mortalkombat.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('arcade pie - Roblox', 'vinyl', 'arcade pie', '/vinilos/arcade pie/roblox.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('arcade pie - Smashbross', 'vinyl', 'arcade pie', '/vinilos/arcade pie/smashbross.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('arcade pie - Starwars', 'vinyl', 'arcade pie', '/vinilos/arcade pie/starwars.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('arcade pie - Supermario', 'vinyl', 'arcade pie', '/vinilos/arcade pie/supermario.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('arcade pie - Tortugas', 'vinyl', 'arcade pie', '/vinilos/arcade pie/tortugas.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('arcade pie - Volveralfuturo', 'vinyl', 'arcade pie', '/vinilos/arcade pie/volveralfuturo.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('arcade pie - Wonderboy', 'vinyl', 'arcade pie', '/vinilos/arcade pie/Wonderboy.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('bartop19 - Supermario', 'vinyl', 'bartop19', '/vinilos/bartop19/supermario.png', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('bigbox - Atari2', 'vinyl', 'bigbox', '/vinilos/bigbox/atari2.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('bigbox - Ironman', 'vinyl', 'bigbox', '/vinilos/bigbox/ironman.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('bigbox - Pedestal', 'vinyl', 'bigbox', '/vinilos/bigbox/pedestal.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('bigbox - Ps2', 'vinyl', 'bigbox', '/vinilos/bigbox/ps2.png', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Gokuazul', 'vinyl', 'consola 78', '/vinilos/consola 78/gokuazul.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Heman', 'vinyl', 'consola 78', '/vinilos/consola 78/heman.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Jurassic', 'vinyl', 'consola 78', '/vinilos/consola 78/jurassic.webp', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Kingoffighter', 'vinyl', 'consola 78', '/vinilos/consola 78/kingoffighter.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Marioysonic', 'vinyl', 'consola 78', '/vinilos/consola 78/marioysonic.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Messidiego', 'vinyl', 'consola 78', '/vinilos/consola 78/messidiego.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Metalslug', 'vinyl', 'consola 78', '/vinilos/consola 78/metalslug.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Mortalkombata', 'vinyl', 'consola 78', '/vinilos/consola 78/mortalkombatA.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Mortalkombatb', 'vinyl', 'consola 78', '/vinilos/consola 78/mortalkombatB.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Onepiece', 'vinyl', 'consola 78', '/vinilos/consola 78/onepiece.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - River', 'vinyl', 'consola 78', '/vinilos/consola 78/river.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Ryu', 'vinyl', 'consola 78', '/vinilos/consola 78/ryu.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Simpsons', 'vinyl', 'consola 78', '/vinilos/consola 78/simpsons.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Spiderman', 'vinyl', 'consola 78', '/vinilos/consola 78/spiderman.webp', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Starswars', 'vinyl', 'consola 78', '/vinilos/consola 78/starswars.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Streetfightera', 'vinyl', 'consola 78', '/vinilos/consola 78/streetfighterA.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Streetfighterb', 'vinyl', 'consola 78', '/vinilos/consola 78/streetfighterB.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Supermario', 'vinyl', 'consola 78', '/vinilos/consola 78/supermario.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('consola 78 - Vegeta', 'vinyl', 'consola 78', '/vinilos/consola 78/vegeta.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('fightbox - Fighter', 'vinyl', 'fightbox', '/vinilos/fightbox/fighter.png', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('fightbox - Streetfighter', 'vinyl', 'fightbox', '/vinilos/fightbox/streetfighter.png', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('fightstick 1p - Dragonball', 'vinyl', 'fightstick 1p', '/vinilos/fightstick 1p/dragonball.png', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('fightstick 1p - Starwars', 'vinyl', 'fightstick 1p', '/vinilos/fightstick 1p/starwars.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('fightstick 1p - Street', 'vinyl', 'fightstick 1p', '/vinilos/fightstick 1p/street.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('modular - Kingoffighter', 'vinyl', 'modular', '/vinilos/modular/kingoffighter.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('modular - Metalslug', 'vinyl', 'modular', '/vinilos/modular/metalslug.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('modular - Pacman', 'vinyl', 'modular', '/vinilos/modular/pacman.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('modular - Streetfighter', 'vinyl', 'modular', '/vinilos/modular/streetfighter.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('modular - Tortugas', 'vinyl', 'modular', '/vinilos/modular/tortugas.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('pedestal Doble - Argentina', 'vinyl', 'pedestal Doble', '/vinilos/pedestal Doble/argentina.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('pedestal Doble - Killerinstinct', 'vinyl', 'pedestal Doble', '/vinilos/pedestal Doble/killerinstinct.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('pedestal Doble - Mariogalaxy', 'vinyl', 'pedestal Doble', '/vinilos/pedestal Doble/mariogalaxy.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('pedestal Doble - Pokemon', 'vinyl', 'pedestal Doble', '/vinilos/pedestal Doble/POKEMON.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('pedestal Doble - Sonic', 'vinyl', 'pedestal Doble', '/vinilos/pedestal Doble/sonic.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('pedestal Doble - Spacejam', 'vinyl', 'pedestal Doble', '/vinilos/pedestal Doble/spacejam.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('pedestal Doble - Streetfightera', 'vinyl', 'pedestal Doble', '/vinilos/pedestal Doble/streetfighterA.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('pedestal Doble - X Menv', 'vinyl', 'pedestal Doble', '/vinilos/pedestal Doble/X-MENv.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('Pedestal Quad - Argentina', 'vinyl', 'Pedestal Quad', '/vinilos/Pedestal Quad/argentina.jfif', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('Pedestal Quad - Marioysonic', 'vinyl', 'Pedestal Quad', '/vinilos/Pedestal Quad/marioysonic.jpg', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('Pedestal Quad - Starwars', 'vinyl', 'Pedestal Quad', '/vinilos/Pedestal Quad/starwars.jfif', 0, 'diseño', 0, true) on conflict do nothing;
insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values ('retrotime plus - Nintendo0', 'vinyl', 'retrotime plus', '/vinilos/retrotime plus/nintendo0.jpg', 0, 'diseño', 0, true) on conflict do nothing;

insert into public.pricing_config (key, value, label, updated_at) values ('supply_families', jsonb_build_array(
    jsonb_build_object('id','boton-30mm','name','Boton 30mm','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='button' and is_active and lower(name) not like '%led%' and coalesce(lower(color_label),'') not like '%led%'), '[]'::jsonb)),
    jsonb_build_object('id','boton-30mm-led','name','Boton 30mm Led','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='button' and is_active and (lower(name) like '%led%' or coalesce(lower(color_label),'') like '%led%')), '[]'::jsonb)),
    jsonb_build_object('id','boton-24mm','name','Boton 24mm','supply_ids','[]'::jsonb),
    jsonb_build_object('id','palanca-led','name','Palanca Led','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='joystick' and is_active and (lower(name) like '%led%' or coalesce(lower(color_label),'') like '%led%')), '[]'::jsonb)),
    jsonb_build_object('id','palanca-std','name','Palanca Std','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='joystick' and is_active and lower(name) not like '%led%' and coalesce(lower(color_label),'') not like '%led%'), '[]'::jsonb)),
    jsonb_build_object('id','palanca-americana','name','Palanca Americana','supply_ids','[]'::jsonb),
    jsonb_build_object('id','vinilo-arcade-pie','name','Vinilo arcade pie','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='vinyl' and color_label='arcade pie'), '[]'::jsonb)),
    jsonb_build_object('id','vinilo-bartop19','name','Vinilo bartop19','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='vinyl' and color_label='bartop19'), '[]'::jsonb)),
    jsonb_build_object('id','vinilo-bigbox','name','Vinilo bigbox','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='vinyl' and color_label='bigbox'), '[]'::jsonb)),
    jsonb_build_object('id','vinilo-consola-78','name','Vinilo consola 78','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='vinyl' and color_label='consola 78'), '[]'::jsonb)),
    jsonb_build_object('id','vinilo-fightbox','name','Vinilo fightbox','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='vinyl' and color_label='fightbox'), '[]'::jsonb)),
    jsonb_build_object('id','vinilo-fightstick-1p','name','Vinilo fightstick 1p','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='vinyl' and color_label='fightstick 1p'), '[]'::jsonb)),
    jsonb_build_object('id','vinilo-fightstick-zero','name','Vinilo fightstick zero','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='vinyl' and color_label='fightstick zero'), '[]'::jsonb)),
    jsonb_build_object('id','vinilo-modular','name','Vinilo modular','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='vinyl' and color_label='modular'), '[]'::jsonb)),
    jsonb_build_object('id','vinilo-pedestal-doble','name','Vinilo pedestal Doble','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='vinyl' and color_label='pedestal Doble'), '[]'::jsonb)),
    jsonb_build_object('id','vinilo-pedestal-quad','name','Vinilo Pedestal Quad','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='vinyl' and color_label='Pedestal Quad'), '[]'::jsonb)),
    jsonb_build_object('id','vinilo-retrotime-plus','name','Vinilo retrotime plus','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='vinyl' and color_label='retrotime plus'), '[]'::jsonb))
  ), 'Familias de insumos', now()) on conflict (key) do update set value = excluded.value, label = excluded.label, updated_at = now();

with cat as (select id from public.categories where slug = 'arcades'), upserted as (insert into public.products (slug, name, short_description, description, category_id, product_type, requires_production, base_price, retail_markup_pct, images, is_featured, is_active, sort_order, meta_description) select 'retrocade-premium-32', 'Retrocade Premium 32', 'Arcade 32" + 19.000 juegos
+ De 80 consolas 
4 USB 
TV de 32 pulgadas con la posibilidad de utilizarlo con HDMI con un dispositivo externo.
Compatible con Volan', 'Arcade 32" + 19.000 juegos
+ De 80 consolas 
4 USB 
TV de 32 pulgadas con la posibilidad de utilizarlo con HDMI con un dispositivo externo.
Compatible con Volantes, joysticks, mouse, teclado - PS2, PSP, Windows 3d, Xbox, GameCube, Sega Model 2- Model 3, N64, 3DS, Dreamcast, Naomi', cat.id, 'arcade', true, 950000.00, 30, '["/vinilos/arcade pie/marioretro.jpg"]'::jsonb, false, true, 0, '{"source": "ventas_excel", "format": "Arcade de pie", "brain": "Pc i3 4ta 500hdd", "has_variants": true, "led_enabled": true, "led_surcharge": 45000.0, "players_count": 2, "joysticks_count": 2, "buttons_per_player": 11, "production_days_with_printed_vinyl": 7, "production_days_without_printed_vinyl": {"min": 7, "max": 10}, "vinyl_folder": "arcade pie", "families": [], "bom": []}' from cat on conflict (slug) do update set name = excluded.name, short_description = excluded.short_description, description = excluded.description, category_id = excluded.category_id, product_type = excluded.product_type, requires_production = excluded.requires_production, base_price = excluded.base_price, retail_markup_pct = excluded.retail_markup_pct, images = excluded.images, meta_description = excluded.meta_description, is_active = true, updated_at = now() returning id) insert into public.product_variants (product_id, cabinet_type, screen_size, price_modifier, is_active, sort_order) select id, 'vertical', null, 0, true, 0 from upserted;
update public.products set meta_description = (meta_description::jsonb || jsonb_build_object('vinyl_supply_ids', coalesce((select jsonb_agg(id) from public.supply_inventory where supply_type = 'vinyl' and color_label = 'arcade pie'), '[]'::jsonb)))::text where slug = {sql_literal(product['slug'])};
with cat as (select id from public.categories where slug = 'arcades'), upserted as (insert into public.products (slug, name, short_description, description, category_id, product_type, requires_production, base_price, retail_markup_pct, images, is_featured, is_active, sort_order, meta_description) select 'retrocade-light-32', 'Retrocade Light 32', 'Procesador Intel, 2gb ram, 320 GB HDD
USB para joysticks, teclado, mouse
Botones laterales para Pinball
Salida HDMI 
+20.000 juegos
+60 consolas', 'Procesador Intel, 2gb ram, 320 GB HDD
USB para joysticks, teclado, mouse
Botones laterales para Pinball
Salida HDMI 
+20.000 juegos
+60 consolas', cat.id, 'arcade', true, 850000.00, 30, '["/vinilos/arcade pie/marioretro.jpg"]'::jsonb, false, true, 0, '{"source": "ventas_excel", "format": "arcade de pie", "brain": "Intel n2807 320hdd", "has_variants": true, "led_enabled": true, "led_surcharge": 40000.0, "players_count": 2, "joysticks_count": 2, "buttons_per_player": 8, "production_days_with_printed_vinyl": 7, "production_days_without_printed_vinyl": {"min": 7, "max": 10}, "vinyl_folder": "arcade pie", "families": [], "bom": []}' from cat on conflict (slug) do update set name = excluded.name, short_description = excluded.short_description, description = excluded.description, category_id = excluded.category_id, product_type = excluded.product_type, requires_production = excluded.requires_production, base_price = excluded.base_price, retail_markup_pct = excluded.retail_markup_pct, images = excluded.images, meta_description = excluded.meta_description, is_active = true, updated_at = now() returning id) insert into public.product_variants (product_id, cabinet_type, screen_size, price_modifier, is_active, sort_order) select id, 'vertical', null, 0, true, 0 from upserted;
update public.products set meta_description = (meta_description::jsonb || jsonb_build_object('vinyl_supply_ids', coalesce((select jsonb_agg(id) from public.supply_inventory where supply_type = 'vinyl' and color_label = 'arcade pie'), '[]'::jsonb)))::text where slug = {sql_literal(product['slug'])};
with cat as (select id from public.categories where slug = 'consolas'), upserted as (insert into public.products (slug, name, short_description, description, category_id, product_type, requires_production, base_price, retail_markup_pct, images, is_featured, is_active, sort_order, meta_description) select 'retrotime', 'Retrotime', 'Procesador Intel, 2gb ram, 320 GB HDD
USB para joysticks, teclado, mouse
Botones laterales para Pinball
Salida HDMI 
+20.000 juegos
+60 consolas', 'Procesador Intel, 2gb ram, 320 GB HDD
USB para joysticks, teclado, mouse
Botones laterales para Pinball
Salida HDMI 
+20.000 juegos
+60 consolas', cat.id, 'arcade', true, 220000.00, 30, '["/vinilos/consola 78/gokuazul.jpg"]'::jsonb, false, true, 0, '{"source": "ventas_excel", "format": "consola portable", "brain": "Intel n2807 320hdd", "has_variants": true, "led_enabled": true, "led_surcharge": 40000.0, "players_count": 2, "joysticks_count": 2, "buttons_per_player": 8, "production_days_with_printed_vinyl": 1, "production_days_without_printed_vinyl": {"min": 7, "max": 10}, "vinyl_folder": "consola 78", "families": [], "bom": []}' from cat on conflict (slug) do update set name = excluded.name, short_description = excluded.short_description, description = excluded.description, category_id = excluded.category_id, product_type = excluded.product_type, requires_production = excluded.requires_production, base_price = excluded.base_price, retail_markup_pct = excluded.retail_markup_pct, images = excluded.images, meta_description = excluded.meta_description, is_active = true, updated_at = now() returning id) insert into public.product_variants (product_id, cabinet_type, screen_size, price_modifier, is_active, sort_order) select id, 'horizontal', null, 0, true, 0 from upserted;
update public.products set meta_description = (meta_description::jsonb || jsonb_build_object('vinyl_supply_ids', coalesce((select jsonb_agg(id) from public.supply_inventory where supply_type = 'vinyl' and color_label = 'consola 78'), '[]'::jsonb)))::text where slug = {sql_literal(product['slug'])};
with cat as (select id from public.categories where slug = 'consolas'), upserted as (insert into public.products (slug, name, short_description, description, category_id, product_type, requires_production, base_price, retail_markup_pct, images, is_featured, is_active, sort_order, meta_description) select 'retrotime-plus', 'Retrotime Plus', '"Procesador Intel, 2gb ram, 320 GB HDD, Pantalla de 10 pulgadas, Parlantes Stereo
USB para joysticks, teclado, mouse
Botones laterales para Pinball
Salida HDMI ', '"Procesador Intel, 2gb ram, 320 GB HDD, Pantalla de 10 pulgadas, Parlantes Stereo
USB para joysticks, teclado, mouse
Botones laterales para Pinball
Salida HDMI 
+20.000 juegos
+60 consolas"', cat.id, 'arcade', true, 280000.00, 30, '["/vinilos/retrotime plus/nintendo0.jpg"]'::jsonb, false, true, 0, '{"source": "ventas_excel", "format": "consola con pantalla", "brain": "Intel n2807 320hdd", "has_variants": false, "led_enabled": true, "led_surcharge": 40000.0, "players_count": 2, "joysticks_count": 2, "buttons_per_player": 8, "production_days_with_printed_vinyl": 3, "production_days_without_printed_vinyl": {"min": 7, "max": 10}, "vinyl_folder": "retrotime plus", "families": [], "bom": []}' from cat on conflict (slug) do update set name = excluded.name, short_description = excluded.short_description, description = excluded.description, category_id = excluded.category_id, product_type = excluded.product_type, requires_production = excluded.requires_production, base_price = excluded.base_price, retail_markup_pct = excluded.retail_markup_pct, images = excluded.images, meta_description = excluded.meta_description, is_active = true, updated_at = now() returning id) insert into public.product_variants (product_id, cabinet_type, screen_size, price_modifier, is_active, sort_order) select id, 'horizontal', null, 0, true, 0 from upserted;
update public.products set meta_description = (meta_description::jsonb || jsonb_build_object('vinyl_supply_ids', coalesce((select jsonb_agg(id) from public.supply_inventory where supply_type = 'vinyl' and color_label = 'retrotime plus'), '[]'::jsonb)))::text where slug = {sql_literal(product['slug'])};
with cat as (select id from public.categories where slug = 'fightsticks'), upserted as (insert into public.products (slug, name, short_description, description, category_id, product_type, requires_production, base_price, retail_markup_pct, images, is_featured, is_active, sort_order, meta_description) select 'fightstick-1p', 'FightStick 1P', 'FIght Stick USB 
Respuesta super Veloz, más rápido que las Zero delay.
Palanca con 2 modos, Analógico/ Digital
12 botones con micro Incorporado
Raspberry 2040 
', 'FIght Stick USB 
Respuesta super Veloz, más rápido que las Zero delay.
Palanca con 2 modos, Analógico/ Digital
12 botones con micro Incorporado
Raspberry 2040 
+ De 6 modos elegibles
Compatibles con:
Pc Windows, Linux, Android, Ps3, Xbox, Raspberry pi3,4,5.
Conector USB-b con cable a USB largo.', cat.id, 'accessory', true, 120000.00, 30, '["/vinilos/fightstick 1p/dragonball.png"]'::jsonb, false, true, 0, '{"source": "ventas_excel", "format": "Fightstick", "brain": "Raspberry 2040", "has_variants": true, "led_enabled": false, "led_surcharge": 0, "players_count": 1, "joysticks_count": 1, "buttons_per_player": 12, "production_days_with_printed_vinyl": 1, "production_days_without_printed_vinyl": {"min": 7, "max": 10}, "vinyl_folder": "fightstick 1p", "families": [], "bom": []}' from cat on conflict (slug) do update set name = excluded.name, short_description = excluded.short_description, description = excluded.description, category_id = excluded.category_id, product_type = excluded.product_type, requires_production = excluded.requires_production, base_price = excluded.base_price, retail_markup_pct = excluded.retail_markup_pct, images = excluded.images, meta_description = excluded.meta_description, is_active = true, updated_at = now() returning id) insert into public.product_variants (product_id, cabinet_type, screen_size, price_modifier, is_active, sort_order) select id, 'horizontal', null, 0, true, 0 from upserted;
update public.products set meta_description = (meta_description::jsonb || jsonb_build_object('vinyl_supply_ids', coalesce((select jsonb_agg(id) from public.supply_inventory where supply_type = 'vinyl' and color_label = 'fightstick 1p'), '[]'::jsonb)))::text where slug = {sql_literal(product['slug'])};
with cat as (select id from public.categories where slug = 'bartops'), upserted as (insert into public.products (slug, name, short_description, description, category_id, product_type, requires_production, base_price, retail_markup_pct, images, is_featured, is_active, sort_order, meta_description) select 'bartop-19pulgadas', 'Bartop 19pulgadas', 'Bartop Retrotime

Procesador Intel, 2gb, 320gb HDD, WiFi
Monitor Hd 19" 
Parlantes Stereo
 
+20.000 juegos 
+ 60 Consolas
USB para joysticks, mouse, teclado
Pin', 'Bartop Retrotime

Procesador Intel, 2gb, 320gb HDD, WiFi
Monitor Hd 19" 
Parlantes Stereo
 
+20.000 juegos 
+ 60 Consolas
USB para joysticks, mouse, teclado
Pinball Fx con Botones Laterales', cat.id, 'arcade', true, 390000.00, 30, '["/vinilos/bartop19/supermario.png"]'::jsonb, false, true, 0, '{"source": "ventas_excel", "format": "Bartop", "brain": "intel n2807 320hdd", "has_variants": false, "led_enabled": true, "led_surcharge": 0, "players_count": 2, "joysticks_count": 2, "buttons_per_player": 9, "production_days_with_printed_vinyl": 3, "production_days_without_printed_vinyl": {"min": 7, "max": 10}, "vinyl_folder": "bartop19", "families": [], "bom": []}' from cat on conflict (slug) do update set name = excluded.name, short_description = excluded.short_description, description = excluded.description, category_id = excluded.category_id, product_type = excluded.product_type, requires_production = excluded.requires_production, base_price = excluded.base_price, retail_markup_pct = excluded.retail_markup_pct, images = excluded.images, meta_description = excluded.meta_description, is_active = true, updated_at = now() returning id) insert into public.product_variants (product_id, cabinet_type, screen_size, price_modifier, is_active, sort_order) select id, 'bartop', null, 0, true, 0 from upserted;
update public.products set meta_description = (meta_description::jsonb || jsonb_build_object('vinyl_supply_ids', coalesce((select jsonb_agg(id) from public.supply_inventory where supply_type = 'vinyl' and color_label = 'bartop19'), '[]'::jsonb)))::text where slug = {sql_literal(product['slug'])};
with cat as (select id from public.categories where slug = 'fightsticks'), upserted as (insert into public.products (slug, name, short_description, description, category_id, product_type, requires_production, base_price, retail_markup_pct, images, is_featured, is_active, sort_order, meta_description) select 'fightbox-usb', 'FightBox USB', 'FIghtBox USB 
Respuesta super Veloz, más rápido que las Zero delay.
Mando Analógico/ Digital
16 botones con micro Incorporado
Raspberry 2040 
+ De 6 modos elegi', 'FIghtBox USB 
Respuesta super Veloz, más rápido que las Zero delay.
Mando Analógico/ Digital
16 botones con micro Incorporado
Raspberry 2040 
+ De 6 modos elegibles
Compatibles con:
Pc Windows, Linux, Android, Ps3, Xbox, Raspberry pi3,4,5.
Conector USB-b con cable a USB largo.', cat.id, 'accessory', true, 110000.00, 30, '["/vinilos/fightbox/fighter.png"]'::jsonb, false, true, 0, '{"source": "ventas_excel", "format": "Fightstick", "brain": "Raspberry 2040", "has_variants": true, "led_enabled": false, "led_surcharge": 0, "players_count": 1, "joysticks_count": 0, "buttons_per_player": 16, "production_days_with_printed_vinyl": 1, "production_days_without_printed_vinyl": {"min": 7, "max": 10}, "vinyl_folder": "fightbox", "families": [], "bom": []}' from cat on conflict (slug) do update set name = excluded.name, short_description = excluded.short_description, description = excluded.description, category_id = excluded.category_id, product_type = excluded.product_type, requires_production = excluded.requires_production, base_price = excluded.base_price, retail_markup_pct = excluded.retail_markup_pct, images = excluded.images, meta_description = excluded.meta_description, is_active = true, updated_at = now() returning id) insert into public.product_variants (product_id, cabinet_type, screen_size, price_modifier, is_active, sort_order) select id, 'horizontal', null, 0, true, 0 from upserted;
update public.products set meta_description = (meta_description::jsonb || jsonb_build_object('vinyl_supply_ids', coalesce((select jsonb_agg(id) from public.supply_inventory where supply_type = 'vinyl' and color_label = 'fightbox'), '[]'::jsonb)))::text where slug = {sql_literal(product['slug'])};
with cat as (select id from public.categories where slug = 'consolas'), upserted as (insert into public.products (slug, name, short_description, description, category_id, product_type, requires_production, base_price, retail_markup_pct, images, is_featured, is_active, sort_order, meta_description) select 'bigbox-pc', 'Bigbox PC', 'Bigbox PC
Procesador Core i3 4gb ram
500gb HDD, intelGraphics
4 USB, Botones Pinball laterales
+ 80 consolas
+ 19.000 juegos 
PS2, PSP, Windows 3d, Xbox, GameCu', 'Bigbox PC
Procesador Core i3 4gb ram
500gb HDD, intelGraphics
4 USB, Botones Pinball laterales
+ 80 consolas
+ 19.000 juegos 
PS2, PSP, Windows 3d, Xbox, GameCube, Sega Model 2- Model 3, N64, 3DS, Dreamcast, Naomi
Compatible con Joysticks, volantes de diferentes marcas, mouse, teclados.', cat.id, 'arcade', true, 380000.00, 30, '["/vinilos/bigbox/atari2.jpg"]'::jsonb, false, true, 0, '{"source": "ventas_excel", "format": "consola portable", "brain": "Pc i3 4ta 500hdd", "has_variants": true, "led_enabled": true, "led_surcharge": 45000.0, "players_count": 2, "joysticks_count": 2, "buttons_per_player": 10, "production_days_with_printed_vinyl": 1, "production_days_without_printed_vinyl": {"min": 7, "max": 10}, "vinyl_folder": "bigbox", "families": [], "bom": []}' from cat on conflict (slug) do update set name = excluded.name, short_description = excluded.short_description, description = excluded.description, category_id = excluded.category_id, product_type = excluded.product_type, requires_production = excluded.requires_production, base_price = excluded.base_price, retail_markup_pct = excluded.retail_markup_pct, images = excluded.images, meta_description = excluded.meta_description, is_active = true, updated_at = now() returning id) insert into public.product_variants (product_id, cabinet_type, screen_size, price_modifier, is_active, sort_order) select id, 'horizontal', null, 0, true, 0 from upserted;
update public.products set meta_description = (meta_description::jsonb || jsonb_build_object('vinyl_supply_ids', coalesce((select jsonb_agg(id) from public.supply_inventory where supply_type = 'vinyl' and color_label = 'bigbox'), '[]'::jsonb)))::text where slug = {sql_literal(product['slug'])};
with cat as (select id from public.categories where slug = 'pedestales'), upserted as (insert into public.products (slug, name, short_description, description, category_id, product_type, requires_production, base_price, retail_markup_pct, images, is_featured, is_active, sort_order, meta_description) select 'pedestal-quad', 'Pedestal Quad', 'Procesador Intel, 2gb ram, 320 GB HDD
USB para joysticks, teclado, mouse
Botones laterales para Pinball
Salida HDMI 
+20.000 juegos
+60 consolas', 'Procesador Intel, 2gb ram, 320 GB HDD
USB para joysticks, teclado, mouse
Botones laterales para Pinball
Salida HDMI 
+20.000 juegos
+60 consolas', cat.id, 'arcade', true, 475000.00, 30, '["/vinilos/Pedestal Quad/argentina.jfif"]'::jsonb, false, true, 0, '{"source": "ventas_excel", "format": "Pedestal", "brain": "intel n2807 320hdd", "has_variants": true, "led_enabled": true, "led_surcharge": 80000.0, "players_count": 4, "joysticks_count": 4, "buttons_per_player": 8, "production_days_with_printed_vinyl": 3, "production_days_without_printed_vinyl": {"min": 7, "max": 10}, "vinyl_folder": "Pedestal Quad", "families": [], "bom": []}' from cat on conflict (slug) do update set name = excluded.name, short_description = excluded.short_description, description = excluded.description, category_id = excluded.category_id, product_type = excluded.product_type, requires_production = excluded.requires_production, base_price = excluded.base_price, retail_markup_pct = excluded.retail_markup_pct, images = excluded.images, meta_description = excluded.meta_description, is_active = true, updated_at = now() returning id) insert into public.product_variants (product_id, cabinet_type, screen_size, price_modifier, is_active, sort_order) select id, 'pedestal', null, 0, true, 0 from upserted;
update public.products set meta_description = (meta_description::jsonb || jsonb_build_object('vinyl_supply_ids', coalesce((select jsonb_agg(id) from public.supply_inventory where supply_type = 'vinyl' and color_label = 'Pedestal Quad'), '[]'::jsonb)))::text where slug = {sql_literal(product['slug'])};
with cat as (select id from public.categories where slug = 'pedestales'), upserted as (insert into public.products (slug, name, short_description, description, category_id, product_type, requires_production, base_price, retail_markup_pct, images, is_featured, is_active, sort_order, meta_description) select 'pedestal-doble', 'Pedestal Doble', 'Procesador Intel, 2gb ram, 320 GB HDD
USB para joysticks, teclado, mouse
Botones laterales para Pinball
Salida HDMI 
+20.000 juegos
+60 consolas', 'Procesador Intel, 2gb ram, 320 GB HDD
USB para joysticks, teclado, mouse
Botones laterales para Pinball
Salida HDMI 
+20.000 juegos
+60 consolas', cat.id, 'arcade', true, 285000.00, 30, '["/vinilos/pedestal Doble/argentina.jpg"]'::jsonb, false, true, 0, '{"source": "ventas_excel", "format": "Pedestal", "brain": "intel n2807 320hdd", "has_variants": true, "led_enabled": true, "led_surcharge": 40000.0, "players_count": 2, "joysticks_count": 2, "buttons_per_player": 8, "production_days_with_printed_vinyl": 2, "production_days_without_printed_vinyl": {"min": 7, "max": 10}, "vinyl_folder": "pedestal Doble", "families": [], "bom": []}' from cat on conflict (slug) do update set name = excluded.name, short_description = excluded.short_description, description = excluded.description, category_id = excluded.category_id, product_type = excluded.product_type, requires_production = excluded.requires_production, base_price = excluded.base_price, retail_markup_pct = excluded.retail_markup_pct, images = excluded.images, meta_description = excluded.meta_description, is_active = true, updated_at = now() returning id) insert into public.product_variants (product_id, cabinet_type, screen_size, price_modifier, is_active, sort_order) select id, 'pedestal', null, 0, true, 0 from upserted;
update public.products set meta_description = (meta_description::jsonb || jsonb_build_object('vinyl_supply_ids', coalesce((select jsonb_agg(id) from public.supply_inventory where supply_type = 'vinyl' and color_label = 'pedestal Doble'), '[]'::jsonb)))::text where slug = {sql_literal(product['slug'])};
with cat as (select id from public.categories where slug = 'consolas'), upserted as (insert into public.products (slug, name, short_description, description, category_id, product_type, requires_production, base_price, retail_markup_pct, images, is_featured, is_active, sort_order, meta_description) select 'modular', 'Modular', 'Procesador Intel, 2gb, 320gb HDD, WiFi
Monitor Hd 19" 
Parlantes Stereo
Caracteristica principal: 3 modulos independientes: 1 Consola doble comando, 2 Pedestal,', 'Procesador Intel, 2gb, 320gb HDD, WiFi
Monitor Hd 19" 
Parlantes Stereo
Caracteristica principal: 3 modulos independientes: 1 Consola doble comando, 2 Pedestal, 3 Bartop  
+20.000 juegos 
+ 60 Consolas
USB para joysticks, mouse, teclado
Pinball Fx con Botones Laterales', cat.id, 'arcade', true, 550000.00, 30, '["/vinilos/modular/kingoffighter.jpg"]'::jsonb, false, true, 0, '{"source": "ventas_excel", "format": "Modular", "brain": "intel n2807 320hdd", "has_variants": true, "led_enabled": false, "led_surcharge": 40000.0, "players_count": 2, "joysticks_count": 2, "buttons_per_player": 8, "production_days_with_printed_vinyl": null, "production_days_without_printed_vinyl": {"min": 7, "max": 10}, "vinyl_folder": "modular", "families": [], "bom": []}' from cat on conflict (slug) do update set name = excluded.name, short_description = excluded.short_description, description = excluded.description, category_id = excluded.category_id, product_type = excluded.product_type, requires_production = excluded.requires_production, base_price = excluded.base_price, retail_markup_pct = excluded.retail_markup_pct, images = excluded.images, meta_description = excluded.meta_description, is_active = true, updated_at = now() returning id) insert into public.product_variants (product_id, cabinet_type, screen_size, price_modifier, is_active, sort_order) select id, 'horizontal', null, 0, true, 0 from upserted;
update public.products set meta_description = (meta_description::jsonb || jsonb_build_object('vinyl_supply_ids', coalesce((select jsonb_agg(id) from public.supply_inventory where supply_type = 'vinyl' and color_label = 'modular'), '[]'::jsonb)))::text where slug = {sql_literal(product['slug'])};

commit;
