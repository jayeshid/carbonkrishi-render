"""Input range validators. Returns plain dicts (no Streamlit / no HTML)."""

from __future__ import annotations

from typing import List

from .constants import CONV_RANGES, ORG_RANGES


def validate_conventional(N: float, P: float, K: float, Zn: float) -> List[dict]:
    """Return a list of {nutrient, value, low, high, unit} for any out-of-range input."""
    vals = {"N": N, "P": P, "K": K, "Zn": Zn}
    out = []
    for k, v in vals.items():
        low, high = CONV_RANGES[k]
        if not (low <= v <= high):
            out.append({
                "nutrient": k,
                "value": float(v),
                "low": float(low),
                "high": float(high),
                "unit": "kg/ha",
            })
    return out


def validate_organic(manure: float, compost: float) -> List[dict]:
    vals = {"Manure": manure, "Compost": compost}
    out = []
    for k, v in vals.items():
        low, high = ORG_RANGES[k]
        if not (low <= v <= high):
            out.append({
                "nutrient": k,
                "value": float(v),
                "low": float(low),
                "high": float(high),
                "unit": "kg/ha",
            })
    return out
