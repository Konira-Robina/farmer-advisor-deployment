from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.schemas import ProfileIn, ProfileOut
from app.db import profiles

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _to_out(row: dict | None) -> ProfileOut:
    if not row:
        return ProfileOut()
    return ProfileOut(
        location_name=row["location_name"],
        latitude=row["latitude"],
        longitude=row["longitude"],
        farm_size_acres=float(row["farm_size_acres"]) if row["farm_size_acres"] is not None else None,
        crops=row["crops"] or [],
        language=row["language"],
        reading_level=row["reading_level"],
    )


@router.get("", response_model=ProfileOut)
def read_profile(user: dict = Depends(get_current_user)):
    return _to_out(profiles.get_profile(user["id"]))


@router.put("", response_model=ProfileOut)
def update_profile(body: ProfileIn, user: dict = Depends(get_current_user)):
    updates = body.model_dump(exclude_unset=True, exclude_none=True)
    return _to_out(profiles.upsert_profile(user["id"], updates))
