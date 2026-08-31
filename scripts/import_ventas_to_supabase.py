from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import pandas as pd

from build_ventas_import import (
    PRODUCT_FOLDER_MAP,
    ROOT,
    VENTAS,
    VINYL_ROOT,
    cabinet_type_for_format,
    category_for_format,
    product_type_for_format,
    read_days,
    slugify,
    vinyl_name,
)


XLSX = VENTAS / "Lista producto con precio mayorista.xlsx"

FIXED_SUPPLY_FAMILY_NAMES = [
    "Boton 30mm",
    "Boton 30mm Led",
    "Boton 24mm",
    "Palanca Led",
    "Palanca Std",
    "Palanca Americana",
]


def load_env() -> dict[str, str]:
    env = {}
    for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        if not line or line.strip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def clean_text(value: object) -> str:
    return str(value).replace("�", "á").strip()


def build_supply_families(saved_supplies: list[dict]) -> list[dict]:
    def ids_for(predicate) -> list[str]:
        return sorted([row["id"] for row in saved_supplies if predicate(row)])

    def is_led(row: dict) -> bool:
        text = f"{row.get('name') or ''} {row.get('color_label') or ''}".lower()
        return "led" in text

    families = [
        {
            "id": "boton-30mm",
            "name": "Boton 30mm",
            "supply_ids": ids_for(lambda row: row.get("supply_type") == "button" and not is_led(row)),
        },
        {
            "id": "boton-30mm-led",
            "name": "Boton 30mm Led",
            "supply_ids": ids_for(lambda row: row.get("supply_type") == "button" and is_led(row)),
        },
        {"id": "boton-24mm", "name": "Boton 24mm", "supply_ids": []},
        {
            "id": "palanca-led",
            "name": "Palanca Led",
            "supply_ids": ids_for(lambda row: row.get("supply_type") == "joystick" and is_led(row)),
        },
        {
            "id": "palanca-std",
            "name": "Palanca Std",
            "supply_ids": ids_for(lambda row: row.get("supply_type") == "joystick" and not is_led(row)),
        },
        {"id": "palanca-americana", "name": "Palanca Americana", "supply_ids": []},
    ]

    vinyl_folders = sorted(
        [path.name for path in VINYL_ROOT.iterdir() if path.is_dir()],
        key=str.lower,
    )
    for folder in vinyl_folders:
        families.append(
            {
                "id": f"vinilo-{slugify(folder)}",
                "name": f"Vinilo {folder}",
                "supply_ids": ids_for(
                    lambda row, folder=folder: row.get("supply_type") == "vinyl" and row.get("color_label") == folder
                ),
            }
        )
    return families


class SupabaseRest:
    def __init__(self, url: str, key: str) -> None:
        self.base = url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def request(self, method: str, table: str, payload=None, query: dict[str, str] | None = None, prefer: str = "return=representation"):
        url = f"{self.base}/{table}"
        if query:
            url += "?" + urllib.parse.urlencode(query)
        data = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers = {**self.headers, "Prefer": prefer}
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                body = response.read().decode("utf-8")
                return json.loads(body) if body else []
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"{method} {table} failed: {exc.code} {detail}") from exc

    def insert(self, table: str, rows):
        return self.request("POST", table, rows)

    def upsert(self, table: str, rows, conflict: str):
        return self.request(
            "POST",
            table,
            rows,
            query={"on_conflict": conflict},
            prefer="resolution=merge-duplicates,return=representation",
        )

    def patch(self, table: str, payload, query: dict[str, str]):
        return self.request("PATCH", table, payload, query=query)


