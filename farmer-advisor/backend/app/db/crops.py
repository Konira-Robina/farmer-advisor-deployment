from app.db.pool import get_pool


def get_crop(name: str) -> dict | None:
    with get_pool().connection() as conn:
        return conn.execute("SELECT * FROM crops WHERE name = %s", (name,)).fetchone()


def list_crop_names() -> list[str]:
    with get_pool().connection() as conn:
        rows = conn.execute("SELECT name FROM crops ORDER BY name").fetchall()
    return [r["name"] for r in rows]



def upsert_crop(
    name: str,
    maturity_days: int | None,
    min_rainfall_30d_mm: float | None,
    ideal_ph_min: float | None,
    ideal_ph_max: float | None,
    source: str | None,
) -> None:
    with get_pool().connection() as conn:
        conn.execute(
            """
            INSERT INTO crops (
                name, maturity_days, min_rainfall_30d_mm,
                ideal_ph_min, ideal_ph_max, source
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (name) DO UPDATE SET
                maturity_days = COALESCE(EXCLUDED.maturity_days, crops.maturity_days),
                min_rainfall_30d_mm = COALESCE(EXCLUDED.min_rainfall_30d_mm, crops.min_rainfall_30d_mm),
                ideal_ph_min = COALESCE(EXCLUDED.ideal_ph_min, crops.ideal_ph_min),
                ideal_ph_max = COALESCE(EXCLUDED.ideal_ph_max, crops.ideal_ph_max),
                source = COALESCE(EXCLUDED.source, crops.source)
            """,
            (
                name,
                maturity_days,
                min_rainfall_30d_mm,
                ideal_ph_min,
                ideal_ph_max,
                source,
            ),
        )
