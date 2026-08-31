from __future__ import annotations

from import_ventas_to_supabase import SupabaseRest, load_env


COLOR_ALIASES = [
    (("negro", "negra", "black"), "#111111", "Negro"),
    (("blanco", "blanca", "white"), "#ffffff", "Blanco"),
    (("rojo", "roja", "red"), "#ef4444", "Rojo"),
    (("azul", "blue"), "#2563eb", "Azul"),
    (("verde", "green"), "#16a34a", "Verde"),
    (("amarillo", "amarilla", "yellow"), "#facc15", "Amarillo"),
    (("naranja", "orange"), "#f97316", "Naranja"),
    (("rosa", "pink"), "#ec4899", "Rosa"),
    (("violeta", "purple"), "#8b5cf6", "Violeta"),
    (("gris", "grey", "gray"), "#6b7280", "Gris"),
]


def infer_color(name: str, current_label: str | None) -> tuple[str | None, str | None]:
    text = f"{name} {current_label or ''}".lower()

    for aliases, hex_value, label in COLOR_ALIASES:
        if any(alias in text for alias in aliases):
            return hex_value, label

    if "led" in text:
        return "#00d5ff", "LED"

    return None, current_label


def clean_name(name: str) -> str:
    return (
        name
        .replace("Bot�n", "Botón")
        .replace("bot�n", "botón")
        .replace("Boton", "Botón")
        .replace("boton", "botón")
    )


def main() -> None:
    env = load_env()
    client = SupabaseRest(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
    rows = client.request(
        "GET",
        "supply_inventory",
        query={
            "select": "id,name,supply_type,color,color_label,quantity",
            "supply_type": "in.(button,joystick)",
            "order": "supply_type.asc,name.asc",
        },
    )

    updated = 0
    for row in rows:
        color, label = infer_color(row["name"], row.get("color_label"))
        if not color and not label:
            continue
        payload = {
            "name": clean_name(row["name"]),
            "color": color,
            "color_label": label,
        }
        if (
            row.get("name") == payload["name"]
            and row.get("color") == payload["color"]
            and row.get("color_label") == payload["color_label"]
        ):
            continue
        client.patch(
            "supply_inventory",
            payload,
            query={"id": f"eq.{row['id']}"},
        )
        updated += 1
        print(f"{row['supply_type']}\t{row['name']}\t=>\t{payload['color_label']}\t{payload['color']}")

    print(f"Actualizados: {updated}")


if __name__ == "__main__":
    main()
