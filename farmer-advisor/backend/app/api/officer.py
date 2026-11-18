from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import require_roles
from app.api.schemas import EscalationOut, EscalationUpdate, PriceIn, PriceOut
from app.db import crops, escalations, prices
from app.tools.common import normalise_crop

router = APIRouter(prefix="/api", tags=["officer"])

officer_or_admin = require_roles("extension_officer", "admin")


@router.get("/escalations", response_model=list[EscalationOut])
def list_escalations(
    status: str | None = Query(default=None, pattern="^(open|reviewed|closed)$"),
    user: dict = Depends(officer_or_admin),
):
    return escalations.list_escalations(status)


@router.patch("/escalations/{escalation_id}")
def update_escalation(escalation_id: UUID, body: EscalationUpdate, user: dict = Depends(officer_or_admin)):
    row = escalations.update_escalation_status(escalation_id, body.status)
    if row is None:
        raise HTTPException(status_code=404, detail="Escalation not found.")
    return row


@router.post("/admin/prices", response_model=PriceOut, status_code=201)
def add_price(body: PriceIn, user: dict = Depends(officer_or_admin)):
    crop = normalise_crop(body.crop)
    if crops.get_crop(crop) is None:
        raise HTTPException(status_code=422, detail=f"Unknown crop '{body.crop}'.")
    return prices.add_price(crop, body.market.strip(), body.price_ugx_per_kg, body.recorded_on, body.source)
