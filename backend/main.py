"""FastAPI entry point.

Run from the project root:
    uvicorn backend.main:app --reload --port 8000

Or via the helper script:
    python -m backend.main
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api import blend, credits, emissions, inference, meta, predict
from .core.models import load_models

log = logging.getLogger("carbonkrishi")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

# ── Dev-only browser hot reload (set DEV=1 in env to enable) ─────────────
# Watches the frontend/ folder. When any file changes, pushes a websocket
# message to the browser which reloads the page automatically.
HOT_RELOAD = os.environ.get("DEV") == "1"
hot_reload = None
if HOT_RELOAD:
    try:
        import arel
        _frontend = Path(__file__).resolve().parents[1] / "frontend"
        hot_reload = arel.HotReload(paths=[arel.Path(str(_frontend))])
        log.info("Hot reload enabled — watching %s", _frontend)
    except ImportError:
        log.warning("DEV=1 set but `arel` not installed. Run: pip install arel")
        HOT_RELOAD = False

# Repo layout:
#   CarbonKrishi/
#     ├── backend/
#     ├── frontend/
#     ├── model_*.pkl
#     └── ...

_REPO_ROOT = Path(__file__).resolve().parents[1]
_FRONTEND_DIR = _REPO_ROOT / "frontend"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML artifacts once at startup."""
    log.info("Loading ML models...")
    bundle = load_models()
    log.info("Models ready (organic available=%s)", bundle.has_organic)
    if hot_reload:
        await hot_reload.startup()
    yield
    if hot_reload:
        await hot_reload.shutdown()


app = FastAPI(
    title="CarbonKrishi AI API",
    description="Climate-smart agriculture LCA backend (rice fertiliser).",
    version="0.1.0",
    lifespan=lifespan,
)

# Mount arel's websocket endpoint when hot reload is on. The browser client
# is inlined directly in the HTML files (see the dev-only <script> blocks).
if hot_reload:
    app.add_websocket_route("/hot-reload", hot_reload, name="hot-reload")

# CORS — permissive in dev; tighten for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(predict.router)
app.include_router(blend.router)
app.include_router(emissions.router)
app.include_router(credits.router)
app.include_router(inference.router)
app.include_router(meta.router)


@app.get("/healthz", tags=["meta"])
def healthz() -> dict:
    return {"status": "ok"}


# Static frontend (served only if the directory exists).
if _FRONTEND_DIR.exists():
    # Mount static directories
    js_dir = _FRONTEND_DIR / "js"
    if js_dir.exists():
        app.mount("/js", StaticFiles(directory=str(js_dir)), name="js")

    media_dir = _FRONTEND_DIR / "media"
    if media_dir.exists():
        app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")

    # Landing page at root, dashboard at /dashboard.
    @app.get("/", include_in_schema=False)
    def root():
        return FileResponse(str(_FRONTEND_DIR / "landing.html"))

    @app.get("/dashboard", include_in_schema=False)
    @app.get("/dashboard/", include_in_schema=False)
    def dashboard():
        return FileResponse(str(_FRONTEND_DIR / "index.html"))

    # Marketing / overview page describing what the dashboard offers.
    @app.get("/dashboard-info", include_in_schema=False)
    @app.get("/dashboard-info/", include_in_schema=False)
    def dashboard_info():
        return FileResponse(str(_FRONTEND_DIR / "dashboard.html"))

    @app.get("/methodology", include_in_schema=False)
    @app.get("/methodology/", include_in_schema=False)
    def methodology():
        return FileResponse(str(_FRONTEND_DIR / "methodology.html"))

    @app.get("/about", include_in_schema=False)
    @app.get("/about/", include_in_schema=False)
    def about():
        return FileResponse(str(_FRONTEND_DIR / "about.html"))

    # Always send fresh CSS — a normal Ctrl+R refresh shows the latest.
    _NO_CACHE = {"Cache-Control": "no-store, must-revalidate", "Pragma": "no-cache"}

    @app.get("/styles.css", include_in_schema=False)
    def styles():
        return FileResponse(
            str(_FRONTEND_DIR / "styles.css"),
            media_type="text/css",
            headers=_NO_CACHE,
        )

    @app.get("/landing.css", include_in_schema=False)
    def landing_styles():
        return FileResponse(
            str(_FRONTEND_DIR / "landing.css"),
            media_type="text/css",
            headers=_NO_CACHE,
        )


def _run():  # pragma: no cover
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":  # pragma: no cover
    _run()
