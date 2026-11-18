from app.db.pool import get_pool


def add_images(message_id, images: list[tuple[str, bytes]]) -> list[dict]:
    rows = []
    with get_pool().connection() as conn:
        for content_type, data in images:
            rows.append(
                conn.execute(
                    "INSERT INTO message_images (message_id, content_type, size_bytes, data) "
                    "VALUES (%s, %s, %s, %s) RETURNING id, message_id",
                    (message_id, content_type, len(data), data),
                ).fetchone()
            )
    return rows


def list_images_for_messages(message_ids: list) -> dict:
    if not message_ids:
        return {}
    with get_pool().connection() as conn:
        rows = conn.execute(
            "SELECT id, message_id FROM message_images WHERE message_id = ANY(%s) ORDER BY created_at",
            (message_ids,),
        ).fetchall()
    grouped: dict = {}
    for row in rows:
        grouped.setdefault(row["message_id"], []).append(row["id"])
    return grouped


def get_image_for_user(image_id, user_id) -> dict | None:
    with get_pool().connection() as conn:
        return conn.execute(
            "SELECT i.content_type, i.data FROM message_images i "
            "JOIN messages m ON m.id = i.message_id JOIN threads t ON t.id = m.thread_id "
            "WHERE i.id = %s AND t.user_id = %s",
            (image_id, user_id),
        ).fetchone()
