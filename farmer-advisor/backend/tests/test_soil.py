import httpx
import pytest

from app.core.config import get_settings
from app.tools import soil
from app.tools.soil import SoilError, fetch_soil


@pytest.fixture(autouse=True)
def configured(monkeypatch):
    monkeypatch.setattr(get_settings(), "isda_username", "user")
    monkeypatch.setattr(get_settings(), "isda_password", "pass")
    monkeypatch.setattr(soil.time, "sleep", lambda s: None)
    soil._token["value"] = None
    soil._token["expires_at"] = 0.0


class Resp:
    def __init__(self, payload=None, status=200):
        self._payload = payload
        self.status_code = status

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("err", request=None, response=None)

    def json(self):
        return self._payload


def prop_payload(prop, value, unit):
    return {"property": {prop: [{"value": {"value": value, "unit": unit}}]}}


def install(monkeypatch, get_handler, login=None):
    monkeypatch.setattr(soil.httpx, "post", lambda *a, **k: login or Resp({"access_token": "tok"}))
    monkeypatch.setattr(soil.httpx, "get", get_handler)


def test_success(monkeypatch):
    units = {"ph": "pH", "nitrogen_total": "g/kg", "phosphorous_extractable": "mg/kg", "potassium_extractable": "mg/kg"}

    def handler(url, headers, params, timeout):
        assert headers["Authorization"] == "Bearer tok"
        assert params["depth"] == "0-20"
        return Resp(prop_payload(params["property"], 6.1, units[params["property"]]))

    install(monkeypatch, handler)
    result = fetch_soil(0.35, 32.58)
    assert set(result["properties"]) == set(units)
    assert result["properties"]["ph"] == {"value": 6.1, "unit": "pH"}
    assert result["unavailable"] == []


def test_partial_results_are_reported_not_invented(monkeypatch):
    def handler(url, headers, params, timeout):
        if params["property"] == "ph":
            return Resp(prop_payload("ph", 6.1, "pH"))
        return Resp(status=504)

    install(monkeypatch, handler)
    result = fetch_soil(0.35, 32.58)
    assert list(result["properties"]) == ["ph"]
    assert set(result["unavailable"]) == {"nitrogen_total", "phosphorous_extractable", "potassium_extractable"}


def test_all_failures_raise(monkeypatch):
    install(monkeypatch, lambda *a, **k: Resp(status=504))
    with pytest.raises(SoilError, match="unavailable"):
        fetch_soil(0.35, 32.58)


def test_timeout_then_success_retries(monkeypatch):
    calls = {"n": 0}

    def handler(url, headers, params, timeout):
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx.ReadTimeout("slow")
        return Resp(prop_payload(params["property"], 1.0, "u"))

    install(monkeypatch, handler)
    assert "ph" in fetch_soil(0.35, 32.58)["properties"]


def test_expired_token_is_refreshed(monkeypatch):
    seen = []

    def handler(url, headers, params, timeout):
        seen.append(headers["Authorization"])
        if len(seen) == 1:
            return Resp(status=401)
        return Resp(prop_payload(params["property"], 1.0, "u"))

    install(monkeypatch, handler)
    assert fetch_soil(0.35, 32.58)["properties"]


def test_missing_credentials(monkeypatch):
    monkeypatch.setattr(get_settings(), "isda_username", "")
    with pytest.raises(SoilError, match="not configured"):
        fetch_soil(0.35, 32.58)


def test_login_failure(monkeypatch):
    install(monkeypatch, lambda *a, **k: Resp(), login=Resp(status=401))
    with pytest.raises(SoilError, match="sign in"):
        fetch_soil(0.35, 32.58)
