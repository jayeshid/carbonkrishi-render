"""Multilingual inference card endpoint."""

from fastapi import APIRouter, HTTPException

from ..core.inference import build_inference_card
from ..schemas import InferenceRef, InferenceRequest, InferenceResponse

router = APIRouter(prefix="/api/inference", tags=["inference"])


@router.post("/card", response_model=InferenceResponse)
def card(req: InferenceRequest) -> InferenceResponse:
    out = build_inference_card(req.domain, req.value, req.ctx, req.lang)
    if out is None:
        raise HTTPException(status_code=400, detail=f"Unknown domain: {req.domain}")
    return InferenceResponse(
        title=out["title"],
        body_html=out["body_html"],
        color=out["color"],
        refs=[InferenceRef(**r) for r in out["refs"]],
    )
