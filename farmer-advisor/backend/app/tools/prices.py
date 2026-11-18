from langchain.tools import tool

from app.db import crops, prices
from app.tools.common import normalise_crop


def lookup_prices(crop_name: str, market: str | None = None) -> dict:
    name = normalise_crop(crop_name)
    if crops.get_crop(name) is None:
        supported = ", ".join(crops.list_crop_names())
        return {"error": f"'{crop_name}' is not supported. Supported crops: {supported}."}
    rows = prices.latest_prices(name, market)
    if not rows:
        return {
            "crop": name,
            "prices": [],
            "note": "No price records are available yet. Do not guess prices.",
        }
    return {
        "crop": name,
        "prices": [
            {
                "market": r["market"],
                "price_ugx_per_kg": float(r["price_ugx_per_kg"]),
                "recorded_on": r["recorded_on"].isoformat(),
                "source": r["source"],
            }
            for r in rows
        ],
    }


@tool
def get_market_prices(crop: str, market: str | None = None) -> dict:
    """Get the most recent recorded market prices (UGX per kg) for a crop, optionally for one market."""
    return lookup_prices(crop, market)
