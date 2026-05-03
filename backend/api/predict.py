"""Prediction endpoints (conventional + organic)."""

from fastapi import APIRouter, HTTPException

from ..core.predictor import (
    OrganicUnavailableError,
    PredictionError,
    predict_conventional,
    predict_organic,
)
from ..core.validators import validate_conventional, validate_organic
from ..schemas import (
    ConventionalRequest,
    Impacts,
    OrganicRequest,
    PredictResponse,
    ValidationItem,
)

router = APIRouter(prefix="/api/predict", tags=["predict"])


@router.post("/conventional", response_model=PredictResponse)
def predict_conv(req: ConventionalRequest) -> PredictResponse:
    try:
        out = predict_conventional(req.N, req.P, req.K, req.Zn)
    except PredictionError as e:
        raise HTTPException(status_code=500, detail=str(e))
    warnings = [ValidationItem(**w) for w in validate_conventional(req.N, req.P, req.K, req.Zn)]
    return PredictResponse(impacts=Impacts.from_tuple(out), warnings=warnings)


@router.post("/organic", response_model=PredictResponse)
def predict_org(req: OrganicRequest) -> PredictResponse:
    try:
        out = predict_organic(req.manure, req.compost)
    except OrganicUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except PredictionError as e:
        raise HTTPException(status_code=500, detail=str(e))
    warnings = [ValidationItem(**w) for w in validate_organic(req.manure, req.compost)]
    return PredictResponse(impacts=Impacts.from_tuple(out), warnings=warnings)
