-- ============================================================
-- FÁBRICA DE ARCADES — Supabase Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- USER PROFILES (extends auth.users)
-- ============================================================
create table public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text not null default 'cliente' check (role in ('admin', 'fabricante', 'distribuidor', 'cliente')),
  full_name text,
  phone text,
  company_name text,
  distributor_approved boolean not null default false,
  distributor_requested boolean not null default false,
  current_account_enabled boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  is_first_user boolean;
begin
  select count(*) = 0 into is_first_user from public.user_profiles;

  insert into public.user_profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    case when is_first_user then 'admin' else 'cliente' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.categories (name, slug, icon, sort_order) values
  ('Arcades', 'arcades', '🕹️', 1),
  ('Pedestales', 'pedestales', '🎮', 2),
  ('Bundles', 'bundles', '📦', 3),
  ('Accesorios', 'accesorios', '🔧', 4),
  ('Componentes', 'componentes', '⚡', 5);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  short_description text,
  description text,
  category_id uuid references public.categories(id),
  product_type text not null default 'arcade' check (product_type in ('arcade', 'accessory', 'bundle')),
  requires_production boolean not null default true,
  base_price numeric(12, 2) not null default 0, -- precio distribuidor
  retail_markup_pct numeric(5, 2) not null default 30, -- % adicional cliente final
  images jsonb not null default '[]'::jsonb,     -- array de URLs
  video_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  meta_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PRODUCT VARIANTS (personalizaciones configurables)
-- ============================================================
create table public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade not null,
  cabinet_type text check (cabinet_type in ('vertical', 'horizontal', 'bartop', 'pedestal', 'cocktail')),
  screen_size text,  -- e.g. '19"', '22"', '27"'
  price_modifier numeric(12, 2) not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PRODUCT BUNDLES (combos: consola + pedestal, etc.)
-- ============================================================
create table public.product_bundles (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade not null,
  component_product_id uuid references public.products(id) not null,
  quantity int not null default 1,
  notes text
);

-- ============================================================
-- SUPPLY INVENTORY (insumos: palancas, botones, vinilos, LEDs)
-- ============================================================
create table public.supply_inventory (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  supply_type text not null check (supply_type in ('button', 'joystick', 'vinyl', 'led', 'other')),
  color text,           -- hex o nombre de color
  color_label text,     -- "Rojo", "Azul", etc.
  image_url text,       -- imagen del insumo
  quantity int not null default 0,
  configuration jsonb not null default '{}'::jsonb,
  unit text not null default 'unidad',
  low_stock_threshold int not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- STOCK ITEMS (stock de producto terminado / impreso / diseñado)
-- ============================================================
create table public.stock_items (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade not null,
  variant_id uuid references public.product_variants(id) on delete set null,
  vinyl_supply_id uuid references public.supply_inventory(id) on delete set null,
  stock_type text not null check (stock_type in ('immediate', 'printed', 'designed')),
  -- immediate = listo para entregar
  -- printed   = vinilo impreso, armar en ~24 hs hábiles
  -- designed  = solo diseño, imprimir y armar, ~7 días hábiles
  quantity int not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- DELIVERY CONFIG (configurable por admin)
-- ============================================================
create table public.delivery_config (
  key text primary key,
  value text not null,
  label text,
  updated_at timestamptz not null default now()
);

insert into public.delivery_config (key, value, label) values
  ('printed_business_hours', '24', 'Horas hábiles para stock impreso'),
  ('designed_business_days', '7', 'Días hábiles para stock diseñado'),
  ('cash_discount_pct', '0', '% descuento por pago en efectivo'),
  ('transfer_discount_pct', '5', '% descuento por transferencia'),
  ('card_surcharge_pct', '7', '% recargo por tarjeta de crédito');

-- ============================================================
-- ORDERS
-- ============================================================
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique default 'ARC-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6),
  user_id uuid references auth.users(id) on delete set null,
  -- Snapshot del cliente al momento del pedido
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_role_snapshot text not null default 'cliente',
  -- Estado del pedido
  status text not null default 'pending_confirmation'
    check (status in (
      'pending_confirmation',  -- esperando confirmación de pago
      'confirmed',             -- pago confirmado
      'in_production',         -- en producción
      'ready',                 -- listo para despacho/entrega
      'dispatched',            -- despachado
      'delivered',             -- entregado
      'cancelled'              -- cancelado
    )),
  -- Pago
  payment_method text check (payment_method in ('cash', 'transfer', 'card', 'pending', 'current_account')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'refunded')),
  payment_reference text,   -- número de transferencia, comprobante, etc.
  -- Precios
  subtotal numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  payment_surcharge_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  -- Envío / entrega
  shipping_address jsonb,   -- {street, city, province, zip, notes}
  estimated_delivery_date date,
  notes text,
  admin_notes text,
  reservation_status text not null default 'active' check (reservation_status in ('active', 'committed', 'released', 'expired')),
  reservation_expires_at timestamptz,
  cancellation_resolution text check (cancellation_resolution is null or cancellation_resolution in ('pending', 'restock', 'disassemble')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete restrict not null,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity int not null default 1,
  unit_price numeric(12, 2) not null,   -- precio efectivo pagado
  subtotal numeric(12, 2) not null,
  stock_type_at_purchase text check (stock_type_at_purchase in ('immediate', 'printed', 'designed', 'none')),
  -- Personalización seleccionada
  customization jsonb not null default '{}'::jsonb,
  fulfillment_type text not null default 'custom' check (fulfillment_type in ('ready_stock', 'custom')),
  stock_item_id uuid references public.stock_items(id) on delete restrict,
  reservation_status text not null default 'active' check (reservation_status in ('active', 'committed', 'released', 'expired')),
  -- {
  --   "cabinet_type": "bartop",
  --   "screen_size": "22\"",
  --   "joystick_supply_id": "uuid",
  --   "joystick_color": "#FF0000",
  --   "button_count": 8,
  --   "button_supply_ids": ["uuid1", "uuid2"],
  --   "button_colors": ["#FF0000", "#00FF00"],
  --   "led_supply_id": "uuid",
  --   "led_color": "#00FFFF",
  --   "vinyl_supply_id": "uuid"
  -- }
  created_at timestamptz not null default now()
);

-- ============================================================
-- PRODUCTION QUEUE
-- ============================================================
create table public.production_queue (
  id uuid primary key default uuid_generate_v4(),
  order_item_id uuid references public.order_items(id) on delete cascade not null,
  order_id uuid references public.orders(id) on delete cascade not null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'finished', 'dispatched')),
  priority int not null default 5,  -- 1=alta, 10=baja
  assigned_to uuid references auth.users(id) on delete set null,
  notes text,
  -- Snapshots para la cola
  product_name text not null,
  customization_summary text,
  -- Timestamps de estado
  started_at timestamptz,
  finished_at timestamptz,
  dispatched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_reservations (
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

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in (
    'new_order',
    'order_confirmed',
    'production_started',
    'production_finished',
    'order_dispatched',
    'order_delivered',
    'distributor_approved',
    'low_stock',
    'stock_alert'
  )),
  title text not null,
  body text not null,
  is_read boolean not null default false,
  related_order_id uuid references public.orders(id) on delete set null,
  related_production_id uuid references public.production_queue(id) on delete set null,
  action_url text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PRICING CONFIG
