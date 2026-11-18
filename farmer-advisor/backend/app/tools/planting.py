from datetime import date, timedelta

from langchain.tools import ToolRuntime, tool

from app.agent.context import FarmContext
from app.db import crops
from app.tools.common import ToolInputError, normalise_crop
from app.tools.weather import WeatherError, weather_for_user

PREPARE_FRACTION = 0.5
DRY_WEEK_MM = 5.0
HARVEST_WINDOW_DAYS = 14


def _to_float(value) -> float | None:
    return float(value) if value is not None else None


def advise(crop: dict, rainfall_30d: float, rainfall_next_7d: float, today: date) -> dict:
    """Apply the rainfall rules for a crop and estimate a harvest window."""
    maturity_days = crop["maturity_days"]
    min_rain = _to_float(crop["min_rainfall_30d_mm"])
    ph_min = _to_float(crop["ideal_ph_min"])
    ph_max = _to_float(crop["ideal_ph_max"])
    ideal_ph = [ph_min, ph_max] if ph_min is not None and ph_max is not None else None

    if maturity_days is None or min_rain is None:
        return {
            "crop": crop["name"],
            "status": "insufficient_data",
            "explanation": f"Planting thresholds for {crop['name']} have not been loaded. Use the farming guides instead.",
        }

    notes: list[str] = []
    harvest_window = None

    if rainfall_30d >= min_rain:
        status = "favourable"
        explanation = (
            f"Rainfall over the last 30 days ({rainfall_30d} mm) meets the {min_rain} mm "
            f"this crop needs, so soil moisture is likely adequate."
        )
        start = today + timedelta(days=maturity_days)
        end = start + timedelta(days=HARVEST_WINDOW_DAYS)
        harvest_window = {"from": start.isoformat(), "to": end.isoformat()}
        if rainfall_next_7d < DRY_WEEK_MM:
            notes.append(
                f"Only {rainfall_next_7d} mm of rain is forecast for the next 7 days. "
                "Consider waiting a few days or making sure water is available."
            )
    elif rainfall_30d >= min_rain * PREPARE_FRACTION:
        status = "prepare_land_and_monitor"
        explanation = (
            f"Rainfall over the last 30 days ({rainfall_30d} mm) is below the {min_rain} mm "
            f"this crop needs. Prepare the land and watch the rain before planting."
        )
    else:
        status = "wait"
        explanation = (
            f"Rainfall over the last 30 days ({rainfall_30d} mm) is well below the {min_rain} mm "
            f"this crop needs. Wait for the rains or make sure irrigation is available."
        )

    return {
        "crop": crop["name"],
        "status": status,
        "explanation": explanation,
        "notes": notes,
        "rainfall_last_30_days_mm": rainfall_30d,
        "rainfall_next_7_days_mm": rainfall_next_7d,
        "required_rainfall_30_days_mm": min_rain,
        "expected_harvest_window": harvest_window,
        "days_to_maturity": maturity_days,
        "ideal_soil_ph": ideal_ph,
        "threshold_source": crop["source"],
    }


def planting_advice_for_user(user_id: str, crop_name: str, latitude: float | None, longitude: float | None) -> dict:
    name = normalise_crop(crop_name)
    crop = crops.get_crop(name)
    if crop is None:
        supported = ", ".join(crops.list_crop_names())
        raise ToolInputError(f"'{crop_name}' is not supported. Supported crops: {supported}.")
    weather = weather_for_user(user_id, latitude, longitude)
    return advise(
        crop,
        weather["rainfall_last_30_days_mm"],
        weather["rainfall_next_7_days_mm"],
        date.today(),
    )


@tool
def get_planting_advice(
    runtime: ToolRuntime[FarmContext],
    crop: str,
    latitude: float | None = None,
    longitude: float | None = None,
) -> dict:
    """Check whether recent rainfall suits planting a crop now, with an expected harvest window.
    Uses the farmer's saved farm location unless coordinates are given."""
    try:
        return planting_advice_for_user(runtime.context.user_id, crop, latitude, longitude)
    except (WeatherError, ToolInputError) as exc:
        return {"error": str(exc)}
