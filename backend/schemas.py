"""Pydantic request/response schemas for the public API."""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ── Common ─────────────────────────────────────────────────────────────────────

class Impacts(BaseModel):
    """Four LCA impact categories (single result)."""
    global_warming: float = Field(..., description="kg CO2-eq")
    freshwater_eutrophication: float = Field(..., description="kg P-eq")
    terrestrial_acidification: float = Field(..., description="kg SO2-eq")
    terrestrial_ecotoxicity: float = Field(..., description="CTUe")

    @classmethod
    def from_tuple(cls, t) -> "Impacts":
        return cls(
            global_warming=float(t[0]),
            freshwater_eutrophication=float(t[1]),
            terrestrial_acidification=float(t[2]),
            terrestrial_ecotoxicity=float(t[3]),
        )


class ValidationItem(BaseModel):
    nutrient: str
    value: float
    low: float
    high: float
    unit: str


# ── Predict ────────────────────────────────────────────────────────────────────

class ConventionalRequest(BaseModel):
    N: float = Field(..., ge=0)
    P: float = Field(..., ge=0)
    K: float = Field(..., ge=0)
    Zn: float = Field(..., ge=0)


class OrganicRequest(BaseModel):
    manure: float = Field(..., ge=0)
    compost: float = Field(..., ge=0)


class PredictResponse(BaseModel):
    impacts: Impacts
    warnings: List[ValidationItem] = []


# ── Blend ──────────────────────────────────────────────────────────────────────

class BlendRequest(BaseModel):
    N: float = Field(..., ge=0)
    P: float = Field(..., ge=0)
    K: float = Field(..., ge=0)
    Zn: float = Field(..., ge=0)
    manure: float = Field(..., ge=0)
    compost: float = Field(..., ge=0)
    alpha: float = Field(..., ge=0.0, le=1.0)


class BlendResponse(BaseModel):
    conventional: Impacts
    organic: Impacts
    blend: Impacts
    cost_conventional_inr: float
    cost_organic_inr: float
    cost_blend_inr: float


# ── Field Emissions ───────────────────────────────────────────────────────────

class EmissionsRequest(BaseModel):
    synthetic_n: float = Field(..., ge=0)
    synthetic_p: float = Field(..., ge=0)
    irrigation: Literal["Fully Flooded", "Alternate Wetting and Drying", "Rainfed"]
    amendment_1: Literal["None", "Farm Yard Manure", "Compost"] = "None"
    amendment_2: Literal["None", "Farm Yard Manure", "Compost"] = "None"


class EmissionsResponse(BaseModel):
    CH4: float
    N2O: float
    NO3: float
    NH3: float
    PO4: float


# ── SOC Credits ───────────────────────────────────────────────────────────────

class CreditsRequest(BaseModel):
    manure: float = Field(..., ge=0)
    compost: float = Field(..., ge=0)
    buffer_pct: float = Field(20.0, ge=0.0, le=100.0)


class CreditsResponse(BaseModel):
    fym_soc_tco2: float
    compost_soc_tco2: float
    fym_credits_tco2: float
    compost_credits_tco2: float
    soc_before_buffer_tco2: float
    credits_tco2: float
    buffer_withheld_tco2: float
    value_low_inr: float
    value_high_inr: float


# ── Inference cards ───────────────────────────────────────────────────────────

class InferenceRequest(BaseModel):
    domain: str
    value: float
    ctx: Optional[dict] = None
    lang: Literal["en", "hi", "te", "mr"] = "en"


class InferenceRef(BaseModel):
    key: str
    name: str
    url: str


class InferenceResponse(BaseModel):
    title: str
    body_html: str
    color: str
    refs: List[InferenceRef] = []


# ── Meta ──────────────────────────────────────────────────────────────────────

class MetaResponse(BaseModel):
    conv_ranges: dict
    org_ranges: dict
    cost_rates: dict
    impact_data: dict
    sources: dict
    has_organic: bool
