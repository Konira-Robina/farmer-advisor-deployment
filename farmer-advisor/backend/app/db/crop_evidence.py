
from app.db.pool import get_pool


def create_evidence(
    crop_name: str,
    source_id: str,
    characteristic: str,
    value_text: str,
    variety_id: str | None = None,
    unit: str | None = None,
    maturity_stage: str | None = None,
    source_page: str | None = None,
    source_excerpt: str | None = None,
    confidence: str = "unreviewed",
    notes: str | None = None,
) -> dict:
    """Store an agricultural claim and its supporting source."""
    with get_pool().connection() as conn:
        return conn.execute(
            """
            INSERT INTO crop_source_evidence (
                crop_name, variety_id, source_id, characteristic,
                value_text, unit, maturity_stage, source_page,
                source_excerpt, confidence, notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                crop_name, variety_id, source_id, characteristic,
                value_text, unit, maturity_stage, source_page,
                source_excerpt, confidence, notes,
            ),
        ).fetchone()


def list_crop_evidence(crop_name: str) -> list[dict]:
    """Retrieve all evidence recorded for a crop."""
    with get_pool().connection() as conn:
        return conn.execute(
            """
            SELECT
                e.*,
                v.variety_name,
                s.title AS source_title,
                s.organisation AS source_organisation,
                s.url AS source_url,
                s.verification_status AS source_verification_status
            FROM crop_source_evidence e
            LEFT JOIN crop_varieties v ON e.variety_id = v.id
            JOIN agricultural_sources s ON e.source_id = s.id
            WHERE e.crop_name = %s
            ORDER BY e.characteristic, s.title
            """,
            (crop_name,),
        ).fetchall()


def list_variety_evidence(variety_id: str) -> list[dict]:
    """Retrieve evidence recorded for one specific variety."""
    with get_pool().connection() as conn:
        return conn.execute(
            """
            SELECT
                e.*,
                s.title AS source_title,
                s.organisation AS source_organisation,
                s.url AS source_url,
                s.verification_status AS source_verification_status
            FROM crop_source_evidence e
            JOIN agricultural_sources s ON e.source_id = s.id
            WHERE e.variety_id = %s
            ORDER BY e.characteristic, s.title
            """,
            (variety_id,),
        ).fetchall()
