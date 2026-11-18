
from app.db.pool import get_pool


def create_source(
    title: str,
    organisation: str | None = None,
    source_type: str | None = None,
    publication_year: int | None = None,
    url: str | None = None,
    verification_status: str = "unverified",
    notes: str | None = None,
) -> dict:
    """Create a new agricultural source."""
    with get_pool().connection() as conn:
        return conn.execute(
            """
            INSERT INTO agricultural_sources (
                title, organisation, source_type, publication_year,
                url, verification_status, notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                title, organisation, source_type, publication_year,
                url, verification_status, notes,
            ),
        ).fetchone()


def get_source(source_id: str) -> dict | None:
    """Retrieve an agricultural source by its ID."""
    with get_pool().connection() as conn:
        return conn.execute(
            "SELECT * FROM agricultural_sources WHERE id = %s",
            (source_id,),
        ).fetchone()


def list_sources() -> list[dict]:
    """List agricultural sources, newest first."""
    with get_pool().connection() as conn:
        return conn.execute(
            """
            SELECT *
            FROM agricultural_sources
            ORDER BY created_at DESC, title
            """
        ).fetchall()
