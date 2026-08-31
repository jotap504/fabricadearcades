from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
VENTAS = ROOT / "ventas"
XLSX = VENTAS / "Lista producto con precio mayorista.xlsx"
VINYL_ROOT = VENTAS / "vistas arcade"
PUBLIC_VINYL_ROOT = ROOT / "public" / "vinilos"
OUT = ROOT / "supabase" / "seed_ventas_catalog.sql"


PRODUCT_FOLDER_MAP = {
    "Retrocade Premium 32": "arcade pie",
    "Retrocade Light 32": "arcade pie",
    "Retrotime": "consola 78",
    "Retrotime Plus": "retrotime plus",
    "FightStick 1P": "fightstick 1p",
    "Bartop 19pulgadas": "bartop19",
    "FightBox USB": "fightbox",
    "Bigbox PC": "bigbox",
    "Pedestal Quad": "Pedestal Quad",
    "Pedestal Doble": "pedestal Doble",
    "Modular": "modular",
}


FIXED_SUPPLY_FAMILIES = [
    ("boton-30mm", "Boton 30mm"),
    ("boton-30mm-led", "Boton 30mm Led"),
    ("boton-24mm", "Boton 24mm"),
    ("palanca-led", "Palanca Led"),
    ("palanca-std", "Palanca Std"),
    ("palanca-americana", "Palanca Americana"),
]


def slugify(value: str) -> str:
    value = value.lower().strip()
    replacements = {
        "á": "a",
        "é": "e",
        "í": "i",
        "ó": "o",
        "ú": "u",
        "ñ": "n",
        '"': "",
    }
    for src, dst in replacements.items():
        value = value.replace(src, dst)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"(^-|-$)", "", value)


def sql_literal(value) -> str:
    if value is None:
        return "null"
    if isinstance(value, float) and pd.isna(value):
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def supply_family_seed_sql(vinyl_folders: list[str]) -> str:
    families_sql = [
        "jsonb_build_object('id','boton-30mm','name','Boton 30mm','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='button' and is_active and lower(name) not like '%led%' and coalesce(lower(color_label),'') not like '%led%'), '[]'::jsonb))",
        "jsonb_build_object('id','boton-30mm-led','name','Boton 30mm Led','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='button' and is_active and (lower(name) like '%led%' or coalesce(lower(color_label),'') like '%led%')), '[]'::jsonb))",
        "jsonb_build_object('id','boton-24mm','name','Boton 24mm','supply_ids','[]'::jsonb)",
        "jsonb_build_object('id','palanca-led','name','Palanca Led','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='joystick' and is_active and (lower(name) like '%led%' or coalesce(lower(color_label),'') like '%led%')), '[]'::jsonb))",
        "jsonb_build_object('id','palanca-std','name','Palanca Std','supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory where supply_type='joystick' and is_active and lower(name) not like '%led%' and coalesce(lower(color_label),'') not like '%led%'), '[]'::jsonb))",
        "jsonb_build_object('id','palanca-americana','name','Palanca Americana','supply_ids','[]'::jsonb)",
    ]

    for folder in vinyl_folders:
        families_sql.append(
            "jsonb_build_object("
            f"'id','vinilo-{slugify(folder)}',"
            f"'name',{sql_literal(f'Vinilo {folder}')},"
            "'supply_ids', coalesce((select jsonb_agg(id order by name) from public.supply_inventory "
            f"where supply_type='vinyl' and color_label={sql_literal(folder)}), '[]'::jsonb))"
        )

    return (
        "insert into public.pricing_config (key, value, label, updated_at) values "
        "('supply_families', jsonb_build_array(\n    "
        + ",\n    ".join(families_sql)
        + "\n  ), 'Familias de insumos', now()) "
        "on conflict (key) do update set value = excluded.value, label = excluded.label, updated_at = now();"
    )


def category_for_format(fmt: str) -> tuple[str, str]:
    text = fmt.lower()
    if "fight" in text:
        return "Fightsticks", "fightsticks"
    if "pedestal" in text:
        return "Pedestales", "pedestales"
    if "bartop" in text:
        return "Bartops", "bartops"
    if "portable" in text or "pantalla" in text or "modular" in text:
        return "Consolas", "consolas"
    return "Arcades", "arcades"