def main() -> None:
    env = load_env()
    client = SupabaseRest(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
    df = pd.read_excel(XLSX).fillna("")

    categories = {}
    products = []
    for _, row in df.iterrows():
        model = clean_text(row["modelo:"])
        fmt = clean_text(row["formato"])
        cat_name, cat_slug = category_for_format(fmt)
        categories[cat_slug] = cat_name
        with_stock = row["tiempo produccion con  vinilo en stock"]
        with_stock_days = int(with_stock) if str(with_stock).strip() else None
        accepts_led = clean_text(row["acepta opcion palanca y boton led"]).lower() == "si"
        led_surcharge = float(row["Adicional Led"]) if str(row["Adicional Led"]).strip() else 0

        products.append(
            {
                "model": model,
                "slug": slugify(model),
                "description": clean_text(row["descripcion general"]),
                "price": float(row["Precio Mayorista"]),
                "format": fmt,
                "category_slug": cat_slug,
                "product_type": product_type_for_format(fmt),
                "cabinet_type": cabinet_type_for_format(fmt),
                "players_count": int(row["palancas"]) if int(row["palancas"]) > 0 else 1,
                "joysticks_count": int(row["palancas"]),
                "buttons_per_player": int(row["botones x player"]),
                "brain": clean_text(row["Cerebro"]).lower(),
                "has_variants": clean_text(row["variantes"]).lower() == "si",
                "led_enabled": accepts_led,
                "led_surcharge": led_surcharge,
                "with_stock_days": with_stock_days,
                "no_stock_days": read_days(row["tiempo produccion en dias Habiles sin vinilo en stock"]),
                "folder": PRODUCT_FOLDER_MAP.get(model),
            }
        )

    category_rows = [
        {"name": name, "slug": slug, "description": "Catálogo cargado desde planilla de ventas", "sort_order": idx, "is_active": True}
        for idx, (slug, name) in enumerate(sorted(categories.items()), start=1)
    ]
    saved_categories = client.upsert("categories", category_rows, "slug")
    category_ids = {row["slug"]: row["id"] for row in saved_categories}

    base_supplies = [
        {"name": "Palanca estándar", "supply_type": "joystick", "color_label": None, "image_url": None, "quantity": 0, "unit": "unidad", "low_stock_threshold": 5, "is_active": True},
        {"name": "Palanca LED", "supply_type": "joystick", "color_label": "LED", "image_url": None, "quantity": 0, "unit": "unidad", "low_stock_threshold": 5, "is_active": True},
        {"name": "Botón estándar", "supply_type": "button", "color_label": None, "image_url": None, "quantity": 0, "unit": "unidad", "low_stock_threshold": 5, "is_active": True},
        {"name": "Botón LED", "supply_type": "button", "color_label": "LED", "image_url": None, "quantity": 0, "unit": "unidad", "low_stock_threshold": 5, "is_active": True},
    ]
    for brain in sorted({p["brain"] for p in products if p["brain"]}):
        base_supplies.append({"name": f"Cerebro {brain}", "supply_type": "other", "color_label": None, "image_url": None, "quantity": 0, "unit": "unidad", "low_stock_threshold": 5, "is_active": True})

    vinyl_rows = []
    for folder in sorted(set(PRODUCT_FOLDER_MAP.values()), key=str.lower):
        folder_path = VINYL_ROOT / folder
        if not folder_path.exists():
            continue
        for file in sorted(folder_path.iterdir(), key=lambda p: p.name.lower()):
            if not file.is_file():
                continue
            vinyl_rows.append(
                {
                    "name": f"{folder} - {vinyl_name(file)}",
                    "supply_type": "vinyl",
                    "color_label": folder,
                    "image_url": (Path("/vinilos") / folder / file.name).as_posix(),
                    "quantity": 0,
                    "unit": "diseño",
                    "low_stock_threshold": 0,
                    "is_active": True,
                }
            )

    saved_supplies = client.insert("supply_inventory", base_supplies + vinyl_rows)
    client.upsert(
        "pricing_config",
        [
            {
                "key": "supply_families",
                "value": build_supply_families(saved_supplies),
                "label": "Familias de insumos",
            }
        ],
        "key",
    )

    vinyl_ids_by_folder: dict[str, list[str]] = {}
    for row in saved_supplies:
        if row["supply_type"] == "vinyl":
            vinyl_ids_by_folder.setdefault(row["color_label"], []).append(row["id"])

    product_rows = []
    for product in products:
        folder = product["folder"]
        first_image = next((v["image_url"] for v in vinyl_rows if v["color_label"] == folder), None)
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
            "vinyl_folder": folder,
            "vinyl_supply_ids": vinyl_ids_by_folder.get(folder, []),
            "families": [],
            "bom": [],
        }
        product_rows.append(
            {
                "slug": product["slug"],
                "name": product["model"],
                "short_description": product["description"][:160],
                "description": product["description"],
                "category_id": category_ids[product["category_slug"]],
                "product_type": product["product_type"],
                "requires_production": True,
                "base_price": product["price"],
                "retail_markup_pct": 30,
                "images": [first_image] if first_image else [],
                "is_featured": False,
                "is_active": True,
                "sort_order": len(product_rows) + 1,
                "meta_description": json.dumps(meta, ensure_ascii=False),
            }
        )

    saved_products = client.upsert("products", product_rows, "slug")
    product_ids = {row["slug"]: row["id"] for row in saved_products}

    variant_rows = []
    stock_rows = []
    for product in products:
        product_id = product_ids[product["slug"]]
        variant_rows.append(
            {
                "product_id": product_id,
                "cabinet_type": product["cabinet_type"],
                "screen_size": None,
                "price_modifier": 0,
                "is_active": True,
                "sort_order": 0,
            }
        )
        for stock_type in ["immediate", "printed", "designed"]:
            stock_rows.append({"product_id": product_id, "stock_type": stock_type, "quantity": 0})

    client.insert("product_variants", variant_rows)
    client.insert("stock_items", stock_rows)
    print(json.dumps({"categories": len(category_rows), "products": len(product_rows), "supplies": len(base_supplies), "vinyl_designs": len(vinyl_rows), "stock_rows": len(stock_rows)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
