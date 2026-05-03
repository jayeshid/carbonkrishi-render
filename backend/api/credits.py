"""Soil-carbon credit endpoint."""

from fastapi import APIRouter

from ..core.credits import calculate_soc_credits
from ..schemas import CreditsRequest, CreditsResponse

router = APIRouter(prefix="/api/credits", tags=["credits"])


@router.post("/soc", response_model=CreditsResponse)
def soc(req: CreditsRequest) -> CreditsResponse:
    out = calculate_soc_credits(req.manure, req.compost, req.buffer_pct)
    return CreditsResponse(**out)