-- ============================================================
create table public.pricing_config (
  key text primary key,
  value jsonb not null,
  label text,
  updated_at timestamptz not null default now()
);

insert into public.pricing_config (key, value, label) values
  ('default_retail_markup_pct', '30', 'Margen por defecto para cliente final (%)'),
  ('allow_guest_prices', 'false', 'Mostrar precios a usuarios no logueados');

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_products_category on public.products(category_id);
create index idx_products_active on public.products(is_active);
create index idx_products_featured on public.products(is_featured);
create index idx_stock_items_product on public.stock_items(product_id);
create index idx_orders_user on public.orders(user_id);
create index idx_orders_status on public.orders(status);
create index idx_production_queue_status on public.production_queue(status);
create index idx_notifications_user_unread on public.notifications(user_id, is_read);
create index idx_supply_inventory_type on public.supply_inventory(supply_type);
create index idx_inventory_reservations_order on public.inventory_reservations(order_id);
create index idx_inventory_reservations_expiry on public.inventory_reservations(expires_at)
  where status = 'active' and expires_at is not null;
create unique index idx_production_queue_order_item_unique on public.production_queue(order_item_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.user_profiles enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_bundles enable row level security;
alter table public.supply_inventory enable row level security;
alter table public.stock_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.production_queue enable row level security;
alter table public.notifications enable row level security;
alter table public.delivery_config enable row level security;
alter table public.pricing_config enable row level security;
alter table public.inventory_reservations enable row level security;

-- Helper: get current user role
create or replace function public.get_user_role()
returns text language sql security definer stable as $$
  select role from public.user_profiles where id = auth.uid()
$$;

-- Helper: is admin or fabricante
create or replace function public.is_staff()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select role in ('admin', 'fabricante') from public.user_profiles where id = auth.uid()),
    false
  )
$$;

-- USER PROFILES policies
create policy "Users can read own profile"
  on public.user_profiles for select using (id = auth.uid());
create policy "Users can update own profile"
  on public.user_profiles for update using (id = auth.uid());
create policy "Admins can read all profiles"
  on public.user_profiles for select using (public.get_user_role() = 'admin');
create policy "Admins can update all profiles"
  on public.user_profiles for update using (public.get_user_role() = 'admin');

