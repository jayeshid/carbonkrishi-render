"""Field emission estimator (IPCC + SALCA factors).

Pure-python, no ML. Returns a dict for direct JSON serialisation.
"""

from __future__ import annotations

from typing import Dict


_IRRIGATION_FACTORS = {
    "Fully Flooded":               {"ch4": 0.793, "n2o": 0.00471, "nh3_mult": 1.00},
    "Alternate Wetting and Drying": {"ch4": 0.120, "n2o": 0.00550, "nh3_mult": 1.05},
    "Rainfed":                     {"ch4": 0.050, "n2o": 0.00620, "nh3_mult": 1.08},
}


def compute_field_emissions(
    synthetic_n: float,
    synthetic_p: float,
    irrigation: str,
    amendment_1: str,
    amendment_2: str,
) -> Dict[str, float]:
    """Estimate field emissions (kg/ha/season) from fertiliser application.

    Output keys: CH4, N2O, NO3, NH3, PO4.
    """
    factors = _IRRIGATION_FACTORS.get(irrigation, _IRRIGATION_FACTORS["Fully Flooded"])

    ch4 = synthetic_n * factors["ch4"]
    n2o = synthetic_n * factors["n2o"]
    no3 = synthetic_n * 0.03986
    po4 = synthetic_p * 0.03065
    nh3 = synthetic_n * 0.364 * factors["nh3_mult"] + synthetic_p * 0.005

    amendment_count = sum(1 for a in (amendment_1, amendment_2) if a and a != "None")
    if amendment_count > 0:
        n2o *= 0.95
        nh3 *= 1.08
        ch4 *= 1.02

    return {
        "CH4": round(ch4, 3),
        "N2O": round(n2o, 4),
        "NO3": round(no3, 4),
        "NH3": round(nh3, 4),
        "PO4": round(po4, 4),
    }
