from __future__ import annotations

import logging

from fastapi import FastAPI

from .api.router import api_router
from .core.logging import configure_logging, jlog

configure_logging(logging.INFO)
app = FastAPI(title="Compliance Screenshot Archiver", version="0.1.0")
app.include_router(api_router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    """
    Lightweight liveness endpoint.

    Returns:
        dict[str, str]: Health status.
    """
    jlog(logging.getLogger(__name__), "healthcheck", status="ok")
    return {"status": "ok"}
