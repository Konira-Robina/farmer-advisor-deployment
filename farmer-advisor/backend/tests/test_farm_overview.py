from app.db import profiles
from app.services import overview

WEATHER = {
    "latitude": 0.35,
    "longitude": 32.58,
    "current": {"temperature_c": 25.0, "humidity_percent": 70},
    "rainfall_last_30_days_mm": 100.0,
    "rainfall_next_7_days_mm": 30.0,
    "daily_forecast": [{"date": "2026-11-14", "rain_mm": 4.0}],
}


def test_requires_login(client):
    assert client.get("/api/farm/overview").status_code == 401


def test_no_location(client, farmer):
    body = client.get("/api/farm/overview").json()
    assert body["has_location"] is False and body["weather"] is None and body["crops"] == []


def test_location_without_crops(client, farmer, monkeypatch):
    profiles.upsert_profile(farmer["id"], {"latitude": 0.35, "longitude": 32.58, "location_name": "Wakiso"})
    monkeypatch.setattr(overview, "fetch_weather", lambda lat, lon: WEATHER)
    body = client.get("/api/farm/overview").json()
    assert body["has_location"] and not body["has_crops"]
    assert body["weather"]["rainfall_last_30_days_mm"] == 100.0
    assert body["location_name"] == "Wakiso" and body["crops"] == []


def test_crop_status_and_unsupported_crops(client, farmer, seed_crops, monkeypatch):
    profiles.upsert_profile(
        farmer["id"], {"latitude": 0.35, "longitude": 32.58, "crops": ["maize", "dragonfruit"]}
    )
    monkeypatch.setattr(overview, "fetch_weather", lambda lat, lon: WEATHER)
    body = client.get("/api/farm/overview").json()
    assert [c["crop"] for c in body["crops"]] == ["maize"]
    assert body["crops"][0]["status"] == "favourable"
    assert body["crops"][0]["required_rainfall_30_days_mm"] == 80.0
    assert body["unsupported_crops"] == ["dragonfruit"]


def test_crop_without_loaded_thresholds_reports_insufficient_data(client, farmer, db, monkeypatch):
    profiles.upsert_profile(farmer["id"], {"latitude": 0.35, "longitude": 32.58, "crops": ["cassava"]})
    monkeypatch.setattr(overview, "fetch_weather", lambda lat, lon: WEATHER)
    body = client.get("/api/farm/overview").json()
    assert body["crops"][0]["status"] == "insufficient_data"


def test_weather_is_cached_between_requests(client, farmer, monkeypatch):
    profiles.upsert_profile(farmer["id"], {"latitude": 0.35, "longitude": 32.58})
    calls = []

    def fake(lat, lon):
        calls.append((lat, lon))
        return WEATHER

    monkeypatch.setattr(overview, "fetch_weather", fake)
    client.get("/api/farm/overview")
    client.get("/api/farm/overview")
    assert len(calls) == 1


def test_weather_failure_is_reported_not_raised(client, farmer, monkeypatch):
    from app.tools.weather import WeatherError

    profiles.upsert_profile(farmer["id"], {"latitude": 0.35, "longitude": 32.58, "crops": ["maize"]})

    def boom(lat, lon):
        raise WeatherError("The weather service is unavailable right now.")

    monkeypatch.setattr(overview, "fetch_weather", boom)
    body = client.get("/api/farm/overview").json()
    assert body["weather"] is None and "unavailable" in body["weather_error"] and body["crops"] == []