-- PRODUCTS policies
create policy "Anyone can read active products"
  on public.products for select using (is_active = true);
create policy "Admins can manage products"
  on public.products for all using (public.get_user_role() = 'admin');

-- CATEGORIES policies
create policy "Anyone can read active categories"
  on public.categories for select using (is_active = true);
create policy "Admins can manage categories"
  on public.categories for all using (public.get_user_role() = 'admin');

-- PRODUCT VARIANTS policies
create policy "Anyone can read variants of active products"
  on public.product_variants for select using (
    exists (select 1 from public.products where id = product_id and is_active = true)
  );
create policy "Admins can manage variants"
  on public.product_variants for all using (public.get_user_role() = 'admin');

-- STOCK policies
create policy "Anyone can read stock"
  on public.stock_items for select using (true);
create policy "Admins can manage stock"
  on public.stock_items for all using (public.get_user_role() = 'admin');

-- SUPPLY INVENTORY policies
create policy "Staff can read supply inventory"
  on public.supply_inventory for select using (public.is_staff());
create policy "Admins can manage supply inventory"
  on public.supply_inventory for all using (public.get_user_role() = 'admin');
create policy "Customers can read active supplies for customization"
  on public.supply_inventory for select using (is_active = true and quantity > 0);

-- ORDERS policies
create policy "Users can read own orders"
  on public.orders for select using (user_id = auth.uid());
create policy "Users can insert own orders"
  on public.orders for insert with check (user_id = auth.uid());
create policy "Admins can manage all orders"
  on public.orders for all using (public.get_user_role() = 'admin');
create policy "Fabricantes can read all orders"
  on public.orders for select using (public.get_user_role() in ('admin', 'fabricante'));

-- ORDER ITEMS policies
create policy "Users can read own order items"
  on public.order_items for select using (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );
create policy "Admins can manage order items"
  on public.order_items for all using (public.get_user_role() = 'admin');
create policy "Fabricantes can read order items"
  on public.order_items for select using (public.is_staff());

-- PRODUCTION QUEUE policies
create policy "Staff can read production queue"
  on public.production_queue for select using (public.is_staff());
create policy "Staff can update production queue"
  on public.production_queue for update using (public.is_staff());
create policy "Admins can manage production queue"
  on public.production_queue for all using (public.get_user_role() = 'admin');

-- NOTIFICATIONS policies
create policy "Users can read own notifications"
  on public.notifications for select using (user_id = auth.uid());
create policy "Users can update own notifications (mark read)"
  on public.notifications for update using (user_id = auth.uid());
create policy "Admins can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (public.get_user_role() = 'admin');

create policy "Admins can read inventory reservations"
  on public.inventory_reservations for select
  to authenticated
  using (public.get_user_role() = 'admin');

-- DELIVERY CONFIG policies
create policy "Anyone can read delivery config"
  on public.delivery_config for select using (true);
create policy "Admins can manage delivery config"
  on public.delivery_config for all using (public.get_user_role() = 'admin');

-- PRICING CONFIG policies
create policy "Admins can manage pricing config"
  on public.pricing_config for all using (public.get_user_role() = 'admin');

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.user_profiles
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.orders
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.production_queue
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.supply_inventory
  for each row execute function public.handle_updated_at();

-- Get effective price for a product based on user role
create or replace function public.get_product_price(
  p_product_id uuid,
  p_user_role text default 'cliente'
)
returns numeric language plpgsql security definer as $$
declare
  v_base_price numeric;
  v_markup_pct numeric;
begin
  select base_price, retail_markup_pct
  into v_base_price, v_markup_pct
  from public.products
  where id = p_product_id;

  if p_user_role in ('admin', 'distribuidor') then
    return v_base_price;
  else
    return v_base_price * (1 + v_markup_pct / 100);
  end if;
end;
$$;

-- Get stock availability summary for a product
create or replace function public.get_stock_summary(p_product_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_immediate int;
  v_printed int;
  v_designed int;
begin
  select coalesce(sum(quantity), 0) into v_immediate
  from public.stock_items
  where product_id = p_product_id and stock_type = 'immediate';

  select coalesce(sum(quantity), 0) into v_printed
  from public.stock_items
  where product_id = p_product_id and stock_type = 'printed';

  select coalesce(sum(quantity), 0) into v_designed
  from public.stock_items
  where product_id = p_product_id and stock_type = 'designed';

  return jsonb_build_object(
    'immediate', v_immediate,
    'printed', v_printed,
    'designed', v_designed,
    'total', v_immediate + v_printed + v_designed,
    'availability',
      case
        when v_immediate > 0 then 'immediate'
        when v_printed > 0 then 'printed'
        when v_designed > 0 then 'designed'
        else 'none'
      end
  );
end;
$$;
