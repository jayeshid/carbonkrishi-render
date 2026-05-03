"""Field emissions endpoint."""

from fastapi import APIRouter

from ..core.emissions import compute_field_emissions
from ..schemas import EmissionsRequest, EmissionsResponse

router = APIRouter(prefix="/api/emissions", tags=["emissions"])


@router.post("/field", response_model=EmissionsResponse)
def field(req: EmissionsRequest) -> EmissionsResponse:
    out = compute_field_emissions(
        req.synthetic_n, req.synthetic_p, req.irrigation,
        req.amendment_1, req.amendment_2,
    )
    return EmissionsResponse(**out)
