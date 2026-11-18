from app.db.pool import get_pool

PROFILE_FIELDS = (
    "location_name",
    "latitude",
    "longitude",
    "farm_size_acres",
    "crops",
    "language",
    "reading_level",
)


def get_profile(user_id) -> dict | None:
    with get_pool().connection() as conn:
        return conn.execute(
            "SELECT * FROM farmer_profiles WHERE user_id = %s", (user_id,)
        ).fetchone()


def upsert_profile(user_id, updates: dict) -> dict:
    fields = {k: v for k, v in updates.items() if k in PROFILE_FIELDS}
    columns = list(fields)
    with get_pool().connection() as conn:
        if not columns:
            return conn.execute(
                "INSERT INTO farmer_profiles (user_id) VALUES (%s) "
                "ON CONFLICT (user_id) DO UPDATE SET updated_at = now() RETURNING *",
                (user_id,),
            ).fetchone()
        insert_columns = ", ".join(["user_id"] + columns)
        placeholders = ", ".join(["%s"] * (len(columns) + 1))
        set_clause = ", ".join(f"{c} = EXCLUDED.{c}" for c in columns)
        sql = (
            f"INSERT INTO farmer_profiles ({insert_columns}) VALUES ({placeholders}) "
            f"ON CONFLICT (user_id) DO UPDATE SET {set_clause}, updated_at = now() RETURNING *"
        )
        return conn.execute(sql, [user_id] + [fields[c] for c in columns]).fetchone()
