import pytest

from app.db import profiles
from app.tools.common import ToolInputError
from app.tools.profile import save_profile_updates, validate_profile_updates


def args(**overrides):
    base = dict(location_name=None, latitude=None, longitude=None, farm_size_acres=None, crops=None, reading_level=None)
    base.update(overrides)
    return base


def test_valid_updates_are_cleaned():
    updates = validate_profile_updates(
        **args(location_name="  Wakiso ", latitude=0.4, longitude=32.5, farm_size_acres=2.5,
               crops=["Maize", "bananas", "maize"], reading_level="detailed")
    )
    assert updates == {
        "location_name": "Wakiso",
        "latitude": 0.4,
        "longitude": 32.5,
        "farm_size_acres": 2.5,
        "crops": ["maize", "banana"],
        "reading_level": "detailed",
    }


@pytest.mark.parametrize(
    "overrides,message",
    [
        ({"latitude": 0.4}, "both"),
        ({"latitude": 51.5, "longitude": -0.1}, "outside Uganda"),
        ({"farm_size_acres": 0}, "farm size"),
        ({"farm_size_acres": 20000}, "farm size"),
        ({"location_name": "   "}, "location name"),
        ({"crops": [f"crop{i}" for i in range(11)]}, "Too many"),
        ({"crops": [""]}, "empty"),
    ],
)
def test_invalid_updates(overrides, message):
    with pytest.raises(ToolInputError, match=message):
        validate_profile_updates(**args(**overrides))


def test_save_roundtrip(db, register):
    user = register()
    result = save_profile_updates(user["id"], **args(location_name="Gulu", crops=["beans"]))
    assert result["saved"] is True
    assert profiles.get_profile(user["id"])["crops"] == ["beans"]
    save_profile_updates(user["id"], **args(farm_size_acres=3))
    stored = profiles.get_profile(user["id"])
    assert stored["location_name"] == "Gulu"
    assert float(stored["farm_size_acres"]) == 3.0


def test_nothing_to_update(db, register):
    user = register()
    with pytest.raises(ToolInputError, match="Nothing"):
        save_profile_updates(user["id"], **args())
