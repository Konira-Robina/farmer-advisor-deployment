from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.services.overview import build_overview

router = APIRouter(prefix="/api/farm", tags=["farm"])


@router.get("/overview")
def farm_overview(user: dict = Depends(get_current_user)) -> dict:
    return build_overview(user["id"])
