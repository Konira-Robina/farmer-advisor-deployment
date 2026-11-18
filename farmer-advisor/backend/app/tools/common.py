from app.db import profiles

CROP_ALIASES = {
    "bean": "beans",
    "common beans": "beans",
    "kidney beans": "beans",
    "corn": "maize",
    "bananas": "banana",
    "matooke": "banana",
    "plantain": "banana",
    "cassava roots": "cassava",
    "manioc": "cassava",
}


class ToolInputError(Exception):
    """Raised when a tool cannot run because of missing or invalid input."""


def normalise_crop(name: str) -> str:
    key = " ".join(name.strip().lower().split())
    return CROP_ALIASES.get(key, key)


def resolve_location(user_id: str, latitude: float | None, longitude: float | None) -> tuple[float, float]:
    """Use explicit coordinates if both are given, otherwise the farmer's saved farm location."""
    if (latitude is None) != (longitude is None):
        raise ToolInputError("Give both latitude and longitude, or neither.")
    if latitude is not None and longitude is not None:
        return latitude, longitude
    profile = profiles.get_profile(user_id)
    if profile and profile["latitude"] is not None and profile["longitude"] is not None:
        return profile["latitude"], profile["longitude"]
    raise ToolInputError(
        "The farm location is not set. Ask the farmer to set their farm on the map or tell you the nearest town."
    )
