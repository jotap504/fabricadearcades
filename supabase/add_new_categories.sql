-- Migration to add new categories: Insumos, Repuestos, Electrónica, Informática
insert into public.categories (name, slug, icon, sort_order, is_active) values
  ('Insumos', 'insumos', '📦', 6, true),
  ('Repuestos', 'repuestos', '🔩', 7, true),
  ('Electrónica', 'electronica', '⚡', 8, true),
  ('Informática', 'informatica', '💻', 9, true)
on conflict (slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;
