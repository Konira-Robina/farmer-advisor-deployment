import threading
import time
from datetime import date

from app.db import crops, profiles
from app.tools.planting import advise
from app.tools.weather import WeatherError, fetch_weather

CACHE_SECONDS = 600

_cache: dict[tuple[float, float], tuple[float, dict]] = {}
_lock = threading.Lock()


def clear_weather_cache() -> None:
    with _lock:
        _cache.clear()


def cached_weather(latitude: float, longitude: float) -> dict:
    key = (round(latitude, 2), round(longitude, 2))
    now = time.monotonic()
    with _lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < CACHE_SECONDS:
            return hit[1]
    weather = fetch_weather(latitude, longitude)
    with _lock:
        _cache[key] = (now, weather)
    return weather


def build_overview(user_id) -> dict:
    """Summarise today's weather and the planting status of each crop the farmer grows."""
    profile = profiles.get_profile(user_id) or {}
    latitude = profile.get("latitude")
    longitude = profile.get("longitude")
    crop_names = profile.get("crops") or []

    known = {name: crops.get_crop(name) for name in crop_names}
    supported = [name for name, row in known.items() if row is not None]
    unsupported = [name for name, row in known.items() if row is None]

    result = {
        "has_location": latitude is not None and longitude is not None,
        "location_name": profile.get("location_name"),
        "has_crops": bool(crop_names),
        "weather": None,
        "weather_error": None,
        "crops": [],
        "unsupported_crops": unsupported,
    }
    if not result["has_location"]:
        return result

    try:
        weather = cached_weather(latitude, longitude)
    except WeatherError as exc:
        result["weather_error"] = str(exc)
        return result

    result["weather"] = weather
    today = date.today()
    result["crops"] = [
        advise(
            known[name],
            weather["rainfall_last_30_days_mm"],
            weather["rainfall_next_7_days_mm"],
            today,
        )
        for name in supported
    ]
    return result
