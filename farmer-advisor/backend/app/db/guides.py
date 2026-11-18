from app.db.pool import get_pool


def to_vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{v:.8f}" for v in values) + "]"


def replace_source_chunks(source: str, rows: list[dict]) -> int:
    """Delete existing chunks for a source and insert the new ones in one transaction."""
    with get_pool().connection() as conn:
        with conn.transaction():
            conn.execute("DELETE FROM guide_chunks WHERE source = %s", (source,))
            for row in rows:
                conn.execute(
                    "INSERT INTO guide_chunks (crop, title, source, content, embedding) "
                    "VALUES (%s, %s, %s, %s, %s::vector)",
                    (row["crop"], row["title"], source, row["content"], to_vector_literal(row["embedding"])),
                )
    return len(rows)


def search_chunks(embedding: list[float], crop: str | None, k: int) -> list[dict]:
    vector = to_vector_literal(embedding)
    with get_pool().connection() as conn:
        return conn.execute(
            "SELECT crop, title, source, content, 1 - (embedding <=> %s::vector) AS score "
            "FROM guide_chunks WHERE embedding IS NOT NULL "
            "AND (%s::text IS NULL OR crop = %s OR crop IS NULL) "
            "ORDER BY embedding <=> %s::vector LIMIT %s",
            (vector, crop, crop, vector, k),
        ).fetchall()
