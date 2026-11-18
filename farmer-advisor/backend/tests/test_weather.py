from datetime import date, timedelta

import httpx
import pytest

from app.db import profiles
from app.tools import weather
from app.tools.common import ToolInputError
from app.tools.weather import WeatherError, fetch_weather, weather_for_user

TODAY = date(2026, 11, 13)


def build_payload(past_rain=2.0, future_rain=1.0):
    dates = [TODAY + timedelta(days=offset) for offset in range(-30, 7)]
    rain = [past_rain if d < TODAY else future_rain for d in dates]
    return {
        "current": {"time": f"{TODAY.isoformat()}T10:00", "temperature_2m": 24.5, "relative_humidity_2m": 68},
        "daily": {"time": [d.isoformat() for d in dates], "precipitation_sum": rain},
    }


class FakeResponse:
    def __init__(self, payload=None, status_error=False, bad_json=False):
        self._payload = payload
        self._status_error = status_error
        self._bad_json = bad_json

    def raise_for_status(self):
        if self._status_error:
            raise httpx.HTTPStatusError("boom", request=None, response=None)

    def json(self):
        if self._bad_json:
            raise ValueError("not json")
        return self._payload


def patch_get(monkeypatch, response=None, exc=None):
    def fake_get(*args, **kwargs):
        if exc:
            raise exc
        return response

    monkeypatch.setattr(weather.httpx, "get", fake_get)


def test_summary_totals(monkeypatch):
    patch_get(monkeypatch, FakeResponse(build_payload()))
    result = fetch_weather(0.35, 32.58)
    assert result["rainfall_last_30_days_mm"] == 60.0
    assert result["rainfall_next_7_days_mm"] == 7.0
    assert result["current"] == {"temperature_c": 24.5, "humidity_percent": 68}
    assert len(result["daily_forecast"]) == 7
    assert result["daily_forecast"][0]["date"] == TODAY.isoformat()


def test_missing_rain_values_count_as_zero(monkeypatch):
    payload = build_payload()
    payload["daily"]["precipitation_sum"][0] = None
    patch_get(monkeypatch, FakeResponse(payload))
    assert fetch_weather(0.35, 32.58)["rainfall_last_30_days_mm"] == 58.0


@pytest.mark.parametrize("lat,lon", [(91, 0), (-91, 0), (0, 181), (0, -181)])
def test_out_of_range_coordinates(lat, lon):
    with pytest.raises(WeatherError):
        fetch_weather(lat, lon)


@pytest.mark.parametrize(
    "kwargs,message",
    [
        ({"exc": httpx.ConnectTimeout("slow")}, "timed out"),
        ({"response": FakeResponse(status_error=True)}, "unavailable"),
        ({"response": FakeResponse(bad_json=True)}, "unreadable"),
        ({"response": FakeResponse({"hello": "world"})}, "unexpected"),
    ],
)
def test_failures_raise_friendly_errors(monkeypatch, kwargs, message):
    patch_get(monkeypatch, **kwargs)
    with pytest.raises(WeatherError, match=message):
        fetch_weather(0.35, 32.58)


def test_location_comes_from_profile(db, register, monkeypatch):
    user = register()
    profiles.upsert_profile(user["id"], {"latitude": 0.35, "longitude": 32.58})
    seen = {}

    def fake_fetch(lat, lon):
        seen["coords"] = (lat, lon)
        return {"ok": True}

    monkeypatch.setattr(weather, "fetch_weather", fake_fetch)
    assert weather_for_user(user["id"], None, None) == {"ok": True}
    assert seen["coords"] == (0.35, 32.58)


def test_missing_location_raises(db, register):
    user = register()
    with pytest.raises(ToolInputError, match="not set"):
        weather_for_user(user["id"], None, None)


def test_only_one_coordinate_raises(db, register):
    user = register()
    with pytest.raises(ToolInputError, match="both"):
        weather_for_user(user["id"], 0.35, None)
