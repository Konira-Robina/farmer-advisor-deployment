from app.db.pool import get_pool


def create_thread(user_id, title: str | None) -> dict:
    with get_pool().connection() as conn:
        return conn.execute(
            "INSERT INTO threads (user_id, title) VALUES (%s, %s) RETURNING id, title, created_at",
            (user_id, title),
        ).fetchone()


def get_thread_for_user(thread_id, user_id) -> dict | None:
    with get_pool().connection() as conn:
        return conn.execute(
            "SELECT id, title, created_at FROM threads WHERE id = %s AND user_id = %s",
            (thread_id, user_id),
        ).fetchone()


def list_threads(user_id) -> list[dict]:
    with get_pool().connection() as conn:
        return conn.execute(
            "SELECT id, title, created_at FROM threads WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()


def delete_thread(thread_id, user_id) -> bool:
    with get_pool().connection() as conn:
        cur = conn.execute(
            "DELETE FROM threads WHERE id = %s AND user_id = %s", (thread_id, user_id)
        )
        return cur.rowcount > 0


def add_message(
    thread_id,
    role: str,
    content: str,
    model: str | None = None,
    tokens_in: int | None = None,
    tokens_out: int | None = None,
    cost_usd: float | None = None,
) -> dict:
    with get_pool().connection() as conn:
        return conn.execute(
            "INSERT INTO messages (thread_id, role, content, model, tokens_in, tokens_out, cost_usd) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, role, content, created_at",
            (thread_id, role, content, model, tokens_in, tokens_out, cost_usd),
        ).fetchone()


def list_messages(thread_id, user_id=None) -> list[dict]:
    with get_pool().connection() as conn:
        return conn.execute(
            "SELECT m.id, m.role, m.content, m.created_at, f.rating FROM messages m "
            "LEFT JOIN feedback f ON f.message_id = m.id AND f.user_id = %s "
            "WHERE m.thread_id = %s ORDER BY m.created_at",
            (user_id, thread_id),
        ).fetchall()


def get_message_for_user(message_id, user_id) -> dict | None:
    with get_pool().connection() as conn:
        return conn.execute(
            "SELECT m.id, m.role FROM messages m JOIN threads t ON t.id = m.thread_id "
            "WHERE m.id = %s AND t.user_id = %s",
            (message_id, user_id),
        ).fetchone()


def set_feedback(message_id, user_id, rating: int, comment: str | None) -> dict:
    with get_pool().connection() as conn:
        return conn.execute(
            "INSERT INTO feedback (message_id, user_id, rating, comment) VALUES (%s, %s, %s, %s) "
            "ON CONFLICT (message_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, "
            "comment = EXCLUDED.comment RETURNING id, message_id, rating, comment",
            (message_id, user_id, rating, comment),
        ).fetchone()
