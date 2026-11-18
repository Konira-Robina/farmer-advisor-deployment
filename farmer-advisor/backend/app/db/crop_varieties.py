
from app.db.pool import get_pool


def create_variety(
    crop_name: str,
    variety_name: str,
    description: str | None = None,
    production_type: str | None = None,
) -> dict:
    """Create a variety belonging to a crop."""
    with get_pool().connection() as conn:
        return conn.execute(
            """
            INSERT INTO crop_varieties (
                crop_name, variety_name, description, production_type
            )
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (crop_name, variety_name) DO UPDATE SET
                description = EXCLUDED.description,
                production_type = EXCLUDED.production_type
            RETURNING *
            """,
            (crop_name, variety_name, description, production_type),
        ).fetchone()


def get_variety(crop_name: str, variety_name: str) -> dict | None:
    """Retrieve a variety by its crop and name."""
    with get_pool().connection() as conn:
        return conn.execute(
            """
            SELECT *
            FROM crop_varieties
            WHERE crop_name = %s AND variety_name = %s
            """,
            (crop_name, variety_name),
        ).fetchone()


def list_varieties(crop_name: str) -> list[dict]:
    """List all varieties belonging to a crop."""
    with get_pool().connection() as conn:
        return conn.execute(
            """
            SELECT *
            FROM crop_varieties
            WHERE crop_name = %s
            ORDER BY variety_name
            """,
            (crop_name,),
        ).fetchall()