def product_type_for_format(fmt: str) -> str:
    text = fmt.lower()
    if "fight" in text:
        return "accessory"
    return "arcade"


def cabinet_type_for_format(fmt: str) -> str:
    text = fmt.lower()
    if "bartop" in text:
        return "bartop"
    if "pedestal" in text:
        return "pedestal"
    if "arcade" in text:
        return "vertical"
    return "horizontal"


def read_days(value) -> dict[str, int | None]:
    if pd.isna(value):
        return {"min": None, "max": None}
    if hasattr(value, "year") and value.year == 2026 and value.month == 10 and value.day == 7:
        return {"min": 7, "max": 10}
    try:
        day = int(value)
        return {"min": day, "max": day}
    except Exception:
        return {"min": None, "max": None}


def vinyl_name(path: Path) -> str:
    return path.stem.replace("_", " ").replace("-", " ").strip().title()


def main() -> None:
    df = pd.read_excel(XLSX).fillna("")
    records = []
    categories = {}

    for _, row in df.iterrows():
        model = str(row["modelo:"]).strip()
        fmt = str(row["formato"]).strip()
        cat_name, cat_slug = category_for_format(fmt)
        categories[cat_slug] = cat_name
        no_stock_days = read_days(row["tiempo produccion en dias Habiles sin vinilo en stock"])
        with_stock = row["tiempo produccion con  vinilo en stock"]
        with_stock_days = int(with_stock) if str(with_stock).strip() else None
        accepts_led = str(row["acepta opcion palanca y boton led"]).strip().lower() == "si"
        led_surcharge = float(row["Adicional Led"]) if str(row["Adicional Led"]).strip() else 0

        records.append(
            {
                "model": model,
                "slug": slugify(model),
                "description": str(row["descripcion general"]).replace("�", "á").strip(),
                "price": float(row["Precio Mayorista"]),
                "format": fmt,
                "category_slug": cat_slug,
                "product_type": product_type_for_format(fmt),
                "cabinet_type": cabinet_type_for_format(fmt),
                "players_count": int(row["palancas"]) if int(row["palancas"]) > 0 else 1,
                "joysticks_count": int(row["palancas"]),
                "buttons_per_player": int(row["botones x player"]),
                "brain": str(row["Cerebro"]).strip(),
                "has_variants": str(row["variantes"]).strip().lower() == "si",
                "led_enabled": accepts_led,
                "led_surcharge": led_surcharge,
                "with_stock_days": with_stock_days,
                "no_stock_days": no_stock_days,
                "folder": PRODUCT_FOLDER_MAP.get(model),
            }
        )

    supply_rows = [
        {"name": "Palanca estándar", "type": "joystick", "color": None, "qty": 0},
        {"name": "Palanca LED", "type": "joystick", "color": "LED", "qty": 0},
        {"name": "Botón estándar", "type": "button", "color": None, "qty": 0},
        {"name": "Botón LED", "type": "button", "color": "LED", "qty": 0},
    ]
    for brain in sorted({r["brain"].lower() for r in records if r["brain"]}):
        supply_rows.append({"name": f"Cerebro {brain}", "type": "other", "color": None, "qty": 0})

    vinyl_rows = []
    vinyl_folders = sorted(
        {path.name for path in VINYL_ROOT.iterdir() if path.is_dir()},
        key=str.lower,
    )
    for folder in vinyl_folders:
        folder_path = VINYL_ROOT / folder
        if not folder_path.exists():
            continue
        for file in sorted(folder_path.iterdir(), key=lambda p: p.name.lower()):
            if not file.is_file():
                continue
            public_path = (Path("/vinilos") / folder / file.name).as_posix()
            vinyl_rows.append(
                {
                    "name": f"{folder} - {vinyl_name(file)}",
                    "folder": folder,
                    "slug": slugify(f"{folder}-{file.stem}"),
                    "image_url": public_path,
                }
            )

    lines = [
        "-- Seed generado desde ventas/Lista producto con precio mayorista.xlsx",
        "begin;",
        "",
    ]
    for slug, name in sorted(categories.items()):
        lines.append(
            "insert into public.categories (name, slug, description, sort_order, is_active) values "
            f"({sql_literal(name)}, {sql_literal(slug)}, {sql_literal('Catálogo cargado desde planilla de ventas')}, 0, true) "
            "on conflict (slug) do update set name = excluded.name, description = excluded.description, is_active = true;"
        )

    lines.append("")
    for item in supply_rows:
        lines.append(
            "insert into public.supply_inventory (name, supply_type, color_label, quantity, unit, low_stock_threshold, is_active) values "
            f"({sql_literal(item['name'])}, {sql_literal(item['type'])}, {sql_literal(item['color'])}, {int(item['qty'])}, 'unidad', 5, true) "
            "on conflict do nothing;"
        )
    for item in vinyl_rows:
        lines.append(
            "insert into public.supply_inventory (name, supply_type, color_label, image_url, quantity, unit, low_stock_threshold, is_active) values "
            f"({sql_literal(item['name'])}, 'vinyl', {sql_literal(item['folder'])}, {sql_literal(item['image_url'])}, 0, 'diseño', 0, true) "
            "on conflict do nothing;"
        )

    lines.append("")
    lines.append(supply_family_seed_sql(vinyl_folders))

    lines.append("")
    for product in records:
        meta = {
            "source": "ventas_excel",
            "format": product["format"],
            "brain": product["brain"],
            "has_variants": product["has_variants"],
            "led_enabled": product["led_enabled"],
            "led_surcharge": product["led_surcharge"],
            "players_count": product["players_count"],
            "joysticks_count": product["joysticks_count"],
            "buttons_per_player": product["buttons_per_player"],
            "production_days_with_printed_vinyl": product["with_stock_days"],
            "production_days_without_printed_vinyl": product["no_stock_days"],
            "vinyl_folder": product["folder"],
            "families": [],
            "bom": [],
        }
        folder = product["folder"]
        first_image = ""
        if folder:
            first = next((v for v in vinyl_rows if v["folder"] == folder), None)
            first_image = first["image_url"] if first else ""
        images = json.dumps([first_image] if first_image else [], ensure_ascii=False)
        lines.append(
            "with cat as (select id from public.categories where slug = "
            f"{sql_literal(product['category_slug'])}), upserted as ("
            "insert into public.products "
            "(slug, name, short_description, description, category_id, product_type, requires_production, base_price, retail_markup_pct, images, is_featured, is_active, sort_order, meta_description) "
            f"select {sql_literal(product['slug'])}, {sql_literal(product['model'])}, {sql_literal(product['description'][:160])}, "
            f"{sql_literal(product['description'])}, cat.id, {sql_literal(product['product_type'])}, true, {product['price']:.2f}, 30, "
            f"{sql_literal(images)}::jsonb, false, true, 0, {sql_literal(json.dumps(meta, ensure_ascii=False))} from cat "
            "on conflict (slug) do update set name = excluded.name, short_description = excluded.short_description, "
            "description = excluded.description, category_id = excluded.category_id, product_type = excluded.product_type, "
            "requires_production = excluded.requires_production, base_price = excluded.base_price, retail_markup_pct = excluded.retail_markup_pct, "
            "images = excluded.images, meta_description = excluded.meta_description, is_active = true, updated_at = now() returning id) "
            "insert into public.product_variants (product_id, cabinet_type, screen_size, price_modifier, is_active, sort_order) "
            f"select id, {sql_literal(product['cabinet_type'])}, null, 0, true, 0 from upserted;"
        )

        if folder:
            lines.append(
                "update public.products set meta_description = (meta_description::jsonb || jsonb_build_object("
                "'vinyl_supply_ids', coalesce((select jsonb_agg(id) from public.supply_inventory "
                f"where supply_type = 'vinyl' and color_label = {sql_literal(folder)}), '[]'::jsonb)"
                "))::text where slug = {sql_literal(product['slug'])};"
            )

    lines.extend(["", "commit;", ""])
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"products": len(records), "vinyl_designs": len(vinyl_rows), "supplies": len(supply_rows), "sql": str(OUT)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
