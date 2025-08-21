from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query

from ...auth.deps import require_operator, require_viewer
from ...domain.models import CaptureOut

router = APIRouter()

# In-memory stub store; replace with DynamoDB.
_CAPTURES: dict[str, CaptureOut] = {}

# Pre-instantiated dependencies to avoid B008 lint issues
_viewer_dep = Depends(require_viewer)
_operator_dep = Depends(require_operator)


@router.get("", response_model=list[CaptureOut])
def list_captures(_: dict[str, str] = _viewer_dep) -> list[CaptureOut]:
    """
    List captures.

    Returns:
        list[CaptureOut]: All captures.
    """
    return list(_CAPTURES.values())


@router.post("/trigger", response_model=CaptureOut)
def trigger_capture(
    url: str,
    artifact_type: str = Query(default="pdf", pattern="^(png|pdf)$"),
    _: dict[str, str] = _operator_dep,
) -> CaptureOut:
    """
    Trigger an on-demand capture (stubbed).

    Args:
        url (str): Target URL to capture.
        artifact_type (str): 'png' or 'pdf'.

    Returns:
        CaptureOut: Capture record stub.
    """
    # Reason: Stub; real impl would enqueue job or call capture engine then persist.
    cid = str(uuid.uuid4())
    sha256 = "stubbed_sha256"
    s3_key = f"captures/{cid}.{artifact_type}"
    out = CaptureOut(id=cid, sha256=sha256, s3_key=s3_key, artifact_type=artifact_type)  # type: ignore[arg-type]
    _CAPTURES[cid] = out
    return out
