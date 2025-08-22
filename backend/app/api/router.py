from __future__ import annotations

from fastapi import APIRouter

from .routes import captures, health, schedules

api_router: APIRouter = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
api_router.include_router(captures.router, prefix="/captures", tags=["captures"])
