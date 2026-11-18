from datetime import date

import pytest

from app.tools import planting
from app.tools.common import ToolInputError
from app.tools.planting import advise, planting_advice_for_user

TODAY = date(2026, 3, 1)


def crop(**overrides):
    base = {
        "name": "maize",
        "maturity_days": 100,
        "min_rainfall_30d_mm": 80.0,
        "ideal_ph_min": 5.5,
        "ideal_ph_max": 7.0,
        "source": "Test guide",
    }
    base.update(overrides)
    return base


def test_favourable_with_harvest_window():
    result = advise(crop(), 90.0, 40.0, TODAY)
    assert result["status"] == "favourable"
    assert result["expected_harvest_window"] == {"from": "2026-06-09", "to": "2026-06-23"}
    assert result["ideal_soil_ph"] == [5.5, 7.0]
    assert result["notes"] == []


def test_favourable_but_dry_forecast_adds_note():
    result = advise(crop(), 90.0, 2.0, TODAY)
    assert result["status"] == "favourable"
    assert result["notes"]


def test_prepare_when_rain_is_half_or_more():
    result = advise(crop(), 45.0, 30.0, TODAY)
    assert result["status"] == "prepare_land_and_monitor"
    assert result["expected_harvest_window"] is None


def test_wait_when_rain_is_low():
    result = advise(crop(), 10.0, 30.0, TODAY)
    assert result["status"] == "wait"


def test_boundaries():
    assert advise(crop(), 80.0, 40.0, TODAY)["status"] == "favourable"
    assert advise(crop(), 40.0, 40.0, TODAY)["status"] == "prepare_land_and_monitor"
    assert advise(crop(), 39.9, 40.0, TODAY)["status"] == "wait"


def test_missing_thresholds_report_insufficient_data():
    result = advise(crop(maturity_days=None, min_rainfall_30d_mm=None), 90.0, 40.0, TODAY)
    assert result["status"] == "insufficient_data"


def test_missing_ph_gives_none():
    assert advise(crop(ideal_ph_min=None), 90.0, 40.0, TODAY)["ideal_soil_ph"] is None


def test_unsupported_crop(db, register):
    user = register()
    with pytest.raises(ToolInputError, match="not supported"):
        planting_advice_for_user(user["id"], "dragonfruit", 0.35, 32.58)


def test_end_to_end_with_weather(db, register, seed_crops, monkeypatch):
    user = register()
    monkeypatch.setattr(
        planting,
        "weather_for_user",
        lambda uid, lat, lon: {"rainfall_last_30_days_mm": 100.0, "rainfall_next_7_days_mm": 20.0},
    )
    result = planting_advice_for_user(user["id"], "Corn", None, None)
    assert result["crop"] == "maize"
    assert result["status"] == "favourable"
