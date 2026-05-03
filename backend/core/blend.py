"""Blend and cost helpers — pure numeric, no ML, no UI."""

from __future__ import annotations

from typing import Sequence, Tuple

import numpy as np

from .constants import COST_RATES


def blend(conv_output: Sequence[float], org_output: Sequence[float], alpha: float) -> Tuple[float, ...]:
    """Linearly interpolate two impact tuples.

    alpha = 0  -> fully conventional
    alpha = 1  -> fully organic
    """
    arr = (1.0 - alpha) * np.asarray(conv_output, dtype=float) + \
          alpha * np.asarray(org_output, dtype=float)
    return tuple(float(x) for x in arr)


def calc_cost(N: float, P: float, K: float, Zn: float,
              manure: float, compost: float, alpha: float) -> float:
    """Per-hectare input cost in INR for a conventional/organic blend."""
    conv_cost = (
        N * COST_RATES["N_synthetic"]
        + P * COST_RATES["P_synthetic"]
        + K * COST_RATES["K_synthetic"]
        + Zn * COST_RATES["Zn_synthetic"]
    )
    org_cost = (
        manure * COST_RATES["Manure"]
        + compost * COST_RATES["Compost"]
    )
    return float((1.0 - alpha) * conv_cost + alpha * org_cost)
