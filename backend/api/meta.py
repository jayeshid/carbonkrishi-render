"""Metadata endpoints — input ranges, cost rates, references, organic-availability."""

from fastapi import APIRouter

from ..core import constants
from ..core.models import get_bundle
from ..schemas import MetaResponse

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("", response_model=MetaResponse)
def meta() -> MetaResponse:
    bundle = get_bundle()
    return MetaResponse(
        conv_ranges={k: list(v) for k, v in constants.CONV_RANGES.items()},
        org_ranges={k: list(v) for k, v in constants.ORG_RANGES.items()},
        cost_rates=dict(constants.COST_RATES),
        impact_data=dict(constants.IMPACT_DATA),
        sources={k: {"name": v[0], "url": v[1]} for k, v in constants.SOURCES.items()},
        has_organic=bundle.has_organic,
    )
