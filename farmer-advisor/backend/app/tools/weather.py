import httpx
from langchain.tools import ToolRuntime, tool

from app.agent.context import FarmContext
from app.tools.common import ToolInputError, resolve_location

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
TIMEOUT_SECONDS = 10.0
PAST_DAYS = 30
FORECAST_DAYS = 7


class WeatherError(Exception):
    """Raised when weather data cannot be fetched or understood."""


def _validate_coordinates(latitude: float, longitude: float) -> None:
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise WeatherError("The coordinates are out of range.")


def _summarise(payload: dict, latitude: float, longitude: float) -> dict:
    try:
        current = payload["current"]
        dates = payload["daily"]["time"]
        rain = payload["daily"]["precipitation_sum"]
        today = current["time"][:10]
        temperature = current["temperature_2m"]
        humidity = current["relative_humidity_2m"]
    except (KeyError, TypeError) as exc:
        raise WeatherError("The weather service returned an unexpected response.") from exc

    past = [r or 0.0 for d, r in zip(dates, rain) if d < today]
    upcoming = [(d, r or 0.0) for d, r in zip(dates, rain) if d >= today][:FORECAST_DAYS]

    if not past:
        raise WeatherError("The weather service returned no rainfall history.")

    return {
        "latitude": latitude,
        "longitude": longitude,
        "current": {
            "temperature_c": temperature,
            "humidity_percent": humidity,
        },
        "rainfall_last_30_days_mm": round(sum(past), 1),
        "rainfall_next_7_days_mm": round(sum(r for _, r in upcoming), 1),
        "daily_forecast": [{"date": d, "rain_mm": round(r, 1)} for d, r in upcoming],
    }


def fetch_weather(latitude: float, longitude: float) -> dict:
    """Fetch current conditions, past 30-day rainfall and the 7-day forecast."""
    _validate_coordinates(latitude, longitude)
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m",
        "daily": "precipitation_sum",
        "past_days": PAST_DAYS,
        "forecast_days": FORECAST_DAYS,
        "timezone": "auto",
    }
    try:
        response = httpx.get(FORECAST_URL, params=params, timeout=TIMEOUT_SECONDS)
        response.raise_for_status()
        payload = response.json()
    except httpx.TimeoutException as exc:
        raise WeatherError("The weather service timed out. Please try again shortly.") from exc
    except httpx.HTTPError as exc:
        raise WeatherError("The weather service is unavailable right now.") from exc
    except ValueError as exc:
        raise WeatherError("The weather service returned unreadable data.") from exc
    return _summarise(payload, latitude, longitude)


def weather_for_user(user_id: str, latitude: float | None, longitude: float | None) -> dict:
    lat, lon = resolve_location(user_id, latitude, longitude)
    return fetch_weather(lat, lon)


@tool
def get_weather(
    runtime: ToolRuntime[FarmContext],
    latitude: float | None = None,
    longitude: float | None = None,
) -> dict:
    """Get current weather, rainfall over the last 30 days and the 7-day rain forecast.
    Uses the farmer's saved farm location unless coordinates are given."""
    try:
        return weather_for_user(runtime.context.user_id, latitude, longitude)
    except (WeatherError, ToolInputError) as exc:
        return {"error": str(exc)}
