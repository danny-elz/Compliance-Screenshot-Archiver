from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends

from ...auth.deps import require_operator, require_viewer
from ...domain.models import ScheduleCreate, ScheduleOut

router = APIRouter()

# In-memory stub store for demo; replace with DynamoDB.
_SCHEDULES: dict[str, ScheduleOut] = {}

# Pre-instantiated dependencies to avoid B008 lint issues
_viewer_dep = Depends(require_viewer)
_operator_dep = Depends(require_operator)


@router.get("", response_model=list[ScheduleOut])
def list_schedules(_: dict[str, str] = _viewer_dep) -> list[ScheduleOut]:
    """
    List schedules.

    Returns:
        list[ScheduleOut]: All schedules.
    """
    return list(_SCHEDULES.values())


@router.post("", response_model=ScheduleOut, status_code=201)
def create_schedule(payload: ScheduleCreate, _: dict[str, str] = _operator_dep) -> ScheduleOut:
    """
    Create a schedule.

    Args:
        payload (ScheduleCreate): New schedule input.

    Returns:
        ScheduleOut: Created schedule.
    """
    sid = str(uuid.uuid4())
    out = ScheduleOut(id=sid, **payload.model_dump(), enabled=True)
    _SCHEDULES[sid] = out
    return out
