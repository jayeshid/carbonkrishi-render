"""ML prediction wrappers — framework-agnostic.

Differences from the original Streamlit helpers:
- raise ``PredictionError`` instead of calling ``st.error``.
- raise ``OrganicUnavailableError`` if the organic stack failed self-test.
"""

from __future__ import annotations

from typing import Tuple

import pandas as pd

from .models import get_bundle


class PredictionError(RuntimeError):
    """Raised when a prediction call fails."""


class OrganicUnavailableError(RuntimeError):
    """Raised when the organic model is not available."""


Impacts = Tuple[float, float, float, float]


def predict_conventional(N: float, P: float, K: float, Zn: float) -> Impacts:
    """Predict 4 LCA impact categories for a conventional NPK+Zn application.

    Returns (global_warming, freshwater_eutrophication,
             terrestrial_acidification, terrestrial_ecotoxicity).
    """
    bundle = get_bundle()
    try:
        inputs = pd.DataFrame(
            [[N, P, K, Zn]],
            columns=["N_rate", "P_rate", "K_rate", "Zn_rate"],
        )
        if bundle.scaler_conventional is not None:
            scaled = bundle.scaler_conventional.transform(inputs)
            pred = bundle.model_conventional.predict(scaled)[0]
        else:
            pred = bundle.model_conventional.predict(inputs)[0]
        return (
            float(pred[0]),
            float(pred[1]),
            float(pred[2]),
            float(pred[3]) if len(pred) >= 4 else 0.0,
        )
    except Exception as exc:  # noqa: BLE001
        raise PredictionError(f"Conventional prediction failed: {exc}") from exc


def predict_organic(manure: float, compost: float) -> Impacts:
    """Predict 4 LCA impact categories for an organic FYM+Compost application."""
    bundle = get_bundle()
    if not bundle.has_organic:
        raise OrganicUnavailableError(
            "Organic model is not loaded or failed feature-schema self-test."
        )
    try:
        inputs = pd.DataFrame(
            [[manure, compost]],
            columns=["Manure_rate", "Compost_rate"],
        )
        if bundle.scaler_organic is not None:
            scaled = bundle.scaler_organic.transform(inputs)
            pred = bundle.model_organic.predict(scaled)[0]
        else:
            pred = bundle.model_organic.predict(inputs)[0]
        return (
            float(pred[0]),
            float(pred[1]),
            float(pred[2]),
            float(pred[3]) if len(pred) >= 4 else 0.0,
        )
    except Exception as exc:  # noqa: BLE001
        raise PredictionError(f"Organic prediction failed: {exc}") from exc
