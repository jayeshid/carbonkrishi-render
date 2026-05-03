"""ML model + scaler loading.

Process-singleton loader for the conventional + organic Ridge models and their
scalers. The directory can be overridden via the ``CK_MODEL_DIR`` environment
variable; otherwise the artifacts are read from ``backend/models/``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd

# Models live in backend/models/ (same package as this file's parent).
# Fall back to the project root for backward compatibility with older layouts.
_BACKEND_MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_MODEL_DIR = _BACKEND_MODELS_DIR if _BACKEND_MODELS_DIR.exists() else _PROJECT_ROOT


@dataclass
class ModelBundle:
    """All ML artifacts loaded once at startup."""
    model_conventional: object
    scaler_conventional: object
    model_organic: Optional[object]
    scaler_organic: Optional[object]
    has_organic: bool


_bundle: Optional[ModelBundle] = None


def _model_dir() -> Path:
    return Path(os.environ.get("CK_MODEL_DIR", _DEFAULT_MODEL_DIR))


def load_models() -> ModelBundle:
    """Load all model + scaler artifacts. Idempotent (process-singleton)."""
    global _bundle
    if _bundle is not None:
        return _bundle

    base = _model_dir()

    # Conventional system (required) ------------------------------------
    try:
        model_conventional = joblib.load(base / "model_conventional.pkl")
        scaler_conventional = joblib.load(base / "scaler_conventional.pkl")
    except Exception as exc:  # noqa: BLE001 — match legacy permissive load
        raise RuntimeError(
            f"Conventional model/scaler missing in {base}. "
            "Set CK_MODEL_DIR or place the .pkl files in backend/models/."
        ) from exc

    # Organic system (optional) -----------------------------------------
    model_organic = None
    scaler_organic = None
    has_organic = False

    try:
        model_organic = joblib.load(base / "model_organic.pkl")
        scaler_organic = joblib.load(base / "scaler_organic.pkl")

        # Probe the scaler to detect which feature schema it expects.
        # Mirrors the legacy self-test in app.py:load_models.
        try:
            test = pd.DataFrame([[135, 50, 35, 20]],
                                columns=["N_rate", "P_rate", "K_rate", "Zn_rate"])
            scaler_organic.transform(test)
            has_organic = True
        except (ValueError, KeyError):
            try:
                test = pd.DataFrame([[10000, 1500]],
                                    columns=["Manure_rate", "Compost_rate"])
                scaler_organic.transform(test)
                has_organic = True
            except Exception:
                model_organic = None
                scaler_organic = None
                has_organic = False
    except Exception:
        # Organic stack is genuinely optional; fall through silently.
        pass

    _bundle = ModelBundle(
        model_conventional=model_conventional,
        scaler_conventional=scaler_conventional,
        model_organic=model_organic,
        scaler_organic=scaler_organic,
        has_organic=has_organic,
    )
    return _bundle


def get_bundle() -> ModelBundle:
    """Return the loaded bundle; load on demand if not yet loaded."""
    return load_models()
