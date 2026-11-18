from typing import Literal

from langchain.tools import ToolRuntime, tool

from app.agent.context import FarmContext
from app.core.config import UGANDA_LAT_RANGE, UGANDA_LON_RANGE
from app.db import profiles
from app.tools.common import ToolInputError, normalise_crop

MAX_CROPS = 10
MAX_CROP_LENGTH = 40
MAX_LOCATION_LENGTH = 120
MAX_FARM_SIZE_ACRES = 10000


def validate_profile_updates(
    location_name: str | None,
    latitude: float | None,
    longitude: float | None,
    farm_size_acres: float | None,
    crops: list[str] | None,
    reading_level: str | None,
) -> dict:
    updates: dict = {}
    if location_name is not None:
        name = location_name.strip()
        if not name or len(name) > MAX_LOCATION_LENGTH:
            raise ToolInputError("The location name is empty or too long.")
        updates["location_name"] = name
    if (latitude is None) != (longitude is None):
        raise ToolInputError("Give both latitude and longitude, or neither.")
    if latitude is not None and longitude is not None:
        if not (UGANDA_LAT_RANGE[0] <= latitude <= UGANDA_LAT_RANGE[1]
                and UGANDA_LON_RANGE[0] <= longitude <= UGANDA_LON_RANGE[1]):
            raise ToolInputError("The coordinates are outside Uganda.")
        updates["latitude"] = latitude
        updates["longitude"] = longitude
    if farm_size_acres is not None:
        if not 0 < farm_size_acres <= MAX_FARM_SIZE_ACRES:
            raise ToolInputError("The farm size must be between 0 and 10000 acres.")
        updates["farm_size_acres"] = farm_size_acres
    if crops is not None:
        cleaned = []
        for crop in crops:
            name = normalise_crop(crop)
            if not name or len(name) > MAX_CROP_LENGTH:
                raise ToolInputError("A crop name is empty or too long.")
            if name not in cleaned:
                cleaned.append(name)
        if len(cleaned) > MAX_CROPS:
            raise ToolInputError("Too many crops. The limit is 10.")
        updates["crops"] = cleaned
    if reading_level is not None:
        updates["reading_level"] = reading_level
    return updates


def save_profile_updates(user_id: str, **kwargs) -> dict:
    updates = validate_profile_updates(**kwargs)
    if not updates:
        raise ToolInputError("Nothing to update.")
    profile = profiles.upsert_profile(user_id, updates)
    return {
        "saved": True,
        "profile": {
            "location_name": profile["location_name"],
            "latitude": profile["latitude"],
            "longitude": profile["longitude"],
            "farm_size_acres": float(profile["farm_size_acres"]) if profile["farm_size_acres"] is not None else None,
            "crops": profile["crops"],
            "reading_level": profile["reading_level"],
        },
    }


@tool
def update_farmer_profile(
    runtime: ToolRuntime[FarmContext],
    location_name: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    farm_size_acres: float | None = None,
    crops: list[str] | None = None,
    reading_level: Literal["simple", "detailed"] | None = None,
) -> dict:
    """Save details the farmer has told you about their farm: place name, coordinates, size in acres, crops grown, or preferred reading level."""
    try:
        return save_profile_updates(
            runtime.context.user_id,
            location_name=location_name,
            latitude=latitude,
            longitude=longitude,
            farm_size_acres=farm_size_acres,
            crops=crops,
            reading_level=reading_level,
        )
    except ToolInputError as exc:
        return {"error": str(exc)}
