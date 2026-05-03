"""Blend endpoint — runs both predictors and returns interpolated impacts + cost."""

from fastapi import APIRouter, HTTPException

from ..core.blend import blend, calc_cost
from ..core.predictor import (
    OrganicUnavailableError,
    PredictionError,
    predict_conventional,
    predict_organic,
)
from ..schemas import BlendRequest, BlendResponse, Impacts

router = APIRouter(prefix="/api/blend", tags=["blend"])


@router.post("", response_model=BlendResponse)
def do_blend(req: BlendRequest) -> BlendResponse:
    try:
        conv = predict_conventional(req.N, req.P, req.K, req.Zn)
        org = predict_organic(req.manure, req.compost)
    except OrganicUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except PredictionError as e:
        raise HTTPException(status_code=500, detail=str(e))

    blended = blend(conv, org, req.alpha)
    cost_conv = calc_cost(req.N, req.P, req.K, req.Zn, 0, 0, 0.0)
    cost_org = calc_cost(0, 0, 0, 0, req.manure, req.compost, 1.0)
    cost_blend = calc_cost(req.N, req.P, req.K, req.Zn, req.manure, req.compost, req.alpha)

    return BlendResponse(
        conventional=Impacts.from_tuple(conv),
        organic=Impacts.from_tuple(org),
        blend=Impacts.from_tuple(blended),
        cost_conventional_inr=cost_conv,
        cost_organic_inr=cost_org,
        cost_blend_inr=cost_blend,
    )
