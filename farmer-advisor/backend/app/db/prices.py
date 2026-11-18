from datetime import date

from app.db.pool import get_pool


def add_price(crop: str, market: str, price_ugx_per_kg: float, recorded_on: date, source: str | None) -> dict:
    with get_pool().connection() as conn:
        return conn.execute(
            "INSERT INTO market_prices (crop, market, price_ugx_per_kg, recorded_on, source) "
            "VALUES (%s, %s, %s, %s, %s) RETURNING id, crop, market, price_ugx_per_kg, recorded_on",
            (crop, market, price_ugx_per_kg, recorded_on, source),
        ).fetchone()


def latest_prices(crop: str, market: str | None = None, limit: int = 5) -> list[dict]:
    sql = (
        "SELECT crop, market, price_ugx_per_kg, recorded_on, source FROM market_prices "
        "WHERE crop = %s "
    )
    params: list = [crop]
    if market:
        sql += "AND lower(market) = lower(%s) "
        params.append(market)
    sql += "ORDER BY recorded_on DESC, market LIMIT %s"
    params.append(limit)
    with get_pool().connection() as conn:
        return conn.execute(sql, params).fetchall()
