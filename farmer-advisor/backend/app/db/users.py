from psycopg.errors import UniqueViolation

from app.db.pool import get_pool


class EmailAlreadyRegistered(Exception):
    """Raised when an email address is already in use."""


def create_user(email: str, password_hash: str, full_name: str | None = None, role: str = "farmer") -> dict:
    try:
        with get_pool().connection() as conn:
            return conn.execute(
                "INSERT INTO users (email, password_hash, full_name, role) "
                "VALUES (%s, %s, %s, %s) RETURNING id, email, full_name, role, created_at",
                (email.lower(), password_hash, full_name, role),
            ).fetchone()
    except UniqueViolation as exc:
        raise EmailAlreadyRegistered(email) from exc


def get_user_by_email(email: str) -> dict | None:
    with get_pool().connection() as conn:
        return conn.execute(
            "SELECT id, email, full_name, role, password_hash FROM users WHERE email = %s",
            (email.lower(),),
        ).fetchone()


def get_user_by_id(user_id) -> dict | None:
    with get_pool().connection() as conn:
        return conn.execute(
            "SELECT id, email, full_name, role FROM users WHERE id = %s",
            (user_id,),
        ).fetchone()
