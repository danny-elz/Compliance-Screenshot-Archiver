from __future__ import annotations

from fastapi import APIRouter

from .routes import captures, schedules

api_router = APIRouter()
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
api_router.include_router(captures.router, prefix="/captures", tags=["captures"])
