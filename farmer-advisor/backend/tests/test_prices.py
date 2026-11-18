from datetime import date

from app.db import prices
from app.tools.prices import lookup_prices


def test_no_prices_says_so(db, seed_crops):
    result = lookup_prices("maize")
    assert result["prices"] == []
    assert "Do not guess" in result["note"]


def test_unsupported_crop(db, seed_crops):
    assert "not supported" in lookup_prices("dragonfruit")["error"]


def test_latest_first_and_market_filter(db, seed_crops):
    prices.add_price("maize", "Kampala", 1200, date(2026, 11, 1), "Test")
    prices.add_price("maize", "Kampala", 1300, date(2026, 11, 10), "Test")
    prices.add_price("maize", "Gulu", 900, date(2026, 11, 5), "Test")
    result = lookup_prices("corn")
    assert [p["price_ugx_per_kg"] for p in result["prices"]] == [1300.0, 900.0, 1200.0]
    only_gulu = lookup_prices("maize", "gulu")
    assert [p["market"] for p in only_gulu["prices"]] == ["Gulu"]
