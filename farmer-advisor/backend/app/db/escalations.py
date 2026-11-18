from app.db.pool import get_pool


def create_escalation(thread_id, user_id, reason: str) -> tuple[dict, bool]:
    """Create an open escalation, or return the existing open one for the thread."""
    with get_pool().connection() as conn:
        existing = conn.execute(
            "SELECT id, reason, status, created_at FROM escalations "
            "WHERE thread_id = %s AND status = 'open'",
            (thread_id,),
        ).fetchone()
        if existing:
            return existing, False
        row = conn.execute(
            "INSERT INTO escalations (thread_id, user_id, reason) VALUES (%s, %s, %s) "
            "RETURNING id, reason, status, created_at",
            (thread_id, user_id, reason),
        ).fetchone()
        return row, True


def list_escalations(status: str | None = None) -> list[dict]:
    sql = (
        "SELECT e.id, e.thread_id, e.reason, e.status, e.created_at, "
        "u.email AS farmer_email, u.full_name AS farmer_name, "
        "p.location_name, p.latitude, p.longitude "
        "FROM escalations e JOIN users u ON u.id = e.user_id "
        "LEFT JOIN farmer_profiles p ON p.user_id = e.user_id "
    )
    params: list = []
    if status:
        sql += "WHERE e.status = %s "
        params.append(status)
    sql += "ORDER BY e.created_at DESC"
    with get_pool().connection() as conn:
        return conn.execute(sql, params).fetchall()


def update_escalation_status(escalation_id, status: str) -> dict | None:
    with get_pool().connection() as conn:
        return conn.execute(
            "UPDATE escalations SET status = %s WHERE id = %s RETURNING id, status",
            (status, escalation_id),
        ).fetchone()
