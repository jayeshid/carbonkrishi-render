"""Soil-organic-carbon (SOC) credit estimator for the CCTS tab."""

from __future__ import annotations

from typing import Dict


def calculate_soc_credits(manure: float, compost: float, buffer_pct: float) -> Dict[str, float]:
    """Estimate soil-carbon-only credit potential from FYM and compost inputs.

    Returns a dict with credits in t CO2-eq/ha and INR value range
    (CCTS price band 600-900 INR/t).
    """
    c_to_co2 = 3.667

    # Stabilised carbon assumptions (dry-matter %, C %, humification)
    fym_dm, fym_c, fym_h = 0.25, 0.25, 0.25
    compost_dm, compost_c, compost_h = 0.55, 0.25, 0.35

    soc_fym_kgc = manure * fym_dm * fym_c * fym_h
    soc_compost_kgc = compost * compost_dm * compost_c * compost_h
    soc_fym_tco2 = (soc_fym_kgc / 1000) * c_to_co2
    soc_compost_tco2 = (soc_compost_kgc / 1000) * c_to_co2

    soc_total_tco2 = soc_fym_tco2 + soc_compost_tco2
    keep = 1 - buffer_pct / 100
    soc_credits_tco2 = soc_total_tco2 * keep
    buffer_withheld_tco2 = soc_total_tco2 - soc_credits_tco2

    return {
        "fym_soc_tco2": float(soc_fym_tco2),
        "compost_soc_tco2": float(soc_compost_tco2),
        "fym_credits_tco2": float(soc_fym_tco2 * keep),
        "compost_credits_tco2": float(soc_compost_tco2 * keep),
        "soc_before_buffer_tco2": float(soc_total_tco2),
        "credits_tco2": float(soc_credits_tco2),
        "buffer_withheld_tco2": float(buffer_withheld_tco2),
        "value_low_inr": float(soc_credits_tco2 * 600),
        "value_high_inr": float(soc_credits_tco2 * 900),
    }
