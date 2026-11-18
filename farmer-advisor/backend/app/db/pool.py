from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.config import get_settings

_pool: ConnectionPool | None = None


def open_pool() -> ConnectionPool:
    """Create and open the shared connection pool."""
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=get_settings().database_url,
            min_size=1,
            max_size=10,
            kwargs={"autocommit": True, "row_factory": dict_row},
            open=False,
        )
        _pool.open()
    return _pool


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def get_pool() -> ConnectionPool:
    if _pool is None:
        raise RuntimeError("Database pool is not open.")
    return _pool


def database_is_up() -> bool:
    """Return True if a simple query succeeds."""
    try:
        with get_pool().connection(timeout=2) as conn:
            conn.execute("SELECT 1")
        return True
    except Exception:
        return False
