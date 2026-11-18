import time

import httpx
from langchain.tools import ToolRuntime, tool

from app.agent.context import FarmContext
from app.core.config import get_settings
from app.tools.common import ToolInputError, resolve_location

BASE_URL = "https://api.isda-africa.com"
PROPERTIES = (
    "ph",
    "nitrogen_total",
    "phosphorous_extractable",
    "potassium_extractable",
)
DEPTH = "0-20"
TOKEN_LIFETIME_SECONDS = 50 * 60
REQUEST_TIMEOUT = 30.0

_token = {"value": None, "expires_at": 0.0}


class SoilError(Exception):
    """Raised when soil data cannot be fetched."""


def _login() -> str:
    settings = get_settings()
    if not settings.isda_username or not settings.isda_password:
        raise SoilError("The soil data service is not configured.")
    try:
        response = httpx.post(
            f"{BASE_URL}/login",
            data={"username": settings.isda_username, "password": settings.isda_password},
            timeout=20.0,
        )
        response.raise_for_status()
        token = response.json().get("access_token")
    except (httpx.HTTPError, ValueError) as exc:
        raise SoilError("Could not sign in to the soil data service.") from exc
    if not token:
        raise SoilError("Could not sign in to the soil data service.")
    _token["value"] = token
    _token["expires_at"] = time.time() + TOKEN_LIFETIME_SECONDS
    return token


def _get_token(force_refresh: bool = False) -> str:
    if not force_refresh and _token["value"] and time.time() < _token["expires_at"]:
        return _token["value"]
    return _login()


def _fetch_property(prop: str, latitude: float, longitude: float, token: str) -> tuple[dict | None, str]:
    """Return (result, token). Retries once on timeouts, server errors and expired tokens."""
    for attempt in range(2):
        try:
            response = httpx.get(
                f"{BASE_URL}/isdasoil/v2/soilproperty",
                headers={"Authorization": f"Bearer {token}"},
                params={"lat": latitude, "lon": longitude, "property": prop, "depth": DEPTH},
                timeout=REQUEST_TIMEOUT,
            )
            if response.status_code == 401 and attempt == 0:
                token = _get_token(force_refresh=True)
                continue
            response.raise_for_status()
            entry = response.json()["property"][prop][0]["value"]
            return {"value": entry["value"], "unit": entry["unit"]}, token
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
            if attempt == 0:
                time.sleep(1.0)
                continue
    return None, token


def fetch_soil(latitude: float, longitude: float) -> dict:
    """Fetch pH, nitrogen, phosphorus and potassium estimates for a location."""
    token = _get_token()
    found: dict = {}
    unavailable: list[str] = []
    for prop in PROPERTIES:
        result, token = _fetch_property(prop, latitude, longitude, token)
        if result is None:
            unavailable.append(prop)
        else:
            found[prop] = result
    if not found:
        raise SoilError("Soil data is unavailable for this location right now.")
    return {
        "latitude": latitude,
        "longitude": longitude,
        "depth_cm": DEPTH,
        "properties": found,
        "unavailable": unavailable,
        "note": "These are mapped estimates for the area, not a lab test of the farm's own soil.",
    }


def soil_for_user(user_id: str, latitude: float | None, longitude: float | None) -> dict:
    lat, lon = resolve_location(user_id, latitude, longitude)
    return fetch_soil(lat, lon)


@tool
def get_soil_profile(
    runtime: ToolRuntime[FarmContext],
    latitude: float | None = None,
    longitude: float | None = None,
) -> dict:
    """Get estimated soil pH, nitrogen, phosphorus and potassium for the farm.
    Uses the farmer's saved farm location unless coordinates are given."""
    try:
        return soil_for_user(runtime.context.user_id, latitude, longitude)
    except (SoilError, ToolInputError) as exc:
        return {"error": str(exc)}
